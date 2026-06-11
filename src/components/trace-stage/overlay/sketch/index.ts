// p5.js overlay renderer: contours (current + fading history), plexus wires,
// blob bboxes and monospace HUD labels on a transparent canvas above the
// WebGPU layer. p5 is imported dynamically — this module is client-only.

import { contentToScreen } from '../../math';
import type { Contour, OverlayFrame, Point } from '../../types';
import { formatBlobLabel, formatStatsLine } from '../hud';

import type P5 from 'p5';

export type OverlayHandle = {
  resize: (width: number, height: number) => void;
  remove: () => void;
};

// Mirrors the panda `trace.*` tokens — p5 needs raw values at draw time.
// Trace/wire line work is monochrome; the tracking HUD (bbox + labels) is the
// one blue accent, like the reference footage.
const COLOR_LINE = '#f2f2f2';
const COLOR_HUD = '#39c5cf';
const COLOR_HUD_TEXT = '#9fe8ee';
const COLOR_WIRE = '#bfbfbf';
const HISTORY_MAX_ALPHA = 110;
const LABEL_OFFSET_PX = 6;

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

  // Plexus wires.
  for (const wire of frame.wires) {
    const a = toScreenPx(p, wire.a, frame);
    const b = toScreenPx(p, wire.b, frame);
    p.stroke(191, 191, 191, wire.strength * 150);
    p.strokeWeight(0.75);
    p.line(a.x, a.y, b.x, b.y);
    p.stroke(COLOR_WIRE);
    p.strokeWeight(2.5);
    p.point(a.x, a.y);
    p.point(b.x, b.y);
  }

  // Blob bboxes + labels, one per tracked segment.
  const vertexCount = frame.contours.reduce((sum, contour) => sum + contour.length, 0);
  for (const blob of frame.blobs) {
    const min = toScreenPx(p, { x: blob.minX, y: blob.minY }, frame);
    const max = toScreenPx(p, { x: blob.maxX, y: blob.maxY }, frame);
    p.noFill();
    p.stroke(COLOR_HUD);
    p.strokeWeight(1);
    p.rect(min.x, min.y, max.x - min.x, max.y - min.y);
    p.noStroke();
    p.fill(COLOR_HUD_TEXT);
    p.text(formatBlobLabel(blob), min.x, min.y - LABEL_OFFSET_PX);
  }

  p.noStroke();
  p.fill(COLOR_LINE);
  p.text(formatStatsLine(frame.blobs.length, vertexCount), p.width - 220, p.height - 14);
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
