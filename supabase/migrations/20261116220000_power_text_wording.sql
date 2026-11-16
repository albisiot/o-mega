-- Three power texts read awkwardly when the numbers met the template: Apripista "entro il
-- round 1", Ultimo baluardo "dal round 5 in poi" (5 is the last round of a match) and
-- Terreno favorevole "di livello da 1 a 1". power_text now says them plainly: "nel round 1",
-- "nel round 5", "di livello 1". The powers and their params do not change.
--
-- The last round is 5 (match.threats_per_match): power_text runs for players, who cannot
-- call config_int, so the number is written here; supabase/tests/power_text_wording.test.sql
-- fails if a match ever gets another number of rounds.
create or replace function public.power_text(p_power_code text, p_params jsonb)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_text text;
  v_param record;
  v_value text;
begin
  if p_power_code is null then
    return null;
  end if;
  select p.description_template into v_text from public.power_definitions p where p.code = p_power_code;
  -- Apripista only in the first round, Ultimo baluardo only in the last, Terreno favorevole on one level.
  if p_power_code = 'opener' and (p_params ->> 'max_round')::integer = 1 then
    v_text := '+{bonus} se giocato nel round 1';
  elsif p_power_code = 'last_stand' and (p_params ->> 'min_round')::integer >= 5 then
    v_text := '+{bonus} se giocato nel round {min_round}';
  elsif p_power_code = 'level_bonus' and p_params ->> 'min_level' = p_params ->> 'max_level' then
    v_text := '+{bonus} contro Minacce di livello {min_level}';
  end if;
  for v_param in select e.key, e.value from jsonb_each_text(coalesce(p_params, '{}')) as e loop
    v_value := case v_param.key
      when 'ability' then (select a.name from public.ability_definitions a where a.code = v_param.value)
      when 'family' then (select f.name from public.ability_families f where f.code = v_param.value)
      else v_param.value
    end;
    v_text := replace(v_text, '{' || v_param.key || '}', coalesce(v_value, v_param.value));
  end loop;
  return v_text;
end;
$$;
