-- Counting variants (SPEC §8.2, §8.3, §8.5):
--   * events: an optional bonus of event points for each variant in the team
--     ("+20% per variante in squadra"), the copies the player fielded;
--   * daily objectives: "Trova N varianti" (variants from packs the player
--     opens, as packs_opened counts them) and "Vinci N partite con una variante
--     in squadra";
--   * imprese: styles of which the player owns every variant, and characters of
--     which the player owns every variant.

-- ---------------------------------------------------------------------------
-- Events: points for the variants in the team
-- ---------------------------------------------------------------------------

-- Null: no bonus. Otherwise each variant in the team adds this share of the points.
alter table public.events add column variant_bonus_percent integer
  check (variant_bonus_percent is null or variant_bonus_percent between 1 and 100);

-- How many of the copies the player fielded for a match or an Emergenza run have a
-- variant (the same team as event_ref_team, by copy).
create function public.event_ref_team_variants(p_user uuid, p_ref_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer
  from public.card_instances i
  where i.variant_id is not null
    and i.id = any (coalesce(
      (select t.card_instance_ids from public.match_teams t where t.match_id = p_ref_id and t.user_id = p_user limit 1),
      (select r.card_instance_ids from public.emergency_runs r where r.id = p_ref_id and r.user_id = p_user),
      (select r.card_instance_ids from public.emergency_week_runs r where r.id = p_ref_id and r.user_id = p_user),
      '{}'
    ))
$$;

revoke execute on function public.event_ref_team_variants(uuid, uuid) from public, anon, authenticated;

-- Same as in 20261116240000_event_rarity_faction.sql, with the variant bonus.
create or replace function public.award_event_points(
  p_user uuid,
  p_kind text,
  p_outcome text,
  p_ref_id uuid,
  p_round integer,
  p_opponent uuid,
  p_started_at timestamptz
)
returns integer
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_event public.events;
  v_points integer;
  v_earned_today integer;
  v_total integer;
  v_tier public.event_tiers;
begin
  select * into v_event from public.events where id = public.current_event_id();
  if v_event.id is null or (p_started_at is not null and p_started_at < v_event.starts_at) then
    return 0;
  end if;

  -- An event that admits only some characters: the whole team must be admitted.
  if not public.event_admits_everyone(v_event.traits, v_event.rarities, v_event.factions)
     and not public.event_team_admitted(v_event.traits, v_event.rarities, v_event.factions,
                                        public.event_ref_team(p_user, p_ref_id)) then
    return 0;
  end if;

  v_points := coalesce((v_event.points -> p_kind ->> p_outcome)::integer, 0);
  if v_points <= 0 then
    return 0;
  end if;
  -- Variants in the team: each adds the event's share of the points, rounded down.
  if v_event.variant_bonus_percent is not null then
    v_points := v_points + floor(
      v_points * v_event.variant_bonus_percent * public.event_ref_team_variants(p_user, p_ref_id) / 100.0
    )::integer;
  end if;

  -- One player at a time: the daily cap and the targets cannot be passed twice.
  perform 1 from public.profiles where id = p_user for update;

  if p_opponent is not null and (
    select count(*) from public.event_points p
    where p.event_id = v_event.id and p.user_id = p_user and p.opponent_id = p_opponent
      and p.created_at > now() - make_interval(hours => public.config_int('events.same_opponent_window_hours'))
  ) >= public.config_int('events.same_opponent_matches') then
    return 0;
  end if;

  if v_event.daily_cap is not null then
    select coalesce(sum(p.points), 0) into v_earned_today
    from public.event_points p
    where p.event_id = v_event.id and p.user_id = p_user and public.game_day(p.created_at) = public.game_day();
    v_points := least(v_points, v_event.daily_cap - v_earned_today);
    if v_points <= 0 then
      return 0;
    end if;
  end if;

  insert into public.event_points (event_id, user_id, kind, outcome, ref_id, round, opponent_id, points)
  values (v_event.id, p_user, p_kind, p_outcome, p_ref_id, coalesce(p_round, 0), p_opponent, v_points)
  on conflict do nothing;
  if not found then
    return 0;
  end if;

  select sum(p.points) into v_total from public.event_points p where p.event_id = v_event.id and p.user_id = p_user;
  for v_tier in
    select * from public.event_tiers t
    where t.event_id = v_event.id and t.points <= v_total
      and not exists (select 1 from public.event_rewards r where r.event_id = t.event_id and r.tier = t.tier and r.user_id = p_user)
    order by t.tier
  loop
    perform public.grant_event_tier(p_user, v_tier);
  end loop;
  return v_points;
end;
$$;

-- Same as in 20261118233000_random_variant_rewards.sql, with the variant bonus.
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
    -- Points for each variant in the team, in % of the match's points; null: none.
    'variant_bonus_percent', e.variant_bonus_percent,
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

-- Same as in 20261118233000_random_variant_rewards.sql, with the variant bonus.
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
        'variant_bonus_percent', e.variant_bonus_percent,
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

drop function public.admin_save_event(text, text, timestamp, timestamp, jsonb, jsonb, integer, uuid, text[], text[], text[], integer, integer);

-- Same as in 20261118233000_random_variant_rewards.sql, with the variant bonus.
-- Like the other rules, it is fixed once the event has started.
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
  p_variant_chance_percent integer default null,
  p_variant_bonus_percent integer default null
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
  if p_variant_bonus_percent is not null and p_variant_bonus_percent not between 1 and 100 then
    raise exception 'event_invalid_variant_bonus';
  end if;
  if jsonb_typeof(p_tiers) is distinct from 'array'
     or jsonb_array_length(p_tiers) not between 1 and public.config_int('events.max_tiers') then
    raise exception 'event_invalid_tiers';
  end if;

  if v_id is null then
    insert into public.events (title, description, starts_at, ends_at, points, daily_cap, traits, rarities, factions,
                               quadrant_seal_target, variant_chance_percent, variant_bonus_percent, created_by)
    values (v_title, v_description, v_starts, v_ends, public.event_points_rules(p_points), p_daily_cap,
            v_traits, v_rarities, v_factions, p_quadrant_seal_target, p_variant_chance_percent,
            p_variant_bonus_percent, auth.uid())
    returning id into v_id;
  else
    update public.events
    set title = v_title, description = v_description, starts_at = v_starts, ends_at = v_ends,
        points = public.event_points_rules(p_points), daily_cap = p_daily_cap,
        traits = v_traits, rarities = v_rarities, factions = v_factions,
        quadrant_seal_target = p_quadrant_seal_target, variant_chance_percent = p_variant_chance_percent,
        variant_bonus_percent = p_variant_bonus_percent
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

revoke execute on function public.admin_save_event(text, text, timestamp, timestamp, jsonb, jsonb, integer, uuid, text[], text[], text[], integer, integer, integer) from public, anon;
grant execute on function public.admin_save_event(text, text, timestamp, timestamp, jsonb, jsonb, integer, uuid, text[], text[], text[], integer, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Daily objectives: variants found, wins with a variant
-- ---------------------------------------------------------------------------

alter table public.daily_objective_definitions drop constraint daily_objective_definitions_metric_check;
alter table public.daily_objective_definitions add constraint daily_objective_definitions_metric_check check (metric in (
  'matches_played', 'matches_won', 'threats_won', 'cards_played',
  'emergency_passed', 'packs_opened', 'duplicates_converted', 'cards_conquered',
  'variants_found', 'variant_wins'
));

-- Same as in 20261112110000_quadrant.sql: "variant_wins" takes the filters of a win.
create or replace function public.daily_objective_params_valid(p_metric text, p_params jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case when jsonb_typeof(p_params) is distinct from 'object' then false else
    not exists (
      select 1 from jsonb_object_keys(p_params) k
      where not (k = any (case
        when p_metric in ('threats_won', 'cards_played') then
          array['format', 'story', 'opponent', 'bot_difficulties', 'flawless', 'faction', 'min_rarity_rank', 'max_rarity_rank']
        when p_metric in ('matches_played', 'matches_won', 'variant_wins') then
          array['format', 'story', 'opponent', 'bot_difficulties', 'flawless']
        else array[]::text[]
      end))
    )
    and (not (p_params ? 'format') or p_params ->> 'format' in ('classic', 'boss', 'triple', 'quadrant', 'quadrant_shifting'))
    and (not (p_params ? 'opponent') or p_params ->> 'opponent' in ('player', 'bot'))
    and (not (p_params ? 'faction') or p_params ->> 'faction' in ('heroes', 'villains', 'neutrals'))
    and (not (p_params ? 'story') or jsonb_typeof(p_params -> 'story') = 'boolean')
    and (not (p_params ? 'flawless') or jsonb_typeof(p_params -> 'flawless') = 'boolean')
    and (not (p_params ? 'bot_difficulties') or jsonb_typeof(p_params -> 'bot_difficulties') = 'array')
    and (not (p_params ? 'min_rarity_rank') or jsonb_typeof(p_params -> 'min_rarity_rank') = 'number')
    and (not (p_params ? 'max_rarity_rank') or jsonb_typeof(p_params -> 'max_rarity_rank') = 'number')
  end
$$;

-- Same as in 20261111100000_daily_objectives.sql, with "variant_wins".
create or replace function public.daily_objective_match_amount(p_metric text, p_params jsonb, p_match public.matches, p_side text)
returns integer
language plpgsql
stable
set search_path = ''
as $$
declare
  v_other_rounds integer := case p_side when 'a' then p_match.rounds_won_b else p_match.rounds_won_a end;
begin
  if p_params ? 'format' and p_match.format <> p_params ->> 'format' then
    return 0;
  end if;
  if coalesce((p_params ->> 'story')::boolean, false) and p_match.story_mission_id is null then
    return 0;
  end if;
  if p_params ->> 'opponent' = 'player' and p_match.bot_difficulty is not null then
    return 0;
  end if;
  if p_params ->> 'opponent' = 'bot' and p_match.bot_difficulty is null then
    return 0;
  end if;
  if p_params ? 'bot_difficulties'
     and not coalesce(p_params -> 'bot_difficulties' ? p_match.bot_difficulty, false) then
    return 0;
  end if;
  if coalesce((p_params ->> 'flawless')::boolean, false) and v_other_rounds > 0 then
    return 0;
  end if;

  case p_metric
    when 'matches_played' then
      return 1;
    when 'matches_won' then
      return (p_match.result = p_side)::integer;
    when 'variant_wins' then
      -- A win with at least one variant among the copies that side fielded.
      return (p_match.result = p_side and exists (
        select 1 from public.match_teams t
        join public.card_instances i on i.id = any (t.card_instance_ids)
        where t.match_id = p_match.id and t.side = p_side and i.variant_id is not null
      ))::integer;
    when 'threats_won' then
      if p_match.format not in ('classic', 'triple') then
        return 0;
      end if;
      return (
        select count(*)::integer
        from public.round_plays rp
        join public.match_rounds mr on mr.match_id = rp.match_id and mr.round = rp.round
        join public.card_definitions d on d.id = rp.definition_id
        join public.rarity_definitions r on r.code = d.rarity_code
        where rp.match_id = p_match.id and rp.side = p_side and mr.winner_side = p_side
          and public.daily_objective_card_fits(p_params, d.faction, r.rank)
      );
    when 'cards_played' then
      return (
        select count(distinct rp.definition_id)::integer
        from public.round_plays rp
        join public.card_definitions d on d.id = rp.definition_id
        join public.rarity_definitions r on r.code = d.rarity_code
        where rp.match_id = p_match.id and rp.side = p_side
          and public.daily_objective_card_fits(p_params, d.faction, r.rank)
      );
    else
      return 0;
  end case;
end;
$$;

-- Same as in 20261111100000_daily_objectives.sql, with "variant_wins".
create or replace function public.advance_match_daily_objectives()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_side text;
  v_user uuid;
  v_day date;
  v_objective record;
begin
  if new.status <> 'finished' or old.status = 'finished' or new.end_reason is distinct from 'completed' then
    return new;
  end if;
  foreach v_side in array array['a', 'b'] loop
    v_user := case v_side when 'a' then new.player_a else new.player_b end;
    continue when v_user is null; -- a bot
    v_day := public.ensure_daily_objectives(v_user);
    for v_objective in
      select o.id, o.metric, o.params from public.daily_objectives o
      where o.user_id = v_user and o.day = v_day and o.completed_at is null and o.replaced_at is null
        and o.metric in ('matches_played', 'matches_won', 'threats_won', 'cards_played', 'variant_wins')
    loop
      perform public.add_daily_objective_progress(
        v_objective.id,
        public.daily_objective_match_amount(v_objective.metric, v_objective.params, new, v_side)
      );
    end loop;
  end loop;
  return new;
end;
$$;

-- Same as in 20261111100000_daily_objectives.sql: the same packs count their variants.
create or replace function public.advance_pack_daily_objectives()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.pack_type in ('daily', 'standard', 'special')
     and coalesce(current_setting('o_mega.objective_claim', true), '') <> 'on' then
    perform public.advance_daily_objectives(new.user_id, 'packs_opened', 1);
    -- The variants found in it.
    perform public.advance_daily_objectives(new.user_id, 'variants_found', (
      select count(*)::integer from public.card_instances i
      where i.id = any (new.card_instance_ids) and i.variant_id is not null
    ));
  end if;
  return new;
end;
$$;

-- Same as in 20261118233000_random_variant_rewards.sql, with the two new metrics.
create or replace function public.admin_save_daily_objective(
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
       'emergency_passed', 'packs_opened', 'duplicates_converted', 'cards_conquered',
       'variants_found', 'variant_wins')
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

-- ---------------------------------------------------------------------------
-- Imprese: complete styles and complete characters
-- ---------------------------------------------------------------------------

alter table public.achievements drop constraint achievements_metric_check;
alter table public.achievements add constraint achievements_metric_check check (metric in (
  'matches_played', 'matches_won', 'comeback_wins', 'upset_rounds', 'close_rounds', 'team_wins', 'modes_won',
  'night_matches', 'characters_owned', 'variants_owned', 'variant_styles', 'cards_conquered', 'cards_lost',
  'duplicates_converted', 'packs_opened', 'daily_packs', 'emergency_passed', 'emergency_perfect_runs',
  'story_missions', 'rare_threats_seen', 'daily_objectives_completed', 'coins_earned', 'level', 'best_streak',
  'registered_before', 'manual', 'variant_styles_complete', 'variant_characters_complete'
));

-- Same as in 20261115170000_achievements.sql, with complete styles and characters.
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
        where d.is_active
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
        where cv.is_active and d.is_active and d.unlock_level is null
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

-- Same as in 20261115170000_achievements.sql, with complete styles and characters.
create or replace function public.check_transfer_achievements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.check_achievements(u.id, array[
    'characters_owned', 'variants_owned', 'variant_styles', 'cards_conquered', 'cards_lost', 'duplicates_converted',
    'variant_styles_complete', 'variant_characters_complete'])
  from (
    select t.to_user as id from new_transfers t where t.to_user is not null
    union
    select t.from_user from new_transfers t where t.from_user is not null and t.reason in ('conquest', 'conversion')
  ) u;
  return null;
end;
$$;
