import { describe, expect, test } from 'vitest';

import { hash01, hashCombine, hashU32 } from '.';

describe('hashU32', () => {
  test('is deterministic', () => {
    expect(hashU32(1234)).toBe(hashU32(1234));
  });

  test('different inputs produce different outputs', () => {
    expect(hashU32(1)).not.toBe(hashU32(2));
  });

  test('stays within u32 range', () => {
    for (const input of [0, 1, 0xffffffff, 123456789]) {
      const output = hashU32(input);
      expect(output).toBeGreaterThanOrEqual(0);
      expect(output).toBeLessThanOrEqual(0xffffffff);
      expect(Number.isInteger(output)).toBe(true);
    }
  });
});

describe('hashCombine', () => {
  test('order matters', () => {
    expect(hashCombine(1, 2)).not.toBe(hashCombine(2, 1));
  });
});

describe('hash01', () => {
  test('maps into [0, 1)', () => {
    for (const input of [0, 7, 4096, 99999]) {
      const value = hash01(input);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
