-- Integration test for M4 (collection summary, album catalog, duplicate conversion).
-- Runs against the linked project inside a transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'coll-a@example.test',
   '{"full_name": "Collezione A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'coll-b@example.test',
   '{"full_name": "Collezione B"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
select public.bootstrap_player();

-- As the database owner, give player A extra copies:
-- X = one of A's starter characters (Delta): 3 more copies, one locked;
-- Y = a Gamma character A does not own: 2 copies.
reset role;

do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000a1';
  v_x uuid;
  v_y uuid;
begin
  select definition_id into v_x from public.card_instances where owner_id = v_user and is_starter limit 1;
  select id into v_y from public.card_definitions where code = 'P025';
  perform set_config('test.x', v_x::text, true);
  perform set_config('test.y', v_y::text, true);

  insert into public.card_instances (definition_id, owner_id, acquired_via, acquired_at, locked_until) values
    (v_x, v_user, 'pack', now() - interval '3 days', null),
    (v_x, v_user, 'pack', now() - interval '2 days', null),
    (v_x, v_user, 'conquest', now() - interval '1 day', now() + interval '1 day'),
    (v_y, v_user, 'pack', now() - interval '2 days', null),
    (v_y, v_user, 'pack', now() - interval '1 day', null);
end $$;

set local role authenticated;

do $$
declare
  v_x uuid := current_setting('test.x')::uuid;
  v_y uuid := current_setting('test.y')::uuid;
  v_row record;
  v_result jsonb;
  v_newest uuid;
begin
  -- Summary: X has 4 copies (1 starter, 1 locked) -> 2 convertible; Y has 2 -> 1.
  select * into v_row from public.get_collection() where definition_id = v_x;
  assert v_row.copies = 4 and v_row.starter_copies = 1 and v_row.locked_copies = 1
    and v_row.convertible_copies = 2, format('unexpected X summary %s', row_to_json(v_row));
  select * into v_row from public.get_collection() where definition_id = v_y;
  assert v_row.copies = 2 and v_row.convertible_copies = 1, format('unexpected Y summary %s', row_to_json(v_row));
  assert (select count(*) from public.get_collection()) = 11, 'expected 11 characters in the collection';

  -- Convert one copy of X: the newest free copy goes, 10 coins.
  select id into v_newest from public.card_instances
  where definition_id = v_x and not is_starter and locked_until is null
  order by acquired_at desc limit 1;

  v_result := public.convert_duplicates(v_x, 1);
  assert (v_result ->> 'converted')::integer = 1, 'one copy should be converted';
  assert (v_result ->> 'coins')::integer = 10, 'a Delta duplicate is worth 10 coins';
  assert (v_result ->> 'coin_balance')::integer = 10, 'balance not credited';
  assert not exists (select 1 from public.card_instances where id = v_newest), 'the newest copy is still owned';

  -- Convert the rest of X: only the free copy remains to convert.
  v_result := public.convert_duplicates(v_x);
  assert (v_result ->> 'converted')::integer = 1, 'the locked and starter copies must stay';
  select * into v_row from public.get_collection() where definition_id = v_x;
  assert v_row.copies = 2 and v_row.starter_copies = 1 and v_row.locked_copies = 1
    and v_row.convertible_copies = 0, format('unexpected X after conversion %s', row_to_json(v_row));

  begin
    perform public.convert_duplicates(v_x);
    raise exception 'ASSERT: converted a character with no free duplicates';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'nothing_to_convert', format('unexpected error %s', sqlerrm);
  end;

  begin
    perform public.convert_duplicates(v_y, 0);
    raise exception 'ASSERT: accepted a zero count';
  exception when invalid_parameter_value then
    assert sqlerrm = 'invalid_count', format('unexpected error %s', sqlerrm);
  end;

  -- Convert everything else: Y keeps one copy, 25 coins.
  v_result := public.convert_all_duplicates();
  assert (v_result ->> 'converted')::integer = 1, 'convert all should convert one Y copy';
  assert (v_result ->> 'coins')::integer = 25, 'a Gamma duplicate is worth 25 coins';
  assert (v_result ->> 'coin_balance')::integer = 45, 'unexpected balance after converting all';
  assert (select copies from public.get_collection() where definition_id = v_y) = 1, 'Y lost its last copy';

  begin
    perform public.convert_all_duplicates();
    raise exception 'ASSERT: convert all succeeded with no duplicates left';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'nothing_to_convert', format('unexpected error %s', sqlerrm);
  end;

  -- Ledgers: one coin row and one transfer per converted card.
  assert (select count(*) from public.coin_ledger where reason = 'duplicate_conversion') = 3, 'coin ledger rows';
  assert (select sum(amount) from public.coin_ledger) = 45, 'balance does not match the ledger';
  assert (select count(*) from public.card_transfers where reason = 'conversion' and to_user is null) = 3,
    'transfer ledger rows';
  -- Starter cards are untouched.
  assert (select count(*) from public.card_instances where is_starter) = 10, 'a starter card was converted';
end $$;

-- Converted cards keep their history but have no owner.
reset role;

do $$
begin
  assert (
    select count(*) from public.card_instances
    where owner_id is null and converted_at is not null
      and id in (select instance_id from public.card_transfers where reason = 'conversion')
  ) = 3, 'converted cards were not kept as history';
end $$;

-- Player B cannot touch player A's duplicates.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);

do $$
begin
  perform public.bootstrap_player();
  begin
    perform public.convert_duplicates(current_setting('test.x')::uuid);
    raise exception 'ASSERT: player B converted player A cards';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'nothing_to_convert', format('unexpected error %s', sqlerrm);
  end;
  assert (select count(*) from public.get_collection()) = 10, 'player B sees other collections';
end $$;

-- The album catalog is public; collection RPCs are not.
set local role anon;

do $$
begin
  assert (select count(*) from public.card_catalog) = 60, 'anon cannot read the album catalog';
  assert not exists (
    select 1 from public.card_catalog where rarity_rank > 1 and power_text is null
  ), 'a rare card has no power text in the catalog';
  assert (select duplicate_coin_value from public.card_catalog where code = 'P057') = 400, 'Omega value';
  begin
    perform public.get_collection();
    raise exception 'ASSERT: anon read a collection';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;

select 'collection: all assertions passed' as result;
