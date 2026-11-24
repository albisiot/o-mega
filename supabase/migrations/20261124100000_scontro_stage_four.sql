-- Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 4: battles against the computer, decided by
-- the server. The client sends its five cards in their places, its tactics and, in manual mode,
-- each choice; the "match" Edge Function builds the battle with the engine, plays the computer's
-- side, and stores here every choice with the battle's seed. The seed never reaches a client:
-- knowing it, a phone could foresee every hit and critical. Each call rebuilds the battle from the
-- seed and the choices so far, so the stored choices are also the replay.
--
-- What this migration adds:
--   * the numbers of the mode in game_config (combat.*, the same as balance.ts);
--   * combat_kits: the moves of each character (the engine's CombatKit as data), readable by every
--     player, changed only by an admin (EDITOR → Scontro a squadre), seeded with the ten pilots of
--     stage 3; a battle fields only characters with a kit;
--   * combat_battles: a battle against the computer (closed to clients: the seed is there);
--   * combat_create and combat_record for the Edge Function: who owns the cards, one battle at a
--     time, the choices appended in order (a stale call is refused), the end and its prizes (XP,
--     coins for a win, the first combat.rewards.daily_battles finished battles of the game day);
--   * combat_active and combat_abandon for the player; admin_combat_kits, admin_save_combat_kit
--     and admin_delete_combat_kit for the EDITOR;
--   * the mode «combat» in Modalità di gioco, off with «Prossimamente» until an admin opens it.

-- ---------------------------------------------------------------------------
-- The numbers
-- ---------------------------------------------------------------------------

insert into public.game_config (key, value, description) values
  ('combat.team_size', '5', 'Scontro a squadre (balance.ts combat)'),
  ('combat.front_size', '2', 'Scontro a squadre (balance.ts combat)'),
  ('combat.reference_budget', '54', 'Scontro a squadre (balance.ts combat)'),
  ('combat.rarity_scale_percent', '80', 'Scontro a squadre (balance.ts combat)'),
  ('combat.vita.base', '260', 'Scontro a squadre (balance.ts combat)'),
  ('combat.vita.per_point.res', '6', 'Scontro a squadre (balance.ts combat)'),
  ('combat.vita.per_point.vol', '3', 'Scontro a squadre (balance.ts combat)'),
  ('combat.speed.base', '100', 'Scontro a squadre (balance.ts combat)'),
  ('combat.speed.per_point.vel', '1', 'Scontro a squadre (balance.ts combat)'),
  ('combat.turn_meter', '1000', 'Scontro a squadre (balance.ts combat)'),
  ('combat.start_meter_max_percent', '100', 'Scontro a squadre (balance.ts combat)'),
  ('combat.power.base', '20', 'Scontro a squadre (balance.ts combat)'),
  ('combat.power.per_point', '8', 'Scontro a squadre (balance.ts combat)'),
  ('combat.family_defense.body', '3.37', 'Scontro a squadre (balance.ts combat)'),
  ('combat.family_defense.mind', '2.65', 'Scontro a squadre (balance.ts combat)'),
  ('combat.family_defense.power', '5.03', 'Scontro a squadre (balance.ts combat)'),
  ('combat.family_defense.craft', '4.1', 'Scontro a squadre (balance.ts combat)'),
  ('combat.defense_scale', '100', 'Scontro a squadre (balance.ts combat)'),
  ('combat.cover_percent', '80', 'Scontro a squadre (balance.ts combat)'),
  ('combat.hit.base', '85', 'Scontro a squadre (balance.ts combat)'),
  ('combat.hit.attacker.per', '1', 'Scontro a squadre (balance.ts combat)'),
  ('combat.hit.defender.fur', '-0.5', 'Scontro a squadre (balance.ts combat)'),
  ('combat.hit.min_percent', '70', 'Scontro a squadre (balance.ts combat)'),
  ('combat.hit.max_percent', '97', 'Scontro a squadre (balance.ts combat)'),
  ('combat.crit.base', '5', 'Scontro a squadre (balance.ts combat)'),
  ('combat.crit.per_point.fur', '1', 'Scontro a squadre (balance.ts combat)'),
  ('combat.crit.per_point.per', '0.5', 'Scontro a squadre (balance.ts combat)'),
  ('combat.crit.max_percent', '28', 'Scontro a squadre (balance.ts combat)'),
  ('combat.crit.multiplier_percent', '150', 'Scontro a squadre (balance.ts combat)'),
  ('combat.charge.start', '2', 'Scontro a squadre (balance.ts combat)'),
  ('combat.charge.max', '6', 'Scontro a squadre (balance.ts combat)'),
  ('combat.charge.base', '2', 'Scontro a squadre (balance.ts combat)'),
  ('combat.charge.special', '1', 'Scontro a squadre (balance.ts combat)'),
  ('combat.shield_max_percent', '30', 'Scontro a squadre (balance.ts combat)'),
  ('combat.max_actions', '100', 'Scontro a squadre (balance.ts combat)'),
  ('combat.field_bonus_percent', '20', 'Scontro a squadre (balance.ts combat)'),
  ('combat.statuses.empower_percent', '25', 'Scontro a squadre (balance.ts combat)'),
  ('combat.statuses.fortify_percent', '50', 'Scontro a squadre (balance.ts combat)'),
  ('combat.statuses.haste_percent', '20', 'Scontro a squadre (balance.ts combat)'),
  ('combat.statuses.weaken_percent', '20', 'Scontro a squadre (balance.ts combat)'),
  ('combat.statuses.vulnerable_percent', '30', 'Scontro a squadre (balance.ts combat)'),
  ('combat.statuses.burn_percent', '6', 'Scontro a squadre (balance.ts combat)'),
  ('combat.statuses.max_turns', '3', 'Scontro a squadre (balance.ts combat)'),
  ('combat.effect_chance.per_point', '3', 'Scontro a squadre (balance.ts combat)'),
  ('combat.effect_chance.min_percent', '10', 'Scontro a squadre (balance.ts combat)'),
  ('combat.effect_chance.max_percent', '90', 'Scontro a squadre (balance.ts combat)'),
  ('combat.field.min_level', '2', 'Scontro a squadre (balance.ts combat)'),
  ('combat.field.max_level', '4', 'Scontro a squadre (balance.ts combat)'),
  ('combat.rewards.win_xp', '20', 'Scontro a squadre (balance.ts combat)'),
  ('combat.rewards.loss_xp', '8', 'Scontro a squadre (balance.ts combat)'),
  ('combat.rewards.win_coins', '15', 'Scontro a squadre (balance.ts combat)'),
  ('combat.rewards.daily_battles', '5', 'Scontro a squadre (balance.ts combat)');

-- ---------------------------------------------------------------------------
-- The mode, off until an admin opens it; coins of the battles
-- ---------------------------------------------------------------------------

alter table public.mode_availability drop constraint mode_availability_key_check;
alter table public.mode_availability add constraint mode_availability_key_check check (key in (
  'classic', 'boss', 'triple', 'quadrant', 'quadrant_shifting',
  'ranked', 'conquest', 'story', 'emergency', 'emergency_week', 'coop', 'raid', 'combat'
));
insert into public.mode_availability (key, state, label) values ('combat', 'off', 'Prossimamente');

alter table public.coin_ledger drop constraint coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in (
  'pack_purchase', 'match_reward', 'bot_match_reward', 'duplicate_conversion', 'conquest_bonus', 'level_reward',
  'emergency_reward', 'bonus_code', 'story_reward', 'story_star', 'event_reward', 'objective_reward', 'achievement_reward',
  'emergency_prize', 'ranked_prize', 'emergency_week_reward', 'emergency_week_prize', 'admin_adjustment', 'challenge_reward',
  'coop_reward', 'coop_star', 'raid_reward', 'raid_star', 'raid_weekly', 'combat_reward'
));

-- ---------------------------------------------------------------------------
-- The kits
-- ---------------------------------------------------------------------------

create table public.combat_kits (
  definition_id uuid primary key references public.card_definitions (id) on delete cascade,
  -- The engine's CombatKit: base, special, supreme and passive. The EDITOR checks it with the
  -- engine before saving; the Edge Function checks it again when a battle starts.
  kit jsonb not null check (
    jsonb_typeof(kit) = 'object'
    and jsonb_typeof(kit -> 'base') = 'object'
    and jsonb_typeof(kit -> 'special') = 'object'
    and jsonb_typeof(kit -> 'supreme') = 'object'
  ),
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.combat_kits enable row level security;
revoke all on table public.combat_kits from anon, authenticated;
grant select on table public.combat_kits to authenticated;
create policy "combat kits are readable by players"
  on public.combat_kits for select to authenticated using (true);

-- The ten pilots of stage 3 (src/lib/combat-pilot.ts on 24 November 2026).
insert into public.combat_kits (definition_id, kit)
select d.id, k.kit::jsonb
from (values
  ('P001', '{"base":{"id":"P001-base","slot":"base","range":"melee","target":"enemy","name":"Spallata","scaling":{"FOR":0.7,"COM":0.3},"effects":[{"kind":"damage","multiplier":1,"on":"primary"}],"cooldown":0},"special":{"id":"P001-special","slot":"special","range":"melee","target":"enemy_and_adjacent","name":"Carico pesante","scaling":{"FOR":0.7,"COM":0.3},"effects":[{"kind":"damage","multiplier":1.25,"on":"primary"},{"kind":"damage","multiplier":0.35,"on":"adjacent"}],"cooldown":3},"supreme":{"id":"P001-supreme","slot":"supreme","range":"ranged","target":"all_enemies","name":"Container in caduta","scaling":{"FOR":0.7,"COM":0.3},"effects":[{"kind":"damage","multiplier":0.8,"on":"all"},{"kind":"status","status":"weaken","turns":1,"on":"all","chance":{"base":40,"ability":"FOR"}}],"cooldown":0},"passive":{"id":"P001-passive","scaling":{"COM":1},"trigger":"battle_start","limit":1,"effects":[{"kind":"shield","multiplier":0.5,"to":"self"}],"modifiers":{},"name":"Uomo del porto"}}'),
  ('P125', '{"base":{"id":"P125-base","slot":"base","range":"melee","target":"enemy","name":"Presa","scaling":{"FOR":0.6,"RES":0.4},"effects":[{"kind":"damage","multiplier":0.9,"on":"primary"},{"kind":"status","status":"weaken","turns":2,"on":"primary","chance":{"base":40,"ability":"FOR"}}],"cooldown":0},"special":{"id":"P125-special","slot":"special","range":"ranged","target":"self","name":"Fondale","scaling":{"RES":1},"effects":[{"kind":"shield","multiplier":0.8,"on":"primary"},{"kind":"status","status":"taunt","turns":1,"on":"primary"}],"cooldown":3},"supreme":{"id":"P125-supreme","slot":"supreme","range":"melee","target":"enemy","name":"Risacca","scaling":{"FOR":0.6,"PER":0.4},"effects":[{"kind":"damage","multiplier":1.8,"on":"primary"},{"kind":"status","status":"stun","turns":1,"on":"primary","chance":{"base":45,"ability":"FOR"}}],"cooldown":0},"passive":{"id":"P125-passive","scaling":{},"trigger":"hurt","limit":3,"effects":[{"kind":"charge","amount":1,"to":"self"}],"modifiers":{},"name":"Non molla niente"}}'),
  ('P204', '{"base":{"id":"P204-base","slot":"base","range":"ranged","target":"enemy","name":"Bilancia truccata","scaling":{"PER":0.6,"TEC":0.4},"effects":[{"kind":"damage","multiplier":1,"on":"primary"}],"cooldown":0},"special":{"id":"P204-special","slot":"special","range":"ranged","target":"enemy","name":"Senza peso","scaling":{"PER":0.6,"ENE":0.4},"effects":[{"kind":"damage","multiplier":1.1,"on":"primary"},{"kind":"status","status":"haste","turns":2,"on":"self"}],"cooldown":3},"supreme":{"id":"P204-supreme","slot":"supreme","range":"ranged","target":"all_allies","name":"Cassa vuota","scaling":{"INT":0.5,"ENE":0.5},"effects":[{"kind":"status","status":"haste","turns":2,"on":"all"},{"kind":"shield","multiplier":0.5,"on":"all"}],"cooldown":0},"passive":{"id":"P204-passive","scaling":{},"trigger":null,"limit":0,"effects":[],"modifiers":{"hitPercent":6,"critPercent":4},"name":"La bilancia non mente"}}'),
  ('P152', '{"base":{"id":"P152-base","slot":"base","range":"ranged","target":"enemy","name":"Mercanzia","scaling":{"INT":0.6,"PER":0.4},"effects":[{"kind":"damage","multiplier":0.9,"on":"primary"}],"cooldown":0},"special":{"id":"P152-special","slot":"special","range":"ranged","target":"ally","name":"Aria di casa","scaling":{"VOL":0.6,"INT":0.4},"effects":[{"kind":"heal","multiplier":0.85,"on":"primary"},{"kind":"status","status":"fortify","turns":2,"on":"primary"}],"cooldown":3},"supreme":{"id":"P152-supreme","slot":"supreme","range":"ranged","target":"all_allies","name":"Il carro","scaling":{"VOL":0.6,"INT":0.4},"effects":[{"kind":"heal","multiplier":0.6,"on":"all"},{"kind":"status","status":"fortify","turns":1,"on":"all"}],"cooldown":0},"passive":{"id":"P152-passive","scaling":{"VOL":1},"trigger":"ally_down","limit":2,"effects":[{"kind":"heal","multiplier":0.4,"to":"allies"}],"modifiers":{},"name":"Sette giorni"}}'),
  ('P123', '{"base":{"id":"P123-base","slot":"base","range":"ranged","target":"enemy","name":"Strimpellata","scaling":{"PSI":0.7,"PER":0.3},"effects":[{"kind":"damage","multiplier":0.8,"on":"primary"},{"kind":"status","status":"weaken","turns":2,"on":"primary","chance":{"base":45,"ability":"PSI"}}],"cooldown":0},"special":{"id":"P123-special","slot":"special","range":"ranged","target":"all_enemies","name":"La canzone giusta","scaling":{"PSI":0.7,"PER":0.3},"effects":[{"kind":"damage","multiplier":0.35,"on":"all"},{"kind":"status","status":"weaken","turns":2,"on":"all","chance":{"base":40,"ability":"PSI"}}],"cooldown":3},"supreme":{"id":"P123-supreme","slot":"supreme","range":"ranged","target":"all_enemies","name":"Ninna nanna","scaling":{"PSI":0.7,"PER":0.3},"effects":[{"kind":"damage","multiplier":0.4,"on":"all"},{"kind":"status","status":"stun","turns":1,"on":"all","chance":{"base":20,"ability":"PSI"}}],"cooldown":0},"passive":{"id":"P123-passive","scaling":{},"trigger":null,"limit":0,"effects":[],"modifiers":{"effectChancePercent":10},"name":"Una canzone sola"}}'),
  ('P043', '{"base":{"id":"P043-base","slot":"base","range":"ranged","target":"enemy","name":"Rumore di fondo","scaling":{"PSI":0.6,"PER":0.4},"effects":[{"kind":"damage","multiplier":1,"on":"primary"}],"cooldown":0},"special":{"id":"P043-special","slot":"special","range":"ranged","target":"enemy","name":"Pensiero letto","scaling":{"PSI":0.6,"PER":0.4},"effects":[{"kind":"damage","multiplier":1.2,"on":"primary"},{"kind":"status","status":"vulnerable","turns":2,"on":"primary","chance":{"base":50,"ability":"PSI"}}],"cooldown":3},"supreme":{"id":"P043-supreme","slot":"supreme","range":"ranged","target":"all_enemies","name":"Tutte le voci","scaling":{"PSI":0.6,"PER":0.4},"effects":[{"kind":"damage","multiplier":0.75,"on":"all"}],"cooldown":0},"passive":{"id":"P043-passive","scaling":{},"trigger":null,"limit":0,"effects":[],"modifiers":{"hitPercent":8,"critPercent":6},"name":"Prima di te"}}'),
  ('P044', '{"base":{"id":"P044-base","slot":"base","range":"ranged","target":"enemy","name":"Mani roventi","scaling":{"ENE":0.6,"MAG":0.4},"effects":[{"kind":"damage","multiplier":1.05,"on":"primary"},{"kind":"status","status":"burn","turns":1,"on":"primary","chance":{"base":35,"ability":"ENE"}}],"cooldown":0},"special":{"id":"P044-special","slot":"special","range":"ranged","target":"enemy","name":"Serratura fusa","scaling":{"ENE":0.6,"MAG":0.4},"effects":[{"kind":"damage","multiplier":1.3,"on":"primary"},{"kind":"status","status":"burn","turns":2,"on":"primary","chance":{"base":60,"ability":"ENE"}}],"cooldown":3},"supreme":{"id":"P044-supreme","slot":"supreme","range":"ranged","target":"all_enemies","name":"Stanza gelata","scaling":{"MAG":0.6,"ENE":0.4},"effects":[{"kind":"damage","multiplier":0.7,"on":"all"},{"kind":"status","status":"stun","turns":1,"on":"all","chance":{"base":25,"ability":"MAG"}}],"cooldown":0},"passive":{"id":"P044-passive","scaling":{},"trigger":null,"limit":0,"effects":[],"modifiers":{"damageVsStatus":{"status":"burn","percent":30}},"name":"Il primo fuoco"}}'),
  ('P037', '{"base":{"id":"P037-base","slot":"base","range":"infiltration","target":"enemy","name":"Lama silenziosa","scaling":{"FUR":0.7,"INT":0.3},"effects":[{"kind":"damage","multiplier":1.05,"on":"primary"}],"cooldown":0},"special":{"id":"P037-special","slot":"special","range":"infiltration","target":"enemy","name":"Fascicolo","scaling":{"INT":0.6,"FUR":0.4},"effects":[{"kind":"damage","multiplier":1.15,"on":"primary"},{"kind":"status","status":"vulnerable","turns":2,"on":"primary","chance":{"base":60,"ability":"INT"}}],"cooldown":3},"supreme":{"id":"P037-supreme","slot":"supreme","range":"infiltration","target":"enemy","name":"Chi paga di più","scaling":{"FUR":0.7,"INT":0.3},"effects":[{"kind":"damage","multiplier":2.2,"on":"primary"}],"cooldown":0},"passive":{"id":"P037-passive","scaling":{},"trigger":"knockout","limit":0,"effects":[{"kind":"status","status":"haste","turns":2,"to":"self"}],"modifiers":{"critPercent":8},"name":"La lealtà si vende a parte"}}'),
  ('P213', '{"base":{"id":"P213-base","slot":"base","range":"ranged","target":"enemy","name":"Braccio di scarto","scaling":{"TEC":0.7,"INT":0.3},"effects":[{"kind":"damage","multiplier":0.9,"on":"primary"}],"cooldown":0},"special":{"id":"P213-special","slot":"special","range":"ranged","target":"all_allies","name":"Quaranta braccia","scaling":{"TEC":0.6,"INT":0.4},"effects":[{"kind":"shield","multiplier":0.4,"on":"all"}],"cooldown":3},"supreme":{"id":"P213-supreme","slot":"supreme","range":"ranged","target":"self","name":"Nessuno me l''ha chiesto","scaling":{"TEC":0.6,"VOL":0.4},"effects":[{"kind":"shield","multiplier":0.8,"on":"primary"},{"kind":"status","status":"taunt","turns":2,"on":"primary"},{"kind":"status","status":"fortify","turns":2,"on":"primary"}],"cooldown":0},"passive":{"id":"P213-passive","scaling":{"TEC":1},"trigger":"ally_down","limit":1,"effects":[{"kind":"shield","multiplier":0.3,"to":"allies"}],"modifiers":{},"name":"Solo ciò che è di scarto"}}'),
  ('P104', '{"base":{"id":"P104-base","slot":"base","range":"ranged","target":"enemy","name":"Eco della fine","scaling":{"PSI":0.5,"ENE":0.5},"effects":[{"kind":"damage","multiplier":1,"on":"primary"}],"cooldown":0},"special":{"id":"P104-special","slot":"special","range":"ranged","target":"enemy","name":"Tempo fermo","scaling":{"PSI":0.6,"INT":0.4},"effects":[{"kind":"damage","multiplier":0.7,"on":"primary"},{"kind":"status","status":"stun","turns":1,"on":"primary","chance":{"base":45,"ability":"PSI"}}],"cooldown":3},"supreme":{"id":"P104-supreme","slot":"supreme","range":"ranged","target":"all_enemies","name":"È già finito","scaling":{"ENE":0.5,"INT":0.5},"effects":[{"kind":"damage","multiplier":0.95,"on":"all"}],"cooldown":0},"passive":{"id":"P104-passive","scaling":{},"trigger":"turn_start","limit":3,"effects":[{"kind":"charge","amount":1,"to":"self"}],"modifiers":{},"name":"Si annoia"}}')
) as k(code, kit)
join public.card_definitions d on d.code = k.code;

-- ---------------------------------------------------------------------------
-- The battles
-- ---------------------------------------------------------------------------

create table public.combat_battles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'won', 'lost', 'draw', 'abandoned')),
  -- Both sides as the engine takes them (CombatSetup: abilities, budgets, kits, places) and the field.
  setup jsonb not null,
  -- The numbers when the battle started: a later change does not touch a battle under way.
  rules jsonb not null,
  -- Hidden: no client reads this table.
  seed bigint not null check (seed >= 0 and seed < 4294967296),
  -- The player's side in automatic mode: strategy, priority, orders.
  tactics jsonb not null,
  auto boolean not null default false,
  -- Every choice of both sides, in order ({slot, target}): with the seed, the whole battle.
  actions jsonb not null default '[]'::jsonb check (jsonb_typeof(actions) = 'array'),
  result jsonb,
  xp integer,
  coins integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);

create index combat_battles_user_status_idx on public.combat_battles (user_id, status);
create index combat_battles_user_finished_idx on public.combat_battles (user_id, finished_at);

alter table public.combat_battles enable row level security;
revoke all on table public.combat_battles from anon, authenticated;

-- As in 20261123220000_caccia_grossa_stage_three.sql, with the battles of the Scontro a squadre.
create or replace function public.guard_mode_start()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  case tg_table_name
    when 'matches' then
      perform public.assert_modes_open(public.mode_keys_for(new.format, new.mode, new.story_mission_id is not null));
    when 'matchmaking_queue', 'match_lobbies' then
      perform public.assert_modes_open(public.mode_keys_for(new.format, new.mode, false));
    when 'challenge_queue' then
      perform public.assert_modes_open(public.mode_keys_for(new.format, null, false));
    when 'emergency_runs', 'challenge_emergency_runs' then
      perform public.assert_modes_open(array['emergency']);
    when 'emergency_week_runs' then
      perform public.assert_modes_open(array['emergency_week']);
    when 'coop_queue' then
      perform public.assert_modes_open(array['coop']);
    when 'coop_rooms' then
      -- A room opened, or a room that starts playing (coop_start, the public queue).
      if tg_op = 'INSERT' or (new.status = 'active' and old.status is distinct from 'active') then
        perform public.assert_modes_open(array['coop']);
      end if;
    when 'raid_rooms' then
      -- A hunt's room opened, or one that starts.
      if tg_op = 'INSERT' or (new.status = 'active' and old.status is distinct from 'active') then
        perform public.assert_modes_open(array['raid']);
      end if;
    when 'raid_queue' then
      perform public.assert_modes_open(array['raid']);
    when 'combat_battles' then
      perform public.assert_modes_open(array['combat']);
  end case;
  return new;
end;
$$;

create trigger combat_battles_mode_open before insert on public.combat_battles
  for each row execute function public.guard_mode_start();

-- A new battle (the Edge Function): the five cards in their places must be the player's, five
-- different characters, none at stake in a Conquista, each with a kit; side a of the setup must be
-- those characters in that order. A battle still under way is abandoned (no prizes).
create function public.combat_create(
  p_user uuid,
  p_card_instance_ids uuid[],
  p_setup jsonb,
  p_rules jsonb,
  p_seed bigint,
  p_tactics jsonb,
  p_auto boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_definitions uuid[];
  v_battle uuid;
begin
  perform 1 from public.profiles where id = p_user for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  v_definitions := public.check_team_of(p_user, p_card_instance_ids, public.config_int('combat.team_size'));
  if exists (select 1 from unnest(v_definitions) as d(id) where not exists (select 1 from public.combat_kits k where k.definition_id = d.id)) then
    raise exception 'combat_no_kit' using errcode = '22023';
  end if;
  if jsonb_typeof(p_setup -> 'a') is distinct from 'array'
     or array(select (x ->> 'definitionId')::uuid from jsonb_array_elements(p_setup -> 'a') with ordinality as e(x, ord) order by ord)
        is distinct from v_definitions then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  update public.combat_battles set status = 'abandoned', finished_at = now(), updated_at = now()
  where user_id = p_user and status = 'active';
  insert into public.combat_battles (user_id, setup, rules, seed, tactics, auto)
  values (p_user, p_setup, p_rules, p_seed, p_tactics, p_auto)
  returning id into v_battle;
  return v_battle;
end;
$$;

-- Appends choices to a battle under way (the Edge Function): p_from is how many it had when the
-- call read it, so two calls at once cannot both write. With p_result the battle ends: won, lost
-- or drawn for the player (side a), and the prizes of the first combat.rewards.daily_battles
-- finished battles of the game day (Europe/Rome): XP for every one (a win's or a loss's), coins for a win.
create function public.combat_record(p_battle uuid, p_user uuid, p_from integer, p_actions jsonb, p_result jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_battle public.combat_battles;
  v_status text;
  v_xp integer := 0;
  v_coins integer := 0;
begin
  select * into v_battle from public.combat_battles where id = p_battle and user_id = p_user for update;
  if not found then
    raise exception 'combat_not_found' using errcode = 'P0002';
  end if;
  if v_battle.status <> 'active' then
    raise exception 'combat_finished' using errcode = '22023';
  end if;
  if jsonb_typeof(p_actions) is distinct from 'array' then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  if jsonb_array_length(v_battle.actions) <> p_from then
    raise exception 'combat_stale' using errcode = '40001';
  end if;

  update public.combat_battles set actions = actions || p_actions, updated_at = now() where id = p_battle;
  if p_result is null then
    return jsonb_build_object('status', 'active');
  end if;

  v_status := case p_result ->> 'winner' when 'a' then 'won' when 'b' then 'lost' when 'draw' then 'draw' end;
  if v_status is null then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  if (select count(*) from public.combat_battles b
      where b.user_id = p_user and b.xp is not null and public.game_day(b.finished_at) = public.game_day())
     < public.config_int('combat.rewards.daily_battles') then
    v_xp := case when v_status = 'won' then public.config_int('combat.rewards.win_xp') else public.config_int('combat.rewards.loss_xp') end;
    v_coins := case when v_status = 'won' then public.config_int('combat.rewards.win_coins') else 0 end;
  end if;
  update public.combat_battles
  set status = v_status, result = p_result, finished_at = now(), updated_at = now(),
      xp = case when v_xp > 0 or v_coins > 0 then v_xp end,
      coins = case when v_xp > 0 or v_coins > 0 then v_coins end
  where id = p_battle;
  if v_coins > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id) values (p_user, v_coins, 'combat_reward', p_battle);
  end if;
  if v_xp > 0 then
    update public.profiles set xp = xp + v_xp, level = public.level_for_xp(xp + v_xp), updated_at = now() where id = p_user;
    perform public.grant_level_rewards(p_user, null);
    update public.profiles set conquest_unlocked = true
    where id = p_user and not conquest_unlocked and level >= public.config_int('conquest.unlock_at_level');
  end if;
  return jsonb_build_object('status', v_status, 'xp', v_xp, 'coins', v_coins);
end;
$$;

revoke execute on function public.combat_create(uuid, uuid[], jsonb, jsonb, bigint, jsonb, boolean) from public, anon, authenticated;
revoke execute on function public.combat_record(uuid, uuid, integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.combat_create(uuid, uuid[], jsonb, jsonb, bigint, jsonb, boolean) to service_role;
grant execute on function public.combat_record(uuid, uuid, integer, jsonb, jsonb) to service_role;

-- The player's battle under way, if any (to pick it up again): its id only.
create function public.combat_active()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.id from public.combat_battles b
  where b.user_id = auth.uid() and b.status = 'active'
  order by b.created_at desc
  limit 1
$$;

-- The player gives up a battle under way: no prizes.
create function public.combat_abandon(p_battle uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.combat_battles set status = 'abandoned', finished_at = now(), updated_at = now()
  where id = p_battle and user_id = auth.uid() and status = 'active';
  return found;
end;
$$;

revoke execute on function public.combat_active() from public, anon;
revoke execute on function public.combat_abandon(uuid) from public, anon;
grant execute on function public.combat_active() to authenticated;
grant execute on function public.combat_abandon(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- EDITOR → Scontro a squadre (admins only)
-- ---------------------------------------------------------------------------

-- Every character with a kit, and the kit.
create function public.admin_combat_kits()
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
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'definition_id', d.id, 'code', d.code, 'name', d.name, 'faction', d.faction, 'rarity', d.rarity_code,
      'stats', d.stats, 'kit', k.kit, 'version', k.version, 'updated_at', k.updated_at
    ) order by d.code)
    from public.combat_kits k join public.card_definitions d on d.id = k.definition_id
  ), '[]'::jsonb);
end;
$$;

-- Saves a character's kit (a new one, or a new version). The EDITOR checks it with the engine
-- first; here, its shape: the three moves as objects, each with its effects.
create function public.admin_save_combat_kit(p_definition uuid, p_kit jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version integer;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if not exists (select 1 from public.card_definitions where id = p_definition) then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  if jsonb_typeof(p_kit) is distinct from 'object'
     or exists (
       select 1 from unnest(array['base', 'special', 'supreme']) as s(slot)
       where jsonb_typeof(p_kit -> s.slot) is distinct from 'object'
          or jsonb_typeof(p_kit -> s.slot -> 'effects') is distinct from 'array'
          or (p_kit -> s.slot ->> 'slot') is distinct from s.slot
     ) then
    raise exception 'invalid_kit' using errcode = '22023';
  end if;
  insert into public.combat_kits as k (definition_id, kit, updated_by)
  values (p_definition, p_kit, auth.uid())
  on conflict (definition_id) do update
    set kit = excluded.kit, version = k.version + 1, updated_at = now(), updated_by = auth.uid()
  returning version into v_version;
  return v_version;
end;
$$;

-- Takes a character's kit away: it can no longer be fielded in the Scontro a squadre.
create function public.admin_delete_combat_kit(p_definition uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  delete from public.combat_kits where definition_id = p_definition;
  return found;
end;
$$;

revoke execute on function public.admin_combat_kits() from public, anon;
revoke execute on function public.admin_save_combat_kit(uuid, jsonb) from public, anon;
revoke execute on function public.admin_delete_combat_kit(uuid) from public, anon;
grant execute on function public.admin_combat_kits() to authenticated;
grant execute on function public.admin_save_combat_kit(uuid, jsonb) to authenticated;
grant execute on function public.admin_delete_combat_kit(uuid) to authenticated;
