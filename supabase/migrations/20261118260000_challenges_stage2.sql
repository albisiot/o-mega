-- Sfide a tema, second stage (SPEC §8.8), on top of 20261118250000_challenges.sql:
--
-- - every mode against the bots: Grande Minaccia and Quadrante too (both grids), with an
--   optional seal target for the Quadrante (as events have, §5.14 point 8 bis);
-- - friendly online: a queue per challenge (challenge_queue, any two players of the same
--   challenge) and friend codes (match_lobbies.challenge_id); both squads keep the rules;
-- - more squad rules: variant styles (only variants of those styles count), characters banned
--   or an only-these list, no starter copies nor level cards; a minimum player level;
-- - a prize of its own: up to 3 targets of wins in the challenge, each paid once with the
--   rewards of a bonus code (coins, packs, cards, random variants), with a banner;
-- - its own row in Ricompense partite (mode_key 'challenge'), a «Sfide a tema» filter for the
--   daily objectives, and a banner «Nuova Sfida a tema!» the first time a player sees one.

insert into public.game_config (key, value, description) values
  ('challenges.max_tiers', '3', 'Prize targets of wins a Sfida a tema can have'),
  ('challenges.max_tier_wins', '100', 'Most wins a Sfida a tema prize target can ask'),
  ('challenges.max_min_level', '100', 'Highest minimum player level a Sfida a tema can ask');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

alter table public.challenges
  add column online boolean not null default false,
  add column min_level integer check (min_level >= 1),
  add column quadrant_seal_target integer check (quadrant_seal_target >= 1);

-- Online only: a challenge may have no bot.
alter table public.challenges drop constraint challenges_bot_difficulties_check;
alter table public.challenges add constraint challenges_opponents check (
  bot_difficulties <@ array['easy', 'medium', 'hard', 'super_pro'] and (cardinality(bot_difficulties) >= 1 or online)
);

comment on column public.challenges.online is 'Friendly online play in the challenge: its own queue and friend codes.';
comment on column public.challenges.min_level is 'Players under this level cannot play the challenge; null: any level.';

create table public.challenge_tiers (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  tier integer not null check (tier >= 1),
  wins integer not null check (wins >= 1),
  coins integer not null default 0 check (coins >= 0),
  packs integer not null default 0 check (packs >= 0),
  card_definition_ids uuid[] not null default '{}',
  card_variant_ids uuid[] not null default '{}',
  random_variants jsonb,
  primary key (challenge_id, tier),
  constraint challenge_tiers_variants_per_card check (cardinality(card_variant_ids) = cardinality(card_definition_ids))
);

comment on table public.challenge_tiers is 'The prize of a Sfida a tema: targets of wins in it, each with the rewards of a bonus code.';

create table public.challenge_rewards (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  tier integer not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  coins integer not null default 0,
  packs integer not null default 0,
  -- The cards and packs it paid, shown with the pack reveal.
  opening_ids uuid[] not null default '{}',
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (challenge_id, tier, user_id)
);

create index challenge_rewards_user_idx on public.challenge_rewards (user_id);

comment on table public.challenge_rewards is 'Targets of a Sfida a tema reached by each player: each is paid once.';

-- The friendly queue of each challenge: any two players of the same challenge are paired.
create table public.challenge_queue (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  format text not null,
  card_instance_ids uuid[] not null,
  enqueued_at timestamptz not null default now(),
  refreshed_at timestamptz not null default now()
);

create index challenge_queue_challenge_idx on public.challenge_queue (challenge_id, enqueued_at);

-- The players already told about a challenge with the banner.
create table public.challenge_notices (
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, challenge_id)
);

create index challenge_notices_challenge_idx on public.challenge_notices (challenge_id);

alter table public.match_lobbies add column challenge_id uuid references public.challenges (id) on delete cascade;
create index match_lobbies_challenge_idx on public.match_lobbies (challenge_id) where challenge_id is not null;

-- No policies: the functions below show what may be seen.
alter table public.challenge_tiers enable row level security;
alter table public.challenge_rewards enable row level security;
alter table public.challenge_queue enable row level security;
alter table public.challenge_notices enable row level security;
revoke all on table public.challenge_tiers, public.challenge_rewards, public.challenge_queue, public.challenge_notices
  from anon, authenticated;

-- The prize's coins, cards and packs, and its banners.
alter table public.card_instances drop constraint card_instances_acquired_via_check;
alter table public.card_instances add constraint card_instances_acquired_via_check check (acquired_via in (
  'starter', 'pack', 'conquest', 'trade', 'level_unlock', 'bonus_code', 'story', 'event', 'objective', 'achievement', 'challenge'
));
alter table public.card_transfers drop constraint card_transfers_reason_check;
alter table public.card_transfers add constraint card_transfers_reason_check check (reason in (
  'starter', 'pack', 'conquest', 'trade', 'conversion', 'level_unlock', 'bonus_code', 'story', 'event', 'objective',
  'achievement', 'challenge'
));
alter table public.coin_ledger drop constraint coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in (
  'pack_purchase', 'match_reward', 'bot_match_reward', 'duplicate_conversion', 'conquest_bonus', 'level_reward',
  'emergency_reward', 'bonus_code', 'story_reward', 'story_star', 'event_reward', 'objective_reward', 'achievement_reward',
  'emergency_prize', 'ranked_prize', 'emergency_week_reward', 'emergency_week_prize', 'admin_adjustment', 'challenge_reward'
));
alter table public.pack_openings drop constraint pack_openings_pack_type_check;
alter table public.pack_openings add constraint pack_openings_pack_type_check check (pack_type in (
  'daily', 'standard', 'bonus', 'event', 'special', 'objective', 'match', 'achievement', 'emergency', 'ranked', 'challenge'
));
alter table public.player_notifications drop constraint player_notifications_kind_check;
alter table public.player_notifications add constraint player_notifications_kind_check check (kind in (
  'objective_completed', 'event_reward', 'achievement', 'leaderboard', 'ranked', 'challenge', 'challenge_reward'
));

-- ---------------------------------------------------------------------------
-- The rules
-- ---------------------------------------------------------------------------

-- Every mode with matches can have a challenge now.
create or replace function public.challenge_formats()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['classic', 'boss', 'triple', 'quadrant', 'quadrant_shifting']
$$;

-- The rules checked and in their one form (same as in 20261118250000_challenges.sql, with
-- variant_styles, banned, only and no_starters). Variant styles without a variant rule mean
-- nothing and are dropped. Raises challenge_invalid_rules otherwise.
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

  return v_lists || jsonb_build_object('min_variants', v_min, 'all_variants', v_all, 'no_starters', v_no_starters);
end;
$$;

-- True when the character passes the rules of the character: rarity, faction, traits, the
-- banned and only-these lists, and no level cards when starters are out.
create or replace function public.challenge_admits(p_definition_id uuid, p_rules jsonb)
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
    and exists (
      select 1 from public.card_definitions d
      where d.id = p_definition_id
        and not d.code = any (public.challenge_rule_list(p_rules, 'banned'))
        and (cardinality(public.challenge_rule_list(p_rules, 'only')) = 0
             or d.code = any (public.challenge_rule_list(p_rules, 'only')))
        and (not coalesce((p_rules ->> 'no_starters')::boolean, false) or d.unlock_level is null)
    )
$$;

-- True when a fielded copy counts as a variant for the rules: it has one, of a listed style if
-- the rules list styles.
create function public.challenge_variant_counts(p_variant_id uuid, p_rules jsonb)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_variant_id is not null and (
    cardinality(public.challenge_rule_list(p_rules, 'variant_styles')) = 0
    or exists (
      select 1 from public.card_variants v
      where v.id = p_variant_id and v.style = any (public.challenge_rule_list(p_rules, 'variant_styles'))
    )
  )
$$;

revoke execute on function public.challenge_variant_counts(uuid, jsonb) from public, anon, authenticated;

-- Same as in 20261118250000_challenges.sql: a variant of a listed style counts.
create or replace function public.challenge_admitted_counts(p_rules jsonb)
returns table (admitted integer, with_variant integer)
language sql
stable
set search_path = ''
as $$
  select count(*)::integer,
         count(*) filter (where exists (
           select 1 from public.card_variants v
           where v.definition_id = d.id and v.is_active
             and (cardinality(public.challenge_rule_list(p_rules, 'variant_styles')) = 0
                  or v.style = any (public.challenge_rule_list(p_rules, 'variant_styles')))
         ))::integer
  from public.card_definitions d
  where d.is_active and d.unlock_level is null and public.challenge_admits(d.id, p_rules)
$$;

-- Same as in 20261118250000_challenges.sql, with starters and variant styles.
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
  if v_variants < public.challenge_variants_needed(p_rules, public.team_size_for(p_format)) then
    return 'challenge_variants_required';
  end if;
  return null;
end;
$$;

-- Matches the player started in the challenge this game day, online ones on either side too.
create or replace function public.challenge_plays_today(p_user uuid, p_challenge_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer
  from public.matches m
  where m.challenge_id = p_challenge_id and p_user in (m.player_a, m.player_b)
    and public.game_day(m.created_at) = public.game_day()
$$;

-- What every start checks: the challenge open in its mode, the player's level, the matches of the day.
create function public.challenge_check_open(p_user uuid, p_challenge public.challenges)
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
  if p_challenge.min_level is not null
     and coalesce((select p.level from public.profiles p where p.id = p_user), 0) < p_challenge.min_level then
    raise exception 'challenge_level_too_low';
  end if;
  if p_challenge.daily_limit is not null
     and public.challenge_plays_today(p_user, p_challenge.id) >= p_challenge.daily_limit then
    raise exception 'challenge_daily_limit';
  end if;
end;
$$;

revoke execute on function public.challenge_check_open(uuid, public.challenges) from public, anon, authenticated;

-- Against a bot: open, and a bot the challenge allows.
create or replace function public.challenge_check_start(p_user uuid, p_challenge public.challenges, p_difficulty text)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  perform public.challenge_check_open(p_user, p_challenge);
  if p_difficulty is null or not p_difficulty = any (p_challenge.bot_difficulties) then
    raise exception 'challenge_bot_not_allowed';
  end if;
end;
$$;

-- Online: open, and played online.
create function public.challenge_check_online(p_user uuid, p_challenge public.challenges)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  perform public.challenge_check_open(p_user, p_challenge);
  if not p_challenge.online then
    raise exception 'challenge_online_not_allowed';
  end if;
end;
$$;

revoke execute on function public.challenge_check_online(uuid, public.challenges) from public, anon, authenticated;

-- The safety net, now for both squads of a match between players.
create or replace function public.check_challenge_match_terms()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_team public.match_teams;
  v_problem text;
  v_sides integer := 0;
begin
  select * into v_match from public.matches where id = new.match_id;
  if v_match.id is null or v_match.challenge_id is distinct from new.challenge_id then
    raise exception 'challenge_match_mismatch';
  end if;
  for v_team in
    select * from public.match_teams t
    where t.match_id = new.match_id and t.user_id is not null and t.user_id in (v_match.player_a, v_match.player_b)
  loop
    v_problem := public.challenge_team_problem(new.rules, v_match.format, v_team.card_instance_ids);
    if v_problem is not null then
      raise exception '%', v_problem;
    end if;
    v_sides := v_sides + 1;
  end loop;
  if v_sides = 0 or (v_match.player_b is not null and v_sides < 2) then
    raise exception 'challenge_card_not_admitted';
  end if;
  return new;
end;
$$;

-- Marks a new match as played in the challenge and copies its rules (the copy checks the squads).
-- A Quadrante takes the challenge's seal target, when it has one.
create function public.challenge_tag_match(p_match_id uuid, p_challenge public.challenges)
returns void
language plpgsql
volatile
set search_path = ''
as $$
begin
  update public.matches
  set challenge_id = p_challenge.id,
      quadrant_seal_target = case when public.is_quadrant(format) and p_challenge.quadrant_seal_target is not null
                                  then p_challenge.quadrant_seal_target else quadrant_seal_target end
  where id = p_match_id;
  insert into public.challenge_match_terms (match_id, challenge_id, version, title, color, rules, event_id, event_points)
  values (p_match_id, p_challenge.id, p_challenge.version, p_challenge.title, p_challenge.color, p_challenge.rules,
          p_challenge.event_id, p_challenge.event_points);
end;
$$;

revoke execute on function public.challenge_tag_match(uuid, public.challenges) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Matches against a bot, every mode (service only: the Edge Function)
-- ---------------------------------------------------------------------------

drop function public.challenge_create_bot_match(uuid, uuid, text, uuid[], uuid[], uuid[]);

-- Classica gets its threats and the Grande Minaccia its points table from the Edge Function;
-- the Allarme Triplo and the Quadrante draw theirs in the database.
create function public.challenge_create_bot_match(
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

revoke execute on function public.challenge_create_bot_match(uuid, uuid, text, uuid[], uuid[], uuid[], jsonb) from public, anon, authenticated;
grant execute on function public.challenge_create_bot_match(uuid, uuid, text, uuid[], uuid[], uuid[], jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Friendly online: a queue per challenge, and friend codes
-- ---------------------------------------------------------------------------

-- A match between two players of the challenge, the one who waited longer as player A.
create function public.challenge_insert_pvp_match(
  p_challenge public.challenges,
  p_player_a uuid, p_team_a uuid[], p_definitions_a uuid[],
  p_player_b uuid, p_team_b uuid[], p_definitions_b uuid[],
  p_threat_ids uuid[], p_boss_values jsonb
)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_match uuid;
begin
  v_match := case
    when p_challenge.format = 'boss' then public.insert_boss_match(
      'friendly', p_player_a, p_team_a, p_definitions_a, p_player_b, p_team_b, p_definitions_b, null, p_boss_values)
    when p_challenge.format = 'triple' then public.insert_triple_match(
      'friendly', p_player_a, p_team_a, p_definitions_a, p_player_b, p_team_b, p_definitions_b, null)
    when public.is_quadrant(p_challenge.format) then public.insert_quadrant_match(
      'friendly', p_challenge.format, p_player_a, p_team_a, p_definitions_a, p_player_b, p_team_b, p_definitions_b, null)
    else public.insert_pvp_match(
      'friendly', p_player_a, p_team_a, p_definitions_a, p_player_b, p_team_b, p_definitions_b, p_threat_ids)
  end;
  perform public.challenge_tag_match(v_match, p_challenge);
  return v_match;
end;
$$;

revoke execute on function public.challenge_insert_pvp_match(public.challenges, uuid, uuid[], uuid[], uuid, uuid[], uuid[], uuid[], jsonb) from public, anon, authenticated;

-- Joins or refreshes the challenge's queue; pairs with anyone else in it. Returns the match, or
-- null while waiting. The waiting page offers the challenge's bot after a while (client side).
create function public.challenge_queue_join(
  p_user uuid,
  p_challenge_id uuid,
  p_team uuid[],
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
  v_definitions uuid[];
  v_problem text;
  v_other public.challenge_queue;
  v_other_definitions uuid[];
  v_match uuid;
begin
  select * into v_challenge from public.challenges where id = p_challenge_id;
  perform public.challenge_check_online(p_user, v_challenge);
  v_definitions := public.validate_team_for(p_user, p_team, v_challenge.format);
  v_problem := public.challenge_team_problem(v_challenge.rules, v_challenge.format, p_team);
  if v_problem is not null then
    raise exception '%', v_problem;
  end if;
  if public.has_active_match(p_user) then
    raise exception 'match_already_active';
  end if;

  if exists (
    select 1 from public.challenge_queue q
    where q.challenge_id = v_challenge.id and q.user_id <> p_user
      and q.refreshed_at > now() - make_interval(secs => public.config_int('matchmaking.queue_stale_seconds'))
  ) then
    -- Serializes pairing with every other queue: two players are never paired twice at once.
    perform pg_advisory_xact_lock(hashtext('o-mega.matchmaking'));
    if public.has_active_match(p_user) then
      raise exception 'match_already_active';
    end if;
    for v_other in
      select * from public.challenge_queue q
      where q.challenge_id = v_challenge.id and q.user_id <> p_user
        and q.refreshed_at > now() - make_interval(secs => public.config_int('matchmaking.queue_stale_seconds'))
      order by q.enqueued_at
    loop
      begin
        v_other_definitions := public.check_team_of(
          v_other.user_id, v_other.card_instance_ids, public.team_size_for(v_challenge.format)
        );
        perform public.challenge_check_online(v_other.user_id, v_challenge);
        v_match := public.challenge_insert_pvp_match(
          v_challenge,
          v_other.user_id, v_other.card_instance_ids, v_other_definitions,
          p_user, p_team, v_definitions,
          p_threat_ids, p_boss_values
        );
        delete from public.challenge_queue where user_id in (p_user, v_other.user_id);
        return v_match;
      exception when others then
        -- That entry is no longer valid (cards gone, already playing, out of matches): drop it.
        if sqlerrm not in (
          'card_not_owned', 'duplicate_card', 'duplicate_character', 'invalid_team_size', 'match_already_active',
          'card_at_stake', 'challenge_card_not_admitted', 'challenge_starter_not_allowed', 'challenge_variants_required',
          'challenge_daily_limit', 'challenge_level_too_low'
        ) then
          raise;
        end if;
        delete from public.challenge_queue where user_id = v_other.user_id;
      end;
    end loop;
  end if;

  -- One way to wait at a time.
  delete from public.match_lobbies where host_id = p_user;
  delete from public.matchmaking_queue where user_id = p_user;
  insert into public.challenge_queue (user_id, challenge_id, format, card_instance_ids)
  values (p_user, v_challenge.id, v_challenge.format, p_team)
  on conflict (user_id) do update
  set format = excluded.format, card_instance_ids = excluded.card_instance_ids, refreshed_at = now(),
      enqueued_at = case when public.challenge_queue.challenge_id = excluded.challenge_id
                         then public.challenge_queue.enqueued_at else now() end,
      challenge_id = excluded.challenge_id;
  return null;
end;
$$;

revoke execute on function public.challenge_queue_join(uuid, uuid, uuid[], uuid[], jsonb) from public, anon, authenticated;
grant execute on function public.challenge_queue_join(uuid, uuid, uuid[], uuid[], jsonb) to service_role;

-- Same as in 20261031120000_pvp.sql: leaving a queue leaves the challenge queues too.
create or replace function public.leave_queue()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.matchmaking_queue where user_id = auth.uid();
  delete from public.challenge_queue where user_id = auth.uid();
$$;

-- A friend code in a challenge: the host's squad keeps its rules; the code says the challenge.
create function public.create_challenge_lobby(p_challenge_id uuid, p_card_instance_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_challenge public.challenges;
  v_problem text;
  v_lobby jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_challenge from public.challenges where id = p_challenge_id;
  perform public.challenge_check_online(v_uid, v_challenge);
  v_lobby := public.create_lobby(p_card_instance_ids, v_challenge.format);
  v_problem := public.challenge_team_problem(v_challenge.rules, v_challenge.format, p_card_instance_ids);
  if v_problem is not null then
    raise exception '%', v_problem;
  end if;
  delete from public.challenge_queue where user_id = v_uid;
  update public.match_lobbies set challenge_id = v_challenge.id where host_id = v_uid and code = v_lobby ->> 'code';
  return v_lobby || jsonb_build_object('challenge_id', v_challenge.id);
end;
$$;

revoke execute on function public.create_challenge_lobby(uuid, uuid[]) from public, anon;
grant execute on function public.create_challenge_lobby(uuid, uuid[]) to authenticated;

-- The challenge of a friend code still valid, so the guest picks a squad that keeps its rules.
create function public.get_lobby_challenge(p_code text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select l.challenge_id from public.match_lobbies l
  where auth.uid() is not null and l.code = upper(btrim(p_code)) and l.expires_at >= now()
$$;

revoke execute on function public.get_lobby_challenge(text) from public, anon;
grant execute on function public.get_lobby_challenge(text) to authenticated;

-- Same as in 20261112110000_quadrant.sql; a code made in a challenge makes a challenge match,
-- with both squads checked against its rules.
create or replace function public.match_join_lobby(
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
  v_challenge public.challenges;
  v_problem text;
begin
  select * into v_lobby from public.match_lobbies where code = upper(btrim(p_code));
  if v_lobby.code is null or v_lobby.expires_at < now() then
    raise exception 'lobby_not_found';
  end if;
  if v_lobby.host_id = p_guest then
    raise exception 'cannot_play_yourself';
  end if;
  v_guest_definitions := public.validate_team_for(p_guest, p_team, v_lobby.format);
  if v_lobby.challenge_id is not null then
    select * into v_challenge from public.challenges where id = v_lobby.challenge_id;
    perform public.challenge_check_online(p_guest, v_challenge);
    v_problem := public.challenge_team_problem(v_challenge.rules, v_challenge.format, p_team);
    if v_problem is not null then
      raise exception '%', v_problem;
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtext('o-mega.matchmaking'));
  select * into v_lobby from public.match_lobbies where code = upper(btrim(p_code));
  if v_lobby.code is null or v_lobby.expires_at < now() then
    raise exception 'lobby_not_found';
  end if;
  v_host_definitions := public.check_team_of(v_lobby.host_id, v_lobby.card_instance_ids, public.team_size_for(v_lobby.format));
  if v_lobby.challenge_id is not null then
    perform public.challenge_check_online(v_lobby.host_id, v_challenge);
    return public.challenge_insert_pvp_match(
      v_challenge,
      v_lobby.host_id, v_lobby.card_instance_ids, v_host_definitions,
      p_guest, p_team, v_guest_definitions,
      p_threat_ids, p_boss_values
    );
  end if;
  if v_lobby.format = 'boss' then
    return public.insert_boss_match(
      'friendly', v_lobby.host_id, v_lobby.card_instance_ids, v_host_definitions,
      p_guest, p_team, v_guest_definitions, null, p_boss_values
    );
  end if;
  if v_lobby.format = 'triple' then
    return public.insert_triple_match(
      'friendly', v_lobby.host_id, v_lobby.card_instance_ids, v_host_definitions,
      p_guest, p_team, v_guest_definitions, null
    );
  end if;
  if public.is_quadrant(v_lobby.format) then
    return public.insert_quadrant_match(
      'friendly', v_lobby.format, v_lobby.host_id, v_lobby.card_instance_ids, v_host_definitions,
      p_guest, p_team, v_guest_definitions, null
    );
  end if;
  return public.insert_pvp_match(
    'friendly', v_lobby.host_id, v_lobby.card_instance_ids, v_host_definitions,
    p_guest, p_team, v_guest_definitions, p_threat_ids
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- The prize of a challenge: targets of wins, each paid once
-- ---------------------------------------------------------------------------

-- Pays one target to a player (the rewards of event_tiers, with the challenge's reasons).
create function public.grant_challenge_tier(p_user uuid, p_tier public.challenge_tiers)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_reward uuid := gen_random_uuid();
  v_definition uuid;
  v_instance uuid;
  v_instance_ids uuid[] := '{}';
  v_new_ids uuid[] := '{}';
  v_opening uuid;
  v_openings uuid[] := '{}';
  v_random record;
begin
  insert into public.challenge_rewards (id, challenge_id, tier, user_id, coins, packs)
  values (v_reward, p_tier.challenge_id, p_tier.tier, p_user, p_tier.coins, p_tier.packs)
  on conflict do nothing;
  if not found then
    return; -- Already paid.
  end if;

  if p_tier.coins > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id)
    values (p_user, p_tier.coins, 'challenge_reward', v_reward);
  end if;

  for i in 1..coalesce(cardinality(p_tier.card_definition_ids), 0) loop
    v_definition := p_tier.card_definition_ids[i];
    insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
    values (v_definition, p_user, 'challenge', p_tier.card_variant_ids[i])
    returning id into v_instance;
    insert into public.card_transfers (instance_id, from_user, to_user, reason)
    values (v_instance, null, p_user, 'challenge');
    if (select count(*) from public.card_instances c where c.owner_id = p_user and c.definition_id = v_definition) = 1 then
      v_new_ids := v_new_ids || v_instance;
    end if;
    v_instance_ids := v_instance_ids || v_instance;
  end loop;

  for v_random in select * from public.grant_random_variants(p_user, p_tier.random_variants, 'challenge') loop
    if v_random.is_new then
      v_new_ids := v_new_ids || v_random.instance_id;
    end if;
    v_instance_ids := v_instance_ids || v_random.instance_id;
  end loop;

  if cardinality(v_instance_ids) > 0 then
    insert into public.pack_openings (user_id, pack_type, card_instance_ids, new_card_instance_ids)
    values (p_user, 'challenge', v_instance_ids, v_new_ids)
    returning id into v_opening;
    v_openings := v_openings || v_opening;
  end if;

  for i in 1..p_tier.packs loop
    v_openings := v_openings || public.open_pack(p_user, 'standard');
  end loop;

  update public.challenge_rewards set opening_ids = v_openings where id = v_reward;
end;
$$;

revoke execute on function public.grant_challenge_tier(uuid, public.challenge_tiers) from public, anon, authenticated;

-- Wins a player has in the challenge: matches finished normally (abandoned ones never count).
create function public.challenge_wins(p_user uuid, p_challenge_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer
  from public.matches m
  where m.challenge_id = p_challenge_id and m.status = 'finished' and m.end_reason = 'completed'
    and ((m.player_a = p_user and m.result = 'a') or (m.player_b = p_user and m.result = 'b'))
$$;

revoke execute on function public.challenge_wins(uuid, uuid) from public, anon, authenticated;

-- At the end of a challenge match, in the same transaction: the targets the winner reached.
create function public.award_challenge_tiers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_winner uuid;
  v_wins integer;
  v_tier public.challenge_tiers;
begin
  if new.challenge_id is null or new.status <> 'finished' or old.status = 'finished'
     or new.end_reason is distinct from 'completed' or new.result not in ('a', 'b') then
    return new;
  end if;
  v_winner := case new.result when 'a' then new.player_a else new.player_b end;
  if v_winner is null then
    return new; -- A bot won.
  end if;
  v_wins := public.challenge_wins(v_winner, new.challenge_id);
  for v_tier in
    select * from public.challenge_tiers t
    where t.challenge_id = new.challenge_id and t.wins <= v_wins
      and not exists (
        select 1 from public.challenge_rewards r
        where r.challenge_id = t.challenge_id and r.tier = t.tier and r.user_id = v_winner
      )
    order by t.tier
  loop
    perform public.grant_challenge_tier(v_winner, v_tier);
  end loop;
  return new;
end;
$$;

revoke execute on function public.award_challenge_tiers() from public, anon, authenticated;

create trigger matches_award_challenge_tiers
  after update of status on public.matches
  for each row execute function public.award_challenge_tiers();

-- The banner of a target reached (SPEC §11.1).
create function public.notify_challenge_reward()
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
    v_challenge.title || ' · ' || v_tier.wins || case when v_tier.wins = 1 then ' vittoria' else ' vittorie' end,
    jsonb_build_object(
      'challenge_id', new.challenge_id,
      'tier', new.tier,
      'coins', new.coins,
      'packs', new.packs,
      'cards', coalesce(cardinality(v_tier.card_definition_ids), 0) + coalesce((v_tier.random_variants ->> 'count')::integer, 0)
    )
  );
  return new;
end;
$$;

revoke execute on function public.notify_challenge_reward() from public, anon, authenticated;

create trigger challenge_rewards_notify
  after insert on public.challenge_rewards
  for each row execute function public.notify_challenge_reward();

-- Marks a challenge's prizes seen: their cards and packs have been revealed.
create function public.mark_challenge_rewards_seen(p_challenge_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.challenge_rewards set seen_at = now()
  where challenge_id = p_challenge_id and user_id = auth.uid() and seen_at is null
$$;

revoke execute on function public.mark_challenge_rewards_seen(uuid) from public, anon;
grant execute on function public.mark_challenge_rewards_seen(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- What players see
-- ---------------------------------------------------------------------------

-- The targets of a challenge, with what the player reached; card_codes for the admin's form.
create function public.challenge_tiers_payload(p_challenge_id uuid, p_user uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'tier', t.tier,
    'wins', t.wins,
    'coins', t.coins,
    'packs', t.packs,
    'cards', (
      select coalesce(jsonb_agg(public.card_payload(u.definition_id) || coalesce((
        select jsonb_build_object('art_url', v.art_url, 'variant', jsonb_build_object('style', v.style, 'name', v.style_name))
        from public.card_variants v where v.id = u.variant_id
      ), '{}'::jsonb) order by u.ord), '[]'::jsonb)
      from unnest(t.card_definition_ids, t.card_variant_ids) with ordinality as u(definition_id, variant_id, ord)
    ),
    'card_codes', (
      select coalesce(jsonb_agg(d.code || coalesce(':' || v.style, '') order by u.ord), '[]'::jsonb)
      from unnest(t.card_definition_ids, t.card_variant_ids) with ordinality as u(id, variant_id, ord)
      join public.card_definitions d on d.id = u.id
      left join public.card_variants v on v.id = u.variant_id
    ),
    'random_variants', t.random_variants,
    'random_variants_info', public.random_variants_payload(t.random_variants),
    'reached', r.id is not null,
    'reached_by', (select count(*) from public.challenge_rewards x where x.challenge_id = t.challenge_id and x.tier = t.tier),
    'opening_ids', coalesce(to_jsonb(r.opening_ids), '[]'::jsonb),
    'seen', r.seen_at is not null
  ) order by t.tier), '[]'::jsonb)
  from public.challenge_tiers t
  left join public.challenge_rewards r on r.challenge_id = t.challenge_id and r.tier = t.tier and r.user_id = p_user
  where t.challenge_id = p_challenge_id
$$;

revoke execute on function public.challenge_tiers_payload(uuid, uuid) from public, anon, authenticated;

-- Same as in 20261118250000_challenges.sql, with the second stage: online, level, seal target,
-- the names of the listed characters and styles, the prize and the player's wins.
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
    -- The rarity, faction and trait rules as players read them: [{"category": "Rarità", "traits": [...]}, ...].
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
    'admitted_characters', (select c.admitted from public.challenge_admitted_counts(p_challenge.rules) c),
    'team_size', public.team_size_for(p_challenge.format),
    'starts_at', p_challenge.starts_at,
    'ends_at', p_challenge.ends_at,
    'daily_limit', p_challenge.daily_limit,
    'plays_today', case when p_user is null then 0 else public.challenge_plays_today(p_user, p_challenge.id) end,
    -- The player's admitted characters, and those owned with a variant that counts: can they field a squad?
    'my_characters', case when p_user is not null then (
      select count(distinct i.definition_id) from public.card_instances i
      where i.owner_id = p_user and public.challenge_admits(i.definition_id, p_challenge.rules)
        and (not coalesce((p_challenge.rules ->> 'no_starters')::boolean, false) or not i.is_starter)
    ) end,
    'my_characters_with_variant', case when p_user is not null then (
      select count(distinct i.definition_id) from public.card_instances i
      where i.owner_id = p_user and public.challenge_variant_counts(i.variant_id, p_challenge.rules)
        and public.challenge_admits(i.definition_id, p_challenge.rules)
    ) end,
    'my_level', case when p_user is not null then (select p.level from public.profiles p where p.id = p_user) end,
    'my_wins', case when p_user is null then 0 else public.challenge_wins(p_user, p_challenge.id) end,
    'tiers', public.challenge_tiers_payload(p_challenge.id, p_user),
    'event', (
      select jsonb_build_object('id', e.id, 'title', e.title, 'starts_at', e.starts_at, 'ends_at', e.ends_at)
      from public.events e where e.id = p_challenge.event_id
    ),
    'event_points', p_challenge.event_points
  )
$$;

-- Same as in 20261118250000_challenges.sql; the first time a player sees a running challenge
-- (one they can play by level) the banner «Nuova Sfida a tema!» arrives (SPEC §11.1).
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
-- Rewards, objectives
-- ---------------------------------------------------------------------------

-- Same as in 20261113100000_match_rewards.sql: a challenge match has its own row.
create or replace function public.match_reward_mode(p_match public.matches)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_match.story_mission_id is not null then 'story'
    when p_match.challenge_id is not null then 'challenge'
    when p_match.mode = 'conquest' then 'conquest'
    else p_match.format
  end
$$;

-- The row starts as the classic one's, so nothing changes until an admin changes it.
insert into public.match_reward_rules (mode_key, opponent, outcome, coins, xp, packs)
select 'challenge', r.opponent, r.outcome, r.coins, r.xp, r.packs
from public.match_reward_rules r
where r.mode_key = 'classic'
on conflict do nothing;

-- Same as in 20261118234000_variant_counts.sql, with the filter "challenge" (a Sfida a tema match).
create or replace function public.daily_objective_params_valid(p_metric text, p_params jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case when jsonb_typeof(p_params) is distinct from 'object' then false else
    not exists (
      select 1 from jsonb_object_keys(p_params) k
      where not (k = any (case
        when p_metric in ('threats_won', 'cards_played') then
          array['format', 'story', 'opponent', 'bot_difficulties', 'flawless', 'faction', 'min_rarity_rank', 'max_rarity_rank']
        when p_metric in ('matches_played', 'matches_won', 'variant_wins') then
          array['format', 'story', 'opponent', 'bot_difficulties', 'flawless', 'challenge']
        else array[]::text[]
      end))
    )
    and (not (p_params ? 'format') or p_params ->> 'format' in ('classic', 'boss', 'triple', 'quadrant', 'quadrant_shifting'))
    and (not (p_params ? 'opponent') or p_params ->> 'opponent' in ('player', 'bot'))
    and (not (p_params ? 'faction') or p_params ->> 'faction' in ('heroes', 'villains', 'neutrals'))
    and (not (p_params ? 'story') or jsonb_typeof(p_params -> 'story') = 'boolean')
    and (not (p_params ? 'challenge') or jsonb_typeof(p_params -> 'challenge') = 'boolean')
    and (not (p_params ? 'flawless') or jsonb_typeof(p_params -> 'flawless') = 'boolean')
    and (not (p_params ? 'bot_difficulties') or jsonb_typeof(p_params -> 'bot_difficulties') = 'array')
    and (not (p_params ? 'min_rarity_rank') or jsonb_typeof(p_params -> 'min_rarity_rank') = 'number')
    and (not (p_params ? 'max_rarity_rank') or jsonb_typeof(p_params -> 'max_rarity_rank') = 'number')
  end
$$;

create or replace function public.daily_objective_match_amount(p_metric text, p_params jsonb, p_match public.matches, p_side text)
returns integer
language plpgsql
stable
set search_path = ''
as $$
declare
  v_other_rounds integer := case p_side when 'a' then p_match.rounds_won_b else p_match.rounds_won_a end;
begin
  if p_params ? 'format' and p_match.format <> p_params ->> 'format' then
    return 0;
  end if;
  if coalesce((p_params ->> 'story')::boolean, false) and p_match.story_mission_id is null then
    return 0;
  end if;
  if coalesce((p_params ->> 'challenge')::boolean, false) and p_match.challenge_id is null then
    return 0;
  end if;
  if p_params ->> 'opponent' = 'player' and p_match.bot_difficulty is not null then
    return 0;
  end if;
  if p_params ->> 'opponent' = 'bot' and p_match.bot_difficulty is null then
    return 0;
  end if;
  if p_params ? 'bot_difficulties'
     and not coalesce(p_params -> 'bot_difficulties' ? p_match.bot_difficulty, false) then
    return 0;
  end if;
  if coalesce((p_params ->> 'flawless')::boolean, false) and v_other_rounds > 0 then
    return 0;
  end if;

  case p_metric
    when 'matches_played' then
      return 1;
    when 'matches_won' then
      return (p_match.result = p_side)::integer;
    when 'variant_wins' then
      -- A win with at least one variant among the copies that side fielded.
      return (p_match.result = p_side and exists (
        select 1 from public.match_teams t
        join public.card_instances i on i.id = any (t.card_instance_ids)
        where t.match_id = p_match.id and t.side = p_side and i.variant_id is not null
      ))::integer;
    when 'threats_won' then
      if p_match.format not in ('classic', 'triple') then
        return 0;
      end if;
      return (
        select count(*)::integer
        from public.round_plays rp
        join public.match_rounds mr on mr.match_id = rp.match_id and mr.round = rp.round
        join public.card_definitions d on d.id = rp.definition_id
        join public.rarity_definitions r on r.code = d.rarity_code
        where rp.match_id = p_match.id and rp.side = p_side and mr.winner_side = p_side
          and public.daily_objective_card_fits(p_params, d.faction, r.rank)
      );
    when 'cards_played' then
      return (
        select count(distinct rp.definition_id)::integer
        from public.round_plays rp
        join public.card_definitions d on d.id = rp.definition_id
        join public.rarity_definitions r on r.code = d.rarity_code
        where rp.match_id = p_match.id and rp.side = p_side
          and public.daily_objective_card_fits(p_params, d.faction, r.rank)
      );
    else
      return 0;
  end case;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin (/gestione-sfide)
-- ---------------------------------------------------------------------------

-- Same as in 20261118250000_challenges.sql, with the cards and the variant styles the form
-- picks from (prize cards, banned and only-these lists, styles).
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
          'matches', (select count(*) from public.matches m where m.challenge_id = c.id),
          'players', (
            select count(distinct u.id) from public.matches m
            cross join lateral (values (m.player_a), (m.player_b)) as u(id)
            where m.challenge_id = c.id and u.id is not null
          )
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

-- Same as in 20261118250000_challenges.sql: no starters, and variants of the listed styles.
create or replace function public.admin_preview_challenge(p_format text, p_rules jsonb)
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
  v_size := public.team_size_for(p_format);
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
    'players_total', (select count(*) from public.profiles)
  );
end;
$$;

drop function public.admin_save_challenge(text, text, text, text, text[], boolean, jsonb, timestamp, timestamp, integer, uuid, jsonb, uuid);

-- Same as in 20261118250000_challenges.sql, with every mode, online play, a minimum level, the
-- Quadrante's seal target and the prize: p_tiers = [{"wins", "coins", "packs", "cards":
-- ["P051", "P051:neon"], "random_variants"}], each further than the one before.
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
  p_tiers jsonb default '[]'
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
  v_challenge public.challenges;
  v_started boolean := false;
  v_event public.events;
  v_rules jsonb;
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
  if not v_bots <@ array['easy', 'medium', 'hard', 'super_pro'] or (cardinality(v_bots) = 0 and not v_online) then
    raise exception 'challenge_invalid_bots';
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

  -- Enough characters for a squad of the mode, and enough of them with a variant that counts.
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
                                   online, min_level, quadrant_seal_target)
    values (v_title, v_description, v_color, p_format, v_bots, coalesce(p_bot_follows_rules, true), v_rules,
            v_starts, v_ends, p_daily_limit, p_event_id, v_points, auth.uid(),
            v_online, p_min_level, p_quadrant_seal_target)
    returning id into v_id;
  else
    update public.challenges
    set title = v_title, description = v_description, color = v_color, format = p_format,
        bot_difficulties = v_bots, bot_follows_rules = coalesce(p_bot_follows_rules, true), rules = v_rules,
        starts_at = v_starts, ends_at = v_ends, daily_limit = p_daily_limit, event_id = p_event_id,
        event_points = v_points, online = v_online, min_level = p_min_level,
        quadrant_seal_target = p_quadrant_seal_target, version = version + 1
    where id = v_id;
    delete from public.challenge_tiers where challenge_id = v_id;
  end if;

  -- The prize: each target asks more wins than the one before, and gives something.
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

revoke execute on function public.admin_save_challenge(text, text, text, text, text[], boolean, jsonb, timestamp, timestamp, integer, uuid, jsonb, uuid, boolean, integer, integer, jsonb) from public, anon;
grant execute on function public.admin_save_challenge(text, text, text, text, text[], boolean, jsonb, timestamp, timestamp, integer, uuid, jsonb, uuid, boolean, integer, integer, jsonb) to authenticated;
