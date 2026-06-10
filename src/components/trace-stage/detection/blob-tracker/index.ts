// Connected-component blob detection plus frame-to-frame identity tracking.
// findBlobs: BFS flood fill over the thresholded mask (queue-based, no recursion).
// trackBlobs: greedy nearest-centroid matching against the previous frame.

import type { Point, RawBlob, TrackedBlob } from '../../types';

const MAX_MATCH_DISTANCE = 0.15;

const range = (length: number): readonly number[] => Array.from({ length }, (_, index) => index);

export const findBlobs = (mask: Float32Array, width: number, height: number, threshold: number, minAreaCells: number): readonly RawBlob[] => {
  const visited = new Uint8Array(width * height);
  const blobs: RawBlob[] = [];
  const isInside = (index: number): boolean => {
    const value = mask[index];
    return value !== undefined && value >= threshold;
  };

  for (const startIndex of range(width * height)) {
    if (visited[startIndex] === 1 || !isInside(startIndex)) continue;
    const queue: number[] = [startIndex];
    visited[startIndex] = 1;
    const acc = { minX: width, minY: height, maxX: 0, maxY: 0, sumX: 0, sumY: 0, count: 0 };
    // HOT PATH: flood fill runs every camera frame over ~57k cells. Local
    // index-assigned buffers stand in for .push(), which oxlint bans; the
    // mutation never escapes this function.
    while (queue.length > 0) {
      const index = queue.pop();
      if (index === undefined) continue;
      const x = index % width;
      const y = Math.floor(index / width);
      acc.minX = Math.min(acc.minX, x);
      acc.maxX = Math.max(acc.maxX, x);
      acc.minY = Math.min(acc.minY, y);
      acc.maxY = Math.max(acc.maxY, y);
      acc.sumX = acc.sumX + x;
      acc.sumY = acc.sumY + y;
      acc.count = acc.count + 1;
      const neighbors = [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < height - 1 ? index + width : -1];
      for (const neighbor of neighbors) {
        if (neighbor < 0 || visited[neighbor] === 1 || !isInside(neighbor)) continue;
        visited[neighbor] = 1;
        queue[queue.length] = neighbor;
      }
    }
    if (acc.count < minAreaCells) continue;
    blobs[blobs.length] = {
      minX: acc.minX / (width - 1),
      minY: acc.minY / (height - 1),
      maxX: acc.maxX / (width - 1),
      maxY: acc.maxY / (height - 1),
      cx: acc.sumX / acc.count / (width - 1),
      cy: acc.sumY / acc.count / (height - 1),
      area: acc.count / (width * height),
    };
  }
  return blobs;
};

const distanceBetween = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

export const trackBlobs = (previous: readonly TrackedBlob[], current: readonly RawBlob[], nextId: number): { blobs: readonly TrackedBlob[]; nextId: number } => {
  const pairs = current
    .flatMap((blob, currentIndex) =>
      previous.map((prev) => ({
        currentIndex,
        prevId: prev.id,
        distance: distanceBetween({ x: blob.cx, y: blob.cy }, { x: prev.cx, y: prev.cy }),
      })),
    )
    .filter((pair) => pair.distance <= MAX_MATCH_DISTANCE)
    .sort((a, b) => a.distance - b.distance);

  const assignedCurrent = new Set<number>();
  const assignedPrev = new Set<number>();
  const matches = new Map<number, number>();
  for (const pair of pairs) {
    if (assignedCurrent.has(pair.currentIndex) || assignedPrev.has(pair.prevId)) continue;
    assignedCurrent.add(pair.currentIndex);
    assignedPrev.add(pair.prevId);
    matches.set(pair.currentIndex, pair.prevId);
  }

  const counter = { value: nextId };
  const blobs = current.map((blob, index) => {
    const matchedId = matches.get(index);
    if (matchedId !== undefined) return { ...blob, id: matchedId };
    const id = counter.value;
    counter.value = counter.value + 1;
    return { ...blob, id };
  });
  return { blobs, nextId: counter.value };
};
