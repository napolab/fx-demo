import { describe, expect, it } from 'vitest';

import type { PartBox } from '../../trace-stage/types';

import { buildSilhouetteRGBA, clamp01, compositeColor, hexToRgb, inAnyRect, padBox, screenRect } from './index';

describe('clamp01', () => {
  it('clamps to the 0..1 range', () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1.5)).toBe(1);
  });
});

describe('padBox', () => {
  const box: PartBox = { part: 'face', minX: 0.4, minY: 0.4, maxX: 0.6, maxY: 0.6, cx: 0.5, cy: 0.5 };

  it('keeps the box unchanged at padding 1', () => {
    expect(padBox(box, 1)).toEqual({ minX: 0.4, minY: 0.4, maxX: 0.6, maxY: 0.6 });
  });

  it('scales around the centre', () => {
    const padded = padBox(box, 2);
    expect(padded.minX).toBeCloseTo(0.3, 10);
    expect(padded.minY).toBeCloseTo(0.3, 10);
    expect(padded.maxX).toBeCloseTo(0.7, 10);
    expect(padded.maxY).toBeCloseTo(0.7, 10);
  });

  it('clamps to the frame edges', () => {
    const edge: PartBox = { part: 'hip', minX: 0, minY: 0, maxX: 0.4, maxY: 0.4, cx: 0.2, cy: 0.2 };
    const padded = padBox(edge, 3);
    expect(padded.minX).toBe(0);
    expect(padded.minY).toBe(0);
  });
});

describe('hexToRgb', () => {
  it('parses a 6-digit hex', () => {
    expect(hexToRgb('#ff3b3b')).toEqual({ r: 255, g: 59, b: 59 });
  });

  it('parses a 3-digit hex', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });
});

describe('compositeColor', () => {
  it('builds an rgba string with the given opacity', () => {
    expect(compositeColor('#ff3b3b', 0.5)).toBe('rgba(255, 59, 59, 0.5)');
  });

  it('clamps opacity into 0..1', () => {
    expect(compositeColor('#000000', 2)).toBe('rgba(0, 0, 0, 1)');
  });
});

describe('inAnyRect', () => {
  const rects = [{ minX: 0.1, minY: 0.1, maxX: 0.3, maxY: 0.3 }];

  it('detects a point inside a rect', () => {
    expect(inAnyRect({ x: 0.2, y: 0.2 }, rects)).toBe(true);
  });

  it('rejects a point outside every rect', () => {
    expect(inAnyRect({ x: 0.5, y: 0.5 }, rects)).toBe(false);
  });
});

describe('screenRect', () => {
  it('maps a content rect to pixels under an identity cover', () => {
    const rect = screenRect({ minX: 0.25, minY: 0.5, maxX: 0.75, maxY: 1 }, { x: 1, y: 1 }, 100, 200);
    expect(rect).toEqual({ x: 25, y: 100, w: 50, h: 100 });
  });
});

describe('buildSilhouetteRGBA', () => {
  it('tints pixels that are on the person and inside a rect', () => {
    const mask = new Float32Array([0.2, 0.8]); // 2x1 frame
    const rects = [{ minX: 0, minY: 0, maxX: 1, maxY: 1 }];
    const rgba = buildSilhouetteRGBA(mask, 2, 1, rects, { r: 255, g: 0, b: 0 }, 1, 0.5);

    // Pixel 0 (uv.x 0.25, mask 0.2) → below threshold → transparent.
    expect([rgba[0], rgba[1], rgba[2], rgba[3]]).toEqual([0, 0, 0, 0]);
    // Pixel 1 (uv.x 0.75, mask 0.8) → tinted at full opacity.
    expect([rgba[4], rgba[5], rgba[6], rgba[7]]).toEqual([255, 0, 0, 255]);
  });

  it('excludes on-person pixels outside every rect', () => {
    const mask = new Float32Array([0.9]);
    const rects = [{ minX: 0.6, minY: 0, maxX: 1, maxY: 1 }];
    const rgba = buildSilhouetteRGBA(mask, 1, 1, rects, { r: 0, g: 255, b: 0 }, 1, 0.5);
    // Single pixel sits at uv.x 0.5, outside the rect → transparent.
    expect(rgba[3]).toBe(0);
  });
});
