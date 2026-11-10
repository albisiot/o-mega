-- Integration test for the daily objectives catalog from the app: only admins
-- list, create, edit, switch off and delete objectives; every difficulty keeps
-- enough active objectives; an objective already handed out is not deleted.
-- Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000d5', 'authenticated', 'authenticated', 'objectives-admin@example.test',
   '{"full_name": "Obiettivi Admin"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000d6', 'authenticated', 'authenticated', 'objectives-player@example.test',
   '{"full_name": "Obiettivi Giocatore"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000d5", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000d6", "role": "authenticated"}', true);
select public.bootstrap_player();

-- A player manages nothing.
do $$
begin
  begin
    perform public.admin_list_daily_objectives();
    raise exception 'ASSERT: a player listed the catalog';
  exception when insufficient_privilege then
    assert sqlerrm = 'not_admin', sqlerrm;
  end;
  begin
    perform public.admin_save_daily_objective(null, 'Vinci 1 partita', 'easy', 'matches_won', '{}', 1, 1000, 0);
    raise exception 'ASSERT: a player created an objective';
  exception when insufficient_privilege then
    assert sqlerrm = 'not_admin', sqlerrm;
  end;
  begin
    perform public.admin_set_daily_objective_active('win_matches', false);
    raise exception 'ASSERT: a player switched an objective off';
  exception when insufficient_privilege then
    assert sqlerrm = 'not_admin', sqlerrm;
  end;
  begin
    perform public.admin_delete_daily_objective('win_matches');
    raise exception 'ASSERT: a player deleted an objective';
  exception when insufficient_privilege then
    assert sqlerrm = 'not_admin', sqlerrm;
  end;
  begin
    perform public.admin_daily_objectives_payload();
    raise exception 'ASSERT: a player called an internal function';
  exception when insufficient_privilege then null;
  end;
end $$;

-- The player has today's objectives: one of them is in use.
select public.get_daily_objectives();

reset role;
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000000d5');
select set_config('test.in_use', (select definition_code from public.daily_objectives
  where user_id = '00000000-0000-4000-8000-0000000000d6' limit 1), true);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000d5", "role": "authenticated"}', true);

do $$
declare
  v_payload jsonb := public.admin_list_daily_objectives();
  v_count integer := jsonb_array_length(v_payload -> 'objectives');
  v_code text;
  v_in_use text := current_setting('test.in_use');
begin
  assert v_count >= 19, format('catalog %s', v_count);
  assert (v_payload -> 'per_day' ->> 'easy')::integer = 1, 'per day';
  assert (v_payload -> 'reward_coins' ->> 'hard')::integer = 60, 'reward coins';
  assert (select (o ->> 'assigned')::integer from jsonb_array_elements(v_payload -> 'objectives') o
          where o ->> 'code' = v_in_use) >= 1, 'assigned count';

  -- Create, then edit.
  v_payload := public.admin_save_daily_objective(null, '  Vinci 4 partite  ', 'hard', 'matches_won', '{}', 4, null, 1);
  assert jsonb_array_length(v_payload -> 'objectives') = v_count + 1, 'created';
  select o ->> 'code' into v_code from jsonb_array_elements(v_payload -> 'objectives') o where o ->> 'title' = 'Vinci 4 partite';
  assert v_code like 'obj\_%', format('new code %s', v_code);
  v_payload := public.admin_save_daily_objective(v_code, 'Vinci 5 partite', 'medium', 'matches_won', '{"opponent": "bot"}', 5, 30, 0);
  assert (select o ->> 'title' = 'Vinci 5 partite' and o ->> 'difficulty' = 'medium' and (o ->> 'target')::integer = 5
            and (o ->> 'coins')::integer = 30 and o -> 'params' = '{"opponent": "bot"}'::jsonb
          from jsonb_array_elements(v_payload -> 'objectives') o where o ->> 'code' = v_code), 'edited';

  -- Invalid objectives.
  begin
    perform public.admin_save_daily_objective(null, 'Prova', 'easy', 'packs_opened', '{"faction": "villains"}', 1, null, 0);
    raise exception 'ASSERT: a filter the metric does not understand was accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'invalid_objective', sqlerrm;
  end;
  begin
    perform public.admin_save_daily_objective(null, 'Prova', 'easy', 'packs_opened', '{}', 0, null, 0);
    raise exception 'ASSERT: a target of 0 was accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'invalid_objective', sqlerrm;
  end;
  begin
    perform public.admin_save_daily_objective(null, 'Prova', 'easy', 'packs_opened', '{}', 1, 0, 0);
    raise exception 'ASSERT: an objective without a reward was accepted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'invalid_objective', sqlerrm;
  end;
  begin
    perform public.admin_save_daily_objective('nope_missing', 'Prova', 'easy', 'packs_opened', '{}', 1, null, 0);
    raise exception 'ASSERT: an unknown objective was edited';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'objective_not_found', sqlerrm;
  end;

  -- Switch off and on; the new one was never handed out, so it can be deleted.
  v_payload := public.admin_set_daily_objective_active(v_code, false);
  assert not (select (o ->> 'is_active')::boolean from jsonb_array_elements(v_payload -> 'objectives') o
              where o ->> 'code' = v_code), 'switched off';
  v_payload := public.admin_set_daily_objective_active(v_code, true);
  v_payload := public.admin_delete_daily_objective(v_code);
  assert jsonb_array_length(v_payload -> 'objectives') = v_count, 'deleted';

  begin
    perform public.admin_delete_daily_objective(v_in_use);
    raise exception 'ASSERT: an objective in use was deleted';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'objective_in_use', sqlerrm;
  end;
end $$;

-- A difficulty cannot be left without objectives to draw.
do $$
declare
  v_code text;
begin
  for v_code in
    select o ->> 'code' from jsonb_array_elements(public.admin_list_daily_objectives() -> 'objectives') o
    where o ->> 'difficulty' = 'hard' and (o ->> 'is_active')::boolean
    order by o ->> 'code'
    offset 1
  loop
    perform public.admin_set_daily_objective_active(v_code, false);
  end loop;
  select o ->> 'code' into v_code from jsonb_array_elements(public.admin_list_daily_objectives() -> 'objectives') o
  where o ->> 'difficulty' = 'hard' and (o ->> 'is_active')::boolean;
  begin
    perform public.admin_set_daily_objective_active(v_code, false);
    raise exception 'ASSERT: the last hard objective was switched off';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'objectives_too_few', sqlerrm;
  end;
end $$;

reset role;
rollback;
