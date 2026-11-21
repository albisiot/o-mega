-- Integration test for the Operazioni (SPEC §5.17). Client functions read auth.uid() from the
-- request claims, set before each call; service-only functions are called as the owner.
-- Runs inside a rolled-back transaction:
--   npm run test:db

begin;

-- Known values, whatever an admin set.
update public.game_config c set value = to_jsonb(d.value)
from (values
  ('coop.max_players', 2), ('coop.min_players', 2), ('coop.boss_cards', 2), ('coop.squad_size', 6),
  ('coop.panic_limit', 12), ('coop.panic_low', 1), ('coop.panic_high', 2), ('coop.panic_high_from_level', 4),
  ('coop.panic_reinforced', 1), ('coop.win_xp', 30), ('coop.loss_xp', 10), ('coop.round_seconds', 45),
  ('coop.boss_round_seconds', 60), ('coop.reveal_pause_seconds', 20)
) as d(key, value)
where c.key = d.key;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000005c1', 'authenticated', 'authenticated', 'coop-a@example.test', '{"full_name": "Coop A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000005c2', 'authenticated', 'authenticated', 'coop-b@example.test', '{"full_name": "Coop B"}', now(), now()),
  ('00000000-0000-4000-8000-0000000005c3', 'authenticated', 'authenticated', 'coop-c@example.test', '{"full_name": "Coop C"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000005c1", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000005c2", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000005c3", "role": "authenticated"}', true);
select public.bootstrap_player();

-- What players read is through functions only.
do $$
declare
  v_failed boolean := false;
begin
  begin perform 1 from public.coop_rooms;
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'coop_rooms readable by a client';
  v_failed := false;
  begin perform public.coop_record_round(gen_random_uuid(), 1, '{}');
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'coop_record_round callable by a client';
end $$;
reset role;

create function pg_temp.as_user(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', p_user, 'role', 'authenticated')::text, true)
$$;

-- A round where every member played the given cards: each card leads its own threat with
-- `score` points (the support rule is checked separately); stopped where `stop` says so.
create function pg_temp.city_record(p_room uuid, p_round integer, p_plays jsonb, p_stop boolean[], p_eco uuid)
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
    select e into v_play from jsonb_array_elements(p_plays) e where (e ->> 'slot')::integer = v_slot;
    v_reinforced := v_slot = v_round.reinforced_slot;
    v_stopped := v_play is not null and p_stop[v_slot + 1];
    v_p := case when v_stopped then 0 else public.coop_threat_panic(v_round.threat_levels[v_slot + 1], v_round.boss, v_reinforced) end;
    v_panic := v_panic + v_p;
    v_results := v_results || jsonb_build_object(
      'slot', v_slot, 'stopped', v_stopped,
      'total', coalesce((v_play ->> 'total')::integer, 0),
      'required', case when v_reinforced then null
                       when v_stopped then 0 else public.coop_target(v_round.threat_levels[v_slot + 1], v_round.boss) end,
      'panic', v_p);
  end loop;
  return jsonb_build_object(
    'plays', p_plays,
    'results', v_results,
    'eco', jsonb_build_object('characterId', p_eco, 'base', 5, 'bonus', 0, 'total', 5, 'highest', 3,
      'outcome', case when p_stop[v_round.reinforced_slot + 1]
                        and exists (select 1 from jsonb_array_elements(p_plays) e where (e ->> 'slot')::integer = v_round.reinforced_slot)
                      then 'lost' else 'won' end),
    'panic', v_panic);
end $$;

create function pg_temp.play(p_user uuid, p_card uuid, p_slot integer, p_total integer, p_auto boolean default false)
returns jsonb language sql as $$
  select jsonb_build_object('player', p_user, 'characterId', p_card, 'slot', p_slot, 'role', 'lead',
    'base', p_total, 'bonus', 0, 'total', p_total, 'highest', 3, 'autoPlayed', p_auto, 'parts', null)
$$;

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000005c1';
  v_b uuid := '00000000-0000-4000-8000-0000000005c2';
  v_c uuid := '00000000-0000-4000-8000-0000000005c3';
  v_squad_a uuid[];
  v_squad_b uuid[];
  v_rival uuid[];
  v_coop jsonb;
  v_room jsonb;
  v_room_id uuid;
  v_state jsonb;
  v_failed boolean;
  v_record jsonb;
  v_round integer;
  v_coins_before integer;
  v_xp_before integer;
begin
  -- Six distinct characters of each starter set.
  select array_agg(s.id) into v_squad_a from (
    select distinct on (definition_id) id from public.card_instances where owner_id = v_a order by definition_id, id limit 6) s;
  select array_agg(s.id) into v_squad_b from (
    select distinct on (definition_id) id from public.card_instances where owner_id = v_b order by definition_id, id limit 6) s;
  select rival_definition_ids into v_rival from public.coop_operations where code = 'O1M1';
  assert cardinality(v_squad_a) = 6 and cardinality(v_squad_b) = 6, 'test squads';

  -- The chapter: the first operation open, the others locked; levels of all five threats per round.
  perform pg_temp.as_user(v_a);
  v_coop := public.get_coop();
  assert jsonb_array_length(v_coop -> 'chapters') >= 1, 'chapters';
  assert (v_coop -> 'chapters' -> 0 -> 'operations' -> 0 ->> 'code') = 'O1M1', 'first operation';
  assert (v_coop -> 'chapters' -> 0 -> 'operations' -> 0 ->> 'unlocked')::boolean, 'O1M1 open';
  assert not (v_coop -> 'chapters' -> 0 -> 'operations' -> 1 ->> 'unlocked')::boolean, 'O1M2 locked';
  assert jsonb_array_length(v_coop -> 'chapters' -> 0 -> 'operations' -> 0 -> 'rounds' -> 0 -> 'levels') = 5, 'five levels';
  assert (v_coop -> 'chapters' -> 0 -> 'operations' -> 2 -> 'reward_card' ->> 'code') = 'P101', 'prize card';
  assert jsonb_typeof(v_coop -> 'room') = 'null', 'no room yet';

  v_failed := false;
  begin perform public.coop_create_room('O1M2');
  exception when others then v_failed := sqlerrm = 'coop_operation_locked'; end;
  assert v_failed, 'opened a locked operation';

  -- A room, a friend with the code; a third one finds it full.
  v_room := public.coop_create_room('O1M1');
  v_room_id := (v_room ->> 'id')::uuid;
  assert (v_room ->> 'code') ~ '^[A-Z2-9]{6}$', 'room code';
  v_failed := false;
  begin perform public.coop_create_room('O1M1');
  exception when others then v_failed := sqlerrm = 'coop_already_in_room'; end;
  assert v_failed, 'two open rooms';

  perform pg_temp.as_user(v_b);
  v_failed := false;
  begin perform public.coop_join_room('ZZZZZZ');
  exception when others then v_failed := sqlerrm = 'coop_room_not_found'; end;
  assert v_failed, 'joined an unknown code';
  perform public.coop_join_room(lower(v_room ->> 'code'));
  perform pg_temp.as_user(v_c);
  v_failed := false;
  begin perform public.coop_join_room(v_room ->> 'code');
  exception when others then v_failed := sqlerrm = 'coop_room_full'; end;
  assert v_failed, 'third player in a room of two';

  -- Squads: 6 own cards of 6 characters; Pronto only with a squad; only the host starts, when all are ready.
  perform pg_temp.as_user(v_b);
  v_failed := false;
  begin perform public.coop_set_ready(v_room_id, true);
  exception when others then v_failed := sqlerrm = 'coop_squad_missing'; end;
  assert v_failed, 'ready without a squad';
  v_failed := false;
  begin perform public.coop_set_squad(v_room_id, v_squad_a);
  exception when others then v_failed := sqlerrm = 'card_not_owned'; end;
  assert v_failed, 'fielded the friend''s cards';
  v_failed := false;
  begin perform public.coop_set_squad(v_room_id, v_squad_b[1:5]);
  exception when others then v_failed := sqlerrm = 'invalid_team_size'; end;
  assert v_failed, 'squad of 5';
  perform public.coop_set_squad(v_room_id, v_squad_b);
  perform public.coop_set_ready(v_room_id, true);
  v_failed := false;
  begin perform public.coop_start(v_room_id);
  exception when others then v_failed := sqlerrm = 'coop_not_host'; end;
  assert v_failed, 'guest started';

  perform pg_temp.as_user(v_a);
  perform public.coop_set_squad(v_room_id, v_squad_a);
  v_failed := false;
  begin perform public.coop_start(v_room_id);
  exception when others then v_failed := sqlerrm = 'coop_not_ready'; end;
  assert v_failed, 'started with a member not ready';
  perform public.coop_set_ready(v_room_id, true);
  perform public.coop_start(v_room_id);

  -- Round 1: three threats (two players), the slot of the rival, a deadline; allies see each other.
  v_state := public.coop_state(v_room_id);
  assert v_state ->> 'status' = 'active' and (v_state ->> 'players')::integer = 2, 'started';
  assert jsonb_array_length(v_state -> 'rounds' -> 0 -> 'threats') = 3, 'three threats';
  assert (v_state -> 'rounds' -> 0 ->> 'reinforced_slot')::integer = 1, 'reinforced slot';
  assert jsonb_typeof(v_state -> 'rounds' -> 1 -> 'threats') = 'null', 'later threats hidden';
  assert jsonb_array_length(v_state -> 'rounds' -> 1 -> 'levels') = 3, 'later levels shown';
  assert jsonb_array_length(v_state -> 'members' -> 1 -> 'squad') = 6, 'ally squad visible';
  assert (v_state -> 'rounds' -> 0 -> 'threats' -> 1 ->> 'panic')::integer = 2, 'panic of the reinforced level 3';
  assert (v_state -> 'rounds' -> 0 -> 'threats' -> 2 ->> 'panic')::integer = 2, 'panic of a level 5';

  -- Placements: own unused cards, in range; the ally sees them.
  v_failed := false;
  begin perform public.coop_place(v_room_id, 1, jsonb_build_array(jsonb_build_object('card', v_squad_b[1], 'slot', 0)), false);
  exception when others then v_failed := sqlerrm = 'invalid_placement'; end;
  assert v_failed, 'placed the ally''s card';
  v_failed := false;
  begin perform public.coop_place(v_room_id, 1, jsonb_build_array(jsonb_build_object('card', v_squad_a[1], 'slot', 3)), false);
  exception when others then v_failed := sqlerrm = 'invalid_placement'; end;
  assert v_failed, 'placed on a threat not in play';
  v_failed := false;
  begin perform public.coop_place(v_room_id, 1, jsonb_build_array(
    jsonb_build_object('card', v_squad_a[1], 'slot', 0), jsonb_build_object('card', v_squad_a[2], 'slot', 1)), false);
  exception when others then v_failed := sqlerrm = 'invalid_placement'; end;
  assert v_failed, 'two cards in the city';
  v_state := public.coop_place(v_room_id, 1, jsonb_build_array(jsonb_build_object('card', v_squad_a[1], 'slot', 0)), true);
  assert not (v_state ->> 'all_ready')::boolean, 'all ready with one';
  perform pg_temp.as_user(v_b);
  v_state := public.coop_state(v_room_id);
  assert (v_state -> 'members' -> 0 -> 'placement' -> 0 ->> 'slot')::integer = 0, 'ally placement visible';

  -- The round cannot be recorded before everyone is ready or the time is up.
  v_record := pg_temp.city_record(v_room_id, 1, jsonb_build_array(
    pg_temp.play(v_a, v_squad_a[1], 0, 9), pg_temp.play(v_b, v_squad_b[1], 1, 4)), array[true, false, false], v_rival[1]);
  v_failed := false;
  begin perform public.coop_record_round(v_room_id, 1, v_record);
  exception when others then v_failed := sqlerrm = 'round_not_expired'; end;
  assert v_failed, 'recorded before the time';

  v_state := public.coop_place(v_room_id, 1, jsonb_build_array(jsonb_build_object('card', v_squad_b[1], 'slot', 1)), true);
  assert (v_state ->> 'all_ready')::boolean, 'all ready';

  -- Tampered rounds are refused.
  v_failed := false;
  begin perform public.coop_record_round(v_room_id, 1, jsonb_set(v_record, '{panic}', '1'));
  exception when others then v_failed := sqlerrm = 'coop_invalid_round'; end;
  assert v_failed, 'wrong panic';
  v_failed := false;
  begin perform public.coop_record_round(v_room_id, 1, jsonb_set(v_record, '{eco,characterId}', to_jsonb(v_squad_a[2])));
  exception when others then v_failed := sqlerrm = 'coop_invalid_round'; end;
  assert v_failed, 'an Eco not of the rival';
  v_failed := false;
  begin perform public.coop_record_round(v_room_id, 1, jsonb_set(v_record, '{plays,1,slot}', '2'));
  exception when others then v_failed := sqlerrm in ('coop_placement_changed', 'coop_invalid_round'); end;
  assert v_failed, 'a card moved';
  v_failed := false;
  begin perform public.coop_record_round(v_room_id, 1, jsonb_set(v_record, '{results,0,required}', '30'));
  exception when others then v_failed := sqlerrm = 'coop_invalid_round'; end;
  assert v_failed, 'a target above the level''s';
  v_failed := false;
  begin perform public.coop_record_round(v_room_id, 1, jsonb_set(v_record, '{results,2,stopped}', 'true'));
  exception when others then v_failed := sqlerrm = 'coop_invalid_round'; end;
  assert v_failed, 'a threat stopped by nobody';

  -- Level 1 stopped; the level 3 of the rival held (+2), the level 5 left (+2).
  perform public.coop_record_round(v_room_id, 1, v_record);
  v_state := public.coop_state(v_room_id);
  assert (v_state ->> 'panic')::integer = 4, format('panic %s', v_state ->> 'panic');
  assert (v_state ->> 'current_round')::integer = 2, 'round 2';
  assert (v_state -> 'rounds' -> 0 -> 'eco' ->> 'definition_id')::uuid = v_rival[1], 'Eco shown';
  assert jsonb_array_length(v_state -> 'rounds' -> 0 -> 'plays') = 2, 'plays shown';
  assert not (v_state -> 'members' -> 0 ->> 'ready')::boolean, 'ready cleared';
  assert (select deadline_at > now() + interval '60 seconds' from public.coop_rounds where room_id = v_room_id and round = 2),
    'second round waits for the result';
  v_failed := false;
  begin perform public.coop_record_round(v_room_id, 1, v_record);
  exception when others then v_failed := sqlerrm = 'round_already_resolved'; end;
  assert v_failed, 'round recorded twice';

  -- A card played once is gone; the cards of the server only for who placed nothing.
  perform pg_temp.as_user(v_a);
  v_failed := false;
  begin perform public.coop_place(v_room_id, 2, jsonb_build_array(jsonb_build_object('card', v_squad_a[1], 'slot', 0)), true);
  exception when others then v_failed := sqlerrm = 'invalid_placement'; end;
  assert v_failed, 'card played twice';
  perform public.coop_place(v_room_id, 2, jsonb_build_array(jsonb_build_object('card', v_squad_a[2], 'slot', 0)), false);
  update public.coop_rounds set deadline_at = now() - interval '1 hour' where room_id = v_room_id and round = 2;
  v_failed := false;
  begin perform public.coop_record_round(v_room_id, 2, pg_temp.city_record(v_room_id, 2, jsonb_build_array(
    pg_temp.play(v_a, v_squad_a[2], 0, 9, true), pg_temp.play(v_b, v_squad_b[2], 1, 4, true)), array[false, false, false], v_rival[2]));
  exception when others then v_failed := sqlerrm = 'coop_placement_changed'; end;
  assert v_failed, 'own placement played as the server''s';

  -- Nothing stopped in rounds 2 and 3: the Panic reaches 12 and the operation is lost.
  for v_round in 2 .. 3 loop
    update public.coop_rounds set deadline_at = now() - interval '1 hour' where room_id = v_room_id and round = v_round;
    perform public.coop_record_round(v_room_id, v_round, pg_temp.city_record(v_room_id, v_round, jsonb_build_array(
      pg_temp.play(v_a, v_squad_a[v_round], 0, 1, v_round <> 2), pg_temp.play(v_b, v_squad_b[v_round], 1, 1, true)),
      array[false, false, false], v_rival[v_round]));
  end loop;
  v_state := public.coop_state(v_room_id);
  assert v_state ->> 'status' = 'lost', format('status %s, panic %s', v_state ->> 'status', v_state ->> 'panic');
  assert (v_state -> 'members' -> 0 ->> 'xp')::integer = 10, 'loss XP';
  assert not exists (select 1 from public.coop_progress where user_id in (v_a, v_b)), 'progress after a loss';

  -- A new room, the whole operation won: first-win coins, the next operation open for both.
  v_room := public.coop_create_room('O1M1');
  v_room_id := (v_room ->> 'id')::uuid;
  perform public.coop_set_squad(v_room_id, v_squad_a);
  perform public.coop_set_ready(v_room_id, true);
  perform pg_temp.as_user(v_b);
  perform public.coop_join_room(v_room ->> 'code');
  perform public.coop_set_squad(v_room_id, v_squad_b);
  perform public.coop_set_ready(v_room_id, true);
  perform pg_temp.as_user(v_a);
  perform public.coop_start(v_room_id);
  select coalesce(sum(amount), 0) into v_coins_before from public.coin_ledger where user_id = v_b;
  select xp into v_xp_before from public.profiles where id = v_b;
  for v_round in 1 .. 4 loop
    update public.coop_rounds set deadline_at = now() - interval '1 hour' where room_id = v_room_id and round = v_round;
    perform public.coop_record_round(v_room_id, v_round, pg_temp.city_record(v_room_id, v_round, jsonb_build_array(
      pg_temp.play(v_a, v_squad_a[v_round], 0, 9, true), pg_temp.play(v_b, v_squad_b[v_round], 2, 9, true)),
      array[true, true, true], v_rival[v_round]));
  end loop;
  -- The Boss: two cards each; three fronts, two broken (the one of the rival, slot 2, holds).
  update public.coop_rounds set deadline_at = now() - interval '1 hour' where room_id = v_room_id and round = 5;
  v_record := pg_temp.city_record(v_room_id, 5, jsonb_build_array(
    pg_temp.play(v_a, v_squad_a[5], 0, 9, true), pg_temp.play(v_b, v_squad_b[5], 1, 9, true)),
    array[true, true, false], v_rival[5]);
  -- The second card of each player supports a front: a lead with more, a support that adds its highest value.
  v_record := jsonb_set(v_record, '{plays}', (v_record -> 'plays')
    || jsonb_build_array(jsonb_set(jsonb_set(pg_temp.play(v_a, v_squad_a[6], 0, 2, true), '{role}', '"support"'), '{highest}', '2'))
    || jsonb_build_array(jsonb_set(pg_temp.play(v_b, v_squad_b[6], 2, 2, true), '{role}', '"lead"')));
  v_record := jsonb_set(v_record, '{results,0,total}', '11');
  v_record := jsonb_set(v_record, '{results,2,total}', '2');
  perform public.coop_record_round(v_room_id, 5, v_record);
  v_state := public.coop_state(v_room_id);
  assert v_state ->> 'status' = 'won', format('status %s', v_state ->> 'status');
  assert (v_state -> 'members' -> 1 ->> 'coins')::integer = 40, 'first-win coins';
  assert (select coalesce(sum(amount), 0) from public.coin_ledger where user_id = v_b) = v_coins_before + 40, 'coins in the ledger';
  assert (select xp from public.profiles where id = v_b) >= v_xp_before + 30, 'win XP';
  assert (v_state -> 'rounds' -> 4 ->> 'panic')::integer = 0, 'the Boss adds no Panic';
  perform pg_temp.as_user(v_b);
  v_coop := public.get_coop();
  assert (v_coop -> 'chapters' -> 0 -> 'operations' -> 0 ->> 'completed')::boolean, 'O1M1 completed';
  assert (v_coop -> 'chapters' -> 0 -> 'operations' -> 1 ->> 'unlocked')::boolean, 'O1M2 open';

  -- Leaving: a guest goes before the start; the host closes the room.
  v_room := public.coop_create_room('O1M2');
  v_room_id := (v_room ->> 'id')::uuid;
  perform pg_temp.as_user(v_c);
  perform public.coop_join_room(v_room ->> 'code');
  perform public.coop_leave_room(v_room_id);
  assert not exists (select 1 from public.coop_members where room_id = v_room_id and user_id = v_c), 'guest left';
  perform pg_temp.as_user(v_b);
  perform public.coop_leave_room(v_room_id);
  assert (select status from public.coop_rooms where id = v_room_id) = 'closed', 'host closed the room';
end $$;

rollback;
