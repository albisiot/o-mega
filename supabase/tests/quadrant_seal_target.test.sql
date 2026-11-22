-- Integration test for the seal target of Quadrante (SPEC §5.14, §8.2): seals have no
-- limit; an event may set a target, which only an admin can choose, within the limits;
-- a Quadrante created during the event takes it, and the match ends at the end of the
-- first round in which a side has it. Service-only functions are called as the database owner.
-- Runs inside a rolled-back transaction:
--   npm run test:db

begin;

-- Whatever an admin set in the real database: the Quadrante and its moving grid are open.
update public.mode_availability set state = 'on' where key in ('quadrant', 'quadrant_shifting');

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000e6', 'authenticated', 'authenticated', 'quadrant-target@example.test',
   '{"full_name": "Quadrante Traguardo"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000e7', 'authenticated', 'authenticated', 'quadrant-target-admin@example.test',
   '{"full_name": "Quadrante Admin"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e6", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e7", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- No other event in the way of the ones this test runs.
update public.events set is_active = false where is_active;

-- Configuration: no limit of seals any more.
do $$
begin
  assert not exists (select 1 from public.game_config where key in ('quadrant.seals', 'quadrant.fixed_grid_threats.seals')),
    'no seal limit';
  assert public.config_int('quadrant.seal_target.min') = 5 and public.config_int('quadrant.seal_target.max') = 60
     and public.config_int('quadrant.seal_target.suggested') = 12, 'target limits';
end $$;

-- Only an admin saves the target, within the limits.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e6", "role": "authenticated"}', true);
do $$
declare
  v_rome timestamp := (now() at time zone 'Europe/Rome')::timestamp;
begin
  perform public.admin_save_event('Corsa ai Sigilli', '', v_rome + interval '1 day', v_rome + interval '2 days',
    '{}'::jsonb, '[{"points": 100, "coins": 10}]'::jsonb, p_quadrant_seal_target => 12);
  raise exception 'ASSERT: a player saved an event';
exception when insufficient_privilege then
  assert sqlerrm = 'not_admin', sqlerrm;
end $$;

reset role;
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000000e7');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e7", "role": "authenticated"}', true);
do $$
declare
  v_rome timestamp := (now() at time zone 'Europe/Rome')::timestamp;
  v_payload jsonb;
begin
  begin
    perform public.admin_save_event('Corsa ai Sigilli', '', v_rome + interval '1 day', v_rome + interval '2 days',
      '{}'::jsonb, '[{"points": 100, "coins": 10}]'::jsonb, p_quadrant_seal_target => 61);
    raise exception 'ASSERT: a target above the limit was saved';
  exception when raise_exception then
    assert sqlerrm = 'event_invalid_seal_target', sqlerrm;
  end;
  v_payload := public.admin_save_event('Corsa ai Sigilli', '', v_rome + interval '1 day', v_rome + interval '2 days',
    '{}'::jsonb, '[{"points": 100, "coins": 10}]'::jsonb, p_quadrant_seal_target => 12);
  assert (select (e ->> 'quadrant_seal_target')::integer from jsonb_array_elements(v_payload -> 'events') e
          where e ->> 'title' = 'Corsa ai Sigilli') = 12, 'target saved';
  assert (v_payload -> 'quadrant_seal_target' ->> 'suggested')::integer = 12, 'limits for the editor';
end $$;
reset role;

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000e6';
  v_deck uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 10) s);
  v_bot uuid[] := (select array_agg(s.id) from (
    select id from public.card_definitions where is_active order by code limit 10) s);
  v_match uuid;
  v_row public.matches;
  v_state jsonb;
  v_definition uuid;
  v_cell jsonb;
  v_board jsonb;
  v_instance uuid;
  v_failed boolean;
begin
  -- Without an event: no target, and no limit of seals (21 on the first card, made up here).
  v_match := public.match_create_quadrant_bot(v_a, 'medium', 'quadrant_shifting', v_deck, v_bot, array['FOR', 'VEL', 'RES', 'INT'], 'b');
  select * into v_row from public.matches where id = v_match;
  assert v_row.quadrant_seal_target is null, 'no target without an event';
  assert public.match_state_payload(v_match, 'a') -> 'seal_target' = 'null'::jsonb, 'no target in the payload';
  assert not (public.match_state_payload(v_match, 'a') ? 'seals_per_side'), 'no seals per side';
  v_definition := (select h.definition_id from public.quadrant_hand(v_match, 'b') h order by h.ord limit 1);
  perform public.match_record_quadrant_move(v_match, 1,
    jsonb_build_object('card_instance_id', null, 'definition_id', v_definition, 'x', 0, 'y', 0, 'rotation', 0,
      'beaten', 0, 'placed', 21, 'removed', 0, 'auto_played', false),
    jsonb_build_array(jsonb_build_object(
      'x', 0, 'y', 0, 'side', 'b', 'definition_id', v_definition, 'instance_id', null,
      'values', to_jsonb(public.quadrant_values(v_definition, v_row.quadrant_abilities, 0)), 'seals_a', 0, 'seals_b', 21)), null);
  select * into v_row from public.matches where id = v_match;
  assert v_row.points_b = 21 and v_row.status = 'active', '21 seals, the match goes on';
  perform public.finish_match(v_match, 'b', 'forfeit');

  -- During an event with a target of 3: the match takes it and ends when the bot reaches it.
  insert into public.events (title, starts_at, ends_at, points, quadrant_seal_target)
  values ('Corsa breve', now() - interval '1 hour', now() + interval '1 hour', '{}', 3);
  v_match := public.match_create_quadrant_bot(v_a, 'medium', 'quadrant', v_deck, v_bot, array['FOR', 'VEL', 'RES', 'INT'], 'b');
  select * into v_row from public.matches where id = v_match;
  assert v_row.quadrant_seal_target = 3, 'the event target';
  v_state := public.match_state_payload(v_match, 'a');
  assert (v_state ->> 'seal_target')::integer = 3, 'target in the payload';
  assert (public.match_round_context(v_a, v_match) -> 'match' ->> 'quadrant_seal_target')::integer = 3, 'target for the Edge Function';

  -- Move 1: the bot opens with its 3 free seals (made up here). It has the target, but the round is not over.
  v_definition := (select h.definition_id from public.quadrant_hand(v_match, 'b') h order by h.ord limit 1);
  v_cell := jsonb_build_object(
    'x', 1, 'y', 1, 'side', 'b', 'definition_id', v_definition, 'instance_id', null,
    'values', to_jsonb(public.quadrant_values(v_definition, v_row.quadrant_abilities, 0)), 'seals_a', 0, 'seals_b', 3);
  v_failed := false;
  begin perform public.match_record_quadrant_move(v_match, 1,
    jsonb_build_object('card_instance_id', null, 'definition_id', v_definition, 'x', 1, 'y', 1, 'rotation', 0,
      'beaten', 0, 'placed', 3, 'removed', 0, 'auto_played', false),
    jsonb_build_array(v_cell), 'b');
  exception when others then v_failed := sqlerrm = 'result_mismatch'; end;
  assert v_failed, 'the match ended before the end of the round';
  perform public.match_record_quadrant_move(v_match, 1,
    jsonb_build_object('card_instance_id', null, 'definition_id', v_definition, 'x', 1, 'y', 1, 'rotation', 0,
      'beaten', 0, 'placed', 3, 'removed', 0, 'auto_played', false),
    jsonb_build_array(v_cell), null);
  assert (select status from public.matches where id = v_match) = 'active', 'the round goes on';

  -- Move 2: the player's card next to it, no seals. The round is over and the bot has more: it wins.
  select h.definition_id, h.instance_id into v_definition, v_instance
  from public.quadrant_hand(v_match, 'a') h order by h.ord limit 1;
  v_board := jsonb_build_array(v_cell, jsonb_build_object(
    'x', 2, 'y', 1, 'side', 'a', 'definition_id', v_definition, 'instance_id', v_instance,
    'values', to_jsonb(public.quadrant_values(v_definition, v_row.quadrant_abilities, 0)), 'seals_a', 0, 'seals_b', 0));
  -- The timer ran out: the server plays the player's move (auto_played).
  update public.match_rounds set deadline_at = now() - interval '1 minute' where match_id = v_match and round = 2;
  v_failed := false;
  begin perform public.match_record_quadrant_move(v_match, 2,
    jsonb_build_object('card_instance_id', v_instance, 'definition_id', v_definition, 'x', 2, 'y', 1, 'rotation', 0,
      'beaten', 0, 'placed', 0, 'removed', 0, 'auto_played', true),
    v_board, null);
  exception when others then v_failed := sqlerrm = 'result_mismatch'; end;
  assert v_failed, 'a match past its target went on';
  perform public.match_record_quadrant_move(v_match, 2,
    jsonb_build_object('card_instance_id', v_instance, 'definition_id', v_definition, 'x', 2, 'y', 1, 'rotation', 0,
      'beaten', 0, 'placed', 0, 'removed', 0, 'auto_played', true),
    v_board, 'b');
  select * into v_row from public.matches where id = v_match;
  assert v_row.status = 'finished' and v_row.result = 'b' and v_row.end_reason = 'completed', 'the bot had more seals at the target';
  assert (public.match_state_payload(v_match, 'a') ->> 'result') = 'loss', 'final payload';
end $$;

rollback;
