import { describe, expect, test } from 'vitest';

import { makeBorderPoints } from './points';
import { sampleColor, triangleCentroid, triangulate } from './triangles';

describe('makeBorderPoints', () => {
  test('always includes the four corners', () => {
    const points = makeBorderPoints(0);

    expect(points).toHaveLength(4);
    expect(points).toContainEqual({ x: 0, y: 0 });
    expect(points).toContainEqual({ x: 1, y: 0 });
    expect(points).toContainEqual({ x: 0, y: 1 });
    expect(points).toContainEqual({ x: 1, y: 1 });
  });

  test('adds evenly spaced points along each edge', () => {
    const points = makeBorderPoints(1);

    expect(points).toHaveLength(8);
    expect(points).toContainEqual({ x: 0.5, y: 0 });
    expect(points).toContainEqual({ x: 0.5, y: 1 });
    expect(points).toContainEqual({ x: 0, y: 0.5 });
    expect(points).toContainEqual({ x: 1, y: 0.5 });
  });
});

describe('triangulate', () => {
  test('splits a unit square into two triangles', () => {
    const indices = triangulate([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]);

    expect(indices).toHaveLength(6);
  });

  test('returns empty for fewer than three points', () => {
    expect(
      triangulate([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]),
    ).toHaveLength(0);
  });

  test('returns empty for degenerate collinear points', () => {
    const indices = triangulate([
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
    ]);

    expect(indices).toHaveLength(0);
  });
});

describe('triangleCentroid', () => {
  test('averages the three vertices', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ];

    expect(triangleCentroid(points, 0, 1, 2)).toEqual({ x: 1 / 3, y: 1 / 3 });
  });
});

describe('sampleColor', () => {
  // 2x2 RGBA map: red, green / blue, white
  const colors = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]);

  test('returns the colour of the cell containing the point', () => {
    expect(sampleColor(colors, 2, 2, { x: 0.25, y: 0.25 })).toEqual({ r: 255, g: 0, b: 0 });
    expect(sampleColor(colors, 2, 2, { x: 0.75, y: 0.25 })).toEqual({ r: 0, g: 255, b: 0 });
    expect(sampleColor(colors, 2, 2, { x: 0.25, y: 0.75 })).toEqual({ r: 0, g: 0, b: 255 });
  });

  test('clamps points outside the unit square to the edge cells', () => {
    expect(sampleColor(colors, 2, 2, { x: 1.5, y: 1.5 })).toEqual({ r: 255, g: 255, b: 255 });
    expect(sampleColor(colors, 2, 2, { x: -0.5, y: -0.5 })).toEqual({ r: 255, g: 0, b: 0 });
  });
});
