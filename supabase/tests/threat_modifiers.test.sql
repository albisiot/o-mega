-- Integration test for threat modifiers: drawn by the database for every new
-- match, hidden until the threat is revealed. Runs inside a rolled-back transaction:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

-- The draw: how many, which rounds, distinct, and no Anello debole at level 1.
do $$
declare
  v_mods jsonb;
  v_count integer;
  v_codes text[];
begin
  for i in 1..300 loop
    v_mods := public.draw_threat_modifiers(array[1, 1, 1, 1, 6]);
    assert jsonb_array_length(v_mods) = 5, 'one entry per round';
    select count(*), array_agg(e ->> 'code') into v_count, v_codes
    from jsonb_array_elements(v_mods) as e where jsonb_typeof(e) = 'object';
    assert v_count between 1 and 2, format('modifiers per match: %s', v_count);
    assert (select count(distinct c) from unnest(v_codes) as c) = v_count, 'a code repeated';
    assert not exists (
      select 1 from generate_series(0, 3) as r
      where v_mods -> r ->> 'code' = 'weak_link'
    ), 'Anello debole on a threat with one ability';
  end loop;

  v_codes := '{}';
  for i in 1..300 loop
    v_codes := v_codes || array(
      select e ->> 'code' from jsonb_array_elements(public.draw_threat_modifiers(array[3, 3, 3, 3, 3])) as e
      where jsonb_typeof(e) = 'object'
    );
  end loop;
  assert (select count(distinct c) from unnest(v_codes) as c) = 4, 'some modifier is never drawn';

  v_mods := null;
  for i in 1..300 loop
    select e into v_mods from jsonb_array_elements(public.draw_threat_modifiers(array[3, 3, 3, 3, 3])) as e
    where e ->> 'code' = 'hostile_ground' limit 1;
    exit when v_mods is not null;
  end loop;
  assert v_mods ->> 'favored' <> v_mods ->> 'hindered', 'one faction both favored and hindered';
  assert (v_mods ->> 'bonus')::integer = 3 and (v_mods ->> 'malus')::integer = 2, 'numbers from the configuration';
end $$;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000d1', 'authenticated', 'authenticated', 'mod-a@example.test',
   '{"full_name": "Modificatori A"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000d1", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- A match gets its modifiers; the player sees only those of revealed threats.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000d1';
  v_team uuid[];
  v_bot uuid[];
  v_threats uuid[];
  v_match uuid;
  v_payload jsonb;
  v_stored jsonb;
begin
  select array_agg(id) into v_team from (
    select id from public.card_instances where owner_id = v_user order by acquired_at, id limit 5
  ) s;
  select array_agg(id) into v_bot from (
    select id from public.card_definitions where rarity_code in ('beta', 'alfa') order by code limit 5
  ) s;
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions
    where level = l.level order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;

  v_match := public.match_create_bot(v_user, 'easy', v_team, v_bot, v_threats);
  select threat_modifiers into v_stored from public.matches where id = v_match;
  assert jsonb_array_length(v_stored) = 5, 'modifiers not stored';

  v_payload := public.match_state_payload(v_match, 'a');
  assert jsonb_array_length(v_payload -> 'rounds') = 1, 'only the first threat is revealed';
  assert (v_payload -> 'rounds' -> 0 -> 'modifier') is not distinct from (v_stored -> 0), 'modifier of the round';
  assert not (v_payload ? 'threat_modifiers'), 'future modifiers reached the client';
end $$;

-- What the Edge Function reads, with its real role.
set local role service_role;

do $$
begin
  perform code, rank from public.rarity_definitions limit 1;
  perform rarity_code from public.card_definitions limit 1;
  perform threat_modifiers from public.matches limit 1;
end $$;

reset role;

-- The table never shows future modifiers to a client.
set local role authenticated;

do $$
begin
  begin
    perform threat_modifiers from public.matches limit 1;
    raise exception 'ASSERT: a client read the modifiers of a match';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.draw_threat_modifiers(array[1, 2, 3, 4, 5]);
    raise exception 'ASSERT: a client called the draw';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;

select 'threat modifiers: all assertions passed' as result;
