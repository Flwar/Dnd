-- Party lease and membership recovery:
-- - tolerate mobile timer throttling while clients heartbeat every 20 seconds;
-- - repair a membership whose party/session status was left inconsistent;
-- - release closed-party memberships without trusting a client-supplied party id.

begin;

-- The prior browser-callable overload trusted authored dialogue validation in
-- a Server Action that a direct RPC caller could bypass. Remove it completely
-- before installing the server-only ownership-bound command.
revoke all on function public.submit_party_dialogue_vote(uuid, uuid, uuid, text, text, text)
from public, anon, authenticated;
drop function public.submit_party_dialogue_vote(uuid, uuid, uuid, text, text, text);

create or replace function public.submit_party_dialogue_vote(
  p_command_id uuid,
  p_session_id uuid,
  p_character_id uuid,
  p_owner_id uuid,
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
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'TRUSTED_SERVER_REQUIRED';
  end if;
  if p_command_id is null or p_session_id is null or p_character_id is null or p_owner_id is null then
    raise exception using errcode = '22023', message = 'INVALID_COMMAND_ENVELOPE';
  end if;
  if p_scene_id !~ '^[a-z0-9][a-z0-9_-]{1,95}$'
    or p_decision_id !~ '^[a-z0-9][a-z0-9_-]{1,95}$'
    or p_choice_id !~ '^[a-z0-9][a-z0-9_-]{1,95}$' then
    raise exception using errcode = '22023', message = 'INVALID_DIALOGUE_VOTE';
  end if;
  if not exists (
    select 1
    from public.characters c
    where c.id = p_character_id
      and c.owner_id = p_owner_id
  ) then
    raise exception using errcode = '42501', message = 'CHARACTER_NOT_OWNED';
  end if;

  command_payload := jsonb_build_object(
    'scene_id', p_scene_id,
    'decision_id', p_decision_id,
    'choice_id', p_choice_id
  );

  -- Network retries using the same command id must observe one another before
  -- either checks or inserts the receipt. The transaction-scoped lock avoids
  -- a unique-violation race without trusting a client-supplied session version.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_command_id::text, 0)
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

revoke all on function public.submit_party_dialogue_vote(uuid, uuid, uuid, uuid, text, text, text)
from public, anon, authenticated;
grant execute on function public.submit_party_dialogue_vote(uuid, uuid, uuid, uuid, text, text, text)
to service_role;

create or replace function public.recover_party_membership(
  p_character_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  target_party_id uuid;
  target_party public.parties%rowtype;
  active_session_id uuid;
  recovered boolean := false;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if not private.is_character_owner(p_character_id) then
    raise exception using errcode = '42501', message = 'CHARACTER_NOT_OWNED';
  end if;

  select party_id into target_party_id
  from public.party_members
  where character_id = p_character_id
    and left_at is null
  order by joined_at desc
  limit 1;

  if target_party_id is null then
    return jsonb_build_object(
      'party_id', null,
      'released', false,
      'recovered', false
    );
  end if;

  select * into target_party
  from public.parties
  where id = target_party_id
  for update;

  if not found or target_party.status = 'closed' then
    update public.party_members
    set left_at = coalesce(left_at, now()),
        ready_state = false,
        connection_state = 'disconnected',
        last_seen_at = now()
    where character_id = p_character_id
      and left_at is null;

    return jsonb_build_object(
      'party_id', null,
      'released', true,
      'recovered', true
    );
  end if;

  select id into active_session_id
  from public.party_sessions
  where party_id = target_party_id
    and status in ('forming', 'active')
  order by created_at desc
  limit 1;

  if target_party.status = 'active' and active_session_id is null then
    update public.parties
    set status = 'open', closed_at = null
    where id = target_party_id;

    update public.party_members
    set ready_state = false
    where party_id = target_party_id
      and left_at is null;
    recovered := true;
  elsif target_party.status = 'open' and active_session_id is not null then
    update public.parties
    set status = 'active', closed_at = null
    where id = target_party_id;
    recovered := true;
  end if;

  update public.party_members
  set connection_state = 'connected',
      last_seen_at = now()
  where party_id = target_party_id
    and character_id = p_character_id
    and left_at is null;

  return jsonb_build_object(
    'party_id', target_party_id,
    'released', false,
    'recovered', recovered
  );
end;
$$;

revoke all on function public.recover_party_membership(uuid)
from public, anon;
grant execute on function public.recover_party_membership(uuid)
to authenticated;

create or replace function public.resolve_party_vote(
  p_session_id uuid,
  p_scene_id text,
  p_decision_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  target_session public.party_sessions%rowtype;
  target_party_id uuid;
  leader_character_id uuid;
  leader_choice text;
  winning_choice text;
  winning_votes integer;
  eligible_members integer;
  submitted_members integer;
  tied_choices integer;
  resolution_value jsonb;
  scene_resolutions jsonb;
  all_resolutions jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'TRUSTED_SERVER_REQUIRED';
  end if;

  select * into target_session
  from public.party_sessions
  where id = p_session_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'SESSION_NOT_FOUND';
  end if;
  target_party_id := target_session.party_id;

  select party.leader_character_id into leader_character_id
  from public.parties party
  where party.id = target_party_id;

  resolution_value := target_session.session_state
    #> array['resolved_votes', p_scene_id, p_decision_id];
  if jsonb_typeof(resolution_value) = 'object'
    and coalesce(resolution_value ->> 'choice_id', '') <> '' then
    return resolution_value || jsonb_build_object(
      'duplicate', true,
      'session_version', target_session.version
    );
  end if;

  -- Serialize presence changes with the resolution. A heartbeat that commits
  -- before this lock is included; one that arrives after it waits until the
  -- decision has committed. This prevents a reconnect from being admitted by
  -- the lease between a client-side count and the authoritative tally.
  perform member.character_id
  from public.party_members member
  where member.party_id = target_party_id
    and member.left_at is null
  order by member.character_id
  for update;

  select count(*)::integer
  into eligible_members
  from public.party_members member
  where member.party_id = target_party_id
    and member.left_at is null
    and member.connection_state in ('connected', 'reconnecting')
    and member.last_seen_at >= now() - interval '180 seconds';

  select count(distinct pv.character_id)::integer
  into submitted_members
  from public.party_votes pv
  join public.party_members member
    on member.party_id = target_party_id
   and member.character_id = pv.character_id
   and member.left_at is null
   and member.connection_state in ('connected', 'reconnecting')
   and member.last_seen_at >= now() - interval '180 seconds'
  where pv.session_id = p_session_id
    and pv.scene_id = p_scene_id
    and pv.decision_id = p_decision_id;

  if eligible_members = 0 or submitted_members < eligible_members then
    return jsonb_build_object(
      'pending', true,
      'submitted_votes', submitted_members,
      'required_votes', eligible_members,
      'duplicate', false
    );
  end if;

  select pv.choice_id into leader_choice
  from public.party_votes pv
  join public.party_members pm
    on pm.party_id = target_party_id
   and pm.character_id = pv.character_id
   and pm.left_at is null
   and pm.connection_state in ('connected', 'reconnecting')
   and pm.last_seen_at >= now() - interval '180 seconds'
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
     and pm.last_seen_at >= now() - interval '180 seconds'
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

  select count(*)::integer
  into tied_choices
  from (
    select pv.choice_id, count(*)::integer as vote_count
    from public.party_votes pv
    join public.party_members pm
      on pm.party_id = target_party_id
     and pm.character_id = pv.character_id
     and pm.left_at is null
     and pm.connection_state in ('connected', 'reconnecting')
     and pm.last_seen_at >= now() - interval '180 seconds'
    where pv.session_id = p_session_id
      and pv.scene_id = p_scene_id
      and pv.decision_id = p_decision_id
    group by pv.choice_id
  ) ranked
  where ranked.vote_count = winning_votes;

  resolution_value := jsonb_build_object(
    'choice_id', winning_choice,
    'votes', winning_votes,
    'submitted_votes', submitted_members,
    'required_votes', eligible_members,
    'leader_broke_tie', tied_choices > 1 and winning_choice = leader_choice,
    'resolved_at', now()
  );
  all_resolutions := coalesce(target_session.session_state -> 'resolved_votes', '{}'::jsonb);
  scene_resolutions := coalesce(all_resolutions -> p_scene_id, '{}'::jsonb)
    || jsonb_build_object(p_decision_id, resolution_value);
  all_resolutions := all_resolutions
    || jsonb_build_object(p_scene_id, scene_resolutions);

  update public.party_sessions
  set session_state = jsonb_set(
        session_state,
        '{resolved_votes}',
        all_resolutions,
        true
      ),
      version = version + 1
  where id = p_session_id;

  perform private.append_party_event(
    p_session_id,
    'DIALOGUE_VOTE_RESOLVED',
    resolution_value || jsonb_build_object(
      'scene_id', p_scene_id,
      'decision_id', p_decision_id
    ),
    leader_character_id
  );

  return resolution_value || jsonb_build_object(
    'duplicate', false,
    'session_version', target_session.version + 1
  );
end;
$$;

revoke all on function public.resolve_party_vote(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.resolve_party_vote(uuid, text, text)
to service_role;

comment on function public.recover_party_membership(uuid)
is 'Owner-only repair for closed or inconsistent party memberships; refreshes the caller presence lease.';

comment on function public.resolve_party_vote(uuid, text, text)
is 'Persists an authoritative vote result using a mobile-tolerant 180 second presence lease.';

-- Release only rooms that are unambiguously abandoned: every remaining
-- member lease is older than 15 minutes and no playable session exists.
-- Recent lobbies and every forming/active session are preserved.
do $$
declare
  stale_party_id uuid;
begin
  for stale_party_id in
    select party.id
    from public.parties party
    where party.status <> 'closed'
      and exists (
        select 1
        from public.party_members member
        where member.party_id = party.id
          and member.left_at is null
      )
      and not exists (
        select 1
        from public.party_members member
        where member.party_id = party.id
          and member.left_at is null
          and member.last_seen_at >= now() - interval '15 minutes'
      )
      and not exists (
        select 1
        from public.party_sessions session
        where session.party_id = party.id
          and session.status in ('forming', 'active')
      )
  loop
    -- Lock in the same order used by lobby/session commands, then re-check the
    -- lease and session predicates. A concurrent heartbeat or session start
    -- therefore wins cleanly instead of being overwritten by this migration.
    perform party.id
    from public.parties party
    where party.id = stale_party_id
    for update;
    if not found then
      continue;
    end if;

    perform member.character_id
    from public.party_members member
    where member.party_id = stale_party_id
      and member.left_at is null
    order by member.character_id
    for update;

    if exists (
      select 1
      from public.parties party
      where party.id = stale_party_id
        and party.status <> 'closed'
    )
      and exists (
        select 1
        from public.party_members member
        where member.party_id = stale_party_id
          and member.left_at is null
      )
      and not exists (
        select 1
        from public.party_members member
        where member.party_id = stale_party_id
          and member.left_at is null
          and member.last_seen_at >= now() - interval '15 minutes'
      )
      and not exists (
        select 1
        from public.party_sessions session
        where session.party_id = stale_party_id
          and session.status in ('forming', 'active')
      ) then
      update public.party_members
      set left_at = coalesce(left_at, now()),
          ready_state = false,
          connection_state = 'disconnected',
          last_seen_at = now()
      where party_id = stale_party_id
        and left_at is null;

      update public.parties
      set status = 'closed',
          closed_at = coalesce(closed_at, now())
      where id = stale_party_id;
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';

commit;
