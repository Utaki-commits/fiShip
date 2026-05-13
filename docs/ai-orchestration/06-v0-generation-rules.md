# v0 Generation Rules

## v0で生成する際のプロンプトルール

- 必ず `FiShip` の遊漁船船長向けスマホUIとして指定する。
- 対象ユーザーを明記する。
  - `中高年男性の船長`
  - `スマートフォン操作`
  - `ITに不慣れ`
  - `屋外でも読む`
- 画面幅は `max-width: 480px` 前提にする。
- 1画面1アクションを指定する。
- 日本語UIのみで生成させる。
- 既存文言を使わせる。
- 既存デザイントークンをCSS変数として使わせる。
- 生成後はCodexが既存ファイル構造へ移植する前提にする。

## 使用するデザイントークン

- 色は `src/app/globals.css` のCSS変数のみを使う。
- 主な指定:
  - `var(--ocean)`
  - `var(--ocean-light)`
  - `var(--ocean-pale)`
  - `var(--gold)`
  - `var(--bg)`
  - `var(--surface)`
  - `var(--border)`
  - `var(--fg-1)`
  - `var(--fg-2)`
  - `var(--fg-3)`
  - `var(--status-day-bg)`
  - `var(--status-day-fg)`
  - `var(--status-night-bg)`
  - `var(--status-night-fg)`
  - `var(--status-ok-bg)`
  - `var(--status-ok-fg)`
  - `var(--status-full-bg)`
  - `var(--status-full-fg)`
  - `var(--status-pending-bg)`
  - `var(--status-pending-fg)`
  - `var(--status-closed-bg)`
  - `var(--status-closed-fg)`
- フォントサイズは `--t-*` を基準にする。
- タップ高さは `--tap-min` と `--tap-comfort` を基準にする。

## 禁止するコンポーネント

- PC向けサイドバー。
- 複雑なデータテーブル。
- ホバー前提の操作。
- 小さすぎるアイコンだけの主要CTA。
- ドロップダウンに大量項目を直接入れるUI。
- 船長向け画面での英語ラベル。
- マーケティング用ヒーローセクション。
- 説明カードだらけのランディングページ。

## スマホファーストの指定方法

- `mobile-first`
- `max-width: 480px`
- `single column`
- `large tap targets`
- `primary button height 64px`
- `input height 64px`
- `font size 18px or larger for body`
- `sticky top bar`
- `bottom-safe spacing`
- `no desktop sidebar`

## Tailwind/shadcn/ui方針

- 既存実装はインラインstyleとCSS変数が中心。
- Tailwindは導入済みだが、既存画面ではユーティリティ主体ではない。
- shadcn/uiは既存画面の前提ではない。
- v0生成時にshadcn/uiを使わせる場合でも、Codex実装時には既存style構造に合わせる。
- コンポーネント名や構造は既存のApp Router構成に合わせる。

## プロンプト例

- `FiShipの船長向けスマホ画面を作ってください。最大幅480px、1画面1アクション、中高年男性が屋外で使う前提です。色はCSS変数 var(--ocean), var(--surface), var(--fg-1) など既存トークンだけを使ってください。日本語のみ、IT用語は禁止です。`

## 禁止事項

- v0に新しいブランドカラーを作らせない。
- 既存にない英語UIを混ぜない。
- デスクトップ用レイアウトを採用しない。
- shadcn/ui前提のまま既存コードへ貼り付けない。
- 生成物をレビューなしで本番コードに入れない。
