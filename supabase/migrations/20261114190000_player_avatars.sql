-- Player avatars: a character the player owns, drawn from its card art (the
-- base drawing or a variant the player has), in place of the account picture.
--
-- profiles.avatar_url stays the one picture everyone sees: the chosen drawing
-- (a /cards/... path) or, without a choice, the account picture from Google
-- (an http URL; for accounts without a photo Google draws the initial). Every
-- payload that shows other players (match views, Emergency rankings) already
-- returns pr.avatar_url, so they show the chosen character with no change and
-- no other data about the player.
--
-- The choice is cosmetic: it stays when the player later loses the last copy
-- of that character (for example in Conquest). Ownership is checked only when
-- the avatar is set.

alter table public.profiles
  add column avatar_definition_id uuid references public.card_definitions (id),
  add column avatar_variant_id uuid,
  -- A variant is always one of the chosen character's drawings.
  add constraint profiles_avatar_variant_fkey foreign key (avatar_variant_id, avatar_definition_id)
    references public.card_variants (id, definition_id),
  add constraint profiles_avatar_variant_needs_character
    check (avatar_variant_id is null or avatar_definition_id is not null);

-- Sets the caller's avatar. p_definition_id null goes back to the account
-- picture; p_variant_id picks that variant's drawing instead of the base one.
-- The player must own a copy of the character (any copy, for the base drawing)
-- or a copy with that variant.
create function public.set_avatar(p_definition_id uuid, p_variant_id uuid default null)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_art_url text;
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_definition_id is null then
    if p_variant_id is not null then
      raise exception 'avatar_not_found' using errcode = 'P0002';
    end if;
    select coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
    into v_art_url
    from auth.users u where u.id = v_uid;
  elsif p_variant_id is null then
    select d.art_url into v_art_url from public.card_definitions d where d.id = p_definition_id;
    if v_art_url is null then
      raise exception 'avatar_not_found' using errcode = 'P0002';
    end if;
    if not exists (
      select 1 from public.card_instances i
      where i.owner_id = v_uid and i.definition_id = p_definition_id
    ) then
      raise exception 'avatar_not_owned' using errcode = '42501';
    end if;
  else
    select v.art_url into v_art_url
    from public.card_variants v
    where v.id = p_variant_id and v.definition_id = p_definition_id;
    if v_art_url is null then
      raise exception 'avatar_not_found' using errcode = 'P0002';
    end if;
    if not exists (
      select 1 from public.card_instances i
      where i.owner_id = v_uid and i.definition_id = p_definition_id and i.variant_id = p_variant_id
    ) then
      raise exception 'avatar_not_owned' using errcode = '42501';
    end if;
  end if;

  update public.profiles
  set avatar_definition_id = p_definition_id,
      avatar_variant_id = p_variant_id,
      avatar_url = v_art_url,
      updated_at = now()
  where id = v_uid
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  return v_profile;
end;
$$;
revoke execute on function public.set_avatar(uuid, uuid) from public, anon;
grant execute on function public.set_avatar(uuid, uuid) to authenticated;

-- A drawing redone under a new path keeps the avatars that show it current.
create function public.sync_avatar_art()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'card_definitions' then
    update public.profiles set avatar_url = new.art_url
    where avatar_definition_id = new.id and avatar_variant_id is null;
  else
    update public.profiles set avatar_url = new.art_url
    where avatar_variant_id = new.id;
  end if;
  return null;
end;
$$;
revoke execute on function public.sync_avatar_art() from public, anon, authenticated;

create trigger card_definitions_sync_avatar_art
  after update of art_url on public.card_definitions
  for each row when (old.art_url is distinct from new.art_url)
  execute function public.sync_avatar_art();

create trigger card_variants_sync_avatar_art
  after update of art_url on public.card_variants
  for each row when (old.art_url is distinct from new.art_url)
  execute function public.sync_avatar_art();
