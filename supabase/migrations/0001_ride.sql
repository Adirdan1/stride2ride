-- stride2ride: shared-car usage log.
-- Lives as schema `ride` inside the shared `Stride` Supabase project.
-- RLS on, zero policies: only the server (service_role) reaches these tables,
-- and the server only answers behind the app's PIN gate.

create schema if not exists ride;
grant usage on schema ride to service_role;

-- One row per time somebody had the car out.
-- `rider` rather than `user`: USER is a reserved word in Postgres
-- (`select user` returns the current role), so the column is named for what it is.
create table ride.trips (
  id          uuid primary key default gen_random_uuid(),
  rider       text not null check (rider in ('adir', 'or', 'adi')),
  started_at  timestamptz not null,
  ended_at    timestamptz,                       -- null = still out
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint trips_end_after_start check (ended_at is null or ended_at > started_at)
);

-- At most one open trip per person. Makes a double-tapped "יצאתי" harmless.
create unique index trips_one_open_per_rider on ride.trips (rider) where ended_at is null;
create index trips_started_at on ride.trips (started_at);

create or replace function ride.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trips_touch before update on ride.trips
  for each row execute function ride.touch_updated_at();

-- Exactly one row. Money in agorot, return in basis points: integers only.
create table ride.settings (
  id                      int primary key default 1 check (id = 1),
  tracking_start          date not null default '2026-11-01',
  decision_date           date,                  -- null until decided; stops the counter
  savings_home_agorot     int  not null default 135200 check (savings_home_agorot >= 0),   -- אדיר+אור: 816 car + 536 parking
  savings_adi_agorot      int  not null default 81600  check (savings_adi_agorot >= 0),
  capital_agorot          int  not null default 2575000 check (capital_agorot >= 0),        -- freed per side
  annual_return_bp        int  not null default 700 check (annual_return_bp between 0 and 10000),
  updated_at              timestamptz not null default now()
);

create trigger settings_touch before update on ride.settings
  for each row execute function ride.touch_updated_at();

insert into ride.settings (id) values (1) on conflict do nothing;

alter table ride.trips enable row level security;
alter table ride.settings enable row level security;

grant all on all tables in schema ride to service_role;
grant execute on all functions in schema ride to service_role;
alter default privileges in schema ride grant all on tables to service_role;
alter default privileges in schema ride grant execute on functions to service_role;
revoke execute on function ride.touch_updated_at() from public, anon, authenticated;

-- Expose to PostgREST, additively. Keep every schema already listed.
alter role authenticator set pgrst.db_schemas =
  'public, graphql_public, edu, sap, stride2do, wealth, third, stride2pro, deficit, stride2brief, ride';
notify pgrst, 'reload config';
