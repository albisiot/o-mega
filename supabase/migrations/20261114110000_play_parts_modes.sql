-- The parts of a play's bonus (20261114100000_play_parts.sql) in the Grande Minaccia,
-- Allarme Triplo and Emergenza too: the "match" Edge Function sends them with every turn,
-- round and play; the database checks them, stores them and gives them back in the state,
-- so every result page tells the powers exactly as the server counted them. Rules do not
-- change; plays stored before have no parts and the pages work them out as before.

-- Grande Minaccia: a turn is a row of round_plays per side, like a classic round.
create or replace function public.match_record_boss_turn_state(
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
  perform public.store_play_parts(p_match_id, p_turn, 'a', p_play_a);
  perform public.store_play_parts(p_match_id, p_turn, 'b', p_play_b);
  return public.match_state_payload(p_match_id, p_side);
end;
$$;

-- Allarme Triplo: a round is one row of round_plays per threat and side, contest
-- c = (round - 1) × threats + threat, in the order of the plays sent.
create or replace function public.match_record_triple_round_state(
  p_match_id uuid,
  p_round integer,
  p_plays_a jsonb,
  p_plays_b jsonb,
  p_winners jsonb,
  p_result text,
  p_side text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_threats integer := public.config_int('triple.threats');
begin
  perform public.match_record_triple_round(p_match_id, p_round, p_plays_a, p_plays_b, p_winners, p_result);
  for v_slot in 0 .. v_threats - 1 loop
    perform public.store_play_parts(p_match_id, (p_round - 1) * v_threats + v_slot + 1, 'a', p_plays_a -> v_slot);
    perform public.store_play_parts(p_match_id, (p_round - 1) * v_threats + v_slot + 1, 'b', p_plays_b -> v_slot);
  end loop;
  return public.match_state_payload(p_match_id, p_side);
end;
$$;

-- The parts of the Allarme Triplo plays the payload already shows, contest by contest.
create function public.with_triple_play_parts(p_payload jsonb, p_match_id uuid, p_side text)
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
        case when jsonb_typeof(g.value -> 'contests') = 'array' then
          g.value || jsonb_build_object('contests', (
            select jsonb_agg(
              c.value
              || case when jsonb_typeof(c.value -> 'my_play') = 'object' and mine.parts is not null
                   then jsonb_build_object('my_play', (c.value -> 'my_play') || jsonb_build_object('parts', mine.parts))
                   else '{}'::jsonb end
              || case when jsonb_typeof(c.value -> 'opponent_play') = 'object' and theirs.parts is not null
                   then jsonb_build_object('opponent_play', (c.value -> 'opponent_play') || jsonb_build_object('parts', theirs.parts))
                   else '{}'::jsonb end
              order by c.ordinality)
            from jsonb_array_elements(g.value -> 'contests') with ordinality as c(value, ordinality)
            left join public.round_plays mine
              on mine.match_id = p_match_id and mine.side = p_side
              and mine.round = ((g.value ->> 'round')::integer - 1) * public.config_int('triple.threats') + (c.value ->> 'slot')::integer + 1
            left join public.round_plays theirs
              on theirs.match_id = p_match_id and theirs.side <> p_side
              and theirs.round = ((g.value ->> 'round')::integer - 1) * public.config_int('triple.threats') + (c.value ->> 'slot')::integer + 1
          ))
        else g.value end
        order by g.ordinality)
      from jsonb_array_elements(p_payload -> 'rounds') with ordinality as g(value, ordinality)
    ), '[]'::jsonb))
  end
$$;

-- The match as one side sees it: every format with stored plays now brings their parts.
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
    return public.with_play_parts(public.boss_state_payload(p_match_id, p_side), p_match_id, p_side);
  elsif v_format = 'triple' then
    return public.with_triple_play_parts(
      public.with_rare_triple_rules(public.triple_state_payload(p_match_id, p_side), p_match_id),
      p_match_id,
      p_side
    );
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

-- Emergenza: the plays have their own table.
alter table public.emergency_plays add column parts jsonb;

comment on column public.emergency_plays.parts is
  'Where the bonus comes from: {power, carried, pack, modifier, floor}, integers adding up to bonus. Null for older plays.';

-- A play stored with its parts, then today's state. The parts are optional (an older Edge
-- Function sends none) but never wrong: wrong ones refuse the whole play.
drop function public.emergency_record_play_state(uuid, integer, uuid, integer, integer, integer, integer);

create function public.emergency_record_play_state(
  p_user uuid,
  p_round integer,
  p_card_instance_id uuid,
  p_base integer,
  p_bonus integer,
  p_score integer,
  p_required integer,
  p_parts jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.emergency_record_play(p_user, p_round, p_card_instance_id, p_base, p_bonus, p_score, p_required);
  if p_parts is not null and jsonb_typeof(p_parts) <> 'null' then
    if not public.play_parts_valid(p_parts, p_bonus) then
      raise exception 'invalid_play_parts' using errcode = '22023';
    end if;
    update public.emergency_plays p
    set parts = p_parts
    from public.emergency_runs r
    where r.id = p.run_id and r.user_id = p_user and r.day = public.game_day() and p.round = p_round;
  end if;
  return public.emergency_state_payload(p_user);
end;
$$;

-- The Emergenza state: as before (20261113100000_match_rewards.sql), and each play of
-- today's run brings its parts.
create or replace function public.emergency_state_payload(p_user uuid)
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
  ), withxp as (
    select case
      when jsonb_typeof(w.p -> 'run') = 'object' then jsonb_set(w.p, '{run,xp}', to_jsonb(coalesce((
        select r.xp from public.emergency_runs r where r.user_id = p_user and r.day = public.game_day()
      ), 0)))
      else w.p
    end as p
    from withrules w
  )
  select case
    when jsonb_typeof(x.p -> 'run' -> 'plays') is distinct from 'array' then x.p
    else jsonb_set(x.p, '{run,plays}', coalesce((
      select jsonb_agg(
        case when e.parts is not null then pl.value || jsonb_build_object('parts', e.parts) else pl.value end
        order by pl.ordinality)
      from jsonb_array_elements(x.p -> 'run' -> 'plays') with ordinality as pl(value, ordinality)
      left join public.emergency_runs r on r.user_id = p_user and r.day = public.game_day()
      left join public.emergency_plays e on e.run_id = r.id and e.round = (pl.value ->> 'round')::integer
    ), '[]'::jsonb))
  end
  from withxp x
$$;

revoke execute on function public.with_triple_play_parts(jsonb, uuid, text) from public, anon, authenticated;
grant execute on function public.with_triple_play_parts(jsonb, uuid, text) to service_role;
revoke execute on function public.emergency_record_play_state(uuid, integer, uuid, integer, integer, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.emergency_record_play_state(uuid, integer, uuid, integer, integer, integer, integer, jsonb) to service_role;
