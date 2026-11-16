-- Every exact power (same power_code and power_params) on at most one Hero, one Villain
-- and one Neutral (the user's rule of 16 November 2026). 73 cards change: 39 keep their
-- power with other numbers, 34 take a variant with a new condition. In each group the
-- card with the most copies owned kept the power as it was. Analysis and simulations:
-- docs/POWERS-BACKLOG.md ("Poteri tutti diversi").
--
-- The variants keep the name of their power (Legame, Riscossa, Implacabile…): the
-- player sees the same name with another text. The rules engine knows all of them;
-- this migration adds them to the catalog, gives them to the cards, and teaches the
-- server what the variants of Spia, Veggente and Annullatore show and switch off.

-- ---------------------------------------------------------------------------
-- The new powers
-- ---------------------------------------------------------------------------

insert into public.power_definitions (code, name, tier, description_template, required_params) values
  ('round_exact', 'Ultimo baluardo', 'simple',
   '+{bonus} se giocato nel round {round}', array['bonus', 'round']),
  ('bond_threshold', 'Legame', 'simple',
   '+{bonus} se in squadra ci sono almeno {min_allies} altri personaggi della sua fazione', array['bonus', 'min_allies']),
  ('bond_relay', 'Legame', 'simple',
   '+{bonus} se il personaggio che hai giocato nel round prima è della sua fazione', array['bonus']),
  ('bond_played', 'Legame', 'simple',
   '+{bonus} per ogni personaggio della sua fazione che hai già giocato', array['bonus']),
  ('bond_unplayed', 'Legame', 'simple',
   '+{bonus} per ogni altro personaggio della sua fazione che non hai ancora giocato', array['bonus']),
  ('relentless_small', 'Implacabile', 'simple',
   'Vince il round in caso di parità di punteggio, e contro Minacce fino al livello {max_level} anche perdendo di {margin}',
   array['margin', 'max_level']),
  ('relentless_big', 'Implacabile', 'simple',
   'Vince il round in caso di parità di punteggio, e contro Minacce dal livello {from_level} in su anche perdendo di {margin}',
   array['margin', 'from_level']),
  ('relentless_behind', 'Implacabile', 'simple',
   'Vince il round in caso di parità di punteggio, e se sei in svantaggio anche perdendo di {margin}', array['margin']),
  ('nemesis_other', 'Nemesi', 'simple',
   '+{bonus} se il personaggio avversario è di un''altra fazione (anche Neutrale)', array['bonus']),
  ('rival', 'Nemesi', 'simple',
   '+{bonus} se il personaggio avversario è della sua stessa fazione', array['bonus']),
  ('delayed_nullifier', 'Annullatore', 'simple',
   'Annulla il potere del personaggio che l''avversario gioca nel round dopo', '{}'),
  ('spy_many', 'Spia', 'simple',
   'Dopo averlo giocato, vedi {count} personaggi a caso che l''avversario non ha ancora giocato', array['count']),
  ('spy_rarest', 'Spia', 'simple',
   'Dopo averlo giocato, vedi il personaggio più raro che l''avversario non ha ancora giocato', '{}'),
  ('comeback_long', 'Riscossa', 'distinctive',
   'Se perdi questo round, i tuoi due personaggi successivi ottengono +{bonus}', array['bonus']),
  ('comeback_margin', 'Riscossa', 'distinctive',
   'Se perdi questo round, il tuo prossimo personaggio ottiene i punti di scarto, fino a +{max}', array['max']),
  ('underdog_per_round', 'Sfavorito', 'distinctive',
   '+{bonus} per ogni round di svantaggio', array['bonus']),
  ('underdog_wall', 'Sfavorito', 'distinctive',
   '+{bonus} se l''avversario ha già vinto almeno {min_wins} round', array['bonus', 'min_wins']),
  ('underdog_points', 'Sfavorito', 'distinctive',
   '+{bonus} se finora l''avversario ha fatto più punti di te', array['bonus']),
  ('sabotage_big', 'Sabotatore', 'distinctive',
   '-{malus} a ogni abilità del personaggio avversario in questo round, contro Minacce dal livello {from_level} in su',
   array['malus', 'from_level']),
  ('sabotage_flat', 'Sabotatore', 'distinctive',
   '-{malus} al punteggio del personaggio avversario in questo round (non allo spareggio)', array['malus']),
  ('foresight_short', 'Veggente', 'distinctive',
   'Dopo averlo giocato, vedi le Minacce dei {count} round successivi', array['count']);

-- ---------------------------------------------------------------------------
-- The 73 cards
-- ---------------------------------------------------------------------------

update public.card_definitions c
set power_code = v.power_code, power_params = v.power_params::jsonb
from (values
  -- Ultimo baluardo +3 dal round 4: restano Plinth (E), Gavel (C), Cerbero (N).
  ('P126', 'last_stand', '{"bonus": 2, "min_round": 3}'),                     -- Overdue
  ('P198', 'round_exact', '{"bonus": 4, "round": 4}'),                        -- Wick
  ('P025', 'last_stand', '{"bonus": 3, "min_round": 5}'),                     -- Bulwark
  ('P100', 'last_stand', '{"bonus": 2, "min_round": 4}'),                     -- Retrograde
  ('P140', 'last_stand', '{"bonus": 5, "min_round": 5}'),                     -- Vulnerary
  ('P171', 'last_stand', '{"bonus": 4, "min_round": 5}'),                     -- Leeward
  ('P211', 'last_stand', '{"bonus": 2, "min_round": 3}'),                     -- Inhumer
  -- Apripista +3 entro il round 2: restano Milewright (E), Rubicon (C), Postmark (N).
  ('P097', 'opener', '{"bonus": 4, "max_round": 1}'),                         -- Sextant
  ('P109', 'opener', '{"bonus": 2, "max_round": 3}'),                         -- Parallasse
  ('P162', 'opener', '{"bonus": 3, "max_round": 1}'),                         -- Praecursor
  ('P129', 'opener', '{"bonus": 5, "max_round": 1}'),                         -- Bubalus
  ('P172', 'opener', '{"bonus": 2, "max_round": 2}'),                         -- Portitor
  ('P210', 'opener', '{"bonus": 4, "max_round": 1}'),                         -- Tenant
  -- Legame +1: restano Sampler (E), Swarf (C), Histrio (N).
  ('P045', 'bond_threshold', '{"bonus": 3, "min_allies": 2}'),                -- Apostate
  ('P035', 'bond_relay', '{"bonus": 3}'),                                     -- Ambit
  ('P173', 'bond_threshold', '{"bonus": 4, "min_allies": 3}'),                -- Sanctuary
  ('P127', 'bond_played', '{"bonus": 2}'),                                    -- Stentore
  ('P137', 'bond_unplayed', '{"bonus": 2}'),                                  -- Collegium
  ('P046', 'bond_threshold', '{"bonus": 3, "min_allies": 2}'),                -- Larceny
  ('P212', 'bond_threshold', '{"bonus": 3, "min_allies": 2}'),                -- Warren
  -- Riscossa +2 (Alfa): restano Moth (E), Vetrix (C), Harrow (N).
  ('P055', 'comeback', '{"bonus": 3}'),                                       -- Keelstone
  ('P141', 'comeback', '{"bonus": 4}'),                                       -- Palladium
  ('P183', 'comeback_long', '{"bonus": 1}'),                                  -- Mainstay
  ('P091', 'comeback_long', '{"bonus": 2}'),                                  -- Talos
  ('P213', 'comeback_margin', '{"max": 4}'),                                  -- Unbidden
  -- Riscossa +3 (Omega): restano Multitude (C), Holdout (N).
  ('P217', 'comeback', '{"bonus": 4}'),                                       -- Novenarium
  ('P132', 'comeback_margin', '{"max": 5}'),                                  -- Wirepuller
  ('P104', 'comeback_long', '{"bonus": 2}'),                                  -- Aion
  ('P186', 'comeback_margin', '{"max": 4}'),                                  -- Mordacchia
  -- Sfavorito +3 (Omega): restano Absentia (E), Re Tifeo (C), Ordito (N).
  ('P060', 'underdog', '{"bonus": 4}'),                                       -- Mongibello
  ('P114', 'underdog_per_round', '{"bonus": 2}'),                             -- Perpetuum
  ('P187', 'underdog', '{"bonus": 4}'),                                       -- Ansa
  ('P142', 'underdog_per_round', '{"bonus": 2}'),                             -- Parabellum
  ('P216', 'underdog_wall', '{"bonus": 4, "min_wins": 2}'),                   -- Prosody
  ('P092', 'underdog_points', '{"bonus": 3}'),                                -- Cariddi
  -- Implacabile: restano Truss (E), Lamprey (C), Zeta Rax (N).
  ('P073', 'relentless_small', '{"margin": 1, "max_level": 2}'),              -- Collateral
  ('P204', 'relentless_big', '{"margin": 2, "from_level": 5}'),               -- Deadweight
  ('P029', 'relentless_small', '{"margin": 1, "max_level": 2}'),              -- Malleus
  ('P139', 'relentless_big', '{"margin": 2, "from_level": 5}'),               -- Herma
  ('P175', 'relentless_behind', '{"margin": 1}'),                             -- Eudaemon
  -- Terreno favorevole +2 (livelli 1-2): restano Parley (E), Hospes (C), Pentimento (N).
  ('P043', 'level_bonus', '{"bonus": 3, "min_level": 1, "max_level": 1}'),    -- Fathom
  ('P048', 'level_bonus', '{"bonus": 2, "min_level": 1, "max_level": 3}'),    -- Hapax
  ('P208', 'level_bonus', '{"bonus": 2, "min_level": 2, "max_level": 3}'),    -- Viaticum
  ('P074', 'level_bonus', '{"bonus": 3, "min_level": 5, "max_level": 6}'),    -- Tempestas
  -- Specialità: restano Juncture e Cineris (Energia), Lullaby e Vulgate (Psiche),
  -- Facsimile e Necropsy (Intelletto), Gridwitch ed Escrow (Magia).
  ('P033', 'ability_bonus', '{"ability": "ENE", "bonus": 3}'),                -- Cathode
  ('P069', 'ability_bonus', '{"ability": "ENE", "bonus": 4}'),                -- Noctiluca
  ('P207', 'ability_bonus', '{"ability": "RES", "bonus": 2}'),                -- Tribune
  ('P108', 'ability_bonus', '{"ability": "TEC", "bonus": 2}'),                -- Semaphore
  ('P201', 'ability_bonus', '{"ability": "RES", "bonus": 2}'),                -- Affissione
  ('P072', 'ability_bonus', '{"ability": "PSI", "bonus": 3}'),                -- Tacet
  ('P031', 'ability_bonus', '{"ability": "INT", "bonus": 3}'),                -- Byline
  ('P163', 'ability_bonus', '{"ability": "INT", "bonus": 2}'),                -- Refector
  -- Tuttofare, Davide, Crescendo, Affinità.
  ('P165', 'all_rounder', '{"bonus": 4, "min_value": 6}'),                    -- Interpres
  ('P203', 'all_rounder', '{"bonus": 2, "min_value": 4}'),                    -- Monopsony
  ('P206', 'giant_slayer', '{"bonus": 2, "min_gap": 1}'),                     -- Penates
  ('P177', 'crescendo', '{"bonus": 4}'),                                      -- Holloway
  ('P120', 'crescendo', '{"bonus": 2}'),                                      -- Xenolith
  ('P174', 'family_bonus', '{"bonus": 3, "family": "mind", "min_count": 2}'), -- Noophage
  ('P160', 'family_bonus', '{"bonus": 4, "family": "mind", "min_count": 2}'), -- Theriarch
  -- Nemesi +3: restano Aerie (E), Contumax (C).
  ('P044', 'nemesis', '{"bonus": 4}'),                                        -- Kiln
  ('P076', 'nemesis_other', '{"bonus": 2}'),                                  -- Errata
  ('P209', 'rival', '{"bonus": 3}'),                                          -- Emendatio
  -- Annullatore, Schermato, Spia, Veggente, Sabotatore, Slancio.
  ('P179', 'delayed_nullifier', '{}'),                                        -- Injunction
  ('P136', 'shielded', '{"bonus": 2}'),                                       -- Indemnity
  ('P047', 'spy_many', '{"count": 2}'),                                       -- Actuary
  ('P128', 'spy_many', '{"count": 2}'),                                       -- Bisque
  ('P159', 'spy_rarest', '{}'),                                               -- Erasure
  ('P215', 'foresight_short', '{"count": 2}'),                                -- Contromano
  ('P180', 'foresight_short', '{"count": 2}'),                                -- Groma
  ('P131', 'sabotage_big', '{"malus": 1, "from_level": 3}'),                  -- Mischance
  ('P056', 'sabotage_big', '{"malus": 1, "from_level": 3}'),                  -- Mekana
  ('P214', 'sabotage_flat', '{"malus": 2}'),                                  -- Clementia
  ('P182', 'momentum', '{"bonus": 3}')                                        -- Quarantine
) as v(code, power_code, power_params)
where c.code = v.code;

-- The rule, kept by the database for every character added from now on: an exact power
-- (code and params; jsonb compares by content) on at most one card per faction.
create unique index card_definitions_one_power_per_faction
  on public.card_definitions (power_code, power_params, faction)
  where power_code is not null;

-- ---------------------------------------------------------------------------
-- Annullatore ritardato
-- ---------------------------------------------------------------------------

-- Whether the opposing character of the round before, as it played, was an Annullatore
-- ritardato: it takes the power of `p_side`'s character in `p_round`. In the Allarme
-- Triplo the one on the same threat; in the Grande Minaccia the one of the turn before,
-- wherever it went. Not when an Annullatore or Silenzio della tomba stopped it.
create function public.delayed_nullified(p_match_id uuid, p_round integer, p_side text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_other text := case p_side when 'a' then 'b' else 'a' end;
begin
  if p_round <= 1 then
    return false;
  end if;
  return exists (
    select 1
    from public.round_plays s
    join public.matches m on m.id = s.match_id
    join public.round_plays o on o.match_id = s.match_id and o.side <> s.side and o.round = p_round - 1
      and (m.format = 'boss' or o.front_slot is not distinct from s.front_slot)
    join public.card_definitions d on d.id = o.definition_id and d.power_code = 'delayed_nullifier'
    where s.match_id = p_match_id and s.round = p_round and s.side = p_side
  ) and not public.nullified_in_round(p_match_id, p_round - 1, v_other);
end;
$$;

revoke execute on function public.delayed_nullified(uuid, integer, text) from public, anon, authenticated;

-- An opposing Annullatore stops a power on the same front (in a Grande Minaccia also one
-- already standing there), unless the side's own Annullatore ritardato of the round
-- before took the Annullatore's power. Silenzio della tomba stops every power, and an
-- opposing Annullatore ritardato of the round before stops this round's.
create or replace function public.nullified_in_round(p_match_id uuid, p_round integer, p_side text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_other text := case p_side when 'a' then 'b' else 'a' end;
begin
  if coalesce((
    select m.threat_modifiers -> (p_round - 1) ->> 'code' = 'tomb_silence'
    from public.matches m where m.id = p_match_id
  ), false) then
    return true;
  end if;
  if public.delayed_nullified(p_match_id, p_round, p_side) then
    return true;
  end if;
  return exists (
    select 1
    from public.round_plays s
    join public.round_plays o on o.match_id = s.match_id and o.side <> s.side
      and o.front_slot is not distinct from s.front_slot
      and (o.round = s.round or (s.front_slot is not null and o.round < s.round))
    join public.card_definitions d on d.id = o.definition_id and d.power_code = 'nullifier'
    where s.match_id = p_match_id and s.round = p_round and s.side = p_side
      and not (o.round = p_round and public.delayed_nullified(p_match_id, p_round, v_other))
  );
end;
$$;

-- Nebbia stays covered unless its power did not act in that round: an Annullatore of the
-- viewer on the same front, the viewer's Annullatore ritardato of the round before, or
-- Silenzio della tomba.
create or replace function public.fog_hides(p_match_id uuid, p_round integer, p_side text, p_rule_index integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.round_plays o
    join public.card_definitions d on d.id = o.definition_id
    join public.matches m on m.id = o.match_id
    where o.match_id = p_match_id and o.round = p_round and o.side <> p_side
      and d.power_code = 'fog'
      and m.status = 'active'
      and coalesce(m.threat_modifiers -> p_rule_index ->> 'code', '') <> 'tomb_silence'
      -- An Annullatore of the viewer on the same front switches Nebbia off.
      and not exists (
        select 1 from public.round_plays s
        join public.card_definitions sd on sd.id = s.definition_id
        where s.match_id = p_match_id and s.round = p_round and s.side = p_side
          and sd.power_code = 'nullifier'
          and s.front_slot is not distinct from o.front_slot
      )
      -- So does the viewer's Annullatore ritardato of the round before (same threat in the
      -- Allarme Triplo, any front in the Grande Minaccia), unless it was stopped itself.
      and not (
        exists (
          select 1 from public.round_plays s
          join public.card_definitions sd on sd.id = s.definition_id
          where s.match_id = p_match_id and s.round = p_round - 1 and s.side = p_side
            and sd.power_code = 'delayed_nullifier'
            and (m.format = 'boss' or s.front_slot is not distinct from o.front_slot)
        )
        and not public.nullified_in_round(p_match_id, p_round - 1, p_side)
      )
  )
$$;

-- ---------------------------------------------------------------------------
-- Spia: one character at random, two at random, or the rarest
-- ---------------------------------------------------------------------------

-- A Spia that shows two characters writes two rows for its round.
alter table public.spy_reveals drop constraint spy_reveals_pkey;
alter table public.spy_reveals add primary key (match_id, side, round, definition_id);

-- When a round is resolved, every side that played a Spia sees opposing characters not
-- played yet, drawn here so that no client can choose them: one at random (Spia), `count`
-- at random, or the rarest (at random among the rarest). Nothing when an Annullatore
-- faced it, or when the opponent has nobody left to reveal.
create or replace function public.reveal_spied_character()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.spy_reveals (match_id, side, round, definition_id)
  select new.match_id, rp.side, new.round, pick.id
  from public.round_plays rp
  join public.card_definitions d on d.id = rp.definition_id
  cross join lateral (
    select ranked.id
    from (
      select u.id,
             row_number() over (
               order by case when d.power_code = 'spy_rarest' then -r.rank else 0 end, random()
             ) as n
      from public.match_teams t
      cross join unnest(t.definition_ids) as u(id)
      join public.card_definitions c on c.id = u.id
      join public.rarity_definitions r on r.code = c.rarity_code
      where t.match_id = new.match_id and t.side <> rp.side
        and not exists (
          select 1 from public.round_plays o
          where o.match_id = new.match_id and o.side = t.side and o.definition_id = u.id
        )
    ) ranked
    where ranked.n <= case when d.power_code = 'spy_many' then (d.power_params ->> 'count')::integer else 1 end
  ) pick
  where rp.match_id = new.match_id and rp.round = new.round
    and d.power_code in ('spy', 'spy_many', 'spy_rarest')
    and not public.nullified_in_round(new.match_id, new.round, rp.side)
  on conflict do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Veggente for the next rounds only
-- ---------------------------------------------------------------------------

-- The last round a side sees through Veggente for the next rounds: the round it played
-- it plus its `count`; 0 without one, or when an Annullatore stopped it. The Veggente
-- that shows every following round is read by classic_match_state_payload as before.
create function public.short_foresight_until(p_match_id uuid, p_side text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(max(rp.round + (d.power_params ->> 'count')::integer), 0)
  from public.round_plays rp
  join public.card_definitions d on d.id = rp.definition_id
  where rp.match_id = p_match_id and rp.side = p_side and d.power_code = 'foresight_short'
    and not public.nullified_in_round(p_match_id, rp.round, p_side)
$$;

revoke execute on function public.short_foresight_until(uuid, text) from public, anon, authenticated;

-- A classic match payload with the threats the short Veggente shows, shaped like those
-- of the full one, before with_rare_rules reads them (Al buio, Livello ignoto…).
create function public.with_short_foresight(p_payload jsonb, p_match_id uuid, p_side text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  m public.matches;
  v_until integer;
begin
  if p_payload is null or jsonb_array_length(coalesce(p_payload -> 'foreseen_threats', '[]'::jsonb)) > 0 then
    return p_payload;
  end if;
  select * into m from public.matches where id = p_match_id;
  v_until := public.short_foresight_until(p_match_id, p_side);
  if m.id is null or v_until <= m.current_round then
    return p_payload;
  end if;
  return p_payload || jsonb_build_object('foreseen_threats', coalesce((
    select jsonb_agg(jsonb_build_object(
      'round', u.ord, 'level', t.level, 'name', t.name, 'abilities', to_jsonb(t.required_abilities),
      'modifier', m.threat_modifiers -> (u.ord::integer - 1)
    ) order by u.ord)
    from unnest(m.threat_ids) with ordinality as u(id, ord)
    join public.threat_definitions t on t.id = u.id
    where u.ord > m.current_round and u.ord <= v_until
  ), '[]'::jsonb));
end;
$$;

revoke execute on function public.with_short_foresight(jsonb, uuid, text) from public, anon, authenticated;

create or replace function public.match_state_payload(p_match_id uuid, p_side text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_format text := (select format from public.matches where id = p_match_id);
begin
  if v_format = 'boss' then
    return public.with_fog(
      public.with_play_parts(public.boss_state_payload(p_match_id, p_side), p_match_id, p_side),
      p_match_id,
      p_side
    );
  elsif v_format = 'triple' then
    return public.with_fog(
      public.with_triple_districts(
        public.with_triple_play_parts(
          public.with_rare_triple_rules(public.triple_state_payload(p_match_id, p_side), p_match_id),
          p_match_id,
          p_side
        ),
        p_match_id
      ),
      p_match_id,
      p_side
    );
  elsif public.is_quadrant(v_format) then
    return public.quadrant_state_payload(p_match_id, p_side);
  end if;
  return public.with_fog(
    public.with_play_parts(
      public.with_rare_rules(
        public.with_short_foresight(public.classic_match_state_payload(p_match_id, p_side), p_match_id, p_side),
        p_match_id,
        p_side
      ),
      p_match_id,
      p_side
    ),
    p_match_id,
    p_side
  );
end;
$$;

-- Emergenza: the short Veggente shows the threats of its next `count` rounds (and the
-- level of a Livello ignoto among them). The full one is in emergency_state_payload_base.
create or replace function public.emergency_state_payload(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with b as (
    select public.emergency_state_payload_base(p_user) as p
  ), withrules as (
    select case
      when jsonb_typeof(b.p -> 'rules') = 'object'
        then jsonb_set(b.p, '{rules,finish_xp}', to_jsonb(public.config_int('emergency.rewards.finish_xp')))
      else b.p
    end as p
    from b
  ), withxp as (
    select case
      when jsonb_typeof(w.p -> 'run') = 'object' then jsonb_set(w.p, '{run,xp}', to_jsonb(coalesce((
        select r.xp from public.emergency_runs r where r.user_id = p_user and r.day = public.game_day()
      ), 0)))
      else w.p
    end as p
    from withrules w
  ), withparts as (
    select case
      when jsonb_typeof(x.p -> 'run' -> 'plays') is distinct from 'array' then x.p
      else jsonb_set(x.p, '{run,plays}', coalesce((
        select jsonb_agg(
          case when e.parts is not null then pl.value || jsonb_build_object('parts', e.parts) else pl.value end
          order by pl.ordinality)
        from jsonb_array_elements(x.p -> 'run' -> 'plays') with ordinality as pl(value, ordinality)
        left join public.emergency_runs r on r.user_id = p_user and r.day = public.game_day()
        left join public.emergency_plays e on e.run_id = r.id and e.round = (pl.value ->> 'round')::integer
      ), '[]'::jsonb))
    end as p
    from withxp x
  ), short as (
    select coalesce(max(p.round + (c.power_params ->> 'count')::integer), 0) as until
    from public.emergency_plays p
    join public.emergency_runs r on r.id = p.run_id
    join public.card_definitions c on c.id = p.definition_id
    where r.user_id = p_user and r.day = public.game_day() and c.power_code = 'foresight_short'
  ), d as (
    select * from public.emergency_days where day = public.game_day()
  )
  select case
    when jsonb_typeof(w.p -> 'run') is distinct from 'object'
      or w.p -> 'run' ->> 'status' <> 'active'
      or jsonb_array_length(coalesce(w.p -> 'run' -> 'foreseen_threats', '[]'::jsonb)) > 0
      or s.until <= (w.p -> 'run' ->> 'current_round')::integer
      then w.p
    else jsonb_set(
      jsonb_set(w.p, '{run,foreseen_threats}', coalesce((
        select jsonb_agg(jsonb_build_object(
          'round', u.ord,
          'level', d.threat_levels[u.ord],
          'name', t.name,
          'abilities', public.rule_abilities(t.required_abilities, d.threat_modifiers -> (u.ord::integer - 1)),
          'modifier', d.threat_modifiers -> (u.ord::integer - 1),
          'rarity', public.threat_rarity_payload(t.id),
          'target', t.emergency_target
        ) order by u.ord)
        from d, unnest(d.threat_ids) with ordinality as u(id, ord)
        join public.threat_definitions t on t.id = u.id
        where u.ord > (w.p -> 'run' ->> 'current_round')::integer and u.ord <= s.until
      ), '[]'::jsonb)),
      '{threat_levels}',
      coalesce((
        select jsonb_agg(case
          when l.value = 'null'::jsonb and l.ord <= s.until then to_jsonb(d.threat_levels[l.ord::integer])
          else l.value
        end order by l.ord)
        from d, jsonb_array_elements(w.p -> 'threat_levels') with ordinality as l(value, ord)
      ), w.p -> 'threat_levels')
    )
  end
  from withparts w, short s
$$;

-- The Edge Function also needs how far each earlier play was from its target
-- (Riscossa sullo scarto).
create or replace function public.emergency_play_context(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'run', (
      select jsonb_build_object(
        'id', r.id,
        'status', r.status,
        'current_round', r.current_round,
        'card_instance_ids', to_jsonb(r.card_instance_ids),
        'definition_ids', to_jsonb(r.definition_ids)
      )
      from public.emergency_runs r where r.user_id = p_user and r.day = public.game_day()
    ),
    'threat_ids', (select to_jsonb(d.threat_ids) from public.emergency_days d where d.day = public.game_day()),
    'threat_modifiers', (select d.threat_modifiers from public.emergency_days d where d.day = public.game_day()),
    'plays', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'card_instance_id', p.card_instance_id, 'passed', p.passed, 'score', p.score, 'required', p.required_score
      ) order by p.round), '[]'::jsonb)
      from public.emergency_plays p
      join public.emergency_runs r on r.id = p.run_id
      where r.user_id = p_user and r.day = public.game_day()
    )
  )
$$;
