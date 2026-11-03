-- Matchmaking held one lock for everything: every refresh of every waiting
-- player, every friend code and every Conquest bot waited for it, and held it
-- while checking the player's whole team (abandoned matches, expired picks,
-- cards at stake, daily losses). A Conquest wait also took it twice per
-- refresh, once to look for a player and once for the bot.
--
-- Now the caller's own checks run before the lock, since nothing the lock
-- serializes can change them, and the lock is taken only to pair two players
-- or start a bot: a refresh that finds nobody suitable never takes it. Who is
-- paired with whom, the wider ranges after a wait, the same-pair cooldown and
-- the bot after conquest_bot_after_seconds stay as they were. Under the lock,
-- has_active_match is checked again before any match is created, so a player
-- still never gets two matches and two players are never paired twice.
--
-- Under the lock, the waiting opponent's team is checked without settling the
-- opponent's expired picks or abandoned matches first: the opponent's own
-- refresh does that before every queue entry, and the holder of the lock then
-- never waits for rows that a caller queuing for the lock may have locked
-- while settling its own.

-- Only fresh entries count; stale ones are left behind by closed apps.
create index matchmaking_queue_fresh_idx on public.matchmaking_queue (mode, refreshed_at);

-- ---------------------------------------------------------------------------
-- Team checks that only read
-- ---------------------------------------------------------------------------

-- The checks of validate_team, without settling anything first.
create function public.check_team(p_user uuid, p_instance_ids uuid[])
returns uuid[]
language plpgsql
stable
set search_path = ''
as $$
declare
  v_size integer := public.config_int('match.team_size');
  v_definitions uuid[];
begin
  if coalesce(cardinality(p_instance_ids), 0) <> v_size then
    raise exception 'invalid_team_size' using errcode = '22023';
  end if;
  if (select count(distinct u.id) from unnest(p_instance_ids) as u(id)) <> v_size then
    raise exception 'duplicate_card' using errcode = '22023';
  end if;

  select array_agg(i.definition_id order by u.ord) into v_definitions
  from unnest(p_instance_ids) with ordinality as u(id, ord)
  join public.card_instances i on i.id = u.id and i.owner_id = p_user;
  if coalesce(cardinality(v_definitions), 0) <> v_size then
    raise exception 'card_not_owned' using errcode = '22023';
  end if;

  -- Two copies of the same character are not allowed (SPEC §5.2).
  if (select count(distinct d.id) from unnest(v_definitions) as d(id)) <> v_size then
    raise exception 'duplicate_character' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.conquest_claims c
    where c.resolved_at is null and c.loser_id = p_user and c.eligible_instance_ids && p_instance_ids
  ) then
    raise exception 'card_at_stake' using errcode = '22023';
  end if;
  return v_definitions;
end;
$$;

-- The checks of validate_conquest_team, without settling anything first.
create function public.check_conquest_team(p_user uuid, p_instance_ids uuid[])
returns uuid[]
language plpgsql
stable
set search_path = ''
as $$
declare
  v_definitions uuid[] := public.check_team(p_user, p_instance_ids);
begin
  if not (select conquest_unlocked from public.profiles where id = p_user) then
    raise exception 'conquest_locked';
  end if;
  if public.cards_lost_today(p_user) >= public.config_int('conquest.max_cards_lost_per_day') then
    raise exception 'daily_loss_limit';
  end if;
  if exists (
    select 1 from public.card_instances
    where id = any (p_instance_ids) and locked_until > now()
  ) then
    raise exception 'card_locked';
  end if;
  if (select count(*) from public.card_instances where id = any (p_instance_ids) and not is_starter)
     < public.config_int('conquest.min_conquerable_cards') then
    raise exception 'not_enough_conquerable';
  end if;
  return v_definitions;
end;
$$;

-- Same as before: closes abandoned matches and settles expired picks, then checks.
create or replace function public.validate_team(p_user uuid, p_instance_ids uuid[])
returns uuid[]
language plpgsql
volatile
set search_path = ''
as $$
begin
  perform public.close_abandoned_matches(p_user);
  perform public.settle_expired_claims(p_user);
  return public.check_team(p_user, p_instance_ids);
end;
$$;

create or replace function public.validate_conquest_team(p_user uuid, p_instance_ids uuid[])
returns uuid[]
language plpgsql
volatile
set search_path = ''
as $$
begin
  perform public.close_abandoned_matches(p_user);
  perform public.settle_expired_claims(p_user);
  return public.check_conquest_team(p_user, p_instance_ids);
end;
$$;

-- ---------------------------------------------------------------------------
-- Creating matches from checked teams
-- ---------------------------------------------------------------------------

-- Creates a match between two players whose teams are already checked.
-- Runs under the matchmaking lock.
create function public.insert_pvp_match(
  p_mode text,
  p_player_a uuid,
  p_team_a uuid[],
  p_definitions_a uuid[],
  p_player_b uuid,
  p_team_b uuid[],
  p_definitions_b uuid[],
  p_threat_ids uuid[]
)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_threats integer := public.config_int('match.threats_per_match');
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
    (v_match, 'a', p_player_a, p_team_a, p_definitions_a, now()),
    (v_match, 'b', p_player_b, p_team_b, p_definitions_b, now());

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

-- Same as before: checks both teams, then creates the match.
create or replace function public.create_pvp_match(
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
  v_definitions_a uuid[];
  v_definitions_b uuid[];
begin
  if p_player_a = p_player_b then
    raise exception 'cannot_play_yourself';
  end if;
  if p_mode = 'conquest' then
    v_definitions_a := public.validate_conquest_team(p_player_a, p_team_a);
    v_definitions_b := public.validate_conquest_team(p_player_b, p_team_b);
    if public.conquest_pair_on_cooldown(p_player_a, p_player_b) then
      raise exception 'same_pair_cooldown';
    end if;
  else
    v_definitions_a := public.validate_team(p_player_a, p_team_a);
    v_definitions_b := public.validate_team(p_player_b, p_team_b);
  end if;
  return public.insert_pvp_match(p_mode, p_player_a, p_team_a, v_definitions_a, p_player_b, p_team_b, v_definitions_b, p_threat_ids);
end;
$$;

-- A Conquest match against a bot, for a player whose team is already checked.
-- Runs under the matchmaking lock.
create function public.insert_conquest_bot_match(
  p_user uuid,
  p_team uuid[],
  p_definitions uuid[],
  p_difficulty text,
  p_bot_definition_ids uuid[],
  p_threat_ids uuid[]
)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_team_size integer := public.config_int('match.team_size');
  v_threats integer := public.config_int('match.threats_per_match');
  v_levels integer[];
  v_match uuid;
begin
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
    (v_match, 'a', p_user, p_team, p_definitions),
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

-- ---------------------------------------------------------------------------
-- The queue
-- ---------------------------------------------------------------------------

-- Fresh entries the caller can be paired with, longest wait first: same mode,
-- and for Conquest close in level and team value (wider once either player
-- has waited long enough) and not on the same-pair cooldown.
create function public.queue_candidates(p_user uuid, p_mode text, p_level integer, p_value integer, p_since timestamptz)
returns setof public.matchmaking_queue
language sql
stable
set search_path = ''
as $$
  select q.* from public.matchmaking_queue q
  where q.user_id <> p_user and q.mode = p_mode
    and q.refreshed_at > now() - make_interval(secs => public.config_int('matchmaking.queue_stale_seconds'))
    and (
      p_mode = 'friendly'
      or (
        not public.conquest_pair_on_cooldown(p_user, q.user_id)
        and case
          when least(p_since, q.enqueued_at) < now() - make_interval(secs => public.config_int('matchmaking.widen_after_seconds')) then
            abs(q.level - p_level) <= public.config_int('matchmaking.level_range_wide')
            and abs(q.team_value - p_value) <= public.config_int('matchmaking.team_value_range_wide')
          else
            abs(q.level - p_level) <= public.config_int('matchmaking.level_range')
            and abs(q.team_value - p_value) <= public.config_int('matchmaking.team_value_range')
        end
      )
    )
  order by q.enqueued_at
$$;

drop function public.match_queue_join(uuid, text, uuid[], uuid[]);

-- Joins (or refreshes) a queue. Returns the match id when a suitable opponent
-- was waiting or, in Conquest, when the wait is over and the bot described by
-- the p_bot_* arguments steps in (SPEC §6.5); null otherwise. Called again by
-- the waiting client.
create function public.match_queue_join(
  p_user uuid,
  p_mode text,
  p_team uuid[],
  p_threat_ids uuid[],
  p_bot_difficulty text default null,
  p_bot_definition_ids uuid[] default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_opponent public.matchmaking_queue;
  v_definitions uuid[];
  v_opponent_definitions uuid[];
  v_level integer;
  v_value integer;
  v_since timestamptz;
  v_bot_due boolean;
begin
  if p_mode not in ('friendly', 'conquest') then
    raise exception 'invalid_request';
  end if;

  -- The caller's own checks need no lock.
  v_definitions := case p_mode
    when 'conquest' then public.validate_conquest_team(p_user, p_team)
    else public.validate_team(p_user, p_team)
  end;
  if public.has_active_match(p_user) then
    raise exception 'match_already_active';
  end if;

  select level into v_level from public.profiles where id = p_user;
  v_value := public.team_value(v_definitions);
  select enqueued_at into v_since from public.matchmaking_queue where user_id = p_user and mode = p_mode;
  v_since := coalesce(v_since, now());
  v_bot_due := p_mode = 'conquest' and p_bot_difficulty is not null
    and v_since <= now() - make_interval(secs => public.config_int('matchmaking.conquest_bot_after_seconds'));

  if v_bot_due or exists (select 1 from public.queue_candidates(p_user, p_mode, v_level, v_value, v_since)) then
    -- Serializes pairing: two players can never be paired twice at once.
    perform pg_advisory_xact_lock(hashtext('o-mega.matchmaking'));
    if public.has_active_match(p_user) then
      raise exception 'match_already_active';
    end if;

    for v_opponent in
      select * from public.queue_candidates(p_user, p_mode, v_level, v_value, v_since) q order by q.enqueued_at
    loop
      begin
        v_opponent_definitions := case p_mode
          when 'conquest' then public.check_conquest_team(v_opponent.user_id, v_opponent.card_instance_ids)
          else public.check_team(v_opponent.user_id, v_opponent.card_instance_ids)
        end;
        -- The player who waited longer is player A.
        return public.insert_pvp_match(
          p_mode, v_opponent.user_id, v_opponent.card_instance_ids, v_opponent_definitions,
          p_user, p_team, v_definitions, p_threat_ids
        );
      exception when others then
        -- That entry is no longer valid (cards gone, already playing): drop it.
        if sqlerrm not in (
          'card_not_owned', 'duplicate_card', 'duplicate_character', 'invalid_team_size', 'match_already_active',
          'card_at_stake', 'conquest_locked', 'daily_loss_limit', 'card_locked', 'not_enough_conquerable', 'same_pair_cooldown'
        ) then
          raise;
        end if;
        delete from public.matchmaking_queue where user_id = v_opponent.user_id;
      end;
    end loop;

    if v_bot_due then
      return public.insert_conquest_bot_match(p_user, p_team, v_definitions, p_bot_difficulty, p_bot_definition_ids, p_threat_ids);
    end if;
  end if;

  -- Rows of the caller's own are locked only now, never while queuing for the lock.
  delete from public.match_lobbies where host_id = p_user;
  insert into public.matchmaking_queue (user_id, mode, card_instance_ids, level, team_value)
  values (p_user, p_mode, p_team, v_level, v_value)
  on conflict (user_id) do update
  set mode = excluded.mode, card_instance_ids = excluded.card_instance_ids, level = excluded.level,
      team_value = excluded.team_value, refreshed_at = now(),
      enqueued_at = case when public.matchmaking_queue.mode = excluded.mode
                         then public.matchmaking_queue.enqueued_at else now() end;
  return null;
end;
$$;

-- Kept for Edge Functions deployed before match_queue_join started the bot:
-- the same rules, through match_queue_join. The wait and the team come from
-- the queue, never from the caller.
create or replace function public.match_create_conquest_bot(
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
  v_team uuid[];
begin
  select card_instance_ids into v_team from public.matchmaking_queue
  where user_id = p_user and mode = 'conquest'
    and enqueued_at <= now() - make_interval(secs => public.config_int('matchmaking.conquest_bot_after_seconds'));
  if v_team is null then
    return null;
  end if;
  return public.match_queue_join(p_user, 'conquest', v_team, p_threat_ids, p_difficulty, p_bot_definition_ids);
end;
$$;

-- ---------------------------------------------------------------------------
-- Friend codes
-- ---------------------------------------------------------------------------

-- Same as before, with the team checked before the lock.
create or replace function public.create_lobby(p_card_instance_ids uuid[])
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
  perform public.validate_team(v_uid, p_card_instance_ids);
  perform pg_advisory_xact_lock(hashtext('o-mega.matchmaking'));
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

-- Same as before: the host is player A. The guest's team is checked before
-- the lock; the host's under it, on the lobby as it is then (only reading, as
-- for a waiting opponent: creating the lobby settled the host's own).
create or replace function public.match_join_lobby(p_guest uuid, p_code text, p_team uuid[], p_threat_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lobby public.match_lobbies;
  v_guest_definitions uuid[];
  v_host_definitions uuid[];
begin
  select * into v_lobby from public.match_lobbies where code = upper(btrim(p_code));
  if v_lobby.code is null or v_lobby.expires_at < now() then
    raise exception 'lobby_not_found';
  end if;
  if v_lobby.host_id = p_guest then
    raise exception 'cannot_play_yourself';
  end if;
  v_guest_definitions := public.validate_team(p_guest, p_team);

  perform pg_advisory_xact_lock(hashtext('o-mega.matchmaking'));
  select * into v_lobby from public.match_lobbies where code = upper(btrim(p_code));
  if v_lobby.code is null or v_lobby.expires_at < now() then
    raise exception 'lobby_not_found';
  end if;
  v_host_definitions := public.check_team(v_lobby.host_id, v_lobby.card_instance_ids);
  return public.insert_pvp_match(
    'friendly', v_lobby.host_id, v_lobby.card_instance_ids, v_host_definitions,
    p_guest, p_team, v_guest_definitions, p_threat_ids
  );
end;
$$;

revoke execute on function public.check_team(uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.check_conquest_team(uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.insert_pvp_match(text, uuid, uuid[], uuid[], uuid, uuid[], uuid[], uuid[]) from public, anon, authenticated;
revoke execute on function public.insert_conquest_bot_match(uuid, uuid[], uuid[], text, uuid[], uuid[]) from public, anon, authenticated;
revoke execute on function public.queue_candidates(uuid, text, integer, integer, timestamptz) from public, anon, authenticated;
revoke execute on function public.match_queue_join(uuid, text, uuid[], uuid[], text, uuid[]) from public, anon, authenticated;
grant execute on function public.match_queue_join(uuid, text, uuid[], uuid[], text, uuid[]) to service_role;
