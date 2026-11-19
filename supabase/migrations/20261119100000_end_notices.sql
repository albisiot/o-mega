-- End notices (SPEC §11.7): when something timed ends, every player who took part sees,
-- the first time they open the app afterwards, a full-screen notice with what ended, their
-- result and, when there is one they may see, the final leaderboard. Covered:
--   event           a timed event (§8.2): who earned event points
--   challenge       a Sfida a tema (§8.8): who finished a match of it, or ran its Emergenza
--   emergency_week  the Emergenza della settimana (§5.16): who started the week's run
--   ranked_season   a Mandato of the Classificata (§8.7): who played a ranked match in it
-- Not covered: the daily Emergenza (every day, with its prize popup) and the weekly
-- Classifiche (§8.6, a new week starts by itself; the first gets a banner).
--
-- Nothing is written when something ends: get_end_notices works out, for the caller only,
-- what ended in the last end_notices.within_days days, and leaves out what the caller has
-- already been shown (end_notices_seen, written by mark_end_notice_seen). So the notice
-- comes once per player and per thing, on any device. The Mandato's banner «Mandato
-- concluso!» (§11.1) gives way to the notice: ranked_close_seasons no longer writes it.

insert into public.game_config (key, value, description) values
  ('end_notices.within_days', '7', 'Something timed that ended longer ago than this gets no end notice'),
  ('end_notices.board_size', '10', 'Players shown in the final leaderboard of an end notice; the player''s own place shows below when lower');

-- What each player has been shown. No client reads it: get_end_notices does.
create table public.end_notices_seen (
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('event', 'challenge', 'emergency_week', 'ranked_season')),
  -- The event or challenge id, the week's Monday (YYYY-MM-DD), the Mandato (YYYY-MM).
  ref text not null check (char_length(ref) between 1 and 64),
  seen_at timestamptz not null default now(),
  primary key (user_id, kind, ref)
);

alter table public.end_notices_seen enable row level security;
revoke all on table public.end_notices_seen from anon, authenticated;

-- ---------------------------------------------------------------------------
-- The notice of each kind
-- ---------------------------------------------------------------------------

-- One row of a final leaderboard: value is what the board ranks by, value2 the second
-- number shown (targets, played, score) or null. Never teams or cards.
create function public.end_notice_entry(
  p_rank integer, p_username text, p_avatar_url text, p_value integer, p_value2 integer, p_is_me boolean
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'rank', p_rank, 'username', p_username, 'avatar_url', p_avatar_url,
    'value', p_value, 'value2', p_value2, 'is_me', p_is_me
  )
$$;

-- An event: points and targets; the place and the leaderboard only for a player who may
-- see the event's leaderboard (event_leaderboard_allowed, the same rule as /evento).
create function public.end_notice_event(p_event_id uuid, p_user uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_event public.events;
  v_size integer := public.config_int('end_notices.board_size');
  v_points integer;
  v_steps integer;
  v_tiers integer;
  v_board jsonb;
  v_lb jsonb;
begin
  select * into v_event from public.events where id = p_event_id;
  select coalesce(sum(p.points), 0)::integer into v_points
  from public.event_points p where p.event_id = p_event_id and p.user_id = p_user;
  select count(*)::integer into v_tiers from public.event_tiers t where t.event_id = p_event_id;
  select count(*)::integer into v_steps from public.event_rewards r where r.event_id = p_event_id and r.user_id = p_user;

  if public.event_leaderboard_allowed(p_event_id, p_user) then
    v_lb := public.event_leaderboard_payload(p_event_id, p_user);
    v_board := jsonb_build_object(
      'players', (v_lb ->> 'players')::integer,
      'top', coalesce((
        select jsonb_agg(public.end_notice_entry(
          (e ->> 'rank')::integer, e ->> 'username', e ->> 'avatar_url',
          (e ->> 'points')::integer, (e ->> 'steps')::integer, (e ->> 'is_me')::boolean
        ) order by (e ->> 'rank')::integer)
        from jsonb_array_elements(v_lb -> 'top') e
        where (e ->> 'rank')::integer <= v_size
      ), '[]'::jsonb),
      'me', case when jsonb_typeof(v_lb -> 'me') = 'object' then public.end_notice_entry(
        (v_lb -> 'me' ->> 'rank')::integer, v_lb -> 'me' ->> 'username', v_lb -> 'me' ->> 'avatar_url',
        (v_lb -> 'me' ->> 'points')::integer, (v_lb -> 'me' ->> 'steps')::integer, true
      ) end
    );
  end if;

  return jsonb_build_object(
    'id', 'event:' || v_event.id,
    'kind', 'event',
    'ref', v_event.id::text,
    'title', v_event.title,
    'color', null,
    'starts_at', v_event.starts_at,
    'ends_at', v_event.ends_at,
    'rank', (v_board -> 'me' ->> 'rank')::integer,
    'players', (v_board ->> 'players')::integer,
    'result', jsonb_build_object('points', v_points, 'steps', v_steps, 'tiers', v_tiers),
    'board', v_board,
    -- The event had a leaderboard this player may not see.
    'board_locked', v_board is null
  );
end;
$$;

-- A Sfida a tema: wins and matches (in an Emergenza the run), the place and the leaderboard
-- when the challenge shows one (challenges.leaderboard).
create function public.end_notice_challenge(p_challenge_id uuid, p_user uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_challenge public.challenges;
  v_size integer := public.config_int('end_notices.board_size');
  v_emergency boolean;
  v_run public.challenge_emergency_runs;
  v_me record;
  v_board jsonb;
begin
  select * into v_challenge from public.challenges where id = p_challenge_id;
  v_emergency := v_challenge.format = 'emergency';
  select k.rank, k.players, k.wins, k.played, k.score into v_me
  from public.challenge_ranking(p_challenge_id) k where k.user_id = p_user;
  if v_emergency then
    select * into v_run from public.challenge_emergency_runs r where r.challenge_id = p_challenge_id and r.user_id = p_user;
  end if;

  if v_challenge.leaderboard then
    select jsonb_build_object(
      'players', count(*),
      'top', coalesce(jsonb_agg(public.end_notice_entry(
        k.rank, pr.username, pr.avatar_url, k.wins, case when v_emergency then k.score else k.played end, k.user_id = p_user
      ) order by k.rank) filter (where k.rank <= v_size), '[]'::jsonb),
      'me', (jsonb_agg(public.end_notice_entry(
        k.rank, pr.username, pr.avatar_url, k.wins, case when v_emergency then k.score else k.played end, true
      )) filter (where k.user_id = p_user)) -> 0
    ) into v_board
    from public.challenge_ranking(p_challenge_id) k
    join public.profiles pr on pr.id = k.user_id;
  end if;

  return jsonb_build_object(
    'id', 'challenge:' || v_challenge.id,
    'kind', 'challenge',
    'ref', v_challenge.id::text,
    'title', v_challenge.title,
    'color', v_challenge.color,
    'starts_at', v_challenge.starts_at,
    'ends_at', v_challenge.ends_at,
    'rank', case when v_challenge.leaderboard then v_me.rank end,
    'players', case when v_challenge.leaderboard then coalesce(v_me.players, (v_board ->> 'players')::integer) end,
    'result', jsonb_build_object(
      'format', v_challenge.format,
      -- In an Emergenza: threats passed, the run's score, whether it finished.
      'wins', coalesce(v_me.wins, v_run.passed, 0),
      'played', coalesce(v_me.played, 0),
      'score', coalesce(v_me.score, v_run.total_score, 0),
      'finished', case when v_emergency then coalesce(v_run.status = 'finished', false) end,
      'threats', v_challenge.emergency_threats
    ),
    'board', v_board,
    'board_locked', false
  );
end;
$$;

-- The Emergenza della settimana: the run (finished or not), the place, the prize won (claimed
-- from its own popup) and the week's final leaderboard.
create function public.end_notice_emergency_week(p_week date, p_user uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_size integer := public.config_int('end_notices.board_size');
  v_run public.emergency_week_runs;
  v_prize public.emergency_week_prizes;
  v_board jsonb;
begin
  select * into v_run from public.emergency_week_runs r where r.week = p_week and r.user_id = p_user;
  select * into v_prize from public.emergency_week_prizes p where p.week = p_week and p.user_id = p_user;

  select jsonb_build_object(
    'players', count(*),
    'top', coalesce(jsonb_agg(public.end_notice_entry(
      k.rank, pr.username, pr.avatar_url, k.passed, k.total_score, k.user_id = p_user
    ) order by k.rank) filter (where k.rank <= v_size), '[]'::jsonb),
    'me', (jsonb_agg(public.end_notice_entry(
      k.rank, pr.username, pr.avatar_url, k.passed, k.total_score, true
    )) filter (where k.user_id = p_user)) -> 0
  ) into v_board
  from public.emergency_week_ranking(p_week) k
  join public.profiles pr on pr.id = k.user_id;

  return jsonb_build_object(
    'id', 'emergency_week:' || p_week,
    'kind', 'emergency_week',
    'ref', p_week::text,
    'title', 'Emergenza della settimana',
    'color', null,
    'starts_at', (p_week::timestamp) at time zone public.config_text('time.daily_reset_time_zone'),
    'ends_at', public.emergency_week_ends_at(p_week),
    'rank', (v_board -> 'me' ->> 'rank')::integer,
    'players', (v_board ->> 'players')::integer,
    'result', jsonb_build_object(
      'passed', coalesce(v_run.passed, 0),
      'score', coalesce(v_run.total_score, 0),
      'finished', coalesce(v_run.status = 'finished', false),
      'threats', coalesce(
        (select cardinality(w.threat_ids) from public.emergency_weeks w where w.week = p_week),
        public.config_int('emergency_week.threats_per_run')
      ),
      'prize_coins', coalesce(v_prize.coins, 0),
      'prize_packs', coalesce(v_prize.packs, 0),
      'prize_claimed', v_prize.claimed_at is not null
    ),
    'board', v_board,
    'board_locked', false
  );
end;
$$;

-- A Mandato of the Classificata: place, Fama, league, prize and title (ranked_season_results,
-- written by ranked_close_seasons) and the final Albo. Only people: the server's opponents
-- never have results.
create function public.end_notice_ranked_season(p_season text, p_user uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_size integer := public.config_int('end_notices.board_size');
  v_result public.ranked_season_results;
  v_board jsonb;
begin
  select * into v_result from public.ranked_season_results r where r.season = p_season and r.user_id = p_user;

  select jsonb_build_object(
    'players', count(*),
    'top', coalesce(jsonb_agg(public.end_notice_entry(
      r.place, pr.username, pr.avatar_url, r.fama, null, r.user_id = p_user
    ) order by r.place) filter (where r.place <= v_size), '[]'::jsonb),
    'me', (jsonb_agg(public.end_notice_entry(
      r.place, pr.username, pr.avatar_url, r.fama, null, true
    )) filter (where r.user_id = p_user)) -> 0
  ) into v_board
  from public.ranked_season_results r
  join public.profiles pr on pr.id = r.user_id
  where r.season = p_season;

  return jsonb_build_object(
    'id', 'ranked_season:' || p_season,
    'kind', 'ranked_season',
    'ref', p_season,
    'title', 'Mandato di ' || public.ranked_season_label(p_season),
    'color', null,
    'starts_at', (to_date(p_season || '-01', 'YYYY-MM-DD')::timestamp) at time zone public.config_text('time.daily_reset_time_zone'),
    'ends_at', public.ranked_season_ends_at(p_season),
    'rank', v_result.place,
    'players', (v_board ->> 'players')::integer,
    'result', jsonb_build_object(
      'fama', v_result.fama,
      'league', v_result.league,
      'league_name', public.ranked_league_name(v_result.league),
      'matches', v_result.matches,
      'wins', v_result.wins,
      'prize_coins', v_result.coins,
      'prize_packs', v_result.packs,
      'prize_claimed', v_result.claimed_at is not null,
      'title', v_result.title
    ),
    'board', v_board,
    'board_locked', false
  );
end;
$$;

revoke execute on function public.end_notice_entry(integer, text, text, integer, integer, boolean) from public, anon, authenticated;
revoke execute on function public.end_notice_event(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.end_notice_challenge(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.end_notice_emergency_week(date, uuid) from public, anon, authenticated;
revoke execute on function public.end_notice_ranked_season(text, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The Mandato's banner gives way to the notice
-- ---------------------------------------------------------------------------

-- Same as in 20261117230000_ranked.sql, without the «Mandato concluso!» banner: the end
-- notice tells each player, with the final Albo, the first time they open the app.
create or replace function public.ranked_close_seasons()
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_current text := public.ranked_current_season();
  v_min integer := public.config_int('ranked.season.min_matches');
  v_season text;
  v_label text;
  v_result public.ranked_season_results;
begin
  for v_season in
    select distinct l.season from public.ranked_ledger l
    where l.reason = 'match' and l.season < v_current
      and not exists (select 1 from public.ranked_seasons s where s.season = l.season)
    order by 1
  loop
    insert into public.ranked_seasons (season) values (v_season) on conflict do nothing;
    continue when not found;
    v_label := public.ranked_season_label(v_season);

    insert into public.ranked_season_results (season, user_id, place, fama, league, matches, wins, coins, packs, title)
    select v_season, r.user_id, r.place, r.fama, public.ranked_league_of(r.fama), r.matches, r.wins,
      case when r.matches >= v_min then public.config_int('ranked.season.rewards.' || public.ranked_league_of(r.fama) || '.coins') else 0 end,
      case when r.matches >= v_min then public.config_int('ranked.season.rewards.' || public.ranked_league_of(r.fama) || '.packs') else 0 end,
      case
        when r.matches < v_min then null
        when r.place <= 3 then r.place || '° Reggente · ' || v_label
        when public.ranked_league_of(r.fama) = 'omega' then 'O-MEGA · ' || v_label
        when public.ranked_league_of(r.fama) = 'leggenda' then 'Leggenda · ' || v_label
      end
    from (
      select b.*, row_number() over (order by b.value desc, b.reached_at, b.user_id)::integer as place
      from public.ranked_board_rows(v_season, null) b
    ) r;

    -- A player without a title shows the new one straight away.
    for v_result in select * from public.ranked_season_results where season = v_season and title is not null loop
      update public.profiles set title = v_result.title, updated_at = now()
      where id = v_result.user_id and title is null;
    end loop;
  end loop;
end;
$$;

revoke execute on function public.ranked_close_seasons() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Player RPCs
-- ---------------------------------------------------------------------------

-- The caller's end notices still to show, the oldest end first: what ended in the last
-- end_notices.within_days days, that the caller took part in and has not been shown.
-- Closes the weeks and the Mandati that are over first, as the Emergenza and the Albo do.
create function public.get_end_notices()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_since timestamptz := now() - make_interval(days => public.config_int('end_notices.within_days'));
  v_notices jsonb := '[]'::jsonb;
  v_id uuid;
  v_week date;
  v_season text;
  v_closed boolean := false;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- Events with the caller's points (switched off by an admin: none).
  for v_id in
    select e.id from public.events e
    where e.is_active and e.ends_at <= now() and e.ends_at > v_since
      and exists (select 1 from public.event_points p where p.event_id = e.id and p.user_id = v_user)
      and not exists (select 1 from public.end_notices_seen s
                      where s.user_id = v_user and s.kind = 'event' and s.ref = e.id::text)
  loop
    v_notices := v_notices || jsonb_build_array(public.end_notice_event(v_id, v_user));
  end loop;

  -- Sfide a tema with a match of the caller finished normally, or their Emergenza run.
  for v_id in
    select c.id from public.challenges c
    where c.is_active and c.ends_at <= now() and c.ends_at > v_since
      and (
        exists (select 1 from public.matches m
                where m.challenge_id = c.id and (m.player_a = v_user or m.player_b = v_user)
                  and m.status = 'finished' and m.end_reason = 'completed')
        or exists (select 1 from public.challenge_emergency_runs r where r.challenge_id = c.id and r.user_id = v_user)
      )
      and not exists (select 1 from public.end_notices_seen s
                      where s.user_id = v_user and s.kind = 'challenge' and s.ref = c.id::text)
  loop
    v_notices := v_notices || jsonb_build_array(public.end_notice_challenge(v_id, v_user));
  end loop;

  -- Weeks of the Emergenza della settimana the caller started a run in.
  for v_week in
    select r.week from public.emergency_week_runs r
    where r.user_id = v_user and r.week < public.emergency_week_current()
      and public.emergency_week_ends_at(r.week) > v_since
      and not exists (select 1 from public.end_notices_seen s
                      where s.user_id = v_user and s.kind = 'emergency_week' and s.ref = r.week::text)
    order by r.week
  loop
    if not v_closed then
      -- The prizes of the week, which the notice mentions.
      perform public.emergency_week_close();
      v_closed := true;
    end if;
    v_notices := v_notices || jsonb_build_array(public.end_notice_emergency_week(v_week, v_user));
  end loop;

  -- Mandati the caller played a ranked match in.
  v_closed := false;
  for v_season in
    select distinct l.season from public.ranked_ledger l
    where l.user_id = v_user and l.reason = 'match'
      -- A Mandato that ended inside the window was played at most a month before it.
      and l.created_at > v_since - interval '32 days'
      and l.season < public.ranked_current_season()
      and public.ranked_season_ends_at(l.season) > v_since
      and not exists (select 1 from public.end_notices_seen s
                      where s.user_id = v_user and s.kind = 'ranked_season' and s.ref = l.season)
    order by 1
  loop
    if not v_closed then
      perform public.ranked_close_seasons();
      v_closed := true;
    end if;
    if exists (select 1 from public.ranked_season_results r where r.season = v_season and r.user_id = v_user) then
      v_notices := v_notices || jsonb_build_array(public.end_notice_ranked_season(v_season, v_user));
    end if;
  end loop;

  return coalesce((
    select jsonb_agg(n order by (n ->> 'ends_at')::timestamptz, n ->> 'id')
    from jsonb_array_elements(v_notices) n
  ), '[]'::jsonb);
end;
$$;

-- The caller has been shown a notice: it does not come back, on this device or another.
create function public.mark_end_notice_seen(p_kind text, p_ref text)
returns void
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
  if p_kind is null or p_kind not in ('event', 'challenge', 'emergency_week', 'ranked_season')
     or p_ref is null or char_length(p_ref) not between 1 and 64 then
    raise exception 'end_notice_invalid';
  end if;
  insert into public.end_notices_seen (user_id, kind, ref) values (v_user, p_kind, p_ref)
  on conflict do nothing;
end;
$$;

revoke execute on function public.get_end_notices() from public, anon;
revoke execute on function public.mark_end_notice_seen(text, text) from public, anon;
grant execute on function public.get_end_notices() to authenticated;
grant execute on function public.mark_end_notice_seen(text, text) to authenticated;
