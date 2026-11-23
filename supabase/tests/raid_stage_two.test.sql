-- Integration test for the second stage of the Caccia grossa (SPEC §5.18): the modifiers as the
-- Boss's moves, the three stars of a Boss, a Boss on in one mode and off in the other, and the
-- editor of the Bosses for admins. Client functions read auth.uid() from the request claims;
-- service-only functions are called as the owner. Rolled back:
--   npm run test:db

begin;

-- Whatever an admin set in the real database: the hunt is open.
update public.mode_availability set state = 'on' where key = 'raid';

update public.game_config c set value = to_jsonb(d.value)
from (values
  ('raid.rounds', 5), ('raid.squad_size', 6), ('raid.min_players', 2), ('raid.max_players', 4), ('raid.defenses', 3),
  ('raid.vita_base', 14), ('raid.vita_factor.players2', 200), ('raid.attack_factor.players2', 200),
  ('raid.magnitude3.forza_percent', 100), ('raid.magnitude3.reward_percent', 100),
  ('raid.exposed_max', 1), ('raid.heavy_max', 2), ('raid.win_xp', 30), ('raid.first_win_coins', 60),
  ('raid.self_chosen_percent', 50), ('raid.quick_round', 4), ('raid.star_coins', 20)
) as d(key, value)
where c.key = d.key;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-8000-0000000009c' || n)::uuid, 'authenticated', 'authenticated',
       'raid2-' || n || '@example.test', jsonb_build_object('full_name', 'Caccia Due ' || n), now(), now()
from generate_series(1, 3) as n;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', '00000000-0000-4000-8000-0000000009c' || n, 'role', 'authenticated')::text, true),
       public.bootstrap_player()
from generate_series(1, 3) as n;
reset role;

-- The third player is an admin.
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000009c3');

create function pg_temp.as_user(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', p_user, 'role', 'authenticated')::text, true)
$$;

create function pg_temp.u(p_n integer) returns uuid language sql as $$
  select ('00000000-0000-4000-8000-0000000009c' || p_n)::uuid
$$;

-- Six distinct characters of a player (the starter set: Delta), without an Annullatore.
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

-- A round of an Attacco semplice where the team's sum beats the Attack (as the engine would record it).
create function pg_temp.won_round(p_room uuid, p_round integer, p_plays jsonb)
returns jsonb language plpgsql as $$
declare
  v_room public.raid_rooms;
  v_round public.raid_rounds;
  v_total integer;
  v_damage integer;
begin
  select * into v_room from public.raid_rooms where id = p_room;
  select * into v_round from public.raid_rounds where room_id = p_room and round = p_round;
  select sum((e ->> 'counted')::integer) into v_total from jsonb_array_elements(p_plays) e;
  v_damage := v_total - v_round.attack;
  return jsonb_build_object(
    'plays', p_plays, 'move', v_round.move, 'cancelled', false, 'attack', v_round.attack,
    'effectiveAttack', v_round.attack, 'required', v_round.attack, 'total', v_total, 'held', true,
    'damage', v_damage, 'defensesLost', 0, 'healed', 0,
    'vita', greatest(0, v_room.vita - v_damage), 'defenses', v_room.defenses);
end $$;

do $$
declare
  v_boss public.boss_definitions;
  v_moves text[];
  v_mods jsonb;
  v_i integer;
begin
  -- The repertoires carry the modifiers; the draw never puts Anello debole on one ability.
  select * into v_boss from public.boss_definitions where code = 'B02';
  assert 'weak_link' = any (v_boss.raid_moves) and 'hostile_ground' = any (v_boss.raid_moves), 'Signora: modifiers';
  for v_i in 1 .. 60 loop
    v_moves := public.raid_draw_moves(v_boss.id, array[1, 3, 1, 4, 5]);
    assert v_moves[1] <> 'weak_link' and v_moves[3] <> 'weak_link', format('weak link on one ability: %s', v_moves);
    v_mods := public.raid_move_modifiers(v_moves);
    assert jsonb_array_length(v_mods) = 5, 'one modifier per round';
    assert not exists (
      select 1 from generate_series(1, 5) g
      where (v_moves[g] in ('focus', 'weak_link', 'hostile_ground', 'underdogs')) <> (jsonb_typeof(v_mods -> (g - 1)) = 'object')
         or (jsonb_typeof(v_mods -> (g - 1)) = 'object' and v_mods -> (g - 1) ->> 'code' <> v_moves[g])
    ), format('modifiers %s for %s', v_mods, v_moves);
  end loop;
  v_mods := public.raid_move_modifiers(array['hostile_ground', 'underdogs', 'plain']);
  assert v_mods -> 0 ->> 'favored' <> v_mods -> 0 ->> 'hindered'
     and (v_mods -> 0 ->> 'bonus')::integer = public.config_int('threat_modifiers.hostile_bonus'), 'Territorio ostile';
  assert (v_mods -> 1 ->> 'eliteMinRank')::integer = public.config_int('threat_modifiers.underdog_elite_min_rank'), 'Sottovalutati';
  assert jsonb_typeof(v_mods -> 2) = 'null', 'no modifier on an Attacco semplice';
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
  v_raid public.raid_rooms;
  v_failed boolean;
  v_catalog jsonb;
begin
  v_sa := pg_temp.squad(v_a);
  v_sb := pg_temp.squad(v_b);

  -- Off in the Grande Minaccia, on in the hunt: still hunted. Off in the hunt: not.
  update public.boss_definitions set is_active = false where code = 'B03';
  update public.boss_definitions set raid_active = false where code = 'B05';
  perform pg_temp.as_user(v_a);
  v_catalog := public.get_raid();
  assert exists (select 1 from jsonb_array_elements(v_catalog -> 'bosses') b where b ->> 'code' = 'B03'), 'B03 listed';
  assert not exists (select 1 from jsonb_array_elements(v_catalog -> 'bosses') b where b ->> 'code' = 'B05'), 'B05 not listed';
  assert (select (b ->> 'star_coins')::integer from jsonb_array_elements(v_catalog -> 'bosses') b where b ->> 'code' = 'B03') = 20,
    'a Magnitude 3 star pays the base';
  assert (select b -> 'star_rarities' from jsonb_array_elements(v_catalog -> 'bosses') b where b ->> 'code' = 'B03') = '["delta", "gamma"]',
    'the rarities of the star';
  v_failed := false;
  begin perform public.raid_create_room('B05');
  exception when others then v_failed := sqlerrm = 'raid_boss_not_found'; end;
  assert v_failed, 'a Boss off in the hunt';

  -- A room on La Mente Madre: the modifiers drawn with the moves.
  v_room := public.raid_create_room('B03');
  v_room_id := (v_room ->> 'id')::uuid;
  select * into v_raid from public.raid_rooms where id = v_room_id;
  assert jsonb_array_length(v_raid.move_modifiers) = 5, 'five modifiers';
  assert not exists (
    select 1 from generate_series(1, 5) g
    where (v_raid.moves[g] in ('focus', 'weak_link', 'hostile_ground', 'underdogs')) <> (jsonb_typeof(v_raid.move_modifiers -> (g - 1)) = 'object')
  ), format('modifiers %s for %s', v_raid.move_modifiers, v_raid.moves);

  perform pg_temp.as_user(v_b);
  perform public.raid_join_room(v_room ->> 'code');
  perform public.raid_set_squad(v_room_id, v_sb);
  perform public.raid_set_ready(v_room_id, true);
  perform pg_temp.as_user(v_a);
  perform public.raid_set_squad(v_room_id, v_sa);
  perform public.raid_set_ready(v_room_id, true);
  perform public.raid_start(v_room_id);

  -- The round shows its modifier when its move is a modifier; the next round's too.
  update public.raid_rooms set moves[1] = 'plain', moves[2] = 'focus',
    move_modifiers = jsonb_set(jsonb_set(move_modifiers, '{0}', 'null'), '{1}', '{"code": "focus"}')
  where id = v_room_id;
  update public.raid_rounds set move = 'plain' where room_id = v_room_id and round = 1;
  v_state := public.raid_state(v_room_id);
  assert jsonb_typeof(v_state -> 'rounds' -> 0 -> 'modifier') = 'null', 'no modifier on round 1';
  assert v_state -> 'rounds' -> 1 -> 'modifier' ->> 'code' = 'focus', 'the next round''s modifier';
  assert (v_state -> 'boss' ->> 'quick_round')::integer = 4 and (v_state -> 'boss' ->> 'star_coins')::integer = 20, 'the star rules';
  assert jsonb_array_length(public.raid_round_context(v_a, v_room_id) -> 'modifiers') = 5
     and public.raid_round_context(v_a, v_room_id) -> 'modifiers' -> 1 ->> 'code' = 'focus', 'the engine''s context';

  -- Round 1: the Boss falls at once, no Defence lost. A chose the card, B did not.
  perform public.raid_place(v_room_id, 1, v_sa[1], true);
  update public.raid_rounds set deadline_at = now() - interval '1 minute' where room_id = v_room_id and round = 1;
  perform public.raid_record_round(v_room_id, 1, pg_temp.won_round(v_room_id, 1, jsonb_build_array(
    pg_temp.play(v_a::text, v_sa[1], 99, false), pg_temp.play(v_b::text, v_sb[1], 99, true))));
  select * into v_raid from public.raid_rooms where id = v_room_id;
  assert v_raid.status = 'won', 'won in round 1';

  -- Three stars for A (Senza graffi, Colpo rapido, a squad of Delta), paid 20 each; none for B.
  assert (select stars from public.raid_members where room_id = v_room_id and user_id = v_a) @> array['flawless', 'quick', 'squad']
     and (select star_coins from public.raid_members where room_id = v_room_id and user_id = v_a) = 60, 'three stars';
  assert (select count(*) from public.raid_stars where user_id = v_a and boss_id = v_raid.boss_id) = 3, 'stored';
  assert (select sum(amount) from public.coin_ledger where user_id = v_a and reason = 'raid_star' and ref_id = v_room_id) = 60, 'in the ledger';
  assert (select star_coins from public.raid_members where room_id = v_room_id and user_id = v_b) = 0
     and not exists (select 1 from public.raid_stars where user_id = v_b), 'no stars without choosing';
  v_state := public.raid_state(v_room_id);
  assert jsonb_array_length(v_state -> 'boss' -> 'stars') = 3, 'the room shows them';

  -- Again: the stars met, nothing paid.
  v_room := public.raid_create_room('B03');
  v_room_id := (v_room ->> 'id')::uuid;
  perform public.raid_set_squad(v_room_id, v_sa);
  perform public.raid_set_ready(v_room_id, true);
  perform public.raid_add_ally(v_room_id);
  perform public.raid_start(v_room_id);
  update public.raid_rounds set move = 'plain' where room_id = v_room_id and round = 1;
  perform public.raid_place(v_room_id, 1, v_sa[1], true);
  perform public.raid_record_round(v_room_id, 1, pg_temp.won_round(v_room_id, 1, jsonb_build_array(
    pg_temp.play(v_a::text, v_sa[1], 99, false),
    pg_temp.play('bot-2', (select card_instance_ids[1] from public.raid_members where room_id = v_room_id and seat = 2), 99, true))));
  assert (select star_coins from public.raid_members where room_id = v_room_id and user_id = v_a) = 0, 'paid once';
  assert (select cardinality(stars) from public.raid_members where room_id = v_room_id and user_id = v_a) = 3, 'met again';
end $$;

do $$
declare
  v_admin uuid := pg_temp.u(3);
  v_data jsonb;
  v_failed boolean;
  v_new jsonb;
  v_fronts jsonb;
begin
  -- A player gets nothing.
  perform pg_temp.as_user(pg_temp.u(1));
  v_failed := false;
  begin perform public.admin_get_bosses();
  exception when others then v_failed := sqlerrm = 'not_admin'; end;
  assert v_failed, 'a player read the editor';

  perform pg_temp.as_user(v_admin);
  v_data := public.admin_get_bosses();
  assert jsonb_array_length(v_data -> 'bosses') >= 6, 'the Bosses';
  assert (select (b ->> 'in_use')::boolean from jsonb_array_elements(v_data -> 'bosses') b where b ->> 'code' = 'B03'), 'B03 played';
  assert (select b -> 'raid_results' -> '2' ->> 'wins' from jsonb_array_elements(v_data -> 'bosses') b where b ->> 'code' = 'B03') = '2',
    'the hunts won in two';

  -- A new Boss on in the hunt only: the fronts of B01, its own numbers.
  select b -> 'fronts' into v_fronts from jsonb_array_elements(v_data -> 'bosses') b where b ->> 'code' = 'B01';
  v_new := jsonb_build_object(
    'code', null, 'name', 'Il Leviatano di prova', 'flavor', 'Un Boss scritto da un test, che il rollback porta via.',
    'scene', 'port:golem', 'gm_active', false, 'fronts', v_fronts,
    'raid_active', true, 'raid_district', 'porto', 'raid_magnitude', 4, 'raid_moves', '["heavy", "focus"]'::jsonb,
    'raid_vita_percent', 130, 'raid_star_rarities', '["delta", "gamma", "beta"]'::jsonb);
  v_data := public.admin_save_boss(v_new);
  assert exists (
    select 1 from jsonb_array_elements(v_data -> 'bosses') b
    where b ->> 'name' = 'Il Leviatano di prova' and not (b ->> 'gm_active')::boolean and (b ->> 'raid_magnitude')::integer = 4
  ), 'saved';
  assert exists (select 1 from public.boss_definitions where name = 'Il Leviatano di prova' and code ~ '^B[0-9]{2}$'), 'a code';
  perform pg_temp.as_user(pg_temp.u(1));
  assert exists (select 1 from jsonb_array_elements(public.get_raid() -> 'bosses') b where b ->> 'name' = 'Il Leviatano di prova'), 'hunted';
  perform pg_temp.as_user(v_admin);

  -- What is refused.
  v_failed := false;
  begin perform public.admin_save_boss(v_new || jsonb_build_object('fronts', jsonb_build_array(v_fronts -> 0, v_fronts -> 0, v_fronts -> 1, v_fronts -> 2, v_fronts -> 3)));
  exception when others then v_failed := sqlerrm = 'boss_invalid_fronts'; end;
  assert v_failed, 'a front twice';
  v_failed := false;
  begin perform public.admin_save_boss(v_new || jsonb_build_object('raid_magnitude', 6));
  exception when others then v_failed := sqlerrm = 'boss_invalid_raid'; end;
  assert v_failed, 'a Magnitude 6';
  v_failed := false;
  begin perform public.admin_save_boss(v_new || jsonb_build_object('raid_moves', '["fly"]'::jsonb));
  exception when others then v_failed := sqlerrm = 'boss_invalid_raid'; end;
  assert v_failed, 'an unknown move';
  v_failed := false;
  begin perform public.admin_save_boss(v_new || jsonb_build_object('raid_star_rarities', '[]'::jsonb));
  exception when others then v_failed := sqlerrm = 'boss_invalid_raid'; end;
  assert v_failed, 'a star without rarities';
  v_failed := false;
  begin perform public.admin_save_boss(v_new || jsonb_build_object('name', 'X'));
  exception when others then v_failed := sqlerrm = 'boss_invalid_text'; end;
  assert v_failed, 'a short name';
  v_failed := false;
  begin perform public.admin_save_boss(v_new || jsonb_build_object('scene', 'Porto Golem'));
  exception when others then v_failed := sqlerrm = 'boss_invalid_scene'; end;
  assert v_failed, 'a scene of another shape';

  -- An existing one changed: a new Magnitude; deleting one played is refused, a new one goes.
  v_data := public.admin_save_boss((
    select b - 'gm_matches' - 'gm_in_play' - 'raid_results' - 'raid_in_play' - 'in_use'
    from jsonb_array_elements(v_data -> 'bosses') b where b ->> 'code' = 'B06'
  ) || jsonb_build_object('raid_magnitude', 5));
  assert (select raid_magnitude from public.boss_definitions where code = 'B06') = 5, 'B06 moved up';
  v_failed := false;
  begin perform public.admin_delete_boss('B03');
  exception when others then v_failed := sqlerrm = 'boss_in_use'; end;
  assert v_failed, 'a Boss played deleted';
  perform public.admin_delete_boss((select code from public.boss_definitions where name = 'Il Leviatano di prova'));
  assert not exists (select 1 from public.boss_definitions where name = 'Il Leviatano di prova'), 'deleted';
end $$;

rollback;
