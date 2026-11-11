-- Integration test for Annullatore, Davide, Crescendo and Slancio: catalog and
-- texts, and an Annullatore stopping the opposing Spia and Veggente. Runs
-- inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000f7', 'authenticated', 'authenticated', 'nullifier-a@example.test', '{"full_name": "Annullatore"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f7", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000f7';
  v_spy_def uuid := (select id from public.card_definitions where code = 'P037');    -- Sordina, Spia
  v_seer_def uuid := (select id from public.card_definitions where code = 'P103');   -- Sibilla, Veggente
  v_nullifier_def uuid := (select id from public.card_definitions where code = 'P115'); -- Codicil, Annullatore
  v_spy uuid;
  v_seer uuid;
  v_team uuid[];
  v_defs uuid[];
  v_bot uuid[];
  v_threats uuid[];
  v_match uuid;
  v_state jsonb;
begin
  -- Two cards each, made for the power; later characters took them too: Gauger (P130)
  -- and Injunction (P179) Annullatore, Miliarium (P161) and Holloway (P177) Crescendo,
  -- Quarantine (P182) Slancio.
  assert (
    select jsonb_object_agg(p.code, (select count(*) from public.card_definitions d where d.power_code = p.code and d.is_active))
    from public.power_definitions p
    where p.code in ('nullifier', 'giant_slayer', 'crescendo', 'momentum')
  ) = '{"nullifier": 4, "giant_slayer": 2, "crescendo": 4, "momentum": 3}'::jsonb, 'cards with each new power';
  assert (select count(*) from public.card_definitions where code between 'P115' and 'P122' and is_active) = 8,
    'eight new characters';
  assert public.power_text('giant_slayer', '{"bonus": 3, "min_gap": 2}')
    = '+3 se il personaggio avversario lo supera di almeno 2 gradi di rarità', 'Davide text';
  assert public.power_text('momentum', '{"bonus": 2}')
    = 'Se vinci questo round, il tuo prossimo personaggio ottiene +2', 'Slancio text';

  insert into public.card_instances (definition_id, owner_id, acquired_via)
  values (v_spy_def, v_user, 'pack') returning id into v_spy;
  insert into public.card_instances (definition_id, owner_id, acquired_via)
  values (v_seer_def, v_user, 'pack') returning id into v_seer;
  v_team := array[v_spy, v_seer] || (select array_agg(s.id) from (
    select i.id from public.card_instances i
    where i.owner_id = v_user and i.is_starter
    order by i.acquired_at, i.id limit 3
  ) s);
  v_defs := (select array_agg(i.definition_id order by u.ord)
             from unnest(v_team) with ordinality as u(id, ord)
             join public.card_instances i on i.id = u.id);
  -- The bot fields an Annullatore and four Delta.
  v_bot := array[v_nullifier_def] || (select array_agg(s.id) from (
    select id from public.card_definitions where is_active and rarity_code = 'delta' order by code limit 4
  ) s);
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;

  v_match := public.match_create_bot(v_user, 'easy', v_team, v_bot, v_threats);

  -- Round 1: the Spia against the Annullatore reveals nothing.
  perform public.match_record_round(v_match, 1,
    jsonb_build_object('card_instance_id', v_spy, 'definition_id', v_spy_def,
      'base', 5, 'bonus', 0, 'score', 5, 'highest', 5, 'auto_played', false),
    jsonb_build_object('definition_id', v_nullifier_def, 'base', 5, 'bonus', 0, 'score', 5, 'highest', 5, 'auto_played', false),
    null, null);
  v_state := public.match_state_payload(v_match, 'a');
  assert jsonb_array_length(v_state -> 'spied_cards') = 0, 'a Spia facing an Annullatore revealed a character';

  -- Round 2: the Veggente against a Delta reveals the threats to come.
  perform public.match_record_round(v_match, 2,
    jsonb_build_object('card_instance_id', v_seer, 'definition_id', v_seer_def,
      'base', 5, 'bonus', 0, 'score', 5, 'highest', 5, 'auto_played', false),
    jsonb_build_object('definition_id', v_bot[2], 'base', 5, 'bonus', 0, 'score', 5, 'highest', 5, 'auto_played', false),
    null, null);
  v_state := public.match_state_payload(v_match, 'a');
  assert jsonb_array_length(v_state -> 'foreseen_threats') = 2, format('Veggente facing a Delta: %s', v_state -> 'foreseen_threats');

  -- The same Veggente, had it faced the Annullatore, reveals nothing.
  update public.round_plays set definition_id = v_bot[3]
  where match_id = v_match and side = 'b' and round = 1;
  update public.round_plays set definition_id = v_nullifier_def
  where match_id = v_match and side = 'b' and round = 2;
  v_state := public.match_state_payload(v_match, 'a');
  assert jsonb_array_length(v_state -> 'foreseen_threats') = 0, 'a Veggente facing an Annullatore revealed the threats';
end $$;

rollback;
