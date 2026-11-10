-- Daily objectives catalog managed from the app (/gestione-obiettivi), by admins
-- only (admin_users): list, create, edit, switch on and off, delete. Every
-- function checks the admin on the server. A change reaches players from the
-- next draw: objectives already handed out keep their copy of the row.

-- The catalog with how often each objective was handed out, and the rules the page shows.
create function public.admin_daily_objectives_payload()
returns jsonb
language sql
volatile
set search_path = ''
as $$
  select jsonb_build_object(
    'objectives', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', d.code,
        'title', d.title,
        'difficulty', d.difficulty,
        'metric', d.metric,
        'params', d.params,
        'target', d.target,
        'coins', d.coins,
        'packs', d.packs,
        'cards', cardinality(d.card_definition_ids),
        'is_active', d.is_active,
        'assigned', (select count(*) from public.daily_objectives o where o.definition_code = d.code)
      ) order by case d.difficulty when 'easy' then 1 when 'medium' then 2 else 3 end, d.created_at, d.code)
      from public.daily_objective_definitions d
    ), '[]'::jsonb),
    'per_day', jsonb_build_object(
      'easy', public.config_int('daily_objectives.per_day.easy'),
      'medium', public.config_int('daily_objectives.per_day.medium'),
      'hard', public.config_int('daily_objectives.per_day.hard')
    ),
    'reward_coins', jsonb_build_object(
      'easy', public.config_int('daily_objectives.reward_coins.easy'),
      'medium', public.config_int('daily_objectives.reward_coins.medium'),
      'hard', public.config_int('daily_objectives.reward_coins.hard')
    )
  )
$$;

revoke execute on function public.admin_daily_objectives_payload() from public, anon, authenticated;

-- Each difficulty must keep at least as many active objectives as a player gets per day.
create function public.check_daily_objectives_enough()
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_difficulty text;
begin
  foreach v_difficulty in array array['easy', 'medium', 'hard'] loop
    if (select count(*) from public.daily_objective_definitions d where d.is_active and d.difficulty = v_difficulty)
       < public.config_int('daily_objectives.per_day.' || v_difficulty) then
      raise exception 'objectives_too_few';
    end if;
  end loop;
end;
$$;

revoke execute on function public.check_daily_objectives_enough() from public, anon, authenticated;

create function public.admin_list_daily_objectives()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return public.admin_daily_objectives_payload();
end;
$$;

-- Creates an objective (p_code null) or changes one. p_coins null: the difficulty's coins.
-- Reward cards, set with SQL, are kept as they are.
create function public.admin_save_daily_objective(
  p_code text,
  p_title text,
  p_difficulty text,
  p_metric text,
  p_params jsonb,
  p_target integer,
  p_coins integer,
  p_packs integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
  v_params jsonb := coalesce(p_params, '{}'::jsonb);
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if char_length(v_title) not between 3 and 80
     or p_difficulty is null or p_difficulty not in ('easy', 'medium', 'hard')
     or p_metric is null or p_metric not in (
       'matches_played', 'matches_won', 'threats_won', 'cards_played',
       'emergency_passed', 'packs_opened', 'duplicates_converted', 'cards_conquered')
     or not public.daily_objective_params_valid(p_metric, v_params)
     or p_target is null or p_target not between 1 and 100
     or (p_coins is not null and p_coins not between 0 and 100000)
     or p_packs is null or p_packs not between 0 and 5 then
    raise exception 'invalid_objective';
  end if;

  -- No reward at all (reward cards are only set with SQL).
  if p_coins = 0 and p_packs = 0 and coalesce((
       select cardinality(d.card_definition_ids) from public.daily_objective_definitions d where d.code = p_code), 0) = 0 then
    raise exception 'invalid_objective';
  end if;

  if p_code is null then
    insert into public.daily_objective_definitions (code, title, difficulty, metric, params, target, coins, packs)
    values ('obj_' || substr(md5(gen_random_uuid()::text), 1, 10), v_title, p_difficulty, p_metric, v_params,
            p_target, p_coins, p_packs);
  else
    update public.daily_objective_definitions d
    set title = v_title, difficulty = p_difficulty, metric = p_metric, params = v_params,
        target = p_target, coins = p_coins, packs = p_packs
    where d.code = p_code;
    if not found then
      raise exception 'objective_not_found';
    end if;
  end if;

  perform public.check_daily_objectives_enough();
  return public.admin_daily_objectives_payload();
end;
$$;

-- Takes an objective out of the draw (players who have it today keep it), or puts it back.
create function public.admin_set_daily_objective_active(p_code text, p_is_active boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  update public.daily_objective_definitions set is_active = coalesce(p_is_active, false) where code = p_code;
  if not found then
    raise exception 'objective_not_found';
  end if;
  perform public.check_daily_objectives_enough();
  return public.admin_daily_objectives_payload();
end;
$$;

-- Deletes an objective nobody ever had; one already handed out is switched off instead.
create function public.admin_delete_daily_objective(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if exists (select 1 from public.daily_objectives o where o.definition_code = p_code) then
    raise exception 'objective_in_use';
  end if;
  delete from public.daily_objective_definitions where code = p_code;
  if not found then
    raise exception 'objective_not_found';
  end if;
  perform public.check_daily_objectives_enough();
  return public.admin_daily_objectives_payload();
end;
$$;

revoke execute on function public.admin_list_daily_objectives() from public, anon;
revoke execute on function public.admin_save_daily_objective(text, text, text, text, jsonb, integer, integer, integer) from public, anon;
revoke execute on function public.admin_set_daily_objective_active(text, boolean) from public, anon;
revoke execute on function public.admin_delete_daily_objective(text) from public, anon;
grant execute on function public.admin_list_daily_objectives() to authenticated;
grant execute on function public.admin_save_daily_objective(text, text, text, text, jsonb, integer, integer, integer) to authenticated;
grant execute on function public.admin_set_daily_objective_active(text, boolean) to authenticated;
grant execute on function public.admin_delete_daily_objective(text) to authenticated;
