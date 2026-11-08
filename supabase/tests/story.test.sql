-- Integration test for the story mode: missions open in order, their matches
-- are the hand-made ones, and the first win pays once. The service-only
-- functions are called as the database owner, as the Edge Function would with
-- service_role. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'story-a@example.test',
   '{"full_name": "Storia A"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);
select public.bootstrap_player();

-- The chapter as the player sees it: first mission open, nothing secret.
do $$
declare
  v_story jsonb := public.get_story();
  v_missions jsonb := v_story -> 0 -> 'missions';
begin
  assert jsonb_array_length(v_story) = 1, 'one chapter';
  assert jsonb_array_length(v_missions) = 5, 'five missions';
  assert (v_missions -> 0 ->> 'unlocked')::boolean and not (v_missions -> 1 ->> 'unlocked')::boolean, 'only the first is open';
  assert jsonb_array_length(v_missions -> 0 -> 'threat_levels') = 5, 'threat levels';
  assert v_missions -> 4 -> 'reward_card' ->> 'code' = 'P051', 'boss card';
  assert not (v_missions -> 0 ? 'bot_definition_ids') and not (v_missions -> 0 ? 'threat_ids'), 'secrets reached the client';
  assert v_story -> 0 -> 'outro' = 'null'::jsonb, 'ending of a chapter not completed';

  begin
    perform count(*) from public.story_missions;
    raise exception 'ASSERT: a client read the missions';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

-- Playing the missions: order, the hand-made match, and the rewards.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000e1';
  v_team uuid[];
  v_match uuid;
  v_mission public.story_missions;
  v_balance integer;
  v_count integer;
begin
  select array_agg(id) into v_team from (
    select id from public.card_instances where owner_id = v_user order by acquired_at, id limit 5
  ) s;

  begin
    perform public.story_create_match(v_user, 'C1M2', v_team);
    raise exception 'ASSERT: a locked mission started';
  exception when raise_exception then
    assert sqlerrm = 'story_mission_locked', sqlerrm;
  end;
  begin
    perform public.story_create_match(v_user, 'NOPE', v_team);
    raise exception 'ASSERT: an unknown mission started';
  exception when raise_exception then
    assert sqlerrm = 'story_mission_not_found', sqlerrm;
  end;

  for i in 1..5 loop
    select * into v_mission from public.story_missions where chapter = 1 and ord = i;
    v_match := public.story_create_match(v_user, v_mission.code, v_team);
    assert (select threat_ids = v_mission.threat_ids and threat_modifiers = v_mission.threat_modifiers
                   and bot_difficulty = v_mission.bot_difficulty and story_mission_id = v_mission.id
            from public.matches where id = v_match), 'not the mission''s match';
    assert (select definition_ids = v_mission.bot_definition_ids from public.match_teams
            where match_id = v_match and side = 'b'), 'not the mission''s opponent';

    -- A loss pays nothing and leaves the mission to play.
    if i = 1 then
      perform public.finish_match(v_match, 'b', 'completed');
      assert not exists (select 1 from public.story_progress where user_id = v_user), 'a loss completed the mission';
      v_match := public.story_create_match(v_user, v_mission.code, v_team);
    end if;

    v_balance := public.coin_balance(v_user);
    perform public.finish_match(v_match, 'a', 'completed');
    assert public.coin_balance(v_user) >= v_balance + v_mission.reward_coins, 'mission coins not paid';
    assert exists (select 1 from public.story_progress where user_id = v_user and mission_id = v_mission.id and match_id = v_match),
      'mission not completed';
  end loop;

  -- The boss card, as a plain conquerable copy with its ledger row.
  assert (select count(*) from public.card_instances i join public.card_definitions d on d.id = i.definition_id
          where i.owner_id = v_user and i.acquired_via = 'story' and d.code = 'P051' and not i.is_starter) = 1, 'boss card';
  assert (select count(*) from public.card_transfers where to_user = v_user and reason = 'story') = 1, 'card transfer';
  assert (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'story_reward') = 260, 'story coins';

  -- A replay pays nothing more.
  v_match := public.story_create_match(v_user, 'C1M5', v_team);
  perform public.finish_match(v_match, 'a', 'completed');
  select count(*) into v_count from public.card_instances where owner_id = v_user and acquired_via = 'story';
  assert v_count = 1, 'a replay gave another card';
  assert (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'story_reward') = 260, 'a replay paid coins';

  -- For the next block, which runs as the player and cannot read these tables.
  perform set_config('story_test.first', (
    select p.match_id::text from public.story_progress p join public.story_missions m on m.id = p.mission_id
    where m.code = 'C1M5' and p.user_id = v_user), true);
  perform set_config('story_test.replay', v_match::text, true);
end $$;

-- The result screen: what this match paid.
set local role authenticated;

do $$
declare
  v_first uuid := current_setting('story_test.first')::uuid;
  v_replay uuid := current_setting('story_test.replay')::uuid;
  v_reward jsonb;
begin
  v_reward := public.get_story_reward(v_first);
  assert (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'coins')::integer = 80, 'reward of the first win';
  assert v_reward -> 'card' ->> 'code' = 'P051' and (v_reward -> 'card' ->> 'instance_id') is not null, 'reward card';
  assert (v_reward ->> 'is_last')::boolean, 'last mission';

  v_reward := public.get_story_reward(v_replay);
  assert not (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'completed_before')::boolean, 'replay reward';
  assert (v_reward ->> 'coins')::integer = 0 and v_reward -> 'card' = 'null'::jsonb, 'replay paid';
  assert (select bool_and((m ->> 'completed')::boolean) from jsonb_array_elements(public.get_story() -> 0 -> 'missions') as m),
    'chapter not completed';
  assert public.get_story() -> 0 ->> 'outro' like 'Nel caveau%', 'ending of the completed chapter';
end $$;

rollback;

select 'story: all assertions passed' as result;
