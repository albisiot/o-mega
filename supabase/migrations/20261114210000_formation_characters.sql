-- A saved formation remembers which character each copy is. A copy the player
-- no longer has (lost in Conquest, converted to coins) disappears from their
-- collection, and the client could no longer tell which character it was: with
-- the character stored too, the squad falls back to another copy of it (SPEC
-- §4.6: the base one, unless the player chooses a variant).

alter table public.formations add column definition_ids uuid[];

-- Existing formations: the character of each copy that still exists. A copy
-- deleted since (converted) stays unknown: null in its place.
update public.formations f
set definition_ids = (
  select array_agg(i.definition_id order by u.ord)
  from unnest(f.card_instance_ids) with ordinality as u(id, ord)
  left join public.card_instances i on i.id = u.id
);

-- Same as before, and stores the characters validate_team returns, in the team's order.
create or replace function public.save_formation(p_formation_id uuid, p_name text, p_card_instance_ids uuid[])
returns public.formations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_formation public.formations;
  v_definitions uuid[];
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 30 then
    raise exception 'invalid_formation_name' using errcode = '22023';
  end if;
  v_definitions := public.validate_team(v_uid, p_card_instance_ids);

  perform 1 from public.profiles where id = v_uid for update;
  if p_formation_id is null then
    if (select count(*) from public.formations where user_id = v_uid) >= public.config_int('formations.max_per_player') then
      raise exception 'too_many_formations';
    end if;
    insert into public.formations (user_id, name, card_instance_ids, definition_ids)
    values (v_uid, btrim(p_name), p_card_instance_ids, v_definitions)
    returning * into v_formation;
  else
    update public.formations
    set name = btrim(p_name), card_instance_ids = p_card_instance_ids, definition_ids = v_definitions, updated_at = now()
    where id = p_formation_id and user_id = v_uid
    returning * into v_formation;
    if v_formation.id is null then
      raise exception 'formation_not_found' using errcode = 'P0002';
    end if;
  end if;
  return v_formation;
end;
$$;
