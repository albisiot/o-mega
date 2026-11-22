-- Integration test for the second stage of the Operazioni (SPEC §5.17): rooms of four, the
-- stars, Veggente for the team, the operations editor. Client functions read auth.uid() from
-- the request claims; service-only functions are called as the owner. Rolled back:
--   npm run test:db

begin;

-- Whatever an admin set in the real database: the Operazioni are open.
update public.mode_availability set state = 'on' where key = 'coop';

update public.game_config c set value = to_jsonb(d.value)
from (values
  ('coop.max_players', 4), ('coop.min_players', 2), ('coop.boss_cards', 2), ('coop.squad_size', 6),
  ('coop.panic_limit', 12), ('coop.panic_low', 1), ('coop.panic_high', 2), ('coop.panic_high_from_level', 4),
  ('coop.panic_reinforced', 1), ('coop.panic_limit_crowd', 10), ('coop.win_xp', 30), ('coop.loss_xp', 10)
) as d(key, value)
where c.key = d.key;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000006d1', 'authenticated', 'authenticated', 'coop2-a@example.test', '{"full_name": "Coop Due A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000006d2', 'authenticated', 'authenticated', 'coop2-b@example.test', '{"full_name": "Coop Due B"}', now(), now()),
  ('00000000-0000-4000-8000-0000000006d3', 'authenticated', 'authenticated', 'coop2-c@example.test', '{"full_name": "Coop Due C"}', now(), now()),
  ('00000000-0000-4000-8000-0000000006d4', 'authenticated', 'authenticated', 'coop2-d@example.test', '{"full_name": "Coop Due D"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000006d1", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000006d2", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000006d3", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000006d4", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

create function pg_temp.as_user(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', p_user, 'role', 'authenticated')::text, true)
$$;

-- A round where each given card leads its own threat with `total` points; stopped where `stop` says.
create function pg_temp.round_record(p_room uuid, p_round integer, p_plays jsonb, p_stop boolean[], p_eco uuid)
returns jsonb language plpgsql as $$
declare
  v_round public.coop_rounds;
  v_results jsonb := '[]';
  v_panic integer := 0;
  v_slot integer;
  v_play jsonb;
  v_stopped boolean;
  v_reinforced boolean;
  v_p integer;
begin
  select * into v_round from public.coop_rounds where room_id = p_room and round = p_round;
  for v_slot in 0 .. cardinality(v_round.threat_ids) - 1 loop
    select e into v_play from jsonb_array_elements(p_plays) e where (e ->> 'slot')::integer = v_slot and e ->> 'role' = 'lead';
    v_reinforced := v_slot = v_round.reinforced_slot;
    v_stopped := v_play is not null and p_stop[v_slot + 1];
    v_p := case when v_stopped then 0 else public.coop_threat_panic(v_round.threat_levels[v_slot + 1], v_round.boss, v_reinforced) end;
    v_panic := v_panic + v_p;
    v_results := v_results || jsonb_build_object(
      'slot', v_slot, 'stopped', v_stopped,
      'total', coalesce((v_play ->> 'total')::integer, 0) + coalesce((
        select sum((e ->> 'highest')::integer) from jsonb_array_elements(p_plays) e
        where (e ->> 'slot')::integer = v_slot and e ->> 'role' = 'support'), 0),
      'required', case when v_reinforced then null when v_stopped then 0
                       else public.coop_target(v_round.threat_levels[v_slot + 1], v_round.boss) end,
      'panic', v_p);
  end loop;
  return jsonb_build_object(
    'plays', p_plays,
    'results', v_results,
    'eco', jsonb_build_object('characterId', p_eco, 'base', 5, 'bonus', 0, 'total', 5, 'highest', 3,
      'outcome', case when p_stop[v_round.reinforced_slot + 1] and exists (
        select 1 from jsonb_array_elements(p_plays) e where (e ->> 'slot')::integer = v_round.reinforced_slot)
        then 'lost' else 'won' end),
    'panic', v_panic);
end $$;

create function pg_temp.play(p_user uuid, p_card uuid, p_slot integer, p_role text default 'lead', p_total integer default 9)
returns jsonb language sql as $$
  select jsonb_build_object('player', p_user, 'characterId', p_card, 'slot', p_slot, 'role', p_role,
    'base', p_total, 'bonus', 0, 'total', p_total, 'highest', 2, 'autoPlayed', true, 'parts', null)
$$;

-- Each seat's squad, a plain list (a two-dimensional array would not do for array_position).
create temp table coop_squads (seat integer primary key, cards uuid[] not null);
create function pg_temp.sq(p_seat integer) returns uuid[] language sql as $$ select cards from coop_squads where seat = p_seat $$;

-- The calm star of O1M1 within reach of a full table (one threat a round always stays uncovered).
update public.coop_operations set star_panic = 8 where code = 'O1M1';

do $$
declare
  v_users uuid[] := array[
    '00000000-0000-4000-8000-0000000006d1', '00000000-0000-4000-8000-0000000006d2',
    '00000000-0000-4000-8000-0000000006d3', '00000000-0000-4000-8000-0000000006d4']::uuid[];
  v_squad uuid[];
  v_rival uuid[];
  v_room jsonb;
  v_room_id uuid;
  v_state jsonb;
  v_coop jsonb;
  v_plays jsonb;
  v_round integer;
  v_i integer;
  v_failed boolean;
  v_veggente uuid;
  v_seer uuid;
  v_admin jsonb;
  v_draft jsonb;
  v_coins_before integer;
begin
  -- Six distinct characters of each starter set; the first player fields a Veggente too.
  select d.id into v_veggente from public.card_definitions d where d.power_code = 'foresight' and d.is_active order by d.code limit 1;
  assert v_veggente is not null, 'a Veggente in the catalog';
  insert into public.card_instances (definition_id, owner_id, acquired_via) values (v_veggente, v_users[1], 'pack') returning id into v_seer;
  for v_i in 1 .. 4 loop
    select array_agg(s.id) into v_squad from (
      select distinct on (i.definition_id) i.id from public.card_instances i
      join public.card_definitions d on d.id = i.definition_id
      where i.owner_id = v_users[v_i] and d.id <> v_veggente and d.rarity_code in ('delta', 'gamma')
      order by i.definition_id, i.id limit 6) s;
    if v_i = 1 then v_squad[1] := v_seer; end if;
    insert into coop_squads (seat, cards) values (v_i, v_squad);
  end loop;
  select rival_definition_ids into v_rival from public.coop_operations where code = 'O1M1';

  -- Four in a room: five threats a round.
  perform pg_temp.as_user(v_users[1]);
  v_room := public.coop_create_room('O1M1');
  v_room_id := (v_room ->> 'id')::uuid;
  v_state := public.coop_state(v_room_id);
  assert (v_state ->> 'players')::integer = 2, 'alone, the levels of a room of two';
  assert jsonb_array_length(v_state -> 'rounds' -> 0 -> 'levels') = 3, 'three levels for two';
  assert (v_state ->> 'max_players')::integer = 4, 'max players';
  assert (v_state -> 'operation' ->> 'star_panic')::integer = 8, 'star rule in the room';
  for v_i in 1 .. 4 loop
    perform pg_temp.as_user(v_users[v_i]);
    if v_i > 1 then perform public.coop_join_room(v_room ->> 'code'); end if;
    perform public.coop_set_squad(v_room_id, pg_temp.sq(v_i));
    perform public.coop_set_ready(v_room_id, true);
  end loop;
  perform pg_temp.as_user(v_users[1]);
  perform public.coop_start(v_room_id);
  v_state := public.coop_state(v_room_id);
  assert (v_state ->> 'players')::integer = 4 and jsonb_array_length(v_state -> 'rounds' -> 0 -> 'threats') = 5, 'five threats for four';
  assert (v_state ->> 'panic_limit')::integer = 10, format('the Panic limit of four: %s', v_state ->> 'panic_limit');
  assert jsonb_typeof(v_state -> 'rounds' -> 1 -> 'foreseen') = 'null', 'nothing foreseen before the Veggente';

  -- Round 1: the Veggente plays; from now on the team sees every later round.
  update public.coop_rounds set deadline_at = now() - interval '1 hour' where room_id = v_room_id and round = 1;
  v_plays := '[]'::jsonb;
  for v_i in 1 .. 4 loop
    v_plays := v_plays || jsonb_build_array(pg_temp.play(v_users[v_i], (pg_temp.sq(v_i))[1], v_i - 1));
  end loop;
  perform public.coop_record_round(v_room_id, 1, pg_temp.round_record(v_room_id, 1, v_plays, array[true, true, true, true, true], v_rival[1]));
  perform pg_temp.as_user(v_users[2]);
  v_state := public.coop_state(v_room_id);
  assert jsonb_array_length(v_state -> 'rounds' -> 2 -> 'foreseen') = 5, format('round 3 foreseen: %s', v_state -> 'rounds' -> 2 -> 'foreseen');
  assert v_state -> 'rounds' -> 4 -> 'foreseen' -> 0 ->> 'seen_by' = 'Veggente', 'seen by the Veggente';
  assert jsonb_typeof(v_state -> 'rounds' -> 1 -> 'foreseen') = 'null', 'the round being played is not foreseen, it is shown';

  -- Rounds 2-4 all stopped, the Boss all broken: won with no Panic, every star but the squad one
  -- (the first squad has a Veggente, which is not Delta or Gamma).
  for v_round in 2 .. 4 loop
    update public.coop_rounds set deadline_at = now() - interval '1 hour' where room_id = v_room_id and round = v_round;
    v_plays := '[]'::jsonb;
    for v_i in 1 .. 4 loop
      v_plays := v_plays || jsonb_build_array(pg_temp.play(v_users[v_i], (pg_temp.sq(v_i))[v_round], v_i - 1));
    end loop;
    perform public.coop_record_round(v_room_id, v_round, pg_temp.round_record(v_room_id, v_round, v_plays, array[true, true, true, true, true], v_rival[v_round]));
  end loop;
  update public.coop_rounds set deadline_at = now() - interval '1 hour' where room_id = v_room_id and round = 5;
  v_plays := '[]'::jsonb;
  for v_i in 1 .. 4 loop
    v_plays := v_plays || jsonb_build_array(
      pg_temp.play(v_users[v_i], (pg_temp.sq(v_i))[5], v_i - 1),
      pg_temp.play(v_users[v_i], (pg_temp.sq(v_i))[6], 4, case when v_i = 1 then 'lead' else 'support' end, case when v_i = 1 then 9 else 2 end));
  end loop;
  select coalesce(sum(amount), 0) into v_coins_before from public.coin_ledger where user_id = v_users[2] and reason = 'coop_star';
  perform public.coop_record_round(v_room_id, 5, pg_temp.round_record(v_room_id, 5, v_plays, array[true, true, true, true, true], v_rival[5]));
  v_state := public.coop_state(v_room_id);
  assert v_state ->> 'status' = 'won', format('status %s', v_state ->> 'status');
  assert (v_state -> 'members' -> 0 -> 'stars') = '["calm", "boss"]'::jsonb, format('stars of the Veggente player %s', v_state -> 'members' -> 0 -> 'stars');
  assert (v_state -> 'members' -> 1 -> 'stars') = '["calm", "boss", "squad"]'::jsonb, format('stars of a Delta-Gamma squad %s', v_state -> 'members' -> 1 -> 'stars');
  assert (v_state -> 'members' -> 1 ->> 'star_coins')::integer = 60, 'three stars, 20 coins each';
  assert (select sum(amount) from public.coin_ledger where user_id = v_users[2] and reason = 'coop_star') = v_coins_before + 60, 'star coins in the ledger';
  assert (v_state -> 'operation' -> 'stars') = '["boss", "calm", "squad"]'::jsonb, 'the player reads the stars';

  -- A replay pays the stars again only if new: none here.
  perform pg_temp.as_user(v_users[1]);
  v_room := public.coop_create_room('O1M1');
  v_room_id := (v_room ->> 'id')::uuid;
  for v_i in 1 .. 2 loop
    perform pg_temp.as_user(v_users[v_i]);
    if v_i > 1 then perform public.coop_join_room(v_room ->> 'code'); end if;
    perform public.coop_set_squad(v_room_id, pg_temp.sq(v_i));
    perform public.coop_set_ready(v_room_id, true);
  end loop;
  perform pg_temp.as_user(v_users[1]);
  perform public.coop_start(v_room_id);
  for v_round in 1 .. 4 loop
    update public.coop_rounds set deadline_at = now() - interval '1 hour' where room_id = v_room_id and round = v_round;
    v_plays := jsonb_build_array(pg_temp.play(v_users[1], (pg_temp.sq(1))[v_round], 0), pg_temp.play(v_users[2], (pg_temp.sq(2))[v_round], 1));
    perform public.coop_record_round(v_room_id, v_round, pg_temp.round_record(v_room_id, v_round, v_plays, array[true, true, true], v_rival[v_round]));
  end loop;
  update public.coop_rounds set deadline_at = now() - interval '1 hour' where room_id = v_room_id and round = 5;
  v_plays := jsonb_build_array(
    pg_temp.play(v_users[1], (pg_temp.sq(1))[5], 0), pg_temp.play(v_users[1], (pg_temp.sq(1))[6], 1),
    pg_temp.play(v_users[2], (pg_temp.sq(2))[5], 2), pg_temp.play(v_users[2], (pg_temp.sq(2))[6], 0, 'support', 2));
  perform public.coop_record_round(v_room_id, 5, pg_temp.round_record(v_room_id, 5, v_plays, array[true, true, true], v_rival[5]));
  v_state := public.coop_state(v_room_id);
  assert v_state ->> 'status' = 'won', 'replay won';
  assert (v_state -> 'members' -> 1 ->> 'star_coins')::integer = 0, 'no coins for stars already earned';
  assert (select sum(amount) from public.coin_ledger where user_id = v_users[2] and reason = 'coop_star') = v_coins_before + 60, 'paid once';

  -- The chapter for players: stars and their rules.
  perform pg_temp.as_user(v_users[2]);
  v_coop := public.get_coop();
  assert jsonb_array_length(v_coop -> 'chapters' -> 0 -> 'operations' -> 0 -> 'stars') = 3, 'stars in the chapter';
  assert v_coop -> 'chapters' -> 0 -> 'operations' -> 0 -> 'star_rarities' = '["delta", "gamma"]'::jsonb, 'star rarities';

  -- The editor: admins only.
  v_failed := false;
  begin perform public.admin_get_coop();
  exception when others then v_failed := sqlerrm = 'not_admin'; end;
  assert v_failed, 'a player opened the editor';
  insert into public.admin_users (user_id) values (v_users[3]);
  perform pg_temp.as_user(v_users[3]);
  v_admin := public.admin_get_coop();
  assert (v_admin ->> 'rounds')::integer = 5, 'rounds per operation';
  assert jsonb_array_length(v_admin -> 'threats') >= 50, 'the usual threats';
  assert (v_admin -> 'operations' -> 0 ->> 'rooms')::integer >= 2, 'rooms played';

  -- A new operation in chapter 1, from the first one with other texts.
  v_draft := (v_admin -> 'operations' -> 0) - 'code' - 'ord' - 'rooms' - 'wins' - 'in_play'
    || jsonb_build_object('title', 'Prova nuova', 'chapter', 1, 'reward_card', null);
  v_admin := public.admin_save_coop_operation(v_draft);
  assert exists (select 1 from public.coop_operations where title = 'Prova nuova' and code = 'O1M4' and ord = 4), 'new operation O1M4';
  -- Refused drafts.
  foreach v_draft in array array[
    jsonb_set(v_draft, '{title}', '"X"'),
    jsonb_set(v_draft, '{rival}', '["P021", "P021", "P031", "P071", "P041"]'),
    jsonb_set(v_draft, '{rounds,0,threats,0}', '"T999"'),
    jsonb_set(v_draft, '{rounds,0,reinforced}', '3'),
    jsonb_set(v_draft, '{reward_card}', (select to_jsonb(d.code) from public.card_definitions d where d.rarity_code = 'omega' limit 1)),
    jsonb_set(jsonb_set(v_draft, '{star_rarities}', '[]'), '{star_traits}', '[]'),
    jsonb_set(v_draft, '{star_panic}', '12')
  ] loop
    v_failed := false;
    begin perform public.admin_save_coop_operation(v_draft);
    exception when others then v_failed := sqlerrm like 'coop_invalid_%'; end;
    assert v_failed, format('accepted %s', v_draft);
  end loop;

  -- An open room keeps the rival and the rounds; texts still change.
  perform pg_temp.as_user(v_users[4]);
  v_room := public.coop_create_room('O1M1');
  perform pg_temp.as_user(v_users[3]);
  v_draft := (select e from jsonb_array_elements(v_admin -> 'operations') e where e ->> 'code' = 'O1M1');
  v_failed := false;
  begin perform public.admin_save_coop_operation(jsonb_set(v_draft, '{rounds,0,reinforced}', '0'));
  exception when others then v_failed := sqlerrm = 'coop_operation_in_play'; end;
  assert v_failed, 'changed the rounds of an operation in play';
  perform public.admin_save_coop_operation(jsonb_set(v_draft, '{title}', '"Scosse alle Fosse, bis"'));
  assert (select title from public.coop_operations where code = 'O1M1') = 'Scosse alle Fosse, bis', 'texts change in play';

  -- Only an operation never started goes away.
  v_failed := false;
  begin perform public.admin_delete_coop_operation('O1M1');
  exception when others then v_failed := sqlerrm = 'coop_operation_in_use'; end;
  assert v_failed, 'deleted a played operation';
  perform public.admin_delete_coop_operation('O1M4');
  assert not exists (select 1 from public.coop_operations where code = 'O1M4'), 'deleted O1M4';

  -- A chapter.
  v_admin := public.admin_save_coop_chapter(null, 'Capitolo di prova', 'Una introduzione di prova.', 'Un finale di prova.');
  assert exists (select 1 from public.coop_chapters where title = 'Capitolo di prova'), 'new chapter';
end $$;

rollback;
