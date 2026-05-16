# 乗船名簿 旭波デザイン刷新 実装レポート

## 実装した機能
- `src/app/dashboard/logs/page.tsx` の一覧・詳細・保存フォームを旭波デザインに刷新。
- 既存の乗船名簿取得、日付別グループ化、同伴者展開、保存処理、印刷処理を維持。

## 参照したルールファイル
- `docs/design-system/concept.md`

## 迷った判断と根拠
- 乗船名簿は現場で素早く開く用途のため、日付カードと乗客カードのタップ領域を広めに維持。
- 名前表示は指定通り `15px`、`font-weight 500`、`#1C1917` を基準にした。

## UI影響
- ヘッダー背景を `#7F1D1D` に統一。
- 画面背景を `#F7F2EF` に統一。
- カードは白背景、`0.5px #E8DDD8`、角丸 `12px` に統一。
- 入力欄は `0.5px #E8DDD8`、角丸 `8px` に統一。
- 保存・戻る・印刷ボタンを旭波ボタンルールに合わせた。

## 確認すべき画面
- `/dashboard/logs`
- 今後の出船一覧
- 過去の出船一覧
- 乗船名簿詳細
- 住所・緊急連絡先保存
- 印刷表示

## 未確認事項
- 実データの予約・乗船名簿を使ったVercel Previewでの視認確認。

## テスト結果
- `npm run build` 成功。
- 既存の `next/no-img-element`、Auth0/Jose、Google Fonts取得警告はあり。

## Claude/ChatGPTに見てほしい観点
- 現場で名簿を入力する導線として、日付選択から乗客情報保存まで迷わないか。
- タップ対象と文字サイズが中高年男性向けとして十分か。

## Vercel Preview URL
- https://fiship-git-codex-passenger-logs-polish-utaki-commits-projects.vercel.app
