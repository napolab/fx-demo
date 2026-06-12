import { describe, expect, test } from 'vitest';

import type { PoseLandmark } from '../../types';
import { buildPartBoxes } from '.';

const OPTIONS = { minVisibility: 0.5, paddingX: 0.02, paddingY: 0.02 };

// 33 landmarks, all visible, clustered mid-frame by default.
const makeLandmarks = (): PoseLandmark[] => Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));

describe('buildPartBoxes', () => {
  test('a fully visible pose yields all 6 part boxes', () => {
    const boxes = buildPartBoxes(makeLandmarks(), OPTIONS);
    expect(boxes.map((box) => box.part).sort()).toEqual(['face', 'hand_L', 'hand_R', 'hip', 'leg_L', 'leg_R'].sort());
  });

  test('the face box expands beyond the landmark span, biased upward for the crown', () => {
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
    // Wider than the raw 0.4..0.6 landmark span (face landmarks stop at the ears).
    expect(face?.minX ?? 1).toBeLessThan(0.4);
    expect(face?.maxX ?? 0).toBeGreaterThan(0.6);
    expect((face?.minX ?? 0) + (face?.maxX ?? 0)).toBeCloseTo(1, 5);
    // The raw y center is 0.21; the box reaches further up (forehead/hair)
    // than down (chin).
    expect(0.21 - (face?.minY ?? 0)).toBeGreaterThan((face?.maxY ?? 0) - 0.21);
  });

  test('a degenerate landmark cluster still yields a minimum-size box', () => {
    // All hand_R landmarks on the exact same point (flat hand seen edge-on).
    const landmarks = makeLandmarks();
    for (const index of [16, 18, 20, 22]) {
      landmarks[index] = { x: 0.7, y: 0.6, visibility: 1 };
    }
    const hand = buildPartBoxes(landmarks, OPTIONS).find((box) => box.part === 'hand_R');
    expect((hand?.maxX ?? 0) - (hand?.minX ?? 0)).toBeGreaterThanOrEqual(0.04);
    expect((hand?.maxY ?? 0) - (hand?.minY ?? 0)).toBeGreaterThanOrEqual(0.04);
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
