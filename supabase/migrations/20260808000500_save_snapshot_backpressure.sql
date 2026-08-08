-- Keep concurrent autosaves from exhausting the PostgREST connection pool.
--
-- A save rewrites several character-owned collections and updates the shared
-- profile row. Queuing an unbounded number of saves behind those locks causes
-- every PostgREST worker to wait on the same character. The public wrapper
-- below permits one save per account transaction and rejects overlap quickly;
-- the existing command id remains the durable idempotency boundary.

begin;

create or replace function private.calculate_profile_playtime(p_owner_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select coalesce(sum(coalesce(latest.playtime_seconds, 0)), 0)::bigint
  from public.characters owned
  left join lateral (
    select case
      when coalesce(ss.snapshot #>> '{game_state,playtimeSeconds}', '') ~ '^[0-9]+$'
        then (ss.snapshot #>> '{game_state,playtimeSeconds}')::bigint
      else 0
    end as playtime_seconds
    from public.save_snapshots ss
    where ss.character_id = owned.id
    order by ss.save_version desc
    limit 1
  ) latest on true
  where owned.owner_id = p_owner_id;
$$;

revoke all on function private.calculate_profile_playtime(uuid)
from public, anon, authenticated;

-- Updating a character with the same level still fires an UPDATE OF trigger.
-- Avoid taking the shared profile lock unless the level really changed.
create or replace function private.sync_profile_level()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' or new.level is distinct from old.level then
    update public.profiles
    set highest_character_level = greatest(highest_character_level, new.level)
    where id = new.owner_id;
  end if;
  return new;
end;
$$;

-- Preserve the authoritative save implementation (including later item
-- entitlement migrations), but replace its ever-growing snapshot scan with
-- one indexed latest-snapshot lookup per owned character.
do $migration$
declare
  save_function_definition text;
  optimized_function_definition text;
  profile_total_start integer;
  profile_total_end integer;
  profile_total_start_marker constant text := 'total_playtime_seconds = coalesce((';
  profile_total_end_marker constant text := 'last_active_at = now()';
  optimized_marker constant text :=
    'total_playtime_seconds = private.calculate_profile_playtime(caller_id)';
begin
  select pg_get_functiondef(
    'public.save_character_snapshot(uuid,uuid,integer,jsonb,text)'::regprocedure
  ) into save_function_definition;

  if strpos(save_function_definition, optimized_marker) > 0 then
    optimized_function_definition := save_function_definition;
  else
    profile_total_start := strpos(save_function_definition, profile_total_start_marker);
    profile_total_end := profile_total_start - 1 + strpos(
      substr(save_function_definition, profile_total_start),
      profile_total_end_marker
    );

    if profile_total_start = 0
      or profile_total_end = 0
      or profile_total_end <= profile_total_start then
      raise exception 'SAVE_PROFILE_TOTAL_EXPRESSION_NOT_FOUND';
    end if;

    optimized_function_definition :=
      substr(save_function_definition, 1, profile_total_start - 1)
      || optimized_marker
      || E',\n      '
      || substr(save_function_definition, profile_total_end);
  end if;

  execute optimized_function_definition;
end;
$migration$;

alter function public.save_character_snapshot(uuid, uuid, integer, jsonb, text)
rename to save_character_snapshot_core;

revoke all on function public.save_character_snapshot_core(uuid, uuid, integer, jsonb, text)
from public, anon, authenticated;

create or replace function public.save_character_snapshot(
  p_command_id uuid,
  p_character_id uuid,
  p_expected_save_version integer,
  p_snapshot jsonb,
  p_save_reason text default 'autosave'
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog, pg_temp
set lock_timeout = '1500ms'
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if p_character_id is null
    or not private.is_character_owner(p_character_id, caller_id) then
    raise exception using errcode = '42501', message = 'CHARACTER_NOT_OWNED';
  end if;

  if not pg_catalog.pg_try_advisory_xact_lock(
    pg_catalog.hashtextextended('profile-save:' || caller_id::text, 0)
  ) then
    raise exception using
      errcode = '55P03',
      message = 'SAVE_IN_PROGRESS',
      hint = 'Retry this command after the active save finishes.';
  end if;

  begin
    return public.save_character_snapshot_core(
      p_command_id,
      p_character_id,
      p_expected_save_version,
      p_snapshot,
      p_save_reason
    );
  exception
    when lock_not_available then
      raise exception using
        errcode = '55P03',
        message = 'SAVE_IN_PROGRESS',
        hint = 'Retry this command after the active save finishes.';
  end;
end;
$$;

revoke all on function public.save_character_snapshot(uuid, uuid, integer, jsonb, text)
from public, anon;
grant execute on function public.save_character_snapshot(uuid, uuid, integer, jsonb, text)
to authenticated;

comment on function public.save_character_snapshot(uuid, uuid, integer, jsonb, text) is
  'Owner-scoped, idempotent cloud save with per-account backpressure and bounded lock waits.';
comment on function public.save_character_snapshot_core(uuid, uuid, integer, jsonb, text) is
  'Internal authoritative save implementation. Invoke only through save_character_snapshot.';

notify pgrst, 'reload schema';

commit;
