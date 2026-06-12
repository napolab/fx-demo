// Pose only tracks the wrist + finger-base knuckles, so the hand part box stops
// at the knuckle line. To cover the fingers too, grow each hand box around its
// centre. Pure → unit-tested. Shared by trace-stage (HUD reach) and
// bounding-mask (mask coverage) so the finger reach stays identical across both
// stages.

import type { BodyPart, PartBox } from '../../types';

// Pose hand boxes stop at the knuckles; grow them so the fingers are covered.
export const HAND_FINGER_SCALE_X = 1.6;
export const HAND_FINGER_SCALE_Y = 1.85;

const HAND_PARTS: ReadonlySet<BodyPart> = new Set(['hand_L', 'hand_R']);

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const grow = (box: PartBox, scaleX: number, scaleY: number): PartBox => {
  const halfX = ((box.maxX - box.minX) / 2) * scaleX;
  const halfY = ((box.maxY - box.minY) / 2) * scaleY;
  const minX = clamp01(box.cx - halfX);
  const maxX = clamp01(box.cx + halfX);
  const minY = clamp01(box.cy - halfY);
  const maxY = clamp01(box.cy + halfY);
  return { part: box.part, minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
};

export const expandHands = (boxes: readonly PartBox[], scaleX: number, scaleY: number): readonly PartBox[] => boxes.map((box) => (HAND_PARTS.has(box.part) ? grow(box, scaleX, scaleY) : box));
