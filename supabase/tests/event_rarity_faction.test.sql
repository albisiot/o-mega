-- Integration test for events that admit characters by rarity and faction:
-- unknown rarities or factions, and rules that admit fewer characters than an
-- Emergenza squad, are refused; the rule is saved, shown to players and does
-- not change once the event started; only teams made entirely of admitted
-- characters earn points, and the result screen says when a team was not
-- admitted. Runs inside a transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000b7', 'authenticated', 'authenticated', 'rule-admin@example.test',
   '{"full_name": "Rule Admin"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b8', 'authenticated', 'authenticated', 'rule-player@example.test',
   '{"full_name": "Rule Player"}', now(), now());

-- The rarity and faction with the most characters, a character outside them,
-- and the narrowest Omega faction.
do $$
declare
  v_rarity text;
  v_faction text;
begin
  select d.rarity_code, d.faction into v_rarity, v_faction
  from public.card_definitions d
  where d.is_active and d.unlock_level is null
  group by d.rarity_code, d.faction
  order by count(*) desc, d.rarity_code, d.faction
  limit 1;
  perform set_config('test.rarity', v_rarity, false);
  perform set_config('test.faction', v_faction, false);
  perform set_config('test.count', public.event_admitted_count('{}', array[v_rarity], array[v_faction])::text, false);
  perform set_config('test.outsider', (
    select d.id::text from public.card_definitions d
    where d.is_active and d.unlock_level is null and d.rarity_code = v_rarity and d.faction <> v_faction
    order by d.code limit 1), false);
  perform set_config('test.narrow_faction', (
    select f from unnest(array['heroes', 'villains', 'neutrals']) f
    order by public.event_admitted_count('{}', array['omega'], array[f]), f limit 1), false);
end $$;

-- No other event in the way of the one this test runs.
update public.events set is_active = false where is_active;

-- The rule on one card and on a team.
do $$
declare
  v_in uuid := (select d.id from public.card_definitions d
                where d.rarity_code = current_setting('test.rarity') and d.faction = current_setting('test.faction')
                  and d.is_active and d.unlock_level is null order by d.code limit 1);
  v_out uuid := current_setting('test.outsider')::uuid;
begin
  assert current_setting('test.count')::integer >= public.config_int('events.min_admitted_characters'),
    'the broadest rarity and faction admit too few characters for this test';
  assert public.card_admitted_by_event(v_in, '{}', array[current_setting('test.rarity')], array[current_setting('test.faction')]),
    'an admitted card';
  assert not public.card_admitted_by_event(v_out, '{}', array[current_setting('test.rarity')], array[current_setting('test.faction')]),
    'a card of another faction';
  assert public.card_admitted_by_event(v_out, '{}', array[current_setting('test.rarity')], '{}'), 'no faction rule';
  assert not public.card_admitted_by_event(v_in, '{}', array['nope'], '{}'), 'another rarity';
  assert public.event_team_admitted('{}', '{}', '{}', '{}'), 'no rule admits everyone';
  assert not public.event_team_admitted('{}', array[current_setting('test.rarity')], '{}', '{}'), 'an empty team is admitted';
  assert public.event_team_admitted('{}', '{}', array[current_setting('test.faction')], array[v_in]), 'an admitted team';
  assert not public.event_team_admitted('{}', '{}', array[current_setting('test.faction')], array[v_in, v_out]), 'a team with an outsider';
  assert public.event_admitted_description('{}', array['omega', 'delta'], array['villains', 'heroes'])
    = jsonb_build_array(
        jsonb_build_object('category', 'Rarità', 'traits', jsonb_build_array(
          (select name from public.rarity_definitions where code = 'delta'),
          (select name from public.rarity_definitions where code = 'omega'))),
        jsonb_build_object('category', 'Fazione', 'traits', jsonb_build_array('Eroi', 'Cattivi'))),
    format('description %s', public.event_admitted_description('{}', array['omega', 'delta'], array['villains', 'heroes']));
end $$;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000b8", "role": "authenticated"}', true);
do $$ begin perform public.bootstrap_player(); end $$;

-- A player cannot save an event.
do $$
declare
  v_rome timestamp := (now() at time zone 'Europe/Rome')::timestamp;
begin
  perform public.admin_save_event('Evento furbo', '', v_rome + interval '1 day', v_rome + interval '2 days',
    '{}'::jsonb, '[{"points": 100, "coins": 10}]'::jsonb, p_rarities => array['omega']);
  raise exception 'ASSERT: a player saved an event';
exception when insufficient_privilege then
  assert sqlerrm = 'not_admin', sqlerrm;
end $$;

select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000b7", "role": "authenticated"}', true);
do $$ begin perform public.bootstrap_player(); end $$;

reset role;
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000000b7');
set local role authenticated;

-- The admin payload: the rarities, and the rarity and faction of every card.
do $$
declare
  v_payload jsonb := public.admin_list_events();
begin
  assert jsonb_array_length(v_payload -> 'rarities') = (select count(*) from public.rarity_definitions), 'rarities';
  assert not exists (
    select 1 from jsonb_array_elements(v_payload -> 'cards') c
    join public.card_definitions d on d.code = c ->> 'code'
    where c ->> 'rarity_code' is distinct from d.rarity_code or c ->> 'faction' is distinct from d.faction
  ), 'card rarity and faction';
end $$;

-- Unknown rarities or factions, and too few characters, are refused.
do $$
declare
  v_rome timestamp := (now() at time zone 'Europe/Rome')::timestamp;
  v_case record;
begin
  for v_case in
    select * from (values
      (array['zeta'], '{}'::text[]),
      ('{}'::text[], array['aliens']),
      (array['omega'], array[current_setting('test.narrow_faction')])
    ) as t(rarities, factions)
  loop
    if v_case.rarities = array['omega']
       and public.event_admitted_count('{}', v_case.rarities, v_case.factions) >= public.config_int('events.min_admitted_characters') then
      continue;
    end if;
    begin
      perform public.admin_save_event('Regola sbagliata', '', v_rome + interval '1 day', v_rome + interval '2 days',
        '{}'::jsonb, '[{"points": 100, "coins": 10}]'::jsonb, p_rarities => v_case.rarities, p_factions => v_case.factions);
      raise exception 'ASSERT: accepted the rule % %', v_case.rarities, v_case.factions;
    exception when raise_exception then
      assert sqlerrm = 'event_invalid_traits', sqlerrm;
    end;
  end loop;
end $$;

-- An event that admits only the broadest rarity and faction.
do $$
declare
  v_rome timestamp := (now() at time zone 'Europe/Rome')::timestamp;
  v_event jsonb;
begin
  select e into v_event
  from jsonb_array_elements(public.admin_save_event('Solo rarità', 'Prova', v_rome + interval '1 day', v_rome + interval '3 days',
    '{"bot": {"win": 10, "draw": 5, "loss": 3}, "emergency": {"passed": 5}}'::jsonb,
    '[{"points": 1000, "coins": 10}]'::jsonb,
    p_rarities => array[current_setting('test.rarity'), current_setting('test.rarity')],
    p_factions => array[current_setting('test.faction')]) -> 'events') e
  where e ->> 'title' = 'Solo rarità';
  assert v_event -> 'rarities' = jsonb_build_array(current_setting('test.rarity'))
    and v_event -> 'factions' = jsonb_build_array(current_setting('test.faction'))
    and v_event -> 'traits' = '[]'::jsonb, format('rule saved %s', v_event);
end $$;

reset role;
update public.events set starts_at = now() - interval '1 hour' where title = 'Solo rarità';
select set_config('test.event', (select id::text from public.events where title = 'Solo rarità'), false);
set local role authenticated;

-- Once started, the rule does not change.
do $$
declare
  v_rome timestamp := (now() at time zone 'Europe/Rome')::timestamp;
  v_event jsonb;
begin
  perform public.admin_save_event('Solo rarità', 'Prova', v_rome, v_rome + interval '4 days',
    '{}'::jsonb, '[]'::jsonb, p_id => current_setting('test.event')::uuid, p_rarities => '{}', p_factions => '{}');
  select e into v_event from jsonb_array_elements(public.admin_list_events() -> 'events') e
  where e ->> 'id' = current_setting('test.event');
  assert v_event -> 'rarities' = jsonb_build_array(current_setting('test.rarity'))
    and v_event -> 'factions' = jsonb_build_array(current_setting('test.faction')), 'the rule of a started event changed';
end $$;

-- Players see the rule.
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000b8", "role": "authenticated"}', true);
do $$
declare
  v_event jsonb := public.get_event() -> 'event';
begin
  assert v_event ->> 'title' = 'Solo rarità', 'running event';
  assert v_event -> 'admitted' = public.event_admitted_description('{}', array[current_setting('test.rarity')], array[current_setting('test.faction')])
    and jsonb_array_length(v_event -> 'admitted') = 2, format('admitted %s', v_event -> 'admitted');
  assert (v_event ->> 'admitted_characters')::integer = current_setting('test.count')::integer, 'admitted characters';
end $$;

-- Two bot matches won: one with an admitted team, one with an outsider. Only the first earns points.
reset role;

do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000b8';
  v_threats uuid[];
  v_levels integer[];
  v_admitted uuid[];
  v_match uuid;
begin
  select array_agg(id order by level, code), array_agg(level order by level, code) into v_threats, v_levels
  from (select distinct on (level) id, level, code from public.threat_definitions
        where region = 'megara' and level <= 5 order by level, code) t;
  select array_agg(d.id order by d.code) into v_admitted
  from (select d.id, d.code from public.card_definitions d
        where d.is_active and d.unlock_level is null
          and d.rarity_code = current_setting('test.rarity') and d.faction = current_setting('test.faction')
        order by d.code limit 5) d;

  insert into public.matches (mode, bot_difficulty, player_a, threat_ids, threat_levels)
  values ('bot', 'easy', v_user, v_threats, v_levels) returning id into v_match;
  insert into public.match_teams (match_id, side, user_id, definition_ids) values (v_match, 'a', v_user, v_admitted);
  perform public.finish_match(v_match, 'a', 'completed');
  perform set_config('test.match_in', v_match::text, false);

  insert into public.matches (mode, bot_difficulty, player_a, threat_ids, threat_levels)
  values ('bot', 'easy', v_user, v_threats, v_levels) returning id into v_match;
  insert into public.match_teams (match_id, side, user_id, definition_ids)
  values (v_match, 'a', v_user, v_admitted[1:4] || current_setting('test.outsider')::uuid);
  perform public.finish_match(v_match, 'a', 'completed');
  perform set_config('test.match_out', v_match::text, false);

  assert (select sum(points) from public.event_points where ref_id = current_setting('test.match_in')::uuid) = 10,
    'an admitted team earned no points';
  assert not exists (select 1 from public.event_points where ref_id = current_setting('test.match_out')::uuid),
    'a team with an outsider earned points';
end $$;

-- The result screens: points for the first, "not admitted" for the second.
set local role authenticated;
do $$
declare
  v_in jsonb := public.get_event_points_for(current_setting('test.match_in')::uuid);
  v_out jsonb := public.get_event_points_for(current_setting('test.match_out')::uuid);
begin
  assert (v_in ->> 'points')::integer = 10 and v_in -> 'not_admitted' is null, format('admitted %s', v_in);
  assert (v_out ->> 'points')::integer = 0 and (v_out ->> 'not_admitted')::boolean
    and v_out ->> 'title' = 'Solo rarità', format('not admitted %s', v_out);
end $$;

-- The helpers stay on the server.
do $$
begin
  begin
    perform public.event_team_admitted('{}', '{}', '{}', '{}');
    raise exception 'ASSERT: a player called event_team_admitted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.event_admitted_count('{}', '{}', '{}');
    raise exception 'ASSERT: a player called event_admitted_count';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;

select 'event rarity and faction: all assertions passed' as result;
