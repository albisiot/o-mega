-- Conquest against a random bot after a long wait in the queue. Cards are at
-- stake as usual, but a bot owns none: a card won from it is a new copy, and a
-- card it takes leaves the game. Both stay on the card_transfers ledger, with
-- a null user on the bot's side. A match is against a bot when bot_difficulty
-- is set, whatever its mode.

insert into public.game_config (key, value, description) values
  ('matchmaking.conquest_bot_after_seconds', '60', 'Wait in the Conquest queue before a bot becomes the opponent');

alter table public.matches drop constraint matches_bot_shape;
alter table public.matches drop constraint matches_bot_has_no_player_b;
alter table public.matches drop constraint matches_pvp_has_player_b;
alter table public.matches add constraint matches_bot_shape check (
  (mode = 'bot' and bot_difficulty is not null)
  or (mode = 'conquest')
  or (mode = 'friendly' and bot_difficulty is null)
);
alter table public.matches add constraint matches_one_opponent check ((bot_difficulty is null) = (player_b is not null));

-- Cards with no owner: converted, taken by a bot, or a bot's copy still on offer.
alter table public.card_instances add column out_of_play_at timestamptz;
alter table public.card_instances drop constraint card_instances_owner_or_converted;
alter table public.card_instances add constraint card_instances_owner_or_converted
  check ((owner_id is null) = (converted_at is not null or out_of_play_at is not null));

-- Null: the bot.
alter table public.conquest_claims alter column winner_id drop not null;
alter table public.conquest_claims alter column loser_id drop not null;

-- ---------------------------------------------------------------------------
-- Starting the match
-- ---------------------------------------------------------------------------

-- Turns a queue entry that waited long enough into a match. Returns null while
-- it has not: the wait and the team come from the queue, never from the caller.
create function public.match_create_conquest_bot(
  p_user uuid,
  p_difficulty text,
  p_bot_definition_ids uuid[],
  p_threat_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_size integer := public.config_int('match.team_size');
  v_threats integer := public.config_int('match.threats_per_match');
  v_entry public.matchmaking_queue;
  v_definitions uuid[];
  v_levels integer[];
  v_match uuid;
begin
  perform pg_advisory_xact_lock(hashtext('o-mega.matchmaking'));

  select * into v_entry from public.matchmaking_queue
  where user_id = p_user and mode = 'conquest'
    and enqueued_at <= now() - make_interval(secs => public.config_int('matchmaking.conquest_bot_after_seconds'));
  if v_entry.user_id is null then
    return null;
  end if;

  v_definitions := public.validate_conquest_team(p_user, v_entry.card_instance_ids);
  if public.has_active_match(p_user) then
    raise exception 'match_already_active';
  end if;

  if coalesce(cardinality(p_bot_definition_ids), 0) <> v_team_size
     or (select count(distinct d.id) from unnest(p_bot_definition_ids) as d(id)
         join public.card_definitions c on c.id = d.id and c.is_active) <> v_team_size then
    raise exception 'invalid_bot_team';
  end if;

  select array_agg(t.level order by u.ord) into v_levels
  from unnest(p_threat_ids) with ordinality as u(id, ord)
  join public.threat_definitions t on t.id = u.id and t.is_active;
  if coalesce(cardinality(v_levels), 0) <> v_threats
     or (select count(distinct u.id) from unnest(p_threat_ids) as u(id)) <> v_threats then
    raise exception 'invalid_threats';
  end if;

  insert into public.matches (mode, bot_difficulty, player_a, threat_ids, threat_levels)
  values ('conquest', p_difficulty, p_user, p_threat_ids, v_levels)
  returning id into v_match;

  insert into public.match_teams (match_id, side, user_id, card_instance_ids, definition_ids) values
    (v_match, 'a', p_user, v_entry.card_instance_ids, v_definitions),
    (v_match, 'b', null, null, p_bot_definition_ids);

  insert into public.match_rounds (match_id, round, threat_id, deadline_at)
  values (
    v_match, 1, p_threat_ids[1],
    now() + make_interval(secs => public.config_int('match.reveal_pause_seconds')
                                  + public.config_int('match.round_timer_seconds'))
  );

  delete from public.match_lobbies where host_id = p_user;
  delete from public.matchmaking_queue where user_id = p_user;
  perform public.notify_player(p_user, 'match_started', v_match);
  return v_match;
end;
$$;

revoke execute on function public.match_create_conquest_bot(uuid, text, uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public.match_create_conquest_bot(uuid, text, uuid[], uuid[]) to service_role;

-- ---------------------------------------------------------------------------
-- Settling the pick
-- ---------------------------------------------------------------------------

-- Same as before, with the bot on either side of the transfer.
create or replace function public.resolve_conquest_claim(p_match_id uuid, p_instance_id uuid, p_auto boolean)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_claim public.conquest_claims;
begin
  select * into v_claim from public.conquest_claims where match_id = p_match_id for update;
  if v_claim.match_id is null or v_claim.resolved_at is not null then
    return;
  end if;
  if not (p_instance_id = any (v_claim.eligible_instance_ids)) then
    raise exception 'card_not_eligible';
  end if;

  update public.card_instances
  set owner_id = v_claim.winner_id,
      acquired_via = case when v_claim.winner_id is null then acquired_via else 'conquest' end,
      acquired_at = case when v_claim.winner_id is null then acquired_at else now() end,
      locked_until = case when v_claim.winner_id is null then locked_until
                          else now() + make_interval(hours => public.config_int('conquest.conquered_card_lock_hours')) end,
      out_of_play_at = case when v_claim.winner_id is null then now() end
  where id = p_instance_id and owner_id is not distinct from v_claim.loser_id;
  if not found then
    raise exception 'card_not_eligible';
  end if;

  insert into public.card_transfers (instance_id, from_user, to_user, reason, match_id)
  values (p_instance_id, v_claim.loser_id, v_claim.winner_id, 'conquest', p_match_id);

  update public.profiles set cards_conquered = cards_conquered + 1, updated_at = now() where id = v_claim.winner_id;
  update public.profiles set cards_lost = cards_lost + 1, updated_at = now() where id = v_claim.loser_id;

  update public.conquest_claims
  set chosen_instance_id = p_instance_id, auto_assigned = p_auto, resolved_at = now()
  where match_id = p_match_id;

  -- The copies of the bot's team that were not picked never existed.
  if v_claim.loser_id is null then
    delete from public.card_instances i
    using public.match_teams t
    where t.match_id = p_match_id and t.user_id is null
      and i.id = any (t.card_instance_ids) and i.id <> p_instance_id and i.owner_id is null;
  end if;

  perform public.notify_match(p_match_id, 'conquest');
end;
$$;

-- Same as before. A beaten bot puts copies of its team on offer; a winning bot
-- picks at once, at random among the cards its rarity limit allows.
create or replace function public.open_conquest_claim(p_match_id uuid, p_winner_side text)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_winner public.match_teams;
  v_loser public.match_teams;
  v_limit integer;
  v_eligible uuid[];
  v_bonus integer;
  v_definition uuid;
  v_copy uuid;
  v_copies uuid[] := '{}';
begin
  select * into v_winner from public.match_teams where match_id = p_match_id and side = p_winner_side;
  select * into v_loser from public.match_teams where match_id = p_match_id and side <> p_winner_side;

  if v_loser.user_id is null then
    foreach v_definition in array v_loser.definition_ids loop
      insert into public.card_instances (definition_id, owner_id, acquired_via, out_of_play_at)
      values (v_definition, null, 'conquest', now())
      returning id into v_copy;
      v_copies := v_copies || v_copy;
    end loop;
    update public.match_teams set card_instance_ids = v_copies where match_id = p_match_id and side = v_loser.side;
    v_loser.card_instance_ids := v_copies;
  end if;

  -- Rank limit: up to the rarest card of the winner's team (SPEC §6.2).
  select max(r.rank) into v_limit
  from unnest(v_winner.definition_ids) as u(id)
  join public.card_definitions d on d.id = u.id
  join public.rarity_definitions r on r.code = d.rarity_code;

  select coalesce(array_agg(i.id), '{}') into v_eligible
  from public.card_instances i
  join public.card_definitions d on d.id = i.definition_id
  join public.rarity_definitions r on r.code = d.rarity_code
  where i.id = any (v_loser.card_instance_ids) and not i.is_starter and r.rank <= v_limit;

  if cardinality(v_eligible) = 0 then
    if v_loser.user_id is null then
      delete from public.card_instances where id = any (v_copies);
      update public.match_teams set card_instance_ids = null where match_id = p_match_id and side = v_loser.side;
    end if;
    -- A winning bot has no use for the bonus.
    v_bonus := case when v_winner.user_id is null then 0 else public.config_int('conquest.no_card_bonus_coins') end;
    insert into public.conquest_claims (match_id, winner_id, loser_id, deadline_at, bonus_coins, resolved_at)
    values (p_match_id, v_winner.user_id, v_loser.user_id, now(), v_bonus, now());
    if v_bonus > 0 then
      insert into public.coin_ledger (user_id, amount, reason, ref_id)
      values (v_winner.user_id, v_bonus, 'conquest_bonus', p_match_id);
    end if;
  elsif v_winner.user_id is null then
    insert into public.conquest_claims (match_id, winner_id, loser_id, eligible_instance_ids, deadline_at)
    values (p_match_id, null, v_loser.user_id, v_eligible, now());
    perform public.resolve_conquest_claim(
      p_match_id,
      (select u.id from unnest(v_eligible) as u(id) order by random() limit 1),
      false
    );
  else
    insert into public.conquest_claims (match_id, winner_id, loser_id, eligible_instance_ids, deadline_at)
    values (
      p_match_id, v_winner.user_id, v_loser.user_id, v_eligible,
      now() + make_interval(secs => public.config_int('conquest.pick_timer_seconds'))
    );
  end if;
end;
$$;

-- Same as before, comparing with a winner or loser that may be the bot.
create or replace function public.conquest_payload(p_match_id uuid, p_side text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'role', case when c.winner_id is not distinct from (case p_side when 'a' then m.player_a else m.player_b end)
                 then 'winner' else 'loser' end,
    'deadline_at', c.deadline_at,
    'resolved', c.resolved_at is not null,
    'auto_assigned', c.auto_assigned,
    'bonus_coins', c.bonus_coins,
    'chosen', case when c.chosen_instance_id is null then null else
      (select public.card_payload(i.definition_id) from public.card_instances i where i.id = c.chosen_instance_id)
    end,
    -- The loser's whole team, shown to the winner only and only while picking.
    'offered', case
      when c.resolved_at is null and c.winner_id is not distinct from (case p_side when 'a' then m.player_a else m.player_b end) then (
        select jsonb_agg(public.card_payload(u.definition_id) || jsonb_build_object(
          'instance_id', u.instance_id,
          'eligible', u.instance_id = any (c.eligible_instance_ids)
        ) order by u.ord)
        from public.match_teams t,
             unnest(t.card_instance_ids, t.definition_ids) with ordinality as u(instance_id, definition_id, ord)
        where t.match_id = p_match_id and t.user_id is not distinct from c.loser_id
      )
      else null
    end
  )
  from public.conquest_claims c
  join public.matches m on m.id = c.match_id
  where c.match_id = p_match_id
$$;

-- ---------------------------------------------------------------------------
-- A bot is a bot in every mode
-- ---------------------------------------------------------------------------

create or replace function public.close_abandoned_matches(p_user uuid)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_match public.matches;
begin
  for v_match in
    select m.* from public.matches m
    join public.match_rounds r on r.match_id = m.id and r.round = m.current_round
    where m.status = 'active'
      and (m.player_a = p_user or m.player_b = p_user)
      and r.deadline_at < now() - make_interval(mins => public.config_int('match.abandon_after_minutes'))
    for update of m
  loop
    perform public.finish_match(v_match.id, case when v_match.bot_difficulty is not null then 'b' else 'draw' end, 'forfeit');
  end loop;
end;
$$;

create or replace function public.match_submit_play(p_user uuid, p_match_id uuid, p_round integer, p_card_instance_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_round public.match_rounds;
  v_side text;
  v_team public.match_teams;
begin
  select * into v_match from public.matches where id = p_match_id for update;
  v_side := case when v_match.player_a = p_user then 'a' when v_match.player_b = p_user then 'b' end;
  if v_side is null or v_match.bot_difficulty is not null then
    raise exception 'match_not_found';
  end if;
  if v_match.status <> 'active' then
    raise exception 'match_not_active';
  end if;
  if v_match.current_round <> p_round then
    raise exception 'round_already_resolved';
  end if;
  select * into v_round from public.match_rounds where match_id = p_match_id and round = p_round;
  if now() > v_round.deadline_at + make_interval(secs => public.config_int('match.timeout_grace_seconds')) then
    raise exception 'round_expired';
  end if;

  select * into v_team from public.match_teams where match_id = p_match_id and side = v_side;
  if not (p_card_instance_id = any (v_team.card_instance_ids)) then
    raise exception 'character_not_available';
  end if;
  if exists (
    select 1 from public.round_plays
    where match_id = p_match_id and side = v_side and card_instance_id = p_card_instance_id
  ) then
    raise exception 'character_already_played';
  end if;

  -- A player may change their mind until the round is resolved.
  insert into public.pending_plays (match_id, round, side, card_instance_id)
  values (p_match_id, p_round, v_side, p_card_instance_id)
  on conflict (match_id, round, side) do update
  set card_instance_id = excluded.card_instance_id, submitted_at = now();

  update public.match_teams set last_seen_at = now() where match_id = p_match_id and side = v_side;
  perform public.notify_match(p_match_id, 'choice');

  return case
    when (select count(*) from public.pending_plays where match_id = p_match_id and round = p_round) = 2
    then 'ready' else 'waiting'
  end;
end;
$$;

create or replace function public.match_record_round(
  p_match_id uuid,
  p_round integer,
  p_play_a jsonb,
  p_play_b jsonb,
  p_winner_side text,
  p_result text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_round public.match_rounds;
  v_team public.match_teams;
  v_side text;
  v_play jsonb;
  v_instance uuid;
  v_definition uuid;
  v_position integer;
  v_auto boolean;
  v_pending uuid;
  v_won_a integer;
  v_won_b integer;
  v_total_a integer;
  v_total_b integer;
  v_finished boolean;
  v_result text;
  v_grace integer := public.config_int('match.timeout_grace_seconds');
begin
  select * into v_match from public.matches where id = p_match_id for update;
  if v_match.id is null or v_match.status <> 'active' then
    raise exception 'match_not_active';
  end if;
  if v_match.current_round <> p_round then
    raise exception 'round_already_resolved';
  end if;
  select * into v_round from public.match_rounds where match_id = p_match_id and round = p_round;
  if v_round.match_id is null or v_round.resolved_at is not null then
    raise exception 'round_already_resolved';
  end if;
  if p_winner_side is not null and p_winner_side not in ('a', 'b') then
    raise exception 'invalid_winner';
  end if;

  foreach v_side in array array['a', 'b'] loop
    v_play := case v_side when 'a' then p_play_a else p_play_b end;
    select * into v_team from public.match_teams where match_id = p_match_id and side = v_side;
    v_definition := (v_play ->> 'definition_id')::uuid;
    v_instance := (v_play ->> 'card_instance_id')::uuid;
    v_auto := coalesce((v_play ->> 'auto_played')::boolean, false);

    if v_team.card_instance_ids is not null then
      v_position := array_position(v_team.card_instance_ids, v_instance);
      if v_position is null or v_team.definition_ids[v_position] is distinct from v_definition then
        raise exception 'character_not_in_team';
      end if;
    elsif v_instance is not null or not (v_definition = any (v_team.definition_ids)) then
      raise exception 'character_not_in_team';
    end if;

    if exists (
      select 1 from public.round_plays
      where match_id = p_match_id and side = v_side and definition_id = v_definition
    ) then
      raise exception 'character_already_played';
    end if;

    if v_team.user_id is not null then
      if v_match.bot_difficulty is not null then
        -- A human choice after the deadline is refused: the engine must auto-play.
        if not v_auto and now() > v_round.deadline_at + make_interval(secs => v_grace) then
          raise exception 'round_expired';
        end if;
      else
        select card_instance_id into v_pending from public.pending_plays
        where match_id = p_match_id and round = p_round and side = v_side;
        if v_auto and v_pending is not null then
          raise exception 'choice_ignored';
        end if;
        if not v_auto and v_pending is distinct from v_instance then
          raise exception 'choice_not_submitted';
        end if;
        if v_auto and now() <= v_round.deadline_at + make_interval(secs => v_grace) then
          raise exception 'round_not_expired';
        end if;
      end if;
    end if;

    insert into public.round_plays (
      match_id, round, side, card_instance_id, definition_id,
      base_score, bonus, score, highest_value, auto_played
    ) values (
      p_match_id, p_round, v_side, v_instance, v_definition,
      (v_play ->> 'base')::integer, (v_play ->> 'bonus')::integer, (v_play ->> 'score')::integer,
      (v_play ->> 'highest')::integer, v_auto
    );
  end loop;

  delete from public.pending_plays where match_id = p_match_id and round = p_round;

  update public.match_rounds
  set winner_side = coalesce(p_winner_side, 'none'), resolved_at = now()
  where match_id = p_match_id and round = p_round;

  -- "is not distinct from": a void round (null winner) must count as 0, not null.
  update public.matches
  set rounds_won_a = rounds_won_a + (p_winner_side is not distinct from 'a')::integer,
      rounds_won_b = rounds_won_b + (p_winner_side is not distinct from 'b')::integer,
      total_score_a = total_score_a + (p_play_a ->> 'score')::integer,
      total_score_b = total_score_b + (p_play_b ->> 'score')::integer
  where id = p_match_id
  returning rounds_won_a, rounds_won_b, total_score_a, total_score_b
  into v_won_a, v_won_b, v_total_a, v_total_b;

  v_finished := greatest(v_won_a, v_won_b) >= public.config_int('match.rounds_to_win')
                or p_round >= cardinality(v_match.threat_ids);
  v_result := case
    when not v_finished then null
    when v_won_a <> v_won_b then case when v_won_a > v_won_b then 'a' else 'b' end
    when v_total_a <> v_total_b then case when v_total_a > v_total_b then 'a' else 'b' end
    else 'draw'
  end;
  -- The engine and the database must agree on how the match ended.
  if v_result is distinct from p_result then
    raise exception 'result_mismatch';
  end if;

  if v_finished then
    perform public.finish_match(p_match_id, v_result, 'completed');
  else
    insert into public.match_rounds (match_id, round, threat_id, deadline_at)
    values (
      p_match_id, p_round + 1, v_match.threat_ids[p_round + 1],
      now() + make_interval(secs => public.config_int('match.reveal_pause_seconds')
                                    + public.config_int('match.round_timer_seconds'))
    );
    update public.matches set current_round = p_round + 1 where id = p_match_id;
    perform public.notify_match(p_match_id, 'round');
  end if;
end;
$$;

-- A bot never disconnects: no victory can be claimed against it.
create or replace function public.claim_victory(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_side text;
  v_last_seen timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_match from public.matches where id = p_match_id for update;
  v_side := case when v_match.player_a = auth.uid() then 'a' when v_match.player_b = auth.uid() then 'b' end;
  if v_side is null or v_match.bot_difficulty is not null then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;
  if v_match.status <> 'active' then
    raise exception 'match_not_active';
  end if;

  select coalesce(last_seen_at, v_match.created_at) into v_last_seen
  from public.match_teams where match_id = p_match_id and side <> v_side;
  if v_last_seen > now() - make_interval(secs => public.config_int('match.reconnect_grace_seconds')) then
    raise exception 'opponent_still_connected';
  end if;

  update public.match_teams set last_seen_at = now() where match_id = p_match_id and side = v_side;
  perform public.finish_match(p_match_id, v_side, 'forfeit');
  return public.match_state_payload(p_match_id, v_side);
end;
$$;

-- Bot matches earn bot XP and count in the bot statistics, in every mode.
create or replace function public.finish_match(p_match_id uuid, p_result text, p_reason text)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_match public.matches;
  v_side text;
  v_user uuid;
  v_won boolean;
  v_left boolean;
  v_xp integer;
  v_coins integer;
  v_profile public.profiles;
  v_completed integer;
begin
  update public.matches
  set status = 'finished', result = p_result, end_reason = p_reason, finished_at = now()
  where id = p_match_id and status = 'active'
  returning * into v_match;
  if v_match.id is null then
    raise exception 'match_not_active';
  end if;

  foreach v_side in array array['a', 'b'] loop
    v_user := case v_side when 'a' then v_match.player_a else v_match.player_b end;
    continue when v_user is null; -- a bot

    v_won := p_result = v_side;
    -- Whoever leaves or disappears earns nothing.
    v_left := p_reason = 'forfeit' and not v_won;

    v_xp := case
      when v_left then 0
      when v_match.bot_difficulty is not null and v_won then public.config_int('progression.bot_win_xp')
      when v_match.bot_difficulty is not null then public.config_int('progression.bot_participation_xp')
      when v_won then public.config_int('progression.pvp_win_xp')
      else public.config_int('progression.pvp_participation_xp')
    end;

    -- Only Conquest pays coins, and only to the side that gets no card.
    v_coins := case
      when v_match.mode = 'conquest' and not v_won and not v_left then public.config_int('conquest.loser_coins')
      else 0
    end;
    if v_coins > 0 then
      insert into public.coin_ledger (user_id, amount, reason, ref_id)
      values (v_user, v_coins, 'match_reward', v_match.id);
    end if;
    if v_side = 'a' then
      update public.matches set reward_coins_a = v_coins where id = v_match.id;
    else
      update public.matches set reward_coins_b = v_coins where id = v_match.id;
    end if;

    if v_match.bot_difficulty is not null then
      update public.profiles
      set bot_wins = bot_wins + (p_result = v_side)::integer,
          bot_losses = bot_losses + (p_result not in (v_side, 'draw'))::integer,
          bot_draws = bot_draws + (p_result = 'draw')::integer
      where id = v_user;
    else
      update public.profiles
      set wins = wins + (p_result = v_side)::integer,
          losses = losses + (p_result not in (v_side, 'draw'))::integer,
          draws = draws + (p_result = 'draw')::integer,
          current_streak = case when p_result = v_side then current_streak + 1 else 0 end,
          best_streak = greatest(best_streak, case when p_result = v_side then current_streak + 1 else 0 end)
      where id = v_user;
    end if;

    update public.profiles
    set matches_played = matches_played + 1,
        xp = xp + v_xp,
        level = public.level_for_xp(xp + v_xp),
        updated_at = now()
    where id = v_user
    returning * into v_profile;

    perform public.grant_level_rewards(v_user, v_match.id);

    -- Abandoned matches do not count towards the unlock.
    select count(*) into v_completed from public.matches m
    where m.status = 'finished' and m.end_reason = 'completed' and (m.player_a = v_user or m.player_b = v_user);
    if not v_profile.conquest_unlocked
       and (v_completed >= public.config_int('conquest.unlock_after_matches')
            or v_profile.level >= public.config_int('conquest.unlock_at_level')) then
      update public.profiles set conquest_unlocked = true where id = v_user;
    end if;
  end loop;

  if v_match.mode = 'conquest' and p_result in ('a', 'b') then
    perform public.open_conquest_claim(v_match.id, p_result);
  end if;

  perform public.notify_match(v_match.id, 'finished');
end;
$$;

-- ---------------------------------------------------------------------------
-- History
-- ---------------------------------------------------------------------------

create or replace function public.get_conquest_history()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'won', t.to_user is not distinct from auth.uid(),
    'created_at', t.created_at,
    'opponent', case when m.bot_difficulty is not null then 'Bot' else (
      select p.username from public.profiles p
      where p.id = case when t.to_user = auth.uid() then t.from_user else t.to_user end
    ) end,
    'card', public.card_payload(i.definition_id)
  ) order by t.created_at desc), '[]'::jsonb)
  from public.card_transfers t
  join public.card_instances i on i.id = t.instance_id
  left join public.matches m on m.id = t.match_id
  where t.reason = 'conquest' and auth.uid() in (t.from_user, t.to_user)
$$;

create or replace function public.get_match_history(p_limit integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(entry order by finished_at desc), '[]'::jsonb)
  from (
    select
      m.finished_at,
      jsonb_build_object(
        'id', m.id,
        'mode', m.mode,
        'bot_difficulty', m.bot_difficulty,
        'finished_at', m.finished_at,
        'end_reason', m.end_reason,
        'result', case when m.result = 'draw' then 'draw' when (m.result = 'a') = (m.player_a = auth.uid()) then 'win' else 'loss' end,
        'rounds_me', case when m.player_a = auth.uid() then m.rounds_won_a else m.rounds_won_b end,
        'rounds_opponent', case when m.player_a = auth.uid() then m.rounds_won_b else m.rounds_won_a end,
        'coins', coalesce(case when m.player_a = auth.uid() then m.reward_coins_a else m.reward_coins_b end, 0),
        'opponent', (
          select p.username from public.profiles p
          where p.id = case when m.player_a = auth.uid() then m.player_b else m.player_a end
        ),
        'conquest', (
          select jsonb_build_object(
            'won', c.winner_id is not distinct from auth.uid(),
            'bonus_coins', c.bonus_coins,
            'pending', c.resolved_at is null,
            'card_name', d.name,
            'card_color', r.color
          )
          from public.conquest_claims c
          left join public.card_instances i on i.id = c.chosen_instance_id
          left join public.card_definitions d on d.id = i.definition_id
          left join public.rarity_definitions r on r.code = d.rarity_code
          where c.match_id = m.id
        )
      ) as entry
    from public.matches m
    where m.status = 'finished' and auth.uid() in (m.player_a, m.player_b)
    order by m.finished_at desc
    limit greatest(1, least(coalesce(p_limit, 30), 100))
  ) s
$$;
