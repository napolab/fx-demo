// Records the masked canvas to a WebM file (video only) via MediaRecorder and
// auto-downloads it on stop. Encapsulates the imperative recorder lifecycle so
// the session just calls start/stop. No audio track is captured by design.

export type CanvasRecorder = {
  start: () => void;
  stop: () => void;
  isActive: () => boolean;
  // Milliseconds since the current recording started; 0 when idle.
  elapsedMs: () => number;
};

const MIME_CANDIDATES = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'] as const;

const pickMimeType = (): string | undefined => MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));

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
      const recorder = mimeType !== undefined ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
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
