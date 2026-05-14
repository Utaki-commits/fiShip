create table if not exists booking_candidates (
  id uuid primary key default gen_random_uuid(),
  vessel_id uuid not null references vessels(id) on delete cascade,
  channel text not null default 'other',
  raw_message text not null default '',
  parsed_date date,
  parsed_bin_type text,
  parsed_name text,
  parsed_tel text,
  parsed_count int,
  parsed_note text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists booking_candidates_vessel_status_created_idx
  on booking_candidates(vessel_id, status, created_at desc);

alter table booking_candidates disable row level security;
