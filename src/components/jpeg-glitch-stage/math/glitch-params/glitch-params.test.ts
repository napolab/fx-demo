import { describe, expect, test } from 'vitest';

import { GLITCH_UNIFORM_FLOAT_COUNT, normalizeParams, packGlitchUniforms } from '.';

describe('normalizeParams', () => {
  test('maps 0–100 sliders into 0–1 shader units', () => {
    const normalized = normalizeParams({ amount: 50, quality: 30, blockSize: 16, chroma: 100, shift: 0, seed: 777 });
    expect(normalized.amount).toBeCloseTo(0.5);
    expect(normalized.chroma).toBeCloseTo(1);
    expect(normalized.shift).toBeCloseTo(0);
    expect(normalized.seed).toBe(777);
  });
});

describe('packGlitchUniforms', () => {
  test('packs fields in WGSL struct order', () => {
    const packed = packGlitchUniforms({
      procWidth: 640,
      procHeight: 360,
      amount: 0.4,
      chroma: 0.35,
      shift: 0.15,
      seed: 1024,
      camAspect: 16 / 9,
      canvasAspect: 2,
      cameraReady: 1,
    });
    expect(packed).toHaveLength(GLITCH_UNIFORM_FLOAT_COUNT);
    const expected = [640, 360, 0.4, 0.35, 0.15, 1024, 16 / 9, 2, 1];
    const actual = Array.from(packed.slice(0, 9));
    for (const [i, exp] of expected.entries()) {
      expect(actual[i]).toBeCloseTo(exp, 6);
    }
  });

  test('byte length is a multiple of 16 for uniform-buffer alignment', () => {
    expect((GLITCH_UNIFORM_FLOAT_COUNT * 4) % 16).toBe(0);
  });
});
