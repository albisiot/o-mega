-- The server's opponent (SPEC §8.7, §8.8) chooses always before the deadline, with time to
-- spare. Its moment is drawn here when a round opens; the Edge Function plays it once that
-- moment has come, when a client asks. The clients ask every few seconds while they wait
-- (balance.ts ranked.ghosts.nudgeSeconds), so a moment right at the deadline showed only once
-- the timer had ended. Now no moment comes later than ranked.ghosts.deadline_margin_seconds
-- before the deadline, and the late moments (until now 2 to 6 seconds before it, written in the
-- function) fall in ranked.ghosts.late_seconds.*. The windows of the modes do not change.

insert into public.game_config (key, value, description) values
  ('ranked.ghosts.late_seconds.min', '4', 'Server''s opponent, late choices: least seconds before the deadline'),
  ('ranked.ghosts.late_seconds.max', '8', 'Server''s opponent, late choices: most seconds before the deadline'),
  ('ranked.ghosts.deadline_margin_seconds', '4', 'Server''s opponent: no choice later than this many seconds before the deadline');

-- Same as in 20261117230000_ranked.sql, with the late window and the margin from game_config.
create or replace function public.ranked_plan_ghost_turn(p_match_id uuid, p_round integer)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_match public.matches;
  v_deadline timestamptz;
  v_kind text;
  v_threats integer;
  v_ready timestamptz;
  v_min integer;
  v_max integer;
begin
  if not exists (select 1 from public.ranked_matches rm where rm.match_id = p_match_id and rm.ghost_id is not null) then
    return;
  end if;
  select * into v_match from public.matches where id = p_match_id;
  select r.deadline_at into v_deadline from public.match_rounds r where r.match_id = p_match_id and r.round = p_round;
  if v_deadline is null then
    return;
  end if;

  if public.is_quadrant(v_match.format) then
    -- Moves alternate from the side that opens; the server's opponent is side b.
    if (case when p_round % 2 = 1 then v_match.quadrant_first
             else case v_match.quadrant_first when 'a' then 'b' else 'a' end end) <> 'b' then
      return;
    end if;
    v_kind := 'quadrant';
  elsif v_match.format = 'triple' then
    v_threats := public.config_int('triple.threats');
    select t.ready_at into v_ready from public.ranked_ghost_turns t
    where t.match_id = p_match_id and (t.round - 1) / v_threats = (p_round - 1) / v_threats
    limit 1;
    v_kind := case when (p_round - 1) / v_threats = 0 then 'triple_first' else 'triple' end;
  else
    v_kind := v_match.format;
  end if;

  if v_ready is null then
    v_min := public.config_int('ranked.ghosts.delays.' || v_kind || '.min');
    v_max := public.config_int('ranked.ghosts.delays.' || v_kind || '.max');
    v_ready := now() + make_interval(secs => v_min + random() * greatest(0, v_max - v_min));
    if random() * 100 < public.config_int('ranked.ghosts.late_chance_percent') then
      v_min := public.config_int('ranked.ghosts.late_seconds.min');
      v_max := public.config_int('ranked.ghosts.late_seconds.max');
      v_ready := v_deadline - make_interval(secs => v_min + random() * greatest(0, v_max - v_min));
    end if;
    v_ready := least(v_ready, v_deadline - make_interval(secs => public.config_int('ranked.ghosts.deadline_margin_seconds')));
  end if;
  insert into public.ranked_ghost_turns (match_id, round, ready_at)
  values (p_match_id, p_round, v_ready)
  on conflict do nothing;
end;
$$;

revoke execute on function public.ranked_plan_ghost_turn(uuid, integer) from public, anon, authenticated;
