-- Quadrante, fixed grid: a threat on each border (SPEC §5.14). When a match on the
-- fixed grid is created the database draws four threats of the catalog (Nuova Megara,
-- not rare, levels 2-5), one per border in side order: top, right, bottom, left. A
-- threat's value on its border is its level plus 2. When a card is placed, each of its
-- sides that faces out of the grid meets the threat of that border: a higher side puts
-- one more seal on the card, a lower one takes a seal off what the card gets for that
-- move (never below zero); a tie does nothing. With more seals to win on the edges each
-- side has 20 seals instead of 15. The shifting grid has no border threats.
--
-- matches.quadrant_threats holds [{ threat_id, value }] in side order; null on a
-- shifting grid and on the fixed-grid matches created before this migration, which keep
-- their 15 seals. The engine (packages/game-engine/src/quadrant.ts) applies the rule;
-- the move check below only needs the seals per side of the match.

insert into public.game_config (key, value, description) values
  ('quadrant.fixed_grid_threats.min_level', '2', 'Quadrante, fixed grid: lowest level of a border threat'),
  ('quadrant.fixed_grid_threats.max_level', '5', 'Quadrante, fixed grid: highest level of a border threat'),
  ('quadrant.fixed_grid_threats.value_offset', '2', 'Quadrante, fixed grid: a border threat''s value is its level plus this'),
  ('quadrant.fixed_grid_threats.bite', '1', 'Quadrante, fixed grid: seals fewer on a card for every border threat higher than its side'),
  ('quadrant.fixed_grid_threats.seals', '20', 'Quadrante, fixed grid with border threats: seals each side has');

alter table public.matches
  add column quadrant_threats jsonb,
  add constraint matches_quadrant_threats_shape check (
    quadrant_threats is null
    or (format = 'quadrant' and jsonb_typeof(quadrant_threats) = 'array' and jsonb_array_length(quadrant_threats) = 4)
  );

-- The seals each side has in a Quadrante: more on a grid with border threats.
create function public.quadrant_seals_per_side(p_threats jsonb)
returns integer
language sql
stable
set search_path = ''
as $$
  select case when p_threats is null then public.config_int('quadrant.seals')
              else public.config_int('quadrant.fixed_grid_threats.seals') end
$$;

-- Four distinct threats for the borders, in random order; null when the catalog has
-- fewer than four that fit (the match is then played without them).
create function public.draw_quadrant_border_threats()
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_threats jsonb;
begin
  select jsonb_agg(jsonb_build_object(
           'threat_id', t.id,
           'value', t.level + public.config_int('quadrant.fixed_grid_threats.value_offset')
         ) order by t.ord)
  into v_threats
  from (
    select d.id, d.level, random() as ord
    from public.threat_definitions d
    where d.is_active and d.region = 'megara' and d.rarity_code is null
      and d.level between public.config_int('quadrant.fixed_grid_threats.min_level')
                      and public.config_int('quadrant.fixed_grid_threats.max_level')
    order by ord
    limit 4
  ) t;
  return case when jsonb_array_length(coalesce(v_threats, '[]'::jsonb)) = 4 then v_threats end;
end;
$$;

revoke execute on function public.draw_quadrant_border_threats() from public, anon, authenticated;

create function public.set_quadrant_threats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.quadrant_threats := public.draw_quadrant_border_threats();
  return new;
end;
$$;

revoke execute on function public.set_quadrant_threats() from public, anon, authenticated;

create trigger matches_quadrant_threats
  before insert on public.matches
  for each row when (new.format = 'quadrant' and new.quadrant_threats is null)
  execute function public.set_quadrant_threats();

-- The border threats never change once drawn.
create function public.keep_quadrant_threats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.quadrant_threats is distinct from old.quadrant_threats then
    raise exception 'invalid_request';
  end if;
  return new;
end;
$$;

revoke execute on function public.keep_quadrant_threats() from public, anon, authenticated;

create trigger matches_keep_quadrant_threats
  before update of quadrant_threats on public.matches
  for each row execute function public.keep_quadrant_threats();

-- Stores a move computed by the engine. p_play is { card_instance_id, definition_id,
-- x, y, rotation, beaten, placed, removed, auto_played }; p_board the grid after it.
-- Checks the move number and whose turn it is; that the card is in that side's hand;
-- the cell; the submitted choice (between players) or the deadline (a human against a
-- bot); that the old cells are untouched but for their seals and the new one carries
-- the card's sides; that the mover's seals only grew, by `placed`, and the other
-- side's only shrank, by `removed`, within each side's seals (20 with border
-- threats, 15 without); and the final result.
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
  v_seals integer;
  v_moves integer := 2 * public.config_int('quadrant.cards_per_side');
  v_finished boolean;
  v_result text;
  v_grace integer := public.config_int('match.timeout_grace_seconds');
begin
  select * into v_match from public.matches where id = p_match_id for update;
  v_seals := public.quadrant_seals_per_side(v_match.quadrant_threats);
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
     or public.quadrant_seals(p_board, v_other) <> public.quadrant_seals(v_old, v_other) - v_removed
     or public.quadrant_seals(p_board, 'a') > v_seals or public.quadrant_seals(p_board, 'b') > v_seals then
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

  v_finished := p_move >= v_moves;
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
-- The match as a player sees it
-- ---------------------------------------------------------------------------

-- The payload of 20261112110000_quadrant.sql, plus the seals per side of this match and,
-- on a grid with border threats, the threats in side order and the seals they take.
alter function public.quadrant_state_payload(uuid, text) rename to quadrant_state_base_payload;

create function public.quadrant_state_payload(p_match_id uuid, p_side text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.quadrant_state_base_payload(p_match_id, p_side) || jsonb_build_object(
    'seals_per_side', public.quadrant_seals_per_side(m.quadrant_threats),
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

-- ---------------------------------------------------------------------------
-- What the Edge Function reads
-- ---------------------------------------------------------------------------

-- The context of 20261112110000_quadrant.sql, plus the border threats of the match.
alter function public.match_round_context(uuid, uuid) rename to match_round_base_context;
revoke execute on function public.match_round_base_context(uuid, uuid) from service_role;

create function public.match_round_context(p_user uuid, p_match_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_set(
    public.match_round_base_context(p_user, p_match_id),
    '{match,quadrant_threats}',
    coalesce((select m.quadrant_threats from public.matches m where m.id = p_match_id), 'null'::jsonb)
  )
$$;

revoke execute on function public.match_round_context(uuid, uuid) from public, anon, authenticated;
grant execute on function public.match_round_context(uuid, uuid) to service_role;
