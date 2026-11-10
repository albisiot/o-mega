-- Daily objectives (SPEC §8.3): each game day (midnight Europe/Rome) every player
-- gets a few objectives drawn by the server, one per difficulty by default.
-- Progress is written only by the database, in the transaction that records what
-- the player did (a match ending, an Emergenza threat passed, a pack opened, a
-- duplicate converted, a card conquered): no client ever sends it. A completed
-- objective pays its reward once, when the player claims it during that day.
-- A player can swap objectives not yet completed, a few times a day in total,
-- and is never offered the same objective twice in a day.

insert into public.game_config (key, value, description) values
  ('daily_objectives.per_day.easy', '1', 'Easy daily objectives each player gets per game day'),
  ('daily_objectives.per_day.medium', '1', 'Medium daily objectives each player gets per game day'),
  ('daily_objectives.per_day.hard', '1', 'Hard daily objectives each player gets per game day'),
  ('daily_objectives.refreshes_per_day', '3', 'Daily objectives a player can swap per game day, in total'),
  ('daily_objectives.reward_coins.easy', '20', 'Coins of an easy daily objective without its own coin reward'),
  ('daily_objectives.reward_coins.medium', '40', 'Coins of a medium daily objective without its own coin reward'),
  ('daily_objectives.reward_coins.hard', '60', 'Coins of a hard daily objective without its own coin reward');

alter table public.coin_ledger drop constraint coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in (
  'pack_purchase', 'match_reward', 'bot_match_reward', 'duplicate_conversion', 'conquest_bonus', 'level_reward',
  'emergency_reward', 'bonus_code', 'story_reward', 'event_reward', 'objective_reward', 'admin_adjustment'
));

alter table public.card_instances drop constraint card_instances_acquired_via_check;
alter table public.card_instances add constraint card_instances_acquired_via_check
  check (acquired_via in ('starter', 'pack', 'conquest', 'trade', 'level_unlock', 'bonus_code', 'story', 'event', 'objective'));

alter table public.card_transfers drop constraint card_transfers_reason_check;
alter table public.card_transfers add constraint card_transfers_reason_check
  check (reason in ('starter', 'pack', 'conquest', 'trade', 'conversion', 'level_unlock', 'bonus_code', 'story', 'event', 'objective'));

alter table public.pack_openings drop constraint pack_openings_pack_type_check;
alter table public.pack_openings add constraint pack_openings_pack_type_check
  check (pack_type in ('daily', 'standard', 'bonus', 'event', 'special', 'objective'));

-- ---------------------------------------------------------------------------
-- Tables. No client reads them: everything goes through the functions below.
-- ---------------------------------------------------------------------------

-- Which filters each metric understands (see daily_objective_match_amount):
--   matches_played, matches_won: format, story, opponent ('player' | 'bot'), bot_difficulties, flawless
--   threats_won, cards_played: the same, plus faction, min_rarity_rank, max_rarity_rank
--   emergency_passed, packs_opened, duplicates_converted, cards_conquered: none
create function public.daily_objective_params_valid(p_metric text, p_params jsonb)
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
        when p_metric in ('matches_played', 'matches_won') then
          array['format', 'story', 'opponent', 'bot_difficulties', 'flawless']
        else array[]::text[]
      end))
    )
    and (not (p_params ? 'format') or p_params ->> 'format' in ('classic', 'boss', 'triple'))
    and (not (p_params ? 'opponent') or p_params ->> 'opponent' in ('player', 'bot'))
    and (not (p_params ? 'faction') or p_params ->> 'faction' in ('heroes', 'villains', 'neutrals'))
    and (not (p_params ? 'story') or jsonb_typeof(p_params -> 'story') = 'boolean')
    and (not (p_params ? 'flawless') or jsonb_typeof(p_params -> 'flawless') = 'boolean')
    and (not (p_params ? 'bot_difficulties') or jsonb_typeof(p_params -> 'bot_difficulties') = 'array')
    and (not (p_params ? 'min_rarity_rank') or jsonb_typeof(p_params -> 'min_rarity_rank') = 'number')
    and (not (p_params ? 'max_rarity_rank') or jsonb_typeof(p_params -> 'max_rarity_rank') = 'number')
  end
$$;

-- The catalog. Edited with SQL by an admin; players get a snapshot of a row, so a
-- change never touches objectives already handed out.
create table public.daily_objective_definitions (
  code text primary key check (code ~ '^[a-z0-9_]{3,40}$'),
  -- Shown as is (Italian), with the target in it: "Vinci 3 partite".
  title text not null check (char_length(title) between 3 and 80),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  metric text not null check (metric in (
    'matches_played', 'matches_won', 'threats_won', 'cards_played',
    'emergency_passed', 'packs_opened', 'duplicates_converted', 'cards_conquered'
  )),
  params jsonb not null default '{}',
  target integer not null check (target between 1 and 100),
  -- Null: the difficulty's coins (daily_objectives.reward_coins.*).
  coins integer check (coins >= 0),
  packs integer not null default 0 check (packs between 0 and 5),
  card_definition_ids uuid[] not null default '{}',
  -- One entry per card: the variant of that copy, or null for the base drawing.
  card_variant_ids uuid[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint daily_objective_definitions_params check (public.daily_objective_params_valid(metric, params)),
  constraint daily_objective_definitions_variants_per_card
    check (cardinality(card_variant_ids) = cardinality(card_definition_ids)),
  constraint daily_objective_definitions_has_reward
    check (coalesce(coins, 1) > 0 or packs > 0 or cardinality(card_definition_ids) > 0)
);

-- One row per player and game day: the day's objectives were drawn, and how many swaps were used.
create table public.daily_objective_days (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  refreshes integer not null default 0 check (refreshes >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table public.daily_objectives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  day date not null,
  slot smallint not null check (slot between 1 and 20),
  definition_code text not null references public.daily_objective_definitions (code) on update cascade,
  -- Snapshot of the definition when it was drawn.
  difficulty text not null,
  title text not null,
  metric text not null,
  params jsonb not null,
  target integer not null check (target > 0),
  progress integer not null default 0,
  coins integer not null check (coins >= 0),
  packs integer not null check (packs >= 0),
  card_definition_ids uuid[] not null default '{}',
  card_variant_ids uuid[] not null default '{}',
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  claimed_at timestamptz,
  -- Swapped for another objective: kept so it is never offered again that day.
  replaced_at timestamptz,
  opening_ids uuid[] not null default '{}',
  foreign key (user_id, day) references public.daily_objective_days (user_id, day) on delete cascade,
  unique (user_id, day, definition_code),
  constraint daily_objectives_progress check (progress between 0 and target),
  constraint daily_objectives_done_shape check ((completed_at is not null) = (progress = target)),
  constraint daily_objectives_claim_shape check (claimed_at is null or (completed_at is not null and replaced_at is null)),
  constraint daily_objectives_replace_shape check (replaced_at is null or completed_at is null)
);

create unique index daily_objectives_slot_idx on public.daily_objectives (user_id, day, slot) where replaced_at is null;
create index daily_objectives_definition_idx on public.daily_objectives (definition_code);

alter table public.daily_objective_definitions enable row level security;
alter table public.daily_objective_days enable row level security;
alter table public.daily_objectives enable row level security;
revoke all on table public.daily_objective_definitions, public.daily_objective_days, public.daily_objectives
  from anon, authenticated;

-- Reward cards are normal copies: active, never level-unlock characters, variants of their own card.
create function public.validate_daily_objective_definition()
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
    raise exception 'invalid_objective_cards';
  end if;
  return new;
end;
$$;

revoke execute on function public.validate_daily_objective_definition() from public, anon, authenticated;

create trigger validate_daily_objective_definition
  before insert or update on public.daily_objective_definitions
  for each row execute function public.validate_daily_objective_definition();

-- The starting catalog (placeholder texts, SPEC §8.3). Rarity ranks: 1 Delta, 3 Beta.
insert into public.daily_objective_definitions (code, title, difficulty, metric, params, target, coins, packs) values
  ('play_matches', 'Gioca 2 partite', 'easy', 'matches_played', '{}', 2, null, 0),
  ('open_pack', 'Apri un pacchetto', 'easy', 'packs_opened', '{}', 1, null, 0),
  ('emergency_3', 'Supera 3 Minacce in Emergenza', 'easy', 'emergency_passed', '{}', 3, null, 0),
  ('play_beta_cards', 'Gioca 3 carte Beta o più rare', 'easy', 'cards_played', '{"min_rarity_rank": 3}', 3, null, 0),
  ('play_story', 'Gioca una missione della Storia', 'easy', 'matches_played', '{"story": true}', 1, null, 0),
  ('convert_duplicates', 'Converti 2 doppioni', 'easy', 'duplicates_converted', '{}', 2, null, 0),
  ('win_matches', 'Vinci 3 partite', 'medium', 'matches_won', '{}', 3, null, 0),
  ('villain_threats', 'Vinci 3 Minacce con un Supercattivo', 'medium', 'threats_won', '{"faction": "villains"}', 3, null, 0),
  ('hero_threats', 'Vinci 3 Minacce con un Supereroe', 'medium', 'threats_won', '{"faction": "heroes"}', 3, null, 0),
  ('delta_threats', 'Vinci 2 Minacce con una carta Delta', 'medium', 'threats_won', '{"max_rarity_rank": 1}', 2, null, 0),
  ('emergency_5', 'Supera 5 Minacce in Emergenza', 'medium', 'emergency_passed', '{}', 5, null, 0),
  ('win_triple', 'Vinci una partita ad Allarme Triplo', 'medium', 'matches_won', '{"format": "triple"}', 1, null, 0),
  ('win_boss', 'Vinci una partita a Grande Minaccia', 'medium', 'matches_won', '{"format": "boss"}', 1, null, 0),
  ('win_hard_bots', 'Vinci 2 partite contro un bot Difficile o Super Pro', 'hard', 'matches_won',
   '{"opponent": "bot", "bot_difficulties": ["hard", "super_pro"]}', 2, null, 0),
  ('win_online', 'Vinci una partita online contro un giocatore', 'hard', 'matches_won', '{"opponent": "player"}', 1, null, 0),
  ('conquer_card', 'Conquista una carta', 'hard', 'cards_conquered', '{}', 1, 0, 1),
  ('win_flawless', 'Vinci una partita classica 3-0', 'hard', 'matches_won', '{"format": "classic", "flawless": true}', 1, null, 0),
  ('emergency_all', 'Supera tutte le 8 Minacce dell''Emergenza', 'hard', 'emergency_passed', '{}', 8, 0, 1),
  ('threats_6', 'Vinci 6 Minacce in partita', 'hard', 'threats_won', '{}', 6, null, 0);

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------

-- Draws an objective of a difficulty for a slot: active, never handed out to this
-- player today, and not counting the same thing as an objective they hold today.
-- Null when none is left.
create function public.draw_daily_objective(p_user uuid, p_day date, p_difficulty text, p_slot integer)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_def public.daily_objective_definitions;
  v_id uuid;
begin
  select d.* into v_def
  from public.daily_objective_definitions d
  where d.is_active and d.difficulty = p_difficulty
    and not exists (
      select 1 from public.daily_objectives o
      where o.user_id = p_user and o.day = p_day
        and (o.definition_code = d.code or (o.replaced_at is null and o.metric = d.metric and o.params = d.params))
    )
  order by random()
  limit 1;
  if v_def.code is null then
    return null;
  end if;

  insert into public.daily_objectives (
    user_id, day, slot, definition_code, difficulty, title, metric, params, target,
    coins, packs, card_definition_ids, card_variant_ids
  ) values (
    p_user, p_day, p_slot, v_def.code, v_def.difficulty, v_def.title, v_def.metric, v_def.params, v_def.target,
    coalesce(v_def.coins, public.config_int('daily_objectives.reward_coins.' || v_def.difficulty)),
    v_def.packs, v_def.card_definition_ids, v_def.card_variant_ids
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- The player's game day, with its objectives drawn on first use (whatever comes first:
-- opening the objectives, or something that makes progress).
create function public.ensure_daily_objectives(p_user uuid)
returns date
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_day date := public.game_day();
  v_slot integer := 0;
  v_difficulty text;
begin
  insert into public.daily_objective_days (user_id, day) values (p_user, v_day)
  on conflict do nothing;
  if found then
    foreach v_difficulty in array array['easy', 'medium', 'hard'] loop
      for i in 1..public.config_int('daily_objectives.per_day.' || v_difficulty) loop
        v_slot := v_slot + 1;
        perform public.draw_daily_objective(p_user, v_day, v_difficulty, v_slot);
      end loop;
    end loop;
  end if;
  return v_day;
end;
$$;

-- Adds progress to one open objective; it completes at its target.
create function public.add_daily_objective_progress(p_objective_id uuid, p_amount integer)
returns void
language sql
volatile
set search_path = ''
as $$
  update public.daily_objectives o
  set progress = least(o.target, o.progress + p_amount),
      completed_at = case when o.progress + p_amount >= o.target then now() end
  where o.id = p_objective_id and p_amount > 0 and o.completed_at is null and o.replaced_at is null
$$;

-- Adds progress to the player's open objectives of today that count p_metric (metrics without filters).
create function public.advance_daily_objectives(p_user uuid, p_metric text, p_amount integer default 1)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_day date;
  v_id uuid;
begin
  if p_user is null or p_amount is null or p_amount <= 0 then
    return;
  end if;
  v_day := public.ensure_daily_objectives(p_user);
  for v_id in
    select o.id from public.daily_objectives o
    where o.user_id = p_user and o.day = v_day and o.metric = p_metric
      and o.completed_at is null and o.replaced_at is null
  loop
    perform public.add_daily_objective_progress(v_id, p_amount);
  end loop;
end;
$$;

-- Whether a played card counts for an objective's card filters.
create function public.daily_objective_card_fits(p_params jsonb, p_faction text, p_rank integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (not (p_params ? 'faction') or p_params ->> 'faction' = p_faction)
     and (not (p_params ? 'min_rarity_rank') or p_rank >= (p_params ->> 'min_rarity_rank')::integer)
     and (not (p_params ? 'max_rarity_rank') or p_rank <= (p_params ->> 'max_rarity_rank')::integer)
$$;

-- What a finished match is worth to one side for an objective.
--   matches_played: 1; matches_won: 1 if that side won;
--   threats_won: threats (Allarme Triplo: contests) that side won with a fitting card, classic and triple only
--     (a Grande Minaccia turn is not won by one card);
--   cards_played: distinct fitting characters that side played.
create function public.daily_objective_match_amount(p_metric text, p_params jsonb, p_match public.matches, p_side text)
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

revoke execute on function public.draw_daily_objective(uuid, date, text, integer) from public, anon, authenticated;
revoke execute on function public.ensure_daily_objectives(uuid) from public, anon, authenticated;
revoke execute on function public.add_daily_objective_progress(uuid, integer) from public, anon, authenticated;
revoke execute on function public.advance_daily_objectives(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.daily_objective_match_amount(text, jsonb, public.matches, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Where progress comes from. Abandoned matches count for nobody, as for events.
-- ---------------------------------------------------------------------------

create function public.advance_match_daily_objectives()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_side text;
  v_user uuid;
  v_day date;
  v_objective record;
begin
  if new.status <> 'finished' or old.status = 'finished' or new.end_reason is distinct from 'completed' then
    return new;
  end if;
  foreach v_side in array array['a', 'b'] loop
    v_user := case v_side when 'a' then new.player_a else new.player_b end;
    continue when v_user is null; -- a bot
    v_day := public.ensure_daily_objectives(v_user);
    for v_objective in
      select o.id, o.metric, o.params from public.daily_objectives o
      where o.user_id = v_user and o.day = v_day and o.completed_at is null and o.replaced_at is null
        and o.metric in ('matches_played', 'matches_won', 'threats_won', 'cards_played')
    loop
      perform public.add_daily_objective_progress(
        v_objective.id,
        public.daily_objective_match_amount(v_objective.metric, v_objective.params, new, v_side)
      );
    end loop;
  end loop;
  return new;
end;
$$;

create trigger matches_advance_daily_objectives
  after update of status on public.matches
  for each row execute function public.advance_match_daily_objectives();

create function public.advance_emergency_daily_objectives()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.passed then
    perform public.advance_daily_objectives(r.user_id, 'emergency_passed', 1)
    from public.emergency_runs r where r.id = new.run_id;
  end if;
  return new;
end;
$$;

create trigger emergency_plays_advance_daily_objectives
  after insert on public.emergency_plays
  for each row execute function public.advance_emergency_daily_objectives();

-- Real packs: the daily one, bought ones, and those that bonus codes and events give.
-- Not the packs an objective pays (claim_daily_objective sets o_mega.objective_claim).
create function public.advance_pack_daily_objectives()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.pack_type in ('daily', 'standard', 'special')
     and coalesce(current_setting('o_mega.objective_claim', true), '') <> 'on' then
    perform public.advance_daily_objectives(new.user_id, 'packs_opened', 1);
  end if;
  return new;
end;
$$;

create trigger pack_openings_advance_daily_objectives
  after insert on public.pack_openings
  for each row execute function public.advance_pack_daily_objectives();

-- Once per statement: converting duplicates moves many cards at once.
create function public.advance_transfer_daily_objectives()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.advance_daily_objectives(t.from_user, 'duplicates_converted', count(*)::integer)
  from new_transfers t
  where t.reason = 'conversion' and t.from_user is not null
  group by t.from_user;

  perform public.advance_daily_objectives(t.to_user, 'cards_conquered', count(*)::integer)
  from new_transfers t
  where t.reason = 'conquest' and t.to_user is not null
  group by t.to_user;
  return null;
end;
$$;

create trigger card_transfers_advance_daily_objectives
  after insert on public.card_transfers
  referencing new table as new_transfers
  for each statement execute function public.advance_transfer_daily_objectives();

revoke execute on function public.advance_match_daily_objectives() from public, anon, authenticated;
revoke execute on function public.advance_emergency_daily_objectives() from public, anon, authenticated;
revoke execute on function public.advance_pack_daily_objectives() from public, anon, authenticated;
revoke execute on function public.advance_transfer_daily_objectives() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Player RPCs
-- ---------------------------------------------------------------------------

-- Volatile: it must see the objectives drawn or swapped just before, in the same call.
create function public.daily_objectives_payload(p_user uuid, p_day date)
returns jsonb
language sql
volatile
set search_path = ''
as $$
  select jsonb_build_object(
    'day', p_day,
    'resets_at', public.next_reset_at(),
    'refreshes_per_day', public.config_int('daily_objectives.refreshes_per_day'),
    'refreshes_left', greatest(0, public.config_int('daily_objectives.refreshes_per_day') - coalesce(
      (select d.refreshes from public.daily_objective_days d where d.user_id = p_user and d.day = p_day), 0)),
    'objectives', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id,
        'slot', o.slot,
        'code', o.definition_code,
        'difficulty', o.difficulty,
        'title', o.title,
        'target', o.target,
        'progress', o.progress,
        'completed', o.completed_at is not null,
        'claimed', o.claimed_at is not null,
        'coins', o.coins,
        'packs', o.packs,
        'opening_ids', to_jsonb(o.opening_ids),
        'cards', coalesce((
          select jsonb_agg(jsonb_build_object(
            'definition_id', c.definition_id,
            'code', cd.code,
            'name', cd.name,
            'rarity_code', cd.rarity_code,
            'art_url', coalesce(v.art_url, cd.art_url),
            'variant_id', c.variant_id
          ) order by c.n)
          from unnest(o.card_definition_ids, o.card_variant_ids) with ordinality as c(definition_id, variant_id, n)
          join public.card_definitions cd on cd.id = c.definition_id
          left join public.card_variants v on v.id = c.variant_id
        ), '[]'::jsonb)
      ) order by o.slot)
      from public.daily_objectives o
      where o.user_id = p_user and o.day = p_day and o.replaced_at is null
    ), '[]'::jsonb)
  )
$$;

revoke execute on function public.daily_objectives_payload(uuid, date) from public, anon, authenticated;

-- Today's objectives of the caller, drawn on the first call of the day.
create function public.get_daily_objectives()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_day date;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_user) then
    raise exception 'profile_not_found';
  end if;
  v_day := public.ensure_daily_objectives(v_user);
  return public.daily_objectives_payload(v_user, v_day);
end;
$$;

-- Pays a completed objective of today, once: coins (coin_ledger), cards (card_transfers)
-- and packs, all in this transaction.
create function public.claim_daily_objective(p_objective_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_objective public.daily_objectives;
  v_instance uuid;
  v_instance_ids uuid[] := '{}';
  v_new_ids uuid[] := '{}';
  v_opening uuid;
  v_openings uuid[] := '{}';
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  select * into v_objective from public.daily_objectives o
  where o.id = p_objective_id and o.user_id = v_user
  for update;
  if v_objective.id is null or v_objective.replaced_at is not null then
    raise exception 'objective_not_found';
  end if;
  if v_objective.claimed_at is not null then
    raise exception 'objective_already_claimed';
  end if;
  if v_objective.day <> public.game_day() then
    raise exception 'objective_expired';
  end if;
  if v_objective.completed_at is null then
    raise exception 'objective_not_completed';
  end if;

  update public.daily_objectives set claimed_at = now()
  where id = v_objective.id and claimed_at is null;
  if not found then
    raise exception 'objective_already_claimed';
  end if;

  -- The packs below are a reward, not a pack the player opened.
  perform set_config('o_mega.objective_claim', 'on', true);

  if v_objective.coins > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id)
    values (v_user, v_objective.coins, 'objective_reward', v_objective.id);
  end if;

  for i in 1..coalesce(cardinality(v_objective.card_definition_ids), 0) loop
    insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
    values (v_objective.card_definition_ids[i], v_user, 'objective', v_objective.card_variant_ids[i])
    returning id into v_instance;
    insert into public.card_transfers (instance_id, from_user, to_user, reason)
    values (v_instance, null, v_user, 'objective');
    if (select count(*) from public.card_instances c
        where c.owner_id = v_user and c.definition_id = v_objective.card_definition_ids[i]) = 1 then
      v_new_ids := v_new_ids || v_instance;
    end if;
    v_instance_ids := v_instance_ids || v_instance;
  end loop;

  if cardinality(v_instance_ids) > 0 then
    insert into public.pack_openings (user_id, pack_type, card_instance_ids, new_card_instance_ids)
    values (v_user, 'objective', v_instance_ids, v_new_ids)
    returning id into v_opening;
    v_openings := v_openings || v_opening;
  end if;

  for i in 1..v_objective.packs loop
    v_openings := v_openings || public.open_pack(v_user, 'standard');
  end loop;

  perform set_config('o_mega.objective_claim', '', true);

  update public.daily_objectives set opening_ids = v_openings where id = v_objective.id;

  return jsonb_build_object(
    'coins', v_objective.coins,
    'opening_ids', to_jsonb(v_openings),
    'coin_balance', public.coin_balance(v_user)
  );
end;
$$;

-- Swaps an objective of today not yet completed for another of the same difficulty,
-- never one already offered today. Limited per day in total.
create function public.refresh_daily_objective(p_objective_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_day date;
  v_days public.daily_objective_days;
  v_objective public.daily_objectives;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_user) then
    raise exception 'profile_not_found';
  end if;
  v_day := public.ensure_daily_objectives(v_user);
  -- One swap at a time per player.
  select * into v_days from public.daily_objective_days d
  where d.user_id = v_user and d.day = v_day
  for update;

  select * into v_objective from public.daily_objectives o
  where o.id = p_objective_id and o.user_id = v_user
  for update;
  if v_objective.id is null or v_objective.replaced_at is not null then
    raise exception 'objective_not_found';
  end if;
  if v_objective.day <> v_day then
    raise exception 'objective_expired';
  end if;
  if v_objective.completed_at is not null then
    raise exception 'objective_already_completed';
  end if;
  if v_days.refreshes >= public.config_int('daily_objectives.refreshes_per_day') then
    raise exception 'no_refreshes_left';
  end if;

  update public.daily_objectives set replaced_at = now() where id = v_objective.id;
  if public.draw_daily_objective(v_user, v_day, v_objective.difficulty, v_objective.slot) is null then
    -- Rolls the swap back: nothing used.
    raise exception 'no_objective_available';
  end if;
  update public.daily_objective_days set refreshes = refreshes + 1
  where user_id = v_user and day = v_day;

  return public.daily_objectives_payload(v_user, v_day);
end;
$$;

revoke execute on function public.get_daily_objectives() from public, anon;
revoke execute on function public.claim_daily_objective(uuid) from public, anon;
revoke execute on function public.refresh_daily_objective(uuid) from public, anon;
grant execute on function public.get_daily_objectives() to authenticated;
grant execute on function public.claim_daily_objective(uuid) to authenticated;
grant execute on function public.refresh_daily_objective(uuid) to authenticated;
