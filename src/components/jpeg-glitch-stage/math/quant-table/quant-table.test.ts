import { describe, expect, test } from 'vitest';

import { BASE_CHROMA_TABLE, BASE_LUMA_TABLE, corruptQuantTables, scaledQuantTables } from '.';

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

describe('corruptQuantTables', () => {
  const base = (): Float32Array<ArrayBuffer> => scaledQuantTables(50);

  test('count 0 returns the tables unchanged', () => {
    expect(Array.from(corruptQuantTables(base(), 0, 1024))).toEqual(Array.from(base()));
  });

  test('is deterministic for the same seed', () => {
    expect(Array.from(corruptQuantTables(base(), 16, 777))).toEqual(Array.from(corruptQuantTables(base(), 16, 777)));
  });

  test('different seeds corrupt differently', () => {
    expect(Array.from(corruptQuantTables(base(), 16, 1))).not.toEqual(Array.from(corruptQuantTables(base(), 16, 2)));
  });

  test('changes at most count entries per table (count * 2 total)', () => {
    const original = base();
    const corrupted = corruptQuantTables(original, 8, 42);
    const changed = Array.from(corrupted).filter((value, index) => value !== original[index]);
    expect(changed.length).toBeLessThanOrEqual(16);
    expect(changed.length).toBeGreaterThan(0);
  });

  test('corrupted entries stay within (0, 1]', () => {
    for (const value of corruptQuantTables(base(), 64, 9)) {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  test('does not mutate the input tables', () => {
    const original = base();
    const snapshot = Array.from(original);
    corruptQuantTables(original, 32, 5);
    expect(Array.from(original)).toEqual(snapshot);
  });
});
