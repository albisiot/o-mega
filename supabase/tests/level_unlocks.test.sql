-- Integration test for the characters unlocked by level. Service-only functions
-- are called as the database owner. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'lu-a@example.test', '{"full_name": "Sblocchi A"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000a1';
  v_nico uuid := (select id from public.card_definitions where code = 'P061');
  v_team uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 5) s);
  v_bot uuid[] := (select array_agg(s.id) from (select id from public.card_definitions order by code limit 5) s);
  v_threats uuid[];
  v_match uuid;
  v_state jsonb;
  v_drawn uuid[];
begin
  assert (
    select array_agg(code || ':' || unlock_level order by unlock_level)
    from public.card_definitions where unlock_level is not null
  ) = array['P061:3', 'P068:5', 'P074:7', 'P078:10'], 'unexpected level cards';

  -- Never in the starter set.
  assert not exists (
    select 1 from public.card_instances i join public.card_definitions d on d.id = i.definition_id
    where i.owner_id = v_a and d.unlock_level is not null
  ), 'a level card in the starter set';

  -- Never in packs, whatever the draw.
  for i in 1..40 loop
    v_drawn := public.draw_pack_definitions(5, 2);
    assert cardinality(v_drawn) = 5, 'pack size';
    assert not exists (
      select 1 from public.card_definitions d where d.id = any (v_drawn) and d.unlock_level is not null
    ), 'a level card in a pack';
  end loop;

  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;

  -- Below the level, nothing.
  v_match := public.match_create_bot(v_a, 'easy', v_team, v_bot, v_threats);
  perform public.finish_match(v_match, 'a', 'completed');
  assert not exists (select 1 from public.level_unlocks where user_id = v_a), 'unlocked too early';
  assert public.match_state_payload(v_match, 'a') -> 'level_unlocks' = '[]'::jsonb, 'empty unlocks in the state';

  -- Reaching level 3 grants Nico Icaro, once, bound to the account and logged.
  update public.profiles set xp = 290 where id = v_a;
  v_match := public.match_create_bot(v_a, 'easy', v_team, v_bot, v_threats);
  perform public.finish_match(v_match, 'a', 'completed');
  assert (select level from public.profiles where id = v_a) = 3, 'level 3 not reached';
  v_state := public.match_state_payload(v_match, 'a');
  assert v_state -> 'level_unlocks' = '[{"name": "Nico Icaro", "level": 3}]'::jsonb,
    format('state %s', v_state -> 'level_unlocks');
  assert (
    select count(*) = 1 and bool_and(is_starter) and bool_and(acquired_via = 'level_unlock')
    from public.card_instances where owner_id = v_a and definition_id = v_nico
  ), 'the level card must be one copy bound to the account';
  assert (
    select count(*) from public.card_transfers t
    join public.card_instances i on i.id = t.instance_id
    where i.owner_id = v_a and i.definition_id = v_nico
      and t.reason = 'level_unlock' and t.to_user = v_a and t.match_id = v_match
  ) = 1, 'the grant must be in the transfer ledger';

  -- It cannot be converted.
  assert (select s.convertible_copies from public.collection_summary(v_a) s where s.definition_id = v_nico) = 0,
    'a level card must not be convertible';

  -- Granted once, however many times the grant runs or matches end.
  perform public.grant_level_rewards(v_a, null);
  v_match := public.match_create_bot(v_a, 'easy', v_team, v_bot, v_threats);
  perform public.finish_match(v_match, 'a', 'completed');
  assert (select count(*) from public.card_instances where owner_id = v_a and definition_id = v_nico) = 1, 'granted twice';
  assert public.match_state_payload(v_match, 'a') -> 'level_unlocks' = '[]'::jsonb, 'old unlocks shown again';

  -- A retroactive grant gives what is missing, with no match attached.
  update public.profiles set level = 7 where id = v_a;
  perform public.grant_level_unlocks(v_a, null);
  assert (select count(*) from public.level_unlocks where user_id = v_a) = 3, 'retroactive unlocks';
  assert (
    select count(*) from public.level_unlocks u join public.card_definitions d on d.id = u.definition_id
    where u.user_id = v_a and d.code in ('P068', 'P074') and u.match_id is null
  ) = 2, 'retroactive unlocks have no match';
  assert not exists (
    select 1 from public.level_unlocks u join public.card_definitions d on d.id = u.definition_id
    where u.user_id = v_a and d.code = 'P078'
  ), 'Stella Nova unlocks at level 10';
end $$;

set local role authenticated;

do $$
begin
  begin
    perform public.grant_level_unlocks('00000000-0000-4000-8000-0000000000a1', null);
    raise exception 'ASSERT: a client called grant_level_unlocks';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.level_unlocks (user_id, definition_id, instance_id)
    select '00000000-0000-4000-8000-0000000000a1', d.id, gen_random_uuid() from public.card_definitions d limit 1;
    raise exception 'ASSERT: a client wrote level_unlocks';
  exception when insufficient_privilege then
    null;
  end;
  assert (select count(*) from public.level_unlocks) = 3, 'a player should read their own unlocks';
  assert (select unlock_level from public.card_catalog where code = 'P078') = 10, 'the album must show the unlock level';
end $$;

reset role;

rollback;
