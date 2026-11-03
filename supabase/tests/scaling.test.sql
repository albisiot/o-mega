-- Integration test for the functions rewritten so that the game holds up with
-- many players: the cards in use read once per collection, the daily loss
-- count from an index, every duplicate converted at once, the matchmaking
-- lock taken only to pair. Service-only functions are called as the database
-- owner, as the Edge Function would with service_role. Runs inside a
-- rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'scale-a@example.test', '{"full_name": "Scala A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated', 'scale-b@example.test', '{"full_name": "Scala B"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000e3', 'authenticated', 'authenticated', 'scale-c@example.test', '{"full_name": "Scala C"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000e4', 'authenticated', 'authenticated', 'scale-d@example.test', '{"full_name": "Scala D"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e4", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e3", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e2", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

update public.profiles set conquest_unlocked = true
where id in ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000e2',
             '00000000-0000-4000-8000-0000000000e3', '00000000-0000-4000-8000-0000000000e4');

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

-- ---------------------------------------------------------------------------
-- Cards lost today: the game day's bounds instead of the day of every row.
-- ---------------------------------------------------------------------------

do $$
declare
  v_b uuid := '00000000-0000-4000-8000-0000000000e2';
  v_midnight timestamptz := timezone(public.config_text('time.daily_reset_time_zone'), public.game_day()::timestamp);
  v_cards uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_b order by acquired_at, id limit 5) s);
  v_before integer;
begin
  insert into public.card_transfers (instance_id, from_user, to_user, reason, created_at) values
    (v_cards[1], v_b, null, 'conquest', v_midnight - interval '1 microsecond'),
    (v_cards[2], v_b, null, 'conquest', v_midnight),
    (v_cards[3], v_b, null, 'conquest', now()),
    (v_cards[4], v_b, null, 'conversion', now()),
    (v_cards[5], v_b, null, 'conquest', v_midnight + interval '1 day');
  -- The previous definition.
  select count(*) into v_before from public.card_transfers
  where from_user = v_b and reason = 'conquest' and public.game_day(created_at) = public.game_day();
  assert v_before = 2, format('previous count %s', v_before);
  assert public.cards_lost_today(v_b) = v_before, format('cards lost today %s', public.cards_lost_today(v_b));
end $$;

-- ---------------------------------------------------------------------------
-- Converting every duplicate in one statement: the same copies, coins and
-- ledger rows as one conversion per character.
-- ---------------------------------------------------------------------------

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000e1';
  v_b uuid := '00000000-0000-4000-8000-0000000000e2';
  v_variant public.card_variants := (select v from public.card_variants v order by v.definition_id, v.style limit 1);
  v_p030 uuid := pg_temp.code('P030');
  v_fielded uuid;
  v_expected uuid[];
begin
  -- P030: five base copies of different ages, one locked, one fielded in a running match.
  for i in 1..5 loop
    v_fielded := pg_temp.give(v_a, v_p030);
    update public.card_instances set acquired_at = now() - make_interval(hours => i) where id = v_fielded;
  end loop;
  update public.card_instances set locked_until = now() + interval '1 day'
  where id = (select id from public.card_instances where owner_id = v_a and definition_id = v_p030
              order by acquired_at desc limit 1);
  v_fielded := (select id from public.card_instances where owner_id = v_a and definition_id = v_p030
                order by acquired_at limit 1);
  -- A character with a variant: two base copies and the variant.
  perform pg_temp.give(v_a, v_variant.definition_id);
  perform pg_temp.give(v_a, v_variant.definition_id);
  insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
  values (v_variant.definition_id, v_a, 'pack', v_variant.id);

  perform public.create_pvp_match('friendly', v_a, array[v_fielded] || (pg_temp.starters(v_a))[2:5],
    v_b, (pg_temp.starters(v_b))[1:5], current_setting('test.threats')::uuid[]);
  assert pg_temp.convertible(v_a, v_p030) = 3, format('P030 convertible %s', pg_temp.convertible(v_a, v_p030));

  -- What one conversion per character picked: the newest free base copies.
  select array_agg(c.id order by c.id) into v_expected
  from jsonb_array_elements(pg_temp.summary_before(v_a)) e
  cross join lateral (
    select i.id from public.card_instances i
    where i.owner_id = v_a and i.definition_id = (e ->> 'definition_id')::uuid
      and not i.is_starter and i.variant_id is null
      and (i.locked_until is null or i.locked_until <= now())
      and not public.instance_in_active_match(i.id)
    order by i.acquired_at desc, i.id
    limit (e ->> 'convertible_copies')::integer
  ) c;
  assert cardinality(v_expected) >= 6, format('only %s copies to convert', cardinality(v_expected));
  perform set_config('test.expected', v_expected::text, true);
  perform set_config('test.expected_coins', (
    select sum(r.duplicate_coin_value)::text
    from unnest(v_expected) as u(id)
    join public.card_instances i on i.id = u.id
    join public.card_definitions d on d.id = i.definition_id
    join public.rarity_definitions r on r.code = d.rarity_code
  ), true);
  perform set_config('test.balance', public.coin_balance(v_a)::text, true);
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);
-- One character at a time stays one character: no character, nothing converted.
do $$
begin
  perform public.convert_duplicates(null);
  raise exception 'ASSERT: converted with no character';
exception when raise_exception then
  if sqlerrm like 'ASSERT:%' then raise; end if;
  assert sqlerrm = 'nothing_to_convert', sqlerrm;
end $$;
select set_config('test.result', public.convert_all_duplicates()::text, true);
reset role;

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000e1';
  v_expected uuid[] := current_setting('test.expected')::uuid[];
  v_coins integer := current_setting('test.expected_coins')::integer;
  v_result jsonb := current_setting('test.result')::jsonb;
begin
  assert (v_result ->> 'converted')::integer = cardinality(v_expected), format('converted %s', v_result);
  assert (v_result ->> 'coins')::integer = v_coins, format('coins %s, expected %s', v_result ->> 'coins', v_coins);
  assert (v_result ->> 'coin_balance')::integer = current_setting('test.balance')::integer + v_coins, 'balance';
  assert (select array_agg(id order by id) from public.card_instances
          where id = any (v_expected) and owner_id is null and converted_at is not null) = v_expected, 'converted copies';
  assert (select array_agg(instance_id order by instance_id) from public.card_transfers
          where reason = 'conversion' and from_user = v_a and to_user is null) = v_expected, 'transfer rows';
  assert (select array_agg(ref_id order by ref_id) from public.coin_ledger
          where reason = 'duplicate_conversion' and user_id = v_a) = v_expected, 'ledger rows';
  assert (select sum(amount) from public.coin_ledger where reason = 'duplicate_conversion' and user_id = v_a) = v_coins,
    'ledger amounts';
  assert not exists (select 1 from public.collection_summary(v_a) where convertible_copies > 0), 'duplicates left';
  -- The locked, fielded, starter and variant copies stay.
  assert (select count(*) from public.card_instances where owner_id = v_a and definition_id = pg_temp.code('P030')) = 2,
    'P030 copies left';
end $$;

-- ---------------------------------------------------------------------------
-- Matchmaking: the lock only to pair, the Conquest bot in the same call.
-- ---------------------------------------------------------------------------

-- Whether this transaction holds the matchmaking lock (a null pid: a single-user server).
create function pg_temp.holds_lock() returns boolean language sql as $$
  select exists (
    select 1 from pg_locks
    where locktype = 'advisory' and (pid = pg_backend_pid() or pid is null)
      and classid = ((hashtext('o-mega.matchmaking')::bigint >> 32) & 4294967295)::oid
      and objid = (hashtext('o-mega.matchmaking')::bigint & 4294967295)::oid
  )
$$;

do $$
declare
  v_c uuid := '00000000-0000-4000-8000-0000000000e3';
  v_d uuid := '00000000-0000-4000-8000-0000000000e4';
  v_threats uuid[] := current_setting('test.threats')::uuid[];
  v_bot uuid[] := (select array_agg(s.id) from (
    select id from public.card_definitions where is_active and rarity_code = 'delta' order by code limit 5) s);
  v_waited timestamptz := now() - make_interval(secs => public.config_int('matchmaking.conquest_bot_after_seconds') + 1);
  v_team_c uuid[];
  v_team_d uuid[];
  v_match uuid;
begin
  assert not pg_temp.holds_lock(), 'lock held before the queue';

  -- Friendly: joining and refreshing with nobody waiting never takes the lock.
  assert public.match_queue_join(v_c, 'friendly', (pg_temp.starters(v_c))[1:5], v_threats) is null, 'nobody was waiting';
  assert public.match_queue_join(v_c, 'friendly', (pg_temp.starters(v_c))[1:5], v_threats) is null, 'refresh';
  assert not pg_temp.holds_lock(), 'a refresh took the lock';
  v_match := public.match_queue_join(v_d, 'friendly', (pg_temp.starters(v_d))[1:5], v_threats);
  assert (select player_a = v_c and player_b = v_d and mode = 'friendly' from public.matches where id = v_match), 'pairing';
  assert pg_temp.holds_lock(), 'paired without the lock';
  perform public.finish_match(v_match, 'draw', 'forfeit');

  -- Conquest: before the wait, no bot; after it, the same call starts one.
  v_team_c := array[pg_temp.give(v_c, pg_temp.code('P025')), pg_temp.give(v_c, pg_temp.code('P026')),
                    pg_temp.give(v_c, pg_temp.code('P027'))] || (pg_temp.starters(v_c))[1:2];
  v_team_d := array[pg_temp.give(v_d, pg_temp.code('P025')), pg_temp.give(v_d, pg_temp.code('P026')),
                    pg_temp.give(v_d, pg_temp.code('P027'))] || (pg_temp.starters(v_d))[1:2];
  assert public.match_queue_join(v_c, 'conquest', v_team_c, v_threats, 'hard', v_bot) is null, 'a bot before the wait';
  update public.matchmaking_queue set enqueued_at = v_waited where user_id = v_c;
  assert public.match_queue_join(v_c, 'conquest', v_team_c, v_threats) is null, 'a bot without its description';
  assert (select enqueued_at = v_waited from public.matchmaking_queue where user_id = v_c), 'the wait restarted';
  v_match := public.match_queue_join(v_c, 'conquest', v_team_c, v_threats, 'hard', v_bot);
  assert (select mode = 'conquest' and bot_difficulty = 'hard' and player_a = v_c and player_b is null
          from public.matches where id = v_match), 'no bot after the wait';
  assert (select card_instance_ids = v_team_c and definition_ids = (select array_agg(i.definition_id order by u.ord)
            from unnest(v_team_c) with ordinality as u(id, ord) join public.card_instances i on i.id = u.id)
          from public.match_teams where match_id = v_match and side = 'a'), 'team of the bot match';
  assert (select definition_ids = v_bot from public.match_teams where match_id = v_match and side = 'b'), 'bot team';
  assert not exists (select 1 from public.matchmaking_queue where user_id = v_c), 'still queued';
  perform public.finish_match(v_match, 'draw', 'forfeit');

  -- A friendly wait never turns into a Conquest bot.
  assert public.match_queue_join(v_c, 'friendly', (pg_temp.starters(v_c))[1:5], v_threats, 'hard', v_bot) is null,
    'friendly queue';
  update public.matchmaking_queue set enqueued_at = v_waited where user_id = v_c;
  assert public.match_queue_join(v_c, 'friendly', (pg_temp.starters(v_c))[1:5], v_threats, 'hard', v_bot) is null,
    'a bot from the friendly queue';

  -- A player waiting comes before the bot, even once the wait is over.
  assert public.match_queue_join(v_c, 'conquest', v_team_c, v_threats, 'hard', v_bot) is null, 'back in the queue';
  update public.matchmaking_queue set enqueued_at = v_waited where user_id = v_c;
  insert into public.matchmaking_queue (user_id, mode, card_instance_ids, level, team_value)
  values (v_d, 'conquest', v_team_d, 1, public.team_value(
    (select array_agg(i.definition_id) from public.card_instances i where i.id = any (v_team_d))));
  v_match := public.match_queue_join(v_c, 'conquest', v_team_c, v_threats, 'hard', v_bot);
  assert (select mode = 'conquest' and bot_difficulty is null and player_a = v_d and player_b = v_c
          from public.matches where id = v_match), 'the bot came before a waiting player';

  -- Playing already: the client is told so, before and under the lock.
  begin
    perform public.match_queue_join(v_c, 'conquest', v_team_c, v_threats, 'hard', v_bot);
    raise exception 'ASSERT: queued while playing';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'match_already_active', sqlerrm;
  end;
  perform set_config('test.pvp', v_match::text, true);
  -- D was last seen 15 seconds ago.
  update public.match_teams set last_seen_at = now() - interval '15 seconds' where match_id = v_match and side = 'a';
end $$;

-- ---------------------------------------------------------------------------
-- The ping of a match between players: presence, and what the full state
-- would show about the changes a client must not miss.
-- ---------------------------------------------------------------------------

-- The ping's view of the state, from the full payload of the same side.
create function pg_temp.ping_from_payload(p_match uuid, p_side text) returns jsonb language sql as $$
  select jsonb_build_object(
    'status', s ->> 'status',
    'current_round', (s ->> 'current_round')::integer,
    'opponent_has_chosen', coalesce((
      select (r ->> 'opponent_has_chosen')::boolean from jsonb_array_elements(s -> 'rounds') r
      where (r ->> 'round')::integer = (s ->> 'current_round')::integer
    ), false),
    'conquest_settled', case when s -> 'conquest' = 'null'::jsonb then null
                             else ((s -> 'conquest' ->> 'resolved')::boolean
                                   or (s -> 'conquest' ->> 'deadline_at')::timestamptz < now()) end,
    'opponent_last_seen_at', (s -> 'opponent' ->> 'last_seen_at')::timestamptz
  )
  from (select public.match_state_payload(p_match, p_side) as s) x
$$;

create function pg_temp.ping_as(p_user uuid) returns jsonb language plpgsql as $$
declare
  v_ping jsonb;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v_ping := public.match_ping(current_setting('test.pvp')::uuid);
  reset role;
  return v_ping;
end;
$$;

do $$
declare
  v_c uuid := '00000000-0000-4000-8000-0000000000e3';
  v_d uuid := '00000000-0000-4000-8000-0000000000e4';
  v_match uuid := current_setting('test.pvp')::uuid;
  v_ping jsonb;
  v_failed boolean;
begin
  -- C is side b: the ping marks C present and tells when D was last seen.
  update public.match_teams set last_seen_at = null where match_id = v_match and side = 'b';
  v_ping := pg_temp.ping_as(v_c);
  assert (select last_seen_at = now() from public.match_teams where match_id = v_match and side = 'b'), 'C not marked present';
  assert (v_ping ->> 'opponent_last_seen_at')::timestamptz = now() - interval '15 seconds', format('D last seen %s', v_ping);
  assert (v_ping - 'server_now') = pg_temp.ping_from_payload(v_match, 'b'), format('ping %s', v_ping);
  assert v_ping ->> 'status' = 'active' and (v_ping ->> 'current_round')::integer = 1
    and not (v_ping ->> 'opponent_has_chosen')::boolean and v_ping -> 'conquest_settled' = 'null'::jsonb, 'fresh match';

  -- D chooses: C learns that D has chosen, never what.
  perform public.match_submit_play(v_d, v_match, 1,
    (select card_instance_ids[1] from public.match_teams where match_id = v_match and side = 'a'));
  v_ping := pg_temp.ping_as(v_c);
  assert (v_ping ->> 'opponent_has_chosen')::boolean, 'the choice of D is missing';
  assert not (v_ping ? 'opponent_play') and (v_ping - 'server_now') = pg_temp.ping_from_payload(v_match, 'b'),
    format('ping after the choice %s', v_ping);
  -- D's own ping: C has not chosen.
  v_ping := pg_temp.ping_as(v_d);
  assert not (v_ping ->> 'opponent_has_chosen')::boolean, 'C has not chosen';
  assert (v_ping - 'server_now') = pg_temp.ping_from_payload(v_match, 'a'), format('ping of D %s', v_ping);

  -- Someone else's match.
  v_failed := false;
  begin perform pg_temp.ping_as('00000000-0000-4000-8000-0000000000e1');
  exception when others then v_failed := sqlerrm = 'match_not_found'; end;
  reset role;
  assert v_failed, 'a ping from outside the match';

  -- D wins: the match is over, the pick open. A ping no longer marks presence.
  perform public.finish_match(v_match, 'a', 'completed');
  update public.match_teams set last_seen_at = now() - interval '1 minute' where match_id = v_match and side = 'b';
  v_ping := pg_temp.ping_as(v_c);
  assert v_ping ->> 'status' = 'finished' and not (v_ping ->> 'conquest_settled')::boolean, format('pick open %s', v_ping);
  assert (v_ping - 'server_now') = pg_temp.ping_from_payload(v_match, 'b'), format('ping during the pick %s', v_ping);
  assert (select last_seen_at < now() from public.match_teams where match_id = v_match and side = 'b'),
    'presence marked after the end';

  -- Once the pick's time is up, the ping says so before anyone settles it.
  update public.conquest_claims set deadline_at = now() - interval '1 second' where match_id = v_match;
  v_ping := pg_temp.ping_as(v_c);
  assert (v_ping ->> 'conquest_settled')::boolean, 'the expired pick looks open';
  assert not (public.match_state_payload(v_match, 'b') -> 'conquest' ->> 'resolved')::boolean, 'settled by the ping';
end $$;

rollback;

select 'scaling: all assertions passed' as result;
