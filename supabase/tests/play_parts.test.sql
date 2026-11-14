-- Integration test for the parts of a play's bonus (20261114100000_play_parts.sql): stored
-- with the round when the Edge Function sends them, checked, given back in the match state
-- to the player and, once the round is resolved, to the opponent. Service-only functions
-- are called as the database owner. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated', 'parts-a@example.test',
   '{"full_name": "Parti A"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- The check of the parts.
do $$
begin
  assert public.play_parts_valid('{"power": 3, "carried": 2, "pack": 0, "modifier": -2, "floor": 0}', 3), 'valid parts';
  assert not public.play_parts_valid('{"power": 3, "carried": 2, "pack": 0, "modifier": -2, "floor": 0}', 4), 'a sum that is not the bonus';
  assert not public.play_parts_valid('{"power": 3, "carried": 2, "pack": 0, "modifier": 0}', 5), 'a missing part';
  assert not public.play_parts_valid('{"power": 3, "carried": 2, "pack": 0, "modifier": 0, "floor": 0, "extra": 0}', 5), 'an extra part';
  assert not public.play_parts_valid('{"power": 2.5, "carried": 2.5, "pack": 0, "modifier": 0, "floor": 0}', 5), 'a fraction';
  assert not public.play_parts_valid('{"power": "5", "carried": 0, "pack": 0, "modifier": 0, "floor": 0}', 5), 'a text';
  assert not public.play_parts_valid('[5, 0, 0, 0, 0]', 5), 'an array';
end $$;

-- A bot match: the parts go in with the round and come back with the state.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000f1';
  v_team uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 5) s);
  v_bot uuid[] := (select array_agg(s.id) from (
    select id from public.card_definitions where rarity_code in ('beta', 'alfa') order by code limit 5) s);
  v_threats uuid[];
  v_match uuid;
  v_state jsonb;
  v_failed boolean;
  v_mine jsonb := '{"power": 3, "carried": 0, "pack": 0, "modifier": 0, "floor": 0}';
  v_theirs jsonb := '{"power": 0, "carried": 0, "pack": 0, "modifier": -2, "floor": 0}';
begin
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions
    where level = l.level and region = 'megara' and rarity_code is null
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;
  v_match := public.match_create_bot(v_a, 'easy', v_team, v_bot, v_threats);

  -- Wrong parts: the whole round is refused.
  v_failed := false;
  begin
    perform public.match_record_round_state(v_match, 1,
      jsonb_build_object('card_instance_id', v_team[1], 'definition_id', (select definition_id from public.card_instances where id = v_team[1]),
        'base', 9, 'bonus', 3, 'score', 12, 'highest', 9, 'auto_played', false, 'parts', '{"power": 1, "carried": 0, "pack": 0, "modifier": 0, "floor": 0}'::jsonb),
      jsonb_build_object('card_instance_id', null, 'definition_id', v_bot[1],
        'base', 3, 'bonus', 0, 'score', 3, 'highest', 3, 'auto_played', false),
      'a', null, 'a');
  exception when others then v_failed := sqlerrm = 'invalid_play_parts'; end;
  assert v_failed, 'parts that do not add up to the bonus were stored';
  assert not exists (select 1 from public.round_plays where match_id = v_match), 'a refused round left plays behind';

  v_state := public.match_record_round_state(v_match, 1,
    jsonb_build_object('card_instance_id', v_team[1], 'definition_id', (select definition_id from public.card_instances where id = v_team[1]),
      'base', 9, 'bonus', 3, 'score', 12, 'highest', 9, 'auto_played', false, 'parts', v_mine),
    jsonb_build_object('card_instance_id', null, 'definition_id', v_bot[1],
      'base', 5, 'bonus', -2, 'score', 3, 'highest', 3, 'auto_played', false, 'parts', v_theirs),
    'a', null, 'a');

  assert (select parts from public.round_plays where match_id = v_match and round = 1 and side = 'a') = v_mine, 'parts of side a';
  assert (select parts from public.round_plays where match_id = v_match and round = 1 and side = 'b') = v_theirs, 'parts of side b';
  assert v_state -> 'rounds' -> 0 -> 'my_play' -> 'parts' = v_mine, format('my parts in the state: %s', v_state -> 'rounds' -> 0 -> 'my_play');
  assert v_state -> 'rounds' -> 0 -> 'opponent_play' -> 'parts' = v_theirs, 'the opponent''s parts once resolved';
  assert (v_state ->> 'current_round')::integer = 2, 'the round went on';
  assert jsonb_array_length(v_state -> 'rounds') = jsonb_array_length(public.classic_match_state_payload(v_match, 'a') -> 'rounds'),
    'the rounds are the same';
  -- The round still open has no plays, so no parts.
  assert v_state -> 'rounds' -> 1 -> 'my_play' is null or jsonb_typeof(v_state -> 'rounds' -> 1 -> 'my_play') = 'null', 'parts on an open round';

  -- Seen from the other side, the parts swap.
  v_state := public.match_state_payload(v_match, 'b');
  assert v_state -> 'rounds' -> 0 -> 'my_play' -> 'parts' = v_theirs, 'side b sees its own parts';
  assert v_state -> 'rounds' -> 0 -> 'opponent_play' -> 'parts' = v_mine, 'side b sees the opponent''s parts';

  -- An Edge Function of before sends no parts: the round is stored as always.
  v_state := public.match_record_round_state(v_match, 2,
    jsonb_build_object('card_instance_id', v_team[2], 'definition_id', (select definition_id from public.card_instances where id = v_team[2]),
      'base', 9, 'bonus', 0, 'score', 9, 'highest', 9, 'auto_played', false),
    jsonb_build_object('card_instance_id', null, 'definition_id', v_bot[2],
      'base', 3, 'bonus', 0, 'score', 3, 'highest', 3, 'auto_played', false),
    'a', null, 'a');
  assert (select parts from public.round_plays where match_id = v_match and round = 2 and side = 'a') is null, 'parts out of nothing';
  assert v_state -> 'rounds' -> 1 -> 'my_play' -> 'parts' is null, 'parts in the state out of nothing';
  assert (v_state - 'server_now') = (public.match_state_payload(v_match, 'a') - 'server_now'), 'state differs from the payload';
end $$;

-- Players never call these functions themselves.
do $$
begin
  assert not has_function_privilege('authenticated', 'public.store_play_parts(uuid, integer, text, jsonb)', 'execute'), 'players store parts';
  assert not has_function_privilege('authenticated', 'public.with_play_parts(jsonb, uuid, text)', 'execute'), 'players read parts directly';
  assert not has_function_privilege('anon', 'public.play_parts_valid(jsonb, integer)', 'execute'), 'anonymous check';
end $$;

rollback;
