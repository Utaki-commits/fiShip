# 2026-05-21 Phase4 Captain UI Redesign - Codex

## 実装した機能
- 船長向け dashboard 配下を CAPTAIN_UX_DNA に合わせた現場運営UIへ再構成。
- ダッシュボードを「対応待ち」「今日の出船」「明日の出船」中心に変更。
- 予約一覧を船長視点の月カレンダーと日付別詳細へ変更。
- 便設定を `/dashboard/bins`、休船日を `/dashboard/blocked-dates` に分離。
- 電話メモ登録を `/dashboard/extract` に統合し、旧 `/dashboard/bookings/new` を削除。
- 顧客名簿を customers テーブル主体へ変更し、来船回数・最終来船日を bookings から表示集計。
- 乗船名簿をSMS送信済み予約と記入状態中心に変更。
- 船情報を1画面直接編集へ変更し、画像・地図・設備・QRを集約。
- アカウント設定からロゴ・バナー・地図・通知時間帯を削除し、運用設定に整理。

## 参照したルールファイル
- CLAUDE.md
- CODEX_HANDOFF.md
- docs/PROJECT_DNA.md
- docs/CAPTAIN_UX_DNA.md
- docs/UI_GUARDRAILS.md
- docs/ai-orchestration/PHASE4_CAPTAIN_UI.md

## 変更ファイル
- src/app/dashboard/_components/CaptainShell.tsx
- src/app/dashboard/page.tsx
- src/app/dashboard/bookings/page.tsx
- src/app/dashboard/bins/page.tsx
- src/app/dashboard/blocked-dates/page.tsx
- src/app/dashboard/extract/page.tsx
- src/app/dashboard/customers/page.tsx
- src/app/dashboard/logs/page.tsx
- src/app/dashboard/vessel/page.tsx
- src/app/dashboard/account/page.tsx
- src/app/dashboard/schedule/page.tsx
- src/app/api/bookings/route.ts
- src/app/api/bin-settings/route.ts
- 削除: src/app/dashboard/bookings/new/page.tsx
- 削除: src/app/dashboard/settings/page.tsx
- 削除: src/app/dashboard/mobile/page.tsx

## UI影響
- 船長画面はスマホ幅前提で、下部固定ナビと大きめの操作ボタンに統一。
- 主要操作は電話・承認・休船・登録・保存に絞り、情報密度を下げた。
- 旧スケジュール画面は便設定へリダイレクト。

## 迷った判断と根拠
- 出船中止SMSは専用APIがないため、今回は予約キャンセルと休船日登録までを実装。既存 `/api/sms` は乗船名簿URL通知専用文面のため流用しない判断。
- OCR解析は外部Claude画像解析API設計が未確定のため、画面入口と画像選択状態まで実装。データ破壊や秘密情報送信を避けた。
- customers同期はDBメンテナンスが必要なバッチ処理ではなく、画面表示時にbookingsから集計して表示。

## 確認すべき画面
- /dashboard
- /dashboard/bookings
- /dashboard/bins
- /dashboard/blocked-dates
- /dashboard/extract
- /dashboard/customers
- /dashboard/logs
- /dashboard/vessel
- /dashboard/account

## 未確認事項
- 実データでの画像アップロード・vessel_photos登録。
- 実データでのSNSメッセージ取り込み状態。
- 出船中止SMSの専用文面/APIは別タスクが必要。

## テスト結果
- npm.cmd run build: 成功
- 既存の img/font 警告のみ。

## 次のAIへの引き継ぎ事項
- Phase5で自動化を行う場合、出船中止SMSの専用APIとOCR解析APIを追加すること。
- 新規追加画面のPlaywrightスクリーンショット確認をPR上で実施すること。

## Vercel Preview URL
- PR作成後に自動発行されるPreview URLを参照。
