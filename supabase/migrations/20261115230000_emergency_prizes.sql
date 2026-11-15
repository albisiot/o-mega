-- Emergenza: prizes for the day's leaderboard (SPEC §5.10). When the game day
-- ends (midnight Europe/Rome) its leaderboard is final: the first players
-- (emergency.leaderboard_size) win coins and packs by place, set in game_config
-- and changed by admins from /gestione-ricompense. A day is closed the first
-- time anyone opens the app after midnight; the winner finds the prize in a
-- popup and claims it there, once, whenever they like (no expiry).

insert into public.game_config (key, value, description) values
  ('emergency.prizes.min_passed', '1', 'Threats passed needed to win an Emergenza leaderboard prize'),
  ('emergency.prizes.rank1_coins', '50', 'Coins for the first of the Emergenza leaderboard of a day'),
  ('emergency.prizes.rank1_packs', '1', 'Packs for the first of the Emergenza leaderboard of a day'),
  ('emergency.prizes.rank2_coins', '100', 'Coins for the second of the Emergenza leaderboard of a day'),
  ('emergency.prizes.rank2_packs', '0', 'Packs for the second of the Emergenza leaderboard of a day'),
  ('emergency.prizes.rank3_coins', '75', 'Coins for the third of the Emergenza leaderboard of a day'),
  ('emergency.prizes.rank3_packs', '0', 'Packs for the third of the Emergenza leaderboard of a day'),
  ('emergency.prizes.others_coins', '25', 'Coins for the 4th to the last prized place (emergency.leaderboard_size)'),
  ('emergency.prizes.others_packs', '0', 'Packs for the 4th to the last prized place (emergency.leaderboard_size)');

alter table public.coin_ledger drop constraint coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in (
  'pack_purchase', 'match_reward', 'bot_match_reward', 'duplicate_conversion', 'conquest_bonus', 'level_reward',
  'emergency_reward', 'bonus_code', 'story_reward', 'event_reward', 'objective_reward', 'achievement_reward',
  'emergency_prize', 'admin_adjustment'
));

alter table public.pack_openings drop constraint pack_openings_pack_type_check;
alter table public.pack_openings add constraint pack_openings_pack_type_check
  check (pack_type in ('daily', 'standard', 'bonus', 'event', 'special', 'objective', 'match', 'achievement', 'emergency'));

-- Game days whose leaderboard has been closed (prizes written, or none).
create table public.emergency_prize_days (
  day date primary key references public.emergency_days (day),
  closed_at timestamptz not null default now()
);

-- One prize per player and day, with the place as it was at midnight.
create table public.emergency_prizes (
  id uuid primary key default gen_random_uuid(),
  day date not null references public.emergency_prize_days (day),
  user_id uuid not null references public.profiles (id) on delete cascade,
  rank integer not null check (rank >= 1),
  passed integer not null check (passed >= 0),
  total_score integer not null,
  players integer not null check (players >= rank),
  coins integer not null check (coins >= 0),
  packs integer not null check (packs >= 0),
  opening_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  constraint emergency_prizes_something check (coins > 0 or packs > 0),
  unique (day, user_id),
  unique (day, rank)
);

create index emergency_prizes_unclaimed_idx on public.emergency_prizes (user_id, day) where claimed_at is null;

alter table public.emergency_prize_days enable row level security;
alter table public.emergency_prizes enable row level security;
revoke all on table public.emergency_prize_days, public.emergency_prizes from anon, authenticated;

-- The days before this migration are over without prizes: the first prized day is today.
insert into public.emergency_prize_days (day)
select d.day from public.emergency_days d where d.day < public.game_day();

-- The prize of a place: { coins, packs } from game_config, zero beyond the leaderboard.
create function public.emergency_prize_for(p_rank integer)
returns table (coins integer, packs integer)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_tier text := case when p_rank <= 3 then 'rank' || p_rank else 'others' end;
begin
  if p_rank < 1 or p_rank > public.config_int('emergency.leaderboard_size') then
    return query select 0, 0;
    return;
  end if;
  return query select
    public.config_int(format('emergency.prizes.%s_coins', v_tier)),
    public.config_int(format('emergency.prizes.%s_packs', v_tier));
end;
$$;

revoke execute on function public.emergency_prize_for(integer) from public, anon, authenticated;

-- Closes every game day that is over and not closed yet, oldest first, once:
-- the final leaderboard (as the result screen ranks it) gives its prizes.
create function public.emergency_close_days()
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_day date;
  v_min integer := public.config_int('emergency.prizes.min_passed');
begin
  for v_day in
    select d.day from public.emergency_days d
    where d.day < public.game_day()
      and not exists (select 1 from public.emergency_prize_days p where p.day = d.day)
    order by d.day
  loop
    -- Whoever inserts the day writes its prizes; a concurrent call finds it and skips.
    insert into public.emergency_prize_days (day) values (v_day) on conflict do nothing;
    continue when not found;
    insert into public.emergency_prizes (day, user_id, rank, passed, total_score, players, coins, packs)
    select v_day, r.user_id, r.rank, r.passed, r.total_score, r.players, p.coins, p.packs
    from (
      select
        row_number() over (order by e.passed desc, e.total_score desc, e.finished_at, e.user_id)::integer as rank,
        count(*) over ()::integer as players,
        e.user_id, e.passed, e.total_score
      from public.emergency_runs e
      where e.day = v_day and e.status = 'finished'
    ) r
    cross join lateral public.emergency_prize_for(r.rank) p
    where r.passed >= v_min and (p.coins > 0 or p.packs > 0);
  end loop;
end;
$$;

revoke execute on function public.emergency_close_days() from public, anon, authenticated;

-- What each place wins today, for the leaderboard: [{ from, to, coins, packs }].
create function public.emergency_prize_table()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_size integer := public.config_int('emergency.leaderboard_size');
  v_rows jsonb := '[]'::jsonb;
  v_prize record;
begin
  for i in 1..least(v_size, 4) loop
    select * into v_prize from public.emergency_prize_for(i);
    continue when v_prize.coins = 0 and v_prize.packs = 0;
    v_rows := v_rows || jsonb_build_object(
      'from', i, 'to', case when i = 4 then v_size else i end,
      'coins', v_prize.coins, 'packs', v_prize.packs
    );
  end loop;
  return v_rows;
end;
$$;

revoke execute on function public.emergency_prize_table() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Player RPCs
-- ---------------------------------------------------------------------------

-- Closes the days that are over, then the caller's prizes still to claim, oldest first.
create function public.get_emergency_prizes()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.emergency_close_days();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'day', p.day, 'rank', p.rank, 'passed', p.passed, 'total_score', p.total_score,
      'players', p.players, 'coins', p.coins, 'packs', p.packs
    ) order by p.day, p.id)
    from public.emergency_prizes p
    where p.user_id = v_user and p.claimed_at is null
  ), '[]'::jsonb);
end;
$$;

-- Pays one of the caller's prizes, once: coins (coin_ledger) and packs, opened now.
create function public.claim_emergency_prize(p_prize_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_prize public.emergency_prizes;
  v_openings uuid[] := '{}';
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_prize from public.emergency_prizes p
  where p.id = p_prize_id and p.user_id = v_user
  for update;
  if v_prize.id is null then
    raise exception 'emergency_prize_not_found';
  end if;
  if v_prize.claimed_at is not null then
    raise exception 'emergency_prize_already_claimed';
  end if;

  if v_prize.coins > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id)
    values (v_user, v_prize.coins, 'emergency_prize', v_prize.id);
  end if;
  for i in 1..v_prize.packs loop
    v_openings := v_openings || public.open_pack(v_user, 'emergency');
  end loop;

  update public.emergency_prizes set claimed_at = now(), opening_ids = v_openings where id = v_prize.id;

  return jsonb_build_object(
    'coins', v_prize.coins,
    'opening_ids', to_jsonb(v_openings),
    'coin_balance', public.coin_balance(v_user)
  );
end;
$$;

revoke execute on function public.get_emergency_prizes() from public, anon;
revoke execute on function public.claim_emergency_prize(uuid) from public, anon;
grant execute on function public.get_emergency_prizes() to authenticated;
grant execute on function public.claim_emergency_prize(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The leaderboard shows today's prizes too.
-- ---------------------------------------------------------------------------

create or replace function public.get_emergency_leaderboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_size integer := public.config_int('emergency.leaderboard_size');
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  return (
    with ranked as (
      select
        row_number() over (order by r.passed desc, r.total_score desc, r.finished_at, r.user_id) as rank,
        r.user_id, r.passed, r.total_score, pr.username, pr.avatar_url, pr.title
      from public.emergency_runs r
      join public.profiles pr on pr.id = r.user_id
      where r.day = public.game_day() and r.status = 'finished'
    )
    select jsonb_build_object(
      'players', count(*),
      'top', coalesce(jsonb_agg(jsonb_build_object(
        'rank', rank, 'username', username, 'avatar_url', avatar_url, 'title', title,
        'passed', passed, 'total_score', total_score, 'is_me', user_id = auth.uid()
      ) order by rank) filter (where rank <= v_size), '[]'::jsonb),
      'me', (
        select jsonb_build_object(
          'rank', m.rank, 'username', m.username, 'avatar_url', m.avatar_url, 'title', m.title,
          'passed', m.passed, 'total_score', m.total_score, 'is_me', true
        )
        from ranked m where m.user_id = auth.uid()
      ),
      'prizes', public.emergency_prize_table(),
      'prize_min_passed', public.config_int('emergency.prizes.min_passed')
    )
    from ranked
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admins change the prizes from /gestione-ricompense.
-- ---------------------------------------------------------------------------

create or replace function public.match_reward_setting_bounds()
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
    ('emergency.rewards.tier3_coins', 1, 10000),
    ('emergency.prizes.min_passed', 0, 100),
    ('emergency.prizes.rank1_coins', 0, 10000),
    ('emergency.prizes.rank1_packs', 0, 3),
    ('emergency.prizes.rank2_coins', 0, 10000),
    ('emergency.prizes.rank2_packs', 0, 3),
    ('emergency.prizes.rank3_coins', 0, 10000),
    ('emergency.prizes.rank3_packs', 0, 3),
    ('emergency.prizes.others_coins', 0, 10000),
    ('emergency.prizes.others_packs', 0, 3)
$$;
