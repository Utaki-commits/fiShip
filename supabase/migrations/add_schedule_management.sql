ALTER TABLE bin_settings
  ADD COLUMN IF NOT EXISTS enabled boolean not null default true;

CREATE TABLE IF NOT EXISTS blocked_dates (
  id uuid primary key default gen_random_uuid(),
  vessel_id uuid not null references vessels(id) on delete cascade,
  date_from date not null,
  date_to date not null,
  bin_type text check (bin_type in ('day', 'night')),
  type text not null default 'maintenance' check (type in ('maintenance', 'weather', 'trouble', 'other')),
  reason text not null default '',
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS blocked_dates_vessel_idx ON blocked_dates(vessel_id);
CREATE INDEX IF NOT EXISTS blocked_dates_date_idx ON blocked_dates(date_from, date_to);

ALTER TABLE blocked_dates DISABLE ROW LEVEL SECURITY;
