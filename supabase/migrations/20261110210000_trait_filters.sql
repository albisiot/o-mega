-- Traits in the admin pages (SPEC §4.7, §7, §7.1, §8.2).
--
-- "Carte nei pacchetti", "Pacchetti speciali" and the reward cards of
-- "Gestione eventi" can filter the card list by trait: their payloads now carry
-- the traits of every card and the trait catalog. Filtering is only a way to
-- pick cards: what is saved is still the list of cards.
--
-- An event can also admit only some characters (events.traits, read with
-- card_matches_traits: one of the listed traits in each listed category). A
-- match, or an Emergenza run, earns event points only if every character of the
-- player's team is admitted. The check runs in award_event_points, inside the
-- transaction that ends the match; the result screen says when a team was not
-- admitted. Like the other rules, it does not change once the event started.

insert into public.game_config (key, value, description) values
  ('events.min_admitted_characters', '8', 'Fewest characters an event that admits only some traits must allow (an Emergenza squad)');

alter table public.events add column traits text[] not null default '{}';

comment on column public.events.traits is
  'Only teams made entirely of characters with these traits earn points (card_matches_traits); empty: every character.';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Every trait category with its traits, in catalog order.
create function public.trait_catalog_payload()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'code', c.code,
    'name', c.name,
    'traits', (
      select coalesce(jsonb_agg(jsonb_build_object('code', t.code, 'name', t.name) order by t.sort_order), '[]'::jsonb)
      from public.traits t where t.category_code = c.code
    )
  ) order by c.sort_order), '[]'::jsonb)
  from public.trait_categories c
$$;

revoke execute on function public.trait_catalog_payload() from public, anon, authenticated;

-- The trait codes of a character.
create function public.card_trait_codes(p_definition_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(ct.trait_code order by ct.trait_code), '[]'::jsonb)
  from public.card_definition_traits ct
  where ct.definition_id = p_definition_id
$$;

revoke execute on function public.card_trait_codes(uuid) from public, anon, authenticated;

-- How many characters players can field with these traits (active, not level cards).
create function public.trait_admitted_count(p_traits text[])
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer
  from public.card_definitions d
  where d.is_active and d.unlock_level is null and public.card_matches_traits(d.id, p_traits)
$$;

revoke execute on function public.trait_admitted_count(text[]) from public, anon, authenticated;

-- The admitted traits as players read them: [{"category": "Origine", "traits": ["Mito", "Strappo"]}, …].
create function public.traits_description(p_traits text[])
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('category', x.category, 'traits', x.traits) order by x.sort_order), '[]'::jsonb)
  from (
    select c.name as category, c.sort_order, jsonb_agg(t.name order by t.sort_order) as traits
    from public.traits t
    join public.trait_categories c on c.code = t.category_code
    where t.code = any (coalesce(p_traits, '{}'))
    group by c.code, c.name, c.sort_order
  ) x
$$;

revoke execute on function public.traits_description(text[]) from public, anon, authenticated;

-- The characters a player fielded for an event point: the team of a match, or
-- the squad of an Emergenza run. Empty if there is none.
create function public.event_ref_team(p_user uuid, p_ref_id uuid)
returns uuid[]
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select t.definition_ids from public.match_teams t where t.match_id = p_ref_id and t.user_id = p_user limit 1),
    (select r.definition_ids from public.emergency_runs r where r.id = p_ref_id and r.user_id = p_user),
    '{}'
  )
$$;

revoke execute on function public.event_ref_team(uuid, uuid) from public, anon, authenticated;

-- True when the event admits the whole team: every character has the traits.
-- No traits admit every team; an empty team is never admitted.
create function public.event_team_admitted(p_traits text[], p_definition_ids uuid[])
returns boolean
language sql
stable
set search_path = ''
as $$
  select cardinality(coalesce(p_traits, '{}')) = 0
    or (
      cardinality(coalesce(p_definition_ids, '{}')) > 0
      and not exists (
        select 1 from unnest(p_definition_ids) as u(id) where not public.card_matches_traits(u.id, p_traits)
      )
    )
$$;

revoke execute on function public.event_team_admitted(text[], uuid[]) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Event points: only admitted teams earn them
-- ---------------------------------------------------------------------------


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

  -- An event that admits only some characters: the whole team must have them.
  if cardinality(v_event.traits) > 0
     and not public.event_team_admitted(v_event.traits, public.event_ref_team(p_user, p_ref_id)) then
    return 0;
  end if;

  v_points := coalesce((v_event.points -> p_kind ->> p_outcome)::integer, 0);
  if v_points <= 0 then
    return 0;
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

-- The rules for players: which characters the event admits, and how many there are.
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
    -- Only teams of these characters earn points; [] admits everyone.
    'admitted', public.traits_description(e.traits),
    'admitted_characters', case when cardinality(e.traits) = 0 then null else public.trait_admitted_count(e.traits) end,
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

-- On a match result: also when the running event did not admit the team (0 points, not_admitted).
create or replace function public.get_event_points_for(p_ref_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_event uuid;
  v_points integer;
  v_ref uuid;
  v_running public.events;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select p.event_id, sum(p.points)::integer into v_event, v_points
  from public.event_points p
  where p.user_id = v_uid and p.ref_id = coalesce(p_ref_id, (
    select r.id from public.emergency_runs r where r.user_id = v_uid and r.day = public.game_day()
  ))
  group by p.event_id
  limit 1;
  if v_event is null then
    -- No points: say so when the running event did not admit the team.
    v_ref := coalesce(p_ref_id, (
      select r.id from public.emergency_runs r where r.user_id = v_uid and r.day = public.game_day()
    ));
    select * into v_running from public.events where id = public.current_event_id();
    if v_running.id is not null and cardinality(v_running.traits) > 0
       and cardinality(public.event_ref_team(v_uid, v_ref)) > 0
       and not public.event_team_admitted(v_running.traits, public.event_ref_team(v_uid, v_ref)) then
      return jsonb_build_object(
        'points', 0,
        'title', v_running.title,
        'total', (select coalesce(sum(p.points), 0) from public.event_points p
                  where p.event_id = v_running.id and p.user_id = v_uid),
        'new_rewards', 0,
        'not_admitted', true
      );
    end if;
    return null;
  end if;
  return jsonb_build_object(
    'points', v_points,
    'title', (select e.title from public.events e where e.id = v_event),
    'total', (select sum(p.points) from public.event_points p where p.event_id = v_event and p.user_id = v_uid),
    'new_rewards', (
      select count(*) from public.event_rewards r
      where r.event_id = v_event and r.user_id = v_uid and r.seen_at is null
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------

-- The events with their admitted traits, the trait catalog and the traits of every reward card.
create or replace function public.admin_events_payload()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'now', now(),
    'trait_catalog', public.trait_catalog_payload(),
    'min_admitted_characters', public.config_int('events.min_admitted_characters'),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'title', e.title,
        'description', e.description,
        'starts_at', e.starts_at,
        'ends_at', e.ends_at,
        'points', e.points,
        'daily_cap', e.daily_cap,
        'traits', to_jsonb(e.traits),
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

-- Same as before, with p_traits: the characters the event admits (empty: all of them).
drop function public.admin_save_event(text, text, timestamp, timestamp, jsonb, jsonb, integer, uuid);

create function public.admin_save_event(
  p_title text,
  p_description text,
  p_starts_at timestamp,
  p_ends_at timestamp,
  p_points jsonb,
  p_tiers jsonb,
  p_daily_cap integer default null,
  p_id uuid default null,
  p_traits text[] default '{}'
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

  -- Admitted characters: known traits, and enough characters for an Emergenza squad.
  if exists (select 1 from unnest(v_traits) as t where not exists (select 1 from public.traits x where x.code = t))
     or (cardinality(v_traits) > 0 and public.trait_admitted_count(v_traits) < public.config_int('events.min_admitted_characters')) then
    raise exception 'event_invalid_traits';
  end if;

  if p_daily_cap is not null and (p_daily_cap < 1 or p_daily_cap > 100000) then
    raise exception 'event_invalid_points';
  end if;
  if jsonb_typeof(p_tiers) is distinct from 'array'
     or jsonb_array_length(p_tiers) not between 1 and public.config_int('events.max_tiers') then
    raise exception 'event_invalid_tiers';
  end if;

  if v_id is null then
    insert into public.events (title, description, starts_at, ends_at, points, daily_cap, traits, created_by)
    values (v_title, v_description, v_starts, v_ends, public.event_points_rules(p_points), p_daily_cap, v_traits, auth.uid())
    returning id into v_id;
  else
    update public.events
    set title = v_title, description = v_description, starts_at = v_starts, ends_at = v_ends,
        points = public.event_points_rules(p_points), daily_cap = p_daily_cap, traits = v_traits
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

revoke execute on function public.admin_save_event(text, text, timestamp, timestamp, jsonb, jsonb, integer, uuid, text[]) from public, anon;
grant execute on function public.admin_save_event(text, text, timestamp, timestamp, jsonb, jsonb, integer, uuid, text[]) to authenticated;

-- Carte nei pacchetti: the traits of every card, to filter the list.
create or replace function public.admin_pack_cards_payload()
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
        'in_packs', d.in_packs,
        'traits', public.card_trait_codes(d.id)
      ) order by r.rank, d.name)
      from public.card_definitions d
      join public.rarity_definitions r on r.code = d.rarity_code
      where d.is_active and d.unlock_level is null
    ), '[]'::jsonb),
    'guaranteed_min_rarity_rank', public.config_int('packs.guaranteed_min_rarity_rank'),
    'trait_catalog', public.trait_catalog_payload()
  )
$$;

-- Pacchetti speciali: the traits of every card, to filter the list.
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
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', d.code, 'name', d.name, 'rarity_code', d.rarity_code, 'art_url', d.art_url,
        'has_variants', exists (select 1 from public.card_variants v where v.definition_id = d.id and v.is_active),
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
