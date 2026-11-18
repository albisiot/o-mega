-- Variant draws the admins can shape (SPEC §4.6, §7.1):
--   * special packs made only of variants, of chosen styles, with a preference for
--     the variants the player does not have yet;
--   * events that raise the variant chance of every standard pack while they run
--     ("Caccia alle varianti");
--   * the global variant chance, set from /gestione-ricompense like the other
--     reward settings.
-- As before, the character is drawn first and the variant after: none of this
-- changes the odds of a rarity or of a character.

-- ---------------------------------------------------------------------------
-- Events: "Caccia alle varianti"
-- ---------------------------------------------------------------------------

-- Null: the event leaves the variant chance alone.
alter table public.events add column variant_chance_percent integer
  check (variant_chance_percent is null or variant_chance_percent between 1 and 100);

-- The event running now that sets a variant chance, if any. Events never overlap
-- (admin_save_event), so there is at most one.
create function public.variant_event_now()
returns table (title text, chance integer)
language sql
stable
set search_path = ''
as $$
  select e.title, e.variant_chance_percent
  from public.events e
  where e.is_active and e.starts_at <= now() and e.ends_at > now() and e.variant_chance_percent is not null
  order by e.variant_chance_percent desc
  limit 1
$$;

revoke execute on function public.variant_event_now() from public, anon, authenticated;

-- The variant chance of the standard packs now: the global one, or the running
-- event's when it is higher. An event never lowers it.
create function public.variant_chance_now()
returns integer
language sql
stable
set search_path = ''
as $$
  select greatest(
    public.config_int('packs.variant_chance_percent'),
    coalesce((select x.chance from public.variant_event_now() x), 0)
  )
$$;

revoke execute on function public.variant_chance_now() from public, anon, authenticated;

-- Every pack opened with open_pack (daily, shop, rewards) now draws at the chance
-- of the moment. Special packs keep their own chance.
create or replace function public.draw_variant(p_definition_id uuid)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
begin
  return public.draw_variant_at(p_definition_id, public.variant_chance_now());
end;
$$;

-- Same as in 20261101230000_card_variants.sql, with the chance of the moment and,
-- during a "Caccia alle varianti", the usual chance and the event's title.
create or replace function public.get_pack_odds()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'cards_per_pack', public.config_int('packs.cards_per_pack'),
    'standard_pack_price', public.config_int('packs.standard_pack_price'),
    'guaranteed_min_rarity_rank', public.config_int('packs.guaranteed_min_rarity_rank'),
    'guaranteed_rarity_name', (
      select r.name from public.rarity_definitions r
      where r.rank = public.config_int('packs.guaranteed_min_rarity_rank')
    ),
    'variant_chance_percent', public.variant_chance_now(),
    'base_variant_chance_percent', public.config_int('packs.variant_chance_percent'),
    'variant_event', (
      select x.title from public.variant_event_now() x
      where x.chance > public.config_int('packs.variant_chance_percent')
    ),
    'characters_with_variants', (
      select count(distinct v.definition_id) from public.card_variants v where v.is_active
    ),
    'odds', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', w.code, 'name', w.name, 'rank', w.rank, 'color', w.color,
        'probability', round(w.probability, 4)
      ) order by w.rank)
      from (
        select e.*, e.drop_weight / sum(e.drop_weight) over () as probability
        from public.eligible_rarities() e
      ) w
    ), '[]'::jsonb)
  )
$$;

-- Same as in 20261117120000_quadrant_seal_target.sql, with the event's variant chance.
create or replace function public.event_payload(p_event_id uuid, p_user uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id,
    'title', e.title,
    'description', e.description,
    'starts_at', e.starts_at,
    'ends_at', e.ends_at,
    'points', e.points,
    'daily_cap', e.daily_cap,
    -- Quadrante: the first side with this many seals on the grid wins; null without a target.
    'quadrant_seal_target', e.quadrant_seal_target,
    -- "Caccia alle varianti": the variant chance of the standard packs while the event runs; null: unchanged.
    'variant_chance_percent', case when e.variant_chance_percent > public.config_int('packs.variant_chance_percent')
                                   then e.variant_chance_percent end,
    'base_variant_chance_percent', public.config_int('packs.variant_chance_percent'),
    -- Only teams of these characters earn points; [] admits everyone.
    'admitted', public.event_admitted_description(e.traits, e.rarities, e.factions),
    'admitted_characters', case when public.event_admits_everyone(e.traits, e.rarities, e.factions) then null
                                else public.event_admitted_count(e.traits, e.rarities, e.factions) end,
    'tiers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tier', t.tier,
        'points', t.points,
        'coins', t.coins,
        'packs', t.packs,
        'cards', (
          select coalesce(jsonb_agg(public.card_payload(u.definition_id) || coalesce((
            select jsonb_build_object(
              'art_url', v.art_url,
              'variant', jsonb_build_object('style', v.style, 'name', v.style_name)
            ) from public.card_variants v where v.id = u.variant_id
          ), '{}'::jsonb) order by u.ord), '[]'::jsonb)
          from unnest(t.card_definition_ids, t.card_variant_ids) with ordinality as u(definition_id, variant_id, ord)
        ),
        'reached', r.id is not null,
        'opening_ids', coalesce(to_jsonb(r.opening_ids), '[]'::jsonb),
        'seen', r.seen_at is not null
      ) order by t.tier)
      from public.event_tiers t
      left join public.event_rewards r on r.event_id = t.event_id and r.tier = t.tier and r.user_id = p_user
      where t.event_id = e.id
    ), '[]'::jsonb),
    'my_points', (select coalesce(sum(p.points), 0) from public.event_points p where p.event_id = e.id and p.user_id = p_user),
    'my_points_today', (
      select coalesce(sum(p.points), 0) from public.event_points p
      where p.event_id = e.id and p.user_id = p_user and public.game_day(p.created_at) = public.game_day()
    )
  )
  from public.events e
  where e.id = p_event_id
$$;

-- Same as in 20261117120000_quadrant_seal_target.sql, with each event's variant chance.
create or replace function public.admin_events_payload()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'now', now(),
    'trait_catalog', public.trait_catalog_payload(),
    'rarities', (
      select coalesce(jsonb_agg(jsonb_build_object('code', r.code, 'name', r.name, 'rank', r.rank, 'color', r.color) order by r.rank), '[]'::jsonb)
      from public.rarity_definitions r
    ),
    'min_admitted_characters', public.config_int('events.min_admitted_characters'),
    'quadrant_seal_target', jsonb_build_object(
      'min', public.config_int('quadrant.seal_target.min'),
      'max', public.config_int('quadrant.seal_target.max'),
      'suggested', public.config_int('quadrant.seal_target.suggested')
    ),
    'base_variant_chance_percent', public.config_int('packs.variant_chance_percent'),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'title', e.title,
        'description', e.description,
        'starts_at', e.starts_at,
        'ends_at', e.ends_at,
        'points', e.points,
        'daily_cap', e.daily_cap,
        'quadrant_seal_target', e.quadrant_seal_target,
        'variant_chance_percent', e.variant_chance_percent,
        'traits', to_jsonb(e.traits),
        'rarities', to_jsonb(e.rarities),
        'factions', to_jsonb(e.factions),
        'is_active', e.is_active,
        'players', (select count(distinct p.user_id) from public.event_points p where p.event_id = e.id),
        'tiers', coalesce((
          select jsonb_agg(jsonb_build_object(
            'tier', t.tier,
            'points', t.points,
            'coins', t.coins,
            'packs', t.packs,
            'card_codes', (
              select coalesce(jsonb_agg(d.code || coalesce(':' || v.style, '') order by u.ord), '[]'::jsonb)
              from unnest(t.card_definition_ids, t.card_variant_ids) with ordinality as u(id, variant_id, ord)
              join public.card_definitions d on d.id = u.id
              left join public.card_variants v on v.id = u.variant_id
            ),
            'card_names', (
              select coalesce(jsonb_agg(d.name || coalesce(' (' || v.style_name || ')', '') order by u.ord), '[]'::jsonb)
              from unnest(t.card_definition_ids, t.card_variant_ids) with ordinality as u(id, variant_id, ord)
              join public.card_definitions d on d.id = u.id
              left join public.card_variants v on v.id = u.variant_id
            ),
            'reached', (select count(*) from public.event_rewards r where r.event_id = t.event_id and r.tier = t.tier)
          ) order by t.tier)
          from public.event_tiers t where t.event_id = e.id
        ), '[]'::jsonb)
      ) order by e.starts_at desc)
      from public.events e
    ), '[]'::jsonb),
    'cards', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', d.code,
        'name', d.name,
        'rarity', r.name,
        'rarity_code', d.rarity_code,
        'faction', d.faction,
        'traits', public.card_trait_codes(d.id),
        'variants', (
          select coalesce(jsonb_agg(jsonb_build_object('style', v.style, 'name', v.style_name) order by v.style_name), '[]'::jsonb)
          from public.card_variants v where v.definition_id = d.id and v.is_active
        )
      ) order by d.name), '[]'::jsonb)
      from public.card_definitions d
      join public.rarity_definitions r on r.code = d.rarity_code
      where d.is_active and d.unlock_level is null
    )
  )
$$;

drop function public.admin_save_event(text, text, timestamp, timestamp, jsonb, jsonb, integer, uuid, text[], text[], text[], integer);

-- Same as in 20261117120000_quadrant_seal_target.sql, with the variant chance. Like
-- the other rules, it is fixed once the event has started.
create function public.admin_save_event(
  p_title text,
  p_description text,
  p_starts_at timestamp,
  p_ends_at timestamp,
  p_points jsonb,
  p_tiers jsonb,
  p_daily_cap integer default null,
  p_id uuid default null,
  p_traits text[] default '{}',
  p_rarities text[] default '{}',
  p_factions text[] default '{}',
  p_quadrant_seal_target integer default null,
  p_variant_chance_percent integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_zone text := public.config_text('time.daily_reset_time_zone');
  v_title text := trim(coalesce(p_title, ''));
  v_description text := trim(coalesce(p_description, ''));
  v_starts timestamptz := p_starts_at at time zone v_zone;
  v_ends timestamptz := p_ends_at at time zone v_zone;
  v_event public.events;
  v_started boolean := false;
  v_id uuid := p_id;
  v_tier jsonb;
  v_index integer := 0;
  v_previous integer := 0;
  v_tier_points integer;
  v_coins integer;
  v_packs integer;
  v_cards record;
  v_traits text[] := array(select distinct t from unnest(coalesce(p_traits, '{}')) as t where t <> '' order by t);
  v_rarities text[] := array(select distinct r from unnest(coalesce(p_rarities, '{}')) as r where r <> '' order by r);
  v_factions text[] := array(select distinct f from unnest(coalesce(p_factions, '{}')) as f where f <> '' order by f);
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  -- One save at a time, so two events cannot be made to overlap.
  perform pg_advisory_xact_lock(hashtext('public.events'));

  if p_id is not null then
    select * into v_event from public.events where id = p_id for update;
    if v_event.id is null then
      raise exception 'event_not_found';
    end if;
    if v_event.ends_at <= now() then
      raise exception 'event_ended';
    end if;
    v_started := v_event.starts_at <= now();
    if v_started then
      v_starts := v_event.starts_at;
    end if;
  end if;

  if char_length(v_title) not between 3 and 60 or char_length(v_description) > 500 then
    raise exception 'event_invalid_text';
  end if;
  if v_starts is null or v_ends is null or v_ends <= v_starts or v_ends <= now()
     or v_ends - v_starts > interval '90 days' then
    raise exception 'event_invalid_period';
  end if;
  if exists (
    select 1 from public.events e
    where e.is_active and e.id is distinct from p_id and e.starts_at < v_ends and e.ends_at > v_starts
  ) then
    raise exception 'event_overlap';
  end if;

  if v_started then
    update public.events
    set title = v_title, description = v_description, ends_at = v_ends
    where id = p_id;
    return public.admin_events_payload();
  end if;

  -- Admitted characters: known traits, rarities and factions, and enough
  -- characters for an Emergenza squad.
  if exists (select 1 from unnest(v_traits) as t where not exists (select 1 from public.traits x where x.code = t))
     or exists (select 1 from unnest(v_rarities) as r where not exists (select 1 from public.rarity_definitions x where x.code = r))
     or exists (select 1 from unnest(v_factions) as f where f not in ('heroes', 'villains', 'neutrals'))
     or (not public.event_admits_everyone(v_traits, v_rarities, v_factions)
         and public.event_admitted_count(v_traits, v_rarities, v_factions) < public.config_int('events.min_admitted_characters')) then
    raise exception 'event_invalid_traits';
  end if;

  if p_daily_cap is not null and (p_daily_cap < 1 or p_daily_cap > 100000) then
    raise exception 'event_invalid_points';
  end if;
  if p_quadrant_seal_target is not null and p_quadrant_seal_target not between
     public.config_int('quadrant.seal_target.min') and public.config_int('quadrant.seal_target.max') then
    raise exception 'event_invalid_seal_target';
  end if;
  if p_variant_chance_percent is not null and p_variant_chance_percent not between 1 and 100 then
    raise exception 'event_invalid_variant_chance';
  end if;
  if jsonb_typeof(p_tiers) is distinct from 'array'
     or jsonb_array_length(p_tiers) not between 1 and public.config_int('events.max_tiers') then
    raise exception 'event_invalid_tiers';
  end if;

  if v_id is null then
    insert into public.events (title, description, starts_at, ends_at, points, daily_cap, traits, rarities, factions,
                               quadrant_seal_target, variant_chance_percent, created_by)
    values (v_title, v_description, v_starts, v_ends, public.event_points_rules(p_points), p_daily_cap,
            v_traits, v_rarities, v_factions, p_quadrant_seal_target, p_variant_chance_percent, auth.uid())
    returning id into v_id;
  else
    update public.events
    set title = v_title, description = v_description, starts_at = v_starts, ends_at = v_ends,
        points = public.event_points_rules(p_points), daily_cap = p_daily_cap,
        traits = v_traits, rarities = v_rarities, factions = v_factions,
        quadrant_seal_target = p_quadrant_seal_target, variant_chance_percent = p_variant_chance_percent
    where id = v_id;
    delete from public.event_tiers where event_id = v_id;
  end if;

  for v_tier in select value from jsonb_array_elements(p_tiers) loop
    v_index := v_index + 1;
    begin
      v_tier_points := (v_tier ->> 'points')::integer;
      v_coins := coalesce((v_tier ->> 'coins')::integer, 0);
      v_packs := coalesce((v_tier ->> 'packs')::integer, 0);
    exception when others then
      raise exception 'event_invalid_tiers';
    end;
    -- Each target further than the one before.
    if v_tier_points is null or v_tier_points <= v_previous or v_tier_points > 1000000
       or v_coins not between 0 and 100000 or v_packs not between 0 and 10
       or jsonb_array_length(coalesce(v_tier -> 'cards', '[]')) > 10 then
      raise exception 'event_invalid_tiers';
    end if;
    select * into v_cards from public.event_reward_cards(
      array(select jsonb_array_elements_text(coalesce(v_tier -> 'cards', '[]')))
    );
    if v_coins = 0 and v_packs = 0 and cardinality(v_cards.definition_ids) = 0 then
      raise exception 'event_tier_no_reward';
    end if;
    insert into public.event_tiers (event_id, tier, points, coins, packs, card_definition_ids, card_variant_ids)
    values (v_id, v_index, v_tier_points, v_coins, v_packs, v_cards.definition_ids, v_cards.variant_ids);
    v_previous := v_tier_points;
  end loop;

  return public.admin_events_payload();
end;
$$;

revoke execute on function public.admin_save_event(text, text, timestamp, timestamp, jsonb, jsonb, integer, uuid, text[], text[], text[], integer, integer) from public, anon;
grant execute on function public.admin_save_event(text, text, timestamp, timestamp, jsonb, jsonb, integer, uuid, text[], text[], text[], integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Special packs: only variants, chosen styles, new variants first
-- ---------------------------------------------------------------------------

alter table public.special_packs
  -- Every card comes as a variant, and only characters with one of the pack's
  -- variants can be drawn.
  add column variants_only boolean not null default false,
  -- The styles a variant of this pack can have; empty: any style.
  add column variant_styles text[] not null default '{}',
  -- Among a character's variants, those the player lacks come first.
  add column prefer_new_variants boolean not null default false;

-- Same as in 20261110160000_special_packs.sql: a pack of only variants leaves
-- out the characters with none of its variants (none at all, or none of its
-- styles), and their share goes to the others.
create or replace function public.special_pack_card_odds(p_pack_id uuid)
returns table (definition_id uuid, rarity_rank integer, probability numeric)
language sql
stable
set search_path = ''
as $$
  with pack as (
    select p.odds_mode, p.variants_only, p.variant_styles from public.special_packs p where p.id = p_pack_id
  ), cards as (
    select c.definition_id, d.rarity_code, r.rank, c.percent
    from public.special_pack_cards c
    join public.card_definitions d on d.id = c.definition_id
    join public.rarity_definitions r on r.code = d.rarity_code
    cross join pack
    where c.pack_id = p_pack_id and d.is_active and d.unlock_level is null
      and (not pack.variants_only or exists (
        select 1 from public.card_variants v
        where v.definition_id = c.definition_id and v.is_active
          and (cardinality(pack.variant_styles) = 0 or v.style = any (pack.variant_styles))
      ))
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

-- The variant of a card drawn from a special pack, or null for the base drawing:
-- at the pack's chance (always, for a pack of only variants), among the pack's
-- styles, and with the preference the player's missing variants first. The card
-- is already drawn: this roll cannot change its odds.
create function public.draw_special_pack_variant(p_user uuid, p_pack public.special_packs, p_definition_id uuid)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_chance integer := case when p_pack.variants_only then 100 else p_pack.variant_chance_percent end;
  v_variant uuid;
begin
  if v_chance <= 0 or random() * 100 >= v_chance then
    return null;
  end if;
  select v.id into v_variant
  from public.card_variants v
  where v.definition_id = p_definition_id and v.is_active
    and (cardinality(p_pack.variant_styles) = 0 or v.style = any (p_pack.variant_styles))
  order by
    case when p_pack.prefer_new_variants and exists (
      select 1 from public.card_instances i where i.owner_id = p_user and i.variant_id = v.id
    ) then 1 else 0 end,
    random()
  limit 1;
  return v_variant;
end;
$$;

revoke execute on function public.draw_special_pack_variant(uuid, public.special_packs, uuid) from public, anon, authenticated;

-- Same as in 20261110160000_special_packs.sql, with the pack's variant rules.
create or replace function public.open_special_pack(p_user uuid, p_pack_id uuid)
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

    -- Inserted one by one: with the preference, a later card of the pack already
    -- counts the variants the earlier ones gave.
    insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
    values (v_definition, p_user, 'pack', public.draw_special_pack_variant(p_user, v_pack, v_definition))
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

-- Same as in 20261110160000_special_packs.sql, with the variant rules the shop
-- states: only variants, the styles' names, the preference.
create or replace function public.special_pack_shop_payload(p_pack public.special_packs)
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
    'variant_chance_percent', case when p_pack.variants_only then 100 else p_pack.variant_chance_percent end,
    'variants_only', p_pack.variants_only,
    'prefer_new_variants', p_pack.prefer_new_variants,
    'variant_style_names', coalesce((
      select jsonb_agg(x.name order by x.name)
      from (
        select distinct v.style_name as name from public.card_variants v
        where v.style = any (p_pack.variant_styles) and v.is_active
      ) x
    ), '[]'::jsonb),
    'characters_with_variants', (
      select count(distinct v.definition_id)
      from public.special_pack_card_odds(p_pack.id) o
      join public.card_variants v on v.definition_id = o.definition_id and v.is_active
      where cardinality(p_pack.variant_styles) = 0 or v.style = any (p_pack.variant_styles)
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

-- Same as in 20261110210000_trait_filters.sql, with the variant styles: every
-- style in the catalog, those of each card and the pack's own rules.
create or replace function public.admin_special_packs_payload()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'now', now(),
    'max_cards_per_pack', public.config_int('special_packs.max_cards_per_pack'),
    'trait_catalog', public.trait_catalog_payload(),
    'rarities', coalesce((
      select jsonb_agg(jsonb_build_object('code', r.code, 'name', r.name, 'rank', r.rank, 'color', r.color) order by r.rank)
      from public.rarity_definitions r
    ), '[]'::jsonb),
    'variant_styles', coalesce((
      select jsonb_agg(jsonb_build_object('style', x.style, 'name', x.name, 'characters', x.characters) order by x.name)
      from (
        select v.style, min(v.style_name) as name, count(distinct v.definition_id) as characters
        from public.card_variants v
        join public.card_definitions d on d.id = v.definition_id
        where v.is_active and d.is_active and d.unlock_level is null
        group by v.style
      ) x
    ), '[]'::jsonb),
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', d.code, 'name', d.name, 'rarity_code', d.rarity_code, 'art_url', d.art_url,
        'has_variants', exists (select 1 from public.card_variants v where v.definition_id = d.id and v.is_active),
        'variant_styles', coalesce((
          select jsonb_agg(v.style order by v.style)
          from public.card_variants v where v.definition_id = d.id and v.is_active
        ), '[]'::jsonb),
        'traits', public.card_trait_codes(d.id)
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
        'variants_only', p.variants_only,
        'variant_styles', to_jsonb(p.variant_styles),
        'prefer_new_variants', p.prefer_new_variants,
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

drop function public.admin_save_special_pack(text, text, text, integer, integer, integer, text, jsonb, jsonb, integer, timestamp, timestamp, uuid);

-- Same as in 20261116230000_special_pack_colors.sql, with the variant rules. The
-- styles must exist; a pack of only variants takes only characters with one of
-- its variants, and its chance is stored as 100.
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
  p_id uuid default null,
  p_variants_only boolean default false,
  p_variant_styles text[] default '{}',
  p_prefer_new_variants boolean default false
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
  v_only boolean := coalesce(p_variants_only, false);
  v_styles text[] := array(select distinct s from unnest(coalesce(p_variant_styles, '{}')) as s where s <> '' order by s);
  v_prefer boolean := coalesce(p_prefer_new_variants, false);
  v_chance integer;
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
  v_chance := case when v_only then 100 else p_variant_chance_percent end;
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

  -- The styles: each one an active variant style.
  if exists (
    select 1 from unnest(v_styles) as s
    where not exists (select 1 from public.card_variants v where v.style = s and v.is_active)
  ) then
    raise exception 'special_pack_invalid_styles';
  end if;
  -- Only variants: every card has a variant the pack can give.
  if v_only and exists (
    select 1 from jsonb_array_elements(v_cards) c
    join public.card_definitions d on d.code = c ->> 'code'
    where not exists (
      select 1 from public.card_variants v
      where v.definition_id = d.id and v.is_active
        and (cardinality(v_styles) = 0 or v.style = any (v_styles))
    )
  ) then
    raise exception 'special_pack_card_without_variant';
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
      variant_chance_percent, variants_only, variant_styles, prefer_new_variants,
      odds_mode, starts_at, ends_at, created_by
    ) values (
      v_name, v_description, p_color, p_price, p_cards_per_pack, p_guaranteed_min_rarity_rank,
      v_chance, v_only, v_styles, v_prefer,
      p_odds_mode, v_starts, v_ends, auth.uid()
    )
    returning id into v_id;
  else
    update public.special_packs
    set name = v_name, description = v_description, color = p_color, price = p_price,
        cards_per_pack = p_cards_per_pack, guaranteed_min_rarity_rank = p_guaranteed_min_rarity_rank,
        variant_chance_percent = v_chance, variants_only = v_only, variant_styles = v_styles,
        prefer_new_variants = v_prefer, odds_mode = p_odds_mode,
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

revoke execute on function public.admin_save_special_pack(text, text, text, integer, integer, integer, text, jsonb, jsonb, integer, timestamp, timestamp, uuid, boolean, text[], boolean) from public, anon;
grant execute on function public.admin_save_special_pack(text, text, text, integer, integer, integer, text, jsonb, jsonb, integer, timestamp, timestamp, uuid, boolean, text[], boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- The global variant chance, from /gestione-ricompense
-- ---------------------------------------------------------------------------

-- Same list as in 20261118200000_emergency_week.sql, with the variant chance of
-- the standard packs (balance.ts packs.variantChancePercent is its default).
create or replace function public.match_reward_setting_bounds()
returns table (key text, min_value integer, max_value integer)
language sql
immutable
set search_path = ''
as $$
  values
    ('match_rewards.daily_coin_cap', 0, 100000),
    ('match_rewards.daily_pack_cap', 0, 20),
    ('conquest.no_card_bonus_coins', 0, 10000),
    ('emergency.rewards.finish_xp', 0, 10000),
    ('emergency.rewards.tier1_passed', 1, 100),
    ('emergency.rewards.tier2_passed', 1, 100),
    ('emergency.rewards.tier3_passed', 1, 100),
    ('emergency.rewards.tier1_coins', 1, 10000),
    ('emergency.rewards.tier2_coins', 1, 10000),
    ('emergency.rewards.tier3_coins', 1, 10000),
    ('emergency.prizes.min_passed', 0, 100),
    ('emergency.prizes.rank1_coins', 0, 10000),
    ('emergency.prizes.rank1_packs', 0, 3),
    ('emergency.prizes.rank2_coins', 0, 10000),
    ('emergency.prizes.rank2_packs', 0, 3),
    ('emergency.prizes.rank3_coins', 0, 10000),
    ('emergency.prizes.rank3_packs', 0, 3),
    ('emergency.prizes.others_coins', 0, 10000),
    ('emergency.prizes.others_packs', 0, 3),
    ('emergency_week.rewards.tier1_passed', 1, 100),
    ('emergency_week.rewards.tier2_passed', 1, 100),
    ('emergency_week.rewards.tier3_passed', 1, 100),
    ('emergency_week.rewards.tier1_coins', 1, 10000),
    ('emergency_week.rewards.tier2_coins', 1, 10000),
    ('emergency_week.rewards.tier3_coins', 1, 10000),
    ('emergency_week.prizes.min_passed', 0, 100),
    ('emergency_week.prizes.rank1_coins', 0, 10000),
    ('emergency_week.prizes.rank1_packs', 0, 3),
    ('emergency_week.prizes.rank2_coins', 0, 10000),
    ('emergency_week.prizes.rank2_packs', 0, 3),
    ('emergency_week.prizes.rank3_coins', 0, 10000),
    ('emergency_week.prizes.rank3_packs', 0, 3),
    ('emergency_week.prizes.others_coins', 0, 10000),
    ('emergency_week.prizes.others_packs', 0, 3),
    ('packs.variant_chance_percent', 0, 100)
$$;
