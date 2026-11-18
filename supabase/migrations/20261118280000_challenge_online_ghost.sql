-- Sfide a tema online (SPEC §8.8): when nobody of the challenge is free, after 20-30 seconds
-- the server finds the opponent, as in the Classificata (SPEC §8.7). It is one of the
-- Classificata's opponents (ranked_ghosts: a name, a face, a level), it chooses with a person's
-- timing (ranked_ghost_turns) and every payload shows it as a person; the Edge Function plays
-- it with a bot of the challenge's levels (any of Facile, Medio, Difficile when the challenge
-- has none), its squad within the challenge's rules. Until now the waiting page offered the
-- challenge's bots instead.
--
-- The match is a friendly one of the challenge with no second player, kept with its opponent in
-- ranked_matches as a ranked match against the server is; it moves no Fama (only ranked matches
-- do), and the payloads show its ranked side only in a ranked match. Left too long, the player
-- loses it, as against any opponent of the server.

insert into public.game_config (key, value, description) values
  ('challenges.ghost_min_seconds', '20', 'Sfida a tema online: least seconds before the server''s opponent comes'),
  ('challenges.ghost_max_seconds', '30', 'Sfida a tema online: most seconds before the server''s opponent comes');

-- ---------------------------------------------------------------------------
-- The server's opponent outside the Classificata: no Fama shown, a lost match when left
-- ---------------------------------------------------------------------------

-- A friendly match of a challenge may have no second player and no bot: the server's opponent.
alter table public.matches drop constraint matches_one_opponent;
alter table public.matches add constraint matches_one_opponent check (
  (bot_difficulty is null) = (player_b is not null)
  -- A ranked match against the server's opponent: no second player, no difficulty on the match.
  or (mode = 'ranked' and bot_difficulty is null and player_b is null)
  -- The same in a Sfida a tema online.
  or (mode = 'friendly' and challenge_id is not null and bot_difficulty is null and player_b is null)
);

-- Same as in 20261117230000_ranked.sql: the ranked side (Fama, leagues) only in a ranked match;
-- the server's opponent shows as a person in any match.
create or replace function public.with_ranked(p_payload jsonb, p_match_id uuid, p_side text)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_ranked public.ranked_matches;
  v_ghost public.ranked_ghosts;
  v_before integer;
  v_delta integer;
  v_payload jsonb := p_payload;
  v_threats integer := public.config_int('triple.threats');
begin
  select * into v_ranked from public.ranked_matches where match_id = p_match_id;
  if v_ranked.match_id is null then
    return p_payload;
  end if;
  if exists (select 1 from public.matches m where m.id = p_match_id and m.mode = 'ranked') then
    v_before := case p_side when 'a' then v_ranked.fama_a else v_ranked.fama_b end;
    v_delta := case p_side when 'a' then v_ranked.delta_a else v_ranked.delta_b end;
    v_payload := v_payload || jsonb_build_object('ranked', jsonb_build_object(
      'fama', v_before,
      'opponent_fama', case p_side when 'a' then v_ranked.fama_b else v_ranked.fama_a end,
      'delta', v_delta,
      'league', public.ranked_league_of(v_before + coalesce(v_delta, 0)),
      'league_before', public.ranked_league_of(v_before),
      'next_league_at', public.ranked_next_league_at(v_before + coalesce(v_delta, 0)),
      'league_start', public.ranked_league_start(v_before + coalesce(v_delta, 0))
    ));
  end if;
  if v_ranked.ghost_id is null then
    return v_payload;
  end if;

  select * into v_ghost from public.ranked_ghosts where id = v_ranked.ghost_id;
  v_payload := jsonb_set(v_payload, '{opponent}', jsonb_build_object(
    'username', v_ghost.username,
    'avatar_url', (select d.art_url from public.card_definitions d where d.id = v_ghost.avatar_definition_id),
    'level', v_ghost.level,
    'last_seen_at', now()
  ));
  if jsonb_typeof(v_payload -> 'rounds') = 'array' then
    v_payload := jsonb_set(v_payload, '{rounds}', (
      select coalesce(jsonb_agg(case
        when x.e ? 'opponent_has_chosen' and not coalesce((x.e ->> 'resolved')::boolean, false) then
          jsonb_set(x.e, '{opponent_has_chosen}', to_jsonb(public.ranked_ghost_ready(
            p_match_id,
            -- Allarme Triplo lists rounds, the database counts contests (three per round).
            case when v_payload ->> 'format' = 'triple' then ((x.e ->> 'round')::integer - 1) * v_threats + 1
                 else (x.e ->> 'round')::integer end
          )))
        else x.e end order by x.ord), '[]'::jsonb)
      from jsonb_array_elements(v_payload -> 'rounds') with ordinality as x(e, ord)
    ));
  end if;
  return v_payload;
end;
$$;

-- Same as in 20261118250000_challenges.sql: the Fama of a match only for a ranked one; the
-- server's opponent by its name in any match.
create or replace function public.get_match_history(p_limit integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    (case when rm.match_id is null then x.e
     else x.e
       || case when m.mode = 'ranked' then jsonb_build_object('ranked', jsonb_build_object(
            'delta', case when m.player_a = auth.uid() then rm.delta_a else rm.delta_b end
          )) else '{}'::jsonb end
       || case when g.id is null then '{}'::jsonb else jsonb_build_object('opponent', g.username) end
     end)
    || case when t.match_id is null then '{}'::jsonb
       else jsonb_build_object('challenge', jsonb_build_object('title', t.title, 'color', t.color)) end
    order by x.ord
  ), '[]'::jsonb)
  from jsonb_array_elements(public.get_match_unranked_history(p_limit)) with ordinality as x(e, ord)
  left join public.ranked_matches rm on rm.match_id = (x.e ->> 'id')::uuid
  left join public.matches m on m.id = rm.match_id
  left join public.ranked_ghosts g on g.id = rm.ghost_id
  left join public.challenge_match_terms t on t.match_id = (x.e ->> 'id')::uuid
$$;

-- Same as in 20261117230000_ranked.sql: a match with no second player that is not a bot's is
-- against the server's opponent, in a ranked match or a challenge's: left too long, the player loses.
create or replace function public.close_abandoned_matches(p_user uuid)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_match public.matches;
begin
  for v_match in
    select m.* from public.matches m
    join public.match_rounds r on r.match_id = m.id and r.round = m.current_round
    where m.status = 'active'
      and (m.player_a = p_user or m.player_b = p_user)
      and r.deadline_at < now() - make_interval(mins => public.config_int('match.abandon_after_minutes'))
    for update of m
  loop
    perform public.finish_match(
      v_match.id,
      case when v_match.bot_difficulty is not null or v_match.player_b is null then 'b' else 'draw' end,
      'forfeit'
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- The challenge's queue
-- ---------------------------------------------------------------------------

-- How long a player waits in a challenge's queue before the server's opponent comes: a moment
-- of the window drawn from the player and the time they entered, so every refresh agrees.
create function public.challenge_ghost_wait(p_user uuid, p_since timestamptz)
returns interval
language sql
stable
set search_path = ''
as $$
  select make_interval(secs =>
    public.config_int('challenges.ghost_min_seconds')
    + mod(('x' || substr(md5(p_user::text || p_since::text), 1, 7))::bit(28)::integer,
          greatest(1, public.config_int('challenges.ghost_max_seconds')
                      - public.config_int('challenges.ghost_min_seconds') + 1))
  )
$$;

revoke execute on function public.challenge_ghost_wait(uuid, timestamptz) from public, anon, authenticated;

-- Same as in 20261118270000_challenges_stage3.sql, with what the Edge Function needs to plan
-- the server's opponent: the bots of the challenge, the rules (when the bot follows them), the
-- characters they admit and the rarity ranks.
create or replace function public.challenge_online_context(p_user uuid, p_challenge_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_challenge public.challenges;
begin
  select * into v_challenge from public.challenges where id = p_challenge_id;
  perform public.challenge_check_online(p_user, v_challenge);
  return jsonb_build_object(
    'format', v_challenge.format,
    'match_rules', v_challenge.match_rules,
    'bot_difficulties', to_jsonb(v_challenge.bot_difficulties),
    'rules', case when v_challenge.bot_follows_rules then v_challenge.rules else '{}'::jsonb end,
    'admitted_definition_ids', case when v_challenge.bot_follows_rules then (
      select coalesce(jsonb_agg(d.id), '[]'::jsonb)
      from public.card_definitions d
      where d.is_active and d.unlock_level is null and public.challenge_admits(d.id, v_challenge.rules)
    ) end,
    'rarity_ranks', (select jsonb_object_agg(r.code, r.rank) from public.rarity_definitions r)
  );
end;
$$;

-- A match of the challenge against the server's opponent: built exactly as a bot match of its
-- mode (same checks, threats, boss, decks), then a friendly one with no second player, its
-- opponent kept as in insert_ranked_ghost_match, the challenge's rules copied on it. Null when
-- no opponent of the server is free: the player keeps waiting.
create function public.challenge_insert_ghost_match(
  p_challenge public.challenges,
  p_user uuid,
  p_team uuid[],
  p_difficulty text,
  p_bot_definition_ids uuid[],
  p_threat_ids uuid[],
  p_boss_values jsonb
)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_fama integer := public.ranked_current_fama(p_user);
  v_level integer;
  v_ghost public.ranked_ghosts;
  v_match uuid;
  v_round integer;
begin
  if p_difficulty is null or p_difficulty not in ('easy', 'medium', 'hard', 'super_pro') then
    raise exception 'invalid_difficulty';
  end if;
  select level into v_level from public.profiles where id = p_user;
  v_ghost := public.ranked_pick_ghost(p_user, v_fama, coalesce(v_level, 1));
  if v_ghost.id is null then
    return null;
  end if;

  v_match := case
    when p_challenge.format = 'classic' then public.match_create_bot(p_user, p_difficulty, p_team, p_bot_definition_ids, p_threat_ids)
    when p_challenge.format = 'boss' then public.match_create_boss_bot(p_user, p_difficulty, p_team, p_bot_definition_ids, p_boss_values)
    when p_challenge.format = 'triple' then public.match_create_triple_bot(p_user, p_difficulty, p_team, p_bot_definition_ids, null)
    when public.is_quadrant(p_challenge.format) then
      public.match_create_quadrant_bot(p_user, p_difficulty, p_challenge.format, p_team, p_bot_definition_ids)
  end;
  if v_match is null then
    raise exception 'challenge_format_unsupported';
  end if;

  update public.matches set mode = 'friendly', bot_difficulty = null, challenge_id = p_challenge.id where id = v_match;
  update public.match_teams set last_seen_at = now() where match_id = v_match;
  insert into public.ranked_matches (match_id, ghost_id, ghost_difficulty, fama_a, fama_b)
  values (v_match, v_ghost.id, p_difficulty, v_fama, v_ghost.fama);
  for v_round in select r.round from public.match_rounds r where r.match_id = v_match and r.resolved_at is null loop
    perform public.ranked_plan_ghost_turn(v_match, v_round);
  end loop;
  perform public.challenge_tag_match(v_match, p_challenge);

  delete from public.challenge_queue where user_id = p_user;
  delete from public.match_lobbies where host_id = p_user;
  delete from public.matchmaking_queue where user_id = p_user;
  perform public.notify_player(p_user, 'match_started', v_match);
  return v_match;
end;
$$;

revoke execute on function public.challenge_insert_ghost_match(public.challenges, uuid, uuid[], text, uuid[], uuid[], jsonb) from public, anon, authenticated;

drop function public.challenge_queue_join(uuid, uuid, uuid[], uuid[], jsonb);

-- Same as in 20261118260000_challenges_stage2.sql: players of the challenge first; without one,
-- after the player's wait (challenge_ghost_wait) the server's opponent, planned by the Edge
-- Function and sent with every call (p_bot_difficulty, p_bot_definition_ids), as in the
-- Classificata's queue.
create function public.challenge_queue_join(
  p_user uuid,
  p_challenge_id uuid,
  p_team uuid[],
  p_threat_ids uuid[] default null,
  p_boss_values jsonb default null,
  p_bot_difficulty text default null,
  p_bot_definition_ids uuid[] default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_challenge public.challenges;
  v_definitions uuid[];
  v_problem text;
  v_other public.challenge_queue;
  v_other_definitions uuid[];
  v_match uuid;
  v_since timestamptz;
  v_ghost_due boolean;
begin
  select * into v_challenge from public.challenges where id = p_challenge_id;
  perform public.challenge_check_online(p_user, v_challenge);
  v_definitions := public.validate_team_for(p_user, p_team, v_challenge.format);
  v_problem := public.challenge_team_problem(v_challenge.rules, v_challenge.format, p_team);
  if v_problem is not null then
    raise exception '%', v_problem;
  end if;
  if public.has_active_match(p_user) then
    raise exception 'match_already_active';
  end if;

  select q.enqueued_at into v_since from public.challenge_queue q where q.user_id = p_user and q.challenge_id = v_challenge.id;
  v_since := coalesce(v_since, now());
  v_ghost_due := p_bot_difficulty is not null and v_since <= now() - public.challenge_ghost_wait(p_user, v_since);

  if v_ghost_due or exists (
    select 1 from public.challenge_queue q
    where q.challenge_id = v_challenge.id and q.user_id <> p_user
      and q.refreshed_at > now() - make_interval(secs => public.config_int('matchmaking.queue_stale_seconds'))
  ) then
    -- Serializes pairing with every other queue: two players are never paired twice at once.
    perform pg_advisory_xact_lock(hashtext('o-mega.matchmaking'));
    if public.has_active_match(p_user) then
      raise exception 'match_already_active';
    end if;
    for v_other in
      select * from public.challenge_queue q
      where q.challenge_id = v_challenge.id and q.user_id <> p_user
        and q.refreshed_at > now() - make_interval(secs => public.config_int('matchmaking.queue_stale_seconds'))
      order by q.enqueued_at
    loop
      begin
        v_other_definitions := public.check_team_of(
          v_other.user_id, v_other.card_instance_ids, public.team_size_for(v_challenge.format)
        );
        perform public.challenge_check_online(v_other.user_id, v_challenge);
        v_match := public.challenge_insert_pvp_match(
          v_challenge,
          v_other.user_id, v_other.card_instance_ids, v_other_definitions,
          p_user, p_team, v_definitions,
          p_threat_ids, p_boss_values
        );
        delete from public.challenge_queue where user_id in (p_user, v_other.user_id);
        return v_match;
      exception when others then
        -- That entry is no longer valid (cards gone, already playing, out of matches): drop it.
        if sqlerrm not in (
          'card_not_owned', 'duplicate_card', 'duplicate_character', 'invalid_team_size', 'match_already_active',
          'card_at_stake', 'challenge_card_not_admitted', 'challenge_starter_not_allowed', 'challenge_variants_required',
          'challenge_daily_limit', 'challenge_level_too_low', 'challenge_over_budget', 'challenge_rarity_limit',
          'challenge_too_few_factions'
        ) then
          raise;
        end if;
        delete from public.challenge_queue where user_id = v_other.user_id;
      end;
    end loop;

    if v_ghost_due then
      v_match := public.challenge_insert_ghost_match(
        v_challenge, p_user, p_team, p_bot_difficulty, p_bot_definition_ids, p_threat_ids, p_boss_values
      );
      if v_match is not null then
        return v_match;
      end if;
    end if;
  end if;

  -- One way to wait at a time.
  delete from public.match_lobbies where host_id = p_user;
  delete from public.matchmaking_queue where user_id = p_user;
  insert into public.challenge_queue (user_id, challenge_id, format, card_instance_ids)
  values (p_user, v_challenge.id, v_challenge.format, p_team)
  on conflict (user_id) do update
  set format = excluded.format, card_instance_ids = excluded.card_instance_ids, refreshed_at = now(),
      enqueued_at = case when public.challenge_queue.challenge_id = excluded.challenge_id
                         then public.challenge_queue.enqueued_at else now() end,
      challenge_id = excluded.challenge_id;
  return null;
end;
$$;

revoke execute on function public.challenge_queue_join(uuid, uuid, uuid[], uuid[], jsonb, text, uuid[]) from public, anon, authenticated;
grant execute on function public.challenge_queue_join(uuid, uuid, uuid[], uuid[], jsonb, text, uuid[]) to service_role;
