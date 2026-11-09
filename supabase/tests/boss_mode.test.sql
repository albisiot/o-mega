-- Integration test for the Grande Minaccia (SPEC §5.12): the bosses, the points
-- table check, matches against a bot and between players, the turn checks and
-- the payload. Service-only functions are called as the database owner.
-- Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'boss-a@example.test',
   '{"full_name": "Boss A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated', 'boss-b@example.test',
   '{"full_name": "Boss B"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000e3', 'authenticated', 'authenticated', 'boss-c@example.test',
   '{"full_name": "Boss C"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e2", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e3", "role": "authenticated"}', true);
select public.bootstrap_player();

-- Players read the bosses, never write them.
do $$
begin
  assert (select count(*) from public.boss_definitions) = 6, 'players see six bosses';
  assert (select count(*) from public.boss_fronts) = 30, 'players see the fronts';
  begin
    insert into public.boss_definitions (code, name, flavor, scene) values ('B99', 'Prova', 'Prova', 'city');
    raise exception 'ASSERT: a player wrote a boss';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- The catalog: six playable bosses, five distinct fronts of Nuova Megara each.
do $$
begin
  assert (select count(*) from public.boss_definitions where is_active) = 6, 'six bosses';
  assert not exists (select 1 from public.boss_definitions b where not public.boss_is_playable(b.id)),
    'a boss whose fronts break the level rules';
  assert not exists (
    select 1 from public.boss_fronts f join public.threat_definitions t on t.id = f.threat_id where t.region <> 'megara'
  ), 'a front beyond Nuova Megara';
  assert (select count(*) from public.game_config where key like 'boss.%') = 14, 'boss configuration';
  assert public.config_int('boss.targets.level6') = 16, 'presidio target of level 6';
end $$;

-- The points table: the same rules as the engine.
do $$
begin
  assert public.valid_boss_values('[[2,2,1,1,1],[3,4,2,3,2],[5,5,4,4,3],[6,7,5,5,5],[8,8,6,7,6]]'), 'a valid table';
  assert not public.valid_boss_values('[[2,2,1,1,1],[3,4,2,3,2],[5,5,4,4,3],[6,7,5,5,5]]'), 'four turns';
  assert not public.valid_boss_values('[[2,2,2,1,1],[3,3,4,2,2],[4,5,5,3,3],[6,6,6,4,4],[7,7,7,6,6]]'), 'three hot fronts';
  assert not public.valid_boss_values('[[2,2,1,1,1],[3,4,2,3,2],[5,5,4,4,3],[6,7,5,5,5],[8,8,6,7,7]]'), 'three extra fronts';
  assert not public.valid_boss_values('[[2,2,1,1,1],[3,4,2,3,2],[5,5,4,4,3],[6,7,5,5,5],[8,8,6,7,"6"]]'), 'a text value';
  assert not public.valid_boss_values('[[2,2,1,1,1],[3,4,2,3,2],[5,5,4,4,3],[6,7,5,5,5],[8,8,6,7,6,1]]'), 'six fronts';
  assert not public.valid_boss_values(null), 'no table';
end $$;

-- A match against a bot: creation, payload, turns, checks, end.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000e1';
  v_team uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 5) s);
  v_defs uuid[];
  v_bot uuid[] := (select array_agg(s.id) from (
    select id from public.card_definitions where rarity_code in ('beta', 'alfa') order by code limit 5) s);
  v_values jsonb := '[[2,2,1,1,1],[3,4,2,3,2],[5,5,4,4,3],[6,7,5,5,5],[8,8,6,7,6]]';
  v_boss uuid := (select id from public.boss_definitions where code = 'B01');
  v_match uuid;
  v_row public.matches;
  v_state jsonb;
  v_context jsonb;
  v_failed boolean;
  v_bot_wins integer := (select bot_wins from public.profiles where id = v_a);
  play_a jsonb;
  play_b jsonb;
begin
  select array_agg(i.definition_id order by u.ord) into v_defs
  from unnest(v_team) with ordinality as u(id, ord) join public.card_instances i on i.id = u.id;

  v_failed := false;
  begin perform public.match_create_boss_bot(v_a, 'hard', v_team, v_bot, '[[1]]', v_boss);
  exception when others then v_failed := sqlerrm = 'invalid_boss_values'; end;
  assert v_failed, 'a broken points table was accepted';
  v_failed := false;
  begin perform public.match_create_boss_bot(v_a, 'legendary', v_team, v_bot, v_values, v_boss);
  exception when others then v_failed := sqlerrm = 'invalid_difficulty'; end;
  assert v_failed, 'an unknown difficulty was accepted';

  v_match := public.match_create_boss_bot(v_a, 'hard', v_team, v_bot, v_values, v_boss);
  select * into v_row from public.matches where id = v_match;
  assert v_row.format = 'boss' and v_row.mode = 'bot' and v_row.bot_difficulty = 'hard', 'match shape';
  assert v_row.threat_ids = (select array_agg(threat_id order by slot) from public.boss_fronts where boss_id = v_boss), 'fronts in slot order';
  assert v_row.threat_levels = array[1, 2, 3, 4, 5], format('front levels %s', v_row.threat_levels);
  assert v_row.threat_modifiers = '[null, null, null, null, null]'::jsonb, format('modifiers %s', v_row.threat_modifiers);
  assert (select threat_id from public.match_rounds where match_id = v_match and round = 1) is null, 'a turn has no threat';

  v_failed := false;
  begin perform public.match_create_boss_bot(v_a, 'easy', v_team, v_bot, v_values);
  exception when others then v_failed := sqlerrm = 'match_already_active'; end;
  assert v_failed, 'two matches at once';

  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);
  assert public.get_active_match() ->> 'format' = 'boss', 'the match in progress says its format';
  reset role;

  -- What the player sees: the boss, every front and the whole table from the start.
  v_state := public.match_state_payload(v_match, 'a');
  assert v_state ->> 'format' = 'boss', 'format in the payload';
  assert v_state -> 'boss' ->> 'name' = 'Il Colosso del porto', 'boss name';
  assert jsonb_array_length(v_state -> 'fronts') = 5, 'five fronts';
  assert (v_state -> 'fronts' -> 0 ->> 'front')::integer = 0 and v_state -> 'fronts' -> 0 ->> 'name' = 'Rissa al porto', 'first front';
  assert v_state -> 'values' = v_values, 'points table';
  assert v_state -> 'presidio_targets' = '{"1": 4, "2": 7, "3": 9, "4": 12, "5": 14, "6": 16}'::jsonb, 'presidio targets';
  assert (v_state ->> 'turns')::integer = 5, 'turns';
  assert jsonb_array_length(v_state -> 'my_team') = 5, 'own team';
  assert v_state -> 'rounds' -> 0 ->> 'opponent_play' is null, 'opponent play before resolving';
  assert v_state -> 'points' = '{"me": 0, "opponent": 0}'::jsonb, 'points at the start';

  v_context := public.match_round_context(v_a, v_match);
  assert v_context -> 'match' ->> 'format' = 'boss' and v_context -> 'match' -> 'boss_values' = v_values, 'context';

  -- Turn 1, same front (slot 1, worth 2): a wins it.
  play_a := jsonb_build_object('card_instance_id', v_team[1], 'definition_id', v_defs[1], 'front_slot', 1,
    'base', 8, 'bonus', 0, 'score', 8, 'highest', 8, 'auto_played', false, 'points', 2, 'required', null);
  play_b := jsonb_build_object('card_instance_id', null, 'definition_id', v_bot[1], 'front_slot', 1,
    'base', 5, 'bonus', 0, 'score', 5, 'highest', 5, 'auto_played', false, 'points', 0, 'required', null);

  v_failed := false;
  begin perform public.match_record_boss_turn_state(v_match, 1, play_a, play_b || '{"points": 2}', null, 'a');
  exception when others then v_failed := sqlerrm = 'invalid_points'; end;
  assert v_failed, 'both sides took the same front';
  v_failed := false;
  begin perform public.match_record_boss_turn_state(v_match, 1, play_a || '{"points": 0}', play_b || '{"points": 2}', null, 'a');
  exception when others then v_failed := sqlerrm = 'invalid_points'; end;
  assert v_failed, 'the lower score took the front';
  v_failed := false;
  begin perform public.match_record_boss_turn_state(v_match, 1, play_a || '{"points": 3}', play_b, null, 'a');
  exception when others then v_failed := sqlerrm = 'invalid_points'; end;
  assert v_failed, 'points that are not in the table';
  v_failed := false;
  begin perform public.match_record_boss_turn_state(v_match, 1, play_a || '{"front_slot": 6}', play_b, null, 'a');
  exception when others then v_failed := sqlerrm = 'invalid_front'; end;
  assert v_failed, 'a front that does not exist';
  v_failed := false;
  begin perform public.match_record_boss_turn_state(v_match, 1, play_a || '{"required": 4}', play_b, null, 'a');
  exception when others then v_failed := sqlerrm = 'invalid_points'; end;
  assert v_failed, 'a presidio target on a contested front';
  v_failed := false;
  begin perform public.match_record_round_state(v_match, 1, play_a, play_b, 'a', null, 'a');
  exception when others then v_failed := sqlerrm = 'invalid_front'; end;
  assert v_failed, 'a turn stored as a classic round';

  v_state := public.match_record_boss_turn_state(v_match, 1, play_a, play_b, null, 'a');
  assert (v_state ->> 'current_round')::integer = 2, 'turn 2';
  assert v_state -> 'points' = '{"me": 2, "opponent": 0}'::jsonb, format('points %s', v_state -> 'points');
  assert v_state -> 'fronts_taken' = '{"me": 1, "opponent": 0}'::jsonb, 'fronts taken';
  assert (v_state -> 'rounds' -> 0 -> 'opponent_play' ->> 'front')::integer = 0, 'opponent front after resolving';
  assert (v_state -> 'rounds' -> 0 -> 'my_play' ->> 'points')::integer = 2, 'own points of the turn';
  assert (select winner_side from public.match_rounds where match_id = v_match and round = 1) = 'a', 'turn winner';

  -- Turn 2, different fronts: a holds slot 2 (worth 4), b fails slot 5.
  play_a := jsonb_build_object('card_instance_id', v_team[2], 'definition_id', v_defs[2], 'front_slot', 2,
    'base', 7, 'bonus', 0, 'score', 7, 'highest', 4, 'auto_played', false, 'points', 4, 'required', 7);
  play_b := jsonb_build_object('card_instance_id', null, 'definition_id', v_bot[2], 'front_slot', 5,
    'base', 13, 'bonus', 0, 'score', 13, 'highest', 4, 'auto_played', false, 'points', 0, 'required', 14);
  v_failed := false;
  begin perform public.match_record_boss_turn_state(v_match, 2, play_a || '{"score": 6}', play_b, null, 'a');
  exception when others then v_failed := sqlerrm = 'invalid_points'; end;
  assert v_failed, 'a front held below the presidio target';
  v_failed := false;
  begin perform public.match_record_boss_turn_state(v_match, 2, play_a || '{"points": 0}', play_b, null, 'a');
  exception when others then v_failed := sqlerrm = 'invalid_points'; end;
  assert v_failed, 'a front not held at the presidio target';
  v_failed := false;
  begin perform public.match_record_boss_turn_state(v_match, 2,
    play_a || jsonb_build_object('card_instance_id', v_team[1], 'definition_id', v_defs[1]), play_b, null, 'a');
  exception when others then v_failed := sqlerrm = 'character_already_played'; end;
  assert v_failed, 'a character played twice';
  perform public.match_record_boss_turn_state(v_match, 2, play_a, play_b, null, 'a');

  -- Turns 3-5: nobody takes anything; then the result must match the points.
  for t in 3 .. 5 loop
    play_a := jsonb_build_object('card_instance_id', v_team[t], 'definition_id', v_defs[t], 'front_slot', 4,
      'base', 1, 'bonus', 0, 'score', 1, 'highest', 1, 'auto_played', false, 'points', 0, 'required', 12);
    play_b := jsonb_build_object('card_instance_id', null, 'definition_id', v_bot[t], 'front_slot', 3,
      'base', 1, 'bonus', 0, 'score', 1, 'highest', 1, 'auto_played', true, 'points', 0, 'required', 9);
    if t = 5 then
      v_failed := false;
      begin perform public.match_record_boss_turn_state(v_match, t, play_a, play_b, 'b', 'a');
      exception when others then v_failed := sqlerrm = 'result_mismatch'; end;
      assert v_failed, 'a result that does not follow the points';
      v_state := public.match_record_boss_turn_state(v_match, t, play_a, play_b, 'a', 'a');
    else
      v_state := public.match_record_boss_turn_state(v_match, t, play_a, play_b, null, 'a');
    end if;
  end loop;

  assert v_state ->> 'status' = 'finished' and v_state ->> 'result' = 'win', format('end %s', v_state ->> 'result');
  assert v_state -> 'points' = '{"me": 6, "opponent": 0}'::jsonb, 'final points';
  assert (select bot_wins from public.profiles where id = v_a) = v_bot_wins + 1, 'bot statistics';
  assert (select count(*) from public.match_rounds where match_id = v_match) = 5, 'five turns';

  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);
  assert (public.get_match_history() -> 0 ->> 'format') = 'boss', 'history format';
  assert (public.get_match_history() -> 0 ->> 'points_me')::integer = 6, 'history points';
  assert (public.get_match_history() -> 0 ->> 'boss_name') = 'Il Colosso del porto', 'history boss';
  assert (public.get_match_state(v_match) ->> 'format') = 'boss', 'the player reads the boss payload';
  reset role;
end $$;

-- A classic match keeps its payload, and its plays never have a front.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000e1';
  v_team uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 5) s);
  v_bot uuid[] := (select array_agg(s.id) from (
    select id from public.card_definitions where rarity_code in ('beta', 'alfa') order by code limit 5) s);
  v_threats uuid[];
  v_match uuid;
  v_failed boolean;
begin
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 4, 2]) with ordinality as l(level, ord)
  cross join lateral (select id from public.threat_definitions where level = l.level and region = 'megara' order by code limit 1) t;
  v_match := public.match_create_bot(v_a, 'easy', v_team, v_bot, v_threats);
  assert public.match_state_payload(v_match, 'a') ->> 'format' = 'classic', 'classic payload';
  assert jsonb_array_length(public.match_state_payload(v_match, 'a') -> 'rounds') = 1, 'classic rounds';
  v_failed := false;
  begin
    perform public.match_record_boss_turn(v_match, 1, '{"front_slot": 1}', '{"front_slot": 1}', null);
  exception when others then v_failed := sqlerrm = 'invalid_format'; end;
  assert v_failed, 'a classic round stored as a turn';
  perform public.finish_match(v_match, 'b', 'forfeit');
end $$;

-- Between players: a friend code for a Grande Minaccia, choices with a front.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000e1';
  v_b uuid := '00000000-0000-4000-8000-0000000000e2';
  v_team_a uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 5) s);
  v_team_b uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_b order by acquired_at, id limit 5) s);
  v_values jsonb := '[[1,2,1,2,1],[2,4,3,3,2],[3,5,5,4,4],[5,6,6,5,6],[6,8,7,7,7]]';
  v_lobby jsonb;
  v_match uuid;
  v_row public.matches;
  v_failed boolean;
  v_nullifier uuid := (select id from public.card_definitions where power_code = 'nullifier' order by code limit 1);
  v_inst uuid;
  play_a jsonb;
  play_b jsonb;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);
  v_failed := false;
  begin perform public.create_lobby(v_team_a, 'chess');
  exception when others then v_failed := sqlerrm = 'invalid_request'; end;
  assert v_failed, 'an unknown format';
  v_lobby := public.create_lobby(v_team_a, 'boss');
  assert v_lobby ->> 'format' = 'boss', 'lobby format';
  reset role;

  v_failed := false;
  begin perform public.match_join_lobby(v_b, v_lobby ->> 'code', v_team_b, null, null);
  exception when others then v_failed := sqlerrm = 'invalid_boss_values'; end;
  assert v_failed, 'a boss lobby joined without a points table';

  v_match := public.match_join_lobby(v_b, v_lobby ->> 'code', v_team_b, null, v_values);
  select * into v_row from public.matches where id = v_match;
  assert v_row.format = 'boss' and v_row.mode = 'friendly' and v_row.player_a = v_a and v_row.player_b = v_b, 'friendly boss match';
  assert v_row.boss_values = v_values, 'table stored';
  assert not exists (select 1 from public.match_lobbies where host_id = v_a), 'lobby left behind';

  v_failed := false;
  begin perform public.match_submit_play(v_a, v_match, 1, v_team_a[1]);
  exception when others then v_failed := sqlerrm = 'invalid_front'; end;
  assert v_failed, 'a choice without a front';
  v_failed := false;
  begin perform public.match_submit_play(v_a, v_match, 1, v_team_a[1], 0);
  exception when others then v_failed := sqlerrm = 'invalid_front'; end;
  assert v_failed, 'front 0';

  assert public.match_submit_play(v_a, v_match, 1, v_team_a[1], 2) = 'waiting', 'first choice';
  assert public.match_state_payload(v_match, 'a') -> 'rounds' -> 0 -> 'my_pending' = jsonb_build_object('instance_id', v_team_a[1], 'front', 1),
    'own pending choice';
  assert (public.match_state_payload(v_match, 'b') -> 'rounds' -> 0 ->> 'opponent_has_chosen')::boolean, 'opponent has chosen';
  assert public.match_state_payload(v_match, 'b') -> 'rounds' -> 0 -> 'my_pending' = 'null'::jsonb, 'no pending of mine';
  assert public.match_submit_play(v_b, v_match, 1, v_team_b[1], 4) = 'ready', 'both chose';

  play_a := jsonb_build_object('card_instance_id', v_team_a[1],
    'definition_id', (select definition_id from public.card_instances where id = v_team_a[1]), 'front_slot', 3,
    'base', 9, 'bonus', 0, 'score', 9, 'highest', 5, 'auto_played', false, 'points', 1, 'required', 9);
  play_b := jsonb_build_object('card_instance_id', v_team_b[1],
    'definition_id', (select definition_id from public.card_instances where id = v_team_b[1]), 'front_slot', 4,
    'base', 3, 'bonus', 0, 'score', 3, 'highest', 2, 'auto_played', false, 'points', 0, 'required', 12);
  v_failed := false;
  begin perform public.match_record_boss_turn(v_match, 1, play_a, play_b, null);
  exception when others then v_failed := sqlerrm = 'choice_not_submitted'; end;
  assert v_failed, 'a front other than the one chosen';
  perform public.match_record_boss_turn(v_match, 1, play_a || '{"front_slot": 2, "points": 2, "required": 7}', play_b, null);
  assert (select points_a from public.matches where id = v_match) = 2, 'points of the player';

  -- An Annullatore stops a power only on the same front.
  insert into public.card_instances (owner_id, definition_id, acquired_via) values (v_b, v_nullifier, 'pack') returning id into v_inst;
  update public.match_teams set card_instance_ids[2] = v_inst, definition_ids[2] = v_nullifier
  where match_id = v_match and side = 'b';
  play_a := jsonb_build_object('card_instance_id', v_team_a[2],
    'definition_id', (select definition_id from public.card_instances where id = v_team_a[2]), 'front_slot', 1,
    'base', 1, 'bonus', 0, 'score', 1, 'highest', 1, 'auto_played', true, 'points', 0, 'required', 4);
  play_b := jsonb_build_object('card_instance_id', v_inst, 'definition_id', v_nullifier, 'front_slot', 2,
    'base', 1, 'bonus', 0, 'score', 1, 'highest', 1, 'auto_played', true, 'points', 0, 'required', 7);
  update public.match_rounds set deadline_at = now() - interval '1 hour' where match_id = v_match and round = 2;
  perform public.match_record_boss_turn(v_match, 2, play_a, play_b, null);
  assert not public.nullified_in_round(v_match, 2, 'a'), 'an Annullatore on another front';
  perform public.finish_match(v_match, 'draw', 'forfeit');
end $$;

-- The queue pairs players of the same format only.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000e1';
  v_b uuid := '00000000-0000-4000-8000-0000000000e2';
  v_c uuid := '00000000-0000-4000-8000-0000000000e3';
  v_team_a uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 5) s);
  v_team_b uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_b order by acquired_at, id limit 5) s);
  v_team_c uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_c order by acquired_at, id limit 5) s);
  v_values jsonb := '[[2,2,1,1,1],[3,4,2,3,2],[5,5,4,4,3],[6,7,5,5,5],[8,8,6,7,6]]';
  v_threats uuid[];
  v_match uuid;
  v_failed boolean;
begin
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 4, 2]) with ordinality as l(level, ord)
  cross join lateral (select id from public.threat_definitions where level = l.level and region = 'megara' order by code limit 1) t;

  v_failed := false;
  begin perform public.match_queue_join(v_a, 'conquest', v_team_a, v_threats, null, null, 'boss', v_values);
  exception when others then v_failed := sqlerrm = 'invalid_request'; end;
  assert v_failed, 'a Grande Minaccia in Conquest';

  assert public.match_queue_join(v_a, 'friendly', v_team_a, v_threats, null, null, 'boss', v_values) is null, 'a waits';
  -- A classic player does not meet a boss player.
  assert public.match_queue_join(v_c, 'friendly', v_team_c, v_threats) is null, 'c waits for a classic match';
  v_match := public.match_queue_join(v_b, 'friendly', v_team_b, v_threats, null, null, 'boss', v_values);
  assert v_match is not null, 'b meets a';
  assert (select format from public.matches where id = v_match) = 'boss', 'paired in the format';
  assert (select player_a from public.matches where id = v_match) = v_a, 'who waited longer is player A';
  assert exists (select 1 from public.matchmaking_queue where user_id = v_c and format = 'classic'), 'c still waiting';
end $$;

rollback;
