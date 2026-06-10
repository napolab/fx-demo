## project setup rules

- pnpm で setup すること
- Cloudflare Worker を利用すること
- next.js, opennext, payloadcmsを利用すること
- opennext では ISR を利用すること
- seed は payload cms の bin に登録すること
- react-aria-components, panda css を利用すること
- pnpm fmt で pnpm oxlint, pnpm oxfmt --write を実行すること
- pnpm lint で pnpm oxlint, pnpm oxfmt --check を実行すること
- `@typescript/native-preview` を利用すること
- 実装をする前にライブラリについて知らないことがある時は context7, web で調査してから進めること。
- vitest を利用した TDD で実装すること
    - vitest は browser mode が良い気がする
- husky で commit 時に lint, typecheck を実行すること
- 作業が終わるたびに chrome-dev-tools で UI とアクセシビリティを確認すること

## coding rules

- あなたは実装計画、ステークホルダーである私に対して要件のブレがなくなるまで AskUserQuestion で質問することに努め、実装は subagent に任せること
- 関数は単一責任で実装すること
- 同時に命令が複数来た時は Task で優先順位をつけて subagent に実装を任せること

## ui rules

- WCAG2.1 AA 基準を満たすように color token を設計すること
- UI は文脈に沿った内容にすること
    - 機械的なUIの利用は徹底的に避けること
    - 伝えたい情報はどんなものでその情報に適切な UI を常に考察、模索すること
    - ASCII ダイアグラムで提案すること
    - AskUserQuestion であなたが考えたパターンを私に提示してどれがいいか提案すること
- UI を作る時は以下の順番で実現を目指すこと。1が難しいなら2を2が難しいなら3をやる, 3 が難しいなら 4 をやる
  1. `react-aria-components` で実装
  2. HTML + CSS で実装
  3. 独自実装を行う前に UI の変更の提案をする
  4. 独自実装で UI を実装する
- リンクを使いたい時は `react-aria-components` の Link を利用すること
    - `react-aria-components` の RouterProvider が利用されていることが前提
- `next/image` の代わりに `src/components/image` を利用すること
    - 初期画像表示最適化のために `src/components/image/helper.ts` にある `formatBlurURL` をセットしておくこと


## ref repository

ここに書かれているリポジトリには gh コマンドで参照し、既存実装を参照する前に ref repository の内容を先に探すこと
issue, .claude/rules, skills やコードが参考になる。

<--- ここから --->

<--- ここまで --->

### Cloudflare Durable Object を利用する際に使用できるライブラリ

- https://github.com/napolab/durabcast


## comment rules
- `<--- ここから --->` `<--- ここまで --->` と書かれている場合はその範囲は commit しないこと

## resources rules
- mockup 用の画像が必要な時は Codex CLI の組み込み画像生成スキル `$imagegen` を使うこと
- 使い方:
    - headless（推奨）: `codex exec "<生成したい画像の説明> $imagegen"`
    - 対話: `codex "<説明> $imagegen"`
    - 参照画像を渡す: `codex -i ref.png "<説明> $imagegen"` / `codex --image a.png,b.jpg "<説明>"`
- モデルは `gpt-image-2`。生成画像は `~/.codex/generated_images/`（`$CODEX_HOME/generated_images/`）に保存される
- 出力先パス・サイズ・品質・透過・枚数は プロンプト内に自然言語で指定する（`--out`/`--size` 等のフラグは不要）
- 用途: アイコン・バナー・イラスト・スプライト・プレースホルダ等のモックアップ素材

## website の作り方

1 が最も重要で、複数のパターンを提示してユーザー、ステークホルダーに選んでもらうことが重要である。

### 1. design のコンセプトを決める

この段階では Next.js で作業を開始しない。HTML でモックアップを作りユーザーとの対話を行うこと。
あなたはユーザー、ステークホルダー対して好みを暴くゲームを行い、design に必要な要素を洗い出すことに努めること。
特に semantic token, color token, typography token などの design token を洗い出すことに努めること。

この時点ではTOPの見た目を常に作りユーザー、ステークホルダーに確認を取る。
無料、有料に限らず font を選択すること。adobe fonts も利用して良いがユーザーに AskUserQuestion を行うこと。

サイトの雰囲気ややりたい方向性、必要な要件を調査し、URL, 画像でのイメージの要求を行うこと。
website が提示された場合は subagent を用いて並列に分析すること

### 2. design token を定義する
design token を定義する際は WCAG2.1 AA 基準を満たすことを目指すこと。
Typography のジャンプ率を意識すること。
animation を含めた token を定義する。
design token を html で実装してユーザー、ステークホルダーに確認を取ること。

合意が取れたら panda css の theme に落とし込む

### 3. UI を実装する
UI を実装する際は UI rules に従うこと。
この時点で Next.js に移植する。`src/components` に再利用可能な形で UI を作り `(design-system)` group route を作ってそこに配置し確認を取ること。環境が development 以外の時は notFound を返すだけのページになっていることが好ましい。

### 4. ページを実装する
最後に payload cms 連携を行うが layout 決定のためにダミーデータで実装を行い、ユーザー、ステークホルダーに確認を取ること。
基本的には step3 で作成した component の配置レイアウトを決定するのがこの段階の目的であることを忘れないこと。
