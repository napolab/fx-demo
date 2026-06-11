// Velocity-reactive glow state: each part's light intensity rises with its
// movement speed (attack is instant) and falls exponentially when it rests —
// dance dynamics become stage lighting. Pure: previous state + boxes in,
// next state out.

import type { BodyPart, PartBox } from '../../types';

export type PartGlowState = { part: BodyPart; cx: number; cy: number; intensity: number };

export type GlowOptions = {
  // Multiplier from speed (normalized UV per second) to intensity.
  speedScale: number;
  // Exponential decay rate applied while the part rests.
  decayPerSecond: number;
  maxIntensity: number;
};

const MIN_DT_SECONDS = 1e-3;

export const updatePartGlow = (previous: readonly PartGlowState[], parts: readonly PartBox[], dtSeconds: number, options: GlowOptions): readonly PartGlowState[] =>
  parts.map((box) => {
    const prev = previous.find((state) => state.part === box.part);
    if (prev === undefined) return { part: box.part, cx: box.cx, cy: box.cy, intensity: 0 };
    const speed = Math.hypot(box.cx - prev.cx, box.cy - prev.cy) / Math.max(dtSeconds, MIN_DT_SECONDS);
    const target = Math.min(options.maxIntensity, speed * options.speedScale);
    const decayed = prev.intensity * Math.exp(-options.decayPerSecond * dtSeconds);
    return { part: box.part, cx: box.cx, cy: box.cy, intensity: Math.max(target, decayed) };
  });
