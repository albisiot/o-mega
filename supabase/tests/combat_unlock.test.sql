-- Integration test for the unlock of the Scontro a squadre kits (SPEC §5.19, docs/COMBAT.md,
-- 20261126120000_scontro_kit_unlock.sql): the matches that count (won or finished, from
-- combat_unlock.since), the battle refused while a character is locked, the "always" mode, what a
-- player reads, and the settings for admins only. Rolled back:
--   npm run test:db

begin;

update public.mode_availability set state = 'on' where key = 'combat';
update public.game_config set value = '"progress"' where key = 'combat_unlock.mode';
update public.game_config set value = '"wins"' where key = 'combat_unlock.basis';
update public.game_config set value = '2' where key = 'combat_unlock.count';
update public.game_config set value = 'null' where key = 'combat_unlock.since';

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-8000-0000000007d' || n)::uuid, 'authenticated', 'authenticated',
       'combat-unlock-' || n || '@example.test', jsonb_build_object('full_name', 'Sblocco ' || n), now(), now()
from generate_series(1, 3) as n;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', '00000000-0000-4000-8000-0000000007d' || n, 'role', 'authenticated')::text, true),
       public.bootstrap_player()
from generate_series(1, 3) as n;
reset role;

create function pg_temp.as_user(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', p_user, 'role', 'authenticated')::text, true)
$$;

create function pg_temp.u(p_n integer) returns uuid language sql as $$
  select ('00000000-0000-4000-8000-0000000007d' || p_n)::uuid
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

create function pg_temp.setup(p_codes text[]) returns jsonb language sql as $$
  select jsonb_build_object(
    'a', (select jsonb_agg(jsonb_build_object('definitionId', d.id, 'name', d.name) order by u.ord)
          from unnest(p_codes) with ordinality as u(code, ord) join public.card_definitions d on d.code = u.code),
    'b', '[]'::jsonb, 'field', null)
$$;

create function pg_temp.create(p_user uuid, p_cards uuid[], p_codes text[]) returns uuid language sql as $$
  select public.combat_create(p_user, p_cards, pg_temp.setup(p_codes), '{}'::jsonb, 12345, '{"strategy": "balanced", "priority": null, "orders": {}}'::jsonb, false)
$$;

-- A finished match against the bot with these cards in the player's team (side a): won ('a'),
-- lost ('b') or drawn, finished some hours ago.
create function pg_temp.played(p_user uuid, p_cards uuid[], p_result text, p_hours_ago integer default 0) returns void language plpgsql as $$
declare
  v_match uuid;
  v_threats uuid[];
  v_levels integer[];
begin
  select array_agg(t.id order by t.code), array_agg(t.level order by t.code) into v_threats, v_levels
  from (select id, code, level from public.threat_definitions where is_active and region = 'megara' and rarity_code is null order by code limit 5) t;
  insert into public.matches (mode, bot_difficulty, player_a, threat_ids, threat_levels)
  values ('bot', 'medium', p_user, v_threats, v_levels) returning id into v_match;
  insert into public.match_teams (match_id, side, user_id, card_instance_ids, definition_ids)
  select v_match, 'a', p_user, p_cards, array_agg(i.definition_id order by u.ord)
  from unnest(p_cards) with ordinality as u(id, ord) join public.card_instances i on i.id = u.id;
  update public.matches
  set status = 'finished', result = p_result, end_reason = 'completed', finished_at = now() - make_interval(hours => p_hours_ago)
  where id = v_match;
end $$;

create function pg_temp.unlocks(p_user uuid) returns jsonb language plpgsql as $$
declare
  v_result jsonb;
begin
  set local role authenticated;
  perform pg_temp.as_user(p_user);
  v_result := public.get_combat_unlocks();
  reset role;
  return v_result;
end $$;

-- ---------------------------------------------------------------------------
-- Clients: the counts and the check are for the server only
-- ---------------------------------------------------------------------------

set local role authenticated;
select pg_temp.as_user(pg_temp.u(1));
do $$
declare
  v_failed boolean;
begin
  v_failed := false;
  begin perform * from public.combat_unlock_counts(pg_temp.u(2));
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'a client read another player''s counts';
  v_failed := false;
  begin perform public.combat_kit_unlocked(pg_temp.u(2), gen_random_uuid());
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'a client called the unlock check';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- Wins, matches played, the battle refused while locked
-- ---------------------------------------------------------------------------

do $$
declare
  v_a uuid := pg_temp.u(1);
  v_port text[] := array['P001', 'P152', 'P125', 'P204', 'P123'];
  v_cards uuid[];
  v_extra uuid[];
  v_unlocks jsonb;
  v_failed boolean;
  v_def uuid;
begin
  v_cards := pg_temp.give(v_a, v_port);
  select id into v_def from public.card_definitions where code = 'P001';

  v_unlocks := pg_temp.unlocks(v_a);
  assert v_unlocks ->> 'mode' = 'progress' and v_unlocks ->> 'basis' = 'wins', 'the rules as set';
  assert (v_unlocks ->> 'count')::integer = 2 and (v_unlocks ->> 'needed')::integer = 5, 'two matches, five characters';
  assert (v_unlocks ->> 'ready')::integer = 0, 'nothing unlocked at first';

  v_failed := false;
  begin perform pg_temp.create(v_a, v_cards, v_port);
  exception when others then v_failed := sqlerrm = 'combat_locked'; end;
  assert v_failed, 'a locked team fought';

  -- A win and a loss: one win, two matches played.
  perform pg_temp.played(v_a, v_cards, 'a');
  perform pg_temp.played(v_a, v_cards, 'b');
  v_unlocks := pg_temp.unlocks(v_a);
  assert (v_unlocks -> 'progress' ->> v_def::text)::integer = 1, 'one win counted';
  assert (v_unlocks ->> 'ready')::integer = 0, 'one win is not enough';
  assert (select c.wins = 1 and c.played = 2 from public.combat_unlock_counts(v_a) c where c.definition_id = v_def), 'wins and matches played';

  -- Counting the matches played instead: two, unlocked.
  update public.game_config set value = '"played"' where key = 'combat_unlock.basis';
  v_unlocks := pg_temp.unlocks(v_a);
  assert (v_unlocks -> 'progress' ->> v_def::text)::integer = 2, 'two matches played';
  assert (v_unlocks ->> 'ready')::integer = 5, 'five unlocked by the matches played';
  perform pg_temp.create(v_a, v_cards, v_port);
  update public.game_config set value = '"wins"' where key = 'combat_unlock.basis';

  -- A draw is not a win; a second win unlocks.
  perform pg_temp.played(v_a, v_cards, 'draw');
  assert (pg_temp.unlocks(v_a) ->> 'ready')::integer = 0, 'a draw unlocked';
  perform pg_temp.played(v_a, v_cards, 'a');
  v_unlocks := pg_temp.unlocks(v_a);
  assert (v_unlocks ->> 'ready')::integer = 5, 'two wins unlock';
  perform pg_temp.create(v_a, v_cards, v_port);

  -- A sixth character with no match stays locked, and a team with it is refused.
  v_extra := pg_temp.give(v_a, array['P043']);
  assert (pg_temp.unlocks(v_a) ->> 'ready')::integer = 5, 'the new character is locked';
  v_failed := false;
  begin
    perform pg_temp.create(v_a, array[v_extra[1], v_cards[2], v_cards[3], v_cards[4], v_cards[5]], array['P043', 'P152', 'P125', 'P204', 'P123']);
  exception when others then v_failed := sqlerrm = 'combat_locked'; end;
  assert v_failed, 'a team with a locked character fought';
end $$;

-- ---------------------------------------------------------------------------
-- From when the matches count; the "always" mode
-- ---------------------------------------------------------------------------

do $$
declare
  v_b uuid := pg_temp.u(2);
  v_c uuid := pg_temp.u(3);
  v_port text[] := array['P001', 'P152', 'P125', 'P204', 'P123'];
  v_cards uuid[];
begin
  v_cards := pg_temp.give(v_b, v_port);
  perform pg_temp.played(v_b, v_cards, 'a', 72);
  perform pg_temp.played(v_b, v_cards, 'a', 48);
  assert (pg_temp.unlocks(v_b) ->> 'ready')::integer = 5, 'every match counts with no date';
  update public.game_config set value = to_jsonb(now() - interval '60 hours') where key = 'combat_unlock.since';
  assert (pg_temp.unlocks(v_b) ->> 'ready')::integer = 0, 'a match before the date counted';
  assert (select c.wins from public.combat_unlock_counts(v_b) c join public.card_definitions d on d.id = c.definition_id where d.code = 'P001') = 1,
    'only the match after the date';
  assert (pg_temp.unlocks(v_b) ->> 'since') is not null, 'the date is told';

  -- Always: every kit open, even with no match at all.
  -- (the copies just given: the starter cards, drawn at random, may hold the same characters)
  v_cards := pg_temp.give(v_c, v_port);
  update public.game_config set value = '"always"' where key = 'combat_unlock.mode';
  assert (pg_temp.unlocks(v_c) ->> 'ready')::integer >= 5, 'every kit open';
  perform pg_temp.create(v_c, v_cards, v_port);
  update public.game_config set value = '"progress"' where key = 'combat_unlock.mode';
end $$;

-- ---------------------------------------------------------------------------
-- The settings: admins only, checked
-- ---------------------------------------------------------------------------

insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000007d3');

set local role authenticated;
select pg_temp.as_user(pg_temp.u(1));
do $$
declare
  v_failed boolean := false;
begin
  begin perform public.admin_save_combat_unlock('always', 'wins', 50, null);
  exception when others then v_failed := sqlerrm = 'not_admin'; end;
  assert v_failed, 'a player changed the unlock';
end $$;
select pg_temp.as_user(pg_temp.u(3));
do $$
declare
  v_failed boolean;
  v_saved jsonb;
begin
  v_failed := false;
  begin perform public.admin_save_combat_unlock('sometimes', 'wins', 50, null);
  exception when others then v_failed := sqlerrm = 'invalid_combat_unlock'; end;
  assert v_failed, 'an unknown mode saved';
  v_failed := false;
  begin perform public.admin_save_combat_unlock('progress', 'losses', 50, null);
  exception when others then v_failed := sqlerrm = 'invalid_combat_unlock'; end;
  assert v_failed, 'an unknown basis saved';
  v_failed := false;
  begin perform public.admin_save_combat_unlock('progress', 'wins', 0, null);
  exception when others then v_failed := sqlerrm = 'invalid_combat_unlock'; end;
  assert v_failed, 'zero matches saved';
  v_failed := false;
  begin perform public.admin_save_combat_unlock(null, 'wins', 50, null);
  exception when others then v_failed := sqlerrm = 'invalid_combat_unlock'; end;
  assert v_failed, 'no mode saved';

  v_saved := public.admin_save_combat_unlock('progress', 'played', 30, '2026-11-01T00:00:00+00');
  assert v_saved ->> 'basis' = 'played' and (v_saved ->> 'count')::integer = 30, 'saved';
  v_saved := public.get_combat_unlocks();
  assert v_saved ->> 'basis' = 'played' and (v_saved ->> 'count')::integer = 30
         and (v_saved ->> 'since')::timestamptz = '2026-11-01T00:00:00+00', 'read back';
  perform public.admin_save_combat_unlock('progress', 'wins', 50, null);
  assert public.get_combat_unlocks() -> 'since' = 'null'::jsonb, 'every match ever: no date';
end $$;
reset role;

rollback;
