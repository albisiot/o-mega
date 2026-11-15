-- Integration test for the Classifiche (SPEC §8.6): leaderboard points per match
-- (difficulty weights, draws, forfeits, the Story, the bot cap, the same-opponent
-- limit), the rankings and their periods, the caller's places, and the weekly titles.
-- Service-only functions are called as the database owner. Runs inside a
-- rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000001a1', 'authenticated', 'authenticated', 'lb-a@example.test', '{"full_name": "Classifica A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000001a2', 'authenticated', 'authenticated', 'lb-b@example.test', '{"full_name": "Classifica B"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000001a1", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000001a2", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- Known values, whatever the live ones are.
update public.game_config set value = '10' where key = 'leaderboards.bot_daily_cap';
update public.game_config set value = '3' where key = 'leaderboards.same_opponent_daily';

-- Matches end through finish_match, as in the game.
create function pg_temp.finish(p_mode text, p_format text, p_difficulty text, p_b uuid, p_result text, p_reason text,
                               p_story uuid default null)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into public.matches (mode, format, bot_difficulty, player_a, player_b, threat_ids, threat_levels, story_mission_id)
  values (p_mode, p_format, p_difficulty, '00000000-0000-4000-8000-0000000001a1', p_b, '{}', '{}', p_story)
  returning id into v_id;
  perform public.finish_match(v_id, p_result, p_reason);
  return v_id;
end;
$$;

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000001a1';
  v_b uuid := '00000000-0000-4000-8000-0000000001a2';
  v_id uuid;
  v_row public.matches;
begin
  -- Against bots: weights by difficulty, a draw half, a loss 0.
  v_id := pg_temp.finish('bot', 'classic', 'easy', null, 'a', 'completed');
  assert (select points = 1 and board = 'classic' and outcome = 'win' and day = public.game_day()
          from public.leaderboard_points where match_id = v_id), 'easy win';
  v_id := pg_temp.finish('bot', 'classic', 'hard', null, 'a', 'completed');
  assert (select points = 4 from public.leaderboard_points where match_id = v_id), 'hard win';
  v_id := pg_temp.finish('bot', 'classic', 'super_pro', null, 'draw', 'completed');
  assert (select points = 3 and outcome = 'draw' from public.leaderboard_points where match_id = v_id), 'super pro draw';
  v_id := pg_temp.finish('bot', 'classic', 'medium', null, 'b', 'completed');
  assert (select points = 0 and outcome = 'loss' from public.leaderboard_points where match_id = v_id), 'loss';

  -- Abandoned matches and Story missions give nothing.
  v_id := pg_temp.finish('bot', 'classic', 'hard', null, 'a', 'forfeit');
  assert not exists (select 1 from public.leaderboard_points where match_id = v_id), 'forfeit counted';
  v_id := pg_temp.finish('bot', 'classic', 'easy', null, 'a', 'completed', (select id from public.story_missions limit 1));
  assert not exists (select 1 from public.leaderboard_points where match_id = v_id), 'story counted';

  -- The bot cap (10 today): 8 so far, a Super Pro win gives the 2 left, the next nothing.
  v_id := pg_temp.finish('bot', 'triple', 'super_pro', null, 'a', 'completed');
  assert (select points = 2 and board = 'triple' from public.leaderboard_points where match_id = v_id), 'capped win';
  v_id := pg_temp.finish('bot', 'classic', 'super_pro', null, 'a', 'completed');
  assert (select points = 0 from public.leaderboard_points where match_id = v_id), 'over the cap';

  -- Against the same person only 3 matches a day count, losses included; the loser gets 0.
  for i in 1..4 loop
    v_id := pg_temp.finish('friendly', 'triple', null, v_b, 'a', 'completed');
    assert (select points = case when i <= 3 then 10 else 0 end and opponent_id = v_b
            from public.leaderboard_points where match_id = v_id and user_id = v_a), format('person win %s', i);
    assert (select points = 0 and outcome = 'loss' from public.leaderboard_points where match_id = v_id and user_id = v_b),
      'person loss';
  end loop;

  -- Conquista has its own board. The limit counts every mode: A and B already played 4
  -- times today, so a fifth match would give nothing; with the limit off it gives 10.
  update public.game_config set value = '0' where key = 'leaderboards.same_opponent_daily';
  insert into public.matches (mode, player_a, player_b, threat_ids, threat_levels, status, result, end_reason, finished_at)
  values ('conquest', v_b, v_a, '{}', '{}', 'finished', 'a', 'completed', now())
  returning * into v_row;
  perform public.leaderboard_record_match(v_row);
  assert (select points = 10 and board = 'conquest' from public.leaderboard_points where match_id = v_row.id and user_id = v_b),
    'conquest win';

  -- What A earned today, for the Generale board below (the player cannot read matches).
  perform set_config('test.xp_today', (
    select sum(coalesce(case when m.player_a = v_a then m.reward_xp_a else m.reward_xp_b end, 0))::text
    from public.matches m where v_a in (m.player_a, m.player_b) and m.status = 'finished'
  ), true);
end $$;

-- What a player sees.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000001a1", "role": "authenticated"}', true);

do $$
declare
  v_board jsonb;
  v_me jsonb;
  v_places jsonb;
  v_failed boolean;
begin
  -- Classica this week: 1 + 4 + 3 + 0 (cap reached) from the bots.
  v_board := public.get_leaderboard('classic', 'week');
  v_me := v_board -> 'me';
  assert (v_me ->> 'value')::numeric = 8, format('classic value %s', v_me);
  assert (v_me -> 'detail' ->> 'wins')::integer = 3 and (v_me -> 'detail' ->> 'played')::integer = 5, format('classic detail %s', v_me);
  assert (v_me ->> 'is_me')::boolean and v_me ->> 'username' is not null, 'me entry';
  assert extract(isodow from (v_board ->> 'from')::date) = 1, 'week start';
  assert jsonb_array_length(v_board -> 'top') between 1 and 10, 'top size';
  assert not (v_me ? 'user_id'), 'user id shown';

  -- Allarme Triplo: 2 from the bot and 30 from the person.
  assert (public.get_leaderboard('triple', 'all') -> 'me' ->> 'value')::numeric = 32, 'triple all';
  -- B lost every match: not on the board.
  perform set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000001a2", "role": "authenticated"}', true);
  assert public.get_leaderboard('triple', 'week') -> 'me' = 'null'::jsonb, 'loser ranked';
  assert (public.get_leaderboard('conquest', 'week') -> 'me' ->> 'value')::numeric = 10, 'conquest board';
  perform set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000001a1", "role": "authenticated"}', true);

  -- Generale of the day: the experience the matches paid today.
  assert (public.get_leaderboard('general', 'day') -> 'me' ->> 'value')::numeric = current_setting('test.xp_today')::numeric,
    'general day';
  assert (public.get_leaderboard('general', 'all') -> 'me' -> 'detail' ->> 'level') is not null, 'general level';
  perform public.get_leaderboard('emergency', 'day');
  perform public.get_leaderboard('emergency', 'week');
  perform public.get_leaderboard('story', 'all');

  -- Periods a board does not have, and boards that do not exist.
  foreach v_board in array array['["story", "week"]', '["classic", "day"]', '["quadrant", "month"]', '["nope", "all"]']::jsonb[] loop
    v_failed := false;
    begin
      perform public.get_leaderboard(v_board ->> 0, v_board ->> 1);
    exception when others then
      v_failed := sqlerrm in ('leaderboard_period_invalid', 'leaderboard_unknown');
    end;
    assert v_failed, format('accepted %s', v_board);
  end loop;

  -- The caller's places.
  v_places := public.get_my_leaderboard_places();
  assert exists (select 1 from jsonb_array_elements(v_places) p
                 where p ->> 'board' = 'triple' and p ->> 'period' = 'week' and (p ->> 'rank')::integer >= 1), 'places';
  assert not exists (select 1 from jsonb_array_elements(v_places) p where p ->> 'board' = 'conquest'), 'conquest place';

  -- The ledger and the internal functions stay closed.
  begin
    perform 1 from public.leaderboard_points;
    raise exception 'ASSERT: a player read the ledger';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.leaderboard_rows('classic', '-infinity'::date, current_date);
    raise exception 'ASSERT: a player called an internal function';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.leaderboard_close_week();
    raise exception 'ASSERT: a player closed a week';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

-- Weekly titles: last week's first gets a title, a banner, and loses it when it runs out.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000001a1';
  v_week date := public.game_week(public.game_day()) - 7;
  v_match uuid := (select match_id from public.leaderboard_points where user_id = v_a and board = 'classic' limit 1);
begin
  -- Last week not closed yet, and A far ahead of anyone on the Quadrante board in it
  -- (one of A's rows moved there: the ledger needs a real match).
  delete from public.leaderboard_awards where week = v_week;
  delete from public.leaderboard_weeks where week = v_week;
  update public.leaderboard_points set board = 'quadrant', points = 9999, day = v_week + 2
  where match_id = v_match and user_id = v_a;
end $$;

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000001a1';
  v_week date := public.game_week(public.game_day()) - 7;
  v_award public.leaderboard_awards;
begin
  assert (select title is null from public.profiles where id = v_a), 'title before';
  perform public.leaderboard_close_week();
  select * into v_award from public.leaderboard_awards where week = v_week and board = 'quadrant';
  assert v_award.user_id = v_a and v_award.title = 'Campione di Quadrante', format('award %s', v_award);
  assert v_award.expires_at = ((v_week + 14)::timestamp at time zone public.config_text('time.daily_reset_time_zone')), 'expiry';
  assert (select title = 'Campione di Quadrante' from public.profiles where id = v_a), 'title shown';
  assert exists (select 1 from public.player_notifications where user_id = v_a and kind = 'leaderboard'), 'banner';

  -- A second call closes nothing again.
  perform public.leaderboard_close_week();
  assert (select count(*) = 1 from public.leaderboard_awards where week = v_week and board = 'quadrant'), 'closed twice';
end $$;

-- The player picks the weekly title like an impresa's, and nobody else can.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000001a1", "role": "authenticated"}', true);
do $$
declare
  v_titles jsonb := public.get_leaderboard_titles();
  v_id uuid := (v_titles -> 0 ->> 'id')::uuid;
begin
  assert jsonb_array_length(v_titles) = 1 and v_titles -> 0 ->> 'board' = 'quadrant', format('titles %s', v_titles);
  assert public.set_player_title(null) is null, 'title off';
  assert public.set_player_title(v_id) = 'Campione di Quadrante', 'title on';
  perform set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000001a2", "role": "authenticated"}', true);
  begin
    perform public.set_player_title(v_id);
    raise exception 'ASSERT: another player took the title';
  exception when others then
    assert sqlerrm = 'title_not_available', sqlerrm;
  end;
end $$;
reset role;

-- Run out: the title goes from the profile and from the choice.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000001a1';
begin
  update public.leaderboard_awards set expires_at = now() - interval '1 second' where user_id = v_a;
  perform public.leaderboard_close_week();
  assert (select title is null from public.profiles where id = v_a), 'expired title kept';
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000001a1", "role": "authenticated"}', true);
do $$
begin
  assert public.get_leaderboard_titles() = '[]'::jsonb, 'expired title listed';
end $$;
reset role;

rollback;
