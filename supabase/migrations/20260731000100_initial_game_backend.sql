begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.secure_game_seed()
returns bigint
language sql
volatile
set search_path = pg_catalog, extensions, pg_temp
as $$
  select greatest(
    1::bigint,
    pg_catalog.get_byte(value, 0)::bigint * 16777216
      + pg_catalog.get_byte(value, 1)::bigint * 65536
      + pg_catalog.get_byte(value, 2)::bigint * 256
      + pg_catalog.get_byte(value, 3)::bigint
  )
  from (select extensions.gen_random_bytes(4) as value) secure_bytes;
$$;
revoke all on function private.secure_game_seed() from public, anon, authenticated;

create type public.party_status as enum ('open', 'active', 'closed');
create type public.session_status as enum ('forming', 'active', 'completed', 'abandoned');
create type public.quest_status as enum ('active', 'completed', 'failed');
create type public.command_status as enum ('pending', 'accepted', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 32),
  avatar_key text not null default 'wanderer_01' check (avatar_key ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  total_playtime_seconds bigint not null default 0 check (total_playtime_seconds >= 0),
  highest_character_level smallint not null default 0 check (highest_character_level between 0 and 20),
  completed_chapter_count integer not null default 0 check (completed_chapter_count >= 0)
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 32),
  description text check (description is null or char_length(description) <= 500),
  form_of_address text check (form_of_address is null or char_length(form_of_address) <= 40),
  race_id text not null check (race_id in ('human', 'elf', 'dwarf', 'halfling', 'orc', 'dragonborn')),
  class_id text not null check (class_id in ('fighter', 'mage', 'rogue', 'ranger', 'cleric', 'barbarian')),
  background_id text not null check (background_id in ('former-soldier', 'wandering-scholar', 'border-hunter', 'former-criminal', 'fallen-noble', 'temple-servant', 'road-orphan')),
  portrait_key text not null check (portrait_key in (
    'portrait-human-01', 'portrait-human-02', 'portrait-human-03', 'portrait-human-04',
    'portrait-elf-01', 'portrait-elf-02', 'portrait-elf-03', 'portrait-elf-04',
    'portrait-dwarf-01', 'portrait-dwarf-02', 'portrait-dwarf-03', 'portrait-dwarf-04',
    'portrait-halfling-01', 'portrait-halfling-02', 'portrait-halfling-03', 'portrait-halfling-04',
    'portrait-orc-01', 'portrait-orc-02', 'portrait-orc-03', 'portrait-orc-04',
    'portrait-dragonborn-01', 'portrait-dragonborn-02', 'portrait-dragonborn-03', 'portrait-dragonborn-04'
  )),
  level smallint not null default 1 check (level between 1 and 20),
  experience integer not null default 0 check (experience >= 0),
  current_health integer not null check (current_health >= 0),
  maximum_health integer not null check (maximum_health > 0 and current_health <= maximum_health),
  primary_resource_type text not null check (primary_resource_type in ('stamina', 'mana', 'focus', 'faith', 'rage')),
  primary_resource integer not null default 0 check (primary_resource >= 0),
  maximum_primary_resource integer not null check (maximum_primary_resource >= 0 and primary_resource <= maximum_primary_resource),
  gold integer not null default 0 check (gold >= 0),
  reputation integer not null default 0 check (reputation between -100 and 100),
  current_location_id text not null default 'village-gate' check (current_location_id ~ '^[a-z0-9][a-z0-9_-]{1,95}$'),
  chapter_id text not null default 'shadows-beneath-mistvale' check (chapter_id ~ '^[a-z0-9][a-z0-9_-]{1,95}$'),
  save_version integer not null default 1 check (save_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_played_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (id, owner_id)
);

create table public.character_attributes (
  character_id uuid primary key references public.characters(id) on delete cascade,
  strength smallint not null check (strength between 3 and 20),
  dexterity smallint not null check (dexterity between 3 and 20),
  constitution smallint not null check (constitution between 3 and 20),
  intelligence smallint not null check (intelligence between 3 and 20),
  wisdom smallint not null check (wisdom between 3 and 20),
  charisma smallint not null check (charisma between 3 and 20)
);

create table public.character_inventory (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  item_id text not null check (item_id ~ '^[a-z0-9][a-z0-9_-]{1,95}$'),
  quantity integer not null default 1 check (quantity > 0),
  durability smallint check (durability is null or durability between 0 and 100),
  custom_data jsonb not null default '{}'::jsonb check (jsonb_typeof(custom_data) = 'object'),
  acquired_at timestamptz not null default now(),
  unique (id, character_id)
);

create table public.character_equipment (
  character_id uuid not null references public.characters(id) on delete cascade,
  slot text not null check (slot in ('weapon', 'off_hand', 'armor', 'helmet', 'gloves', 'boots', 'ring', 'amulet')),
  inventory_entry_id uuid not null,
  equipped_at timestamptz not null default now(),
  primary key (character_id, slot),
  unique (inventory_entry_id),
  foreign key (inventory_entry_id, character_id)
    references public.character_inventory(id, character_id) on delete cascade
);

create table public.character_quests (
  character_id uuid not null references public.characters(id) on delete cascade,
  quest_id text not null check (quest_id ~ '^[a-z0-9][a-z0-9_-]{1,95}$'),
  status public.quest_status not null default 'active',
  current_stage integer not null default 1 check (current_stage >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  quest_data jsonb not null default '{}'::jsonb check (jsonb_typeof(quest_data) = 'object'),
  primary key (character_id, quest_id),
  check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);

create table public.character_story_flags (
  character_id uuid not null references public.characters(id) on delete cascade,
  flag_key text not null check (flag_key ~ '^[a-z0-9][a-z0-9_.-]{1,127}$'),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (character_id, flag_key)
);

create table public.character_relationships (
  character_id uuid not null references public.characters(id) on delete cascade,
  npc_id text not null check (npc_id ~ '^[a-z0-9][a-z0-9_-]{1,95}$'),
  trust smallint not null default 0 check (trust between -100 and 100),
  respect smallint not null default 0 check (respect between -100 and 100),
  fear smallint not null default 0 check (fear between -100 and 100),
  relationship_data jsonb not null default '{}'::jsonb check (jsonb_typeof(relationship_data) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (character_id, npc_id)
);

create table public.character_discovered_locations (
  character_id uuid not null references public.characters(id) on delete cascade,
  location_id text not null check (location_id ~ '^[a-z0-9][a-z0-9_-]{1,95}$'),
  discovered_at timestamptz not null default now(),
  visited_at timestamptz,
  primary key (character_id, location_id)
);

create table public.character_chapter_completions (
  character_id uuid not null references public.characters(id) on delete cascade,
  chapter_id text not null check (chapter_id ~ '^[a-z0-9][a-z0-9_-]{1,95}$'),
  completion_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(completion_summary) = 'object'),
  completed_at timestamptz not null default now(),
  primary key (character_id, chapter_id)
);

create table public.save_snapshots (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  save_version integer not null check (save_version > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  save_reason text not null check (save_reason in ('character_created', 'autosave', 'checkpoint', 'combat_victory', 'level_up', 'chapter_complete', 'manual', 'migration')),
  created_at timestamptz not null default now(),
  unique (character_id, save_version)
);

create table public.save_commands (
  command_id uuid primary key,
  character_id uuid not null references public.characters(id) on delete cascade,
  snapshot_id uuid not null references public.save_snapshots(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.character_creation_requests (
  command_id uuid primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  character_id uuid not null unique references public.characters(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  leader_character_id uuid not null references public.characters(id) on delete restrict,
  room_code text not null unique check (room_code ~ '^[A-Z0-9]{6}$'),
  name text not null check (char_length(btrim(name)) between 2 and 40),
  status public.party_status not null default 'open',
  maximum_members smallint not null default 4 check (maximum_members between 2 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.party_members (
  party_id uuid not null references public.parties(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  role text not null default 'member' check (role in ('leader', 'member')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  ready_state boolean not null default false,
  connection_state text not null default 'connected' check (connection_state in ('connected', 'reconnecting', 'disconnected')),
  last_seen_at timestamptz not null default now(),
  primary key (party_id, character_id)
);

create table public.party_sessions (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  chapter_id text not null check (chapter_id ~ '^[a-z0-9][a-z0-9_-]{1,95}$'),
  session_state jsonb not null default '{}'::jsonb check (jsonb_typeof(session_state) = 'object'),
  current_scene_id text not null check (current_scene_id ~ '^[a-z0-9][a-z0-9_-]{1,95}$'),
  current_turn integer not null default 0 check (current_turn >= 0),
  status public.session_status not null default 'forming',
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.party_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.party_sessions(id) on delete cascade,
  event_type text not null check (event_type ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_by_character_id uuid references public.characters(id) on delete set null,
  sequence_number bigint not null check (sequence_number > 0),
  created_at timestamptz not null default now(),
  unique (session_id, sequence_number)
);

create table public.party_commands (
  command_id uuid primary key,
  session_id uuid not null references public.party_sessions(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  command_type text not null check (command_type in ('SUBMIT_DIALOGUE_VOTE', 'RESOLVE_INTERACTION', 'RESOLVE_SKILL_CHECK', 'MOVE_TO_LOCATION', 'BEGIN_ENCOUNTER', 'SUBMIT_COMBAT_ACTION', 'USE_ITEM', 'CLAIM_LOOT', 'COMPLETE_SCENE')),
  expected_session_version bigint not null check (expected_session_version > 0),
  server_seed bigint not null default private.secure_game_seed()
    check (server_seed between 1 and 4294967295),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status public.command_status not null default 'pending',
  result jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  check (result is null or jsonb_typeof(result) = 'object')
);

create table public.party_votes (
  session_id uuid not null references public.party_sessions(id) on delete cascade,
  scene_id text not null,
  decision_id text not null,
  character_id uuid not null references public.characters(id) on delete cascade,
  choice_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, scene_id, decision_id, character_id)
);

create table public.reward_definitions (
  reward_key text primary key check (reward_key ~ '^[a-z0-9][a-z0-9_.-]{1,127}$'),
  item_id text,
  item_quantity integer not null default 0 check (item_quantity >= 0),
  gold integer not null default 0 check (gold >= 0),
  experience integer not null default 0 check (experience >= 0),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  enabled boolean not null default true,
  check ((item_id is null and item_quantity = 0) or (item_id is not null and item_quantity > 0))
);

create table public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  character_id uuid not null references public.characters(id) on delete cascade,
  reward_key text not null references public.reward_definitions(reward_key) on delete restrict,
  scope_key text not null check (char_length(scope_key) between 1 and 160),
  granted_item_entry_id uuid references public.character_inventory(id) on delete set null,
  granted_gold integer not null default 0 check (granted_gold >= 0),
  granted_experience integer not null default 0 check (granted_experience >= 0),
  created_at timestamptz not null default now(),
  unique (reward_key, scope_key)
);

create index characters_owner_last_played_idx on public.characters(owner_id, last_played_at desc);
create index character_inventory_character_item_idx on public.character_inventory(character_id, item_id);
create unique index character_inventory_unique_items_idx
on public.character_inventory(character_id, item_id)
where item_id in (
  'signet-ring', 'lucky-copper', 'foreman-journal', 'cult-medallion',
  'rune-breaker-hammer', 'fogglass-ring', 'first-crown-shard', 'guardian-core'
);
create index character_quests_status_idx on public.character_quests(character_id, status);
create index save_snapshots_latest_idx on public.save_snapshots(character_id, save_version desc);
create index parties_room_status_idx on public.parties(room_code, status);
create index party_members_party_active_idx on public.party_members(party_id, joined_at) where left_at is null;
create unique index party_members_one_active_party_idx on public.party_members(character_id) where left_at is null;
create unique index parties_one_active_leader_idx on public.parties(leader_character_id) where status <> 'closed';
create unique index party_sessions_one_active_idx on public.party_sessions(party_id) where status in ('forming', 'active');
create index party_events_stream_idx on public.party_events(session_id, sequence_number);
create index party_commands_session_created_idx on public.party_commands(session_id, created_at);
create index party_votes_decision_idx on public.party_votes(session_id, scene_id, decision_id);
create index reward_claims_character_idx on public.reward_claims(character_id, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger characters_set_updated_at
before update on public.characters
for each row execute function private.set_updated_at();

create trigger character_story_flags_set_updated_at
before update on public.character_story_flags
for each row execute function private.set_updated_at();

create trigger character_relationships_set_updated_at
before update on public.character_relationships
for each row execute function private.set_updated_at();

create trigger parties_set_updated_at
before update on public.parties
for each row execute function private.set_updated_at();

create trigger party_sessions_set_updated_at
before update on public.party_sessions
for each row execute function private.set_updated_at();

create trigger party_votes_set_updated_at
before update on public.party_votes
for each row execute function private.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requested_name text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
begin
  if char_length(requested_name) not between 2 and 32 then
    requested_name := 'מטייל/ת';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, requested_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function private.is_character_owner(
  p_character_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.characters c
    where c.id = p_character_id
      and c.owner_id = p_user_id
  );
$$;

create or replace function private.is_party_member(
  p_party_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.party_members pm
    join public.characters c on c.id = pm.character_id
    where pm.party_id = p_party_id
      and pm.left_at is null
      and c.owner_id = p_user_id
  );
$$;

create or replace function private.is_party_leader(
  p_party_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.parties p
    join public.characters c on c.id = p.leader_character_id
    where p.id = p_party_id
      and p.status <> 'closed'
      and c.owner_id = p_user_id
  );
$$;

create or replace function private.is_session_member(
  p_session_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select private.is_party_member(ps.party_id, p_user_id)
  from public.party_sessions ps
  where ps.id = p_session_id;
$$;

create or replace function private.shares_party_with_user(
  p_other_user_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.party_members mine
    join public.characters my_character on my_character.id = mine.character_id
    join public.party_members theirs
      on theirs.party_id = mine.party_id
      and theirs.left_at is null
    join public.characters their_character on their_character.id = theirs.character_id
    where mine.left_at is null
      and my_character.owner_id = p_user_id
      and their_character.owner_id = p_other_user_id
  );
$$;

create or replace function private.attribute_point_cost(p_value integer)
returns integer
language sql
immutable
strict
set search_path = pg_catalog, pg_temp
as $$
  select case p_value
    when 8 then 0
    when 9 then 1
    when 10 then 2
    when 11 then 3
    when 12 then 4
    when 13 then 5
    when 14 then 7
    when 15 then 9
    else 1000
  end;
$$;

create or replace function private.level_for_experience(p_experience integer)
returns smallint
language sql
immutable
strict
set search_path = pg_catalog, pg_temp
as $$
  select case
    when p_experience >= 25000 then 10
    when p_experience >= 19000 then 9
    when p_experience >= 14200 then 8
    when p_experience >= 10200 then 7
    when p_experience >= 7000 then 6
    when p_experience >= 4500 then 5
    when p_experience >= 2600 then 4
    when p_experience >= 1300 then 3
    when p_experience >= 500 then 2
    else 1
  end::smallint;
$$;

create or replace function private.sync_profile_level()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles
  set highest_character_level = greatest(highest_character_level, new.level)
  where id = new.owner_id;
  return new;
end;
$$;

create trigger characters_sync_profile_level
after insert or update of level on public.characters
for each row execute function private.sync_profile_level();

create or replace function private.sync_profile_chapter_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_owner uuid;
begin
  select owner_id into target_owner
  from public.characters
  where id = coalesce(new.character_id, old.character_id);

  update public.profiles p
  set completed_chapter_count = (
    select count(*)::integer
    from public.character_chapter_completions completion
    join public.characters c on c.id = completion.character_id
    where c.owner_id = target_owner
  )
  where p.id = target_owner;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger chapter_completions_sync_profile
after insert or delete on public.character_chapter_completions
for each row execute function private.sync_profile_chapter_count();

create or replace function private.append_party_event(
  p_session_id uuid,
  p_event_type text,
  p_payload jsonb,
  p_character_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_sequence bigint;
begin
  perform 1 from public.party_sessions where id = p_session_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'SESSION_NOT_FOUND';
  end if;

  select coalesce(max(sequence_number), 0) + 1
  into next_sequence
  from public.party_events
  where session_id = p_session_id;

  insert into public.party_events (
    session_id,
    event_type,
    payload,
    created_by_character_id,
    sequence_number
  ) values (
    p_session_id,
    p_event_type,
    coalesce(p_payload, '{}'::jsonb),
    p_character_id,
    next_sequence
  );

  return next_sequence;
end;
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_character_owner(uuid, uuid) to authenticated, service_role;
grant execute on function private.is_party_member(uuid, uuid) to authenticated, service_role;
grant execute on function private.is_party_leader(uuid, uuid) to authenticated, service_role;
grant execute on function private.is_session_member(uuid, uuid) to authenticated, service_role;
grant execute on function private.shares_party_with_user(uuid, uuid) to authenticated, service_role;
grant execute on all functions in schema private to service_role;

alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.character_attributes enable row level security;
alter table public.character_inventory enable row level security;
alter table public.character_equipment enable row level security;
alter table public.character_quests enable row level security;
alter table public.character_story_flags enable row level security;
alter table public.character_relationships enable row level security;
alter table public.character_discovered_locations enable row level security;
alter table public.character_chapter_completions enable row level security;
alter table public.save_snapshots enable row level security;
alter table public.save_commands enable row level security;
alter table public.character_creation_requests enable row level security;
alter table public.parties enable row level security;
alter table public.party_members enable row level security;
alter table public.party_sessions enable row level security;
alter table public.party_events enable row level security;
alter table public.party_commands enable row level security;
alter table public.party_votes enable row level security;
alter table public.reward_definitions enable row level security;
alter table public.reward_claims enable row level security;

create policy profiles_select_self_or_party
on public.profiles for select to authenticated
using (id = auth.uid() or private.shares_party_with_user(id));

create policy profiles_update_self
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy characters_select_own
on public.characters for select to authenticated
using (owner_id = auth.uid());

create policy characters_update_own
on public.characters for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy attributes_select_own
on public.character_attributes for select to authenticated
using (private.is_character_owner(character_id));

create policy inventory_select_own
on public.character_inventory for select to authenticated
using (private.is_character_owner(character_id));

create policy equipment_select_own
on public.character_equipment for select to authenticated
using (private.is_character_owner(character_id));

create policy quests_select_own
on public.character_quests for select to authenticated
using (private.is_character_owner(character_id));

create policy story_flags_select_own
on public.character_story_flags for select to authenticated
using (private.is_character_owner(character_id));

create policy relationships_select_own
on public.character_relationships for select to authenticated
using (private.is_character_owner(character_id));

create policy locations_select_own
on public.character_discovered_locations for select to authenticated
using (private.is_character_owner(character_id));

create policy chapter_completions_select_own
on public.character_chapter_completions for select to authenticated
using (private.is_character_owner(character_id));

create policy save_snapshots_select_own
on public.save_snapshots for select to authenticated
using (private.is_character_owner(character_id));

create policy save_commands_select_own
on public.save_commands for select to authenticated
using (private.is_character_owner(character_id));

create policy character_creation_requests_select_own
on public.character_creation_requests for select to authenticated
using (owner_id = auth.uid());

create policy parties_select_members
on public.parties for select to authenticated
using (private.is_party_member(id));

create policy party_members_select_party
on public.party_members for select to authenticated
using (private.is_party_member(party_id));

create policy party_sessions_select_party
on public.party_sessions for select to authenticated
using (private.is_party_member(party_id));

create policy party_events_select_party
on public.party_events for select to authenticated
using (private.is_session_member(session_id));

create policy party_commands_select_own
on public.party_commands for select to authenticated
using (private.is_session_member(session_id));

create policy party_votes_select_party
on public.party_votes for select to authenticated
using (private.is_session_member(session_id));

create policy reward_definitions_read_authenticated
on public.reward_definitions for select to authenticated
using (enabled);

create policy reward_claims_select_own
on public.reward_claims for select to authenticated
using (private.is_character_owner(character_id));

revoke all on public.profiles from anon, authenticated;
revoke all on public.characters from anon, authenticated;
revoke all on public.character_attributes from anon, authenticated;
revoke all on public.character_inventory from anon, authenticated;
revoke all on public.character_equipment from anon, authenticated;
revoke all on public.character_quests from anon, authenticated;
revoke all on public.character_story_flags from anon, authenticated;
revoke all on public.character_relationships from anon, authenticated;
revoke all on public.character_discovered_locations from anon, authenticated;
revoke all on public.character_chapter_completions from anon, authenticated;
revoke all on public.save_snapshots from anon, authenticated;
revoke all on public.save_commands from anon, authenticated;
revoke all on public.character_creation_requests from anon, authenticated;
revoke all on public.parties from anon, authenticated;
revoke all on public.party_members from anon, authenticated;
revoke all on public.party_sessions from anon, authenticated;
revoke all on public.party_events from anon, authenticated;
revoke all on public.party_commands from anon, authenticated;
revoke all on public.party_votes from anon, authenticated;
revoke all on public.reward_definitions from anon, authenticated;
revoke all on public.reward_claims from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, avatar_key, last_active_at) on public.profiles to authenticated;
grant select on public.characters to authenticated;
grant update (name, description, form_of_address, portrait_key, last_played_at, is_active) on public.characters to authenticated;
grant select on public.character_attributes to authenticated;
grant select on public.character_inventory to authenticated;
grant select on public.character_equipment to authenticated;
grant select on public.character_quests to authenticated;
grant select on public.character_story_flags to authenticated;
grant select on public.character_relationships to authenticated;
grant select on public.character_discovered_locations to authenticated;
grant select on public.character_chapter_completions to authenticated;
grant select on public.save_snapshots to authenticated;
grant select on public.save_commands to authenticated;
grant select on public.character_creation_requests to authenticated;
grant select on public.parties to authenticated;
grant select on public.party_members to authenticated;
grant select on public.party_sessions to authenticated;
grant select on public.party_events to authenticated;
grant select on public.party_commands to authenticated;
grant select on public.party_votes to authenticated;
grant select on public.reward_definitions to authenticated;
grant select on public.reward_claims to authenticated;

create or replace function public.create_character(
  p_name text,
  p_race_id text,
  p_class_id text,
  p_background_id text,
  p_portrait_key text,
  p_attributes jsonb,
  p_description text default null,
  p_form_of_address text default null,
  p_command_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  existing_character_id uuid;
  new_character_id uuid := gen_random_uuid();
  weapon_entry_id uuid;
  armor_entry_id uuid;
  base_strength integer;
  base_dexterity integer;
  base_constitution integer;
  base_intelligence integer;
  base_wisdom integer;
  base_charisma integer;
  final_strength integer;
  final_dexterity integer;
  final_constitution integer;
  final_intelligence integer;
  final_wisdom integer;
  final_charisma integer;
  point_cost integer;
  base_health integer;
  maximum_health integer;
  primary_attribute_value integer;
  resource_type text;
  resource_max integer;
  weapon_item_id text;
  armor_item_id text;
  background_item_id text;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if p_command_id is null then
    raise exception using errcode = '22023', message = 'INVALID_COMMAND_ID';
  end if;

  select character_id into existing_character_id
  from public.character_creation_requests
  where command_id = p_command_id
    and owner_id = caller_id;

  if existing_character_id is not null then
    return jsonb_build_object(
      'character_id', existing_character_id,
      'duplicate', true,
      'save_version', 1
    );
  end if;

  if exists (
    select 1 from public.character_creation_requests
    where command_id = p_command_id and owner_id <> caller_id
  ) then
    raise exception using errcode = '42501', message = 'COMMAND_ID_ALREADY_USED';
  end if;

  if p_name is null or char_length(btrim(p_name)) not between 2 and 32 then
    raise exception using errcode = '22023', message = 'INVALID_CHARACTER_NAME';
  end if;
  if p_description is not null and char_length(p_description) > 500 then
    raise exception using errcode = '22023', message = 'CHARACTER_DESCRIPTION_TOO_LONG';
  end if;
  if p_form_of_address is not null and char_length(p_form_of_address) > 40 then
    raise exception using errcode = '22023', message = 'FORM_OF_ADDRESS_TOO_LONG';
  end if;
  if p_race_id not in ('human', 'elf', 'dwarf', 'halfling', 'orc', 'dragonborn') then
    raise exception using errcode = '22023', message = 'INVALID_RACE';
  end if;
  if p_class_id not in ('fighter', 'mage', 'rogue', 'ranger', 'cleric', 'barbarian') then
    raise exception using errcode = '22023', message = 'INVALID_CLASS';
  end if;
  if p_background_id not in ('former-soldier', 'wandering-scholar', 'border-hunter', 'former-criminal', 'fallen-noble', 'temple-servant', 'road-orphan') then
    raise exception using errcode = '22023', message = 'INVALID_BACKGROUND';
  end if;
  if p_portrait_key is null or p_portrait_key not in (
    'portrait-human-01', 'portrait-human-02', 'portrait-human-03', 'portrait-human-04',
    'portrait-elf-01', 'portrait-elf-02', 'portrait-elf-03', 'portrait-elf-04',
    'portrait-dwarf-01', 'portrait-dwarf-02', 'portrait-dwarf-03', 'portrait-dwarf-04',
    'portrait-halfling-01', 'portrait-halfling-02', 'portrait-halfling-03', 'portrait-halfling-04',
    'portrait-orc-01', 'portrait-orc-02', 'portrait-orc-03', 'portrait-orc-04',
    'portrait-dragonborn-01', 'portrait-dragonborn-02', 'portrait-dragonborn-03', 'portrait-dragonborn-04'
  ) then
    raise exception using errcode = '22023', message = 'INVALID_PORTRAIT';
  end if;
  if p_attributes is null or jsonb_typeof(p_attributes) <> 'object' then
    raise exception using errcode = '22023', message = 'INVALID_ATTRIBUTES';
  end if;

  begin
    base_strength := (p_attributes ->> 'strength')::integer;
    base_dexterity := (p_attributes ->> 'dexterity')::integer;
    base_constitution := (p_attributes ->> 'constitution')::integer;
    base_intelligence := (p_attributes ->> 'intelligence')::integer;
    base_wisdom := (p_attributes ->> 'wisdom')::integer;
    base_charisma := (p_attributes ->> 'charisma')::integer;
  exception when others then
    raise exception using errcode = '22023', message = 'INVALID_ATTRIBUTES';
  end;

  if base_strength is null
    or base_dexterity is null
    or base_constitution is null
    or base_intelligence is null
    or base_wisdom is null
    or base_charisma is null
    or base_strength not between 8 and 15
    or base_dexterity not between 8 and 15
    or base_constitution not between 8 and 15
    or base_intelligence not between 8 and 15
    or base_wisdom not between 8 and 15
    or base_charisma not between 8 and 15 then
    raise exception using errcode = '22023', message = 'INVALID_ATTRIBUTES';
  end if;

  point_cost :=
    private.attribute_point_cost(base_strength) +
    private.attribute_point_cost(base_dexterity) +
    private.attribute_point_cost(base_constitution) +
    private.attribute_point_cost(base_intelligence) +
    private.attribute_point_cost(base_wisdom) +
    private.attribute_point_cost(base_charisma);

  if point_cost > 27 then
    raise exception using errcode = '22023', message = 'POINT_BUY_LIMIT_EXCEEDED';
  end if;

  final_strength := base_strength;
  final_dexterity := base_dexterity;
  final_constitution := base_constitution;
  final_intelligence := base_intelligence;
  final_wisdom := base_wisdom;
  final_charisma := base_charisma;

  case p_race_id
    when 'human' then
      final_constitution := final_constitution + 1;
      final_charisma := final_charisma + 1;
    when 'elf' then
      final_dexterity := final_dexterity + 2;
      final_wisdom := final_wisdom + 1;
    when 'dwarf' then
      final_constitution := final_constitution + 2;
      final_strength := final_strength + 1;
    when 'halfling' then
      final_dexterity := final_dexterity + 2;
      final_charisma := final_charisma + 1;
    when 'orc' then
      final_strength := final_strength + 2;
      final_constitution := final_constitution + 1;
    when 'dragonborn' then
      final_strength := final_strength + 1;
      final_charisma := final_charisma + 2;
  end case;

  case p_class_id
    when 'fighter' then
      base_health := 30; primary_attribute_value := final_strength; resource_type := 'stamina'; resource_max := 8; weapon_item_id := 'iron-longsword'; armor_item_id := 'chain-shirt';
    when 'mage' then
      base_health := 19; primary_attribute_value := final_intelligence; resource_type := 'mana'; resource_max := 12; weapon_item_id := 'ashwood-staff'; armor_item_id := 'traveler-robes';
    when 'rogue' then
      base_health := 22; primary_attribute_value := final_dexterity; resource_type := 'focus'; resource_max := 9; weapon_item_id := 'balanced-dagger'; armor_item_id := 'dark-leather';
    when 'ranger' then
      base_health := 24; primary_attribute_value := final_dexterity; resource_type := 'focus'; resource_max := 10; weapon_item_id := 'yew-bow'; armor_item_id := 'ranger-leathers';
    when 'cleric' then
      base_health := 25; primary_attribute_value := final_wisdom; resource_type := 'faith'; resource_max := 11; weapon_item_id := 'temple-mace'; armor_item_id := 'temple-mail';
    when 'barbarian' then
      base_health := 34; primary_attribute_value := final_strength; resource_type := 'rage'; resource_max := 7; weapon_item_id := 'two-handed-axe'; armor_item_id := 'hide-armor';
  end case;

  maximum_health := greatest(1, base_health + floor((final_constitution - 10) / 2.0)::integer);
  resource_max := resource_max + greatest(0, floor((primary_attribute_value - 10) / 2.0)::integer);
  if p_class_id = 'barbarian' then
    maximum_health := maximum_health + 3;
  elsif p_class_id = 'mage' then
    resource_max := resource_max + 2;
  elsif p_class_id = 'cleric' then
    resource_max := resource_max + 1;
  end if;

  case p_background_id
    when 'former-soldier' then background_item_id := 'soldier-rope';
    when 'wandering-scholar' then background_item_id := 'scholars-lens';
    when 'border-hunter' then background_item_id := 'hunting-trap';
    when 'former-criminal' then background_item_id := 'lockpick-set';
    when 'fallen-noble' then background_item_id := 'signet-ring';
    when 'temple-servant' then background_item_id := 'temple-incense';
    when 'road-orphan' then background_item_id := 'lucky-copper';
  end case;

  insert into public.characters (
    id, owner_id, name, description, form_of_address, race_id, class_id,
    background_id, portrait_key, current_health, maximum_health,
    primary_resource_type, primary_resource, maximum_primary_resource, gold
  ) values (
    new_character_id, caller_id, btrim(p_name), nullif(btrim(p_description), ''),
    nullif(btrim(p_form_of_address), ''), p_race_id, p_class_id,
    p_background_id, p_portrait_key, maximum_health, maximum_health,
    resource_type, resource_max, resource_max, 50
  );

  insert into public.character_attributes (
    character_id, strength, dexterity, constitution, intelligence, wisdom, charisma
  ) values (
    new_character_id, final_strength, final_dexterity, final_constitution,
    final_intelligence, final_wisdom, final_charisma
  );

  insert into public.character_inventory (
    character_id, item_id, quantity, durability, custom_data
  ) values (
    new_character_id, weapon_item_id, 1, 100, jsonb_build_object('starter_item', true)
  ) returning id into weapon_entry_id;

  insert into public.character_equipment (character_id, slot, inventory_entry_id)
  values (new_character_id, 'weapon', weapon_entry_id);

  insert into public.character_inventory (
    character_id, item_id, quantity, durability, custom_data
  ) values (
    new_character_id, armor_item_id, 1, 100, jsonb_build_object('starter_item', true)
  ) returning id into armor_entry_id;

  insert into public.character_equipment (character_id, slot, inventory_entry_id)
  values (new_character_id, 'armor', armor_entry_id);

  insert into public.character_inventory (character_id, item_id, quantity, custom_data)
  values
    (new_character_id, background_item_id, 1, jsonb_build_object('background_item', true)),
    (new_character_id, 'minor-healing-potion', 1, '{}'::jsonb);

  insert into public.character_quests (
    character_id, quest_id, status, current_stage, quest_data
  ) values (
    new_character_id,
    'shadows-beneath-village',
    'active',
    1,
    jsonb_build_object('objectives', jsonb_build_object('speak-to-headman', 'active'))
  );

  insert into public.character_discovered_locations (character_id, location_id, visited_at)
  values (new_character_id, 'village-gate', now());

  insert into public.character_creation_requests (command_id, owner_id, character_id)
  values (p_command_id, caller_id, new_character_id);

  return jsonb_build_object(
    'character_id', new_character_id,
    'duplicate', false,
    'save_version', 1
  );
end;
$$;

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
set search_path = public, private, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  current_character public.characters%rowtype;
  current_version integer;
  new_version integer;
  new_snapshot_id uuid;
  existing_snapshot_id uuid;
  existing_version integer;
  game_state jsonb;
  incoming_character jsonb;
  inventory_entry jsonb;
  equipment_entry record;
  quest_entry jsonb;
  flag_entry record;
  relationship_entry record;
  location_entry jsonb;
  inventory_entry_id uuid;
  equipment_inventory_id uuid;
  incoming_inventory_ids uuid[] := array[]::uuid[];
  incoming_quest_ids text[] := array[]::text[];
  item_id text;
  equipment_slot text;
  incoming_quest_id text;
  quest_status public.quest_status;
  completed_objectives integer;
  affected_rows integer;
  incoming_experience integer;
  authoritative_level smallint;
  incoming_current_health integer;
  incoming_maximum_health integer;
  incoming_primary_resource integer;
  incoming_maximum_resource integer;
  incoming_gold integer;
  incoming_reputation integer;
  incoming_playtime bigint;
  previous_playtime bigint := 0;
  acquired_at timestamptz;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if p_command_id is null then
    raise exception using errcode = '22023', message = 'INVALID_COMMAND_ID';
  end if;

  if exists (
    select 1 from public.save_commands
    where command_id = p_command_id
      and character_id <> p_character_id
  ) then
    raise exception using errcode = '23505', message = 'COMMAND_ID_ALREADY_USED';
  end if;

  select sc.snapshot_id, ss.save_version
  into existing_snapshot_id, existing_version
  from public.save_commands sc
  join public.save_snapshots ss on ss.id = sc.snapshot_id
  join public.characters c on c.id = sc.character_id
  where sc.command_id = p_command_id
    and sc.character_id = p_character_id
    and c.owner_id = caller_id;

  if existing_snapshot_id is not null then
    return jsonb_build_object(
      'snapshot_id', existing_snapshot_id,
      'save_version', existing_version,
      'duplicate', true
    );
  end if;

  if not private.is_character_owner(p_character_id, caller_id) then
    raise exception using errcode = '42501', message = 'CHARACTER_NOT_OWNED';
  end if;
  if p_save_reason not in ('autosave', 'checkpoint', 'combat_victory', 'level_up', 'chapter_complete', 'manual', 'migration') then
    raise exception using errcode = '22023', message = 'INVALID_SAVE_REASON';
  end if;
  if p_snapshot is null
    or jsonb_typeof(p_snapshot) <> 'object'
    or jsonb_typeof(p_snapshot -> 'game_state') <> 'object'
    or jsonb_typeof(p_snapshot -> 'game_state' -> 'character') <> 'object'
    or not (p_snapshot ? 'schema_version')
    or not (p_snapshot ? 'chapter_id')
    or not (p_snapshot ? 'current_location_id') then
    raise exception using errcode = '22023', message = 'INVALID_SAVE_PAYLOAD';
  end if;
  if pg_column_size(p_snapshot) > 1048576 then
    raise exception using errcode = '54000', message = 'SAVE_PAYLOAD_TOO_LARGE';
  end if;
  if coalesce(p_snapshot ->> 'schema_version', '') !~ '^[1-9][0-9]*$'
    or coalesce(p_snapshot ->> 'chapter_id', '') !~ '^[a-z0-9][a-z0-9_-]{1,95}$'
    or coalesce(p_snapshot ->> 'current_location_id', '') !~ '^[a-z0-9][a-z0-9_-]{1,95}$' then
    raise exception using errcode = '22023', message = 'INVALID_SAVE_PAYLOAD';
  end if;
  if coalesce(p_snapshot ->> 'character_id', '') <> p_character_id::text then
    raise exception using errcode = '22023', message = 'SAVE_CHARACTER_MISMATCH';
  end if;
  select * into current_character
  from public.characters
  where id = p_character_id and owner_id = caller_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'CHARACTER_NOT_OWNED';
  end if;

  current_version := current_character.save_version;

  if current_version <> p_expected_save_version then
    raise exception using
      errcode = '40001',
      message = 'SAVE_VERSION_CONFLICT',
      detail = jsonb_build_object('current_version', current_version)::text;
  end if;

  game_state := p_snapshot -> 'game_state';
  incoming_character := game_state -> 'character';

  if coalesce(incoming_character ->> 'id', '') <> p_character_id::text
    or coalesce(incoming_character ->> 'ownerId', '') <> caller_id::text
    or coalesce(incoming_character ->> 'raceId', '') <> current_character.race_id
    or coalesce(incoming_character ->> 'classId', '') <> current_character.class_id
    or coalesce(incoming_character ->> 'backgroundId', '') <> current_character.background_id
    or coalesce(incoming_character ->> 'portraitKey', '') <> current_character.portrait_key
    or coalesce(incoming_character ->> 'chapterId', '') <> p_snapshot ->> 'chapter_id'
    or coalesce(incoming_character ->> 'currentLocationId', '') <> p_snapshot ->> 'current_location_id'
    or coalesce(game_state #>> '{story,currentLocationId}', '') <> p_snapshot ->> 'current_location_id' then
    raise exception using errcode = '22023', message = 'SAVE_CHARACTER_MISMATCH';
  end if;

  if jsonb_typeof(incoming_character -> 'attributes') <> 'object'
    or (incoming_character #>> '{attributes,strength}')::integer <> (select strength from public.character_attributes where character_id = p_character_id)
    or (incoming_character #>> '{attributes,dexterity}')::integer <> (select dexterity from public.character_attributes where character_id = p_character_id)
    or (incoming_character #>> '{attributes,constitution}')::integer <> (select constitution from public.character_attributes where character_id = p_character_id)
    or (incoming_character #>> '{attributes,intelligence}')::integer <> (select intelligence from public.character_attributes where character_id = p_character_id)
    or (incoming_character #>> '{attributes,wisdom}')::integer <> (select wisdom from public.character_attributes where character_id = p_character_id)
    or (incoming_character #>> '{attributes,charisma}')::integer <> (select charisma from public.character_attributes where character_id = p_character_id) then
    raise exception using errcode = '22023', message = 'IMMUTABLE_CHARACTER_DATA_CHANGED';
  end if;

  begin
    incoming_experience := (incoming_character ->> 'experience')::integer;
    incoming_current_health := (incoming_character ->> 'currentHealth')::integer;
    incoming_maximum_health := (incoming_character #>> '{derivedStats,maximumHealth}')::integer;
    incoming_primary_resource := (incoming_character ->> 'primaryResource')::integer;
    incoming_maximum_resource := (incoming_character #>> '{derivedStats,maximumPrimaryResource}')::integer;
    incoming_gold := (incoming_character ->> 'gold')::integer;
    incoming_reputation := (incoming_character ->> 'reputation')::integer;
    incoming_playtime := (game_state ->> 'playtimeSeconds')::bigint;
  exception when others then
    raise exception using errcode = '22023', message = 'INVALID_SAVE_PROGRESS';
  end;

  if incoming_experience not between 0 and 1000000
    or incoming_current_health < 0
    or incoming_maximum_health not between 1 and 500
    or incoming_current_health > incoming_maximum_health
    or incoming_primary_resource < 0
    or incoming_maximum_resource not between 0 and 250
    or incoming_primary_resource > incoming_maximum_resource
    or incoming_gold not between 0 and 1000000
    or incoming_reputation not between -100 and 100
    or incoming_reputation <> (game_state #>> '{story,reputation}')::integer
    or incoming_playtime not between 0 and 315360000 then
    raise exception using errcode = '22023', message = 'INVALID_SAVE_PROGRESS';
  end if;

  select coalesce(
    case
      when coalesce(snapshot #>> '{game_state,playtimeSeconds}', '') ~ '^[0-9]+$'
        then (snapshot #>> '{game_state,playtimeSeconds}')::bigint
      else 0
    end,
    0
  )
  into previous_playtime
  from public.save_snapshots
  where character_id = p_character_id
  order by save_version desc
  limit 1;
  previous_playtime := coalesce(previous_playtime, 0);
  if incoming_playtime < previous_playtime or incoming_playtime - previous_playtime > 21600 then
    raise exception using errcode = '22023', message = 'INVALID_PLAYTIME_DELTA';
  end if;

  if jsonb_typeof(game_state -> 'inventory') <> 'array'
    or jsonb_array_length(game_state -> 'inventory') > 100
    or jsonb_typeof(game_state -> 'equipment') <> 'object'
    or jsonb_typeof(game_state -> 'quests') <> 'array'
    or jsonb_array_length(game_state -> 'quests') > 32
    or jsonb_typeof(game_state #> '{story,flags}') <> 'object'
    or (select count(*) > 256 from jsonb_object_keys(game_state #> '{story,flags}'))
    or jsonb_typeof(game_state #> '{story,relationships}') <> 'object'
    or (select count(*) > 32 from jsonb_object_keys(game_state #> '{story,relationships}'))
    or jsonb_typeof(game_state -> 'discoveredLocationIds') <> 'array'
    or jsonb_array_length(game_state -> 'discoveredLocationIds') > 64 then
    raise exception using errcode = '22023', message = 'INVALID_SAVE_COLLECTIONS';
  end if;

  authoritative_level := private.level_for_experience(incoming_experience);
  p_snapshot := jsonb_set(p_snapshot, '{game_state,character,level}', to_jsonb(authoritative_level), true);

  update public.characters
  set level = authoritative_level,
      experience = incoming_experience,
      current_health = incoming_current_health,
      maximum_health = incoming_maximum_health,
      primary_resource = incoming_primary_resource,
      maximum_primary_resource = incoming_maximum_resource,
      gold = incoming_gold,
      reputation = incoming_reputation,
      current_location_id = p_snapshot ->> 'current_location_id',
      chapter_id = p_snapshot ->> 'chapter_id',
      last_played_at = now()
  where id = p_character_id;

  for inventory_entry in
    select value from jsonb_array_elements(game_state -> 'inventory')
  loop
    if jsonb_typeof(inventory_entry) <> 'object'
      or coalesce(inventory_entry ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or jsonb_typeof(inventory_entry -> 'customData') <> 'object' then
      raise exception using errcode = '22023', message = 'INVALID_INVENTORY_ENTRY';
    end if;
    inventory_entry_id := (inventory_entry ->> 'id')::uuid;
    item_id := inventory_entry ->> 'itemId';
    if item_id not in (
      'iron-longsword', 'chain-shirt', 'ashwood-staff', 'traveler-robes',
      'balanced-dagger', 'dark-leather', 'yew-bow', 'ranger-leathers',
      'temple-mace', 'temple-mail', 'two-handed-axe', 'hide-armor',
      'soldier-rope', 'scholars-lens', 'hunting-trap', 'lockpick-set',
      'signet-ring', 'temple-incense', 'lucky-copper', 'village-torch',
      'minor-healing-potion', 'healers-salve', 'miners-pick', 'foreman-journal',
      'cult-medallion', 'black-crystal', 'rune-breaker-hammer', 'fogglass-ring',
      'first-crown-shard', 'guardian-core'
    )
      or coalesce(inventory_entry ->> 'quantity', '') !~ '^[1-9][0-9]*$'
      or (inventory_entry ->> 'quantity')::integer > 99
      or (
        inventory_entry -> 'durability' <> 'null'::jsonb
        and (
          coalesce(inventory_entry ->> 'durability', '') !~ '^[0-9]+([.][0-9]+)?$'
          or (inventory_entry ->> 'durability')::numeric not between 0 and 100
        )
      ) then
      raise exception using errcode = '22023', message = 'INVALID_INVENTORY_ENTRY';
    end if;
    begin
      acquired_at := (inventory_entry ->> 'acquiredAt')::timestamptz;
    exception when others then
      raise exception using errcode = '22023', message = 'INVALID_INVENTORY_ENTRY';
    end;
    if acquired_at > now() + interval '5 minutes' then
      raise exception using errcode = '22023', message = 'INVALID_INVENTORY_ENTRY';
    end if;
    incoming_inventory_ids := array_append(incoming_inventory_ids, inventory_entry_id);
    insert into public.character_inventory (
      id, character_id, item_id, quantity, durability, custom_data, acquired_at
    ) values (
      inventory_entry_id,
      p_character_id,
      item_id,
      (inventory_entry ->> 'quantity')::integer,
      case when inventory_entry -> 'durability' = 'null'::jsonb then null else (inventory_entry ->> 'durability')::smallint end,
      (inventory_entry -> 'customData') - 'reward_key' - 'scope_key' - 'party_last_use_command_id'
        - 'party_last_use_target_character_id' - 'party_health_after' - 'party_resource_after'
        - 'party_health_restored' - 'party_resource_restored' - 'party_consumed',
      acquired_at
    )
    on conflict (id) do update
    set item_id = excluded.item_id,
        quantity = excluded.quantity,
        durability = excluded.durability,
        custom_data = excluded.custom_data || jsonb_strip_nulls(jsonb_build_object(
          'reward_key', public.character_inventory.custom_data -> 'reward_key',
          'scope_key', public.character_inventory.custom_data -> 'scope_key',
          'party_last_use_command_id', public.character_inventory.custom_data -> 'party_last_use_command_id',
          'party_last_use_target_character_id', public.character_inventory.custom_data -> 'party_last_use_target_character_id',
          'party_health_after', public.character_inventory.custom_data -> 'party_health_after',
          'party_resource_after', public.character_inventory.custom_data -> 'party_resource_after',
          'party_health_restored', public.character_inventory.custom_data -> 'party_health_restored',
          'party_resource_restored', public.character_inventory.custom_data -> 'party_resource_restored',
          'party_consumed', public.character_inventory.custom_data -> 'party_consumed'
        )),
        acquired_at = least(public.character_inventory.acquired_at, excluded.acquired_at)
    where public.character_inventory.character_id = p_character_id;
    get diagnostics affected_rows = row_count;
    if affected_rows <> 1 then
      raise exception using errcode = '42501', message = 'INVENTORY_ENTRY_NOT_OWNED';
    end if;
  end loop;

  if cardinality(incoming_inventory_ids) <> cardinality(array(select distinct unnest(incoming_inventory_ids))) then
    raise exception using errcode = '22023', message = 'DUPLICATE_INVENTORY_ENTRY';
  end if;

  delete from public.character_inventory
  where character_id = p_character_id
    and not (id = any(incoming_inventory_ids));

  delete from public.character_equipment where character_id = p_character_id;
  for equipment_entry in select key, value from jsonb_each_text(game_state -> 'equipment')
  loop
    equipment_slot := case equipment_entry.key when 'offhand' then 'off_hand' else equipment_entry.key end;
    if equipment_slot not in ('weapon', 'off_hand', 'armor', 'helmet', 'gloves', 'boots', 'ring', 'amulet')
      or equipment_entry.value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception using errcode = '22023', message = 'INVALID_EQUIPMENT_ENTRY';
    end if;
    equipment_inventory_id := equipment_entry.value::uuid;
    if not (equipment_inventory_id = any(incoming_inventory_ids)) then
      raise exception using errcode = '22023', message = 'EQUIPMENT_ITEM_NOT_IN_INVENTORY';
    end if;
    insert into public.character_equipment (character_id, slot, inventory_entry_id)
    values (p_character_id, equipment_slot, equipment_inventory_id);
  end loop;

  for quest_entry in select value from jsonb_array_elements(game_state -> 'quests')
  loop
    if jsonb_typeof(quest_entry) <> 'object'
      or jsonb_typeof(quest_entry -> 'objectives') <> 'object'
      or (select count(*) > 24 from jsonb_object_keys(quest_entry -> 'objectives')) then
      raise exception using errcode = '22023', message = 'INVALID_QUEST_STATE';
    end if;
    incoming_quest_id := quest_entry ->> 'questId';
    if incoming_quest_id not in ('shadows-beneath-village', 'the-wet-ravens-secret') then
      raise exception using errcode = '22023', message = 'INVALID_QUEST_STATE';
    end if;
    if quest_entry ->> 'status' in ('active', 'completed', 'failed') then
      quest_status := (quest_entry ->> 'status')::public.quest_status;
      incoming_quest_ids := array_append(incoming_quest_ids, incoming_quest_id);
      select count(*)::integer into completed_objectives
      from jsonb_each_text(quest_entry -> 'objectives') objective
      where objective.value = 'completed';
      insert into public.character_quests (
        character_id, quest_id, status, current_stage, started_at, completed_at, quest_data
      ) values (
        p_character_id,
        incoming_quest_id,
        quest_status,
        completed_objectives,
        coalesce(nullif(quest_entry ->> 'startedAt', '')::timestamptz, now()),
        case
          when quest_status = 'completed' then coalesce(nullif(quest_entry ->> 'completedAt', '')::timestamptz, now())
          else null
        end,
        jsonb_build_object(
          'objectives', quest_entry -> 'objectives',
          'reward_claimed', coalesce((quest_entry ->> 'rewardClaimed')::boolean, false)
        )
      )
      on conflict (character_id, quest_id) do update
      set status = excluded.status,
          current_stage = excluded.current_stage,
          started_at = excluded.started_at,
          completed_at = excluded.completed_at,
          quest_data = excluded.quest_data;
    end if;
  end loop;
  delete from public.character_quests persisted_quest
  where persisted_quest.character_id = p_character_id
    and not (persisted_quest.quest_id = any(incoming_quest_ids));

  delete from public.character_story_flags where character_id = p_character_id;
  for flag_entry in select key, value from jsonb_each(game_state #> '{story,flags}')
  loop
    if flag_entry.key !~ '^[a-z0-9][a-z0-9_.-]{1,127}$'
      or jsonb_typeof(flag_entry.value) not in ('boolean', 'string', 'number') then
      raise exception using errcode = '22023', message = 'INVALID_STORY_FLAG';
    end if;
    insert into public.character_story_flags (character_id, flag_key, value)
    values (p_character_id, flag_entry.key, flag_entry.value);
  end loop;

  delete from public.character_relationships where character_id = p_character_id;
  for relationship_entry in select key, value from jsonb_each(game_state #> '{story,relationships}')
  loop
    if relationship_entry.key !~ '^[a-z0-9][a-z0-9_-]{1,95}$'
      or jsonb_typeof(relationship_entry.value) <> 'object'
      or coalesce(relationship_entry.value ->> 'npcId', '') <> relationship_entry.key
      or (relationship_entry.value ->> 'trust')::integer not between -100 and 100
      or (relationship_entry.value ->> 'respect')::integer not between -100 and 100
      or (relationship_entry.value ->> 'fear')::integer not between -100 and 100 then
      raise exception using errcode = '22023', message = 'INVALID_RELATIONSHIP_STATE';
    end if;
    insert into public.character_relationships (character_id, npc_id, trust, respect, fear)
    values (
      p_character_id,
      relationship_entry.key,
      (relationship_entry.value ->> 'trust')::integer,
      (relationship_entry.value ->> 'respect')::integer,
      (relationship_entry.value ->> 'fear')::integer
    );
  end loop;

  for location_entry in select value from jsonb_array_elements(game_state -> 'discoveredLocationIds')
  loop
    if jsonb_typeof(location_entry) <> 'string'
      or trim(both '"' from location_entry::text) !~ '^[a-z0-9][a-z0-9_-]{1,95}$' then
      raise exception using errcode = '22023', message = 'INVALID_DISCOVERED_LOCATION';
    end if;
    insert into public.character_discovered_locations (character_id, location_id, visited_at)
    values (p_character_id, trim(both '"' from location_entry::text), now())
    on conflict (character_id, location_id) do update
    set visited_at = coalesce(public.character_discovered_locations.visited_at, excluded.visited_at);
  end loop;

  new_version := current_version + 1;
  insert into public.save_snapshots (
    character_id, save_version, snapshot, save_reason
  ) values (
    p_character_id,
    new_version,
    p_snapshot || jsonb_build_object('save_version', new_version),
    p_save_reason
  ) returning id into new_snapshot_id;

  insert into public.save_commands (command_id, character_id, snapshot_id)
  values (p_command_id, p_character_id, new_snapshot_id);

  update public.characters
  set save_version = new_version,
      last_played_at = now()
  where id = p_character_id;

  update public.profiles
  set highest_character_level = greatest(highest_character_level, authoritative_level),
      total_playtime_seconds = coalesce((
        select sum(latest.playtime_seconds)
        from (
          select distinct on (ss.character_id)
            ss.character_id,
            case
              when coalesce(ss.snapshot #>> '{game_state,playtimeSeconds}', '') ~ '^[0-9]+$'
                then (ss.snapshot #>> '{game_state,playtimeSeconds}')::bigint
              else 0
            end as playtime_seconds
          from public.save_snapshots ss
          join public.characters owned on owned.id = ss.character_id
          where owned.owner_id = caller_id
          order by ss.character_id, ss.save_version desc
        ) latest
      ), 0),
      last_active_at = now()
  where id = caller_id;

  return jsonb_build_object(
    'snapshot_id', new_snapshot_id,
    'save_version', new_version,
    'duplicate', false
  );
end;
$$;

create or replace function public.get_latest_character_save(p_character_id uuid)
returns table (
  snapshot_id uuid,
  save_version integer,
  snapshot jsonb,
  save_reason text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not private.is_character_owner(p_character_id) then
    raise exception using errcode = '42501', message = 'CHARACTER_NOT_OWNED';
  end if;

  return query
  select ss.id, ss.save_version, ss.snapshot, ss.save_reason, ss.created_at
  from public.save_snapshots ss
  where ss.character_id = p_character_id
  order by ss.save_version desc
  limit 1;
end;
$$;

revoke all on function public.create_character(text, text, text, text, text, jsonb, text, text, uuid) from public, anon;
grant execute on function public.create_character(text, text, text, text, text, jsonb, text, text, uuid) to authenticated;
revoke all on function public.save_character_snapshot(uuid, uuid, integer, jsonb, text) from public, anon;
grant execute on function public.save_character_snapshot(uuid, uuid, integer, jsonb, text) to authenticated;
revoke all on function public.get_latest_character_save(uuid) from public, anon;
grant execute on function public.get_latest_character_save(uuid) to authenticated;

create or replace function public.create_party(
  p_leader_character_id uuid,
  p_name text,
  p_maximum_members integer default 4
)
returns table (party_id uuid, room_code text)
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  new_party_id uuid := gen_random_uuid();
  generated_code text;
  attempts integer := 0;
begin
  if not private.is_character_owner(p_leader_character_id) then
    raise exception using errcode = '42501', message = 'CHARACTER_NOT_OWNED';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 2 and 40 then
    raise exception using errcode = '22023', message = 'INVALID_PARTY_NAME';
  end if;
  if p_maximum_members is null or p_maximum_members not between 2 and 4 then
    raise exception using errcode = '22023', message = 'INVALID_PARTY_SIZE';
  end if;
  if exists (
    select 1 from public.party_members
    where character_id = p_leader_character_id and left_at is null
  ) then
    raise exception using errcode = '23505', message = 'CHARACTER_ALREADY_IN_PARTY';
  end if;

  loop
    attempts := attempts + 1;
    generated_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 6));
    exit when not exists (select 1 from public.parties where parties.room_code = generated_code);
    if attempts >= 12 then
      raise exception using errcode = '55000', message = 'ROOM_CODE_GENERATION_FAILED';
    end if;
  end loop;

  insert into public.parties (
    id, leader_character_id, room_code, name, maximum_members
  ) values (
    new_party_id, p_leader_character_id, generated_code, btrim(p_name), p_maximum_members
  );

  insert into public.party_members (party_id, character_id, role)
  values (new_party_id, p_leader_character_id, 'leader');

  party_id := new_party_id;
  room_code := generated_code;
  return next;
end;
$$;

create or replace function public.join_party_by_code(
  p_character_id uuid,
  p_room_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  target_party public.parties%rowtype;
  existing_party_id uuid;
  active_members integer;
begin
  if not private.is_character_owner(p_character_id) then
    raise exception using errcode = '42501', message = 'CHARACTER_NOT_OWNED';
  end if;
  if p_room_code is null or upper(btrim(p_room_code)) !~ '^[A-Z0-9]{6}$' then
    raise exception using errcode = '22023', message = 'INVALID_ROOM_CODE';
  end if;

  select * into target_party
  from public.parties
  where room_code = upper(btrim(p_room_code))
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'PARTY_NOT_FOUND';
  end if;

  select party_id into existing_party_id
  from public.party_members
  where character_id = p_character_id and left_at is null;

  if existing_party_id is not null then
    if existing_party_id = target_party.id then
      return jsonb_build_object('party_id', target_party.id, 'duplicate', true);
    end if;
    raise exception using errcode = '23505', message = 'CHARACTER_ALREADY_IN_PARTY';
  end if;

  if target_party.status <> 'open' then
    raise exception using errcode = '55000', message = 'PARTY_NOT_OPEN';
  end if;

  select count(*)::integer into active_members
  from public.party_members
  where party_id = target_party.id and left_at is null;

  if active_members >= target_party.maximum_members then
    raise exception using errcode = '54000', message = 'PARTY_FULL';
  end if;

  insert into public.party_members (
    party_id, character_id, role, joined_at, left_at, ready_state, connection_state, last_seen_at
  ) values (
    target_party.id, p_character_id, 'member', now(), null, false, 'connected', now()
  )
  on conflict (party_id, character_id) do update
  set role = 'member',
      joined_at = now(),
      left_at = null,
      ready_state = false,
      connection_state = 'connected',
      last_seen_at = now();

  return jsonb_build_object('party_id', target_party.id, 'duplicate', false);
end;
$$;

create or replace function public.set_party_ready(
  p_party_id uuid,
  p_character_id uuid,
  p_ready boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not private.is_character_owner(p_character_id) then
    raise exception using errcode = '42501', message = 'CHARACTER_NOT_OWNED';
  end if;
  if p_ready is null then
    raise exception using errcode = '22023', message = 'INVALID_READY_STATE';
  end if;
  if not exists (
    select 1 from public.parties where id = p_party_id and status = 'open'
  ) then
    raise exception using errcode = '55000', message = 'PARTY_NOT_OPEN';
  end if;

  update public.party_members
  set ready_state = p_ready,
      connection_state = 'connected',
      last_seen_at = now()
  where party_id = p_party_id
    and character_id = p_character_id
    and left_at is null;

  if not found then
    raise exception using errcode = '42501', message = 'NOT_A_PARTY_MEMBER';
  end if;

  return jsonb_build_object('party_id', p_party_id, 'character_id', p_character_id, 'ready', p_ready);
end;
$$;

create or replace function public.start_party_session(
  p_party_id uuid,
  p_chapter_id text default 'shadows-beneath-mistvale'
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  target_party public.parties%rowtype;
  active_members integer;
  unready_members integer;
  existing_session_id uuid;
  new_session_id uuid := gen_random_uuid();
begin
  if not private.is_party_leader(p_party_id) then
    raise exception using errcode = '42501', message = 'LEADER_REQUIRED';
  end if;
  if p_chapter_id is null or p_chapter_id !~ '^[a-z0-9][a-z0-9_-]{1,95}$' then
    raise exception using errcode = '22023', message = 'INVALID_CHAPTER';
  end if;

  select * into target_party
  from public.parties
  where id = p_party_id
  for update;

  if target_party.status = 'active' then
    select id into existing_session_id
    from public.party_sessions
    where party_id = p_party_id and status in ('forming', 'active')
    order by created_at desc
    limit 1;
    if existing_session_id is not null then
      return jsonb_build_object('session_id', existing_session_id, 'duplicate', true);
    end if;
  end if;
  if target_party.status <> 'open' then
    raise exception using errcode = '55000', message = 'PARTY_NOT_OPEN';
  end if;

  select count(*)::integer,
         count(*) filter (where not ready_state)::integer
  into active_members, unready_members
  from public.party_members
  where party_id = p_party_id and left_at is null;

  if active_members < 2 then
    raise exception using errcode = '55000', message = 'PARTY_REQUIRES_TWO_MEMBERS';
  end if;
  if unready_members > 0 then
    raise exception using errcode = '55000', message = 'PARTY_NOT_READY';
  end if;

  insert into public.party_sessions (
    id, party_id, chapter_id, session_state, current_scene_id, status
  ) values (
    new_session_id,
    p_party_id,
    p_chapter_id,
    jsonb_build_object(
      'narrative', jsonb_build_object('decision_state', 'idle'),
      'combat', jsonb_build_object('active', false),
      'shared_loot', jsonb_build_object(),
      'current_location_id', 'village-gate',
      'phase', 'narrative',
      'started_at', now()
    ),
    'arrival',
    'active'
  );

  update public.parties set status = 'active' where id = p_party_id;
  perform private.append_party_event(
    new_session_id,
    'SESSION_STARTED',
    jsonb_build_object('chapter_id', p_chapter_id, 'scene_id', 'arrival'),
    target_party.leader_character_id
  );

  return jsonb_build_object('session_id', new_session_id, 'duplicate', false, 'version', 1);
end;
$$;

create or replace function public.leave_party(
  p_party_id uuid,
  p_character_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  target_party public.parties%rowtype;
  other_members integer;
begin
  if not private.is_character_owner(p_character_id) then
    raise exception using errcode = '42501', message = 'CHARACTER_NOT_OWNED';
  end if;

  select * into target_party from public.parties where id = p_party_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'PARTY_NOT_FOUND';
  end if;
  if not exists (
    select 1 from public.party_members
    where party_id = p_party_id and character_id = p_character_id and left_at is null
  ) then
    return jsonb_build_object('party_id', p_party_id, 'duplicate', true);
  end if;

  select count(*)::integer into other_members
  from public.party_members
  where party_id = p_party_id and character_id <> p_character_id and left_at is null;

  if target_party.leader_character_id = p_character_id and other_members > 0 then
    raise exception using errcode = '55000', message = 'TRANSFER_LEADERSHIP_BEFORE_LEAVING';
  end if;
  if exists (
    select 1 from public.party_sessions
    where party_id = p_party_id
      and status = 'active'
      and coalesce((session_state #>> '{combat,active}')::boolean, false)
  ) then
    raise exception using errcode = '55000', message = 'PARTY_COMBAT_ACTIVE';
  end if;

  update public.party_members
  set left_at = now(), ready_state = false, connection_state = 'disconnected', last_seen_at = now()
  where party_id = p_party_id and character_id = p_character_id;

  if other_members = 0 then
    update public.parties set status = 'closed', closed_at = now() where id = p_party_id;
    update public.party_sessions
    set status = 'abandoned', completed_at = now()
    where party_id = p_party_id and status in ('forming', 'active');
  end if;

  return jsonb_build_object('party_id', p_party_id, 'left', true, 'closed', other_members = 0);
end;
$$;

create or replace function public.remove_party_member(
  p_party_id uuid,
  p_character_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  leader_character uuid;
begin
  if not private.is_party_leader(p_party_id) then
    raise exception using errcode = '42501', message = 'LEADER_REQUIRED';
  end if;
  select leader_character_id into leader_character from public.parties where id = p_party_id for update;
  if leader_character = p_character_id then
    raise exception using errcode = '22023', message = 'LEADER_CANNOT_REMOVE_SELF';
  end if;
  if exists (
    select 1 from public.party_sessions
    where party_id = p_party_id
      and status = 'active'
      and coalesce((session_state #>> '{combat,active}')::boolean, false)
  ) then
    raise exception using errcode = '55000', message = 'PARTY_COMBAT_ACTIVE';
  end if;

  update public.party_members
  set left_at = now(), ready_state = false, connection_state = 'disconnected', last_seen_at = now()
  where party_id = p_party_id and character_id = p_character_id and left_at is null;

  if not found then
    return jsonb_build_object('party_id', p_party_id, 'removed', false, 'duplicate', true);
  end if;
  return jsonb_build_object('party_id', p_party_id, 'removed', true, 'duplicate', false);
end;
$$;

create or replace function public.transfer_party_leadership(
  p_party_id uuid,
  p_new_leader_character_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  previous_leader uuid;
begin
  if not private.is_party_leader(p_party_id) then
    raise exception using errcode = '42501', message = 'LEADER_REQUIRED';
  end if;
  if not exists (
    select 1 from public.party_members
    where party_id = p_party_id
      and character_id = p_new_leader_character_id
      and left_at is null
  ) then
    raise exception using errcode = '22023', message = 'NEW_LEADER_NOT_IN_PARTY';
  end if;
  if exists (
    select 1 from public.party_sessions
    where party_id = p_party_id
      and status = 'active'
      and coalesce((session_state #>> '{combat,active}')::boolean, false)
  ) then
    raise exception using errcode = '55000', message = 'PARTY_COMBAT_ACTIVE';
  end if;

  select leader_character_id into previous_leader
  from public.parties where id = p_party_id for update;

  if previous_leader = p_new_leader_character_id then
    return jsonb_build_object('party_id', p_party_id, 'duplicate', true);
  end if;

  update public.parties
  set leader_character_id = p_new_leader_character_id
  where id = p_party_id;
  update public.party_members
  set role = case when character_id = p_new_leader_character_id then 'leader' else 'member' end
  where party_id = p_party_id and left_at is null;

  return jsonb_build_object(
    'party_id', p_party_id,
    'previous_leader_character_id', previous_leader,
    'leader_character_id', p_new_leader_character_id,
    'duplicate', false
  );
end;
$$;

create or replace function public.close_party(p_party_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  target_party public.parties%rowtype;
begin
  select * into target_party
  from public.parties
  where id = p_party_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'PARTY_NOT_FOUND';
  end if;
  if not private.is_character_owner(target_party.leader_character_id) then
    raise exception using errcode = '42501', message = 'LEADER_REQUIRED';
  end if;
  if target_party.status = 'closed' then
    return jsonb_build_object('party_id', p_party_id, 'closed', true, 'duplicate', true);
  end if;

  update public.parties
  set status = 'closed', closed_at = now()
  where id = p_party_id;

  update public.party_members
  set left_at = coalesce(left_at, now()), ready_state = false, connection_state = 'disconnected'
  where party_id = p_party_id;
  update public.party_sessions
  set status = 'abandoned', completed_at = now()
  where party_id = p_party_id and status in ('forming', 'active');

  return jsonb_build_object('party_id', p_party_id, 'closed', true, 'duplicate', false);
end;
$$;

create or replace function public.update_party_connection(
  p_party_id uuid,
  p_character_id uuid,
  p_connection_state text
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not private.is_character_owner(p_character_id) then
    raise exception using errcode = '42501', message = 'CHARACTER_NOT_OWNED';
  end if;
  if p_connection_state not in ('connected', 'reconnecting', 'disconnected') then
    raise exception using errcode = '22023', message = 'INVALID_CONNECTION_STATE';
  end if;

  update public.party_members
  set connection_state = p_connection_state, last_seen_at = now()
  where party_id = p_party_id and character_id = p_character_id and left_at is null;
  if not found then
    raise exception using errcode = '42501', message = 'NOT_A_PARTY_MEMBER';
  end if;
end;
$$;

create or replace function public.get_party_roster(p_party_id uuid)
returns table (
  character_id uuid,
  display_name text,
  character_name text,
  portrait_key text,
  class_id text,
  level smallint,
  current_health integer,
  maximum_health integer,
  member_role text,
  ready_state boolean,
  connection_state text,
  last_seen_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not private.is_party_member(p_party_id) then
    raise exception using errcode = '42501', message = 'NOT_A_PARTY_MEMBER';
  end if;

  return query
  select c.id, p.display_name, c.name, c.portrait_key, c.class_id, c.level,
         c.current_health, c.maximum_health, pm.role, pm.ready_state,
         pm.connection_state, pm.last_seen_at
  from public.party_members pm
  join public.characters c on c.id = pm.character_id
  join public.profiles p on p.id = c.owner_id
  where pm.party_id = p_party_id and pm.left_at is null
  order by (pm.role = 'leader') desc, pm.joined_at;
end;
$$;

create or replace function public.get_active_party_session(p_character_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
declare
  result jsonb;
begin
  if not private.is_character_owner(p_character_id) then
    raise exception using errcode = '42501', message = 'CHARACTER_NOT_OWNED';
  end if;

  select jsonb_build_object(
    'party_id', p.id,
    'party_name', p.name,
    'room_code', p.room_code,
    'session_id', ps.id,
    'chapter_id', ps.chapter_id,
    'current_scene_id', ps.current_scene_id,
    'current_turn', ps.current_turn,
    'session_state', ps.session_state,
    'status', ps.status,
    'version', ps.version,
    'updated_at', ps.updated_at
  ) into result
  from public.party_members pm
  join public.parties p on p.id = pm.party_id
  join public.party_sessions ps on ps.party_id = p.id and ps.status in ('forming', 'active')
  where pm.character_id = p_character_id and pm.left_at is null
  order by ps.created_at desc
  limit 1;

  return result;
end;
$$;

revoke all on function public.create_party(uuid, text, integer) from public, anon;
grant execute on function public.create_party(uuid, text, integer) to authenticated;
revoke all on function public.join_party_by_code(uuid, text) from public, anon;
grant execute on function public.join_party_by_code(uuid, text) to authenticated;
revoke all on function public.set_party_ready(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_party_ready(uuid, uuid, boolean) to authenticated;
revoke all on function public.start_party_session(uuid, text) from public, anon;
grant execute on function public.start_party_session(uuid, text) to authenticated;
revoke all on function public.leave_party(uuid, uuid) from public, anon;
grant execute on function public.leave_party(uuid, uuid) to authenticated;
revoke all on function public.remove_party_member(uuid, uuid) from public, anon;
grant execute on function public.remove_party_member(uuid, uuid) to authenticated;
revoke all on function public.transfer_party_leadership(uuid, uuid) from public, anon;
grant execute on function public.transfer_party_leadership(uuid, uuid) to authenticated;
revoke all on function public.close_party(uuid) from public, anon;
grant execute on function public.close_party(uuid) to authenticated;
revoke all on function public.update_party_connection(uuid, uuid, text) from public, anon;
grant execute on function public.update_party_connection(uuid, uuid, text) to authenticated;
revoke all on function public.get_party_roster(uuid) from public, anon;
grant execute on function public.get_party_roster(uuid) to authenticated;
revoke all on function public.get_active_party_session(uuid) from public, anon;
grant execute on function public.get_active_party_session(uuid) to authenticated;

create or replace function public.submit_party_command(
  p_command_id uuid,
  p_session_id uuid,
  p_character_id uuid,
  p_expected_session_version bigint,
  p_command_type text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  target_session public.party_sessions%rowtype;
  existing_command public.party_commands%rowtype;
  inventory_entry uuid;
  next_version bigint;
  command_server_seed bigint;
  pending_started_at timestamptz;
  stale_command_id uuid;
  authored_encounter_id text;
  expected_reward_key text;
  expected_reward_scope text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if p_command_id is null
    or p_session_id is null
    or p_character_id is null
    or p_expected_session_version is null
    or p_expected_session_version < 1 then
    raise exception using errcode = '22023', message = 'INVALID_COMMAND_ENVELOPE';
  end if;
  if not private.is_character_owner(p_character_id) then
    raise exception using errcode = '42501', message = 'CHARACTER_NOT_OWNED';
  end if;
  p_payload := coalesce(p_payload, '{}'::jsonb);
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'INVALID_COMMAND_PAYLOAD';
  end if;
  if pg_column_size(p_payload) > 65536 then
    raise exception using errcode = '54000', message = 'COMMAND_PAYLOAD_TOO_LARGE';
  end if;

  select * into existing_command
  from public.party_commands
  where command_id = p_command_id;

  if found then
    if existing_command.session_id <> p_session_id
      or existing_command.character_id <> p_character_id
      or existing_command.command_type <> p_command_type
      or existing_command.expected_session_version <> p_expected_session_version
      or existing_command.payload <> p_payload then
      raise exception using errcode = '42501', message = 'COMMAND_ID_ALREADY_USED';
    end if;
    return jsonb_build_object(
      'command_id', existing_command.command_id,
      'status', existing_command.status,
      'result', existing_command.result,
      'duplicate', true,
      'server_seed', existing_command.server_seed,
      'session_version', (
        select version from public.party_sessions where id = existing_command.session_id
      )
    );
  end if;

  select * into target_session
  from public.party_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'SESSION_NOT_FOUND';
  end if;
  if target_session.status <> 'active' then
    raise exception using errcode = '55000', message = 'SESSION_NOT_ACTIVE';
  end if;
  if not private.is_party_member(target_session.party_id) then
    raise exception using errcode = '42501', message = 'NOT_A_PARTY_MEMBER';
  end if;
  if not exists (
    select 1 from public.party_members
    where party_id = target_session.party_id
      and character_id = p_character_id
      and left_at is null
  ) then
    raise exception using errcode = '42501', message = 'CHARACTER_NOT_IN_SESSION';
  end if;
  if target_session.version <> p_expected_session_version then
    raise exception using
      errcode = '40001',
      message = 'SESSION_VERSION_CONFLICT',
      detail = jsonb_build_object('current_version', target_session.version)::text;
  end if;
  if p_command_type not in (
    'SUBMIT_DIALOGUE_VOTE', 'RESOLVE_INTERACTION', 'RESOLVE_SKILL_CHECK', 'MOVE_TO_LOCATION', 'BEGIN_ENCOUNTER',
    'SUBMIT_COMBAT_ACTION', 'USE_ITEM', 'CLAIM_LOOT', 'COMPLETE_SCENE'
  ) then
    raise exception using errcode = '22023', message = 'UNKNOWN_COMMAND_TYPE';
  end if;
  command_server_seed := private.secure_game_seed();

  if p_command_type = 'SUBMIT_DIALOGUE_VOTE' then
    if coalesce(p_payload ->> 'scene_id', '') <> target_session.current_scene_id
      or coalesce(p_payload ->> 'decision_id', '') !~ '^[a-z0-9][a-z0-9_-]{1,95}$'
      or coalesce(p_payload ->> 'choice_id', '') !~ '^[a-z0-9][a-z0-9_-]{1,95}$' then
      raise exception using errcode = '22023', message = 'INVALID_DIALOGUE_VOTE';
    end if;

    insert into public.party_votes (
      session_id, scene_id, decision_id, character_id, choice_id
    ) values (
      p_session_id,
      p_payload ->> 'scene_id',
      p_payload ->> 'decision_id',
      p_character_id,
      p_payload ->> 'choice_id'
    )
    on conflict (session_id, scene_id, decision_id, character_id) do update
    set choice_id = excluded.choice_id,
        updated_at = now();

    next_version := target_session.version + 1;
    insert into public.party_commands (
      command_id, session_id, character_id, command_type,
      expected_session_version, server_seed, payload, status, result, processed_at
    ) values (
      p_command_id, p_session_id, p_character_id, p_command_type,
      p_expected_session_version, command_server_seed, p_payload, 'accepted',
      jsonb_build_object('vote_recorded', true), now()
    );

    update public.party_sessions
    set version = next_version,
        session_state = jsonb_set(
          session_state,
          '{narrative,last_vote_command_id}',
          to_jsonb(p_command_id::text),
          true
        )
    where id = p_session_id;

    perform private.append_party_event(
      p_session_id,
      'DIALOGUE_VOTE_SUBMITTED',
      jsonb_build_object(
        'decision_id', p_payload ->> 'decision_id',
        'choice_id', p_payload ->> 'choice_id',
        'command_id', p_command_id
      ),
      p_character_id
    );

    return jsonb_build_object(
      'command_id', p_command_id,
      'status', 'accepted',
      'duplicate', false,
      'server_seed', command_server_seed,
      'session_version', next_version
    );
  end if;

  if target_session.session_state ? 'pending_command_id' then
    begin
      pending_started_at := (target_session.session_state ->> 'pending_command_started_at')::timestamptz;
    exception when others then
      pending_started_at := null;
    end;
    if pending_started_at is not null
      and pending_started_at > now() - interval '45 seconds' then
      raise exception using errcode = '55000', message = 'SESSION_COMMAND_PENDING';
    end if;

    begin
      stale_command_id := (target_session.session_state ->> 'pending_command_id')::uuid;
    exception when others then
      stale_command_id := null;
    end;
    if stale_command_id is not null then
      update public.party_commands
      set status = 'rejected',
          result = jsonb_build_object('code', 'COMMAND_LEASE_EXPIRED'),
          processed_at = now()
      where command_id = stale_command_id and status = 'pending';
    end if;
    target_session.session_state := target_session.session_state
      - 'pending_command_id' - 'pending_command_started_at';
    update public.party_sessions
    set session_state = target_session.session_state
    where id = target_session.id;
    perform private.append_party_event(
      target_session.id,
      'COMMAND_LEASE_RECOVERED',
      jsonb_build_object('expired_command_id', stale_command_id),
      p_character_id
    );
  end if;

  if p_command_type in ('MOVE_TO_LOCATION', 'BEGIN_ENCOUNTER', 'COMPLETE_SCENE')
    and not private.is_party_leader(target_session.party_id) then
    raise exception using errcode = '42501', message = 'LEADER_REQUIRED';
  end if;

  case p_command_type
    when 'RESOLVE_INTERACTION' then
      if coalesce(p_payload ->> 'interaction_id', '') !~ '^[a-z0-9][a-z0-9_-]{1,95}$' then
        raise exception using errcode = '22023', message = 'INVALID_INTERACTION';
      end if;
    when 'RESOLVE_SKILL_CHECK' then
      if coalesce(p_payload ->> 'interaction_id', '') !~ '^[a-z0-9][a-z0-9_-]{1,95}$' then
        raise exception using errcode = '22023', message = 'INVALID_SKILL_CHECK';
      end if;
    when 'MOVE_TO_LOCATION' then
      if coalesce(p_payload ->> 'location_id', '') !~ '^[a-z0-9][a-z0-9_-]{1,95}$' then
        raise exception using errcode = '22023', message = 'INVALID_LOCATION';
      end if;
    when 'BEGIN_ENCOUNTER' then
      if coalesce(p_payload ->> 'encounter_id', '') not in (
        'corrupted_cave_rat', 'mist_crawler_ambush', 'ancient_stone_guardian'
      ) then
        raise exception using errcode = '22023', message = 'INVALID_ENCOUNTER';
      end if;
      if coalesce((target_session.session_state #>> '{combat,active}')::boolean, false) then
        raise exception using errcode = '55000', message = 'COMBAT_ALREADY_ACTIVE';
      end if;
      if coalesce(target_session.session_state #>> '{combat,outcome}', '') = 'victory' then
        raise exception using errcode = '55000', message = 'ENCOUNTER_ALREADY_COMPLETED';
      end if;
      if coalesce(target_session.session_state #>> '{combat,outcome}', '') = 'defeat'
        and coalesce(target_session.session_state #>> '{combat,encounter_id}', '') <> (p_payload ->> 'encounter_id') then
        raise exception using errcode = '22023', message = 'INVALID_CHECKPOINT_ENCOUNTER';
      end if;
    when 'SUBMIT_COMBAT_ACTION' then
      if not coalesce((target_session.session_state #>> '{combat,active}')::boolean, false) then
        raise exception using errcode = '55000', message = 'COMBAT_NOT_ACTIVE';
      end if;
      if coalesce(target_session.session_state #>> '{combat,active_character_id}', '') <> p_character_id::text then
        raise exception using errcode = '42501', message = 'ACTION_OUT_OF_TURN';
      end if;
      if coalesce(p_payload ->> 'ability_id', '') !~ '^[a-z0-9][a-z0-9_-]{1,95}$'
        or coalesce(p_payload ->> 'target_id', '') !~ '^[a-z0-9][a-z0-9_-]{1,95}$' then
        raise exception using errcode = '22023', message = 'INVALID_COMBAT_ACTION';
      end if;
    when 'USE_ITEM' then
      begin
        inventory_entry := (p_payload ->> 'inventory_entry_id')::uuid;
      exception when others then
        raise exception using errcode = '22023', message = 'INVALID_INVENTORY_ENTRY';
      end;
      if not exists (
        select 1 from public.character_inventory
        where id = inventory_entry
          and character_id = p_character_id
          and quantity > 0
      ) then
        raise exception using errcode = '22023', message = 'ITEM_NOT_AVAILABLE';
      end if;
    when 'CLAIM_LOOT' then
      if p_payload <> '{}'::jsonb then
        raise exception using errcode = '22023', message = 'CLIENT_REWARD_SELECTION_FORBIDDEN';
      end if;
      authored_encounter_id := target_session.session_state #>> '{combat,authored_encounter_id}';
      expected_reward_key := case authored_encounter_id
        when 'tutorial-rat' then 'opening.tutorial_combat'
        when 'stone-guardian-boss' then 'opening.stone_guardian_victory'
        else null
      end;
      expected_reward_scope := 'encounter:' || p_session_id::text || ':' || coalesce(authored_encounter_id, '');
      if expected_reward_key is null
        or coalesce(target_session.session_state #>> '{combat,outcome}', '') <> 'victory'
        or coalesce(target_session.session_state #>> '{combat,available_reward_key}', '') <> expected_reward_key
        or coalesce(target_session.session_state -> 'shared_loot', '{}'::jsonb) ? expected_reward_scope then
        raise exception using errcode = '22023', message = 'LOOT_NOT_AVAILABLE';
      end if;
    when 'COMPLETE_SCENE' then
      if coalesce(p_payload ->> 'scene_id', '') <> target_session.current_scene_id then
        raise exception using errcode = '22023', message = 'SCENE_MISMATCH';
      end if;
    else
      null;
  end case;

  next_version := target_session.version + 1;
  insert into public.party_commands (
    command_id, session_id, character_id, command_type,
    expected_session_version, server_seed, payload, status
  ) values (
    p_command_id, p_session_id, p_character_id, p_command_type,
    p_expected_session_version, command_server_seed, p_payload, 'pending'
  );

  update public.party_sessions
  set version = next_version,
      session_state = jsonb_set(
        jsonb_set(
          session_state,
          '{pending_command_id}',
          to_jsonb(p_command_id::text),
          true
        ),
        '{pending_command_started_at}',
        to_jsonb(now()),
        true
      )
  where id = p_session_id;

  perform private.append_party_event(
    p_session_id,
    'COMMAND_SUBMITTED',
    jsonb_build_object('command_id', p_command_id, 'command_type', p_command_type),
    p_character_id
  );

  return jsonb_build_object(
    'command_id', p_command_id,
    'status', 'pending',
    'duplicate', false,
    'server_seed', command_server_seed,
    'session_version', next_version
  );
end;
$$;

create or replace function public.apply_party_command_result(
  p_command_id uuid,
  p_expected_session_version bigint,
  p_success boolean,
  p_result jsonb,
  p_state_patch jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  target_command public.party_commands%rowtype;
  target_session public.party_sessions%rowtype;
  next_version bigint;
  next_scene_id text;
  next_turn integer;
  next_status public.session_status;
  persisted_patch jsonb;
  combatant_entry record;
  combat_character_id uuid;
  combat_health integer;
  combat_resource integer;
  item_use jsonb;
  item_inventory_id uuid;
  item_owner_character_id uuid;
  item_target_character_id uuid;
  item_quantity_before integer;
  item_quantity_after integer;
  item_health_before integer;
  item_health_after integer;
  item_resource_before integer;
  item_resource_after integer;
  affected_rows integer;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'TRUSTED_SERVER_REQUIRED';
  end if;
  p_result := coalesce(p_result, '{}'::jsonb);
  p_state_patch := coalesce(p_state_patch, '{}'::jsonb);
  if jsonb_typeof(p_result) <> 'object'
    or jsonb_typeof(p_state_patch) <> 'object' then
    raise exception using errcode = '22023', message = 'INVALID_COMMAND_RESULT';
  end if;

  select * into target_command
  from public.party_commands
  where command_id = p_command_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMMAND_NOT_FOUND';
  end if;
  if target_command.status <> 'pending' then
    return jsonb_build_object(
      'command_id', p_command_id,
      'status', target_command.status,
      'result', target_command.result,
      'duplicate', true
    );
  end if;

  select * into target_session
  from public.party_sessions
  where id = target_command.session_id
  for update;
  if target_session.version <> p_expected_session_version then
    raise exception using
      errcode = '40001',
      message = 'SESSION_VERSION_CONFLICT',
      detail = jsonb_build_object('current_version', target_session.version)::text;
  end if;
  if coalesce(target_session.session_state ->> 'pending_command_id', '') <> p_command_id::text then
    raise exception using errcode = '55000', message = 'PENDING_COMMAND_MISMATCH';
  end if;

  next_scene_id := coalesce(nullif(p_state_patch ->> 'current_scene_id', ''), target_session.current_scene_id);
  if next_scene_id !~ '^[a-z0-9][a-z0-9_-]{1,95}$' then
    raise exception using errcode = '22023', message = 'INVALID_NEXT_SCENE';
  end if;
  begin
    next_turn := coalesce((p_state_patch ->> 'current_turn')::integer, target_session.current_turn);
  exception when others then
    raise exception using errcode = '22023', message = 'INVALID_NEXT_TURN';
  end;
  if next_turn < 0 then
    raise exception using errcode = '22023', message = 'INVALID_NEXT_TURN';
  end if;
  begin
    next_status := coalesce((p_state_patch ->> 'session_status')::public.session_status, target_session.status);
  exception when others then
    raise exception using errcode = '22023', message = 'INVALID_SESSION_STATUS';
  end;

  persisted_patch := p_state_patch
    - 'current_scene_id'
    - 'current_turn'
    - 'session_status'
    - 'authoritative_item_use';
  next_version := target_session.version + 1;

  item_use := p_state_patch -> 'authoritative_item_use';
  if p_success and target_command.command_type = 'USE_ITEM' then
    if jsonb_typeof(item_use) <> 'object'
      or coalesce(item_use ->> 'inventory_entry_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(item_use ->> 'owner_character_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(item_use ->> 'target_character_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(item_use ->> 'quantity_before', '') !~ '^[0-9]+$'
      or coalesce(item_use ->> 'quantity_after', '') !~ '^[0-9]+$'
      or coalesce(item_use ->> 'health_before', '') !~ '^[0-9]+$'
      or coalesce(item_use ->> 'health_after', '') !~ '^[0-9]+$'
      or coalesce(item_use ->> 'resource_before', '') !~ '^[0-9]+$'
      or coalesce(item_use ->> 'resource_after', '') !~ '^[0-9]+$' then
      raise exception using errcode = '22023', message = 'INVALID_ITEM_MUTATION';
    end if;

    item_inventory_id := (item_use ->> 'inventory_entry_id')::uuid;
    item_owner_character_id := (item_use ->> 'owner_character_id')::uuid;
    item_target_character_id := (item_use ->> 'target_character_id')::uuid;
    item_quantity_before := (item_use ->> 'quantity_before')::integer;
    item_quantity_after := (item_use ->> 'quantity_after')::integer;
    item_health_before := (item_use ->> 'health_before')::integer;
    item_health_after := (item_use ->> 'health_after')::integer;
    item_resource_before := (item_use ->> 'resource_before')::integer;
    item_resource_after := (item_use ->> 'resource_after')::integer;

    if item_owner_character_id <> target_command.character_id
      or item_quantity_before < 1
      or item_quantity_after not between 0 and item_quantity_before then
      raise exception using errcode = '22023', message = 'INVALID_ITEM_MUTATION';
    end if;

    if item_quantity_after = 0 then
      delete from public.character_inventory inventory
      where inventory.id = item_inventory_id
        and inventory.character_id = item_owner_character_id
        and inventory.quantity = item_quantity_before;
    else
      update public.character_inventory inventory
      set quantity = item_quantity_after
      where inventory.id = item_inventory_id
        and inventory.character_id = item_owner_character_id
        and inventory.quantity = item_quantity_before;
    end if;
    get diagnostics affected_rows = row_count;
    if affected_rows <> 1 then
      raise exception using errcode = '40001', message = 'ITEM_STATE_CONFLICT';
    end if;

    update public.characters character
    set current_health = item_health_after,
        primary_resource = item_resource_after,
        last_played_at = now()
    where character.id = item_target_character_id
      and character.current_health = item_health_before
      and character.primary_resource = item_resource_before
      and item_health_after <= character.maximum_health
      and item_resource_after <= character.maximum_primary_resource
      and exists (
        select 1 from public.party_members member
        where member.party_id = target_session.party_id
          and member.character_id = character.id
          and member.left_at is null
      );
    get diagnostics affected_rows = row_count;
    if affected_rows <> 1 then
      raise exception using errcode = '40001', message = 'ITEM_TARGET_STATE_CONFLICT';
    end if;
  elsif item_use is not null then
    raise exception using errcode = '22023', message = 'UNEXPECTED_ITEM_MUTATION';
  end if;

  -- Player vitals travel in the validated combat state patch and are written
  -- in the same transaction as the command receipt and session version. This
  -- prevents an accepted turn from being visible with stale character health.
  if p_success
    and jsonb_typeof(p_state_patch #> '{combat,state,combatants}') = 'object'
    and coalesce(p_state_patch #>> '{combat,state,phase}', '') <> 'defeat' then
    for combatant_entry in
      select key, value from jsonb_each(p_state_patch #> '{combat,state,combatants}')
    loop
      if combatant_entry.value ->> 'kind' = 'player' then
        if coalesce(combatant_entry.value ->> 'characterId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          or coalesce(combatant_entry.value ->> 'currentHealth', '') !~ '^[0-9]+$'
          or coalesce(combatant_entry.value ->> 'currentResource', '') !~ '^[0-9]+$' then
          raise exception using errcode = '22023', message = 'INVALID_COMBAT_VITALS';
        end if;
        combat_character_id := (combatant_entry.value ->> 'characterId')::uuid;
        combat_health := (combatant_entry.value ->> 'currentHealth')::integer;
        combat_resource := (combatant_entry.value ->> 'currentResource')::integer;
        update public.characters character
        set current_health = combat_health,
            primary_resource = combat_resource,
            last_played_at = now()
        where character.id = combat_character_id
          and combat_health <= character.maximum_health
          and combat_resource <= character.maximum_primary_resource
          and exists (
            select 1 from public.party_members member
            where member.party_id = target_session.party_id
              and member.character_id = character.id
              and member.left_at is null
          );
        get diagnostics affected_rows = row_count;
        if affected_rows <> 1 then
          raise exception using errcode = '22023', message = 'INVALID_COMBAT_VITALS';
        end if;
      end if;
    end loop;
  end if;

  update public.party_commands
  set status = case when p_success then 'accepted' else 'rejected' end,
      result = coalesce(p_result, '{}'::jsonb),
      processed_at = now()
  where command_id = p_command_id;

  update public.party_sessions
  set version = next_version,
      current_scene_id = next_scene_id,
      current_turn = next_turn,
      status = next_status,
      completed_at = case when next_status = 'completed' then now() else completed_at end,
      session_state = (
        session_state - 'pending_command_id' - 'pending_command_started_at'
      ) || persisted_patch
  where id = target_session.id;

  perform private.append_party_event(
    target_session.id,
    case when p_success then 'COMMAND_RESOLVED' else 'COMMAND_REJECTED' end,
    jsonb_build_object(
      'command_id', p_command_id,
      'command_type', target_command.command_type,
      'result', coalesce(p_result, '{}'::jsonb)
    ),
    target_command.character_id
  );

  return jsonb_build_object(
    'command_id', p_command_id,
    'status', case when p_success then 'accepted' else 'rejected' end,
    'result', coalesce(p_result, '{}'::jsonb),
    'session_version', next_version,
    'duplicate', false
  );
end;
$$;

create or replace function public.resolve_party_vote(
  p_session_id uuid,
  p_scene_id text,
  p_decision_id text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
declare
  target_party_id uuid;
  leader_character_id uuid;
  leader_choice text;
  winning_choice text;
  winning_votes integer;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'TRUSTED_SERVER_REQUIRED';
  end if;

  select ps.party_id, p.leader_character_id
  into target_party_id, leader_character_id
  from public.party_sessions ps
  join public.parties p on p.id = ps.party_id
  where ps.id = p_session_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'SESSION_NOT_FOUND';
  end if;

  select choice_id into leader_choice
  from public.party_votes
  where session_id = p_session_id
    and scene_id = p_scene_id
    and decision_id = p_decision_id
    and character_id = leader_character_id;

  select votes.choice_id, votes.vote_count
  into winning_choice, winning_votes
  from (
    select pv.choice_id,
           count(*)::integer as vote_count,
           bool_or(pv.choice_id = leader_choice) as is_leader_choice
    from public.party_votes pv
    where pv.session_id = p_session_id
      and pv.scene_id = p_scene_id
      and pv.decision_id = p_decision_id
    group by pv.choice_id
  ) votes
  order by votes.vote_count desc, votes.is_leader_choice desc, votes.choice_id
  limit 1;

  if winning_choice is null then
    raise exception using errcode = '55000', message = 'NO_VOTES_SUBMITTED';
  end if;

  return jsonb_build_object(
    'choice_id', winning_choice,
    'votes', winning_votes,
    'leader_broke_tie', winning_choice = leader_choice
  );
end;
$$;

create or replace function public.grant_character_reward(
  p_idempotency_key uuid,
  p_character_id uuid,
  p_reward_key text,
  p_scope_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  reward public.reward_definitions%rowtype;
  existing_claim public.reward_claims%rowtype;
  item_entry_id uuid;
  old_level smallint;
  new_level smallint;
  new_experience integer;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'TRUSTED_SERVER_REQUIRED';
  end if;
  if p_idempotency_key is null
    or p_character_id is null
    or p_reward_key is null
    or p_scope_key is null
    or char_length(p_scope_key) not between 1 and 160 then
    raise exception using errcode = '22023', message = 'INVALID_REWARD_REQUEST';
  end if;

  -- Serialize retries by idempotency key so concurrent network retries return
  -- the original claim instead of surfacing a unique-constraint race.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_idempotency_key::text, 0)
  );

  select * into existing_claim
  from public.reward_claims
  where idempotency_key = p_idempotency_key;

  if found then
    if existing_claim.character_id <> p_character_id
      or existing_claim.reward_key <> p_reward_key
      or existing_claim.scope_key <> p_scope_key then
      raise exception using errcode = '23505', message = 'IDEMPOTENCY_KEY_ALREADY_USED';
    end if;
    return jsonb_build_object(
      'claim_id', existing_claim.id,
      'duplicate', true,
      'gold', existing_claim.granted_gold,
      'experience', existing_claim.granted_experience,
      'inventory_entry_id', existing_claim.granted_item_entry_id
    );
  end if;

  select * into existing_claim
  from public.reward_claims
  where character_id = p_character_id
    and reward_key = p_reward_key
    and scope_key = p_scope_key;

  if found then
    return jsonb_build_object(
      'claim_id', existing_claim.id,
      'duplicate', true,
      'gold', existing_claim.granted_gold,
      'experience', existing_claim.granted_experience,
      'inventory_entry_id', existing_claim.granted_item_entry_id
    );
  end if;

  select * into reward
  from public.reward_definitions
  where reward_key = p_reward_key and enabled;
  if not found then
    raise exception using errcode = 'P0002', message = 'REWARD_NOT_FOUND';
  end if;

  select level, experience + reward.experience
  into old_level, new_experience
  from public.characters
  where id = p_character_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'CHARACTER_NOT_FOUND';
  end if;

  new_level := private.level_for_experience(new_experience);
  if reward.item_id is not null then
    if reward.item_id in (
      'signet-ring', 'lucky-copper', 'foreman-journal', 'cult-medallion',
      'rune-breaker-hammer', 'fogglass-ring', 'first-crown-shard', 'guardian-core'
    ) then
      insert into public.character_inventory (
        character_id, item_id, quantity, custom_data
      ) values (
        p_character_id,
        reward.item_id,
        1,
        jsonb_build_object('reward_key', p_reward_key, 'scope_key', p_scope_key)
      )
      on conflict (character_id, item_id) where item_id in (
        'signet-ring', 'lucky-copper', 'foreman-journal', 'cult-medallion',
        'rune-breaker-hammer', 'fogglass-ring', 'first-crown-shard', 'guardian-core'
      ) do update
      set custom_data = public.character_inventory.custom_data || excluded.custom_data
      returning id into item_entry_id;
    else
      insert into public.character_inventory (
        character_id, item_id, quantity, custom_data
      ) values (
        p_character_id,
        reward.item_id,
        reward.item_quantity,
        jsonb_build_object('reward_key', p_reward_key, 'scope_key', p_scope_key)
      ) returning id into item_entry_id;
    end if;
  end if;

  update public.characters
  set gold = gold + reward.gold,
      experience = new_experience,
      level = new_level,
      maximum_health = maximum_health + greatest(0, new_level - old_level) * 6,
      current_health = current_health + greatest(0, new_level - old_level) * 6,
      maximum_primary_resource = maximum_primary_resource + greatest(0, new_level - old_level) * 2,
      primary_resource = primary_resource + greatest(0, new_level - old_level) * 2,
      last_played_at = now()
  where id = p_character_id;

  insert into public.reward_claims (
    idempotency_key, character_id, reward_key, scope_key,
    granted_item_entry_id, granted_gold, granted_experience
  ) values (
    p_idempotency_key, p_character_id, p_reward_key, p_scope_key,
    item_entry_id, reward.gold, reward.experience
  ) returning * into existing_claim;

  return jsonb_build_object(
    'claim_id', existing_claim.id,
    'duplicate', false,
    'gold', reward.gold,
    'experience', reward.experience,
    'inventory_entry_id', item_entry_id,
    'previous_level', old_level,
    'level', new_level
  );
end;
$$;

create or replace function public.resolve_party_loot_claim(
  p_command_id uuid,
  p_expected_session_version bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  target_command public.party_commands%rowtype;
  target_session public.party_sessions%rowtype;
  authored_encounter_id text;
  reward_key text;
  scope_key text;
  grant_result jsonb;
  command_result jsonb;
  shared_loot jsonb;
  next_version bigint;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'TRUSTED_SERVER_REQUIRED';
  end if;

  select * into target_command
  from public.party_commands
  where command_id = p_command_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMMAND_NOT_FOUND';
  end if;
  if target_command.command_type <> 'CLAIM_LOOT' then
    raise exception using errcode = '22023', message = 'INVALID_LOOT_COMMAND';
  end if;
  if target_command.status <> 'pending' then
    return jsonb_build_object(
      'command_id', target_command.command_id,
      'status', target_command.status,
      'result', coalesce(target_command.result, '{}'::jsonb),
      'duplicate', true,
      'server_seed', target_command.server_seed,
      'session_version', (
        select version from public.party_sessions where id = target_command.session_id
      )
    );
  end if;

  select * into target_session
  from public.party_sessions
  where id = target_command.session_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'SESSION_NOT_FOUND';
  end if;
  if target_session.version <> p_expected_session_version then
    raise exception using
      errcode = '40001',
      message = 'SESSION_VERSION_CONFLICT',
      detail = jsonb_build_object('current_version', target_session.version)::text;
  end if;
  if coalesce(target_session.session_state ->> 'pending_command_id', '') <> p_command_id::text then
    raise exception using errcode = '55000', message = 'PENDING_COMMAND_MISMATCH';
  end if;

  authored_encounter_id := target_session.session_state #>> '{combat,authored_encounter_id}';
  reward_key := case authored_encounter_id
    when 'tutorial-rat' then 'opening.tutorial_combat'
    when 'stone-guardian-boss' then 'opening.stone_guardian_victory'
    else null
  end;
  scope_key := 'encounter:' || target_session.id::text || ':' || coalesce(authored_encounter_id, '');
  shared_loot := coalesce(target_session.session_state -> 'shared_loot', '{}'::jsonb);

  if reward_key is null
    or coalesce(target_session.session_state #>> '{combat,outcome}', '') <> 'victory'
    or coalesce(target_session.session_state #>> '{combat,available_reward_key}', '') <> reward_key
    or shared_loot ? scope_key then
    raise exception using errcode = '22023', message = 'LOOT_NOT_AVAILABLE';
  end if;

  grant_result := public.grant_character_reward(
    p_command_id,
    target_command.character_id,
    reward_key,
    scope_key
  );
  command_result := jsonb_build_object(
    'reward_key', reward_key,
    'scope_key', scope_key,
    'character_id', target_command.character_id,
    'grant', grant_result
  );
  shared_loot := jsonb_set(
    shared_loot,
    array[scope_key],
    jsonb_build_object(
      'reward_key', reward_key,
      'character_id', target_command.character_id,
      'command_id', p_command_id,
      'claimed_at', now()
    ),
    true
  );
  next_version := target_session.version + 1;

  update public.party_commands
  set status = 'accepted',
      result = command_result,
      processed_at = now()
  where command_id = p_command_id;

  update public.party_sessions
  set version = next_version,
      session_state = jsonb_set(
        session_state - 'pending_command_id' - 'pending_command_started_at',
        '{shared_loot}',
        shared_loot,
        true
      )
  where id = target_session.id;

  perform private.append_party_event(
    target_session.id,
    'LOOT_CLAIMED',
    command_result,
    target_command.character_id
  );

  return jsonb_build_object(
    'command_id', p_command_id,
    'status', 'accepted',
    'result', command_result,
    'duplicate', false,
    'server_seed', target_command.server_seed,
    'session_version', next_version
  );
end;
$$;

revoke all on function public.submit_party_command(uuid, uuid, uuid, bigint, text, jsonb) from public, anon;
grant execute on function public.submit_party_command(uuid, uuid, uuid, bigint, text, jsonb) to authenticated;
revoke all on function public.apply_party_command_result(uuid, bigint, boolean, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.apply_party_command_result(uuid, bigint, boolean, jsonb, jsonb) to service_role;
revoke all on function public.resolve_party_vote(uuid, text, text) from public, anon, authenticated;
grant execute on function public.resolve_party_vote(uuid, text, text) to service_role;
revoke all on function public.grant_character_reward(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.grant_character_reward(uuid, uuid, text, text) to service_role;
revoke all on function public.resolve_party_loot_claim(uuid, bigint) from public, anon, authenticated;
grant execute on function public.resolve_party_loot_claim(uuid, bigint) to service_role;

create or replace function public.complete_character_chapter(
  p_idempotency_key uuid,
  p_character_id uuid,
  p_chapter_id text,
  p_reward_key text,
  p_completion_summary jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  was_inserted boolean;
  reward_result jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'TRUSTED_SERVER_REQUIRED';
  end if;
  if p_chapter_id !~ '^[a-z0-9][a-z0-9_-]{1,95}$'
    or jsonb_typeof(coalesce(p_completion_summary, '{}'::jsonb)) <> 'object' then
    raise exception using errcode = '22023', message = 'INVALID_CHAPTER_COMPLETION';
  end if;

  insert into public.character_chapter_completions (
    character_id, chapter_id, completion_summary
  ) values (
    p_character_id, p_chapter_id, coalesce(p_completion_summary, '{}'::jsonb)
  )
  on conflict (character_id, chapter_id) do nothing;
  was_inserted := found;

  reward_result := public.grant_character_reward(
    p_idempotency_key,
    p_character_id,
    p_reward_key,
    'chapter:' || p_chapter_id
  );

  return reward_result || jsonb_build_object(
    'chapter_id', p_chapter_id,
    'chapter_completion_created', was_inserted
  );
end;
$$;

revoke all on function public.complete_character_chapter(uuid, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_character_chapter(uuid, uuid, text, text, jsonb) to service_role;

alter table public.parties replica identity full;
alter table public.party_members replica identity full;
alter table public.party_sessions replica identity full;
alter table public.party_events replica identity full;
alter table public.party_commands replica identity full;
alter table public.party_votes replica identity full;

do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array[
      'parties', 'party_members', 'party_sessions',
      'party_events', 'party_commands', 'party_votes'
    ] loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end;
$$;

comment on schema private is 'Security-definer helpers; not exposed as a public application API.';
comment on table public.party_commands is 'Idempotent client commands. Trusted server processing applies authoritative state transitions.';
comment on function public.apply_party_command_result(uuid, bigint, boolean, jsonb, jsonb) is 'Service-role-only authoritative command resolution with optimistic locking.';
comment on function public.grant_character_reward(uuid, uuid, text, text) is 'Service-role-only idempotent persistent reward grant.';

commit;
