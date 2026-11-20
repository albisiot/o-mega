-- Twenty-two powers of 20 November 2026, second batch (SPEC §4.4), ready for characters
-- made for them: no card has them yet. The rules engine (packages/game-engine) scores
-- them in every mode; here they get their catalog rows and what the server must do for
-- three of them, in the classic match only:
--
-- - Fenice (phoenix): a character that lost its round, with its power on, may be played
--   again once. The checks that refuse a character already played let it through, and
--   the payload shows it back in the team (played_round null, returned true).
-- - Imboscata (ambush): in the round after it, the opponent chooses without seeing the
--   threat's abilities, as under Al buio.
-- - Segugio (tracker): once played, its side sees the rarities of the characters the
--   opponent has not played yet (tracked_rarities), in every mode but the Quadrante.

insert into public.power_definitions (code, name, tier, description_template, required_params) values
  ('rival_frost', 'Gelo', 'distinctive',
   'Nel round nessuna abilità del personaggio avversario conta più di {cap}', array['cap']),
  ('single_force', 'Una sola forza', 'distinctive',
   'Le sue abilità richieste della stessa famiglia contano tutte quanto la più alta', array[]::text[]),
  ('abyss_next', 'Abissi', 'distinctive',
   'Le abilità richieste di {family} del tuo prossimo personaggio contano doppio', array['family']),
  ('duelist', 'Duellante', 'distinctive',
   'Contro Minacce dal livello {from_level} in su contano solo le sue 2 abilità richieste più alte, ma doppie', array['from_level']),
  ('upset', 'Ribaltone', 'distinctive',
   'Se perde il round di {min_gap} punti o più, lo vince', array['min_gap']),
  ('rival_all_or_nothing', 'Tutto o niente', 'distinctive',
   'Nel round le abilità del personaggio avversario che valgono meno di {min_value} contano 0', array['min_value']),
  ('rival_duel', 'Duello', 'distinctive',
   'Nel round contano solo le {count} abilità richieste più alte del personaggio avversario', array['count']),
  ('rival_price', 'Il prezzo', 'distinctive',
   'Nel round le abilità del personaggio avversario che valgono {max_value} o meno contano -{malus}', array['max_value', 'malus']),
  ('negative_self', 'Negativo', 'distinctive',
   'Le sue abilità richieste contano 10 meno il loro valore', array[]::text[]),
  ('calm', 'Calma piatta', 'simple',
   'Nel suo round la Minaccia perde la sua regola, per entrambi', array[]::text[]),
  ('ambush', 'Imboscata', 'simple',
   'Nel round dopo l''avversario sceglie senza vedere le abilità della Minaccia', array[]::text[]),
  ('patience', 'Pazienza', 'simple',
   '+{bonus} per ogni round già giocato, fino a +{max}', array['bonus', 'max']),
  ('hunter', 'Cacciatore', 'simple',
   '+{bonus} se il personaggio avversario ha un potere distintivo', array['bonus']),
  ('rainbow', 'Arcobaleno', 'simple',
   '+{bonus} se in squadra ci sono un Eroe, un Cattivo e un Neutrale', array['bonus']),
  ('joker', 'Jolly', 'simple',
   'La sua abilità richiesta più bassa sale verso la sua migliore abilità non richiesta, fino a +{max_gain}', array['max_gain']),
  ('gamble', 'Azzardo', 'simple',
   '+{bonus}; se perdi il round, il tuo prossimo personaggio ha -{malus}', array['bonus', 'malus']),
  ('wall', 'Muro', 'simple',
   'Se perde il round di {margin} punti o meno, il round finisce nullo', array['margin']),
  ('tracker', 'Segugio', 'simple',
   'Dopo averlo giocato, vedi la rarità dei personaggi che l''avversario non ha ancora giocato', array[]::text[]),
  ('vampire', 'Vampiro', 'distinctive',
   'Per ogni abilità richiesta in cui non supera il personaggio avversario: +1 a lui e -1 al rivale', array[]::text[]),
  ('thief', 'Ladro', 'distinctive',
   'Prende per sé i punti che il potere del personaggio avversario gli darebbe nel round', array[]::text[]),
  ('phoenix', 'Fenice', 'distinctive',
   'Se perde il round torna in squadra: puoi rigiocarlo una volta', array[]::text[]),
  ('steady', 'Costanza', 'simple',
   '+{bonus} se la Minaccia ha lo stesso livello di quella del round prima', array['bonus']);

-- ---------------------------------------------------------------------------
-- Fenice
-- ---------------------------------------------------------------------------

-- Whether a side's character with Fenice is back in the team: in a classic match, played
-- once, in a round its side lost with the power on (no Annullatore, no Silenzio della
-- tomba). The engine's availableCharacters says the same.
create function public.phoenix_back(p_match_id uuid, p_side text, p_definition_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.card_definitions c where c.id = p_definition_id and c.power_code = 'phoenix')
    and exists (select 1 from public.matches m where m.id = p_match_id and m.format = 'classic')
    and coalesce((
      select count(*) = 1
        and bool_and(mr.winner_side = case p_side when 'a' then 'b' else 'a' end)
        and bool_and(not public.nullified_in_round(p_match_id, rp.round, p_side))
      from public.round_plays rp
      join public.match_rounds mr on mr.match_id = rp.match_id and mr.round = rp.round
      where rp.match_id = p_match_id and rp.side = p_side and rp.definition_id = p_definition_id
    ), false)
$$;

revoke execute on function public.phoenix_back(uuid, text, uuid) from public, anon, authenticated;

-- The classic payload, the payload of a challenge's given team, the round's record and a
-- player's choice as before, with Fenice: copied from their last versions
-- (20261110090000_boss_mode.sql, 20261118270000_challenges_stage3.sql,
-- 20261101210000_conquest_bot.sql), only the checks on a character already played changed.

create or replace function public.classic_match_state_payload(p_match_id uuid, p_side text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with m as (
    select * from public.matches where id = p_match_id
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
    'current_round', m.current_round,
    'threat_levels', to_jsonb(m.threat_levels),
    'rounds_won', jsonb_build_object(
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
    'conquest', public.conquest_payload(p_match_id, p_side),
    'opponent', (
      select jsonb_build_object(
        'username', pr.username, 'avatar_url', pr.avatar_url, 'level', pr.level,
        'last_seen_at', theirs.last_seen_at
      )
      from theirs join public.profiles pr on pr.id = theirs.user_id
    ),
    -- Veggente: only for the side that played it, only the rounds still to come,
    -- unless an Annullatore stopped it.
    -- Spia: only for the side that played it.
    'spied_cards', coalesce((
      select jsonb_agg(public.card_payload(sr.definition_id, null) || jsonb_build_object('round', sr.round) order by sr.round)
      from public.spy_reveals sr
      where sr.match_id = p_match_id and sr.side = p_side
    ), '[]'::jsonb),
    'foreseen_threats', coalesce(case when exists (
      select 1 from public.round_plays rp
      join public.card_definitions d on d.id = rp.definition_id
      where rp.match_id = p_match_id and rp.side = p_side and d.power_code = 'foresight'
        -- An Annullatore played against it in the same round stops it.
        and not public.nullified_in_round(p_match_id, rp.round, p_side)
    ) then (
      select jsonb_agg(jsonb_build_object(
        'round', u.ord, 'level', t.level, 'name', t.name, 'abilities', to_jsonb(t.required_abilities),
        'modifier', m.threat_modifiers -> (u.ord::integer - 1)
      ) order by u.ord)
      from unnest(m.threat_ids) with ordinality as u(id, ord)
      join public.threat_definitions t on t.id = u.id
      where u.ord > m.current_round
    ) end, '[]'::jsonb),
    'my_team', (
      select jsonb_agg(public.card_payload(u.definition_id, u.instance_id) || jsonb_build_object(
        'instance_id', u.instance_id,
        -- Fenice: back in the team after a lost round, then the round it played again.
        'played_round', (
          select max(rp.round) filter (where not public.phoenix_back(p_match_id, p_side, rp.definition_id))
          from public.round_plays rp
          where rp.match_id = p_match_id and rp.side = p_side and rp.card_instance_id = u.instance_id
        ),
        'returned', public.phoenix_back(p_match_id, p_side, u.definition_id)
      ) order by u.ord)
      from mine, unnest(mine.card_instance_ids, mine.definition_ids) with ordinality as u(instance_id, definition_id, ord)
    ),
    'rounds', coalesce((
      select jsonb_agg(jsonb_build_object(
        'round', mr.round,
        'level', t.level,
        'modifier', m.threat_modifiers -> (mr.round - 1),
        'threat', jsonb_build_object('name', t.name, 'abilities', to_jsonb(t.required_abilities), 'flavor', t.flavor),
        'deadline_at', mr.deadline_at,
        'resolved', mr.resolved_at is not null,
        'winner', case
          when mr.resolved_at is null then null
          when mr.winner_side = 'none' then 'none'
          when mr.winner_side = p_side then 'me'
          else 'opponent' end,
        'my_pending_instance_id', (
          select pp.card_instance_id from public.pending_plays pp
          where pp.match_id = p_match_id and pp.round = mr.round and pp.side = p_side
        ),
        -- Only whether the opponent has chosen, never what.
        'opponent_has_chosen', exists (
          select 1 from public.pending_plays pp
          where pp.match_id = p_match_id and pp.round = mr.round and pp.side <> p_side
        ),
        'my_play', (
          select jsonb_build_object(
            'instance_id', rp.card_instance_id, 'definition_id', rp.definition_id,
            'base', rp.base_score, 'bonus', rp.bonus, 'score', rp.score,
            'highest', rp.highest_value, 'auto_played', rp.auto_played
          )
          from public.round_plays rp
          where rp.match_id = p_match_id and rp.round = mr.round and rp.side = p_side
        ),
        -- The opponent's play only once the round is resolved.
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
      join public.threat_definitions t on t.id = mr.threat_id
      where mr.match_id = p_match_id
    ), '[]'::jsonb)
  )
  from m
$$;


create or replace function public.with_supplied_team(p_payload jsonb, p_match_id uuid, p_side text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case
    when jsonb_typeof(p_payload -> 'my_team') <> 'array' then p_payload
    else jsonb_set(p_payload, '{my_team}', coalesce((
      select jsonb_agg(e.card || jsonb_build_object(
        'instance_id', e.card ->> 'definition_id',
        'played_round', (
          select max(rp.round) filter (where not public.phoenix_back(p_match_id, p_side, rp.definition_id))
          from public.round_plays rp
          where rp.match_id = p_match_id and rp.side = p_side
            and rp.definition_id = (e.card ->> 'definition_id')::uuid
        ),
        'returned', public.phoenix_back(p_match_id, p_side, (e.card ->> 'definition_id')::uuid)
      ) order by e.ord)
      from jsonb_array_elements(p_payload -> 'my_team') with ordinality as e(card, ord)
    ), '[]'::jsonb))
  end
$$;


create or replace function public.match_record_round(
  p_match_id uuid,
  p_round integer,
  p_play_a jsonb,
  p_play_b jsonb,
  p_winner_side text,
  p_result text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_round public.match_rounds;
  v_team public.match_teams;
  v_side text;
  v_play jsonb;
  v_instance uuid;
  v_definition uuid;
  v_position integer;
  v_auto boolean;
  v_pending uuid;
  v_won_a integer;
  v_won_b integer;
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
  if v_match.current_round <> p_round then
    raise exception 'round_already_resolved';
  end if;
  select * into v_round from public.match_rounds where match_id = p_match_id and round = p_round;
  if v_round.match_id is null or v_round.resolved_at is not null then
    raise exception 'round_already_resolved';
  end if;
  if p_winner_side is not null and p_winner_side not in ('a', 'b') then
    raise exception 'invalid_winner';
  end if;

  foreach v_side in array array['a', 'b'] loop
    v_play := case v_side when 'a' then p_play_a else p_play_b end;
    select * into v_team from public.match_teams where match_id = p_match_id and side = v_side;
    v_definition := (v_play ->> 'definition_id')::uuid;
    v_instance := (v_play ->> 'card_instance_id')::uuid;
    v_auto := coalesce((v_play ->> 'auto_played')::boolean, false);

    if v_team.card_instance_ids is not null then
      v_position := array_position(v_team.card_instance_ids, v_instance);
      if v_position is null or v_team.definition_ids[v_position] is distinct from v_definition then
        raise exception 'character_not_in_team';
      end if;
    elsif v_instance is not null or not (v_definition = any (v_team.definition_ids)) then
      raise exception 'character_not_in_team';
    end if;

    if exists (
      select 1 from public.round_plays
      where match_id = p_match_id and side = v_side and definition_id = v_definition
    ) and not public.phoenix_back(p_match_id, v_side, v_definition) then
      raise exception 'character_already_played';
    end if;

    if v_team.user_id is not null then
      if v_match.bot_difficulty is not null then
        -- A human choice after the deadline is refused: the engine must auto-play.
        if not v_auto and now() > v_round.deadline_at + make_interval(secs => v_grace) then
          raise exception 'round_expired';
        end if;
      else
        select card_instance_id into v_pending from public.pending_plays
        where match_id = p_match_id and round = p_round and side = v_side;
        if v_auto and v_pending is not null then
          raise exception 'choice_ignored';
        end if;
        if not v_auto and v_pending is distinct from v_instance then
          raise exception 'choice_not_submitted';
        end if;
        if v_auto and now() <= v_round.deadline_at + make_interval(secs => v_grace) then
          raise exception 'round_not_expired';
        end if;
      end if;
    end if;

    insert into public.round_plays (
      match_id, round, side, card_instance_id, definition_id,
      base_score, bonus, score, highest_value, auto_played
    ) values (
      p_match_id, p_round, v_side, v_instance, v_definition,
      (v_play ->> 'base')::integer, (v_play ->> 'bonus')::integer, (v_play ->> 'score')::integer,
      (v_play ->> 'highest')::integer, v_auto
    );
  end loop;

  delete from public.pending_plays where match_id = p_match_id and round = p_round;

  update public.match_rounds
  set winner_side = coalesce(p_winner_side, 'none'), resolved_at = now()
  where match_id = p_match_id and round = p_round;

  -- "is not distinct from": a void round (null winner) must count as 0, not null.
  update public.matches
  set rounds_won_a = rounds_won_a + (p_winner_side is not distinct from 'a')::integer,
      rounds_won_b = rounds_won_b + (p_winner_side is not distinct from 'b')::integer,
      total_score_a = total_score_a + (p_play_a ->> 'score')::integer,
      total_score_b = total_score_b + (p_play_b ->> 'score')::integer
  where id = p_match_id
  returning rounds_won_a, rounds_won_b, total_score_a, total_score_b
  into v_won_a, v_won_b, v_total_a, v_total_b;

  v_finished := greatest(v_won_a, v_won_b) >= public.config_int('match.rounds_to_win')
                or p_round >= cardinality(v_match.threat_ids);
  v_result := case
    when not v_finished then null
    when v_won_a <> v_won_b then case when v_won_a > v_won_b then 'a' else 'b' end
    when v_total_a <> v_total_b then case when v_total_a > v_total_b then 'a' else 'b' end
    else 'draw'
  end;
  -- The engine and the database must agree on how the match ended.
  if v_result is distinct from p_result then
    raise exception 'result_mismatch';
  end if;

  if v_finished then
    perform public.finish_match(p_match_id, v_result, 'completed');
  else
    insert into public.match_rounds (match_id, round, threat_id, deadline_at)
    values (
      p_match_id, p_round + 1, v_match.threat_ids[p_round + 1],
      now() + make_interval(secs => public.config_int('match.reveal_pause_seconds')
                                    + public.config_int('match.round_timer_seconds'))
    );
    update public.matches set current_round = p_round + 1 where id = p_match_id;
    perform public.notify_match(p_match_id, 'round');
  end if;
end;
$$;


create or replace function public.match_submit_play(
  p_user uuid,
  p_match_id uuid,
  p_round integer,
  p_card_instance_id uuid,
  p_front_slot integer default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_round public.match_rounds;
  v_side text;
  v_team public.match_teams;
begin
  select * into v_match from public.matches where id = p_match_id for update;
  v_side := case when v_match.player_a = p_user then 'a' when v_match.player_b = p_user then 'b' end;
  if v_side is null or v_match.bot_difficulty is not null then
    raise exception 'match_not_found';
  end if;
  if v_match.status <> 'active' then
    raise exception 'match_not_active';
  end if;
  if v_match.current_round <> p_round then
    raise exception 'round_already_resolved';
  end if;
  if (v_match.format = 'boss') <> (p_front_slot is not null)
     or (p_front_slot is not null and p_front_slot not between 1 and cardinality(v_match.threat_ids)) then
    raise exception 'invalid_front';
  end if;
  select * into v_round from public.match_rounds where match_id = p_match_id and round = p_round;
  if now() > v_round.deadline_at + make_interval(secs => public.config_int('match.timeout_grace_seconds')) then
    raise exception 'round_expired';
  end if;

  select * into v_team from public.match_teams where match_id = p_match_id and side = v_side;
  if not (p_card_instance_id = any (v_team.card_instance_ids)) then
    raise exception 'character_not_available';
  end if;
  if exists (
    select 1 from public.round_plays
    where match_id = p_match_id and side = v_side and card_instance_id = p_card_instance_id
  ) and not public.phoenix_back(
    p_match_id, v_side, v_team.definition_ids[array_position(v_team.card_instance_ids, p_card_instance_id)]
  ) then
    raise exception 'character_already_played';
  end if;

  -- A player may change their mind until the round is resolved.
  insert into public.pending_plays (match_id, round, side, card_instance_id, front_slot)
  values (p_match_id, p_round, v_side, p_card_instance_id, p_front_slot)
  on conflict (match_id, round, side) do update
  set card_instance_id = excluded.card_instance_id, front_slot = excluded.front_slot, submitted_at = now();

  update public.match_teams set last_seen_at = now() where match_id = p_match_id and side = v_side;
  perform public.notify_match(p_match_id, 'choice');

  return case
    when (select count(*) from public.pending_plays where match_id = p_match_id and round = p_round) = 2
    then 'ready' else 'waiting'
  end;
end;
$$;


-- ---------------------------------------------------------------------------
-- Segugio and Imboscata
-- ---------------------------------------------------------------------------

-- A match payload with what Segugio and Imboscata change for the side that reads it:
-- tracked_rarities, the opponent's characters not played yet by rarity, once its
-- Segugio played with its power on; and in a classic match the current threat's
-- abilities hidden (ambushed) when the opponent's Imboscata played in the round before.
create function public.with_rule_powers(p_payload jsonb, p_match_id uuid, p_side text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  m public.matches;
  v_other text := case p_side when 'a' then 'b' else 'a' end;
  v_result jsonb := p_payload;
begin
  if p_payload is null then
    return p_payload;
  end if;
  select * into m from public.matches where id = p_match_id;
  if m.id is null or public.is_quadrant(m.format) then
    return p_payload;
  end if;

  if exists (
    select 1 from public.round_plays rp
    join public.card_definitions c on c.id = rp.definition_id
    where rp.match_id = p_match_id and rp.side = p_side and c.power_code = 'tracker'
      and not public.nullified_in_round(p_match_id, rp.round, p_side)
  ) then
    v_result := v_result || jsonb_build_object('tracked_rarities', coalesce((
      select jsonb_agg(jsonb_build_object('code', r.code, 'name', r.name, 'rank', r.rank, 'color', r.color, 'count', x.n)
                       order by r.rank desc)
      from (
        select c.rarity_code, count(*)::integer as n
        from public.match_teams t
        cross join unnest(t.definition_ids) as u(id)
        join public.card_definitions c on c.id = u.id
        where t.match_id = p_match_id and t.side = v_other
          and not exists (
            select 1 from public.round_plays o
            where o.match_id = p_match_id and o.side = v_other and o.definition_id = u.id
          )
        group by c.rarity_code
      ) x
      join public.rarity_definitions r on r.code = x.rarity_code
    ), '[]'::jsonb));
  end if;

  if m.format = 'classic' and m.status = 'active' and m.current_round > 1
     and jsonb_typeof(v_result -> 'rounds') = 'array'
     and exists (
       select 1 from public.round_plays rp
       join public.card_definitions c on c.id = rp.definition_id
       where rp.match_id = p_match_id and rp.round = m.current_round - 1 and rp.side = v_other
         and c.power_code = 'ambush'
         and not public.nullified_in_round(p_match_id, rp.round, v_other)
     ) then
    v_result := jsonb_set(v_result, '{rounds}', (
      select coalesce(jsonb_agg(case
        when (e.value ->> 'round')::integer = m.current_round and not coalesce((e.value ->> 'resolved')::boolean, false)
          then e.value || jsonb_build_object(
            'threat', (e.value -> 'threat') || jsonb_build_object('abilities', '[]'::jsonb, 'hidden', true),
            'modifier', public.visible_modifier(e.value -> 'modifier', true),
            'ambushed', true
          )
        else e.value
      end order by e.ord), '[]'::jsonb)
      from jsonb_array_elements(v_result -> 'rounds') with ordinality as e(value, ord)
    ));
  end if;
  return v_result;
end;
$$;

revoke execute on function public.with_rule_powers(jsonb, uuid, text) from public, anon, authenticated;

-- As in 20261119150000_match_cosmetics.sql, with with_rule_powers on the match's own payload.
create or replace function public.match_state_payload(p_match_id uuid, p_side text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select v.payload || jsonb_build_object('opponent_looks', public.match_opponent_looks(v.payload, p_match_id, p_side))
  from (
    select public.with_challenge(
      public.with_ranked(
        public.with_rule_powers(public.match_state_unranked_payload(p_match_id, p_side), p_match_id, p_side),
        p_match_id,
        p_side
      ),
      p_match_id,
      p_side
    ) as payload
  ) v
$$;
