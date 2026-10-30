-- Integration test for M7 (friend codes, queue, secret plays, presence, PvP rewards).
-- Service-only functions are called as the database owner, as the Edge
-- Function would with service_role. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'pvp-a@example.test', '{"full_name": "Ospite A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'pvp-b@example.test', '{"full_name": "Ospite B"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000c3', 'authenticated', 'authenticated', 'pvp-c@example.test', '{"full_name": "Ospite C"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000c3", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

do $$
declare
  v_threats uuid[];
begin
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;
  perform set_config('test.threats', v_threats::text, true);
  perform set_config('test.team_a', (select array_agg(id order by acquired_at, id)::text from (
    select id, acquired_at from public.card_instances where owner_id = '00000000-0000-4000-8000-0000000000a1' order by acquired_at, id limit 5) s), true);
  perform set_config('test.team_b', (select array_agg(id order by acquired_at, id)::text from (
    select id, acquired_at from public.card_instances where owner_id = '00000000-0000-4000-8000-0000000000b2' order by acquired_at, id limit 5) s), true);
  perform set_config('test.team_c', (select array_agg(id order by acquired_at, id)::text from (
    select id, acquired_at from public.card_instances where owner_id = '00000000-0000-4000-8000-0000000000c3' order by acquired_at, id limit 5) s), true);
end $$;

create function pg_temp.play(p_instance uuid, p_score integer, p_auto boolean default false)
returns jsonb language sql as $$
  select jsonb_build_object('card_instance_id', p_instance,
    'definition_id', (select definition_id from public.card_instances where id = p_instance),
    'base', p_score, 'bonus', 0, 'score', p_score, 'highest', least(p_score, 10), 'auto_played', p_auto)
$$;

-- Friend code: A hosts, B joins. Nobody can join their own lobby or a missing one.
set local role authenticated;

do $$
declare
  v_lobby jsonb := public.create_lobby(current_setting('test.team_a')::uuid[]);
begin
  assert v_lobby ->> 'code' ~ '^[A-HJ-NP-Z2-9]{6}$', format('bad code %s', v_lobby ->> 'code');
  assert (select count(*) from public.match_lobbies) = 1, 'host cannot read their lobby';
  perform set_config('test.code', v_lobby ->> 'code', true);
end $$;

reset role;

do $$
declare
  v_match uuid;
begin
  begin
    perform public.match_join_lobby('00000000-0000-4000-8000-0000000000a1', current_setting('test.code'),
      current_setting('test.team_a')::uuid[], current_setting('test.threats')::uuid[]);
    raise exception 'ASSERT: a host joined their own lobby';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'cannot_play_yourself', sqlerrm;
  end;
  begin
    perform public.match_join_lobby('00000000-0000-4000-8000-0000000000b2', 'ZZZZZZ',
      current_setting('test.team_b')::uuid[], current_setting('test.threats')::uuid[]);
    raise exception 'ASSERT: joined a missing lobby';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'lobby_not_found', sqlerrm;
  end;

  v_match := public.match_join_lobby('00000000-0000-4000-8000-0000000000b2', lower(current_setting('test.code')),
    current_setting('test.team_b')::uuid[], current_setting('test.threats')::uuid[]);
  perform set_config('test.match', v_match::text, true);
  assert (select player_a = '00000000-0000-4000-8000-0000000000a1' and player_b = '00000000-0000-4000-8000-0000000000b2'
          and mode = 'friendly' from public.matches where id = v_match), 'wrong match shape';
  assert not exists (select 1 from public.match_lobbies), 'lobby not removed';

  -- Secret plays: A chooses, B sees only that A has chosen.
  assert public.match_submit_play('00000000-0000-4000-8000-0000000000a1', v_match, 1,
    (current_setting('test.team_a')::uuid[])[1]) = 'waiting', 'first choice should wait';
  -- A may change their mind before the round is resolved.
  assert public.match_submit_play('00000000-0000-4000-8000-0000000000a1', v_match, 1,
    (current_setting('test.team_a')::uuid[])[2]) = 'waiting', 'changing the choice should wait';
  begin
    perform public.match_submit_play('00000000-0000-4000-8000-0000000000b2', v_match, 1,
      (current_setting('test.team_a')::uuid[])[3]);
    raise exception 'ASSERT: B played a card of A';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'character_not_available', sqlerrm;
  end;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);

do $$
declare
  v_state jsonb := public.get_match_state(current_setting('test.match')::uuid);
  v_card uuid;
begin
  assert v_state ->> 'my_side' = 'b', 'B should be side b';
  assert v_state -> 'opponent' ->> 'username' = 'Ospite_A', format('opponent %s', v_state -> 'opponent');
  assert (v_state -> 'rounds' -> 0 ->> 'opponent_has_chosen')::boolean, 'B should see that A has chosen';
  assert v_state -> 'rounds' -> 0 -> 'my_pending_instance_id' = 'null'::jsonb, 'B has not chosen';
  foreach v_card in array current_setting('test.team_a')::uuid[] loop
    assert position(v_card::text in v_state::text) = 0, 'a card of A leaked to B';
  end loop;
  begin
    perform 1 from public.pending_plays;
    raise exception 'ASSERT: a client read the secret choices';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

do $$
declare
  v_match uuid := current_setting('test.match')::uuid;
  v_a uuid[] := current_setting('test.team_a')::uuid[];
  v_b uuid[] := current_setting('test.team_b')::uuid[];
begin
  assert public.match_submit_play('00000000-0000-4000-8000-0000000000b2', v_match, 1, v_b[1]) = 'ready', 'both chose';

  -- The engine must use the submitted choices: not another card, not an auto-play.
  begin
    perform public.match_record_round(v_match, 1, pg_temp.play(v_a[1], 9), pg_temp.play(v_b[1], 4), 'a', null);
    raise exception 'ASSERT: a play different from the submitted choice was accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'choice_not_submitted', sqlerrm;
  end;
  begin
    perform public.match_record_round(v_match, 1, pg_temp.play(v_a[2], 9), pg_temp.play(v_b[1], 4, true), 'a', null);
    raise exception 'ASSERT: a submitted choice was auto-played';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'choice_ignored', sqlerrm;
  end;

  perform public.match_record_round(v_match, 1, pg_temp.play(v_a[2], 9), pg_temp.play(v_b[1], 4), 'a', null);
  assert not exists (select 1 from public.pending_plays where match_id = v_match), 'pending plays not cleared';

  -- Round 2: only A chooses; an auto-play for B is refused before the deadline...
  perform public.match_submit_play('00000000-0000-4000-8000-0000000000a1', v_match, 2, v_a[3]);
  begin
    perform public.match_record_round(v_match, 2, pg_temp.play(v_a[3], 9), pg_temp.play(v_b[2], 4, true), 'a', null);
    raise exception 'ASSERT: auto-played before the deadline';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'round_not_expired', sqlerrm;
  end;
  -- ...and accepted after it; A's choice made in time still counts.
  update public.match_rounds set deadline_at = now() - interval '1 minute' where match_id = v_match and round = 2;
  begin
    perform public.match_submit_play('00000000-0000-4000-8000-0000000000b2', v_match, 2, v_b[2]);
    raise exception 'ASSERT: a late choice was accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'round_expired', sqlerrm;
  end;
  perform public.match_record_round(v_match, 2, pg_temp.play(v_a[3], 9), pg_temp.play(v_b[2], 4, true), 'a', null);

  perform public.match_submit_play('00000000-0000-4000-8000-0000000000a1', v_match, 3, v_a[4]);
  perform public.match_submit_play('00000000-0000-4000-8000-0000000000b2', v_match, 3, v_b[3]);
  perform public.match_record_round(v_match, 3, pg_temp.play(v_a[4], 20), pg_temp.play(v_b[3], 4), 'a', 'a');

  assert (select status = 'finished' and result = 'a' and reward_coins_a = 50 and reward_coins_b = 15
          from public.matches where id = v_match), 'PvP rewards 50/15';
  assert (select wins = 1 and current_streak = 1 and best_streak = 1 and matches_played = 1
          from public.profiles where id = '00000000-0000-4000-8000-0000000000a1'), 'winner statistics';
  assert (select losses = 1 and current_streak = 0 from public.profiles where id = '00000000-0000-4000-8000-0000000000b2'),
    'loser statistics';
end $$;

-- Queue: A waits, C arrives and is paired with A (A waited longer: side a).
do $$
declare
  v_match uuid;
begin
  assert public.match_queue_join('00000000-0000-4000-8000-0000000000a1', current_setting('test.team_a')::uuid[],
    current_setting('test.threats')::uuid[]) is null, 'nobody was waiting';
  assert (select count(*) from public.matchmaking_queue) = 1, 'A not queued';
  -- Refreshing keeps a single entry.
  perform public.match_queue_join('00000000-0000-4000-8000-0000000000a1', current_setting('test.team_a')::uuid[],
    current_setting('test.threats')::uuid[]);
  assert (select count(*) from public.matchmaking_queue) = 1, 'refresh duplicated the entry';

  v_match := public.match_queue_join('00000000-0000-4000-8000-0000000000c3', current_setting('test.team_c')::uuid[],
    current_setting('test.threats')::uuid[]);
  assert v_match is not null, 'C was not paired';
  assert (select player_a = '00000000-0000-4000-8000-0000000000a1' and player_b = '00000000-0000-4000-8000-0000000000c3'
          from public.matches where id = v_match), 'wrong sides';
  assert not exists (select 1 from public.matchmaking_queue), 'queue not emptied';
  perform set_config('test.match2', v_match::text, true);

  begin
    perform public.match_queue_join('00000000-0000-4000-8000-0000000000a1', current_setting('test.team_a')::uuid[],
      current_setting('test.threats')::uuid[]);
    raise exception 'ASSERT: queued while playing';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'match_already_active', sqlerrm;
  end;
end $$;

-- Absence: C cannot claim while A is present; after the grace C wins by forfeit.
-- A quick forfeit (fewer than 3 rounds) pays the winner only the participation coins.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000c3", "role": "authenticated"}', true);

do $$
begin
  begin
    perform public.claim_victory(current_setting('test.match2')::uuid);
    raise exception 'ASSERT: claimed a victory against a present opponent';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'opponent_still_connected', sqlerrm;
  end;
end $$;

reset role;
update public.match_teams set last_seen_at = now() - interval '2 minutes'
where match_id = current_setting('test.match2')::uuid and side = 'a';
set local role authenticated;

do $$
declare
  v_state jsonb := public.claim_victory(current_setting('test.match2')::uuid);
begin
  assert v_state ->> 'result' = 'win' and v_state ->> 'end_reason' = 'forfeit', 'claim should win by forfeit';
  assert (v_state ->> 'reward_coins')::integer = 15, format('quick forfeit paid %s', v_state ->> 'reward_coins');
end $$;

reset role;

do $$
begin
  assert (select reward_coins_a from public.matches where id = current_setting('test.match2')::uuid) = 0,
    'the absent player was paid';
end $$;

-- Same pair: from the 4th match within 24 hours, no coins.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000a1';
  v_b uuid := '00000000-0000-4000-8000-0000000000b2';
  v_match uuid;
begin
  -- Two more finished A-B matches (one already played above): 3 in total.
  for i in 1..2 loop
    insert into public.matches (mode, player_a, player_b, threat_ids, threat_levels, status, result, end_reason, finished_at)
    values ('friendly', v_b, v_a, current_setting('test.threats')::uuid[], '{1,5,3,3,2}', 'finished', 'draw', 'completed', now());
  end loop;

  v_match := public.create_pvp_match('friendly', v_a, current_setting('test.team_a')::uuid[], v_b,
    current_setting('test.team_b')::uuid[], current_setting('test.threats')::uuid[]);
  perform public.finish_match(v_match, 'a', 'completed');
  assert (select reward_coins_a = 0 and reward_coins_b = 0 from public.matches where id = v_match),
    'the 4th match against the same opponent paid coins';
end $$;

rollback;

select 'pvp: all assertions passed' as result;
