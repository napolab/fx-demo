// Marching squares over a scalar mask. Emits per-cell boundary segments at
// edge midpoints, then chains shared endpoints into closed contour loops.
// No interpolation — downstream RDP simplification smooths the staircase.

import type { Contour, Point } from '../../types';

type Segment = { ax: number; ay: number; bx: number; by: number };

const range = (length: number): readonly number[] => Array.from({ length }, (_, index) => index);

// Edge midpoints of cell (x, y): top / right / bottom / left.
const edgePoint = (x: number, y: number, edge: 0 | 1 | 2 | 3): readonly [number, number] => {
  switch (edge) {
    case 0:
      return [x + 0.5, y];
    case 1:
      return [x + 1, y + 0.5];
    case 2:
      return [x + 0.5, y + 1];
    case 3:
      return [x, y + 0.5];
  }
};

// Marching-squares case table. Bits: TL=1, TR=2, BR=4, BL=8.
// Each entry lists [fromEdge, toEdge] pairs (0=top 1=right 2=bottom 3=left).
const CASES: readonly (readonly (readonly [0 | 1 | 2 | 3, 0 | 1 | 2 | 3])[])[] = [
  [],
  [[3, 0]],
  [[0, 1]],
  [[3, 1]],
  [[1, 2]],
  [
    [3, 0],
    [1, 2],
  ],
  [[0, 2]],
  [[3, 2]],
  [[2, 3]],
  [[2, 0]],
  [
    [0, 1],
    [2, 3],
  ],
  [[2, 1]],
  [[1, 3]],
  [[1, 0]],
  [[0, 3]],
  [],
];

const keyOf = (x: number, y: number): string => `${x}|${y}`;

const NO_SEGMENTS: readonly Segment[] = [];

const cellSegments = (mask: Float32Array, width: number, threshold: number, cx: number, cy: number): readonly Segment[] => {
  const inside = (x: number, y: number): boolean => {
    const value = mask[y * width + x];
    return value !== undefined && value >= threshold;
  };
  const code = (inside(cx, cy) ? 1 : 0) + (inside(cx + 1, cy) ? 2 : 0) + (inside(cx + 1, cy + 1) ? 4 : 0) + (inside(cx, cy + 1) ? 8 : 0);
  const entries = CASES[code] ?? [];
  // Most cells are fully inside/outside; reuse a shared empty result instead
  // of allocating a fresh [] — this helper runs ~57k times per camera frame.
  if (entries.length === 0) return NO_SEGMENTS;
  return entries.map(([from, to]) => {
    const [ax, ay] = edgePoint(cx, cy, from);
    const [bx, by] = edgePoint(cx, cy, to);
    return { ax, ay, bx, by };
  });
};

const collectSegments = (mask: Float32Array, width: number, height: number, threshold: number): readonly Segment[] =>
  range(height - 1).flatMap((cy) => range(width - 1).flatMap((cx) => cellSegments(mask, width, threshold, cx, cy)));

const buildEndpointMap = (segments: readonly Segment[]): Map<string, number[]> => {
  const byEndpoint = new Map<string, number[]>();
  for (const [index, segment] of segments.entries()) {
    const aKey = keyOf(segment.ax, segment.ay);
    const bKey = keyOf(segment.bx, segment.by);
    byEndpoint.set(aKey, [...(byEndpoint.get(aKey) ?? []), index]);
    byEndpoint.set(bKey, [...(byEndpoint.get(bKey) ?? []), index]);
  }
  return byEndpoint;
};

type Walk = { points: readonly Point[]; visited: ReadonlySet<number> };

// Walk one contour loop starting from segment startIndex. Terminates when the
// walk returns to the start endpoint (closed — the closing point is NOT
// appended) or no unused segment continues the chain (open dead end). Newly
// visited segment indices are returned for the caller to mark; `used` is only
// read here.
//
// HOT PATH: this runs every camera frame over ~1-2k boundary segments. Local
// index-assigned buffers replace immutable per-step copies, which would be
// O(n²) at contour scale; no mutation escapes this function.
const walkContour = (startIndex: number, start: Segment, used: Uint8Array, segments: readonly Segment[], byEndpoint: Map<string, number[]>, normalize: (x: number, y: number) => Point): Walk => {
  const visited = new Set<number>([startIndex]);
  const points: Point[] = [normalize(start.ax, start.ay), normalize(start.bx, start.by)];
  const startKey = keyOf(start.ax, start.ay);
  const cursor = { key: keyOf(start.bx, start.by), open: true };

  while (cursor.open) {
    const candidates = byEndpoint.get(cursor.key) ?? [];
    const nextIndex = candidates.find((candidate) => used[candidate] !== 1 && !visited.has(candidate));
    const next = nextIndex === undefined ? undefined : segments[nextIndex];
    if (nextIndex === undefined || next === undefined) {
      cursor.open = false;
      continue;
    }
    visited.add(nextIndex);
    const exitsFromA = keyOf(next.ax, next.ay) === cursor.key;
    const [nx, ny] = exitsFromA ? [next.bx, next.by] : [next.ax, next.ay];
    cursor.key = keyOf(nx, ny);
    if (cursor.key === startKey) {
      cursor.open = false;
      continue;
    }
    points[points.length] = normalize(nx, ny);
  }
  return { points, visited };
};

const chainContours = (segments: readonly Segment[], width: number, height: number): readonly Contour[] => {
  const byEndpoint = buildEndpointMap(segments);
  const normalize = (x: number, y: number): Point => ({ x: x / (width - 1), y: y / (height - 1) });
  const used = new Uint8Array(segments.length);
  const contours: Contour[] = [];

  for (const [startIndex, start] of segments.entries()) {
    if (used[startIndex] === 1) continue;
    const walk = walkContour(startIndex, start, used, segments, byEndpoint, normalize);
    for (const index of walk.visited) {
      used[index] = 1;
    }
    if (walk.points.length >= 3) contours[contours.length] = walk.points;
  }
  return contours;
};

export const traceContours = (mask: Float32Array, width: number, height: number, threshold: number): readonly Contour[] => {
  if (width < 2 || height < 2) return [];
  return chainContours(collectSegments(mask, width, height, threshold), width, height);
};
