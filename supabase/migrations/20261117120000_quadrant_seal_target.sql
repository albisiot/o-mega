-- Quadrante (SPEC §5.14): seals have no limit any more, on either grid; and an event
-- (SPEC §8.2) may set a seal target: in every Quadrante created while it runs, the match
-- ends at the end of the first round (both sides played as many cards) in which a side
-- has that many seals on the grid, and the usual order decides (more seals first). The
-- check at the end of a round keeps the race fair for the side that plays second. The admin chooses the
-- target in the event editor, between quadrant.seal_target.min and .max; like the other
-- rules of an event it does not change once the event started.
--
-- matches.quadrant_seal_target is copied from the running event when a Quadrante is
-- created (null without one); the engine (packages/game-engine/src/quadrant.ts) ends
-- the match, and match_record_quadrant_move checks the same rule.

delete from public.game_config where key in ('quadrant.seals', 'quadrant.fixed_grid_threats.seals');

insert into public.game_config (key, value, description) values
  ('quadrant.seal_target.min', '5', 'Quadrante: lowest seal target an event may set'),
  ('quadrant.seal_target.max', '60', 'Quadrante: highest seal target an event may set'),
  ('quadrant.seal_target.suggested', '12', 'Quadrante: seal target the event editor suggests');

alter table public.events
  add column quadrant_seal_target integer check (quadrant_seal_target is null or quadrant_seal_target > 0);

comment on column public.events.quadrant_seal_target is
  'Quadrante: the first side with this many seals on the grid wins the match; null: no target.';

alter table public.matches
  add column quadrant_seal_target integer,
  add constraint matches_quadrant_seal_target check (
    quadrant_seal_target is null or (quadrant_seal_target > 0 and format in ('quadrant', 'quadrant_shifting'))
  );

-- A Quadrante takes the seal target of the event running when it is created.
create function public.set_quadrant_seal_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.quadrant_seal_target := (select e.quadrant_seal_target from public.events e where e.id = public.current_event_id());
  return new;
end;
$$;

revoke execute on function public.set_quadrant_seal_target() from public, anon, authenticated;

create trigger matches_quadrant_seal_target
  before insert on public.matches
  for each row when (new.format in ('quadrant', 'quadrant_shifting') and new.quadrant_seal_target is null)
  execute function public.set_quadrant_seal_target();

-- ---------------------------------------------------------------------------
-- Moves: no limit of seals, the match ends at the target
-- ---------------------------------------------------------------------------

-- Stores a move computed by the engine. p_play is { card_instance_id, definition_id,
-- x, y, rotation, beaten, placed, removed, auto_played }; p_board the grid after it.
-- Checks the move number and whose turn it is; that the card is in that side's hand;
-- the cell; the submitted choice (between players) or the deadline (a human against a
-- bot); that the old cells are untouched but for their seals and the new one carries
-- the card's sides; that the mover's seals only grew, by `placed`, and the other
-- side's only shrank, by `removed` (seals have no limit); and the result: after the
-- last move, or at the end of a round (an even move) in which a side has the seal target.
create or replace function public.match_record_quadrant_move(
  p_match_id uuid,
  p_move integer,
  p_play jsonb,
  p_board jsonb,
  p_result text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_team public.match_teams;
  v_pending public.pending_plays;
  v_deadline timestamptz;
  v_side text;
  v_other text;
  v_instance uuid;
  v_definition uuid;
  v_x integer;
  v_y integer;
  v_rotation integer;
  v_auto boolean;
  v_placed integer;
  v_removed integer;
  v_old jsonb;
  v_values integer[];
  v_target integer;
  v_moves integer := 2 * public.config_int('quadrant.cards_per_side');
  v_finished boolean;
  v_result text;
  v_grace integer := public.config_int('match.timeout_grace_seconds');
begin
  select * into v_match from public.matches where id = p_match_id for update;
  v_target := v_match.quadrant_seal_target;
  if v_match.id is null or v_match.status <> 'active' then
    raise exception 'match_not_active';
  end if;
  if not public.is_quadrant(v_match.format) then
    raise exception 'invalid_format';
  end if;
  if p_move is null or p_move <> v_match.current_round then
    raise exception 'round_already_resolved';
  end if;
  select deadline_at into v_deadline from public.match_rounds
  where match_id = p_match_id and round = p_move and resolved_at is null;
  if v_deadline is null then
    raise exception 'round_already_resolved';
  end if;
  if jsonb_typeof(p_play) is distinct from 'object' or jsonb_typeof(p_board) is distinct from 'array' then
    raise exception 'invalid_placement';
  end if;

  v_side := public.quadrant_side_of_move(v_match.quadrant_first, p_move);
  v_other := case v_side when 'a' then 'b' else 'a' end;
  v_definition := (p_play ->> 'definition_id')::uuid;
  v_instance := (p_play ->> 'card_instance_id')::uuid;
  v_x := (p_play ->> 'x')::integer;
  v_y := (p_play ->> 'y')::integer;
  v_rotation := (p_play ->> 'rotation')::integer;
  v_auto := coalesce((p_play ->> 'auto_played')::boolean, false);
  v_placed := (p_play ->> 'placed')::integer;
  v_removed := (p_play ->> 'removed')::integer;
  if v_rotation is null or v_rotation not between 0 and 3 or v_placed is null or v_placed < 0
     or v_removed is null or v_removed < 0 or coalesce((p_play ->> 'beaten')::integer, -1) not between 0 and 4 then
    raise exception 'invalid_placement';
  end if;

  -- A card of the hand of the side whose turn it is.
  select * into v_team from public.match_teams where match_id = p_match_id and side = v_side;
  if not exists (
    select 1 from public.quadrant_hand(p_match_id, v_side) h
    where h.definition_id = v_definition and h.instance_id is not distinct from v_instance
  ) then
    raise exception 'character_not_available';
  end if;

  v_old := v_match.quadrant_board;
  if not public.quadrant_cell_legal(v_old, v_match.format, v_x, v_y) then
    raise exception 'invalid_placement';
  end if;

  if v_team.user_id is not null then
    if v_match.bot_difficulty is not null then
      -- A human choice after the deadline is refused: the engine must play at random.
      if not v_auto and now() > v_deadline + make_interval(secs => v_grace) then
        raise exception 'round_expired';
      end if;
    else
      select * into v_pending from public.pending_plays
      where match_id = p_match_id and round = p_move and side = v_side;
      if v_auto and v_pending.match_id is not null then
        raise exception 'choice_ignored';
      end if;
      if not v_auto and (
        v_pending.card_instance_id is distinct from v_instance or v_pending.cell_x is distinct from v_x
        or v_pending.cell_y is distinct from v_y or v_pending.rotation is distinct from v_rotation
      ) then
        raise exception 'choice_not_submitted';
      end if;
      if v_auto and now() <= v_deadline + make_interval(secs => v_grace) then
        raise exception 'round_not_expired';
      end if;
    end if;
  end if;

  -- The grid: the old cells untouched but for their seals, plus the new card.
  v_values := public.quadrant_values(v_definition, v_match.quadrant_abilities, v_rotation);
  if jsonb_array_length(p_board) <> jsonb_array_length(v_old) + 1
     or (select count(distinct ((c ->> 'x') || ',' || (c ->> 'y'))) from jsonb_array_elements(p_board) c) <> jsonb_array_length(p_board)
     or exists (
       select 1 from jsonb_array_elements(p_board) c
       where jsonb_typeof(c -> 'seals_a') is distinct from 'number' or jsonb_typeof(c -> 'seals_b') is distinct from 'number'
          or (c ->> 'seals_a')::integer < 0 or (c ->> 'seals_b')::integer < 0
     )
     or exists (
       select 1 from jsonb_array_elements(v_old) o
       where not exists (
         select 1 from jsonb_array_elements(p_board) n
         where n -> 'x' = o -> 'x' and n -> 'y' = o -> 'y' and n ->> 'side' = o ->> 'side'
           and n ->> 'definition_id' = o ->> 'definition_id'
           and (n ->> 'instance_id') is not distinct from (o ->> 'instance_id')
           and n -> 'values' = o -> 'values'
           -- Seals only grow for the mover, only shrink for the other side.
           and (n ->> ('seals_' || v_side))::integer >= (o ->> ('seals_' || v_side))::integer
           and (n ->> ('seals_' || v_other))::integer <= (o ->> ('seals_' || v_other))::integer
       )
     )
     or not exists (
       select 1 from jsonb_array_elements(p_board) n
       where (n ->> 'x')::integer = v_x and (n ->> 'y')::integer = v_y and n ->> 'side' = v_side
         and (n ->> 'definition_id')::uuid = v_definition
         and (n ->> 'instance_id')::uuid is not distinct from v_instance
         and n -> 'values' = to_jsonb(v_values)
         and (n ->> ('seals_' || v_other))::integer = 0
     ) then
    raise exception 'invalid_board';
  end if;
  if public.quadrant_seals(p_board, v_side) <> public.quadrant_seals(v_old, v_side) + v_placed
     or public.quadrant_seals(p_board, v_other) <> public.quadrant_seals(v_old, v_other) - v_removed then
    raise exception 'invalid_points';
  end if;

  insert into public.round_plays (
    match_id, round, side, card_instance_id, definition_id,
    base_score, bonus, score, highest_value, auto_played, cell_x, cell_y, rotation
  ) values (
    p_match_id, p_move, v_side, v_instance, v_definition,
    (p_play ->> 'beaten')::integer, v_removed, v_placed, (select max(v) from unnest(v_values) v), v_auto,
    v_x, v_y, v_rotation
  );
  update public.match_rounds set resolved_at = now() where match_id = p_match_id and round = p_move;
  delete from public.pending_plays where match_id = p_match_id and round = p_move;

  update public.matches
  set quadrant_board = p_board,
      points_a = public.quadrant_seals(p_board, 'a'),
      points_b = public.quadrant_seals(p_board, 'b')
  where id = p_match_id;

  v_finished := p_move >= v_moves
    or (v_target is not null and p_move % 2 = 0
        and greatest(public.quadrant_seals(p_board, 'a'), public.quadrant_seals(p_board, 'b')) >= v_target);
  v_result := case when v_finished then public.quadrant_result_of(p_board, v_match.quadrant_first) end;
  if v_result is distinct from p_result then
    raise exception 'result_mismatch';
  end if;

  if v_finished then
    perform public.finish_match(p_match_id, v_result, 'completed');
  else
    perform public.open_quadrant_move(p_match_id, p_move + 1);
    perform public.notify_match(p_match_id, 'round');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- The match as a player sees it: no seals per side, the seal target
-- ---------------------------------------------------------------------------

-- The payload of 20261112110000_quadrant.sql without the seals per side.
create or replace function public.quadrant_state_base_payload(p_match_id uuid, p_side text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with m as (
    select * from public.matches where id = p_match_id
  ), k as (
    select public.config_int('quadrant.cards_per_side') as per_side,
           public.config_int('quadrant.hand_size') as hand_size
  ), mine as (
    select * from public.match_teams where match_id = p_match_id and side = p_side
  ), theirs as (
    select * from public.match_teams where match_id = p_match_id and side <> p_side
  ), cur as (
    select r.* from public.match_rounds r, m where r.match_id = p_match_id and r.round = m.current_round
  )
  select jsonb_build_object(
    'id', m.id,
    'mode', m.mode,
    'format', m.format,
    'variant', case m.format when 'quadrant' then 'fixed' else 'shifting' end,
    'bot_difficulty', m.bot_difficulty,
    'status', m.status,
    'my_side', p_side,
    'i_open', m.quadrant_first = p_side,
    'size', public.config_int('quadrant.size'),
    'cards_per_side', k.per_side,
    'first_player_seals', public.config_int('quadrant.first_player_seals'),
    'abilities', (
      select jsonb_agg(jsonb_build_object('code', a.code, 'name', a.name, 'family', a.family) order by u.ord)
      from unnest(m.quadrant_abilities) with ordinality as u(code, ord)
      join public.ability_definitions a on a.code = u.code
    ),
    -- The move being played (1-based), whose it is and until when.
    'move', m.current_round,
    'moves_count', 2 * k.per_side,
    'to_move', case when m.status <> 'active' then null
                    when public.quadrant_side_of_move(m.quadrant_first, m.current_round) = p_side then 'me'
                    else 'opponent' end,
    'deadline_at', (select deadline_at from cur where resolved_at is null),
    'board', coalesce((
      select jsonb_agg(jsonb_build_object(
        'x', (c ->> 'x')::integer,
        'y', (c ->> 'y')::integer,
        'mine', c ->> 'side' = p_side,
        'values', c -> 'values',
        'seals', jsonb_build_object(
          'me', (c ->> ('seals_' || p_side))::integer,
          'opponent', (c ->> ('seals_' || case p_side when 'a' then 'b' else 'a' end))::integer
        ),
        'card', public.card_payload((c ->> 'definition_id')::uuid, (c ->> 'instance_id')::uuid)
      ) order by (c ->> 'y')::integer, (c ->> 'x')::integer)
      from jsonb_array_elements(m.quadrant_board) c
    ), '[]'::jsonb),
    'seals', jsonb_build_object(
      'me', case p_side when 'a' then m.points_a else m.points_b end,
      'opponent', case p_side when 'a' then m.points_b else m.points_a end
    ),
    'controlled', jsonb_build_object(
      'me', public.quadrant_controlled(m.quadrant_board, p_side),
      'opponent', public.quadrant_controlled(m.quadrant_board, case p_side when 'a' then 'b' else 'a' end)
    ),
    'my_hand', coalesce((
      select jsonb_agg(public.card_payload(h.definition_id, h.instance_id) || jsonb_build_object('instance_id', h.instance_id) order by h.ord)
      from public.quadrant_hand(p_match_id, p_side) h
    ), '[]'::jsonb),
    'my_deck_left', greatest(0,
      cardinality((select definition_ids from mine)) - k.hand_size
      - (select count(*) from public.round_plays rp where rp.match_id = p_match_id and rp.side = p_side))::integer,
    'opponent_hand_count', (select count(*) from public.quadrant_hand(p_match_id, (select side from theirs)))::integer,
    'opponent_deck_left', greatest(0,
      cardinality((select definition_ids from theirs)) - k.hand_size
      - (select count(*) from public.round_plays rp where rp.match_id = p_match_id and rp.side <> p_side))::integer,
    'moves', coalesce((
      select jsonb_agg(jsonb_build_object(
        'move', rp.round, 'mine', rp.side = p_side, 'x', rp.cell_x, 'y', rp.cell_y, 'rotation', rp.rotation,
        'name', d.name, 'beaten', rp.base_score, 'removed', rp.bonus, 'placed', rp.score, 'auto_played', rp.auto_played
      ) order by rp.round)
      from public.round_plays rp join public.card_definitions d on d.id = rp.definition_id
      where rp.match_id = p_match_id
    ), '[]'::jsonb),
    'result', case when m.result is null then null when m.result = 'draw' then 'draw'
                   when m.result = p_side then 'win' else 'loss' end,
    'end_reason', m.end_reason,
    'reward_coins', case p_side when 'a' then m.reward_coins_a else m.reward_coins_b end,
    'level_rewards', coalesce((
      select jsonb_agg(jsonb_build_object('level', lr.level, 'coins', lr.coins) order by lr.level)
      from public.level_rewards lr
      where lr.match_id = p_match_id and lr.user_id = (select user_id from mine)
    ), '[]'::jsonb),
    'level_unlocks', coalesce((
      select jsonb_agg(jsonb_build_object('name', d.name, 'level', d.unlock_level) order by d.unlock_level)
      from public.level_unlocks lu
      join public.card_definitions d on d.id = lu.definition_id
      where lu.match_id = p_match_id and lu.user_id = (select user_id from mine)
    ), '[]'::jsonb),
    'server_now', now(),
    'opponent', (
      select jsonb_build_object(
        'username', pr.username, 'avatar_url', pr.avatar_url, 'level', pr.level,
        'last_seen_at', theirs.last_seen_at
      )
      from theirs join public.profiles pr on pr.id = theirs.user_id
    )
  )
  from m, k
$$;

-- With the border threats (20261117100000) and the seal target.
create or replace function public.quadrant_state_payload(p_match_id uuid, p_side text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.quadrant_state_base_payload(p_match_id, p_side) || jsonb_build_object(
    'seal_target', m.quadrant_seal_target,
    'border_bite', case when m.quadrant_threats is not null then public.config_int('quadrant.fixed_grid_threats.bite') end,
    'border_threats', case when m.quadrant_threats is not null then (
      select jsonb_agg(jsonb_build_object(
        'code', d.code,
        'name', d.name,
        'level', d.level,
        'value', (u.t ->> 'value')::integer,
        'art_url', d.art_url,
        'flavor', d.flavor
      ) order by u.ord)
      from jsonb_array_elements(m.quadrant_threats) with ordinality as u(t, ord)
      join public.threat_definitions d on d.id = (u.t ->> 'threat_id')::uuid
    ) end
  )
  from public.matches m
  where m.id = p_match_id
$$;

revoke execute on function public.quadrant_state_payload(uuid, text) from public, anon, authenticated;

drop function public.quadrant_seals_per_side(jsonb);

-- What the Edge Function reads: the border threats and the seal target.
create or replace function public.match_round_context(p_user uuid, p_match_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_set(jsonb_set(
    public.match_round_base_context(p_user, p_match_id),
    '{match,quadrant_threats}',
    coalesce((select m.quadrant_threats from public.matches m where m.id = p_match_id), 'null'::jsonb)
  ), '{match,quadrant_seal_target}',
    coalesce((select to_jsonb(m.quadrant_seal_target) from public.matches m where m.id = p_match_id), 'null'::jsonb)
  )
$$;

revoke execute on function public.match_round_context(uuid, uuid) from public, anon, authenticated;
grant execute on function public.match_round_context(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Events: the seal target (the functions of 20261116240000_event_rarity_faction.sql)
-- ---------------------------------------------------------------------------

create or replace function public.event_payload(p_event_id uuid, p_user uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id,
    'title', e.title,
    'description', e.description,
    'starts_at', e.starts_at,
    'ends_at', e.ends_at,
    'points', e.points,
    'daily_cap', e.daily_cap,
    -- Quadrante: the first side with this many seals on the grid wins; null without a target.
    'quadrant_seal_target', e.quadrant_seal_target,
    -- Only teams of these characters earn points; [] admits everyone.
    'admitted', public.event_admitted_description(e.traits, e.rarities, e.factions),
    'admitted_characters', case when public.event_admits_everyone(e.traits, e.rarities, e.factions) then null
                                else public.event_admitted_count(e.traits, e.rarities, e.factions) end,
    'tiers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tier', t.tier,
        'points', t.points,
        'coins', t.coins,
        'packs', t.packs,
        'cards', (
          select coalesce(jsonb_agg(public.card_payload(u.definition_id) || coalesce((
            select jsonb_build_object(
              'art_url', v.art_url,
              'variant', jsonb_build_object('style', v.style, 'name', v.style_name)
            ) from public.card_variants v where v.id = u.variant_id
          ), '{}'::jsonb) order by u.ord), '[]'::jsonb)
          from unnest(t.card_definition_ids, t.card_variant_ids) with ordinality as u(definition_id, variant_id, ord)
        ),
        'reached', r.id is not null,
        'opening_ids', coalesce(to_jsonb(r.opening_ids), '[]'::jsonb),
        'seen', r.seen_at is not null
      ) order by t.tier)
      from public.event_tiers t
      left join public.event_rewards r on r.event_id = t.event_id and r.tier = t.tier and r.user_id = p_user
      where t.event_id = e.id
    ), '[]'::jsonb),
    'my_points', (select coalesce(sum(p.points), 0) from public.event_points p where p.event_id = e.id and p.user_id = p_user),
    'my_points_today', (
      select coalesce(sum(p.points), 0) from public.event_points p
      where p.event_id = e.id and p.user_id = p_user and public.game_day(p.created_at) = public.game_day()
    )
  )
  from public.events e
  where e.id = p_event_id
$$;

create or replace function public.admin_events_payload()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'now', now(),
    'trait_catalog', public.trait_catalog_payload(),
    'rarities', (
      select coalesce(jsonb_agg(jsonb_build_object('code', r.code, 'name', r.name, 'rank', r.rank, 'color', r.color) order by r.rank), '[]'::jsonb)
      from public.rarity_definitions r
    ),
    'min_admitted_characters', public.config_int('events.min_admitted_characters'),
    'quadrant_seal_target', jsonb_build_object(
      'min', public.config_int('quadrant.seal_target.min'),
      'max', public.config_int('quadrant.seal_target.max'),
      'suggested', public.config_int('quadrant.seal_target.suggested')
    ),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'title', e.title,
        'description', e.description,
        'starts_at', e.starts_at,
        'ends_at', e.ends_at,
        'points', e.points,
        'daily_cap', e.daily_cap,
        'quadrant_seal_target', e.quadrant_seal_target,
        'traits', to_jsonb(e.traits),
        'rarities', to_jsonb(e.rarities),
        'factions', to_jsonb(e.factions),
        'is_active', e.is_active,
        'players', (select count(distinct p.user_id) from public.event_points p where p.event_id = e.id),
        'tiers', coalesce((
          select jsonb_agg(jsonb_build_object(
            'tier', t.tier,
            'points', t.points,
            'coins', t.coins,
            'packs', t.packs,
            'card_codes', (
              select coalesce(jsonb_agg(d.code || coalesce(':' || v.style, '') order by u.ord), '[]'::jsonb)
              from unnest(t.card_definition_ids, t.card_variant_ids) with ordinality as u(id, variant_id, ord)
              join public.card_definitions d on d.id = u.id
              left join public.card_variants v on v.id = u.variant_id
            ),
            'card_names', (
              select coalesce(jsonb_agg(d.name || coalesce(' (' || v.style_name || ')', '') order by u.ord), '[]'::jsonb)
              from unnest(t.card_definition_ids, t.card_variant_ids) with ordinality as u(id, variant_id, ord)
              join public.card_definitions d on d.id = u.id
              left join public.card_variants v on v.id = u.variant_id
            ),
            'reached', (select count(*) from public.event_rewards r where r.event_id = t.event_id and r.tier = t.tier)
          ) order by t.tier)
          from public.event_tiers t where t.event_id = e.id
        ), '[]'::jsonb)
      ) order by e.starts_at desc)
      from public.events e
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
    )
  )
$$;

drop function public.admin_save_event(text, text, timestamp, timestamp, jsonb, jsonb, integer, uuid, text[], text[], text[]);

create function public.admin_save_event(
  p_title text,
  p_description text,
  p_starts_at timestamp,
  p_ends_at timestamp,
  p_points jsonb,
  p_tiers jsonb,
  p_daily_cap integer default null,
  p_id uuid default null,
  p_traits text[] default '{}',
  p_rarities text[] default '{}',
  p_factions text[] default '{}',
  p_quadrant_seal_target integer default null
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
  v_starts timestamptz := p_starts_at at time zone v_zone;
  v_ends timestamptz := p_ends_at at time zone v_zone;
  v_event public.events;
  v_started boolean := false;
  v_id uuid := p_id;
  v_tier jsonb;
  v_index integer := 0;
  v_previous integer := 0;
  v_tier_points integer;
  v_coins integer;
  v_packs integer;
  v_cards record;
  v_traits text[] := array(select distinct t from unnest(coalesce(p_traits, '{}')) as t where t <> '' order by t);
  v_rarities text[] := array(select distinct r from unnest(coalesce(p_rarities, '{}')) as r where r <> '' order by r);
  v_factions text[] := array(select distinct f from unnest(coalesce(p_factions, '{}')) as f where f <> '' order by f);
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  -- One save at a time, so two events cannot be made to overlap.
  perform pg_advisory_xact_lock(hashtext('public.events'));

  if p_id is not null then
    select * into v_event from public.events where id = p_id for update;
    if v_event.id is null then
      raise exception 'event_not_found';
    end if;
    if v_event.ends_at <= now() then
      raise exception 'event_ended';
    end if;
    v_started := v_event.starts_at <= now();
    if v_started then
      v_starts := v_event.starts_at;
    end if;
  end if;

  if char_length(v_title) not between 3 and 60 or char_length(v_description) > 500 then
    raise exception 'event_invalid_text';
  end if;
  if v_starts is null or v_ends is null or v_ends <= v_starts or v_ends <= now()
     or v_ends - v_starts > interval '90 days' then
    raise exception 'event_invalid_period';
  end if;
  if exists (
    select 1 from public.events e
    where e.is_active and e.id is distinct from p_id and e.starts_at < v_ends and e.ends_at > v_starts
  ) then
    raise exception 'event_overlap';
  end if;

  if v_started then
    update public.events
    set title = v_title, description = v_description, ends_at = v_ends
    where id = p_id;
    return public.admin_events_payload();
  end if;

  -- Admitted characters: known traits, rarities and factions, and enough
  -- characters for an Emergenza squad.
  if exists (select 1 from unnest(v_traits) as t where not exists (select 1 from public.traits x where x.code = t))
     or exists (select 1 from unnest(v_rarities) as r where not exists (select 1 from public.rarity_definitions x where x.code = r))
     or exists (select 1 from unnest(v_factions) as f where f not in ('heroes', 'villains', 'neutrals'))
     or (not public.event_admits_everyone(v_traits, v_rarities, v_factions)
         and public.event_admitted_count(v_traits, v_rarities, v_factions) < public.config_int('events.min_admitted_characters')) then
    raise exception 'event_invalid_traits';
  end if;

  if p_daily_cap is not null and (p_daily_cap < 1 or p_daily_cap > 100000) then
    raise exception 'event_invalid_points';
  end if;
  if p_quadrant_seal_target is not null and p_quadrant_seal_target not between
     public.config_int('quadrant.seal_target.min') and public.config_int('quadrant.seal_target.max') then
    raise exception 'event_invalid_seal_target';
  end if;
  if jsonb_typeof(p_tiers) is distinct from 'array'
     or jsonb_array_length(p_tiers) not between 1 and public.config_int('events.max_tiers') then
    raise exception 'event_invalid_tiers';
  end if;

  if v_id is null then
    insert into public.events (title, description, starts_at, ends_at, points, daily_cap, traits, rarities, factions,
                               quadrant_seal_target, created_by)
    values (v_title, v_description, v_starts, v_ends, public.event_points_rules(p_points), p_daily_cap,
            v_traits, v_rarities, v_factions, p_quadrant_seal_target, auth.uid())
    returning id into v_id;
  else
    update public.events
    set title = v_title, description = v_description, starts_at = v_starts, ends_at = v_ends,
        points = public.event_points_rules(p_points), daily_cap = p_daily_cap,
        traits = v_traits, rarities = v_rarities, factions = v_factions,
        quadrant_seal_target = p_quadrant_seal_target
    where id = v_id;
    delete from public.event_tiers where event_id = v_id;
  end if;

  for v_tier in select value from jsonb_array_elements(p_tiers) loop
    v_index := v_index + 1;
    begin
      v_tier_points := (v_tier ->> 'points')::integer;
      v_coins := coalesce((v_tier ->> 'coins')::integer, 0);
      v_packs := coalesce((v_tier ->> 'packs')::integer, 0);
    exception when others then
      raise exception 'event_invalid_tiers';
    end;
    -- Each target further than the one before.
    if v_tier_points is null or v_tier_points <= v_previous or v_tier_points > 1000000
       or v_coins not between 0 and 100000 or v_packs not between 0 and 10
       or jsonb_array_length(coalesce(v_tier -> 'cards', '[]')) > 10 then
      raise exception 'event_invalid_tiers';
    end if;
    select * into v_cards from public.event_reward_cards(
      array(select jsonb_array_elements_text(coalesce(v_tier -> 'cards', '[]')))
    );
    if v_coins = 0 and v_packs = 0 and cardinality(v_cards.definition_ids) = 0 then
      raise exception 'event_tier_no_reward';
    end if;
    insert into public.event_tiers (event_id, tier, points, coins, packs, card_definition_ids, card_variant_ids)
    values (v_id, v_index, v_tier_points, v_coins, v_packs, v_cards.definition_ids, v_cards.variant_ids);
    v_previous := v_tier_points;
  end loop;

  return public.admin_events_payload();
end;
$$;

revoke execute on function public.admin_save_event(text, text, timestamp, timestamp, jsonb, jsonb, integer, uuid, text[], text[], text[], integer) from public, anon;
grant execute on function public.admin_save_event(text, text, timestamp, timestamp, jsonb, jsonb, integer, uuid, text[], text[], text[], integer) to authenticated;
