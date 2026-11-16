-- More colours for special packs: 21 shop palettes (the first six unchanged,
-- solid and gradient ones added) and a custom one, saved as
-- 'custom:#from:#to:#body:#omega' (lowercase hex; from = to for a solid
-- background). The palettes themselves live in src/lib/pack-colors.ts; the
-- server only checks that the value is one the app can draw.

create function public.is_pack_color(p_color text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_color is not null and (
    p_color in ('magenta', 'cyan', 'yellow', 'orange', 'violet', 'green', 'red', 'blue', 'pink', 'lime', 'teal', 'silver', 'noir', 'sunset', 'aurora', 'cosmic', 'holo', 'toxic', 'abyss', 'lava', 'gold')
    or p_color ~ '^custom:#[0-9a-f]{6}:#[0-9a-f]{6}:#[0-9a-f]{6}:#[0-9a-f]{6}$'
  );
$$;

grant execute on function public.is_pack_color(text) to anon, authenticated;

-- The column check named after the old list of six goes, whatever its name.
do $$
declare
  v_name text;
begin
  for v_name in
    select c.conname from pg_constraint c
    where c.conrelid = 'public.special_packs'::regclass and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%color%'
  loop
    execute format('alter table public.special_packs drop constraint %I', v_name);
  end loop;
end $$;

alter table public.special_packs
  add constraint special_packs_color_check check (public.is_pack_color(color));

-- Same function as in 20261110160000_special_packs.sql; only the colour check
-- changes, and it has its own error now.
create or replace function public.admin_save_special_pack(
  p_name text,
  p_description text,
  p_color text,
  p_price integer,
  p_cards_per_pack integer,
  p_variant_chance_percent integer,
  p_odds_mode text,
  p_cards jsonb,
  p_rarities jsonb default '[]'::jsonb,
  p_guaranteed_min_rarity_rank integer default null,
  p_starts_at timestamp default null,
  p_ends_at timestamp default null,
  p_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_zone text := public.config_text('time.daily_reset_time_zone');
  v_name text := trim(coalesce(p_name, ''));
  v_description text := trim(coalesce(p_description, ''));
  v_starts timestamptz := p_starts_at at time zone v_zone;
  v_ends timestamptz := p_ends_at at time zone v_zone;
  v_id uuid := p_id;
  v_cards jsonb := coalesce(p_cards, 'null'::jsonb);
  v_rarities jsonb := case when p_odds_mode = 'rarity' then coalesce(p_rarities, 'null'::jsonb) else '[]'::jsonb end;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  if p_id is not null then
    perform 1 from public.special_packs where id = p_id for update;
    if not found then
      raise exception 'special_pack_not_found';
    end if;
  end if;

  if char_length(v_name) not between 3 and 40 or char_length(v_description) > 200 then
    raise exception 'special_pack_invalid_text';
  end if;
  if not public.is_pack_color(p_color) then
    raise exception 'special_pack_invalid_color';
  end if;
  if p_odds_mode is null or p_odds_mode not in ('rarity', 'card')
     or p_price is null or p_price not between 1 and 100000
     or p_cards_per_pack is null
     or p_cards_per_pack not between 1 and public.config_int('special_packs.max_cards_per_pack')
     or p_variant_chance_percent is null or p_variant_chance_percent not between 0 and 100 then
    raise exception 'special_pack_invalid_numbers';
  end if;
  if (v_starts is not null and v_ends is not null and v_ends <= v_starts) or v_ends <= now() then
    raise exception 'special_pack_invalid_period';
  end if;

  -- The cards: known, active, not level cards, each once.
  if jsonb_typeof(v_cards) is distinct from 'array' or jsonb_array_length(v_cards) = 0
     or exists (select 1 from jsonb_array_elements(v_cards) c where jsonb_typeof(c) <> 'object')
     or exists (
       select 1 from jsonb_array_elements(v_cards) c
       where not exists (
         select 1 from public.card_definitions d
         where d.code = c ->> 'code' and d.is_active and d.unlock_level is null
       )
     )
     or (select count(distinct c ->> 'code') from jsonb_array_elements(v_cards) c) <> jsonb_array_length(v_cards) then
    raise exception 'special_pack_invalid_cards';
  end if;

  -- The odds: positive, two decimals, adding up to exactly 100. In 'rarity'
  -- mode one percentage for each rarity of the chosen cards and no other.
  begin
    if jsonb_typeof(v_rarities) is distinct from 'array'
       or exists (select 1 from jsonb_array_elements(v_rarities) x where jsonb_typeof(x) <> 'object') then
      raise exception 'special_pack_invalid_odds';
    end if;
    if p_odds_mode = 'card' then
      if exists (
           select 1 from jsonb_array_elements(v_cards) c
           where jsonb_typeof(c -> 'percent') is distinct from 'number'
              or (c ->> 'percent')::numeric <= 0
              or (c ->> 'percent')::numeric <> round((c ->> 'percent')::numeric, 2)
         )
         or (select sum((c ->> 'percent')::numeric) from jsonb_array_elements(v_cards) c) <> 100 then
        raise exception 'special_pack_invalid_odds';
      end if;
    else
      if exists (
           select 1 from jsonb_array_elements(v_rarities) x
           where jsonb_typeof(x -> 'percent') is distinct from 'number'
              or (x ->> 'percent')::numeric <= 0
              or (x ->> 'percent')::numeric <> round((x ->> 'percent')::numeric, 2)
         )
         or (select sum((x ->> 'percent')::numeric) from jsonb_array_elements(v_rarities) x) <> 100
         or (select count(distinct x ->> 'code') from jsonb_array_elements(v_rarities) x) <> jsonb_array_length(v_rarities)
         or (select array_agg(distinct x ->> 'code' order by x ->> 'code') from jsonb_array_elements(v_rarities) x)
            is distinct from (
              select array_agg(distinct d.rarity_code order by d.rarity_code)
              from jsonb_array_elements(v_cards) c
              join public.card_definitions d on d.code = c ->> 'code'
            ) then
        raise exception 'special_pack_invalid_odds';
      end if;
    end if;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'special_pack_invalid_odds';
  end;

  -- The guarantee: a known rarity, a pack of 2 cards or more, and a chosen card
  -- that can satisfy it.
  if p_guaranteed_min_rarity_rank is not null and (
       p_cards_per_pack < 2
       or not exists (select 1 from public.rarity_definitions r where r.rank = p_guaranteed_min_rarity_rank)
       or not exists (
         select 1 from jsonb_array_elements(v_cards) c
         join public.card_definitions d on d.code = c ->> 'code'
         join public.rarity_definitions r on r.code = d.rarity_code
         where r.rank >= p_guaranteed_min_rarity_rank
       )
     ) then
    raise exception 'special_pack_invalid_guarantee';
  end if;

  if v_id is null then
    insert into public.special_packs (
      name, description, color, price, cards_per_pack, guaranteed_min_rarity_rank,
      variant_chance_percent, odds_mode, starts_at, ends_at, created_by
    ) values (
      v_name, v_description, p_color, p_price, p_cards_per_pack, p_guaranteed_min_rarity_rank,
      p_variant_chance_percent, p_odds_mode, v_starts, v_ends, auth.uid()
    )
    returning id into v_id;
  else
    update public.special_packs
    set name = v_name, description = v_description, color = p_color, price = p_price,
        cards_per_pack = p_cards_per_pack, guaranteed_min_rarity_rank = p_guaranteed_min_rarity_rank,
        variant_chance_percent = p_variant_chance_percent, odds_mode = p_odds_mode,
        starts_at = v_starts, ends_at = v_ends, version = version + 1, updated_at = now()
    where id = v_id;
    delete from public.special_pack_cards where pack_id = v_id;
    delete from public.special_pack_rarities where pack_id = v_id;
  end if;

  insert into public.special_pack_cards (pack_id, definition_id, percent)
  select v_id, d.id, case when p_odds_mode = 'card' then (c ->> 'percent')::numeric end
  from jsonb_array_elements(v_cards) c
  join public.card_definitions d on d.code = c ->> 'code';

  insert into public.special_pack_rarities (pack_id, rarity_code, percent)
  select v_id, x ->> 'code', (x ->> 'percent')::numeric
  from jsonb_array_elements(v_rarities) x;

  return public.admin_special_packs_payload();
end;
$$;

revoke execute on function public.admin_save_special_pack(text, text, text, integer, integer, integer, text, jsonb, jsonb, integer, timestamp, timestamp, uuid) from public, anon;
grant execute on function public.admin_save_special_pack(text, text, text, integer, integer, integer, text, jsonb, jsonb, integer, timestamp, timestamp, uuid) to authenticated;
