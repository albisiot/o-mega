-- Caccia grossa (SPEC §5.18), third stage: the public queue «Cerca squadra» for each Boss, the
-- Boss of the week (its first win of the week pays more), the hunts in events, daily objectives
-- and Imprese, and the Boss of the community: during an event the damage of every team goes
-- toward one Life, and when it falls everyone who took part gets the reward.

-- ---------------------------------------------------------------------------
-- Configuration (balance.ts `raid`)
-- ---------------------------------------------------------------------------

insert into public.game_config (key, value, description) values
  ('raid.queue_wait_seconds', '25', 'Caccia grossa: the public queue starts a room with whoever is there after this wait'),
  ('raid.weekly_coins', '60', 'Caccia grossa: coins of the first win of the week on the Boss of the week, times its reward_percent');

alter table public.coin_ledger drop constraint coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in (
  'pack_purchase', 'match_reward', 'bot_match_reward', 'duplicate_conversion', 'conquest_bonus', 'level_reward',
  'emergency_reward', 'bonus_code', 'story_reward', 'story_star', 'event_reward', 'objective_reward', 'achievement_reward',
  'emergency_prize', 'ranked_prize', 'emergency_week_reward', 'emergency_week_prize', 'admin_adjustment', 'challenge_reward',
  'coop_reward', 'coop_star', 'raid_reward', 'raid_star', 'raid_weekly'
));

-- What the end paid besides: the Boss of the week, the Boss of the community.
alter table public.raid_members add column weekly_coins integer, add column community boolean;

-- Whether a person's play counts for prizes and points: at least raid.self_chosen_percent of the
-- cards played were chosen by the player (the rule of the prizes, raid_record_round).
create function public.raid_member_eligible(p_room uuid, p_seat integer)
returns boolean
language sql
stable
set search_path = ''
as $$
  select count(*) filter (where not p.auto_played) * 100 >= count(*) * public.config_int('raid.self_chosen_percent')
  from public.raid_plays p
  where p.room_id = p_room and p.seat = p_seat
$$;

revoke execute on function public.raid_member_eligible(uuid, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The public queue «Cerca squadra»: one per Boss
-- ---------------------------------------------------------------------------

create table public.raid_queue (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  boss_id uuid not null references public.boss_definitions (id) on delete cascade,
  card_instance_ids uuid[] not null,
  definition_ids uuid[] not null,
  joined_at timestamptz not null default now(),
  -- The last time the player asked (raid_queue_poll): who stops asking has left the queue.
  polled_at timestamptz not null default now()
);

create index raid_queue_boss_idx on public.raid_queue (boss_id, joined_at);

alter table public.raid_queue enable row level security;
revoke all on table public.raid_queue from anon, authenticated;
grant select on table public.raid_queue to service_role;

-- The definitions of a squad of raid.squad_size owned cards of different characters (raid_set_squad's checks).
create function public.raid_squad_definitions(p_user uuid, p_card_instance_ids uuid[])
returns uuid[]
language plpgsql
stable
set search_path = ''
as $$
declare
  v_size integer := public.config_int('raid.squad_size');
  v_definitions uuid[];
begin
  if coalesce(cardinality(p_card_instance_ids), 0) <> v_size then
    raise exception 'invalid_team_size' using errcode = '22023';
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
  return v_definitions;
end;
$$;

-- A new room on a Boss, without members: the threats, the moves and their modifiers drawn, the
-- Magnitude copied (as raid_create_room does).
create function public.raid_new_room(p_boss uuid, p_host uuid)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_boss public.boss_definitions;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_threats uuid[];
  v_levels integer[];
  v_moves text[];
  v_room uuid;
begin
  select * into v_boss from public.boss_definitions where id = p_boss;
  v_threats := public.raid_draw_threats(v_boss.id);
  select array_agg(t.level order by u.ord) into v_levels
  from unnest(v_threats) with ordinality as u(id, ord) join public.threat_definitions t on t.id = u.id;
  v_moves := public.raid_draw_moves(v_boss.id, v_levels);
  perform pg_advisory_xact_lock(hashtext('o-mega.raid-codes'));
  loop
    v_code := (
      select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1), '')
      from generate_series(1, 6)
    );
    exit when not exists (select 1 from public.raid_rooms where code = v_code and status = 'lobby');
  end loop;
  insert into public.raid_rooms (
    code, boss_id, host, magnitude, forza_percent, vita_percent, reward_percent, threat_ids, threat_levels, moves, move_modifiers
  ) values (
    v_code, v_boss.id, p_host, v_boss.raid_magnitude,
    public.config_int('raid.magnitude' || v_boss.raid_magnitude || '.forza_percent'),
    v_boss.raid_vita_percent,
    public.config_int('raid.magnitude' || v_boss.raid_magnitude || '.reward_percent'),
    v_threats, v_levels, v_moves, public.raid_move_modifiers(v_moves)
  ) returning id into v_room;
  return v_room;
end;
$$;

-- Makes a room of a Boss's queue when it is time: as soon as a full room is waiting, or once the
-- first player has waited raid.queue_wait_seconds, with whoever is there (the earliest first)
-- and server allies up to raid.min_players. The hunt starts at once: everyone chose a squad.
create function public.raid_queue_match(p_boss uuid)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_users uuid[];
  v_oldest timestamptz;
  v_room uuid;
  v_count integer;
  v_raid public.raid_rooms;
  v_vita integer;
begin
  perform pg_advisory_xact_lock(hashtext('o-mega.raid-queue'));
  -- Who has not asked for a while has closed the page: out of the queue.
  delete from public.raid_queue where polled_at < now() - interval '15 seconds';
  select array_agg(q.user_id order by q.joined_at), min(q.joined_at) into v_users, v_oldest
  from (
    select user_id, joined_at from public.raid_queue
    where boss_id = p_boss order by joined_at limit public.config_int('raid.max_players')
  ) q;
  if v_users is null then
    return null;
  end if;
  if cardinality(v_users) < public.config_int('raid.max_players')
     and v_oldest > now() - make_interval(secs => public.config_int('raid.queue_wait_seconds')) then
    return null;
  end if;

  v_room := public.raid_new_room(p_boss, v_users[1]);
  insert into public.raid_members (room_id, user_id, seat, card_instance_ids, definition_ids, ready)
  select v_room, q.user_id, u.ord, q.card_instance_ids, q.definition_ids, true
  from unnest(v_users) with ordinality as u(id, ord)
  join public.raid_queue q on q.user_id = u.id;
  delete from public.raid_queue where user_id = any (v_users);
  select count(*) into v_count from public.raid_members where room_id = v_room;
  while v_count < public.config_int('raid.min_players') loop
    perform public.raid_seat_ally(v_room);
    v_count := v_count + 1;
  end loop;

  select * into v_raid from public.raid_rooms where id = v_room;
  v_vita := public.raid_vita_max(v_count, v_raid.forza_percent, v_raid.vita_percent);
  update public.raid_rooms
  set status = 'active', players = v_count, started_at = now(), vita_max = v_vita, vita = v_vita,
      defenses = public.config_int('raid.defenses')
  where id = v_room;
  perform public.raid_open_round(v_room, 1);
  -- The players in the queue hear of the room at once (they also ask every few seconds).
  perform realtime.send(jsonb_build_object('kind', 'raid', 'room_id', v_room), 'update', 'player:' || u.id, false)
  from unnest(v_users) as u(id);
  return v_room;
end;
$$;

-- Where the player is in the queue: the Boss, since when, how many wait for it, and the room
-- once the queue made one.
create function public.raid_queue_status(p_user uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'queued', q.user_id is not null,
    'boss', b.code,
    'name', b.name,
    'joined_at', q.joined_at,
    'waiting', (select count(*) from public.raid_queue x where x.boss_id = q.boss_id),
    'wait_seconds', public.config_int('raid.queue_wait_seconds'),
    'max_players', public.config_int('raid.max_players'),
    'room', public.raid_open_room(p_user),
    'server_now', now()
  )
  from (select 1) one
  left join public.raid_queue q on q.user_id = p_user
  left join public.boss_definitions b on b.id = q.boss_id
$$;

create function public.raid_queue_join(p_boss text, p_card_instance_ids uuid[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_boss public.boss_definitions;
  v_definitions uuid[];
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform 1 from public.profiles where id = v_uid for update;
  perform public.raid_close_stale();
  perform public.coop_close_stale();
  if public.raid_open_room(v_uid) is not null or public.coop_open_room(v_uid) is not null then
    raise exception 'coop_already_in_room';
  end if;
  if public.has_active_match(v_uid) then
    raise exception 'match_already_active';
  end if;
  select * into v_boss from public.boss_definitions where code = p_boss and raid_active;
  if not found then
    raise exception 'raid_boss_not_found';
  end if;
  v_definitions := public.raid_squad_definitions(v_uid, p_card_instance_ids);
  -- One queue at a time: out of the Operazioni's.
  delete from public.coop_queue where user_id = v_uid;
  insert into public.raid_queue (user_id, boss_id, card_instance_ids, definition_ids)
  values (v_uid, v_boss.id, p_card_instance_ids, v_definitions)
  on conflict (user_id) do update
  set boss_id = excluded.boss_id, card_instance_ids = excluded.card_instance_ids,
      definition_ids = excluded.definition_ids, joined_at = now(), polled_at = now();
  perform public.raid_queue_match(v_boss.id);
  return public.raid_queue_status(v_uid);
end;
$$;

create function public.raid_queue_poll()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_boss uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  update public.raid_queue set polled_at = now() where user_id = v_uid returning boss_id into v_boss;
  if v_boss is not null then
    perform public.raid_queue_match(v_boss);
  end if;
  return public.raid_queue_status(v_uid);
end;
$$;

create function public.raid_queue_leave()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  delete from public.raid_queue where user_id = auth.uid();
end;
$$;

revoke execute on function public.raid_squad_definitions(uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.raid_new_room(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.raid_queue_match(uuid) from public, anon, authenticated;
revoke execute on function public.raid_queue_status(uuid) from public, anon, authenticated;
revoke execute on function public.raid_queue_join(text, uuid[]) from public, anon;
revoke execute on function public.raid_queue_poll() from public, anon;
revoke execute on function public.raid_queue_leave() from public, anon;
grant execute on function public.raid_queue_join(text, uuid[]) to authenticated;
grant execute on function public.raid_queue_poll() to authenticated;
grant execute on function public.raid_queue_leave() to authenticated;

-- Opening or joining a hunt's room takes the player out of the hunts' queue.
create function public.raid_members_leave_queue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null then
    delete from public.raid_queue where user_id = new.user_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.raid_members_leave_queue() from public, anon, authenticated;

create trigger raid_members_leave_queue
  after insert on public.raid_members
  for each row execute function public.raid_members_leave_queue();

-- As in the first stage (no room of the Operazioni, nor their queue, from inside a hunt), and an
-- Operazioni room or queue takes the player out of the hunts' queue.
create or replace function public.coop_guard_raid_room()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null and public.raid_open_room(new.user_id) is not null then
    raise exception 'coop_already_in_room';
  end if;
  if new.user_id is not null then
    delete from public.raid_queue where user_id = new.user_id;
  end if;
  return new;
end;
$$;

-- As in 20261123200000_caccia_grossa.sql, with the hunts' queue.
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
    when 'raid_queue' then
      perform public.assert_modes_open(array['raid']);
  end case;
  return new;
end;
$$;

create trigger raid_queue_mode_open before insert on public.raid_queue
  for each row execute function public.guard_mode_start();

-- ---------------------------------------------------------------------------
-- The Boss of the week
-- ---------------------------------------------------------------------------

create table public.raid_weeks (
  -- The Monday of the week (game_week, Europe/Rome).
  week date primary key,
  boss_id uuid not null references public.boss_definitions (id) on delete cascade,
  -- An admin's choice; null for the rotation.
  chosen_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index raid_weeks_boss_id_idx on public.raid_weeks (boss_id);
create index raid_weeks_chosen_by_idx on public.raid_weeks (chosen_by);

-- The first win of each week on its Boss: what it paid.
create table public.raid_weekly_wins (
  user_id uuid not null references public.profiles (id) on delete cascade,
  week date not null,
  room_id uuid not null references public.raid_rooms (id) on delete cascade,
  coins integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, week)
);

create index raid_weekly_wins_room_id_idx on public.raid_weekly_wins (room_id);

alter table public.raid_weeks enable row level security;
alter table public.raid_weekly_wins enable row level security;
revoke all on table public.raid_weeks, public.raid_weekly_wins from anon, authenticated;
grant select on table public.raid_weeks, public.raid_weekly_wins to service_role;

-- The Boss of a week (its Monday): an admin's choice, or the rotation, written the first time it
-- is asked: the next Boss on in the hunt by code after last week's, never two of Magnitude 5 in a
-- row. Null when no Boss is on.
create function public.raid_week_boss(p_week date)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_boss uuid;
  v_last_code text;
  v_last_magnitude integer;
begin
  select boss_id into v_boss from public.raid_weeks where week = p_week;
  if found then
    return v_boss;
  end if;
  select b.code, b.raid_magnitude into v_last_code, v_last_magnitude
  from public.raid_weeks w join public.boss_definitions b on b.id = w.boss_id
  where w.week < p_week
  order by w.week desc
  limit 1;
  select b.id into v_boss
  from public.boss_definitions b
  where b.raid_active
  order by (coalesce(v_last_magnitude, 0) = 5 and b.raid_magnitude = 5), (b.code <= coalesce(v_last_code, '')), b.code
  limit 1;
  if v_boss is null then
    return null;
  end if;
  insert into public.raid_weeks (week, boss_id) values (p_week, v_boss) on conflict (week) do nothing;
  return (select boss_id from public.raid_weeks where week = p_week);
end;
$$;

revoke execute on function public.raid_week_boss(date) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The Boss of the community, in an event
-- ---------------------------------------------------------------------------

create table public.raid_community (
  event_id uuid primary key references public.events (id) on delete cascade,
  vita integer not null check (vita between 1 and 100000000),
  coins integer not null default 0 check (coins between 0 and 100000),
  packs integer not null default 0 check (packs between 0 and 5),
  shards integer not null default 0 check (shards between 0 and 100),
  fallen_at timestamptz,
  constraint raid_community_has_reward check (coins > 0 or packs > 0 or shards > 0)
);

create table public.raid_community_rewards (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  coins integer not null,
  packs integer not null,
  shards integer not null,
  opening_ids uuid[] not null default '{}',
  granted_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index raid_community_rewards_user_id_idx on public.raid_community_rewards (user_id);

alter table public.raid_community enable row level security;
alter table public.raid_community_rewards enable row level security;
revoke all on table public.raid_community, public.raid_community_rewards from anon, authenticated;
grant select on table public.raid_community, public.raid_community_rewards to service_role;

-- The damage of every hunt to the community's Boss: the rounds resolved during the event, in
-- rooms started during it.
create function public.raid_community_damage(p_event uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(c.damage), 0)::integer
  from public.events e
  join public.raid_rooms r on r.started_at >= e.starts_at and r.started_at < e.ends_at
  join public.raid_rounds c on c.room_id = r.id and c.resolved_at is not null
  where e.id = p_event and c.resolved_at < e.ends_at
$$;

-- Pays the community's reward to a player, once (coins and Schegge as an event's, packs opened).
-- True when paid now.
create function public.raid_community_grant(p_event uuid, p_user uuid)
returns boolean
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_community public.raid_community;
  v_openings uuid[] := '{}';
begin
  select * into v_community from public.raid_community where event_id = p_event;
  insert into public.raid_community_rewards (event_id, user_id, coins, packs, shards)
  values (p_event, p_user, v_community.coins, v_community.packs, v_community.shards)
  on conflict do nothing;
  if not found then
    return false;
  end if;
  if v_community.coins > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id) values (p_user, v_community.coins, 'event_reward', p_event);
  end if;
  perform public.grant_reward_shards(p_user, v_community.shards, 'event_reward', p_event);
  for i in 1 .. v_community.packs loop
    v_openings := v_openings || public.open_pack(p_user, 'standard');
  end loop;
  update public.raid_community_rewards set opening_ids = v_openings where event_id = p_event and user_id = p_user;
  return true;
end;
$$;

revoke execute on function public.raid_community_damage(uuid) from public, anon, authenticated;
revoke execute on function public.raid_community_grant(uuid, uuid) from public, anon, authenticated;

-- What a player sees of the running event's community Boss; null without one.
create function public.raid_community_payload(p_user uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'event', e.title,
    'ends_at', e.ends_at,
    'vita', c.vita,
    'damage', least(c.vita, public.raid_community_damage(e.id)),
    'fallen', c.fallen_at is not null,
    'coins', c.coins,
    'packs', c.packs,
    'shards', c.shards,
    'received', exists (select 1 from public.raid_community_rewards r where r.event_id = e.id and r.user_id = p_user)
  )
  from public.raid_community c
  join public.events e on e.id = c.event_id
  where c.event_id = public.current_event_id()
$$;

revoke execute on function public.raid_community_payload(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The end of a hunt for a person: event points, daily objectives, the Boss of the week, the
-- Boss of the community, Imprese. raid_record_round writes the XP last, after the stars; who
-- left, or chose less than half of the cards, gets nothing here either.
-- ---------------------------------------------------------------------------

create function public.raid_member_finished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.raid_rooms;
  v_round record;
  v_damage integer;
  v_week date;
  v_coins integer;
  v_event uuid;
  v_community public.raid_community;
  v_starts timestamptz;
  v_participant uuid;
begin
  if old.xp is not null or new.xp is null or new.user_id is null or new.left_at is not null
     or not public.raid_member_eligible(new.room_id, new.seat) then
    return new;
  end if;
  select * into v_room from public.raid_rooms where id = new.room_id;

  -- Event points: the hunt (won or lost) and each round the team held.
  perform public.award_event_points(new.user_id, 'raid', case when v_room.status = 'won' then 'win' else 'loss' end,
                                    new.room_id, 0, null, v_room.started_at);
  for v_round in select c.round from public.raid_rounds c where c.room_id = new.room_id and c.held order by c.round loop
    perform public.award_event_points(new.user_id, 'raid', 'passed', new.room_id, v_round.round, null, v_room.started_at);
  end loop;

  -- Daily objectives.
  select coalesce(sum(c.damage), 0)::integer into v_damage from public.raid_rounds c where c.room_id = new.room_id;
  perform public.advance_daily_objectives(new.user_id, 'raid_played', 1);
  if v_room.status = 'won' then
    perform public.advance_daily_objectives(new.user_id, 'raid_won', 1);
  end if;
  perform public.advance_daily_objectives(new.user_id, 'raid_damage', v_damage);
  perform public.advance_daily_objectives(new.user_id, 'raid_stars', coalesce(cardinality(new.stars), 0));

  -- The Boss of the week: its first win of the week pays more.
  if v_room.status = 'won' then
    v_week := public.game_week(public.game_day(v_room.finished_at));
    if v_room.boss_id = public.raid_week_boss(v_week) then
      v_coins := public.raid_percent(public.config_int('raid.weekly_coins'), v_room.reward_percent);
      insert into public.raid_weekly_wins (user_id, week, room_id, coins) values (new.user_id, v_week, new.room_id, v_coins)
      on conflict do nothing;
      if found then
        if v_coins > 0 then
          insert into public.coin_ledger (user_id, amount, reason, ref_id) values (new.user_id, v_coins, 'raid_weekly', new.room_id);
        end if;
        update public.raid_members set weekly_coins = v_coins where room_id = new.room_id and seat = new.seat;
      end if;
    end if;
  end if;

  -- The Boss of the community: when its Life is gone, everyone who took part gets the reward.
  v_event := public.current_event_id();
  select * into v_community from public.raid_community where event_id = v_event;
  select starts_at into v_starts from public.events where id = v_event;
  if v_community.event_id is not null and v_room.started_at >= v_starts then
    if v_community.fallen_at is null and public.raid_community_damage(v_event) >= v_community.vita then
      update public.raid_community set fallen_at = now() where event_id = v_event and fallen_at is null;
      if found then
        for v_participant in
          select distinct m.user_id
          from public.raid_members m join public.raid_rooms r on r.id = m.room_id
          where m.user_id is not null and m.xp is not null and m.left_at is null
            and r.started_at >= v_starts and r.status in ('won', 'lost')
            and public.raid_member_eligible(m.room_id, m.seat)
        loop
          perform public.raid_community_grant(v_event, v_participant);
        end loop;
      end if;
      select * into v_community from public.raid_community where event_id = v_event;
    end if;
    if v_community.fallen_at is not null then
      perform public.raid_community_grant(v_event, new.user_id);
      update public.raid_members
      set community = exists (
        select 1 from public.raid_community_rewards r where r.event_id = v_event and r.user_id = new.user_id and r.granted_at = now()
      )
      where room_id = new.room_id and seat = new.seat;
    end if;
  end if;

  perform public.check_achievements(new.user_id, array['raid_played', 'raid_won', 'raid_damage', 'raid_stars', 'raid_bosses', 'raid_weekly']);
  return new;
end;
$$;

revoke execute on function public.raid_member_finished() from public, anon, authenticated;

create trigger raid_members_finished
  after update of xp on public.raid_members
  for each row execute function public.raid_member_finished();

-- ---------------------------------------------------------------------------
-- Events: "raid" pays a hunt finished (won or lost) and each round the team held (outcome "passed", as a threat)
-- ---------------------------------------------------------------------------

alter table public.event_points drop constraint event_points_kind_check;
alter table public.event_points add constraint event_points_kind_check
  check (kind in ('friendly', 'conquest', 'bot', 'story', 'emergency', 'coop', 'raid'));

-- Same as in 20261121250000_operations_stage_three.sql, with the hunts.
create or replace function public.event_points_rules(p_points jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_kind text;
  v_outcome text;
  v_value integer;
  v_rules jsonb := '{}'::jsonb;
  v_kinds jsonb := '{"friendly": ["win", "draw", "loss"], "conquest": ["win", "draw", "loss"],
                    "bot": ["win", "draw", "loss"], "story": ["win", "draw", "loss"], "emergency": ["passed"],
                    "coop": ["win", "loss", "passed"], "raid": ["win", "loss", "passed"]}';
begin
  for v_kind in select jsonb_object_keys(v_kinds) loop
    v_rules := v_rules || jsonb_build_object(v_kind, '{}'::jsonb);
    for v_outcome in select jsonb_array_elements_text(v_kinds -> v_kind) loop
      begin
        v_value := coalesce((p_points -> v_kind ->> v_outcome)::integer, 0);
      exception when others then
        raise exception 'event_invalid_points';
      end;
      if v_value < 0 or v_value > 1000 then
        raise exception 'event_invalid_points';
      end if;
      v_rules := jsonb_set(v_rules, array[v_kind, v_outcome], to_jsonb(v_value));
    end loop;
  end loop;
  return v_rules;
end;
$$;

-- Same as in 20261121250000_operations_stage_three.sql: the squad of 6 of a hunt too.
create or replace function public.event_ref_team(p_user uuid, p_ref_id uuid)
returns uuid[]
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select t.definition_ids from public.match_teams t where t.match_id = p_ref_id and t.user_id = p_user limit 1),
    (select r.definition_ids from public.emergency_runs r where r.id = p_ref_id and r.user_id = p_user),
    (select r.definition_ids from public.emergency_week_runs r where r.id = p_ref_id and r.user_id = p_user),
    (select m.definition_ids from public.coop_members m where m.room_id = p_ref_id and m.user_id = p_user),
    (select m.definition_ids from public.raid_members m where m.room_id = p_ref_id and m.user_id = p_user),
    '{}'
  )
$$;

-- Same as in 20261121250000_operations_stage_three.sql: the squad of 6 of a hunt too.
create or replace function public.event_ref_team_variants(p_user uuid, p_ref_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer
  from public.card_instances i
  where i.variant_id is not null
    and i.id = any (coalesce(
      (select t.card_instance_ids from public.match_teams t where t.match_id = p_ref_id and t.user_id = p_user limit 1),
      (select r.card_instance_ids from public.emergency_runs r where r.id = p_ref_id and r.user_id = p_user),
      (select r.card_instance_ids from public.emergency_week_runs r where r.id = p_ref_id and r.user_id = p_user),
      (select m.card_instance_ids from public.coop_members m where m.room_id = p_ref_id and m.user_id = p_user),
      (select m.card_instance_ids from public.raid_members m where m.room_id = p_ref_id and m.user_id = p_user),
      '{}'
    ))
$$;

-- Same as in 20261123100000_coop_event_points_notice.sql: a hunt in an event that gives the hunts no points says nothing either.
create or replace function public.get_event_points_for(p_ref_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_event uuid;
  v_points integer;
  v_ref uuid;
  v_running public.events;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select p.event_id, sum(p.points)::integer into v_event, v_points
  from public.event_points p
  where p.user_id = v_uid and p.ref_id = coalesce(p_ref_id, (
    select r.id from public.emergency_runs r where r.user_id = v_uid and r.day = public.game_day()
  ))
  group by p.event_id
  limit 1;
  if v_event is null then
    -- No points: say so when the running event did not admit the team.
    v_ref := coalesce(p_ref_id, (
      select r.id from public.emergency_runs r where r.user_id = v_uid and r.day = public.game_day()
    ));
    select * into v_running from public.events where id = public.current_event_id();
    -- An operation in an event that gives the operations no points: nothing to say (not a team problem).
    if exists (select 1 from public.coop_members m where m.room_id = v_ref and m.user_id = v_uid)
       and not exists (select 1 from jsonb_each_text(coalesce(v_running.points -> 'coop', '{}'::jsonb)) e where e.value::integer > 0) then
      return null;
    end if;
    if exists (select 1 from public.raid_members m where m.room_id = v_ref and m.user_id = v_uid)
       and not exists (select 1 from jsonb_each_text(coalesce(v_running.points -> 'raid', '{}'::jsonb)) e where e.value::integer > 0) then
      return null;
    end if;
    if v_running.id is not null
       and not public.event_admits_everyone(v_running.traits, v_running.rarities, v_running.factions)
       and cardinality(public.event_ref_team(v_uid, v_ref)) > 0
       and not public.event_team_admitted(v_running.traits, v_running.rarities, v_running.factions,
                                          public.event_ref_team(v_uid, v_ref)) then
      return jsonb_build_object(
        'points', 0,
        'title', v_running.title,
        'total', (select coalesce(sum(p.points), 0) from public.event_points p
                  where p.event_id = v_running.id and p.user_id = v_uid),
        'new_rewards', 0,
        'not_admitted', true
      );
    end if;
    return null;
  end if;
  return jsonb_build_object(
    'points', v_points,
    'title', (select e.title from public.events e where e.id = v_event),
    'total', (select sum(p.points) from public.event_points p where p.event_id = v_event and p.user_id = v_uid),
    'new_rewards', (
      select count(*) from public.event_rewards r
      where r.event_id = v_event and r.user_id = v_uid and r.seen_at is null
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Daily objectives: hunts finished, won, the team's damage, stars met in a win (replays too)
-- ---------------------------------------------------------------------------

alter table public.daily_objective_definitions drop constraint daily_objective_definitions_metric_check;
alter table public.daily_objective_definitions add constraint daily_objective_definitions_metric_check check (metric in (
  'matches_played', 'matches_won', 'threats_won', 'cards_played',
  'emergency_passed', 'packs_opened', 'duplicates_converted', 'cards_conquered',
  'variants_found', 'variant_wins', 'coop_played', 'coop_won', 'coop_threats', 'coop_stars',
  'raid_played', 'raid_won', 'raid_damage', 'raid_stars'
));

-- Same as in 20261121250000_operations_stage_three.sql, with the metrics of the hunt.
create or replace function public.admin_save_daily_objective(
  p_code text,
  p_title text,
  p_difficulty text,
  p_metric text,
  p_params jsonb,
  p_target integer,
  p_coins integer,
  p_packs integer,
  p_random_variants jsonb default null,
  p_card_codes text[] default null,
  p_shards integer default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
  v_params jsonb := coalesce(p_params, '{}'::jsonb);
  v_random jsonb;
  v_cards record;
  v_definition_ids uuid[] := '{}';
  v_variant_ids uuid[] := '{}';
  v_card_count integer;
  v_shards integer;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if char_length(v_title) not between 3 and 80
     or p_difficulty is null or p_difficulty not in ('easy', 'medium', 'hard')
     or p_metric is null or p_metric not in (
       'matches_played', 'matches_won', 'threats_won', 'cards_played',
       'emergency_passed', 'packs_opened', 'duplicates_converted', 'cards_conquered',
       'variants_found', 'variant_wins', 'coop_played', 'coop_won', 'coop_threats', 'coop_stars',
       'raid_played', 'raid_won', 'raid_damage', 'raid_stars')
     or not public.daily_objective_params_valid(p_metric, v_params)
     or p_target is null or p_target not between 1 and 100
     or (p_coins is not null and p_coins not between 0 and 100000)
     or p_packs is null or p_packs not between 0 and 5
     or (p_shards is not null and not public.shard_reward_valid(p_shards)) then
    raise exception 'invalid_objective';
  end if;
  v_shards := coalesce(p_shards, (select d.shards from public.daily_objective_definitions d where d.code = p_code), 0);
  v_random := public.random_variants_spec(p_random_variants);
  if p_card_codes is not null then
    if cardinality(p_card_codes) > 5 then
      raise exception 'invalid_objective';
    end if;
    begin
      select * into v_cards from public.event_reward_cards(p_card_codes);
    exception when raise_exception then
      raise exception 'invalid_objective';
    end;
    v_definition_ids := v_cards.definition_ids;
    v_variant_ids := v_cards.variant_ids;
    v_card_count := cardinality(v_definition_ids);
  else
    v_card_count := coalesce((
      select cardinality(d.card_definition_ids) from public.daily_objective_definitions d where d.code = p_code), 0);
  end if;

  -- No reward at all.
  if p_coins = 0 and p_packs = 0 and v_random is null and v_card_count = 0 and v_shards = 0 then
    raise exception 'invalid_objective';
  end if;

  if p_code is null then
    insert into public.daily_objective_definitions (code, title, difficulty, metric, params, target, coins, packs,
                                                    random_variants, card_definition_ids, card_variant_ids, shards)
    values ('obj_' || substr(md5(gen_random_uuid()::text), 1, 10), v_title, p_difficulty, p_metric, v_params,
            p_target, p_coins, p_packs, v_random, v_definition_ids, v_variant_ids, v_shards);
  else
    update public.daily_objective_definitions d
    set title = v_title, difficulty = p_difficulty, metric = p_metric, params = v_params,
        target = p_target, coins = p_coins, packs = p_packs, random_variants = v_random, shards = v_shards,
        card_definition_ids = case when p_card_codes is null then d.card_definition_ids else v_definition_ids end,
        card_variant_ids = case when p_card_codes is null then d.card_variant_ids else v_variant_ids end
    where d.code = p_code;
    if not found then
      raise exception 'objective_not_found';
    end if;
  end if;

  perform public.check_daily_objectives_enough();
  return public.admin_daily_objectives_payload();
end;
$$;

-- ---------------------------------------------------------------------------
-- Imprese: hunts finished and won, damage, stars (once per Boss and star), Bosses beaten, Bosses of the week
-- ---------------------------------------------------------------------------

alter table public.achievements drop constraint achievements_metric_check;
alter table public.achievements add constraint achievements_metric_check check (metric in (
  'matches_played', 'matches_won', 'comeback_wins', 'upset_rounds', 'close_rounds', 'team_wins', 'modes_won',
  'night_matches', 'characters_owned', 'variants_owned', 'variant_styles', 'cards_conquered', 'cards_lost',
  'duplicates_converted', 'packs_opened', 'daily_packs', 'emergency_passed', 'emergency_perfect_runs',
  'story_missions', 'rare_threats_seen', 'daily_objectives_completed', 'coins_earned', 'level', 'best_streak',
  'registered_before', 'manual', 'variant_styles_complete', 'variant_characters_complete',
  'coop_played', 'coop_won', 'coop_threats', 'coop_stars',
  'raid_played', 'raid_won', 'raid_damage', 'raid_stars', 'raid_bosses', 'raid_weekly'
));

-- Same as in 20261121250000_operations_stage_three.sql, with the hunts.
create or replace function public.achievement_progress(p_user uuid, p_metric text, p_params jsonb, p_since timestamptz)
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
        where d.is_active and d.in_packs
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

    when 'variant_styles_complete', 'variant_characters_complete' then
      -- Styles (or characters) of which the player owns every active variant, among the
      -- characters a player can find.
      select count(*)::integer into v
      from (
        select case p_metric when 'variant_styles_complete' then cv.style else cv.definition_id::text end as grp
        from public.card_variants cv
        join public.card_definitions d on d.id = cv.definition_id
        left join (
          select distinct i.variant_id from public.card_instances i
          where i.owner_id = p_user and i.variant_id is not null
        ) o on o.variant_id = cv.id
        where cv.is_active and public.is_pack_card(d)
        group by 1
        having count(o.variant_id) = count(*)
      ) g;

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

    when 'coop_played', 'coop_won' then
      select count(*)::integer into v
      from public.coop_members m join public.coop_rooms r on r.id = m.room_id
      where m.user_id = p_user and m.xp is not null
        and (p_metric = 'coop_played' or r.status = 'won')
        and (p_since is null or r.finished_at >= p_since);

    when 'coop_threats' then
      select count(*)::integer into v
      from public.coop_threats_stopped(p_user, null) t
      where p_since is null or t.resolved_at >= p_since;

    when 'coop_stars' then
      select count(*)::integer into v from public.coop_stars s
      where s.user_id = p_user and (p_since is null or s.earned_at >= p_since);

    when 'raid_played', 'raid_won' then
      select count(*)::integer into v
      from public.raid_members m join public.raid_rooms r on r.id = m.room_id
      where m.user_id = p_user and m.xp is not null and m.left_at is null
        and (p_metric = 'raid_played' or r.status = 'won')
        and public.raid_member_eligible(m.room_id, m.seat)
        and (p_since is null or r.finished_at >= p_since);

    when 'raid_damage' then
      select coalesce(sum(c.damage), 0)::integer into v
      from public.raid_members m
      join public.raid_rooms r on r.id = m.room_id
      join public.raid_rounds c on c.room_id = r.id
      where m.user_id = p_user and m.xp is not null and m.left_at is null
        and public.raid_member_eligible(m.room_id, m.seat)
        and (p_since is null or r.finished_at >= p_since);

    when 'raid_stars' then
      select count(*)::integer into v from public.raid_stars s
      where s.user_id = p_user and (p_since is null or s.created_at >= p_since);

    when 'raid_bosses' then
      select count(distinct p.boss_id)::integer into v from public.raid_progress p
      where p.user_id = p_user and (p_since is null or p.completed_at >= p_since);

    when 'raid_weekly' then
      select count(*)::integer into v from public.raid_weekly_wins w
      where w.user_id = p_user and (p_since is null or w.created_at >= p_since);

    else
      v := 0; -- 'manual': only an admin gives it.
  end case;
  return coalesce(v, 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- What players read, again: the queue, the Boss of the week, the community's Boss
-- ---------------------------------------------------------------------------

-- Same as in 20261123210000_caccia_grossa_stage_two.sql, with the queue, the week and the community.
create or replace function public.get_raid()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_room uuid;
  v_week date := public.game_week(public.game_day());
  v_weekly uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.raid_close_stale();
  v_room := public.raid_open_room(v_uid);
  v_weekly := public.raid_week_boss(v_week);
  return jsonb_build_object(
    'min_players', public.config_int('raid.min_players'),
    'max_players', public.config_int('raid.max_players'),
    'room', (
      select jsonb_build_object('id', r.id, 'code', r.code, 'status', r.status, 'boss', b.code, 'name', b.name)
      from public.raid_rooms r join public.boss_definitions b on b.id = r.boss_id
      where r.id = v_room
    ),
    -- The public queue, the Boss of the week (its first win of the week pays more), the event's community Boss.
    'queue', public.raid_queue_status(v_uid),
    'week', (
      select jsonb_build_object(
        'week', v_week,
        'ends_at', ((v_week + 7)::timestamp at time zone 'Europe/Rome'),
        'boss', b.code,
        'name', b.name,
        'coins', public.raid_percent(public.config_int('raid.weekly_coins'),
                                     public.config_int('raid.magnitude' || b.raid_magnitude || '.reward_percent')),
        'won', exists (select 1 from public.raid_weekly_wins w where w.user_id = v_uid and w.week = v_week)
      )
      from public.boss_definitions b where b.id = v_weekly
    ),
    'community', public.raid_community_payload(v_uid),
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
        'beaten', exists (select 1 from public.raid_progress p where p.user_id = v_uid and p.boss_id = b.id),
        'weekly', b.id = v_weekly,
        'stars', coalesce((
          select jsonb_agg(s.star order by s.star) from public.raid_stars s where s.user_id = v_uid and s.boss_id = b.id
        ), '[]'::jsonb)
      ) || public.raid_star_rules(b) order by b.raid_magnitude, b.code)
      from public.boss_definitions b
      where b.raid_active
    ), '[]'::jsonb)
  );
end;
$$;

-- Same as in 20261123210000_caccia_grossa_stage_two.sql, with the Boss of the week and what the end paid besides.
create or replace function public.raid_state(p_room uuid)
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
        'beaten', exists (select 1 from public.raid_progress p where p.user_id = v_uid and p.boss_id = b.id),
        'stars', coalesce((
          select jsonb_agg(s.star order by s.star) from public.raid_stars s where s.user_id = v_uid and s.boss_id = b.id
        ), '[]'::jsonb),
        'star_rarities', to_jsonb(b.raid_star_rarities),
        'quick_round', public.config_int('raid.quick_round'),
        'star_coins', public.raid_percent(public.config_int('raid.star_coins'), v_room.reward_percent),
        -- The Boss of this week: its first win of the week pays more.
        'weekly', b.id = public.raid_week_boss(public.game_week(public.game_day(coalesce(v_room.finished_at, now())))),
        'weekly_coins', public.raid_percent(public.config_int('raid.weekly_coins'), v_room.reward_percent)
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
        'coins', m.coins,
        'stars', to_jsonb(m.stars),
        'star_coins', m.star_coins,
        'weekly_coins', m.weekly_coins,
        'community', m.community
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
        -- A modifier move's modifier, whenever its move is shown.
        'modifier', case when c.room_id is not null or v_foreseen -> u.ord::text ->> 'move' is not null
                         then v_room.move_modifiers -> (u.ord::integer - 1) end,
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

-- Same as in 20261123210000_caccia_grossa_stage_two.sql, with the weeks and the events; volatile, as the rotation writes its weeks.
create or replace function public.admin_bosses_payload()
returns jsonb
language sql
volatile
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'bosses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', b.code,
        'name', b.name,
        'flavor', b.flavor,
        'scene', b.scene,
        'gm_active', b.is_active,
        'fronts', (
          select coalesce(jsonb_agg(t.code order by f.slot), '[]'::jsonb)
          from public.boss_fronts f join public.threat_definitions t on t.id = f.threat_id
          where f.boss_id = b.id
        ),
        'raid_active', b.raid_active,
        'raid_district', b.raid_district,
        'raid_magnitude', b.raid_magnitude,
        'raid_moves', to_jsonb(b.raid_moves),
        'raid_vita_percent', b.raid_vita_percent,
        'raid_star_rarities', to_jsonb(b.raid_star_rarities),
        'gm_matches', (select count(*) from public.matches m where m.boss_id = b.id),
        'gm_in_play', exists (select 1 from public.matches m where m.boss_id = b.id and m.status = 'active'),
        -- The hunts finished, by players: how many and how many won (what the Magnitude promises).
        'raid_results', coalesce((
          select jsonb_object_agg(x.players::text, jsonb_build_object('rooms', x.rooms, 'wins', x.wins))
          from (
            select r.players, count(*) as rooms, count(*) filter (where r.status = 'won') as wins
            from public.raid_rooms r
            where r.boss_id = b.id and r.status in ('won', 'lost') and r.players is not null
            group by r.players
          ) x
        ), '{}'::jsonb),
        'raid_in_play', exists (select 1 from public.raid_rooms r where r.boss_id = b.id and r.status in ('lobby', 'active')),
        'in_use', exists (select 1 from public.matches m where m.boss_id = b.id)
               or exists (select 1 from public.raid_rooms r where r.boss_id = b.id)
      ) order by b.code)
      from public.boss_definitions b
    ), '[]'::jsonb),
    'threats', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', t.code, 'name', t.name, 'level', t.level, 'abilities', to_jsonb(t.required_abilities), 'district', t.district
      ) order by t.level, t.code)
      from public.threat_definitions t
      where t.is_active and t.region = 'megara' and t.rarity_code is null and t.modifier_code is null
    ), '[]'::jsonb),
    'rarities', (select jsonb_agg(jsonb_build_object('code', r.code, 'name', r.name) order by r.rank) from public.rarity_definitions r),
    'magnitudes', (
      select jsonb_agg(jsonb_build_object(
        'magnitude', g,
        'forza_percent', public.config_int('raid.magnitude' || g || '.forza_percent'),
        'reward_percent', public.config_int('raid.magnitude' || g || '.reward_percent')
      ) order by g)
      from generate_series(1, 5) g
    ),
    -- This week's Boss and the next three's (an admin may pick them), and the events to come or running with their community Boss.
    'weeks', (
      select jsonb_agg(jsonb_build_object(
        'week', w.week,
        'boss', (select b.code from public.boss_definitions b where b.id = public.raid_week_boss(w.week)),
        'chosen', exists (select 1 from public.raid_weeks x where x.week = w.week and x.chosen_by is not null)
      ) order by w.week)
      from (select public.game_week(public.game_day()) + 7 * g as week from generate_series(0, 3) g) w
    ),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'title', e.title,
        'starts_at', e.starts_at,
        'ends_at', e.ends_at,
        'started', e.starts_at <= now(),
        'community', case when c.event_id is null then null else jsonb_build_object(
          'vita', c.vita, 'coins', c.coins, 'packs', c.packs, 'shards', c.shards,
          'damage', public.raid_community_damage(e.id), 'fallen', c.fallen_at is not null,
          'rewarded', (select count(*) from public.raid_community_rewards r where r.event_id = e.id)
        ) end
      ) order by e.starts_at)
      from public.events e
      left join public.raid_community c on c.event_id = e.id
      where e.is_active and e.ends_at > now()
    ), '[]'::jsonb),
    'levels', jsonb_build_object(
      'one_at_most', public.config_int('match.threat_levels.require_one_at_most'),
      'one_at_least', public.config_int('match.threat_levels.require_one_at_least'),
      'min_sum', public.config_int('match.threat_levels.min_sum'),
      'max_sum', public.config_int('match.threat_levels.max_sum')
    )
  )
$$;

create or replace function public.admin_get_bosses()
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
  return public.admin_bosses_payload();
end;
$$;


-- ---------------------------------------------------------------------------
-- The editor of the Bosses, again: the Boss of the week and the community's Boss
-- ---------------------------------------------------------------------------

-- An admin picks the Boss of a week (its Monday, this week or a later one): it replaces the rotation.
create function public.admin_set_raid_week(p_week date, p_boss text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_week date := public.game_week(p_week);
  v_boss uuid;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if v_week is null or v_week < public.game_week(public.game_day()) then
    raise exception 'raid_week_past' using errcode = '22023';
  end if;
  select id into v_boss from public.boss_definitions where code = p_boss and raid_active;
  if v_boss is null then
    raise exception 'raid_boss_not_found' using errcode = '22023';
  end if;
  insert into public.raid_weeks (week, boss_id, chosen_by) values (v_week, v_boss, auth.uid())
  on conflict (week) do update set boss_id = excluded.boss_id, chosen_by = excluded.chosen_by;
  return public.admin_bosses_payload();
end;
$$;

-- An admin gives an event a community Boss (its Life and reward), or takes it away (null Life),
-- before the event starts: like the event's other rules, it does not change once running.
create function public.admin_set_raid_community(p_event uuid, p_vita integer, p_coins integer, p_packs integer, p_shards integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_event public.events;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  select * into v_event from public.events where id = p_event;
  if not found then
    raise exception 'event_not_found' using errcode = '22023';
  end if;
  if v_event.starts_at <= now() then
    raise exception 'raid_community_started' using errcode = '22023';
  end if;
  if p_vita is null then
    delete from public.raid_community where event_id = p_event;
  else
    if p_vita not between 1 and 100000000 or coalesce(p_coins, 0) not between 0 and 100000
       or coalesce(p_packs, 0) not between 0 and 5 or coalesce(p_shards, 0) not between 0 and 100
       or coalesce(p_coins, 0) + coalesce(p_packs, 0) + coalesce(p_shards, 0) = 0 then
      raise exception 'raid_community_invalid' using errcode = '22023';
    end if;
    insert into public.raid_community (event_id, vita, coins, packs, shards)
    values (p_event, p_vita, coalesce(p_coins, 0), coalesce(p_packs, 0), coalesce(p_shards, 0))
    on conflict (event_id) do update set vita = excluded.vita, coins = excluded.coins, packs = excluded.packs, shards = excluded.shards;
  end if;
  return public.admin_bosses_payload();
end;
$$;

revoke execute on function public.admin_set_raid_week(date, text) from public, anon;
revoke execute on function public.admin_set_raid_community(uuid, integer, integer, integer, integer) from public, anon;
grant execute on function public.admin_set_raid_week(date, text) to authenticated;
grant execute on function public.admin_set_raid_community(uuid, integer, integer, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- The first daily objectives and Imprese of the hunt (placeholder texts; admins change them)
-- ---------------------------------------------------------------------------

insert into public.daily_objective_definitions (code, title, difficulty, metric, params, target, coins, packs, card_definition_ids, card_variant_ids)
values
  ('raid_play', 'Affronta un Boss nella Caccia grossa', 'easy', 'raid_played', '{}', 1, null, 0, '{}', '{}'),
  ('raid_win', 'Abbatti un Boss nella Caccia grossa', 'medium', 'raid_won', '{}', 1, null, 0, '{}', '{}'),
  ('raid_damage_60', 'Infliggi 60 danni ai Boss', 'medium', 'raid_damage', '{}', 60, null, 0, '{}', '{}'),
  ('raid_stars_3', 'Ottieni 3 stelle nella Caccia grossa', 'hard', 'raid_stars', '{}', 3, null, 0, '{}', '{}');

-- After the others on the board, in order of tier; rewards as the editor suggests them.
insert into public.achievements (position, tier, name, description, hint, metric, params, target, coins, packs, title)
select coalesce((select max(a.position) from public.achievements a), 0) + v.ord, v.tier, v.name, v.description, v.hint,
       v.metric, '{}'::jsonb, v.target, v.coins, v.packs, v.title
from (values
  (1, 'bronze', 'Prima preda', 'Hai abbattuto il tuo primo Boss nella Caccia grossa.', 'Insieme, contro uno solo.',
   'raid_won', 1, 50, 0, null),
  (2, 'silver', 'Battuta di caccia', 'Hai abbattuto 10 Boss nella Caccia grossa.', 'Più siete, più è grosso.',
   'raid_won', 10, 150, 0, null),
  (3, 'silver', 'Tre stelle sul trofeo', 'Hai ottenuto 3 stelle nella Caccia grossa.', 'Senza graffi, e in fretta.',
   'raid_stars', 3, 150, 0, null),
  (4, 'gold', 'Il carniere', 'Hai abbattuto 6 Boss diversi nella Caccia grossa.', 'Ogni quartiere ha il suo.',
   'raid_bosses', 6, 0, 2, null),
  (5, 'legend', 'Cacciatore della settimana', 'Hai abbattuto il Boss della settimana in 8 settimane.', 'Ogni lunedì ne arriva un altro.',
   'raid_weekly', 8, 0, 3, 'Cacciatore')
) as v(ord, tier, name, description, hint, metric, target, coins, packs, title);
