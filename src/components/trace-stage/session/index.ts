// DOM/GPU/ML session glue (no React): owns the RAF loop, the video source
// (webcam or user-provided file), MediaPipe segmentation, detection pipeline,
// history ring and disposal. The hook only mounts/unmounts it. Mirrors
// fluid-stage/session deliberately.

import { createCanvasRecorder } from '../../canvas-recorder';
import { createCompositor } from '../compositor';
import { expandHands, HAND_FINGER_SCALE_X, HAND_FINGER_SCALE_Y } from '../detection/expand-hands';
import { traceContours } from '../detection/marching-squares';
import { buildPartBoxes } from '../detection/part-boxes';
import { createPoseDetector, type PoseDetector } from '../detection/pose';
import { createSegmenter, type Segmenter } from '../detection/segmenter';
import { simplify } from '../detection/simplify';
import { createTraceEngine, type TraceEngine } from '../engine';
import { coverScale } from '../math';
import { createOverlay, type OverlayHandle } from '../overlay/sketch';
import { buildWires } from '../overlay/wires';
import type { Contour, CoverScale, OverlayFrame, PartBox, TraceStatus, Wire } from '../types';

export type TraceSession = {
  // Re-attempts webcam acquisition after a permission denial. No-op while
  // disposed or once a source is already playing.
  retryCamera: () => Promise<void>;
  // Switches the source to a user-provided video file (webm/mp4), replacing
  // the webcam stream if one is active.
  loadVideoFile: (file: File) => Promise<void>;
  // Retunes the live contour iso-level (silhouette segmentation threshold).
  setMaskThreshold: (value: number) => void;
  // Toggles the sumi-ink face censor drawn over the detected face box.
  setMaskFace: (value: boolean) => void;
  // Records the composited stage (video + overlay) to a downloaded WebM. For a
  // user-provided video file the take is bounded to a single pass — rewound to
  // the first frame on start, auto-stopped at the last. The webcam, having no
  // end frame, records until stopRecording.
  startRecording: () => void;
  stopRecording: () => void;
  isRecording: () => boolean;
  // Milliseconds since the current recording started; 0 when idle.
  getRecordingMs: () => number;
  dispose: () => void;
};

const SEG_WIDTH = 320;
const SEG_HEIGHT = 180;
const MASK_THRESHOLD = 0.5;
// Semantic part boxes (face / hands / arms / torso / legs) from pose landmarks.
const PART_BOX_OPTIONS = { minVisibility: 0.55, paddingX: 0.018, paddingY: 0.024 };
const SIMPLIFY_EPSILON = 0.006;
// Wires connect part boxes to each other only (≤8 anchors per pose), so the
// reach is wide enough to span face↔hand↔leg distances.
const WIRE_OPTIONS = { maxDistance: 0.5, maxWires: 32 };
const HISTORY_EVERY_N_FRAMES = 3;
const HISTORY_MAX = 10;
const RESIZE_DEBOUNCE_MS = 180;
const MAX_DT_SECONDS = 1 / 20;
const RECORDING_FPS = 30;
const RECORDING_FILENAME = 'trace-recording.webm';

type SessionState = {
  disposed: boolean;
  engine: TraceEngine | undefined;
  segmenter: Segmenter | undefined;
  pose: PoseDetector | undefined;
  overlay: OverlayHandle | undefined;
  video: HTMLVideoElement | undefined;
  stream: MediaStream | undefined;
  rafId: number;
  lastTimestampMs: number;
  timeSeconds: number;
  frameCount: number;
  resizeTimer: number;
  canvasWidth: number;
  canvasHeight: number;
  cover: CoverScale;
  contours: readonly Contour[];
  history: readonly (readonly Contour[])[];
  parts: readonly PartBox[];
  wires: readonly Wire[];
  objectURL: string | undefined;
  maskThreshold: number;
  maskFace: boolean;
};

type CameraHandles = { video: HTMLVideoElement; stream: MediaStream };

// Same acquisition shape as fluid-stage/session — kept local on purpose; the
// two stages have independent lifecycles and the helper is ~20 lines.
const acquireCamera = async (): Promise<CameraHandles | undefined> => {
  if (navigator.mediaDevices === undefined) return undefined;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    });
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    return { video, stream };
  } catch {
    return undefined;
  }
};

const stopStream = (stream: MediaStream | undefined): void => {
  if (stream === undefined) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
};

const toggleFullscreen = async (element: Element): Promise<void> => {
  try {
    if (document.fullscreenElement === null) {
      await element.requestFullscreen();
      return;
    }
    await document.exitFullscreen();
  } catch {
    // Fullscreen can be rejected; the show goes on.
  }
};

const watchDeviceLost = async (engine: TraceEngine, state: SessionState, onStatus: (status: TraceStatus) => void): Promise<void> => {
  const info = await engine.lost;
  if (!state.disposed && info.reason !== 'destroyed') onStatus('lost');
};

// Wires run between part-box centers only — no contour anchors.
const wireAnchors = (parts: readonly PartBox[]): readonly { x: number; y: number }[] => parts.map((part) => ({ x: part.cx, y: part.cy }));

export const createTraceSession = (canvas: HTMLCanvasElement, overlayContainer: HTMLElement, onStatus: (status: TraceStatus) => void): TraceSession => {
  const state: SessionState = {
    disposed: false,
    engine: undefined,
    segmenter: undefined,
    pose: undefined,
    overlay: undefined,
    video: undefined,
    stream: undefined,
    rafId: 0,
    lastTimestampMs: 0,
    timeSeconds: 0,
    frameCount: 0,
    resizeTimer: 0,
    canvasWidth: 1,
    canvasHeight: 1,
    cover: { x: 1, y: 1 },
    contours: [],
    history: [],
    parts: [],
    wires: [],
    objectURL: undefined,
    maskThreshold: MASK_THRESHOLD,
    maskFace: false,
  };

  const segCanvas = document.createElement('canvas');
  segCanvas.width = SEG_WIDTH;
  segCanvas.height = SEG_HEIGHT;
  const segContext = segCanvas.getContext('2d');

  // Recording: an offscreen compositor stacks the WebGPU + overlay canvases,
  // and the recorder captures that composite. Both stay idle until start().
  const compositor = createCompositor();
  const recorder = createCanvasRecorder(compositor.canvas, RECORDING_FPS, RECORDING_FILENAME);

  const overlayFrame = (): OverlayFrame => ({
    contours: state.contours,
    history: state.history,
    parts: state.parts,
    wires: state.wires,
    coverScale: state.cover,
    maskFace: state.maskFace,
  });

  // Source kind drives recording bounds: a file (objectURL set) records exactly
  // one pass; the webcam (no objectURL) records until the caller stops it.
  const isFileSource = (): boolean => state.objectURL !== undefined;

  // One composite to size the (otherwise 300×150 default) recording canvas to
  // the live backing store before captureStream/bitrate are read at start.
  const primeCompositor = (): void => compositor.composite(canvas, state.overlay?.element());

  // Resolves once the playhead has settled on the first frame, so the first
  // recorded frame is the true start frame and not the pre-rewind position.
  const seekToStart = (): Promise<void> => {
    const video = state.video;
    if (video === undefined || video.currentTime === 0) return Promise.resolve();
    const settled = new Promise<void>((resolve) => {
      const onSeeked = (): void => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
    });
    video.currentTime = 0;
    return settled;
  };

  // Captures the composite from the file's first frame to its last. Looping is
  // suspended for the take; the 'ended' listener (attached at load) stops the
  // recorder and restores the looping preview.
  const startFileRecording = async (): Promise<void> => {
    const video = state.video;
    if (video === undefined) return;
    video.loop = false;
    await seekToStart();
    if (state.disposed) return;
    primeCompositor();
    recorder.start();
    try {
      await video.play();
    } catch {
      // Playback can be interrupted (e.g. the tab is hidden); the recorder
      // still captures whatever the compositor draws.
    }
  };

  const detect = (timestampMs: number): void => {
    if (state.segmenter === undefined || state.video === undefined || segContext === null) return;
    segContext.drawImage(state.video, 0, 0, SEG_WIDTH, SEG_HEIGHT);
    const mask = state.segmenter.segmentFrame(segCanvas, timestampMs);
    if (mask === undefined || mask.length !== SEG_WIDTH * SEG_HEIGHT) return;

    const raw = traceContours(mask, SEG_WIDTH, SEG_HEIGHT, state.maskThreshold);
    state.contours = raw.map((contour) => simplify(contour, SIMPLIFY_EPSILON));
    const poses = state.pose?.detectFrame(segCanvas, timestampMs) ?? [];
    // Pose hand boxes stop at the knuckles; grow them so the fingers are
    // covered — matching the bounding-mask stage's hand reach exactly.
    const boxes = poses.flatMap((pose) => buildPartBoxes(pose, PART_BOX_OPTIONS));
    state.parts = expandHands(boxes, HAND_FINGER_SCALE_X, HAND_FINGER_SCALE_Y);
    state.wires = buildWires(wireAnchors(state.parts), WIRE_OPTIONS);

    if (state.frameCount % HISTORY_EVERY_N_FRAMES === 0 && state.contours.length > 0) {
      state.history = [...state.history, state.contours].slice(-HISTORY_MAX);
    }
  };

  const tick = (timestampMs: number): void => {
    if (state.disposed || state.engine === undefined) return;
    const elapsedMs = state.lastTimestampMs === 0 ? 1000 / 60 : timestampMs - state.lastTimestampMs;
    const dtSeconds = Math.min(elapsedMs / 1000, MAX_DT_SECONDS);
    state.lastTimestampMs = timestampMs;
    state.timeSeconds = state.timeSeconds + dtSeconds;
    state.frameCount = state.frameCount + 1;

    if (state.video !== undefined) {
      state.engine.updateVideo(state.video);
      detect(timestampMs);
    }
    state.engine.frame({
      dtSeconds,
      timeSeconds: state.timeSeconds,
      sourceReady: state.video !== undefined ? 1 : 0,
      coverScale: state.cover,
    });
    // Composite the two layers into the recording canvas only while recording,
    // right after the GPU frame so the WebGPU canvas is drawImage-readable.
    if (recorder.isActive()) compositor.composite(canvas, state.overlay?.element());
    state.rafId = requestAnimationFrame(tick);
  };

  const syncSize = (): void => {
    const rect = canvas.getBoundingClientRect();
    state.canvasWidth = Math.max(rect.width, 1);
    state.canvasHeight = Math.max(rect.height, 1);
    const contentAspect = state.video !== undefined && state.video.videoHeight > 0 ? state.video.videoWidth / state.video.videoHeight : 16 / 9;
    state.cover = coverScale(contentAspect, state.canvasWidth / state.canvasHeight);
    state.engine?.resize(state.canvasWidth, state.canvasHeight, window.devicePixelRatio);
    state.overlay?.resize(state.canvasWidth, state.canvasHeight);
  };

  const attachListeners = (): readonly (() => void)[] => {
    const onKeyDown = async (event: KeyboardEvent): Promise<void> => {
      if (event.key === 'f' || event.key === 'F') {
        await toggleFullscreen(canvas.parentElement ?? canvas);
      }
    };
    const onVisibility = (): void => {
      if (document.hidden === true) {
        cancelAnimationFrame(state.rafId);
        state.lastTimestampMs = 0;
        return;
      }
      if (!state.disposed && state.engine !== undefined) state.rafId = requestAnimationFrame(tick);
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibility);
    const observer = new ResizeObserver(() => {
      window.clearTimeout(state.resizeTimer);
      state.resizeTimer = window.setTimeout(syncSize, RESIZE_DEBOUNCE_MS);
    });
    observer.observe(canvas);
    return [() => window.removeEventListener('keydown', onKeyDown), () => document.removeEventListener('visibilitychange', onVisibility), () => observer.disconnect()];
  };

  // Camera + segmenter acquisition, shared by boot and user-triggered retry.
  const connectCamera = async (): Promise<void> => {
    const camera = await acquireCamera();
    if (state.disposed) {
      stopStream(camera?.stream);
      return;
    }
    if (camera === undefined) {
      onStatus('no-camera');
      return;
    }
    state.video = camera.video;
    state.stream = camera.stream;
    syncSize();

    state.segmenter = state.segmenter ?? (await createSegmenter());
    state.pose = state.pose ?? (await createPoseDetector());
    if (state.disposed) return;
    onStatus(state.segmenter === undefined ? 'model-error' : 'running');
  };

  const boot = async (): Promise<readonly (() => void)[]> => {
    const engine = await createTraceEngine(canvas);
    if (state.disposed) {
      engine?.destroy();
      return [];
    }
    if (engine === undefined) {
      onStatus('no-webgpu');
      return [];
    }
    state.engine = engine;
    void watchDeviceLost(engine, state, onStatus);
    syncSize();

    const cleanups = attachListeners();
    state.rafId = requestAnimationFrame(tick);

    state.overlay = await createOverlay(overlayContainer, overlayFrame);
    if (state.disposed) return cleanups;
    state.overlay.resize(state.canvasWidth, state.canvasHeight);

    await connectCamera();
    return cleanups;
  };

  // Swap the active source to a local video file. The webcam stream (if any)
  // is stopped; the file loops like VJ footage for preview, but a recording
  // take plays it through exactly once (see startRecording).
  const loadVideoFile = async (file: File): Promise<void> => {
    if (state.disposed || state.engine === undefined) return;
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    // End of a bounded take: stop the recorder, then resume the looping preview
    // from the top. Idle (loop=true) playback never reaches 'ended'.
    video.addEventListener('ended', () => {
      if (!recorder.isActive()) return;
      recorder.stop();
      video.loop = true;
      video.currentTime = 0;
      void video.play();
    });
    video.src = url;
    try {
      await video.play();
    } catch {
      URL.revokeObjectURL(url);
      return;
    }
    if (state.disposed) {
      URL.revokeObjectURL(url);
      return;
    }
    stopStream(state.stream);
    state.stream = undefined;
    if (state.objectURL !== undefined) URL.revokeObjectURL(state.objectURL);
    state.objectURL = url;
    state.video = video;
    syncSize();

    state.segmenter = state.segmenter ?? (await createSegmenter());
    state.pose = state.pose ?? (await createPoseDetector());
    if (state.disposed) return;
    onStatus(state.segmenter === undefined ? 'model-error' : 'running');
  };

  const cleanupsPromise = boot();

  return {
    async retryCamera() {
      if (state.disposed || state.video !== undefined || state.engine === undefined) return;
      onStatus('booting');
      await connectCamera();
    },
    loadVideoFile,
    // Retunes the live contour iso-level; next detect() reads the new value.
    setMaskThreshold(value) {
      if (state.disposed) return;
      state.maskThreshold = value;
    },
    // Toggles the face censor; next overlay frame reads the new value.
    setMaskFace(value) {
      if (state.disposed) return;
      state.maskFace = value;
    },
    startRecording() {
      if (state.disposed) return;
      // Webcam or no source yet: unbounded manual recording.
      if (state.video === undefined || !isFileSource()) {
        primeCompositor();
        recorder.start();
        return;
      }
      // File source: rewind to the first frame and record one pass.
      void startFileRecording();
    },
    stopRecording() {
      recorder.stop();
      // A manual early stop on a file take: restore the looping preview that
      // startFileRecording suspended.
      if (state.video !== undefined && isFileSource()) state.video.loop = true;
    },
    isRecording() {
      return recorder.isActive();
    },
    getRecordingMs() {
      return recorder.elapsedMs();
    },
    dispose() {
      state.disposed = true;
      cancelAnimationFrame(state.rafId);
      window.clearTimeout(state.resizeTimer);
      void disposeAsync(cleanupsPromise, state);
    },
  };
};

const disposeAsync = async (cleanupsPromise: Promise<readonly (() => void)[]>, state: SessionState): Promise<void> => {
  const cleanups = await cleanupsPromise;
  for (const cleanup of cleanups) {
    cleanup();
  }
  stopStream(state.stream);
  if (state.objectURL !== undefined) URL.revokeObjectURL(state.objectURL);
  state.segmenter?.close();
  state.pose?.close();
  state.overlay?.remove();
  state.engine?.destroy();
};
