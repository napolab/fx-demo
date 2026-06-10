import { describe, expect, test } from 'vitest';

import { findBlobs, trackBlobs } from '.';

const maskWith = (width: number, height: number, cells: readonly (readonly [number, number])[]): Float32Array => {
  const mask = new Float32Array(width * height);
  for (const [x, y] of cells) {
    mask[y * width + x] = 1;
  }
  return mask;
};

describe('findBlobs', () => {
  test('empty mask has no blobs', () => {
    expect(findBlobs(new Float32Array(64), 8, 8, 0.5, 1)).toEqual([]);
  });

  test('one filled square is one blob with correct bbox and centroid', () => {
    const mask = maskWith(8, 8, [
      [2, 2],
      [3, 2],
      [2, 3],
      [3, 3],
    ]);
    const blobs = findBlobs(mask, 8, 8, 0.5, 1);
    expect(blobs).toHaveLength(1);
    const [blob] = blobs;
    expect(blob?.minX).toBeCloseTo(2 / 7, 5);
    expect(blob?.maxX).toBeCloseTo(3 / 7, 5);
    expect(blob?.cx).toBeCloseTo(2.5 / 7, 5);
    expect(blob?.area).toBeCloseTo(4 / 64, 5);
  });

  test('two distant squares are two blobs; tiny specks below minArea are dropped', () => {
    const mask = maskWith(16, 8, [
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
      [12, 5],
      [13, 5],
      [12, 6],
      [13, 6],
      [8, 0],
    ]);
    const blobs = findBlobs(mask, 16, 8, 0.5, 2);
    expect(blobs).toHaveLength(2);
  });
});

describe('trackBlobs', () => {
  const blobAt = (cx: number, cy: number) => ({ minX: cx - 0.1, minY: cy - 0.1, maxX: cx + 0.1, maxY: cy + 0.1, cx, cy, area: 0.04 });

  test('first frame assigns sequential ids', () => {
    const result = trackBlobs([], [blobAt(0.3, 0.3), blobAt(0.7, 0.7)], 0);
    expect(result.blobs.map((blob) => blob.id)).toEqual([0, 1]);
    expect(result.nextId).toBe(2);
  });

  test('a blob that moved slightly keeps its id', () => {
    const first = trackBlobs([], [blobAt(0.3, 0.3)], 0);
    const second = trackBlobs(first.blobs, [blobAt(0.33, 0.31)], first.nextId);
    expect(second.blobs[0]?.id).toBe(0);
    expect(second.nextId).toBe(1);
  });

  test('a far-away appearance gets a fresh id', () => {
    const first = trackBlobs([], [blobAt(0.2, 0.2)], 0);
    const second = trackBlobs(first.blobs, [blobAt(0.9, 0.9)], first.nextId);
    expect(second.blobs[0]?.id).toBe(1);
  });
});
