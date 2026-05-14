ALTER TABLE vessels ADD COLUMN IF NOT EXISTS subscribed_at timestamptz not null default now();
