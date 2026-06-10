// Shared types for the fluid stage: pure interaction logic, GPU engine and React glue
// all speak in these shapes.

export type SplatInput = {
  // Position in normalized UV space (0..1, y down).
  x: number;
  y: number;
  // Velocity in UV units per second.
  vx: number;
  vy: number;
  // Gaussian radius in UV units (relative to the short edge).
  radius: number;
  // Force scale applied to the velocity field.
  strength: number;
  // Dye color injected along the stroke (linear RGB, 0..1).
  dyeR: number;
  dyeG: number;
  dyeB: number;
  // How much dye the splat deposits.
  dyeAmount: number;
  // Outward push from the splat center — the "ink drop hitting water" bloom.
  radialImpulse: number;
};

export type GradeMode = 0 | 1 | 2;

export type FrameInput = {
  dtSeconds: number;
  timeSeconds: number;
  hueShift: number;
  gradeMode: GradeMode;
  // 1 when the webcam texture carries live video, 0 for the procedural fallback.
  cameraReady: number;
  splats: readonly SplatInput[];
};

export type FluidStatus = 'booting' | 'running' | 'procedural' | 'no-webgpu' | 'lost';
