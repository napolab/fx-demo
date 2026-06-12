// CPU-side packing for the GlitchParams WGSL uniform struct. Layout mirrors
// engine/shaders/common.wgsl — keep both sides in sync (offsets are unit-tested).

import type { GlitchParams } from '../../types';

export const GLITCH_UNIFORM_FLOAT_COUNT = 12;

export type NormalizedParams = {
  amount: number;
  chroma: number;
  /** IJG quality (1..100) derived from the plugin-style compression ratio. */
  quality: number;
  seed: number;
};

export const normalizeParams = (params: GlitchParams): NormalizedParams => ({
  amount: params.brokenBytes / 100,
  chroma: params.chroma / 100,
  quality: Math.max(1, 100 - Math.round(params.compression)),
  seed: params.seed,
});

export type GlitchUniformInput = {
  procWidth: number;
  procHeight: number;
  amount: number;
  chroma: number;
  seed: number;
  camAspect: number;
  canvasAspect: number;
  cameraReady: number;
};

export const packGlitchUniforms = (input: GlitchUniformInput): Float32Array<ArrayBuffer> =>
  new Float32Array([input.procWidth, input.procHeight, input.amount, input.chroma, input.seed, input.camAspect, input.canvasAspect, input.cameraReady, 0, 0, 0, 0]);
