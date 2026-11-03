-- Fewer database round trips per round, for the "match" Edge Function.
-- A bot round went through four sequential requests (match, teams/rounds/plays,
-- record, state) and an Emergenza play through six. Each function below answers
-- in one request what the function used to ask in several: the rules and the
-- checks stay in match_record_round and emergency_record_play, unchanged.

-- Everything the Edge Function needs to rebuild a match for the engine.
create function public.match_round_context(p_user uuid, p_match_id uuid)
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
      'bot_difficulty', v_match.bot_difficulty,
      'current_round', v_match.current_round,
      'threat_ids', to_jsonb(v_match.threat_ids),
      'threat_modifiers', v_match.threat_modifiers
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
        'resolved_at', r.resolved_at
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
        'auto_played', p.auto_played
      )), '[]'::jsonb)
      from public.round_plays p where p.match_id = p_match_id
    ),
    -- Choices already submitted for the current round (matches between players).
    'pending', (
      select coalesce(jsonb_agg(jsonb_build_object('side', q.side, 'card_instance_id', q.card_instance_id)), '[]'::jsonb)
      from public.pending_plays q where q.match_id = p_match_id and q.round = v_match.current_round
    )
  );
end;
$$;

-- Stores a round, then returns the match as the given side sees it.
create function public.match_record_round_state(
  p_match_id uuid,
  p_round integer,
  p_play_a jsonb,
  p_play_b jsonb,
  p_winner_side text,
  p_result text,
  p_side text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.match_record_round(p_match_id, p_round, p_play_a, p_play_b, p_winner_side, p_result);
  return public.match_state_payload(p_match_id, p_side);
end;
$$;

-- The match as one of its players sees it.
create function public.match_state_for_user(p_match_id uuid, p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_side text;
begin
  select case when player_a = p_user then 'a' when player_b = p_user then 'b' end into v_side
  from public.matches where id = p_match_id;
  if v_side is null then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;
  return public.match_state_payload(p_match_id, v_side);
end;
$$;

-- Today's attempt of a player, with the day's threats and the plays so far.
create function public.emergency_play_context(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'run', (
      select jsonb_build_object(
        'id', r.id,
        'status', r.status,
        'current_round', r.current_round,
        'card_instance_ids', to_jsonb(r.card_instance_ids),
        'definition_ids', to_jsonb(r.definition_ids)
      )
      from public.emergency_runs r where r.user_id = p_user and r.day = public.game_day()
    ),
    'threat_ids', (select to_jsonb(d.threat_ids) from public.emergency_days d where d.day = public.game_day()),
    'plays', (
      select coalesce(jsonb_agg(jsonb_build_object('card_instance_id', p.card_instance_id, 'passed', p.passed) order by p.round), '[]'::jsonb)
      from public.emergency_plays p
      join public.emergency_runs r on r.id = p.run_id
      where r.user_id = p_user and r.day = public.game_day()
    )
  )
$$;

-- Stores an Emergenza play, then returns the player's state.
create function public.emergency_record_play_state(
  p_user uuid,
  p_round integer,
  p_card_instance_id uuid,
  p_base integer,
  p_bonus integer,
  p_score integer,
  p_required integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.emergency_record_play(p_user, p_round, p_card_instance_id, p_base, p_bonus, p_score, p_required);
  return public.emergency_state_payload(p_user);
end;
$$;

-- Bot matches have no listener: the client follows them through its own
-- requests, so their broadcasts only filled realtime.messages.
create or replace function public.notify_match(p_match_id uuid, p_kind text)
returns void
language sql
volatile
set search_path = ''
as $$
  select realtime.send(jsonb_build_object('kind', p_kind), 'update', 'match:' || p_match_id, false)
  where exists (select 1 from public.matches where id = p_match_id and bot_difficulty is null)
$$;

revoke execute on function public.match_round_context(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.match_record_round_state(uuid, integer, jsonb, jsonb, text, text, text) from public, anon, authenticated;
revoke execute on function public.match_state_for_user(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.emergency_play_context(uuid) from public, anon, authenticated;
revoke execute on function public.emergency_record_play_state(uuid, integer, uuid, integer, integer, integer, integer) from public, anon, authenticated;

grant execute on function public.match_round_context(uuid, uuid) to service_role;
grant execute on function public.match_record_round_state(uuid, integer, jsonb, jsonb, text, text, text) to service_role;
grant execute on function public.match_state_for_user(uuid, uuid) to service_role;
grant execute on function public.emergency_play_context(uuid) to service_role;
grant execute on function public.emergency_record_play_state(uuid, integer, uuid, integer, integer, integer, integer) to service_role;
