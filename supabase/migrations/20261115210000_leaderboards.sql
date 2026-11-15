-- Classifiche (SPEC §8.6): global leaderboards for every mode, by week and of all time
-- (and of the day for Emergenza and Generale), with a weekly title for the first of each.
--
-- Match modes rank by leaderboard points, written once per player when a match ends
-- (leaderboard_points, a ledger like event_points): a win against a person 10, against a
-- bot by difficulty 6/4/2/1, a draw half, a loss 0. Abandoned matches and Story missions
-- give none. Bot points have a daily cap; against the same person only the first matches
-- of the day count. Emergenza, Generale and Storia read what the server already keeps.

insert into public.game_config (key, value, description) values
  ('leaderboards.size', '10', 'Players shown in a leaderboard; the caller''s own place is shown below when lower'),
  ('leaderboards.points.person', '10', 'Leaderboard points for a win against a person (a draw gives half)'),
  ('leaderboards.points.super_pro', '6', 'Leaderboard points for a win against a Super Pro bot (a draw gives half)'),
  ('leaderboards.points.hard', '4', 'Leaderboard points for a win against a Difficile bot (a draw gives half)'),
  ('leaderboards.points.medium', '2', 'Leaderboard points for a win against a Medio bot (a draw gives half)'),
  ('leaderboards.points.easy', '1', 'Leaderboard points for a win against a Facile bot (a draw gives half)'),
  ('leaderboards.bot_daily_cap', '40', 'Leaderboard points a player can earn from bots in a game day, all modes together (0 = no cap)'),
  ('leaderboards.same_opponent_daily', '3', 'Matches against the same person that give leaderboard points in a game day (0 = no limit)'),
  ('leaderboards.min_matches_for_rate', '10', 'Matches a player needs in a leaderboard before their win rate shows');

-- The Monday a game day belongs to: weeks start at midnight Europe/Rome on Monday.
create function public.game_week(p_day date)
returns date
language sql
immutable
set search_path = ''
as $$
  select p_day - (extract(isodow from p_day)::integer - 1)
$$;

-- Finished matches by time, for the weekly and daily experience of the Generale board.
create index matches_finished_at_idx on public.matches (finished_at) where status = 'finished';

-- ---------------------------------------------------------------------------
-- Ledger of leaderboard points: one row per player of every match that ended
-- normally (also with 0 points: the same-opponent limit counts matches).
-- ---------------------------------------------------------------------------

create table public.leaderboard_points (
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  board text not null check (board in ('classic', 'boss', 'triple', 'quadrant', 'conquest')),
  -- The other player, or null against a bot.
  opponent_id uuid references public.profiles (id) on delete set null,
  bot_difficulty text check (bot_difficulty in ('easy', 'medium', 'hard', 'super_pro')),
  outcome text not null check (outcome in ('win', 'draw', 'loss')),
  points numeric(6, 1) not null check (points >= 0),
  day date not null,
  earned_at timestamptz not null,
  primary key (match_id, user_id)
);

create index leaderboard_points_board_day_idx on public.leaderboard_points (board, day);
create index leaderboard_points_user_day_idx on public.leaderboard_points (user_id, day);

-- No policies: players read the rankings through get_leaderboard only.
alter table public.leaderboard_points enable row level security;
revoke all on table public.leaderboard_points from anon, authenticated;

-- Writes the rows of a finished match. Points are fixed when the match ends: a later
-- change of the values counts from the next match.
create function public.leaderboard_record_match(p_match public.matches)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_board text;
  v_day date;
  v_side text;
  v_user uuid;
  v_opponent uuid;
  v_outcome text;
  v_base numeric;
  v_points numeric;
  v_limit integer;
  v_used numeric;
  v_count integer;
begin
  -- Abandoned matches count for nobody, as in events and Imprese; the Story has its own board.
  if p_match.status <> 'finished' or p_match.end_reason is distinct from 'completed'
     or p_match.story_mission_id is not null then
    return;
  end if;
  v_board := case
    when p_match.mode = 'conquest' then 'conquest'
    when p_match.format in ('quadrant', 'quadrant_shifting') then 'quadrant'
    else p_match.format
  end;
  -- A future format has no board until a migration gives it one.
  if v_board not in ('classic', 'boss', 'triple', 'quadrant', 'conquest') then
    return;
  end if;
  v_day := public.game_day(p_match.finished_at);

  foreach v_side in array array['a', 'b'] loop
    v_user := case v_side when 'a' then p_match.player_a else p_match.player_b end;
    continue when v_user is null; -- a bot
    v_opponent := case v_side when 'a' then p_match.player_b else p_match.player_a end;
    v_outcome := case when p_match.result = v_side then 'win' when p_match.result = 'draw' then 'draw' else 'loss' end;
    v_base := public.config_int(
      'leaderboards.points.' || case when p_match.bot_difficulty is null then 'person' else p_match.bot_difficulty end
    );
    v_points := case v_outcome when 'win' then v_base when 'draw' then v_base / 2 else 0 end;

    if p_match.bot_difficulty is not null then
      -- Bots can be played without end: only so many points a day come from them.
      v_limit := public.config_int('leaderboards.bot_daily_cap');
      if v_limit > 0 and v_points > 0 then
        select coalesce(sum(lp.points), 0) into v_used from public.leaderboard_points lp
        where lp.user_id = v_user and lp.day = v_day and lp.bot_difficulty is not null;
        v_points := greatest(0, least(v_points, v_limit - v_used));
      end if;
    elsif v_opponent is not null then
      -- Two friends playing on and on: only the first matches of the day count.
      v_limit := public.config_int('leaderboards.same_opponent_daily');
      if v_limit > 0 then
        select count(*) into v_count from public.leaderboard_points lp
        where lp.user_id = v_user and lp.opponent_id = v_opponent and lp.day = v_day;
        if v_count >= v_limit then
          v_points := 0;
        end if;
      end if;
    end if;

    insert into public.leaderboard_points
      (match_id, user_id, board, opponent_id, bot_difficulty, outcome, points, day, earned_at)
    values
      (p_match.id, v_user, v_board, v_opponent, p_match.bot_difficulty, v_outcome, v_points, v_day, p_match.finished_at)
    on conflict do nothing;
  end loop;
end;
$$;

create function public.record_match_leaderboard_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.leaderboard_record_match(new);
  return new;
end;
$$;

create trigger matches_leaderboard_points
  after update of status on public.matches
  for each row
  when (old.status = 'active' and new.status = 'finished')
  execute function public.record_match_leaderboard_points();

revoke execute on function public.leaderboard_record_match(public.matches) from public, anon, authenticated;
revoke execute on function public.record_match_leaderboard_points() from public, anon, authenticated;

-- The past counts too: every finished match, in the order they ended, so the daily
-- caps hold as they would have.
do $$
declare
  v_match public.matches;
begin
  for v_match in select m.* from public.matches m where m.status = 'finished' order by m.finished_at, m.id loop
    perform public.leaderboard_record_match(v_match);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rankings
-- ---------------------------------------------------------------------------

-- Who is where on a board between two game days (both included). Higher `value`
-- first, then higher `value2`, then whoever got there first (`reached_at`).
-- Only players with something to show. 'all' boards pass -infinity as p_from.
create function public.leaderboard_rows(p_board text, p_from date, p_to date)
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

revoke execute on function public.leaderboard_rows(text, date, date) from public, anon, authenticated;

-- The game days a period covers, for a board that has it; raises otherwise.
-- 'day' only for Emergenza and Generale, 'week' for all but Storia, 'all' for all.
create function public.leaderboard_range(p_board text, p_period text, out o_from date, out o_to date)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_today date := public.game_day();
begin
  if p_board not in ('general', 'emergency', 'classic', 'boss', 'triple', 'quadrant', 'conquest', 'story') then
    raise exception 'leaderboard_unknown';
  end if;
  if p_period = 'day' and p_board in ('general', 'emergency') then
    o_from := v_today;
  elsif p_period = 'week' and p_board <> 'story' then
    o_from := public.game_week(v_today);
  elsif p_period = 'all' then
    o_from := '-infinity'::date;
  else
    raise exception 'leaderboard_period_invalid';
  end if;
  o_to := v_today;
end;
$$;

revoke execute on function public.leaderboard_range(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Weekly titles: when a week is over, the first of each board (Storia aside)
-- gets a title until the end of the next week. Closed the first time anyone
-- opens a leaderboard, the home or the Imprese after Monday midnight.
-- ---------------------------------------------------------------------------

create table public.leaderboard_weeks (
  week date primary key,
  closed_at timestamptz not null default now()
);

create table public.leaderboard_awards (
  id uuid primary key default gen_random_uuid(),
  board text not null,
  week date not null references public.leaderboard_weeks (week),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 30),
  value numeric not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (board, week)
);

create index leaderboard_awards_user_idx on public.leaderboard_awards (user_id, expires_at);

alter table public.leaderboard_weeks enable row level security;
alter table public.leaderboard_awards enable row level security;
revoke all on table public.leaderboard_weeks, public.leaderboard_awards from anon, authenticated;

alter table public.player_notifications drop constraint player_notifications_kind_check;
alter table public.player_notifications add constraint player_notifications_kind_check
  check (kind in ('objective_completed', 'event_reward', 'achievement', 'leaderboard'));

-- The title and the name of each board with a weekly title.
create function public.leaderboard_board_title(p_board text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_board
    when 'general' then 'Campione della settimana'
    when 'emergency' then 'Campione dell''Emergenza'
    when 'classic' then 'Campione della Classica'
    when 'boss' then 'Campione di Grande Minaccia'
    when 'triple' then 'Campione di Allarme Triplo'
    when 'quadrant' then 'Campione di Quadrante'
    when 'conquest' then 'Campione di Conquista'
  end
$$;

create function public.leaderboard_board_name(p_board text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_board
    when 'general' then 'Generale'
    when 'emergency' then 'Emergenza'
    when 'classic' then 'Partita classica'
    when 'boss' then 'Grande Minaccia'
    when 'triple' then 'Allarme Triplo'
    when 'quadrant' then 'Quadrante'
    when 'conquest' then 'Conquista'
    when 'story' then 'Storia'
  end
$$;

-- Closes last week once (awards and banners) and takes off the titles that ran out.
create function public.leaderboard_close_week()
returns void
language plpgsql
volatile
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
    foreach v_board in array array['general', 'emergency', 'classic', 'boss', 'triple', 'quadrant', 'conquest'] loop
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

revoke execute on function public.leaderboard_close_week() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Player RPCs
-- ---------------------------------------------------------------------------

-- One board in one period: the first players (leaderboards.size) with avatar, title and
-- numbers, and the caller's place also when it is lower. Never teams or cards.
create function public.get_leaderboard(p_board text, p_period text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_size integer := public.config_int('leaderboards.size');
  v_range record;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_range from public.leaderboard_range(p_board, p_period);
  perform public.leaderboard_close_week();

  return (
    with ranked as (
      select
        row_number() over (order by r.value desc, r.value2 desc, r.reached_at nulls last, r.user_id) as rank,
        r.user_id, r.value, r.value2, r.detail, pr.username, pr.avatar_url, pr.title
      from public.leaderboard_rows(p_board, v_range.o_from, v_range.o_to) r
      join public.profiles pr on pr.id = r.user_id
    ),
    entries as (
      select rank, user_id, jsonb_build_object(
        'rank', rank, 'username', username, 'avatar_url', avatar_url, 'title', title,
        'value', value, 'value2', value2, 'detail', detail, 'is_me', user_id = v_user
      ) as entry
      from ranked
    )
    select jsonb_build_object(
      'board', p_board,
      'period', p_period,
      'from', case when v_range.o_from = '-infinity'::date then null else v_range.o_from end,
      'players', (select count(*) from entries),
      'min_matches_for_rate', public.config_int('leaderboards.min_matches_for_rate'),
      'top', coalesce((select jsonb_agg(e.entry order by e.rank) from entries e where e.rank <= v_size), '[]'::jsonb),
      'me', (select e.entry from entries e where e.user_id = v_user)
    )
  );
end;
$$;

-- The caller's places on every board and period where they are ranked, for the home and
-- the profile: board, period, rank, players and value.
create function public.get_my_leaderboard_places()
returns jsonb
language plpgsql
volatile
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

  foreach v_board in array array['general', 'emergency', 'classic', 'boss', 'triple', 'quadrant', 'conquest', 'story'] loop
    foreach v_period in array array['day', 'week', 'all'] loop
      continue when v_period = 'day' and v_board not in ('general', 'emergency');
      continue when v_period = 'week' and v_board = 'story';
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

-- The weekly titles the caller holds now, to choose from with the Imprese titles.
create function public.get_leaderboard_titles()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.leaderboard_close_week();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id, 'board', a.board, 'title', a.title, 'week', a.week, 'expires_at', a.expires_at
    ) order by a.week desc, a.board)
    from public.leaderboard_awards a
    where a.user_id = auth.uid() and a.expires_at > now()
  ), '[]'::jsonb);
end;
$$;

-- Shows the title of a completed impresa or of a weekly title still held (null: no title).
-- Same signature as before: the id is the impresa's or the weekly title's.
create or replace function public.set_player_title(p_achievement_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_title text;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if p_achievement_id is not null then
    select pa.title into v_title from public.player_achievements pa
    where pa.user_id = v_user and pa.achievement_id = p_achievement_id;
    if v_title is null then
      select a.title into v_title from public.leaderboard_awards a
      where a.id = p_achievement_id and a.user_id = v_user and a.expires_at > now();
    end if;
    if v_title is null then
      raise exception 'title_not_available';
    end if;
  end if;
  update public.profiles set title = v_title, updated_at = now() where id = v_user;
  return v_title;
end;
$$;

revoke execute on function public.get_leaderboard(text, text) from public, anon;
revoke execute on function public.get_my_leaderboard_places() from public, anon;
revoke execute on function public.get_leaderboard_titles() from public, anon;
grant execute on function public.get_leaderboard(text, text) to authenticated;
grant execute on function public.get_my_leaderboard_places() to authenticated;
grant execute on function public.get_leaderboard_titles() to authenticated;
