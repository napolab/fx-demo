# PolyTrace — AE Polytrace 再現ページ 設計

日付: 2026-06-11
ステータス: 承認済み

## 目的

After Effects のサードパーティプラグイン **Polytrace**(Element Supply Co. / Cinema Spice 製)の挙動を、
**p5.js + WGSL(WebGPU)** で再現する新規ページを追加する。ソースはカメラ入力(getUserMedia 経由の
p5.createCapture)。

Polytrace の本質: フッテージから特徴点を抽出し **Delaunay 三角形分割**でローポリメッシュ化、
各三角形を元映像の色でベタ塗りする。ノイズエンジンによる揺らぎ・グリッチ表現を持つ。

## 決定事項(ステークホルダー承認済み)

| 項目 | 決定 |
| --- | --- |
| 構成 | ハイブリッド: p5.js がカメラ取得・ループ・最終描画、WGSL compute が特徴点抽出と色サンプリング、Delaunay は CPU(delaunator) |
| ルック | フル Polytrace 再現(カラーのベタ塗り三角形 + 任意ワイヤーフレーム) |
| 時間挙動 | グリッチャ明滅: 毎フレーム特徴点を再抽出 + ノイズジッタ |
| 操作 UI | フルコントロールパネル(react-aria-components) |
| ルート | `/polytrace`(`src/app/(frontend)/polytrace/page.tsx`) |

## アーキテクチャ

```
/polytrace ページ (client component)
│
├ p5.js (instance mode, dynamic import)
│   ├ createCapture(VIDEO) … カメラ取得
│   ├ draw() ループ … フレーム駆動
│   └ 三角形の最終描画 (fill = サンプル色, stroke = ワイヤー)
│
├ WebGPU / WGSL (毎フレーム)
│   ├ copyExternalImageToTexture(video) … フレーム転送
│   ├ compute: luma → Sobel エッジ強度 + 縮小カラーマップ
│   │   (160×90 グリッドへダウンサンプル、1 パスで両方出力)
│   └ 1 回の readback で {エッジスコア, 色} を CPU へ
│
└ CPU (純粋関数, TDD 対象)
    ├ エッジスコア上位 N 点 + 外周固定点 + ノイズジッタ点を抽出
    ├ delaunator で Delaunay 三角形分割
    └ 各三角形の重心色を縮小カラーマップから解決 → p5 描画へ
```

- GPU↔CPU 往復はフレームあたり 1 回(≈115KB)。Delaunay が CPU でしか現実的に
  できないため往復は必須だが、重心色も縮小カラーマップから CPU で引くことで
  2 回目の readback を不要にする。
- p5.js は WGSL を直接実行できないため、WebGPU は独立した offscreen 処理として
  並走させ、p5 は結果のジオメトリ+色を描く。

## ファイル構成

```
src/components/poly-trace/
├ index.tsx                  … PolyTrace コンポーネント(canvas + パネル + status)
├ use-poly-trace.ts          … セッションの mount/unmount hook
├ session/index.ts           … RAF・カメラ・dispose(fluid-stage と同型の非 React glue)
├ engine/                    … WebGPU 初期化・pipeline・readback
│   └ shaders/extract.wgsl   … luma + Sobel + ダウンサンプル compute
├ mesh/
│   ├ points.ts              … スコア→上位 N 点抽出・外周点・ジッタ(純粋関数)
│   └ triangles.ts           … delaunator ラップ・重心色解決(純粋関数)
├ controls/index.tsx         … react-aria-components 製コントロールパネル
└ types.ts

src/app/(frontend)/polytrace/page.tsx
```

依存追加: `p5`, `delaunator`(+型定義)

## コントロールパネル(AE エフェクトコントロール相当)

| パラメータ | UI | 範囲 | 既定値 |
| --- | --- | --- | --- |
| 点の数 (Point Count) | Slider | 50–2000 | 600 |
| エッジ感度 (Edge Sensitivity) | Slider | 0–1 | 0.5 |
| 揺らぎ量 (Noise Amount) | Slider | 0–1 | 0.15 |
| ワイヤーフレーム表示 | Switch | on/off | off |
| 線の太さ | Slider | 0.5–3px | 1 |
| 塗り表示 | Switch | on/off | on |

- Panda CSS でスタイリング、WCAG 2.1 AA コントラスト準拠
- パネルは `<section>` + 見出しのランドマーク構造(semantic-html ルール準拠)

## エラー処理

- カメラ拒否 → 専用メッセージを表示(エフェクトは停止)
- WebGPU 非対応 → 専用メッセージを表示
- fluid-stage の status パターンを踏襲

## テスト方針

- TDD: `mesh/points.ts` と `mesh/triangles.ts` を vitest(browser mode)で先にテスト
  - スコアグリッド → 上位 N 点抽出(感度しきい値・重複排除)
  - 外周固定点の生成
  - 決定的ハッシュノイズによるジッタ
  - delaunator ラップ: 三角形インデックス→重心→カラーマップ参照
- GPU/p5 部分は実機(chrome-devtools)で目視 + アクセシビリティ確認
