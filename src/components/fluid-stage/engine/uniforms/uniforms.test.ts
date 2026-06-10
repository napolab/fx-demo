import { describe, expect, test } from 'vitest';

import { MAX_SPLATS, packSimParams, packSplats, SIM_PARAMS_FLOAT_COUNT, SPLAT_FLOAT_STRIDE } from '.';
import type { SplatInput } from '../../types';

const PARAMS = {
  simWidth: 384,
  simHeight: 216,
  dyeWidth: 1280,
  dyeHeight: 720,
  dtSeconds: 1 / 60,
  timeSeconds: 12.5,
  hueShift: 0.25,
  cameraReady: 1,
  gradeMode: 2,
  splatCount: 3,
  camAspect: 16 / 9,
  canvasAspect: 2,
} as const;

const splat = (x: number): SplatInput => ({
  x,
  y: 0.5,
  vx: 1,
  vy: -1,
  radius: 0.1,
  strength: 0.9,
  dyeR: 0.2,
  dyeG: 0.4,
  dyeB: 0.6,
  dyeAmount: 0.3,
  radialImpulse: 0.7,
});

describe('packSimParams', () => {
  test('packs exactly the WGSL SimParams float count', () => {
    expect(packSimParams(PARAMS)).toHaveLength(SIM_PARAMS_FLOAT_COUNT);
  });

  test('places sizes at the head and aspect pair at the documented offsets', () => {
    const data = packSimParams(PARAMS);
    expect(data[0]).toBe(384);
    expect(data[1]).toBe(216);
    expect(data[2]).toBe(1280);
    expect(data[3]).toBe(720);
    expect(data[4]).toBeCloseTo(1 / 60, 6);
    expect(data[10]).toBeCloseTo(0.25, 6);
    expect(data[11]).toBe(1);
    expect(data[12]).toBe(2);
    expect(data[13]).toBe(3);
    expect(data[14]).toBeCloseTo(16 / 9, 6);
    expect(data[15]).toBe(2);
  });
});

describe('packSplats', () => {
  test('always packs the full fixed-size array', () => {
    expect(packSplats([])).toHaveLength(MAX_SPLATS * SPLAT_FLOAT_STRIDE);
  });

  test('packs each splat at a 48-byte (12 float) stride', () => {
    const data = packSplats([splat(0.1), splat(0.7)]);
    expect(data[0]).toBeCloseTo(0.1, 6);
    expect(data[SPLAT_FLOAT_STRIDE]).toBeCloseTo(0.7, 6);
  });

  test('aligns color to the vec4 boundary inside the struct', () => {
    const data = packSplats([splat(0.1)]);
    expect(data[4]).toBeCloseTo(0.2, 6);
    expect(data[5]).toBeCloseTo(0.4, 6);
    expect(data[6]).toBeCloseTo(0.6, 6);
    expect(data[8]).toBeCloseTo(0.1, 6);
    expect(data[9]).toBeCloseTo(0.9, 6);
    expect(data[10]).toBeCloseTo(0.3, 6);
    expect(data[11]).toBeCloseTo(0.7, 6);
  });

  test('zero-fills unused slots', () => {
    const data = packSplats([splat(0.1)]);
    expect(data[SPLAT_FLOAT_STRIDE]).toBe(0);
  });

  test('ignores splats beyond the maximum', () => {
    const many = Array.from({ length: MAX_SPLATS + 4 }, (_, index) => splat(index / 16));
    expect(packSplats(many)).toHaveLength(MAX_SPLATS * SPLAT_FLOAT_STRIDE);
  });
});
