# fiShip — 遊漁船予約管理システム

## プロジェクト概要
遊漁船船長向けの24時間予約管理SaaS。
ターゲット：30〜65歳男性船長（ITリテラシー低め）

## 技術スタック
- Next.js 14 (App Router) / TypeScript / Tailwind CSS
- Supabase (PostgreSQL・認証)
- Vercel (ホスティング)

## ディレクトリ構成
- src/app/login/ — 船長ログイン
- src/app/register/ — 初回登録
- src/app/dashboard/ — 船長管理画面
- src/lib/supabase.ts — Supabase接続

## データベース
- vessels — 船・船長情報
- bookings — 予約データ
- customers — 顧客名簿
- passenger_logs — 乗船名簿

## UI/UX原則（必ず守る）
- 1画面1アクション
- タップ対象は最小44px以上
- IT用語禁止（OCR・PDF・Webhook等）
- 選択肢は4つ以下・デフォルト値を適切に設定
- 文字は大きく・コントラスト高く

## 色の統一ルール
- 水色：昼便・空きあり
- 紺紫：夜便・空きあり
- 赤：満員・残り2名以下
- オレンジ：貸切・承認待ち
- グレー：休船日・操作不可

## 文言統一
- 「満員」「休船日」で統一
- IT用語は使わない

## 予約ロジック
- 承認待ち0件のみ即時成立（チャーターは常に承認待ち）
- 残り2名以下で赤色表示
- 代替日提案はSNS・電話経由のみ

## ボタンの色統一ルール（全画面で必ず守る）
- 編集ボタン：青色背景(#2E86C1)・白文字・border: none
- 削除ボタン：赤色背景(#B91C1C)・白文字・border: none
- 保存・登録ボタン：紺色背景(#0A3D62)・白文字
- キャンセルボタン：白背景・グレー文字・グレーborder

## 環境変数
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

## 開発
- npm run dev — ローカル起動
- git push origin main — Vercel自動デプロイ
