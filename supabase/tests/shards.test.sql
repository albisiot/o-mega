-- Integration test for Schegge, frames and effects (20261119120000_shards_and_cosmetics.sql):
-- breaking duplicate variants (one copy of each kept, locked copies kept), the prices, the
-- purchases (pack, frame or effect, variant not owned), applying and hiding them, and the admin
-- settings. Runs inside a transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000007a1', 'authenticated', 'authenticated', 'shard-admin@example.test',
   '{"full_name": "Shard Admin"}', now(), now()),
  ('00000000-0000-4000-8000-0000000007a2', 'authenticated', 'authenticated', 'shard-player@example.test',
   '{"full_name": "Shard Player"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007a2", "role": "authenticated"}', true);
do $$ begin perform public.bootstrap_player(); end $$;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007a1", "role": "authenticated"}', true);
do $$ begin perform public.bootstrap_player(); end $$;
reset role;
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000007a1');

-- The player owns four copies of a Gamma variant (one just conquered) and one of another variant.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000007a2';
  v_variant record;
  v_other uuid;
begin
  select v.id, v.definition_id into v_variant
  from public.card_variants v
  join public.card_definitions d on d.id = v.definition_id
  where v.is_active and d.is_active and d.unlock_level is null and d.rarity_code = 'gamma'
  order by d.code limit 1;
  select v.id into v_other
  from public.card_variants v
  join public.card_definitions d on d.id = v.definition_id
  where v.is_active and d.is_active and d.unlock_level is null and v.id <> v_variant.id
  order by d.code limit 1;
  perform set_config('test.variant', v_variant.id::text, false);
  perform set_config('test.definition', v_variant.definition_id::text, false);
  perform set_config('test.other', v_other::text, false);

  insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id, acquired_at)
  select v_variant.definition_id, v_user, 'pack', v_variant.id, now() - (n || ' minutes')::interval
  from generate_series(1, 3) n;
  insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id, locked_until)
  values (v_variant.definition_id, v_user, 'conquest', v_variant.id, now() + interval '1 day');
  insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
  select v.definition_id, v_user, 'pack', v.id from public.card_variants v where v.id = v_other;
end $$;

-- Values and summary.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000007a2';
begin
  assert (select variant_shard_value from public.rarity_definitions where code = 'delta') = 1, 'Delta 1';
  assert (select variant_shard_value from public.rarity_definitions where code = 'gamma') = 2, 'Gamma 2';
  assert (select variant_shard_value from public.rarity_definitions where code = 'beta') = 3, 'Beta 3';
  assert (select variant_shard_value from public.rarity_definitions where code = 'alfa') = 5, 'Alfa 5';
  assert (select variant_shard_value from public.rarity_definitions where code = 'omega') = 7, 'Omega 7';
  -- 4 copies, one locked: 3 free, and one must stay: 3 can be broken.
  assert (select breakable from public.variant_break_summary(v_user) where variant_id = current_setting('test.variant')::uuid) = 3,
    'three of four copies breakable';
  assert (select breakable from public.variant_break_summary(v_user) where variant_id = current_setting('test.other')::uuid) = 0,
    'a single copy is kept';
end $$;

-- Breaking, as the player.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007a2", "role": "authenticated"}', true);
do $$
declare
  v_result jsonb;
begin
  begin
    perform public.break_variant_duplicates(current_setting('test.other')::uuid, 1);
    raise exception 'ASSERT: the only copy broken';
  exception when others then
    assert sqlerrm = 'nothing_to_break', sqlerrm;
  end;
  begin
    perform public.break_variant_duplicates(current_setting('test.variant')::uuid, 0);
    raise exception 'ASSERT: zero copies accepted';
  exception when others then
    assert sqlerrm = 'invalid_count', sqlerrm;
  end;

  v_result := public.break_variant_duplicates(current_setting('test.variant')::uuid, 10);
  assert (v_result ->> 'broken')::integer = 3, 'three broken, asked for ten';
  assert (v_result ->> 'shards')::integer = 6, 'three Gamma copies: 6 Schegge';
  assert (v_result -> 'cosmetics' ->> 'shard_balance')::integer = 6, 'balance 6';
end $$;
reset role;

do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000007a2';
begin
  -- The locked copy stays; the broken ones left their owner, with a transfer and a ledger row each.
  assert (select count(*) from public.card_instances
          where owner_id = v_user and variant_id = current_setting('test.variant')::uuid) = 1, 'one copy kept';
  assert (select locked_until > now() from public.card_instances
          where owner_id = v_user and variant_id = current_setting('test.variant')::uuid), 'the locked copy kept';
  assert (select count(*) from public.card_transfers t join public.card_instances i on i.id = t.instance_id
          where t.reason = 'shard_break' and t.from_user = v_user) = 3, 'three transfers';
  assert (select count(*) from public.shard_ledger where user_id = v_user and reason = 'variant_break') = 3, 'three ledger rows';
end $$;

-- Spending, as the player: 6 Schegge.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007a2", "role": "authenticated"}', true);
do $$
declare
  v_result jsonb;
  v_code text;
  v_owned integer;
  v_left integer;
begin
  begin
    perform public.buy_with_shards('nothing');
    raise exception 'ASSERT: an unknown item bought';
  exception when others then
    assert sqlerrm = 'invalid_shard_item', sqlerrm;
  end;

  -- A pack: 1 Scheggia, 5 cards, pack type shards.
  v_result := public.buy_with_shards('pack');
  assert jsonb_array_length(v_result -> 'opening' -> 'cards') = 5, 'five cards';
  assert v_result -> 'opening' ->> 'pack_type' = 'shards', 'a Schegge pack';
  assert (v_result -> 'cosmetics' ->> 'shard_balance')::integer = 5, 'balance 5';

  -- A random frame or effect: 1.
  v_result := public.buy_with_shards('cosmetic');
  assert (v_result -> 'cosmetics' ->> 'shard_balance')::integer = 4, 'balance 4';
  assert v_result -> 'item' ->> 'kind' in ('frame', 'effect'), 'a frame or an effect';

  -- An effect: 2.
  v_result := public.buy_with_shards('effect');
  assert v_result -> 'item' ->> 'kind' = 'effect', 'an effect';
  assert (v_result -> 'cosmetics' ->> 'shard_balance')::integer = 2, 'balance 2';
  v_code := v_result -> 'item' ->> 'code';
  assert (v_result -> 'item' ->> 'serial')::integer >= 1, 'a serial';

  -- A frame: 2.
  v_result := public.buy_with_shards('frame');
  assert v_result -> 'item' ->> 'kind' = 'frame', 'a frame';
  assert (v_result -> 'cosmetics' ->> 'shard_balance')::integer = 0, 'balance 0';

  begin
    perform public.buy_with_shards('pack');
    raise exception 'ASSERT: a pack without Schegge';
  exception when others then
    assert sqlerrm = 'insufficient_shards', sqlerrm;
  end;

  -- Applying: only to an owned character, only an owned item.
  begin
    perform public.apply_cosmetic(
      (select d.id from public.card_definitions d
       where not exists (select 1 from public.card_instances i where i.definition_id = d.id
                         and i.owner_id = '00000000-0000-4000-8000-0000000007a2')
       limit 1), v_code);
    raise exception 'ASSERT: applied to a character not owned';
  exception when others then
    assert sqlerrm = 'character_not_owned', sqlerrm;
  end;

  v_owned := coalesce((select (x ->> 'count')::integer from jsonb_array_elements(public.get_cosmetics() -> 'inventory') x
                       where x ->> 'code' = v_code), 0);
  v_result := public.apply_cosmetic(current_setting('test.definition')::uuid, v_code);
  assert exists (
    select 1 from jsonb_array_elements(v_result -> 'applied') a
    where a ->> 'definition_id' = current_setting('test.definition') and a ->> 'effect' = v_code
      and (a ->> 'effect_visible')::boolean
  ), 'the effect applied and shown';
  assert coalesce((select (x ->> 'count')::integer from jsonb_array_elements(v_result -> 'inventory') x
                   where x ->> 'code' = v_code), 0) = v_owned - 1, 'the item used up';
  -- Applied again until none is left: then it is refused.
  begin
    for v_left in 1..v_owned loop
      perform public.apply_cosmetic(current_setting('test.definition')::uuid, v_code);
    end loop;
    raise exception 'ASSERT: an item applied twice';
  exception when others then
    assert sqlerrm = 'cosmetic_not_owned', sqlerrm;
  end;

  v_result := public.set_cosmetic_visible(current_setting('test.definition')::uuid, 'effect', false);
  assert exists (
    select 1 from jsonb_array_elements(v_result -> 'applied') a
    where a ->> 'definition_id' = current_setting('test.definition') and not (a ->> 'effect_visible')::boolean
  ), 'the effect hidden';
  begin
    perform public.set_cosmetic_visible(current_setting('test.definition')::uuid, 'frame', false);
    raise exception 'ASSERT: a frame hidden that was never applied';
  exception when others then
    assert sqlerrm = 'cosmetic_not_applied', sqlerrm;
  end;

  begin
    perform public.admin_get_shard_settings();
    raise exception 'ASSERT: a player read the admin settings';
  exception when others then
    assert sqlerrm = 'not_admin', sqlerrm;
  end;
end $$;
reset role;

-- A variant not owned: 3 Schegge, never one the player has.
insert into public.shard_ledger (user_id, amount, reason) values ('00000000-0000-4000-8000-0000000007a2', 3, 'admin_adjustment');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007a2", "role": "authenticated"}', true);
do $$
declare
  v_result jsonb;
  v_missing_before integer := (public.get_cosmetics() ->> 'missing_variants')::integer;
begin
  v_result := public.buy_with_shards('variant');
  assert jsonb_array_length(v_result -> 'opening' -> 'cards') = 1, 'one card';
  assert v_result -> 'opening' -> 'cards' -> 0 -> 'variant' is not null
     and jsonb_typeof(v_result -> 'opening' -> 'cards' -> 0 -> 'variant') = 'object', 'a variant';
  assert (v_result -> 'cosmetics' ->> 'missing_variants')::integer = v_missing_before - 1, 'one fewer missing';
  assert (v_result -> 'cosmetics' ->> 'shard_balance')::integer = 0, 'balance 0';
end $$;
reset role;

-- The admin settings.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007a1", "role": "authenticated"}', true);
do $$
declare
  v_result jsonb;
begin
  v_result := public.admin_save_shard_settings('{"delta": 2, "omega": 9}', '{"pack_cost": 2}');
  assert exists (select 1 from jsonb_array_elements(v_result -> 'rarities') r where r ->> 'code' = 'delta' and (r ->> 'value')::integer = 2),
    'Delta now 2';
  assert (v_result -> 'costs' ->> 'pack_cost')::integer = 2, 'a pack now costs 2';
  begin
    perform public.admin_save_shard_settings('{"delta": -1}', '{}');
    raise exception 'ASSERT: a negative value accepted';
  exception when others then
    assert sqlerrm = 'invalid_shard_settings', sqlerrm;
  end;
  begin
    perform public.admin_save_shard_settings('{}', '{"pack_cost": 0}');
    raise exception 'ASSERT: a free pack accepted';
  exception when others then
    assert sqlerrm = 'invalid_shard_settings', sqlerrm;
  end;
  begin
    perform public.admin_save_shard_settings('{"sigma": 1}', '{}');
    raise exception 'ASSERT: an unknown rarity accepted';
  exception when others then
    assert sqlerrm = 'invalid_shard_settings', sqlerrm;
  end;
end $$;
reset role;

-- No client reads the tables.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007a2", "role": "authenticated"}', true);
do $$
begin
  -- RLS without policies: no rows, or no access at all.
  begin
    assert (select count(*) from public.shard_ledger) = 0, 'shard_ledger hidden';
    assert (select count(*) from public.cosmetic_items) = 0, 'cosmetic_items hidden';
    assert (select count(*) from public.character_cosmetics) = 0, 'character_cosmetics hidden';
  exception when insufficient_privilege then
    null;
  end;
end $$;
reset role;

rollback;
