-- Integration test for frames and effects in the matches and in the pack openings
-- (20261119150000_match_cosmetics.sql): the opponent's looks come only for the opposing characters
-- a state already shows, only those left visible, never a card covered by Nebbia nor one still in
-- the hand; the tables stay unreadable; a pack opening names every card's definition.
-- Service-only functions are called as the database owner, as the Edge Function would with
-- service_role. Runs inside a transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000008a1', 'authenticated', 'authenticated', 'looks-a@example.test', '{"full_name": "Looks A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000008b2', 'authenticated', 'authenticated', 'looks-b@example.test', '{"full_name": "Looks B"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008b2", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008a1", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- A friendly match between A (side a) and B (side b), from A's lobby.
do $$
declare
  v_threats uuid[];
  v_lobby jsonb;
  v_match uuid;
begin
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;
  perform set_config('test.team_a', (select array_agg(id order by acquired_at, id)::text from (
    select id, acquired_at from public.card_instances where owner_id = '00000000-0000-4000-8000-0000000008a1' order by acquired_at, id limit 5) s), true);
  perform set_config('test.team_b', (select array_agg(id order by acquired_at, id)::text from (
    select id, acquired_at from public.card_instances where owner_id = '00000000-0000-4000-8000-0000000008b2' order by acquired_at, id limit 5) s), true);
  perform set_config('test.definitions', (
    select jsonb_object_agg(id, definition_id)::text from public.card_instances
    where id = any (current_setting('test.team_a')::uuid[])
  ), true);

  perform set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008a1", "role": "authenticated"}', true);
  v_lobby := public.create_lobby(current_setting('test.team_a')::uuid[]);
  v_match := public.match_join_lobby('00000000-0000-4000-8000-0000000008b2', v_lobby ->> 'code',
    current_setting('test.team_b')::uuid[], v_threats);
  perform set_config('test.match', v_match::text, true);
end $$;

create function pg_temp.play(p_instance uuid, p_score integer)
returns jsonb language sql as $$
  select jsonb_build_object('card_instance_id', p_instance,
    'definition_id', (select definition_id from public.card_instances where id = p_instance),
    'base', p_score, 'bonus', 0, 'score', p_score, 'highest', least(p_score, 10), 'auto_played', false)
$$;

-- Read from a setting: a player cannot read the other's cards.
create function pg_temp.definition_of(p_instance uuid)
returns text language sql as $$
  select current_setting('test.definitions')::jsonb ->> p_instance::text
$$;

-- A's looks: on the first card of the team a gold frame and a Numerata, both shown; on the second a
-- Neon hidden and Neve shown; on the third only a Marmo, hidden; on a character outside the team a
-- Prisma, shown. B has none.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000008a1';
  v_team uuid[] := current_setting('test.team_a')::uuid[];
  v_outside uuid;
  v_serial integer := (select coalesce(max(serial), 0) + 1 from public.cosmetic_items where cosmetic_code = 'numbered');
  v_gold uuid;
  v_numbered uuid;
  v_neon uuid;
  v_snow uuid;
  v_marble uuid;
  v_prism uuid;
begin
  select d.id into v_outside
  from public.card_definitions d
  where d.is_active and d.id not in (select definition_id from public.card_instances where id = any (v_team))
  order by d.code limit 1;
  perform set_config('test.outside', v_outside::text, true);
  perform set_config('test.serial', v_serial::text, true);

  insert into public.cosmetic_items (owner_id, cosmetic_code, serial, acquired_via, used_at, used_on)
  values (v_user, 'gold', (select coalesce(max(serial), 0) + 1 from public.cosmetic_items where cosmetic_code = 'gold'),
          'shards', now(), pg_temp.definition_of(v_team[1])::uuid)
  returning id into v_gold;
  insert into public.cosmetic_items (owner_id, cosmetic_code, serial, acquired_via, used_at, used_on)
  values (v_user, 'numbered', v_serial, 'shards', now(), pg_temp.definition_of(v_team[1])::uuid)
  returning id into v_numbered;
  insert into public.cosmetic_items (owner_id, cosmetic_code, serial, acquired_via, used_at, used_on)
  values (v_user, 'neon', (select coalesce(max(serial), 0) + 1 from public.cosmetic_items where cosmetic_code = 'neon'),
          'shards', now(), pg_temp.definition_of(v_team[2])::uuid)
  returning id into v_neon;
  insert into public.cosmetic_items (owner_id, cosmetic_code, serial, acquired_via, used_at, used_on)
  values (v_user, 'snow', (select coalesce(max(serial), 0) + 1 from public.cosmetic_items where cosmetic_code = 'snow'),
          'shards', now(), pg_temp.definition_of(v_team[2])::uuid)
  returning id into v_snow;
  insert into public.cosmetic_items (owner_id, cosmetic_code, serial, acquired_via, used_at, used_on)
  values (v_user, 'marble', (select coalesce(max(serial), 0) + 1 from public.cosmetic_items where cosmetic_code = 'marble'),
          'shards', now(), pg_temp.definition_of(v_team[3])::uuid)
  returning id into v_marble;
  insert into public.cosmetic_items (owner_id, cosmetic_code, serial, acquired_via, used_at, used_on)
  values (v_user, 'prism', (select coalesce(max(serial), 0) + 1 from public.cosmetic_items where cosmetic_code = 'prism'),
          'shards', now(), v_outside)
  returning id into v_prism;

  insert into public.character_cosmetics (user_id, definition_id, frame_item_id, effect_item_id, frame_visible, effect_visible) values
    (v_user, pg_temp.definition_of(v_team[1])::uuid, v_gold, v_numbered, true, true),
    (v_user, pg_temp.definition_of(v_team[2])::uuid, v_neon, v_snow, false, true),
    (v_user, pg_temp.definition_of(v_team[3])::uuid, v_marble, null, false, true),
    (v_user, v_outside, v_prism, null, true, true);
end $$;

-- Before any round: B sees no look of A, whose cards are all still in the hand.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008b2", "role": "authenticated"}', true);
do $$
declare
  v_state jsonb := public.get_match_state(current_setting('test.match')::uuid);
begin
  assert v_state -> 'opponent_looks' = '{}'::jsonb, format('looks before any play: %s', v_state -> 'opponent_looks');
  -- The tables stay closed to the players: only the payload reads them.
  begin
    perform 1 from public.character_cosmetics;
    assert not found, 'B read the applied looks';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.cosmetic_items;
    assert not found, 'B read the items';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.match_opponent_looks('{}'::jsonb, current_setting('test.match')::uuid, 'b');
    raise exception 'ASSERT: a player called match_opponent_looks';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Round 1: A plays the first card, B its first. Once it is resolved B sees the gold frame and the
-- Numerata with its number; A sees nothing (B has no looks).
do $$
declare
  v_match uuid := current_setting('test.match')::uuid;
  v_a uuid[] := current_setting('test.team_a')::uuid[];
  v_b uuid[] := current_setting('test.team_b')::uuid[];
begin
  perform public.match_submit_play('00000000-0000-4000-8000-0000000008a1', v_match, 1, v_a[1]);
  perform public.match_submit_play('00000000-0000-4000-8000-0000000008b2', v_match, 1, v_b[1]);
  perform public.match_record_round(v_match, 1, pg_temp.play(v_a[1], 9), pg_temp.play(v_b[1], 4), 'a', null);
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008b2", "role": "authenticated"}', true);
do $$
declare
  v_state jsonb := public.get_match_state(current_setting('test.match')::uuid);
  v_first text := pg_temp.definition_of((current_setting('test.team_a')::uuid[])[1]);
begin
  assert v_state -> 'opponent_looks' = jsonb_build_object(v_first, jsonb_build_object(
    'frame', 'gold', 'effect', 'numbered', 'serial', current_setting('test.serial')::integer
  )), format('looks after round 1: %s', v_state -> 'opponent_looks');
end $$;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008a1", "role": "authenticated"}', true);
do $$
begin
  assert public.get_match_state(current_setting('test.match')::uuid) -> 'opponent_looks' = '{}'::jsonb,
    'A saw looks B never applied';
end $$;
reset role;

-- Round 2: A plays the second card: B sees Neve and not the hidden Neon. Round 3: the third card
-- has only a hidden frame, so it brings nothing; the character outside the team never shows.
do $$
declare
  v_match uuid := current_setting('test.match')::uuid;
  v_a uuid[] := current_setting('test.team_a')::uuid[];
  v_b uuid[] := current_setting('test.team_b')::uuid[];
begin
  perform public.match_submit_play('00000000-0000-4000-8000-0000000008a1', v_match, 2, v_a[2]);
  perform public.match_submit_play('00000000-0000-4000-8000-0000000008b2', v_match, 2, v_b[2]);
  perform public.match_record_round(v_match, 2, pg_temp.play(v_a[2], 4), pg_temp.play(v_b[2], 9), 'b', null);
  perform public.match_submit_play('00000000-0000-4000-8000-0000000008a1', v_match, 3, v_a[3]);
  perform public.match_submit_play('00000000-0000-4000-8000-0000000008b2', v_match, 3, v_b[3]);
  perform public.match_record_round(v_match, 3, pg_temp.play(v_a[3], 9), pg_temp.play(v_b[3], 4), 'a', null);
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008b2", "role": "authenticated"}', true);
do $$
declare
  v_looks jsonb := public.get_match_state(current_setting('test.match')::uuid) -> 'opponent_looks';
  v_team uuid[] := current_setting('test.team_a')::uuid[];
begin
  assert (select count(*) from jsonb_object_keys(v_looks)) = 2, format('looks after round 3: %s', v_looks);
  assert v_looks -> pg_temp.definition_of(v_team[2]) = '{"frame": null, "effect": "snow", "serial": null}'::jsonb,
    format('hidden frame shown or effect missing: %s', v_looks -> pg_temp.definition_of(v_team[2]));
  assert not v_looks ? pg_temp.definition_of(v_team[3]), 'a character with only a hidden frame came';
  assert not v_looks ? current_setting('test.outside'), 'a character outside the match came';
end $$;
reset role;

-- The other formats and the covered cards, on the same opponent: the Allarme Triplo's contests,
-- Spia, the Quadrante board (only the opponent's cells) and Nebbia, which sends no definition.
do $$
declare
  v_match uuid := current_setting('test.match')::uuid;
  v_first text := pg_temp.definition_of((current_setting('test.team_a')::uuid[])[1]);
  v_second text := pg_temp.definition_of((current_setting('test.team_a')::uuid[])[2]);
  v_looks jsonb;
begin
  v_looks := public.match_opponent_looks(jsonb_build_object('rounds', jsonb_build_array(jsonb_build_object(
    'contests', jsonb_build_array(
      jsonb_build_object('slot', 0, 'opponent_play', null),
      jsonb_build_object('slot', 1, 'opponent_play', jsonb_build_object('definition_id', v_first))
    )))), v_match, 'b');
  assert v_looks ? v_first and not v_looks ? v_second, format('triple: %s', v_looks);

  v_looks := public.match_opponent_looks(jsonb_build_object('spied_cards', jsonb_build_array(
    jsonb_build_object('definition_id', v_second, 'round', 2))), v_match, 'b');
  assert v_looks ? v_second and not v_looks ? v_first, format('spia: %s', v_looks);

  v_looks := public.match_opponent_looks(jsonb_build_object('board', jsonb_build_array(
    jsonb_build_object('mine', true, 'card', jsonb_build_object('definition_id', v_first)),
    jsonb_build_object('mine', false, 'card', jsonb_build_object('definition_id', v_second))
  )), v_match, 'b');
  assert v_looks ? v_second and not v_looks ? v_first, format('quadrante: %s', v_looks);

  v_looks := public.match_opponent_looks(jsonb_build_object('rounds', jsonb_build_array(
    jsonb_build_object('round', 1, 'opponent_play', jsonb_build_object('hidden', true, 'definition_id', null))
  )), v_match, 'b');
  assert v_looks = '{}'::jsonb, format('nebbia: %s', v_looks);

  -- From side a the opponent is B, who has no looks: A's own cards never come back as the opponent's.
  v_looks := public.match_opponent_looks(jsonb_build_object('board', jsonb_build_array(
    jsonb_build_object('mine', false, 'card', jsonb_build_object('definition_id', v_first))
  )), v_match, 'a');
  assert v_looks = '{}'::jsonb, format('side a: %s', v_looks);
end $$;

-- A match against a bot has no second player: no looks.
do $$
declare
  v_bot uuid;
begin
  insert into public.matches (mode, bot_difficulty, player_a, threat_ids, threat_levels)
  select 'bot', 'easy', '00000000-0000-4000-8000-0000000008b2', m.threat_ids, m.threat_levels
  from public.matches m where m.id = current_setting('test.match')::uuid
  returning id into v_bot;
  assert public.match_opponent_looks(jsonb_build_object('rounds', jsonb_build_array(jsonb_build_object(
    'opponent_play', jsonb_build_object('definition_id', pg_temp.definition_of((current_setting('test.team_a')::uuid[])[1]))
  ))), v_bot, 'a') = '{}'::jsonb, 'a bot match has looks';
end $$;

-- A pack opening names the definition of every card.
do $$
declare
  -- Opened first: the payload, a stable function, sees only what came before its statement.
  v_id uuid := public.open_pack('00000000-0000-4000-8000-0000000008a1', 'standard');
  v_opening jsonb;
  v_card jsonb;
begin
  v_opening := public.pack_opening_payload(v_id);
  assert jsonb_array_length(v_opening -> 'cards') > 0, 'no cards in the pack';
  for v_card in select value from jsonb_array_elements(v_opening -> 'cards') loop
    assert v_card ->> 'definition_id' = (
      select definition_id::text from public.card_instances where id = (v_card ->> 'instance_id')::uuid
    ), format('wrong definition: %s', v_card);
  end loop;
end $$;

rollback;
