-- M1 · Game configuration and minimal card catalog.
--
-- Conventions for every migration in this project:
-- - RLS is enabled on every table.
-- - Privileges are granted explicitly (new tables are not auto-exposed):
--   clients only ever get SELECT, writes go through security definer functions.
-- - Functions are revoked from PUBLIC and granted to the roles that need them.

create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- game_config: balance values used by server-side logic. Keys mirror the paths
-- of src/config/balance.ts in snake_case (e.g. "conquest.starter_set_size").
-- ---------------------------------------------------------------------------

create table public.game_config (
  key text primary key,
  value jsonb not null,
  description text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.game_config enable row level security;
revoke all on table public.game_config from anon, authenticated;
grant select on table public.game_config to anon, authenticated;
create policy "game_config is readable by everyone"
  on public.game_config for select to anon, authenticated using (true);

insert into public.game_config (key, value, description) values
  ('cards.ability_min', '0', 'Minimum value of a single ability'),
  ('cards.ability_max', '10', 'Maximum value of a single ability'),
  ('cards.ability_budget', '54', 'Target sum of the 12 abilities of every card'),
  ('cards.ability_budget_tolerance', '3', 'Allowed deviation from the ability budget'),
  ('conquest.starter_set_size', '10', 'Cards granted on first login (never conquerable)'),
  ('conquest.starter_set_max_rarity_rank', '1', 'Highest rarity rank allowed in the starter set');

-- Reads an integer config value; fails loudly when the key is missing.
create function public.config_int(p_key text)
returns integer
language plpgsql
stable
set search_path = ''
as $$
declare
  v_value integer;
begin
  select (value #>> '{}')::integer into v_value from public.game_config where key = p_key;
  if v_value is null then
    raise exception 'missing game_config key: %', p_key;
  end if;
  return v_value;
end;
$$;

revoke execute on function public.config_int(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Rarities: a configuration table, never an enum. Logic compares `rank` only.
-- The rank constraint is deferrable so a new rarity can be inserted between
-- existing ones by shifting ranks inside one transaction.
-- ---------------------------------------------------------------------------

create table public.rarity_definitions (
  code text primary key,
  name text not null,
  rank integer not null check (rank > 0),
  color text not null,
  drop_weight numeric not null check (drop_weight >= 0),
  constraint rarity_definitions_rank_key unique (rank) deferrable initially deferred
);

alter table public.rarity_definitions enable row level security;
revoke all on table public.rarity_definitions from anon, authenticated;
grant select on table public.rarity_definitions to anon, authenticated;
create policy "rarities are readable by everyone"
  on public.rarity_definitions for select to anon, authenticated using (true);

insert into public.rarity_definitions (code, name, rank, color, drop_weight) values
  ('delta', 'Delta', 1, '#9ca3af', 60),
  ('gamma', 'Gamma', 2, '#22c55e', 25),
  ('beta', 'Beta', 3, '#3b82f6', 10),
  ('alfa', 'Alfa', 4, '#a855f7', 4),
  ('omega', 'Omega', 5, '#f59e0b', 1);

-- ---------------------------------------------------------------------------
-- Abilities: 12 configurable abilities in 4 families. Renaming them only
-- touches these rows, never the logic.
-- ---------------------------------------------------------------------------

create table public.ability_families (
  code text primary key,
  name text not null,
  color text not null,
  sort_order integer not null unique
);

create table public.ability_definitions (
  code text primary key,
  name text not null,
  family text not null references public.ability_families (code),
  icon text,
  sort_order integer not null unique
);

alter table public.ability_families enable row level security;
alter table public.ability_definitions enable row level security;
revoke all on table public.ability_families, public.ability_definitions from anon, authenticated;
grant select on table public.ability_families, public.ability_definitions to anon, authenticated;
create policy "ability families are readable by everyone"
  on public.ability_families for select to anon, authenticated using (true);
create policy "abilities are readable by everyone"
  on public.ability_definitions for select to anon, authenticated using (true);

insert into public.ability_families (code, name, color, sort_order) values
  ('body', 'Corpo', '#ef4444', 1),
  ('mind', 'Mente', '#3b82f6', 2),
  ('power', 'Potere', '#a855f7', 3),
  ('craft', 'Mestiere', '#f59e0b', 4);

insert into public.ability_definitions (code, name, family, sort_order) values
  ('FOR', 'Forza', 'body', 1),
  ('VEL', 'Velocità', 'body', 2),
  ('RES', 'Resistenza', 'body', 3),
  ('INT', 'Intelletto', 'mind', 4),
  ('VOL', 'Volontà', 'mind', 5),
  ('PER', 'Percezione', 'mind', 6),
  ('ENE', 'Energia', 'power', 7),
  ('MAG', 'Magia', 'power', 8),
  ('PSI', 'Psiche', 'power', 9),
  ('COM', 'Combattimento', 'craft', 10),
  ('TEC', 'Tecnologia', 'craft', 11),
  ('FUR', 'Furtività', 'craft', 12);

-- ---------------------------------------------------------------------------
-- Card catalog. The whole catalog is public: the album also shows the cards
-- a player does not own yet.
-- ---------------------------------------------------------------------------

create table public.card_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  faction text not null check (faction in ('heroes', 'villains', 'neutrals')),
  rarity_code text not null references public.rarity_definitions (code),
  stats jsonb not null,
  power_code text,
  power_params jsonb not null default '{}',
  art_url text,
  flavor text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.card_definitions enable row level security;
revoke all on table public.card_definitions from anon, authenticated;
grant select on table public.card_definitions to anon, authenticated;
create policy "card catalog is readable by everyone"
  on public.card_definitions for select to anon, authenticated using (true);

-- Stats must hold exactly the configured abilities, each an integer within
-- range, and their total must respect the ability budget (SPEC §4.3).
create function public.validate_card_definition()
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

  return new;
end;
$$;

revoke execute on function public.validate_card_definition() from public, anon, authenticated;

create trigger validate_card_definition
  before insert or update on public.card_definitions
  for each row execute function public.validate_card_definition();

-- Placeholder characters (SPEC §2): enough Delta cards for the starter set.
-- The full placeholder catalog (60 characters) arrives in M2.
-- Specialists: few 9-10 values and many 0-2. Generalists: values spread around 4-6.
insert into public.card_definitions (code, name, faction, rarity_code, stats, flavor) values
  ('P001', 'Recluta 01', 'heroes', 'delta',
   '{"FOR":10,"VEL":5,"RES":9,"INT":2,"VOL":6,"PER":3,"ENE":4,"MAG":0,"PSI":1,"COM":9,"TEC":3,"FUR":2}',
   'Personaggio segnaposto. Specialista di forza.'),
  ('P002', 'Recluta 02', 'villains', 'delta',
   '{"FOR":3,"VEL":10,"RES":3,"INT":4,"VOL":2,"PER":9,"ENE":2,"MAG":0,"PSI":1,"COM":6,"TEC":5,"FUR":9}',
   'Personaggio segnaposto. Specialista di velocità.'),
  ('P003', 'Recluta 03', 'heroes', 'delta',
   '{"FOR":0,"VEL":3,"RES":1,"INT":10,"VOL":6,"PER":9,"ENE":3,"MAG":2,"PSI":5,"COM":2,"TEC":9,"FUR":4}',
   'Personaggio segnaposto. Specialista di intelletto.'),
  ('P004', 'Recluta 04', 'neutrals', 'delta',
   '{"FOR":0,"VEL":2,"RES":3,"INT":5,"VOL":9,"PER":4,"ENE":6,"MAG":10,"PSI":9,"COM":2,"TEC":1,"FUR":3}',
   'Personaggio segnaposto. Specialista di magia.'),
  ('P005', 'Recluta 05', 'villains', 'delta',
   '{"FOR":9,"VEL":3,"RES":9,"INT":1,"VOL":6,"PER":2,"ENE":10,"MAG":4,"PSI":2,"COM":5,"TEC":3,"FUR":0}',
   'Personaggio segnaposto. Specialista di energia.'),
  ('P006', 'Recluta 06', 'neutrals', 'delta',
   '{"FOR":0,"VEL":3,"RES":1,"INT":6,"VOL":9,"PER":9,"ENE":3,"MAG":5,"PSI":10,"COM":2,"TEC":2,"FUR":4}',
   'Personaggio segnaposto. Specialista di psiche.'),
  ('P007', 'Recluta 07', 'heroes', 'delta',
   '{"FOR":6,"VEL":7,"RES":5,"INT":4,"VOL":3,"PER":4,"ENE":3,"MAG":2,"PSI":1,"COM":8,"TEC":7,"FUR":4}',
   'Personaggio segnaposto. Combattente tecnologico.'),
  ('P008', 'Recluta 08', 'villains', 'delta',
   '{"FOR":1,"VEL":6,"RES":2,"INT":7,"VOL":4,"PER":7,"ENE":3,"MAG":3,"PSI":4,"COM":4,"TEC":5,"FUR":8}',
   'Personaggio segnaposto. Infiltrato astuto.'),
  ('P009', 'Recluta 09', 'heroes', 'delta',
   '{"FOR":6,"VEL":4,"RES":5,"INT":5,"VOL":6,"PER":5,"ENE":4,"MAG":4,"PSI":3,"COM":5,"TEC":4,"FUR":3}',
   'Personaggio segnaposto. Generalista solido.'),
  ('P010', 'Recluta 10', 'neutrals', 'delta',
   '{"FOR":4,"VEL":6,"RES":4,"INT":5,"VOL":4,"PER":5,"ENE":4,"MAG":3,"PSI":3,"COM":5,"TEC":6,"FUR":5}',
   'Personaggio segnaposto. Generalista agile.'),
  ('P011', 'Recluta 11', 'villains', 'delta',
   '{"FOR":4,"VEL":3,"RES":5,"INT":5,"VOL":5,"PER":4,"ENE":6,"MAG":6,"PSI":5,"COM":4,"TEC":4,"FUR":3}',
   'Personaggio segnaposto. Generalista arcano.'),
  ('P012', 'Recluta 12', 'heroes', 'delta',
   '{"FOR":4,"VEL":5,"RES":5,"INT":4,"VOL":5,"PER":6,"ENE":5,"MAG":3,"PSI":3,"COM":6,"TEC":4,"FUR":4}',
   'Personaggio segnaposto. Generalista vigile.');
