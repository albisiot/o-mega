-- Integration test for level rewards. Service-only functions are called as the
-- database owner. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'lr-a@example.test', '{"full_name": "Premi A"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000a1';
  v_team uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 5) s);
  v_bot uuid[] := (select array_agg(s.id) from (select id from public.card_definitions order by code limit 5) s);
  v_threats uuid[];
  v_match uuid;
  v_state jsonb;
  v_paid integer;
begin
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;

  -- A match that does not reach a new level pays nothing.
  v_match := public.match_create_bot(v_a, 'easy', v_team, v_bot, v_threats);
  perform public.finish_match(v_match, 'a', 'completed');
  assert not exists (select 1 from public.level_rewards where user_id = v_a), 'reward without a new level';
  assert public.match_state_payload(v_match, 'a') -> 'level_rewards' = '[]'::jsonb, 'empty rewards in the state';

  -- A win that crosses two levels pays both: 50 for level 2, 60 for level 3.
  update public.profiles set xp = 290 where id = v_a;
  v_match := public.match_create_bot(v_a, 'easy', v_team, v_bot, v_threats);
  perform public.finish_match(v_match, 'a', 'completed');
  assert (select level = 3 and xp = 300 from public.profiles where id = v_a), 'level not reached';
  select coalesce(sum(amount), 0) into v_paid from public.coin_ledger where user_id = v_a and reason = 'level_reward';
  assert v_paid = 110, format('paid %s', v_paid);
  v_state := public.match_state_payload(v_match, 'a');
  assert v_state -> 'level_rewards' = '[{"level": 2, "coins": 50}, {"level": 3, "coins": 60}]'::jsonb,
    format('state %s', v_state -> 'level_rewards');
  assert (v_state ->> 'reward_coins')::integer = 0, 'level rewards leaked into the match coins';

  -- Each level pays once, however many times the grant runs.
  perform public.grant_level_rewards(v_a, null);
  select sum(amount) into v_paid from public.coin_ledger where user_id = v_a and reason = 'level_reward';
  assert v_paid = 110, format('paid twice: %s', v_paid);

  -- A later match that stays on the same level adds nothing.
  v_match := public.match_create_bot(v_a, 'easy', v_team, v_bot, v_threats);
  perform public.finish_match(v_match, 'a', 'completed');
  select sum(amount) into v_paid from public.coin_ledger where user_id = v_a and reason = 'level_reward';
  assert v_paid = 110, format('paid again: %s', v_paid);
  assert public.match_state_payload(v_match, 'a') -> 'level_rewards' = '[]'::jsonb, 'old rewards shown again';

  -- A retroactive grant pays what is missing, with no match attached.
  update public.profiles set xp = 600, level = 4 where id = v_a;
  perform public.grant_level_rewards(v_a, null);
  assert (select coins = 70 and match_id is null from public.level_rewards where user_id = v_a and level = 4),
    'retroactive reward';
end $$;

set local role authenticated;

do $$
begin
  begin
    perform public.grant_level_rewards('00000000-0000-4000-8000-0000000000a1', null);
    raise exception 'ASSERT: a client called grant_level_rewards';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.level_rewards (user_id, level, coins) values ('00000000-0000-4000-8000-0000000000a1', 5, 9999);
    raise exception 'ASSERT: a client wrote level_rewards';
  exception when insufficient_privilege then
    null;
  end;
  assert (select count(*) from public.level_rewards) = 3, 'a player should read their own rewards';
end $$;

reset role;

rollback;
