-- Test for 20261120300000_rule_powers.sql: the twenty-two powers of 20 November 2026
-- (second batch) in the catalog with their texts, on no card yet, and what the server
-- does for Fenice, Imboscata and Segugio in a classic match. Runs inside a rolled-back
-- transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000fb', 'authenticated', 'authenticated', 'rule-powers@example.test', '{"full_name": "Regole"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000fb", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- The catalog: names, tiers, texts; on no card yet.
do $$
begin
  assert (
    select count(*) from public.power_definitions
    where (code in ('calm', 'ambush', 'patience', 'hunter', 'rainbow', 'joker', 'gamble', 'wall', 'tracker', 'steady')
           and tier = 'simple')
       or (code in ('rival_frost', 'single_force', 'abyss_next', 'duelist', 'upset', 'rival_all_or_nothing', 'rival_duel',
                    'rival_price', 'negative_self', 'vampire', 'thief', 'phoenix') and tier = 'distinctive')
  ) = 22, 'the twenty-two powers and their tier';
  assert not exists (
    select 1 from public.card_definitions
    where power_code in ('calm', 'ambush', 'patience', 'hunter', 'rainbow', 'joker', 'gamble', 'wall', 'tracker', 'steady',
                         'rival_frost', 'single_force', 'abyss_next', 'duelist', 'upset', 'rival_all_or_nothing',
                         'rival_duel', 'rival_price', 'negative_self', 'vampire', 'thief', 'phoenix')
  ), 'no card has them yet: they wait for characters made for them';

  assert public.power_text('rival_price', '{"max_value": 2, "malus": 2}')
    = 'Nel round le abilità del personaggio avversario che valgono 2 o meno contano -2', 'Il prezzo text';
  assert public.power_text('abyss_next', '{"family": "power"}')
    = 'Le abilità richieste di Potere del tuo prossimo personaggio contano doppio', 'Abissi text';
  assert public.power_text('patience', '{"bonus": 1, "max": 4}') = '+1 per ogni round già giocato, fino a +4', 'Pazienza text';
  assert public.power_text('gamble', '{"bonus": 3, "malus": 3}')
    = '+3; se perdi il round, il tuo prossimo personaggio ha -3', 'Azzardo text';
end $$;

-- A classic match against a bot: its Imboscata hides the next threat, Fenice comes back
-- once after a lost round, Segugio shows the rarities the bot has left.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000fb';
  v_plinth public.card_definitions := (select d from public.card_definitions d where d.code = 'P112');
  v_phoenix uuid;
  v_tracker uuid;
  v_ambush uuid;
  v_ids uuid[];
  v_team uuid[];
  v_bot uuid[];
  v_threats uuid[];
  v_match uuid;
  v_state jsonb;
  v_play jsonb := jsonb_build_object('base', 5, 'bonus', 0, 'score', 5, 'highest', 5, 'auto_played', false);
  v_card jsonb;
begin
  insert into public.card_definitions (code, name, faction, rarity_code, stats, power_code, power_params) values
    ('TEST_PHX', 'Fenice', v_plinth.faction, v_plinth.rarity_code, v_plinth.stats, 'phoenix', '{}'),
    ('TEST_TRK', 'Segugio', v_plinth.faction, v_plinth.rarity_code, v_plinth.stats, 'tracker', '{}'),
    ('TEST_AMB', 'Imboscata', v_plinth.faction, v_plinth.rarity_code, v_plinth.stats, 'ambush', '{}');
  v_phoenix := (select id from public.card_definitions where code = 'TEST_PHX');
  v_tracker := (select id from public.card_definitions where code = 'TEST_TRK');
  v_ambush := (select id from public.card_definitions where code = 'TEST_AMB');

  insert into public.card_instances (definition_id, owner_id, acquired_via)
  select d, v_user, 'pack' from unnest(array[v_phoenix, v_tracker]) as d;
  v_ids := (select array_agg(i.id order by array_position(array[v_phoenix, v_tracker], i.definition_id))
            from public.card_instances i
            where i.owner_id = v_user and i.definition_id in (v_phoenix, v_tracker));
  v_team := v_ids || (select array_agg(s.id) from (
    select i.id from public.card_instances i where i.owner_id = v_user and i.is_starter order by i.acquired_at, i.id limit 3
  ) s);
  v_bot := array[v_ambush] || (select array_agg(s.id) from (
    select id from public.card_definitions where is_active and rarity_code = 'delta' order by code limit 4
  ) s);
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;
  v_match := public.match_create_bot(v_user, 'easy', v_team, v_bot, v_threats);

  -- Round 1: Fenice loses to the bot's Imboscata.
  perform public.match_record_round(v_match, 1,
    v_play || jsonb_build_object('card_instance_id', v_ids[1], 'definition_id', v_phoenix),
    v_play || jsonb_build_object('definition_id', v_bot[1]), 'b', null);
  v_state := public.match_state_payload(v_match, 'a');
  v_card := (select c from jsonb_array_elements(v_state -> 'my_team') as c where (c ->> 'definition_id')::uuid = v_phoenix);
  assert v_card -> 'played_round' = 'null'::jsonb and (v_card ->> 'returned')::boolean,
    format('Fenice back in the team: %s', v_card);
  v_card := (select r from jsonb_array_elements(v_state -> 'rounds') as r where (r ->> 'round')::integer = 2);
  assert (v_card ->> 'ambushed')::boolean and v_card -> 'threat' -> 'abilities' = '[]'::jsonb
     and (v_card -> 'threat' ->> 'hidden')::boolean,
    format('Imboscata hides round 2: %s', v_card);
  assert not coalesce((
    select (r ->> 'ambushed')::boolean from jsonb_array_elements(public.match_state_payload(v_match, 'b') -> 'rounds') as r
    where (r ->> 'round')::integer = 2
  ), false), 'the bot''s own Imboscata hides nothing from it';
  assert not (v_state ? 'tracked_rarities'), 'no Segugio played yet';

  -- Round 2: Fenice again, once.
  perform public.match_record_round(v_match, 2,
    v_play || jsonb_build_object('card_instance_id', v_ids[1], 'definition_id', v_phoenix),
    v_play || jsonb_build_object('definition_id', v_bot[2]), null, null);
  v_state := public.match_state_payload(v_match, 'a');
  v_card := (select c from jsonb_array_elements(v_state -> 'my_team') as c where (c ->> 'definition_id')::uuid = v_phoenix);
  assert (v_card ->> 'played_round')::integer = 2 and not (v_card ->> 'returned')::boolean, format('Fenice played again: %s', v_card);
  assert not coalesce((
    select (r ->> 'ambushed')::boolean from jsonb_array_elements(v_state -> 'rounds') as r where (r ->> 'round')::integer = 3
  ), false), 'Imboscata only for the round after';
  begin
    perform public.match_record_round(v_match, 3,
      v_play || jsonb_build_object('card_instance_id', v_ids[1], 'definition_id', v_phoenix),
      v_play || jsonb_build_object('definition_id', v_bot[3]), null, null);
    raise exception 'ASSERT: Fenice played a third time';
  exception when others then
    if sqlerrm not like '%character_already_played%' then raise; end if;
  end;

  -- Round 3: Segugio.
  perform public.match_record_round(v_match, 3,
    v_play || jsonb_build_object('card_instance_id', v_ids[2], 'definition_id', v_tracker),
    v_play || jsonb_build_object('definition_id', v_bot[3]), null, null);
  v_state := public.match_state_payload(v_match, 'a');
  assert (select sum((r ->> 'count')::integer) from jsonb_array_elements(v_state -> 'tracked_rarities') as r) = 2
     and (v_state -> 'tracked_rarities' -> 0 ->> 'code') = 'delta',
    format('Segugio: %s', v_state -> 'tracked_rarities');
end $$;

rollback;
