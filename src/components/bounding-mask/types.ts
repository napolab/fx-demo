// Shared shapes for the bounding-mask stage. Detection types are reused from
// the trace stage (same MediaPipe pose topology); only the masking params and
// the page status live here.

import type { BodyPart } from '../trace-stage/types';

// Box = filled rectangle over each part's bounding box.
// Silhouette = the person mask clipped to those boxes (follows the body).
export type MaskShape = 'box' | 'silhouette';

// No 'no-webgpu' state: the renderer is a plain 2D canvas.
export type Status = 'booting' | 'no-camera' | 'running';

export type MaskParams = {
  // Which body parts are currently masked.
  parts: Record<BodyPart, boolean>;
  shape: MaskShape;
  // User-chosen fill colour as #rrggbb — painted on the canvas, not a token.
  color: string;
  // Fill opacity, 0..1.
  opacity: number;
  // Edge blur in CSS pixels (0 = hard edge).
  feather: number;
  // Box scale around its centre, 1.0..1.5.
  padding: number;
  showLabel: boolean;
};

export const ALL_PARTS: readonly BodyPart[] = ['face', 'hand_L', 'hand_R', 'hip', 'leg_L', 'leg_R'];

// Curated paint colours (content values, deliberately not design tokens).
export const PRESET_COLORS = ['#ff3b3b', '#00d4ff', '#ffd400', '#22c55e', '#f2f2f2'] as const;

export const DEFAULT_PARAMS: MaskParams = {
  parts: { face: true, hand_L: false, hand_R: false, hip: false, leg_L: false, leg_R: false },
  shape: 'box',
  color: '#ff3b3b',
  opacity: 1,
  feather: 0,
  padding: 1,
  showLabel: false,
};
