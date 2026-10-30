-- M6 · Formations and matches against bots.
--
-- The Edge Function "match" runs the rules engine (packages/game-engine) and
-- stores results through the service-only functions below, which re-check
-- ownership, round order and the final result. Clients never read the match
-- tables: they get a filtered view of the state from get_match_state().

insert into public.game_config (key, value, description) values
  ('match.team_size', '5', 'Characters per team'),
  ('match.threats_per_match', '5', 'Threats (rounds) per match'),
  ('match.rounds_to_win', '3', 'Rounds needed to win a match'),
  ('match.round_timer_seconds', '30', 'Time to choose a character'),
  ('match.reveal_pause_seconds', '5', 'Pause to show a round result before the next timer starts'),
  ('match.timeout_grace_seconds', '3', 'Network tolerance after the deadline'),
  ('match.threat_levels.min', '1', 'Lowest threat level'),
  ('match.threat_levels.max', '6', 'Highest threat level'),
  ('match.threat_levels.require_one_at_most', '2', 'At least one threat at or below this level'),
  ('match.threat_levels.require_one_at_least', '5', 'At least one threat at or above this level'),
  ('match.threat_levels.min_sum', '14', 'Minimum sum of the threat levels of a match'),
  ('match.threat_levels.max_sum', '20', 'Maximum sum of the threat levels of a match'),
  ('economy.bot_win_coins', '25', 'Coins for a win against a bot'),
  ('economy.bot_participation_coins', '8', 'Coins for a loss or draw against a bot'),
  ('economy.bot_daily_coin_cap', '150', 'Daily cap of coins from bot matches'),
  ('formations.max_per_player', '10', 'Saved formations per player');

alter table public.coin_ledger drop constraint coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in (
  'pack_purchase', 'match_reward', 'bot_match_reward', 'duplicate_conversion', 'conquest_bonus', 'admin_adjustment'
));

-- Bot matches count in matches_played; wins/losses/draws stay for PvP.
alter table public.profiles
  add column bot_wins integer not null default 0 check (bot_wins >= 0),
  add column bot_losses integer not null default 0 check (bot_losses >= 0),
  add column bot_draws integer not null default 0 check (bot_draws >= 0);

-- ---------------------------------------------------------------------------
-- Teams and formations
-- ---------------------------------------------------------------------------

-- Checks a team of card instances and returns their characters, in order.
create function public.validate_team(p_user uuid, p_instance_ids uuid[])
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
  return v_definitions;
end;
$$;

revoke execute on function public.validate_team(uuid, uuid[]) from public, anon, authenticated;

create table public.formations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  card_instance_ids uuid[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index formations_user_id_idx on public.formations (user_id);

alter table public.formations enable row level security;
revoke all on table public.formations from anon, authenticated;
grant select on table public.formations to authenticated;
create policy "players read their own formations"
  on public.formations for select to authenticated
  using ((select auth.uid()) = user_id);

-- Creates (p_formation_id null) or replaces a saved formation.
create function public.save_formation(p_formation_id uuid, p_name text, p_card_instance_ids uuid[])
returns public.formations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_formation public.formations;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 30 then
    raise exception 'invalid_formation_name' using errcode = '22023';
  end if;
  perform public.validate_team(v_uid, p_card_instance_ids);

  perform 1 from public.profiles where id = v_uid for update;
  if p_formation_id is null then
    if (select count(*) from public.formations where user_id = v_uid) >= public.config_int('formations.max_per_player') then
      raise exception 'too_many_formations';
    end if;
    insert into public.formations (user_id, name, card_instance_ids)
    values (v_uid, btrim(p_name), p_card_instance_ids)
    returning * into v_formation;
  else
    update public.formations
    set name = btrim(p_name), card_instance_ids = p_card_instance_ids, updated_at = now()
    where id = p_formation_id and user_id = v_uid
    returning * into v_formation;
    if v_formation.id is null then
      raise exception 'formation_not_found' using errcode = 'P0002';
    end if;
  end if;
  return v_formation;
end;
$$;

create function public.delete_formation(p_formation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  delete from public.formations where id = p_formation_id and user_id = auth.uid();
  if not found then
    raise exception 'formation_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.save_formation(uuid, text, uuid[]) from public, anon;
revoke execute on function public.delete_formation(uuid) from public, anon;
grant execute on function public.save_formation(uuid, text, uuid[]) to authenticated;
grant execute on function public.delete_formation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Matches
-- ---------------------------------------------------------------------------

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('bot', 'friendly', 'conquest')),
  bot_difficulty text check (bot_difficulty in ('easy', 'medium', 'hard', 'super_pro')),
  status text not null default 'active' check (status in ('active', 'finished')),
  player_a uuid not null references public.profiles (id) on delete cascade,
  player_b uuid references public.profiles (id) on delete cascade,
  -- Hidden from clients until each threat is revealed.
  threat_ids uuid[] not null,
  threat_levels integer[] not null,
  current_round integer not null default 1,
  rounds_won_a integer not null default 0,
  rounds_won_b integer not null default 0,
  total_score_a integer not null default 0,
  total_score_b integer not null default 0,
  result text check (result in ('a', 'b', 'draw')),
  end_reason text check (end_reason in ('completed', 'forfeit')),
  reward_coins_a integer,
  reward_coins_b integer,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint matches_bot_shape check ((mode = 'bot') = (bot_difficulty is not null)),
  constraint matches_bot_has_no_player_b check (mode <> 'bot' or player_b is null),
  constraint matches_finished_shape check ((status = 'finished') = (result is not null and finished_at is not null))
);

-- One running match per player.
create unique index matches_one_active_player_a on public.matches (player_a) where status = 'active';
create index matches_player_b_idx on public.matches (player_b);

create table public.match_teams (
  match_id uuid not null references public.matches (id) on delete cascade,
  side text not null check (side in ('a', 'b')),
  -- Null for a bot.
  user_id uuid references public.profiles (id) on delete cascade,
  card_instance_ids uuid[],
  definition_ids uuid[] not null,
  primary key (match_id, side)
);

create index match_teams_user_id_idx on public.match_teams (user_id);

create table public.match_rounds (
  match_id uuid not null references public.matches (id) on delete cascade,
  round integer not null check (round >= 1),
  threat_id uuid not null references public.threat_definitions (id),
  opened_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  -- 'none': void round.
  winner_side text check (winner_side in ('a', 'b', 'none')),
  resolved_at timestamptz,
  primary key (match_id, round)
);

create index match_rounds_threat_id_idx on public.match_rounds (threat_id);

create table public.round_plays (
  match_id uuid not null,
  round integer not null,
  side text not null check (side in ('a', 'b')),
  card_instance_id uuid references public.card_instances (id),
  definition_id uuid not null references public.card_definitions (id),
  base_score integer not null,
  bonus integer not null,
  score integer not null,
  highest_value integer not null,
  auto_played boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (match_id, round, side),
  foreign key (match_id, round) references public.match_rounds (match_id, round) on delete cascade
);

create index round_plays_card_instance_id_idx on public.round_plays (card_instance_id);
create index round_plays_definition_id_idx on public.round_plays (definition_id);

alter table public.matches enable row level security;
alter table public.match_teams enable row level security;
alter table public.match_rounds enable row level security;
alter table public.round_plays enable row level security;
revoke all on table public.matches, public.match_teams, public.match_rounds, public.round_plays
  from anon, authenticated;

-- The Edge Function (service_role) reads what the engine needs. New tables
-- are not exposed automatically in this project, not even to service_role.
grant select on table
  public.matches, public.match_teams, public.match_rounds, public.round_plays,
  public.card_definitions, public.card_instances, public.threat_definitions,
  public.ability_definitions, public.game_config
to service_role;

-- ---------------------------------------------------------------------------
-- Collection: cards fielded in a running match cannot be converted.
-- ---------------------------------------------------------------------------

create function public.instance_in_active_match(p_instance_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.match_teams t
    join public.matches m on m.id = t.match_id
    where m.status = 'active' and p_instance_id = any (t.card_instance_ids)
  )
$$;

revoke execute on function public.instance_in_active_match(uuid) from public, anon, authenticated;

create or replace function public.collection_summary(p_user uuid)
returns table (
  definition_id uuid,
  copies integer,
  starter_copies integer,
  locked_copies integer,
  convertible_copies integer
)
language sql
stable
set search_path = ''
as $$
  select
    s.definition_id,
    s.copies,
    s.starter_copies,
    s.locked_copies,
    least(s.free_copies, s.copies - 1) as convertible_copies
  from (
    select
      i.definition_id,
      count(*)::integer as copies,
      (count(*) filter (where i.is_starter))::integer as starter_copies,
      (count(*) filter (where i.locked_until > now()))::integer as locked_copies,
      (count(*) filter (
        where not i.is_starter
          and (i.locked_until is null or i.locked_until <= now())
          and not public.instance_in_active_match(i.id)
      ))::integer as free_copies
    from public.card_instances i
    where i.owner_id = p_user
    group by i.definition_id
  ) s
$$;

create or replace function public.convert_definition_duplicates(
  p_user uuid,
  p_definition_id uuid,
  p_count integer,
  out converted integer,
  out coins integer
)
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_convertible integer;
  v_value integer;
  v_ids uuid[];
begin
  select s.convertible_copies into v_convertible
  from public.collection_summary(p_user) s
  where s.definition_id = p_definition_id;

  select coalesce(array_agg(c.id), '{}') into v_ids from (
    select i.id
    from public.card_instances i
    where i.owner_id = p_user
      and i.definition_id = p_definition_id
      and not i.is_starter
      and (i.locked_until is null or i.locked_until <= now())
      and not public.instance_in_active_match(i.id)
    order by i.acquired_at desc, i.id
    limit greatest(0, least(coalesce(p_count, v_convertible, 0), coalesce(v_convertible, 0)))
  ) c;

  converted := cardinality(v_ids);
  coins := 0;
  if converted = 0 then
    return;
  end if;

  update public.card_instances set owner_id = null, converted_at = now() where id = any (v_ids);

  insert into public.card_transfers (instance_id, from_user, to_user, reason)
  select u.id, p_user, null, 'conversion' from unnest(v_ids) as u(id);

  select r.duplicate_coin_value into v_value
  from public.card_definitions d
  join public.rarity_definitions r on r.code = d.rarity_code
  where d.id = p_definition_id;

  if v_value > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id)
    select p_user, v_value, 'duplicate_conversion', u.id from unnest(v_ids) as u(id);
  end if;
  coins := v_value * converted;
end;
$$;

-- ---------------------------------------------------------------------------
-- Service-only functions used by the Edge Function
-- ---------------------------------------------------------------------------

create function public.match_create_bot(
  p_user uuid,
  p_difficulty text,
  p_card_instance_ids uuid[],
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
  v_definitions uuid[];
  v_levels integer[];
  v_match uuid;
begin
  perform 1 from public.profiles where id = p_user for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.matches
    where status = 'active' and (player_a = p_user or player_b = p_user)
  ) then
    raise exception 'match_already_active';
  end if;

  v_definitions := public.validate_team(p_user, p_card_instance_ids);

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
  values ('bot', p_difficulty, p_user, p_threat_ids, v_levels)
  returning id into v_match;

  insert into public.match_teams (match_id, side, user_id, card_instance_ids, definition_ids) values
    (v_match, 'a', p_user, p_card_instance_ids, v_definitions),
    (v_match, 'b', null, null, p_bot_definition_ids);

  insert into public.match_rounds (match_id, round, threat_id, deadline_at)
  values (
    v_match, 1, p_threat_ids[1],
    now() + make_interval(secs => public.config_int('match.reveal_pause_seconds')
                                  + public.config_int('match.round_timer_seconds'))
  );

  return v_match;
end;
$$;

-- Ends a match: result, bot rewards (daily cap) and statistics.
create function public.finish_match(p_match_id uuid, p_result text, p_reason text)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_match public.matches;
  v_reward integer := 0;
  v_earned integer;
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
  end if;
end;
$$;

-- Stores a resolved round computed by the engine. Re-checks the round order,
-- the cards and the final result; opens the next round or ends the match.
-- p_play_*: {card_instance_id?, definition_id, base, bonus, score, highest, auto_played}
create function public.match_record_round(
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

    -- A human choice after the deadline is refused: the engine must auto-play.
    if v_team.user_id is not null and not coalesce((v_play ->> 'auto_played')::boolean, false)
       and now() > v_round.deadline_at + make_interval(secs => v_grace) then
      raise exception 'round_expired';
    end if;

    insert into public.round_plays (
      match_id, round, side, card_instance_id, definition_id,
      base_score, bonus, score, highest_value, auto_played
    ) values (
      p_match_id, p_round, v_side, v_instance, v_definition,
      (v_play ->> 'base')::integer, (v_play ->> 'bonus')::integer, (v_play ->> 'score')::integer,
      (v_play ->> 'highest')::integer, coalesce((v_play ->> 'auto_played')::boolean, false)
    );
  end loop;

  update public.match_rounds
  set winner_side = coalesce(p_winner_side, 'none'), resolved_at = now()
  where match_id = p_match_id and round = p_round;

  update public.matches
  -- "is not distinct from": a void round (null winner) must count as 0, not null.
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
  end if;
end;
$$;

revoke execute on function public.finish_match(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.match_create_bot(uuid, text, uuid[], uuid[], uuid[]) from public, anon, authenticated;
revoke execute on function public.match_record_round(uuid, integer, jsonb, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.match_create_bot(uuid, text, uuid[], uuid[], uuid[]) to service_role;
grant execute on function public.match_record_round(uuid, integer, jsonb, jsonb, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- What a player may see of a match (SPEC §10.2): threat levels, revealed
-- threats, their own team, and the opponent's characters already played.
-- ---------------------------------------------------------------------------

create function public.card_payload(p_definition_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'definition_id', d.id,
    'code', d.code,
    'name', d.name,
    'faction', d.faction,
    'flavor', d.flavor,
    'stats', d.stats,
    'rarity', jsonb_build_object('code', r.code, 'name', r.name, 'rank', r.rank, 'color', r.color),
    'power', case when d.power_code is null then null else jsonb_build_object(
      'code', d.power_code,
      'params', d.power_params,
      'name', p.name,
      'text', public.power_text(d.power_code, d.power_params)
    ) end
  )
  from public.card_definitions d
  join public.rarity_definitions r on r.code = d.rarity_code
  left join public.power_definitions p on p.code = d.power_code
  where d.id = p_definition_id
$$;

-- Security definer: called by get_match_state and by the Edge Function, it
-- needs the catalog tables and power_text whatever the caller's role.
create function public.match_state_payload(p_match_id uuid, p_side text)
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
  )
  select jsonb_build_object(
    'id', m.id,
    'mode', m.mode,
    'bot_difficulty', m.bot_difficulty,
    'status', m.status,
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

revoke execute on function public.card_payload(uuid) from public, anon, authenticated;
revoke execute on function public.match_state_payload(uuid, text) from public, anon, authenticated;
grant execute on function public.match_state_payload(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Client RPCs
-- ---------------------------------------------------------------------------

create function public.get_match_state(p_match_id uuid)
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
  return public.match_state_payload(p_match_id, v_side);
end;
$$;

-- The caller's running match, if any.
create function public.get_active_match()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', m.id, 'mode', m.mode, 'bot_difficulty', m.bot_difficulty, 'current_round', m.current_round)
  from public.matches m
  where m.status = 'active' and (m.player_a = auth.uid() or m.player_b = auth.uid())
  limit 1
$$;

-- Leaving a match counts as a defeat (SPEC §5.7), with no reward.
create function public.forfeit_match(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_side text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_match from public.matches where id = p_match_id for update;
  v_side := case when v_match.player_a = auth.uid() then 'a' when v_match.player_b = auth.uid() then 'b' end;
  if v_side is null then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;
  if v_match.status <> 'active' then
    raise exception 'match_not_active';
  end if;
  perform public.finish_match(p_match_id, case v_side when 'a' then 'b' else 'a' end, 'forfeit');
  return public.match_state_payload(p_match_id, v_side);
end;
$$;

revoke execute on function public.get_match_state(uuid) from public, anon;
revoke execute on function public.get_active_match() from public, anon;
revoke execute on function public.forfeit_match(uuid) from public, anon;
grant execute on function public.get_match_state(uuid) to authenticated;
grant execute on function public.get_active_match() to authenticated;
grant execute on function public.forfeit_match(uuid) to authenticated;
