// Pure masking geometry + the 2D-canvas compositor for the bounding-mask stage.
// Everything above drawFrame is pure (and unit-tested); drawFrame is the single
// effectful entry the session calls once per RAF tick.

import { contentToScreen } from '../../trace-stage/math';
import type { CoverScale, PartBox, Point } from '../../trace-stage/types';

import type { MaskParams } from '../types';

// A rectangle in normalized content UV (0..1, the video frame).
export type UVRect = { minX: number; minY: number; maxX: number; maxY: number };
// A rectangle in canvas pixels.
export type ScreenRect = { x: number; y: number; w: number; h: number };
export type RGB = { r: number; g: number; b: number };

// Person-mask probability above which a pixel counts as "on the body".
const MASK_THRESHOLD = 0.5;
// Label plate styling — raw canvas colours (the canvas is outside Panda's token
// system); kept in step with the `mask.panel` / `mask.text` tokens.
const LABEL_BG = 'rgba(8, 12, 18, 0.82)';
const LABEL_TEXT = '#edf2f7';
const LABEL_FONT_PX = 14;
const LABEL_PAD_X = 6;
const LABEL_PAD_Y = 4;

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

// Scale a part box around its centre by `padding`, clamped to the frame.
export const padBox = (box: PartBox, padding: number): UVRect => {
  const halfX = ((box.maxX - box.minX) / 2) * padding;
  const halfY = ((box.maxY - box.minY) / 2) * padding;
  return {
    minX: clamp01(box.cx - halfX),
    minY: clamp01(box.cy - halfY),
    maxX: clamp01(box.cx + halfX),
    maxY: clamp01(box.cy + halfY),
  };
};

export const hexToRgb = (hex: string): RGB => {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((channel) => channel + channel)
          .join('')
      : normalized;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
};

export const compositeColor = (hex: string, opacity: number): string => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(opacity)})`;
};

export const inAnyRect = (point: Point, rects: readonly UVRect[]): boolean => rects.some((rect) => point.x >= rect.minX && point.x <= rect.maxX && point.y >= rect.minY && point.y <= rect.maxY);

// Map a content-UV rect to canvas pixels using the same cover transform as the
// video, so masks stay pinned to the body under any aspect ratio.
export const screenRect = (rect: UVRect, cover: CoverScale, width: number, height: number): ScreenRect => {
  const topLeft = contentToScreen({ x: rect.minX, y: rect.minY }, cover);
  const bottomRight = contentToScreen({ x: rect.maxX, y: rect.maxY }, cover);
  const x = topLeft.x * width;
  const y = topLeft.y * height;
  return { x, y, w: bottomRight.x * width - x, h: bottomRight.y * height - y };
};

// Build a straight-alpha RGBA buffer (mask resolution) tinted where a pixel is
// both on the person and inside one of the enabled part rects. Pure → tested.
export const buildSilhouetteRGBA = (mask: Float32Array, maskW: number, maskH: number, rects: readonly UVRect[], color: RGB, opacity: number, threshold: number): Uint8ClampedArray<ArrayBuffer> => {
  const alpha = clamp01(opacity) * 255;
  const bytes = Array.from({ length: maskW * maskH }, (_, index) => {
    const px = index % maskW;
    const py = (index - px) / maskW;
    const point = { x: (px + 0.5) / maskW, y: (py + 0.5) / maskH };
    const onBody = (mask[index] ?? 0) > threshold && inAnyRect(point, rects);
    return onBody ? [color.r, color.g, color.b, alpha] : [0, 0, 0, 0];
  }).flat();
  return new Uint8ClampedArray(bytes);
};

export type DrawInput = {
  ctx: CanvasRenderingContext2D;
  source: CanvasImageSource;
  width: number;
  height: number;
  cover: CoverScale;
  params: MaskParams;
  partBoxes: readonly PartBox[];
  personMask: Float32Array | undefined;
  maskW: number;
  maskH: number;
  // Offscreen canvas sized maskW × maskH, owned by the session.
  silhouetteCanvas: HTMLCanvasElement;
};

// Canvas rendering is inherently stateful; alias the passed context to a local
// so the imperative property writes do not trip no-param-reassign.
const drawBoxes = (context: CanvasRenderingContext2D, rects: readonly ScreenRect[], params: MaskParams): void => {
  const c = context;
  c.save();
  c.fillStyle = compositeColor(params.color, params.opacity);
  if (params.feather > 0) c.filter = `blur(${params.feather}px)`;
  for (const rect of rects) {
    c.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  c.restore();
};

const drawSilhouette = (input: DrawInput, uvRects: readonly UVRect[], contentRect: ScreenRect): void => {
  const { params, personMask, maskW, maskH, silhouetteCanvas } = input;
  if (personMask === undefined) return;
  const silhouetteCtx = silhouetteCanvas.getContext('2d');
  if (silhouetteCtx === null) return;
  const rgba = buildSilhouetteRGBA(personMask, maskW, maskH, uvRects, hexToRgb(params.color), params.opacity, MASK_THRESHOLD);
  silhouetteCtx.putImageData(new ImageData(rgba, maskW, maskH), 0, 0);
  const c = input.ctx;
  c.save();
  if (params.feather > 0) c.filter = `blur(${params.feather}px)`;
  c.drawImage(silhouetteCanvas, contentRect.x, contentRect.y, contentRect.w, contentRect.h);
  c.restore();
};

const drawLabels = (context: CanvasRenderingContext2D, boxes: readonly PartBox[], cover: CoverScale, width: number, height: number, padding: number): void => {
  const c = context;
  c.save();
  c.font = `${LABEL_FONT_PX}px monospace`;
  c.textBaseline = 'top';
  for (const box of boxes) {
    const rect = screenRect(padBox(box, padding), cover, width, height);
    const plateWidth = c.measureText(box.part).width + LABEL_PAD_X * 2;
    const plateHeight = LABEL_FONT_PX + LABEL_PAD_Y * 2;
    const plateY = Math.max(0, rect.y - plateHeight);
    c.fillStyle = LABEL_BG;
    c.fillRect(rect.x, plateY, plateWidth, plateHeight);
    c.fillStyle = LABEL_TEXT;
    c.fillText(box.part, rect.x + LABEL_PAD_X, plateY + LABEL_PAD_Y);
  }
  c.restore();
};

// Composite one frame: cover-fit video base, then the colour mask, then labels.
export const drawFrame = (input: DrawInput): void => {
  const { ctx, source, width, height, cover, params, partBoxes } = input;
  const contentRect = screenRect({ minX: 0, minY: 0, maxX: 1, maxY: 1 }, cover, width, height);
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(source, contentRect.x, contentRect.y, contentRect.w, contentRect.h);

  const enabled = partBoxes.filter((box) => params.parts[box.part]);
  if (enabled.length === 0) return;

  const uvRects = enabled.map((box) => padBox(box, params.padding));
  switch (params.shape) {
    case 'box':
      drawBoxes(
        ctx,
        uvRects.map((rect) => screenRect(rect, cover, width, height)),
        params,
      );
      break;
    case 'silhouette':
      drawSilhouette(input, uvRects, contentRect);
      break;
  }
  if (params.showLabel) drawLabels(ctx, enabled, cover, width, height, params.padding);
};
