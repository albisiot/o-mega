-- Imprese (SPEC §8.5): long-term objectives, secret until completed. An admin keeps the
-- catalog from the app (/gestione-imprese); no client reads it. A player only ever gets,
-- for an impresa not yet completed, its place, its tier and the hint the admin wrote:
-- never the condition. The server checks the conditions in the transaction that records
-- what the player did (triggers below) and when the page opens; a completed impresa keeps
-- a copy of its name, text and reward, so later edits never change it. The reward is
-- claimed once, whenever the player likes (no expiry).

alter table public.coin_ledger drop constraint coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in (
  'pack_purchase', 'match_reward', 'bot_match_reward', 'duplicate_conversion', 'conquest_bonus', 'level_reward',
  'emergency_reward', 'bonus_code', 'story_reward', 'event_reward', 'objective_reward', 'achievement_reward',
  'admin_adjustment'
));

alter table public.card_instances drop constraint card_instances_acquired_via_check;
alter table public.card_instances add constraint card_instances_acquired_via_check
  check (acquired_via in ('starter', 'pack', 'conquest', 'trade', 'level_unlock', 'bonus_code', 'story', 'event',
                          'objective', 'achievement'));

alter table public.card_transfers drop constraint card_transfers_reason_check;
alter table public.card_transfers add constraint card_transfers_reason_check
  check (reason in ('starter', 'pack', 'conquest', 'trade', 'conversion', 'level_unlock', 'bonus_code', 'story', 'event',
                    'objective', 'achievement'));

alter table public.pack_openings drop constraint pack_openings_pack_type_check;
alter table public.pack_openings add constraint pack_openings_pack_type_check
  check (pack_type in ('daily', 'standard', 'bonus', 'event', 'special', 'objective', 'match', 'achievement'));

alter table public.player_notifications drop constraint player_notifications_kind_check;
alter table public.player_notifications add constraint player_notifications_kind_check
  check (kind in ('objective_completed', 'event_reward', 'achievement'));

-- The title the player shows (a copy of an impresa's title they completed), or null.
alter table public.profiles add column title text check (title is null or char_length(title) between 2 and 30);

-- ---------------------------------------------------------------------------
-- What an impresa can count, and its filters (checked again by the admin functions).
-- ---------------------------------------------------------------------------

create function public.achievement_params_valid(p_metric text, p_params jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case when jsonb_typeof(p_params) is distinct from 'object' then false else
    not exists (
      select 1 from jsonb_object_keys(p_params) k
      where not (k = any (case p_metric
        when 'matches_played' then array['format', 'mode', 'story', 'opponent', 'bot_difficulties', 'flawless']
        when 'matches_won' then array['format', 'mode', 'story', 'opponent', 'bot_difficulties', 'flawless']
        when 'comeback_wins' then array['opponent']
        when 'upset_rounds' then array['opponent', 'max_rarity_rank', 'opponent_min_rarity_rank']
        when 'close_rounds' then array['opponent']
        when 'team_wins' then array['opponent', 'faction', 'trait']
        when 'night_matches' then array['from_hour', 'to_hour']
        when 'characters_owned' then array['faction', 'trait', 'min_rarity_rank', 'max_rarity_rank', 'all']
        when 'variants_owned' then array['style']
        when 'cards_conquered' then array['per_opponent_cap']
        when 'emergency_perfect_runs' then array['min_passed']
        when 'story_missions' then array['season', 'chapter', 'all']
        when 'rare_threats_seen' then array['all']
        when 'registered_before' then array['before']
        else array[]::text[]
      end))
    )
    and (not (p_params ? 'format') or p_params ->> 'format' in ('classic', 'boss', 'triple', 'quadrant'))
    and (not (p_params ? 'mode') or p_params ->> 'mode' in ('conquest', 'friendly'))
    and (not (p_params ? 'opponent') or p_params ->> 'opponent' in ('player', 'bot'))
    and (not (p_params ? 'faction') or p_params ->> 'faction' in ('heroes', 'villains', 'neutrals'))
    and (not (p_params ? 'trait') or jsonb_typeof(p_params -> 'trait') = 'string')
    and (not (p_params ? 'style') or jsonb_typeof(p_params -> 'style') = 'string')
    and (not (p_params ? 'story') or jsonb_typeof(p_params -> 'story') = 'boolean')
    and (not (p_params ? 'flawless') or jsonb_typeof(p_params -> 'flawless') = 'boolean')
    and (not (p_params ? 'all') or jsonb_typeof(p_params -> 'all') = 'boolean')
    and (not (p_params ? 'bot_difficulties') or jsonb_typeof(p_params -> 'bot_difficulties') = 'array')
    and (not (p_params ? 'min_rarity_rank') or jsonb_typeof(p_params -> 'min_rarity_rank') = 'number')
    and (not (p_params ? 'max_rarity_rank') or jsonb_typeof(p_params -> 'max_rarity_rank') = 'number')
    and (not (p_params ? 'opponent_min_rarity_rank') or jsonb_typeof(p_params -> 'opponent_min_rarity_rank') = 'number')
    and (not (p_params ? 'per_opponent_cap') or jsonb_typeof(p_params -> 'per_opponent_cap') = 'number')
    and (not (p_params ? 'min_passed') or jsonb_typeof(p_params -> 'min_passed') = 'number')
    and (not (p_params ? 'season') or jsonb_typeof(p_params -> 'season') = 'number')
    and (not (p_params ? 'chapter') or jsonb_typeof(p_params -> 'chapter') = 'number')
    -- A team impresa needs something the whole team shares; a night impresa its hours.
    and (p_metric <> 'team_wins' or p_params ? 'faction' or p_params ? 'trait')
    and (p_metric <> 'night_matches' or (
      jsonb_typeof(p_params -> 'from_hour') = 'number' and jsonb_typeof(p_params -> 'to_hour') = 'number'
      and (p_params ->> 'from_hour')::numeric between 0 and 23 and (p_params ->> 'to_hour')::numeric between 0 and 23
      and (p_params ->> 'from_hour')::numeric <> (p_params ->> 'to_hour')::numeric))
    and (p_metric <> 'registered_before' or (
      jsonb_typeof(p_params -> 'before') = 'string' and p_params ->> 'before' ~ '^\d{4}-\d{2}-\d{2}$'))
  end
$$;

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  -- Shown as is (Italian) once completed.
  name text not null check (char_length(name) between 2 and 60),
  description text not null check (char_length(description) between 2 and 200),
  -- The only words a player sees before completing it; null: none.
  hint text check (hint is null or char_length(hint) between 2 and 120),
  tier text not null check (tier in ('bronze', 'silver', 'gold', 'legend')),
  metric text not null check (metric in (
    'matches_played', 'matches_won', 'comeback_wins', 'upset_rounds', 'close_rounds', 'team_wins', 'modes_won',
    'night_matches', 'characters_owned', 'variants_owned', 'variant_styles', 'cards_conquered', 'cards_lost',
    'duplicates_converted', 'packs_opened', 'daily_packs', 'emergency_passed', 'emergency_perfect_runs',
    'story_missions', 'rare_threats_seen', 'daily_objectives_completed', 'coins_earned', 'level', 'best_streak',
    'registered_before', 'manual'
  )),
  params jsonb not null default '{}',
  target integer not null check (target between 1 and 1000000),
  coins integer not null default 0 check (coins between 0 and 100000),
  packs integer not null default 0 check (packs between 0 and 10),
  card_definition_ids uuid[] not null default '{}',
  -- One entry per card: the variant of that copy, or null for the base drawing.
  card_variant_ids uuid[] not null default '{}',
  -- A title the player can show; null: none.
  title text check (title is null or char_length(title) between 2 and 30),
  position integer not null,
  is_active boolean not null default true,
  -- Null: what the player did before also counts. Otherwise only what came after.
  counts_from timestamptz,
  -- Null: no end. Afterwards it is out of reach, as if switched off.
  available_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint achievements_params check (public.achievement_params_valid(metric, params)),
  constraint achievements_variants_per_card check (cardinality(card_variant_ids) = cardinality(card_definition_ids)),
  constraint achievements_cards_max check (cardinality(card_definition_ids) <= 5)
);

create index achievements_position_idx on public.achievements (position);

create table public.player_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- An impresa somebody completed is never deleted (admin_delete_achievement).
  achievement_id uuid not null references public.achievements (id),
  completed_at timestamptz not null default now(),
  -- Copy of the impresa when it was completed.
  name text not null,
  description text not null,
  tier text not null,
  coins integer not null,
  packs integer not null,
  card_definition_ids uuid[] not null default '{}',
  card_variant_ids uuid[] not null default '{}',
  title text,
  -- Given by hand by an admin.
  granted boolean not null default false,
  claimed_at timestamptz,
  opening_ids uuid[] not null default '{}',
  -- First shown on the page: until then it is "new".
  seen_at timestamptz,
  primary key (user_id, achievement_id)
);

create index player_achievements_achievement_idx on public.player_achievements (achievement_id);

alter table public.achievements enable row level security;
alter table public.player_achievements enable row level security;
revoke all on table public.achievements, public.player_achievements from anon, authenticated;

-- Reward cards are normal copies: active, never level-unlock characters, variants of their own card.
create function public.validate_achievement()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from unnest(new.card_definition_ids, new.card_variant_ids) as c(definition_id, variant_id)
    left join public.card_definitions d on d.id = c.definition_id
    left join public.card_variants v on v.id = c.variant_id
    where d.id is null or not d.is_active or d.unlock_level is not null
       or (c.variant_id is not null and (v.id is null or v.definition_id <> c.definition_id))
  ) then
    raise exception 'invalid_achievement';
  end if;
  if new.params ? 'trait' and not exists (select 1 from public.traits t where t.code = new.params ->> 'trait') then
    raise exception 'invalid_achievement';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.validate_achievement() from public, anon, authenticated;

create trigger validate_achievement
  before insert or update on public.achievements
  for each row execute function public.validate_achievement();

-- ---------------------------------------------------------------------------
-- Measuring
-- ---------------------------------------------------------------------------

-- Whether a finished match fits an impresa's match filters, for one side.
create function public.achievement_match_fits(p_params jsonb, p_match public.matches, p_side text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (not (p_params ? 'format') or case p_params ->> 'format'
            when 'quadrant' then p_match.format in ('quadrant', 'quadrant_shifting')
            else p_match.format = p_params ->> 'format' end)
     and (not (p_params ? 'mode') or p_match.mode = p_params ->> 'mode')
     and (not (p_params ? 'story') or (p_match.story_mission_id is not null) = (p_params ->> 'story')::boolean)
     and (p_params ->> 'opponent' is distinct from 'player' or p_match.player_b is not null)
     and (p_params ->> 'opponent' is distinct from 'bot' or p_match.player_b is null)
     and (not (p_params ? 'bot_difficulties') or coalesce(p_params -> 'bot_difficulties' ? p_match.bot_difficulty, false))
     and (not coalesce((p_params ->> 'flawless')::boolean, false)
          or (case p_side when 'a' then p_match.rounds_won_b else p_match.rounds_won_a end) = 0)
$$;

-- How far a player is on a metric. p_since: only what happened from then (null: everything).
-- Collection, level, streak and story count what the player has now, whatever the date.
create function public.achievement_progress(p_user uuid, p_metric text, p_params jsonb, p_since timestamptz)
returns integer
language plpgsql
stable
set search_path = ''
as $$
declare
  v integer;
  v_rome_hour integer;
begin
  case p_metric
    when 'matches_played', 'matches_won', 'comeback_wins', 'modes_won', 'night_matches' then
      select case p_metric
          when 'modes_won' then count(distinct case
            when m.story_mission_id is not null then 'story'
            when m.mode = 'conquest' then 'conquest'
            when m.format in ('quadrant', 'quadrant_shifting') then 'quadrant'
            else m.format end) filter (where m.result = s.side)
          when 'matches_played' then count(*)
          when 'night_matches' then count(*) filter (where
            case when (p_params ->> 'from_hour')::integer < (p_params ->> 'to_hour')::integer
              then extract(hour from m.finished_at at time zone 'Europe/Rome')::integer
                   between (p_params ->> 'from_hour')::integer and (p_params ->> 'to_hour')::integer - 1
              else extract(hour from m.finished_at at time zone 'Europe/Rome')::integer >= (p_params ->> 'from_hour')::integer
                or extract(hour from m.finished_at at time zone 'Europe/Rome')::integer < (p_params ->> 'to_hour')::integer
            end)
          when 'comeback_wins' then count(*) filter (where m.result = s.side and m.format = 'classic' and (
            select count(*) from public.match_rounds r
            where r.match_id = m.id and r.round in (1, 2) and r.winner_side not in (s.side, 'none')) = 2)
          else count(*) filter (where m.result = s.side)
        end::integer
      into v
      from public.matches m
      cross join lateral (select case when m.player_a = p_user then 'a' else 'b' end as side) s
      where (m.player_a = p_user or m.player_b = p_user)
        and m.status = 'finished' and m.end_reason = 'completed'
        and (p_since is null or m.finished_at >= p_since)
        and public.achievement_match_fits(
          case when p_metric in ('matches_played', 'matches_won') then p_params
               else p_params - 'from_hour' - 'to_hour' end, m, s.side);

    when 'upset_rounds', 'close_rounds' then
      select count(*)::integer into v
      from public.matches m
      cross join lateral (select case when m.player_a = p_user then 'a' else 'b' end as side) s
      join public.match_rounds mr on mr.match_id = m.id and mr.winner_side = s.side
      join public.round_plays mine on mine.match_id = m.id and mine.round = mr.round and mine.side = s.side
      join public.round_plays theirs on theirs.match_id = m.id and theirs.round = mr.round and theirs.side <> s.side
      join public.card_definitions dm on dm.id = mine.definition_id
      join public.rarity_definitions rm on rm.code = dm.rarity_code
      join public.card_definitions dt on dt.id = theirs.definition_id
      join public.rarity_definitions rt on rt.code = dt.rarity_code
      where (m.player_a = p_user or m.player_b = p_user)
        and m.status = 'finished' and m.end_reason = 'completed' and m.format = 'classic'
        and (p_since is null or m.finished_at >= p_since)
        and public.achievement_match_fits(p_params - 'max_rarity_rank' - 'opponent_min_rarity_rank', m, s.side)
        and case p_metric
          when 'upset_rounds' then
            rm.rank <= coalesce((p_params ->> 'max_rarity_rank')::integer, 1)
            and rt.rank >= coalesce((p_params ->> 'opponent_min_rarity_rank')::integer, 5)
          else mine.score - theirs.score = 1
        end;

    when 'team_wins' then
      select count(*)::integer into v
      from public.matches m
      cross join lateral (select case when m.player_a = p_user then 'a' else 'b' end as side) s
      join public.match_teams t on t.match_id = m.id and t.side = s.side
      where (m.player_a = p_user or m.player_b = p_user)
        and m.status = 'finished' and m.end_reason = 'completed' and m.result = s.side
        and (p_since is null or m.finished_at >= p_since)
        and public.achievement_match_fits(p_params - 'faction' - 'trait', m, s.side)
        and cardinality(t.definition_ids) > 0
        and not exists (
          select 1 from unnest(t.definition_ids) as d(id)
          join public.card_definitions cd on cd.id = d.id
          where (p_params ? 'faction' and cd.faction <> p_params ->> 'faction')
             or (p_params ? 'trait' and not exists (
               select 1 from public.card_definition_traits ct
               where ct.definition_id = d.id and ct.trait_code = p_params ->> 'trait'))
        );

    when 'characters_owned' then
      with wanted as (
        select d.id from public.card_definitions d
        join public.rarity_definitions r on r.code = d.rarity_code
        where d.is_active
          and (not (p_params ? 'faction') or d.faction = p_params ->> 'faction')
          and (not (p_params ? 'min_rarity_rank') or r.rank >= (p_params ->> 'min_rarity_rank')::integer)
          and (not (p_params ? 'max_rarity_rank') or r.rank <= (p_params ->> 'max_rarity_rank')::integer)
          and (not (p_params ? 'trait') or exists (
            select 1 from public.card_definition_traits ct where ct.definition_id = d.id and ct.trait_code = p_params ->> 'trait'))
      ), owned as (
        select distinct i.definition_id as id from public.card_instances i
        join wanted w on w.id = i.definition_id
        where i.owner_id = p_user
      )
      select case when coalesce((p_params ->> 'all')::boolean, false)
        then ((select count(*) from wanted) > 0 and (select count(*) from wanted) = (select count(*) from owned))::integer
        else (select count(*) from owned)::integer end
      into v;

    when 'variants_owned' then
      select count(distinct i.variant_id)::integer into v
      from public.card_instances i
      join public.card_variants cv on cv.id = i.variant_id
      where i.owner_id = p_user and (not (p_params ? 'style') or cv.style = p_params ->> 'style');

    when 'variant_styles' then
      select count(distinct cv.style)::integer into v
      from public.card_instances i
      join public.card_variants cv on cv.id = i.variant_id
      where i.owner_id = p_user;

    when 'cards_conquered' then
      -- At most per_opponent_cap cards count from the same opponent (a bot counts as one).
      select coalesce(sum(case when p_params ? 'per_opponent_cap'
                               then least(x.n, (p_params ->> 'per_opponent_cap')::integer) else x.n end), 0)::integer
      into v
      from (
        select count(*) as n from public.card_transfers t
        where t.to_user = p_user and t.reason = 'conquest' and (p_since is null or t.created_at >= p_since)
        group by t.from_user
      ) x;

    when 'cards_lost' then
      select count(*)::integer into v from public.card_transfers t
      where t.from_user = p_user and t.reason = 'conquest' and (p_since is null or t.created_at >= p_since);

    when 'duplicates_converted' then
      select count(*)::integer into v from public.card_transfers t
      where t.from_user = p_user and t.reason = 'conversion' and (p_since is null or t.created_at >= p_since);

    when 'packs_opened' then
      select count(*)::integer into v from public.pack_openings o
      where o.user_id = p_user and o.pack_type in ('daily', 'standard', 'special')
        and (p_since is null or o.opened_at >= p_since);

    when 'daily_packs' then
      select count(*)::integer into v from public.daily_claims c
      where c.user_id = p_user and (p_since is null or c.claimed_at >= p_since);

    when 'emergency_passed' then
      select count(*)::integer into v
      from public.emergency_plays p join public.emergency_runs r on r.id = p.run_id
      where r.user_id = p_user and p.passed and (p_since is null or p.created_at >= p_since);

    when 'emergency_perfect_runs' then
      select count(*)::integer into v from public.emergency_runs r
      where r.user_id = p_user and r.status = 'finished'
        and r.passed >= coalesce((p_params ->> 'min_passed')::integer, public.config_int('emergency.threats_per_run'))
        and (p_since is null or r.finished_at >= p_since);

    when 'story_missions' then
      with scope as (
        select sm.id from public.story_missions sm
        join public.story_chapters c on c.chapter = sm.chapter
        where (not (p_params ? 'season') or c.season = (p_params ->> 'season')::integer)
          and (not (p_params ? 'chapter') or c.chapter = (p_params ->> 'chapter')::integer)
      ), done as (
        select sp.mission_id from public.story_progress sp join scope on scope.id = sp.mission_id
        where sp.user_id = p_user
      )
      select case when coalesce((p_params ->> 'all')::boolean, false)
        then ((select count(*) from scope) > 0 and (select count(*) from scope) = (select count(*) from done))::integer
        else (select count(*) from done)::integer end
      into v;

    when 'rare_threats_seen' then
      if coalesce((p_params ->> 'all')::boolean, false) then
        select (count(*) > 0 and bool_and(exists (
          select 1 from public.threat_sightings s where s.user_id = p_user and s.threat_id = t.id)))::integer
        into v
        from public.threat_definitions t where t.rarity_code is not null and t.is_active;
      else
        select count(*)::integer into v
        from public.threat_sightings s join public.threat_definitions t on t.id = s.threat_id
        where s.user_id = p_user and t.rarity_code is not null and (p_since is null or s.first_seen_at >= p_since);
      end if;

    when 'daily_objectives_completed' then
      select count(*)::integer into v from public.daily_objectives o
      where o.user_id = p_user and o.completed_at is not null and o.replaced_at is null
        and (p_since is null or o.completed_at >= p_since);

    when 'coins_earned' then
      select coalesce(sum(l.amount), 0)::integer into v from public.coin_ledger l
      where l.user_id = p_user and l.amount > 0 and l.reason not in ('achievement_reward', 'admin_adjustment')
        and (p_since is null or l.created_at >= p_since);

    when 'level' then
      select p.level into v from public.profiles p where p.id = p_user;

    when 'best_streak' then
      select p.best_streak into v from public.profiles p where p.id = p_user;

    when 'registered_before' then
      select (p.created_at < ((p_params ->> 'before')::date)::timestamp at time zone 'Europe/Rome')::integer
      into v from public.profiles p where p.id = p_user;

    else
      v := 0; -- 'manual': only an admin gives it.
  end case;
  return coalesce(v, 0);
end;
$$;

-- An impresa a player can still complete: switched on and not past its end.
create function public.achievement_available(p_achievement public.achievements)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_achievement.is_active and (p_achievement.available_until is null or now() < p_achievement.available_until)
$$;

-- Records a completed impresa with a copy of it. True if it was new.
create function public.complete_achievement(p_user uuid, p_achievement public.achievements, p_granted boolean)
returns boolean
language plpgsql
volatile
set search_path = ''
as $$
begin
  insert into public.player_achievements (
    user_id, achievement_id, name, description, tier, coins, packs, card_definition_ids, card_variant_ids, title, granted
  ) values (
    p_user, p_achievement.id, p_achievement.name, p_achievement.description, p_achievement.tier, p_achievement.coins,
    p_achievement.packs, p_achievement.card_definition_ids, p_achievement.card_variant_ids, p_achievement.title, p_granted
  )
  on conflict do nothing;
  return found;
end;
$$;

-- The banner for what was just completed: one for one impresa, one in all for several.
create function public.notify_achievements(p_user uuid, p_ids uuid[])
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_count integer := coalesce(cardinality(p_ids), 0);
  v_names text;
  v_coins integer;
  v_packs integer;
  v_cards integer;
  v_tier text;
begin
  if v_count = 0 then
    return;
  end if;
  select string_agg(pa.name, ' · ' order by pa.completed_at, pa.name), sum(pa.coins), sum(pa.packs),
         sum(cardinality(pa.card_definition_ids)), min(pa.tier)
  into v_names, v_coins, v_packs, v_cards, v_tier
  from public.player_achievements pa
  where pa.user_id = p_user and pa.achievement_id = any (p_ids);
  perform public.add_player_notification(
    p_user,
    'achievement',
    case when v_count = 1 then 'Impresa scoperta!' else 'Hai scoperto ' || v_count || ' imprese!' end,
    v_names,
    jsonb_build_object(
      'achievement_ids', to_jsonb(p_ids),
      'count', v_count,
      'tier', case when v_count = 1 then v_tier end,
      'coins', coalesce(v_coins, 0),
      'packs', coalesce(v_packs, 0),
      'cards', coalesce(v_cards, 0)
    )
  );
end;
$$;

-- Checks the player's imprese still open (those counting p_metrics, or all of them) and
-- records the ones reached. Never fails what called it: a broken impresa is skipped.
-- Returns how many were completed now.
create function public.check_achievements(p_user uuid, p_metrics text[] default null, p_notify boolean default true)
returns integer
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_achievement public.achievements;
  v_progress integer;
  v_done uuid[] := '{}';
begin
  if p_user is null or not exists (select 1 from public.profiles p where p.id = p_user) then
    return 0;
  end if;
  for v_achievement in
    select a.* from public.achievements a
    where public.achievement_available(a) and a.metric <> 'manual'
      and (p_metrics is null or a.metric = any (p_metrics))
      and not exists (
        select 1 from public.player_achievements pa where pa.user_id = p_user and pa.achievement_id = a.id)
    order by a.position
  loop
    begin
      v_progress := public.achievement_progress(p_user, v_achievement.metric, v_achievement.params, v_achievement.counts_from);
    exception when others then
      raise warning 'achievement % skipped: %', v_achievement.id, sqlerrm;
      continue;
    end;
    if v_progress >= v_achievement.target and public.complete_achievement(p_user, v_achievement, false) then
      v_done := v_done || v_achievement.id;
    end if;
  end loop;
  if p_notify then
    perform public.notify_achievements(p_user, v_done);
  end if;
  return cardinality(v_done);
end;
$$;

revoke execute on function public.achievement_params_valid(text, jsonb) from public, anon, authenticated;
revoke execute on function public.achievement_match_fits(jsonb, public.matches, text) from public, anon, authenticated;
revoke execute on function public.achievement_progress(uuid, text, jsonb, timestamptz) from public, anon, authenticated;
revoke execute on function public.achievement_available(public.achievements) from public, anon, authenticated;
revoke execute on function public.complete_achievement(uuid, public.achievements, boolean) from public, anon, authenticated;
revoke execute on function public.notify_achievements(uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.check_achievements(uuid, text[], boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- When to check: in the transaction that records what the player did.
-- ---------------------------------------------------------------------------

create function public.check_match_achievements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'finished' and old.status <> 'finished' and new.end_reason = 'completed' then
    perform public.check_achievements(u, array[
      'matches_played', 'matches_won', 'comeback_wins', 'upset_rounds', 'close_rounds', 'team_wins', 'modes_won',
      'night_matches'])
    from unnest(array[new.player_a, new.player_b]) as u where u is not null;
  end if;
  return new;
end;
$$;

create trigger matches_check_achievements
  after update of status on public.matches
  for each row execute function public.check_match_achievements();

-- Level and streak are written after the match row (finish_match).
create function public.check_profile_achievements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.level > old.level or new.best_streak > old.best_streak then
    perform public.check_achievements(new.id, array['level', 'best_streak']);
  end if;
  return new;
end;
$$;

create trigger profiles_check_achievements
  after update of level, best_streak on public.profiles
  for each row execute function public.check_profile_achievements();

-- Once per statement: a pack or a conversion moves many cards at once.
create function public.check_transfer_achievements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.check_achievements(u.id, array[
    'characters_owned', 'variants_owned', 'variant_styles', 'cards_conquered', 'cards_lost', 'duplicates_converted'])
  from (
    select t.to_user as id from new_transfers t where t.to_user is not null
    union
    select t.from_user from new_transfers t where t.from_user is not null and t.reason in ('conquest', 'conversion')
  ) u;
  return null;
end;
$$;

create trigger card_transfers_check_achievements
  after insert on public.card_transfers
  referencing new table as new_transfers
  for each statement execute function public.check_transfer_achievements();

create function public.check_simple_achievements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  case tg_table_name
    when 'pack_openings' then
      if new.pack_type in ('daily', 'standard', 'special') then
        perform public.check_achievements(new.user_id, array['packs_opened']);
      end if;
    when 'daily_claims' then
      perform public.check_achievements(new.user_id, array['daily_packs']);
    when 'emergency_plays' then
      if new.passed then
        perform public.check_achievements(r.user_id, array['emergency_passed'])
        from public.emergency_runs r where r.id = new.run_id;
      end if;
    when 'emergency_runs' then
      if new.status = 'finished' and old.status <> 'finished' then
        perform public.check_achievements(new.user_id, array['emergency_perfect_runs']);
      end if;
    when 'story_progress' then
      perform public.check_achievements(new.user_id, array['story_missions']);
    when 'threat_sightings' then
      perform public.check_achievements(new.user_id, array['rare_threats_seen']);
    when 'daily_objectives' then
      if old.completed_at is null and new.completed_at is not null then
        perform public.check_achievements(new.user_id, array['daily_objectives_completed']);
      end if;
    when 'coin_ledger' then
      if new.amount > 0 and new.reason not in ('achievement_reward', 'admin_adjustment') then
        perform public.check_achievements(new.user_id, array['coins_earned']);
      end if;
    else
      null;
  end case;
  return new;
end;
$$;

create trigger pack_openings_check_achievements after insert on public.pack_openings
  for each row execute function public.check_simple_achievements();
create trigger daily_claims_check_achievements after insert on public.daily_claims
  for each row execute function public.check_simple_achievements();
create trigger emergency_plays_check_achievements after insert on public.emergency_plays
  for each row execute function public.check_simple_achievements();
create trigger emergency_runs_check_achievements after update of status on public.emergency_runs
  for each row execute function public.check_simple_achievements();
create trigger story_progress_check_achievements after insert on public.story_progress
  for each row execute function public.check_simple_achievements();
create trigger threat_sightings_check_achievements after insert on public.threat_sightings
  for each row execute function public.check_simple_achievements();
create trigger daily_objectives_check_achievements after update of completed_at on public.daily_objectives
  for each row execute function public.check_simple_achievements();
create trigger coin_ledger_check_achievements after insert on public.coin_ledger
  for each row execute function public.check_simple_achievements();

revoke execute on function public.check_match_achievements() from public, anon, authenticated;
revoke execute on function public.check_profile_achievements() from public, anon, authenticated;
revoke execute on function public.check_transfer_achievements() from public, anon, authenticated;
revoke execute on function public.check_simple_achievements() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Player RPCs
-- ---------------------------------------------------------------------------

-- The board. Imprese not completed: place, tier and hint only. Completed ones: everything,
-- from the player's copy, also when the impresa was later switched off ("retired").
create function public.achievements_payload(p_user uuid)
returns jsonb
language sql
volatile
set search_path = ''
as $$
  with board as (
    select a.id, a.position, coalesce(pa.tier, a.tier) as tier, a.hint, (pa.user_id is not null) as done,
           not public.achievement_available(a) as retired,
           pa.name, pa.description, pa.completed_at, pa.coins, pa.packs, pa.title, pa.claimed_at, pa.opening_ids,
           pa.seen_at, pa.card_definition_ids, pa.card_variant_ids
    from public.achievements a
    left join public.player_achievements pa on pa.achievement_id = a.id and pa.user_id = p_user
    where pa.user_id is not null or public.achievement_available(a)
  )
  select jsonb_build_object(
    'title', (select p.title from public.profiles p where p.id = p_user),
    'discovered', (select count(*) from board where done),
    'total', (select count(*) from board),
    'achievements', coalesce((
      select jsonb_agg(case when b.done then jsonb_build_object(
        'id', b.id,
        'tier', b.tier,
        'done', true,
        'name', b.name,
        'description', b.description,
        'completed_at', b.completed_at,
        'retired', b.retired,
        'coins', b.coins,
        'packs', b.packs,
        'title', b.title,
        'claimed', b.claimed_at is not null,
        'opening_ids', to_jsonb(b.opening_ids),
        'new', b.seen_at is null,
        'cards', coalesce((
          select jsonb_agg(jsonb_build_object(
            'code', cd.code,
            'name', cd.name,
            'rarity_code', cd.rarity_code,
            'art_url', coalesce(v.art_url, cd.art_url),
            'variant', v.style_name
          ) order by c.n)
          from unnest(b.card_definition_ids, b.card_variant_ids) with ordinality as c(definition_id, variant_id, n)
          join public.card_definitions cd on cd.id = c.definition_id
          left join public.card_variants v on v.id = c.variant_id
        ), '[]'::jsonb)
      ) else jsonb_build_object(
        'id', b.id,
        'tier', b.tier,
        'done', false,
        'hint', b.hint
      ) end order by b.position, b.id)
      from board b
    ), '[]'::jsonb)
  )
$$;

revoke execute on function public.achievements_payload(uuid) from public, anon, authenticated;

-- The caller's board, after checking every open impresa (also those that count the past,
-- just added or just changed). What is new this time is shown on the page, not in a banner.
create function public.get_achievements()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_payload jsonb;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_user) then
    raise exception 'profile_not_found';
  end if;
  perform public.check_achievements(v_user, null, false);
  v_payload := public.achievements_payload(v_user);
  update public.player_achievements set seen_at = now() where user_id = v_user and seen_at is null;
  return v_payload;
end;
$$;

-- Pays a completed impresa, once: coins (coin_ledger), cards (card_transfers), packs.
create function public.claim_achievement(p_achievement_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_done public.player_achievements;
  v_instance uuid;
  v_instance_ids uuid[] := '{}';
  v_new_ids uuid[] := '{}';
  v_opening uuid;
  v_openings uuid[] := '{}';
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  select * into v_done from public.player_achievements pa
  where pa.user_id = v_user and pa.achievement_id = p_achievement_id
  for update;
  if v_done.user_id is null then
    raise exception 'achievement_not_completed';
  end if;
  if v_done.claimed_at is not null then
    raise exception 'achievement_already_claimed';
  end if;
  update public.player_achievements set claimed_at = now()
  where user_id = v_user and achievement_id = p_achievement_id;

  if v_done.coins > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id)
    values (v_user, v_done.coins, 'achievement_reward', p_achievement_id);
  end if;

  for i in 1..coalesce(cardinality(v_done.card_definition_ids), 0) loop
    insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
    values (v_done.card_definition_ids[i], v_user, 'achievement', v_done.card_variant_ids[i])
    returning id into v_instance;
    insert into public.card_transfers (instance_id, from_user, to_user, reason)
    values (v_instance, null, v_user, 'achievement');
    if (select count(*) from public.card_instances c
        where c.owner_id = v_user and c.definition_id = v_done.card_definition_ids[i]) = 1 then
      v_new_ids := v_new_ids || v_instance;
    end if;
    v_instance_ids := v_instance_ids || v_instance;
  end loop;

  if cardinality(v_instance_ids) > 0 then
    insert into public.pack_openings (user_id, pack_type, card_instance_ids, new_card_instance_ids)
    values (v_user, 'achievement', v_instance_ids, v_new_ids)
    returning id into v_opening;
    v_openings := v_openings || v_opening;
  end if;

  for i in 1..v_done.packs loop
    v_openings := v_openings || public.open_pack(v_user, 'achievement');
  end loop;

  update public.player_achievements set opening_ids = v_openings
  where user_id = v_user and achievement_id = p_achievement_id;

  return jsonb_build_object(
    'coins', v_done.coins,
    'opening_ids', to_jsonb(v_openings),
    'coin_balance', public.coin_balance(v_user)
  );
end;
$$;

-- Shows the title of a completed impresa (null: no title). Returns it.
create function public.set_player_title(p_achievement_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_title text;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if p_achievement_id is not null then
    select pa.title into v_title from public.player_achievements pa
    where pa.user_id = v_user and pa.achievement_id = p_achievement_id;
    if v_title is null then
      raise exception 'title_not_available';
    end if;
  end if;
  update public.profiles set title = v_title, updated_at = now() where id = v_user;
  return v_title;
end;
$$;

-- The title the other player shows, for a participant of the match.
create function public.get_match_opponent_title(p_match_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.title
  from public.matches m
  join public.profiles p on p.id = case when m.player_a = auth.uid() then m.player_b else m.player_a end
  where m.id = p_match_id and auth.uid() in (m.player_a, m.player_b)
$$;

revoke execute on function public.get_achievements() from public, anon;
revoke execute on function public.claim_achievement(uuid) from public, anon;
revoke execute on function public.set_player_title(uuid) from public, anon;
revoke execute on function public.get_match_opponent_title(uuid) from public, anon;
grant execute on function public.get_achievements() to authenticated;
grant execute on function public.claim_achievement(uuid) to authenticated;
grant execute on function public.set_player_title(uuid) to authenticated;
grant execute on function public.get_match_opponent_title(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin RPCs (/gestione-imprese). Every one checks the admin on the server.
-- ---------------------------------------------------------------------------

create function public.admin_achievements_payload()
returns jsonb
language sql
volatile
set search_path = ''
as $$
  select jsonb_build_object(
    'players', (select count(*) from public.profiles),
    'achievements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'name', a.name,
        'description', a.description,
        'hint', a.hint,
        'tier', a.tier,
        'metric', a.metric,
        'params', a.params,
        'target', a.target,
        'coins', a.coins,
        'packs', a.packs,
        'card_codes', coalesce((
          select jsonb_agg(cd.code || coalesce(':' || v.style, '') order by c.n)
          from unnest(a.card_definition_ids, a.card_variant_ids) with ordinality as c(definition_id, variant_id, n)
          join public.card_definitions cd on cd.id = c.definition_id
          left join public.card_variants v on v.id = c.variant_id
        ), '[]'::jsonb),
        'title', a.title,
        'position', a.position,
        'is_active', a.is_active,
        'counts_past', a.counts_from is null,
        'counts_from', a.counts_from,
        'available_until', a.available_until,
        'completed', (select count(*) from public.player_achievements pa where pa.achievement_id = a.id)
      ) order by a.position, a.created_at)
      from public.achievements a
    ), '[]'::jsonb),
    'cards', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', d.code,
        'name', d.name,
        'rarity', r.name,
        'variants', (
          select coalesce(jsonb_agg(jsonb_build_object('style', v.style, 'name', v.style_name) order by v.style_name), '[]'::jsonb)
          from public.card_variants v where v.definition_id = d.id and v.is_active
        )
      ) order by d.name), '[]'::jsonb)
      from public.card_definitions d
      join public.rarity_definitions r on r.code = d.rarity_code
      where d.is_active and d.unlock_level is null
    ),
    'traits', (
      select coalesce(jsonb_agg(jsonb_build_object('code', t.code, 'name', t.name, 'category', c.name)
        order by c.sort_order, t.sort_order), '[]'::jsonb)
      from public.traits t join public.trait_categories c on c.code = t.category_code
    ),
    'styles', (
      select coalesce(jsonb_agg(jsonb_build_object('style', s.style, 'name', s.style_name) order by s.style_name), '[]'::jsonb)
      from (select distinct on (v.style) v.style, v.style_name from public.card_variants v where v.is_active
            order by v.style, v.style_name) s
    ),
    'chapters', (
      select coalesce(jsonb_agg(jsonb_build_object('chapter', c.chapter, 'season', c.season, 'number', c.number, 'title', c.title)
        order by c.chapter), '[]'::jsonb)
      from public.story_chapters c
    ),
    'seasons', (
      select coalesce(jsonb_agg(jsonb_build_object('season', s.season, 'title', s.title) order by s.season), '[]'::jsonb)
      from public.story_seasons s
    )
  )
$$;

revoke execute on function public.admin_achievements_payload() from public, anon, authenticated;

create function public.admin_list_achievements()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return public.admin_achievements_payload();
end;
$$;

-- Checks and reads an impresa from the editor (fields of admin_save_achievement).
create function public.achievement_from_draft(p_draft jsonb)
returns public.achievements
language plpgsql
stable
set search_path = ''
as $$
declare
  v public.achievements;
  v_cards record;
begin
  if jsonb_typeof(p_draft) is distinct from 'object' then
    raise exception 'invalid_achievement';
  end if;
  v.name := btrim(coalesce(p_draft ->> 'name', ''));
  v.description := btrim(coalesce(p_draft ->> 'description', ''));
  v.hint := nullif(btrim(coalesce(p_draft ->> 'hint', '')), '');
  v.tier := p_draft ->> 'tier';
  v.metric := p_draft ->> 'metric';
  v.params := coalesce(p_draft -> 'params', '{}'::jsonb);
  v.title := nullif(btrim(coalesce(p_draft ->> 'title', '')), '');
  begin
    v.target := (p_draft ->> 'target')::integer;
    v.coins := coalesce((p_draft ->> 'coins')::integer, 0);
    v.packs := coalesce((p_draft ->> 'packs')::integer, 0);
    v.available_until := nullif(p_draft ->> 'available_until', '')::timestamptz;
  exception when others then
    raise exception 'invalid_achievement';
  end;
  if char_length(v.name) not between 2 and 60
     or char_length(v.description) not between 2 and 200
     or (v.hint is not null and char_length(v.hint) not between 2 and 120)
     or (v.title is not null and char_length(v.title) not between 2 and 30)
     or v.tier is null or v.tier not in ('bronze', 'silver', 'gold', 'legend')
     or v.metric is null or not public.achievement_params_valid(v.metric, v.params)
     or v.target is null or v.target not between 1 and 1000000
     or v.coins not between 0 and 100000 or v.packs not between 0 and 10 then
    raise exception 'invalid_achievement';
  end if;
  if jsonb_typeof(coalesce(p_draft -> 'card_codes', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_draft -> 'card_codes', '[]'::jsonb)) > 5 then
    raise exception 'invalid_achievement';
  end if;
  begin
    select * into v_cards from public.event_reward_cards(
      array(select jsonb_array_elements_text(coalesce(p_draft -> 'card_codes', '[]'::jsonb))));
  exception when others then
    raise exception 'invalid_achievement';
  end;
  v.card_definition_ids := v_cards.definition_ids;
  v.card_variant_ids := v_cards.variant_ids;
  return v;
end;
$$;

revoke execute on function public.achievement_from_draft(jsonb) from public, anon, authenticated;

-- Creates an impresa (p_id null) or changes one. Who already completed it keeps their copy;
-- a condition made easier is reached by others at their next check.
-- p_draft.counts_past: true, the past counts; false, only from now (an impresa that already
-- counted from a date keeps it).
create function public.admin_save_achievement(p_id uuid, p_draft jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.achievements;
  v_counts_past boolean := coalesce((p_draft ->> 'counts_past')::boolean, true);
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  v := public.achievement_from_draft(p_draft);
  if p_id is null then
    insert into public.achievements (
      name, description, hint, tier, metric, params, target, coins, packs, card_definition_ids, card_variant_ids,
      title, position, counts_from, available_until
    ) values (
      v.name, v.description, v.hint, v.tier, v.metric, v.params, v.target, v.coins, v.packs, v.card_definition_ids,
      v.card_variant_ids, v.title, coalesce((select max(a.position) from public.achievements a), 0) + 1,
      case when v_counts_past then null else now() end, v.available_until
    );
  else
    update public.achievements a
    set name = v.name, description = v.description, hint = v.hint, tier = v.tier, metric = v.metric,
        params = v.params, target = v.target, coins = v.coins, packs = v.packs,
        card_definition_ids = v.card_definition_ids, card_variant_ids = v.card_variant_ids, title = v.title,
        counts_from = case when v_counts_past then null else coalesce(a.counts_from, now()) end,
        available_until = v.available_until
    where a.id = p_id;
    if not found then
      raise exception 'achievement_not_found';
    end if;
  end if;
  return public.admin_achievements_payload();
end;
$$;

-- How many players would have it today (the editor's preview); nothing is saved.
create function public.admin_preview_achievement(p_draft jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.achievements;
  v_since timestamptz;
  v_count integer := 0;
  v_user uuid;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  v := public.achievement_from_draft(p_draft);
  if not coalesce((p_draft ->> 'counts_past')::boolean, true) then
    v_since := coalesce(nullif(p_draft ->> 'counts_from', '')::timestamptz, now());
  end if;
  if v.metric <> 'manual' then
    for v_user in select p.id from public.profiles p loop
      if public.achievement_progress(v_user, v.metric, v.params, v_since) >= v.target then
        v_count := v_count + 1;
      end if;
    end loop;
  end if;
  return jsonb_build_object('would_complete', v_count, 'players', (select count(*) from public.profiles));
end;
$$;

-- Off: nobody else completes it and players who have not got it no longer see it; who has
-- it keeps it. On: back on the board.
create function public.admin_set_achievement_active(p_id uuid, p_is_active boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  update public.achievements set is_active = coalesce(p_is_active, false) where id = p_id;
  if not found then
    raise exception 'achievement_not_found';
  end if;
  return public.admin_achievements_payload();
end;
$$;

-- Only an impresa nobody completed can go; otherwise it is switched off.
create function public.admin_delete_achievement(p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if exists (select 1 from public.player_achievements pa where pa.achievement_id = p_id) then
    raise exception 'achievement_in_use';
  end if;
  delete from public.achievements where id = p_id;
  if not found then
    raise exception 'achievement_not_found';
  end if;
  return public.admin_achievements_payload();
end;
$$;

-- The whole order of the board: every impresa, once.
create function public.admin_reorder_achievements(p_ids uuid[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_ids), 0) <> (select count(*) from public.achievements)
     or (select count(distinct x) from unnest(p_ids) x) <> cardinality(p_ids)
     or exists (select 1 from unnest(p_ids) x where not exists (select 1 from public.achievements a where a.id = x)) then
    raise exception 'invalid_order';
  end if;
  update public.achievements a set position = o.n
  from unnest(p_ids) with ordinality as o(id, n)
  where a.id = o.id and a.position <> o.n;
  return public.admin_achievements_payload();
end;
$$;

-- Gives an impresa by hand (any impresa, the "manual" ones above all) to a player by name.
create function public.admin_grant_achievement(p_id uuid, p_username text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_achievement public.achievements;
  v_user uuid;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  select * into v_achievement from public.achievements a where a.id = p_id;
  if v_achievement.id is null then
    raise exception 'achievement_not_found';
  end if;
  select p.id into v_user from public.profiles p where lower(p.username) = lower(btrim(coalesce(p_username, '')));
  if v_user is null then
    raise exception 'player_not_found';
  end if;
  if not public.complete_achievement(v_user, v_achievement, true) then
    raise exception 'achievement_already_completed';
  end if;
  perform public.notify_achievements(v_user, array[v_achievement.id]);
  return public.admin_achievements_payload();
end;
$$;

revoke execute on function public.admin_list_achievements() from public, anon;
revoke execute on function public.admin_save_achievement(uuid, jsonb) from public, anon;
revoke execute on function public.admin_preview_achievement(jsonb) from public, anon;
revoke execute on function public.admin_set_achievement_active(uuid, boolean) from public, anon;
revoke execute on function public.admin_delete_achievement(uuid) from public, anon;
revoke execute on function public.admin_reorder_achievements(uuid[]) from public, anon;
revoke execute on function public.admin_grant_achievement(uuid, text) from public, anon;
grant execute on function public.admin_list_achievements() to authenticated;
grant execute on function public.admin_save_achievement(uuid, jsonb) to authenticated;
grant execute on function public.admin_preview_achievement(jsonb) to authenticated;
grant execute on function public.admin_set_achievement_active(uuid, boolean) to authenticated;
grant execute on function public.admin_delete_achievement(uuid) to authenticated;
grant execute on function public.admin_reorder_achievements(uuid[]) to authenticated;
grant execute on function public.admin_grant_achievement(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- The first imprese (placeholder texts, SPEC §8.5). They all count the past.
-- Rarity ranks: 1 Delta, 5 Omega. Leggenda: 3 packs and a title; an admin can add cards.
-- ---------------------------------------------------------------------------

insert into public.achievements (position, tier, name, description, hint, metric, params, target, coins, packs, title) values
  (1, 'bronze', 'Primo sangue', 'Hai vinto la tua prima partita contro un giocatore.', 'Un avversario in carne e ossa…',
   'matches_won', '{"opponent": "player"}', 1, 50, 0, null),
  (2, 'bronze', 'Senza pietà', 'Hai vinto una partita classica 3-0.', 'Non lasciargli nemmeno un round.',
   'matches_won', '{"format": "classic", "flawless": true}', 1, 50, 0, null),
  (3, 'bronze', 'Cambio d''abito', 'Hai trovato la tua prima variante.', 'Stesso eroe, un altro disegno.',
   'variants_owned', '{}', 1, 50, 0, null),
  (4, 'bronze', 'Lezione imparata', 'Hai perso la tua prima carta in Conquista.', 'Anche perdere insegna qualcosa.',
   'cards_lost', '{}', 1, 50, 0, null),
  (5, 'bronze', 'Turno di notte', 'Hai finito una partita tra mezzanotte e le 5 del mattino.', 'Gli eroi non dormono.',
   'night_matches', '{"from_hour": 0, "to_hour": 5}', 1, 50, 0, null),
  (6, 'bronze', 'Avvistamento', 'Hai avvistato la tua prima Minaccia rara.', 'Qualcosa di insolito in città.',
   'rare_threats_seen', '{}', 1, 50, 0, null),
  (7, 'bronze', 'Pioniere', 'Sei arrivato a Nuova Megara prima del 1° dicembre 2026.', 'C''eri dall''inizio?',
   'registered_before', '{"before": "2026-12-01"}', 1, 50, 0, 'Pioniere'),
  (8, 'silver', 'Davide e Golia', 'Hai vinto un round con una carta Delta contro una Omega.', 'A volte vincono i piccoli.',
   'upset_rounds', '{"max_rarity_rank": 1, "opponent_min_rarity_rank": 5}', 1, 0, 1, null),
  (9, 'silver', 'Mai dire mai', 'Hai vinto una partita classica dopo aver perso i primi due round.', 'Fino all''ultimo round.',
   'comeback_wins', '{}', 1, 150, 0, null),
  (10, 'silver', 'Senza ombre', 'Hai vinto una partita con una squadra di soli Supereroi.', 'Una squadra tutta di luce.',
   'team_wins', '{"faction": "heroes"}', 1, 150, 0, null),
  (11, 'silver', 'Senza scrupoli', 'Hai vinto una partita con una squadra di soli Supercattivi.', 'Una squadra tutta d''ombra.',
   'team_wins', '{"faction": "villains"}', 1, 150, 0, null),
  (12, 'silver', 'Per un soffio', 'Hai vinto un round per un solo punto.', 'Più vicino di così…',
   'close_rounds', '{}', 1, 150, 0, null),
  (13, 'silver', 'Inarrestabile', 'Hai vinto 5 partite di fila contro altri giocatori.', 'Non fermarti.',
   'best_streak', '{}', 5, 150, 0, null),
  (14, 'silver', 'Giornata perfetta', 'Hai superato tutte le Minacce dell''Emergenza in un giorno.', 'La città ringrazia.',
   'emergency_perfect_runs', '{}', 1, 0, 1, null),
  (15, 'silver', 'Collezionista', 'Hai 50 personaggi diversi.', 'L''album si riempie…',
   'characters_owned', '{}', 50, 0, 1, null),
  (16, 'silver', 'Habitué', 'Hai ritirato il pacchetto del giorno 30 volte.', 'Torna ogni giorno.',
   'daily_packs', '{}', 30, 0, 1, null),
  (17, 'gold', 'Conquistatore', 'Hai conquistato 10 carte, da almeno 5 avversari diversi.', 'Il bottino dei vincitori.',
   'cards_conquered', '{"per_opponent_cap": 2}', 10, 0, 2, 'Il Conquistatore'),
  (18, 'gold', 'Domatore di macchine', 'Hai vinto 10 partite contro il bot Super Pro.', 'La macchina più forte.',
   'matches_won', '{"opponent": "bot", "bot_difficulties": ["super_pro"]}', 10, 0, 2, 'Domatore di macchine'),
  (19, 'gold', 'Tutte le strade', 'Hai vinto almeno una partita in ogni modalità.', 'Prova di tutto.',
   'modes_won', '{}', 6, 0, 2, null),
  (20, 'gold', 'Galleria d''arte', 'Hai varianti in 10 stili diversi.', 'Un museo in tasca.',
   'variant_styles', '{}', 10, 0, 2, null),
  (21, 'gold', 'Fino all''ultima pagina', 'Hai completato la prima stagione della Storia.', 'Ogni storia ha una fine.',
   'story_missions', '{"season": 1, "all": true}', 1, 0, 2, null),
  (22, 'legend', 'Ogni volto del male', 'Hai tutti i Supercattivi.', 'Collezionali tutti… i cattivi.',
   'characters_owned', '{"faction": "villains", "all": true}', 1, 0, 3, 'Volto del male'),
  (23, 'legend', 'Bestiario completo', 'Hai avvistato tutte le Minacce rare.', 'Le hai viste tutte?',
   'rare_threats_seen', '{"all": true}', 1, 0, 3, 'Cacciatore di Minacce'),
  (24, 'legend', 'La lettera più rara', 'Hai 10 personaggi Omega diversi.', 'Alfa non basta.',
   'characters_owned', '{"min_rarity_rank": 5}', 10, 0, 3, 'Leggenda Omega'),
  (25, 'legend', 'Cento', 'Hai vinto 100 partite contro altri giocatori.', 'Un numero a tre cifre.',
   'matches_won', '{"opponent": "player"}', 100, 0, 3, 'Il Centurione');
