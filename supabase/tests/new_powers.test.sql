-- Integration test for the six new powers: catalog, and what Veggente shows.
-- Runs inside a rolled-back transaction: npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000e5', 'authenticated', 'authenticated', 'pow-a@example.test', '{"full_name": "Poteri"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e5", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000e5';
  v_seer uuid;
  v_seer_def uuid := (select id from public.card_definitions where code = 'P078');
  v_team uuid[];
  v_defs uuid[];
  v_bot uuid[];
  v_threats uuid[];
  v_match uuid;
  v_state jsonb;
begin
  -- Every new power is on some card, with numbers the engine can read.
  assert not exists (
    select 1 from public.power_definitions p
    where p.code in ('opener', 'last_stand', 'bond', 'relentless', 'sabotage', 'foresight')
      and not exists (select 1 from public.card_definitions d where d.power_code = p.code and d.is_active)
  ), 'a new power is on no card';
  assert not exists (
    select 1 from public.card_definitions d, jsonb_each_text(d.power_params) e
    where e.key in ('max_round', 'min_round', 'malus') and e.value::integer < 1
  ), 'invalid power params';
  assert public.power_text('sabotage', '{"malus": 1}') like '-1 a ogni abilità%', 'Sabotatore text';
  assert public.power_text('opener', '{"bonus": 3, "max_round": 2}') = '+3 se giocato entro il round 2', 'Apripista text';

  insert into public.card_instances (definition_id, owner_id, acquired_via)
  values (v_seer_def, v_user, 'pack') returning id into v_seer;
  v_team := array[v_seer] || (select array_agg(s.id) from (
    select i.id from public.card_instances i
    where i.owner_id = v_user and i.is_starter and i.definition_id <> v_seer_def
    order by i.acquired_at, i.id limit 4
  ) s);
  v_defs := (select array_agg(i.definition_id order by u.ord)
             from unnest(v_team) with ordinality as u(id, ord)
             join public.card_instances i on i.id = u.id);

  select array_agg(s.id) into v_bot from (
    select id from public.card_definitions where is_active and rarity_code = 'delta' order by code limit 5
  ) s;
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;

  v_match := public.match_create_bot(v_user, 'easy', v_team, v_bot, v_threats);

  -- Before Veggente is played, nothing about the future is sent.
  perform public.match_record_round(v_match, 1,
    jsonb_build_object('card_instance_id', v_team[2], 'definition_id', v_defs[2],
      'base', 5, 'bonus', 0, 'score', 5, 'highest', 5, 'auto_played', false),
    jsonb_build_object('definition_id', v_bot[1], 'base', 5, 'bonus', 0, 'score', 5, 'highest', 5, 'auto_played', false),
    null, null);
  v_state := public.match_state_payload(v_match, 'a');
  assert jsonb_array_length(v_state -> 'foreseen_threats') = 0, 'future shown too early';
  assert jsonb_array_length(public.match_state_payload(v_match, 'b') -> 'foreseen_threats') = 0, 'future shown to the other side';

  -- After it, the rounds after the current one, in order. Never to the other side.
  perform public.match_record_round(v_match, 2,
    jsonb_build_object('card_instance_id', v_seer, 'definition_id', v_seer_def,
      'base', 5, 'bonus', 0, 'score', 5, 'highest', 5, 'auto_played', false),
    jsonb_build_object('definition_id', v_bot[2], 'base', 5, 'bonus', 0, 'score', 5, 'highest', 5, 'auto_played', false),
    null, null);
  v_state := public.match_state_payload(v_match, 'a');
  assert (v_state ->> 'current_round')::integer = 3, 'current round';
  assert jsonb_array_length(v_state -> 'foreseen_threats') = 2, 'rounds 4 and 5 are foreseen';
  assert (v_state -> 'foreseen_threats' -> 0 ->> 'round')::integer = 4, 'first foreseen round';
  assert (v_state -> 'foreseen_threats' -> 1 ->> 'name')
       = (select name from public.threat_definitions where id = v_threats[5]), 'last foreseen threat';
  assert jsonb_array_length(public.match_state_payload(v_match, 'b') -> 'foreseen_threats') = 0, 'the other side foresees';
end $$;

rollback;
