-- Integration test for M6 (bot matches, rewards, hidden information, formations).
-- The service-only functions are called as the database owner, as the Edge
-- Function would with service_role. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'match-a@example.test',
   '{"full_name": "Partite A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'match-b@example.test',
   '{"full_name": "Partite B"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- Fixtures: A's team (5 starter cards), a bot team of rarer characters A does
-- not own, and threats with levels 1-5-3-3-2.
do $$
declare
  v_team uuid[];
  v_bot uuid[];
  v_threats uuid[];
begin
  select array_agg(id order by acquired_at, id) into v_team from (
    select id, acquired_at from public.card_instances
    where owner_id = '00000000-0000-4000-8000-0000000000a1' order by acquired_at, id limit 5
  ) s;
  select array_agg(id order by code) into v_bot from (
    select id, code from public.card_definitions where rarity_code in ('beta', 'alfa') order by code limit 5
  ) s;
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions
    where level = l.level
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;
  perform set_config('test.team', v_team::text, true);
  perform set_config('test.bot', v_bot::text, true);
  perform set_config('test.threats', v_threats::text, true);
end $$;

-- Helper for this test: a play payload.
create function pg_temp.play(p_instance uuid, p_definition uuid, p_score integer, p_auto boolean default false)
returns jsonb language sql as $$
  select jsonb_build_object('card_instance_id', p_instance, 'definition_id', p_definition,
    'base', p_score, 'bonus', 0, 'score', p_score, 'highest', least(p_score, 10), 'auto_played', p_auto)
$$;

create function pg_temp.definition_of(p_instance uuid) returns uuid language sql as $$
  select definition_id from public.card_instances where id = p_instance
$$;

-- Team validation and match creation.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000a1';
  v_team uuid[] := current_setting('test.team')::uuid[];
  v_bot uuid[] := current_setting('test.bot')::uuid[];
  v_threats uuid[] := current_setting('test.threats')::uuid[];
  v_dup uuid;
  v_b_card uuid;
  v_match uuid;
begin
  begin
    perform public.match_create_bot(v_a, 'easy', v_team[1:4], v_bot, v_threats);
    raise exception 'ASSERT: a team of 4 was accepted';
  exception when invalid_parameter_value then
    assert sqlerrm = 'invalid_team_size', sqlerrm;
  end;

  insert into public.card_instances (definition_id, owner_id, acquired_via)
  values (pg_temp.definition_of(v_team[1]), v_a, 'pack') returning id into v_dup;
  begin
    perform public.match_create_bot(v_a, 'easy', array[v_dup] || v_team[1:4], v_bot, v_threats);
    raise exception 'ASSERT: two copies of a character were accepted';
  exception when invalid_parameter_value then
    assert sqlerrm = 'duplicate_character', sqlerrm;
  end;

  select id into v_b_card from public.card_instances where owner_id = '00000000-0000-4000-8000-0000000000b2' limit 1;
  begin
    perform public.match_create_bot(v_a, 'easy', array[v_b_card] || v_team[2:5], v_bot, v_threats);
    raise exception 'ASSERT: another player''s card was accepted';
  exception when invalid_parameter_value then
    assert sqlerrm = 'card_not_owned', sqlerrm;
  end;

  v_match := public.match_create_bot(v_a, 'hard', v_team, v_bot, v_threats);
  perform set_config('test.match', v_match::text, true);

  begin
    perform public.match_create_bot(v_a, 'easy', v_team, v_bot, v_threats);
    raise exception 'ASSERT: a second running match was accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'match_already_active', sqlerrm;
  end;
end $$;

-- What the player sees: levels, the first threat, their team; nothing of the bot.
set local role authenticated;

do $$
declare
  v_state jsonb := public.get_match_state(current_setting('test.match')::uuid);
  v_bot uuid[] := current_setting('test.bot')::uuid[];
  v_def uuid;
begin
  assert v_state -> 'threat_levels' = '[1, 5, 3, 3, 2]'::jsonb, format('levels %s', v_state -> 'threat_levels');
  assert jsonb_array_length(v_state -> 'my_team') = 5, 'own team missing';
  assert jsonb_array_length(v_state -> 'rounds') = 1, 'only the first round should be open';
  assert v_state -> 'rounds' -> 0 -> 'threat' ->> 'name' is not null, 'current threat not revealed';
  assert v_state ->> 'status' = 'active' and (v_state ->> 'current_round')::integer = 1, 'bad status';
  foreach v_def in array v_bot loop
    assert position(v_def::text in v_state::text) = 0, 'the bot team leaked to the client';
  end loop;

  begin
    perform 1 from public.matches;
    raise exception 'ASSERT: a client read the matches table';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.match_create_bot(auth.uid(), 'easy', '{}', '{}', '{}');
    raise exception 'ASSERT: a client called a service-only function';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

-- Rounds: order, reuse, result check, then a 3-0 win.
do $$
declare
  v_match uuid := current_setting('test.match')::uuid;
  v_team uuid[] := current_setting('test.team')::uuid[];
  v_bot uuid[] := current_setting('test.bot')::uuid[];
begin
  perform public.match_record_round(v_match, 1,
    pg_temp.play(v_team[1], pg_temp.definition_of(v_team[1]), 9), pg_temp.play(null, v_bot[1], 4), 'a', null);

  begin
    perform public.match_record_round(v_match, 1,
      pg_temp.play(v_team[2], pg_temp.definition_of(v_team[2]), 9), pg_temp.play(null, v_bot[2], 4), 'a', null);
    raise exception 'ASSERT: a round was resolved twice';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'round_already_resolved', sqlerrm;
  end;

  begin
    perform public.match_record_round(v_match, 2,
      pg_temp.play(v_team[1], pg_temp.definition_of(v_team[1]), 9), pg_temp.play(null, v_bot[2], 4), 'a', null);
    raise exception 'ASSERT: a character was played twice';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'character_already_played', sqlerrm;
  end;

  begin
    perform public.match_record_round(v_match, 2,
      pg_temp.play(v_team[2], pg_temp.definition_of(v_team[2]), 20), pg_temp.play(null, v_bot[2], 4), 'a', 'a');
    raise exception 'ASSERT: a wrong result was accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'result_mismatch', sqlerrm;
  end;

  perform public.match_record_round(v_match, 2,
    pg_temp.play(v_team[2], pg_temp.definition_of(v_team[2]), 20), pg_temp.play(null, v_bot[2], 4), 'a', null);
  perform public.match_record_round(v_match, 3,
    pg_temp.play(v_team[3], pg_temp.definition_of(v_team[3]), 15), pg_temp.play(null, v_bot[3], 4), 'a', 'a');

  assert (select status from public.matches where id = v_match) = 'finished', 'match not finished at 3-0';
  assert (select reward_coins_a from public.matches where id = v_match) = 25, 'win reward';
  assert (select count(*) from public.coin_ledger where reason = 'bot_match_reward' and amount = 25) = 1, 'ledger';
  assert (select matches_played = 1 and bot_wins = 1 and wins = 0 from public.profiles
          where id = '00000000-0000-4000-8000-0000000000a1'), 'statistics not updated';
end $$;

set local role authenticated;

do $$
declare
  v_state jsonb := public.get_match_state(current_setting('test.match')::uuid);
  v_bot uuid[] := current_setting('test.bot')::uuid[];
begin
  assert v_state ->> 'result' = 'win' and (v_state ->> 'reward_coins')::integer = 25, 'final state';
  assert v_state -> 'rounds' -> 0 -> 'opponent_play' ->> 'definition_id' = v_bot[1]::text, 'played bot card hidden';
  assert position(v_bot[4]::text in v_state::text) = 0, 'an unplayed bot card leaked';
  assert (v_state -> 'my_team' -> 0 ->> 'played_round')::integer = 1, 'played round of own card';
end $$;

reset role;

-- Timer: a human choice after the deadline is refused, an auto-play is accepted.
-- A void round counts for nobody. Daily cap on bot rewards.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000a1';
  v_team uuid[] := current_setting('test.team')::uuid[];
  v_bot uuid[] := current_setting('test.bot')::uuid[];
  v_match uuid := public.match_create_bot(v_a, 'easy', v_team, v_bot, current_setting('test.threats')::uuid[]);
begin
  update public.match_rounds set deadline_at = now() - interval '1 minute' where match_id = v_match;
  begin
    perform public.match_record_round(v_match, 1,
      pg_temp.play(v_team[1], pg_temp.definition_of(v_team[1]), 9), pg_temp.play(null, v_bot[1], 9), null, null);
    raise exception 'ASSERT: a late choice was accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'round_expired', sqlerrm;
  end;
  perform public.match_record_round(v_match, 1,
    pg_temp.play(v_team[1], pg_temp.definition_of(v_team[1]), 9, true), pg_temp.play(null, v_bot[1], 9), null, null);
  assert (select rounds_won_a = 0 and rounds_won_b = 0 and current_round = 2 from public.matches where id = v_match),
    'a void round changed the score';

  -- 25 already earned today: 120 more leaves room for 5 coins.
  insert into public.coin_ledger (user_id, amount, reason) values (v_a, 120, 'bot_match_reward');
  perform public.match_record_round(v_match, 2,
    pg_temp.play(v_team[2], pg_temp.definition_of(v_team[2]), 30), pg_temp.play(null, v_bot[2], 4), 'a', null);
  perform public.match_record_round(v_match, 3,
    pg_temp.play(v_team[3], pg_temp.definition_of(v_team[3]), 30), pg_temp.play(null, v_bot[3], 4), 'a', null);
  perform public.match_record_round(v_match, 4,
    pg_temp.play(v_team[4], pg_temp.definition_of(v_team[4]), 30), pg_temp.play(null, v_bot[4], 4), 'a', 'a');
  assert (select reward_coins_a from public.matches where id = v_match) = 5, 'daily cap not applied';
end $$;

-- Cards fielded in a running match cannot be converted.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000a1';
  v_team uuid[] := current_setting('test.team')::uuid[];
  v_def uuid;
  v_old uuid;
  v_fielded uuid;
  v_result record;
begin
  select id into v_def from public.card_definitions where code = 'P025';
  insert into public.card_instances (definition_id, owner_id, acquired_via, acquired_at)
  values (v_def, v_a, 'pack', now() - interval '2 days') returning id into v_old;
  insert into public.card_instances (definition_id, owner_id, acquired_via, acquired_at)
  values (v_def, v_a, 'pack', now() - interval '1 day') returning id into v_fielded;

  perform set_config('test.match', public.match_create_bot(v_a, 'medium', array[v_fielded] || v_team[2:5],
    current_setting('test.bot')::uuid[], current_setting('test.threats')::uuid[])::text, true);

  select * into v_result from public.convert_definition_duplicates(v_a, v_def, null);
  assert v_result.converted = 1, format('converted %s', v_result.converted);
  assert (select owner_id from public.card_instances where id = v_fielded) = v_a, 'a fielded card was converted';
  assert (select owner_id from public.card_instances where id = v_old) is null, 'the free copy was not converted';
end $$;

-- Forfeit: a defeat with no reward. Formations.
set local role authenticated;

do $$
declare
  v_state jsonb;
  v_team uuid[] := current_setting('test.team')::uuid[];
  v_formation public.formations;
begin
  v_state := public.forfeit_match(current_setting('test.match')::uuid);
  assert v_state ->> 'result' = 'loss' and (v_state ->> 'reward_coins')::integer = 0, 'forfeit result';
  assert v_state ->> 'end_reason' = 'forfeit', 'forfeit reason';
  assert public.get_active_match() is null, 'match still active after forfeit';
  begin
    perform public.forfeit_match(current_setting('test.match')::uuid);
    raise exception 'ASSERT: forfeited twice';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'match_not_active', sqlerrm;
  end;

  v_formation := public.save_formation(null, '  Attacco  ', v_team);
  assert v_formation.name = 'Attacco', 'formation name not trimmed';
  v_formation := public.save_formation(v_formation.id, 'Difesa', v_team);
  assert v_formation.name = 'Difesa', 'formation not updated';
  begin
    perform public.save_formation(null, 'Corta', v_team[1:4]);
    raise exception 'ASSERT: a formation of 4 was saved';
  exception when invalid_parameter_value then
    assert sqlerrm = 'invalid_team_size', sqlerrm;
  end;
  for i in 2..10 loop
    perform public.save_formation(null, format('F%s', i), v_team);
  end loop;
  begin
    perform public.save_formation(null, 'Undicesima', v_team);
    raise exception 'ASSERT: more formations than allowed';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'too_many_formations', sqlerrm;
  end;
  perform set_config('test.formation', v_formation.id::text, true);
end $$;

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);

do $$
begin
  assert (select count(*) from public.formations) = 0, 'player B sees other formations';
  begin
    perform public.delete_formation(current_setting('test.formation')::uuid);
    raise exception 'ASSERT: player B deleted a formation of player A';
  exception when no_data_found then
    assert sqlerrm = 'formation_not_found', sqlerrm;
  end;
  begin
    perform public.get_match_state(current_setting('test.match')::uuid);
    raise exception 'ASSERT: player B read a match of player A';
  exception when no_data_found then null;
  end;
end $$;

rollback;

select 'matches: all assertions passed' as result;
