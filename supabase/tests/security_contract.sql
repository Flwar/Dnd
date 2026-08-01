-- Run after `supabase db reset` with:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security_contract.sql
begin;

do $contract$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'characters', 'character_attributes', 'character_inventory',
    'character_equipment', 'character_quests', 'character_story_flags',
    'character_relationships', 'character_discovered_locations',
    'character_chapter_completions', 'save_snapshots', 'save_commands',
    'character_creation_requests', 'parties', 'party_members', 'party_sessions',
    'party_events', 'party_commands', 'party_votes', 'reward_definitions',
    'reward_claims'
  ] loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = table_name
        and c.relrowsecurity
    ) then
      raise exception 'RLS is not enabled for public.%', table_name;
    end if;
  end loop;

  if has_table_privilege('anon', 'public.characters', 'select')
    or has_table_privilege('anon', 'public.profiles', 'select')
    or has_table_privilege('authenticated', 'public.party_events', 'insert')
    or has_table_privilege('authenticated', 'public.reward_claims', 'insert') then
    raise exception 'A browser role has an unsafe table grant';
  end if;

  if has_function_privilege(
      'authenticated',
      'public.apply_party_command_result(uuid,bigint,boolean,jsonb,jsonb)',
      'execute'
    )
    or has_function_privilege(
      'authenticated',
      'public.grant_character_reward(uuid,uuid,text,text)',
      'execute'
    ) then
    raise exception 'An authoritative function is executable by authenticated';
  end if;

  if not has_function_privilege(
      'authenticated',
      'public.submit_party_command(uuid,uuid,uuid,bigint,text,jsonb)',
      'execute'
    ) then
    raise exception 'Authenticated cannot submit a validated party command';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'party_members_one_active_party_idx'
  ) then
    raise exception 'The one-active-party invariant is missing';
  end if;
end;
$contract$;

rollback;
