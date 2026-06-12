import { describe, expect, it } from 'vitest';

import type { PartBox } from '../../types';

import { expandHands } from './index';

const box = (part: PartBox['part'], minX: number, minY: number, maxX: number, maxY: number): PartBox => ({
  part,
  minX,
  minY,
  maxX,
  maxY,
  cx: (minX + maxX) / 2,
  cy: (minY + maxY) / 2,
});

describe('expandHands', () => {
  it('scales hand boxes around their centre', () => {
    const [hand] = expandHands([box('hand_L', 0.4, 0.4, 0.6, 0.6)], 2, 2);
    expect(hand?.minX).toBeCloseTo(0.3, 10);
    expect(hand?.maxX).toBeCloseTo(0.7, 10);
    expect(hand?.minY).toBeCloseTo(0.3, 10);
    expect(hand?.maxY).toBeCloseTo(0.7, 10);
    expect(hand?.cx).toBeCloseTo(0.5, 10);
  });

  it('grows both hands', () => {
    const result = expandHands([box('hand_R', 0.4, 0.4, 0.6, 0.6)], 1.5, 1.5);
    expect(result[0]?.minX).toBeCloseTo(0.35, 10);
  });

  it('leaves non-hand boxes untouched', () => {
    const face = box('face', 0.4, 0.4, 0.6, 0.6);
    const [result] = expandHands([face], 2, 2);
    expect(result).toEqual(face);
  });

  it('clamps to the frame edges', () => {
    const [hand] = expandHands([box('hand_L', 0, 0, 0.3, 0.3)], 4, 4);
    expect(hand?.minX).toBe(0);
    expect(hand?.minY).toBe(0);
  });
});
