-- vessels テーブルに設備情報カラムを追加する
-- Supabaseダッシュボード > SQL Editor で実行してください

ALTER TABLE vessels
  ADD COLUMN IF NOT EXISTS facilities jsonb DEFAULT '{}';

-- 既存レコードに新しいデフォルト値を設定する
UPDATE vessels
SET facilities = '{
  "tackle_rental": "none",
  "bait": false,
  "ice": "none",
  "life_jacket": false,
  "rod_holder": false,
  "metal_light": false,
  "toilet": false,
  "cooler": false,
  "live_well": false,
  "water_circulation": false,
  "microwave": false,
  "kettle": false,
  "roof": false,
  "casting_deck": false,
  "gyro": false,
  "rod_keeper": false,
  "bloodletting": false,
  "ike_jime": false,
  "cleaning": "none",
  "parking": "none",
  "cash": false,
  "credit": false,
  "paypay": false,
  "payment": ""
}'::jsonb
WHERE facilities IS NULL OR facilities = '{}'::jsonb;
