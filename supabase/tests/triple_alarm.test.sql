-- Integration test for Allarme Triplo (SPEC §5.13): configuration, decks of nine,
-- matches against a bot and between players, the round checks and the payload.
-- Service-only functions are called as the database owner.
-- Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated', 'triple-a@example.test',
   '{"full_name": "Triplo A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000f2', 'authenticated', 'authenticated', 'triple-b@example.test',
   '{"full_name": "Triplo B"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f2", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- A play of a round for the record function: the card, made-up scores.
create function pg_temp.triple_play(p_instance uuid, p_definition uuid, p_score integer, p_auto boolean default false)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'card_instance_id', p_instance, 'definition_id', p_definition,
    'base', p_score, 'bonus', 0, 'score', p_score, 'highest', least(p_score, 10), 'auto_played', p_auto
  )
$$;

-- The plays of a side's hand in round r, placed in draw order, with the given scores.
create function pg_temp.triple_hand(p_match uuid, p_side text, p_round integer, p_scores integer[], p_auto boolean default false)
returns jsonb
language sql
as $$
  select jsonb_agg(pg_temp.triple_play(t.card_instance_ids[(p_round - 1) * 3 + s], t.definition_ids[(p_round - 1) * 3 + s], p_scores[s], p_auto) order by s)
  from public.match_teams t, generate_series(1, 3) as s
  where t.match_id = p_match and t.side = p_side
$$;

-- Configuration and formats.
do $$
begin
  assert public.config_int('triple.rounds') = 3 and public.config_int('triple.threats') = 3, 'rounds and threats';
  assert public.config_int('triple.round_timer_seconds') = 45, 'timer';
  assert public.triple_deck_size() = 9 and public.team_size_for('triple') = 9, 'a deck of nine';
  assert public.team_size_for('classic') = 5 and public.team_size_for('boss') = 5, 'teams of five elsewhere';
end $$;

-- A match against a bot: creation, payload, rounds, checks, end.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000f1';
  v_deck uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 9) s);
  v_five uuid[] := v_deck[1:5];
  v_bot uuid[] := (select array_agg(s.id) from (
    select id from public.card_definitions where is_active order by code limit 9) s);
  v_threats uuid[] := (select array_agg(s.id order by s.code) from (
    select id, code from public.threat_definitions where code in ('T107', 'T201', 'T606')) s);
  v_place uuid := (select id from public.threat_definitions where region <> 'megara' limit 1);
  v_match uuid;
  v_row public.matches;
  v_team public.match_teams;
  v_state jsonb;
  v_failed boolean;
  v_bot_wins integer := (select bot_wins from public.profiles where id = v_a);
  v_plays jsonb;
begin
  v_failed := false;
  begin perform public.match_create_triple_bot(v_a, 'medium', v_five, v_bot, v_threats);
  exception when others then v_failed := sqlerrm = 'invalid_team_size'; end;
  assert v_failed, 'a deck of five was accepted';
  v_failed := false;
  begin perform public.match_create_triple_bot(v_a, 'medium', v_deck, v_bot[1:5], v_threats);
  exception when others then v_failed := sqlerrm = 'invalid_bot_team'; end;
  assert v_failed, 'a bot deck of five was accepted';
  v_failed := false;
  begin perform public.match_create_triple_bot(v_a, 'medium', v_deck, v_bot, array[v_threats[1], v_threats[2], v_place]);
  exception when others then v_failed := sqlerrm = 'invalid_threats'; end;
  assert v_failed, 'a threat beyond Nuova Megara was accepted';
  v_failed := false;
  begin perform public.match_create_triple_bot(v_a, 'medium', v_deck, v_bot, array[v_threats[1], v_threats[1], v_threats[2]]);
  exception when others then v_failed := sqlerrm = 'invalid_threats'; end;
  assert v_failed, 'the same threat twice was accepted';

  -- Drawn by the database: three distinct threats of Nuova Megara, of any level.
  v_match := public.match_create_triple_bot(v_a, 'easy', v_deck, v_bot);
  select * into v_row from public.matches where id = v_match;
  assert cardinality(v_row.threat_ids) = 9 and (select count(distinct u) from unnest(v_row.threat_ids) u) = 3, 'three threats';
  assert not exists (
    select 1 from unnest(v_row.threat_ids) u join public.threat_definitions t on t.id = u where t.region <> 'megara'
  ), 'only Nuova Megara';
  perform public.finish_match(v_match, 'b', 'forfeit');

  v_match := public.match_create_triple_bot(v_a, 'hard', v_deck, v_bot, v_threats);
  select * into v_row from public.matches where id = v_match;
  assert v_row.format = 'triple' and v_row.mode = 'bot' and v_row.bot_difficulty = 'hard', 'match shape';
  assert v_row.threat_ids = v_threats || v_threats || v_threats, format('the three threats in every round %s', v_row.threat_ids);
  assert v_row.threat_levels = array[1, 2, 6, 1, 2, 6, 1, 2, 6], format('levels %s', v_row.threat_levels);
  assert jsonb_array_length(v_row.threat_modifiers) = 9
    and v_row.threat_modifiers -> 0 = v_row.threat_modifiers -> 3 and v_row.threat_modifiers -> 0 = v_row.threat_modifiers -> 6
    and v_row.threat_modifiers -> 2 = v_row.threat_modifiers -> 8, format('the same modifiers in every round %s', v_row.threat_modifiers);
  assert (select count(*) from public.match_rounds where match_id = v_match) = 3, 'the three contests of round 1';
  assert (select count(distinct deadline_at) from public.match_rounds where match_id = v_match) = 1, 'one deadline';
  assert (select array_agg(threat_id order by round) from public.match_rounds where match_id = v_match) = v_threats, 'contest threats';
  assert v_row.current_round = 1, 'current round';

  -- The decks are shuffled: the same cards, in an order of the database's choosing.
  select * into v_team from public.match_teams where match_id = v_match and side = 'a';
  assert (select array_agg(u order by u) from unnest(v_team.card_instance_ids) u) = (select array_agg(u order by u) from unnest(v_deck) u), 'own deck';
  assert (
    select bool_and(i.definition_id = v_team.definition_ids[o])
    from unnest(v_team.card_instance_ids) with ordinality as u(id, o) join public.card_instances i on i.id = u.id
  ), 'cards and characters stay together';
  assert (select array_agg(u order by u) from unnest((select definition_ids from public.match_teams where match_id = v_match and side = 'b')) u)
    = (select array_agg(u order by u) from unnest(v_bot) u), 'bot deck';

  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);
  assert public.get_active_match() ->> 'format' = 'triple', 'the match in progress says its format';
  reset role;

  -- What the player sees: the three threats, the deck, only the hand of round 1.
  v_state := public.match_state_payload(v_match, 'a');
  assert v_state ->> 'format' = 'triple' and (v_state ->> 'current_round')::integer = 1 and (v_state ->> 'rounds_count')::integer = 3, 'rounds';
  assert jsonb_array_length(v_state -> 'threats') = 3 and v_state -> 'threats' -> 2 ->> 'level' = '6', 'threats';
  assert jsonb_array_length(v_state -> 'my_deck') = 9, 'the whole deck';
  assert (select count(*) from jsonb_array_elements(v_state -> 'my_deck') c where c ? 'drawn_round' and c ->> 'drawn_round' is not null) = 3,
    'only three cards drawn';
  assert (select array_agg((h ->> 'instance_id')::uuid order by o) from jsonb_array_elements(v_state -> 'rounds' -> 0 -> 'hand') with ordinality as x(h, o))
    = v_team.card_instance_ids[1:3], 'the hand of round 1 is the top of the deck';
  assert jsonb_array_length(v_state -> 'rounds') = 1, 'one round open';
  assert v_state -> 'rounds' -> 0 -> 'contests' -> 0 -> 'opponent_play' = 'null'::jsonb, 'opponent play before resolving';
  assert v_state -> 'points' = '{"me": 0, "opponent": 0}'::jsonb, 'points at the start';
  assert public.match_round_context(v_a, v_match) -> 'match' ->> 'format' = 'triple', 'context';

  -- Cards of a later round, or the same card twice, are refused.
  v_failed := false;
  begin perform public.match_record_triple_round(v_match, 1,
    pg_temp.triple_hand(v_match, 'a', 2, array[5, 5, 5]), pg_temp.triple_hand(v_match, 'b', 1, array[4, 4, 4]), '["a", "a", "a"]', null);
  exception when others then v_failed := sqlerrm = 'character_not_available'; end;
  assert v_failed, 'cards of round 2 played in round 1';
  v_plays := pg_temp.triple_hand(v_match, 'a', 1, array[5, 5, 5]);
  v_failed := false;
  begin perform public.match_record_triple_round(v_match, 1,
    jsonb_build_array(v_plays -> 0, v_plays -> 0, v_plays -> 1), pg_temp.triple_hand(v_match, 'b', 1, array[4, 4, 4]), '["a", "a", "a"]', null);
  exception when others then v_failed := sqlerrm = 'invalid_placement'; end;
  assert v_failed, 'a card on two threats';
  v_failed := false;
  begin perform public.match_record_triple_round(v_match, 1,
    jsonb_build_array(v_plays -> 0, v_plays -> 1), pg_temp.triple_hand(v_match, 'b', 1, array[4, 4, 4]), '["a", "a", "a"]', null);
  exception when others then v_failed := sqlerrm = 'invalid_placement'; end;
  assert v_failed, 'two cards for three threats';
  v_failed := false;
  begin perform public.match_record_triple_round(v_match, 1,
    v_plays, pg_temp.triple_hand(v_match, 'b', 1, array[4, 9, 4]), '["a", "a", "a"]', null);
  exception when others then v_failed := sqlerrm = 'invalid_points'; end;
  assert v_failed, 'a threat given to the lower score';
  v_failed := false;
  begin perform public.match_record_triple_round(v_match, 2,
    v_plays, pg_temp.triple_hand(v_match, 'b', 1, array[4, 4, 4]), '["a", "a", "a"]', null);
  exception when others then v_failed := sqlerrm = 'round_already_resolved'; end;
  assert v_failed, 'round 2 before round 1';

  -- Round 1, placed in any order: a wins two threats, the third is void.
  v_plays := jsonb_build_array(v_plays -> 2, v_plays -> 0, v_plays -> 1);
  perform public.match_record_triple_round(v_match, 1,
    v_plays, pg_temp.triple_hand(v_match, 'b', 1, array[4, 4, 5]), '["a", "a", null]', null);
  select * into v_row from public.matches where id = v_match;
  assert v_row.rounds_won_a = 2 and v_row.rounds_won_b = 0 and v_row.total_score_a = 15 and v_row.total_score_b = 13, 'points after round 1';
  assert v_row.current_round = 4 and v_row.status = 'active', 'round 2 open';
  assert (select array_agg(coalesce(winner_side, '-') order by round) from public.match_rounds where match_id = v_match and round <= 3)
    = array['a', 'a', 'none'], 'contest winners';
  assert (select count(*) from public.match_rounds where match_id = v_match and round between 4 and 6 and resolved_at is null) = 3, 'contests of round 2';
  assert (select definition_id from public.round_plays where match_id = v_match and round = 1 and side = 'a') = v_team.definition_ids[3],
    'the card placed on threat 1';

  v_state := public.match_state_payload(v_match, 'a');
  assert (v_state ->> 'current_round')::integer = 2 and v_state -> 'points' = '{"me": 2, "opponent": 0}'::jsonb, 'payload after round 1';
  assert v_state -> 'rounds' -> 0 -> 'contests' -> 0 ->> 'winner' = 'me' and v_state -> 'rounds' -> 0 -> 'contests' -> 2 ->> 'winner' = 'none', 'winners';
  assert v_state -> 'rounds' -> 0 -> 'contests' -> 0 -> 'opponent_play' ->> 'score' = '4', 'opponent play once resolved';
  assert (select count(*) from jsonb_array_elements(v_state -> 'my_deck') c where c ->> 'drawn_round' is not null) = 6, 'six cards drawn';
  assert (select count(*) from jsonb_array_elements(v_state -> 'my_deck') c where (c ->> 'played')::boolean) = 3, 'three played';

  v_failed := false;
  begin perform public.match_record_triple_round(v_match, 1,
    v_plays, pg_temp.triple_hand(v_match, 'b', 1, array[4, 4, 5]), '["a", "a", null]', null);
  exception when others then v_failed := sqlerrm = 'round_already_resolved'; end;
  assert v_failed, 'round 1 twice';

  -- A late choice is refused against a bot: the engine places at random.
  update public.match_rounds set deadline_at = now() - interval '1 minute' where match_id = v_match and round between 4 and 6;
  v_failed := false;
  begin perform public.match_record_triple_round(v_match, 2,
    pg_temp.triple_hand(v_match, 'a', 2, array[1, 1, 1]), pg_temp.triple_hand(v_match, 'b', 2, array[3, 3, 3]), '["b", "b", "b"]', null);
  exception when others then v_failed := sqlerrm = 'round_expired'; end;
  assert v_failed, 'a late choice against a bot';
  perform public.match_record_triple_round(v_match, 2,
    pg_temp.triple_hand(v_match, 'a', 2, array[1, 1, 1], true), pg_temp.triple_hand(v_match, 'b', 2, array[3, 3, 3]), '["b", "b", "b"]', null);

  -- Round 3: 2 + 1 = 3 points each; the sum of scores decides (15+3+12 = 30 against 13+9+12 = 34).
  v_failed := false;
  begin perform public.match_record_triple_round(v_match, 3,
    pg_temp.triple_hand(v_match, 'a', 3, array[4, 4, 4]), pg_temp.triple_hand(v_match, 'b', 3, array[4, 4, 4]), '["a", null, null]', 'a');
  exception when others then v_failed := sqlerrm = 'result_mismatch'; end;
  assert v_failed, 'a wrong result';
  perform public.match_record_triple_round(v_match, 3,
    pg_temp.triple_hand(v_match, 'a', 3, array[4, 4, 4]), pg_temp.triple_hand(v_match, 'b', 3, array[4, 4, 4]), '["a", null, null]', 'b');
  select * into v_row from public.matches where id = v_match;
  assert v_row.status = 'finished' and v_row.result = 'b' and v_row.end_reason = 'completed', 'finished on the sum of scores';
  assert v_row.rounds_won_a = 3 and v_row.rounds_won_b = 3, 'points at the end';
  assert (select bot_wins from public.profiles where id = v_a) = v_bot_wins, 'no win';
  assert (select count(*) from public.round_plays where match_id = v_match) = 18, 'every card played once';
  assert (select count(distinct definition_id) from public.round_plays where match_id = v_match and side = 'a') = 9, 'nine different characters';

  v_state := public.match_state_payload(v_match, 'a');
  assert v_state ->> 'result' = 'loss' and jsonb_array_length(v_state -> 'rounds') = 3, 'final payload';
end $$;

-- Between players: friend code, three cards at once, the checks of the choices.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000f1';
  v_b uuid := '00000000-0000-4000-8000-0000000000f2';
  v_deck_a uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 9) s);
  v_deck_b uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_b order by acquired_at, id limit 9) s);
  v_lobby jsonb;
  v_match uuid;
  v_team_a public.match_teams;
  v_team_b public.match_teams;
  v_failed boolean;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);
  v_failed := false;
  begin perform public.create_lobby(v_deck_a[1:5], 'triple');
  exception when others then v_failed := sqlerrm = 'invalid_team_size'; end;
  assert v_failed, 'an Allarme Triplo lobby with five cards';
  v_lobby := public.create_lobby(v_deck_a, 'triple');
  assert v_lobby ->> 'format' = 'triple', 'lobby format';
  reset role;

  v_failed := false;
  begin perform public.match_join_lobby(v_b, v_lobby ->> 'code', v_deck_b[1:5], array[]::uuid[]);
  exception when others then v_failed := sqlerrm = 'invalid_team_size'; end;
  assert v_failed, 'a guest with five cards';
  v_match := public.match_join_lobby(v_b, v_lobby ->> 'code', v_deck_b, array[]::uuid[]);
  assert (select format from public.matches where id = v_match) = 'triple', 'a friendly Allarme Triplo';
  assert (select mode from public.matches where id = v_match) = 'friendly', 'friendly';
  select * into v_team_a from public.match_teams where match_id = v_match and side = 'a';
  select * into v_team_b from public.match_teams where match_id = v_match and side = 'b';

  -- One card at a time is the choice of the other formats.
  v_failed := false;
  begin perform public.match_submit_play(v_a, v_match, 1, v_team_a.card_instance_ids[1]);
  exception when others then v_failed := sqlerrm = 'invalid_format'; end;
  assert v_failed, 'a single card choice in an Allarme Triplo';

  v_failed := false;
  begin perform public.match_submit_triple(v_a, v_match, 1, v_team_a.card_instance_ids[2:4]);
  exception when others then v_failed := sqlerrm = 'invalid_placement'; end;
  assert v_failed, 'a card not drawn yet';
  v_failed := false;
  begin perform public.match_submit_triple(v_a, v_match, 1, array[v_team_a.card_instance_ids[1], v_team_a.card_instance_ids[1], v_team_a.card_instance_ids[2]]);
  exception when others then v_failed := sqlerrm = 'invalid_placement'; end;
  assert v_failed, 'a card on two threats';

  assert public.match_submit_triple(v_a, v_match, 1, v_team_a.card_instance_ids[1:3]) = 'waiting', 'waiting for b';
  -- A change of mind before the round is resolved.
  assert public.match_submit_triple(v_a, v_match, 1,
    array[v_team_a.card_instance_ids[3], v_team_a.card_instance_ids[1], v_team_a.card_instance_ids[2]]) = 'waiting', 'still waiting';
  assert (select count(*) from public.pending_plays where match_id = v_match and side = 'a') = 3, 'three choices';
  assert public.match_state_payload(v_match, 'b') -> 'rounds' -> 0 ->> 'opponent_has_chosen' = 'true', 'b sees that a has chosen';
  assert public.match_state_payload(v_match, 'b') -> 'rounds' -> 0 -> 'my_pending' = 'null'::jsonb, 'b sees nothing of a';
  assert public.match_state_payload(v_match, 'a') -> 'rounds' -> 0 -> 'my_pending' ->> 0 = v_team_a.card_instance_ids[3]::text, 'a sees its choice';
  assert public.match_submit_triple(v_b, v_match, 1, v_team_b.card_instance_ids[1:3]) = 'ready', 'both placed';
  assert jsonb_array_length(public.match_round_context(v_a, v_match) -> 'pending') = 6, 'the engine sees the six choices';
  assert (public.match_round_context(v_a, v_match) -> 'pending' -> 0 ->> 'round')::integer between 1 and 3, 'each with its contest';

  -- The record must follow the choices, and never place at random over a choice.
  v_failed := false;
  begin perform public.match_record_triple_round(v_match, 1,
    pg_temp.triple_hand(v_match, 'a', 1, array[5, 5, 5]), pg_temp.triple_hand(v_match, 'b', 1, array[4, 4, 4]), '["a", "a", "a"]', null);
  exception when others then v_failed := sqlerrm = 'choice_not_submitted'; end;
  assert v_failed, 'a placement other than the one submitted';
  v_failed := false;
  begin perform public.match_record_triple_round(v_match, 1,
    pg_temp.triple_hand(v_match, 'a', 1, array[5, 5, 5], true), pg_temp.triple_hand(v_match, 'b', 1, array[4, 4, 4]), '["a", "a", "a"]', null);
  exception when others then v_failed := sqlerrm = 'choice_ignored'; end;
  assert v_failed, 'a random placement over a choice';

  perform public.match_record_triple_round(v_match, 1,
    jsonb_build_array(
      pg_temp.triple_play(v_team_a.card_instance_ids[3], v_team_a.definition_ids[3], 5),
      pg_temp.triple_play(v_team_a.card_instance_ids[1], v_team_a.definition_ids[1], 5),
      pg_temp.triple_play(v_team_a.card_instance_ids[2], v_team_a.definition_ids[2], 5)),
    pg_temp.triple_hand(v_match, 'b', 1, array[4, 4, 4]), '["a", "a", "a"]', null);
  assert (select rounds_won_a from public.matches where id = v_match) = 3, 'a took the three threats';
  assert not exists (select 1 from public.pending_plays where match_id = v_match), 'choices cleared';

  -- Nobody placed in round 2 and the time is up: both placed at random.
  v_failed := false;
  begin perform public.match_record_triple_round(v_match, 2,
    pg_temp.triple_hand(v_match, 'a', 2, array[5, 5, 5], true), pg_temp.triple_hand(v_match, 'b', 2, array[4, 4, 4], true), '["a", "a", "a"]', null);
  exception when others then v_failed := sqlerrm = 'round_not_expired'; end;
  assert v_failed, 'placed at random before the deadline';
  update public.match_rounds set deadline_at = now() - interval '1 minute' where match_id = v_match and round between 4 and 6;
  v_failed := false;
  begin perform public.match_submit_triple(v_a, v_match, 2, v_team_a.card_instance_ids[4:6]);
  exception when others then v_failed := sqlerrm = 'round_expired'; end;
  assert v_failed, 'a choice after the deadline';
  perform public.match_record_triple_round(v_match, 2,
    pg_temp.triple_hand(v_match, 'a', 2, array[5, 5, 5], true), pg_temp.triple_hand(v_match, 'b', 2, array[4, 4, 4], true), '["a", "a", "a"]', null);
  assert (select current_round from public.matches where id = v_match) = 7, 'round 3 open';

  -- The queue: Allarme Triplo is friendly only.
  v_failed := false;
  begin perform public.match_queue_join(v_a, 'conquest', v_deck_a, array[]::uuid[], null, null, 'triple');
  exception when others then v_failed := sqlerrm = 'invalid_request'; end;
  assert v_failed, 'an Allarme Triplo in Conquest';
end $$;

rollback;
