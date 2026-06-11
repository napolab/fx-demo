// Fine-grained blob detection: the frame is divided into a fixed grid and
// each occupied tile gets a TIGHT bounding box around its mask pixels — the
// "many small tracking boxes on body parts" look from the reference footage.
// One O(width × height) pass; tiles below minCells are dropped as noise.

import type { RawBlob } from '../../types';

export type GridBlobOptions = { cols: number; rows: number; minCells: number };

type TileAcc = { minX: number; minY: number; maxX: number; maxY: number; sumX: number; sumY: number; count: number };

const range = (length: number): readonly number[] => Array.from({ length }, (_, index) => index);

export const findGridBlobs = (mask: Float32Array, width: number, height: number, threshold: number, options: GridBlobOptions): readonly RawBlob[] => {
  const { cols, rows, minCells } = options;
  const tiles: TileAcc[] = Array.from({ length: cols * rows }, () => ({ minX: width, minY: height, maxX: -1, maxY: -1, sumX: 0, sumY: 0, count: 0 }));

  // HOT PATH: one pass over ~57k mask cells per camera frame; the tile
  // accumulators are local and index-assigned, no per-pixel allocation.
  for (const index of range(width * height)) {
    const value = mask[index];
    if (value === undefined || value < threshold) continue;
    const x = index % width;
    const y = (index - x) / width;
    const tileX = Math.min(cols - 1, Math.floor((x * cols) / width));
    const tileY = Math.min(rows - 1, Math.floor((y * rows) / height));
    const tile = tiles[tileY * cols + tileX];
    if (tile === undefined) continue;
    tile.minX = Math.min(tile.minX, x);
    tile.maxX = Math.max(tile.maxX, x);
    tile.minY = Math.min(tile.minY, y);
    tile.maxY = Math.max(tile.maxY, y);
    tile.sumX = tile.sumX + x;
    tile.sumY = tile.sumY + y;
    tile.count = tile.count + 1;
  }

  return tiles
    .filter((tile) => tile.count >= minCells)
    .map((tile) => ({
      minX: tile.minX / (width - 1),
      minY: tile.minY / (height - 1),
      maxX: tile.maxX / (width - 1),
      maxY: tile.maxY / (height - 1),
      cx: tile.sumX / tile.count / (width - 1),
      cy: tile.sumY / tile.count / (height - 1),
      area: tile.count / (width * height),
    }));
};
