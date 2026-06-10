import { describe, expect, test } from 'vitest';

import { fitProcSize } from '.';

describe('fitProcSize', () => {
  test('returns multiples of 8', () => {
    const size = fitProcSize(1379, 773, 2, 8);
    expect(size.width % 8).toBe(0);
    expect(size.height % 8).toBe(0);
  });

  test('blockSize 16 halves the processing resolution vs blockSize 8', () => {
    const fine = fitProcSize(800, 600, 1, 8);
    const coarse = fitProcSize(800, 600, 1, 16);
    // floor-to-block rounding means coarse may be up to 7px less than exactly half
    expect(coarse.width).toBeLessThanOrEqual(fine.width / 2);
    expect(coarse.width).toBeGreaterThan(fine.width / 2 - 8);
    expect(coarse.height).toBeLessThanOrEqual(fine.height / 2);
    expect(coarse.height).toBeGreaterThan(fine.height / 2 - 8);
  });

  test('caps the long edge at 1024', () => {
    const size = fitProcSize(3840, 2160, 2, 8);
    expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(1024);
  });

  test('never collapses below one block', () => {
    const size = fitProcSize(10, 10, 1, 32);
    expect(size.width).toBeGreaterThanOrEqual(8);
    expect(size.height).toBeGreaterThanOrEqual(8);
  });
});
