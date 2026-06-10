import { describe, expect, test } from 'vitest';

import type { Point } from '../types';
import { contentToScreen, coverScale } from '.';

describe('coverScale', () => {
  test('wider viewport than content crops vertically', () => {
    // content 16:9 ≈ 1.778, viewport 2:1
    const scale = coverScale(16 / 9, 2);
    expect(scale.x).toBe(1);
    expect(scale.y).toBeCloseTo(16 / 9 / 2, 5);
  });

  test('narrower viewport than content crops horizontally', () => {
    const scale = coverScale(16 / 9, 1);
    expect(scale.x).toBeCloseTo(1 / (16 / 9), 5);
    expect(scale.y).toBe(1);
  });

  test('matching aspects map 1:1', () => {
    const scale = coverScale(16 / 9, 16 / 9);
    expect(scale).toEqual({ x: 1, y: 1 });
  });
});

describe('contentToScreen', () => {
  test('center stays at center', () => {
    const scale = coverScale(16 / 9, 1);
    expect(contentToScreen({ x: 0.5, y: 0.5 }, scale)).toEqual({ x: 0.5, y: 0.5 });
  });

  test('round-trips against the shader-side forward mapping', () => {
    const scale = coverScale(16 / 9, 2.4);
    const content: Point = { x: 0.3, y: 0.7 };
    const screen = contentToScreen(content, scale);
    // shader does: contentUv = (screenUv - 0.5) * scale + 0.5
    expect((screen.x - 0.5) * scale.x + 0.5).toBeCloseTo(content.x, 6);
    expect((screen.y - 0.5) * scale.y + 0.5).toBeCloseTo(content.y, 6);
  });
});
