-- A reward of random variants (SPEC §8.1–8.5): bonus codes, event targets, daily
-- objectives and imprese can give "N varianti a caso", optionally only of some
-- styles and rarities, instead of (or besides) variants chosen one by one. The
-- server draws them when the reward is paid, among the active variants of
-- active characters that are not level cards, the player's missing ones first,
-- each variant at most once per reward.
--
-- A reward stores its rule as {"count": 1-5, "styles": [...], "rarities": [...]}
-- in a random_variants column (null: none). Objectives and imprese copy it when
-- handed out or completed, as they copy the rest of their reward.

-- ---------------------------------------------------------------------------
-- The rule, its description and the draw
-- ---------------------------------------------------------------------------

-- Checks a rule from an editor and returns it tidy, or null for none (no rule,
-- or a count of 0). Unknown styles or rarities, or fewer matching variants than
-- the count, are refused.
create function public.random_variants_spec(p_spec jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_count integer;
  v_styles text[];
  v_rarities text[];
begin
  if p_spec is null or jsonb_typeof(p_spec) = 'null' then
    return null;
  end if;
  if jsonb_typeof(p_spec) <> 'object'
     or jsonb_typeof(p_spec -> 'count') is distinct from 'number'
     or jsonb_typeof(coalesce(p_spec -> 'styles', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_spec -> 'rarities', '[]'::jsonb)) <> 'array'
     or exists (select 1 from jsonb_array_elements(coalesce(p_spec -> 'styles', '[]'::jsonb)) x where jsonb_typeof(x) <> 'string')
     or exists (select 1 from jsonb_array_elements(coalesce(p_spec -> 'rarities', '[]'::jsonb)) x where jsonb_typeof(x) <> 'string') then
    raise exception 'invalid_random_variants';
  end if;
  begin
    v_count := (p_spec ->> 'count')::integer;
  exception when others then
    raise exception 'invalid_random_variants';
  end;
  if v_count = 0 then
    return null;
  end if;
  if v_count not between 1 and 5 or (p_spec ->> 'count')::numeric <> v_count then
    raise exception 'invalid_random_variants';
  end if;
  v_styles := array(
    select distinct s from jsonb_array_elements_text(coalesce(p_spec -> 'styles', '[]'::jsonb)) as s order by s
  );
  v_rarities := array(
    select distinct r from jsonb_array_elements_text(coalesce(p_spec -> 'rarities', '[]'::jsonb)) as r order by r
  );
  if exists (select 1 from unnest(v_styles) as s where not exists (select 1 from public.card_variants v where v.style = s and v.is_active))
     or exists (select 1 from unnest(v_rarities) as r where not exists (select 1 from public.rarity_definitions x where x.code = r)) then
    raise exception 'invalid_random_variants';
  end if;
  if (
    select count(*) from public.card_variants v
    join public.card_definitions d on d.id = v.definition_id
    where v.is_active and d.is_active and d.unlock_level is null
      and (cardinality(v_styles) = 0 or v.style = any (v_styles))
      and (cardinality(v_rarities) = 0 or d.rarity_code = any (v_rarities))
  ) < v_count then
    raise exception 'random_variants_empty';
  end if;
  return jsonb_build_object('count', v_count, 'styles', to_jsonb(v_styles), 'rarities', to_jsonb(v_rarities));
end;
$$;

revoke execute on function public.random_variants_spec(jsonb) from public, anon, authenticated;

-- The rule as players read it: the count, the styles' and rarities' names. Null: none.
create function public.random_variants_payload(p_spec jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case when p_spec is null then null else jsonb_build_object(
    'count', (p_spec ->> 'count')::integer,
    'styles', coalesce((
      select jsonb_agg(x.name order by x.name)
      from (
        select distinct v.style_name as name from public.card_variants v
        where v.is_active and v.style in (select jsonb_array_elements_text(coalesce(p_spec -> 'styles', '[]'::jsonb)))
      ) x
    ), '[]'::jsonb),
    'rarities', coalesce((
      select jsonb_agg(r.name order by r.rank)
      from public.rarity_definitions r
      where r.code in (select jsonb_array_elements_text(coalesce(p_spec -> 'rarities', '[]'::jsonb)))
    ), '[]'::jsonb)
  ) end
$$;

revoke execute on function public.random_variants_payload(jsonb) from public, anon, authenticated;

-- Gives the player the variants of a rule: copies like any other reward card,
-- logged in card_transfers with the reward's reason (p_via). Different variants,
-- those the player lacks first. is_new: the player had no copy of the character.
create function public.grant_random_variants(p_user uuid, p_spec jsonb, p_via text)
returns table (instance_id uuid, is_new boolean)
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_count integer := coalesce((p_spec ->> 'count')::integer, 0);
  v_styles text[] := array(select jsonb_array_elements_text(coalesce(p_spec -> 'styles', '[]'::jsonb)));
  v_rarities text[] := array(select jsonb_array_elements_text(coalesce(p_spec -> 'rarities', '[]'::jsonb)));
  v_pick record;
  v_new boolean;
  v_instance uuid;
begin
  if p_spec is null or v_count <= 0 then
    return;
  end if;
  for v_pick in
    select v.id, v.definition_id
    from public.card_variants v
    join public.card_definitions d on d.id = v.definition_id
    where v.is_active and d.is_active and d.unlock_level is null
      and (cardinality(v_styles) = 0 or v.style = any (v_styles))
      and (cardinality(v_rarities) = 0 or d.rarity_code = any (v_rarities))
    order by exists (select 1 from public.card_instances i where i.owner_id = p_user and i.variant_id = v.id), random()
    limit v_count
  loop
    v_new := not exists (
      select 1 from public.card_instances i where i.owner_id = p_user and i.definition_id = v_pick.definition_id
    );
    insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
    values (v_pick.definition_id, p_user, p_via, v_pick.id)
    returning id into v_instance;
    insert into public.card_transfers (instance_id, from_user, to_user, reason)
    values (v_instance, null, p_user, p_via);
    instance_id := v_instance;
    is_new := v_new;
    return next;
  end loop;
end;
$$;

revoke execute on function public.grant_random_variants(uuid, jsonb, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Where the rule is kept
-- ---------------------------------------------------------------------------

alter table public.bonus_codes add column random_variants jsonb;
alter table public.event_tiers add column random_variants jsonb;
alter table public.daily_objective_definitions add column random_variants jsonb;
alter table public.daily_objectives add column random_variants jsonb;
alter table public.achievements add column random_variants jsonb;
alter table public.player_achievements add column random_variants jsonb;

-- A reward of random variants alone is a reward.
alter table public.bonus_codes drop constraint bonus_codes_has_reward;
alter table public.bonus_codes add constraint bonus_codes_has_reward
  check (coins > 0 or packs > 0 or cardinality(card_definition_ids) > 0 or random_variants is not null);
alter table public.event_tiers drop constraint event_tiers_has_reward;
alter table public.event_tiers add constraint event_tiers_has_reward
  check (coins > 0 or packs > 0 or cardinality(card_definition_ids) > 0 or random_variants is not null);
alter table public.daily_objective_definitions drop constraint daily_objective_definitions_has_reward;
alter table public.daily_objective_definitions add constraint daily_objective_definitions_has_reward
  check (coalesce(coins, 1) > 0 or packs > 0 or cardinality(card_definition_ids) > 0 or random_variants is not null);

-- ---------------------------------------------------------------------------
-- Bonus codes
-- ---------------------------------------------------------------------------

drop function public.create_bonus_code(text, integer, integer, text[], integer, timestamptz, text);

-- Same as in 20261105100000_bonus_code_variants.sql, with the random variants
-- (already checked by random_variants_spec).
create function public.create_bonus_code(
  p_code text,
  p_coins integer default 0,
  p_packs integer default 0,
  p_card_codes text[] default '{}',
  p_max_uses integer default null,
  p_expires_at timestamptz default null,
  p_note text default null,
  p_random_variants jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card_code text;
  v_style text;
  v_definition uuid;
  v_variant uuid;
  v_definitions uuid[] := '{}';
  v_variants uuid[] := '{}';
  v_id uuid;
begin
  foreach v_card_code in array p_card_codes loop
    v_style := nullif(split_part(v_card_code, ':', 2), '');
    -- Level cards are earned by levelling up.
    select d.id into v_definition
    from public.card_definitions d
    where d.code = split_part(v_card_code, ':', 1) and d.is_active and d.unlock_level is null;
    if not found then
      raise exception 'card % does not exist or cannot be given by a code', v_card_code;
    end if;

    v_variant := null;
    if v_style is not null then
      select v.id into v_variant
      from public.card_variants v
      where v.definition_id = v_definition and v.style = v_style and v.is_active;
      if not found then
        raise exception 'card % has no variant %', split_part(v_card_code, ':', 1), v_style;
      end if;
    end if;

    v_definitions := v_definitions || v_definition;
    v_variants := v_variants || v_variant;
  end loop;

  insert into public.bonus_codes (code, coins, packs, card_definition_ids, card_variant_ids, max_uses, expires_at, note,
                                  random_variants)
  values (upper(trim(p_code)), p_coins, p_packs, v_definitions, v_variants, p_max_uses, p_expires_at, p_note,
          p_random_variants)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.create_bonus_code(text, integer, integer, text[], integer, timestamptz, text, jsonb)
  from public, anon, authenticated;

drop function public.admin_create_bonus_code(text, integer, integer, text[], integer, date, text);

-- Same as in 20261102130000_bonus_code_admin.sql, with the random variants.
create function public.admin_create_bonus_code(
  p_code text,
  p_coins integer default 0,
  p_packs integer default 0,
  p_card_codes text[] default '{}',
  p_max_uses integer default null,
  p_expires_on date default null,
  p_note text default null,
  p_random_variants jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  v_random jsonb;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if v_code !~ '^[A-Z0-9_-]{3,32}$' then
    raise exception 'bonus_code_invalid_format';
  end if;
  if p_coins < 0 or p_packs < 0 or p_max_uses < 1 then
    raise exception 'bonus_code_invalid_limits';
  end if;
  v_random := public.random_variants_spec(p_random_variants);
  if p_coins = 0 and p_packs = 0 and cardinality(p_card_codes) = 0 and v_random is null then
    raise exception 'bonus_code_no_reward';
  end if;
  if p_expires_on < public.game_day() then
    raise exception 'bonus_code_invalid_expiry';
  end if;

  begin
    perform public.create_bonus_code(
      v_code, p_coins, p_packs, p_card_codes, p_max_uses,
      (p_expires_on + 1)::timestamp at time zone 'Europe/Rome',
      nullif(trim(p_note), ''),
      v_random
    );
  exception
    when unique_violation then
      raise exception 'bonus_code_duplicate';
    when raise_exception then
      raise exception 'bonus_code_card_unavailable';
  end;

  return public.admin_bonus_codes_payload();
end;
$$;

revoke execute on function public.admin_create_bonus_code(text, integer, integer, text[], integer, date, text, jsonb) from public, anon;
grant execute on function public.admin_create_bonus_code(text, integer, integer, text[], integer, date, text, jsonb) to authenticated;

-- Same as in 20261105100000_bonus_code_variants.sql, with the random variants
-- among the cards shown like a pack.
create or replace function public.redeem_bonus_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_input text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  v_code public.bonus_codes;
  v_redemption uuid := gen_random_uuid();
  v_opening uuid;
  v_openings uuid[] := '{}';
  v_definition uuid;
  v_instance uuid;
  v_instance_ids uuid[] := '{}';
  v_new_ids uuid[] := '{}';
  v_random record;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- Lock the player so concurrent attempts cannot get past the limit.
  perform 1 from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  if (
    select count(*) from public.bonus_code_failed_attempts a
    where a.user_id = v_uid and a.attempted_at > now() - interval '1 hour'
  ) >= public.config_int('bonus_codes.max_failed_attempts_per_hour') then
    raise exception 'bonus_code_too_many_attempts';
  end if;

  -- Lock the code so concurrent redemptions cannot exceed max_uses.
  select * into v_code from public.bonus_codes c where c.code = v_input and c.is_active for update;
  if not found then
    insert into public.bonus_code_failed_attempts (user_id) values (v_uid);
    return jsonb_build_object('error', 'bonus_code_invalid');
  end if;

  if v_code.expires_at is not null and v_code.expires_at <= now() then
    raise exception 'bonus_code_expired';
  end if;
  if exists (
    select 1 from public.bonus_code_redemptions r where r.code_id = v_code.id and r.user_id = v_uid
  ) then
    raise exception 'bonus_code_already_redeemed';
  end if;
  if v_code.max_uses is not null and (
    select count(*) from public.bonus_code_redemptions r where r.code_id = v_code.id
  ) >= v_code.max_uses then
    raise exception 'bonus_code_exhausted';
  end if;

  if v_code.coins > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id)
    values (v_uid, v_code.coins, 'bonus_code', v_redemption);
  end if;

  -- The chosen cards are shown like a pack, with the same reveal.
  for i in 1..coalesce(cardinality(v_code.card_definition_ids), 0) loop
    v_definition := v_code.card_definition_ids[i];
    insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
    values (v_definition, v_uid, 'bonus_code', v_code.card_variant_ids[i])
    returning id into v_instance;

    insert into public.card_transfers (instance_id, from_user, to_user, reason)
    values (v_instance, null, v_uid, 'bonus_code');

    if (select count(*) from public.card_instances i where i.owner_id = v_uid and i.definition_id = v_definition) = 1 then
      v_new_ids := v_new_ids || v_instance;
    end if;
    v_instance_ids := v_instance_ids || v_instance;
  end loop;

  for v_random in select * from public.grant_random_variants(v_uid, v_code.random_variants, 'bonus_code') loop
    if v_random.is_new then
      v_new_ids := v_new_ids || v_random.instance_id;
    end if;
    v_instance_ids := v_instance_ids || v_random.instance_id;
  end loop;

  if cardinality(v_instance_ids) > 0 then
    insert into public.pack_openings (user_id, pack_type, card_instance_ids, new_card_instance_ids)
    values (v_uid, 'bonus', v_instance_ids, v_new_ids)
    returning id into v_opening;
    v_openings := v_openings || v_opening;
  end if;

  for i in 1..v_code.packs loop
    v_openings := v_openings || public.open_pack(v_uid, 'standard');
  end loop;

  insert into public.bonus_code_redemptions (id, code_id, user_id, opening_ids)
  values (v_redemption, v_code.id, v_uid, v_openings);

  return jsonb_build_object(
    'coins', v_code.coins,
    'cards', cardinality(v_instance_ids),
    'packs', v_code.packs,
    'openings', (
      select coalesce(jsonb_agg(public.pack_opening_payload(u.id) order by u.ord), '[]'::jsonb)
      from unnest(v_openings) with ordinality as u(id, ord)
    )
  );
end;
$$;

-- Same as in 20261105100000_bonus_code_variants.sql, with each code's random
-- variants (names) and the rarities a rule can name.
create or replace function public.admin_bonus_codes_payload()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'codes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'code', c.code,
        'coins', c.coins,
        'packs', c.packs,
        'card_names', (
          select coalesce(jsonb_agg(d.name || coalesce(' (' || v.style_name || ')', '') order by u.ord), '[]'::jsonb)
          from unnest(c.card_definition_ids, c.card_variant_ids) with ordinality as u(id, variant_id, ord)
          join public.card_definitions d on d.id = u.id
          left join public.card_variants v on v.id = u.variant_id
        ),
        'random_variants', public.random_variants_payload(c.random_variants),
        'max_uses', c.max_uses,
        'uses', (select count(*) from public.bonus_code_redemptions r where r.code_id = c.id),
        'expires_at', c.expires_at,
        'is_active', c.is_active,
        'note', c.note
      ) order by c.created_at desc)
      from public.bonus_codes c
    ), '[]'::jsonb),
    'rarities', (
      select coalesce(jsonb_agg(jsonb_build_object('code', r.code, 'name', r.name, 'rank', r.rank, 'color', r.color) order by r.rank), '[]'::jsonb)
      from public.rarity_definitions r
    ),
    'cards', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', d.code,
        'name', d.name,
        'rarity', r.name,
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

-- ---------------------------------------------------------------------------
-- Event targets
-- ---------------------------------------------------------------------------

-- Same as in 20261109200000_timed_events.sql, with the random variants.
create or replace function public.grant_event_tier(p_user uuid, p_tier public.event_tiers)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_reward uuid := gen_random_uuid();
  v_definition uuid;
  v_instance uuid;
  v_instance_ids uuid[] := '{}';
  v_new_ids uuid[] := '{}';
  v_opening uuid;
  v_openings uuid[] := '{}';
  v_random record;
begin
  insert into public.event_rewards (id, event_id, tier, user_id, coins, packs)
  values (v_reward, p_tier.event_id, p_tier.tier, p_user, p_tier.coins, p_tier.packs)
  on conflict do nothing;
  if not found then
    return; -- Already paid.
  end if;

  if p_tier.coins > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id)
    values (p_user, p_tier.coins, 'event_reward', v_reward);
  end if;

  for i in 1..coalesce(cardinality(p_tier.card_definition_ids), 0) loop
    v_definition := p_tier.card_definition_ids[i];
    insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
    values (v_definition, p_user, 'event', p_tier.card_variant_ids[i])
    returning id into v_instance;
    insert into public.card_transfers (instance_id, from_user, to_user, reason)
    values (v_instance, null, p_user, 'event');
    if (select count(*) from public.card_instances c where c.owner_id = p_user and c.definition_id = v_definition) = 1 then
      v_new_ids := v_new_ids || v_instance;
    end if;
    v_instance_ids := v_instance_ids || v_instance;
  end loop;

  for v_random in select * from public.grant_random_variants(p_user, p_tier.random_variants, 'event') loop
    if v_random.is_new then
      v_new_ids := v_new_ids || v_random.instance_id;
    end if;
    v_instance_ids := v_instance_ids || v_random.instance_id;
  end loop;

  if cardinality(v_instance_ids) > 0 then
    insert into public.pack_openings (user_id, pack_type, card_instance_ids, new_card_instance_ids)
    values (p_user, 'event', v_instance_ids, v_new_ids)
    returning id into v_opening;
    v_openings := v_openings || v_opening;
  end if;

  for i in 1..p_tier.packs loop
    v_openings := v_openings || public.open_pack(p_user, 'standard');
  end loop;

  update public.event_rewards set opening_ids = v_openings where id = v_reward;
end;
$$;

-- Same as in 20261118230000_variant_draws.sql, with each target's random variants.
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
        'random_variants', public.random_variants_payload(t.random_variants),
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

-- Same as in 20261118230000_variant_draws.sql, with each target's random variants
-- (as saved: style and rarity codes, for the form).
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
            'random_variants', t.random_variants,
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

-- Same as in 20261118230000_variant_draws.sql: each target can also hold a rule
-- of random variants (the key random_variants of the target).
create or replace function public.admin_save_event(
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
  v_random jsonb;
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
    v_random := public.random_variants_spec(v_tier -> 'random_variants');
    if v_coins = 0 and v_packs = 0 and cardinality(v_cards.definition_ids) = 0 and v_random is null then
      raise exception 'event_tier_no_reward';
    end if;
    insert into public.event_tiers (event_id, tier, points, coins, packs, card_definition_ids, card_variant_ids,
                                    random_variants)
    values (v_id, v_index, v_tier_points, v_coins, v_packs, v_cards.definition_ids, v_cards.variant_ids, v_random);
    v_previous := v_tier_points;
  end loop;

  return public.admin_events_payload();
end;
$$;

-- ---------------------------------------------------------------------------
-- Daily objectives
-- ---------------------------------------------------------------------------

-- Same as in 20261111100000_daily_objectives.sql, copying the random variants too.
create or replace function public.draw_daily_objective(p_user uuid, p_day date, p_difficulty text, p_slot integer)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_def public.daily_objective_definitions;
  v_id uuid;
begin
  select d.* into v_def
  from public.daily_objective_definitions d
  where d.is_active and d.difficulty = p_difficulty
    and not exists (
      select 1 from public.daily_objectives o
      where o.user_id = p_user and o.day = p_day
        and (o.definition_code = d.code or (o.replaced_at is null and o.metric = d.metric and o.params = d.params))
    )
  order by random()
  limit 1;
  if v_def.code is null then
    return null;
  end if;

  insert into public.daily_objectives (
    user_id, day, slot, definition_code, difficulty, title, metric, params, target,
    coins, packs, card_definition_ids, card_variant_ids, random_variants
  ) values (
    p_user, p_day, p_slot, v_def.code, v_def.difficulty, v_def.title, v_def.metric, v_def.params, v_def.target,
    coalesce(v_def.coins, public.config_int('daily_objectives.reward_coins.' || v_def.difficulty)),
    v_def.packs, v_def.card_definition_ids, v_def.card_variant_ids, v_def.random_variants
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Same as in 20261111100000_daily_objectives.sql, with the random variants.
create or replace function public.claim_daily_objective(p_objective_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_objective public.daily_objectives;
  v_instance uuid;
  v_instance_ids uuid[] := '{}';
  v_new_ids uuid[] := '{}';
  v_opening uuid;
  v_openings uuid[] := '{}';
  v_random record;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  select * into v_objective from public.daily_objectives o
  where o.id = p_objective_id and o.user_id = v_user
  for update;
  if v_objective.id is null or v_objective.replaced_at is not null then
    raise exception 'objective_not_found';
  end if;
  if v_objective.claimed_at is not null then
    raise exception 'objective_already_claimed';
  end if;
  if v_objective.day <> public.game_day() then
    raise exception 'objective_expired';
  end if;
  if v_objective.completed_at is null then
    raise exception 'objective_not_completed';
  end if;

  update public.daily_objectives set claimed_at = now()
  where id = v_objective.id and claimed_at is null;
  if not found then
    raise exception 'objective_already_claimed';
  end if;

  -- The packs below are a reward, not a pack the player opened.
  perform set_config('o_mega.objective_claim', 'on', true);

  if v_objective.coins > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id)
    values (v_user, v_objective.coins, 'objective_reward', v_objective.id);
  end if;

  for i in 1..coalesce(cardinality(v_objective.card_definition_ids), 0) loop
    insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
    values (v_objective.card_definition_ids[i], v_user, 'objective', v_objective.card_variant_ids[i])
    returning id into v_instance;
    insert into public.card_transfers (instance_id, from_user, to_user, reason)
    values (v_instance, null, v_user, 'objective');
    if (select count(*) from public.card_instances c
        where c.owner_id = v_user and c.definition_id = v_objective.card_definition_ids[i]) = 1 then
      v_new_ids := v_new_ids || v_instance;
    end if;
    v_instance_ids := v_instance_ids || v_instance;
  end loop;

  for v_random in select * from public.grant_random_variants(v_user, v_objective.random_variants, 'objective') loop
    if v_random.is_new then
      v_new_ids := v_new_ids || v_random.instance_id;
    end if;
    v_instance_ids := v_instance_ids || v_random.instance_id;
  end loop;

  if cardinality(v_instance_ids) > 0 then
    insert into public.pack_openings (user_id, pack_type, card_instance_ids, new_card_instance_ids)
    values (v_user, 'objective', v_instance_ids, v_new_ids)
    returning id into v_opening;
    v_openings := v_openings || v_opening;
  end if;

  for i in 1..v_objective.packs loop
    v_openings := v_openings || public.open_pack(v_user, 'standard');
  end loop;

  perform set_config('o_mega.objective_claim', '', true);

  update public.daily_objectives set opening_ids = v_openings where id = v_objective.id;

  return jsonb_build_object(
    'coins', v_objective.coins,
    'opening_ids', to_jsonb(v_openings),
    'coin_balance', public.coin_balance(v_user)
  );
end;
$$;

-- Same as in 20261111100000_daily_objectives.sql, with each objective's random variants.
create or replace function public.daily_objectives_payload(p_user uuid, p_day date)
returns jsonb
language sql
volatile
set search_path = ''
as $$
  select jsonb_build_object(
    'day', p_day,
    'resets_at', public.next_reset_at(),
    'refreshes_per_day', public.config_int('daily_objectives.refreshes_per_day'),
    'refreshes_left', greatest(0, public.config_int('daily_objectives.refreshes_per_day') - coalesce(
      (select d.refreshes from public.daily_objective_days d where d.user_id = p_user and d.day = p_day), 0)),
    'objectives', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id,
        'slot', o.slot,
        'code', o.definition_code,
        'difficulty', o.difficulty,
        'title', o.title,
        'target', o.target,
        'progress', o.progress,
        'completed', o.completed_at is not null,
        'claimed', o.claimed_at is not null,
        'coins', o.coins,
        'packs', o.packs,
        'opening_ids', to_jsonb(o.opening_ids),
        'cards', coalesce((
          select jsonb_agg(jsonb_build_object(
            'definition_id', c.definition_id,
            'code', cd.code,
            'name', cd.name,
            'rarity_code', cd.rarity_code,
            'art_url', coalesce(v.art_url, cd.art_url),
            'variant_id', c.variant_id
          ) order by c.n)
          from unnest(o.card_definition_ids, o.card_variant_ids) with ordinality as c(definition_id, variant_id, n)
          join public.card_definitions cd on cd.id = c.definition_id
          left join public.card_variants v on v.id = c.variant_id
        ), '[]'::jsonb),
        'random_variants', public.random_variants_payload(o.random_variants)
      ) order by o.slot)
      from public.daily_objectives o
      where o.user_id = p_user and o.day = p_day and o.replaced_at is null
    ), '[]'::jsonb)
  )
$$;

-- Same as in 20261111120000_daily_objectives_admin.sql, with each objective's
-- reward cards and random variants (as saved), the cards an objective can give,
-- and the styles and rarities a rule can name.
create or replace function public.admin_daily_objectives_payload()
returns jsonb
language sql
volatile
set search_path = ''
as $$
  select jsonb_build_object(
    'objectives', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', d.code,
        'title', d.title,
        'difficulty', d.difficulty,
        'metric', d.metric,
        'params', d.params,
        'target', d.target,
        'coins', d.coins,
        'packs', d.packs,
        'cards', cardinality(d.card_definition_ids),
        'card_codes', coalesce((
          select jsonb_agg(cd.code || coalesce(':' || v.style, '') order by c.n)
          from unnest(d.card_definition_ids, d.card_variant_ids) with ordinality as c(definition_id, variant_id, n)
          join public.card_definitions cd on cd.id = c.definition_id
          left join public.card_variants v on v.id = c.variant_id
        ), '[]'::jsonb),
        'random_variants', d.random_variants,
        'is_active', d.is_active,
        'assigned', (select count(*) from public.daily_objectives o where o.definition_code = d.code)
      ) order by case d.difficulty when 'easy' then 1 when 'medium' then 2 else 3 end, d.created_at, d.code)
      from public.daily_objective_definitions d
    ), '[]'::jsonb),
    'per_day', jsonb_build_object(
      'easy', public.config_int('daily_objectives.per_day.easy'),
      'medium', public.config_int('daily_objectives.per_day.medium'),
      'hard', public.config_int('daily_objectives.per_day.hard')
    ),
    'reward_coins', jsonb_build_object(
      'easy', public.config_int('daily_objectives.reward_coins.easy'),
      'medium', public.config_int('daily_objectives.reward_coins.medium'),
      'hard', public.config_int('daily_objectives.reward_coins.hard')
    ),
    'variant_styles', (
      select coalesce(jsonb_agg(jsonb_build_object('style', s.style, 'name', s.style_name) order by s.style_name), '[]'::jsonb)
      from (select distinct on (v.style) v.style, v.style_name from public.card_variants v where v.is_active
            order by v.style, v.style_name) s
    ),
    'max_cards', 5,
    'cards', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', d.code,
        'name', d.name,
        'rarity', r.name,
        'rarity_code', d.rarity_code,
        'faction', d.faction,
        'variants', (
          select coalesce(jsonb_agg(jsonb_build_object('style', v.style, 'name', v.style_name) order by v.style_name), '[]'::jsonb)
          from public.card_variants v where v.definition_id = d.id and v.is_active
        )
      ) order by d.name), '[]'::jsonb)
      from public.card_definitions d
      join public.rarity_definitions r on r.code = d.rarity_code
      where d.is_active and d.unlock_level is null
    ),
    'rarities', (
      select coalesce(jsonb_agg(jsonb_build_object('code', r.code, 'name', r.name, 'rank', r.rank, 'color', r.color) order by r.rank), '[]'::jsonb)
      from public.rarity_definitions r
    )
  )
$$;

drop function public.admin_save_daily_objective(text, text, text, text, jsonb, integer, integer, integer);

-- Same as in 20261111120000_daily_objectives_admin.sql, with the random variants
-- and the reward cards, now chosen in the editor too: "P051" or "P051:neon", up
-- to 5. p_card_codes null keeps the cards as they are.
create function public.admin_save_daily_objective(
  p_code text,
  p_title text,
  p_difficulty text,
  p_metric text,
  p_params jsonb,
  p_target integer,
  p_coins integer,
  p_packs integer,
  p_random_variants jsonb default null,
  p_card_codes text[] default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
  v_params jsonb := coalesce(p_params, '{}'::jsonb);
  v_random jsonb;
  v_cards record;
  v_definition_ids uuid[] := '{}';
  v_variant_ids uuid[] := '{}';
  v_card_count integer;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if char_length(v_title) not between 3 and 80
     or p_difficulty is null or p_difficulty not in ('easy', 'medium', 'hard')
     or p_metric is null or p_metric not in (
       'matches_played', 'matches_won', 'threats_won', 'cards_played',
       'emergency_passed', 'packs_opened', 'duplicates_converted', 'cards_conquered')
     or not public.daily_objective_params_valid(p_metric, v_params)
     or p_target is null or p_target not between 1 and 100
     or (p_coins is not null and p_coins not between 0 and 100000)
     or p_packs is null or p_packs not between 0 and 5 then
    raise exception 'invalid_objective';
  end if;
  v_random := public.random_variants_spec(p_random_variants);
  if p_card_codes is not null then
    if cardinality(p_card_codes) > 5 then
      raise exception 'invalid_objective';
    end if;
    begin
      select * into v_cards from public.event_reward_cards(p_card_codes);
    exception when raise_exception then
      raise exception 'invalid_objective';
    end;
    v_definition_ids := v_cards.definition_ids;
    v_variant_ids := v_cards.variant_ids;
    v_card_count := cardinality(v_definition_ids);
  else
    v_card_count := coalesce((
      select cardinality(d.card_definition_ids) from public.daily_objective_definitions d where d.code = p_code), 0);
  end if;

  -- No reward at all.
  if p_coins = 0 and p_packs = 0 and v_random is null and v_card_count = 0 then
    raise exception 'invalid_objective';
  end if;

  if p_code is null then
    insert into public.daily_objective_definitions (code, title, difficulty, metric, params, target, coins, packs,
                                                    random_variants, card_definition_ids, card_variant_ids)
    values ('obj_' || substr(md5(gen_random_uuid()::text), 1, 10), v_title, p_difficulty, p_metric, v_params,
            p_target, p_coins, p_packs, v_random, v_definition_ids, v_variant_ids);
  else
    update public.daily_objective_definitions d
    set title = v_title, difficulty = p_difficulty, metric = p_metric, params = v_params,
        target = p_target, coins = p_coins, packs = p_packs, random_variants = v_random,
        card_definition_ids = case when p_card_codes is null then d.card_definition_ids else v_definition_ids end,
        card_variant_ids = case when p_card_codes is null then d.card_variant_ids else v_variant_ids end
    where d.code = p_code;
    if not found then
      raise exception 'objective_not_found';
    end if;
  end if;

  perform public.check_daily_objectives_enough();
  return public.admin_daily_objectives_payload();
end;
$$;

revoke execute on function public.admin_save_daily_objective(text, text, text, text, jsonb, integer, integer, integer, jsonb, text[]) from public, anon;
grant execute on function public.admin_save_daily_objective(text, text, text, text, jsonb, integer, integer, integer, jsonb, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Imprese
-- ---------------------------------------------------------------------------

-- Same as in 20261115170000_achievements.sql, copying the random variants too.
create or replace function public.complete_achievement(p_user uuid, p_achievement public.achievements, p_granted boolean)
returns boolean
language plpgsql
volatile
set search_path = ''
as $$
begin
  insert into public.player_achievements (
    user_id, achievement_id, name, description, tier, coins, packs, card_definition_ids, card_variant_ids, title, granted,
    random_variants
  ) values (
    p_user, p_achievement.id, p_achievement.name, p_achievement.description, p_achievement.tier, p_achievement.coins,
    p_achievement.packs, p_achievement.card_definition_ids, p_achievement.card_variant_ids, p_achievement.title, p_granted,
    p_achievement.random_variants
  )
  on conflict do nothing;
  return found;
end;
$$;

-- Same as in 20261115170000_achievements.sql, with the random variants.
create or replace function public.claim_achievement(p_achievement_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_done public.player_achievements;
  v_instance uuid;
  v_instance_ids uuid[] := '{}';
  v_new_ids uuid[] := '{}';
  v_opening uuid;
  v_openings uuid[] := '{}';
  v_random record;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  select * into v_done from public.player_achievements pa
  where pa.user_id = v_user and pa.achievement_id = p_achievement_id
  for update;
  if v_done.user_id is null then
    raise exception 'achievement_not_completed';
  end if;
  if v_done.claimed_at is not null then
    raise exception 'achievement_already_claimed';
  end if;
  update public.player_achievements set claimed_at = now()
  where user_id = v_user and achievement_id = p_achievement_id;

  if v_done.coins > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id)
    values (v_user, v_done.coins, 'achievement_reward', p_achievement_id);
  end if;

  for i in 1..coalesce(cardinality(v_done.card_definition_ids), 0) loop
    insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
    values (v_done.card_definition_ids[i], v_user, 'achievement', v_done.card_variant_ids[i])
    returning id into v_instance;
    insert into public.card_transfers (instance_id, from_user, to_user, reason)
    values (v_instance, null, v_user, 'achievement');
    if (select count(*) from public.card_instances c
        where c.owner_id = v_user and c.definition_id = v_done.card_definition_ids[i]) = 1 then
      v_new_ids := v_new_ids || v_instance;
    end if;
    v_instance_ids := v_instance_ids || v_instance;
  end loop;

  for v_random in select * from public.grant_random_variants(v_user, v_done.random_variants, 'achievement') loop
    if v_random.is_new then
      v_new_ids := v_new_ids || v_random.instance_id;
    end if;
    v_instance_ids := v_instance_ids || v_random.instance_id;
  end loop;

  if cardinality(v_instance_ids) > 0 then
    insert into public.pack_openings (user_id, pack_type, card_instance_ids, new_card_instance_ids)
    values (v_user, 'achievement', v_instance_ids, v_new_ids)
    returning id into v_opening;
    v_openings := v_openings || v_opening;
  end if;

  for i in 1..v_done.packs loop
    v_openings := v_openings || public.open_pack(v_user, 'achievement');
  end loop;

  update public.player_achievements set opening_ids = v_openings
  where user_id = v_user and achievement_id = p_achievement_id;

  return jsonb_build_object(
    'coins', v_done.coins,
    'opening_ids', to_jsonb(v_openings),
    'coin_balance', public.coin_balance(v_user)
  );
end;
$$;

-- Same as in 20261115170000_achievements.sql, with the random variants of the draft.
create or replace function public.achievement_from_draft(p_draft jsonb)
returns public.achievements
language plpgsql
stable
set search_path = ''
as $$
declare
  v public.achievements;
  v_cards record;
begin
  if jsonb_typeof(p_draft) is distinct from 'object' then
    raise exception 'invalid_achievement';
  end if;
  v.name := btrim(coalesce(p_draft ->> 'name', ''));
  v.description := btrim(coalesce(p_draft ->> 'description', ''));
  v.hint := nullif(btrim(coalesce(p_draft ->> 'hint', '')), '');
  v.tier := p_draft ->> 'tier';
  v.metric := p_draft ->> 'metric';
  v.params := coalesce(p_draft -> 'params', '{}'::jsonb);
  v.title := nullif(btrim(coalesce(p_draft ->> 'title', '')), '');
  begin
    v.target := (p_draft ->> 'target')::integer;
    v.coins := coalesce((p_draft ->> 'coins')::integer, 0);
    v.packs := coalesce((p_draft ->> 'packs')::integer, 0);
    v.available_until := nullif(p_draft ->> 'available_until', '')::timestamptz;
  exception when others then
    raise exception 'invalid_achievement';
  end;
  if char_length(v.name) not between 2 and 60
     or char_length(v.description) not between 2 and 200
     or (v.hint is not null and char_length(v.hint) not between 2 and 120)
     or (v.title is not null and char_length(v.title) not between 2 and 30)
     or v.tier is null or v.tier not in ('bronze', 'silver', 'gold', 'legend')
     or v.metric is null or not public.achievement_params_valid(v.metric, v.params)
     or v.target is null or v.target not between 1 and 1000000
     or v.coins not between 0 and 100000 or v.packs not between 0 and 10 then
    raise exception 'invalid_achievement';
  end if;
  if jsonb_typeof(coalesce(p_draft -> 'card_codes', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_draft -> 'card_codes', '[]'::jsonb)) > 5 then
    raise exception 'invalid_achievement';
  end if;
  begin
    select * into v_cards from public.event_reward_cards(
      array(select jsonb_array_elements_text(coalesce(p_draft -> 'card_codes', '[]'::jsonb))));
  exception when others then
    raise exception 'invalid_achievement';
  end;
  v.card_definition_ids := v_cards.definition_ids;
  v.card_variant_ids := v_cards.variant_ids;
  -- Its own errors (invalid_random_variants, random_variants_empty) say what is wrong.
  v.random_variants := public.random_variants_spec(p_draft -> 'random_variants');
  return v;
end;
$$;

-- Same as in 20261115170000_achievements.sql, saving the random variants.
create or replace function public.admin_save_achievement(p_id uuid, p_draft jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.achievements;
  v_counts_past boolean := coalesce((p_draft ->> 'counts_past')::boolean, true);
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  v := public.achievement_from_draft(p_draft);
  if p_id is null then
    insert into public.achievements (
      name, description, hint, tier, metric, params, target, coins, packs, card_definition_ids, card_variant_ids,
      title, position, counts_from, available_until, random_variants
    ) values (
      v.name, v.description, v.hint, v.tier, v.metric, v.params, v.target, v.coins, v.packs, v.card_definition_ids,
      v.card_variant_ids, v.title, coalesce((select max(a.position) from public.achievements a), 0) + 1,
      case when v_counts_past then null else now() end, v.available_until, v.random_variants
    );
  else
    update public.achievements a
    set name = v.name, description = v.description, hint = v.hint, tier = v.tier, metric = v.metric,
        params = v.params, target = v.target, coins = v.coins, packs = v.packs,
        card_definition_ids = v.card_definition_ids, card_variant_ids = v.card_variant_ids, title = v.title,
        counts_from = case when v_counts_past then null else coalesce(a.counts_from, now()) end,
        available_until = v.available_until, random_variants = v.random_variants
    where a.id = p_id;
    if not found then
      raise exception 'achievement_not_found';
    end if;
  end if;
  return public.admin_achievements_payload();
end;
$$;

-- Same as in 20261115170000_achievements.sql, with each impresa's random variants
-- (as saved) and the rarities a rule can name.
create or replace function public.admin_achievements_payload()
returns jsonb
language sql
volatile
set search_path = ''
as $$
  select jsonb_build_object(
    'players', (select count(*) from public.profiles),
    'achievements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'name', a.name,
        'description', a.description,
        'hint', a.hint,
        'tier', a.tier,
        'metric', a.metric,
        'params', a.params,
        'target', a.target,
        'coins', a.coins,
        'packs', a.packs,
        'card_codes', coalesce((
          select jsonb_agg(cd.code || coalesce(':' || v.style, '') order by c.n)
          from unnest(a.card_definition_ids, a.card_variant_ids) with ordinality as c(definition_id, variant_id, n)
          join public.card_definitions cd on cd.id = c.definition_id
          left join public.card_variants v on v.id = c.variant_id
        ), '[]'::jsonb),
        'random_variants', a.random_variants,
        'title', a.title,
        'position', a.position,
        'is_active', a.is_active,
        'counts_past', a.counts_from is null,
        'counts_from', a.counts_from,
        'available_until', a.available_until,
        'completed', (select count(*) from public.player_achievements pa where pa.achievement_id = a.id)
      ) order by a.position, a.created_at)
      from public.achievements a
    ), '[]'::jsonb),
    'cards', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', d.code,
        'name', d.name,
        'rarity', r.name,
        'variants', (
          select coalesce(jsonb_agg(jsonb_build_object('style', v.style, 'name', v.style_name) order by v.style_name), '[]'::jsonb)
          from public.card_variants v where v.definition_id = d.id and v.is_active
        )
      ) order by d.name), '[]'::jsonb)
      from public.card_definitions d
      join public.rarity_definitions r on r.code = d.rarity_code
      where d.is_active and d.unlock_level is null
    ),
    'traits', (
      select coalesce(jsonb_agg(jsonb_build_object('code', t.code, 'name', t.name, 'category', c.name)
        order by c.sort_order, t.sort_order), '[]'::jsonb)
      from public.traits t join public.trait_categories c on c.code = t.category_code
    ),
    'styles', (
      select coalesce(jsonb_agg(jsonb_build_object('style', s.style, 'name', s.style_name) order by s.style_name), '[]'::jsonb)
      from (select distinct on (v.style) v.style, v.style_name from public.card_variants v where v.is_active
            order by v.style, v.style_name) s
    ),
    'rarities', (
      select coalesce(jsonb_agg(jsonb_build_object('code', r.code, 'name', r.name, 'rank', r.rank, 'color', r.color) order by r.rank), '[]'::jsonb)
      from public.rarity_definitions r
    ),
    'chapters', (
      select coalesce(jsonb_agg(jsonb_build_object('chapter', c.chapter, 'season', c.season, 'number', c.number, 'title', c.title)
        order by c.chapter), '[]'::jsonb)
      from public.story_chapters c
    ),
    'seasons', (
      select coalesce(jsonb_agg(jsonb_build_object('season', s.season, 'title', s.title) order by s.season), '[]'::jsonb)
      from public.story_seasons s
    )
  )
$$;

-- Same as in 20261115170000_achievements.sql: a completed impresa also names its
-- random variants. An impresa still to find shows nothing new.
create or replace function public.achievements_payload(p_user uuid)
returns jsonb
language sql
volatile
set search_path = ''
as $$
  with board as (
    select a.id, a.position, coalesce(pa.tier, a.tier) as tier, a.hint, (pa.user_id is not null) as done,
           not public.achievement_available(a) as retired,
           pa.name, pa.description, pa.completed_at, pa.coins, pa.packs, pa.title, pa.claimed_at, pa.opening_ids,
           pa.seen_at, pa.card_definition_ids, pa.card_variant_ids, pa.random_variants
    from public.achievements a
    left join public.player_achievements pa on pa.achievement_id = a.id and pa.user_id = p_user
    where pa.user_id is not null or public.achievement_available(a)
  )
  select jsonb_build_object(
    'title', (select p.title from public.profiles p where p.id = p_user),
    'discovered', (select count(*) from board where done),
    'total', (select count(*) from board),
    'achievements', coalesce((
      select jsonb_agg(case when b.done then jsonb_build_object(
        'id', b.id,
        'tier', b.tier,
        'done', true,
        'name', b.name,
        'description', b.description,
        'completed_at', b.completed_at,
        'retired', b.retired,
        'coins', b.coins,
        'packs', b.packs,
        'title', b.title,
        'claimed', b.claimed_at is not null,
        'opening_ids', to_jsonb(b.opening_ids),
        'new', b.seen_at is null,
        'cards', coalesce((
          select jsonb_agg(jsonb_build_object(
            'code', cd.code,
            'name', cd.name,
            'rarity_code', cd.rarity_code,
            'art_url', coalesce(v.art_url, cd.art_url),
            'variant', v.style_name
          ) order by c.n)
          from unnest(b.card_definition_ids, b.card_variant_ids) with ordinality as c(definition_id, variant_id, n)
          join public.card_definitions cd on cd.id = c.definition_id
          left join public.card_variants v on v.id = c.variant_id
        ), '[]'::jsonb),
        'random_variants', public.random_variants_payload(b.random_variants)
      ) else jsonb_build_object(
        'id', b.id,
        'tier', b.tier,
        'done', false,
        'hint', b.hint
      ) end order by b.position, b.id)
      from board b
    ), '[]'::jsonb)
  )
$$;
