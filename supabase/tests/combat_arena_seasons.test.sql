-- Integration test for the seasons of the Scontro a squadre challenges, stage 6b (SPEC §5.19,
-- docs/COMBAT.md, 20261126140000_scontro_arena_seasons.sql): the ledger of both sides, the board of
-- the season, a past season closed once with places, leagues, prizes and notifications, the prize
-- claimed once, the cut of a new season, and what clients cannot touch. Rolled back:
--   npm run test:db

begin;

update public.mode_availability set state = 'on' where key = 'combat';
update public.game_config set value = '"always"' where key = 'combat_unlock.mode';
update public.game_config c set value = to_jsonb(d.value)
from (values ('combat_arena.win_points', 25), ('combat_arena.loss_points', 20), ('combat_arena.points_per_step', 20),
             ('combat_arena.win_min', 10), ('combat_arena.win_max', 40), ('combat_arena.loss_min', 5), ('combat_arena.loss_max', 35),
             ('combat_arena.no_loss_below', 300), ('combat_arena.same_opponent_daily', 3), ('combat_arena.defense_share_percent', 33),
             ('combat_arena.board_size', 10), ('combat_arena.season.keep_up_to', 700), ('combat_arena.season.keep_share_percent', 50),
             ('combat_arena.season.min_challenges', 5), ('combat_arena.leagues.asso', 1200), ('combat_arena.leagues.leggenda', 1800),
             ('combat_arena.season.rewards.asso.coins', 100), ('combat_arena.season.rewards.asso.packs', 1),
             ('combat_arena.season.rewards.recluta.coins', 25), ('combat_arena.season.rewards.recluta.packs', 0)) as d(key, value)
where c.key = d.key;
-- Only the test players on the boards and in the seasons (the real ones come back at the rollback).
delete from public.combat_defenses;
delete from public.combat_arena_season_results;
delete from public.combat_arena_seasons;
delete from public.combat_arena_ledger;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-8000-0000000007f' || n)::uuid, 'authenticated', 'authenticated',
       'combat-season-' || n || '@example.test', jsonb_build_object('full_name', 'Stagione ' || n), now(), now()
from generate_series(1, 2) as n;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', '00000000-0000-4000-8000-0000000007f' || n, 'role', 'authenticated')::text, true),
       public.bootstrap_player()
from generate_series(1, 2) as n;
reset role;

create function pg_temp.as_user(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', p_user, 'role', 'authenticated')::text, true)
$$;

create function pg_temp.u(p_n integer) returns uuid language sql as $$
  select ('00000000-0000-4000-8000-0000000007f' || p_n)::uuid
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

create function pg_temp.setup(p_codes text[], p_b uuid[]) returns jsonb language sql as $$
  select jsonb_build_object(
    'a', (select jsonb_agg(jsonb_build_object('definitionId', d.id) order by u.ord)
          from unnest(p_codes) with ordinality as u(code, ord) join public.card_definitions d on d.code = u.code),
    'b', coalesce((select jsonb_agg(jsonb_build_object('definitionId', x) order by o) from unnest(p_b) with ordinality as e(x, o)), '[]'::jsonb),
    'field', null)
$$;

create function pg_temp.offer_of(p_user uuid, p_opponent uuid) returns integer language sql as $$
  select (e.ord - 1)::integer from public.combat_arena_offers o, jsonb_array_elements(o.offers) with ordinality as e(x, ord)
  where o.user_id = p_user and e.x ->> 'user_id' = p_opponent::text
  order by e.ord limit 1
$$;

-- As the player: a function of the client, with the player's claims.
create function pg_temp.call(p_user uuid, p_sql text) returns jsonb language plpgsql as $$
declare
  v_result jsonb;
begin
  set local role authenticated;
  perform pg_temp.as_user(p_user);
  execute p_sql into v_result;
  reset role;
  return v_result;
end $$;

create function pg_temp.previous_season() returns text language sql as $$
  select public.ranked_season_of((public.game_day() - interval '1 month')::date)
$$;

-- ---------------------------------------------------------------------------
-- Clients: the new tables and the server's functions are closed
-- ---------------------------------------------------------------------------

set local role authenticated;
select pg_temp.as_user(pg_temp.u(1));
do $$
declare
  v_failed boolean;
begin
  v_failed := false;
  begin perform 1 from public.combat_arena_ledger;
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'a client read the ledger';
  v_failed := false;
  begin perform 1 from public.combat_arena_season_results;
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'a client read the results';
  v_failed := false;
  begin perform public.combat_arena_close_seasons();
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'a client closed the seasons';
  v_failed := false;
  begin perform public.combat_arena_player_state(pg_temp.u(2));
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'a client touched a player''s row';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- The season in course: the ledger of both sides and the board
-- ---------------------------------------------------------------------------

do $$
declare
  v_a uuid := pg_temp.u(1);
  v_b uuid := pg_temp.u(2);
  v_team text[] := array['P001', 'P152', 'P125', 'P204', 'P123'];
  v_defense text[] := array['P043', 'P044', 'P037', 'P213', 'P104'];
  v_cards uuid[];
  v_b_cards uuid[];
  v_b_defs uuid[];
  v_battle uuid;
  v_board jsonb;
  v_season text := public.ranked_current_season();
begin
  v_cards := pg_temp.give(v_a, v_team);
  v_b_cards := pg_temp.give(v_b, v_defense);
  perform public.combat_defense_save(v_a, v_cards, '{"strategy": "balanced"}');
  perform public.combat_defense_save(v_b, v_b_cards, '{"strategy": "balanced"}');
  select definition_ids into v_b_defs from public.combat_defenses where user_id = v_b;
  perform pg_temp.call(v_a, 'select public.combat_arena_refresh()');

  -- A (0) beats B (500): +40 for A, -12 for B, both written.
  update public.combat_arena_players set points = 500 where user_id = v_b;
  v_battle := public.combat_arena_create(v_a, pg_temp.offer_of(v_a, v_b), v_cards, pg_temp.setup(v_team, v_b_defs), '{}'::jsonb, 5, '{"strategy": "balanced", "priority": null, "orders": {}}'::jsonb, true);
  perform public.combat_record(v_battle, v_a, 0, '[]', '{"winner": "a", "reason": "wiped"}');
  assert (select delta = 40 and points_after = 40 and outcome = 'win' and season = v_season from public.combat_arena_ledger where user_id = v_a and battle_id = v_battle and reason = 'attack'), 'A''s row';
  assert (select delta = -12 and points_after = 488 and outcome = 'loss' from public.combat_arena_ledger where user_id = v_b and battle_id = v_battle and reason = 'defense'), 'B''s row';

  v_board := pg_temp.call(v_a, 'select public.get_combat_arena_board()');
  assert (v_board ->> 'current')::boolean and v_board ->> 'season' = v_season and (v_board ->> 'players')::integer = 2, 'the board of the season';
  assert v_board -> 'top' -> 0 ->> 'username' is not null and (v_board -> 'top' -> 0 ->> 'points')::integer = 488, 'B first with 488';
  assert (v_board -> 'me' ->> 'points')::integer = 40 and (v_board -> 'me' ->> 'place')::integer = 2 and (v_board -> 'me' ->> 'challenges')::integer = 1, 'A second, one challenge';
  assert (v_board -> 'me' ->> 'is_me')::boolean, 'the caller''s row';
  v_board := pg_temp.call(v_a, 'select public.get_combat_arena()');
  assert (v_board -> 'season' ->> 'place')::integer = 2 and (v_board -> 'season' ->> 'challenges')::integer = 1, 'A''s season';
  assert v_board -> 'season' ->> 'league' = 'recluta' and (v_board -> 'season' ->> 'min_challenges')::integer = 5, 'A''s league and the minimum';
end $$;

-- ---------------------------------------------------------------------------
-- A past season: closed once, prizes, notifications, the claim
-- ---------------------------------------------------------------------------

do $$
declare
  v_a uuid := pg_temp.u(1);
  v_b uuid := pg_temp.u(2);
  v_past text := pg_temp.previous_season();
  v_arena jsonb;
  v_claim jsonb;
  v_coins bigint;
  v_failed boolean;
  v_board jsonb;
begin
  -- Last month: A challenged five times and ended at 1300 (Asso); B twice, at 250.
  insert into public.combat_arena_ledger (user_id, season, reason, outcome, delta, points_after, created_at)
  select v_a, v_past, 'attack', 'win', 260, 260 * n, now() - interval '40 days' + make_interval(mins => n) from generate_series(1, 5) as n;
  insert into public.combat_arena_ledger (user_id, season, reason, outcome, delta, points_after, created_at)
  select v_b, v_past, 'attack', 'win', 125, 125 * n, now() - interval '40 days' + make_interval(mins => n) from generate_series(1, 2) as n;
  delete from public.player_notifications where user_id in (v_a, v_b);

  select coalesce(sum(amount), 0) into v_coins from public.coin_ledger where user_id = v_a;
  v_arena := pg_temp.call(v_a, 'select public.get_combat_arena()');
  assert exists (select 1 from public.combat_arena_seasons where season = v_past), 'the past season closed';
  assert (select place = 1 and points = 1300 and league = 'asso' and challenges = 5 and wins = 5 and coins = 100 and packs = 1
          from public.combat_arena_season_results where season = v_past and user_id = v_a), 'A first, Asso, with the prize';
  assert (select place = 2 and league = 'recluta' and coins = 0 and packs = 0 from public.combat_arena_season_results where season = v_past and user_id = v_b), 'B without the minimum';
  assert (select count(*) from public.player_notifications where user_id in (v_a, v_b) and kind = 'combat_season') = 2, 'both told';
  assert jsonb_array_length(v_arena -> 'prizes') = 1 and (v_arena -> 'prizes' -> 0 ->> 'coins')::integer = 100, 'A''s prize to claim';

  -- Closed once: a second visit writes nothing more.
  perform pg_temp.call(v_b, 'select public.get_combat_arena()');
  assert (select count(*) from public.combat_arena_season_results where season = v_past) = 2, 'no second close';
  assert (select count(*) from public.player_notifications where user_id in (v_a, v_b) and kind = 'combat_season') = 2, 'no second notification';

  -- The board of the past season, and the seasons to choose.
  v_board := pg_temp.call(v_a, format('select public.get_combat_arena_board(%L)', v_past));
  assert not (v_board ->> 'current')::boolean and (v_board -> 'top' -> 0 ->> 'points')::integer = 1300, 'the past board from the ledger';
  assert (select bool_or(x ->> 'season' = v_past) from jsonb_array_elements(v_board -> 'seasons') x), 'the past season to choose';
  v_failed := false;
  begin perform pg_temp.call(v_a, 'select public.get_combat_arena_board(''2026-13'')');
  exception when others then v_failed := sqlerrm = 'combat_season_invalid'; end;
  assert v_failed, 'a season that does not exist';

  -- The claim: coins and a pack, once; B has nothing to claim.
  v_claim := pg_temp.call(v_a, format('select public.claim_combat_arena_prize(%L)', v_past));
  assert (v_claim ->> 'coins')::integer = 100 and jsonb_array_length(v_claim -> 'opening_ids') = 1, 'claimed';
  assert (select coalesce(sum(amount), 0) from public.coin_ledger where user_id = v_a) = v_coins + 100, 'the coins';
  assert (select pack_type = 'combat' from public.pack_openings where id = (v_claim -> 'opening_ids' ->> 0)::uuid), 'the pack';
  assert jsonb_array_length(pg_temp.call(v_a, 'select public.get_combat_arena()') -> 'prizes') = 0, 'nothing left to claim';
  v_failed := false;
  begin perform pg_temp.call(v_a, format('select public.claim_combat_arena_prize(%L)', v_past));
  exception when others then v_failed := sqlerrm = 'combat_prize_already_claimed'; end;
  assert v_failed, 'claimed twice';
  v_failed := false;
  begin perform pg_temp.call(v_b, format('select public.claim_combat_arena_prize(%L)', v_past));
  exception when others then v_failed := sqlerrm = 'combat_prize_not_found'; end;
  assert v_failed, 'B claimed a prize it has not';
end $$;

-- ---------------------------------------------------------------------------
-- The cut of a new season: up to 700 plus half the rest
-- ---------------------------------------------------------------------------

do $$
declare
  v_a uuid := pg_temp.u(1);
  v_b uuid := pg_temp.u(2);
  v_team text[] := array['P001', 'P152', 'P125', 'P204', 'P123'];
  v_cards uuid[];
  v_b_defs uuid[];
  v_battle uuid;
begin
  update public.combat_arena_players set season = pg_temp.previous_season(), points = 1300 where user_id = v_a;
  assert (pg_temp.call(v_a, 'select public.get_combat_arena()') ->> 'points')::integer = 1000, 'the cut counted before it is written';
  select array_agg(i.id order by array_position(v_team, d.code)) into v_cards
  from (select distinct on (i.definition_id) i.* from public.card_instances i where i.owner_id = v_a order by i.definition_id, i.acquired_at) i
  join public.card_definitions d on d.id = i.definition_id where d.code = any (v_team);
  select definition_ids into v_b_defs from public.combat_defenses where user_id = v_b;
  perform pg_temp.call(v_a, 'select public.combat_arena_refresh()');
  v_battle := public.combat_arena_create(v_a, pg_temp.offer_of(v_a, v_b), v_cards, pg_temp.setup(v_team, v_b_defs), '{}'::jsonb, 6, '{"strategy": "balanced", "priority": null, "orders": {}}'::jsonb, true);
  perform public.combat_record(v_battle, v_a, 0, '[]', '{"winner": "b", "reason": "wiped"}');
  assert (select delta = -300 and points_after = 1000 from public.combat_arena_ledger
          where user_id = v_a and reason = 'season_reset' and season = public.ranked_current_season()), 'the cut written';
  assert (select season = public.ranked_current_season() from public.combat_arena_players where user_id = v_a), 'the row in the new season';
  assert (select points_after < 1000 and delta < 0 from public.combat_arena_ledger where user_id = v_a and battle_id = v_battle), 'the loss after the cut';
end $$;

rollback;
