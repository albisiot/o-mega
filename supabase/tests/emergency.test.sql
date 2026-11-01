-- Integration test for Emergenza. Service-only functions are called as the
-- database owner. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'em-a@example.test', '{"full_name": "Emergenza A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated', 'em-b@example.test', '{"full_name": "Emergenza B"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e2", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- Other runs of the day would change the leaderboard counts below.
delete from public.emergency_plays;
delete from public.emergency_runs;
delete from public.emergency_days;

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000e1';
  v_b uuid := '00000000-0000-4000-8000-0000000000e2';
  v_squad_a uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 8) s);
  v_squad_b uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_b order by acquired_at, id limit 8) s);
  v_threats uuid[];
  v_other uuid[];
  v_state jsonb;
  v_failed boolean;
begin
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 2, 3, 4, 5, 6, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level
    order by code offset (case when l.ord >= 7 then 1 else 0 end) limit 1
  ) t;
  select array_agg(t.id order by l.ord) into v_other
  from unnest(array[6, 5, 4, 3, 2, 1, 2, 3]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level
    order by code desc offset (case when l.ord >= 7 then 1 else 0 end) limit 1
  ) t;

  -- Nothing can start before the day has its threats.
  v_failed := false;
  begin perform public.emergency_start(v_a, v_squad_a);
  exception when others then v_failed := sqlerrm = 'emergency_not_ready'; end;
  assert v_failed, 'started without threats';

  -- The first draw of the day holds for everyone.
  perform public.emergency_ensure_day(v_threats);
  perform public.emergency_ensure_day(v_other);
  assert (select threat_ids = v_threats from public.emergency_days where day = public.game_day()), 'second draw won';

  v_failed := false;
  begin perform public.emergency_ensure_day(v_threats[1:7]);
  exception when others then v_failed := sqlerrm = 'invalid_threats'; end;
  assert v_failed, 'accepted a short sequence';

  -- Before starting, only the levels are visible.
  v_state := public.emergency_state_payload(v_a);
  assert v_state -> 'threat_levels' = '[1, 2, 3, 4, 5, 6, 3, 2]'::jsonb, format('levels %s', v_state -> 'threat_levels');
  assert jsonb_typeof(v_state -> 'run') = 'null', 'run before starting';
  assert (v_state -> 'rules' -> 'targets' ->> '6')::integer = 32, 'targets';
  assert not v_state::text like '%' || v_threats[1]::text || '%', 'threat id leaked before the start';

  -- The squad: right size, own cards, distinct characters.
  v_failed := false;
  begin perform public.emergency_start(v_a, v_squad_a[1:5]);
  exception when others then v_failed := sqlerrm = 'invalid_emergency_squad'; end;
  assert v_failed, 'short squad';
  v_failed := false;
  begin perform public.emergency_start(v_a, v_squad_b);
  exception when others then v_failed := sqlerrm = 'card_not_owned'; end;
  assert v_failed, 'someone else''s cards';
  v_failed := false;
  begin perform public.emergency_start(v_a, v_squad_a[1:7] || v_squad_a[1]);
  exception when others then v_failed := sqlerrm = 'duplicate_card'; end;
  assert v_failed, 'same card twice';

  perform public.emergency_start(v_a, v_squad_a);

  -- One attempt per day.
  v_failed := false;
  begin perform public.emergency_start(v_a, v_squad_a);
  exception when others then v_failed := sqlerrm = 'emergency_already_played'; end;
  assert v_failed, 'second attempt';

  -- Only the current threat is revealed.
  v_state := public.emergency_state_payload(v_a);
  assert (v_state -> 'run' -> 'current_threat' ->> 'id')::uuid = v_threats[1], 'current threat';
  assert not v_state::text like '%' || v_threats[2]::text || '%', 'next threat leaked';
  assert (v_state -> 'run' -> 'foreseen_threats') = '[]'::jsonb, 'foreseen without Veggente';
  assert jsonb_array_length(v_state -> 'run' -> 'squad') = 8, 'squad in the state';

  -- Round order, squad membership and arithmetic are enforced.
  v_failed := false;
  begin perform public.emergency_record_play(v_a, 2, v_squad_a[1], 7, 0, 7, 7);
  exception when others then v_failed := sqlerrm = 'round_already_resolved'; end;
  assert v_failed, 'wrong round';
  v_failed := false;
  begin perform public.emergency_record_play(v_a, 1, v_squad_b[1], 7, 0, 7, 7);
  exception when others then v_failed := sqlerrm = 'character_not_available'; end;
  assert v_failed, 'card outside the squad';
  v_failed := false;
  begin perform public.emergency_record_play(v_a, 1, v_squad_a[1], 7, 0, 99, 7);
  exception when others then v_failed := sqlerrm = 'result_mismatch'; end;
  assert v_failed, 'inconsistent score';

  -- Two passes pay nothing, the third pays the first reward.
  perform public.emergency_record_play(v_a, 1, v_squad_a[1], 7, 0, 7, 7);
  perform public.emergency_record_play(v_a, 2, v_squad_a[2], 13, 0, 13, 13);
  assert not exists (select 1 from public.coin_ledger where user_id = v_a and reason = 'emergency_reward'), 'paid too early';

  v_failed := false;
  begin perform public.emergency_record_play(v_a, 3, v_squad_a[1], 18, 0, 18, 18);
  exception when others then v_failed := sqlerrm = 'character_already_played'; end;
  assert v_failed, 'character played twice';

  perform public.emergency_record_play(v_a, 3, v_squad_a[3], 18, 0, 18, 18);
  assert (select sum(amount) = 10 from public.coin_ledger where user_id = v_a and reason = 'emergency_reward'), 'first reward';

  -- A Veggente played shows the following threats, not the current one again.
  update public.card_definitions set power_code = 'foresight', power_params = '{}'
  where id = (select definition_ids[3] from public.emergency_runs where user_id = v_a);
  v_state := public.emergency_state_payload(v_a);
  assert jsonb_array_length(v_state -> 'run' -> 'foreseen_threats') = 4, format('foreseen %s', v_state -> 'run' -> 'foreseen_threats');
  assert (v_state -> 'run' -> 'foreseen_threats' -> 0 ->> 'round')::integer = 5, 'first foreseen round';

  -- Three failures end the run; a failure pays nothing and nothing more can be played.
  perform public.emergency_record_play(v_a, 4, v_squad_a[4], 1, 0, 1, 23);
  perform public.emergency_record_play(v_a, 5, v_squad_a[5], 1, 0, 1, 28);
  assert (select status = 'active' from public.emergency_runs where user_id = v_a), 'ended too early';
  perform public.emergency_record_play(v_a, 6, v_squad_a[6], 1, 0, 1, 32);
  assert (select status = 'finished' and passed = 3 and failed = 3 and coins = 10 and total_score = 41 and finished_at is not null
          from public.emergency_runs where user_id = v_a), 'finished run';
  v_failed := false;
  begin perform public.emergency_record_play(v_a, 7, v_squad_a[7], 18, 0, 18, 18);
  exception when others then v_failed := sqlerrm = 'emergency_already_played'; end;
  assert v_failed, 'played after the end';
  v_state := public.emergency_state_payload(v_a);
  assert jsonb_typeof(v_state -> 'run' -> 'current_threat') = 'null', 'current threat after the end';

  -- A full run pays all three rewards.
  perform public.emergency_start(v_b, v_squad_b);
  for i in 1..8 loop
    perform public.emergency_record_play(v_b, i, v_squad_b[i], 40, 0, 40, 7);
  end loop;
  assert (select status = 'finished' and passed = 8 and coins = 50 from public.emergency_runs where user_id = v_b), 'full run';
  assert (select sum(amount) = 50 from public.coin_ledger where user_id = v_b and reason = 'emergency_reward'), 'full run rewards';
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);

do $$
declare
  v_board jsonb := public.get_emergency_leaderboard();
begin
  assert (v_board ->> 'players')::integer = 2, format('players %s', v_board ->> 'players');
  assert (v_board -> 'top' -> 0 ->> 'passed')::integer = 8, 'best run first';
  assert (v_board -> 'top' -> 0 ->> 'is_me')::boolean = false, 'someone else first';
  assert (v_board -> 'me' ->> 'rank')::integer = 2, 'my rank';
  assert (public.get_emergency_leaderboard(1) -> 'top') ->> 1 is null, 'limit';

  -- Clients reach nothing else.
  begin
    perform 1 from public.emergency_days;
    raise exception 'ASSERT: a client read the threats of the day';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.emergency_runs;
    raise exception 'ASSERT: a client read the runs';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.emergency_state_payload('00000000-0000-4000-8000-0000000000e2');
    raise exception 'ASSERT: a client read another player''s state';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.emergency_record_play('00000000-0000-4000-8000-0000000000e1', 7, gen_random_uuid(), 99, 0, 99, 0);
    raise exception 'ASSERT: a client recorded a play';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

rollback;
