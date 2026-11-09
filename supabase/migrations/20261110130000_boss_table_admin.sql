-- Grande Minaccia: admins set the numbers of the points table from the admin page
-- (/gestione-minaccia): the starting values of the fronts and how they grow each
-- turn. They are the boss.* keys of game_config, which the Edge Function draws the
-- table with and valid_boss_values checks it against: a change applies to the
-- matches created after it, never to one in progress (its table is stored).
-- The numbers in balance.ts stay the defaults; npm run test:db reports the
-- difference instead of failing on these keys.

-- The editable numbers, with the fixed ones for context.
create function public.admin_boss_table_payload()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'turns', public.config_int('boss.turns'),
    'fronts', public.config_int('boss.fronts'),
    'hot_fronts', public.config_int('boss.hot_fronts'),
    'hot_value', public.config_int('boss.hot_value'),
    'base_value', public.config_int('boss.base_value'),
    'growth', public.config_int('boss.growth'),
    'extra_fronts', public.config_int('boss.extra_fronts'),
    'extra_growth', public.config_int('boss.extra_growth'),
    'updated_at', (select max(updated_at) from public.game_config where key like 'boss.%')
  )
$$;

revoke execute on function public.admin_boss_table_payload() from public, anon, authenticated;

create function public.admin_get_boss_table()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return public.admin_boss_table_payload();
end;
$$;

revoke execute on function public.admin_get_boss_table() from public, anon;
grant execute on function public.admin_get_boss_table() to authenticated;

-- Saves the six numbers. Each is a whole number from 0 to 20; the fronts counted
-- (hot ones, extra ones) are at most the boss's fronts; the table must pay
-- something in the first turn.
create function public.admin_save_boss_table(
  p_hot_fronts integer,
  p_hot_value integer,
  p_base_value integer,
  p_growth integer,
  p_extra_fronts integer,
  p_extra_growth integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fronts integer := public.config_int('boss.fronts');
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if p_hot_fronts is null or p_hot_value is null or p_base_value is null
     or p_growth is null or p_extra_fronts is null or p_extra_growth is null
     or p_hot_fronts not between 0 and v_fronts or p_extra_fronts not between 0 and v_fronts
     or p_hot_value not between 0 and 20 or p_base_value not between 0 and 20
     or p_growth not between 0 and 20 or p_extra_growth not between 0 and 20
     or (p_hot_fronts * p_hot_value + (v_fronts - p_hot_fronts) * p_base_value) = 0 then
    raise exception 'invalid_boss_table';
  end if;

  update public.game_config c
  set value = to_jsonb(s.value), updated_at = now()
  from (values
    ('boss.hot_fronts', p_hot_fronts),
    ('boss.hot_value', p_hot_value),
    ('boss.base_value', p_base_value),
    ('boss.growth', p_growth),
    ('boss.extra_fronts', p_extra_fronts),
    ('boss.extra_growth', p_extra_growth)
  ) as s(key, value)
  where c.key = s.key and c.value is distinct from to_jsonb(s.value);

  return public.admin_boss_table_payload();
end;
$$;

revoke execute on function public.admin_save_boss_table(integer, integer, integer, integer, integer, integer) from public, anon;
grant execute on function public.admin_save_boss_table(integer, integer, integer, integer, integer, integer) to authenticated;
