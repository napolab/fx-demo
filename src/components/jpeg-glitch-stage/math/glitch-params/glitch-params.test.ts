import { describe, expect, test } from 'vitest';

import { GLITCH_UNIFORM_FLOAT_COUNT, normalizeParams, packGlitchUniforms } from '.';
import { DEFAULT_PARAMS } from '../../types';

describe('normalizeParams', () => {
  test('maps sliders into shader units', () => {
    const normalized = normalizeParams({ ...DEFAULT_PARAMS, chroma: 100, brokenSeed: 777 });
    expect(normalized.chroma).toBeCloseTo(1);
    expect(normalized.seed).toBe(777);
  });

  test('derives JPEG quality as the inverse of compression', () => {
    expect(normalizeParams({ ...DEFAULT_PARAMS, compression: 70 }).quality).toBe(30);
    expect(normalizeParams({ ...DEFAULT_PARAMS, compression: 0 }).quality).toBe(100);
    expect(normalizeParams({ ...DEFAULT_PARAMS, compression: 100 }).quality).toBe(1);
  });
});

describe('packGlitchUniforms', () => {
  test('packs fields in WGSL struct order', () => {
    const packed = packGlitchUniforms({
      procWidth: 640,
      procHeight: 360,
      chroma: 0.35,
      seed: 1024,
      camAspect: 16 / 9,
      canvasAspect: 2,
      cameraReady: 1,
      inverseDCT: 1,
      ycbcrToRGB: 0,
    });
    expect(packed).toHaveLength(GLITCH_UNIFORM_FLOAT_COUNT);
    const expected = [640, 360, 0.35, 1024, 16 / 9, 2, 1, 1, 0];
    for (const [index, value] of expected.entries()) {
      expect(packed[index]).toBeCloseTo(value, 6);
    }
  });

  test('byte length is a multiple of 16 for uniform-buffer alignment', () => {
    expect((GLITCH_UNIFORM_FLOAT_COUNT * 4) % 16).toBe(0);
  });
});
