// Polytrace の noise engine 相当: 決定的な格子点を、滑らかに時間発展する value noise で
// 変位させる。evolution が止まればメッシュは完全に静止する(本家のデフォルト挙動)。
// Pure functions — no DOM, no GPU, fully unit-tested.

import type { Point } from './points';

const LATTICE_CELL_JITTER = 0.9;
const DISPLACE_MAX = 0.1;
const DISPLACE_FREQUENCY = 3;

const hash3 = (x: number, y: number, z: number, seed: number): number => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 43.7) * 43758.5453123;

  return s - Math.floor(s);
};

const smooth = (v: number): number => v * v * (3 - 2 * v);

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// Trilinearly interpolated value noise over an integer lattice; C1-smooth in x, y, t.
export const valueNoise = (x: number, y: number, t: number, seed: number): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const ti = Math.floor(t);
  const u = smooth(x - xi);
  const v = smooth(y - yi);
  const w = smooth(t - ti);

  const c000 = hash3(xi, yi, ti, seed);
  const c100 = hash3(xi + 1, yi, ti, seed);
  const c010 = hash3(xi, yi + 1, ti, seed);
  const c110 = hash3(xi + 1, yi + 1, ti, seed);
  const c001 = hash3(xi, yi, ti + 1, seed);
  const c101 = hash3(xi + 1, yi, ti + 1, seed);
  const c011 = hash3(xi, yi + 1, ti + 1, seed);
  const c111 = hash3(xi + 1, yi + 1, ti + 1, seed);

  const bottom = lerp(lerp(c000, c100, u), lerp(c010, c110, u), v);
  const top = lerp(lerp(c001, c101, u), lerp(c011, c111, u), v);

  return lerp(bottom, top, w) * 2 - 1;
};

// Deterministic point lattice: roughly `count` points on a cols×rows grid matching the
// aspect ratio, each nudged by a fixed per-cell hash so the grid never reads as a grid.
export const latticePoints = (count: number, aspect: number, seed: number): Point[] => {
  const cols = Math.max(2, Math.round(Math.sqrt(count * aspect)));
  const rows = Math.max(2, Math.round(count / cols));

  return Array.from({ length: cols * rows }, (_, index): Point => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const offsetX = (hash3(col, row, 0, seed) - 0.5) * LATTICE_CELL_JITTER;
    const offsetY = (hash3(col, row, 1, seed) - 0.5) * LATTICE_CELL_JITTER;

    return { x: (col + 0.5 + offsetX) / cols, y: (row + 0.5 + offsetY) / rows };
  });
};

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

// Displace each point along a smooth noise field sampled at (point, time). Same time →
// same mesh; advancing time slowly makes the mesh flow like the noiseEngine demo.
export const displacePoints = (points: readonly Point[], time: number, amount: number, seed: number): Point[] => {
  if (amount === 0) return points.map((point) => ({ ...point }));

  return points.map((point): Point => {
    const nx = valueNoise(point.x * DISPLACE_FREQUENCY, point.y * DISPLACE_FREQUENCY, time, seed);
    const ny = valueNoise(point.x * DISPLACE_FREQUENCY + 100, point.y * DISPLACE_FREQUENCY, time, seed + 7);

    return {
      x: clamp01(point.x + nx * DISPLACE_MAX * amount),
      y: clamp01(point.y + ny * DISPLACE_MAX * amount),
    };
  });
};
