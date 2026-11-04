-- Widget keys: one row per copied Scriptable script, naming the person who
-- copied it. Only the SHA-256 of the key is stored; deleting the row revokes it.
-- RLS on, zero policies, service_role only — as every table in the collection.

create table ride.widget_keys (
  id            uuid primary key default gen_random_uuid(),
  rider         text not null check (rider in ('adir', 'or', 'adi')),
  key_hash      text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  label         text not null default 'copied script',
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);

create index widget_keys_rider on ride.widget_keys (rider);

alter table ride.widget_keys enable row level security;
grant all on ride.widget_keys to service_role;
