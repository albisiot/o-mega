-- Integration test for the threats beyond Nuova Megara: each place has its own rule,
-- fixed for its threats; the drawn modifiers go only to the threats of Nuova Megara.
-- Runs inside a rolled-back transaction:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

-- The catalog: five places, three threats each, every one with its place's rule.
do $$
begin
  assert (select count(*) from public.threat_definitions where region <> 'megara' and is_active) = 15,
    'fifteen threats beyond Nuova Megara';
  assert not exists (
    select region from public.threat_definitions where region <> 'megara'
    group by region having count(*) <> 3 or count(distinct modifier_code) <> 1
  ), 'each place has three threats and one rule';
  assert not exists (
    select 1 from public.threat_definitions
    where (region = 'megara') <> (modifier_code is null)
  ), 'a rule on a threat of Nuova Megara, or a place without one';
  assert (select count(distinct level) from public.threat_definitions where region <> 'megara') = 6,
    'the places cover every level';
  assert (
    select public.place_modifier(modifier_code, modifier_params) from public.threat_definitions where code = 'T512'
  ) = '{"code": "abyss", "abilities": ["ENE", "MAG", "PSI"]}'::jsonb, 'Abissi';
  assert public.place_modifier('frost', '{}') = '{"code": "frost", "cap": 6}'::jsonb, 'Gelo from the configuration';
  assert public.place_modifier('duel', '{}') = '{"code": "duel", "count": 2}'::jsonb, 'Duello from the configuration';
  assert public.place_modifier('long_count', '{}') = '{"code": "long_count", "bonus": 3}'::jsonb, 'Il conto lungo';
  assert public.place_modifier(null, '{}') is null, 'Nuova Megara has no rule';

  begin
    insert into public.threat_definitions (code, name, level, required_abilities, region, modifier_code, modifier_params)
    values ('TX01', 'Prova', 1, array['FOR'], 'atlantis', 'abyss', '{"abilities": ["XYZ"]}');
    raise exception 'ASSERT: Abissi accepted an unknown ability';
  exception when raise_exception then
    if sqlerrm like 'ASSERT%' then raise; end if;
  end;
  begin
    insert into public.threat_definitions (code, name, level, required_abilities, modifier_code)
    values ('TX02', 'Prova', 1, array['FOR'], 'focus');
    raise exception 'ASSERT: a drawn modifier became a fixed rule';
  exception when check_violation then null;
  end;
end $$;

-- The draw: the places keep their rule, 1 or 2 drawn modifiers on the other rounds.
do $$
declare
  v_ids uuid[] := array(
    select t.id from unnest(array['T111', 'T212', 'T101', 'T201', 'T301']) with ordinality as c(code, ord)
    join public.threat_definitions t on t.code = c.code order by c.ord
  );
  v_all_places uuid[] := array(
    select t.id from unnest(array['T112', 'T211', 'T313', 'T412', 'T612']) with ordinality as c(code, ord)
    join public.threat_definitions t on t.code = c.code order by c.ord
  );
  v_mods jsonb;
  v_drawn integer;
begin
  for i in 1..300 loop
    v_mods := public.draw_match_modifiers(v_ids);
    assert jsonb_array_length(v_mods) = 5, 'one entry per round';
    assert v_mods -> 0 = '{"code": "tomb_silence"}'::jsonb, 'Silenzio della tomba on round 1';
    assert v_mods -> 1 = '{"code": "frost", "cap": 6}'::jsonb, 'Gelo on round 2';
    select count(*) into v_drawn from jsonb_array_elements(v_mods) with ordinality as e(m, ord)
    where e.ord > 2 and jsonb_typeof(e.m) = 'object';
    assert v_drawn between 1 and 2, format('drawn modifiers on Nuova Megara: %s', v_drawn);
    assert not exists (
      select 1 from jsonb_array_elements(v_mods) with ordinality as e(m, ord)
      where e.ord > 2 and jsonb_typeof(e.m) = 'object'
        and e.m ->> 'code' not in ('focus', 'weak_link', 'hostile_ground', 'underdogs')
    ), 'a place rule drawn on Nuova Megara';
    assert v_mods -> 2 ->> 'code' is distinct from 'weak_link', 'Anello debole on a threat with one ability';
  end loop;

  v_mods := public.draw_match_modifiers(v_all_places);
  assert (
    select array_agg(e.m ->> 'code' order by e.ord) from jsonb_array_elements(v_mods) with ordinality as e(m, ord)
  ) = array['abyss', 'long_count', 'duel', 'frost', 'frost'], 'only the places'' rules, nothing drawn';

  -- A story mission writes its own modifiers after creating the match: the places keep theirs.
  v_mods := public.with_place_modifiers('[{"code": "focus"}, null, {"code": "weak_link"}, null, null]', v_ids);
  assert v_mods = jsonb_build_array(
    '{"code": "tomb_silence"}'::jsonb, '{"code": "frost", "cap": 6}'::jsonb, '{"code": "weak_link"}'::jsonb, null, null
  ), format('modifiers kept: %s', v_mods);
end $$;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'world-a@example.test',
   '{"full_name": "Mondo A"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- A real match: the place's rule is stored, kept, and shown with the revealed threat.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000e1';
  v_team uuid[];
  v_bot uuid[];
  v_threats uuid[] := array(
    select t.id from unnest(array['T611', 'T101', 'T301', 'T212', 'T501']) with ordinality as c(code, ord)
    join public.threat_definitions t on t.code = c.code order by c.ord
  );
  v_match uuid;
  v_stored jsonb;
  v_payload jsonb;
begin
  select array_agg(id) into v_team from (
    select id from public.card_instances where owner_id = v_user order by acquired_at, id limit 5
  ) s;
  select array_agg(id) into v_bot from (
    select id from public.card_definitions where rarity_code = 'beta' order by code limit 5
  ) s;
  v_match := public.match_create_bot(v_user, 'easy', v_team, v_bot, v_threats);
  select threat_modifiers into v_stored from public.matches where id = v_match;
  assert v_stored -> 0 = '{"code": "tomb_silence"}'::jsonb, 'Silenzio della tomba stored';
  assert v_stored -> 3 = '{"code": "frost", "cap": 6}'::jsonb, 'Gelo stored';

  -- Silenzio della tomba switches powers off in round 1: Spia and Veggente read it.
  assert public.nullified_in_round(v_match, 1, 'a') and public.nullified_in_round(v_match, 1, 'b'),
    'Silenzio della tomba leaves the powers on';
  assert not public.nullified_in_round(v_match, 2, 'a'), 'round 2 has no silence';

  -- Rewriting the modifiers (as a story mission does) keeps the places' rules.
  update public.matches set threat_modifiers = '[null, null, null, null, null]' where id = v_match;
  select threat_modifiers into v_stored from public.matches where id = v_match;
  assert v_stored -> 0 ->> 'code' = 'tomb_silence' and v_stored -> 3 ->> 'code' = 'frost', 'rules lost on update';
  assert jsonb_typeof(v_stored -> 1) = 'null', 'a drawn modifier survived the update';

  v_payload := public.match_state_payload(v_match, 'a');
  assert v_payload -> 'rounds' -> 0 -> 'modifier' = '{"code": "tomb_silence"}'::jsonb, 'rule shown with the threat';
  assert v_payload -> 'rounds' -> 0 -> 'threat' ->> 'flavor' like 'La Sfinge%', 'flavor of the place';
end $$;

-- The clients never call the draw.
set local role authenticated;

do $$
begin
  begin
    perform public.draw_match_modifiers(array[]::uuid[]);
    raise exception 'ASSERT: a client called the draw';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;

select 'world threats: all assertions passed' as result;
