-- Destructive only inside this transaction; all test users and game data roll back.
-- Run against a freshly migrated local Supabase database as the postgres role.
begin;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'owner-a@example.invalid',
    'test-only-no-login',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"בודקת א"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'owner-b@example.invalid',
    'test-only-no-login',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"בודק ב"}'::jsonb,
    now(),
    now()
  );

create temporary table security_test_state (
  key text primary key,
  value text not null
) on commit drop;
grant select, insert, update on table security_test_state to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into security_test_state (key, value)
select
  'character_a',
  public.create_character(
    p_name => 'אריאל',
    p_race_id => 'human',
    p_class_id => 'fighter',
    p_background_id => 'former-soldier',
    p_portrait_key => 'portrait-human-01',
    p_attributes => '{"strength":15,"dexterity":12,"constitution":14,"intelligence":8,"wisdom":10,"charisma":10}'::jsonb,
    p_command_id => 'a0000000-0000-4000-8000-000000000001'
  ) ->> 'character_id';

do $owner_can_read$
begin
  if (
    select count(*) from public.characters
    where id = (select value::uuid from security_test_state where key = 'character_a')
  ) <> 1 then
    raise exception 'Owner cannot read their character';
  end if;
end;
$owner_can_read$;

insert into security_test_state (key, value)
select 'party_id', party_id::text
from public.create_party(
  (select value::uuid from security_test_state where key = 'character_a'),
  'חבורת המבחן',
  4
);

insert into security_test_state (key, value)
select 'room_code', room_code
from public.parties
where id = (select value::uuid from security_test_state where key = 'party_id');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into security_test_state (key, value)
select
  'character_b',
  public.create_character(
    p_name => 'נועם',
    p_race_id => 'elf',
    p_class_id => 'mage',
    p_background_id => 'wandering-scholar',
    p_portrait_key => 'portrait-elf-01',
    p_attributes => '{"strength":8,"dexterity":14,"constitution":12,"intelligence":15,"wisdom":12,"charisma":10}'::jsonb,
    p_command_id => 'b0000000-0000-4000-8000-000000000002'
  ) ->> 'character_id';

do $other_character_is_private$
declare
  affected integer;
begin
  if exists (
    select 1 from public.characters
    where id = (select value::uuid from security_test_state where key = 'character_a')
  ) then
    raise exception 'Another player character leaked through RLS';
  end if;

  with changed as (
    update public.characters
    set name = 'שם שאסור לשנות'
    where id = (select value::uuid from security_test_state where key = 'character_a')
    returning 1
  ) select count(*) into affected from changed;

  if affected <> 0 then
    raise exception 'Another player character was updated';
  end if;
end;
$other_character_is_private$;

do $party_is_private_before_join$
begin
  if exists (
    select 1 from public.parties
    where id = (select value::uuid from security_test_state where key = 'party_id')
  ) then
    raise exception 'Party data leaked before membership';
  end if;
end;
$party_is_private_before_join$;

select public.join_party_by_code(
  (select value::uuid from security_test_state where key = 'character_b'),
  (select value from security_test_state where key = 'room_code')
);

do $party_is_visible_after_join$
begin
  if not exists (
    select 1 from public.parties
    where id = (select value::uuid from security_test_state where key = 'party_id')
  ) then
    raise exception 'Party is not visible after joining';
  end if;

  if (
    select count(*)
    from public.get_party_roster(
      (select value::uuid from security_test_state where key = 'party_id')
    )
  ) <> 2 then
    raise exception 'Limited party roster did not return both members';
  end if;
end;
$party_is_visible_after_join$;

do $member_cannot_close_party$
begin
  begin
    perform public.close_party(
      (select value::uuid from security_test_state where key = 'party_id')
    );
    raise exception 'Non-leader closed the party';
  exception when insufficient_privilege then
    null;
  end;
end;
$member_cannot_close_party$;

reset role;
rollback;
