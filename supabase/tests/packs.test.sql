-- Integration test for M3 (daily pack, pack purchase, RNG, coin ledger).
-- Runs against the linked project inside a transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'pack-a@example.test',
   '{"full_name": "Pacchi A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'pack-b@example.test',
   '{"full_name": "Pacchi B"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000c3', 'authenticated', 'authenticated', 'pack-c@example.test',
   '{"full_name": "Pacchi C"}', now(), now());

-- Daily reset at midnight Europe/Rome, including both DST offsets.
do $$
begin
  assert public.game_day('2026-10-29 22:59:59+00') = date '2026-10-29', 'winter: day changed too early';
  assert public.game_day('2026-10-29 23:00:00+00') = date '2026-10-30', 'winter: day did not change at midnight';
  assert public.game_day('2026-07-01 21:59:59+00') = date '2026-07-01', 'summer: day changed too early';
  assert public.game_day('2026-07-01 22:00:00+00') = date '2026-07-02', 'summer: day did not change at midnight';
  assert public.next_reset_at('2026-10-29 12:00:00+00') = timestamptz '2026-10-29 23:00:00+00', 'winter reset';
  assert public.next_reset_at('2026-07-01 12:00:00+00') = timestamptz '2026-07-01 22:00:00+00', 'summer reset';
  -- Clocks go back on 25 October 2026: midnight is 22:00 UTC before, 23:00 UTC after.
  assert public.next_reset_at('2026-10-24 12:00:00+00') = timestamptz '2026-10-24 22:00:00+00', 'reset before DST change';
  assert public.next_reset_at('2026-10-25 12:00:00+00') = timestamptz '2026-10-25 23:00:00+00', 'reset after DST change';

  assert public.power_text('ability_bonus', '{"ability": "RES", "bonus": 2}')
    = '+2 contro Minacce che richiedono Resistenza', 'ability power text';
  assert public.power_text('family_bonus', '{"family": "mind", "min_count": 2, "bonus": 2}')
    = '+2 se la Minaccia richiede almeno 2 abilità di Mente', 'family power text';
end $$;

set local role authenticated;

-- Player A: daily pack, then purchases.
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);

do $$
declare
  v_status jsonb;
  v_pack jsonb;
  v_ranks integer[];
begin
  perform public.bootstrap_player();

  v_status := public.get_pack_status();
  assert (v_status ->> 'daily_available')::boolean, 'daily pack should be available';
  assert (v_status ->> 'coin_balance')::integer = 0, 'new players start with 0 coins';
  assert (v_status ->> 'standard_pack_price')::integer = 150, 'unexpected pack price';
  assert (v_status ->> 'resets_at')::timestamptz between now() and now() + interval '25 hours', 'bad reset time';

  v_pack := public.claim_daily_pack();
  perform set_config('test.a_opening', v_pack ->> 'id', true);

  select array_agg((c -> 'rarity' ->> 'rank')::integer order by e.ord) into v_ranks
  from jsonb_array_elements(v_pack -> 'cards') with ordinality as e(c, ord);
  assert cardinality(v_ranks) = 5, format('daily pack has %s cards', cardinality(v_ranks));
  assert 2 <= any (v_ranks), 'daily pack without a Gamma or rarer card';
  assert v_ranks = (select array_agg(r order by r) from unnest(v_ranks) as r), 'cards are not sorted by rarity';
  assert v_pack ->> 'pack_type' = 'daily', 'wrong pack type';

  assert (select count(*) from public.card_instances) = 15, 'pack cards were not added to the collection';
  assert (select count(*) from public.card_instances where acquired_via = 'pack') = 5, 'wrong acquisition source';
  assert (select count(*) from public.card_transfers where reason = 'pack' and from_user is null) = 5,
    'pack cards missing from the transfer ledger';
  assert (select count(*) from public.daily_claims where pack_opening_id = (v_pack ->> 'id')::uuid) = 1,
    'daily claim not linked to the opening';

  -- A character already in the starter set is never flagged as new.
  assert not exists (
    select 1 from jsonb_array_elements(v_pack -> 'cards') as c
    where (c ->> 'is_new')::boolean
      and exists (
        select 1 from public.card_instances i join public.card_definitions d on d.id = i.definition_id
        where i.is_starter and d.code = c ->> 'code'
      )
  ), 'a starter duplicate was flagged as new';

  -- Every card carries its power text when it has one.
  assert not exists (
    select 1 from jsonb_array_elements(v_pack -> 'cards') as c
    where (c -> 'rarity' ->> 'rank')::integer > 1 and (c -> 'power' ->> 'text') is null
  ), 'a rare card is missing its power text';

  assert public.get_pack_opening((v_pack ->> 'id')::uuid) = v_pack, 'reopening returns different data';

  begin
    perform public.claim_daily_pack();
    raise exception 'ASSERT: a second daily pack was granted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'daily_pack_already_claimed', format('unexpected error %s', sqlerrm);
  end;

  assert not (public.get_pack_status() ->> 'daily_available')::boolean, 'daily pack still available';

  begin
    perform public.buy_pack();
    raise exception 'ASSERT: a pack was bought without coins';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'insufficient_coins', format('unexpected error %s', sqlerrm);
  end;
  assert (select count(*) from public.card_instances) = 15, 'a failed purchase added cards';
end $$;

-- Credit player A with exactly 200 packs worth of coins (as the database owner).
reset role;
insert into public.coin_ledger (user_id, amount, reason)
values ('00000000-0000-4000-8000-0000000000a1', 200 * 150, 'admin_adjustment');
set local role authenticated;

do $$
declare
  v_pack jsonb;
  v_ranks integer[];
  v_cards integer := 0;
  v_delta integer := 0;
  v_alfa_or_better integer := 0;
begin
  for i in 1..200 loop
    v_pack := public.buy_pack();
    select array_agg((c -> 'rarity' ->> 'rank')::integer) into v_ranks
    from jsonb_array_elements(v_pack -> 'cards') as c;
    assert cardinality(v_ranks) = 5, 'a purchased pack does not have 5 cards';
    assert 2 <= any (v_ranks), 'a purchased pack has no Gamma or rarer card';
    v_cards := v_cards + cardinality(v_ranks);
    v_delta := v_delta + (select count(*) from unnest(v_ranks) as r where r = 1);
    v_alfa_or_better := v_alfa_or_better + (select count(*) from unnest(v_ranks) as r where r >= 4);
  end loop;

  assert (public.get_pack_status() ->> 'coin_balance')::integer = 0, 'coins were not debited correctly';
  assert (select count(*) from public.coin_ledger where reason = 'pack_purchase' and amount = -150) = 200,
    'purchases missing from the coin ledger';
  assert (select count(*) from public.card_instances) = 15 + 1000, 'purchased cards missing';

  -- Expected Delta share is about 58% (60% per card, minus the guarantee).
  assert v_delta::numeric / v_cards between 0.50 and 0.67,
    format('Delta share %s is far from the configured weights', round(v_delta::numeric / v_cards, 3));
  -- Expected about 50 Alfa or Omega cards out of 1000.
  assert v_alfa_or_better between 15 and 100, format('%s Alfa/Omega cards out of 1000', v_alfa_or_better);

  begin
    perform public.buy_pack();
    raise exception 'ASSERT: a pack was bought with an empty balance';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'insufficient_coins', format('unexpected error %s', sqlerrm);
  end;
end $$;

-- Player B: independent daily pack, no access to A's data.
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);

do $$
declare
  v_pack jsonb;
begin
  perform public.bootstrap_player();
  assert (select count(*) from public.pack_openings) = 0, 'player B sees other pack openings';
  assert (select count(*) from public.coin_ledger) = 0, 'player B sees other coin movements';
  assert (select count(*) from public.daily_claims) = 0, 'player B sees other daily claims';

  begin
    perform public.get_pack_opening(current_setting('test.a_opening')::uuid);
    raise exception 'ASSERT: player B opened the pack of player A';
  exception when no_data_found then
    assert sqlerrm = 'pack_not_found', format('unexpected error %s', sqlerrm);
  end;

  v_pack := public.claim_daily_pack();
  assert jsonb_array_length(v_pack -> 'cards') = 5, 'player B daily pack failed';
end $$;

-- Player C never bootstrapped: no profile, no pack.
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000c3", "role": "authenticated"}', true);

do $$
begin
  begin
    perform public.claim_daily_pack();
    raise exception 'ASSERT: a pack was granted without a profile';
  exception when no_data_found then
    assert sqlerrm = 'profile_not_found', format('unexpected error %s', sqlerrm);
  end;

  begin
    perform public.open_pack('00000000-0000-4000-8000-0000000000c3', 'daily');
    raise exception 'ASSERT: a client called an internal function';
  exception when insufficient_privilege then null;
  end;
end $$;

set local role anon;

do $$
begin
  assert public.power_text('comeback', '{"bonus": 3}') like '%+3%', 'anon cannot render power texts';
  begin
    perform public.claim_daily_pack();
    raise exception 'ASSERT: anon claimed a pack';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.get_pack_status();
    raise exception 'ASSERT: anon read pack status';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;

select 'packs: all assertions passed' as result;
