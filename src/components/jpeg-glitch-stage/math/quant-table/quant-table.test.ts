import { describe, expect, test } from 'vitest';

import { BASE_CHROMA_TABLE, BASE_LUMA_TABLE, corruptTableHalf, overrideTableEntry, scaledQuantTables } from '.';

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

describe('corruptTableHalf', () => {
  const base = (): Float32Array<ArrayBuffer> => scaledQuantTables(50);

  test('count 0 returns the tables unchanged', () => {
    expect(Array.from(corruptTableHalf(base(), 'luma', 0, 255, 1024))).toEqual(Array.from(base()));
  });

  test('is deterministic for the same seed and differs across seeds', () => {
    expect(Array.from(corruptTableHalf(base(), 'luma', 16, 255, 777))).toEqual(Array.from(corruptTableHalf(base(), 'luma', 16, 255, 777)));
    expect(Array.from(corruptTableHalf(base(), 'luma', 16, 255, 1))).not.toEqual(Array.from(corruptTableHalf(base(), 'luma', 16, 255, 2)));
  });

  test('luma corruption never touches the chroma half', () => {
    const original = base();
    const corrupted = corruptTableHalf(original, 'luma', 64, 255, 42);
    for (const [index, value] of Array.from(corrupted).entries()) {
      if (index < 64) continue;
      expect(value).toBe(original[index]);
    }
  });

  test('chroma corruption never touches the luma half', () => {
    const original = base();
    const corrupted = corruptTableHalf(original, 'chroma', 64, 255, 42);
    for (const [index, value] of Array.from(corrupted).entries()) {
      if (index >= 64) continue;
      expect(value).toBe(original[index]);
    }
  });

  test('changes at most count entries', () => {
    const original = base();
    const corrupted = corruptTableHalf(original, 'chroma', 8, 255, 42);
    const changed = Array.from(corrupted).filter((value, index) => value !== original[index]);
    expect(changed.length).toBeLessThanOrEqual(8);
    expect(changed.length).toBeGreaterThan(0);
  });

  test('replacements stay within (0, maxRandom / 255]', () => {
    const original = base();
    const corrupted = corruptTableHalf(original, 'luma', 64, 8, 42);
    for (const [index, value] of Array.from(corrupted).entries()) {
      if (value === original[index]) continue;
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(8 / 255 + 1e-6);
    }
  });

  test('does not mutate the input tables', () => {
    const original = base();
    const snapshot = Array.from(original);
    corruptTableHalf(original, 'luma', 32, 255, 5);
    expect(Array.from(original)).toEqual(snapshot);
  });
});

describe('overrideTableEntry', () => {
  const base = (): Float32Array<ArrayBuffer> => scaledQuantTables(50);

  test('value 0 leaves the tables unchanged', () => {
    expect(Array.from(overrideTableEntry(base(), 'luma', 5, 0))).toEqual(Array.from(base()));
  });

  test('writes only the targeted half and slot', () => {
    const luma = overrideTableEntry(base(), 'luma', 3, 200);
    const chroma = overrideTableEntry(base(), 'chroma', 3, 200);
    expect(luma[2]).toBeCloseTo(200 / 255, 6);
    expect(luma[66]).toBeCloseTo(base()[66] ?? 0, 6);
    expect(chroma[66]).toBeCloseTo(200 / 255, 6);
    expect(chroma[2]).toBeCloseTo(base()[2] ?? 0, 6);
  });

  test('clamps position into 1..64', () => {
    expect(overrideTableEntry(base(), 'luma', 0, 100)[0]).toBeCloseTo(100 / 255, 6);
    expect(overrideTableEntry(base(), 'luma', 99, 100)[63]).toBeCloseTo(100 / 255, 6);
  });

  test('does not mutate the input tables', () => {
    const original = base();
    const snapshot = Array.from(original);
    overrideTableEntry(original, 'chroma', 7, 50);
    expect(Array.from(original)).toEqual(snapshot);
  });
});
