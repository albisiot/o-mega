-- Integration test for the Sfide a tema (SPEC §8.8): admins create them, with every value
-- checked; players read them with get_challenges only; a match starts only in an open
-- challenge, against a bot it allows, within the matches of the day, with a squad that keeps
-- its rules; the rules are copied onto the match and a later edit does not touch it; a trigger
-- refuses any challenge match whose squad breaks them; a challenge linked to the event gives
-- its own points, an unlinked one the event's. Internal functions are called as the database
-- owner, as the Edge Function would with service_role. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000008a1', 'authenticated', 'authenticated', 'challenge-a@example.test',
   '{"full_name": "Sfida A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000008a2', 'authenticated', 'authenticated', 'challenge-admin@example.test',
   '{"full_name": "Sfida Admin"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008a1", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008a2", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000008a2');

-- No other event or challenge in the way; an event whose bot wins give 10 points.
update public.events set is_active = false where is_active;
update public.challenges set is_active = false where is_active;
insert into public.events (id, title, description, starts_at, ends_at, points)
values ('00000000-0000-4000-8000-0000000008e1', 'Evento delle sfide', '', now() - interval '1 hour', now() + interval '2 days',
        public.event_points_rules('{"bot": {"win": 10}}'));

-- The test's cards: five villain Delta (the first one also as a variant) and a hero Delta.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000008a1';
  v_villains uuid[];
  v_hero uuid;
  v_variant uuid;
begin
  select array_agg(id order by has_variant desc, code) into v_villains from (
    select d.id, d.code, exists (select 1 from public.card_variants v where v.definition_id = d.id and v.is_active) as has_variant
    from public.card_definitions d
    where d.is_active and d.unlock_level is null and d.rarity_code = 'delta' and d.faction = 'villains'
    order by has_variant desc, d.code limit 5
  ) s;
  select d.id into v_hero from public.card_definitions d
  where d.is_active and d.unlock_level is null and d.rarity_code = 'delta' and d.faction = 'heroes'
  order by d.code limit 1;
  select v.id into v_variant from public.card_variants v where v.definition_id = v_villains[1] and v.is_active limit 1;
  assert cardinality(v_villains) = 5 and v_hero is not null and v_variant is not null, 'test characters';

  insert into public.card_instances (definition_id, owner_id, acquired_via)
  select u.id, v_user, 'pack' from unnest(v_villains || v_hero) as u(id);
  insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
  values (v_villains[1], v_user, 'pack', v_variant);

  -- Five base villains; the same with the first one as its variant; four villains and the hero.
  perform set_config('challenge_test.base', (
    select array_agg(i.id order by array_position(v_villains, i.definition_id))::text from public.card_instances i
    where i.owner_id = v_user and i.acquired_via = 'pack' and i.variant_id is null and i.definition_id = any (v_villains)
  ), true);
  perform set_config('challenge_test.fit', (
    select (array[(select i.id from public.card_instances i where i.owner_id = v_user and i.variant_id = v_variant)]
            || (current_setting('challenge_test.base')::uuid[])[2:5])::text
  ), true);
  perform set_config('challenge_test.hero', (
    select ((current_setting('challenge_test.fit')::uuid[])[1:4]
            || (select i.id from public.card_instances i
                where i.owner_id = v_user and i.acquired_via = 'pack' and i.definition_id = v_hero))::text
  ), true);
  perform set_config('challenge_test.bots', (
    select array_agg(id)::text from (
      -- Never Omega: the test turns them off further down.
      select d.id from public.card_definitions d
      where d.is_active and d.unlock_level is null and d.rarity_code <> 'omega' order by d.code limit 9
    ) s
  ), true);
  perform set_config('challenge_test.threats', (
    select array_agg(id)::text from (
      select t.id from public.threat_definitions t where t.is_active and t.rarity_code is null order by t.code limit 5
    ) s
  ), true);
end $$;

-- A player opens nothing of the admin and reads no table.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008a1", "role": "authenticated"}', true);

do $$
begin
  begin
    perform public.admin_list_challenges();
    raise exception 'ASSERT: a player opened the challenges admin';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_save_challenge('Furbata', '', '#ff7ad9', 'classic', '{easy}', true, '{}',
      (now() at time zone 'Europe/Rome')::timestamp, (now() at time zone 'Europe/Rome' + interval '1 day')::timestamp);
    raise exception 'ASSERT: a player saved a challenge';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.challenges;
    raise exception 'ASSERT: a player read challenges';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.challenge_match_terms;
    raise exception 'ASSERT: a player read challenge_match_terms';
  exception when insufficient_privilege then null;
  end;
  assert public.get_challenges() -> 'challenges' = '[]'::jsonb, 'no challenge yet';
end $$;

-- The admin: every value checked.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008a2", "role": "authenticated"}', true);

do $$
declare
  v_now timestamp := (now() at time zone 'Europe/Rome')::timestamp;
  v_rules jsonb := '{"factions": ["villains"], "rarities": ["delta"], "min_variants": 1}';
  v_payload jsonb;
  v_preview jsonb;
  v_challenge jsonb;
begin
  -- Unknown codes, a mode without challenges, no bot, a bad color, too long.
  begin
    perform public.admin_save_challenge('Prova', '', '#ff7ad9', 'classic', '{easy}', true, '{"traits": ["group.nessuno"]}',
      v_now, v_now + interval '1 day');
    raise exception 'ASSERT: an unknown trait was accepted';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_rules', sqlerrm;
  end;
  begin
    perform public.admin_save_challenge('Prova', '', '#ff7ad9', 'emergency', '{easy}', true, '{}', v_now, v_now + interval '1 day');
    raise exception 'ASSERT: a challenge in a mode without matches was accepted';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_format', sqlerrm;
  end;
  begin
    perform public.admin_save_challenge('Prova', '', '#ff7ad9', 'classic', '{}', true, '{}', v_now, v_now + interval '1 day');
    raise exception 'ASSERT: a challenge without bots was accepted';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_bots', sqlerrm;
  end;
  begin
    perform public.admin_save_challenge('Prova', '', 'rosa', 'classic', '{easy}', true, '{}', v_now, v_now + interval '1 day');
    raise exception 'ASSERT: a bad color was accepted';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_color', sqlerrm;
  end;
  begin
    perform public.admin_save_challenge('Prova', '', '#ff7ad9', 'classic', '{easy}', true, '{}', v_now, v_now + interval '91 days');
    raise exception 'ASSERT: a challenge of 91 days was accepted';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_period', sqlerrm;
  end;
  -- Linked to an event, it must sit within its dates.
  begin
    perform public.admin_save_challenge('Prova', '', '#ff7ad9', 'classic', '{easy}', true, '{}', v_now, v_now + interval '5 days',
      null, '00000000-0000-4000-8000-0000000008e1', '{"win": 5, "draw": 1, "loss": 0}');
    raise exception 'ASSERT: a challenge longer than its event was accepted';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_event', sqlerrm;
  end;

  -- The preview counts characters and the players who can field a squad (player A can).
  v_preview := public.admin_preview_challenge('classic', v_rules);
  assert (v_preview ->> 'admitted')::integer >= 5 and (v_preview ->> 'variants_needed')::integer = 1, v_preview::text;
  assert (v_preview ->> 'players_ready')::integer >= 1, 'player A can field a squad';

  -- Villain Delta, at least one variant, Facile or Medio, 2 matches a day, linked to the event.
  v_payload := public.admin_save_challenge('Notte dei cattivi', 'Solo cattivi Delta.', '#FF7AD9', 'classic', '{medium,easy,medium}',
    true, v_rules, v_now - interval '10 minutes', v_now + interval '1 day', 2,
    '00000000-0000-4000-8000-0000000008e1', '{"win": 25, "draw": 5, "loss": 2}');
  v_challenge := v_payload -> 'challenges' -> 0;
  assert v_challenge ->> 'color' = '#ff7ad9', 'color in lower case';
  assert v_challenge -> 'bot_difficulties' = '["easy", "medium"]'::jsonb, v_challenge ->> 'bot_difficulties';
  assert v_challenge -> 'rules' @> '{"factions": ["villains"], "rarities": ["delta"], "traits": [], "min_variants": 1, "all_variants": false}'::jsonb,
    v_challenge ->> 'rules';
  assert v_challenge -> 'event_points' = '{"win": 25, "draw": 5, "loss": 2}'::jsonb, 'event points';
  assert (v_challenge ->> 'matches')::integer = 0, 'no match yet';
  perform set_config('challenge_test.id', v_challenge ->> 'id', true);

  -- One challenge per mode at a time.
  begin
    perform public.admin_save_challenge('Un altra', '', '#ff7ad9', 'classic', '{easy}', true, '{}', v_now, v_now + interval '2 hours');
    raise exception 'ASSERT: two Classica challenges at once';
  exception when raise_exception then
    assert sqlerrm = 'challenge_overlap', sqlerrm;
  end;

  -- An Allarme Triplo without rules nor event, for the second path.
  v_payload := public.admin_save_challenge('Triplo libero', '', '#16c8ff', 'triple', '{easy}', false, '{}',
    v_now - interval '10 minutes', v_now + interval '1 day');
  perform set_config('challenge_test.triple', (
    select c ->> 'id' from jsonb_array_elements(v_payload -> 'challenges') as c where c ->> 'format' = 'triple'
  ), true);
end $$;

reset role;

-- Too few characters: nobody fields a squad of Omega when every Omega is gone.
update public.card_definitions set is_active = false where rarity_code = 'omega';
set local role authenticated;
do $$
declare
  v_now timestamp := (now() at time zone 'Europe/Rome')::timestamp;
begin
  begin
    perform public.admin_save_challenge('Solo Omega', '', '#ff7ad9', 'classic', '{easy}', true, '{"rarities": ["omega"]}',
      v_now + interval '3 days', v_now + interval '4 days');
    raise exception 'ASSERT: a rule without characters was accepted';
  exception when raise_exception then
    assert sqlerrm = 'challenge_too_few_characters', sqlerrm;
  end;
end $$;
reset role;

-- Players read the open challenges, with their rules in words and their own matches of the day.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008a1", "role": "authenticated"}', true);
do $$
declare
  v_challenge jsonb := (
    select c from jsonb_array_elements(public.get_challenges() -> 'challenges') as c
    where c ->> 'id' = current_setting('challenge_test.id')
  );
begin
  assert v_challenge is not null, 'the challenge is listed';
  assert (v_challenge ->> 'plays_today')::integer = 0 and (v_challenge ->> 'team_size')::integer = 5, v_challenge::text;
  assert v_challenge -> 'event' ->> 'title' = 'Evento delle sfide', 'its event';
  assert jsonb_array_length(v_challenge -> 'admitted') = 2, 'rarity and faction in words';
end $$;
reset role;

-- Matches: only an allowed bot, only a squad that keeps the rules.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000008a1';
  v_challenge uuid := current_setting('challenge_test.id')::uuid;
  v_bots uuid[] := (current_setting('challenge_test.bots')::uuid[])[1:5];
  v_threats uuid[] := current_setting('challenge_test.threats')::uuid[];
  v_context jsonb;
  v_match uuid;
  v_points integer;
begin
  begin
    perform public.challenge_create_bot_match(v_user, v_challenge, 'hard', current_setting('challenge_test.fit')::uuid[], v_bots, v_threats);
    raise exception 'ASSERT: a bot the challenge does not allow';
  exception when raise_exception then
    assert sqlerrm = 'challenge_bot_not_allowed', sqlerrm;
  end;
  begin
    perform public.challenge_create_bot_match(v_user, v_challenge, 'easy', current_setting('challenge_test.hero')::uuid[], v_bots, v_threats);
    raise exception 'ASSERT: a hero in a villains challenge';
  exception when raise_exception then
    assert sqlerrm = 'challenge_card_not_admitted', sqlerrm;
  end;
  begin
    perform public.challenge_create_bot_match(v_user, v_challenge, 'easy', current_setting('challenge_test.base')::uuid[], v_bots, v_threats);
    raise exception 'ASSERT: a squad without a variant';
  exception when raise_exception then
    assert sqlerrm = 'challenge_variants_required', sqlerrm;
  end;
  assert not exists (select 1 from public.matches where player_a = v_user), 'a refused squad left a match';

  -- The bot's characters: those the rules admit.
  v_context := public.challenge_bot_context(v_user, v_challenge, 'easy');
  assert v_context ->> 'format' = 'classic', 'format';
  assert not exists (
    select 1 from jsonb_array_elements_text(v_context -> 'admitted_definition_ids') as u(id)
    join public.card_definitions d on d.id = u.id::uuid
    where d.faction <> 'villains' or d.rarity_code <> 'delta'
  ), 'the bot may use only admitted characters';

  -- A squad that keeps the rules: the match, its copied rules, the challenge in the payload.
  v_match := public.challenge_create_bot_match(v_user, v_challenge, 'easy', current_setting('challenge_test.fit')::uuid[], v_bots, v_threats);
  assert (select challenge_id from public.matches where id = v_match) = v_challenge, 'match tagged';
  assert (select rules ->> 'min_variants' = '1' and event_points ->> 'win' = '25' and version = 1
          from public.challenge_match_terms where match_id = v_match), 'terms copied';
  assert public.match_state_payload(v_match, 'a') -> 'challenge' ->> 'title' = 'Notte dei cattivi', 'payload names it';
  assert (public.match_state_payload(v_match, 'a') -> 'challenge' ->> 'plays_today')::integer = 1, 'one match today';

  -- A win gives the challenge's 25 points, not the event's 10.
  perform public.finish_match(v_match, 'a', 'completed');
  select points into v_points from public.event_points where user_id = v_user and ref_id = v_match;
  assert v_points = 25, format('challenge points: %s', v_points);
  perform set_config('challenge_test.match', v_match::text, true);
end $$;

-- An edit after the start changes only title and end: the rules stay, for running matches too.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008a2", "role": "authenticated"}', true);
do $$
declare
  v_now timestamp := (now() at time zone 'Europe/Rome')::timestamp;
  v_challenge jsonb;
begin
  v_challenge := (
    select c from jsonb_array_elements(public.admin_save_challenge('Notte dei cattivi 2', '', '#00ff00', 'triple', '{hard}', false,
      '{"rarities": ["omega"]}', v_now, v_now + interval '20 hours', 9, null, null, current_setting('challenge_test.id')::uuid
    ) -> 'challenges') as c where c ->> 'id' = current_setting('challenge_test.id')
  );
  assert v_challenge ->> 'title' = 'Notte dei cattivi 2' and v_challenge ->> 'format' = 'classic'
     and v_challenge ->> 'color' = '#ff7ad9' and (v_challenge ->> 'daily_limit')::integer = 2
     and v_challenge -> 'rules' ->> 'min_variants' = '1' and (v_challenge ->> 'version')::integer = 2, v_challenge::text;
  assert (v_challenge ->> 'matches')::integer = 1 and (v_challenge ->> 'players')::integer = 1, 'stats';
  begin
    perform public.admin_delete_challenge(current_setting('challenge_test.id')::uuid);
    raise exception 'ASSERT: a played challenge was deleted';
  exception when raise_exception then
    assert sqlerrm = 'challenge_in_use', sqlerrm;
  end;
end $$;
reset role;

do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000008a1';
  v_challenge uuid := current_setting('challenge_test.id')::uuid;
  v_bots uuid[] := (current_setting('challenge_test.bots')::uuid[])[1:5];
  v_threats uuid[] := current_setting('challenge_test.threats')::uuid[];
  v_match uuid;
  v_starters uuid[];
begin
  assert (select version from public.challenge_match_terms where match_id = current_setting('challenge_test.match')::uuid) = 1,
    'the copy of a played match does not change';

  -- The second match of the day, abandoned: it counts for the limit, and gives no points.
  v_match := public.challenge_create_bot_match(v_user, v_challenge, 'medium', current_setting('challenge_test.fit')::uuid[], v_bots, v_threats);
  perform public.finish_match(v_match, 'b', 'forfeit');
  assert not exists (select 1 from public.event_points where ref_id = v_match), 'an abandoned match gave points';
  begin
    perform public.challenge_create_bot_match(v_user, v_challenge, 'easy', current_setting('challenge_test.fit')::uuid[], v_bots, v_threats);
    raise exception 'ASSERT: a third match in a day of two';
  exception when raise_exception then
    assert sqlerrm = 'challenge_daily_limit', sqlerrm;
  end;

  -- The safety net: a match tagged as a challenge with a squad that breaks the rules is refused.
  v_match := public.match_create_bot(v_user, 'easy', current_setting('challenge_test.hero')::uuid[], v_bots, v_threats);
  update public.matches set challenge_id = v_challenge where id = v_match;
  begin
    insert into public.challenge_match_terms (match_id, challenge_id, version, title, color, rules)
    select v_match, c.id, c.version, c.title, c.color, c.rules from public.challenges c where c.id = v_challenge;
    raise exception 'ASSERT: the copy accepted a squad that breaks the rules';
  exception when raise_exception then
    assert sqlerrm = 'challenge_card_not_admitted', sqlerrm;
  end;
  perform public.finish_match(v_match, 'b', 'forfeit');

  -- Allarme Triplo, not linked: the match of its mode, and the event's own points for a bot win.
  select (array_agg(i.id order by i.acquired_at, i.id))[1:9] into v_starters
  from public.card_instances i where i.owner_id = v_user and i.is_starter;
  v_match := public.challenge_create_bot_match(
    v_user, current_setting('challenge_test.triple')::uuid, 'easy', v_starters, current_setting('challenge_test.bots')::uuid[]
  );
  assert (select format from public.matches where id = v_match) = 'triple', 'a triple match';
  assert (select event_id is null from public.challenge_match_terms where match_id = v_match), 'not linked';
  perform public.finish_match(v_match, 'a', 'completed');
  assert (select points from public.event_points where ref_id = v_match) = 10, 'the event''s own row';
end $$;

-- The history names the challenge; an unplayed challenge is deleted, a played one turned off.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008a1", "role": "authenticated"}', true);
do $$
begin
  assert exists (
    select 1 from jsonb_array_elements(public.get_match_history(10)) as e
    where e ->> 'id' = current_setting('challenge_test.match') and e -> 'challenge' ->> 'title' = 'Notte dei cattivi'
  ), 'history';
end $$;

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008a2", "role": "authenticated"}', true);
do $$
declare
  v_now timestamp := (now() at time zone 'Europe/Rome')::timestamp;
  v_payload jsonb;
  v_new uuid;
begin
  v_payload := public.admin_save_challenge('Da cancellare', '', '#ffd60a', 'classic', '{easy}', true, '{}',
    v_now + interval '30 hours', v_now + interval '40 hours');
  select (c ->> 'id')::uuid into v_new from jsonb_array_elements(v_payload -> 'challenges') as c where c ->> 'title' = 'Da cancellare';
  v_payload := public.admin_delete_challenge(v_new);
  assert not exists (select 1 from jsonb_array_elements(v_payload -> 'challenges') as c where c ->> 'id' = v_new::text), 'deleted';

  v_payload := public.admin_set_challenge_active(current_setting('challenge_test.id')::uuid, false);
  assert not (select (c ->> 'is_active')::boolean from jsonb_array_elements(v_payload -> 'challenges') as c
              where c ->> 'id' = current_setting('challenge_test.id')), 'turned off';
end $$;

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008a1", "role": "authenticated"}', true);
do $$
begin
  assert not exists (
    select 1 from jsonb_array_elements(public.get_challenges() -> 'challenges') as c
    where c ->> 'id' = current_setting('challenge_test.id')
  ), 'a challenge turned off leaves Gioca';
end $$;
reset role;

rollback;
