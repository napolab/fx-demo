import { describe, expect, test } from 'vitest';

import { applyQTCOverride, BASE_CHROMA_TABLE, BASE_LUMA_TABLE, corruptQuantTables, scaledQuantTables } from '.';

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
    expect(Array.from(corruptQuantTables(base(), 0, 255, 1024))).toEqual(Array.from(base()));
  });

  test('is deterministic for the same seed', () => {
    expect(Array.from(corruptQuantTables(base(), 16, 255, 777))).toEqual(Array.from(corruptQuantTables(base(), 16, 255, 777)));
  });

  test('different seeds corrupt differently', () => {
    expect(Array.from(corruptQuantTables(base(), 16, 255, 1))).not.toEqual(Array.from(corruptQuantTables(base(), 16, 255, 2)));
  });

  test('changes at most count entries per table (count * 2 total)', () => {
    const original = base();
    const corrupted = corruptQuantTables(original, 8, 255, 42);
    const changed = Array.from(corrupted).filter((value, index) => value !== original[index]);
    expect(changed.length).toBeLessThanOrEqual(16);
    expect(changed.length).toBeGreaterThan(0);
  });

  test('corrupted entries stay within (0, 1]', () => {
    for (const value of corruptQuantTables(base(), 64, 255, 9)) {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  test('does not mutate the input tables', () => {
    const original = base();
    const snapshot = Array.from(original);
    corruptQuantTables(original, 32, 255, 5);
    expect(Array.from(original)).toEqual(snapshot);
  });
});

describe('corruptQuantTables max random value', () => {
  const base = (): Float32Array<ArrayBuffer> => scaledQuantTables(50);

  test('replacements never exceed maxRandom / 255', () => {
    const original = base();
    const corrupted = corruptQuantTables(original, 64, 8, 42);
    for (const [index, value] of Array.from(corrupted).entries()) {
      if (value === original[index]) continue;
      expect(value).toBeLessThanOrEqual(8 / 255 + 1e-6);
      expect(value).toBeGreaterThan(0);
    }
  });
});

describe('applyQTCOverride', () => {
  const base = (): Float32Array<ArrayBuffer> => scaledQuantTables(50);

  test('value 0 leaves the tables unchanged', () => {
    expect(Array.from(applyQTCOverride(base(), 5, 0))).toEqual(Array.from(base()));
  });

  test('writes the value at the position in both luma and chroma tables', () => {
    const overridden = applyQTCOverride(base(), 3, 200);
    expect(overridden[2]).toBeCloseTo(200 / 255, 6);
    expect(overridden[66]).toBeCloseTo(200 / 255, 6);
  });

  test('leaves every other entry untouched', () => {
    const original = base();
    const overridden = applyQTCOverride(original, 10, 128);
    const changed = Array.from(overridden).filter((value, index) => value !== original[index]);
    expect(changed.length).toBeLessThanOrEqual(2);
  });

  test('clamps position into 1..64', () => {
    const low = applyQTCOverride(base(), 0, 100);
    const high = applyQTCOverride(base(), 99, 100);
    expect(low[0]).toBeCloseTo(100 / 255, 6);
    expect(high[63]).toBeCloseTo(100 / 255, 6);
  });

  test('does not mutate the input tables', () => {
    const original = base();
    const snapshot = Array.from(original);
    applyQTCOverride(original, 7, 50);
    expect(Array.from(original)).toEqual(snapshot);
  });
});
