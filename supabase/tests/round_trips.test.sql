-- Integration test for the one-request functions of the "match" Edge Function
-- (match_round_context, match_record_round_state, match_state_for_user,
-- emergency_play_context, emergency_record_play_state) and for the bot matches'
-- silent broadcasts. Service-only functions are called as the database owner.
-- Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', 'trips-a@example.test',
   '{"full_name": "Viaggi A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000c2', 'authenticated', 'authenticated', 'trips-b@example.test',
   '{"full_name": "Viaggi B"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000c2", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000c1", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- A bot match: context, a round stored in one request, the state by user id.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000c1';
  v_b uuid := '00000000-0000-4000-8000-0000000000c2';
  v_team uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 5) s);
  v_bot uuid[] := (select array_agg(s.id) from (
    select id from public.card_definitions where rarity_code in ('beta', 'alfa') order by code limit 5) s);
  v_threats uuid[];
  v_match uuid;
  v_context jsonb;
  v_state jsonb;
  v_play_a jsonb;
  v_play_b jsonb;
  v_failed boolean;
begin
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions
    where level = l.level
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;
  v_match := public.match_create_bot(v_a, 'easy', v_team, v_bot, v_threats);

  -- The context holds what the engine needs, and only for the match's players.
  v_context := public.match_round_context(v_a, v_match);
  assert v_context ->> 'side' = 'a', format('side %s', v_context ->> 'side');
  assert v_context -> 'match' ->> 'status' = 'active', 'status';
  assert v_context -> 'match' ->> 'bot_difficulty' = 'easy', 'difficulty';
  assert (v_context -> 'match' ->> 'current_round')::integer = 1, 'current round';
  assert v_context -> 'match' -> 'threat_ids' = to_jsonb(v_threats), 'threats';
  assert jsonb_array_length(v_context -> 'teams') = 2, 'teams';
  assert jsonb_array_length(v_context -> 'rounds') = 1, 'rounds';
  assert v_context -> 'rounds' -> 0 ->> 'resolved_at' is null, 'first round already resolved';
  assert v_context -> 'plays' = '[]'::jsonb and v_context -> 'pending' = '[]'::jsonb, 'plays before the first round';

  v_failed := false;
  begin perform public.match_round_context(v_b, v_match);
  exception when others then v_failed := sqlerrm = 'match_not_found'; end;
  assert v_failed, 'context given to someone outside the match';

  -- Storing a round answers with the state the player sees.
  v_play_a := jsonb_build_object(
    'card_instance_id', v_team[1],
    'definition_id', (select definition_id from public.card_instances where id = v_team[1]),
    'base', 9, 'bonus', 0, 'score', 9, 'highest', 9, 'auto_played', false);
  v_play_b := jsonb_build_object(
    'card_instance_id', null, 'definition_id', v_bot[1],
    'base', 3, 'bonus', 0, 'score', 3, 'highest', 3, 'auto_played', false);
  v_state := public.match_record_round_state(v_match, 1, v_play_a, v_play_b, 'a', null, 'a');
  assert (v_state ->> 'current_round')::integer = 2, format('round after storing: %s', v_state ->> 'current_round');
  assert (v_state -> 'rounds_won' ->> 'me')::integer = 1, 'round not won';
  assert (v_state - 'server_now') = (public.match_state_payload(v_match, 'a') - 'server_now'), 'state differs from the payload';

  -- The checks of match_record_round still hold.
  v_failed := false;
  begin perform public.match_record_round_state(v_match, 1, v_play_a, v_play_b, 'a', null, 'a');
  exception when others then v_failed := sqlerrm = 'round_already_resolved'; end;
  assert v_failed, 'the same round was stored twice';

  v_context := public.match_round_context(v_a, v_match);
  assert jsonb_array_length(v_context -> 'plays') = 2, 'plays after the round';
  assert (v_context -> 'match' ->> 'current_round')::integer = 2, 'context round after storing';

  -- Nobody listens to a bot match: no broadcast.
  assert not exists (select 1 from realtime.messages where topic = 'match:' || v_match), 'a bot match sent a broadcast';

  assert (public.match_state_for_user(v_match, v_a) - 'server_now') = (public.match_state_payload(v_match, 'a') - 'server_now'),
    'state for the player differs from the payload';
  v_failed := false;
  begin perform public.match_state_for_user(v_match, v_b);
  exception when others then v_failed := sqlerrm = 'match_not_found'; end;
  assert v_failed, 'state given to someone outside the match';
end $$;

-- Emergenza: today's attempt in one request, a play stored in one request.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000c1';
  v_squad uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 8) s);
  v_threats uuid[];
  v_context jsonb;
  v_state jsonb;
begin
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 2, 3, 4, 5, 6, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level
    order by code offset (case when l.ord >= 7 then 1 else 0 end) limit 1
  ) t;

  v_context := public.emergency_play_context(v_a);
  assert jsonb_typeof(v_context -> 'run') = 'null', 'run before starting';
  assert v_context -> 'plays' = '[]'::jsonb, 'plays before starting';

  -- Today's draw, if there is one already, stays as it is.
  perform public.emergency_ensure_day(v_threats);
  perform public.emergency_start(v_a, v_squad);

  v_context := public.emergency_play_context(v_a);
  assert v_context -> 'run' ->> 'status' = 'active', 'run status';
  assert (v_context -> 'run' ->> 'current_round')::integer = 1, 'run round';
  assert v_context -> 'run' -> 'card_instance_ids' = to_jsonb(v_squad), 'run squad';
  assert v_context -> 'threat_ids' = (select to_jsonb(threat_ids) from public.emergency_days where day = public.game_day()),
    'threats of the day';

  v_state := public.emergency_record_play_state(v_a, 1, v_squad[1], 1, 0, 1, 99);
  assert (v_state -> 'run' ->> 'current_round')::integer = 2, 'round after the play';
  assert (v_state -> 'run' ->> 'failed')::integer = 1, 'failed count after the play';
  assert (v_state - 'server_now') = (public.emergency_state_payload(v_a) - 'server_now'), 'state differs from the payload';

  v_context := public.emergency_play_context(v_a);
  assert v_context -> 'plays' = jsonb_build_array(jsonb_build_object('card_instance_id', v_squad[1], 'passed', false)),
    format('plays %s', v_context -> 'plays');
end $$;

-- Clients cannot call the service-only functions.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000c1", "role": "authenticated"}', true);
do $$
begin
  begin
    perform public.match_round_context(auth.uid(), gen_random_uuid());
    raise exception 'ASSERT: a client read a match context';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.emergency_play_context(auth.uid());
    raise exception 'ASSERT: a client read an Emergenza context';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

rollback;
