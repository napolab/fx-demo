// CPU-side packing for the GlitchParams WGSL uniform struct. Layout mirrors
// engine/shaders/common.wgsl — keep both sides in sync (offsets are unit-tested).

import type { GlitchParams } from '../../types';

export const GLITCH_UNIFORM_FLOAT_COUNT = 12;

export type NormalizedParams = {
  chroma: number;
  /** IJG quality (1..100) derived from the plugin-style compression ratio. */
  quality: number;
  seed: number;
};

export const normalizeParams = (params: GlitchParams): NormalizedParams => ({
  chroma: params.chroma / 100,
  quality: Math.max(1, 100 - Math.round(params.compression)),
  seed: params.brokenSeed,
});

export type GlitchUniformInput = {
  procWidth: number;
  procHeight: number;
  chroma: number;
  seed: number;
  camAspect: number;
  canvasAspect: number;
  cameraReady: number;
  inverseDCT: number;
  ycbcrToRGB: number;
};

export const packGlitchUniforms = (input: GlitchUniformInput): Float32Array<ArrayBuffer> =>
  new Float32Array([input.procWidth, input.procHeight, input.chroma, input.seed, input.camAspect, input.canvasAspect, input.cameraReady, input.inverseDCT, input.ycbcrToRGB, 0, 0, 0]);
