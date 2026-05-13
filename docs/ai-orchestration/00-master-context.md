# AI Orchestration Master Context

## プロジェクト概要

- プロダクト名は `FiShip`。
- 遊漁船の船長向けに、予約管理、顧客管理、乗船名簿、船情報、スケジュール管理をスマートフォンで扱えるようにするSaaS。
- 乗船客向けには `/reserve/[vesselId]` で予約申し込み画面を提供する。
- UIはスマホファースト。最大幅は主に `480px`。
- 主な対象は中高年男性の船長。ITに不慣れでも使えるよう、文字を大きく、操作を少なく、選択肢を絞る。
- 既存UIは日本語のみ。

## 技術スタック

- フレームワーク: Next.js 14 App Router。
- 言語: TypeScript / TSX。
- UI実装: React Client Components中心、インラインstyleとCSS変数。
- CSS: `src/app/globals.css` にTailwind base/components/utilitiesとデザイントークンを定義。
- フォント: `Noto Sans JP` SemiBoldを自前読み込み。
- 認証:
  - Auth0 profile API: `/api/auth/profile`。
  - LINEログイン: `/api/auth/login`。
  - 電話番号OTP: Supabase Auth。
- DB/API: Supabase Postgres + `@supabase/supabase-js`。
- 画像/ストレージ: Supabase Storage `vessel-images`。
- QRコード: `qrcode.react`。
- 祝日: `japanese-public-holidays`。
- AI解析: `@anthropic-ai/sdk` と `/api/analyze-booking`。

## インフラ構成

- GitHub:
  - リポジトリは `Utaki-commits/fiShip`。
  - mainブランチへのpushを本番反映の基準にする。
- Vercel:
  - `git push origin main` 後に自動デプロイされる前提。
  - `vercel.json` にCron Jobを定義。
  - 現在のCron:
    - path: `/api/cron/cancel-pending`
    - schedule: `0 0 * * *`
- Supabase:
  - `src/lib/supabase.ts` で `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を使用。
  - API Routeや画面から `supabase.from(...)` で直接テーブル操作する箇所がある。
- 必須環境変数:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CRON_SECRET`
  - `ANTHROPIC_API_KEY`
  - `NEXT_PUBLIC_APP_URL`

## AIエージェントの役割分担

- Owner:
  - 仕様の最終判断。
  - 本番反映の期待値、UI文言、業務ルールを決める。
- Claude:
  - 仕様整理、レビュー、評価。
  - コード実装は担当しない。
  - 実装前の仕様化、実装後のレビューに使う。
- Codex:
  - Next.js/TypeScript/Supabase実装。
  - 既存コードを読んでから差分を作る。
  - 検証、commit、push、デプロイ確認まで行う。
- v0:
  - UI生成のたたき台作成。
  - 生成時は既存デザイントークンとスマホファースト制約に従う。
  - 生成物はそのまま採用せず、Codexが既存構造に合わせて実装する。

## AIが読むべきファイル

- 全AI共通:
  - `AI_ORCHESTRATION.md`
  - `CLAUDE.md`
  - `docs/ai-orchestration/00-master-context.md`
  - `docs/ai-orchestration/01-product-brief.md`
  - `docs/ai-orchestration/02-ux-rules.md`
  - `docs/ai-orchestration/03-ui-design-rules.md`
- UI生成AI:
  - `Design System/README.md`
  - `Design System/colors_and_type.css`
  - `Design System/ui_kits/captain_app/Primitives.jsx`
  - `Design System/ui_kits/captain_app/DashboardScreen.jsx`
  - `Design System/ui_kits/captain_app/LoginScreen.jsx`
  - `Design System/ui_kits/captain_app/RegisterScreen.jsx`
  - `docs/ai-orchestration/04-copy-rules.md`
  - `docs/ai-orchestration/05-component-rules.md`
  - `docs/ai-orchestration/06-v0-generation-rules.md`
- 実装AI:
  - `src/app/globals.css`
  - `src/lib/supabase.ts`
  - `src/app/api/bookings/route.ts`
  - `src/app/dashboard/page.tsx`
  - `src/app/login/page.tsx`
  - `src/app/register/page.tsx`
  - `src/app/reserve/[vesselId]/page.tsx`
  - `src/app/dashboard/settings/page.tsx`
  - `src/app/dashboard/schedule/page.tsx`
  - `src/app/dashboard/vessel/page.tsx`
  - `docs/ai-orchestration/07-codex-implementation-rules.md`
- レビューAI:
  - `docs/ai-orchestration/08-test-rules.md`
  - `docs/ai-orchestration/09-review-checklist.md`
  - 変更対象ファイル一式。

## 禁止事項

- 既存仕様を読まずに新規設計を足さない。
- デスクトップ前提の横長UIを作らない。
- 船長向け画面でIT用語をそのまま出さない。
- `git push` 後の反映確認を省略しない。
- Supabaseテーブルや環境変数を推測だけで追加しない。
