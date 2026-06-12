import { describe, expect, test } from 'vitest';

import { coverRect } from '.';

describe('coverRect', () => {
  test('fits exactly when the aspect ratios match', () => {
    expect(coverRect(1600, 900, 16 / 9)).toEqual({ x: 0, y: 0, width: 1600, height: 900 });
  });

  test('overflows horizontally for a wider source, centred', () => {
    expect(coverRect(100, 100, 2)).toEqual({ x: -50, y: 0, width: 200, height: 100 });
  });

  test('overflows vertically for a taller source, centred', () => {
    expect(coverRect(200, 100, 1)).toEqual({ x: 0, y: -50, width: 200, height: 200 });
  });

  test('falls back to the canvas rect for a non-positive aspect', () => {
    expect(coverRect(640, 480, 0)).toEqual({ x: 0, y: 0, width: 640, height: 480 });
  });
});
