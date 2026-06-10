// p5.js layer: owns getUserMedia (via createCapture) and the frame loop.
// No p5 canvas — the WebGPU engine owns the visible canvas; p5's draw() is
// used purely as the per-frame heartbeat that feeds video frames to the engine.

import p5 from 'p5';

export type CameraSketch = {
  dispose: () => void;
};

export type SketchCallbacks = {
  onCameraReady: (video: HTMLVideoElement) => void;
  onCameraError: () => void;
  onFrame: (video: HTMLVideoElement) => void;
};

const CAMERA_TIMEOUT_MS = 10000;
const HAVE_CURRENT_DATA = 2;

type SketchState = {
  video: HTMLVideoElement | undefined;
  ready: boolean;
  disposed: boolean;
};

const stopTracks = (video: HTMLVideoElement | undefined): void => {
  const stream = video?.srcObject;
  if (!(stream instanceof MediaStream)) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
};

export const createCameraSketch = (callbacks: SketchCallbacks): CameraSketch => {
  const state: SketchState = { video: undefined, ready: false, disposed: false };

  const sketch = (instance: p5): void => {
    // eslint-disable-next-line no-param-reassign -- p5 instance-mode requires assigning setup/draw on the instance parameter
    instance.setup = () => {
      instance.noCanvas();
      const capture = instance.createCapture(instance.VIDEO, {}, () => {
        if (state.disposed || state.video === undefined) return;
        state.ready = true;
        callbacks.onCameraReady(state.video);
      });
      capture.hide();
      const element = capture.elt;
      state.video = element instanceof HTMLVideoElement ? element : undefined;
      window.setTimeout(() => {
        if (!state.ready && !state.disposed) callbacks.onCameraError();
      }, CAMERA_TIMEOUT_MS);
    };

    // eslint-disable-next-line no-param-reassign -- p5 instance-mode requires assigning setup/draw on the instance parameter
    instance.draw = () => {
      if (!state.ready || state.disposed) return;
      const video = state.video;
      if (video === undefined || video.readyState < HAVE_CURRENT_DATA) return;
      callbacks.onFrame(video);
    };
  };

  const instance = new p5(sketch);

  // If dispose races an open permission prompt, the stream attaches after we
  // stopped tracks (React StrictMode hits this path); stop it on arrival.
  const stopLateStream = (video: HTMLVideoElement | undefined): void => {
    if (video === undefined || video.srcObject instanceof MediaStream) return;
    video.addEventListener('loadedmetadata', () => stopTracks(video), { once: true });
  };

  return {
    dispose: () => {
      state.disposed = true;
      stopTracks(state.video);
      stopLateStream(state.video);
      instance.remove();
    },
  };
};
