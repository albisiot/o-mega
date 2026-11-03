-- Integration test for the functions rewritten so that the game holds up with
-- many players: the cards in use read once per collection. Service-only
-- functions are called as the database owner, as the Edge Function would with
-- service_role. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'scale-a@example.test', '{"full_name": "Scala A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated', 'scale-b@example.test', '{"full_name": "Scala B"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e2", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

update public.profiles set conquest_unlocked = true
where id in ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000e2');

create function pg_temp.give(p_user uuid, p_definition uuid) returns uuid language sql as $$
  insert into public.card_instances (definition_id, owner_id, acquired_via) values (p_definition, p_user, 'pack')
  returning id
$$;

create function pg_temp.code(p_code text) returns uuid language sql as $$
  select id from public.card_definitions where code = p_code
$$;

create function pg_temp.starters(p_user uuid) returns uuid[] language sql as $$
  select array_agg(s.id order by s.acquired_at, s.id) from (
    select id, acquired_at from public.card_instances where owner_id = p_user and is_starter
  ) s
$$;

create function pg_temp.play(p_instance uuid, p_score integer) returns jsonb language sql as $$
  select jsonb_build_object('card_instance_id', p_instance,
    'definition_id', (select definition_id from public.card_instances where id = p_instance),
    'base', p_score, 'bonus', 0, 'score', p_score, 'highest', least(p_score, 10), 'auto_played', false)
$$;

-- Side A wins the first three rounds.
create function pg_temp.a_wins(p_match uuid) returns void language plpgsql as $$
declare
  v_a uuid[] := (select card_instance_ids from public.match_teams where match_id = p_match and side = 'a');
  v_b uuid[] := (select card_instance_ids from public.match_teams where match_id = p_match and side = 'b');
  v_pa uuid := (select player_a from public.matches where id = p_match);
  v_pb uuid := (select player_b from public.matches where id = p_match);
begin
  for i in 1..3 loop
    perform public.match_submit_play(v_pa, p_match, i, v_a[i]);
    perform public.match_submit_play(v_pb, p_match, i, v_b[i]);
    perform public.match_record_round(p_match, i, pg_temp.play(v_a[i], 20), pg_temp.play(v_b[i], 4), 'a',
      case when i = 3 then 'a' end);
  end loop;
end;
$$;

-- The summary as the previous collection_summary computed it, one
-- instance_in_active_match call per card.
create function pg_temp.summary_before(p_user uuid) returns jsonb language sql as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'definition_id', s.definition_id, 'copies', s.copies, 'starter_copies', s.starter_copies,
    'locked_copies', s.locked_copies,
    'convertible_copies', greatest(0, least(s.free_copies, s.base_copies - 1))
  ) order by s.definition_id), '[]'::jsonb)
  from (
    select
      i.definition_id,
      count(*)::integer as copies,
      (count(*) filter (where i.variant_id is null))::integer as base_copies,
      (count(*) filter (where i.is_starter))::integer as starter_copies,
      (count(*) filter (where i.locked_until > now()))::integer as locked_copies,
      (count(*) filter (
        where not i.is_starter and i.variant_id is null
          and (i.locked_until is null or i.locked_until <= now())
          and not public.instance_in_active_match(i.id)
      ))::integer as free_copies
    from public.card_instances i
    where i.owner_id = p_user
    group by i.definition_id
  ) s
$$;

create function pg_temp.summary(p_user uuid) returns jsonb language sql as $$
  select coalesce(jsonb_agg(to_jsonb(s) order by s.definition_id), '[]'::jsonb) from public.collection_summary(p_user) s
$$;

create function pg_temp.convertible(p_user uuid, p_definition uuid) returns integer language sql as $$
  select s.convertible_copies from public.collection_summary(p_user) s where s.definition_id = p_definition
$$;

do $$
declare
  v_threats uuid[];
begin
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;
  perform set_config('test.threats', v_threats::text, true);
end $$;

-- ---------------------------------------------------------------------------
-- Cards in use: fielded in a running match, then at stake in an open pick.
-- ---------------------------------------------------------------------------

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000e1';
  v_b uuid := '00000000-0000-4000-8000-0000000000e2';
  v_threats uuid[] := current_setting('test.threats')::uuid[];
  v_starters uuid[] := pg_temp.starters(v_a);
  -- A non-starter copy of A's first starter character: the only base copy that could be converted.
  v_twin_definition uuid := (select definition_id from public.card_instances where id = v_starters[1]);
  v_twin uuid := pg_temp.give(v_a, v_twin_definition);
  v_team_a uuid[];
  v_team_b uuid[];
  v_match uuid;
  v_failed boolean;
begin
  v_team_a := array[v_twin, pg_temp.give(v_a, pg_temp.code('P025')), pg_temp.give(v_a, pg_temp.code('P026'))]
    || v_starters[2:3];
  v_team_b := array[
    pg_temp.give(v_b, pg_temp.code('P028')), pg_temp.give(v_b, pg_temp.code('P029')), pg_temp.give(v_b, pg_temp.code('P057'))
  ] || (pg_temp.starters(v_b))[1:2];
  -- More copies, so that several characters have duplicates.
  perform pg_temp.give(v_a, pg_temp.code('P025'));
  perform pg_temp.give(v_a, pg_temp.code('P025'));
  perform pg_temp.give(v_a, pg_temp.code('P026'));

  assert pg_temp.summary(v_a) = pg_temp.summary_before(v_a), 'summary differs with no match';
  assert pg_temp.convertible(v_a, v_twin_definition) = 1, 'the copy beside the starter is convertible';
  assert not exists (select 1 from public.busy_instance_ids(v_a)), 'cards in use with no match';

  -- B is player A: B wins and picks among A's cards.
  v_match := public.create_pvp_match('conquest', v_b, v_team_b, v_a, v_team_a, v_threats);
  assert pg_temp.summary(v_a) = pg_temp.summary_before(v_a), 'summary differs during the match';
  assert pg_temp.convertible(v_a, v_twin_definition) = 0, 'a fielded copy is convertible';
  assert pg_temp.convertible(v_a, pg_temp.code('P025')) = 2, 'P025: three copies, one fielded';
  assert pg_temp.convertible(v_a, pg_temp.code('P026')) = 1, 'P026: two copies, one fielded';
  assert (select array_agg(b.instance_id order by b.instance_id) from public.busy_instance_ids(v_a) b)
       = (select array_agg(u.id order by u.id) from unnest(v_team_a) as u(id)), 'cards in use during the match';

  perform pg_temp.a_wins(v_match);
  assert (select resolved_at is null and loser_id = v_a from public.conquest_claims where match_id = v_match), 'no open pick';
  assert pg_temp.summary(v_a) = pg_temp.summary_before(v_a), 'summary differs during the pick';
  assert pg_temp.convertible(v_a, v_twin_definition) = 0, 'a copy at stake is convertible';
  assert pg_temp.summary(v_b) = pg_temp.summary_before(v_b), 'summary of the winner differs during the pick';

  v_failed := false;
  begin perform public.validate_team(v_a, v_team_a);
  exception when others then v_failed := sqlerrm = 'card_at_stake'; end;
  assert v_failed, 'a card at stake was fielded again';

  -- B takes P025: the copy beside the starter is free again.
  perform public.resolve_conquest_claim(v_match, v_team_a[2], false);
  assert pg_temp.summary(v_a) = pg_temp.summary_before(v_a), 'summary differs after the pick';
  assert pg_temp.summary(v_b) = pg_temp.summary_before(v_b), 'summary of the winner differs after the pick';
  assert pg_temp.convertible(v_a, v_twin_definition) = 1, 'the copy stayed in use after the pick';
  assert not exists (select 1 from public.busy_instance_ids(v_a)), 'cards in use after the pick';
end $$;

rollback;

select 'scaling: all assertions passed' as result;
