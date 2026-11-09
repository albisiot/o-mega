-- Integration test for special packs: only admins create and change them, the
-- server checks every field, the shop shows the odds the draw uses, a purchase
-- moves coins and cards in one transaction and only at the version the shop
-- showed, and the daily and standard packs do not change. Runs inside a
-- transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'special-admin@example.test',
   '{"full_name": "Special Admin"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated', 'special-player@example.test',
   '{"full_name": "Special Player"}', now(), now());

-- The cards the test uses: two Delta, one Beta, a card with a variant and a level card.
do $$
begin
  perform set_config('test.delta_a', (
    select d.code from public.card_definitions d join public.rarity_definitions r on r.code = d.rarity_code
    where r.rank = 1 and d.is_active and d.unlock_level is null order by d.code limit 1), false);
  perform set_config('test.delta_b', (
    select d.code from public.card_definitions d join public.rarity_definitions r on r.code = d.rarity_code
    where r.rank = 1 and d.is_active and d.unlock_level is null order by d.code offset 1 limit 1), false);
  perform set_config('test.beta', (
    select d.code from public.card_definitions d join public.rarity_definitions r on r.code = d.rarity_code
    where r.rank = 3 and d.is_active and d.unlock_level is null order by d.code limit 1), false);
  perform set_config('test.variant', (
    select d.code from public.card_definitions d
    where d.is_active and d.unlock_level is null
      and exists (select 1 from public.card_variants v where v.definition_id = d.id and v.is_active)
    order by d.code limit 1), false);
  perform set_config('test.level', coalesce((
    select d.code from public.card_definitions d where d.unlock_level is not null order by d.code limit 1), 'NOPE'), false);
  perform set_config('test.delta_rarity', (select code from public.rarity_definitions where rank = 1), false);
  perform set_config('test.beta_rarity', (select code from public.rarity_definitions where rank = 3), false);
end $$;

set local role authenticated;

-- A normal player cannot read, create, change or delete special packs, nor reach the tables.
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000e2", "role": "authenticated"}', true);

do $$
begin
  perform public.bootstrap_player();

  begin
    perform public.admin_list_special_packs();
    raise exception 'ASSERT: a player listed the special packs';
  exception when insufficient_privilege then
    assert sqlerrm = 'not_admin', sqlerrm;
  end;
  begin
    perform public.admin_save_special_pack('Pacchetto furbo', '', 'cyan', 1, 5, 100, 'card',
      jsonb_build_array(jsonb_build_object('code', current_setting('test.beta'), 'percent', 100)));
    raise exception 'ASSERT: a player created a special pack';
  exception when insufficient_privilege then
    assert sqlerrm = 'not_admin', sqlerrm;
  end;
  begin
    perform public.admin_delete_special_pack(gen_random_uuid());
    raise exception 'ASSERT: a player deleted a special pack';
  exception when insufficient_privilege then
    assert sqlerrm = 'not_admin', sqlerrm;
  end;
  begin
    perform 1 from public.special_packs;
    raise exception 'ASSERT: a player read the table';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.special_packs (name, color, price, cards_per_pack, variant_chance_percent, odds_mode)
    values ('Pacchetto furbo', 'cyan', 1, 5, 100, 'card');
    raise exception 'ASSERT: a player wrote the table';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.open_special_pack(auth.uid(), gen_random_uuid());
    raise exception 'ASSERT: a player opened a special pack for free';
  exception when insufficient_privilege then null;
  end;
  assert public.get_special_packs() is not null, 'the shop list';
end $$;

select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);

do $$
begin
  perform public.bootstrap_player();
end $$;

reset role;
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000000e1');
set local role authenticated;

-- Every wrong field is refused with its own error, and nothing is saved.
do $$
declare
  v_delta_a text := current_setting('test.delta_a');
  v_delta_b text := current_setting('test.delta_b');
  v_beta text := current_setting('test.beta');
  v_cards jsonb := jsonb_build_array(
    jsonb_build_object('code', v_delta_a), jsonb_build_object('code', v_delta_b), jsonb_build_object('code', v_beta));
  v_rarities jsonb := jsonb_build_array(
    jsonb_build_object('code', current_setting('test.delta_rarity'), 'percent', 60),
    jsonb_build_object('code', current_setting('test.beta_rarity'), 'percent', 40));
  v_case record;
begin
  for v_case in
    select * from (values
      ('ab', 'cyan', 100, 3, 5, 'rarity', v_cards, v_rarities, null::integer, null::timestamp, null::timestamp, 'special_pack_invalid_text'),
      ('Pacchetto', 'blu', 100, 3, 5, 'rarity', v_cards, v_rarities, null, null, null, 'special_pack_invalid_numbers'),
      ('Pacchetto', 'cyan', 0, 3, 5, 'rarity', v_cards, v_rarities, null, null, null, 'special_pack_invalid_numbers'),
      ('Pacchetto', 'cyan', 100, 11, 5, 'rarity', v_cards, v_rarities, null, null, null, 'special_pack_invalid_numbers'),
      ('Pacchetto', 'cyan', 100, 3, 101, 'rarity', v_cards, v_rarities, null, null, null, 'special_pack_invalid_numbers'),
      ('Pacchetto', 'cyan', 100, 3, 5, 'misto', v_cards, v_rarities, null, null, null, 'special_pack_invalid_numbers'),
      ('Pacchetto', 'cyan', 100, 3, 5, 'rarity', v_cards, v_rarities, null,
        '2030-01-02 10:00'::timestamp, '2030-01-01 10:00'::timestamp, 'special_pack_invalid_period'),
      ('Pacchetto', 'cyan', 100, 3, 5, 'rarity', v_cards, v_rarities, null, null, '2020-01-01 10:00'::timestamp,
        'special_pack_invalid_period'),
      ('Pacchetto', 'cyan', 100, 3, 5, 'rarity', '[]'::jsonb, '[]'::jsonb, null, null, null, 'special_pack_invalid_cards'),
      ('Pacchetto', 'cyan', 100, 3, 5, 'rarity', v_cards || jsonb_build_array(jsonb_build_object('code', v_beta)),
        v_rarities, null, null, null, 'special_pack_invalid_cards'),
      ('Pacchetto', 'cyan', 100, 3, 5, 'card',
        jsonb_build_array(jsonb_build_object('code', current_setting('test.level'), 'percent', 100)),
        '[]'::jsonb, null, null, null, 'special_pack_invalid_cards'),
      -- Rarity odds that add up to 99, miss a rarity, name one without cards, or have three decimals.
      ('Pacchetto', 'cyan', 100, 3, 5, 'rarity', v_cards,
        jsonb_build_array(jsonb_build_object('code', current_setting('test.delta_rarity'), 'percent', 59),
                          jsonb_build_object('code', current_setting('test.beta_rarity'), 'percent', 40)),
        null, null, null, 'special_pack_invalid_odds'),
      ('Pacchetto', 'cyan', 100, 3, 5, 'rarity', v_cards,
        jsonb_build_array(jsonb_build_object('code', current_setting('test.delta_rarity'), 'percent', 100)),
        null, null, null, 'special_pack_invalid_odds'),
      ('Pacchetto', 'cyan', 100, 3, 5, 'rarity',
        jsonb_build_array(jsonb_build_object('code', v_delta_a)), v_rarities, null, null, null, 'special_pack_invalid_odds'),
      ('Pacchetto', 'cyan', 100, 3, 5, 'card',
        jsonb_build_array(jsonb_build_object('code', v_delta_a, 'percent', 33.335),
                          jsonb_build_object('code', v_beta, 'percent', 66.665)),
        '[]'::jsonb, null, null, null, 'special_pack_invalid_odds'),
      -- Card odds missing, zero, a string or not adding up.
      ('Pacchetto', 'cyan', 100, 3, 5, 'card', v_cards, '[]'::jsonb, null, null, null, 'special_pack_invalid_odds'),
      ('Pacchetto', 'cyan', 100, 3, 5, 'card',
        jsonb_build_array(jsonb_build_object('code', v_delta_a, 'percent', 0),
                          jsonb_build_object('code', v_beta, 'percent', 100)),
        '[]'::jsonb, null, null, null, 'special_pack_invalid_odds'),
      ('Pacchetto', 'cyan', 100, 3, 5, 'card',
        jsonb_build_array(jsonb_build_object('code', v_delta_a, 'percent', 'molto'),
                          jsonb_build_object('code', v_beta, 'percent', 100)),
        '[]'::jsonb, null, null, null, 'special_pack_invalid_odds'),
      ('Pacchetto', 'cyan', 100, 3, 5, 'card',
        jsonb_build_array(jsonb_build_object('code', v_delta_a, 'percent', 50),
                          jsonb_build_object('code', v_beta, 'percent', 60)),
        '[]'::jsonb, null, null, null, 'special_pack_invalid_odds'),
      -- A guarantee in a one-card pack, above every chosen card, or of an unknown rank.
      ('Pacchetto', 'cyan', 100, 1, 5, 'rarity', v_cards, v_rarities, 3, null, null, 'special_pack_invalid_guarantee'),
      ('Pacchetto', 'cyan', 100, 3, 5, 'rarity', v_cards, v_rarities, 4, null, null, 'special_pack_invalid_guarantee'),
      ('Pacchetto', 'cyan', 100, 3, 5, 'rarity', v_cards, v_rarities, 99, null, null, 'special_pack_invalid_guarantee')
    ) as t(name, color, price, size, variant, mode, cards, rarities, guarantee, starts, ends, expected)
  loop
    begin
      perform public.admin_save_special_pack(
        p_name => v_case.name, p_description => '', p_color => v_case.color, p_price => v_case.price,
        p_cards_per_pack => v_case.size, p_variant_chance_percent => v_case.variant, p_odds_mode => v_case.mode,
        p_cards => v_case.cards, p_rarities => v_case.rarities, p_guaranteed_min_rarity_rank => v_case.guarantee,
        p_starts_at => v_case.starts, p_ends_at => v_case.ends);
      raise exception 'ASSERT: accepted a pack that should fail with %', v_case.expected;
    exception when raise_exception then
      assert sqlerrm = v_case.expected, format('expected %s, got %s', v_case.expected, sqlerrm);
    end;
  end loop;
  assert not exists (
    select 1 from jsonb_array_elements(public.admin_list_special_packs() -> 'packs') p where p ->> 'name' = 'Pacchetto'
  ), 'a refused pack was saved';
end $$;

-- A pack by rarity: Delta 60% shared by two cards, Beta 40%, a Beta guaranteed, no variants.
do $$
declare
  v_list jsonb := public.admin_save_special_pack(
    p_name => 'Prova rarità', p_description => 'Solo per il test', p_color => 'violet', p_price => 120,
    p_cards_per_pack => 3, p_variant_chance_percent => 0, p_odds_mode => 'rarity',
    p_cards => jsonb_build_array(
      jsonb_build_object('code', current_setting('test.delta_a')),
      jsonb_build_object('code', current_setting('test.delta_b')),
      jsonb_build_object('code', current_setting('test.beta'))),
    p_rarities => jsonb_build_array(
      jsonb_build_object('code', current_setting('test.delta_rarity'), 'percent', 60),
      jsonb_build_object('code', current_setting('test.beta_rarity'), 'percent', 40)),
    p_guaranteed_min_rarity_rank => 3);
  v_pack jsonb;
begin
  select p into v_pack from jsonb_array_elements(v_list -> 'packs') p where p ->> 'name' = 'Prova rarità';
  assert v_pack is not null, 'pack not saved';
  assert (v_pack ->> 'version')::integer = 1 and (v_pack ->> 'is_open')::boolean and (v_pack ->> 'openings')::integer = 0,
    format('new pack %s', v_pack);
  assert jsonb_array_length(v_pack -> 'cards') = 3 and jsonb_array_length(v_pack -> 'rarities') = 2, 'pool';
  assert not exists (
    select 1 from jsonb_array_elements(v_list -> 'cards') c
    join public.card_definitions d on d.code = c ->> 'code' where d.unlock_level is not null
  ), 'level cards offered to the admin';
  perform set_config('test.rarity_pack', v_pack ->> 'id', false);
end $$;

-- A pack by card: 90% the card with a variant, 10% the Beta, always with a variant.
do $$
declare
  v_list jsonb := public.admin_save_special_pack(
    p_name => 'Prova carte', p_description => '', p_color => 'green', p_price => 50,
    p_cards_per_pack => 5, p_variant_chance_percent => 100, p_odds_mode => 'card',
    p_cards => case when current_setting('test.variant') = current_setting('test.beta')
      then jsonb_build_array(jsonb_build_object('code', current_setting('test.beta'), 'percent', 100))
      else jsonb_build_array(
        jsonb_build_object('code', current_setting('test.variant'), 'percent', 90),
        jsonb_build_object('code', current_setting('test.beta'), 'percent', 10.00)) end,
    -- Ignored in 'card' mode.
    p_rarities => jsonb_build_array(jsonb_build_object('code', 'nope', 'percent', 1)));
begin
  perform set_config('test.card_pack',
    (select p ->> 'id' from jsonb_array_elements(v_list -> 'packs') p where p ->> 'name' = 'Prova carte'), false);
  assert current_setting('test.card_pack') <> '', 'card pack not saved';
end $$;

-- The shop: both packs, odds that add up, per card and per rarity as the admin set them.
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000e2", "role": "authenticated"}', true);

do $$
declare
  v_shop jsonb := public.get_special_packs();
  v_pack jsonb;
begin
  select p into v_pack from jsonb_array_elements(v_shop) p where p ->> 'id' = current_setting('test.rarity_pack');
  assert v_pack is not null, 'rarity pack not in the shop';
  assert (v_pack ->> 'price')::integer = 120 and (v_pack ->> 'cards_per_pack')::integer = 3
    and (v_pack ->> 'version')::integer = 1 and v_pack ->> 'color' = 'violet', format('shop pack %s', v_pack);
  assert v_pack ->> 'guaranteed_rarity_name' = (select name from public.rarity_definitions where rank = 3), 'guarantee name';
  assert (v_pack ->> 'variant_chance_percent')::integer = 0, 'variant chance';
  assert (select sum((o ->> 'probability')::numeric) from jsonb_array_elements(v_pack -> 'odds') o) = 1, 'rarity odds';
  assert (select (o ->> 'probability')::numeric from jsonb_array_elements(v_pack -> 'odds') o
          where o ->> 'code' = current_setting('test.beta_rarity')) = 0.4, 'Beta 40%';
  assert (select (c ->> 'probability')::numeric from jsonb_array_elements(v_pack -> 'cards') c
          where c ->> 'code' = current_setting('test.delta_a')) = 0.3, 'each Delta 30%';
  assert abs((select sum((c ->> 'probability')::numeric) from jsonb_array_elements(v_pack -> 'cards') c) - 1) < 0.0001,
    'card odds';
  assert exists (select 1 from jsonb_array_elements(v_shop) p where p ->> 'id' = current_setting('test.card_pack')),
    'card pack not in the shop';
end $$;

-- Coins for the player, from the ledger like every movement.
reset role;
insert into public.coin_ledger (user_id, amount, reason)
values ('00000000-0000-4000-8000-0000000000e2', 1000, 'admin_adjustment');
set local role authenticated;

-- Buying: an old version is refused and costs nothing; the right one moves coins and cards once.
do $$
declare
  v_pack uuid := current_setting('test.rarity_pack')::uuid;
  v_before integer := (public.get_pack_status() ->> 'coin_balance')::integer;
  v_opening jsonb;
begin
  begin
    perform public.buy_special_pack(v_pack, 2);
    raise exception 'ASSERT: bought a version the shop never showed';
  exception when raise_exception then
    assert sqlerrm = 'special_pack_changed', sqlerrm;
  end;
  begin
    perform public.buy_special_pack(gen_random_uuid(), 1);
    raise exception 'ASSERT: bought an unknown pack';
  exception when raise_exception then
    assert sqlerrm = 'special_pack_unavailable', sqlerrm;
  end;
  assert (public.get_pack_status() ->> 'coin_balance')::integer = v_before, 'a refused purchase cost coins';

  v_opening := public.buy_special_pack(v_pack, 1);
  assert v_opening ->> 'pack_type' = 'special' and v_opening ->> 'pack_name' = 'Prova rarità'
    and v_opening ->> 'pack_color' = 'violet', format('opening %s', v_opening);
  assert jsonb_array_length(v_opening -> 'cards') = 3, 'three cards';
  assert exists (select 1 from jsonb_array_elements(v_opening -> 'cards') c where (c -> 'rarity' ->> 'rank')::integer >= 3),
    'the guarantee was broken';
  assert not exists (
    select 1 from jsonb_array_elements(v_opening -> 'cards') c
    where c ->> 'code' not in (current_setting('test.delta_a'), current_setting('test.delta_b'), current_setting('test.beta'))
  ), 'a card outside the pack';
  assert not exists (select 1 from jsonb_array_elements(v_opening -> 'cards') c where c -> 'variant' <> 'null'::jsonb),
    'a variant with a 0% chance';
  assert (public.get_pack_status() ->> 'coin_balance')::integer = v_before - 120, 'price not paid';
  -- Shown again after a reload: same name.
  assert public.get_pack_opening((v_opening ->> 'id')::uuid) ->> 'pack_name' = 'Prova rarità', 'reload';
  perform set_config('test.opening', v_opening ->> 'id', false);
end $$;

-- In the ledgers: one coin movement and one transfer per card, all pointing at the opening.
reset role;

do $$
declare
  v_opening uuid := current_setting('test.opening')::uuid;
  v_uid uuid := '00000000-0000-4000-8000-0000000000e2';
begin
  assert (select count(*) from public.coin_ledger
          where user_id = v_uid and reason = 'pack_purchase' and amount = -120 and ref_id = v_opening) = 1, 'ledger row';
  assert (select count(*) from public.card_transfers t
          join public.pack_openings o on t.instance_id = any (o.card_instance_ids)
          where o.id = v_opening and t.reason = 'pack' and t.to_user = v_uid and t.from_user is null) = 3, 'transfers';
  assert (select special_pack_id from public.pack_openings where id = v_opening)
    = current_setting('test.rarity_pack')::uuid, 'opening without its pack';
end $$;

set local role authenticated;

-- The admin changes the price: the version goes up, the old one is refused, and
-- without enough coins the purchase fails and costs nothing.
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);

do $$
declare
  v_pack jsonb;
begin
  select p into v_pack from jsonb_array_elements(public.admin_save_special_pack(
    p_id => current_setting('test.rarity_pack')::uuid,
    p_name => 'Prova rarità', p_description => '', p_color => 'violet', p_price => 100000,
    p_cards_per_pack => 3, p_variant_chance_percent => 0, p_odds_mode => 'rarity',
    p_cards => jsonb_build_array(
      jsonb_build_object('code', current_setting('test.delta_a')),
      jsonb_build_object('code', current_setting('test.delta_b')),
      jsonb_build_object('code', current_setting('test.beta'))),
    p_rarities => jsonb_build_array(
      jsonb_build_object('code', current_setting('test.delta_rarity'), 'percent', 60),
      jsonb_build_object('code', current_setting('test.beta_rarity'), 'percent', 40)),
    p_guaranteed_min_rarity_rank => 3) -> 'packs') p
  where p ->> 'id' = current_setting('test.rarity_pack');
  assert (v_pack ->> 'version')::integer = 2 and (v_pack ->> 'openings')::integer = 1, format('changed %s', v_pack);
end $$;

select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000e2", "role": "authenticated"}', true);

do $$
declare
  v_before integer := (public.get_pack_status() ->> 'coin_balance')::integer;
begin
  begin
    perform public.buy_special_pack(current_setting('test.rarity_pack')::uuid, 1);
    raise exception 'ASSERT: bought at the old price';
  exception when raise_exception then
    assert sqlerrm = 'special_pack_changed', sqlerrm;
  end;
  begin
    perform public.buy_special_pack(current_setting('test.rarity_pack')::uuid, 2);
    raise exception 'ASSERT: bought without enough coins';
  exception when raise_exception then
    assert sqlerrm = 'insufficient_coins', sqlerrm;
  end;
  assert (public.get_pack_status() ->> 'coin_balance')::integer = v_before, 'a refused purchase cost coins';
end $$;

-- Many packs by card: only the chosen cards, about 90/10, always with a variant.
reset role;

do $$
declare
  v_pack uuid := current_setting('test.card_pack')::uuid;
  v_first integer := 0;
  v_definition uuid;
  v_standard uuid;
begin
  for i in 1..400 loop
    v_definition := public.draw_special_pack_card(v_pack, 0);
    if v_definition = (select id from public.card_definitions where code = current_setting('test.variant')) then
      v_first := v_first + 1;
    end if;
  end loop;
  if current_setting('test.variant') <> current_setting('test.beta') then
    -- 90% of 400 is 360; this window fails far less than once in a million runs.
    assert v_first between 320 and 395, format('the 90%% card came out %s times in 400', v_first);
  end if;

  for i in 1..10 loop
    perform public.open_special_pack('00000000-0000-4000-8000-0000000000e1', v_pack);
  end loop;
  assert not exists (
    select 1 from public.pack_openings o
    cross join unnest(o.card_instance_ids) as u(id)
    join public.card_instances ci on ci.id = u.id
    join public.card_definitions d on d.id = ci.definition_id
    where o.special_pack_id = v_pack
      and d.code not in (current_setting('test.variant'), current_setting('test.beta'))
  ), 'a card outside the pack';
  assert not exists (
    select 1 from public.pack_openings o
    cross join unnest(o.card_instance_ids) as u(id)
    join public.card_instances ci on ci.id = u.id
    join public.card_definitions d on d.id = ci.definition_id
    where o.special_pack_id = v_pack and d.code = current_setting('test.variant') and ci.variant_id is null
  ), 'a 100% variant did not come';

  -- The daily and standard packs are as before: no special pack, no special odds.
  v_standard := public.open_pack('00000000-0000-4000-8000-0000000000e1', 'standard');
  assert (select pack_type = 'standard' and special_pack_id is null from public.pack_openings where id = v_standard),
    'standard';
  assert not exists (select 1 from public.pack_openings where pack_type <> 'special' and special_pack_id is not null),
    'a standard opening points to a special pack';
  begin
    insert into public.pack_openings (user_id, pack_type, card_instance_ids, new_card_instance_ids)
    values ('00000000-0000-4000-8000-0000000000e1', 'special', '{}', '{}');
    raise exception 'ASSERT: a special opening without its pack';
  exception when check_violation then null;
  end;
end $$;

-- Off the shop: deactivated, not started yet, or over.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);

do $$
begin
  perform public.admin_set_special_pack_active(current_setting('test.card_pack')::uuid, false);
  assert not exists (select 1 from jsonb_array_elements(public.get_special_packs()) p
                     where p ->> 'id' = current_setting('test.card_pack')), 'a deactivated pack is on sale';
  begin
    perform public.buy_special_pack(current_setting('test.card_pack')::uuid, 1);
    raise exception 'ASSERT: bought a deactivated pack';
  exception when raise_exception then
    assert sqlerrm = 'special_pack_unavailable', sqlerrm;
  end;
  perform public.admin_set_special_pack_active(current_setting('test.card_pack')::uuid, true);

  -- Starting next year.
  perform public.admin_save_special_pack(
    p_id => current_setting('test.card_pack')::uuid,
    p_name => 'Prova carte', p_description => '', p_color => 'green', p_price => 50,
    p_cards_per_pack => 5, p_variant_chance_percent => 100, p_odds_mode => 'card',
    p_cards => jsonb_build_array(jsonb_build_object('code', current_setting('test.beta'), 'percent', 100)),
    p_starts_at => (now() at time zone 'Europe/Rome' + interval '1 year')::timestamp);
  assert not exists (select 1 from jsonb_array_elements(public.get_special_packs()) p
                     where p ->> 'id' = current_setting('test.card_pack')), 'a pack not started yet is on sale';

  -- A pack that was opened is never deleted; one nobody opened is.
  begin
    perform public.admin_delete_special_pack(current_setting('test.rarity_pack')::uuid);
    raise exception 'ASSERT: deleted an opened pack';
  exception when raise_exception then
    assert sqlerrm = 'special_pack_has_openings', sqlerrm;
  end;
end $$;

reset role;
delete from public.pack_openings where special_pack_id = current_setting('test.card_pack')::uuid;
set local role authenticated;

do $$
begin
  assert not exists (
    select 1 from jsonb_array_elements(public.admin_delete_special_pack(current_setting('test.card_pack')::uuid) -> 'packs') p
    where p ->> 'id' = current_setting('test.card_pack')
  ), 'pack not deleted';
end $$;

-- Signed out: the shop list only.
set local role anon;

do $$
begin
  perform public.get_special_packs();
  begin
    perform public.buy_special_pack(current_setting('test.rarity_pack')::uuid, 2);
    raise exception 'ASSERT: anon bought a pack';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_list_special_packs();
    raise exception 'ASSERT: anon listed the special packs';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;

select 'special packs: all assertions passed' as result;
