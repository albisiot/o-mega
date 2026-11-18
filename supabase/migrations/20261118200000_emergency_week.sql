-- Emergenza della settimana (SPEC §5.16): a harder weekly version of the daily
-- Emergenza (§5.10), with its own leaderboard, prizes and weekly title.
--
-- The week goes from Monday 00:00 to Sunday 23:59, Europe/Rome (game_week). The Edge
-- Function "match" draws the week's 10 threats with real randomness the first time
-- anyone opens it (usual threats of Nuova Megara only, rare ones at their chance, as the
-- daily) and scores every play with the rules engine; the functions below store the draw,
-- re-check the squad, the round order and the outcome, pay the rewards and rank the runs.
-- One attempt per player per week, no timer, resumable until Sunday 23:59: a run left
-- unfinished never enters the leaderboard. Clients read nothing directly: the state comes
-- through the Edge Function, the rest through the security definer RPCs below, and the
-- week's threats never reach a client before it plays them.
--
-- Harder than the daily: 10 threats instead of 8 and thresholds 2 points higher at every
-- level (9, 15, 20, 25, 30, 34). The level sum is higher too (36-44 for 10 threats, an
-- average of 4 against the daily's 3.5), for more threats of level 5-6, but the simulation
-- shows it is not what makes the week harder: the thresholds give every level about the
-- same difficulty. Rare threats keep their own target (emergency_target). Numbers from
-- scripts/simulate-emergency.mts, in SPEC §5.16.
--
-- The daily Emergenza does not change: its tables, functions and triggers are untouched,
-- and the week has tables of its own. What the week shares with the rest of the game:
--   - event points: 'emergency' points per threat passed, as the daily (§8.2), with the
--     whole squad of 10 admitted (event_ref_team learns the weekly runs);
--   - the Bestiario: a threat played in the week is a threat seen (threat_sightings);
--   - the Classifiche (§8.6): a board 'emergency_week' with only its week, and the weekly
--     title «Eroe della settimana» to its first when the week is closed;
--   - coins (coin_ledger 'emergency_week_reward', 'emergency_week_prize') and prize packs
--     (pack type 'emergency', as the daily prizes).
-- Daily objectives and imprese keep counting the daily Emergenza only.
--
-- The admin rule that every level keeps 8 usual threats of Nuova Megara (admin_update_threat)
-- is enough for the week too: with a threat of level 1-2 and one of level 5-6 among 10, at
-- most 8 threats share a level.

insert into public.game_config (key, value, description) values
  ('emergency_week.threats_per_run', '10', 'Threats of an Emergenza della settimana run, and characters of its squad'),
  ('emergency_week.max_failures', '3', 'Failed threats that end a weekly Emergenza run'),
  ('emergency_week.threat_levels.min_sum', '36', 'Minimum sum of the threat levels of a weekly Emergenza'),
  ('emergency_week.threat_levels.max_sum', '44', 'Maximum sum of the threat levels of a weekly Emergenza'),
  ('emergency_week.targets.level1', '9', 'Weekly Emergenza: score needed to pass a threat of level 1'),
  ('emergency_week.targets.level2', '15', 'Weekly Emergenza: score needed to pass a threat of level 2'),
  ('emergency_week.targets.level3', '20', 'Weekly Emergenza: score needed to pass a threat of level 3'),
  ('emergency_week.targets.level4', '25', 'Weekly Emergenza: score needed to pass a threat of level 4'),
  ('emergency_week.targets.level5', '30', 'Weekly Emergenza: score needed to pass a threat of level 5'),
  ('emergency_week.targets.level6', '34', 'Weekly Emergenza: score needed to pass a threat of level 6'),
  ('emergency_week.rewards.tier1_passed', '4', 'Weekly Emergenza: threats passed that reach the first reward'),
  ('emergency_week.rewards.tier1_coins', '20', 'Weekly Emergenza: coins of the first reward'),
  ('emergency_week.rewards.tier2_passed', '7', 'Weekly Emergenza: threats passed that reach the second reward'),
  ('emergency_week.rewards.tier2_coins', '30', 'Weekly Emergenza: coins of the second reward'),
  ('emergency_week.rewards.tier3_passed', '10', 'Weekly Emergenza: threats passed that reach the third reward'),
  ('emergency_week.rewards.tier3_coins', '50', 'Weekly Emergenza: coins of the third reward'),
  ('emergency_week.leaderboard_size', '10', 'Players shown and prized in the weekly Emergenza leaderboard'),
  ('emergency_week.lineups_shown', '3', 'Places of the weekly Emergenza leaderboard whose lineups can be seen'),
  ('emergency_week.prizes.min_passed', '1', 'Threats passed needed to win a weekly Emergenza leaderboard prize'),
  ('emergency_week.prizes.rank1_coins', '100', 'Coins for the first of the weekly Emergenza leaderboard'),
  ('emergency_week.prizes.rank1_packs', '2', 'Packs for the first of the weekly Emergenza leaderboard'),
  ('emergency_week.prizes.rank2_coins', '50', 'Coins for the second of the weekly Emergenza leaderboard'),
  ('emergency_week.prizes.rank2_packs', '1', 'Packs for the second of the weekly Emergenza leaderboard'),
  ('emergency_week.prizes.rank3_coins', '0', 'Coins for the third of the weekly Emergenza leaderboard'),
  ('emergency_week.prizes.rank3_packs', '1', 'Packs for the third of the weekly Emergenza leaderboard'),
  ('emergency_week.prizes.others_coins', '50', 'Coins for the 4th to the last prized place of the weekly Emergenza'),
  ('emergency_week.prizes.others_packs', '0', 'Packs for the 4th to the last prized place of the weekly Emergenza');

alter table public.coin_ledger drop constraint coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in (
  'pack_purchase', 'match_reward', 'bot_match_reward', 'duplicate_conversion', 'conquest_bonus', 'level_reward',
  'emergency_reward', 'bonus_code', 'story_reward', 'story_star', 'event_reward', 'objective_reward',
  'achievement_reward', 'emergency_prize', 'ranked_prize', 'emergency_week_reward', 'emergency_week_prize',
  'admin_adjustment'
));

-- ---------------------------------------------------------------------------
-- Tables: no client reads them (RLS on, no policy).
-- ---------------------------------------------------------------------------

-- The week's threats, the same for everyone: week is its Monday (game_week).
create table public.emergency_weeks (
  week date primary key check (extract(isodow from week) = 1),
  threat_ids uuid[] not null,
  threat_levels integer[] not null,
  threat_modifiers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- The fixed rules of the threats drawn (rare ones), as the daily: the same trigger function.
create trigger emergency_weeks_rules
  before insert on public.emergency_weeks
  for each row execute function public.set_emergency_day_rules();

create table public.emergency_week_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  week date not null references public.emergency_weeks (week),
  card_instance_ids uuid[] not null,
  definition_ids uuid[] not null,
  status text not null default 'active' check (status in ('active', 'finished')),
  current_round integer not null default 1,
  passed integer not null default 0,
  failed integer not null default 0,
  total_score integer not null default 0,
  coins integer not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint emergency_week_runs_finished_shape check ((status = 'finished') = (finished_at is not null)),
  -- One attempt per player per week.
  unique (user_id, week)
);

create index emergency_week_runs_leaderboard_idx
  on public.emergency_week_runs (week, passed desc, total_score desc, finished_at)
  where status = 'finished';

create table public.emergency_week_plays (
  run_id uuid not null references public.emergency_week_runs (id) on delete cascade,
  round integer not null check (round >= 1),
  threat_id uuid not null references public.threat_definitions (id),
  card_instance_id uuid not null references public.card_instances (id),
  definition_id uuid not null references public.card_definitions (id),
  base_score integer not null,
  bonus integer not null,
  score integer not null,
  required_score integer not null,
  passed boolean not null,
  -- Where the bonus comes from, as the engine counted it (play_parts_valid).
  parts jsonb,
  created_at timestamptz not null default now(),
  primary key (run_id, round),
  -- Each character answers one threat.
  unique (run_id, definition_id)
);

create index emergency_week_plays_threat_id_idx on public.emergency_week_plays (threat_id);
create index emergency_week_plays_card_instance_id_idx on public.emergency_week_plays (card_instance_id);
create index emergency_week_plays_definition_id_idx on public.emergency_week_plays (definition_id);

-- Weeks whose leaderboard has been closed (prizes written, or none).
create table public.emergency_week_prize_weeks (
  week date primary key references public.emergency_weeks (week),
  closed_at timestamptz not null default now()
);

-- One prize per player and week, with the place as it was when the week ended.
create table public.emergency_week_prizes (
  id uuid primary key default gen_random_uuid(),
  week date not null references public.emergency_week_prize_weeks (week),
  user_id uuid not null references public.profiles (id) on delete cascade,
  rank integer not null check (rank >= 1),
  passed integer not null check (passed >= 0),
  total_score integer not null,
  players integer not null check (players >= rank),
  coins integer not null check (coins >= 0),
  packs integer not null check (packs >= 0),
  opening_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  constraint emergency_week_prizes_something check (coins > 0 or packs > 0),
  unique (week, user_id),
  unique (week, rank)
);

create index emergency_week_prizes_user_id_idx on public.emergency_week_prizes (user_id, week) where claimed_at is null;

alter table public.emergency_weeks enable row level security;
alter table public.emergency_week_runs enable row level security;
alter table public.emergency_week_plays enable row level security;
alter table public.emergency_week_prize_weeks enable row level security;
alter table public.emergency_week_prizes enable row level security;
revoke all on table public.emergency_weeks, public.emergency_week_runs, public.emergency_week_plays,
  public.emergency_week_prize_weeks, public.emergency_week_prizes from anon, authenticated;
grant select on table public.emergency_weeks, public.emergency_week_runs, public.emergency_week_plays to service_role;

-- ---------------------------------------------------------------------------
-- The week
-- ---------------------------------------------------------------------------

-- The current week: its Monday, Europe/Rome.
create function public.emergency_week_current()
returns date
language sql
stable
set search_path = ''
as $$
  select public.game_week(public.game_day())
$$;

-- When a week ends: the next Monday at midnight, Europe/Rome.
create function public.emergency_week_ends_at(p_week date)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select ((p_week + 7)::timestamp) at time zone public.config_text('time.daily_reset_time_zone')
$$;

revoke execute on function public.emergency_week_current() from public, anon, authenticated;
revoke execute on function public.emergency_week_ends_at(date) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Service-only functions used by the Edge Function
-- ---------------------------------------------------------------------------

-- Stores this week's threats unless another request was faster: everyone gets the first draw.
create function public.emergency_week_ensure(p_threat_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_threats integer := public.config_int('emergency_week.threats_per_run');
  v_levels integer[];
begin
  select array_agg(t.level order by u.ord) into v_levels
  from unnest(p_threat_ids) with ordinality as u(id, ord)
  join public.threat_definitions t on t.id = u.id and t.is_active;
  if coalesce(cardinality(v_levels), 0) <> v_threats
     or (select count(distinct u.id) from unnest(p_threat_ids) as u(id)) <> v_threats then
    raise exception 'invalid_threats';
  end if;

  insert into public.emergency_weeks (week, threat_ids, threat_levels)
  values (public.emergency_week_current(), p_threat_ids, v_levels)
  on conflict (week) do nothing;
end;
$$;

-- Fields the squad for this week's attempt: as in the daily, the cards stay free for
-- the player's other matches (nothing is at stake) and the squad is a snapshot.
create function public.emergency_week_start(p_user uuid, p_card_instance_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_week date := public.emergency_week_current();
  v_size integer;
  v_definitions uuid[];
  v_run uuid;
begin
  perform 1 from public.profiles where id = p_user for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.emergency_week_runs where user_id = p_user and week = v_week) then
    raise exception 'emergency_week_already_played';
  end if;
  -- One character per threat of the week.
  select cardinality(w.threat_ids) into v_size from public.emergency_weeks w where w.week = v_week;
  if v_size is null then
    raise exception 'emergency_not_ready';
  end if;

  if coalesce(cardinality(p_card_instance_ids), 0) <> v_size then
    raise exception 'invalid_emergency_week_squad' using errcode = '22023';
  end if;
  if (select count(distinct u.id) from unnest(p_card_instance_ids) as u(id)) <> v_size then
    raise exception 'duplicate_card' using errcode = '22023';
  end if;
  select array_agg(i.definition_id order by u.ord) into v_definitions
  from unnest(p_card_instance_ids) with ordinality as u(id, ord)
  join public.card_instances i on i.id = u.id and i.owner_id = p_user;
  if coalesce(cardinality(v_definitions), 0) <> v_size then
    raise exception 'card_not_owned' using errcode = '22023';
  end if;
  if (select count(distinct d.id) from unnest(v_definitions) as d(id)) <> v_size then
    raise exception 'duplicate_character' using errcode = '22023';
  end if;

  insert into public.emergency_week_runs (user_id, week, card_instance_ids, definition_ids)
  values (p_user, v_week, p_card_instance_ids, v_definitions)
  returning id into v_run;
  return v_run;
end;
$$;

-- This week's attempt, for the Edge Function to score a play: the run, the threats with
-- their fixed rules, and the plays so far with how far each was from its target.
create function public.emergency_week_play_context(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'run', (
      select jsonb_build_object(
        'id', r.id,
        'status', r.status,
        'current_round', r.current_round,
        'card_instance_ids', to_jsonb(r.card_instance_ids),
        'definition_ids', to_jsonb(r.definition_ids)
      )
      from public.emergency_week_runs r where r.user_id = p_user and r.week = public.emergency_week_current()
    ),
    'threat_ids', (select to_jsonb(w.threat_ids) from public.emergency_weeks w where w.week = public.emergency_week_current()),
    'threat_modifiers', (select w.threat_modifiers from public.emergency_weeks w where w.week = public.emergency_week_current()),
    'plays', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'card_instance_id', p.card_instance_id, 'passed', p.passed, 'score', p.score, 'required', p.required_score
      ) order by p.round), '[]'::jsonb)
      from public.emergency_week_plays p
      join public.emergency_week_runs r on r.id = p.run_id
      where r.user_id = p_user and r.week = public.emergency_week_current()
    )
  )
$$;

-- What a player may see of this week: the levels always (Livello ignoto only once reached
-- or foreseen); of the threats, only those already reached, plus the following ones that
-- a Veggente (all) or its short variant (the next K) has shown. The run's id is the
-- player's own, for the event points of the result.
create function public.emergency_week_state_payload(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with w as (
    select * from public.emergency_weeks where week = public.emergency_week_current()
  ), r as (
    select * from public.emergency_week_runs where user_id = p_user and week = public.emergency_week_current()
  ), seen as (
    -- The last round whose threat the player has been shown ahead.
    select case
      when exists (
        select 1 from public.emergency_week_plays p
        join public.card_definitions c on c.id = p.definition_id
        join r on r.id = p.run_id
        where c.power_code = 'foresight'
      ) then 1000
      else coalesce((
        select max(p.round + (c.power_params ->> 'count')::integer)
        from public.emergency_week_plays p
        join public.card_definitions c on c.id = p.definition_id
        join r on r.id = p.run_id
        where c.power_code = 'foresight_short'
      ), 0)
    end as until
  )
  select jsonb_build_object(
    'week', public.emergency_week_current(),
    'day', public.game_day(),
    'ends_at', public.emergency_week_ends_at(public.emergency_week_current()),
    'server_now', now(),
    'threat_levels', (
      select jsonb_agg(case
        when w.threat_modifiers -> (u.ord::integer - 1) ->> 'code' = 'unknown_level'
             and u.ord > coalesce((select r.current_round from r), 0)
             and u.ord > (select s.until from seen s)
          then null
        else to_jsonb(u.level)
      end order by u.ord)
      from w, unnest(w.threat_levels) with ordinality as u(level, ord)
    ),
    'threat_rarities', (
      select jsonb_agg(public.threat_rarity_payload(u.id) order by u.ord)
      from w, unnest(w.threat_ids) with ordinality as u(id, ord)
    ),
    'rules', jsonb_build_object(
      'threats_per_run', coalesce((select cardinality(w.threat_ids) from w), public.config_int('emergency_week.threats_per_run')),
      'max_failures', public.config_int('emergency_week.max_failures'),
      'targets', (
        select jsonb_object_agg(l.level, public.config_int(format('emergency_week.targets.level%s', l.level)))
        from generate_series(1, 6) as l(level)
      ),
      'rewards', (
        select jsonb_agg(jsonb_build_object(
          'passed', public.config_int(format('emergency_week.rewards.tier%s_passed', t.tier)),
          'coins', public.config_int(format('emergency_week.rewards.tier%s_coins', t.tier))
        ) order by t.tier)
        from generate_series(1, 3) as t(tier)
      ),
      'finish_xp', 0
    ),
    'run', (
      select jsonb_build_object(
        'id', r.id,
        'status', r.status,
        'current_round', r.current_round,
        'passed', r.passed,
        'failed', r.failed,
        'total_score', r.total_score,
        'coins', r.coins,
        'xp', 0,
        'squad', (
          select jsonb_agg(public.card_payload(u.definition_id, u.instance_id) || jsonb_build_object(
            'instance_id', u.instance_id,
            'played_round', (
              select p.round from public.emergency_week_plays p
              where p.run_id = r.id and p.definition_id = u.definition_id
            )
          ) order by u.ord)
          from unnest(r.card_instance_ids, r.definition_ids) with ordinality as u(instance_id, definition_id, ord)
        ),
        'plays', coalesce((
          select jsonb_agg(jsonb_build_object(
            'round', p.round,
            'level', coalesce(w.threat_levels[p.round], t.level),
            'modifier', w.threat_modifiers -> (p.round - 1),
            'rarity', public.threat_rarity_payload(t.id),
            'threat', jsonb_build_object(
              'name', t.name,
              'abilities', public.rule_abilities(t.required_abilities, w.threat_modifiers -> (p.round - 1)),
              'flavor', t.flavor
            ),
            'instance_id', p.card_instance_id,
            'definition_id', p.definition_id,
            'base', p.base_score,
            'bonus', p.bonus,
            'score', p.score,
            'required', p.required_score,
            'passed', p.passed
          ) || case when p.parts is not null then jsonb_build_object('parts', p.parts) else '{}'::jsonb end
          order by p.round)
          from public.emergency_week_plays p
          join public.threat_definitions t on t.id = p.threat_id
          cross join w
          where p.run_id = r.id
        ), '[]'::jsonb),
        'current_threat', case when r.status = 'active' then (
          select jsonb_build_object(
            'round', r.current_round,
            'id', t.id,
            'level', w.threat_levels[r.current_round],
            'name', t.name,
            'abilities', case when w.threat_modifiers -> (r.current_round - 1) ->> 'code' = 'blind' then '[]'::jsonb
              else public.rule_abilities(t.required_abilities, w.threat_modifiers -> (r.current_round - 1)) end,
            'hidden', coalesce(w.threat_modifiers -> (r.current_round - 1) ->> 'code' = 'blind', false),
            'modifier', public.visible_modifier(
              w.threat_modifiers -> (r.current_round - 1),
              coalesce(w.threat_modifiers -> (r.current_round - 1) ->> 'code' = 'blind', false)
            ),
            'rarity', public.threat_rarity_payload(t.id),
            'target', t.emergency_target,
            'flavor', t.flavor
          )
          from w join public.threat_definitions t on t.id = w.threat_ids[r.current_round]
        ) end,
        'foreseen_threats', case when r.status = 'active' then (
          select coalesce(jsonb_agg(jsonb_build_object(
            'round', u.ord,
            'level', w.threat_levels[u.ord],
            'name', t.name,
            'abilities', public.rule_abilities(t.required_abilities, w.threat_modifiers -> (u.ord::integer - 1)),
            'modifier', w.threat_modifiers -> (u.ord::integer - 1),
            'rarity', public.threat_rarity_payload(t.id),
            'target', t.emergency_target
          ) order by u.ord), '[]'::jsonb)
          from w, unnest(w.threat_ids) with ordinality as u(id, ord)
          join public.threat_definitions t on t.id = u.id
          where u.ord > r.current_round and u.ord <= (select s.until from seen s)
        ) else '[]'::jsonb end
      )
      from r
    )
  )
$$;

-- Stores a play scored by the engine, pays the rewards it reaches and ends the run when
-- it is over; then the state. Under Rovescio a threat is passed at or under its target.
-- Rewards are paid at once, so a run left unfinished keeps them.
create function public.emergency_week_record_play(
  p_user uuid,
  p_round integer,
  p_card_instance_id uuid,
  p_base integer,
  p_bonus integer,
  p_score integer,
  p_required integer,
  p_parts jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.emergency_week_runs;
  v_week public.emergency_weeks;
  v_position integer;
  v_definition uuid;
  v_passed boolean;
  v_total_passed integer;
  v_total_failed integer;
  v_coins integer := 0;
  v_tier integer;
  v_finished boolean;
begin
  select * into v_run from public.emergency_week_runs
  where user_id = p_user and week = public.emergency_week_current()
  for update;
  if v_run.id is null then
    raise exception 'emergency_week_not_started';
  end if;
  if v_run.status <> 'active' then
    raise exception 'emergency_week_already_played';
  end if;
  if v_run.current_round <> p_round then
    raise exception 'round_already_resolved';
  end if;

  v_position := array_position(v_run.card_instance_ids, p_card_instance_id);
  if v_position is null then
    raise exception 'character_not_available';
  end if;
  v_definition := v_run.definition_ids[v_position];
  if exists (select 1 from public.emergency_week_plays where run_id = v_run.id and definition_id = v_definition) then
    raise exception 'character_already_played';
  end if;
  if p_score <> p_base + p_bonus then
    raise exception 'result_mismatch';
  end if;
  if p_parts is not null and jsonb_typeof(p_parts) <> 'null' and not public.play_parts_valid(p_parts, p_bonus) then
    raise exception 'invalid_play_parts' using errcode = '22023';
  end if;

  select * into v_week from public.emergency_weeks w where w.week = v_run.week;
  v_passed := case
    when v_week.threat_modifiers -> (p_round - 1) ->> 'code' = 'reverse' then p_score <= p_required
    else p_score >= p_required
  end;
  insert into public.emergency_week_plays (
    run_id, round, threat_id, card_instance_id, definition_id,
    base_score, bonus, score, required_score, passed, parts
  ) values (
    v_run.id, p_round, v_week.threat_ids[p_round], p_card_instance_id, v_definition,
    p_base, p_bonus, p_score, p_required, v_passed,
    case when p_parts is null or jsonb_typeof(p_parts) = 'null' then null else p_parts end
  );

  v_total_passed := v_run.passed + v_passed::integer;
  v_total_failed := v_run.failed + (not v_passed)::integer;

  if v_passed then
    foreach v_tier in array array[1, 2, 3] loop
      if v_total_passed = public.config_int(format('emergency_week.rewards.tier%s_passed', v_tier)) then
        insert into public.coin_ledger (user_id, amount, reason, ref_id)
        values (p_user, public.config_int(format('emergency_week.rewards.tier%s_coins', v_tier)), 'emergency_week_reward', v_run.id);
        v_coins := v_coins + public.config_int(format('emergency_week.rewards.tier%s_coins', v_tier));
      end if;
    end loop;
  end if;

  v_finished := p_round >= cardinality(v_week.threat_ids)
                or v_total_failed >= public.config_int('emergency_week.max_failures');

  update public.emergency_week_runs
  set passed = v_total_passed,
      failed = v_total_failed,
      total_score = total_score + p_score,
      coins = coins + v_coins,
      current_round = case when v_finished then p_round else p_round + 1 end,
      status = case when v_finished then 'finished' else 'active' end,
      finished_at = case when v_finished then now() end
  where id = v_run.id;

  return public.emergency_week_state_payload(p_user);
end;
$$;

revoke execute on function public.emergency_week_ensure(uuid[]) from public, anon, authenticated;
revoke execute on function public.emergency_week_start(uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.emergency_week_play_context(uuid) from public, anon, authenticated;
revoke execute on function public.emergency_week_state_payload(uuid) from public, anon, authenticated;
revoke execute on function public.emergency_week_record_play(uuid, integer, uuid, integer, integer, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.emergency_week_ensure(uuid[]) to service_role;
grant execute on function public.emergency_week_start(uuid, uuid[]) to service_role;
grant execute on function public.emergency_week_play_context(uuid) to service_role;
grant execute on function public.emergency_week_state_payload(uuid) to service_role;
grant execute on function public.emergency_week_record_play(uuid, integer, uuid, integer, integer, integer, integer, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- What a weekly play also counts for: the Bestiario and the event points.
-- ---------------------------------------------------------------------------

create function public.emergency_week_play_sighting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.record_threat_sighting(
    (select r.user_id from public.emergency_week_runs r where r.id = new.run_id), new.threat_id, new.created_at
  );
  return new;
end;
$$;

create trigger emergency_week_plays_sighting
  after insert on public.emergency_week_plays
  for each row execute function public.emergency_week_play_sighting();

-- The Emergenza row of the event (§8.2): points per threat passed, the run as the reference.
create function public.award_emergency_week_event_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.passed then
    perform public.award_event_points(r.user_id, 'emergency', 'passed', r.id, new.round, null, null)
    from public.emergency_week_runs r where r.id = new.run_id;
  end if;
  return new;
end;
$$;

create trigger emergency_week_plays_award_event_points
  after insert on public.emergency_week_plays
  for each row execute function public.award_emergency_week_event_points();

revoke execute on function public.emergency_week_play_sighting() from public, anon, authenticated;
revoke execute on function public.award_emergency_week_event_points() from public, anon, authenticated;

-- The team of a match or of a run, for the events that admit only some characters:
-- the squad of 10 of a weekly run too.
create or replace function public.event_ref_team(p_user uuid, p_ref_id uuid)
returns uuid[]
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select t.definition_ids from public.match_teams t where t.match_id = p_ref_id and t.user_id = p_user limit 1),
    (select r.definition_ids from public.emergency_runs r where r.id = p_ref_id and r.user_id = p_user),
    (select r.definition_ids from public.emergency_week_runs r where r.id = p_ref_id and r.user_id = p_user),
    '{}'
  )
$$;

-- ---------------------------------------------------------------------------
-- Leaderboard of the week, podium lineups and prizes
-- ---------------------------------------------------------------------------

-- The finished runs of a week, ranked as the result screen ranks them.
create function public.emergency_week_ranking(p_week date)
returns table (rank integer, players integer, run_id uuid, user_id uuid, passed integer, total_score integer)
language sql
stable
set search_path = ''
as $$
  select
    row_number() over (order by r.passed desc, r.total_score desc, r.finished_at, r.user_id)::integer,
    count(*) over ()::integer,
    r.id, r.user_id, r.passed, r.total_score
  from public.emergency_week_runs r
  where r.week = p_week and r.status = 'finished'
$$;

revoke execute on function public.emergency_week_ranking(date) from public, anon, authenticated;

-- The prize of a place: { coins, packs } from game_config, zero beyond the leaderboard.
create function public.emergency_week_prize_for(p_rank integer)
returns table (coins integer, packs integer)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_tier text := case when p_rank <= 3 then 'rank' || p_rank else 'others' end;
begin
  if p_rank < 1 or p_rank > public.config_int('emergency_week.leaderboard_size') then
    return query select 0, 0;
    return;
  end if;
  return query select
    public.config_int(format('emergency_week.prizes.%s_coins', v_tier)),
    public.config_int(format('emergency_week.prizes.%s_packs', v_tier));
end;
$$;

-- What each place wins when the week ends, for the leaderboard: [{ from, to, coins, packs }].
create function public.emergency_week_prize_table()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_size integer := public.config_int('emergency_week.leaderboard_size');
  v_rows jsonb := '[]'::jsonb;
  v_prize record;
begin
  for i in 1..least(v_size, 4) loop
    select * into v_prize from public.emergency_week_prize_for(i);
    continue when v_prize.coins = 0 and v_prize.packs = 0;
    v_rows := v_rows || jsonb_build_object(
      'from', i, 'to', case when i = 4 then v_size else i end,
      'coins', v_prize.coins, 'packs', v_prize.packs
    );
  end loop;
  return v_rows;
end;
$$;

revoke execute on function public.emergency_week_prize_for(integer) from public, anon, authenticated;
revoke execute on function public.emergency_week_prize_table() from public, anon, authenticated;

-- Closes every week that is over and not closed yet, oldest first, once: the final
-- leaderboard gives its prizes. Never the week in progress.
create function public.emergency_week_close()
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_week date;
  v_min integer := public.config_int('emergency_week.prizes.min_passed');
begin
  for v_week in
    select w.week from public.emergency_weeks w
    where w.week < public.emergency_week_current()
      and not exists (select 1 from public.emergency_week_prize_weeks p where p.week = w.week)
    order by w.week
  loop
    -- Whoever inserts the week writes its prizes; a concurrent call finds it and skips.
    insert into public.emergency_week_prize_weeks (week) values (v_week) on conflict do nothing;
    continue when not found;
    insert into public.emergency_week_prizes (week, user_id, rank, passed, total_score, players, coins, packs)
    select v_week, r.user_id, r.rank, r.passed, r.total_score, r.players, p.coins, p.packs
    from public.emergency_week_ranking(v_week) r
    cross join lateral public.emergency_week_prize_for(r.rank) p
    where r.passed >= v_min and (p.coins > 0 or p.packs > 0);
  end loop;
end;
$$;

revoke execute on function public.emergency_week_close() from public, anon, authenticated;

-- The podium of a week: who, how far, and the 10 cards with the art fielded, in the order
-- they were played (with the threat and the score), the unplayed ones after.
create function public.emergency_week_lineups_payload(p_week date, p_viewer uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'rank', k.rank,
    'username', pr.username,
    'avatar_url', pr.avatar_url,
    'title', pr.title,
    'passed', k.passed,
    'total_score', k.total_score,
    'is_me', k.user_id = p_viewer,
    'cards', (
      select coalesce(jsonb_agg(
        public.card_payload(u.definition_id, u.instance_id) || jsonb_build_object(
          'instance_id', u.instance_id,
          'play', case when p.round is null then null else jsonb_build_object(
            'round', p.round, 'threat', th.name, 'score', p.score, 'required', p.required_score, 'passed', p.passed
          ) end
        ) order by p.round nulls last, u.slot
      ), '[]'::jsonb)
      from unnest(r.card_instance_ids, r.definition_ids) with ordinality as u(instance_id, definition_id, slot)
      left join public.emergency_week_plays p on p.run_id = r.id and p.card_instance_id = u.instance_id
      left join public.threat_definitions th on th.id = p.threat_id
    )
  ) order by k.rank), '[]'::jsonb)
  from public.emergency_week_ranking(p_week) k
  join public.emergency_week_runs r on r.id = k.run_id
  join public.profiles pr on pr.id = k.user_id
  where k.rank <= public.config_int('emergency_week.lineups_shown')
$$;

revoke execute on function public.emergency_week_lineups_payload(date, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Player RPCs
-- ---------------------------------------------------------------------------

-- This week's leaderboard: finished runs only, no characters (they would give the week's
-- threats away), the prizes in play, when the week ends and where the player's own run is.
create function public.get_emergency_week_leaderboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_week date := public.emergency_week_current();
  v_size integer := public.config_int('emergency_week.leaderboard_size');
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  return (
    with ranked as (
      select k.rank, k.user_id, k.passed, k.total_score, pr.username, pr.avatar_url, pr.title
      from public.emergency_week_ranking(v_week) k
      join public.profiles pr on pr.id = k.user_id
    )
    select jsonb_build_object(
      'week', v_week,
      'ends_at', public.emergency_week_ends_at(v_week),
      'server_now', now(),
      'threats_per_run', coalesce(
        (select cardinality(w.threat_ids) from public.emergency_weeks w where w.week = v_week),
        public.config_int('emergency_week.threats_per_run')
      ),
      'players', (select count(*) from ranked),
      'top', coalesce((
        select jsonb_agg(jsonb_build_object(
          'rank', m.rank, 'username', m.username, 'avatar_url', m.avatar_url, 'title', m.title,
          'passed', m.passed, 'total_score', m.total_score, 'is_me', m.user_id = v_user
        ) order by m.rank)
        from ranked m where m.rank <= v_size
      ), '[]'::jsonb),
      'me', (
        select jsonb_build_object(
          'rank', m.rank, 'username', m.username, 'avatar_url', m.avatar_url, 'title', m.title,
          'passed', m.passed, 'total_score', m.total_score, 'is_me', true
        )
        from ranked m where m.user_id = v_user
      ),
      'my_run', (
        select jsonb_build_object('status', r.status, 'passed', r.passed, 'failed', r.failed, 'current_round', r.current_round)
        from public.emergency_week_runs r where r.user_id = v_user and r.week = v_week
      ),
      'prizes', public.emergency_week_prize_table(),
      'prize_min_passed', public.config_int('emergency_week.prizes.min_passed')
    )
  );
end;
$$;

-- The podium lineups: this week's once the player's own attempt is finished (`live`),
-- last week's before, since the threats are the same for everyone.
create function public.get_emergency_week_lineups()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_week date := public.emergency_week_current();
  v_live boolean;
  v_shown date;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  v_live := exists (
    select 1 from public.emergency_week_runs r where r.user_id = v_user and r.week = v_week and r.status = 'finished'
  );
  v_shown := case when v_live then v_week else v_week - 7 end;
  return jsonb_build_object(
    'day', v_shown,
    'week', v_shown,
    'live', v_live,
    'lineups', public.emergency_week_lineups_payload(v_shown, v_user)
  );
end;
$$;

-- Closes the weeks that are over, then the caller's prizes still to claim, oldest first.
create function public.get_emergency_week_prizes()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.emergency_week_close();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'week', p.week, 'day', p.week, 'rank', p.rank, 'passed', p.passed, 'total_score', p.total_score,
      'players', p.players, 'coins', p.coins, 'packs', p.packs
    ) order by p.week, p.id)
    from public.emergency_week_prizes p
    where p.user_id = v_user and p.claimed_at is null
  ), '[]'::jsonb);
end;
$$;

-- Pays one of the caller's weekly prizes, once: coins (coin_ledger) and packs, opened now.
create function public.claim_emergency_week_prize(p_prize_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_prize public.emergency_week_prizes;
  v_openings uuid[] := '{}';
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_prize from public.emergency_week_prizes p
  where p.id = p_prize_id and p.user_id = v_user
  for update;
  if v_prize.id is null then
    raise exception 'emergency_prize_not_found';
  end if;
  if v_prize.claimed_at is not null then
    raise exception 'emergency_prize_already_claimed';
  end if;

  if v_prize.coins > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id)
    values (v_user, v_prize.coins, 'emergency_week_prize', v_prize.id);
  end if;
  for i in 1..v_prize.packs loop
    v_openings := v_openings || public.open_pack(v_user, 'emergency');
  end loop;

  update public.emergency_week_prizes set claimed_at = now(), opening_ids = v_openings where id = v_prize.id;

  return jsonb_build_object(
    'coins', v_prize.coins,
    'opening_ids', to_jsonb(v_openings),
    'coin_balance', public.coin_balance(v_user)
  );
end;
$$;

revoke execute on function public.get_emergency_week_leaderboard() from public, anon;
revoke execute on function public.get_emergency_week_lineups() from public, anon;
revoke execute on function public.get_emergency_week_prizes() from public, anon;
revoke execute on function public.claim_emergency_week_prize(uuid) from public, anon;
grant execute on function public.get_emergency_week_leaderboard() to authenticated;
grant execute on function public.get_emergency_week_lineups() to authenticated;
grant execute on function public.get_emergency_week_prizes() to authenticated;
grant execute on function public.claim_emergency_week_prize(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Classifiche (§8.6): the board 'emergency_week', with this week only, and its weekly
-- title. The other boards do not change.
-- ---------------------------------------------------------------------------

create or replace function public.leaderboard_range(p_board text, p_period text, out o_from date, out o_to date)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_today date := public.game_day();
begin
  if p_board not in ('general', 'emergency', 'emergency_week', 'classic', 'boss', 'triple', 'quadrant', 'conquest', 'story') then
    raise exception 'leaderboard_unknown';
  end if;
  if p_period = 'day' and p_board in ('general', 'emergency') then
    o_from := v_today;
  elsif p_period = 'week' and p_board <> 'story' then
    o_from := public.game_week(v_today);
  elsif p_period = 'all' and p_board <> 'emergency_week' then
    o_from := '-infinity'::date;
  else
    raise exception 'leaderboard_period_invalid';
  end if;
  o_to := v_today;
end;
$$;

create or replace function public.leaderboard_rows(p_board text, p_from date, p_to date)
returns table (user_id uuid, value numeric, value2 numeric, reached_at timestamptz, detail jsonb)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_zone text := public.config_text('time.daily_reset_time_zone');
  v_today date := public.game_day();
  v_lo timestamptz := (p_from::timestamp) at time zone v_zone;
  v_hi timestamptz := ((p_to + 1)::timestamp) at time zone v_zone;
begin
  if p_board in ('classic', 'boss', 'triple', 'quadrant', 'conquest') then
    return query
      select lp.user_id, sum(lp.points), 0::numeric,
             max(lp.earned_at) filter (where lp.points > 0),
             jsonb_build_object(
               'wins', count(*) filter (where lp.outcome = 'win'),
               'played', count(*)
             )
      from public.leaderboard_points lp
      where lp.board = p_board and lp.day between p_from and p_to
      group by lp.user_id
      having sum(lp.points) > 0;

  elsif p_board = 'emergency' then
    if p_from = p_to then
      -- The day: as the result screen ranks it (finished runs, passed, score, who finished first).
      return query
        select r.user_id, r.passed::numeric, r.total_score::numeric, r.finished_at,
               jsonb_build_object('total_score', r.total_score)
        from public.emergency_runs r
        where r.day = p_from and r.status = 'finished';
    else
      -- Several days: threats passed, summed. Today's run counts once it is finished.
      return query
        select r.user_id, sum(r.passed)::numeric, 0::numeric,
               max(coalesce(r.finished_at, r.created_at)) filter (where r.passed > 0),
               jsonb_build_object(
                 'runs', count(*),
                 'perfect', count(*) filter (where r.passed >= public.config_int('emergency.threats_per_run'))
               )
        from public.emergency_runs r
        where r.day between p_from and p_to and (r.status = 'finished' or r.day < v_today)
        group by r.user_id
        having sum(r.passed) > 0;
    end if;

  elsif p_board = 'emergency_week' then
    -- The week's challenge, as its result screen ranks it: finished runs, passed, score,
    -- who finished first. Everyone who finished is in, even with no threat passed.
    return query
      select r.user_id, r.passed::numeric, r.total_score::numeric, r.finished_at,
             jsonb_build_object('total_score', r.total_score)
      from public.emergency_week_runs r
      where r.week between public.game_week(p_from) and p_to and r.status = 'finished';

  elsif p_board = 'general' then
    if p_from = '-infinity'::date then
      -- Of all time: experience, which is also the level.
      return query
        select p.id, p.xp::numeric, 0::numeric, p.created_at, jsonb_build_object('level', p.level)
        from public.profiles p
        where p.xp > 0;
    else
      -- A day or a week: the experience earned in it, from matches and Emergenza.
      return query
        with earned as (
          select m.player_a as uid, coalesce(m.reward_xp_a, 0) as xp, m.finished_at as earned_at
          from public.matches m
          where m.status = 'finished' and m.finished_at >= v_lo and m.finished_at < v_hi
          union all
          select m.player_b, coalesce(m.reward_xp_b, 0), m.finished_at
          from public.matches m
          where m.status = 'finished' and m.finished_at >= v_lo and m.finished_at < v_hi and m.player_b is not null
          union all
          select r.user_id, r.xp, r.finished_at
          from public.emergency_runs r
          where r.status = 'finished' and r.day between p_from and p_to
        )
        select e.uid, sum(e.xp)::numeric, 0::numeric, max(e.earned_at) filter (where e.xp > 0),
               jsonb_build_object('level', (select p.level from public.profiles p where p.id = e.uid))
        from earned e
        group by e.uid
        having sum(e.xp) > 0;
    end if;

  elsif p_board = 'story' then
    -- Missions completed (first victories), of all time.
    return query
      select sp.user_id, count(*)::numeric, 0::numeric, max(sp.completed_at), '{}'::jsonb
      from public.story_progress sp
      group by sp.user_id;

  else
    raise exception 'leaderboard_unknown';
  end if;
end;
$$;

create or replace function public.leaderboard_board_title(p_board text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_board
    when 'general' then 'Campione della settimana'
    when 'emergency' then 'Campione dell''Emergenza'
    when 'emergency_week' then 'Eroe della settimana'
    when 'classic' then 'Campione della Classica'
    when 'boss' then 'Campione di Grande Minaccia'
    when 'triple' then 'Campione di Allarme Triplo'
    when 'quadrant' then 'Campione di Quadrante'
    when 'conquest' then 'Campione di Conquista'
  end
$$;

create or replace function public.leaderboard_board_name(p_board text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_board
    when 'general' then 'Generale'
    when 'emergency' then 'Emergenza'
    when 'emergency_week' then 'Emergenza della settimana'
    when 'classic' then 'Partita classica'
    when 'boss' then 'Grande Minaccia'
    when 'triple' then 'Allarme Triplo'
    when 'quadrant' then 'Quadrante'
    when 'conquest' then 'Conquista'
    when 'story' then 'Storia'
  end
$$;

create or replace function public.leaderboard_close_week()
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_zone text := public.config_text('time.daily_reset_time_zone');
  v_week date := public.game_week(public.game_day()) - 7;
  v_expires timestamptz := ((v_week + 14)::timestamp) at time zone v_zone;
  v_board text;
  v_top record;
  v_title text;
begin
  -- Only the week just over: one that nobody closed in time gives no titles.
  insert into public.leaderboard_weeks (week) values (v_week) on conflict do nothing;
  if found then
    foreach v_board in array array['general', 'emergency', 'emergency_week', 'classic', 'boss', 'triple', 'quadrant', 'conquest'] loop
      select r.user_id, r.value into v_top
      from public.leaderboard_rows(v_board, v_week, v_week + 6) r
      order by r.value desc, r.value2 desc, r.reached_at nulls last, r.user_id
      limit 1;
      continue when v_top.user_id is null;
      v_title := public.leaderboard_board_title(v_board);
      insert into public.leaderboard_awards (board, week, user_id, title, value, expires_at)
      values (v_board, v_week, v_top.user_id, v_title, v_top.value, v_expires);
      -- A player without a title shows the new one straight away.
      update public.profiles set title = v_title, updated_at = now()
      where id = v_top.user_id and title is null;
      perform public.add_player_notification(
        v_top.user_id, 'leaderboard', 'Primo della settimana!',
        'Classifica ' || public.leaderboard_board_name(v_board) || ': il titolo «' || v_title || '» è tuo fino a domenica.',
        jsonb_build_object('board', v_board, 'title', v_title)
      );
      v_top := null;
    end loop;
  end if;

  -- A weekly title that ran out goes, unless an impresa or another week gives the same one.
  update public.profiles p set title = null, updated_at = now()
  where p.title is not null
    and exists (
      select 1 from public.leaderboard_awards a
      where a.user_id = p.id and a.title = p.title and a.expires_at <= now()
    )
    and not exists (
      select 1 from public.leaderboard_awards a
      where a.user_id = p.id and a.title = p.title and a.expires_at > now()
    )
    and not exists (
      select 1 from public.player_achievements pa where pa.user_id = p.id and pa.title = p.title
    );
end;
$$;

create or replace function public.get_my_leaderboard_places()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_board text;
  v_period text;
  v_range record;
  v_place record;
  v_places jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.leaderboard_close_week();

  foreach v_board in array array['general', 'emergency', 'emergency_week', 'classic', 'boss', 'triple', 'quadrant', 'conquest', 'story'] loop
    foreach v_period in array array['day', 'week', 'all'] loop
      continue when v_period = 'day' and v_board not in ('general', 'emergency');
      continue when v_period = 'week' and v_board = 'story';
      continue when v_period = 'all' and v_board = 'emergency_week';
      select * into v_range from public.leaderboard_range(v_board, v_period);
      select x.rank, x.players, x.value into v_place
      from (
        select r.user_id, r.value,
               row_number() over (order by r.value desc, r.value2 desc, r.reached_at nulls last, r.user_id) as rank,
               count(*) over () as players
        from public.leaderboard_rows(v_board, v_range.o_from, v_range.o_to) r
        join public.profiles pr on pr.id = r.user_id
      ) x
      where x.user_id = v_user;
      if v_place.rank is not null then
        v_places := v_places || jsonb_build_object(
          'board', v_board, 'period', v_period, 'rank', v_place.rank, 'players', v_place.players, 'value', v_place.value
        );
      end if;
      v_place := null;
    end loop;
  end loop;
  return v_places;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admins change the weekly rewards and prizes from /gestione-ricompense, beside the daily.
-- ---------------------------------------------------------------------------

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
    ('emergency_week.prizes.others_packs', 0, 3)
$$;

create or replace function public.match_rewards_payload()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'rules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'mode_key', r.mode_key,
        'opponent', r.opponent,
        'outcome', r.outcome,
        'coins', r.coins,
        'xp', r.xp,
        'packs', r.packs
      ) order by r.mode_key, r.opponent, case r.outcome when 'win' then 1 when 'draw' then 2 else 3 end)
      from public.match_reward_rules r
    ), '[]'::jsonb),
    'settings', (
      select jsonb_object_agg(b.key, public.config_int(b.key)) from public.match_reward_setting_bounds() b
    ),
    'emergency_threats_per_run', public.config_int('emergency.threats_per_run'),
    'emergency_week_threats_per_run', public.config_int('emergency_week.threats_per_run')
  )
$$;

create or replace function public.admin_save_match_rewards(p_rules jsonb, p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rule jsonb;
  v_key text;
  v_value jsonb;
  v_bounds record;
  v_numbers integer[];
  v_threats integer := public.config_int('emergency.threats_per_run');
  v_week_threats integer := public.config_int('emergency_week.threats_per_run');
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_rules, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_settings, '{}'::jsonb)) <> 'object' then
    raise exception 'invalid_match_rewards';
  end if;

  for v_rule in select * from jsonb_array_elements(coalesce(p_rules, '[]'::jsonb)) loop
    if jsonb_typeof(v_rule) <> 'object'
       or jsonb_typeof(v_rule -> 'coins') <> 'number' or jsonb_typeof(v_rule -> 'xp') <> 'number'
       or jsonb_typeof(v_rule -> 'packs') <> 'number'
       or (v_rule ->> 'coins')::numeric <> trunc((v_rule ->> 'coins')::numeric)
       or (v_rule ->> 'xp')::numeric <> trunc((v_rule ->> 'xp')::numeric)
       or (v_rule ->> 'packs')::numeric <> trunc((v_rule ->> 'packs')::numeric)
       or (v_rule ->> 'coins')::numeric not between 0 and 10000
       or (v_rule ->> 'xp')::numeric not between 0 and 10000
       or (v_rule ->> 'packs')::numeric not between 0 and 3 then
      raise exception 'invalid_match_rewards';
    end if;
    update public.match_reward_rules r
    set coins = (v_rule ->> 'coins')::integer,
        xp = (v_rule ->> 'xp')::integer,
        packs = (v_rule ->> 'packs')::integer,
        updated_at = now()
    where r.mode_key = v_rule ->> 'mode_key' and r.opponent = v_rule ->> 'opponent' and r.outcome = v_rule ->> 'outcome';
    if not found then
      raise exception 'match_reward_not_found';
    end if;
  end loop;

  for v_key, v_value in select * from jsonb_each(coalesce(p_settings, '{}'::jsonb)) loop
    select * into v_bounds from public.match_reward_setting_bounds() b where b.key = v_key;
    if v_bounds.key is null
       or jsonb_typeof(v_value) <> 'number'
       or (v_value #>> '{}')::numeric <> trunc((v_value #>> '{}')::numeric)
       or (v_value #>> '{}')::numeric not between v_bounds.min_value and v_bounds.max_value then
      raise exception 'invalid_match_rewards';
    end if;
    update public.game_config c
    set value = to_jsonb((v_value #>> '{}')::integer), updated_at = now()
    where c.key = v_key and c.value is distinct from to_jsonb((v_value #>> '{}')::integer);
  end loop;

  -- The Emergenza tiers stay in order and reachable.
  v_numbers := array[
    public.config_int('emergency.rewards.tier1_passed'),
    public.config_int('emergency.rewards.tier2_passed'),
    public.config_int('emergency.rewards.tier3_passed')
  ];
  if not (v_numbers[1] < v_numbers[2] and v_numbers[2] < v_numbers[3] and v_numbers[3] <= v_threats) then
    raise exception 'invalid_emergency_tiers';
  end if;
  -- So do the weekly ones.
  v_numbers := array[
    public.config_int('emergency_week.rewards.tier1_passed'),
    public.config_int('emergency_week.rewards.tier2_passed'),
    public.config_int('emergency_week.rewards.tier3_passed')
  ];
  if not (v_numbers[1] < v_numbers[2] and v_numbers[2] < v_numbers[3] and v_numbers[3] <= v_week_threats) then
    raise exception 'invalid_emergency_week_tiers';
  end if;

  return public.match_rewards_payload();
end;
$$;
