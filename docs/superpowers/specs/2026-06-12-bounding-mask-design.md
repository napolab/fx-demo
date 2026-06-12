# bounding-mask — Design

- Date: 2026-06-12
- Status: Approved (design), pending implementation plan
- Author: napochaan + Claude

## 1. Purpose

A new `(frontend)` page, `bounding-mask`, that takes a **webcam stream or an
uploaded video** and covers user-selected **body parts** with a **single-color
solid mask** in real time. The mask shape is switchable between a **bounding box
(rectangle)** and a **silhouette (person-outline-following)** fill. Scope is
**live preview only** — no snapshot or recording output.

The six detectable parts come from the existing MediaPipe pose topology:
`face`, `hand_L`, `hand_R`, `hip`, `leg_L`, `leg_R`.

## 2. Decisions (locked)

| Topic        | Decision                                                            |
| ------------ | ------------------------------------------------------------------- |
| Mask shape   | **Both** — `box` ↔ `silhouette`, switchable via a toggle            |
| Mask style   | **Solid color fill** (色指定ベタ塗り)                              |
| Color model  | **Single color** applied to all selected parts                      |
| Output scope | **Live preview only** (no PNG snapshot, no recording)               |
| Part select  | **Toggle switch list** (react-aria `Switch` per part)               |
| Color UI     | **Preset swatches + custom picker** (`ColorSwatch` + `ColorPicker`) |
| Extra knobs  | **opacity**, **edge feather**, **part-name label**, **padding scale** |
| Detection    | **Reuse** `trace-stage/detection/*` via direct import (no extraction) |
| Renderer     | **2D canvas** compositing (no WebGPU, no video grading)             |

Two consciously accepted, hard-to-reverse choices:

- **(A) Reuse detection by direct import from `trace-stage`.** The detection
  factories (`segmenter`, `pose`, `part-boxes`, `vision-fileset`) are
  framework-free and already self-host WASM/models from `public/mediapipe/`.
  We import them directly rather than extracting a shared module, to keep scope
  focused. If a third consumer ever appears, extraction can be revisited.
- **(B) 2D canvas instead of WebGPU.** `trace-stage`'s WebGPU pass exists for
  video grading (scanlines/grain/vignette), which masking does not need. A
  single `<canvas>` 2D context at video framerate, upscaling a 320×180 person
  mask, is simpler and fast enough.

## 3. Architecture

Follows the `trace` / `polytrace` page+component pattern (Suspense +
ErrorBoundary page shell; imperative session owned by a hook; params travel
through a ref so live tweaks never tear down the camera).

```
src/app/(frontend)/bounding-mask/page.tsx   # Suspense + ErrorBoundary, metadata, srOnly <h1>
src/components/bounding-mask/
├── index.tsx            # 'use client'. host/overlay refs, status, params (state + ref), <Controls/>
├── use-bounding-mask.ts # useEffect → createBoundingMaskSession(...); returns status + actions
├── types.ts             # MaskShape, MaskParams, InputSource, Status
├── styles.css.ts        # Panda CSS (mask.* tokens)
├── session/index.ts     # camera acquire / file load / RAF loop / detection calls / render orchestration / dispose
├── render/index.ts      # 2D canvas compositing: video base + mask layer (box|silhouette, color/opacity/feather/padding/label)
└── controls/index.tsx   # react-aria: part Switch list / ColorSwatch+ColorPicker / shape ToggleButtonGroup / Sliders / FileTrigger
```

Detection is **not** re-implemented. The session imports directly from
`src/components/trace-stage/detection/`:

- `segmenter/index.ts` → person confidence mask (`Float32Array`, ~320×180)
- `pose/index.ts` → 33-point landmarks per pose
- `part-boxes/index.ts` → 6 labeled `PartBox` (normalized 0..1 UV)
- `vision-fileset/index.ts` → cached WASM fileset loader

Shared types (`BodyPart`, `PartBox`, `PoseLandmark`) are imported from
`src/components/trace-stage/types.ts`.

## 4. Rendering pipeline (2D canvas)

A single full-bleed `<canvas>` with a `2d` context. Per RAF frame:

1. **Base**: `ctx.drawImage(video, …)` with cover-fit scaling so the video fills
   the canvas regardless of aspect ratio. The cover transform (scale + offset)
   is computed once per frame and reused to map normalized UV → screen pixels.
2. **Detection**: run segmenter + pose on the current video frame (throttled the
   same way `trace-stage` does — pose every frame, mask reused between frames is
   acceptable; exact cadence decided in the plan), producing `partBoxes` and the
   person mask.
3. **Mask layer** — for each **enabled** part, expand its box by `padding`, then:
   - **box**: `ctx.fillRect(screenBox)` with `color` at `opacity`. `feather` is
     applied via `ctx.filter = blur(feather px)` (or an offscreen blurred pass).
   - **silhouette**: paint a tinted layer where `personMask > threshold`, clipped
     to the (padded) part boxes, at `color`/`opacity`, feathered by blur. The
     tinted mask is built on an offscreen canvas at mask resolution, then drawn
     scaled to screen.
4. **Label** (when `showLabel`): draw the part name near the box (trace HUD
   style — small plate + text), respecting AA contrast against the fill.

Compositing uses `globalAlpha`/`fillStyle` rgba so `opacity` reads correctly for
both shapes. Union vs per-box painting for silhouette clipping is an
implementation detail left to the plan; semantics: a pixel is masked iff it is
inside an enabled part's padded box **and** (for silhouette) on the person.

## 5. Parameters

Live-tweakable params travel through a ref (`paramsRef.current`), read by the
session via a getter callback — never as React props to the session — so the
camera/detection are never recreated on a slider drag.

```ts
type MaskShape = 'box' | 'silhouette';

type MaskParams = {
  parts: Record<BodyPart, boolean>; // initial: { face: true, others: false }
  shape: MaskShape;                 // initial: 'box'
  color: string;                    // hex, e.g. '#ff3b3b'
  opacity: number;                  // 0..1, initial 1
  feather: number;                  // px, 0..N, initial 0
  padding: number;                  // box scale 1.0..1.5, initial 1.0
  showLabel: boolean;               // initial false
};
```

## 6. Input source (webcam / upload)

Mirrors `trace-stage`:

- On start, attempt `getUserMedia({ video: { facingMode: 'user', … }, audio: false })`.
- `loadVideoFile(file: File)` creates a looping `<video>` from an object URL and
  swaps it in as the active source (revoking the previous URL on swap/dispose).
- Controls expose: **動画を選択** (`FileTrigger`) and **webcam に戻す**.

Status: `'booting' | 'no-camera' | 'running'`. No `no-webgpu` state (2D canvas).
When no camera and no file, show the `no-camera` affordance prompting upload.

## 7. Controls UI (react-aria-components)

Per UI rules, everything is reachable via react-aria-components (priority 1):

- **Parts**: six `Switch`es (face / hand_L / hand_R / hip / leg_L / leg_R).
- **Color**: a row of preset `ColorSwatch`es plus a `+` button opening a
  `ColorPicker` (`ColorArea` + `ColorSlider`) for a custom value.
- **Shape**: `ToggleButtonGroup` with Box / Silhouette.
- **Sliders**: `Slider` for opacity, feather, padding.
- **Label**: a `Switch`.
- **Input**: `FileTrigger` + `Button` to pick a video; `Button` to return to webcam.

Preset fill colors are a small curated constant set (not design tokens, since
they are content/paint values, not UI chrome).

## 8. Design tokens

Add a `mask` color namespace to `panda.config.ts` (sibling of `stage`/`trace`):
`bg`, `text`, `dim`, `panel`, `line`, `accent` — all meeting WCAG 2.1 AA
contrast for their usage. Styles import via `import * as styles from
'./styles.css'` and reference `mask.*`.

## 9. Testing (vitest, TDD)

Pure functions are the TDD targets; canvas/session side effects get thin
coverage:

- `PartBox` → padded screen rect (given cover transform + padding).
- silhouette membership: pixel ∈ padded box **and** `personMask > threshold`.
- color/opacity → composited rgba string/value.
- `MaskParams` defaults and part-toggle reducer.

Session/canvas drawing is exercised lightly (smoke), as it is effect-heavy.

## 10. Build order (implementation delegated to subagents)

1. Wire detection reuse + `types.ts` + default params.
2. Pure helpers with vitest (TDD): cover transform, padded rect, silhouette
   membership, composite color.
3. `render/index.ts` (box, then silhouette, then feather/label).
4. `session/index.ts` (camera, file load, RAF, detection, dispose).
5. `controls/index.tsx` (react-aria).
6. `page.tsx` + `mask` tokens + styles.
7. `pnpm lint && pnpm typecheck`, then chrome-devtools UI + a11y verification.

## 11. Out of scope

- Snapshot/PNG export, video recording/download.
- Per-part distinct colors (single color only).
- Mosaic / blur-only mask styles (solid fill only).
- Extracting detection into a shared module.
- WebGPU rendering / video grading.
