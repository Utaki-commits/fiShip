# PROJECT_DNA.md — fiShip 設計思想・開発ガイド

> AI開発者向け。このファイルを読めばゼロから設計判断できるように書かれている。

---

## 1. プロダクト概要

遊漁船（fishing charter boat）の船長が24時間予約を受け付けるためのSaaS。

**ターゲットユーザー:** 30〜65歳の男性船長。スマートフォンは使えるが、ITリテラシーは低め。PCは使わない前提。

**解決する問題:** 電話・LINE・Instagram DMが混在する予約受付をデジタル化する。自前の予約ページを持てない船長に、URLを共有するだけで動く予約フォームを提供する。

---

## 2. 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | Next.js 14 (App Router) + TypeScript |
| スタイリング | **インラインスタイルのみ**（Tailwind CSS は使わない） |
| バックエンド | Next.js API Route Handlers (`/src/app/api/`) |
| DB・認証 | Supabase (PostgreSQL + Auth) |
| AI | Anthropic Claude (`claude-opus-4-7`、adaptive thinking) |
| ホスティング | Vercel |
| QR生成 | `qrcode.react` |
| 祝日 | `japanese-public-holidays`（直接インポート。`holidays-jp` はESM/CJS非互換のため使用禁止） |

### ⚠️ インポートルール
```ts
// ✅ 正しい
import { getHolidayInfo } from '@/lib/holidays'

// ❌ 禁止（Vercel buildで死ぬ）
import * as holidaysJp from 'holidays-jp'
```
`src/lib/holidays.ts` が `japanese-public-holidays` をラップしている。ここを経由する。

---

## 3. データベーススキーマ

### `vessels` — 船・船長情報
```
id                        uuid PK
user_id                   uuid → auth.users
name                      text（船名）
captain_name              text
capacity                  integer（最大乗船人数）
prefecture                text
port_name                 text
access                    text（アクセス方法）
departure_time            text（例：「05:00」）
charter_accepted          boolean
beginner_accepted         boolean
price                     text
facilities                jsonb（設備情報。後述）
max_bookings_per_customer integer DEFAULT 5（顧客ごと予約上限）
notify_hours              text（対応時間帯）
```

#### `facilities` JSONB の構造（カテゴリ順が重要）
```json
{
  "tackle_rental": "free" | "paid" | "none",
  "life_jacket": boolean,
  "rod_holder": boolean,
  "parking": "free" | "paid" | "none",
  "toilet": boolean,
  "cooler": boolean,
  "live_well": boolean,
  "water_circulation": boolean,
  "microwave": boolean,
  "kettle": boolean,
  "roof": boolean,
  "metal_light": boolean,
  "bloodletting": boolean,
  "ike_jime": boolean,
  "cleaning": "free" | "paid" | "none",
  "ice": "sale" | "free" | "none",
  "bait": boolean,
  "cash": true,
  "credit": boolean,
  "paypay": boolean,
  "payment": string,
  "casting_deck": boolean,
  "gyro": boolean,
  "rod_keeper": boolean
}
```

表示・編集は必ず以下の6カテゴリ順で行う：
1. 釣り道具（tackle_rental, life_jacket, rod_holder）
2. 船内設備（parking, toilet, cooler, live_well, water_circulation, microwave, kettle, roof, metal_light）
3. 魚の処理（bloodletting, ike_jime, cleaning）
4. 販売品（ice, bait）
5. 支払方法（cash, credit, paypay, payment）
6. こだわり設備（casting_deck, gyro, rod_keeper）

`cash: true` は常にデフォルトON。

---

### `bin_settings` — 便設定
```
id              uuid PK
vessel_id       uuid → vessels
name            text（便の名称。空の場合は「昼便」/「夜便」で自動保存）
bin_type        'day' | 'night'
start_month     integer（0-indexed: 0=1月）
end_month       integer（0-indexed）
days_of_week    integer[]（0=日〜6=土）
departure_time  text
fish_types      text[]
max_capacity    integer
```

**RLS: 無効**（`disable_bin_settings_rls.sql` で明示的に無効化済み）

**重複チェックは `name` で行う（`bin_type` ではない）。** 同じ名前の便が2つ存在してはならない。

名前の自動デフォルト（クライアント側で解決してからAPIへ送る）:
```ts
const resolvedName = form.name.trim() || (form.bin_type === 'day' ? '昼便' : '夜便')
```

---

### `bookings` — 予約データ
```
id            uuid PK
vessel_id     uuid → vessels
date          date（YYYY-MM-DD）
bin_type      'day' | 'night'
name          text（顧客名）
tel           text
count         integer（人数）
fishing_style text
message       text
status        'pending' | 'confirmed' | 'rejected'
channel       'page' | 'line' | 'instagram' | 'tel' | 'charter'
created_at    timestamptz
```

---

### `sns_messages` — SNSメッセージ受信ログ
```
id           uuid PK
vessel_id    uuid → vessels
channel      'line' | 'instagram'
sender_id    text
sender_name  text
message_text text
received_at  timestamptz
ai_result    jsonb（Claude解析結果）
status       'unprocessed' | 'registered' | 'ignored'
created_at   timestamptz
```

**RLS: 有効**（vessel_ownerポリシー: SELECT/UPDATEのみ、自分のvessel_idに限定）

`ai_result` の構造:
```json
{
  "name": "顧客名 | null",
  "date": "YYYY-MM-DD | null",
  "count": 2,
  "fishing_style": "タイラバ | null",
  "is_booking": true,
  "confidence": 0.92
}
```

---

### `customers` — 顧客名簿
```
id         uuid PK
vessel_id  uuid → vessels
name       text
tel        text
memo       text
created_at timestamptz
```

### `passenger_logs` — 乗船名簿
```
id         uuid PK
vessel_id  uuid → vessels
date       date
name       text
address    text
birthday   date
created_at timestamptz
```

---

## 4. 予約ロジック

### ステータス遷移
```
新規投入 → pending
           ↓ 船長が承認
        confirmed
           ↓ 船長が拒否
        rejected
```

### 即時成立の条件（`status = 'confirmed'`）
- `channel !== 'charter'`
- かつ、同じ vessel_id + date + bin_type の `pending` 件数 === 0

チャーター予約（`channel === 'charter'`）は**常に** `pending`。

### 定員チェック（`/api/bookings` POST）
1. `bin_settings` から指定日・bin_typeに合致する便を特定
2. 既存の `confirmed + pending` の count 合計 + 今回の count > max_capacity なら `409 FULL`
3. `tel` がある場合、同じ vessel_id + tel の `confirmed + pending` 件数 >= `max_bookings_per_customer` なら `409 LIMIT_EXCEEDED`

### カラー表示ルール
| 状態 | 色 | 条件 |
|---|---|---|
| 水色 | `#2E86C1` | 昼便・空きあり |
| 紺紫 | `#4B5563` | 夜便・空きあり |
| 赤 | `#B91C1C` | 満員、または残り2名以下 |
| オレンジ | `#D97706` | 貸切・承認待ち |
| グレー | `#9CA3AF` | 休船日・操作不可 |

---

## 5. AI統合パターン

### Claude呼び出し（`/api/extract`）
```ts
const response = await client.messages.create({
  model: 'claude-opus-4-7',
  max_tokens: 1024,
  thinking: { type: 'adaptive' },
  messages: [{ role: 'user', content: prompt }],
})
// textブロックのみ使用（thinkingブロックは無視）
const textBlock = response.content.find(b => b.type === 'text')
```

**返却スキーマ:**
```json
{
  "name": "string | null",
  "date": "YYYY-MM-DD | null",
  "count": "number | null",
  "fishing_style": "string | null",
  "bin_preference": "昼 | 夜 | 不明",
  "is_charter": "boolean",
  "missing_fields": ["name", "date", "count"],
  "confidence": 0.0
}
```

相対日付（「来週の土曜」など）は今日の日付を渡して変換させる。JSONのみ返させ、正規表現で抽出する。

---

## 6. Webhookアーキテクチャ

### LINEウェブフック（`/api/webhook/line`）
```
LINE → HMAC-SHA256署名検証 → sns_messages INSERT
     → /api/extract（Claude解析）→ sns_messages UPDATE
     → LINE返信API（即時）
     ↓
     船長がダッシュボード（/dashboard/extract）から手動で予約登録
```

- **自動予約登録はしない。** Claude解析後も必ず船長が確認して登録する設計。
- `SUPABASE_SERVICE_ROLE_KEY` でRLSをバイパスしてDB書き込み（Webhookはセッションなし）
- LINEは**200を即返す**必要がある（タイムアウト回避）

### Instagramウェブフック（`/api/webhook/instagram`）
- 署名: `sha256 hex`（`x-hub-signature-256` ヘッダー）
- GETでの検証（hub.challenge）に対応
- 処理フローはLINEと同じ

---

## 7. UIパターン

### 絶対ルール
- **インラインスタイルのみ**。Tailwindクラスは使わない
- タップ対象は `padding: '14px'` 以上（最小44px）
- IT用語禁止（URLは「リンク」、OCR/PDFは使わない、Webhookは「連携」）
- 1画面1アクション

### ボタン統一
```ts
// 保存・登録
{ background: '#0A3D62', color: '#fff', border: 'none' }

// 編集（アウトライン）
{ background: '#fff', color: '#2E86C1', border: '2px solid #2E86C1' }

// 削除（アウトライン）
{ background: '#fff', color: '#B91C1C', border: '2px solid #B91C1C' }

// キャンセル
{ background: '#fff', color: '#6B7280', border: '2px solid #E5E7EB' }
```

### フォントサイズ
- 本文: 15〜16px
- ラベル: 13〜14px
- 小見出し: 17〜18px
- 日付・数字（強調）: 18〜24px

### ヘッダー
全画面共通: `background: '#0A3D62'`（濃紺）、白文字。下端に丸みのある白い「なみ」が入る。

---

## 8. ページ構成

| パス | 役割 |
|---|---|
| `/login` | 船長ログイン（Supabase Auth） |
| `/register` | 初回登録（3ステップウィザード） |
| `/dashboard` | 月/週カレンダー + 予約一覧 |
| `/dashboard/vessel` | 船情報・設備の閲覧・編集 |
| `/dashboard/settings` | 便設定（bin_settings）管理 |
| `/dashboard/extract` | SNSメッセージ確認・予約登録 |
| `/dashboard/customers` | 顧客名簿 |
| `/dashboard/logs` | 乗船名簿 |
| `/reserve/[vesselId]` | 顧客向け予約フォーム（公開） |

---

## 9. Supabase接続パターン

### 通常（`'use client'` ページ・APIルート）
```ts
import { supabase } from '@/lib/supabase'
// Supabaseのanon keyを使用。RLSで制限。
```

### Webhook専用（RLSバイパスが必要な場合）
```ts
import { createClient } from '@supabase/supabase-js'
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```
`SUPABASE_SERVICE_ROLE_KEY` はサーバー側のみ。クライアントコードに絶対に含めない。

---

## 10. カレンダー週表示ルール

週表示への切り替え時:
- `selectedDate`（ユーザーが選択した日付）があればその日を含む週の日曜日
- なければ `calYear/calM` の1日を含む週の日曜日

```ts
onClick={() => {
  if (v === 'week') {
    setWeekStart(selectedDate
      ? getWeekSunday(new Date(selectedDate + 'T00:00:00'))
      : getWeekSunday(new Date(calYear, calM, 1)))
  }
  setView(v)
}}
```

---

## 11. 環境変数

| 変数名 | 用途 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL（クライアント公開） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key（クライアント公開） |
| `SUPABASE_SERVICE_ROLE_KEY` | サービスロールキー（サーバー専用） |
| `LINE_CHANNEL_SECRET` | LINE署名検証用シークレット |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE返信API用トークン |
| `LINE_VESSEL_ID` | LINE連携する vessel の UUID |
| `INSTAGRAM_VERIFY_TOKEN` | Instagram Webhookの検証トークン |
| `INSTAGRAM_APP_SECRET` | Instagram署名検証用 |
| `INSTAGRAM_VESSEL_ID` | Instagram連携する vessel の UUID |
| `ANTHROPIC_API_KEY` | Claude API（Next.js SDKが自動参照） |

---

## 12. マイグレーション管理

`supabase/migrations/` に `.sql` ファイルを追加。**自動実行なし**。Supabaseダッシュボードの SQL Editor で手動実行する。

既存マイグレーション:
- `add_facilities.sql` — facilities JSONB列
- `add_bin_name.sql` — bin_settings.name列
- `add_max_bookings.sql` — vessels.max_bookings_per_customer列
- `create_sns_messages.sql` — sns_messagesテーブル + RLS
- `disable_bin_settings_rls.sql` — bin_settingsのRLS無効化

---

## 13. 新機能を追加するときのチェックリスト

1. **スペック確認**: CLAUDE.md の「開発ルール（最優先）」を読む。仕様変更は勝手にしない。
2. **DB変更があれば**: `supabase/migrations/` にSQLを追加。
3. **型定義**: TypeScriptの型をページ先頭に定義。`any` は禁止。
4. **スタイル**: インラインスタイルで書く。ボタン色はルール通りに。
5. **文言**: IT用語をチェック。エラーメッセージも日本語で、ITリテラシー不要な言葉に。
6. **テスト**: 定員チェック・承認フロー・重複チェックに関わるなら予約ロジックを必ず確認。
7. **Webhook追加時**: サービスロールキーを使うこと。署名検証を必ず実装。
