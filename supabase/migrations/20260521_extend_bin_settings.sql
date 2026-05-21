-- Phase 1: bin_settings table extension.
-- Safe for existing data: only ADD COLUMN IF NOT EXISTS.

ALTER TABLE bin_settings
  ADD COLUMN IF NOT EXISTS note text DEFAULT '';

ALTER TABLE bin_settings
  ADD COLUMN IF NOT EXISTS facilities_override jsonb DEFAULT '{}';

ALTER TABLE bin_settings
  ADD COLUMN IF NOT EXISTS period_type text DEFAULT 'monthly'
    CHECK (period_type IN ('monthly', 'date'));

ALTER TABLE bin_settings
  ADD COLUMN IF NOT EXISTS start_date date;

ALTER TABLE bin_settings
  ADD COLUMN IF NOT EXISTS end_date date;

