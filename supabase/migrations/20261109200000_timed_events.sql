-- Timed events (SPEC §8.2): between a start and an end chosen by an admin,
-- matches earn event points, and reaching each target of the event pays its
-- reward (coins, standard packs, chosen cards with an optional variant, as a
-- bonus code). Points are written by the database in the transaction that ends
-- the match (or records the Emergenza threat), never by a client.

insert into public.game_config (key, value, description) values
  ('events.same_opponent_matches', '3', 'Matches against the same player that earn event points within the window'),
  ('events.same_opponent_window_hours', '24', 'Window for the same-opponent event points limit'),
  ('events.max_tiers', '5', 'Targets an event can have');

alter table public.coin_ledger drop constraint coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in (
  'pack_purchase', 'match_reward', 'bot_match_reward', 'duplicate_conversion', 'conquest_bonus', 'level_reward',
  'emergency_reward', 'bonus_code', 'story_reward', 'event_reward', 'admin_adjustment'
));

alter table public.card_instances drop constraint card_instances_acquired_via_check;
alter table public.card_instances add constraint card_instances_acquired_via_check
  check (acquired_via in ('starter', 'pack', 'conquest', 'trade', 'level_unlock', 'bonus_code', 'story', 'event'));

alter table public.card_transfers drop constraint card_transfers_reason_check;
alter table public.card_transfers add constraint card_transfers_reason_check
  check (reason in ('starter', 'pack', 'conquest', 'trade', 'conversion', 'level_unlock', 'bonus_code', 'story', 'event'));

alter table public.pack_openings drop constraint pack_openings_pack_type_check;
alter table public.pack_openings add constraint pack_openings_pack_type_check
  check (pack_type in ('daily', 'standard', 'bonus', 'event'));

-- ---------------------------------------------------------------------------
-- Tables. No client reads them: everything goes through the functions below.
-- ---------------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 60),
  description text not null default '' check (char_length(description) <= 500),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- Points per kind of match and outcome, normalized by event_points_rules:
  -- {"friendly": {"win", "draw", "loss"}, "conquest": …, "bot": …, "story": …, "emergency": {"passed"}}
  points jsonb not null,
  -- Most points a player can earn in a game day (Europe/Rome); null: no limit.
  daily_cap integer check (daily_cap is null or daily_cap > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint events_period check (ends_at > starts_at)
);

create index events_period_idx on public.events (starts_at, ends_at) where is_active;
create index events_created_by_idx on public.events (created_by);

create table public.event_tiers (
  event_id uuid not null references public.events (id) on delete cascade,
  tier integer not null check (tier >= 1),
  points integer not null check (points > 0),
  coins integer not null default 0 check (coins >= 0),
  packs integer not null default 0 check (packs >= 0),
  card_definition_ids uuid[] not null default '{}',
  -- One entry per card: the variant of that copy, or null for the base drawing.
  card_variant_ids uuid[] not null default '{}',
  primary key (event_id, tier),
  constraint event_tiers_variants_per_card check (cardinality(card_variant_ids) = cardinality(card_definition_ids)),
  constraint event_tiers_has_reward check (coins > 0 or packs > 0 or cardinality(card_definition_ids) > 0)
);

-- The ledger of event points: a player's progress is always its sum.
create table public.event_points (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('friendly', 'conquest', 'bot', 'story', 'emergency')),
  outcome text not null check (outcome in ('win', 'draw', 'loss', 'passed')),
  -- The match, or the Emergenza run.
  ref_id uuid not null,
  -- The threat of an Emergenza run; 0 for a match.
  round integer not null default 0,
  -- The other player of a PvP match, for the same-opponent limit.
  opponent_id uuid references public.profiles (id) on delete set null,
  points integer not null check (points > 0),
  created_at timestamptz not null default now(),
  unique (event_id, user_id, ref_id, round)
);

create index event_points_user_idx on public.event_points (user_id, event_id, created_at);
create index event_points_ref_idx on public.event_points (ref_id);
create index event_points_opponent_idx on public.event_points (opponent_id);

-- One row per target reached: what it paid, and whether the player saw it.
create table public.event_rewards (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  tier integer not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  coins integer not null,
  packs integer not null,
  opening_ids uuid[] not null default '{}',
  granted_at timestamptz not null default now(),
  seen_at timestamptz,
  unique (event_id, tier, user_id),
  foreign key (event_id, tier) references public.event_tiers (event_id, tier) on delete cascade
);

create index event_rewards_unseen_idx on public.event_rewards (user_id) where seen_at is null;

alter table public.events enable row level security;
alter table public.event_tiers enable row level security;
alter table public.event_points enable row level security;
alter table public.event_rewards enable row level security;
revoke all on table public.events, public.event_tiers, public.event_points, public.event_rewards from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------

-- The point table with every key, each a whole number from 0 to 1000.
create function public.event_points_rules(p_points jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_kind text;
  v_outcome text;
  v_value integer;
  v_rules jsonb := '{}'::jsonb;
  v_kinds jsonb := '{"friendly": ["win", "draw", "loss"], "conquest": ["win", "draw", "loss"],
                    "bot": ["win", "draw", "loss"], "story": ["win", "draw", "loss"], "emergency": ["passed"]}';
begin
  for v_kind in select jsonb_object_keys(v_kinds) loop
    v_rules := v_rules || jsonb_build_object(v_kind, '{}'::jsonb);
    for v_outcome in select jsonb_array_elements_text(v_kinds -> v_kind) loop
      begin
        v_value := coalesce((p_points -> v_kind ->> v_outcome)::integer, 0);
      exception when others then
        raise exception 'event_invalid_points';
      end;
      if v_value < 0 or v_value > 1000 then
        raise exception 'event_invalid_points';
      end if;
      v_rules := jsonb_set(v_rules, array[v_kind, v_outcome], to_jsonb(v_value));
    end loop;
  end loop;
  return v_rules;
end;
$$;

-- 'P051' for the base drawing, 'P051:neon' for that variant (as in create_bonus_code).
create function public.event_reward_cards(
  p_card_codes text[],
  out definition_ids uuid[],
  out variant_ids uuid[]
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_card_code text;
  v_style text;
  v_definition uuid;
  v_variant uuid;
begin
  definition_ids := '{}';
  variant_ids := '{}';
  foreach v_card_code in array coalesce(p_card_codes, '{}') loop
    v_style := nullif(split_part(v_card_code, ':', 2), '');
    -- Level cards are earned by levelling up.
    select d.id into v_definition
    from public.card_definitions d
    where d.code = split_part(v_card_code, ':', 1) and d.is_active and d.unlock_level is null;
    if not found then
      raise exception 'event_invalid_card';
    end if;
    v_variant := null;
    if v_style is not null then
      select v.id into v_variant
      from public.card_variants v
      where v.definition_id = v_definition and v.style = v_style and v.is_active;
      if not found then
        raise exception 'event_invalid_card';
      end if;
    end if;
    definition_ids := definition_ids || v_definition;
    variant_ids := variant_ids || v_variant;
  end loop;
end;
$$;

-- The event running now, if any: events never overlap.
create function public.current_event_id(p_at timestamptz default now())
returns uuid
language sql
stable
set search_path = ''
as $$
  select e.id from public.events e
  where e.is_active and e.starts_at <= p_at and e.ends_at > p_at
  order by e.starts_at
  limit 1
$$;

-- Pays one target: the same model as a bonus code, the cards shown like a pack.
create function public.grant_event_tier(p_user uuid, p_tier public.event_tiers)
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

-- Credits a match or an Emergenza threat to the running event, within its
-- limits, then pays every target the new total reaches. p_started_at: a match
-- counts only if it began during the event.
create function public.award_event_points(
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

revoke execute on function public.event_points_rules(jsonb) from public, anon, authenticated;
revoke execute on function public.event_reward_cards(text[]) from public, anon, authenticated;
revoke execute on function public.current_event_id(timestamptz) from public, anon, authenticated;
revoke execute on function public.grant_event_tier(uuid, public.event_tiers) from public, anon, authenticated;
revoke execute on function public.award_event_points(uuid, text, text, uuid, integer, uuid, timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Where points come from: the end of a match, and each Emergenza threat passed.
-- Abandoned matches earn nothing, for either side.
-- ---------------------------------------------------------------------------

create function public.award_match_event_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text;
  v_side text;
  v_user uuid;
  v_opponent uuid;
begin
  if new.status <> 'finished' or old.status = 'finished' or new.end_reason is distinct from 'completed' then
    return new;
  end if;
  v_kind := case
    when new.story_mission_id is not null then 'story'
    when new.mode = 'conquest' then 'conquest'
    when new.bot_difficulty is not null then 'bot'
    else 'friendly'
  end;
  foreach v_side in array array['a', 'b'] loop
    v_user := case v_side when 'a' then new.player_a else new.player_b end;
    continue when v_user is null; -- a bot
    v_opponent := case v_side when 'a' then new.player_b else new.player_a end;
    perform public.award_event_points(
      v_user,
      v_kind,
      case when new.result = v_side then 'win' when new.result = 'draw' then 'draw' else 'loss' end,
      new.id,
      0,
      v_opponent,
      new.created_at
    );
  end loop;
  return new;
end;
$$;

revoke execute on function public.award_match_event_points() from public, anon, authenticated;

create trigger matches_award_event_points
  after update of status on public.matches
  for each row execute function public.award_match_event_points();

create function public.award_emergency_event_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.passed then
    perform public.award_event_points(r.user_id, 'emergency', 'passed', r.id, new.round, null, null)
    from public.emergency_runs r where r.id = new.run_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.award_emergency_event_points() from public, anon, authenticated;

create trigger emergency_plays_award_event_points
  after insert on public.emergency_plays
  for each row execute function public.award_emergency_event_points();

-- ---------------------------------------------------------------------------
-- Player RPCs
-- ---------------------------------------------------------------------------

-- An event as players see it: its rules, its targets with their cards, and the
-- caller's progress.
create function public.event_payload(p_event_id uuid, p_user uuid)
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

revoke execute on function public.event_payload(uuid, uuid) from public, anon, authenticated;

-- The running event, else the next one; and an event already over whose
-- rewards the player has not opened yet.
create function public.get_event()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_event uuid;
  v_unseen uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  v_event := coalesce(public.current_event_id(), (
    select e.id from public.events e where e.is_active and e.starts_at > now() order by e.starts_at limit 1
  ));
  select r.event_id into v_unseen
  from public.event_rewards r
  where r.user_id = v_uid and r.seen_at is null and r.event_id is distinct from v_event
  order by r.granted_at desc
  limit 1;
  return jsonb_build_object(
    'now', now(),
    'event', case when v_event is null then null else public.event_payload(v_event, v_uid) end,
    'ended_with_rewards', case when v_unseen is null then null else public.event_payload(v_unseen, v_uid) end
  );
end;
$$;

revoke execute on function public.get_event() from public, anon;
grant execute on function public.get_event() to authenticated;

-- The rewards of an event were shown: the banner stops pointing at them.
create function public.mark_event_rewards_seen(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  update public.event_rewards set seen_at = now()
  where event_id = p_event_id and user_id = auth.uid() and seen_at is null;
end;
$$;

revoke execute on function public.mark_event_rewards_seen(uuid) from public, anon;
grant execute on function public.mark_event_rewards_seen(uuid) to authenticated;

-- On a match result: the event points the match earned the caller. Today's
-- Emergenza run when p_ref_id is null (the client does not know the run id).
create function public.get_event_points_for(p_ref_id uuid)
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

revoke execute on function public.get_event_points_for(uuid) from public, anon;
grant execute on function public.get_event_points_for(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin RPCs: every one checks is_admin() on the server.
-- ---------------------------------------------------------------------------

create function public.admin_events_payload()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'now', now(),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'title', e.title,
        'description', e.description,
        'starts_at', e.starts_at,
        'ends_at', e.ends_at,
        'points', e.points,
        'daily_cap', e.daily_cap,
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

revoke execute on function public.admin_events_payload() from public, anon, authenticated;

create function public.admin_list_events()
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
  return public.admin_events_payload();
end;
$$;

revoke execute on function public.admin_list_events() from public, anon;
grant execute on function public.admin_list_events() to authenticated;

-- Creates an event (no p_id) or changes one. p_daily_cap null: no daily limit. Times are wall-clock times in
-- Europe/Rome. Once an event has started only its texts and its end change, so
-- the rules never move under players; an event that is over does not change.
-- p_tiers: [{"points": 300, "coins": 100, "packs": 1, "cards": ["P051:neon"]}, …]
create function public.admin_save_event(
  p_title text,
  p_description text,
  p_starts_at timestamp,
  p_ends_at timestamp,
  p_points jsonb,
  p_tiers jsonb,
  p_daily_cap integer default null,
  p_id uuid default null
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

  if p_daily_cap is not null and (p_daily_cap < 1 or p_daily_cap > 100000) then
    raise exception 'event_invalid_points';
  end if;
  if jsonb_typeof(p_tiers) is distinct from 'array'
     or jsonb_array_length(p_tiers) not between 1 and public.config_int('events.max_tiers') then
    raise exception 'event_invalid_tiers';
  end if;

  if v_id is null then
    insert into public.events (title, description, starts_at, ends_at, points, daily_cap, created_by)
    values (v_title, v_description, v_starts, v_ends, public.event_points_rules(p_points), p_daily_cap, auth.uid())
    returning id into v_id;
  else
    update public.events
    set title = v_title, description = v_description, starts_at = v_starts, ends_at = v_ends,
        points = public.event_points_rules(p_points), daily_cap = p_daily_cap
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

revoke execute on function public.admin_save_event(text, text, timestamp, timestamp, jsonb, jsonb, integer, uuid) from public, anon;
grant execute on function public.admin_save_event(text, text, timestamp, timestamp, jsonb, jsonb, integer, uuid) to authenticated;

-- Stops an event (no more points; rewards already paid stay) or turns it back on.
create function public.admin_set_event_active(p_id uuid, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('public.events'));
  select * into v_event from public.events where id = p_id for update;
  if v_event.id is null then
    raise exception 'event_not_found';
  end if;
  if p_active and exists (
    select 1 from public.events e
    where e.is_active and e.id <> p_id and e.starts_at < v_event.ends_at and e.ends_at > v_event.starts_at
  ) then
    raise exception 'event_overlap';
  end if;
  update public.events set is_active = p_active where id = p_id;
  return public.admin_events_payload();
end;
$$;

revoke execute on function public.admin_set_event_active(uuid, boolean) from public, anon;
grant execute on function public.admin_set_event_active(uuid, boolean) to authenticated;

-- Only an event nobody has played yet can be deleted.
create function public.admin_delete_event(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if exists (select 1 from public.event_points p where p.event_id = p_id) then
    raise exception 'event_has_points';
  end if;
  delete from public.events where id = p_id;
  if not found then
    raise exception 'event_not_found';
  end if;
  return public.admin_events_payload();
end;
$$;

revoke execute on function public.admin_delete_event(uuid) from public, anon;
grant execute on function public.admin_delete_event(uuid) to authenticated;
