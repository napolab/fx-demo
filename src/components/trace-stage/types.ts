// Shared shapes for the trace stage: detection pure functions, GPU engine,
// p5 overlay and React glue all speak in these types.

// Position in normalized content UV space (0..1, y down, 16:9 camera frame).
export type Point = { x: number; y: number };

// Closed polyline traced around a silhouette (first point NOT repeated at the end).
export type Contour = readonly Point[];

// Connected component found in a single mask frame (no identity yet).
export type RawBlob = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  // Centroid in normalized UV.
  cx: number;
  cy: number;
  // Area as a fraction of the full frame (0..1).
  area: number;
};

// Blob with a frame-to-frame stable identity.
export type TrackedBlob = RawBlob & { id: number };

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
  blobs: readonly TrackedBlob[];
  wires: readonly Wire[];
  coverScale: CoverScale;
};

export type TraceStatus = 'booting' | 'running' | 'no-webgpu' | 'no-camera' | 'model-error' | 'lost';
