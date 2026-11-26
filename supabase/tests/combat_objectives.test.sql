-- Integration test for the objectives of the day of the Scontro a squadre, stage 6c (SPEC §5.19,
-- docs/COMBAT.md, 20261126150000_scontro_objectives.sql): admins put them in the catalog, an
-- objective of the Scontro is drawn only for a player who can play it (the mode open, the kits
-- unlocked, a defence for the challenges), and the battles that end move them: against the computer
-- and challenges, finished and won; a battle given up moves nothing. Rolled back:
--   npm run test:db

begin;

update public.mode_availability set state = 'on' where key = 'combat';
update public.game_config set value = '"always"' where key = 'combat_unlock.mode';
-- The real players' defences are not part of the test: only the test players can be offered.
delete from public.combat_defenses;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-8000-0000000007f' || n)::uuid, 'authenticated', 'authenticated',
       'combat-objectives-' || n || '@example.test', jsonb_build_object('full_name', 'Obiettivi Scontro ' || n), now(), now()
from generate_series(1, 3) as n;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', '00000000-0000-4000-8000-0000000007f' || n, 'role', 'authenticated')::text, true),
       public.bootstrap_player()
from generate_series(1, 3) as n;
reset role;

insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000007f3');

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

create function pg_temp.battle(p_user uuid, p_cards uuid[], p_codes text[]) returns uuid language sql as $$
  select public.combat_create(p_user, p_cards, pg_temp.setup(p_codes, '{}'), '{}'::jsonb, 777, '{"strategy": "balanced", "priority": null, "orders": {}}'::jsonb, true)
$$;

-- A challenge against the first team offered of a player (p_player) or of the computer.
create function pg_temp.challenge(p_user uuid, p_cards uuid[], p_codes text[], p_player boolean default false) returns uuid language plpgsql as $$
declare
  v_index integer;
  v_b uuid[];
begin
  perform public.combat_arena_make_offers(p_user);
  select (e.ord - 1)::integer into v_index
  from public.combat_arena_offers o, jsonb_array_elements(o.offers) with ordinality as e(x, ord)
  where o.user_id = p_user and e.x ->> 'kind' = case when p_player then 'player' else 'computer' end
  order by e.ord limit 1;
  v_b := array(select (y #>> '{}')::uuid
               from jsonb_array_elements((select o.offers -> v_index -> 'definition_ids' from public.combat_arena_offers o where o.user_id = p_user)) with ordinality as e(y, ord)
               order by ord);
  return public.combat_arena_create(p_user, v_index, p_cards, pg_temp.setup(p_codes, v_b), '{}'::jsonb, 777, '{"strategy": "balanced", "priority": null, "orders": {}}'::jsonb, true);
end $$;

create function pg_temp.finish(p_user uuid, p_battle uuid, p_winner text) returns jsonb language sql as $$
  select public.combat_record(p_battle, p_user, 0, '[]'::jsonb, jsonb_build_object('winner', p_winner, 'reason', 'wiped'))
$$;

-- The progress of the player's open objective of a metric today (null: none drawn).
create function pg_temp.progress(p_user uuid, p_metric text) returns integer language sql as $$
  select o.progress from public.daily_objectives o
  where o.user_id = p_user and o.day = public.game_day() and o.metric = p_metric and o.replaced_at is null
$$;

-- ---------------------------------------------------------------------------
-- The catalog: the four metrics of the Scontro, with no filters, for admins only
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.u(3), 'role', 'authenticated')::text, true);
do $$
declare
  v_payload jsonb;
  v_metric text;
  v_failed boolean;
begin
  foreach v_metric in array array['combat_played', 'combat_won', 'arena_played', 'arena_won'] loop
    v_payload := public.admin_save_daily_objective(null, 'Prova ' || v_metric, 'hard', v_metric, '{}', 3, 40, 0);
    assert exists (select 1 from jsonb_array_elements(v_payload -> 'objectives') o where o ->> 'metric' = v_metric), v_metric || ' saved';
  end loop;
  v_failed := false;
  begin perform public.admin_save_daily_objective(null, 'Prova', 'hard', 'arena_won', '{"opponent": "bot"}', 3, 40, 0);
  exception when others then v_failed := sqlerrm = 'invalid_objective'; end;
  assert v_failed, 'a filter on a metric of the Scontro';
  v_failed := false;
  begin perform public.admin_save_daily_objective(null, 'Prova', 'hard', 'arena_defended', '{}', 3, 40, 0);
  exception when others then v_failed := sqlerrm = 'invalid_objective'; end;
  assert v_failed, 'a metric that does not exist';
end $$;
select set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.u(1), 'role', 'authenticated')::text, true);
do $$
declare
  v_failed boolean := false;
begin
  begin perform public.combat_objective_available(auth.uid(), 'combat_won');
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'a client asked the server''s check';
end $$;
reset role;
delete from public.daily_objective_definitions where title like 'Prova %';

-- ---------------------------------------------------------------------------
-- Who can be given an objective of the Scontro
-- ---------------------------------------------------------------------------

do $$
declare
  v_a uuid := pg_temp.u(1);
  v_c uuid := pg_temp.u(2);
  v_team text[] := array['P001', 'P152', 'P125', 'P204', 'P123'];
  v_cards uuid[];
begin
  v_cards := pg_temp.give(v_a, v_team);
  assert public.combat_objective_available(v_a, 'matches_won'), 'the other metrics always';
  assert public.combat_objective_available(v_a, 'combat_won'), 'the mode open, the kits open';
  assert not public.combat_objective_available(v_a, 'arena_won'), 'no challenges without a defence';
  perform public.combat_defense_save(v_a, v_cards, '{"strategy": "defensive", "priority": null, "orders": {}}');
  assert public.combat_objective_available(v_a, 'arena_played'), 'challenges with a defence';

  update public.mode_availability set state = 'off' where key = 'combat';
  assert not public.combat_objective_available(v_a, 'combat_played'), 'the mode closed';
  assert public.combat_objective_available(v_a, 'matches_played'), 'the other metrics with the mode closed';
  update public.mode_availability set state = 'on' where key = 'combat';

  -- The kits locked: no match won with the characters since the unlock counts.
  update public.game_config set value = '"progress"' where key = 'combat_unlock.mode';
  update public.game_config set value = to_jsonb(now() + interval '1 hour') where key = 'combat_unlock.since';
  assert not public.combat_objective_available(v_a, 'combat_won'), 'the kits locked';
  assert not public.combat_objective_available(v_c, 'combat_played'), 'the kits locked for a new player';
  update public.game_config set value = '"always"' where key = 'combat_unlock.mode';
end $$;

-- Only objectives of the Scontro in the catalog: player 3 cannot play them (the mode closed), so no
-- objective today; player 1 gets one for every difficulty.
update public.daily_objective_definitions set is_active = false;
insert into public.daily_objective_definitions (code, title, difficulty, metric, params, target) values
  ('test_combat_played', 'Gioca 3 Scontri a squadre contro il computer', 'easy', 'combat_played', '{}', 3),
  ('test_combat_won', 'Vinci 3 Scontri a squadre contro il computer', 'medium', 'combat_won', '{}', 3),
  ('test_arena_played', 'Gioca 3 sfide dello Scontro', 'hard', 'arena_played', '{}', 3),
  ('test_arena_won', 'Vinci 3 sfide dello Scontro', 'hard', 'arena_won', '{}', 3);
update public.daily_objective_definitions set is_active = false where code = 'test_arena_won';

do $$
begin
  update public.mode_availability set state = 'off' where key = 'combat';
  perform public.ensure_daily_objectives(pg_temp.u(3));
  assert not exists (select 1 from public.daily_objectives where user_id = pg_temp.u(3)), 'nothing of the Scontro with the mode closed';
  update public.mode_availability set state = 'on' where key = 'combat';

  perform public.ensure_daily_objectives(pg_temp.u(1));
  assert (select array_agg(o.metric order by o.slot) from public.daily_objectives o where o.user_id = pg_temp.u(1) and o.replaced_at is null)
         = array['combat_played', 'combat_won', 'arena_played'], 'the three objectives of the Scontro';
  assert pg_temp.progress(pg_temp.u(1), 'combat_played') = 0, 'nothing done';
end $$;

-- ---------------------------------------------------------------------------
-- The battles that end move them
-- ---------------------------------------------------------------------------

do $$
declare
  v_a uuid := pg_temp.u(1);
  v_c uuid := pg_temp.u(2);
  v_team text[] := array['P001', 'P152', 'P125', 'P204', 'P123'];
  v_cards uuid[] := array(select i.id from public.card_instances i join public.card_definitions d on d.id = i.definition_id
                          join unnest(array['P001', 'P152', 'P125', 'P204', 'P123']) with ordinality as t(code, ord) on t.code = d.code
                          where i.owner_id = pg_temp.u(1) order by t.ord);
  v_c_team text[] := array['P043', 'P044', 'P037', 'P213', 'P104'];
  v_c_cards uuid[];
  v_battle uuid;
begin
  -- Against the computer: won, lost, given up (by starting another), a draw.
  v_battle := pg_temp.battle(v_a, v_cards, v_team);
  perform pg_temp.finish(v_a, v_battle, 'a');
  assert pg_temp.progress(v_a, 'combat_played') = 1 and pg_temp.progress(v_a, 'combat_won') = 1, 'a battle won';
  v_battle := pg_temp.battle(v_a, v_cards, v_team);
  perform pg_temp.finish(v_a, v_battle, 'b');
  assert pg_temp.progress(v_a, 'combat_played') = 2 and pg_temp.progress(v_a, 'combat_won') = 1, 'a battle lost';
  perform pg_temp.battle(v_a, v_cards, v_team);
  v_battle := pg_temp.battle(v_a, v_cards, v_team);
  assert pg_temp.progress(v_a, 'combat_played') = 2, 'a battle given up counts for nothing';
  perform public.combat_give_up(v_battle);
  assert pg_temp.progress(v_a, 'combat_played') = 2, 'a battle abandoned counts for nothing';
  assert pg_temp.progress(v_a, 'arena_played') = 0, 'the battles against the computer are not challenges';

  -- A challenge: the challenges, not the battles against the computer. Given up, nothing.
  v_battle := pg_temp.challenge(v_a, v_cards, v_team);
  perform public.combat_give_up(v_battle);
  assert pg_temp.progress(v_a, 'arena_played') = 0, 'a challenge given up counts for nothing';
  v_battle := pg_temp.challenge(v_a, v_cards, v_team);
  perform pg_temp.finish(v_a, v_battle, 'a');
  assert pg_temp.progress(v_a, 'arena_played') = 1, 'a challenge';
  assert pg_temp.progress(v_a, 'combat_played') = 2 and pg_temp.progress(v_a, 'combat_won') = 1, 'a challenge is not a battle against the computer';
  v_battle := pg_temp.challenge(v_a, v_cards, v_team);
  perform pg_temp.finish(v_a, v_battle, 'draw');
  assert pg_temp.progress(v_a, 'arena_played') = 2, 'a challenge drawn';

  -- Player 2: the challenges won, with a defence and the mode open.
  update public.daily_objective_definitions set is_active = (code = 'test_arena_won') where code like 'test_arena_%';
  v_c_cards := pg_temp.give(v_c, v_c_team);
  perform public.combat_defense_save(v_c, v_c_cards, '{"strategy": "balanced", "priority": null, "orders": {}}');
  perform public.ensure_daily_objectives(v_c);
  assert pg_temp.progress(v_c, 'arena_won') = 0, 'the challenges won drawn';
  v_battle := pg_temp.challenge(v_c, v_c_cards, v_c_team);
  perform pg_temp.finish(v_c, v_battle, 'b');
  assert pg_temp.progress(v_c, 'arena_won') = 0, 'a challenge lost';
  v_battle := pg_temp.challenge(v_c, v_c_cards, v_c_team, true);
  perform pg_temp.finish(v_c, v_battle, 'a');
  assert pg_temp.progress(v_c, 'arena_won') = 1, 'a challenge won, against player 1''s defence';
  assert pg_temp.progress(v_a, 'arena_played') = 2, 'a defence does not move the defender''s challenges';
end $$;

rollback;
