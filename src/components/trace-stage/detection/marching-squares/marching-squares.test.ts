import { describe, expect, test } from 'vitest';

import { traceContours } from '.';

// 4×4 grid with the inner 2×2 filled: one closed ring expected.
const square4 = Float32Array.from([0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0]);

describe('traceContours', () => {
  test('empty mask yields no contours', () => {
    expect(traceContours(new Float32Array(16), 4, 4, 0.5)).toEqual([]);
  });

  test('fully filled mask yields no contours (no boundary inside the grid)', () => {
    expect(traceContours(new Float32Array(16).fill(1), 4, 4, 0.5)).toEqual([]);
  });

  test('a filled square yields one closed contour of 8 edge-midpoints', () => {
    const contours = traceContours(square4, 4, 4, 0.5);
    expect(contours).toHaveLength(1);
    const [ring] = contours;
    expect(ring).toBeDefined();
    expect(ring).toHaveLength(8);
  });

  test('contour points are normalized into 0..1', () => {
    const [ring] = traceContours(square4, 4, 4, 0.5);
    for (const point of ring ?? []) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(1);
    }
  });

  test('two separate squares yield two contours', () => {
    // 8×4: filled cells at x∈{1,2} and x∈{5,6}, y∈{1,2}
    const mask = new Float32Array(8 * 4);
    const set = (x: number, y: number): void => {
      mask[y * 8 + x] = 1;
    };
    set(1, 1);
    set(2, 1);
    set(1, 2);
    set(2, 2);
    set(5, 1);
    set(6, 1);
    set(5, 2);
    set(6, 2);
    expect(traceContours(mask, 8, 4, 0.5)).toHaveLength(2);
  });
});
