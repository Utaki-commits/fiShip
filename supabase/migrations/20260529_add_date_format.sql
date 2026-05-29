ALTER TABLE vessels
  ADD COLUMN IF NOT EXISTS date_format text NOT NULL DEFAULT 'western';

COMMENT ON COLUMN vessels.date_format IS '''western'': 西暦 / ''japanese'': 和暦';
