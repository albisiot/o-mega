-- Integration test for the Novecielo (SPEC §5.4): the sixth place beyond Nuova Megara, its
-- three threats and its rule, Una sola forza on Energia and Psiche.
-- Runs inside a rolled-back transaction:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

do $$
declare
  v_ids uuid[] := array(
    select t.id from unnest(array['T213', 'T414', 'T613', 'T101', 'T301']) with ordinality as c(code, ord)
    join public.threat_definitions t on t.code = c.code order by c.ord
  );
  v_trama jsonb := '{"code": "one_force", "abilities": ["ENE", "PSI"]}';
  v_mods jsonb;
  v_drawn integer;
begin
  -- The catalog: three usual threats, levels 2, 4 and 6, each requiring Energia and Psiche.
  assert (select count(*) from public.threat_definitions where region = 'novecielo' and is_active) = 3, 'three threats';
  assert (
    select array_agg(level order by level) from public.threat_definitions where region = 'novecielo'
  ) = array[2, 4, 6], 'levels 2, 4 and 6';
  assert not exists (
    select 1 from public.threat_definitions
    where region = 'novecielo'
      and (modifier_code is distinct from 'one_force' or rarity_code is not null
           or not (required_abilities @> array['ENE', 'PSI']))
  ), 'every threat requires Energia and Psiche under Una sola forza';
  assert (
    select public.place_modifier(modifier_code, modifier_params) from public.threat_definitions where code = 'T414'
  ) = v_trama, 'la Trama';

  -- The draw: the Novecielo keeps its rule, the drawn modifiers go to Nuova Megara only.
  for i in 1..100 loop
    v_mods := public.draw_match_modifiers(v_ids);
    assert v_mods -> 0 = v_trama and v_mods -> 1 = v_trama and v_mods -> 2 = v_trama, 'the place''s rule on its rounds';
    select count(*) into v_drawn from jsonb_array_elements(v_mods) with ordinality as e(m, ord)
    where e.ord > 3 and jsonb_typeof(e.m) = 'object';
    assert v_drawn between 1 and 2, format('drawn modifiers on Nuova Megara: %s', v_drawn);
  end loop;

  -- A story mission rewriting the modifiers keeps the rule.
  v_mods := public.with_place_modifiers('[{"code": "focus"}, null, null, {"code": "weak_link"}, null]', v_ids);
  assert v_mods -> 0 = v_trama and v_mods -> 3 = '{"code": "weak_link"}'::jsonb, format('modifiers kept: %s', v_mods);

  -- Sfide a tema: the Novecielo is a place like the others, and not with levels.
  assert public.challenge_normalize_match_rules('classic', '{"place": "novecielo"}') ->> 'place' = 'novecielo',
    'place accepted';
  begin
    perform public.challenge_normalize_match_rules('classic', '{"place": "novecielo", "levels": [2]}');
    raise exception 'ASSERT: a place with levels';
  exception when raise_exception then
    if sqlerrm like 'ASSERT%' then raise; end if;
  end;
  begin
    perform public.challenge_normalize_match_rules('classic', '{"place": "strappo"}');
    raise exception 'ASSERT: an unknown place';
  exception when raise_exception then
    if sqlerrm like 'ASSERT%' then raise; end if;
  end;

  -- Still no place that is not in the list.
  begin
    insert into public.threat_definitions (code, name, level, required_abilities, region)
    values ('TX03', 'Prova', 1, array['FOR'], 'luna');
    raise exception 'ASSERT: an unknown place was accepted';
  exception when check_violation then null;
  end;
end $$;

rollback;

select 'novecielo: all assertions passed' as result;
