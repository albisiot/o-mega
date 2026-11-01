-- Integration test for M2 (character catalog, powers, threats).
-- Runs against the linked project inside a transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

-- Catalog content (runs as the migration owner).
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.card_definitions where is_active;
  assert v_count = 104, format('expected 104 characters, got %s', v_count);

  assert (
    select jsonb_object_agg(rarity_code, n) from (
      select rarity_code, count(*) as n from public.card_definitions group by rarity_code
    ) s
  ) = '{"delta": 40, "gamma": 29, "beta": 18, "alfa": 10, "omega": 7}'::jsonb,
    'unexpected rarity distribution';

  -- Same ability budget for every card of a rarity (the rarest have the fewest points).
  assert not exists (
    select 1 from public.card_definitions d
    where (select sum(s.value::integer) from jsonb_each_text(d.stats) as s) <> case d.rarity_code
      when 'delta' then 54 when 'gamma' then 54 when 'beta' then 53 when 'alfa' then 52 when 'omega' then 51 end
  ), 'a card has the wrong ability budget';

  -- Delta cards have no power, every rarer card has one.
  assert not exists (
    select 1 from public.card_definitions d join public.rarity_definitions r on r.code = d.rarity_code
    where (r.rank = 1) <> (d.power_code is null)
  ), 'power availability does not follow rarity';

  -- Gamma and Beta get simple powers, Alfa and Omega distinctive ones.
  assert not exists (
    select 1 from public.card_definitions d
    join public.rarity_definitions r on r.code = d.rarity_code
    join public.power_definitions p on p.code = d.power_code
    where (r.rank in (2, 3) and p.tier <> 'simple') or (r.rank in (4, 5) and p.tier <> 'distinctive')
  ), 'power tier does not match rarity';

  select count(*) into v_count from public.threat_definitions where is_active;
  assert v_count = 60, format('expected 60 threats, got %s', v_count);

  assert not exists (
    select level from public.threat_definitions group by level having count(*) <> 10
  ), 'every level must have 10 threats';

  assert (select count(distinct level) from public.threat_definitions) = 6, 'levels 1-6 must all exist';

  -- Every ability is required by at least 10 threats across the catalog.
  assert not exists (
    select 1 from public.ability_definitions a
    where (select count(*) from public.threat_definitions t where a.code = any (t.required_abilities)) < 10
  ), 'some ability is almost never required by threats';
end $$;

-- Catalog validation rejects malformed rows.
do $$
declare
  v_stats jsonb := '{"FOR":5,"VEL":5,"RES":5,"INT":5,"VOL":5,"PER":5,"ENE":4,"MAG":4,"PSI":4,"COM":4,"TEC":4,"FUR":4}';
begin
  begin
    insert into public.card_definitions (code, name, faction, rarity_code, stats, power_code, power_params)
    values ('TEST_P1', 'Senza parametri', 'heroes', 'gamma', v_stats, 'ability_bonus', '{"bonus": 2}');
    raise exception 'ASSERT: a power with missing params was accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
  end;

  begin
    insert into public.card_definitions (code, name, faction, rarity_code, stats, power_code, power_params)
    values ('TEST_P2', 'Abilità ignota', 'heroes', 'gamma', v_stats, 'ability_bonus', '{"ability": "XYZ", "bonus": 2}');
    raise exception 'ASSERT: a power with an unknown ability was accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
  end;

  begin
    insert into public.card_definitions (code, name, faction, rarity_code, stats, power_code, power_params)
    values ('TEST_P3', 'Livelli invertiti', 'heroes', 'beta', v_stats, 'level_bonus',
            '{"min_level": 5, "max_level": 2, "bonus": 2}');
    raise exception 'ASSERT: a power with inverted levels was accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
  end;

  begin
    insert into public.card_definitions (code, name, faction, rarity_code, stats, power_params)
    values ('TEST_P4', 'Parametri orfani', 'heroes', 'delta', v_stats, '{"bonus": 2}');
    raise exception 'ASSERT: power params without a power were accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
  end;

  begin
    insert into public.threat_definitions (code, name, level, required_abilities)
    values ('TEST_T1', 'Conteggio errato', 3, array['FOR', 'VEL']);
    raise exception 'ASSERT: a threat with the wrong number of abilities was accepted';
  exception when check_violation then null;
  end;

  begin
    insert into public.threat_definitions (code, name, level, required_abilities)
    values ('TEST_T2', 'Doppione', 2, array['FOR', 'FOR']);
    raise exception 'ASSERT: a threat with duplicate abilities was accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
  end;

  begin
    insert into public.threat_definitions (code, name, level, required_abilities)
    values ('TEST_T3', 'Abilità ignota', 1, array['XYZ']);
    raise exception 'ASSERT: a threat with an unknown ability was accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
  end;
end $$;

-- Signed-in players read characters and powers, never the threat catalog.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);

do $$
begin
  assert (select count(*) from public.card_definitions) = 104, 'players cannot read the full catalog';
  assert (select count(*) from public.power_definitions) = 11, 'players cannot read powers';
  begin
    perform 1 from public.threat_definitions;
    raise exception 'ASSERT: players can read the threat catalog';
  exception when insufficient_privilege then null;
  end;
end $$;

set local role anon;

do $$
begin
  assert (select count(*) from public.power_definitions) = 11, 'anon cannot read powers';
  begin
    perform 1 from public.threat_definitions;
    raise exception 'ASSERT: anon can read the threat catalog';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;

select 'catalog: all assertions passed' as result;
