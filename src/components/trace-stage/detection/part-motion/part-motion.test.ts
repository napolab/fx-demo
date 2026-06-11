import { describe, expect, test } from 'vitest';

import type { PartBox } from '../../types';
import { updatePartGlow } from '.';

const OPTIONS = { speedScale: 2, decayPerSecond: 2.8, maxIntensity: 1 };

const boxAt = (part: PartBox['part'], cx: number, cy: number): PartBox => ({ part, minX: cx - 0.05, minY: cy - 0.05, maxX: cx + 0.05, maxY: cy + 0.05, cx, cy });

describe('updatePartGlow', () => {
  test('a part seen for the first time starts dark', () => {
    const glow = updatePartGlow([], [boxAt('hand_L', 0.5, 0.5)], 1 / 60, OPTIONS);
    expect(glow).toHaveLength(1);
    expect(glow[0]?.intensity).toBe(0);
  });

  test('a fast-moving part lights up, capped at maxIntensity', () => {
    const first = updatePartGlow([], [boxAt('hand_L', 0.5, 0.5)], 1 / 60, OPTIONS);
    const second = updatePartGlow(first, [boxAt('hand_L', 0.6, 0.5)], 0.1, OPTIONS);
    // speed = 0.1 / 0.1 = 1 uv/s → target = min(1, 1 * 2) = 1
    expect(second[0]?.intensity).toBe(1);
  });

  test('a stationary part decays exponentially', () => {
    const lit = [{ part: 'face' as const, cx: 0.5, cy: 0.2, intensity: 1 }];
    const next = updatePartGlow(lit, [boxAt('face', 0.5, 0.2)], 0.5, OPTIONS);
    expect(next[0]?.intensity).toBeCloseTo(Math.exp(-2.8 * 0.5), 5);
  });

  test('parts that vanished are dropped from the glow state', () => {
    const lit = [{ part: 'face' as const, cx: 0.5, cy: 0.2, intensity: 1 }];
    const next = updatePartGlow(lit, [boxAt('hand_R', 0.7, 0.6)], 1 / 60, OPTIONS);
    expect(next.map((glow) => glow.part)).toEqual(['hand_R']);
  });
});
