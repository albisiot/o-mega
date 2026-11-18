-- Stars of the story missions (SPEC §5.11) and the Story page of the Editor.
--
-- Every mission has three stars, independent of each other and of the mission's prize:
--   flawless  win 3-0: the bot wins no round;
--   rarities  win with a squad whose 5 characters all have one of story_missions.star_rarities;
--   traits    win with a squad whose 5 characters all match story_missions.star_traits, with
--             the rule of card_matches_traits: inside a category one listed trait is enough,
--             every listed category must match.
-- Any won mission match earns the stars whose conditions hold, the first win or a replay;
-- one win can earn several, and once earned a star stays. Abandoned matches never count.
-- Each star pays story_missions.star_coins once, the first time it is earned, in the
-- transaction that ends the match (coin_ledger 'story_star', one row per match). The
-- mission's own prize (first win only) and the match rewards (§8.4, row story) do not change.
--
-- The squad is the one actually fielded (match_teams), never anything the client sends. The
-- rules are copied onto the match when it is created (story_match_terms), with the mission's
-- coins, as an event keeps its rules once started: an admin edit applies to the matches
-- created after it. A match created before this migration uses the mission's rules.
--
-- Admins edit some of the story from the Editor (/gestione-storia): the texts, the coin prize,
-- the star rules and the star coins of every mission; title and texts of chapters and
-- seasons. Opponents, threats, modifiers, bot difficulty and card prize are tuned by
-- simulation and stay read only. Every function checks is_admin() on the server.
--
-- The default rules of the 60 missions are themed on each mission's story and opponent
-- (docs/STORY.md) and checked with scripts/simulate-story.mts: SPEC §5.11 has the numbers.
--
-- get_story and get_story_reward only gain fields: the client already online keeps working
-- until the new one is published.

-- ---------------------------------------------------------------------------
-- Configuration and coins
-- ---------------------------------------------------------------------------

insert into public.game_config (key, value, description) values
  ('story.star_coins_base', '10', 'Coins a star of a new story mission pays in the first chapters'),
  ('story.star_coins_step', '10', 'Coins a star of a new story mission pays more every story.star_coins_step_chapters chapters'),
  ('story.star_coins_step_chapters', '4', 'Chapters of the whole story between two steps of the star coins');

alter table public.coin_ledger drop constraint coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in (
  'pack_purchase', 'match_reward', 'bot_match_reward', 'duplicate_conversion', 'conquest_bonus', 'level_reward',
  'emergency_reward', 'bonus_code', 'story_reward', 'story_star', 'event_reward', 'objective_reward', 'achievement_reward',
  'emergency_prize', 'ranked_prize', 'admin_adjustment'
));

-- Coins a star of a mission pays when nobody chose: more later in the story (balance.ts story).
create function public.story_default_star_coins(p_chapter integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select public.config_int('story.star_coins_base')
       + public.config_int('story.star_coins_step')
         * ((greatest(coalesce(p_chapter, 1), 1) - 1) / public.config_int('story.star_coins_step_chapters'))
$$;

revoke execute on function public.story_default_star_coins(integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The rules of every mission
-- ---------------------------------------------------------------------------

alter table public.story_missions
  add column star_rarities text[] not null default '{}',
  add column star_traits text[] not null default '{}',
  add column star_coins integer check (star_coins between 0 and 1000);

comment on column public.story_missions.star_rarities is
  'Star «Rarità»: win with a squad whose characters all have one of these rarity codes.';
comment on column public.story_missions.star_traits is
  'Star «Tratti»: win with a squad whose characters all match these traits (card_matches_traits).';
comment on column public.story_missions.star_coins is
  'Coins each star of the mission pays the first time it is earned.';

update public.story_missions m
set star_rarities = v.rarities, star_traits = v.traits, star_coins = public.story_default_star_coins(m.chapter)
from (values
  -- Stagione 1, Capitolo 1, Il porto: against the Compagnia Lete.
  ('C1M1', array['delta'], array['origin.mestiere']),
  ('C1M2', array['delta', 'gamma', 'beta'], array['group.lanterne']),
  ('C1M3', array['delta', 'gamma', 'beta'], array['origin.tecnologia']),
  ('C1M4', array['delta', 'gamma', 'beta'], array['group.custodi']),
  ('C1M5', array['delta', 'gamma'], array['group.sciolti']),
  -- Capitolo 2, Il sismografo: the Figli dell'Ultima under the city.
  ('C2M1', array['delta'], array['group.custodi']),
  ('C2M2', array['delta', 'gamma', 'beta'], array['nature.creatura']),
  ('C2M3', array['delta', 'gamma', 'beta'], array['origin.segno']),
  ('C2M4', array['delta', 'gamma', 'beta'], array['group.lanterne']),
  ('C2M5', array['delta', 'gamma'], array['origin.mito', 'origin.strappo']),
  -- Capitolo 3, Undici piani: the Banco's tower.
  ('C3M1', array['delta'], array['origin.mestiere']),
  ('C3M2', array['delta', 'gamma', 'beta'], array['group.custodi']),
  ('C3M3', array['delta', 'gamma', 'beta'], array['group.lanterne']),
  ('C3M4', array['delta', 'gamma'], array['group.banco']),
  ('C3M5', array['delta', 'gamma'], array['origin.tecnologia']),
  -- Capitolo 4, Multitude: thoughts passing from one head to another.
  ('C4M1', array['delta', 'gamma', 'beta'], array['origin.segno']),
  ('C4M2', array['delta', 'gamma', 'beta'], array['group.lanterne']),
  ('C4M3', array['delta', 'gamma'], array['group.custodi']),
  ('C4M4', array['delta', 'gamma'], array['origin.strappo']),
  ('C4M5', array['delta', 'gamma'], array['nature.macchina']),
  -- Capitolo 5, La porta: the power plant, then the Custodi at the temple's door.
  ('C5M1', array['delta', 'gamma', 'beta'], array['origin.tecnologia']),
  ('C5M2', array['delta', 'gamma'], array['group.banco']),
  ('C5M3', array['delta', 'gamma'], array['group.lanterne']),
  ('C5M4', array['delta', 'gamma'], array['origin.magia', 'origin.mito']),
  ('C5M5', array['delta', 'gamma'], array['origin.segno']),
  -- Capitolo 6, Mongibello: the Figli wake the volcano.
  ('C6M1', array['delta', 'gamma'], array['group.custodi']),
  ('C6M2', array['delta', 'gamma'], array['group.lanterne']),
  ('C6M3', array['delta', 'gamma'], array['group.lete']),
  ('C6M4', array['delta', 'gamma'], array['origin.mito']),
  ('C6M5', array['delta'], array['nature.macchina', 'nature.entita']),
  -- Stagione 2, Capitolo 1, L'asta: the closed port and the Banco's auction.
  ('C7M1', array['delta', 'gamma'], array['group.lanterne']),
  ('C7M2', array['delta', 'gamma'], array['group.custodi']),
  ('C7M3', array['delta', 'gamma'], array['group.banco']),
  ('C7M4', array['delta', 'gamma'], array['group.sciolti']),
  ('C7M5', array['delta'], array['origin.mestiere']),
  -- Capitolo 2, Tra due onde: four stones from the Comune to the temple.
  ('C8M1', array['delta', 'gamma'], array['group.lanterne']),
  ('C8M2', array['delta', 'gamma'], array['origin.mito']),
  ('C8M3', array['delta', 'gamma'], array['origin.tecnologia']),
  ('C8M4', array['delta'], array['group.custodi']),
  ('C8M5', array['delta', 'gamma'], array['nature.creatura']),
  -- Capitolo 3, Il pegno: the Monte dei Pegni and the Banco's vault.
  ('C9M1', array['delta', 'gamma'], array['origin.mestiere']),
  ('C9M2', array['delta', 'gamma'], array['origin.strappo']),
  ('C9M3', array['delta', 'gamma'], array['origin.mito']),
  ('C9M4', array['delta'], array['group.sciolti']),
  ('C9M5', array['delta', 'gamma'], array['group.lanterne']),
  -- Capitolo 4, Absentia: the Fosse at night and the empty armour.
  ('C10M1', array['delta', 'gamma'], array['group.custodi']),
  ('C10M2', array['delta', 'gamma'], array['origin.segno']),
  ('C10M3', array['delta', 'gamma'], array['nature.macchina']),
  ('C10M4', array['delta', 'gamma'], array['group.lanterne']),
  ('C10M5', array['delta', 'gamma'], array['origin.strappo']),
  -- Capitolo 5, Le Fosse: the wave and the wind the Compagnia sells.
  ('C11M1', array['delta', 'gamma'], array['origin.mestiere']),
  ('C11M2', array['delta', 'gamma'], array['group.lanterne']),
  ('C11M3', array['delta'], array['group.custodi']),
  ('C11M4', array['delta'], array['origin.tecnologia']),
  ('C11M5', array['delta', 'gamma'], array['origin.segno']),
  -- Capitolo 6, Cariddi: the eye of the whirlpool.
  ('C12M1', array['delta', 'gamma'], array['group.sciolti']),
  ('C12M2', array['delta', 'gamma'], array['group.custodi']),
  ('C12M3', array['delta'], array['origin.mito', 'origin.strappo']),
  ('C12M4', array['delta'], array['group.lanterne']),
  ('C12M5', array['delta'], array['group.figli'])
) as v(code, rarities, traits)
where m.code = v.code;

do $$
begin
  if exists (select 1 from public.story_missions where cardinality(star_rarities) = 0 or cardinality(star_traits) = 0) then
    raise exception 'a story mission has no star rules';
  end if;
end $$;

alter table public.story_missions
  alter column star_rarities drop default,
  alter column star_traits drop default,
  alter column star_coins set not null,
  add constraint story_missions_star_rules check (cardinality(star_rarities) >= 1 and cardinality(star_traits) >= 1);

-- Known rarities and traits, enough characters for a squad, and the star coins of the
-- chapter when none are given: also for missions added later with SQL.
create function public.validate_story_mission()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.star_coins := coalesce(new.star_coins, public.story_default_star_coins(new.chapter));
  if tg_op = 'UPDATE' and new.star_rarities is not distinct from old.star_rarities
     and new.star_traits is not distinct from old.star_traits then
    return new;
  end if;
  if exists (select 1 from unnest(new.star_rarities) as c where not exists (select 1 from public.rarity_definitions r where r.code = c))
     or exists (select 1 from unnest(new.star_traits) as c where not exists (select 1 from public.traits t where t.code = c)) then
    raise exception 'story_star_unknown_rule';
  end if;
  if public.event_admitted_count('{}', new.star_rarities, '{}') < public.config_int('match.team_size')
     or public.trait_admitted_count(new.star_traits) < public.config_int('match.team_size') then
    raise exception 'story_star_too_few';
  end if;
  return new;
end;
$$;

revoke execute on function public.validate_story_mission() from public, anon, authenticated;

create trigger validate_story_mission
  before insert or update on public.story_missions
  for each row execute function public.validate_story_mission();

-- ---------------------------------------------------------------------------
-- The rules of a match, and the stars earned
-- ---------------------------------------------------------------------------

create table public.story_match_terms (
  match_id uuid primary key references public.matches (id) on delete cascade,
  star_rarities text[] not null,
  star_traits text[] not null,
  star_coins integer not null,
  reward_coins integer not null
);

comment on table public.story_match_terms is
  'The rules and coins of a story mission as they were when its match was created: an admin edit applies to later matches.';

create table public.story_stars (
  user_id uuid not null references public.profiles (id) on delete cascade,
  mission_id uuid not null references public.story_missions (id),
  star text not null check (star in ('flawless', 'rarities', 'traits')),
  -- The match that earned it first.
  match_id uuid not null references public.matches (id) on delete cascade,
  coins integer not null check (coins >= 0),
  earned_at timestamptz not null default now(),
  primary key (user_id, mission_id, star)
);

comment on table public.story_stars is 'Stars of the story missions earned by each player: once earned, a star stays.';

create index story_stars_match_id_idx on public.story_stars (match_id);
create index story_stars_mission_id_idx on public.story_stars (mission_id);

-- No policies: get_story, get_story_reward and the admin functions show what may be seen.
alter table public.story_match_terms enable row level security;
alter table public.story_stars enable row level security;
revoke all on table public.story_match_terms, public.story_stars from anon, authenticated;

-- True when every character of the squad has one of the rarities; never without a rarity or a squad.
create function public.story_team_has_rarities(p_definition_ids uuid[], p_rarities text[])
returns boolean
language sql
stable
set search_path = ''
as $$
  select cardinality(coalesce(p_rarities, '{}')) > 0
     and cardinality(coalesce(p_definition_ids, '{}')) > 0
     and not exists (
       select 1
       from unnest(p_definition_ids) as u(id)
       left join public.card_definitions d on d.id = u.id
       where d.id is null or not (d.rarity_code = any (p_rarities))
     )
$$;

revoke execute on function public.story_team_has_rarities(uuid[], text[]) from public, anon, authenticated;

-- True when every character of the squad matches the traits; never without a trait or a squad.
create function public.story_team_has_traits(p_definition_ids uuid[], p_traits text[])
returns boolean
language sql
stable
set search_path = ''
as $$
  select cardinality(coalesce(p_traits, '{}')) > 0
     and cardinality(coalesce(p_definition_ids, '{}')) > 0
     and not exists (
       select 1 from unnest(p_definition_ids) as u(id) where not public.card_matches_traits(u.id, p_traits)
     )
$$;

revoke execute on function public.story_team_has_traits(uuid[], text[]) from public, anon, authenticated;

-- The stars a finished story match meets: none unless the player won it, and never by abandon.
create function public.story_match_stars(p_match public.matches)
returns text[]
language plpgsql
stable
set search_path = ''
as $$
declare
  v_team uuid[];
  v_rarities text[];
  v_traits text[];
  v_stars text[] := '{}';
begin
  if p_match.story_mission_id is null or p_match.status <> 'finished' or p_match.result is distinct from 'a'
     or p_match.end_reason is not distinct from 'forfeit' then
    return v_stars;
  end if;
  select t.definition_ids into v_team from public.match_teams t where t.match_id = p_match.id and t.side = 'a';
  select coalesce(x.star_rarities, m.star_rarities), coalesce(x.star_traits, m.star_traits)
  into v_rarities, v_traits
  from public.story_missions m
  left join public.story_match_terms x on x.match_id = p_match.id
  where m.id = p_match.story_mission_id;

  if p_match.rounds_won_b = 0 then
    v_stars := array_append(v_stars, 'flawless');
  end if;
  if public.story_team_has_rarities(v_team, v_rarities) then
    v_stars := array_append(v_stars, 'rarities');
  end if;
  if public.story_team_has_traits(v_team, v_traits) then
    v_stars := array_append(v_stars, 'traits');
  end if;
  return v_stars;
end;
$$;

revoke execute on function public.story_match_stars(public.matches) from public, anon, authenticated;

-- Service only (Edge Function): creates the match of a mission, as before, and copies its rules.
create or replace function public.story_create_match(p_user uuid, p_mission_code text, p_card_instance_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mission public.story_missions;
  v_match uuid;
begin
  select * into v_mission from public.story_missions where code = p_mission_code;
  if not found then
    raise exception 'story_mission_not_found';
  end if;
  if not public.story_mission_unlocked(p_user, v_mission) then
    raise exception 'story_mission_locked';
  end if;

  v_match := public.match_create_bot(
    p_user, v_mission.bot_difficulty, p_card_instance_ids, v_mission.bot_definition_ids, v_mission.threat_ids
  );
  -- The mission's own modifiers replace the ones drawn for a normal match.
  update public.matches
  set story_mission_id = v_mission.id, threat_modifiers = v_mission.threat_modifiers
  where id = v_match;
  -- What the match plays for stays as it is now, whatever an admin changes later.
  insert into public.story_match_terms (match_id, star_rarities, star_traits, star_coins, reward_coins)
  values (v_match, v_mission.star_rarities, v_mission.star_traits, v_mission.star_coins, v_mission.reward_coins);
  return v_match;
end;
$$;

revoke execute on function public.story_create_match(uuid, text, uuid[]) from public, anon, authenticated;
grant execute on function public.story_create_match(uuid, text, uuid[]) to service_role;

-- A won mission match: its stars, each paid once, then the mission's prize on the first win,
-- in the transaction that ends the match.
create or replace function public.grant_story_reward()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mission public.story_missions;
  v_terms public.story_match_terms;
  v_instance uuid;
  v_star text;
  v_new_stars integer := 0;
  v_star_coins integer;
  v_reward_coins integer;
begin
  if new.story_mission_id is null or new.status <> 'finished' or old.status = 'finished' or new.result <> 'a' then
    return new;
  end if;

  select * into v_mission from public.story_missions where id = new.story_mission_id;
  select * into v_terms from public.story_match_terms where match_id = new.id;
  v_star_coins := coalesce(v_terms.star_coins, v_mission.star_coins);
  v_reward_coins := coalesce(v_terms.reward_coins, v_mission.reward_coins);

  -- Stars: every condition the match meets; a star already earned stays as it was.
  foreach v_star in array public.story_match_stars(new) loop
    insert into public.story_stars (user_id, mission_id, star, match_id, coins)
    values (new.player_a, new.story_mission_id, v_star, new.id, v_star_coins)
    on conflict do nothing;
    if found then
      v_new_stars := v_new_stars + 1;
    end if;
  end loop;
  if v_new_stars > 0 and v_star_coins > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id)
    values (new.player_a, v_new_stars * v_star_coins, 'story_star', new.id);
  end if;

  insert into public.story_progress (user_id, mission_id, match_id)
  values (new.player_a, new.story_mission_id, new.id)
  on conflict do nothing;
  if not found then
    return new; -- Already completed: replays pay no prize.
  end if;

  if v_reward_coins > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id)
    values (new.player_a, v_reward_coins, 'story_reward', new.id);
  end if;
  if v_mission.reward_definition_id is not null then
    insert into public.card_instances (definition_id, owner_id, acquired_via)
    values (v_mission.reward_definition_id, new.player_a, 'story')
    returning id into v_instance;
    insert into public.card_transfers (instance_id, from_user, to_user, reason)
    values (v_instance, null, new.player_a, 'story');
    update public.story_progress set card_instance_id = v_instance
    where user_id = new.player_a and mission_id = new.story_mission_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.grant_story_reward() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- What players read
-- ---------------------------------------------------------------------------

-- How players read a mission's star rules: names of the rarities, traits by category.
create function public.story_star_rules_payload(p_rarities text[], p_traits text[])
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'star_rarities', to_jsonb(coalesce(p_rarities, '{}')),
    'star_rarity_names', (
      select coalesce(jsonb_agg(r.name order by r.rank), '[]'::jsonb)
      from public.rarity_definitions r where r.code = any (coalesce(p_rarities, '{}'))
    ),
    'star_traits', to_jsonb(coalesce(p_traits, '{}')),
    'star_traits_text', public.traits_description(p_traits)
  )
$$;

revoke execute on function public.story_star_rules_payload(text[], text[]) from public, anon, authenticated;

-- As before, plus every mission's star rules, its star coins and the stars the player has.
create or replace function public.get_story()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'chapter', c.chapter,
      'season', c.season,
      'season_title', s.title,
      'number', c.number,
      'title', c.title,
      'intro', c.intro,
      'outro', case when not exists (
                 select 1 from public.story_missions m
                 where m.chapter = c.chapter
                   and not exists (select 1 from public.story_progress p where p.user_id = v_uid and p.mission_id = m.id)
               ) then c.outro end,
      'season_ending', case when not exists (
                         select 1 from public.story_chapters n where n.season = c.season and n.number > c.number
                       ) and not exists (
                         select 1 from public.story_missions m
                         join public.story_chapters sc on sc.chapter = m.chapter
                         where sc.season = c.season
                           and not exists (select 1 from public.story_progress p where p.user_id = v_uid and p.mission_id = m.id)
                       ) then s.ending end,
      'missions', (
        select jsonb_agg(jsonb_build_object(
          'code', m.code,
          'ord', m.ord,
          'title', m.title,
          'intro', m.intro,
          'opponent', m.opponent,
          'bot_difficulty', m.bot_difficulty,
          'threat_levels', (
            select jsonb_agg(t.level order by u.ord)
            from unnest(m.threat_ids) with ordinality as u(id, ord)
            join public.threat_definitions t on t.id = u.id
          ),
          'reward_coins', m.reward_coins,
          'reward_card', case when m.reward_definition_id is null then null
                              else public.card_payload(m.reward_definition_id, null) end,
          'completed', exists (select 1 from public.story_progress p where p.user_id = v_uid and p.mission_id = m.id),
          'unlocked', public.story_mission_unlocked(v_uid, m),
          'star_coins', m.star_coins,
          'stars', (
            select coalesce(jsonb_agg(st.star order by st.star), '[]'::jsonb)
            from public.story_stars st where st.user_id = v_uid and st.mission_id = m.id
          )
        ) || public.story_star_rules_payload(m.star_rarities, m.star_traits) order by m.ord)
        from public.story_missions m where m.chapter = c.chapter
      )
    ) order by c.chapter)
    from public.story_chapters c
    join public.story_seasons s on s.season = c.season
  ), '[]'::jsonb);
end;
$$;

revoke execute on function public.get_story() from public, anon;
grant execute on function public.get_story() to authenticated;

-- As before (the prize from the match's own terms), plus the stars: earned by this match,
-- earned before, met by this match, their coins and the rules the match played for.
create or replace function public.get_story_reward(p_match_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches;
  v_mission public.story_missions;
  v_chapter public.story_chapters;
  v_progress public.story_progress;
  v_terms public.story_match_terms;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_match from public.matches where id = p_match_id and player_a = v_uid;
  if not found or v_match.story_mission_id is null then
    return null;
  end if;
  select * into v_mission from public.story_missions where id = v_match.story_mission_id;
  select * into v_chapter from public.story_chapters where chapter = v_mission.chapter;
  select * into v_progress from public.story_progress where user_id = v_uid and mission_id = v_mission.id;
  select * into v_terms from public.story_match_terms where match_id = p_match_id;

  return jsonb_build_object(
    'mission', v_mission.code,
    'title', v_mission.title,
    'is_last', not exists (
      select 1 from public.story_missions n where (n.chapter, n.ord) > (v_mission.chapter, v_mission.ord)
    ),
    'season_ending', case when v_progress.match_id = p_match_id and not exists (
                       select 1 from public.story_missions n
                       join public.story_chapters nc on nc.chapter = n.chapter
                       where nc.season = v_chapter.season and (n.chapter, n.ord) > (v_mission.chapter, v_mission.ord)
                     ) then (select s.ending from public.story_seasons s where s.season = v_chapter.season) end,
    'completed_now', v_progress.match_id is not distinct from p_match_id,
    'completed_before', v_progress.match_id is not null and v_progress.match_id <> p_match_id,
    'coins', case when v_progress.match_id = p_match_id
                  then coalesce(v_terms.reward_coins, v_mission.reward_coins) else 0 end,
    'card', case when v_progress.match_id = p_match_id and v_progress.card_instance_id is not null
                 then public.card_payload(v_mission.reward_definition_id, v_progress.card_instance_id)
                      || jsonb_build_object('instance_id', v_progress.card_instance_id) end,
    'stars_now', (
      select coalesce(jsonb_agg(st.star order by st.star), '[]'::jsonb)
      from public.story_stars st where st.user_id = v_uid and st.mission_id = v_mission.id and st.match_id = p_match_id
    ),
    'star_coins', (
      select coalesce(sum(st.coins), 0)
      from public.story_stars st where st.user_id = v_uid and st.mission_id = v_mission.id and st.match_id = p_match_id
    ),
    'stars_had', (
      select coalesce(jsonb_agg(st.star order by st.star), '[]'::jsonb)
      from public.story_stars st where st.user_id = v_uid and st.mission_id = v_mission.id and st.match_id <> p_match_id
    ),
    'stars_met', to_jsonb(public.story_match_stars(v_match))
  ) || public.story_star_rules_payload(
    coalesce(v_terms.star_rarities, v_mission.star_rarities),
    coalesce(v_terms.star_traits, v_mission.star_traits)
  );
end;
$$;

revoke execute on function public.get_story_reward(uuid) from public, anon;
grant execute on function public.get_story_reward(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: the Story page of the Editor (/gestione-storia)
-- ---------------------------------------------------------------------------

-- Everything the page shows: seasons, chapters and missions with what can be edited, the
-- calibrated parts read only, how many players completed each mission and earned each
-- star, and the catalog to count the characters a star rule admits.
create function public.admin_story_payload()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'rarities', (
      select coalesce(jsonb_agg(jsonb_build_object('code', r.code, 'name', r.name, 'rank', r.rank, 'color', r.color) order by r.rank), '[]'::jsonb)
      from public.rarity_definitions r
    ),
    'trait_catalog', public.trait_catalog_payload(),
    -- [rarity, [traits]] of every character players can field: active, not a level card.
    'characters', (
      select coalesce(jsonb_agg(jsonb_build_array(d.rarity_code, public.card_trait_codes(d.id))), '[]'::jsonb)
      from public.card_definitions d where d.is_active and d.unlock_level is null
    ),
    'min_star_characters', public.config_int('match.team_size'),
    'players', (select count(distinct p.user_id) from public.story_progress p),
    'seasons', (
      select coalesce(jsonb_agg(jsonb_build_object('season', s.season, 'title', s.title, 'ending', s.ending) order by s.season), '[]'::jsonb)
      from public.story_seasons s
    ),
    'chapters', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'chapter', c.chapter, 'season', c.season, 'number', c.number, 'title', c.title, 'intro', c.intro, 'outro', c.outro
      ) order by c.chapter), '[]'::jsonb)
      from public.story_chapters c
    ),
    'missions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', m.code,
        'chapter', m.chapter,
        'ord', m.ord,
        'title', m.title,
        'opponent', m.opponent,
        'intro', m.intro,
        'reward_coins', m.reward_coins,
        'star_rarities', to_jsonb(m.star_rarities),
        'star_traits', to_jsonb(m.star_traits),
        'star_coins', m.star_coins,
        'default_star_coins', public.story_default_star_coins(m.chapter),
        -- Tuned by simulation: shown, never changed here.
        'bot_difficulty', m.bot_difficulty,
        'opponents', (
          select coalesce(jsonb_agg(jsonb_build_object('code', d.code, 'name', d.name, 'rarity', d.rarity_code) order by u.o), '[]'::jsonb)
          from unnest(m.bot_definition_ids) with ordinality as u(id, o)
          join public.card_definitions d on d.id = u.id
        ),
        'threats', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'code', t.code, 'name', t.name, 'level', t.level,
            'modifier', coalesce(public.place_modifier(t.modifier_code, t.modifier_params), m.threat_modifiers -> (u.o::integer - 1))
          ) order by u.o), '[]'::jsonb)
          from unnest(m.threat_ids) with ordinality as u(id, o)
          join public.threat_definitions t on t.id = u.id
        ),
        'reward_card', (
          select jsonb_build_object('code', d.code, 'name', d.name, 'rarity', d.rarity_code)
          from public.card_definitions d where d.id = m.reward_definition_id
        ),
        'completed', (select count(*) from public.story_progress p where p.mission_id = m.id),
        'stars_earned', jsonb_build_object(
          'flawless', (select count(*) from public.story_stars st where st.mission_id = m.id and st.star = 'flawless'),
          'rarities', (select count(*) from public.story_stars st where st.mission_id = m.id and st.star = 'rarities'),
          'traits', (select count(*) from public.story_stars st where st.mission_id = m.id and st.star = 'traits')
        )
      ) order by m.chapter, m.ord), '[]'::jsonb)
      from public.story_missions m
    )
  )
$$;

revoke execute on function public.admin_story_payload() from public, anon, authenticated;

create function public.admin_get_story()
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
  return public.admin_story_payload();
end;
$$;

revoke execute on function public.admin_get_story() from public, anon;
grant execute on function public.admin_get_story() to authenticated;

-- A mission's texts, coin prize, star rules and star coins. Applies to the matches created
-- after the save; the calibrated parts are not among the parameters.
create function public.admin_save_story_mission(
  p_code text,
  p_title text,
  p_opponent text,
  p_intro text,
  p_reward_coins integer,
  p_star_rarities text[],
  p_star_traits text[],
  p_star_coins integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_opponent text := trim(coalesce(p_opponent, ''));
  v_intro text := trim(coalesce(p_intro, ''));
  v_rarities text[];
  v_traits text[] := array(select distinct t from unnest(coalesce(p_star_traits, '{}')) as t where t <> '' order by t);
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if char_length(v_title) not between 2 and 40 or char_length(v_opponent) not between 2 and 60
     or char_length(v_intro) not between 10 and 600 then
    raise exception 'story_invalid_text';
  end if;
  if p_reward_coins is null or p_reward_coins not between 0 and 10000
     or p_star_coins is null or p_star_coins not between 0 and 1000 then
    raise exception 'story_invalid_coins';
  end if;
  if exists (select 1 from unnest(coalesce(p_star_rarities, '{}')) as c where not exists (select 1 from public.rarity_definitions r where r.code = c))
     or exists (select 1 from unnest(v_traits) as c where not exists (select 1 from public.traits t where t.code = c)) then
    raise exception 'story_star_unknown_rule';
  end if;
  -- Rarities in their order, rarest last.
  v_rarities := array(select r.code from public.rarity_definitions r where r.code = any (coalesce(p_star_rarities, '{}')) order by r.rank);
  if cardinality(v_rarities) = 0 or cardinality(v_traits) = 0 then
    raise exception 'story_star_rule_empty';
  end if;
  if public.event_admitted_count('{}', v_rarities, '{}') < public.config_int('match.team_size')
     or public.trait_admitted_count(v_traits) < public.config_int('match.team_size') then
    raise exception 'story_star_too_few';
  end if;

  update public.story_missions
  set title = v_title, opponent = v_opponent, intro = v_intro, reward_coins = p_reward_coins,
      star_rarities = v_rarities, star_traits = v_traits, star_coins = p_star_coins
  where code = p_code;
  if not found then
    raise exception 'story_mission_not_found';
  end if;
  return public.admin_story_payload();
end;
$$;

revoke execute on function public.admin_save_story_mission(text, text, text, text, integer, text[], text[], integer) from public, anon;
grant execute on function public.admin_save_story_mission(text, text, text, text, integer, text[], text[], integer) to authenticated;

-- A chapter's title, introduction and ending.
create function public.admin_save_story_chapter(p_chapter integer, p_title text, p_intro text, p_outro text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_intro text := trim(coalesce(p_intro, ''));
  v_outro text := trim(coalesce(p_outro, ''));
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if char_length(v_title) not between 2 and 40 or char_length(v_intro) not between 10 and 1000
     or char_length(v_outro) not between 10 and 2000 then
    raise exception 'story_invalid_text';
  end if;
  update public.story_chapters set title = v_title, intro = v_intro, outro = v_outro where chapter = p_chapter;
  if not found then
    raise exception 'story_chapter_not_found';
  end if;
  return public.admin_story_payload();
end;
$$;

revoke execute on function public.admin_save_story_chapter(integer, text, text, text) from public, anon;
grant execute on function public.admin_save_story_chapter(integer, text, text, text) to authenticated;

-- A season's title and the message players read once they complete it.
create function public.admin_save_story_season(p_season integer, p_title text, p_ending text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_ending text := trim(coalesce(p_ending, ''));
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if char_length(v_title) not between 2 and 40 or char_length(v_ending) not between 10 and 500 then
    raise exception 'story_invalid_text';
  end if;
  update public.story_seasons set title = v_title, ending = v_ending where season = p_season;
  if not found then
    raise exception 'story_season_not_found';
  end if;
  return public.admin_story_payload();
end;
$$;

revoke execute on function public.admin_save_story_season(integer, text, text) from public, anon;
grant execute on function public.admin_save_story_season(integer, text, text) to authenticated;
