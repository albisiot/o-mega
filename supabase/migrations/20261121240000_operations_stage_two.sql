-- Operazioni (SPEC §5.17), second stage: rooms of up to 4 players, the three stars of every
-- operation (each paid once per player), Veggente, Presagio and Oracolo for the whole team,
-- and the operations editor for admins. The rules of a round do not change.

update public.game_config set value = '4' where key = 'coop.max_players';
-- The result of a round is told on the map, a comic page per threat: more time before the next timer.
update public.game_config set value = '40' where key = 'coop.reveal_pause_seconds';

-- More players cover more threats: from three players on, the Panic that fails the operation is
-- lower (SPEC §5.17, tuned with scripts/simulate-coop.mts: 10 suits both three and four).
insert into public.game_config (key, value, description) values
  ('coop.panic_limit_crowd', '10', 'Operazioni: Panic that fails the operation from three players on');

create function public.coop_panic_limit(p_players integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select public.config_int(case when coalesce(p_players, 2) <= 2 then 'coop.panic_limit' else 'coop.panic_limit_crowd' end)
$$;

revoke execute on function public.coop_panic_limit(integer) from public, anon, authenticated;

-- As before, with the Panic limit of the room's number of players.
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


alter table public.coin_ledger drop constraint coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in (
  'pack_purchase', 'match_reward', 'bot_match_reward', 'duplicate_conversion', 'conquest_bonus', 'level_reward',
  'emergency_reward', 'bonus_code', 'story_reward', 'story_star', 'event_reward', 'objective_reward', 'achievement_reward',
  'emergency_prize', 'ranked_prize', 'emergency_week_reward', 'emergency_week_prize', 'admin_adjustment', 'challenge_reward',
  'coop_reward', 'coop_star'
));

-- ---------------------------------------------------------------------------
-- Stars: calm (Panic at most star_panic), boss (every front broken), squad (every
-- member's squad within the rarities and the traits). Any win earns them, replays too.
-- ---------------------------------------------------------------------------

alter table public.coop_operations
  add column star_panic integer not null default 4 check (star_panic between 0 and 30),
  add column star_rarities text[] not null default '{}',
  add column star_traits text[] not null default '{}',
  add column star_coins integer not null default 20 check (star_coins between 0 and 1000);

alter table public.coop_members
  add column stars text[],
  add column star_coins integer;

create table public.coop_stars (
  user_id uuid not null references public.profiles (id) on delete cascade,
  operation_id uuid not null references public.coop_operations (id) on delete cascade,
  star text not null check (star in ('calm', 'boss', 'squad')),
  room_id uuid not null references public.coop_rooms (id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  earned_at timestamptz not null default now(),
  primary key (user_id, operation_id, star)
);

create index coop_stars_operation_id_idx on public.coop_stars (operation_id);
create index coop_stars_room_id_idx on public.coop_stars (room_id);

alter table public.coop_stars enable row level security;
revoke all on table public.coop_stars from anon, authenticated;
grant select on table public.coop_stars to service_role;

-- Chapter 1: the squad star on the rarities, the calm one a little harder each operation.
update public.coop_operations set star_rarities = '{delta,gamma}', star_panic = 4 where code = 'O1M1';
update public.coop_operations set star_rarities = '{delta,gamma,beta}', star_panic = 5 where code = 'O1M2';
update public.coop_operations set star_rarities = '{delta,gamma,beta,alfa}', star_panic = 6 where code = 'O1M3';

-- The stars a member of a won room meets.
create function public.coop_member_stars(p_room uuid, p_user uuid)
returns text[]
language plpgsql
stable
set search_path = ''
as $$
declare
  v_room public.coop_rooms;
  v_operation public.coop_operations;
  v_definitions uuid[];
  v_boss jsonb;
  v_stars text[] := '{}';
begin
  select * into v_room from public.coop_rooms where id = p_room;
  if v_room.status is distinct from 'won' then
    return v_stars;
  end if;
  select * into v_operation from public.coop_operations where id = v_room.operation_id;
  select m.definition_ids into v_definitions from public.coop_members m where m.room_id = p_room and m.user_id = p_user;

  if v_room.panic <= v_operation.star_panic then
    v_stars := array_append(v_stars, 'calm');
  end if;
  select c.results into v_boss from public.coop_rounds c where c.room_id = p_room and c.boss and c.resolved_at is not null;
  if v_boss is not null and not exists (select 1 from jsonb_array_elements(v_boss) e where not (e ->> 'stopped')::boolean) then
    v_stars := array_append(v_stars, 'boss');
  end if;
  if (cardinality(v_operation.star_rarities) > 0 or cardinality(v_operation.star_traits) > 0)
     and (cardinality(v_operation.star_rarities) = 0 or public.story_team_has_rarities(v_definitions, v_operation.star_rarities))
     and (cardinality(v_operation.star_traits) = 0 or public.story_team_has_traits(v_definitions, v_operation.star_traits)) then
    v_stars := array_append(v_stars, 'squad');
  end if;
  return v_stars;
end;
$$;

-- When a room is won: every member still in gets the stars met, each paid the first time.
create function public.coop_grant_stars()
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
  for v_member in select * from public.coop_members where room_id = new.id and left_at is null loop
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

create trigger coop_rooms_grant_stars
  after update of status on public.coop_rooms
  for each row execute function public.coop_grant_stars();

-- How players read the stars of an operation: the calm star's Panic, the coins, the squad rules.
create function public.coop_star_rules_payload(p_operation public.coop_operations)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('star_panic', p_operation.star_panic, 'star_coins', p_operation.star_coins)
    || public.story_star_rules_payload(p_operation.star_rarities, p_operation.star_traits)
$$;

revoke execute on function public.coop_member_stars(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.coop_grant_stars() from public, anon, authenticated;
revoke execute on function public.coop_star_rules_payload(public.coop_operations) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Veggente, Presagio, Oracolo: what they show, they show the whole team (SPEC §5.17).
-- ---------------------------------------------------------------------------

-- The threats of the rounds not reached yet that the team's powers show, by round:
-- Veggente once played (every later round), its short variant (the next K), Presagio
-- while in a squad and not played (the next round), Oracolo in a squad (the threats of
-- the operation's highest level). Each says which power showed it.
create function public.coop_foreseen(p_room uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_room public.coop_rooms;
  v_all integer;
  v_short integer;
  v_omen integer;
  v_top integer;
begin
  select * into v_room from public.coop_rooms where id = p_room;
  if v_room.status is distinct from 'active' then
    return '{}'::jsonb;
  end if;
  select min(p.round) into v_all
  from public.coop_plays p join public.card_definitions d on d.id = p.definition_id
  where p.room_id = p_room and d.power_code = 'foresight';
  select max(p.round + coalesce((d.power_params ->> 'count')::integer, 0)) into v_short
  from public.coop_plays p join public.card_definitions d on d.id = p.definition_id
  where p.room_id = p_room and d.power_code = 'foresight_short';
  if exists (
    select 1
    from public.coop_members m
    cross join lateral unnest(m.card_instance_ids, m.definition_ids) as u(id, def)
    join public.card_definitions d on d.id = u.def
    where m.room_id = p_room and d.power_code = 'omen'
      and not exists (select 1 from public.coop_plays p where p.room_id = p_room and p.card_instance_id = u.id)
  ) then
    v_omen := v_room.current_round + 1;
  end if;
  if exists (
    select 1
    from public.coop_members m
    cross join lateral unnest(m.definition_ids) as u(def)
    join public.card_definitions d on d.id = u.def
    where m.room_id = p_room and d.power_code = 'oracle'
  ) then
    select max(t.level) into v_top
    from public.coop_operation_rounds w
    cross join lateral unnest(w.threat_ids[1:v_room.players + 1]) as u(id)
    join public.threat_definitions t on t.id = u.id
    where w.operation_id = v_room.operation_id;
  end if;

  return coalesce((
    select jsonb_object_agg(x.round::text, x.threats)
    from (
      select w.round, jsonb_agg(jsonb_build_object(
        'slot', u.ord - 1,
        'name', t.name,
        'level', t.level,
        'abilities', to_jsonb(t.required_abilities),
        'seen_by', (
          select string_agg(distinct s.name, ' e ')
          from unnest(array[
            case when v_all is not null and w.round > v_all then 'foresight' end,
            case when v_short is not null and w.round <= v_short then 'foresight_short' end,
            case when w.round = v_omen then 'omen' end,
            case when t.level = v_top then 'oracle' end
          ]) as c(code)
          join public.power_definitions s on s.code = c.code
        )
      ) order by u.ord) as threats
      from public.coop_operation_rounds w
      cross join lateral unnest(w.threat_ids[1:v_room.players + 1]) with ordinality as u(id, ord)
      join public.threat_definitions t on t.id = u.id
      where w.operation_id = v_room.operation_id and w.round > v_room.current_round
        and ((v_all is not null and w.round > v_all) or (v_short is not null and w.round <= v_short)
             or w.round = v_omen or t.level = v_top)
      group by w.round
    ) x
  ), '{}'::jsonb);
end;
$$;

revoke execute on function public.coop_foreseen(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- What players read, again: the stars, the foreseen threats, the levels of a full room
-- ---------------------------------------------------------------------------

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

-- As before, and: before the start the levels of a room with at least the players needed;
-- the operation's star rules and the player's stars; each member's stars at the end; for
-- every round not reached yet, the threats the team's powers show (`foreseen`).
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
        'stars', to_jsonb(m.stars),
        'star_coins', m.star_coins,
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
        'foreseen', case when c.room_id is null then v_foreseen -> w.round::text end,
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

-- ---------------------------------------------------------------------------
-- The editor (admins only, SPEC §5.17): chapters and operations, checked on the server.
-- ---------------------------------------------------------------------------

-- Everything the editor shows: chapters, operations with codes instead of ids, how many
-- rooms played each and whether one is under way, and the threats an operation may use.
create function public.admin_coop_payload()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'rounds', public.config_int('coop.city_rounds') + 1,
    'panic_limit', public.config_int('coop.panic_limit'),
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object('chapter', c.chapter, 'title', c.title, 'intro', c.intro, 'outro', c.outro) order by c.chapter)
      from public.coop_chapters c
    ), '[]'::jsonb),
    'operations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', o.code, 'chapter', o.chapter, 'ord', o.ord, 'title', o.title, 'intro', o.intro, 'outro', o.outro,
        'rival_name', o.rival_name, 'boss_name', o.boss_name,
        'rival', (
          select jsonb_agg(d.code order by u.ord)
          from unnest(o.rival_definition_ids) with ordinality as u(id, ord) join public.card_definitions d on d.id = u.id
        ),
        'reward_coins', o.reward_coins,
        'reward_card', (select d.code from public.card_definitions d where d.id = o.reward_definition_id),
        'star_panic', o.star_panic, 'star_rarities', to_jsonb(o.star_rarities), 'star_traits', to_jsonb(o.star_traits),
        'star_coins', o.star_coins,
        'rounds', (
          select jsonb_agg(jsonb_build_object(
            'threats', (
              select jsonb_agg(t.code order by u.ord)
              from unnest(w.threat_ids) with ordinality as u(id, ord) join public.threat_definitions t on t.id = u.id
            ),
            'reinforced', w.reinforced_slot
          ) order by w.round)
          from public.coop_operation_rounds w where w.operation_id = o.id
        ),
        'rooms', (select count(*) from public.coop_rooms r where r.operation_id = o.id and r.started_at is not null),
        'wins', (select count(*) from public.coop_progress p where p.operation_id = o.id),
        'in_play', exists (select 1 from public.coop_rooms r where r.operation_id = o.id and r.status in ('lobby', 'active'))
      ) order by o.chapter, o.ord)
      from public.coop_operations o
    ), '[]'::jsonb),
    'threats', coalesce((
      select jsonb_agg(jsonb_build_object('code', t.code, 'name', t.name, 'level', t.level, 'abilities', to_jsonb(t.required_abilities))
        order by t.level, t.code)
      from public.threat_definitions t
      where t.is_active and t.region = 'megara' and t.rarity_code is null and t.modifier_code is null
    ), '[]'::jsonb)
  )
$$;

revoke execute on function public.admin_coop_payload() from public, anon, authenticated;

create function public.admin_get_coop()
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
  return public.admin_coop_payload();
end;
$$;

-- A chapter's title, introduction and ending; a null chapter makes a new one, the next number.
create function public.admin_save_coop_chapter(p_chapter integer, p_title text, p_intro text, p_outro text)
returns jsonb
language plpgsql
volatile
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
  if char_length(v_title) not between 2 and 40 or char_length(v_intro) not between 10 and 600
     or char_length(v_outro) not between 10 and 600 then
    raise exception 'coop_invalid_text';
  end if;
  if p_chapter is null then
    insert into public.coop_chapters (chapter, title, intro, outro)
    values ((select coalesce(max(chapter), 0) + 1 from public.coop_chapters), v_title, v_intro, v_outro);
  else
    update public.coop_chapters set title = v_title, intro = v_intro, outro = v_outro where chapter = p_chapter;
    if not found then
      raise exception 'coop_chapter_not_found';
    end if;
  end if;
  return public.admin_coop_payload();
end;
$$;

-- An operation, new (no code: it takes the next place of its chapter) or changed. Everything
-- is checked: the texts; the rival's five Echi, distinct and active; every round's five
-- threats, distinct, usual ones of Nuova Megara without a rule, the reinforced among the first
-- three; the prize (never an Omega card); the stars. While a room of it is open or playing,
-- its rival and rounds stay as they are: only texts, prizes and stars change.
create function public.admin_save_coop_operation(p_operation jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_code text := nullif(trim(coalesce(p_operation ->> 'code', '')), '');
  v_existing public.coop_operations;
  v_chapter integer := (p_operation ->> 'chapter')::integer;
  v_title text := trim(coalesce(p_operation ->> 'title', ''));
  v_intro text := trim(coalesce(p_operation ->> 'intro', ''));
  v_outro text := trim(coalesce(p_operation ->> 'outro', ''));
  v_rival_name text := trim(coalesce(p_operation ->> 'rival_name', ''));
  v_boss_name text := trim(coalesce(p_operation ->> 'boss_name', ''));
  v_rounds integer := public.config_int('coop.city_rounds') + 1;
  v_rival uuid[];
  v_reward uuid;
  v_coins integer := (p_operation ->> 'reward_coins')::integer;
  v_star_panic integer := (p_operation ->> 'star_panic')::integer;
  v_star_coins integer := (p_operation ->> 'star_coins')::integer;
  v_rarities text[];
  v_traits text[];
  v_round jsonb;
  v_threats uuid[];
  v_id uuid;
  v_ord integer;
  v_changed boolean;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if char_length(v_title) not between 2 and 40 or char_length(v_intro) not between 10 and 600
     or char_length(v_outro) not between 10 and 600 or char_length(v_rival_name) not between 2 and 60
     or char_length(v_boss_name) not between 2 and 60 then
    raise exception 'coop_invalid_text';
  end if;
  if v_code is not null then
    select * into v_existing from public.coop_operations where code = v_code;
    if not found then
      raise exception 'coop_operation_not_found';
    end if;
    v_chapter := v_existing.chapter;
  elsif not exists (select 1 from public.coop_chapters where chapter = v_chapter) then
    raise exception 'coop_chapter_not_found';
  end if;

  -- The rival: five distinct active characters.
  if jsonb_typeof(p_operation -> 'rival') is distinct from 'array' or jsonb_array_length(p_operation -> 'rival') <> v_rounds then
    raise exception 'coop_invalid_rival';
  end if;
  select array_agg(d.id order by u.ord) into v_rival
  from jsonb_array_elements_text(p_operation -> 'rival') with ordinality as u(code, ord)
  join public.card_definitions d on d.code = u.code and d.is_active;
  if coalesce(cardinality(v_rival), 0) <> v_rounds
     or (select count(distinct x) from unnest(v_rival) as x) <> v_rounds then
    raise exception 'coop_invalid_rival';
  end if;

  -- The rounds: five usual threats each, distinct, the reinforced among the first three.
  if jsonb_typeof(p_operation -> 'rounds') is distinct from 'array' or jsonb_array_length(p_operation -> 'rounds') <> v_rounds then
    raise exception 'coop_invalid_rounds';
  end if;
  for v_round in select e from jsonb_array_elements(p_operation -> 'rounds') e loop
    if jsonb_typeof(v_round -> 'threats') is distinct from 'array' or jsonb_array_length(v_round -> 'threats') <> 5
       or jsonb_typeof(v_round -> 'reinforced') is distinct from 'number'
       or (v_round ->> 'reinforced')::numeric not in (0, 1, 2) then
      raise exception 'coop_invalid_rounds';
    end if;
    select array_agg(t.id order by u.ord) into v_threats
    from jsonb_array_elements_text(v_round -> 'threats') with ordinality as u(code, ord)
    join public.threat_definitions t on t.code = u.code
      and t.is_active and t.region = 'megara' and t.rarity_code is null and t.modifier_code is null;
    if coalesce(cardinality(v_threats), 0) <> 5 or (select count(distinct x) from unnest(v_threats) as x) <> 5 then
      raise exception 'coop_invalid_rounds';
    end if;
  end loop;

  -- The prize and the stars.
  if v_coins is null or v_coins not between 0 and 10000 then
    raise exception 'coop_invalid_reward';
  end if;
  if nullif(p_operation ->> 'reward_card', '') is not null then
    select d.id into v_reward
    from public.card_definitions d join public.rarity_definitions r on r.code = d.rarity_code
    where d.code = p_operation ->> 'reward_card' and d.is_active
      and r.rank < (select max(x.rank) from public.rarity_definitions x);
    if v_reward is null then
      raise exception 'coop_invalid_reward';
    end if;
  end if;
  v_rarities := array(
    select r.code from public.rarity_definitions r
    where r.code in (select jsonb_array_elements_text(coalesce(p_operation -> 'star_rarities', '[]'::jsonb)))
    order by r.rank
  );
  v_traits := array(
    select distinct t from jsonb_array_elements_text(coalesce(p_operation -> 'star_traits', '[]'::jsonb)) as t where t <> '' order by t
  );
  if v_star_panic is null or v_star_panic not between 0 and public.config_int('coop.panic_limit') - 1
     or v_star_coins is null or v_star_coins not between 0 and 1000
     or cardinality(v_rarities) <> jsonb_array_length(coalesce(p_operation -> 'star_rarities', '[]'::jsonb))
     or exists (select 1 from unnest(v_traits) as c where not exists (select 1 from public.traits t where t.code = c))
     or (cardinality(v_rarities) = 0 and cardinality(v_traits) = 0) then
    raise exception 'coop_invalid_stars';
  end if;

  if v_existing.id is not null then
    v_id := v_existing.id;
    v_changed := v_existing.rival_definition_ids is distinct from v_rival or exists (
      select 1
      from jsonb_array_elements(p_operation -> 'rounds') with ordinality as e(value, ord)
      left join public.coop_operation_rounds w on w.operation_id = v_id and w.round = e.ord
      where w.round is null or w.reinforced_slot <> (e.value ->> 'reinforced')::integer
         or w.threat_ids is distinct from (
           select array_agg(t.id order by u.ord)
           from jsonb_array_elements_text(e.value -> 'threats') with ordinality as u(code, ord)
           join public.threat_definitions t on t.code = u.code
         )
    );
    if v_changed and exists (select 1 from public.coop_rooms r where r.operation_id = v_id and r.status in ('lobby', 'active')) then
      raise exception 'coop_operation_in_play';
    end if;
    update public.coop_operations
    set title = v_title, intro = v_intro, outro = v_outro, rival_name = v_rival_name, boss_name = v_boss_name,
        rival_definition_ids = v_rival, reward_coins = v_coins, reward_definition_id = v_reward,
        star_panic = v_star_panic, star_coins = v_star_coins, star_rarities = v_rarities, star_traits = v_traits
    where id = v_id;
  else
    select coalesce(max(ord), 0) + 1 into v_ord from public.coop_operations where chapter = v_chapter;
    insert into public.coop_operations (
      code, chapter, ord, title, intro, outro, rival_name, rival_definition_ids, boss_name, reward_coins,
      reward_definition_id, star_panic, star_coins, star_rarities, star_traits
    ) values (
      'O' || v_chapter || 'M' || v_ord, v_chapter, v_ord, v_title, v_intro, v_outro, v_rival_name, v_rival, v_boss_name,
      v_coins, v_reward, v_star_panic, v_star_coins, v_rarities, v_traits
    ) returning id into v_id;
    v_changed := true;
  end if;

  if v_changed then
    delete from public.coop_operation_rounds where operation_id = v_id;
    insert into public.coop_operation_rounds (operation_id, round, threat_ids, reinforced_slot)
    select v_id, e.ord,
      (select array_agg(t.id order by u.ord)
       from jsonb_array_elements_text(e.value -> 'threats') with ordinality as u(code, ord)
       join public.threat_definitions t on t.code = u.code),
      (e.value ->> 'reinforced')::integer
    from jsonb_array_elements(p_operation -> 'rounds') with ordinality as e(value, ord);
  end if;
  return public.admin_coop_payload();
end;
$$;

-- An operation nobody has ever started: it goes away with its rounds.
create function public.admin_delete_coop_operation(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  select id into v_id from public.coop_operations where code = p_code;
  if v_id is null then
    raise exception 'coop_operation_not_found';
  end if;
  if exists (select 1 from public.coop_rooms where operation_id = v_id) then
    raise exception 'coop_operation_in_use';
  end if;
  delete from public.coop_operations where id = v_id;
  return public.admin_coop_payload();
end;
$$;

revoke execute on function public.admin_get_coop() from public, anon;
revoke execute on function public.admin_save_coop_chapter(integer, text, text, text) from public, anon;
revoke execute on function public.admin_save_coop_operation(jsonb) from public, anon;
revoke execute on function public.admin_delete_coop_operation(text) from public, anon;
grant execute on function public.admin_get_coop() to authenticated;
grant execute on function public.admin_save_coop_chapter(integer, text, text, text) to authenticated;
grant execute on function public.admin_save_coop_operation(jsonb) to authenticated;
grant execute on function public.admin_delete_coop_operation(text) to authenticated;
