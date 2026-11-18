-- Sfide a tema, third stage (SPEC §8.8), on top of 20261118260000_challenges_stage2.sql:
--
-- - the composition of the squad: a rarity budget (the ranks Delta 1 … Omega 5 add up to at
--   most N), the most copies of a rarity, the fewest different factions;
-- - match rules, Classica only: one of the drawn modifiers on every round, only the threats of
--   Nuova Megara or the three of a place in every match, only threats of some levels, rare
--   threats more often (the Edge Function draws the threats, the database writes the modifier);
-- - a squad given by the challenge, the same for every player (Classica against the bots): the
--   player fields characters they may not own, and nothing of theirs is at stake;
-- - its own leaderboard: the most wins in the challenge (an Emergenza: the best run);
-- - an Emergenza a tema: 8 or 10 threats drawn once for the whole challenge, one run per player,
--   the squad within the rules, its leaderboard; its prize targets count the threats passed.

insert into public.game_config (key, value, description) values
  ('challenges.max_rarity_budget', '50', 'Highest rarity budget a Sfida a tema can set (ranks Delta 1 … Omega 5 added up)'),
  ('challenges.max_rare_multiplier', '100', 'Most times as often a Sfida a tema can make rare threats turn up'),
  ('challenges.leaderboard_size', '50', 'Players shown in the leaderboard of a Sfida a tema');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

alter table public.challenges
  add column leaderboard boolean not null default true,
  add column match_rules jsonb not null default '{}'::jsonb,
  add column supplied_team uuid[],
  add column emergency_threats integer check (emergency_threats in (8, 10));

comment on column public.challenges.leaderboard is 'Players see the leaderboard of the challenge: most wins, or the best Emergenza run.';
comment on column public.challenges.match_rules is
  'Classica: {"modifier", "place", "levels", "rare_multiplier"} (challenge_normalize_match_rules).';
comment on column public.challenges.supplied_team is
  'The squad every player fields (definitions), Classica against the bots; null: the player''s own cards.';
comment on column public.challenges.emergency_threats is 'An Emergenza a tema: 8 threats (as the daily one) or 10 (as the weekly one).';

alter table public.challenges drop constraint challenges_format_check;
alter table public.challenges add constraint challenges_format_check check (
  format in ('classic', 'boss', 'triple', 'quadrant', 'quadrant_shifting', 'emergency')
);
-- An Emergenza is played alone: no bot, no online.
alter table public.challenges drop constraint challenges_opponents;
alter table public.challenges add constraint challenges_opponents check (
  bot_difficulties <@ array['easy', 'medium', 'hard', 'super_pro']
  and (cardinality(bot_difficulties) >= 1 or online or format = 'emergency')
);
alter table public.challenges add constraint challenges_emergency_shape check (
  (format = 'emergency') = (emergency_threats is not null)
);

alter table public.challenge_match_terms
  add column match_rules jsonb not null default '{}'::jsonb,
  add column supplied boolean not null default false;

-- The Emergenza of a challenge: drawn by the first player who opens it, the same for everyone.
create table public.challenge_emergencies (
  challenge_id uuid primary key references public.challenges (id) on delete cascade,
  threat_ids uuid[] not null,
  threat_levels integer[] not null,
  threat_modifiers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- The fixed rules of the threats drawn (rare ones), as the daily and the weekly.
create trigger challenge_emergencies_rules
  before insert on public.challenge_emergencies
  for each row execute function public.set_emergency_day_rules();

create table public.challenge_emergency_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  card_instance_ids uuid[] not null,
  definition_ids uuid[] not null,
  status text not null default 'active' check (status in ('active', 'finished')),
  current_round integer not null default 1,
  passed integer not null default 0,
  failed integer not null default 0,
  total_score integer not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint challenge_emergency_runs_finished_shape check ((status = 'finished') = (finished_at is not null)),
  -- One run per player in a challenge.
  unique (user_id, challenge_id)
);

create index challenge_emergency_runs_leaderboard_idx
  on public.challenge_emergency_runs (challenge_id, passed desc, total_score desc, finished_at)
  where status = 'finished';

create table public.challenge_emergency_plays (
  run_id uuid not null references public.challenge_emergency_runs (id) on delete cascade,
  round integer not null check (round >= 1),
  threat_id uuid not null references public.threat_definitions (id),
  card_instance_id uuid not null references public.card_instances (id),
  definition_id uuid not null references public.card_definitions (id),
  base_score integer not null,
  bonus integer not null,
  score integer not null,
  required_score integer not null,
  passed boolean not null,
  parts jsonb,
  created_at timestamptz not null default now(),
  primary key (run_id, round),
  unique (run_id, definition_id)
);

create index challenge_emergency_plays_threat_id_idx on public.challenge_emergency_plays (threat_id);
create index challenge_emergency_plays_card_instance_id_idx on public.challenge_emergency_plays (card_instance_id);
create index challenge_emergency_plays_definition_id_idx on public.challenge_emergency_plays (definition_id);

-- No policies: get_challenges, get_challenge_leaderboard and the Edge Function show what may be seen.
alter table public.challenge_emergencies enable row level security;
alter table public.challenge_emergency_runs enable row level security;
alter table public.challenge_emergency_plays enable row level security;
revoke all on table public.challenge_emergencies, public.challenge_emergency_runs, public.challenge_emergency_plays
  from anon, authenticated;
grant select on table public.challenge_emergencies, public.challenge_emergency_runs, public.challenge_emergency_plays
  to service_role;

-- ---------------------------------------------------------------------------
-- Modes and sizes
-- ---------------------------------------------------------------------------

create or replace function public.challenge_formats()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['classic', 'boss', 'triple', 'quadrant', 'quadrant_shifting', 'emergency']
$$;

-- The squad of a challenge: its mode's, or one character per threat of its Emergenza.
create function public.challenge_size(p_format text, p_emergency_threats integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select case when p_format = 'emergency' then coalesce(p_emergency_threats, 10) else public.team_size_for(p_format) end
$$;

revoke execute on function public.challenge_size(text, integer) from public, anon, authenticated;
-- ---------------------------------------------------------------------------
-- Composition of the squad: rarity budget, most copies of a rarity, fewest factions
-- ---------------------------------------------------------------------------

-- The rules checked and in their one form (same as in 20261118260000_challenges_stage2.sql,
-- with the composition): rarity_budget (null: none) the most the rarity ranks of the squad
-- add up to (Delta 1 … Omega 5); rarity_max {"alfa": 1} the most copies of each listed
-- rarity; min_factions (0: none) the fewest different factions. Raises challenge_invalid_rules.
create or replace function public.challenge_normalize_rules(p_rules jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_lists jsonb := '{}';
  v_key text;
  v_values text[];
  v_min integer;
  v_all boolean;
  v_no_starters boolean;
  v_budget integer;
  v_max jsonb := '{}';
  v_rarity text;
  v_count integer;
  v_factions integer;
begin
  if jsonb_typeof(p_rules) is distinct from 'object' then
    raise exception 'challenge_invalid_rules';
  end if;
  foreach v_key in array array['rarities', 'factions', 'traits', 'variant_styles', 'banned', 'only'] loop
    if p_rules -> v_key is not null and jsonb_typeof(p_rules -> v_key) <> 'array' then
      raise exception 'challenge_invalid_rules';
    end if;
    begin
      v_values := array(
        select distinct v from unnest(public.challenge_rule_list(p_rules, v_key)) as v where v <> '' order by v
      );
    exception when others then
      raise exception 'challenge_invalid_rules';
    end;
    v_lists := v_lists || jsonb_build_object(v_key, to_jsonb(v_values));
  end loop;

  if exists (select 1 from jsonb_array_elements_text(v_lists -> 'rarities') as r
             where not exists (select 1 from public.rarity_definitions x where x.code = r))
     or exists (select 1 from jsonb_array_elements_text(v_lists -> 'factions') as f
                where f not in ('heroes', 'villains', 'neutrals'))
     or exists (select 1 from jsonb_array_elements_text(v_lists -> 'traits') as t
                where not exists (select 1 from public.traits x where x.code = t))
     or exists (select 1 from jsonb_array_elements_text(v_lists -> 'variant_styles') as s
                where not exists (select 1 from public.card_variants x where x.style = s))
     or exists (select 1 from jsonb_array_elements_text((v_lists -> 'banned') || (v_lists -> 'only')) as c
                where not exists (select 1 from public.card_definitions x where x.code = c)) then
    raise exception 'challenge_invalid_rules';
  end if;

  begin
    v_min := coalesce((p_rules ->> 'min_variants')::integer, 0);
    v_all := coalesce((p_rules ->> 'all_variants')::boolean, false);
    v_no_starters := coalesce((p_rules ->> 'no_starters')::boolean, false);
    v_budget := (p_rules ->> 'rarity_budget')::integer;
    v_factions := coalesce((p_rules ->> 'min_factions')::integer, 0);
  exception when others then
    raise exception 'challenge_invalid_rules';
  end;
  if v_min not between 0 and public.config_int('quadrant.deck_size') then
    raise exception 'challenge_invalid_rules';
  end if;
  if v_all then
    v_min := 0;
  end if;
  if not v_all and v_min = 0 then
    v_lists := jsonb_set(v_lists, '{variant_styles}', '[]'::jsonb);
  end if;

  if v_budget is not null and v_budget not between 1 and public.config_int('challenges.max_rarity_budget') then
    raise exception 'challenge_invalid_rules';
  end if;
  if v_factions not between 0 and 3 then
    raise exception 'challenge_invalid_rules';
  end if;
  if p_rules -> 'rarity_max' is not null and jsonb_typeof(p_rules -> 'rarity_max') not in ('object', 'null') then
    raise exception 'challenge_invalid_rules';
  end if;
  for v_rarity in select jsonb_object_keys(coalesce(nullif(p_rules -> 'rarity_max', 'null'::jsonb), '{}'::jsonb)) loop
    if not exists (select 1 from public.rarity_definitions x where x.code = v_rarity) then
      raise exception 'challenge_invalid_rules';
    end if;
    begin
      v_count := (p_rules -> 'rarity_max' ->> v_rarity)::integer;
    exception when others then
      raise exception 'challenge_invalid_rules';
    end;
    if v_count is null or v_count not between 0 and public.config_int('quadrant.deck_size') then
      raise exception 'challenge_invalid_rules';
    end if;
    v_max := v_max || jsonb_build_object(v_rarity, v_count);
  end loop;

  return v_lists || jsonb_build_object(
    'min_variants', v_min, 'all_variants', v_all, 'no_starters', v_no_starters,
    'rarity_budget', v_budget, 'rarity_max', v_max, 'min_factions', v_factions
  );
end;
$$;

-- The composition rule a squad breaks, or null: rarity budget, most copies of a rarity,
-- fewest factions. Definitions, one per fielded copy.
create function public.challenge_composition_problem(p_rules jsonb, p_definition_ids uuid[])
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_budget integer := (p_rules ->> 'rarity_budget')::integer;
  v_factions integer := coalesce((p_rules ->> 'min_factions')::integer, 0);
begin
  if v_budget is not null and (
    select coalesce(sum(r.rank), 0)
    from unnest(p_definition_ids) as u(id)
    join public.card_definitions d on d.id = u.id
    join public.rarity_definitions r on r.code = d.rarity_code
  ) > v_budget then
    return 'challenge_over_budget';
  end if;
  if exists (
    select 1
    from jsonb_each_text(coalesce(nullif(p_rules -> 'rarity_max', 'null'::jsonb), '{}'::jsonb)) as m(rarity, most)
    where (
      select count(*) from unnest(p_definition_ids) as u(id)
      join public.card_definitions d on d.id = u.id
      where d.rarity_code = m.rarity
    ) > m.most::integer
  ) then
    return 'challenge_rarity_limit';
  end if;
  if v_factions > 0 and (
    select count(distinct d.faction) from unnest(p_definition_ids) as u(id)
    join public.card_definitions d on d.id = u.id
  ) < v_factions then
    return 'challenge_too_few_factions';
  end if;
  return null;
end;
$$;

revoke execute on function public.challenge_composition_problem(jsonb, uuid[]) from public, anon, authenticated;

-- Same as in 20261118260000_challenges_stage2.sql, with the composition of the squad and the
-- Emergenza's squads.
create or replace function public.challenge_team_problem(p_rules jsonb, p_format text, p_instance_ids uuid[])
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_variants integer;
begin
  if exists (
    select 1 from public.card_instances i
    where i.id = any (p_instance_ids) and not public.challenge_admits(i.definition_id, p_rules)
  ) then
    return 'challenge_card_not_admitted';
  end if;
  if coalesce((p_rules ->> 'no_starters')::boolean, false) and exists (
    select 1 from public.card_instances i where i.id = any (p_instance_ids) and i.is_starter
  ) then
    return 'challenge_starter_not_allowed';
  end if;
  select count(*) into v_variants
  from public.card_instances i
  where i.id = any (p_instance_ids) and public.challenge_variant_counts(i.variant_id, p_rules);
  -- An Emergenza fields one character per threat: the squad's own size.
  if v_variants < public.challenge_variants_needed(
    p_rules,
    case when p_format = 'emergency' then coalesce(cardinality(p_instance_ids), 0) else public.team_size_for(p_format) end
  ) then
    return 'challenge_variants_required';
  end if;
  return public.challenge_composition_problem(
    p_rules,
    array(select i.definition_id from public.card_instances i where i.id = any (p_instance_ids))
  );
end;
$$;

-- The rarity budget of the cheapest squad the rules leave (null: none fits): the cheapest
-- character of each of the cheapest factions it needs, then the cheapest of the rest, within
-- the most copies of each rarity. A greedy estimate, enough for the editor's check.
create function public.challenge_cheapest_squad(p_rules jsonb, p_size integer)
returns integer
language plpgsql
stable
set search_path = ''
as $$
declare
  v_factions integer := coalesce((p_rules ->> 'min_factions')::integer, 0);
  v_max jsonb := coalesce(nullif(p_rules -> 'rarity_max', 'null'::jsonb), '{}'::jsonb);
  v_taken uuid[] := '{}';
  v_used jsonb := '{}';
  v_total integer := 0;
  v_card record;
begin
  -- First the cheapest character of the cheapest factions, as many factions as asked.
  for v_card in
    select * from (
      select distinct on (d.faction) d.id, d.faction, d.rarity_code, r.rank
      from public.card_definitions d
      join public.rarity_definitions r on r.code = d.rarity_code
      where d.is_active and d.unlock_level is null and public.challenge_admits(d.id, p_rules)
        and coalesce((v_max ->> d.rarity_code)::integer, 1000) > 0
      order by d.faction, r.rank, d.id
    ) as cheapest
    order by cheapest.rank, cheapest.faction
    limit v_factions
  loop
    v_taken := v_taken || v_card.id;
    v_used := v_used || jsonb_build_object(v_card.rarity_code, coalesce((v_used ->> v_card.rarity_code)::integer, 0) + 1);
    v_total := v_total + v_card.rank;
  end loop;
  if cardinality(v_taken) < v_factions then
    return null;
  end if;
  -- Then the cheapest of the rest, within the most copies of each rarity.
  for v_card in
    select d.id, d.rarity_code, r.rank
    from public.card_definitions d
    join public.rarity_definitions r on r.code = d.rarity_code
    where d.is_active and d.unlock_level is null and public.challenge_admits(d.id, p_rules)
      and not d.id = any (v_taken)
    order by r.rank, d.id
  loop
    exit when cardinality(v_taken) >= p_size;
    if coalesce((v_used ->> v_card.rarity_code)::integer, 0) < coalesce((v_max ->> v_card.rarity_code)::integer, 1000) then
      v_taken := v_taken || v_card.id;
      v_used := v_used || jsonb_build_object(v_card.rarity_code, coalesce((v_used ->> v_card.rarity_code)::integer, 0) + 1);
      v_total := v_total + v_card.rank;
    end if;
  end loop;
  if cardinality(v_taken) < p_size then
    return null;
  end if;
  return v_total;
end;
$$;

revoke execute on function public.challenge_cheapest_squad(jsonb, integer) from public, anon, authenticated;

-- The composition leaves a squad possible: a cheapest squad exists, within the budget.
create function public.challenge_composition_possible(p_rules jsonb, p_size integer)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when (p_rules ->> 'rarity_budget') is null
         and coalesce((p_rules ->> 'min_factions')::integer, 0) = 0
         and coalesce(nullif(p_rules -> 'rarity_max', 'null'::jsonb), '{}'::jsonb) = '{}'::jsonb then true
    else coalesce(
      public.challenge_cheapest_squad(p_rules, p_size) <= coalesce((p_rules ->> 'rarity_budget')::integer, 1000000),
      false
    )
  end
$$;

revoke execute on function public.challenge_composition_possible(jsonb, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Match rules (Classica)
-- ---------------------------------------------------------------------------

-- The match rules checked and in their one form: {"modifier": null | code, "place": null |
-- region, "levels": [1-6, sorted], "rare_multiplier": 1-N}. Only Classica has them; a place
-- and levels do not go together. Raises challenge_invalid_match_rules.
create function public.challenge_normalize_match_rules(p_format text, p_rules jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_rules jsonb := coalesce(nullif(p_rules, 'null'::jsonb), '{}'::jsonb);
  v_modifier text;
  v_place text;
  v_levels integer[];
  v_multiplier integer;
begin
  if jsonb_typeof(v_rules) <> 'object'
     or (v_rules -> 'levels' is not null and jsonb_typeof(v_rules -> 'levels') not in ('array', 'null')) then
    raise exception 'challenge_invalid_match_rules';
  end if;
  begin
    v_modifier := nullif(v_rules ->> 'modifier', '');
    v_place := nullif(v_rules ->> 'place', '');
    v_levels := array(
      select distinct l::integer from jsonb_array_elements_text(coalesce(nullif(v_rules -> 'levels', 'null'::jsonb), '[]'::jsonb)) as l
      order by 1
    );
    v_multiplier := coalesce((v_rules ->> 'rare_multiplier')::integer, 1);
  exception when others then
    raise exception 'challenge_invalid_match_rules';
  end;
  if (v_modifier is not null and v_modifier not in ('focus', 'weak_link', 'hostile_ground', 'underdogs'))
     or (v_place is not null and v_place not in ('megara', 'giza', 'yucatan', 'atlantis', 'arctic', 'japan'))
     or exists (select 1 from unnest(v_levels) as l where l not between 1 and 6)
     or cardinality(v_levels) = 6
     or (v_place is not null and cardinality(v_levels) > 0)
     or v_multiplier not between 1 and public.config_int('challenges.max_rare_multiplier') then
    raise exception 'challenge_invalid_match_rules';
  end if;
  if p_format <> 'classic' and (v_modifier is not null or v_place is not null or cardinality(v_levels) > 0 or v_multiplier > 1) then
    raise exception 'challenge_invalid_match_rules';
  end if;
  return jsonb_build_object('modifier', v_modifier, 'place', v_place, 'levels', to_jsonb(v_levels), 'rare_multiplier', v_multiplier);
end;
$$;

revoke execute on function public.challenge_normalize_match_rules(text, jsonb) from public, anon, authenticated;

-- The challenge's modifier on a round, as draw_threat_modifiers writes a drawn one: Territorio
-- ostile draws its factions; Anello debole needs two required abilities (null below).
create function public.challenge_modifier_entry(p_code text, p_level integer)
returns jsonb
language sql
volatile
set search_path = ''
as $$
  select case p_code
    when 'hostile_ground' then (
      select jsonb_build_object(
        'code', p_code, 'favored', f[1], 'hindered', f[2],
        'bonus', public.config_int('threat_modifiers.hostile_bonus'),
        'malus', public.config_int('threat_modifiers.hostile_malus')
      )
      from (select array(select x from unnest(array['heroes', 'villains', 'neutrals']) as x order by random()) as f) as s
    )
    when 'underdogs' then jsonb_build_object(
      'code', p_code,
      'commonMaxRank', public.config_int('threat_modifiers.underdog_common_max_rank'),
      'eliteMinRank', public.config_int('threat_modifiers.underdog_elite_min_rank'),
      'bonus', public.config_int('threat_modifiers.underdog_bonus'),
      'malus', public.config_int('threat_modifiers.underdog_malus')
    )
    when 'weak_link' then case when p_level >= 2 then jsonb_build_object('code', p_code) end
    else jsonb_build_object('code', p_code)
  end
$$;

revoke execute on function public.challenge_modifier_entry(text, integer) from public, anon, authenticated;

-- Same as in 20261118260000_challenges_stage2.sql, with the third stage: the copy keeps the match
-- rules and whether the squad was given; a Classica with a modifier of its own gets it on every
-- round (an update, as the Storia does: a place's or a rare threat's own rule still wins).
create or replace function public.challenge_tag_match(p_match_id uuid, p_challenge public.challenges)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_modifier text := nullif(p_challenge.match_rules ->> 'modifier', '');
begin
  update public.matches
  set challenge_id = p_challenge.id,
      quadrant_seal_target = case when public.is_quadrant(format) and p_challenge.quadrant_seal_target is not null
                                  then p_challenge.quadrant_seal_target else quadrant_seal_target end
  where id = p_match_id;
  insert into public.challenge_match_terms (match_id, challenge_id, version, title, color, rules, event_id, event_points,
                                            match_rules, supplied)
  values (p_match_id, p_challenge.id, p_challenge.version, p_challenge.title, p_challenge.color, p_challenge.rules,
          p_challenge.event_id, p_challenge.event_points, p_challenge.match_rules, p_challenge.supplied_team is not null);
  if v_modifier is not null then
    update public.matches m
    set threat_modifiers = (
      select coalesce(jsonb_agg(coalesce(public.challenge_modifier_entry(v_modifier, t.level), 'null'::jsonb) order by u.ord), '[]'::jsonb)
      from unnest(m.threat_ids) with ordinality as u(id, ord)
      join public.threat_definitions t on t.id = u.id
    )
    where m.id = p_match_id and m.format = 'classic';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- A squad given by the challenge (Classica against the bots)
-- ---------------------------------------------------------------------------

-- The match of match_create_bot, with the challenge's squad on the player's side: definitions
-- only, no card of the player in it (as the bots' side). The bot fields none of those characters.
create function public.challenge_create_supplied_match(
  p_user uuid,
  p_challenge public.challenges,
  p_difficulty text,
  p_bot_definition_ids uuid[],
  p_threat_ids uuid[]
)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_team_size integer := public.config_int('match.team_size');
  v_threats integer := public.config_int('match.threats_per_match');
  v_levels integer[];
  v_match uuid;
begin
  if p_challenge.format <> 'classic' or coalesce(cardinality(p_challenge.supplied_team), 0) <> v_team_size then
    raise exception 'challenge_format_unsupported';
  end if;
  if public.has_active_match(p_user) then
    raise exception 'match_already_active';
  end if;
  if coalesce(cardinality(p_bot_definition_ids), 0) <> v_team_size
     or (select count(distinct d.id) from unnest(p_bot_definition_ids) as d(id)
         join public.card_definitions c on c.id = d.id and c.is_active) <> v_team_size
     or p_bot_definition_ids && p_challenge.supplied_team then
    raise exception 'invalid_bot_team';
  end if;

  select array_agg(t.level order by u.ord) into v_levels
  from unnest(p_threat_ids) with ordinality as u(id, ord)
  join public.threat_definitions t on t.id = u.id and t.is_active;
  if coalesce(cardinality(v_levels), 0) <> v_threats
     or (select count(distinct u.id) from unnest(p_threat_ids) as u(id)) <> v_threats then
    raise exception 'invalid_threats';
  end if;

  insert into public.matches (mode, bot_difficulty, player_a, threat_ids, threat_levels)
  values ('bot', p_difficulty, p_user, p_threat_ids, v_levels)
  returning id into v_match;

  insert into public.match_teams (match_id, side, user_id, card_instance_ids, definition_ids) values
    (v_match, 'a', p_user, null, p_challenge.supplied_team),
    (v_match, 'b', null, null, p_bot_definition_ids);

  insert into public.match_rounds (match_id, round, threat_id, deadline_at)
  values (
    v_match, 1, p_threat_ids[1],
    now() + make_interval(secs => public.config_int('match.reveal_pause_seconds')
                                  + public.config_int('match.round_timer_seconds'))
  );
  return v_match;
end;
$$;

revoke execute on function public.challenge_create_supplied_match(uuid, public.challenges, text, uuid[], uuid[]) from public, anon, authenticated;

-- Same as in 20261118260000_challenges_stage2.sql: a challenge with its own squad creates the
-- match with that squad.
create or replace function public.challenge_create_bot_match(
  p_user uuid,
  p_challenge_id uuid,
  p_difficulty text,
  p_card_instance_ids uuid[],
  p_bot_definition_ids uuid[],
  p_threat_ids uuid[] default null,
  p_boss_values jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_challenge public.challenges;
  v_match uuid;
begin
  perform 1 from public.profiles where id = p_user for update;
  select * into v_challenge from public.challenges where id = p_challenge_id;
  perform public.challenge_check_start(p_user, v_challenge, p_difficulty);

  v_match := case
    when v_challenge.supplied_team is not null then
      public.challenge_create_supplied_match(p_user, v_challenge, p_difficulty, p_bot_definition_ids, p_threat_ids)
    when v_challenge.format = 'classic' then
      public.match_create_bot(p_user, p_difficulty, p_card_instance_ids, p_bot_definition_ids, p_threat_ids)
    when v_challenge.format = 'triple' then
      public.match_create_triple_bot(p_user, p_difficulty, p_card_instance_ids, p_bot_definition_ids, null)
    when v_challenge.format = 'boss' then
      public.match_create_boss_bot(p_user, p_difficulty, p_card_instance_ids, p_bot_definition_ids, p_boss_values)
    when public.is_quadrant(v_challenge.format) then
      public.match_create_quadrant_bot(p_user, p_difficulty, v_challenge.format, p_card_instance_ids, p_bot_definition_ids)
  end;
  if v_match is null then
    raise exception 'challenge_format_unsupported';
  end if;
  perform public.challenge_tag_match(v_match, v_challenge);
  return v_match;
end;
$$;

-- In a match with a given squad the player's cards are definitions: the match screen picks them
-- by that id (the Edge Function's character id), and a played one is found by its definition.
create function public.with_supplied_team(p_payload jsonb, p_match_id uuid, p_side text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case
    when jsonb_typeof(p_payload -> 'my_team') <> 'array' then p_payload
    else jsonb_set(p_payload, '{my_team}', coalesce((
      select jsonb_agg(e.card || jsonb_build_object(
        'instance_id', e.card ->> 'definition_id',
        'played_round', (
          select rp.round from public.round_plays rp
          where rp.match_id = p_match_id and rp.side = p_side
            and rp.definition_id = (e.card ->> 'definition_id')::uuid
        )
      ) order by e.ord)
      from jsonb_array_elements(p_payload -> 'my_team') with ordinality as e(card, ord)
    ), '[]'::jsonb))
  end
$$;

revoke execute on function public.with_supplied_team(jsonb, uuid, text) from public, anon, authenticated;

-- Same as in 20261118250000_challenges.sql, with the given squad.
create or replace function public.with_challenge(p_payload jsonb, p_match_id uuid, p_side text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case when t.match_id is null then p_payload
    else (case when t.supplied then public.with_supplied_team(p_payload, p_match_id, p_side) else p_payload end)
      || jsonb_build_object('challenge', jsonb_build_object(
        'id', t.challenge_id,
        'title', t.title,
        'color', t.color,
        'daily_limit', c.daily_limit,
        'plays_today', public.challenge_plays_today(case p_side when 'a' then m.player_a else m.player_b end, t.challenge_id),
        'supplied', t.supplied
      ))
  end
  from (select 1) as one
  left join public.challenge_match_terms t on t.match_id = p_match_id
  left join public.challenges c on c.id = t.challenge_id
  left join public.matches m on m.id = t.match_id
$$;

-- ---------------------------------------------------------------------------
-- What the Edge Function learns before a match
-- ---------------------------------------------------------------------------

-- Same as in 20261118250000_challenges.sql, with the third stage: the rules (for the bot's
-- composition), the match rules, the given squad and the rarity ranks.
create or replace function public.challenge_bot_context(p_user uuid, p_challenge_id uuid, p_difficulty text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_challenge public.challenges;
begin
  select * into v_challenge from public.challenges where id = p_challenge_id;
  perform public.challenge_check_start(p_user, v_challenge, p_difficulty);
  return jsonb_build_object(
    'format', v_challenge.format,
    'admitted_definition_ids', case when v_challenge.bot_follows_rules and v_challenge.supplied_team is null then (
      select coalesce(jsonb_agg(d.id), '[]'::jsonb)
      from public.card_definitions d
      where d.is_active and d.unlock_level is null and public.challenge_admits(d.id, v_challenge.rules)
    ) end,
    'rules', case when v_challenge.bot_follows_rules then v_challenge.rules else '{}'::jsonb end,
    'match_rules', v_challenge.match_rules,
    'supplied_definition_ids', to_jsonb(v_challenge.supplied_team),
    'rarity_ranks', (select jsonb_object_agg(r.code, r.rank) from public.rarity_definitions r)
  );
end;
$$;

-- Online: the challenge open and played online; its mode and match rules, for the threats.
create function public.challenge_online_context(p_user uuid, p_challenge_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_challenge public.challenges;
begin
  select * into v_challenge from public.challenges where id = p_challenge_id;
  perform public.challenge_check_online(p_user, v_challenge);
  return jsonb_build_object('format', v_challenge.format, 'match_rules', v_challenge.match_rules);
end;
$$;

revoke execute on function public.challenge_online_context(uuid, uuid) from public, anon, authenticated;
grant execute on function public.challenge_online_context(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Emergenza a tema (service only: the Edge Function)
-- ---------------------------------------------------------------------------

-- The game_config prefix of an Emergenza of this size: 8 threats play as the daily one, 10 as
-- the weekly one (their failures and targets).
create function public.challenge_emergency_config(p_threats integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_threats = 8 then 'emergency' else 'emergency_week' end
$$;

revoke execute on function public.challenge_emergency_config(integer) from public, anon, authenticated;

-- The challenge, checked: an Emergenza, open to this player. Raises otherwise.
create function public.challenge_emergency_of(p_user uuid, p_challenge_id uuid)
returns public.challenges
language plpgsql
stable
set search_path = ''
as $$
declare
  v_challenge public.challenges;
begin
  select * into v_challenge from public.challenges where id = p_challenge_id;
  if v_challenge.id is null or v_challenge.format <> 'emergency' then
    raise exception 'challenge_not_found';
  end if;
  perform public.challenge_check_open(p_user, v_challenge);
  return v_challenge;
end;
$$;

revoke execute on function public.challenge_emergency_of(uuid, uuid) from public, anon, authenticated;

-- How many threats the Edge Function draws for it: the challenge open to the player.
create function public.challenge_emergency_info(p_user uuid, p_challenge_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_challenge public.challenges := public.challenge_emergency_of(p_user, p_challenge_id);
begin
  return jsonb_build_object('threats', v_challenge.emergency_threats);
end;
$$;

-- Stores the challenge's threats unless another request was faster: everyone gets the first draw.
create function public.challenge_emergency_ensure(p_challenge_id uuid, p_threat_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_threats integer := (select c.emergency_threats from public.challenges c where c.id = p_challenge_id);
  v_levels integer[];
begin
  if exists (select 1 from public.challenge_emergencies e where e.challenge_id = p_challenge_id) then
    return;
  end if;
  select array_agg(t.level order by u.ord) into v_levels
  from unnest(p_threat_ids) with ordinality as u(id, ord)
  join public.threat_definitions t on t.id = u.id and t.is_active;
  if v_threats is null or coalesce(cardinality(v_levels), 0) <> v_threats
     or (select count(distinct u.id) from unnest(p_threat_ids) as u(id)) <> v_threats then
    raise exception 'invalid_threats';
  end if;
  insert into public.challenge_emergencies (challenge_id, threat_ids, threat_levels)
  values (p_challenge_id, p_threat_ids, v_levels)
  on conflict (challenge_id) do nothing;
end;
$$;

-- Fields the squad for the player's run: their own characters, one per threat, within the
-- challenge's rules. As in the other Emergenze the cards stay free for other matches.
create function public.challenge_emergency_start(p_user uuid, p_challenge_id uuid, p_card_instance_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_challenge public.challenges;
  v_size integer;
  v_definitions uuid[];
  v_problem text;
  v_run uuid;
begin
  perform 1 from public.profiles where id = p_user for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  v_challenge := public.challenge_emergency_of(p_user, p_challenge_id);
  if exists (select 1 from public.challenge_emergency_runs where user_id = p_user and challenge_id = p_challenge_id) then
    raise exception 'challenge_emergency_already_played';
  end if;
  select cardinality(e.threat_ids) into v_size from public.challenge_emergencies e where e.challenge_id = p_challenge_id;
  if v_size is null then
    raise exception 'emergency_not_ready';
  end if;

  if coalesce(cardinality(p_card_instance_ids), 0) <> v_size then
    raise exception 'invalid_emergency_week_squad' using errcode = '22023';
  end if;
  if (select count(distinct u.id) from unnest(p_card_instance_ids) as u(id)) <> v_size then
    raise exception 'duplicate_card' using errcode = '22023';
  end if;
  select array_agg(i.definition_id order by u.ord) into v_definitions
  from unnest(p_card_instance_ids) with ordinality as u(id, ord)
  join public.card_instances i on i.id = u.id and i.owner_id = p_user;
  if coalesce(cardinality(v_definitions), 0) <> v_size then
    raise exception 'card_not_owned' using errcode = '22023';
  end if;
  if (select count(distinct d.id) from unnest(v_definitions) as d(id)) <> v_size then
    raise exception 'duplicate_character' using errcode = '22023';
  end if;
  v_problem := public.challenge_team_problem(v_challenge.rules, 'emergency', p_card_instance_ids);
  if v_problem is not null then
    raise exception '%', v_problem;
  end if;

  insert into public.challenge_emergency_runs (user_id, challenge_id, card_instance_ids, definition_ids)
  values (p_user, p_challenge_id, p_card_instance_ids, v_definitions)
  returning id into v_run;
  return v_run;
end;
$$;

-- The player's run, for the Edge Function to score a play (as emergency_week_play_context).
create function public.challenge_emergency_play_context(p_user uuid, p_challenge_id uuid)
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
      from public.challenge_emergency_runs r where r.user_id = p_user and r.challenge_id = p_challenge_id
    ),
    'threat_ids', (select to_jsonb(e.threat_ids) from public.challenge_emergencies e where e.challenge_id = p_challenge_id),
    'threat_modifiers', (select e.threat_modifiers from public.challenge_emergencies e where e.challenge_id = p_challenge_id),
    'plays', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'card_instance_id', p.card_instance_id, 'passed', p.passed, 'score', p.score, 'required', p.required_score
      ) order by p.round), '[]'::jsonb)
      from public.challenge_emergency_plays p
      join public.challenge_emergency_runs r on r.id = p.run_id
      where r.user_id = p_user and r.challenge_id = p_challenge_id
    )
  )
$$;

-- What the player may see of the challenge's Emergenza, in the shape of the weekly one
-- (emergency_week_state_payload): the levels always, the threats once reached or foreseen. No
-- coins along the run: the challenge's prize counts the threats passed.
create function public.challenge_emergency_state_payload(p_user uuid, p_challenge_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with c as (
    select * from public.challenges where id = p_challenge_id
  ), w as (
    select * from public.challenge_emergencies where challenge_id = p_challenge_id
  ), r as (
    select * from public.challenge_emergency_runs where user_id = p_user and challenge_id = p_challenge_id
  ), seen as (
    select case
      when exists (
        select 1 from public.challenge_emergency_plays p
        join public.card_definitions d on d.id = p.definition_id
        join r on r.id = p.run_id
        where d.power_code = 'foresight'
      ) then 1000
      else coalesce((
        select max(p.round + (d.power_params ->> 'count')::integer)
        from public.challenge_emergency_plays p
        join public.card_definitions d on d.id = p.definition_id
        join r on r.id = p.run_id
        where d.power_code = 'foresight_short'
      ), 0)
    end as until
  )
  select jsonb_build_object(
    'challenge', (select jsonb_build_object('id', c.id, 'title', c.title, 'color', c.color, 'ends_at', c.ends_at,
                                            'leaderboard', c.leaderboard) from c),
    'day', public.game_day(),
    'ends_at', (select c.ends_at from c),
    'server_now', now(),
    'threat_levels', (
      select jsonb_agg(case
        when w.threat_modifiers -> (u.ord::integer - 1) ->> 'code' = 'unknown_level'
             and u.ord > coalesce((select r.current_round from r), 0)
             and u.ord > (select s.until from seen s)
          then null
        else to_jsonb(u.level)
      end order by u.ord)
      from w, unnest(w.threat_levels) with ordinality as u(level, ord)
    ),
    'threat_rarities', (
      select jsonb_agg(public.threat_rarity_payload(u.id) order by u.ord)
      from w, unnest(w.threat_ids) with ordinality as u(id, ord)
    ),
    'rules', (
      select jsonb_build_object(
        'threats_per_run', coalesce((select cardinality(w.threat_ids) from w), c.emergency_threats),
        'max_failures', public.config_int(public.challenge_emergency_config(c.emergency_threats) || '.max_failures'),
        'targets', (
          select jsonb_object_agg(l.level, public.config_int(
            format('%s.targets.level%s', public.challenge_emergency_config(c.emergency_threats), l.level)
          ))
          from generate_series(1, 6) as l(level)
        ),
        'rewards', '[]'::jsonb,
        'finish_xp', 0
      )
      from c
    ),
    'run', (
      select jsonb_build_object(
        'id', r.id,
        'status', r.status,
        'current_round', r.current_round,
        'passed', r.passed,
        'failed', r.failed,
        'total_score', r.total_score,
        'coins', 0,
        'xp', 0,
        'squad', (
          select jsonb_agg(public.card_payload(u.definition_id, u.instance_id) || jsonb_build_object(
            'instance_id', u.instance_id,
            'played_round', (
              select p.round from public.challenge_emergency_plays p
              where p.run_id = r.id and p.definition_id = u.definition_id
            )
          ) order by u.ord)
          from unnest(r.card_instance_ids, r.definition_ids) with ordinality as u(instance_id, definition_id, ord)
        ),
        'plays', coalesce((
          select jsonb_agg(jsonb_build_object(
            'round', p.round,
            'level', coalesce(w.threat_levels[p.round], t.level),
            'modifier', w.threat_modifiers -> (p.round - 1),
            'rarity', public.threat_rarity_payload(t.id),
            'threat', jsonb_build_object(
              'name', t.name,
              'abilities', public.rule_abilities(t.required_abilities, w.threat_modifiers -> (p.round - 1)),
              'flavor', t.flavor
            ),
            'instance_id', p.card_instance_id,
            'definition_id', p.definition_id,
            'base', p.base_score,
            'bonus', p.bonus,
            'score', p.score,
            'required', p.required_score,
            'passed', p.passed
          ) || case when p.parts is not null then jsonb_build_object('parts', p.parts) else '{}'::jsonb end
          order by p.round)
          from public.challenge_emergency_plays p
          join public.threat_definitions t on t.id = p.threat_id
          cross join w
          where p.run_id = r.id
        ), '[]'::jsonb),
        'current_threat', case when r.status = 'active' then (
          select jsonb_build_object(
            'round', r.current_round,
            'id', t.id,
            'level', w.threat_levels[r.current_round],
            'name', t.name,
            'abilities', case when w.threat_modifiers -> (r.current_round - 1) ->> 'code' = 'blind' then '[]'::jsonb
              else public.rule_abilities(t.required_abilities, w.threat_modifiers -> (r.current_round - 1)) end,
            'hidden', coalesce(w.threat_modifiers -> (r.current_round - 1) ->> 'code' = 'blind', false),
            'modifier', public.visible_modifier(
              w.threat_modifiers -> (r.current_round - 1),
              coalesce(w.threat_modifiers -> (r.current_round - 1) ->> 'code' = 'blind', false)
            ),
            'rarity', public.threat_rarity_payload(t.id),
            'target', t.emergency_target,
            'flavor', t.flavor
          )
          from w join public.threat_definitions t on t.id = w.threat_ids[r.current_round]
        ) end,
        'foreseen_threats', case when r.status = 'active' then (
          select coalesce(jsonb_agg(jsonb_build_object(
            'round', u.ord,
            'level', w.threat_levels[u.ord],
            'name', t.name,
            'abilities', public.rule_abilities(t.required_abilities, w.threat_modifiers -> (u.ord::integer - 1)),
            'modifier', w.threat_modifiers -> (u.ord::integer - 1),
            'rarity', public.threat_rarity_payload(t.id),
            'target', t.emergency_target
          ) order by u.ord), '[]'::jsonb)
          from w, unnest(w.threat_ids) with ordinality as u(id, ord)
          join public.threat_definitions t on t.id = u.id
          where u.ord > r.current_round and u.ord <= (select s.until from seen s)
        ) else '[]'::jsonb end
      )
      from r
    )
  )
$$;

-- Stores a play scored by the engine and ends the run when it is over; at the end, the prize
-- targets reached (threats passed). Then the state. Under Rovescio a threat is passed at or
-- under its target. The challenge must still be running.
create function public.challenge_emergency_record_play(
  p_user uuid,
  p_challenge_id uuid,
  p_round integer,
  p_card_instance_id uuid,
  p_base integer,
  p_bonus integer,
  p_score integer,
  p_required integer,
  p_parts jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_challenge public.challenges;
  v_run public.challenge_emergency_runs;
  v_emergency public.challenge_emergencies;
  v_position integer;
  v_definition uuid;
  v_passed boolean;
  v_total_passed integer;
  v_total_failed integer;
  v_finished boolean;
  v_tier public.challenge_tiers;
begin
  select * into v_challenge from public.challenges where id = p_challenge_id;
  if v_challenge.id is null or v_challenge.format <> 'emergency' then
    raise exception 'challenge_not_found';
  end if;
  if now() >= v_challenge.ends_at then
    raise exception 'challenge_closed';
  end if;
  select * into v_run from public.challenge_emergency_runs
  where user_id = p_user and challenge_id = p_challenge_id
  for update;
  if v_run.id is null then
    raise exception 'challenge_emergency_not_started';
  end if;
  if v_run.status <> 'active' then
    raise exception 'challenge_emergency_already_played';
  end if;
  if v_run.current_round <> p_round then
    raise exception 'round_already_resolved';
  end if;

  v_position := array_position(v_run.card_instance_ids, p_card_instance_id);
  if v_position is null then
    raise exception 'character_not_available';
  end if;
  v_definition := v_run.definition_ids[v_position];
  if exists (select 1 from public.challenge_emergency_plays where run_id = v_run.id and definition_id = v_definition) then
    raise exception 'character_already_played';
  end if;
  if p_score <> p_base + p_bonus then
    raise exception 'result_mismatch';
  end if;
  if p_parts is not null and jsonb_typeof(p_parts) <> 'null' and not public.play_parts_valid(p_parts, p_bonus) then
    raise exception 'invalid_play_parts' using errcode = '22023';
  end if;

  select * into v_emergency from public.challenge_emergencies e where e.challenge_id = p_challenge_id;
  v_passed := case
    when v_emergency.threat_modifiers -> (p_round - 1) ->> 'code' = 'reverse' then p_score <= p_required
    else p_score >= p_required
  end;
  insert into public.challenge_emergency_plays (
    run_id, round, threat_id, card_instance_id, definition_id,
    base_score, bonus, score, required_score, passed, parts
  ) values (
    v_run.id, p_round, v_emergency.threat_ids[p_round], p_card_instance_id, v_definition,
    p_base, p_bonus, p_score, p_required, v_passed,
    case when p_parts is null or jsonb_typeof(p_parts) = 'null' then null else p_parts end
  );

  v_total_passed := v_run.passed + v_passed::integer;
  v_total_failed := v_run.failed + (not v_passed)::integer;
  v_finished := p_round >= cardinality(v_emergency.threat_ids)
                or v_total_failed >= public.config_int(public.challenge_emergency_config(v_challenge.emergency_threats) || '.max_failures');

  update public.challenge_emergency_runs
  set passed = v_total_passed,
      failed = v_total_failed,
      total_score = total_score + p_score,
      current_round = case when v_finished then p_round else p_round + 1 end,
      status = case when v_finished then 'finished' else 'active' end,
      finished_at = case when v_finished then now() end
  where id = v_run.id;

  -- The prize: each target asks a number of threats passed in the run.
  if v_finished then
    for v_tier in
      select * from public.challenge_tiers t
      where t.challenge_id = p_challenge_id and t.wins <= v_total_passed
      order by t.tier
    loop
      perform public.grant_challenge_tier(p_user, v_tier);
    end loop;
  end if;

  return public.challenge_emergency_state_payload(p_user, p_challenge_id);
end;
$$;

revoke execute on function public.challenge_emergency_info(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.challenge_emergency_ensure(uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.challenge_emergency_start(uuid, uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.challenge_emergency_play_context(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.challenge_emergency_state_payload(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.challenge_emergency_record_play(uuid, uuid, integer, uuid, integer, integer, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.challenge_emergency_info(uuid, uuid) to service_role;
grant execute on function public.challenge_emergency_ensure(uuid, uuid[]) to service_role;
grant execute on function public.challenge_emergency_start(uuid, uuid, uuid[]) to service_role;
grant execute on function public.challenge_emergency_play_context(uuid, uuid) to service_role;
grant execute on function public.challenge_emergency_state_payload(uuid, uuid) to service_role;
grant execute on function public.challenge_emergency_record_play(uuid, uuid, integer, uuid, integer, integer, integer, integer, jsonb) to service_role;

-- A play also counts for the Bestiario, as in the other Emergenze.
create function public.challenge_emergency_play_sighting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.record_threat_sighting(
    (select r.user_id from public.challenge_emergency_runs r where r.id = new.run_id), new.threat_id, new.created_at
  );
  return new;
end;
$$;

revoke execute on function public.challenge_emergency_play_sighting() from public, anon, authenticated;

create trigger challenge_emergency_plays_sighting
  after insert on public.challenge_emergency_plays
  for each row execute function public.challenge_emergency_play_sighting();

-- ---------------------------------------------------------------------------
-- The leaderboard of a challenge
-- ---------------------------------------------------------------------------

-- The players of a challenge, ranked: by wins (matches finished normally), then whoever got
-- there first; an Emergenza by its runs, as the weekly one ranks them (threats passed, score,
-- who finished first). Only players with a finished match, or a finished run.
create function public.challenge_ranking(p_challenge_id uuid)
returns table (rank integer, players integer, user_id uuid, wins integer, played integer, score integer)
language sql
stable
set search_path = ''
as $$
  with c as (
    select * from public.challenges where id = p_challenge_id
  ), sides as (
    select u.user_id, (m.result = u.side) as won, m.finished_at
    from public.matches m
    cross join lateral (values ('a', m.player_a), ('b', m.player_b)) as u(side, user_id)
    where m.challenge_id = p_challenge_id and m.status = 'finished' and m.end_reason = 'completed'
      and u.user_id is not null
  ), per_player as (
    select s.user_id, count(*) filter (where s.won)::integer as wins, count(*)::integer as played,
           0 as score, coalesce(max(s.finished_at) filter (where s.won), max(s.finished_at)) as reached_at
    from sides s
    where (select c.format from c) <> 'emergency'
    group by s.user_id
    union all
    select r.user_id, r.passed, 1, r.total_score, r.finished_at
    from public.challenge_emergency_runs r
    where r.challenge_id = p_challenge_id and r.status = 'finished'
  )
  select row_number() over (order by p.wins desc, p.score desc, p.reached_at, p.user_id)::integer,
         count(*) over ()::integer,
         p.user_id, p.wins, p.played, p.score
  from per_player p
$$;

revoke execute on function public.challenge_ranking(uuid) from public, anon, authenticated;

-- The leaderboard of a challenge, when it shows one: the first players and the caller's place.
-- Admins see it always, players while the challenge is active (also after its end).
create function public.get_challenge_leaderboard(p_challenge_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_challenge public.challenges;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_challenge from public.challenges where id = p_challenge_id;
  if v_challenge.id is null or (not v_challenge.is_active and not public.is_admin()) or v_challenge.starts_at > now() then
    raise exception 'challenge_not_found';
  end if;
  if not v_challenge.leaderboard and not public.is_admin() then
    raise exception 'challenge_leaderboard_off';
  end if;
  return (
    with ranked as (
      select k.*, pr.username, pr.avatar_url
      from public.challenge_ranking(p_challenge_id) k
      join public.profiles pr on pr.id = k.user_id
    )
    select jsonb_build_object(
      'challenge', jsonb_build_object(
        'id', v_challenge.id, 'title', v_challenge.title, 'color', v_challenge.color, 'format', v_challenge.format,
        'starts_at', v_challenge.starts_at, 'ends_at', v_challenge.ends_at
      ),
      'ended', v_challenge.ends_at <= now(),
      'players', coalesce((select max(r.players) from ranked r), 0),
      'top', coalesce((
        select jsonb_agg(jsonb_build_object(
          'rank', r.rank, 'username', r.username, 'avatar_url', r.avatar_url,
          'wins', r.wins, 'played', r.played, 'score', r.score, 'is_me', r.user_id = v_uid
        ) order by r.rank)
        from ranked r where r.rank <= public.config_int('challenges.leaderboard_size')
      ), '[]'::jsonb),
      'me', (
        select jsonb_build_object(
          'rank', r.rank, 'username', r.username, 'avatar_url', r.avatar_url,
          'wins', r.wins, 'played', r.played, 'score', r.score, 'is_me', true
        )
        from ranked r where r.user_id = v_uid
      )
    )
  );
end;
$$;

revoke execute on function public.get_challenge_leaderboard(uuid) from public, anon;
grant execute on function public.get_challenge_leaderboard(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- What players see
-- ---------------------------------------------------------------------------

-- Same as in 20261118260000_challenges_stage2.sql, with the third stage: the composition (the
-- rarity names of its limits), the match rules, the given squad, the Emergenza (its size and
-- the player's run), the leaderboard switch. With a given squad, every player can play.
create or replace function public.challenge_payload(p_challenge public.challenges, p_user uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_challenge.id,
    'title', p_challenge.title,
    'description', p_challenge.description,
    'color', p_challenge.color,
    'format', p_challenge.format,
    'bot_difficulties', to_jsonb(p_challenge.bot_difficulties),
    'bot_follows_rules', p_challenge.bot_follows_rules,
    'online', p_challenge.online,
    'min_level', p_challenge.min_level,
    'quadrant_seal_target', p_challenge.quadrant_seal_target,
    'rules', p_challenge.rules,
    'admitted', public.event_admitted_description(
      public.challenge_rule_list(p_challenge.rules, 'traits'),
      public.challenge_rule_list(p_challenge.rules, 'rarities'),
      public.challenge_rule_list(p_challenge.rules, 'factions')
    ),
    'banned_names', (
      select coalesce(jsonb_agg(d.name order by d.name), '[]'::jsonb) from public.card_definitions d
      where d.code = any (public.challenge_rule_list(p_challenge.rules, 'banned'))
    ),
    'only_names', (
      select coalesce(jsonb_agg(d.name order by d.name), '[]'::jsonb) from public.card_definitions d
      where d.code = any (public.challenge_rule_list(p_challenge.rules, 'only'))
    ),
    'variant_style_names', (
      select coalesce(jsonb_agg(s.name order by s.name), '[]'::jsonb)
      from (select distinct v.style, v.style_name as name from public.card_variants v
            where v.style = any (public.challenge_rule_list(p_challenge.rules, 'variant_styles'))) s
    ),
    -- The most copies of each limited rarity, by name: [{"code", "name", "max"}].
    'rarity_max_info', (
      select coalesce(jsonb_agg(jsonb_build_object('code', r.code, 'name', r.name, 'max', (m.most)::integer) order by r.rank), '[]'::jsonb)
      from jsonb_each_text(coalesce(nullif(p_challenge.rules -> 'rarity_max', 'null'::jsonb), '{}'::jsonb)) as m(code, most)
      join public.rarity_definitions r on r.code = m.code
    ),
    'match_rules', p_challenge.match_rules,
    'supplied_team', case when p_challenge.supplied_team is not null then (
      select jsonb_agg(public.card_payload(u.id) order by u.ord)
      from unnest(p_challenge.supplied_team) with ordinality as u(id, ord)
    ) end,
    'emergency_threats', p_challenge.emergency_threats,
    'leaderboard', p_challenge.leaderboard,
    'admitted_characters', case when p_challenge.supplied_team is not null then cardinality(p_challenge.supplied_team)
      else (select c.admitted from public.challenge_admitted_counts(p_challenge.rules) c) end,
    'team_size', public.challenge_size(p_challenge.format, p_challenge.emergency_threats),
    'starts_at', p_challenge.starts_at,
    'ends_at', p_challenge.ends_at,
    'daily_limit', p_challenge.daily_limit,
    'plays_today', case when p_user is null then 0 else public.challenge_plays_today(p_user, p_challenge.id) end,
    'my_characters', case
      when p_user is null then null
      when p_challenge.supplied_team is not null then cardinality(p_challenge.supplied_team)
      else (
        select count(distinct i.definition_id) from public.card_instances i
        where i.owner_id = p_user and public.challenge_admits(i.definition_id, p_challenge.rules)
          and (not coalesce((p_challenge.rules ->> 'no_starters')::boolean, false) or not i.is_starter)
      ) end,
    'my_characters_with_variant', case
      when p_user is null then null
      when p_challenge.supplied_team is not null then cardinality(p_challenge.supplied_team)
      else (
        select count(distinct i.definition_id) from public.card_instances i
        where i.owner_id = p_user and public.challenge_variant_counts(i.variant_id, p_challenge.rules)
          and public.challenge_admits(i.definition_id, p_challenge.rules)
      ) end,
    'my_level', case when p_user is not null then (select p.level from public.profiles p where p.id = p_user) end,
    -- An Emergenza: the threats passed in the player's run.
    'my_wins', case
      when p_user is null then 0
      when p_challenge.format = 'emergency' then coalesce((
        select r.passed from public.challenge_emergency_runs r where r.user_id = p_user and r.challenge_id = p_challenge.id
      ), 0)
      else public.challenge_wins(p_user, p_challenge.id) end,
    'my_run', case when p_user is not null and p_challenge.format = 'emergency' then (
      select jsonb_build_object('status', r.status, 'passed', r.passed, 'failed', r.failed, 'total_score', r.total_score,
                                'current_round', r.current_round)
      from public.challenge_emergency_runs r where r.user_id = p_user and r.challenge_id = p_challenge.id
    ) end,
    'tiers', public.challenge_tiers_payload(p_challenge.id, p_user),
    'event', (
      select jsonb_build_object('id', e.id, 'title', e.title, 'starts_at', e.starts_at, 'ends_at', e.ends_at)
      from public.events e where e.id = p_challenge.event_id
    ),
    'event_points', p_challenge.event_points
  )
$$;

-- Same as in 20261118260000_challenges_stage2.sql, with the Emergenza's name in the banner.
create or replace function public.get_challenges()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_challenge public.challenges;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  for v_challenge in
    select * from public.challenges c
    where c.is_active and c.starts_at <= now() and c.ends_at > now()
      and (c.min_level is null or c.min_level <= coalesce((select p.level from public.profiles p where p.id = v_uid), 0))
      and not exists (select 1 from public.challenge_notices n where n.user_id = v_uid and n.challenge_id = c.id)
    order by c.starts_at
  loop
    insert into public.challenge_notices (user_id, challenge_id) values (v_uid, v_challenge.id) on conflict do nothing;
    if found then
      perform public.add_player_notification(
        v_uid,
        'challenge',
        'Nuova Sfida a tema!',
        v_challenge.title || ' · ' || case v_challenge.format
          when 'classic' then 'Classica'
          when 'boss' then 'Grande Minaccia'
          when 'triple' then 'Allarme Triplo'
          when 'emergency' then 'Emergenza'
          else 'Quadrante'
        end,
        jsonb_build_object('challenge_id', v_challenge.id, 'format', v_challenge.format)
      );
    end if;
  end loop;
  return jsonb_build_object(
    'now', now(),
    'challenges', coalesce((
      select jsonb_agg(public.challenge_payload(c, v_uid) order by c.starts_at, c.created_at)
      from public.challenges c
      where c.is_active and c.ends_at > now()
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin functions (each checks is_admin() on the server)
-- ---------------------------------------------------------------------------

-- Same as in 20261118260000_challenges_stage2.sql: an Emergenza counts its runs and their players.
create or replace function public.admin_challenges_payload()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'now', now(),
    'challenges', coalesce((
      select jsonb_agg(
        public.challenge_payload(c, null) || jsonb_build_object(
          'is_active', c.is_active,
          'version', c.version,
          'supplied_codes', case when c.supplied_team is not null then (
            select jsonb_agg(d.code order by u.ord)
            from unnest(c.supplied_team) with ordinality as u(id, ord)
            join public.card_definitions d on d.id = u.id
          ) end,
          'matches', case when c.format = 'emergency'
            then (select count(*) from public.challenge_emergency_runs r where r.challenge_id = c.id)
            else (select count(*) from public.matches m where m.challenge_id = c.id) end,
          'players', case when c.format = 'emergency'
            then (select count(distinct r.user_id) from public.challenge_emergency_runs r where r.challenge_id = c.id)
            else (
              select count(distinct u.id) from public.matches m
              cross join lateral (values (m.player_a), (m.player_b)) as u(id)
              where m.challenge_id = c.id and u.id is not null
            ) end
        )
        order by (c.ends_at <= now()), c.starts_at desc, c.created_at desc
      )
      from public.challenges c
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'title', e.title, 'starts_at', e.starts_at, 'ends_at', e.ends_at)
                       order by e.starts_at)
      from public.events e
      where e.is_active and e.ends_at > now()
    ), '[]'::jsonb),
    'cards', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', d.code,
        'name', d.name,
        'rarity', r.name,
        'rarity_code', d.rarity_code,
        'faction', d.faction,
        'traits', public.card_trait_codes(d.id),
        'variants', (
          select coalesce(jsonb_agg(jsonb_build_object('style', v.style, 'name', v.style_name) order by v.style_name), '[]'::jsonb)
          from public.card_variants v where v.definition_id = d.id and v.is_active
        )
      ) order by d.name), '[]'::jsonb)
      from public.card_definitions d
      join public.rarity_definitions r on r.code = d.rarity_code
      where d.is_active and d.unlock_level is null
    ),
    'variant_styles', (
      select coalesce(jsonb_agg(jsonb_build_object('style', s.style, 'name', s.name, 'characters', s.characters) order by s.name), '[]'::jsonb)
      from (
        select v.style, min(v.style_name) as name, count(distinct v.definition_id) as characters
        from public.card_variants v where v.is_active group by v.style
      ) s
    ),
    'seal_target', jsonb_build_object(
      'min', public.config_int('quadrant.seal_target.min'),
      'max', public.config_int('quadrant.seal_target.max'),
      'suggested', public.config_int('quadrant.seal_target.suggested')
    )
  )
$$;

drop function public.admin_preview_challenge(text, jsonb);

-- Same as in 20261118260000_challenges_stage2.sql, with the Emergenza's size and the composition:
-- whether a squad can keep it, and the budget of the cheapest one.
create function public.admin_preview_challenge(p_format text, p_rules jsonb, p_emergency_threats integer default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rules jsonb;
  v_size integer;
  v_needed integer;
  v_counts record;
  v_ready integer;
  v_no_starters boolean;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if p_format is null or not p_format = any (public.challenge_formats()) then
    raise exception 'challenge_invalid_format';
  end if;
  v_rules := public.challenge_normalize_rules(p_rules);
  v_size := public.challenge_size(p_format, case when p_emergency_threats in (8, 10) then p_emergency_threats end);
  v_needed := public.challenge_variants_needed(v_rules, v_size);
  v_no_starters := coalesce((v_rules ->> 'no_starters')::boolean, false);
  select * into v_counts from public.challenge_admitted_counts(v_rules);

  with admitted as (
    select d.id from public.card_definitions d
    where d.is_active and d.unlock_level is null and public.challenge_admits(d.id, v_rules)
  ),
  owned as (
    select i.owner_id, i.definition_id, bool_or(public.challenge_variant_counts(i.variant_id, v_rules)) as has_variant
    from public.card_instances i
    join admitted a on a.id = i.definition_id
    where i.owner_id is not null and (not v_no_starters or not i.is_starter)
    group by i.owner_id, i.definition_id
  )
  select count(*) into v_ready
  from (
    select o.owner_id from owned o
    group by o.owner_id
    having count(*) >= v_size and count(*) filter (where o.has_variant) >= v_needed
  ) as ready;

  return jsonb_build_object(
    'rules', v_rules,
    'team_size', v_size,
    'variants_needed', v_needed,
    'admitted', v_counts.admitted,
    'admitted_with_variant', v_counts.with_variant,
    'players_ready', v_ready,
    'players_total', (select count(*) from public.profiles),
    'composition_possible', public.challenge_composition_possible(v_rules, v_size),
    'cheapest_budget', public.challenge_cheapest_squad(v_rules, v_size)
  );
end;
$$;

revoke execute on function public.admin_preview_challenge(text, jsonb, integer) from public, anon;
grant execute on function public.admin_preview_challenge(text, jsonb, integer) to authenticated;

-- Same as in 20261118250000_challenges.sql: an Emergenza with runs is in use too.
create or replace function public.admin_delete_challenge(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if exists (select 1 from public.matches m where m.challenge_id = p_id)
     or exists (select 1 from public.challenge_emergency_runs r where r.challenge_id = p_id) then
    raise exception 'challenge_in_use';
  end if;
  delete from public.challenges where id = p_id;
  if not found then
    raise exception 'challenge_not_found';
  end if;
  return public.admin_challenges_payload();
end;
$$;

drop function public.admin_save_challenge(text, text, text, text, text[], boolean, jsonb, timestamp, timestamp, integer, uuid, jsonb, uuid, boolean, integer, integer, jsonb);

-- Same as in 20261118260000_challenges_stage2.sql, with the third stage: the leaderboard switch,
-- the match rules (Classica), a given squad (Classica against the bots: codes, one per place;
-- the squad rules do not apply then), an Emergenza (8 or 10 threats, alone, no event, no matches
-- a day; its prize targets count the threats passed), and the composition of the squad.
create function public.admin_save_challenge(
  p_title text,
  p_description text,
  p_color text,
  p_format text,
  p_bot_difficulties text[],
  p_bot_follows_rules boolean,
  p_rules jsonb,
  p_starts_at timestamp,
  p_ends_at timestamp,
  p_daily_limit integer default null,
  p_event_id uuid default null,
  p_event_points jsonb default null,
  p_id uuid default null,
  p_online boolean default false,
  p_min_level integer default null,
  p_quadrant_seal_target integer default null,
  p_tiers jsonb default '[]',
  p_leaderboard boolean default true,
  p_match_rules jsonb default '{}',
  p_supplied_team text[] default null,
  p_emergency_threats integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_zone text := public.config_text('time.daily_reset_time_zone');
  v_title text := trim(coalesce(p_title, ''));
  v_description text := trim(coalesce(p_description, ''));
  v_color text := lower(trim(coalesce(p_color, '')));
  v_starts timestamptz := p_starts_at at time zone v_zone;
  v_ends timestamptz := p_ends_at at time zone v_zone;
  v_bots text[] := array(
    select d.b from (select distinct b from unnest(coalesce(p_bot_difficulties, '{}')) as b) as d
    order by array_position(array['easy', 'medium', 'hard', 'super_pro'], d.b)
  );
  v_online boolean := coalesce(p_online, false);
  v_emergency boolean := p_format = 'emergency';
  v_threats integer := case when p_format = 'emergency' then p_emergency_threats end;
  v_daily_limit integer := case when p_format = 'emergency' then null else p_daily_limit end;
  v_challenge public.challenges;
  v_started boolean := false;
  v_event public.events;
  v_rules jsonb;
  v_match_rules jsonb;
  v_supplied uuid[];
  v_size integer;
  v_counts record;
  v_points jsonb;
  v_outcome text;
  v_value integer;
  v_id uuid := p_id;
  v_tier jsonb;
  v_index integer := 0;
  v_previous integer := 0;
  v_wins integer;
  v_coins integer;
  v_packs integer;
  v_cards record;
  v_random jsonb;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  -- One save at a time, so two challenges of a mode cannot be made to overlap.
  perform pg_advisory_xact_lock(hashtext('public.challenges'));

  if p_id is not null then
    select * into v_challenge from public.challenges where id = p_id for update;
    if v_challenge.id is null then
      raise exception 'challenge_not_found';
    end if;
    if v_challenge.ends_at <= now() then
      raise exception 'challenge_ended';
    end if;
    v_started := v_challenge.starts_at <= now();
  end if;

  if char_length(v_title) not between 3 and public.config_int('challenges.title_max_length')
     or char_length(v_description) > public.config_int('challenges.description_max_length') then
    raise exception 'challenge_invalid_text';
  end if;

  if v_started then
    -- The end only (and whether the leaderboard shows): later than now, within the longest a
    -- challenge lasts and its event.
    if v_ends is null or v_ends <= now()
       or v_ends - v_challenge.starts_at > make_interval(days => public.config_int('challenges.max_days')) then
      raise exception 'challenge_invalid_period';
    end if;
    if v_challenge.event_id is not null
       and v_ends > (select e.ends_at from public.events e where e.id = v_challenge.event_id) then
      raise exception 'challenge_invalid_event';
    end if;
    if exists (
      select 1 from public.challenges x
      where x.is_active and x.format = v_challenge.format and x.id <> v_challenge.id
        and x.starts_at < v_ends and x.ends_at > v_challenge.starts_at
    ) then
      raise exception 'challenge_overlap';
    end if;
    update public.challenges
    set title = v_title, description = v_description, ends_at = v_ends, leaderboard = coalesce(p_leaderboard, true),
        version = version + 1
    where id = p_id;
    return public.admin_challenges_payload();
  end if;

  if v_color !~ '^#[0-9a-f]{6}$' then
    raise exception 'challenge_invalid_color';
  end if;
  if p_format is null or not p_format = any (public.challenge_formats()) then
    raise exception 'challenge_invalid_format';
  end if;
  if not v_bots <@ array['easy', 'medium', 'hard', 'super_pro']
     or (v_emergency and (cardinality(v_bots) > 0 or v_online))
     or (not v_emergency and cardinality(v_bots) = 0 and not v_online) then
    raise exception 'challenge_invalid_bots';
  end if;
  if v_emergency and (v_threats is null or v_threats not in (8, 10)) then
    raise exception 'challenge_invalid_emergency';
  end if;
  if p_min_level is not null and p_min_level not between 1 and public.config_int('challenges.max_min_level') then
    raise exception 'challenge_invalid_level';
  end if;
  if p_quadrant_seal_target is not null and (
    not public.is_quadrant(p_format)
    or p_quadrant_seal_target not between public.config_int('quadrant.seal_target.min') and public.config_int('quadrant.seal_target.max')
  ) then
    raise exception 'challenge_invalid_seal_target';
  end if;
  v_match_rules := public.challenge_normalize_match_rules(p_format, p_match_rules);
  v_size := public.challenge_size(p_format, v_threats);

  if p_supplied_team is not null and cardinality(p_supplied_team) > 0 then
    -- A given squad: Classica against the bots, distinct characters players could field.
    if p_format <> 'classic' or v_online then
      raise exception 'challenge_invalid_supplied_team';
    end if;
    v_supplied := array(
      select d.id from unnest(p_supplied_team) with ordinality as u(code, ord)
      join public.card_definitions d on d.code = u.code and d.is_active and d.unlock_level is null
      order by u.ord
    );
    if cardinality(v_supplied) <> cardinality(p_supplied_team) or cardinality(v_supplied) <> v_size
       or (select count(distinct x) from unnest(v_supplied) as x) <> v_size then
      raise exception 'challenge_invalid_supplied_team';
    end if;
    -- The squad rules do not apply to a given squad.
    v_rules := public.challenge_normalize_rules('{}'::jsonb);
  else
    -- Enough characters for a squad of the mode, enough of them with a variant that counts, and
    -- a squad that keeps the composition.
    v_rules := public.challenge_normalize_rules(p_rules);
    select * into v_counts from public.challenge_admitted_counts(v_rules);
    if v_counts.admitted < v_size or v_counts.with_variant < public.challenge_variants_needed(v_rules, v_size) then
      raise exception 'challenge_too_few_characters';
    end if;
    if not public.challenge_composition_possible(v_rules, v_size) then
      raise exception 'challenge_composition_impossible';
    end if;
  end if;

  if v_starts is null or v_ends is null or v_ends <= v_starts or v_ends <= now()
     or v_ends - v_starts > make_interval(days => public.config_int('challenges.max_days')) then
    raise exception 'challenge_invalid_period';
  end if;
  if v_daily_limit is not null and v_daily_limit not between 1 and public.config_int('challenges.max_daily_limit') then
    raise exception 'challenge_invalid_daily_limit';
  end if;

  -- Linked to an event: within its dates, with a whole points row. An Emergenza gives no event points.
  if p_event_id is not null then
    select * into v_event from public.events where id = p_event_id;
    if v_emergency or v_event.id is null or not v_event.is_active or v_event.ends_at <= now()
       or v_starts < v_event.starts_at or v_ends > v_event.ends_at then
      raise exception 'challenge_invalid_event';
    end if;
    if jsonb_typeof(p_event_points) is distinct from 'object' then
      raise exception 'challenge_invalid_points';
    end if;
    v_points := '{}';
    foreach v_outcome in array array['win', 'draw', 'loss'] loop
      begin
        v_value := (p_event_points ->> v_outcome)::integer;
      exception when others then
        raise exception 'challenge_invalid_points';
      end;
      if v_value is null or v_value not between 0 and public.config_int('challenges.max_event_points') then
        raise exception 'challenge_invalid_points';
      end if;
      v_points := v_points || jsonb_build_object(v_outcome, v_value);
    end loop;
  end if;

  if jsonb_typeof(coalesce(p_tiers, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_tiers, '[]'::jsonb)) > public.config_int('challenges.max_tiers') then
    raise exception 'challenge_invalid_tiers';
  end if;

  if exists (
    select 1 from public.challenges x
    where x.is_active and x.format = p_format and x.id is distinct from p_id
      and x.starts_at < v_ends and x.ends_at > v_starts
  ) then
    raise exception 'challenge_overlap';
  end if;

  if v_id is null then
    insert into public.challenges (title, description, color, format, bot_difficulties, bot_follows_rules, rules,
                                   starts_at, ends_at, daily_limit, event_id, event_points, created_by,
                                   online, min_level, quadrant_seal_target,
                                   leaderboard, match_rules, supplied_team, emergency_threats)
    values (v_title, v_description, v_color, p_format, v_bots, coalesce(p_bot_follows_rules, true), v_rules,
            v_starts, v_ends, v_daily_limit, p_event_id, v_points, auth.uid(),
            v_online, p_min_level, p_quadrant_seal_target,
            coalesce(p_leaderboard, true), v_match_rules, v_supplied, v_threats)
    returning id into v_id;
  else
    update public.challenges
    set title = v_title, description = v_description, color = v_color, format = p_format,
        bot_difficulties = v_bots, bot_follows_rules = coalesce(p_bot_follows_rules, true), rules = v_rules,
        starts_at = v_starts, ends_at = v_ends, daily_limit = v_daily_limit, event_id = p_event_id,
        event_points = v_points, online = v_online, min_level = p_min_level,
        quadrant_seal_target = p_quadrant_seal_target, leaderboard = coalesce(p_leaderboard, true),
        match_rules = v_match_rules, supplied_team = v_supplied, emergency_threats = v_threats,
        version = version + 1
    where id = v_id;
    delete from public.challenge_tiers where challenge_id = v_id;
    -- An Emergenza not yet started draws its threats again, as the challenge may have changed.
    delete from public.challenge_emergencies where challenge_id = v_id;
  end if;

  -- The prize: each target asks more wins (an Emergenza: threats passed in the run) than the one
  -- before, and gives something.
  for v_tier in select value from jsonb_array_elements(coalesce(p_tiers, '[]'::jsonb)) loop
    v_index := v_index + 1;
    begin
      v_wins := (v_tier ->> 'wins')::integer;
      v_coins := coalesce((v_tier ->> 'coins')::integer, 0);
      v_packs := coalesce((v_tier ->> 'packs')::integer, 0);
    exception when others then
      raise exception 'challenge_invalid_tiers';
    end;
    if v_wins is null or v_wins <= v_previous or v_wins > public.config_int('challenges.max_tier_wins')
       or (v_emergency and v_wins > v_threats)
       or v_coins not between 0 and 100000 or v_packs not between 0 and 10
       or jsonb_array_length(coalesce(v_tier -> 'cards', '[]')) > 10 then
      raise exception 'challenge_invalid_tiers';
    end if;
    begin
      select * into v_cards from public.event_reward_cards(
        array(select jsonb_array_elements_text(coalesce(v_tier -> 'cards', '[]')))
      );
    exception when raise_exception then
      raise exception 'challenge_invalid_tiers';
    end;
    v_random := public.random_variants_spec(v_tier -> 'random_variants');
    if v_coins = 0 and v_packs = 0 and cardinality(v_cards.definition_ids) = 0 and v_random is null then
      raise exception 'challenge_tier_no_reward';
    end if;
    insert into public.challenge_tiers (challenge_id, tier, wins, coins, packs, card_definition_ids, card_variant_ids,
                                        random_variants)
    values (v_id, v_index, v_wins, v_coins, v_packs, v_cards.definition_ids, v_cards.variant_ids, v_random);
    v_previous := v_wins;
  end loop;

  return public.admin_challenges_payload();
end;
$$;

revoke execute on function public.admin_save_challenge(text, text, text, text, text[], boolean, jsonb, timestamp, timestamp, integer, uuid, jsonb, uuid, boolean, integer, integer, jsonb, boolean, jsonb, text[], integer) from public, anon;
grant execute on function public.admin_save_challenge(text, text, text, text, text[], boolean, jsonb, timestamp, timestamp, integer, uuid, jsonb, uuid, boolean, integer, integer, jsonb, boolean, jsonb, text[], integer) to authenticated;

-- The characters a challenge's rules admit, the given squad by its codes and the rarity ranks,
-- for the simulator of the Editor (the Edge Function checks the admin first): an unsaved draft.
create function public.challenge_simulation_context(p_rules jsonb, p_supplied_codes text[] default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rules jsonb := public.challenge_normalize_rules(p_rules);
begin
  return jsonb_build_object(
    'rules', v_rules,
    'supplied_definition_ids', (
      select coalesce(jsonb_agg(d.id order by u.ord), '[]'::jsonb)
      from unnest(coalesce(p_supplied_codes, '{}')) with ordinality as u(code, ord)
      join public.card_definitions d on d.code = u.code and d.is_active
    ),
    'admitted_definition_ids', (
      select coalesce(jsonb_agg(d.id), '[]'::jsonb)
      from public.card_definitions d
      where d.is_active and d.unlock_level is null and public.challenge_admits(d.id, v_rules)
    ),
    'rarity_ranks', (select jsonb_object_agg(r.code, r.rank) from public.rarity_definitions r)
  );
end;
$$;

revoke execute on function public.challenge_simulation_context(jsonb, text[]) from public, anon, authenticated;
grant execute on function public.challenge_simulation_context(jsonb, text[]) to service_role;

-- Same as in 20261118260000_challenges_stage2.sql: the banner says the challenge's mode, so an
-- Emergenza's prize opens its page.
create or replace function public.notify_challenge_reward()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_challenge public.challenges;
  v_tier public.challenge_tiers;
begin
  select * into v_challenge from public.challenges where id = new.challenge_id;
  select * into v_tier from public.challenge_tiers where challenge_id = new.challenge_id and tier = new.tier;
  perform public.add_player_notification(
    new.user_id,
    'challenge_reward',
    'Premio della sfida!',
    v_challenge.title || ' · ' || v_tier.wins || case
      when v_challenge.format = 'emergency' then case when v_tier.wins = 1 then ' Minaccia superata' else ' Minacce superate' end
      when v_tier.wins = 1 then ' vittoria'
      else ' vittorie'
    end,
    jsonb_build_object(
      'challenge_id', new.challenge_id,
      'format', v_challenge.format,
      'tier', new.tier,
      'coins', new.coins,
      'packs', new.packs,
      'cards', coalesce(cardinality(v_tier.card_definition_ids), 0) + coalesce((v_tier.random_variants ->> 'count')::integer, 0)
    )
  );
  return new;
end;
$$;
