-- Caccia grossa (SPEC §5.18), second stage: the four modifiers of §5.4 as the Boss's moves
-- (announced, not drawn), three stars per Boss, a Boss on in one mode and off in the other,
-- and the editor of the Bosses for admins, shared with the Grande Minaccia. The result of a
-- round goes on the map with its comic page, so the pause before the next timer grows.

-- ---------------------------------------------------------------------------
-- Configuration (balance.ts `raid`)
-- ---------------------------------------------------------------------------

insert into public.game_config (key, value, description) values
  ('raid.quick_round', '4', 'Caccia grossa: the star Colpo rapido asks the Boss down by this round'),
  ('raid.star_coins', '20', 'Caccia grossa: coins of a star the first time, times the Magnitude''s reward_percent');
update public.game_config set value = '20' where key = 'raid.reveal_pause_seconds';

alter table public.coin_ledger drop constraint coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in (
  'pack_purchase', 'match_reward', 'bot_match_reward', 'duplicate_conversion', 'conquest_bonus', 'level_reward',
  'emergency_reward', 'bonus_code', 'story_reward', 'story_star', 'event_reward', 'objective_reward', 'achievement_reward',
  'emergency_prize', 'ranked_prize', 'emergency_week_reward', 'emergency_week_prize', 'admin_adjustment', 'challenge_reward',
  'coop_reward', 'coop_star', 'raid_reward', 'raid_star'
));

-- ---------------------------------------------------------------------------
-- The moves: the modifiers join the repertoire
-- ---------------------------------------------------------------------------

alter table public.boss_definitions drop constraint boss_definitions_raid_moves_check;
alter table public.boss_definitions add constraint boss_definitions_raid_moves_check check (raid_moves <@ array[
  'heavy', 'armor', 'exposed', 'regen', 'target', 'focus', 'weak_link', 'hostile_ground', 'underdogs'
]::text[]);
-- The star Squadra: the rarities a squad may have.
alter table public.boss_definitions add column raid_star_rarities text[] not null default array['delta', 'gamma'];

alter table public.raid_rounds drop constraint raid_rounds_move_check;
alter table public.raid_rounds add constraint raid_rounds_move_check check (move in (
  'plain', 'heavy', 'armor', 'exposed', 'regen', 'target', 'focus', 'weak_link', 'hostile_ground', 'underdogs'
));

-- One entry per round: the modifier a modifier move puts on the round's threat, or null.
alter table public.raid_rooms add column move_modifiers jsonb not null default '[]'::jsonb;

-- What the end paid in stars.
alter table public.raid_members add column stars text[], add column star_coins integer;

-- The repertoires with the modifiers, and each Boss's Life tuned again (scripts/raid-bosses.json).
update public.boss_definitions b set
  raid_moves = v.moves,
  raid_vita_percent = v.vita,
  raid_star_rarities = v.rarities
from (values
  ('B05', array['armor', 'exposed', 'focus'], 175, array['delta']),
  ('B01', array['armor', 'heavy', 'exposed', 'underdogs'], 115, array['delta', 'gamma']),
  ('B02', array['exposed', 'heavy', 'target', 'weak_link', 'hostile_ground'], 105, array['delta', 'gamma']),
  ('B03', array['target', 'armor', 'exposed', 'underdogs', 'focus'], 120, array['delta', 'gamma']),
  ('B06', array['target', 'regen', 'heavy', 'exposed', 'hostile_ground'], 105, array['delta', 'gamma', 'beta']),
  ('B04', array['armor', 'heavy', 'regen', 'target', 'exposed', 'weak_link'], 100, array['delta', 'gamma', 'beta'])
) as v(code, moves, vita, rarities)
where b.code = v.code;

-- The Boss's moves for a hunt, as in the first stage, and no Anello debole on a threat of one
-- ability (drawRaidMoves with the levels).
drop function public.raid_draw_moves(uuid);
create function public.raid_draw_moves(p_boss uuid, p_levels integer[])
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
      and not (m = 'weak_link' and coalesce(p_levels[v_round], 0) < 2)
      and not (m = 'exposed' and (select count(*) from unnest(v_moves) x where x = 'exposed') >= public.config_int('raid.exposed_max'))
      and not (m = 'heavy' and ((select count(*) from unnest(v_moves) x where x = 'heavy') >= public.config_int('raid.heavy_max')
                                or coalesce(v_moves[v_round - 1], '') = 'heavy'));
    v_moves := v_moves || v_allowed[1 + floor(random() * cardinality(v_allowed))::integer];
  end loop;
  return v_moves;
end;
$$;

-- The modifier of each move, round by round (raidMoveModifier): the numbers of a match's
-- modifiers, Territorio ostile with two factions drawn now; null for the other moves.
create function public.raid_move_modifiers(p_moves text[])
returns jsonb
language sql
volatile
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    case m
      when 'focus' then jsonb_build_object('code', 'focus')
      when 'weak_link' then jsonb_build_object('code', 'weak_link')
      when 'hostile_ground' then (
        select jsonb_build_object(
          'code', 'hostile_ground', 'favored', f[1], 'hindered', f[2],
          'bonus', public.config_int('threat_modifiers.hostile_bonus'),
          'malus', public.config_int('threat_modifiers.hostile_malus')
        )
        from (select array(select x from unnest(array['heroes', 'villains', 'neutrals']) as x order by random()) as f) s
      )
      when 'underdogs' then jsonb_build_object(
        'code', 'underdogs',
        'commonMaxRank', public.config_int('threat_modifiers.underdog_common_max_rank'),
        'eliteMinRank', public.config_int('threat_modifiers.underdog_elite_min_rank'),
        'bonus', public.config_int('threat_modifiers.underdog_bonus'),
        'malus', public.config_int('threat_modifiers.underdog_malus')
      )
      else null
    end order by u.ord
  ), '[]'::jsonb)
  from unnest(p_moves) with ordinality as u(m, ord)
$$;

revoke execute on function public.raid_draw_moves(uuid, integer[]) from public, anon, authenticated;
revoke execute on function public.raid_move_modifiers(text[]) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Stars: three per Boss, each paid once per player
-- ---------------------------------------------------------------------------

create table public.raid_stars (
  user_id uuid not null references public.profiles (id) on delete cascade,
  boss_id uuid not null references public.boss_definitions (id) on delete cascade,
  -- flawless: no Defence lost; quick: the Boss down by raid.quick_round; squad: the rarities of the Boss's star.
  star text not null check (star in ('flawless', 'quick', 'squad')),
  room_id uuid not null references public.raid_rooms (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, boss_id, star)
);

create index raid_stars_boss_id_idx on public.raid_stars (boss_id);
create index raid_stars_room_id_idx on public.raid_stars (room_id);

alter table public.raid_stars enable row level security;
revoke all on table public.raid_stars from anon, authenticated;
grant select on table public.raid_stars to service_role;

-- The stars a won hunt meets for a member: the whole team's (no Defence lost, the Boss down in
-- time) and the member's own (the squad within the Boss's rarities).
create function public.raid_member_stars(p_room uuid, p_seat integer)
returns text[]
language sql
stable
set search_path = ''
as $$
  select array_remove(array[
    case when r.defenses >= public.config_int('raid.defenses') then 'flawless' end,
    case when r.current_round <= public.config_int('raid.quick_round') then 'quick' end,
    case when not exists (
      select 1 from unnest(m.definition_ids) as u(def)
      join public.card_definitions d on d.id = u.def
      where not (d.rarity_code = any (b.raid_star_rarities))
    ) then 'squad' end
  ], null)
  from public.raid_rooms r
  join public.raid_members m on m.room_id = r.id and m.seat = p_seat
  join public.boss_definitions b on b.id = r.boss_id
  where r.id = p_room
$$;

-- When a hunt is won: the stars of every person still in who chose at least
-- raid.self_chosen_percent of the cards (the prizes' rule); the new ones paid, the star's
-- coins times the room's reward_percent.
create function public.raid_grant_stars()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.raid_members;
  v_met text[];
  v_new integer;
  v_each integer := public.raid_percent(public.config_int('raid.star_coins'), new.reward_percent);
  v_played integer;
  v_chosen integer;
begin
  for v_member in select * from public.raid_members where room_id = new.id and left_at is null and user_id is not null loop
    select count(*), count(*) filter (where not auto_played) into v_played, v_chosen
    from public.raid_plays where room_id = new.id and seat = v_member.seat;
    if v_chosen * 100 < v_played * public.config_int('raid.self_chosen_percent') then
      update public.raid_members set stars = '{}', star_coins = 0 where room_id = new.id and seat = v_member.seat;
      continue;
    end if;
    v_met := public.raid_member_stars(new.id, v_member.seat);
    with inserted as (
      insert into public.raid_stars (user_id, boss_id, star, room_id)
      select v_member.user_id, new.boss_id, s, new.id from unnest(v_met) s
      on conflict do nothing
      returning 1
    )
    select count(*) into v_new from inserted;
    if v_new > 0 and v_each > 0 then
      insert into public.coin_ledger (user_id, amount, reason, ref_id)
      values (v_member.user_id, v_new * v_each, 'raid_star', new.id);
    end if;
    update public.raid_members set stars = v_met, star_coins = v_new * v_each where room_id = new.id and seat = v_member.seat;
  end loop;
  return null;
end;
$$;

revoke execute on function public.raid_member_stars(uuid, integer) from public, anon, authenticated;
revoke execute on function public.raid_grant_stars() from public, anon, authenticated;

create trigger raid_rooms_grant_stars
  after update of status on public.raid_rooms
  for each row when (new.status = 'won' and old.status = 'active')
  execute function public.raid_grant_stars();

-- What the stars of a Boss ask and pay, for the screens.
create function public.raid_star_rules(p_boss public.boss_definitions)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'star_rarities', to_jsonb(p_boss.raid_star_rarities),
    'quick_round', public.config_int('raid.quick_round'),
    'star_coins', public.raid_percent(public.config_int('raid.star_coins'),
                                      public.config_int('raid.magnitude' || p_boss.raid_magnitude || '.reward_percent'))
  )
$$;

revoke execute on function public.raid_star_rules(public.boss_definitions) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- What players read, again: the stars, the modifiers; a Boss hunted when raid_active alone
-- ---------------------------------------------------------------------------

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
        'beaten', exists (select 1 from public.raid_progress p where p.user_id = v_uid and p.boss_id = b.id),
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
        'star_coins', public.raid_percent(public.config_int('raid.star_coins'), v_room.reward_percent)
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
        'star_coins', m.star_coins
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

-- As in the first stage: a Boss on for the hunt (raid_active) whatever the Grande Minaccia
-- says; the moves drawn with the levels, and their modifiers.
create or replace function public.raid_create_room(p_boss text)
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
  v_levels integer[];
  v_moves text[];
  v_room uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform 1 from public.profiles where id = v_uid for update;
  perform public.raid_close_stale();
  perform public.coop_close_stale();
  perform public.raid_assert_free(v_uid);
  select * into v_boss from public.boss_definitions where code = p_boss and raid_active;
  if not found then
    raise exception 'raid_boss_not_found';
  end if;
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
    v_code, v_boss.id, v_uid, v_boss.raid_magnitude,
    public.config_int('raid.magnitude' || v_boss.raid_magnitude || '.forza_percent'),
    v_boss.raid_vita_percent,
    public.config_int('raid.magnitude' || v_boss.raid_magnitude || '.reward_percent'),
    v_threats, v_levels, v_moves, public.raid_move_modifiers(v_moves)
  ) returning id into v_room;
  insert into public.raid_members (room_id, user_id, seat) values (v_room, v_uid, 1);
  return jsonb_build_object('id', v_room, 'code', v_code);
end;
$$;

-- As in the first stage, with the modifiers of the moves.
create or replace function public.raid_round_context(p_user uuid, p_room uuid)
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
    'modifiers', r.move_modifiers,
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

-- ---------------------------------------------------------------------------
-- The editor of the Bosses (EDITOR → Contenuti → Boss), admins only: the Grande Minaccia's
-- fronts and the hunt's numbers of every Boss, a new one, and deleting one never played
-- ---------------------------------------------------------------------------

create function public.admin_bosses_payload()
returns jsonb
language sql
stable
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
    'levels', jsonb_build_object(
      'one_at_most', public.config_int('match.threat_levels.require_one_at_most'),
      'one_at_least', public.config_int('match.threat_levels.require_one_at_least'),
      'min_sum', public.config_int('match.threat_levels.min_sum'),
      'max_sum', public.config_int('match.threat_levels.max_sum')
    )
  )
$$;

revoke execute on function public.admin_bosses_payload() from public, anon, authenticated;

create function public.admin_get_bosses()
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
  return public.admin_bosses_payload();
end;
$$;

-- Saves a Boss, new (code null) or existing. Checked: the texts and the scene; five different
-- usual threats of Nuova Megara as fronts, with the levels of a match (SPEC §5.4), not changed
-- while a Grande Minaccia on this Boss is being played; for the hunt, a district, a Magnitude,
-- moves of the repertoire, its own Life and the rarities of the star Squadra.
create function public.admin_save_boss(p_boss jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_code text := nullif(btrim(coalesce(p_boss ->> 'code', '')), '');
  v_boss public.boss_definitions;
  v_name text := btrim(coalesce(p_boss ->> 'name', ''));
  v_flavor text := btrim(coalesce(p_boss ->> 'flavor', ''));
  v_scene text := btrim(coalesce(p_boss ->> 'scene', ''));
  v_fronts uuid[];
  v_levels integer[];
  v_raid boolean := coalesce((p_boss ->> 'raid_active')::boolean, false);
  v_district text := nullif(p_boss ->> 'raid_district', '');
  v_magnitude integer := (p_boss ->> 'raid_magnitude')::integer;
  v_moves text[];
  v_vita integer := coalesce((p_boss ->> 'raid_vita_percent')::integer, 100);
  v_rarities text[];
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if coalesce(jsonb_typeof(p_boss -> 'fronts'), '') <> 'array' then
    raise exception 'boss_invalid_fronts' using errcode = '22023';
  end if;
  if coalesce(jsonb_typeof(p_boss -> 'raid_moves'), 'array') <> 'array'
     or coalesce(jsonb_typeof(p_boss -> 'raid_star_rarities'), 'array') <> 'array' then
    raise exception 'boss_invalid_raid' using errcode = '22023';
  end if;
  v_moves := array(select jsonb_array_elements_text(coalesce(p_boss -> 'raid_moves', '[]'::jsonb)));
  v_rarities := array(select jsonb_array_elements_text(coalesce(p_boss -> 'raid_star_rarities', '[]'::jsonb)));
  if char_length(v_name) not between 2 and 60 or char_length(v_flavor) not between 10 and 400 then
    raise exception 'boss_invalid_text' using errcode = '22023';
  end if;
  if v_scene !~ '^[a-z]+(:[a-z]+)?$' then
    raise exception 'boss_invalid_scene' using errcode = '22023';
  end if;

  -- The fronts: five threat codes, as they are in the catalog.
  select array_agg(t.id order by u.ord), array_agg(t.level order by u.ord) into v_fronts, v_levels
  from jsonb_array_elements_text(coalesce(p_boss -> 'fronts', '[]'::jsonb)) with ordinality as u(code, ord)
  join public.threat_definitions t on t.code = u.code
    and t.is_active and t.region = 'megara' and t.rarity_code is null and t.modifier_code is null;
  if coalesce(cardinality(v_fronts), 0) <> public.config_int('boss.fronts')
     or jsonb_array_length(coalesce(p_boss -> 'fronts', '[]'::jsonb)) <> public.config_int('boss.fronts')
     or (select count(distinct x) from unnest(v_fronts) x) <> cardinality(v_fronts)
     or (select min(l) from unnest(v_levels) l) > public.config_int('match.threat_levels.require_one_at_most')
     or (select max(l) from unnest(v_levels) l) < public.config_int('match.threat_levels.require_one_at_least')
     or (select sum(l) from unnest(v_levels) l) not between public.config_int('match.threat_levels.min_sum')
                                                     and public.config_int('match.threat_levels.max_sum') then
    raise exception 'boss_invalid_fronts' using errcode = '22023';
  end if;

  -- The hunt: needed only for a Boss on in the Caccia grossa, checked whenever given.
  if (v_raid and (v_district is null or v_magnitude is null))
     or (v_district is not null and v_district not in ('necropoli', 'alti', 'vulcano', 'centro', 'stazione', 'popolari', 'lungomare', 'porto', 'cantiere'))
     or (v_magnitude is not null and v_magnitude not between 1 and 5)
     or not (v_moves <@ array['heavy', 'armor', 'exposed', 'regen', 'target', 'focus', 'weak_link', 'hostile_ground', 'underdogs']::text[])
     or cardinality(v_moves) <> (select count(distinct m) from unnest(v_moves) m)
     or v_vita not between 10 and 1000
     or cardinality(v_rarities) = 0
     or exists (select 1 from unnest(v_rarities) r where not exists (select 1 from public.rarity_definitions d where d.code = r)) then
    raise exception 'boss_invalid_raid' using errcode = '22023';
  end if;

  if v_code is null then
    select 'B' || lpad((coalesce(max(substr(code, 2)::integer), 0) + 1)::text, 2, '0') into v_code from public.boss_definitions;
    if v_code !~ '^B[0-9]{2}$' then
      raise exception 'boss_too_many' using errcode = '22023';
    end if;
    insert into public.boss_definitions (code, name, flavor, scene, is_active, raid_active, raid_district, raid_magnitude,
                                         raid_moves, raid_vita_percent, raid_star_rarities)
    values (v_code, v_name, v_flavor, v_scene, coalesce((p_boss ->> 'gm_active')::boolean, false), v_raid, v_district, v_magnitude,
            v_moves, v_vita, v_rarities)
    returning id into v_id;
  else
    select * into v_boss from public.boss_definitions where code = v_code for update;
    if not found then
      raise exception 'boss_unknown' using errcode = '22023';
    end if;
    v_id := v_boss.id;
    -- A Grande Minaccia being played reads the fronts: they stay as they are until it ends.
    if exists (select 1 from public.matches m where m.boss_id = v_id and m.status = 'active')
       and (select array_agg(f.threat_id order by f.slot) from public.boss_fronts f where f.boss_id = v_id) is distinct from v_fronts then
      raise exception 'boss_in_play' using errcode = '22023';
    end if;
    update public.boss_definitions
    set name = v_name, flavor = v_flavor, scene = v_scene, is_active = coalesce((p_boss ->> 'gm_active')::boolean, is_active),
        raid_active = v_raid, raid_district = v_district, raid_magnitude = v_magnitude, raid_moves = v_moves,
        raid_vita_percent = v_vita, raid_star_rarities = v_rarities
    where id = v_id;
  end if;
  delete from public.boss_fronts where boss_id = v_id;
  insert into public.boss_fronts (boss_id, slot, threat_id)
  select v_id, u.ord, u.id from unnest(v_fronts) with ordinality as u(id, ord);
  return public.admin_bosses_payload();
end;
$$;

-- Deletes a Boss never played, in either mode.
create function public.admin_delete_boss(p_code text)
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
  select id into v_id from public.boss_definitions where code = p_code for update;
  if v_id is null then
    raise exception 'boss_unknown' using errcode = '22023';
  end if;
  if exists (select 1 from public.matches m where m.boss_id = v_id) or exists (select 1 from public.raid_rooms r where r.boss_id = v_id) then
    raise exception 'boss_in_use' using errcode = '22023';
  end if;
  delete from public.boss_definitions where id = v_id;
  return public.admin_bosses_payload();
end;
$$;

revoke execute on function public.admin_get_bosses() from public, anon;
revoke execute on function public.admin_save_boss(jsonb) from public, anon;
revoke execute on function public.admin_delete_boss(text) from public, anon;
grant execute on function public.admin_get_bosses() to authenticated;
grant execute on function public.admin_save_boss(jsonb) to authenticated;
grant execute on function public.admin_delete_boss(text) to authenticated;
