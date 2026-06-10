// Pure math helpers for the fluid simulation. No DOM, no GPU — fully unit-tested.

export type Vec2 = {
  x: number;
  y: number;
};

export type RGB = {
  r: number;
  g: number;
  b: number;
};

export type Resolution = {
  width: number;
  height: number;
};

const DT_MIN_SECONDS = 1 / 120;
const DT_MAX_SECONDS = 1 / 30;
const DT_FALLBACK_SECONDS = 1 / 60;

// Convert a requestAnimationFrame delta (ms) into a clamped simulation dt (seconds).
export const clampDt = (elapsedMs: number): number => {
  if (!Number.isFinite(elapsedMs)) return DT_FALLBACK_SECONDS;

  return Math.min(DT_MAX_SECONDS, Math.max(DT_MIN_SECONDS, elapsedMs / 1000));
};

// Derive a field resolution from the canvas size: divide by `divisor`, then cap the
// long edge at `maxLongEdge` while preserving aspect ratio.
export const fitResolution = (canvasWidth: number, canvasHeight: number, divisor: number, maxLongEdge: number): Resolution => {
  const baseWidth = canvasWidth / divisor;
  const baseHeight = canvasHeight / divisor;
  const longEdge = Math.max(baseWidth, baseHeight);
  const scale = longEdge > maxLongEdge ? maxLongEdge / longEdge : 1;

  return {
    width: Math.max(1, Math.round(baseWidth * scale)),
    height: Math.max(1, Math.round(baseHeight * scale)),
  };
};

const MAX_UV_SPEED = 6;

export type PointerDeltaInput = {
  dxPx: number;
  dyPx: number;
  dtSeconds: number;
  canvasWidth: number;
  canvasHeight: number;
};

// Convert a pointer movement in CSS pixels over a frame into a velocity in
// normalized UV units per second, clamped so fast flicks cannot blow up the field.
export const pointerDeltaToUVVelocity = ({ dxPx, dyPx, dtSeconds, canvasWidth, canvasHeight }: PointerDeltaInput): Vec2 => {
  const safeDt = Math.max(dtSeconds, DT_MIN_SECONDS);
  const x = dxPx / canvasWidth / safeDt;
  const y = dyPx / canvasHeight / safeDt;
  const speed = Math.hypot(x, y);
  if (speed <= MAX_UV_SPEED) return { x, y };
  const scale = MAX_UV_SPEED / speed;

  return { x: x * scale, y: y * scale };
};

export type LissajousSample = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type LissajousConfig = {
  freqX: number;
  freqY: number;
  phaseX: number;
  phaseY: number;
};

const LISSAJOUS_CONFIGS: readonly LissajousConfig[] = [
  { freqX: 0.11, freqY: 0.17, phaseX: 0, phaseY: Math.PI / 3 },
  { freqX: 0.07, freqY: 0.13, phaseX: Math.PI / 2, phaseY: Math.PI },
];

const LISSAJOUS_AMPLITUDE = 0.34;

const resolveLissajousConfig = (index: number): LissajousConfig => {
  const config = LISSAJOUS_CONFIGS[Math.abs(index) % LISSAJOUS_CONFIGS.length];
  if (config === undefined) return { freqX: 0.1, freqY: 0.15, phaseX: 0, phaseY: 0 };

  return config;
};

// Normalized [0,1] orbit position plus its analytic velocity, used to drive the
// idle "auto-flow" virtual pointers so the visual never freezes.
export const lissajousPointer = (timeSeconds: number, index: number): LissajousSample => {
  const { freqX, freqY, phaseX, phaseY } = resolveLissajousConfig(index);
  const angularX = 2 * Math.PI * freqX;
  const angularY = 2 * Math.PI * freqY;

  return {
    x: 0.5 + LISSAJOUS_AMPLITUDE * Math.sin(angularX * timeSeconds + phaseX),
    y: 0.5 + LISSAJOUS_AMPLITUDE * Math.sin(angularY * timeSeconds + phaseY),
    vx: LISSAJOUS_AMPLITUDE * angularX * Math.cos(angularX * timeSeconds + phaseX),
    vy: LISSAJOUS_AMPLITUDE * angularY * Math.cos(angularY * timeSeconds + phaseY),
  };
};

const IDLE_THRESHOLD_SECONDS = 3.5;
const IDLE_FADE_SECONDS = 1;

// Weight in [0,1] for the idle auto-flow forces: 0 until the idle threshold,
// then a linear ramp to 1 over the fade window.
export const idleFadeWeight = (idleSeconds: number): number => {
  if (idleSeconds <= IDLE_THRESHOLD_SECONDS) return 0;

  return Math.min(1, (idleSeconds - IDLE_THRESHOLD_SECONDS) / IDLE_FADE_SECONDS);
};

export const wrap01 = (value: number): number => value - Math.floor(value);

// Wabi-sabi palette: rust, antique gold, verdigris, ai-nezu gray-blue, deep indigo.
// Muted, weathered hues — pigments that look aged rather than electric.
const SABI_STOPS: readonly RGB[] = [
  { r: 0.45, g: 0.2, b: 0.12 },
  { r: 0.55, g: 0.42, b: 0.2 },
  { r: 0.22, g: 0.42, b: 0.36 },
  { r: 0.25, g: 0.3, b: 0.34 },
  { r: 0.16, g: 0.2, b: 0.33 },
];

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// Smoothly cycle through the sabi stops; t wraps over the unit interval.
export const sabiPalette = (t: number): RGB => {
  const scaled = wrap01(t) * SABI_STOPS.length;
  const index = Math.floor(scaled);
  const fraction = scaled - index;
  const eased = fraction * fraction * (3 - 2 * fraction);
  const from = SABI_STOPS[index % SABI_STOPS.length] ?? { r: 0, g: 0, b: 0 };
  const to = SABI_STOPS[(index + 1) % SABI_STOPS.length] ?? { r: 0, g: 0, b: 0 };

  return {
    r: lerp(from.r, to.r, eased),
    g: lerp(from.g, to.g, eased),
    b: lerp(from.b, to.b, eased),
  };
};

type HSVSectorParts = {
  v: number;
  p: number;
  q: number;
  t: number;
};

const resolveHSVSector = (sector: number, { v, p, q, t }: HSVSectorParts): RGB => {
  switch (sector) {
    case 0:
      return { r: v, g: t, b: p };
    case 1:
      return { r: q, g: v, b: p };
    case 2:
      return { r: p, g: v, b: t };
    case 3:
      return { r: p, g: q, b: v };
    case 4:
      return { r: t, g: p, b: v };
    default:
      return { r: v, g: p, b: q };
  }
};

// HSV -> RGB with all channels in [0,1]. Hue is normalized and wraps automatically.
export const hsvToRGB = (h: number, s: number, v: number): RGB => {
  const hue = wrap01(h) * 6;
  const sector = Math.floor(hue) % 6;
  const f = hue - Math.floor(hue);

  return resolveHSVSector(sector, {
    v,
    p: v * (1 - s),
    q: v * (1 - s * f),
    t: v * (1 - s * (1 - f)),
  });
};
