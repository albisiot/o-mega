-- Integration test for bonus codes: rewards through the ledgers, one use per
-- player, limits, and codes out of the clients' reach. Runs inside a transaction
-- that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000b1', 'authenticated', 'authenticated', 'bonus-a@example.test',
   '{"full_name": "Bonus A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'bonus-b@example.test',
   '{"full_name": "Bonus B"}', now(), now());

-- Creating codes: validated, normalized, only level-free active cards.
do $$
declare
  v_level_card text;
begin
  perform public.create_bonus_code('tutto-premi', p_coins => 70, p_packs => 2, p_card_codes => array['P002', 'P002']);
  perform public.create_bonus_code('SOLOMONETE', p_coins => 25);
  perform public.create_bonus_code('UNOSOLO', p_coins => 5, p_max_uses => 1);
  perform public.create_bonus_code('SCADUTO', p_coins => 5, p_expires_at => now() - interval '1 minute');
  perform public.create_bonus_code('SPENTO', p_coins => 5);
  update public.bonus_codes set is_active = false where code = 'SPENTO';
  assert exists (select 1 from public.bonus_codes where code = 'TUTTO-PREMI'), 'code not normalized';

  begin
    perform public.create_bonus_code('NIENTE');
    raise exception 'ASSERT: a code without rewards was created';
  exception when check_violation then null;
  end;

  begin
    perform public.create_bonus_code('NOCARD', p_card_codes => array['NOPE']);
    raise exception 'ASSERT: an unknown card was accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
  end;

  select code into v_level_card from public.card_definitions where unlock_level is not null limit 1;
  begin
    perform public.create_bonus_code('NOLEVEL', p_card_codes => array[v_level_card]);
    raise exception 'ASSERT: a level card was accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
  end;
end $$;

-- Clients can neither read the codes nor create them.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000b1", "role": "authenticated"}', true);

do $$
declare
  v_result jsonb;
  v_uid uuid := '00000000-0000-4000-8000-0000000000b1';
begin
  perform public.bootstrap_player();

  begin
    perform count(*) from public.bonus_codes;
    raise exception 'ASSERT: a client read the codes';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.create_bonus_code('HACK', p_coins => 1000);
    raise exception 'ASSERT: a client created a code';
  exception when insufficient_privilege then null;
  end;

  -- All the rewards at once, whatever the spacing and case of the input.
  v_result := public.redeem_bonus_code(' tutto-premi ');
  assert v_result ->> 'error' is null, 'redemption failed';
  assert (v_result ->> 'coins')::integer = 70, 'coins in the payload';
  assert (v_result ->> 'cards')::integer = 2, 'cards in the payload';
  assert (v_result ->> 'packs')::integer = 2, 'packs in the payload';
  assert jsonb_array_length(v_result -> 'openings') = 3, 'one opening for the cards and one per pack';
  assert v_result -> 'openings' -> 0 ->> 'pack_type' = 'bonus', 'chosen cards come first';
  assert jsonb_array_length(v_result -> 'openings' -> 0 -> 'cards') = 2, 'chosen cards';
  assert v_result -> 'openings' -> 1 ->> 'pack_type' = 'standard', 'then the packs';
  assert jsonb_array_length(v_result -> 'openings' -> 2 -> 'cards') = 5, 'pack size';
  assert (public.get_pack_status() ->> 'coin_balance')::integer = 70, 'balance after the code';
  assert (select amount from public.coin_ledger where user_id = v_uid and reason = 'bonus_code') = 70, 'ledger row';

  -- A saved opening can be shown again.
  assert public.get_pack_opening((v_result -> 'openings' -> 0 ->> 'id')::uuid) ->> 'pack_type' = 'bonus', 'reveal after a reload';

  -- Second use by the same player: nothing more.
  begin
    perform public.redeem_bonus_code('TUTTO-PREMI');
    raise exception 'ASSERT: redeemed twice';
  exception when raise_exception then
    assert sqlerrm = 'bonus_code_already_redeemed', sqlerrm;
  end;
  assert (public.get_pack_status() ->> 'coin_balance')::integer = 70, 'second use paid';

  begin
    perform public.redeem_bonus_code('SCADUTO');
    raise exception 'ASSERT: expired code redeemed';
  exception when raise_exception then
    assert sqlerrm = 'bonus_code_expired', sqlerrm;
  end;

  assert public.redeem_bonus_code('SPENTO') ->> 'error' = 'bonus_code_invalid', 'disabled code accepted';
  assert (public.redeem_bonus_code('UNOSOLO') ->> 'coins')::integer = 5, 'limited code';
end $$;

-- Chosen cards behave like pack cards, and each copy has its own transfer row.
reset role;

do $$
declare
  v_uid uuid := '00000000-0000-4000-8000-0000000000b1';
  v_new integer;
  v_was_starter boolean;
begin
  assert (select count(*) from public.card_instances where owner_id = v_uid and acquired_via = 'bonus_code') = 2, 'bonus instances';
  assert not exists (
    select 1 from public.card_instances where owner_id = v_uid and acquired_via = 'bonus_code' and (is_starter or variant_id is not null)
  ), 'a bonus card must be a plain, conquerable copy';
  assert (select count(*) from public.card_transfers where to_user = v_uid and reason = 'bonus_code') = 2, 'transfer rows';
  select cardinality(new_card_instance_ids) into v_new from public.pack_openings where user_id = v_uid and pack_type = 'bonus';
  v_was_starter := exists (
    select 1 from public.card_instances i join public.card_definitions d on d.id = i.definition_id
    where i.owner_id = v_uid and i.is_starter and d.code = 'P002'
  );
  assert v_new = (case when v_was_starter then 0 else 1 end), format('new flags: %s', v_new);
end $$;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);

-- The use limit counts every player; unknown codes stop after the hourly limit.
do $$
declare
  v_limit integer := (select value::text::integer from public.game_config where key = 'bonus_codes.max_failed_attempts_per_hour');
begin
  perform public.bootstrap_player();

  begin
    perform public.redeem_bonus_code('UNOSOLO');
    raise exception 'ASSERT: exhausted code redeemed';
  exception when raise_exception then
    assert sqlerrm = 'bonus_code_exhausted', sqlerrm;
  end;

  assert (public.redeem_bonus_code('SOLOMONETE') ->> 'coins')::integer = 25, 'another player can use a code';

  for i in 1..v_limit loop
    assert public.redeem_bonus_code('SBAGLIATO') ->> 'error' = 'bonus_code_invalid', 'unknown code';
  end loop;

  begin
    perform public.redeem_bonus_code('TUTTO-PREMI');
    raise exception 'ASSERT: no limit on attempts';
  exception when raise_exception then
    assert sqlerrm = 'bonus_code_too_many_attempts', sqlerrm;
  end;
  assert (public.get_pack_status() ->> 'coin_balance')::integer = 25, 'blocked player paid';
end $$;

-- Signed out: no redemption.
set local role anon;

do $$
begin
  begin
    perform public.redeem_bonus_code('SOLOMONETE');
    raise exception 'ASSERT: anon redeemed a code';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;

select 'bonus codes: all assertions passed' as result;
