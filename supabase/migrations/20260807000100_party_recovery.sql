-- Party recovery patch:
-- - make dialogue votes safe when several players vote from the same version;
-- - allow every member, including the leader, to leave without a deadlock;
-- - ignore departed or stale members when resolving narrative votes;
-- - release all memberships that were trapped before this patch.

begin;

create or replace function public.submit_party_dialogue_vote(
  p_command_id uuid,
  p_session_id uuid,
  p_character_id uuid,
  p_scene_id text,
  p_decision_id text,
  p_choice_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  target_session public.party_sessions%rowtype;
  existing_command public.party_commands%rowtype;
  command_payload jsonb;
  command_server_seed bigint;
  next_version bigint;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if p_command_id is null or p_session_id is null or p_character_id is null then
    raise exception using errcode = '22023', message = 'INVALID_COMMAND_ENVELOPE';
  end if;
  if p_scene_id !~ '^[a-z0-9][a-z0-9_-]{1,95}$'
    or p_decision_id !~ '^[a-z0-9][a-z0-9_-]{1,95}$'
    or p_choice_id !~ '^[a-z0-9][a-z0-9_-]{1,95}$' then
    raise exception using errcode = '22023', message = 'INVALID_DIALOGUE_VOTE';
  end if;
  if not private.is_character_owner(p_character_id) then
    raise exception using errcode = '42501', message = 'CHARACTER_NOT_OWNED';
  end if;

  command_payload := jsonb_build_object(
    'scene_id', p_scene_id,
    'decision_id', p_decision_id,
    'choice_id', p_choice_id
  );

  select * into existing_command
  from public.party_commands
  where command_id = p_command_id;

  if found then
    if existing_command.session_id <> p_session_id
      or existing_command.character_id <> p_character_id
      or existing_command.command_type <> 'SUBMIT_DIALOGUE_VOTE'
      or existing_command.payload <> command_payload then
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
  if target_session.current_scene_id <> p_scene_id then
    raise exception using errcode = '22023', message = 'INVALID_DIALOGUE_VOTE';
  end if;
  if not exists (
    select 1
    from public.party_members
    where party_id = target_session.party_id
      and character_id = p_character_id
      and left_at is null
  ) then
    raise exception using errcode = '42501', message = 'CHARACTER_NOT_IN_SESSION';
  end if;

  update public.party_members
  set connection_state = 'connected', last_seen_at = now()
  where party_id = target_session.party_id
    and character_id = p_character_id
    and left_at is null;

  insert into public.party_votes (
    session_id, scene_id, decision_id, character_id, choice_id
  ) values (
    p_session_id, p_scene_id, p_decision_id, p_character_id, p_choice_id
  )
  on conflict (session_id, scene_id, decision_id, character_id) do update
  set choice_id = excluded.choice_id,
      updated_at = now();

  command_server_seed := private.secure_game_seed();
  next_version := target_session.version + 1;

  insert into public.party_commands (
    command_id, session_id, character_id, command_type,
    expected_session_version, server_seed, payload, status, result, processed_at
  ) values (
    p_command_id, p_session_id, p_character_id, 'SUBMIT_DIALOGUE_VOTE',
    target_session.version, command_server_seed, command_payload, 'accepted',
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
      'decision_id', p_decision_id,
      'choice_id', p_choice_id,
      'command_id', p_command_id
    ),
    p_character_id
  );

  return jsonb_build_object(
    'command_id', p_command_id,
    'status', 'accepted',
    'result', jsonb_build_object('vote_recorded', true),
    'duplicate', false,
    'server_seed', command_server_seed,
    'session_version', next_version
  );
end;
$$;

revoke all on function public.submit_party_dialogue_vote(uuid, uuid, uuid, text, text, text)
from public, anon;
grant execute on function public.submit_party_dialogue_vote(uuid, uuid, uuid, text, text, text)
to authenticated;

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
  target_session public.party_sessions%rowtype;
  active_session_found boolean := false;
  combat_active boolean := false;
  other_members integer := 0;
  next_leader uuid;
  session_abandoned boolean := false;
begin
  if not private.is_character_owner(p_character_id) then
    raise exception using errcode = '42501', message = 'CHARACTER_NOT_OWNED';
  end if;

  select * into target_party
  from public.parties
  where id = p_party_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'PARTY_NOT_FOUND';
  end if;
  if not exists (
    select 1
    from public.party_members
    where party_id = p_party_id
      and character_id = p_character_id
      and left_at is null
  ) then
    return jsonb_build_object('party_id', p_party_id, 'duplicate', true);
  end if;

  select * into target_session
  from public.party_sessions
  where party_id = p_party_id
    and status in ('forming', 'active')
  order by created_at desc
  limit 1
  for update;
  active_session_found := found;
  if active_session_found then
    combat_active := coalesce(
      (target_session.session_state #>> '{combat,active}')::boolean,
      false
    );
  end if;

  select count(*)::integer into other_members
  from public.party_members
  where party_id = p_party_id
    and character_id <> p_character_id
    and left_at is null;

  if target_party.leader_character_id = p_character_id and other_members > 0 then
    select character_id into next_leader
    from public.party_members
    where party_id = p_party_id
      and character_id <> p_character_id
      and left_at is null
    order by joined_at, character_id
    limit 1;

    update public.parties
    set leader_character_id = next_leader
    where id = p_party_id;

    update public.party_members
    set role = case when character_id = next_leader then 'leader' else 'member' end
    where party_id = p_party_id and left_at is null;
  end if;

  update public.party_members
  set left_at = now(),
      role = 'member',
      ready_state = false,
      connection_state = 'disconnected',
      last_seen_at = now()
  where party_id = p_party_id
    and character_id = p_character_id
    and left_at is null;

  if active_session_found then
    perform private.append_party_event(
      target_session.id,
      'MEMBER_LEFT',
      jsonb_build_object(
        'character_id', p_character_id,
        'new_leader_character_id', next_leader
      ),
      p_character_id
    );
  end if;

  if other_members = 0 then
    update public.parties
    set status = 'closed', closed_at = coalesce(closed_at, now())
    where id = p_party_id;

    update public.party_sessions
    set status = 'abandoned',
        version = version + 1,
        completed_at = coalesce(completed_at, now())
    where party_id = p_party_id and status in ('forming', 'active');
    session_abandoned := active_session_found;
  elsif active_session_found and (combat_active or other_members < 2) then
    update public.party_sessions
    set status = 'abandoned',
        version = version + 1,
        completed_at = coalesce(completed_at, now())
    where id = target_session.id;

    update public.parties
    set status = 'open', closed_at = null
    where id = p_party_id;

    update public.party_members
    set ready_state = false
    where party_id = p_party_id and left_at is null;
    session_abandoned := true;
  elsif active_session_found then
    update public.party_sessions
    set version = version + 1
    where id = target_session.id;
  end if;

  return jsonb_build_object(
    'party_id', p_party_id,
    'left', true,
    'closed', other_members = 0,
    'session_abandoned', session_abandoned,
    'leader_character_id', next_leader,
    'duplicate', false
  );
end;
$$;

revoke all on function public.leave_party(uuid, uuid) from public, anon;
grant execute on function public.leave_party(uuid, uuid) to authenticated;

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

  select pv.choice_id into leader_choice
  from public.party_votes pv
  join public.party_members pm
    on pm.party_id = target_party_id
   and pm.character_id = pv.character_id
   and pm.left_at is null
   and pm.connection_state in ('connected', 'reconnecting')
   and pm.last_seen_at >= now() - interval '60 seconds'
  where pv.session_id = p_session_id
    and pv.scene_id = p_scene_id
    and pv.decision_id = p_decision_id
    and pv.character_id = leader_character_id;

  select votes.choice_id, votes.vote_count
  into winning_choice, winning_votes
  from (
    select pv.choice_id,
           count(*)::integer as vote_count,
           bool_or(pv.character_id = leader_character_id) as is_leader_choice
    from public.party_votes pv
    join public.party_members pm
      on pm.party_id = target_party_id
     and pm.character_id = pv.character_id
     and pm.left_at is null
     and pm.connection_state in ('connected', 'reconnecting')
     and pm.last_seen_at >= now() - interval '60 seconds'
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

revoke all on function public.resolve_party_vote(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.resolve_party_vote(uuid, text, text)
to service_role;

-- One-time recovery requested by the project owner. This preserves history and
-- saves while releasing every character from an old active party.
update public.party_commands
set status = 'rejected',
    result = jsonb_build_object('code', 'PARTY_RECOVERY_RESET'),
    processed_at = now()
where status = 'pending'
  and session_id in (
    select id from public.party_sessions where status in ('forming', 'active')
  );

update public.party_sessions
set status = 'abandoned',
    version = version + 1,
    completed_at = coalesce(completed_at, now())
where status in ('forming', 'active');

update public.parties
set status = 'closed',
    closed_at = coalesce(closed_at, now())
where status <> 'closed';

update public.party_members
set left_at = coalesce(left_at, now()),
    ready_state = false,
    connection_state = 'disconnected',
    last_seen_at = now()
where left_at is null;

comment on function public.submit_party_dialogue_vote(uuid, uuid, uuid, text, text, text)
is 'Atomic, idempotent party vote submission that remains safe when several clients share a session version.';

comment on function public.leave_party(uuid, uuid)
is 'Always-safe party departure with automatic leadership transfer and combat/session recovery.';

commit;
