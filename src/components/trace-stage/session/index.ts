// DOM/GPU/ML session glue (no React): owns the RAF loop, the video source
// (webcam or user-provided file), MediaPipe segmentation, detection pipeline,
// history ring and disposal. The hook only mounts/unmounts it. Mirrors
// fluid-stage/session deliberately.

import { findBlobs, trackBlobs } from '../detection/blob-tracker';
import { traceContours } from '../detection/marching-squares';
import { createSegmenter, type Segmenter } from '../detection/segmenter';
import { simplify } from '../detection/simplify';
import { createTraceEngine, type TraceEngine } from '../engine';
import { coverScale } from '../math';
import { createOverlay, type OverlayHandle } from '../overlay/sketch';
import { buildWires } from '../overlay/wires';
import type { Contour, CoverScale, OverlayFrame, TraceStatus, TrackedBlob, Wire } from '../types';

export type TraceSession = {
  // Re-attempts webcam acquisition after a permission denial. No-op while
  // disposed or once a source is already playing.
  retryCamera: () => Promise<void>;
  // Switches the source to a user-provided video file (webm/mp4), replacing
  // the webcam stream if one is active.
  loadVideoFile: (file: File) => Promise<void>;
  dispose: () => void;
};

const SEG_WIDTH = 320;
const SEG_HEIGHT = 180;
const MASK_THRESHOLD = 0.5;
// One bbox per connected segment (person / detached region), not per tile.
const MIN_BLOB_CELLS = 60;
const SIMPLIFY_EPSILON = 0.006;
const CONTOUR_SAMPLE_STRIDE = 6;
const WIRE_OPTIONS = { maxDistance: 0.22, maxWires: 64 };
const HISTORY_EVERY_N_FRAMES = 3;
const HISTORY_MAX = 10;
const RESIZE_DEBOUNCE_MS = 180;
const MAX_DT_SECONDS = 1 / 20;

type SessionState = {
  disposed: boolean;
  engine: TraceEngine | undefined;
  segmenter: Segmenter | undefined;
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
  blobs: readonly TrackedBlob[];
  wires: readonly Wire[];
  nextBlobId: number;
  objectURL: string | undefined;
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

// Sample contour vertices (every Nth) plus blob centroids as wire anchors.
const wireAnchors = (contours: readonly Contour[], blobs: readonly TrackedBlob[]): readonly { x: number; y: number }[] => [
  ...blobs.map((blob) => ({ x: blob.cx, y: blob.cy })),
  ...contours.flatMap((contour) => contour.filter((_, index) => index % CONTOUR_SAMPLE_STRIDE === 0)),
];

export const createTraceSession = (canvas: HTMLCanvasElement, overlayContainer: HTMLElement, onStatus: (status: TraceStatus) => void): TraceSession => {
  const state: SessionState = {
    disposed: false,
    engine: undefined,
    segmenter: undefined,
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
    blobs: [],
    wires: [],
    nextBlobId: 0,
    objectURL: undefined,
  };

  const segCanvas = document.createElement('canvas');
  segCanvas.width = SEG_WIDTH;
  segCanvas.height = SEG_HEIGHT;
  const segContext = segCanvas.getContext('2d');

  const overlayFrame = (): OverlayFrame => ({
    contours: state.contours,
    history: state.history,
    blobs: state.blobs,
    wires: state.wires,
    coverScale: state.cover,
  });

  const detect = (timestampMs: number): void => {
    if (state.segmenter === undefined || state.video === undefined || segContext === null) return;
    segContext.drawImage(state.video, 0, 0, SEG_WIDTH, SEG_HEIGHT);
    const mask = state.segmenter.segmentFrame(segCanvas, timestampMs);
    if (mask === undefined || mask.length !== SEG_WIDTH * SEG_HEIGHT) return;

    const raw = traceContours(mask, SEG_WIDTH, SEG_HEIGHT, MASK_THRESHOLD);
    state.contours = raw.map((contour) => simplify(contour, SIMPLIFY_EPSILON));
    const tracked = trackBlobs(state.blobs, findBlobs(mask, SEG_WIDTH, SEG_HEIGHT, MASK_THRESHOLD, MIN_BLOB_CELLS), state.nextBlobId);
    state.blobs = tracked.blobs;
    state.nextBlobId = tracked.nextId;
    state.wires = buildWires(wireAnchors(state.contours, state.blobs), WIRE_OPTIONS);

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
  // is stopped; the file loops like VJ footage.
  const loadVideoFile = async (file: File): Promise<void> => {
    if (state.disposed || state.engine === undefined) return;
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
    syncSize();

    state.segmenter = state.segmenter ?? (await createSegmenter());
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
  state.overlay?.remove();
  state.engine?.destroy();
};
