import { describe, expect, test } from 'vitest';

import { buildWires } from '.';

describe('buildWires', () => {
  test('connects points within range with distance-falloff strength', () => {
    const wires = buildWires(
      [
        { x: 0.1, y: 0.1 },
        { x: 0.2, y: 0.1 },
      ],
      { maxDistance: 0.2, maxWires: 8 },
    );
    expect(wires).toHaveLength(1);
    expect(wires[0]?.strength).toBeCloseTo(1 - 0.1 / 0.2, 5);
  });

  test('ignores pairs beyond maxDistance', () => {
    expect(
      buildWires(
        [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        { maxDistance: 0.2, maxWires: 8 },
      ),
    ).toEqual([]);
  });

  test('caps the number of wires, keeping the strongest', () => {
    const cluster = [
      { x: 0.1, y: 0.1 },
      { x: 0.12, y: 0.1 },
      { x: 0.14, y: 0.1 },
      { x: 0.16, y: 0.1 },
    ];
    const wires = buildWires(cluster, { maxDistance: 0.3, maxWires: 2 });
    expect(wires).toHaveLength(2);
    const [first, second] = wires;
    expect(first?.strength ?? 0).toBeGreaterThanOrEqual(second?.strength ?? 0);
  });

  test('is deterministic for identical input', () => {
    const points = [
      { x: 0.3, y: 0.4 },
      { x: 0.35, y: 0.45 },
      { x: 0.5, y: 0.5 },
    ];
    const options = { maxDistance: 0.25, maxWires: 16 };
    expect(buildWires(points, options)).toEqual(buildWires(points, options));
  });
});
