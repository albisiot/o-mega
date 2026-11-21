-- Operazioni (SPEC §5.17), third stage: server allies, always declared, who take the empty
-- seats of a room (the host adds them, or the public queue does after the wait), and the
-- public queue «Cerca squadra» per operation. An ally is a member without an account: a name,
-- a face and a squad the server picks; it puts its cards down last, where the team needs them
-- (autoCoopPlacement), and gets no prize. Events, daily objectives and achievements count the
-- operations too (further down).

insert into public.game_config (key, value, description) values
  ('coop.queue_wait_seconds', '25', 'Operazioni: wait in the public queue before the room starts with server allies'),
  ('coop.ally_max_rank', '3', 'Operazioni: rarest rank a server ally fields (3 = Beta)');

-- ---------------------------------------------------------------------------
-- Members without an account: the server allies
-- ---------------------------------------------------------------------------

alter table public.coop_members drop constraint coop_members_pkey;
alter table public.coop_members alter column user_id drop not null;
alter table public.coop_members add column bot_name text check (char_length(bot_name) between 2 and 40);
alter table public.coop_members add column bot_avatar_definition_id uuid references public.card_definitions (id);
alter table public.coop_members add constraint coop_members_pkey primary key (room_id, seat);
alter table public.coop_members add constraint coop_members_bot_shape check ((user_id is null) = (bot_name is not null));
create unique index coop_members_room_user_idx on public.coop_members (room_id, user_id) where user_id is not null;
create index coop_members_bot_avatar_idx on public.coop_members (bot_avatar_definition_id);

-- Plays name their seat; an ally's play has no user.
alter table public.coop_plays add column seat integer;
update public.coop_plays p set seat = m.seat from public.coop_members m where m.room_id = p.room_id and m.user_id = p.user_id;
alter table public.coop_plays alter column seat set not null;
alter table public.coop_plays add constraint coop_plays_seat_check check (seat between 1 and 4);
alter table public.coop_plays drop constraint coop_plays_pkey;
alter table public.coop_plays alter column user_id drop not null;
alter table public.coop_plays add constraint coop_plays_pkey primary key (room_id, round, card_instance_id);

-- How the engine names a member: the user id, or "bot-<seat>" for an ally.
create function public.coop_member_key(p_user uuid, p_seat integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_user::text, 'bot-' || p_seat)
$$;

-- A squad for an ally: six different characters the packs can give, up to coop.ally_max_rank,
-- the strongest of a random two dozen (values squared, as the bots weigh them, SPEC §5.9).
create function public.coop_ally_squad()
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
      where public.is_pack_card(d) and r.rank <= public.config_int('coop.ally_max_rank')
      order by random()
      limit 24
    ) p
    order by p.strength desc
    limit 6
  ) s
$$;

-- Seats an ally in the first free seat of a room: a Reggente name not taken in the room, a face
-- from its squad, Pronto at once. Returns the seat, or null when the room is full.
create function public.coop_seat_ally(p_room uuid)
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
  if (select count(*) from public.coop_members where room_id = p_room) >= public.config_int('coop.max_players') then
    return null;
  end if;
  select min(s) into v_seat from generate_series(1, 4) as s
  where not exists (select 1 from public.coop_members where room_id = p_room and seat = s);
  v_squad := public.coop_ally_squad();
  select n into v_name
  from unnest(array['Reggente Bruni', 'Reggente Leone', 'Reggente Sartori', 'Reggente Valli', 'Reggente Fabbri', 'Reggente Neri',
                    'Reggente Galli', 'Reggente Moretti']) as n
  where not exists (select 1 from public.coop_members m where m.room_id = p_room and m.bot_name = n)
  order by random()
  limit 1;
  insert into public.coop_members (room_id, user_id, seat, bot_name, bot_avatar_definition_id, card_instance_ids, definition_ids, ready)
  values (p_room, null, v_seat, v_name, v_squad[1], (select array_agg(gen_random_uuid()) from unnest(v_squad)), v_squad, true);
  return v_seat;
end;
$$;

revoke execute on function public.coop_member_key(uuid, integer) from public, anon, authenticated;
revoke execute on function public.coop_ally_squad() from public, anon, authenticated;
revoke execute on function public.coop_seat_ally(uuid) from public, anon, authenticated;

-- The host adds a server ally to a waiting room, or takes one away.
create function public.coop_add_ally(p_room uuid)
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
  if v_room.status <> 'lobby' then
    raise exception 'coop_already_started';
  end if;
  if v_room.host <> v_uid then
    raise exception 'coop_not_host';
  end if;
  if public.coop_seat_ally(p_room) is null then
    raise exception 'coop_room_full';
  end if;
  update public.coop_rooms set touched_at = now() where id = p_room;
  perform public.coop_notify(p_room, 'ally');
end;
$$;

create function public.coop_remove_ally(p_room uuid, p_seat integer)
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
  if v_room.status <> 'lobby' then
    raise exception 'coop_already_started';
  end if;
  if v_room.host <> v_uid then
    raise exception 'coop_not_host';
  end if;
  delete from public.coop_members where room_id = p_room and seat = p_seat and user_id is null;
  update public.coop_rooms set touched_at = now() where id = p_room;
  perform public.coop_notify(p_room, 'ally');
end;
$$;

revoke execute on function public.coop_add_ally(uuid) from public, anon;
revoke execute on function public.coop_remove_ally(uuid, integer) from public, anon;
grant execute on function public.coop_add_ally(uuid) to authenticated;
grant execute on function public.coop_remove_ally(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- The public queue «Cerca squadra»: one per operation
-- ---------------------------------------------------------------------------

create table public.coop_queue (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  operation_id uuid not null references public.coop_operations (id) on delete cascade,
  card_instance_ids uuid[] not null,
  definition_ids uuid[] not null,
  joined_at timestamptz not null default now(),
  -- The last time the player asked (coop_queue_poll): who stops asking has left the queue.
  polled_at timestamptz not null default now()
);

create index coop_queue_operation_idx on public.coop_queue (operation_id, joined_at);

alter table public.coop_queue enable row level security;
revoke all on table public.coop_queue from anon, authenticated;
grant select on table public.coop_queue to service_role;

-- The definitions of a squad a player brings, checked as coop_set_squad does.
create function public.coop_squad_definitions(p_user uuid, p_card_instance_ids uuid[])
returns uuid[]
language plpgsql
stable
set search_path = ''
as $$
declare
  v_size integer := public.config_int('coop.squad_size');
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

-- Makes a room of the queue of an operation when it is time: as soon as a full room is
-- waiting, or once the first player has waited coop.queue_wait_seconds, with whoever is
-- there (the earliest first, at most coop.max_players) and server allies up to
-- coop.min_players. The room starts at once: everyone chose a squad to queue.
create function public.coop_queue_match(p_operation uuid)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_users uuid[];
  v_oldest timestamptz;
  v_room uuid;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('o-mega.coop-queue'));
  -- Who has not asked for a while has closed the page: out of the queue.
  delete from public.coop_queue where polled_at < now() - interval '15 seconds';
  select array_agg(q.user_id order by q.joined_at), min(q.joined_at) into v_users, v_oldest
  from (
    select user_id, joined_at from public.coop_queue
    where operation_id = p_operation order by joined_at limit public.config_int('coop.max_players')
  ) q;
  if v_users is null then
    return null;
  end if;
  if cardinality(v_users) < public.config_int('coop.max_players')
     and v_oldest > now() - make_interval(secs => public.config_int('coop.queue_wait_seconds')) then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtext('o-mega.coop-codes'));
  loop
    v_code := (
      select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1), '')
      from generate_series(1, 6)
    );
    exit when not exists (select 1 from public.coop_rooms where code = v_code and status = 'lobby');
  end loop;
  insert into public.coop_rooms (code, operation_id, host) values (v_code, p_operation, v_users[1]) returning id into v_room;
  insert into public.coop_members (room_id, user_id, seat, card_instance_ids, definition_ids, ready)
  select v_room, q.user_id, u.ord, q.card_instance_ids, q.definition_ids, true
  from unnest(v_users) with ordinality as u(id, ord)
  join public.coop_queue q on q.user_id = u.id;
  delete from public.coop_queue where user_id = any (v_users);
  select count(*) into v_count from public.coop_members where room_id = v_room;
  while v_count < public.config_int('coop.min_players') loop
    perform public.coop_seat_ally(v_room);
    v_count := v_count + 1;
  end loop;

  update public.coop_rooms set status = 'active', players = v_count, started_at = now() where id = v_room;
  perform public.coop_open_round(v_room, 1);
  -- The players in the queue hear of the room at once (they also ask every few seconds).
  perform realtime.send(jsonb_build_object('kind', 'coop', 'room_id', v_room), 'update', 'player:' || u.id, false)
  from unnest(v_users) as u(id);
  return v_room;
end;
$$;

-- Where the player is in the queue: the operation, since when, how many wait for it, and the
-- room once the queue made one. Asking also makes the room when it is time.
create function public.coop_queue_status(p_user uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'queued', q.user_id is not null,
    'operation', o.code,
    'title', o.title,
    'joined_at', q.joined_at,
    'waiting', (select count(*) from public.coop_queue x where x.operation_id = q.operation_id),
    'wait_seconds', public.config_int('coop.queue_wait_seconds'),
    'max_players', public.config_int('coop.max_players'),
    'room', public.coop_open_room(p_user),
    'server_now', now()
  )
  from (select 1) one
  left join public.coop_queue q on q.user_id = p_user
  left join public.coop_operations o on o.id = q.operation_id
$$;

create function public.coop_queue_join(p_operation text, p_card_instance_ids uuid[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_operation public.coop_operations;
  v_definitions uuid[];
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
  v_definitions := public.coop_squad_definitions(v_uid, p_card_instance_ids);
  insert into public.coop_queue (user_id, operation_id, card_instance_ids, definition_ids)
  values (v_uid, v_operation.id, p_card_instance_ids, v_definitions)
  on conflict (user_id) do update
  set operation_id = excluded.operation_id, card_instance_ids = excluded.card_instance_ids,
      definition_ids = excluded.definition_ids, joined_at = now(), polled_at = now();
  perform public.coop_queue_match(v_operation.id);
  return public.coop_queue_status(v_uid);
end;
$$;

create function public.coop_queue_poll()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_operation uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  update public.coop_queue set polled_at = now() where user_id = v_uid returning operation_id into v_operation;
  if v_operation is not null then
    perform public.coop_queue_match(v_operation);
  end if;
  return public.coop_queue_status(v_uid);
end;
$$;

create function public.coop_queue_leave()
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
  delete from public.coop_queue where user_id = auth.uid();
end;
$$;

revoke execute on function public.coop_squad_definitions(uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.coop_queue_match(uuid) from public, anon, authenticated;
revoke execute on function public.coop_queue_status(uuid) from public, anon, authenticated;
revoke execute on function public.coop_queue_join(text, uuid[]) from public, anon;
revoke execute on function public.coop_queue_poll() from public, anon;
revoke execute on function public.coop_queue_leave() from public, anon;
grant execute on function public.coop_queue_join(text, uuid[]) to authenticated;
grant execute on function public.coop_queue_poll() to authenticated;
grant execute on function public.coop_queue_leave() to authenticated;

-- Opening or joining a room takes the player out of the queue.
create function public.coop_members_leave_queue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null then
    delete from public.coop_queue where user_id = new.user_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.coop_members_leave_queue() from public, anon, authenticated;

create trigger coop_members_leave_queue
  after insert on public.coop_members
  for each row execute function public.coop_members_leave_queue();

-- ---------------------------------------------------------------------------
-- The functions that read and record a room, again: allies are members too
-- ---------------------------------------------------------------------------

-- Allies place nothing themselves and are always ready: Pronto is cleared for people only.
create or replace function public.coop_open_round(p_room uuid, p_round integer)
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
  update public.coop_members set ready = false, placement = null, placed_round = null where room_id = p_room and user_id is not null;
end;
$$;

-- The last person who leaves loses the operation; allies do not keep it going.
create or replace function public.coop_leave_room(p_room uuid)
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
    if not exists (select 1 from public.coop_members where room_id = p_room and left_at is null and user_id is not null) then
      update public.coop_rooms set status = 'lost', finished_at = now() where id = p_room;
    end if;
  end if;
  perform public.coop_notify(p_room, 'left');
end;
$$;

-- As before, with allies: a member is a user or "bot-<seat>"; plays carry their seat.
create or replace function public.coop_round_context(p_user uuid, p_room uuid)
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
      where m.room_id = r.id and m.left_at is null and m.user_id is not null and not (m.ready and m.placed_round = r.current_round)
    ),
    'members', (
      select jsonb_agg(jsonb_build_object(
        'user_id', public.coop_member_key(m.user_id, m.seat),
        'bot', m.user_id is null,
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
            'player', public.coop_member_key(p.user_id, p.seat), 'characterId', p.card_instance_id, 'slot', p.slot, 'role', p.role,
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

-- As before: allies play where the engine puts them (never placed, so always the server's);
-- prizes and XP only for people.
create or replace function public.coop_record_round(p_room uuid, p_round integer, p_record jsonb)
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
  v_seat integer;
  v_user uuid;
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
    where m.room_id = p_room and m.left_at is null and m.user_id is not null and not (m.ready and m.placed_round = p_round)
  );
  if not v_ready and now() <= v_round.deadline_at + make_interval(secs => public.config_int('match.timeout_grace_seconds')) then
    raise exception 'round_not_expired';
  end if;

  -- The cards of every member: as placed, or put down by the server for who placed nothing.
  v_count := case when v_round.boss then public.config_int('coop.boss_cards') else 1 end;
  for v_member in select * from public.coop_members where room_id = p_room order by seat loop
    if (select count(*) from jsonb_array_elements(p_record -> 'plays') e where (e ->> 'player') = public.coop_member_key(v_member.user_id, v_member.seat)) <> v_count then
      raise exception 'coop_invalid_round';
    end if;
    if exists (
      select 1 from jsonb_array_elements(p_record -> 'plays') e
      where (e ->> 'player') = public.coop_member_key(v_member.user_id, v_member.seat)
        and (not ((e ->> 'characterId')::uuid = any (v_member.card_instance_ids))
             or exists (select 1 from public.coop_plays p
                        where p.room_id = p_room and p.seat = v_member.seat and p.card_instance_id = (e ->> 'characterId')::uuid))
    ) then
      raise exception 'coop_invalid_round';
    end if;
    if v_member.placed_round = p_round and v_member.placement is not null then
      -- The own cards of the member, where they were put, and not put down by the server.
      if exists (
        select 1 from jsonb_array_elements(v_member.placement) pl
        where not exists (
          select 1 from jsonb_array_elements(p_record -> 'plays') e
          where (e ->> 'player') = public.coop_member_key(v_member.user_id, v_member.seat) and (e ->> 'characterId') = (pl ->> 'card')
            and (e ->> 'slot')::integer = (pl ->> 'slot')::integer and not (e ->> 'autoPlayed')::boolean
        )
      ) then
        raise exception 'coop_placement_changed';
      end if;
    elsif exists (
      select 1 from jsonb_array_elements(p_record -> 'plays') e
      where (e ->> 'player') = public.coop_member_key(v_member.user_id, v_member.seat) and not (e ->> 'autoPlayed')::boolean
    ) then
      raise exception 'coop_invalid_round';
    end if;
  end loop;
  if exists (
    select 1 from jsonb_array_elements(p_record -> 'plays') e
    where not exists (select 1 from public.coop_members m where m.room_id = p_room and public.coop_member_key(m.user_id, m.seat) = (e ->> 'player'))
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
    select m.definition_ids[array_position(m.card_instance_ids, (v_play ->> 'characterId')::uuid)], m.seat, m.user_id
    into v_definition, v_seat, v_user
    from public.coop_members m where m.room_id = p_room and public.coop_member_key(m.user_id, m.seat) = (v_play ->> 'player');
    insert into public.coop_plays (
      room_id, round, user_id, seat, card_instance_id, definition_id, slot, role,
      base_score, bonus, score, highest_value, auto_played, parts
    ) values (
      p_room, p_round, v_user, v_seat, (v_play ->> 'characterId')::uuid, v_definition,
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
  if v_room.panic >= public.coop_panic_limit(v_room.players) then
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
    for v_member in select * from public.coop_members where room_id = p_room and left_at is null and user_id is not null loop
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

-- As before, with the allies among the members (`bot`, their name and face) and every play's seat.
create or replace function public.coop_state(p_room uuid)
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
  v_foreseen jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_room from public.coop_rooms where id = p_room;
  if not found or not exists (select 1 from public.coop_members where room_id = p_room and user_id = v_uid) then
    raise exception 'coop_room_not_found';
  end if;
  update public.coop_members set last_seen_at = now() where room_id = p_room and user_id = v_uid and left_at is null;
  v_players := coalesce(v_room.players, greatest(
    (select count(*) from public.coop_members where room_id = p_room)::integer,
    public.config_int('coop.min_players')
  ));
  v_foreseen := public.coop_foreseen(p_room);

  return jsonb_build_object(
    'id', v_room.id,
    'code', v_room.code,
    'status', v_room.status,
    'players', v_players,
    'max_players', public.config_int('coop.max_players'),
    'current_round', v_room.current_round,
    'panic', v_room.panic,
    'panic_limit', public.coop_panic_limit(v_players),
    'server_now', now(),
    'me', v_uid,
    'host', v_room.host,
    'operation', (
      select jsonb_build_object(
        'code', o.code, 'title', o.title, 'intro', o.intro,
        'outro', case when v_room.status = 'won' then o.outro end,
        'rival_name', o.rival_name, 'boss_name', o.boss_name, 'reward_coins', o.reward_coins,
        'reward_card', case when o.reward_definition_id is null then null else public.card_payload(o.reward_definition_id) end,
        'completed', exists (select 1 from public.coop_progress p where p.user_id = v_uid and p.operation_id = o.id),
        'stars', coalesce((
          select jsonb_agg(s.star order by s.star) from public.coop_stars s where s.user_id = v_uid and s.operation_id = o.id
        ), '[]'::jsonb)
      ) || public.coop_star_rules_payload(o)
      from public.coop_operations o where o.id = v_room.operation_id
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
          select jsonb_agg(p.card_instance_id) from public.coop_plays p where p.room_id = p_room and p.seat = m.seat
        ), '[]'::jsonb),
        'placement', case when m.placed_round = v_room.current_round then m.placement end,
        'xp', m.xp,
        'coins', m.coins,
        'stars', to_jsonb(m.stars),
        'star_coins', m.star_coins,
        'reward_card', case when m.reward_card_instance_id is null then null else (
          select public.card_payload(i.definition_id, i.id) from public.card_instances i where i.id = m.reward_card_instance_id
        ) end
      ) order by m.seat)
      from public.coop_members m
      left join public.profiles pr on pr.id = m.user_id
      where m.room_id = p_room
    ),
    'all_ready', v_room.status = 'active' and not exists (
      select 1 from public.coop_members m
      where m.room_id = p_room and m.left_at is null and m.user_id is not null and not (m.ready and m.placed_round = v_room.current_round)
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
        'foreseen', case when c.room_id is null then v_foreseen -> w.round::text end,
        'resolved', c.resolved_at is not null,
        'results', c.results,
        'panic', c.panic,
        'eco', case when c.eco_definition_id is null then null else
          public.card_payload(c.eco_definition_id) || jsonb_build_object('score', c.eco_score) end,
        'plays', case when c.resolved_at is null then null else (
          select jsonb_agg(jsonb_build_object(
            'user_id', p.user_id, 'seat', p.seat, 'instance_id', p.card_instance_id, 'definition_id', p.definition_id, 'slot', p.slot,
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

-- Stars only for people.
create or replace function public.coop_grant_stars()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operation public.coop_operations;
  v_member public.coop_members;
  v_stars text[];
  v_star text;
  v_new integer;
begin
  if new.status <> 'won' or old.status = 'won' then
    return new;
  end if;
  select * into v_operation from public.coop_operations where id = new.operation_id;
  for v_member in select * from public.coop_members where room_id = new.id and left_at is null and user_id is not null loop
    v_stars := public.coop_member_stars(new.id, v_member.user_id);
    v_new := 0;
    foreach v_star in array v_stars loop
      insert into public.coop_stars (user_id, operation_id, star, room_id, coins)
      values (v_member.user_id, new.operation_id, v_star, new.id, v_operation.star_coins)
      on conflict do nothing;
      if found then
        v_new := v_new + 1;
      end if;
    end loop;
    if v_new > 0 and v_operation.star_coins > 0 then
      insert into public.coin_ledger (user_id, amount, reason, ref_id)
      values (v_member.user_id, v_new * v_operation.star_coins, 'coop_star', new.id);
    end if;
    update public.coop_members set stars = v_stars, star_coins = v_new * v_operation.star_coins
    where room_id = new.id and user_id = v_member.user_id;
  end loop;
  return new;
end;
$$;

-- As before, and the queue the player waits in.
create or replace function public.get_coop()
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
    -- The public queue the player waits in, if any.
    'queue', case when exists (select 1 from public.coop_queue q where q.user_id = v_uid) then public.coop_queue_status(v_uid) end,
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
            'stars', coalesce((
              select jsonb_agg(s.star order by s.star) from public.coop_stars s where s.user_id = v_uid and s.operation_id = o.id
            ), '[]'::jsonb),
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
          ) || public.coop_star_rules_payload(o) order by o.ord)
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

-- ---------------------------------------------------------------------------
-- Events, daily objectives and Imprese count the operations (SPEC §8.2, §8.3, §8.5)
-- ---------------------------------------------------------------------------

-- The threats a player stopped with the lead card they chose (not one the timer put down),
-- in the operations they finished; p_room null: every room.
create function public.coop_threats_stopped(p_user uuid, p_room uuid)
returns table (room_id uuid, round integer, slot integer, resolved_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select p.room_id, p.round, p.slot, c.resolved_at
  from public.coop_plays p
  join public.coop_rounds c on c.room_id = p.room_id and c.round = p.round
  join public.coop_members m on m.room_id = p.room_id and m.user_id = p.user_id
  where p.user_id = p_user and (p_room is null or p.room_id = p_room)
    and p.role = 'lead' and not p.auto_played and m.xp is not null
    and exists (
      select 1 from jsonb_array_elements(c.results) e
      where (e ->> 'slot')::integer = p.slot and (e ->> 'stopped')::boolean
    )
$$;

revoke execute on function public.coop_threats_stopped(uuid, uuid) from public, anon, authenticated;

-- Event points: "coop" pays an operation finished (won or lost) and each threat the player
-- stopped as the lead, as Emergenza pays each threat passed.
alter table public.event_points drop constraint event_points_kind_check;
alter table public.event_points add constraint event_points_kind_check
  check (kind in ('friendly', 'conquest', 'bot', 'story', 'emergency', 'coop'));

-- Same as in 20261109200000_timed_events.sql, with the operations.
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
                    "coop": ["win", "loss", "passed"]}';
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

-- Same as in 20261118200000_emergency_week.sql: the squad of 6 of an operation too.
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
    '{}'
  )
$$;

-- Same as in 20261118234000_variant_counts.sql: the squad of 6 of an operation too.
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
      '{}'
    ))
$$;

-- Daily objectives: operations finished, won, threats stopped, stars met in a win (replays too).
alter table public.daily_objective_definitions drop constraint daily_objective_definitions_metric_check;
alter table public.daily_objective_definitions add constraint daily_objective_definitions_metric_check check (metric in (
  'matches_played', 'matches_won', 'threats_won', 'cards_played',
  'emergency_passed', 'packs_opened', 'duplicates_converted', 'cards_conquered',
  'variants_found', 'variant_wins', 'coop_played', 'coop_won', 'coop_threats', 'coop_stars'
));

-- Same as in 20261119200000_shard_rewards.sql, with the metrics of the operations.
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
       'variants_found', 'variant_wins', 'coop_played', 'coop_won', 'coop_threats', 'coop_stars')
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

-- Imprese: the same four, stars counted once each (operation and star).
alter table public.achievements drop constraint achievements_metric_check;
alter table public.achievements add constraint achievements_metric_check check (metric in (
  'matches_played', 'matches_won', 'comeback_wins', 'upset_rounds', 'close_rounds', 'team_wins', 'modes_won',
  'night_matches', 'characters_owned', 'variants_owned', 'variant_styles', 'cards_conquered', 'cards_lost',
  'duplicates_converted', 'packs_opened', 'daily_packs', 'emergency_passed', 'emergency_perfect_runs',
  'story_missions', 'rare_threats_seen', 'daily_objectives_completed', 'coins_earned', 'level', 'best_streak',
  'registered_before', 'manual', 'variant_styles_complete', 'variant_characters_complete',
  'coop_played', 'coop_won', 'coop_threats', 'coop_stars'
));

-- Same as in 20261119240000_held_back_cards.sql, with the operations.
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

    else
      v := 0; -- 'manual': only an admin gives it.
  end case;
  return coalesce(v, 0);
end;
$$;

-- A player finished an operation, still in the room (coop_record_round writes their XP, after
-- the stars and the progress): event points, daily objectives and Imprese. Rooms left or gone
-- stale never get here, as abandoned matches give nothing.
create function public.coop_member_finished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.coop_rooms;
  v_threat record;
  v_threats integer := 0;
begin
  if old.xp is not null or new.xp is null or new.user_id is null then
    return new;
  end if;
  select * into v_room from public.coop_rooms where id = new.room_id;
  perform public.award_event_points(new.user_id, 'coop', case when v_room.status = 'won' then 'win' else 'loss' end,
                                    new.room_id, 0, null, v_room.started_at);
  for v_threat in select t.round, t.slot from public.coop_threats_stopped(new.user_id, new.room_id) t order by t.round, t.slot loop
    v_threats := v_threats + 1;
    -- One row per threat (round and slot), never 0: that is the operation's own row.
    perform public.award_event_points(new.user_id, 'coop', 'passed', new.room_id,
                                      v_threat.round * 10 + v_threat.slot, null, v_room.started_at);
  end loop;
  perform public.advance_daily_objectives(new.user_id, 'coop_played', 1);
  if v_room.status = 'won' then
    perform public.advance_daily_objectives(new.user_id, 'coop_won', 1);
  end if;
  perform public.advance_daily_objectives(new.user_id, 'coop_threats', v_threats);
  perform public.advance_daily_objectives(new.user_id, 'coop_stars', coalesce(cardinality(new.stars), 0));
  perform public.check_achievements(new.user_id, array['coop_played', 'coop_won', 'coop_threats', 'coop_stars']);
  return new;
end;
$$;

revoke execute on function public.coop_member_finished() from public, anon, authenticated;

create trigger coop_members_finished
  after update of xp on public.coop_members
  for each row execute function public.coop_member_finished();
