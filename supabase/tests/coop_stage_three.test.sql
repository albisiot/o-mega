-- Integration test for the third stage of the Operazioni (SPEC §5.17): server allies, the public
-- queue «Cerca squadra», and the operations in events, daily objectives and Imprese. Client
-- functions read auth.uid() from the request claims; service-only functions are called as the
-- owner. Rolled back:
--   npm run test:db

begin;

-- Whatever an admin set in the real database: the Operazioni are open.
update public.mode_availability set state = 'on' where key = 'coop';

update public.game_config c set value = to_jsonb(d.value)
from (values
  ('coop.max_players', 4), ('coop.min_players', 2), ('coop.boss_cards', 2), ('coop.squad_size', 6),
  ('coop.panic_limit', 12), ('coop.panic_low', 1), ('coop.panic_high', 2), ('coop.panic_high_from_level', 4),
  ('coop.panic_reinforced', 1), ('coop.panic_limit_crowd', 10), ('coop.win_xp', 30), ('coop.loss_xp', 10),
  ('coop.queue_wait_seconds', 25), ('coop.ally_max_rank', 3)
) as d(key, value)
where c.key = d.key;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-8000-0000000006e' || n)::uuid, 'authenticated', 'authenticated',
       'coop3-' || n || '@example.test', jsonb_build_object('full_name', 'Coop Tre ' || n), now(), now()
from generate_series(1, 8) as n;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', '00000000-0000-4000-8000-0000000006e' || n, 'role', 'authenticated')::text, true),
       public.bootstrap_player()
from generate_series(1, 8) as n;
reset role;

create function pg_temp.as_user(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', p_user, 'role', 'authenticated')::text, true)
$$;

create function pg_temp.u(p_n integer) returns uuid language sql as $$
  select ('00000000-0000-4000-8000-0000000006e' || p_n)::uuid
$$;

-- Six distinct Delta or Gamma characters of a player.
create function pg_temp.squad(p_user uuid) returns uuid[] language sql as $$
  select array_agg(s.id) from (
    select distinct on (i.definition_id) i.id from public.card_instances i
    join public.card_definitions d on d.id = i.definition_id
    where i.owner_id = p_user and d.rarity_code in ('delta', 'gamma')
    order by i.definition_id, i.id limit 6) s
$$;

-- A play: the member's key (user id or "bot-<seat>"), the card, where, how, whether the server put it down.
create function pg_temp.play(p_player text, p_card uuid, p_slot integer, p_role text, p_total integer, p_auto boolean)
returns jsonb language sql as $$
  select jsonb_build_object('player', p_player, 'characterId', p_card, 'slot', p_slot, 'role', p_role,
    'base', p_total, 'bonus', 0, 'total', p_total, 'highest', 2, 'autoPlayed', p_auto, 'parts', null)
$$;

-- A round where every lead stops its threat (as in coop_stage_two.test.sql).
create function pg_temp.round_record(p_room uuid, p_round integer, p_plays jsonb, p_eco uuid)
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
    v_stopped := v_play is not null;
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
      'outcome', case when exists (
        select 1 from jsonb_array_elements(p_plays) e where (e ->> 'slot')::integer = v_round.reinforced_slot and e ->> 'role' = 'lead')
        then 'lost' else 'won' end),
    'panic', v_panic);
end $$;

-- A running event that pays the operations; every other event off.
update public.events set is_active = false where is_active;
insert into public.events (id, title, description, starts_at, ends_at, points)
values ('00000000-0000-4000-8000-0000000006f1', 'Evento delle operazioni', '', now() - interval '1 hour', now() + interval '2 days',
        public.event_points_rules('{"coop": {"win": 30, "loss": 10, "passed": 2}}'));

-- The first player's objectives of today: the four of the operations.
insert into public.daily_objective_definitions (code, title, difficulty, metric, params, target, coins, packs, card_definition_ids, card_variant_ids)
values
  ('test_coop_played', 'Completa un''Operazione', 'easy', 'coop_played', '{}', 1, null, 0, '{}', '{}'),
  ('test_coop_won', 'Vinci un''Operazione', 'easy', 'coop_won', '{}', 1, null, 0, '{}', '{}'),
  ('test_coop_threats', 'Ferma 10 Minacce nelle Operazioni', 'medium', 'coop_threats', '{}', 10, null, 0, '{}', '{}'),
  ('test_coop_stars', 'Ottieni 3 stelle nelle Operazioni', 'hard', 'coop_stars', '{}', 3, null, 0, '{}', '{}');
select public.ensure_daily_objectives('00000000-0000-4000-8000-0000000006e1');
delete from public.daily_objectives where user_id = '00000000-0000-4000-8000-0000000006e1';
insert into public.daily_objectives (user_id, day, slot, definition_code, difficulty, title, metric, params, target,
  coins, packs, card_definition_ids, card_variant_ids)
select '00000000-0000-4000-8000-0000000006e1', public.game_day(), row_number() over (order by d.code), d.code, d.difficulty,
  d.title, d.metric, d.params, d.target,
  coalesce(d.coins, public.config_int('daily_objectives.reward_coins.' || d.difficulty)), d.packs,
  d.card_definition_ids, d.card_variant_ids
from public.daily_objective_definitions d
where d.code like 'test_coop_%';

create function pg_temp.progress(p_code text) returns integer language sql as $$
  select progress from public.daily_objectives
  where user_id = '00000000-0000-4000-8000-0000000006e1' and day = public.game_day() and definition_code = p_code
$$;

-- Imprese of the operations, the only active ones.
update public.achievements set is_active = false;
insert into public.achievements (id, position, tier, name, description, hint, metric, params, target, coins, packs, title, counts_from) values
  ('00000000-0000-4000-8000-0000000006f2', 2001, 'bronze', 'In squadra', 'Hai completato un''Operazione.', null, 'coop_played', '{}', 1, 10, 0, null, null),
  ('00000000-0000-4000-8000-0000000006f3', 2002, 'silver', 'Missione compiuta', 'Hai vinto un''Operazione.', null, 'coop_won', '{}', 1, 10, 0, null, null),
  ('00000000-0000-4000-8000-0000000006f4', 2003, 'silver', 'Argine', 'Hai fermato 6 Minacce nelle Operazioni.', null, 'coop_threats', '{}', 6, 10, 0, null, null),
  ('00000000-0000-4000-8000-0000000006f5', 2004, 'gold', 'Tre stelle', 'Hai ottenuto 3 stelle nelle Operazioni.', null, 'coop_stars', '{}', 3, 10, 0, null, null),
  ('00000000-0000-4000-8000-0000000006f6', 2005, 'gold', 'Veterano', 'Hai vinto 2 Operazioni.', null, 'coop_won', '{}', 2, 10, 0, null, null);

do $$
declare
  v_a uuid := pg_temp.u(1);
  v_sq uuid[];
  v_rival uuid[];
  v_room jsonb;
  v_room_id uuid;
  v_state jsonb;
  v_ally jsonb;
  v_ally_cards uuid[];
  v_plays jsonb;
  v_round integer;
  v_failed boolean;
  v_points jsonb;
  v_operation uuid;
  v_status jsonb;
  v_other uuid;
  v_i integer;
begin
  v_sq := pg_temp.squad(v_a);
  select id, rival_definition_ids into v_operation, v_rival from public.coop_operations where code = 'O1M1';
  -- The squad star of O1M1 asks for Delta and Gamma only; the calm one is within reach.
  update public.coop_operations set star_panic = 8 where id = v_operation;

  -- ---------------------------------------------------------------------
  -- A room of one player and server allies
  -- ---------------------------------------------------------------------
  perform pg_temp.as_user(v_a);
  v_room := public.coop_create_room('O1M1');
  v_room_id := (v_room ->> 'id')::uuid;
  perform public.coop_set_squad(v_room_id, v_sq);
  perform public.coop_set_ready(v_room_id, true);

  -- Alone, no start.
  v_failed := false;
  begin perform public.coop_start(v_room_id);
  exception when others then v_failed := true; end;
  assert v_failed, 'one player started alone';

  -- Allies up to four, then the room is full; one taken away.
  for v_i in 1 .. 3 loop
    perform public.coop_add_ally(v_room_id);
  end loop;
  v_failed := false;
  begin perform public.coop_add_ally(v_room_id);
  exception when others then v_failed := sqlerrm = 'coop_room_full'; end;
  assert v_failed, 'a fifth member';
  assert (select count(*) from public.coop_members where room_id = v_room_id and user_id is null) = 3, 'three allies';
  assert (select count(distinct bot_name) from public.coop_members where room_id = v_room_id and user_id is null) = 3, 'three names';
  perform public.coop_remove_ally(v_room_id, 4);
  perform public.coop_remove_ally(v_room_id, 3);
  assert (select count(*) from public.coop_members where room_id = v_room_id) = 2, 'one ally left';

  -- Only the host adds or removes, and only before the start.
  perform pg_temp.as_user(pg_temp.u(2));
  v_failed := false;
  begin perform public.coop_add_ally(v_room_id);
  exception when others then v_failed := sqlerrm = 'coop_room_not_found'; end;
  assert v_failed, 'a stranger added an ally';

  -- The ally as the room shows it: declared, named, a face, six cards of the packs up to Beta, Pronto.
  perform pg_temp.as_user(v_a);
  v_state := public.coop_state(v_room_id);
  v_ally := v_state -> 'members' -> 1;
  assert (v_ally ->> 'bot')::boolean and v_ally ->> 'username' like 'Reggente %', format('ally %s', v_ally);
  assert (v_ally ->> 'ready')::boolean, 'the ally is ready';
  assert jsonb_typeof(v_ally -> 'user_id') = 'null', 'an ally has no account';
  assert v_ally ->> 'avatar_url' is not null, 'an ally has a face';
  assert jsonb_array_length(v_ally -> 'squad') = 6, format('ally squad %s', v_ally -> 'squad');
  assert not exists (
    select 1 from public.coop_members m, unnest(m.definition_ids) as d(id)
    join public.card_definitions c on c.id = d.id join public.rarity_definitions r on r.code = c.rarity_code
    where m.room_id = v_room_id and m.user_id is null and (r.rank > 3 or not public.is_pack_card(c))
  ), 'ally cards from the packs, up to Beta';
  assert (select count(distinct d) from public.coop_members m, unnest(m.definition_ids) d where m.room_id = v_room_id and m.user_id is null) = 6,
    'six different characters';
  select card_instance_ids into v_ally_cards from public.coop_members where room_id = v_room_id and seat = 2;

  perform public.coop_start(v_room_id);
  v_state := public.coop_state(v_room_id);
  assert v_state ->> 'status' = 'active' and (v_state ->> 'players')::integer = 2, 'one player and an ally play as two';
  assert jsonb_array_length(v_state -> 'rounds' -> 0 -> 'threats') = 3, 'three threats for two';
  v_failed := false;
  begin perform public.coop_remove_ally(v_room_id, 2);
  exception when others then v_failed := sqlerrm = 'coop_already_started'; end;
  assert v_failed, 'an ally taken away during the operation';

  -- Rounds 1-4: the player places a lead and says Pronto (no need to wait for the ally); the ally's
  -- card is the server's.
  for v_round in 1 .. 4 loop
    perform public.coop_place(v_room_id, v_round, jsonb_build_array(jsonb_build_object('card', v_sq[v_round], 'slot', 0)), true);
    v_plays := jsonb_build_array(
      pg_temp.play(v_a::text, v_sq[v_round], 0, 'lead', 9, false),
      pg_temp.play('bot-2', v_ally_cards[v_round], 1, 'lead', 9, true));
    perform public.coop_record_round(v_room_id, v_round, pg_temp.round_record(v_room_id, v_round, v_plays, v_rival[v_round]));
  end loop;
  assert (select count(*) from public.coop_plays where room_id = v_room_id and user_id is null and seat = 2) = 4, 'the ally plays are kept';

  -- An ally cannot place a card of its own as a person would.
  update public.coop_rounds set deadline_at = now() - interval '1 hour' where room_id = v_room_id and round = 5;
  v_plays := jsonb_build_array(
    pg_temp.play(v_a::text, v_sq[5], 0, 'lead', 9, true), pg_temp.play(v_a::text, v_sq[6], 2, 'lead', 9, true),
    pg_temp.play('bot-2', v_ally_cards[5], 1, 'lead', 9, false), pg_temp.play('bot-2', v_ally_cards[6], 0, 'support', 2, true));
  v_failed := false;
  begin perform public.coop_record_round(v_room_id, 5, pg_temp.round_record(v_room_id, 5, v_plays, v_rival[5]));
  exception when others then v_failed := sqlerrm = 'coop_invalid_round'; end;
  assert v_failed, 'an ally play not put down by the server';

  -- The Boss: the player places both cards, every front broken.
  update public.coop_rounds set deadline_at = now() + interval '1 hour' where room_id = v_room_id and round = 5;
  perform public.coop_place(v_room_id, 5, jsonb_build_array(
    jsonb_build_object('card', v_sq[5], 'slot', 0), jsonb_build_object('card', v_sq[6], 'slot', 2)), true);
  v_plays := jsonb_build_array(
    pg_temp.play(v_a::text, v_sq[5], 0, 'lead', 9, false), pg_temp.play(v_a::text, v_sq[6], 2, 'lead', 9, false),
    pg_temp.play('bot-2', v_ally_cards[5], 1, 'lead', 9, true), pg_temp.play('bot-2', v_ally_cards[6], 0, 'support', 2, true));
  perform public.coop_record_round(v_room_id, 5, pg_temp.round_record(v_room_id, 5, v_plays, v_rival[5]));
  v_state := public.coop_state(v_room_id);
  assert v_state ->> 'status' = 'won', format('status %s', v_state ->> 'status');

  -- Prizes, XP and stars for the person only.
  assert (v_state -> 'members' -> 0 ->> 'xp')::integer = 30, 'XP for the player';
  assert jsonb_typeof(v_state -> 'members' -> 1 -> 'xp') = 'null', format('no XP for the ally: %s', v_state -> 'members' -> 1);
  assert jsonb_typeof(v_state -> 'members' -> 1 -> 'stars') = 'null', 'no stars for the ally';
  assert (v_state -> 'members' -> 0 -> 'stars') = '["calm", "boss", "squad"]'::jsonb, format('stars %s', v_state -> 'members' -> 0 -> 'stars');
  assert (select count(*) from public.coop_progress where room_id = v_room_id) = 1, 'progress for the player only';
  assert (select count(*) from public.coop_stars where operation_id = v_operation and user_id = v_a) = 3, 'three stars';

  -- Events: the operation (30) and the six threats the player stopped with cards they chose (2 each).
  assert (select count(*) from public.event_points where ref_id = v_room_id and user_id = v_a and kind = 'coop' and outcome = 'win' and round = 0) = 1,
    'the operation in the event';
  assert (select count(*) from public.event_points where ref_id = v_room_id and user_id = v_a and kind = 'coop' and outcome = 'passed') = 6,
    format('threats in the event: %s', (select count(*) from public.event_points where ref_id = v_room_id and outcome = 'passed'));
  v_points := public.get_event_points_for(v_room_id);
  assert (v_points ->> 'points')::integer = 42, format('event points %s', v_points);

  -- Daily objectives: finished, won, 6 threats of 10, the three stars of this win.
  assert pg_temp.progress('test_coop_played') = 1, 'objective: operation finished';
  assert pg_temp.progress('test_coop_won') = 1, 'objective: operation won';
  assert pg_temp.progress('test_coop_threats') = 6, format('objective: threats %s', pg_temp.progress('test_coop_threats'));
  assert pg_temp.progress('test_coop_stars') = 3, format('objective: stars %s', pg_temp.progress('test_coop_stars'));

  -- Imprese: the four met, two operations won not yet.
  assert (select count(*) from public.player_achievements where user_id = v_a
          and achievement_id in ('00000000-0000-4000-8000-0000000006f2', '00000000-0000-4000-8000-0000000006f3',
                                 '00000000-0000-4000-8000-0000000006f4', '00000000-0000-4000-8000-0000000006f5')) = 4,
    format('imprese %s', (select array_agg(name) from public.player_achievements where user_id = v_a));
  assert not exists (select 1 from public.player_achievements where user_id = v_a and achievement_id = '00000000-0000-4000-8000-0000000006f6'),
    'two operations won';
  assert public.achievement_progress(v_a, 'coop_threats', '{}', null) = 6, 'impresa progress: threats';
  assert public.achievement_progress(v_a, 'coop_threats', '{}', now() + interval '1 minute') = 0, 'impresa progress: threats since later';
  assert public.achievement_progress(v_a, 'coop_stars', '{}', null) = 3, 'impresa progress: stars';
  assert public.achievement_progress(v_a, 'coop_played', '{}', null) = 1, 'impresa progress: played';

  -- The admin editors take the new metrics.
  insert into public.admin_users (user_id) values (pg_temp.u(8));
  perform pg_temp.as_user(pg_temp.u(8));
  perform public.admin_save_daily_objective(null, 'Vinci 2 Operazioni', 'medium', 'coop_won', '{}', 2, null, 0);
  assert exists (select 1 from public.daily_objective_definitions where metric = 'coop_won' and target = 2), 'objective saved';
  v_failed := false;
  begin perform public.admin_save_daily_objective(null, 'Con filtro', 'medium', 'coop_won', '{"format": "classic"}', 2, null, 0);
  exception when others then v_failed := sqlerrm = 'invalid_objective'; end;
  assert v_failed, 'a filter on an operation metric';
  assert public.event_points_rules('{"coop": {"win": 5}}') -> 'coop' = '{"win": 5, "loss": 0, "passed": 0}'::jsonb, 'the event rules of the operations';
  delete from public.admin_users where user_id = pg_temp.u(8);

  -- ---------------------------------------------------------------------
  -- The public queue
  -- ---------------------------------------------------------------------
  -- Two players: they wait, then the room starts with them two.
  perform pg_temp.as_user(pg_temp.u(2));
  v_status := public.coop_queue_join('O1M1', pg_temp.squad(pg_temp.u(2)));
  assert (v_status ->> 'queued')::boolean and (v_status ->> 'waiting')::integer = 1 and jsonb_typeof(v_status -> 'room') = 'null',
    format('first in the queue %s', v_status);
  assert v_status ->> 'operation' = 'O1M1' and (v_status ->> 'wait_seconds')::integer = 25, 'queue status';
  perform pg_temp.as_user(pg_temp.u(3));
  v_status := public.coop_queue_join('O1M1', pg_temp.squad(pg_temp.u(3)));
  assert (v_status ->> 'waiting')::integer = 2 and jsonb_typeof(v_status -> 'room') = 'null', format('two waiting %s', v_status);
  v_status := public.coop_queue_poll();
  assert jsonb_typeof(v_status -> 'room') = 'null', 'no room before the wait';
  v_status := (public.get_coop() -> 'queue');
  assert (v_status ->> 'queued')::boolean, 'the chapter shows the queue';

  update public.coop_queue set joined_at = now() - interval '30 seconds' where user_id in (pg_temp.u(2), pg_temp.u(3));
  v_status := public.coop_queue_poll();
  v_room_id := (v_status ->> 'room')::uuid;
  assert v_room_id is not null and not (v_status ->> 'queued')::boolean, format('room after the wait %s', v_status);
  v_state := public.coop_state(v_room_id);
  assert v_state ->> 'status' = 'active' and (v_state ->> 'players')::integer = 2, format('started room %s', v_state ->> 'status');
  assert not exists (select 1 from public.coop_members where room_id = v_room_id and user_id is null), 'two players need no ally';
  assert (select count(*) from public.coop_members where room_id = v_room_id and cardinality(card_instance_ids) = 6) = 2, 'squads brought';
  perform pg_temp.as_user(pg_temp.u(2));
  assert (public.coop_queue_poll() ->> 'room')::uuid = v_room_id, 'the other player learns the room';
  assert not exists (select 1 from public.coop_queue where user_id in (pg_temp.u(2), pg_temp.u(3))), 'out of the queue';

  -- In a room: no queue.
  v_failed := false;
  begin perform public.coop_queue_join('O1M1', pg_temp.squad(pg_temp.u(2)));
  exception when others then v_failed := sqlerrm = 'coop_already_in_room'; end;
  assert v_failed, 'queued from a room';

  -- Alone after the wait: a server ally.
  perform pg_temp.as_user(pg_temp.u(4));
  perform public.coop_queue_join('O1M1', pg_temp.squad(pg_temp.u(4)));
  update public.coop_queue set joined_at = now() - interval '30 seconds' where user_id = pg_temp.u(4);
  v_room_id := (public.coop_queue_poll() ->> 'room')::uuid;
  assert v_room_id is not null, 'alone, a room after the wait';
  assert (select count(*) from public.coop_members where room_id = v_room_id and user_id is null) = 1, 'one ally';
  assert (select status from public.coop_rooms where id = v_room_id) = 'active', 'started with the ally';
  assert exists (select 1 from public.coop_rounds where room_id = v_room_id and round = 1), 'round one open';

  -- Four players: the room starts as soon as the fourth arrives.
  for v_i in 5 .. 8 loop
    perform pg_temp.as_user(pg_temp.u(v_i));
    v_status := public.coop_queue_join('O1M1', pg_temp.squad(pg_temp.u(v_i)));
    if v_i < 8 then
      assert jsonb_typeof(v_status -> 'room') = 'null', format('room with %s players', v_i - 4);
    end if;
  end loop;
  v_room_id := (v_status ->> 'room')::uuid;
  assert v_room_id is not null, 'a full room at once';
  assert (select count(*) from public.coop_members where room_id = v_room_id and user_id is not null) = 4, 'four players';
  assert (select players from public.coop_rooms where id = v_room_id) = 4, 'a room of four';

  -- Leaving, closing the page, opening a room: out of the queue.
  perform pg_temp.as_user(v_a);
  perform public.coop_queue_join('O1M1', v_sq);
  perform public.coop_queue_leave();
  assert not (public.coop_queue_poll() ->> 'queued')::boolean, 'left the queue';
  perform public.coop_queue_join('O1M1', v_sq);
  update public.coop_queue set polled_at = now() - interval '20 seconds' where user_id = v_a;
  perform public.coop_queue_match(v_operation);
  assert not exists (select 1 from public.coop_queue where user_id = v_a), 'a player who stopped asking is out';
  perform public.coop_queue_join('O1M1', v_sq);
  perform public.coop_create_room('O1M1');
  assert not exists (select 1 from public.coop_queue where user_id = v_a), 'a room of their own takes the player out';

  -- A squad of the wrong size, a card not owned.
  perform pg_temp.as_user(pg_temp.u(2));
  perform public.coop_leave_room((select room_id from public.coop_members where user_id = pg_temp.u(2) order by joined_at desc limit 1));
  v_failed := false;
  begin perform public.coop_queue_join('O1M1', v_sq[1:5]);
  exception when others then v_failed := sqlerrm = 'invalid_team_size'; end;
  assert v_failed, 'a squad of five';
  v_failed := false;
  begin perform public.coop_queue_join('O1M1', v_sq);
  exception when others then v_failed := sqlerrm = 'card_not_owned'; end;
  assert v_failed, 'somebody else''s cards';
end $$;

rollback;
