-- Integration test for fielding artwork variants (SPEC §4.6): a team accepts a
-- copy with a variant the player owns, never two copies of one character nor
-- another player's variant; in Conquest a fielded variant counts as at stake;
-- the match shows the variant's drawing; a saved formation remembers the
-- characters, so a lost copy can fall back to another one. Runs inside a
-- rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'tv-a@example.test', '{"full_name": "Varianti A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'tv-b@example.test', '{"full_name": "Varianti B"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

create function pg_temp.give(p_user uuid, p_code text, p_style text) returns uuid language sql as $$
  insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
  select d.id, p_user, 'pack', v.id
  from public.card_definitions d
  left join public.card_variants v on v.definition_id = d.id and v.style = p_style
  where d.code = p_code
  returning id
$$;

-- A owns P001 as base and as neon, P072 as neon only, P080 as base; B owns P080 as neon.
-- Starters of other characters fill the team.
create temp table tv on commit drop as
select
  pg_temp.give('00000000-0000-4000-8000-0000000000a1', 'P001', null) as a_p001_base,
  pg_temp.give('00000000-0000-4000-8000-0000000000a1', 'P001', 'neon') as a_p001_neon,
  pg_temp.give('00000000-0000-4000-8000-0000000000a1', 'P072', 'neon') as a_p072_neon,
  pg_temp.give('00000000-0000-4000-8000-0000000000a1', 'P080', null) as a_p080_base,
  pg_temp.give('00000000-0000-4000-8000-0000000000b2', 'P080', 'neon') as b_p080_neon;

create temp table tv_starters on commit drop as
select array_agg(s.id) as ids from (
  select i.id from public.card_instances i
  join public.card_definitions d on d.id = i.definition_id
  where i.owner_id = '00000000-0000-4000-8000-0000000000a1' and i.is_starter and d.code not in ('P001', 'P072', 'P080')
  order by i.acquired_at, i.id limit 3
) s;
grant select on tv, tv_starters to authenticated;

do $$
declare
  t record;
  s uuid[] := (select ids from tv_starters);
  v_definitions uuid[];
  v_payload jsonb;
begin
  select * into t from tv;
  assert t.a_p001_neon is not null and t.a_p072_neon is not null and t.b_p080_neon is not null, 'test variants missing';
  assert cardinality(s) = 3, 'test starters missing';

  -- Variants fielded instead of the base copy, or as the only copy.
  v_definitions := public.check_team('00000000-0000-4000-8000-0000000000a1', s || t.a_p001_neon || t.a_p072_neon);
  assert v_definitions[4] = (select id from public.card_definitions where code = 'P001'), 'variant copy not read as its character';
  -- Bigger squads (Allarme Triplo, Quadrante) take the same copies.
  perform public.check_team_of('00000000-0000-4000-8000-0000000000a1', s || t.a_p001_neon || t.a_p072_neon, 5);

  -- Never the base and the variant of one character together.
  begin
    perform public.check_team('00000000-0000-4000-8000-0000000000a1', s[1:2] || t.a_p001_base || t.a_p001_neon || t.a_p072_neon);
    raise exception 'ASSERT: base and variant of one character accepted';
  exception when invalid_parameter_value then
    assert sqlerrm = 'duplicate_character', sqlerrm;
  end;

  -- Never another player's variant.
  begin
    perform public.check_team('00000000-0000-4000-8000-0000000000a1', s || t.a_p001_neon || t.b_p080_neon);
    raise exception 'ASSERT: another player''s variant accepted';
  exception when invalid_parameter_value then
    assert sqlerrm = 'card_not_owned', sqlerrm;
  end;

  -- Conquest: three starters and two variants are only two cards at stake;
  -- with the base copy of a third non-starter the team is accepted.
  update public.profiles set conquest_unlocked = true where id = '00000000-0000-4000-8000-0000000000a1';
  begin
    perform public.check_conquest_team('00000000-0000-4000-8000-0000000000a1', s || t.a_p001_neon || t.a_p072_neon);
    raise exception 'ASSERT: a Conquest team with two cards at stake accepted';
  exception when others then
    assert sqlerrm = 'not_enough_conquerable', sqlerrm;
  end;
  perform public.check_conquest_team('00000000-0000-4000-8000-0000000000a1',
    s[1:2] || t.a_p080_base || t.a_p001_neon || t.a_p072_neon);

  -- The match shows the fielded copy's drawing.
  v_payload := public.card_payload((select id from public.card_definitions where code = 'P001'), t.a_p001_neon);
  assert v_payload ->> 'art_url' = (select v.art_url from public.card_variants v join public.card_definitions d on d.id = v.definition_id
                                    where d.code = 'P001' and v.style = 'neon'), 'variant drawing not in the match';
  assert v_payload -> 'variant' ->> 'style' = 'neon', 'variant not marked in the match';
end $$;

-- A formation remembers the copies and their characters.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);

do $$
declare
  t record;
  s uuid[] := (select ids from tv_starters);
  v_formation public.formations;
begin
  select * into t from tv;
  v_formation := public.save_formation(null, 'Varianti', s || t.a_p001_neon || t.a_p072_neon);
  assert v_formation.card_instance_ids[4] = t.a_p001_neon, 'variant copy not saved';
  assert v_formation.definition_ids = (
    select array_agg(i.definition_id order by u.ord)
    from unnest(s || t.a_p001_neon || t.a_p072_neon) with ordinality as u(id, ord)
    join public.card_instances i on i.id = u.id
  ), 'characters not saved in the team order';

  v_formation := public.save_formation(v_formation.id, 'Base', s || t.a_p001_base || t.a_p072_neon);
  assert v_formation.card_instance_ids[4] = t.a_p001_base, 'formation not updated';
  assert v_formation.definition_ids[4] = (select id from public.card_definitions where code = 'P001'), 'updated characters not saved';
end $$;

-- The neon P001 goes to B: A still reads which character the formation's copy was.
reset role;
update public.card_instances set owner_id = '00000000-0000-4000-8000-0000000000b2' where id = (select a_p001_neon from tv);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);

do $$
declare
  t record;
  s uuid[] := (select ids from tv_starters);
  v_formation public.formations;
begin
  select * into t from tv;
  v_formation := public.save_formation(null, 'Persa', s || t.a_p001_base || t.a_p072_neon);
  update public.formations set card_instance_ids[4] = t.a_p001_neon where id = v_formation.id;
  raise exception 'ASSERT: a player wrote a formation directly';
exception when insufficient_privilege then
  null;
end $$;

do $$
begin
  assert exists (
    select 1 from public.formations
    where name = 'Base' and definition_ids[4] = (select id from public.card_definitions where code = 'P001')
  ), 'formation characters not readable by their player';
  assert not exists (select 1 from public.card_instances where id = (select a_p001_neon from tv)),
    'a lost copy is still readable';
end $$;

rollback;
