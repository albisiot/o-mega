-- Integration test for the match rewards table (/gestione-ricompense): the
-- defaults pay what the game paid before; each mode reads its own rows, a mode
-- without rows reads 'default'; caps, packs, forfeits and the Emergenza XP;
-- only admins change anything. Service-only functions are called as the
-- database owner. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated', 'mr-admin@example.test',
   '{"full_name": "Ricompense Admin"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000f2', 'authenticated', 'authenticated', 'mr-player@example.test',
   '{"full_name": "Ricompense Giocatore"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f2", "role": "authenticated"}', true);
select public.bootstrap_player();

-- A player reads the rewards but changes nothing, and reaches no internal function.
do $$
declare
  v_payload jsonb := public.get_match_rewards();
begin
  assert jsonb_array_length(v_payload -> 'rules') = 45, format('rules %s', jsonb_array_length(v_payload -> 'rules'));
  assert (v_payload -> 'settings' ->> 'match_rewards.daily_pack_cap')::integer = 3, 'pack cap';
  assert (v_payload -> 'settings' ->> 'emergency.rewards.finish_xp')::integer = 0, 'finish xp';
  begin
    perform public.admin_save_match_rewards('[]', '{"match_rewards.daily_coin_cap": 5}');
    raise exception 'ASSERT: a player saved the rewards';
  exception when insufficient_privilege then
    assert sqlerrm = 'not_admin', sqlerrm;
  end;
  begin
    perform public.match_rewards_payload();
    raise exception 'ASSERT: a player called an internal function';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.emergency_state_payload_base('00000000-0000-4000-8000-0000000000f2');
    raise exception 'ASSERT: a player read the Emergenza base payload';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

-- The defaults are the old values; finishing matches pays from the table.
do $$
declare
  v_p uuid := '00000000-0000-4000-8000-0000000000f2';
  v_team uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_p order by acquired_at, id limit 5) s);
  v_bot uuid[] := (select array_agg(s.id) from (select id from public.card_definitions order by code limit 5) s);
  v_threats uuid[];
  v_match uuid;
  v_xp integer;
  v_reward jsonb;
begin
  assert (select xp = 10 and coins = 0 and packs = 0 from public.match_reward_rules
          where mode_key = 'classic' and opponent = 'bot' and outcome = 'win'), 'classic bot win';
  assert (select xp = 10 and coins = 10 from public.match_reward_rules
          where mode_key = 'conquest' and opponent = 'person' and outcome = 'draw'), 'conquest draw';
  assert (select xp = 30 and coins = 0 from public.match_reward_rules
          where mode_key = 'default' and opponent = 'person' and outcome = 'win'), 'default person win';
  assert not exists (select 1 from public.match_reward_rules where mode_key = 'story' and opponent = 'person'), 'story person';
  assert not exists (select 1 from public.game_config where key in ('progression.bot_win_xp', 'conquest.loser_coins')),
    'old keys left';

  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;

  -- A classic bot win: 10 XP, as before.
  v_xp := (select xp from public.profiles where id = v_p);
  v_match := public.match_create_bot(v_p, 'easy', v_team, v_bot, v_threats);
  perform public.finish_match(v_match, 'a', 'completed');
  assert (select xp from public.profiles where id = v_p) = v_xp + 10, 'classic win xp';
  assert (select reward_xp_a = 10 and reward_coins_a = 0 and reward_opening_ids_a = '{}' from public.matches where id = v_match),
    'stored reward';

  -- The format's own rows: Allarme Triplo pays its loss with coins and a pack.
  update public.match_reward_rules set coins = 7, xp = 4, packs = 1
  where mode_key = 'triple' and opponent = 'bot' and outcome = 'loss';
  v_xp := (select xp from public.profiles where id = v_p);
  v_match := public.match_create_bot(v_p, 'easy', v_team, v_bot, v_threats);
  update public.matches set format = 'triple' where id = v_match;
  perform public.finish_match(v_match, 'b', 'completed');
  assert (select xp from public.profiles where id = v_p) = v_xp + 4, 'triple loss xp';
  assert (select amount = 7 from public.coin_ledger where ref_id = v_match and reason = 'match_reward'), 'triple coins in the ledger';
  assert (select cardinality(reward_opening_ids_a) = 1 from public.matches where id = v_match), 'one pack';
  assert (select pack_type = 'match' and user_id = v_p from public.pack_openings
          where id = (select reward_opening_ids_a[1] from public.matches where id = v_match)), 'match pack opening';

  -- Whoever leaves earns nothing.
  v_xp := (select xp from public.profiles where id = v_p);
  v_match := public.match_create_bot(v_p, 'easy', v_team, v_bot, v_threats);
  update public.matches set format = 'triple' where id = v_match;
  perform public.finish_match(v_match, 'b', 'forfeit');
  assert (select xp from public.profiles where id = v_p) = v_xp, 'forfeit xp';
  assert not exists (select 1 from public.coin_ledger where ref_id = v_match), 'forfeit coins';
  assert (select reward_xp_a = 0 and reward_opening_ids_a = '{}' from public.matches where id = v_match), 'forfeit reward';

  -- A mode without its own rows pays the 'default' rows.
  delete from public.match_reward_rules where mode_key = 'classic';
  update public.match_reward_rules set xp = 17 where mode_key = 'default' and opponent = 'bot' and outcome = 'draw';
  v_match := public.match_create_bot(v_p, 'easy', v_team, v_bot, v_threats);
  perform public.finish_match(v_match, 'draw', 'completed');
  assert (select reward_xp_a = 17 from public.matches where id = v_match), 'default rows';

  -- Story matches read the story rows.
  update public.match_reward_rules set xp = 21 where mode_key = 'story' and outcome = 'loss';
  v_match := public.match_create_bot(v_p, 'easy', v_team, v_bot, v_threats);
  update public.matches set story_mission_id = (select id from public.story_missions order by chapter, ord limit 1)
  where id = v_match;
  perform public.finish_match(v_match, 'b', 'completed');
  assert (select reward_xp_a = 21 from public.matches where id = v_match), 'story rows';

  -- The daily caps: two more packs reach the cap of 2, then the coin cap of 10 trims 7 + 7 to 7 + 3.
  update public.game_config set value = '2' where key = 'match_rewards.daily_pack_cap';
  update public.game_config set value = '10' where key = 'match_rewards.daily_coin_cap';
  delete from public.coin_ledger where user_id = v_p and reason = 'match_reward';
  v_match := public.match_create_bot(v_p, 'easy', v_team, v_bot, v_threats);
  update public.matches set format = 'triple' where id = v_match;
  perform public.finish_match(v_match, 'b', 'completed');
  assert (select cardinality(reward_opening_ids_a) = 1 and reward_coins_a = 7 from public.matches where id = v_match), 'second pack';
  v_match := public.match_create_bot(v_p, 'easy', v_team, v_bot, v_threats);
  update public.matches set format = 'triple' where id = v_match;
  perform public.finish_match(v_match, 'b', 'completed');
  assert (select cardinality(reward_opening_ids_a) = 0 and reward_coins_a = 3 from public.matches where id = v_match),
    'caps reached';

  -- The player reads only their own reward.
  perform set_config('test.match', v_match::text, true);
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f2", "role": "authenticated"}', true);
do $$
declare
  v_reward jsonb := public.get_match_reward(current_setting('test.match')::uuid);
begin
  assert (v_reward ->> 'coins')::integer = 3 and (v_reward ->> 'xp')::integer = 4, format('reward %s', v_reward);
  assert v_reward -> 'opening_ids' = '[]'::jsonb, 'no pack after the cap';
end $$;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);
do $$
begin
  assert public.get_match_reward(current_setting('test.match')::uuid) is null, 'someone else''s reward';
end $$;

-- An admin changes rows and settings, with every value checked.
reset role;
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000000f1');
set local role authenticated;

do $$
declare
  v_payload jsonb;
  v_failed boolean;
begin
  v_payload := public.admin_save_match_rewards(
    '[{"mode_key": "boss", "opponent": "person", "outcome": "win", "coins": 25, "xp": 40, "packs": 1}]',
    '{"match_rewards.daily_coin_cap": 0, "emergency.rewards.finish_xp": 15, "conquest.no_card_bonus_coins": 60}'
  );
  assert (select (r ->> 'coins')::integer = 25 and (r ->> 'xp')::integer = 40 and (r ->> 'packs')::integer = 1
          from jsonb_array_elements(v_payload -> 'rules') r
          where r ->> 'mode_key' = 'boss' and r ->> 'opponent' = 'person' and r ->> 'outcome' = 'win'), 'saved row';
  assert (v_payload -> 'settings' ->> 'emergency.rewards.finish_xp')::integer = 15, 'saved setting';
  assert (v_payload -> 'settings' ->> 'conquest.no_card_bonus_coins')::integer = 60, 'saved bonus';

  -- Unknown rows, unknown keys, out-of-range or fractional values, tiers out of order.
  foreach v_payload in array array[
    '[{"mode_key": "nope", "opponent": "bot", "outcome": "win", "coins": 1, "xp": 1, "packs": 0}]'::jsonb,
    '[{"mode_key": "conquest", "opponent": "bot", "outcome": "win", "coins": -1, "xp": 1, "packs": 0}]'::jsonb,
    '[{"mode_key": "conquest", "opponent": "bot", "outcome": "win", "coins": 1, "xp": 1.5, "packs": 0}]'::jsonb,
    '[{"mode_key": "conquest", "opponent": "bot", "outcome": "win", "coins": 1, "xp": 1, "packs": 4}]'::jsonb,
    '[{"mode_key": "conquest", "opponent": "bot", "outcome": "win", "coins": "1", "xp": 1, "packs": 0}]'::jsonb
  ] loop
    v_failed := false;
    begin
      perform public.admin_save_match_rewards(v_payload, '{}');
    exception when others then
      v_failed := sqlerrm in ('match_reward_not_found', 'invalid_match_rewards');
    end;
    assert v_failed, format('accepted %s', v_payload);
  end loop;
  foreach v_payload in array array[
    '{"packs.standard_pack_price": 1}'::jsonb,
    '{"match_rewards.daily_pack_cap": 99}'::jsonb,
    '{"emergency.rewards.tier1_coins": 0}'::jsonb,
    '{"emergency.rewards.tier2_passed": 2}'::jsonb,
    '{"emergency.rewards.tier3_passed": 99}'::jsonb
  ] loop
    v_failed := false;
    begin
      perform public.admin_save_match_rewards('[]', v_payload);
    exception when others then
      v_failed := sqlerrm in ('invalid_match_rewards', 'invalid_emergency_tiers');
    end;
    assert v_failed, format('accepted %s', v_payload);
  end loop;
  -- A failed save changes nothing.
  v_payload := public.get_match_rewards();
  assert (select (r ->> 'coins')::integer = 25 from jsonb_array_elements(v_payload -> 'rules') r
          where r ->> 'mode_key' = 'boss' and r ->> 'opponent' = 'person' and r ->> 'outcome' = 'win'), 'row after failures';
  assert (select (r ->> 'coins')::integer = 0 from jsonb_array_elements(v_payload -> 'rules') r
          where r ->> 'mode_key' = 'conquest' and r ->> 'opponent' = 'bot' and r ->> 'outcome' = 'win'), 'conquest row untouched';
  assert (v_payload -> 'settings' ->> 'emergency.rewards.tier2_passed')::integer = 5, 'tier after failures';
end $$;

reset role;

-- Emergenza: the XP of the end of the run, once.
delete from public.emergency_plays;
delete from public.emergency_runs;
delete from public.emergency_days;

do $$
declare
  v_p uuid := '00000000-0000-4000-8000-0000000000f2';
  v_squad uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_p order by acquired_at, id limit 8) s);
  v_threats uuid[];
  v_xp integer := (select xp from public.profiles where id = v_p);
  v_state jsonb;
begin
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 2, 3, 4, 5, 6, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level
    order by code offset (case when l.ord >= 7 then 1 else 0 end) limit 1
  ) t;
  perform public.emergency_ensure_day(v_threats);
  perform public.emergency_start(v_p, v_squad);
  v_state := public.emergency_state_payload(v_p);
  assert (v_state -> 'rules' ->> 'finish_xp')::integer = 15, format('rules %s', v_state -> 'rules');
  assert (v_state -> 'run' ->> 'xp')::integer = 0, 'no xp yet';

  perform public.emergency_record_play(v_p, 1, v_squad[1], 1, 0, 1, 7);
  perform public.emergency_record_play(v_p, 2, v_squad[2], 1, 0, 1, 13);
  assert (select xp from public.profiles where id = v_p) = v_xp, 'xp before the end';
  perform public.emergency_record_play(v_p, 3, v_squad[3], 1, 0, 1, 18);
  assert (select status = 'finished' and xp = 15 from public.emergency_runs where user_id = v_p), 'run xp';
  assert (select xp from public.profiles where id = v_p) = v_xp + 15, 'profile xp';
  assert (public.emergency_state_payload(v_p) -> 'run' ->> 'xp')::integer = 15, 'xp in the state';
end $$;

rollback;
