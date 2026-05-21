# Phase 1: DB拡張 実装指示書 — fiShip

実装前に CLAUDE.md・CODEX_HANDOFF.md・PROJECT_DNA.md を読むこと。

---

## タスク概要
全画面UX再設計に伴うDBスキーマ拡張。
既存データを破壊しないこと。全て IF NOT EXISTS / ADD COLUMN IF NOT EXISTS で実装すること。

---

## タスク1: vessels テーブル拡張

```sql
-- supabase/migrations/20260521_extend_vessels.sql

-- 常連判定回数（デフォルト3回）
ALTER TABLE vessels
  ADD COLUMN IF NOT EXISTS vip_threshold integer NOT NULL DEFAULT 3;

-- 設備：電動リール用電源
ALTER TABLE vessels
  ADD COLUMN IF NOT EXISTS facilities jsonb DEFAULT '{}';
```

facilitiesのjsonbに以下の項目を追加（既存のfacilitiesカラムがある場合はそのまま使用）：

新規追加項目：
- electric_reel_power: boolean（電動リール用電源）
- air_conditioner: boolean（エアコン）
- fish_finder: jsonb（魚群探知機）例: { enabled: true, makers: ["GARMIN", "HONDEX"] }
- searchlight_type: string（集魚灯種別）'metal_halide' | 'led' | 'none'
- life_jacket_rental: string（ライフジャケット貸出）'free' | 'paid' | 'none'
- life_jacket_rental_price: string（ライフジャケット貸出料金・任意）
- rod_keeper: boolean（ロッドキーパー（泳がせ・置き竿など））
- tanken_maru: boolean（探見丸）
- custom_facilities: jsonb（こだわり設備自由入力）例: [{"label": "ライブスコープ搭載"}]

既存のmetal_lightカラムはsearchlight_typeに統合されるため、
マイグレーション時に既存データを変換すること：
metal_light: true → searchlight_type: 'metal_halide'
metal_light: false → searchlight_type: 'none'

---

## タスク2: bin_settings テーブル拡張

```sql
-- supabase/migrations/20260521_extend_bin_settings.sql

-- 便ごとの案内テキスト（持ち物・注意事項）
ALTER TABLE bin_settings
  ADD COLUMN IF NOT EXISTS note text DEFAULT '';

-- 便ごとの設備オーバーライド（デフォルトから変更した設備のみ）
ALTER TABLE bin_settings
  ADD COLUMN IF NOT EXISTS facilities_override jsonb DEFAULT '{}';

-- 期間指定方式（月単位 or 日付指定）
ALTER TABLE bin_settings
  ADD COLUMN IF NOT EXISTS period_type text DEFAULT 'monthly';
-- 'monthly': start_month〜end_monthを使用（既存）
-- 'date': start_date〜end_dateを使用（新規）

-- 日付指定の開始日・終了日
ALTER TABLE bin_settings
  ADD COLUMN IF NOT EXISTS start_date date;

ALTER TABLE bin_settings
  ADD COLUMN IF NOT EXISTS end_date date;
```

---

## タスク3: customers テーブル拡張

```sql
-- supabase/migrations/20260521_extend_customers.sql

-- 乗船名簿から補完される情報
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS address text DEFAULT '';

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS age integer;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS gender text DEFAULT '';
-- 'male' | 'female' | 'other'

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS emergency_contact text DEFAULT '';

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS emergency_contact_relation text DEFAULT '';
-- '配偶者' | '父' | '母' | '子' | '兄' | '姉' | '弟' | '妹' | '祖父' | '祖母'

-- 要注意顧客フラグ
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS is_blacklisted boolean NOT NULL DEFAULT false;

-- 船長メモ
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS memo text DEFAULT '';

-- 顧客IDで予約と紐付けるための外部キー（任意）
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS vessel_id uuid REFERENCES vessels(id);
```

---

## タスク4: contacts テーブル拡張

```sql
-- supabase/migrations/20260521_extend_contacts.sql

-- チャーター問い合わせフラグ
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS is_charter boolean NOT NULL DEFAULT false;

-- チャーター交渉中フラグ（この日をカレンダー上で×表示にする）
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS is_negotiating boolean NOT NULL DEFAULT false;

-- 希望日
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS preferred_date date;
```

---

## タスク5: bookings テーブル拡張

```sql
-- supabase/migrations/20260521_extend_bookings.sql

-- 乗船名簿用のワンタイムトークン（予約固有URL生成用）
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS board_token text;

-- 乗船名簿への同意完了フラグ
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS board_completed boolean NOT NULL DEFAULT false;

-- 乗船名簿同意日時
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS board_completed_at timestamptz;

-- 要電話連絡フラグ
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS needs_call boolean NOT NULL DEFAULT false;

-- 要電話連絡の理由（AIが自動検知した場合の根拠）
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS needs_call_reason text DEFAULT '';

-- 電話試行回数（留守だった回数）
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS call_attempts integer NOT NULL DEFAULT 0;

-- 顧客IDとの紐付け
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id);
```

---

## タスク6: passenger_logs テーブル確認・拡張

既存のpassenger_logsテーブルのカラムを確認し、
以下のカラムが存在しない場合は追加すること：

```sql
-- supabase/migrations/20260521_extend_passenger_logs.sql

-- 住所
ALTER TABLE passenger_logs
  ADD COLUMN IF NOT EXISTS address text DEFAULT '';

-- 年齢
ALTER TABLE passenger_logs
  ADD COLUMN IF NOT EXISTS age integer;

-- 性別
ALTER TABLE passenger_logs
  ADD COLUMN IF NOT EXISTS gender text DEFAULT '';

-- 緊急連絡先
ALTER TABLE passenger_logs
  ADD COLUMN IF NOT EXISTS emergency_contact text DEFAULT '';

-- 緊急連絡先続柄
ALTER TABLE passenger_logs
  ADD COLUMN IF NOT EXISTS emergency_contact_relation text DEFAULT '';

-- 遵守事項への同意フラグ
ALTER TABLE passenger_logs
  ADD COLUMN IF NOT EXISTS agreed_to_terms boolean NOT NULL DEFAULT false;

-- 同意日時
ALTER TABLE passenger_logs
  ADD COLUMN IF NOT EXISTS agreed_at timestamptz;

-- OCRで取り込んだ画像のURL
ALTER TABLE passenger_logs
  ADD COLUMN IF NOT EXISTS image_url text DEFAULT '';

-- 顧客IDとの紐付け
ALTER TABLE passenger_logs
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id);

-- 予約IDとの紐付け
ALTER TABLE passenger_logs
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id);
```

---

## タスク7: vessel_photos テーブル新規作成

船外・船内写真を管理する新規テーブル：

```sql
-- supabase/migrations/20260521_create_vessel_photos.sql

CREATE TABLE IF NOT EXISTS vessel_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_id uuid NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vessel_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vessel_owner_select"
  ON vessel_photos FOR SELECT
  USING (vessel_id IN (SELECT id FROM vessels WHERE user_id = auth.uid()));

CREATE POLICY "vessel_owner_insert"
  ON vessel_photos FOR INSERT
  WITH CHECK (vessel_id IN (SELECT id FROM vessels WHERE user_id = auth.uid()));

CREATE POLICY "vessel_owner_delete"
  ON vessel_photos FOR DELETE
  USING (vessel_id IN (SELECT id FROM vessels WHERE user_id = auth.uid()));

-- 乗船客（匿名）からの読み取りを許可
CREATE POLICY "public_select"
  ON vessel_photos FOR SELECT
  USING (true);
```

---

## タスク8: PROJECT_DNA.md のスキーマ定義を更新

docs/PROJECT_DNA.md のDBスキーマセクションを今回追加した全カラムで更新すること。

---

## ブランチ・コミット

```bash
git checkout -b codex/db-schema-extension-20260521
git add supabase/migrations/
git add docs/PROJECT_DNA.md
git commit -m "feat: DB拡張 - UX再設計に伴う全テーブルスキーマ拡張"
git push origin codex/db-schema-extension-20260521
```

完了後、PRを作成してレビュー依頼フォーマットで報告すること。
