-- Integration test for managing bonus codes from the app: only admins, validated
-- input, expiry at midnight Europe/Rome. Runs inside a transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', 'admin-a@example.test',
   '{"full_name": "Admin A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000c2', 'authenticated', 'authenticated', 'admin-b@example.test',
   '{"full_name": "Admin B"}', now(), now());

set local role authenticated;

-- A normal player gets nothing, whatever the call.
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000c2", "role": "authenticated"}', true);

do $$
begin
  perform public.bootstrap_player();
  assert not public.is_admin(), 'a player is not an admin';

  begin
    perform public.admin_list_bonus_codes();
    raise exception 'ASSERT: a player listed the codes';
  exception when insufficient_privilege then
    assert sqlerrm = 'not_admin', sqlerrm;
  end;
  begin
    perform public.admin_create_bonus_code('HACK', p_coins => 1000);
    raise exception 'ASSERT: a player created a code';
  exception when insufficient_privilege then
    assert sqlerrm = 'not_admin', sqlerrm;
  end;
  begin
    perform public.admin_set_bonus_code_active(gen_random_uuid(), true);
    raise exception 'ASSERT: a player changed a code';
  exception when insufficient_privilege then
    assert sqlerrm = 'not_admin', sqlerrm;
  end;
  begin
    perform count(*) from public.admin_users;
    raise exception 'ASSERT: a player read the admins';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000000c2');
    raise exception 'ASSERT: a player became an admin';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_bonus_codes_payload();
    raise exception 'ASSERT: a player read the payload directly';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000c1", "role": "authenticated"}', true);

do $$
begin
  perform public.bootstrap_player();
end $$;

reset role;
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000000c1');
set local role authenticated;

-- An admin creates and lists codes.
do $$
declare
  v_today date := (now() at time zone 'Europe/Rome')::date;
  v_list jsonb;
  v_code jsonb;
begin
  assert public.is_admin(), 'admin not recognized';

  v_list := public.admin_create_bonus_code(' prova admin ', p_coins => 30, p_packs => 1,
    p_card_codes => array['P002'], p_max_uses => 2, p_expires_on => v_today, p_note => ' nota ');
  select c into v_code from jsonb_array_elements(v_list -> 'codes') as c where c ->> 'code' = 'PROVAADMIN';
  assert v_code is not null, 'code missing from the list';
  assert (v_code ->> 'coins')::integer = 30 and (v_code ->> 'packs')::integer = 1, 'rewards';
  assert jsonb_array_length(v_code -> 'card_names') = 1, 'card names';
  assert (v_code ->> 'max_uses')::integer = 2 and (v_code ->> 'uses')::integer = 0, 'uses';
  assert v_code ->> 'note' = 'nota', 'note';
  assert (v_code ->> 'expires_at')::timestamptz = ((v_today + 1)::timestamp at time zone 'Europe/Rome'),
    'valid until the end of the day in Rome';
  assert jsonb_array_length(v_list -> 'cards') > 0, 'cards to choose from';
  assert not exists (
    select 1 from jsonb_array_elements(v_list -> 'cards') as c
    join public.card_definitions d on d.code = c ->> 'code'
    where d.unlock_level is not null
  ), 'level cards cannot be chosen';

  -- Valid today, and counted in the list once redeemed.
  assert (public.redeem_bonus_code('PROVAADMIN') ->> 'coins')::integer = 30, 'code created by an admin';
  select c into v_code from jsonb_array_elements(public.admin_list_bonus_codes() -> 'codes') as c
  where c ->> 'code' = 'PROVAADMIN';
  assert (v_code ->> 'uses')::integer = 1, 'use not counted';

  -- Switched off and on again.
  perform public.admin_create_bonus_code('SPEGNIMI', p_coins => 5);
  select c into v_code from jsonb_array_elements(public.admin_list_bonus_codes() -> 'codes') as c
  where c ->> 'code' = 'SPEGNIMI';
  perform public.admin_set_bonus_code_active((v_code ->> 'id')::uuid, false);
  assert public.redeem_bonus_code('SPEGNIMI') ->> 'error' = 'bonus_code_invalid', 'disabled code accepted';
  perform public.admin_set_bonus_code_active((v_code ->> 'id')::uuid, true);
  assert (public.redeem_bonus_code('SPEGNIMI') ->> 'coins')::integer = 5, 'enabled code refused';
end $$;

-- Bad input gets a stable error.
do $$
declare
  v_case record;
begin
  for v_case in select * from (values
    ('a!', 10, 0, '{}'::text[], null::integer, null::date, 'bonus_code_invalid_format'),
    ('PROVAADMIN', 10, 0, '{}', null, null, 'bonus_code_duplicate'),
    ('VUOTO', 0, 0, '{}', null, null, 'bonus_code_no_reward'),
    ('NEGATIVO', -1, 0, '{}', null, null, 'bonus_code_invalid_limits'),
    ('NESSUNO', 10, 0, '{}', 0, null, 'bonus_code_invalid_limits'),
    ('NOCARTA', 0, 0, '{NOPE}', null, null, 'bonus_code_card_unavailable'),
    ('IERI', 10, 0, '{}', null, ((now() at time zone 'Europe/Rome')::date - 1), 'bonus_code_invalid_expiry')
  ) as t(code, coins, packs, cards, max_uses, expires_on, expected) loop
    begin
      perform public.admin_create_bonus_code(v_case.code, v_case.coins, v_case.packs, v_case.cards, v_case.max_uses, v_case.expires_on);
      raise exception 'ASSERT: accepted %', v_case.code;
    exception when raise_exception then
      assert sqlerrm = v_case.expected, format('%s: %s', v_case.code, sqlerrm);
    end;
  end loop;
end $$;

-- Signed out: nothing at all.
set local role anon;

do $$
begin
  begin
    perform public.is_admin();
    raise exception 'ASSERT: anon called is_admin';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_list_bonus_codes();
    raise exception 'ASSERT: anon listed the codes';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;

select 'bonus code admin: all assertions passed' as result;
