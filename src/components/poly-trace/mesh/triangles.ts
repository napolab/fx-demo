// Pure triangulation helpers wrapping delaunator. No DOM, no GPU — fully unit-tested.

import Delaunator from 'delaunator';

import type { Point } from './points';

export type RGB = {
  r: number;
  g: number;
  b: number;
};

// Triangle vertex indices (groups of 3) into the source point list.
export const triangulate = (points: readonly Point[]): Uint32Array => {
  if (points.length < 3) return new Uint32Array(0);

  const delaunay = Delaunator.from(
    [...points],
    (point) => point.x,
    (point) => point.y,
  );

  return delaunay.triangles;
};

export const triangleCentroid = (points: readonly Point[], aIdx: number, bIdx: number, cIdx: number): Point => {
  const a = points[aIdx];
  const b = points[bIdx];
  const c = points[cIdx];
  if (a === undefined || b === undefined || c === undefined) return { x: 0, y: 0 };

  return { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 };
};

const clampIndex = (v: number, max: number): number => Math.min(max, Math.max(0, v));

// Nearest-cell lookup into the GPU-downsampled RGBA colour map.
export const sampleColor = (colors: Uint8Array | Uint8ClampedArray, cols: number, rows: number, point: Point): RGB => {
  const col = clampIndex(Math.floor(point.x * cols), cols - 1);
  const row = clampIndex(Math.floor(point.y * rows), rows - 1);
  const offset = (row * cols + col) * 4;

  return { r: colors[offset] ?? 0, g: colors[offset + 1] ?? 0, b: colors[offset + 2] ?? 0 };
};
