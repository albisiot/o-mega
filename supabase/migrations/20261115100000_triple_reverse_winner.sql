-- Allarme Triplo under Rovescio (SPEC §5.15): the lower score wins the threat.
-- match_record_triple_round checked the winner against the scores as if the
-- higher score always won, so a Rovescio threat won on a lower score was
-- refused (invalid_points) and the round could not be recorded. The check now
-- reads the threat's rule; everything else is unchanged.

create or replace function public.match_record_triple_round(
  p_match_id uuid,
  p_round integer,
  p_plays_a jsonb,
  p_plays_b jsonb,
  p_winners jsonb,
  p_result text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_team public.match_teams;
  v_pending public.pending_plays;
  v_threats integer := public.config_int('triple.threats');
  v_rounds integer := public.config_int('triple.rounds');
  v_first integer := (p_round - 1) * public.config_int('triple.threats') + 1;
  v_deadline timestamptz;
  v_side text;
  v_plays jsonb;
  v_play jsonb;
  v_contest integer;
  v_position integer;
  v_instance uuid;
  v_definition uuid;
  v_auto boolean;
  v_hand_instances uuid[];
  v_hand_definitions uuid[];
  v_placed uuid[];
  v_pending_count integer;
  v_winner text;
  v_score_a integer;
  v_score_b integer;
  v_lower boolean;
  v_won_a integer := 0;
  v_won_b integer := 0;
  v_sum_a integer := 0;
  v_sum_b integer := 0;
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
  if v_match.format <> 'triple' then
    raise exception 'invalid_format';
  end if;
  if p_round is null or p_round < 1 or v_match.current_round <> v_first then
    raise exception 'round_already_resolved';
  end if;
  select max(deadline_at) into v_deadline
  from public.match_rounds
  where match_id = p_match_id and round between v_first and v_first + v_threats - 1 and resolved_at is null;
  if v_deadline is null
     or (select count(*) from public.match_rounds
         where match_id = p_match_id and round between v_first and v_first + v_threats - 1 and resolved_at is null) <> v_threats then
    raise exception 'round_already_resolved';
  end if;
  if jsonb_typeof(p_plays_a) is distinct from 'array' or jsonb_array_length(p_plays_a) <> v_threats
     or jsonb_typeof(p_plays_b) is distinct from 'array' or jsonb_array_length(p_plays_b) <> v_threats
     or jsonb_typeof(p_winners) is distinct from 'array' or jsonb_array_length(p_winners) <> v_threats then
    raise exception 'invalid_placement';
  end if;

  foreach v_side in array array['a', 'b'] loop
    v_plays := case v_side when 'a' then p_plays_a else p_plays_b end;
    select * into v_team from public.match_teams where match_id = p_match_id and side = v_side;
    v_hand_instances := v_team.card_instance_ids[v_first:v_first + v_threats - 1];
    v_hand_definitions := v_team.definition_ids[v_first:v_first + v_threats - 1];
    v_placed := array[]::uuid[];

    select count(*) into v_pending_count from public.pending_plays
    where match_id = p_match_id and side = v_side and round between v_first and v_first + v_threats - 1;

    for s in 1 .. v_threats loop
      v_play := v_plays -> (s - 1);
      v_contest := v_first + s - 1;
      v_definition := (v_play ->> 'definition_id')::uuid;
      v_instance := (v_play ->> 'card_instance_id')::uuid;
      v_auto := coalesce((v_play ->> 'auto_played')::boolean, false);

      -- Only the cards drawn this round, each on one threat.
      if v_team.card_instance_ids is not null then
        v_position := array_position(v_hand_instances, v_instance);
        if v_position is null or v_hand_definitions[v_position] is distinct from v_definition then
          raise exception 'character_not_available';
        end if;
      elsif v_instance is not null or not (v_definition = any (v_hand_definitions)) then
        raise exception 'character_not_available';
      end if;
      if v_definition = any (v_placed) then
        raise exception 'invalid_placement';
      end if;
      v_placed := v_placed || v_definition;

      if v_team.user_id is not null then
        if v_match.bot_difficulty is not null then
          -- A human choice after the deadline is refused: the engine must place at random.
          if not v_auto and now() > v_deadline + make_interval(secs => v_grace) then
            raise exception 'round_expired';
          end if;
        else
          select * into v_pending from public.pending_plays
          where match_id = p_match_id and round = v_contest and side = v_side;
          if v_auto and v_pending_count > 0 then
            raise exception 'choice_ignored';
          end if;
          if not v_auto and v_pending.card_instance_id is distinct from v_instance then
            raise exception 'choice_not_submitted';
          end if;
          if v_auto and now() <= v_deadline + make_interval(secs => v_grace) then
            raise exception 'round_not_expired';
          end if;
        end if;
      end if;

      if (v_play ->> 'score')::integer is null or (v_play ->> 'score')::integer < 0 then
        raise exception 'invalid_points';
      end if;

      insert into public.round_plays (
        match_id, round, side, card_instance_id, definition_id,
        base_score, bonus, score, highest_value, auto_played
      ) values (
        p_match_id, v_contest, v_side, v_instance, v_definition,
        (v_play ->> 'base')::integer, (v_play ->> 'bonus')::integer, (v_play ->> 'score')::integer,
        (v_play ->> 'highest')::integer, v_auto
      );
    end loop;
  end loop;

  -- Who won each threat, against the scores: an equal score is settled by the
  -- engine (Implacabile, highest value) or left to nobody. Under Rovescio the
  -- lower score wins (SPEC §5.15).
  for s in 1 .. v_threats loop
    v_contest := v_first + s - 1;
    v_winner := p_winners ->> (s - 1);
    if v_winner is not null and v_winner not in ('a', 'b') then
      raise exception 'invalid_points';
    end if;
    v_score_a := (p_plays_a -> (s - 1) ->> 'score')::integer;
    v_score_b := (p_plays_b -> (s - 1) ->> 'score')::integer;
    v_lower := coalesce(v_match.threat_modifiers -> (v_contest - 1) ->> 'code', '') = 'reverse';
    if (v_score_a <> v_score_b and v_winner is distinct from case when (v_score_a > v_score_b) <> v_lower then 'a' else 'b' end) then
      raise exception 'invalid_points';
    end if;
    v_won_a := v_won_a + (v_winner is not distinct from 'a')::integer;
    v_won_b := v_won_b + (v_winner is not distinct from 'b')::integer;
    v_sum_a := v_sum_a + v_score_a;
    v_sum_b := v_sum_b + v_score_b;
    update public.match_rounds
    set winner_side = coalesce(v_winner, 'none'), resolved_at = now()
    where match_id = p_match_id and round = v_contest;
  end loop;

  delete from public.pending_plays
  where match_id = p_match_id and round between v_first and v_first + v_threats - 1;

  update public.matches
  set rounds_won_a = rounds_won_a + v_won_a,
      rounds_won_b = rounds_won_b + v_won_b,
      total_score_a = total_score_a + v_sum_a,
      total_score_b = total_score_b + v_sum_b
  where id = p_match_id
  returning rounds_won_a, rounds_won_b, total_score_a, total_score_b
  into v_won_a, v_won_b, v_total_a, v_total_b;

  -- Points, then the sum of scores, then a draw.
  v_finished := p_round >= v_rounds;
  v_result := case
    when not v_finished then null
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
    perform public.open_triple_round(p_match_id, p_round + 1);
    perform public.notify_match(p_match_id, 'round');
  end if;
end;
$$;

revoke execute on function public.match_record_triple_round(uuid, integer, jsonb, jsonb, jsonb, text) from public, anon, authenticated;
