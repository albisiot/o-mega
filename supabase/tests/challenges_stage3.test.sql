-- Integration test for the third stage of the Sfide a tema (SPEC §8.8): the composition of the
-- squad (rarity budget, most copies of a rarity, fewest factions), the match rules of Classica
-- (a modifier on every round, a place's threats), a squad given by the challenge, the challenge's
-- leaderboard and the Emergenza a tema with its prize. Internal functions are called as the
-- database owner, as the Edge Function would with service_role. Runs inside a rolled-back
-- transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000008c1', 'authenticated', 'authenticated', 'challenge3-a@example.test',
   '{"full_name": "Sfida3 A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000008c3', 'authenticated', 'authenticated', 'challenge3-admin@example.test',
   '{"full_name": "Sfida3 Admin"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008c1", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008c3", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000008c3');
update public.events set is_active = false where is_active;
update public.challenges set is_active = false where is_active;

-- The composition and the match rules, in their one form and checked.
do $$
declare
  v_rules jsonb;
  v_deltas uuid[];
  v_omegas uuid[];
  v_heroes uuid[];
begin
  assert 'emergency' = any (public.challenge_formats()), 'the Emergenza is a mode of the challenges';

  v_rules := public.challenge_normalize_rules('{"rarity_budget": 12, "rarity_max": {"omega": 1}, "min_factions": 2}');
  assert (v_rules ->> 'rarity_budget')::integer = 12 and v_rules -> 'rarity_max' = '{"omega": 1}'::jsonb
         and (v_rules ->> 'min_factions')::integer = 2, v_rules::text;
  v_rules := public.challenge_normalize_rules('{}');
  assert v_rules -> 'rarity_budget' = 'null'::jsonb and v_rules -> 'rarity_max' = '{}'::jsonb, 'no composition by default';
  begin
    perform public.challenge_normalize_rules('{"rarity_max": {"nessuna": 1}}');
    raise exception 'ASSERT: an unknown rarity was accepted';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_rules', sqlerrm;
  end;
  begin
    perform public.challenge_normalize_rules('{"min_factions": 4}');
    raise exception 'ASSERT: four factions were accepted';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_rules', sqlerrm;
  end;

  select array_agg(id) into v_deltas from (
    select d.id from public.card_definitions d where d.is_active and d.unlock_level is null and d.rarity_code = 'delta'
    order by d.code limit 5
  ) s;
  select array_agg(id) into v_omegas from (
    select d.id from public.card_definitions d where d.is_active and d.unlock_level is null and d.rarity_code = 'omega'
    order by d.code limit 2
  ) s;
  assert public.challenge_composition_problem('{"rarity_budget": 5}', v_deltas) is null, 'five Delta: a budget of 5';
  assert public.challenge_composition_problem('{"rarity_budget": 12}', v_deltas[1:3] || v_omegas) = 'challenge_over_budget',
    'three Delta and two Omega: 13';
  assert public.challenge_composition_problem('{"rarity_max": {"omega": 1}}', v_deltas[1:3] || v_omegas) = 'challenge_rarity_limit',
    'two Omega';
  select array_agg(id) into v_heroes from (
    select d.id from public.card_definitions d where d.is_active and d.unlock_level is null and d.faction = 'heroes'
    order by d.code limit 5
  ) s;
  assert public.challenge_composition_problem('{"min_factions": 2}', v_heroes) = 'challenge_too_few_factions', 'heroes only';

  assert public.challenge_composition_possible(public.challenge_normalize_rules('{"rarity_budget": 5}'), 5), 'five Delta fit';
  assert not public.challenge_composition_possible(public.challenge_normalize_rules('{"rarity_budget": 4}'), 5), 'four is too little';
  assert public.challenge_cheapest_squad(public.challenge_normalize_rules('{"min_factions": 3}'), 5) >= 5, 'the cheapest squad';

  v_rules := public.challenge_normalize_match_rules('classic', '{"modifier": "focus", "place": "giza", "rare_multiplier": 10}');
  assert v_rules = '{"modifier": "focus", "place": "giza", "levels": [], "rare_multiplier": 10}'::jsonb, v_rules::text;
  assert public.challenge_normalize_match_rules('boss', '{}') ->> 'modifier' is null, 'no rules in another mode';
  begin
    perform public.challenge_normalize_match_rules('triple', '{"modifier": "focus"}');
    raise exception 'ASSERT: match rules outside Classica';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_match_rules', sqlerrm;
  end;
  begin
    perform public.challenge_normalize_match_rules('classic', '{"place": "giza", "levels": [1, 2]}');
    raise exception 'ASSERT: a place and levels together';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_match_rules', sqlerrm;
  end;
  assert public.challenge_modifier_entry('weak_link', 1) is null, 'Anello debole needs two abilities';
  assert public.challenge_modifier_entry('hostile_ground', 3) ->> 'favored' in ('heroes', 'villains', 'neutrals'), 'Territorio ostile';
end $$;

-- The admin: a Classica with match rules and a leaderboard, one with a given squad, an Emergenza.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008c3", "role": "authenticated"}', true);

do $$
declare
  v_now timestamp := (now() at time zone 'Europe/Rome')::timestamp;
  v_codes text[];
  v_payload jsonb;
begin
  select array_agg(code) into v_codes from (
    select d.code from public.card_definitions d where d.is_active and d.unlock_level is null order by d.code desc limit 5
  ) s;

  begin
    perform public.admin_save_challenge('Troppo stretta', '', '#ff7ad9', 'classic', '{easy}', true, '{"rarity_budget": 4}',
      v_now - interval '1 hour', v_now + interval '1 day');
    raise exception 'ASSERT: a budget no squad can keep';
  exception when raise_exception then
    assert sqlerrm = 'challenge_composition_impossible', sqlerrm;
  end;
  begin
    perform public.admin_save_challenge('Fornita online', '', '#ff7ad9', 'classic', '{easy}', true, '{}',
      v_now - interval '1 hour', v_now + interval '1 day', p_online => true, p_supplied_team => v_codes);
    raise exception 'ASSERT: a given squad online';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_supplied_team', sqlerrm;
  end;
  begin
    perform public.admin_save_challenge('Fornita corta', '', '#ff7ad9', 'classic', '{easy}', true, '{}',
      v_now - interval '1 hour', v_now + interval '1 day', p_supplied_team => v_codes[1:4]);
    raise exception 'ASSERT: a given squad of four';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_supplied_team', sqlerrm;
  end;
  begin
    perform public.admin_save_challenge('Emergenza con bot', '', '#ff7ad9', 'emergency', '{easy}', true, '{}',
      v_now - interval '1 hour', v_now + interval '1 day', p_emergency_threats => 8);
    raise exception 'ASSERT: an Emergenza against a bot';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_bots', sqlerrm;
  end;
  begin
    perform public.admin_save_challenge('Emergenza da 9', '', '#ff7ad9', 'emergency', '{}', true, '{}',
      v_now - interval '1 hour', v_now + interval '1 day', p_emergency_threats => 9);
    raise exception 'ASSERT: an Emergenza of 9 threats';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_emergency', sqlerrm;
  end;
  begin
    perform public.admin_save_challenge('Emergenza', '', '#ff7ad9', 'emergency', '{}', true, '{}',
      v_now - interval '1 hour', v_now + interval '1 day', p_emergency_threats => 8, p_tiers => '[{"wins": 9, "coins": 10}]');
    raise exception 'ASSERT: a target beyond the threats of the run';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_tiers', sqlerrm;
  end;

  v_payload := public.admin_save_challenge('Notte a Giza', '', '#ff7ad9', 'classic', '{easy}', true, '{}',
    v_now - interval '1 hour', v_now + interval '1 day', p_match_rules => '{"modifier": "focus", "place": "giza"}');
  perform set_config('stage3.giza', (select c ->> 'id' from jsonb_array_elements(v_payload -> 'challenges') as c
                                     where c ->> 'title' = 'Notte a Giza'), true);

  v_payload := public.admin_save_challenge('Squadra di tutti', '', '#16c8ff', 'triple', '{easy}', true, '{}',
    v_now + interval '1 hour', v_now + interval '1 day');
  begin
    perform public.admin_save_challenge('Squadra di tutti', '', '#16c8ff', 'triple', '{easy}', true, '{}',
      v_now + interval '1 hour', v_now + interval '1 day', p_id => (select (c ->> 'id')::uuid from jsonb_array_elements(v_payload -> 'challenges') as c
                                                                     where c ->> 'title' = 'Squadra di tutti'),
      p_supplied_team => v_codes);
    raise exception 'ASSERT: a given squad outside Classica';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_supplied_team', sqlerrm;
  end;

  v_payload := public.admin_save_challenge('Emergenza a tema', '', '#ff8a00', 'emergency', '{}', true, '{}',
    v_now - interval '1 hour', v_now + interval '1 day', p_emergency_threats => 8, p_tiers => '[{"wins": 1, "coins": 10}]');
  perform set_config('stage3.emergency', (select c ->> 'id' from jsonb_array_elements(v_payload -> 'challenges') as c
                                          where c ->> 'format' = 'emergency'), true);
  assert (select (c ->> 'team_size')::integer from jsonb_array_elements(v_payload -> 'challenges') as c
          where c ->> 'format' = 'emergency') = 8, 'an Emergenza of 8: a squad of 8';
  assert (select c ->> 'daily_limit' from jsonb_array_elements(v_payload -> 'challenges') as c where c ->> 'format' = 'emergency') is null,
    'no matches a day in an Emergenza';
  perform set_config('stage3.codes', array_to_string(v_codes, ','), true);
end $$;
reset role;

-- Against a bot: the place's threats, the modifier on every round, the leaderboard.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000008c1';
  v_starters uuid[];
  v_bots uuid[];
  v_threats uuid[];
  v_match uuid;
  v_modifiers jsonb;
  v_codes text[];
begin
  select array_agg(i.id order by i.acquired_at, i.id) into v_starters from public.card_instances i where i.owner_id = v_a and i.is_starter;
  select array_agg(id) into v_bots from (
    select d.id from public.card_definitions d where d.is_active and d.unlock_level is null order by d.code limit 5
  ) s;
  v_threats := array(select t.id from public.threat_definitions t where t.region = 'giza' and t.is_active order by t.level)
    || array(select t.id from public.threat_definitions t
             where t.region = 'megara' and t.is_active and t.rarity_code is null and t.level in (2, 3)
             order by t.level, t.id limit 2);
  assert cardinality(v_threats) = 5, 'three threats of Giza and two of Nuova Megara';

  v_match := public.challenge_create_bot_match(v_a, current_setting('stage3.giza')::uuid, 'easy', v_starters[1:5], v_bots, v_threats);
  select m.threat_modifiers into v_modifiers from public.matches m where m.id = v_match;
  assert v_modifiers -> 0 ->> 'code' <> 'focus' and v_modifiers -> 3 ->> 'code' = 'focus' and v_modifiers -> 4 ->> 'code' = 'focus',
    'a place''s threat keeps its own rule, the others get the challenge''s: ' || v_modifiers::text;
  assert (select t.match_rules ->> 'place' from public.challenge_match_terms t where t.match_id = v_match) = 'giza', 'the copy';
  perform public.finish_match(v_match, 'a', 'completed');

  -- The given squad: the player fields it without owning it; the bot fields none of it.
  select string_to_array(current_setting('stage3.codes'), ',') into v_codes;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008c3", "role": "authenticated"}', true);
do $$
declare
  v_now timestamp := (now() at time zone 'Europe/Rome')::timestamp;
  v_payload jsonb;
begin
  -- The Giza challenge is over: the given squad takes Classica now.
  perform public.admin_set_challenge_active(current_setting('stage3.giza')::uuid, false);
  v_payload := public.admin_save_challenge('Squadra fornita', '', '#16c8ff', 'classic', '{easy}', true, '{"rarity_budget": 5}',
    v_now - interval '1 hour', v_now + interval '1 day', p_supplied_team => string_to_array(current_setting('stage3.codes'), ','),
    p_leaderboard => false);
  perform set_config('stage3.supplied', (select c ->> 'id' from jsonb_array_elements(v_payload -> 'challenges') as c
                                         where c ->> 'title' = 'Squadra fornita'), true);
  assert (select c -> 'rules' ->> 'rarity_budget' from jsonb_array_elements(v_payload -> 'challenges') as c
          where c ->> 'title' = 'Squadra fornita') is null, 'no squad rules with a given squad';
  assert (select jsonb_array_length(c -> 'supplied_team') from jsonb_array_elements(v_payload -> 'challenges') as c
          where c ->> 'title' = 'Squadra fornita') = 5, 'the given squad in the payload';
end $$;
reset role;

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000008c1';
  v_supplied uuid[];
  v_bots uuid[];
  v_threats uuid[];
  v_match uuid;
  v_state jsonb;
begin
  select c.supplied_team into v_supplied from public.challenges c where c.id = current_setting('stage3.supplied')::uuid;
  select array_agg(id) into v_bots from (
    select d.id from public.card_definitions d where d.is_active and d.unlock_level is null and not d.id = any (v_supplied)
    order by d.code limit 5
  ) s;
  v_threats := array(select t.id from public.threat_definitions t
                     where t.region = 'megara' and t.is_active and t.rarity_code is null and t.level in (1, 3, 5)
                     order by t.level, t.id limit 5);
  begin
    perform public.challenge_create_bot_match(v_a, current_setting('stage3.supplied')::uuid, 'easy', '{}', v_supplied, v_threats);
    raise exception 'ASSERT: the bot with the given squad';
  exception when raise_exception then
    assert sqlerrm = 'invalid_bot_team', sqlerrm;
  end;
  v_match := public.challenge_create_bot_match(v_a, current_setting('stage3.supplied')::uuid, 'easy', '{}', v_bots, v_threats);
  assert (select t.card_instance_ids is null and t.definition_ids = v_supplied and t.user_id = v_a
          from public.match_teams t where t.match_id = v_match and t.side = 'a'), 'the player fields the given squad';
  v_state := public.match_state_payload(v_match, 'a');
  assert (v_state -> 'my_team' -> 0 ->> 'instance_id') = (v_state -> 'my_team' -> 0 ->> 'definition_id'),
    'the screen picks a given card by its definition';
  assert (v_state -> 'challenge' ->> 'supplied')::boolean, 'the match knows the squad was given';
  perform public.finish_match(v_match, 'b', 'completed');
  update public.challenges set is_active = true where id = current_setting('stage3.giza')::uuid;
end $$;

-- The leaderboard: the Giza challenge shows its winner; the given squad's does not show to players.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008c1", "role": "authenticated"}', true);
do $$
declare
  v_board jsonb;
begin
  v_board := public.get_challenge_leaderboard(current_setting('stage3.giza')::uuid);
  assert (v_board ->> 'players')::integer = 1 and (v_board -> 'me' ->> 'rank')::integer = 1
         and (v_board -> 'me' ->> 'wins')::integer = 1 and (v_board -> 'top' -> 0 ->> 'is_me')::boolean, v_board::text;
  begin
    perform public.get_challenge_leaderboard(current_setting('stage3.supplied')::uuid);
    raise exception 'ASSERT: a leaderboard switched off';
  exception when raise_exception then
    assert sqlerrm = 'challenge_leaderboard_off', sqlerrm;
  end;
end $$;
reset role;

-- The Emergenza a tema: drawn once, one run, the prize at the end, its leaderboard.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000008c1';
  v_challenge uuid := current_setting('stage3.emergency')::uuid;
  v_threats uuid[];
  v_squad uuid[];
  v_state jsonb;
  v_round integer;
begin
  assert (public.challenge_emergency_info(v_a, v_challenge) ->> 'threats')::integer = 8, 'eight threats to draw';
  v_threats := array(select t.id from public.threat_definitions t
                     where t.region = 'megara' and t.is_active and t.rarity_code is null order by t.level, t.id limit 8);
  perform public.challenge_emergency_ensure(v_challenge, v_threats);
  perform public.challenge_emergency_ensure(v_challenge, v_threats[2:8] || v_threats[1:1]);
  assert (select e.threat_ids from public.challenge_emergencies e where e.challenge_id = v_challenge) = v_threats,
    'the first draw stays for everyone';

  select (array_agg(i.id order by i.acquired_at, i.id))[1:8] into v_squad from public.card_instances i where i.owner_id = v_a and i.is_starter;
  perform public.challenge_emergency_start(v_a, v_challenge, v_squad);
  begin
    perform public.challenge_emergency_start(v_a, v_challenge, v_squad);
    raise exception 'ASSERT: a second run';
  exception when raise_exception then
    assert sqlerrm = 'challenge_emergency_already_played', sqlerrm;
  end;

  for v_round in 1..8 loop
    v_state := public.challenge_emergency_record_play(v_a, v_challenge, v_round, v_squad[v_round], 10, 0, 10, 1);
  end loop;
  assert v_state -> 'run' ->> 'status' = 'finished' and (v_state -> 'run' ->> 'passed')::integer = 8, v_state -> 'run' ->> 'status';
  assert v_state -> 'challenge' ->> 'id' = v_challenge::text, 'the state names its challenge';
  assert exists (select 1 from public.challenge_rewards r where r.challenge_id = v_challenge and r.user_id = v_a and r.tier = 1),
    'the prize target of one threat passed';
  assert (select k.wins from public.challenge_ranking(v_challenge) k where k.user_id = v_a) = 8, 'the run in the leaderboard';
  assert (public.challenge_payload((select c from public.challenges c where c.id = v_challenge), v_a) -> 'my_run' ->> 'passed')::integer = 8,
    'the player''s run in the challenge';
end $$;

rollback;
