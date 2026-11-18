-- Emergenza: Rovescio decides the outcome of the daily threats too (SPEC §5.15).
-- Under Rovescio (EP03 «Il mondo capovolto», LE06 «L'ombra di mezzogiorno») a
-- threat is passed at or under its target, as the rules engine and the client
-- preview say. emergency_record_play stored score >= target for every threat, so
-- on those threats the run's passed and failed counts, the coin tiers, the end at
-- the third failure and everything the plays' triggers award were reversed.
-- Same body as in 20261102090000_emergency.sql, plus the rule of the round read
-- from the stored day, as emergency_week_record_play does for the week.

create or replace function public.emergency_record_play(
  p_user uuid,
  p_round integer,
  p_card_instance_id uuid,
  p_base integer,
  p_bonus integer,
  p_score integer,
  p_required integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.emergency_runs;
  v_threat uuid;
  v_modifier text;
  v_position integer;
  v_definition uuid;
  v_passed boolean;
  v_total_passed integer;
  v_total_failed integer;
  v_coins integer := 0;
  v_tier integer;
  v_finished boolean;
begin
  select * into v_run from public.emergency_runs
  where user_id = p_user and day = public.game_day()
  for update;
  if v_run.id is null then
    raise exception 'emergency_not_started';
  end if;
  if v_run.status <> 'active' then
    raise exception 'emergency_already_played';
  end if;
  if v_run.current_round <> p_round then
    raise exception 'round_already_resolved';
  end if;

  v_position := array_position(v_run.card_instance_ids, p_card_instance_id);
  if v_position is null then
    raise exception 'character_not_available';
  end if;
  v_definition := v_run.definition_ids[v_position];
  if exists (select 1 from public.emergency_plays where run_id = v_run.id and definition_id = v_definition) then
    raise exception 'character_already_played';
  end if;
  if p_score <> p_base + p_bonus then
    raise exception 'result_mismatch';
  end if;

  select d.threat_ids[p_round], d.threat_modifiers -> (p_round - 1) ->> 'code'
  into v_threat, v_modifier
  from public.emergency_days d where d.day = v_run.day;
  -- Rovescio: the lower score wins, so the threat is passed at or under its target.
  v_passed := case
    when v_modifier = 'reverse' then p_score <= p_required
    else p_score >= p_required
  end;
  insert into public.emergency_plays (
    run_id, round, threat_id, card_instance_id, definition_id,
    base_score, bonus, score, required_score, passed
  ) values (
    v_run.id, p_round, v_threat, p_card_instance_id, v_definition,
    p_base, p_bonus, p_score, p_required, v_passed
  );

  v_total_passed := v_run.passed + v_passed::integer;
  v_total_failed := v_run.failed + (not v_passed)::integer;

  if v_passed then
    foreach v_tier in array array[1, 2, 3] loop
      if v_total_passed = public.config_int(format('emergency.rewards.tier%s_passed', v_tier)) then
        v_coins := public.config_int(format('emergency.rewards.tier%s_coins', v_tier));
        insert into public.coin_ledger (user_id, amount, reason, ref_id)
        values (p_user, v_coins, 'emergency_reward', v_run.id);
      end if;
    end loop;
  end if;

  v_finished := p_round >= public.config_int('emergency.threats_per_run')
                or v_total_failed >= public.config_int('emergency.max_failures');

  update public.emergency_runs
  set passed = v_total_passed,
      failed = v_total_failed,
      total_score = total_score + p_score,
      coins = coins + v_coins,
      current_round = case when v_finished then p_round else p_round + 1 end,
      status = case when v_finished then 'finished' else 'active' end,
      finished_at = case when v_finished then now() end
  where id = v_run.id;
end;
$$;

-- create or replace keeps the grants of 20261102090000_emergency.sql: service only.
revoke execute on function public.emergency_record_play(uuid, integer, uuid, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.emergency_record_play(uuid, integer, uuid, integer, integer, integer, integer) to service_role;
