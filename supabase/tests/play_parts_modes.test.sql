-- Integration test for the parts of a play's bonus in the Grande Minaccia, Allarme Triplo
-- and Emergenza (20261114110000_play_parts_modes.sql): stored with the turn, round or play
-- when the Edge Function sends them, checked, given back in the state. Service-only
-- functions are called as the database owner. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000f3', 'authenticated', 'authenticated', 'parts-boss@example.test',
   '{"full_name": "Parti Boss"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000f4', 'authenticated', 'authenticated', 'parts-triple@example.test',
   '{"full_name": "Parti Triplo"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000f5', 'authenticated', 'authenticated', 'parts-emergency@example.test',
   '{"full_name": "Parti Emergenza"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f3", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f4", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f5", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- The Grande Minaccia table is the default one here (admins may change it online).
update public.game_config c set value = to_jsonb(d.value)
from (values ('boss.hot_fronts', 2), ('boss.hot_value', 2), ('boss.hot_growth', 1), ('boss.base_value', 1)) as d(key, value)
where c.key = d.key;

-- Grande Minaccia: turn 1, both on front 1 (worth 2), a's 8 beats b's 5.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000f3';
  v_team uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 5) s);
  v_bot uuid[] := (select array_agg(s.id) from (
    select id from public.card_definitions where rarity_code in ('beta', 'alfa') order by code limit 5) s);
  v_values jsonb := '[[2,2,1,1,1],[1,1,3,3,1],[4,1,1,1,4],[1,5,5,1,1],[1,1,1,6,6]]';
  v_match uuid;
  v_state jsonb;
  v_failed boolean;
  v_mine jsonb := '{"power": 2, "carried": 0, "pack": 0, "modifier": 0, "floor": 0}';
  v_theirs jsonb := '{"power": 0, "carried": 0, "pack": 0, "modifier": 0, "floor": 0}';
  play_a jsonb;
  play_b jsonb;
begin
  v_match := public.match_create_boss_bot(v_a, 'hard', v_team, v_bot, v_values,
    (select id from public.boss_definitions where code = 'B01'));
  play_a := jsonb_build_object('card_instance_id', v_team[1], 'definition_id', (select definition_id from public.card_instances where id = v_team[1]),
    'front_slot', 1, 'base', 6, 'bonus', 2, 'score', 8, 'highest', 6, 'auto_played', false, 'points', 2);
  play_b := jsonb_build_object('card_instance_id', null, 'definition_id', v_bot[1], 'front_slot', 1,
    'base', 5, 'bonus', 0, 'score', 5, 'highest', 5, 'auto_played', false, 'points', 0);

  v_failed := false;
  begin perform public.match_record_boss_turn_state(v_match, 1, play_a || jsonb_build_object('parts', v_theirs), play_b,
    '["a", null, null, null, null]', null, 'a');
  exception when others then v_failed := sqlerrm = 'invalid_play_parts'; end;
  assert v_failed, 'boss: parts that do not add up to the bonus';

  v_state := public.match_record_boss_turn_state(v_match, 1, play_a || jsonb_build_object('parts', v_mine),
    play_b || jsonb_build_object('parts', v_theirs), '["a", null, null, null, null]', null, 'a');
  assert v_state -> 'rounds' -> 0 -> 'my_play' -> 'parts' = v_mine, format('boss: my parts %s', v_state -> 'rounds' -> 0 -> 'my_play');
  assert v_state -> 'rounds' -> 0 -> 'opponent_play' -> 'parts' = v_theirs, 'boss: the opponent''s parts';
  assert v_state -> 'rounds' -> 0 -> 'my_play' ->> 'front' = '0' and v_state -> 'points' = '{"me": 2, "opponent": 0}'::jsonb, 'boss: the turn as before';
  assert v_state -> 'rounds' -> 1 -> 'my_play' is null or jsonb_typeof(v_state -> 'rounds' -> 1 -> 'my_play') = 'null', 'boss: parts on an open turn';
  assert (v_state - 'server_now') = (public.match_state_payload(v_match, 'a') - 'server_now'), 'boss: state differs from the payload';
  perform public.finish_match(v_match, 'b', 'forfeit');
end $$;

-- Allarme Triplo: round 1, three contests, the parts follow the threat each card went on.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000f4';
  v_deck uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 9) s);
  v_bot uuid[] := (select array_agg(s.id) from (
    select id from public.card_definitions where is_active order by code limit 9) s);
  v_threats uuid[] := (select array_agg(s.id order by s.code) from (
    select id, code from public.threat_definitions where code in ('T107', 'T201', 'T606')) s);
  v_match uuid;
  v_team public.match_teams;
  v_bots public.match_teams;
  v_plays_a jsonb;
  v_plays_b jsonb;
  v_state jsonb;
  v_parts jsonb[] := array[
    '{"power": 3, "carried": 0, "pack": 0, "modifier": 0, "floor": 0}'::jsonb,
    '{"power": 0, "carried": 2, "pack": 0, "modifier": 0, "floor": 0}'::jsonb,
    '{"power": 0, "carried": 0, "pack": 0, "modifier": 0, "floor": 0}'::jsonb];
begin
  v_match := public.match_create_triple_bot(v_a, 'hard', v_deck, v_bot, v_threats);
  select * into v_team from public.match_teams where match_id = v_match and side = 'a';
  select * into v_bots from public.match_teams where match_id = v_match and side = 'b';
  select jsonb_agg(jsonb_build_object(
    'card_instance_id', v_team.card_instance_ids[s], 'definition_id', v_team.definition_ids[s],
    'base', 5, 'bonus', case s when 1 then 3 when 2 then 2 else 0 end, 'score', case s when 1 then 8 when 2 then 7 else 5 end,
    'highest', 5, 'auto_played', false, 'parts', v_parts[s]) order by s)
  into v_plays_a from generate_series(1, 3) s;
  select jsonb_agg(jsonb_build_object(
    'card_instance_id', null, 'definition_id', v_bots.definition_ids[s],
    'base', 4, 'bonus', 0, 'score', 4, 'highest', 4, 'auto_played', false) order by s)
  into v_plays_b from generate_series(1, 3) s;

  v_state := public.match_record_triple_round_state(v_match, 1, v_plays_a, v_plays_b, '["a", "a", "a"]', null, 'a');
  assert (select parts from public.round_plays where match_id = v_match and round = 1 and side = 'a') = v_parts[1], 'triple: contest 1 stored';
  assert (select parts from public.round_plays where match_id = v_match and round = 2 and side = 'a') = v_parts[2], 'triple: contest 2 stored';
  assert (select parts from public.round_plays where match_id = v_match and round = 1 and side = 'b') is null, 'triple: the bot sent none';
  assert v_state -> 'rounds' -> 0 -> 'contests' -> 0 -> 'my_play' -> 'parts' = v_parts[1], format('triple: contest 1 %s', v_state -> 'rounds' -> 0 -> 'contests' -> 0);
  assert v_state -> 'rounds' -> 0 -> 'contests' -> 1 -> 'my_play' -> 'parts' = v_parts[2], 'triple: contest 2';
  assert v_state -> 'rounds' -> 0 -> 'contests' -> 2 -> 'my_play' -> 'parts' = v_parts[3], 'triple: contest 3';
  assert v_state -> 'rounds' -> 0 -> 'contests' -> 0 -> 'opponent_play' -> 'parts' is null, 'triple: no parts for the bot';
  assert v_state -> 'points' = '{"me": 3, "opponent": 0}'::jsonb, 'triple: the round as before';
  assert (v_state - 'server_now') = (public.match_state_payload(v_match, 'a') - 'server_now'), 'triple: state differs from the payload';
  -- Seen from the bot's side, the player's parts are the opponent's.
  assert public.match_state_payload(v_match, 'b') -> 'rounds' -> 0 -> 'contests' -> 1 -> 'opponent_play' -> 'parts' = v_parts[2],
    'triple: the other side sees them once resolved';
  perform public.finish_match(v_match, 'b', 'forfeit');
end $$;

-- Emergenza: a play with its parts, a wrong one refused, one of before without.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000f5';
  v_squad uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 8) s);
  v_threats uuid[];
  v_state jsonb;
  v_failed boolean;
  v_parts jsonb := '{"power": 3, "carried": 0, "pack": 0, "modifier": 0, "floor": 0}';
begin
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 2, 3, 4, 5, 6, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level and region = 'megara' and rarity_code is null
    order by code offset (case when l.ord >= 7 then 1 else 0 end) limit 1
  ) t;
  perform public.emergency_ensure_day(v_threats);
  perform public.emergency_start(v_a, v_squad);

  v_failed := false;
  begin perform public.emergency_record_play_state(v_a, 1, v_squad[1], 1, 3, 4, 99, '{"power": 1, "carried": 0, "pack": 0, "modifier": 0, "floor": 0}');
  exception when others then v_failed := sqlerrm = 'invalid_play_parts'; end;
  assert v_failed, 'emergency: parts that do not add up to the bonus';
  assert not exists (
    select 1 from public.emergency_plays p join public.emergency_runs r on r.id = p.run_id where r.user_id = v_a
  ), 'emergency: a refused play stayed';

  v_state := public.emergency_record_play_state(v_a, 1, v_squad[1], 1, 3, 4, 99, v_parts);
  assert v_state -> 'run' -> 'plays' -> 0 -> 'parts' = v_parts, format('emergency: parts in the state %s', v_state -> 'run' -> 'plays' -> 0);
  assert (v_state -> 'run' ->> 'current_round')::integer = 2, 'emergency: the run went on';
  assert v_state -> 'run' ? 'xp', 'emergency: the XP is still there';
  assert (v_state - 'server_now') = (public.emergency_state_payload(v_a) - 'server_now'), 'emergency: state differs from the payload';

  -- Without parts, as the Edge Function of before: stored as always.
  v_state := public.emergency_record_play_state(v_a, 2, v_squad[2], 1, 0, 1, 99);
  assert v_state -> 'run' -> 'plays' -> 1 -> 'parts' is null, 'emergency: parts out of nothing';
end $$;

-- Players never call these functions themselves.
do $$
begin
  assert not has_function_privilege('authenticated', 'public.with_triple_play_parts(jsonb, uuid, text)', 'execute'), 'players read triple parts';
  assert not has_function_privilege('authenticated',
    'public.emergency_record_play_state(uuid, integer, uuid, integer, integer, integer, integer, jsonb)', 'execute'), 'players record plays';
end $$;

rollback;
