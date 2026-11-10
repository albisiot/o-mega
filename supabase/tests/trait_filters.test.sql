-- Integration test for traits in the admin pages and in events: the admin
-- payloads carry the traits of every card and the catalog; an event can admit
-- only characters with some traits, refuses unknown traits or too few
-- characters, and pays points only to teams made entirely of admitted
-- characters; the result screen says when a team was not admitted. Runs inside
-- a transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000a7', 'authenticated', 'authenticated', 'trait-admin@example.test',
   '{"full_name": "Trait Admin"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000a8', 'authenticated', 'authenticated', 'trait-player@example.test',
   '{"full_name": "Trait Player"}', now(), now());

-- The broadest trait (most characters) and a character without it.
do $$
declare
  v_trait text;
begin
  select ct.trait_code into v_trait
  from public.card_definition_traits ct
  join public.card_definitions d on d.id = ct.definition_id
  where d.is_active and d.unlock_level is null
  group by ct.trait_code
  order by count(*) desc, ct.trait_code
  limit 1;
  perform set_config('test.trait', v_trait, false);
  perform set_config('test.outsider', (
    select d.id::text from public.card_definitions d
    where d.is_active and d.unlock_level is null and not public.card_matches_traits(d.id, array[v_trait])
    order by d.code limit 1), false);
  perform set_config('test.trait_count', public.trait_admitted_count(array[v_trait])::text, false);
  -- One trait per category, as narrow as the catalog allows.
  perform set_config('test.narrow', (
    select array[o.code, n.code, g.code]::text
    from public.traits o, public.traits n, public.traits g
    where o.category_code = 'origin' and n.category_code = 'nature' and g.category_code = 'group'
    order by public.trait_admitted_count(array[o.code, n.code, g.code]), o.code, n.code, g.code
    limit 1), false);
  perform set_config('test.narrow_too_few', (
    public.trait_admitted_count(current_setting('test.narrow')::text[]) < public.config_int('events.min_admitted_characters')
  )::text, false);
end $$;

-- No other event in the way of the one this test runs.
update public.events set is_active = false where is_active;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000a8", "role": "authenticated"}', true);
do $$ begin perform public.bootstrap_player(); end $$;

select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000a7", "role": "authenticated"}', true);
do $$ begin perform public.bootstrap_player(); end $$;

reset role;
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000000a7');
set local role authenticated;

-- The three admin payloads: the catalog, and the traits of every card.
do $$
declare
  v_payload jsonb;
begin
  foreach v_payload in array array[
    public.admin_list_pack_cards(), public.admin_list_special_packs(), public.admin_list_events()
  ] loop
    assert jsonb_array_length(v_payload -> 'trait_catalog') = (select count(*) from public.trait_categories),
      'trait catalog';
    assert (select sum(jsonb_array_length(c -> 'traits')) from jsonb_array_elements(v_payload -> 'trait_catalog') c)
      = (select count(*) from public.traits), 'traits in the catalog';
    assert not exists (
      select 1 from jsonb_array_elements(v_payload -> 'cards') c
      join public.card_definitions d on d.code = c ->> 'code'
      where c -> 'traits' <> coalesce((select jsonb_agg(ct.trait_code order by ct.trait_code)
                                       from public.card_definition_traits ct where ct.definition_id = d.id), '[]'::jsonb)
    ), 'card traits';
    assert exists (select 1 from jsonb_array_elements(v_payload -> 'cards') c where jsonb_array_length(c -> 'traits') > 0),
      'cards without traits';
  end loop;
end $$;

-- Unknown traits, and rules that admit fewer characters than an Emergenza squad, are refused.
do $$
declare
  v_rome timestamp := (now() at time zone 'Europe/Rome')::timestamp;
  v_narrow text[] := current_setting('test.narrow')::text[];
begin
  begin
    perform public.admin_save_event('Tratti furbi', '', v_rome + interval '1 day', v_rome + interval '2 days',
      '{}'::jsonb, '[{"points": 100, "coins": 10}]'::jsonb, p_traits => array['origin.nope']);
    raise exception 'ASSERT: accepted an unknown trait';
  exception when raise_exception then
    assert sqlerrm = 'event_invalid_traits', sqlerrm;
  end;

  if current_setting('test.narrow_too_few')::boolean then
    begin
      perform public.admin_save_event('Tratti stretti', '', v_rome + interval '1 day', v_rome + interval '2 days',
        '{}'::jsonb, '[{"points": 100, "coins": 10}]'::jsonb, p_traits => v_narrow);
      raise exception 'ASSERT: accepted too few characters';
    exception when raise_exception then
      assert sqlerrm = 'event_invalid_traits', sqlerrm;
    end;
  end if;
end $$;

-- A running event that admits only the broadest trait.
do $$
declare
  v_rome timestamp := (now() at time zone 'Europe/Rome')::timestamp;
  v_list jsonb;
  v_event jsonb;
begin
  v_list := public.admin_save_event('Solo tratto', 'Prova', v_rome + interval '1 day', v_rome + interval '3 days',
    '{"bot": {"win": 10, "draw": 5, "loss": 3}, "emergency": {"passed": 5}}'::jsonb,
    '[{"points": 1000, "coins": 10}]'::jsonb,
    p_traits => array[current_setting('test.trait'), current_setting('test.trait')]);
  select e into v_event from jsonb_array_elements(v_list -> 'events') e where e ->> 'title' = 'Solo tratto';
  assert v_event -> 'traits' = jsonb_build_array(current_setting('test.trait')), format('traits saved %s', v_event);
end $$;

reset role;
update public.events set starts_at = now() - interval '1 hour' where title = 'Solo tratto';
select set_config('test.event', (select id::text from public.events where title = 'Solo tratto'), false);
set local role authenticated;

-- Once started, the rule does not change.
do $$
declare
  v_rome timestamp := (now() at time zone 'Europe/Rome')::timestamp;
begin
  perform public.admin_save_event('Solo tratto', 'Prova', v_rome, v_rome + interval '4 days',
    '{}'::jsonb, '[]'::jsonb, p_id => current_setting('test.event')::uuid, p_traits => '{}');
  assert (select e -> 'traits' from jsonb_array_elements(public.admin_list_events() -> 'events') e
          where e ->> 'id' = current_setting('test.event')) = jsonb_build_array(current_setting('test.trait')),
    'the rule of a started event changed';
end $$;

-- Players see the rule.
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000a8", "role": "authenticated"}', true);
do $$
declare
  v_event jsonb := public.get_event() -> 'event';
begin
  assert v_event ->> 'title' = 'Solo tratto', 'running event';
  assert jsonb_array_length(v_event -> 'admitted') = 1
    and v_event -> 'admitted' -> 0 -> 'traits' ->> 0 = (select name from public.traits where code = current_setting('test.trait')),
    format('admitted %s', v_event -> 'admitted');
  assert (v_event ->> 'admitted_characters')::integer = current_setting('test.trait_count')::integer,
    'admitted characters';
end $$;

-- Two bot matches won: one with an admitted team, one with an outsider. Only the first earns points.
reset role;

do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000a8';
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
        where d.is_active and d.unlock_level is null and public.card_matches_traits(d.id, array[current_setting('test.trait')])
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

  assert public.event_team_admitted('{}', '{}'), 'no rule admits everyone';
  assert not public.event_team_admitted(array[current_setting('test.trait')], '{}'), 'an empty team is admitted';
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
    and v_out ->> 'title' = 'Solo tratto' and (v_out ->> 'total')::integer = 10, format('not admitted %s', v_out);
  assert public.get_event_points_for(gen_random_uuid()) is null, 'an unknown match';
end $$;

-- The helpers stay on the server.
do $$
begin
  begin
    perform public.event_team_admitted('{}', '{}');
    raise exception 'ASSERT: a player called event_team_admitted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.trait_catalog_payload();
    raise exception 'ASSERT: a player called trait_catalog_payload';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;

select 'trait filters: all assertions passed' as result;
