# JPEG Glitch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/jpeg-glitch` page that recreates the AE "JPEG Glitch" plugin on a live camera feed: real YCbCr/8x8-DCT/quantization run on the GPU, with coefficients deliberately corrupted in real time.

**Architecture:** Hybrid — p5.js (instance mode, `noCanvas()`) owns camera capture + the frame loop; a raw WebGPU engine (same shape as `src/components/fluid-stage/engine`) owns the visible canvas and runs three WGSL passes: color-separate (RGB→YCbCr + chroma collapse) → dct-corrupt (forward DCT → quantize/corrupt → inverse DCT, one workgroup per 8x8 block) → render (block-row shift + YCbCr→RGB). UI is a left side panel of react-aria-components sliders.

**Tech Stack:** Next.js 15 App Router, React 19, p5.js (new dep), raw WebGPU + WGSL, Panda CSS, react-aria-components, vitest browser mode (TDD for `math/`).

**Spec:** `docs/superpowers/specs/2026-06-11-jpeg-glitch-design.md`

---

## Repo-wide caveats (read first)

1. **Pre-commit hook currently fails on unrelated WIP** (`src/components/poly-trace/` has lint errors from another in-progress effort). Do NOT touch poly-trace. For every commit in this plan:
   - First verify YOUR files are clean: `npx oxlint src/components/jpeg-glitch-stage src/app/\(frontend\)/jpeg-glitch && pnpm typecheck`
   - Then commit with `git commit --no-verify` (scoped to your files via explicit paths).
2. **`.wgsl` imports** are already wired: next.config.ts uses asset/source, vitest.config.ts has a `wgsl-as-source` plugin, and `src/types/shaders.d.ts` declares `*.wgsl`. No config changes needed.
3. **Run a single test file:** `pnpm vitest run src/components/jpeg-glitch-stage/math/hash/hash.test.ts`
4. **Project lint rules that WILL bite you:** no `let`, no `forEach`, no `Array.push`, no `++`, no IIFE, no `as` (use `satisfies` / narrowing switch), no `String()`/`Number()` (use template literal / `parseInt`), arrow functions only, max nesting 2. Mutable state goes in a `const state = {...}` object (see `fluid-stage/session/index.ts` for the blessed pattern).
5. WGSL files are not linted by oxlint; `var`/loops inside WGSL are fine.

## File structure (final)

```
src/app/(frontend)/jpeg-glitch/page.tsx          ← Server Component (metadata + boundaries)
src/components/jpeg-glitch-stage/
├── index.tsx                                    ← 'use client' stage (canvas + controls + notice)
├── styles.css.ts
├── jpeg-glitch-stage.test.tsx
├── types.ts                                     ← GlitchParams / GlitchStatus / FrameInput / DEFAULT_PARAMS
├── use-jpeg-glitch.ts                           ← React adapter hook
├── sketch/index.ts                              ← p5 instance mode (camera + loop)
├── session/index.ts                             ← glue: engine + sketch + resize (no React)
├── engine/
│   ├── index.ts                                 ← createGlitchEngine
│   ├── pipelines.ts
│   ├── resources.ts
│   ├── bind-groups.ts
│   ├── shader-sources.ts
│   └── shaders/{common,color-separate,dct-corrupt,render}.wgsl
├── math/
│   ├── hash/{index.ts, hash.test.ts}            ← lowbias32 (TS mirror of WGSL hash)
│   ├── dct/{index.ts, dct.test.ts}              ← TS reference 8x8 DCT (spec for WGSL)
│   ├── quant-table/{index.ts, quant-table.test.ts}
│   ├── proc-size/{index.ts, proc-size.test.ts}  ← processing-resolution fit (multiples of 8)
│   └── glitch-params/{index.ts, glitch-params.test.ts} ← normalize + uniform packing
└── controls/
    ├── index.tsx                                ← GlitchControls (react-aria sliders)
    ├── styles.css.ts
    └── controls.test.tsx
```

Naming note (acronym-casing rule): identifiers use `JPEGGlitchStage`, `useJPEGGlitch`; files/dirs stay kebab-case (`jpeg-glitch-stage`).

---

### Task 1: Install p5.js and wire its types

**Files:**
- Modify: `package.json` (via pnpm)
- Maybe create: `src/types/p5.d.ts` (only if installed p5 lacks usable types)

- [ ] **Step 1: Install**

```bash
pnpm add p5
```

- [ ] **Step 2: Probe types**

Write a throwaway check in `src/components/jpeg-glitch-stage/sketch/index.ts`:

```ts
import p5 from 'p5';

export const probe = (): string => `${typeof p5}`;
```

Run: `pnpm typecheck`

- If it passes: p5 2.x ships its own types. Delete the probe content (the file is rewritten in Task 9).
- If it fails with "Could not find a declaration file": create `src/types/p5.d.ts` with the minimal surface we use:

```ts
// Minimal p5 instance-mode surface used by jpeg-glitch-stage/sketch.
declare module 'p5' {
  type MediaElement = {
    elt: HTMLElement;
    hide: () => void;
  };

  export default class p5 {
    constructor(sketch: (instance: p5) => void);
    setup: () => void;
    draw: () => void;
    VIDEO: string;
    noCanvas(): void;
    createCapture(type: string, callback?: () => void): MediaElement;
    remove(): void;
  }
}
```

Re-run `pnpm typecheck` until green.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml src/types/p5.d.ts
git commit --no-verify -m "chore: add p5.js dependency for camera sketch layer"
```

(Drop `src/types/p5.d.ts` from the add if it wasn't needed.)

---

### Task 2: Shared types

**Files:**
- Create: `src/components/jpeg-glitch-stage/types.ts`

- [ ] **Step 1: Write the types**

```ts
// Shared contracts for the JPEG glitch stage. UI-facing params use 0–100 ranges
// (AE-plugin feel); normalization to shader units lives in math/glitch-params.

export type BlockSize = 8 | 16 | 32;

export type GlitchParams = {
  /** 0–100: probability/strength of DCT coefficient corruption. */
  amount: number;
  /** 0–100: JPEG quality. Lower = harsher quantization crush. */
  quality: number;
  /** Effective DCT block size in canvas pixels. */
  blockSize: BlockSize;
  /** 0–100: chroma subsampling collapse. */
  chroma: number;
  /** 0–100: block-row horizontal displacement. */
  shift: number;
  /** 0–9999: deterministic corruption seed. */
  seed: number;
};

export type GlitchStatus = 'booting' | 'running' | 'no-webgpu' | 'no-camera' | 'lost';

export type FrameInput = GlitchParams & {
  cameraReady: boolean;
};

export const DEFAULT_PARAMS = {
  amount: 40,
  quality: 30,
  blockSize: 16,
  chroma: 35,
  shift: 15,
  seed: 1024,
} satisfies GlitchParams;
```

- [ ] **Step 2: Verify + commit**

```bash
npx oxlint src/components/jpeg-glitch-stage && pnpm typecheck
git add src/components/jpeg-glitch-stage/types.ts
git commit --no-verify -m "feat: add jpeg-glitch shared types"
```

---

### Task 3: math/hash (TDD)

TS mirror of the WGSL `lowbias32` hash. Pins the hashing scheme the shaders use, so corruption is deterministic per seed.

**Files:**
- Create: `src/components/jpeg-glitch-stage/math/hash/hash.test.ts`
- Create: `src/components/jpeg-glitch-stage/math/hash/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest';

import { hash01, hashCombine, hashU32 } from '.';

describe('hashU32', () => {
  test('is deterministic', () => {
    expect(hashU32(1234)).toBe(hashU32(1234));
  });

  test('different inputs produce different outputs', () => {
    expect(hashU32(1)).not.toBe(hashU32(2));
  });

  test('stays within u32 range', () => {
    for (const input of [0, 1, 0xffffffff, 123456789]) {
      const output = hashU32(input);
      expect(output).toBeGreaterThanOrEqual(0);
      expect(output).toBeLessThanOrEqual(0xffffffff);
      expect(Number.isInteger(output)).toBe(true);
    }
  });
});

describe('hashCombine', () => {
  test('order matters', () => {
    expect(hashCombine(1, 2)).not.toBe(hashCombine(2, 1));
  });
});

describe('hash01', () => {
  test('maps into [0, 1)', () => {
    for (const input of [0, 7, 4096, 99999]) {
      const value = hash01(input);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/components/jpeg-glitch-stage/math/hash/hash.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement**

```ts
// lowbias32 integer hash (https://nullprogram.com/blog/2018/07/31/).
// Mirrors hash_u32 / hash_combine / hash01 in engine/shaders/common.wgsl —
// keep both sides in sync.

export const hashU32 = (value: number): number => {
  const input = value >>> 0;
  const a = (input ^ (input >>> 16)) >>> 0;
  const b = Math.imul(a, 0x7feb352d) >>> 0;
  const c = (b ^ (b >>> 15)) >>> 0;
  const d = Math.imul(c, 0x846ca68b) >>> 0;

  return (d ^ (d >>> 16)) >>> 0;
};

export const hashCombine = (a: number, b: number): number => hashU32((a >>> 0) ^ (Math.imul(b >>> 0, 0x9e3779b9) >>> 0));

export const hash01 = (value: number): number => (hashU32(value) & 0xffffff) / 16777216;
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/components/jpeg-glitch-stage/math/hash/hash.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
npx oxlint src/components/jpeg-glitch-stage && pnpm typecheck
git add src/components/jpeg-glitch-stage/math/hash
git commit --no-verify -m "feat: add deterministic lowbias32 hash (TS mirror of WGSL)"
```

---

### Task 4: math/dct (TDD)

TS reference implementation of the orthonormal 8x8 DCT-II / DCT-III. This is the executable spec for the WGSL kernel in Task 8 (same basis function, same row→column order).

**Files:**
- Create: `src/components/jpeg-glitch-stage/math/dct/dct.test.ts`
- Create: `src/components/jpeg-glitch-stage/math/dct/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest';

import { forwardDCT8x8, inverseDCT8x8 } from '.';

const randomBlock = (): number[] => Array.from({ length: 64 }, (_, index) => Math.sin(index * 12.9898) * 0.5 + 0.5);

describe('forwardDCT8x8 / inverseDCT8x8', () => {
  test('roundtrip reproduces the input block', () => {
    const block = randomBlock();
    const roundtrip = inverseDCT8x8(forwardDCT8x8(block));
    for (const [index, value] of block.entries()) {
      expect(roundtrip[index]).toBeCloseTo(value, 9);
    }
  });

  test('constant block concentrates all energy in DC', () => {
    const block = Array.from({ length: 64 }, () => 0.5);
    const coeffs = forwardDCT8x8(block);
    expect(coeffs[0]).toBeCloseTo(8 * 0.5, 9);
    for (const [index, value] of coeffs.entries()) {
      if (index === 0) continue;
      expect(value).toBeCloseTo(0, 9);
    }
  });

  test('transform preserves energy (orthonormal)', () => {
    const block = randomBlock();
    const coeffs = forwardDCT8x8(block);
    const energy = (values: readonly number[]): number => values.reduce((sum, v) => sum + v * v, 0);
    expect(energy(coeffs)).toBeCloseTo(energy(block), 9);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/components/jpeg-glitch-stage/math/dct/dct.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement**

```ts
// Orthonormal 8x8 DCT-II (forward) / DCT-III (inverse), separable rows→columns.
// Reference implementation: the WGSL kernel in engine/shaders/dct-corrupt.wgsl
// uses the identical basis() and pass order — this module is its executable spec.

const SIZE = 8;

const basis = (k: number, n: number): number => {
  const scale = k === 0 ? Math.sqrt(1 / SIZE) : Math.sqrt(2 / SIZE);

  return scale * Math.cos(((2 * n + 1) * k * Math.PI) / (2 * SIZE));
};

type Reader = (row: number, column: number) => number;

const transformRows = (read: Reader, kernel: (k: number, n: number) => number): number[] =>
  Array.from({ length: 64 }, (_, index) => {
    const row = Math.floor(index / SIZE);
    const k = index % SIZE;

    return Array.from({ length: SIZE }, (_, n) => read(row, n) * kernel(k, n)).reduce((sum, v) => sum + v, 0);
  });

const transformColumns = (read: Reader, kernel: (k: number, n: number) => number): number[] =>
  Array.from({ length: 64 }, (_, index) => {
    const k = Math.floor(index / SIZE);
    const column = index % SIZE;

    return Array.from({ length: SIZE }, (_, m) => read(m, column) * kernel(k, m)).reduce((sum, v) => sum + v, 0);
  });

const readerOf = (values: readonly number[]): Reader => (row, column) => values[row * SIZE + column] ?? 0;

export const forwardDCT8x8 = (block: readonly number[]): number[] => {
  const rows = transformRows(readerOf(block), basis);

  return transformColumns(readerOf(rows), basis);
};

export const inverseDCT8x8 = (coeffs: readonly number[]): number[] => {
  const inverseKernel = (n: number, k: number): number => basis(k, n);
  const rows = transformRows(readerOf(coeffs), inverseKernel);

  return transformColumns(readerOf(rows), inverseKernel);
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/components/jpeg-glitch-stage/math/dct/dct.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
npx oxlint src/components/jpeg-glitch-stage && pnpm typecheck
git add src/components/jpeg-glitch-stage/math/dct
git commit --no-verify -m "feat: add reference 8x8 DCT as executable spec for WGSL kernel"
```

---

### Task 5: math/quant-table (TDD)

IJG-style quality→quantization-table scaling. Output values are divided by 255 because our DCT operates on 0..1 signals (JPEG tables assume 0..255).

**Files:**
- Create: `src/components/jpeg-glitch-stage/math/quant-table/quant-table.test.ts`
- Create: `src/components/jpeg-glitch-stage/math/quant-table/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest';

import { BASE_CHROMA_TABLE, BASE_LUMA_TABLE, scaledQuantTables } from '.';

describe('scaledQuantTables', () => {
  test('packs luma then chroma, 128 entries total', () => {
    const tables = scaledQuantTables(50);
    expect(tables).toHaveLength(128);
  });

  test('quality 50 reproduces the base tables (in 0..1 units)', () => {
    const tables = scaledQuantTables(50);
    expect(tables[0]).toBeCloseTo((BASE_LUMA_TABLE[0] ?? 0) / 255, 6);
    expect(tables[64]).toBeCloseTo((BASE_CHROMA_TABLE[0] ?? 0) / 255, 6);
  });

  test('quality 100 collapses every entry to the minimum step', () => {
    const tables = scaledQuantTables(100);
    for (const value of tables) {
      expect(value).toBeCloseTo(1 / 255, 6);
    }
  });

  test('quality 1 saturates entries at the maximum step', () => {
    const tables = scaledQuantTables(1);
    expect(tables[0]).toBeCloseTo(255 / 255, 6);
  });

  test('lower quality never decreases any entry', () => {
    const high = scaledQuantTables(80);
    const low = scaledQuantTables(10);
    for (const [index, value] of low.entries()) {
      expect(value).toBeGreaterThanOrEqual((high[index] ?? 0) - 1e-9);
    }
  });

  test('quality is clamped into 1..100', () => {
    expect(Array.from(scaledQuantTables(0))).toEqual(Array.from(scaledQuantTables(1)));
    expect(Array.from(scaledQuantTables(120))).toEqual(Array.from(scaledQuantTables(100)));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/components/jpeg-glitch-stage/math/quant-table/quant-table.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement**

```ts
// JPEG Annex K base quantization tables + IJG quality scaling.
// Entries are emitted in 0..1 units (divided by 255) because the GPU pipeline
// runs the DCT on 0..1 YCbCr signals instead of JPEG's 0..255.

export const BASE_LUMA_TABLE: readonly number[] = [
  16, 11, 10, 16, 24, 40, 51, 61,
  12, 12, 14, 19, 26, 58, 60, 55,
  14, 13, 16, 24, 40, 57, 69, 56,
  14, 17, 22, 29, 51, 87, 80, 62,
  18, 22, 37, 56, 68, 109, 103, 77,
  24, 35, 55, 64, 81, 104, 113, 92,
  49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103, 99,
];

export const BASE_CHROMA_TABLE: readonly number[] = [
  17, 18, 24, 47, 99, 99, 99, 99,
  18, 21, 26, 66, 99, 99, 99, 99,
  24, 26, 56, 99, 99, 99, 99, 99,
  47, 66, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
];

const clampQuality = (quality: number): number => Math.min(100, Math.max(1, Math.round(quality)));

const scaleEntry = (base: number, scale: number): number => {
  const scaled = Math.floor((base * scale + 50) / 100);

  return Math.min(255, Math.max(1, scaled)) / 255;
};

export const scaledQuantTables = (quality: number): Float32Array<ArrayBuffer> => {
  const clamped = clampQuality(quality);
  const scale = clamped < 50 ? 5000 / clamped : 200 - 2 * clamped;
  const entries = [...BASE_LUMA_TABLE, ...BASE_CHROMA_TABLE].map((base) => scaleEntry(base, scale));

  return new Float32Array(entries);
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/components/jpeg-glitch-stage/math/quant-table/quant-table.test.ts`
Expected: PASS. (If "quality 50 reproduces base" fails: IJG scale at 50 is exactly 100, so `floor((16*100+50)/100)=16` — check the formula, not the test.)

- [ ] **Step 5: Commit**

```bash
npx oxlint src/components/jpeg-glitch-stage && pnpm typecheck
git add src/components/jpeg-glitch-stage/math/quant-table
git commit --no-verify -m "feat: add IJG quality-scaled JPEG quantization tables"
```

---

### Task 6: math/proc-size (TDD)

Processing resolution: canvas pixels divided by `blockSize / 8`, capped at a 1024 long edge, floored to multiples of 8 (the DCT kernel dispatches exact 8x8 workgroups).

**Files:**
- Create: `src/components/jpeg-glitch-stage/math/proc-size/proc-size.test.ts`
- Create: `src/components/jpeg-glitch-stage/math/proc-size/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest';

import { fitProcSize } from '.';

describe('fitProcSize', () => {
  test('returns multiples of 8', () => {
    const size = fitProcSize(1379, 773, 2, 8);
    expect(size.width % 8).toBe(0);
    expect(size.height % 8).toBe(0);
  });

  test('blockSize 16 halves the processing resolution vs blockSize 8', () => {
    const fine = fitProcSize(800, 600, 1, 8);
    const coarse = fitProcSize(800, 600, 1, 16);
    expect(coarse.width).toBe(fine.width / 2);
    expect(coarse.height).toBe(fine.height / 2);
  });

  test('caps the long edge at 1024', () => {
    const size = fitProcSize(3840, 2160, 2, 8);
    expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(1024);
  });

  test('never collapses below one block', () => {
    const size = fitProcSize(10, 10, 1, 32);
    expect(size.width).toBeGreaterThanOrEqual(8);
    expect(size.height).toBeGreaterThanOrEqual(8);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/components/jpeg-glitch-stage/math/proc-size/proc-size.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement**

```ts
// Processing-grid resolution for the glitch pipeline. One processed texel maps to
// (blockSize / 8) canvas pixels, so an 8-texel DCT block covers blockSize pixels.

import type { BlockSize } from '../../types';

const MAX_LONG_EDGE = 1024;
const BLOCK = 8;

export type ProcSize = {
  width: number;
  height: number;
};

const floorToBlock = (value: number): number => Math.max(BLOCK, Math.floor(value / BLOCK) * BLOCK);

export const fitProcSize = (cssWidth: number, cssHeight: number, devicePixelRatio: number, blockSize: BlockSize): ProcSize => {
  const scale = blockSize / BLOCK;
  const rawWidth = (cssWidth * devicePixelRatio) / scale;
  const rawHeight = (cssHeight * devicePixelRatio) / scale;
  const fit = Math.min(1, MAX_LONG_EDGE / Math.max(rawWidth, rawHeight, 1));

  return {
    width: floorToBlock(rawWidth * fit),
    height: floorToBlock(rawHeight * fit),
  };
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/components/jpeg-glitch-stage/math/proc-size/proc-size.test.ts`
Expected: PASS. (Note: the halving test works because 800/600 with dpr 1 is under the cap and 800, 600, 400, 296… stay multiples of 8 after flooring — if it flakes, loosen to `toBeLessThanOrEqual(fine.width / 2)` and `toBeGreaterThan(fine.width / 2 - 8)`.)

- [ ] **Step 5: Commit**

```bash
npx oxlint src/components/jpeg-glitch-stage && pnpm typecheck
git add src/components/jpeg-glitch-stage/math/proc-size
git commit --no-verify -m "feat: add processing-resolution fit for glitch block sizes"
```

---

### Task 7: math/glitch-params (TDD)

UI params (0–100) → shader units (0–1) + uniform packing. The Float32Array layout must mirror `GlitchParams` in `engine/shaders/common.wgsl` (Task 8) field-for-field.

**Files:**
- Create: `src/components/jpeg-glitch-stage/math/glitch-params/glitch-params.test.ts`
- Create: `src/components/jpeg-glitch-stage/math/glitch-params/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest';

import { GLITCH_UNIFORM_FLOAT_COUNT, normalizeParams, packGlitchUniforms } from '.';

describe('normalizeParams', () => {
  test('maps 0–100 sliders into 0–1 shader units', () => {
    const normalized = normalizeParams({ amount: 50, quality: 30, blockSize: 16, chroma: 100, shift: 0, seed: 777 });
    expect(normalized.amount).toBeCloseTo(0.5);
    expect(normalized.chroma).toBeCloseTo(1);
    expect(normalized.shift).toBeCloseTo(0);
    expect(normalized.seed).toBe(777);
  });
});

describe('packGlitchUniforms', () => {
  test('packs fields in WGSL struct order', () => {
    const packed = packGlitchUniforms({
      procWidth: 640,
      procHeight: 360,
      amount: 0.4,
      chroma: 0.35,
      shift: 0.15,
      seed: 1024,
      camAspect: 16 / 9,
      canvasAspect: 2,
      cameraReady: 1,
    });
    expect(packed).toHaveLength(GLITCH_UNIFORM_FLOAT_COUNT);
    expect(Array.from(packed.slice(0, 9))).toEqual([640, 360, 0.4, 0.35, 0.15, 1024, 16 / 9, 2, 1]);
  });

  test('byte length is a multiple of 16 for uniform-buffer alignment', () => {
    expect((GLITCH_UNIFORM_FLOAT_COUNT * 4) % 16).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/components/jpeg-glitch-stage/math/glitch-params/glitch-params.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement**

```ts
// CPU-side packing for the GlitchParams WGSL uniform struct. Layout mirrors
// engine/shaders/common.wgsl — keep both sides in sync (offsets are unit-tested).

import type { GlitchParams } from '../../types';

export const GLITCH_UNIFORM_FLOAT_COUNT = 12;

export type NormalizedParams = {
  amount: number;
  chroma: number;
  shift: number;
  seed: number;
};

export const normalizeParams = (params: GlitchParams): NormalizedParams => ({
  amount: params.amount / 100,
  chroma: params.chroma / 100,
  shift: params.shift / 100,
  seed: params.seed,
});

export type GlitchUniformInput = {
  procWidth: number;
  procHeight: number;
  amount: number;
  chroma: number;
  shift: number;
  seed: number;
  camAspect: number;
  canvasAspect: number;
  cameraReady: number;
};

export const packGlitchUniforms = (input: GlitchUniformInput): Float32Array<ArrayBuffer> =>
  new Float32Array([
    input.procWidth,
    input.procHeight,
    input.amount,
    input.chroma,
    input.shift,
    input.seed,
    input.camAspect,
    input.canvasAspect,
    input.cameraReady,
    0,
    0,
    0,
  ]);
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/components/jpeg-glitch-stage/math/glitch-params/glitch-params.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
npx oxlint src/components/jpeg-glitch-stage && pnpm typecheck
git add src/components/jpeg-glitch-stage/math/glitch-params
git commit --no-verify -m "feat: add glitch param normalization and uniform packing"
```

---

### Task 8: WGSL shaders + shader-sources

The creative core. Four WGSL files + the composition module. No unit tests (GPU code); correctness is anchored by the math/dct reference (identical basis & pass order) and verified visually in Task 16.

**Files:**
- Create: `src/components/jpeg-glitch-stage/engine/shaders/common.wgsl`
- Create: `src/components/jpeg-glitch-stage/engine/shaders/color-separate.wgsl`
- Create: `src/components/jpeg-glitch-stage/engine/shaders/dct-corrupt.wgsl`
- Create: `src/components/jpeg-glitch-stage/engine/shaders/render.wgsl`
- Create: `src/components/jpeg-glitch-stage/engine/shader-sources.ts`

- [ ] **Step 1: common.wgsl**

```wgsl
// Shared uniform struct + helpers for the JPEG glitch pipeline.
// CPU-side packing lives in math/glitch-params — keep field order in sync.

struct GlitchParams {
  proc_size: vec2f,
  amount: f32,
  chroma: f32,
  shift: f32,
  seed: f32,
  cam_aspect: f32,
  canvas_aspect: f32,
  camera_ready: f32,
  _pad0: f32,
  _pad1: vec2f,
};

// lowbias32 integer hash — mirrored in math/hash (TS).
fn hash_u32(value: u32) -> u32 {
  var h = value;
  h = h ^ (h >> 16u);
  h = h * 0x7feb352du;
  h = h ^ (h >> 15u);
  h = h * 0x846ca68bu;
  h = h ^ (h >> 16u);
  return h;
}

fn hash_combine(a: u32, b: u32) -> u32 {
  return hash_u32(a ^ (b * 0x9e3779b9u));
}

fn hash01(value: u32) -> f32 {
  return f32(hash_u32(value) & 0xffffffu) / 16777216.0;
}

// Full-range BT.601. Cb/Cr are centered at 0 (range −0.5..0.5).
fn rgb_to_ycbcr(rgb: vec3f) -> vec3f {
  let y = dot(rgb, vec3f(0.299, 0.587, 0.114));
  let cb = dot(rgb, vec3f(-0.168736, -0.331264, 0.5));
  let cr = dot(rgb, vec3f(0.5, -0.418688, -0.081312));
  return vec3f(y, cb, cr);
}

fn ycbcr_to_rgb(ycc: vec3f) -> vec3f {
  let y = ycc.x;
  let cb = ycc.y;
  let cr = ycc.z;
  return vec3f(
    y + 1.402 * cr,
    y - 0.344136 * cb - 0.714136 * cr,
    y + 1.772 * cb,
  );
}

// Cover-fit + horizontal mirror (the stage behaves like a mirror).
fn camera_uv(uv: vec2f, cam_aspect: f32, canvas_aspect: f32) -> vec2f {
  let ratio = canvas_aspect / cam_aspect;
  var centered = uv - vec2f(0.5);
  if (ratio > 1.0) {
    centered = vec2f(centered.x, centered.y / ratio);
  } else {
    centered = vec2f(centered.x * ratio, centered.y);
  }
  return vec2f(0.5 - centered.x, centered.y + 0.5);
}
```

- [ ] **Step 2: color-separate.wgsl**

```wgsl
// Pass 1: camera RGB -> YCbCr at processing resolution.
// Luma is sampled exactly; chroma is snapped to a coarse cell grid with a
// per-cell random offset — the "chroma subsampling collapse".

@group(0) @binding(0) var<uniform> params: GlitchParams;
@group(0) @binding(1) var camera_tex: texture_2d<f32>;
@group(0) @binding(2) var camera_sampler: sampler;
@group(0) @binding(3) var ycbcr_out: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let size = vec2u(params.proc_size);
  if (gid.x >= size.x || gid.y >= size.y) {
    return;
  }
  let texel = vec2f(gid.xy);
  let uv = (texel + vec2f(0.5)) / params.proc_size;

  let luma_uv = camera_uv(uv, params.cam_aspect, params.canvas_aspect);
  let luma_rgb = textureSampleLevel(camera_tex, camera_sampler, luma_uv, 0.0).rgb;
  let y = rgb_to_ycbcr(luma_rgb).x;

  // 4:2:0 always (cell = 2); the chroma slider widens cells up to 32 texels and
  // adds a random per-cell wobble so color bleeds across block boundaries.
  let cell = 2.0 + floor(params.chroma * 30.0);
  let cell_id = vec2u(floor(texel / cell));
  let cell_hash = hash_combine(cell_id.x * 1973u + cell_id.y * 9277u + 1u, u32(params.seed));
  let wobble = (vec2f(hash01(cell_hash), hash01(cell_hash ^ 0x68bc21u)) - vec2f(0.5)) * params.chroma * 48.0;
  let chroma_texel = (floor(texel / cell) + vec2f(0.5)) * cell + wobble;
  let chroma_pos = clamp((chroma_texel + vec2f(0.5)) / params.proc_size, vec2f(0.0), vec2f(1.0));
  let chroma_uv = camera_uv(chroma_pos, params.cam_aspect, params.canvas_aspect);
  let chroma_rgb = textureSampleLevel(camera_tex, camera_sampler, chroma_uv, 0.0).rgb;
  let cbcr = rgb_to_ycbcr(chroma_rgb).yz;

  textureStore(ycbcr_out, vec2i(gid.xy), vec4f(y, cbcr, 1.0));
}
```

- [ ] **Step 3: dct-corrupt.wgsl**

```wgsl
// Pass 2: the heart of the effect. One workgroup per 8x8 block, 64 threads.
// forward DCT (rows then columns, orthonormal — see math/dct reference) ->
// quantize with the quality-scaled JPEG tables -> stochastically corrupt
// coefficients (drop / steal / boost, seed-deterministic) -> inverse DCT.

@group(0) @binding(0) var<uniform> params: GlitchParams;
@group(0) @binding(1) var ycbcr_in: texture_2d<f32>;
@group(0) @binding(2) var ycbcr_out: texture_storage_2d<rgba16float, write>;
@group(0) @binding(3) var<storage, read> quant: array<f32, 128>;

var<workgroup> block_data: array<vec3f, 64>;
var<workgroup> block_temp: array<vec3f, 64>;

const PI: f32 = 3.141592653589793;

fn basis(k: u32, n: u32) -> f32 {
  let scale = select(0.5, 0.35355339059327373, k == 0u);
  return scale * cos((2.0 * f32(n) + 1.0) * f32(k) * PI / 16.0);
}

@compute @workgroup_size(8, 8)
fn main(
  @builtin(workgroup_id) wid: vec3u,
  @builtin(local_invocation_id) lid: vec3u,
) {
  let local = lid.y * 8u + lid.x;
  let coord = vec2u(wid.xy * 8u + lid.xy);
  let size = vec2u(params.proc_size);
  let safe = min(coord, size - vec2u(1u));

  block_data[local] = textureLoad(ycbcr_in, vec2i(safe), 0).xyz;
  workgroupBarrier();

  // Forward DCT, rows: thread = (frequency lid.x, row lid.y).
  var acc = vec3f(0.0);
  for (var n = 0u; n < 8u; n = n + 1u) {
    acc = acc + block_data[lid.y * 8u + n] * basis(lid.x, n);
  }
  block_temp[local] = acc;
  workgroupBarrier();

  // Forward DCT, columns: thread = (column lid.x, frequency lid.y).
  acc = vec3f(0.0);
  for (var m = 0u; m < 8u; m = m + 1u) {
    acc = acc + block_temp[m * 8u + lid.x] * basis(lid.y, m);
  }
  block_data[local] = acc;
  workgroupBarrier();

  // Quantize (quality crush) — always on, like a JPEG encoder.
  let coeff = block_data[local];
  let q_luma = max(quant[local], 0.0001);
  let q_chroma = max(quant[local + 64u], 0.0001);
  var mutated = vec3f(
    round(coeff.x / q_luma) * q_luma,
    round(coeff.y / q_chroma) * q_chroma,
    round(coeff.z / q_chroma) * q_chroma,
  );

  // Corruption (amount): a hash gate picks which blocks break this seed,
  // then each coefficient independently drops / steals / boosts.
  let block_id = wid.y * 4096u + wid.x;
  let block_hash = hash_combine(block_id + 1u, u32(params.seed));
  let block_active = hash01(block_hash) < params.amount * 0.85;
  if (block_active) {
    let roll = hash01(hash_combine(block_hash, local + 1u));
    let strike = params.amount * 0.9;
    if (roll < strike * 0.45) {
      mutated = vec3f(0.0);
    } else if (roll < strike * 0.7) {
      let donor = hash_u32(hash_combine(block_hash, local + 101u)) % 64u;
      mutated = block_data[donor];
    } else if (roll < strike) {
      let boost = 1.0 + hash01(hash_combine(block_hash, local + 201u)) * 7.0;
      mutated = mutated * boost;
    }
    if (local == 0u) {
      // DC drift: whole-block brightness jumps, the classic broken-JPEG patchwork.
      mutated.x = mutated.x + (hash01(hash_combine(block_hash, 7u)) - 0.5) * params.amount * 5.0;
    }
  }
  workgroupBarrier();
  block_data[local] = mutated;
  workgroupBarrier();

  // Inverse DCT, rows.
  acc = vec3f(0.0);
  for (var k = 0u; k < 8u; k = k + 1u) {
    acc = acc + block_data[lid.y * 8u + k] * basis(k, lid.x);
  }
  block_temp[local] = acc;
  workgroupBarrier();

  // Inverse DCT, columns.
  acc = vec3f(0.0);
  for (var j = 0u; j < 8u; j = j + 1u) {
    acc = acc + block_temp[j * 8u + lid.x] * basis(j, lid.y);
  }

  if (coord.x < size.x && coord.y < size.y) {
    textureStore(ycbcr_out, vec2i(coord), vec4f(acc, 1.0));
  }
}
```

- [ ] **Step 4: render.wgsl**

```wgsl
// Pass 3: present. Block-row horizontal displacement (broken scanlines),
// then YCbCr -> RGB. Nearest sampling keeps the 8x8 blocks crisp when the
// processing grid is upscaled to the canvas.

@group(0) @binding(0) var<uniform> params: GlitchParams;
@group(0) @binding(1) var glitch_tex: texture_2d<f32>;
@group(0) @binding(2) var glitch_sampler: sampler;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs_main(@builtin(vertex_index) index: u32) -> VertexOut {
  var positions = array<vec2f, 3>(vec2f(-1.0, -3.0), vec2f(-1.0, 1.0), vec2f(3.0, 1.0));
  let pos = positions[index];
  var out: VertexOut;
  out.position = vec4f(pos, 0.0, 1.0);
  out.uv = vec2f(pos.x * 0.5 + 0.5, 0.5 - pos.y * 0.5);
  return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4f {
  if (params.camera_ready < 0.5) {
    return vec4f(0.0, 0.0, 0.0, 1.0);
  }

  let row = u32(in.uv.y * params.proc_size.y / 8.0);
  let row_hash = hash_combine(row + 31u, u32(params.seed) ^ 0x51edu);
  var uv = in.uv;
  if (hash01(row_hash) < params.shift * 0.6) {
    let magnitude = (hash01(row_hash ^ 0x9d3au) - 0.5) * params.shift;
    uv.x = fract(uv.x + magnitude);
  }

  let ycc = textureSampleLevel(glitch_tex, glitch_sampler, uv, 0.0).xyz;
  let rgb = ycbcr_to_rgb(ycc);
  return vec4f(clamp(rgb, vec3f(0.0), vec3f(1.0)), 1.0);
}
```

- [ ] **Step 5: shader-sources.ts**

```ts
// Compose each pass with the shared WGSL header (struct + helpers).
// Raw .wgsl imports are wired through next.config.ts (asset/source).

import colorSeparate from './shaders/color-separate.wgsl';
import common from './shaders/common.wgsl';
import dctCorrupt from './shaders/dct-corrupt.wgsl';
import render from './shaders/render.wgsl';

const compose = (body: string): string => `${common}\n${body}`;

export const shaderSources = {
  colorSeparate: compose(colorSeparate),
  dctCorrupt: compose(dctCorrupt),
  render: compose(render),
} as const;
```

- [ ] **Step 6: Verify + commit**

```bash
npx oxlint src/components/jpeg-glitch-stage && pnpm typecheck
git add src/components/jpeg-glitch-stage/engine
git commit --no-verify -m "feat: add JPEG glitch WGSL passes (color separate, DCT corrupt, render)"
```

---

### Task 9: Engine GPU plumbing (resources / pipelines / bind-groups)

**Files:**
- Create: `src/components/jpeg-glitch-stage/engine/resources.ts`
- Create: `src/components/jpeg-glitch-stage/engine/pipelines.ts`
- Create: `src/components/jpeg-glitch-stage/engine/bind-groups.ts`

- [ ] **Step 1: resources.ts**

```ts
// GPU resource constructors. YCbCr planes are rgba16float (storage + sampled);
// the camera texture matches the video's native size for copyExternalImageToTexture.

export type FieldTexture = {
  texture: GPUTexture;
  view: GPUTextureView;
  width: number;
  height: number;
};

const createField = (device: GPUDevice, width: number, height: number, format: GPUTextureFormat, usage: number): FieldTexture => {
  const texture = device.createTexture({ size: { width, height }, format, usage });

  return { texture, view: texture.createView(), width, height };
};

export const createYCbCrTexture = (device: GPUDevice, width: number, height: number): FieldTexture =>
  createField(device, width, height, 'rgba16float', GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING);

export const createCameraTexture = (device: GPUDevice, width: number, height: number): FieldTexture =>
  createField(device, width, height, 'rgba8unorm', GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT);

export const createLinearSampler = (device: GPUDevice): GPUSampler =>
  device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });

export const createNearestSampler = (device: GPUDevice): GPUSampler =>
  device.createSampler({ magFilter: 'nearest', minFilter: 'nearest', addressModeU: 'repeat', addressModeV: 'clamp-to-edge' });

export const createUniformBuffer = (device: GPUDevice, byteLength: number): GPUBuffer =>
  device.createBuffer({ size: byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

export const createQuantBuffer = (device: GPUDevice): GPUBuffer =>
  device.createBuffer({ size: 128 * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
```

(Note `addressModeU: 'repeat'` on the nearest sampler: the render pass wraps shifted rows with `fract`, repeat keeps edge texels from smearing.)

- [ ] **Step 2: pipelines.ts**

```ts
// Pipeline construction with auto layouts; bind groups are derived per pipeline.

import { shaderSources } from './shader-sources';

export type Pipelines = {
  colorSeparate: GPUComputePipeline;
  dctCorrupt: GPUComputePipeline;
  render: GPURenderPipeline;
};

const computePipeline = (device: GPUDevice, code: string): GPUComputePipeline =>
  device.createComputePipeline({ layout: 'auto', compute: { module: device.createShaderModule({ code }), entryPoint: 'main' } });

export const createPipelines = (device: GPUDevice, canvasFormat: GPUTextureFormat): Pipelines => {
  const renderModule = device.createShaderModule({ code: shaderSources.render });

  return {
    colorSeparate: computePipeline(device, shaderSources.colorSeparate),
    dctCorrupt: computePipeline(device, shaderSources.dctCorrupt),
    render: device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: renderModule, entryPoint: 'vs_main' },
      fragment: { module: renderModule, entryPoint: 'fs_main', targets: [{ format: canvasFormat }] },
      primitive: { topology: 'triangle-list' },
    }),
  };
};
```

- [ ] **Step 3: bind-groups.ts**

```ts
// Bind groups are rebuilt whenever a texture is recreated (resize / block-size
// change / camera dimension change); buffers and samplers are stable.

import type { FieldTexture } from './resources';
import type { Pipelines } from './pipelines';

export type BindGroups = {
  colorSeparate: GPUBindGroup;
  dctCorrupt: GPUBindGroup;
  render: GPUBindGroup;
};

export type BindGroupInputs = {
  uniformBuffer: GPUBuffer;
  quantBuffer: GPUBuffer;
  camera: FieldTexture;
  ycbcrRaw: FieldTexture;
  ycbcrGlitched: FieldTexture;
  linearSampler: GPUSampler;
  nearestSampler: GPUSampler;
};

export const createBindGroups = (device: GPUDevice, pipelines: Pipelines, inputs: BindGroupInputs): BindGroups => ({
  colorSeparate: device.createBindGroup({
    layout: pipelines.colorSeparate.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: inputs.uniformBuffer } },
      { binding: 1, resource: inputs.camera.view },
      { binding: 2, resource: inputs.linearSampler },
      { binding: 3, resource: inputs.ycbcrRaw.view },
    ],
  }),
  dctCorrupt: device.createBindGroup({
    layout: pipelines.dctCorrupt.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: inputs.uniformBuffer } },
      { binding: 1, resource: inputs.ycbcrRaw.view },
      { binding: 2, resource: inputs.ycbcrGlitched.view },
      { binding: 3, resource: { buffer: inputs.quantBuffer } },
    ],
  }),
  render: device.createBindGroup({
    layout: pipelines.render.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: inputs.uniformBuffer } },
      { binding: 1, resource: inputs.ycbcrGlitched.view },
      { binding: 2, resource: inputs.nearestSampler },
    ],
  }),
});
```

- [ ] **Step 4: Verify + commit**

```bash
npx oxlint src/components/jpeg-glitch-stage && pnpm typecheck
git add src/components/jpeg-glitch-stage/engine
git commit --no-verify -m "feat: add glitch engine GPU resources, pipelines and bind groups"
```

---

### Task 10: engine/index.ts (createGlitchEngine)

**Files:**
- Create: `src/components/jpeg-glitch-stage/engine/index.ts`

- [ ] **Step 1: Implement**

```ts
// Framework-free WebGPU JPEG-glitch engine. Owns device, context, textures,
// pipelines and bind groups; the session layer feeds FrameInput once per frame.

import { GLITCH_UNIFORM_FLOAT_COUNT, normalizeParams, packGlitchUniforms } from '../math/glitch-params';
import { fitProcSize } from '../math/proc-size';
import { scaledQuantTables } from '../math/quant-table';
import type { BlockSize, FrameInput } from '../types';
import { createBindGroups, type BindGroups } from './bind-groups';
import { createPipelines, type Pipelines } from './pipelines';
import {
  createCameraTexture,
  createLinearSampler,
  createNearestSampler,
  createQuantBuffer,
  createUniformBuffer,
  createYCbCrTexture,
  type FieldTexture,
} from './resources';

export type GlitchEngine = {
  frame: (input: FrameInput) => void;
  resize: (cssWidth: number, cssHeight: number, devicePixelRatio: number) => void;
  updateCamera: (video: HTMLVideoElement) => void;
  lost: Promise<GPUDeviceLostInfo>;
  destroy: () => void;
};

const MAX_DPR = 2;
const BLOCK = 8;

type EngineState = {
  cssWidth: number;
  cssHeight: number;
  dpr: number;
  blockSize: BlockSize;
  lastQuality: number;
  camera: FieldTexture;
  ycbcrRaw: FieldTexture;
  ycbcrGlitched: FieldTexture;
  bindGroups: BindGroups;
  camAspect: number;
};

export const createGlitchEngine = async (canvas: HTMLCanvasElement): Promise<GlitchEngine | undefined> => {
  const gpu = navigator.gpu;
  if (gpu === undefined) return undefined;
  const adapter = await gpu.requestAdapter();
  if (adapter === null) return undefined;
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (context === null) return undefined;
  const format = gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });

  const pipelines: Pipelines = createPipelines(device, format);
  const uniformBuffer = createUniformBuffer(device, GLITCH_UNIFORM_FLOAT_COUNT * 4);
  const quantBuffer = createQuantBuffer(device);
  const linearSampler = createLinearSampler(device);
  const nearestSampler = createNearestSampler(device);

  const buildBindGroups = (camera: FieldTexture, ycbcrRaw: FieldTexture, ycbcrGlitched: FieldTexture): BindGroups =>
    createBindGroups(device, pipelines, { uniformBuffer, quantBuffer, camera, ycbcrRaw, ycbcrGlitched, linearSampler, nearestSampler });

  const initialProc = fitProcSize(canvas.clientWidth || 640, canvas.clientHeight || 360, 1, 16);
  const initialCamera = createCameraTexture(device, 2, 2);
  const initialRaw = createYCbCrTexture(device, initialProc.width, initialProc.height);
  const initialGlitched = createYCbCrTexture(device, initialProc.width, initialProc.height);

  const state: EngineState = {
    cssWidth: canvas.clientWidth || 640,
    cssHeight: canvas.clientHeight || 360,
    dpr: 1,
    blockSize: 16,
    lastQuality: -1,
    camera: initialCamera,
    ycbcrRaw: initialRaw,
    ycbcrGlitched: initialGlitched,
    bindGroups: buildBindGroups(initialCamera, initialRaw, initialGlitched),
    camAspect: 16 / 9,
  };

  const rebuildProcTextures = (): void => {
    const proc = fitProcSize(state.cssWidth, state.cssHeight, state.dpr, state.blockSize);
    state.ycbcrRaw.texture.destroy();
    state.ycbcrGlitched.texture.destroy();
    state.ycbcrRaw = createYCbCrTexture(device, proc.width, proc.height);
    state.ycbcrGlitched = createYCbCrTexture(device, proc.width, proc.height);
    state.bindGroups = buildBindGroups(state.camera, state.ycbcrRaw, state.ycbcrGlitched);
  };

  const ensureQuantTables = (quality: number): void => {
    if (quality === state.lastQuality) return;
    state.lastQuality = quality;
    device.queue.writeBuffer(quantBuffer, 0, scaledQuantTables(quality));
  };

  const writeUniforms = (input: FrameInput): void => {
    const normalized = normalizeParams(input);
    device.queue.writeBuffer(
      uniformBuffer,
      0,
      packGlitchUniforms({
        procWidth: state.ycbcrRaw.width,
        procHeight: state.ycbcrRaw.height,
        amount: normalized.amount,
        chroma: normalized.chroma,
        shift: normalized.shift,
        seed: normalized.seed,
        camAspect: state.camAspect,
        canvasAspect: state.cssWidth / Math.max(1, state.cssHeight),
        cameraReady: input.cameraReady ? 1 : 0,
      }),
    );
  };

  const encode = (): void => {
    const encoder = device.createCommandEncoder();
    const compute = encoder.beginComputePass();
    compute.setPipeline(pipelines.colorSeparate);
    compute.setBindGroup(0, state.bindGroups.colorSeparate);
    compute.dispatchWorkgroups(Math.ceil(state.ycbcrRaw.width / BLOCK), Math.ceil(state.ycbcrRaw.height / BLOCK));
    compute.setPipeline(pipelines.dctCorrupt);
    compute.setBindGroup(0, state.bindGroups.dctCorrupt);
    compute.dispatchWorkgroups(state.ycbcrRaw.width / BLOCK, state.ycbcrRaw.height / BLOCK);
    compute.end();

    const pass = encoder.beginRenderPass({
      colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
    });
    pass.setPipeline(pipelines.render);
    pass.setBindGroup(0, state.bindGroups.render);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
  };

  return {
    frame: (input) => {
      if (input.blockSize !== state.blockSize) {
        state.blockSize = input.blockSize;
        rebuildProcTextures();
      }
      ensureQuantTables(input.quality);
      writeUniforms(input);
      encode();
    },
    resize: (cssWidth, cssHeight, devicePixelRatio) => {
      const dpr = Math.min(devicePixelRatio, MAX_DPR);
      state.cssWidth = Math.max(1, cssWidth);
      state.cssHeight = Math.max(1, cssHeight);
      state.dpr = dpr;
      const element = canvas;
      element.width = Math.round(state.cssWidth * dpr);
      element.height = Math.round(state.cssHeight * dpr);
      rebuildProcTextures();
    },
    updateCamera: (video) => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width === 0 || height === 0) return;
      if (width !== state.camera.width || height !== state.camera.height) {
        state.camera.texture.destroy();
        state.camera = createCameraTexture(device, width, height);
        state.camAspect = width / height;
        state.bindGroups = buildBindGroups(state.camera, state.ycbcrRaw, state.ycbcrGlitched);
      }
      device.queue.copyExternalImageToTexture({ source: video }, { texture: state.camera.texture }, { width, height });
    },
    lost: device.lost,
    destroy: () => {
      state.camera.texture.destroy();
      state.ycbcrRaw.texture.destroy();
      state.ycbcrGlitched.texture.destroy();
      device.destroy();
    },
  };
};
```

- [ ] **Step 2: Verify + commit**

```bash
npx oxlint src/components/jpeg-glitch-stage && pnpm typecheck
git add src/components/jpeg-glitch-stage/engine
git commit --no-verify -m "feat: add createGlitchEngine WebGPU orchestration"
```

---

### Task 11: sketch/index.ts (p5 camera layer)

**Files:**
- Create (or rewrite the Task 1 probe): `src/components/jpeg-glitch-stage/sketch/index.ts`

Before implementing, check the installed p5's `createCapture` signature (`node_modules/p5` types or context7 docs for the installed major version). The code below targets the `createCapture(type, callback)` form that works in both 1.x and 2.x.

- [ ] **Step 1: Implement**

```ts
// p5.js layer: owns getUserMedia (via createCapture) and the frame loop.
// No p5 canvas — the WebGPU engine owns the visible canvas; p5's draw() is
// used purely as the per-frame heartbeat that feeds video frames to the engine.

import p5 from 'p5';

export type CameraSketch = {
  dispose: () => void;
};

export type SketchCallbacks = {
  onCameraReady: (video: HTMLVideoElement) => void;
  onCameraError: () => void;
  onFrame: (video: HTMLVideoElement) => void;
};

const CAMERA_TIMEOUT_MS = 10000;
const HAVE_CURRENT_DATA = 2;

type SketchState = {
  video: HTMLVideoElement | undefined;
  ready: boolean;
  disposed: boolean;
};

const stopTracks = (video: HTMLVideoElement | undefined): void => {
  const stream = video?.srcObject;
  if (!(stream instanceof MediaStream)) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
};

export const createCameraSketch = (callbacks: SketchCallbacks): CameraSketch => {
  const state: SketchState = { video: undefined, ready: false, disposed: false };

  const sketch = (instance: p5): void => {
    instance.setup = () => {
      instance.noCanvas();
      const capture = instance.createCapture(instance.VIDEO, () => {
        if (state.disposed || state.video === undefined) return;
        state.ready = true;
        callbacks.onCameraReady(state.video);
      });
      capture.hide();
      const element = capture.elt;
      state.video = element instanceof HTMLVideoElement ? element : undefined;
      window.setTimeout(() => {
        if (!state.ready && !state.disposed) callbacks.onCameraError();
      }, CAMERA_TIMEOUT_MS);
    };

    instance.draw = () => {
      if (!state.ready || state.disposed) return;
      const video = state.video;
      if (video === undefined || video.readyState < HAVE_CURRENT_DATA) return;
      callbacks.onFrame(video);
    };
  };

  const instance = new p5(sketch);

  return {
    dispose: () => {
      state.disposed = true;
      stopTracks(state.video);
      instance.remove();
    },
  };
};
```

- [ ] **Step 2: Verify + commit**

```bash
npx oxlint src/components/jpeg-glitch-stage && pnpm typecheck
git add src/components/jpeg-glitch-stage/sketch src/types/p5.d.ts
git commit --no-verify -m "feat: add p5 camera sketch driving the glitch frame loop"
```

(If Step 1 of Task 1 created `src/types/p5.d.ts`, extend it here so `elt`, `VIDEO`, `hide` etc. typecheck.)

---

### Task 12: session/index.ts

**Files:**
- Create: `src/components/jpeg-glitch-stage/session/index.ts`

- [ ] **Step 1: Implement**

```ts
// DOM/GPU session glue (no React): boots the engine, mounts the p5 camera
// sketch, forwards every camera frame into the engine, handles resize and
// disposal. The hook only mounts/unmounts it.

import { createGlitchEngine, type GlitchEngine } from '../engine';
import { createCameraSketch, type CameraSketch } from '../sketch';
import type { GlitchParams, GlitchStatus } from '../types';

export type GlitchSession = {
  dispose: () => void;
};

type SessionState = {
  disposed: boolean;
  engine: GlitchEngine | undefined;
  sketch: CameraSketch | undefined;
  cameraReady: boolean;
  resizeTimer: number;
};

const RESIZE_DEBOUNCE_MS = 180;

const watchDeviceLost = async (engine: GlitchEngine, state: SessionState, onStatus: (status: GlitchStatus) => void): Promise<void> => {
  const info = await engine.lost;
  if (!state.disposed && info.reason !== 'destroyed') onStatus('lost');
};

export const createGlitchSession = (
  canvas: HTMLCanvasElement,
  getParams: () => GlitchParams,
  onStatus: (status: GlitchStatus) => void,
): GlitchSession => {
  const state: SessionState = { disposed: false, engine: undefined, sketch: undefined, cameraReady: false, resizeTimer: 0 };

  const applySize = (): void => {
    state.engine?.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio);
  };

  const handleResize = (): void => {
    window.clearTimeout(state.resizeTimer);
    state.resizeTimer = window.setTimeout(applySize, RESIZE_DEBOUNCE_MS);
  };

  const tick = (video: HTMLVideoElement): void => {
    if (state.disposed || state.engine === undefined) return;
    state.engine.updateCamera(video);
    state.engine.frame({ ...getParams(), cameraReady: state.cameraReady });
  };

  const boot = async (): Promise<void> => {
    const engine = await createGlitchEngine(canvas);
    if (state.disposed) {
      engine?.destroy();

      return;
    }
    if (engine === undefined) {
      onStatus('no-webgpu');

      return;
    }
    state.engine = engine;
    applySize();
    void watchDeviceLost(engine, state, onStatus);
    state.sketch = createCameraSketch({
      onCameraReady: () => {
        if (state.disposed) return;
        state.cameraReady = true;
        onStatus('running');
      },
      onCameraError: () => {
        if (!state.disposed && !state.cameraReady) onStatus('no-camera');
      },
      onFrame: tick,
    });
  };

  void boot();
  window.addEventListener('resize', handleResize);

  return {
    dispose: () => {
      state.disposed = true;
      window.removeEventListener('resize', handleResize);
      window.clearTimeout(state.resizeTimer);
      state.sketch?.dispose();
      state.engine?.destroy();
    },
  };
};
```

- [ ] **Step 2: Verify + commit**

```bash
npx oxlint src/components/jpeg-glitch-stage && pnpm typecheck
git add src/components/jpeg-glitch-stage/session
git commit --no-verify -m "feat: add glitch session glue (engine + p5 sketch + resize)"
```

---

### Task 13: use-jpeg-glitch.ts (React adapter)

**Files:**
- Create: `src/components/jpeg-glitch-stage/use-jpeg-glitch.ts`

- [ ] **Step 1: Implement**

```ts
'use client';

// Thin React adapter: mounts the imperative glitch session once and exposes its
// status. Slider params flow through a ref so changes never remount the session.

import { useEffect, useRef, useState, type RefObject } from 'react';

import { createGlitchSession } from './session';
import type { GlitchParams, GlitchStatus } from './types';

export const useJPEGGlitch = (canvasRef: RefObject<HTMLCanvasElement | null>, params: GlitchParams): GlitchStatus => {
  const [status, setStatus] = useState<GlitchStatus>('booting');
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    // USEEFFECT_JUSTIFICATION: imperative WebGPU + p5/MediaStream session bound to
    // the canvas DOM node lifecycle — cannot be expressed as data fetching or derived state.
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const session = createGlitchSession(canvas, () => paramsRef.current, setStatus);

    return () => {
      session.dispose();
    };
  }, [canvasRef]);

  return status;
};
```

- [ ] **Step 2: Verify + commit**

```bash
npx oxlint src/components/jpeg-glitch-stage && pnpm typecheck
git add src/components/jpeg-glitch-stage/use-jpeg-glitch.ts
git commit --no-verify -m "feat: add useJPEGGlitch React adapter hook"
```

---

### Task 14: controls/ (TDD)

AE Effect Controls-style left panel: 5 sliders (Amount / Quality / Chroma / Shift / Seed), a Block Size radio group, a seed randomize button. All react-aria-components.

**Files:**
- Create: `src/components/jpeg-glitch-stage/controls/controls.test.tsx`
- Create: `src/components/jpeg-glitch-stage/controls/index.tsx`
- Create: `src/components/jpeg-glitch-stage/controls/styles.css.ts`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { DEFAULT_PARAMS } from '../types';
import { GlitchControls } from '.';

const noopProps = () => ({
  params: DEFAULT_PARAMS,
  onChangeField: vi.fn(),
  onChangeBlockSize: vi.fn(),
  onRandomizeSeed: vi.fn(),
});

describe('GlitchControls', () => {
  test('exposes every parameter as an accessible control', async () => {
    render(<GlitchControls {...noopProps()} />);
    for (const name of ['Amount', 'Quality', 'Chroma', 'Shift', 'Seed']) {
      await expect.element(page.getByRole('slider', { name })).toBeInTheDocument();
    }
    await expect.element(page.getByRole('radiogroup', { name: 'Block Size' })).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'シードをランダム化' })).toBeInTheDocument();
  });

  test('block size selection reports the numeric value', async () => {
    const props = noopProps();
    render(<GlitchControls {...props} />);
    await page.getByRole('radio', { name: '32' }).click();
    expect(props.onChangeBlockSize).toHaveBeenCalledWith(32);
  });

  test('randomize button fires', async () => {
    const props = noopProps();
    render(<GlitchControls {...props} />);
    await page.getByRole('button', { name: 'シードをランダム化' }).click();
    expect(props.onRandomizeSeed).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/components/jpeg-glitch-stage/controls/controls.test.tsx`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement index.tsx**

```tsx
'use client';

// AE Effect Controls-style parameter panel. Each slider reports through a
// single (field, value) callback so the stage owns the params object.

import { useCallback } from 'react';
import { Button, Label, Radio, RadioGroup, Slider, SliderOutput, SliderThumb, SliderTrack } from 'react-aria-components';

import * as styles from './styles.css';
import type { BlockSize, GlitchParams } from '../types';

export type NumericField = 'amount' | 'quality' | 'chroma' | 'shift' | 'seed';

export type GlitchControlsProps = {
  params: GlitchParams;
  onChangeField: (field: NumericField, value: number) => void;
  onChangeBlockSize: (value: BlockSize) => void;
  onRandomizeSeed: () => void;
};

type ParamSliderProps = {
  field: NumericField;
  label: string;
  value: number;
  maxValue: number;
  onChangeField: (field: NumericField, value: number) => void;
};

const ParamSlider = ({ field, label, value, maxValue, onChangeField }: ParamSliderProps) => {
  const handleChange = useCallback(
    (next: number | number[]) => {
      if (typeof next === 'number') onChangeField(field, next);
    },
    [field, onChangeField],
  );

  return (
    <Slider className={styles.slider} value={value} minValue={0} maxValue={maxValue} step={1} onChange={handleChange}>
      <div className={styles.sliderHeader}>
        <Label className={styles.sliderLabel}>{label}</Label>
        <SliderOutput className={styles.sliderValue} />
      </div>
      <SliderTrack className={styles.sliderTrack}>
        <SliderThumb className={styles.sliderThumb} />
      </SliderTrack>
    </Slider>
  );
};

const toBlockSize = (value: string): BlockSize => {
  switch (value) {
    case '16':
      return 16;
    case '32':
      return 32;
    default:
      return 8;
  }
};

export const GlitchControls = ({ params, onChangeField, onChangeBlockSize, onRandomizeSeed }: GlitchControlsProps) => {
  const handleBlockChange = useCallback(
    (value: string) => {
      onChangeBlockSize(toBlockSize(value));
    },
    [onChangeBlockSize],
  );

  return (
    <aside className={styles.root} aria-label="JPEG Glitch エフェクトコントロール">
      <header className={styles.headerRoot}>
        <p className={styles.title}>fx JPEG Glitch</p>
        <p className={styles.subtitle}>broken codec mirror</p>
      </header>
      <ParamSlider field="amount" label="Amount" value={params.amount} maxValue={100} onChangeField={onChangeField} />
      <ParamSlider field="quality" label="Quality" value={params.quality} maxValue={100} onChangeField={onChangeField} />
      <RadioGroup className={styles.radioGroup} value={`${params.blockSize}`} onChange={handleBlockChange}>
        <Label className={styles.sliderLabel}>Block Size</Label>
      <div className={styles.radioRow}>
        <Radio className={styles.radio} value="8">8</Radio>
        <Radio className={styles.radio} value="16">16</Radio>
        <Radio className={styles.radio} value="32">32</Radio>
      </div>
      </RadioGroup>
      <ParamSlider field="chroma" label="Chroma" value={params.chroma} maxValue={100} onChangeField={onChangeField} />
      <ParamSlider field="shift" label="Shift" value={params.shift} maxValue={100} onChangeField={onChangeField} />
      <div className={styles.seedRow}>
        <ParamSlider field="seed" label="Seed" value={params.seed} maxValue={9999} onChangeField={onChangeField} />
        <Button className={styles.seedButton} onPress={onRandomizeSeed} aria-label="シードをランダム化">
          ↻
        </Button>
      </div>
    </aside>
  );
};
```

- [ ] **Step 4: Implement styles.css.ts**

```ts
import { css } from 'styled-system/css';

export const root = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '5',
  padding: '5',
  width: '[240px]',
  flexShrink: 0,
  bg: 'stage.panel',
  borderRightWidth: '1px',
  borderRightStyle: 'solid',
  borderRightColor: 'stage.line',
  color: 'stage.text',
  overflowY: 'auto',
});

export const headerRoot = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1',
  paddingBottom: '3',
  borderBottomWidth: '1px',
  borderBottomStyle: 'solid',
  borderBottomColor: 'stage.line',
});

export const title = css({ fontSize: 'sm', fontWeight: 'bold', letterSpacing: 'wider' });

export const subtitle = css({ fontSize: 'xs', color: 'stage.dim' });

export const slider = css({ display: 'flex', flexDirection: 'column', gap: '2', width: '[100%]' });

export const sliderHeader = css({ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' });

export const sliderLabel = css({ fontSize: 'xs', color: 'stage.dim', letterSpacing: 'wide', textTransform: 'uppercase' });

export const sliderValue = css({ fontSize: 'xs', color: 'stage.text', fontVariantNumeric: 'tabular-nums' });

export const sliderTrack = css({
  position: 'relative',
  height: '[4px]',
  width: '[100%]',
  borderRadius: 'full',
  bg: 'stage.line',
});

export const sliderThumb = css({
  width: '[14px]',
  height: '[14px]',
  borderRadius: 'full',
  bg: 'stage.accent',
  top: '[50%]',
  cursor: 'grab',
  '&[data-dragging]': { cursor: 'grabbing' },
  '&[data-focus-visible]': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'stage.accent', outlineOffset: '2px' },
});

export const radioGroup = css({ display: 'flex', flexDirection: 'column', gap: '2' });

export const radioRow = css({ display: 'flex', gap: '2' });

export const radio = css({
  flex: '1',
  textAlign: 'center',
  fontSize: 'xs',
  paddingY: '1.5',
  borderRadius: 'md',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'stage.line',
  color: 'stage.dim',
  cursor: 'pointer',
  '&[data-selected]': { borderColor: 'stage.accent', color: 'stage.text', bg: 'rgba(124, 217, 255, 0.12)' },
  '&[data-focus-visible]': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'stage.accent', outlineOffset: '2px' },
});

export const seedRow = css({ display: 'flex', alignItems: 'flex-end', gap: '2' });

export const seedButton = css({
  flexShrink: 0,
  width: '[32px]',
  height: '[32px]',
  borderRadius: 'md',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'stage.line',
  color: 'stage.text',
  bg: 'transparent',
  cursor: 'pointer',
  '&[data-hovered]': { borderColor: 'stage.accent' },
  '&[data-focus-visible]': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'stage.accent', outlineOffset: '2px' },
});
```

(`bg: 'rgba(...)'` raw value will need the Panda escape hatch `bg: '[rgba(124, 217, 255, 0.12)]'` — use the bracketed form for any non-token value, matching the `width: '[240px]'` style.)

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm vitest run src/components/jpeg-glitch-stage/controls/controls.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
npx oxlint src/components/jpeg-glitch-stage && pnpm typecheck
git add src/components/jpeg-glitch-stage/controls
git commit --no-verify -m "feat: add JPEG glitch effect controls panel"
```

---

### Task 15: Stage component (index.tsx + styles + test)

**Files:**
- Create: `src/components/jpeg-glitch-stage/jpeg-glitch-stage.test.tsx`
- Create: `src/components/jpeg-glitch-stage/index.tsx`
- Create: `src/components/jpeg-glitch-stage/styles.css.ts`

- [ ] **Step 1: Write the failing test**

Note: headless chromium has no WebGPU/camera, so the stage will surface the `no-webgpu` or `no-camera` notice — the canvas and controls must still render (this is why the spec uses status notices instead of throwing).

```tsx
import { describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { JPEGGlitchStage } from '.';

describe('JPEGGlitchStage', () => {
  test('renders the glitch canvas with an accessible description', async () => {
    render(<JPEGGlitchStage />);
    await expect.element(page.getByRole('img', { name: /JPEG グリッチ/ })).toBeInTheDocument();
  });

  test('renders the effect controls panel', async () => {
    render(<JPEGGlitchStage />);
    await expect.element(page.getByRole('slider', { name: 'Amount' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/components/jpeg-glitch-stage/jpeg-glitch-stage.test.tsx`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement index.tsx**

```tsx
'use client';

// "JPEG Glitch" — live camera through a real (and really broken) JPEG pipeline.
// Left panel = AE-style effect controls; right = the WebGPU glitch canvas.

import { useCallback, useRef, useState } from 'react';

import { GlitchControls, type NumericField } from './controls';
import * as styles from './styles.css';
import { DEFAULT_PARAMS, type BlockSize, type GlitchParams, type GlitchStatus } from './types';
import { useJPEGGlitch } from './use-jpeg-glitch';

const SEED_RANGE = 10000;

const noticeText = (status: GlitchStatus): string | undefined => {
  switch (status) {
    case 'no-webgpu':
      return 'この表現には WebGPU 対応ブラウザが必要です。Chrome / Edge / Arc の最新版でお試しください。';
    case 'no-camera':
      return 'カメラにアクセスできませんでした。カメラを許可してから再読み込みしてください。';
    case 'lost':
      return 'GPU との接続が失われました。ページを再読み込みしてください。';
    case 'booting':
      return 'カメラを起動しています…';
    case 'running':
      return undefined;
  }
};

export const JPEGGlitchStage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [params, setParams] = useState<GlitchParams>(DEFAULT_PARAMS);
  const status = useJPEGGlitch(canvasRef, params);
  const notice = noticeText(status);

  const handleChangeField = useCallback((field: NumericField, value: number) => {
    setParams((previous) => ({ ...previous, [field]: value }));
  }, []);

  const handleChangeBlockSize = useCallback((blockSize: BlockSize) => {
    setParams((previous) => ({ ...previous, blockSize }));
  }, []);

  const handleRandomizeSeed = useCallback(() => {
    setParams((previous) => ({ ...previous, seed: Math.floor(Math.random() * SEED_RANGE) }));
  }, []);

  return (
    <div className={styles.root} data-status={status}>
      <GlitchControls
        params={params}
        onChangeField={handleChangeField}
        onChangeBlockSize={handleChangeBlockSize}
        onRandomizeSeed={handleRandomizeSeed}
      />
      <div className={styles.stageRoot}>
        <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="JPEG グリッチを適用したカメラ映像。左のパネルで破壊量を調整できます。" />
        {notice !== undefined && (
          <p className={styles.notice} data-tone={status === 'booting' ? 'soft' : 'alert'}>
            {notice}
          </p>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Implement styles.css.ts**

```ts
import { css } from 'styled-system/css';

export const root = css({
  display: 'flex',
  height: '100dvh',
  bg: 'stage.bg',
  containerType: 'inline-size',
  '@container (max-width: 700px)': {
    flexDirection: 'column-reverse',
  },
});

export const stageRoot = css({
  position: 'relative',
  flex: '1',
  minWidth: '0',
  minHeight: '0',
});

export const canvas = css({
  position: 'absolute',
  inset: '0',
  width: '[100%]',
  height: '[100%]',
  display: 'block',
});

export const notice = css({
  position: 'absolute',
  left: '[50%]',
  bottom: '6',
  transform: 'translateX(-50%)',
  maxWidth: '[80%]',
  paddingX: '4',
  paddingY: '2',
  borderRadius: 'lg',
  bg: 'stage.panel',
  fontSize: 'sm',
  textAlign: 'center',
  color: 'stage.text',
  '&[data-tone="soft"]': { color: 'stage.dim' },
});
```

(Note: the `@container` query on `root` requires a parent with `containerType` — Panda supports inline `@container` conditions; if the bare string key fails codegen, register a container condition or fall back to wrapping the query as `'@container (width < 700px)'` per Panda docs. Components rule: container queries, not media queries.)

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm vitest run src/components/jpeg-glitch-stage/jpeg-glitch-stage.test.tsx`
Expected: PASS (status notice may appear — assertions don't depend on engine success)

Also run the full suite to catch regressions: `pnpm test:run`

- [ ] **Step 6: Commit**

```bash
npx oxlint src/components/jpeg-glitch-stage && pnpm typecheck
git add src/components/jpeg-glitch-stage
git commit --no-verify -m "feat: add JPEGGlitchStage component"
```

---

### Task 16: Page route

**Files:**
- Create: `src/app/(frontend)/jpeg-glitch/page.tsx`

- [ ] **Step 1: Implement (mirrors `src/app/(frontend)/page.tsx`)**

```tsx
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { css } from 'styled-system/css';

import { JPEGGlitchStage } from '../../../components/jpeg-glitch-stage';

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'JPEG Glitch — broken codec mirror',
  description: 'AE の JPEG Glitch をライブカメラで再現。YCbCr / 8x8 DCT / 量子化を WebGPU 上で実際に通し、係数をリアルタイムに破壊します。',
};

export const viewport: Viewport = {
  themeColor: '#04060a',
};

const main = css({ minHeight: '100dvh', bg: 'stage.bg' });
const srOnly = css({ srOnly: true });
const fallback = css({
  position: 'fixed',
  inset: '0',
  display: 'grid',
  placeItems: 'center',
  bg: 'stage.bg',
  color: 'stage.dim',
  fontSize: 'sm',
});

const JPEGGlitchPage = () => (
  <main className={main}>
    <section>
      <h1 className={srOnly}>JPEG Glitch — カメラ映像のリアルタイム JPEG 破壊</h1>
      <ErrorBoundary fallback={<p className={fallback}>JPEG Glitch の初期化に失敗しました。再読み込みしてください。</p>}>
        <Suspense fallback={<div className={fallback} aria-hidden="true" />}>
          <JPEGGlitchStage />
        </Suspense>
      </ErrorBoundary>
    </section>
  </main>
);

export default JPEGGlitchPage;
```

- [ ] **Step 2: Verify + commit**

```bash
npx oxlint "src/app/(frontend)/jpeg-glitch" src/components/jpeg-glitch-stage && pnpm typecheck
git add "src/app/(frontend)/jpeg-glitch"
git commit --no-verify -m "feat: add /jpeg-glitch page route"
```

---

### Task 17: Final verification

- [ ] **Step 1: Full test suite**

Run: `pnpm test:run`
Expected: all jpeg-glitch tests pass; pre-existing suites stay green.

- [ ] **Step 2: Lint + typecheck**

Run: `pnpm lint; pnpm typecheck`
Expected: typecheck clean. `pnpm lint` will still report the pre-existing `poly-trace` errors — confirm NO errors mention `jpeg-glitch`. Run `pnpm oxfmt --write src/components/jpeg-glitch-stage "src/app/(frontend)/jpeg-glitch"` if formatting drifts, and re-commit.

- [ ] **Step 3: Live check (chrome-devtools)**

```bash
pnpm dev
```

Open `http://localhost:3000/jpeg-glitch` via chrome-devtools MCP:
- Page loads; left panel shows fx JPEG Glitch with all 6 controls.
- Grant camera permission (if the automated browser can't grant it, verify the `no-camera` notice appears instead, and ask the user to verify the camera path manually).
- With camera: glitch artifacts visible; drag Amount to 0 → near-clean image (only quality crush); Quality to 100 + Amount 0 → essentially clean camera (DCT roundtrip sanity check); Quality to 1 → heavy block crush; Block Size 32 → chunky blocks; Shift up → row displacement; same Seed → same corruption pattern (deterministic).
- Take an accessibility snapshot: canvas has role=img with Japanese label; all sliders/radios/buttons have accessible names; heading hierarchy h1 present.
- Check console for WebGPU validation errors (must be none).

- [ ] **Step 4: Fix anything found, commit, report**

---

## Self-review notes (already applied)

- Spec coverage: DCT corruption (Task 8 dct-corrupt), quality crush (Tasks 5+8), chroma collapse (Task 8 color-separate), block shift (Task 8 render), full-control sliders (Task 14), `/jpeg-glitch` route (Task 16), hybrid p5+WebGPU (Tasks 11+12), TDD for math (Tasks 3–7), status-notice error handling per amended spec (Tasks 12+15).
- Type consistency: `GlitchParams`/`BlockSize`/`FrameInput`/`GlitchStatus` defined once in Task 2 and imported everywhere; uniform layout (10 used + 2 pad floats) matches `common.wgsl` struct and `glitch-params` packing test; `NumericField` exported from controls and consumed by the stage.
- Known risk: p5 `createCapture` API surface differs between 1.x/2.x — Task 11 includes a doc-check step; the minimal ambient declaration fallback (Task 1) keeps typecheck deterministic either way.
