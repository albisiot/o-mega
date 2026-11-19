-- Integration test for the end notices (SPEC §11.7): what ended in the window and the player
-- took part in comes back with the result and the final leaderboard the player may see,
-- once per player (end_notices_seen), the oldest end first; nothing for those who did not
-- take part, for what was switched off or ended long ago. Runs inside a rolled-back
-- transaction:
--   npm run test:db

begin;

-- Known values, whatever an admin set: a window long enough for last month's Mandato, one
-- player per leaderboard so the caller's own place shows below it.
update public.game_config c set value = to_jsonb(d.value)
from (values
  ('end_notices.within_days', 30),
  ('end_notices.board_size', 1),
  ('emergency_week.prizes.min_passed', 1),
  ('emergency_week.prizes.rank1_coins', 100),
  ('emergency_week.prizes.rank1_packs', 2)
) as d(key, value)
where c.key = d.key;
update public.game_config set value = '"completed"' where key = 'events.leaderboard_visibility';

insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000005a1', 'authenticated', 'authenticated', 'end-a@example.test', now(), now()),
  ('00000000-0000-4000-8000-0000000005a2', 'authenticated', 'authenticated', 'end-b@example.test', now(), now()),
  ('00000000-0000-4000-8000-0000000005a3', 'authenticated', 'authenticated', 'end-c@example.test', now(), now()),
  ('00000000-0000-4000-8000-0000000005a4', 'authenticated', 'authenticated', 'end-d@example.test', now(), now());
insert into public.profiles (id, username) values
  ('00000000-0000-4000-8000-0000000005a1', 'end_user_a'),
  ('00000000-0000-4000-8000-0000000005a2', 'end_user_b'),
  ('00000000-0000-4000-8000-0000000005a3', 'end_user_c'),
  ('00000000-0000-4000-8000-0000000005a4', 'end_user_d');

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000005a1';
  v_b uuid := '00000000-0000-4000-8000-0000000005a2';
  v_c uuid := '00000000-0000-4000-8000-0000000005a3';
  v_week date := public.game_week(public.game_day()) - 7;
  v_season text := public.ranked_season_of((public.game_day() - interval '1 month')::date);
  v_matches uuid[] := (select array_agg(s.id) from (select id from public.matches order by created_at limit 3) s);
begin
  -- Events: one over yesterday (A completed it, B has a few points), one over long ago, one
  -- switched off, one still running.
  insert into public.events (id, title, starts_at, ends_at, points, is_active) values
    ('00000000-0000-4000-8000-0000000005e1', 'Evento finito', now() - interval '5 days', now() - interval '1 day', '{}', true),
    ('00000000-0000-4000-8000-0000000005e2', 'Evento vecchio', now() - interval '50 days', now() - interval '40 days', '{}', true),
    ('00000000-0000-4000-8000-0000000005e3', 'Evento spento', now() - interval '5 days', now() - interval '1 day', '{}', false),
    ('00000000-0000-4000-8000-0000000005e4', 'Evento in corso', now() - interval '1 day', now() + interval '1 day', '{}', true);
  insert into public.event_tiers (event_id, tier, points, coins) values
    ('00000000-0000-4000-8000-0000000005e1', 1, 10, 5),
    ('00000000-0000-4000-8000-0000000005e1', 2, 20, 5);
  insert into public.event_points (event_id, user_id, kind, outcome, ref_id, points, created_at) values
    ('00000000-0000-4000-8000-0000000005e1', v_a, 'bot', 'win', gen_random_uuid(), 30, now() - interval '2 days'),
    ('00000000-0000-4000-8000-0000000005e1', v_b, 'bot', 'win', gen_random_uuid(), 5, now() - interval '2 days'),
    ('00000000-0000-4000-8000-0000000005e2', v_a, 'bot', 'win', gen_random_uuid(), 5, now() - interval '45 days'),
    ('00000000-0000-4000-8000-0000000005e3', v_a, 'bot', 'win', gen_random_uuid(), 5, now() - interval '2 days'),
    ('00000000-0000-4000-8000-0000000005e4', v_a, 'bot', 'win', gen_random_uuid(), 5, now());
  insert into public.event_rewards (event_id, tier, user_id, coins, packs) values
    ('00000000-0000-4000-8000-0000000005e1', 1, v_a, 5, 0),
    ('00000000-0000-4000-8000-0000000005e1', 2, v_a, 5, 0);

  -- Sfide a tema (Emergenza): one with a leaderboard over two days ago (A and C finished, B
  -- did not), one without over yesterday (C).
  insert into public.challenges (id, title, color, format, bot_difficulties, rules, starts_at, ends_at,
                                 emergency_threats, leaderboard) values
    ('00000000-0000-4000-8000-0000000005c1', 'Sfida finita', '#ffcc00', 'emergency', '{}', '{}',
     now() - interval '6 days', now() - interval '2 days', 10, true),
    ('00000000-0000-4000-8000-0000000005c2', 'Sfida senza classifica', '#ffcc00', 'emergency', '{}', '{}',
     now() - interval '6 days', now() - interval '1 day', 8, false);
  insert into public.challenge_emergency_runs (user_id, challenge_id, card_instance_ids, definition_ids, status, passed,
                                               total_score, finished_at) values
    (v_a, '00000000-0000-4000-8000-0000000005c1', '{}', '{}', 'finished', 8, 200, now() - interval '3 days'),
    (v_b, '00000000-0000-4000-8000-0000000005c1', '{}', '{}', 'active', 3, 60, null),
    (v_c, '00000000-0000-4000-8000-0000000005c1', '{}', '{}', 'finished', 5, 120, now() - interval '3 days'),
    (v_c, '00000000-0000-4000-8000-0000000005c2', '{}', '{}', 'finished', 4, 90, now() - interval '3 days');

  -- Last week's Emergenza: B first, A second, C never finished. Runs already there would
  -- change the counts.
  delete from public.emergency_week_prizes where week = v_week;
  delete from public.emergency_week_prize_weeks where week = v_week;
  delete from public.emergency_week_plays where run_id in (select id from public.emergency_week_runs where week = v_week);
  delete from public.emergency_week_runs where week = v_week;
  delete from public.emergency_weeks where week = v_week;
  insert into public.emergency_weeks (week, threat_ids, threat_levels) values (v_week, '{}', '{}');
  insert into public.emergency_week_runs (user_id, week, card_instance_ids, definition_ids, status, passed, failed,
                                          total_score, finished_at) values
    (v_a, v_week, '{}', '{}', 'finished', 7, 3, 200, now() - interval '5 days'),
    (v_b, v_week, '{}', '{}', 'finished', 9, 1, 250, now() - interval '6 days'),
    (v_c, v_week, '{}', '{}', 'active', 2, 0, 40, null);

  -- Last month's Mandato: A ahead of B.
  delete from public.ranked_season_results where season = v_season;
  delete from public.ranked_seasons where season = v_season;
  insert into public.ranked_ledger (user_id, season, reason, match_id, format, outcome, delta, fama_after, created_at) values
    (v_a, v_season, 'match', v_matches[1], 'classic', 'win', 25, 25, public.ranked_season_ends_at(v_season) - interval '3 days'),
    (v_a, v_season, 'match', v_matches[2], 'classic', 'win', 25, 50, public.ranked_season_ends_at(v_season) - interval '2 days'),
    (v_b, v_season, 'match', v_matches[3], 'classic', 'win', 25, 25, public.ranked_season_ends_at(v_season) - interval '2 days');
end $$;

-- A: everything, the oldest end first.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000005a1", "role": "authenticated"}', true);

do $$
declare
  v_notices jsonb := public.get_end_notices();
  v_event jsonb := (select n from jsonb_array_elements(v_notices) n where n ->> 'kind' = 'event');
  v_challenge jsonb := (select n from jsonb_array_elements(v_notices) n where n ->> 'kind' = 'challenge');
  v_week jsonb := (select n from jsonb_array_elements(v_notices) n where n ->> 'kind' = 'emergency_week');
  v_ranked jsonb := (select n from jsonb_array_elements(v_notices) n where n ->> 'kind' = 'ranked_season');
  v_failed boolean;
begin
  assert jsonb_array_length(v_notices) = 4, format('four notices: %s', v_notices);
  assert (select bool_and((v_notices -> i ->> 'ends_at')::timestamptz <= (v_notices -> (i + 1) ->> 'ends_at')::timestamptz)
          from generate_series(0, 2) i), 'oldest end first';

  -- The event: completed, so the place and the leaderboard.
  assert v_event ->> 'id' = 'event:00000000-0000-4000-8000-0000000005e1', 'the event that ended in the window';
  assert (v_event ->> 'rank')::integer = 1 and (v_event ->> 'players')::integer = 2, 'event place';
  assert (v_event -> 'result' ->> 'points')::integer = 30 and (v_event -> 'result' ->> 'steps')::integer = 2
     and (v_event -> 'result' ->> 'tiers')::integer = 2, 'event result';
  assert jsonb_array_length(v_event -> 'board' -> 'top') = 1 and (v_event -> 'board' -> 'top' -> 0 ->> 'is_me')::boolean
     and (v_event -> 'board' -> 'top' -> 0 ->> 'value')::integer = 30, 'event board, cut to its size';
  assert not (v_event ->> 'board_locked')::boolean, 'not locked';

  -- The challenge: the run and the place.
  assert (v_challenge ->> 'rank')::integer = 1 and (v_challenge ->> 'players')::integer = 2, 'challenge place';
  assert (v_challenge -> 'result' ->> 'wins')::integer = 8 and (v_challenge -> 'result' ->> 'score')::integer = 200
     and (v_challenge -> 'result' ->> 'finished')::boolean and (v_challenge -> 'result' ->> 'threats')::integer = 10,
     'challenge run';
  assert v_challenge ->> 'color' = '#ffcc00', 'its colour';

  -- The week: second, below the top, without a prize row of their own beyond the second place.
  assert (v_week ->> 'rank')::integer = 2 and (v_week ->> 'players')::integer = 2, 'week place';
  assert v_week -> 'board' -> 'top' -> 0 ->> 'username' = 'end_user_b', 'the first of the week';
  assert (v_week -> 'board' -> 'me' ->> 'rank')::integer = 2 and (v_week -> 'board' -> 'me' ->> 'value2')::integer = 200,
     'own place below the list';
  assert (v_week -> 'result' ->> 'passed')::integer = 7 and (v_week -> 'result' ->> 'finished')::boolean, 'week run';

  -- The Mandato: first, with the Fama.
  assert (v_ranked ->> 'rank')::integer = 1 and (v_ranked ->> 'players')::integer = 2, 'Mandato place';
  assert (v_ranked -> 'result' ->> 'fama')::integer = 50 and v_ranked -> 'result' ->> 'league' = 'recluta', 'Mandato Fama';
  assert v_ranked ->> 'title' like 'Mandato di %', 'Mandato title';

  -- Asking again changes nothing; once marked, a notice does not come back.
  assert public.get_end_notices() = v_notices, 'same notices again';
  perform public.mark_end_notice_seen('event', '00000000-0000-4000-8000-0000000005e1');
  perform public.mark_end_notice_seen('event', '00000000-0000-4000-8000-0000000005e1');
  assert jsonb_array_length(public.get_end_notices()) = 3, 'the event is seen';
  assert not exists (select 1 from jsonb_array_elements(public.get_end_notices()) n where n ->> 'kind' = 'event'), 'event gone';

  begin
    perform public.mark_end_notice_seen('leaderboard', 'x');
    v_failed := false;
  exception when others then
    v_failed := sqlerrm = 'end_notice_invalid';
  end;
  assert v_failed, 'an unknown kind is refused';

  begin
    perform 1 from public.end_notices_seen;
    v_failed := false;
  exception when insufficient_privilege then
    v_failed := true;
  end;
  assert v_failed, 'a player reads no table';
end $$;

-- B: the event without the leaderboard (not completed), the challenge run not finished, the
-- week won with its prize.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000005a2", "role": "authenticated"}', true);

do $$
declare
  v_notices jsonb := public.get_end_notices();
  v_event jsonb := (select n from jsonb_array_elements(v_notices) n where n ->> 'kind' = 'event');
  v_challenge jsonb := (select n from jsonb_array_elements(v_notices) n where n ->> 'kind' = 'challenge');
  v_week jsonb := (select n from jsonb_array_elements(v_notices) n where n ->> 'kind' = 'emergency_week');
begin
  assert jsonb_array_length(v_notices) = 4, format('four notices for B: %s', v_notices);
  assert v_event -> 'board' = 'null'::jsonb and v_event -> 'rank' = 'null'::jsonb
     and (v_event ->> 'board_locked')::boolean, 'event leaderboard locked';
  assert (v_event -> 'result' ->> 'points')::integer = 5 and (v_event -> 'result' ->> 'steps')::integer = 0, 'event points';
  assert v_challenge -> 'rank' = 'null'::jsonb and not (v_challenge -> 'result' ->> 'finished')::boolean
     and (v_challenge -> 'result' ->> 'wins')::integer = 3, 'run not finished: no place';
  assert (v_challenge -> 'board' ->> 'players')::integer = 2 and v_challenge -> 'board' -> 'me' = 'null'::jsonb,
     'the leaderboard without B';
  assert (v_week ->> 'rank')::integer = 1 and (v_week -> 'result' ->> 'prize_coins')::integer = 100
     and (v_week -> 'result' ->> 'prize_packs')::integer = 2 and not (v_week -> 'result' ->> 'prize_claimed')::boolean,
     'week prize';
end $$;

-- C: both challenges (one without a leaderboard), the week not finished; no Mandato.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000005a3", "role": "authenticated"}', true);

do $$
declare
  v_notices jsonb := public.get_end_notices();
  v_plain jsonb := (select n from jsonb_array_elements(v_notices) n where n ->> 'ref' = '00000000-0000-4000-8000-0000000005c2');
  v_ranked jsonb := (select n from jsonb_array_elements(v_notices) n where n ->> 'ref' = '00000000-0000-4000-8000-0000000005c1');
  v_week jsonb := (select n from jsonb_array_elements(v_notices) n where n ->> 'kind' = 'emergency_week');
begin
  assert jsonb_array_length(v_notices) = 3, format('three notices for C: %s', v_notices);
  assert v_plain -> 'board' = 'null'::jsonb and v_plain -> 'rank' = 'null'::jsonb
     and (v_plain -> 'result' ->> 'wins')::integer = 4 and (v_plain -> 'result' ->> 'threats')::integer = 8,
     'no leaderboard: only the run';
  assert (v_ranked ->> 'rank')::integer = 2 and (v_ranked -> 'board' -> 'me' ->> 'rank')::integer = 2, 'second';
  assert v_week -> 'rank' = 'null'::jsonb and not (v_week -> 'result' ->> 'finished')::boolean
     and (v_week -> 'board' ->> 'players')::integer = 2, 'run not finished: the leaderboard without C';
end $$;

-- D took part in nothing.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000005a4", "role": "authenticated"}', true);

do $$
begin
  assert public.get_end_notices() = '[]'::jsonb, 'nothing for who did not play';
end $$;

reset role;

-- The Mandato was closed with its results, without the «Mandato concluso!» banner: the notice tells it.
do $$
begin
  assert exists (select 1 from public.ranked_season_results where user_id = '00000000-0000-4000-8000-0000000005a1'),
    'Mandato closed';
  assert not exists (select 1 from public.player_notifications
                     where user_id in ('00000000-0000-4000-8000-0000000005a1', '00000000-0000-4000-8000-0000000005a2')
                       and kind = 'ranked'), 'no Mandato banner';
end $$;

rollback;
