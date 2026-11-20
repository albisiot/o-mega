-- Thirteen powers of 20 November 2026 (SPEC §4.4), ready for characters made for them:
-- no card has them yet. The rules engine (packages/game-engine) scores them; here they get
-- their catalog rows and, for the three that show something, what the server reveals.
--
-- - Presagio (omen): while it is in the team and not played yet, the next round's threat.
-- - Oracolo (oracle): from the start, the threats of the match's highest level (all of them
--   when more than one has it).
-- - Infiltrato (infiltrator): at the start of the match, one opposing character at random,
--   written in spy_reveals with round 0 like a Spia's reveal.
--
-- Presagio and Oracolo also work in the three Emergenze (daily, weekly, challenge), like
-- the Veggente; in the Allarme Triplo and the Grande Minaccia every threat is already
-- visible. In the Emergenze nothing is "opposing": Gemello, Guastafeste, Logoramento and
-- Infiltrato do nothing there.

insert into public.power_definitions (code, name, tier, description_template, required_params) values
  ('attrition', 'Logoramento', 'distinctive',
   'Dopo averlo giocato, il prossimo personaggio dell''avversario ha -{malus} al punteggio (non allo spareggio)', array['malus']),
  ('peak', 'Fuoriclasse', 'simple',
   '+{bonus} se almeno un''abilità richiesta vale 10', array['bonus']),
  ('euphoria', 'Euforia', 'simple',
   '+{bonus} se hai vinto il round precedente', array['bonus']),
  ('away', 'Fuori casa', 'simple',
   '+{bonus} contro le Minacce dei luoghi fuori Nuova Megara', array['bonus']),
  ('twin', 'Gemello', 'simple',
   '+{bonus} se il personaggio avversario ha la sua stessa rarità', array['bonus']),
  ('match_point', 'Colpo di grazia', 'simple',
   '+{bonus} se hai già vinto {min_wins} round', array['bonus', 'min_wins']),
  ('icebreaker', 'Rompighiaccio', 'simple',
   '+{bonus} finché non hai vinto un round', array['bonus']),
  ('even_score', 'Testa a testa', 'simple',
   '+{bonus} se i round vinti sono pari', array['bonus']),
  ('diminuendo', 'Diminuendo', 'simple',
   '+{bonus} se la Minaccia ha un livello più basso di quella del round prima', array['bonus']),
  ('spoiler', 'Guastafeste', 'simple',
   'Il personaggio avversario non riceve i bonus delle carte giocate prima (Riscossa, Slancio, Capobranco, Sacrificio)', array[]::text[]),
  ('omen', 'Presagio', 'distinctive',
   'Finché non l''hai giocato, vedi la Minaccia del round dopo', array[]::text[]),
  ('infiltrator', 'Infiltrato', 'simple',
   'All''inizio della partita vedi un personaggio avversario a caso', array[]::text[]),
  ('oracle', 'Oracolo', 'distinctive',
   'All''inizio della partita vedi la Minaccia di livello più alto', array[]::text[]);

-- ---------------------------------------------------------------------------
-- Presagio and Oracolo in a match
-- ---------------------------------------------------------------------------

-- A classic match payload with the threats the short Veggente, Presagio and Oracolo show,
-- shaped like those of the full Veggente, before with_rare_rules reads them (Al buio,
-- Livello ignoto…). Presagio and Oracolo are never played "against" anything: no
-- Annullatore or Silenzio della tomba stops them. Each threat says which power showed it
-- (`seen_by`, the powers' names: "Presagio", "Veggente e Oracolo"…); the screens read
-- one without it as the Veggente's.
create or replace function public.with_short_foresight(p_payload jsonb, p_match_id uuid, p_side text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  m public.matches;
  v_short integer;
  v_omen integer := 0;
  v_top integer;
begin
  if p_payload is null or jsonb_array_length(coalesce(p_payload -> 'foreseen_threats', '[]'::jsonb)) > 0 then
    return p_payload;
  end if;
  select * into m from public.matches where id = p_match_id;
  if m.id is null then
    return p_payload;
  end if;
  v_short := public.short_foresight_until(p_match_id, p_side);
  if exists (
    select 1
    from public.match_teams t
    cross join unnest(t.definition_ids) as u(id)
    join public.card_definitions c on c.id = u.id
    where t.match_id = p_match_id and t.side = p_side and c.power_code = 'omen'
      and not exists (
        select 1 from public.round_plays rp
        where rp.match_id = p_match_id and rp.side = p_side and rp.definition_id = u.id
      )
  ) then
    v_omen := m.current_round + 1;
  end if;
  if exists (
    select 1
    from public.match_teams t
    cross join unnest(t.definition_ids) as u(id)
    join public.card_definitions c on c.id = u.id
    where t.match_id = p_match_id and t.side = p_side and c.power_code = 'oracle'
  ) then
    v_top := (select max(l) from unnest(m.threat_levels) as l);
  end if;
  if greatest(v_short, v_omen) <= m.current_round and v_top is null then
    return p_payload;
  end if;
  return p_payload || jsonb_build_object('foreseen_threats', coalesce((
    select jsonb_agg(jsonb_build_object(
      'round', u.ord, 'level', t.level, 'name', t.name, 'abilities', to_jsonb(t.required_abilities),
      'modifier', m.threat_modifiers -> (u.ord::integer - 1),
      'seen_by', array_to_string(array[
        case when u.ord <= v_short then (select p.name from public.power_definitions p where p.code = 'foresight_short') end,
        case when u.ord = v_omen then (select p.name from public.power_definitions p where p.code = 'omen') end,
        case when m.threat_levels[u.ord] = v_top then (select p.name from public.power_definitions p where p.code = 'oracle') end
      ], ' e ')
    ) order by u.ord)
    from unnest(m.threat_ids) with ordinality as u(id, ord)
    join public.threat_definitions t on t.id = u.id
    where u.ord > m.current_round
      and (u.ord <= v_short or u.ord = v_omen or m.threat_levels[u.ord] = v_top)
  ), '[]'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- Presagio and Oracolo in the Emergenze
-- ---------------------------------------------------------------------------

-- An Emergenza payload (daily, weekly or challenge: the same shape) with the threats
-- Presagio and Oracolo show added to run.foreseen_threats, and their levels uncovered
-- when Livello ignoto hid them. Only while the run is active; a round already foreseen
-- (Veggente) is not added twice. Each added threat says which power showed it (`seen_by`).
create function public.with_emergency_omens(
  p_payload jsonb,
  p_definition_ids uuid[],
  p_played uuid[],
  p_threat_ids uuid[],
  p_levels integer[],
  p_modifiers jsonb
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with run as (
    select (p_payload -> 'run' ->> 'current_round')::integer as current_round,
           coalesce(p_payload -> 'run' -> 'foreseen_threats', '[]'::jsonb) as foreseen
    where jsonb_typeof(p_payload -> 'run') = 'object' and p_payload -> 'run' ->> 'status' = 'active'
  ), powers as (
    select
      exists (
        select 1 from unnest(p_definition_ids) as u(id)
        join public.card_definitions c on c.id = u.id
        where c.power_code = 'omen' and u.id <> all (coalesce(p_played, '{}'))
      ) as omen,
      case when exists (
        select 1 from unnest(p_definition_ids) as u(id)
        join public.card_definitions c on c.id = u.id
        where c.power_code = 'oracle'
      ) then (select max(l) from unnest(p_levels) as l) end as top
  ), shown as (
    select u.ord::integer as ord, u.id,
           array_to_string(array[
             case when powers.omen and u.ord = run.current_round + 1
               then (select p.name from public.power_definitions p where p.code = 'omen') end,
             case when p_levels[u.ord] = powers.top
               then (select p.name from public.power_definitions p where p.code = 'oracle') end
           ], ' e ') as seen_by
    from run, powers, unnest(p_threat_ids) with ordinality as u(id, ord)
    where u.ord > run.current_round
      and ((powers.omen and u.ord = run.current_round + 1) or p_levels[u.ord] = powers.top)
      and not exists (
        select 1 from jsonb_array_elements(run.foreseen) as f(value)
        where (f.value ->> 'round')::integer = u.ord
      )
  )
  select case
    when not exists (select 1 from shown) then p_payload
    else jsonb_set(
      jsonb_set(p_payload, '{run,foreseen_threats}', (
        select jsonb_agg(e.value order by (e.value ->> 'round')::integer)
        from (
          select f.value from run, jsonb_array_elements(run.foreseen) as f(value)
          union all
          select jsonb_build_object(
            'round', s.ord,
            'level', p_levels[s.ord],
            'name', t.name,
            'abilities', public.rule_abilities(t.required_abilities, p_modifiers -> (s.ord - 1)),
            'modifier', p_modifiers -> (s.ord - 1),
            'rarity', public.threat_rarity_payload(t.id),
            'target', t.emergency_target,
            'seen_by', s.seen_by
          )
          from shown s join public.threat_definitions t on t.id = s.id
        ) e
      )),
      '{threat_levels}',
      -- Every Emergenza payload has threat_levels; jsonb_set would turn a missing one into null.
      coalesce((
        select jsonb_agg(case
          when l.value = 'null'::jsonb and exists (select 1 from shown s where s.ord = l.ord)
            then to_jsonb(p_levels[l.ord::integer])
          else l.value
        end order by l.ord)
        from jsonb_array_elements(p_payload -> 'threat_levels') with ordinality as l(value, ord)
      ), p_payload -> 'threat_levels', '[]'::jsonb)
    )
  end
$$;

revoke execute on function public.with_emergency_omens(jsonb, uuid[], uuid[], uuid[], integer[], jsonb)
  from public, anon, authenticated;

-- The three Emergenze keep their payloads under a new name and gain Presagio and Oracolo
-- on top. Renaming keeps each one's grants; the new ones are revoked like them.
alter function public.emergency_state_payload(uuid) rename to emergency_state_payload_foreseen;

create function public.emergency_state_payload(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.with_emergency_omens(
    public.emergency_state_payload_foreseen(p_user),
    r.definition_ids,
    array(select p.definition_id from public.emergency_plays p where p.run_id = r.id),
    d.threat_ids,
    d.threat_levels,
    d.threat_modifiers
  )
  from (select 1) as one
  left join public.emergency_runs r on r.user_id = p_user and r.day = public.game_day()
  left join public.emergency_days d on d.day = public.game_day()
$$;

revoke execute on function public.emergency_state_payload(uuid) from public, anon, authenticated;
grant execute on function public.emergency_state_payload(uuid) to service_role;

alter function public.emergency_week_state_payload(uuid) rename to emergency_week_state_payload_foreseen;

create function public.emergency_week_state_payload(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.with_emergency_omens(
    public.emergency_week_state_payload_foreseen(p_user),
    r.definition_ids,
    array(select p.definition_id from public.emergency_week_plays p where p.run_id = r.id),
    w.threat_ids,
    w.threat_levels,
    w.threat_modifiers
  )
  from (select 1) as one
  left join public.emergency_week_runs r on r.user_id = p_user and r.week = public.emergency_week_current()
  left join public.emergency_weeks w on w.week = public.emergency_week_current()
$$;

revoke execute on function public.emergency_week_state_payload(uuid) from public, anon, authenticated;
grant execute on function public.emergency_week_state_payload(uuid) to service_role;

alter function public.challenge_emergency_state_payload(uuid, uuid) rename to challenge_emergency_state_payload_foreseen;

create function public.challenge_emergency_state_payload(p_user uuid, p_challenge_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.with_emergency_omens(
    public.challenge_emergency_state_payload_foreseen(p_user, p_challenge_id),
    r.definition_ids,
    array(select p.definition_id from public.challenge_emergency_plays p where p.run_id = r.id),
    w.threat_ids,
    w.threat_levels,
    w.threat_modifiers
  )
  from (select 1) as one
  left join public.challenge_emergency_runs r on r.user_id = p_user and r.challenge_id = p_challenge_id
  left join public.challenge_emergencies w on w.challenge_id = p_challenge_id
$$;

revoke execute on function public.challenge_emergency_state_payload(uuid, uuid) from public, anon, authenticated;
grant execute on function public.challenge_emergency_state_payload(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Infiltrato
-- ---------------------------------------------------------------------------

-- When a match's teams are written, every side with an Infiltrato sees one opposing
-- character at random per Infiltrato, drawn here so that no client can choose it. The
-- reveal has round 0: it comes before any round, and the screens list it with the Spia's
-- ones ("Hai visto: … ha ancora …"). It waits until both teams exist (they are often
-- written by one statement, and this runs after it) and is drawn once per side. Not in
-- the Quadrante, which has its own payload.
create function public.reveal_infiltrated_characters()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_quadrant((select m.format from public.matches m where m.id = new.match_id)) then
    return new;
  end if;
  insert into public.spy_reveals (match_id, side, round, definition_id)
  select new.match_id, own.side, 0, pick.id
  from public.match_teams own
  cross join lateral (
    select count(*)::integer as n
    from unnest(own.definition_ids) as u(id)
    join public.card_definitions c on c.id = u.id
    where c.power_code = 'infiltrator'
  ) infiltrators
  cross join lateral (
    select ranked.id
    from (
      select theirs.id, row_number() over (order by random()) as n
      from (
        select distinct u.id
        from public.match_teams t
        cross join unnest(t.definition_ids) as u(id)
        where t.match_id = new.match_id and t.side <> own.side
      ) theirs
    ) ranked
    where ranked.n <= infiltrators.n
  ) pick
  where own.match_id = new.match_id
    and infiltrators.n > 0
    and not exists (
      select 1 from public.spy_reveals s
      where s.match_id = new.match_id and s.side = own.side and s.round = 0
    )
  on conflict do nothing;
  return new;
end;
$$;

revoke execute on function public.reveal_infiltrated_characters() from public, anon, authenticated;

create trigger match_teams_reveal_infiltrated
  after insert on public.match_teams
  for each row execute function public.reveal_infiltrated_characters();
