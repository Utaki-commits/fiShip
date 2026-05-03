-- bin_settings テーブルに便名称カラムを追加する
-- Supabaseダッシュボード > SQL Editor で実行してください

ALTER TABLE bin_settings
  ADD COLUMN IF NOT EXISTS name text DEFAULT '';
