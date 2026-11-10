-- Integration test for daily objectives (SPEC §8.3): the server draws them on the
-- first call of the game day, progress comes only from what the database records
-- (matches, Emergenza, packs, conversions, conquests), abandoned matches count for
-- nobody, a reward is paid once and only during its day, and swaps are limited.
-- The service-only functions are called as the database owner, as the Edge
-- Function would with service_role. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000d1', 'authenticated', 'authenticated', 'objectives-a@example.test',
   '{"full_name": "Obiettivi A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000d2', 'authenticated', 'authenticated', 'objectives-b@example.test',
   '{"full_name": "Obiettivi B"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000d2", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000d1", "role": "authenticated"}', true);
select public.bootstrap_player();

-- A player reads no table and calls no internal function.
do $$
begin
  begin
    perform count(*) from public.daily_objectives;
    raise exception 'ASSERT: a player read the objectives';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.daily_objective_definitions;
    raise exception 'ASSERT: a player read the catalog';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.advance_daily_objectives(auth.uid(), 'matches_won', 100);
    raise exception 'ASSERT: a player advanced their own objectives';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.ensure_daily_objectives(auth.uid());
    raise exception 'ASSERT: a player drew objectives';
  exception when insufficient_privilege then null;
  end;
end $$;

-- First call of the day: one objective per difficulty, nothing done, 3 swaps.
do $$
declare
  v_payload jsonb := public.get_daily_objectives();
  v_again jsonb := public.get_daily_objectives();
begin
  assert jsonb_array_length(v_payload -> 'objectives') = 3, format('objectives %s', v_payload);
  assert (select array_agg(o ->> 'difficulty' order by (o ->> 'slot')::integer)
          from jsonb_array_elements(v_payload -> 'objectives') o) = array['easy', 'medium', 'hard'], 'difficulties';
  assert (v_payload ->> 'refreshes_left')::integer = 3, 'refreshes left';
  assert (v_payload ->> 'day')::date = (now() at time zone 'Europe/Rome')::date, 'game day';
  assert not exists (select 1 from jsonb_array_elements(v_payload -> 'objectives') o
                     where (o ->> 'progress')::integer <> 0 or (o ->> 'completed')::boolean or (o ->> 'claimed')::boolean),
    'a new objective is not done';
  assert v_again -> 'objectives' = v_payload -> 'objectives', 'a second call draws again';
end $$;

-- Swaps: same difficulty and slot, never an objective already offered today, 3 at most.
do $$
declare
  v_payload jsonb := public.get_daily_objectives();
  v_easy jsonb;
  v_seen text[] := '{}';
  v_last_id uuid;
begin
  select o into v_easy from jsonb_array_elements(v_payload -> 'objectives') o where (o ->> 'slot')::integer = 1;
  v_seen := array[v_easy ->> 'code'];
  v_last_id := (v_easy ->> 'id')::uuid;
  for i in 1..3 loop
    v_payload := public.refresh_daily_objective(v_last_id);
    select o into v_easy from jsonb_array_elements(v_payload -> 'objectives') o where (o ->> 'slot')::integer = 1;
    assert v_easy ->> 'difficulty' = 'easy', 'a swap changed the difficulty';
    assert not (v_easy ->> 'code' = any (v_seen)), format('objective %s offered twice', v_easy ->> 'code');
    assert (v_payload ->> 'refreshes_left')::integer = 3 - i, 'refreshes left after a swap';
    assert jsonb_array_length(v_payload -> 'objectives') = 3, 'a swap changed the number of objectives';
    v_seen := v_seen || (v_easy ->> 'code');
    begin
      perform public.claim_daily_objective(v_last_id);
      raise exception 'ASSERT: a swapped objective was claimed';
    exception when raise_exception then
      if sqlerrm like 'ASSERT:%' then raise; end if;
      assert sqlerrm = 'objective_not_found', sqlerrm;
    end;
    v_last_id := (v_easy ->> 'id')::uuid;
  end loop;
  begin
    perform public.refresh_daily_objective(v_last_id);
    raise exception 'ASSERT: a fourth swap was accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'no_refreshes_left', sqlerrm;
  end;
end $$;

-- B draws too; A cannot touch B's objectives.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000d2", "role": "authenticated"}', true);
select public.get_daily_objectives();
reset role;
select set_config('test.b_objective', (select id::text from public.daily_objectives
  where user_id = '00000000-0000-4000-8000-0000000000d2' and slot = 1 and replaced_at is null), true);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000d1", "role": "authenticated"}', true);
do $$
begin
  begin
    perform public.refresh_daily_objective(current_setting('test.b_objective')::uuid);
    raise exception 'ASSERT: A swapped an objective of B';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'objective_not_found', sqlerrm;
  end;
  begin
    perform public.claim_daily_objective(current_setting('test.b_objective')::uuid);
    raise exception 'ASSERT: A claimed an objective of B';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'objective_not_found', sqlerrm;
  end;
end $$;
reset role;

-- Catalog checks: unknown filters and level-unlock reward cards are refused.
do $$
begin
  begin
    insert into public.daily_objective_definitions (code, title, difficulty, metric, params, target)
    values ('test_bad_params', 'Prova', 'easy', 'packs_opened', '{"faction": "villains"}', 1);
    raise exception 'ASSERT: a filter the metric does not understand was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.daily_objective_definitions (code, title, difficulty, metric, params, target, coins, card_definition_ids, card_variant_ids)
    select 'test_unlock_card', 'Prova', 'easy', 'packs_opened', '{}', 1, 0, array[id], array[null::uuid]
    from public.card_definitions where unlock_level is not null limit 1;
    if found then
      raise exception 'ASSERT: a level-unlock reward card was accepted';
    end if;
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'invalid_objective_cards', sqlerrm;
  end;
end $$;

-- A swap with nothing left to draw changes nothing and uses no swap.
do $$
declare
  v_b uuid := '00000000-0000-4000-8000-0000000000d2';
  v_objective public.daily_objectives;
begin
  select * into v_objective from public.daily_objectives where user_id = v_b and slot = 1 and replaced_at is null;
  update public.daily_objective_definitions set is_active = false where difficulty = 'easy' and code <> v_objective.definition_code;
  perform set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', v_b), true);
  begin
    perform public.refresh_daily_objective(v_objective.id);
    raise exception 'ASSERT: a swap without objectives left was accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'no_objective_available', sqlerrm;
  end;
  assert (select replaced_at from public.daily_objectives where id = v_objective.id) is null, 'the failed swap replaced the objective';
  assert (select refreshes from public.daily_objective_days where user_id = v_b and day = public.game_day()) = 0, 'the failed swap was counted';
  update public.daily_objective_definitions set is_active = true where difficulty = 'easy';
end $$;

-- Fixtures for B's progress: a chosen set of objectives replaces the drawn one,
-- plus test definitions (5 packs to open, a card reward).
insert into public.daily_objective_definitions (code, title, difficulty, metric, params, target, coins, packs, card_definition_ids, card_variant_ids)
values ('test_open_five', 'Apri 5 pacchetti', 'easy', 'packs_opened', '{}', 5, null, 0, '{}', '{}');
insert into public.daily_objective_definitions (code, title, difficulty, metric, params, target, coins, packs, card_definition_ids, card_variant_ids)
select 'test_card_reward', 'Premio carta', 'easy', 'packs_opened', '{}', 1, 0, 0, array[id], array[null::uuid]
from public.card_definitions where is_active and unlock_level is null and rarity_code = 'gamma' order by code limit 1;

delete from public.daily_objectives where user_id = '00000000-0000-4000-8000-0000000000d2';
insert into public.daily_objectives (user_id, day, slot, definition_code, difficulty, title, metric, params, target,
  coins, packs, card_definition_ids, card_variant_ids)
select '00000000-0000-4000-8000-0000000000d2', public.game_day(), row_number() over (order by d.code), d.code, d.difficulty,
  d.title, d.metric, d.params, d.target,
  coalesce(d.coins, public.config_int('daily_objectives.reward_coins.' || d.difficulty)), d.packs,
  d.card_definition_ids, d.card_variant_ids
from public.daily_objective_definitions d
where d.code in ('play_matches', 'win_matches', 'win_hard_bots', 'win_flawless', 'threats_6', 'villain_threats',
                 'delta_threats', 'play_beta_cards', 'win_online', 'win_triple', 'emergency_3', 'convert_duplicates',
                 'conquer_card', 'test_open_five');

create function pg_temp.progress(p_code text) returns integer language sql as $$
  select progress from public.daily_objectives
  where user_id = '00000000-0000-4000-8000-0000000000d2' and day = public.game_day()
    and definition_code = p_code and replaced_at is null
$$;

create function pg_temp.play(p_instance uuid, p_definition uuid, p_score integer)
returns jsonb language sql as $$
  select jsonb_build_object('card_instance_id', p_instance, 'definition_id', p_definition,
    'base', p_score, 'bonus', 0, 'score', p_score, 'highest', least(p_score, 10), 'auto_played', false)
$$;

-- A classic match against a Difficile bot, won 3-0 with three starter (Delta) cards.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000d1';
  v_b uuid := '00000000-0000-4000-8000-0000000000d2';
  v_team uuid[];
  v_defs uuid[];
  v_bot uuid[];
  v_threats uuid[];
  v_match uuid;
  v_villains integer;
  v_levels integer[];
begin
  select array_agg(id order by acquired_at, id), array_agg(definition_id order by acquired_at, id) into v_team, v_defs from (
    select id, definition_id, acquired_at from public.card_instances
    where owner_id = v_b and is_starter order by acquired_at, id limit 5
  ) s;
  select array_agg(id order by code) into v_bot from (
    select id, code from public.card_definitions where rarity_code in ('beta', 'alfa') order by code limit 5
  ) s;
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions
    where level = l.level and region = 'megara'
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;

  v_match := public.match_create_bot(v_b, 'hard', v_team, v_bot, v_threats);
  perform public.match_record_round(v_match, 1, pg_temp.play(v_team[1], v_defs[1], 30), pg_temp.play(null, v_bot[1], 1), 'a', null);
  perform public.match_record_round(v_match, 2, pg_temp.play(v_team[2], v_defs[2], 30), pg_temp.play(null, v_bot[2], 1), 'a', null);
  perform public.match_record_round(v_match, 3, pg_temp.play(v_team[3], v_defs[3], 30), pg_temp.play(null, v_bot[3], 1), 'a', 'a');
  assert (select status from public.matches where id = v_match) = 'finished', 'match not finished';

  select count(*) into v_villains from public.card_definitions where id = any (v_defs[1:3]) and faction = 'villains';
  assert pg_temp.progress('play_matches') = 1, 'play_matches';
  assert pg_temp.progress('win_matches') = 1, 'win_matches';
  assert pg_temp.progress('win_hard_bots') = 1, 'win_hard_bots';
  assert pg_temp.progress('win_flawless') = 1, 'win_flawless';
  assert pg_temp.progress('threats_6') = 3, format('threats_6 %s', pg_temp.progress('threats_6'));
  assert pg_temp.progress('delta_threats') = 2, 'delta_threats stops at its target';
  assert pg_temp.progress('villain_threats') = least(v_villains, 3), 'villain_threats';
  assert pg_temp.progress('play_beta_cards') = 0, 'starter cards are not Beta';
  assert pg_temp.progress('win_online') = 0, 'a bot is not a player';
  assert pg_temp.progress('win_triple') = 0, 'a classic match is not Allarme Triplo';
  assert (select completed_at is not null from public.daily_objectives
          where user_id = v_b and definition_code = 'win_flawless'), 'win_flawless completed';

  -- An abandoned match counts for nobody, not even the winner.
  select array_agg(level) into v_levels from public.threat_definitions where id = any (v_threats);
  insert into public.matches (mode, bot_difficulty, player_a, threat_ids, threat_levels)
  values ('bot', 'hard', v_b, v_threats, v_levels) returning id into v_match;
  perform public.finish_match(v_match, 'a', 'forfeit');
  assert pg_temp.progress('play_matches') = 1, 'a forfeit counted';
  assert pg_temp.progress('win_matches') = 1, 'a forfeit win counted';

  -- Online against A: a draw, then a win.
  insert into public.matches (mode, player_a, player_b, threat_ids, threat_levels)
  values ('friendly', v_a, v_b, v_threats, v_levels) returning id into v_match;
  perform public.finish_match(v_match, 'draw', 'completed');
  assert pg_temp.progress('play_matches') = 2, 'play_matches after a draw';
  assert pg_temp.progress('win_online') = 0, 'a draw is not a win';
  insert into public.matches (mode, player_a, player_b, threat_ids, threat_levels)
  values ('friendly', v_a, v_b, v_threats, v_levels) returning id into v_match;
  perform public.finish_match(v_match, 'b', 'completed');
  assert pg_temp.progress('win_online') = 1, 'win_online';
  assert pg_temp.progress('win_matches') = 2, 'win_matches after the online win';
  assert pg_temp.progress('win_hard_bots') = 1, 'an online win is not a bot win';
end $$;

-- Emergenza: only passed threats count.
do $$
declare
  v_b uuid := '00000000-0000-4000-8000-0000000000d2';
  v_threats uuid[];
  v_cards uuid[];
  v_definitions uuid[];
begin
  select array_agg(id) into v_threats from (select id from public.threat_definitions order by code limit 8) t;
  select array_agg(id order by id), array_agg(definition_id order by id) into v_cards, v_definitions
  from (select distinct on (definition_id) id, definition_id from public.card_instances
        where owner_id = v_b order by definition_id, id limit 8) c;
  insert into public.emergency_days (day, threat_ids, threat_levels)
  values (public.game_day(), v_threats, array[1, 2, 3, 4, 5, 6, 1, 2])
  on conflict do nothing;
  insert into public.emergency_runs (user_id, day, card_instance_ids, definition_ids)
  values (v_b, public.game_day(), v_cards, v_definitions);
  perform public.emergency_record_play(v_b, 1, v_cards[1], 10, 0, 10, 7);
  perform public.emergency_record_play(v_b, 2, v_cards[2], 3, 0, 3, 13);
  perform public.emergency_record_play(v_b, 3, v_cards[3], 20, 0, 20, 18);
  assert pg_temp.progress('emergency_3') = 2, format('emergency_3 %s', pg_temp.progress('emergency_3'));
end $$;

-- Packs, duplicates and a conquered card.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000d1';
  v_b uuid := '00000000-0000-4000-8000-0000000000d2';
  v_definition uuid;
  v_instance uuid;
begin
  perform public.open_pack(v_b, 'standard');
  assert pg_temp.progress('test_open_five') = 1, 'packs_opened';

  -- Three copies of a character B did not have: two are duplicates.
  select id into v_definition from public.card_definitions d
  where d.is_active and d.unlock_level is null and d.rarity_code = 'gamma'
    and not exists (select 1 from public.card_instances i where i.owner_id = v_b and i.definition_id = d.id)
  order by code limit 1;
  insert into public.card_instances (definition_id, owner_id, acquired_via)
  select v_definition, v_b, 'pack' from generate_series(1, 3);
  perform set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', v_b), true);
  perform public.convert_duplicates(v_definition, 2);
  assert pg_temp.progress('convert_duplicates') = 2, format('convert_duplicates %s', pg_temp.progress('convert_duplicates'));

  -- A card of A moves to B by conquest.
  select id into v_instance from public.card_instances where owner_id = v_a and not is_starter limit 1;
  if v_instance is null then
    insert into public.card_instances (definition_id, owner_id, acquired_via)
    values (v_definition, v_a, 'pack') returning id into v_instance;
  end if;
  update public.card_instances set owner_id = v_b, acquired_via = 'conquest' where id = v_instance;
  insert into public.card_transfers (instance_id, from_user, to_user, reason) values (v_instance, v_a, v_b, 'conquest');
  assert pg_temp.progress('conquer_card') = 1, 'cards_conquered';
end $$;

-- Claims: once, only when completed, paid through the ledgers; a reward pack is not a pack opened.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000d2", "role": "authenticated"}', true);
do $$
declare
  v_b uuid := '00000000-0000-4000-8000-0000000000d2';
  v_flawless uuid;
  v_conquer uuid;
  v_triple uuid;
  v_result jsonb;
  v_payload jsonb := public.get_daily_objectives();
begin
  select (o ->> 'id')::uuid into v_flawless from jsonb_array_elements(v_payload -> 'objectives') o where o ->> 'code' = 'win_flawless';
  select (o ->> 'id')::uuid into v_conquer from jsonb_array_elements(v_payload -> 'objectives') o where o ->> 'code' = 'conquer_card';
  select (o ->> 'id')::uuid into v_triple from jsonb_array_elements(v_payload -> 'objectives') o where o ->> 'code' = 'win_triple';
  assert v_flawless is not null and v_conquer is not null and v_triple is not null, 'fixture objectives missing';

  v_result := public.claim_daily_objective(v_flawless);
  assert (v_result ->> 'coins')::integer = 60, format('hard coins %s', v_result);
  assert jsonb_array_length(v_result -> 'opening_ids') = 0, 'coins only';
  begin
    perform public.claim_daily_objective(v_flawless);
    raise exception 'ASSERT: an objective was paid twice';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'objective_already_claimed', sqlerrm;
  end;
  begin
    perform public.claim_daily_objective(v_triple);
    raise exception 'ASSERT: an objective not completed was paid';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'objective_not_completed', sqlerrm;
  end;
  begin
    perform public.refresh_daily_objective(v_flawless);
    raise exception 'ASSERT: a completed objective was swapped';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'objective_already_completed', sqlerrm;
  end;

  v_result := public.claim_daily_objective(v_conquer);
  assert jsonb_array_length(v_result -> 'opening_ids') = 1, format('one reward pack %s', v_result);

  v_payload := public.get_daily_objectives();
  assert (select (o ->> 'claimed')::boolean from jsonb_array_elements(v_payload -> 'objectives') o
          where o ->> 'code' = 'win_flawless'), 'claimed flag';
  assert (select jsonb_array_length(o -> 'opening_ids') from jsonb_array_elements(v_payload -> 'objectives') o
          where o ->> 'code' = 'conquer_card') = 1, 'reward openings in the payload';
end $$;
reset role;

do $$
declare
  v_b uuid := '00000000-0000-4000-8000-0000000000d2';
begin
  assert pg_temp.progress('test_open_five') = 1, 'a reward pack counted as a pack opened';
  assert (select count(*) from public.coin_ledger where user_id = v_b and reason = 'objective_reward') = 1, 'one ledger row';
  assert (select amount from public.coin_ledger l join public.daily_objectives o on o.id = l.ref_id
          where l.user_id = v_b and l.reason = 'objective_reward' and o.definition_code = 'win_flawless') = 60, 'ledger amount';
  assert public.coin_balance(v_b) = (select coalesce(sum(amount), 0) from public.coin_ledger where user_id = v_b), 'balance from ledger';
end $$;

-- A card reward: a normal copy, through card_transfers, shown as an opening.
do $$
declare
  v_b uuid := '00000000-0000-4000-8000-0000000000d2';
  v_id uuid;
  v_result jsonb;
begin
  insert into public.daily_objectives (user_id, day, slot, definition_code, difficulty, title, metric, params, target,
    progress, completed_at, coins, packs, card_definition_ids, card_variant_ids)
  select v_b, public.game_day(), 20, d.code, d.difficulty, d.title, d.metric, d.params, d.target, d.target, now(),
    0, 0, d.card_definition_ids, d.card_variant_ids
  from public.daily_objective_definitions d where d.code = 'test_card_reward'
  returning id into v_id;
  perform set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', v_b), true);
  v_result := public.claim_daily_objective(v_id);
  assert (select pack_type from public.pack_openings where id = (v_result -> 'opening_ids' ->> 0)::uuid) = 'objective', 'card opening';
  assert (select count(*) from public.card_transfers t join public.card_instances i on i.id = t.instance_id
          where t.to_user = v_b and t.reason = 'objective' and i.acquired_via = 'objective') = 1, 'card transfer';

  -- Yesterday's objective cannot be paid any more.
  insert into public.daily_objective_days (user_id, day) values (v_b, public.game_day() - 1);
  insert into public.daily_objectives (user_id, day, slot, definition_code, difficulty, title, metric, params, target,
    progress, completed_at, coins, packs)
  select v_b, public.game_day() - 1, 1, d.code, d.difficulty, d.title, d.metric, d.params, d.target, d.target, now(), 40, 0
  from public.daily_objective_definitions d where d.code = 'win_matches'
  returning id into v_id;
  begin
    perform public.claim_daily_objective(v_id);
    raise exception 'ASSERT: yesterday''s objective was paid';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'objective_expired', sqlerrm;
  end;
end $$;

rollback;
