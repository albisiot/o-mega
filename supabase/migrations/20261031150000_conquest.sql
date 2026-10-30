-- M8 · Conquest mode, XP and levels, and the owner's coin rules:
-- only a Conquest loser earns coins from matches (bots and friendly matches
-- pay nothing); friend codes are friendly only, so cards never change hands
-- between players who picked each other.

delete from public.game_config where key in (
  'economy.win_coins', 'economy.participation_coins', 'economy.daily_match_coin_cap',
  'economy.same_pair_reward_window_hours', 'economy.same_pair_full_reward_matches',
  'economy.forfeit_full_reward_min_rounds',
  'economy.bot_win_coins', 'economy.bot_participation_coins', 'economy.bot_daily_coin_cap'
);

insert into public.game_config (key, value, description) values
  ('conquest.pick_timer_seconds', '30', 'Time for the winner to pick a card'),
  ('conquest.min_conquerable_cards', '3', 'Non-starter cards required in a Conquest team'),
  ('conquest.loser_coins', '10', 'Coins for the loser of a Conquest match (also both players on a draw)'),
  ('conquest.no_card_bonus_coins', '50', 'Coins for the winner when no card can be taken'),
  ('conquest.unlock_after_matches', '5', 'Completed matches that unlock Conquest'),
  ('conquest.unlock_at_level', '3', 'Level that unlocks Conquest'),
  ('conquest.max_cards_lost_per_day', '3', 'Cards a player can lose per game day'),
  ('conquest.same_pair_cooldown_hours', '24', 'Hours between Conquest matches of the same two players'),
  ('conquest.conquered_card_lock_hours', '48', 'Lock on a card after it is conquered'),
  ('matchmaking.level_range', '2', 'Conquest pairing: level difference'),
  ('matchmaking.team_value_range', '4', 'Conquest pairing: team value difference'),
  ('matchmaking.level_range_wide', '4', 'Conquest pairing after a long wait: level difference'),
  ('matchmaking.team_value_range_wide', '8', 'Conquest pairing after a long wait: team value difference'),
  ('matchmaking.widen_after_seconds', '30', 'Wait before the wider Conquest pairing applies'),
  ('progression.pvp_win_xp', '30', 'XP for a win against a player'),
  ('progression.pvp_participation_xp', '10', 'XP for a loss or draw against a player'),
  ('progression.bot_win_xp', '10', 'XP for a win against a bot'),
  ('progression.bot_participation_xp', '3', 'XP for a loss or draw against a bot'),
  ('progression.level_xp_base', '50', 'XP for level L is base * L * (L - 1)');

drop function public.pvp_reward(public.matches, text, text, text);

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.card_transfers
  add constraint card_transfers_match_id_fkey foreign key (match_id) references public.matches (id) on delete set null;
create index card_transfers_match_id_idx on public.card_transfers (match_id);

alter table public.matchmaking_queue drop constraint matchmaking_queue_mode_check;
alter table public.matchmaking_queue add constraint matchmaking_queue_mode_check check (mode in ('friendly', 'conquest'));
alter table public.matchmaking_queue
  add column level integer not null default 1,
  add column team_value integer not null default 0;

-- The winner's pick: open until chosen or expired, then settled by whoever
-- reaches the server first. The cards in it stay out of play meanwhile.
create table public.conquest_claims (
  match_id uuid primary key references public.matches (id) on delete cascade,
  winner_id uuid not null references public.profiles (id) on delete cascade,
  loser_id uuid not null references public.profiles (id) on delete cascade,
  eligible_instance_ids uuid[] not null default '{}',
  deadline_at timestamptz not null,
  chosen_instance_id uuid references public.card_instances (id),
  bonus_coins integer not null default 0,
  auto_assigned boolean not null default false,
  resolved_at timestamptz
);

create index conquest_claims_winner_id_idx on public.conquest_claims (winner_id);
create index conquest_claims_loser_id_idx on public.conquest_claims (loser_id);
create index conquest_claims_chosen_instance_id_idx on public.conquest_claims (chosen_instance_id);

alter table public.conquest_claims enable row level security;
revoke all on table public.conquest_claims from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Levels and small rules
-- ---------------------------------------------------------------------------

-- Level L needs base * L * (L - 1) XP.
create function public.level_for_xp(p_xp integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select floor((1 + sqrt(1 + 4.0 * greatest(p_xp, 0) / public.config_int('progression.level_xp_base'))) / 2)::integer
$$;

create function public.cards_lost_today(p_user uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer from public.card_transfers
  where from_user = p_user and reason = 'conquest' and public.game_day(created_at) = public.game_day()
$$;

create function public.conquest_pair_on_cooldown(p_a uuid, p_b uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.matches m
    where m.mode = 'conquest'
      and m.created_at > now() - make_interval(hours => public.config_int('conquest.same_pair_cooldown_hours'))
      and ((m.player_a = p_a and m.player_b = p_b) or (m.player_a = p_b and m.player_b = p_a))
  )
$$;

-- Sum of the rarity ranks of a team.
create function public.team_value(p_definition_ids uuid[])
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(r.rank), 0)::integer
  from unnest(p_definition_ids) as u(id)
  join public.card_definitions d on d.id = u.id
  join public.rarity_definitions r on r.code = d.rarity_code
$$;

-- ---------------------------------------------------------------------------
-- Settling a claim
-- ---------------------------------------------------------------------------

-- Moves the chosen card to the winner, atomically and on the ledger.
create function public.resolve_conquest_claim(p_match_id uuid, p_instance_id uuid, p_auto boolean)
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
      acquired_via = 'conquest',
      acquired_at = now(),
      locked_until = now() + make_interval(hours => public.config_int('conquest.conquered_card_lock_hours'))
  where id = p_instance_id and owner_id = v_claim.loser_id;
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

  perform public.notify_match(p_match_id, 'conquest');
end;
$$;

-- Assigns a random eligible card to every expired claim of a player.
create function public.settle_expired_claims(p_user uuid)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_claim public.conquest_claims;
begin
  for v_claim in
    select * from public.conquest_claims
    where resolved_at is null and deadline_at < now() and (winner_id = p_user or loser_id = p_user)
  loop
    perform public.resolve_conquest_claim(
      v_claim.match_id,
      (select u.id from unnest(v_claim.eligible_instance_ids) as u(id) order by random() limit 1),
      true
    );
  end loop;
end;
$$;

-- Fielded in a running match, or in play for an open pick. Not convertible.
create or replace function public.instance_in_active_match(p_instance_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.match_teams t
    join public.matches m on m.id = t.match_id
    where m.status = 'active' and p_instance_id = any (t.card_instance_ids)
  ) or exists (
    select 1 from public.conquest_claims c
    where c.resolved_at is null and p_instance_id = any (c.eligible_instance_ids)
  )
$$;

-- Same checks as before, after settling expired picks; cards in an open pick
-- cannot be fielded.
create or replace function public.validate_team(p_user uuid, p_instance_ids uuid[])
returns uuid[]
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_size integer := public.config_int('match.team_size');
  v_definitions uuid[];
begin
  perform public.settle_expired_claims(p_user);

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
    where c.resolved_at is null and c.eligible_instance_ids && p_instance_ids
  ) then
    raise exception 'card_at_stake' using errcode = '22023';
  end if;
  return v_definitions;
end;
$$;

-- Everything a player must satisfy to enter Conquest with a team.
create function public.validate_conquest_team(p_user uuid, p_instance_ids uuid[])
returns uuid[]
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_definitions uuid[] := public.validate_team(p_user, p_instance_ids);
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

-- Opens the winner's pick, or pays the bonus when no card can be taken.
create function public.open_conquest_claim(p_match_id uuid, p_winner_side text)
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
begin
  select * into v_winner from public.match_teams where match_id = p_match_id and side = p_winner_side;
  select * into v_loser from public.match_teams where match_id = p_match_id and side <> p_winner_side;

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
    v_bonus := public.config_int('conquest.no_card_bonus_coins');
    insert into public.conquest_claims (match_id, winner_id, loser_id, deadline_at, bonus_coins, resolved_at)
    values (p_match_id, v_winner.user_id, v_loser.user_id, now(), v_bonus, now());
    insert into public.coin_ledger (user_id, amount, reason, ref_id)
    values (v_winner.user_id, v_bonus, 'conquest_bonus', p_match_id);
  else
    insert into public.conquest_claims (match_id, winner_id, loser_id, eligible_instance_ids, deadline_at)
    values (
      p_match_id, v_winner.user_id, v_loser.user_id, v_eligible,
      now() + make_interval(secs => public.config_int('conquest.pick_timer_seconds'))
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- End of a match: statistics, XP, coins and the Conquest pick.
-- ---------------------------------------------------------------------------

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
      when v_match.mode = 'bot' and v_won then public.config_int('progression.bot_win_xp')
      when v_match.mode = 'bot' then public.config_int('progression.bot_participation_xp')
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

    if v_match.mode = 'bot' then
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

-- Players who already qualify keep their progress.
update public.profiles p
set conquest_unlocked = true
where (select count(*) from public.matches m
       where m.status = 'finished' and m.end_reason = 'completed' and (m.player_a = p.id or m.player_b = p.id))
      >= public.config_int('conquest.unlock_after_matches');

-- ---------------------------------------------------------------------------
-- Matchmaking
-- ---------------------------------------------------------------------------

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
  v_threats integer := public.config_int('match.threats_per_match');
  v_definitions_a uuid[];
  v_definitions_b uuid[];
  v_levels integer[];
  v_match uuid;
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

drop function public.match_queue_join(uuid, uuid[], uuid[]);

-- Joins (or refreshes) a queue. Returns the match id when a suitable opponent
-- was waiting, null otherwise. Called again by the waiting client.
create function public.match_queue_join(p_user uuid, p_mode text, p_team uuid[], p_threat_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_opponent public.matchmaking_queue;
  v_stale integer := public.config_int('matchmaking.queue_stale_seconds');
  v_widen integer := public.config_int('matchmaking.widen_after_seconds');
  v_definitions uuid[];
  v_level integer;
  v_value integer;
  v_since timestamptz;
begin
  if p_mode not in ('friendly', 'conquest') then
    raise exception 'invalid_request';
  end if;
  -- Serializes matchmaking: two players can never be paired twice at once.
  perform pg_advisory_xact_lock(hashtext('o-mega.matchmaking'));

  v_definitions := case p_mode
    when 'conquest' then public.validate_conquest_team(p_user, p_team)
    else public.validate_team(p_user, p_team)
  end;
  if public.has_active_match(p_user) then
    raise exception 'match_already_active';
  end if;
  delete from public.match_lobbies where host_id = p_user;

  select level into v_level from public.profiles where id = p_user;
  v_value := public.team_value(v_definitions);
  select enqueued_at into v_since from public.matchmaking_queue where user_id = p_user and mode = p_mode;
  v_since := coalesce(v_since, now());

  for v_opponent in
    select q.* from public.matchmaking_queue q
    where q.user_id <> p_user and q.mode = p_mode
      and q.refreshed_at > now() - make_interval(secs => v_stale)
      and (
        p_mode = 'friendly'
        or (
          not public.conquest_pair_on_cooldown(p_user, q.user_id)
          and case
            when least(v_since, q.enqueued_at) < now() - make_interval(secs => v_widen) then
              abs(q.level - v_level) <= public.config_int('matchmaking.level_range_wide')
              and abs(q.team_value - v_value) <= public.config_int('matchmaking.team_value_range_wide')
            else
              abs(q.level - v_level) <= public.config_int('matchmaking.level_range')
              and abs(q.team_value - v_value) <= public.config_int('matchmaking.team_value_range')
          end
        )
      )
    order by q.enqueued_at
  loop
    begin
      -- The player who waited longer is player A.
      return public.create_pvp_match(p_mode, v_opponent.user_id, v_opponent.card_instance_ids, p_user, p_team, p_threat_ids);
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

revoke execute on function public.match_queue_join(uuid, text, uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public.match_queue_join(uuid, text, uuid[], uuid[]) to service_role;

revoke execute on function public.level_for_xp(integer) from public, anon, authenticated;
revoke execute on function public.cards_lost_today(uuid) from public, anon, authenticated;
revoke execute on function public.conquest_pair_on_cooldown(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.team_value(uuid[]) from public, anon, authenticated;
revoke execute on function public.resolve_conquest_claim(uuid, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.settle_expired_claims(uuid) from public, anon, authenticated;
revoke execute on function public.validate_conquest_team(uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.open_conquest_claim(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Visible state, now with the Conquest pick
-- ---------------------------------------------------------------------------

create function public.conquest_payload(p_match_id uuid, p_side text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'role', case when (p_side = 'a') = (m.player_a = c.winner_id) then 'winner' else 'loser' end,
    'deadline_at', c.deadline_at,
    'resolved', c.resolved_at is not null,
    'auto_assigned', c.auto_assigned,
    'bonus_coins', c.bonus_coins,
    'chosen', case when c.chosen_instance_id is null then null else
      (select public.card_payload(i.definition_id) from public.card_instances i where i.id = c.chosen_instance_id)
    end,
    -- The loser's whole team, shown to the winner only and only while picking.
    'offered', case
      when c.resolved_at is null and (p_side = 'a') = (m.player_a = c.winner_id) then (
        select jsonb_agg(public.card_payload(u.definition_id) || jsonb_build_object(
          'instance_id', u.instance_id,
          'eligible', u.instance_id = any (c.eligible_instance_ids)
        ) order by u.ord)
        from public.match_teams t,
             unnest(t.card_instance_ids, t.definition_ids) with ordinality as u(instance_id, definition_id, ord)
        where t.match_id = p_match_id and t.user_id = c.loser_id
      )
      else null
    end
  )
  from public.conquest_claims c
  join public.matches m on m.id = c.match_id
  where c.match_id = p_match_id
$$;

revoke execute on function public.conquest_payload(uuid, text) from public, anon, authenticated;

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
    'conquest', public.conquest_payload(p_match_id, p_side),
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

-- ---------------------------------------------------------------------------
-- Client RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_match_state(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_side text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select case when player_a = auth.uid() then 'a' when player_b = auth.uid() then 'b' end into v_side
  from public.matches where id = p_match_id;
  if v_side is null then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;
  perform public.settle_expired_claims(auth.uid());
  return public.match_state_payload(p_match_id, v_side);
end;
$$;

-- The winner picks a card (null: only settles a pick whose time is up).
create function public.claim_conquest_card(p_match_id uuid, p_card_instance_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_claim public.conquest_claims;
  v_side text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select case when player_a = v_uid then 'a' when player_b = v_uid then 'b' end into v_side
  from public.matches where id = p_match_id;
  if v_side is null then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;

  perform public.settle_expired_claims(v_uid);
  select * into v_claim from public.conquest_claims where match_id = p_match_id;
  if p_card_instance_id is not null then
    if v_claim.winner_id is distinct from v_uid then
      raise exception 'card_not_eligible';
    end if;
    -- Already settled (by us or by the timer): the state tells what happened.
    if v_claim.resolved_at is null then
      perform public.resolve_conquest_claim(p_match_id, p_card_instance_id, false);
    end if;
  end if;
  return public.match_state_payload(p_match_id, v_side);
end;
$$;

-- What the Gioca page needs to offer Conquest.
create function public.get_conquest_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.settle_expired_claims(v_uid);
  select * into v_profile from public.profiles where id = v_uid;
  return jsonb_build_object(
    'unlocked', v_profile.conquest_unlocked,
    'completed_matches', (
      select count(*) from public.matches m
      where m.status = 'finished' and m.end_reason = 'completed' and (m.player_a = v_uid or m.player_b = v_uid)
    ),
    'level', v_profile.level,
    'cards_lost_today', public.cards_lost_today(v_uid)
  );
end;
$$;

-- The player's conquered and lost cards, newest first (SPEC §3).
create function public.get_conquest_history()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'won', t.to_user = auth.uid(),
    'created_at', t.created_at,
    'opponent', (select p.username from public.profiles p
                 where p.id = case when t.to_user = auth.uid() then t.from_user else t.to_user end),
    'card', public.card_payload(i.definition_id)
  ) order by t.created_at desc), '[]'::jsonb)
  from public.card_transfers t
  join public.card_instances i on i.id = t.instance_id
  where t.reason = 'conquest' and auth.uid() in (t.from_user, t.to_user)
$$;

-- Same as before, after settling expired picks.
create or replace function public.get_collection()
returns table (
  definition_id uuid,
  copies integer,
  starter_copies integer,
  locked_copies integer,
  convertible_copies integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.settle_expired_claims(auth.uid());
  return query select * from public.collection_summary(auth.uid());
end;
$$;

revoke execute on function public.claim_conquest_card(uuid, uuid) from public, anon;
revoke execute on function public.get_conquest_status() from public, anon;
revoke execute on function public.get_conquest_history() from public, anon;
grant execute on function public.claim_conquest_card(uuid, uuid) to authenticated;
grant execute on function public.get_conquest_status() to authenticated;
grant execute on function public.get_conquest_history() to authenticated;
