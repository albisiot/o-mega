-- Operazioni (SPEC §5.17), first stage: a cooperative mode for 2 players (up to 4 in the
-- rules), live and timed, written by hand like the Story. A room with a friend code, a
-- squad of 6 each, four city rounds with one threat more than the players (one of them
-- reinforced by the rival's Eco), the Panic of the threats nobody stops, then the Boss.
-- The Edge Function scores every round with the engine (packages/game-engine/src/coop.ts);
-- coop_record_round re-checks the cards, the leads, the targets, the Panic and the end.
-- Clients read only through coop_state and get_coop; every write is a function.

-- ---------------------------------------------------------------------------
-- Configuration (balance.ts `coop`)
-- ---------------------------------------------------------------------------

insert into public.game_config (key, value, description) values
  ('coop.city_rounds', '4', 'Operazioni: rounds in the city before the Boss'),
  ('coop.squad_size', '6', 'Operazioni: characters each player brings'),
  ('coop.boss_cards', '2', 'Operazioni: cards each player puts on the Boss'),
  ('coop.min_players', '2', 'Operazioni: players needed to start'),
  ('coop.max_players', '2', 'Operazioni: most players in a room (4 from the second stage)'),
  ('coop.targets.level1', '7', 'Operazioni: score that stops a level 1 threat in the city'),
  ('coop.targets.level2', '13', 'Operazioni: score that stops a level 2 threat in the city'),
  ('coop.targets.level3', '18', 'Operazioni: score that stops a level 3 threat in the city'),
  ('coop.targets.level4', '23', 'Operazioni: score that stops a level 4 threat in the city'),
  ('coop.targets.level5', '28', 'Operazioni: score that stops a level 5 threat in the city'),
  ('coop.targets.level6', '32', 'Operazioni: score that stops a level 6 threat in the city'),
  ('coop.boss_targets.level1', '9', 'Operazioni: score that breaks a level 1 front of the Boss'),
  ('coop.boss_targets.level2', '15', 'Operazioni: score that breaks a level 2 front of the Boss'),
  ('coop.boss_targets.level3', '20', 'Operazioni: score that breaks a level 3 front of the Boss'),
  ('coop.boss_targets.level4', '25', 'Operazioni: score that breaks a level 4 front of the Boss'),
  ('coop.boss_targets.level5', '30', 'Operazioni: score that breaks a level 5 front of the Boss'),
  ('coop.boss_targets.level6', '34', 'Operazioni: score that breaks a level 6 front of the Boss'),
  ('coop.panic_limit', '12', 'Operazioni: Panic that fails the operation'),
  ('coop.panic_low', '1', 'Operazioni: Panic of a threat nobody stopped, below panic_high_from_level'),
  ('coop.panic_high', '2', 'Operazioni: Panic of a threat nobody stopped, from panic_high_from_level'),
  ('coop.panic_high_from_level', '4', 'Operazioni: level from which a threat nobody stopped adds panic_high'),
  ('coop.panic_reinforced', '1', 'Operazioni: more Panic when the threat nobody stopped was the rival''s'),
  ('coop.round_seconds', '45', 'Operazioni: time to place the cards of a city round'),
  ('coop.boss_round_seconds', '60', 'Operazioni: time to place the cards of the Boss round'),
  ('coop.reveal_pause_seconds', '20', 'Operazioni: time to read a round''s result before the next timer'),
  ('coop.lobby_minutes', '30', 'Operazioni: a room nobody touches for this long closes'),
  ('coop.win_xp', '30', 'Operazioni: XP to every player of a won operation'),
  ('coop.loss_xp', '10', 'Operazioni: XP to every player of a lost operation');

-- New reasons: the coins of an operation's first win, its prize card.
alter table public.coin_ledger drop constraint coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in (
  'pack_purchase', 'match_reward', 'bot_match_reward', 'duplicate_conversion', 'conquest_bonus', 'level_reward',
  'emergency_reward', 'bonus_code', 'story_reward', 'story_star', 'event_reward', 'objective_reward', 'achievement_reward',
  'emergency_prize', 'ranked_prize', 'emergency_week_reward', 'emergency_week_prize', 'admin_adjustment', 'challenge_reward',
  'coop_reward'
));
alter table public.card_instances drop constraint card_instances_acquired_via_check;
alter table public.card_instances add constraint card_instances_acquired_via_check check (acquired_via in (
  'starter', 'pack', 'conquest', 'trade', 'level_unlock', 'bonus_code', 'story', 'event', 'objective', 'achievement',
  'challenge', 'shards', 'coop'
));
alter table public.card_transfers drop constraint card_transfers_reason_check;
alter table public.card_transfers add constraint card_transfers_reason_check check (reason in (
  'starter', 'pack', 'conquest', 'trade', 'conversion', 'level_unlock', 'bonus_code', 'story', 'event', 'objective',
  'achievement', 'challenge', 'shards', 'shard_break', 'coop'
));

-- ---------------------------------------------------------------------------
-- The catalog: chapters, operations and their rounds (written by hand)
-- ---------------------------------------------------------------------------

create table public.coop_chapters (
  chapter integer primary key check (chapter >= 1),
  title text not null,
  intro text not null,
  outro text not null
);

create table public.coop_operations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^O[0-9]+M[0-9]+$'),
  chapter integer not null references public.coop_chapters (chapter),
  ord integer not null check (ord >= 1),
  title text not null,
  intro text not null,
  outro text not null,
  -- Who the team faces: the rival Reggente (with its five Echi, one per round) and the Boss.
  rival_name text not null,
  rival_definition_ids uuid[] not null,
  boss_name text not null,
  reward_coins integer not null check (reward_coins >= 0),
  reward_definition_id uuid references public.card_definitions (id),
  unique (chapter, ord)
);

-- Five threats per round, the first `players + 1` in play; the last round is the Boss's.
create table public.coop_operation_rounds (
  operation_id uuid not null references public.coop_operations (id) on delete cascade,
  round integer not null check (round >= 1),
  threat_ids uuid[] not null check (cardinality(threat_ids) = 5),
  -- 0-based, among the first three so that two players see it too.
  reinforced_slot integer not null check (reinforced_slot between 0 and 2),
  primary key (operation_id, round)
);

create index coop_operations_reward_definition_id_idx on public.coop_operations (reward_definition_id);

-- ---------------------------------------------------------------------------
-- Rooms, their members, rounds and plays
-- ---------------------------------------------------------------------------

create table public.coop_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code ~ '^[A-Z2-9]{6}$'),
  operation_id uuid not null references public.coop_operations (id),
  host uuid not null references public.profiles (id) on delete cascade,
  -- lobby → active → won | lost; closed: left before starting, or stale.
  status text not null default 'lobby' check (status in ('lobby', 'active', 'won', 'lost', 'closed')),
  -- Seats when it started: the number of threats per round is players + 1.
  players integer check (players between 1 and 4),
  current_round integer not null default 0,
  panic integer not null default 0 check (panic >= 0),
  touched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  constraint coop_rooms_started_shape check ((status = 'lobby' or status = 'closed') or (started_at is not null and players is not null)),
  constraint coop_rooms_finished_shape check ((status in ('won', 'lost', 'closed')) = (finished_at is not null))
);

-- A code points to one room waiting for players.
create unique index coop_rooms_lobby_code_idx on public.coop_rooms (code) where status = 'lobby';
create index coop_rooms_operation_id_idx on public.coop_rooms (operation_id);
create index coop_rooms_host_idx on public.coop_rooms (host);

create table public.coop_members (
  room_id uuid not null references public.coop_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  seat integer not null check (seat between 1 and 4),
  -- The squad, a snapshot: the cards stay free for the other matches of the player.
  card_instance_ids uuid[],
  definition_ids uuid[],
  ready boolean not null default false,
  -- The cards put down for the round placed_round: [{"card": uuid, "slot": 0-based}].
  placement jsonb,
  placed_round integer,
  signal text check (signal in ('mine', 'help', 'skip', 'ready')),
  signal_at timestamptz,
  last_seen_at timestamptz not null default now(),
  -- Left the room with the button: in a match, the server plays the cards.
  left_at timestamptz,
  -- What the end paid.
  xp integer,
  coins integer,
  reward_card_instance_id uuid,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id),
  unique (room_id, seat),
  constraint coop_members_squad_shape check ((card_instance_ids is null) = (definition_ids is null))
);

create index coop_members_user_id_idx on public.coop_members (user_id);

create table public.coop_rounds (
  room_id uuid not null references public.coop_rooms (id) on delete cascade,
  round integer not null check (round >= 1),
  boss boolean not null,
  -- The threats in play (players + 1) and their levels; the slot the rival reinforces.
  threat_ids uuid[] not null,
  threat_levels integer[] not null,
  reinforced_slot integer not null,
  deadline_at timestamptz not null,
  -- Once resolved: the Eco of the rival and how it scored, the result of every threat, the Panic.
  eco_definition_id uuid references public.card_definitions (id),
  eco_score jsonb,
  results jsonb,
  panic integer,
  resolved_at timestamptz,
  primary key (room_id, round),
  constraint coop_rounds_resolved_shape check ((resolved_at is null) = (results is null))
);

create index coop_rounds_eco_definition_id_idx on public.coop_rounds (eco_definition_id);

create table public.coop_plays (
  room_id uuid not null,
  round integer not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_instance_id uuid not null,
  definition_id uuid not null references public.card_definitions (id),
  slot integer not null check (slot between 0 and 4),
  role text not null check (role in ('lead', 'support')),
  base_score integer not null,
  bonus integer not null,
  score integer not null,
  highest_value integer not null,
  auto_played boolean not null,
  parts jsonb,
  primary key (room_id, round, user_id, card_instance_id),
  foreign key (room_id, round) references public.coop_rounds (room_id, round) on delete cascade
);

create index coop_plays_user_id_idx on public.coop_plays (user_id);
create index coop_plays_definition_id_idx on public.coop_plays (definition_id);

-- Operations each player has won: what opens the next one, and the first win's prize.
create table public.coop_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  operation_id uuid not null references public.coop_operations (id),
  room_id uuid not null references public.coop_rooms (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);

create index coop_progress_operation_id_idx on public.coop_progress (operation_id);
create index coop_progress_room_id_idx on public.coop_progress (room_id);

alter table public.coop_chapters enable row level security;
alter table public.coop_operations enable row level security;
alter table public.coop_operation_rounds enable row level security;
alter table public.coop_rooms enable row level security;
alter table public.coop_members enable row level security;
alter table public.coop_rounds enable row level security;
alter table public.coop_plays enable row level security;
alter table public.coop_progress enable row level security;
revoke all on table public.coop_chapters, public.coop_operations, public.coop_operation_rounds, public.coop_rooms,
  public.coop_members, public.coop_rounds, public.coop_plays, public.coop_progress from anon, authenticated;
grant select on table public.coop_chapters, public.coop_operations, public.coop_operation_rounds, public.coop_rooms,
  public.coop_members, public.coop_rounds, public.coop_plays, public.coop_progress to service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- "Something changed" to the room's members (they read coop_state then).
create function public.coop_notify(p_room uuid, p_kind text)
returns void
language sql
volatile
set search_path = ''
as $$
  select realtime.send(jsonb_build_object('kind', p_kind), 'update', 'coop:' || p_room, false)
$$;

-- Closes the rooms nobody moves any more: a lobby untouched for coop.lobby_minutes, an
-- operation whose round is 10 minutes past its deadline (everyone gone: lost, no prize).
create function public.coop_close_stale()
returns void
language sql
volatile
set search_path = ''
as $$
  update public.coop_rooms set status = 'closed', finished_at = now()
  where status = 'lobby' and touched_at < now() - make_interval(mins => public.config_int('coop.lobby_minutes'));
  update public.coop_rooms r set status = 'lost', finished_at = now()
  from public.coop_rounds c
  where r.status = 'active' and c.room_id = r.id and c.round = r.current_round and c.resolved_at is null
    and c.deadline_at < now() - interval '10 minutes';
$$;

-- The room a player is in and has not left, waiting or playing; null for none.
create function public.coop_open_room(p_user uuid)
returns uuid
language sql
stable
set search_path = ''
as $$
  select r.id
  from public.coop_members m
  join public.coop_rooms r on r.id = m.room_id
  where m.user_id = p_user and m.left_at is null and r.status in ('lobby', 'active')
  order by r.created_at desc
  limit 1
$$;

-- Whether a player may open an operation: the first one of all, or one whose previous
-- operation (by chapter, then order) the player has won.
create function public.coop_unlocked(p_user uuid, p_operation uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  with ordered as (
    select o.id, lag(o.id) over (order by o.chapter, o.ord) as previous
    from public.coop_operations o
  )
  select coalesce((
    select x.previous is null
        or exists (select 1 from public.coop_progress p where p.user_id = p_user and p.operation_id = x.previous)
        or exists (select 1 from public.coop_progress p where p.user_id = p_user and p.operation_id = x.id)
    from ordered x where x.id = p_operation
  ), false)
$$;

-- Score that stops (or breaks, on the Boss) a threat of this level.
create function public.coop_target(p_level integer, p_boss boolean)
returns integer
language sql
stable
set search_path = ''
as $$
  select public.config_int(case when p_boss then 'coop.boss_targets.level' else 'coop.targets.level' end || p_level)
$$;

-- Panic a threat adds when nobody stops it: never in the Boss's round.
create function public.coop_threat_panic(p_level integer, p_boss boolean, p_reinforced boolean)
returns integer
language sql
stable
set search_path = ''
as $$
  select case when p_boss then 0 else
    (case when p_level >= public.config_int('coop.panic_high_from_level') then public.config_int('coop.panic_high')
          else public.config_int('coop.panic_low') end)
    + (case when p_reinforced then public.config_int('coop.panic_reinforced') else 0 end)
  end
$$;

-- Opens a round of a started room: its threats (the first players + 1 of the written five),
-- their levels and the deadline; from the second round on, after the pause to read the result.
create function public.coop_open_round(p_room uuid, p_round integer)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_room public.coop_rooms;
  v_written public.coop_operation_rounds;
  v_last integer;
  v_threats uuid[];
  v_levels integer[];
  v_seconds integer;
begin
  select * into v_room from public.coop_rooms where id = p_room;
  select * into v_written from public.coop_operation_rounds where operation_id = v_room.operation_id and round = p_round;
  select max(round) into v_last from public.coop_operation_rounds where operation_id = v_room.operation_id;
  v_threats := v_written.threat_ids[1:v_room.players + 1];
  select array_agg(t.level order by u.ord) into v_levels
  from unnest(v_threats) with ordinality as u(id, ord)
  join public.threat_definitions t on t.id = u.id;
  v_seconds := public.config_int(case when p_round = v_last then 'coop.boss_round_seconds' else 'coop.round_seconds' end)
    + case when p_round > 1 then public.config_int('coop.reveal_pause_seconds') else 0 end;
  insert into public.coop_rounds (room_id, round, boss, threat_ids, threat_levels, reinforced_slot, deadline_at)
  values (p_room, p_round, p_round = v_last, v_threats, v_levels, v_written.reinforced_slot,
          now() + make_interval(secs => v_seconds));
  update public.coop_rooms set current_round = p_round, touched_at = now() where id = p_room;
  update public.coop_members set ready = false, placement = null, placed_round = null where room_id = p_room;
end;
$$;

revoke execute on function public.coop_notify(uuid, text) from public, anon, authenticated;
revoke execute on function public.coop_close_stale() from public, anon, authenticated;
revoke execute on function public.coop_open_room(uuid) from public, anon, authenticated;
revoke execute on function public.coop_unlocked(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.coop_target(integer, boolean) from public, anon, authenticated;
revoke execute on function public.coop_threat_panic(integer, boolean, boolean) from public, anon, authenticated;
revoke execute on function public.coop_open_round(uuid, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- What players read
-- ---------------------------------------------------------------------------

-- The chapters with their operations, which the player has opened and won, the levels of
-- every round (the first 3, 4 or 5 are in play, by players), the player's open room.
create function public.get_coop()
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
  perform public.coop_close_stale();
  v_room := public.coop_open_room(v_uid);
  return jsonb_build_object(
    'min_players', public.config_int('coop.min_players'),
    'max_players', public.config_int('coop.max_players'),
    'room', (
      select jsonb_build_object('id', r.id, 'code', r.code, 'status', r.status, 'operation', o.code, 'title', o.title)
      from public.coop_rooms r join public.coop_operations o on o.id = r.operation_id
      where r.id = v_room
    ),
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object(
        'chapter', c.chapter,
        'title', c.title,
        'intro', c.intro,
        'outro', case when not exists (
          select 1 from public.coop_operations o
          where o.chapter = c.chapter
            and not exists (select 1 from public.coop_progress p where p.user_id = v_uid and p.operation_id = o.id)
        ) then c.outro end,
        'operations', (
          select jsonb_agg(jsonb_build_object(
            'code', o.code,
            'ord', o.ord,
            'title', o.title,
            'intro', o.intro,
            'outro', case when p.user_id is not null then o.outro end,
            'rival_name', o.rival_name,
            'boss_name', o.boss_name,
            'reward_coins', o.reward_coins,
            'reward_card', case when o.reward_definition_id is null then null else public.card_payload(o.reward_definition_id) end,
            'unlocked', public.coop_unlocked(v_uid, o.id),
            'completed', p.user_id is not null,
            'rounds', (
              select jsonb_agg(jsonb_build_object(
                'round', w.round,
                'levels', (
                  select jsonb_agg(t.level order by u.ord)
                  from unnest(w.threat_ids) with ordinality as u(id, ord)
                  join public.threat_definitions t on t.id = u.id
                )
              ) order by w.round)
              from public.coop_operation_rounds w where w.operation_id = o.id
            )
          ) order by o.ord)
          from public.coop_operations o
          left join public.coop_progress p on p.operation_id = o.id and p.user_id = v_uid
          where o.chapter = c.chapter
        )
      ) order by c.chapter)
      from public.coop_chapters c
    ), '[]'::jsonb)
  );
end;
$$;

-- Everything a member may see of the room: the operation; every member with the squad, the
-- cards already played and, in the round being played, where the cards are going (nothing is
-- secret between allies); the threats of the rounds reached (only the levels of the others);
-- every resolved round with the rival's Eco. It also marks the member present.
create function public.coop_state(p_room uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.coop_rooms;
  v_players integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_room from public.coop_rooms where id = p_room;
  if not found or not exists (select 1 from public.coop_members where room_id = p_room and user_id = v_uid) then
    raise exception 'coop_room_not_found';
  end if;
  update public.coop_members set last_seen_at = now() where room_id = p_room and user_id = v_uid and left_at is null;
  v_players := coalesce(v_room.players, (select count(*) from public.coop_members where room_id = p_room)::integer);

  return jsonb_build_object(
    'id', v_room.id,
    'code', v_room.code,
    'status', v_room.status,
    'players', v_players,
    'current_round', v_room.current_round,
    'panic', v_room.panic,
    'panic_limit', public.config_int('coop.panic_limit'),
    'server_now', now(),
    'me', v_uid,
    'host', v_room.host,
    'operation', (
      select jsonb_build_object(
        'code', o.code, 'title', o.title, 'intro', o.intro,
        'outro', case when v_room.status = 'won' then o.outro end,
        'rival_name', o.rival_name, 'boss_name', o.boss_name, 'reward_coins', o.reward_coins,
        'reward_card', case when o.reward_definition_id is null then null else public.card_payload(o.reward_definition_id) end,
        'completed', exists (select 1 from public.coop_progress p where p.user_id = v_uid and p.operation_id = o.id)
      )
      from public.coop_operations o where o.id = v_room.operation_id
    ),
    'members', (
      select jsonb_agg(jsonb_build_object(
        'user_id', m.user_id,
        'seat', m.seat,
        'username', pr.username,
        'avatar_url', pr.avatar_url,
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
          select jsonb_agg(p.card_instance_id) from public.coop_plays p where p.room_id = p_room and p.user_id = m.user_id
        ), '[]'::jsonb),
        'placement', case when m.placed_round = v_room.current_round then m.placement end,
        'xp', m.xp,
        'coins', m.coins,
        'reward_card', case when m.reward_card_instance_id is null then null else (
          select public.card_payload(i.definition_id, i.id) from public.card_instances i where i.id = m.reward_card_instance_id
        ) end
      ) order by m.seat)
      from public.coop_members m
      join public.profiles pr on pr.id = m.user_id
      where m.room_id = p_room
    ),
    'all_ready', v_room.status = 'active' and not exists (
      select 1 from public.coop_members m
      where m.room_id = p_room and m.left_at is null and not (m.ready and m.placed_round = v_room.current_round)
    ),
    'rounds', (
      select jsonb_agg(jsonb_build_object(
        'round', w.round,
        'boss', w.round = (select max(x.round) from public.coop_operation_rounds x where x.operation_id = v_room.operation_id),
        'levels', coalesce(c.threat_levels, (
          select array_agg(t.level order by u.ord)
          from unnest(w.threat_ids[1:v_players + 1]) with ordinality as u(id, ord)
          join public.threat_definitions t on t.id = u.id
        )),
        'deadline_at', c.deadline_at,
        'reinforced_slot', c.reinforced_slot,
        'threats', case when c.room_id is null then null else (
          select jsonb_agg(jsonb_build_object(
            'slot', u.ord - 1, 'name', t.name, 'level', t.level, 'abilities', to_jsonb(t.required_abilities),
            'flavor', t.flavor, 'district', t.district,
            'target', public.coop_target(t.level, c.boss),
            'panic', public.coop_threat_panic(t.level, c.boss, u.ord - 1 = c.reinforced_slot)
          ) order by u.ord)
          from unnest(c.threat_ids) with ordinality as u(id, ord)
          join public.threat_definitions t on t.id = u.id
        ) end,
        'resolved', c.resolved_at is not null,
        'results', c.results,
        'panic', c.panic,
        'eco', case when c.eco_definition_id is null then null else
          public.card_payload(c.eco_definition_id) || jsonb_build_object('score', c.eco_score) end,
        'plays', case when c.resolved_at is null then null else (
          select jsonb_agg(jsonb_build_object(
            'user_id', p.user_id, 'instance_id', p.card_instance_id, 'definition_id', p.definition_id, 'slot', p.slot,
            'role', p.role, 'base', p.base_score, 'bonus', p.bonus, 'score', p.score, 'highest', p.highest_value,
            'auto_played', p.auto_played, 'parts', p.parts
          ) order by p.slot, p.role, p.score desc)
          from public.coop_plays p where p.room_id = p_room and p.round = c.round
        ) end
      ) order by w.round)
      from public.coop_operation_rounds w
      left join public.coop_rounds c on c.room_id = p_room and c.round = w.round
      where w.operation_id = v_room.operation_id
    )
  );
end;
$$;

revoke execute on function public.get_coop() from public, anon;
revoke execute on function public.coop_state(uuid) from public, anon;
grant execute on function public.get_coop() to authenticated;
grant execute on function public.coop_state(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The room: open, join, leave, squad, ready, start, signals
-- ---------------------------------------------------------------------------

create function public.coop_create_room(p_operation text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_operation public.coop_operations;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_room uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform 1 from public.profiles where id = v_uid for update;
  perform public.coop_close_stale();
  if public.coop_open_room(v_uid) is not null then
    raise exception 'coop_already_in_room';
  end if;
  if public.has_active_match(v_uid) then
    raise exception 'match_already_active';
  end if;
  select * into v_operation from public.coop_operations where code = p_operation;
  if not found then
    raise exception 'coop_operation_not_found';
  end if;
  if not public.coop_unlocked(v_uid, v_operation.id) then
    raise exception 'coop_operation_locked';
  end if;

  perform pg_advisory_xact_lock(hashtext('o-mega.coop-codes'));
  loop
    v_code := (
      select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1), '')
      from generate_series(1, 6)
    );
    exit when not exists (select 1 from public.coop_rooms where code = v_code and status = 'lobby');
  end loop;

  insert into public.coop_rooms (code, operation_id, host) values (v_code, v_operation.id, v_uid) returning id into v_room;
  insert into public.coop_members (room_id, user_id, seat) values (v_room, v_uid, 1);
  return jsonb_build_object('id', v_room, 'code', v_code);
end;
$$;

-- Anyone with the code may join, even without having opened the operation: winning it
-- opens it for them too (SPEC §5.17).
create function public.coop_join_room(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.coop_rooms;
  v_seat integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform 1 from public.profiles where id = v_uid for update;
  perform public.coop_close_stale();
  select * into v_room from public.coop_rooms where code = upper(trim(p_code)) and status = 'lobby' for update;
  if not found then
    raise exception 'coop_room_not_found';
  end if;
  if exists (select 1 from public.coop_members where room_id = v_room.id and user_id = v_uid) then
    return jsonb_build_object('id', v_room.id, 'code', v_room.code);
  end if;
  if public.coop_open_room(v_uid) is not null then
    raise exception 'coop_already_in_room';
  end if;
  if public.has_active_match(v_uid) then
    raise exception 'match_already_active';
  end if;
  if (select count(*) from public.coop_members where room_id = v_room.id) >= public.config_int('coop.max_players') then
    raise exception 'coop_room_full';
  end if;
  select min(s) into v_seat from generate_series(1, 4) as s
  where not exists (select 1 from public.coop_members where room_id = v_room.id and seat = s);

  insert into public.coop_members (room_id, user_id, seat) values (v_room.id, v_uid, v_seat);
  update public.coop_rooms set touched_at = now() where id = v_room.id;
  perform public.coop_notify(v_room.id, 'joined');
  return jsonb_build_object('id', v_room.id, 'code', v_room.code);
end;
$$;

-- Before the start a member just goes (the host closes the room); during the operation the
-- member stays out and the server plays the cards; once over, nothing changes.
create function public.coop_leave_room(p_room uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.coop_rooms;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_room from public.coop_rooms where id = p_room for update;
  if not found or not exists (select 1 from public.coop_members where room_id = p_room and user_id = v_uid) then
    raise exception 'coop_room_not_found';
  end if;
  if v_room.status = 'lobby' then
    if v_room.host = v_uid then
      update public.coop_rooms set status = 'closed', finished_at = now() where id = p_room;
    else
      delete from public.coop_members where room_id = p_room and user_id = v_uid;
      update public.coop_rooms set touched_at = now() where id = p_room;
    end if;
  elsif v_room.status = 'active' then
    update public.coop_members set left_at = now(), ready = false
    where room_id = p_room and user_id = v_uid and left_at is null;
    -- Nobody left: the operation is lost, without prizes.
    if not exists (select 1 from public.coop_members where room_id = p_room and left_at is null) then
      update public.coop_rooms set status = 'lost', finished_at = now() where id = p_room;
    end if;
  end if;
  perform public.coop_notify(p_room, 'left');
end;
$$;

-- The member's squad: 6 owned cards of 6 different characters. Choosing it again clears Pronto.
create function public.coop_set_squad(p_room uuid, p_card_instance_ids uuid[])
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_size integer := public.config_int('coop.squad_size');
  v_definitions uuid[];
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform 1 from public.coop_rooms where id = p_room and status = 'lobby' for update;
  if not found or not exists (select 1 from public.coop_members where room_id = p_room and user_id = v_uid) then
    raise exception 'coop_room_not_found';
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

  update public.coop_members
  set card_instance_ids = p_card_instance_ids, definition_ids = v_definitions, ready = false
  where room_id = p_room and user_id = v_uid;
  update public.coop_rooms set touched_at = now() where id = p_room;
  perform public.coop_notify(p_room, 'squad');
end;
$$;

create function public.coop_set_ready(p_room uuid, p_ready boolean)
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
  perform 1 from public.coop_rooms where id = p_room and status = 'lobby' for update;
  if not found or not exists (select 1 from public.coop_members where room_id = p_room and user_id = v_uid) then
    raise exception 'coop_room_not_found';
  end if;
  if p_ready and exists (
    select 1 from public.coop_members where room_id = p_room and user_id = v_uid and card_instance_ids is null
  ) then
    raise exception 'coop_squad_missing';
  end if;
  update public.coop_members set ready = p_ready where room_id = p_room and user_id = v_uid;
  update public.coop_rooms set touched_at = now() where id = p_room;
  perform public.coop_notify(p_room, 'ready');
end;
$$;

-- The host starts once everyone is ready, with enough players: round 1 opens.
create function public.coop_start(p_room uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.coop_rooms;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_room from public.coop_rooms where id = p_room for update;
  if not found or not exists (select 1 from public.coop_members where room_id = p_room and user_id = v_uid) then
    raise exception 'coop_room_not_found';
  end if;
  if v_room.status <> 'lobby' then
    raise exception 'coop_already_started';
  end if;
  if v_room.host <> v_uid then
    raise exception 'coop_not_host';
  end if;
  select count(*) into v_count from public.coop_members where room_id = p_room;
  if v_count < public.config_int('coop.min_players') then
    raise exception 'coop_too_few_players';
  end if;
  if exists (select 1 from public.coop_members where room_id = p_room and (not ready or card_instance_ids is null)) then
    raise exception 'coop_not_ready';
  end if;
  if exists (select 1 from public.coop_members m where m.room_id = p_room and public.has_active_match(m.user_id)) then
    raise exception 'match_already_active';
  end if;

  update public.coop_rooms set status = 'active', players = v_count, started_at = now() where id = p_room;
  perform public.coop_open_round(p_room, 1);
  perform public.coop_notify(p_room, 'started');
end;
$$;

-- The cards a member puts down this round, seen at once by the allies; p_ready says Pronto.
-- A new placement takes Pronto away unless it says it again. Null clears the placement.
create function public.coop_place(p_room uuid, p_round integer, p_cards jsonb, p_ready boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.coop_rooms;
  v_member public.coop_members;
  v_round public.coop_rounds;
  v_count integer;
  v_cards jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_room from public.coop_rooms where id = p_room for update;
  select * into v_member from public.coop_members where room_id = p_room and user_id = v_uid;
  if v_room.id is null or v_member.user_id is null then
    raise exception 'coop_room_not_found';
  end if;
  if v_room.status <> 'active' or v_member.left_at is not null then
    raise exception 'match_not_active';
  end if;
  select * into v_round from public.coop_rounds where room_id = p_room and round = p_round;
  if p_round <> v_room.current_round or v_round.resolved_at is not null then
    raise exception 'round_already_resolved';
  end if;
  if now() > v_round.deadline_at + make_interval(secs => public.config_int('match.timeout_grace_seconds')) then
    raise exception 'round_expired';
  end if;

  if p_cards is null or jsonb_typeof(p_cards) = 'null' then
    if p_ready then
      raise exception 'invalid_placement';
    end if;
    update public.coop_members set placement = null, placed_round = null, ready = false
    where room_id = p_room and user_id = v_uid;
  else
    v_count := case when v_round.boss then public.config_int('coop.boss_cards') else 1 end;
    if jsonb_typeof(p_cards) <> 'array' or jsonb_array_length(p_cards) <> v_count then
      raise exception 'invalid_placement';
    end if;
    -- Each card once, from the squad of the member, not played before; each slot among the threats in play.
    if exists (
      select 1 from jsonb_array_elements(p_cards) e
      where jsonb_typeof(e -> 'card') <> 'string' or jsonb_typeof(e -> 'slot') <> 'number'
         or (e ->> 'slot')::numeric <> floor((e ->> 'slot')::numeric)
         or (e ->> 'slot')::integer not between 0 and cardinality(v_round.threat_ids) - 1
         or not ((e ->> 'card')::uuid = any (v_member.card_instance_ids))
         or exists (
           select 1 from public.coop_plays p
           where p.room_id = p_room and p.user_id = v_uid and p.card_instance_id = (e ->> 'card')::uuid
         )
    ) or (select count(distinct e ->> 'card') from jsonb_array_elements(p_cards) e) <> v_count then
      raise exception 'invalid_placement';
    end if;
    select jsonb_agg(jsonb_build_object('card', (e ->> 'card')::uuid, 'slot', (e ->> 'slot')::integer))
    into v_cards from jsonb_array_elements(p_cards) e;
    update public.coop_members set placement = v_cards, placed_round = p_round, ready = coalesce(p_ready, false)
    where room_id = p_room and user_id = v_uid;
  end if;
  update public.coop_rooms set touched_at = now() where id = p_room;
  perform public.coop_notify(p_room, 'placed');
  return public.coop_state(p_room);
end;
$$;

create function public.coop_signal(p_room uuid, p_signal text)
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
  if p_signal not in ('mine', 'help', 'skip', 'ready') then
    raise exception 'invalid_request';
  end if;
  update public.coop_members set signal = p_signal, signal_at = now()
  where room_id = p_room and user_id = v_uid and left_at is null
    and exists (select 1 from public.coop_rooms r where r.id = p_room and r.status in ('lobby', 'active'));
  if not found then
    raise exception 'coop_room_not_found';
  end if;
  perform public.coop_notify(p_room, 'signal');
end;
$$;

revoke execute on function public.coop_create_room(text) from public, anon;
revoke execute on function public.coop_join_room(text) from public, anon;
revoke execute on function public.coop_leave_room(uuid) from public, anon;
revoke execute on function public.coop_set_squad(uuid, uuid[]) from public, anon;
revoke execute on function public.coop_set_ready(uuid, boolean) from public, anon;
revoke execute on function public.coop_start(uuid) from public, anon;
revoke execute on function public.coop_place(uuid, integer, jsonb, boolean) from public, anon;
revoke execute on function public.coop_signal(uuid, text) from public, anon;
grant execute on function public.coop_create_room(text) to authenticated;
grant execute on function public.coop_join_room(text) to authenticated;
grant execute on function public.coop_leave_room(uuid) to authenticated;
grant execute on function public.coop_set_squad(uuid, uuid[]) to authenticated;
grant execute on function public.coop_set_ready(uuid, boolean) to authenticated;
grant execute on function public.coop_start(uuid) to authenticated;
grant execute on function public.coop_place(uuid, integer, jsonb, boolean) to authenticated;
grant execute on function public.coop_signal(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Service-only: what the Edge Function needs to score a round, and the record
-- ---------------------------------------------------------------------------

-- The room as the engine needs it: members in seat order with their squads and choices, the
-- written rounds, the rival, every resolved round. `ready`: everyone still in has said Pronto.
create function public.coop_round_context(p_user uuid, p_room uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'room', jsonb_build_object(
      'id', r.id, 'status', r.status, 'players', r.players, 'current_round', r.current_round
    ),
    'member', exists (select 1 from public.coop_members m where m.room_id = r.id and m.user_id = p_user),
    'deadline_at', (select c.deadline_at from public.coop_rounds c where c.room_id = r.id and c.round = r.current_round),
    'ready', not exists (
      select 1 from public.coop_members m
      where m.room_id = r.id and m.left_at is null and not (m.ready and m.placed_round = r.current_round)
    ),
    'members', (
      select jsonb_agg(jsonb_build_object(
        'user_id', m.user_id,
        'card_instance_ids', to_jsonb(m.card_instance_ids),
        'definition_ids', to_jsonb(m.definition_ids),
        'placement', case when m.placed_round = r.current_round then m.placement end
      ) order by m.seat)
      from public.coop_members m where m.room_id = r.id
    ),
    'rival_definition_ids', to_jsonb(o.rival_definition_ids),
    'written', (
      select jsonb_agg(jsonb_build_object('threat_ids', to_jsonb(w.threat_ids), 'reinforced', w.reinforced_slot) order by w.round)
      from public.coop_operation_rounds w where w.operation_id = o.id
    ),
    'records', coalesce((
      select jsonb_agg(jsonb_build_object(
        'round', c.round,
        'results', c.results,
        'panic', c.panic,
        'eco', c.eco_score || jsonb_build_object('characterId', c.eco_definition_id),
        'plays', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'player', p.user_id, 'characterId', p.card_instance_id, 'slot', p.slot, 'role', p.role,
            'base', p.base_score, 'bonus', p.bonus, 'total', p.score, 'highest', p.highest_value,
            'autoPlayed', p.auto_played, 'parts', p.parts
          )), '[]'::jsonb)
          from public.coop_plays p where p.room_id = r.id and p.round = c.round
        )
      ) order by c.round)
      from public.coop_rounds c where c.room_id = r.id and c.resolved_at is not null
    ), '[]'::jsonb)
  )
  from public.coop_rooms r
  join public.coop_operations o on o.id = r.operation_id
  where r.id = p_room
$$;

-- Stores a round the engine resolved, after checking it: the round and the time (everyone
-- ready, or the deadline past), every member's cards (a placement is played as it is; the
-- server's own only for who had none), one lead per threat with the highest score, the totals
-- (lead plus the supports' highest value), the targets, the Eco (one of the rival's not
-- played yet; the reinforced threat stopped only against it), the Panic. Then the next round,
-- or the end with its prizes.
create function public.coop_record_round(p_room uuid, p_round integer, p_record jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_room public.coop_rooms;
  v_round public.coop_rounds;
  v_member public.coop_members;
  v_ready boolean;
  v_count integer;
  v_play jsonb;
  v_result jsonb;
  v_slot integer;
  v_total integer;
  v_required integer;
  v_stopped boolean;
  v_reinforced boolean;
  v_lead_score integer;
  v_panic integer := 0;
  v_expected_panic integer;
  v_eco jsonb := p_record -> 'eco';
  v_eco_id uuid;
  v_definition uuid;
  v_last integer;
  v_status text;
  v_broken integer;
  v_xp integer;
  v_coins integer;
  v_operation public.coop_operations;
  v_instance uuid;
begin
  select * into v_room from public.coop_rooms where id = p_room for update;
  if not found or v_room.status <> 'active' then
    raise exception 'match_not_active';
  end if;
  select * into v_round from public.coop_rounds where room_id = p_room and round = p_round;
  if p_round <> v_room.current_round or v_round.resolved_at is not null then
    raise exception 'round_already_resolved';
  end if;
  v_ready := not exists (
    select 1 from public.coop_members m
    where m.room_id = p_room and m.left_at is null and not (m.ready and m.placed_round = p_round)
  );
  if not v_ready and now() <= v_round.deadline_at + make_interval(secs => public.config_int('match.timeout_grace_seconds')) then
    raise exception 'round_not_expired';
  end if;

  -- The cards of every member: as placed, or put down by the server for who placed nothing.
  v_count := case when v_round.boss then public.config_int('coop.boss_cards') else 1 end;
  for v_member in select * from public.coop_members where room_id = p_room order by seat loop
    if (select count(*) from jsonb_array_elements(p_record -> 'plays') e where (e ->> 'player')::uuid = v_member.user_id) <> v_count then
      raise exception 'coop_invalid_round';
    end if;
    if exists (
      select 1 from jsonb_array_elements(p_record -> 'plays') e
      where (e ->> 'player')::uuid = v_member.user_id
        and (not ((e ->> 'characterId')::uuid = any (v_member.card_instance_ids))
             or exists (select 1 from public.coop_plays p
                        where p.room_id = p_room and p.user_id = v_member.user_id and p.card_instance_id = (e ->> 'characterId')::uuid))
    ) then
      raise exception 'coop_invalid_round';
    end if;
    if v_member.placed_round = p_round and v_member.placement is not null then
      -- The own cards of the member, where they were put, and not put down by the server.
      if exists (
        select 1 from jsonb_array_elements(v_member.placement) pl
        where not exists (
          select 1 from jsonb_array_elements(p_record -> 'plays') e
          where (e ->> 'player')::uuid = v_member.user_id and (e ->> 'characterId') = (pl ->> 'card')
            and (e ->> 'slot')::integer = (pl ->> 'slot')::integer and not (e ->> 'autoPlayed')::boolean
        )
      ) then
        raise exception 'coop_placement_changed';
      end if;
    elsif exists (
      select 1 from jsonb_array_elements(p_record -> 'plays') e
      where (e ->> 'player')::uuid = v_member.user_id and not (e ->> 'autoPlayed')::boolean
    ) then
      raise exception 'coop_invalid_round';
    end if;
  end loop;
  if exists (
    select 1 from jsonb_array_elements(p_record -> 'plays') e
    where not exists (select 1 from public.coop_members m where m.room_id = p_room and m.user_id = (e ->> 'player')::uuid)
       or (e ->> 'slot')::integer not between 0 and cardinality(v_round.threat_ids) - 1
  ) then
    raise exception 'coop_invalid_round';
  end if;

  -- The rival: one of its Echi not played yet.
  v_eco_id := (v_eco ->> 'characterId')::uuid;
  select o.* into v_operation from public.coop_operations o where o.id = v_room.operation_id;
  if v_eco_id is null or not (v_eco_id = any (v_operation.rival_definition_ids))
     or exists (select 1 from public.coop_rounds c where c.room_id = p_room and c.eco_definition_id = v_eco_id) then
    raise exception 'coop_invalid_round';
  end if;

  -- Every threat: its lead, the total, the target or the Eco, the Panic.
  if jsonb_array_length(p_record -> 'results') <> cardinality(v_round.threat_ids) then
    raise exception 'coop_invalid_round';
  end if;
  for v_slot in 0 .. cardinality(v_round.threat_ids) - 1 loop
    select e into v_result from jsonb_array_elements(p_record -> 'results') e where (e ->> 'slot')::integer = v_slot;
    if v_result is null then
      raise exception 'coop_invalid_round';
    end if;
    v_reinforced := v_slot = v_round.reinforced_slot;
    if (select count(*) from jsonb_array_elements(p_record -> 'plays') e
        where (e ->> 'slot')::integer = v_slot and e ->> 'role' = 'lead')
       <> least(1, (select count(*) from jsonb_array_elements(p_record -> 'plays') e where (e ->> 'slot')::integer = v_slot)) then
      raise exception 'coop_invalid_round';
    end if;
    select (e ->> 'total')::integer into v_lead_score
    from jsonb_array_elements(p_record -> 'plays') e where (e ->> 'slot')::integer = v_slot and e ->> 'role' = 'lead';
    if exists (
      select 1 from jsonb_array_elements(p_record -> 'plays') e
      where (e ->> 'slot')::integer = v_slot and e ->> 'role' = 'support' and (e ->> 'total')::integer > v_lead_score
    ) then
      raise exception 'coop_invalid_round';
    end if;
    v_total := coalesce(v_lead_score, 0) + coalesce((
      select sum((e ->> 'highest')::integer) from jsonb_array_elements(p_record -> 'plays') e
      where (e ->> 'slot')::integer = v_slot and e ->> 'role' = 'support'
    ), 0);
    v_stopped := (v_result ->> 'stopped')::boolean;
    if (v_result ->> 'total')::integer <> v_total or (v_stopped and v_lead_score is null) then
      raise exception 'coop_invalid_round';
    end if;
    if v_reinforced then
      -- Against the Eco: the rival keeps it unless the team stopped it, and then the Eco lost.
      -- (Who wins is the comparison of the engine: Implacabile, Ribaltone and Muro bend the totals.)
      if v_result ->> 'required' is not null
         or (v_eco ->> 'outcome') <> (case when v_stopped then 'lost' else 'won' end) then
        raise exception 'coop_invalid_round';
      end if;
    else
      -- On its own: stopped exactly when the total reaches the target of the lead (never above the one of the level).
      v_required := (v_result ->> 'required')::integer;
      if v_required is null or v_required > public.coop_target(v_round.threat_levels[v_slot + 1], v_round.boss)
         or v_required < 0 or v_stopped <> (v_lead_score is not null and v_total >= v_required) then
        raise exception 'coop_invalid_round';
      end if;
    end if;
    v_expected_panic := case when v_stopped then 0
      else public.coop_threat_panic(v_round.threat_levels[v_slot + 1], v_round.boss, v_reinforced) end;
    if (v_result ->> 'panic')::integer <> v_expected_panic then
      raise exception 'coop_invalid_round';
    end if;
    v_panic := v_panic + v_expected_panic;
  end loop;
  if (p_record ->> 'panic')::integer <> v_panic then
    raise exception 'coop_invalid_round';
  end if;

  -- Store the round.
  for v_play in select e from jsonb_array_elements(p_record -> 'plays') e loop
    select m.definition_ids[array_position(m.card_instance_ids, (v_play ->> 'characterId')::uuid)] into v_definition
    from public.coop_members m where m.room_id = p_room and m.user_id = (v_play ->> 'player')::uuid;
    insert into public.coop_plays (
      room_id, round, user_id, card_instance_id, definition_id, slot, role,
      base_score, bonus, score, highest_value, auto_played, parts
    ) values (
      p_room, p_round, (v_play ->> 'player')::uuid, (v_play ->> 'characterId')::uuid, v_definition,
      (v_play ->> 'slot')::integer, v_play ->> 'role', (v_play ->> 'base')::integer, (v_play ->> 'bonus')::integer,
      (v_play ->> 'total')::integer, (v_play ->> 'highest')::integer, (v_play ->> 'autoPlayed')::boolean, v_play -> 'parts'
    );
  end loop;
  update public.coop_rounds
  set eco_definition_id = v_eco_id, eco_score = v_eco - 'characterId', results = p_record -> 'results',
      panic = v_panic, resolved_at = now()
  where room_id = p_room and round = p_round;
  update public.coop_rooms set panic = panic + v_panic, touched_at = now() where id = p_room
  returning * into v_room;

  -- Next round, or the end.
  select max(round) into v_last from public.coop_operation_rounds where operation_id = v_room.operation_id;
  if v_room.panic >= public.config_int('coop.panic_limit') then
    v_status := 'lost';
  elsif p_round >= v_last then
    select count(*) into v_broken from jsonb_array_elements(p_record -> 'results') e where (e ->> 'stopped')::boolean;
    v_status := case when v_broken >= v_room.players then 'won' else 'lost' end;
  end if;

  if v_status is null then
    perform public.coop_open_round(p_room, p_round + 1);
  else
    update public.coop_rooms set status = v_status, finished_at = now() where id = p_room;
    -- Prizes for who is still in: XP always; the coins and the card of the operation on a first win.
    v_xp := public.config_int(case when v_status = 'won' then 'coop.win_xp' else 'coop.loss_xp' end);
    for v_member in select * from public.coop_members where room_id = p_room and left_at is null loop
      v_coins := 0;
      v_instance := null;
      if v_status = 'won' then
        insert into public.coop_progress (user_id, operation_id, room_id)
        values (v_member.user_id, v_room.operation_id, p_room)
        on conflict do nothing;
        if found then
          v_coins := v_operation.reward_coins;
          if v_coins > 0 then
            insert into public.coin_ledger (user_id, amount, reason, ref_id)
            values (v_member.user_id, v_coins, 'coop_reward', p_room);
          end if;
          if v_operation.reward_definition_id is not null then
            insert into public.card_instances (definition_id, owner_id, acquired_via)
            values (v_operation.reward_definition_id, v_member.user_id, 'coop')
            returning id into v_instance;
            insert into public.card_transfers (instance_id, from_user, to_user, reason)
            values (v_instance, null, v_member.user_id, 'coop');
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
      update public.coop_members set xp = v_xp, coins = v_coins, reward_card_instance_id = v_instance
      where room_id = p_room and user_id = v_member.user_id;
    end loop;
  end if;
  perform public.coop_notify(p_room, 'round');
  return jsonb_build_object('status', coalesce(v_status, 'active'), 'round', p_round);
end;
$$;

revoke execute on function public.coop_round_context(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.coop_record_round(uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.coop_round_context(uuid, uuid) to service_role;
grant execute on function public.coop_record_round(uuid, integer, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Chapter 1, "Allarme generale": three operations (placeholder texts, SPEC §5.17). The
-- same threats and rivals as scripts/coop-operations.json, which the simulator reads.
-- ---------------------------------------------------------------------------

insert into public.coop_chapters (chapter, title, intro, outro) values (
  1,
  'Allarme generale',
  'Il sismografo segna scosse che nessun Reggente può reggere da solo. Per una settimana il Comune firma permessi speciali: i Reggenti lavorano in squadra, e le emergenze che restano scoperte fanno salire il Panico della città.',
  'Le scosse si calmano. Il Comune ritira i permessi speciali, ma tiene i nomi delle squadre che hanno retto la città: torneranno utili.'
);

insert into public.coop_operations (
  code, chapter, ord, title, intro, outro, rival_name, rival_definition_ids, boss_name, reward_coins, reward_definition_id
)
select v.code, 1, v.ord, v.title, v.intro, v.outro, v.rival_name,
  (select array_agg(d.id order by u.ord) from unnest(v.rival) with ordinality as u(code, ord)
   join public.card_definitions d on d.code = u.code),
  v.boss_name, v.coins, (select d.id from public.card_definitions d where d.code = v.prize)
from (values
  ('O1M1', 1, 'Scosse alle Fosse',
   'Le Fosse tremano e mezzo quartiere scende in strada. Un Reggente della Compagnia approfitta del caos per prendersi le emergenze che pagano di più: lasciategli le briciole.',
   'Le Fosse reggono. Il Reggente della Compagnia se ne va a mani vuote, ma prende nota delle vostre facce.',
   'Il Reggente della Compagnia', array['P021', 'P065', 'P031', 'P071', 'P041'], 'La faglia sotto le Fosse', 40, null::text),
  ('O1M2', 2, 'Blackout al porto',
   'Il porto resta al buio e le gru si muovono da sole. Il Banco presta i suoi Reggenti a interesse a chiunque paghi: stanotte paga qualcuno che vuole il porto vuoto.',
   'Le luci tornano sulle banchine. Il dottor Spanò passa a riscuotere, ma stavolta non c''è niente da prendere.',
   'Il Reggente del Banco', array['P096', 'P088', 'P136', 'P046', 'P090'], 'La nave senza luci', 50, null),
  ('O1M3', 3, 'Notte di guardia',
   'I Figli dell''Ultima scelgono la notte più lunga per scendere nella necropoli. Le scosse vengono da lì sotto, e loro lo sanno da tempo.',
   'All''alba la necropoli tace. Sulla soglia, i Figli hanno lasciato una lastra: Carillon, il guardiano della campana.',
   'Il Reggente dei Figli', array['P128', 'P158', 'P076', 'P174', 'P051'], 'La campana sotto la necropoli', 70, 'P101')
) as v(code, ord, title, intro, outro, rival_name, rival, boss_name, coins, prize);

insert into public.coop_operation_rounds (operation_id, round, threat_ids, reinforced_slot)
select o.id, v.round,
  (select array_agg(t.id order by u.ord) from unnest(v.threats) with ordinality as u(code, ord)
   join public.threat_definitions t on t.code = u.code),
  v.reinforced
from (values
  ('O1M1', 1, array['T101', 'T301', 'T506', 'T204', 'T401'], 1),
  ('O1M1', 2, array['T405', 'T202', 'T601', 'T104', 'T309'], 0),
  ('O1M1', 3, array['T508', 'T110', 'T304', 'T206', 'T406'], 2),
  ('O1M1', 4, array['T201', 'T605', 'T402', 'T107', 'T501'], 1),
  ('O1M1', 5, array['T102', 'T403', 'T603', 'T210', 'T503'], 2),
  ('O1M2', 1, array['T207', 'T310', 'T509', 'T107', 'T404'], 0),
  ('O1M2', 2, array['T407', 'T106', 'T607', 'T208', 'T307'], 2),
  ('O1M2', 3, array['T504', 'T209', 'T308', 'T109', 'T410'], 1),
  ('O1M2', 4, array['T105', 'T408', 'T502', 'T203', 'T302'], 2),
  ('O1M2', 5, array['T205', 'T305', 'T610', 'T110', 'T409'], 0),
  ('O1M3', 1, array['T103', 'T303', 'T505', 'T205', 'T409'], 2),
  ('O1M3', 2, array['T406', 'T206', 'T609', 'T104', 'T306'], 2),
  ('O1M3', 3, array['T507', 'T102', 'T403', 'T209', 'T310'], 0),
  ('O1M3', 4, array['T208', 'T608', 'T305', 'T108', 'T510'], 1),
  ('O1M3', 5, array['T109', 'T410', 'T606', 'T203', 'T503'], 0)
) as v(operation, round, threats, reinforced)
join public.coop_operations o on o.code = v.operation;

-- The seed must be whole: five Echi and five rounds of five usual threats of Nuova Megara each.
do $$
begin
  if exists (
    select 1 from public.coop_operations o
    where cardinality(o.rival_definition_ids) is distinct from public.config_int('coop.city_rounds') + 1
       or (select count(*) from public.coop_operation_rounds w where w.operation_id = o.id) <> public.config_int('coop.city_rounds') + 1
  ) or exists (
    select 1 from public.coop_operation_rounds w
    where cardinality(w.threat_ids) is distinct from 5
       or exists (
         select 1 from unnest(w.threat_ids) as u(id)
         left join public.threat_definitions t on t.id = u.id
         where t.id is null or t.region <> 'megara' or t.rarity_code is not null or t.modifier_code is not null
       )
  ) then
    raise exception 'coop seed incomplete';
  end if;
end;
$$;
