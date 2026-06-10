# Trace & Blob Tracking FX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New `/trace` page that traces webcam silhouettes with green wireframe contours, echo trails, blob-tracking bboxes with HUD labels, plexus wires (p5.js overlay) over a WGSL-processed video layer — recreating the TouchDesigner "Trace and Blob Tracking" effect.

**Architecture:** Two stacked canvases. Canvas#1 is a raw WebGPU engine (same pattern as `fluid-stage/engine`) compositing the darkened camera, a mask-glow feedback trail, scanlines/grain/chromatic aberration — all in WGSL. Canvas#2 is a transparent p5.js 2D instance drawing contours/wires/bboxes/HUD from CPU-side detection. MediaPipe ImageSegmenter produces a person mask on a 320×180 offscreen canvas; pure functions (marching squares → RDP simplify → blob tracking → wires) turn it into vector data. A framework-free session (mirroring `fluid-stage/session`) owns the RAF loop; a thin hook mounts it.

**Tech Stack:** Next.js 15 App Router (RSC page + client island), raw WebGPU + WGSL (`.wgsl` raw imports already configured), p5.js (2D instance mode, dynamic import), `@mediapipe/tasks-vision` ImageSegmenter, Panda CSS, vitest browser mode.

**Spec:** `docs/superpowers/specs/2026-06-11-trace-blob-fx-design.md`

**Coexistence note:** the repo already contains sibling FX pages built the same way — `src/components/fluid-stage` (`/`), `src/components/poly-trace` (`/polytrace`, uncommitted), `src/components/jpeg-glitch-stage`. This feature is independent: new route `/trace`, new component dir `trace-stage`, no shared modules with those pages (each stage keeps its own camera/session/math copies by existing convention). Do not touch the uncommitted `poly-trace` / `jpeg-glitch-stage` files.

**Project rules that bind every task:** arrow functions only; no `let` (use `const` + object-property mutation or `while` with cursor objects); no `forEach`; no non-null `!`; kebab-case files; colocated tests (`<module>/index.ts` + `<module>/<module>.test.ts`); Panda tokens only (no hardcoded colors in `.css.ts`); `import * as styles from './styles.css'`; data-attribute styling; shaders in separate `.wgsl` files; `pnpm lint && pnpm typecheck` must pass before every commit (husky runs them).

---

## File Map

```
panda.config.ts                                  Modify: add trace.* color tokens
src/app/(frontend)/trace/page.tsx                Create: RSC page
src/components/trace-stage/
├── index.tsx                                    Create: client component (canvas stack + notices)
├── styles.css.ts                                Create
├── trace-stage.test.tsx                         Create: smoke test
├── types.ts                                     Create: shared types
├── use-trace-fx.ts                              Create: React adapter hook
├── math/
│   ├── index.ts                                 Create: coverScale / contentToScreen
│   └── math.test.ts                             Create
├── detection/
│   ├── marching-squares/index.ts + marching-squares.test.ts
│   ├── simplify/index.ts + simplify.test.ts
│   ├── blob-tracker/index.ts + blob-tracker.test.ts
│   └── segmenter/index.ts                       Create: MediaPipe wrapper (side effects, no unit test)
├── overlay/
│   ├── hud/index.ts + hud.test.ts
│   ├── wires/index.ts + wires.test.ts
│   └── sketch/index.ts                          Create: p5 renderer (side effects, no unit test)
├── engine/
│   ├── index.ts                                 Create: WebGPU engine
│   └── shaders/
│       ├── fullscreen.wgsl                      Create: shared vertex stage
│       ├── feedback.wgsl                        Create: trail accumulation
│       └── composite.wgsl                       Create: final grade
└── session/index.ts                             Create: RAF loop / camera / orchestration
```

Dependency order: types → math → detection pure fns → overlay pure fns → segmenter → engine → sketch → session → hook/component → page.

---

### Task 0: Branch + dependencies + design tokens

**Files:**
- Modify: `panda.config.ts`

- [ ] **Step 0.1: Branch from up-to-date main** (git-workflow rule)

```bash
cd /Users/napochaan/ghq/github.com/napolab/fluid-simulation
git checkout main && git pull --ff-only origin main 2>/dev/null || true
git switch -c feat/trace-stage
```

(If `origin` doesn't exist yet, the pull no-ops — local main is the source of truth.)

- [ ] **Step 0.2: Install dependencies**

```bash
pnpm add @mediapipe/tasks-vision p5
pnpm add -D @types/p5
```

Expected: lockfile updated, no peer warnings that block install. (If `@types/p5` conflicts with p5 v2 bundled types, drop `@types/p5` and use the bundled ones — check `node_modules/p5/types` exists first.)

- [ ] **Step 0.3: Add trace color tokens to panda.config.ts**

In `panda.config.ts`, inside `theme.extend.tokens.colors`, add a sibling of `stage`:

```ts
          trace: {
            // CV-green stage: near-black ground, lime trace lines, cyan HUD.
            // hudText on bg is ~12:1, text on bg ~15:1 — clears WCAG 2.1 AA.
            bg: { value: '#0b0e0b' },
            line: { value: '#7cfc00' },
            hud: { value: '#39c5cf' },
            hudText: { value: '#9fe8ee' },
            wire: { value: '#cfe8cf' },
            text: { value: '#edf2f7' },
            dim: { value: 'rgba(207, 232, 207, 0.62)' },
          },
```

- [ ] **Step 0.4: Regenerate panda + verify**

```bash
pnpm run prepare:panda && pnpm lint && pnpm typecheck
```

Expected: all pass.

- [ ] **Step 0.5: Commit**

```bash
git add panda.config.ts package.json pnpm-lock.yaml
git commit -m "feat(trace): add dependencies and trace color tokens"
```

---

### Task 1: Shared types

**Files:**
- Create: `src/components/trace-stage/types.ts`

- [ ] **Step 1.1: Write types.ts**

```ts
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
  // 1 when the webcam texture carries live video, 0 before permission.
  cameraReady: number;
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
```

- [ ] **Step 1.2: Verify + commit**

```bash
pnpm typecheck
git add src/components/trace-stage/types.ts
git commit -m "feat(trace): add shared trace-stage types"
```

---

### Task 2: math module — cover-fit mapping (TDD)

The camera frame is 16:9 but the canvas fills the viewport. The WGSL composite samples content with `contentUv = (screenUv - 0.5) * coverScale + 0.5`; the p5 overlay must apply the exact inverse so boxes sit on the body. These two pure functions are the contract.

**Files:**
- Create: `src/components/trace-stage/math/index.ts`
- Test: `src/components/trace-stage/math/math.test.ts`

- [ ] **Step 2.1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest';

import type { Point } from '../types';
import { contentToScreen, coverScale } from '.';

describe('coverScale', () => {
  test('wider viewport than content crops vertically', () => {
    // content 16:9 ≈ 1.778, viewport 2:1
    const scale = coverScale(16 / 9, 2);
    expect(scale.x).toBe(1);
    expect(scale.y).toBeCloseTo(16 / 9 / 2, 5);
  });

  test('narrower viewport than content crops horizontally', () => {
    const scale = coverScale(16 / 9, 1);
    expect(scale.x).toBeCloseTo(1 / (16 / 9), 5);
    expect(scale.y).toBe(1);
  });

  test('matching aspects map 1:1', () => {
    const scale = coverScale(16 / 9, 16 / 9);
    expect(scale).toEqual({ x: 1, y: 1 });
  });
});

describe('contentToScreen', () => {
  test('center stays at center', () => {
    const scale = coverScale(16 / 9, 1);
    expect(contentToScreen({ x: 0.5, y: 0.5 }, scale)).toEqual({ x: 0.5, y: 0.5 });
  });

  test('round-trips against the shader-side forward mapping', () => {
    const scale = coverScale(16 / 9, 2.4);
    const content: Point = { x: 0.3, y: 0.7 };
    const screen = contentToScreen(content, scale);
    // shader does: contentUv = (screenUv - 0.5) * scale + 0.5
    expect((screen.x - 0.5) * scale.x + 0.5).toBeCloseTo(content.x, 6);
    expect((screen.y - 0.5) * scale.y + 0.5).toBeCloseTo(content.y, 6);
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

```bash
pnpm vitest run src/components/trace-stage/math/math.test.ts
```

Expected: FAIL — cannot resolve `.` (module missing).

- [ ] **Step 2.3: Write the implementation**

```ts
// Cover-fit math shared between the WGSL composite (screen→content) and the
// p5 overlay (content→screen). Keep both directions in one place so they
// cannot drift apart.

import type { CoverScale, Point } from '../types';

// Scale applied in the shader: contentUv = (screenUv - 0.5) * scale + 0.5.
export const coverScale = (contentAspect: number, viewportAspect: number): CoverScale =>
  viewportAspect > contentAspect ? { x: 1, y: contentAspect / viewportAspect } : { x: viewportAspect / contentAspect, y: 1 };

// Inverse mapping used by the overlay so vector data lands on the video.
export const contentToScreen = (point: Point, scale: CoverScale): Point => ({
  x: (point.x - 0.5) / scale.x + 0.5,
  y: (point.y - 0.5) / scale.y + 0.5,
});
```

- [ ] **Step 2.4: Run test to verify it passes**

```bash
pnpm vitest run src/components/trace-stage/math/math.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 2.5: Commit**

```bash
git add src/components/trace-stage/math
git commit -m "feat(trace): add cover-fit mapping math"
```

---

### Task 3: detection/marching-squares (TDD)

Turns a scalar mask into closed contour polylines: per-cell marching-squares segments (edge midpoints, no interpolation — RDP smooths later), then endpoint-chaining into loops. Coordinates normalized to 0..1.

**Files:**
- Create: `src/components/trace-stage/detection/marching-squares/index.ts`
- Test: `src/components/trace-stage/detection/marching-squares/marching-squares.test.ts`

- [ ] **Step 3.1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest';

import { traceContours } from '.';

// 4×4 grid with the inner 2×2 filled: one closed ring expected.
const square4 = Float32Array.from([0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0]);

describe('traceContours', () => {
  test('empty mask yields no contours', () => {
    expect(traceContours(new Float32Array(16), 4, 4, 0.5)).toEqual([]);
  });

  test('fully filled mask yields no contours (no boundary inside the grid)', () => {
    expect(traceContours(new Float32Array(16).fill(1), 4, 4, 0.5)).toEqual([]);
  });

  test('a filled square yields one closed contour of 8 edge-midpoints', () => {
    const contours = traceContours(square4, 4, 4, 0.5);
    expect(contours).toHaveLength(1);
    const [ring] = contours;
    expect(ring).toBeDefined();
    expect(ring).toHaveLength(8);
  });

  test('contour points are normalized into 0..1', () => {
    const [ring] = traceContours(square4, 4, 4, 0.5);
    for (const point of ring ?? []) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(1);
    }
  });

  test('two separate squares yield two contours', () => {
    // 8×4: filled cells at x∈{1,2} and x∈{5,6}, y∈{1,2}
    const mask = new Float32Array(8 * 4);
    const set = (x: number, y: number): void => {
      mask[y * 8 + x] = 1;
    };
    set(1, 1);
    set(2, 1);
    set(1, 2);
    set(2, 2);
    set(5, 1);
    set(6, 1);
    set(5, 2);
    set(6, 2);
    expect(traceContours(mask, 8, 4, 0.5)).toHaveLength(2);
  });
});
```

- [ ] **Step 3.2: Run test to verify it fails**

```bash
pnpm vitest run src/components/trace-stage/detection/marching-squares/marching-squares.test.ts
```

Expected: FAIL — module missing.

- [ ] **Step 3.3: Write the implementation**

```ts
// Marching squares over a scalar mask. Emits per-cell boundary segments at
// edge midpoints, then chains shared endpoints into closed contour loops.
// No interpolation — downstream RDP simplification smooths the staircase.

import type { Contour, Point } from '../../types';

type Segment = { ax: number; ay: number; bx: number; by: number };

const range = (length: number): readonly number[] => Array.from({ length }, (_, index) => index);

// Edge midpoints of cell (x, y): top / right / bottom / left.
const edgePoint = (x: number, y: number, edge: 0 | 1 | 2 | 3): readonly [number, number] => {
  switch (edge) {
    case 0:
      return [x + 0.5, y];
    case 1:
      return [x + 1, y + 0.5];
    case 2:
      return [x + 0.5, y + 1];
    case 3:
      return [x, y + 0.5];
  }
};

// Marching-squares case table. Bits: TL=1, TR=2, BR=4, BL=8.
// Each entry lists [fromEdge, toEdge] pairs (0=top 1=right 2=bottom 3=left).
const CASES: readonly (readonly (readonly [0 | 1 | 2 | 3, 0 | 1 | 2 | 3])[])[] = [
  [],
  [[3, 0]],
  [[0, 1]],
  [[3, 1]],
  [[1, 2]],
  [[3, 0], [1, 2]],
  [[0, 2]],
  [[3, 2]],
  [[2, 3]],
  [[2, 0]],
  [[0, 1], [2, 3]],
  [[2, 1]],
  [[1, 3]],
  [[1, 0]],
  [[0, 3]],
  [],
];

const keyOf = (x: number, y: number): string => `${x}|${y}`;

const collectSegments = (mask: Float32Array, width: number, height: number, threshold: number): Segment[] => {
  const segments: Segment[] = [];
  const inside = (x: number, y: number): boolean => {
    const value = mask[y * width + x];
    return value !== undefined && value >= threshold;
  };
  for (const cy of range(height - 1)) {
    for (const cx of range(width - 1)) {
      const code = (inside(cx, cy) ? 1 : 0) + (inside(cx + 1, cy) ? 2 : 0) + (inside(cx + 1, cy + 1) ? 4 : 0) + (inside(cx, cy + 1) ? 8 : 0);
      const entries = CASES[code] ?? [];
      for (const [from, to] of entries) {
        const [ax, ay] = edgePoint(cx, cy, from);
        const [bx, by] = edgePoint(cx, cy, to);
        segments.push({ ax, ay, bx, by });
      }
    }
  }
  return segments;
};

const chainContours = (segments: readonly Segment[], width: number, height: number): Contour[] => {
  const byEndpoint = new Map<string, number[]>();
  for (const [index, segment] of segments.entries()) {
    const aKey = keyOf(segment.ax, segment.ay);
    const bKey = keyOf(segment.bx, segment.by);
    byEndpoint.set(aKey, [...(byEndpoint.get(aKey) ?? []), index]);
    byEndpoint.set(bKey, [...(byEndpoint.get(bKey) ?? []), index]);
  }
  const used = segments.map(() => false);
  const normalize = (x: number, y: number): Point => ({ x: x / (width - 1), y: y / (height - 1) });
  const contours: Contour[] = [];

  for (const [startIndex, start] of segments.entries()) {
    if (used[startIndex] === true) continue;
    used[startIndex] = true;
    const points: Point[] = [normalize(start.ax, start.ay), normalize(start.bx, start.by)];
    const cursor = { key: keyOf(start.bx, start.by), startKey: keyOf(start.ax, start.ay), open: true };
    while (cursor.open) {
      const candidates = byEndpoint.get(cursor.key) ?? [];
      const nextIndex = candidates.find((candidate) => used[candidate] !== true);
      const next = nextIndex === undefined ? undefined : segments[nextIndex];
      if (nextIndex === undefined || next === undefined) {
        cursor.open = false;
        continue;
      }
      used[nextIndex] = true;
      const exitsFromA = keyOf(next.ax, next.ay) === cursor.key;
      const [nx, ny] = exitsFromA ? [next.bx, next.by] : [next.ax, next.ay];
      cursor.key = keyOf(nx, ny);
      if (cursor.key === cursor.startKey) {
        cursor.open = false;
        continue;
      }
      points.push(normalize(nx, ny));
    }
    if (points.length >= 3) contours.push(points);
  }
  return contours;
};

export const traceContours = (mask: Float32Array, width: number, height: number, threshold: number): readonly Contour[] => {
  if (width < 2 || height < 2) return [];
  return chainContours(collectSegments(mask, width, height, threshold), width, height);
};
```

- [ ] **Step 3.4: Run test to verify it passes**

```bash
pnpm vitest run src/components/trace-stage/detection/marching-squares/marching-squares.test.ts
```

Expected: PASS (5 tests). If the 8-point count fails by ±1, check the closed-loop termination: the final closing point must NOT be appended (first point not repeated).

- [ ] **Step 3.5: Commit**

```bash
git add src/components/trace-stage/detection/marching-squares
git commit -m "feat(trace): add marching-squares contour tracing"
```

---

### Task 4: detection/simplify — Ramer–Douglas–Peucker (TDD)

**Files:**
- Create: `src/components/trace-stage/detection/simplify/index.ts`
- Test: `src/components/trace-stage/detection/simplify/simplify.test.ts`

- [ ] **Step 4.1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest';

import { simplify } from '.';

describe('simplify', () => {
  test('keeps endpoints of a collinear run and drops the middle', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 0.25, y: 0.25 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
    ];
    expect(simplify(line, 0.01)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
  });

  test('preserves a right-angle corner', () => {
    const corner = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0.5 },
      { x: 1, y: 1 },
    ];
    expect(simplify(corner, 0.01)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ]);
  });

  test('returns short inputs unchanged', () => {
    const pair = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    expect(simplify(pair, 0.5)).toEqual(pair);
  });
});
```

- [ ] **Step 4.2: Run test to verify it fails**

```bash
pnpm vitest run src/components/trace-stage/detection/simplify/simplify.test.ts
```

Expected: FAIL — module missing.

- [ ] **Step 4.3: Write the implementation**

```ts
// Ramer–Douglas–Peucker polyline simplification. Treats the input as an open
// polyline anchored at both ends — good enough for closed contours visually,
// since marching-squares rings start/end on a real boundary point.

import type { Point } from '../../types';

const perpendicularDistance = (point: Point, lineStart: Point, lineEnd: Point): number => {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
  const cross = Math.abs(dx * (lineStart.y - point.y) - dy * (lineStart.x - point.x));
  return cross / Math.sqrt(lengthSquared);
};

const simplifySegment = (points: readonly Point[], epsilon: number): readonly Point[] => {
  if (points.length <= 2) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined) return points;

  const farthest = points.slice(1, -1).reduce(
    (best, point, index) => {
      const distance = perpendicularDistance(point, first, last);
      return distance > best.distance ? { distance, index: index + 1 } : best;
    },
    { distance: 0, index: 0 },
  );

  if (farthest.distance <= epsilon) return [first, last];
  const head = simplifySegment(points.slice(0, farthest.index + 1), epsilon);
  const tail = simplifySegment(points.slice(farthest.index), epsilon);
  return [...head.slice(0, -1), ...tail];
};

export const simplify = (points: readonly Point[], epsilon: number): readonly Point[] => simplifySegment(points, epsilon);
```

- [ ] **Step 4.4: Run test to verify it passes**

```bash
pnpm vitest run src/components/trace-stage/detection/simplify/simplify.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 4.5: Commit**

```bash
git add src/components/trace-stage/detection/simplify
git commit -m "feat(trace): add RDP polyline simplification"
```

---

### Task 5: detection/blob-tracker (TDD)

Two queries: `findBlobs` (connected components → bbox/centroid/area) and `trackBlobs` (nearest-centroid identity across frames).

**Files:**
- Create: `src/components/trace-stage/detection/blob-tracker/index.ts`
- Test: `src/components/trace-stage/detection/blob-tracker/blob-tracker.test.ts`

- [ ] **Step 5.1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest';

import { findBlobs, trackBlobs } from '.';

const maskWith = (width: number, height: number, cells: readonly (readonly [number, number])[]): Float32Array => {
  const mask = new Float32Array(width * height);
  for (const [x, y] of cells) {
    mask[y * width + x] = 1;
  }
  return mask;
};

describe('findBlobs', () => {
  test('empty mask has no blobs', () => {
    expect(findBlobs(new Float32Array(64), 8, 8, 0.5, 1)).toEqual([]);
  });

  test('one filled square is one blob with correct bbox and centroid', () => {
    const mask = maskWith(8, 8, [[2, 2], [3, 2], [2, 3], [3, 3]]);
    const blobs = findBlobs(mask, 8, 8, 0.5, 1);
    expect(blobs).toHaveLength(1);
    const [blob] = blobs;
    expect(blob?.minX).toBeCloseTo(2 / 7, 5);
    expect(blob?.maxX).toBeCloseTo(3 / 7, 5);
    expect(blob?.cx).toBeCloseTo(2.5 / 7, 5);
    expect(blob?.area).toBeCloseTo(4 / 64, 5);
  });

  test('two distant squares are two blobs; tiny specks below minArea are dropped', () => {
    const mask = maskWith(16, 8, [[1, 1], [2, 1], [1, 2], [2, 2], [12, 5], [13, 5], [12, 6], [13, 6], [8, 0]]);
    const blobs = findBlobs(mask, 16, 8, 0.5, 2);
    expect(blobs).toHaveLength(2);
  });
});

describe('trackBlobs', () => {
  const blobAt = (cx: number, cy: number) => ({ minX: cx - 0.1, minY: cy - 0.1, maxX: cx + 0.1, maxY: cy + 0.1, cx, cy, area: 0.04 });

  test('first frame assigns sequential ids', () => {
    const result = trackBlobs([], [blobAt(0.3, 0.3), blobAt(0.7, 0.7)], 0);
    expect(result.blobs.map((blob) => blob.id)).toEqual([0, 1]);
    expect(result.nextId).toBe(2);
  });

  test('a blob that moved slightly keeps its id', () => {
    const first = trackBlobs([], [blobAt(0.3, 0.3)], 0);
    const second = trackBlobs(first.blobs, [blobAt(0.33, 0.31)], first.nextId);
    expect(second.blobs[0]?.id).toBe(0);
    expect(second.nextId).toBe(1);
  });

  test('a far-away appearance gets a fresh id', () => {
    const first = trackBlobs([], [blobAt(0.2, 0.2)], 0);
    const second = trackBlobs(first.blobs, [blobAt(0.9, 0.9)], first.nextId);
    expect(second.blobs[0]?.id).toBe(1);
  });
});
```

- [ ] **Step 5.2: Run test to verify it fails**

```bash
pnpm vitest run src/components/trace-stage/detection/blob-tracker/blob-tracker.test.ts
```

Expected: FAIL — module missing.

- [ ] **Step 5.3: Write the implementation**

```ts
// Connected-component blob detection plus frame-to-frame identity tracking.
// findBlobs: BFS flood fill over the thresholded mask (queue-based, no recursion).
// trackBlobs: greedy nearest-centroid matching against the previous frame.

import type { Point, RawBlob, TrackedBlob } from '../../types';

const MAX_MATCH_DISTANCE = 0.15;

const range = (length: number): readonly number[] => Array.from({ length }, (_, index) => index);

export const findBlobs = (mask: Float32Array, width: number, height: number, threshold: number, minAreaCells: number): readonly RawBlob[] => {
  const visited = new Uint8Array(width * height);
  const blobs: RawBlob[] = [];
  const isInside = (index: number): boolean => {
    const value = mask[index];
    return value !== undefined && value >= threshold;
  };

  for (const startIndex of range(width * height)) {
    if (visited[startIndex] === 1 || !isInside(startIndex)) continue;
    const queue: number[] = [startIndex];
    visited[startIndex] = 1;
    const acc = { minX: width, minY: height, maxX: 0, maxY: 0, sumX: 0, sumY: 0, count: 0 };
    while (queue.length > 0) {
      const index = queue.pop();
      if (index === undefined) continue;
      const x = index % width;
      const y = Math.floor(index / width);
      acc.minX = Math.min(acc.minX, x);
      acc.maxX = Math.max(acc.maxX, x);
      acc.minY = Math.min(acc.minY, y);
      acc.maxY = Math.max(acc.maxY, y);
      acc.sumX += x;
      acc.sumY += y;
      acc.count += 1;
      const neighbors = [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < height - 1 ? index + width : -1];
      for (const neighbor of neighbors) {
        if (neighbor < 0 || visited[neighbor] === 1 || !isInside(neighbor)) continue;
        visited[neighbor] = 1;
        queue.push(neighbor);
      }
    }
    if (acc.count < minAreaCells) continue;
    blobs.push({
      minX: acc.minX / (width - 1),
      minY: acc.minY / (height - 1),
      maxX: acc.maxX / (width - 1),
      maxY: acc.maxY / (height - 1),
      cx: acc.sumX / acc.count / (width - 1),
      cy: acc.sumY / acc.count / (height - 1),
      area: acc.count / (width * height),
    });
  }
  return blobs;
};

const distanceBetween = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

export const trackBlobs = (previous: readonly TrackedBlob[], current: readonly RawBlob[], nextId: number): { blobs: readonly TrackedBlob[]; nextId: number } => {
  const pairs = current
    .flatMap((blob, currentIndex) =>
      previous.map((prev) => ({
        currentIndex,
        prevId: prev.id,
        distance: distanceBetween({ x: blob.cx, y: blob.cy }, { x: prev.cx, y: prev.cy }),
      })),
    )
    .filter((pair) => pair.distance <= MAX_MATCH_DISTANCE)
    .sort((a, b) => a.distance - b.distance);

  const assignedCurrent = new Set<number>();
  const assignedPrev = new Set<number>();
  const matches = new Map<number, number>();
  for (const pair of pairs) {
    if (assignedCurrent.has(pair.currentIndex) || assignedPrev.has(pair.prevId)) continue;
    assignedCurrent.add(pair.currentIndex);
    assignedPrev.add(pair.prevId);
    matches.set(pair.currentIndex, pair.prevId);
  }

  const counter = { value: nextId };
  const blobs = current.map((blob, index) => {
    const matchedId = matches.get(index);
    if (matchedId !== undefined) return { ...blob, id: matchedId };
    const id = counter.value;
    counter.value += 1;
    return { ...blob, id };
  });
  return { blobs, nextId: counter.value };
};
```

- [ ] **Step 5.4: Run test to verify it passes**

```bash
pnpm vitest run src/components/trace-stage/detection/blob-tracker/blob-tracker.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 5.5: Commit**

```bash
git add src/components/trace-stage/detection/blob-tracker
git commit -m "feat(trace): add blob detection and id tracking"
```

---

### Task 6: overlay/hud — label formatting (TDD)

**Files:**
- Create: `src/components/trace-stage/overlay/hud/index.ts`
- Test: `src/components/trace-stage/overlay/hud/hud.test.ts`

- [ ] **Step 6.1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest';

import { formatBlobLabel, formatStatsLine } from '.';

describe('formatBlobLabel', () => {
  test('formats id, centroid and area in fixed widths', () => {
    const blob = { id: 3, minX: 0.1, minY: 0.1, maxX: 0.5, maxY: 0.9, cx: 0.4214, cy: 0.1832, area: 0.0315 };
    expect(formatBlobLabel(blob)).toBe('blob_03 x:0.421 y:0.183 a:0.032');
  });

  test('pads double-digit ids without truncation', () => {
    const blob = { id: 12, minX: 0, minY: 0, maxX: 1, maxY: 1, cx: 0.5, cy: 0.5, area: 1 };
    expect(formatBlobLabel(blob)).toBe('blob_12 x:0.500 y:0.500 a:1.000');
  });
});

describe('formatStatsLine', () => {
  test('summarizes blob and vertex counts', () => {
    expect(formatStatsLine(2, 148)).toBe('tracking: 2 blobs / 148 verts');
  });
});
```

- [ ] **Step 6.2: Run test to verify it fails**

```bash
pnpm vitest run src/components/trace-stage/overlay/hud/hud.test.ts
```

Expected: FAIL — module missing.

- [ ] **Step 6.3: Write the implementation**

```ts
// HUD string formatting for the tracking overlay. Pure: blob in, label out.

import type { TrackedBlob } from '../../types';

export const formatBlobLabel = (blob: TrackedBlob): string => {
  const id = `${blob.id}`.padStart(2, '0');
  return `blob_${id} x:${blob.cx.toFixed(3)} y:${blob.cy.toFixed(3)} a:${blob.area.toFixed(3)}`;
};

export const formatStatsLine = (blobCount: number, vertexCount: number): string => `tracking: ${blobCount} blobs / ${vertexCount} verts`;
```

- [ ] **Step 6.4: Run test + commit**

```bash
pnpm vitest run src/components/trace-stage/overlay/hud/hud.test.ts
git add src/components/trace-stage/overlay/hud
git commit -m "feat(trace): add HUD label formatting"
```

Expected: PASS (3 tests), then commit succeeds.

---

### Task 7: overlay/wires — plexus connections (TDD)

**Files:**
- Create: `src/components/trace-stage/overlay/wires/index.ts`
- Test: `src/components/trace-stage/overlay/wires/wires.test.ts`

- [ ] **Step 7.1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest';

import { buildWires } from '.';

describe('buildWires', () => {
  test('connects points within range with distance-falloff strength', () => {
    const wires = buildWires([{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.1 }], { maxDistance: 0.2, maxWires: 8 });
    expect(wires).toHaveLength(1);
    expect(wires[0]?.strength).toBeCloseTo(1 - 0.1 / 0.2, 5);
  });

  test('ignores pairs beyond maxDistance', () => {
    expect(buildWires([{ x: 0, y: 0 }, { x: 1, y: 1 }], { maxDistance: 0.2, maxWires: 8 })).toEqual([]);
  });

  test('caps the number of wires, keeping the strongest', () => {
    const cluster = [
      { x: 0.1, y: 0.1 },
      { x: 0.12, y: 0.1 },
      { x: 0.14, y: 0.1 },
      { x: 0.16, y: 0.1 },
    ];
    const wires = buildWires(cluster, { maxDistance: 0.3, maxWires: 2 });
    expect(wires).toHaveLength(2);
    const [first, second] = wires;
    expect(first?.strength ?? 0).toBeGreaterThanOrEqual(second?.strength ?? 0);
  });

  test('is deterministic for identical input', () => {
    const points = [{ x: 0.3, y: 0.4 }, { x: 0.35, y: 0.45 }, { x: 0.5, y: 0.5 }];
    const options = { maxDistance: 0.25, maxWires: 16 };
    expect(buildWires(points, options)).toEqual(buildWires(points, options));
  });
});
```

- [ ] **Step 7.2: Run test to verify it fails**

```bash
pnpm vitest run src/components/trace-stage/overlay/wires/wires.test.ts
```

Expected: FAIL — module missing.

- [ ] **Step 7.3: Write the implementation**

```ts
// Plexus wire construction: connect every pair of feature points closer than
// maxDistance, strength falling off linearly, capped to the strongest maxWires.
// Pure and deterministic — no randomness, so frames are stable for testing.

import type { Point, Wire } from '../../types';

export type WireOptions = { maxDistance: number; maxWires: number };

export const buildWires = (points: readonly Point[], options: WireOptions): readonly Wire[] =>
  points
    .flatMap((a, indexA) =>
      points.slice(indexA + 1).map((b) => {
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        return { a, b, strength: 1 - distance / options.maxDistance };
      }),
    )
    .filter((wire) => wire.strength > 0)
    .sort((left, right) => right.strength - left.strength)
    .slice(0, options.maxWires);
```

- [ ] **Step 7.4: Run test + commit**

```bash
pnpm vitest run src/components/trace-stage/overlay/wires/wires.test.ts
git add src/components/trace-stage/overlay/wires
git commit -m "feat(trace): add plexus wire builder"
```

Expected: PASS (4 tests), then commit succeeds.

---

### Task 8: detection/segmenter — MediaPipe wrapper

Side-effect module (network, WASM, GPU delegate) — isolated here, no unit test. The session treats it as an injected dependency.

**Files:**
- Create: `src/components/trace-stage/detection/segmenter/index.ts`

- [ ] **Step 8.1: Write the wrapper**

```ts
// MediaPipe ImageSegmenter wrapper — the only file that touches the ML runtime.
// Returns undefined on any load failure so the session can surface 'model-error'.

const WASM_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

export type Segmenter = {
  // Returns the person confidence mask (0..1 floats, source dimensions), or
  // undefined when the model produced nothing for this frame.
  segmentFrame: (source: TexImageSource, timestampMs: number) => Float32Array | undefined;
  close: () => void;
};

export const createSegmenter = async (): Promise<Segmenter | undefined> => {
  try {
    const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
    const segmenter = await ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    });

    return {
      segmentFrame(source, timestampMs) {
        const out: { mask: Float32Array | undefined } = { mask: undefined };
        segmenter.segmentForVideo(source, timestampMs, (result) => {
          const masks = result.confidenceMasks;
          // selfie_segmenter emits the person-probability channel last.
          const personMask = masks === undefined ? undefined : masks[masks.length - 1];
          // Copy out — the underlying WASM memory is recycled after the callback.
          out.mask = personMask?.getAsFloat32Array().slice();
        });
        return out.mask;
      },
      close() {
        segmenter.close();
      },
    };
  } catch {
    return undefined;
  }
};
```

- [ ] **Step 8.2: Verify + commit**

```bash
pnpm lint && pnpm typecheck
git add src/components/trace-stage/detection/segmenter
git commit -m "feat(trace): add MediaPipe segmenter wrapper"
```

Note: if `segmentForVideo`'s callback overload type differs in the installed version, check `node_modules/@mediapipe/tasks-vision/vision.d.ts` and adapt — do not cast with `as`.

---

### Task 9: WebGPU engine + WGSL shaders

Two fullscreen passes: feedback (trail accumulation into a fixed 640×360 r16float ping-pong, content space) and composite (darkened camera + green glow + scanlines/grain/vignette/chromatic aberration → canvas). Camera and mask arrive as textures; `coverScale` uniform maps screen→content.

**Files:**
- Create: `src/components/trace-stage/engine/shaders/fullscreen.wgsl`
- Create: `src/components/trace-stage/engine/shaders/feedback.wgsl`
- Create: `src/components/trace-stage/engine/shaders/composite.wgsl`
- Create: `src/components/trace-stage/engine/index.ts`

- [ ] **Step 9.1: Write fullscreen.wgsl** (shared vertex stage, concatenated before each fragment source)

```wgsl
// Shared fullscreen-triangle vertex stage and uniform block.

struct Params {
  coverScale: vec2f,
  resolution: vec2f,
  time: f32,
  cameraReady: f32,
  decay: f32,
  pad0: f32,
};

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vsMain(@builtin(vertex_index) index: u32) -> VSOut {
  var positions = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  let p = positions[index];
  var out: VSOut;
  out.position = vec4f(p, 0.0, 1.0);
  out.uv = vec2f(p.x * 0.5 + 0.5, 1.0 - (p.y * 0.5 + 0.5));
  return out;
}
```

- [ ] **Step 9.2: Write feedback.wgsl** (trail lives in content space — uv used directly)

```wgsl
// Trail accumulation: every texel keeps the brighter of "fresh mask" and
// "decayed previous trail", producing the lingering silhouette glow.

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var maskTexture: texture_2d<f32>;
@group(0) @binding(3) var trailTexture: texture_2d<f32>;

@fragment
fn fsMain(in: VSOut) -> @location(0) vec4f {
  let mask = textureSample(maskTexture, linearSampler, in.uv).r;
  let previous = textureSample(trailTexture, linearSampler, in.uv).r;
  let trail = max(mask, previous * params.decay);
  return vec4f(trail, 0.0, 0.0, 1.0);
}
```

- [ ] **Step 9.3: Write composite.wgsl**

```wgsl
// Final grade: cover-fit the 16:9 content into the viewport, dim the live
// camera to a monochrome stage, add the green silhouette glow, then film
// texture (scanlines, grain, vignette, slight chromatic aberration).

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var cameraTexture: texture_2d<f32>;
@group(0) @binding(3) var maskTexture: texture_2d<f32>;
@group(0) @binding(4) var trailTexture: texture_2d<f32>;

fn hash21(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453123);
}

@fragment
fn fsMain(in: VSOut) -> @location(0) vec4f {
  // Screen → content (camera) space; matches math/contentToScreen inverse.
  let uv = (in.uv - vec2f(0.5)) * params.coverScale + vec2f(0.5);

  let aberration = 0.0016;
  let camR = textureSample(cameraTexture, linearSampler, uv + vec2f(aberration, 0.0)).r;
  let camG = textureSample(cameraTexture, linearSampler, uv).g;
  let camB = textureSample(cameraTexture, linearSampler, uv - vec2f(aberration, 0.0)).b;
  let cam = vec3f(camR, camG, camB) * params.cameraReady;
  let luma = dot(cam, vec3f(0.2126, 0.7152, 0.0722));

  let trail = textureSample(trailTexture, linearSampler, uv).r;
  let mask = textureSample(maskTexture, linearSampler, uv).r;

  // Dim monochrome stage with a whisper of the live color image.
  var color = vec3f(luma) * 0.16 + cam * 0.05;
  // Green silhouette glow: lingering trail plus a brighter fresh-mask core.
  let lineGreen = vec3f(0.486, 0.988, 0.0);
  color += lineGreen * (trail * 0.20 + mask * 0.10);

  let scan = 0.93 + 0.07 * sin(in.uv.y * params.resolution.y * 3.14159265);
  color *= scan;
  let grain = hash21(in.uv * params.resolution + vec2f(fract(params.time) * 61.0, 0.0));
  color += (grain - 0.5) * 0.035;
  let vignette = 1.0 - smoothstep(0.55, 0.95, distance(in.uv, vec2f(0.5))) * 0.5;
  color *= vignette;

  return vec4f(color, 1.0);
}
```

- [ ] **Step 9.4: Write engine/index.ts**

```ts
// Framework-free WebGPU engine for the trace stage. Two fullscreen passes:
// feedback (mask → decaying trail, fixed content-space resolution) and
// composite (camera + mask + trail → graded canvas image). The session feeds
// one TraceFrameInput per RAF; textures arrive via updateCamera/updateMask.

import type { TraceFrameInput } from '../types';
import compositeSource from './shaders/composite.wgsl';
import feedbackSource from './shaders/feedback.wgsl';
import fullscreenSource from './shaders/fullscreen.wgsl';

export type TraceEngine = {
  frame: (input: TraceFrameInput) => void;
  resize: (cssWidth: number, cssHeight: number, devicePixelRatio: number) => void;
  updateCamera: (video: HTMLVideoElement) => void;
  updateMask: (mask: Uint8Array, width: number, height: number) => void;
  lost: Promise<GPUDeviceLostInfo>;
  destroy: () => void;
};

const TRAIL_WIDTH = 640;
const TRAIL_HEIGHT = 360;
const MAX_DPR = 2;
const TRAIL_DECAY = 0.94;
// coverScale(vec2) + resolution(vec2) + time + cameraReady + decay + pad = 8 floats.
const PARAMS_FLOAT_COUNT = 8;

type EngineTextures = {
  camera: GPUTexture;
  mask: GPUTexture;
  trailA: GPUTexture;
  trailB: GPUTexture;
};

const createTexture = (device: GPUDevice, width: number, height: number, format: GPUTextureFormat, usage: number): GPUTexture =>
  device.createTexture({ size: { width, height }, format, usage });

const sampledCopyUsage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST;
const sampledRenderUsage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT;
const cameraUsage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT;

export const createTraceEngine = async (canvas: HTMLCanvasElement): Promise<TraceEngine | undefined> => {
  if (navigator.gpu === undefined) return undefined;
  const adapter = await navigator.gpu.requestAdapter();
  if (adapter === null) return undefined;
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (context === null) {
    device.destroy();
    return undefined;
  }
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });

  const feedbackModule = device.createShaderModule({ code: `${fullscreenSource}\n${feedbackSource}` });
  const compositeModule = device.createShaderModule({ code: `${fullscreenSource}\n${compositeSource}` });
  const feedbackPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: feedbackModule, entryPoint: 'vsMain' },
    fragment: { module: feedbackModule, entryPoint: 'fsMain', targets: [{ format: 'r16float' }] },
    primitive: { topology: 'triangle-list' },
  });
  const compositePipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: compositeModule, entryPoint: 'vsMain' },
    fragment: { module: compositeModule, entryPoint: 'fsMain', targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
  });

  const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
  const uniformBuffer = device.createBuffer({ size: PARAMS_FLOAT_COUNT * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const uniformData = new Float32Array(PARAMS_FLOAT_COUNT);

  const state = {
    textures: {
      camera: createTexture(device, 1, 1, 'rgba8unorm', cameraUsage),
      mask: createTexture(device, 1, 1, 'r8unorm', sampledCopyUsage),
      trailA: createTexture(device, TRAIL_WIDTH, TRAIL_HEIGHT, 'r16float', sampledRenderUsage),
      trailB: createTexture(device, TRAIL_WIDTH, TRAIL_HEIGHT, 'r16float', sampledRenderUsage),
    } satisfies EngineTextures,
    feedbackGroups: [] as GPUBindGroup[],
    compositeGroups: [] as GPUBindGroup[],
    parity: 0,
    dirty: true,
    destroyed: false,
  };

  const rebuildBindGroups = (): void => {
    const { camera, mask, trailA, trailB } = state.textures;
    const feedbackEntries = (read: GPUTexture): GPUBindGroupEntry[] => [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: sampler },
      { binding: 2, resource: mask.createView() },
      { binding: 3, resource: read.createView() },
    ];
    const compositeEntries = (read: GPUTexture): GPUBindGroupEntry[] => [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: sampler },
      { binding: 2, resource: camera.createView() },
      { binding: 3, resource: mask.createView() },
      { binding: 4, resource: read.createView() },
    ];
    state.feedbackGroups = [
      device.createBindGroup({ layout: feedbackPipeline.getBindGroupLayout(0), entries: feedbackEntries(trailB) }),
      device.createBindGroup({ layout: feedbackPipeline.getBindGroupLayout(0), entries: feedbackEntries(trailA) }),
    ];
    state.compositeGroups = [
      device.createBindGroup({ layout: compositePipeline.getBindGroupLayout(0), entries: compositeEntries(trailA) }),
      device.createBindGroup({ layout: compositePipeline.getBindGroupLayout(0), entries: compositeEntries(trailB) }),
    ];
    state.dirty = false;
  };

  const runPass = (encoder: GPUCommandEncoder, pipeline: GPURenderPipeline, bindGroup: GPUBindGroup, view: GPUTextureView): void => {
    const pass = encoder.beginRenderPass({ colorAttachments: [{ view, loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
  };

  return {
    frame(input) {
      if (state.destroyed) return;
      if (state.dirty) rebuildBindGroups();
      uniformData.set([input.coverScale.x, input.coverScale.y, canvas.width, canvas.height, input.timeSeconds, input.cameraReady, TRAIL_DECAY, 0]);
      device.queue.writeBuffer(uniformBuffer, 0, uniformData);

      const writeTrail = state.parity === 0 ? state.textures.trailA : state.textures.trailB;
      const feedbackGroup = state.feedbackGroups[state.parity];
      const compositeGroup = state.compositeGroups[state.parity];
      if (feedbackGroup === undefined || compositeGroup === undefined) return;

      const encoder = device.createCommandEncoder();
      runPass(encoder, feedbackPipeline, feedbackGroup, writeTrail.createView());
      runPass(encoder, compositePipeline, compositeGroup, context.getCurrentTexture().createView());
      device.queue.submit([encoder.finish()]);
      state.parity = 1 - state.parity;
    },
    resize(cssWidth, cssHeight, devicePixelRatio) {
      const dpr = Math.min(devicePixelRatio, MAX_DPR);
      canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
      canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
    },
    updateCamera(video) {
      if (video.videoWidth === 0 || state.destroyed) return;
      if (state.textures.camera.width !== video.videoWidth || state.textures.camera.height !== video.videoHeight) {
        state.textures.camera.destroy();
        state.textures.camera = createTexture(device, video.videoWidth, video.videoHeight, 'rgba8unorm', cameraUsage);
        state.dirty = true;
      }
      device.queue.copyExternalImageToTexture({ source: video }, { texture: state.textures.camera }, { width: video.videoWidth, height: video.videoHeight });
    },
    updateMask(mask, width, height) {
      if (state.destroyed) return;
      if (state.textures.mask.width !== width || state.textures.mask.height !== height) {
        state.textures.mask.destroy();
        state.textures.mask = createTexture(device, width, height, 'r8unorm', sampledCopyUsage);
        state.dirty = true;
      }
      device.queue.writeTexture({ texture: state.textures.mask }, mask, { bytesPerRow: width }, { width, height });
    },
    lost: device.lost,
    destroy() {
      state.destroyed = true;
      device.destroy();
    },
  };
};
```

- [ ] **Step 9.5: Verify + commit**

```bash
pnpm lint && pnpm typecheck
git add src/components/trace-stage/engine
git commit -m "feat(trace): add WebGPU trail/composite engine with WGSL shaders"
```

Note: `r16float` is render-attachable and filterable per the WebGPU spec — no extra feature flags required. If `writeTexture` complains about `bytesPerRow` for odd widths, keep mask width even (320 is).

---

### Task 10: overlay/sketch — p5 renderer

p5 2D instance mode on a transparent canvas. Reads an `OverlayFrame` via getter each draw; maps content UV → screen px with `contentToScreen`.

**Files:**
- Create: `src/components/trace-stage/overlay/sketch/index.ts`

- [ ] **Step 10.1: Write the sketch module**

```ts
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
const COLOR_LINE = '#7cfc00';
const COLOR_HUD = '#39c5cf';
const COLOR_HUD_TEXT = '#9fe8ee';
const COLOR_WIRE = '#cfe8cf';
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
    p.stroke(124, 252, 0, alpha);
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
    p.stroke(207, 232, 207, wire.strength * 150);
    p.strokeWeight(0.75);
    p.line(a.x, a.y, b.x, b.y);
    p.stroke(COLOR_WIRE);
    p.strokeWeight(2.5);
    p.point(a.x, a.y);
    p.point(b.x, b.y);
  }

  // Blob bboxes + labels.
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
    p.setup = () => {
      p.createCanvas(container.clientWidth, container.clientHeight);
      p.textFont('monospace');
      p.textSize(11);
    };
    p.draw = () => {
      drawFrame(p, getFrame());
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
```

Note: `p.setup`/`p.draw` assignments are property writes on the p5 instance (allowed); the arrow-function-only rule still holds. If oxlint flags the dynamic-import destructure naming (`default: p5` shadowing type import `P5`), it doesn't — they differ in case; keep both.

- [ ] **Step 10.2: Verify + commit**

```bash
pnpm lint && pnpm typecheck
git add src/components/trace-stage/overlay/sketch
git commit -m "feat(trace): add p5 overlay renderer"
```

---

### Task 11: session — orchestration

Framework-free glue, mirroring `fluid-stage/session`: owns RAF, camera, segmenter, engine, overlay, detection pipeline, history ring, resize, fullscreen key, dispose.

**Files:**
- Create: `src/components/trace-stage/session/index.ts`

- [ ] **Step 11.1: Write the session**

```ts
// DOM/GPU/ML session glue (no React): owns the RAF loop, webcam, MediaPipe
// segmentation, detection pipeline, history ring and disposal. The hook only
// mounts/unmounts it. Mirrors fluid-stage/session deliberately.

import { findBlobs, trackBlobs } from '../detection/blob-tracker';
import { traceContours } from '../detection/marching-squares';
import { createSegmenter, type Segmenter } from '../detection/segmenter';
import { simplify } from '../detection/simplify';
import { createTraceEngine, type TraceEngine } from '../engine';
import { coverScale } from '../math';
import { createOverlay, type OverlayHandle } from '../overlay/sketch';
import { buildWires } from '../overlay/wires';
import type { Contour, CoverScale, OverlayFrame, TraceStatus, TrackedBlob, Wire } from '../types';

export type TraceSession = {
  dispose: () => void;
};

const SEG_WIDTH = 320;
const SEG_HEIGHT = 180;
const MASK_THRESHOLD = 0.5;
const MIN_BLOB_CELLS = 60;
const SIMPLIFY_EPSILON = 0.006;
const CONTOUR_SAMPLE_STRIDE = 6;
const WIRE_OPTIONS = { maxDistance: 0.22, maxWires: 48 };
const HISTORY_EVERY_N_FRAMES = 3;
const HISTORY_MAX = 10;
const RESIZE_DEBOUNCE_MS = 180;
const MAX_DT_SECONDS = 1 / 20;

type SessionState = {
  disposed: boolean;
  engine: TraceEngine | undefined;
  segmenter: Segmenter | undefined;
  overlay: OverlayHandle | undefined;
  video: HTMLVideoElement | undefined;
  stream: MediaStream | undefined;
  rafId: number;
  lastTimestampMs: number;
  timeSeconds: number;
  frameCount: number;
  resizeTimer: number;
  canvasWidth: number;
  canvasHeight: number;
  cover: CoverScale;
  contours: readonly Contour[];
  history: readonly (readonly Contour[])[];
  blobs: readonly TrackedBlob[];
  wires: readonly Wire[];
  nextBlobId: number;
  maskBytes: Uint8Array;
};

type CameraHandles = { video: HTMLVideoElement; stream: MediaStream };

// Same acquisition shape as fluid-stage/session — kept local on purpose; the
// two stages have independent lifecycles and the helper is ~20 lines.
const acquireCamera = async (): Promise<CameraHandles | undefined> => {
  if (navigator.mediaDevices === undefined) return undefined;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    });
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    return { video, stream };
  } catch {
    return undefined;
  }
};

const stopStream = (stream: MediaStream | undefined): void => {
  if (stream === undefined) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
};

const toggleFullscreen = async (element: Element): Promise<void> => {
  try {
    if (document.fullscreenElement === null) {
      await element.requestFullscreen();
      return;
    }
    await document.exitFullscreen();
  } catch {
    // Fullscreen can be rejected; the show goes on.
  }
};

const watchDeviceLost = async (engine: TraceEngine, state: SessionState, onStatus: (status: TraceStatus) => void): Promise<void> => {
  const info = await engine.lost;
  if (!state.disposed && info.reason !== 'destroyed') onStatus('lost');
};

// Sample contour vertices (every Nth) plus blob centroids as wire anchors.
const wireAnchors = (contours: readonly Contour[], blobs: readonly TrackedBlob[]): readonly { x: number; y: number }[] => [
  ...blobs.map((blob) => ({ x: blob.cx, y: blob.cy })),
  ...contours.flatMap((contour) => contour.filter((_, index) => index % CONTOUR_SAMPLE_STRIDE === 0)),
];

export const createTraceSession = (canvas: HTMLCanvasElement, overlayContainer: HTMLElement, onStatus: (status: TraceStatus) => void): TraceSession => {
  const state: SessionState = {
    disposed: false,
    engine: undefined,
    segmenter: undefined,
    overlay: undefined,
    video: undefined,
    stream: undefined,
    rafId: 0,
    lastTimestampMs: 0,
    timeSeconds: 0,
    frameCount: 0,
    resizeTimer: 0,
    canvasWidth: 1,
    canvasHeight: 1,
    cover: { x: 1, y: 1 },
    contours: [],
    history: [],
    blobs: [],
    wires: [],
    nextBlobId: 0,
    maskBytes: new Uint8Array(SEG_WIDTH * SEG_HEIGHT),
  };

  const segCanvas = document.createElement('canvas');
  segCanvas.width = SEG_WIDTH;
  segCanvas.height = SEG_HEIGHT;
  const segContext = segCanvas.getContext('2d', { willReadFrequently: false });

  const overlayFrame = (): OverlayFrame => ({
    contours: state.contours,
    history: state.history,
    blobs: state.blobs,
    wires: state.wires,
    coverScale: state.cover,
  });

  const detect = (timestampMs: number): void => {
    if (state.segmenter === undefined || state.video === undefined || segContext === null) return;
    segContext.drawImage(state.video, 0, 0, SEG_WIDTH, SEG_HEIGHT);
    const mask = state.segmenter.segmentFrame(segCanvas, timestampMs);
    if (mask === undefined || mask.length !== SEG_WIDTH * SEG_HEIGHT) return;

    for (const [index, value] of mask.entries()) {
      state.maskBytes[index] = Math.min(255, Math.max(0, Math.round(value * 255)));
    }
    state.engine?.updateMask(state.maskBytes, SEG_WIDTH, SEG_HEIGHT);

    const raw = traceContours(mask, SEG_WIDTH, SEG_HEIGHT, MASK_THRESHOLD);
    state.contours = raw.map((contour) => simplify(contour, SIMPLIFY_EPSILON));
    const tracked = trackBlobs(state.blobs, findBlobs(mask, SEG_WIDTH, SEG_HEIGHT, MASK_THRESHOLD, MIN_BLOB_CELLS), state.nextBlobId);
    state.blobs = tracked.blobs;
    state.nextBlobId = tracked.nextId;
    state.wires = buildWires(wireAnchors(state.contours, state.blobs), WIRE_OPTIONS);

    if (state.frameCount % HISTORY_EVERY_N_FRAMES === 0 && state.contours.length > 0) {
      state.history = [...state.history, state.contours].slice(-HISTORY_MAX);
    }
  };

  const tick = (timestampMs: number): void => {
    if (state.disposed || state.engine === undefined) return;
    const elapsedMs = state.lastTimestampMs === 0 ? 1000 / 60 : timestampMs - state.lastTimestampMs;
    const dtSeconds = Math.min(elapsedMs / 1000, MAX_DT_SECONDS);
    state.lastTimestampMs = timestampMs;
    state.timeSeconds += dtSeconds;
    state.frameCount += 1;

    if (state.video !== undefined) {
      state.engine.updateCamera(state.video);
      detect(timestampMs);
    }
    state.engine.frame({
      dtSeconds,
      timeSeconds: state.timeSeconds,
      cameraReady: state.video !== undefined ? 1 : 0,
      coverScale: state.cover,
    });
    state.rafId = requestAnimationFrame(tick);
  };

  const syncSize = (): void => {
    const rect = canvas.getBoundingClientRect();
    state.canvasWidth = Math.max(rect.width, 1);
    state.canvasHeight = Math.max(rect.height, 1);
    const contentAspect = state.video !== undefined && state.video.videoHeight > 0 ? state.video.videoWidth / state.video.videoHeight : 16 / 9;
    state.cover = coverScale(contentAspect, state.canvasWidth / state.canvasHeight);
    state.engine?.resize(state.canvasWidth, state.canvasHeight, window.devicePixelRatio);
    state.overlay?.resize(state.canvasWidth, state.canvasHeight);
  };

  const attachListeners = (): readonly (() => void)[] => {
    const onKeyDown = async (event: KeyboardEvent): Promise<void> => {
      if (event.key === 'f' || event.key === 'F') {
        await toggleFullscreen(canvas.parentElement ?? canvas);
      }
    };
    const onVisibility = (): void => {
      if (document.hidden === true) {
        cancelAnimationFrame(state.rafId);
        state.lastTimestampMs = 0;
        return;
      }
      if (!state.disposed && state.engine !== undefined) state.rafId = requestAnimationFrame(tick);
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibility);
    const observer = new ResizeObserver(() => {
      window.clearTimeout(state.resizeTimer);
      state.resizeTimer = window.setTimeout(syncSize, RESIZE_DEBOUNCE_MS);
    });
    observer.observe(canvas);
    return [() => window.removeEventListener('keydown', onKeyDown), () => document.removeEventListener('visibilitychange', onVisibility), () => observer.disconnect()];
  };

  const boot = async (): Promise<readonly (() => void)[]> => {
    const engine = await createTraceEngine(canvas);
    if (state.disposed) {
      engine?.destroy();
      return [];
    }
    if (engine === undefined) {
      onStatus('no-webgpu');
      return [];
    }
    state.engine = engine;
    void watchDeviceLost(engine, state, onStatus);
    syncSize();

    const cleanups = attachListeners();
    state.rafId = requestAnimationFrame(tick);

    state.overlay = await createOverlay(overlayContainer, overlayFrame);
    if (state.disposed) return cleanups;
    state.overlay.resize(state.canvasWidth, state.canvasHeight);

    const camera = await acquireCamera();
    if (state.disposed) {
      stopStream(camera?.stream);
      return cleanups;
    }
    if (camera === undefined) {
      onStatus('no-camera');
      return cleanups;
    }
    state.video = camera.video;
    state.stream = camera.stream;
    syncSize();

    state.segmenter = await createSegmenter();
    if (state.disposed) return cleanups;
    onStatus(state.segmenter === undefined ? 'model-error' : 'running');
    return cleanups;
  };

  const cleanupsPromise = boot();

  return {
    dispose() {
      state.disposed = true;
      cancelAnimationFrame(state.rafId);
      window.clearTimeout(state.resizeTimer);
      void disposeAsync(cleanupsPromise, state);
    },
  };
};

const disposeAsync = async (cleanupsPromise: Promise<readonly (() => void)[]>, state: SessionState): Promise<void> => {
  const cleanups = await cleanupsPromise;
  for (const cleanup of cleanups) {
    cleanup();
  }
  stopStream(state.stream);
  state.segmenter?.close();
  state.overlay?.remove();
  state.engine?.destroy();
};
```

- [ ] **Step 11.2: Verify + commit**

```bash
pnpm lint && pnpm typecheck
git add src/components/trace-stage/session
git commit -m "feat(trace): add trace session orchestration"
```

---

### Task 12: Component, hook, styles, smoke test

**Files:**
- Create: `src/components/trace-stage/use-trace-fx.ts`
- Create: `src/components/trace-stage/styles.css.ts`
- Create: `src/components/trace-stage/index.tsx`
- Test: `src/components/trace-stage/trace-stage.test.tsx`

- [ ] **Step 12.1: Write the failing smoke test**

```tsx
import { describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { TraceStage } from '.';

describe('TraceStage', () => {
  test('renders the stage canvas with an accessible description', async () => {
    render(<TraceStage />);
    await expect.element(page.getByRole('img', { name: /輪郭トレース/ })).toBeInTheDocument();
  });

  test('shows the interaction hint', async () => {
    render(<TraceStage />);
    await expect.element(page.getByText(/F: フルスクリーン/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 12.2: Run test to verify it fails**

```bash
pnpm vitest run src/components/trace-stage/trace-stage.test.tsx
```

Expected: FAIL — `TraceStage` not exported.

- [ ] **Step 12.3: Write use-trace-fx.ts**

```ts
'use client';

// Thin React adapter: mounts the imperative trace session and exposes its status.

import { useEffect, useState, type RefObject } from 'react';

import { createTraceSession } from './session';
import type { TraceStatus } from './types';

export const useTraceFx = (canvasRef: RefObject<HTMLCanvasElement | null>, overlayRef: RefObject<HTMLDivElement | null>): TraceStatus => {
  const [status, setStatus] = useState<TraceStatus>('booting');

  useEffect(() => {
    // USEEFFECT_JUSTIFICATION: imperative WebGPU/MediaStream/p5 session bound to
    // DOM node lifecycles — cannot be expressed as data fetching or derived state.
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (canvas === null || overlay === null) return;
    const session = createTraceSession(canvas, overlay, setStatus);

    return () => {
      session.dispose();
    };
  }, [canvasRef, overlayRef]);

  return status;
};
```

- [ ] **Step 12.4: Write styles.css.ts**

```ts
import { css } from 'styled-system/css';

export const root = css({
  position: 'fixed',
  inset: '0',
  bg: 'trace.bg',
  overflow: 'hidden',
});

export const canvas = css({
  display: 'block',
  width: 'full',
  height: 'full',
});

export const overlay = css({
  position: 'absolute',
  inset: '0',
  pointerEvents: 'none',
  // p5 injects its canvas as a child; pin it to the stage.
  '& canvas': {
    display: 'block',
    width: 'full',
    height: 'full',
  },
});

export const notice = css({
  position: 'absolute',
  inset: '0',
  display: 'grid',
  placeItems: 'center',
  textAlign: 'center',
  padding: '8',
  color: 'trace.text',
  fontSize: 'md',
  lineHeight: 'relaxed',
  pointerEvents: 'none',
  '&[data-tone="soft"]': {
    inset: 'auto',
    top: '4',
    left: '4',
    padding: '0',
    color: 'trace.dim',
    fontSize: 'sm',
    textAlign: 'left',
  },
});

export const hint = css({
  position: 'absolute',
  bottom: '5',
  left: '50%',
  transform: 'translateX(-50%)',
  color: 'trace.dim',
  fontSize: 'sm',
  letterSpacing: 'wide',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  transition: 'opacity 1.2s ease',
  '&[data-visible="false"]': { opacity: '0' },
});
```

Note: `overlay` uses a `& canvas` child selector — the components rule bans child selectors for styling *our own* markup, but the p5-injected canvas is third-party DOM we cannot class; this is the same category as the allowed `&[data-*]` exceptions. If oxlint/panda flags it, move the pinning into the sketch via `p5.Element` styles and document why.

- [ ] **Step 12.5: Write index.tsx**

```tsx
'use client';

// "Trace" — TouchDesigner-style trace & blob tracking FX. The webcam silhouette
// is contour-traced in green wireframe with echo trails; blob bboxes, HUD
// labels and plexus wires render on a transparent p5 canvas above the WGSL
// graded video layer.

import { useEffect, useRef, useState } from 'react';

import * as styles from './styles.css';
import type { TraceStatus } from './types';
import { useTraceFx } from './use-trace-fx';

const HINT_VISIBLE_MS = 7000;

const noticeText = (status: TraceStatus): string | undefined => {
  switch (status) {
    case 'no-webgpu':
      return 'この表現には WebGPU 対応ブラウザが必要です。Chrome / Edge / Arc の最新版でお試しください。';
    case 'lost':
      return 'GPU との接続が失われました。ページを再読み込みしてください。';
    case 'no-camera':
      return 'camera off — カメラを許可すると身体のトレースが始まります';
    case 'model-error':
      return '検出モデルの読み込みに失敗しました。ネットワークを確認して再読み込みしてください。';
    case 'booting':
    case 'running':
      return undefined;
  }
};

const useFadeOut = (delayMs: number): boolean => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // USEEFFECT_JUSTIFICATION: one-shot wall-clock timer to fade the on-stage hint;
    // not derivable from props/state and must be cleaned up on unmount.
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [delayMs]);

  return visible;
};

export const TraceStage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const status = useTraceFx(canvasRef, overlayRef);
  const hintVisible = useFadeOut(HINT_VISIBLE_MS);
  const notice = noticeText(status);
  const tone = status === 'no-camera' ? 'soft' : 'alert';

  return (
    <div className={styles.root} data-status={status}>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="輪郭トレース。カメラに映る身体の輪郭がワイヤーフレームでトレースされます。" />
      <div ref={overlayRef} className={styles.overlay} aria-hidden="true" />
      {notice !== undefined && (
        <p className={styles.notice} data-tone={tone}>
          {notice}
        </p>
      )}
      <p className={styles.hint} data-visible={hintVisible ? 'true' : 'false'}>
        カメラの前で動くと輪郭がトレースされます · F: フルスクリーン
      </p>
    </div>
  );
};
```

- [ ] **Step 12.6: Run smoke test to verify it passes**

```bash
pnpm vitest run src/components/trace-stage/trace-stage.test.tsx
```

Expected: PASS (2 tests). The headless browser has no camera and may lack WebGPU — the component must render its canvas + hint regardless of session outcome (it does: session failures only change `data-status`/notice).

- [ ] **Step 12.7: Run the full suite + commit**

```bash
pnpm vitest run && pnpm lint && pnpm typecheck
git add src/components/trace-stage
git commit -m "feat(trace): add TraceStage component with status notices"
```

---

### Task 13: Route page

**Files:**
- Create: `src/app/(frontend)/trace/page.tsx`

- [ ] **Step 13.1: Write the page** (mirrors `(frontend)/page.tsx`; semantic-html rule: one h1, srOnly)

```tsx
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { css } from 'styled-system/css';

import { TraceStage } from '@components/trace-stage';

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Trace — body wireframe tracking',
  description: 'WebGPU/WGSL + p5.js のトレース & ブロブトラッキング FX。カメラに映る身体の輪郭が緑のワイヤーフレームでトレースされ、残像とトラッキング HUD が重なります。',
};

export const viewport: Viewport = {
  themeColor: '#0b0e0b',
};

const main = css({ minHeight: '100dvh', bg: 'trace.bg' });
const srOnly = css({ srOnly: true });
const fallback = css({
  position: 'fixed',
  inset: '0',
  display: 'grid',
  placeItems: 'center',
  bg: 'trace.bg',
  color: 'trace.dim',
  fontSize: 'sm',
});

const TracePage = () => (
  <main className={main}>
    <section>
      <h1 className={srOnly}>Trace — 身体輪郭のワイヤーフレームトラッキング</h1>
      <ErrorBoundary fallback={<p className={fallback}>トレース FX の初期化に失敗しました。再読み込みしてください。</p>}>
        <Suspense fallback={<div className={fallback} aria-hidden="true" />}>
          <TraceStage />
        </Suspense>
      </ErrorBoundary>
    </section>
  </main>
);

export default TracePage;
```

(Confirm the `@components/*` alias exists in `tsconfig.json` `paths` before using it; if the existing page style — relative import — is the only working pattern, match it instead. Do not modify `paths`.)

- [ ] **Step 13.2: Verify + commit**

```bash
pnpm lint && pnpm typecheck
git add "src/app/(frontend)/trace"
git commit -m "feat(trace): add /trace route page"
```

---

### Task 14: Full verification

- [ ] **Step 14.1: Run everything**

```bash
pnpm lint && pnpm typecheck && pnpm test:run
```

Expected: all pass.

- [ ] **Step 14.2: Manual verification with chrome-devtools (CLAUDE.md rule)**

Do NOT launch the dev server yourself — the user consistently declines agent-launched servers in this repo. Ask the user to run `pnpm dev` and tell you the port (it varies, e.g. 3002), then verify with chrome-devtools MCP against `http://localhost:<port>/trace`:

1. Page loads; canvas fills viewport; hint text visible and fades after ~7s.
2. Grant camera → green silhouette glow appears on the video layer; wireframe contour hugs the body; bbox + `blob_00 …` label tracks you; wires connect contour points; moving leaves echo trails.
3. **Mask polarity check**: if the BACKGROUND is traced instead of the person, flip `masks[masks.length - 1]` → `masks[0]` in `detection/segmenter/index.ts`.
4. **Alignment check**: resize the window to extreme aspect ratios — the bbox must stay glued to the body (cover-fit contract between composite.wgsl and overlay).
5. Deny camera (fresh profile) → `camera off —` soft notice, no crash.
6. Accessibility snapshot: one h1, canvas has role="img" + Japanese description, overlay div is aria-hidden, text contrast vs `#0b0e0b` passes AA.
7. Performance: check rendering stays ~60fps; if segmentation stalls the loop, set a `SEGMENT_EVERY_N_FRAMES = 2` skip in `session/index.ts` `detect()` gated on `state.frameCount % 2 === 0`.

- [ ] **Step 14.3: Final commit (tuning deltas from manual verification, if any)**

```bash
git add -A src/components/trace-stage
git commit -m "feat(trace): tune trace FX after manual verification"
```

---

## Self-Review Notes (already applied)

- Spec coverage: elements A (Tasks 3/4/10/11 history ring + 9 feedback), B (Tasks 5/6/10), C (Tasks 7/10), D (Task 9 composite) — all covered; CV-green tokens (Task 0), `/trace` route (Task 13), error states (Tasks 11/12), TDD pure functions (Tasks 2–7), vitest smoke (Task 12), final verification incl. chrome-devtools (Task 14).
- Type consistency: `Point/Contour/RawBlob/TrackedBlob/Wire/CoverScale/OverlayFrame/TraceFrameInput/TraceStatus` defined once in Task 1 and imported everywhere; `coverScale`/`contentToScreen` names match across math, session, sketch, and the WGSL comment contract.
- Known judgment calls documented inline: selfie-segmenter mask channel polarity (runtime check, Step 14.2.3), `@types/p5` vs bundled types (Step 0.2), `& canvas` selector exception (Step 12.4), no mirroring anywhere (camera-of-subject framing like the reference videos).
