import { describe, expect, test } from 'vitest';

import { buildBreakStream } from '.';

const base = {
  brokenBytes: 0,
  glitchStart: 0,
  glitchEnd: 100,
  seed: 1,
  blocksX: 16,
  blocksY: 8,
};

const countAt = (stream: Float32Array, index: number): number => stream[index * 4] ?? 0;

describe('buildBreakStream', () => {
  test('emits one vec4 per block', () => {
    expect(buildBreakStream(base)).toHaveLength(16 * 8 * 4);
  });

  test('zero broken bytes leaves the stream untouched', () => {
    for (const value of buildBreakStream(base)) {
      expect(value).toBe(0);
    }
  });

  test('is deterministic for the same seed and differs across seeds', () => {
    const input = { ...base, brokenBytes: 64 };
    expect(Array.from(buildBreakStream(input))).toEqual(Array.from(buildBreakStream(input)));
    expect(Array.from(buildBreakStream(input))).not.toEqual(Array.from(buildBreakStream({ ...input, seed: 2 })));
  });

  test('break counts accumulate monotonically along the stream', () => {
    const stream = buildBreakStream({ ...base, brokenBytes: 32 });
    for (const index of Array.from({ length: 16 * 8 - 1 }, (_, i) => i)) {
      expect(countAt(stream, index + 1)).toBeGreaterThanOrEqual(countAt(stream, index));
    }
  });

  test('the last block has seen every break', () => {
    const stream = buildBreakStream({ ...base, brokenBytes: 50 });
    expect(countAt(stream, 16 * 8 - 1)).toBe(50);
  });

  test('start/end window confines the breaks', () => {
    const stream = buildBreakStream({ ...base, brokenBytes: 40, glitchStart: 50, glitchEnd: 100 });
    const firstHalfEnd = Math.floor(0.5 * 16 * 8) - 1;
    expect(countAt(stream, firstHalfEnd)).toBe(0);
    expect(countAt(stream, 16 * 8 - 1)).toBe(40);
  });

  test('DC drift accumulates as a walk once breaks appear', () => {
    const stream = buildBreakStream({ ...base, brokenBytes: 200 });
    const last = 16 * 8 - 1;
    const magnitude = Math.abs(stream[last * 4 + 1] ?? 0) + Math.abs(stream[last * 4 + 2] ?? 0) + Math.abs(stream[last * 4 + 3] ?? 0);
    expect(magnitude).toBeGreaterThan(0);
  });
});
