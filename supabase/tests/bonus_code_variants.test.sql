-- Integration test for bonus codes that give a chosen artwork variant. Runs
-- inside a transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated', 'variant-code@example.test',
   '{"full_name": "Codice Variante"}', now(), now());

-- Creating: 'CODE:style' picks the variant, a missing style is refused.
do $$
declare
  v_code public.bonus_codes;
  v_names jsonb;
  v_card jsonb;
begin
  perform public.create_bonus_code('NEONREGALO', p_card_codes => array['P072:neon', 'P002']);
  select * into v_code from public.bonus_codes where code = 'NEONREGALO';
  assert cardinality(v_code.card_variant_ids) = 2, 'one variant entry per card';
  assert v_code.card_variant_ids[1] = (
    select v.id from public.card_variants v join public.card_definitions d on d.id = v.definition_id
    where d.code = 'P072' and v.style = 'neon'
  ), 'wrong variant stored';
  assert v_code.card_variant_ids[2] is null, 'the base card got a variant';

  begin
    perform public.create_bonus_code('NOSTYLE', p_card_codes => array['P072:nessuno']);
    raise exception 'ASSERT: an unknown variant was accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
  end;

  -- The admin page names the variant and offers the variants of each card.
  select c -> 'card_names' into v_names
  from jsonb_array_elements(public.admin_bonus_codes_payload() -> 'codes') as c where c ->> 'code' = 'NEONREGALO';
  assert v_names ->> 0 = (select name || ' (Neon)' from public.card_definitions where code = 'P072'), format('names: %s', v_names);
  select c into v_card from jsonb_array_elements(public.admin_bonus_codes_payload() -> 'cards') as c where c ->> 'code' = 'P072';
  assert exists (select 1 from jsonb_array_elements(v_card -> 'variants') as v where v ->> 'style' = 'neon'), 'variants not offered';
end $$;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);

-- Redeeming: the copy has the variant, and the reveal shows its drawing.
do $$
declare
  v_result jsonb;
  v_cards jsonb;
begin
  perform public.bootstrap_player();
  v_result := public.redeem_bonus_code('neonregalo');
  v_cards := v_result -> 'openings' -> 0 -> 'cards';
  assert jsonb_array_length(v_cards) = 2, 'two cards';
  assert exists (
    select 1 from jsonb_array_elements(v_cards) as c
    where c ->> 'code' = 'P072' and c -> 'variant' ->> 'name' = 'Neon' and c ->> 'art_url' like '%P072-neon%'
  ), 'variant missing from the reveal';
  assert exists (
    select 1 from jsonb_array_elements(v_cards) as c where c ->> 'code' = 'P002' and c -> 'variant' = 'null'::jsonb
  ), 'the base card shows a variant';
end $$;

reset role;

do $$
begin
  assert (
    select count(*) from public.card_instances i join public.card_definitions d on d.id = i.definition_id
    where i.owner_id = '00000000-0000-4000-8000-0000000000f1' and i.acquired_via = 'bonus_code'
      and d.code = 'P072' and i.variant_id is not null and not i.is_starter
  ) = 1, 'variant copy not owned';
end $$;

rollback;

select 'bonus code variants: all assertions passed' as result;
