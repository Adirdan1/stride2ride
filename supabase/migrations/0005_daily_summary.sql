-- Every day at 09:00 Israel time: a push to everyone with the money lost so
-- far by not deciding (the savings page's figure).
--
-- pg_cron runs in UTC and Israel is UTC+2 in winter, UTC+3 in summer. So the
-- job fires at 06:00 and 07:00 UTC and only the run that lands on 09:00 in
-- Jerusalem sends. Exactly 09:00 all year, with nothing to change at DST.

create extension if not exists pg_cron;

create or replace function ride.daily_summary(p_force boolean default false) returns bigint
language plpgsql security definer set search_path = '' as $$
begin
  if not p_force and extract(hour from (now() at time zone 'Asia/Jerusalem')) <> 9 then
    return null;
  end if;
  return ride.call_notify(jsonb_build_object('kind', 'daily'));
end $$;

revoke execute on function ride.daily_summary(boolean) from public, anon, authenticated;
grant execute on function ride.daily_summary(boolean) to service_role;

select cron.schedule('ride-daily-summary', '0 6,7 * * *', $$select ride.daily_summary()$$);
