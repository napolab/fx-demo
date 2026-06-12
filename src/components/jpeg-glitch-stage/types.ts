// Shared contracts for the JPEG glitch stage. Parameter names and grouping
// mirror the aescripts "JPEG glitch" plugin's effect controls; normalization
// to shader units lives in math/glitch-params.

export type BlockSize = 8 | 16 | 32;

export type GlitchParams = {
  /** 1–100: compression ratio. Higher = more compression (lower JPEG quality). */
  compression: number;

  // Broken bytes — entropy-stream corruption.
  /** 0–4096: how many bytes of the "compressed stream" break. */
  brokenBytes: number;
  /** 0–100: stream fraction where the glitch starts. */
  glitchStart: number;
  /** 0–100: stream fraction where the glitch ends. */
  glitchEnd: number;
  /** 0–9999: seed for the break positions. */
  brokenSeed: number;

  // Quantization tables for Chroma.
  qtcEnabled: boolean;
  /** 1–64 */
  qtcPosition: number;
  /** 0–255 (0 = no override) */
  qtcValue: number;
  /** 0–64 */
  qtcBreakingBytes: number;
  /** 0–255 */
  qtcMaxRandom: number;
  /** 0–9999 */
  qtcSeed: number;

  // Quantization tables for Luma.
  qtlEnabled: boolean;
  qtlPosition: number;
  qtlValue: number;
  qtlBreakingBytes: number;
  qtlMaxRandom: number;
  qtlSeed: number;

  // Advanced settings.
  inverseDCT: boolean;
  ycbcrToRGB: boolean;

  // Stage extras (live-camera staging, not part of the plugin).
  blockSize: BlockSize;
  /** 0–100: chroma subsampling collapse. */
  chroma: number;
};

export type GlitchStatus = 'booting' | 'running' | 'no-webgpu' | 'no-camera' | 'lost';

export type FrameInput = GlitchParams & {
  cameraReady: boolean;
};

export const DEFAULT_PARAMS = {
  compression: 70,
  brokenBytes: 48,
  glitchStart: 0,
  glitchEnd: 100,
  brokenSeed: 1,
  qtcEnabled: false,
  qtcPosition: 5,
  qtcValue: 0,
  qtcBreakingBytes: 0,
  qtcMaxRandom: 0,
  qtcSeed: 1,
  qtlEnabled: false,
  qtlPosition: 5,
  qtlValue: 0,
  qtlBreakingBytes: 0,
  qtlMaxRandom: 0,
  qtlSeed: 1,
  inverseDCT: true,
  ycbcrToRGB: true,
  blockSize: 16,
  chroma: 35,
} satisfies GlitchParams;
