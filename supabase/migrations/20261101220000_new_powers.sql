-- Six new powers, implemented by the rules engine, and the cards that get them.
-- Delta and Omega cards do not change. Veggente also needs the server to show
-- its side the threats of the following rounds.

insert into public.power_definitions (code, name, tier, description_template, required_params) values
  ('opener', 'Apripista', 'simple',
   '+{bonus} se giocato entro il round {max_round}', array['bonus', 'max_round']),
  ('last_stand', 'Ultimo baluardo', 'simple',
   '+{bonus} se giocato dal round {min_round} in poi', array['bonus', 'min_round']),
  ('bond', 'Legame', 'simple',
   '+{bonus} per ogni altro personaggio della stessa fazione in squadra', array['bonus']),
  ('relentless', 'Implacabile', 'simple',
   'Vince il round in caso di parità di punteggio', '{}'),
  ('sabotage', 'Sabotatore', 'distinctive',
   '-{malus} a ogni abilità del personaggio avversario in questo round', array['malus']),
  ('foresight', 'Veggente', 'distinctive',
   'Dopo averlo giocato, vedi tutte le Minacce dei round successivi', '{}');

update public.card_definitions c
set power_code = v.power_code, power_params = v.power_params::jsonb
from (values
  ('P030', 'opener', '{"bonus": 3, "max_round": 2}'),      -- Jay Rondine
  ('P026', 'opener', '{"bonus": 3, "max_round": 2}'),      -- Nitro Vega
  ('P042', 'opener', '{"bonus": 3, "max_round": 2}'),      -- Rico Turbo
  ('P025', 'last_stand', '{"bonus": 3, "min_round": 4}'),  -- Marta Scudo
  ('P041', 'last_stand', '{"bonus": 3, "min_round": 4}'),  -- Otto Kaiser
  ('P035', 'bond', '{"bonus": 1}'),                        -- Rey Pugno
  ('P045', 'bond', '{"bonus": 1}'),                        -- Bull Rossi
  ('P036', 'bond', '{"bonus": 1}'),                        -- Fritz Rotor
  ('P046', 'bond', '{"bonus": 1}'),                        -- Lola Jet
  ('P073', 'relentless', '{}'),                            -- Vic Cromo
  ('P029', 'relentless', '{}'),                            -- Goran Orso
  ('P075', 'relentless', '{}'),                            -- Ercole Neo
  ('P056', 'sabotage', '{"malus": 1}'),                    -- Mekana
  ('P052', 'sabotage', '{"malus": 1}'),                    -- Dr. Volta
  ('P078', 'foresight', '{}'),                             -- Stella Nova
  ('P079', 'foresight', '{}')                              -- Lady Medusa
) as v(code, power_code, power_params)
where c.code = v.code;

create or replace function public.match_state_payload(p_match_id uuid, p_side text)
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
    -- Veggente: only for the side that played it, only the rounds still to come.
    'foreseen_threats', coalesce(case when exists (
      select 1 from public.round_plays rp
      join public.card_definitions d on d.id = rp.definition_id
      where rp.match_id = p_match_id and rp.side = p_side and d.power_code = 'foresight'
    ) then (
      select jsonb_agg(jsonb_build_object(
        'round', u.ord, 'level', t.level, 'name', t.name, 'abilities', to_jsonb(t.required_abilities)
      ) order by u.ord)
      from unnest(m.threat_ids) with ordinality as u(id, ord)
      join public.threat_definitions t on t.id = u.id
      where u.ord > m.current_round
    ) end, '[]'::jsonb),
    'my_team', (
      select jsonb_agg(public.card_payload(u.definition_id) || jsonb_build_object(
        'instance_id', u.instance_id,
        'played_round', (
          select rp.round from public.round_plays rp
          where rp.match_id = p_match_id and rp.side = p_side and rp.card_instance_id = u.instance_id
        )
      ) order by u.ord)
      from mine, unnest(mine.card_instance_ids, mine.definition_ids) with ordinality as u(instance_id, definition_id, ord)
    ),
    'rounds', coalesce((
      select jsonb_agg(jsonb_build_object(
        'round', mr.round,
        'level', t.level,
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
          select public.card_payload(rp.definition_id) || jsonb_build_object(
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
