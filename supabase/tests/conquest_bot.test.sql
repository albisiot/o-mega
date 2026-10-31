-- Integration test for Conquest against a bot after the wait in the queue:
-- entry, cards won and lost, ledger, what a bot match refuses. Service-only
-- functions are called as the database owner. Runs inside a rolled-back
-- transaction: npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000d4', 'authenticated', 'authenticated', 'cqb-a@example.test', '{"full_name": "Conquista Bot"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000d4", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

create function pg_temp.give(p_user uuid, p_code text) returns uuid language sql as $$
  insert into public.card_instances (definition_id, owner_id, acquired_via)
  select id, p_user, 'pack' from public.card_definitions where code = p_code
  returning id
$$;

-- Plays a whole match won 3-0 by the given side. Scores are made up: the
-- database checks who won from them, not from the stats.
create function pg_temp.finish(p_match uuid, p_winner text) returns void language plpgsql as $$
declare
  v_team uuid[] := (select card_instance_ids from public.match_teams where match_id = p_match and side = 'a');
  v_defs uuid[] := (select definition_ids from public.match_teams where match_id = p_match and side = 'a');
  v_bot uuid[] := (select definition_ids from public.match_teams where match_id = p_match and side = 'b');
  v_a integer := case p_winner when 'a' then 20 else 4 end;
  v_b integer := case p_winner when 'a' then 4 else 20 end;
begin
  for i in 1..3 loop
    perform public.match_record_round(p_match, i,
      jsonb_build_object('card_instance_id', v_team[i], 'definition_id', v_defs[i],
        'base', v_a, 'bonus', 0, 'score', v_a, 'highest', 10, 'auto_played', false),
      jsonb_build_object('definition_id', v_bot[i],
        'base', v_b, 'bonus', 0, 'score', v_b, 'highest', 10, 'auto_played', false),
      p_winner, case when i = 3 then p_winner end);
  end loop;
end;
$$;

create function pg_temp.waited(p_user uuid) returns void language sql as $$
  update public.matchmaking_queue set enqueued_at = now() - make_interval(secs => 61) where user_id = p_user
$$;

do $$
declare
  v_threats uuid[];
  v_bot uuid[];
begin
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;
  perform set_config('test.threats', v_threats::text, true);

  select array_agg(s.id) into v_bot from (
    select id from public.card_definitions where is_active and rarity_code = 'delta' order by code limit 5
  ) s;
  perform set_config('test.bot', v_bot::text, true);

  select array_agg(s.id) into v_bot from (
    select id from public.card_definitions where is_active and rarity_code = 'gamma' order by code limit 5
  ) s;
  perform set_config('test.rare', v_bot::text, true);
end $$;

do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000d4';
  v_threats uuid[] := current_setting('test.threats')::uuid[];
  v_bot uuid[] := current_setting('test.bot')::uuid[];
  v_rare uuid[] := current_setting('test.rare')::uuid[];
  v_team uuid[];
  v_match uuid;
  v_state jsonb;
  v_offered jsonb;
  v_pick uuid;
  v_copies uuid[];
  v_lost uuid;
begin
  update public.profiles set conquest_unlocked = true where id = v_user;
  v_team := array[pg_temp.give(v_user, 'P025'), pg_temp.give(v_user, 'P026'), pg_temp.give(v_user, 'P027')]
    || (select array_agg(s.id) from (
          select id from public.card_instances where owner_id = v_user and is_starter order by acquired_at, id limit 2
        ) s);

  -- No queue entry, then too short a wait: no match.
  assert public.match_create_conquest_bot(v_user, 'hard', v_bot, v_threats) is null, 'a bot without queueing';
  assert public.match_queue_join(v_user, 'conquest', v_team, v_threats) is null, 'nobody was waiting';
  assert public.match_create_conquest_bot(v_user, 'hard', v_bot, v_threats) is null, 'a bot before the wait';

  -- A friendly queue never turns into Conquest.
  perform pg_temp.waited(v_user);
  update public.matchmaking_queue set mode = 'friendly' where user_id = v_user;
  assert public.match_create_conquest_bot(v_user, 'hard', v_bot, v_threats) is null, 'a bot from the friendly queue';
  update public.matchmaking_queue set mode = 'conquest' where user_id = v_user;

  v_match := public.match_create_conquest_bot(v_user, 'hard', v_bot, v_threats);
  assert v_match is not null, 'no bot after the wait';
  assert (select mode = 'conquest' and bot_difficulty = 'hard' and player_b is null from public.matches where id = v_match), 'match shape';
  assert not exists (select 1 from public.matchmaking_queue where user_id = v_user), 'still queued';

  -- The player's path of a match between players is closed.
  begin
    perform public.match_submit_play(v_user, v_match, 1, v_team[1]);
    raise exception 'ASSERT: secret choice against a bot';
  exception when raise_exception then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'match_not_found', sqlerrm;
  end;
  perform set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', v_user), true);
  begin
    perform public.claim_victory(v_match);
    raise exception 'ASSERT: victory claimed against a bot';
  exception when raise_exception or no_data_found then
    if sqlerrm like 'ASSERT:%' then raise; end if;
    assert sqlerrm = 'match_not_found', sqlerrm;
  end;

  -- Win: copies on offer, and the pick is a new card with the usual lock.
  perform pg_temp.finish(v_match, 'a');
  v_state := public.get_match_state(v_match);
  assert v_state -> 'conquest' ->> 'role' = 'winner', 'winner role';
  v_offered := v_state -> 'conquest' -> 'offered';
  assert jsonb_array_length(v_offered) = 5, 'the bot team is on offer';
  v_pick := (v_offered -> 0 ->> 'instance_id')::uuid;
  assert (select owner_id is null from public.card_instances where id = v_pick), 'copy owned too early';
  v_copies := (select card_instance_ids from public.match_teams where match_id = v_match and side = 'b');

  perform public.claim_conquest_card(v_match, v_pick);
  assert (select owner_id = v_user and locked_until > now() and out_of_play_at is null and acquired_via = 'conquest'
          from public.card_instances where id = v_pick), 'the won card';
  assert (select count(*) from public.card_instances where id = any (v_copies)) = 1, 'unpicked copies left over';
  assert (select count(*) from public.card_transfers
          where match_id = v_match and from_user is null and to_user = v_user and instance_id = v_pick) = 1, 'win not on the ledger';
  assert public.cards_lost_today(v_user) = 0, 'a win counted as a loss';
  assert (select cards_conquered = 1 and bot_wins = 1 and wins = 0 from public.profiles where id = v_user), 'win statistics';
  assert (select public.get_conquest_history() -> 0 ->> 'opponent') = 'Bot', 'history names the bot';

  -- Loss to a Delta team: its rarity limit protects the Gamma cards, no starter is taken.
  perform public.match_queue_join(v_user, 'conquest', v_team, v_threats);
  perform pg_temp.waited(v_user);
  v_match := public.match_create_conquest_bot(v_user, 'easy', v_bot, v_threats);
  perform pg_temp.finish(v_match, 'b');
  v_state := public.get_match_state(v_match);
  assert (v_state -> 'conquest' ->> 'resolved')::boolean and v_state -> 'conquest' -> 'chosen' = 'null'::jsonb, 'card taken over the limit';
  assert (v_state -> 'conquest' ->> 'bonus_coins')::integer = 0, 'a bonus for the bot';
  assert public.cards_lost_today(v_user) = 0, 'nothing was lost';

  -- Loss to a Gamma team: the bot takes a card at once, and it leaves the game.
  perform public.match_queue_join(v_user, 'conquest', v_team, v_threats);
  perform pg_temp.waited(v_user);
  v_match := public.match_create_conquest_bot(v_user, 'medium', v_rare, v_threats);
  perform pg_temp.finish(v_match, 'b');
  v_state := public.get_match_state(v_match);
  assert v_state -> 'conquest' ->> 'role' = 'loser', 'loser role';
  assert (v_state -> 'conquest' ->> 'resolved')::boolean, 'the bot pick is immediate';
  assert not (v_state -> 'conquest' ->> 'auto_assigned')::boolean, 'not a timer';
  assert (v_state ->> 'reward_coins')::integer = public.config_int('conquest.loser_coins'), 'loser coins';
  v_lost := (select instance_id from public.card_transfers where match_id = v_match and to_user is null and from_user = v_user);
  assert v_lost = any (v_team[1:3]), 'the lost card';
  assert (select owner_id is null and out_of_play_at is not null and converted_at is null
          from public.card_instances where id = v_lost), 'the card left the game';
  assert public.cards_lost_today(v_user) = 1, 'the daily limit counts it';
  assert (select cards_lost = 1 from public.profiles where id = v_user), 'loss statistics';
  -- Everything in this transaction has the same time, so the order says nothing.
  assert (select count(*) from jsonb_array_elements(public.get_conquest_history()) e
          where not (e ->> 'won')::boolean and e ->> 'opponent' = 'Bot') = 1, 'history shows the loss';

  -- Walking away from a bot is a defeat: it does not save the card.
  v_team := array_replace(v_team, v_lost, pg_temp.give(v_user, 'P030'));
  perform public.match_queue_join(v_user, 'conquest', v_team, v_threats);
  perform pg_temp.waited(v_user);
  v_match := public.match_create_conquest_bot(v_user, 'super_pro', v_rare, v_threats);
  update public.match_rounds set deadline_at = now() - interval '11 minutes' where match_id = v_match;
  perform public.close_abandoned_matches(v_user);
  assert (select status = 'finished' and result = 'b' and end_reason = 'forfeit' from public.matches where id = v_match), 'abandoned match';
  assert public.cards_lost_today(v_user) = 2, 'abandoning saved the card';
end $$;

rollback;
