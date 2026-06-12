import { describe, expect, test } from 'vitest';

import { simplify } from '.';

describe('simplify', () => {
  test('keeps endpoints of a collinear run and drops the middle', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 0.25, y: 0.25 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
    ];
    expect(simplify(line, 0.01)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
  });

  test('preserves a right-angle corner', () => {
    const corner = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0.5 },
      { x: 1, y: 1 },
    ];
    expect(simplify(corner, 0.01)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ]);
  });

  test('returns short inputs unchanged', () => {
    const pair = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    expect(simplify(pair, 0.5)).toEqual(pair);
  });
});
