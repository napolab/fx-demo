// DOM/GPU/p5 session glue (no React): owns the p5 instance, webcam capture, the
// WGSL colour-sampling loop and disposal. The hook only mounts/unmounts it.
//
// Faithful Polytrace timing model: the point lattice is deterministic and only moves
// when the noise evolution advances — with evolution at 0 the mesh is completely
// still while the camera keeps repainting the triangle colours underneath it.

import { createPolyTraceEngine, type PolyTraceEngine } from '../engine';
import { coverRect } from '../math';
import { displacePoints, latticePoints } from '../mesh/noise';
import { makeBorderPoints, type Point } from '../mesh/points';
import { sampleColor, triangleCentroid, triangulate, type RGB } from '../mesh/triangles';
import type { PolyTraceParams, PolyTraceStatus } from '../types';

import type P5 from 'p5';

export type PolyTraceSession = {
  dispose: () => void;
};

type TraceMesh = {
  points: Point[];
  triangles: Uint32Array;
  fills: RGB[];
};

type SessionState = {
  disposed: boolean;
  cameraReady: boolean;
  sketch: P5 | undefined;
  engine: PolyTraceEngine | undefined;
  video: HTMLVideoElement | undefined;
  mesh: TraceMesh | undefined;
  videoAspect: number;
  noiseTime: number;
  lastTickMs: number;
  watchdogTimer: number;
};

const GRID_COLS = 160;
const GRID_ROWS = 90;
const BORDER_POINTS_PER_EDGE = 8;
const LATTICE_SEED = 1;
const EVOLUTION_UNITS_PER_SECOND = 0.6;
const EXTRACT_INTERVAL_MS = 33;
const IDLE_RETRY_MS = 120;
const CAMERA_WATCHDOG_MS = 8000;
const STAGE_BG: readonly [number, number, number] = [4, 6, 10];
const WIRE_COLOR: readonly [number, number, number, number] = [237, 242, 247, 180];

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const buildMesh = (colors: Uint8Array, params: PolyTraceParams, videoAspect: number, noiseTime: number): TraceMesh => {
  const lattice = latticePoints(params.pointCount, videoAspect, LATTICE_SEED);
  const points = [...makeBorderPoints(BORDER_POINTS_PER_EDGE), ...displacePoints(lattice, noiseTime, params.displaceAmount, LATTICE_SEED)];
  const triangles = triangulate(points);

  const fills = Array.from({ length: triangles.length / 3 }, (_, triangle) => {
    const centroid = triangleCentroid(points, triangles[triangle * 3] ?? 0, triangles[triangle * 3 + 1] ?? 0, triangles[triangle * 3 + 2] ?? 0);

    return sampleColor(colors, GRID_COLS, GRID_ROWS, centroid);
  });

  return { points, triangles, fills };
};

const renderMesh = (sketch: P5, mesh: TraceMesh, params: PolyTraceParams, videoAspect: number): void => {
  const rect = coverRect(sketch.width, sketch.height, videoAspect);
  // Mirror horizontally in coordinate space so the camera behaves like a mirror.
  const mapX = (x: number): number => sketch.width - (rect.x + x * rect.width);
  const mapY = (y: number): number => rect.y + y * rect.height;

  if (params.wireframe) {
    sketch.stroke(...WIRE_COLOR);
    sketch.strokeWeight(params.strokeWeight);
  } else {
    sketch.noStroke();
  }
  if (!params.fillEnabled) sketch.noFill();

  const { points, triangles, fills } = mesh;
  for (const [triangle, fill] of fills.entries()) {
    const a = points[triangles[triangle * 3] ?? 0];
    const b = points[triangles[triangle * 3 + 1] ?? 0];
    const c = points[triangles[triangle * 3 + 2] ?? 0];
    if (a === undefined || b === undefined || c === undefined) continue;

    if (params.fillEnabled) sketch.fill(fill.r, fill.g, fill.b);
    sketch.triangle(mapX(a.x), mapY(a.y), mapX(b.x), mapY(b.y), mapX(c.x), mapY(c.y));
  }
};

export const createPolyTraceSession = (host: HTMLElement, onStatus: (status: PolyTraceStatus) => void, getParams: () => PolyTraceParams): PolyTraceSession => {
  const state: SessionState = {
    disposed: false,
    cameraReady: false,
    sketch: undefined,
    engine: undefined,
    video: undefined,
    mesh: undefined,
    videoAspect: 16 / 9,
    noiseTime: 0,
    lastTickMs: 0,
    watchdogTimer: 0,
  };

  // Advance the noise clock by wall time × evolution so dragging the evolution
  // slider changes speed smoothly without jumping the mesh.
  const advanceNoiseTime = (evolution: number): void => {
    const nowMs = performance.now();
    const dtSeconds = state.lastTickMs === 0 ? 0 : Math.min(0.2, (nowMs - state.lastTickMs) / 1000);
    state.lastTickMs = nowMs;
    state.noiseTime = state.noiseTime + dtSeconds * evolution * EVOLUTION_UNITS_PER_SECOND;
  };

  const runExtraction = async (): Promise<void> => {
    while (!state.disposed) {
      const { engine, video } = state;
      if (engine === undefined || video === undefined) {
        await delay(IDLE_RETRY_MS);
        continue;
      }

      const result = await engine.extract(video);
      if (result === undefined) {
        await delay(IDLE_RETRY_MS);
        continue;
      }

      if (!state.cameraReady) {
        state.cameraReady = true;
        window.clearTimeout(state.watchdogTimer);
        onStatus('running');
      }
      const params = getParams();
      state.videoAspect = video.videoWidth / video.videoHeight;
      advanceNoiseTime(params.evolution);
      state.mesh = buildMesh(result.colors, params, state.videoAspect, state.noiseTime);

      await delay(EXTRACT_INTERVAL_MS);
    }
  };

  const mountSketch = (P5Constructor: typeof P5): void => {
    const sketch = new P5Constructor((instance: P5) => {
      const setup = (): void => {
        instance.createCanvas(host.clientWidth, host.clientHeight);
        const capture = instance.createCapture(instance.VIDEO);
        capture.hide();
        if (capture.elt instanceof HTMLVideoElement) {
          capture.elt.muted = true;
          capture.elt.playsInline = true;
          state.video = capture.elt;
        }
      };

      const draw = (): void => {
        instance.background(...STAGE_BG);
        const mesh = state.mesh;
        if (mesh === undefined) return;
        renderMesh(instance, mesh, getParams(), state.videoAspect);
      };

      const windowResized = (): void => {
        instance.resizeCanvas(host.clientWidth, host.clientHeight);
      };

      Object.assign(instance, { setup, draw, windowResized });
    }, host);
    state.sketch = sketch;
  };

  const start = async (): Promise<void> => {
    try {
      const engine = await createPolyTraceEngine(GRID_COLS, GRID_ROWS);
      if (state.disposed) {
        engine?.dispose();
        return;
      }
      if (engine === undefined) {
        onStatus('no-webgpu');
        return;
      }
      state.engine = engine;

      const { default: P5Constructor } = await import('p5');
      if (state.disposed) return;
      mountSketch(P5Constructor);

      // If the camera never delivers a frame (permission denied, no device), surface
      // it — the extraction loop keeps polling and recovers if frames arrive later.
      state.watchdogTimer = window.setTimeout(() => {
        if (!state.cameraReady && !state.disposed) onStatus('no-camera');
      }, CAMERA_WATCHDOG_MS);

      await runExtraction();
    } catch {
      if (!state.disposed) onStatus('no-webgpu');
    }
  };

  void start();

  const dispose = (): void => {
    if (state.disposed) return;
    state.disposed = true;
    window.clearTimeout(state.watchdogTimer);

    const stream = state.video?.srcObject;
    if (stream instanceof MediaStream) {
      for (const track of stream.getTracks()) track.stop();
    }
    state.sketch?.remove();
    state.engine?.dispose();
  };

  return { dispose };
};
