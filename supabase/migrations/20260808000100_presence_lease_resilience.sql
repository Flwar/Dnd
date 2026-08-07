begin;

-- Mobile browsers and background tabs do not guarantee exact timer delivery.
-- Keep a three-minute lease so the 60-second client heartbeat cannot expire
-- itself because of ordinary scheduling drift and create join/leave storms.
create or replace function private.cleanup_stale_player_presence()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  disconnected_user_id uuid;
  disconnected_user_count integer := 0;
begin
  for disconnected_user_id in
    with expired_connections as (
      delete from public.player_presence_connections
      where last_seen_at < now() - interval '180 seconds'
      returning user_id
    )
    select distinct expired.user_id
    from expired_connections expired
    where not exists (
      select 1
      from public.player_presence_connections active_connection
      where active_connection.user_id = expired.user_id
    )
  loop
    perform private.append_player_presence_event(disconnected_user_id, 'left');
    disconnected_user_count := disconnected_user_count + 1;
  end loop;

  delete from public.player_presence_events
  where created_at < now() - interval '48 hours';

  return disconnected_user_count;
end;
$$;

create or replace function public.get_online_players()
returns table (
  user_id uuid,
  display_name text,
  avatar_key text,
  account_title text,
  is_king boolean,
  connection_count integer,
  last_seen_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  return query
  select
    profile.id,
    profile.display_name,
    profile.avatar_key,
    nullif(btrim(to_jsonb(profile) ->> 'account_title'), ''),
    coalesce(to_jsonb(profile) ->> 'is_king' = 'true', false),
    online.connection_count,
    online.last_seen_at
  from (
    select
      connection.user_id,
      count(connection.connection_id)::integer as connection_count,
      max(connection.last_seen_at) as last_seen_at
    from public.player_presence_connections connection
    where connection.last_seen_at >= now() - interval '180 seconds'
    group by connection.user_id
  ) online
  join public.profiles profile on profile.id = online.user_id
  order by
    coalesce(to_jsonb(profile) ->> 'is_king' = 'true', false) desc,
    online.last_seen_at desc,
    profile.display_name asc;
end;
$$;

revoke all on function private.cleanup_stale_player_presence() from public, anon, authenticated;
revoke all on function public.get_online_players() from public, anon, authenticated;
grant execute on function public.get_online_players() to authenticated;

comment on function private.cleanup_stale_player_presence() is 'Expires presence connections after a scheduling-drift-safe three-minute lease.';
comment on function public.get_online_players() is 'Returns public display data for authenticated users with a live three-minute presence lease.';

-- Ask PostgREST to refresh once after the authoritative function definitions change.
notify pgrst, 'reload schema';

commit;
