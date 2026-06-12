# Feature Index Hub — design

`/` を Liquid Mirror 単体から、5 つのカメラ FX を束ねるエディトリアル番号付きインデックスへ作り替える。Liquid Mirror は `/liquid-mirror` へ退避する。

## 背景

`fluid-simulation` は「webcam 映像を素材にする WebGPU / MediaPipe 製 VJ エフェクト集」。現状 `/` が Liquid Mirror に占有されており、他作品（`/jpeg-glitch` `/polytrace` `/trace` `/bounding-mask`）への入口が無い。トップを「どんな作品があり、それぞれ何ができるか」を一覧する集約ページにする。

## 決定事項（確定済み）

| 論点 | 決定 |
| --- | --- |
| Liquid Mirror の移動先 | `/liquid-mirror` |
| 各 FX の見せ方 | 静止画サムネ（ハブ自体はカメラを起動しない） |
| レイアウト | エディトリアル番号付きリスト |
| サムネ素材 | Codex CLI `$imagegen` で各 FX の世界観に合う抽象スチルを生成し `public/thumbs/` にコミット |

## ルーティング / ファイル構成

```
src/app/(frontend)/
├── page.tsx                 ← 新規: 集約インデックス (Server Component)
├── content.ts               ← 新規: 5 作品メタの単一ソース (satisfies で型付け)
├── _components/
│   └── effect-index/
│       ├── index.tsx        ← 番号付きリスト本体
│       ├── styles.css.ts
│       └── effect-index.test.tsx
└── liquid-mirror/
    └── page.tsx             ← 旧 (frontend)/page.tsx をそのまま移設（metadata 込み）

public/thumbs/
├── liquid-mirror.webp
├── jpeg-glitch.webp
├── polytrace.webp
├── trace.webp
└── bounding-mask.webp
```

- `liquid-mirror/page.tsx` は現 `page.tsx` を内容変更なしで移設（import の相対パスのみ階層に合わせて調整）。Liquid Mirror の `metadata` / `viewport` もこのファイルへ移る。
- 新 `/` の `page.tsx` はハブ専用 `metadata`（コレクション全体の説明）を持つ。

## データモデル — `content.ts`

各作品ページの `metadata.description`（＝作者本人の記述）を一次ソースとし、誇張を避ける。

```ts
export type EffectEntry = {
  no: string;       // "01" — 表示用ゼロ詰め
  name: string;     // "Liquid Mirror"
  href: string;     // "/liquid-mirror"
  tagline: string;  // 1 文の「どんな FX か」
  doing: string;    // 1 文の「何ができるか」
  thumb: string;    // "/thumbs/liquid-mirror.webp"
  thumbAlt: string; // スクリーンリーダ用の代替テキスト
};

export const effects = [ /* 01..05 */ ] satisfies readonly EffectEntry[];
```

5 作品の文言（metadata 由来、確定）:

1. **Liquid Mirror** — WebGPU/WGSL stable-fluids の液体鏡。webcam が液体になり、ポインタで攪拌すると絹のような渦が流れる。
2. **JPEG Glitch** — AE の JPEG Glitch をライブカメラで再現。YCbCr / 8×8 DCT / 量子化を WebGPU 上で実際に通し係数を破壊する。
3. **PolyTrace** — AE Polytrace 再現。映像を WGSL で特徴点抽出し Delaunay 三角形のローポリメッシュとして p5.js が描画する。
4. **Trace** — WebGPU/WGSL + p5.js のトレース & ブロブトラッキング。身体輪郭をモノクロのワイヤーフレームでトレースし残像と HUD を重ねる。
5. **Bounding Mask** — MediaPipe ポーズ検出で顔・手・腰・脚を捉え、選んだ部位を単色マスクで覆う。webcam / アップロード動画にボックス・シルエット 2 形状を切替。

## UI 構造 / セマンティクス

```
<main>                                    bg: stage.bg
  <section>  ← hero
    <h1>FLUID SIMULATION</h1>
    <p>カメラを素材にする 5 つの実験</p>
  </section>

  <section>  ← index
    <h2 class=srOnly>作品一覧</h2>
    <ol>
      <li>
        <article>                         position: relative
          <span aria-hidden>01</span>
          <img src=thumb alt=thumbAlt loading=lazy decoding=async width height />
          <div>
            <h3><Link href>Liquid Mirror</Link></h3>   ← stretched-link
            <p>{tagline}</p>
            <p>{doing}</p>
          </div>
          <span aria-hidden>開く →</span>
        </article>
      </li>
      …
    </ol>
  </section>
</main>
```

- 見出し階層: `h1`(hero) → `h2`(index, srOnly) → `h3`(各作品)。スキップなし（semantic-html rule 準拠）。
- **stretched-link**: `<article>` を `position: relative`、`h3 > Link` の `::after` を `inset: 0` で被せて行全体をクリック可能にする。アクセシブルネームは作品名のみに保たれる。`開く →` と `01` は装飾なので `aria-hidden`。
- リンクは react-aria-components `Link`（`href`）。`RouterProvider` 経由で Next.js 遷移。
- 画像基盤が無いため `<img>` を直接使用（`next/image` / `@components/image` は本 repo に非該当）。`width`/`height` 明示で CLS を防ぐ。

## スタイル / トークン

- `stage.*` を流用: `bg`/`text`/`dim`/`line`/`accent`(#7cd9ff)。新規トークン追加なし。
- 番号 `01` は大きめ・`stage.dim`、タイトルは `stage.text`、tagline/doing は `stage.dim`、ホバーで `accent` のヘアライン。
- 行間の区切りは `stage.line` の 1px ボーダー。
- レスポンシブ: ハブは page 直下なので **media query** で 1 カラム⇔サムネ横並びを切替（responsive-queries rule）。
- 動的値は使わず全て `.css.ts` 静的定義。状態差分は `data-*` + セレクタ（必要なら）。

## サムネ生成（`$imagegen`）

各 FX の視覚的特徴に沿った抽象スチルを Codex headless で生成 → `~/.codex/generated_images/` から `public/thumbs/<slug>.webp` へ取り込み（macOS `sips` でリサイズ/変換、横 ~640px 目安）。被写体は人物ではなく FX のテクスチャ（渦/DCT ブロック/三角網/ワイヤー/単色マスク）を抽象表現し、カメラ映像・プライバシー懸念を排除する。

## テスト

`effect-index.test.tsx`（vitest + browser mode 方針）:
- 5 作品ぶんの `<a>` が描画され、各 `href` が content.ts と一致する。
- 各リンクのアクセシブルネームが作品名である。
- 見出し階層（h1 1 個、各作品 h3）が満たされる。
- 各サムネ `<img>` に空でない `alt` がある。

## 完了条件

- `pnpm lint && pnpm typecheck` が通る。
- `/` がインデックス、`/liquid-mirror` が旧トップとして動作。
- chrome-dev-tools で UI とアクセシビリティを確認（CLAUDE.md）。

## やらないこと (YAGNI)

- ライブプレビュー（複数 WebGPU + カメラ同時起動）。
- Payload CMS 連携（作品集合は静的・コード管理で十分）。
- 各 FX 内部の改修。
- 新規デザイントークン / フォント追加。
