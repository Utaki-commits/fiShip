ALTER TABLE vessels
  ADD COLUMN IF NOT EXISTS setup_completed boolean NOT NULL DEFAULT false;
