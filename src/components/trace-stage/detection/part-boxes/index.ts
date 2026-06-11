// Semantic part boxes from MediaPipe Pose landmarks (33-point topology):
// each body part is a fixed landmark group; visible groups get a padded,
// frame-clamped bounding box. Pure — landmarks in, labeled boxes out.

import type { BodyPart, PartBox, PoseLandmark } from '../../types';

export type PartBoxOptions = { minVisibility: number; paddingX: number; paddingY: number };

// MediaPipe Pose landmark indices per part. `_L`/`_R` are the person's own
// left/right (MediaPipe convention). Wrists intentionally appear in both the
// hand and arm groups so the boxes chain visually.
const PART_LANDMARKS: Record<BodyPart, readonly number[]> = {
  face: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  hand_L: [15, 17, 19, 21],
  hand_R: [16, 18, 20, 22],
  arm_L: [11, 13, 15],
  arm_R: [12, 14, 16],
  torso: [11, 12, 23, 24],
  leg_L: [23, 25, 27, 29, 31],
  leg_R: [24, 26, 28, 30, 32],
};

const PARTS: readonly BodyPart[] = ['face', 'hand_L', 'hand_R', 'arm_L', 'arm_R', 'torso', 'leg_L', 'leg_R'];

// A part needs at least this many confidently-visible landmarks to get a box.
const MIN_VISIBLE_POINTS = 2;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const boxFor = (part: BodyPart, points: readonly PoseLandmark[], options: PartBoxOptions): PartBox => {
  const minX = clamp01(Math.min(...points.map((point) => point.x)) - options.paddingX);
  const maxX = clamp01(Math.max(...points.map((point) => point.x)) + options.paddingX);
  const minY = clamp01(Math.min(...points.map((point) => point.y)) - options.paddingY);
  const maxY = clamp01(Math.max(...points.map((point) => point.y)) + options.paddingY);
  return { part, minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
};

export const buildPartBoxes = (landmarks: readonly PoseLandmark[], options: PartBoxOptions): readonly PartBox[] =>
  PARTS.flatMap((part) => {
    const points = PART_LANDMARKS[part].map((index) => landmarks[index]).filter((landmark): landmark is PoseLandmark => landmark !== undefined && landmark.visibility >= options.minVisibility);
    if (points.length < MIN_VISIBLE_POINTS) return [];
    return [boxFor(part, points, options)];
  });
