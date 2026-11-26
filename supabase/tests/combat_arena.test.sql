-- Integration test for the challenges of the Scontro a squadre, stage 6a (SPEC §5.19,
-- docs/COMBAT.md, 20261126130000_scontro_arena.sql): the defence, the opponents offered (players
-- close in Gloria, completed by teams of the computer), a challenge and its Gloria for both sides, the
-- day's prizes apart from the battles against the computer, a challenge given up, the same opponent
-- three times a day, the defences read, and what clients cannot touch. Rolled back:
--   npm run test:db

begin;

update public.mode_availability set state = 'on' where key = 'combat';
update public.game_config set value = '"always"' where key = 'combat_unlock.mode';
update public.game_config c set value = to_jsonb(d.value)
from (values ('combat_arena.choices', 3), ('combat_arena.range', 150), ('combat_arena.range_wide', 400), ('combat_arena.refreshes_daily', 5),
             ('combat_arena.win_points', 25), ('combat_arena.loss_points', 20), ('combat_arena.points_per_step', 20),
             ('combat_arena.win_min', 10), ('combat_arena.win_max', 40), ('combat_arena.loss_min', 5), ('combat_arena.loss_max', 35),
             ('combat_arena.no_loss_below', 300), ('combat_arena.same_opponent_daily', 3), ('combat_arena.defense_share_percent', 33),
             ('combat_arena.rewards.daily_battles', 5), ('combat_arena.rewards.win_xp', 25), ('combat_arena.rewards.win_coins', 20),
             ('combat_arena.rewards.loss_xp', 10)) as d(key, value)
where c.key = d.key;
-- The real players' defences are not part of the test: only the test players can be offered.
delete from public.combat_defenses;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-8000-0000000007e' || n)::uuid, 'authenticated', 'authenticated',
       'combat-arena-' || n || '@example.test', jsonb_build_object('full_name', 'Sfida ' || n), now(), now()
from generate_series(1, 3) as n;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', '00000000-0000-4000-8000-0000000007e' || n, 'role', 'authenticated')::text, true),
       public.bootstrap_player()
from generate_series(1, 3) as n;
reset role;

create function pg_temp.as_user(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', p_user, 'role', 'authenticated')::text, true)
$$;

create function pg_temp.u(p_n integer) returns uuid language sql as $$
  select ('00000000-0000-4000-8000-0000000007e' || p_n)::uuid
$$;

create function pg_temp.give(p_user uuid, p_codes text[]) returns uuid[] language plpgsql as $$
declare
  v_ids uuid[] := '{}';
  v_id uuid;
  v_code text;
begin
  foreach v_code in array p_codes loop
    insert into public.card_instances (definition_id, owner_id, acquired_via)
    select d.id, p_user, 'pack' from public.card_definitions d where d.code = v_code
    returning id into v_id;
    v_ids := v_ids || v_id;
  end loop;
  return v_ids;
end $$;

-- Side a: these characters; side b: these definitions (only what the database checks).
create function pg_temp.setup(p_codes text[], p_b uuid[]) returns jsonb language sql as $$
  select jsonb_build_object(
    'a', (select jsonb_agg(jsonb_build_object('definitionId', d.id) order by u.ord)
          from unnest(p_codes) with ordinality as u(code, ord) join public.card_definitions d on d.code = u.code),
    'b', coalesce((select jsonb_agg(jsonb_build_object('definitionId', x) order by o) from unnest(p_b) with ordinality as e(x, o)), '[]'::jsonb),
    'field', null)
$$;

-- The index of an offer of the player: of that opponent, or the first of the computer.
create function pg_temp.offer_of(p_user uuid, p_opponent uuid) returns integer language sql as $$
  select (e.ord - 1)::integer from public.combat_arena_offers o, jsonb_array_elements(o.offers) with ordinality as e(x, ord)
  where o.user_id = p_user and (case when p_opponent is null then e.x ->> 'kind' = 'computer' else e.x ->> 'user_id' = p_opponent::text end)
  order by e.ord limit 1
$$;

create function pg_temp.offer_defs(p_user uuid, p_index integer) returns uuid[] language sql as $$
  select array(select (y #>> '{}')::uuid from jsonb_array_elements((select o.offers -> p_index -> 'definition_ids' from public.combat_arena_offers o where o.user_id = p_user)) with ordinality as e(y, ord) order by ord)
$$;

create function pg_temp.challenge(p_user uuid, p_index integer, p_cards uuid[], p_codes text[], p_b uuid[]) returns uuid language sql as $$
  select public.combat_arena_create(p_user, p_index, p_cards, pg_temp.setup(p_codes, p_b), '{}'::jsonb, 777, '{"strategy": "balanced", "priority": null, "orders": {}}'::jsonb, true)
$$;

create function pg_temp.finish(p_user uuid, p_battle uuid, p_winner text) returns jsonb language sql as $$
  select public.combat_record(p_battle, p_user, 0, '[]'::jsonb, jsonb_build_object('winner', p_winner, 'reason', 'wiped'))
$$;

create function pg_temp.arena(p_user uuid) returns jsonb language plpgsql as $$
declare
  v_result jsonb;
begin
  set local role authenticated;
  perform pg_temp.as_user(p_user);
  v_result := public.get_combat_arena();
  reset role;
  return v_result;
end $$;

create function pg_temp.points(p_user uuid) returns integer language sql as $$
  select coalesce((select points from public.combat_arena_players where user_id = p_user), 0)
$$;

-- ---------------------------------------------------------------------------
-- Clients: the tables and the server's functions are closed
-- ---------------------------------------------------------------------------

set local role authenticated;
select pg_temp.as_user(pg_temp.u(1));
do $$
declare
  v_failed boolean;
begin
  v_failed := false;
  begin perform 1 from public.combat_defenses;
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'a client read the defences';
  v_failed := false;
  begin perform 1 from public.combat_arena_offers;
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'a client read the offers';
  v_failed := false;
  begin perform public.combat_defense_save(pg_temp.u(1), '{}', '{}');
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'a client saved a defence without the server';
  v_failed := false;
  begin perform public.combat_arena_create(pg_temp.u(1), 0, '{}', '{}', '{}', 1, '{}', false);
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'a client started a challenge without the server';
  v_failed := false;
  begin perform public.combat_arena_score(gen_random_uuid(), 'win');
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'a client moved the Gloria';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- The defence, the offers, a challenge
-- ---------------------------------------------------------------------------

do $$
declare
  v_a uuid := pg_temp.u(1);
  v_b uuid := pg_temp.u(2);
  v_c uuid := pg_temp.u(3);
  v_team text[] := array['P001', 'P152', 'P125', 'P204', 'P123'];
  v_defense text[] := array['P043', 'P044', 'P037', 'P213', 'P104'];
  v_cards uuid[];
  v_b_cards uuid[];
  v_c_cards uuid[];
  v_arena jsonb;
  v_index integer;
  v_battle uuid;
  v_result jsonb;
  v_failed boolean;
  v_b_defs uuid[];
  v_xp integer;
  v_coins bigint;
begin
  v_cards := pg_temp.give(v_a, v_team);
  v_b_cards := pg_temp.give(v_b, v_defense);
  v_c_cards := pg_temp.give(v_c, v_team);

  -- No defence: no offers, no challenge.
  v_arena := pg_temp.arena(v_a);
  assert v_arena -> 'defense' = 'null'::jsonb and jsonb_array_length(v_arena -> 'offers') = 0, 'nothing before the defence';
  v_failed := false;
  begin perform pg_temp.challenge(v_a, 0, v_cards, v_team, '{}');
  exception when others then v_failed := sqlerrm = 'combat_no_defense'; end;
  assert v_failed, 'a challenge without a defence';

  -- Defences: someone else's cards, orders that are not an object, a locked character.
  v_failed := false;
  begin perform public.combat_defense_save(v_a, v_b_cards, '{"strategy": "balanced"}');
  exception when others then v_failed := sqlerrm = 'card_not_owned'; end;
  assert v_failed, 'a defence with someone else''s cards';
  v_failed := false;
  begin perform public.combat_defense_save(v_a, v_cards, '"balanced"');
  exception when others then v_failed := sqlerrm = 'invalid_request'; end;
  assert v_failed, 'orders that are not an object';
  update public.game_config set value = '"progress"' where key = 'combat_unlock.mode';
  v_failed := false;
  begin perform public.combat_defense_save(v_a, v_cards, '{"strategy": "balanced"}');
  exception when others then v_failed := sqlerrm = 'combat_locked'; end;
  assert v_failed, 'a defence with locked characters';
  update public.game_config set value = '"always"' where key = 'combat_unlock.mode';

  perform public.combat_defense_save(v_a, v_cards, '{"strategy": "defensive", "priority": null, "orders": {}}');
  v_arena := pg_temp.arena(v_a);
  assert (v_arena -> 'defense' ->> 'ok')::boolean, 'the defence can fight';
  assert v_arena -> 'defense' -> 'tactics' ->> 'strategy' = 'defensive', 'the orders kept';
  assert jsonb_array_length(v_arena -> 'offers') = 3, 'three opponents';
  assert (select bool_and(x ->> 'kind' = 'computer') from jsonb_array_elements(v_arena -> 'offers') x), 'only teams of the computer with no other defence';
  assert (select bool_and(jsonb_array_length(x -> 'definition_ids') = 5 and not x ? 'user_id') from jsonb_array_elements(v_arena -> 'offers') x), 'five characters each, no user id sent';
  assert (v_arena ->> 'refreshes_left')::integer = 5 and (v_arena ->> 'points')::integer = 0, 'renewals and Gloria at the start';

  -- B's defence, then A renews: B is offered.
  perform public.combat_defense_save(v_b, v_b_cards, '{"strategy": "aggressive", "priority": null, "orders": {}}');
  set local role authenticated;
  perform pg_temp.as_user(v_a);
  v_arena := public.combat_arena_refresh();
  reset role;
  assert (v_arena ->> 'refreshes_left')::integer = 4, 'one renewal used';
  assert (select count(*) from jsonb_array_elements(v_arena -> 'offers') x where x ->> 'kind' = 'player' and x ->> 'name' is not null) = 1, 'B offered';
  v_index := pg_temp.offer_of(v_a, v_b);
  assert v_index is not null, 'B among the offers';
  select definition_ids into v_b_defs from public.combat_defenses where user_id = v_b;

  -- Side b must be B's defence in its places; an offer that is not there is gone.
  v_failed := false;
  begin perform pg_temp.challenge(v_a, v_index, v_cards, v_team, array[v_b_defs[2], v_b_defs[1], v_b_defs[3], v_b_defs[4], v_b_defs[5]]);
  exception when others then v_failed := sqlerrm = 'invalid_request'; end;
  assert v_failed, 'B''s defence in other places';
  v_failed := false;
  begin perform pg_temp.challenge(v_a, 7, v_cards, v_team, v_b_defs);
  exception when others then v_failed := sqlerrm = 'combat_offer_gone'; end;
  assert v_failed, 'an offer that is not there';

  -- A (0) beats B (500): +40 for A; B loses a third of 35, 12.
  update public.combat_arena_players set points = 500 where user_id = v_b;
  select xp into v_xp from public.profiles where id = v_a;
  select coalesce(sum(amount), 0) into v_coins from public.coin_ledger where user_id = v_a;
  v_battle := pg_temp.challenge(v_a, v_index, v_cards, v_team, v_b_defs);
  assert (select kind = 'arena' and opponent_id = v_b and opponent_tactics ->> 'strategy' = 'aggressive'
                 and (opponent ->> 'points')::integer = 500 from public.combat_battles where id = v_battle), 'the challenge and B''s orders';
  v_result := pg_temp.finish(v_a, v_battle, 'a');
  assert (v_result ->> 'points')::integer = 40, 'A won 40';
  assert pg_temp.points(v_a) = 40 and pg_temp.points(v_b) = 488, 'the Gloria of both sides';
  assert (select opponent_points_change from public.combat_battles where id = v_battle) = -12, 'B lost 12';
  assert (v_result ->> 'xp')::integer = 25 and (v_result ->> 'coins')::integer = 20, 'the prize of a won challenge';
  assert (select xp from public.profiles where id = v_a) = v_xp + 25, 'the XP';
  assert (select coalesce(sum(amount), 0) from public.coin_ledger where user_id = v_a) = v_coins + 20, 'the coins';

  -- A new list after the challenge; a challenge given up is a loss: A (40, below 300) loses
  -- nothing, B wins a third of 10, 3.
  v_index := pg_temp.offer_of(v_a, v_b);
  v_battle := pg_temp.challenge(v_a, v_index, v_cards, v_team, v_b_defs);
  set local role authenticated;
  perform pg_temp.as_user(v_a);
  assert public.combat_abandon(v_battle), 'given up';
  reset role;
  assert (select status = 'abandoned' and points_change = 0 and opponent_points_change = 3 from public.combat_battles where id = v_battle), 'a challenge given up';
  assert pg_temp.points(v_a) = 40 and pg_temp.points(v_b) = 491, 'the Gloria after giving up';

  -- A third challenge against B (a draw), then a fourth: it moves nothing.
  v_battle := pg_temp.challenge(v_a, pg_temp.offer_of(v_a, v_b), v_cards, v_team, v_b_defs);
  perform pg_temp.finish(v_a, v_battle, 'draw');
  v_battle := pg_temp.challenge(v_a, pg_temp.offer_of(v_a, v_b), v_cards, v_team, v_b_defs);
  v_result := pg_temp.finish(v_a, v_battle, 'a');
  assert (v_result ->> 'points')::integer = 0 and pg_temp.points(v_a) = 40 and pg_temp.points(v_b) = 491, 'a fourth challenge against B the same day';

  -- A team of the computer, in the places the engine gave it.
  v_index := pg_temp.offer_of(v_a, null);
  v_b_defs := pg_temp.offer_defs(v_a, v_index);
  v_battle := pg_temp.challenge(v_a, v_index, v_cards, v_team, array[v_b_defs[5], v_b_defs[4], v_b_defs[3], v_b_defs[2], v_b_defs[1]]);
  assert (select opponent_id is null and opponent ->> 'kind' = 'computer' from public.combat_battles where id = v_battle), 'against the computer';
  v_result := pg_temp.finish(v_a, v_battle, 'b');
  assert (select opponent_points_change is null from public.combat_battles where id = v_battle), 'no defender to move';

  -- The challenges pay apart from the battles against the computer: five a day.
  assert (select count(*) from public.combat_battles where user_id = v_a and kind = 'arena' and xp is not null) = 4, 'four paid challenges';
  v_battle := pg_temp.challenge(v_a, pg_temp.offer_of(v_a, null), v_cards, v_team, pg_temp.offer_defs(v_a, pg_temp.offer_of(v_a, null)));
  perform pg_temp.finish(v_a, v_battle, 'a');
  v_battle := pg_temp.challenge(v_a, pg_temp.offer_of(v_a, null), v_cards, v_team, pg_temp.offer_defs(v_a, pg_temp.offer_of(v_a, null)));
  v_result := pg_temp.finish(v_a, v_battle, 'a');
  assert (v_result ->> 'xp')::integer = 0 and (v_result ->> 'coins')::integer = 0, 'a sixth challenge pays nothing';
  v_battle := public.combat_create(v_a, v_cards, pg_temp.setup(v_team, '{}'), '{}'::jsonb, 1, '{"strategy": "balanced", "priority": null, "orders": {}}'::jsonb, true);
  v_result := pg_temp.finish(v_a, v_battle, 'a');
  assert (v_result ->> 'xp')::integer > 0, 'the battles against the computer still pay';
  assert v_result ->> 'points' is null, 'no Gloria against the computer';

  -- B reads its defences: four, the newest first; then they are read. (In one transaction now() does
  -- not move: B last read them before.)
  update public.combat_arena_players set defenses_seen_at = now() - interval '1 hour' where user_id = v_b;
  v_arena := pg_temp.arena(v_b);
  assert jsonb_array_length(v_arena -> 'defenses') = 4, 'B''s defences';
  assert (v_arena -> 'defenses' -> 0 ->> 'new')::boolean, 'new until read';
  assert (select count(*) from jsonb_array_elements(v_arena -> 'defenses') x where (x ->> 'held')::boolean) = 1, 'one held (the challenge given up)';
  set local role authenticated;
  perform pg_temp.as_user(v_b);
  assert public.combat_arena_news() = 4, 'four news for Gioca';
  perform public.combat_arena_seen();
  assert public.combat_arena_news() = 0, 'read';
  reset role;

  -- B loses a card of the defence: it no longer fights, and it is no longer offered.
  delete from public.card_instances where id = v_b_cards[1];
  assert not (pg_temp.arena(v_b) -> 'defense' ->> 'ok')::boolean, 'B''s defence broken';
  set local role authenticated;
  perform pg_temp.as_user(v_a);
  v_arena := public.combat_arena_refresh();
  reset role;
  assert (select count(*) from jsonb_array_elements(v_arena -> 'offers') x where x ->> 'kind' = 'player') = 0, 'B no longer offered';

  -- C has no defence: no challenge; A's renewals end.
  v_failed := false;
  begin perform pg_temp.challenge(v_c, 0, v_c_cards, v_team, '{}');
  exception when others then v_failed := sqlerrm = 'combat_no_defense'; end;
  assert v_failed, 'C without a defence';
  update public.combat_arena_offers set refreshes = 5 where user_id = v_a;
  set local role authenticated;
  perform pg_temp.as_user(v_a);
  v_failed := false;
  begin perform public.combat_arena_refresh();
  exception when others then v_failed := sqlerrm = 'combat_no_refresh'; end;
  reset role;
  assert v_failed, 'a sixth renewal';

  -- The mode switched off: no defence saved.
  update public.mode_availability set state = 'off' where key = 'combat';
  v_failed := false;
  begin perform public.combat_defense_save(v_a, v_cards, '{"strategy": "balanced"}');
  exception when others then v_failed := sqlerrm = 'mode_unavailable'; end;
  assert v_failed, 'a defence with the mode off';
  update public.mode_availability set state = 'on' where key = 'combat';
end $$;

rollback;
