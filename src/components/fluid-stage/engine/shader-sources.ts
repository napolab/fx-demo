// Compose each pass with the shared WGSL header (structs + helpers).
// Raw .wgsl imports are wired through next.config.ts (asset/source).

import advectDyeBackward from './shaders/advect-dye-backward.wgsl';
import advectDyeForward from './shaders/advect-dye-forward.wgsl';
import advectOffset from './shaders/advect-offset.wgsl';
import advectVelocity from './shaders/advect-velocity.wgsl';
import common from './shaders/common.wgsl';
import curl from './shaders/curl.wgsl';
import divergence from './shaders/divergence.wgsl';
import gradientSubtract from './shaders/gradient-subtract.wgsl';
import injectDye from './shaders/inject-dye.wgsl';
import maccormackCombine from './shaders/maccormack-combine.wgsl';
import pressureDecay from './shaders/pressure-decay.wgsl';
import pressureJacobi from './shaders/pressure-jacobi.wgsl';
import render from './shaders/render.wgsl';
import splatVelocity from './shaders/splat-velocity.wgsl';
import vorticity from './shaders/vorticity.wgsl';

const compose = (body: string): string => `${common}\n${body}`;

export const shaderSources = {
  advectVelocity: compose(advectVelocity),
  splatVelocity: compose(splatVelocity),
  curl: compose(curl),
  vorticity: compose(vorticity),
  divergence: compose(divergence),
  pressureDecay: compose(pressureDecay),
  pressureJacobi: compose(pressureJacobi),
  gradientSubtract: compose(gradientSubtract),
  advectOffset: compose(advectOffset),
  advectDyeForward: compose(advectDyeForward),
  advectDyeBackward: compose(advectDyeBackward),
  maccormackCombine: compose(maccormackCombine),
  injectDye: compose(injectDye),
  render: compose(render),
} as const;
