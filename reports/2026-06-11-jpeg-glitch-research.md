# JPEG Glitch 調査レポート — AE プラグインの仕組みと TouchDesigner の手法

Date: 2026-06-11

## 1. aescripts「JPEG glitch」プラグイン(本家)の仕組み

出典: [aescripts JPEG glitch 製品ページ](https://aescripts.com/jpeg-glitch/)(直接取得は 403 のため検索スニペット・レビュー記事から再構成)

### 動作原理

- 各フレームを**本物の JPEG にエンコード → 変換段階で意図的にエラーを注入 → デコードして返す**。
- 「壊れたバイトはすべて変換段階に閉じ込められる」ので、出力自体は常に正常な画像(レンダリングが壊れない)。

### パラメータ構成

| パラメータ | 操作対象 | 視覚効果 |
| --- | --- | --- |
| Compression ratio | JPEG 品質(情報量) | 低いほどリッチなグリッチ(複雑なグリッチほど多くのバイトが必要) |
| QTC position / QTC value | 量子化テーブルの 64 値のうち 1 つを手動で書き換え | 特定周波数だけのリンギング・縞模様 |
| Breaking bytes + max random value | 量子化テーブルの 64 値のうち N 個をランダム値に置換 | テーブル破壊による周波数ノイズ |
| Broken bytes | エントロピー符号化後の**圧縮ビットストリーム**のバイトを破壊 | 古典的な「裂けて流れる虹色ブロック」。OS によって結果が異なる(プラットフォーム依存) |

### 我々の実装とのマッピング

- Quality ↔ Compression ratio ✅(IJG スケーリングで同等)
- Amount(係数 drop/steal/boost)↔ Broken bytes の見た目を周波数領域で近似 ✅
- Shift(ブロック行の水平ズレ)↔ ビットストリーム破壊時の Huffman 同期ズレ(破損点以降が横に流れる)を近似 ✅
- **未実装で本家にあるもの**: 量子化テーブル自体のランダム破壊(Breaking bytes / QTC)。
  - 追加するなら: `quant-table` に seed 付きで N エントリをランダム化する `tableChaos` パラメータを足すだけで実現可能(CPU 側 1 関数 + スライダー 1 本)。

## 2. TouchDesigner での手法

### 2a. Datamosh 系(動き由来のグリッチ)

出典: [Interactive & Immersive HQ: Datamoshing in TouchDesigner](https://interactiveimmersive.io/blog/touchdesigner-resources/datamoshing-in-touchdesigner/)([Part 2](https://interactiveimmersive.io/blog/touchdesigner-resources/datamoshing-in-touchdesigner-part-2/) / [Part 3](https://interactiveimmersive.io/blog/glsl/datamoshing-in-touchdesigner-part-3/))、[AllTouchDesigner チュートリアル](https://alltd.org/glitches-pixel-sorting-and-data-moshing-touchdesigner-tutorial/)

- Optical Flow で**モーションベクトル**を取得
- **Feedback TOP** で画面をクリアせずピクセルを再利用
- GLSL TOP で「前フレームのピクセルを現フレームのモーションベクトルで変位」
- ベクトルのサンプリングを**ブロック単位に量子化** + ブロックごとのノイズ → ブロック状のモッシュ感

→ これは MPEG(動き補償)系の壊し方。静止フレームを壊す JPEG 系(今回の実装)とは別軸。今回のスコープ外だが、Liquid Mirror で既にある velocity field を流用すれば将来 datamosh モードが作れる。

### 2b. 真の JPEG シミュレーション系(我々と同じアプローチ)

- [wareya の multipass GLSL DCT artefacts gist](https://gist.github.com/wareya/5fe9c1227346bae74d235732956111b8): YCoCg 変換 + 4:2:0 クロマサブサンプリング + 周波数領域量子化を 4 パスの GLSL で実装
- [Soar の Realtime JPEG Compression Shader](https://soarify.itch.io/jpeg): TRUE I/DCT、8x8 / 16x16 ブロック対応
- [StraySpark: Why Real Compression Artifacts Need a Compute Shader](https://www.strayspark.studio/blog/compression-artifacts-explained-dct-compute-shader): 本物のアーティファクトには「8x8 forward DCT → 量子化 → 逆 DCT」を compute shader で行う必要がある、+ 4:2:0 サブサンプリングと deblock フィルタ

→ **我々の WGSL 実装(compute で 8x8 DCT → 量子化/破壊 → 逆 DCT、クロマサブサンプリング崩壊)は、この「真のシミュレーション」系と同じ構成**。TouchDesigner の GLSL TOP 系より一段正確(TD は multipass fragment が多い)。

## 3. 改善アイデア(本家への忠実度を上げるなら)

1. **Table Chaos スライダー**: 量子化テーブルの N/64 エントリを seed 付きランダム値に置換(本家の Breaking bytes 相当)。CPU 側 `scaledQuantTables` の後段に 1 関数足すだけ。
2. **行流れの強化**: 本家のビットストリーム破壊は「破損点以降ずっと流れる」— 現在の行単位独立ズレに「累積オフセット」モードを足すとより本物らしい。
3. **DC 引き継ぎ破壊**: JPEG の DC は前ブロックとの差分符号化なので、破損すると以降のブロックの明るさが連鎖的にずれる。block_id の昇順に DC 誤差を累積させると本家の「明度が横に流れる」感じが出る。
