-- Special packs (SPEC §7.1): packs an admin creates from the app, each with its
-- own name, price in coins, size, card pool, odds (per rarity or per card),
-- optional guarantee, variant chance and optional dates. They are bought in the
-- shop next to the standard pack. The daily pack, the standard pack, bonus codes
-- and events keep using open_pack and are not touched here.
--
-- As every other draw, it happens on the server with random(), and the opening
-- is saved before it is shown; coins go through coin_ledger and cards through
-- card_transfers in the same transaction. The shop shows the odds computed by
-- the same function the draw uses (special_pack_card_odds).

insert into public.game_config (key, value, description) values
  ('special_packs.max_cards_per_pack', '10', 'Most cards a special pack can hold');

-- ---------------------------------------------------------------------------
-- Tables. No client reads them: everything goes through the functions below.
-- ---------------------------------------------------------------------------

create table public.special_packs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 40),
  description text not null default '' check (char_length(description) <= 200),
  -- One of the shop palettes (src/lib/special-packs.ts).
  color text not null check (color in ('magenta', 'cyan', 'yellow', 'orange', 'violet', 'green')),
  price integer not null check (price between 1 and 100000),
  cards_per_pack integer not null check (cards_per_pack >= 1),
  -- Null: no guarantee. Otherwise, if no earlier card reached this rarity rank,
  -- the last card is drawn among the cards of this rank or higher.
  guaranteed_min_rarity_rank integer check (guaranteed_min_rarity_rank is null or cards_per_pack >= 2),
  -- Chance that a drawn card with a variant comes with that art; 0: never.
  variant_chance_percent integer not null check (variant_chance_percent between 0 and 100),
  -- 'rarity': a percentage per rarity, the cards of a rarity share it equally.
  -- 'card': a percentage per card.
  odds_mode text not null check (odds_mode in ('rarity', 'card')),
  -- Both optional, wall-clock Europe/Rome when chosen.
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  -- Raised at every change of what is sold: a purchase names the version the
  -- shop showed, so nobody pays a price or gets odds they did not see.
  version integer not null default 1,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint special_packs_period check (starts_at is null or ends_at is null or ends_at > starts_at)
);

create index special_packs_created_by_idx on public.special_packs (created_by);

create table public.special_pack_cards (
  pack_id uuid not null references public.special_packs (id) on delete cascade,
  definition_id uuid not null references public.card_definitions (id),
  -- Only in 'card' mode; in 'rarity' mode the rarity's percentage is shared.
  percent numeric(5, 2) check (percent is null or percent > 0),
  primary key (pack_id, definition_id)
);

create index special_pack_cards_definition_idx on public.special_pack_cards (definition_id);

create table public.special_pack_rarities (
  pack_id uuid not null references public.special_packs (id) on delete cascade,
  rarity_code text not null references public.rarity_definitions (code),
  percent numeric(5, 2) not null check (percent > 0),
  primary key (pack_id, rarity_code)
);

create index special_pack_rarities_rarity_idx on public.special_pack_rarities (rarity_code);

alter table public.special_packs enable row level security;
alter table public.special_pack_cards enable row level security;
alter table public.special_pack_rarities enable row level security;
revoke all on table public.special_packs from anon, authenticated;
revoke all on table public.special_pack_cards from anon, authenticated;
revoke all on table public.special_pack_rarities from anon, authenticated;

-- An opening remembers which special pack it came from. Restrict: a pack that
-- was opened is never deleted, only deactivated.
alter table public.pack_openings add column special_pack_id uuid references public.special_packs (id);
create index pack_openings_special_pack_idx on public.pack_openings (special_pack_id) where special_pack_id is not null;

alter table public.pack_openings drop constraint pack_openings_pack_type_check;
alter table public.pack_openings add constraint pack_openings_pack_type_check
  check (pack_type in ('daily', 'standard', 'bonus', 'event', 'special'));
alter table public.pack_openings add constraint pack_openings_special_pack_check
  check ((pack_type = 'special') = (special_pack_id is not null));

-- ---------------------------------------------------------------------------
-- Odds and draw
-- ---------------------------------------------------------------------------

-- The chance of each card of a special pack for one card of the pack (before
-- the guarantee), adding up to 1. Cards no longer active, or turned into level
-- cards, drop out and their share goes to the others, like eligible_rarities
-- does for the standard pack: the shop and the draw both read this function.
create function public.special_pack_card_odds(p_pack_id uuid)
returns table (definition_id uuid, rarity_rank integer, probability numeric)
language sql
stable
set search_path = ''
as $$
  with pack as (
    select p.odds_mode from public.special_packs p where p.id = p_pack_id
  ), cards as (
    select c.definition_id, d.rarity_code, r.rank, c.percent
    from public.special_pack_cards c
    join public.card_definitions d on d.id = c.definition_id
    join public.rarity_definitions r on r.code = d.rarity_code
    where c.pack_id = p_pack_id and d.is_active and d.unlock_level is null
  ), weights as (
    select k.definition_id, k.rank,
           case pack.odds_mode
             when 'card' then k.percent
             else sr.percent / count(*) over (partition by k.rarity_code)
           end as weight
    from cards k
    cross join pack
    left join public.special_pack_rarities sr on sr.pack_id = p_pack_id and sr.rarity_code = k.rarity_code
  )
  select w.definition_id, w.rank, w.weight / sum(w.weight) over ()
  from weights w
  where w.weight > 0
$$;

revoke execute on function public.special_pack_card_odds(uuid) from public, anon, authenticated;

-- A pack the shop sells right now: active, inside its dates, with cards to draw
-- and, with a guarantee, a card for it.
create function public.special_pack_is_open(p_pack public.special_packs)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_pack.is_active
    and (p_pack.starts_at is null or p_pack.starts_at <= now())
    and (p_pack.ends_at is null or p_pack.ends_at > now())
    and exists (
      select 1 from public.special_pack_card_odds(p_pack.id) o
      where o.rarity_rank >= coalesce(p_pack.guaranteed_min_rarity_rank, 0)
    )
$$;

revoke execute on function public.special_pack_is_open(public.special_packs) from public, anon, authenticated;

-- One card: a single roll over the cumulative chances of the cards of this
-- rarity rank or higher (renormalised).
create function public.draw_special_pack_card(p_pack_id uuid, p_min_rank integer)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  -- Drawn once: random() inside the query would be evaluated per row.
  v_roll numeric := random()::numeric;
  v_definition uuid;
begin
  with odds as (
    select o.definition_id, o.rarity_rank, o.probability
    from public.special_pack_card_odds(p_pack_id) o
    where o.rarity_rank >= p_min_rank
  ), cumulative as (
    select o.definition_id,
           sum(o.probability) over (order by o.rarity_rank, o.definition_id) as upper_bound,
           sum(o.probability) over () as total
    from odds o
  )
  select c.definition_id into v_definition
  from cumulative c
  where c.upper_bound > v_roll * c.total
  order by c.upper_bound
  limit 1;

  if v_definition is null then
    raise exception 'special_pack_unavailable';
  end if;
  return v_definition;
end;
$$;

revoke execute on function public.draw_special_pack_card(uuid, integer) from public, anon, authenticated;

-- draw_variant with the pack's own chance. The card is already drawn: this roll
-- cannot change its odds.
create function public.draw_variant_at(p_definition_id uuid, p_chance_percent integer)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_variant uuid;
begin
  if p_chance_percent <= 0 or random() * 100 >= p_chance_percent then
    return null;
  end if;
  select v.id into v_variant
  from public.card_variants v
  where v.definition_id = p_definition_id and v.is_active
  order by random()
  limit 1;
  return v_variant;
end;
$$;

revoke execute on function public.draw_variant_at(uuid, integer) from public, anon, authenticated;

-- Creates the cards of a special pack for a player, logs them in the transfer
-- ledger and records the opening, as open_pack does. Returns the opening id.
create function public.open_special_pack(p_user uuid, p_pack_id uuid)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_pack public.special_packs;
  v_ranks integer[] := '{}';
  v_definition uuid;
  v_instance uuid;
  v_is_new boolean;
  v_instance_ids uuid[] := '{}';
  v_new_ids uuid[] := '{}';
  v_opening uuid := gen_random_uuid();
begin
  select * into v_pack from public.special_packs where id = p_pack_id;
  if v_pack.id is null then
    raise exception 'special_pack_unavailable';
  end if;

  for slot in 1..v_pack.cards_per_pack loop
    if slot = v_pack.cards_per_pack and v_pack.guaranteed_min_rarity_rank is not null
       and not (v_pack.guaranteed_min_rarity_rank <= any (v_ranks)) then
      v_definition := public.draw_special_pack_card(p_pack_id, v_pack.guaranteed_min_rarity_rank);
    else
      v_definition := public.draw_special_pack_card(p_pack_id, 0);
    end if;
    v_ranks := v_ranks || (
      select r.rank from public.card_definitions d
      join public.rarity_definitions r on r.code = d.rarity_code
      where d.id = v_definition
    );

    -- Two copies in the same pack: the first is already in the collection, so only it is new.
    v_is_new := not exists (
      select 1 from public.card_instances i where i.owner_id = p_user and i.definition_id = v_definition
    );

    insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
    values (v_definition, p_user, 'pack', public.draw_variant_at(v_definition, v_pack.variant_chance_percent))
    returning id into v_instance;

    insert into public.card_transfers (instance_id, from_user, to_user, reason)
    values (v_instance, null, p_user, 'pack');

    v_instance_ids := v_instance_ids || v_instance;
    if v_is_new then
      v_new_ids := v_new_ids || v_instance;
    end if;
  end loop;

  insert into public.pack_openings (id, user_id, pack_type, special_pack_id, card_instance_ids, new_card_instance_ids)
  values (v_opening, p_user, 'special', p_pack_id, v_instance_ids, v_new_ids);

  return v_opening;
end;
$$;

revoke execute on function public.open_special_pack(uuid, uuid) from public, anon, authenticated;

-- Same payload as before, with the name and colour of a special pack.
create or replace function public.pack_opening_payload(p_opening_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'pack_type', o.pack_type,
    'pack_name', sp.name,
    'pack_color', sp.color,
    'opened_at', o.opened_at,
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'instance_id', i.id,
        'is_new', i.id = any (o.new_card_instance_ids),
        'code', d.code,
        'name', d.name,
        'faction', d.faction,
        'flavor', d.flavor,
        'art_url', coalesce(v.art_url, d.art_url),
        'variant', case when v.id is null then null
                        else jsonb_build_object('style', v.style, 'name', v.style_name) end,
        'stats', d.stats,
        'rarity', jsonb_build_object('code', r.code, 'name', r.name, 'rank', r.rank, 'color', r.color),
        'power', case when d.power_code is null then null else jsonb_build_object(
          'name', p.name,
          'text', public.power_text(d.power_code, d.power_params)
        ) end
      ) order by r.rank, u.slot)
      from unnest(o.card_instance_ids) with ordinality as u(instance_id, slot)
      join public.card_instances i on i.id = u.instance_id
      join public.card_definitions d on d.id = i.definition_id
      join public.rarity_definitions r on r.code = d.rarity_code
      left join public.card_variants v on v.id = i.variant_id
      left join public.power_definitions p on p.code = d.power_code
    ), '[]'::jsonb)
  )
  from public.pack_openings o
  left join public.special_packs sp on sp.id = o.special_pack_id
  where o.id = p_opening_id
$$;

-- ---------------------------------------------------------------------------
-- Shop
-- ---------------------------------------------------------------------------

-- One special pack as the shop shows it, with the odds the draw uses: per
-- rarity and per card.
create function public.special_pack_shop_payload(p_pack public.special_packs)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_pack.id,
    'version', p_pack.version,
    'name', p_pack.name,
    'description', p_pack.description,
    'color', p_pack.color,
    'price', p_pack.price,
    'cards_per_pack', p_pack.cards_per_pack,
    'ends_at', p_pack.ends_at,
    'odds_mode', p_pack.odds_mode,
    'guaranteed_min_rarity_rank', p_pack.guaranteed_min_rarity_rank,
    'guaranteed_rarity_name', (
      select r.name from public.rarity_definitions r where r.rank = p_pack.guaranteed_min_rarity_rank
    ),
    'variant_chance_percent', p_pack.variant_chance_percent,
    'characters_with_variants', (
      select count(distinct v.definition_id)
      from public.special_pack_card_odds(p_pack.id) o
      join public.card_variants v on v.definition_id = o.definition_id and v.is_active
    ),
    'odds', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', x.code, 'name', x.name, 'rank', x.rank, 'color', x.color,
        'probability', round(x.probability, 4)
      ) order by x.rank)
      from (
        select r.code, r.name, r.rank, r.color, sum(o.probability) as probability
        from public.special_pack_card_odds(p_pack.id) o
        join public.card_definitions d on d.id = o.definition_id
        join public.rarity_definitions r on r.code = d.rarity_code
        group by r.code, r.name, r.rank, r.color
      ) x
    ), '[]'::jsonb),
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', d.code, 'name', d.name, 'rarity_code', d.rarity_code, 'art_url', d.art_url,
        'probability', round(o.probability, 6)
      ) order by o.rarity_rank desc, o.probability, d.name)
      from public.special_pack_card_odds(p_pack.id) o
      join public.card_definitions d on d.id = o.definition_id
    ), '[]'::jsonb)
  )
$$;

revoke execute on function public.special_pack_shop_payload(public.special_packs) from public, anon, authenticated;

-- Public: the special packs on sale now, first to end first.
create function public.get_special_packs()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.special_pack_shop_payload(p) order by p.ends_at nulls last, p.created_at), '[]'::jsonb)
  from public.special_packs p
  where public.special_pack_is_open(p)
$$;

revoke execute on function public.get_special_packs() from public;
grant execute on function public.get_special_packs() to anon, authenticated;

-- Buys and opens a special pack. p_version is the version the shop showed:
-- a pack changed since then is refused with "special_pack_changed".
create function public.buy_special_pack(p_pack_id uuid, p_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_pack public.special_packs;
  v_opening uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- Lock the player so concurrent purchases cannot overdraw the balance.
  perform 1 from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  -- An admin change waits for this purchase, and the other way round.
  select * into v_pack from public.special_packs where id = p_pack_id for share;
  if v_pack.id is null or not public.special_pack_is_open(v_pack) then
    raise exception 'special_pack_unavailable';
  end if;
  if v_pack.version is distinct from p_version then
    raise exception 'special_pack_changed';
  end if;

  if public.coin_balance(v_uid) < v_pack.price then
    raise exception 'insufficient_coins';
  end if;

  v_opening := public.open_special_pack(v_uid, v_pack.id);
  insert into public.coin_ledger (user_id, amount, reason, ref_id)
  values (v_uid, -v_pack.price, 'pack_purchase', v_opening);

  return public.pack_opening_payload(v_opening);
end;
$$;

revoke execute on function public.buy_special_pack(uuid, integer) from public, anon;
grant execute on function public.buy_special_pack(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------

-- Every special pack, newest first, and the cards and rarities a pack can use.
create function public.admin_special_packs_payload()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'now', now(),
    'max_cards_per_pack', public.config_int('special_packs.max_cards_per_pack'),
    'rarities', coalesce((
      select jsonb_agg(jsonb_build_object('code', r.code, 'name', r.name, 'rank', r.rank, 'color', r.color) order by r.rank)
      from public.rarity_definitions r
    ), '[]'::jsonb),
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', d.code, 'name', d.name, 'rarity_code', d.rarity_code, 'art_url', d.art_url,
        'has_variants', exists (select 1 from public.card_variants v where v.definition_id = d.id and v.is_active)
      ) order by r.rank, d.name)
      from public.card_definitions d
      join public.rarity_definitions r on r.code = d.rarity_code
      where d.is_active and d.unlock_level is null
    ), '[]'::jsonb),
    'packs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'version', p.version,
        'name', p.name,
        'description', p.description,
        'color', p.color,
        'price', p.price,
        'cards_per_pack', p.cards_per_pack,
        'guaranteed_min_rarity_rank', p.guaranteed_min_rarity_rank,
        'variant_chance_percent', p.variant_chance_percent,
        'odds_mode', p.odds_mode,
        'starts_at', p.starts_at,
        'ends_at', p.ends_at,
        'is_active', p.is_active,
        'is_open', public.special_pack_is_open(p),
        'openings', (select count(*) from public.pack_openings o where o.special_pack_id = p.id),
        'cards', coalesce((
          select jsonb_agg(jsonb_build_object('code', d.code, 'percent', c.percent) order by d.code)
          from public.special_pack_cards c
          join public.card_definitions d on d.id = c.definition_id
          where c.pack_id = p.id
        ), '[]'::jsonb),
        'rarities', coalesce((
          select jsonb_agg(jsonb_build_object('code', sr.rarity_code, 'percent', sr.percent) order by sr.rarity_code)
          from public.special_pack_rarities sr
          where sr.pack_id = p.id
        ), '[]'::jsonb)
      ) order by p.created_at desc)
      from public.special_packs p
    ), '[]'::jsonb)
  )
$$;

revoke execute on function public.admin_special_packs_payload() from public, anon, authenticated;

create function public.admin_list_special_packs()
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
  return public.admin_special_packs_payload();
end;
$$;

revoke execute on function public.admin_list_special_packs() from public, anon;
grant execute on function public.admin_list_special_packs() to authenticated;

-- Creates a special pack (no p_id) or changes one; every change raises its
-- version, so a shop showing the old one cannot buy it. Times are wall-clock
-- times in Europe/Rome, both optional.
-- p_cards: [{"code": "P051", "percent": 12.5}, …] (percent only in 'card' mode)
-- p_rarities: [{"code": "beta", "percent": 30}, …] ('rarity' mode only)
-- Percentages have two decimals and add up to exactly 100.
create function public.admin_save_special_pack(
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
  if p_color is null or p_color not in ('magenta', 'cyan', 'yellow', 'orange', 'violet', 'green')
     or p_odds_mode is null or p_odds_mode not in ('rarity', 'card')
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

-- Takes a pack off the shop, or puts it back.
create function public.admin_set_special_pack_active(p_id uuid, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if p_active is null then
    raise exception 'special_pack_invalid_numbers';
  end if;
  update public.special_packs set is_active = p_active, updated_at = now() where id = p_id;
  if not found then
    raise exception 'special_pack_not_found';
  end if;
  return public.admin_special_packs_payload();
end;
$$;

revoke execute on function public.admin_set_special_pack_active(uuid, boolean) from public, anon;
grant execute on function public.admin_set_special_pack_active(uuid, boolean) to authenticated;

-- Deletes a pack nobody opened; an opened one can only be deactivated.
create function public.admin_delete_special_pack(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  perform 1 from public.special_packs where id = p_id for update;
  if not found then
    raise exception 'special_pack_not_found';
  end if;
  if exists (select 1 from public.pack_openings o where o.special_pack_id = p_id) then
    raise exception 'special_pack_has_openings';
  end if;
  delete from public.special_packs where id = p_id;
  return public.admin_special_packs_payload();
end;
$$;

revoke execute on function public.admin_delete_special_pack(uuid) from public, anon;
grant execute on function public.admin_delete_special_pack(uuid) to authenticated;
