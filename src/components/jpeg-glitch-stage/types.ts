// Shared contracts for the JPEG glitch stage. Parameter names follow the
// aescripts "JPEG glitch" plugin (compression / broken bytes / quantization
// table controls); normalization to shader units lives in math/glitch-params.

export type BlockSize = 8 | 16 | 32;

export type GlitchParams = {
  /** 0–100: compression ratio. Higher = more compression (lower JPEG quality). */
  compression: number;
  /** 0–100: how much of the "compressed stream" breaks (cascade tears). */
  brokenBytes: number;
  /** 1–64: which quantization-table entry the QTC override targets. */
  qtcPosition: number;
  /** 0–255: value written at qtcPosition in both tables. 0 = override off. */
  qtcValue: number;
  /** 0–64: how many table entries get replaced with random values. */
  breakingBytes: number;
  /** 1–255: upper bound for the random table replacements. */
  maxRandom: number;
  /** Effective DCT block size in canvas pixels. */
  blockSize: BlockSize;
  /** 0–100: chroma subsampling collapse. */
  chroma: number;
  /** 0–9999: deterministic corruption seed. */
  seed: number;
};

export type GlitchStatus = 'booting' | 'running' | 'no-webgpu' | 'no-camera' | 'lost';

export type FrameInput = GlitchParams & {
  cameraReady: boolean;
};

export const DEFAULT_PARAMS = {
  compression: 70,
  brokenBytes: 40,
  qtcPosition: 1,
  qtcValue: 0,
  breakingBytes: 0,
  maxRandom: 255,
  blockSize: 16,
  chroma: 35,
  seed: 1024,
} satisfies GlitchParams;
