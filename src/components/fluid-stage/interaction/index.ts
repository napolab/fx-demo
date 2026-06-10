// Pure pointer-interaction logic: accumulates pointer movement between frames and
// converts it into fluid splats. No DOM types — the hook adapts real events.

import { idleFadeWeight, lissajousPointer, pointerDeltaToUVVelocity, sabiPalette, wrap01 } from '../math';
import type { SplatInput } from '../types';

export type PointerSample = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
};

export type CanvasSize = {
  width: number;
  height: number;
};

export type PointerTrack = {
  // Current position in UV space.
  x: number;
  y: number;
  // Movement accumulated since the last drain, in CSS pixels.
  dxPx: number;
  dyPx: number;
  down: boolean;
  justPressed: boolean;
};

export type PointerTracks = Readonly<Record<number, PointerTrack>>;

const HOVER_STRENGTH = 0.16;
const HELD_STRENGTH = 0.42;
const HOVER_RADIUS = 0.075;
const HELD_RADIUS = 0.1;
const BURST_RADIUS = 0.12;
const HOVER_DYE = 0.16;
const HELD_DYE = 0.38;
const BURST_DYE = 0.8;
const BURST_RADIAL_IMPULSE = 0.4;
const GOLDEN_RATIO = 0.618_033_988_75;

const toUV = (sample: PointerSample, size: CanvasSize): { x: number; y: number } => ({
  x: sample.offsetX / size.width,
  y: sample.offsetY / size.height,
});

export const trackPointerMove = (tracks: PointerTracks, sample: PointerSample, size: CanvasSize): PointerTracks => {
  const uv = toUV(sample, size);
  const existing = tracks[sample.pointerId];
  if (existing === undefined) {
    return {
      ...tracks,
      [sample.pointerId]: { ...uv, dxPx: 0, dyPx: 0, down: false, justPressed: false },
    };
  }

  return {
    ...tracks,
    [sample.pointerId]: {
      ...existing,
      ...uv,
      dxPx: existing.dxPx + (uv.x - existing.x) * size.width,
      dyPx: existing.dyPx + (uv.y - existing.y) * size.height,
    },
  };
};

export const trackPointerDown = (tracks: PointerTracks, sample: PointerSample, size: CanvasSize): PointerTracks => {
  const uv = toUV(sample, size);

  return {
    ...tracks,
    [sample.pointerId]: { ...uv, dxPx: 0, dyPx: 0, down: true, justPressed: true },
  };
};

export const releasePointer = (tracks: PointerTracks, pointerId: number): PointerTracks => Object.fromEntries(Object.entries(tracks).filter(([id]) => id !== `${pointerId}`));

export type DrainOptions = {
  dtSeconds: number;
  canvasWidth: number;
  canvasHeight: number;
  // Global hue offset (0..1) so stroke colors slowly cycle over a session.
  hueBase: number;
};

const splatColor = (pointerId: number, hueBase: number): { r: number; g: number; b: number } => sabiPalette(wrap01(hueBase + pointerId * GOLDEN_RATIO));

const trackToSplat = (pointerId: number, track: PointerTrack, options: DrainOptions): SplatInput | undefined => {
  const moved = Math.abs(track.dxPx) + Math.abs(track.dyPx) > 0;
  if (!moved && !track.justPressed) return undefined;
  const velocity = pointerDeltaToUVVelocity({
    dxPx: track.dxPx,
    dyPx: track.dyPx,
    dtSeconds: options.dtSeconds,
    canvasWidth: options.canvasWidth,
    canvasHeight: options.canvasHeight,
  });
  const color = splatColor(pointerId, options.hueBase);

  return {
    x: track.x,
    y: track.y,
    vx: velocity.x,
    vy: velocity.y,
    get radius() {
      if (track.justPressed) return BURST_RADIUS;
      return track.down ? HELD_RADIUS : HOVER_RADIUS;
    },
    get strength() {
      return track.down ? HELD_STRENGTH : HOVER_STRENGTH;
    },
    dyeR: color.r,
    dyeG: color.g,
    dyeB: color.b,
    get dyeAmount() {
      if (track.justPressed) return BURST_DYE;
      return track.down ? HELD_DYE : HOVER_DYE;
    },
    get radialImpulse() {
      return track.justPressed ? BURST_RADIAL_IMPULSE : 0;
    },
  };
};

export type DrainResult = {
  splats: readonly SplatInput[];
  tracks: PointerTracks;
};

// Convert all accumulated pointer movement into splats and reset the accumulators.
export const drainSplats = (tracks: PointerTracks, options: DrainOptions): DrainResult => {
  const entries = Object.entries(tracks);
  const splats = entries.map(([id, track]) => trackToSplat(parseInt(id, 10), track, options)).filter((splat) => splat !== undefined);
  const resetEntries = entries.map(([id, track]) => [id, { ...track, dxPx: 0, dyPx: 0, justPressed: false } satisfies PointerTrack]);

  return { splats, tracks: Object.fromEntries(resetEntries) };
};

const IDLE_POINTER_COUNT = 2;
const IDLE_STRENGTH = 0.26;
const IDLE_RADIUS = 0.12;
const IDLE_DYE = 0.0025;

// Virtual pointers that keep the fluid alive while no one is touching it.
export const idleSplats = (timeSeconds: number, idleSeconds: number, hueBase: number): readonly SplatInput[] => {
  const weight = idleFadeWeight(idleSeconds);
  if (weight <= 0) return [];

  return Array.from({ length: IDLE_POINTER_COUNT }, (_, index) => {
    const orbit = lissajousPointer(timeSeconds, index);
    const color = sabiPalette(wrap01(hueBase + index / IDLE_POINTER_COUNT + 0.13));

    return {
      x: orbit.x,
      y: orbit.y,
      vx: orbit.vx,
      vy: orbit.vy,
      radius: IDLE_RADIUS,
      strength: IDLE_STRENGTH * weight,
      dyeR: color.r,
      dyeG: color.g,
      dyeB: color.b,
      dyeAmount: IDLE_DYE * weight,
      radialImpulse: 0,
    };
  });
};
