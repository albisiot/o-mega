-- Sfide a tema (SPEC §8.8): an existing mode, for a while, played only with some characters.
-- Admins create them from /gestione-sfide; players find them in Gioca on their mode's tile.
--
-- First stage: Classica and Allarme Triplo against the bots. A challenge says which bots, and
-- its squad rules (jsonb, normalized by challenge_normalize_rules):
--   {"rarities": [...], "factions": [...], "traits": [...], "min_variants": 0, "all_variants": false}
-- rarities, factions and traits work like an event's admitted characters (card_admitted_by_event,
-- card_matches_traits); none listed admits everyone. The variant rule counts fielded copies with
-- an artwork variant (card_instances.variant_id).
--
-- The server decides: challenge_create_bot_match checks the challenge (open, bot, matches of the
-- day), creates the match as any bot match, then copies the rules onto it
-- (challenge_match_terms). A trigger on that copy checks the squad against the rules: no match
-- is ever a challenge match with a squad that breaks them, whatever path made it. An admin edit
-- applies to the matches created after it.
--
-- A challenge linked to an event gives that event's points with its own row (win, draw, loss)
-- instead of the event's row and admitted characters (award_event_points). Not linked, its
-- matches count as any match of their mode. Rewards (§8.4), objectives, imprese and
-- leaderboards see a bot match of its format.

insert into public.game_config (key, value, description) values
  ('challenges.max_event_points', '1000', 'Highest event points a Sfida a tema match can give, per outcome'),
  ('challenges.max_daily_limit', '20', 'Highest number of matches a day a Sfida a tema can allow'),
  ('challenges.max_days', '90', 'Longest a Sfida a tema can last, in days'),
  ('challenges.title_max_length', '40', 'Longest title of a Sfida a tema'),
  ('challenges.description_max_length', '140', 'Longest description of a Sfida a tema');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  -- '#rrggbb': the ribbon in Gioca and the band of its card.
  color text not null check (color ~ '^#[0-9a-f]{6}$'),
  format text not null check (format in ('classic', 'boss', 'triple', 'quadrant', 'quadrant_shifting')),
  -- The bots players may choose, at least one.
  bot_difficulties text[] not null check (
    cardinality(bot_difficulties) >= 1 and bot_difficulties <@ array['easy', 'medium', 'hard', 'super_pro']
  ),
  -- The bot plays with characters the rules admit too.
  bot_follows_rules boolean not null default true,
  rules jsonb not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- Matches a player may start a game day; null: no limit.
  daily_limit integer check (daily_limit >= 1),
  -- Linked to an event: its matches give that event's points, with event_points.
  event_id uuid references public.events (id) on delete set null,
  event_points jsonb,
  is_active boolean not null default true,
  -- Raised by every save, copied onto the matches.
  version integer not null default 1,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint challenges_period check (ends_at > starts_at)
);

comment on table public.challenges is
  'Sfide a tema (SPEC §8.8): an existing mode, between two dates, played only with the characters the rules admit.';

create index challenges_event_id_idx on public.challenges (event_id);
create index challenges_created_by_idx on public.challenges (created_by);
create index challenges_open_idx on public.challenges (ends_at) where is_active;

alter table public.matches add column challenge_id uuid references public.challenges (id);
create index matches_challenge_idx on public.matches (challenge_id, player_a, created_at) where challenge_id is not null;

comment on column public.matches.challenge_id is 'The Sfida a tema the match was played in; its rules are in challenge_match_terms.';

create table public.challenge_match_terms (
  match_id uuid primary key references public.matches (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id),
  version integer not null,
  title text not null,
  color text not null,
  rules jsonb not null,
  event_id uuid references public.events (id) on delete set null,
  event_points jsonb
);

comment on table public.challenge_match_terms is
  'A Sfida a tema as it was when its match was created: an admin edit applies to later matches.';

create index challenge_match_terms_challenge_idx on public.challenge_match_terms (challenge_id);
create index challenge_match_terms_event_idx on public.challenge_match_terms (event_id);

-- No policies: get_challenges, the match payload and the admin functions show what may be seen.
alter table public.challenges enable row level security;
alter table public.challenge_match_terms enable row level security;
revoke all on table public.challenges, public.challenge_match_terms from anon, authenticated;

-- ---------------------------------------------------------------------------
-- The rules
-- ---------------------------------------------------------------------------

-- The modes a challenge can be played in today.
create function public.challenge_formats()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['classic', 'triple']
$$;

revoke execute on function public.challenge_formats() from public, anon, authenticated;

-- One list of the rules as text[]: rarities, factions or traits.
create function public.challenge_rule_list(p_rules jsonb, p_key text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array(select jsonb_array_elements_text(p_rules -> p_key)), '{}')
$$;

revoke execute on function public.challenge_rule_list(jsonb, text) from public, anon, authenticated;

-- The rules checked and in their one form: known codes, sorted and without repeats, a variant
-- rule between 0 and a squad. Raises challenge_invalid_rules otherwise.
create function public.challenge_normalize_rules(p_rules jsonb)
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
begin
  if jsonb_typeof(p_rules) is distinct from 'object' then
    raise exception 'challenge_invalid_rules';
  end if;
  foreach v_key in array array['rarities', 'factions', 'traits'] loop
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
                where not exists (select 1 from public.traits x where x.code = t)) then
    raise exception 'challenge_invalid_rules';
  end if;

  begin
    v_min := coalesce((p_rules ->> 'min_variants')::integer, 0);
    v_all := coalesce((p_rules ->> 'all_variants')::boolean, false);
  exception when others then
    raise exception 'challenge_invalid_rules';
  end;
  if v_min not between 0 and public.config_int('quadrant.deck_size') then
    raise exception 'challenge_invalid_rules';
  end if;

  return v_lists || jsonb_build_object('min_variants', case when v_all then 0 else v_min end, 'all_variants', v_all);
end;
$$;

revoke execute on function public.challenge_normalize_rules(jsonb) from public, anon, authenticated;

-- True when the character passes the rarity, faction and trait rules.
create function public.challenge_admits(p_definition_id uuid, p_rules jsonb)
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.card_admitted_by_event(
    p_definition_id,
    public.challenge_rule_list(p_rules, 'traits'),
    public.challenge_rule_list(p_rules, 'rarities'),
    public.challenge_rule_list(p_rules, 'factions')
  )
$$;

revoke execute on function public.challenge_admits(uuid, jsonb) from public, anon, authenticated;

-- Copies of a squad of this size that must have a variant.
create function public.challenge_variants_needed(p_rules jsonb, p_size integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when coalesce((p_rules ->> 'all_variants')::boolean, false) then p_size
              else least(greatest(coalesce((p_rules ->> 'min_variants')::integer, 0), 0), p_size) end
$$;

revoke execute on function public.challenge_variants_needed(jsonb, integer) from public, anon, authenticated;

-- The characters players can field under the rules (active, not level cards), and those of
-- them with an active variant.
create function public.challenge_admitted_counts(p_rules jsonb)
returns table (admitted integer, with_variant integer)
language sql
stable
set search_path = ''
as $$
  select count(*)::integer,
         count(*) filter (where exists (
           select 1 from public.card_variants v where v.definition_id = d.id and v.is_active
         ))::integer
  from public.card_definitions d
  where d.is_active and d.unlock_level is null and public.challenge_admits(d.id, p_rules)
$$;

revoke execute on function public.challenge_admitted_counts(jsonb) from public, anon, authenticated;

-- What is wrong with a squad under the rules, as an error code; null when it keeps them.
-- The squad itself (size, owner, repeats) is checked by validate_team_for first.
create function public.challenge_team_problem(p_rules jsonb, p_format text, p_instance_ids uuid[])
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
  select count(*) into v_variants
  from public.card_instances i
  where i.id = any (p_instance_ids) and i.variant_id is not null;
  if v_variants < public.challenge_variants_needed(p_rules, public.team_size_for(p_format)) then
    return 'challenge_variants_required';
  end if;
  return null;
end;
$$;

revoke execute on function public.challenge_team_problem(jsonb, text, uuid[]) from public, anon, authenticated;

-- Matches the player started in the challenge this game day, abandoned ones too.
create function public.challenge_plays_today(p_user uuid, p_challenge_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer
  from public.matches m
  where m.challenge_id = p_challenge_id and m.player_a = p_user
    and public.game_day(m.created_at) = public.game_day()
$$;

revoke execute on function public.challenge_plays_today(uuid, uuid) from public, anon, authenticated;

-- A match can start in the challenge now, against this bot, for this player. Raises otherwise.
create function public.challenge_check_start(p_user uuid, p_challenge public.challenges, p_difficulty text)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_challenge.id is null then
    raise exception 'challenge_not_found';
  end if;
  if not p_challenge.is_active or now() < p_challenge.starts_at or now() >= p_challenge.ends_at then
    raise exception 'challenge_closed';
  end if;
  if not p_challenge.format = any (public.challenge_formats()) then
    raise exception 'challenge_format_unsupported';
  end if;
  if p_difficulty is null or not p_difficulty = any (p_challenge.bot_difficulties) then
    raise exception 'challenge_bot_not_allowed';
  end if;
  if p_challenge.daily_limit is not null
     and public.challenge_plays_today(p_user, p_challenge.id) >= p_challenge.daily_limit then
    raise exception 'challenge_daily_limit';
  end if;
end;
$$;

revoke execute on function public.challenge_check_start(uuid, public.challenges, text) from public, anon, authenticated;

-- The safety net: a match becomes a challenge match only with a squad that keeps the rules
-- copied onto it, whatever function created it.
create function public.check_challenge_match_terms()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_team uuid[];
  v_problem text;
begin
  select * into v_match from public.matches where id = new.match_id;
  if v_match.id is null or v_match.challenge_id is distinct from new.challenge_id then
    raise exception 'challenge_match_mismatch';
  end if;
  select t.card_instance_ids into v_team
  from public.match_teams t
  where t.match_id = new.match_id and t.side = 'a' and t.user_id = v_match.player_a;
  v_problem := public.challenge_team_problem(new.rules, v_match.format, v_team);
  if v_team is null or v_problem is not null then
    raise exception '%', coalesce(v_problem, 'challenge_card_not_admitted');
  end if;
  return new;
end;
$$;

revoke execute on function public.check_challenge_match_terms() from public, anon, authenticated;

create trigger challenge_match_terms_check
  before insert on public.challenge_match_terms
  for each row execute function public.check_challenge_match_terms();

-- ---------------------------------------------------------------------------
-- Matches (service only: the Edge Function)
-- ---------------------------------------------------------------------------

-- Before building the bot: the challenge's mode, and the characters its bot may use (null:
-- the whole catalog). Raises when the player cannot start a match in it now.
create function public.challenge_bot_context(p_user uuid, p_challenge_id uuid, p_difficulty text)
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
    'admitted_definition_ids', case when v_challenge.bot_follows_rules then (
      select coalesce(jsonb_agg(d.id), '[]'::jsonb)
      from public.card_definitions d
      where d.is_active and d.unlock_level is null and public.challenge_admits(d.id, v_challenge.rules)
    ) end
  );
end;
$$;

revoke execute on function public.challenge_bot_context(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.challenge_bot_context(uuid, uuid, text) to service_role;

-- A match in a challenge against a bot: the match of its mode, as always, then its rules
-- copied onto it (the copy checks the squad). Classica gets its threats from the Edge
-- Function; the Allarme Triplo draws them in the database.
create function public.challenge_create_bot_match(
  p_user uuid,
  p_challenge_id uuid,
  p_difficulty text,
  p_card_instance_ids uuid[],
  p_bot_definition_ids uuid[],
  p_threat_ids uuid[] default null
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

  v_match := case v_challenge.format
    when 'classic' then public.match_create_bot(p_user, p_difficulty, p_card_instance_ids, p_bot_definition_ids, p_threat_ids)
    when 'triple' then public.match_create_triple_bot(p_user, p_difficulty, p_card_instance_ids, p_bot_definition_ids, null)
  end;
  if v_match is null then
    raise exception 'challenge_format_unsupported';
  end if;

  update public.matches set challenge_id = v_challenge.id where id = v_match;
  insert into public.challenge_match_terms (match_id, challenge_id, version, title, color, rules, event_id, event_points)
  values (v_match, v_challenge.id, v_challenge.version, v_challenge.title, v_challenge.color, v_challenge.rules,
          v_challenge.event_id, v_challenge.event_points);
  return v_match;
end;
$$;

revoke execute on function public.challenge_create_bot_match(uuid, uuid, text, uuid[], uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public.challenge_create_bot_match(uuid, uuid, text, uuid[], uuid[], uuid[]) to service_role;

-- ---------------------------------------------------------------------------
-- What players see
-- ---------------------------------------------------------------------------

-- A challenge as Gioca, the team screen and /evento read it. p_user null: no own counts.
create function public.challenge_payload(p_challenge public.challenges, p_user uuid)
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
    'rules', p_challenge.rules,
    -- The rarity, faction and trait rules as players read them: [{"category": "Rarità", "traits": [...]}, ...].
    'admitted', public.event_admitted_description(
      public.challenge_rule_list(p_challenge.rules, 'traits'),
      public.challenge_rule_list(p_challenge.rules, 'rarities'),
      public.challenge_rule_list(p_challenge.rules, 'factions')
    ),
    'admitted_characters', (select c.admitted from public.challenge_admitted_counts(p_challenge.rules) c),
    'team_size', public.team_size_for(p_challenge.format),
    'starts_at', p_challenge.starts_at,
    'ends_at', p_challenge.ends_at,
    'daily_limit', p_challenge.daily_limit,
    'plays_today', case when p_user is null then 0 else public.challenge_plays_today(p_user, p_challenge.id) end,
    -- The player's admitted characters, and those owned with a variant: can they field a squad?
    'my_characters', case when p_user is not null then (
      select count(distinct i.definition_id) from public.card_instances i
      where i.owner_id = p_user and public.challenge_admits(i.definition_id, p_challenge.rules)
    ) end,
    'my_characters_with_variant', case when p_user is not null then (
      select count(distinct i.definition_id) from public.card_instances i
      where i.owner_id = p_user and i.variant_id is not null and public.challenge_admits(i.definition_id, p_challenge.rules)
    ) end,
    'event', (
      select jsonb_build_object('id', e.id, 'title', e.title, 'starts_at', e.starts_at, 'ends_at', e.ends_at)
      from public.events e where e.id = p_challenge.event_id
    ),
    'event_points', p_challenge.event_points
  )
$$;

revoke execute on function public.challenge_payload(public.challenges, uuid) from public, anon, authenticated;

-- The challenges running or to come, for the signed-in player.
create function public.get_challenges()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'now', now(),
    'challenges', coalesce((
      select jsonb_agg(public.challenge_payload(c, auth.uid()) order by c.starts_at, c.created_at)
      from public.challenges c
      where c.is_active and c.ends_at > now()
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.get_challenges() from public, anon;
grant execute on function public.get_challenges() to authenticated;

-- The challenge of a match, for its result screen: title, color, and the matches left today.
create function public.with_challenge(p_payload jsonb, p_match_id uuid, p_side text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case when t.match_id is null then p_payload
    else p_payload || jsonb_build_object('challenge', jsonb_build_object(
      'id', t.challenge_id,
      'title', t.title,
      'color', t.color,
      'daily_limit', c.daily_limit,
      'plays_today', public.challenge_plays_today(case p_side when 'a' then m.player_a else m.player_b end, t.challenge_id)
    ))
  end
  from (select 1) as one
  left join public.challenge_match_terms t on t.match_id = p_match_id
  left join public.challenges c on c.id = t.challenge_id
  left join public.matches m on m.id = t.match_id
$$;

revoke execute on function public.with_challenge(jsonb, uuid, text) from public, anon, authenticated;

-- Same as in 20261117230000_ranked.sql, with the challenge.
create or replace function public.match_state_payload(p_match_id uuid, p_side text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.with_challenge(
    public.with_ranked(public.match_state_unranked_payload(p_match_id, p_side), p_match_id, p_side),
    p_match_id,
    p_side
  )
$$;

-- Same as in 20261117230000_ranked.sql: the history also names the challenge of a match.
create or replace function public.get_match_history(p_limit integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    (case when rm.match_id is null then x.e
     else x.e
       || jsonb_build_object('ranked', jsonb_build_object(
            'delta', case when m.player_a = auth.uid() then rm.delta_a else rm.delta_b end
          ))
       || case when g.id is null then '{}'::jsonb else jsonb_build_object('opponent', g.username) end
     end)
    || case when t.match_id is null then '{}'::jsonb
       else jsonb_build_object('challenge', jsonb_build_object('title', t.title, 'color', t.color)) end
    order by x.ord
  ), '[]'::jsonb)
  from jsonb_array_elements(public.get_match_unranked_history(p_limit)) with ordinality as x(e, ord)
  left join public.ranked_matches rm on rm.match_id = (x.e ->> 'id')::uuid
  left join public.matches m on m.id = rm.match_id
  left join public.ranked_ghosts g on g.id = rm.ghost_id
  left join public.challenge_match_terms t on t.match_id = (x.e ->> 'id')::uuid
$$;

-- ---------------------------------------------------------------------------
-- Event points: a challenge match linked to the event gives the challenge's row
-- (same as in 20261118234000_variant_counts.sql otherwise)
-- ---------------------------------------------------------------------------

create or replace function public.award_event_points(
  p_user uuid,
  p_kind text,
  p_outcome text,
  p_ref_id uuid,
  p_round integer,
  p_opponent uuid,
  p_started_at timestamptz
)
returns integer
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_event public.events;
  v_terms public.challenge_match_terms;
  v_points integer;
  v_earned_today integer;
  v_total integer;
  v_tier public.event_tiers;
begin
  select * into v_event from public.events where id = public.current_event_id();
  if v_event.id is null or (p_started_at is not null and p_started_at < v_event.starts_at) then
    return 0;
  end if;

  -- A Sfida a tema linked to this event: its own points, and its rules instead of the
  -- event's admitted characters (they were checked when the match started).
  if p_kind <> 'emergency' then
    select * into v_terms from public.challenge_match_terms where match_id = p_ref_id;
  end if;
  if v_terms.match_id is not null and v_terms.event_id = v_event.id then
    v_points := coalesce((v_terms.event_points ->> p_outcome)::integer, 0);
  else
    -- An event that admits only some characters: the whole team must be admitted.
    if not public.event_admits_everyone(v_event.traits, v_event.rarities, v_event.factions)
       and not public.event_team_admitted(v_event.traits, v_event.rarities, v_event.factions,
                                          public.event_ref_team(p_user, p_ref_id)) then
      return 0;
    end if;
    v_points := coalesce((v_event.points -> p_kind ->> p_outcome)::integer, 0);
  end if;
  if v_points <= 0 then
    return 0;
  end if;
  -- Variants in the team: each adds the event's share of the points, rounded down.
  if v_event.variant_bonus_percent is not null then
    v_points := v_points + floor(
      v_points * v_event.variant_bonus_percent * public.event_ref_team_variants(p_user, p_ref_id) / 100.0
    )::integer;
  end if;

  -- One player at a time: the daily cap and the targets cannot be passed twice.
  perform 1 from public.profiles where id = p_user for update;

  if p_opponent is not null and (
    select count(*) from public.event_points p
    where p.event_id = v_event.id and p.user_id = p_user and p.opponent_id = p_opponent
      and p.created_at > now() - make_interval(hours => public.config_int('events.same_opponent_window_hours'))
  ) >= public.config_int('events.same_opponent_matches') then
    return 0;
  end if;

  if v_event.daily_cap is not null then
    select coalesce(sum(p.points), 0) into v_earned_today
    from public.event_points p
    where p.event_id = v_event.id and p.user_id = p_user and public.game_day(p.created_at) = public.game_day();
    v_points := least(v_points, v_event.daily_cap - v_earned_today);
    if v_points <= 0 then
      return 0;
    end if;
  end if;

  insert into public.event_points (event_id, user_id, kind, outcome, ref_id, round, opponent_id, points)
  values (v_event.id, p_user, p_kind, p_outcome, p_ref_id, coalesce(p_round, 0), p_opponent, v_points)
  on conflict do nothing;
  if not found then
    return 0;
  end if;

  select sum(p.points) into v_total from public.event_points p where p.event_id = v_event.id and p.user_id = p_user;
  for v_tier in
    select * from public.event_tiers t
    where t.event_id = v_event.id and t.points <= v_total
      and not exists (select 1 from public.event_rewards r where r.event_id = t.event_id and r.tier = t.tier and r.user_id = p_user)
    order by t.tier
  loop
    perform public.grant_event_tier(p_user, v_tier);
  end loop;
  return v_points;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin (/gestione-sfide): every function checks is_admin() on the server
-- ---------------------------------------------------------------------------

-- Every challenge with how much it was played, and the events it can be linked to.
create function public.admin_challenges_payload()
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
          'matches', (select count(*) from public.matches m where m.challenge_id = c.id),
          'players', (select count(distinct m.player_a) from public.matches m where m.challenge_id = c.id)
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
    ), '[]'::jsonb)
  )
$$;

revoke execute on function public.admin_challenges_payload() from public, anon, authenticated;

create function public.admin_list_challenges()
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
  return public.admin_challenges_payload();
end;
$$;

revoke execute on function public.admin_list_challenges() from public, anon;
grant execute on function public.admin_list_challenges() to authenticated;

-- How many characters the rules admit, and how many players could field a squad today.
create function public.admin_preview_challenge(p_format text, p_rules jsonb)
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
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if p_format is null or not p_format = any (public.challenge_formats()) then
    raise exception 'challenge_invalid_format';
  end if;
  v_rules := public.challenge_normalize_rules(p_rules);
  v_size := public.team_size_for(p_format);
  v_needed := public.challenge_variants_needed(v_rules, v_size);
  select * into v_counts from public.challenge_admitted_counts(v_rules);

  with admitted as (
    select d.id from public.card_definitions d
    where d.is_active and d.unlock_level is null and public.challenge_admits(d.id, v_rules)
  ),
  owned as (
    select i.owner_id, i.definition_id, bool_or(i.variant_id is not null) as has_variant
    from public.card_instances i
    join admitted a on a.id = i.definition_id
    where i.owner_id is not null
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
    'players_total', (select count(*) from public.profiles)
  );
end;
$$;

revoke execute on function public.admin_preview_challenge(text, jsonb) from public, anon;
grant execute on function public.admin_preview_challenge(text, jsonb) to authenticated;

-- Creates (p_id null) or changes a challenge. A started one changes only title, description
-- and end, so the rules never change for who is playing; an ended one never changes.
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
  p_id uuid default null
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
  v_challenge public.challenges;
  v_started boolean := false;
  v_event public.events;
  v_rules jsonb;
  v_size integer;
  v_counts record;
  v_points jsonb;
  v_outcome text;
  v_value integer;
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
    -- The end only: later than now, within the longest a challenge lasts and its event.
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
    set title = v_title, description = v_description, ends_at = v_ends, version = version + 1
    where id = p_id;
    return public.admin_challenges_payload();
  end if;

  if v_color !~ '^#[0-9a-f]{6}$' then
    raise exception 'challenge_invalid_color';
  end if;
  if p_format is null or not p_format = any (public.challenge_formats()) then
    raise exception 'challenge_invalid_format';
  end if;
  if cardinality(v_bots) = 0 or not v_bots <@ array['easy', 'medium', 'hard', 'super_pro'] then
    raise exception 'challenge_invalid_bots';
  end if;

  -- Enough characters for a squad of the mode, and enough of them with a variant.
  v_rules := public.challenge_normalize_rules(p_rules);
  v_size := public.team_size_for(p_format);
  select * into v_counts from public.challenge_admitted_counts(v_rules);
  if v_counts.admitted < v_size or v_counts.with_variant < public.challenge_variants_needed(v_rules, v_size) then
    raise exception 'challenge_too_few_characters';
  end if;

  if v_starts is null or v_ends is null or v_ends <= v_starts or v_ends <= now()
     or v_ends - v_starts > make_interval(days => public.config_int('challenges.max_days')) then
    raise exception 'challenge_invalid_period';
  end if;
  if p_daily_limit is not null and p_daily_limit not between 1 and public.config_int('challenges.max_daily_limit') then
    raise exception 'challenge_invalid_daily_limit';
  end if;

  -- Linked to an event: within its dates, with a whole points row.
  if p_event_id is not null then
    select * into v_event from public.events where id = p_event_id;
    if v_event.id is null or not v_event.is_active or v_event.ends_at <= now()
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

  if exists (
    select 1 from public.challenges x
    where x.is_active and x.format = p_format and x.id is distinct from p_id
      and x.starts_at < v_ends and x.ends_at > v_starts
  ) then
    raise exception 'challenge_overlap';
  end if;

  if p_id is null then
    insert into public.challenges (title, description, color, format, bot_difficulties, bot_follows_rules, rules,
                                   starts_at, ends_at, daily_limit, event_id, event_points, created_by)
    values (v_title, v_description, v_color, p_format, v_bots, coalesce(p_bot_follows_rules, true), v_rules,
            v_starts, v_ends, p_daily_limit, p_event_id, v_points, auth.uid());
  else
    update public.challenges
    set title = v_title, description = v_description, color = v_color, format = p_format,
        bot_difficulties = v_bots, bot_follows_rules = coalesce(p_bot_follows_rules, true), rules = v_rules,
        starts_at = v_starts, ends_at = v_ends, daily_limit = p_daily_limit, event_id = p_event_id,
        event_points = v_points, version = version + 1
    where id = p_id;
  end if;
  return public.admin_challenges_payload();
end;
$$;

revoke execute on function public.admin_save_challenge(text, text, text, text, text[], boolean, jsonb, timestamp, timestamp, integer, uuid, jsonb, uuid) from public, anon;
grant execute on function public.admin_save_challenge(text, text, text, text, text[], boolean, jsonb, timestamp, timestamp, integer, uuid, jsonb, uuid) to authenticated;

-- Turns a challenge off (it leaves Gioca at once) or back on, if it has not ended.
create function public.admin_set_challenge_active(p_id uuid, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_challenge public.challenges;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('public.challenges'));
  select * into v_challenge from public.challenges where id = p_id for update;
  if v_challenge.id is null then
    raise exception 'challenge_not_found';
  end if;
  if p_active and not v_challenge.is_active then
    if v_challenge.ends_at <= now() then
      raise exception 'challenge_ended';
    end if;
    if exists (
      select 1 from public.challenges x
      where x.is_active and x.format = v_challenge.format and x.id <> v_challenge.id
        and x.starts_at < v_challenge.ends_at and x.ends_at > v_challenge.starts_at
    ) then
      raise exception 'challenge_overlap';
    end if;
  end if;
  update public.challenges set is_active = coalesce(p_active, false) where id = p_id;
  return public.admin_challenges_payload();
end;
$$;

revoke execute on function public.admin_set_challenge_active(uuid, boolean) from public, anon;
grant execute on function public.admin_set_challenge_active(uuid, boolean) to authenticated;

-- Deletes a challenge nobody has played; a played one is turned off instead.
create function public.admin_delete_challenge(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if exists (select 1 from public.matches m where m.challenge_id = p_id) then
    raise exception 'challenge_in_use';
  end if;
  delete from public.challenges where id = p_id;
  if not found then
    raise exception 'challenge_not_found';
  end if;
  return public.admin_challenges_payload();
end;
$$;

revoke execute on function public.admin_delete_challenge(uuid) from public, anon;
grant execute on function public.admin_delete_challenge(uuid) to authenticated;
