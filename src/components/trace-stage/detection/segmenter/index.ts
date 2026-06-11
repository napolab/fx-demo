// MediaPipe ImageSegmenter wrapper — the only file that touches the ML runtime.
// Returns undefined on any load failure so the session can surface 'model-error'.

// Self-hosted from public/mediapipe (WASM copied from the pinned npm package,
// model downloaded once and committed) — no third-party CDN at runtime.
const WASM_BASE_URL = '/mediapipe/wasm';
const MODEL_URL = '/mediapipe/models/selfie_segmenter.tflite';

export type Segmenter = {
  // Returns the person confidence mask (0..1 floats, source dimensions), or
  // undefined when the model produced nothing for this frame.
  segmentFrame: (source: TexImageSource, timestampMs: number) => Float32Array | undefined;
  close: () => void;
};

export const createSegmenter = async (): Promise<Segmenter | undefined> => {
  try {
    const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
    const segmenter = await ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    });

    return {
      segmentFrame(source, timestampMs) {
        const out: { mask: Float32Array | undefined } = { mask: undefined };
        segmenter.segmentForVideo(source, timestampMs, (result) => {
          const masks = result.confidenceMasks;
          // selfie_segmenter emits the person-probability channel last.
          const personMask = masks === undefined ? undefined : masks[masks.length - 1];
          // Copy out — the underlying WASM memory is recycled after the callback.
          out.mask = personMask?.getAsFloat32Array().slice();
        });
        return out.mask;
      },
      close() {
        segmenter.close();
      },
    };
  } catch {
    return undefined;
  }
};
