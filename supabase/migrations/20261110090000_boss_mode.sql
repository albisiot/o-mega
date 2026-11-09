-- Grande Minaccia (SPEC §5.12): a boss with five fronts, all visible from the
-- start, and a table of the points each front is worth in each turn. Every turn
-- both sides secretly choose a character and a front; on the same front the two
-- characters compare as in a round, on different fronts each side holds its own
-- by reaching the presidio target (half the Emergenza one). Most points wins.
--
-- A Grande Minaccia match is a row of `matches` with format = 'boss': mode stays
-- bot or friendly, so experience, statistics and event points work unchanged.
-- threat_ids and threat_levels hold the five fronts in slot order, rounds_won_*
-- the fronts taken (a tie-break), current_round the turn. A turn is a row of
-- match_rounds with no threat; each play says its front, its points and, alone
-- on its front, the score it needed.
--
-- The engine (packages/game-engine/src/boss.ts) decides; the functions below
-- check what it sends: the turn, the cards, the fronts, the points against the
-- table and the scores, and the final result. No Conquest in this mode.
--
-- The six bosses are placeholders, like every other content of the game: names
-- and texts change when the universe is final; their fronts are threats of Nuova
-- Megara, chosen by hand.

insert into public.game_config (key, value, description) values
  ('boss.turns', '5', 'Grande Minaccia: turns of a match (one character each)'),
  ('boss.fronts', '5', 'Grande Minaccia: fronts of a boss'),
  ('boss.hot_fronts', '2', 'Grande Minaccia: fronts worth hot_value in turn 1'),
  ('boss.hot_value', '2', 'Grande Minaccia: points of a hot front in turn 1'),
  ('boss.base_value', '1', 'Grande Minaccia: points of the other fronts in turn 1'),
  ('boss.growth', '1', 'Grande Minaccia: points every front gains each later turn'),
  ('boss.extra_fronts', '2', 'Grande Minaccia: random fronts that gain extra_growth more each later turn'),
  ('boss.extra_growth', '1', 'Grande Minaccia: extra points of those fronts'),
  ('boss.targets.level1', '4', 'Grande Minaccia: score that holds a level 1 front alone'),
  ('boss.targets.level2', '7', 'Grande Minaccia: score that holds a level 2 front alone'),
  ('boss.targets.level3', '9', 'Grande Minaccia: score that holds a level 3 front alone'),
  ('boss.targets.level4', '12', 'Grande Minaccia: score that holds a level 4 front alone'),
  ('boss.targets.level5', '14', 'Grande Minaccia: score that holds a level 5 front alone'),
  ('boss.targets.level6', '16', 'Grande Minaccia: score that holds a level 6 front alone');

-- ---------------------------------------------------------------------------
-- Bosses
-- ---------------------------------------------------------------------------

create table public.boss_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^B[0-9]{2}$'),
  name text not null,
  flavor text not null,
  -- The diorama: "environment:actor" of src/lib/threat-scene.ts.
  scene text not null check (scene ~ '^[a-z]+(:[a-z]+)?$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.boss_fronts (
  boss_id uuid not null references public.boss_definitions (id) on delete cascade,
  slot smallint not null check (slot between 1 and 5),
  threat_id uuid not null references public.threat_definitions (id),
  primary key (boss_id, slot),
  unique (boss_id, threat_id)
);

create index boss_fronts_threat_id_idx on public.boss_fronts (threat_id);

alter table public.boss_definitions enable row level security;
alter table public.boss_fronts enable row level security;
revoke all on table public.boss_definitions, public.boss_fronts from anon, authenticated;
grant select on table public.boss_definitions, public.boss_fronts to authenticated, service_role;
-- The catalog is not secret: everything about a boss is visible in its match.
create policy "players read the bosses" on public.boss_definitions for select to authenticated using (true);
create policy "players read the fronts" on public.boss_fronts for select to authenticated using (true);

insert into public.boss_definitions (code, name, flavor, scene) values
  ('B01', 'Il Colosso del porto',
   'Il sismografo segna cinque scosse nello stesso punto: una gru si è alzata da sola e cammina verso i container.',
   'port:golem'),
  ('B02', 'La Signora dell''Eclissi',
   'Mezzogiorno, ma in via dei Templi è notte. Cinque candele si accendono insieme, e il sismografo trema con loro.',
   'ritual:eclipse'),
  ('B03', 'La Mente Madre',
   'Mezza città sogna la stessa cosa da tre notti. Stanotte il sogno ha cominciato a dare ordini.',
   'mind:shadow'),
  ('B04', 'La Fortezza nel cielo',
   'Sopra il golfo c''è una nuvola che non si muove col vento. Il sismografo la segna come un terremoto, ma in alto.',
   'sky:fortress'),
  ('B05', 'Il Gigante sotto Megara',
   'Le fogne respirano. Ogni respiro è una scossa, e il quartiere basso si inclina di un grado.',
   'sewer:monster'),
  ('B06', 'L''Ombra nella rete',
   'Tutti gli schermi della città mostrano lo stesso orologio. Quando arriverà a zero, qualcuno avrà vinto.',
   'control:globe');

insert into public.boss_fronts (boss_id, slot, threat_id)
select b.id, f.slot, t.id
from (values
  ('B01', 1, 'T107'), ('B01', 2, 'T201'), ('B01', 3, 'T310'), ('B01', 4, 'T404'), ('B01', 5, 'T509'),
  ('B02', 1, 'T105'), ('B02', 2, 'T205'), ('B02', 3, 'T303'), ('B02', 4, 'T403'), ('B02', 5, 'T606'),
  ('B03', 1, 'T104'), ('B03', 2, 'T209'), ('B03', 3, 'T305'), ('B03', 4, 'T406'), ('B03', 5, 'T505'),
  ('B04', 1, 'T106'), ('B04', 2, 'T207'), ('B04', 3, 'T307'), ('B04', 4, 'T409'), ('B04', 5, 'T504'),
  ('B05', 1, 'T102'), ('B05', 2, 'T204'), ('B05', 3, 'T304'), ('B05', 4, 'T401'), ('B05', 5, 'T501'),
  ('B06', 1, 'T103'), ('B06', 2, 'T206'), ('B06', 3, 'T306'), ('B06', 4, 'T410'), ('B06', 5, 'T608')
) as f(boss, slot, threat)
join public.boss_definitions b on b.code = f.boss
join public.threat_definitions t on t.code = f.threat;

-- Whether a boss can be played: one front per slot, distinct active threats of
-- Nuova Megara, with levels composed as in a match (SPEC §5.4).
create function public.boss_is_playable(p_boss_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select count(*) = public.config_int('boss.fronts')
    and count(distinct f.slot) = public.config_int('boss.fronts')
    and bool_and(t.is_active and t.region = 'megara')
    and min(t.level) <= public.config_int('match.threat_levels.require_one_at_most')
    and max(t.level) >= public.config_int('match.threat_levels.require_one_at_least')
    and sum(t.level) between public.config_int('match.threat_levels.min_sum') and public.config_int('match.threat_levels.max_sum')
  from public.boss_fronts f
  join public.threat_definitions t on t.id = f.threat_id
  join public.boss_definitions b on b.id = f.boss_id and b.is_active
  where f.boss_id = p_boss_id
$$;

revoke execute on function public.boss_is_playable(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Matches
-- ---------------------------------------------------------------------------

alter table public.matches
  add column format text not null default 'classic' check (format in ('classic', 'boss')),
  add column boss_id uuid references public.boss_definitions (id),
  -- values[turn][front], both 0-based: public from the start.
  add column boss_values jsonb,
  add column points_a integer not null default 0,
  add column points_b integer not null default 0,
  add constraint matches_boss_shape check (
    (format = 'boss') = (boss_id is not null and boss_values is not null)
    and (format = 'classic' or (mode in ('bot', 'friendly') and story_mission_id is null))
  );

create index matches_boss_id_idx on public.matches (boss_id);

-- A turn of the Grande Minaccia has no single threat: each side chose its front.
alter table public.match_rounds alter column threat_id drop not null;

alter table public.round_plays
  add column front_slot smallint check (front_slot between 1 and 5),
  add column points integer check (points >= 0),
  add column required integer check (required >= 0);

alter table public.pending_plays add column front_slot smallint check (front_slot between 1 and 5);

-- A play has a front exactly in a Grande Minaccia match, whoever writes it.
create function public.check_play_format()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.front_slot is not null) <> ((select format from public.matches where id = new.match_id) = 'boss') then
    raise exception 'invalid_front';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_play_format() from public, anon, authenticated;

create trigger round_plays_check_format
  before insert or update of front_slot on public.round_plays
  for each row execute function public.check_play_format();

create trigger pending_plays_check_format
  before insert or update of front_slot on public.pending_plays
  for each row execute function public.check_play_format();

-- No drawn modifier on the fronts of a boss: they are tuned on plain threats.
create or replace function public.set_threat_modifiers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.format = 'boss' then
    new.threat_modifiers := to_jsonb(array_fill(null::jsonb, array[cardinality(new.threat_ids)]));
  elsif tg_op = 'INSERT' then
    new.threat_modifiers := public.draw_match_modifiers(new.threat_ids);
  else
    new.threat_modifiers := public.with_place_modifiers(new.threat_modifiers, new.threat_ids);
  end if;
  return new;
end;
$$;

-- Whether a points table follows the rules: the same check as isValidBossValues.
create function public.valid_boss_values(p_values jsonb)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_turns integer := public.config_int('boss.turns');
  v_fronts integer := public.config_int('boss.fronts');
  v_hot_fronts integer := public.config_int('boss.hot_fronts');
  v_hot integer := public.config_int('boss.hot_value');
  v_base integer := public.config_int('boss.base_value');
  v_growth integer := public.config_int('boss.growth');
  v_extra_fronts integer := public.config_int('boss.extra_fronts');
  v_extra integer := public.config_int('boss.extra_growth');
  v_row jsonb;
  v_first integer;
  v_second integer;
begin
  if p_values is null or jsonb_typeof(p_values) <> 'array' or jsonb_array_length(p_values) <> v_turns then
    return false;
  end if;
  for t in 0 .. v_turns - 1 loop
    v_row := p_values -> t;
    if jsonb_typeof(v_row) <> 'array' or jsonb_array_length(v_row) <> v_fronts
       or exists (select 1 from jsonb_array_elements(v_row) e where jsonb_typeof(e) <> 'number' or e #>> '{}' !~ '^[0-9]{1,6}$') then
      return false;
    end if;
  end loop;

  select count(*) filter (where (e #>> '{}')::integer = v_hot), count(*) filter (where (e #>> '{}')::integer = v_base)
  into v_first, v_second
  from jsonb_array_elements(p_values -> 0) e;
  if (v_hot = v_base and v_second <> v_fronts)
     or (v_hot <> v_base and (v_first <> v_hot_fronts or v_second <> v_fronts - v_hot_fronts)) then
    return false;
  end if;

  for t in 1 .. v_turns - 1 loop
    select count(*) filter (where s = v_growth + v_extra), count(*) filter (where s = v_growth)
    into v_first, v_second
    from (
      select (c.e #>> '{}')::integer - (p.e #>> '{}')::integer as s
      from jsonb_array_elements(p_values -> t) with ordinality as c(e, ord)
      join jsonb_array_elements(p_values -> (t - 1)) with ordinality as p(e, ord) using (ord)
    ) steps;
    if (v_extra = 0 and v_second <> v_fronts)
       or (v_extra <> 0 and (v_first <> v_extra_fronts or v_second <> v_fronts - v_extra_fronts)) then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

revoke execute on function public.valid_boss_values(jsonb) from public, anon, authenticated;

-- Creates a Grande Minaccia match from checked teams: against a bot (no player B)
-- or between two players. The boss is drawn here among the playable ones, unless
-- one is given (tests); the points table comes from the engine and is checked.
create function public.insert_boss_match(
  p_mode text,
  p_player_a uuid,
  p_team_a uuid[],
  p_definitions_a uuid[],
  p_player_b uuid,
  p_team_b uuid[],
  p_definitions_b uuid[],
  p_bot_difficulty text,
  p_boss_values jsonb,
  p_boss_id uuid default null
)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_boss uuid;
  v_fronts uuid[];
  v_levels integer[];
  v_match uuid;
  v_bot boolean := p_mode = 'bot';
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
  if not public.valid_boss_values(p_boss_values) then
    raise exception 'invalid_boss_values';
  end if;

  select b.id into v_boss from public.boss_definitions b
  where b.is_active and (p_boss_id is null or b.id = p_boss_id) and public.boss_is_playable(b.id)
  order by random()
  limit 1;
  if v_boss is null then
    raise exception 'boss_not_found';
  end if;
  select array_agg(f.threat_id order by f.slot), array_agg(t.level order by f.slot)
  into v_fronts, v_levels
  from public.boss_fronts f join public.threat_definitions t on t.id = f.threat_id
  where f.boss_id = v_boss;

  insert into public.matches (mode, format, bot_difficulty, player_a, player_b, threat_ids, threat_levels, boss_id, boss_values)
  values (p_mode, 'boss', p_bot_difficulty, p_player_a, p_player_b, v_fronts, v_levels, v_boss, p_boss_values)
  returning id into v_match;

  insert into public.match_teams (match_id, side, user_id, card_instance_ids, definition_ids, last_seen_at) values
    (v_match, 'a', p_player_a, p_team_a, p_definitions_a, case when not v_bot then now() end),
    (v_match, 'b', p_player_b, p_team_b, p_definitions_b, case when not v_bot then now() end);

  insert into public.match_rounds (match_id, round, threat_id, deadline_at)
  values (
    v_match, 1, null,
    now() + make_interval(secs => public.config_int('match.reveal_pause_seconds')
                                  + public.config_int('match.round_timer_seconds'))
  );

  if not v_bot then
    delete from public.match_lobbies where host_id in (p_player_a, p_player_b);
    delete from public.matchmaking_queue where user_id in (p_player_a, p_player_b);
    perform public.notify_player(p_player_a, 'match_started', v_match);
    perform public.notify_player(p_player_b, 'match_started', v_match);
  end if;
  return v_match;
end;
$$;

revoke execute on function public.insert_boss_match(text, uuid, uuid[], uuid[], uuid, uuid[], uuid[], text, jsonb, uuid) from public, anon, authenticated;

-- A Grande Minaccia match against a bot, always friendly (SPEC §5.12).
create function public.match_create_boss_bot(
  p_user uuid,
  p_difficulty text,
  p_card_instance_ids uuid[],
  p_bot_definition_ids uuid[],
  p_boss_values jsonb,
  p_boss_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_size integer := public.config_int('match.team_size');
  v_definitions uuid[];
begin
  perform 1 from public.profiles where id = p_user for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  if public.has_active_match(p_user) then
    raise exception 'match_already_active';
  end if;
  if p_difficulty is null or p_difficulty not in ('easy', 'medium', 'hard', 'super_pro') then
    raise exception 'invalid_difficulty';
  end if;

  v_definitions := public.validate_team(p_user, p_card_instance_ids);

  if coalesce(cardinality(p_bot_definition_ids), 0) <> v_team_size
     or (select count(distinct d.id) from unnest(p_bot_definition_ids) as d(id)
         join public.card_definitions c on c.id = d.id and c.is_active) <> v_team_size then
    raise exception 'invalid_bot_team';
  end if;

  return public.insert_boss_match(
    'bot', p_user, p_card_instance_ids, v_definitions, null, null, p_bot_definition_ids, p_difficulty, p_boss_values, p_boss_id
  );
end;
$$;

revoke execute on function public.match_create_boss_bot(uuid, text, uuid[], uuid[], jsonb, uuid) from public, anon, authenticated;
grant execute on function public.match_create_boss_bot(uuid, text, uuid[], uuid[], jsonb, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Turns
-- ---------------------------------------------------------------------------

-- Stores a turn computed by the engine. Checks the turn, the cards, the fronts,
-- the points against the table and the scores, the choices submitted (between
-- players) or the deadline (against a bot), and the final result. A play is
-- { card_instance_id, definition_id, front_slot (1-based), base, bonus, score,
-- highest, auto_played, points, required (null on a contested front) }.
create function public.match_record_boss_turn(
  p_match_id uuid,
  p_turn integer,
  p_play_a jsonb,
  p_play_b jsonb,
  p_result text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_round public.match_rounds;
  v_team public.match_teams;
  v_pending public.pending_plays;
  v_side text;
  v_play jsonb;
  v_instance uuid;
  v_definition uuid;
  v_position integer;
  v_auto boolean;
  v_slot integer;
  v_points integer;
  v_required integer;
  v_score integer;
  v_value integer;
  v_slot_a integer := (p_play_a ->> 'front_slot')::integer;
  v_slot_b integer := (p_play_b ->> 'front_slot')::integer;
  v_points_a integer := (p_play_a ->> 'points')::integer;
  v_points_b integer := (p_play_b ->> 'points')::integer;
  v_won_a integer;
  v_won_b integer;
  v_total_a integer;
  v_total_b integer;
  v_finished boolean;
  v_result text;
  v_grace integer := public.config_int('match.timeout_grace_seconds');
begin
  select * into v_match from public.matches where id = p_match_id for update;
  if v_match.id is null or v_match.status <> 'active' then
    raise exception 'match_not_active';
  end if;
  if v_match.format <> 'boss' then
    raise exception 'invalid_format';
  end if;
  if v_match.current_round <> p_turn then
    raise exception 'round_already_resolved';
  end if;
  select * into v_round from public.match_rounds where match_id = p_match_id and round = p_turn;
  if v_round.match_id is null or v_round.resolved_at is not null then
    raise exception 'round_already_resolved';
  end if;
  if v_slot_a is null or v_slot_b is null
     or v_slot_a not between 1 and cardinality(v_match.threat_ids)
     or v_slot_b not between 1 and cardinality(v_match.threat_ids) then
    raise exception 'invalid_front';
  end if;

  foreach v_side in array array['a', 'b'] loop
    v_play := case v_side when 'a' then p_play_a else p_play_b end;
    v_slot := case v_side when 'a' then v_slot_a else v_slot_b end;
    select * into v_team from public.match_teams where match_id = p_match_id and side = v_side;
    v_definition := (v_play ->> 'definition_id')::uuid;
    v_instance := (v_play ->> 'card_instance_id')::uuid;
    v_auto := coalesce((v_play ->> 'auto_played')::boolean, false);
    v_points := (v_play ->> 'points')::integer;
    v_required := (v_play ->> 'required')::integer;
    v_score := (v_play ->> 'score')::integer;

    if v_team.card_instance_ids is not null then
      v_position := array_position(v_team.card_instance_ids, v_instance);
      if v_position is null or v_team.definition_ids[v_position] is distinct from v_definition then
        raise exception 'character_not_in_team';
      end if;
    elsif v_instance is not null or not (v_definition = any (v_team.definition_ids)) then
      raise exception 'character_not_in_team';
    end if;
    if exists (
      select 1 from public.round_plays
      where match_id = p_match_id and side = v_side and definition_id = v_definition
    ) then
      raise exception 'character_already_played';
    end if;

    if v_team.user_id is not null then
      if v_match.bot_difficulty is not null then
        -- A human choice after the deadline is refused: the engine must auto-play.
        if not v_auto and now() > v_round.deadline_at + make_interval(secs => v_grace) then
          raise exception 'round_expired';
        end if;
      else
        select * into v_pending from public.pending_plays
        where match_id = p_match_id and round = p_turn and side = v_side;
        if v_auto and v_pending.match_id is not null then
          raise exception 'choice_ignored';
        end if;
        if not v_auto and (v_pending.card_instance_id is distinct from v_instance or v_pending.front_slot is distinct from v_slot) then
          raise exception 'choice_not_submitted';
        end if;
        if v_auto and now() <= v_round.deadline_at + make_interval(secs => v_grace) then
          raise exception 'round_not_expired';
        end if;
      end if;
    end if;

    -- Points: the front's value in this turn, or nothing.
    v_value := (v_match.boss_values -> (p_turn - 1) ->> (v_slot - 1))::integer;
    if v_points is null or v_score is null or v_score < 0 or v_points not in (0, v_value) then
      raise exception 'invalid_points';
    end if;
    if v_slot_a = v_slot_b then
      if v_required is not null then
        raise exception 'invalid_points';
      end if;
    elsif v_required is null or v_required < 0 or (v_points > 0) <> (v_score >= v_required) then
      -- Alone on a front: held exactly when the score reaches the target.
      raise exception 'invalid_points';
    end if;

    insert into public.round_plays (
      match_id, round, side, card_instance_id, definition_id,
      base_score, bonus, score, highest_value, auto_played, front_slot, points, required
    ) values (
      p_match_id, p_turn, v_side, v_instance, v_definition,
      (v_play ->> 'base')::integer, (v_play ->> 'bonus')::integer, v_score,
      (v_play ->> 'highest')::integer, v_auto, v_slot, v_points, v_required
    );
  end loop;

  -- On the same front at most one side takes it, and never with the lower score.
  if v_slot_a = v_slot_b and (
    (v_points_a > 0 and v_points_b > 0)
    or (v_points_a > 0 and (p_play_a ->> 'score')::integer < (p_play_b ->> 'score')::integer)
    or (v_points_b > 0 and (p_play_b ->> 'score')::integer < (p_play_a ->> 'score')::integer)
  ) then
    raise exception 'invalid_points';
  end if;

  delete from public.pending_plays where match_id = p_match_id and round = p_turn;

  update public.match_rounds
  set winner_side = case
        when v_points_a > 0 and v_points_b = 0 then 'a'
        when v_points_b > 0 and v_points_a = 0 then 'b'
        else 'none'
      end,
      resolved_at = now()
  where match_id = p_match_id and round = p_turn;

  update public.matches
  set points_a = points_a + v_points_a,
      points_b = points_b + v_points_b,
      rounds_won_a = rounds_won_a + (v_points_a > 0)::integer,
      rounds_won_b = rounds_won_b + (v_points_b > 0)::integer,
      total_score_a = total_score_a + (p_play_a ->> 'score')::integer,
      total_score_b = total_score_b + (p_play_b ->> 'score')::integer
  where id = p_match_id
  returning points_a, points_b, rounds_won_a, rounds_won_b, total_score_a, total_score_b
  into v_points_a, v_points_b, v_won_a, v_won_b, v_total_a, v_total_b;

  -- Points, then fronts taken, then the sum of scores, then a draw.
  v_finished := p_turn >= least(public.config_int('boss.turns'), jsonb_array_length(v_match.boss_values));
  v_result := case
    when not v_finished then null
    when v_points_a <> v_points_b then case when v_points_a > v_points_b then 'a' else 'b' end
    when v_won_a <> v_won_b then case when v_won_a > v_won_b then 'a' else 'b' end
    when v_total_a <> v_total_b then case when v_total_a > v_total_b then 'a' else 'b' end
    else 'draw'
  end;
  if v_result is distinct from p_result then
    raise exception 'result_mismatch';
  end if;

  if v_finished then
    perform public.finish_match(p_match_id, v_result, 'completed');
  else
    insert into public.match_rounds (match_id, round, threat_id, deadline_at)
    values (
      p_match_id, p_turn + 1, null,
      now() + make_interval(secs => public.config_int('match.reveal_pause_seconds')
                                    + public.config_int('match.round_timer_seconds'))
    );
    update public.matches set current_round = p_turn + 1 where id = p_match_id;
    perform public.notify_match(p_match_id, 'round');
  end if;
end;
$$;

-- Stores a turn, then returns the match as the given side sees it.
create function public.match_record_boss_turn_state(
  p_match_id uuid,
  p_turn integer,
  p_play_a jsonb,
  p_play_b jsonb,
  p_result text,
  p_side text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.match_record_boss_turn(p_match_id, p_turn, p_play_a, p_play_b, p_result);
  return public.match_state_payload(p_match_id, p_side);
end;
$$;

revoke execute on function public.match_record_boss_turn(uuid, integer, jsonb, jsonb, text) from public, anon, authenticated;
revoke execute on function public.match_record_boss_turn_state(uuid, integer, jsonb, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.match_record_boss_turn_state(uuid, integer, jsonb, jsonb, text, text) to service_role;

-- Same as before, with the format, the points table and the fronts of each play.
create or replace function public.match_round_context(p_user uuid, p_match_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_side text;
begin
  select * into v_match from public.matches where id = p_match_id;
  v_side := case when v_match.player_a = p_user then 'a' when v_match.player_b = p_user then 'b' end;
  if v_side is null then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'side', v_side,
    'match', jsonb_build_object(
      'status', v_match.status,
      'format', v_match.format,
      'bot_difficulty', v_match.bot_difficulty,
      'current_round', v_match.current_round,
      'threat_ids', to_jsonb(v_match.threat_ids),
      'threat_modifiers', v_match.threat_modifiers,
      'boss_values', v_match.boss_values
    ),
    'teams', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'side', t.side,
        'card_instance_ids', to_jsonb(t.card_instance_ids),
        'definition_ids', to_jsonb(t.definition_ids)
      )), '[]'::jsonb)
      from public.match_teams t where t.match_id = p_match_id
    ),
    'rounds', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'round', r.round,
        'deadline_at', r.deadline_at,
        'winner_side', r.winner_side,
        'resolved_at', r.resolved_at
      ) order by r.round), '[]'::jsonb)
      from public.match_rounds r where r.match_id = p_match_id
    ),
    'plays', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'round', p.round,
        'side', p.side,
        'card_instance_id', p.card_instance_id,
        'definition_id', p.definition_id,
        'base_score', p.base_score,
        'bonus', p.bonus,
        'score', p.score,
        'highest_value', p.highest_value,
        'auto_played', p.auto_played,
        'front_slot', p.front_slot,
        'points', p.points,
        'required', p.required
      )), '[]'::jsonb)
      from public.round_plays p where p.match_id = p_match_id
    ),
    -- Choices already submitted for the current round (matches between players).
    'pending', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'side', q.side, 'card_instance_id', q.card_instance_id, 'front_slot', q.front_slot
      )), '[]'::jsonb)
      from public.pending_plays q where q.match_id = p_match_id and q.round = v_match.current_round
    )
  );
end;
$$;

-- An opposing Annullatore stops a power only on the same front: in a classic
-- match both plays have no front, so it is every opposing play, as before.
create or replace function public.nullified_in_round(p_match_id uuid, p_round integer, p_side text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select m.threat_modifiers -> (p_round - 1) ->> 'code' = 'tomb_silence'
    from public.matches m where m.id = p_match_id
  ), false)
  or exists (
    select 1 from public.round_plays o
    join public.card_definitions d on d.id = o.definition_id
    where o.match_id = p_match_id and o.round = p_round and o.side <> p_side and d.power_code = 'nullifier'
      and o.front_slot is not distinct from (
        select s.front_slot from public.round_plays s
        where s.match_id = p_match_id and s.round = p_round and s.side = p_side
      )
  )
$$;

-- ---------------------------------------------------------------------------
-- The match as a player sees it
-- ---------------------------------------------------------------------------

-- The classic payload: the body of match_state_payload as of
-- 20261108210000_four_powers_new_characters.sql, with the format.
create function public.classic_match_state_payload(p_match_id uuid, p_side text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with m as (
    select * from public.matches where id = p_match_id
  ), mine as (
    select * from public.match_teams where match_id = p_match_id and side = p_side
  ), theirs as (
    select * from public.match_teams where match_id = p_match_id and side <> p_side
  )
  select jsonb_build_object(
    'id', m.id,
    'mode', m.mode,
    'format', m.format,
    'bot_difficulty', m.bot_difficulty,
    'status', m.status,
    'my_side', p_side,
    'current_round', m.current_round,
    'threat_levels', to_jsonb(m.threat_levels),
    'rounds_won', jsonb_build_object(
      'me', case p_side when 'a' then m.rounds_won_a else m.rounds_won_b end,
      'opponent', case p_side when 'a' then m.rounds_won_b else m.rounds_won_a end
    ),
    'total_score', jsonb_build_object(
      'me', case p_side when 'a' then m.total_score_a else m.total_score_b end,
      'opponent', case p_side when 'a' then m.total_score_b else m.total_score_a end
    ),
    'result', case when m.result is null then null when m.result = 'draw' then 'draw'
                   when m.result = p_side then 'win' else 'loss' end,
    'end_reason', m.end_reason,
    'reward_coins', case p_side when 'a' then m.reward_coins_a else m.reward_coins_b end,
    'level_rewards', coalesce((
      select jsonb_agg(jsonb_build_object('level', lr.level, 'coins', lr.coins) order by lr.level)
      from public.level_rewards lr
      where lr.match_id = p_match_id and lr.user_id = (select user_id from mine)
    ), '[]'::jsonb),
    'level_unlocks', coalesce((
      select jsonb_agg(jsonb_build_object('name', d.name, 'level', d.unlock_level) order by d.unlock_level)
      from public.level_unlocks lu
      join public.card_definitions d on d.id = lu.definition_id
      where lu.match_id = p_match_id and lu.user_id = (select user_id from mine)
    ), '[]'::jsonb),
    'server_now', now(),
    'conquest', public.conquest_payload(p_match_id, p_side),
    'opponent', (
      select jsonb_build_object(
        'username', pr.username, 'avatar_url', pr.avatar_url, 'level', pr.level,
        'last_seen_at', theirs.last_seen_at
      )
      from theirs join public.profiles pr on pr.id = theirs.user_id
    ),
    -- Veggente: only for the side that played it, only the rounds still to come,
    -- unless an Annullatore stopped it.
    -- Spia: only for the side that played it.
    'spied_cards', coalesce((
      select jsonb_agg(public.card_payload(sr.definition_id, null) || jsonb_build_object('round', sr.round) order by sr.round)
      from public.spy_reveals sr
      where sr.match_id = p_match_id and sr.side = p_side
    ), '[]'::jsonb),
    'foreseen_threats', coalesce(case when exists (
      select 1 from public.round_plays rp
      join public.card_definitions d on d.id = rp.definition_id
      where rp.match_id = p_match_id and rp.side = p_side and d.power_code = 'foresight'
        -- An Annullatore played against it in the same round stops it.
        and not public.nullified_in_round(p_match_id, rp.round, p_side)
    ) then (
      select jsonb_agg(jsonb_build_object(
        'round', u.ord, 'level', t.level, 'name', t.name, 'abilities', to_jsonb(t.required_abilities),
        'modifier', m.threat_modifiers -> (u.ord::integer - 1)
      ) order by u.ord)
      from unnest(m.threat_ids) with ordinality as u(id, ord)
      join public.threat_definitions t on t.id = u.id
      where u.ord > m.current_round
    ) end, '[]'::jsonb),
    'my_team', (
      select jsonb_agg(public.card_payload(u.definition_id, u.instance_id) || jsonb_build_object(
        'instance_id', u.instance_id,
        'played_round', (
          select rp.round from public.round_plays rp
          where rp.match_id = p_match_id and rp.side = p_side and rp.card_instance_id = u.instance_id
        )
      ) order by u.ord)
      from mine, unnest(mine.card_instance_ids, mine.definition_ids) with ordinality as u(instance_id, definition_id, ord)
    ),
    'rounds', coalesce((
      select jsonb_agg(jsonb_build_object(
        'round', mr.round,
        'level', t.level,
        'modifier', m.threat_modifiers -> (mr.round - 1),
        'threat', jsonb_build_object('name', t.name, 'abilities', to_jsonb(t.required_abilities), 'flavor', t.flavor),
        'deadline_at', mr.deadline_at,
        'resolved', mr.resolved_at is not null,
        'winner', case
          when mr.resolved_at is null then null
          when mr.winner_side = 'none' then 'none'
          when mr.winner_side = p_side then 'me'
          else 'opponent' end,
        'my_pending_instance_id', (
          select pp.card_instance_id from public.pending_plays pp
          where pp.match_id = p_match_id and pp.round = mr.round and pp.side = p_side
        ),
        -- Only whether the opponent has chosen, never what.
        'opponent_has_chosen', exists (
          select 1 from public.pending_plays pp
          where pp.match_id = p_match_id and pp.round = mr.round and pp.side <> p_side
        ),
        'my_play', (
          select jsonb_build_object(
            'instance_id', rp.card_instance_id, 'definition_id', rp.definition_id,
            'base', rp.base_score, 'bonus', rp.bonus, 'score', rp.score,
            'highest', rp.highest_value, 'auto_played', rp.auto_played
          )
          from public.round_plays rp
          where rp.match_id = p_match_id and rp.round = mr.round and rp.side = p_side
        ),
        -- The opponent's play only once the round is resolved.
        'opponent_play', case when mr.resolved_at is null then null else (
          select public.card_payload(rp.definition_id, rp.card_instance_id) || jsonb_build_object(
            'base', rp.base_score, 'bonus', rp.bonus, 'score', rp.score,
            'highest', rp.highest_value, 'auto_played', rp.auto_played
          )
          from public.round_plays rp
          where rp.match_id = p_match_id and rp.round = mr.round and rp.side <> p_side
        ) end
      ) order by mr.round)
      from public.match_rounds mr
      join public.threat_definitions t on t.id = mr.threat_id
      where mr.match_id = p_match_id
    ), '[]'::jsonb)
  )
  from m
$$;

-- A Grande Minaccia match as one side sees it: the boss, its fronts and the whole
-- points table from the start; the opponent's play of a turn only once resolved.
create function public.boss_state_payload(p_match_id uuid, p_side text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with m as (
    select * from public.matches where id = p_match_id
  ), mine as (
    select * from public.match_teams where match_id = p_match_id and side = p_side
  ), theirs as (
    select * from public.match_teams where match_id = p_match_id and side <> p_side
  )
  select jsonb_build_object(
    'id', m.id,
    'mode', m.mode,
    'format', m.format,
    'bot_difficulty', m.bot_difficulty,
    'status', m.status,
    'my_side', p_side,
    'current_round', m.current_round,
    'turns', least(public.config_int('boss.turns'), jsonb_array_length(m.boss_values)),
    'boss', (
      select jsonb_build_object('code', b.code, 'name', b.name, 'flavor', b.flavor, 'scene', b.scene)
      from public.boss_definitions b where b.id = m.boss_id
    ),
    'fronts', (
      select jsonb_agg(jsonb_build_object(
        'front', u.ord - 1, 'name', t.name, 'level', t.level,
        'abilities', to_jsonb(t.required_abilities), 'flavor', t.flavor
      ) order by u.ord)
      from unnest(m.threat_ids) with ordinality as u(id, ord)
      join public.threat_definitions t on t.id = u.id
    ),
    'values', m.boss_values,
    'presidio_targets', (
      select jsonb_object_agg(l::text, public.config_int('boss.targets.level' || l))
      from generate_series(1, 6) as l
    ),
    'points', jsonb_build_object(
      'me', case p_side when 'a' then m.points_a else m.points_b end,
      'opponent', case p_side when 'a' then m.points_b else m.points_a end
    ),
    'fronts_taken', jsonb_build_object(
      'me', case p_side when 'a' then m.rounds_won_a else m.rounds_won_b end,
      'opponent', case p_side when 'a' then m.rounds_won_b else m.rounds_won_a end
    ),
    'total_score', jsonb_build_object(
      'me', case p_side when 'a' then m.total_score_a else m.total_score_b end,
      'opponent', case p_side when 'a' then m.total_score_b else m.total_score_a end
    ),
    'result', case when m.result is null then null when m.result = 'draw' then 'draw'
                   when m.result = p_side then 'win' else 'loss' end,
    'end_reason', m.end_reason,
    'reward_coins', case p_side when 'a' then m.reward_coins_a else m.reward_coins_b end,
    'level_rewards', coalesce((
      select jsonb_agg(jsonb_build_object('level', lr.level, 'coins', lr.coins) order by lr.level)
      from public.level_rewards lr
      where lr.match_id = p_match_id and lr.user_id = (select user_id from mine)
    ), '[]'::jsonb),
    'level_unlocks', coalesce((
      select jsonb_agg(jsonb_build_object('name', d.name, 'level', d.unlock_level) order by d.unlock_level)
      from public.level_unlocks lu
      join public.card_definitions d on d.id = lu.definition_id
      where lu.match_id = p_match_id and lu.user_id = (select user_id from mine)
    ), '[]'::jsonb),
    'server_now', now(),
    'opponent', (
      select jsonb_build_object(
        'username', pr.username, 'avatar_url', pr.avatar_url, 'level', pr.level,
        'last_seen_at', theirs.last_seen_at
      )
      from theirs join public.profiles pr on pr.id = theirs.user_id
    ),
    'spied_cards', coalesce((
      select jsonb_agg(public.card_payload(sr.definition_id, null) || jsonb_build_object('round', sr.round) order by sr.round)
      from public.spy_reveals sr
      where sr.match_id = p_match_id and sr.side = p_side
    ), '[]'::jsonb),
    'my_team', (
      select jsonb_agg(public.card_payload(u.definition_id, u.instance_id) || jsonb_build_object(
        'instance_id', u.instance_id,
        'played_round', (
          select rp.round from public.round_plays rp
          where rp.match_id = p_match_id and rp.side = p_side and rp.card_instance_id = u.instance_id
        )
      ) order by u.ord)
      from mine, unnest(mine.card_instance_ids, mine.definition_ids) with ordinality as u(instance_id, definition_id, ord)
    ),
    'rounds', coalesce((
      select jsonb_agg(jsonb_build_object(
        'round', mr.round,
        'deadline_at', mr.deadline_at,
        'resolved', mr.resolved_at is not null,
        'my_pending', (
          select jsonb_build_object('instance_id', pp.card_instance_id, 'front', pp.front_slot - 1)
          from public.pending_plays pp
          where pp.match_id = p_match_id and pp.round = mr.round and pp.side = p_side
        ),
        -- Only whether the opponent has chosen, never what nor where.
        'opponent_has_chosen', exists (
          select 1 from public.pending_plays pp
          where pp.match_id = p_match_id and pp.round = mr.round and pp.side <> p_side
        ),
        'my_play', (
          select jsonb_build_object(
            'instance_id', rp.card_instance_id, 'definition_id', rp.definition_id,
            'base', rp.base_score, 'bonus', rp.bonus, 'score', rp.score,
            'highest', rp.highest_value, 'auto_played', rp.auto_played,
            'front', rp.front_slot - 1, 'points', rp.points, 'required', rp.required
          )
          from public.round_plays rp
          where rp.match_id = p_match_id and rp.round = mr.round and rp.side = p_side
        ),
        'opponent_play', case when mr.resolved_at is null then null else (
          select public.card_payload(rp.definition_id, rp.card_instance_id) || jsonb_build_object(
            'base', rp.base_score, 'bonus', rp.bonus, 'score', rp.score,
            'highest', rp.highest_value, 'auto_played', rp.auto_played,
            'front', rp.front_slot - 1, 'points', rp.points, 'required', rp.required
          )
          from public.round_plays rp
          where rp.match_id = p_match_id and rp.round = mr.round and rp.side <> p_side
        ) end
      ) order by mr.round)
      from public.match_rounds mr
      where mr.match_id = p_match_id
    ), '[]'::jsonb)
  )
  from m
$$;

-- Every caller of match_state_payload gets the payload of the match's format.
-- To change the classic payload, replace classic_match_state_payload.
create or replace function public.match_state_payload(p_match_id uuid, p_side text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select format from public.matches where id = p_match_id) = 'boss' then
    return public.boss_state_payload(p_match_id, p_side);
  end if;
  return public.classic_match_state_payload(p_match_id, p_side);
end;
$$;

revoke execute on function public.classic_match_state_payload(uuid, text) from public, anon, authenticated;
revoke execute on function public.boss_state_payload(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Between players: choices with a front, friend codes and queue by format
-- ---------------------------------------------------------------------------

drop function public.match_submit_play(uuid, uuid, integer, uuid);

-- Same as before; in a Grande Minaccia match the choice also names a front (1-based).
create function public.match_submit_play(
  p_user uuid,
  p_match_id uuid,
  p_round integer,
  p_card_instance_id uuid,
  p_front_slot integer default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_round public.match_rounds;
  v_side text;
  v_team public.match_teams;
begin
  select * into v_match from public.matches where id = p_match_id for update;
  v_side := case when v_match.player_a = p_user then 'a' when v_match.player_b = p_user then 'b' end;
  if v_side is null or v_match.bot_difficulty is not null then
    raise exception 'match_not_found';
  end if;
  if v_match.status <> 'active' then
    raise exception 'match_not_active';
  end if;
  if v_match.current_round <> p_round then
    raise exception 'round_already_resolved';
  end if;
  if (v_match.format = 'boss') <> (p_front_slot is not null)
     or (p_front_slot is not null and p_front_slot not between 1 and cardinality(v_match.threat_ids)) then
    raise exception 'invalid_front';
  end if;
  select * into v_round from public.match_rounds where match_id = p_match_id and round = p_round;
  if now() > v_round.deadline_at + make_interval(secs => public.config_int('match.timeout_grace_seconds')) then
    raise exception 'round_expired';
  end if;

  select * into v_team from public.match_teams where match_id = p_match_id and side = v_side;
  if not (p_card_instance_id = any (v_team.card_instance_ids)) then
    raise exception 'character_not_available';
  end if;
  if exists (
    select 1 from public.round_plays
    where match_id = p_match_id and side = v_side and card_instance_id = p_card_instance_id
  ) then
    raise exception 'character_already_played';
  end if;

  -- A player may change their mind until the round is resolved.
  insert into public.pending_plays (match_id, round, side, card_instance_id, front_slot)
  values (p_match_id, p_round, v_side, p_card_instance_id, p_front_slot)
  on conflict (match_id, round, side) do update
  set card_instance_id = excluded.card_instance_id, front_slot = excluded.front_slot, submitted_at = now();

  update public.match_teams set last_seen_at = now() where match_id = p_match_id and side = v_side;
  perform public.notify_match(p_match_id, 'choice');

  return case
    when (select count(*) from public.pending_plays where match_id = p_match_id and round = p_round) = 2
    then 'ready' else 'waiting'
  end;
end;
$$;

revoke execute on function public.match_submit_play(uuid, uuid, integer, uuid, integer) from public, anon, authenticated;
grant execute on function public.match_submit_play(uuid, uuid, integer, uuid, integer) to service_role;

alter table public.match_lobbies
  add column format text not null default 'classic' check (format in ('classic', 'boss'));
alter table public.matchmaking_queue
  add column format text not null default 'classic' check (format in ('classic', 'boss'));

drop function public.create_lobby(uuid[]);

-- Same as before, for a classic match or a Grande Minaccia.
create function public.create_lobby(p_card_instance_ids uuid[], p_format text default 'classic')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_expires timestamptz := now() + make_interval(mins => public.config_int('matchmaking.friend_code_minutes'));
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_format is null or p_format not in ('classic', 'boss') then
    raise exception 'invalid_request';
  end if;
  perform public.validate_team(v_uid, p_card_instance_ids);
  perform pg_advisory_xact_lock(hashtext('o-mega.matchmaking'));
  if public.has_active_match(v_uid) then
    raise exception 'match_already_active';
  end if;

  delete from public.match_lobbies where host_id = v_uid;
  delete from public.matchmaking_queue where user_id = v_uid;
  loop
    v_code := (
      select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1), '')
      from generate_series(1, 6)
    );
    exit when not exists (select 1 from public.match_lobbies where code = v_code);
  end loop;

  insert into public.match_lobbies (code, host_id, card_instance_ids, expires_at, format)
  values (v_code, v_uid, p_card_instance_ids, v_expires, p_format);
  return jsonb_build_object('code', v_code, 'expires_at', v_expires, 'format', p_format);
end;
$$;

revoke execute on function public.create_lobby(uuid[], text) from public, anon;
grant execute on function public.create_lobby(uuid[], text) to authenticated;

drop function public.match_join_lobby(uuid, text, uuid[], uuid[]);

-- Same as before: the lobby says the format; a Grande Minaccia needs the points
-- table the Edge Function drew (it sends one on every join).
create function public.match_join_lobby(
  p_guest uuid,
  p_code text,
  p_team uuid[],
  p_threat_ids uuid[],
  p_boss_values jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lobby public.match_lobbies;
  v_guest_definitions uuid[];
  v_host_definitions uuid[];
begin
  select * into v_lobby from public.match_lobbies where code = upper(btrim(p_code));
  if v_lobby.code is null or v_lobby.expires_at < now() then
    raise exception 'lobby_not_found';
  end if;
  if v_lobby.host_id = p_guest then
    raise exception 'cannot_play_yourself';
  end if;
  v_guest_definitions := public.validate_team(p_guest, p_team);

  perform pg_advisory_xact_lock(hashtext('o-mega.matchmaking'));
  select * into v_lobby from public.match_lobbies where code = upper(btrim(p_code));
  if v_lobby.code is null or v_lobby.expires_at < now() then
    raise exception 'lobby_not_found';
  end if;
  v_host_definitions := public.check_team(v_lobby.host_id, v_lobby.card_instance_ids);
  if v_lobby.format = 'boss' then
    return public.insert_boss_match(
      'friendly', v_lobby.host_id, v_lobby.card_instance_ids, v_host_definitions,
      p_guest, p_team, v_guest_definitions, null, p_boss_values
    );
  end if;
  return public.insert_pvp_match(
    'friendly', v_lobby.host_id, v_lobby.card_instance_ids, v_host_definitions,
    p_guest, p_team, v_guest_definitions, p_threat_ids
  );
end;
$$;

revoke execute on function public.match_join_lobby(uuid, text, uuid[], uuid[], jsonb) from public, anon, authenticated;
grant execute on function public.match_join_lobby(uuid, text, uuid[], uuid[], jsonb) to service_role;

drop function public.match_queue_join(uuid, text, uuid[], uuid[], text, uuid[]);

-- Same as before, with the format: players wait for an opponent of the same
-- mode and format. The Grande Minaccia is friendly only.
create function public.match_queue_join(
  p_user uuid,
  p_mode text,
  p_team uuid[],
  p_threat_ids uuid[],
  p_bot_difficulty text default null,
  p_bot_definition_ids uuid[] default null,
  p_format text default 'classic',
  p_boss_values jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_opponent public.matchmaking_queue;
  v_definitions uuid[];
  v_opponent_definitions uuid[];
  v_level integer;
  v_value integer;
  v_since timestamptz;
  v_bot_due boolean;
begin
  if p_mode not in ('friendly', 'conquest') or p_format is null or p_format not in ('classic', 'boss')
     or (p_format = 'boss' and p_mode <> 'friendly') then
    raise exception 'invalid_request';
  end if;

  -- The caller's own checks need no lock.
  v_definitions := case p_mode
    when 'conquest' then public.validate_conquest_team(p_user, p_team)
    else public.validate_team(p_user, p_team)
  end;
  if public.has_active_match(p_user) then
    raise exception 'match_already_active';
  end if;

  select level into v_level from public.profiles where id = p_user;
  v_value := public.team_value(v_definitions);
  select enqueued_at into v_since from public.matchmaking_queue
  where user_id = p_user and mode = p_mode and format = p_format;
  v_since := coalesce(v_since, now());
  v_bot_due := p_mode = 'conquest' and p_bot_difficulty is not null
    and v_since <= now() - make_interval(secs => public.config_int('matchmaking.conquest_bot_after_seconds'));

  if v_bot_due or exists (
    select 1 from public.queue_candidates(p_user, p_mode, v_level, v_value, v_since) q where q.format = p_format
  ) then
    -- Serializes pairing: two players can never be paired twice at once.
    perform pg_advisory_xact_lock(hashtext('o-mega.matchmaking'));
    if public.has_active_match(p_user) then
      raise exception 'match_already_active';
    end if;

    for v_opponent in
      select * from public.queue_candidates(p_user, p_mode, v_level, v_value, v_since) q
      where q.format = p_format
      order by q.enqueued_at
    loop
      begin
        v_opponent_definitions := case p_mode
          when 'conquest' then public.check_conquest_team(v_opponent.user_id, v_opponent.card_instance_ids)
          else public.check_team(v_opponent.user_id, v_opponent.card_instance_ids)
        end;
        -- The player who waited longer is player A.
        if p_format = 'boss' then
          return public.insert_boss_match(
            'friendly', v_opponent.user_id, v_opponent.card_instance_ids, v_opponent_definitions,
            p_user, p_team, v_definitions, null, p_boss_values
          );
        end if;
        return public.insert_pvp_match(
          p_mode, v_opponent.user_id, v_opponent.card_instance_ids, v_opponent_definitions,
          p_user, p_team, v_definitions, p_threat_ids
        );
      exception when others then
        -- That entry is no longer valid (cards gone, already playing): drop it.
        if sqlerrm not in (
          'card_not_owned', 'duplicate_card', 'duplicate_character', 'invalid_team_size', 'match_already_active',
          'card_at_stake', 'conquest_locked', 'daily_loss_limit', 'card_locked', 'not_enough_conquerable', 'same_pair_cooldown'
        ) then
          raise;
        end if;
        delete from public.matchmaking_queue where user_id = v_opponent.user_id;
      end;
    end loop;

    if v_bot_due then
      return public.insert_conquest_bot_match(p_user, p_team, v_definitions, p_bot_difficulty, p_bot_definition_ids, p_threat_ids);
    end if;
  end if;

  -- Rows of the caller's own are locked only now, never while queuing for the lock.
  delete from public.match_lobbies where host_id = p_user;
  insert into public.matchmaking_queue (user_id, mode, card_instance_ids, level, team_value, format)
  values (p_user, p_mode, p_team, v_level, v_value, p_format)
  on conflict (user_id) do update
  set mode = excluded.mode, format = excluded.format, card_instance_ids = excluded.card_instance_ids,
      level = excluded.level, team_value = excluded.team_value, refreshed_at = now(),
      enqueued_at = case when public.matchmaking_queue.mode = excluded.mode and public.matchmaking_queue.format = excluded.format
                         then public.matchmaking_queue.enqueued_at else now() end;
  return null;
end;
$$;

revoke execute on function public.match_queue_join(uuid, text, uuid[], uuid[], text, uuid[], text, jsonb) from public, anon, authenticated;
grant execute on function public.match_queue_join(uuid, text, uuid[], uuid[], text, uuid[], text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- History: the format, and the points of a Grande Minaccia
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
        )
      ) as entry
    from mine m
    order by m.finished_at desc
    limit greatest(1, least(coalesce(p_limit, 30), 100))
  ) s
$$;

-- The match in progress, with its format: Gioca names a Grande Minaccia as such.
create or replace function public.get_active_match()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then
    return null;
  end if;
  perform public.close_abandoned_matches(v_uid);
  select jsonb_build_object(
    'id', m.id, 'mode', m.mode, 'format', m.format, 'bot_difficulty', m.bot_difficulty, 'current_round', m.current_round
  )
  into v_result
  from public.matches m
  where m.status = 'active' and (m.player_a = v_uid or m.player_b = v_uid)
  limit 1;
  return v_result;
end;
$$;
