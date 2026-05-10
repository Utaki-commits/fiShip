-- fiShip データベーススキーマ
-- Supabase の SQL Editor でこのファイルを実行してください
-- 既存テーブルがある場合は DROP をコメントアウトしてから実行してください

-- =============================================
-- vessels: 船・船長情報
-- =============================================
create table if not exists vessels (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  captain_name     text not null,
  capacity         int  not null default 4,
  prefecture       text not null default '',
  port_name        text not null default '',
  access           text not null default '',
  departure_time   text not null default '06:00',
  charter_accepted boolean not null default true,
  beginner_accepted boolean not null default true,
  price            text not null default '',
  logo_url         text not null default '',
  banner_url       text not null default '',
  map_embed_url    text not null default '',
  notify_enabled   boolean not null default true,
  notify_hours     text not null default '6:00〜21:00',
  font_size        text not null default 'medium',
  color_mode       text not null default 'light',
  created_at       timestamptz not null default now()
);

-- 1ユーザー1船
create unique index if not exists vessels_user_id_idx on vessels(user_id);

-- RLS: 自分の船のみ操作可能
alter table vessels enable row level security;
create policy "owner only" on vessels
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- =============================================
-- bookings: 予約データ
-- =============================================
create table if not exists bookings (
  id             uuid primary key default gen_random_uuid(),
  vessel_id      uuid not null references vessels(id) on delete cascade,
  date           date not null,
  bin_type       text not null check (bin_type in ('day', 'night')),
  name           text not null,
  tel            text not null default '',
  count          int  not null default 1,
  fishing_style  text,
  message        text,
  status         text not null default 'pending'
                   check (status in ('pending', 'confirmed', 'rejected')),
  contacted      boolean not null default false,
  channel        text not null default 'page',
  created_at     timestamptz not null default now()
);

create index if not exists bookings_vessel_date_idx on bookings(vessel_id, date);

-- RLS: 船長は自分の船の予約のみ操作可能
--      顧客は予約を作成できる（vessel_id が存在すれば）
alter table bookings enable row level security;

-- 船長向け（全操作）
create policy "captain full access" on bookings
  using (
    exists (select 1 from vessels where vessels.id = bookings.vessel_id and vessels.user_id = auth.uid())
  )
  with check (
    exists (select 1 from vessels where vessels.id = bookings.vessel_id and vessels.user_id = auth.uid())
  );

-- 顧客向け（INSERT のみ）
create policy "customer insert" on bookings
  for insert
  with check (true);

-- 顧客向け（自分の vessel の booking を SELECT できる: 予約フォームの残席確認用）
create policy "public read for reserve page" on bookings
  for select
  using (true);


-- =============================================
-- bin_settings: 便設定（昼便・夜便のスケジュール）
-- =============================================
create table if not exists bin_settings (
  id             uuid primary key default gen_random_uuid(),
  vessel_id      uuid not null references vessels(id) on delete cascade,
  bin_type       text not null check (bin_type in ('day', 'night')),
  start_month    int  not null check (start_month between 0 and 11),
  end_month      int  not null check (end_month between 0 and 11),
  days_of_week   int[] not null default '{}',
  departure_time text not null default '06:00',
  fish_types     text[] not null default '{}',
  max_capacity   int  not null default 4,
  price          text not null default '',
  created_at     timestamptz not null default now()
);

create index if not exists bin_settings_vessel_idx on bin_settings(vessel_id);

alter table bin_settings enable row level security;

-- 船長のみ操作可能
create policy "captain full access" on bin_settings
  using (
    exists (select 1 from vessels where vessels.id = bin_settings.vessel_id and vessels.user_id = auth.uid())
  )
  with check (
    exists (select 1 from vessels where vessels.id = bin_settings.vessel_id and vessels.user_id = auth.uid())
  );

-- 予約フォームで読み取りが必要
create policy "public read" on bin_settings
  for select
  using (true);


-- =============================================
-- customers: 顧客名簿（将来の個別管理用）
-- =============================================
create table if not exists customers (
  id         uuid primary key default gen_random_uuid(),
  vessel_id  uuid not null references vessels(id) on delete cascade,
  name       text not null,
  tel        text not null default '',
  address    text not null default '',
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists customers_vessel_idx on customers(vessel_id);

alter table customers enable row level security;
create policy "captain full access" on customers
  using (
    exists (select 1 from vessels where vessels.id = customers.vessel_id and vessels.user_id = auth.uid())
  )
  with check (
    exists (select 1 from vessels where vessels.id = customers.vessel_id and vessels.user_id = auth.uid())
  );


-- =============================================
-- passenger_logs: 乗船名簿
-- =============================================
create table if not exists passenger_logs (
  id                 uuid primary key default gen_random_uuid(),
  vessel_id          uuid not null references vessels(id) on delete cascade,
  booking_id         uuid unique references bookings(id) on delete set null,
  date               date not null,
  bin_type           text not null default 'day',
  name               text not null,
  tel                text not null default '',
  count              int  not null default 1,
  address            text not null default '',
  emergency_contact  text not null default '',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists passenger_logs_vessel_date_idx on passenger_logs(vessel_id, date);

-- updated_at を自動更新するトリガー
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger passenger_logs_updated_at
  before update on passenger_logs
  for each row execute function update_updated_at();

alter table passenger_logs enable row level security;
create policy "captain full access" on passenger_logs
  using (
    exists (select 1 from vessels where vessels.id = passenger_logs.vessel_id and vessels.user_id = auth.uid())
  )
  with check (
    exists (select 1 from vessels where vessels.id = passenger_logs.vessel_id and vessels.user_id = auth.uid())
  );

-- =============================================
-- contacts: お問い合わせ
-- =============================================
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  vessel_id uuid references vessels(id) on delete set null,
  name text not null default '',
  message text not null,
  created_at timestamptz not null default now()
);

alter table contacts disable row level security;
