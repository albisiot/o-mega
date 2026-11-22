-- Test for 20261120100000_thirteen_new_powers.sql: the thirteen powers of 20 November 2026
-- in the catalog with their texts, each on one character of the Marches (P262-P291) and on
-- the free places of the other factions among the Segnati (P292-P351), and what the server shows for
-- Infiltrato, Presagio and Oracolo, in a match and in an Emergenza. Runs inside a
-- rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000fa', 'authenticated', 'authenticated', 'thirteen@example.test', '{"full_name": "Tredici"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000fa", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- The catalog: names, tiers, texts; each on the one character of the Marches made for it.
do $$
declare
  v_plinth public.card_definitions := (select d from public.card_definitions d where d.code = 'P112');
begin
  assert (
    select count(*) from public.power_definitions
    where (code in ('peak', 'euphoria', 'away', 'twin', 'match_point', 'icebreaker', 'even_score', 'diminuendo',
                    'spoiler', 'infiltrator') and tier = 'simple')
       or (code in ('attrition', 'omen', 'oracle') and tier = 'distinctive')
  ) = 13, 'the thirteen powers and their tier';
  assert (
    select jsonb_object_agg(code, power_code order by code) from public.card_definitions
    where power_code in ('attrition', 'peak', 'euphoria', 'away', 'twin', 'match_point', 'icebreaker', 'even_score',
                         'diminuendo', 'spoiler', 'omen', 'infiltrator', 'oracle')
      and code < 'P292'
  ) = '{"P272": "peak", "P273": "icebreaker", "P274": "euphoria", "P275": "match_point", "P276": "diminuendo",
        "P278": "infiltrator", "P279": "twin", "P281": "away", "P282": "even_score", "P283": "spoiler",
        "P287": "omen", "P290": "oracle", "P291": "attrition"}'::jsonb,
    'one character each, made for it (20261120200000_marches_characters.sql)';
  -- The Segnati took nineteen of the places left in the other factions, with the same numbers
  -- (20261122240000_segnati_characters.sql).
  assert (
    select count(*) from public.card_definitions
    where power_code in ('attrition', 'peak', 'euphoria', 'away', 'twin', 'match_point', 'icebreaker', 'even_score',
                         'diminuendo', 'spoiler', 'omen', 'infiltrator', 'oracle')
      and code between 'P292' and 'P351'
  ) = 19, 'nineteen Segnati with one of the thirteen';

  assert public.power_text('attrition', '{"malus": 2}')
    = 'Dopo averlo giocato, il prossimo personaggio dell''avversario ha -2 al punteggio (non allo spareggio)', 'Logoramento text';
  assert public.power_text('match_point', '{"bonus": 3, "min_wins": 2}') = '+3 se hai già vinto 2 round', 'Colpo di grazia text';
  assert public.power_text('peak', '{"bonus": 3}') = '+3 se almeno un''abilità richiesta vale 10', 'Fuoriclasse text';
  assert public.power_text('omen', '{}') = 'Finché non l''hai giocato, vedi la Minaccia del round dopo', 'Presagio text';

  -- The params are checked like those of every power.
  begin
    insert into public.card_definitions (code, name, faction, rarity_code, stats, power_code, power_params)
    values ('TEST_PEAK', 'Prova', v_plinth.faction, v_plinth.rarity_code, v_plinth.stats, 'peak', '{}');
    raise exception 'ASSERT: Fuoriclasse without its bonus was accepted';
  exception when others then
    if sqlerrm like 'ASSERT%' then raise; end if;
  end;
  -- Guastafeste needs no params: Rasura, Antidoto and Bianchetto hold it with none.
  assert (select count(*) from public.card_definitions where power_code = 'spoiler' and power_params = '{}'::jsonb) = 3,
    'Guastafeste without params';
end $$;

-- In a match: Infiltrato at the start, Presagio while unplayed, Oracolo all along.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000fa';
  v_plinth public.card_definitions := (select d from public.card_definitions d where d.code = 'P112');
  v_omen uuid;
  v_oracle uuid;
  v_infiltrator uuid;
  v_ids uuid[];
  v_team uuid[];
  v_bot uuid[];
  v_threats uuid[];
  v_match uuid;
  v_state jsonb;
  v_play jsonb;
begin
  -- Villains: Epigrafe (Presagio) and Millenario (Oracolo) hold the heroes' places, and an
  -- exact power goes on one card per faction. Infiltrato has no place left: Pertugio's.
  insert into public.card_definitions (code, name, faction, rarity_code, stats, power_code, power_params) values
    ('TEST_OMEN', 'Presagio', 'villains', v_plinth.rarity_code, v_plinth.stats, 'omen', '{}'),
    ('TEST_ORACLE', 'Oracolo', 'villains', v_plinth.rarity_code, v_plinth.stats, 'oracle', '{}');
  v_omen := (select id from public.card_definitions where code = 'TEST_OMEN');
  v_oracle := (select id from public.card_definitions where code = 'TEST_ORACLE');
  v_infiltrator := (select id from public.card_definitions where code = 'P278');

  insert into public.card_instances (definition_id, owner_id, acquired_via)
  select d, v_user, 'pack' from unnest(array[v_omen, v_oracle, v_infiltrator]) as d;
  v_ids := (select array_agg(i.id order by array_position(array[v_omen, v_oracle, v_infiltrator], i.definition_id))
            from public.card_instances i
            where i.owner_id = v_user and i.definition_id in (v_omen, v_oracle, v_infiltrator));
  v_team := v_ids || (select array_agg(s.id) from (
    select i.id from public.card_instances i where i.owner_id = v_user and i.is_starter order by i.acquired_at, i.id limit 2
  ) s);
  v_bot := (select array_agg(s.id) from (
    select id from public.card_definitions where is_active and rarity_code = 'delta' order by code limit 5
  ) s);
  -- Levels 1, 3, 2, 5, 3: the highest is round 4's.
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 3, 2, 5, 3]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level
    order by code offset (case when l.ord = 5 then 1 else 0 end) limit 1
  ) t;
  v_match := public.match_create_bot(v_user, 'easy', v_team, v_bot, v_threats);

  -- Infiltrato: one of the bot's characters, before any round; the bot has none.
  assert (select count(*) from public.spy_reveals where match_id = v_match and side = 'a' and round = 0) = 1,
    'Infiltrato shows one character';
  assert (select definition_id from public.spy_reveals where match_id = v_match and side = 'a') = any (v_bot),
    'Infiltrato shows an opposing character';
  assert not exists (select 1 from public.spy_reveals where match_id = v_match and side = 'b'), 'the bot saw nothing';

  v_state := public.match_state_payload(v_match, 'a');
  assert jsonb_array_length(v_state -> 'spied_cards') = 1 and (v_state -> 'spied_cards' -> 0 ->> 'round')::integer = 0,
    format('Infiltrato in the payload: %s', v_state -> 'spied_cards');
  -- Presagio shows round 2, Oracolo round 4.
  assert (select jsonb_agg((f ->> 'round')::integer order by (f ->> 'round')::integer)
          from jsonb_array_elements(v_state -> 'foreseen_threats') as f) = '[2, 4]'::jsonb,
    format('Presagio and Oracolo at the start: %s', v_state -> 'foreseen_threats');
  assert (select jsonb_agg(f ->> 'seen_by' order by (f ->> 'round')::integer)
          from jsonb_array_elements(v_state -> 'foreseen_threats') as f) = '["Presagio", "Oracolo"]'::jsonb,
    format('who showed them: %s', v_state -> 'foreseen_threats');
  assert jsonb_array_length(public.match_state_payload(v_match, 'b') -> 'foreseen_threats') = 0, 'the bot foresees nothing';

  -- Once Presagio is played, only Oracolo's threat stays.
  v_play := jsonb_build_object('base', 5, 'bonus', 0, 'score', 5, 'highest', 5, 'auto_played', false);
  perform public.match_record_round(v_match, 1,
    v_play || jsonb_build_object('card_instance_id', v_ids[1], 'definition_id', v_omen),
    v_play || jsonb_build_object('definition_id', v_bot[1]), null, null);
  v_state := public.match_state_payload(v_match, 'a');
  assert (select jsonb_agg((f ->> 'round')::integer) from jsonb_array_elements(v_state -> 'foreseen_threats') as f)
    = '[4]'::jsonb, format('after Presagio is played: %s', v_state -> 'foreseen_threats');
end $$;

-- In an Emergenza: the threats Presagio and Oracolo show join those of the Veggente, and
-- Livello ignoto no longer hides their level.
do $$
declare
  v_omen uuid := (select id from public.card_definitions where code = 'TEST_OMEN');
  v_oracle uuid := (select id from public.card_definitions where code = 'TEST_ORACLE');
  v_threats uuid[] := (select array_agg(id order by code) from (
    select id, code from public.threat_definitions order by code limit 5
  ) t);
  v_levels integer[] := array[1, 2, 4, 5, 3];
  v_payload jsonb := jsonb_build_object(
    'threat_levels', '[1, 2, null, null, 3]'::jsonb,
    'run', jsonb_build_object('status', 'active', 'current_round', 1, 'foreseen_threats', '[]'::jsonb)
  );
  v_result jsonb;
begin
  v_result := public.with_emergency_omens(v_payload, array[v_omen, v_oracle], '{}', v_threats, v_levels, '[]'::jsonb);
  assert (select jsonb_agg((f ->> 'round')::integer) from jsonb_array_elements(v_result -> 'run' -> 'foreseen_threats') as f)
    = '[2, 4]'::jsonb, format('Emergenza at the start: %s', v_result -> 'run' -> 'foreseen_threats');
  assert v_result -> 'threat_levels' = '[1, 2, null, 5, 3]'::jsonb, format('levels: %s', v_result -> 'threat_levels');
  assert (select jsonb_agg(f ->> 'seen_by') from jsonb_array_elements(v_result -> 'run' -> 'foreseen_threats') as f)
    = '["Presagio", "Oracolo"]'::jsonb, format('who showed them: %s', v_result -> 'run' -> 'foreseen_threats');

  v_result := public.with_emergency_omens(v_payload, array[v_omen, v_oracle], array[v_omen], v_threats, v_levels, '[]'::jsonb);
  assert (select jsonb_agg((f ->> 'round')::integer) from jsonb_array_elements(v_result -> 'run' -> 'foreseen_threats') as f)
    = '[4]'::jsonb, format('Emergenza after Presagio: %s', v_result -> 'run' -> 'foreseen_threats');

  -- A round the Veggente already shows is not added twice.
  v_result := public.with_emergency_omens(
    jsonb_set(v_payload, '{run,foreseen_threats}', '[{"round": 4, "name": "già vista"}]'),
    array[v_oracle], '{}', v_threats, v_levels, '[]'::jsonb);
  assert v_result -> 'run' -> 'foreseen_threats' = '[{"round": 4, "name": "già vista"}]'::jsonb,
    format('Veggente and Oracolo: %s', v_result -> 'run' -> 'foreseen_threats');

  -- Nothing without the powers, nor once the run is over.
  assert public.with_emergency_omens(v_payload, '{}', '{}', v_threats, v_levels, '[]'::jsonb) = v_payload, 'no power';
  assert public.with_emergency_omens(jsonb_set(v_payload, '{run,status}', '"finished"'), array[v_oracle], '{}',
                                     v_threats, v_levels, '[]'::jsonb)
    = jsonb_set(v_payload, '{run,status}', '"finished"'), 'finished run';

  -- The three payloads still answer for a player without a run.
  assert public.emergency_state_payload('00000000-0000-4000-8000-0000000000fa')
    = public.emergency_state_payload_foreseen('00000000-0000-4000-8000-0000000000fa'), 'daily payload';
  assert public.emergency_week_state_payload('00000000-0000-4000-8000-0000000000fa') is not null, 'weekly payload';
end $$;

rollback;
