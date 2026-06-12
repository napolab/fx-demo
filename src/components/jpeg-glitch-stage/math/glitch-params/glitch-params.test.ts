import { describe, expect, test } from 'vitest';

import { GLITCH_UNIFORM_FLOAT_COUNT, normalizeParams, packGlitchUniforms } from '.';

const params = {
  compression: 70,
  brokenBytes: 50,
  qtcPosition: 1,
  qtcValue: 0,
  breakingBytes: 0,
  maxRandom: 255,
  blockSize: 16,
  chroma: 100,
  seed: 777,
} as const;

describe('normalizeParams', () => {
  test('maps 0–100 sliders into 0–1 shader units', () => {
    const normalized = normalizeParams(params);
    expect(normalized.amount).toBeCloseTo(0.5);
    expect(normalized.chroma).toBeCloseTo(1);
    expect(normalized.seed).toBe(777);
  });

  test('derives JPEG quality as the inverse of compression', () => {
    expect(normalizeParams(params).quality).toBe(30);
    expect(normalizeParams({ ...params, compression: 0 }).quality).toBe(100);
    expect(normalizeParams({ ...params, compression: 100 }).quality).toBe(1);
  });
});

describe('packGlitchUniforms', () => {
  test('packs fields in WGSL struct order', () => {
    const packed = packGlitchUniforms({
      procWidth: 640,
      procHeight: 360,
      amount: 0.4,
      chroma: 0.35,
      seed: 1024,
      camAspect: 16 / 9,
      canvasAspect: 2,
      cameraReady: 1,
    });
    expect(packed).toHaveLength(GLITCH_UNIFORM_FLOAT_COUNT);
    const expected = [640, 360, 0.4, 0.35, 1024, 16 / 9, 2, 1];
    for (const [index, value] of expected.entries()) {
      expect(packed[index]).toBeCloseTo(value, 6);
    }
  });

  test('byte length is a multiple of 16 for uniform-buffer alignment', () => {
    expect((GLITCH_UNIFORM_FLOAT_COUNT * 4) % 16).toBe(0);
  });
});
