-- Integration test for the Classificata (SPEC §8.7): the Fama rule, the queue
-- with the server's opponent after the wait, how that opponent looks to the
-- player (payload, ping, history, title), the Fama of finished matches (wins,
-- Recluta, floors, abandons, two people, the same-opponent limit), no points on
-- the boards of §8.6, the Albo, the close of a Mandato with its prize and title,
-- and the reserved names. Service-only functions are called as the database
-- owner. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000002a1', 'authenticated', 'authenticated', 'rk-a@example.test', '{"full_name": "Classificata A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000002a2', 'authenticated', 'authenticated', 'rk-b@example.test', '{"full_name": "Classificata B"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000002a1", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000002a2", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- Known values, whatever the live ones are.
update public.game_config set value = '25' where key = 'ranked.win_points';
update public.game_config set value = '20' where key = 'ranked.loss_points';
update public.game_config set value = '20' where key = 'ranked.fama_per_point';
update public.game_config set value = '10' where key = 'ranked.win_min';
update public.game_config set value = '40' where key = 'ranked.win_max';
update public.game_config set value = '5' where key = 'ranked.loss_min';
update public.game_config set value = '35' where key = 'ranked.loss_max';
update public.game_config set value = '3' where key = 'ranked.streak_from';
update public.game_config set value = '5' where key = 'ranked.streak_bonus';
update public.game_config set value = '300' where key = 'ranked.no_loss_below';
update public.game_config set value = '1200' where key = 'ranked.floors_below';
update public.game_config set value = '2' where key = 'ranked.same_opponent_daily';
update public.game_config set value = '1' where key = 'ranked.season.min_matches';
update public.game_config set value = '25' where key = 'ranked.season.rewards.recluta.coins';
update public.game_config set value = '50' where key = 'ranked.season.rewards.vigilante.coins';
update public.game_config set value = '0' where key = 'ranked.season.rewards.vigilante.packs';

-- The Fama rule (the same as packages/game-engine ranked.ts).
do $$
begin
  assert public.ranked_fama_change(1500, 1500, 'win', 0) = 25, 'win against the same Fama';
  assert public.ranked_fama_change(1500, 1500, 'loss', 0) = -20, 'loss against the same Fama';
  assert public.ranked_fama_change(1500, 1500, 'draw', 0) = 0, 'draw';
  assert public.ranked_fama_change(1500, 1700, 'win', 0) = 35, 'win against a stronger one';
  assert public.ranked_fama_change(1500, 1700, 'loss', 0) = -10, 'loss against a stronger one';
  assert public.ranked_fama_change(1500, 1300, 'loss', 0) = -30, 'loss against a weaker one';
  assert public.ranked_fama_change(1500, 0, 'win', 0) = 10, 'win limit';
  assert public.ranked_fama_change(1500, 3000, 'loss', 0) = -5, 'loss limit';
  assert public.ranked_fama_change(1500, 1500, 'win', 2) = 30, 'third win in a row';
  assert public.ranked_fama_change(250, 250, 'loss', 0) = 0, 'no loss in Recluta';
  assert public.ranked_fama_change(310, 310, 'loss', 0) = -10, 'floor of Vigilante';
  assert public.ranked_fama_change(1210, 1210, 'loss', 0) = -20, 'no floor from Asso on';
  assert public.ranked_league_of(0) = 'recluta' and public.ranked_league_of(300) = 'vigilante'
     and public.ranked_league_of(1799) = 'asso' and public.ranked_league_of(2500) = 'omega', 'leagues';
  assert public.ranked_next_league_at(450) = 700 and public.ranked_next_league_at(2600) is null, 'next league';
  assert public.ranked_reset_fama(600) = 600 and public.ranked_reset_fama(2500) = 1600, 'reset of a new Mandato';
  assert public.ranked_season_label('2026-11') = 'novembre 2026', 'Mandato label';
end $$;

create function pg_temp.team(p_user uuid, p_size integer) returns uuid[] language sql as $$
  select array_agg(s.id) from (
    select distinct on (i.definition_id) i.id from public.card_instances i
    where i.owner_id = p_user order by i.definition_id, i.id limit p_size
  ) s
$$;

create function pg_temp.bot(p_size integer) returns uuid[] language sql as $$
  select array_agg(s.id) from (
    select id from public.card_definitions where is_active and rarity_code = 'delta' order by code limit p_size
  ) s
$$;

-- A whole classic match won 3-0 by p_winner. The player's choices go through
-- match_submit_play, as between players; scores are made up.
create function pg_temp.play(p_match uuid, p_winner text) returns void language plpgsql as $$
declare
  v_user uuid := (select player_a from public.matches where id = p_match);
  v_team uuid[] := (select card_instance_ids from public.match_teams where match_id = p_match and side = 'a');
  v_defs uuid[] := (select definition_ids from public.match_teams where match_id = p_match and side = 'a');
  v_bot uuid[] := (select definition_ids from public.match_teams where match_id = p_match and side = 'b');
  v_a integer := case p_winner when 'a' then 20 else 4 end;
  v_b integer := case p_winner when 'a' then 4 else 20 end;
begin
  for i in 1..3 loop
    perform public.match_submit_play(v_user, p_match, i, v_team[i]);
    perform public.match_record_round(p_match, i,
      jsonb_build_object('card_instance_id', v_team[i], 'definition_id', v_defs[i],
        'base', v_a, 'bonus', 0, 'score', v_a, 'highest', 10, 'auto_played', false),
      jsonb_build_object('definition_id', v_bot[i],
        'base', v_b, 'bonus', 0, 'score', v_b, 'highest', 10, 'auto_played', false),
      p_winner, case when i = 3 then p_winner end);
  end loop;
end;
$$;

-- Through the ranked queue until the server's opponent comes.
create function pg_temp.ghost_match(p_user uuid) returns uuid language plpgsql as $$
declare
  v_team uuid[] := pg_temp.team(p_user, 5);
  v_threats uuid[] := current_setting('test.threats')::uuid[];
  v_match uuid;
begin
  v_match := public.match_queue_join(p_user, 'ranked', v_team, v_threats, 'medium', pg_temp.bot(5), 'classic');
  assert v_match is null, 'ranked: an opponent at once';
  update public.matchmaking_queue set enqueued_at = now() - interval '31 seconds' where user_id = p_user;
  v_match := public.match_queue_join(p_user, 'ranked', v_team, v_threats, 'medium', pg_temp.bot(5), 'classic');
  assert v_match is not null, 'ranked: no opponent after the wait';
  -- Known Fama for the opponent, so the changes are exact.
  update public.ranked_matches set fama_b = fama_a where match_id = v_match;
  return v_match;
end;
$$;

do $$
declare
  v_threats uuid[];
begin
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level and is_active and rarity_code is null
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;
  perform set_config('test.threats', v_threats::text, true);
end $$;

-- The Albo of the Mandato in course before the test players play: the live one
-- may already have real players, so its checks count the test players on top.
do $$
declare
  v_season text := public.ranked_current_season();
begin
  perform set_config('test.albo_players', (select count(*) from public.ranked_board_rows(v_season, null))::text, true);
  perform set_config('test.albo_classic', (select count(*) from public.ranked_board_rows(v_season, 'classic'))::text, true);
  perform set_config('test.albo_boss', (select count(*) from public.ranked_board_rows(v_season, 'boss'))::text, true);
end $$;

-- The queue, and the server's opponent as the player sees it.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000002a1';
  v_team uuid[] := pg_temp.team('00000000-0000-4000-8000-0000000002a1', 5);
  v_threats uuid[] := current_setting('test.threats')::uuid[];
  v_match uuid;
  v_state jsonb;
  v_ghost public.ranked_ghosts;
begin
  assert public.match_queue_join(v_user, 'ranked', v_team, v_threats, 'medium', pg_temp.bot(5), 'classic') is null,
    'matched before the wait';
  assert (select mode = 'ranked' and fama = 0 from public.matchmaking_queue where user_id = v_user), 'queue entry';
  assert public.match_queue_join(v_user, 'ranked', v_team, v_threats, 'medium', pg_temp.bot(5), 'classic') is null,
    'the opponent came before its time';
  update public.matchmaking_queue set enqueued_at = now() - interval '31 seconds' where user_id = v_user;
  v_match := public.match_queue_join(v_user, 'ranked', v_team, v_threats, 'medium', pg_temp.bot(5), 'classic');
  assert v_match is not null, 'no opponent after the wait';
  assert not exists (select 1 from public.matchmaking_queue where user_id = v_user), 'still queued';

  assert (select mode = 'ranked' and player_b is null and bot_difficulty is null from public.matches where id = v_match),
    'a ranked match with no second player and no difficulty';
  select g.* into v_ghost from public.ranked_ghosts g join public.ranked_matches rm on rm.ghost_id = g.id
  where rm.match_id = v_match;
  assert (select ghost_difficulty from public.ranked_matches where match_id = v_match) = 'medium', 'difficulty kept';
  assert exists (select 1 from public.ranked_ghost_turns where match_id = v_match and round = 1 and ready_at > now()),
    'first choice not planned for later';

  v_state := public.match_state_payload(v_match, 'a');
  assert v_state ->> 'mode' = 'ranked' and v_state -> 'bot_difficulty' = 'null'::jsonb, 'mode in the payload';
  assert v_state -> 'opponent' ->> 'username' = v_ghost.username, 'opponent name';
  assert (v_state -> 'opponent' ->> 'level')::integer = v_ghost.level, 'opponent level';
  assert v_state -> 'opponent' ->> 'last_seen_at' is not null, 'opponent not present';
  assert (v_state -> 'ranked' ->> 'fama')::integer = 0 and v_state -> 'ranked' -> 'delta' = 'null'::jsonb, 'ranked info';
  assert not (v_state -> 'rounds' -> 0 ->> 'opponent_has_chosen')::boolean, 'opponent chose at once';
  assert not (public.match_round_context(v_user, v_match) -> 'match' -> 'ghost' ->> 'ready')::boolean, 'context: ready at once';
  assert public.match_round_context(v_user, v_match) -> 'match' -> 'ghost' ->> 'difficulty' = 'medium', 'context: difficulty';

  update public.ranked_ghost_turns set ready_at = now() - interval '1 second' where match_id = v_match;
  assert (public.match_state_payload(v_match, 'a') -> 'rounds' -> 0 ->> 'opponent_has_chosen')::boolean, 'opponent never chose';
  assert (public.match_round_context(v_user, v_match) -> 'match' -> 'ghost' ->> 'ready')::boolean, 'context: never ready';
  assert public.achievement_match_fits('{"opponent": "player"}', (select m from public.matches m where m.id = v_match), 'a'),
    'not a match against a player for the Imprese';
  assert not public.achievement_match_fits('{"opponent": "bot"}', (select m from public.matches m where m.id = v_match), 'a'),
    'a match against a bot for the Imprese';
  perform set_config('test.match', v_match::text, true);
  perform set_config('test.ghost', v_ghost.id::text, true);
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000002a1", "role": "authenticated"}', true);
do $$
declare
  v_match uuid := current_setting('test.match')::uuid;
  v_ping jsonb := public.match_ping(current_setting('test.match')::uuid);
begin
  assert (v_ping ->> 'opponent_has_chosen')::boolean, 'ping: opponent never chose';
  assert v_ping ->> 'opponent_last_seen_at' is not null, 'ping: opponent not present';
  begin
    perform public.claim_victory(v_match);
    assert false, 'victory claimed against the server''s opponent';
  exception when others then
    assert sqlerrm = 'opponent_still_connected', sqlerrm;
  end;
end $$;
reset role;

-- An opponent's name is reserved: refused like a taken one (read as the owner,
-- since clients cannot read the opponents).
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000002a1", "role": "authenticated"}', true);
do $$
begin
  perform public.set_username((select username from public.ranked_ghosts where id = current_setting('test.ghost')::uuid));
  assert false, 'a player took an opponent''s name';
exception when others then
  assert sqlerrm = 'username_taken', sqlerrm;
end $$;

-- A win: 25 Fama, on the ledger and the total; the opponent takes the other side;
-- no points on the boards of §8.6; the player's statistics are those against people.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000002a1';
  v_match uuid := current_setting('test.match')::uuid;
  v_ghost uuid := current_setting('test.ghost')::uuid;
  v_ghost_fama integer;
  v_wins integer := (select wins from public.profiles where id = '00000000-0000-4000-8000-0000000002a1');
begin
  update public.ranked_matches set fama_b = 0 where match_id = v_match;
  update public.ranked_ghosts set fama = 100 where id = v_ghost;
  perform pg_temp.play(v_match, 'a');
  assert (select status = 'finished' and result = 'a' from public.matches where id = v_match), 'match not over';
  assert (select delta_a = 25 and delta_b = -25 from public.ranked_matches where match_id = v_match), 'Fama of the win';
  assert (select fama = 25 and wins = 1 and streak = 1 from public.ranked_players where user_id = v_user), 'running total';
  assert (select format = 'classic' and outcome = 'win' and opponent_id is null and fama_after = 25
          from public.ranked_ledger where match_id = v_match and user_id = v_user), 'ledger row';
  assert (select fama from public.ranked_ghosts where id = v_ghost) = 75, 'the opponent kept its Fama';
  assert not exists (select 1 from public.leaderboard_points where match_id = v_match), 'points on a board of §8.6';
  assert (select wins from public.profiles where id = v_user) = v_wins + 1, 'statistics against people';
  assert (public.match_state_payload(v_match, 'a') -> 'ranked' ->> 'delta')::integer = 25, 'payload: Fama moved';
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000002a1", "role": "authenticated"}', true);
do $$
declare
  v_entry jsonb := (
    select e from jsonb_array_elements(public.get_match_history(5)) e where e ->> 'id' = current_setting('test.match')
  );
begin
  assert v_entry ->> 'opponent' is not null and v_entry ->> 'mode' = 'ranked', 'history: no opponent name';
  assert (v_entry -> 'ranked' ->> 'delta')::integer = 25, 'history: Fama';
end $$;
reset role;

-- A loss in Recluta takes nothing; a loss in Vigilante stops at its start; who
-- leaves loses, against the server's opponent too.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000002a1';
  v_match uuid;
begin
  v_match := pg_temp.ghost_match(v_user);
  perform pg_temp.play(v_match, 'b');
  assert (select delta_a from public.ranked_matches where match_id = v_match) = 0, 'a loss took Fama in Recluta';
  assert (select fama = 25 and losses = 1 and streak = 0 from public.ranked_players where user_id = v_user), 'total after the loss';

  -- Vigilante: 310 Fama (a ledger row keeps the total its sum).
  insert into public.ranked_ledger (user_id, season, reason, delta, fama_after)
  values (v_user, public.ranked_current_season(), 'season_reset', 285, 310);
  update public.ranked_players set fama = 310 where user_id = v_user;

  v_match := pg_temp.ghost_match(v_user);
  update public.match_rounds set deadline_at = now() - interval '1 hour' where match_id = v_match;
  perform public.close_abandoned_matches(v_user);
  assert (select status = 'finished' and result = 'b' and end_reason = 'forfeit' from public.matches where id = v_match),
    'an abandoned match against the server''s opponent is not lost';
  assert (select delta_a from public.ranked_matches where match_id = v_match) = -10, 'the floor of Vigilante';
  assert (select fama from public.ranked_players where user_id = v_user) = 300, 'total after the abandon';
end $$;

-- Two people: paired in the ranked queue, both Fama moved; after the limit with
-- the same person, nothing more that day.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000002a1';
  v_b uuid := '00000000-0000-4000-8000-0000000002a2';
  v_threats uuid[] := current_setting('test.threats')::uuid[];
  v_match uuid;
begin
  for i in 1..3 loop
    assert public.match_queue_join(v_b, 'ranked', pg_temp.team(v_b, 5), v_threats, 'medium', pg_temp.bot(5), 'classic') is null,
      'B matched alone';
    -- Far apart in Fama: paired once either waited any_after_seconds.
    update public.matchmaking_queue set enqueued_at = now() - interval '21 seconds' where user_id = v_b;
    v_match := public.match_queue_join(v_a, 'ranked', pg_temp.team(v_a, 5), v_threats, 'medium', pg_temp.bot(5), 'classic');
    assert v_match is not null, 'two people not paired';
    assert (select mode = 'ranked' and player_a = v_b and player_b = v_a from public.matches where id = v_match), 'pair';
    assert (select ghost_id is null and fama_a = (select fama from public.ranked_players where user_id = v_b)
            from public.ranked_matches where match_id = v_match), 'ranked side of a match between people';
    perform public.finish_match(v_match, 'a', 'completed');
    if i = 1 then
      -- B (0) beats A (300): 25 + 300 / 20 = 40; A, at the start of Vigilante, loses nothing.
      assert (select delta_a = 40 and delta_b = 0 from public.ranked_matches where match_id = v_match), 'first match';
    elsif i = 3 then
      assert (select delta_a = 0 and delta_b = 0 from public.ranked_matches where match_id = v_match), 'same-opponent limit';
    end if;
  end loop;
end $$;

-- The Albo: people only, sorted by Fama. Real players may be on it too, so the
-- two test players count on top of them (the server's opponents would add more)
-- and their places are checked against each other: A (300) ahead of B (Recluta).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000002a2", "role": "authenticated"}', true);
do $$
declare
  v_board jsonb := public.get_ranked_board();
  v_place integer := (v_board -> 'me' ->> 'place')::integer;
begin
  assert v_place is not null, 'B not on the Albo';
  assert v_place > jsonb_array_length(v_board -> 'top') or (v_board -> 'top' -> (v_place - 1) ->> 'is_me')::boolean,
    'B''s row in the top';
  perform set_config('test.place_b', v_place::text, true);
end $$;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000002a1", "role": "authenticated"}', true);
do $$
declare
  v_board jsonb := public.get_ranked_board();
  v_mine jsonb := public.get_my_ranked();
  v_players integer := current_setting('test.albo_players')::integer + 2;
  v_place integer := (v_board -> 'me' ->> 'place')::integer;
  v_place_b integer := current_setting('test.place_b')::integer;
begin
  assert (v_board ->> 'current')::boolean and (v_board ->> 'players')::integer = v_players,
    'Albo players: ' || (v_board ->> 'players') || ', expected ' || v_players;
  assert (select bool_and((t.e ->> 'place')::integer = t.n
                          and (t.n = 1 or (t.e ->> 'value')::integer <= (v_board -> 'top' -> (t.n::integer - 2) ->> 'value')::integer))
          from jsonb_array_elements(v_board -> 'top') with ordinality t(e, n)), 'Albo order';
  assert v_place < v_place_b and v_place_b <= v_players, 'test players'' places: ' || v_place || ' and ' || v_place_b;
  assert v_place > jsonb_array_length(v_board -> 'top') or (v_board -> 'top' -> (v_place - 1) ->> 'is_me')::boolean,
    'my row in the top';
  assert (v_board -> 'me' ->> 'fama')::integer = 300 and v_board -> 'me' ->> 'league' = 'vigilante', 'my row';
  assert (public.get_ranked_board(null, 'classic') ->> 'players')::integer = current_setting('test.albo_classic')::integer + 2,
    'Albo of a format';
  assert (public.get_ranked_board(null, 'boss') ->> 'players')::integer = current_setting('test.albo_boss')::integer,
    'Albo of a format the test players never played';
  assert (v_mine ->> 'fama')::integer = 300 and v_mine ->> 'league' = 'vigilante' and (v_mine ->> 'next_league_at')::integer = 700,
    'my ranked';
  assert (v_mine ->> 'wins')::integer = 1 and (v_mine ->> 'place')::integer = v_place, 'my results';
  begin
    perform public.get_ranked_board(null, 'conquest');
    assert false, 'a board for Conquista';
  exception when others then
    assert sqlerrm = 'ranked_format_invalid', sqlerrm;
  end;
end $$;
reset role;

-- A Mandato over: results, prize and title, once. No banner: the end notice tells it
-- (20261119100000_end_notices.sql, tested in end_notices.test.sql).
do $$
begin
  update public.ranked_ledger set season = '2000-01'
  where user_id in ('00000000-0000-4000-8000-0000000002a1', '00000000-0000-4000-8000-0000000002a2');
  perform public.ranked_close_seasons();
  perform public.ranked_close_seasons();
  assert (select count(*) from public.ranked_season_results where season = '2000-01') = 2, 'results of the Mandato';
  assert (select place = 1 and league = 'vigilante' and coins = 50 and title = '1° Reggente · gennaio 2000'
          from public.ranked_season_results where season = '2000-01' and user_id = '00000000-0000-4000-8000-0000000002a1'),
    'first of the Mandato';
  assert (select place = 2 and league = 'recluta' and coins = 25
          from public.ranked_season_results where season = '2000-01' and user_id = '00000000-0000-4000-8000-0000000002a2'),
    'second of the Mandato';
  assert (select count(*) from public.player_notifications
          where user_id = '00000000-0000-4000-8000-0000000002a1' and kind = 'ranked') = 0, 'no banner';
  assert (select title from public.profiles where id = '00000000-0000-4000-8000-0000000002a1') = '1° Reggente · gennaio 2000',
    'title not shown';
  perform set_config('test.coins', public.coin_balance('00000000-0000-4000-8000-0000000002a1')::text, true);
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000002a1", "role": "authenticated"}', true);
do $$
declare
  v_coins integer := current_setting('test.coins')::integer;
  v_claim jsonb;
  v_titles jsonb := public.get_leaderboard_titles();
  v_hall jsonb := public.get_ranked_hall();
  v_old jsonb := (select e from jsonb_array_elements(v_hall) e where e ->> 'season' = '2000-01');
begin
  assert jsonb_array_length(public.get_my_ranked() -> 'prizes') = 1, 'prize not listed';
  -- Real Mandati closed live come before the test's one (the newest first), and
  -- after twelve of them it drops off the list.
  assert (v_old -> 'podium' -> 0 ->> 'is_me')::boolean and jsonb_array_length(v_old -> 'podium') = 2
      or (v_old is null and jsonb_array_length(v_hall) = 12 and v_hall -> 11 ->> 'season' > '2000-01'), 'Albo d''oro';
  assert (public.get_ranked_board('2000-01') ->> 'players')::integer = 2, 'Albo of a past Mandato';
  v_claim := public.claim_ranked_prize('2000-01');
  assert (v_claim ->> 'coins')::integer = 50 and (v_claim ->> 'coin_balance')::integer = v_coins + 50, 'prize not paid';
  assert jsonb_array_length(public.get_my_ranked() -> 'prizes') = 0, 'prize still listed';
  begin
    perform public.claim_ranked_prize('2000-01');
    assert false, 'prize paid twice';
  exception when others then
    assert sqlerrm = 'ranked_prize_already_claimed', sqlerrm;
  end;
  assert exists (select 1 from jsonb_array_elements(v_titles) t where t ->> 'board' = 'ranked' and t -> 'expires_at' = 'null'::jsonb),
    'title of the Mandato not listed';
  assert public.set_player_title(null) is null, 'title not removed';
  assert public.set_player_title((
    select (t ->> 'id')::uuid from jsonb_array_elements(v_titles) t where t ->> 'board' = 'ranked'
  )) = '1° Reggente · gennaio 2000', 'title of the Mandato not chosen';
end $$;
reset role;

-- The other modes against the server's opponent: built as their bot match, then ranked.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000002a2';
  v_match uuid;
begin
  v_match := public.insert_ranked_ghost_match('triple', v_user, pg_temp.team(v_user, 9), 'hard', pg_temp.bot(9), null, null);
  assert (select mode = 'ranked' and format = 'triple' and player_b is null from public.matches where id = v_match), 'triple';
  assert (select count(*) from public.ranked_ghost_turns where match_id = v_match) = 3, 'triple: three contests';
  assert (select count(distinct ready_at) from public.ranked_ghost_turns where match_id = v_match) = 1, 'triple: placed at once';
  perform public.finish_match(v_match, 'b', 'forfeit');

  v_match := public.insert_ranked_ghost_match('quadrant', v_user, pg_temp.team(v_user, 10), 'easy', pg_temp.bot(10), null, null);
  assert (select mode = 'ranked' and format = 'quadrant' from public.matches where id = v_match), 'quadrant';
  assert (select count(*) from public.ranked_ghost_turns where match_id = v_match)
         = (select (quadrant_first = 'b')::integer from public.matches where id = v_match), 'quadrant: the opponent''s moves only';
  perform public.finish_match(v_match, 'b', 'forfeit');
end $$;

rollback;
