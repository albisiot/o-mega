-- Ricompense delle partite (SPEC §8.4): what every match pays, per mode x
-- opponent (bot or person) x outcome (win, draw, loss), in coins, XP and
-- standard packs. Admins change it from the app (/gestione-ricompense); every
-- write checks the admin on the server. A mode without its own rows (a future
-- one) pays the 'default' rows. The seeded values are the ones the game paid
-- until now, so nothing changes until an admin edits them.
--
-- Also admin-editable here: the daily caps on coins and packs from matches,
-- the Conquest bonus when no card can be taken, the Emergenza tiers and a new
-- XP reward at the end of an Emergenza run (0 by default).

-- ---------------------------------------------------------------------------
-- Configuration
-- ---------------------------------------------------------------------------

create table public.match_reward_rules (
  -- 'classic', 'boss', 'triple', 'quadrant', 'quadrant_shifting' (matches.format),
  -- 'conquest', 'story', or 'default' for every mode without its own rows.
  mode_key text not null check (mode_key ~ '^[a-z_]{1,40}$'),
  opponent text not null check (opponent in ('bot', 'person')),
  outcome text not null check (outcome in ('win', 'draw', 'loss')),
  coins integer not null default 0 check (coins between 0 and 10000),
  xp integer not null default 0 check (xp between 0 and 10000),
  packs integer not null default 0 check (packs between 0 and 3),
  updated_at timestamptz not null default now(),
  primary key (mode_key, opponent, outcome)
);

-- No policies: get_match_rewards shows the table, admin_save_match_rewards changes it.
alter table public.match_reward_rules enable row level security;
revoke all on table public.match_reward_rules from anon, authenticated;

-- Until now: XP from progression.* (bot 10 / 3, person 30 / 10 in every format),
-- coins only to the Conquest loser (conquest.loser_coins = 10, both on a draw).
insert into public.match_reward_rules (mode_key, opponent, outcome, coins, xp)
select m.mode_key, o.opponent, x.outcome,
       case when m.mode_key = 'conquest' and x.outcome <> 'win' then 10 else 0 end,
       case
         when o.opponent = 'bot' and x.outcome = 'win' then 10
         when o.opponent = 'bot' then 3
         when x.outcome = 'win' then 30
         else 10
       end
from (values ('default'), ('classic'), ('conquest'), ('boss'), ('triple'), ('quadrant'), ('quadrant_shifting'), ('story'))
       as m(mode_key)
cross join (values ('bot'), ('person')) as o(opponent)
cross join (values ('win'), ('draw'), ('loss')) as x(outcome)
-- Story missions are only played against bots.
where not (m.mode_key = 'story' and o.opponent = 'person');

delete from public.game_config where key in (
  'progression.pvp_win_xp', 'progression.pvp_participation_xp',
  'progression.bot_win_xp', 'progression.bot_participation_xp',
  'conquest.loser_coins'
);

insert into public.game_config (key, value, description) values
  ('match_rewards.daily_coin_cap', '0', 'Daily cap of coins from matches (0: no cap)'),
  ('match_rewards.daily_pack_cap', '3', 'Daily cap of packs from matches (0: no cap)'),
  ('emergency.rewards.finish_xp', '0', 'XP at the end of an Emergenza run');

-- Packs that a match pays: opened at once, shown like the others.
alter table public.pack_openings drop constraint pack_openings_pack_type_check;
alter table public.pack_openings add constraint pack_openings_pack_type_check
  check (pack_type in ('daily', 'standard', 'bonus', 'event', 'special', 'objective', 'match'));

alter table public.matches
  add column reward_xp_a integer,
  add column reward_xp_b integer,
  add column reward_opening_ids_a uuid[] not null default '{}',
  add column reward_opening_ids_b uuid[] not null default '{}';

alter table public.emergency_runs add column xp integer not null default 0 check (xp >= 0);

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------

-- The rows a match uses: story, conquest, or its format.
create function public.match_reward_mode(p_match public.matches)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_match.story_mission_id is not null then 'story'
    when p_match.mode = 'conquest' then 'conquest'
    else p_match.format
  end
$$;

revoke execute on function public.match_reward_mode(public.matches) from public, anon, authenticated;

-- The rule for one side of a match: its mode's row, else the 'default' row.
create function public.match_reward_rule(p_match public.matches, p_outcome text)
returns public.match_reward_rules
language sql
stable
set search_path = ''
as $$
  select r.* from public.match_reward_rules r
  where r.opponent = case when p_match.bot_difficulty is not null then 'bot' else 'person' end
    and r.outcome = p_outcome
    and r.mode_key in (public.match_reward_mode(p_match), 'default')
  order by r.mode_key = 'default'
  limit 1
$$;

revoke execute on function public.match_reward_rule(public.matches, text) from public, anon, authenticated;

-- game_config keys an admin changes from /gestione-ricompense, with their bounds.
create function public.match_reward_setting_bounds()
returns table (key text, min_value integer, max_value integer)
language sql
immutable
set search_path = ''
as $$
  values
    ('match_rewards.daily_coin_cap', 0, 100000),
    ('match_rewards.daily_pack_cap', 0, 20),
    ('conquest.no_card_bonus_coins', 0, 10000),
    ('emergency.rewards.finish_xp', 0, 10000),
    ('emergency.rewards.tier1_passed', 1, 100),
    ('emergency.rewards.tier2_passed', 1, 100),
    ('emergency.rewards.tier3_passed', 1, 100),
    ('emergency.rewards.tier1_coins', 1, 10000),
    ('emergency.rewards.tier2_coins', 1, 10000),
    ('emergency.rewards.tier3_coins', 1, 10000)
$$;

revoke execute on function public.match_reward_setting_bounds() from public, anon, authenticated;

create function public.match_rewards_payload()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'rules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'mode_key', r.mode_key,
        'opponent', r.opponent,
        'outcome', r.outcome,
        'coins', r.coins,
        'xp', r.xp,
        'packs', r.packs
      ) order by r.mode_key, r.opponent, case r.outcome when 'win' then 1 when 'draw' then 2 else 3 end)
      from public.match_reward_rules r
    ), '[]'::jsonb),
    'settings', (
      select jsonb_object_agg(b.key, public.config_int(b.key)) from public.match_reward_setting_bounds() b
    ),
    'emergency_threats_per_run', public.config_int('emergency.threats_per_run')
  )
$$;

revoke execute on function public.match_rewards_payload() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- End of a match: the rewards come from match_reward_rules
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
  v_rule public.match_reward_rules;
  v_xp integer;
  v_coins integer;
  v_packs integer;
  v_cap integer;
  v_earned integer;
  v_openings uuid[];
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

    -- One reward at a time per player, so the daily caps hold.
    perform 1 from public.profiles where id = v_user for update;

    v_won := p_result = v_side;
    -- Whoever leaves or disappears earns nothing.
    v_left := p_reason = 'forfeit' and not v_won;
    v_xp := 0;
    v_coins := 0;
    v_packs := 0;
    v_openings := '{}';

    if not v_left then
      v_rule := public.match_reward_rule(
        v_match, case when v_won then 'win' when p_result = 'draw' then 'draw' else 'loss' end
      );
      v_xp := coalesce(v_rule.xp, 0);
      v_coins := coalesce(v_rule.coins, 0);
      v_packs := coalesce(v_rule.packs, 0);

      v_cap := public.config_int('match_rewards.daily_coin_cap');
      if v_cap > 0 and v_coins > 0 then
        select coalesce(sum(l.amount), 0) into v_earned from public.coin_ledger l
        where l.user_id = v_user and l.reason = 'match_reward' and public.game_day(l.created_at) = public.game_day();
        v_coins := greatest(0, least(v_coins, v_cap - v_earned));
      end if;

      v_cap := public.config_int('match_rewards.daily_pack_cap');
      if v_cap > 0 and v_packs > 0 then
        select count(*) into v_earned from public.pack_openings o
        where o.user_id = v_user and o.pack_type = 'match' and public.game_day(o.opened_at) = public.game_day();
        v_packs := greatest(0, least(v_packs, v_cap - v_earned));
      end if;
    end if;

    if v_coins > 0 then
      insert into public.coin_ledger (user_id, amount, reason, ref_id)
      values (v_user, v_coins, 'match_reward', v_match.id);
    end if;
    for i in 1..v_packs loop
      v_openings := v_openings || public.open_pack(v_user, 'match');
    end loop;

    if v_side = 'a' then
      update public.matches
      set reward_coins_a = v_coins, reward_xp_a = v_xp, reward_opening_ids_a = v_openings
      where id = v_match.id;
    else
      update public.matches
      set reward_coins_b = v_coins, reward_xp_b = v_xp, reward_opening_ids_b = v_openings
      where id = v_match.id;
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

-- What the caller earned in a finished match: the end screen shows it.
create function public.get_match_reward(p_match_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'coins', coalesce(case when m.player_a = auth.uid() then m.reward_coins_a else m.reward_coins_b end, 0),
    'xp', coalesce(case when m.player_a = auth.uid() then m.reward_xp_a else m.reward_xp_b end, 0),
    'opening_ids', to_jsonb(case when m.player_a = auth.uid() then m.reward_opening_ids_a else m.reward_opening_ids_b end)
  )
  from public.matches m
  where m.id = p_match_id and m.status = 'finished'
    and auth.uid() is not null and auth.uid() in (m.player_a, m.player_b)
$$;

revoke execute on function public.get_match_reward(uuid) from public, anon;
grant execute on function public.get_match_reward(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Emergenza: XP at the end of a run
-- ---------------------------------------------------------------------------

create function public.grant_emergency_xp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'finished' and old.status = 'active' then
    new.xp := greatest(0, public.config_int('emergency.rewards.finish_xp'));
    if new.xp > 0 then
      update public.profiles
      set xp = xp + new.xp, level = public.level_for_xp(xp + new.xp), updated_at = now()
      where id = new.user_id;
      perform public.grant_level_rewards(new.user_id, null);
      update public.profiles set conquest_unlocked = true
      where id = new.user_id and not conquest_unlocked and level >= public.config_int('conquest.unlock_at_level');
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.grant_emergency_xp() from public, anon, authenticated;

create trigger emergency_runs_grant_xp
  before update of status on public.emergency_runs
  for each row execute function public.grant_emergency_xp();

-- The Emergenza state gains the XP of the run and the XP rule.
alter function public.emergency_state_payload(uuid) rename to emergency_state_payload_base;

create function public.emergency_state_payload(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with b as (
    select public.emergency_state_payload_base(p_user) as p
  ), withrules as (
    select case
      when jsonb_typeof(b.p -> 'rules') = 'object'
        then jsonb_set(b.p, '{rules,finish_xp}', to_jsonb(public.config_int('emergency.rewards.finish_xp')))
      else b.p
    end as p
    from b
  )
  select case
    when jsonb_typeof(w.p -> 'run') = 'object' then jsonb_set(w.p, '{run,xp}', to_jsonb(coalesce((
      select r.xp from public.emergency_runs r where r.user_id = p_user and r.day = public.game_day()
    ), 0)))
    else w.p
  end
  from withrules w
$$;

revoke execute on function public.emergency_state_payload_base(uuid) from public, anon, authenticated;
revoke execute on function public.emergency_state_payload(uuid) from public, anon, authenticated;
grant execute on function public.emergency_state_payload(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Reading and changing the rewards
-- ---------------------------------------------------------------------------

-- Every player may read the rewards: the app quotes them (shop, Gioca).
create function public.get_match_rewards()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.match_rewards_payload()
$$;

revoke execute on function public.get_match_rewards() from public, anon;
grant execute on function public.get_match_rewards() to authenticated;

-- Changes rewards and settings in one transaction. p_rules: an array of
-- { mode_key, opponent, outcome, coins, xp, packs } for existing rows only (the
-- modes come with the code); p_settings: { game_config key: integer } among
-- match_reward_setting_bounds. Either may be empty.
create function public.admin_save_match_rewards(p_rules jsonb, p_settings jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_rule jsonb;
  v_key text;
  v_value jsonb;
  v_bounds record;
  v_numbers integer[];
  v_threats integer := public.config_int('emergency.threats_per_run');
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_rules, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_settings, '{}'::jsonb)) <> 'object' then
    raise exception 'invalid_match_rewards';
  end if;

  for v_rule in select * from jsonb_array_elements(coalesce(p_rules, '[]'::jsonb)) loop
    if jsonb_typeof(v_rule) <> 'object'
       or jsonb_typeof(v_rule -> 'coins') <> 'number' or jsonb_typeof(v_rule -> 'xp') <> 'number'
       or jsonb_typeof(v_rule -> 'packs') <> 'number'
       or (v_rule ->> 'coins')::numeric <> trunc((v_rule ->> 'coins')::numeric)
       or (v_rule ->> 'xp')::numeric <> trunc((v_rule ->> 'xp')::numeric)
       or (v_rule ->> 'packs')::numeric <> trunc((v_rule ->> 'packs')::numeric)
       or (v_rule ->> 'coins')::numeric not between 0 and 10000
       or (v_rule ->> 'xp')::numeric not between 0 and 10000
       or (v_rule ->> 'packs')::numeric not between 0 and 3 then
      raise exception 'invalid_match_rewards';
    end if;
    update public.match_reward_rules r
    set coins = (v_rule ->> 'coins')::integer,
        xp = (v_rule ->> 'xp')::integer,
        packs = (v_rule ->> 'packs')::integer,
        updated_at = now()
    where r.mode_key = v_rule ->> 'mode_key' and r.opponent = v_rule ->> 'opponent' and r.outcome = v_rule ->> 'outcome';
    if not found then
      raise exception 'match_reward_not_found';
    end if;
  end loop;

  for v_key, v_value in select * from jsonb_each(coalesce(p_settings, '{}'::jsonb)) loop
    select * into v_bounds from public.match_reward_setting_bounds() b where b.key = v_key;
    if v_bounds.key is null
       or jsonb_typeof(v_value) <> 'number'
       or (v_value #>> '{}')::numeric <> trunc((v_value #>> '{}')::numeric)
       or (v_value #>> '{}')::numeric not between v_bounds.min_value and v_bounds.max_value then
      raise exception 'invalid_match_rewards';
    end if;
    update public.game_config c
    set value = to_jsonb((v_value #>> '{}')::integer), updated_at = now()
    where c.key = v_key and c.value is distinct from to_jsonb((v_value #>> '{}')::integer);
  end loop;

  -- The Emergenza tiers stay in order and reachable.
  v_numbers := array[
    public.config_int('emergency.rewards.tier1_passed'),
    public.config_int('emergency.rewards.tier2_passed'),
    public.config_int('emergency.rewards.tier3_passed')
  ];
  if not (v_numbers[1] < v_numbers[2] and v_numbers[2] < v_numbers[3] and v_numbers[3] <= v_threats) then
    raise exception 'invalid_emergency_tiers';
  end if;

  return public.match_rewards_payload();
end;
$$;

revoke execute on function public.admin_save_match_rewards(jsonb, jsonb) from public, anon;
grant execute on function public.admin_save_match_rewards(jsonb, jsonb) to authenticated;
