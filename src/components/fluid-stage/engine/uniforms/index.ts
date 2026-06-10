// CPU-side packing for the WGSL uniform structs. Layouts mirror SimParams / Splat in
// engine/shaders/common.wgsl — keep both sides in sync (offsets are unit-tested).

import type { SplatInput } from '../../types';

export const SIM_PARAMS_FLOAT_COUNT = 16;
export const MAX_SPLATS = 8;
// vec2 pos + vec2 vel | vec4 color | radius + strength + dyeAmount + radialImpulse = 48 bytes.
export const SPLAT_FLOAT_STRIDE = 12;

export type SimParamsInput = {
  simWidth: number;
  simHeight: number;
  dyeWidth: number;
  dyeHeight: number;
  dtSeconds: number;
  timeSeconds: number;
  hueShift: number;
  cameraReady: number;
  gradeMode: number;
  splatCount: number;
  camAspect: number;
  canvasAspect: number;
};

// Simulation tuning baked into the params buffer every frame.
const VELOCITY_DISSIPATION = 0.99;
const DYE_DISSIPATION = 0.997;
const VORTICITY_STRENGTH = 22;
const CAMERA_INJECTION = 0.02;

export const packSimParams = (input: SimParamsInput): Float32Array<ArrayBuffer> =>
  new Float32Array([
    input.simWidth,
    input.simHeight,
    input.dyeWidth,
    input.dyeHeight,
    input.dtSeconds,
    input.timeSeconds,
    VELOCITY_DISSIPATION,
    DYE_DISSIPATION,
    VORTICITY_STRENGTH,
    CAMERA_INJECTION,
    input.hueShift,
    input.cameraReady,
    input.gradeMode,
    input.splatCount,
    input.camAspect,
    input.canvasAspect,
  ]);

const packSplat = (splat: SplatInput | undefined): readonly number[] => {
  if (splat === undefined) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  return [splat.x, splat.y, splat.vx, splat.vy, splat.dyeR, splat.dyeG, splat.dyeB, 0, splat.radius, splat.strength, splat.dyeAmount, splat.radialImpulse];
};

export const packSplats = (splats: readonly SplatInput[]): Float32Array<ArrayBuffer> => new Float32Array(Array.from({ length: MAX_SPLATS }, (_, index) => packSplat(splats[index])).flat());
