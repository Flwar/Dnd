begin;

alter table public.profiles
drop constraint if exists profiles_avatar_key_check;

alter table public.profiles
add constraint profiles_avatar_key_check check (
  avatar_key in (
    'wanderer_01',
    'portrait-human-01',
    'portrait-elf-01',
    'portrait-dwarf-01',
    'portrait-halfling-01',
    'portrait-orc-01',
    'portrait-dragonborn-01'
  )
  or (
    avatar_key ~ '^custom:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    and split_part(avatar_key, '/', 1) = 'custom:' || id::text
  )
);

create or replace function private.can_delete_character_portrait(
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select private.is_owned_character_portrait_path(p_object_name)
    and not exists (
      select 1
      from public.characters character
      where character.owner_id = auth.uid()
        and character.portrait_key = 'custom:' || p_object_name
    )
    and not exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and profile.avatar_key = 'custom:' || p_object_name
    );
$$;

revoke all on function private.can_delete_character_portrait(text) from public, anon, authenticated;
grant execute on function private.can_delete_character_portrait(text) to authenticated, service_role;

comment on function private.can_delete_character_portrait(text) is
  'Prevents Storage API deletion while an owned character or player profile references the portrait.';

notify pgrst, 'reload schema';

commit;
