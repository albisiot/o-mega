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
  assert (select title from public.story_seasons where season = 2) = 'La marea', 'season 2';
  assert (select count(*) from public.story_chapters where season = 2) = 6, 'six chapters in season 2';
  assert (select season = 2 and number = 1 from public.story_chapters where chapter = 7), 'chapter 7 is chapter 1 of season 2';
  assert (select season = 2 and number = 2 from public.story_chapters where chapter = 8), 'chapter 8 is chapter 2 of season 2';
  assert (select season = 2 and number = 3 from public.story_chapters where chapter = 9), 'chapter 9 is chapter 3 of season 2';
  assert (select season = 2 and number = 4 from public.story_chapters where chapter = 10), 'chapter 10 is chapter 4 of season 2';
  assert (select season = 2 and number = 5 from public.story_chapters where chapter = 11), 'chapter 11 is chapter 5 of season 2';
  assert (select season = 2 and number = 6 from public.story_chapters where chapter = 12), 'chapter 12 is chapter 6 of season 2';
  assert (select title from public.story_seasons where season = 3) = 'La montagna', 'season 3';
  assert (select count(*) from public.story_chapters where season = 3) = 5, 'five chapters in season 3';
  assert (select season = 3 and number = 1 from public.story_chapters where chapter = 13), 'chapter 13 is chapter 1 of season 3';
  assert (select season = 3 and number = 2 from public.story_chapters where chapter = 14), 'chapter 14 is chapter 2 of season 3';
  assert (select season = 3 and number = 3 from public.story_chapters where chapter = 15), 'chapter 15 is chapter 3 of season 3';
  assert (select season = 3 and number = 4 from public.story_chapters where chapter = 16), 'chapter 16 is chapter 4 of season 3';
  assert (select season = 3 and number = 5 from public.story_chapters where chapter = 17), 'chapter 17 is chapter 5 of season 3';
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
  v_seventh jsonb := v_story -> 6 -> 'missions';
  v_eighth jsonb := v_story -> 7 -> 'missions';
  v_ninth jsonb := v_story -> 8 -> 'missions';
  v_tenth jsonb := v_story -> 9 -> 'missions';
  v_eleventh jsonb := v_story -> 10 -> 'missions';
  v_twelfth jsonb := v_story -> 11 -> 'missions';
  v_thirteenth jsonb := v_story -> 12 -> 'missions';
  v_fourteenth jsonb := v_story -> 13 -> 'missions';
  v_fifteenth jsonb := v_story -> 14 -> 'missions';
  v_sixteenth jsonb := v_story -> 15 -> 'missions';
  v_seventeenth jsonb := v_story -> 16 -> 'missions';
begin
  assert jsonb_array_length(v_story) = 17, 'seventeen chapters';
  assert (v_story -> 0 ->> 'chapter')::integer = 1 and (v_story -> 1 ->> 'chapter')::integer = 2
     and (v_story -> 2 ->> 'chapter')::integer = 3 and (v_story -> 3 ->> 'chapter')::integer = 4
     and (v_story -> 4 ->> 'chapter')::integer = 5 and (v_story -> 5 ->> 'chapter')::integer = 6
     and (v_story -> 6 ->> 'chapter')::integer = 7 and (v_story -> 7 ->> 'chapter')::integer = 8
     and (v_story -> 8 ->> 'chapter')::integer = 9 and (v_story -> 9 ->> 'chapter')::integer = 10
     and (v_story -> 10 ->> 'chapter')::integer = 11 and (v_story -> 11 ->> 'chapter')::integer = 12
     and (v_story -> 12 ->> 'chapter')::integer = 13 and (v_story -> 13 ->> 'chapter')::integer = 14
     and (v_story -> 14 ->> 'chapter')::integer = 15 and (v_story -> 15 ->> 'chapter')::integer = 16
     and (v_story -> 16 ->> 'chapter')::integer = 17, 'chapter order';
  assert jsonb_array_length(v_first) = 5 and jsonb_array_length(v_second) = 5 and jsonb_array_length(v_third) = 5
     and jsonb_array_length(v_fourth) = 5 and jsonb_array_length(v_fifth) = 5 and jsonb_array_length(v_sixth) = 5
     and jsonb_array_length(v_seventh) = 5 and jsonb_array_length(v_eighth) = 5 and jsonb_array_length(v_ninth) = 5
     and jsonb_array_length(v_tenth) = 5 and jsonb_array_length(v_eleventh) = 5 and jsonb_array_length(v_twelfth) = 5
     and jsonb_array_length(v_thirteenth) = 5 and jsonb_array_length(v_fourteenth) = 5 and jsonb_array_length(v_fifteenth) = 5
     and jsonb_array_length(v_sixteenth) = 5 and jsonb_array_length(v_seventeenth) = 5,
    'five missions each';
  assert (v_first -> 0 ->> 'unlocked')::boolean and not (v_first -> 1 ->> 'unlocked')::boolean, 'only the first is open';
  assert not exists (select 1 from jsonb_array_elements(v_second || v_third || v_fourth || v_fifth || v_sixth || v_seventh || v_eighth || v_ninth || v_tenth || v_eleventh || v_twelfth || v_thirteenth || v_fourteenth || v_fifteenth || v_sixteenth || v_seventeenth) m
                     where (m ->> 'unlocked')::boolean),
    'chapter 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 or 17 open before chapter 1';
  assert not exists (select 1 from jsonb_array_elements(v_first || v_second || v_third || v_fourth || v_fifth || v_sixth || v_seventh || v_eighth || v_ninth || v_tenth || v_eleventh || v_twelfth || v_thirteenth || v_fourteenth || v_fifteenth || v_sixteenth || v_seventeenth) m
                     where jsonb_array_length(m -> 'threat_levels') <> 5), 'threat levels';
  assert v_first -> 4 -> 'reward_card' ->> 'code' = 'P051', 'chapter 1 boss card';
  assert v_second -> 4 -> 'reward_card' ->> 'code' = 'P054', 'chapter 2 boss card';
  assert v_third -> 4 -> 'reward_card' ->> 'code' = 'P052', 'chapter 3 boss card';
  assert v_fourth -> 4 -> 'reward_card' ->> 'code' = 'P111', 'chapter 4 boss card';
  assert v_fifth -> 4 -> 'reward_card' ->> 'code' = 'P055', 'chapter 5 boss card';
  assert v_sixth -> 4 -> 'reward_card' ->> 'code' = 'P079', 'chapter 6 boss card';
  assert v_seventh -> 4 -> 'reward_card' ->> 'code' = 'P130', 'chapter 7 boss card';
  assert v_eighth -> 4 -> 'reward_card' ->> 'code' = 'P089', 'chapter 8 boss card';
  assert v_ninth -> 4 -> 'reward_card' ->> 'code' = 'P181', 'chapter 9 boss card';
  assert v_tenth -> 4 -> 'reward_card' ->> 'code' = 'P175', 'chapter 10 boss card';
  assert v_eleventh -> 4 -> 'reward_card' ->> 'code' = 'P122', 'chapter 11 boss card';
  assert v_twelfth -> 4 -> 'reward_card' ->> 'code' = 'P214', 'chapter 12 boss card';
  assert v_thirteenth -> 4 -> 'reward_card' ->> 'code' = 'P224', 'chapter 13 boss card';
  assert v_fourteenth -> 4 -> 'reward_card' ->> 'code' = 'P210', 'chapter 14 boss card';
  assert v_fifteenth -> 4 -> 'reward_card' ->> 'code' = 'P116', 'chapter 15 boss card';
  assert v_sixteenth -> 4 -> 'reward_card' ->> 'code' = 'P053', 'chapter 16 boss card';
  assert v_seventeenth -> 4 -> 'reward_card' ->> 'code' = 'P183', 'chapter 17 boss card';
  assert not exists (select 1 from jsonb_array_elements(v_first || v_second || v_third || v_fourth || v_fifth || v_sixth || v_seventh || v_eighth || v_ninth || v_tenth || v_eleventh || v_twelfth || v_thirteenth || v_fourteenth || v_fifteenth || v_sixteenth || v_seventeenth) m
                     where m ? 'bot_definition_ids' or m ? 'threat_ids'), 'secrets reached the client';
  assert not exists (select 1 from jsonb_array_elements(v_story) c where c -> 'outro' is distinct from 'null'::jsonb),
    'ending of a chapter not completed';
  assert not exists (select 1 from jsonb_array_elements(v_story) with ordinality as c(chapter, ord)
                     where c.ord <= 6 and ((c.chapter ->> 'season')::integer <> 1 or c.chapter ->> 'season_title' <> 'Il Rintocco'
                        or (c.chapter ->> 'number')::integer <> (c.chapter ->> 'chapter')::integer)),
    'season and number of the chapters of season 1';
  assert (v_story -> 6 ->> 'season')::integer = 2 and v_story -> 6 ->> 'season_title' = 'La marea'
     and (v_story -> 6 ->> 'number')::integer = 1, 'season and number of chapter 7';
  assert (v_story -> 7 ->> 'season')::integer = 2 and v_story -> 7 ->> 'season_title' = 'La marea'
     and (v_story -> 7 ->> 'number')::integer = 2, 'season and number of chapter 8';
  assert (v_story -> 8 ->> 'season')::integer = 2 and v_story -> 8 ->> 'season_title' = 'La marea'
     and (v_story -> 8 ->> 'number')::integer = 3, 'season and number of chapter 9';
  assert (v_story -> 9 ->> 'season')::integer = 2 and v_story -> 9 ->> 'season_title' = 'La marea'
     and (v_story -> 9 ->> 'number')::integer = 4, 'season and number of chapter 10';
  assert (v_story -> 10 ->> 'season')::integer = 2 and v_story -> 10 ->> 'season_title' = 'La marea'
     and (v_story -> 10 ->> 'number')::integer = 5, 'season and number of chapter 11';
  assert (v_story -> 11 ->> 'season')::integer = 2 and v_story -> 11 ->> 'season_title' = 'La marea'
     and (v_story -> 11 ->> 'number')::integer = 6, 'season and number of chapter 12';
  assert (v_story -> 12 ->> 'season')::integer = 3 and v_story -> 12 ->> 'season_title' = 'La montagna'
     and (v_story -> 12 ->> 'number')::integer = 1, 'season and number of chapter 13';
  assert (v_story -> 13 ->> 'season')::integer = 3 and v_story -> 13 ->> 'season_title' = 'La montagna'
     and (v_story -> 13 ->> 'number')::integer = 2, 'season and number of chapter 14';
  assert (v_story -> 14 ->> 'season')::integer = 3 and v_story -> 14 ->> 'season_title' = 'La montagna'
     and (v_story -> 14 ->> 'number')::integer = 3, 'season and number of chapter 15';
  assert (v_story -> 15 ->> 'season')::integer = 3 and v_story -> 15 ->> 'season_title' = 'La montagna'
     and (v_story -> 15 ->> 'number')::integer = 4, 'season and number of chapter 16';
  assert (v_story -> 16 ->> 'season')::integer = 3 and v_story -> 16 ->> 'season_title' = 'La montagna'
     and (v_story -> 16 ->> 'number')::integer = 5, 'season and number of chapter 17';
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
  v_seventh jsonb := v_story -> 6 -> 'missions';
  v_eighth jsonb := v_story -> 7 -> 'missions';
  v_ninth jsonb := v_story -> 8 -> 'missions';
  v_tenth jsonb := v_story -> 9 -> 'missions';
  v_eleventh jsonb := v_story -> 10 -> 'missions';
  v_twelfth jsonb := v_story -> 11 -> 'missions';
  v_thirteenth jsonb := v_story -> 12 -> 'missions';
  v_fourteenth jsonb := v_story -> 13 -> 'missions';
  v_fifteenth jsonb := v_story -> 14 -> 'missions';
  v_sixteenth jsonb := v_story -> 15 -> 'missions';
  v_seventeenth jsonb := v_story -> 16 -> 'missions';
begin
  assert v_story -> 0 ->> 'outro' like 'Nel caveau%', 'ending of the completed chapter';
  assert v_story -> 1 -> 'outro' = 'null'::jsonb and v_story -> 2 -> 'outro' = 'null'::jsonb
     and v_story -> 3 -> 'outro' = 'null'::jsonb and v_story -> 4 -> 'outro' = 'null'::jsonb
     and v_story -> 5 -> 'outro' = 'null'::jsonb and v_story -> 6 -> 'outro' = 'null'::jsonb
     and v_story -> 7 -> 'outro' = 'null'::jsonb and v_story -> 8 -> 'outro' = 'null'::jsonb
     and v_story -> 9 -> 'outro' = 'null'::jsonb and v_story -> 10 -> 'outro' = 'null'::jsonb
     and v_story -> 11 -> 'outro' = 'null'::jsonb and v_story -> 12 -> 'outro' = 'null'::jsonb and v_story -> 13 -> 'outro' = 'null'::jsonb and v_story -> 14 -> 'outro' = 'null'::jsonb and v_story -> 15 -> 'outro' = 'null'::jsonb and v_story -> 16 -> 'outro' = 'null'::jsonb,
    'ending of chapter 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 or 17 before playing it';
  assert (v_second -> 0 ->> 'unlocked')::boolean and not (v_second -> 1 ->> 'unlocked')::boolean, 'chapter 2 opens at its first mission';
  assert not (v_second -> 0 ->> 'completed')::boolean, 'chapter 2 already completed';
  assert not exists (select 1 from jsonb_array_elements(v_third || v_fourth || v_fifth || v_sixth || v_seventh || v_eighth || v_ninth || v_tenth || v_eleventh || v_twelfth || v_thirteenth || v_fourteenth || v_fifteenth || v_sixteenth || v_seventeenth) m
                     where (m ->> 'unlocked')::boolean),
    'chapter 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 or 17 open before chapter 2';
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
    -- So does season 2.
    begin
      perform public.story_create_match(v_user, 'C7M1', v_team);
      raise exception 'ASSERT: season 2 started before chapter 5 was completed';
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
  v_seventh jsonb := v_story -> 6 -> 'missions';
  v_eighth jsonb := v_story -> 7 -> 'missions';
  v_ninth jsonb := v_story -> 8 -> 'missions';
  v_tenth jsonb := v_story -> 9 -> 'missions';
  v_eleventh jsonb := v_story -> 10 -> 'missions';
  v_twelfth jsonb := v_story -> 11 -> 'missions';
  v_thirteenth jsonb := v_story -> 12 -> 'missions';
  v_fourteenth jsonb := v_story -> 13 -> 'missions';
  v_fifteenth jsonb := v_story -> 14 -> 'missions';
  v_sixteenth jsonb := v_story -> 15 -> 'missions';
  v_seventeenth jsonb := v_story -> 16 -> 'missions';
begin
  assert v_story -> 4 ->> 'outro' like 'Oltre la porta%', 'ending of the completed chapter 5';
  assert v_story -> 5 -> 'outro' = 'null'::jsonb, 'ending of chapter 6 before playing it';
  assert not exists (select 1 from jsonb_array_elements(v_story) c where c -> 'season_ending' is distinct from 'null'::jsonb),
    'ending of season 1 before its last chapter';
  assert (v_sixth -> 0 ->> 'unlocked')::boolean and not (v_sixth -> 1 ->> 'unlocked')::boolean, 'chapter 6 opens at its first mission';
  assert not exists (select 1 from jsonb_array_elements(v_sixth) m where (m ->> 'completed')::boolean), 'chapter 6 already completed';
  assert not exists (select 1 from jsonb_array_elements(v_seventh || v_eighth || v_ninth || v_tenth || v_eleventh || v_twelfth || v_thirteenth || v_fourteenth || v_fifteenth || v_sixteenth || v_seventeenth) m where (m ->> 'unlocked')::boolean),
    'season 2 or 3 open before chapter 6';
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
    -- Season 2 stays closed until the last mission of season 1 is won.
    begin
      perform public.story_create_match(v_user, 'C7M1', v_team);
      raise exception 'ASSERT: season 2 started before season 1 was completed';
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

-- Between the seasons: the ending of season 1 points to season 2, which opens at
-- its first mission and keeps its own endings until they are earned.
set local role authenticated;

do $$
declare
  v_story jsonb := public.get_story();
  v_seventh jsonb := v_story -> 6 -> 'missions';
  v_eighth jsonb := v_story -> 7 -> 'missions';
  v_ninth jsonb := v_story -> 8 -> 'missions';
  v_tenth jsonb := v_story -> 9 -> 'missions';
  v_eleventh jsonb := v_story -> 10 -> 'missions';
  v_twelfth jsonb := v_story -> 11 -> 'missions';
  v_thirteenth jsonb := v_story -> 12 -> 'missions';
  v_fourteenth jsonb := v_story -> 13 -> 'missions';
  v_fifteenth jsonb := v_story -> 14 -> 'missions';
  v_sixteenth jsonb := v_story -> 15 -> 'missions';
  v_seventeenth jsonb := v_story -> 16 -> 'missions';
begin
  assert v_story -> 5 ->> 'outro' like 'Mongibello%', 'ending of the completed chapter 6';
  assert v_story -> 5 ->> 'season_ending' = 'Hai finito la Stagione 1, Il Rintocco. Ti aspetta la Stagione 2, La marea.',
    'ending of season 1';
  assert v_story -> 6 -> 'outro' = 'null'::jsonb and v_story -> 7 -> 'outro' = 'null'::jsonb and v_story -> 8 -> 'outro' = 'null'::jsonb
     and v_story -> 9 -> 'outro' = 'null'::jsonb and v_story -> 10 -> 'outro' = 'null'::jsonb and v_story -> 11 -> 'outro' = 'null'::jsonb and v_story -> 12 -> 'outro' = 'null'::jsonb and v_story -> 13 -> 'outro' = 'null'::jsonb and v_story -> 14 -> 'outro' = 'null'::jsonb and v_story -> 15 -> 'outro' = 'null'::jsonb and v_story -> 16 -> 'outro' = 'null'::jsonb,
    'ending of chapter 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 or 17 before playing it';
  assert v_story -> 6 -> 'season_ending' = 'null'::jsonb and v_story -> 7 -> 'season_ending' = 'null'::jsonb
     and v_story -> 8 -> 'season_ending' = 'null'::jsonb and v_story -> 9 -> 'season_ending' = 'null'::jsonb
     and v_story -> 10 -> 'season_ending' = 'null'::jsonb and v_story -> 11 -> 'season_ending' = 'null'::jsonb,
    'ending of season 2 before playing it';
  assert (v_seventh -> 0 ->> 'unlocked')::boolean and not (v_seventh -> 1 ->> 'unlocked')::boolean,
    'chapter 1 of season 2 opens at its first mission';
  assert not exists (select 1 from jsonb_array_elements(v_seventh) m where (m ->> 'completed')::boolean), 'chapter 7 already completed';
  assert not exists (select 1 from jsonb_array_elements(v_eighth || v_ninth || v_tenth || v_eleventh || v_twelfth || v_thirteenth || v_fourteenth || v_fifteenth || v_sixteenth || v_seventeenth) m where (m ->> 'unlocked')::boolean),
    'chapter 2, 3, 4, 5 or 6 of season 2 or season 3 open before chapter 1';
end $$;

reset role;

-- Playing chapter 1 of season 2 (chapter 7 of the whole story).
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000e1';
  v_team uuid[];
  v_match uuid;
  v_mission public.story_missions;
  v_balance integer;
  v_coins integer := (select sum(reward_coins) from public.story_missions where chapter in (1, 2, 3, 4, 5, 6, 7));
begin
  select array_agg(id) into v_team from (
    select id from public.card_instances where owner_id = v_user and acquired_via <> 'story' order by acquired_at, id limit 5
  ) s;

  for v_mission in select * from public.story_missions where chapter = 7 order by ord loop
    -- The boss stays closed until the mission before it is won.
    if v_mission.ord < 5 then
      begin
        perform public.story_create_match(v_user, 'C7M5', v_team);
        raise exception 'ASSERT: the chapter 7 boss started before its turn';
      exception when raise_exception then
        assert sqlerrm = 'story_mission_locked', sqlerrm;
      end;
    end if;
    -- Chapter 2 of season 2 stays closed until the last mission of chapter 1 is won.
    begin
      perform public.story_create_match(v_user, 'C8M1', v_team);
      raise exception 'ASSERT: chapter 8 started before chapter 7 was completed';
    exception when raise_exception then
      assert sqlerrm = 'story_mission_locked', sqlerrm;
    end;
    -- So do chapters 3, 4, 5 and 6 of season 2.
    begin
      perform public.story_create_match(v_user, 'C9M1', v_team);
      raise exception 'ASSERT: chapter 9 started before chapter 7 was completed';
    exception when raise_exception then
      assert sqlerrm = 'story_mission_locked', sqlerrm;
    end;
    begin
      perform public.story_create_match(v_user, 'C10M1', v_team);
      raise exception 'ASSERT: chapter 10 started before chapter 7 was completed';
    exception when raise_exception then
      assert sqlerrm = 'story_mission_locked', sqlerrm;
    end;
    begin
      perform public.story_create_match(v_user, 'C11M1', v_team);
      raise exception 'ASSERT: chapter 11 started before chapter 7 was completed';
    exception when raise_exception then
      assert sqlerrm = 'story_mission_locked', sqlerrm;
    end;
    begin
      perform public.story_create_match(v_user, 'C12M1', v_team);
      raise exception 'ASSERT: chapter 12 started before chapter 7 was completed';
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

  assert (select count(*) from public.card_instances i join public.card_definitions d on d.id = i.definition_id
          where i.owner_id = v_user and i.acquired_via = 'story' and d.code = 'P130' and not i.is_starter) = 1, 'chapter 7 boss card';
  assert (select count(*) from public.card_transfers where to_user = v_user and reason = 'story') = 7, 'card transfers';
  assert v_coins = 2870, format('story coins in the catalog: %s', v_coins);
  assert (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'story_reward') = v_coins, 'story coins';

  perform set_config('story_test.boss7', (
    select p.match_id::text from public.story_progress p join public.story_missions m on m.id = p.mission_id
    where m.code = 'C7M5' and p.user_id = v_user), true);
end $$;

-- Between the chapters of season 2: the ending of chapter 7 shows, the ending of
-- the season waits for the last chapter, and chapter 8 opens at its first mission.
set local role authenticated;

do $$
declare
  v_story jsonb := public.get_story();
  v_eighth jsonb := v_story -> 7 -> 'missions';
  v_ninth jsonb := v_story -> 8 -> 'missions';
  v_tenth jsonb := v_story -> 9 -> 'missions';
  v_eleventh jsonb := v_story -> 10 -> 'missions';
  v_twelfth jsonb := v_story -> 11 -> 'missions';
  v_thirteenth jsonb := v_story -> 12 -> 'missions';
  v_fourteenth jsonb := v_story -> 13 -> 'missions';
  v_fifteenth jsonb := v_story -> 14 -> 'missions';
  v_sixteenth jsonb := v_story -> 15 -> 'missions';
  v_seventeenth jsonb := v_story -> 16 -> 'missions';
begin
  assert v_story -> 6 ->> 'outro' like 'Vinci l''asta%', 'ending of the completed chapter 7';
  assert v_story -> 6 -> 'season_ending' = 'null'::jsonb, 'ending of season 2 on a chapter that is not the last';
  assert v_story -> 7 -> 'outro' = 'null'::jsonb and v_story -> 8 -> 'outro' = 'null'::jsonb and v_story -> 9 -> 'outro' = 'null'::jsonb
     and v_story -> 10 -> 'outro' = 'null'::jsonb and v_story -> 11 -> 'outro' = 'null'::jsonb and v_story -> 12 -> 'outro' = 'null'::jsonb and v_story -> 13 -> 'outro' = 'null'::jsonb and v_story -> 14 -> 'outro' = 'null'::jsonb and v_story -> 15 -> 'outro' = 'null'::jsonb and v_story -> 16 -> 'outro' = 'null'::jsonb,
    'ending of chapter 8, 9, 10, 11, 12, 13, 14, 15, 16 or 17 before playing it';
  assert v_story -> 7 -> 'season_ending' = 'null'::jsonb and v_story -> 8 -> 'season_ending' = 'null'::jsonb
     and v_story -> 9 -> 'season_ending' = 'null'::jsonb and v_story -> 10 -> 'season_ending' = 'null'::jsonb
     and v_story -> 11 -> 'season_ending' = 'null'::jsonb,
    'ending of season 2 before its last chapter is completed';
  assert (v_eighth -> 0 ->> 'unlocked')::boolean and not (v_eighth -> 1 ->> 'unlocked')::boolean,
    'chapter 2 of season 2 opens at its first mission';
  assert not exists (select 1 from jsonb_array_elements(v_eighth) m where (m ->> 'completed')::boolean), 'chapter 8 already completed';
  assert not exists (select 1 from jsonb_array_elements(v_ninth || v_tenth || v_eleventh || v_twelfth || v_thirteenth || v_fourteenth || v_fifteenth || v_sixteenth || v_seventeenth) m where (m ->> 'unlocked')::boolean),
    'chapter 3, 4, 5 or 6 of season 2 or season 3 open before chapter 2';
end $$;

reset role;

-- Playing chapter 2 of season 2 (chapter 8 of the whole story).
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000e1';
  v_team uuid[];
  v_match uuid;
  v_mission public.story_missions;
  v_balance integer;
  v_coins integer := (select sum(reward_coins) from public.story_missions where chapter in (1, 2, 3, 4, 5, 6, 7, 8));
begin
  select array_agg(id) into v_team from (
    select id from public.card_instances where owner_id = v_user and acquired_via <> 'story' order by acquired_at, id limit 5
  ) s;

  for v_mission in select * from public.story_missions where chapter = 8 order by ord loop
    -- The boss stays closed until the mission before it is won.
    if v_mission.ord < 5 then
      begin
        perform public.story_create_match(v_user, 'C8M5', v_team);
        raise exception 'ASSERT: the chapter 8 boss started before its turn';
      exception when raise_exception then
        assert sqlerrm = 'story_mission_locked', sqlerrm;
      end;
    end if;
    -- Chapter 3 of season 2 stays closed until the last mission of chapter 2 is won.
    begin
      perform public.story_create_match(v_user, 'C9M1', v_team);
      raise exception 'ASSERT: chapter 9 started before chapter 8 was completed';
    exception when raise_exception then
      assert sqlerrm = 'story_mission_locked', sqlerrm;
    end;
    -- So do chapters 4, 5 and 6 of season 2.
    begin
      perform public.story_create_match(v_user, 'C10M1', v_team);
      raise exception 'ASSERT: chapter 10 started before chapter 8 was completed';
    exception when raise_exception then
      assert sqlerrm = 'story_mission_locked', sqlerrm;
    end;
    begin
      perform public.story_create_match(v_user, 'C11M1', v_team);
      raise exception 'ASSERT: chapter 11 started before chapter 8 was completed';
    exception when raise_exception then
      assert sqlerrm = 'story_mission_locked', sqlerrm;
    end;
    begin
      perform public.story_create_match(v_user, 'C12M1', v_team);
      raise exception 'ASSERT: chapter 12 started before chapter 8 was completed';
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

  assert (select count(*) from public.card_instances i join public.card_definitions d on d.id = i.definition_id
          where i.owner_id = v_user and i.acquired_via = 'story' and d.code = 'P089' and not i.is_starter) = 1, 'chapter 8 boss card';
  assert (select count(*) from public.card_transfers where to_user = v_user and reason = 'story') = 8, 'card transfers';
  assert v_coins = 3480, format('story coins in the catalog: %s', v_coins);
  assert (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'story_reward') = v_coins, 'story coins';

  perform set_config('story_test.boss8', (
    select p.match_id::text from public.story_progress p join public.story_missions m on m.id = p.mission_id
    where m.code = 'C8M5' and p.user_id = v_user), true);
end $$;

-- Between chapters 8 and 9: the ending of chapter 8 shows, the ending of the
-- season moves on to the last chapter, and chapter 9 opens at its first mission.
set local role authenticated;

do $$
declare
  v_story jsonb := public.get_story();
  v_ninth jsonb := v_story -> 8 -> 'missions';
  v_tenth jsonb := v_story -> 9 -> 'missions';
  v_eleventh jsonb := v_story -> 10 -> 'missions';
  v_twelfth jsonb := v_story -> 11 -> 'missions';
  v_thirteenth jsonb := v_story -> 12 -> 'missions';
  v_fourteenth jsonb := v_story -> 13 -> 'missions';
  v_fifteenth jsonb := v_story -> 14 -> 'missions';
  v_sixteenth jsonb := v_story -> 15 -> 'missions';
  v_seventeenth jsonb := v_story -> 16 -> 'missions';
begin
  assert v_story -> 7 ->> 'outro' like 'Nella camera%', 'ending of the completed chapter 8';
  assert v_story -> 7 -> 'season_ending' = 'null'::jsonb, 'ending of season 2 on chapter 8, which is not the last';
  assert v_story -> 8 -> 'outro' = 'null'::jsonb and v_story -> 9 -> 'outro' = 'null'::jsonb and v_story -> 10 -> 'outro' = 'null'::jsonb
     and v_story -> 11 -> 'outro' = 'null'::jsonb and v_story -> 12 -> 'outro' = 'null'::jsonb and v_story -> 13 -> 'outro' = 'null'::jsonb and v_story -> 14 -> 'outro' = 'null'::jsonb and v_story -> 15 -> 'outro' = 'null'::jsonb and v_story -> 16 -> 'outro' = 'null'::jsonb,
    'ending of chapter 9, 10, 11, 12, 13, 14, 15, 16 or 17 before playing it';
  assert v_story -> 8 -> 'season_ending' = 'null'::jsonb and v_story -> 9 -> 'season_ending' = 'null'::jsonb
     and v_story -> 10 -> 'season_ending' = 'null'::jsonb and v_story -> 11 -> 'season_ending' = 'null'::jsonb,
    'ending of season 2 before its last chapter is completed';
  assert (v_ninth -> 0 ->> 'unlocked')::boolean and not (v_ninth -> 1 ->> 'unlocked')::boolean,
    'chapter 3 of season 2 opens at its first mission';
  assert not exists (select 1 from jsonb_array_elements(v_ninth) m where (m ->> 'completed')::boolean), 'chapter 9 already completed';
  assert not exists (select 1 from jsonb_array_elements(v_tenth || v_eleventh || v_twelfth || v_thirteenth || v_fourteenth || v_fifteenth || v_sixteenth || v_seventeenth) m where (m ->> 'unlocked')::boolean),
    'chapter 4, 5 or 6 of season 2 or season 3 open before chapter 3';
end $$;

reset role;

-- Playing chapter 3 of season 2 (chapter 9 of the whole story).
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000e1';
  v_team uuid[];
  v_match uuid;
  v_mission public.story_missions;
  v_balance integer;
  v_coins integer := (select sum(reward_coins) from public.story_missions where chapter in (1, 2, 3, 4, 5, 6, 7, 8, 9));
begin
  select array_agg(id) into v_team from (
    select id from public.card_instances where owner_id = v_user and acquired_via <> 'story' order by acquired_at, id limit 5
  ) s;

  for v_mission in select * from public.story_missions where chapter = 9 order by ord loop
    -- The boss stays closed until the mission before it is won.
    if v_mission.ord < 5 then
      begin
        perform public.story_create_match(v_user, 'C9M5', v_team);
        raise exception 'ASSERT: the chapter 9 boss started before its turn';
      exception when raise_exception then
        assert sqlerrm = 'story_mission_locked', sqlerrm;
      end;
    end if;
    -- Chapter 4 of season 2 stays closed until the last mission of chapter 3 is won.
    begin
      perform public.story_create_match(v_user, 'C10M1', v_team);
      raise exception 'ASSERT: chapter 10 started before chapter 9 was completed';
    exception when raise_exception then
      assert sqlerrm = 'story_mission_locked', sqlerrm;
    end;
    -- So do chapters 5 and 6 of season 2.
    begin
      perform public.story_create_match(v_user, 'C11M1', v_team);
      raise exception 'ASSERT: chapter 11 started before chapter 9 was completed';
    exception when raise_exception then
      assert sqlerrm = 'story_mission_locked', sqlerrm;
    end;
    begin
      perform public.story_create_match(v_user, 'C12M1', v_team);
      raise exception 'ASSERT: chapter 12 started before chapter 9 was completed';
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

  assert (select count(*) from public.card_instances i join public.card_definitions d on d.id = i.definition_id
          where i.owner_id = v_user and i.acquired_via = 'story' and d.code = 'P181' and not i.is_starter) = 1, 'chapter 9 boss card';
  assert (select count(*) from public.card_transfers where to_user = v_user and reason = 'story') = 9, 'card transfers';
  assert v_coins = 4140, format('story coins in the catalog: %s', v_coins);
  assert (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'story_reward') = v_coins, 'story coins';

  perform set_config('story_test.boss9', (
    select p.match_id::text from public.story_progress p join public.story_missions m on m.id = p.mission_id
    where m.code = 'C9M5' and p.user_id = v_user), true);
end $$;

-- Between chapters 9 and 10: the ending of chapter 9 shows, the ending of the
-- season moves on to the last chapter, and chapter 10 opens at its first mission.
set local role authenticated;

do $$
declare
  v_story jsonb := public.get_story();
  v_tenth jsonb := v_story -> 9 -> 'missions';
  v_eleventh jsonb := v_story -> 10 -> 'missions';
  v_twelfth jsonb := v_story -> 11 -> 'missions';
  v_thirteenth jsonb := v_story -> 12 -> 'missions';
  v_fourteenth jsonb := v_story -> 13 -> 'missions';
  v_fifteenth jsonb := v_story -> 14 -> 'missions';
  v_sixteenth jsonb := v_story -> 15 -> 'missions';
  v_seventeenth jsonb := v_story -> 16 -> 'missions';
begin
  assert v_story -> 8 ->> 'outro' like 'Al Monte dei Pegni%', 'ending of the completed chapter 9';
  assert v_story -> 8 -> 'season_ending' = 'null'::jsonb, 'ending of season 2 on chapter 9, which is not the last';
  assert v_story -> 9 -> 'outro' = 'null'::jsonb and v_story -> 10 -> 'outro' = 'null'::jsonb and v_story -> 11 -> 'outro' = 'null'::jsonb and v_story -> 12 -> 'outro' = 'null'::jsonb and v_story -> 13 -> 'outro' = 'null'::jsonb and v_story -> 14 -> 'outro' = 'null'::jsonb and v_story -> 15 -> 'outro' = 'null'::jsonb and v_story -> 16 -> 'outro' = 'null'::jsonb,
    'ending of chapter 10, 11, 12, 13, 14, 15, 16 or 17 before playing it';
  assert v_story -> 9 -> 'season_ending' = 'null'::jsonb and v_story -> 10 -> 'season_ending' = 'null'::jsonb
     and v_story -> 11 -> 'season_ending' = 'null'::jsonb,
    'ending of season 2 before its last chapter is completed';
  assert (v_tenth -> 0 ->> 'unlocked')::boolean and not (v_tenth -> 1 ->> 'unlocked')::boolean,
    'chapter 4 of season 2 opens at its first mission';
  assert not exists (select 1 from jsonb_array_elements(v_tenth) m where (m ->> 'completed')::boolean), 'chapter 10 already completed';
  assert not exists (select 1 from jsonb_array_elements(v_eleventh || v_twelfth || v_thirteenth || v_fourteenth || v_fifteenth || v_sixteenth || v_seventeenth) m where (m ->> 'unlocked')::boolean),
    'chapter 5 or 6 of season 2 or season 3 open before chapter 4';
end $$;

reset role;

-- Playing chapter 4 of season 2 (chapter 10 of the whole story).
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000e1';
  v_team uuid[];
  v_match uuid;
  v_mission public.story_missions;
  v_balance integer;
  v_coins integer := (select sum(reward_coins) from public.story_missions where chapter in (1, 2, 3, 4, 5, 6, 7, 8, 9, 10));
begin
  select array_agg(id) into v_team from (
    select id from public.card_instances where owner_id = v_user and acquired_via <> 'story' order by acquired_at, id limit 5
  ) s;

  for v_mission in select * from public.story_missions where chapter = 10 order by ord loop
    -- The boss stays closed until the mission before it is won.
    if v_mission.ord < 5 then
      begin
        perform public.story_create_match(v_user, 'C10M5', v_team);
        raise exception 'ASSERT: the chapter 10 boss started before its turn';
      exception when raise_exception then
        assert sqlerrm = 'story_mission_locked', sqlerrm;
      end;
    end if;
    -- Chapter 5 of season 2 stays closed until the last mission of chapter 4 is won.
    begin
      perform public.story_create_match(v_user, 'C11M1', v_team);
      raise exception 'ASSERT: chapter 11 started before chapter 10 was completed';
    exception when raise_exception then
      assert sqlerrm = 'story_mission_locked', sqlerrm;
    end;
    -- So does chapter 6 of season 2.
    begin
      perform public.story_create_match(v_user, 'C12M1', v_team);
      raise exception 'ASSERT: chapter 12 started before chapter 10 was completed';
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

  assert (select count(*) from public.card_instances i join public.card_definitions d on d.id = i.definition_id
          where i.owner_id = v_user and i.acquired_via = 'story' and d.code = 'P175' and not i.is_starter) = 1, 'chapter 10 boss card';
  assert (select count(*) from public.card_transfers where to_user = v_user and reason = 'story') = 10, 'card transfers';
  assert v_coins = 4850, format('story coins in the catalog: %s', v_coins);
  assert (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'story_reward') = v_coins, 'story coins';

  perform set_config('story_test.boss10', (
    select p.match_id::text from public.story_progress p join public.story_missions m on m.id = p.mission_id
    where m.code = 'C10M5' and p.user_id = v_user), true);
end $$;

-- Between chapters 10 and 11: the ending of chapter 10 shows, the ending of the
-- season moves on to the last chapter, and chapter 11 opens at its first mission.
set local role authenticated;

do $$
declare
  v_story jsonb := public.get_story();
  v_eleventh jsonb := v_story -> 10 -> 'missions';
  v_twelfth jsonb := v_story -> 11 -> 'missions';
  v_thirteenth jsonb := v_story -> 12 -> 'missions';
  v_fourteenth jsonb := v_story -> 13 -> 'missions';
  v_fifteenth jsonb := v_story -> 14 -> 'missions';
  v_sixteenth jsonb := v_story -> 15 -> 'missions';
  v_seventeenth jsonb := v_story -> 16 -> 'missions';
begin
  assert v_story -> 9 ->> 'outro' like 'Absentia era%', 'ending of the completed chapter 10';
  assert v_story -> 9 -> 'season_ending' = 'null'::jsonb, 'ending of season 2 on chapter 10, which is not the last';
  assert v_story -> 10 -> 'outro' = 'null'::jsonb and v_story -> 11 -> 'outro' = 'null'::jsonb and v_story -> 12 -> 'outro' = 'null'::jsonb and v_story -> 13 -> 'outro' = 'null'::jsonb and v_story -> 14 -> 'outro' = 'null'::jsonb and v_story -> 15 -> 'outro' = 'null'::jsonb and v_story -> 16 -> 'outro' = 'null'::jsonb,
    'ending of chapter 11, 12, 13, 14, 15, 16 or 17 before playing it';
  assert v_story -> 10 -> 'season_ending' = 'null'::jsonb and v_story -> 11 -> 'season_ending' = 'null'::jsonb,
    'ending of season 2 before its last chapter is completed';
  assert (v_eleventh -> 0 ->> 'unlocked')::boolean and not (v_eleventh -> 1 ->> 'unlocked')::boolean,
    'chapter 5 of season 2 opens at its first mission';
  assert not exists (select 1 from jsonb_array_elements(v_eleventh) m where (m ->> 'completed')::boolean), 'chapter 11 already completed';
  assert not exists (select 1 from jsonb_array_elements(v_twelfth || v_thirteenth || v_fourteenth || v_fifteenth || v_sixteenth || v_seventeenth) m where (m ->> 'unlocked')::boolean),
    'chapter 6 of season 2 or season 3 open before chapter 5';
end $$;

reset role;

-- Playing chapter 5 of season 2 (chapter 11 of the whole story).
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000e1';
  v_team uuid[];
  v_match uuid;
  v_mission public.story_missions;
  v_balance integer;
  v_coins integer := (select sum(reward_coins) from public.story_missions where chapter in (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11));
begin
  select array_agg(id) into v_team from (
    select id from public.card_instances where owner_id = v_user and acquired_via <> 'story' order by acquired_at, id limit 5
  ) s;

  for v_mission in select * from public.story_missions where chapter = 11 order by ord loop
    -- The boss stays closed until the mission before it is won.
    if v_mission.ord < 5 then
      begin
        perform public.story_create_match(v_user, 'C11M5', v_team);
        raise exception 'ASSERT: the chapter 11 boss started before its turn';
      exception when raise_exception then
        assert sqlerrm = 'story_mission_locked', sqlerrm;
      end;
    end if;
    -- Chapter 6 of season 2 stays closed until the last mission of chapter 5 is won.
    begin
      perform public.story_create_match(v_user, 'C12M1', v_team);
      raise exception 'ASSERT: chapter 12 started before chapter 11 was completed';
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

  assert (select count(*) from public.card_instances i join public.card_definitions d on d.id = i.definition_id
          where i.owner_id = v_user and i.acquired_via = 'story' and d.code = 'P122' and not i.is_starter) = 1, 'chapter 11 boss card';
  assert (select count(*) from public.card_transfers where to_user = v_user and reason = 'story') = 11, 'card transfers';
  assert v_coins = 5610, format('story coins in the catalog: %s', v_coins);
  assert (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'story_reward') = v_coins, 'story coins';

  perform set_config('story_test.boss11', (
    select p.match_id::text from public.story_progress p join public.story_missions m on m.id = p.mission_id
    where m.code = 'C11M5' and p.user_id = v_user), true);
end $$;

-- Between chapters 11 and 12: the ending of chapter 11 shows, the ending of the
-- season waits for the last chapter, and chapter 12 opens at its first mission.
set local role authenticated;

do $$
declare
  v_story jsonb := public.get_story();
  v_twelfth jsonb := v_story -> 11 -> 'missions';
  v_thirteenth jsonb := v_story -> 12 -> 'missions';
  v_fourteenth jsonb := v_story -> 13 -> 'missions';
  v_fifteenth jsonb := v_story -> 14 -> 'missions';
  v_sixteenth jsonb := v_story -> 15 -> 'missions';
  v_seventeenth jsonb := v_story -> 16 -> 'missions';
begin
  assert v_story -> 10 ->> 'outro' like 'Vinta la sfida%', 'ending of the completed chapter 11';
  assert v_story -> 10 -> 'season_ending' = 'null'::jsonb, 'ending of season 2 on chapter 11, which is not the last';
  assert v_story -> 11 -> 'outro' = 'null'::jsonb and v_story -> 12 -> 'outro' = 'null'::jsonb and v_story -> 13 -> 'outro' = 'null'::jsonb and v_story -> 14 -> 'outro' = 'null'::jsonb and v_story -> 15 -> 'outro' = 'null'::jsonb and v_story -> 16 -> 'outro' = 'null'::jsonb, 'ending of chapter 12, 13, 14, 15, 16 or 17 before playing it';
  assert v_story -> 11 -> 'season_ending' = 'null'::jsonb, 'ending of season 2 before its last chapter is completed';
  assert (v_twelfth -> 0 ->> 'unlocked')::boolean and not (v_twelfth -> 1 ->> 'unlocked')::boolean,
    'chapter 6 of season 2 opens at its first mission';
  assert not exists (select 1 from jsonb_array_elements(v_twelfth) m where (m ->> 'completed')::boolean), 'chapter 12 already completed';
  assert not exists (select 1 from jsonb_array_elements(v_thirteenth || v_fourteenth || v_fifteenth || v_sixteenth || v_seventeenth) m where (m ->> 'unlocked')::boolean),
    'season 3 open before chapter 12';
end $$;

reset role;

-- Playing chapter 6 of season 2 (chapter 12 of the whole story), the end of the season.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000e1';
  v_team uuid[];
  v_match uuid;
  v_mission public.story_missions;
  v_balance integer;
  v_coins integer := (select sum(reward_coins) from public.story_missions where chapter in (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12));
begin
  select array_agg(id) into v_team from (
    select id from public.card_instances where owner_id = v_user and acquired_via <> 'story' order by acquired_at, id limit 5
  ) s;

  for v_mission in select * from public.story_missions where chapter = 12 order by ord loop
    -- The boss stays closed until the mission before it is won.
    if v_mission.ord < 5 then
      begin
        perform public.story_create_match(v_user, 'C12M5', v_team);
        raise exception 'ASSERT: the chapter 12 boss started before its turn';
      exception when raise_exception then
        assert sqlerrm = 'story_mission_locked', sqlerrm;
      end;
    end if;
    -- Season 3 stays closed until the last mission of season 2 is won.
    begin
      perform public.story_create_match(v_user, 'C13M1', v_team);
      raise exception 'ASSERT: season 3 started before season 2 was completed';
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

  assert (select count(*) from public.card_instances i join public.card_definitions d on d.id = i.definition_id
          where i.owner_id = v_user and i.acquired_via = 'story' and d.code = 'P214' and not i.is_starter) = 1, 'chapter 12 boss card';
  assert (select count(*) from public.card_transfers where to_user = v_user and reason = 'story') = 12, 'card transfers';
  assert v_coins = 6420, format('story coins in the catalog: %s', v_coins);
  assert (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'story_reward') = v_coins, 'story coins';

  perform set_config('story_test.boss12', (
    select p.match_id::text from public.story_progress p join public.story_missions m on m.id = p.mission_id
    where m.code = 'C12M5' and p.user_id = v_user), true);
end $$;

-- Between seasons 2 and 3: the ending of season 2 points to season 3, which opens
-- at its first mission and keeps its own endings until they are earned.
set local role authenticated;

do $$
declare
  v_story jsonb := public.get_story();
  v_thirteenth jsonb := v_story -> 12 -> 'missions';
  v_fourteenth jsonb := v_story -> 13 -> 'missions';
  v_fifteenth jsonb := v_story -> 14 -> 'missions';
  v_sixteenth jsonb := v_story -> 15 -> 'missions';
  v_seventeenth jsonb := v_story -> 16 -> 'missions';
begin
  assert v_story -> 11 ->> 'outro' like 'Sull''orlo dell''occhio%', 'ending of the completed chapter 12';
  assert v_story -> 11 ->> 'season_ending' = 'Hai finito la Stagione 2, La marea. Ti aspetta la Stagione 3, La montagna.',
    'ending of season 2';
  assert v_story -> 12 -> 'outro' = 'null'::jsonb and v_story -> 13 -> 'outro' = 'null'::jsonb and v_story -> 14 -> 'outro' = 'null'::jsonb and v_story -> 15 -> 'outro' = 'null'::jsonb and v_story -> 16 -> 'outro' = 'null'::jsonb, 'ending of chapter 13, 14, 15, 16 or 17 before playing it';
  assert v_story -> 12 -> 'season_ending' = 'null'::jsonb and v_story -> 13 -> 'season_ending' = 'null'::jsonb
     and v_story -> 14 -> 'season_ending' = 'null'::jsonb and v_story -> 15 -> 'season_ending' = 'null'::jsonb
     and v_story -> 16 -> 'season_ending' = 'null'::jsonb,
    'ending of season 3 before playing it';
  assert (v_thirteenth -> 0 ->> 'unlocked')::boolean and not (v_thirteenth -> 1 ->> 'unlocked')::boolean,
    'chapter 1 of season 3 opens at its first mission';
  assert not exists (select 1 from jsonb_array_elements(v_thirteenth) m where (m ->> 'completed')::boolean), 'chapter 13 already completed';
  assert not exists (select 1 from jsonb_array_elements(v_fourteenth || v_fifteenth || v_sixteenth || v_seventeenth) m where (m ->> 'unlocked')::boolean),
    'chapter 2, 3, 4 or 5 of season 3 open before chapter 1';
end $$;

reset role;

-- Playing chapter 1 of season 3 (chapter 13 of the whole story).
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000e1';
  v_team uuid[];
  v_match uuid;
  v_mission public.story_missions;
  v_balance integer;
  v_coins integer := (select sum(reward_coins) from public.story_missions where chapter between 1 and 13);
begin
  select array_agg(id) into v_team from (
    select id from public.card_instances where owner_id = v_user and acquired_via <> 'story' order by acquired_at, id limit 5
  ) s;

  for v_mission in select * from public.story_missions where chapter = 13 order by ord loop
    -- The boss stays closed until the mission before it is won.
    if v_mission.ord < 5 then
      begin
        perform public.story_create_match(v_user, 'C13M5', v_team);
        raise exception 'ASSERT: the chapter 13 boss started before its turn';
      exception when raise_exception then
        assert sqlerrm = 'story_mission_locked', sqlerrm;
      end;
    end if;
    -- Chapter 14 stays closed until the chapter 13 boss is won.
    begin
      perform public.story_create_match(v_user, 'C14M1', v_team);
      raise exception 'ASSERT: chapter 14 started before chapter 13 was completed';
    exception when raise_exception then
      assert sqlerrm = 'story_mission_locked', sqlerrm;
    end;
    -- The stars of season 3 pay 30 coins in its first four chapters (docs/STORY.md §7.9),
    -- not the 40 of the starting formula.
    assert v_mission.star_coins = 30, format('star coins of %s: %s', v_mission.code, v_mission.star_coins);

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

  assert (select count(*) from public.card_instances i join public.card_definitions d on d.id = i.definition_id
          where i.owner_id = v_user and i.acquired_via = 'story' and d.code = 'P224' and not i.is_starter) = 1, 'chapter 13 boss card';
  assert (select count(*) from public.card_transfers where to_user = v_user and reason = 'story') = 13, 'card transfers';
  assert v_coins = 7280, format('story coins in the catalog: %s', v_coins);
  assert (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'story_reward') = v_coins, 'story coins';

  perform set_config('story_test.boss13', (
    select p.match_id::text from public.story_progress p join public.story_missions m on m.id = p.mission_id
    where m.code = 'C13M5' and p.user_id = v_user), true);
end $$;

-- Between chapters 13 and 14: the ending of chapter 13 shows, the ending of
-- season 3 waits for its last chapter, and chapter 14 opens at its first mission.
set local role authenticated;

do $$
declare
  v_story jsonb := public.get_story();
  v_fourteenth jsonb := v_story -> 13 -> 'missions';
  v_fifteenth jsonb := v_story -> 14 -> 'missions';
  v_sixteenth jsonb := v_story -> 15 -> 'missions';
  v_seventeenth jsonb := v_story -> 16 -> 'missions';
begin
  assert v_story -> 12 ->> 'outro' like 'Nella necropoli%', 'ending of the completed chapter 13';
  assert v_story -> 12 -> 'season_ending' = 'null'::jsonb, 'ending of season 3 on chapter 13, which is not the last';
  assert v_story -> 13 -> 'outro' = 'null'::jsonb, 'ending of chapter 14 before playing it';
  assert v_story -> 13 -> 'season_ending' = 'null'::jsonb, 'ending of season 3 before its last chapter is completed';
  assert (v_fourteenth -> 0 ->> 'unlocked')::boolean and not (v_fourteenth -> 1 ->> 'unlocked')::boolean,
    'chapter 2 of season 3 opens at its first mission';
  assert not exists (select 1 from jsonb_array_elements(v_fourteenth) m where (m ->> 'completed')::boolean), 'chapter 14 already completed';
  assert v_story -> 14 -> 'outro' = 'null'::jsonb, 'ending of chapter 15 before playing it';
  assert not exists (select 1 from jsonb_array_elements(v_fifteenth) m where (m ->> 'unlocked')::boolean),
    'chapter 3 of season 3 open before chapter 2';
end $$;

reset role;

-- Playing chapter 2 of season 3 (chapter 14 of the whole story).
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000e1';
  v_team uuid[];
  v_match uuid;
  v_mission public.story_missions;
  v_balance integer;
  v_coins integer := (select sum(reward_coins) from public.story_missions where chapter between 1 and 14);
begin
  select array_agg(id) into v_team from (
    select id from public.card_instances where owner_id = v_user and acquired_via <> 'story' order by acquired_at, id limit 5
  ) s;

  for v_mission in select * from public.story_missions where chapter = 14 order by ord loop
    -- The boss stays closed until the mission before it is won.
    if v_mission.ord < 5 then
      begin
        perform public.story_create_match(v_user, 'C14M5', v_team);
        raise exception 'ASSERT: the chapter 14 boss started before its turn';
      exception when raise_exception then
        assert sqlerrm = 'story_mission_locked', sqlerrm;
      end;
    end if;
    -- Chapter 15 stays closed until the chapter 14 boss is won.
    begin
      perform public.story_create_match(v_user, 'C15M1', v_team);
      raise exception 'ASSERT: chapter 15 started before chapter 14 was completed';
    exception when raise_exception then
      assert sqlerrm = 'story_mission_locked', sqlerrm;
    end;
    assert v_mission.star_coins = 30, format('star coins of %s: %s', v_mission.code, v_mission.star_coins);

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

  assert (select count(*) from public.card_instances i join public.card_definitions d on d.id = i.definition_id
          where i.owner_id = v_user and i.acquired_via = 'story' and d.code = 'P210' and not i.is_starter) = 1, 'chapter 14 boss card';
  assert (select count(*) from public.card_transfers where to_user = v_user and reason = 'story') = 14, 'card transfers';
  assert v_coins = 8190, format('story coins in the catalog: %s', v_coins);
  assert (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'story_reward') = v_coins, 'story coins';

  perform set_config('story_test.boss14', (
    select p.match_id::text from public.story_progress p join public.story_missions m on m.id = p.mission_id
    where m.code = 'C14M5' and p.user_id = v_user), true);
end $$;

-- Between chapters 14 and 15: the ending of chapter 14 shows, the ending of
-- season 3 waits for its last chapter, and chapter 15 opens at its first mission.
set local role authenticated;

do $$
declare
  v_story jsonb := public.get_story();
  v_fifteenth jsonb := v_story -> 14 -> 'missions';
  v_sixteenth jsonb := v_story -> 15 -> 'missions';
  v_seventeenth jsonb := v_story -> 16 -> 'missions';
begin
  assert v_story -> 13 ->> 'outro' like 'Nella radura%', 'ending of the completed chapter 14';
  assert v_story -> 13 -> 'season_ending' = 'null'::jsonb, 'ending of season 3 on chapter 14, which is not the last';
  assert v_story -> 14 -> 'outro' = 'null'::jsonb, 'ending of chapter 15 before playing it';
  assert v_story -> 14 -> 'season_ending' = 'null'::jsonb, 'ending of season 3 before its last chapter is completed';
  assert (v_fifteenth -> 0 ->> 'unlocked')::boolean and not (v_fifteenth -> 1 ->> 'unlocked')::boolean,
    'chapter 3 of season 3 opens at its first mission';
  assert not exists (select 1 from jsonb_array_elements(v_fifteenth) m where (m ->> 'completed')::boolean), 'chapter 15 already completed';
  assert v_story -> 15 -> 'outro' = 'null'::jsonb, 'ending of chapter 16 before playing it';
  assert not exists (select 1 from jsonb_array_elements(v_sixteenth) m where (m ->> 'unlocked')::boolean),
    'chapter 4 of season 3 open before chapter 3';
end $$;

reset role;

-- Playing chapter 3 of season 3 (chapter 15 of the whole story).
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000e1';
  v_team uuid[];
  v_match uuid;
  v_mission public.story_missions;
  v_balance integer;
  v_coins integer := (select sum(reward_coins) from public.story_missions where chapter between 1 and 15);
begin
  select array_agg(id) into v_team from (
    select id from public.card_instances where owner_id = v_user and acquired_via <> 'story' order by acquired_at, id limit 5
  ) s;

  for v_mission in select * from public.story_missions where chapter = 15 order by ord loop
    -- The boss stays closed until the mission before it is won.
    if v_mission.ord < 5 then
      begin
        perform public.story_create_match(v_user, 'C15M5', v_team);
        raise exception 'ASSERT: the chapter 15 boss started before its turn';
      exception when raise_exception then
        assert sqlerrm = 'story_mission_locked', sqlerrm;
      end;
    end if;
    -- Chapter 16 stays closed until the chapter 15 boss is won.
    begin
      perform public.story_create_match(v_user, 'C16M1', v_team);
      raise exception 'ASSERT: chapter 16 started before chapter 15 was completed';
    exception when raise_exception then
      assert sqlerrm = 'story_mission_locked', sqlerrm;
    end;
    assert v_mission.star_coins = 30, format('star coins of %s: %s', v_mission.code, v_mission.star_coins);

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

  assert (select count(*) from public.card_instances i join public.card_definitions d on d.id = i.definition_id
          where i.owner_id = v_user and i.acquired_via = 'story' and d.code = 'P116' and not i.is_starter) = 1, 'chapter 15 boss card';
  assert (select count(*) from public.card_transfers where to_user = v_user and reason = 'story') = 15, 'card transfers';
  assert v_coins = 9150, format('story coins in the catalog: %s', v_coins);
  assert (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'story_reward') = v_coins, 'story coins';

  perform set_config('story_test.boss15', (
    select p.match_id::text from public.story_progress p join public.story_missions m on m.id = p.mission_id
    where m.code = 'C15M5' and p.user_id = v_user), true);
end $$;

-- Between chapters 15 and 16: the ending of chapter 15 shows, the ending of
-- season 3 waits for its last chapter, and chapter 16 opens at its first mission.
set local role authenticated;

do $$
declare
  v_story jsonb := public.get_story();
  v_sixteenth jsonb := v_story -> 15 -> 'missions';
  v_seventeenth jsonb := v_story -> 16 -> 'missions';
begin
  assert v_story -> 14 ->> 'outro' like 'Battuto Attainder%', 'ending of the completed chapter 15';
  assert v_story -> 14 -> 'season_ending' = 'null'::jsonb, 'ending of season 3 on chapter 15, which is not the last';
  assert v_story -> 15 -> 'outro' = 'null'::jsonb, 'ending of chapter 16 before playing it';
  assert v_story -> 15 -> 'season_ending' = 'null'::jsonb, 'ending of season 3 before its last chapter is completed';
  assert (v_sixteenth -> 0 ->> 'unlocked')::boolean and not (v_sixteenth -> 1 ->> 'unlocked')::boolean,
    'chapter 4 of season 3 opens at its first mission';
  assert not exists (select 1 from jsonb_array_elements(v_sixteenth) m where (m ->> 'completed')::boolean), 'chapter 16 already completed';
  assert v_story -> 16 -> 'outro' = 'null'::jsonb, 'ending of chapter 17 before playing it';
  assert not exists (select 1 from jsonb_array_elements(v_seventeenth) m where (m ->> 'unlocked')::boolean),
    'chapter 5 of season 3 open before chapter 4';
end $$;

reset role;

-- Playing chapter 4 of season 3 (chapter 16 of the whole story).
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000e1';
  v_team uuid[];
  v_match uuid;
  v_mission public.story_missions;
  v_balance integer;
  v_coins integer := (select sum(reward_coins) from public.story_missions where chapter between 1 and 16);
begin
  select array_agg(id) into v_team from (
    select id from public.card_instances where owner_id = v_user and acquired_via <> 'story' order by acquired_at, id limit 5
  ) s;

  for v_mission in select * from public.story_missions where chapter = 16 order by ord loop
    -- The boss stays closed until the mission before it is won.
    if v_mission.ord < 5 then
      begin
        perform public.story_create_match(v_user, 'C16M5', v_team);
        raise exception 'ASSERT: the chapter 16 boss started before its turn';
      exception when raise_exception then
        assert sqlerrm = 'story_mission_locked', sqlerrm;
      end;
    end if;
    -- Chapter 17 stays closed until the chapter 16 boss is won.
    begin
      perform public.story_create_match(v_user, 'C17M1', v_team);
      raise exception 'ASSERT: chapter 17 started before chapter 16 was completed';
    exception when raise_exception then
      assert sqlerrm = 'story_mission_locked', sqlerrm;
    end;
    assert v_mission.star_coins = 30, format('star coins of %s: %s', v_mission.code, v_mission.star_coins);

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

  assert (select count(*) from public.card_instances i join public.card_definitions d on d.id = i.definition_id
          where i.owner_id = v_user and i.acquired_via = 'story' and d.code = 'P053' and not i.is_starter) = 1, 'chapter 16 boss card';
  assert (select count(*) from public.card_transfers where to_user = v_user and reason = 'story') = 16, 'card transfers';
  assert v_coins = 10160, format('story coins in the catalog: %s', v_coins);
  assert (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'story_reward') = v_coins, 'story coins';

  perform set_config('story_test.boss16', (
    select p.match_id::text from public.story_progress p join public.story_missions m on m.id = p.mission_id
    where m.code = 'C16M5' and p.user_id = v_user), true);
end $$;

-- Between chapters 16 and 17: the ending of chapter 16 shows, the ending of
-- season 3 waits for its last chapter, and chapter 17 opens at its first mission.
set local role authenticated;

do $$
declare
  v_story jsonb := public.get_story();
  v_seventeenth jsonb := v_story -> 16 -> 'missions';
begin
  assert v_story -> 15 ->> 'outro' like 'Battuta Moth%', 'ending of the completed chapter 16';
  assert v_story -> 15 -> 'season_ending' = 'null'::jsonb, 'ending of season 3 on chapter 16, which is not the last';
  assert v_story -> 16 -> 'outro' = 'null'::jsonb, 'ending of chapter 17 before playing it';
  assert v_story -> 16 -> 'season_ending' = 'null'::jsonb, 'ending of season 3 before its last chapter is completed';
  assert (v_seventeenth -> 0 ->> 'unlocked')::boolean and not (v_seventeenth -> 1 ->> 'unlocked')::boolean,
    'chapter 5 of season 3 opens at its first mission';
  assert not exists (select 1 from jsonb_array_elements(v_seventeenth) m where (m ->> 'completed')::boolean), 'chapter 17 already completed';
end $$;

reset role;

-- Playing chapter 5 of season 3 (chapter 17 of the whole story), whose stars pay 40 coins.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000e1';
  v_team uuid[];
  v_match uuid;
  v_mission public.story_missions;
  v_balance integer;
  v_coins integer := (select sum(reward_coins) from public.story_missions where chapter between 1 and 17);
begin
  select array_agg(id) into v_team from (
    select id from public.card_instances where owner_id = v_user and acquired_via <> 'story' order by acquired_at, id limit 5
  ) s;

  for v_mission in select * from public.story_missions where chapter = 17 order by ord loop
    -- The boss stays closed until the mission before it is won.
    if v_mission.ord < 5 then
      begin
        perform public.story_create_match(v_user, 'C17M5', v_team);
        raise exception 'ASSERT: the chapter 17 boss started before its turn';
      exception when raise_exception then
        assert sqlerrm = 'story_mission_locked', sqlerrm;
      end;
    end if;
    assert v_mission.star_coins = 40, format('star coins of %s: %s', v_mission.code, v_mission.star_coins);

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

  assert (select count(*) from public.card_instances i join public.card_definitions d on d.id = i.definition_id
          where i.owner_id = v_user and i.acquired_via = 'story' and d.code = 'P183' and not i.is_starter) = 1, 'chapter 17 boss card';
  assert (select count(*) from public.card_transfers where to_user = v_user and reason = 'story') = 17, 'card transfers';
  assert v_coins = 11220, format('story coins in the catalog: %s', v_coins);
  assert (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'story_reward') = v_coins, 'story coins';

  perform set_config('story_test.boss17', (
    select p.match_id::text from public.story_progress p join public.story_missions m on m.id = p.mission_id
    where m.code = 'C17M5' and p.user_id = v_user), true);
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
  v_boss7 uuid := current_setting('story_test.boss7')::uuid;
  v_boss8 uuid := current_setting('story_test.boss8')::uuid;
  v_boss9 uuid := current_setting('story_test.boss9')::uuid;
  v_boss10 uuid := current_setting('story_test.boss10')::uuid;
  v_boss11 uuid := current_setting('story_test.boss11')::uuid;
  v_boss12 uuid := current_setting('story_test.boss12')::uuid;
  v_boss13 uuid := current_setting('story_test.boss13')::uuid;
  v_boss14 uuid := current_setting('story_test.boss14')::uuid;
  v_boss15 uuid := current_setting('story_test.boss15')::uuid;
  v_boss16 uuid := current_setting('story_test.boss16')::uuid;
  v_boss17 uuid := current_setting('story_test.boss17')::uuid;
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
  assert not (v_reward ->> 'is_last')::boolean, 'season 2 follows season 1';
  assert v_reward ->> 'season_ending' = 'Hai finito la Stagione 1, Il Rintocco. Ti aspetta la Stagione 2, La marea.',
    'ending of season 1 on its last mission';

  v_reward := public.get_story_reward(v_boss7);
  assert (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'coins')::integer = 140, 'reward of the chapter 7 boss';
  assert v_reward -> 'card' ->> 'code' = 'P130' and (v_reward -> 'card' ->> 'instance_id') is not null, 'chapter 7 reward card';
  assert not (v_reward ->> 'is_last')::boolean, 'chapter 8 follows chapter 7';
  assert v_reward -> 'season_ending' = 'null'::jsonb, 'season 2 ended at chapter 7';

  v_reward := public.get_story_reward(v_boss8);
  assert (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'coins')::integer = 150, 'reward of the chapter 8 boss';
  assert v_reward -> 'card' ->> 'code' = 'P089' and (v_reward -> 'card' ->> 'instance_id') is not null, 'chapter 8 reward card';
  assert not (v_reward ->> 'is_last')::boolean, 'chapter 9 follows chapter 8';
  assert v_reward -> 'season_ending' = 'null'::jsonb, 'season 2 ended at chapter 8';

  v_reward := public.get_story_reward(v_boss9);
  assert (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'coins')::integer = 160, 'reward of the chapter 9 boss';
  assert v_reward -> 'card' ->> 'code' = 'P181' and (v_reward -> 'card' ->> 'instance_id') is not null, 'chapter 9 reward card';
  assert not (v_reward ->> 'is_last')::boolean, 'chapter 10 follows chapter 9';
  assert v_reward -> 'season_ending' = 'null'::jsonb, 'season 2 ended at chapter 9';

  v_reward := public.get_story_reward(v_boss10);
  assert (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'coins')::integer = 170, 'reward of the chapter 10 boss';
  assert v_reward -> 'card' ->> 'code' = 'P175' and (v_reward -> 'card' ->> 'instance_id') is not null, 'chapter 10 reward card';
  assert not (v_reward ->> 'is_last')::boolean, 'chapter 11 follows chapter 10';
  assert v_reward -> 'season_ending' = 'null'::jsonb, 'season 2 ended at chapter 10';

  v_reward := public.get_story_reward(v_boss11);
  assert (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'coins')::integer = 180, 'reward of the chapter 11 boss';
  assert v_reward -> 'card' ->> 'code' = 'P122' and (v_reward -> 'card' ->> 'instance_id') is not null, 'chapter 11 reward card';
  assert not (v_reward ->> 'is_last')::boolean, 'chapter 12 follows chapter 11';
  assert v_reward -> 'season_ending' = 'null'::jsonb, 'season 2 ended at chapter 11';

  v_reward := public.get_story_reward(v_boss12);
  assert (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'coins')::integer = 190, 'reward of the chapter 12 boss';
  assert v_reward -> 'card' ->> 'code' = 'P214' and (v_reward -> 'card' ->> 'instance_id') is not null, 'chapter 12 reward card';
  assert not (v_reward ->> 'is_last')::boolean, 'season 3 follows season 2';
  assert v_reward ->> 'season_ending' = 'Hai finito la Stagione 2, La marea. Ti aspetta la Stagione 3, La montagna.',
    'ending of season 2 on its last mission';

  v_reward := public.get_story_reward(v_boss13);
  assert (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'coins')::integer = 200, 'reward of the chapter 13 boss';
  assert v_reward -> 'card' ->> 'code' = 'P224' and (v_reward -> 'card' ->> 'instance_id') is not null, 'chapter 13 reward card';
  assert not (v_reward ->> 'is_last')::boolean, 'chapter 14 follows chapter 13';
  assert v_reward -> 'season_ending' = 'null'::jsonb, 'season 3 ended at chapter 13';

  v_reward := public.get_story_reward(v_boss14);
  assert (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'coins')::integer = 210, 'reward of the chapter 14 boss';
  assert v_reward -> 'card' ->> 'code' = 'P210' and (v_reward -> 'card' ->> 'instance_id') is not null, 'chapter 14 reward card';
  assert not (v_reward ->> 'is_last')::boolean, 'chapter 15 follows chapter 14';
  assert v_reward -> 'season_ending' = 'null'::jsonb, 'season 3 ended at chapter 14';

  v_reward := public.get_story_reward(v_boss15);
  assert (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'coins')::integer = 220, 'reward of the chapter 15 boss';
  assert v_reward -> 'card' ->> 'code' = 'P116' and (v_reward -> 'card' ->> 'instance_id') is not null, 'chapter 15 reward card';
  assert not (v_reward ->> 'is_last')::boolean, 'chapter 16 follows chapter 15';
  assert v_reward -> 'season_ending' = 'null'::jsonb, 'season 3 ended at chapter 15';

  v_reward := public.get_story_reward(v_boss16);
  assert (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'coins')::integer = 230, 'reward of the chapter 16 boss';
  assert v_reward -> 'card' ->> 'code' = 'P053' and (v_reward -> 'card' ->> 'instance_id') is not null, 'chapter 16 reward card';
  assert not (v_reward ->> 'is_last')::boolean, 'chapter 17 follows chapter 16';
  assert v_reward -> 'season_ending' = 'null'::jsonb, 'season 3 ended at chapter 16';

  v_reward := public.get_story_reward(v_boss17);
  assert (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'coins')::integer = 240, 'reward of the chapter 17 boss';
  assert v_reward -> 'card' ->> 'code' = 'P183' and (v_reward -> 'card' ->> 'instance_id') is not null, 'chapter 17 reward card';
  assert (v_reward ->> 'is_last')::boolean, 'last mission';
  assert v_reward ->> 'season_ending' = 'Il prossimo capitolo della Stagione 3, La montagna, arriva presto.',
    'ending of season 3 on its last mission';

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
  assert v_story -> 6 ->> 'outro' like 'Vinci l''asta%', 'ending of chapter 7';
  assert v_story -> 7 ->> 'outro' like 'Nella camera%', 'ending of chapter 8';
  assert v_story -> 8 ->> 'outro' like 'Al Monte dei Pegni%', 'ending of chapter 9';
  assert v_story -> 9 ->> 'outro' like 'Absentia era%', 'ending of chapter 10';
  assert v_story -> 10 ->> 'outro' like 'Vinta la sfida%', 'ending of chapter 11';
  assert v_story -> 11 ->> 'outro' like 'Sull''orlo dell''occhio%', 'ending of chapter 12';
  assert v_story -> 12 ->> 'outro' like 'Nella necropoli%', 'ending of chapter 13';
  assert v_story -> 13 ->> 'outro' like 'Nella radura%', 'ending of chapter 14';
  assert v_story -> 14 ->> 'outro' like 'Battuto Attainder%', 'ending of chapter 15';
  assert v_story -> 15 ->> 'outro' like 'Battuta Moth%', 'ending of chapter 16';
  assert v_story -> 16 ->> 'outro' like 'Battuto Mainstay%', 'ending of chapter 17';
  -- The ending of a season sits on its last chapter only.
  assert v_story -> 5 ->> 'season_ending' = 'Hai finito la Stagione 1, Il Rintocco. Ti aspetta la Stagione 2, La marea.',
    'ending of season 1';
  assert v_story -> 11 ->> 'season_ending' = 'Hai finito la Stagione 2, La marea. Ti aspetta la Stagione 3, La montagna.',
    'ending of season 2';
  assert v_story -> 16 ->> 'season_ending' = 'Il prossimo capitolo della Stagione 3, La montagna, arriva presto.',
    'ending of season 3';
  assert not exists (select 1 from jsonb_array_elements(v_story) with ordinality as c(chapter, ord)
                     where c.ord not in (6, 12, 17) and c.chapter -> 'season_ending' is distinct from 'null'::jsonb),
    'ending of a season before its last chapter';
end $$;

rollback;

select 'story: all assertions passed' as result;
