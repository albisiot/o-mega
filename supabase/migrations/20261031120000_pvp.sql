-- M7 · Friendly matches between players: friend codes, random queue, secret
-- simultaneous plays, presence and rewards with anti-abuse rules.
--
-- Changes are announced on Realtime broadcast topics "match:<id>" and
-- "player:<user id>". Messages only say that something changed: clients
-- then read the filtered state through get_match_state().

insert into public.game_config (key, value, description) values
  ('economy.win_coins', '50', 'Coins for a PvP win'),
  ('economy.participation_coins', '15', 'Coins for a PvP loss or draw'),
  ('economy.daily_match_coin_cap', '300', 'Daily cap of coins from PvP matches'),
  ('economy.same_pair_reward_window_hours', '24', 'Window for the same-opponent reward limit'),
  ('economy.same_pair_full_reward_matches', '3', 'Rewarded matches against the same opponent within the window'),
  ('economy.forfeit_full_reward_min_rounds', '3', 'Rounds played for a win by forfeit to pay the full win reward'),
  ('match.reconnect_grace_seconds', '30', 'Absence after which the opponent can claim the victory'),
  ('matchmaking.friend_code_minutes', '10', 'Validity of a friend code'),
  ('matchmaking.queue_stale_seconds', '20', 'A queue entry not refreshed for this long is ignored');

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

create unique index matches_one_active_player_b on public.matches (player_b) where status = 'active';
alter table public.matches
  add constraint matches_pvp_has_player_b check (mode = 'bot' or player_b is not null);

alter table public.match_teams add column last_seen_at timestamptz;

-- Secret choices waiting for the other player (never readable by clients).
create table public.pending_plays (
  match_id uuid not null,
  round integer not null,
  side text not null check (side in ('a', 'b')),
  card_instance_id uuid not null references public.card_instances (id),
  submitted_at timestamptz not null default now(),
  primary key (match_id, round, side),
  foreign key (match_id, round) references public.match_rounds (match_id, round) on delete cascade
);

create index pending_plays_card_instance_id_idx on public.pending_plays (card_instance_id);

create table public.match_lobbies (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  host_id uuid not null unique references public.profiles (id) on delete cascade,
  mode text not null default 'friendly' check (mode in ('friendly')),
  card_instance_ids uuid[] not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table public.matchmaking_queue (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  mode text not null default 'friendly' check (mode in ('friendly')),
  card_instance_ids uuid[] not null,
  enqueued_at timestamptz not null default now(),
  refreshed_at timestamptz not null default now()
);

alter table public.pending_plays enable row level security;
alter table public.match_lobbies enable row level security;
alter table public.matchmaking_queue enable row level security;
revoke all on table public.pending_plays, public.match_lobbies, public.matchmaking_queue from anon, authenticated;
grant select on table public.match_lobbies, public.matchmaking_queue to authenticated;
grant select on table public.pending_plays, public.match_lobbies, public.matchmaking_queue to service_role;
create policy "hosts read their own lobby"
  on public.match_lobbies for select to authenticated using ((select auth.uid()) = host_id);
create policy "players read their own queue entry"
  on public.matchmaking_queue for select to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.has_active_match(p_user uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.matches where status = 'active' and (player_a = p_user or player_b = p_user)
  )
$$;

create function public.notify_match(p_match_id uuid, p_kind text)
returns void
language sql
volatile
set search_path = ''
as $$
  select realtime.send(jsonb_build_object('kind', p_kind), 'update', 'match:' || p_match_id, false)
$$;

create function public.notify_player(p_user uuid, p_kind text, p_match_id uuid)
returns void
language sql
volatile
set search_path = ''
as $$
  select realtime.send(jsonb_build_object('kind', p_kind, 'match_id', p_match_id), 'update', 'player:' || p_user, false)
$$;

-- Creates a match between two players with validated teams.
create function public.create_pvp_match(
  p_mode text,
  p_player_a uuid,
  p_team_a uuid[],
  p_player_b uuid,
  p_team_b uuid[],
  p_threat_ids uuid[]
)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_threats integer := public.config_int('match.threats_per_match');
  v_definitions_a uuid[] := public.validate_team(p_player_a, p_team_a);
  v_definitions_b uuid[] := public.validate_team(p_player_b, p_team_b);
  v_levels integer[];
  v_match uuid;
begin
  if p_player_a = p_player_b then
    raise exception 'cannot_play_yourself';
  end if;
  if public.has_active_match(p_player_a) or public.has_active_match(p_player_b) then
    raise exception 'match_already_active';
  end if;

  select array_agg(t.level order by u.ord) into v_levels
  from unnest(p_threat_ids) with ordinality as u(id, ord)
  join public.threat_definitions t on t.id = u.id and t.is_active;
  if coalesce(cardinality(v_levels), 0) <> v_threats
     or (select count(distinct u.id) from unnest(p_threat_ids) as u(id)) <> v_threats then
    raise exception 'invalid_threats';
  end if;

  insert into public.matches (mode, player_a, player_b, threat_ids, threat_levels)
  values (p_mode, p_player_a, p_player_b, p_threat_ids, v_levels)
  returning id into v_match;

  insert into public.match_teams (match_id, side, user_id, card_instance_ids, definition_ids, last_seen_at) values
    (v_match, 'a', p_player_a, p_team_a, v_definitions_a, now()),
    (v_match, 'b', p_player_b, p_team_b, v_definitions_b, now());

  insert into public.match_rounds (match_id, round, threat_id, deadline_at)
  values (
    v_match, 1, p_threat_ids[1],
    now() + make_interval(secs => public.config_int('match.reveal_pause_seconds')
                                  + public.config_int('match.round_timer_seconds'))
  );

  delete from public.match_lobbies where host_id in (p_player_a, p_player_b);
  delete from public.matchmaking_queue where user_id in (p_player_a, p_player_b);
  perform public.notify_player(p_player_a, 'match_started', v_match);
  perform public.notify_player(p_player_b, 'match_started', v_match);
  return v_match;
end;
$$;

revoke execute on function public.has_active_match(uuid) from public, anon, authenticated;
revoke execute on function public.notify_match(uuid, text) from public, anon, authenticated;
revoke execute on function public.notify_player(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.create_pvp_match(text, uuid, uuid[], uuid, uuid[], uuid[]) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Friend codes and queue (client RPCs)
-- ---------------------------------------------------------------------------

-- Opens a lobby with a 6-character code. One lobby per player.
create function public.create_lobby(p_card_instance_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_expires timestamptz := now() + make_interval(mins => public.config_int('matchmaking.friend_code_minutes'));
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('o-mega.matchmaking'));
  perform public.validate_team(v_uid, p_card_instance_ids);
  if public.has_active_match(v_uid) then
    raise exception 'match_already_active';
  end if;

  delete from public.match_lobbies where host_id = v_uid;
  delete from public.matchmaking_queue where user_id = v_uid;
  loop
    v_code := (
      select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1), '')
      from generate_series(1, 6)
    );
    exit when not exists (select 1 from public.match_lobbies where code = v_code);
  end loop;

  insert into public.match_lobbies (code, host_id, card_instance_ids, expires_at)
  values (v_code, v_uid, p_card_instance_ids, v_expires);
  return jsonb_build_object('code', v_code, 'expires_at', v_expires);
end;
$$;

create function public.cancel_lobby()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.match_lobbies where host_id = auth.uid()
$$;

create function public.leave_queue()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.matchmaking_queue where user_id = auth.uid()
$$;

revoke execute on function public.create_lobby(uuid[]) from public, anon;
revoke execute on function public.cancel_lobby() from public, anon;
revoke execute on function public.leave_queue() from public, anon;
grant execute on function public.create_lobby(uuid[]) to authenticated;
grant execute on function public.cancel_lobby() to authenticated;
grant execute on function public.leave_queue() to authenticated;

-- ---------------------------------------------------------------------------
-- Service-only functions used by the Edge Function
-- ---------------------------------------------------------------------------

-- The guest joins a lobby by code: the host is player A.
create function public.match_join_lobby(p_guest uuid, p_code text, p_team uuid[], p_threat_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lobby public.match_lobbies;
begin
  perform pg_advisory_xact_lock(hashtext('o-mega.matchmaking'));
  select * into v_lobby from public.match_lobbies where code = upper(btrim(p_code));
  if v_lobby.code is null or v_lobby.expires_at < now() then
    raise exception 'lobby_not_found';
  end if;
  if v_lobby.host_id = p_guest then
    raise exception 'cannot_play_yourself';
  end if;
  return public.create_pvp_match('friendly', v_lobby.host_id, v_lobby.card_instance_ids, p_guest, p_team, p_threat_ids);
end;
$$;

-- Joins (or refreshes) the random queue. Returns the match id when an
-- opponent was waiting, null otherwise. Called again by the waiting client.
create function public.match_queue_join(p_user uuid, p_team uuid[], p_threat_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_opponent public.matchmaking_queue;
  v_stale integer := public.config_int('matchmaking.queue_stale_seconds');
begin
  -- Serializes matchmaking: two players can never be paired twice at once.
  perform pg_advisory_xact_lock(hashtext('o-mega.matchmaking'));
  perform public.validate_team(p_user, p_team);
  if public.has_active_match(p_user) then
    raise exception 'match_already_active';
  end if;
  delete from public.match_lobbies where host_id = p_user;

  for v_opponent in
    select * from public.matchmaking_queue
    where user_id <> p_user and mode = 'friendly'
      and refreshed_at > now() - make_interval(secs => v_stale)
    order by enqueued_at
  loop
    begin
      -- The player who waited longer is player A.
      return public.create_pvp_match('friendly', v_opponent.user_id, v_opponent.card_instance_ids, p_user, p_team, p_threat_ids);
    exception when others then
      -- That entry is no longer valid (cards gone, already playing): drop it.
      if sqlerrm not in ('card_not_owned', 'duplicate_card', 'duplicate_character', 'invalid_team_size', 'match_already_active') then
        raise;
      end if;
      delete from public.matchmaking_queue where user_id = v_opponent.user_id;
    end;
  end loop;

  insert into public.matchmaking_queue (user_id, card_instance_ids)
  values (p_user, p_team)
  on conflict (user_id) do update set card_instance_ids = excluded.card_instance_ids, refreshed_at = now();
  return null;
end;
$$;

-- Stores a secret choice. Returns 'ready' when both players have chosen.
create function public.match_submit_play(p_user uuid, p_match_id uuid, p_round integer, p_card_instance_id uuid)
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
  if v_side is null or v_match.mode = 'bot' then
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

revoke execute on function public.match_join_lobby(uuid, text, uuid[], uuid[]) from public, anon, authenticated;
revoke execute on function public.match_queue_join(uuid, uuid[], uuid[]) from public, anon, authenticated;
revoke execute on function public.match_submit_play(uuid, uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.match_join_lobby(uuid, text, uuid[], uuid[]) to service_role;
grant execute on function public.match_queue_join(uuid, uuid[], uuid[]) to service_role;
grant execute on function public.match_submit_play(uuid, uuid, integer, uuid) to service_role;

-- Same checks as before, plus PvP: a human play must be the choice submitted
-- in time (pending_plays), and a submitted choice can never be auto-played.
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
      if v_match.mode = 'bot' then
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

-- ---------------------------------------------------------------------------
-- End of a match: rewards and statistics
-- ---------------------------------------------------------------------------

-- PvP coins for one side, after the same-pair limit and the daily cap.
create function public.pvp_reward(p_match public.matches, p_side text, p_result text, p_reason text)
returns integer
language plpgsql
stable
set search_path = ''
as $$
declare
  v_user uuid := case p_side when 'a' then p_match.player_a else p_match.player_b end;
  v_opponent uuid := case p_side when 'a' then p_match.player_b else p_match.player_a end;
  v_reward integer;
  v_rounds integer;
  v_earned integer;
begin
  if p_reason = 'forfeit' and p_result <> p_side then
    return 0; -- whoever leaves earns nothing
  end if;
  if p_result = p_side then
    select count(*) into v_rounds from public.match_rounds where match_id = p_match.id and resolved_at is not null;
    -- A quick forfeit must not hand out wins.
    v_reward := case
      when p_reason = 'forfeit' and v_rounds < public.config_int('economy.forfeit_full_reward_min_rounds')
        then public.config_int('economy.participation_coins')
      else public.config_int('economy.win_coins')
    end;
  else
    v_reward := public.config_int('economy.participation_coins');
  end if;

  if (
    select count(*) from public.matches m
    where m.id <> p_match.id and m.status = 'finished' and m.mode <> 'bot'
      and m.finished_at > now() - make_interval(hours => public.config_int('economy.same_pair_reward_window_hours'))
      and ((m.player_a = v_user and m.player_b = v_opponent) or (m.player_a = v_opponent and m.player_b = v_user))
  ) >= public.config_int('economy.same_pair_full_reward_matches') then
    return 0;
  end if;

  select coalesce(sum(amount), 0) into v_earned
  from public.coin_ledger
  where user_id = v_user and reason = 'match_reward' and public.game_day(created_at) = public.game_day();
  return greatest(0, least(v_reward, public.config_int('economy.daily_match_coin_cap') - v_earned));
end;
$$;

create or replace function public.finish_match(p_match_id uuid, p_result text, p_reason text)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_match public.matches;
  v_reward integer := 0;
  v_earned integer;
  v_side text;
  v_user uuid;
  v_coins integer;
begin
  update public.matches
  set status = 'finished', result = p_result, end_reason = p_reason, finished_at = now()
  where id = p_match_id and status = 'active'
  returning * into v_match;
  if v_match.id is null then
    raise exception 'match_not_active';
  end if;

  if v_match.mode = 'bot' then
    if p_reason <> 'forfeit' then
      v_reward := case when p_result = 'a' then public.config_int('economy.bot_win_coins')
                       else public.config_int('economy.bot_participation_coins') end;
      select coalesce(sum(amount), 0) into v_earned
      from public.coin_ledger
      where user_id = v_match.player_a
        and reason = 'bot_match_reward'
        and public.game_day(created_at) = public.game_day();
      v_reward := greatest(0, least(v_reward, public.config_int('economy.bot_daily_coin_cap') - v_earned));
      if v_reward > 0 then
        insert into public.coin_ledger (user_id, amount, reason, ref_id)
        values (v_match.player_a, v_reward, 'bot_match_reward', v_match.id);
      end if;
    end if;

    update public.matches set reward_coins_a = v_reward where id = v_match.id;
    update public.profiles
    set matches_played = matches_played + 1,
        bot_wins = bot_wins + (p_result = 'a')::integer,
        bot_losses = bot_losses + (p_result = 'b')::integer,
        bot_draws = bot_draws + (p_result = 'draw')::integer,
        updated_at = now()
    where id = v_match.player_a;
  else
    foreach v_side in array array['a', 'b'] loop
      v_user := case v_side when 'a' then v_match.player_a else v_match.player_b end;
      v_coins := public.pvp_reward(v_match, v_side, p_result, p_reason);
      if v_coins > 0 then
        insert into public.coin_ledger (user_id, amount, reason, ref_id)
        values (v_user, v_coins, 'match_reward', v_match.id);
      end if;
      if v_side = 'a' then
        update public.matches set reward_coins_a = v_coins where id = v_match.id;
      else
        update public.matches set reward_coins_b = v_coins where id = v_match.id;
      end if;

      update public.profiles
      set matches_played = matches_played + 1,
          wins = wins + (p_result = v_side)::integer,
          losses = losses + (p_result not in (v_side, 'draw'))::integer,
          draws = draws + (p_result = 'draw')::integer,
          current_streak = case when p_result = v_side then current_streak + 1 else 0 end,
          best_streak = greatest(best_streak, case when p_result = v_side then current_streak + 1 else 0 end),
          updated_at = now()
      where id = v_user;
    end loop;
  end if;

  perform public.notify_match(v_match.id, 'finished');
end;
$$;

revoke execute on function public.pvp_reward(public.matches, text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Presence and absence (SPEC §5.7)
-- ---------------------------------------------------------------------------

create function public.match_heartbeat(p_match_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.match_teams t
  set last_seen_at = now()
  from public.matches m
  where t.match_id = p_match_id and t.user_id = auth.uid() and m.id = t.match_id and m.status = 'active'
$$;

-- After the reconnection grace, the present player wins by forfeit of the absent one.
create function public.claim_victory(p_match_id uuid)
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
  if v_side is null or v_match.mode = 'bot' then
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

revoke execute on function public.match_heartbeat(uuid) from public, anon;
revoke execute on function public.claim_victory(uuid) from public, anon;
grant execute on function public.match_heartbeat(uuid) to authenticated;
grant execute on function public.claim_victory(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Visible state: opponent, presence, secret choices only as "has chosen".
-- ---------------------------------------------------------------------------

create or replace function public.match_state_payload(p_match_id uuid, p_side text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with m as (
    select * from public.matches where id = p_match_id
  ), mine as (
    select * from public.match_teams where match_id = p_match_id and side = p_side
  ), theirs as (
    select * from public.match_teams where match_id = p_match_id and side <> p_side
  )
  select jsonb_build_object(
    'id', m.id,
    'mode', m.mode,
    'bot_difficulty', m.bot_difficulty,
    'status', m.status,
    'my_side', p_side,
    'current_round', m.current_round,
    'threat_levels', to_jsonb(m.threat_levels),
    'rounds_won', jsonb_build_object(
      'me', case p_side when 'a' then m.rounds_won_a else m.rounds_won_b end,
      'opponent', case p_side when 'a' then m.rounds_won_b else m.rounds_won_a end
    ),
    'total_score', jsonb_build_object(
      'me', case p_side when 'a' then m.total_score_a else m.total_score_b end,
      'opponent', case p_side when 'a' then m.total_score_b else m.total_score_a end
    ),
    'result', case when m.result is null then null when m.result = 'draw' then 'draw'
                   when m.result = p_side then 'win' else 'loss' end,
    'end_reason', m.end_reason,
    'reward_coins', case p_side when 'a' then m.reward_coins_a else m.reward_coins_b end,
    'server_now', now(),
    'opponent', (
      select jsonb_build_object(
        'username', pr.username, 'avatar_url', pr.avatar_url, 'level', pr.level,
        'last_seen_at', theirs.last_seen_at
      )
      from theirs join public.profiles pr on pr.id = theirs.user_id
    ),
    'my_team', (
      select jsonb_agg(public.card_payload(u.definition_id) || jsonb_build_object(
        'instance_id', u.instance_id,
        'played_round', (
          select rp.round from public.round_plays rp
          where rp.match_id = p_match_id and rp.side = p_side and rp.card_instance_id = u.instance_id
        )
      ) order by u.ord)
      from mine, unnest(mine.card_instance_ids, mine.definition_ids) with ordinality as u(instance_id, definition_id, ord)
    ),
    'rounds', coalesce((
      select jsonb_agg(jsonb_build_object(
        'round', mr.round,
        'level', t.level,
        'threat', jsonb_build_object('name', t.name, 'abilities', to_jsonb(t.required_abilities), 'flavor', t.flavor),
        'deadline_at', mr.deadline_at,
        'resolved', mr.resolved_at is not null,
        'winner', case
          when mr.resolved_at is null then null
          when mr.winner_side = 'none' then 'none'
          when mr.winner_side = p_side then 'me'
          else 'opponent' end,
        'my_pending_instance_id', (
          select pp.card_instance_id from public.pending_plays pp
          where pp.match_id = p_match_id and pp.round = mr.round and pp.side = p_side
        ),
        -- Only whether the opponent has chosen, never what.
        'opponent_has_chosen', exists (
          select 1 from public.pending_plays pp
          where pp.match_id = p_match_id and pp.round = mr.round and pp.side <> p_side
        ),
        'my_play', (
          select jsonb_build_object(
            'instance_id', rp.card_instance_id, 'definition_id', rp.definition_id,
            'base', rp.base_score, 'bonus', rp.bonus, 'score', rp.score,
            'highest', rp.highest_value, 'auto_played', rp.auto_played
          )
          from public.round_plays rp
          where rp.match_id = p_match_id and rp.round = mr.round and rp.side = p_side
        ),
        -- The opponent's play only once the round is resolved.
        'opponent_play', case when mr.resolved_at is null then null else (
          select public.card_payload(rp.definition_id) || jsonb_build_object(
            'base', rp.base_score, 'bonus', rp.bonus, 'score', rp.score,
            'highest', rp.highest_value, 'auto_played', rp.auto_played
          )
          from public.round_plays rp
          where rp.match_id = p_match_id and rp.round = mr.round and rp.side <> p_side
        ) end
      ) order by mr.round)
      from public.match_rounds mr
      join public.threat_definitions t on t.id = mr.threat_id
      where mr.match_id = p_match_id
    ), '[]'::jsonb)
  )
  from m
$$;
