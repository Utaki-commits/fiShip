-- bin_settings: 便ごとの出船スケジュール設定
-- Supabase の SQL Editor でそのまま実行してください

create table if not exists bin_settings (
  id             uuid        primary key default gen_random_uuid(),
  vessel_id      uuid        not null references vessels(id) on delete cascade,
  bin_type       text        not null check (bin_type in ('day', 'night')),
  start_month    int         not null check (start_month between 0 and 11),
  end_month      int         not null check (end_month between 0 and 11),
  days_of_week   int[]       not null,           -- 0=日 1=月 2=火 3=水 4=木 5=金 6=土
  departure_time text        not null,
  fish_types     text[]      not null default '{}',
  max_capacity   int         not null,
  price          text        not null default '',
  created_at     timestamptz not null default now()
);

-- vessel_id での絞り込みを高速化
create index if not exists bin_settings_vessel_id_idx
  on bin_settings (vessel_id);

-- Row Level Security を有効化
alter table bin_settings enable row level security;

-- 自分の船の設定のみ読み書き可能
create policy "vessel owner can manage bin_settings"
  on bin_settings
  using (
    vessel_id in (
      select id from vessels where user_id = auth.uid()
    )
  )
  with check (
    vessel_id in (
      select id from vessels where user_id = auth.uid()
    )
  );
