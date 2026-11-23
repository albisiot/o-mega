-- Caccia grossa (SPEC §5.18), first stage: a cooperative hunt, live, for 2 to 4 players
-- against one of the Bosses of the Grande Minaccia. Every round the Boss attacks with one
-- threat and a move; each player puts one card on it and the scores are summed. Below the
-- Attack the team loses one of its Defences; what goes beyond it is damage to the Boss's
-- Life. A room with a friend code, server allies, the threats drawn when the room opens
-- (only their levels shown, two from the Boss's district), the Boss's moves drawn then too
-- and shown one round ahead, the Magnitude of each Boss that sets its Strength and the
-- prizes of a win. The Edge Function scores every round with the engine
-- (packages/game-engine/src/raid.ts); raid_record_round re-checks it and recomputes the
-- damage, the Defences, the Life and the end. Clients read only through get_raid and
-- raid_state; every write is a function. Its own tables: a hunt has no operation, rival
-- or Panic, so the Operazioni are untouched (only a trigger keeps a player in one room).

-- ---------------------------------------------------------------------------
-- Configuration (balance.ts `raid`)
-- ---------------------------------------------------------------------------

insert into public.game_config (key, value, description) values
  ('raid.rounds', '5', 'Caccia grossa: rounds of a hunt, one threat each'),
  ('raid.squad_size', '6', 'Caccia grossa: characters each player brings'),
  ('raid.min_players', '2', 'Caccia grossa: players needed to start, server allies included'),
  ('raid.max_players', '4', 'Caccia grossa: most players in a room'),
  ('raid.defenses', '3', 'Caccia grossa: the team''s Defences'),
  ('raid.targets.level1', '7', 'Caccia grossa: one player''s share of the Attack of a level 1 threat'),
  ('raid.targets.level2', '13', 'Caccia grossa: one player''s share of the Attack of a level 2 threat'),
  ('raid.targets.level3', '18', 'Caccia grossa: one player''s share of the Attack of a level 3 threat'),
  ('raid.targets.level4', '23', 'Caccia grossa: one player''s share of the Attack of a level 4 threat'),
  ('raid.targets.level5', '28', 'Caccia grossa: one player''s share of the Attack of a level 5 threat'),
  ('raid.targets.level6', '32', 'Caccia grossa: one player''s share of the Attack of a level 6 threat'),
  ('raid.attack_factor.players2', '200', 'Caccia grossa: Attack in two, in hundredths of one player''s share'),
  ('raid.attack_factor.players3', '300', 'Caccia grossa: Attack in three, in hundredths of one player''s share'),
  ('raid.attack_factor.players4', '405', 'Caccia grossa: Attack in four, in hundredths of one player''s share'),
  ('raid.vita_factor.players2', '200', 'Caccia grossa: the Boss''s Life in two, in hundredths of the base'),
  ('raid.vita_factor.players3', '290', 'Caccia grossa: the Boss''s Life in three, in hundredths of the base'),
  ('raid.vita_factor.players4', '370', 'Caccia grossa: the Boss''s Life in four, in hundredths of the base'),
  ('raid.vita_base', '14', 'Caccia grossa: the Boss''s Life for one player''s share'),
  ('raid.magnitude1.forza_percent', '92', 'Caccia grossa: Strength (Attack and Life) of a Magnitude 1 Boss, in hundredths'),
  ('raid.magnitude1.reward_percent', '50', 'Caccia grossa: what a win on a Magnitude 1 Boss pays, in hundredths'),
  ('raid.magnitude2.forza_percent', '96', 'Caccia grossa: Strength of a Magnitude 2 Boss, in hundredths'),
  ('raid.magnitude2.reward_percent', '75', 'Caccia grossa: what a win on a Magnitude 2 Boss pays, in hundredths'),
  ('raid.magnitude3.forza_percent', '100', 'Caccia grossa: Strength of a Magnitude 3 Boss, in hundredths'),
  ('raid.magnitude3.reward_percent', '100', 'Caccia grossa: what a win on a Magnitude 3 Boss pays, in hundredths'),
  ('raid.magnitude4.forza_percent', '104', 'Caccia grossa: Strength of a Magnitude 4 Boss, in hundredths'),
  ('raid.magnitude4.reward_percent', '150', 'Caccia grossa: what a win on a Magnitude 4 Boss pays, in hundredths'),
  ('raid.magnitude5.forza_percent', '108', 'Caccia grossa: Strength of a Magnitude 5 Boss, in hundredths'),
  ('raid.magnitude5.reward_percent', '250', 'Caccia grossa: what a win on a Magnitude 5 Boss pays, in hundredths'),
  ('raid.heavy_defenses', '2', 'Caccia grossa: Defences a Colpo pesante takes when the team does not hold'),
  ('raid.regen_percent', '10', 'Caccia grossa: share of the whole Life a Rigenerazione gives back, rounded up'),
  ('raid.exposed_max', '1', 'Caccia grossa: most Punto scoperto in a hunt'),
  ('raid.heavy_max', '2', 'Caccia grossa: most Colpo pesante in a hunt (never two in a row)'),
  ('raid.from_district', '2', 'Caccia grossa: threats drawn from the Boss''s district, when it has enough'),
  ('raid.round_seconds', '30', 'Caccia grossa: time to put a card down'),
  ('raid.reveal_pause_seconds', '15', 'Caccia grossa: time to read a round''s result before the next timer'),
  ('raid.lobby_minutes', '30', 'Caccia grossa: a room nobody touches for this long closes'),
  ('raid.win_xp', '30', 'Caccia grossa: XP of a win, times the Magnitude''s reward_percent'),
  ('raid.loss_xp', '10', 'Caccia grossa: XP of a loss, at every Magnitude'),
  ('raid.first_win_coins', '60', 'Caccia grossa: coins of a player''s first win on a Boss, times the Magnitude''s reward_percent'),
  ('raid.self_chosen_percent', '50', 'Caccia grossa: prizes only to who chose at least this share of the cards played'),
  ('raid.ally_max_rank', '3', 'Caccia grossa: rarest rank a server ally fields (3 = Beta)');

alter table public.coin_ledger drop constraint coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in (
  'pack_purchase', 'match_reward', 'bot_match_reward', 'duplicate_conversion', 'conquest_bonus', 'level_reward',
  'emergency_reward', 'bonus_code', 'story_reward', 'story_star', 'event_reward', 'objective_reward', 'achievement_reward',
  'emergency_prize', 'ranked_prize', 'emergency_week_reward', 'emergency_week_prize', 'admin_adjustment', 'challenge_reward',
  'coop_reward', 'coop_star', 'raid_reward'
));

-- ---------------------------------------------------------------------------
-- The Bosses: the Grande Minaccia's, with what the hunt needs
-- ---------------------------------------------------------------------------

alter table public.boss_definitions
  add column raid_active boolean not null default false,
  -- Two of a hunt's threats come from here (threat_definitions.district).
  add column raid_district text check (raid_district is null or raid_district in (
    'necropoli', 'alti', 'vulcano', 'centro', 'stazione', 'popolari', 'lungomare', 'porto', 'cantiere'
  )),
  add column raid_magnitude integer check (raid_magnitude between 1 and 5),
  -- The repertoire: the moves it may make besides an Attacco semplice.
  add column raid_moves text[] not null default '{}'
    check (raid_moves <@ array['heavy', 'armor', 'exposed', 'regen', 'target']::text[]),
  -- Its own Life, in hundredths: what makes it as hard as its Magnitude says.
  add column raid_vita_percent integer not null default 100 check (raid_vita_percent between 10 and 1000),
  add constraint boss_definitions_raid_shape check (not raid_active or (raid_district is not null and raid_magnitude is not null));

update public.boss_definitions b set
  raid_active = true,
  raid_district = v.district,
  raid_magnitude = v.magnitude,
  raid_moves = v.moves,
  raid_vita_percent = v.vita
from (values
  -- The same as scripts/raid-bosses.json, which the simulator reads.
  ('B05', 'popolari', 1, array['armor', 'exposed'], 115),
  ('B01', 'porto', 2, array['armor', 'heavy', 'exposed'], 110),
  ('B02', 'necropoli', 3, array['exposed', 'heavy', 'target'], 85),
  ('B03', 'alti', 3, array['target', 'armor', 'exposed'], 85),
  ('B06', 'stazione', 4, array['target', 'regen', 'heavy', 'exposed'], 100),
  ('B04', 'lungomare', 5, array['armor', 'heavy', 'regen', 'target', 'exposed'], 85)
) as v(code, district, magnitude, moves, vita)
where b.code = v.code;

-- ---------------------------------------------------------------------------
-- Rooms, members, rounds, plays, first wins
-- ---------------------------------------------------------------------------

create table public.raid_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code ~ '^[A-Z2-9]{6}$'),
  boss_id uuid not null references public.boss_definitions (id),
  host uuid not null references public.profiles (id) on delete cascade,
  -- lobby → active → won | lost; closed: left before starting, or stale.
  status text not null default 'lobby' check (status in ('lobby', 'active', 'won', 'lost', 'closed')),
  -- Seats when it started (server allies included): the Attack and the Life follow it.
  players integer check (players between 1 and 4),
  current_round integer not null default 0,
  -- Copied from the Boss and its Magnitude when the room opened.
  magnitude integer not null check (magnitude between 1 and 5),
  forza_percent integer not null check (forza_percent > 0),
  vita_percent integer not null check (vita_percent > 0),
  reward_percent integer not null check (reward_percent >= 0),
  -- Drawn when the room opened: the five threats (only their levels are shown before their
  -- round), and the Boss's moves (shown one round ahead).
  threat_ids uuid[] not null,
  threat_levels integer[] not null,
  moves text[] not null,
  -- From the start: the Boss's whole Life, the Life left, the team's Defences.
  vita_max integer,
  vita integer,
  defenses integer,
  touched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  constraint raid_rooms_draw_shape check (
    cardinality(threat_ids) = cardinality(threat_levels) and cardinality(threat_ids) = cardinality(moves)
  ),
  constraint raid_rooms_started_shape check (
    status in ('lobby', 'closed') or (started_at is not null and players is not null and vita is not null and defenses is not null)
  ),
  constraint raid_rooms_finished_shape check ((status in ('won', 'lost', 'closed')) = (finished_at is not null))
);

-- A code points to one room waiting for players.
create unique index raid_rooms_lobby_code_idx on public.raid_rooms (code) where status = 'lobby';
create index raid_rooms_boss_id_idx on public.raid_rooms (boss_id);
create index raid_rooms_host_idx on public.raid_rooms (host);

create table public.raid_members (
  room_id uuid not null references public.raid_rooms (id) on delete cascade,
  seat integer not null check (seat between 1 and 4),
  -- null for a server ally, always declared.
  user_id uuid references public.profiles (id) on delete cascade,
  bot_name text check (char_length(bot_name) between 2 and 40),
  bot_avatar_definition_id uuid references public.card_definitions (id),
  -- The squad, a snapshot: the cards stay free for the other matches of the player.
  card_instance_ids uuid[],
  definition_ids uuid[],
  ready boolean not null default false,
  -- The card put down for the round placed_round.
  placement uuid,
  placed_round integer,
  signal text check (signal in ('hold', 'push', 'help', 'ready')),
  signal_at timestamptz,
  last_seen_at timestamptz not null default now(),
  -- Left the room with the button: in a hunt, the server plays the cards.
  left_at timestamptz,
  -- What the end paid.
  xp integer,
  coins integer,
  joined_at timestamptz not null default now(),
  primary key (room_id, seat),
  unique (room_id, user_id),
  constraint raid_members_bot_shape check ((user_id is null) = (bot_name is not null)),
  constraint raid_members_squad_shape check ((card_instance_ids is null) = (definition_ids is null))
);

create index raid_members_user_id_idx on public.raid_members (user_id);
create index raid_members_bot_avatar_definition_id_idx on public.raid_members (bot_avatar_definition_id);

create table public.raid_rounds (
  room_id uuid not null references public.raid_rooms (id) on delete cascade,
  round integer not null check (round >= 1),
  threat_id uuid not null references public.threat_definitions (id),
  level integer not null,
  move text not null check (move in ('plain', 'heavy', 'armor', 'exposed', 'regen', 'target')),
  attack integer not null check (attack >= 0),
  deadline_at timestamptz not null,
  -- Once resolved: the sum, the Attack lowered by Sabotatore, what held, whether an Annullatore
  -- cancelled the move, the damage, the Defences lost, the Life given back, and after the round.
  total integer,
  effective_attack integer,
  required integer,
  held boolean,
  cancelled boolean,
  damage integer,
  defenses_lost integer,
  healed integer,
  vita integer,
  defenses integer,
  resolved_at timestamptz,
  primary key (room_id, round),
  constraint raid_rounds_resolved_shape check ((resolved_at is null) = (total is null))
);

create index raid_rounds_threat_id_idx on public.raid_rounds (threat_id);

create table public.raid_plays (
  room_id uuid not null,
  round integer not null,
  seat integer not null check (seat between 1 and 4),
  user_id uuid references public.profiles (id) on delete cascade,
  card_instance_id uuid not null,
  definition_id uuid not null references public.card_definitions (id),
  base_score integer not null,
  bonus integer not null,
  score integer not null,
  -- What it added to the sum: the score, or half of it under Bersaglio.
  counted integer not null,
  highest_value integer not null,
  auto_played boolean not null,
  parts jsonb,
  primary key (room_id, round, seat),
  foreign key (room_id, round) references public.raid_rounds (room_id, round) on delete cascade
);

create index raid_plays_user_id_idx on public.raid_plays (user_id);
create index raid_plays_definition_id_idx on public.raid_plays (definition_id);

-- The Bosses each player has beaten: what the first win pays.
create table public.raid_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  boss_id uuid not null references public.boss_definitions (id),
  room_id uuid not null references public.raid_rooms (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, boss_id)
);

create index raid_progress_boss_id_idx on public.raid_progress (boss_id);
create index raid_progress_room_id_idx on public.raid_progress (room_id);

alter table public.raid_rooms enable row level security;
alter table public.raid_members enable row level security;
alter table public.raid_rounds enable row level security;
alter table public.raid_plays enable row level security;
alter table public.raid_progress enable row level security;
revoke all on table public.raid_rooms, public.raid_members, public.raid_rounds, public.raid_plays, public.raid_progress
  from anon, authenticated;
grant select on table public.raid_rooms, public.raid_members, public.raid_rounds, public.raid_plays, public.raid_progress
  to service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- "Something changed" to the room's members (they read raid_state then).
create function public.raid_notify(p_room uuid, p_kind text)
returns void
language sql
volatile
set search_path = ''
as $$
  select realtime.send(jsonb_build_object('kind', p_kind), 'update', 'raid:' || p_room, false)
$$;

-- Closes the rooms nobody moves any more: a lobby untouched for raid.lobby_minutes, a hunt
-- whose round is 10 minutes past its deadline (everyone gone: lost, no prize).
create function public.raid_close_stale()
returns void
language sql
volatile
set search_path = ''
as $$
  update public.raid_rooms set status = 'closed', finished_at = now()
  where status = 'lobby' and touched_at < now() - make_interval(mins => public.config_int('raid.lobby_minutes'));
  update public.raid_rooms r set status = 'lost', finished_at = now()
  from public.raid_rounds c
  where r.status = 'active' and c.room_id = r.id and c.round = r.current_round and c.resolved_at is null
    and c.deadline_at < now() - interval '10 minutes';
$$;

-- The hunt a player is in and has not left, waiting or playing; null for none.
create function public.raid_open_room(p_user uuid)
returns uuid
language sql
stable
set search_path = ''
as $$
  select r.id
  from public.raid_members m
  join public.raid_rooms r on r.id = m.room_id
  where m.user_id = p_user and m.left_at is null and r.status in ('lobby', 'active')
  order by r.created_at desc
  limit 1
$$;

-- `p_value` times `p_hundredths` / 100, to the nearest integer, halves up (percentOf in the engine).
create function public.raid_percent(p_value integer, p_hundredths integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select (p_value * p_hundredths + 50) / 100
$$;

-- A threat's Attack: one player's share of its level, times the players' factor and the Strength (raidAttack).
create function public.raid_attack(p_level integer, p_players integer, p_forza integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select (public.config_int('raid.targets.level' || p_level) * public.config_int('raid.attack_factor.players' || p_players)
          * p_forza + 5000) / 10000
$$;

-- The Boss's whole Life (raidVitaMax).
create function public.raid_vita_max(p_players integer, p_forza integer, p_vita_percent integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select greatest(1, (public.config_int('raid.vita_base') * public.config_int('raid.vita_factor.players' || p_players)
                      * p_forza * p_vita_percent + 500000) / 1000000)
$$;

-- Five threats of Nuova Megara (usual ones: no place, no rarity, no modifier) with the level
-- rules of a match (SPEC §5.4), raid.from_district of them from the Boss's district when it
-- has enough, in random order. Drawn again until the levels fit; without the district at last.
create function public.raid_draw_threats(p_boss uuid)
returns uuid[]
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_district text := (select raid_district from public.boss_definitions where id = p_boss);
  v_count integer := public.config_int('raid.rounds');
  v_local uuid[];
  v_rest uuid[];
  v_ids uuid[];
  v_levels integer[];
begin
  for v_attempt in 1 .. 400 loop
    select coalesce(array_agg(x.id), '{}') into v_local
    from (
      select t.id from public.threat_definitions t
      where t.is_active and t.region = 'megara' and t.rarity_code is null and t.modifier_code is null
        and t.district = v_district
      order by random()
      limit case when v_attempt <= 200 then public.config_int('raid.from_district') else 0 end
    ) x;
    select coalesce(array_agg(x.id), '{}') into v_rest
    from (
      select t.id from public.threat_definitions t
      where t.is_active and t.region = 'megara' and t.rarity_code is null and t.modifier_code is null
        and not (t.id = any (v_local))
      order by random()
      limit v_count - cardinality(v_local)
    ) x;
    select array_agg(t.id order by random()) into v_ids
    from public.threat_definitions t where t.id = any (v_local || v_rest);
    select array_agg(t.level order by u.ord) into v_levels
    from unnest(v_ids) with ordinality as u(id, ord) join public.threat_definitions t on t.id = u.id;
    if cardinality(v_ids) = v_count
       and (select min(l) from unnest(v_levels) l) <= public.config_int('match.threat_levels.require_one_at_most')
       and (select max(l) from unnest(v_levels) l) >= public.config_int('match.threat_levels.require_one_at_least')
       and (select sum(l) from unnest(v_levels) l) between public.config_int('match.threat_levels.min_sum')
                                                        and public.config_int('match.threat_levels.max_sum') then
      return v_ids;
    end if;
  end loop;
  raise exception 'raid_no_threats';
end;
$$;

-- The Boss's moves for a hunt: each round one of its repertoire or an Attacco semplice
-- ('plain'), at random among those still allowed: at most raid.exposed_max Punto scoperto,
-- raid.heavy_max Colpo pesante and never two in a row, no Rigenerazione first (drawRaidMoves).
create function public.raid_draw_moves(p_boss uuid)
returns text[]
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_pool text[] := array['plain'] || (select raid_moves from public.boss_definitions where id = p_boss);
  v_moves text[] := '{}';
  v_allowed text[];
begin
  for v_round in 1 .. public.config_int('raid.rounds') loop
    select array_agg(m) into v_allowed
    from unnest(v_pool) m
    where not (m = 'regen' and v_round = 1)
      and not (m = 'exposed' and (select count(*) from unnest(v_moves) x where x = 'exposed') >= public.config_int('raid.exposed_max'))
      and not (m = 'heavy' and ((select count(*) from unnest(v_moves) x where x = 'heavy') >= public.config_int('raid.heavy_max')
                                or coalesce(v_moves[v_round - 1], '') = 'heavy'));
    v_moves := v_moves || v_allowed[1 + floor(random() * cardinality(v_allowed))::integer];
  end loop;
  return v_moves;
end;
$$;

-- Opens a round of a started room: its threat, level, move and Attack, and the deadline; from
-- the second round on, after the pause to read the result.
create function public.raid_open_round(p_room uuid, p_round integer)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_room public.raid_rooms;
begin
  select * into v_room from public.raid_rooms where id = p_room;
  insert into public.raid_rounds (room_id, round, threat_id, level, move, attack, deadline_at)
  values (
    p_room, p_round, v_room.threat_ids[p_round], v_room.threat_levels[p_round], v_room.moves[p_round],
    public.raid_attack(v_room.threat_levels[p_round], v_room.players, v_room.forza_percent),
    now() + make_interval(secs => public.config_int('raid.round_seconds')
                                  + case when p_round > 1 then public.config_int('raid.reveal_pause_seconds') else 0 end)
  );
  update public.raid_rooms set current_round = p_round, touched_at = now() where id = p_room;
  -- Pronto goes for the people; allies stay ready.
  update public.raid_members set ready = (user_id is null), placement = null, placed_round = null where room_id = p_room;
end;
$$;

-- A squad for an ally: six different characters the packs can give, up to raid.ally_max_rank,
-- the strongest of a random two dozen (values squared, as the bots weigh them, SPEC §5.9).
create function public.raid_ally_squad()
returns uuid[]
language sql
volatile
set search_path = ''
as $$
  select array_agg(s.id order by s.strength desc)
  from (
    select p.id, p.strength
    from (
      select d.id, (select sum(power(v.value::numeric, 2)) from jsonb_each_text(d.stats) as v) as strength
      from public.card_definitions d
      join public.rarity_definitions r on r.code = d.rarity_code
      where public.is_pack_card(d) and r.rank <= public.config_int('raid.ally_max_rank')
      order by random()
      limit 24
    ) p
    order by p.strength desc
    limit public.config_int('raid.squad_size')
  ) s
$$;

-- Seats an ally in the first free seat of a room: a Reggente name not taken in the room, a
-- face from its squad, Pronto at once. Returns the seat, or null when the room is full.
create function public.raid_seat_ally(p_room uuid)
returns integer
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_seat integer;
  v_squad uuid[];
  v_name text;
begin
  if (select count(*) from public.raid_members where room_id = p_room) >= public.config_int('raid.max_players') then
    return null;
  end if;
  select min(s) into v_seat from generate_series(1, 4) as s
  where not exists (select 1 from public.raid_members where room_id = p_room and seat = s);
  v_squad := public.raid_ally_squad();
  select n into v_name
  from unnest(array['Reggente Bruni', 'Reggente Leone', 'Reggente Sartori', 'Reggente Valli', 'Reggente Fabbri', 'Reggente Neri',
                    'Reggente Galli', 'Reggente Moretti']) as n
  where not exists (select 1 from public.raid_members m where m.room_id = p_room and m.bot_name = n)
  order by random()
  limit 1;
  insert into public.raid_members (room_id, user_id, seat, bot_name, bot_avatar_definition_id, card_instance_ids, definition_ids, ready)
  values (p_room, null, v_seat, v_name, v_squad[1], (select array_agg(gen_random_uuid()) from unnest(v_squad)), v_squad, true);
  return v_seat;
end;
$$;

-- What a player may not do while in another room: the Operazioni's or a hunt. Also takes the
-- player out of the Operazioni's public queue.
create function public.raid_assert_free(p_user uuid)
returns void
language plpgsql
volatile
set search_path = ''
as $$
begin
  if public.raid_open_room(p_user) is not null or public.coop_open_room(p_user) is not null then
    raise exception 'coop_already_in_room';
  end if;
  if public.has_active_match(p_user) then
    raise exception 'match_already_active';
  end if;
  delete from public.coop_queue where user_id = p_user;
end;
$$;

-- The other way round: no room of the Operazioni, nor their queue, from inside a hunt.
create function public.coop_guard_raid_room()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null and public.raid_open_room(new.user_id) is not null then
    raise exception 'coop_already_in_room';
  end if;
  return new;
end;
$$;

create trigger coop_members_raid_room before insert on public.coop_members
  for each row execute function public.coop_guard_raid_room();
create trigger coop_queue_raid_room before insert on public.coop_queue
  for each row execute function public.coop_guard_raid_room();

revoke execute on function public.raid_notify(uuid, text) from public, anon, authenticated;
revoke execute on function public.raid_close_stale() from public, anon, authenticated;
revoke execute on function public.raid_open_room(uuid) from public, anon, authenticated;
revoke execute on function public.raid_percent(integer, integer) from public, anon, authenticated;
revoke execute on function public.raid_attack(integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.raid_vita_max(integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.raid_draw_threats(uuid) from public, anon, authenticated;
revoke execute on function public.raid_draw_moves(uuid) from public, anon, authenticated;
revoke execute on function public.raid_open_round(uuid, integer) from public, anon, authenticated;
revoke execute on function public.raid_ally_squad() from public, anon, authenticated;
revoke execute on function public.raid_seat_ally(uuid) from public, anon, authenticated;
revoke execute on function public.raid_assert_free(uuid) from public, anon, authenticated;
revoke execute on function public.coop_guard_raid_room() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- What players read
-- ---------------------------------------------------------------------------

-- The Bosses a player may hunt, by Magnitude: name, text, district, Magnitude, moves, what a
-- win pays (the first win's coins and the XP), whether the player has beaten it; the room the
-- player is in.
create function public.get_raid()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_room uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.raid_close_stale();
  v_room := public.raid_open_room(v_uid);
  return jsonb_build_object(
    'min_players', public.config_int('raid.min_players'),
    'max_players', public.config_int('raid.max_players'),
    'room', (
      select jsonb_build_object('id', r.id, 'code', r.code, 'status', r.status, 'boss', b.code, 'name', b.name)
      from public.raid_rooms r join public.boss_definitions b on b.id = r.boss_id
      where r.id = v_room
    ),
    'bosses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', b.code,
        'name', b.name,
        'flavor', b.flavor,
        'scene', b.scene,
        'district', b.raid_district,
        'magnitude', b.raid_magnitude,
        'moves', to_jsonb(b.raid_moves),
        'first_win_coins', public.raid_percent(public.config_int('raid.first_win_coins'),
                                               public.config_int('raid.magnitude' || b.raid_magnitude || '.reward_percent')),
        'win_xp', public.raid_percent(public.config_int('raid.win_xp'),
                                      public.config_int('raid.magnitude' || b.raid_magnitude || '.reward_percent')),
        'beaten', exists (select 1 from public.raid_progress p where p.user_id = v_uid and p.boss_id = b.id)
      ) order by b.raid_magnitude, b.code)
      from public.boss_definitions b
      where b.is_active and b.raid_active
    ), '[]'::jsonb)
  );
end;
$$;

-- The moves of the rounds not reached yet that the team sees: the next one always; with a
-- Spia played (any of its variants), the two after the next. And the threats the team's
-- Veggente, Presagio and Oracolo show, as in the Operazioni (coop_foreseen), by round.
create function public.raid_foreseen(p_room uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_room public.raid_rooms;
  v_all integer;
  v_short integer;
  v_omen integer;
  v_top integer;
  v_spy integer;
begin
  select * into v_room from public.raid_rooms where id = p_room;
  if v_room.status is distinct from 'active' then
    return '{}'::jsonb;
  end if;
  select min(p.round) into v_all
  from public.raid_plays p join public.card_definitions d on d.id = p.definition_id
  where p.room_id = p_room and d.power_code = 'foresight';
  select max(p.round + coalesce((d.power_params ->> 'count')::integer, 0)) into v_short
  from public.raid_plays p join public.card_definitions d on d.id = p.definition_id
  where p.room_id = p_room and d.power_code = 'foresight_short';
  select max(p.round) into v_spy
  from public.raid_plays p join public.card_definitions d on d.id = p.definition_id
  where p.room_id = p_room and d.power_code in ('spy', 'spy_many', 'spy_rarest');
  if exists (
    select 1
    from public.raid_members m
    cross join lateral unnest(m.card_instance_ids, m.definition_ids) as u(id, def)
    join public.card_definitions d on d.id = u.def
    where m.room_id = p_room and d.power_code = 'omen'
      and not exists (select 1 from public.raid_plays p where p.room_id = p_room and p.card_instance_id = u.id and p.seat = m.seat)
  ) then
    v_omen := v_room.current_round + 1;
  end if;
  if exists (
    select 1
    from public.raid_members m
    cross join lateral unnest(m.definition_ids) as u(def)
    join public.card_definitions d on d.id = u.def
    where m.room_id = p_room and d.power_code = 'oracle'
  ) then
    v_top := (select max(l) from unnest(v_room.threat_levels) l);
  end if;

  return coalesce((
    select jsonb_object_agg(x.round::text, x.seen)
    from (
      select u.ord as round, jsonb_build_object(
        'move', case when u.ord = v_room.current_round + 1 or (v_spy is not null and u.ord <= v_spy + 3)
                       or (v_all is not null and u.ord > v_all) or (v_short is not null and u.ord <= v_short)
                     then v_room.moves[u.ord] end,
        'threat', case when (v_all is not null and u.ord > v_all) or (v_short is not null and u.ord <= v_short)
                         or u.ord = v_omen or t.level = v_top then jsonb_build_object(
          'name', t.name, 'level', t.level, 'abilities', to_jsonb(t.required_abilities)
        ) end,
        'seen_by', (
          select string_agg(distinct s.name, ' e ')
          from unnest(array[
            case when v_all is not null and u.ord > v_all then 'foresight' end,
            case when v_short is not null and u.ord <= v_short then 'foresight_short' end,
            case when u.ord = v_omen then 'omen' end,
            case when t.level = v_top then 'oracle' end,
            case when v_spy is not null and u.ord <= v_spy + 3 and u.ord > v_room.current_round + 1 then 'spy' end
          ]) as c(code)
          join public.power_definitions s on s.code = c.code
        )
      ) as seen
      from unnest(v_room.threat_ids) with ordinality as u(id, ord)
      join public.threat_definitions t on t.id = u.id
      where u.ord > v_room.current_round
    ) x
  ), '{}'::jsonb);
end;
$$;

revoke execute on function public.raid_foreseen(uuid) from public, anon, authenticated;

-- Everything a member may see of the room: the Boss and the copied numbers; every member with
-- the squad, the cards already played and the card of the round being played (nothing is
-- secret between allies); every round with its level and Attack; the threat and the move of
-- the rounds reached, the next move, and what the team's powers show of the others; every
-- resolved round with its plays. It also marks the member present.
create function public.raid_state(p_room uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.raid_rooms;
  v_players integer;
  v_foreseen jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_room from public.raid_rooms where id = p_room;
  if not found or not exists (select 1 from public.raid_members where room_id = p_room and user_id = v_uid) then
    raise exception 'raid_room_not_found';
  end if;
  update public.raid_members set last_seen_at = now() where room_id = p_room and user_id = v_uid and left_at is null;
  v_players := coalesce(v_room.players, greatest(
    (select count(*) from public.raid_members where room_id = p_room)::integer,
    public.config_int('raid.min_players')
  ));
  v_foreseen := public.raid_foreseen(p_room);

  return jsonb_build_object(
    'id', v_room.id,
    'code', v_room.code,
    'status', v_room.status,
    'players', v_players,
    'max_players', public.config_int('raid.max_players'),
    'current_round', v_room.current_round,
    'magnitude', v_room.magnitude,
    -- The screen's previews run the engine: it needs the numbers the room copied.
    'forza_percent', v_room.forza_percent,
    'vita_percent', v_room.vita_percent,
    'vita', v_room.vita,
    'vita_max', coalesce(v_room.vita_max, public.raid_vita_max(v_players, v_room.forza_percent, v_room.vita_percent)),
    'defenses', coalesce(v_room.defenses, public.config_int('raid.defenses')),
    'defenses_max', public.config_int('raid.defenses'),
    'server_now', now(),
    'me', v_uid,
    'host', v_room.host,
    'boss', (
      select jsonb_build_object(
        'code', b.code, 'name', b.name, 'flavor', b.flavor, 'scene', b.scene, 'district', b.raid_district,
        'moves', to_jsonb(b.raid_moves),
        'first_win_coins', public.raid_percent(public.config_int('raid.first_win_coins'), v_room.reward_percent),
        'win_xp', public.raid_percent(public.config_int('raid.win_xp'), v_room.reward_percent),
        'beaten', exists (select 1 from public.raid_progress p where p.user_id = v_uid and p.boss_id = b.id)
      )
      from public.boss_definitions b where b.id = v_room.boss_id
    ),
    'members', (
      select jsonb_agg(jsonb_build_object(
        'user_id', m.user_id,
        'seat', m.seat,
        'bot', m.user_id is null,
        'username', coalesce(pr.username, m.bot_name),
        'avatar_url', coalesce(pr.avatar_url, (select d.art_url from public.card_definitions d where d.id = m.bot_avatar_definition_id)),
        'level', pr.level,
        'ready', m.ready,
        'left', m.left_at is not null,
        'last_seen_at', m.last_seen_at,
        'signal', case when m.signal_at > now() - interval '10 seconds' then m.signal end,
        'signal_at', m.signal_at,
        'squad', case when m.card_instance_ids is null then null else (
          select jsonb_agg(public.card_payload(u.def, u.id) || jsonb_build_object('instance_id', u.id) order by u.ord)
          from unnest(m.card_instance_ids, m.definition_ids) with ordinality as u(id, def, ord)
        ) end,
        'used', coalesce((
          select jsonb_agg(p.card_instance_id) from public.raid_plays p where p.room_id = p_room and p.seat = m.seat
        ), '[]'::jsonb),
        'placement', case when m.placed_round = v_room.current_round then m.placement end,
        'xp', m.xp,
        'coins', m.coins
      ) order by m.seat)
      from public.raid_members m
      left join public.profiles pr on pr.id = m.user_id
      where m.room_id = p_room
    ),
    'all_ready', v_room.status = 'active' and not exists (
      select 1 from public.raid_members m
      where m.room_id = p_room and m.left_at is null and m.user_id is not null
        and not (m.ready and m.placed_round = v_room.current_round)
    ),
    'rounds', (
      select jsonb_agg(jsonb_build_object(
        'round', u.ord,
        'level', v_room.threat_levels[u.ord],
        'attack', public.raid_attack(v_room.threat_levels[u.ord], v_players, v_room.forza_percent),
        'deadline_at', c.deadline_at,
        'move', case when c.room_id is not null then c.move else v_foreseen -> u.ord::text ->> 'move' end,
        'threat', case when c.room_id is not null then (
          select jsonb_build_object('name', t.name, 'level', t.level, 'abilities', to_jsonb(t.required_abilities),
                                    'flavor', t.flavor, 'district', t.district)
          from public.threat_definitions t where t.id = c.threat_id
        ) end,
        'foreseen', case when c.room_id is null then v_foreseen -> u.ord::text -> 'threat' end,
        'seen_by', case when c.room_id is null then v_foreseen -> u.ord::text ->> 'seen_by' end,
        'resolved', c.resolved_at is not null,
        'result', case when c.resolved_at is null then null else jsonb_build_object(
          'total', c.total, 'effective_attack', c.effective_attack, 'required', c.required, 'held', c.held,
          'cancelled', c.cancelled, 'damage', c.damage, 'defenses_lost', c.defenses_lost, 'healed', c.healed,
          'vita', c.vita, 'defenses', c.defenses
        ) end,
        'plays', case when c.resolved_at is null then null else (
          select jsonb_agg(jsonb_build_object(
            'user_id', p.user_id, 'seat', p.seat, 'instance_id', p.card_instance_id, 'definition_id', p.definition_id,
            'base', p.base_score, 'bonus', p.bonus, 'score', p.score, 'counted', p.counted, 'highest', p.highest_value,
            'auto_played', p.auto_played, 'parts', p.parts
          ) order by p.seat)
          from public.raid_plays p where p.room_id = p_room and p.round = c.round
        ) end
      ) order by u.ord)
      from unnest(v_room.threat_ids) with ordinality as u(id, ord)
      left join public.raid_rounds c on c.room_id = p_room and c.round = u.ord
    )
  );
end;
$$;

revoke execute on function public.get_raid() from public, anon;
revoke execute on function public.raid_state(uuid) from public, anon;
grant execute on function public.get_raid() to authenticated;
grant execute on function public.raid_state(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The room: open, join, leave, squad, ready, allies, start, the card, signals
-- ---------------------------------------------------------------------------

-- Opens a room on a Boss: the code, the threats and the moves drawn, the Magnitude copied.
create function public.raid_create_room(p_boss text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_boss public.boss_definitions;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_threats uuid[];
  v_room uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform 1 from public.profiles where id = v_uid for update;
  perform public.raid_close_stale();
  perform public.coop_close_stale();
  perform public.raid_assert_free(v_uid);
  select * into v_boss from public.boss_definitions where code = p_boss and is_active and raid_active;
  if not found then
    raise exception 'raid_boss_not_found';
  end if;
  v_threats := public.raid_draw_threats(v_boss.id);

  perform pg_advisory_xact_lock(hashtext('o-mega.raid-codes'));
  loop
    v_code := (
      select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1), '')
      from generate_series(1, 6)
    );
    exit when not exists (select 1 from public.raid_rooms where code = v_code and status = 'lobby');
  end loop;

  insert into public.raid_rooms (
    code, boss_id, host, magnitude, forza_percent, vita_percent, reward_percent, threat_ids, threat_levels, moves
  ) values (
    v_code, v_boss.id, v_uid, v_boss.raid_magnitude,
    public.config_int('raid.magnitude' || v_boss.raid_magnitude || '.forza_percent'),
    v_boss.raid_vita_percent,
    public.config_int('raid.magnitude' || v_boss.raid_magnitude || '.reward_percent'),
    v_threats,
    (select array_agg(t.level order by u.ord) from unnest(v_threats) with ordinality as u(id, ord)
     join public.threat_definitions t on t.id = u.id),
    public.raid_draw_moves(v_boss.id)
  ) returning id into v_room;
  insert into public.raid_members (room_id, user_id, seat) values (v_room, v_uid, 1);
  return jsonb_build_object('id', v_room, 'code', v_code);
end;
$$;

create function public.raid_join_room(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.raid_rooms;
  v_seat integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform 1 from public.profiles where id = v_uid for update;
  perform public.raid_close_stale();
  select * into v_room from public.raid_rooms where code = upper(trim(p_code)) and status = 'lobby' for update;
  if not found then
    raise exception 'raid_room_not_found';
  end if;
  if exists (select 1 from public.raid_members where room_id = v_room.id and user_id = v_uid) then
    return jsonb_build_object('id', v_room.id, 'code', v_room.code);
  end if;
  perform public.coop_close_stale();
  perform public.raid_assert_free(v_uid);
  if (select count(*) from public.raid_members where room_id = v_room.id) >= public.config_int('raid.max_players') then
    raise exception 'coop_room_full';
  end if;
  select min(s) into v_seat from generate_series(1, 4) as s
  where not exists (select 1 from public.raid_members where room_id = v_room.id and seat = s);

  insert into public.raid_members (room_id, user_id, seat) values (v_room.id, v_uid, v_seat);
  update public.raid_rooms set touched_at = now() where id = v_room.id;
  perform public.raid_notify(v_room.id, 'joined');
  return jsonb_build_object('id', v_room.id, 'code', v_room.code);
end;
$$;

-- Before the start a member just goes (the host closes the room); during the hunt the member
-- stays out and the server plays the cards; once over, nothing changes. Without any person
-- left the hunt is lost.
create function public.raid_leave_room(p_room uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.raid_rooms;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_room from public.raid_rooms where id = p_room for update;
  if not found or not exists (select 1 from public.raid_members where room_id = p_room and user_id = v_uid) then
    raise exception 'raid_room_not_found';
  end if;
  if v_room.status = 'lobby' then
    if v_room.host = v_uid then
      update public.raid_rooms set status = 'closed', finished_at = now() where id = p_room;
    else
      delete from public.raid_members where room_id = p_room and user_id = v_uid;
      update public.raid_rooms set touched_at = now() where id = p_room;
    end if;
  elsif v_room.status = 'active' then
    update public.raid_members set left_at = now(), ready = false
    where room_id = p_room and user_id = v_uid and left_at is null;
    if not exists (select 1 from public.raid_members where room_id = p_room and left_at is null and user_id is not null) then
      update public.raid_rooms set status = 'lost', finished_at = now() where id = p_room;
    end if;
  end if;
  perform public.raid_notify(p_room, 'left');
end;
$$;

-- The member's squad: raid.squad_size owned cards of as many different characters. Choosing it
-- again clears Pronto.
create function public.raid_set_squad(p_room uuid, p_card_instance_ids uuid[])
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_size integer := public.config_int('raid.squad_size');
  v_definitions uuid[];
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform 1 from public.raid_rooms where id = p_room and status = 'lobby' for update;
  if not found or not exists (select 1 from public.raid_members where room_id = p_room and user_id = v_uid) then
    raise exception 'raid_room_not_found';
  end if;
  if coalesce(cardinality(p_card_instance_ids), 0) <> v_size then
    raise exception 'invalid_team_size' using errcode = '22023';
  end if;
  if (select count(distinct u.id) from unnest(p_card_instance_ids) as u(id)) <> v_size then
    raise exception 'duplicate_card' using errcode = '22023';
  end if;
  select array_agg(i.definition_id order by u.ord) into v_definitions
  from unnest(p_card_instance_ids) with ordinality as u(id, ord)
  join public.card_instances i on i.id = u.id and i.owner_id = v_uid;
  if coalesce(cardinality(v_definitions), 0) <> v_size then
    raise exception 'card_not_owned' using errcode = '22023';
  end if;
  if (select count(distinct d.id) from unnest(v_definitions) as d(id)) <> v_size then
    raise exception 'duplicate_character' using errcode = '22023';
  end if;

  update public.raid_members
  set card_instance_ids = p_card_instance_ids, definition_ids = v_definitions, ready = false
  where room_id = p_room and user_id = v_uid;
  update public.raid_rooms set touched_at = now() where id = p_room;
  perform public.raid_notify(p_room, 'squad');
end;
$$;

create function public.raid_set_ready(p_room uuid, p_ready boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform 1 from public.raid_rooms where id = p_room and status = 'lobby' for update;
  if not found or not exists (select 1 from public.raid_members where room_id = p_room and user_id = v_uid) then
    raise exception 'raid_room_not_found';
  end if;
  if p_ready and exists (
    select 1 from public.raid_members where room_id = p_room and user_id = v_uid and card_instance_ids is null
  ) then
    raise exception 'coop_squad_missing';
  end if;
  update public.raid_members set ready = p_ready where room_id = p_room and user_id = v_uid;
  update public.raid_rooms set touched_at = now() where id = p_room;
  perform public.raid_notify(p_room, 'ready');
end;
$$;

-- The host adds a server ally to a waiting room, or takes one away.
create function public.raid_add_ally(p_room uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.raid_rooms;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_room from public.raid_rooms where id = p_room for update;
  if not found or not exists (select 1 from public.raid_members where room_id = p_room and user_id = v_uid) then
    raise exception 'raid_room_not_found';
  end if;
  if v_room.status <> 'lobby' then
    raise exception 'coop_already_started';
  end if;
  if v_room.host <> v_uid then
    raise exception 'coop_not_host';
  end if;
  if public.raid_seat_ally(p_room) is null then
    raise exception 'coop_room_full';
  end if;
  update public.raid_rooms set touched_at = now() where id = p_room;
  perform public.raid_notify(p_room, 'ally');
end;
$$;

create function public.raid_remove_ally(p_room uuid, p_seat integer)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.raid_rooms;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_room from public.raid_rooms where id = p_room for update;
  if not found or not exists (select 1 from public.raid_members where room_id = p_room and user_id = v_uid) then
    raise exception 'raid_room_not_found';
  end if;
  if v_room.status <> 'lobby' then
    raise exception 'coop_already_started';
  end if;
  if v_room.host <> v_uid then
    raise exception 'coop_not_host';
  end if;
  delete from public.raid_members where room_id = p_room and seat = p_seat and user_id is null;
  update public.raid_rooms set touched_at = now() where id = p_room;
  perform public.raid_notify(p_room, 'ally');
end;
$$;

-- The host starts once everyone is ready, with enough players (allies included): the Boss's
-- Life follows the players, the Defences are full, round 1 opens.
create function public.raid_start(p_room uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.raid_rooms;
  v_count integer;
  v_vita integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_room from public.raid_rooms where id = p_room for update;
  if not found or not exists (select 1 from public.raid_members where room_id = p_room and user_id = v_uid) then
    raise exception 'raid_room_not_found';
  end if;
  if v_room.status <> 'lobby' then
    raise exception 'coop_already_started';
  end if;
  if v_room.host <> v_uid then
    raise exception 'coop_not_host';
  end if;
  select count(*) into v_count from public.raid_members where room_id = p_room;
  if v_count < public.config_int('raid.min_players') then
    raise exception 'coop_too_few_players';
  end if;
  if exists (select 1 from public.raid_members where room_id = p_room and (not ready or card_instance_ids is null)) then
    raise exception 'coop_not_ready';
  end if;
  if exists (select 1 from public.raid_members m where m.room_id = p_room and m.user_id is not null and public.has_active_match(m.user_id)) then
    raise exception 'match_already_active';
  end if;

  v_vita := public.raid_vita_max(v_count, v_room.forza_percent, v_room.vita_percent);
  update public.raid_rooms
  set status = 'active', players = v_count, started_at = now(), vita_max = v_vita, vita = v_vita,
      defenses = public.config_int('raid.defenses')
  where id = p_room;
  perform public.raid_open_round(p_room, 1);
  perform public.raid_notify(p_room, 'started');
end;
$$;

-- The card a member puts down this round, seen at once by the allies; p_ready says Pronto.
-- A new card takes Pronto away unless it says it again. Null takes the card back.
create function public.raid_place(p_room uuid, p_round integer, p_card uuid, p_ready boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.raid_rooms;
  v_member public.raid_members;
  v_round public.raid_rounds;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_room from public.raid_rooms where id = p_room for update;
  select * into v_member from public.raid_members where room_id = p_room and user_id = v_uid;
  if v_room.id is null or v_member.room_id is null then
    raise exception 'raid_room_not_found';
  end if;
  if v_room.status <> 'active' or v_member.left_at is not null then
    raise exception 'match_not_active';
  end if;
  select * into v_round from public.raid_rounds where room_id = p_room and round = p_round;
  if p_round <> v_room.current_round or v_round.resolved_at is not null then
    raise exception 'round_already_resolved';
  end if;
  if now() > v_round.deadline_at + make_interval(secs => public.config_int('match.timeout_grace_seconds')) then
    raise exception 'round_expired';
  end if;

  if p_card is null then
    if p_ready then
      raise exception 'invalid_placement';
    end if;
    update public.raid_members set placement = null, placed_round = null, ready = false
    where room_id = p_room and user_id = v_uid;
  else
    -- A card of the member's squad, not played before.
    if not (p_card = any (v_member.card_instance_ids))
       or exists (select 1 from public.raid_plays p where p.room_id = p_room and p.seat = v_member.seat and p.card_instance_id = p_card) then
      raise exception 'invalid_placement';
    end if;
    update public.raid_members set placement = p_card, placed_round = p_round, ready = coalesce(p_ready, false)
    where room_id = p_room and user_id = v_uid;
  end if;
  update public.raid_rooms set touched_at = now() where id = p_room;
  perform public.raid_notify(p_room, 'placed');
  return public.raid_state(p_room);
end;
$$;

create function public.raid_signal(p_room uuid, p_signal text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_signal not in ('hold', 'push', 'help', 'ready') then
    raise exception 'invalid_request';
  end if;
  update public.raid_members set signal = p_signal, signal_at = now()
  where room_id = p_room and user_id = v_uid and left_at is null
    and exists (select 1 from public.raid_rooms r where r.id = p_room and r.status in ('lobby', 'active'));
  if not found then
    raise exception 'raid_room_not_found';
  end if;
  perform public.raid_notify(p_room, 'signal');
end;
$$;

revoke execute on function public.raid_create_room(text) from public, anon;
revoke execute on function public.raid_join_room(text) from public, anon;
revoke execute on function public.raid_leave_room(uuid) from public, anon;
revoke execute on function public.raid_set_squad(uuid, uuid[]) from public, anon;
revoke execute on function public.raid_set_ready(uuid, boolean) from public, anon;
revoke execute on function public.raid_add_ally(uuid) from public, anon;
revoke execute on function public.raid_remove_ally(uuid, integer) from public, anon;
revoke execute on function public.raid_start(uuid) from public, anon;
revoke execute on function public.raid_place(uuid, integer, uuid, boolean) from public, anon;
revoke execute on function public.raid_signal(uuid, text) from public, anon;
grant execute on function public.raid_create_room(text) to authenticated;
grant execute on function public.raid_join_room(text) to authenticated;
grant execute on function public.raid_leave_room(uuid) to authenticated;
grant execute on function public.raid_set_squad(uuid, uuid[]) to authenticated;
grant execute on function public.raid_set_ready(uuid, boolean) to authenticated;
grant execute on function public.raid_add_ally(uuid) to authenticated;
grant execute on function public.raid_remove_ally(uuid, integer) to authenticated;
grant execute on function public.raid_start(uuid) to authenticated;
grant execute on function public.raid_place(uuid, integer, uuid, boolean) to authenticated;
grant execute on function public.raid_signal(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Service-only: what the Edge Function needs to score a round, and the record
-- ---------------------------------------------------------------------------

-- The room as the engine needs it: members in seat order (named as the engine names them,
-- coop_member_key) with their squads and cards, the threats, the moves, the copied numbers,
-- every resolved round. `ready`: every person still in has said Pronto with a card.
create function public.raid_round_context(p_user uuid, p_room uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'room', jsonb_build_object(
      'id', r.id, 'status', r.status, 'players', r.players, 'current_round', r.current_round,
      'forza_percent', r.forza_percent, 'vita_percent', r.vita_percent
    ),
    'member', exists (select 1 from public.raid_members m where m.room_id = r.id and m.user_id = p_user),
    'deadline_at', (select c.deadline_at from public.raid_rounds c where c.room_id = r.id and c.round = r.current_round),
    'ready', not exists (
      select 1 from public.raid_members m
      where m.room_id = r.id and m.left_at is null and m.user_id is not null
        and not (m.ready and m.placed_round = r.current_round)
    ),
    'members', (
      select jsonb_agg(jsonb_build_object(
        'key', public.coop_member_key(m.user_id, m.seat),
        'card_instance_ids', to_jsonb(m.card_instance_ids),
        'definition_ids', to_jsonb(m.definition_ids),
        'placement', case when m.placed_round = r.current_round and m.user_id is not null then m.placement end
      ) order by m.seat)
      from public.raid_members m where m.room_id = r.id
    ),
    'threat_ids', to_jsonb(r.threat_ids),
    'moves', to_jsonb(r.moves),
    'records', coalesce((
      select jsonb_agg(jsonb_build_object(
        'round', c.round, 'move', c.move, 'cancelled', c.cancelled, 'attack', c.attack,
        'effectiveAttack', c.effective_attack, 'required', c.required, 'total', c.total, 'held', c.held,
        'damage', c.damage, 'defensesLost', c.defenses_lost, 'healed', c.healed, 'vita', c.vita, 'defenses', c.defenses,
        'plays', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'player', public.coop_member_key(p.user_id, p.seat), 'characterId', p.card_instance_id,
            'base', p.base_score, 'bonus', p.bonus, 'total', p.score, 'counted', p.counted, 'highest', p.highest_value,
            'autoPlayed', p.auto_played, 'parts', p.parts
          ) order by p.seat), '[]'::jsonb)
          from public.raid_plays p where p.room_id = r.id and p.round = c.round
        )
      ) order by c.round)
      from public.raid_rounds c where c.room_id = r.id and c.resolved_at is not null
    ), '[]'::jsonb)
  )
  from public.raid_rooms r
  where r.id = p_room
$$;

-- Stores a round the engine resolved, after checking it: the round and the time (everyone
-- ready, or the deadline past); one card per member, of the squad, not played before; a
-- person's card as placed, the server's own only for who placed none (and every ally); what
-- each card added (its score, or half of the highest under a Bersaglio not cancelled); the
-- sum; the Attack; Sabotatore and Implacabile only lowering it; the move cancelled exactly
-- when an Annullatore was played on a move against the team. The damage, the Defences, the
-- Life given back, the Life and the end it works out itself, and checks the engine agrees.
-- Then the next round, or the end with its prizes.
create function public.raid_record_round(p_room uuid, p_round integer, p_record jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_room public.raid_rooms;
  v_round public.raid_rounds;
  v_member public.raid_members;
  v_ready boolean;
  v_play jsonb;
  v_plays jsonb := p_record -> 'plays';
  v_key text;
  v_total integer;
  v_top integer;
  v_halved integer;
  v_effective integer := (p_record ->> 'effectiveAttack')::integer;
  v_required integer := (p_record ->> 'required')::integer;
  v_cancelled boolean;
  v_hostile boolean;
  v_held boolean;
  v_damage integer;
  v_lost integer;
  v_healed integer;
  v_vita integer;
  v_defenses integer;
  v_status text;
  v_reward integer;
  v_xp integer;
  v_coins integer;
  v_chosen integer;
  v_played integer;
begin
  select * into v_room from public.raid_rooms where id = p_room for update;
  if not found or v_room.status <> 'active' then
    raise exception 'match_not_active';
  end if;
  select * into v_round from public.raid_rounds where room_id = p_room and round = p_round;
  if p_round <> v_room.current_round or v_round.resolved_at is not null then
    raise exception 'round_already_resolved';
  end if;
  v_ready := not exists (
    select 1 from public.raid_members m
    where m.room_id = p_room and m.left_at is null and m.user_id is not null
      and not (m.ready and m.placed_round = p_round)
  );
  if not v_ready and now() <= v_round.deadline_at + make_interval(secs => public.config_int('match.timeout_grace_seconds')) then
    raise exception 'round_not_expired';
  end if;

  -- One card per member: of the squad, not played before; as placed, or the server's.
  if coalesce(jsonb_typeof(v_plays), '') <> 'array'
     or jsonb_array_length(v_plays) <> (select count(*) from public.raid_members where room_id = p_room) then
    raise exception 'raid_invalid_round';
  end if;
  for v_member in select * from public.raid_members where room_id = p_room order by seat loop
    v_key := public.coop_member_key(v_member.user_id, v_member.seat);
    select e into v_play from jsonb_array_elements(v_plays) e where e ->> 'player' = v_key;
    if v_play is null
       or (select count(*) from jsonb_array_elements(v_plays) e where e ->> 'player' = v_key) <> 1
       or not ((v_play ->> 'characterId')::uuid = any (v_member.card_instance_ids))
       or exists (select 1 from public.raid_plays p
                  where p.room_id = p_room and p.seat = v_member.seat and p.card_instance_id = (v_play ->> 'characterId')::uuid) then
      raise exception 'raid_invalid_round';
    end if;
    if v_member.user_id is not null and v_member.placed_round = p_round and v_member.placement is not null then
      if (v_play ->> 'characterId')::uuid <> v_member.placement or (v_play ->> 'autoPlayed')::boolean then
        raise exception 'coop_placement_changed';
      end if;
    elsif not (v_play ->> 'autoPlayed')::boolean then
      raise exception 'raid_invalid_round';
    end if;
    if (v_play ->> 'total')::integer < 0 or (v_play ->> 'counted')::integer < 0 then
      raise exception 'raid_invalid_round';
    end if;
  end loop;

  -- The move: cancelled exactly when an Annullatore of the team was played on a move against it.
  v_hostile := v_round.move in ('heavy', 'armor', 'regen', 'target');
  v_cancelled := v_hostile and exists (
    select 1
    from jsonb_array_elements(v_plays) e
    join public.raid_members m on m.room_id = p_room and public.coop_member_key(m.user_id, m.seat) = e ->> 'player'
    join public.card_definitions d on d.id = m.definition_ids[array_position(m.card_instance_ids, (e ->> 'characterId')::uuid)]
    where d.power_code in ('nullifier', 'delayed_nullifier')
  );
  if coalesce((p_record ->> 'cancelled')::boolean, false) <> v_cancelled then
    raise exception 'raid_invalid_round';
  end if;

  -- What each card added: its score; under a Bersaglio not cancelled, half of one of the highest
  -- (nothing changes when the highest is 0).
  select max((e ->> 'total')::integer) into v_top from jsonb_array_elements(v_plays) e;
  select count(*) into v_halved from jsonb_array_elements(v_plays) e where (e ->> 'counted')::integer <> (e ->> 'total')::integer;
  if exists (
    select 1 from jsonb_array_elements(v_plays) e
    where (e ->> 'counted')::integer <> (e ->> 'total')::integer
      and not ((e ->> 'counted')::integer = (e ->> 'total')::integer / 2 and (e ->> 'total')::integer = v_top)
  ) or v_halved <> (case when v_round.move = 'target' and not v_cancelled and v_top > 0 then 1 else 0 end) then
    raise exception 'raid_invalid_round';
  end if;
  select sum((e ->> 'counted')::integer) into v_total from jsonb_array_elements(v_plays) e;
  if (p_record ->> 'total')::integer is distinct from v_total or (p_record ->> 'attack')::integer is distinct from v_round.attack then
    raise exception 'raid_invalid_round';
  end if;
  -- Sabotatore and Implacabile only lower what the team needs.
  if v_effective is null or v_required is null or v_effective < 0 or v_effective > v_round.attack
     or v_required < 0 or v_required > v_effective then
    raise exception 'raid_invalid_round';
  end if;

  -- The rest follows from the totals.
  v_held := v_total >= v_required;
  v_damage := case when v_held then greatest(0, v_total - v_effective) else 0 end;
  if v_round.move = 'armor' and not v_cancelled then
    v_damage := v_damage / 2;
  elsif v_round.move = 'exposed' then
    v_damage := v_damage * 2;
  end if;
  v_lost := case when v_held then 0 when v_round.move = 'heavy' and not v_cancelled then public.config_int('raid.heavy_defenses') else 1 end;
  v_healed := case when v_round.move = 'regen' and not v_cancelled and v_damage = 0
                   then least((v_room.vita_max * public.config_int('raid.regen_percent') + 99) / 100, v_room.vita_max - v_room.vita)
                   else 0 end;
  v_vita := greatest(0, v_room.vita - v_damage + v_healed);
  v_defenses := greatest(0, v_room.defenses - v_lost);
  if (p_record ->> 'held')::boolean is distinct from v_held or (p_record ->> 'damage')::integer is distinct from v_damage
     or (p_record ->> 'defensesLost')::integer is distinct from v_lost or (p_record ->> 'healed')::integer is distinct from v_healed
     or (p_record ->> 'vita')::integer is distinct from v_vita or (p_record ->> 'defenses')::integer is distinct from v_defenses then
    raise exception 'raid_invalid_round';
  end if;

  -- Store the round.
  for v_play in select e from jsonb_array_elements(v_plays) e loop
    select * into v_member from public.raid_members m
    where m.room_id = p_room and public.coop_member_key(m.user_id, m.seat) = v_play ->> 'player';
    insert into public.raid_plays (
      room_id, round, seat, user_id, card_instance_id, definition_id,
      base_score, bonus, score, counted, highest_value, auto_played, parts
    ) values (
      p_room, p_round, v_member.seat, v_member.user_id, (v_play ->> 'characterId')::uuid,
      v_member.definition_ids[array_position(v_member.card_instance_ids, (v_play ->> 'characterId')::uuid)],
      (v_play ->> 'base')::integer, (v_play ->> 'bonus')::integer, (v_play ->> 'total')::integer,
      (v_play ->> 'counted')::integer, (v_play ->> 'highest')::integer, (v_play ->> 'autoPlayed')::boolean, v_play -> 'parts'
    );
  end loop;
  update public.raid_rounds
  set total = v_total, effective_attack = v_effective, required = v_required, held = v_held, cancelled = v_cancelled,
      damage = v_damage, defenses_lost = v_lost, healed = v_healed, vita = v_vita, defenses = v_defenses, resolved_at = now()
  where room_id = p_room and round = p_round;
  update public.raid_rooms set vita = v_vita, defenses = v_defenses, touched_at = now() where id = p_room
  returning * into v_room;

  -- Next round, or the end.
  if v_vita <= 0 then
    v_status := 'won';
  elsif v_defenses <= 0 or p_round >= cardinality(v_room.threat_ids) then
    v_status := 'lost';
  end if;

  if v_status is null then
    perform public.raid_open_round(p_room, p_round + 1);
  else
    update public.raid_rooms set status = v_status, finished_at = now() where id = p_room;
    -- Prizes for the people still in who chose at least raid.self_chosen_percent of their cards:
    -- XP always (a win's grows with the Magnitude); the coins of a first win on this Boss.
    v_reward := v_room.reward_percent;
    for v_member in select * from public.raid_members where room_id = p_room and left_at is null and user_id is not null loop
      select count(*), count(*) filter (where not auto_played) into v_played, v_chosen
      from public.raid_plays where room_id = p_room and seat = v_member.seat;
      if v_chosen * 100 < v_played * public.config_int('raid.self_chosen_percent') then
        update public.raid_members set xp = 0, coins = 0 where room_id = p_room and seat = v_member.seat;
        continue;
      end if;
      v_coins := 0;
      v_xp := case when v_status = 'won' then public.raid_percent(public.config_int('raid.win_xp'), v_reward)
                   else public.config_int('raid.loss_xp') end;
      if v_status = 'won' then
        insert into public.raid_progress (user_id, boss_id, room_id)
        values (v_member.user_id, v_room.boss_id, p_room)
        on conflict do nothing;
        if found then
          v_coins := public.raid_percent(public.config_int('raid.first_win_coins'), v_reward);
          if v_coins > 0 then
            insert into public.coin_ledger (user_id, amount, reason, ref_id)
            values (v_member.user_id, v_coins, 'raid_reward', p_room);
          end if;
        end if;
      end if;
      if v_xp > 0 then
        update public.profiles
        set xp = xp + v_xp, level = public.level_for_xp(xp + v_xp), updated_at = now()
        where id = v_member.user_id;
        perform public.grant_level_rewards(v_member.user_id, null);
        update public.profiles set conquest_unlocked = true
        where id = v_member.user_id and not conquest_unlocked and level >= public.config_int('conquest.unlock_at_level');
      end if;
      update public.raid_members set xp = v_xp, coins = v_coins where room_id = p_room and seat = v_member.seat;
    end loop;
  end if;
  perform public.raid_notify(p_room, 'round');
  return jsonb_build_object('status', coalesce(v_status, 'active'), 'round', p_round);
end;
$$;

revoke execute on function public.raid_round_context(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.raid_record_round(uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.raid_round_context(uuid, uuid) to service_role;
grant execute on function public.raid_record_round(uuid, integer, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- When the mode is open (EDITOR → Modalità di gioco): a new key, closed until an admin opens it
-- ---------------------------------------------------------------------------

alter table public.mode_availability drop constraint mode_availability_key_check;
alter table public.mode_availability add constraint mode_availability_key_check check (key in (
  'classic', 'boss', 'triple', 'quadrant', 'quadrant_shifting',
  'ranked', 'conquest', 'story', 'emergency', 'emergency_week', 'coop', 'raid'
));
insert into public.mode_availability (key, state, label) values ('raid', 'off', 'Prossimamente');

-- As in 20261122200000_mode_availability.sql, with the hunts' rooms.
create or replace function public.guard_mode_start()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  case tg_table_name
    when 'matches' then
      perform public.assert_modes_open(public.mode_keys_for(new.format, new.mode, new.story_mission_id is not null));
    when 'matchmaking_queue', 'match_lobbies' then
      perform public.assert_modes_open(public.mode_keys_for(new.format, new.mode, false));
    when 'challenge_queue' then
      perform public.assert_modes_open(public.mode_keys_for(new.format, null, false));
    when 'emergency_runs', 'challenge_emergency_runs' then
      perform public.assert_modes_open(array['emergency']);
    when 'emergency_week_runs' then
      perform public.assert_modes_open(array['emergency_week']);
    when 'coop_queue' then
      perform public.assert_modes_open(array['coop']);
    when 'coop_rooms' then
      -- A room opened, or a room that starts playing (coop_start, the public queue).
      if tg_op = 'INSERT' or (new.status = 'active' and old.status is distinct from 'active') then
        perform public.assert_modes_open(array['coop']);
      end if;
    when 'raid_rooms' then
      -- A hunt's room opened, or one that starts.
      if tg_op = 'INSERT' or (new.status = 'active' and old.status is distinct from 'active') then
        perform public.assert_modes_open(array['raid']);
      end if;
  end case;
  return new;
end;
$$;

create trigger raid_rooms_mode_open before insert or update of status on public.raid_rooms
  for each row execute function public.guard_mode_start();
