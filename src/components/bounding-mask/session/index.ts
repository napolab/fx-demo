// DOM/ML session glue (no React): owns the RAF loop, the video source (webcam
// or user file), MediaPipe pose + segmentation, and the 2D-canvas compositor.
// Mirrors trace-stage/session deliberately, minus WebGPU — the masking renderer
// is a plain 2D context. The hook only mounts/unmounts it; live param tweaks
// arrive through getParams() so the camera is never torn down.

import { expandHands, HAND_FINGER_SCALE_X, HAND_FINGER_SCALE_Y } from '../../trace-stage/detection/expand-hands';
import { buildPartBoxes } from '../../trace-stage/detection/part-boxes';
import { createPoseDetector, type PoseDetector } from '../../trace-stage/detection/pose';
import { createSegmenter, type Segmenter } from '../../trace-stage/detection/segmenter';
import { coverScale } from '../../trace-stage/math';
import type { CoverScale, PartBox } from '../../trace-stage/types';
import { createCanvasRecorder } from '../../canvas-recorder';
import { drawFrame } from '../render';
import type { MaskParams, Status } from '../types';

// Playback state of a loaded video file (absent for the live webcam).
export type Playback = { currentTime: number; duration: number; paused: boolean };

export type BoundingMaskSession = {
  retryCamera: () => Promise<void>;
  loadVideoFile: (file: File) => Promise<void>;
  // Playback (file source only) — undefined while the source is the webcam.
  getPlayback: () => Playback | undefined;
  seek: (time: number) => void;
  togglePlay: () => Promise<void>;
  startRecording: () => void;
  stopRecording: () => void;
  isRecording: () => boolean;
  getRecordingMs: () => number;
  dispose: () => void;
};

// Detection runs on a downscaled frame; both the person mask and the part
// boxes live in this content-UV space.
const SEG_WIDTH = 320;
const SEG_HEIGHT = 180;
const PART_BOX_OPTIONS = { minVisibility: 0.55, paddingX: 0.018, paddingY: 0.024 };

type SessionState = {
  disposed: boolean;
  segmenter: Segmenter | undefined;
  pose: PoseDetector | undefined;
  video: HTMLVideoElement | undefined;
  stream: MediaStream | undefined;
  rafId: number;
  resizeTimer: number;
  canvasWidth: number;
  canvasHeight: number;
  cover: CoverScale;
  partBoxes: readonly PartBox[];
  personMask: Float32Array | undefined;
  objectURL: string | undefined;
  sourceKind: SourceKind;
};

type CameraHandles = { video: HTMLVideoElement; stream: MediaStream };

const RESIZE_DEBOUNCE_MS = 180;
const RECORDING_FPS = 30;
const RECORDING_FILENAME = 'bounding-mask-recording.webm';

type SourceKind = 'none' | 'webcam' | 'file';

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

export const createBoundingMaskSession = (canvas: HTMLCanvasElement, onStatus: (status: Status) => void, getParams: () => MaskParams): BoundingMaskSession => {
  const state: SessionState = {
    disposed: false,
    segmenter: undefined,
    pose: undefined,
    video: undefined,
    stream: undefined,
    rafId: 0,
    resizeTimer: 0,
    canvasWidth: 1,
    canvasHeight: 1,
    cover: { x: 1, y: 1 },
    partBoxes: [],
    personMask: undefined,
    objectURL: undefined,
    sourceKind: 'none',
  };

  const recorder = createCanvasRecorder(canvas, RECORDING_FPS, RECORDING_FILENAME);
  const ctx = canvas.getContext('2d');
  const segCanvas = document.createElement('canvas');
  segCanvas.width = SEG_WIDTH;
  segCanvas.height = SEG_HEIGHT;
  const segContext = segCanvas.getContext('2d');
  const silhouetteCanvas = document.createElement('canvas');
  silhouetteCanvas.width = SEG_WIDTH;
  silhouetteCanvas.height = SEG_HEIGHT;

  const detect = (timestampMs: number): void => {
    if (state.video === undefined || segContext === null) return;
    segContext.drawImage(state.video, 0, 0, SEG_WIDTH, SEG_HEIGHT);
    const poses = state.pose?.detectFrame(segCanvas, timestampMs) ?? [];
    const boxes = poses.flatMap((pose) => buildPartBoxes(pose, PART_BOX_OPTIONS));
    state.partBoxes = expandHands(boxes, HAND_FINGER_SCALE_X, HAND_FINGER_SCALE_Y);
    // The mask is only needed for the silhouette shape — skip the GPU work
    // entirely while the box shape is active.
    if (getParams().shape === 'silhouette' && state.segmenter !== undefined) {
      state.personMask = state.segmenter.segmentFrame(segCanvas, timestampMs);
    }
  };

  const render = (): void => {
    if (ctx === null || state.video === undefined) return;
    drawFrame({
      ctx,
      source: state.video,
      width: state.canvasWidth,
      height: state.canvasHeight,
      cover: state.cover,
      params: getParams(),
      partBoxes: state.partBoxes,
      personMask: state.personMask,
      maskW: SEG_WIDTH,
      maskH: SEG_HEIGHT,
      silhouetteCanvas,
    });
  };

  const tick = (timestampMs: number): void => {
    if (state.disposed) return;
    if (state.video !== undefined) {
      detect(timestampMs);
      render();
    }
    state.rafId = requestAnimationFrame(tick);
  };

  const syncSize = (): void => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    state.canvasWidth = Math.max(Math.round(rect.width * dpr), 1);
    state.canvasHeight = Math.max(Math.round(rect.height * dpr), 1);
    // The canvas backing store is sized here (imperative DOM); alias to avoid
    // no-param-reassign on the surface dimensions.
    const surface = canvas;
    surface.width = state.canvasWidth;
    surface.height = state.canvasHeight;
    const contentAspect = state.video !== undefined && state.video.videoHeight > 0 ? state.video.videoWidth / state.video.videoHeight : 16 / 9;
    state.cover = coverScale(contentAspect, state.canvasWidth / state.canvasHeight);
  };

  const attachListeners = (): readonly (() => void)[] => {
    const onVisibility = (): void => {
      if (document.hidden === true) {
        cancelAnimationFrame(state.rafId);
        return;
      }
      if (!state.disposed) state.rafId = requestAnimationFrame(tick);
    };
    document.addEventListener('visibilitychange', onVisibility);
    const observer = new ResizeObserver(() => {
      window.clearTimeout(state.resizeTimer);
      state.resizeTimer = window.setTimeout(syncSize, RESIZE_DEBOUNCE_MS);
    });
    observer.observe(canvas);
    return [() => document.removeEventListener('visibilitychange', onVisibility), () => observer.disconnect()];
  };

  const ensureDetectors = async (): Promise<void> => {
    state.segmenter = state.segmenter ?? (await createSegmenter());
    state.pose = state.pose ?? (await createPoseDetector());
  };

  // Camera + detector acquisition, shared by boot and user-triggered retry.
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
    state.sourceKind = 'webcam';
    syncSize();
    await ensureDetectors();
    if (state.disposed) return;
    onStatus('running');
  };

  const boot = async (): Promise<readonly (() => void)[]> => {
    syncSize();
    const cleanups = attachListeners();
    state.rafId = requestAnimationFrame(tick);
    await connectCamera();
    return cleanups;
  };

  // Swap the active source to a local video file; the webcam stream (if any) is
  // stopped and the file loops like VJ footage.
  const loadVideoFile = async (file: File): Promise<void> => {
    if (state.disposed) return;
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
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
    state.sourceKind = 'file';
    syncSize();
    await ensureDetectors();
    if (state.disposed) return;
    onStatus('running');
  };

  const cleanupsPromise = boot();

  return {
    async retryCamera() {
      if (state.disposed || state.sourceKind === 'webcam') return;
      onStatus('booting');
      // Tear down an active file source before reconnecting the camera.
      if (state.video !== undefined) {
        state.video.pause();
        state.video = undefined;
      }
      if (state.objectURL !== undefined) {
        URL.revokeObjectURL(state.objectURL);
        state.objectURL = undefined;
      }
      state.sourceKind = 'none';
      await connectCamera();
    },
    loadVideoFile,
    getPlayback() {
      if (state.sourceKind !== 'file' || state.video === undefined) return undefined;
      const duration = Number.isFinite(state.video.duration) ? state.video.duration : 0;
      return { currentTime: state.video.currentTime, duration, paused: state.video.paused };
    },
    seek(time: number) {
      if (state.sourceKind !== 'file' || state.video === undefined) return;
      state.video.currentTime = time;
    },
    async togglePlay() {
      if (state.sourceKind !== 'file' || state.video === undefined) return;
      if (state.video.paused) {
        await state.video.play();
        return;
      }
      state.video.pause();
    },
    startRecording() {
      recorder.start();
    },
    stopRecording() {
      recorder.stop();
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
};
