-- Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 6b: the seasons of the challenges, as the
-- Mandato of the Classificata (decided by the user on 26 November 2026). A season is a calendar
-- month, Europe/Rome (ranked_current_season); at a new one a player keeps their Gloria up to
-- combat_arena.season.keep_up_to plus keep_share_percent of the rest. Leagues from Recluta to O-MEGA
-- on combat_arena.leagues.*; at the end each player who challenged at least
-- combat_arena.season.min_challenges times has the prize of their league to claim (coins and
-- packs), and a notification tells everyone who played. The board: the first ten of a season and
-- the player's own place. No titles.
--
--   * combat_arena_ledger: every change of Gloria (a challenge, a defence, a season's cut), as
--     ranked_ledger: the boards of past seasons are read from it.
--   * combat_arena_seasons / combat_arena_season_results: the seasons closed, once each, with the
--     place, the Gloria, the league and the prize of each player.

insert into public.game_config (key, value, description) values
  ('combat_arena.board_size', '10', 'Scontro a squadre, challenges: players shown on the board (the player''s own place below when lower).'),
  ('combat_arena.leagues.recluta', '0', 'Scontro a squadre: Gloria at which each league starts.'),
  ('combat_arena.leagues.vigilante', '300', 'Scontro a squadre: Gloria at which each league starts.'),
  ('combat_arena.leagues.veterano', '700', 'Scontro a squadre: Gloria at which each league starts.'),
  ('combat_arena.leagues.asso', '1200', 'Scontro a squadre: Gloria at which each league starts.'),
  ('combat_arena.leagues.leggenda', '1800', 'Scontro a squadre: Gloria at which each league starts.'),
  ('combat_arena.leagues.omega', '2500', 'Scontro a squadre: Gloria at which each league starts.'),
  ('combat_arena.season.keep_up_to', '700', 'Scontro a squadre: a new season keeps the Gloria up to this...'),
  ('combat_arena.season.keep_share_percent', '50', '...plus this share of the rest.'),
  ('combat_arena.season.min_challenges', '5', 'Scontro a squadre: challenges in a season before its prize.'),
  ('combat_arena.season.rewards.recluta.coins', '25', 'Scontro a squadre: prize of the league at the end of a season.'),
  ('combat_arena.season.rewards.recluta.packs', '0', 'Scontro a squadre: prize of the league at the end of a season.'),
  ('combat_arena.season.rewards.vigilante.coins', '50', 'Scontro a squadre: prize of the league at the end of a season.'),
  ('combat_arena.season.rewards.vigilante.packs', '0', 'Scontro a squadre: prize of the league at the end of a season.'),
  ('combat_arena.season.rewards.veterano.coins', '100', 'Scontro a squadre: prize of the league at the end of a season.'),
  ('combat_arena.season.rewards.veterano.packs', '0', 'Scontro a squadre: prize of the league at the end of a season.'),
  ('combat_arena.season.rewards.asso.coins', '100', 'Scontro a squadre: prize of the league at the end of a season.'),
  ('combat_arena.season.rewards.asso.packs', '1', 'Scontro a squadre: prize of the league at the end of a season.'),
  ('combat_arena.season.rewards.leggenda.coins', '0', 'Scontro a squadre: prize of the league at the end of a season.'),
  ('combat_arena.season.rewards.leggenda.packs', '2', 'Scontro a squadre: prize of the league at the end of a season.'),
  ('combat_arena.season.rewards.omega.coins', '0', 'Scontro a squadre: prize of the league at the end of a season.'),
  ('combat_arena.season.rewards.omega.packs', '3', 'Scontro a squadre: prize of the league at the end of a season.')
on conflict (key) do nothing;

-- The packs of a season's prize, and the notification of its end.
alter table public.pack_openings drop constraint pack_openings_pack_type_check;
alter table public.pack_openings add constraint pack_openings_pack_type_check check (pack_type in (
  'daily', 'standard', 'bonus', 'event', 'special', 'objective', 'match', 'achievement', 'emergency', 'ranked', 'challenge',
  'shards', 'combat'
));
alter table public.player_notifications drop constraint player_notifications_kind_check;
alter table public.player_notifications add constraint player_notifications_kind_check check (kind in (
  'objective_completed', 'event_reward', 'achievement', 'leaderboard', 'ranked', 'challenge', 'challenge_reward', 'combat_season'
));

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

alter table public.combat_arena_players
  add column season text not null default public.ranked_current_season() check (season ~ '^\d{4}-\d{2}$');

create table public.combat_arena_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  season text not null check (season ~ '^\d{4}-\d{2}$'),
  reason text not null check (reason in ('attack', 'defense', 'season_reset')),
  battle_id uuid references public.combat_battles (id) on delete set null,
  -- For the player of the row: their challenge won or lost, their defence held or not.
  outcome text check (outcome in ('win', 'draw', 'loss')),
  delta integer not null,
  points_after integer not null check (points_after >= 0),
  created_at timestamptz not null default now(),
  check ((reason = 'season_reset') = (outcome is null))
);
create index combat_arena_ledger_season_idx on public.combat_arena_ledger (season, user_id);
create index combat_arena_ledger_user_idx on public.combat_arena_ledger (user_id, created_at);
alter table public.combat_arena_ledger enable row level security;
revoke all on table public.combat_arena_ledger from anon, authenticated;
grant select on table public.combat_arena_ledger to service_role;

create table public.combat_arena_seasons (
  season text primary key check (season ~ '^\d{4}-\d{2}$'),
  closed_at timestamptz not null default now()
);
create table public.combat_arena_season_results (
  id uuid primary key default gen_random_uuid(),
  season text not null references public.combat_arena_seasons (season),
  user_id uuid not null references public.profiles (id) on delete cascade,
  place integer not null check (place >= 1),
  points integer not null,
  league text not null,
  challenges integer not null,
  wins integer not null,
  coins integer not null default 0 check (coins >= 0),
  packs integer not null default 0 check (packs >= 0),
  claimed_at timestamptz,
  opening_ids uuid[] not null default '{}',
  unique (season, user_id)
);
create index combat_arena_season_results_user_idx on public.combat_arena_season_results (user_id);
alter table public.combat_arena_seasons enable row level security;
alter table public.combat_arena_season_results enable row level security;
revoke all on table public.combat_arena_seasons from anon, authenticated;
revoke all on table public.combat_arena_season_results from anon, authenticated;
grant select on table public.combat_arena_seasons to service_role;
grant select on table public.combat_arena_season_results to service_role;

-- The challenges finished before this stage, in the ledger (the Gloria started at 0, no cut yet).
insert into public.combat_arena_ledger (user_id, season, reason, battle_id, outcome, delta, points_after, created_at)
select x.user_id, public.ranked_season_of(public.game_day(x.finished_at)), x.reason, x.battle_id, x.outcome, x.delta,
       greatest(0, sum(x.delta) over (partition by x.user_id order by x.finished_at, x.reason, x.battle_id)), x.finished_at
from (
  select b.user_id, 'attack' as reason, b.id as battle_id, b.finished_at, b.points_change as delta,
         case b.status when 'won' then 'win' when 'draw' then 'draw' else 'loss' end as outcome
  from public.combat_battles b
  where b.kind = 'arena' and b.finished_at is not null and b.points_change is not null
  union all
  select b.opponent_id, 'defense', b.id, b.finished_at, b.opponent_points_change,
         case b.status when 'won' then 'loss' when 'draw' then 'draw' else 'win' end
  from public.combat_battles b
  where b.kind = 'arena' and b.finished_at is not null and b.opponent_id is not null and b.opponent_points_change is not null
) x;

-- ---------------------------------------------------------------------------
-- Leagues and the season's cut
-- ---------------------------------------------------------------------------

create function public.combat_arena_league_of(p_points integer)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_points >= public.config_int('combat_arena.leagues.omega') then 'omega'
    when p_points >= public.config_int('combat_arena.leagues.leggenda') then 'leggenda'
    when p_points >= public.config_int('combat_arena.leagues.asso') then 'asso'
    when p_points >= public.config_int('combat_arena.leagues.veterano') then 'veterano'
    when p_points >= public.config_int('combat_arena.leagues.vigilante') then 'vigilante'
    else 'recluta'
  end
$$;

create function public.combat_arena_next_league_at(p_points integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select min(public.config_int('combat_arena.leagues.' || l))
  from unnest(array['vigilante', 'veterano', 'asso', 'leggenda', 'omega']) as l
  where public.config_int('combat_arena.leagues.' || l) > p_points
$$;

create function public.combat_arena_reset(p_points integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when p_points <= public.config_int('combat_arena.season.keep_up_to') then p_points
    else public.config_int('combat_arena.season.keep_up_to')
         + (p_points - public.config_int('combat_arena.season.keep_up_to')) * public.config_int('combat_arena.season.keep_share_percent') / 100
  end
$$;

-- A player's Gloria now, with the cut of a new season counted even before it is written.
create or replace function public.combat_arena_points(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case when a.season = public.ranked_current_season() then a.points else public.combat_arena_reset(a.points) end
    from public.combat_arena_players a where a.user_id = p_user
  ), 0)
$$;

-- The player's row, locked, created at 0 or cut for the season in course (the cut is a row of the ledger).
create function public.combat_arena_player_state(p_user uuid)
returns public.combat_arena_players
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_season text := public.ranked_current_season();
  v_row public.combat_arena_players;
  v_points integer;
begin
  insert into public.combat_arena_players (user_id, season) values (p_user, v_season) on conflict do nothing;
  select * into v_row from public.combat_arena_players where user_id = p_user for update;
  if v_row.season <> v_season then
    v_points := public.combat_arena_reset(v_row.points);
    if v_points <> v_row.points then
      insert into public.combat_arena_ledger (user_id, season, reason, delta, points_after)
      values (p_user, v_season, 'season_reset', v_points - v_row.points, v_points);
    end if;
    update public.combat_arena_players set season = v_season, points = v_points, updated_at = now()
    where user_id = p_user
    returning * into v_row;
  end if;
  return v_row;
end;
$$;

-- As in 20261126130000_scontro_arena.sql, on the players' rows of the season in course, and every
-- challenge written in the ledger for both sides (also when it moves nothing).
create or replace function public.combat_arena_score(p_battle uuid, p_outcome text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_battle public.combat_battles;
  v_season text := public.ranked_current_season();
  v_points integer;
  v_opponent_points integer;
  v_change integer := 0;
  v_defense integer;
  v_magnitude integer;
  v_after integer;
  v_floor integer := public.config_int('combat_arena.no_loss_below');
begin
  select * into v_battle from public.combat_battles where id = p_battle;
  if not found or v_battle.kind <> 'arena' then
    return;
  end if;
  v_points := (public.combat_arena_player_state(v_battle.user_id)).points;
  v_opponent_points := case when v_battle.opponent_id is null then coalesce((v_battle.opponent ->> 'points')::integer, v_points)
                            else (public.combat_arena_player_state(v_battle.opponent_id)).points end;
  if p_outcome in ('win', 'loss')
     and (v_battle.opponent_id is null or (
       select count(*) from public.combat_battles b
       where b.user_id = v_battle.user_id and b.kind = 'arena' and b.opponent_id = v_battle.opponent_id and b.id <> p_battle
         and b.points_change is not null and public.game_day(b.finished_at) = public.game_day()
     ) < public.config_int('combat_arena.same_opponent_daily')) then
    v_change := public.combat_arena_nominal(v_points, v_opponent_points, p_outcome);
    if p_outcome = 'loss' then
      v_change := case when v_points < v_floor then 0 else -least(v_points, v_change) end;
    end if;
    if v_battle.opponent_id is not null then
      v_magnitude := greatest(1, round(public.combat_arena_nominal(v_opponent_points, v_points, case p_outcome when 'win' then 'loss' else 'win' end)
                                       * public.config_int('combat_arena.defense_share_percent') / 100.0)::integer);
      v_defense := case when p_outcome = 'loss' then v_magnitude
                        when v_opponent_points < v_floor then 0
                        else -least(v_opponent_points, v_magnitude) end;
    end if;
  else
    v_defense := case when v_battle.opponent_id is null then null else 0 end;
  end if;

  update public.combat_arena_players set points = points + v_change, updated_at = now()
  where user_id = v_battle.user_id
  returning points into v_after;
  insert into public.combat_arena_ledger (user_id, season, reason, battle_id, outcome, delta, points_after)
  values (v_battle.user_id, v_season, 'attack', p_battle, p_outcome, v_change, v_after);
  if v_battle.opponent_id is not null then
    update public.combat_arena_players set points = points + coalesce(v_defense, 0), updated_at = now()
    where user_id = v_battle.opponent_id
    returning points into v_after;
    insert into public.combat_arena_ledger (user_id, season, reason, battle_id, outcome, delta, points_after)
    values (v_battle.opponent_id, v_season, 'defense', p_battle,
            case p_outcome when 'win' then 'loss' when 'loss' then 'win' else 'draw' end, coalesce(v_defense, 0), v_after);
  end if;
  update public.combat_battles set points_change = v_change, opponent_points_change = v_defense where id = p_battle;
end;
$$;

-- ---------------------------------------------------------------------------
-- Boards and the end of a season
-- ---------------------------------------------------------------------------

-- Who challenged or was challenged in a season: the Gloria at its end (or now), the challenges and
-- the wins, and when the Gloria last moved (ties: who got there first).
create function public.combat_arena_board_rows(p_season text)
returns table (user_id uuid, points integer, challenges integer, wins integer, reached_at timestamptz)
language sql
stable
set search_path = ''
as $$
  with played as (
    select l.user_id,
      (count(*) filter (where l.reason = 'attack'))::integer as challenges,
      (count(*) filter (where l.reason = 'attack' and l.outcome = 'win'))::integer as wins,
      max(l.created_at) as reached_at
    from public.combat_arena_ledger l
    where l.season = p_season and l.reason in ('attack', 'defense')
    group by l.user_id
  )
  select p.user_id,
    (select x.points_after from public.combat_arena_ledger x
     where x.user_id = p.user_id and x.season <= p_season
     order by x.created_at desc, x.id desc limit 1),
    p.challenges, p.wins, p.reached_at
  from played p
$$;

-- Writes the results of every season that is over and not yet closed: place, Gloria and league;
-- the prize of the league for whoever challenged at least season.min_challenges times; a
-- notification for everyone on the board. Called by what the players read, so the first visit
-- after the end of the month closes it (once: combat_arena_seasons).
create function public.combat_arena_close_seasons()
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_current text := public.ranked_current_season();
  v_min integer := public.config_int('combat_arena.season.min_challenges');
  v_season text;
  v_label text;
  v_result public.combat_arena_season_results;
begin
  for v_season in
    select distinct l.season from public.combat_arena_ledger l
    where l.reason in ('attack', 'defense') and l.season < v_current
      and not exists (select 1 from public.combat_arena_seasons s where s.season = l.season)
    order by 1
  loop
    insert into public.combat_arena_seasons (season) values (v_season) on conflict do nothing;
    continue when not found;
    v_label := public.ranked_season_label(v_season);

    insert into public.combat_arena_season_results (season, user_id, place, points, league, challenges, wins, coins, packs)
    select v_season, r.user_id, r.place, r.points, public.combat_arena_league_of(r.points), r.challenges, r.wins,
      case when r.challenges >= v_min then public.config_int('combat_arena.season.rewards.' || public.combat_arena_league_of(r.points) || '.coins') else 0 end,
      case when r.challenges >= v_min then public.config_int('combat_arena.season.rewards.' || public.combat_arena_league_of(r.points) || '.packs') else 0 end
    from (
      select b.*, row_number() over (order by b.points desc, b.reached_at, b.user_id)::integer as place
      from public.combat_arena_board_rows(v_season) b
    ) r;

    for v_result in select * from public.combat_arena_season_results where season = v_season loop
      perform public.add_player_notification(
        v_result.user_id, 'combat_season', 'Stagione dello Scontro conclusa!',
        'Stagione di ' || v_label || ': ' || v_result.place || '° posto, ' || public.ranked_league_name(v_result.league)
          || case when v_result.coins > 0 or v_result.packs > 0 then '. Ritira il premio nello Scontro.' else '.' end,
        jsonb_build_object('season', v_season, 'coins', v_result.coins, 'packs', v_result.packs)
      );
    end loop;
  end loop;
end;
$$;

-- One row of a board as the app shows it.
create function public.combat_arena_board_entry(p_place integer, p_user uuid, p_points integer, p_challenges integer, p_wins integer)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'place', p_place, 'username', pr.username, 'avatar_url', pr.avatar_url, 'title', pr.title,
    'points', p_points, 'league', public.combat_arena_league_of(p_points),
    'challenges', p_challenges, 'wins', p_wins, 'is_me', p_user = auth.uid()
  )
  from public.profiles pr where pr.id = p_user
$$;

-- The board of a season (the one in course by default): the first combat_arena.board_size, the
-- caller's own row, how many played, and the seasons closed so far for the choice.
create function public.get_combat_arena_board(p_season text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_current text := public.ranked_current_season();
  v_season text := coalesce(p_season, v_current);
  v_size integer := public.config_int('combat_arena.board_size');
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if v_season !~ '^\d{4}-(0[1-9]|1[0-2])$' or v_season > v_current then
    raise exception 'combat_season_invalid' using errcode = '22023';
  end if;
  perform public.combat_arena_close_seasons();
  return (
    with ranked as (
      select b.*, row_number() over (order by b.points desc, b.reached_at, b.user_id)::integer as place
      from public.combat_arena_board_rows(v_season) b
    ),
    entries as (
      select r.place, r.user_id, public.combat_arena_board_entry(r.place, r.user_id, r.points, r.challenges, r.wins) as entry
      from ranked r
    )
    select jsonb_build_object(
      'season', v_season,
      'label', public.ranked_season_label(v_season),
      'ends_at', public.ranked_season_ends_at(v_season),
      'current', v_season = v_current,
      'players', (select count(*) from entries),
      'top', coalesce((select jsonb_agg(e.entry order by e.place) from entries e where e.place <= v_size), '[]'::jsonb),
      'me', (select e.entry from entries e where e.user_id = v_user),
      'seasons', coalesce((
        select jsonb_agg(jsonb_build_object('season', s.season, 'label', public.ranked_season_label(s.season)) order by s.season desc)
        from (select season from public.combat_arena_seasons order by season desc limit 12) s
      ), '[]'::jsonb)
    )
  );
end;
$$;

-- Claims the prize of a season: coins on the ledger, packs opened at once.
create function public.claim_combat_arena_prize(p_season text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_result public.combat_arena_season_results;
  v_openings uuid[] := '{}';
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_result from public.combat_arena_season_results r
  where r.season = p_season and r.user_id = v_user and (r.coins > 0 or r.packs > 0)
  for update;
  if v_result.id is null then
    raise exception 'combat_prize_not_found' using errcode = 'P0002';
  end if;
  if v_result.claimed_at is not null then
    raise exception 'combat_prize_already_claimed' using errcode = '22023';
  end if;
  if v_result.coins > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id) values (v_user, v_result.coins, 'combat_reward', v_result.id);
  end if;
  for i in 1..v_result.packs loop
    v_openings := v_openings || public.open_pack(v_user, 'combat');
  end loop;
  update public.combat_arena_season_results set claimed_at = now(), opening_ids = v_openings where id = v_result.id;
  return jsonb_build_object('coins', v_result.coins, 'opening_ids', to_jsonb(v_openings), 'coin_balance', public.coin_balance(v_user));
end;
$$;

-- As in 20261126130000_scontro_arena.sql, with the season: its name, end, the player's league,
-- the way to the next, the challenges of the season against the prize's minimum, the place, and
-- the prizes of past seasons still to claim. Past seasons are closed first.
create or replace function public.get_combat_arena()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_defense public.combat_defenses;
  v_offer public.combat_arena_offers;
  v_seen timestamptz;
  v_daily integer := public.config_int('combat_arena.refreshes_daily');
  v_season text := public.ranked_current_season();
  v_points integer;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.combat_arena_close_seasons();
  select * into v_defense from public.combat_defenses where user_id = v_user;
  select * into v_offer from public.combat_arena_offers where user_id = v_user;
  if v_defense.user_id is not null and (v_offer.user_id is null or v_offer.day <> public.game_day()) then
    perform public.combat_arena_make_offers(v_user);
    select * into v_offer from public.combat_arena_offers where user_id = v_user;
  end if;
  select a.defenses_seen_at into v_seen from public.combat_arena_players a where a.user_id = v_user;
  v_points := public.combat_arena_points(v_user);
  return jsonb_build_object(
    'points', v_points,
    'season', jsonb_build_object(
      'season', v_season,
      'label', public.ranked_season_label(v_season),
      'ends_at', public.ranked_season_ends_at(v_season),
      'league', public.combat_arena_league_of(v_points),
      'next_league_at', public.combat_arena_next_league_at(v_points),
      'challenges', (select count(*) from public.combat_arena_ledger l where l.user_id = v_user and l.season = v_season and l.reason = 'attack'),
      'min_challenges', public.config_int('combat_arena.season.min_challenges'),
      'place', (
        select r.place from (
          select b.user_id, row_number() over (order by b.points desc, b.reached_at, b.user_id)::integer as place
          from public.combat_arena_board_rows(v_season) b
        ) r where r.user_id = v_user
      )
    ),
    'prizes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'season', r.season, 'label', public.ranked_season_label(r.season), 'place', r.place,
        'league', r.league, 'points', r.points, 'coins', r.coins, 'packs', r.packs
      ) order by r.season)
      from public.combat_arena_season_results r
      where r.user_id = v_user and r.claimed_at is null and (r.coins > 0 or r.packs > 0)
    ), '[]'::jsonb),
    'defense', case when v_defense.user_id is null then null else jsonb_build_object(
      'card_instance_ids', to_jsonb(v_defense.card_instance_ids),
      'definition_ids', to_jsonb(v_defense.definition_ids),
      'tactics', v_defense.tactics,
      'ok', public.combat_defense_ok(v_user)) end,
    'offers', coalesce((select jsonb_agg(o - 'user_id' order by ord) from jsonb_array_elements(v_offer.offers) with ordinality as e(o, ord)), '[]'::jsonb),
    'refreshes_left', case when v_offer.user_id is null or v_offer.day <> public.game_day() then v_daily else greatest(0, v_daily - v_offer.refreshes) end,
    'paid_today', (select count(*) from public.combat_battles b
                   where b.user_id = v_user and b.kind = 'arena' and b.xp is not null and public.game_day(b.finished_at) = public.game_day()),
    'paid_daily', public.config_int('combat_arena.rewards.daily_battles'),
    'defenses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'attacker', x.username, 'held', x.status in ('lost', 'abandoned'), 'draw', x.status = 'draw',
        'points', coalesce(x.opponent_points_change, 0), 'finished_at', x.finished_at,
        'new', v_seen is null or x.finished_at > v_seen) order by x.finished_at desc)
      from (
        select b.status, b.opponent_points_change, b.finished_at, p.username
        from public.combat_battles b join public.profiles p on p.id = b.user_id
        where b.opponent_id = v_user and b.kind = 'arena' and b.finished_at is not null
        order by b.finished_at desc
        limit 10
      ) x), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.combat_arena_league_of(integer) from public, anon, authenticated;
revoke execute on function public.combat_arena_next_league_at(integer) from public, anon, authenticated;
revoke execute on function public.combat_arena_reset(integer) from public, anon, authenticated;
revoke execute on function public.combat_arena_points(uuid) from public, anon, authenticated;
revoke execute on function public.combat_arena_player_state(uuid) from public, anon, authenticated;
revoke execute on function public.combat_arena_score(uuid, text) from public, anon, authenticated;
revoke execute on function public.combat_arena_board_rows(text) from public, anon, authenticated;
revoke execute on function public.combat_arena_close_seasons() from public, anon, authenticated;
revoke execute on function public.combat_arena_board_entry(integer, uuid, integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.get_combat_arena() from public, anon;
revoke execute on function public.get_combat_arena_board(text) from public, anon;
revoke execute on function public.claim_combat_arena_prize(text) from public, anon;
grant execute on function public.get_combat_arena() to authenticated;
grant execute on function public.get_combat_arena_board(text) to authenticated;
grant execute on function public.claim_combat_arena_prize(text) to authenticated;
