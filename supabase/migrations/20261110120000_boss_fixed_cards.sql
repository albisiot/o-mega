-- Grande Minaccia, fixed cards (SPEC §5.12, asked by the user on 9 Nov 2026): a
-- character placed on a front stays there for the rest of the match, with the score
-- it made when it arrived, and the front is closed for its side. Every turn every
-- occupied front pays its value of that turn: to the only character on it, or to
-- the higher of the two. No presidio target any more.
--
-- Each match_rounds row of a boss match now says who held each front in that turn
-- (holders); round_plays.points is what the side took that turn from every front.
-- Matches started under the first rules cannot go on under these: they end as
-- abandoned draws, which pay nothing to either side.

delete from public.game_config where key like 'boss.targets.%';

alter table public.match_rounds add column holders jsonb;

do $$
declare
  v_match uuid;
begin
  for v_match in select id from public.matches where format = 'boss' and status = 'active' for update loop
    perform public.finish_match(v_match, 'draw', 'forfeit');
  end loop;
end $$;

drop function public.match_record_boss_turn_state(uuid, integer, jsonb, jsonb, text, text);
drop function public.match_record_boss_turn(uuid, integer, jsonb, jsonb, text);

-- Stores a turn computed by the engine. Checks the turn, the cards, that each side
-- places on one of its own free fronts, the choices submitted (between players) or
-- the deadline (against a bot), who holds each front against the scores on the
-- board, the points against the table, and the final result. A play is
-- { card_instance_id, definition_id, front_slot (1-based), base, bonus, score,
-- highest, auto_played, points }; p_holders has one entry per front: "a", "b" or null.
create function public.match_record_boss_turn(
  p_match_id uuid,
  p_turn integer,
  p_play_a jsonb,
  p_play_b jsonb,
  p_holders jsonb,
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
  v_pending public.pending_plays;
  v_side text;
  v_play jsonb;
  v_instance uuid;
  v_definition uuid;
  v_position integer;
  v_auto boolean;
  v_slot integer;
  v_fronts integer;
  v_holder text;
  v_score_a integer;
  v_score_b integer;
  v_value integer;
  v_points_a integer := 0;
  v_points_b integer := 0;
  v_held_a integer := 0;
  v_held_b integer := 0;
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
  if v_match.format <> 'boss' then
    raise exception 'invalid_format';
  end if;
  if v_match.current_round <> p_turn then
    raise exception 'round_already_resolved';
  end if;
  select * into v_round from public.match_rounds where match_id = p_match_id and round = p_turn;
  if v_round.match_id is null or v_round.resolved_at is not null then
    raise exception 'round_already_resolved';
  end if;
  v_fronts := cardinality(v_match.threat_ids);
  if p_holders is null or jsonb_typeof(p_holders) <> 'array' or jsonb_array_length(p_holders) <> v_fronts then
    raise exception 'invalid_points';
  end if;

  foreach v_side in array array['a', 'b'] loop
    v_play := case v_side when 'a' then p_play_a else p_play_b end;
    v_slot := (v_play ->> 'front_slot')::integer;
    select * into v_team from public.match_teams where match_id = p_match_id and side = v_side;
    v_definition := (v_play ->> 'definition_id')::uuid;
    v_instance := (v_play ->> 'card_instance_id')::uuid;
    v_auto := coalesce((v_play ->> 'auto_played')::boolean, false);

    if v_slot is null or v_slot not between 1 and v_fronts or exists (
      select 1 from public.round_plays where match_id = p_match_id and side = v_side and front_slot = v_slot
    ) then
      -- A side places on one of its own free fronts.
      raise exception 'invalid_front';
    end if;

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
      if v_match.bot_difficulty is not null then
        -- A human choice after the deadline is refused: the engine must auto-play.
        if not v_auto and now() > v_round.deadline_at + make_interval(secs => v_grace) then
          raise exception 'round_expired';
        end if;
      else
        select * into v_pending from public.pending_plays
        where match_id = p_match_id and round = p_turn and side = v_side;
        if v_auto and v_pending.match_id is not null then
          raise exception 'choice_ignored';
        end if;
        if not v_auto and (v_pending.card_instance_id is distinct from v_instance or v_pending.front_slot is distinct from v_slot) then
          raise exception 'choice_not_submitted';
        end if;
        if v_auto and now() <= v_round.deadline_at + make_interval(secs => v_grace) then
          raise exception 'round_not_expired';
        end if;
      end if;
    end if;

    if (v_play ->> 'score')::integer is null or (v_play ->> 'score')::integer < 0 or (v_play ->> 'points')::integer is null then
      raise exception 'invalid_points';
    end if;

    insert into public.round_plays (
      match_id, round, side, card_instance_id, definition_id,
      base_score, bonus, score, highest_value, auto_played, front_slot, points
    ) values (
      p_match_id, p_turn, v_side, v_instance, v_definition,
      (v_play ->> 'base')::integer, (v_play ->> 'bonus')::integer, (v_play ->> 'score')::integer,
      (v_play ->> 'highest')::integer, v_auto, v_slot, (v_play ->> 'points')::integer
    );
  end loop;

  -- Who holds each front, against the scores on the board: the only character on
  -- it, or the higher score. An equal score is settled by the engine (highest
  -- value, Implacabile) or left to nobody.
  for f in 1 .. v_fronts loop
    v_holder := p_holders ->> (f - 1);
    if v_holder is not null and v_holder not in ('a', 'b') then
      raise exception 'invalid_points';
    end if;
    select score into v_score_a from public.round_plays where match_id = p_match_id and side = 'a' and front_slot = f;
    select score into v_score_b from public.round_plays where match_id = p_match_id and side = 'b' and front_slot = f;
    if (v_score_a is null and v_score_b is null and v_holder is not null)
       or (v_score_a is not null and v_score_b is null and v_holder is distinct from 'a')
       or (v_score_a is null and v_score_b is not null and v_holder is distinct from 'b')
       or (v_score_a > v_score_b and v_holder is distinct from 'a')
       or (v_score_a < v_score_b and v_holder is distinct from 'b') then
      raise exception 'invalid_points';
    end if;
    v_value := (v_match.boss_values -> (p_turn - 1) ->> (f - 1))::integer;
    if v_holder = 'a' then
      v_points_a := v_points_a + v_value;
      v_held_a := v_held_a + 1;
    elsif v_holder = 'b' then
      v_points_b := v_points_b + v_value;
      v_held_b := v_held_b + 1;
    end if;
  end loop;
  if v_points_a <> (p_play_a ->> 'points')::integer or v_points_b <> (p_play_b ->> 'points')::integer then
    raise exception 'invalid_points';
  end if;

  delete from public.pending_plays where match_id = p_match_id and round = p_turn;

  update public.match_rounds
  set holders = p_holders,
      winner_side = case when v_points_a > v_points_b then 'a' when v_points_b > v_points_a then 'b' else 'none' end,
      resolved_at = now()
  where match_id = p_match_id and round = p_turn;

  update public.matches
  set points_a = points_a + v_points_a,
      points_b = points_b + v_points_b,
      rounds_won_a = rounds_won_a + v_held_a,
      rounds_won_b = rounds_won_b + v_held_b,
      total_score_a = total_score_a + (p_play_a ->> 'score')::integer,
      total_score_b = total_score_b + (p_play_b ->> 'score')::integer
  where id = p_match_id
  returning points_a, points_b, rounds_won_a, rounds_won_b, total_score_a, total_score_b
  into v_points_a, v_points_b, v_won_a, v_won_b, v_total_a, v_total_b;

  -- Points, then fronts held, then the sum of scores, then a draw.
  v_finished := p_turn >= least(public.config_int('boss.turns'), v_fronts, jsonb_array_length(v_match.boss_values));
  v_result := case
    when not v_finished then null
    when v_points_a <> v_points_b then case when v_points_a > v_points_b then 'a' else 'b' end
    when v_won_a <> v_won_b then case when v_won_a > v_won_b then 'a' else 'b' end
    when v_total_a <> v_total_b then case when v_total_a > v_total_b then 'a' else 'b' end
    else 'draw'
  end;
  if v_result is distinct from p_result then
    raise exception 'result_mismatch';
  end if;

  if v_finished then
    perform public.finish_match(p_match_id, v_result, 'completed');
  else
    insert into public.match_rounds (match_id, round, threat_id, deadline_at)
    values (
      p_match_id, p_turn + 1, null,
      now() + make_interval(secs => public.config_int('match.reveal_pause_seconds')
                                    + public.config_int('match.round_timer_seconds'))
    );
    update public.matches set current_round = p_turn + 1 where id = p_match_id;
    perform public.notify_match(p_match_id, 'round');
  end if;
end;
$$;

-- Stores a turn, then returns the match as the given side sees it.
create function public.match_record_boss_turn_state(
  p_match_id uuid,
  p_turn integer,
  p_play_a jsonb,
  p_play_b jsonb,
  p_holders jsonb,
  p_result text,
  p_side text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.match_record_boss_turn(p_match_id, p_turn, p_play_a, p_play_b, p_holders, p_result);
  return public.match_state_payload(p_match_id, p_side);
end;
$$;

revoke execute on function public.match_record_boss_turn(uuid, integer, jsonb, jsonb, jsonb, text) from public, anon, authenticated;
revoke execute on function public.match_record_boss_turn_state(uuid, integer, jsonb, jsonb, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.match_record_boss_turn_state(uuid, integer, jsonb, jsonb, jsonb, text, text) to service_role;

-- Same as before, with who held each front in each turn.
create or replace function public.match_round_context(p_user uuid, p_match_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_side text;
begin
  select * into v_match from public.matches where id = p_match_id;
  v_side := case when v_match.player_a = p_user then 'a' when v_match.player_b = p_user then 'b' end;
  if v_side is null then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'side', v_side,
    'match', jsonb_build_object(
      'status', v_match.status,
      'format', v_match.format,
      'bot_difficulty', v_match.bot_difficulty,
      'current_round', v_match.current_round,
      'threat_ids', to_jsonb(v_match.threat_ids),
      'threat_modifiers', v_match.threat_modifiers,
      'boss_values', v_match.boss_values
    ),
    'teams', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'side', t.side,
        'card_instance_ids', to_jsonb(t.card_instance_ids),
        'definition_ids', to_jsonb(t.definition_ids)
      )), '[]'::jsonb)
      from public.match_teams t where t.match_id = p_match_id
    ),
    'rounds', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'round', r.round,
        'deadline_at', r.deadline_at,
        'winner_side', r.winner_side,
        'resolved_at', r.resolved_at,
        'holders', r.holders
      ) order by r.round), '[]'::jsonb)
      from public.match_rounds r where r.match_id = p_match_id
    ),
    'plays', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'round', p.round,
        'side', p.side,
        'card_instance_id', p.card_instance_id,
        'definition_id', p.definition_id,
        'base_score', p.base_score,
        'bonus', p.bonus,
        'score', p.score,
        'highest_value', p.highest_value,
        'auto_played', p.auto_played,
        'front_slot', p.front_slot,
        'points', p.points,
        'required', p.required
      )), '[]'::jsonb)
      from public.round_plays p where p.match_id = p_match_id
    ),
    -- Choices already submitted for the current round (matches between players).
    'pending', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'side', q.side, 'card_instance_id', q.card_instance_id, 'front_slot', q.front_slot
      )), '[]'::jsonb)
      from public.pending_plays q where q.match_id = p_match_id and q.round = v_match.current_round
    )
  );
end;
$$;

-- An opposing Annullatore stops a power on the same front: in a Grande Minaccia also
-- one already standing there. In a classic match both plays have no front: as before.
create or replace function public.nullified_in_round(p_match_id uuid, p_round integer, p_side text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select m.threat_modifiers -> (p_round - 1) ->> 'code' = 'tomb_silence'
    from public.matches m where m.id = p_match_id
  ), false)
  or exists (
    select 1
    from public.round_plays s
    join public.round_plays o on o.match_id = s.match_id and o.side <> s.side
      and o.front_slot is not distinct from s.front_slot
      and (o.round = s.round or (s.front_slot is not null and o.round < s.round))
    join public.card_definitions d on d.id = o.definition_id and d.power_code = 'nullifier'
    where s.match_id = p_match_id and s.round = p_round and s.side = p_side
  )
$$;

-- A Grande Minaccia as one side sees it: the boss, its fronts and the whole points
-- table from the start; the opponent's play of a turn only once resolved; who held
-- each front in each resolved turn.
create or replace function public.boss_state_payload(p_match_id uuid, p_side text)
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
    'format', m.format,
    'bot_difficulty', m.bot_difficulty,
    'status', m.status,
    'my_side', p_side,
    'current_round', m.current_round,
    'turns', least(public.config_int('boss.turns'), jsonb_array_length(m.boss_values)),
    'boss', (
      select jsonb_build_object('code', b.code, 'name', b.name, 'flavor', b.flavor, 'scene', b.scene)
      from public.boss_definitions b where b.id = m.boss_id
    ),
    'fronts', (
      select jsonb_agg(jsonb_build_object(
        'front', u.ord - 1, 'name', t.name, 'level', t.level,
        'abilities', to_jsonb(t.required_abilities), 'flavor', t.flavor
      ) order by u.ord)
      from unnest(m.threat_ids) with ordinality as u(id, ord)
      join public.threat_definitions t on t.id = u.id
    ),
    'values', m.boss_values,
    'points', jsonb_build_object(
      'me', case p_side when 'a' then m.points_a else m.points_b end,
      'opponent', case p_side when 'a' then m.points_b else m.points_a end
    ),
    'fronts_taken', jsonb_build_object(
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
    'level_unlocks', coalesce((
      select jsonb_agg(jsonb_build_object('name', d.name, 'level', d.unlock_level) order by d.unlock_level)
      from public.level_unlocks lu
      join public.card_definitions d on d.id = lu.definition_id
      where lu.match_id = p_match_id and lu.user_id = (select user_id from mine)
    ), '[]'::jsonb),
    'server_now', now(),
    'opponent', (
      select jsonb_build_object(
        'username', pr.username, 'avatar_url', pr.avatar_url, 'level', pr.level,
        'last_seen_at', theirs.last_seen_at
      )
      from theirs join public.profiles pr on pr.id = theirs.user_id
    ),
    'spied_cards', coalesce((
      select jsonb_agg(public.card_payload(sr.definition_id, null) || jsonb_build_object('round', sr.round) order by sr.round)
      from public.spy_reveals sr
      where sr.match_id = p_match_id and sr.side = p_side
    ), '[]'::jsonb),
    'my_team', (
      select jsonb_agg(public.card_payload(u.definition_id, u.instance_id) || jsonb_build_object(
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
        'deadline_at', mr.deadline_at,
        'resolved', mr.resolved_at is not null,
        -- Who held each front in this turn, from this side: "me", "opponent" or null.
        'holders', case when mr.holders is null then null else (
          select jsonb_agg(case when h.value = p_side then 'me' when h.value in ('a', 'b') then 'opponent' end order by h.ord)
          from jsonb_array_elements_text(mr.holders) with ordinality as h(value, ord)
        ) end,
        'my_pending', (
          select jsonb_build_object('instance_id', pp.card_instance_id, 'front', pp.front_slot - 1)
          from public.pending_plays pp
          where pp.match_id = p_match_id and pp.round = mr.round and pp.side = p_side
        ),
        -- Only whether the opponent has chosen, never what nor where.
        'opponent_has_chosen', exists (
          select 1 from public.pending_plays pp
          where pp.match_id = p_match_id and pp.round = mr.round and pp.side <> p_side
        ),
        'my_play', (
          select jsonb_build_object(
            'instance_id', rp.card_instance_id, 'definition_id', rp.definition_id,
            'base', rp.base_score, 'bonus', rp.bonus, 'score', rp.score,
            'highest', rp.highest_value, 'auto_played', rp.auto_played,
            'front', rp.front_slot - 1, 'points', rp.points
          )
          from public.round_plays rp
          where rp.match_id = p_match_id and rp.round = mr.round and rp.side = p_side
        ),
        'opponent_play', case when mr.resolved_at is null then null else (
          select public.card_payload(rp.definition_id, rp.card_instance_id) || jsonb_build_object(
            'base', rp.base_score, 'bonus', rp.bonus, 'score', rp.score,
            'highest', rp.highest_value, 'auto_played', rp.auto_played,
            'front', rp.front_slot - 1, 'points', rp.points
          )
          from public.round_plays rp
          where rp.match_id = p_match_id and rp.round = mr.round and rp.side <> p_side
        ) end
      ) order by mr.round)
      from public.match_rounds mr
      where mr.match_id = p_match_id
    ), '[]'::jsonb)
  )
  from m
$$;

-- Kept for the matches played under the first rules.
comment on column public.round_plays.required is
  'Grande Minaccia under its first rules (presidio target); null since the fixed cards.';
