-- M9 · Match history and automatic closing of abandoned matches.

insert into public.game_config (key, value, description) values
  ('match.abandon_after_minutes', '10', 'Minutes past a round deadline after which nobody is considered to be playing');

-- While someone is playing, a client resolves each round at its deadline, so
-- a deadline long past means nobody is there. Against a bot the player loses;
-- between players it is a draw, with no card moved, coins or XP for anyone.
-- There is no scheduled job: this runs whenever one of the players comes back.
create function public.close_abandoned_matches(p_user uuid)
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
    perform public.finish_match(v_match.id, case when v_match.mode = 'bot' then 'b' else 'draw' end, 'forfeit');
  end loop;
end;
$$;

revoke execute on function public.close_abandoned_matches(uuid) from public, anon, authenticated;

-- Same checks as before, after closing abandoned matches and settling picks.
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
  perform public.close_abandoned_matches(p_user);
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

-- The signature is unchanged, but it now writes, so it can no longer be stable.
create or replace function public.get_active_match()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then
    return null;
  end if;
  perform public.close_abandoned_matches(v_uid);
  select jsonb_build_object('id', m.id, 'mode', m.mode, 'bot_difficulty', m.bot_difficulty, 'current_round', m.current_round)
  into v_result
  from public.matches m
  where m.status = 'active' and (m.player_a = v_uid or m.player_b = v_uid)
  limit 1;
  return v_result;
end;
$$;

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
  perform public.close_abandoned_matches(auth.uid());
  perform public.settle_expired_claims(auth.uid());
  return public.match_state_payload(p_match_id, v_side);
end;
$$;

-- The caller's finished matches, newest first.
create function public.get_match_history(p_limit integer default 30)
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
            'won', c.winner_id = auth.uid(),
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

revoke execute on function public.get_match_history(integer) from public, anon;
grant execute on function public.get_match_history(integer) to authenticated;
