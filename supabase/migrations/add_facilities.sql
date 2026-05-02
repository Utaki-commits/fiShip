-- vessels テーブルに設備情報カラムを追加する
-- Supabaseダッシュボード > SQL Editor で実行してください

ALTER TABLE vessels
  ADD COLUMN IF NOT EXISTS facilities jsonb DEFAULT '{}';

-- 既存レコードにデフォルト値を設定する
UPDATE vessels
SET facilities = '{
  "tackle": false,
  "life_jacket": false,
  "toilet": false,
  "cooler": false,
  "parking": false,
  "payment": ""
}'::jsonb
WHERE facilities IS NULL OR facilities = '{}'::jsonb;
