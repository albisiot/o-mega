-- Integration test for the second stage of the Sfide a tema (SPEC §8.8): the new squad rules
-- (banned, only these, no starters, variant styles), the minimum level, every mode against a
-- bot (Grande Minaccia, Quadrante with its seal target), friendly online play (the challenge's
-- queue and friend codes, both squads checked), the prize targets of wins with their banner, the
-- challenge's row in Ricompense partite, the «challenge» filter of the daily objectives and the
-- banner «Nuova Sfida a tema!» once per player. Internal functions are called as the database
-- owner, as the Edge Function would with service_role. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

-- The Grande Minaccia table below is drawn with the default numbers (balance.ts).
update public.game_config c set value = to_jsonb(d.value)
from (values ('boss.hot_fronts', 2), ('boss.hot_value', 2), ('boss.hot_growth', 1), ('boss.base_value', 1)) as d(key, value)
where c.key = d.key;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000008b1', 'authenticated', 'authenticated', 'challenge2-a@example.test',
   '{"full_name": "Sfida2 A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000008b2', 'authenticated', 'authenticated', 'challenge2-b@example.test',
   '{"full_name": "Sfida2 B"}', now(), now()),
  ('00000000-0000-4000-8000-0000000008b3', 'authenticated', 'authenticated', 'challenge2-admin@example.test',
   '{"full_name": "Sfida2 Admin"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008b1", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008b2", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008b3", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000008b3');
update public.events set is_active = false where is_active;
update public.challenges set is_active = false where is_active;

-- The new rules: lists, styles, starters; and the objectives' filter.
do $$
declare
  v_code text;
  v_definition uuid;
  v_level_card uuid;
  v_rules jsonb;
begin
  select d.code, d.id into v_code, v_definition from public.card_definitions d
  where d.is_active and d.unlock_level is null order by d.code limit 1;

  v_rules := public.challenge_normalize_rules(jsonb_build_object('banned', jsonb_build_array(v_code), 'variant_styles', '["neon"]'::jsonb));
  assert v_rules -> 'variant_styles' = '[]'::jsonb, 'styles without a variant rule are dropped';
  assert v_rules ->> 'no_starters' = 'false', 'no_starters defaults to false';
  assert not public.challenge_admits(v_definition, v_rules), 'a banned character';

  v_rules := public.challenge_normalize_rules(jsonb_build_object('only', jsonb_build_array(v_code)));
  assert public.challenge_admits(v_definition, v_rules), 'the only character';
  assert (select c.admitted from public.challenge_admitted_counts(v_rules) c) = 1, 'one character admitted';

  select d.id into v_level_card from public.card_definitions d where d.is_active and d.unlock_level is not null limit 1;
  if v_level_card is not null then
    assert public.challenge_admits(v_level_card, public.challenge_normalize_rules('{}')), 'a level card by default';
    assert not public.challenge_admits(v_level_card, public.challenge_normalize_rules('{"no_starters": true}')),
      'no level card without starters';
  end if;

  begin
    perform public.challenge_normalize_rules('{"banned": ["ZZZ999"]}');
    raise exception 'ASSERT: an unknown character was accepted';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_rules', sqlerrm;
  end;
  begin
    perform public.challenge_normalize_rules('{"variant_styles": ["nessuno"], "min_variants": 1}');
    raise exception 'ASSERT: an unknown style was accepted';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_rules', sqlerrm;
  end;

  assert public.daily_objective_params_valid('matches_won', '{"challenge": true}'), 'the challenge filter';
  assert not public.daily_objective_params_valid('matches_won', '{"challenge": 1}'), 'a filter that is not a boolean';
  assert not public.daily_objective_params_valid('packs_opened', '{"challenge": true}'), 'no filter on packs';
end $$;

-- The admin: every mode, online, level, seal target and prize, each checked.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008b3", "role": "authenticated"}', true);

do $$
declare
  v_now timestamp := (now() at time zone 'Europe/Rome')::timestamp;
  v_payload jsonb;
  v_boss jsonb;
begin
  begin
    perform public.admin_save_challenge('Senza bot', '', '#ff7ad9', 'classic', '{}', true, '{}', v_now, v_now + interval '1 day');
    raise exception 'ASSERT: no bot and not online';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_bots', sqlerrm;
  end;
  begin
    perform public.admin_save_challenge('Sigilli', '', '#ff7ad9', 'classic', '{easy}', true, '{}', v_now, v_now + interval '1 day',
      p_quadrant_seal_target => 12);
    raise exception 'ASSERT: a seal target outside the Quadrante';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_seal_target', sqlerrm;
  end;
  begin
    perform public.admin_save_challenge('Premi', '', '#ff7ad9', 'boss', '{easy}', true, '{}', v_now, v_now + interval '1 day',
      p_tiers => '[{"wins": 3, "coins": 10}, {"wins": 2, "coins": 10}]');
    raise exception 'ASSERT: targets that do not grow';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_tiers', sqlerrm;
  end;
  begin
    perform public.admin_save_challenge('Premi', '', '#ff7ad9', 'boss', '{easy}', true, '{}', v_now, v_now + interval '1 day',
      p_tiers => '[{"wins": 1}]');
    raise exception 'ASSERT: a target without a reward';
  exception when raise_exception then
    assert sqlerrm = 'challenge_tier_no_reward', sqlerrm;
  end;
  begin
    perform public.admin_save_challenge('Livello', '', '#ff7ad9', 'boss', '{easy}', true, '{}', v_now, v_now + interval '1 day',
      p_min_level => 0);
    raise exception 'ASSERT: a level 0';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_level', sqlerrm;
  end;

  -- Grande Minaccia against Facile, with two targets: 1 win 30 coins, 2 wins a pack.
  v_payload := public.admin_save_challenge('Minaccia a tema', '', '#ff8a00', 'boss', '{easy}', true, '{}',
    v_now - interval '10 minutes', v_now + interval '1 day',
    p_tiers => '[{"wins": 1, "coins": 30}, {"wins": 2, "packs": 1}]');
  v_boss := (select c from jsonb_array_elements(v_payload -> 'challenges') as c where c ->> 'format' = 'boss');
  assert jsonb_array_length(v_boss -> 'tiers') = 2 and (v_boss -> 'tiers' -> 1 ->> 'wins')::integer = 2, v_boss::text;
  perform set_config('stage2.boss', v_boss ->> 'id', true);

  -- Quadrante with a seal target; Allarme Triplo online only, without starters; Classica from level 50.
  v_payload := public.admin_save_challenge('Quadrante a tema', '', '#16c8ff', 'quadrant', '{easy}', true, '{}',
    v_now - interval '10 minutes', v_now + interval '1 day', p_quadrant_seal_target => 12);
  perform set_config('stage2.quadrant', (select c ->> 'id' from jsonb_array_elements(v_payload -> 'challenges') as c
                                         where c ->> 'format' = 'quadrant'), true);
  v_payload := public.admin_save_challenge('Triplo online', '', '#7dffb0', 'triple', '{}', true, '{}',
    v_now - interval '10 minutes', v_now + interval '1 day', p_online => true);
  perform set_config('stage2.triple', (select c ->> 'id' from jsonb_array_elements(v_payload -> 'challenges') as c
                                       where c ->> 'format' = 'triple'), true);
  v_payload := public.admin_save_challenge('Classica per esperti', '', '#c9a0ff', 'classic', '{easy}', true, '{}',
    v_now - interval '10 minutes', v_now + interval '1 day', p_min_level => 50);
  perform set_config('stage2.classic', (select c ->> 'id' from jsonb_array_elements(v_payload -> 'challenges') as c
                                        where c ->> 'format' = 'classic'), true);
  assert jsonb_array_length(v_payload -> 'cards') > 0 and jsonb_array_length(v_payload -> 'variant_styles') > 0,
    'the cards and styles the form picks from';
end $$;

-- Players: the banner «Nuova Sfida a tema!» once, only for the challenges they can play.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008b1", "role": "authenticated"}', true);
do $$
declare
  v_list jsonb := public.get_challenges();
  v_boss jsonb := (select c from jsonb_array_elements(v_list -> 'challenges') as c where c ->> 'id' = current_setting('stage2.boss'));
begin
  perform public.get_challenges();
  assert (select count(*) from public.get_player_notifications() as n, jsonb_array_elements(n) as e
          where e ->> 'kind' = 'challenge') = 3, 'three banners (the Classica asks level 50), each once';
  assert (v_boss ->> 'my_wins')::integer = 0 and jsonb_array_length(v_boss -> 'tiers') = 2, v_boss::text;
  assert (v_boss ->> 'my_level')::integer = 1, 'the player''s level';
end $$;
reset role;

-- Against a bot: the minimum level, the Grande Minaccia with its prize, the Quadrante with its seal target.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000008b1';
  v_starters uuid[];
  v_bots uuid[];
  v_match uuid;
  v_row public.matches;
begin
  select array_agg(i.id order by i.acquired_at, i.id) into v_starters from public.card_instances i where i.owner_id = v_a and i.is_starter;
  select array_agg(id) into v_bots from (
    select d.id from public.card_definitions d where d.is_active and d.unlock_level is null order by d.code limit 10
  ) s;
  assert cardinality(v_starters) = 10 and cardinality(v_bots) = 10, 'test cards';

  begin
    perform public.challenge_create_bot_match(v_a, current_setting('stage2.classic')::uuid, 'easy', v_starters[1:5], v_bots[1:5]);
    raise exception 'ASSERT: a level 1 player in a level 50 challenge';
  exception when raise_exception then
    assert sqlerrm = 'challenge_level_too_low', sqlerrm;
  end;

  v_match := public.challenge_create_bot_match(v_a, current_setting('stage2.boss')::uuid, 'easy', v_starters[1:5], v_bots[1:5], null,
    '[[2,2,1,1,1],[1,1,3,3,1],[4,1,1,1,4],[1,5,5,1,1],[1,1,1,6,6]]');
  select * into v_row from public.matches where id = v_match;
  assert v_row.format = 'boss' and v_row.challenge_id = current_setting('stage2.boss')::uuid, 'a Grande Minaccia of the challenge';
  assert public.match_reward_mode(v_row) = 'challenge', 'the challenge''s row in Ricompense partite';
  assert exists (select 1 from public.match_reward_rules where mode_key = 'challenge'), 'its rows exist';
  perform public.finish_match(v_match, 'a', 'completed');
  select * into v_row from public.matches where id = v_match;
  assert public.daily_objective_match_amount('matches_won', '{"challenge": true}', v_row, 'a') = 1, 'a challenge win counts';
  v_row.challenge_id := null;
  assert public.daily_objective_match_amount('matches_won', '{"challenge": true}', v_row, 'a') = 0, 'another win does not';

  -- The first win pays the first target, once, with its banner.
  assert (select tier from public.challenge_rewards where user_id = v_a) = 1, 'first target';
  assert (select sum(amount) from public.coin_ledger where user_id = v_a and reason = 'challenge_reward') = 30, 'its coins';
  assert exists (select 1 from public.player_notifications where user_id = v_a and kind = 'challenge_reward'), 'its banner';

  -- An abandoned match does not count; the second win pays the pack.
  v_match := public.challenge_create_bot_match(v_a, current_setting('stage2.boss')::uuid, 'easy', v_starters[1:5], v_bots[1:5], null,
    '[[2,2,1,1,1],[1,1,3,3,1],[4,1,1,1,4],[1,5,5,1,1],[1,1,1,6,6]]');
  perform public.finish_match(v_match, 'a', 'forfeit');
  assert (select count(*) from public.challenge_rewards where user_id = v_a) = 1, 'an abandoned win paid';
  v_match := public.challenge_create_bot_match(v_a, current_setting('stage2.boss')::uuid, 'easy', v_starters[1:5], v_bots[1:5], null,
    '[[2,2,1,1,1],[1,1,3,3,1],[4,1,1,1,4],[1,5,5,1,1],[1,1,1,6,6]]');
  perform public.finish_match(v_match, 'a', 'completed');
  assert (select cardinality(opening_ids) from public.challenge_rewards where user_id = v_a and tier = 2) = 1, 'the pack of the second target';

  v_match := public.challenge_create_bot_match(v_a, current_setting('stage2.quadrant')::uuid, 'easy', v_starters, v_bots);
  select * into v_row from public.matches where id = v_match;
  assert v_row.format = 'quadrant' and v_row.quadrant_seal_target = 12, 'the Quadrante has the seal target';
  perform public.finish_match(v_match, 'b', 'forfeit');
end $$;

-- Online: the challenge's queue pairs its players; the friend code makes a challenge match too.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000008b1';
  v_b uuid := '00000000-0000-4000-8000-0000000008b2';
  v_triple uuid := current_setting('stage2.triple')::uuid;
  v_deck_a uuid[];
  v_deck_b uuid[];
  v_match uuid;
begin
  select (array_agg(i.id order by i.acquired_at, i.id))[1:9] into v_deck_a from public.card_instances i where i.owner_id = v_a and i.is_starter;
  select (array_agg(i.id order by i.acquired_at, i.id))[1:9] into v_deck_b from public.card_instances i where i.owner_id = v_b and i.is_starter;

  begin
    perform public.challenge_queue_join(v_a, current_setting('stage2.boss')::uuid, v_deck_a[1:5]);
    raise exception 'ASSERT: a queue in a challenge without online play';
  exception when raise_exception then
    assert sqlerrm = 'challenge_online_not_allowed', sqlerrm;
  end;

  assert public.challenge_queue_join(v_a, v_triple, v_deck_a) is null, 'A waits';
  assert exists (select 1 from public.challenge_queue where user_id = v_a and challenge_id = v_triple), 'A is in the queue';
  v_match := public.challenge_queue_join(v_b, v_triple, v_deck_b);
  assert v_match is not null, 'B is paired with A';
  assert (select player_a = v_a and player_b = v_b and format = 'triple' and challenge_id = v_triple
          from public.matches where id = v_match), 'a challenge match between the two';
  assert exists (select 1 from public.challenge_match_terms where match_id = v_match), 'its rules copied';
  assert not exists (select 1 from public.challenge_queue where user_id in (v_a, v_b)), 'both left the queue';
  perform public.finish_match(v_match, 'a', 'forfeit');
  assert public.challenge_plays_today(v_b, v_triple) = 1, 'the guest''s match counts for the day';
end $$;

-- Leaving a queue leaves the challenge's queue too; a friend code knows its challenge.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008b1", "role": "authenticated"}', true);
do $$
declare
  v_deck uuid[];
  v_lobby jsonb;
begin
  select (array_agg(i.id order by i.acquired_at, i.id))[1:9] into v_deck
  from public.card_instances i where i.owner_id = auth.uid() and i.is_starter;
  v_lobby := public.create_challenge_lobby(current_setting('stage2.triple')::uuid, v_deck);
  assert v_lobby ->> 'challenge_id' = current_setting('stage2.triple') and v_lobby ->> 'format' = 'triple', v_lobby::text;
  perform set_config('stage2.code', v_lobby ->> 'code', true);
  begin
    perform public.create_challenge_lobby(current_setting('stage2.boss')::uuid, v_deck[1:5]);
    raise exception 'ASSERT: a friend code in a challenge without online play';
  exception when raise_exception then
    assert sqlerrm = 'challenge_online_not_allowed', sqlerrm;
  end;
end $$;

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008b2", "role": "authenticated"}', true);
do $$
begin
  assert public.get_lobby_challenge(current_setting('stage2.code')) = current_setting('stage2.triple')::uuid, 'the code''s challenge';
end $$;
reset role;

do $$
declare
  v_b uuid := '00000000-0000-4000-8000-0000000008b2';
  v_deck uuid[];
  v_match uuid;
begin
  select (array_agg(i.id order by i.acquired_at, i.id))[1:9] into v_deck from public.card_instances i where i.owner_id = v_b and i.is_starter;
  v_match := public.match_join_lobby(v_b, current_setting('stage2.code'), v_deck, null, null);
  assert (select challenge_id = current_setting('stage2.triple')::uuid and player_b = v_b from public.matches where id = v_match),
    'the friend code made a challenge match';
  perform public.finish_match(v_match, 'b', 'forfeit');

  -- Queued, then gone with leave_queue.
  perform public.challenge_queue_join(v_b, current_setting('stage2.triple')::uuid, v_deck);
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008b2", "role": "authenticated"}', true);
select public.leave_queue();
reset role;

do $$
begin
  assert not exists (select 1 from public.challenge_queue where user_id = '00000000-0000-4000-8000-0000000008b2'), 'left the queue';
end $$;

-- Without starters, a squad of starters is refused before it waits.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008b3", "role": "authenticated"}', true);
do $$
declare
  v_now timestamp := (now() at time zone 'Europe/Rome')::timestamp;
  v_payload jsonb;
begin
  v_payload := public.admin_save_challenge('Senza starter', '', '#ffd60a', 'quadrant_shifting', '{}', true, '{"no_starters": true}',
    v_now - interval '10 minutes', v_now + interval '1 day', p_online => true);
  perform set_config('stage2.shifting', (select c ->> 'id' from jsonb_array_elements(v_payload -> 'challenges') as c
                                         where c ->> 'format' = 'quadrant_shifting'), true);
end $$;
reset role;

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000008b1';
  v_deck uuid[];
begin
  select array_agg(i.id order by i.acquired_at, i.id) into v_deck from public.card_instances i where i.owner_id = v_a and i.is_starter;
  begin
    perform public.challenge_queue_join(v_a, current_setting('stage2.shifting')::uuid, v_deck);
    raise exception 'ASSERT: starters in a challenge without starters';
  exception when raise_exception then
    assert sqlerrm = 'challenge_starter_not_allowed', sqlerrm;
  end;
end $$;

rollback;
