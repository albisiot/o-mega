-- Integration test for Schermato, Nemesi, Tuttofare and Spia: catalog, and the
-- opposing character a Spia reveals. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000f6', 'authenticated', 'authenticated', 'spy-a@example.test', '{"full_name": "Spia"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f6", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000f6';
  v_spy uuid;
  v_spy_def uuid := (select id from public.card_definitions where code = 'P037');
  v_team uuid[];
  v_defs uuid[];
  v_bot uuid[];
  v_threats uuid[];
  v_match uuid;
  v_state jsonb;
  v_spied uuid;
begin
  assert not exists (
    select 1 from public.power_definitions p
    where p.code in ('shielded', 'nemesis', 'all_rounder', 'spy')
      and not exists (select 1 from public.card_definitions d where d.power_code = p.code and d.is_active)
  ), 'a new power is on no card';
  assert public.power_text('all_rounder', '{"bonus": 3, "min_value": 5}') = '+3 se tutte le abilità richieste valgono almeno 5',
    'Tuttofare text';

  insert into public.card_instances (definition_id, owner_id, acquired_via)
  values (v_spy_def, v_user, 'pack') returning id into v_spy;
  v_team := array[v_spy] || (select array_agg(s.id) from (
    select i.id from public.card_instances i
    where i.owner_id = v_user and i.is_starter and i.definition_id <> v_spy_def
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
  assert jsonb_array_length(public.match_state_payload(v_match, 'a') -> 'spied_cards') = 0, 'revealed before playing the Spia';

  -- Round 1: an ordinary character. Round 2: the Spia.
  perform public.match_record_round(v_match, 1,
    jsonb_build_object('card_instance_id', v_team[2], 'definition_id', v_defs[2],
      'base', 5, 'bonus', 0, 'score', 5, 'highest', 5, 'auto_played', false),
    jsonb_build_object('definition_id', v_bot[1], 'base', 5, 'bonus', 0, 'score', 5, 'highest', 5, 'auto_played', false),
    null, null);
  assert jsonb_array_length(public.match_state_payload(v_match, 'a') -> 'spied_cards') = 0, 'revealed without a Spia';
  perform public.match_record_round(v_match, 2,
    jsonb_build_object('card_instance_id', v_spy, 'definition_id', v_spy_def,
      'base', 5, 'bonus', 0, 'score', 5, 'highest', 5, 'auto_played', false),
    jsonb_build_object('definition_id', v_bot[2], 'base', 5, 'bonus', 0, 'score', 5, 'highest', 5, 'auto_played', false),
    null, null);

  v_state := public.match_state_payload(v_match, 'a');
  assert jsonb_array_length(v_state -> 'spied_cards') = 1, 'one character revealed';
  assert (v_state -> 'spied_cards' -> 0 ->> 'round')::integer = 2, 'revealed in the Spia round';
  v_spied := (v_state -> 'spied_cards' -> 0 ->> 'definition_id')::uuid;
  assert v_spied = any (v_bot[3:5]), 'revealed a character the bot had already played';
  assert jsonb_array_length(public.match_state_payload(v_match, 'b') -> 'spied_cards') = 0, 'the other side sees the reveal';
  -- Drawn once: reading the state again shows the same character.
  assert (public.match_state_payload(v_match, 'a') -> 'spied_cards' -> 0 ->> 'definition_id')::uuid = v_spied, 'reveal changed';
end $$;

rollback;
