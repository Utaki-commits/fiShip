ALTER TABLE vessels ADD COLUMN IF NOT EXISTS logo_url text not null default '';
ALTER TABLE vessels ADD COLUMN IF NOT EXISTS banner_url text not null default '';
