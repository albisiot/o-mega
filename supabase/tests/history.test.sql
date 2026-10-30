-- Integration test for M9 (match history, closing abandoned matches).
-- Service-only functions are called as the database owner, as the Edge
-- Function would with service_role. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'hi-a@example.test', '{"full_name": "Storico A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'hi-b@example.test', '{"full_name": "Storico B"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000a1';
  v_b uuid := '00000000-0000-4000-8000-0000000000b2';
  v_team_a uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 5) s);
  v_team_b uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_b order by acquired_at, id limit 5) s);
  v_bot uuid[] := (select array_agg(s.id) from (select id from public.card_definitions order by code limit 5) s);
  v_threats uuid[];
  v_match uuid;
begin
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;

  -- A running match with a recent deadline is left alone.
  v_match := public.match_create_bot(v_a, 'easy', v_team_a, v_bot, v_threats);
  perform public.close_abandoned_matches(v_a);
  assert (select status from public.matches where id = v_match) = 'active', 'a live match was closed';

  -- A bot match abandoned for too long is lost, with no XP.
  update public.match_rounds set deadline_at = now() - interval '11 minutes' where match_id = v_match;
  perform public.close_abandoned_matches(v_a);
  assert (select status = 'finished' and result = 'b' and end_reason = 'forfeit' from public.matches where id = v_match),
    'abandoned bot match not closed';
  assert (select bot_losses = 1 and xp = 0 from public.profiles where id = v_a), 'abandoned bot match statistics';
  -- now() is fixed inside this transaction: give the two matches distinct times.
  update public.matches set finished_at = now() - interval '1 hour' where id = v_match;

  -- A PvP match abandoned by both is a draw: nobody earns, nothing moves.
  v_match := public.create_pvp_match('friendly', v_a, v_team_a, v_b, v_team_b, v_threats);
  update public.match_rounds set deadline_at = now() - interval '11 minutes' where match_id = v_match;
  -- Coming back through a team check closes it, so a new match can start.
  perform public.validate_team(v_b, v_team_b);
  assert (select status = 'finished' and result = 'draw' and reward_coins_a = 0 and reward_coins_b = 0
          from public.matches where id = v_match), 'abandoned PvP match not closed as a draw';
  assert (select xp = 0 from public.profiles where id = v_b), 'an abandoned PvP match paid XP';

  perform set_config('test.pvp_match', v_match::text, true);
end $$;

set local role authenticated;

do $$
declare
  v_history jsonb := public.get_match_history();
  v_first jsonb := v_history -> 0;
begin
  assert jsonb_array_length(v_history) = 2, format('expected 2 matches, got %s', jsonb_array_length(v_history));
  -- Newest first: the PvP draw, seen by A.
  assert v_first ->> 'id' = current_setting('test.pvp_match'), 'history not sorted by date';
  assert v_first ->> 'result' = 'draw', 'draw not reported';
  assert v_first ->> 'opponent' = 'Storico_B', format('opponent %s', v_first ->> 'opponent');
  assert v_history -> 1 ->> 'result' = 'loss', 'bot defeat not reported';
  assert v_history -> 1 ->> 'opponent' is null, 'a bot has no username';
  assert jsonb_array_length(public.get_match_history(1)) = 1, 'limit ignored';
  assert public.get_active_match() is null, 'no match should be running';
end $$;

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);

do $$
begin
  -- Another player's matches stay private: B only took part in the PvP one.
  assert jsonb_array_length(public.get_match_history()) = 1, 'B sees the matches of A';
  begin
    perform public.close_abandoned_matches(auth.uid());
    raise exception 'ASSERT: a client called an internal function';
  exception when insufficient_privilege then null;
  end;
end $$;

set local role anon;

do $$
begin
  begin
    perform public.get_match_history();
    raise exception 'ASSERT: anon read a history';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;

select 'history: all assertions passed' as result;
