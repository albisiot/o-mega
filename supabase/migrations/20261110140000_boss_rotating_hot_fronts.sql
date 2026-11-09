-- Grande Minaccia, rotating hot fronts (asked by the user on 9 Nov 2026): each turn
-- two random fronts are hot, never those hot in the turn before, and worth more
-- every turn (2, 3, 4, 5, 6); the other fronts are worth 1. More chance, more
-- comebacks: a front that paid a lot goes back to 1 in the next turn.
--
-- game_config: boss.hot_growth replaces boss.growth, boss.extra_fronts and
-- boss.extra_growth. The check of a table and the admin page follow. Matches in
-- progress keep the table they were created with.

insert into public.game_config (key, value, description) values
  ('boss.hot_growth', '1', 'Grande Minaccia: points a hot front gains each turn (2, 3, 4, 5, 6)');
delete from public.game_config where key in ('boss.growth', 'boss.extra_fronts', 'boss.extra_growth');
update public.game_config set description = 'Grande Minaccia: hot fronts of each turn, never hot two turns in a row'
where key = 'boss.hot_fronts';
update public.game_config set description = 'Grande Minaccia: points of a hot front in turn 1'
where key = 'boss.hot_value';
update public.game_config set description = 'Grande Minaccia: points of the fronts that are not hot'
where key = 'boss.base_value';

-- Whether a points table follows the rules: the same check as isValidBossValues.
-- Each turn: hot_fronts fronts worth hot_value + turn * hot_growth, the others
-- base_value; the hot fronts of two turns in a row share only what the number of
-- fronts forces (none with 2 hot fronts out of 5).
create or replace function public.valid_boss_values(p_values jsonb)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_turns integer := public.config_int('boss.turns');
  v_fronts integer := public.config_int('boss.fronts');
  v_hot_fronts integer := public.config_int('boss.hot_fronts');
  v_hot integer := public.config_int('boss.hot_value');
  v_growth integer := public.config_int('boss.hot_growth');
  v_base integer := public.config_int('boss.base_value');
  v_overlap integer := greatest(0, 2 * v_hot_fronts - v_fronts);
  v_row jsonb;
  v_hot_value integer;
  v_hot_slots integer[];
  v_previous integer[];
  v_base_count integer;
begin
  if p_values is null or jsonb_typeof(p_values) <> 'array' or jsonb_array_length(p_values) <> v_turns then
    return false;
  end if;
  for t in 0 .. v_turns - 1 loop
    v_row := p_values -> t;
    if jsonb_typeof(v_row) <> 'array' or jsonb_array_length(v_row) <> v_fronts
       or exists (select 1 from jsonb_array_elements(v_row) e where jsonb_typeof(e) <> 'number' or e #>> '{}' !~ '^[0-9]{1,6}$') then
      return false;
    end if;
  end loop;

  for t in 0 .. v_turns - 1 loop
    v_row := p_values -> t;
    v_hot_value := v_hot + t * v_growth;
    if v_hot_value = v_base then
      if exists (select 1 from jsonb_array_elements(v_row) e where (e #>> '{}')::integer <> v_base) then
        return false;
      end if;
      v_previous := null;
      continue;
    end if;
    select array_agg(x.ord::integer - 1) filter (where (x.e #>> '{}')::integer = v_hot_value),
           count(*) filter (where (x.e #>> '{}')::integer = v_base)
    into v_hot_slots, v_base_count
    from jsonb_array_elements(v_row) with ordinality as x(e, ord);
    if coalesce(cardinality(v_hot_slots), 0) <> v_hot_fronts or v_base_count <> v_fronts - v_hot_fronts then
      return false;
    end if;
    if v_previous is not null
       and (select count(*) from unnest(coalesce(v_hot_slots, '{}')) as h(slot) where h.slot = any (v_previous)) <> v_overlap then
      return false;
    end if;
    v_previous := coalesce(v_hot_slots, '{}');
  end loop;
  return true;
end;
$$;

create or replace function public.admin_boss_table_payload()
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
    'hot_growth', public.config_int('boss.hot_growth'),
    'base_value', public.config_int('boss.base_value'),
    'updated_at', (select max(updated_at) from public.game_config where key like 'boss.%')
  )
$$;

drop function public.admin_save_boss_table(integer, integer, integer, integer, integer, integer);

-- Saves the four numbers. Each is a whole number from 0 to 20; the hot fronts are at
-- most the boss's fronts; the table must pay something in the first turn.
create function public.admin_save_boss_table(
  p_hot_fronts integer,
  p_hot_value integer,
  p_hot_growth integer,
  p_base_value integer
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
  if p_hot_fronts is null or p_hot_value is null or p_hot_growth is null or p_base_value is null
     or p_hot_fronts not between 0 and v_fronts
     or p_hot_value not between 0 and 20 or p_hot_growth not between 0 and 20 or p_base_value not between 0 and 20
     or (p_hot_fronts * p_hot_value + (v_fronts - p_hot_fronts) * p_base_value) = 0 then
    raise exception 'invalid_boss_table';
  end if;

  update public.game_config c
  set value = to_jsonb(s.value), updated_at = now()
  from (values
    ('boss.hot_fronts', p_hot_fronts),
    ('boss.hot_value', p_hot_value),
    ('boss.hot_growth', p_hot_growth),
    ('boss.base_value', p_base_value)
  ) as s(key, value)
  where c.key = s.key and c.value is distinct from to_jsonb(s.value);

  return public.admin_boss_table_payload();
end;
$$;

revoke execute on function public.admin_save_boss_table(integer, integer, integer, integer) from public, anon;
grant execute on function public.admin_save_boss_table(integer, integer, integer, integer) to authenticated;
