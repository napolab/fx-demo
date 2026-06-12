export type PolyTraceStatus = 'booting' | 'no-webgpu' | 'no-camera' | 'running';

// AE effect-control equivalents, all live-tweakable from the panel.
export type PolyTraceParams = {
  pointCount: number;
  // Noise-engine displacement amplitude (0 = pristine lattice).
  displaceAmount: number;
  // Noise evolution speed (0 = mesh completely still, like Polytrace's default).
  evolution: number;
  wireframe: boolean;
  strokeWeight: number;
  fillEnabled: boolean;
};
