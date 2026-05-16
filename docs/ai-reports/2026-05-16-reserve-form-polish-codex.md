# 予約フォーム 旭波デザイン刷新 実装レポート

## 実装した機能
- `src/app/reserve/[vesselId]/page.tsx` を旭波デザインシステムに合わせて刷新。
- 顧客向け予約フォームをスマホファーストで整理。
- 予約送信ボタンを画面下部固定に変更。
- 既存の予約ロジック、便選択、残席計算、休船日判定、電話番号バリデーションを維持。

## 参照したルールファイル
- `docs/design-system/concept.md`

## 迷った判断と根拠
- 予約ページは顧客向けのため、情報量を抑え、日付選択から送信までを1画面1アクションに近い流れへ整理。
- 旭波ルールに合わせ、インラインスタイルではなくTailwindクラスで色・余白・角丸・罫線を指定。

## UI影響
- ヘッダー背景を `#7F1D1D` に統一。
- 画面背景を `#F7F2EF` に統一。
- カード背景を白、罫線を `0.5px #E8DDD8`、角丸を `12px` に統一。
- 送信ボタンを `#B91C1C` の固定CTAに変更。
- `font-weight: 700/600`、`2px` border、shadow、gradient、blur を使用しない構成に変更。

## 確認すべき画面
- `/reserve/[vesselId]`
- 日付選択
- 便選択
- 予約フォーム入力
- 送信完了表示

## 未確認事項
- 実データの船IDを使ったVercel Previewでの視認確認。
- Supabase本番データを使った予約登録の実動作。

## テスト結果
- `npm run build` 成功。
- 既存の `next/no-img-element`、Auth0/Jose、Google Fonts取得警告はあり。

## Claude/ChatGPTに見てほしい観点
- 顧客向け予約フォームとして1画面1アクションの流れが守れているか。
- 中高年男性向けに文字量とタップ導線が過不足ないか。

## Vercel Preview URL
- https://fiship-git-codex-reserve-form-polish-utaki-commits-projects.vercel.app
