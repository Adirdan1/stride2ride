-- A trip written without a car gets its household's own car. Keeps any
-- client that predates the car column (or a future Shortcut) working.
create or replace function ride.default_car() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.car is null then
    new.car := case when new.rider = 'adi' then 'corsa' else 'star' end;
  end if;
  return new;
end $$;
revoke execute on function ride.default_car() from public, anon, authenticated;
grant execute on function ride.default_car() to service_role;
create trigger trips_default_car before insert on ride.trips
  for each row execute function ride.default_car();
