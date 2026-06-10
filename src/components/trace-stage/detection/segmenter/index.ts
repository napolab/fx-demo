// MediaPipe ImageSegmenter wrapper — the only file that touches the ML runtime.
// Returns undefined on any load failure so the session can surface 'model-error'.

// Pinned to the exact npm version in package.json so the remote WASM bytes
// can only change through a reviewed dependency bump (supply-chain hygiene).
const WASM_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
// Versioned model path (not /latest/) for the same reason.
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite';

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
