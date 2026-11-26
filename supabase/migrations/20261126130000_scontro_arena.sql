-- Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 6a: challenges between players, never live.
-- Decided by the user on 26 November 2026. Every player saves a defence (five unlocked characters in
-- their places, with strategy and orders); a challenge is a battle against one of three opponents
-- with a Gloria close to the player's, whose defence the computer plays with its saved orders. A
-- finished challenge moves the attacker's Gloria (as the Fama of the Classificata, without streaks
-- or league floors) and a third of it for the defender; the first challenges of the day pay XP and
-- coins; no card is ever at stake. Without three defences close enough the list is completed with
-- teams of the computer, shown as such. A challenge given up counts as a loss.
--
--   * combat_defenses: each player's defence (closed to clients; the "match" Edge Function reads it);
--   * combat_arena_players: each player's Gloria and when they last read their defences;
--   * combat_arena_offers: today's three opponents of each player and the lists renewed today;
--   * combat_battles gains kind ('computer' or 'arena'), the opponent, its orders and the Gloria moved.

insert into public.game_config (key, value, description) values
  ('combat_arena.choices', '3', 'Scontro a squadre, challenges: opponents offered at a time.'),
  ('combat_arena.range', '150', 'Scontro a squadre, challenges: opponents within this Gloria of the player first...'),
  ('combat_arena.range_wide', '400', '...then within this, then anyone.'),
  ('combat_arena.refreshes_daily', '5', 'Scontro a squadre, challenges: lists of opponents a player can renew in a game day (a new list after each challenge is free).'),
  ('combat_arena.win_points', '25', 'Scontro a squadre, challenges: Gloria of a win against the same Gloria.'),
  ('combat_arena.loss_points', '20', 'Scontro a squadre, challenges: Gloria a loss takes against the same Gloria.'),
  ('combat_arena.points_per_step', '20', 'Scontro a squadre, challenges: every this much Gloria the opponent has more, one point more on a win and one less on a loss.'),
  ('combat_arena.win_min', '10', 'Scontro a squadre, challenges: least Gloria of a win.'),
  ('combat_arena.win_max', '40', 'Scontro a squadre, challenges: most Gloria of a win.'),
  ('combat_arena.loss_min', '5', 'Scontro a squadre, challenges: least Gloria a loss takes.'),
  ('combat_arena.loss_max', '35', 'Scontro a squadre, challenges: most Gloria a loss takes.'),
  ('combat_arena.no_loss_below', '300', 'Scontro a squadre, challenges: below this Gloria a loss takes nothing.'),
  ('combat_arena.same_opponent_daily', '3', 'Scontro a squadre, challenges: challenges against the same player that move the Gloria in a game day.'),
  ('combat_arena.defense_share_percent', '33', 'Scontro a squadre, challenges: the share of a challenge''s Gloria the defender wins or loses (at least 1).'),
  ('combat_arena.computer_spread', '100', 'Scontro a squadre, challenges: a team of the computer has the player''s Gloria give or take this.'),
  ('combat_arena.rewards.daily_battles', '5', 'Scontro a squadre, challenges: finished challenges that pay in a game day (apart from the battles against the computer).'),
  ('combat_arena.rewards.win_xp', '25', 'Scontro a squadre, challenges: XP of a win.'),
  ('combat_arena.rewards.win_coins', '20', 'Scontro a squadre, challenges: coins of a win.'),
  ('combat_arena.rewards.loss_xp', '10', 'Scontro a squadre, challenges: XP of a loss or a draw.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.combat_defenses (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- In their places, F1, F2, R1, R2, R3.
  card_instance_ids uuid[] not null,
  definition_ids uuid[] not null,
  -- The engine's CombatTactics, checked by the Edge Function when saved.
  tactics jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.combat_defenses enable row level security;
revoke all on table public.combat_defenses from anon, authenticated;
grant select on table public.combat_defenses to service_role;

create table public.combat_arena_players (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  -- The defences finished after this are new to the player.
  defenses_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.combat_arena_players enable row level security;
revoke all on table public.combat_arena_players from anon, authenticated;
grant select on table public.combat_arena_players to service_role;

create table public.combat_arena_offers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- The game day of `refreshes`.
  day date not null,
  -- [{kind: "player", user_id, name, points, definition_ids} | {kind: "computer", name, points, definition_ids}]
  offers jsonb not null check (jsonb_typeof(offers) = 'array'),
  refreshes integer not null default 0,
  made_at timestamptz not null default now()
);
alter table public.combat_arena_offers enable row level security;
revoke all on table public.combat_arena_offers from anon, authenticated;
grant select on table public.combat_arena_offers to service_role;

alter table public.combat_battles
  add column kind text not null default 'computer' check (kind in ('computer', 'arena')),
  add column opponent_id uuid references public.profiles (id) on delete set null,
  -- A challenge's opponent as offered: kind, name, Gloria at the start, characters.
  add column opponent jsonb,
  -- The defender's orders (null: the computer's own).
  add column opponent_tactics jsonb,
  add column points_change integer,
  add column opponent_points_change integer;
create index combat_battles_opponent_idx on public.combat_battles (opponent_id, finished_at) where kind = 'arena';

-- ---------------------------------------------------------------------------
-- Gloria
-- ---------------------------------------------------------------------------

create function public.combat_arena_points(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select a.points from public.combat_arena_players a where a.user_id = p_user), 0)
$$;

-- What a win gives or a loss takes against an opponent's Gloria, before the protections.
create function public.combat_arena_nominal(p_points integer, p_opponent_points integer, p_outcome text)
returns integer
language plpgsql
stable
set search_path = ''
as $$
declare
  v_shift integer := (p_opponent_points - p_points) / public.config_int('combat_arena.points_per_step');
begin
  if p_outcome = 'win' then
    return least(public.config_int('combat_arena.win_max'), greatest(public.config_int('combat_arena.win_min'), public.config_int('combat_arena.win_points') + v_shift));
  end if;
  return least(public.config_int('combat_arena.loss_max'), greatest(public.config_int('combat_arena.loss_min'), public.config_int('combat_arena.loss_points') - v_shift));
end;
$$;

-- A finished (or given up) challenge: the Gloria of both sides. A draw, or a fourth challenge of the
-- day against the same player, moves nothing; a loss below combat_arena.no_loss_below takes nothing.
create function public.combat_arena_score(p_battle uuid, p_outcome text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_battle public.combat_battles;
  v_points integer;
  v_opponent_points integer;
  v_change integer := 0;
  v_defense integer;
  v_magnitude integer;
  v_floor integer := public.config_int('combat_arena.no_loss_below');
begin
  select * into v_battle from public.combat_battles where id = p_battle;
  if not found or v_battle.kind <> 'arena' then
    return;
  end if;
  v_points := public.combat_arena_points(v_battle.user_id);
  v_opponent_points := case when v_battle.opponent_id is null then coalesce((v_battle.opponent ->> 'points')::integer, v_points)
                            else public.combat_arena_points(v_battle.opponent_id) end;
  if p_outcome in ('win', 'loss')
     and (v_battle.opponent_id is null or (
       select count(*) from public.combat_battles b
       where b.user_id = v_battle.user_id and b.kind = 'arena' and b.opponent_id = v_battle.opponent_id and b.id <> p_battle
         and b.points_change is not null and public.game_day(b.finished_at) = public.game_day()
     ) < public.config_int('combat_arena.same_opponent_daily')) then
    v_change := public.combat_arena_nominal(v_points, v_opponent_points, p_outcome);
    if p_outcome = 'loss' then
      v_change := case when v_points < v_floor then 0 else -least(v_points, v_change) end;
    end if;
    if v_battle.opponent_id is not null then
      v_magnitude := greatest(1, round(public.combat_arena_nominal(v_opponent_points, v_points, case p_outcome when 'win' then 'loss' else 'win' end)
                                       * public.config_int('combat_arena.defense_share_percent') / 100.0)::integer);
      v_defense := case when p_outcome = 'loss' then v_magnitude
                        when v_opponent_points < v_floor then 0
                        else -least(v_opponent_points, v_magnitude) end;
    end if;
  else
    v_defense := case when v_battle.opponent_id is null then null else 0 end;
  end if;

  insert into public.combat_arena_players (user_id, points) values (v_battle.user_id, greatest(0, v_change))
  on conflict (user_id) do update set points = public.combat_arena_players.points + v_change, updated_at = now();
  if v_battle.opponent_id is not null then
    insert into public.combat_arena_players (user_id, points) values (v_battle.opponent_id, greatest(0, coalesce(v_defense, 0)))
    on conflict (user_id) do update set points = public.combat_arena_players.points + coalesce(v_defense, 0), updated_at = now();
  end if;
  update public.combat_battles set points_change = v_change, opponent_points_change = v_defense where id = p_battle;
end;
$$;

-- ---------------------------------------------------------------------------
-- Defences and opponents
-- ---------------------------------------------------------------------------

-- A defence that can still fight: every card still the player's, every character with a kit.
create function public.combat_defense_ok(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.combat_defenses d
    where d.user_id = p_user
      and (select count(*)
           from unnest(d.card_instance_ids, d.definition_ids) as u(instance_id, definition_id)
           join public.card_instances i on i.id = u.instance_id and i.owner_id = p_user and i.definition_id = u.definition_id
           join public.combat_kits k on k.definition_id = u.definition_id) = cardinality(d.card_instance_ids)
  )
$$;

-- A new list of opponents: players with a defence that can fight and a Gloria close to the player's
-- (within combat_arena.range, then range_wide, then anyone), completed with teams of the computer.
create function public.combat_arena_make_offers(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_points integer := public.combat_arena_points(p_user);
  v_choices integer := public.config_int('combat_arena.choices');
  v_spread integer := public.config_int('combat_arena.computer_spread');
  v_band integer;
  v_offers jsonb := '[]'::jsonb;
  v_definitions uuid[];
  r record;
begin
  foreach v_band in array array[public.config_int('combat_arena.range'), public.config_int('combat_arena.range_wide'), 2147483647] loop
    exit when (select count(*) from public.combat_defenses d
               where d.user_id <> p_user and public.combat_defense_ok(d.user_id)
                 and abs(public.combat_arena_points(d.user_id) - v_points) <= v_band) >= v_choices;
  end loop;
  for r in
    select d.user_id, p.username as name, public.combat_arena_points(d.user_id) as points, d.definition_ids
    from public.combat_defenses d
    join public.profiles p on p.id = d.user_id
    where d.user_id <> p_user and public.combat_defense_ok(d.user_id)
      and abs(public.combat_arena_points(d.user_id) - v_points) <= v_band
    order by random()
    limit v_choices
  loop
    v_offers := v_offers || jsonb_build_array(jsonb_build_object(
      'kind', 'player', 'user_id', r.user_id, 'name', r.name, 'points', r.points, 'definition_ids', to_jsonb(r.definition_ids)));
  end loop;
  while jsonb_array_length(v_offers) < v_choices loop
    select array_agg(x.id) into v_definitions
    from (select d.id from public.combat_kits k join public.card_definitions d on d.id = k.definition_id and d.is_active
          order by random() limit public.config_int('combat.team_size')) x;
    v_offers := v_offers || jsonb_build_array(jsonb_build_object(
      'kind', 'computer', 'name', 'Squadra del computer',
      'points', greatest(0, v_points - v_spread + floor(random() * (2 * v_spread + 1))::integer),
      'definition_ids', to_jsonb(v_definitions)));
  end loop;

  insert into public.combat_arena_offers (user_id, day, offers, refreshes) values (p_user, public.game_day(), v_offers, 0)
  on conflict (user_id) do update
  set offers = excluded.offers,
      made_at = now(),
      refreshes = case when public.combat_arena_offers.day = excluded.day then public.combat_arena_offers.refreshes else 0 end,
      day = excluded.day;
  return v_offers;
end;
$$;

-- The defence (the Edge Function, which checks the orders with the engine first).
create function public.combat_defense_save(p_user uuid, p_card_instance_ids uuid[], p_tactics jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_definitions uuid[];
begin
  perform 1 from public.profiles where id = p_user for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  perform public.assert_modes_open(array['combat']);
  v_definitions := public.check_team_of(p_user, p_card_instance_ids, public.config_int('combat.team_size'));
  if exists (select 1 from unnest(v_definitions) as d(id) where not exists (select 1 from public.combat_kits k where k.definition_id = d.id)) then
    raise exception 'combat_no_kit' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(v_definitions) as d(id) where not public.combat_kit_unlocked(p_user, d.id)) then
    raise exception 'combat_locked' using errcode = '22023';
  end if;
  if jsonb_typeof(p_tactics) is distinct from 'object' then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  insert into public.combat_defenses (user_id, card_instance_ids, definition_ids, tactics)
  values (p_user, p_card_instance_ids, v_definitions, p_tactics)
  on conflict (user_id) do update
  set card_instance_ids = excluded.card_instance_ids, definition_ids = excluded.definition_ids, tactics = excluded.tactics, updated_at = now();
  insert into public.combat_arena_players (user_id) values (p_user) on conflict (user_id) do nothing;
  return jsonb_build_object('definition_ids', to_jsonb(v_definitions));
end;
$$;

-- ---------------------------------------------------------------------------
-- Battles: a challenge, the end, a battle given up
-- ---------------------------------------------------------------------------

-- A battle given up: a challenge counts as a loss.
create function public.combat_give_up(p_battle uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text;
begin
  update public.combat_battles set status = 'abandoned', finished_at = now(), updated_at = now()
  where id = p_battle and status = 'active'
  returning kind into v_kind;
  if not found then
    return false;
  end if;
  if v_kind = 'arena' then
    perform public.combat_arena_score(p_battle, 'loss');
  end if;
  return true;
end;
$$;

create or replace function public.combat_abandon(p_battle uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.combat_battles where id = p_battle and user_id = auth.uid()) then
    return false;
  end if;
  return public.combat_give_up(p_battle);
end;
$$;

-- As in 20261126120000_scontro_kit_unlock.sql; a battle under way is given up through combat_give_up.
create or replace function public.combat_create(
  p_user uuid,
  p_card_instance_ids uuid[],
  p_setup jsonb,
  p_rules jsonb,
  p_seed bigint,
  p_tactics jsonb,
  p_auto boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_definitions uuid[];
  v_battle uuid;
  v_active uuid;
begin
  perform 1 from public.profiles where id = p_user for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  v_definitions := public.check_team_of(p_user, p_card_instance_ids, public.config_int('combat.team_size'));
  if exists (select 1 from unnest(v_definitions) as d(id) where not exists (select 1 from public.combat_kits k where k.definition_id = d.id)) then
    raise exception 'combat_no_kit' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(v_definitions) as d(id) where not public.combat_kit_unlocked(p_user, d.id)) then
    raise exception 'combat_locked' using errcode = '22023';
  end if;
  if jsonb_typeof(p_setup -> 'a') is distinct from 'array'
     or array(select (x ->> 'definitionId')::uuid from jsonb_array_elements(p_setup -> 'a') with ordinality as e(x, ord) order by ord)
        is distinct from v_definitions then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  for v_active in select id from public.combat_battles where user_id = p_user and status = 'active' loop
    perform public.combat_give_up(v_active);
  end loop;
  insert into public.combat_battles (user_id, setup, rules, seed, tactics, auto)
  values (p_user, p_setup, p_rules, p_seed, p_tactics, p_auto)
  returning id into v_battle;
  return v_battle;
end;
$$;

-- A challenge (the Edge Function): the player's own defence must be able to fight, the opponent
-- must be one of today's offers (a player's defence still able to fight), side b must be that
-- defence in its places, and side a the player's unlocked characters as in combat_create. The
-- offers are then renewed.
create function public.combat_arena_create(
  p_user uuid,
  p_offer integer,
  p_card_instance_ids uuid[],
  p_setup jsonb,
  p_rules jsonb,
  p_seed bigint,
  p_tactics jsonb,
  p_auto boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_definitions uuid[];
  v_offers jsonb;
  v_offer jsonb;
  v_opponent uuid;
  v_opponent_definitions uuid[];
  v_opponent_tactics jsonb;
  v_opponent_points integer;
  v_side_b uuid[];
  v_battle uuid;
  v_active uuid;
begin
  perform 1 from public.profiles where id = p_user for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  if not public.combat_defense_ok(p_user) then
    raise exception 'combat_no_defense' using errcode = '22023';
  end if;
  select o.offers into v_offers from public.combat_arena_offers o where o.user_id = p_user for update;
  if v_offers is null or p_offer is null or p_offer < 0 or p_offer >= jsonb_array_length(v_offers) then
    raise exception 'combat_offer_gone' using errcode = '22023';
  end if;
  v_offer := v_offers -> p_offer;
  if v_offer ->> 'kind' = 'player' then
    v_opponent := (v_offer ->> 'user_id')::uuid;
    if not public.combat_defense_ok(v_opponent) then
      raise exception 'combat_offer_gone' using errcode = '22023';
    end if;
    select d.definition_ids, d.tactics into v_opponent_definitions, v_opponent_tactics from public.combat_defenses d where d.user_id = v_opponent;
    v_opponent_points := public.combat_arena_points(v_opponent);
  else
    v_opponent_definitions := array(select (x #>> '{}')::uuid from jsonb_array_elements(v_offer -> 'definition_ids') with ordinality as e(x, ord) order by ord);
    v_opponent_points := (v_offer ->> 'points')::integer;
  end if;
  -- A player's defence in its saved places; a team of the computer in the places the engine gave it.
  if jsonb_typeof(p_setup -> 'b') is distinct from 'array' then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  v_side_b := array(select (x ->> 'definitionId')::uuid from jsonb_array_elements(p_setup -> 'b') with ordinality as e(x, ord) order by ord);
  if (v_opponent is not null and v_side_b is distinct from v_opponent_definitions)
     or (v_opponent is null and array(select u from unnest(v_side_b) as u order by u) is distinct from array(select u from unnest(v_opponent_definitions) as u order by u)) then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  v_opponent_definitions := v_side_b;

  v_definitions := public.check_team_of(p_user, p_card_instance_ids, public.config_int('combat.team_size'));
  if exists (select 1 from unnest(v_definitions) as d(id) where not exists (select 1 from public.combat_kits k where k.definition_id = d.id)) then
    raise exception 'combat_no_kit' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(v_definitions) as d(id) where not public.combat_kit_unlocked(p_user, d.id)) then
    raise exception 'combat_locked' using errcode = '22023';
  end if;
  if jsonb_typeof(p_setup -> 'a') is distinct from 'array'
     or array(select (x ->> 'definitionId')::uuid from jsonb_array_elements(p_setup -> 'a') with ordinality as e(x, ord) order by ord)
        is distinct from v_definitions then
    raise exception 'invalid_request' using errcode = '22023';
  end if;

  for v_active in select id from public.combat_battles where user_id = p_user and status = 'active' loop
    perform public.combat_give_up(v_active);
  end loop;
  insert into public.combat_battles (user_id, setup, rules, seed, tactics, auto, kind, opponent_id, opponent, opponent_tactics)
  values (p_user, p_setup, p_rules, p_seed, p_tactics, p_auto, 'arena', v_opponent,
          jsonb_build_object('kind', v_offer ->> 'kind', 'name', v_offer ->> 'name', 'points', v_opponent_points, 'definition_ids', to_jsonb(v_opponent_definitions)),
          v_opponent_tactics)
  returning id into v_battle;
  perform public.combat_arena_make_offers(p_user);
  return v_battle;
end;
$$;

-- As in 20261124100000_scontro_stage_four.sql, the prizes of the day counted apart for the battles
-- against the computer and the challenges, and a challenge's end moves the Gloria.
create or replace function public.combat_record(p_battle uuid, p_user uuid, p_from integer, p_actions jsonb, p_result jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_battle public.combat_battles;
  v_status text;
  v_xp integer := 0;
  v_coins integer := 0;
  v_prefix text;
  v_daily integer;
begin
  select * into v_battle from public.combat_battles where id = p_battle and user_id = p_user for update;
  if not found then
    raise exception 'combat_not_found' using errcode = 'P0002';
  end if;
  if v_battle.status <> 'active' then
    raise exception 'combat_finished' using errcode = '22023';
  end if;
  if jsonb_typeof(p_actions) is distinct from 'array' then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  if jsonb_array_length(v_battle.actions) <> p_from then
    raise exception 'combat_stale' using errcode = '40001';
  end if;

  update public.combat_battles set actions = actions || p_actions, updated_at = now() where id = p_battle;
  if p_result is null then
    return jsonb_build_object('status', 'active');
  end if;

  v_status := case p_result ->> 'winner' when 'a' then 'won' when 'b' then 'lost' when 'draw' then 'draw' end;
  if v_status is null then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  v_prefix := case when v_battle.kind = 'arena' then 'combat_arena.rewards.' else 'combat.rewards.' end;
  v_daily := public.config_int(v_prefix || 'daily_battles');
  if (select count(*) from public.combat_battles b
      where b.user_id = p_user and b.kind = v_battle.kind and b.xp is not null and public.game_day(b.finished_at) = public.game_day())
     < v_daily then
    v_xp := case when v_status = 'won' then public.config_int(v_prefix || 'win_xp') else public.config_int(v_prefix || 'loss_xp') end;
    v_coins := case when v_status = 'won' then public.config_int(v_prefix || 'win_coins') else 0 end;
  end if;
  update public.combat_battles
  set status = v_status, result = p_result, finished_at = now(), updated_at = now(),
      xp = case when v_xp > 0 or v_coins > 0 then v_xp end,
      coins = case when v_xp > 0 or v_coins > 0 then v_coins end
  where id = p_battle;
  if v_battle.kind = 'arena' then
    perform public.combat_arena_score(p_battle, case v_status when 'won' then 'win' when 'lost' then 'loss' else 'draw' end);
  end if;
  if v_coins > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id) values (p_user, v_coins, 'combat_reward', p_battle);
  end if;
  if v_xp > 0 then
    update public.profiles set xp = xp + v_xp, level = public.level_for_xp(xp + v_xp), updated_at = now() where id = p_user;
    perform public.grant_level_rewards(p_user, null);
    update public.profiles set conquest_unlocked = true
    where id = p_user and not conquest_unlocked and level >= public.config_int('conquest.unlock_at_level');
  end if;
  return jsonb_build_object('status', v_status, 'xp', v_xp, 'coins', v_coins)
    || case when v_battle.kind = 'arena'
            then jsonb_build_object('points', (select b.points_change from public.combat_battles b where b.id = p_battle))
            else '{}'::jsonb end;
end;
$$;

-- ---------------------------------------------------------------------------
-- What the player reads and asks
-- ---------------------------------------------------------------------------

-- The player's challenges: their Gloria, their defence, today's opponents (made when missing or of
-- another day), the lists still to renew, the paid challenges of today, and their last defences.
create function public.get_combat_arena()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_defense public.combat_defenses;
  v_offer public.combat_arena_offers;
  v_seen timestamptz;
  v_daily integer := public.config_int('combat_arena.refreshes_daily');
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_defense from public.combat_defenses where user_id = v_user;
  select * into v_offer from public.combat_arena_offers where user_id = v_user;
  if v_defense.user_id is not null and (v_offer.user_id is null or v_offer.day <> public.game_day()) then
    perform public.combat_arena_make_offers(v_user);
    select * into v_offer from public.combat_arena_offers where user_id = v_user;
  end if;
  select a.defenses_seen_at into v_seen from public.combat_arena_players a where a.user_id = v_user;
  return jsonb_build_object(
    'points', public.combat_arena_points(v_user),
    'defense', case when v_defense.user_id is null then null else jsonb_build_object(
      'card_instance_ids', to_jsonb(v_defense.card_instance_ids),
      'definition_ids', to_jsonb(v_defense.definition_ids),
      'tactics', v_defense.tactics,
      'ok', public.combat_defense_ok(v_user)) end,
    'offers', coalesce((select jsonb_agg(o - 'user_id' order by ord) from jsonb_array_elements(v_offer.offers) with ordinality as e(o, ord)), '[]'::jsonb),
    'refreshes_left', case when v_offer.user_id is null or v_offer.day <> public.game_day() then v_daily else greatest(0, v_daily - v_offer.refreshes) end,
    'paid_today', (select count(*) from public.combat_battles b
                   where b.user_id = v_user and b.kind = 'arena' and b.xp is not null and public.game_day(b.finished_at) = public.game_day()),
    'paid_daily', public.config_int('combat_arena.rewards.daily_battles'),
    'defenses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'attacker', x.username, 'held', x.status in ('lost', 'abandoned'), 'draw', x.status = 'draw',
        'points', coalesce(x.opponent_points_change, 0), 'finished_at', x.finished_at,
        'new', v_seen is null or x.finished_at > v_seen) order by x.finished_at desc)
      from (
        select b.status, b.opponent_points_change, b.finished_at, p.username
        from public.combat_battles b join public.profiles p on p.id = b.user_id
        where b.opponent_id = v_user and b.kind = 'arena' and b.finished_at is not null
        order by b.finished_at desc
        limit 10
      ) x), '[]'::jsonb)
  );
end;
$$;

-- A new list of opponents, while the day's renewals last.
create function public.combat_arena_refresh()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_offer public.combat_arena_offers;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.assert_modes_open(array['combat']);
  if not public.combat_defense_ok(v_user) then
    raise exception 'combat_no_defense' using errcode = '22023';
  end if;
  select * into v_offer from public.combat_arena_offers where user_id = v_user for update;
  if v_offer.user_id is not null and v_offer.day = public.game_day()
     and v_offer.refreshes >= public.config_int('combat_arena.refreshes_daily') then
    raise exception 'combat_no_refresh' using errcode = '22023';
  end if;
  perform public.combat_arena_make_offers(v_user);
  update public.combat_arena_offers set refreshes = refreshes + 1 where user_id = v_user;
  return public.get_combat_arena();
end;
$$;

-- The defences read: the new ones are no longer new.
create function public.combat_arena_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.combat_arena_players (user_id) values (auth.uid())
  on conflict (user_id) do update set defenses_seen_at = now()
$$;

-- For Gioca's tile: the defences finished since the player last read them.
create function public.combat_arena_news()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.combat_battles b
  where b.opponent_id = auth.uid() and b.kind = 'arena' and b.finished_at is not null
    and b.finished_at > coalesce((select a.defenses_seen_at from public.combat_arena_players a where a.user_id = auth.uid()), '-infinity'::timestamptz)
$$;

revoke execute on function public.combat_arena_points(uuid) from public, anon, authenticated;
revoke execute on function public.combat_arena_nominal(integer, integer, text) from public, anon, authenticated;
revoke execute on function public.combat_arena_score(uuid, text) from public, anon, authenticated;
revoke execute on function public.combat_defense_ok(uuid) from public, anon, authenticated;
revoke execute on function public.combat_arena_make_offers(uuid) from public, anon, authenticated;
revoke execute on function public.combat_defense_save(uuid, uuid[], jsonb) from public, anon, authenticated;
revoke execute on function public.combat_give_up(uuid) from public, anon, authenticated;
revoke execute on function public.combat_create(uuid, uuid[], jsonb, jsonb, bigint, jsonb, boolean) from public, anon, authenticated;
revoke execute on function public.combat_arena_create(uuid, integer, uuid[], jsonb, jsonb, bigint, jsonb, boolean) from public, anon, authenticated;
revoke execute on function public.combat_record(uuid, uuid, integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.combat_defense_save(uuid, uuid[], jsonb) to service_role;
grant execute on function public.combat_create(uuid, uuid[], jsonb, jsonb, bigint, jsonb, boolean) to service_role;
grant execute on function public.combat_arena_create(uuid, integer, uuid[], jsonb, jsonb, bigint, jsonb, boolean) to service_role;
grant execute on function public.combat_record(uuid, uuid, integer, jsonb, jsonb) to service_role;
revoke execute on function public.combat_abandon(uuid) from public, anon;
revoke execute on function public.get_combat_arena() from public, anon;
revoke execute on function public.combat_arena_refresh() from public, anon;
revoke execute on function public.combat_arena_seen() from public, anon;
revoke execute on function public.combat_arena_news() from public, anon;
grant execute on function public.combat_abandon(uuid) to authenticated;
grant execute on function public.get_combat_arena() to authenticated;
grant execute on function public.combat_arena_refresh() to authenticated;
grant execute on function public.combat_arena_seen() to authenticated;
grant execute on function public.combat_arena_news() to authenticated;
