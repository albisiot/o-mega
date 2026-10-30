-- Integration test for M5 (pack odds shown in the shop).
-- Runs against the linked project inside a transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

do $$
declare
  v_odds jsonb;
  v_sum numeric;
begin
  v_odds := public.get_pack_odds();
  select sum((o ->> 'probability')::numeric) into v_sum from jsonb_array_elements(v_odds -> 'odds') as o;
  assert abs(v_sum - 1) < 0.001, format('odds sum to %s', v_sum);
  assert jsonb_array_length(v_odds -> 'odds') = 5, 'expected odds for 5 rarities';
  assert v_odds -> 'odds' -> 0 ->> 'name' = 'Delta', 'odds are not ordered by rank';
  assert (v_odds -> 'odds' -> 0 ->> 'probability')::numeric = 0.6, 'Delta should be 60% per card';
  assert (v_odds -> 'odds' -> 4 ->> 'probability')::numeric = 0.01, 'Omega should be 1% per card';
  assert v_odds ->> 'guaranteed_rarity_name' = 'Gamma', 'guarantee should be Gamma';
  assert (v_odds ->> 'cards_per_pack')::integer = 5, 'pack size';
  assert (v_odds ->> 'standard_pack_price')::integer = 150, 'pack price';

  -- A rarity without active cards disappears from both the odds and the draw.
  update public.card_definitions set is_active = false where rarity_code = 'omega';

  v_odds := public.get_pack_odds();
  select sum((o ->> 'probability')::numeric) into v_sum from jsonb_array_elements(v_odds -> 'odds') as o;
  assert jsonb_array_length(v_odds -> 'odds') = 4, 'inactive rarity still listed';
  assert abs(v_sum - 1) < 0.001, format('odds without Omega sum to %s', v_sum);

  for i in 1..300 loop
    assert public.draw_rarity_rank(1) <> 5, 'drew a rarity with no active cards';
  end loop;

  begin
    perform public.draw_rarity_rank(5);
    raise exception 'ASSERT: drew from an empty rarity range';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
  end;
end $$;

-- Anyone can read the odds, even before signing in.
set local role anon;

do $$
begin
  assert (public.get_pack_odds() ->> 'cards_per_pack')::integer = 5, 'anon cannot read pack odds';
  begin
    perform public.draw_rarity_rank(1);
    raise exception 'ASSERT: anon called the draw directly';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;

select 'shop: all assertions passed' as result;
