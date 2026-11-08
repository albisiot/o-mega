-- Choosing which characters packs can give (SPEC §7). An admin unticks a card to
-- keep it back (a new character, an event card) and ticks it again later. Level
-- cards stay out of packs whatever the flag says.

alter table public.card_definitions
  add column in_packs boolean not null default true;

comment on column public.card_definitions.in_packs is
  'Packs can give this card. Changed only by admins through admin_set_cards_in_packs; level cards never come from packs.';

-- A card a pack can give: active, not a level card, not held back.
create function public.is_pack_card(p_definition public.card_definitions)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_definition.is_active and p_definition.unlock_level is null and p_definition.in_packs
$$;

revoke execute on function public.is_pack_card(public.card_definitions) from public, anon, authenticated;

-- A rarity is drawn only while packs can give one of its cards. With every card
-- of a rarity held back, its weight goes to the others: the shop shows the same
-- odds the draw uses, and the guarantee picks among the remaining rarities from
-- Gamma up.
create or replace function public.eligible_rarities()
returns table (code text, name text, rank integer, color text, drop_weight numeric)
language sql
stable
set search_path = ''
as $$
  select r.code, r.name, r.rank, r.color, r.drop_weight
  from public.rarity_definitions r
  where r.drop_weight > 0
    and exists (select 1 from public.card_definitions d where d.rarity_code = r.code and public.is_pack_card(d))
$$;

create or replace function public.draw_pack_definitions(p_count integer, p_guaranteed_min_rank integer)
returns uuid[]
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_definitions uuid[] := '{}';
  v_ranks integer[] := '{}';
  v_rank integer;
  v_definition uuid;
begin
  for slot in 1..p_count loop
    if slot = p_count and not (p_guaranteed_min_rank <= any (v_ranks)) then
      v_rank := public.draw_rarity_rank(p_guaranteed_min_rank);
    else
      v_rank := public.draw_rarity_rank(1);
    end if;

    select d.id into v_definition
    from public.card_definitions d
    join public.rarity_definitions r on r.code = d.rarity_code
    where public.is_pack_card(d) and r.rank = v_rank
    order by random()
    limit 1;

    v_definitions := v_definitions || v_definition;
    v_ranks := v_ranks || v_rank;
  end loop;
  return v_definitions;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------

-- Every card the flag applies to, rarest last, with how many are in packs per rarity.
create function public.admin_pack_cards_payload()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'rarities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', r.code, 'name', r.name, 'rank', r.rank, 'color', r.color
      ) order by r.rank)
      from public.rarity_definitions r
    ), '[]'::jsonb),
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', d.code,
        'name', d.name,
        'rarity_code', d.rarity_code,
        'art_url', d.art_url,
        'in_packs', d.in_packs
      ) order by r.rank, d.name)
      from public.card_definitions d
      join public.rarity_definitions r on r.code = d.rarity_code
      where d.is_active and d.unlock_level is null
    ), '[]'::jsonb),
    'guaranteed_min_rarity_rank', public.config_int('packs.guaranteed_min_rarity_rank')
  )
$$;

revoke execute on function public.admin_pack_cards_payload() from public, anon, authenticated;

create function public.admin_list_pack_cards()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return public.admin_pack_cards_payload();
end;
$$;

revoke execute on function public.admin_list_pack_cards() from public, anon;
grant execute on function public.admin_list_pack_cards() to authenticated;

-- Ticks or unticks several cards at once ("Seleziona tutte" for a rarity, or one card).
-- Packs must keep at least one card at the guaranteed rarity or above: without
-- it no pack could be opened.
create function public.admin_set_cards_in_packs(p_card_codes text[], p_in_packs boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if p_in_packs is null or p_card_codes is null or cardinality(p_card_codes) = 0 then
    raise exception 'pack_card_unavailable';
  end if;
  -- Unknown, inactive and level cards cannot be ticked into packs.
  if exists (
    select 1 from unnest(p_card_codes) as c(code)
    where not exists (
      select 1 from public.card_definitions d
      where d.code = c.code and d.is_active and d.unlock_level is null
    )
  ) then
    raise exception 'pack_card_unavailable';
  end if;

  update public.card_definitions d
  set in_packs = p_in_packs
  where d.code = any (p_card_codes) and d.in_packs is distinct from p_in_packs;

  if not exists (
    select 1
    from public.card_definitions d
    join public.rarity_definitions r on r.code = d.rarity_code
    where public.is_pack_card(d)
      and r.drop_weight > 0
      and r.rank >= public.config_int('packs.guaranteed_min_rarity_rank')
  ) then
    raise exception 'pack_pool_empty';
  end if;

  return public.admin_pack_cards_payload();
end;
$$;

revoke execute on function public.admin_set_cards_in_packs(text[], boolean) from public, anon;
grant execute on function public.admin_set_cards_in_packs(text[], boolean) to authenticated;
