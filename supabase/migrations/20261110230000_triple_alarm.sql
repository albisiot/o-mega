-- Allarme Triplo (SPEC §5.13): three threats drawn at random, of any level, the same
-- for the whole match; each side brings a deck of nine distinct characters, which
-- the database shuffles when the match starts. Every round both sides draw the next
-- three cards of their deck and secretly place one on each threat; on each threat
-- the two characters compare as in a round of a match and the winner takes a point.
-- After three rounds every card has played once: most points wins, then the sum of
-- scores, then a draw. Against the bots or friendly between players; no Conquest.
--
-- An Allarme Triplo is a row of `matches` with format = 'triple'. Each contest (one
-- threat in one round) is a row of match_rounds, as a round of a classic match:
-- contest c = (round - 1) * 3 + threat, so threat_ids and threat_levels hold the
-- three threats three times over, and the threat modifiers are drawn on the three
-- and repeated. The rows of a round are opened together with the same deadline;
-- current_round is the first contest of the round being played. rounds_won_* are
-- the points. A play is a row of round_plays, a choice a row of pending_plays, as
-- in a classic match, so Spia, Annullatore and Silenzio della tomba work per contest.
--
-- The draw order of a deck is the order of match_teams.card_instance_ids (and
-- definition_ids): clients never read match_teams, and the payload shows only the
-- hand of the rounds already open. The engine (packages/game-engine/src/triple.ts)
-- decides; the functions below check what it sends.

insert into public.game_config (key, value, description) values
  ('triple.rounds', '3', 'Allarme Triplo: rounds of a match'),
  ('triple.threats', '3', 'Allarme Triplo: threats of a match, one card on each per round'),
  ('triple.round_timer_seconds', '45', 'Allarme Triplo: seconds to place the three cards of a round');

-- ---------------------------------------------------------------------------
-- Format
-- ---------------------------------------------------------------------------

alter table public.matches drop constraint matches_format_check;
alter table public.matches add constraint matches_format_check check (format in ('classic', 'boss', 'triple'));
alter table public.match_lobbies drop constraint match_lobbies_format_check;
alter table public.match_lobbies add constraint match_lobbies_format_check check (format in ('classic', 'boss', 'triple'));
alter table public.matchmaking_queue drop constraint matchmaking_queue_format_check;
alter table public.matchmaking_queue add constraint matchmaking_queue_format_check check (format in ('classic', 'boss', 'triple'));

-- Cards of a deck: one per threat in every round.
create function public.triple_deck_size()
returns integer
language sql
stable
set search_path = ''
as $$
  select public.config_int('triple.rounds') * public.config_int('triple.threats')
$$;

revoke execute on function public.triple_deck_size() from public, anon, authenticated;

-- How many characters a team of a format has.
create function public.team_size_for(p_format text)
returns integer
language sql
stable
set search_path = ''
as $$
  select case when p_format = 'triple' then public.triple_deck_size() else public.config_int('match.team_size') end
$$;

revoke execute on function public.team_size_for(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Team checks of any size
-- ---------------------------------------------------------------------------

-- The checks of check_team for a team of p_size characters.
create function public.check_team_of(p_user uuid, p_instance_ids uuid[], p_size integer)
returns uuid[]
language plpgsql
stable
set search_path = ''
as $$
declare
  v_definitions uuid[];
begin
  if coalesce(cardinality(p_instance_ids), 0) <> p_size then
    raise exception 'invalid_team_size' using errcode = '22023';
  end if;
  if (select count(distinct u.id) from unnest(p_instance_ids) as u(id)) <> p_size then
    raise exception 'duplicate_card' using errcode = '22023';
  end if;

  select array_agg(i.definition_id order by u.ord) into v_definitions
  from unnest(p_instance_ids) with ordinality as u(id, ord)
  join public.card_instances i on i.id = u.id and i.owner_id = p_user;
  if coalesce(cardinality(v_definitions), 0) <> p_size then
    raise exception 'card_not_owned' using errcode = '22023';
  end if;

  -- Two copies of the same character are not allowed (SPEC §5.2).
  if (select count(distinct d.id) from unnest(v_definitions) as d(id)) <> p_size then
    raise exception 'duplicate_character' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.conquest_claims c
    where c.resolved_at is null and c.loser_id = p_user and c.eligible_instance_ids && p_instance_ids
  ) then
    raise exception 'card_at_stake' using errcode = '22023';
  end if;
  return v_definitions;
end;
$$;

revoke execute on function public.check_team_of(uuid, uuid[], integer) from public, anon, authenticated;

-- Same as before, now through check_team_of.
create or replace function public.check_team(p_user uuid, p_instance_ids uuid[])
returns uuid[]
language sql
stable
set search_path = ''
as $$
  select public.check_team_of(p_user, p_instance_ids, public.config_int('match.team_size'))
$$;

-- validate_team for a team of a format: closes abandoned matches and settles expired picks, then checks.
create function public.validate_team_for(p_user uuid, p_instance_ids uuid[], p_format text)
returns uuid[]
language plpgsql
volatile
set search_path = ''
as $$
begin
  perform public.close_abandoned_matches(p_user);
  perform public.settle_expired_claims(p_user);
  return public.check_team_of(p_user, p_instance_ids, public.team_size_for(p_format));
end;
$$;

revoke execute on function public.validate_team_for(uuid, uuid[], text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Threat modifiers: drawn on the three threats, the same in every round
-- ---------------------------------------------------------------------------

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
  if new.format = 'boss' then
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
-- Matches
-- ---------------------------------------------------------------------------

-- The rows of a round: one contest per threat, all with the same deadline.
create function public.open_triple_round(p_match_id uuid, p_round integer)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_threats integer := public.config_int('triple.threats');
  v_ids uuid[];
  v_deadline timestamptz := now() + make_interval(
    secs => public.config_int('match.reveal_pause_seconds') + public.config_int('triple.round_timer_seconds')
  );
begin
  select threat_ids into v_ids from public.matches where id = p_match_id;
  insert into public.match_rounds (match_id, round, threat_id, deadline_at)
  select p_match_id, (p_round - 1) * v_threats + s, v_ids[(p_round - 1) * v_threats + s], v_deadline
  from generate_series(1, v_threats) as s;
  update public.matches set current_round = (p_round - 1) * v_threats + 1 where id = p_match_id;
end;
$$;

revoke execute on function public.open_triple_round(uuid, integer) from public, anon, authenticated;

-- Creates an Allarme Triplo from checked decks: against a bot (no player B) or
-- between two players. The threats are drawn here among the active ones of Nuova
-- Megara, of any level, unless they are given (tests); the decks are shuffled here.
create function public.insert_triple_match(
  p_mode text,
  p_player_a uuid,
  p_team_a uuid[],
  p_definitions_a uuid[],
  p_player_b uuid,
  p_team_b uuid[],
  p_definitions_b uuid[],
  p_bot_difficulty text,
  p_threat_ids uuid[] default null
)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_threats integer := public.config_int('triple.threats');
  v_rounds integer := public.config_int('triple.rounds');
  v_bot boolean := p_mode = 'bot';
  v_picked uuid[];
  v_ids uuid[];
  v_levels integer[];
  v_order_a integer[];
  v_order_b integer[];
  v_match uuid;
begin
  if p_mode not in ('bot', 'friendly') or v_bot <> (p_player_b is null) or v_bot <> (p_bot_difficulty is not null) then
    raise exception 'invalid_request';
  end if;
  if p_player_a = p_player_b then
    raise exception 'cannot_play_yourself';
  end if;
  if public.has_active_match(p_player_a) or (p_player_b is not null and public.has_active_match(p_player_b)) then
    raise exception 'match_already_active';
  end if;

  if p_threat_ids is null then
    select array_agg(t.id) into v_picked
    from (select id from public.threat_definitions where is_active and region = 'megara' order by random() limit v_threats) t;
  else
    v_picked := p_threat_ids;
  end if;
  if coalesce(cardinality(v_picked), 0) <> v_threats
     or (select count(distinct u.id) from unnest(v_picked) as u(id)
         join public.threat_definitions t on t.id = u.id and t.is_active and t.region = 'megara') <> v_threats then
    raise exception 'invalid_threats';
  end if;

  -- The three threats, once per round.
  select array_agg(v_picked[s] order by r, s), array_agg(t.level order by r, s)
  into v_ids, v_levels
  from generate_series(1, v_rounds) as r
  cross join generate_series(1, v_threats) as s
  join public.threat_definitions t on t.id = v_picked[s];

  -- The draw order of each deck.
  v_order_a := array(select g from generate_series(1, cardinality(p_definitions_a)) as g order by random());
  v_order_b := array(select g from generate_series(1, cardinality(p_definitions_b)) as g order by random());

  insert into public.matches (mode, format, bot_difficulty, player_a, player_b, threat_ids, threat_levels)
  values (p_mode, 'triple', p_bot_difficulty, p_player_a, p_player_b, v_ids, v_levels)
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

  perform public.open_triple_round(v_match, 1);

  if not v_bot then
    delete from public.match_lobbies where host_id in (p_player_a, p_player_b);
    delete from public.matchmaking_queue where user_id in (p_player_a, p_player_b);
    perform public.notify_player(p_player_a, 'match_started', v_match);
    perform public.notify_player(p_player_b, 'match_started', v_match);
  end if;
  return v_match;
end;
$$;

revoke execute on function public.insert_triple_match(text, uuid, uuid[], uuid[], uuid, uuid[], uuid[], text, uuid[]) from public, anon, authenticated;

-- An Allarme Triplo against a bot, always friendly (SPEC §5.13).
create function public.match_create_triple_bot(
  p_user uuid,
  p_difficulty text,
  p_card_instance_ids uuid[],
  p_bot_definition_ids uuid[],
  p_threat_ids uuid[] default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_size integer := public.triple_deck_size();
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

  v_definitions := public.validate_team_for(p_user, p_card_instance_ids, 'triple');

  if coalesce(cardinality(p_bot_definition_ids), 0) <> v_size
     or (select count(distinct d.id) from unnest(p_bot_definition_ids) as d(id)
         join public.card_definitions c on c.id = d.id and c.is_active) <> v_size then
    raise exception 'invalid_bot_team';
  end if;

  return public.insert_triple_match(
    'bot', p_user, p_card_instance_ids, v_definitions, null, null, p_bot_definition_ids, p_difficulty, p_threat_ids
  );
end;
$$;

revoke execute on function public.match_create_triple_bot(uuid, text, uuid[], uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public.match_create_triple_bot(uuid, text, uuid[], uuid[], uuid[]) to service_role;

-- ---------------------------------------------------------------------------
-- Rounds
-- ---------------------------------------------------------------------------

-- Stores a round computed by the engine. Checks the round, that each side places
-- exactly the cards it drew (the next ones of its deck), one per threat, the choices
-- submitted (between players) or the deadline (against a bot), who won each threat
-- against the scores, and the final result. p_plays_a and p_plays_b have one play
-- per threat, in threat order: { card_instance_id, definition_id, base, bonus,
-- score, highest, auto_played }; p_winners one entry per threat: "a", "b" or null.
create function public.match_record_triple_round(
  p_match_id uuid,
  p_round integer,
  p_plays_a jsonb,
  p_plays_b jsonb,
  p_winners jsonb,
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
  v_threats integer := public.config_int('triple.threats');
  v_rounds integer := public.config_int('triple.rounds');
  v_first integer := (p_round - 1) * public.config_int('triple.threats') + 1;
  v_deadline timestamptz;
  v_side text;
  v_plays jsonb;
  v_play jsonb;
  v_contest integer;
  v_position integer;
  v_instance uuid;
  v_definition uuid;
  v_auto boolean;
  v_hand_instances uuid[];
  v_hand_definitions uuid[];
  v_placed uuid[];
  v_pending_count integer;
  v_winner text;
  v_score_a integer;
  v_score_b integer;
  v_won_a integer := 0;
  v_won_b integer := 0;
  v_sum_a integer := 0;
  v_sum_b integer := 0;
  v_total_a integer;
  v_total_b integer;
  v_finished boolean;
  v_result text;
  v_grace integer := public.config_int('match.timeout_grace_seconds');
begin
  select * into v_match from public.matches where id = p_match_id for update;
  if v_match.id is null or v_match.status <> 'active' then
    raise exception 'match_not_active';
  end if;
  if v_match.format <> 'triple' then
    raise exception 'invalid_format';
  end if;
  if p_round is null or p_round < 1 or v_match.current_round <> v_first then
    raise exception 'round_already_resolved';
  end if;
  select max(deadline_at) into v_deadline
  from public.match_rounds
  where match_id = p_match_id and round between v_first and v_first + v_threats - 1 and resolved_at is null;
  if v_deadline is null
     or (select count(*) from public.match_rounds
         where match_id = p_match_id and round between v_first and v_first + v_threats - 1 and resolved_at is null) <> v_threats then
    raise exception 'round_already_resolved';
  end if;
  if jsonb_typeof(p_plays_a) is distinct from 'array' or jsonb_array_length(p_plays_a) <> v_threats
     or jsonb_typeof(p_plays_b) is distinct from 'array' or jsonb_array_length(p_plays_b) <> v_threats
     or jsonb_typeof(p_winners) is distinct from 'array' or jsonb_array_length(p_winners) <> v_threats then
    raise exception 'invalid_placement';
  end if;

  foreach v_side in array array['a', 'b'] loop
    v_plays := case v_side when 'a' then p_plays_a else p_plays_b end;
    select * into v_team from public.match_teams where match_id = p_match_id and side = v_side;
    v_hand_instances := v_team.card_instance_ids[v_first:v_first + v_threats - 1];
    v_hand_definitions := v_team.definition_ids[v_first:v_first + v_threats - 1];
    v_placed := array[]::uuid[];

    select count(*) into v_pending_count from public.pending_plays
    where match_id = p_match_id and side = v_side and round between v_first and v_first + v_threats - 1;

    for s in 1 .. v_threats loop
      v_play := v_plays -> (s - 1);
      v_contest := v_first + s - 1;
      v_definition := (v_play ->> 'definition_id')::uuid;
      v_instance := (v_play ->> 'card_instance_id')::uuid;
      v_auto := coalesce((v_play ->> 'auto_played')::boolean, false);

      -- Only the cards drawn this round, each on one threat.
      if v_team.card_instance_ids is not null then
        v_position := array_position(v_hand_instances, v_instance);
        if v_position is null or v_hand_definitions[v_position] is distinct from v_definition then
          raise exception 'character_not_available';
        end if;
      elsif v_instance is not null or not (v_definition = any (v_hand_definitions)) then
        raise exception 'character_not_available';
      end if;
      if v_definition = any (v_placed) then
        raise exception 'invalid_placement';
      end if;
      v_placed := v_placed || v_definition;

      if v_team.user_id is not null then
        if v_match.bot_difficulty is not null then
          -- A human choice after the deadline is refused: the engine must place at random.
          if not v_auto and now() > v_deadline + make_interval(secs => v_grace) then
            raise exception 'round_expired';
          end if;
        else
          select * into v_pending from public.pending_plays
          where match_id = p_match_id and round = v_contest and side = v_side;
          if v_auto and v_pending_count > 0 then
            raise exception 'choice_ignored';
          end if;
          if not v_auto and v_pending.card_instance_id is distinct from v_instance then
            raise exception 'choice_not_submitted';
          end if;
          if v_auto and now() <= v_deadline + make_interval(secs => v_grace) then
            raise exception 'round_not_expired';
          end if;
        end if;
      end if;

      if (v_play ->> 'score')::integer is null or (v_play ->> 'score')::integer < 0 then
        raise exception 'invalid_points';
      end if;

      insert into public.round_plays (
        match_id, round, side, card_instance_id, definition_id,
        base_score, bonus, score, highest_value, auto_played
      ) values (
        p_match_id, v_contest, v_side, v_instance, v_definition,
        (v_play ->> 'base')::integer, (v_play ->> 'bonus')::integer, (v_play ->> 'score')::integer,
        (v_play ->> 'highest')::integer, v_auto
      );
    end loop;
  end loop;

  -- Who won each threat, against the scores: an equal score is settled by the
  -- engine (Implacabile, highest value) or left to nobody.
  for s in 1 .. v_threats loop
    v_contest := v_first + s - 1;
    v_winner := p_winners ->> (s - 1);
    if v_winner is not null and v_winner not in ('a', 'b') then
      raise exception 'invalid_points';
    end if;
    v_score_a := (p_plays_a -> (s - 1) ->> 'score')::integer;
    v_score_b := (p_plays_b -> (s - 1) ->> 'score')::integer;
    if (v_score_a > v_score_b and v_winner is distinct from 'a')
       or (v_score_a < v_score_b and v_winner is distinct from 'b') then
      raise exception 'invalid_points';
    end if;
    v_won_a := v_won_a + (v_winner is not distinct from 'a')::integer;
    v_won_b := v_won_b + (v_winner is not distinct from 'b')::integer;
    v_sum_a := v_sum_a + v_score_a;
    v_sum_b := v_sum_b + v_score_b;
    update public.match_rounds
    set winner_side = coalesce(v_winner, 'none'), resolved_at = now()
    where match_id = p_match_id and round = v_contest;
  end loop;

  delete from public.pending_plays
  where match_id = p_match_id and round between v_first and v_first + v_threats - 1;

  update public.matches
  set rounds_won_a = rounds_won_a + v_won_a,
      rounds_won_b = rounds_won_b + v_won_b,
      total_score_a = total_score_a + v_sum_a,
      total_score_b = total_score_b + v_sum_b
  where id = p_match_id
  returning rounds_won_a, rounds_won_b, total_score_a, total_score_b
  into v_won_a, v_won_b, v_total_a, v_total_b;

  -- Points, then the sum of scores, then a draw.
  v_finished := p_round >= v_rounds;
  v_result := case
    when not v_finished then null
    when v_won_a <> v_won_b then case when v_won_a > v_won_b then 'a' else 'b' end
    when v_total_a <> v_total_b then case when v_total_a > v_total_b then 'a' else 'b' end
    else 'draw'
  end;
  if v_result is distinct from p_result then
    raise exception 'result_mismatch';
  end if;

  if v_finished then
    perform public.finish_match(p_match_id, v_result, 'completed');
  else
    perform public.open_triple_round(p_match_id, p_round + 1);
    perform public.notify_match(p_match_id, 'round');
  end if;
end;
$$;

-- Stores a round, then returns the match as the given side sees it.
create function public.match_record_triple_round_state(
  p_match_id uuid,
  p_round integer,
  p_plays_a jsonb,
  p_plays_b jsonb,
  p_winners jsonb,
  p_result text,
  p_side text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.match_record_triple_round(p_match_id, p_round, p_plays_a, p_plays_b, p_winners, p_result);
  return public.match_state_payload(p_match_id, p_side);
end;
$$;

revoke execute on function public.match_record_triple_round(uuid, integer, jsonb, jsonb, jsonb, text) from public, anon, authenticated;
revoke execute on function public.match_record_triple_round_state(uuid, integer, jsonb, jsonb, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.match_record_triple_round_state(uuid, integer, jsonb, jsonb, jsonb, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Between players: the three cards of a round in one choice
-- ---------------------------------------------------------------------------

-- A player places the cards drawn this round, one per threat (p_card_instance_ids
-- in threat order). The choice can change until the round is resolved. Returns
-- 'ready' when both players have placed.
create function public.match_submit_triple(
  p_user uuid,
  p_match_id uuid,
  p_round integer,
  p_card_instance_ids uuid[]
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_side text;
  v_team public.match_teams;
  v_threats integer := public.config_int('triple.threats');
  v_first integer := (p_round - 1) * public.config_int('triple.threats') + 1;
  v_deadline timestamptz;
  v_hand uuid[];
begin
  select * into v_match from public.matches where id = p_match_id for update;
  v_side := case when v_match.player_a = p_user then 'a' when v_match.player_b = p_user then 'b' end;
  if v_side is null or v_match.bot_difficulty is not null or v_match.format <> 'triple' then
    raise exception 'match_not_found';
  end if;
  if v_match.status <> 'active' then
    raise exception 'match_not_active';
  end if;
  if p_round is null or p_round < 1 or v_match.current_round <> v_first then
    raise exception 'round_already_resolved';
  end if;
  select max(deadline_at) into v_deadline from public.match_rounds
  where match_id = p_match_id and round between v_first and v_first + v_threats - 1;
  if now() > v_deadline + make_interval(secs => public.config_int('match.timeout_grace_seconds')) then
    raise exception 'round_expired';
  end if;

  select * into v_team from public.match_teams where match_id = p_match_id and side = v_side;
  v_hand := v_team.card_instance_ids[v_first:v_first + v_threats - 1];
  if coalesce(cardinality(p_card_instance_ids), 0) <> v_threats
     or (select count(distinct u.id) from unnest(p_card_instance_ids) as u(id) where u.id = any (v_hand)) <> v_threats then
    raise exception 'invalid_placement';
  end if;

  perform set_config('o_mega.triple_submit', 'on', true);
  insert into public.pending_plays (match_id, round, side, card_instance_id)
  select p_match_id, v_first + u.ord::integer - 1, v_side, u.id
  from unnest(p_card_instance_ids) with ordinality as u(id, ord)
  on conflict (match_id, round, side) do update
  set card_instance_id = excluded.card_instance_id, submitted_at = now();
  perform set_config('o_mega.triple_submit', 'off', true);

  update public.match_teams set last_seen_at = now() where match_id = p_match_id and side = v_side;
  perform public.notify_match(p_match_id, 'choice');

  return case
    when (select count(*) from public.pending_plays
          where match_id = p_match_id and round between v_first and v_first + v_threats - 1) = 2 * v_threats
    then 'ready' else 'waiting'
  end;
end;
$$;

revoke execute on function public.match_submit_triple(uuid, uuid, integer, uuid[]) from public, anon, authenticated;
grant execute on function public.match_submit_triple(uuid, uuid, integer, uuid[]) to service_role;

-- A card at a time is the choice of a classic match or a Grande Minaccia: in an
-- Allarme Triplo only match_submit_triple writes choices, three at once.
create function public.check_pending_format()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select format from public.matches where id = new.match_id) = 'triple'
     and current_setting('o_mega.triple_submit', true) is distinct from 'on' then
    raise exception 'invalid_format';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_pending_format() from public, anon, authenticated;

create trigger pending_plays_check_triple
  before insert or update on public.pending_plays
  for each row execute function public.check_pending_format();

-- ---------------------------------------------------------------------------
-- The match as a player sees it
-- ---------------------------------------------------------------------------

-- An Allarme Triplo as one side sees it: the three threats with their modifiers from
-- the start; the whole deck, but drawn cards only for the rounds already open; the
-- opponent's cards of a round only once it is resolved.
create function public.triple_state_payload(p_match_id uuid, p_side text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with m as (
    select * from public.matches where id = p_match_id
  ), k as (
    select public.config_int('triple.threats') as threats, public.config_int('triple.rounds') as rounds
  ), mine as (
    select * from public.match_teams where match_id = p_match_id and side = p_side
  ), theirs as (
    select * from public.match_teams where match_id = p_match_id and side <> p_side
  )
  select jsonb_build_object(
    'id', m.id,
    'mode', m.mode,
    'format', m.format,
    'bot_difficulty', m.bot_difficulty,
    'status', m.status,
    'my_side', p_side,
    -- The round being played (1-based), and how many there are.
    'current_round', (m.current_round - 1) / k.threats + 1,
    'rounds_count', k.rounds,
    'threats', (
      select jsonb_agg(jsonb_build_object(
        'slot', u.ord - 1, 'name', t.name, 'level', t.level,
        'abilities', to_jsonb(t.required_abilities), 'flavor', t.flavor,
        'modifier', m.threat_modifiers -> (u.ord::integer - 1)
      ) order by u.ord)
      from unnest(m.threat_ids[1:k.threats]) with ordinality as u(id, ord)
      join public.threat_definitions t on t.id = u.id
    ),
    'points', jsonb_build_object(
      'me', case p_side when 'a' then m.rounds_won_a else m.rounds_won_b end,
      'opponent', case p_side when 'a' then m.rounds_won_b else m.rounds_won_a end
    ),
    'total_score', jsonb_build_object(
      'me', case p_side when 'a' then m.total_score_a else m.total_score_b end,
      'opponent', case p_side when 'a' then m.total_score_b else m.total_score_a end
    ),
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
    ),
    -- Spia: one opposing card not played yet, only for the side that played it.
    'spied_cards', coalesce((
      select jsonb_agg(public.card_payload(sr.definition_id, null) || jsonb_build_object(
        'round', (sr.round - 1) / k.threats + 1
      ) order by sr.round)
      from public.spy_reveals sr
      where sr.match_id = p_match_id and sr.side = p_side
    ), '[]'::jsonb),
    -- The whole deck in a fixed order that says nothing about the draw; the round
    -- each card was drawn in only once that round is open.
    'my_deck', (
      select jsonb_agg(public.card_payload(u.definition_id, u.instance_id) || jsonb_build_object(
        'instance_id', u.instance_id,
        'drawn_round', case when u.ord <= m.current_round + k.threats - 1 then (u.ord::integer - 1) / k.threats + 1 end,
        'played', exists (
          select 1 from public.round_plays rp
          where rp.match_id = p_match_id and rp.side = p_side and rp.card_instance_id = u.instance_id
        )
      ) order by d.name, u.instance_id)
      from mine, unnest(mine.card_instance_ids, mine.definition_ids) with ordinality as u(instance_id, definition_id, ord)
      join public.card_definitions d on d.id = u.definition_id
    ),
    'rounds', coalesce((
      select jsonb_agg(jsonb_build_object(
        'round', g.round,
        'deadline_at', g.deadline_at,
        'resolved', g.resolved,
        -- The cards this side drew in that round, in draw order.
        'hand', (
          select jsonb_agg(public.card_payload(u.definition_id, u.instance_id) || jsonb_build_object('instance_id', u.instance_id) order by u.ord)
          from mine, unnest(mine.card_instance_ids, mine.definition_ids) with ordinality as u(instance_id, definition_id, ord)
          where (u.ord::integer - 1) / k.threats + 1 = g.round
        ),
        -- This side's choice, one card per threat, until the round is resolved.
        'my_pending', (
          select jsonb_agg(pp.card_instance_id order by pp.round)
          from public.pending_plays pp
          where pp.match_id = p_match_id and pp.side = p_side
            and (pp.round - 1) / k.threats + 1 = g.round
        ),
        -- Only whether the opponent has placed, never what.
        'opponent_has_chosen', exists (
          select 1 from public.pending_plays pp
          where pp.match_id = p_match_id and pp.side <> p_side and (pp.round - 1) / k.threats + 1 = g.round
        ),
        'contests', (
          select jsonb_agg(jsonb_build_object(
            'slot', (mr.round - 1) % k.threats,
            'winner', case
              when mr.resolved_at is null then null
              when mr.winner_side = 'none' then 'none'
              when mr.winner_side = p_side then 'me'
              else 'opponent' end,
            'my_play', (
              select jsonb_build_object(
                'instance_id', rp.card_instance_id, 'definition_id', rp.definition_id,
                'base', rp.base_score, 'bonus', rp.bonus, 'score', rp.score,
                'highest', rp.highest_value, 'auto_played', rp.auto_played
              )
              from public.round_plays rp
              where rp.match_id = p_match_id and rp.round = mr.round and rp.side = p_side
            ),
            'opponent_play', case when mr.resolved_at is null then null else (
              select public.card_payload(rp.definition_id, rp.card_instance_id) || jsonb_build_object(
                'base', rp.base_score, 'bonus', rp.bonus, 'score', rp.score,
                'highest', rp.highest_value, 'auto_played', rp.auto_played
              )
              from public.round_plays rp
              where rp.match_id = p_match_id and rp.round = mr.round and rp.side <> p_side
            ) end
          ) order by mr.round)
          from public.match_rounds mr
          where mr.match_id = p_match_id and (mr.round - 1) / k.threats + 1 = g.round
        )
      ) order by g.round)
      from (
        select (mr.round - 1) / k.threats + 1 as round, max(mr.deadline_at) as deadline_at,
               bool_and(mr.resolved_at is not null) as resolved
        from public.match_rounds mr
        where mr.match_id = p_match_id
        group by (mr.round - 1) / k.threats + 1
      ) g
    ), '[]'::jsonb)
  )
  from m, k
$$;

revoke execute on function public.triple_state_payload(uuid, text) from public, anon, authenticated;

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
  end if;
  return public.classic_match_state_payload(p_match_id, p_side);
end;
$$;

-- ---------------------------------------------------------------------------
-- Friend codes and the queue
-- ---------------------------------------------------------------------------

-- Same as before; an Allarme Triplo lobby holds a deck of nine.
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
  if p_format is null or p_format not in ('classic', 'boss', 'triple') then
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

-- Same as before; an Allarme Triplo draws its threats and shuffles the decks here.
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
  return public.insert_pvp_match(
    'friendly', v_lobby.host_id, v_lobby.card_instance_ids, v_host_definitions,
    p_guest, p_team, v_guest_definitions, p_threat_ids
  );
end;
$$;

-- Same as before, with Allarme Triplo: friendly only, decks of nine.
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
  if p_mode not in ('friendly', 'conquest') or p_format is null or p_format not in ('classic', 'boss', 'triple')
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

-- Same as before; the choices of every contest of the round being played (an Allarme
-- Triplo has three), each with its contest.
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
      'boss_values', v_match.boss_values
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
        'required', p.required
      )), '[]'::jsonb)
      from public.round_plays p where p.match_id = p_match_id
    ),
    -- Choices already submitted for the round being played (matches between players).
    'pending', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'side', q.side, 'card_instance_id', q.card_instance_id, 'front_slot', q.front_slot, 'round', q.round
      )), '[]'::jsonb)
      from public.pending_plays q
      where q.match_id = p_match_id and q.round between v_match.current_round
        and v_match.current_round + case when v_match.format = 'triple' then public.config_int('triple.threats') - 1 else 0 end
    )
  );
end;
$$;
