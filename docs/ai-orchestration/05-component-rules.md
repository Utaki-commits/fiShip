# Component Rules

## 共通コンポーネント一覧

- `BrandMark`
  - ブランドアイコンを角丸で表示する。
  - デフォルト画像は `Fiship_icon.png`。
- `Button`
  - `primary`, `accent`, `ghost` の考え方がある。
  - 主要CTAは大きく、横幅いっぱい。
- `Field`
  - label、required badge、childrenで構成する。
- `Input`
  - 高さ64px以上。
  - 文字は大きくする。
- `Pill`
  - `pending`, `ok`, `decline`, `full` などの状態表示。
- `TopBar`
  - sticky header。
  - ロゴ、船名、船長名、承認待ち数、設定導線。
- `OceanHeader`
  - ログイン/登録系で使う海背景ヘッダー。
- `ErrorBanner`
  - 赤背景と赤枠のエラー表示。
- `BookingCard`
  - 予約カード。
  - 便、日付、人数、ステータス、氏名、連絡状態、操作ボタン。
- `PendingCard`
  - 承認待ち予約のカード。
- `DaySection`
  - 今日/明日の予約を便ごとにまとめる。
- `CalendarCell`
  - 予約ページや予約一覧の月表示セル。

## トップバーの構造

- 高さは最低 `80px`。
- 背景:
  - 通常は ocean gradient。
  - 船画像がある場合は黒overlay付き背景画像。
- 左:
  - ロゴまたは戻るボタン。
- 中央:
  - 画面タイトル、船名、船長名。
  - 画像背景上の文字は `#ffffff` と強いtextShadow。
- 右:
  - 設定ボタン、承認待ちバッジ、ログアウトなど。
- stickyが必要な管理画面では `position: sticky; top: 0; zIndex: 20`。

## カードの構造

- 背景: `var(--surface)`。
- 枠線: `1px solid var(--border)`。
- 角丸: `14px` から `16px`。
- 余白: `14px` から `20px`。
- 見出し:
  - `18px` から `20px`。
  - `fontWeight: 700`。
  - `color: var(--fg-1)`。
- 本文:
  - `15px` から `18px`。
  - `color: var(--fg-2)`。
- 区切り:
  - `borderBottom: 1px solid var(--border)`。

## フォームの構造

- フォームはカード単位で区切る。
- 1カード1入力グループ。
- labelは入力の上。
- 必須項目はlabel横に `必須`。
- input/textarea/select:
  - `width: 100%`
  - `min-height: 64px`
  - `fontSize: 18px` 以上
  - `border: 2px solid var(--border)`
  - `borderRadius: 8px` から `10px`
  - `background: var(--surface)`
  - `color: var(--fg-1)`
- エラーはフォーム上部または該当操作の直前に出す。

## カレンダーの構造

- 月ヘッダー:
  - 前月/翌月ボタン。
  - 中央に年月。
- 曜日:
  - 日曜は赤、土曜は青、平日は通常色。
- セル:
  - 日付数字。
  - 便/残席/満員/貸切/点表示。
  - 選択状態、今日、過去日を視覚的に分ける。
- 休船日と貸切日は予約ページでタップ不可。

## ボタンの構造

- 主要ボタン:
  - 横幅100%。
  - 文字は18pxから24px。
  - 太字。
  - 角丸12px前後。
- 操作ボタン:
  - TELは大きく左側。
  - 編集/取消/その他は右側に小さめのアイコンボタン。
- 承認待ち:
  - `承認する` と `お断り` を横並びにする。
- 破壊操作:
  - 確認モーダルを出す。

## バッジ・ステータスピルの構造

- 便バッジ:
  - `昼便`: day色。
  - `夜便`: night色。
  - `昼夜便`: ocean/gold系。
- ステータス:
  - `承認済み`: ok色。
  - `承認待ち`: pending色。
  - `キャンセル`: closed色。
- 連絡:
  - 未連絡はpending dot。
  - 連絡済みはok色。
- チャネル:
  - 予約ページ、LINE、LINE公式、Instagram、電話、その他の表示を分ける。

## 禁止事項

- カードの中に不要な説明文を長く入れない。
- 入力欄を横に詰めすぎない。
- スマホで押しづらい小さなテキストボタンを主要操作に使わない。
- ステータスを色だけで表現しない。必ず文言も表示する。
- 絵文字が文字化けする主要操作には絵文字を使わない。
