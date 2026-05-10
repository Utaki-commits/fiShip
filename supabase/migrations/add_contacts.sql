CREATE TABLE IF NOT EXISTS contacts (
  id uuid primary key default gen_random_uuid(),
  vessel_id uuid references vessels(id) on delete set null,
  name text not null default '',
  message text not null,
  created_at timestamptz not null default now()
);

ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
