-- Test for 20261116200000_power_variants.sql: every exact power on at most one card per
-- faction, the new variants in the catalog, and what the server does for the variants
-- of Spia, Veggente and Annullatore. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000f8', 'authenticated', 'authenticated', 'variants-a@example.test', '{"full_name": "Varianti"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000f9', 'authenticated', 'authenticated', 'variants-b@example.test', '{"full_name": "Ritardo"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f8", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f9", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- The catalog and the rule.
do $$
declare
  v_plinth public.card_definitions := (select d from public.card_definitions d where d.code = 'P112');
begin
  assert (select count(*) from public.power_definitions) = 67, 'the 33 powers, their 21 variants and the 13 of 20 November';
  assert (
    select count(*) from public.power_definitions
    where (code in ('round_exact', 'bond_threshold', 'bond_relay', 'bond_played', 'bond_unplayed', 'relentless_small',
                    'relentless_big', 'relentless_behind', 'nemesis_other', 'rival', 'delayed_nullifier', 'spy_many',
                    'spy_rarest') and tier = 'simple')
       or (code in ('comeback_long', 'comeback_margin', 'underdog_per_round', 'underdog_wall', 'underdog_points',
                    'sabotage_big', 'sabotage_flat', 'foresight_short') and tier = 'distinctive')
  ) = 21, 'variants and their tier';
  assert not exists (
    select 1 from public.card_definitions where power_code is not null
    group by power_code, power_params, faction having count(*) > 1
  ), 'an exact power on two cards of one faction';
  -- 157 on 16 November 2026, then the twenty of the Thousand Suns with a power (P242-P261).
  assert (select count(*) from public.card_definitions where power_code is not null) = 177, 'cards with a power';

  assert public.power_text('bond_threshold', '{"bonus": 3, "min_allies": 2}')
    = '+3 se in squadra ci sono almeno 2 altri personaggi della sua fazione', 'Legame text';
  assert public.power_text('comeback_margin', '{"max": 4}')
    = 'Se perdi questo round, il tuo prossimo personaggio ottiene i punti di scarto, fino a +4', 'Riscossa text';
  assert public.power_text('sabotage_flat', '{"malus": 2}')
    = '-2 al punteggio del personaggio avversario in questo round (non allo spareggio)', 'Sabotatore text';
  assert (select power_code from public.card_definitions where code = 'P179') = 'delayed_nullifier', 'Injunction';
  assert (select power_params from public.card_definitions where code = 'P025') = '{"bonus": 3, "min_round": 5}'::jsonb, 'Bulwark';

  -- A new character cannot repeat an exact power already in its faction; other numbers can.
  begin
    insert into public.card_definitions (code, name, faction, rarity_code, stats, power_code, power_params)
    values ('TEST_DUP', 'Doppione', v_plinth.faction, v_plinth.rarity_code, v_plinth.stats, 'last_stand', '{"bonus": 3, "min_round": 4}');
    raise exception 'ASSERT: a second Hero with Ultimo baluardo +3 dal round 4 was accepted';
  exception when unique_violation then null;
  end;
  insert into public.card_definitions (code, name, faction, rarity_code, stats, power_code, power_params)
  values ('TEST_NEW', 'Gemello', v_plinth.faction, v_plinth.rarity_code, v_plinth.stats, 'last_stand', '{"bonus": 1, "min_round": 2}');
end $$;

-- Spia for two characters, Spia for the rarest, Veggente for the next two rounds.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000f8';
  v_many_def uuid := (select id from public.card_definitions where code = 'P047');    -- Actuary, Spia di 2
  v_rarest_def uuid := (select id from public.card_definitions where code = 'P159');  -- Erasure, Spia del più raro
  v_short_def uuid := (select id from public.card_definitions where code = 'P215');   -- Contromano, Veggente corto
  v_omega_def uuid := (select id from public.card_definitions where code = 'P058');   -- Absentia, Omega
  v_ids uuid[];
  v_team uuid[];
  v_bot uuid[];
  v_threats uuid[];
  v_match uuid;
  v_state jsonb;
  v_play jsonb;
begin
  insert into public.card_instances (definition_id, owner_id, acquired_via)
  select d, v_user, 'pack' from unnest(array[v_many_def, v_rarest_def, v_short_def]) as d;
  v_ids := (select array_agg(i.id order by array_position(array[v_many_def, v_rarest_def, v_short_def], i.definition_id))
            from public.card_instances i
            where i.owner_id = v_user and i.definition_id in (v_many_def, v_rarest_def, v_short_def));
  v_team := v_ids || (select array_agg(s.id) from (
    select i.id from public.card_instances i where i.owner_id = v_user and i.is_starter order by i.acquired_at, i.id limit 2
  ) s);
  v_bot := (select array_agg(s.id) from (
    select id from public.card_definitions where is_active and rarity_code = 'delta' order by code limit 4
  ) s) || v_omega_def;
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;
  v_match := public.match_create_bot(v_user, 'easy', v_team, v_bot, v_threats);

  v_play := jsonb_build_object('base', 5, 'bonus', 0, 'score', 5, 'highest', 5, 'auto_played', false);
  perform public.match_record_round(v_match, 1,
    v_play || jsonb_build_object('card_instance_id', v_ids[1], 'definition_id', v_many_def),
    v_play || jsonb_build_object('definition_id', v_bot[1]), null, null);
  v_state := public.match_state_payload(v_match, 'a');
  assert jsonb_array_length(v_state -> 'spied_cards') = 2, format('Spia di 2: %s', v_state -> 'spied_cards');

  perform public.match_record_round(v_match, 2,
    v_play || jsonb_build_object('card_instance_id', v_ids[2], 'definition_id', v_rarest_def),
    v_play || jsonb_build_object('definition_id', v_bot[2]), null, null);
  assert (select definition_id from public.spy_reveals where match_id = v_match and round = 2) = v_omega_def,
    'Spia del più raro shows the Omega';

  perform public.match_record_round(v_match, 3,
    v_play || jsonb_build_object('card_instance_id', v_ids[3], 'definition_id', v_short_def),
    v_play || jsonb_build_object('definition_id', v_bot[3]), null, null);
  v_state := public.match_state_payload(v_match, 'a');
  -- Played in round 3, it shows rounds 4 and 5: round 4 is already the current one.
  assert jsonb_array_length(v_state -> 'foreseen_threats') = 1
     and (v_state -> 'foreseen_threats' -> 0 ->> 'round')::integer = 5,
    format('Veggente corto: %s', v_state -> 'foreseen_threats');
end $$;

-- Annullatore ritardato: the bot's Injunction in round 1 switches off the Veggente of round 2.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000f9';
  v_seer_def uuid := (select id from public.card_definitions where code = 'P103');     -- Sibilla, Veggente
  v_delayed_def uuid := (select id from public.card_definitions where code = 'P179');  -- Injunction
  v_seer uuid;
  v_team uuid[];
  v_bot uuid[];
  v_threats uuid[];
  v_match uuid;
  v_state jsonb;
  v_play jsonb := jsonb_build_object('base', 5, 'bonus', 0, 'score', 5, 'highest', 5, 'auto_played', false);
begin
  insert into public.card_instances (definition_id, owner_id, acquired_via)
  values (v_seer_def, v_user, 'pack') returning id into v_seer;
  v_team := (select array_agg(s.id) from (
    select i.id from public.card_instances i where i.owner_id = v_user and i.is_starter order by i.acquired_at, i.id limit 4
  ) s) || v_seer;
  v_bot := array[v_delayed_def] || (select array_agg(s.id) from (
    select id from public.card_definitions where is_active and rarity_code = 'delta' order by code limit 4
  ) s);
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;
  v_match := public.match_create_bot(v_user, 'easy', v_team, v_bot, v_threats);

  perform public.match_record_round(v_match, 1,
    v_play || jsonb_build_object('card_instance_id', v_team[1], 'definition_id', (select definition_id from public.card_instances where id = v_team[1])),
    v_play || jsonb_build_object('definition_id', v_delayed_def), null, null);
  perform public.match_record_round(v_match, 2,
    v_play || jsonb_build_object('card_instance_id', v_seer, 'definition_id', v_seer_def),
    v_play || jsonb_build_object('definition_id', v_bot[2]), null, null);
  assert public.nullified_in_round(v_match, 2, 'a'), 'the Veggente after an Annullatore ritardato is switched off';
  assert not public.nullified_in_round(v_match, 1, 'a'), 'not in the Annullatore''s own round';
  v_state := public.match_state_payload(v_match, 'a');
  assert jsonb_array_length(v_state -> 'foreseen_threats') = 0, 'Veggente after Annullatore ritardato revealed the threats';

  -- Had the bot played a Delta in round 1, the Veggente would show rounds 4 and 5 (3 is the current one).
  update public.round_plays set definition_id = v_bot[3] where match_id = v_match and side = 'b' and round = 1;
  v_state := public.match_state_payload(v_match, 'a');
  assert jsonb_array_length(v_state -> 'foreseen_threats') = 2, format('Veggente: %s', v_state -> 'foreseen_threats');
end $$;

rollback;
