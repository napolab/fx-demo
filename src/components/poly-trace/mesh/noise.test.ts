import { describe, expect, test } from 'vitest';

import { displacePoints, latticePoints, valueNoise } from './noise';

describe('valueNoise', () => {
  test('is deterministic for the same inputs', () => {
    expect(valueNoise(1.3, 2.7, 0.5, 9)).toBe(valueNoise(1.3, 2.7, 0.5, 9));
  });

  test('stays within [-1, 1]', () => {
    for (const i of Array.from({ length: 200 }, (_, index) => index)) {
      const v = valueNoise(i * 0.37, i * 0.73, i * 0.11, 4);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  test('is continuous: small input deltas produce small output deltas', () => {
    for (const i of Array.from({ length: 100 }, (_, index) => index)) {
      const x = i * 0.31;
      const delta = Math.abs(valueNoise(x + 0.01, 1.5, 0.2, 3) - valueNoise(x, 1.5, 0.2, 3));
      expect(delta).toBeLessThan(0.2);
    }
  });

  test('is continuous in time', () => {
    for (const i of Array.from({ length: 100 }, (_, index) => index)) {
      const t = i * 0.17;
      const delta = Math.abs(valueNoise(0.4, 0.8, t + 0.01, 3) - valueNoise(0.4, 0.8, t, 3));
      expect(delta).toBeLessThan(0.2);
    }
  });

  test('differs across seeds', () => {
    expect(valueNoise(1.3, 2.7, 0.5, 1)).not.toBe(valueNoise(1.3, 2.7, 0.5, 2));
  });
});

describe('latticePoints', () => {
  test('returns roughly the requested number of points', () => {
    const points = latticePoints(600, 16 / 9, 1);

    expect(points.length).toBeGreaterThan(450);
    expect(points.length).toBeLessThan(750);
  });

  test('keeps every point inside the unit square', () => {
    for (const point of latticePoints(300, 16 / 9, 5)) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(1);
    }
  });

  test('is deterministic for the same seed', () => {
    expect(latticePoints(200, 1, 3)).toEqual(latticePoints(200, 1, 3));
  });

  test('breaks perfect grid regularity with per-cell offsets', () => {
    const points = latticePoints(100, 1, 1);
    const xs = new Set(points.map((point) => point.x.toFixed(6)));

    // a perfectly regular grid of ~100 points would collapse to ~10 distinct x values
    expect(xs.size).toBeGreaterThan(points.length / 2);
  });
});

describe('displacePoints', () => {
  const base = latticePoints(100, 1, 2);

  test('returns identical points when amount is zero', () => {
    expect(displacePoints(base, 1.5, 0, 4)).toEqual(base);
  });

  test('is deterministic', () => {
    expect(displacePoints(base, 1.5, 1, 4)).toEqual(displacePoints(base, 1.5, 1, 4));
  });

  test('keeps points inside the unit square with bounded displacement', () => {
    for (const [index, point] of displacePoints(base, 2.3, 1, 4).entries()) {
      const source = base[index];
      if (source === undefined) throw new Error('missing source point');
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(1);
      expect(Math.hypot(point.x - source.x, point.y - source.y)).toBeLessThanOrEqual(0.2);
    }
  });

  test('moves smoothly over time', () => {
    const a = displacePoints(base, 1, 1, 4);
    const b = displacePoints(base, 1.016, 1, 4);
    for (const [index, point] of a.entries()) {
      const next = b[index];
      if (next === undefined) throw new Error('missing point');
      expect(Math.hypot(next.x - point.x, next.y - point.y)).toBeLessThan(0.02);
    }
  });
});
