-- Integration test for artwork variants: drawn on the server without touching
-- the rarity odds, shown with their art, never converted, and part of the card
-- instance. Runs inside a transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'variant-a@example.test',
   '{"full_name": "Varianti A"}', now(), now());

-- The catalog: no variant on a level card, which no pack can give.
do $$
begin
  assert (select count(*) from public.card_variants) = 20, 'first series should have 20 variants';
  assert not exists (
    select 1 from public.card_variants v
    join public.card_definitions d on d.id = v.definition_id
    where d.unlock_level is not null
  ), 'a level card cannot be found in packs';
  assert (select variant_count from public.card_catalog where code = 'P072') = 1, 'catalog count of a variant';
  assert (select variant_count from public.card_catalog where code = 'P002') = 0, 'catalog count without a variant';
  assert (public.get_pack_odds() ->> 'variant_chance_percent')::integer = 10, 'published chance';
  assert (public.get_pack_odds() ->> 'characters_with_variants')::integer = 20, 'published characters';
end $$;

-- The draw follows the configured chance, and only for characters with a variant.
do $$
declare
  v_with uuid;
  v_without uuid;
begin
  select id into v_with from public.card_definitions where code = 'P072';
  select id into v_without from public.card_definitions where code = 'P002';

  update public.game_config set value = '0' where key = 'packs.variant_chance_percent';
  for i in 1..50 loop
    assert public.draw_variant(v_with) is null, 'chance 0 gave a variant';
  end loop;

  update public.game_config set value = '100' where key = 'packs.variant_chance_percent';
  for i in 1..50 loop
    assert public.draw_variant(v_with) is not null, 'chance 100 gave no variant';
    assert public.draw_variant(v_without) is null, 'a character without variants got one';
  end loop;
end $$;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);

-- With chance 100 a pack shows the art of every variant it holds.
do $$
declare
  v_pack jsonb;
  v_card jsonb;
  v_seen integer := 0;
begin
  perform public.bootstrap_player();
  v_pack := public.claim_daily_pack();
  for v_card in select * from jsonb_array_elements(v_pack -> 'cards') loop
    if exists (
      select 1 from public.card_variants v
      join public.card_definitions d on d.id = v.definition_id
      where d.code = v_card ->> 'code'
    ) then
      v_seen := v_seen + 1;
      assert v_card -> 'variant' ->> 'name' = 'Neon', 'variant missing from the pack payload';
      assert v_card ->> 'art_url' = '/cards/variants/' || (v_card ->> 'code') || '-neon.webp', 'variant art missing';
    else
      assert v_card -> 'variant' = 'null'::jsonb, 'a base card came with a variant';
      assert v_card ->> 'art_url' not like '/cards/variants/%', 'a base card showed a variant art';
    end if;
  end loop;
end $$;

reset role;

-- A variant cannot end up on another character, nor on a starter card.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000a1';
  v_variant uuid;
  v_other uuid;
  v_failed boolean := false;
begin
  select v.id into v_variant from public.card_variants v
  join public.card_definitions d on d.id = v.definition_id where d.code = 'P072';
  select id into v_other from public.card_definitions where code = 'P002';

  begin
    insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
    values (v_other, v_user, 'pack', v_variant);
  exception when foreign_key_violation then
    v_failed := true;
  end;
  assert v_failed, 'a variant went on the wrong character';

  v_failed := false;
  begin
    insert into public.card_instances (definition_id, owner_id, acquired_via, is_starter, variant_id)
    select v.definition_id, v_user, 'starter', true, v.id from public.card_variants v where v.id = v_variant;
  exception when check_violation then
    v_failed := true;
  end;
  assert v_failed, 'a starter card got a variant';
end $$;

-- Conversion leaves variants and the base copy alone; the payload follows the instance.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000a1';
  v_definition uuid;
  v_variant uuid;
  v_copy uuid;
  v_payload jsonb;
  v_result record;
begin
  select id into v_definition from public.card_definitions where code = 'P072';
  select id into v_variant from public.card_variants where definition_id = v_definition;
  delete from public.card_transfers t using public.card_instances i
    where t.instance_id = i.id and i.owner_id = v_user and i.definition_id = v_definition;
  delete from public.pack_openings where user_id = v_user;
  delete from public.card_instances where owner_id = v_user and definition_id = v_definition;

  -- Only a variant: nothing to convert, and its art is the one shown.
  insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
  values (v_definition, v_user, 'pack', v_variant)
  returning id into v_copy;
  assert (select s.convertible_copies from public.collection_summary(v_user) s where s.definition_id = v_definition) = 0,
    'a lone variant was convertible';

  v_payload := public.card_payload(v_definition, v_copy);
  assert v_payload ->> 'art_url' = '/cards/variants/P072-neon.webp', 'instance payload art';
  assert v_payload -> 'variant' ->> 'name' = 'Neon', 'instance payload variant';
  assert public.card_payload(v_definition, null) ->> 'art_url' = '/cards/P072.webp', 'a bot card is the base version';

  -- One base copy and one variant: the base copy is not a duplicate.
  insert into public.card_instances (definition_id, owner_id, acquired_via) values (v_definition, v_user, 'pack');
  assert (select s.convertible_copies from public.collection_summary(v_user) s where s.definition_id = v_definition) = 0,
    'the only base copy was convertible';

  -- Two base copies: one can go, the variant stays.
  insert into public.card_instances (definition_id, owner_id, acquired_via) values (v_definition, v_user, 'pack');
  assert (select s.convertible_copies from public.collection_summary(v_user) s where s.definition_id = v_definition) = 1,
    'expected one convertible duplicate';
  select * into v_result from public.convert_definition_duplicates(v_user, v_definition, null);
  assert v_result.converted = 1, 'expected one conversion';
  assert (select owner_id from public.card_instances where id = v_copy) = v_user, 'the variant was converted';

  -- The art belongs to the instance: changing hands leaves it where it is.
  update public.card_instances set owner_id = null, out_of_play_at = now() where id = v_copy;
  assert (select variant_id from public.card_instances where id = v_copy) = v_variant, 'the variant left the card';
end $$;

rollback;
