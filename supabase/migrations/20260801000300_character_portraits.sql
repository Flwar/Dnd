begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'character-portraits',
  'character-portraits',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.is_owned_character_portrait_path(
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and p_object_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    and split_part(p_object_name, '/', 1) = auth.uid()::text;
$$;

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
      from public.characters c
      where c.owner_id = auth.uid()
        and c.portrait_key = 'custom:' || p_object_name
    );
$$;

revoke all on function private.is_owned_character_portrait_path(text) from public, anon, authenticated;
revoke all on function private.can_delete_character_portrait(text) from public, anon, authenticated;
grant execute on function private.is_owned_character_portrait_path(text) to authenticated, service_role;
grant execute on function private.can_delete_character_portrait(text) to authenticated, service_role;

create policy character_portraits_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'character-portraits'
  and private.is_owned_character_portrait_path(name)
  and storage.extension(name) in ('jpg', 'png', 'webp')
);

create policy character_portraits_select_own
on storage.objects for select to authenticated
using (
  bucket_id = 'character-portraits'
  and owner_id = (select auth.uid()::text)
  and private.is_owned_character_portrait_path(name)
);

create policy character_portraits_delete_unreferenced_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'character-portraits'
  and owner_id = (select auth.uid()::text)
  and private.can_delete_character_portrait(name)
);

alter table public.characters
drop constraint characters_portrait_key_check;

alter table public.characters
add constraint characters_portrait_key_check check (
  portrait_key ~ '^portrait-(human|elf|dwarf|halfling|orc|dragonborn)-0[1-5]$'
  or (
    portrait_key ~ '^custom:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    and split_part(portrait_key, '/', 1) = 'custom:' || owner_id::text
  )
);

alter function public.create_character(text, text, text, text, text, jsonb, text, text, uuid)
rename to create_character_legacy;

revoke all on function public.create_character_legacy(text, text, text, text, text, jsonb, text, text, uuid)
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
  legacy_portrait_key text;
  custom_object_name text;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if p_portrait_key is null or not (
    p_portrait_key ~ '^portrait-(human|elf|dwarf|halfling|orc|dragonborn)-0[1-5]$'
    or p_portrait_key ~ '^custom:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
  ) then
    raise exception using errcode = '22023', message = 'INVALID_PORTRAIT';
  end if;

  if p_portrait_key like 'custom:%' then
    custom_object_name := substring(p_portrait_key from 8);
    if not private.is_owned_character_portrait_path(custom_object_name)
      or not exists (
        select 1
        from storage.objects object
        where object.bucket_id = 'character-portraits'
          and object.name = custom_object_name
          and object.owner_id = caller_id::text
      ) then
      raise exception using errcode = '22023', message = 'INVALID_PORTRAIT';
    end if;
  end if;

  legacy_portrait_key := case p_race_id
    when 'human' then 'portrait-human-01'
    when 'elf' then 'portrait-elf-01'
    when 'dwarf' then 'portrait-dwarf-01'
    when 'halfling' then 'portrait-halfling-01'
    when 'orc' then 'portrait-orc-01'
    when 'dragonborn' then 'portrait-dragonborn-01'
    else 'portrait-human-01'
  end;

  creation_result := public.create_character_legacy(
    p_name,
    p_race_id,
    p_class_id,
    p_background_id,
    legacy_portrait_key,
    p_attributes,
    p_description,
    p_form_of_address,
    p_command_id
  );

  if not coalesce((creation_result ->> 'duplicate')::boolean, false) then
    created_character_id := (creation_result ->> 'character_id')::uuid;
    update public.characters
    set portrait_key = p_portrait_key
    where id = created_character_id
      and owner_id = caller_id;

    if not found then
      raise exception using errcode = '42501', message = 'CHARACTER_NOT_OWNED';
    end if;
  end if;

  return creation_result;
end;
$$;

revoke all on function public.create_character(text, text, text, text, text, jsonb, text, text, uuid)
from public, anon;
grant execute on function public.create_character(text, text, text, text, text, jsonb, text, text, uuid)
to authenticated;

comment on function private.can_delete_character_portrait(text) is
  'Prevents Storage API deletion while a character owned by the uploader references the portrait.';
comment on function public.create_character(text, text, text, text, text, jsonb, text, text, uuid) is
  'Validated compatibility wrapper adding authored and owner-scoped custom portrait support.';

commit;
