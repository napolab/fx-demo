// p5.js overlay renderer: contours (current + fading history), plexus wires,
// blob bboxes and monospace HUD labels on a transparent canvas above the
// WebGPU layer. p5 is imported dynamically — this module is client-only.

import { contentToScreen } from '../../math';
import type { Contour, OverlayFrame, Point } from '../../types';
import { formatPartLabel, formatStatsLine } from '../hud';

import type P5 from 'p5';

export type OverlayHandle = {
  resize: (width: number, height: number) => void;
  remove: () => void;
};

// Mirrors the panda `trace.*` tokens — p5 needs raw values at draw time.
// Trace/wire line work is monochrome; the tracking HUD (bbox + labels) is the
// one blue accent.
const COLOR_LINE = '#f2f2f2';
// trace.hud = oklch(0.490 0.287 266), trace.labelBg = oklch(0.185 0.020 265)
// converted to sRGB hex because p5's color parser predates oklch().
const COLOR_HUD = '#1a34ff';
const COLOR_LABEL_BG = '#0e131c';
// White on labelBg ≈ 18:1 — clears WCAG 2.1 AA with room to spare.
const COLOR_LABEL_TEXT = '#ffffff';
const COLOR_WIRE = '#bfbfbf';
// trace.marker — the red node dot at every box center.
const COLOR_MARKER = '#ff2a2a';
const HISTORY_MAX_ALPHA = 110;
const BOX_STROKE_WEIGHT = 2.5;
const MARKER_DIAMETER_PX = 7;
const WIRE_WEIGHT = 0.6;
const WIRE_MAX_ALPHA = 90;
const LABEL_HEIGHT_PX = 18;
const LABEL_PAD_X = 5;
const LABEL_BASELINE_OFFSET = 13;

const drawContour = (p: P5, contour: Contour, frame: OverlayFrame): void => {
  p.beginShape();
  for (const point of contour) {
    const screen = contentToScreen(point, frame.coverScale);
    p.vertex(screen.x * p.width, screen.y * p.height);
  }
  p.endShape(p.CLOSE);
};

const toScreenPx = (p: P5, point: Point, frame: OverlayFrame): Point => {
  const screen = contentToScreen(point, frame.coverScale);
  return { x: screen.x * p.width, y: screen.y * p.height };
};

const drawFrame = (p: P5, frame: OverlayFrame): void => {
  p.clear();
  p.noFill();

  // Echo trail: oldest faintest.
  for (const [index, snapshot] of frame.history.entries()) {
    const alpha = ((index + 1) / (frame.history.length + 1)) * HISTORY_MAX_ALPHA;
    p.stroke(242, 242, 242, alpha);
    p.strokeWeight(1);
    for (const contour of snapshot) drawContour(p, contour, frame);
  }

  // Current contours: full brightness.
  p.stroke(COLOR_LINE);
  p.strokeWeight(1.5);
  for (const contour of frame.contours) drawContour(p, contour, frame);

  // Faint wires between box-center nodes (the red markers are the nodes).
  for (const wire of frame.wires) {
    const a = toScreenPx(p, wire.a, frame);
    const b = toScreenPx(p, wire.b, frame);
    p.stroke(191, 191, 191, wire.strength * WIRE_MAX_ALPHA);
    p.strokeWeight(WIRE_WEIGHT);
    p.line(a.x, a.y, b.x, b.y);
  }

  // Part boxes + labels: face / hands / arms / torso / legs per detected pose.
  // The label sits INSIDE the box at its top edge, on a dark plate.
  const vertexCount = frame.contours.reduce((sum, contour) => sum + contour.length, 0);
  for (const part of frame.parts) {
    const min = toScreenPx(p, { x: part.minX, y: part.minY }, frame);
    const max = toScreenPx(p, { x: part.maxX, y: part.maxY }, frame);
    p.noFill();
    p.stroke(COLOR_HUD);
    p.strokeWeight(BOX_STROKE_WEIGHT);
    p.rect(min.x, min.y, max.x - min.x, max.y - min.y);

    const label = formatPartLabel(part);
    const plateWidth = p.textWidth(label) + LABEL_PAD_X * 2;
    p.noStroke();
    p.fill(COLOR_LABEL_BG);
    p.rect(min.x, min.y, plateWidth, LABEL_HEIGHT_PX);
    p.fill(COLOR_LABEL_TEXT);
    p.text(label, min.x + LABEL_PAD_X, min.y + LABEL_BASELINE_OFFSET);

    // Red node dot at the box center.
    const center = toScreenPx(p, { x: part.cx, y: part.cy }, frame);
    p.fill(COLOR_MARKER);
    p.circle(center.x, center.y, MARKER_DIAMETER_PX);
  }

  p.noStroke();
  p.fill(COLOR_LINE);
  p.text(formatStatsLine(frame.parts.length, vertexCount), p.width - 220, p.height - 14);
};

export const createOverlay = async (container: HTMLElement, getFrame: () => OverlayFrame): Promise<OverlayHandle> => {
  const { default: p5 } = await import('p5');
  const handle: { instance: P5 | undefined } = { instance: undefined };

  const sketch = (p: P5): void => {
    const instance = p;
    instance.setup = () => {
      instance.createCanvas(container.clientWidth, container.clientHeight);
      instance.textFont('monospace');
      instance.textSize(11);
    };
    instance.draw = () => {
      drawFrame(instance, getFrame());
    };
  };
  handle.instance = new p5(sketch, container);

  return {
    resize(width, height) {
      handle.instance?.resizeCanvas(width, height);
    },
    remove() {
      handle.instance?.remove();
    },
  };
};
