-- Coins for every level reached: base + per_level * L (level 2 pays 50, level 3
-- pays 60). Each level pays once per player, enforced by the primary key of
-- level_rewards. Players already above level 1 receive the rewards they missed.

insert into public.game_config (key, value, description) values
  ('progression.level_reward_base', '30', 'Coins for reaching level L are base + per_level * L'),
  ('progression.level_reward_per_level', '10', 'Coins for reaching level L are base + per_level * L');

alter table public.coin_ledger drop constraint coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in (
  'pack_purchase', 'match_reward', 'bot_match_reward', 'duplicate_conversion', 'conquest_bonus', 'level_reward', 'admin_adjustment'
));

create table public.level_rewards (
  user_id uuid not null references public.profiles (id) on delete cascade,
  level integer not null check (level >= 2),
  coins integer not null check (coins > 0),
  -- The match that reached the level; null for rewards paid retroactively.
  match_id uuid references public.matches (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, level)
);

create index level_rewards_match_id_idx on public.level_rewards (match_id);

alter table public.level_rewards enable row level security;
revoke all on table public.level_rewards from anon, authenticated;
grant select on table public.level_rewards to authenticated;
create policy "Players read their own level rewards"
  on public.level_rewards for select to authenticated
  using (user_id = (select auth.uid()));

-- Pays every level the player has reached and not been paid for yet.
create function public.grant_level_rewards(p_user uuid, p_match_id uuid)
returns void
language sql
volatile
set search_path = ''
as $$
  with granted as (
    insert into public.level_rewards (user_id, level, coins, match_id)
    select p_user, l.level,
           public.config_int('progression.level_reward_base') + public.config_int('progression.level_reward_per_level') * l.level,
           p_match_id
    from public.profiles p
    cross join lateral generate_series(2, p.level) as l(level)
    where p.id = p_user
    on conflict (user_id, level) do nothing
    returning coins
  )
  insert into public.coin_ledger (user_id, amount, reason, ref_id)
  select p_user, coins, 'level_reward', p_match_id from granted
$$;

revoke execute on function public.grant_level_rewards(uuid, uuid) from public, anon, authenticated;

select public.grant_level_rewards(id, null) from public.profiles where level >= 2;

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
    'level_rewards', coalesce((
      select jsonb_agg(jsonb_build_object('level', lr.level, 'coins', lr.coins) order by lr.level)
      from public.level_rewards lr
      where lr.match_id = p_match_id and lr.user_id = (select user_id from mine)
    ), '[]'::jsonb),
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
