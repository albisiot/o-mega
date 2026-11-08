-- Integration test for choosing the cards packs can give: only admins change the
-- flag, held-back cards never come out, an empty rarity hands its weight to the
-- others and packs always keep a card for the guarantee. Runs inside a
-- transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000d1', 'authenticated', 'authenticated', 'pool-admin@example.test',
   '{"full_name": "Pool Admin"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000d2', 'authenticated', 'authenticated', 'pool-player@example.test',
   '{"full_name": "Pool Player"}', now(), now());

set local role authenticated;

-- A normal player can neither read the list nor change the flag.
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000d2", "role": "authenticated"}', true);

do $$
declare
  v_code text := (select d.code from public.card_definitions d where d.is_active and d.unlock_level is null limit 1);
begin
  perform public.bootstrap_player();

  begin
    perform public.admin_list_pack_cards();
    raise exception 'ASSERT: a player listed the pack cards';
  exception when insufficient_privilege then
    assert sqlerrm = 'not_admin', sqlerrm;
  end;
  begin
    perform public.admin_set_cards_in_packs(array[v_code], false);
    raise exception 'ASSERT: a player changed the flag';
  exception when insufficient_privilege then
    assert sqlerrm = 'not_admin', sqlerrm;
  end;
  begin
    perform public.admin_pack_cards_payload();
    raise exception 'ASSERT: a player read the payload directly';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.card_definitions set in_packs = false where code = v_code;
    raise exception 'ASSERT: a player updated a card definition';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000d1", "role": "authenticated"}', true);

do $$
begin
  perform public.bootstrap_player();
end $$;

reset role;
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000000d1');
-- Start from every card in packs, whatever the live flags are.
update public.card_definitions set in_packs = true where not in_packs;
set local role authenticated;

-- The list: every card the flag applies to, none of the level cards.
do $$
declare
  v_list jsonb := public.admin_list_pack_cards();
begin
  assert jsonb_array_length(v_list -> 'cards') = (
    select count(*) from public.card_definitions d where d.is_active and d.unlock_level is null
  ), 'every pack card is listed';
  assert not exists (
    select 1 from jsonb_array_elements(v_list -> 'cards') as c
    join public.card_definitions d on d.code = c ->> 'code'
    where d.unlock_level is not null
  ), 'level cards are not listed';
  assert (select bool_and((c ->> 'in_packs')::boolean) from jsonb_array_elements(v_list -> 'cards') as c),
    'every card starts in packs';
  assert jsonb_array_length(v_list -> 'rarities') = (select count(*) from public.rarity_definitions), 'rarities';
  assert (v_list ->> 'guaranteed_min_rarity_rank')::integer = (public.get_pack_odds() ->> 'guaranteed_min_rarity_rank')::integer,
    'guarantee';
end $$;

-- Level cards, unknown codes and empty lists are refused.
do $$
declare
  v_level text := (select d.code from public.card_definitions d where d.unlock_level is not null limit 1);
  v_case text[];
begin
  foreach v_case slice 1 in array array[array[coalesce(v_level, 'NOPE')], array['NOPE']] loop
    begin
      perform public.admin_set_cards_in_packs(v_case, true);
      raise exception 'ASSERT: accepted %', v_case;
    exception when raise_exception then
      assert sqlerrm = 'pack_card_unavailable', format('%s: %s', v_case, sqlerrm);
    end;
  end loop;
  begin
    perform public.admin_set_cards_in_packs('{}', false);
    raise exception 'ASSERT: accepted an empty list';
  exception when raise_exception then
    assert sqlerrm = 'pack_card_unavailable', sqlerrm;
  end;
end $$;

-- Keep back every Delta but one, one Gamma and every Omega.
do $$
declare
  v_list jsonb;
  v_delta_keep text;
  v_gamma_out text;
begin
  select d.code into v_delta_keep
  from public.card_definitions d join public.rarity_definitions r on r.code = d.rarity_code
  where r.rank = 1 and d.is_active and d.unlock_level is null
  order by d.code limit 1;
  select d.code into v_gamma_out
  from public.card_definitions d join public.rarity_definitions r on r.code = d.rarity_code
  where r.rank = 2 and d.is_active and d.unlock_level is null
  order by d.code limit 1;
  perform set_config('test.delta_keep', v_delta_keep, true);

  v_list := public.admin_set_cards_in_packs(array(
    select d.code
    from public.card_definitions d join public.rarity_definitions r on r.code = d.rarity_code
    where d.is_active and d.unlock_level is null
      and ((r.rank = 1 and d.code <> v_delta_keep) or r.rank = 5 or d.code = v_gamma_out)
  ), false);

  assert (select (c ->> 'in_packs')::boolean from jsonb_array_elements(v_list -> 'cards') as c
          where c ->> 'code' = v_gamma_out) = false, 'flag not saved';
  assert (select count(*) from jsonb_array_elements(v_list -> 'cards') as c
          join public.card_definitions d on d.code = c ->> 'code'
          join public.rarity_definitions r on r.code = d.rarity_code
          where r.rank = 1 and (c ->> 'in_packs')::boolean) = 1, 'one Delta left';

  -- The shop shows the odds the draw uses: Omega is gone, the rest still adds up to 1.
  assert not exists (
    select 1 from jsonb_array_elements(public.get_pack_odds() -> 'odds') as o where (o ->> 'rank')::integer = 5
  ), 'an empty rarity is still in the shop odds';
  assert abs((select sum((o ->> 'probability')::numeric) from jsonb_array_elements(public.get_pack_odds() -> 'odds') as o) - 1)
    < 0.001, 'shop odds do not add up';
end $$;

-- Many packs, none with a held-back card or an Omega, the kept Delta among them.
reset role;

do $$
declare
  v_drawn uuid[] := '{}';
  v_pack uuid[];
  v_ranks integer[];
  v_guarantee integer := public.config_int('packs.guaranteed_min_rarity_rank');
begin
  for i in 1..300 loop
    v_pack := public.draw_pack_definitions(5, v_guarantee);
    assert cardinality(v_pack) = 5 and array_position(v_pack, null) is null, 'a pack slot is empty';
    select array_agg(r.rank) into v_ranks
    from unnest(v_pack) as u(id)
    join public.card_definitions d on d.id = u.id
    join public.rarity_definitions r on r.code = d.rarity_code;
    assert v_guarantee <= any (v_ranks), 'the guarantee was broken';
    v_drawn := v_drawn || v_pack;
  end loop;

  assert not exists (
    select 1 from unnest(v_drawn) as u(id) join public.card_definitions d on d.id = u.id where not d.in_packs
  ), 'a held-back card came out of a pack';
  assert not exists (
    select 1 from unnest(v_drawn) as u(id)
    join public.card_definitions d on d.id = u.id
    join public.rarity_definitions r on r.code = d.rarity_code
    where r.rank = 5
  ), 'an Omega came out with every Omega held back';
  assert exists (
    select 1 from unnest(v_drawn) as u(id) join public.card_definitions d on d.id = u.id
    where d.code = current_setting('test.delta_keep')
  ), 'the only Delta left never came out';

  -- The whole opening too: instances and variants follow the drawn card.
  for i in 1..20 loop
    perform public.open_pack('00000000-0000-4000-8000-0000000000d1', 'standard');
  end loop;
  assert not exists (
    select 1 from public.card_instances i join public.card_definitions d on d.id = i.definition_id
    where i.owner_id = '00000000-0000-4000-8000-0000000000d1' and i.acquired_via = 'pack' and not d.in_packs
  ), 'a held-back card came out of an opened pack';
  assert not exists (
    select 1 from public.card_instances i join public.card_variants v on v.id = i.variant_id
    where i.owner_id = '00000000-0000-4000-8000-0000000000d1' and v.definition_id <> i.definition_id
  ), 'a variant of another card';
end $$;

set local role authenticated;

-- Packs keep a card for the guarantee: holding back everything from Gamma up is refused
-- and changes nothing.
do $$
declare
  v_before integer := (select count(*) from public.card_definitions where in_packs);
begin
  begin
    perform public.admin_set_cards_in_packs(array(
      select d.code
      from public.card_definitions d join public.rarity_definitions r on r.code = d.rarity_code
      where d.is_active and d.unlock_level is null
        and r.rank >= (public.get_pack_odds() ->> 'guaranteed_min_rarity_rank')::integer
    ), false);
    raise exception 'ASSERT: packs were left without a card for the guarantee';
  exception when raise_exception then
    assert sqlerrm = 'pack_pool_empty', sqlerrm;
  end;
  assert (select count(*) from public.card_definitions where in_packs) = v_before, 'a refused change was saved';
end $$;

-- Ticked again, every card is back and Omega returns to the shop odds.
do $$
declare
  v_list jsonb := public.admin_set_cards_in_packs(array(
    select d.code from public.card_definitions d where d.is_active and d.unlock_level is null
  ), true);
begin
  assert (select bool_and((c ->> 'in_packs')::boolean) from jsonb_array_elements(v_list -> 'cards') as c),
    'every card back in packs';
  assert exists (
    select 1 from jsonb_array_elements(public.get_pack_odds() -> 'odds') as o where (o ->> 'rank')::integer = 5
  ), 'Omega back in the shop odds';
end $$;

-- Signed out: nothing at all.
set local role anon;

do $$
begin
  begin
    perform public.admin_list_pack_cards();
    raise exception 'ASSERT: anon listed the pack cards';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_set_cards_in_packs(array['P001'], false);
    raise exception 'ASSERT: anon changed the flag';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;

select 'pack card pool: all assertions passed' as result;
