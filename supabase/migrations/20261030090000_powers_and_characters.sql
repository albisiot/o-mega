-- M2 · Passive powers and the full placeholder character catalog (60 cards).
--
-- Powers are parametric types (SPEC §4.4): the catalog stores the type and its
-- parameters, the rules engine (M6) implements the effect. All provisional.

create table public.power_definitions (
  code text primary key,
  name text not null,
  tier text not null check (tier in ('simple', 'distinctive')),
  -- Italian text with {param} placeholders; {ability} and {family} hold codes
  -- that the UI replaces with their names.
  description_template text not null,
  required_params text[] not null default '{}'
);

alter table public.power_definitions enable row level security;
revoke all on table public.power_definitions from anon, authenticated;
grant select on table public.power_definitions to anon, authenticated;
create policy "powers are readable by everyone"
  on public.power_definitions for select to anon, authenticated using (true);

insert into public.power_definitions (code, name, tier, description_template, required_params) values
  ('ability_bonus', 'Specialità', 'simple',
   '+{bonus} contro Minacce che richiedono {ability}', array['ability', 'bonus']),
  ('family_bonus', 'Affinità', 'simple',
   '+{bonus} se la Minaccia richiede almeno {min_count} abilità di {family}', array['family', 'min_count', 'bonus']),
  ('level_bonus', 'Terreno favorevole', 'simple',
   '+{bonus} contro Minacce di livello da {min_level} a {max_level}', array['min_level', 'max_level', 'bonus']),
  ('comeback', 'Riscossa', 'distinctive',
   'Se perdi questo round, il tuo prossimo personaggio ottiene +{bonus}', array['bonus']),
  ('underdog', 'Sfavorito', 'distinctive',
   '+{bonus} se l''avversario ha vinto più round di te', array['bonus']);

alter table public.card_definitions
  add constraint card_definitions_power_code_fkey
  foreign key (power_code) references public.power_definitions (code);
create index card_definitions_power_code_idx on public.card_definitions (power_code);

-- Same stats checks as before, plus power parameters: exactly the required
-- keys, valid ability/family codes, positive integers, levels within 1-6.
create or replace function public.validate_card_definition()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_min integer := public.config_int('cards.ability_min');
  v_max integer := public.config_int('cards.ability_max');
  v_budget integer := public.config_int('cards.ability_budget');
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

  select sum((e.value::text)::numeric) into v_total from jsonb_each(new.stats) as e;
  if v_total not between v_budget - v_tolerance and v_budget + v_tolerance then
    raise exception 'card %: ability total % is outside the budget % ± %',
      new.code, v_total, v_budget, v_tolerance;
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

-- Placeholder catalog: 24 Delta, 16 Gamma, 10 Beta, 6 Alfa, 4 Omega.
-- Rarer cards have more extreme profiles and a power, with a slightly lower
-- ability total to compensate (Delta/Gamma 54, Beta 53, Alfa 52, Omega 51).
insert into public.card_definitions (code, name, faction, rarity_code, stats, power_code, power_params, flavor) values
  ('P013', 'Recluta 13', 'heroes', 'delta',
   '{"FOR":10,"VEL":0,"RES":9,"INT":1,"VOL":5,"PER":3,"ENE":2,"MAG":6,"PSI":2,"COM":9,"TEC":4,"FUR":3}',
   null, '{}', 'Personaggio segnaposto. Specialista di forza.'),
  ('P014', 'Recluta 14', 'villains', 'delta',
   '{"FOR":5,"VEL":6,"RES":3,"INT":5,"VOL":4,"PER":5,"ENE":4,"MAG":4,"PSI":3,"COM":4,"TEC":5,"FUR":6}',
   null, '{}', 'Personaggio segnaposto. Generalista con predilezione per velocità.'),
  ('P015', 'Recluta 15', 'heroes', 'delta',
   '{"FOR":4,"VEL":4,"RES":1,"INT":8,"VOL":5,"PER":7,"ENE":3,"MAG":6,"PSI":4,"COM":2,"TEC":7,"FUR":3}',
   null, '{}', 'Personaggio segnaposto. Esperto di intelletto.'),
  ('P016', 'Recluta 16', 'villains', 'delta',
   '{"FOR":6,"VEL":2,"RES":4,"INT":3,"VOL":9,"PER":5,"ENE":3,"MAG":10,"PSI":9,"COM":2,"TEC":1,"FUR":0}',
   null, '{}', 'Personaggio segnaposto. Specialista di magia.'),
  ('P017', 'Recluta 17', 'neutrals', 'delta',
   '{"FOR":5,"VEL":4,"RES":6,"INT":3,"VOL":3,"PER":4,"ENE":6,"MAG":5,"PSI":4,"COM":5,"TEC":5,"FUR":4}',
   null, '{}', 'Personaggio segnaposto. Generalista con predilezione per energia.'),
  ('P018', 'Recluta 18', 'heroes', 'delta',
   '{"FOR":6,"VEL":4,"RES":3,"INT":7,"VOL":7,"PER":3,"ENE":4,"MAG":5,"PSI":8,"COM":1,"TEC":4,"FUR":2}',
   null, '{}', 'Personaggio segnaposto. Esperto di psiche.'),
  ('P019', 'Recluta 19', 'villains', 'delta',
   '{"FOR":9,"VEL":9,"RES":0,"INT":2,"VOL":6,"PER":3,"ENE":4,"MAG":2,"PSI":5,"COM":10,"TEC":1,"FUR":3}',
   null, '{}', 'Personaggio segnaposto. Specialista di combattimento.'),
  ('P020', 'Recluta 20', 'heroes', 'delta',
   '{"FOR":4,"VEL":3,"RES":5,"INT":5,"VOL":4,"PER":5,"ENE":6,"MAG":4,"PSI":4,"COM":3,"TEC":6,"FUR":5}',
   null, '{}', 'Personaggio segnaposto. Generalista con predilezione per tecnologia.'),
  ('P021', 'Recluta 21', 'villains', 'delta',
   '{"FOR":5,"VEL":7,"RES":3,"INT":7,"VOL":4,"PER":4,"ENE":4,"MAG":3,"PSI":6,"COM":2,"TEC":1,"FUR":8}',
   null, '{}', 'Personaggio segnaposto. Esperto di furtività.'),
  ('P022', 'Recluta 22', 'neutrals', 'delta',
   '{"FOR":6,"VEL":5,"RES":3,"INT":1,"VOL":9,"PER":10,"ENE":2,"MAG":2,"PSI":4,"COM":9,"TEC":3,"FUR":0}',
   null, '{}', 'Personaggio segnaposto. Specialista di percezione.'),
  ('P023', 'Recluta 23', 'heroes', 'delta',
   '{"FOR":5,"VEL":4,"RES":6,"INT":4,"VOL":6,"PER":4,"ENE":4,"MAG":5,"PSI":3,"COM":5,"TEC":3,"FUR":5}',
   null, '{}', 'Personaggio segnaposto. Generalista con predilezione per volontà.'),
  ('P024', 'Recluta 24', 'villains', 'delta',
   '{"FOR":6,"VEL":4,"RES":2,"INT":1,"VOL":4,"PER":3,"ENE":7,"MAG":8,"PSI":5,"COM":3,"TEC":7,"FUR":4}',
   null, '{}', 'Personaggio segnaposto. Esperto di magia.'),
  ('P025', 'Agente 01', 'heroes', 'gamma',
   '{"FOR":3,"VEL":4,"RES":9,"INT":2,"VOL":7,"PER":3,"ENE":2,"MAG":4,"PSI":6,"COM":8,"TEC":5,"FUR":1}',
   'ability_bonus', '{"ability":"RES","bonus":2}', 'Personaggio segnaposto. Esperto di resistenza.'),
  ('P026', 'Agente 02', 'villains', 'gamma',
   '{"FOR":4,"VEL":7,"RES":2,"INT":5,"VOL":5,"PER":3,"ENE":4,"MAG":4,"PSI":3,"COM":6,"TEC":6,"FUR":5}',
   'ability_bonus', '{"ability":"VEL","bonus":2}', 'Personaggio segnaposto. Generalista con predilezione per velocità.'),
  ('P027', 'Agente 03', 'neutrals', 'gamma',
   '{"FOR":2,"VEL":4,"RES":6,"INT":1,"VOL":4,"PER":8,"ENE":3,"MAG":2,"PSI":9,"COM":5,"TEC":3,"FUR":7}',
   'ability_bonus', '{"ability":"PSI","bonus":2}', 'Personaggio segnaposto. Esperto di psiche.'),
  ('P028', 'Agente 04', 'heroes', 'gamma',
   '{"FOR":6,"VEL":2,"RES":3,"INT":4,"VOL":5,"PER":5,"ENE":7,"MAG":6,"PSI":4,"COM":3,"TEC":4,"FUR":5}',
   'ability_bonus', '{"ability":"ENE","bonus":2}', 'Personaggio segnaposto. Generalista con predilezione per energia.'),
  ('P029', 'Agente 05', 'villains', 'gamma',
   '{"FOR":9,"VEL":6,"RES":8,"INT":1,"VOL":2,"PER":3,"ENE":3,"MAG":2,"PSI":4,"COM":7,"TEC":4,"FUR":5}',
   'ability_bonus', '{"ability":"FOR","bonus":2}', 'Personaggio segnaposto. Esperto di forza.'),
  ('P030', 'Agente 06', 'heroes', 'gamma',
   '{"FOR":4,"VEL":7,"RES":5,"INT":3,"VOL":4,"PER":6,"ENE":4,"MAG":2,"PSI":3,"COM":5,"TEC":5,"FUR":6}',
   'ability_bonus', '{"ability":"VEL","bonus":2}', 'Personaggio segnaposto. Generalista con predilezione per velocità.'),
  ('P031', 'Agente 07', 'villains', 'gamma',
   '{"FOR":3,"VEL":5,"RES":4,"INT":9,"VOL":2,"PER":7,"ENE":6,"MAG":3,"PSI":2,"COM":4,"TEC":8,"FUR":1}',
   'ability_bonus', '{"ability":"INT","bonus":2}', 'Personaggio segnaposto. Esperto di intelletto.'),
  ('P032', 'Agente 08', 'neutrals', 'gamma',
   '{"FOR":4,"VEL":3,"RES":4,"INT":5,"VOL":6,"PER":3,"ENE":5,"MAG":7,"PSI":6,"COM":2,"TEC":4,"FUR":5}',
   'ability_bonus', '{"ability":"MAG","bonus":2}', 'Personaggio segnaposto. Generalista con predilezione per magia.'),
  ('P033', 'Agente 09', 'heroes', 'gamma',
   '{"FOR":7,"VEL":3,"RES":8,"INT":3,"VOL":6,"PER":4,"ENE":9,"MAG":4,"PSI":5,"COM":1,"TEC":2,"FUR":2}',
   'ability_bonus', '{"ability":"ENE","bonus":2}', 'Personaggio segnaposto. Esperto di energia.'),
  ('P034', 'Agente 10', 'villains', 'gamma',
   '{"FOR":5,"VEL":5,"RES":4,"INT":6,"VOL":6,"PER":4,"ENE":5,"MAG":3,"PSI":7,"COM":2,"TEC":4,"FUR":3}',
   'ability_bonus', '{"ability":"PSI","bonus":2}', 'Personaggio segnaposto. Generalista con predilezione per psiche.'),
  ('P035', 'Agente 11', 'heroes', 'gamma',
   '{"FOR":7,"VEL":8,"RES":3,"INT":6,"VOL":2,"PER":5,"ENE":4,"MAG":1,"PSI":3,"COM":9,"TEC":2,"FUR":4}',
   'ability_bonus', '{"ability":"COM","bonus":2}', 'Personaggio segnaposto. Esperto di combattimento.'),
  ('P036', 'Agente 12', 'villains', 'gamma',
   '{"FOR":5,"VEL":5,"RES":4,"INT":6,"VOL":3,"PER":4,"ENE":6,"MAG":5,"PSI":3,"COM":4,"TEC":7,"FUR":2}',
   'ability_bonus', '{"ability":"TEC","bonus":2}', 'Personaggio segnaposto. Generalista con predilezione per tecnologia.'),
  ('P037', 'Agente 13', 'neutrals', 'gamma',
   '{"FOR":4,"VEL":7,"RES":3,"INT":8,"VOL":2,"PER":2,"ENE":4,"MAG":1,"PSI":5,"COM":6,"TEC":3,"FUR":9}',
   'ability_bonus', '{"ability":"FUR","bonus":2}', 'Personaggio segnaposto. Esperto di furtività.'),
  ('P038', 'Agente 14', 'heroes', 'gamma',
   '{"FOR":2,"VEL":4,"RES":5,"INT":5,"VOL":6,"PER":7,"ENE":3,"MAG":4,"PSI":3,"COM":6,"TEC":4,"FUR":5}',
   'ability_bonus', '{"ability":"PER","bonus":2}', 'Personaggio segnaposto. Generalista con predilezione per percezione.'),
  ('P039', 'Agente 15', 'villains', 'gamma',
   '{"FOR":4,"VEL":4,"RES":8,"INT":5,"VOL":9,"PER":2,"ENE":3,"MAG":7,"PSI":1,"COM":3,"TEC":6,"FUR":2}',
   'ability_bonus', '{"ability":"VOL","bonus":2}', 'Personaggio segnaposto. Esperto di volontà.'),
  ('P040', 'Agente 16', 'heroes', 'gamma',
   '{"FOR":4,"VEL":2,"RES":3,"INT":5,"VOL":4,"PER":3,"ENE":6,"MAG":7,"PSI":5,"COM":5,"TEC":6,"FUR":4}',
   'ability_bonus', '{"ability":"MAG","bonus":2}', 'Personaggio segnaposto. Generalista con predilezione per magia.'),
  ('P041', 'Campione 01', 'villains', 'beta',
   '{"FOR":3,"VEL":2,"RES":10,"INT":5,"VOL":7,"PER":1,"ENE":1,"MAG":4,"PSI":3,"COM":9,"TEC":2,"FUR":6}',
   'level_bonus', '{"min_level":1,"max_level":2,"bonus":2}', 'Personaggio segnaposto. Specialista di resistenza.'),
  ('P042', 'Campione 02', 'neutrals', 'beta',
   '{"FOR":3,"VEL":7,"RES":5,"INT":1,"VOL":2,"PER":4,"ENE":6,"MAG":4,"PSI":3,"COM":7,"TEC":6,"FUR":5}',
   'family_bonus', '{"family":"body","min_count":2,"bonus":2}', 'Personaggio segnaposto. Generalista con predilezione per velocità.'),
  ('P043', 'Campione 03', 'heroes', 'beta',
   '{"FOR":5,"VEL":6,"RES":2,"INT":1,"VOL":1,"PER":9,"ENE":3,"MAG":2,"PSI":10,"COM":3,"TEC":4,"FUR":7}',
   'level_bonus', '{"min_level":1,"max_level":2,"bonus":2}', 'Personaggio segnaposto. Specialista di psiche.'),
  ('P044', 'Campione 04', 'villains', 'beta',
   '{"FOR":6,"VEL":3,"RES":2,"INT":1,"VOL":3,"PER":5,"ENE":7,"MAG":7,"PSI":4,"COM":4,"TEC":5,"FUR":6}',
   'family_bonus', '{"family":"power","min_count":2,"bonus":2}', 'Personaggio segnaposto. Generalista con predilezione per energia.'),
  ('P045', 'Campione 05', 'heroes', 'beta',
   '{"FOR":10,"VEL":2,"RES":9,"INT":1,"VOL":6,"PER":4,"ENE":1,"MAG":2,"PSI":3,"COM":7,"TEC":3,"FUR":5}',
   'level_bonus', '{"min_level":1,"max_level":2,"bonus":2}', 'Personaggio segnaposto. Specialista di forza.'),
  ('P046', 'Campione 06', 'villains', 'beta',
   '{"FOR":2,"VEL":10,"RES":1,"INT":5,"VOL":4,"PER":7,"ENE":3,"MAG":1,"PSI":2,"COM":6,"TEC":3,"FUR":9}',
   'level_bonus', '{"min_level":1,"max_level":2,"bonus":2}', 'Personaggio segnaposto. Specialista di velocità.'),
  ('P047', 'Campione 07', 'neutrals', 'beta',
   '{"FOR":5,"VEL":4,"RES":5,"INT":7,"VOL":6,"PER":6,"ENE":1,"MAG":3,"PSI":2,"COM":4,"TEC":7,"FUR":3}',
   'family_bonus', '{"family":"mind","min_count":2,"bonus":2}', 'Personaggio segnaposto. Generalista con predilezione per intelletto.'),
  ('P048', 'Campione 08', 'heroes', 'beta',
   '{"FOR":2,"VEL":6,"RES":1,"INT":3,"VOL":7,"PER":1,"ENE":3,"MAG":10,"PSI":9,"COM":5,"TEC":2,"FUR":4}',
   'level_bonus', '{"min_level":1,"max_level":2,"bonus":2}', 'Personaggio segnaposto. Specialista di magia.'),
  ('P049', 'Campione 09', 'villains', 'beta',
   '{"FOR":6,"VEL":4,"RES":7,"INT":6,"VOL":5,"PER":5,"ENE":7,"MAG":4,"PSI":3,"COM":2,"TEC":3,"FUR":1}',
   'family_bonus', '{"family":"power","min_count":2,"bonus":2}', 'Personaggio segnaposto. Generalista con predilezione per energia.'),
  ('P050', 'Campione 10', 'heroes', 'beta',
   '{"FOR":3,"VEL":2,"RES":6,"INT":7,"VOL":9,"PER":2,"ENE":3,"MAG":1,"PSI":10,"COM":1,"TEC":5,"FUR":4}',
   'level_bonus', '{"min_level":1,"max_level":2,"bonus":2}', 'Personaggio segnaposto. Specialista di psiche.'),
  ('P051', 'Leggenda 01', 'villains', 'alfa',
   '{"FOR":9,"VEL":10,"RES":1,"INT":2,"VOL":1,"PER":2,"ENE":1,"MAG":3,"PSI":3,"COM":10,"TEC":4,"FUR":6}',
   'comeback', '{"bonus":2}', 'Personaggio segnaposto. Specialista di combattimento.'),
  ('P052', 'Leggenda 02', 'neutrals', 'alfa',
   '{"FOR":6,"VEL":2,"RES":2,"INT":9,"VOL":1,"PER":3,"ENE":10,"MAG":1,"PSI":1,"COM":4,"TEC":10,"FUR":3}',
   'underdog', '{"bonus":2}', 'Personaggio segnaposto. Specialista di tecnologia.'),
  ('P053', 'Leggenda 03', 'heroes', 'alfa',
   '{"FOR":2,"VEL":9,"RES":2,"INT":10,"VOL":1,"PER":6,"ENE":1,"MAG":3,"PSI":4,"COM":1,"TEC":3,"FUR":10}',
   'comeback', '{"bonus":2}', 'Personaggio segnaposto. Specialista di furtività.'),
  ('P054', 'Leggenda 04', 'villains', 'alfa',
   '{"FOR":6,"VEL":2,"RES":3,"INT":4,"VOL":10,"PER":10,"ENE":1,"MAG":1,"PSI":2,"COM":9,"TEC":1,"FUR":3}',
   'underdog', '{"bonus":2}', 'Personaggio segnaposto. Specialista di percezione.'),
  ('P055', 'Leggenda 05', 'heroes', 'alfa',
   '{"FOR":4,"VEL":1,"RES":10,"INT":1,"VOL":10,"PER":3,"ENE":2,"MAG":9,"PSI":6,"COM":2,"TEC":3,"FUR":1}',
   'comeback', '{"bonus":2}', 'Personaggio segnaposto. Specialista di volontà.'),
  ('P056', 'Leggenda 06', 'villains', 'alfa',
   '{"FOR":3,"VEL":4,"RES":1,"INT":2,"VOL":1,"PER":2,"ENE":10,"MAG":10,"PSI":6,"COM":1,"TEC":9,"FUR":3}',
   'underdog', '{"bonus":2}', 'Personaggio segnaposto. Specialista di magia.'),
  ('P057', 'Mito 01', 'neutrals', 'omega',
   '{"FOR":1,"VEL":1,"RES":10,"INT":8,"VOL":10,"PER":2,"ENE":0,"MAG":1,"PSI":1,"COM":10,"TEC":4,"FUR":3}',
   'comeback', '{"bonus":3}', 'Personaggio segnaposto. Specialista di resistenza.'),
  ('P058', 'Mito 02', 'heroes', 'omega',
   '{"FOR":8,"VEL":10,"RES":1,"INT":1,"VOL":1,"PER":0,"ENE":3,"MAG":1,"PSI":2,"COM":10,"TEC":10,"FUR":4}',
   'underdog', '{"bonus":3}', 'Personaggio segnaposto. Specialista di velocità.'),
  ('P059', 'Mito 03', 'villains', 'omega',
   '{"FOR":1,"VEL":8,"RES":1,"INT":2,"VOL":0,"PER":10,"ENE":1,"MAG":1,"PSI":10,"COM":4,"TEC":3,"FUR":10}',
   'comeback', '{"bonus":3}', 'Personaggio segnaposto. Specialista di psiche.'),
  ('P060', 'Mito 04', 'heroes', 'omega',
   '{"FOR":10,"VEL":2,"RES":3,"INT":1,"VOL":8,"PER":4,"ENE":10,"MAG":10,"PSI":1,"COM":1,"TEC":0,"FUR":1}',
   'underdog', '{"bonus":3}', 'Personaggio segnaposto. Specialista di energia.');
