# Trace & Blob Tracking FX ページ — 設計

日付: 2026-06-11
ステータス: 承認済み (ステークホルダー確認済み)

## 目的

TouchDesigner の "Trace and Blob Tracking Effect" (youtube.com/watch?v=ioSVh06MySc) を Web で再現する新ページ `/trace` を追加する。webcam に映る人物のシルエットを緑のワイヤーフレーム輪郭でトレースし、残像・ブロブ追跡 bbox・座標 HUD テキスト・ポイント間ワイヤーを重ねる VJ 向け FX。

参照イメージ:

- 倉庫のダンサー: 白い plexus ワイヤー + bbox + コード風 HUD テキスト
- バレリーナ: 緑の輪郭トレース残像 + シアンのトラッキングボックス

## 採用要素 (すべて採用)

| 要素 | 内容 |
| --- | --- |
| A. 輪郭トレース + 残像 | シルエット輪郭の緑ワイヤーフレーム。過去フレームの輪郭がフェードして尾を引く |
| B. ブロブ bbox + HUD | 検出領域にシアン矩形 + 等幅フォントの座標/ID/confidence ラベル |
| C. plexus ワイヤー | 輪郭特徴点・blob 重心間を細線で接続 |
| D. WGSL ポストFX | スキャンライン・ブルーム・色収差を背景レイヤーに適用 |

## アーキテクチャ: 2 キャンバス・ハイブリッド

p5.js 2.2 の WebGPU モードは RC 段階で生 WGSL を書けない (p5.strands による JS トランスパイル方式) ため、WGSL は素の WebGPU エンジン (既存 fluid-stage と同パターン) で書き、p5.js はベクター/タイポグラフィ描画レイヤーに限定する。

```
webcam (getUserMedia)
  │
  ├─────────────────────────────┐
  ▼                             ▼
[MediaPipe ImageSegmenter]   [WebGPU エンジン (生WGSL)]
  人物マスク (VIDEO mode,       camera frame + mask texture
  GPU delegate)                  ├ マスク残像 feedback (ping-pong)
  │                              ├ 合成: 暗転実写 + マスクグロー
  │ CPU confidence mask          └ ポスト: scanline/bloom/色収差
  ▼                             ▼
[detection 純粋関数群]        canvas#1 — 背景レイヤー
  marching squares → 輪郭線
  RDP simplify → 頂点削減
  connected components → blob
  最近傍重心照合 → blob ID 追跡
  │
  ▼
[p5.js 2D instance mode]
  輪郭ポリライン (現在=明 / 履歴リングバッファ=フェード)
  plexus ワイヤー / bbox / HUD テキスト
  ▼
canvas#2 — 透明オーバーレイ
```

設計判断:

- **トレース残像は p5 側のリングバッファ** (過去 N フレームの輪郭ポリラインを透明度を下げて再描画)。線は常にシャープ。GPU feedback は面 (マスクグロー) の残像のみ担当。
- **GPU readback 不要**: MediaPipe ImageSegmenter は CPU の confidence mask を直接返すので、輪郭抽出は CPU mask から行い、同じ mask を texture として GPU にアップロードする。
- ポスト FX は canvas#1 (映像レイヤー) のみに適用。オーバーレイのベクターは加工しない (参照映像でも線と文字はシャープ)。

## ファイル構成

```
src/app/(frontend)/trace/page.tsx   RSC。既存 page.tsx と同型
                                    (ErrorBoundary + Suspense + クライアント島)
src/components/trace-stage/
├── index.tsx              クライアント境界。キャンバス重ね + カメラ開始 UI
├── use-trace-fx.ts        rAF ループ・ライフサイクル統括 hook
├── engine/                生 WebGPU (fluid-stage/engine のパターンを踏襲)
│   ├── index.ts / pipelines.ts / bind-groups.ts / resources.ts
│   └── shaders/           feedback.wgsl / composite.wgsl / post.wgsl
├── detection/
│   ├── segmenter.ts       MediaPipe ラッパー (副作用をここに隔離)
│   ├── marching-squares.ts  純粋関数・TDD
│   ├── simplify.ts          純粋関数・TDD (Ramer–Douglas–Peucker)
│   └── blob-tracker.ts      純粋関数・TDD (connected components + ID 追跡)
├── overlay/
│   ├── sketch.ts          p5 instance-mode スケッチ
│   └── hud.ts             HUD 文字列整形。純粋関数・TDD
├── session/               カメラセッション (fluid-stage/session の共通化を検討)
├── styles.css.ts / types.ts
└── trace-stage.test.tsx   スモークテスト
```

追加依存: `@mediapipe/tasks-vision`, `p5`, `@types/p5` (pnpm add)

## フレームごとのデータフロー

1. video frame → `segmenter.ts` (VIDEO mode, `detectForVideo`) → confidence mask (低解像度, 例 256×144)
2. mask → `marching-squares.ts` → 輪郭ポリライン群 → `simplify.ts` で頂点削減
3. mask → `blob-tracker.ts` → blobs (bbox / centroid / area / 前フレームとの最近傍照合で安定 ID)
4. mask texture + video frame → WebGPU エンジン → canvas#1 描画
5. 輪郭・blobs・履歴リングバッファ → p5 sketch → canvas#2 描画

## デザイントークン (CV グリーン — 参照動画準拠)

panda theme の semantic token に追加:

| token | 値 | 用途 |
| --- | --- | --- |
| `trace.bg` | `#0b0e0b` | ページ/ステージ背景 |
| `trace.line` | `#7CFC00` | 輪郭トレース線 |
| `trace.hud` | `#39c5cf` | bbox 枠 |
| `trace.hudText` | `#9fe8ee` | HUD テキスト (vs `trace.bg` でコントラスト比 ≈ 12:1, WCAG AA 充足) |
| `trace.wire` | `#cfe8cf` | plexus ワイヤー |

HUD テキストは等幅フォント。残像のフェードは opacity 階調 (token 化はせず sketch 内定数)。

## エラー処理

- WebGPU 非対応: 既存 ErrorBoundary パターンで案内文表示
- カメラ拒否: 再試行 UI (react-aria-components の Button)
- MediaPipe WASM ロード失敗: エラーステート表示。フォールバック検出 (フレーム差分) は本スコープ外

## テスト方針 (vitest browser mode / TDD)

Red→Green で先行実装する純粋関数:

1. `marching-squares.ts` — 既知の小さな 2D グリッド → 期待する輪郭セグメント
2. `simplify.ts` — 既知ポリライン → ε ごとの頂点削減結果
3. `blob-tracker.ts` — 合成 mask → bbox/centroid、2 フレーム間の ID 安定性
4. `hud.ts` — blob → ラベル文字列

engine / p5 sketch は fluid-stage 同様スモークテスト (初期化が throw しないこと)。

## スコープ外

- フレーム差分/輝度閾値ベースの検出モード切替 (将来の拡張候補)
- 録画・スクリーンショット機能
- Payload CMS 連携 (このページは静的な FX ページ)

## 検証

実装完了時に `pnpm lint && pnpm typecheck && pnpm test:run`、chrome-devtools で UI/アクセシビリティ確認 (CLAUDE.md ルール)。
