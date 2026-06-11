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

// Landmark clusters under-cover the real silhouette: face landmarks stop at
// the eyes/mouth (no forehead, hair or chin), hand landmarks at the knuckle
// line. Expand each raw landmark box around its center, with an upward bias
// for the face (the crown sits well above the eye line). Multipliers apply
// to the raw half-extent per direction.
type PartExpand = { x: number; up: number; down: number };
const PART_EXPAND: Record<BodyPart, PartExpand> = {
  // Face covers the whole head INCLUDING hair — the upward reach is much
  // larger than the eye-to-mouth landmark span suggests.
  face: { x: 2.6, up: 4.8, down: 1.9 },
  hand_L: { x: 2, up: 2, down: 2 },
  hand_R: { x: 2, up: 2, down: 2 },
  arm_L: { x: 1.3, up: 1.3, down: 1.3 },
  arm_R: { x: 1.3, up: 1.3, down: 1.3 },
  torso: { x: 1.15, up: 1.15, down: 1.1 },
  leg_L: { x: 1.25, up: 1.05, down: 1.15 },
  leg_R: { x: 1.25, up: 1.05, down: 1.15 },
};

// Nearly-collinear clusters (a flat hand, a straight arm) collapse the raw
// extent; guarantee a minimum visible half-size in normalized UV.
const MIN_HALF_X = 0.02;
const MIN_HALF_Y = 0.02;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const boxFor = (part: BodyPart, points: readonly PoseLandmark[], options: PartBoxOptions): PartBox => {
  const rawMinX = Math.min(...points.map((point) => point.x));
  const rawMaxX = Math.max(...points.map((point) => point.x));
  const rawMinY = Math.min(...points.map((point) => point.y));
  const rawMaxY = Math.max(...points.map((point) => point.y));
  const centerX = (rawMinX + rawMaxX) / 2;
  const centerY = (rawMinY + rawMaxY) / 2;
  const expand = PART_EXPAND[part];
  const halfX = Math.max(((rawMaxX - rawMinX) / 2) * expand.x, MIN_HALF_X);
  const halfUp = Math.max(((rawMaxY - rawMinY) / 2) * expand.up, MIN_HALF_Y);
  const halfDown = Math.max(((rawMaxY - rawMinY) / 2) * expand.down, MIN_HALF_Y);

  const minX = clamp01(centerX - halfX - options.paddingX);
  const maxX = clamp01(centerX + halfX + options.paddingX);
  const minY = clamp01(centerY - halfUp - options.paddingY);
  const maxY = clamp01(centerY + halfDown + options.paddingY);
  return { part, minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
};

export const buildPartBoxes = (landmarks: readonly PoseLandmark[], options: PartBoxOptions): readonly PartBox[] =>
  PARTS.flatMap((part) => {
    const points = PART_LANDMARKS[part].map((index) => landmarks[index]).filter((landmark): landmark is PoseLandmark => landmark !== undefined && landmark.visibility >= options.minVisibility);
    if (points.length < MIN_VISIBLE_POINTS) return [];
    return [boxFor(part, points, options)];
  });
