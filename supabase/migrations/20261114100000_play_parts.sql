-- Where each play's bonus comes from (SPEC §11, the result page as a comic page): the
-- rules engine splits it into its own power, the bonus carried from the side's previous
-- character, Capobranco, the threat's rule points and what the floor at 0 gave back.
-- The "match" Edge Function sends the parts with every classic round; the database
-- stores them with the play and gives them back in the match state, so the page tells
-- the powers exactly as the server counted them. Rules do not change. Plays stored
-- before this migration have no parts: the page then works them out as before.

alter table public.round_plays add column parts jsonb;

comment on column public.round_plays.parts is
  'Where the bonus comes from: {power, carried, pack, modifier, floor}, integers adding up to bonus. Null for older plays.';

-- Whether some parts are well formed and add up to the play's bonus.
create function public.play_parts_valid(p_parts jsonb, p_bonus integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_parts) = 'object'
    and (select array_agg(key order by key) from jsonb_each(p_parts)) = array['carried', 'floor', 'modifier', 'pack', 'power']
    and (select bool_and(jsonb_typeof(value) = 'number' and (value #>> '{}') ~ '^-?[0-9]+$') from jsonb_each(p_parts))
    and (select sum((value #>> '{}')::integer) from jsonb_each(p_parts)) = p_bonus
$$;

-- Stores the parts a play brought, if any; wrong parts are refused, never stored.
create function public.store_play_parts(p_match_id uuid, p_round integer, p_side text, p_play jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_play -> 'parts' is null or jsonb_typeof(p_play -> 'parts') = 'null' then
    return;
  end if;
  if not public.play_parts_valid(p_play -> 'parts', (p_play ->> 'bonus')::integer) then
    raise exception 'invalid_play_parts' using errcode = '22023';
  end if;
  update public.round_plays
  set parts = p_play -> 'parts'
  where match_id = p_match_id and round = p_round and side = p_side;
end;
$$;

-- Stores a round with its parts, then returns the match as the given side sees it.
create or replace function public.match_record_round_state(
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
  perform public.store_play_parts(p_match_id, p_round, 'a', p_play_a);
  perform public.store_play_parts(p_match_id, p_round, 'b', p_play_b);
  return public.match_state_payload(p_match_id, p_side);
end;
$$;

-- The parts of every play the payload already shows: the player's own plays, and the
-- opponent's only where the payload shows them (resolved rounds), so nothing leaks.
create function public.with_play_parts(p_payload jsonb, p_match_id uuid, p_side text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when jsonb_typeof(p_payload -> 'rounds') is distinct from 'array' then p_payload
    else jsonb_set(p_payload, '{rounds}', coalesce((
      select jsonb_agg(
        r.value
        || case when jsonb_typeof(r.value -> 'my_play') = 'object' and mine.parts is not null
             then jsonb_build_object('my_play', (r.value -> 'my_play') || jsonb_build_object('parts', mine.parts))
             else '{}'::jsonb end
        || case when jsonb_typeof(r.value -> 'opponent_play') = 'object' and theirs.parts is not null
             then jsonb_build_object('opponent_play', (r.value -> 'opponent_play') || jsonb_build_object('parts', theirs.parts))
             else '{}'::jsonb end
        order by r.ordinality)
      from jsonb_array_elements(p_payload -> 'rounds') with ordinality as r(value, ordinality)
      left join public.round_plays mine
        on mine.match_id = p_match_id and mine.round = (r.value ->> 'round')::integer and mine.side = p_side
      left join public.round_plays theirs
        on theirs.match_id = p_match_id and theirs.round = (r.value ->> 'round')::integer and theirs.side <> p_side
    ), '[]'::jsonb))
  end
$$;

-- The match as one side sees it: the classic one now brings the parts of its plays.
create or replace function public.match_state_payload(p_match_id uuid, p_side text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_format text := (select format from public.matches where id = p_match_id);
begin
  if v_format = 'boss' then
    return public.boss_state_payload(p_match_id, p_side);
  elsif v_format = 'triple' then
    return public.with_rare_triple_rules(public.triple_state_payload(p_match_id, p_side), p_match_id);
  elsif public.is_quadrant(v_format) then
    return public.quadrant_state_payload(p_match_id, p_side);
  end if;
  return public.with_play_parts(
    public.with_rare_rules(public.classic_match_state_payload(p_match_id, p_side), p_match_id, p_side),
    p_match_id,
    p_side
  );
end;
$$;

revoke execute on function public.play_parts_valid(jsonb, integer) from public, anon, authenticated;
revoke execute on function public.store_play_parts(uuid, integer, text, jsonb) from public, anon, authenticated;
revoke execute on function public.with_play_parts(jsonb, uuid, text) from public, anon, authenticated;
grant execute on function public.play_parts_valid(jsonb, integer) to service_role;
grant execute on function public.store_play_parts(uuid, integer, text, jsonb) to service_role;
grant execute on function public.with_play_parts(jsonb, uuid, text) to service_role;
