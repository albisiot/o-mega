-- Integration test for timed events: only admins manage them, the end of a
-- match and each Emergenza threat passed earn points within the event's limits,
-- abandoned matches earn nothing, and every target pays once. The service-only
-- functions are called as the database owner, as the Edge Function would with
-- service_role. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated', 'event-admin@example.test',
   '{"full_name": "Evento Admin"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000f2', 'authenticated', 'authenticated', 'event-a@example.test',
   '{"full_name": "Evento A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000f3', 'authenticated', 'authenticated', 'event-b@example.test',
   '{"full_name": "Evento B"}', now(), now());

-- Another event running in the real database would take the matches below.
update public.events set is_active = false where is_active;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f3", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f2", "role": "authenticated"}', true);
select public.bootstrap_player();

-- A player manages nothing and reads no table.
do $$
begin
  begin
    perform public.admin_list_events();
    raise exception 'ASSERT: a player listed the events';
  exception when insufficient_privilege then
    assert sqlerrm = 'not_admin', sqlerrm;
  end;
  begin
    perform public.admin_save_event('Furbo', '', now()::timestamp,
    (now() + interval '1 day')::timestamp, '{}', '[{"points": 1, "coins": 1000}]', null, null);
    raise exception 'ASSERT: a player created an event';
  exception when insufficient_privilege then
    assert sqlerrm = 'not_admin', sqlerrm;
  end;
  begin
    perform public.admin_delete_event(gen_random_uuid());
    raise exception 'ASSERT: a player deleted an event';
  exception when insufficient_privilege then
    assert sqlerrm = 'not_admin', sqlerrm;
  end;
  begin
    perform count(*) from public.events;
    raise exception 'ASSERT: a player read the events';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.event_points;
    raise exception 'ASSERT: a player read the event points';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.award_event_points(auth.uid(), 'bot', 'win', gen_random_uuid(), 0, null, null);
    raise exception 'ASSERT: a player gave themselves points';
  exception when insufficient_privilege then null;
  end;
  assert (public.get_event() -> 'event') = 'null'::jsonb, 'an event with none scheduled';
end $$;

reset role;
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000000f1');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);

-- The admin's checks, then the event used below (starts tomorrow, Rome time).
do $$
declare
  v_rome timestamp := now() at time zone 'Europe/Rome';
  v_points jsonb := '{"friendly": {"win": 30, "draw": 15, "loss": 10}, "conquest": {"win": 40, "draw": 20, "loss": 15},
                      "bot": {"win": 10, "draw": 5, "loss": 3}, "story": {"win": 10, "draw": 5, "loss": 3},
                      "emergency": {"passed": 5}}';
  v_variant text;
  v_list jsonb;
  v_event jsonb;
  v_tiers jsonb;
begin
  select d.code || ':' || v.style into v_variant
  from public.card_variants v join public.card_definitions d on d.id = v.definition_id
  where v.is_active and d.is_active and d.unlock_level is null
  order by d.code, v.style limit 1;

  begin
    perform public.admin_save_event('Passato', '', v_rome - interval '2 days',
    v_rome - interval '1 day', v_points, '[{"points": 10, "coins": 10}]', null, null);
    raise exception 'ASSERT: an event already over was created';
  exception when raise_exception then
    assert sqlerrm = 'event_invalid_period', sqlerrm;
  end;
  begin
    perform public.admin_save_event('Al contrario', '', v_rome + interval '2 days',
    v_rome + interval '1 day', v_points, '[{"points": 10, "coins": 10}]', null, null);
    raise exception 'ASSERT: an event ending before it starts was created';
  exception when raise_exception then
    assert sqlerrm = 'event_invalid_period', sqlerrm;
  end;
  begin
    perform public.admin_save_event('Traguardi', '', v_rome + interval '1 day',
    v_rome + interval '2 days', v_points, '[{"points": 50, "coins": 10}, {"points": 50, "coins": 20}]', null, null);
    raise exception 'ASSERT: two targets with the same points';
  exception when raise_exception then
    assert sqlerrm = 'event_invalid_tiers', sqlerrm;
  end;
  begin
    perform public.admin_save_event('Vuoto', '', v_rome + interval '1 day',
    v_rome + interval '2 days', v_points, '[{"points": 50}]', null, null);
    raise exception 'ASSERT: a target without a reward';
  exception when raise_exception then
    assert sqlerrm = 'event_tier_no_reward', sqlerrm;
  end;
  begin
    perform public.admin_save_event('Carta', '', v_rome + interval '1 day',
    v_rome + interval '2 days', v_points, '[{"points": 50, "cards": ["NOPE"]}]', null, null);
    raise exception 'ASSERT: a card that does not exist';
  exception when raise_exception then
    assert sqlerrm = 'event_invalid_card', sqlerrm;
  end;
  begin
    perform public.admin_save_event('Punti', '', v_rome + interval '1 day',
    v_rome + interval '2 days', '{"bot": {"win": -5}}', '[{"points": 50, "coins": 10}]', null, null);
    raise exception 'ASSERT: negative points';
  exception when raise_exception then
    assert sqlerrm = 'event_invalid_points', sqlerrm;
  end;

  v_tiers := jsonb_build_array(
    jsonb_build_object('points', 40, 'coins', 50),
    jsonb_build_object('points', 60, 'packs', 1, 'cards', jsonb_build_array(v_variant))
  );
  v_list := public.admin_save_event('  Settimana di prova ', 'Gioca e vinci', v_rome + interval '1 day',
    v_rome + interval '3 days', v_points || '{"extra": {"win": 99}}', v_tiers, 100, null);
  select e into v_event from jsonb_array_elements(v_list -> 'events') e where e ->> 'title' = 'Settimana di prova';
  assert v_event is not null, 'title trimmed';
  assert v_event -> 'points' -> 'friendly' ->> 'win' = '30' and not (v_event -> 'points' ? 'extra'), 'points normalized';
  assert (v_event ->> 'daily_cap')::integer = 100, 'daily cap';
  assert jsonb_array_length(v_event -> 'tiers') = 2, 'two targets';
  assert v_event -> 'tiers' -> 1 -> 'card_codes' ->> 0 = v_variant, 'variant of the card';
  assert jsonb_array_length(v_list -> 'cards') > 0, 'the cards an event can give';

  begin
    perform public.admin_save_event('Sovrapposto', '', v_rome + interval '2 days',
    v_rome + interval '4 days', v_points, '[{"points": 10, "coins": 10}]', null, null);
    raise exception 'ASSERT: two events at the same time';
  exception when raise_exception then
    assert sqlerrm = 'event_overlap', sqlerrm;
  end;

  -- Before the start everything still changes.
  v_list := public.admin_save_event('Settimana di prova', 'Gioca e vinci', v_rome + interval '1 day',
    v_rome + interval '3 days', v_points, v_tiers || '[{"points": 500, "coins": 1}]', 100, (v_event ->> 'id')::uuid);
  select e into v_event from jsonb_array_elements(v_list -> 'events') e where e ->> 'title' = 'Settimana di prova';
  assert jsonb_array_length(v_event -> 'tiers') = 3, 'targets changed before the start';
  perform public.admin_save_event('Settimana di prova', 'Gioca e vinci', v_rome + interval '1 day',
    v_rome + interval '3 days', v_points, v_tiers, 100, (v_event ->> 'id')::uuid);
end $$;

-- Players see the next event before it starts.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f2", "role": "authenticated"}', true);
do $$
declare
  v_event jsonb := public.get_event() -> 'event';
begin
  assert v_event ->> 'title' = 'Settimana di prova', 'upcoming event shown';
  assert (v_event ->> 'my_points')::integer = 0, 'no points yet';
  assert v_event -> 'tiers' -> 1 -> 'cards' -> 0 -> 'variant' is not null, 'reward card with its variant';
  assert not (v_event -> 'tiers' -> 0 ->> 'reached')::boolean, 'target not reached';
end $$;

-- The event starts: matches earn points.
reset role;
update public.events set starts_at = now() - interval '1 hour' where title = 'Settimana di prova';

create temp table event_test_matches (label text primary key, id uuid);
grant select on event_test_matches to authenticated;

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000f2';
  v_b uuid := '00000000-0000-4000-8000-0000000000f3';
  v_threats uuid[];
  v_levels integer[];
  v_match uuid;
  v_label text;
begin
  select array_agg(id order by level, code), array_agg(level order by level, code) into v_threats, v_levels
  from (select distinct on (level) id, level, code from public.threat_definitions
        where region = 'megara' and level <= 5 order by level, code) t;

  -- A bot match won, then one abandoned: only the first counts.
  insert into public.matches (mode, bot_difficulty, player_a, threat_ids, threat_levels)
  values ('bot', 'easy', v_a, v_threats, v_levels) returning id into v_match;
  insert into event_test_matches values ('bot_win', v_match);
  perform public.finish_match(v_match, 'a', 'completed');

  insert into public.matches (mode, bot_difficulty, player_a, threat_ids, threat_levels)
  values ('bot', 'easy', v_a, v_threats, v_levels) returning id into v_match;
  insert into event_test_matches values ('bot_forfeit', v_match);
  perform public.finish_match(v_match, 'b', 'forfeit');

  -- A friendly match A against B, won by A; then a forfeit that pays neither side.
  insert into public.matches (mode, player_a, player_b, threat_ids, threat_levels)
  values ('friendly', v_a, v_b, v_threats, v_levels) returning id into v_match;
  insert into event_test_matches values ('pvp_1', v_match);
  perform public.finish_match(v_match, 'a', 'completed');

  insert into public.matches (mode, player_a, player_b, threat_ids, threat_levels)
  values ('friendly', v_a, v_b, v_threats, v_levels) returning id into v_match;
  insert into event_test_matches values ('pvp_forfeit', v_match);
  perform public.finish_match(v_match, 'a', 'forfeit');

  -- Two more against the same opponent count, the fourth does not.
  foreach v_label in array array['pvp_2', 'pvp_3', 'pvp_4'] loop
    insert into public.matches (mode, player_a, player_b, threat_ids, threat_levels)
    values ('friendly', v_a, v_b, v_threats, v_levels) returning id into v_match;
    insert into event_test_matches values (v_label, v_match);
    perform public.finish_match(v_match, 'draw', 'completed');
  end loop;
end $$;

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000f2';
  v_b uuid := '00000000-0000-4000-8000-0000000000f3';
  v_event uuid := (select id from public.events where title = 'Settimana di prova');
  v_points_a integer;
  v_points_b integer;
begin
  select coalesce(sum(points), 0) into v_points_a from public.event_points where event_id = v_event and user_id = v_a;
  select coalesce(sum(points), 0) into v_points_b from public.event_points where event_id = v_event and user_id = v_b;
  -- A: bot win 10 + friendly win 30 + two draws 15 + 15 = 70. B: loss 10 + two draws 15 + 15 = 40.
  assert v_points_a = 70, format('points of A: %s', v_points_a);
  assert v_points_b = 40, format('points of B: %s', v_points_b);
  assert not exists (
    select 1 from public.event_points p join event_test_matches m on m.id = p.ref_id
    where m.label in ('bot_forfeit', 'pvp_forfeit', 'pvp_4')
  ), 'forfeits or a fourth match against the same opponent earned points';

  -- A passed both targets: 50 coins, then the card and a pack, each once.
  assert (select count(*) from public.event_rewards where event_id = v_event and user_id = v_a) = 2, 'targets of A';
  assert (select count(*) from public.coin_ledger where user_id = v_a and reason = 'event_reward' and amount = 50) = 1,
    'coins of the first target';
  assert (select cardinality(opening_ids) from public.event_rewards where event_id = v_event and user_id = v_a and tier = 2) = 2,
    'card opening and pack';
  assert (select count(*) from public.card_instances where owner_id = v_a and acquired_via = 'event' and variant_id is not null) = 1,
    'the reward card with its variant';
  assert (select count(*) from public.card_transfers where to_user = v_a and reason = 'event') = 1, 'card on the ledger';
  -- B reached the first target only.
  assert (select count(*) from public.event_rewards where event_id = v_event and user_id = v_b) = 1, 'targets of B';
end $$;

-- The daily cap: A at 70 of 85 gets 15 of a Conquest draw's 20, then nothing.
insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000f4', 'authenticated', 'authenticated', 'event-c@example.test',
   '{"full_name": "Evento C"}', now(), now());
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f4", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000f2';
  v_c uuid := '00000000-0000-4000-8000-0000000000f4';
  v_event uuid := (select id from public.events where title = 'Settimana di prova');
  v_threats uuid[];
  v_levels integer[];
  v_match uuid;
begin
  select threat_ids, threat_levels into v_threats, v_levels from public.matches where player_a = v_a limit 1;
  update public.events set daily_cap = 85 where id = v_event;

  insert into public.matches (mode, player_a, player_b, threat_ids, threat_levels)
  values ('conquest', v_c, v_a, v_threats, v_levels) returning id into v_match;
  insert into event_test_matches values ('conquest', v_match);
  perform public.finish_match(v_match, 'draw', 'completed');
  assert (select points from public.event_points where ref_id = v_match and user_id = v_a) = 15, 'cut by the daily cap';
  assert (select points from public.event_points where ref_id = v_match and user_id = v_c) = 20, 'conquest draw';

  insert into public.matches (mode, bot_difficulty, player_a, threat_ids, threat_levels)
  values ('bot', 'easy', v_a, v_threats, v_levels) returning id into v_match;
  perform public.finish_match(v_match, 'a', 'completed');
  assert not exists (select 1 from public.event_points where ref_id = v_match), 'points past the daily cap';
end $$;

-- Emergenza: each threat passed earns its points, a failed one nothing.
do $$
declare
  v_b uuid := '00000000-0000-4000-8000-0000000000f3';
  v_threats uuid[];
  v_cards uuid[];
  v_definitions uuid[];
  v_run uuid;
begin
  select array_agg(id) into v_threats from (select id from public.threat_definitions order by code limit 8) t;
  select array_agg(id order by id), array_agg(definition_id order by id) into v_cards, v_definitions
  from (select distinct on (definition_id) id, definition_id from public.card_instances
        where owner_id = v_b order by definition_id, id limit 8) c;
  insert into public.emergency_days (day, threat_ids, threat_levels)
  values (public.game_day(), v_threats, array[1, 2, 3, 4, 5, 6, 1, 2])
  on conflict do nothing;
  insert into public.emergency_runs (user_id, day, card_instance_ids, definition_ids)
  values (v_b, public.game_day(), v_cards, v_definitions) returning id into v_run;

  perform public.emergency_record_play(v_b, 1, v_cards[1], 10, 0, 10, 7);
  perform public.emergency_record_play(v_b, 2, v_cards[2], 3, 0, 3, 13);
  assert (select sum(points) from public.event_points where ref_id = v_run) = 5, 'emergency points';
  assert (select count(*) from public.event_points where ref_id = v_run) = 1, 'a failed threat earned points';
end $$;

-- What the players see.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f2", "role": "authenticated"}', true);
do $$
declare
  v_event jsonb := public.get_event() -> 'event';
  v_match uuid := (select id from event_test_matches where label = 'pvp_1');
  v_forfeit uuid := (select id from event_test_matches where label = 'pvp_forfeit');
  v_opening uuid;
begin
  assert (v_event ->> 'my_points')::integer = 85, format('total shown: %s', v_event ->> 'my_points');
  assert (v_event ->> 'my_points_today')::integer = 85, 'today';
  assert (v_event -> 'tiers' -> 1 ->> 'reached')::boolean and not (v_event -> 'tiers' -> 1 ->> 'seen')::boolean, 'reward to show';
  v_opening := (v_event -> 'tiers' -> 1 -> 'opening_ids' ->> 0)::uuid;
  assert public.get_pack_opening(v_opening) ->> 'pack_type' = 'event', 'reward cards shown like a pack';

  assert (public.get_event_points_for(v_match) ->> 'points')::integer = 30, 'points of a match';
  assert public.get_event_points_for(v_forfeit) is null, 'points of a forfeit';
  assert public.get_event_points_for(null) is null, 'emergency points of a player without a run';

  perform public.mark_event_rewards_seen((v_event ->> 'id')::uuid);
  assert (public.get_event() -> 'event' -> 'tiers' -> 1 ->> 'seen')::boolean, 'rewards seen';
end $$;

-- Once started, only texts and the end change; an event with points cannot be deleted.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);
do $$
declare
  v_rome timestamp := now() at time zone 'Europe/Rome';
  v_id uuid;
  v_event jsonb;
begin
  select (e ->> 'id')::uuid into v_id from jsonb_array_elements(public.admin_list_events() -> 'events') e
  where e ->> 'title' = 'Settimana di prova';
  select e into v_event
  from jsonb_array_elements(public.admin_save_event('Settimana nuova', 'Altro testo', v_rome + interval '5 days',
    v_rome + interval '4 days', '{"bot": {"win": 999}}', '[{"points": 1, "coins": 99999}]', 5, v_id) -> 'events') e
  where (e ->> 'id')::uuid = v_id;
  assert v_event ->> 'title' = 'Settimana nuova', 'title changed';
  assert v_event -> 'points' -> 'bot' ->> 'win' = '10', 'points changed after the start';
  assert (v_event -> 'tiers' -> 0 ->> 'points')::integer = 40, 'targets changed after the start';
  assert (v_event ->> 'daily_cap')::integer = 85, 'daily cap changed after the start';
  assert (v_event ->> 'starts_at')::timestamptz < now(), 'start moved after the start';
  assert (v_event -> 'tiers' -> 0 ->> 'reached')::integer = 2, 'players at the first target';
  assert (v_event ->> 'players')::integer = 3, 'players of the event';

  begin
    perform public.admin_delete_event(v_id);
    raise exception 'ASSERT: an event with points was deleted';
  exception when raise_exception then
    assert sqlerrm = 'event_has_points', sqlerrm;
  end;

  -- Stopped: no more points.
  perform public.admin_set_event_active(v_id, false);
end $$;

reset role;
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000f2';
  v_c uuid := '00000000-0000-4000-8000-0000000000f4';
  v_match uuid;
begin
  insert into public.matches (mode, bot_difficulty, player_a, threat_ids, threat_levels)
  select 'bot', 'easy', v_c, threat_ids, threat_levels from public.matches where player_a = v_a limit 1
  returning id into v_match;
  perform public.finish_match(v_match, 'a', 'completed');
  assert not exists (select 1 from public.event_points where ref_id = v_match), 'points from a stopped event';
end $$;

rollback;
