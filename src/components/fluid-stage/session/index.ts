// DOM/GPU session glue (no React): owns the RAF loop, pointer & keyboard listeners,
// webcam acquisition, resize handling and disposal. The hook only mounts/unmounts it.

import { createFluidEngine, type FluidEngine } from '../engine';
import { drainSplats, idleSplats, releasePointer, trackPointerDown, trackPointerMove, type PointerTracks } from '../interaction';
import { clampDt, wrap01 } from '../math';
import type { FluidStatus, GradeMode } from '../types';

export type FluidSession = {
  dispose: () => void;
};

type SessionState = {
  disposed: boolean;
  engine: FluidEngine | undefined;
  video: HTMLVideoElement | undefined;
  stream: MediaStream | undefined;
  tracks: PointerTracks;
  gradeMode: GradeMode;
  cameraReady: boolean;
  rafId: number;
  lastTimestampMs: number;
  timeSeconds: number;
  lastActivitySeconds: number;
  lastPointerMoveMs: number;
  resizeTimer: number;
  canvasWidth: number;
  canvasHeight: number;
};

const HUE_CYCLE_PER_SECOND = 0.006;
const CURSOR_HIDE_AFTER_MS = 2000;
const RESIZE_DEBOUNCE_MS = 180;

type CameraHandles = {
  video: HTMLVideoElement;
  stream: MediaStream;
};

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

const watchDeviceLost = async (engine: FluidEngine, state: SessionState, onStatus: (status: FluidStatus) => void): Promise<void> => {
  const info = await engine.lost;
  if (!state.disposed && info.reason !== 'destroyed') onStatus('lost');
};

const setCursorState = (canvas: HTMLCanvasElement, nowMs: number, state: SessionState): void => {
  const element = canvas;
  const next = nowMs - state.lastPointerMoveMs > CURSOR_HIDE_AFTER_MS ? 'hidden' : 'visible';
  if (element.dataset.cursor !== next) element.dataset.cursor = next;
};

const toggleFullscreen = async (element: Element): Promise<void> => {
  try {
    if (document.fullscreenElement === null) {
      await element.requestFullscreen();
      return;
    }
    await document.exitFullscreen();
  } catch {
    // Fullscreen can be rejected (permissions / not allowed); the show goes on.
  }
};

export const createFluidSession = (canvas: HTMLCanvasElement, onStatus: (status: FluidStatus) => void): FluidSession => {
  const state: SessionState = {
    disposed: false,
    engine: undefined,
    video: undefined,
    stream: undefined,
    tracks: {},
    gradeMode: 0,
    cameraReady: false,
    rafId: 0,
    lastTimestampMs: 0,
    timeSeconds: 0,
    lastActivitySeconds: 0,
    lastPointerMoveMs: 0,
    resizeTimer: 0,
    canvasWidth: 1,
    canvasHeight: 1,
  };

  const canvasSize = (): { width: number; height: number } => ({
    width: state.canvasWidth,
    height: state.canvasHeight,
  });

  const markActivity = (timestampMs: number): void => {
    state.lastActivitySeconds = state.timeSeconds;
    state.lastPointerMoveMs = timestampMs;
  };

  const tick = (timestampMs: number): void => {
    if (state.disposed || state.engine === undefined) return;
    const elapsed = state.lastTimestampMs === 0 ? 1000 / 60 : timestampMs - state.lastTimestampMs;
    const dtSeconds = clampDt(elapsed);
    state.lastTimestampMs = timestampMs;
    state.timeSeconds = state.timeSeconds + dtSeconds;

    const hueShift = wrap01(state.timeSeconds * HUE_CYCLE_PER_SECOND);
    const drained = drainSplats(state.tracks, {
      dtSeconds,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      hueBase: hueShift,
    });
    state.tracks = drained.tracks;
    const idle = idleSplats(state.timeSeconds, state.timeSeconds - state.lastActivitySeconds, hueShift);

    if (state.video !== undefined) state.engine.updateCamera(state.video);
    setCursorState(canvas, timestampMs, state);
    state.engine.frame({
      dtSeconds,
      timeSeconds: state.timeSeconds,
      hueShift,
      gradeMode: state.gradeMode,
      cameraReady: state.cameraReady ? 1 : 0,
      splats: [...drained.splats, ...idle],
    });
    state.rafId = requestAnimationFrame(tick);
  };

  const syncCanvasSize = (): void => {
    const rect = canvas.getBoundingClientRect();
    state.canvasWidth = Math.max(rect.width, 1);
    state.canvasHeight = Math.max(rect.height, 1);
    state.engine?.resize(state.canvasWidth, state.canvasHeight, window.devicePixelRatio);
  };

  const attachListeners = (): readonly (() => void)[] => {
    const onPointerDown = (event: PointerEvent): void => {
      canvas.setPointerCapture(event.pointerId);
      state.tracks = trackPointerDown(state.tracks, event, canvasSize());
      markActivity(event.timeStamp);
    };
    const onPointerMove = (event: PointerEvent): void => {
      state.tracks = trackPointerMove(state.tracks, event, canvasSize());
      markActivity(event.timeStamp);
    };
    const onPointerEnd = (event: PointerEvent): void => {
      state.tracks = releasePointer(state.tracks, event.pointerId);
      markActivity(event.timeStamp);
    };
    const onKeyDown = async (event: KeyboardEvent): Promise<void> => {
      if (event.code === 'Space') {
        event.preventDefault();
        state.gradeMode = ((state.gradeMode + 1) % 3) as GradeMode;
        return;
      }
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

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerEnd);
    canvas.addEventListener('pointercancel', onPointerEnd);
    canvas.addEventListener('pointerleave', onPointerEnd);
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibility);

    const observer = new ResizeObserver(() => {
      window.clearTimeout(state.resizeTimer);
      state.resizeTimer = window.setTimeout(syncCanvasSize, RESIZE_DEBOUNCE_MS);
    });
    observer.observe(canvas);

    return [
      () => canvas.removeEventListener('pointerdown', onPointerDown),
      () => canvas.removeEventListener('pointermove', onPointerMove),
      () => canvas.removeEventListener('pointerup', onPointerEnd),
      () => canvas.removeEventListener('pointercancel', onPointerEnd),
      () => canvas.removeEventListener('pointerleave', onPointerEnd),
      () => window.removeEventListener('keydown', onKeyDown),
      () => document.removeEventListener('visibilitychange', onVisibility),
      () => observer.disconnect(),
    ];
  };

  const boot = async (): Promise<readonly (() => void)[]> => {
    const engine = await createFluidEngine(canvas);
    if (state.disposed) {
      engine?.destroy();
      return [];
    }
    if (engine === undefined) {
      onStatus('no-webgpu');
      return [];
    }
    state.engine = engine;
    syncCanvasSize();
    void watchDeviceLost(engine, state, onStatus);

    // Start the show immediately: the procedural flow plays while the camera
    // permission prompt is still open, then the webcam takes over seamlessly.
    const cleanups = attachListeners();
    state.rafId = requestAnimationFrame(tick);

    const camera = await acquireCamera();
    if (state.disposed) {
      stopStream(camera?.stream);
      return cleanups;
    }
    state.video = camera?.video;
    state.stream = camera?.stream;
    state.cameraReady = camera !== undefined;
    onStatus(camera !== undefined ? 'running' : 'procedural');

    return cleanups;
  };

  const cleanupsPromise = boot();

  return {
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
  state.engine?.destroy();
};
