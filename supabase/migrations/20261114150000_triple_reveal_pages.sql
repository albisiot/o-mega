-- Allarme Triplo now tells a round like a classic one: a comic page per threat, with the
-- powers' balloons and effects, then the recap (triple-comic.tsx). Three pages take longer
-- than one: from the second round on, the next timer waits up to triple.reveal_pause_seconds
-- (the pages leave earlier once they are over; leaving earlier only adds to the time to
-- place, the timer shown never goes past its 45 seconds). The first round, with nothing to
-- tell before it, keeps the usual pause. Rules do not change.

insert into public.game_config (key, value, description) values
  ('triple.reveal_pause_seconds', '40',
   'Allarme Triplo: seconds a round''s result (a page per threat, then the recap) may stay before the next timer starts');

-- As in 20261110230000_triple_alarm.sql, with the longer pause after a resolved round.
create or replace function public.open_triple_round(p_match_id uuid, p_round integer)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_threats integer := public.config_int('triple.threats');
  v_ids uuid[];
  v_deadline timestamptz := now() + make_interval(
    secs => case when p_round > 1 then public.config_int('triple.reveal_pause_seconds')
                 else public.config_int('match.reveal_pause_seconds') end
            + public.config_int('triple.round_timer_seconds')
  );
begin
  select threat_ids into v_ids from public.matches where id = p_match_id;
  insert into public.match_rounds (match_id, round, threat_id, deadline_at)
  select p_match_id, (p_round - 1) * v_threats + s, v_ids[(p_round - 1) * v_threats + s], v_deadline
  from generate_series(1, v_threats) as s;
  update public.matches set current_round = (p_round - 1) * v_threats + 1 where id = p_match_id;
end;
$$;

revoke execute on function public.open_triple_round(uuid, integer) from public, anon, authenticated;
