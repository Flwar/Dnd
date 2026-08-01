begin;

create table public.player_presence_connections (
  connection_id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  connected_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index player_presence_connections_user_last_seen_idx
on public.player_presence_connections (user_id, last_seen_at desc);

create index player_presence_connections_stale_idx
on public.player_presence_connections (last_seen_at);

create table public.player_presence_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('joined', 'left')),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 32),
  avatar_key text not null,
  account_title text,
  is_king boolean not null default false,
  created_at timestamptz not null default now()
);

create index player_presence_events_created_at_idx
on public.player_presence_events (created_at desc);

alter table public.player_presence_connections enable row level security;
alter table public.player_presence_events enable row level security;

create policy player_presence_connections_select_own
on public.player_presence_connections for select to authenticated
using (user_id = auth.uid());

create policy player_presence_events_read_authenticated
on public.player_presence_events for select to authenticated
using (auth.uid() is not null);

revoke all on public.player_presence_connections from public, anon, authenticated;
revoke all on public.player_presence_events from public, anon, authenticated;
grant select on public.player_presence_events to authenticated;

create or replace function private.append_player_presence_event(
  p_user_id uuid,
  p_event_type text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if p_event_type not in ('joined', 'left') then
    raise exception 'INVALID_PRESENCE_EVENT';
  end if;

  insert into public.player_presence_events (
    user_id,
    event_type,
    display_name,
    avatar_key,
    account_title,
    is_king
  )
  select
    profile.id,
    p_event_type,
    profile.display_name,
    profile.avatar_key,
    nullif(btrim(to_jsonb(profile) ->> 'account_title'), ''),
    coalesce(to_jsonb(profile) ->> 'is_king' = 'true', false)
  from public.profiles profile
  where profile.id = p_user_id;
end;
$$;

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
      where last_seen_at < now() - interval '60 seconds'
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

create or replace function public.heartbeat_player_presence(
  p_connection_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  was_online boolean;
  connection_exists boolean;
  fresh_connection_count integer;
  affected_rows integer;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_connection_id is null then
    raise exception 'INVALID_CONNECTION_ID';
  end if;

  -- Serializing the short transition section makes join/leave events user-level,
  -- even when several tabs heartbeat or disconnect at the same time.
  perform pg_advisory_xact_lock(hashtextextended('global-player-presence', 0));
  perform private.cleanup_stale_player_presence();

  select exists (
    select 1
    from public.player_presence_connections connection
    where connection.user_id = current_user_id
  ) into was_online;

  select exists (
    select 1
    from public.player_presence_connections connection
    where connection.connection_id = p_connection_id
      and connection.user_id = current_user_id
  ) into connection_exists;

  select count(*)::integer
  into fresh_connection_count
  from public.player_presence_connections connection
  where connection.user_id = current_user_id;

  if not connection_exists and fresh_connection_count >= 8 then
    raise exception 'TOO_MANY_PRESENCE_CONNECTIONS';
  end if;

  insert into public.player_presence_connections (
    connection_id,
    user_id,
    connected_at,
    last_seen_at
  )
  values (p_connection_id, current_user_id, now(), now())
  on conflict (connection_id) do update
  set last_seen_at = excluded.last_seen_at
  where player_presence_connections.user_id = current_user_id;

  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'PRESENCE_CONNECTION_OWNED_BY_OTHER';
  end if;

  update public.profiles
  set last_active_at = now()
  where id = current_user_id;

  if not was_online then
    perform private.append_player_presence_event(current_user_id, 'joined');
  end if;

  return jsonb_build_object(
    'ok', true,
    'connection_id', p_connection_id,
    'server_time', now()
  );
end;
$$;

create or replace function public.disconnect_player_presence(
  p_connection_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  removed_connection boolean := false;
  remains_online boolean;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_connection_id is null then
    raise exception 'INVALID_CONNECTION_ID';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('global-player-presence', 0));
  perform private.cleanup_stale_player_presence();

  with removed as (
    delete from public.player_presence_connections
    where connection_id = p_connection_id
      and user_id = current_user_id
    returning connection_id
  )
  select exists (select 1 from removed) into removed_connection;

  select exists (
    select 1
    from public.player_presence_connections connection
    where connection.user_id = current_user_id
  ) into remains_online;

  if removed_connection and not remains_online then
    perform private.append_player_presence_event(current_user_id, 'left');
  end if;

  return jsonb_build_object(
    'ok', true,
    'removed', removed_connection,
    'still_online', remains_online
  );
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
    where connection.last_seen_at >= now() - interval '60 seconds'
    group by connection.user_id
  ) online
  join public.profiles profile on profile.id = online.user_id
  order by
    coalesce(to_jsonb(profile) ->> 'is_king' = 'true', false) desc,
    online.last_seen_at desc,
    profile.display_name asc;
end;
$$;

revoke all on function private.append_player_presence_event(uuid, text) from public, anon, authenticated;
revoke all on function private.cleanup_stale_player_presence() from public, anon, authenticated;

revoke all on function public.heartbeat_player_presence(uuid) from public, anon, authenticated;
revoke all on function public.disconnect_player_presence(uuid) from public, anon, authenticated;
revoke all on function public.get_online_players() from public, anon, authenticated;

grant execute on function public.heartbeat_player_presence(uuid) to authenticated;
grant execute on function public.disconnect_player_presence(uuid) to authenticated;
grant execute on function public.get_online_players() to authenticated;

alter table public.player_presence_events replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'player_presence_events'
    ) then
    alter publication supabase_realtime add table public.player_presence_events;
  end if;
end;
$$;

comment on table public.player_presence_connections is 'Short-lived, per-tab authenticated connections. Direct browser writes are forbidden.';
comment on table public.player_presence_events is 'Sanitized user-level join and leave events for authenticated realtime subscribers; never contains email addresses.';
comment on function public.heartbeat_player_presence(uuid) is 'Owner-bound authoritative heartbeat. One account may hold several tab connection IDs.';
comment on function public.get_online_players() is 'Returns only public display data for currently authenticated users.';

commit;
