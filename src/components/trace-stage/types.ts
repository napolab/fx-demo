// Shared shapes for the trace stage: detection pure functions, GPU engine,
// p5 overlay and React glue all speak in these types.

// Position in normalized content UV space (0..1, y down, 16:9 camera frame).
export type Point = { x: number; y: number };

// Closed polyline traced around a silhouette (first point NOT repeated at the end).
export type Contour = readonly Point[];

// One MediaPipe pose landmark in normalized UV with its visibility score.
export type PoseLandmark = { x: number; y: number; visibility: number };

// Semantic body part tracked as its own HUD box. `_L`/`_R` follow MediaPipe's
// convention (the person's own left/right).
export type BodyPart = 'face' | 'hand_L' | 'hand_R' | 'hip' | 'leg_L' | 'leg_R';

// Labeled tracking box around one body part's landmarks (normalized UV).
export type PartBox = {
  part: BodyPart;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  // Box center in normalized UV.
  cx: number;
  cy: number;
};

// A plexus line between two detected points; strength 0..1 drives opacity.
export type Wire = { a: Point; b: Point; strength: number };

// Anisotropic cover-fit scale between content (camera) and viewport aspects.
export type CoverScale = { x: number; y: number };

export type TraceFrameInput = {
  dtSeconds: number;
  timeSeconds: number;
  // 1 when the source texture carries live video (webcam or file), 0 before.
  sourceReady: number;
  coverScale: CoverScale;
};

// Everything the p5 overlay needs to draw one frame.
export type OverlayFrame = {
  contours: readonly Contour[];
  // Oldest → newest snapshots of past contours, drawn with rising opacity.
  history: readonly (readonly Contour[])[];
  parts: readonly PartBox[];
  wires: readonly Wire[];
  coverScale: CoverScale;
  // When true, the face part box is filled with opaque sumi ink (censor),
  // drawn under the HUD frame so the box + label still frame the masked face.
  maskFace: boolean;
};

export type TraceStatus = 'booting' | 'running' | 'no-webgpu' | 'no-camera' | 'model-error' | 'lost';
