-- Integration test for the stars of the story missions (SPEC §5.11): every mission has its
-- rules; a won match earns the stars whose conditions hold, with the squad actually fielded
-- and the rules copied onto the match when it was created; each star pays once, several
-- can come from one win, losses and abandoned matches earn none; players read stars and
-- rules through get_story and get_story_reward only; only admins change the story from the
-- Editor. Internal functions are called as the database owner, as the Edge Function would
-- with service_role. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

-- Every mission: rules that exist and leave at least a squad, the coins of its chapter.
-- Seasons 1 and 2 keep the starting formula; season 3 sets its own coins in each
-- mission (docs/STORY.md §7.9): 30 a star in chapters 13-16 and 40 in 17-18, where
-- the formula would give 40 and 50.
do $$
declare
  v_mission public.story_missions;
begin
  assert (select count(*) from public.story_missions) = 90, 'ninety missions';
  for v_mission in select * from public.story_missions loop
    assert cardinality(v_mission.star_rarities) >= 1 and cardinality(v_mission.star_traits) >= 1,
      format('%s has no star rules', v_mission.code);
    assert public.event_admitted_count('{}', v_mission.star_rarities, '{}') >= 15,
      format('%s: under 15 characters of its rarities', v_mission.code);
    assert public.trait_admitted_count(v_mission.star_traits) >= 15,
      format('%s: under 15 characters with its traits', v_mission.code);
    assert v_mission.star_coins = case when v_mission.chapter <= 12 then public.story_default_star_coins(v_mission.chapter)
                                       when v_mission.chapter <= 16 then 30
                                       else 40 end,
      format('%s: star coins', v_mission.code);
  end loop;
  assert public.story_default_star_coins(1) = 10 and public.story_default_star_coins(4) = 10
     and public.story_default_star_coins(5) = 20 and public.story_default_star_coins(9) = 30
     and public.story_default_star_coins(12) = 30 and public.story_default_star_coins(13) = 40, 'star coins by chapter';
end $$;

-- A mission added with SQL gets the coins of its chapter, and bad rules are refused.
do $$
begin
  begin
    update public.story_missions set star_traits = '{group.nope}' where code = 'C1M2';
    raise exception 'ASSERT: an unknown trait was accepted';
  exception when raise_exception then
    assert sqlerrm = 'story_star_unknown_rule', sqlerrm;
  end;
  begin
    update public.story_missions set star_rarities = '{}' where code = 'C1M2';
    raise exception 'ASSERT: a mission without rarities was accepted';
  exception when check_violation then null;
  end;
end $$;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000005a1', 'authenticated', 'authenticated', 'stars-a@example.test',
   '{"full_name": "Stelle A"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000005a1", "role": "authenticated"}', true);
select public.bootstrap_player();

-- Players read stars and rules from get_story only; the tables and the admin page are closed.
do $$
declare
  v_first jsonb := public.get_story() -> 0 -> 'missions' -> 0;
begin
  assert v_first ->> 'code' = 'C1M1', 'first mission';
  assert v_first -> 'stars' = '[]'::jsonb, 'no star yet';
  assert jsonb_array_length(v_first -> 'star_rarities') >= 1 and jsonb_array_length(v_first -> 'star_rarity_names') >= 1,
    'rarities of the star';
  assert jsonb_array_length(v_first -> 'star_traits') >= 1 and jsonb_array_length(v_first -> 'star_traits_text') >= 1,
    'traits of the star';
  assert (v_first ->> 'star_coins')::integer = 10, 'star coins';
  begin
    perform count(*) from public.story_stars;
    raise exception 'ASSERT: a player read story_stars';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.story_match_terms;
    raise exception 'ASSERT: a player read story_match_terms';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_get_story();
    raise exception 'ASSERT: a player opened the story admin';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_save_story_season(1, 'Altro titolo', 'Un altro messaggio di fine stagione.');
    raise exception 'ASSERT: a player changed a season';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

-- Squads chosen for the test: five Delta humans, and four of them with a Gamma human.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000005a1';
  v_deltas uuid[];
  v_gamma uuid;
begin
  select array_agg(id) into v_deltas from (
    select d.id from public.card_definitions d
    where d.is_active and d.unlock_level is null and d.rarity_code = 'delta'
      and public.card_matches_traits(d.id, '{nature.umano}')
    order by d.code limit 5
  ) s;
  select d.id into v_gamma from public.card_definitions d
  where d.is_active and d.unlock_level is null and d.rarity_code = 'gamma'
    and public.card_matches_traits(d.id, '{nature.umano}')
  order by d.code limit 1;
  assert cardinality(v_deltas) = 5 and v_gamma is not null, 'test characters';

  insert into public.card_instances (definition_id, owner_id, acquired_via)
  select u.id, v_user, 'pack' from unnest(v_deltas || v_gamma) as u(id);

  perform set_config('stars_test.fit', (
    select array_agg(i.id order by d.code)::text from public.card_instances i
    join public.card_definitions d on d.id = i.definition_id
    where i.owner_id = v_user and i.acquired_via = 'pack' and d.id = any (v_deltas)
  ), true);
  perform set_config('stars_test.mixed', (
    select (array_agg(i.id order by d.code))[1:4]::text from public.card_instances i
    join public.card_definitions d on d.id = i.definition_id
    where i.owner_id = v_user and i.acquired_via = 'pack' and d.id = any (v_deltas)
  ) , true);
  perform set_config('stars_test.gamma', (
    select i.id::text from public.card_instances i where i.owner_id = v_user and i.acquired_via = 'pack' and i.definition_id = v_gamma
  ), true);

  -- The rules of the first mission for the test: Delta, Umano, 15 coins a star.
  update public.story_missions set star_rarities = '{delta}', star_traits = '{nature.umano}', star_coins = 15 where code = 'C1M1';
end $$;

do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000005a1';
  v_fit uuid[] := current_setting('stars_test.fit')::uuid[];
  v_mixed uuid[] := current_setting('stars_test.mixed')::uuid[] || current_setting('stars_test.gamma')::uuid;
  v_match uuid;
  v_balance integer;
begin
  -- A loss earns nothing.
  v_match := public.story_create_match(v_user, 'C1M1', v_fit);
  update public.matches set rounds_won_a = 0, rounds_won_b = 0 where id = v_match;
  perform public.finish_match(v_match, 'b', 'completed');
  assert not exists (select 1 from public.story_stars where user_id = v_user), 'a loss earned a star';

  -- The rules are copied when the match is created: a later edit does not touch it.
  v_match := public.story_create_match(v_user, 'C1M1', v_mixed);
  assert (select star_rarities = '{delta}' and star_traits = '{nature.umano}' and star_coins = 15
          from public.story_match_terms where match_id = v_match), 'terms not copied';
  update public.story_missions set star_traits = '{nature.macchina}', star_coins = 99 where code = 'C1M1';

  -- 3-1 with a Gamma in the squad: only the traits star, paid with the match's coins.
  update public.matches set rounds_won_a = 3, rounds_won_b = 1 where id = v_match;
  v_balance := public.coin_balance(v_user);
  perform public.finish_match(v_match, 'a', 'completed');
  assert (select array_agg(star order by star) from public.story_stars where user_id = v_user) = '{traits}',
    'expected the traits star only';
  assert (select coins from public.story_stars where user_id = v_user and star = 'traits') = 15, 'star coins of the match';
  assert (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'story_star' and ref_id = v_match) = 15,
    'star coins not paid';
  assert (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'story_reward' and ref_id = v_match) = 30,
    'first-win prize';
  assert public.coin_balance(v_user) >= v_balance + 45, 'balance';
  perform set_config('stars_test.first', v_match::text, true);

  -- A replay 3-0 with five Deltas: 3-0 and rarities at once, with the new coins, in one ledger row.
  -- The traits rule is now Macchina, which humans never match: the traits star stays as it was.
  v_match := public.story_create_match(v_user, 'C1M1', v_fit);
  update public.matches set rounds_won_a = 3, rounds_won_b = 0 where id = v_match;
  perform public.finish_match(v_match, 'a', 'completed');
  assert (select array_agg(star order by star) from public.story_stars where user_id = v_user) = '{flawless,rarities,traits}',
    'expected all three stars';
  assert (select count(*) from public.coin_ledger where user_id = v_user and reason = 'story_star' and ref_id = v_match) = 1
     and (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'story_star' and ref_id = v_match) = 198,
    'two stars, one ledger row';
  assert not exists (select 1 from public.coin_ledger where reason = 'story_reward' and ref_id = v_match), 'replay paid the prize';
  assert (select match_id from public.story_stars where user_id = v_user and star = 'traits')
       = current_setting('stars_test.first')::uuid, 'an earned star stays with its first match';
  perform set_config('stars_test.second', v_match::text, true);

  -- Once earned, a star never pays again.
  v_match := public.story_create_match(v_user, 'C1M1', v_fit);
  update public.matches set rounds_won_a = 3, rounds_won_b = 0 where id = v_match;
  perform public.finish_match(v_match, 'a', 'completed');
  assert not exists (select 1 from public.coin_ledger where reason = 'story_star' and ref_id = v_match), 'a star paid twice';

  -- An abandoned match never counts, even when won.
  v_match := public.story_create_match(v_user, 'C1M2', v_fit);
  update public.matches set rounds_won_a = 0, rounds_won_b = 0 where id = v_match;
  perform public.finish_match(v_match, 'a', 'forfeit');
  assert not exists (select 1 from public.story_stars s join public.story_missions m on m.id = s.mission_id
                     where s.user_id = v_user and m.code = 'C1M2'), 'an abandoned match earned a star';
end $$;

-- What the player reads: the stars of the mission and of each match.
set local role authenticated;

do $$
declare
  v_first jsonb := public.get_story() -> 0 -> 'missions' -> 0;
  v_reward jsonb := public.get_story_reward(current_setting('stars_test.second')::uuid);
  v_old jsonb := public.get_story_reward(current_setting('stars_test.first')::uuid);
begin
  assert v_first -> 'stars' = '["flawless", "rarities", "traits"]'::jsonb, 'stars in get_story';
  assert (v_first ->> 'star_coins')::integer = 99 and v_first -> 'star_traits' = '["nature.macchina"]'::jsonb,
    'get_story shows the rules of now';
  assert v_reward -> 'stars_now' = '["flawless", "rarities"]'::jsonb, 'stars earned now';
  assert v_reward -> 'stars_had' = '["traits"]'::jsonb, 'stars earned before';
  assert (v_reward ->> 'star_coins')::integer = 198, 'coins of the stars';
  assert v_reward -> 'stars_met' = '["flawless", "rarities"]'::jsonb, 'conditions met with the rules of the match';
  assert v_reward -> 'star_traits' = '["nature.macchina"]'::jsonb, 'rules of the match';
  assert not (v_reward ->> 'completed_now')::boolean and (v_reward ->> 'coins')::integer = 0, 'replay';
  assert v_old -> 'stars_now' = '["traits"]'::jsonb and (v_old ->> 'star_coins')::integer = 15, 'the first match';
  assert v_old -> 'star_traits' = '["nature.umano"]'::jsonb, 'the first match kept its rules';
  assert (v_old ->> 'coins')::integer = 30, 'the first-win prize of the first match';
end $$;

reset role;

-- The Editor: only admins, every value checked, the calibrated parts untouched.
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000005a1');

set local role authenticated;

do $$
declare
  v_admin jsonb := public.admin_get_story();
  v_mission jsonb;
  v_before public.story_missions;
begin
  assert jsonb_array_length(v_admin -> 'missions') = 90 and jsonb_array_length(v_admin -> 'chapters') = 18
     and jsonb_array_length(v_admin -> 'seasons') = 3, 'admin payload';
  assert jsonb_array_length(v_admin -> 'characters') >= 200, 'characters to count';
  v_mission := (select m from jsonb_array_elements(v_admin -> 'missions') m where m ->> 'code' = 'C1M1');
  assert (v_mission -> 'stars_earned' ->> 'flawless')::integer >= 1, 'stars earned in the payload';
  assert jsonb_array_length(v_mission -> 'threats') = 5 and jsonb_array_length(v_mission -> 'opponents') = 5,
    'read-only parts';

  begin
    perform public.admin_save_story_mission('C1M5', 'Il caveau', 'Ottavia', 'Un''introduzione abbastanza lunga.', 80,
      '{omega}', '{group.figli,nature.alieno}', 10);
    raise exception 'ASSERT: a star rule with too few characters';
  exception when raise_exception then
    assert sqlerrm = 'story_star_too_few', sqlerrm;
  end;
  begin
    perform public.admin_save_story_mission('C1M5', 'Il caveau', 'Ottavia', 'Un''introduzione abbastanza lunga.', 80,
      '{delta}', '{}', 10);
    raise exception 'ASSERT: a star rule without traits';
  exception when raise_exception then
    assert sqlerrm = 'story_star_rule_empty', sqlerrm;
  end;
  begin
    perform public.admin_save_story_mission('C1M5', 'Il caveau', 'Ottavia', 'Un''introduzione abbastanza lunga.', 80,
      '{delta,nope}', '{group.figli}', 10);
    raise exception 'ASSERT: an unknown rarity';
  exception when raise_exception then
    assert sqlerrm = 'story_star_unknown_rule', sqlerrm;
  end;
  begin
    perform public.admin_save_story_mission('C1M5', 'X', 'Ottavia', 'Un''introduzione abbastanza lunga.', 80,
      '{delta}', '{group.figli}', 10);
    raise exception 'ASSERT: a one-letter title';
  exception when raise_exception then
    assert sqlerrm = 'story_invalid_text', sqlerrm;
  end;
  begin
    perform public.admin_save_story_mission('C1M5', 'Il caveau', 'Ottavia', 'Un''introduzione abbastanza lunga.', 80,
      '{delta}', '{group.figli}', 5000);
    raise exception 'ASSERT: too many coins a star';
  exception when raise_exception then
    assert sqlerrm = 'story_invalid_coins', sqlerrm;
  end;

  v_admin := public.admin_save_story_mission('C1M5', '  Il caveau nuovo ', 'Ottavia e il Banco', 'Un''introduzione abbastanza lunga.',
    85, '{gamma,delta}', '{group.figli,origin.mito,origin.strappo}', 25);
  v_mission := (select m from jsonb_array_elements(v_admin -> 'missions') m where m ->> 'code' = 'C1M5');
  assert v_mission ->> 'title' = 'Il caveau nuovo' and (v_mission ->> 'reward_coins')::integer = 85
     and v_mission -> 'star_rarities' = '["delta", "gamma"]'::jsonb and (v_mission ->> 'star_coins')::integer = 25,
    'mission saved, rarities in their order';

  v_admin := public.admin_save_story_chapter(1, 'Il porto nuovo', 'Una nuova introduzione.', 'Un nuovo finale del capitolo.');
  assert (select c ->> 'title' from jsonb_array_elements(v_admin -> 'chapters') c where (c ->> 'chapter')::integer = 1) = 'Il porto nuovo',
    'chapter saved';
  begin
    perform public.admin_save_story_chapter(99, 'Nessuno', 'Una nuova introduzione.', 'Un nuovo finale del capitolo.');
    raise exception 'ASSERT: an unknown chapter';
  exception when raise_exception then
    assert sqlerrm = 'story_chapter_not_found', sqlerrm;
  end;
  v_admin := public.admin_save_story_season(1, 'Il Rintocco', 'Hai finito la prima stagione: complimenti.');
  assert (select s ->> 'ending' from jsonb_array_elements(v_admin -> 'seasons') s where (s ->> 'season')::integer = 1)
       = 'Hai finito la prima stagione: complimenti.', 'season saved';
end $$;

reset role;

-- The calibrated parts did not move.
do $$
begin
  assert (select bot_difficulty = 'super_pro' and cardinality(threat_ids) = 5 and reward_definition_id is not null
          from public.story_missions where code = 'C1M5'), 'calibrated parts changed';
end $$;

rollback;
