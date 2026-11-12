-- Quadrante (SPEC §5.14): a 4×4 grid filled in turns. The database draws four
-- abilities, one per side of a card (top, right, bottom, left), and the side that
-- opens; each side brings a deck of ten distinct characters, shuffled here, holds
-- three and draws one after each play. A move puts a card of the hand, turned by
-- quarter turns, on a free cell next to a card in play. Seals go on the cards it
-- beats and on itself; a ripple takes opposing seals off the next cards. After eight
-- cards each the side with more seals on the grid wins; then the one that controls
-- more cards; then the side that played second. Against the bots or friendly between
-- players; no Conquest.
--
-- Two formats, one per grid: 'quadrant' (fixed 4×4, borders from the start) and
-- 'quadrant_shifting' (no borders until the cards span four columns or four rows:
-- every card stays inside a 4×4 square; the first card is the origin, 0,0).
--
-- A Quadrante is a row of `matches` with no threats. Each move is a row of
-- match_rounds (round = move, 1-16, one deadline each) and of round_plays (the side
-- that moved, the cell and the turn; base_score = cards beaten, bonus = seals removed
-- by the ripple, score = seals placed). The grid after the last move is
-- matches.quadrant_board, an array of cells { x, y, side, definition_id, instance_id,
-- values: [top, right, bottom, left], seals_a, seals_b }; points_a and points_b are
-- the seals of each side on it. The draw order of a deck is the order of
-- match_teams.card_instance_ids (and definition_ids), never read by clients. The
-- engine (packages/game-engine/src/quadrant.ts) decides; the functions below check
-- the turn, the hand, the cell, the card's sides, that seals only move the way a move
-- can move them, and the result.

insert into public.game_config (key, value, description) values
  ('quadrant.size', '4', 'Quadrante: cells per row and per column'),
  ('quadrant.deck_size', '10', 'Quadrante: characters of a deck'),
  ('quadrant.hand_size', '3', 'Quadrante: cards held at once'),
  ('quadrant.cards_per_side', '8', 'Quadrante: cards each side plays'),
  ('quadrant.seals', '15', 'Quadrante: seals each side has'),
  ('quadrant.first_player_seals', '3', 'Quadrante: free seals on the opening card of the side that plays first'),
  ('quadrant.move_timer_seconds', '20', 'Quadrante: seconds for one move'),
  ('quadrant.move_pause_seconds', '2', 'Quadrante: pause to show a move before the next timer starts');

-- ---------------------------------------------------------------------------
-- Formats
-- ---------------------------------------------------------------------------

alter table public.matches drop constraint matches_format_check;
alter table public.matches add constraint matches_format_check
  check (format in ('classic', 'boss', 'triple', 'quadrant', 'quadrant_shifting'));
alter table public.match_lobbies drop constraint match_lobbies_format_check;
alter table public.match_lobbies add constraint match_lobbies_format_check
  check (format in ('classic', 'boss', 'triple', 'quadrant', 'quadrant_shifting'));
alter table public.matchmaking_queue drop constraint matchmaking_queue_format_check;
alter table public.matchmaking_queue add constraint matchmaking_queue_format_check
  check (format in ('classic', 'boss', 'triple', 'quadrant', 'quadrant_shifting'));

create function public.is_quadrant(p_format text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_format in ('quadrant', 'quadrant_shifting'), false)
$$;

alter table public.matches
  -- The four abilities, in side order before any turn: top, right, bottom, left.
  add column quadrant_abilities text[],
  -- The side that plays the first card.
  add column quadrant_first text check (quadrant_first in ('a', 'b')),
  add column quadrant_board jsonb,
  add constraint matches_quadrant_shape check (
    (format in ('quadrant', 'quadrant_shifting')) = (
      quadrant_abilities is not null and cardinality(quadrant_abilities) = 4
      and quadrant_first is not null and quadrant_board is not null
    )
  );

alter table public.round_plays
  add column cell_x smallint,
  add column cell_y smallint,
  add column rotation smallint check (rotation between 0 and 3);

alter table public.pending_plays
  add column cell_x smallint,
  add column cell_y smallint,
  add column rotation smallint check (rotation between 0 and 3);

-- A play has a cell and a turn exactly in a Quadrante, whoever writes it.
create function public.check_play_cell()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.cell_x is not null and new.cell_y is not null and new.rotation is not null)
     <> public.is_quadrant((select format from public.matches where id = new.match_id))
     or ((new.cell_x is null) <> (new.cell_y is null)) or ((new.cell_x is null) <> (new.rotation is null)) then
    raise exception 'invalid_placement';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_play_cell() from public, anon, authenticated;

create trigger round_plays_check_cell
  before insert or update of cell_x, cell_y, rotation on public.round_plays
  for each row execute function public.check_play_cell();

create trigger pending_plays_check_cell
  before insert or update of cell_x, cell_y, rotation on public.pending_plays
  for each row execute function public.check_play_cell();

-- How many characters a team of a format has.
create or replace function public.team_size_for(p_format text)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when p_format = 'triple' then public.triple_deck_size()
    when public.is_quadrant(p_format) then public.config_int('quadrant.deck_size')
    else public.config_int('match.team_size')
  end
$$;

-- No threats, so no modifiers, in a Quadrante.
create or replace function public.set_threat_modifiers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_threats integer;
  v_drawn jsonb;
begin
  if public.is_quadrant(new.format) then
    new.threat_modifiers := '[]'::jsonb;
  elsif new.format = 'boss' then
    new.threat_modifiers := to_jsonb(array_fill(null::jsonb, array[cardinality(new.threat_ids)]));
  elsif new.format = 'triple' and tg_op = 'INSERT' then
    v_threats := public.config_int('triple.threats');
    v_drawn := public.draw_match_modifiers(new.threat_ids[1:v_threats]);
    new.threat_modifiers := (
      select coalesce(jsonb_agg(v_drawn -> ((g - 1) % v_threats) order by g), '[]'::jsonb)
      from generate_series(1, cardinality(new.threat_ids)) as g
    );
  elsif tg_op = 'INSERT' then
    new.threat_modifiers := public.draw_match_modifiers(new.threat_ids);
  else
    new.threat_modifiers := public.with_place_modifiers(new.threat_modifiers, new.threat_ids);
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rules the database checks
-- ---------------------------------------------------------------------------

-- The side that plays move p_move (1-based): the first side on odd moves.
create function public.quadrant_side_of_move(p_first text, p_move integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_move % 2 = 1 then p_first when p_first = 'a' then 'b' else 'a' end
$$;

-- The numbers on a character's sides, top-right-bottom-left, after p_rotation quarter
-- turns clockwise: a turn moves the top value to the right.
create function public.quadrant_values(p_definition_id uuid, p_abilities text[], p_rotation integer)
returns integer[]
language sql
stable
set search_path = ''
as $$
  select array_agg(coalesce((d.stats ->> p_abilities[((g - p_rotation + 4) % 4) + 1])::integer, 0) order by g)
  from public.card_definitions d, generate_series(0, 3) as g
  where d.id = p_definition_id
$$;

revoke execute on function public.quadrant_values(uuid, text[], integer) from public, anon, authenticated;

-- Whether a card may go on (x, y) of a grid: free, next to a card in play (any cell
-- for the first card of a fixed grid, the origin for a shifting one), inside the grid;
-- on a shifting grid "inside" means the cards still fit in a size × size square.
create function public.quadrant_cell_legal(p_board jsonb, p_format text, p_x integer, p_y integer)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_size integer := public.config_int('quadrant.size');
  v_width integer;
  v_height integer;
begin
  if p_x is null or p_y is null or not public.is_quadrant(p_format) then
    return false;
  end if;
  if exists (select 1 from jsonb_array_elements(p_board) c where (c ->> 'x')::integer = p_x and (c ->> 'y')::integer = p_y) then
    return false;
  end if;
  if p_format = 'quadrant' and (p_x < 0 or p_y < 0 or p_x >= v_size or p_y >= v_size) then
    return false;
  end if;
  if jsonb_array_length(p_board) = 0 then
    return p_format = 'quadrant' or (p_x = 0 and p_y = 0);
  end if;
  if not exists (
    select 1 from jsonb_array_elements(p_board) c
    where abs((c ->> 'x')::integer - p_x) + abs((c ->> 'y')::integer - p_y) = 1
  ) then
    return false;
  end if;
  if p_format = 'quadrant_shifting' then
    select greatest(max((c ->> 'x')::integer), p_x) - least(min((c ->> 'x')::integer), p_x) + 1,
           greatest(max((c ->> 'y')::integer), p_y) - least(min((c ->> 'y')::integer), p_y) + 1
    into v_width, v_height
    from jsonb_array_elements(p_board) c;
    if v_width > v_size or v_height > v_size then
      return false;
    end if;
  end if;
  return true;
end;
$$;

revoke execute on function public.quadrant_cell_legal(jsonb, text, integer, integer) from public, anon, authenticated;

-- The cards a side holds: the first hand_size of its deck, one more for every card it
-- played, minus those it played. Bots own no cards: their instance is null.
create function public.quadrant_hand(p_match_id uuid, p_side text)
returns table (ord integer, instance_id uuid, definition_id uuid)
language sql
stable
set search_path = ''
as $$
  with t as (
    select * from public.match_teams where match_id = p_match_id and side = p_side
  ), played as (
    select rp.definition_id from public.round_plays rp where rp.match_id = p_match_id and rp.side = p_side
  )
  select u.ord::integer, u.instance_id, u.definition_id
  from t, unnest(
    coalesce(t.card_instance_ids, array_fill(null::uuid, array[cardinality(t.definition_ids)])),
    t.definition_ids
  ) with ordinality as u(instance_id, definition_id, ord)
  where u.ord <= public.config_int('quadrant.hand_size') + (select count(*) from played)
    and u.definition_id not in (select p.definition_id from played p)
$$;

revoke execute on function public.quadrant_hand(uuid, text) from public, anon, authenticated;

-- Seals of a side on a grid.
create function public.quadrant_seals(p_board jsonb, p_side text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(sum((c ->> ('seals_' || p_side))::integer), 0)::integer from jsonb_array_elements(p_board) c
$$;

-- Cards a side controls: strictly more of its seals than the other's.
create function public.quadrant_controlled(p_board jsonb, p_side text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select count(*)::integer from jsonb_array_elements(p_board) c
  where (c ->> ('seals_' || p_side))::integer > (c ->> ('seals_' || case p_side when 'a' then 'b' else 'a' end))::integer
$$;

-- More seals; then more cards controlled; then the side that played second.
create function public.quadrant_result_of(p_board jsonb, p_first text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when public.quadrant_seals(p_board, 'a') <> public.quadrant_seals(p_board, 'b') then
      case when public.quadrant_seals(p_board, 'a') > public.quadrant_seals(p_board, 'b') then 'a' else 'b' end
    when public.quadrant_controlled(p_board, 'a') <> public.quadrant_controlled(p_board, 'b') then
      case when public.quadrant_controlled(p_board, 'a') > public.quadrant_controlled(p_board, 'b') then 'a' else 'b' end
    else case p_first when 'a' then 'b' else 'a' end
  end
$$;

-- ---------------------------------------------------------------------------
-- Matches
-- ---------------------------------------------------------------------------

-- The row of a move, with its deadline.
create function public.open_quadrant_move(p_match_id uuid, p_move integer)
returns void
language plpgsql
volatile
set search_path = ''
as $$
begin
  insert into public.match_rounds (match_id, round, threat_id, deadline_at)
  values (
    p_match_id, p_move, null,
    now() + make_interval(secs => public.config_int('quadrant.move_pause_seconds') + public.config_int('quadrant.move_timer_seconds'))
  );
  update public.matches set current_round = p_move where id = p_match_id;
end;
$$;

revoke execute on function public.open_quadrant_move(uuid, integer) from public, anon, authenticated;

-- Creates a Quadrante from checked decks: against a bot (no player B) or between two
-- players. The four abilities and the side that opens are drawn here unless they are
-- given (tests); the decks are shuffled here.
create function public.insert_quadrant_match(
  p_mode text,
  p_format text,
  p_player_a uuid,
  p_team_a uuid[],
  p_definitions_a uuid[],
  p_player_b uuid,
  p_team_b uuid[],
  p_definitions_b uuid[],
  p_bot_difficulty text,
  p_abilities text[] default null,
  p_first text default null
)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_bot boolean := p_mode = 'bot';
  v_abilities text[];
  v_first text;
  v_order_a integer[];
  v_order_b integer[];
  v_match uuid;
begin
  if p_mode not in ('bot', 'friendly') or not public.is_quadrant(p_format)
     or v_bot <> (p_player_b is null) or v_bot <> (p_bot_difficulty is not null) then
    raise exception 'invalid_request';
  end if;
  if p_player_a = p_player_b then
    raise exception 'cannot_play_yourself';
  end if;
  if public.has_active_match(p_player_a) or (p_player_b is not null and public.has_active_match(p_player_b)) then
    raise exception 'match_already_active';
  end if;

  v_abilities := coalesce(p_abilities, array(select code from public.ability_definitions order by random() limit 4));
  if coalesce(cardinality(v_abilities), 0) <> 4
     or (select count(distinct u.code) from unnest(v_abilities) as u(code)
         join public.ability_definitions a on a.code = u.code) <> 4 then
    raise exception 'invalid_request';
  end if;
  v_first := coalesce(p_first, case when random() < 0.5 then 'a' else 'b' end);
  if v_first not in ('a', 'b') then
    raise exception 'invalid_request';
  end if;

  -- The draw order of each deck.
  v_order_a := array(select g from generate_series(1, cardinality(p_definitions_a)) as g order by random());
  v_order_b := array(select g from generate_series(1, cardinality(p_definitions_b)) as g order by random());

  insert into public.matches (
    mode, format, bot_difficulty, player_a, player_b, threat_ids, threat_levels,
    quadrant_abilities, quadrant_first, quadrant_board
  )
  values (
    p_mode, p_format, p_bot_difficulty, p_player_a, p_player_b, '{}', '{}',
    v_abilities, v_first, '[]'::jsonb
  )
  returning id into v_match;

  insert into public.match_teams (match_id, side, user_id, card_instance_ids, definition_ids, last_seen_at) values
    (v_match, 'a', p_player_a,
     case when p_team_a is not null then array(select p_team_a[g] from unnest(v_order_a) with ordinality as u(g, o) order by o) end,
     array(select p_definitions_a[g] from unnest(v_order_a) with ordinality as u(g, o) order by o),
     case when not v_bot then now() end),
    (v_match, 'b', p_player_b,
     case when p_team_b is not null then array(select p_team_b[g] from unnest(v_order_b) with ordinality as u(g, o) order by o) end,
     array(select p_definitions_b[g] from unnest(v_order_b) with ordinality as u(g, o) order by o),
     case when not v_bot then now() end);

  perform public.open_quadrant_move(v_match, 1);

  if not v_bot then
    delete from public.match_lobbies where host_id in (p_player_a, p_player_b);
    delete from public.matchmaking_queue where user_id in (p_player_a, p_player_b);
    perform public.notify_player(p_player_a, 'match_started', v_match);
    perform public.notify_player(p_player_b, 'match_started', v_match);
  end if;
  return v_match;
end;
$$;

revoke execute on function public.insert_quadrant_match(text, text, uuid, uuid[], uuid[], uuid, uuid[], uuid[], text, text[], text) from public, anon, authenticated;

-- A Quadrante against a bot, always friendly (SPEC §5.14).
create function public.match_create_quadrant_bot(
  p_user uuid,
  p_difficulty text,
  p_format text,
  p_card_instance_ids uuid[],
  p_bot_definition_ids uuid[],
  p_abilities text[] default null,
  p_first text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_size integer := public.config_int('quadrant.deck_size');
  v_definitions uuid[];
begin
  perform 1 from public.profiles where id = p_user for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  if public.has_active_match(p_user) then
    raise exception 'match_already_active';
  end if;
  if p_difficulty is null or p_difficulty not in ('easy', 'medium', 'hard', 'super_pro') then
    raise exception 'invalid_difficulty';
  end if;
  if not public.is_quadrant(p_format) then
    raise exception 'invalid_request';
  end if;

  v_definitions := public.validate_team_for(p_user, p_card_instance_ids, p_format);

  if coalesce(cardinality(p_bot_definition_ids), 0) <> v_size
     or (select count(distinct d.id) from unnest(p_bot_definition_ids) as d(id)
         join public.card_definitions c on c.id = d.id and c.is_active) <> v_size then
    raise exception 'invalid_bot_team';
  end if;

  return public.insert_quadrant_match(
    'bot', p_format, p_user, p_card_instance_ids, v_definitions, null, null, p_bot_definition_ids, p_difficulty,
    p_abilities, p_first
  );
end;
$$;

revoke execute on function public.match_create_quadrant_bot(uuid, text, text, uuid[], uuid[], text[], text) from public, anon, authenticated;
grant execute on function public.match_create_quadrant_bot(uuid, text, text, uuid[], uuid[], text[], text) to service_role;

-- ---------------------------------------------------------------------------
-- Moves
-- ---------------------------------------------------------------------------

-- Stores a move computed by the engine. p_play is { card_instance_id, definition_id,
-- x, y, rotation, beaten, placed, removed, auto_played }; p_board the grid after it.
-- Checks the move number and whose turn it is; that the card is in that side's hand;
-- the cell; the submitted choice (between players) or the deadline (a human against a
-- bot); that the old cells are untouched but for their seals and the new one carries
-- the card's sides; that the mover's seals only grew, by `placed`, and the other
-- side's only shrank, by `removed`, within each side's seals; and the final result.
create function public.match_record_quadrant_move(
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
  v_seals integer := public.config_int('quadrant.seals');
  v_moves integer := 2 * public.config_int('quadrant.cards_per_side');
  v_finished boolean;
  v_result text;
  v_grace integer := public.config_int('match.timeout_grace_seconds');
begin
  select * into v_match from public.matches where id = p_match_id for update;
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

-- Stores a move, then returns the match as the given side sees it.
create function public.match_record_quadrant_move_state(
  p_match_id uuid,
  p_move integer,
  p_play jsonb,
  p_board jsonb,
  p_result text,
  p_side text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.match_record_quadrant_move(p_match_id, p_move, p_play, p_board, p_result);
  return public.match_state_payload(p_match_id, p_side);
end;
$$;

revoke execute on function public.match_record_quadrant_move(uuid, integer, jsonb, jsonb, text) from public, anon, authenticated;
revoke execute on function public.match_record_quadrant_move_state(uuid, integer, jsonb, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.match_record_quadrant_move_state(uuid, integer, jsonb, jsonb, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Between players: the move of the side whose turn it is
-- ---------------------------------------------------------------------------

-- A player plays a card of their hand on a legal cell, turned by p_rotation quarter
-- turns. Only on their turn, before the deadline. Returns 'ready': the move is resolved
-- straight away.
create function public.match_submit_quadrant(
  p_user uuid,
  p_match_id uuid,
  p_move integer,
  p_card_instance_id uuid,
  p_x integer,
  p_y integer,
  p_rotation integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_side text;
  v_deadline timestamptz;
begin
  select * into v_match from public.matches where id = p_match_id for update;
  v_side := case when v_match.player_a = p_user then 'a' when v_match.player_b = p_user then 'b' end;
  if v_side is null or v_match.bot_difficulty is not null or not public.is_quadrant(v_match.format) then
    raise exception 'match_not_found';
  end if;
  if v_match.status <> 'active' then
    raise exception 'match_not_active';
  end if;
  if p_move is null or v_match.current_round <> p_move then
    raise exception 'round_already_resolved';
  end if;
  if public.quadrant_side_of_move(v_match.quadrant_first, p_move) <> v_side then
    raise exception 'not_your_turn';
  end if;
  select deadline_at into v_deadline from public.match_rounds where match_id = p_match_id and round = p_move;
  if now() > v_deadline + make_interval(secs => public.config_int('match.timeout_grace_seconds')) then
    raise exception 'round_expired';
  end if;
  if not exists (select 1 from public.quadrant_hand(p_match_id, v_side) h where h.instance_id = p_card_instance_id) then
    raise exception 'character_not_available';
  end if;
  if p_rotation is null or p_rotation not between 0 and 3
     or not public.quadrant_cell_legal(v_match.quadrant_board, v_match.format, p_x, p_y) then
    raise exception 'invalid_placement';
  end if;

  perform set_config('o_mega.quadrant_submit', 'on', true);
  insert into public.pending_plays (match_id, round, side, card_instance_id, cell_x, cell_y, rotation)
  values (p_match_id, p_move, v_side, p_card_instance_id, p_x, p_y, p_rotation)
  on conflict (match_id, round, side) do update
  set card_instance_id = excluded.card_instance_id, cell_x = excluded.cell_x, cell_y = excluded.cell_y,
      rotation = excluded.rotation, submitted_at = now();
  perform set_config('o_mega.quadrant_submit', 'off', true);

  update public.match_teams set last_seen_at = now() where match_id = p_match_id and side = v_side;
  return 'ready';
end;
$$;

revoke execute on function public.match_submit_quadrant(uuid, uuid, integer, uuid, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.match_submit_quadrant(uuid, uuid, integer, uuid, integer, integer, integer) to service_role;

-- A card at a time is the choice of a classic match or a Grande Minaccia: in an
-- Allarme Triplo only match_submit_triple writes choices, in a Quadrante only
-- match_submit_quadrant.
create or replace function public.check_pending_format()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_format text := (select format from public.matches where id = new.match_id);
begin
  if v_format = 'triple' and current_setting('o_mega.triple_submit', true) is distinct from 'on' then
    raise exception 'invalid_format';
  end if;
  if public.is_quadrant(v_format) and current_setting('o_mega.quadrant_submit', true) is distinct from 'on' then
    raise exception 'invalid_format';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- The match as a player sees it
-- ---------------------------------------------------------------------------

-- A Quadrante as one side sees it: the four abilities, the grid with every card played
-- and its seals, its own hand, the number of cards the opponent holds and has left,
-- and the moves so far. Never the opponent's hand nor the order of either deck.
create function public.quadrant_state_payload(p_match_id uuid, p_side text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with m as (
    select * from public.matches where id = p_match_id
  ), k as (
    select public.config_int('quadrant.cards_per_side') as per_side, public.config_int('quadrant.seals') as seals,
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
    'seals_per_side', k.seals,
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

revoke execute on function public.quadrant_state_payload(uuid, text) from public, anon, authenticated;

-- Every caller of match_state_payload gets the payload of the match's format.
create or replace function public.match_state_payload(p_match_id uuid, p_side text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_format text := (select format from public.matches where id = p_match_id);
begin
  if v_format = 'boss' then
    return public.boss_state_payload(p_match_id, p_side);
  elsif v_format = 'triple' then
    return public.triple_state_payload(p_match_id, p_side);
  elsif public.is_quadrant(v_format) then
    return public.quadrant_state_payload(p_match_id, p_side);
  end if;
  return public.classic_match_state_payload(p_match_id, p_side);
end;
$$;

-- ---------------------------------------------------------------------------
-- Friend codes and the queue
-- ---------------------------------------------------------------------------

-- Same as before; a Quadrante lobby holds a deck of ten.
create or replace function public.create_lobby(p_card_instance_ids uuid[], p_format text default 'classic')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_expires timestamptz := now() + make_interval(mins => public.config_int('matchmaking.friend_code_minutes'));
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_format is null or p_format not in ('classic', 'boss', 'triple', 'quadrant', 'quadrant_shifting') then
    raise exception 'invalid_request';
  end if;
  perform public.validate_team_for(v_uid, p_card_instance_ids, p_format);
  perform pg_advisory_xact_lock(hashtext('o-mega.matchmaking'));
  if public.has_active_match(v_uid) then
    raise exception 'match_already_active';
  end if;

  delete from public.match_lobbies where host_id = v_uid;
  delete from public.matchmaking_queue where user_id = v_uid;
  loop
    v_code := (
      select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1), '')
      from generate_series(1, 6)
    );
    exit when not exists (select 1 from public.match_lobbies where code = v_code);
  end loop;

  insert into public.match_lobbies (code, host_id, card_instance_ids, expires_at, format)
  values (v_code, v_uid, p_card_instance_ids, v_expires, p_format);
  return jsonb_build_object('code', v_code, 'expires_at', v_expires, 'format', p_format);
end;
$$;

-- The format of a friend code that is still valid, so the guest picks a team of the
-- right size (9 for an Allarme Triplo, 10 for a Quadrante) before joining. null when
-- the code does not exist or has expired; says nothing else about the lobby.
create function public.get_lobby_format(p_code text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select l.format from public.match_lobbies l
  where auth.uid() is not null and l.code = upper(btrim(p_code)) and l.expires_at >= now()
$$;

revoke execute on function public.get_lobby_format(text) from public, anon;
grant execute on function public.get_lobby_format(text) to authenticated;

-- Same as before; a Quadrante draws its abilities and its first side and shuffles the decks here.
create or replace function public.match_join_lobby(
  p_guest uuid,
  p_code text,
  p_team uuid[],
  p_threat_ids uuid[],
  p_boss_values jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lobby public.match_lobbies;
  v_guest_definitions uuid[];
  v_host_definitions uuid[];
begin
  select * into v_lobby from public.match_lobbies where code = upper(btrim(p_code));
  if v_lobby.code is null or v_lobby.expires_at < now() then
    raise exception 'lobby_not_found';
  end if;
  if v_lobby.host_id = p_guest then
    raise exception 'cannot_play_yourself';
  end if;
  v_guest_definitions := public.validate_team_for(p_guest, p_team, v_lobby.format);

  perform pg_advisory_xact_lock(hashtext('o-mega.matchmaking'));
  select * into v_lobby from public.match_lobbies where code = upper(btrim(p_code));
  if v_lobby.code is null or v_lobby.expires_at < now() then
    raise exception 'lobby_not_found';
  end if;
  v_host_definitions := public.check_team_of(v_lobby.host_id, v_lobby.card_instance_ids, public.team_size_for(v_lobby.format));
  if v_lobby.format = 'boss' then
    return public.insert_boss_match(
      'friendly', v_lobby.host_id, v_lobby.card_instance_ids, v_host_definitions,
      p_guest, p_team, v_guest_definitions, null, p_boss_values
    );
  end if;
  if v_lobby.format = 'triple' then
    return public.insert_triple_match(
      'friendly', v_lobby.host_id, v_lobby.card_instance_ids, v_host_definitions,
      p_guest, p_team, v_guest_definitions, null
    );
  end if;
  if public.is_quadrant(v_lobby.format) then
    return public.insert_quadrant_match(
      'friendly', v_lobby.format, v_lobby.host_id, v_lobby.card_instance_ids, v_host_definitions,
      p_guest, p_team, v_guest_definitions, null
    );
  end if;
  return public.insert_pvp_match(
    'friendly', v_lobby.host_id, v_lobby.card_instance_ids, v_host_definitions,
    p_guest, p_team, v_guest_definitions, p_threat_ids
  );
end;
$$;

-- Same as before, with Quadrante: friendly only, decks of ten, each grid its own queue.
create or replace function public.match_queue_join(
  p_user uuid,
  p_mode text,
  p_team uuid[],
  p_threat_ids uuid[],
  p_bot_difficulty text default null,
  p_bot_definition_ids uuid[] default null,
  p_format text default 'classic',
  p_boss_values jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_opponent public.matchmaking_queue;
  v_definitions uuid[];
  v_opponent_definitions uuid[];
  v_level integer;
  v_value integer;
  v_since timestamptz;
  v_bot_due boolean;
begin
  if p_mode not in ('friendly', 'conquest') or p_format is null
     or p_format not in ('classic', 'boss', 'triple', 'quadrant', 'quadrant_shifting')
     or (p_format <> 'classic' and p_mode <> 'friendly') then
    raise exception 'invalid_request';
  end if;

  -- The caller's own checks need no lock.
  v_definitions := case p_mode
    when 'conquest' then public.validate_conquest_team(p_user, p_team)
    else public.validate_team_for(p_user, p_team, p_format)
  end;
  if public.has_active_match(p_user) then
    raise exception 'match_already_active';
  end if;

  select level into v_level from public.profiles where id = p_user;
  v_value := public.team_value(v_definitions);
  select enqueued_at into v_since from public.matchmaking_queue
  where user_id = p_user and mode = p_mode and format = p_format;
  v_since := coalesce(v_since, now());
  v_bot_due := p_mode = 'conquest' and p_bot_difficulty is not null
    and v_since <= now() - make_interval(secs => public.config_int('matchmaking.conquest_bot_after_seconds'));

  if v_bot_due or exists (
    select 1 from public.queue_candidates(p_user, p_mode, v_level, v_value, v_since) q where q.format = p_format
  ) then
    -- Serializes pairing: two players can never be paired twice at once.
    perform pg_advisory_xact_lock(hashtext('o-mega.matchmaking'));
    if public.has_active_match(p_user) then
      raise exception 'match_already_active';
    end if;

    for v_opponent in
      select * from public.queue_candidates(p_user, p_mode, v_level, v_value, v_since) q
      where q.format = p_format
      order by q.enqueued_at
    loop
      begin
        v_opponent_definitions := case p_mode
          when 'conquest' then public.check_conquest_team(v_opponent.user_id, v_opponent.card_instance_ids)
          else public.check_team_of(v_opponent.user_id, v_opponent.card_instance_ids, public.team_size_for(p_format))
        end;
        -- The player who waited longer is player A.
        if p_format = 'boss' then
          return public.insert_boss_match(
            'friendly', v_opponent.user_id, v_opponent.card_instance_ids, v_opponent_definitions,
            p_user, p_team, v_definitions, null, p_boss_values
          );
        end if;
        if p_format = 'triple' then
          return public.insert_triple_match(
            'friendly', v_opponent.user_id, v_opponent.card_instance_ids, v_opponent_definitions,
            p_user, p_team, v_definitions, null
          );
        end if;
        if public.is_quadrant(p_format) then
          return public.insert_quadrant_match(
            'friendly', p_format, v_opponent.user_id, v_opponent.card_instance_ids, v_opponent_definitions,
            p_user, p_team, v_definitions, null
          );
        end if;
        return public.insert_pvp_match(
          p_mode, v_opponent.user_id, v_opponent.card_instance_ids, v_opponent_definitions,
          p_user, p_team, v_definitions, p_threat_ids
        );
      exception when others then
        -- That entry is no longer valid (cards gone, already playing): drop it.
        if sqlerrm not in (
          'card_not_owned', 'duplicate_card', 'duplicate_character', 'invalid_team_size', 'match_already_active',
          'card_at_stake', 'conquest_locked', 'daily_loss_limit', 'card_locked', 'not_enough_conquerable', 'same_pair_cooldown'
        ) then
          raise;
        end if;
        delete from public.matchmaking_queue where user_id = v_opponent.user_id;
      end;
    end loop;

    if v_bot_due then
      return public.insert_conquest_bot_match(p_user, p_team, v_definitions, p_bot_difficulty, p_bot_definition_ids, p_threat_ids);
    end if;
  end if;

  -- Rows of the caller's own are locked only now, never while queuing for the lock.
  delete from public.match_lobbies where host_id = p_user;
  insert into public.matchmaking_queue (user_id, mode, card_instance_ids, level, team_value, format)
  values (p_user, p_mode, p_team, v_level, v_value, p_format)
  on conflict (user_id) do update
  set mode = excluded.mode, format = excluded.format, card_instance_ids = excluded.card_instance_ids,
      level = excluded.level, team_value = excluded.team_value, refreshed_at = now(),
      enqueued_at = case when public.matchmaking_queue.mode = excluded.mode and public.matchmaking_queue.format = excluded.format
                         then public.matchmaking_queue.enqueued_at else now() end;
  return null;
end;
$$;

-- Same as before; a Quadrante also sends its abilities, its first side and, for every
-- play and choice, the cell and the turn.
create or replace function public.match_round_context(p_user uuid, p_match_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_side text;
begin
  select * into v_match from public.matches where id = p_match_id;
  v_side := case when v_match.player_a = p_user then 'a' when v_match.player_b = p_user then 'b' end;
  if v_side is null then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'side', v_side,
    'match', jsonb_build_object(
      'status', v_match.status,
      'format', v_match.format,
      'bot_difficulty', v_match.bot_difficulty,
      'current_round', v_match.current_round,
      'threat_ids', to_jsonb(v_match.threat_ids),
      'threat_modifiers', v_match.threat_modifiers,
      'boss_values', v_match.boss_values,
      'quadrant_abilities', to_jsonb(v_match.quadrant_abilities),
      'quadrant_first', v_match.quadrant_first
    ),
    'teams', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'side', t.side,
        'card_instance_ids', to_jsonb(t.card_instance_ids),
        'definition_ids', to_jsonb(t.definition_ids)
      )), '[]'::jsonb)
      from public.match_teams t where t.match_id = p_match_id
    ),
    'rounds', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'round', r.round,
        'deadline_at', r.deadline_at,
        'winner_side', r.winner_side,
        'resolved_at', r.resolved_at,
        'holders', r.holders
      ) order by r.round), '[]'::jsonb)
      from public.match_rounds r where r.match_id = p_match_id
    ),
    'plays', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'round', p.round,
        'side', p.side,
        'card_instance_id', p.card_instance_id,
        'definition_id', p.definition_id,
        'base_score', p.base_score,
        'bonus', p.bonus,
        'score', p.score,
        'highest_value', p.highest_value,
        'auto_played', p.auto_played,
        'front_slot', p.front_slot,
        'points', p.points,
        'required', p.required,
        'cell_x', p.cell_x,
        'cell_y', p.cell_y,
        'rotation', p.rotation
      )), '[]'::jsonb)
      from public.round_plays p where p.match_id = p_match_id
    ),
    -- Choices already submitted for the round being played (matches between players).
    'pending', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'side', q.side, 'card_instance_id', q.card_instance_id, 'front_slot', q.front_slot, 'round', q.round,
        'cell_x', q.cell_x, 'cell_y', q.cell_y, 'rotation', q.rotation
      )), '[]'::jsonb)
      from public.pending_plays q
      where q.match_id = p_match_id and q.round between v_match.current_round
        and v_match.current_round + case when v_match.format = 'triple' then public.config_int('triple.threats') - 1 else 0 end
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Daily objectives: a format filter may name the two grids
-- ---------------------------------------------------------------------------

create or replace function public.daily_objective_params_valid(p_metric text, p_params jsonb)
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
    and (not (p_params ? 'format') or p_params ->> 'format' in ('classic', 'boss', 'triple', 'quadrant', 'quadrant_shifting'))
    and (not (p_params ? 'opponent') or p_params ->> 'opponent' in ('player', 'bot'))
    and (not (p_params ? 'faction') or p_params ->> 'faction' in ('heroes', 'villains', 'neutrals'))
    and (not (p_params ? 'story') or jsonb_typeof(p_params -> 'story') = 'boolean')
    and (not (p_params ? 'flawless') or jsonb_typeof(p_params -> 'flawless') = 'boolean')
    and (not (p_params ? 'bot_difficulties') or jsonb_typeof(p_params -> 'bot_difficulties') = 'array')
    and (not (p_params ? 'min_rarity_rank') or jsonb_typeof(p_params -> 'min_rarity_rank') = 'number')
    and (not (p_params ? 'max_rarity_rank') or jsonb_typeof(p_params -> 'max_rarity_rank') = 'number')
  end
$$;
