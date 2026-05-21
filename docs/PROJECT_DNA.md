# PROJECT DNA — DB Schema

このファイルはAI実装時に参照するDBスキーマ定義である。

Phase 1 DB拡張後の主要テーブルと追加カラムを以下に定義する。

## vessels

船・船長情報。

### 主要カラム

- `id`: uuid
- `user_id`: uuid
- `name`: text
- `captain_name`: text
- `capacity`: integer
- `prefecture`: text
- `port_name`: text
- `access`: text
- `departure_time`: text
- `charter_accepted`: boolean
- `beginner_accepted`: boolean
- `price`: text
- `logo_url`: text
- `banner_url`: text
- `map_embed_url`: text
- `notify_enabled`: boolean
- `notify_hours`: text
- `font_size`: text
- `color_mode`: text
- `auto_confirm`: boolean
- `subscribed_at`: timestamptz
- `max_bookings_per_customer`: integer
- `vip_threshold`: integer
- `facilities`: jsonb

### facilities JSONB

- `tackle_rental`: `"free" | "paid" | "none"`
- `life_jacket`: boolean
- `rod_holder`: boolean
- `parking`: `"free" | "paid" | "none"`
- `toilet`: boolean
- `cooler`: boolean
- `live_well`: boolean
- `water_circulation`: boolean
- `microwave`: boolean
- `kettle`: boolean
- `roof`: boolean
- `bloodletting`: boolean
- `ike_jime`: boolean
- `cleaning`: `"free" | "paid" | "none"`
- `ice`: `"sale" | "free" | "none"`
- `bait`: boolean
- `cash`: boolean
- `credit`: boolean
- `paypay`: boolean
- `payment`: string
- `casting_deck`: boolean
- `gyro`: boolean
- `rod_keeper`: boolean
- `electric_reel_power`: boolean
- `air_conditioner`: boolean
- `fish_finder`: `{ "enabled": boolean, "makers": string[] }`
- `searchlight_type`: `"metal_halide" | "led" | "none"`
- `life_jacket_rental`: `"free" | "paid" | "none"`
- `life_jacket_rental_price`: string
- `tanken_maru`: boolean
- `custom_facilities`: `{ "label": string }[]`

`metal_light` は旧キー。新規実装では `searchlight_type` を使う。

## bin_settings

便ごとの設定。

- `id`: uuid
- `vessel_id`: uuid
- `name`: text
- `bin_type`: `"day" | "night" | "relay"`
- `start_month`: integer
- `end_month`: integer
- `days_of_week`: integer[]
- `departure_time`: text
- `end_time`: text
- `fish_types`: text[]
- `max_capacity`: integer
- `price`: text
- `enabled`: boolean
- `note`: text
- `facilities_override`: jsonb
- `period_type`: `"monthly" | "date"`
- `start_date`: date
- `end_date`: date

`period_type = "monthly"` の場合は `start_month` から `end_month` を使う。
`period_type = "date"` の場合は `start_date` から `end_date` を使う。

## customers

顧客名簿。

- `id`: uuid
- `vessel_id`: uuid
- `name`: text
- `tel`: text
- `address`: text
- `age`: integer
- `gender`: `"male" | "female" | "other" | ""`
- `emergency_contact`: text
- `emergency_contact_relation`: text
- `is_blacklisted`: boolean
- `memo`: text
- `note`: text
- `created_at`: timestamptz

## contacts

問い合わせ。

- `id`: uuid
- `vessel_id`: uuid
- `name`: text
- `message`: text
- `is_charter`: boolean
- `is_negotiating`: boolean
- `preferred_date`: date
- `created_at`: timestamptz

`is_negotiating = true` の問い合わせ日は、予約カレンダー上で予約不可扱いにする。

## bookings

予約データ。

- `id`: uuid
- `vessel_id`: uuid
- `date`: date
- `date_to`: date
- `bin_type`: `"day" | "night" | "relay"`
- `name`: text
- `tel`: text
- `count`: integer
- `fishing_style`: text
- `message`: text
- `status`: `"pending" | "confirmed" | "rejected" | "cancelled"`
- `channel`: `"page" | "line" | "instagram" | "phone" | "other" | "charter"`
- `contacted`: boolean
- `is_charter`: boolean
- `board_token`: text
- `board_completed`: boolean
- `board_completed_at`: timestamptz
- `needs_call`: boolean
- `needs_call_reason`: text
- `call_attempts`: integer
- `customer_id`: uuid
- `created_at`: timestamptz

## passenger_logs

乗船名簿。

- `id`: uuid
- `vessel_id`: uuid
- `booking_id`: uuid
- `customer_id`: uuid
- `date`: date
- `bin_type`: text
- `name`: text
- `tel`: text
- `count`: integer
- `address`: text
- `age`: integer
- `gender`: text
- `emergency_contact`: text
- `emergency_contact_relation`: text
- `agreed_to_terms`: boolean
- `agreed_at`: timestamptz
- `image_url`: text
- `created_at`: timestamptz
- `updated_at`: timestamptz

## vessel_photos

船外・船内写真。

- `id`: uuid
- `vessel_id`: uuid
- `url`: text
- `caption`: text
- `sort_order`: integer
- `created_at`: timestamptz

### RLS

- 船長は自分の船の写真を参照・追加・削除できる
- 乗船客は予約ページで写真を参照できる

## 実装ルール

- DB変更は `supabase/migrations/` に追加する
- 既存データを壊さない
- `DROP TABLE` を使わない
- 既存カラム削除をしない
- 追加は `ADD COLUMN IF NOT EXISTS` を使う
- 新規テーブルは `CREATE TABLE IF NOT EXISTS` を使う
- 公開されるテーブルはRLSを必ず確認する

