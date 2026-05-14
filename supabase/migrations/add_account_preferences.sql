ALTER TABLE vessels ADD COLUMN IF NOT EXISTS notify_enabled boolean not null default true;
ALTER TABLE vessels ADD COLUMN IF NOT EXISTS font_size text not null default 'medium';
ALTER TABLE vessels ADD COLUMN IF NOT EXISTS color_mode text not null default 'light';
