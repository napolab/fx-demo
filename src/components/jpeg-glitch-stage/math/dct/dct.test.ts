import { describe, expect, test } from 'vitest';

import { forwardDCT8x8, inverseDCT8x8 } from '.';

const randomBlock = (): number[] => Array.from({ length: 64 }, (_, index) => Math.sin(index * 12.9898) * 0.5 + 0.5);

describe('forwardDCT8x8 / inverseDCT8x8', () => {
  test('roundtrip reproduces the input block', () => {
    const block = randomBlock();
    const roundtrip = inverseDCT8x8(forwardDCT8x8(block));
    for (const [index, value] of block.entries()) {
      expect(roundtrip[index]).toBeCloseTo(value, 9);
    }
  });

  test('constant block concentrates all energy in DC', () => {
    const block = Array.from({ length: 64 }, () => 0.5);
    const coeffs = forwardDCT8x8(block);
    expect(coeffs[0]).toBeCloseTo(8 * 0.5, 9);
    for (const [index, value] of coeffs.entries()) {
      if (index === 0) continue;
      expect(value).toBeCloseTo(0, 9);
    }
  });

  test('transform preserves energy (orthonormal)', () => {
    const block = randomBlock();
    const coeffs = forwardDCT8x8(block);
    const energy = (values: readonly number[]): number => values.reduce((sum, v) => sum + v * v, 0);
    expect(energy(coeffs)).toBeCloseTo(energy(block), 9);
  });
});
