// Plexus wire construction: connect every pair of feature points closer than
// maxDistance, strength falling off linearly, capped to the strongest maxWires.
// Pure and deterministic — no randomness, so frames are stable for testing.

import type { Point, Wire } from '../../types';

export type WireOptions = { maxDistance: number; maxWires: number };

export const buildWires = (points: readonly Point[], options: WireOptions): readonly Wire[] =>
  points
    .flatMap((a, indexA) =>
      points.slice(indexA + 1).map((b) => {
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        return { a, b, strength: 1 - distance / options.maxDistance };
      }),
    )
    .filter((wire) => wire.strength > 0)
    .sort((left, right) => right.strength - left.strength)
    .slice(0, options.maxWires);
