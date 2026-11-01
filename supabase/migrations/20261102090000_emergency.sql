-- Emergenza: the daily solo challenge (SPEC §5.10). The same 8 threats for every
-- player, one attempt per game day, no card at stake.
--
-- The Edge Function "match" draws the day's threats and scores the plays with
-- the rules engine; the service-only functions below re-check the round order,
-- the squad and the outcome. Clients read the tables only through the Edge
-- Function and get_emergency_leaderboard: future threats must never reach them.
-- The threats are drawn with real randomness, never seeded from the date: the
-- repository may be public.

insert into public.game_config (key, value, description) values
  ('emergency.threats_per_run', '8', 'Threats of an Emergenza run, and characters of its squad'),
  ('emergency.max_failures', '3', 'Failed threats that end a run'),
  ('emergency.threat_levels.min_sum', '24', 'Minimum sum of the threat levels of a run'),
  ('emergency.threat_levels.max_sum', '32', 'Maximum sum of the threat levels of a run'),
  ('emergency.targets.level1', '7', 'Score needed to pass a threat of level 1'),
  ('emergency.targets.level2', '13', 'Score needed to pass a threat of level 2'),
  ('emergency.targets.level3', '18', 'Score needed to pass a threat of level 3'),
  ('emergency.targets.level4', '23', 'Score needed to pass a threat of level 4'),
  ('emergency.targets.level5', '28', 'Score needed to pass a threat of level 5'),
  ('emergency.targets.level6', '32', 'Score needed to pass a threat of level 6'),
  ('emergency.rewards.tier1_passed', '3', 'Threats passed that reach the first reward'),
  ('emergency.rewards.tier1_coins', '10', 'Coins of the first reward'),
  ('emergency.rewards.tier2_passed', '5', 'Threats passed that reach the second reward'),
  ('emergency.rewards.tier2_coins', '15', 'Coins of the second reward'),
  ('emergency.rewards.tier3_passed', '8', 'Threats passed that reach the third reward'),
  ('emergency.rewards.tier3_coins', '25', 'Coins of the third reward');

alter table public.coin_ledger drop constraint coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in (
  'pack_purchase', 'match_reward', 'bot_match_reward', 'duplicate_conversion', 'conquest_bonus', 'level_reward',
  'emergency_reward', 'admin_adjustment'
));

create table public.emergency_days (
  day date primary key,
  threat_ids uuid[] not null,
  threat_levels integer[] not null,
  created_at timestamptz not null default now()
);

create table public.emergency_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null references public.emergency_days (day),
  card_instance_ids uuid[] not null,
  definition_ids uuid[] not null,
  status text not null default 'active' check (status in ('active', 'finished')),
  current_round integer not null default 1,
  passed integer not null default 0,
  failed integer not null default 0,
  total_score integer not null default 0,
  coins integer not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint emergency_runs_finished_shape check ((status = 'finished') = (finished_at is not null)),
  -- One attempt per player per game day.
  unique (user_id, day)
);

create index emergency_runs_leaderboard_idx
  on public.emergency_runs (day, passed desc, total_score desc, finished_at)
  where status = 'finished';

create table public.emergency_plays (
  run_id uuid not null references public.emergency_runs (id) on delete cascade,
  round integer not null check (round >= 1),
  threat_id uuid not null references public.threat_definitions (id),
  card_instance_id uuid not null references public.card_instances (id),
  definition_id uuid not null references public.card_definitions (id),
  base_score integer not null,
  bonus integer not null,
  score integer not null,
  required_score integer not null,
  passed boolean not null,
  created_at timestamptz not null default now(),
  primary key (run_id, round),
  -- Each character answers one threat.
  unique (run_id, definition_id)
);

create index emergency_plays_threat_id_idx on public.emergency_plays (threat_id);
create index emergency_plays_card_instance_id_idx on public.emergency_plays (card_instance_id);
create index emergency_plays_definition_id_idx on public.emergency_plays (definition_id);

alter table public.emergency_days enable row level security;
alter table public.emergency_runs enable row level security;
alter table public.emergency_plays enable row level security;
revoke all on table public.emergency_days, public.emergency_runs, public.emergency_plays from anon, authenticated;
grant select on table public.emergency_days, public.emergency_runs, public.emergency_plays to service_role;

-- ---------------------------------------------------------------------------
-- Service-only functions used by the Edge Function
-- ---------------------------------------------------------------------------

-- Stores today's threats unless another request was faster: everyone gets the first draw.
create function public.emergency_ensure_day(p_threat_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_threats integer := public.config_int('emergency.threats_per_run');
  v_levels integer[];
begin
  select array_agg(t.level order by u.ord) into v_levels
  from unnest(p_threat_ids) with ordinality as u(id, ord)
  join public.threat_definitions t on t.id = u.id and t.is_active;
  if coalesce(cardinality(v_levels), 0) <> v_threats
     or (select count(distinct u.id) from unnest(p_threat_ids) as u(id)) <> v_threats then
    raise exception 'invalid_threats';
  end if;

  insert into public.emergency_days (day, threat_ids, threat_levels)
  values (public.game_day(), p_threat_ids, v_levels)
  on conflict (day) do nothing;
end;
$$;

-- Fields the squad for today's attempt. Cards stay free for the player's other
-- matches: nothing is at stake here, and the squad is a snapshot.
create function public.emergency_start(p_user uuid, p_card_instance_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_size integer := public.config_int('emergency.threats_per_run');
  v_day date := public.game_day();
  v_definitions uuid[];
  v_run uuid;
begin
  perform 1 from public.profiles where id = p_user for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.emergency_runs where user_id = p_user and day = v_day) then
    raise exception 'emergency_already_played';
  end if;
  if not exists (select 1 from public.emergency_days where day = v_day) then
    raise exception 'emergency_not_ready';
  end if;

  if coalesce(cardinality(p_card_instance_ids), 0) <> v_size then
    raise exception 'invalid_emergency_squad' using errcode = '22023';
  end if;
  if (select count(distinct u.id) from unnest(p_card_instance_ids) as u(id)) <> v_size then
    raise exception 'duplicate_card' using errcode = '22023';
  end if;
  select array_agg(i.definition_id order by u.ord) into v_definitions
  from unnest(p_card_instance_ids) with ordinality as u(id, ord)
  join public.card_instances i on i.id = u.id and i.owner_id = p_user;
  if coalesce(cardinality(v_definitions), 0) <> v_size then
    raise exception 'card_not_owned' using errcode = '22023';
  end if;
  if (select count(distinct d.id) from unnest(v_definitions) as d(id)) <> v_size then
    raise exception 'duplicate_character' using errcode = '22023';
  end if;

  insert into public.emergency_runs (user_id, day, card_instance_ids, definition_ids)
  values (p_user, v_day, p_card_instance_ids, v_definitions)
  returning id into v_run;
  return v_run;
end;
$$;

-- Stores a play scored by the engine, pays the rewards it reaches and ends the
-- run when it is over. Rewards are paid at once, so a run left unfinished keeps them.
create function public.emergency_record_play(
  p_user uuid,
  p_round integer,
  p_card_instance_id uuid,
  p_base integer,
  p_bonus integer,
  p_score integer,
  p_required integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.emergency_runs;
  v_threat uuid;
  v_position integer;
  v_definition uuid;
  v_passed boolean := p_score >= p_required;
  v_total_passed integer;
  v_total_failed integer;
  v_coins integer := 0;
  v_tier integer;
  v_finished boolean;
begin
  select * into v_run from public.emergency_runs
  where user_id = p_user and day = public.game_day()
  for update;
  if v_run.id is null then
    raise exception 'emergency_not_started';
  end if;
  if v_run.status <> 'active' then
    raise exception 'emergency_already_played';
  end if;
  if v_run.current_round <> p_round then
    raise exception 'round_already_resolved';
  end if;

  v_position := array_position(v_run.card_instance_ids, p_card_instance_id);
  if v_position is null then
    raise exception 'character_not_available';
  end if;
  v_definition := v_run.definition_ids[v_position];
  if exists (select 1 from public.emergency_plays where run_id = v_run.id and definition_id = v_definition) then
    raise exception 'character_already_played';
  end if;
  if p_score <> p_base + p_bonus then
    raise exception 'result_mismatch';
  end if;

  select d.threat_ids[p_round] into v_threat from public.emergency_days d where d.day = v_run.day;
  insert into public.emergency_plays (
    run_id, round, threat_id, card_instance_id, definition_id,
    base_score, bonus, score, required_score, passed
  ) values (
    v_run.id, p_round, v_threat, p_card_instance_id, v_definition,
    p_base, p_bonus, p_score, p_required, v_passed
  );

  v_total_passed := v_run.passed + v_passed::integer;
  v_total_failed := v_run.failed + (not v_passed)::integer;

  if v_passed then
    foreach v_tier in array array[1, 2, 3] loop
      if v_total_passed = public.config_int(format('emergency.rewards.tier%s_passed', v_tier)) then
        v_coins := public.config_int(format('emergency.rewards.tier%s_coins', v_tier));
        insert into public.coin_ledger (user_id, amount, reason, ref_id)
        values (p_user, v_coins, 'emergency_reward', v_run.id);
      end if;
    end loop;
  end if;

  v_finished := p_round >= public.config_int('emergency.threats_per_run')
                or v_total_failed >= public.config_int('emergency.max_failures');

  update public.emergency_runs
  set passed = v_total_passed,
      failed = v_total_failed,
      total_score = total_score + p_score,
      coins = coins + v_coins,
      current_round = case when v_finished then p_round else p_round + 1 end,
      status = case when v_finished then 'finished' else 'active' end,
      finished_at = case when v_finished then now() end
  where id = v_run.id;
end;
$$;

-- What a player may see: the day's levels always; of the threats, only those
-- already reached, plus the following ones once a Veggente has been played.
create function public.emergency_state_payload(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with d as (
    select * from public.emergency_days where day = public.game_day()
  ), r as (
    select * from public.emergency_runs where user_id = p_user and day = public.game_day()
  )
  select jsonb_build_object(
    'day', public.game_day(),
    'server_now', now(),
    'threat_levels', (select to_jsonb(threat_levels) from d),
    'rules', jsonb_build_object(
      'threats_per_run', public.config_int('emergency.threats_per_run'),
      'max_failures', public.config_int('emergency.max_failures'),
      'targets', (
        select jsonb_object_agg(l.level, public.config_int(format('emergency.targets.level%s', l.level)))
        from generate_series(1, 6) as l(level)
      ),
      'rewards', (
        select jsonb_agg(jsonb_build_object(
          'passed', public.config_int(format('emergency.rewards.tier%s_passed', t.tier)),
          'coins', public.config_int(format('emergency.rewards.tier%s_coins', t.tier))
        ) order by t.tier)
        from generate_series(1, 3) as t(tier)
      )
    ),
    'run', (
      select jsonb_build_object(
        'status', r.status,
        'current_round', r.current_round,
        'passed', r.passed,
        'failed', r.failed,
        'total_score', r.total_score,
        'coins', r.coins,
        'squad', (
          select jsonb_agg(public.card_payload(u.definition_id, u.instance_id) || jsonb_build_object(
            'instance_id', u.instance_id,
            'played_round', (
              select p.round from public.emergency_plays p
              where p.run_id = r.id and p.definition_id = u.definition_id
            )
          ) order by u.ord)
          from unnest(r.card_instance_ids, r.definition_ids) with ordinality as u(instance_id, definition_id, ord)
        ),
        'plays', coalesce((
          select jsonb_agg(jsonb_build_object(
            'round', p.round,
            'level', t.level,
            'threat', jsonb_build_object('name', t.name, 'abilities', to_jsonb(t.required_abilities), 'flavor', t.flavor),
            'instance_id', p.card_instance_id,
            'definition_id', p.definition_id,
            'base', p.base_score,
            'bonus', p.bonus,
            'score', p.score,
            'required', p.required_score,
            'passed', p.passed
          ) order by p.round)
          from public.emergency_plays p
          join public.threat_definitions t on t.id = p.threat_id
          where p.run_id = r.id
        ), '[]'::jsonb),
        'current_threat', case when r.status = 'active' then (
          select jsonb_build_object(
            'round', r.current_round,
            'id', t.id,
            'level', t.level,
            'name', t.name,
            'abilities', to_jsonb(t.required_abilities),
            'flavor', t.flavor
          )
          from d join public.threat_definitions t on t.id = d.threat_ids[r.current_round]
        ) end,
        'foreseen_threats', case
          when r.status = 'active' and exists (
            select 1 from public.emergency_plays p
            join public.card_definitions c on c.id = p.definition_id
            where p.run_id = r.id and c.power_code = 'foresight'
          ) then (
            select coalesce(jsonb_agg(jsonb_build_object(
              'round', u.ord, 'level', t.level, 'name', t.name, 'abilities', to_jsonb(t.required_abilities)
            ) order by u.ord), '[]'::jsonb)
            from d, unnest(d.threat_ids) with ordinality as u(id, ord)
            join public.threat_definitions t on t.id = u.id
            where u.ord > r.current_round
          )
          else '[]'::jsonb
        end
      )
      from r
    )
  )
$$;

revoke execute on function public.emergency_ensure_day(uuid[]) from public, anon, authenticated;
revoke execute on function public.emergency_start(uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.emergency_record_play(uuid, integer, uuid, integer, integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.emergency_state_payload(uuid) from public, anon, authenticated;
grant execute on function public.emergency_ensure_day(uuid[]) to service_role;
grant execute on function public.emergency_start(uuid, uuid[]) to service_role;
grant execute on function public.emergency_record_play(uuid, integer, uuid, integer, integer, integer, integer) to service_role;
grant execute on function public.emergency_state_payload(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Client RPC: today's leaderboard. Only finished runs, and no characters: what
-- others played would give away the day's threats.
-- ---------------------------------------------------------------------------

create function public.get_emergency_leaderboard(p_limit integer default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  return (
    with ranked as (
      select
        row_number() over (order by r.passed desc, r.total_score desc, r.finished_at) as rank,
        r.user_id, r.passed, r.total_score, pr.username, pr.avatar_url
      from public.emergency_runs r
      join public.profiles pr on pr.id = r.user_id
      where r.day = public.game_day() and r.status = 'finished'
    )
    select jsonb_build_object(
      'players', count(*),
      'top', coalesce(jsonb_agg(jsonb_build_object(
        'rank', rank, 'username', username, 'avatar_url', avatar_url,
        'passed', passed, 'total_score', total_score, 'is_me', user_id = auth.uid()
      ) order by rank) filter (where rank <= least(greatest(coalesce(p_limit, 20), 1), 100)), '[]'::jsonb),
      'me', (
        select jsonb_build_object(
          'rank', m.rank, 'username', m.username, 'avatar_url', m.avatar_url,
          'passed', m.passed, 'total_score', m.total_score, 'is_me', true
        )
        from ranked m where m.user_id = auth.uid()
      )
    )
    from ranked
  );
end;
$$;

revoke execute on function public.get_emergency_leaderboard(integer) from public, anon;
grant execute on function public.get_emergency_leaderboard(integer) to authenticated;
