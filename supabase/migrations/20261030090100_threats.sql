-- M2 · Threat catalog (SPEC §5.4): 60 placeholder threats, 10 per level.
-- The level is the number of required abilities. Modifiers are optional in
-- the MVP and left empty.
--
-- Hidden information: clients get no access to this table. Threats reach a
-- player only once revealed in a match, through match functions (M6-M7).

create table public.threat_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  level integer not null check (level between 1 and 6),
  -- Ordered: a future modifier may refer to "the first ability".
  required_abilities text[] not null,
  modifier_code text,
  modifier_params jsonb not null default '{}',
  art_url text,
  flavor text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint threat_definitions_ability_count check (cardinality(required_abilities) = level)
);

create index threat_definitions_level_idx on public.threat_definitions (level) where is_active;

alter table public.threat_definitions enable row level security;
revoke all on table public.threat_definitions from anon, authenticated;

-- Required abilities must be distinct, configured ability codes.
create function public.validate_threat_definition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from unnest(new.required_abilities) as r(code)
    where r.code is null or r.code not in (select a.code from public.ability_definitions a)
  ) then
    raise exception 'threat %: unknown ability in required_abilities', new.code;
  end if;

  if (select count(distinct r.code) from unnest(new.required_abilities) as r(code))
     <> cardinality(new.required_abilities) then
    raise exception 'threat %: required abilities must be distinct', new.code;
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_threat_definition() from public, anon, authenticated;

create trigger validate_threat_definition
  before insert or update on public.threat_definitions
  for each row execute function public.validate_threat_definition();

insert into public.threat_definitions (code, name, level, required_abilities, flavor) values
  ('T101', 'Scippatore', 1, array['VEL'], 'Minaccia segnaposto.'),
  ('T102', 'Muro pericolante', 1, array['FOR'], 'Minaccia segnaposto.'),
  ('T103', 'Codice cifrato', 1, array['INT'], 'Minaccia segnaposto.'),
  ('T104', 'Incubo ricorrente', 1, array['PSI'], 'Minaccia segnaposto.'),
  ('T105', 'Maledizione minore', 1, array['MAG'], 'Minaccia segnaposto.'),
  ('T106', 'Sovraccarico elettrico', 1, array['ENE'], 'Minaccia segnaposto.'),
  ('T107', 'Rissa al porto', 1, array['COM'], 'Minaccia segnaposto.'),
  ('T108', 'Allarme silenzioso', 1, array['FUR'], 'Minaccia segnaposto.'),
  ('T109', 'Indizio nascosto', 1, array['PER'], 'Minaccia segnaposto.'),
  ('T110', 'Terminale bloccato', 1, array['TEC'], 'Minaccia segnaposto.'),
  ('T201', 'Robot impazzito', 2, array['FOR', 'TEC'], 'Minaccia segnaposto.'),
  ('T202', 'Inseguimento sui tetti', 2, array['VEL', 'FUR'], 'Minaccia segnaposto.'),
  ('T203', 'Ostaggio in banca', 2, array['VOL', 'COM'], 'Minaccia segnaposto.'),
  ('T204', 'Fuga di gas', 2, array['RES', 'PER'], 'Minaccia segnaposto.'),
  ('T205', 'Spettro del museo', 2, array['MAG', 'PSI'], 'Minaccia segnaposto.'),
  ('T206', 'Hacker del metrò', 2, array['INT', 'TEC'], 'Minaccia segnaposto.'),
  ('T207', 'Tempesta elettrica', 2, array['ENE', 'RES'], 'Minaccia segnaposto.'),
  ('T208', 'Spia infiltrata', 2, array['PER', 'FUR'], 'Minaccia segnaposto.'),
  ('T209', 'Ipnotizzatore', 2, array['PSI', 'VOL'], 'Minaccia segnaposto.'),
  ('T210', 'Gang dei motociclisti', 2, array['VEL', 'COM'], 'Minaccia segnaposto.'),
  ('T301', 'Rapina al treno blindato', 3, array['FOR', 'VEL', 'COM'], 'Minaccia segnaposto.'),
  ('T302', 'Laboratorio in fiamme', 3, array['RES', 'INT', 'TEC'], 'Minaccia segnaposto.'),
  ('T303', 'Rituale proibito', 3, array['MAG', 'VOL', 'PER'], 'Minaccia segnaposto.'),
  ('T304', 'Golem di cemento', 3, array['FOR', 'RES', 'ENE'], 'Minaccia segnaposto.'),
  ('T305', 'Mente alveare', 3, array['PSI', 'INT', 'VOL'], 'Minaccia segnaposto.'),
  ('T306', 'Ladro fantasma', 3, array['FUR', 'VEL', 'PER'], 'Minaccia segnaposto.'),
  ('T307', 'Drone d''assalto', 3, array['TEC', 'ENE', 'COM'], 'Minaccia segnaposto.'),
  ('T308', 'Labirinto di specchi', 3, array['PER', 'PSI', 'MAG'], 'Minaccia segnaposto.'),
  ('T309', 'Assedio al municipio', 3, array['COM', 'RES', 'VOL'], 'Minaccia segnaposto.'),
  ('T310', 'Contrabbando al porto', 3, array['FUR', 'INT', 'TEC'], 'Minaccia segnaposto.'),
  ('T401', 'Mostro delle fogne', 4, array['FOR', 'RES', 'COM', 'PER'], 'Minaccia segnaposto.'),
  ('T402', 'Colpo al caveau', 4, array['FUR', 'TEC', 'INT', 'VEL'], 'Minaccia segnaposto.'),
  ('T403', 'Portale instabile', 4, array['MAG', 'ENE', 'PSI', 'VOL'], 'Minaccia segnaposto.'),
  ('T404', 'Esercito di androidi', 4, array['TEC', 'COM', 'ENE', 'RES'], 'Minaccia segnaposto.'),
  ('T405', 'Rivolta in carcere', 4, array['COM', 'VOL', 'FOR', 'PER'], 'Minaccia segnaposto.'),
  ('T406', 'Virus mutante', 4, array['INT', 'RES', 'PSI', 'TEC'], 'Minaccia segnaposto.'),
  ('T407', 'Inseguimento in autostrada', 4, array['VEL', 'PER', 'TEC', 'COM'], 'Minaccia segnaposto.'),
  ('T408', 'Strega della palude', 4, array['MAG', 'PSI', 'FUR', 'RES'], 'Minaccia segnaposto.'),
  ('T409', 'Terremoto artificiale', 4, array['ENE', 'FOR', 'INT', 'VOL'], 'Minaccia segnaposto.'),
  ('T410', 'Infiltrazione nel quartier generale', 4, array['FUR', 'INT', 'PER', 'VOL'], 'Minaccia segnaposto.'),
  ('T501', 'Gigante risvegliato', 5, array['FOR', 'RES', 'ENE', 'COM', 'VOL'], 'Minaccia segnaposto.'),
  ('T502', 'Rete di spionaggio', 5, array['FUR', 'PER', 'INT', 'TEC', 'PSI'], 'Minaccia segnaposto.'),
  ('T503', 'Culto dell''eclissi', 5, array['MAG', 'PSI', 'VOL', 'PER', 'ENE'], 'Minaccia segnaposto.'),
  ('T504', 'Fortezza volante', 5, array['TEC', 'ENE', 'VEL', 'COM', 'INT'], 'Minaccia segnaposto.'),
  ('T505', 'Epidemia di follia', 5, array['PSI', 'VOL', 'RES', 'INT', 'MAG'], 'Minaccia segnaposto.'),
  ('T506', 'Guerra tra bande', 5, array['COM', 'FOR', 'VEL', 'FUR', 'PER'], 'Minaccia segnaposto.'),
  ('T507', 'Reattore in fusione', 5, array['ENE', 'RES', 'TEC', 'INT', 'VOL'], 'Minaccia segnaposto.'),
  ('T508', 'Caccia nel buio', 5, array['PER', 'FUR', 'VEL', 'PSI', 'COM'], 'Minaccia segnaposto.'),
  ('T509', 'Titano di metallo', 5, array['FOR', 'TEC', 'RES', 'ENE', 'MAG'], 'Minaccia segnaposto.'),
  ('T510', 'Tribunale degli spettri', 5, array['MAG', 'VOL', 'INT', 'PER', 'FUR'], 'Minaccia segnaposto.'),
  ('T601', 'Invasione dimensionale', 6, array['MAG', 'ENE', 'PSI', 'FOR', 'VOL', 'PER'], 'Minaccia segnaposto.'),
  ('T602', 'Collasso della città', 6, array['RES', 'FOR', 'TEC', 'INT', 'COM', 'VEL'], 'Minaccia segnaposto.'),
  ('T603', 'Signore delle ombre', 6, array['FUR', 'PSI', 'MAG', 'PER', 'VOL', 'COM'], 'Minaccia segnaposto.'),
  ('T604', 'Intelligenza ribelle', 6, array['TEC', 'INT', 'ENE', 'PER', 'VEL', 'RES'], 'Minaccia segnaposto.'),
  ('T605', 'Armata del caos', 6, array['COM', 'FOR', 'VEL', 'RES', 'ENE', 'FUR'], 'Minaccia segnaposto.'),
  ('T606', 'Eclissi eterna', 6, array['MAG', 'PSI', 'VOL', 'ENE', 'INT', 'RES'], 'Minaccia segnaposto.'),
  ('T607', 'Assalto al cielo', 6, array['VEL', 'TEC', 'COM', 'PER', 'ENE', 'FOR'], 'Minaccia segnaposto.'),
  ('T608', 'Cospirazione globale', 6, array['INT', 'FUR', 'PER', 'VOL', 'TEC', 'PSI'], 'Minaccia segnaposto.'),
  ('T609', 'Risveglio dell''antico', 6, array['MAG', 'FOR', 'RES', 'VOL', 'PSI', 'ENE'], 'Minaccia segnaposto.'),
  ('T610', 'Ultima battaglia', 6, array['COM', 'VEL', 'INT', 'MAG', 'FUR', 'TEC'], 'Minaccia segnaposto.');
