-- Integration test for the Caccia grossa (SPEC §5.18): the Bosses, the draw of threats and
-- moves, rooms with friends and allies, one room at a time across the Operazioni, the record
-- of a round (the damage, the Defences, Bersaglio, Annullatore, Rigenerazione worked out by the
-- database), the end with its prizes, what a member sees, the mode switch. Client functions
-- read auth.uid() from the request claims; service-only functions are called as the owner.
-- Rolled back:
--   npm run test:db

begin;

-- Whatever an admin set in the real database: both cooperative modes are open.
update public.mode_availability set state = 'on' where key in ('coop', 'raid');

update public.game_config c set value = to_jsonb(d.value)
from (values
  ('raid.rounds', 5), ('raid.squad_size', 6), ('raid.min_players', 2), ('raid.max_players', 4), ('raid.defenses', 3),
  ('raid.targets.level1', 7), ('raid.targets.level2', 13), ('raid.targets.level3', 18), ('raid.targets.level4', 23),
  ('raid.targets.level5', 28), ('raid.targets.level6', 32),
  ('raid.attack_factor.players2', 200), ('raid.attack_factor.players3', 300), ('raid.attack_factor.players4', 405),
  ('raid.vita_factor.players2', 200), ('raid.vita_factor.players3', 290), ('raid.vita_factor.players4', 370),
  ('raid.vita_base', 14), ('raid.magnitude3.forza_percent', 100), ('raid.magnitude3.reward_percent', 100),
  ('raid.magnitude1.forza_percent', 92), ('raid.magnitude1.reward_percent', 50),
  ('raid.heavy_defenses', 2), ('raid.regen_percent', 10), ('raid.exposed_max', 1), ('raid.heavy_max', 2),
  ('raid.from_district', 2), ('raid.win_xp', 30), ('raid.loss_xp', 10), ('raid.first_win_coins', 60),
  ('raid.self_chosen_percent', 50), ('raid.ally_max_rank', 3)
) as d(key, value)
where c.key = d.key;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-8000-0000000008b' || n)::uuid, 'authenticated', 'authenticated',
       'raid-' || n || '@example.test', jsonb_build_object('full_name', 'Caccia ' || n), now(), now()
from generate_series(1, 6) as n;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', '00000000-0000-4000-8000-0000000008b' || n, 'role', 'authenticated')::text, true),
       public.bootstrap_player()
from generate_series(1, 6) as n;
reset role;

create function pg_temp.as_user(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', p_user, 'role', 'authenticated')::text, true)
$$;

create function pg_temp.u(p_n integer) returns uuid language sql as $$
  select ('00000000-0000-4000-8000-0000000008b' || p_n)::uuid
$$;

-- Six distinct characters of a player (the starter set has ten), without an Annullatore.
create function pg_temp.squad(p_user uuid) returns uuid[] language sql as $$
  select array_agg(s.id) from (
    select distinct on (i.definition_id) i.id from public.card_instances i
    join public.card_definitions d on d.id = i.definition_id
    where i.owner_id = p_user and d.power_code is distinct from 'nullifier' and d.power_code is distinct from 'delayed_nullifier'
    order by i.definition_id, i.id limit 6) s
$$;

-- A play as the engine sends it: the member's key, the card, its score, what it added, whether the server put it down.
create function pg_temp.play(p_player text, p_card uuid, p_total integer, p_counted integer, p_auto boolean)
returns jsonb language sql as $$
  select jsonb_build_object('player', p_player, 'characterId', p_card, 'base', p_total, 'bonus', 0, 'total', p_total,
    'counted', p_counted, 'highest', 3, 'autoPlayed', p_auto, 'parts', null)
$$;

-- A round's record as the engine would make it, with no Sabotatore or Implacabile: the database's own sums.
-- The move is cancelled when one of the cards is an Annullatore, unless p_cancelled says otherwise.
create function pg_temp.record(p_room uuid, p_round integer, p_plays jsonb, p_cancelled boolean default null)
returns jsonb language plpgsql as $$
declare
  v_room public.raid_rooms;
  v_round public.raid_rounds;
  v_total integer;
  v_held boolean;
  v_damage integer;
  v_lost integer;
  v_healed integer;
begin
  select * into v_room from public.raid_rooms where id = p_room;
  select * into v_round from public.raid_rounds where room_id = p_room and round = p_round;
  p_cancelled := coalesce(p_cancelled, v_round.move in ('heavy', 'armor', 'regen', 'target') and exists (
    select 1 from jsonb_array_elements(p_plays) e
    join public.raid_members m on m.room_id = p_room and public.coop_member_key(m.user_id, m.seat) = e ->> 'player'
    join public.card_definitions d on d.id = m.definition_ids[array_position(m.card_instance_ids, (e ->> 'characterId')::uuid)]
    where d.power_code in ('nullifier', 'delayed_nullifier')));
  select sum((e ->> 'counted')::integer) into v_total from jsonb_array_elements(p_plays) e;
  v_held := v_total >= v_round.attack;
  v_damage := case when v_held then v_total - v_round.attack else 0 end;
  if v_round.move = 'armor' and not p_cancelled then v_damage := v_damage / 2; end if;
  if v_round.move = 'exposed' then v_damage := v_damage * 2; end if;
  v_lost := case when v_held then 0 when v_round.move = 'heavy' and not p_cancelled then 2 else 1 end;
  v_healed := case when v_round.move = 'regen' and not p_cancelled and v_damage = 0
                   then least((v_room.vita_max * 10 + 99) / 100, v_room.vita_max - v_room.vita) else 0 end;
  return jsonb_build_object(
    'plays', p_plays, 'move', v_round.move, 'cancelled', p_cancelled, 'attack', v_round.attack,
    'effectiveAttack', v_round.attack, 'required', v_round.attack, 'total', v_total, 'held', v_held,
    'damage', v_damage, 'defensesLost', v_lost, 'healed', v_healed,
    'vita', greatest(0, v_room.vita - v_damage + v_healed), 'defenses', greatest(0, v_room.defenses - v_lost));
end $$;

-- Sets the move of the round being played (the draw is random).
create function pg_temp.set_move(p_room uuid, p_round integer, p_move text) returns void language sql as $$
  update public.raid_rounds set move = p_move where room_id = p_room and round = p_round;
  update public.raid_rooms set moves[p_round] = p_move where id = p_room;
$$;

-- The deadline of the round being played, past.
create function pg_temp.expire(p_room uuid) returns void language sql as $$
  update public.raid_rounds set deadline_at = now() - interval '1 minute'
  where room_id = p_room and resolved_at is null;
$$;

do $$
declare
  v_ids uuid[];
  v_levels integer[];
  v_moves text[];
  v_boss public.boss_definitions;
  v_i integer;
begin
  -- The six Bosses, by Magnitude, with their district and repertoire.
  assert (select count(*) from public.boss_definitions where raid_active) = 6, 'six Bosses to hunt';
  assert (select array_agg(raid_magnitude order by raid_magnitude) from public.boss_definitions where raid_active) = array[1, 2, 3, 3, 4, 5],
    'one Boss for each Magnitude, two of the third';

  -- Every draw keeps the level rules, with two threats from the Boss's district.
  for v_boss in select * from public.boss_definitions where raid_active loop
    for v_i in 1 .. 25 loop
      v_ids := public.raid_draw_threats(v_boss.id);
      select array_agg(t.level order by u.ord) into v_levels
      from unnest(v_ids) with ordinality as u(id, ord) join public.threat_definitions t on t.id = u.id;
      assert cardinality(v_ids) = 5 and (select count(distinct x) from unnest(v_ids) x) = 5, 'five different threats';
      assert (select min(l) from unnest(v_levels) l) <= 2 and (select max(l) from unnest(v_levels) l) >= 5
        and (select sum(l) from unnest(v_levels) l) between 14 and 20, format('levels %s', v_levels);
      assert (select count(*) from public.threat_definitions t where t.id = any (v_ids) and t.district = v_boss.raid_district) >= 2,
        format('two from %s', v_boss.raid_district);
      assert not exists (
        select 1 from public.threat_definitions t
        where t.id = any (v_ids) and (t.region <> 'megara' or t.rarity_code is not null or t.modifier_code is not null)
      ), 'usual threats of Nuova Megara';

      v_moves := public.raid_draw_moves(v_boss.id);
      assert cardinality(v_moves) = 5 and v_moves[1] <> 'regen', format('moves %s', v_moves);
      assert (select count(*) from unnest(v_moves) m where m = 'exposed') <= 1
        and (select count(*) from unnest(v_moves) m where m = 'heavy') <= 2, format('moves %s', v_moves);
      assert not exists (select 1 from generate_series(2, 5) g where v_moves[g] = 'heavy' and v_moves[g - 1] = 'heavy'),
        format('two Colpo pesante in a row: %s', v_moves);
      assert (select bool_and(m = 'plain' or m = any (v_boss.raid_moves)) from unnest(v_moves) m), 'moves of its repertoire';
    end loop;
  end loop;

  -- The numbers of the engine.
  assert public.raid_attack(3, 2, 100) = 36 and public.raid_attack(4, 3, 100) = 69 and public.raid_attack(1, 4, 92) = 26,
    'the Attack';
  assert public.raid_vita_max(2, 100, 85) = 24 and public.raid_vita_max(3, 92, 115) = 43, 'the Life';
  assert public.raid_percent(30, 75) = 23 and public.raid_percent(60, 250) = 150, 'a share';
end $$;

do $$
declare
  v_a uuid := pg_temp.u(1);
  v_b uuid := pg_temp.u(2);
  v_sa uuid[];
  v_sb uuid[];
  v_room jsonb;
  v_room_id uuid;
  v_state jsonb;
  v_catalog jsonb;
  v_failed boolean;
  v_record jsonb;
  v_raid public.raid_rooms;
  v_coins integer;
  v_attack integer;
begin
  v_sa := pg_temp.squad(v_a);
  v_sb := pg_temp.squad(v_b);

  -- ---------------------------------------------------------------------
  -- The catalog and a room of two friends on La Mente Madre (Magnitude 3)
  -- ---------------------------------------------------------------------
  perform pg_temp.as_user(v_a);
  v_catalog := public.get_raid();
  assert jsonb_array_length(v_catalog -> 'bosses') = 6, 'six Bosses listed';
  assert (v_catalog -> 'bosses' -> 0 ->> 'magnitude')::integer = 1, 'the easiest first';
  assert (select (b ->> 'first_win_coins')::integer from jsonb_array_elements(v_catalog -> 'bosses') b where b ->> 'code' = 'B05') = 30,
    'a Magnitude 1 Boss pays half';
  assert (select (b ->> 'win_xp')::integer from jsonb_array_elements(v_catalog -> 'bosses') b where b ->> 'code' = 'B03') = 30,
    'a Magnitude 3 Boss pays the base';

  v_room := public.raid_create_room('B03');
  v_room_id := (v_room ->> 'id')::uuid;
  select * into v_raid from public.raid_rooms where id = v_room_id;
  assert v_raid.magnitude = 3 and v_raid.forza_percent = 100 and v_raid.vita_percent = 85 and v_raid.reward_percent = 100,
    'the Magnitude copied';

  -- In a hunt: no room of the Operazioni, nor their queue, nor a second hunt.
  v_failed := false;
  begin perform public.coop_create_room('O1M1');
  exception when others then v_failed := sqlerrm = 'coop_already_in_room'; end;
  assert v_failed, 'an operation from inside a hunt';
  v_failed := false;
  begin perform public.coop_queue_join('O1M1', pg_temp.squad(v_a));
  exception when others then v_failed := sqlerrm = 'coop_already_in_room'; end;
  assert v_failed, 'the queue of the operations from inside a hunt';
  v_failed := false;
  begin perform public.raid_create_room('B05');
  exception when others then v_failed := sqlerrm = 'coop_already_in_room'; end;
  assert v_failed, 'two hunts';

  -- Before the start: the levels and the Attacks, no threat, no move.
  v_state := public.raid_state(v_room_id);
  assert jsonb_array_length(v_state -> 'rounds') = 5, 'five rounds';
  assert not exists (
    select 1 from jsonb_array_elements(v_state -> 'rounds') r
    where jsonb_typeof(r -> 'threat') <> 'null' or jsonb_typeof(r -> 'move') <> 'null' or (r ->> 'level') is null
  ), 'only the levels before the start';

  perform pg_temp.as_user(v_b);
  v_room := public.raid_join_room(v_room ->> 'code');
  perform pg_temp.as_user(v_a);
  perform public.raid_set_squad(v_room_id, v_sa);
  perform public.raid_set_ready(v_room_id, true);
  v_failed := false;
  begin perform public.raid_start(v_room_id);
  exception when others then v_failed := sqlerrm = 'coop_not_ready'; end;
  assert v_failed, 'started before everyone was ready';
  perform pg_temp.as_user(v_b);
  perform public.raid_set_squad(v_room_id, v_sb);
  perform public.raid_set_ready(v_room_id, true);
  v_failed := false;
  begin perform public.raid_start(v_room_id);
  exception when others then v_failed := sqlerrm = 'coop_not_host'; end;
  assert v_failed, 'a guest started';
  perform pg_temp.as_user(v_a);
  perform public.raid_start(v_room_id);
  select * into v_raid from public.raid_rooms where id = v_room_id;
  assert v_raid.status = 'active' and v_raid.players = 2 and v_raid.vita_max = 24 and v_raid.vita = 24 and v_raid.defenses = 3,
    format('started: %s', row_to_json(v_raid));

  -- In play: the threat and move of round 1, the next move, nothing more.
  v_state := public.raid_state(v_room_id);
  assert jsonb_typeof(v_state -> 'rounds' -> 0 -> 'threat') = 'object' and v_state -> 'rounds' -> 0 ->> 'move' is not null, 'round 1 shown';
  assert v_state -> 'rounds' -> 1 ->> 'move' is not null and jsonb_typeof(v_state -> 'rounds' -> 1 -> 'threat') = 'null', 'the next move';
  assert v_state -> 'rounds' -> 2 ->> 'move' is null and v_state -> 'rounds' -> 3 ->> 'move' is null, 'not the moves after';

  -- ---------------------------------------------------------------------
  -- Round 1, an Attacco semplice: A puts a card, B nothing; the server puts B's
  -- ---------------------------------------------------------------------
  perform pg_temp.set_move(v_room_id, 1, 'plain');
  v_attack := (select attack from public.raid_rounds where room_id = v_room_id and round = 1);
  perform public.raid_place(v_room_id, 1, v_sa[1], true);
  v_failed := false;
  begin perform public.raid_place(v_room_id, 1, v_sb[1], false);
  exception when others then v_failed := sqlerrm = 'invalid_placement'; end;
  assert v_failed, 'a card of a friend';
  -- One point above the Attack: one point of damage.
  v_record := pg_temp.record(v_room_id, 1, jsonb_build_array(
    pg_temp.play(v_a::text, v_sa[1], v_attack, v_attack, false), pg_temp.play(v_b::text, v_sb[1], 1, 1, true)));
  v_failed := false;
  begin perform public.raid_record_round(v_room_id, 1, v_record);
  exception when others then v_failed := sqlerrm = 'round_not_expired'; end;
  assert v_failed, 'resolved before the time and before everyone was ready';
  perform pg_temp.expire(v_room_id);
  -- A's card played as if the server had chosen it.
  v_failed := false;
  begin perform public.raid_record_round(v_room_id, 1, pg_temp.record(v_room_id, 1, jsonb_build_array(
    pg_temp.play(v_a::text, v_sa[1], v_attack, v_attack, true), pg_temp.play(v_b::text, v_sb[1], 1, 1, true))));
  exception when others then v_failed := sqlerrm = 'coop_placement_changed'; end;
  assert v_failed, 'a placement overruled';
  -- A wrong damage.
  v_failed := false;
  begin perform public.raid_record_round(v_room_id, 1, v_record || jsonb_build_object('damage', 99));
  exception when others then v_failed := sqlerrm = 'raid_invalid_round'; end;
  assert v_failed, 'a damage the totals do not give';
  -- Sabotatore cannot raise the Attack.
  v_failed := false;
  begin perform public.raid_record_round(v_room_id, 1, v_record || jsonb_build_object('effectiveAttack', 999, 'required', 999));
  exception when others then v_failed := sqlerrm = 'raid_invalid_round'; end;
  assert v_failed, 'an Attack above the round''s';
  perform public.raid_record_round(v_room_id, 1, v_record);
  select * into v_raid from public.raid_rooms where id = v_room_id;
  assert v_raid.current_round = 2 and v_raid.vita = 23 and v_raid.defenses = 3, format('round 1: %s', row_to_json(v_raid));
  assert (select held and damage = 1 and total = v_attack + 1 from public.raid_rounds where room_id = v_room_id and round = 1), 'round 1 stored';

  -- ---------------------------------------------------------------------
  -- Round 2, Colpo pesante, not held: two Defences
  -- ---------------------------------------------------------------------
  perform pg_temp.set_move(v_room_id, 2, 'heavy');
  perform pg_temp.expire(v_room_id);
  v_record := pg_temp.record(v_room_id, 2, jsonb_build_array(
    pg_temp.play(v_a::text, v_sa[2], 1, 1, true), pg_temp.play(v_b::text, v_sb[2], 1, 1, true)));
  v_failed := false;
  begin perform public.raid_record_round(v_room_id, 2, v_record || jsonb_build_object('defensesLost', 1, 'defenses', 2));
  exception when others then v_failed := sqlerrm = 'raid_invalid_round'; end;
  assert v_failed, 'Colpo pesante takes two';
  v_failed := false;
  begin perform public.raid_record_round(v_room_id, 2, v_record || jsonb_build_object('cancelled', true));
  exception when others then v_failed := sqlerrm = 'raid_invalid_round'; end;
  assert v_failed, 'cancelled without an Annullatore';
  perform public.raid_record_round(v_room_id, 2, v_record);
  select * into v_raid from public.raid_rooms where id = v_room_id;
  assert v_raid.defenses = 1 and v_raid.current_round = 3, format('round 2: %s', row_to_json(v_raid));

  -- ---------------------------------------------------------------------
  -- Round 3, Bersaglio: the highest card counts half; the Boss falls
  -- ---------------------------------------------------------------------
  perform pg_temp.set_move(v_room_id, 3, 'target');
  perform pg_temp.as_user(v_a);
  perform public.raid_place(v_room_id, 3, v_sa[3], true);
  perform pg_temp.expire(v_room_id);
  v_failed := false;
  begin perform public.raid_record_round(v_room_id, 3, pg_temp.record(v_room_id, 3, jsonb_build_array(
    pg_temp.play(v_a::text, v_sa[3], 99, 99, false), pg_temp.play(v_b::text, v_sb[3], 99, 99, true))));
  exception when others then v_failed := sqlerrm = 'raid_invalid_round'; end;
  assert v_failed, 'Bersaglio forgotten';
  v_failed := false;
  begin perform public.raid_record_round(v_room_id, 3, pg_temp.record(v_room_id, 3, jsonb_build_array(
    pg_temp.play(v_a::text, v_sa[3], 99, 49, false), pg_temp.play(v_b::text, v_sb[3], 50, 25, true))));
  exception when others then v_failed := sqlerrm = 'raid_invalid_round'; end;
  assert v_failed, 'Bersaglio on two cards';
  perform public.raid_record_round(v_room_id, 3, pg_temp.record(v_room_id, 3, jsonb_build_array(
    pg_temp.play(v_a::text, v_sa[3], 99, 49, false), pg_temp.play(v_b::text, v_sb[3], 50, 50, true))));
  select * into v_raid from public.raid_rooms where id = v_room_id;
  assert v_raid.status = 'won' and v_raid.vita = 0, format('won: %s', row_to_json(v_raid));

  -- The prizes: A chose 2 of 3 cards (XP and the first win's coins); B none (nothing).
  assert (select xp from public.raid_members where room_id = v_room_id and user_id = v_a) = 30, 'XP of a win';
  assert (select coins from public.raid_members where room_id = v_room_id and user_id = v_a) = 60, 'coins of a first win';
  assert (select amount from public.coin_ledger where user_id = v_a and reason = 'raid_reward' and ref_id = v_room_id) = 60, 'in the ledger';
  assert (select xp from public.raid_members where room_id = v_room_id and user_id = v_b) = 0
     and (select coins from public.raid_members where room_id = v_room_id and user_id = v_b) = 0, 'no prize without choosing';
  assert exists (select 1 from public.raid_progress where user_id = v_a and boss_id = v_raid.boss_id), 'A beat it';
  assert not exists (select 1 from public.raid_progress where user_id = v_b), 'B did not';
  v_state := public.raid_state(v_room_id);
  assert v_state ->> 'status' = 'won' and (v_state -> 'boss' ->> 'beaten')::boolean, 'the room says so';
  assert (v_state -> 'rounds' -> 2 -> 'plays' -> 0 ->> 'counted')::integer = 49, 'the halved card';

  -- ---------------------------------------------------------------------
  -- The same Boss again: XP, no coins
  -- ---------------------------------------------------------------------
  v_room := public.raid_create_room('B03');
  v_room_id := (v_room ->> 'id')::uuid;
  perform public.raid_set_squad(v_room_id, v_sa);
  perform public.raid_set_ready(v_room_id, true);
  perform public.raid_add_ally(v_room_id);
  perform public.raid_start(v_room_id);
  select coalesce(sum(amount), 0) into v_coins from public.coin_ledger where user_id = v_a and reason = 'raid_reward';
  for v_i in 1 .. 5 loop
    perform pg_temp.set_move(v_room_id, v_i, 'plain');
    perform public.raid_place(v_room_id, v_i, v_sa[v_i], true);
    -- The ally's card: the server's, never one "chosen".
    v_failed := false;
    begin perform public.raid_record_round(v_room_id, v_i, pg_temp.record(v_room_id, v_i, jsonb_build_array(
      pg_temp.play(v_a::text, v_sa[v_i], 60, 60, false),
      pg_temp.play('bot-2', (select card_instance_ids[v_i] from public.raid_members where room_id = v_room_id and seat = 2), 60, 60, false))));
    exception when others then v_failed := sqlerrm = 'raid_invalid_round'; end;
    assert v_failed, 'an ally''s card chosen';
    perform public.raid_record_round(v_room_id, v_i, pg_temp.record(v_room_id, v_i, jsonb_build_array(
      pg_temp.play(v_a::text, v_sa[v_i], 60, 60, false),
      pg_temp.play('bot-2', (select card_instance_ids[v_i] from public.raid_members where room_id = v_room_id and seat = 2), 60, 60, true))));
    exit when (select status from public.raid_rooms where id = v_room_id) <> 'active';
  end loop;
  assert (select status from public.raid_rooms where id = v_room_id) = 'won', 'won again';
  assert (select coins from public.raid_members where room_id = v_room_id and user_id = v_a) = 0, 'no coins the second time';
  assert (select xp from public.raid_members where room_id = v_room_id and user_id = v_a) = 30, 'XP again';
  assert (select coalesce(sum(amount), 0) from public.coin_ledger where user_id = v_a and reason = 'raid_reward') = v_coins, 'no new coins';
  assert (select xp from public.raid_members where room_id = v_room_id and seat = 2) is null, 'no prize for an ally';
end $$;

do $$
declare
  v_c uuid := pg_temp.u(3);
  v_d uuid := pg_temp.u(4);
  v_sc uuid[];
  v_sd uuid[];
  v_room jsonb;
  v_room_id uuid;
  v_nullifier uuid;
  v_instance uuid;
  v_failed boolean;
  v_raid public.raid_rooms;
  v_attack integer;
begin
  -- D brings an Annullatore.
  select d.id into v_nullifier from public.card_definitions d where d.power_code = 'nullifier' and d.is_active limit 1;
  insert into public.card_instances (definition_id, owner_id, acquired_via) values (v_nullifier, v_d, 'pack') returning id into v_instance;
  v_sd := array[v_instance] || (
    select array_agg(s.id) from (
      select distinct on (i.definition_id) i.id from public.card_instances i
      where i.owner_id = v_d and i.definition_id <> v_nullifier order by i.definition_id, i.id limit 5) s);
  v_sc := pg_temp.squad(v_c);

  perform pg_temp.as_user(v_c);
  v_room := public.raid_create_room('B04');
  v_room_id := (v_room ->> 'id')::uuid;
  perform pg_temp.as_user(v_d);
  perform public.raid_join_room(v_room ->> 'code');
  perform public.raid_set_squad(v_room_id, v_sd);
  perform public.raid_set_ready(v_room_id, true);
  perform pg_temp.as_user(v_c);
  perform public.raid_set_squad(v_room_id, v_sc);
  perform public.raid_set_ready(v_room_id, true);
  perform public.raid_start(v_room_id);

  -- Round 1, Corazza, with the Annullatore: cancelled, the damage whole.
  perform pg_temp.set_move(v_room_id, 1, 'armor');
  v_attack := (select attack from public.raid_rounds where room_id = v_room_id and round = 1);
  perform pg_temp.expire(v_room_id);
  v_failed := false;
  begin perform public.raid_record_round(v_room_id, 1, pg_temp.record(v_room_id, 1, jsonb_build_array(
    pg_temp.play(v_c::text, v_sc[1], 5, 5, true), pg_temp.play(v_d::text, v_sd[1], 5, 5, true)), false));
  exception when others then v_failed := sqlerrm = 'raid_invalid_round'; end;
  assert v_failed, 'an Annullatore ignored';
  perform public.raid_record_round(v_room_id, 1, pg_temp.record(v_room_id, 1, jsonb_build_array(
    pg_temp.play(v_c::text, v_sc[1], v_attack, v_attack, true), pg_temp.play(v_d::text, v_sd[1], 10, 10, true)), true));
  assert (select cancelled and damage = 10 from public.raid_rounds where room_id = v_room_id and round = 1), 'Corazza cancelled';

  -- Round 2, Rigenerazione, no damage: back a tenth of the Life (rounded up), never above the whole.
  perform pg_temp.set_move(v_room_id, 2, 'regen');
  perform pg_temp.expire(v_room_id);
  select * into v_raid from public.raid_rooms where id = v_room_id;
  perform public.raid_record_round(v_room_id, 2, pg_temp.record(v_room_id, 2, jsonb_build_array(
    pg_temp.play(v_c::text, v_sc[2], 0, 0, true), pg_temp.play(v_d::text, v_sd[2], 0, 0, true))));
  assert (select healed from public.raid_rounds where room_id = v_room_id and round = 2)
       = least((v_raid.vita_max + 9) / 10, v_raid.vita_max - v_raid.vita), 'Rigenerazione';

  -- C leaves: D plays on. D leaves: nobody left, the hunt is lost, no prize.
  perform pg_temp.as_user(v_c);
  perform public.raid_leave_room(v_room_id);
  assert (select status from public.raid_rooms where id = v_room_id) = 'active', 'D plays on';
  v_failed := false;
  begin perform public.raid_place(v_room_id, 3, v_sc[3], true);
  exception when others then v_failed := sqlerrm = 'match_not_active'; end;
  assert v_failed, 'a card from who left';
  -- Free again: C may open an operation.
  perform public.coop_leave_room((public.coop_create_room('O1M1') ->> 'id')::uuid);
  perform pg_temp.as_user(v_d);
  perform public.raid_leave_room(v_room_id);
  assert (select status from public.raid_rooms where id = v_room_id) = 'lost', 'everyone left';
  assert not exists (select 1 from public.raid_members where room_id = v_room_id and (xp is not null or coins is not null)), 'no prizes';

  -- From inside an operation, no hunt.
  perform pg_temp.as_user(v_d);
  perform public.coop_create_room('O1M1');
  v_failed := false;
  begin perform public.raid_create_room('B05');
  exception when others then v_failed := sqlerrm = 'coop_already_in_room'; end;
  assert v_failed, 'a hunt from inside an operation';

  -- The mode closed: no room opens, no room starts.
  update public.mode_availability set state = 'off' where key = 'raid';
  perform pg_temp.as_user(pg_temp.u(5));
  v_failed := false;
  begin perform public.raid_create_room('B05');
  exception when others then v_failed := sqlerrm = 'mode_unavailable'; end;
  assert v_failed, 'a hunt while the mode is closed';
end $$;

rollback;
