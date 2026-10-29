-- Integration test for M1 (profiles, starter set, usernames, privileges).
-- Runs against the linked project inside a transaction that is rolled back,
-- so it leaves no data behind:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'test-a@example.test',
   '{"full_name": "Niccolò Rossi", "avatar_url": "https://example.test/a.png"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'test-b@example.test',
   '{"full_name": "Niccolò Rossi"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000c3', 'authenticated', 'authenticated', 'x@example.test',
   '{}', now(), now());

-- Catalog validation (runs as the migration owner).
do $$
begin
  begin
    insert into public.card_definitions (code, name, faction, rarity_code, stats)
    values ('TEST_BAD', 'Fuori budget', 'heroes', 'delta',
      '{"FOR":10,"VEL":10,"RES":10,"INT":10,"VOL":10,"PER":10,"ENE":0,"MAG":0,"PSI":0,"COM":0,"TEC":0,"FUR":0}');
    raise exception 'ASSERT: a card over budget was accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
  end;

  begin
    insert into public.card_definitions (code, name, faction, rarity_code, stats)
    values ('TEST_MISSING', 'Abilità mancanti', 'heroes', 'delta', '{"FOR":10}');
    raise exception 'ASSERT: a card with missing abilities was accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
  end;
end $$;

set local role authenticated;

-- Player A: first access creates the profile and grants the starter set.
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);

do $$
declare
  v_profile public.profiles;
  v_cards integer;
  v_distinct integer;
  v_transfers integer;
begin
  v_profile := public.bootstrap_player();
  assert v_profile.username = 'Niccolo_Rossi', format('username was %s', v_profile.username);
  assert v_profile.avatar_url = 'https://example.test/a.png', 'avatar not copied';
  assert v_profile.starter_granted_at is not null, 'starter_granted_at not set';

  select count(*), count(distinct definition_id) into v_cards, v_distinct
  from public.card_instances where is_starter and acquired_via = 'starter';
  assert v_cards = 10, format('expected 10 starter cards, got %s', v_cards);
  assert v_distinct = 10, format('expected 10 distinct characters, got %s', v_distinct);

  assert not exists (
    select 1 from public.card_instances i
    join public.card_definitions d on d.id = i.definition_id
    join public.rarity_definitions r on r.code = d.rarity_code
    where r.rank > 1
  ), 'starter set contains cards above the allowed rarity';

  select count(*) into v_transfers from public.card_transfers where reason = 'starter' and from_user is null;
  assert v_transfers = 10, format('expected 10 starter transfers, got %s', v_transfers);

  -- Second access: nothing new is granted.
  v_profile := public.bootstrap_player();
  select count(*) into v_cards from public.card_instances;
  assert v_cards = 10, format('bootstrap is not idempotent: %s cards', v_cards);
end $$;

-- Player B: same display name gets a different username; sees only own data.
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);

do $$
declare
  v_profile public.profiles;
  v_cards integer;
begin
  v_profile := public.bootstrap_player();
  assert lower(v_profile.username) <> 'niccolo_rossi', 'duplicate username assigned';
  assert v_profile.username ~ '^Niccolo_Rossi_[0-9]{4}$', format('username was %s', v_profile.username);

  select count(*) into v_cards from public.card_instances;
  assert v_cards = 10, format('player B sees %s cards instead of own 10', v_cards);
  assert (select count(*) from public.profiles) = 1, 'player B can read other profiles';
  assert (select count(*) from public.card_transfers) = 10, 'player B can read other transfers';

  -- Username rules.
  begin
    perform public.set_username('NICCOLO_ROSSI');
    raise exception 'ASSERT: a username taken with different case was accepted';
  exception when unique_violation then
    assert sqlerrm = 'username_taken', format('unexpected error %s', sqlerrm);
  end;

  begin
    perform public.set_username('ab');
    raise exception 'ASSERT: a too short username was accepted';
  exception when invalid_parameter_value then
    assert sqlerrm = 'username_invalid', format('unexpected error %s', sqlerrm);
  end;

  v_profile := public.set_username('  Giocatore_B  ');
  assert v_profile.username = 'Giocatore_B', format('username was %s', v_profile.username);

  -- Direct writes are not allowed: everything goes through functions.
  begin
    insert into public.card_instances (definition_id, owner_id, acquired_via)
    select id, '00000000-0000-4000-8000-0000000000b2', 'pack' from public.card_definitions limit 1;
    raise exception 'ASSERT: a client inserted a card directly';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.profiles set level = 99;
    raise exception 'ASSERT: a client updated its profile directly';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.grant_starter_set('00000000-0000-4000-8000-0000000000b2');
    raise exception 'ASSERT: a client called an internal function';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Player C: no name in the metadata, short email local part.
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000c3", "role": "authenticated"}', true);

do $$
declare
  v_profile public.profiles;
begin
  v_profile := public.bootstrap_player();
  assert v_profile.username ~ '^giocatore(_[0-9]{4})?$', format('username was %s', v_profile.username);
end $$;

-- Anonymous visitors can read the catalog but cannot bootstrap a player.
set local role anon;

do $$
begin
  assert (select count(*) from public.card_definitions) >= 10, 'anon cannot read the catalog';
  begin
    perform 1 from public.profiles;
    raise exception 'ASSERT: anon can read profiles';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.bootstrap_player();
    raise exception 'ASSERT: anon executed bootstrap_player';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;

select 'player_bootstrap: all assertions passed' as result;
