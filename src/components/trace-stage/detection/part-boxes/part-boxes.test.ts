import { describe, expect, test } from 'vitest';

import type { PoseLandmark } from '../../types';
import { buildPartBoxes } from '.';

const OPTIONS = { minVisibility: 0.5, paddingX: 0.02, paddingY: 0.02 };

// 33 landmarks, all visible, clustered mid-frame by default.
const makeLandmarks = (): PoseLandmark[] => Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));

describe('buildPartBoxes', () => {
  test('a fully visible pose yields all 8 part boxes', () => {
    const boxes = buildPartBoxes(makeLandmarks(), OPTIONS);
    expect(boxes.map((box) => box.part).sort()).toEqual(['arm_L', 'arm_R', 'face', 'hand_L', 'hand_R', 'leg_L', 'leg_R', 'torso'].sort());
  });

  test('the face box wraps the face landmarks plus padding', () => {
    const landmarks = makeLandmarks();
    const setAt = (index: number, x: number, y: number): void => {
      landmarks[index] = { x, y, visibility: 1 };
    };
    // Spread the face cluster (indices 0..10): ears at the sides, nose low.
    for (const index of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      setAt(index, 0.5, 0.2);
    }
    setAt(7, 0.4, 0.18);
    setAt(8, 0.6, 0.18);
    setAt(0, 0.5, 0.24);
    const face = buildPartBoxes(landmarks, OPTIONS).find((box) => box.part === 'face');
    expect(face?.minX).toBeCloseTo(0.4 - 0.02, 5);
    expect(face?.maxX).toBeCloseTo(0.6 + 0.02, 5);
    expect(face?.maxY).toBeCloseTo(0.24 + 0.02, 5);
    expect(face?.cx).toBeCloseTo(0.5, 5);
  });

  test('parts whose landmarks are below minVisibility are dropped', () => {
    const landmarks = makeLandmarks();
    for (const index of [15, 17, 19, 21]) {
      landmarks[index] = { x: 0.3, y: 0.6, visibility: 0.1 };
    }
    const parts = buildPartBoxes(landmarks, OPTIONS).map((box) => box.part);
    expect(parts).not.toContain('hand_L');
    expect(parts).toContain('hand_R');
  });

  test('boxes are clamped into the 0..1 frame', () => {
    const landmarks = makeLandmarks();
    for (const index of [16, 18, 20, 22]) {
      landmarks[index] = { x: 0.995, y: 0.005, visibility: 1 };
    }
    const hand = buildPartBoxes(landmarks, OPTIONS).find((box) => box.part === 'hand_R');
    expect(hand?.maxX).toBeLessThanOrEqual(1);
    expect(hand?.minY).toBeGreaterThanOrEqual(0);
  });

  test('an empty landmark list yields no boxes', () => {
    expect(buildPartBoxes([], OPTIONS)).toEqual([]);
  });
});
