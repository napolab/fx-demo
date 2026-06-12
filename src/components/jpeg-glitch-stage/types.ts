// Shared contracts for the JPEG glitch stage. UI-facing params use 0–100 ranges
// (AE-plugin feel); normalization to shader units lives in math/glitch-params.

export type BlockSize = 8 | 16 | 32;

export type GlitchParams = {
  /** 0–100: probability/strength of DCT coefficient corruption. */
  amount: number;
  /** 0–100: JPEG quality. Lower = harsher quantization crush. */
  quality: number;
  /** 0–100: how many quantization-table entries get replaced with random steps. */
  tableChaos: number;
  /** Effective DCT block size in canvas pixels. */
  blockSize: BlockSize;
  /** 0–100: chroma subsampling collapse. */
  chroma: number;
  /** 0–100: block-row horizontal displacement. */
  shift: number;
  /** 0–9999: deterministic corruption seed. */
  seed: number;
};

export type GlitchStatus = 'booting' | 'running' | 'no-webgpu' | 'no-camera' | 'lost';

export type FrameInput = GlitchParams & {
  cameraReady: boolean;
};

export const DEFAULT_PARAMS = {
  amount: 40,
  quality: 30,
  tableChaos: 0,
  blockSize: 16,
  chroma: 35,
  shift: 15,
  seed: 1024,
} satisfies GlitchParams;
