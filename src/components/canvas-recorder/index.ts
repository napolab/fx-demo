// Records any canvas to a WebM file (video only) via MediaRecorder and
// auto-downloads it on stop. Encapsulates the imperative recorder lifecycle so
// callers just invoke start/stop. No audio track is captured by design.
// Shared by the bounding-mask stage (single 2D canvas) and the trace stage
// (an offscreen compositor of its WebGPU + p5 layers).

export type CanvasRecorder = {
  start: () => void;
  stop: () => void;
  isActive: () => boolean;
  // Milliseconds since the current recording started; 0 when idle.
  elapsedMs: () => number;
};

const MIME_CANDIDATES = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'] as const;

const pickMimeType = (): string | undefined => MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));

// Bitrate target. MediaRecorder otherwise pins ~2.5 Mbps regardless of
// resolution, which mushes fine wireframes and film grain on HD canvases. We
// scale with pixels × fps at a high-quality bits-per-pixel and clamp the range.
const BITS_PER_PIXEL = 0.2;
const MIN_BITS_PER_SECOND = 4_000_000;
const MAX_BITS_PER_SECOND = 40_000_000;

const resolveBitrate = (canvas: HTMLCanvasElement, fps: number): number => {
  const raw = canvas.width * canvas.height * fps * BITS_PER_PIXEL;
  return Math.round(Math.min(Math.max(raw, MIN_BITS_PER_SECOND), MAX_BITS_PER_SECOND));
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

type RecorderState = { recorder: MediaRecorder | undefined; chunks: readonly Blob[]; startedAtMs: number };

export const createCanvasRecorder = (canvas: HTMLCanvasElement, fps: number, filename: string): CanvasRecorder => {
  const state: RecorderState = { recorder: undefined, chunks: [], startedAtMs: 0 };

  return {
    start() {
      if (state.recorder !== undefined) return;
      const stream = canvas.captureStream(fps);
      const mimeType = pickMimeType();
      const videoBitsPerSecond = resolveBitrate(canvas, fps);
      const options = mimeType !== undefined ? { mimeType, videoBitsPerSecond } : { videoBitsPerSecond };
      const recorder = new MediaRecorder(stream, options);
      state.chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) state.chunks = [...state.chunks, event.data];
      };
      recorder.onstop = () => {
        downloadBlob(new Blob([...state.chunks], { type: recorder.mimeType }), filename);
        state.recorder = undefined;
        state.startedAtMs = 0;
      };
      state.recorder = recorder;
      state.startedAtMs = performance.now();
      recorder.start();
    },
    stop() {
      state.recorder?.stop();
    },
    isActive() {
      return state.recorder !== undefined;
    },
    elapsedMs() {
      return state.recorder === undefined ? 0 : performance.now() - state.startedAtMs;
    },
  };
};
