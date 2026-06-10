# JPEG Glitch — design spec

Date: 2026-06-11
Status: approved (design), pending implementation plan

## Goal

AE プラグイン「JPEG Glitch」をライブカメラ入力で再現する新ページ `/jpeg-glitch` を追加する。
JPEG 圧縮の内部表現(YCbCr / 8x8 DCT / 量子化)を GPU 上で実際に通し、その係数を意図的に破壊することで「本物の壊れた JPEG」のアーティファクトをリアルタイムに生成する。

## Stack decision: hybrid p5.js + raw WebGPU

- **p5.js**(新規依存・instance mode): カメラ取得 `createCapture(VIDEO)`、`draw()` フレームループ、ライフサイクル管理を担当。`noCanvas()` で p5 自身は描画キャンバスを持たない。
- **raw WebGPU + 生 WGSL**: 表示用 canvas を所有。毎フレーム `copyExternalImageToTexture` で video フレームを取り込み、compute pass でグリッチ処理して画面へ描画。
- 採用理由: p5.js 2.2 の WebGPU レンダラーは experimental かつシェーダーが p5.strands(JS 変換)経由で、生 WGSL の自由度が低い。ハイブリッドなら p5.js の要望を満たしつつ、既存 `fluid-stage` と同じ raw WebGPU パターンで WGSL を書ける。

## Effect pipeline (WGSL compute)

1. **色分離 + クロマ崩壊**: RGB → YCbCr。Cb/Cr は `chroma` パラメータに応じて粗サブサンプリング + ブロック単位ランダムオフセット(色滲み・ブロック単位の色相狂い)。
2. **DCT 破壊(本命)**: 8x8 ブロックごとに 1 workgroup(64 threads, shared memory)で forward DCT → 係数操作 → inverse DCT を 1 kernel で実行。
   - `quality`: JPEG 標準量子化テーブルをスケールして量子化→逆量子化(低品質クラッシュ、モスキートノイズ)
   - `amount` + `seed`: 係数のランダムなゼロ化・入れ替え・増幅(破損 JPEG 特有のブロックノイズ)
3. **再合成 + ブロックズレ**: YCbCr → RGB(クロマ位置ズレ込み)、ブロック行単位の水平変位(datamosh 風スキャンラインズレ)→ スワップチェーンへ。
4. **Block Size**: 処理解像度を 1/1, 1/2, 1/4 に落とすことで実効ブロック 8/16/32px を実現。

駆動方式は**常時適用**。グリッチ量はすべてスライダーで手動制御(AE プラグインの操作感を踏襲)。

## Parameters (all exposed as sliders)

| Param      | Range     | Effect                               |
| ---------- | --------- | ------------------------------------ |
| Amount     | 0–100     | DCT 係数破壊の確率・強度             |
| Quality    | 0–100     | 量子化テーブルのスケール(低いほど崩壊) |
| Block Size | 8/16/32   | 実効 DCT ブロックサイズ              |
| Chroma     | 0–100     | クロマサブサンプリング崩壊量         |
| Shift      | 0–100     | ブロック行水平変位量                 |
| Seed       | 0–9999    | 決定論 PRNG シード(↻ randomize ボタン付き) |

## UI

左サイドパネル常時表示(AE の Effect Controls 風)。

```
┌─────────┬──────────────────┐
│fx JPEG  │                  │
│ Glitch  │                  │
│▸ amount │  (camera glitch) │
│▸ quality│                  │
│▸ block  │                  │
│▸ chroma │                  │
│▸ shift  │                  │
│▸ seed ↻ │                  │
└─────────┴──────────────────┘
```

- スライダーは react-aria-components の `Slider`。Seed は Slider + randomize `Button`。
- Panda CSS トークンで WCAG2.1 AA を満たす配色。パネルは container query で狭幅時に折り畳み可能なら折り畳み(モバイルは下部シート化は今回スコープ外、縦積みで許容)。
- ページ構造: `<main><section><h1 (srOnly)>` + ErrorBoundary > Suspense(既存 `/` と同型)。

## File layout

```
src/app/(frontend)/jpeg-glitch/page.tsx     ← Server Component(metadata, boundaries)
src/components/jpeg-glitch-stage/
├── index.tsx                ← 'use client' エントリ
├── styles.css.ts
├── jpeg-glitch-stage.test.tsx
├── sketch/index.ts          ← p5 instance mode(camera + loop)
├── engine/                  ← raw WebGPU(pipelines / resources / bind-groups)
│   └── shaders/*.wgsl       ← 生 WGSL(shader-files ルール準拠で分離)
├── math/
│   ├── quant-table/         ← quality → 量子化テーブル(+ test)
│   ├── glitch-params/       ← UI 値 → uniform パッキング(+ test)
│   └── hash/                ← seed 付き決定論 PRNG(+ test)
└── controls/                ← スライダーパネル(react-aria-components)
```

## Error handling

- WebGPU 非対応 / カメラ拒否 / device lost は status(`no-webgpu` / `no-camera` / `lost`)としてステージ上に日本語の notice を表示する(既存 fluid-stage と同じ方式)。
  - throw → ErrorBoundary 方式から変更した理由: headless テスト環境(WebGPU/カメラなし)でもコンポーネントが描画でき、カメラ拒否後もコントロールパネルが操作可能なまま残るため。
- ErrorBoundary / Suspense は予期しない例外・初期ロードの保険として page 側に残す(既存 `/` と同型)。

## Testing (TDD, vitest browser mode)

- `math/` の純粋関数を Red → Green → Refactor で実装:
  - quant-table: quality 50 = 標準テーブル、スケール式の境界値
  - glitch-params: パッキングのバイトレイアウト
  - hash: 同 seed 同出力の決定論性、分布の粗い検査
  - TS 参照実装の DCT 往復(forward→inverse ≒ identity)を WGSL 実装の仕様として固定
- コンポーネント境界(マウント・エラーフォールバック)は既存 fluid-stage テストの形式に従う。
- 完了条件: `pnpm lint && pnpm typecheck && pnpm test:run` green、chrome-devtools で UI/アクセシビリティ確認。

## Out of scope

- 音声リアクティブ駆動、録画/エクスポート、プリセット保存
- 既存 `/`(Liquid Mirror)への変更
- payload CMS 連携(本ページは静的なエフェクトページ)
