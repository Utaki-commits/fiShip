# Codex Implementation Rules

## 実装時の必須確認事項

- 変更前に対象ファイルを読む。
- `AI_ORCHESTRATION.md` を読む。
- `CLAUDE.md` と該当する `docs/ai-orchestration/*.md` を確認する。
- 既存UIの文言、色、余白、ボタン構造を優先する。
- 変更範囲を限定する。
- ユーザーが明示しない限り、既存の未関係変更を戻さない。
- 実装後は差分、ビルドまたは必要な検証、commit、push、GitHub main、Vercelデプロイ状況を確認する。

## ファイル構造ルール

- App Router配下に画面を作る。
  - 例: `src/app/dashboard/page.tsx`
  - 例: `src/app/reserve/[vesselId]/page.tsx`
- API Routeは `src/app/api/<name>/route.ts`。
- 共通Supabaseクライアントは `src/lib/supabase.ts`。
- グローバルトークンは `src/app/globals.css`。
- 船長管理画面は `/dashboard/...` 配下。
- 乗船客予約画面は `/reserve/[vesselId]`。
- 法務ページは `/legal/...`。

## Supabase接続ルール

- Client Componentでは `import { supabase } from '@/lib/supabase'` を使う。
- `src/lib/supabase.ts` は次を使う。
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 管理系APIでservice roleが必要な場合だけserver-side clientを使う。
- Supabase操作後は `error` を確認する。
- 予約や顧客など業務データは `vessel_id` で絞る。
- 認証が必要な画面は `/api/auth/profile` を確認する。
- userがない場合は `/login`。
- vesselがない場合は `/register`。

## APIルートの命名規則

- 予約API: `/api/bookings`。
- 便設定API: `/api/bin-settings`。
- AI予約解析: `/api/analyze-booking`。
- 認証profile: `/api/auth/profile`。
- Cron:
  - `/api/cron/cancel-pending`
  - Vercel CronからBearer `CRON_SECRET` で呼ぶ。
- RESTメソッド:
  - `GET`: 取得。
  - `POST`: 新規作成。
  - `PATCH`: 部分更新。
  - `DELETE`: 削除。

## エラーハンドリングルール

- APIは失敗時に `NextResponse.json({ error: ... }, { status })` を返す。
- ユーザー向け画面では具体的な日本語を出す。
- 予約APIの既存エラー:
  - `必須項目が不足しています`
  - `満員のため予約できません`
  - `この電話番号での予約上限に達しています。船長へお問い合わせください`
  - `サーバーエラーが発生しました`
- UIで処理中はdisabledにする。
- catchで握りつぶさず、最低限のエラー文を出す。

## 環境変数の扱い

- ブラウザで使うものだけ `NEXT_PUBLIC_` を付ける。
- 秘密鍵はAPI Route内だけで使う。
- 既存環境変数名を変えない。
- `.env` の値をドキュメントやcommitに書かない。
- `ANTHROPIC_API_KEY` は `/api/analyze-booking` で使う。
- `SUPABASE_SERVICE_ROLE_KEY` は公開しない。
- `CRON_SECRET` はCron認証用に使う。

## Git・デプロイルール

- mainに反映する作業は最後にcommitする。
- pushコマンド:
  - `git push origin main`
- push後にGitHub mainの内容を確認する。
- push後にVercelデプロイが完了したか確認する。
- 反映確認前に「完了」と言わない。

## 禁止事項

- 既存ファイルを読まずに実装しない。
- Supabaseのテーブル名やカラム名を推測だけで使わない。
- 環境変数の実値を出力しない。
- 破壊的なgit操作をしない。
- ユーザーの未関係変更を戻さない。
- ローカル反映だけで本番反映済みと報告しない。
