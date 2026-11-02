-- Rarer cards are stronger (SPEC §4.3): every rarity has its own ability
-- budget, rising with its rank, instead of the same total for every card.
-- Budgets tuned by simulation on the real catalog: a team of each rarity
-- beats a team of the rarity below about 60-70% of the time.

alter table public.rarity_definitions
  add column ability_budget integer check (ability_budget between 0 and 120);

update public.rarity_definitions set ability_budget = case code
  when 'delta' then 54
  when 'gamma' then 55
  when 'beta' then 57
  when 'alfa' then 58
  when 'omega' then 61
end;

alter table public.rarity_definitions alter column ability_budget set not null;

-- The single budget is replaced by the one of each rarity; the tolerance stays.
delete from public.game_config where key = 'cards.ability_budget';

-- Same checks as before, with the ability total measured against the budget
-- of the card's rarity instead of one budget for every card.
create or replace function public.validate_card_definition()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_min integer := public.config_int('cards.ability_min');
  v_max integer := public.config_int('cards.ability_max');
  v_budget integer;
  v_tolerance integer := public.config_int('cards.ability_budget_tolerance');
  v_total numeric;
  v_required text[];
begin
  if jsonb_typeof(new.stats) <> 'object' then
    raise exception 'card %: stats must be a JSON object', new.code;
  end if;

  if exists (
       select 1 from jsonb_object_keys(new.stats) as k(code)
       where k.code not in (select a.code from public.ability_definitions a)
     )
     or exists (
       select 1 from public.ability_definitions a where not (new.stats ? a.code)
     ) then
    raise exception 'card %: stats must contain exactly the configured abilities', new.code;
  end if;

  if exists (
    select 1 from jsonb_each(new.stats) as e
    where case
      when jsonb_typeof(e.value) = 'number' then
        (e.value::text)::numeric % 1 <> 0
        or (e.value::text)::numeric not between v_min and v_max
      else true
    end
  ) then
    raise exception 'card %: ability values must be integers between % and %', new.code, v_min, v_max;
  end if;

  select r.ability_budget into v_budget from public.rarity_definitions r where r.code = new.rarity_code;
  if v_budget is null then
    raise exception 'card %: unknown rarity %', new.code, new.rarity_code;
  end if;

  select sum((e.value::text)::numeric) into v_total from jsonb_each(new.stats) as e;
  if v_total not between v_budget - v_tolerance and v_budget + v_tolerance then
    raise exception 'card %: ability total % is outside the % budget % ± %',
      new.code, v_total, new.rarity_code, v_budget, v_tolerance;
  end if;

  if jsonb_typeof(new.power_params) <> 'object' then
    raise exception 'card %: power_params must be a JSON object', new.code;
  end if;

  if new.power_code is null then
    if new.power_params <> '{}'::jsonb then
      raise exception 'card %: power_params set without a power', new.code;
    end if;
    return new;
  end if;

  select p.required_params into v_required from public.power_definitions p where p.code = new.power_code;
  if v_required is null then
    raise exception 'card %: unknown power %', new.code, new.power_code;
  end if;

  if exists (select 1 from unnest(v_required) as r(key) where not (new.power_params ? r.key))
     or exists (select 1 from jsonb_object_keys(new.power_params) as k(key) where k.key <> all (v_required)) then
    raise exception 'card %: power % needs exactly the params %', new.code, new.power_code, v_required;
  end if;

  if new.power_params ? 'ability'
     and not exists (select 1 from public.ability_definitions a where a.code = new.power_params ->> 'ability') then
    raise exception 'card %: unknown ability in power params', new.code;
  end if;

  if new.power_params ? 'family'
     and not exists (select 1 from public.ability_families f where f.code = new.power_params ->> 'family') then
    raise exception 'card %: unknown ability family in power params', new.code;
  end if;

  if exists (
    select 1 from jsonb_each(new.power_params) as e
    where e.key in ('bonus', 'min_count', 'min_level', 'max_level')
      and case
        when jsonb_typeof(e.value) = 'number' then
          (e.value::text)::numeric % 1 <> 0 or (e.value::text)::numeric < 1
        else true
      end
  ) then
    raise exception 'card %: numeric power params must be positive integers', new.code;
  end if;

  if new.power_params ? 'min_level'
     and not ((new.power_params ->> 'min_level')::integer
              between 1 and (new.power_params ->> 'max_level')::integer
              and (new.power_params ->> 'max_level')::integer <= 6) then
    raise exception 'card %: power levels must satisfy 1 <= min_level <= max_level <= 6', new.code;
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_card_definition() from public, anon, authenticated;

-- Every Gamma, Beta, Alfa and Omega character reaches the budget of its
-- rarity. Values 0 and 1 (the price of each gift, docs/WORLD.md) stay as they
-- are; the other values grow in proportion, up to 10. Delta cards do not change.
update public.card_definitions set stats = '{"FOR":3,"VEL":4,"RES":10,"INT":2,"VOL":7,"PER":3,"ENE":2,"MAG":4,"PSI":6,"COM":8,"TEC":5,"FUR":1}' where code = 'P025'; -- Bulwark, gamma
update public.card_definitions set stats = '{"FOR":4,"VEL":8,"RES":2,"INT":5,"VOL":5,"PER":3,"ENE":4,"MAG":4,"PSI":3,"COM":6,"TEC":6,"FUR":5}' where code = 'P026'; -- Rubicon, gamma
update public.card_definitions set stats = '{"FOR":2,"VEL":4,"RES":6,"INT":1,"VOL":4,"PER":8,"ENE":3,"MAG":2,"PSI":10,"COM":5,"TEC":3,"FUR":7}' where code = 'P027'; -- Vulgate, gamma
update public.card_definitions set stats = '{"FOR":6,"VEL":2,"RES":3,"INT":4,"VOL":5,"PER":5,"ENE":8,"MAG":6,"PSI":4,"COM":3,"TEC":4,"FUR":5}' where code = 'P028'; -- Juncture, gamma
update public.card_definitions set stats = '{"FOR":10,"VEL":6,"RES":8,"INT":1,"VOL":2,"PER":3,"ENE":3,"MAG":2,"PSI":4,"COM":7,"TEC":4,"FUR":5}' where code = 'P029'; -- Malleus, gamma
update public.card_definitions set stats = '{"FOR":4,"VEL":8,"RES":5,"INT":3,"VOL":4,"PER":6,"ENE":4,"MAG":2,"PSI":3,"COM":5,"TEC":5,"FUR":6}' where code = 'P030'; -- Milewright, gamma
update public.card_definitions set stats = '{"FOR":3,"VEL":5,"RES":4,"INT":10,"VOL":2,"PER":7,"ENE":6,"MAG":3,"PSI":2,"COM":4,"TEC":8,"FUR":1}' where code = 'P031'; -- Byline, gamma
update public.card_definitions set stats = '{"FOR":4,"VEL":3,"RES":4,"INT":5,"VOL":6,"PER":3,"ENE":5,"MAG":8,"PSI":6,"COM":2,"TEC":4,"FUR":5}' where code = 'P032'; -- Escrow, gamma
update public.card_definitions set stats = '{"FOR":7,"VEL":3,"RES":8,"INT":3,"VOL":6,"PER":4,"ENE":10,"MAG":4,"PSI":5,"COM":1,"TEC":2,"FUR":2}' where code = 'P033'; -- Cathode, gamma
update public.card_definitions set stats = '{"FOR":5,"VEL":5,"RES":4,"INT":6,"VOL":6,"PER":4,"ENE":5,"MAG":3,"PSI":8,"COM":2,"TEC":4,"FUR":3}' where code = 'P034'; -- Lullaby, gamma
update public.card_definitions set stats = '{"FOR":7,"VEL":8,"RES":3,"INT":6,"VOL":2,"PER":5,"ENE":4,"MAG":1,"PSI":3,"COM":10,"TEC":2,"FUR":4}' where code = 'P035'; -- Ambit, gamma
update public.card_definitions set stats = '{"FOR":5,"VEL":5,"RES":4,"INT":6,"VOL":3,"PER":4,"ENE":6,"MAG":5,"PSI":3,"COM":4,"TEC":8,"FUR":2}' where code = 'P036'; -- Swarf, gamma
update public.card_definitions set stats = '{"FOR":4,"VEL":7,"RES":3,"INT":8,"VOL":2,"PER":2,"ENE":4,"MAG":1,"PSI":5,"COM":6,"TEC":3,"FUR":10}' where code = 'P037'; -- Sordina, gamma
update public.card_definitions set stats = '{"FOR":2,"VEL":4,"RES":5,"INT":5,"VOL":6,"PER":8,"ENE":3,"MAG":4,"PSI":3,"COM":6,"TEC":4,"FUR":5}' where code = 'P038'; -- Nightward, gamma
update public.card_definitions set stats = '{"FOR":4,"VEL":4,"RES":8,"INT":5,"VOL":10,"PER":2,"ENE":3,"MAG":7,"PSI":1,"COM":3,"TEC":6,"FUR":2}' where code = 'P039'; -- Credo, gamma
update public.card_definitions set stats = '{"FOR":4,"VEL":2,"RES":3,"INT":5,"VOL":4,"PER":3,"ENE":6,"MAG":8,"PSI":5,"COM":5,"TEC":6,"FUR":4}' where code = 'P040'; -- Gridwitch, gamma
update public.card_definitions set stats = '{"FOR":3,"VEL":5,"RES":4,"INT":5,"VOL":6,"PER":8,"ENE":10,"MAG":3,"PSI":3,"COM":3,"TEC":4,"FUR":1}' where code = 'P069'; -- Noctiluca, gamma
update public.card_definitions set stats = '{"FOR":4,"VEL":8,"RES":3,"INT":5,"VOL":5,"PER":10,"ENE":2,"MAG":2,"PSI":3,"COM":1,"TEC":6,"FUR":6}' where code = 'P070'; -- Aerie, gamma
update public.card_definitions set stats = '{"FOR":4,"VEL":5,"RES":2,"INT":4,"VOL":6,"PER":4,"ENE":8,"MAG":6,"PSI":4,"COM":4,"TEC":3,"FUR":5}' where code = 'P071'; -- Cineris, gamma
update public.card_definitions set stats = '{"FOR":2,"VEL":5,"RES":1,"INT":6,"VOL":5,"PER":6,"ENE":3,"MAG":4,"PSI":10,"COM":2,"TEC":3,"FUR":8}' where code = 'P072'; -- Tacet, gamma
update public.card_definitions set stats = '{"FOR":6,"VEL":5,"RES":5,"INT":3,"VOL":5,"PER":5,"ENE":3,"MAG":2,"PSI":2,"COM":8,"TEC":6,"FUR":5}' where code = 'P073'; -- Collateral, gamma
update public.card_definitions set stats = '{"FOR":5,"VEL":4,"RES":7,"INT":6,"VOL":7,"PER":6,"ENE":6,"MAG":1,"PSI":1,"COM":1,"TEC":10,"FUR":1}' where code = 'P085'; -- Heirloom, gamma
update public.card_definitions set stats = '{"FOR":8,"VEL":7,"RES":6,"INT":1,"VOL":4,"PER":7,"ENE":3,"MAG":2,"PSI":1,"COM":10,"TEC":1,"FUR":5}' where code = 'P086'; -- Precinct, gamma
update public.card_definitions set stats = '{"FOR":7,"VEL":5,"RES":8,"INT":1,"VOL":7,"PER":10,"ENE":2,"MAG":2,"PSI":1,"COM":6,"TEC":1,"FUR":5}' where code = 'P087'; -- Cerbero, gamma
update public.card_definitions set stats = '{"FOR":1,"VEL":10,"RES":4,"INT":3,"VOL":5,"PER":7,"ENE":4,"MAG":1,"PSI":6,"COM":6,"TEC":1,"FUR":7}' where code = 'P088'; -- Gazetteer, gamma
update public.card_definitions set stats = '{"FOR":2,"VEL":6,"RES":4,"INT":7,"VOL":8,"PER":6,"ENE":7,"MAG":1,"PSI":1,"COM":3,"TEC":10,"FUR":0}' where code = 'P097'; -- Sextant, gamma
update public.card_definitions set stats = '{"FOR":1,"VEL":2,"RES":5,"INT":10,"VOL":5,"PER":6,"ENE":4,"MAG":1,"PSI":0,"COM":5,"TEC":8,"FUR":8}' where code = 'P098'; -- Facsimile, gamma
update public.card_definitions set stats = '{"FOR":5,"VEL":7,"RES":6,"INT":1,"VOL":1,"PER":8,"ENE":3,"MAG":1,"PSI":0,"COM":10,"TEC":6,"FUR":7}' where code = 'P099'; -- Zeta Rax, gamma
update public.card_definitions set stats = '{"FOR":1,"VEL":1,"RES":2,"INT":10,"VOL":7,"PER":7,"ENE":6,"MAG":4,"PSI":6,"COM":3,"TEC":8,"FUR":0}' where code = 'P100'; -- Retrograde, gamma
update public.card_definitions set stats = '{"FOR":1,"VEL":3,"RES":2,"INT":7,"VOL":6,"PER":6,"ENE":5,"MAG":1,"PSI":8,"COM":2,"TEC":10,"FUR":4}' where code = 'P108'; -- Semaphore, gamma
update public.card_definitions set stats = '{"FOR":1,"VEL":2,"RES":6,"INT":10,"VOL":8,"PER":6,"ENE":4,"MAG":1,"PSI":6,"COM":1,"TEC":7,"FUR":3}' where code = 'P109'; -- Parallasse, gamma
update public.card_definitions set stats = '{"FOR":5,"VEL":10,"RES":7,"INT":5,"VOL":5,"PER":6,"ENE":2,"MAG":2,"PSI":0,"COM":4,"TEC":1,"FUR":8}' where code = 'P110'; -- Cursor, gamma
update public.card_definitions set stats = '{"FOR":3,"VEL":2,"RES":10,"INT":6,"VOL":8,"PER":1,"ENE":1,"MAG":4,"PSI":3,"COM":10,"TEC":2,"FUR":7}' where code = 'P041'; -- Gavel, beta
update public.card_definitions set stats = '{"FOR":3,"VEL":8,"RES":5,"INT":1,"VOL":2,"PER":4,"ENE":7,"MAG":4,"PSI":3,"COM":8,"TEC":7,"FUR":5}' where code = 'P042'; -- Postmark, beta
update public.card_definitions set stats = '{"FOR":6,"VEL":7,"RES":2,"INT":1,"VOL":1,"PER":10,"ENE":3,"MAG":2,"PSI":10,"COM":3,"TEC":4,"FUR":8}' where code = 'P043'; -- Fathom, beta
update public.card_definitions set stats = '{"FOR":7,"VEL":3,"RES":2,"INT":1,"VOL":3,"PER":5,"ENE":8,"MAG":8,"PSI":4,"COM":4,"TEC":5,"FUR":7}' where code = 'P044'; -- Kiln, beta
update public.card_definitions set stats = '{"FOR":10,"VEL":2,"RES":10,"INT":1,"VOL":7,"PER":4,"ENE":1,"MAG":2,"PSI":3,"COM":8,"TEC":3,"FUR":6}' where code = 'P045'; -- Apostate, beta
update public.card_definitions set stats = '{"FOR":2,"VEL":10,"RES":1,"INT":6,"VOL":4,"PER":8,"ENE":3,"MAG":1,"PSI":2,"COM":7,"TEC":3,"FUR":10}' where code = 'P046'; -- Larceny, beta
update public.card_definitions set stats = '{"FOR":5,"VEL":4,"RES":5,"INT":8,"VOL":7,"PER":7,"ENE":1,"MAG":3,"PSI":2,"COM":4,"TEC":8,"FUR":3}' where code = 'P047'; -- Actuary, beta
update public.card_definitions set stats = '{"FOR":2,"VEL":7,"RES":1,"INT":3,"VOL":8,"PER":1,"ENE":3,"MAG":10,"PSI":10,"COM":6,"TEC":2,"FUR":4}' where code = 'P048'; -- Hapax, beta
update public.card_definitions set stats = '{"FOR":7,"VEL":4,"RES":8,"INT":7,"VOL":5,"PER":5,"ENE":8,"MAG":4,"PSI":3,"COM":2,"TEC":3,"FUR":1}' where code = 'P049'; -- Blackbody, beta
update public.card_definitions set stats = '{"FOR":3,"VEL":2,"RES":7,"INT":8,"VOL":10,"PER":2,"ENE":3,"MAG":1,"PSI":10,"COM":1,"TEC":6,"FUR":4}' where code = 'P050'; -- Parley, beta
update public.card_definitions set stats = '{"FOR":3,"VEL":10,"RES":3,"INT":3,"VOL":1,"PER":7,"ENE":10,"MAG":3,"PSI":2,"COM":7,"TEC":2,"FUR":6}' where code = 'P074'; -- Tempestas, beta
update public.card_definitions set stats = '{"FOR":10,"VEL":3,"RES":7,"INT":5,"VOL":7,"PER":2,"ENE":1,"MAG":1,"PSI":2,"COM":8,"TEC":10,"FUR":1}' where code = 'P075'; -- Truss, beta
update public.card_definitions set stats = '{"FOR":2,"VEL":4,"RES":3,"INT":8,"VOL":7,"PER":1,"ENE":7,"MAG":5,"PSI":4,"COM":3,"TEC":8,"FUR":5}' where code = 'P076'; -- Errata, beta
update public.card_definitions set stats = '{"FOR":8,"VEL":1,"RES":8,"INT":5,"VOL":5,"PER":3,"ENE":7,"MAG":3,"PSI":2,"COM":7,"TEC":5,"FUR":3}' where code = 'P077'; -- Dredge, beta
update public.card_definitions set stats = '{"FOR":10,"VEL":3,"RES":10,"INT":2,"VOL":7,"PER":1,"ENE":6,"MAG":3,"PSI":2,"COM":9,"TEC":2,"FUR":2}' where code = 'P089'; -- Polifemo, beta
update public.card_definitions set stats = '{"FOR":1,"VEL":4,"RES":0,"INT":7,"VOL":8,"PER":5,"ENE":2,"MAG":8,"PSI":10,"COM":1,"TEC":1,"FUR":10}' where code = 'P090'; -- Lamprey, beta
update public.card_definitions set stats = '{"FOR":10,"VEL":1,"RES":10,"INT":2,"VOL":9,"PER":1,"ENE":6,"MAG":3,"PSI":3,"COM":4,"TEC":8,"FUR":0}' where code = 'P101'; -- Carillon, beta
update public.card_definitions set stats = '{"FOR":4,"VEL":1,"RES":3,"INT":7,"VOL":10,"PER":5,"ENE":7,"MAG":1,"PSI":10,"COM":8,"TEC":1,"FUR":0}' where code = 'P102'; -- Regina Ix, beta
update public.card_definitions set stats = '{"FOR":1,"VEL":3,"RES":4,"INT":8,"VOL":6,"PER":9,"ENE":0,"MAG":10,"PSI":9,"COM":3,"TEC":1,"FUR":3}' where code = 'P111'; -- Antiphon, beta
update public.card_definitions set stats = '{"FOR":10,"VEL":1,"RES":10,"INT":5,"VOL":10,"PER":6,"ENE":3,"MAG":8,"PSI":1,"COM":2,"TEC":0,"FUR":1}' where code = 'P112'; -- Plinth, beta
update public.card_definitions set stats = '{"FOR":10,"VEL":10,"RES":1,"INT":2,"VOL":1,"PER":2,"ENE":1,"MAG":4,"PSI":4,"COM":10,"TEC":5,"FUR":8}' where code = 'P051'; -- Vetrix, alfa
update public.card_definitions set stats = '{"FOR":8,"VEL":2,"RES":2,"INT":10,"VOL":1,"PER":4,"ENE":10,"MAG":1,"PSI":1,"COM":5,"TEC":10,"FUR":4}' where code = 'P052'; -- Auctor, alfa
update public.card_definitions set stats = '{"FOR":2,"VEL":10,"RES":2,"INT":10,"VOL":1,"PER":8,"ENE":1,"MAG":4,"PSI":5,"COM":1,"TEC":4,"FUR":10}' where code = 'P053'; -- Moth, alfa
update public.card_definitions set stats = '{"FOR":8,"VEL":2,"RES":4,"INT":5,"VOL":10,"PER":10,"ENE":1,"MAG":1,"PSI":2,"COM":10,"TEC":1,"FUR":4}' where code = 'P054'; -- Vera Kross, alfa
update public.card_definitions set stats = '{"FOR":5,"VEL":1,"RES":10,"INT":1,"VOL":10,"PER":4,"ENE":2,"MAG":10,"PSI":8,"COM":2,"TEC":4,"FUR":1}' where code = 'P055'; -- Keelstone, alfa
update public.card_definitions set stats = '{"FOR":4,"VEL":5,"RES":1,"INT":2,"VOL":1,"PER":2,"ENE":10,"MAG":10,"PSI":8,"COM":1,"TEC":10,"FUR":4}' where code = 'P056'; -- Mekana, alfa
update public.card_definitions set stats = '{"FOR":10,"VEL":10,"RES":1,"INT":4,"VOL":6,"PER":4,"ENE":10,"MAG":2,"PSI":2,"COM":5,"TEC":1,"FUR":3}' where code = 'P078'; -- Novissima, alfa
update public.card_definitions set stats = '{"FOR":5,"VEL":1,"RES":5,"INT":4,"VOL":10,"PER":4,"ENE":2,"MAG":10,"PSI":10,"COM":4,"TEC":1,"FUR":2}' where code = 'P079'; -- Effigy, alfa
update public.card_definitions set stats = '{"FOR":10,"VEL":1,"RES":1,"INT":3,"VOL":8,"PER":6,"ENE":10,"MAG":1,"PSI":1,"COM":6,"TEC":10,"FUR":1}' where code = 'P091'; -- Talos, alfa
update public.card_definitions set stats = '{"FOR":0,"VEL":0,"RES":1,"INT":10,"VOL":4,"PER":9,"ENE":7,"MAG":5,"PSI":10,"COM":1,"TEC":10,"FUR":1}' where code = 'P103'; -- Sibilla, alfa
update public.card_definitions set stats = '{"FOR":10,"VEL":1,"RES":10,"INT":2,"VOL":10,"PER":5,"ENE":6,"MAG":4,"PSI":1,"COM":1,"TEC":8,"FUR":0}' where code = 'P113'; -- Harrow, alfa
update public.card_definitions set stats = '{"FOR":1,"VEL":1,"RES":10,"INT":10,"VOL":10,"PER":4,"ENE":0,"MAG":1,"PSI":1,"COM":10,"TEC":7,"FUR":6}' where code = 'P057'; -- Holdout, omega
update public.card_definitions set stats = '{"FOR":10,"VEL":10,"RES":1,"INT":1,"VOL":1,"PER":0,"ENE":6,"MAG":1,"PSI":4,"COM":10,"TEC":10,"FUR":7}' where code = 'P058'; -- Absentia, omega
update public.card_definitions set stats = '{"FOR":1,"VEL":10,"RES":1,"INT":4,"VOL":0,"PER":10,"ENE":1,"MAG":1,"PSI":10,"COM":7,"TEC":6,"FUR":10}' where code = 'P059'; -- Multitude, omega
update public.card_definitions set stats = '{"FOR":10,"VEL":4,"RES":6,"INT":1,"VOL":10,"PER":7,"ENE":10,"MAG":10,"PSI":1,"COM":1,"TEC":0,"FUR":1}' where code = 'P060'; -- Mongibello, omega
update public.card_definitions set stats = '{"FOR":10,"VEL":0,"RES":10,"INT":3,"VOL":9,"PER":5,"ENE":6,"MAG":10,"PSI":3,"COM":3,"TEC":1,"FUR":1}' where code = 'P080'; -- Re Tifeo, omega
update public.card_definitions set stats = '{"FOR":5,"VEL":1,"RES":4,"INT":0,"VOL":8,"PER":3,"ENE":10,"MAG":8,"PSI":1,"COM":10,"TEC":1,"FUR":10}' where code = 'P092'; -- Cariddi, omega
update public.card_definitions set stats = '{"FOR":0,"VEL":1,"RES":1,"INT":10,"VOL":6,"PER":8,"ENE":10,"MAG":8,"PSI":10,"COM":1,"TEC":5,"FUR":1}' where code = 'P104'; -- Aion, omega
update public.card_definitions set stats = '{"FOR":5,"VEL":0,"RES":10,"INT":8,"VOL":10,"PER":10,"ENE":10,"MAG":3,"PSI":3,"COM":1,"TEC":1,"FUR":0}' where code = 'P114'; -- Perpetuum, omega
