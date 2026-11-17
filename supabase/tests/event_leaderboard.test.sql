-- Integration test for the event leaderboard: only a player who reached the last target
-- of an event sees it (by default), it ranks by event points then by who completed first,
-- it keeps the caller's own place when the list is cut, and it returns no private data.
-- Service-only functions are called as the database owner. Runs inside a rolled-back
-- transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000002a1', 'authenticated', 'authenticated', 'evlb-a@example.test', '{"full_name": "Classifica Evento A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000002a2', 'authenticated', 'authenticated', 'evlb-b@example.test', '{"full_name": "Classifica Evento B"}', now(), now()),
  ('00000000-0000-4000-8000-0000000002a3', 'authenticated', 'authenticated', 'evlb-c@example.test', '{"full_name": "Classifica Evento C"}', now(), now()),
  ('00000000-0000-4000-8000-0000000002a4', 'authenticated', 'authenticated', 'evlb-d@example.test', '{"full_name": "Classifica Evento D"}', now(), now()),
  ('00000000-0000-4000-8000-0000000002a5', 'authenticated', 'authenticated', 'evlb-e@example.test', '{"full_name": "Classifica Evento E"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000002a1", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000002a2", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000002a3", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000002a4", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000002a5", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- Known values, whatever the live ones are; no other event takes the points below.
update public.game_config set value = '100' where key = 'events.leaderboard_size';
update public.game_config set value = '"completed"' where key = 'events.leaderboard_visibility';
update public.events set is_active = false where is_active;

insert into public.events (id, title, description, starts_at, ends_at, points)
values ('00000000-0000-4000-8000-0000000002e1', 'Classifica di prova', '', now() - interval '1 hour', now() + interval '1 day',
        public.event_points_rules('{"bot": {"win": 10}}'));
insert into public.event_tiers (event_id, tier, points, coins) values
  ('00000000-0000-4000-8000-0000000002e1', 1, 20, 10),
  ('00000000-0000-4000-8000-0000000002e1', 2, 50, 10);

-- Bot wins of 10 points each: C 100, A 70, B 70, D 20 (first target only), E nothing.
do $$
declare
  v_wins record;
begin
  for v_wins in
    select * from (values
      ('00000000-0000-4000-8000-0000000002a3'::uuid, 10),
      ('00000000-0000-4000-8000-0000000002a1'::uuid, 7),
      ('00000000-0000-4000-8000-0000000002a2'::uuid, 7),
      ('00000000-0000-4000-8000-0000000002a4'::uuid, 2)
    ) w(user_id, wins)
  loop
    for i in 1..v_wins.wins loop
      perform public.award_event_points(v_wins.user_id, 'bot', 'win', gen_random_uuid(), 0, null, null);
    end loop;
  end loop;
end $$;

-- A tie on 70: A completed the event before B.
update public.event_rewards set granted_at = now() - interval '30 minutes'
where event_id = '00000000-0000-4000-8000-0000000002e1' and user_id = '00000000-0000-4000-8000-0000000002a1' and tier = 2;
update public.event_rewards set granted_at = now() - interval '10 minutes'
where event_id = '00000000-0000-4000-8000-0000000002e1' and user_id = '00000000-0000-4000-8000-0000000002a2' and tier = 2;

create temp table evlb_names as
select id, username from public.profiles where id::text like '00000000-0000-4000-8000-0000000002a_';
grant select on evlb_names to authenticated;

set local role authenticated;

-- Not completed: no leaderboard, and no way around the RPC.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000002a4", "role": "authenticated"}', true);
do $$
begin
  begin
    perform public.get_event_leaderboard('00000000-0000-4000-8000-0000000002e1');
    raise exception 'ASSERT: a player with one target of two saw the leaderboard';
  exception when insufficient_privilege then
    assert sqlerrm = 'event_leaderboard_locked', sqlerrm;
  end;
  begin
    perform public.event_leaderboard_payload('00000000-0000-4000-8000-0000000002e1', auth.uid());
    raise exception 'ASSERT: a player called the internal payload';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.event_rewards;
    raise exception 'ASSERT: a player read the event rewards';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.get_event_leaderboard(gen_random_uuid());
    raise exception 'ASSERT: an event that does not exist';
  exception when raise_exception then
    assert sqlerrm = 'event_not_found', sqlerrm;
  end;
  -- The event is still running: no "last event" to show.
  assert public.get_event_leaderboard(null) is null, 'no ended event leaderboard';
end $$;

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000002a5", "role": "authenticated"}', true);
do $$
begin
  perform public.get_event_leaderboard('00000000-0000-4000-8000-0000000002e1');
  raise exception 'ASSERT: a player who never played saw the leaderboard';
exception when insufficient_privilege then
  assert sqlerrm = 'event_leaderboard_locked', sqlerrm;
end $$;

-- A completed it: the whole ranking.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000002a1", "role": "authenticated"}', true);
do $$
declare
  v_board jsonb := public.get_event_leaderboard('00000000-0000-4000-8000-0000000002e1');
  v_top jsonb := v_board -> 'top';
  v_entry jsonb;
  v_text text := v_board::text;
  v_id record;
begin
  assert v_board ->> 'title' = 'Classifica di prova', 'title';
  assert (v_board ->> 'tiers')::integer = 2, 'targets of the event';
  assert (v_board ->> 'players')::integer = 4, format('players: %s', v_board ->> 'players');
  assert (v_board ->> 'completed')::integer = 3, format('completed: %s', v_board ->> 'completed');
  assert not (v_board ->> 'ended')::boolean, 'still running';
  assert jsonb_array_length(v_top) = 4, 'every player who earned points; E is not there';

  -- C 100, then A and B on 70 (A completed first), then D.
  assert v_top -> 0 ->> 'username' = (select username from evlb_names where id = '00000000-0000-4000-8000-0000000002a3'), 'first: C';
  assert v_top -> 1 ->> 'username' = (select username from evlb_names where id = '00000000-0000-4000-8000-0000000002a1'), 'second: A';
  assert v_top -> 2 ->> 'username' = (select username from evlb_names where id = '00000000-0000-4000-8000-0000000002a2'), 'third: B';
  assert v_top -> 3 ->> 'username' = (select username from evlb_names where id = '00000000-0000-4000-8000-0000000002a4'), 'fourth: D';
  assert (v_top -> 0 ->> 'points')::integer = 100 and (v_top -> 3 ->> 'points')::integer = 20, 'points';
  assert (v_top -> 0 ->> 'rank')::integer = 1 and (v_top -> 3 ->> 'rank')::integer = 4, 'ranks';
  assert (v_top -> 3 ->> 'steps')::integer = 1 and v_top -> 3 -> 'completed_at' = 'null'::jsonb, 'D is still on the way';
  assert (v_top -> 1 ->> 'steps')::integer = 2 and v_top -> 1 ->> 'completed_at' is not null, 'A completed';
  assert (v_top -> 1 ->> 'is_me')::boolean and (select count(*) from jsonb_array_elements(v_top) e where (e ->> 'is_me')::boolean) = 1,
    'only the caller is marked';
  assert (v_board -> 'me' ->> 'rank')::integer = 2, 'own place';

  -- Public fields only: no ids, no emails.
  for v_entry in select e from jsonb_array_elements(v_top) e loop
    assert (select array_agg(k order by k) from jsonb_object_keys(v_entry) k)
           = array['avatar_url', 'completed_at', 'is_me', 'points', 'rank', 'steps', 'username'],
      format('fields of an entry: %s', v_entry);
  end loop;
  for v_id in select id from evlb_names loop
    assert position(v_id.id::text in v_text) = 0, 'a player id in the leaderboard';
  end loop;
  assert position('@example.test' in v_text) = 0, 'an email in the leaderboard';
end $$;

-- A shorter list keeps the caller's place apart.
reset role;
update public.game_config set value = '1' where key = 'events.leaderboard_size';
set local role authenticated;
do $$
declare
  v_board jsonb := public.get_event_leaderboard('00000000-0000-4000-8000-0000000002e1');
begin
  assert jsonb_array_length(v_board -> 'top') = 1, 'cut to the size';
  assert (v_board -> 'top' -> 0 ->> 'points')::integer = 100, 'the first stays';
  assert (v_board -> 'me' ->> 'rank')::integer = 2 and (v_board -> 'me' ->> 'is_me')::boolean, 'own place below';
  assert (v_board ->> 'players')::integer = 4, 'players counted beyond the list';
end $$;

-- Once the event is over it stays readable, also as "the last event".
reset role;
update public.game_config set value = '100' where key = 'events.leaderboard_size';
update public.events set ends_at = now() where id = '00000000-0000-4000-8000-0000000002e1';
set local role authenticated;
do $$
declare
  v_board jsonb := public.get_event_leaderboard(null);
begin
  assert v_board ->> 'event_id' = '00000000-0000-4000-8000-0000000002e1', 'the last event that ended';
  assert (v_board ->> 'ended')::boolean, 'ended';
  assert (public.get_event_leaderboard('00000000-0000-4000-8000-0000000002e1') -> 'me' ->> 'rank')::integer = 2, 'by id too';
end $$;

-- Still closed to D after the end; the last event is just not offered.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000002a4", "role": "authenticated"}', true);
do $$
begin
  assert public.get_event_leaderboard(null) is null, 'the last event offered to a player who did not complete it';
  perform public.get_event_leaderboard('00000000-0000-4000-8000-0000000002e1');
  raise exception 'ASSERT: D saw the leaderboard after the end';
exception when insufficient_privilege then
  assert sqlerrm = 'event_leaderboard_locked', sqlerrm;
end $$;

-- The setting opens it to every participant, or to everyone.
reset role;
update public.game_config set value = '"participants"' where key = 'events.leaderboard_visibility';
set local role authenticated;
do $$
begin
  assert (public.get_event_leaderboard('00000000-0000-4000-8000-0000000002e1') -> 'me' ->> 'rank')::integer = 4, 'D as a participant';
end $$;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000002a5", "role": "authenticated"}', true);
do $$
begin
  perform public.get_event_leaderboard('00000000-0000-4000-8000-0000000002e1');
  raise exception 'ASSERT: E is no participant';
exception when insufficient_privilege then
  assert sqlerrm = 'event_leaderboard_locked', sqlerrm;
end $$;
reset role;
update public.game_config set value = '"everyone"' where key = 'events.leaderboard_visibility';
set local role authenticated;
do $$
declare
  v_board jsonb := public.get_event_leaderboard('00000000-0000-4000-8000-0000000002e1');
begin
  assert jsonb_array_length(v_board -> 'top') = 4 and v_board -> 'me' = 'null'::jsonb, 'E sees it, without a place';
end $$;

-- Signed out: nothing.
select set_config('request.jwt.claims', '{"role": "authenticated"}', true);
do $$
begin
  perform public.get_event_leaderboard(null);
  raise exception 'ASSERT: a signed-out call';
exception when insufficient_privilege then
  assert sqlerrm = 'not_authenticated', sqlerrm;
end $$;
reset role;
do $$
begin
  assert not has_function_privilege('anon', 'public.get_event_leaderboard(uuid)', 'execute'), 'anon may call it';
  assert not has_function_privilege('authenticated', 'public.event_leaderboard_allowed(uuid, uuid)', 'execute'), 'helper exposed';
end $$;

rollback;
