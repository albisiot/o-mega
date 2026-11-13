-- Integration test for the story mode: missions open in order, also from one
-- chapter to the next, their matches are the hand-made ones, and the first win
-- pays once; chapters belong to seasons, and a season's ending shows once it is
-- completed. The service-only functions are called as the database owner, as
-- the Edge Function would with service_role. Runs inside a rolled-back
-- transaction:
--   npm run test:db

begin;

-- Seasons: the order of the whole story (chapter) is the order of seasons and of
-- chapters inside them, every season numbers its chapters from 1 without gaps.
do $$
begin
  assert (select array_agg(chapter order by chapter) from public.story_chapters)
       = (select array_agg(chapter order by season, number) from public.story_chapters),
    'chapter order and season order disagree';
  assert not exists (
    select season from public.story_chapters group by season having min(number) <> 1 or max(number) <> count(*)
  ), 'chapter numbers of a season';
  assert (select title from public.story_seasons where season = 1) = 'Il Rintocco', 'season 1';
  assert (select count(*) from public.story_chapters where season = 1) = 6, 'six chapters in season 1';
end $$;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'story-a@example.test',
   '{"full_name": "Storia A"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);
select public.bootstrap_player();

-- The chapters as the player sees them: first mission open, nothing secret.
do $$
declare
  v_story jsonb := public.get_story();
  v_first jsonb := v_story -> 0 -> 'missions';
  v_second jsonb := v_story -> 1 -> 'missions';
  v_third jsonb := v_story -> 2 -> 'missions';
  v_fourth jsonb := v_story -> 3 -> 'missions';
  v_fifth jsonb := v_story -> 4 -> 'missions';
  v_sixth jsonb := v_story -> 5 -> 'missions';
begin
  assert jsonb_array_length(v_story) = 6, 'six chapters';
  assert (v_story -> 0 ->> 'chapter')::integer = 1 and (v_story -> 1 ->> 'chapter')::integer = 2
     and (v_story -> 2 ->> 'chapter')::integer = 3 and (v_story -> 3 ->> 'chapter')::integer = 4
     and (v_story -> 4 ->> 'chapter')::integer = 5 and (v_story -> 5 ->> 'chapter')::integer = 6, 'chapter order';
  assert jsonb_array_length(v_first) = 5 and jsonb_array_length(v_second) = 5 and jsonb_array_length(v_third) = 5
     and jsonb_array_length(v_fourth) = 5 and jsonb_array_length(v_fifth) = 5 and jsonb_array_length(v_sixth) = 5,
    'five missions each';
  assert (v_first -> 0 ->> 'unlocked')::boolean and not (v_first -> 1 ->> 'unlocked')::boolean, 'only the first is open';
  assert not exists (select 1 from jsonb_array_elements(v_second || v_third || v_fourth || v_fifth || v_sixth) m
                     where (m ->> 'unlocked')::boolean),
    'chapter 2, 3, 4, 5 or 6 open before chapter 1';
  assert not exists (select 1 from jsonb_array_elements(v_first || v_second || v_third || v_fourth || v_fifth || v_sixth) m
                     where jsonb_array_length(m -> 'threat_levels') <> 5), 'threat levels';
  assert v_first -> 4 -> 'reward_card' ->> 'code' = 'P051', 'chapter 1 boss card';
  assert v_second -> 4 -> 'reward_card' ->> 'code' = 'P054', 'chapter 2 boss card';
  assert v_third -> 4 -> 'reward_card' ->> 'code' = 'P052', 'chapter 3 boss card';
  assert v_fourth -> 4 -> 'reward_card' ->> 'code' = 'P111', 'chapter 4 boss card';
  assert v_fifth -> 4 -> 'reward_card' ->> 'code' = 'P055', 'chapter 5 boss card';
  assert v_sixth -> 4 -> 'reward_card' ->> 'code' = 'P079', 'chapter 6 boss card';
  assert not exists (select 1 from jsonb_array_elements(v_first || v_second || v_third || v_fourth || v_fifth || v_sixth) m
                     where m ? 'bot_definition_ids' or m ? 'threat_ids'), 'secrets reached the client';
  assert not exists (select 1 from jsonb_array_elements(v_story) c where c -> 'outro' is distinct from 'null'::jsonb),
    'ending of a chapter not completed';
  assert not exists (select 1 from jsonb_array_elements(v_story) c
                     where (c ->> 'season')::integer <> 1 or c ->> 'season_title' <> 'Il Rintocco'
                        or (c ->> 'number')::integer <> (c ->> 'chapter')::integer),
    'season and number of the chapters of season 1';
  assert not exists (select 1 from jsonb_array_elements(v_story) c where c -> 'season_ending' is distinct from 'null'::jsonb),
    'ending of a season not completed';

  begin
    perform count(*) from public.story_missions;
    raise exception 'ASSERT: a client read the missions';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.story_seasons;
    raise exception 'ASSERT: a client read the seasons';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

-- Playing chapter 1: order, the hand-made match, and the rewards.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000e1';
  v_team uuid[];
  v_match uuid;
  v_mission public.story_missions;
  v_balance integer;
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

  for v_mission in select * from public.story_missions where chapter = 1 order by ord loop
    -- Chapter 2 stays closed until the last mission of chapter 1 is won.
    begin
      perform public.story_create_match(v_user, 'C2M1', v_team);
      raise exception 'ASSERT: chapter 2 started before chapter 1 was completed';
    exception when raise_exception then
      assert sqlerrm = 'story_mission_locked', sqlerrm;
    end;

    v_match := public.story_create_match(v_user, v_mission.code, v_team);
    assert (select threat_ids = v_mission.threat_ids and threat_modifiers = v_mission.threat_modifiers
                   and bot_difficulty = v_mission.bot_difficulty and story_mission_id = v_mission.id
            from public.matches where id = v_match), 'not the mission''s match';
    assert (select definition_ids = v_mission.bot_definition_ids from public.match_teams
            where match_id = v_match and side = 'b'), 'not the mission''s opponent';

    -- A loss pays nothing and leaves the mission to play.
    if v_mission.ord = 1 then
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

  assert (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'story_reward') = 260, 'chapter 1 coins';
  perform set_config('story_test.first', (
    select p.match_id::text from public.story_progress p join public.story_missions m on m.id = p.mission_id
    where m.code = 'C1M5' and p.user_id = v_user), true);
end $$;

-- Between the chapters: the ending of chapter 1 shows, chapter 2 opens at its first mission.
set local role authenticated;

do $$
declare
  v_story jsonb := public.get_story();
  v_second jsonb := v_story -> 1 -> 'missions';
  v_third jsonb := v_story -> 2 -> 'missions';
  v_fourth jsonb := v_story -> 3 -> 'missions';
  v_fifth jsonb := v_story -> 4 -> 'missions';
  v_sixth jsonb := v_story -> 5 -> 'missions';
begin
  assert v_story -> 0 ->> 'outro' like 'Nel caveau%', 'ending of the completed chapter';
  assert v_story -> 1 -> 'outro' = 'null'::jsonb and v_story -> 2 -> 'outro' = 'null'::jsonb
     and v_story -> 3 -> 'outro' = 'null'::jsonb and v_story -> 4 -> 'outro' = 'null'::jsonb
     and v_story -> 5 -> 'outro' = 'null'::jsonb,
    'ending of chapter 2, 3, 4, 5 or 6 before playing it';
  assert (v_second -> 0 ->> 'unlocked')::boolean and not (v_second -> 1 ->> 'unlocked')::boolean, 'chapter 2 opens at its first mission';
  assert not (v_second -> 0 ->> 'completed')::boolean, 'chapter 2 already completed';
  assert not exists (select 1 from jsonb_array_elements(v_third || v_fourth || v_fifth || v_sixth) m where (m ->> 'unlocked')::boolean),
    'chapter 3, 4, 5 or 6 open before chapter 2';
end $$;

reset role;

-- Playing chapters 2 to 5.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000e1';
  v_team uuid[];
  v_match uuid;
  v_mission public.story_missions;
  v_balance integer;
begin
  select array_agg(id) into v_team from (
    select id from public.card_instances where owner_id = v_user and acquired_via <> 'story' order by acquired_at, id limit 5
  ) s;

  begin
    perform public.story_create_match(v_user, 'C2M2', v_team);
    raise exception 'ASSERT: a locked mission of chapter 2 started';
  exception when raise_exception then
    assert sqlerrm = 'story_mission_locked', sqlerrm;
  end;

  for v_mission in select * from public.story_missions where chapter in (2, 3, 4, 5) order by chapter, ord loop
    -- Chapter 3 stays closed until the last mission of chapter 2 is won.
    if v_mission.chapter = 2 then
      begin
        perform public.story_create_match(v_user, 'C3M1', v_team);
        raise exception 'ASSERT: chapter 3 started before chapter 2 was completed';
      exception when raise_exception then
        assert sqlerrm = 'story_mission_locked', sqlerrm;
      end;
    end if;
    -- Chapter 4 stays closed until the last mission of chapter 3 is won.
    if v_mission.chapter in (2, 3) then
      begin
        perform public.story_create_match(v_user, 'C4M1', v_team);
        raise exception 'ASSERT: chapter 4 started before chapter 3 was completed';
      exception when raise_exception then
        assert sqlerrm = 'story_mission_locked', sqlerrm;
      end;
    end if;
    -- Chapter 5 stays closed until the last mission of chapter 4 is won.
    if v_mission.chapter in (2, 3, 4) then
      begin
        perform public.story_create_match(v_user, 'C5M1', v_team);
        raise exception 'ASSERT: chapter 5 started before chapter 4 was completed';
      exception when raise_exception then
        assert sqlerrm = 'story_mission_locked', sqlerrm;
      end;
    end if;
    -- Chapter 6 stays closed until the last mission of chapter 5 is won.
    begin
      perform public.story_create_match(v_user, 'C6M1', v_team);
      raise exception 'ASSERT: chapter 6 started before chapter 5 was completed';
    exception when raise_exception then
      assert sqlerrm = 'story_mission_locked', sqlerrm;
    end;

    v_match := public.story_create_match(v_user, v_mission.code, v_team);
    assert (select threat_ids = v_mission.threat_ids and threat_modifiers = v_mission.threat_modifiers
                   and bot_difficulty = v_mission.bot_difficulty and story_mission_id = v_mission.id
            from public.matches where id = v_match), 'not the mission''s match';
    assert (select definition_ids = v_mission.bot_definition_ids from public.match_teams
            where match_id = v_match and side = 'b'), 'not the mission''s opponent';

    v_balance := public.coin_balance(v_user);
    perform public.finish_match(v_match, 'a', 'completed');
    assert public.coin_balance(v_user) >= v_balance + v_mission.reward_coins, 'mission coins not paid';
    assert exists (select 1 from public.story_progress where user_id = v_user and mission_id = v_mission.id and match_id = v_match),
      'mission not completed';
  end loop;
end $$;

-- Between chapters 5 and 6: the ending of chapter 5 shows, chapter 6 opens at its
-- first mission and keeps its own ending until it is completed.
set local role authenticated;

do $$
declare
  v_story jsonb := public.get_story();
  v_sixth jsonb := v_story -> 5 -> 'missions';
begin
  assert v_story -> 4 ->> 'outro' like 'Oltre la porta%', 'ending of the completed chapter 5';
  assert v_story -> 5 -> 'outro' = 'null'::jsonb, 'ending of chapter 6 before playing it';
  assert not exists (select 1 from jsonb_array_elements(v_story) c where c -> 'season_ending' is distinct from 'null'::jsonb),
    'ending of season 1 before its last chapter';
  assert (v_sixth -> 0 ->> 'unlocked')::boolean and not (v_sixth -> 1 ->> 'unlocked')::boolean, 'chapter 6 opens at its first mission';
  assert not exists (select 1 from jsonb_array_elements(v_sixth) m where (m ->> 'completed')::boolean), 'chapter 6 already completed';
end $$;

reset role;

-- Playing chapter 6, and a replay.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000e1';
  v_team uuid[];
  v_match uuid;
  v_mission public.story_missions;
  v_balance integer;
  v_coins integer := (select sum(reward_coins) from public.story_missions where chapter in (1, 2, 3, 4, 5, 6));
begin
  select array_agg(id) into v_team from (
    select id from public.card_instances where owner_id = v_user and acquired_via <> 'story' order by acquired_at, id limit 5
  ) s;

  for v_mission in select * from public.story_missions where chapter = 6 order by ord loop
    -- The boss stays closed until the mission before it is won.
    if v_mission.ord < 5 then
      begin
        perform public.story_create_match(v_user, 'C6M5', v_team);
        raise exception 'ASSERT: the chapter 6 boss started before its turn';
      exception when raise_exception then
        assert sqlerrm = 'story_mission_locked', sqlerrm;
      end;
    end if;

    v_match := public.story_create_match(v_user, v_mission.code, v_team);
    assert (select threat_ids = v_mission.threat_ids and threat_modifiers = v_mission.threat_modifiers
                   and bot_difficulty = v_mission.bot_difficulty and story_mission_id = v_mission.id
            from public.matches where id = v_match), 'not the mission''s match';
    assert (select definition_ids = v_mission.bot_definition_ids from public.match_teams
            where match_id = v_match and side = 'b'), 'not the mission''s opponent';

    v_balance := public.coin_balance(v_user);
    perform public.finish_match(v_match, 'a', 'completed');
    assert public.coin_balance(v_user) >= v_balance + v_mission.reward_coins, 'mission coins not paid';
    assert exists (select 1 from public.story_progress where user_id = v_user and mission_id = v_mission.id and match_id = v_match),
      'mission not completed';
  end loop;

  -- One boss card per chapter, as plain conquerable copies with their ledger rows.
  assert (select count(*) from public.card_instances i join public.card_definitions d on d.id = i.definition_id
          where i.owner_id = v_user and i.acquired_via = 'story' and d.code = 'P051' and not i.is_starter) = 1, 'chapter 1 boss card';
  assert (select count(*) from public.card_instances i join public.card_definitions d on d.id = i.definition_id
          where i.owner_id = v_user and i.acquired_via = 'story' and d.code = 'P054' and not i.is_starter) = 1, 'chapter 2 boss card';
  assert (select count(*) from public.card_instances i join public.card_definitions d on d.id = i.definition_id
          where i.owner_id = v_user and i.acquired_via = 'story' and d.code = 'P052' and not i.is_starter) = 1, 'chapter 3 boss card';
  assert (select count(*) from public.card_instances i join public.card_definitions d on d.id = i.definition_id
          where i.owner_id = v_user and i.acquired_via = 'story' and d.code = 'P111' and not i.is_starter) = 1, 'chapter 4 boss card';
  assert (select count(*) from public.card_instances i join public.card_definitions d on d.id = i.definition_id
          where i.owner_id = v_user and i.acquired_via = 'story' and d.code = 'P055' and not i.is_starter) = 1, 'chapter 5 boss card';
  assert (select count(*) from public.card_instances i join public.card_definitions d on d.id = i.definition_id
          where i.owner_id = v_user and i.acquired_via = 'story' and d.code = 'P079' and not i.is_starter) = 1, 'chapter 6 boss card';
  assert (select count(*) from public.card_transfers where to_user = v_user and reason = 'story') = 6, 'card transfers';
  assert v_coins = 2310, format('story coins in the catalog: %s', v_coins);
  assert (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'story_reward') = v_coins, 'story coins';

  -- A replay pays nothing more.
  v_match := public.story_create_match(v_user, 'C6M5', v_team);
  perform public.finish_match(v_match, 'a', 'completed');
  assert (select count(*) from public.card_instances where owner_id = v_user and acquired_via = 'story') = 6, 'a replay gave another card';
  assert (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'story_reward') = v_coins, 'a replay paid coins';

  -- For the next block, which runs as the player and cannot read these tables.
  perform set_config('story_test.boss', (
    select p.match_id::text from public.story_progress p join public.story_missions m on m.id = p.mission_id
    where m.code = 'C2M5' and p.user_id = v_user), true);
  perform set_config('story_test.boss3', (
    select p.match_id::text from public.story_progress p join public.story_missions m on m.id = p.mission_id
    where m.code = 'C3M5' and p.user_id = v_user), true);
  perform set_config('story_test.boss4', (
    select p.match_id::text from public.story_progress p join public.story_missions m on m.id = p.mission_id
    where m.code = 'C4M5' and p.user_id = v_user), true);
  perform set_config('story_test.boss5', (
    select p.match_id::text from public.story_progress p join public.story_missions m on m.id = p.mission_id
    where m.code = 'C5M5' and p.user_id = v_user), true);
  perform set_config('story_test.boss6', (
    select p.match_id::text from public.story_progress p join public.story_missions m on m.id = p.mission_id
    where m.code = 'C6M5' and p.user_id = v_user), true);
  perform set_config('story_test.replay', v_match::text, true);
end $$;

-- The result screen: what this match paid.
set local role authenticated;

do $$
declare
  v_first uuid := current_setting('story_test.first')::uuid;
  v_boss uuid := current_setting('story_test.boss')::uuid;
  v_boss3 uuid := current_setting('story_test.boss3')::uuid;
  v_boss4 uuid := current_setting('story_test.boss4')::uuid;
  v_boss5 uuid := current_setting('story_test.boss5')::uuid;
  v_boss6 uuid := current_setting('story_test.boss6')::uuid;
  v_replay uuid := current_setting('story_test.replay')::uuid;
  v_reward jsonb;
  v_story jsonb := public.get_story();
begin
  v_reward := public.get_story_reward(v_first);
  assert (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'coins')::integer = 80, 'reward of the chapter 1 boss';
  assert v_reward -> 'card' ->> 'code' = 'P051' and (v_reward -> 'card' ->> 'instance_id') is not null, 'chapter 1 reward card';
  assert not (v_reward ->> 'is_last')::boolean, 'chapter 2 follows chapter 1';

  v_reward := public.get_story_reward(v_boss);
  assert (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'coins')::integer = 90, 'reward of the chapter 2 boss';
  assert v_reward -> 'card' ->> 'code' = 'P054' and (v_reward -> 'card' ->> 'instance_id') is not null, 'chapter 2 reward card';
  assert not (v_reward ->> 'is_last')::boolean, 'chapter 3 follows chapter 2';

  v_reward := public.get_story_reward(v_boss3);
  assert (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'coins')::integer = 100, 'reward of the chapter 3 boss';
  assert v_reward -> 'card' ->> 'code' = 'P052' and (v_reward -> 'card' ->> 'instance_id') is not null, 'chapter 3 reward card';
  assert not (v_reward ->> 'is_last')::boolean, 'chapter 4 follows chapter 3';

  v_reward := public.get_story_reward(v_boss4);
  assert (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'coins')::integer = 110, 'reward of the chapter 4 boss';
  assert v_reward -> 'card' ->> 'code' = 'P111' and (v_reward -> 'card' ->> 'instance_id') is not null, 'chapter 4 reward card';
  assert not (v_reward ->> 'is_last')::boolean, 'chapter 5 follows chapter 4';

  v_reward := public.get_story_reward(v_boss5);
  assert (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'coins')::integer = 120, 'reward of the chapter 5 boss';
  assert v_reward -> 'card' ->> 'code' = 'P055' and (v_reward -> 'card' ->> 'instance_id') is not null, 'chapter 5 reward card';
  assert not (v_reward ->> 'is_last')::boolean, 'chapter 6 follows chapter 5';
  assert v_reward -> 'season_ending' = 'null'::jsonb, 'season 1 ended at chapter 5';

  v_reward := public.get_story_reward(v_boss6);
  assert (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'coins')::integer = 130, 'reward of the chapter 6 boss';
  assert v_reward -> 'card' ->> 'code' = 'P079' and (v_reward -> 'card' ->> 'instance_id') is not null, 'chapter 6 reward card';
  assert (v_reward ->> 'is_last')::boolean, 'last mission';
  assert v_reward ->> 'season_ending' like 'Hai finito la Stagione 1, Il Rintocco.%', 'ending of season 1 on its last mission';

  v_reward := public.get_story_reward(v_replay);
  assert not (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'completed_before')::boolean, 'replay reward';
  assert (v_reward ->> 'coins')::integer = 0 and v_reward -> 'card' = 'null'::jsonb, 'replay paid';
  assert v_reward -> 'season_ending' = 'null'::jsonb, 'a replay ended the season again';

  assert (select bool_and((m ->> 'completed')::boolean)
          from jsonb_array_elements(v_story) c, jsonb_array_elements(c -> 'missions') m), 'chapters not completed';
  assert v_story -> 0 ->> 'outro' like 'Nel caveau%', 'ending of chapter 1';
  assert v_story -> 1 ->> 'outro' like 'Longwave%', 'ending of chapter 2';
  assert v_story -> 2 ->> 'outro' like 'Le lastre%', 'ending of chapter 3';
  assert v_story -> 3 ->> 'outro' like 'Sconfitto Antiphon%', 'ending of chapter 4';
  assert v_story -> 4 ->> 'outro' like 'Oltre la porta%', 'ending of chapter 5';
  assert v_story -> 5 ->> 'outro' like 'Mongibello%', 'ending of chapter 6';
  -- The ending of season 1 sits on its last chapter only.
  assert v_story -> 5 ->> 'season_ending' like 'Hai finito la Stagione 1, Il Rintocco.%', 'ending of season 1';
  assert not exists (select 1 from jsonb_array_elements(v_story) with ordinality as c(chapter, ord)
                     where c.ord < 6 and c.chapter -> 'season_ending' is distinct from 'null'::jsonb),
    'ending of season 1 before its last chapter';
end $$;

rollback;

select 'story: all assertions passed' as result;
