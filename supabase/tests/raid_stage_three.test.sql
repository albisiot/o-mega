-- Integration test for the third stage of the Caccia grossa (SPEC §5.18): the public queue
-- «Cerca squadra», the Boss of the week, the hunts in events, daily objectives and Imprese, and
-- the Boss of the community. Client functions read auth.uid() from the request claims;
-- service-only functions are called as the owner. Rolled back:
--   npm run test:db

begin;

-- Whatever an admin set in the real database: both cooperative modes are open.
update public.mode_availability set state = 'on' where key in ('raid', 'coop');

update public.game_config c set value = to_jsonb(d.value)
from (values
  ('raid.rounds', 5), ('raid.squad_size', 6), ('raid.min_players', 2), ('raid.max_players', 4), ('raid.defenses', 3),
  ('raid.vita_base', 14), ('raid.vita_factor.players2', 200), ('raid.attack_factor.players2', 200),
  ('raid.self_chosen_percent', 50), ('raid.queue_wait_seconds', 25), ('raid.weekly_coins', 60),
  ('raid.star_coins', 20), ('raid.quick_round', 4), ('raid.win_xp', 30), ('raid.first_win_coins', 60)
) as d(key, value)
where c.key = d.key;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-8000-000000000ad' || n)::uuid, 'authenticated', 'authenticated',
       'raid3-' || n || '@example.test', jsonb_build_object('full_name', 'Caccia Tre ' || n), now(), now()
from generate_series(1, 6) as n;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', '00000000-0000-4000-8000-000000000ad' || n, 'role', 'authenticated')::text, true),
       public.bootstrap_player()
from generate_series(1, 6) as n;
reset role;

insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-000000000ad6');

create function pg_temp.as_user(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', p_user, 'role', 'authenticated')::text, true)
$$;

create function pg_temp.u(p_n integer) returns uuid language sql as $$
  select ('00000000-0000-4000-8000-000000000ad' || p_n)::uuid
$$;

create function pg_temp.squad(p_user uuid) returns uuid[] language sql as $$
  select array_agg(s.id) from (
    select distinct on (i.definition_id) i.id from public.card_instances i
    join public.card_definitions d on d.id = i.definition_id
    where i.owner_id = p_user and d.power_code is distinct from 'nullifier' and d.power_code is distinct from 'delayed_nullifier'
    order by i.definition_id, i.id limit 6) s
$$;

create function pg_temp.play(p_player text, p_card uuid, p_total integer, p_auto boolean)
returns jsonb language sql as $$
  select jsonb_build_object('player', p_player, 'characterId', p_card, 'base', p_total, 'bonus', 0, 'total', p_total,
    'counted', p_total, 'highest', 3, 'autoPlayed', p_auto, 'parts', null)
$$;

-- Round 1 of a room, an Attacco semplice, won at once by the cards given.
create function pg_temp.win_round_one(p_room uuid, p_plays jsonb)
returns void language plpgsql as $$
declare
  v_room public.raid_rooms;
  v_round public.raid_rounds;
  v_total integer;
begin
  update public.raid_rounds set move = 'plain', deadline_at = now() - interval '1 minute' where room_id = p_room and round = 1;
  select * into v_room from public.raid_rooms where id = p_room;
  select * into v_round from public.raid_rounds where room_id = p_room and round = 1;
  select sum((e ->> 'counted')::integer) into v_total from jsonb_array_elements(p_plays) e;
  perform public.raid_record_round(p_room, 1, jsonb_build_object(
    'plays', p_plays, 'move', 'plain', 'cancelled', false, 'attack', v_round.attack,
    'effectiveAttack', v_round.attack, 'required', v_round.attack, 'total', v_total, 'held', true,
    'damage', v_total - v_round.attack, 'defensesLost', 0, 'healed', 0,
    'vita', greatest(0, v_room.vita - (v_total - v_round.attack)), 'defenses', v_room.defenses));
end $$;

-- A running event that pays the hunts, with a community Boss; every other event off.
update public.events set is_active = false where is_active;
insert into public.events (id, title, description, starts_at, ends_at, points)
values ('00000000-0000-4000-8000-000000000ae1', 'Evento della caccia', '', now() - interval '1 hour', now() + interval '2 days',
        public.event_points_rules('{"raid": {"win": 30, "loss": 10, "passed": 2}}'));
insert into public.raid_community (event_id, vita, coins, packs, shards)
values ('00000000-0000-4000-8000-000000000ae1', 20, 25, 0, 0);

-- The first player's objectives of today: the four of the hunt.
insert into public.daily_objective_definitions (code, title, difficulty, metric, params, target, coins, packs, card_definition_ids, card_variant_ids)
values
  ('test_raid_played', 'Affronta un Boss', 'easy', 'raid_played', '{}', 1, null, 0, '{}', '{}'),
  ('test_raid_won', 'Abbatti un Boss', 'easy', 'raid_won', '{}', 1, null, 0, '{}', '{}'),
  ('test_raid_damage', 'Infliggi 100 danni', 'medium', 'raid_damage', '{}', 100, null, 0, '{}', '{}'),
  ('test_raid_stars', 'Ottieni 3 stelle', 'hard', 'raid_stars', '{}', 3, null, 0, '{}', '{}');
select public.ensure_daily_objectives('00000000-0000-4000-8000-000000000ad1');
delete from public.daily_objectives where user_id = '00000000-0000-4000-8000-000000000ad1';
insert into public.daily_objectives (user_id, day, slot, definition_code, difficulty, title, metric, params, target,
  coins, packs, card_definition_ids, card_variant_ids)
select '00000000-0000-4000-8000-000000000ad1', public.game_day(), row_number() over (order by d.code), d.code, d.difficulty,
  d.title, d.metric, d.params, d.target,
  coalesce(d.coins, public.config_int('daily_objectives.reward_coins.' || d.difficulty)), d.packs,
  d.card_definition_ids, d.card_variant_ids
from public.daily_objective_definitions d
where d.code like 'test_raid_%';

create function pg_temp.progress(p_code text) returns integer language sql as $$
  select progress from public.daily_objectives
  where user_id = '00000000-0000-4000-8000-000000000ad1' and day = public.game_day() and definition_code = p_code
$$;

-- Imprese of the hunt, the only active ones.
update public.achievements set is_active = false;
insert into public.achievements (id, position, tier, name, description, hint, metric, params, target, coins, packs, title, counts_from) values
  ('00000000-0000-4000-8000-000000000ae2', 3001, 'bronze', 'Preda', 'Hai abbattuto un Boss.', null, 'raid_won', '{}', 1, 10, 0, null, null),
  ('00000000-0000-4000-8000-000000000ae3', 3002, 'silver', 'Stelle', 'Hai ottenuto 3 stelle.', null, 'raid_stars', '{}', 3, 10, 0, null, null),
  ('00000000-0000-4000-8000-000000000ae4', 3003, 'gold', 'Settimana', 'Hai abbattuto il Boss della settimana.', null, 'raid_weekly', '{}', 1, 10, 0, null, null),
  ('00000000-0000-4000-8000-000000000ae5', 3004, 'gold', 'Due Boss', 'Hai abbattuto 2 Boss diversi.', null, 'raid_bosses', '{}', 2, 10, 0, null, null);

do $$
declare
  v_week date := public.game_week(public.game_day());
  v_boss uuid;
  v_b01 uuid := (select id from public.boss_definitions where code = 'B01');
  v_b04 uuid := (select id from public.boss_definitions where code = 'B04');
begin
  -- The rotation: with no week before, the first Boss by code.
  delete from public.raid_weeks;
  assert (select code from public.boss_definitions where id = public.raid_week_boss(v_week)) = 'B01', 'the first by code';
  assert public.raid_week_boss(v_week) = v_b01, 'written once';
  -- After a Magnitude 5, never another one: with B05 off and B06 at Magnitude 5, after B04 the rotation wraps to B01.
  delete from public.raid_weeks;
  update public.boss_definitions set raid_active = false where code = 'B05';
  update public.boss_definitions set raid_magnitude = 5 where code = 'B06';
  insert into public.raid_weeks (week, boss_id) values (v_week - 7, v_b04);
  assert public.raid_week_boss(v_week) = v_b01, format('after B04: %s', (select code from public.boss_definitions where id = public.raid_week_boss(v_week)));
  update public.boss_definitions set raid_active = true where code = 'B05';
  update public.boss_definitions set raid_magnitude = 4 where code = 'B06';
  -- This week's Boss for the rest of the test: La Mente Madre.
  update public.raid_weeks set boss_id = (select id from public.boss_definitions where code = 'B03') where week = v_week;
end $$;

do $$
declare
  v_a uuid := pg_temp.u(1);
  v_b uuid := pg_temp.u(2);
  v_status jsonb;
  v_room_id uuid;
  v_room public.raid_rooms;
  v_catalog jsonb;
  v_failed boolean;
  v_coins integer;
begin
  -- ---------------------------------------------------------------------
  -- The public queue: two players on La Mente Madre; after the wait, a room of two
  -- ---------------------------------------------------------------------
  perform pg_temp.as_user(v_a);
  v_status := public.raid_queue_join('B03', pg_temp.squad(v_a));
  assert (v_status ->> 'queued')::boolean and v_status ->> 'boss' = 'B03' and (v_status ->> 'waiting')::integer = 1, format('queued %s', v_status);
  perform pg_temp.as_user(v_b);
  v_status := public.raid_queue_join('B03', pg_temp.squad(v_b));
  assert (v_status ->> 'waiting')::integer = 2 and v_status ->> 'room' is null, 'two waiting, no room yet';
  update public.raid_queue set joined_at = now() - interval '30 seconds' where user_id in (v_a, v_b);
  v_status := public.raid_queue_poll();
  v_room_id := (v_status ->> 'room')::uuid;
  assert v_room_id is not null and not (v_status ->> 'queued')::boolean, format('a room %s', v_status);
  select * into v_room from public.raid_rooms where id = v_room_id;
  assert v_room.status = 'active' and v_room.players = 2 and v_room.current_round = 1, format('started %s', row_to_json(v_room));
  assert (select count(*) from public.raid_members where room_id = v_room_id and user_id is not null and card_instance_ids is not null) = 2, 'two squads';
  assert not exists (select 1 from public.raid_queue where user_id in (v_a, v_b)), 'out of the queue';

  -- The catalog: the queue, this week's Boss, the community's Boss.
  perform pg_temp.as_user(v_a);
  v_catalog := public.get_raid();
  assert v_catalog -> 'week' ->> 'boss' = 'B03' and not (v_catalog -> 'week' ->> 'won')::boolean, format('week %s', v_catalog -> 'week');
  assert (v_catalog -> 'week' ->> 'coins')::integer = 60, 'a Magnitude 3 week pays the base';
  assert (select (b ->> 'weekly')::boolean from jsonb_array_elements(v_catalog -> 'bosses') b where b ->> 'code' = 'B03'), 'marked';
  assert (v_catalog -> 'community' ->> 'vita')::integer = 20 and not (v_catalog -> 'community' ->> 'fallen')::boolean, 'the community';
  assert (public.raid_state(v_room_id) -> 'boss' ->> 'weekly')::boolean, 'the room says so';

  -- ---------------------------------------------------------------------
  -- The hunt: A chooses, B not; the Boss falls in round 1 with 25 damage
  -- ---------------------------------------------------------------------
  perform public.raid_place(v_room_id, 1, (select card_instance_ids[1] from public.raid_members where room_id = v_room_id and user_id = v_a), true);
  perform pg_temp.win_round_one(v_room_id, jsonb_build_array(
    pg_temp.play(v_a::text, (select card_instance_ids[1] from public.raid_members where room_id = v_room_id and user_id = v_a), 80, false),
    pg_temp.play(v_b::text, (select card_instance_ids[1] from public.raid_members where room_id = v_room_id and user_id = v_b), 80, true)));
  select * into v_room from public.raid_rooms where id = v_room_id;
  assert v_room.status = 'won', 'won';

  -- The Boss of the week: 60 coins to A, the first win of the week; nothing to B (chose nothing).
  assert (select weekly_coins from public.raid_members where room_id = v_room_id and user_id = v_a) = 60, 'the week paid';
  assert (select amount from public.coin_ledger where user_id = v_a and reason = 'raid_weekly' and ref_id = v_room_id) = 60, 'in the ledger';
  assert not exists (select 1 from public.raid_weekly_wins where user_id = v_b), 'not B';

  -- The event: the hunt won and its round held, for A only.
  assert (select count(*) from public.event_points where ref_id = v_room_id and user_id = v_a and kind = 'raid' and outcome = 'win') = 1
     and (select count(*) from public.event_points where ref_id = v_room_id and user_id = v_a and kind = 'raid' and outcome = 'passed') = 1,
    format('event %s', (select array_agg(outcome) from public.event_points where ref_id = v_room_id));
  assert not exists (select 1 from public.event_points where ref_id = v_room_id and user_id = v_b), 'no points without choosing';

  -- The community's Boss fell (damage above its Life of 20): A paid, B not.
  assert (select fallen_at is not null from public.raid_community where event_id = '00000000-0000-4000-8000-000000000ae1'), 'fallen';
  assert (select coins from public.raid_community_rewards where user_id = v_a) = 25
     and (select community from public.raid_members where room_id = v_room_id and user_id = v_a), 'the community paid A';
  assert not exists (select 1 from public.raid_community_rewards where user_id = v_b), 'not B';

  -- Daily objectives and Imprese.
  assert pg_temp.progress('test_raid_played') = 1 and pg_temp.progress('test_raid_won') = 1, 'objectives: played, won';
  assert pg_temp.progress('test_raid_damage') = least(100, (select sum(damage)::integer from public.raid_rounds where room_id = v_room_id)), format('objective: damage %s', pg_temp.progress('test_raid_damage'));
  assert pg_temp.progress('test_raid_stars') = 3, format('objective: stars %s', pg_temp.progress('test_raid_stars'));
  assert (select count(*) from public.player_achievements where user_id = v_a and achievement_id in (
    '00000000-0000-4000-8000-000000000ae2', '00000000-0000-4000-8000-000000000ae3', '00000000-0000-4000-8000-000000000ae4')) = 3,
    format('imprese %s', (select array_agg(name) from public.player_achievements where user_id = v_a));
  assert not exists (select 1 from public.player_achievements where user_id = v_a and achievement_id = '00000000-0000-4000-8000-000000000ae5'),
    'one Boss only';
  assert public.achievement_progress(v_a, 'raid_damage', '{}', null) = (select sum(damage)::integer from public.raid_rounds where room_id = v_room_id), 'impresa progress: damage';
  assert public.achievement_progress(v_b, 'raid_played', '{}', null) = 0, 'nothing for B';

  -- A second win this week: no weekly coins; a third player joining after the fall gets the community's reward.
  perform pg_temp.as_user(pg_temp.u(3));
  v_status := public.raid_queue_join('B03', pg_temp.squad(pg_temp.u(3)));
  update public.raid_queue set joined_at = now() - interval '30 seconds' where user_id = pg_temp.u(3);
  v_status := public.raid_queue_poll();
  v_room_id := (v_status ->> 'room')::uuid;
  assert (select count(*) from public.raid_members where room_id = v_room_id and user_id is null) = 1, 'alone with an ally';
  perform public.raid_place(v_room_id, 1, (select card_instance_ids[1] from public.raid_members where room_id = v_room_id and seat = 1), true);
  perform pg_temp.win_round_one(v_room_id, jsonb_build_array(
    pg_temp.play(pg_temp.u(3)::text, (select card_instance_ids[1] from public.raid_members where room_id = v_room_id and seat = 1), 80, false),
    pg_temp.play('bot-2', (select card_instance_ids[1] from public.raid_members where room_id = v_room_id and seat = 2), 80, true)));
  assert (select coins from public.raid_community_rewards where user_id = pg_temp.u(3)) = 25, 'the community, after the fall';
  assert (select weekly_coins from public.raid_members where room_id = v_room_id and seat = 1) = 60, 'its own first win of the week';
  select coalesce(sum(amount), 0) into v_coins from public.coin_ledger where user_id = v_a and reason = 'raid_weekly';
  assert v_coins = 60, 'A paid once';

  -- ---------------------------------------------------------------------
  -- One queue at a time; the mode closed
  -- ---------------------------------------------------------------------
  perform pg_temp.as_user(pg_temp.u(4));
  perform public.raid_queue_join('B03', pg_temp.squad(pg_temp.u(4)));
  perform public.coop_queue_join('O1M1', pg_temp.squad(pg_temp.u(4)));
  assert not exists (select 1 from public.raid_queue where user_id = pg_temp.u(4)), 'the Operazioni''s queue takes the player out';
  perform public.raid_queue_join('B03', pg_temp.squad(pg_temp.u(4)));
  assert not exists (select 1 from public.coop_queue where user_id = pg_temp.u(4)), 'and the other way';
  update public.mode_availability set state = 'off' where key = 'raid';
  perform pg_temp.as_user(pg_temp.u(5));
  v_failed := false;
  begin perform public.raid_queue_join('B03', pg_temp.squad(pg_temp.u(5)));
  exception when others then v_failed := sqlerrm = 'mode_unavailable'; end;
  assert v_failed, 'the queue while the mode is closed';
  update public.mode_availability set state = 'on' where key = 'raid';
end $$;

do $$
declare
  v_admin uuid := pg_temp.u(6);
  v_data jsonb;
  v_failed boolean;
  v_future uuid;
begin
  perform pg_temp.as_user(v_admin);
  v_data := public.admin_get_bosses();
  assert jsonb_array_length(v_data -> 'weeks') = 4 and v_data -> 'weeks' -> 0 ->> 'boss' = 'B03', format('weeks %s', v_data -> 'weeks');
  assert exists (select 1 from jsonb_array_elements(v_data -> 'events') e where (e -> 'community' ->> 'fallen')::boolean), 'the event';

  -- Next week's Boss, by hand; a past week refused.
  v_data := public.admin_set_raid_week(public.game_week(public.game_day()) + 7, 'B05');
  assert v_data -> 'weeks' -> 1 ->> 'boss' = 'B05' and (v_data -> 'weeks' -> 1 ->> 'chosen')::boolean, 'chosen';
  v_failed := false;
  begin perform public.admin_set_raid_week(public.game_week(public.game_day()) - 7, 'B05');
  exception when others then v_failed := sqlerrm = 'raid_week_past'; end;
  assert v_failed, 'a past week';

  -- A community Boss on an event to come; not on the running one.
  insert into public.events (title, description, starts_at, ends_at, points, is_active)
  values ('Evento futuro', '', now() + interval '3 days', now() + interval '5 days', public.event_points_rules('{}'), false)
  returning id into v_future;
  perform public.admin_set_raid_community(v_future, 500, 0, 1, 0);
  assert (select vita = 500 and packs = 1 from public.raid_community where event_id = v_future), 'set';
  v_failed := false;
  begin perform public.admin_set_raid_community(v_future, 500, 0, 0, 0);
  exception when others then v_failed := sqlerrm = 'raid_community_invalid'; end;
  assert v_failed, 'a reward of nothing';
  v_failed := false;
  begin perform public.admin_set_raid_community('00000000-0000-4000-8000-000000000ae1', 100, 10, 0, 0);
  exception when others then v_failed := sqlerrm = 'raid_community_started'; end;
  assert v_failed, 'a running event';
  perform public.admin_set_raid_community(v_future, null, null, null, null);
  assert not exists (select 1 from public.raid_community where event_id = v_future), 'taken away';

  perform pg_temp.as_user(pg_temp.u(1));
  v_failed := false;
  begin perform public.admin_set_raid_week(public.game_week(public.game_day()) + 14, 'B05');
  exception when others then v_failed := sqlerrm = 'not_admin'; end;
  assert v_failed, 'a player picked a week';
end $$;

rollback;
