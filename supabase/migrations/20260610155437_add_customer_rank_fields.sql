ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS captain_note text,
  ADD COLUMN IF NOT EXISTS manual_rank text;
