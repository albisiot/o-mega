-- Integration test for when the server's opponent chooses (SPEC §8.7, §8.8): in the window of
-- the mode after the opening, or now and then in the last seconds, and never later than the
-- margin before the deadline, so the app sees its choice before the timer ends. The same plan
-- for every round, the first one and those opened later by the trigger. Service-only functions
-- are called as the database owner. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000009e1', 'authenticated', 'authenticated', 'gt-a@example.test', '{"full_name": "Tempi A"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000009e1", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- Known values, whatever the live ones are.
update public.game_config set value = '9' where key = 'ranked.ghosts.delays.classic.min';
update public.game_config set value = '26' where key = 'ranked.ghosts.delays.classic.max';
update public.game_config set value = '4' where key = 'ranked.ghosts.late_seconds.min';
update public.game_config set value = '8' where key = 'ranked.ghosts.late_seconds.max';
update public.game_config set value = '4' where key = 'ranked.ghosts.deadline_margin_seconds';
-- Nobody else waits in this test.
delete from public.matchmaking_queue;

-- Through the ranked queue until the server's opponent comes, as in ranked.test.sql.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000009e1';
  v_team uuid[];
  v_bot uuid[];
  v_threats uuid[];
  v_match uuid;
begin
  select array_agg(s.id) into v_team from (
    select distinct on (i.definition_id) i.id from public.card_instances i
    where i.owner_id = v_user order by i.definition_id, i.id limit 5
  ) s;
  select array_agg(s.id) into v_bot from (
    select id from public.card_definitions where is_active and rarity_code = 'delta' order by code limit 5
  ) s;
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level and is_active and rarity_code is null
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;

  perform public.match_queue_join(v_user, 'ranked', v_team, v_threats, 'medium', v_bot, 'classic');
  update public.matchmaking_queue set enqueued_at = now() - interval '31 seconds' where user_id = v_user;
  v_match := public.match_queue_join(v_user, 'ranked', v_team, v_threats, 'medium', v_bot, 'classic');
  assert v_match is not null, 'no opponent after the wait';
  assert exists (select 1 from public.ranked_matches where match_id = v_match and ghost_id is not null), 'not the server''s opponent';
  assert exists (select 1 from public.ranked_ghost_turns where match_id = v_match and round = 1), 'first choice not planned';
  perform set_config('test.match', v_match::text, true);
  perform set_config('test.team', v_team::text, true);
  perform set_config('test.bot', v_bot::text, true);
end $$;

-- Plans the choice of round 1 again, with the values of the moment.
create function pg_temp.replan() returns timestamptz language plpgsql as $$
declare
  v_match uuid := current_setting('test.match')::uuid;
  v_ready timestamptz;
begin
  delete from public.ranked_ghost_turns where match_id = v_match and round = 1;
  perform public.ranked_plan_ghost_turn(v_match, 1);
  select ready_at into v_ready from public.ranked_ghost_turns where match_id = v_match and round = 1;
  return v_ready;
end;
$$;

do $$
declare
  v_match uuid := current_setting('test.match')::uuid;
  v_deadline timestamptz := (select deadline_at from public.match_rounds where match_id = current_setting('test.match')::uuid and round = 1);
  v_ready timestamptz;
begin
  -- In the window of the mode, counted from the opening.
  update public.game_config set value = '0' where key = 'ranked.ghosts.late_chance_percent';
  for i in 1..30 loop
    v_ready := pg_temp.replan();
    assert v_ready between now() + interval '9 seconds' and now() + interval '26 seconds', 'outside the window: ' || v_ready;
    assert v_ready <= v_deadline - interval '4 seconds', 'inside the margin: ' || v_ready;
  end loop;

  -- The late choices: in the last seconds, never inside the margin.
  update public.game_config set value = '100' where key = 'ranked.ghosts.late_chance_percent';
  for i in 1..30 loop
    v_ready := pg_temp.replan();
    assert v_ready between v_deadline - interval '8 seconds' and v_deadline - interval '4 seconds', 'late outside its window: ' || v_ready;
  end loop;

  -- Whatever the windows say, never later than the margin before the deadline.
  update public.game_config set value = '0' where key = 'ranked.ghosts.late_chance_percent';
  update public.game_config set value = '500' where key = 'ranked.ghosts.delays.classic.min';
  update public.game_config set value = '600' where key = 'ranked.ghosts.delays.classic.max';
  assert pg_temp.replan() = v_deadline - interval '4 seconds', 'a window past the deadline';
  update public.game_config set value = '100' where key = 'ranked.ghosts.late_chance_percent';
  update public.game_config set value = '0' where key = 'ranked.ghosts.late_seconds.min';
  update public.game_config set value = '1' where key = 'ranked.ghosts.late_seconds.max';
  assert pg_temp.replan() = v_deadline - interval '4 seconds', 'a late window inside the margin';
  update public.game_config set value = '6' where key = 'ranked.ghosts.deadline_margin_seconds';
  assert pg_temp.replan() = v_deadline - interval '6 seconds', 'the margin is not read from game_config';

  -- Known values again for the rounds opened by the trigger.
  update public.game_config set value = '0' where key = 'ranked.ghosts.late_chance_percent';
  update public.game_config set value = '9' where key = 'ranked.ghosts.delays.classic.min';
  update public.game_config set value = '26' where key = 'ranked.ghosts.delays.classic.max';
  update public.game_config set value = '4' where key = 'ranked.ghosts.deadline_margin_seconds';
end $$;

-- The next round, opened when the first one is resolved, is planned the same way.
do $$
declare
  v_match uuid := current_setting('test.match')::uuid;
  v_user uuid := '00000000-0000-4000-8000-0000000009e1';
  v_team uuid[] := current_setting('test.team')::uuid[];
  v_defs uuid[] := (select definition_ids from public.match_teams where match_id = current_setting('test.match')::uuid and side = 'a');
  v_bot uuid[] := (select definition_ids from public.match_teams where match_id = current_setting('test.match')::uuid and side = 'b');
  v_turn record;
begin
  perform public.match_submit_play(v_user, v_match, 1, v_team[1]);
  perform public.match_record_round(v_match, 1,
    jsonb_build_object('card_instance_id', v_team[1], 'definition_id', v_defs[1],
      'base', 20, 'bonus', 0, 'score', 20, 'highest', 10, 'auto_played', false),
    jsonb_build_object('definition_id', v_bot[1],
      'base', 4, 'bonus', 0, 'score', 4, 'highest', 10, 'auto_played', false),
    'a', null);
  select t.ready_at, r.deadline_at into v_turn
  from public.ranked_ghost_turns t join public.match_rounds r on r.match_id = t.match_id and r.round = t.round
  where t.match_id = v_match and t.round = 2;
  assert v_turn.ready_at is not null, 'second choice not planned';
  assert v_turn.ready_at between now() + interval '9 seconds' and now() + interval '26 seconds', 'second choice outside the window';
  assert v_turn.ready_at <= v_turn.deadline_at - interval '4 seconds', 'second choice inside the margin';
end $$;

rollback;
