import { describe, expect, test } from 'vitest';

import { BASE_CHROMA_TABLE, BASE_LUMA_TABLE, scaledQuantTables } from '.';

describe('scaledQuantTables', () => {
  test('packs luma then chroma, 128 entries total', () => {
    const tables = scaledQuantTables(50);
    expect(tables).toHaveLength(128);
  });

  test('quality 50 reproduces the base tables (in 0..1 units)', () => {
    const tables = scaledQuantTables(50);
    expect(tables[0]).toBeCloseTo((BASE_LUMA_TABLE[0] ?? 0) / 255, 6);
    expect(tables[64]).toBeCloseTo((BASE_CHROMA_TABLE[0] ?? 0) / 255, 6);
  });

  test('quality 100 collapses every entry to the minimum step', () => {
    const tables = scaledQuantTables(100);
    for (const value of tables) {
      expect(value).toBeCloseTo(1 / 255, 6);
    }
  });

  test('quality 1 saturates entries at the maximum step', () => {
    const tables = scaledQuantTables(1);
    expect(tables[0]).toBeCloseTo(255 / 255, 6);
  });

  test('lower quality never decreases any entry', () => {
    const high = scaledQuantTables(80);
    const low = scaledQuantTables(10);
    for (const [index, value] of low.entries()) {
      expect(value).toBeGreaterThanOrEqual((high[index] ?? 0) - 1e-9);
    }
  });

  test('quality is clamped into 1..100', () => {
    expect(Array.from(scaledQuantTables(0))).toEqual(Array.from(scaledQuantTables(1)));
    expect(Array.from(scaledQuantTables(120))).toEqual(Array.from(scaledQuantTables(100)));
  });
});
