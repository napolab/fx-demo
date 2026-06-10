// DOM/GPU session glue (no React): boots the engine, mounts the p5 camera
// sketch, forwards every camera frame into the engine, handles resize and
// disposal. The hook only mounts/unmounts it.

import { createGlitchEngine, type GlitchEngine } from '../engine';
import { createCameraSketch, type CameraSketch } from '../sketch';
import type { GlitchParams, GlitchStatus } from '../types';

export type GlitchSession = {
  dispose: () => void;
};

type SessionState = {
  disposed: boolean;
  engine: GlitchEngine | undefined;
  sketch: CameraSketch | undefined;
  cameraReady: boolean;
  resizeTimer: number;
};

const RESIZE_DEBOUNCE_MS = 180;

const watchDeviceLost = async (engine: GlitchEngine, state: SessionState, onStatus: (status: GlitchStatus) => void): Promise<void> => {
  const info = await engine.lost;
  if (!state.disposed && info.reason !== 'destroyed') onStatus('lost');
};

export const createGlitchSession = (canvas: HTMLCanvasElement, getParams: () => GlitchParams, onStatus: (status: GlitchStatus) => void): GlitchSession => {
  const state: SessionState = { disposed: false, engine: undefined, sketch: undefined, cameraReady: false, resizeTimer: 0 };

  const applySize = (): void => {
    state.engine?.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio);
  };

  const handleResize = (): void => {
    window.clearTimeout(state.resizeTimer);
    state.resizeTimer = window.setTimeout(applySize, RESIZE_DEBOUNCE_MS);
  };

  const tick = (video: HTMLVideoElement): void => {
    if (state.disposed || state.engine === undefined) return;
    state.engine.updateCamera(video);
    state.engine.frame({ ...getParams(), cameraReady: state.cameraReady });
  };

  const mountSketch = (): void => {
    state.sketch = createCameraSketch({
      onCameraReady: () => {
        if (state.disposed) return;
        state.cameraReady = true;
        onStatus('running');
      },
      onCameraError: () => {
        if (!state.disposed && !state.cameraReady) onStatus('no-camera');
      },
      onFrame: tick,
    });
  };

  const boot = async (): Promise<void> => {
    const engine = await createGlitchEngine(canvas);
    if (state.disposed) {
      engine?.destroy();

      return;
    }
    if (engine === undefined) {
      onStatus('no-webgpu');

      return;
    }
    state.engine = engine;
    applySize();
    void watchDeviceLost(engine, state, onStatus);
    mountSketch();
  };

  void boot();
  window.addEventListener('resize', handleResize);

  return {
    dispose: () => {
      state.disposed = true;
      window.removeEventListener('resize', handleResize);
      window.clearTimeout(state.resizeTimer);
      state.sketch?.dispose();
      state.engine?.destroy();
    },
  };
};
