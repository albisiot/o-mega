-- Integration test for Quadrante (SPEC §5.14): configuration, decks of ten, matches
-- against a bot and between players, the move checks, the payload and the result.
-- Service-only functions are called as the database owner.
-- Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'quadrant-a@example.test',
   '{"full_name": "Quadrante A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated', 'quadrant-b@example.test',
   '{"full_name": "Quadrante B"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e2", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- A cell of the grid: the card with its sides for the match's abilities, and seals.
create function pg_temp.q_cell(p_match uuid, p_side text, p_definition uuid, p_instance uuid,
  p_x integer, p_y integer, p_rotation integer, p_seals_a integer, p_seals_b integer)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'x', p_x, 'y', p_y, 'side', p_side, 'definition_id', p_definition, 'instance_id', p_instance,
    'values', to_jsonb(public.quadrant_values(p_definition, m.quadrant_abilities, p_rotation)),
    'seals_a', p_seals_a, 'seals_b', p_seals_b
  )
  from public.matches m where m.id = p_match
$$;

create function pg_temp.q_play(p_definition uuid, p_instance uuid, p_x integer, p_y integer, p_rotation integer,
  p_placed integer default 0, p_removed integer default 0, p_auto boolean default false)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'card_instance_id', p_instance, 'definition_id', p_definition, 'x', p_x, 'y', p_y, 'rotation', p_rotation,
    'beaten', 0, 'placed', p_placed, 'removed', p_removed, 'auto_played', p_auto
  )
$$;

-- The first card of a side's hand.
create function pg_temp.q_first_in_hand(p_match uuid, p_side text, out o_definition uuid, out o_instance uuid)
language sql
as $$
  select h.definition_id, h.instance_id from public.quadrant_hand(p_match, p_side) h order by h.ord limit 1
$$;

-- Configuration and formats.
do $$
begin
  assert public.config_int('quadrant.size') = 4 and public.config_int('quadrant.deck_size') = 10, 'size and deck';
  assert public.config_int('quadrant.hand_size') = 3 and public.config_int('quadrant.cards_per_side') = 8, 'hand and cards';
  assert public.config_int('quadrant.seals') = 15 and public.config_int('quadrant.first_player_seals') = 3, 'seals';
  assert public.team_size_for('quadrant') = 10 and public.team_size_for('quadrant_shifting') = 10, 'a deck of ten';
  assert public.team_size_for('classic') = 5 and public.team_size_for('triple') = 9, 'other formats unchanged';
  assert public.quadrant_side_of_move('b', 1) = 'b' and public.quadrant_side_of_move('b', 2) = 'a', 'turns';
end $$;

-- Cells: a fixed grid and a shifting one.
do $$
declare
  v_one jsonb := '[{"x": 0, "y": 0}]';
  v_row jsonb := '[{"x": 0, "y": 0}, {"x": 1, "y": 0}, {"x": 2, "y": 0}, {"x": 3, "y": 0}]';
begin
  assert public.quadrant_cell_legal('[]', 'quadrant', 3, 3) and not public.quadrant_cell_legal('[]', 'quadrant', 4, 0), 'first card, fixed';
  assert public.quadrant_cell_legal('[]', 'quadrant_shifting', 0, 0) and not public.quadrant_cell_legal('[]', 'quadrant_shifting', 1, 0), 'first card, shifting';
  assert public.quadrant_cell_legal(v_one, 'quadrant', 1, 0) and not public.quadrant_cell_legal(v_one, 'quadrant', 1, 1), 'next to a card';
  assert not public.quadrant_cell_legal(v_one, 'quadrant', 0, 0), 'a free cell';
  assert not public.quadrant_cell_legal(v_one, 'quadrant', -1, 0) and public.quadrant_cell_legal(v_one, 'quadrant_shifting', -1, 0), 'borders';
  assert not public.quadrant_cell_legal(v_row, 'quadrant_shifting', 4, 0) and not public.quadrant_cell_legal(v_row, 'quadrant_shifting', -1, 0),
    'four columns freeze left and right';
  assert public.quadrant_cell_legal(v_row, 'quadrant_shifting', 0, -1) and public.quadrant_cell_legal(v_row, 'quadrant_shifting', 3, 1), 'rows still free';
end $$;

-- A whole match against a bot, the bot opening.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000e1';
  v_deck uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 10) s);
  v_bot uuid[] := (select array_agg(s.id) from (
    select id from public.card_definitions where is_active order by code limit 10) s);
  v_match uuid;
  v_row public.matches;
  v_state jsonb;
  v_failed boolean;
  v_side text;
  v_card record;
  v_board jsonb;
  v_cell record;
  v_bot_wins integer := (select bot_wins from public.profiles where id = v_a);
  v_def uuid;
begin
  v_failed := false;
  begin perform public.match_create_quadrant_bot(v_a, 'medium', 'quadrant', v_deck[1:9], v_bot);
  exception when others then v_failed := sqlerrm = 'invalid_team_size'; end;
  assert v_failed, 'a deck of nine was accepted';
  v_failed := false;
  begin perform public.match_create_quadrant_bot(v_a, 'medium', 'triple', v_deck, v_bot);
  exception when others then v_failed := sqlerrm = 'invalid_request'; end;
  assert v_failed, 'another format was accepted';
  v_failed := false;
  begin perform public.match_create_quadrant_bot(v_a, 'medium', 'quadrant', v_deck, v_bot, array['FOR', 'FOR', 'VEL', 'RES']);
  exception when others then v_failed := sqlerrm = 'invalid_request'; end;
  assert v_failed, 'the same ability twice was accepted';

  -- Drawn by the database: four distinct abilities and a side.
  v_match := public.match_create_quadrant_bot(v_a, 'easy', 'quadrant_shifting', v_deck, v_bot);
  select * into v_row from public.matches where id = v_match;
  assert (select count(distinct u) from unnest(v_row.quadrant_abilities) u) = 4, 'four abilities';
  assert v_row.quadrant_first in ('a', 'b') and v_row.quadrant_board = '[]'::jsonb, 'first side, empty grid';
  assert v_row.threat_ids = '{}' and v_row.threat_modifiers = '[]'::jsonb, 'no threats';
  perform public.finish_match(v_match, 'b', 'forfeit');

  v_match := public.match_create_quadrant_bot(v_a, 'hard', 'quadrant', v_deck, v_bot, array['FOR', 'VEL', 'RES', 'INT'], 'b');
  select * into v_row from public.matches where id = v_match;
  assert v_row.format = 'quadrant' and v_row.mode = 'bot' and v_row.quadrant_first = 'b', 'match shape';
  assert (select count(*) from public.match_rounds where match_id = v_match) = 1 and v_row.current_round = 1, 'move 1 open';
  assert (select count(*) from public.quadrant_hand(v_match, 'a')) = 3 and (select count(*) from public.quadrant_hand(v_match, 'b')) = 3, 'hands of three';

  v_state := public.match_state_payload(v_match, 'a');
  assert v_state ->> 'format' = 'quadrant' and v_state ->> 'variant' = 'fixed', 'payload format';
  assert v_state ->> 'to_move' = 'opponent' and not (v_state ->> 'i_open')::boolean, 'the bot opens';
  assert jsonb_array_length(v_state -> 'my_hand') = 3 and (v_state ->> 'my_deck_left')::integer = 7, 'own hand';
  assert (v_state ->> 'opponent_hand_count')::integer = 3, 'opponent hand size';
  assert v_state -> 'abilities' -> 0 ->> 'code' = 'FOR' and v_state -> 'abilities' -> 3 ->> 'code' = 'INT', 'abilities in side order';

  -- Wrong turn: the player's card on move 1.
  select * into v_card from pg_temp.q_first_in_hand(v_match, 'a');
  v_failed := false;
  begin perform public.match_record_quadrant_move(v_match, 1,
    pg_temp.q_play(v_card.o_definition, v_card.o_instance, 1, 1, 0, 3),
    jsonb_build_array(pg_temp.q_cell(v_match, 'a', v_card.o_definition, v_card.o_instance, 1, 1, 0, 3, 0)), null);
  exception when others then v_failed := sqlerrm = 'character_not_available'; end;
  assert v_failed, 'a card out of turn was accepted';

  -- A bot card not in its hand.
  v_def := (select u from unnest(v_bot) u where u not in (select definition_id from public.quadrant_hand(v_match, 'b')) limit 1);
  v_failed := false;
  begin perform public.match_record_quadrant_move(v_match, 1, pg_temp.q_play(v_def, null, 1, 1, 0, 3),
    jsonb_build_array(pg_temp.q_cell(v_match, 'b', v_def, null, 1, 1, 0, 0, 3)), null);
  exception when others then v_failed := sqlerrm = 'character_not_available'; end;
  assert v_failed, 'a card out of the hand was accepted';

  -- Sides that are not the card's.
  select * into v_card from pg_temp.q_first_in_hand(v_match, 'b');
  v_failed := false;
  begin perform public.match_record_quadrant_move(v_match, 1, pg_temp.q_play(v_card.o_definition, null, 1, 1, 1, 3),
    jsonb_build_array(pg_temp.q_cell(v_match, 'b', v_card.o_definition, null, 1, 1, 0, 0, 3)
      || jsonb_build_object('values', '[10, 10, 10, 10]'::jsonb)), null);
  exception when others then v_failed := sqlerrm = 'invalid_board'; end;
  assert v_failed, 'made-up sides were accepted';

  -- Seals that do not add up.
  v_failed := false;
  begin perform public.match_record_quadrant_move(v_match, 1, pg_temp.q_play(v_card.o_definition, null, 1, 1, 1, 2),
    jsonb_build_array(pg_temp.q_cell(v_match, 'b', v_card.o_definition, null, 1, 1, 1, 0, 3)), null);
  exception when others then v_failed := sqlerrm = 'invalid_points'; end;
  assert v_failed, 'seals that do not match were accepted';

  -- Out of the grid.
  v_failed := false;
  begin perform public.match_record_quadrant_move(v_match, 1, pg_temp.q_play(v_card.o_definition, null, 4, 1, 1, 3),
    jsonb_build_array(pg_temp.q_cell(v_match, 'b', v_card.o_definition, null, 4, 1, 1, 0, 3)), null);
  exception when others then v_failed := sqlerrm = 'invalid_placement'; end;
  assert v_failed, 'a cell out of the grid was accepted';

  -- The bot opens at (1, 1) turned once, with its three free seals.
  perform public.match_record_quadrant_move(v_match, 1, pg_temp.q_play(v_card.o_definition, null, 1, 1, 1, 3),
    jsonb_build_array(pg_temp.q_cell(v_match, 'b', v_card.o_definition, null, 1, 1, 1, 0, 3)), null);
  select * into v_row from public.matches where id = v_match;
  assert v_row.current_round = 2 and v_row.points_b = 3 and v_row.points_a = 0, 'move 1 stored';
  assert (select count(*) from public.quadrant_hand(v_match, 'b')) = 3, 'the bot drew a card';
  assert (select rotation from public.round_plays where match_id = v_match and round = 1) = 1, 'turn stored';

  -- The player's card not next to a card in play.
  select * into v_card from pg_temp.q_first_in_hand(v_match, 'a');
  v_failed := false;
  begin perform public.match_record_quadrant_move(v_match, 2, pg_temp.q_play(v_card.o_definition, v_card.o_instance, 3, 3, 0),
    v_row.quadrant_board || pg_temp.q_cell(v_match, 'a', v_card.o_definition, v_card.o_instance, 3, 3, 0, 0, 0), null);
  exception when others then v_failed := sqlerrm = 'invalid_placement'; end;
  assert v_failed, 'a lone card was accepted';

  -- The player's card above it takes one of the bot's seals away (a ripple, made up here).
  perform public.match_record_quadrant_move(v_match, 2, pg_temp.q_play(v_card.o_definition, v_card.o_instance, 1, 0, 0, 0, 1),
    jsonb_build_array(
      pg_temp.q_cell(v_match, 'b', (v_row.quadrant_board -> 0 ->> 'definition_id')::uuid, null, 1, 1, 1, 0, 2),
      pg_temp.q_cell(v_match, 'a', v_card.o_definition, v_card.o_instance, 1, 0, 0, 0, 0)), null);
  select * into v_row from public.matches where id = v_match;
  assert v_row.points_b = 2 and v_row.current_round = 3, 'a removal is stored';

  -- Every other move with no seals, until the grid is full; the result is checked.
  for i in (select current_round from public.matches where id = v_match) .. 16 loop
    select * into v_row from public.matches where id = v_match;
    v_side := public.quadrant_side_of_move(v_row.quadrant_first, i);
    select * into v_card from pg_temp.q_first_in_hand(v_match, v_side);
    select gx as x, gy as y into v_cell from generate_series(0, 3) as gx, generate_series(0, 3) as gy
    where public.quadrant_cell_legal(v_row.quadrant_board, 'quadrant', gx, gy)
    order by gy, gx limit 1;
    v_board := v_row.quadrant_board || pg_temp.q_cell(v_match, v_side, v_card.o_definition, v_card.o_instance, v_cell.x, v_cell.y, 0, 0, 0);
    if i = 16 then
      v_failed := false;
      begin perform public.match_record_quadrant_move(v_match, i, pg_temp.q_play(v_card.o_definition, v_card.o_instance, v_cell.x, v_cell.y, 0), v_board, null);
      exception when others then v_failed := sqlerrm = 'result_mismatch'; end;
      assert v_failed, 'a match without a result was accepted';
      perform public.match_record_quadrant_move(v_match, i, pg_temp.q_play(v_card.o_definition, v_card.o_instance, v_cell.x, v_cell.y, 0), v_board,
        public.quadrant_result_of(v_board, v_row.quadrant_first));
    else
      perform public.match_record_quadrant_move(v_match, i, pg_temp.q_play(v_card.o_definition, v_card.o_instance, v_cell.x, v_cell.y, 0), v_board, null);
    end if;
  end loop;

  select * into v_row from public.matches where id = v_match;
  assert v_row.status = 'finished' and v_row.end_reason = 'completed', 'finished';
  assert jsonb_array_length(v_row.quadrant_board) = 16, 'a full grid';
  assert (select count(*) from public.quadrant_hand(v_match, 'a')) = 2, 'two cards left in hand';
  v_state := public.match_state_payload(v_match, 'a');
  assert v_state ->> 'to_move' is null and v_state ->> 'result' in ('win', 'loss'), 'final payload';
  assert jsonb_array_length(v_state -> 'moves') = 16 and jsonb_array_length(v_state -> 'board') = 16, 'moves and grid in the payload';
  assert (select bot_wins + bot_losses from public.profiles where id = v_a) >= v_bot_wins + 1, 'bot statistics';
end $$;

-- The result: seals, then cards controlled, then the side that played second.
do $$
begin
  assert public.quadrant_result_of('[{"seals_a": 3, "seals_b": 0}, {"seals_a": 0, "seals_b": 2}]', 'a') = 'a', 'more seals';
  assert public.quadrant_result_of('[{"seals_a": 3, "seals_b": 0}, {"seals_a": 0, "seals_b": 2}, {"seals_a": 0, "seals_b": 1}]', 'a') = 'b',
    'more cards controlled';
  assert public.quadrant_result_of('[{"seals_a": 2, "seals_b": 0}, {"seals_a": 0, "seals_b": 2}]', 'a') = 'b', 'the second side';
  assert public.quadrant_result_of('[{"seals_a": 2, "seals_b": 0}, {"seals_a": 0, "seals_b": 2}]', 'b') = 'a', 'the second side, the other way';
end $$;

-- Between players: only on one's turn, a card of the hand, a legal cell; the choice is recorded.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000e1';
  v_b uuid := '00000000-0000-4000-8000-0000000000e2';
  v_deck_a uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 10) s);
  v_deck_b uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_b order by acquired_at, id limit 10) s);
  v_lobby jsonb;
  v_match uuid;
  v_row public.matches;
  v_card record;
  v_failed boolean;
  v_other uuid;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);
  v_lobby := public.create_lobby(v_deck_a, 'quadrant_shifting');
  assert public.get_lobby_format(lower(v_lobby ->> 'code')) = 'quadrant_shifting', 'the format of a code';
  assert public.get_lobby_format('ZZZZZZ') is null, 'an unknown code';
  reset role;
  perform set_config('request.jwt.claims', '{}', true);
  assert public.get_lobby_format(v_lobby ->> 'code') is null, 'nothing without a signed-in player';
  assert v_lobby ->> 'format' = 'quadrant_shifting', 'lobby format';

  v_match := public.match_join_lobby(v_b, v_lobby ->> 'code', v_deck_b, null);
  select * into v_row from public.matches where id = v_match;
  assert v_row.format = 'quadrant_shifting' and v_row.mode = 'friendly' and v_row.player_b = v_b, 'friendly match';

  -- The side that does not open cannot move.
  v_other := case v_row.quadrant_first when 'a' then v_b else v_a end;
  select * into v_card from pg_temp.q_first_in_hand(v_match, case v_row.quadrant_first when 'a' then 'b' else 'a' end);
  v_failed := false;
  begin perform public.match_submit_quadrant(v_other, v_match, 1, v_card.o_instance, 0, 0, 0);
  exception when others then v_failed := sqlerrm = 'not_your_turn'; end;
  assert v_failed, 'a move out of turn was accepted';

  select * into v_card from pg_temp.q_first_in_hand(v_match, v_row.quadrant_first);
  v_failed := false;
  begin perform public.match_submit_quadrant(case v_row.quadrant_first when 'a' then v_a else v_b end, v_match, 1, v_card.o_instance, 1, 0, 0);
  exception when others then v_failed := sqlerrm = 'invalid_placement'; end;
  assert v_failed, 'the first card off the origin of a shifting grid was accepted';

  assert public.match_submit_quadrant(case v_row.quadrant_first when 'a' then v_a else v_b end, v_match, 1, v_card.o_instance, 0, 0, 2) = 'ready', 'submitted';
  assert (select rotation from public.pending_plays where match_id = v_match and round = 1) = 2, 'pending choice';

  -- Only the submitted choice can be recorded.
  v_failed := false;
  begin perform public.match_record_quadrant_move(v_match, 1, pg_temp.q_play(v_card.o_definition, v_card.o_instance, 0, 0, 1, 3),
    jsonb_build_array(pg_temp.q_cell(v_match, v_row.quadrant_first, v_card.o_definition, v_card.o_instance, 0, 0, 1,
      case v_row.quadrant_first when 'a' then 3 else 0 end, case v_row.quadrant_first when 'a' then 0 else 3 end)), null);
  exception when others then v_failed := sqlerrm = 'choice_not_submitted'; end;
  assert v_failed, 'a choice that was not submitted was accepted';

  perform public.match_record_quadrant_move(v_match, 1, pg_temp.q_play(v_card.o_definition, v_card.o_instance, 0, 0, 2, 3),
    jsonb_build_array(pg_temp.q_cell(v_match, v_row.quadrant_first, v_card.o_definition, v_card.o_instance, 0, 0, 2,
      case v_row.quadrant_first when 'a' then 3 else 0 end, case v_row.quadrant_first when 'a' then 0 else 3 end)), null);
  assert not exists (select 1 from public.pending_plays where match_id = v_match), 'choice consumed';

  -- A card at a time through the classic submit is refused.
  select * into v_card from pg_temp.q_first_in_hand(v_match, case v_row.quadrant_first when 'a' then 'b' else 'a' end);
  v_failed := false;
  begin perform public.match_submit_play(v_other, v_match, 2, v_card.o_instance);
  exception when others then v_failed := sqlerrm in ('invalid_format', 'invalid_placement'); end;
  assert v_failed, 'a classic choice was accepted in a Quadrante';

  -- An automatic move before the deadline is refused.
  v_failed := false;
  begin perform public.match_record_quadrant_move(v_match, 2, pg_temp.q_play(v_card.o_definition, v_card.o_instance, 1, 0, 0, 0, 0, true),
    (select quadrant_board from public.matches where id = v_match)
      || pg_temp.q_cell(v_match, case v_row.quadrant_first when 'a' then 'b' else 'a' end, v_card.o_definition, v_card.o_instance, 1, 0, 0, 0, 0), null);
  exception when others then v_failed := sqlerrm = 'round_not_expired'; end;
  assert v_failed, 'an automatic move before the deadline was accepted';

  perform public.finish_match(v_match, 'draw', 'forfeit');
end $$;

-- Queue: each grid pairs only with itself.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000e1';
  v_b uuid := '00000000-0000-4000-8000-0000000000e2';
  v_deck_a uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 10) s);
  v_deck_b uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_b order by acquired_at, id limit 10) s);
  v_match uuid;
begin
  assert public.match_queue_join(v_a, 'friendly', v_deck_a, null, null, null, 'quadrant') is null, 'queued';
  assert public.match_queue_join(v_b, 'friendly', v_deck_b, null, null, null, 'quadrant_shifting') is null, 'the other grid waits';
  v_match := public.match_queue_join(v_b, 'friendly', v_deck_b, null, null, null, 'quadrant');
  assert v_match is not null and (select format from public.matches where id = v_match) = 'quadrant', 'paired on the same grid';
end $$;

-- Daily objectives may name the grids.
do $$
begin
  assert public.daily_objective_params_valid('matches_won', '{"format": "quadrant"}'), 'fixed grid';
  assert public.daily_objective_params_valid('matches_won', '{"format": "quadrant_shifting"}'), 'shifting grid';
end $$;

rollback;
