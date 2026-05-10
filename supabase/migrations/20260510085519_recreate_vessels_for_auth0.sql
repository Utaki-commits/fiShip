-- Existing tables are dropped because the current project only contains dummy data.
drop table if exists passenger_logs cascade;
drop table if exists customers cascade;
drop table if exists bin_settings cascade;
drop table if exists bookings cascade;
drop table if exists vessels cascade;

create table vessels (
  id                 uuid primary key default gen_random_uuid(),
  user_id            text not null,
  name               text not null,
  captain_name       text not null,
  capacity           int not null default 4,
  prefecture         text not null default '',
  port_name          text not null default '',
  access             text not null default '',
  departure_time     text not null default '06:00',
  charter_accepted   boolean not null default true,
  beginner_accepted  boolean not null default true,
  price              text not null default '',
  logo_url           text not null default '',
  banner_url         text not null default '',
  map_embed_url      text not null default '',
  notify_enabled     boolean not null default true,
  notify_hours       text not null default '6:00〜21:00',
  font_size          text not null default 'medium',
  color_mode         text not null default 'light',
  created_at         timestamptz not null default now()
);

create unique index vessels_user_id_idx on vessels(user_id);

alter table vessels disable row level security;
