import { describe, expect, test } from 'vitest';

import { findGridBlobs } from '.';

const maskWith = (width: number, height: number, cells: readonly (readonly [number, number])[]): Float32Array => {
  const mask = new Float32Array(width * height);
  for (const [x, y] of cells) {
    mask[y * width + x] = 1;
  }
  return mask;
};

describe('findGridBlobs', () => {
  test('empty mask yields no boxes', () => {
    expect(findGridBlobs(new Float32Array(64), 8, 8, 0.5, { cols: 2, rows: 2, minCells: 1 })).toEqual([]);
  });

  test('one filled region split by a 2x2 grid yields one tight box per occupied tile', () => {
    // 8×8 mask: pixels only inside the top-left tile (x,y < 4)
    const mask = maskWith(8, 8, [
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
    ]);
    const blobs = findGridBlobs(mask, 8, 8, 0.5, { cols: 2, rows: 2, minCells: 1 });
    expect(blobs).toHaveLength(1);
    const [blob] = blobs;
    // Tight box around the filled pixels, not the tile bounds.
    expect(blob?.minX).toBeCloseTo(1 / 7, 5);
    expect(blob?.maxX).toBeCloseTo(2 / 7, 5);
    expect(blob?.cx).toBeCloseTo(1.5 / 7, 5);
    expect(blob?.area).toBeCloseTo(4 / 64, 5);
  });

  test('a body spanning multiple tiles yields one box per tile', () => {
    // Fill a 2-wide column crossing both grid rows (x=3,4 across y=1..6).
    const column = [1, 2, 3, 4, 5, 6].flatMap((y) => [[3, y] as const, [4, y] as const]);
    const blobs = findGridBlobs(maskWith(8, 8, column), 8, 8, 0.5, { cols: 2, rows: 2, minCells: 1 });
    // x=3 lands in the left tiles, x=4 in the right tiles, across 2 rows → 4 boxes.
    expect(blobs).toHaveLength(4);
  });

  test('tiles below minCells are dropped', () => {
    const mask = maskWith(8, 8, [
      [1, 1],
      [5, 5],
      [6, 5],
      [5, 6],
      [6, 6],
    ]);
    const blobs = findGridBlobs(mask, 8, 8, 0.5, { cols: 2, rows: 2, minCells: 2 });
    expect(blobs).toHaveLength(1);
    expect(blobs[0]?.cx).toBeGreaterThan(0.5);
  });
});
