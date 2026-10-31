-- Integration test for M8 (Conquest entry rules, pick, transfer, coins, XP).
-- Service-only functions are called as the database owner, as the Edge
-- Function would with service_role. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'cq-a@example.test', '{"full_name": "Conquista A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'cq-b@example.test', '{"full_name": "Conquista B"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000c3', 'authenticated', 'authenticated', 'cq-c@example.test', '{"full_name": "Conquista C"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000c3", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- Helpers: a team of given rarity (non-starter) plus starters, and a whole match won by one side.
create function pg_temp.give(p_user uuid, p_code text) returns uuid language sql as $$
  insert into public.card_instances (definition_id, owner_id, acquired_via)
  select id, p_user, 'pack' from public.card_definitions where code = p_code
  returning id
$$;

create function pg_temp.starters(p_user uuid, p_count integer) returns uuid[] language sql as $$
  select array_agg(s.id) from (
    select id from public.card_instances where owner_id = p_user and is_starter order by acquired_at, id limit p_count
  ) s
$$;

create function pg_temp.play(p_instance uuid, p_score integer) returns jsonb language sql as $$
  select jsonb_build_object('card_instance_id', p_instance,
    'definition_id', (select definition_id from public.card_instances where id = p_instance),
    'base', p_score, 'bonus', 0, 'score', p_score, 'highest', least(p_score, 10), 'auto_played', false)
$$;

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

-- Entry rules.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000a1';
  v_b uuid := '00000000-0000-4000-8000-0000000000b2';
  v_threats uuid[] := current_setting('test.threats')::uuid[];
  -- A: 3 Gamma + 2 starters, so the rarity limit is Gamma (value 8).
  v_team_a uuid[];
  -- B: 2 Gamma, 1 Omega + 2 starters: the Omega stays out of reach (value 11).
  v_team_b uuid[];
  v_only_starters uuid[] := pg_temp.starters(v_a, 5);
  v_locked uuid;
begin
  -- Characters different from the starters of each player.
  v_team_a := array[
    pg_temp.give(v_a, 'P025'), pg_temp.give(v_a, 'P026'), pg_temp.give(v_a, 'P027')
  ] || pg_temp.starters(v_a, 2);
  v_team_b := array[
    pg_temp.give(v_b, 'P028'), pg_temp.give(v_b, 'P029'), pg_temp.give(v_b, 'P057')
  ] || pg_temp.starters(v_b, 2);
  perform set_config('test.team_a', v_team_a::text, true);
  perform set_config('test.team_b', v_team_b::text, true);

  begin
    perform public.match_queue_join(v_a, 'conquest', v_team_a, v_threats);
    raise exception 'ASSERT: entered Conquest while locked';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'conquest_locked', sqlerrm;
  end;

  update public.profiles set conquest_unlocked = true where id in (v_a, v_b);

  begin
    perform public.match_queue_join(v_a, 'conquest', v_only_starters, v_threats);
    raise exception 'ASSERT: a team of starters entered Conquest';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'not_enough_conquerable', sqlerrm;
  end;

  v_locked := pg_temp.give(v_a, 'P030');
  update public.card_instances set locked_until = now() + interval '1 day' where id = v_locked;
  begin
    perform public.match_queue_join(v_a, 'conquest', array[v_locked] || v_team_a[2:5], v_threats);
    raise exception 'ASSERT: a locked card entered Conquest';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'card_locked', sqlerrm;
  end;

  -- A friendly queue does not mix with Conquest; a match needs the same mode.
  assert public.match_queue_join(v_a, 'conquest', v_team_a, v_threats) is null, 'nobody was waiting';
  assert (select mode from public.matchmaking_queue where user_id = v_a) = 'conquest', 'queue mode';
  assert public.match_queue_join(v_b, 'friendly', pg_temp.starters(v_b, 5), v_threats) is null, 'modes mixed';
  delete from public.matchmaking_queue where user_id = v_b;

  -- Team values 7 apart: outside the normal range of 4, so no pairing yet.
  update public.matchmaking_queue set team_value = 18 where user_id = v_a;
  assert public.match_queue_join(v_b, 'conquest', v_team_b, v_threats) is null, 'paired despite the team value';
  -- After the wait the wider range of 8 applies.
  update public.matchmaking_queue set enqueued_at = now() - interval '1 minute' where user_id = v_a;
  perform set_config('test.match', public.match_queue_join(v_b, 'conquest', v_team_b, v_threats)::text, true);
  assert current_setting('test.match') <> '', 'not paired after the wider range';
  assert (select mode = 'conquest' and player_a = v_a and player_b = v_b from public.matches
          where id = current_setting('test.match')::uuid), 'wrong Conquest match';

  -- The cards in play cannot be converted while the match runs.
  assert (select convertible_copies from public.collection_summary(v_a) s
          where s.definition_id = (select definition_id from public.card_instances where id = v_team_a[1])) = 0,
    'a fielded card is convertible';
end $$;

-- A wins: limit is the rarest card of A (Gamma), so the Omega is out of reach.
do $$
declare
  v_match uuid := current_setting('test.match')::uuid;
  v_b uuid := '00000000-0000-4000-8000-0000000000b2';
  v_team_b uuid[] := current_setting('test.team_b')::uuid[];
begin
  perform pg_temp.a_wins(v_match);
  assert (select reward_coins_a = 0 and reward_coins_b = 10 from public.matches where id = v_match),
    'only the loser earns coins';
  assert (select cardinality(eligible_instance_ids) = 2 from public.conquest_claims where match_id = v_match),
    'eligible cards should be the 2 within the rank limit';
  assert not exists (
    select 1 from public.conquest_claims
    where match_id = v_match and (v_team_b[3] = any (eligible_instance_ids) or v_team_b[4] = any (eligible_instance_ids))
  ), 'an Omega or starter card is eligible';
  assert (select owner_id from public.card_instances where id = v_team_b[1]) = v_b, 'moved before the pick';

  -- An open pick keeps the eligible cards out of play.
  begin
    perform public.validate_team(v_b, v_team_b);
    raise exception 'ASSERT: a card at stake was fielded';
  exception when invalid_parameter_value then
    assert sqlerrm = 'card_at_stake', sqlerrm;
  end;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);

-- The loser sees neither the options nor can pick.
do $$
declare
  v_state jsonb := public.get_match_state(current_setting('test.match')::uuid);
begin
  assert v_state -> 'conquest' ->> 'role' = 'loser', 'B should be the loser';
  assert v_state -> 'conquest' -> 'offered' = 'null'::jsonb, 'the loser sees the options';
  begin
    perform public.claim_conquest_card(current_setting('test.match')::uuid, (current_setting('test.team_b')::uuid[])[1]);
    raise exception 'ASSERT: the loser picked a card';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'card_not_eligible', sqlerrm;
  end;
end $$;

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);

-- The winner sees the whole team and picks an eligible card, never another one.
do $$
declare
  v_match uuid := current_setting('test.match')::uuid;
  v_team_b uuid[] := current_setting('test.team_b')::uuid[];
  v_state jsonb := public.get_match_state(v_match);
begin
  assert v_state -> 'conquest' ->> 'role' = 'winner', 'A should be the winner';
  assert jsonb_array_length(v_state -> 'conquest' -> 'offered') = 5, 'the winner sees the 5 cards';
  begin
    perform public.claim_conquest_card(v_match, v_team_b[3]);
    raise exception 'ASSERT: picked the Omega above the limit';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'card_not_eligible', sqlerrm;
  end;
  v_state := public.claim_conquest_card(v_match, v_team_b[1]);
  assert v_state -> 'conquest' ->> 'resolved' = 'true', 'pick not resolved';
  assert v_state -> 'conquest' -> 'chosen' ->> 'code' = 'P028', 'wrong card chosen';
  assert v_state -> 'conquest' -> 'offered' = 'null'::jsonb, 'options still shown after the pick';
end $$;

reset role;

do $$
declare
  v_match uuid := current_setting('test.match')::uuid;
  v_a uuid := '00000000-0000-4000-8000-0000000000a1';
  v_b uuid := '00000000-0000-4000-8000-0000000000b2';
  v_card uuid := (current_setting('test.team_b')::uuid[])[1];
begin
  assert (select owner_id = v_a and acquired_via = 'conquest' and locked_until > now() + interval '47 hours'
          from public.card_instances where id = v_card), 'card not transferred and locked';
  assert exists (select 1 from public.card_transfers
                 where instance_id = v_card and from_user = v_b and to_user = v_a and reason = 'conquest' and match_id = v_match),
    'transfer ledger';
  assert (select cards_conquered = 1 and xp = 30 from public.profiles where id = v_a), 'winner statistics and XP';
  assert (select cards_lost = 1 and xp = 10 from public.profiles where id = v_b), 'loser statistics and XP';
  assert public.cards_lost_today(v_b) = 1, 'cards lost today';

  -- The same pair cannot meet again in Conquest for 24 hours.
  assert public.conquest_pair_on_cooldown(v_a, v_b), 'cooldown missing';
end $$;

-- Expired pick: the server assigns an eligible card. Forfeit: the leaver loses
-- the card and earns nothing. Winner with a low limit: bonus coins instead.
do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000a1';
  v_c uuid := '00000000-0000-4000-8000-0000000000c3';
  v_threats uuid[] := current_setting('test.threats')::uuid[];
  v_team_c uuid[];
  v_team_a uuid[];
  v_match uuid;
begin
  update public.profiles set conquest_unlocked = true where id = v_c;
  v_team_c := array[pg_temp.give(v_c, 'P031'), pg_temp.give(v_c, 'P032'), pg_temp.give(v_c, 'P033')] || pg_temp.starters(v_c, 2);
  v_team_a := array[pg_temp.give(v_a, 'P034'), pg_temp.give(v_a, 'P035'), pg_temp.give(v_a, 'P036')] || pg_temp.starters(v_a, 2);

  v_match := public.create_pvp_match('conquest', v_a, v_team_a, v_c, v_team_c, v_threats);
  perform public.finish_match(v_match, 'a', 'forfeit');
  assert (select reward_coins_b = 0 from public.matches where id = v_match), 'the leaver earned coins';
  assert (select xp = 0 from public.profiles where id = v_c), 'the leaver earned XP';
  update public.conquest_claims set deadline_at = now() - interval '1 second' where match_id = v_match;
  perform public.settle_expired_claims(v_c);
  assert (select resolved_at is not null and auto_assigned and chosen_instance_id = any (eligible_instance_ids)
          from public.conquest_claims where match_id = v_match), 'expired pick not assigned';

  -- Daily limit: reaching the configured losses blocks Conquest until the reset.
  -- C already lost the assigned card. A fresh team, since that card now belongs to A.
  v_team_c := array[pg_temp.give(v_c, 'P037'), pg_temp.give(v_c, 'P038'), pg_temp.give(v_c, 'P039')] || pg_temp.starters(v_c, 2);
  insert into public.card_transfers (instance_id, from_user, to_user, reason)
  select v_team_c[1], v_c, v_a, 'conquest'
  from generate_series(2, public.config_int('conquest.max_cards_lost_per_day'));
  begin
    perform public.validate_conquest_team(v_c, v_team_c);
    raise exception 'ASSERT: entered Conquest over the daily limit';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'daily_loss_limit', sqlerrm;
  end;
end $$;

do $$
declare
  v_b uuid := '00000000-0000-4000-8000-0000000000b2';
  v_c uuid := '00000000-0000-4000-8000-0000000000c3';
  v_team_b uuid[];
  v_team_c uuid[];
  v_match uuid;
begin
  -- C (only Delta) beats B who fields only cards above that limit: bonus for C.
  delete from public.card_transfers where from_user = v_c and reason = 'conquest';
  v_team_c := array[pg_temp.give(v_c, 'P001'), pg_temp.give(v_c, 'P002'), pg_temp.give(v_c, 'P003')]
              || pg_temp.starters(v_c, 2);
  v_team_b := array[pg_temp.give(v_b, 'P058'), pg_temp.give(v_b, 'P059'), pg_temp.give(v_b, 'P060')] || pg_temp.starters(v_b, 2);
  begin
    v_match := public.create_pvp_match('conquest', v_c, v_team_c, v_b, v_team_b, current_setting('test.threats')::uuid[]);
  exception when invalid_parameter_value then
    -- A starter holds one of P001-P003: pick other Delta characters not owned as starters.
    v_team_c := (
      select array_agg(pg_temp.give(v_c, d.code)) from (
        select code from public.card_definitions d
        where d.rarity_code = 'delta'
          and not exists (select 1 from public.card_instances i where i.owner_id = v_c and i.definition_id = d.id)
        order by code limit 3
      ) d
    ) || pg_temp.starters(v_c, 2);
    v_match := public.create_pvp_match('conquest', v_c, v_team_c, v_b, v_team_b, current_setting('test.threats')::uuid[]);
  end;
  perform public.finish_match(v_match, 'a', 'completed');
  assert (select bonus_coins = 50 and resolved_at is not null from public.conquest_claims where match_id = v_match),
    'no bonus when no card is eligible';
  assert (select sum(amount) from public.coin_ledger where user_id = v_c and reason = 'conquest_bonus') = 50, 'bonus ledger';

  -- Draw: no pick, the loser's coins to both. Past the cooldown of this pair.
  update public.matches set created_at = now() - interval '2 days' where id = v_match;
  v_match := public.create_pvp_match('conquest', v_c, v_team_c, v_b, v_team_b, current_setting('test.threats')::uuid[]);
  perform public.finish_match(v_match, 'draw', 'completed');
  assert not exists (select 1 from public.conquest_claims where match_id = v_match), 'a draw opened a pick';
  assert (select reward_coins_a = 10 and reward_coins_b = 10 from public.matches where id = v_match), 'draw coins';
end $$;

-- XP and levels.
do $$
begin
  assert public.level_for_xp(0) = 1 and public.level_for_xp(99) = 1, 'level 1';
  assert public.level_for_xp(100) = 2 and public.level_for_xp(299) = 2, 'level 2';
  assert public.level_for_xp(300) = 3 and public.level_for_xp(600) = 4, 'levels 3 and 4';
end $$;

-- The unlock: 5 completed matches; abandoned ones do not count.
do $$
declare
  v_id uuid := '00000000-0000-4000-8000-0000000000d4';
  v_team uuid[];
  v_match uuid;
begin
  insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (v_id, 'authenticated', 'authenticated', 'cq-d@example.test', '{"full_name": "Conquista D"}', now(), now());
  insert into public.profiles (id, username) values (v_id, 'Conquista_D');
  perform public.grant_starter_set(v_id);
  v_team := pg_temp.starters(v_id, 5);

  for i in 1..5 loop
    v_match := public.match_create_bot(v_id, 'easy', v_team, (select array_agg(id) from (select id from public.card_definitions order by code limit 5) s),
      current_setting('test.threats')::uuid[]);
    perform public.finish_match(v_match, 'b', 'forfeit');
  end loop;
  assert not (select conquest_unlocked from public.profiles where id = v_id), 'abandoned matches unlocked Conquest';

  for i in 1..5 loop
    v_match := public.match_create_bot(v_id, 'easy', v_team, (select array_agg(id) from (select id from public.card_definitions order by code limit 5) s),
      current_setting('test.threats')::uuid[]);
    perform public.finish_match(v_match, 'b', 'completed');
  end loop;
  assert (select conquest_unlocked and level = 1 from public.profiles where id = v_id), 'completed matches should unlock Conquest';
end $$;

-- Friend codes stay friendly, and internals are not exposed to clients.
set local role authenticated;

do $$
declare
  v_code text := (public.create_lobby(pg_temp.starters('00000000-0000-4000-8000-0000000000a1', 5)) ->> 'code');
begin
  assert (select mode from public.match_lobbies where code = v_code) = 'friendly', 'a lobby is not friendly';
  begin
    perform 1 from public.conquest_claims;
    raise exception 'ASSERT: a client read the picks';
  exception when insufficient_privilege then null;
  end;
  assert public.get_conquest_status() ? 'unlocked', 'conquest status';
  assert jsonb_array_length(public.get_conquest_history()) >= 1, 'conquest history';
end $$;

rollback;

select 'conquest: all assertions passed' as result;
