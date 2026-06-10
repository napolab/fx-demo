// CPU-side packing for the GlitchParams WGSL uniform struct. Layout mirrors
// engine/shaders/common.wgsl — keep both sides in sync (offsets are unit-tested).

import type { GlitchParams } from '../../types';

export const GLITCH_UNIFORM_FLOAT_COUNT = 12;

export type NormalizedParams = {
  amount: number;
  chroma: number;
  shift: number;
  seed: number;
};

export const normalizeParams = (params: GlitchParams): NormalizedParams => ({
  amount: params.amount / 100,
  chroma: params.chroma / 100,
  shift: params.shift / 100,
  seed: params.seed,
});

export type GlitchUniformInput = {
  procWidth: number;
  procHeight: number;
  amount: number;
  chroma: number;
  shift: number;
  seed: number;
  camAspect: number;
  canvasAspect: number;
  cameraReady: number;
};

export const packGlitchUniforms = (input: GlitchUniformInput): Float32Array<ArrayBuffer> =>
  new Float32Array([input.procWidth, input.procHeight, input.amount, input.chroma, input.shift, input.seed, input.camAspect, input.canvasAspect, input.cameraReady, 0, 0, 0]);
