-- Rare threats (SPEC §5.15): threats that turn up once in many matches, each with a
-- rarity tier that says how often. The tiers are a catalog admins edit, like the
-- threats' texts, rules and rarity (/gestione-minacce). A rare threat may require
-- up to all 12 abilities and has its own fixed rule, like the places' threats: no
-- drawn modifier goes on it.
--
-- Draw: every rare threat turns up on its own, once in `one_in` matches, in place
-- of one of the usual threats (the Edge Function for the classic match and
-- Emergenza, insert_triple_match for Allarme Triplo). Boss fronts, story missions
-- and Quadrante draw no threats: nothing changes there.
--
-- Three rules draw their abilities when a match is created: Al buio (shown only once
-- both sides have chosen), Livello ignoto (how many stays hidden until the round) and
-- Eco (the abilities of the threat of the round before). The match stores them in
-- matches.threat_modifiers; threat_levels holds the real number of abilities, and the
-- state payloads hide what the rules hide.
--
-- Players see the tier of every round from the start, and keep a Bestiario: the
-- threats they have met (threat_sightings).

insert into public.game_config (key, value, description) values
  ('rare_threats.all_or_nothing_min', '5', 'Tutto o niente: lowest value of a required ability that counts'),
  ('rare_threats.last_first_bonus', '2', 'Ultimi i primi: points for every rarity rank below the top'),
  ('rare_threats.last_first_top_rank', '5', 'Ultimi i primi: the rarity rank that gets nothing (Omega)'),
  ('rare_threats.price_max_value', '1', 'Il prezzo: highest value of a required ability that costs points'),
  ('rare_threats.price_malus', '3', 'Il prezzo: points such an ability takes away'),
  ('rare_threats.count_min', '5', 'Il conteggio: lowest value of a required ability that scores'),
  ('rare_threats.count_points', '1', 'Il conteggio: points for every such ability');

-- ---------------------------------------------------------------------------
-- Rarity tiers
-- ---------------------------------------------------------------------------

create table public.threat_rarities (
  code text primary key,
  name text not null,
  rank integer not null unique check (rank >= 1),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  -- A threat of this tier turns up once in `one_in` matches; 0: never.
  one_in integer not null check (one_in >= 0),
  updated_at timestamptz not null default now()
);

alter table public.threat_rarities enable row level security;
-- Public: the Bestiario shows how rare every tier is, as the shop shows its odds.
grant select on table public.threat_rarities to anon, authenticated;
create policy threat_rarities_read on public.threat_rarities for select using (true);
revoke insert, update, delete on table public.threat_rarities from anon, authenticated;
grant select on table public.threat_rarities to service_role;

insert into public.threat_rarities (code, name, rank, color, one_in) values
  ('rare', 'Rara', 1, '#2fb5ff', 200),
  ('epic', 'Epica', 2, '#b15cff', 700),
  ('legendary', 'Leggendaria', 3, '#ff9f1c', 2400),
  ('mythic', 'Mitica', 4, '#ff4d6d', 3000),
  ('apocalyptic', 'Apocalittica', 5, '#c1121f', 5000),
  ('unique', 'Unica', 6, '#ffd60a', 20000);

-- ---------------------------------------------------------------------------
-- Threat catalog
-- ---------------------------------------------------------------------------

alter table public.threat_definitions
  add column rarity_code text references public.threat_rarities (code),
  -- Emergenza: score a rare threat needs (the most it allows, under Rovescio).
  add column emergency_target integer check (emergency_target is null or emergency_target >= 0),
  add column updated_at timestamptz not null default now();

create index threat_definitions_rarity_idx on public.threat_definitions (rarity_code) where rarity_code is not null;

alter table public.threat_definitions drop constraint threat_definitions_level_check;
alter table public.threat_definitions add constraint threat_definitions_level_check check (level between 1 and 12);

-- Al buio and Livello ignoto draw `level` abilities (Livello ignoto: from params.min to
-- `level`) out of a larger list: for them the list is the pool, not the requirement.
alter table public.threat_definitions drop constraint threat_definitions_ability_count;
alter table public.threat_definitions add constraint threat_definitions_ability_count check (
  case when modifier_code in ('blind', 'unknown_level')
    then cardinality(required_abilities) >= level
    else cardinality(required_abilities) = level
  end
);

alter table public.threat_definitions drop constraint threat_definitions_modifier_code;
alter table public.threat_definitions add constraint threat_definitions_modifier_code check (
  modifier_code is null or modifier_code in (
    'tomb_silence', 'long_count', 'abyss', 'frost', 'duel',
    'focus', 'weak_link', 'hostile_ground', 'underdogs',
    'mirror', 'reverse', 'all_or_nothing', 'last_first', 'price', 'one_force',
    'blind', 'echo', 'count', 'unknown_level', 'negative'
  )
);

-- Emergenza needs a target for every rare threat.
alter table public.threat_definitions add constraint threat_definitions_rare_target
  check (rarity_code is null or emergency_target is not null);

-- The parameters each rule needs.
create or replace function public.validate_threat_definition()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_min integer;
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

  if new.modifier_code in ('abyss', 'one_force') and (
    jsonb_typeof(new.modifier_params -> 'abilities') is distinct from 'array'
    or jsonb_array_length(new.modifier_params -> 'abilities') = 0
    or exists (
      select 1 from jsonb_array_elements_text(new.modifier_params -> 'abilities') as a(code)
      where a.code not in (select d.code from public.ability_definitions d)
    )
  ) then
    raise exception 'threat %: % needs a list of known abilities', new.code, new.modifier_code;
  end if;

  if new.modifier_code = 'hostile_ground' and (
    coalesce(new.modifier_params ->> 'favored', '') not in ('heroes', 'villains', 'neutrals')
    or coalesce(new.modifier_params ->> 'hindered', '') not in ('heroes', 'villains', 'neutrals')
    or new.modifier_params ->> 'favored' = new.modifier_params ->> 'hindered'
  ) then
    raise exception 'threat %: hostile_ground needs two different factions', new.code;
  end if;

  if new.modifier_code in ('duel', 'frost') and new.modifier_params ? 'count' and new.modifier_code = 'duel'
     and (new.modifier_params ->> 'count')::integer < 1 then
    raise exception 'threat %: duel needs a count of at least 1', new.code;
  end if;

  if new.modifier_code = 'unknown_level' then
    v_min := coalesce((new.modifier_params ->> 'min')::integer, 1);
    if v_min < 1 or v_min > new.level then
      raise exception 'threat %: unknown_level needs 1 <= min <= level', new.code;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fixed rules, and the ones drawn for each match
-- ---------------------------------------------------------------------------

-- The fixed rule of a threat as the rules engine reads it (ThreatModifier), numbers
-- from the configuration. Null for a threat without one. The rules drawn for each
-- match come with an empty list of abilities: see draw_threat_rule.
create or replace function public.place_modifier(p_code text, p_params jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case p_code
    when 'tomb_silence' then jsonb_build_object('code', p_code)
    when 'focus' then jsonb_build_object('code', p_code)
    when 'weak_link' then jsonb_build_object('code', p_code)
    when 'mirror' then jsonb_build_object('code', p_code)
    when 'reverse' then jsonb_build_object('code', p_code)
    when 'long_count' then jsonb_build_object('code', p_code, 'bonus', public.config_int('places.long_count_bonus'))
    when 'abyss' then jsonb_build_object('code', p_code, 'abilities', p_params -> 'abilities')
    when 'one_force' then jsonb_build_object('code', p_code, 'abilities', p_params -> 'abilities')
    when 'frost' then jsonb_build_object('code', p_code,
      'cap', coalesce((p_params ->> 'cap')::integer, public.config_int('places.frost_cap')))
    when 'duel' then jsonb_build_object('code', p_code,
      'count', coalesce((p_params ->> 'count')::integer, public.config_int('places.duel_count')))
    when 'hostile_ground' then jsonb_build_object(
      'code', p_code, 'favored', p_params ->> 'favored', 'hindered', p_params ->> 'hindered',
      'bonus', public.config_int('threat_modifiers.hostile_bonus'),
      'malus', public.config_int('threat_modifiers.hostile_malus'))
    when 'underdogs' then jsonb_build_object(
      'code', p_code,
      'commonMaxRank', public.config_int('threat_modifiers.underdog_common_max_rank'),
      'eliteMinRank', public.config_int('threat_modifiers.underdog_elite_min_rank'),
      'bonus', public.config_int('threat_modifiers.underdog_bonus'),
      'malus', public.config_int('threat_modifiers.underdog_malus'))
    when 'all_or_nothing' then jsonb_build_object('code', p_code, 'min', public.config_int('rare_threats.all_or_nothing_min'))
    when 'last_first' then jsonb_build_object('code', p_code,
      'bonus', public.config_int('rare_threats.last_first_bonus'),
      'topRank', public.config_int('rare_threats.last_first_top_rank'))
    when 'price' then jsonb_build_object('code', p_code,
      'maxValue', public.config_int('rare_threats.price_max_value'),
      'malus', public.config_int('rare_threats.price_malus'))
    when 'count' then jsonb_build_object('code', p_code,
      'min', public.config_int('rare_threats.count_min'),
      'points', public.config_int('rare_threats.count_points'))
    when 'negative' then jsonb_build_object('code', p_code, 'max', public.config_int('cards.ability_max'))
    when 'blind' then jsonb_build_object('code', p_code, 'abilities', '[]'::jsonb)
    when 'echo' then jsonb_build_object('code', p_code, 'abilities', '[]'::jsonb)
    when 'unknown_level' then jsonb_build_object('code', p_code, 'abilities', '[]'::jsonb)
  end
$$;

revoke execute on function public.place_modifier(text, jsonb) from public, anon, authenticated;

-- The fixed rule of a threat in one match. Al buio draws `level` abilities of its list;
-- Livello ignoto from params.min to `level` of them; Eco takes the abilities of the
-- threat before it (p_previous) that it does not already require.
create function public.draw_threat_rule(p_threat_id uuid, p_previous uuid)
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare
  t public.threat_definitions;
  v_count integer;
begin
  select * into t from public.threat_definitions where id = p_threat_id;
  if t.modifier_code = 'blind' then
    return jsonb_build_object('code', 'blind', 'abilities', to_jsonb(array(
      select a from unnest(t.required_abilities) as a order by random() limit t.level
    )));
  elsif t.modifier_code = 'unknown_level' then
    v_count := coalesce((t.modifier_params ->> 'min')::integer, 1);
    v_count := v_count + floor(random() * (t.level - v_count + 1))::integer;
    return jsonb_build_object('code', 'unknown_level', 'abilities', to_jsonb(array(
      select a from unnest(t.required_abilities) as a order by random() limit v_count
    )));
  elsif t.modifier_code = 'echo' then
    return jsonb_build_object('code', 'echo', 'abilities', coalesce((
      select to_jsonb(array_agg(a order by ord))
      from public.threat_definitions p, unnest(p.required_abilities) with ordinality as u(a, ord)
      where p.id = p_previous and not (a = any (t.required_abilities))
    ), '[]'::jsonb));
  end if;
  return public.place_modifier(t.modifier_code, t.modifier_params);
end;
$$;

revoke execute on function public.draw_threat_rule(uuid, uuid) from public, anon, authenticated;

-- The fixed rules of a list of threats, in order (null where a threat has none).
create function public.draw_fixed_modifiers(p_threat_ids uuid[])
returns jsonb[]
language sql
volatile
set search_path = ''
as $$
  select array(
    select public.draw_threat_rule(u.id, case when u.ord > 1 then p_threat_ids[u.ord - 1] end)
    from unnest(p_threat_ids) with ordinality as u(id, ord)
    order by u.ord
  )
$$;

revoke execute on function public.draw_fixed_modifiers(uuid[]) from public, anon, authenticated;

-- The modifiers of a match: the fixed rule of every threat that has one, then 1 or 2
-- drawn modifiers among the usual threats without one (as many as there are, if fewer).
-- A rare threat never gets a drawn modifier, rule or not.
create or replace function public.draw_match_modifiers(p_threat_ids uuid[])
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_fixed jsonb[] := public.draw_fixed_modifiers(p_threat_ids);
  v_levels integer[] := array(
    select t.level
    from unnest(p_threat_ids) with ordinality as u(id, ord)
    join public.threat_definitions t on t.id = u.id
    order by u.ord
  );
  v_rare boolean[] := array(
    select t.rarity_code is not null
    from unnest(p_threat_ids) with ordinality as u(id, ord)
    join public.threat_definitions t on t.id = u.id
    order by u.ord
  );
  v_open integer[];
  v_drawn jsonb;
  v_result jsonb[];
  v_slot integer := 0;
  v_round integer;
begin
  if cardinality(v_levels) <> cardinality(p_threat_ids) then
    raise exception 'invalid_threats';
  end if;
  v_result := v_fixed;
  v_open := array(select g from generate_subscripts(v_levels, 1) as g where v_fixed[g] is null and not v_rare[g]);
  if cardinality(v_open) > 0 then
    -- Drawn on the open rounds only, as if they were the whole match.
    v_drawn := public.draw_threat_modifiers(array(select v_levels[g] from unnest(v_open) as g));
    foreach v_round in array v_open loop
      v_slot := v_slot + 1;
      v_result[v_round] := case when jsonb_typeof(v_drawn -> (v_slot - 1)) = 'object' then v_drawn -> (v_slot - 1) end;
    end loop;
  end if;
  return to_jsonb(v_result);
end;
$$;

-- Every round with a threat that has a fixed rule keeps it, whatever else writes the
-- modifiers (a story mission sets its own after creating the match). A rule drawn for
-- the match (Al buio, Eco, Livello ignoto) keeps what was drawn.
create or replace function public.with_place_modifiers(p_modifiers jsonb, p_threat_ids uuid[])
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    coalesce(
      case when t.modifier_code in ('blind', 'echo', 'unknown_level')
                and p_modifiers -> (u.ord::integer - 1) ->> 'code' = t.modifier_code
           then p_modifiers -> (u.ord::integer - 1) end,
      public.place_modifier(t.modifier_code, t.modifier_params),
      p_modifiers -> (u.ord::integer - 1),
      'null'::jsonb
    )
    order by u.ord
  ), '[]'::jsonb)
  from unnest(p_threat_ids) with ordinality as u(id, ord)
  join public.threat_definitions t on t.id = u.id
$$;

-- The same on an update: a rule drawn for the match keeps what was drawn, even when
-- the new modifiers leave it out (p_previous: the modifiers before the update).
create function public.with_place_modifiers(p_modifiers jsonb, p_threat_ids uuid[], p_previous jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    coalesce(
      case when t.modifier_code in ('blind', 'echo', 'unknown_level')
                and p_modifiers -> (u.ord::integer - 1) ->> 'code' = t.modifier_code
           then p_modifiers -> (u.ord::integer - 1) end,
      case when t.modifier_code in ('blind', 'echo', 'unknown_level')
                and p_previous -> (u.ord::integer - 1) ->> 'code' = t.modifier_code
           then p_previous -> (u.ord::integer - 1) end,
      public.place_modifier(t.modifier_code, t.modifier_params),
      p_modifiers -> (u.ord::integer - 1),
      'null'::jsonb
    )
    order by u.ord
  ), '[]'::jsonb)
  from unnest(p_threat_ids) with ordinality as u(id, ord)
  join public.threat_definitions t on t.id = u.id
$$;

revoke execute on function public.with_place_modifiers(jsonb, uuid[], jsonb) from public, anon, authenticated;

-- The number of abilities each round requires, with what its rule drew.
create function public.rule_levels(p_threat_ids uuid[], p_modifiers jsonb)
returns integer[]
language sql
stable
set search_path = ''
as $$
  select array(
    select case
      when m ->> 'code' in ('blind', 'unknown_level') and jsonb_array_length(m -> 'abilities') > 0
        then jsonb_array_length(m -> 'abilities')
      when m ->> 'code' = 'echo'
        then t.level + (
          select count(*)::integer from jsonb_array_elements_text(m -> 'abilities') as e(a)
          where not (e.a = any (t.required_abilities))
        )
      else t.level
    end
    from unnest(p_threat_ids) with ordinality as u(id, ord)
    join public.threat_definitions t on t.id = u.id
    cross join lateral (select p_modifiers -> (u.ord::integer - 1) as m) x
    order by u.ord
  )
$$;

revoke execute on function public.rule_levels(uuid[], jsonb) from public, anon, authenticated;

-- The abilities a round requires, with what its rule drew.
create function public.rule_abilities(p_required text[], p_modifier jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when p_modifier ->> 'code' in ('blind', 'unknown_level') and jsonb_array_length(p_modifier -> 'abilities') > 0
      then p_modifier -> 'abilities'
    when p_modifier ->> 'code' = 'echo'
      then to_jsonb(p_required) || coalesce((
        select jsonb_agg(e.a) from jsonb_array_elements_text(p_modifier -> 'abilities') as e(a)
        where not (e.a = any (p_required))
      ), '[]'::jsonb)
    else to_jsonb(p_required)
  end
$$;

revoke execute on function public.rule_abilities(text[], jsonb) from public, anon, authenticated;

create or replace function public.set_threat_modifiers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_threats integer;
  v_drawn jsonb;
begin
  if public.is_quadrant(new.format) then
    new.threat_modifiers := '[]'::jsonb;
    return new;
  elsif new.format = 'boss' then
    new.threat_modifiers := to_jsonb(array_fill(null::jsonb, array[cardinality(new.threat_ids)]));
    return new;
  elsif new.format = 'triple' and tg_op = 'INSERT' then
    v_threats := public.config_int('triple.threats');
    v_drawn := public.draw_match_modifiers(new.threat_ids[1:v_threats]);
    new.threat_modifiers := (
      select coalesce(jsonb_agg(v_drawn -> ((g - 1) % v_threats) order by g), '[]'::jsonb)
      from generate_series(1, cardinality(new.threat_ids)) as g
    );
  elsif tg_op = 'INSERT' then
    new.threat_modifiers := public.draw_match_modifiers(new.threat_ids);
  else
    new.threat_modifiers := public.with_place_modifiers(
      new.threat_modifiers, new.threat_ids, case when tg_op = 'UPDATE' then old.threat_modifiers end
    );
  end if;
  -- What the rules drew changes how many abilities a round requires.
  new.threat_levels := public.rule_levels(new.threat_ids, new.threat_modifiers);
  return new;
end;
$$;

-- Emergenza: the fixed rules of the day's threats, no drawn modifier (SPEC §5.10).
alter table public.emergency_days add column threat_modifiers jsonb not null default '[]'::jsonb;

create function public.set_emergency_day_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.threat_modifiers := to_jsonb(public.draw_fixed_modifiers(new.threat_ids));
  new.threat_levels := public.rule_levels(new.threat_ids, new.threat_modifiers);
  return new;
end;
$$;

revoke execute on function public.set_emergency_day_rules() from public, anon, authenticated;

create trigger emergency_days_rules
  before insert on public.emergency_days
  for each row execute function public.set_emergency_day_rules();

-- ---------------------------------------------------------------------------
-- Allarme Triplo: the rare threats turn up there too
-- ---------------------------------------------------------------------------

-- The rare threats that turn up in one match, each on its own, put in place of
-- random threats of the list.
create function public.with_rare_threats(p_threat_ids uuid[])
returns uuid[]
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_result uuid[] := p_threat_ids;
  v_free integer[] := array(select g from generate_subscripts(p_threat_ids, 1) as g order by random());
  v_hit uuid;
begin
  for v_hit in
    select t.id from public.threat_definitions t
    join public.threat_rarities r on r.code = t.rarity_code
    where t.is_active and r.one_in > 0 and not (t.id = any (p_threat_ids))
      and random() < 1.0 / r.one_in
    order by random()
  loop
    exit when cardinality(v_free) = 0;
    v_result[v_free[1]] := v_hit;
    v_free := v_free[2:];
  end loop;
  return v_result;
end;
$$;

revoke execute on function public.with_rare_threats(uuid[]) from public, anon, authenticated;

create or replace function public.insert_triple_match(
  p_mode text,
  p_player_a uuid,
  p_team_a uuid[],
  p_definitions_a uuid[],
  p_player_b uuid,
  p_team_b uuid[],
  p_definitions_b uuid[],
  p_bot_difficulty text,
  p_threat_ids uuid[] default null
)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_threats integer := public.config_int('triple.threats');
  v_rounds integer := public.config_int('triple.rounds');
  v_bot boolean := p_mode = 'bot';
  v_picked uuid[];
  v_ids uuid[];
  v_levels integer[];
  v_order_a integer[];
  v_order_b integer[];
  v_match uuid;
begin
  if p_mode not in ('bot', 'friendly') or v_bot <> (p_player_b is null) or v_bot <> (p_bot_difficulty is not null) then
    raise exception 'invalid_request';
  end if;
  if p_player_a = p_player_b then
    raise exception 'cannot_play_yourself';
  end if;
  if public.has_active_match(p_player_a) or (p_player_b is not null and public.has_active_match(p_player_b)) then
    raise exception 'match_already_active';
  end if;

  if p_threat_ids is null then
    -- The usual threats of Nuova Megara, then the rare ones that turn up, if any.
    select array_agg(t.id) into v_picked
    from (
      select id from public.threat_definitions
      where is_active and region = 'megara' and rarity_code is null
      order by random() limit v_threats
    ) t;
    v_picked := public.with_rare_threats(v_picked);
  else
    v_picked := p_threat_ids;
  end if;
  if coalesce(cardinality(v_picked), 0) <> v_threats
     or (select count(distinct u.id) from unnest(v_picked) as u(id)
         join public.threat_definitions t on t.id = u.id and t.is_active and t.region = 'megara') <> v_threats then
    raise exception 'invalid_threats';
  end if;

  -- The three threats, once per round.
  select array_agg(v_picked[s] order by r, s), array_agg(t.level order by r, s)
  into v_ids, v_levels
  from generate_series(1, v_rounds) as r
  cross join generate_series(1, v_threats) as s
  join public.threat_definitions t on t.id = v_picked[s];

  -- The draw order of each deck.
  v_order_a := array(select g from generate_series(1, cardinality(p_definitions_a)) as g order by random());
  v_order_b := array(select g from generate_series(1, cardinality(p_definitions_b)) as g order by random());

  insert into public.matches (mode, format, bot_difficulty, player_a, player_b, threat_ids, threat_levels)
  values (p_mode, 'triple', p_bot_difficulty, p_player_a, p_player_b, v_ids, v_levels)
  returning id into v_match;

  insert into public.match_teams (match_id, side, user_id, card_instance_ids, definition_ids, last_seen_at) values
    (v_match, 'a', p_player_a,
     case when p_team_a is not null then array(select p_team_a[g] from unnest(v_order_a) with ordinality as u(g, o) order by o) end,
     array(select p_definitions_a[g] from unnest(v_order_a) with ordinality as u(g, o) order by o),
     case when not v_bot then now() end),
    (v_match, 'b', p_player_b,
     case when p_team_b is not null then array(select p_team_b[g] from unnest(v_order_b) with ordinality as u(g, o) order by o) end,
     array(select p_definitions_b[g] from unnest(v_order_b) with ordinality as u(g, o) order by o),
     case when not v_bot then now() end);

  perform public.open_triple_round(v_match, 1);

  if not v_bot then
    delete from public.match_lobbies where host_id in (p_player_a, p_player_b);
    delete from public.matchmaking_queue where user_id in (p_player_a, p_player_b);
    perform public.notify_player(p_player_a, 'match_started', v_match);
    perform public.notify_player(p_player_b, 'match_started', v_match);
  end if;
  return v_match;
end;
$$;

-- ---------------------------------------------------------------------------
-- What players see: the tier of every round, and only what the rules show
-- ---------------------------------------------------------------------------

-- A tier as the screens read it; null for a usual threat.
create function public.threat_rarity_payload(p_threat_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('code', r.code, 'name', r.name, 'rank', r.rank, 'color', r.color, 'one_in', r.one_in)
  from public.threat_definitions t join public.threat_rarities r on r.code = t.rarity_code
  where t.id = p_threat_id
$$;

revoke execute on function public.threat_rarity_payload(uuid) from public, anon, authenticated;

-- A threat entry of a payload ({abilities, ...}) with its rule: the abilities the rule
-- drew, hidden when p_hide (Al buio before both sides have chosen).
create function public.rule_threat_entry(p_entry jsonb, p_required text[], p_modifier jsonb, p_hide boolean)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when p_hide then p_entry || jsonb_build_object('abilities', '[]'::jsonb, 'hidden', true)
    else p_entry || jsonb_build_object('abilities', public.rule_abilities(p_required, p_modifier))
  end
$$;

revoke execute on function public.rule_threat_entry(jsonb, text[], jsonb, boolean) from public, anon, authenticated;

-- A modifier as a payload may show it: Al buio keeps its drawn abilities to itself.
create function public.visible_modifier(p_modifier jsonb, p_hide boolean)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when p_modifier is null or jsonb_typeof(p_modifier) <> 'object' then p_modifier
    when p_hide then p_modifier || jsonb_build_object('abilities', '[]'::jsonb)
    else p_modifier
  end
$$;

revoke execute on function public.visible_modifier(jsonb, boolean) from public, anon, authenticated;

-- The classic match payload with the rare threats: the tier of every round from the
-- start, the abilities the rules drew, and nothing they hide.
create function public.with_rare_rules(p_payload jsonb, p_match_id uuid, p_side text)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  m public.matches;
  v_rounds jsonb := '[]'::jsonb;
  v_foreseen jsonb := '[]'::jsonb;
  v_levels jsonb := '[]'::jsonb;
  v_entry jsonb;
  v_round integer;
  v_threat public.threat_definitions;
  v_modifier jsonb;
  v_hide boolean;
  v_opened integer[];
  v_foreseen_rounds integer[];
begin
  select * into m from public.matches where id = p_match_id;
  if m.id is null or p_payload is null then
    return p_payload;
  end if;
  v_opened := array(select mr.round from public.match_rounds mr where mr.match_id = p_match_id);
  v_foreseen_rounds := array(
    select (f ->> 'round')::integer from jsonb_array_elements(coalesce(p_payload -> 'foreseen_threats', '[]'::jsonb)) as f
  );

  for v_entry in select value from jsonb_array_elements(coalesce(p_payload -> 'rounds', '[]'::jsonb)) loop
    v_round := (v_entry ->> 'round')::integer;
    select * into v_threat from public.threat_definitions where id = m.threat_ids[v_round];
    v_modifier := m.threat_modifiers -> (v_round - 1);
    -- Al buio: the abilities only once the round is resolved.
    v_hide := v_modifier ->> 'code' = 'blind' and not coalesce((v_entry ->> 'resolved')::boolean, false);
    v_rounds := v_rounds || jsonb_build_array(v_entry || jsonb_build_object(
      'level', m.threat_levels[v_round],
      'modifier', public.visible_modifier(v_modifier, v_hide),
      'rarity', public.threat_rarity_payload(v_threat.id),
      'threat', public.rule_threat_entry(v_entry -> 'threat', v_threat.required_abilities, v_modifier, v_hide)
    ));
  end loop;

  -- Veggente sees what the rules drew, Al buio included.
  for v_entry in select value from jsonb_array_elements(coalesce(p_payload -> 'foreseen_threats', '[]'::jsonb)) loop
    v_round := (v_entry ->> 'round')::integer;
    select * into v_threat from public.threat_definitions where id = m.threat_ids[v_round];
    v_modifier := m.threat_modifiers -> (v_round - 1);
    v_foreseen := v_foreseen || jsonb_build_array(
      public.rule_threat_entry(v_entry, v_threat.required_abilities, v_modifier, false)
      || jsonb_build_object('level', m.threat_levels[v_round], 'rarity', public.threat_rarity_payload(v_threat.id))
    );
  end loop;

  -- Livello ignoto: its number of abilities only once its round has opened (or foreseen).
  for v_round in 1 .. coalesce(cardinality(m.threat_ids), 0) loop
    v_modifier := m.threat_modifiers -> (v_round - 1);
    v_levels := v_levels || jsonb_build_array(case
      when v_modifier ->> 'code' = 'unknown_level' and not (v_round = any (v_opened)) and not (v_round = any (v_foreseen_rounds))
        then null
      else m.threat_levels[v_round]
    end);
  end loop;

  return p_payload || jsonb_build_object(
    'rounds', v_rounds,
    'foreseen_threats', v_foreseen,
    'threat_levels', v_levels,
    'threat_rarities', (
      select coalesce(jsonb_agg(public.threat_rarity_payload(u.id) order by u.ord), '[]'::jsonb)
      from unnest(m.threat_ids) with ordinality as u(id, ord)
    )
  );
end;
$$;

revoke execute on function public.with_rare_rules(jsonb, uuid, text) from public, anon, authenticated;

-- Allarme Triplo: the three threats are public from the start. Their tiers, the
-- abilities their rules drew; Al buio hides them until a round on that threat is
-- resolved, Livello ignoto shows them (its threat is already on the table).
create function public.with_rare_triple_rules(p_payload jsonb, p_match_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  m public.matches;
  v_threats integer := public.config_int('triple.threats');
  v_result jsonb := '[]'::jsonb;
  v_entry jsonb;
  v_slot integer;
  v_threat public.threat_definitions;
  v_modifier jsonb;
  v_hide boolean;
begin
  select * into m from public.matches where id = p_match_id;
  if m.id is null or p_payload is null or jsonb_typeof(p_payload -> 'threats') <> 'array' then
    return p_payload;
  end if;
  for v_entry in select value from jsonb_array_elements(p_payload -> 'threats') loop
    v_slot := (v_entry ->> 'slot')::integer;
    select * into v_threat from public.threat_definitions where id = m.threat_ids[v_slot + 1];
    v_modifier := m.threat_modifiers -> v_slot;
    v_hide := v_modifier ->> 'code' = 'blind' and not exists (
      select 1 from public.match_rounds mr
      where mr.match_id = p_match_id and mr.resolved_at is not null and (mr.round - 1) % v_threats = v_slot
    );
    v_result := v_result || jsonb_build_array(
      public.rule_threat_entry(v_entry, v_threat.required_abilities, v_modifier, v_hide)
      || jsonb_build_object(
        'level', m.threat_levels[v_slot + 1],
        'modifier', public.visible_modifier(v_modifier, v_hide),
        'rarity', public.threat_rarity_payload(v_threat.id)
      )
    );
  end loop;
  return p_payload || jsonb_build_object('threats', v_result);
end;
$$;

revoke execute on function public.with_rare_triple_rules(jsonb, uuid) from public, anon, authenticated;

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
    return public.boss_state_payload(p_match_id, p_side);
  elsif v_format = 'triple' then
    return public.with_rare_triple_rules(public.triple_state_payload(p_match_id, p_side), p_match_id);
  elsif public.is_quadrant(v_format) then
    return public.quadrant_state_payload(p_match_id, p_side);
  end if;
  return public.with_rare_rules(public.classic_match_state_payload(p_match_id, p_side), p_match_id, p_side);
end;
$$;

-- Emergenza: the same for the day's threats. The current threat Al buio shows its
-- abilities only once played; a rare threat brings its own target.
create or replace function public.emergency_state_payload(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with d as (
    select * from public.emergency_days where day = public.game_day()
  ), r as (
    select * from public.emergency_runs where user_id = p_user and day = public.game_day()
  ), foresees as (
    select exists (
      select 1 from public.emergency_plays p
      join public.card_definitions c on c.id = p.definition_id
      join r on r.id = p.run_id
      where c.power_code = 'foresight'
    ) as yes
  )
  select jsonb_build_object(
    'day', public.game_day(),
    'server_now', now(),
    -- Livello ignoto: its number of abilities only once it is the current threat (or foreseen).
    'threat_levels', (
      select jsonb_agg(case
        when d.threat_modifiers -> (u.ord::integer - 1) ->> 'code' = 'unknown_level'
             and u.ord > coalesce((select r.current_round from r), 0)
             and not (select yes from foresees)
          then null
        else to_jsonb(u.level)
      end order by u.ord)
      from d, unnest(d.threat_levels) with ordinality as u(level, ord)
    ),
    'threat_rarities', (
      select jsonb_agg(public.threat_rarity_payload(u.id) order by u.ord)
      from d, unnest(d.threat_ids) with ordinality as u(id, ord)
    ),
    'rules', jsonb_build_object(
      'threats_per_run', public.config_int('emergency.threats_per_run'),
      'max_failures', public.config_int('emergency.max_failures'),
      'targets', (
        select jsonb_object_agg(l.level, public.config_int(format('emergency.targets.level%s', l.level)))
        from generate_series(1, 6) as l(level)
      ),
      'rewards', (
        select jsonb_agg(jsonb_build_object(
          'passed', public.config_int(format('emergency.rewards.tier%s_passed', t.tier)),
          'coins', public.config_int(format('emergency.rewards.tier%s_coins', t.tier))
        ) order by t.tier)
        from generate_series(1, 3) as t(tier)
      )
    ),
    'run', (
      select jsonb_build_object(
        'status', r.status,
        'current_round', r.current_round,
        'passed', r.passed,
        'failed', r.failed,
        'total_score', r.total_score,
        'coins', r.coins,
        'squad', (
          select jsonb_agg(public.card_payload(u.definition_id, u.instance_id) || jsonb_build_object(
            'instance_id', u.instance_id,
            'played_round', (
              select p.round from public.emergency_plays p
              where p.run_id = r.id and p.definition_id = u.definition_id
            )
          ) order by u.ord)
          from unnest(r.card_instance_ids, r.definition_ids) with ordinality as u(instance_id, definition_id, ord)
        ),
        'plays', coalesce((
          select jsonb_agg(jsonb_build_object(
            'round', p.round,
            'level', coalesce(d.threat_levels[p.round], t.level),
            'modifier', d.threat_modifiers -> (p.round - 1),
            'rarity', public.threat_rarity_payload(t.id),
            'threat', jsonb_build_object(
              'name', t.name,
              'abilities', public.rule_abilities(t.required_abilities, d.threat_modifiers -> (p.round - 1)),
              'flavor', t.flavor
            ),
            'instance_id', p.card_instance_id,
            'definition_id', p.definition_id,
            'base', p.base_score,
            'bonus', p.bonus,
            'score', p.score,
            'required', p.required_score,
            'passed', p.passed
          ) order by p.round)
          from public.emergency_plays p
          join public.threat_definitions t on t.id = p.threat_id
          cross join d
          where p.run_id = r.id
        ), '[]'::jsonb),
        'current_threat', case when r.status = 'active' then (
          select jsonb_build_object(
            'round', r.current_round,
            'id', t.id,
            'level', d.threat_levels[r.current_round],
            'name', t.name,
            'abilities', case when d.threat_modifiers -> (r.current_round - 1) ->> 'code' = 'blind' then '[]'::jsonb
              else public.rule_abilities(t.required_abilities, d.threat_modifiers -> (r.current_round - 1)) end,
            'hidden', coalesce(d.threat_modifiers -> (r.current_round - 1) ->> 'code' = 'blind', false),
            'modifier', public.visible_modifier(
              d.threat_modifiers -> (r.current_round - 1),
              coalesce(d.threat_modifiers -> (r.current_round - 1) ->> 'code' = 'blind', false)
            ),
            'rarity', public.threat_rarity_payload(t.id),
            'target', t.emergency_target,
            'flavor', t.flavor
          )
          from d join public.threat_definitions t on t.id = d.threat_ids[r.current_round]
        ) end,
        'foreseen_threats', case
          when r.status = 'active' and (select yes from foresees) then (
            select coalesce(jsonb_agg(jsonb_build_object(
              'round', u.ord,
              'level', d.threat_levels[u.ord],
              'name', t.name,
              'abilities', public.rule_abilities(t.required_abilities, d.threat_modifiers -> (u.ord::integer - 1)),
              'modifier', d.threat_modifiers -> (u.ord::integer - 1),
              'rarity', public.threat_rarity_payload(t.id),
              'target', t.emergency_target
            ) order by u.ord), '[]'::jsonb)
            from d, unnest(d.threat_ids) with ordinality as u(id, ord)
            join public.threat_definitions t on t.id = u.id
            where u.ord > r.current_round
          )
          else '[]'::jsonb
        end
      )
      from r
    )
  )
$$;

-- The Edge Function needs the rules the day drew.
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
      select coalesce(jsonb_agg(jsonb_build_object('card_instance_id', p.card_instance_id, 'passed', p.passed) order by p.round), '[]'::jsonb)
      from public.emergency_plays p
      join public.emergency_runs r on r.id = p.run_id
      where r.user_id = p_user and r.day = public.game_day()
    )
  )
$$;

-- ---------------------------------------------------------------------------
-- Bestiario: the threats each player has met
-- ---------------------------------------------------------------------------

create table public.threat_sightings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  threat_id uuid not null references public.threat_definitions (id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- Rounds on this threat (Allarme Triplo: contests; Emergenza: plays).
  times integer not null default 1 check (times >= 1),
  primary key (user_id, threat_id)
);

alter table public.threat_sightings enable row level security;
revoke all on table public.threat_sightings from anon, authenticated;

create function public.record_threat_sighting(p_user uuid, p_threat_id uuid, p_at timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.threat_sightings (user_id, threat_id, first_seen_at, last_seen_at)
  select p_user, p_threat_id, p_at, p_at
  -- A Grande Minaccia turn or a Quadrante move has no threat of its own.
  where p_user is not null and p_threat_id is not null
  on conflict (user_id, threat_id) do update
  set times = public.threat_sightings.times + 1,
      last_seen_at = greatest(public.threat_sightings.last_seen_at, excluded.last_seen_at)
$$;

revoke execute on function public.record_threat_sighting(uuid, uuid, timestamptz) from public, anon, authenticated;

-- A round opens: both players meet its threat.
create function public.match_round_sighting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches;
begin
  select * into m from public.matches where id = new.match_id;
  perform public.record_threat_sighting(m.player_a, new.threat_id, new.opened_at);
  perform public.record_threat_sighting(m.player_b, new.threat_id, new.opened_at);
  return new;
end;
$$;

revoke execute on function public.match_round_sighting() from public, anon, authenticated;

create trigger match_rounds_sighting
  after insert on public.match_rounds
  for each row execute function public.match_round_sighting();

create function public.emergency_play_sighting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.record_threat_sighting(
    (select r.user_id from public.emergency_runs r where r.id = new.run_id), new.threat_id, new.created_at
  );
  return new;
end;
$$;

revoke execute on function public.emergency_play_sighting() from public, anon, authenticated;

create trigger emergency_plays_sighting
  after insert on public.emergency_plays
  for each row execute function public.emergency_play_sighting();

-- What players already met before the Bestiario existed.
insert into public.threat_sightings (user_id, threat_id, first_seen_at, last_seen_at, times)
select s.user_id, s.threat_id, min(s.at), max(s.at), count(*)::integer
from (
  select m.player_a as user_id, mr.threat_id, mr.opened_at as at
  from public.match_rounds mr join public.matches m on m.id = mr.match_id
  union all
  select m.player_b, mr.threat_id, mr.opened_at
  from public.match_rounds mr join public.matches m on m.id = mr.match_id
  union all
  select r.user_id, p.threat_id, p.created_at
  from public.emergency_plays p join public.emergency_runs r on r.id = p.run_id
) s
where s.user_id is not null and s.threat_id is not null
group by s.user_id, s.threat_id;

-- The Bestiario of the signed-in player: every active threat, in catalog order. One
-- never met is only a silhouette: its place, level and tier, no name, abilities or rule.
create function public.get_bestiary()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'rarities', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', r.code, 'name', r.name, 'rank', r.rank, 'color', r.color, 'one_in', r.one_in
      ) order by r.rank), '[]'::jsonb)
      from public.threat_rarities r
    ),
    'threats', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', t.code,
        'region', t.region,
        -- Livello ignoto: how many abilities changes every time.
        'level', case when t.modifier_code = 'unknown_level' then null else t.level end,
        'rarity_code', t.rarity_code,
        'seen', s.user_id is not null,
        'times', coalesce(s.times, 0),
        'first_seen_at', s.first_seen_at,
        'name', case when s.user_id is not null then t.name end,
        'flavor', case when s.user_id is not null then t.flavor end,
        'abilities', case when s.user_id is not null then
          case when t.modifier_code in ('blind', 'unknown_level') then '[]'::jsonb else to_jsonb(t.required_abilities) end
        end,
        'modifier', case when s.user_id is not null then public.place_modifier(t.modifier_code, t.modifier_params) end
      ) order by tr.rank nulls first, t.region <> 'megara', t.region, t.level, t.code), '[]'::jsonb)
      from public.threat_definitions t
      left join public.threat_rarities tr on tr.code = t.rarity_code
      left join public.threat_sightings s on s.threat_id = t.id and s.user_id = auth.uid()
      where t.is_active
    )
  )
  where auth.uid() is not null
$$;

revoke execute on function public.get_bestiary() from public, anon;
grant execute on function public.get_bestiary() to authenticated;

-- ---------------------------------------------------------------------------
-- Storico: the rare threats met in a match
-- ---------------------------------------------------------------------------

create or replace function public.get_match_history(p_limit integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    (select m.* from public.matches m
     where m.status = 'finished' and m.player_a = auth.uid()
     order by m.finished_at desc
     limit greatest(1, least(coalesce(p_limit, 30), 100)))
    union all
    (select m.* from public.matches m
     where m.status = 'finished' and m.player_b = auth.uid()
     order by m.finished_at desc
     limit greatest(1, least(coalesce(p_limit, 30), 100)))
  )
  select coalesce(jsonb_agg(entry order by finished_at desc), '[]'::jsonb)
  from (
    select
      m.finished_at,
      jsonb_build_object(
        'id', m.id,
        'mode', m.mode,
        'format', m.format,
        'bot_difficulty', m.bot_difficulty,
        'finished_at', m.finished_at,
        'end_reason', m.end_reason,
        'result', case when m.result = 'draw' then 'draw' when (m.result = 'a') = (m.player_a = auth.uid()) then 'win' else 'loss' end,
        'rounds_me', case when m.player_a = auth.uid() then m.rounds_won_a else m.rounds_won_b end,
        'rounds_opponent', case when m.player_a = auth.uid() then m.rounds_won_b else m.rounds_won_a end,
        'points_me', case when m.player_a = auth.uid() then m.points_a else m.points_b end,
        'points_opponent', case when m.player_a = auth.uid() then m.points_b else m.points_a end,
        'boss_name', (select b.name from public.boss_definitions b where b.id = m.boss_id),
        'coins', coalesce(case when m.player_a = auth.uid() then m.reward_coins_a else m.reward_coins_b end, 0),
        'opponent', (
          select p.username from public.profiles p
          where p.id = case when m.player_a = auth.uid() then m.player_b else m.player_a end
        ),
        'conquest', (
          select jsonb_build_object(
            'won', c.winner_id is not distinct from auth.uid(),
            'bonus_coins', c.bonus_coins,
            'pending', c.resolved_at is null,
            'card_name', d.name,
            'card_color', r.color
          )
          from public.conquest_claims c
          left join public.card_instances i on i.id = c.chosen_instance_id
          left join public.card_definitions d on d.id = i.definition_id
          left join public.rarity_definitions r on r.code = d.rarity_code
          where c.match_id = m.id
        ),
        -- The rare threats the match revealed (rounds played), the rarest first.
        'rare_threats', (
          select coalesce(jsonb_agg(jsonb_build_object('name', x.name, 'rarity', x.rarity, 'color', x.color) order by x.rank desc), '[]'::jsonb)
          from (
            select distinct t.name, tr.name as rarity, tr.color, tr.rank
            from public.match_rounds mr
            join public.threat_definitions t on t.id = mr.threat_id
            join public.threat_rarities tr on tr.code = t.rarity_code
            where mr.match_id = m.id
          ) x
        )
      ) as entry
    from mine m
    order by m.finished_at desc
    limit greatest(1, least(coalesce(p_limit, 30), 100))
  ) s
$$;

-- ---------------------------------------------------------------------------
-- Admin: texts, rules and rarity of the threats; the tiers (/gestione-minacce)
-- ---------------------------------------------------------------------------

-- Every threat as an admin edits it, and the tiers.
create function public.admin_list_threats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  return jsonb_build_object(
    'rarities', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', r.code, 'name', r.name, 'rank', r.rank, 'color', r.color, 'one_in', r.one_in,
        'threats', (select count(*) from public.threat_definitions t where t.rarity_code = r.code and t.is_active)
      ) order by r.rank), '[]'::jsonb)
      from public.threat_rarities r
    ),
    'threats', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', t.code, 'name', t.name, 'flavor', t.flavor, 'level', t.level, 'region', t.region,
        'abilities', to_jsonb(t.required_abilities),
        'modifier_code', t.modifier_code, 'modifier_params', t.modifier_params,
        'rarity_code', t.rarity_code, 'emergency_target', t.emergency_target, 'is_active', t.is_active,
        'seen_by', (select count(*) from public.threat_sightings s where s.threat_id = t.id)
      ) order by tr.rank nulls first, t.region <> 'megara', t.region, t.level, t.code), '[]'::jsonb)
      from public.threat_definitions t
      left join public.threat_rarities tr on tr.code = t.rarity_code
    )
  );
end;
$$;

revoke execute on function public.admin_list_threats() from public, anon;
grant execute on function public.admin_list_threats() to authenticated;

-- Changes a threat. A match in progress keeps the rule it drew; the usual draws keep
-- enough threats of every level (the longest sequence, Emergenza's, may repeat one).
create function public.admin_update_threat(
  p_code text,
  p_name text,
  p_flavor text,
  p_modifier_code text,
  p_modifier_params jsonb,
  p_rarity_code text,
  p_emergency_target integer,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_needed integer := public.config_int('emergency.threats_per_run');
  v_short integer;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  if nullif(btrim(coalesce(p_name, '')), '') is null or char_length(btrim(p_name)) > 60 then
    raise exception 'invalid_name';
  end if;
  if char_length(coalesce(p_flavor, '')) > 300 then
    raise exception 'invalid_flavor';
  end if;
  if nullif(p_rarity_code, '') is not null and p_emergency_target is null then
    raise exception 'missing_target';
  end if;

  update public.threat_definitions set
    name = btrim(p_name),
    flavor = coalesce(btrim(p_flavor), ''),
    modifier_code = nullif(p_modifier_code, ''),
    modifier_params = coalesce(p_modifier_params, '{}'::jsonb),
    rarity_code = nullif(p_rarity_code, ''),
    emergency_target = p_emergency_target,
    is_active = coalesce(p_is_active, true)
  where code = p_code;
  if not found then
    raise exception 'threat_not_found';
  end if;

  -- Every level keeps as many usual threats of Nuova Megara as a run of Emergenza has.
  select min(n) into v_short from (
    select (select count(*) from public.threat_definitions t
            where t.level = l and t.is_active and t.region = 'megara' and t.rarity_code is null) as n
    from generate_series(1, 6) as l
  ) x;
  if v_short < v_needed then
    raise exception 'too_few_threats';
  end if;
end;
$$;

revoke execute on function public.admin_update_threat(text, text, text, text, jsonb, text, integer, boolean) from public, anon;
grant execute on function public.admin_update_threat(text, text, text, text, jsonb, text, integer, boolean) to authenticated;

create function public.admin_update_threat_rarity(p_code text, p_name text, p_color text, p_one_in integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  if nullif(btrim(coalesce(p_name, '')), '') is null or char_length(btrim(p_name)) > 30 then
    raise exception 'invalid_name';
  end if;
  if p_one_in is null or p_one_in < 0 or p_one_in > 10000000 then
    raise exception 'invalid_chance';
  end if;
  update public.threat_rarities
  set name = btrim(p_name), color = p_color, one_in = p_one_in, updated_at = now()
  where code = p_code;
  if not found then
    raise exception 'rarity_not_found';
  end if;
end;
$$;

revoke execute on function public.admin_update_threat_rarity(text, text, text, integer) from public, anon;
grant execute on function public.admin_update_threat_rarity(text, text, text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- The 29 rare threats (placeholder texts, like every content). Emergenza targets
-- tuned by simulation (SPEC §5.15).
-- ---------------------------------------------------------------------------

insert into public.threat_definitions
  (code, name, level, required_abilities, region, modifier_code, modifier_params, rarity_code, emergency_target, flavor) values
  -- Rare
  ('RA01', 'Il Vulcano si sveglia', 7, array['FOR', 'RES', 'ENE', 'VEL', 'VOL', 'PER', 'COM'], 'megara', 'frost', '{}', 'rare', 33,
   'Il sismografo salta di scala: la Montagna fuma sopra il porto e la cenere copre ogni talento.'),
  ('RA02', 'Notte senza Rintocco', 1, array['PER'], 'megara', 'tomb_silence', '{}', 'rare', 8,
   'A mezzanotte il campanile non suona. Nessun Eco nuovo, nessun Segno acceso: solo occhi nel buio.'),
  ('RA03', 'Sala degli specchi rotti', 3, array['PER', 'PSI', 'MAG'], 'megara', 'mirror', '{}', 'rare', 17,
   'Ogni specchio restituisce la persona sbagliata. Combatti con la forza di chi hai davanti.'),
  ('RA04', 'Nube di droni', 8, array['VEL', 'PER', 'TEC', 'ENE', 'INT', 'FUR', 'COM', 'RES'], 'megara', 'weak_link', '{}', 'rare', 42,
   'Ventimila droni consegna impazziti oscurano il sole. Ne basta uno sfuggito per perdere la città.'),
  ('RA05', 'Mercato nero dei Segni', 4, array['FUR', 'INT', 'VOL', 'PSI'], 'megara', 'hostile_ground',
   '{"favored": "villains", "hindered": "heroes"}', 'rare', 25,
   'Sotto i portici si vendono lastre rubate. Qui i Cattivi giocano in casa.'),
  ('RA06', 'Campione dei container', 2, array['FOR', 'COM'], 'megara', 'focus', '{}', 'rare', 18,
   'Un ring tra le gru della Banchina Est. Il campione accetta sfide da chiunque e non ha mai perso.'),
  ('RA07', 'Marea nera', 5, array['RES', 'ENE', 'MAG', 'PER', 'VOL'], 'megara', 'abyss',
   '{"abilities": ["ENE", "MAG", "PSI"]}', 'rare', 40,
   'L''acqua del porto diventa inchiostro e allunga le dita verso le banchine.'),
  ('RA08', 'Blackout totale', 6, array['TEC', 'ENE', 'INT', 'PER', 'FUR', 'VOL'], 'megara', 'all_or_nothing', '{}', 'rare', 31,
   'Nuova Megara al buio, quartiere per quartiere. Le mezze misure non accendono niente.'),
  -- Epic
  ('EP01', 'Il Colosso di bronzo', 8, array['FOR', 'RES', 'ENE', 'COM', 'TEC', 'VOL', 'VEL', 'PER'], 'megara', 'duel', '{}', 'epic', 20,
   'La statua affondata nel golfo si rialza, alta come un palazzo. Contro di lei serve il colpo migliore.'),
  ('EP02', 'Il Labirinto sotto Megara', 4, array['PER', 'INT', 'RES', 'VOL'], 'megara', 'weak_link', '{}', 'epic', 32,
   'Gli scavi della metro hanno aperto un labirinto che si sposta. Si perde chi ha un punto debole.'),
  ('EP03', 'Il mondo capovolto', 5, array['FOR', 'VEL', 'INT', 'MAG', 'FUR'], 'megara', 'reverse', '{}', 'epic', 20,
   'La città pende dal cielo a testa in giù. Vince chi fa meno: qui ogni cosa va al contrario.'),
  ('EP04', 'La lettera mancante', 1, array['MAG'], 'megara', 'last_first', '{}', 'epic', 12,
   'Dagli scavi esce una pietra con una lettera che nessuno sa leggere. Risponde soltanto ai più umili.'),
  ('EP05', 'Assedio dei mille Echi', 9, array['FOR', 'VEL', 'RES', 'INT', 'VOL', 'PER', 'ENE', 'COM', 'TEC'], 'megara', 'underdogs', '{}', 'epic', 49,
   'Mille Echi senza Reggente marciano sul municipio. La gente comune li conosce meglio delle leggende.'),
  ('EP06', 'L''ingorgo eterno', 3, array['VEL', 'TEC', 'VOL'], 'megara', 'long_count', '{}', 'epic', 18,
   'La tangenziale è ferma da tre giorni. Chi resta indietro, per una volta, passa avanti.'),
  ('EP07', 'La nave dei folli', 6, array['PSI', 'MAG', 'VOL', 'PER', 'RES', 'COM'], 'megara', 'tomb_silence', '{}', 'epic', 33,
   'Una nave con le vele strappate naviga tra le nuvole. A bordo i Segni tacciono.'),
  -- Legendary
  ('LE01', 'Il gigante della baia', 10, array['FOR', 'VEL', 'RES', 'INT', 'VOL', 'PER', 'ENE', 'MAG', 'COM', 'TEC'], 'megara', 'price', '{}', 'legendary', 47,
   'Il fondale si alza e diventa un uomo di pietra. Ogni debolezza si paga cara.'),
  ('LE02', 'L''Oracolo sepolto', 3, array['PSI', 'PER', 'INT'], 'megara', 'duel', '{"count": 1}', 'legendary', 10,
   'Sotto il tempio dell''Ora Zero l''Oracolo parla di nuovo. Ascolta una sola voce: la più forte.'),
  ('LE03', 'La centrale dell''Ora Zero', 7, array['ENE', 'MAG', 'PSI', 'TEC', 'INT', 'RES', 'VOL'], 'megara', 'one_force',
   '{"abilities": ["ENE", "MAG", "PSI"]}', 'legendary', 48,
   'La cupola si riaccende e il raggio torna a toccare il tempio. Energia, Magia e Psiche: una forza sola.'),
  ('LE04', 'Lo stormo dell''Alfabeto', 6, array['INT', 'MAG', 'FUR', 'VEL', 'VOL', 'TEC'], 'megara', 'focus', '{}', 'legendary', 41,
   'Le pietre incise si alzano in volo come storni. Bisogna leggerle prima che si posino.'),
  ('LE05', 'Il Banco salta', 4, array['INT', 'FUR', 'TEC', 'COM'], 'megara', 'all_or_nothing', '{}', 'legendary', 19,
   'Il caveau del Banco esplode di monete. Chi entra a metà, esce a mani vuote.'),
  ('LE06', 'L''ombra di mezzogiorno', 5, array['FUR', 'PER', 'PSI', 'VEL', 'MAG'], 'megara', 'reverse', '{}', 'legendary', 16,
   'Il sole è a picco ma le ombre sono lunghissime. Vince chi si fa più piccolo.'),
  -- Mythic
  ('MI01', 'Il Diluvio', 11, array['FOR', 'VEL', 'RES', 'INT', 'VOL', 'PER', 'ENE', 'MAG', 'PSI', 'COM', 'TEC'], 'megara', 'abyss',
   '{"abilities": ["ENE", "MAG", "PSI"]}', 'mythic', 68,
   'Piove da quaranta giorni. Di Nuova Megara restano le cime dei templi.'),
  ('MI02', 'La notte lunga un anno', 6, array['FOR', 'VEL', 'RES', 'INT', 'VOL', 'PER', 'ENE', 'MAG', 'PSI', 'COM', 'TEC', 'FUR'], 'megara', 'blind', '{}', 'mythic', 32,
   'La luna è nera e i lampioni si spengono uno a uno. Si sceglie al buio, senza sapere cosa serve.'),
  ('MI03', 'L''Ora Zero, di nuovo', 4, array['FOR', 'ENE', 'MAG', 'TEC'], 'megara', 'echo', '{}', 'mythic', 34,
   'I due cantieri si toccano un''altra volta. Quello che è appena successo torna indietro.'),
  -- Apocalyptic
  ('AP01', 'La Fine del Mondo', 12, array['FOR', 'VEL', 'RES', 'INT', 'VOL', 'PER', 'ENE', 'MAG', 'PSI', 'COM', 'TEC', 'FUR'], 'megara', null, '{}', 'apocalyptic', 58,
   'Il sismografo è fuori scala. La Montagna erutta, il cielo si spacca, l''Alfabeto gira sopra la città. Serve tutto.'),
  -- Unique
  ('UN01', 'L''Alfabeto completo', 12, array['FOR', 'VEL', 'RES', 'INT', 'VOL', 'PER', 'ENE', 'MAG', 'PSI', 'COM', 'TEC', 'FUR'], 'megara', 'count', '{}', 'unique', 7,
   'Tutte le lettere sono state ritrovate e si accendono in cerchio. Conta quante prove sai superare, non quanto bene.'),
  ('UN02', 'Il sismografo impazzito', 6, array['FOR', 'VEL', 'RES', 'INT', 'VOL', 'PER', 'ENE', 'MAG', 'PSI', 'COM', 'TEC', 'FUR'], 'megara', 'unknown_level',
   '{"min": 3}', 'unique', 25,
   'Il pennino disegna scosse che non esistono. Nessuno sa quanto sarà grande finché non arriva.'),
  ('UN03', 'Megara Due', 6, array['FOR', 'INT', 'ENE', 'COM', 'VOL', 'FUR'], 'megara', 'negative', '{}', 'unique', 34,
   'Sotto la città ne è comparsa un''altra, a testa in giù e coi colori rovesciati. Lì i deboli sono forti.'),
  ('UN04', 'Il tredicesimo rintocco', 12, array['FOR', 'VEL', 'RES', 'INT', 'VOL', 'PER', 'ENE', 'MAG', 'PSI', 'COM', 'TEC', 'FUR'], 'megara', 'negative', '{}', 'unique', 67,
   'A mezzanotte il campanile batte tredici colpi. Per un minuto le lastre più umili valgono più delle leggende.');
