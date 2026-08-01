begin;

alter table public.profiles
add column account_role text not null default 'player'
check (account_role in ('player', 'administrator'));

alter table public.profiles
add column is_king boolean not null default false;

alter table public.profiles
add column account_title text generated always as (
  case when is_king then 'מלך ארצות ואלדר' else null end
) stored;

alter table public.profiles
add constraint profiles_king_requires_administrator_check
check (not is_king or account_role = 'administrator');

revoke update (account_role, is_king, account_title)
on public.profiles from authenticated;

create or replace function private.is_king_account(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = p_user_id
      and profile.account_role = 'administrator'
      and profile.is_king
  );
$$;

revoke all on function private.is_king_account(uuid)
from public, anon, authenticated;

create or replace function public.provision_account_access(
  p_user_id uuid,
  p_account_role text,
  p_is_king boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  provisioned_profile public.profiles%rowtype;
begin
  if p_account_role not in ('player', 'administrator') then
    raise exception using errcode = '22023', message = 'INVALID_ACCOUNT_ROLE';
  end if;
  if p_is_king and p_account_role <> 'administrator' then
    raise exception using errcode = '22023', message = 'KING_REQUIRES_ADMINISTRATOR';
  end if;

  update public.profiles
  set account_role = p_account_role,
      is_king = p_is_king
  where id = p_user_id
  returning * into provisioned_profile;

  if not found then
    raise exception using errcode = 'P0002', message = 'PROFILE_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'user_id', provisioned_profile.id,
    'account_role', provisioned_profile.account_role,
    'is_king', provisioned_profile.is_king,
    'account_title', provisioned_profile.account_title
  );
end;
$$;

revoke all on function public.provision_account_access(uuid, text, boolean)
from public, anon, authenticated;
grant execute on function public.provision_account_access(uuid, text, boolean)
to service_role;

alter table public.characters
drop constraint characters_class_id_check;
alter table public.characters
add constraint characters_class_id_check
check (class_id in ('fighter', 'mage', 'rogue', 'ranger', 'cleric', 'barbarian', 'king'));

alter table public.characters
drop constraint characters_primary_resource_type_check;
alter table public.characters
add constraint characters_primary_resource_type_check
check (primary_resource_type in ('stamina', 'mana', 'focus', 'faith', 'rage', 'authority'));

create unique index character_inventory_unique_king_crown_idx
on public.character_inventory(character_id, item_id)
where item_id = 'crown-of-the-shattered-king';

alter function public.create_character(text, text, text, text, text, jsonb, text, text, uuid)
rename to create_character_with_portraits;

revoke all on function public.create_character_with_portraits(text, text, text, text, text, jsonb, text, text, uuid)
from public, anon, authenticated;

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
  creation_result jsonb;
  created_character_id uuid;
  crown_inventory_id uuid;
  king_maximum_health integer;
  king_maximum_authority integer;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if p_class_id = 'king' and not private.is_king_account(caller_id) then
    raise exception using errcode = '42501', message = 'KING_CLASS_FORBIDDEN';
  end if;

  creation_result := public.create_character_with_portraits(
    p_name,
    p_race_id,
    case when p_class_id = 'king' then 'fighter' else p_class_id end,
    p_background_id,
    p_portrait_key,
    p_attributes,
    p_description,
    p_form_of_address,
    p_command_id
  );

  if p_class_id = 'king' and not coalesce((creation_result ->> 'duplicate')::boolean, false) then
    created_character_id := (creation_result ->> 'character_id')::uuid;

    select
      32 + floor((attributes.constitution - 10) / 2.0)::integer,
      10 + greatest(0, floor((attributes.charisma - 10) / 2.0)::integer)
    into king_maximum_health, king_maximum_authority
    from public.character_attributes attributes
    where attributes.character_id = created_character_id;

    if king_maximum_health is null or king_maximum_authority is null then
      raise exception using errcode = 'P0002', message = 'CHARACTER_ATTRIBUTES_NOT_FOUND';
    end if;

    update public.characters
    set class_id = 'king',
        primary_resource_type = 'authority',
        current_health = king_maximum_health,
        maximum_health = king_maximum_health,
        primary_resource = king_maximum_authority,
        maximum_primary_resource = king_maximum_authority
    where id = created_character_id
      and owner_id = caller_id;

    if not found then
      raise exception using errcode = '42501', message = 'CHARACTER_NOT_OWNED';
    end if;

    insert into public.character_inventory (
      character_id,
      item_id,
      quantity,
      durability,
      custom_data
    ) values (
      created_character_id,
      'crown-of-the-shattered-king',
      1,
      100,
      jsonb_build_object('starter_item', true, 'royal_entitlement', true)
    )
    returning id into crown_inventory_id;

    insert into public.character_equipment (
      character_id,
      slot,
      inventory_entry_id
    ) values (
      created_character_id,
      'helmet',
      crown_inventory_id
    );
  end if;

  return creation_result;
end;
$$;

revoke all on function public.create_character(text, text, text, text, text, jsonb, text, text, uuid)
from public, anon;
grant execute on function public.create_character(text, text, text, text, text, jsonb, text, text, uuid)
to authenticated;

do $migration$
declare
  save_function_definition text;
  updated_function_definition text;
begin
  select pg_get_functiondef(
    'public.save_character_snapshot(uuid,uuid,integer,jsonb,text)'::regprocedure
  ) into save_function_definition;

  updated_function_definition := replace(
    save_function_definition,
    '''first-crown-shard'', ''guardian-core''',
    '''first-crown-shard'', ''guardian-core'', ''crown-of-the-shattered-king'''
  );

  if updated_function_definition = save_function_definition then
    raise exception 'SAVE_CHARACTER_ITEM_ALLOWLIST_NOT_FOUND';
  end if;

  execute updated_function_definition;
end;
$migration$;

revoke all on function public.save_character_snapshot(uuid, uuid, integer, jsonb, text)
from public, anon;
grant execute on function public.save_character_snapshot(uuid, uuid, integer, jsonb, text)
to authenticated;

comment on column public.profiles.account_role is
  'Server-provisioned account privilege. Browser clients have no update grant.';
comment on column public.profiles.is_king is
  'Server-provisioned gameplay entitlement; requires administrator role.';
comment on function public.provision_account_access(uuid, text, boolean) is
  'Service-role-only provisioning RPC. Call from trusted server operations; never from the browser.';
comment on function public.create_character(text, text, text, text, text, jsonb, text, text, uuid) is
  'Authoritative character creation with database-enforced King entitlement and owner-scoped portraits.';

commit;
