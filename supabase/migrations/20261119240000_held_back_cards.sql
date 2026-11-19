-- Characters an admin holds back from packs (card_definitions.in_packs false, SPEC §7)
-- reach no player by an automatic path until the admin ticks them in from «Carte nei
-- pacchetti». Until now only the pack draw read the flag; the paths below picked among
-- every active character. Each function is the latest definition, with only the
-- character filter changed to public.is_pack_card (active, not a level card, in packs).
-- Explicit admin choices stay free: bonus codes naming a card, hand-made special packs,
-- named prize cards, Story teams. Bot teams are built in the match Edge Function, which
-- now fields only pack cards (no held-back characters, no level cards). The album view
-- tells the app which characters are held back, so that it can hide them.


-- Starter set (same as in 20261101200000_new_characters.sql).

create or replace function public.grant_starter_set(p_user uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_size integer := public.config_int('conquest.starter_set_size');
  v_max_rank integer := public.config_int('conquest.starter_set_max_rarity_rank');
  v_granted integer;
begin
  with picked as (
    select d.id
    from public.card_definitions d
    join public.rarity_definitions r on r.code = d.rarity_code
    where public.is_pack_card(d) and r.rank <= v_max_rank
    order by random()
    limit v_size
  ), created as (
    insert into public.card_instances (definition_id, owner_id, acquired_via, is_starter)
    select picked.id, p_user, 'starter', true from picked
    returning id
  ), logged as (
    insert into public.card_transfers (instance_id, from_user, to_user, reason)
    select created.id, null, p_user, 'starter' from created
    returning 1
  )
  select count(*) into v_granted from logged;

  if v_granted < v_size then
    raise exception 'starter pool too small: % of % cards available', v_granted, v_size;
  end if;
  return v_granted;
end;
$$;

-- Random variants as a reward or bought with Schegge (same as in
-- 20261118233000_random_variant_rewards.sql): the check and the draw agree.

create or replace function public.random_variants_spec(p_spec jsonb)
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
    where v.is_active and public.is_pack_card(d)
      and (cardinality(v_styles) = 0 or v.style = any (v_styles))
      and (cardinality(v_rarities) = 0 or d.rarity_code = any (v_rarities))
  ) < v_count then
    raise exception 'random_variants_empty';
  end if;
  return jsonb_build_object('count', v_count, 'styles', to_jsonb(v_styles), 'rarities', to_jsonb(v_rarities));
end;
$$;

create or replace function public.grant_random_variants(p_user uuid, p_spec jsonb, p_via text)
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
    where v.is_active and public.is_pack_card(d)
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

-- The Schegge shop (same as in 20261119120000_shards_and_cosmetics.sql): the missing
-- variants it counts and checks are those grant_random_variants can give.

create or replace function public.cosmetics_payload(p_user uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'shard_balance', public.shard_balance(p_user),
    'costs', jsonb_build_object(
      'pack', public.config_int('shards.pack_cost'),
      'cosmetic', public.config_int('shards.random_cosmetic_cost'),
      'kind', public.config_int('shards.chosen_kind_cosmetic_cost'),
      'variant', public.config_int('shards.new_variant_cost')
    ),
    'values', (select coalesce(jsonb_object_agg(r.code, r.variant_shard_value), '{}'::jsonb) from public.rarity_definitions r),
    'catalog', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', c.code, 'kind', c.kind, 'name', c.name, 'active', c.is_active
      ) order by c.kind desc, c.sort_order), '[]'::jsonb)
      from public.cosmetics c
    ),
    'inventory', (
      select coalesce(jsonb_agg(jsonb_build_object('code', x.code, 'count', x.items, 'serial', x.first_serial) order by x.code), '[]'::jsonb)
      from (
        select ci.cosmetic_code as code, count(*)::integer as items, min(ci.serial) as first_serial
        from public.cosmetic_items ci
        where ci.owner_id = p_user and ci.used_at is null
        group by ci.cosmetic_code
      ) x
    ),
    'applied', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'definition_id', cc.definition_id,
        'frame', f.cosmetic_code,
        'frame_visible', cc.frame_visible,
        'effect', e.cosmetic_code,
        'effect_visible', cc.effect_visible,
        'effect_serial', e.serial
      )), '[]'::jsonb)
      from public.character_cosmetics cc
      left join public.cosmetic_items f on f.id = cc.frame_item_id
      left join public.cosmetic_items e on e.id = cc.effect_item_id
      where cc.user_id = p_user and (cc.frame_item_id is not null or cc.effect_item_id is not null)
    ),
    'breakable', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'variant_id', s.variant_id, 'definition_id', s.definition_id, 'copies', s.copies, 'breakable', s.breakable
      )), '[]'::jsonb)
      from public.variant_break_summary(p_user) s
    ),
    'missing_variants', (
      select count(*)::integer
      from public.card_variants v
      join public.card_definitions d on d.id = v.definition_id
      where v.is_active and public.is_pack_card(d)
        and not exists (select 1 from public.card_instances i where i.owner_id = p_user and i.variant_id = v.id)
    )
  )
$$;

create or replace function public.buy_with_shards(p_item text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_cost integer;
  v_cosmetic record;
  v_serial integer;
  v_item uuid;
  v_opening uuid;
  v_instance uuid;
  v_is_new boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  v_cost := case p_item
    when 'pack' then public.config_int('shards.pack_cost')
    when 'cosmetic' then public.config_int('shards.random_cosmetic_cost')
    when 'frame' then public.config_int('shards.chosen_kind_cosmetic_cost')
    when 'effect' then public.config_int('shards.chosen_kind_cosmetic_cost')
    when 'variant' then public.config_int('shards.new_variant_cost')
  end;
  if v_cost is null then
    raise exception 'invalid_shard_item' using errcode = '22023';
  end if;

  perform 1 from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  if public.shard_balance(v_uid) < v_cost then
    raise exception 'insufficient_shards';
  end if;

  if p_item = 'pack' then
    v_opening := public.open_pack_at_chance(v_uid, 'shards', public.config_int('packs.variant_chance_percent'));
    insert into public.shard_ledger (user_id, amount, reason, ref_id) values (v_uid, -v_cost, 'pack', v_opening);
    return jsonb_build_object(
      'opening', public.pack_opening_payload(v_opening),
      'cosmetics', public.cosmetics_payload(v_uid)
    );
  end if;

  if p_item = 'variant' then
    if not exists (
      select 1
      from public.card_variants v
      join public.card_definitions d on d.id = v.definition_id
      where v.is_active and public.is_pack_card(d)
        and not exists (select 1 from public.card_instances i where i.owner_id = v_uid and i.variant_id = v.id)
    ) then
      raise exception 'no_missing_variants';
    end if;
    -- grant_random_variants picks the variants the player does not own first: one exists.
    select g.instance_id, g.is_new into v_instance, v_is_new
    from public.grant_random_variants(v_uid, '{"count": 1}'::jsonb, 'shards') g;
    insert into public.pack_openings (user_id, pack_type, card_instance_ids, new_card_instance_ids)
    values (v_uid, 'shards', array[v_instance], case when v_is_new then array[v_instance] else '{}'::uuid[] end)
    returning id into v_opening;
    insert into public.shard_ledger (user_id, amount, reason, ref_id) values (v_uid, -v_cost, 'variant', v_opening);
    return jsonb_build_object(
      'opening', public.pack_opening_payload(v_opening),
      'cosmetics', public.cosmetics_payload(v_uid)
    );
  end if;

  -- A frame or an effect: every active one of the kind asked is as likely.
  select c.code, c.kind, c.name into v_cosmetic
  from public.cosmetics c
  where c.is_active and (p_item = 'cosmetic' or c.kind = p_item)
  order by random()
  limit 1;
  if not found then
    raise exception 'no_cosmetics';
  end if;
  -- Serializes the serial numbers of that frame or effect.
  perform 1 from public.cosmetics c where c.code = v_cosmetic.code for update;
  select coalesce(max(ci.serial), 0) + 1 into v_serial from public.cosmetic_items ci where ci.cosmetic_code = v_cosmetic.code;
  insert into public.cosmetic_items (owner_id, cosmetic_code, serial, acquired_via)
  values (v_uid, v_cosmetic.code, v_serial, 'shards')
  returning id into v_item;
  insert into public.shard_ledger (user_id, amount, reason, ref_id) values (v_uid, -v_cost, 'cosmetic', v_item);

  return jsonb_build_object(
    'item', jsonb_build_object('code', v_cosmetic.code, 'kind', v_cosmetic.kind, 'name', v_cosmetic.name, 'serial', v_serial),
    'cosmetics', public.cosmetics_payload(v_uid)
  );
end;
$$;

-- The shop's «N personaggi hanno anche un disegno più raro» counts characters packs
-- can give (same as in 20261118230000_variant_draws.sql).

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
      select count(distinct v.definition_id) from public.card_variants v
      join public.card_definitions d on d.id = v.definition_id
      where v.is_active and public.is_pack_card(d)
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

-- Conquista against a bot (same as in 20261101210000_conquest_bot.sql): a copy of a
-- held-back character or of a level card is never on offer, even if a bot team held one
-- (level cards come only with the level, SPEC §4.6).

create or replace function public.open_conquest_claim(p_match_id uuid, p_winner_side text)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_winner public.match_teams;
  v_loser public.match_teams;
  v_limit integer;
  v_eligible uuid[];
  v_bonus integer;
  v_definition uuid;
  v_copy uuid;
  v_copies uuid[] := '{}';
begin
  select * into v_winner from public.match_teams where match_id = p_match_id and side = p_winner_side;
  select * into v_loser from public.match_teams where match_id = p_match_id and side <> p_winner_side;

  if v_loser.user_id is null then
    foreach v_definition in array v_loser.definition_ids loop
      insert into public.card_instances (definition_id, owner_id, acquired_via, out_of_play_at)
      values (v_definition, null, 'conquest', now())
      returning id into v_copy;
      v_copies := v_copies || v_copy;
    end loop;
    update public.match_teams set card_instance_ids = v_copies where match_id = p_match_id and side = v_loser.side;
    v_loser.card_instance_ids := v_copies;
  end if;

  -- Rank limit: up to the rarest card of the winner's team (SPEC §6.2).
  select max(r.rank) into v_limit
  from unnest(v_winner.definition_ids) as u(id)
  join public.card_definitions d on d.id = u.id
  join public.rarity_definitions r on r.code = d.rarity_code;

  select coalesce(array_agg(i.id), '{}') into v_eligible
  from public.card_instances i
  join public.card_definitions d on d.id = i.definition_id
  join public.rarity_definitions r on r.code = d.rarity_code
  where i.id = any (v_loser.card_instance_ids) and not i.is_starter and r.rank <= v_limit
    and (v_loser.user_id is not null or public.is_pack_card(d));

  if cardinality(v_eligible) = 0 then
    if v_loser.user_id is null then
      delete from public.card_instances where id = any (v_copies);
      update public.match_teams set card_instance_ids = null where match_id = p_match_id and side = v_loser.side;
    end if;
    -- A winning bot has no use for the bonus.
    v_bonus := case when v_winner.user_id is null then 0 else public.config_int('conquest.no_card_bonus_coins') end;
    insert into public.conquest_claims (match_id, winner_id, loser_id, deadline_at, bonus_coins, resolved_at)
    values (p_match_id, v_winner.user_id, v_loser.user_id, now(), v_bonus, now());
    if v_bonus > 0 then
      insert into public.coin_ledger (user_id, amount, reason, ref_id)
      values (v_winner.user_id, v_bonus, 'conquest_bonus', p_match_id);
    end if;
  elsif v_winner.user_id is null then
    insert into public.conquest_claims (match_id, winner_id, loser_id, eligible_instance_ids, deadline_at)
    values (p_match_id, null, v_loser.user_id, v_eligible, now());
    perform public.resolve_conquest_claim(
      p_match_id,
      (select u.id from unnest(v_eligible) as u(id) order by random() limit 1),
      false
    );
  else
    insert into public.conquest_claims (match_id, winner_id, loser_id, eligible_instance_ids, deadline_at)
    values (
      p_match_id, v_winner.user_id, v_loser.user_id, v_eligible,
      now() + make_interval(secs => public.config_int('conquest.pick_timer_seconds'))
    );
  end if;
end;
$$;

-- Imprese (same as in 20261118234000_variant_counts.sql): «every villain» and complete
-- styles or characters count only characters that players can find.

create or replace function public.achievement_progress(p_user uuid, p_metric text, p_params jsonb, p_since timestamptz)
returns integer
language plpgsql
stable
set search_path = ''
as $$
declare
  v integer;
  v_rome_hour integer;
begin
  case p_metric
    when 'matches_played', 'matches_won', 'comeback_wins', 'modes_won', 'night_matches' then
      select case p_metric
          when 'modes_won' then count(distinct case
            when m.story_mission_id is not null then 'story'
            when m.mode = 'conquest' then 'conquest'
            when m.format in ('quadrant', 'quadrant_shifting') then 'quadrant'
            else m.format end) filter (where m.result = s.side)
          when 'matches_played' then count(*)
          when 'night_matches' then count(*) filter (where
            case when (p_params ->> 'from_hour')::integer < (p_params ->> 'to_hour')::integer
              then extract(hour from m.finished_at at time zone 'Europe/Rome')::integer
                   between (p_params ->> 'from_hour')::integer and (p_params ->> 'to_hour')::integer - 1
              else extract(hour from m.finished_at at time zone 'Europe/Rome')::integer >= (p_params ->> 'from_hour')::integer
                or extract(hour from m.finished_at at time zone 'Europe/Rome')::integer < (p_params ->> 'to_hour')::integer
            end)
          when 'comeback_wins' then count(*) filter (where m.result = s.side and m.format = 'classic' and (
            select count(*) from public.match_rounds r
            where r.match_id = m.id and r.round in (1, 2) and r.winner_side not in (s.side, 'none')) = 2)
          else count(*) filter (where m.result = s.side)
        end::integer
      into v
      from public.matches m
      cross join lateral (select case when m.player_a = p_user then 'a' else 'b' end as side) s
      where (m.player_a = p_user or m.player_b = p_user)
        and m.status = 'finished' and m.end_reason = 'completed'
        and (p_since is null or m.finished_at >= p_since)
        and public.achievement_match_fits(
          case when p_metric in ('matches_played', 'matches_won') then p_params
               else p_params - 'from_hour' - 'to_hour' end, m, s.side);

    when 'upset_rounds', 'close_rounds' then
      select count(*)::integer into v
      from public.matches m
      cross join lateral (select case when m.player_a = p_user then 'a' else 'b' end as side) s
      join public.match_rounds mr on mr.match_id = m.id and mr.winner_side = s.side
      join public.round_plays mine on mine.match_id = m.id and mine.round = mr.round and mine.side = s.side
      join public.round_plays theirs on theirs.match_id = m.id and theirs.round = mr.round and theirs.side <> s.side
      join public.card_definitions dm on dm.id = mine.definition_id
      join public.rarity_definitions rm on rm.code = dm.rarity_code
      join public.card_definitions dt on dt.id = theirs.definition_id
      join public.rarity_definitions rt on rt.code = dt.rarity_code
      where (m.player_a = p_user or m.player_b = p_user)
        and m.status = 'finished' and m.end_reason = 'completed' and m.format = 'classic'
        and (p_since is null or m.finished_at >= p_since)
        and public.achievement_match_fits(p_params - 'max_rarity_rank' - 'opponent_min_rarity_rank', m, s.side)
        and case p_metric
          when 'upset_rounds' then
            rm.rank <= coalesce((p_params ->> 'max_rarity_rank')::integer, 1)
            and rt.rank >= coalesce((p_params ->> 'opponent_min_rarity_rank')::integer, 5)
          else mine.score - theirs.score = 1
        end;

    when 'team_wins' then
      select count(*)::integer into v
      from public.matches m
      cross join lateral (select case when m.player_a = p_user then 'a' else 'b' end as side) s
      join public.match_teams t on t.match_id = m.id and t.side = s.side
      where (m.player_a = p_user or m.player_b = p_user)
        and m.status = 'finished' and m.end_reason = 'completed' and m.result = s.side
        and (p_since is null or m.finished_at >= p_since)
        and public.achievement_match_fits(p_params - 'faction' - 'trait', m, s.side)
        and cardinality(t.definition_ids) > 0
        and not exists (
          select 1 from unnest(t.definition_ids) as d(id)
          join public.card_definitions cd on cd.id = d.id
          where (p_params ? 'faction' and cd.faction <> p_params ->> 'faction')
             or (p_params ? 'trait' and not exists (
               select 1 from public.card_definition_traits ct
               where ct.definition_id = d.id and ct.trait_code = p_params ->> 'trait'))
        );

    when 'characters_owned' then
      with wanted as (
        select d.id from public.card_definitions d
        join public.rarity_definitions r on r.code = d.rarity_code
        where d.is_active and d.in_packs
          and (not (p_params ? 'faction') or d.faction = p_params ->> 'faction')
          and (not (p_params ? 'min_rarity_rank') or r.rank >= (p_params ->> 'min_rarity_rank')::integer)
          and (not (p_params ? 'max_rarity_rank') or r.rank <= (p_params ->> 'max_rarity_rank')::integer)
          and (not (p_params ? 'trait') or exists (
            select 1 from public.card_definition_traits ct where ct.definition_id = d.id and ct.trait_code = p_params ->> 'trait'))
      ), owned as (
        select distinct i.definition_id as id from public.card_instances i
        join wanted w on w.id = i.definition_id
        where i.owner_id = p_user
      )
      select case when coalesce((p_params ->> 'all')::boolean, false)
        then ((select count(*) from wanted) > 0 and (select count(*) from wanted) = (select count(*) from owned))::integer
        else (select count(*) from owned)::integer end
      into v;

    when 'variants_owned' then
      select count(distinct i.variant_id)::integer into v
      from public.card_instances i
      join public.card_variants cv on cv.id = i.variant_id
      where i.owner_id = p_user and (not (p_params ? 'style') or cv.style = p_params ->> 'style');

    when 'variant_styles' then
      select count(distinct cv.style)::integer into v
      from public.card_instances i
      join public.card_variants cv on cv.id = i.variant_id
      where i.owner_id = p_user;

    when 'variant_styles_complete', 'variant_characters_complete' then
      -- Styles (or characters) of which the player owns every active variant, among the
      -- characters a player can find.
      select count(*)::integer into v
      from (
        select case p_metric when 'variant_styles_complete' then cv.style else cv.definition_id::text end as grp
        from public.card_variants cv
        join public.card_definitions d on d.id = cv.definition_id
        left join (
          select distinct i.variant_id from public.card_instances i
          where i.owner_id = p_user and i.variant_id is not null
        ) o on o.variant_id = cv.id
        where cv.is_active and public.is_pack_card(d)
        group by 1
        having count(o.variant_id) = count(*)
      ) g;

    when 'cards_conquered' then
      -- At most per_opponent_cap cards count from the same opponent (a bot counts as one).
      select coalesce(sum(case when p_params ? 'per_opponent_cap'
                               then least(x.n, (p_params ->> 'per_opponent_cap')::integer) else x.n end), 0)::integer
      into v
      from (
        select count(*) as n from public.card_transfers t
        where t.to_user = p_user and t.reason = 'conquest' and (p_since is null or t.created_at >= p_since)
        group by t.from_user
      ) x;

    when 'cards_lost' then
      select count(*)::integer into v from public.card_transfers t
      where t.from_user = p_user and t.reason = 'conquest' and (p_since is null or t.created_at >= p_since);

    when 'duplicates_converted' then
      select count(*)::integer into v from public.card_transfers t
      where t.from_user = p_user and t.reason = 'conversion' and (p_since is null or t.created_at >= p_since);

    when 'packs_opened' then
      select count(*)::integer into v from public.pack_openings o
      where o.user_id = p_user and o.pack_type in ('daily', 'standard', 'special')
        and (p_since is null or o.opened_at >= p_since);

    when 'daily_packs' then
      select count(*)::integer into v from public.daily_claims c
      where c.user_id = p_user and (p_since is null or c.claimed_at >= p_since);

    when 'emergency_passed' then
      select count(*)::integer into v
      from public.emergency_plays p join public.emergency_runs r on r.id = p.run_id
      where r.user_id = p_user and p.passed and (p_since is null or p.created_at >= p_since);

    when 'emergency_perfect_runs' then
      select count(*)::integer into v from public.emergency_runs r
      where r.user_id = p_user and r.status = 'finished'
        and r.passed >= coalesce((p_params ->> 'min_passed')::integer, public.config_int('emergency.threats_per_run'))
        and (p_since is null or r.finished_at >= p_since);

    when 'story_missions' then
      with scope as (
        select sm.id from public.story_missions sm
        join public.story_chapters c on c.chapter = sm.chapter
        where (not (p_params ? 'season') or c.season = (p_params ->> 'season')::integer)
          and (not (p_params ? 'chapter') or c.chapter = (p_params ->> 'chapter')::integer)
      ), done as (
        select sp.mission_id from public.story_progress sp join scope on scope.id = sp.mission_id
        where sp.user_id = p_user
      )
      select case when coalesce((p_params ->> 'all')::boolean, false)
        then ((select count(*) from scope) > 0 and (select count(*) from scope) = (select count(*) from done))::integer
        else (select count(*) from done)::integer end
      into v;

    when 'rare_threats_seen' then
      if coalesce((p_params ->> 'all')::boolean, false) then
        select (count(*) > 0 and bool_and(exists (
          select 1 from public.threat_sightings s where s.user_id = p_user and s.threat_id = t.id)))::integer
        into v
        from public.threat_definitions t where t.rarity_code is not null and t.is_active;
      else
        select count(*)::integer into v
        from public.threat_sightings s join public.threat_definitions t on t.id = s.threat_id
        where s.user_id = p_user and t.rarity_code is not null and (p_since is null or s.first_seen_at >= p_since);
      end if;

    when 'daily_objectives_completed' then
      select count(*)::integer into v from public.daily_objectives o
      where o.user_id = p_user and o.completed_at is not null and o.replaced_at is null
        and (p_since is null or o.completed_at >= p_since);

    when 'coins_earned' then
      select coalesce(sum(l.amount), 0)::integer into v from public.coin_ledger l
      where l.user_id = p_user and l.amount > 0 and l.reason not in ('achievement_reward', 'admin_adjustment')
        and (p_since is null or l.created_at >= p_since);

    when 'level' then
      select p.level into v from public.profiles p where p.id = p_user;

    when 'best_streak' then
      select p.best_streak into v from public.profiles p where p.id = p_user;

    when 'registered_before' then
      select (p.created_at < ((p_params ->> 'before')::date)::timestamp at time zone 'Europe/Rome')::integer
      into v from public.profiles p where p.id = p_user;

    else
      v := 0; -- 'manual': only an admin gives it.
  end case;
  return coalesce(v, 0);
end;
$$;

-- The album (same as in 20261101230000_card_variants.sql, one more column at the end): the
-- app hides the characters held back from packs that the player does not own, and leaves
-- them out of the total, until an admin puts them in packs. Level cards keep in_packs true.
create or replace view public.card_catalog
with (security_invoker = true)
as
select
  d.id,
  d.code,
  d.name,
  d.faction,
  d.flavor,
  d.stats,
  d.art_url,
  r.code as rarity_code,
  r.name as rarity_name,
  r.rank as rarity_rank,
  r.color as rarity_color,
  r.duplicate_coin_value,
  p.name as power_name,
  public.power_text(d.power_code, d.power_params) as power_text,
  d.unlock_level,
  (select count(*)::integer from public.card_variants v where v.definition_id = d.id and v.is_active) as variant_count,
  d.in_packs
from public.card_definitions d
join public.rarity_definitions r on r.code = d.rarity_code
left join public.power_definitions p on p.code = d.power_code
where d.is_active;
