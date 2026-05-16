# 顧客名簿 旭波デザイン刷新 実装レポート

## 実装した機能
- `src/app/dashboard/customers/page.tsx` の一覧・検索・顧客詳細・来船履歴を旭波デザインに刷新。
- 既存の予約データ集計、検索、ページング、顧客詳細表示を維持。

## 参照したルールファイル
- `docs/design-system/concept.md`

## 迷った判断と根拠
- 顧客一覧は名簿としてのスキャン性を優先し、カードを重ねず、白いリスト内に `0.5px` の下罫線で区切った。
- 検索バーは指定通り `0.5px #E8DDD8` の単純な入力欄にした。

## UI影響
- ヘッダー背景を `#7F1D1D` に統一。
- 画面背景を `#F7F2EF` に統一。
- 顧客リストの各行に `border-bottom: 0.5px #E8DDD8` 相当のTailwindクラスを適用。
- 電話ボタンを `#B91C1C` の主要CTAに変更。
- `font-weight: 700/600`、`2px` border、shadow、gradient、blur を使用しない構成に変更。

## 確認すべき画面
- `/dashboard/customers`
- 顧客検索
- 顧客詳細
- 来船履歴
- 電話リンク

## 未確認事項
- 実データを使ったVercel Previewでの視認確認。

## テスト結果
- `npm run build` 成功。
- 既存の `next/no-img-element`、Auth0/Jose、Google Fonts取得警告はあり。

## Claude/ChatGPTに見てほしい観点
- 顧客名簿として検索から詳細確認までの導線が十分に短いか。
- リストの情報密度が中高年男性向けに読みやすいか。

## Vercel Preview URL
- https://fiship-git-codex-customers-polish-utaki-commits-projects.vercel.app
