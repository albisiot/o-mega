-- Threat modifiers (SPEC §5.4): one or two threats of a match get a twist, shown
-- when they are revealed. The database draws them when a match is created, so
-- every way of creating one is covered and no client can influence the draw; the
-- rules engine applies them. Their numbers are stored in the match, so a change of
-- configuration never alters a match in progress. Emergenza has none: its targets
-- are tuned on plain threats.

insert into public.game_config (key, value, description) values
  ('threat_modifiers.min_per_match', '1', 'Fewest threats of a match with a modifier'),
  ('threat_modifiers.max_per_match', '2', 'Most threats of a match with a modifier'),
  ('threat_modifiers.hostile_bonus', '3', 'Territorio ostile: points of the favored faction'),
  ('threat_modifiers.hostile_malus', '2', 'Territorio ostile: points taken from the hindered faction'),
  ('threat_modifiers.underdog_bonus', '3', 'Sottovalutati: points of the common cards'),
  ('threat_modifiers.underdog_malus', '3', 'Sottovalutati: points taken from the elite cards'),
  ('threat_modifiers.underdog_common_max_rank', '1', 'Sottovalutati: highest rarity rank that gains the bonus'),
  ('threat_modifiers.underdog_elite_min_rank', '4', 'Sottovalutati: lowest rarity rank that takes the malus');

-- One entry per round: a modifier, or null. Matches created before this have none.
alter table public.matches add column threat_modifiers jsonb not null default '[]'::jsonb;

-- The Edge Function now reads the rarity of each character too.
grant select on table public.rarity_definitions to service_role;

create function public.draw_threat_modifiers(p_levels integer[])
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_min integer := public.config_int('threat_modifiers.min_per_match');
  v_max integer := public.config_int('threat_modifiers.max_per_match');
  v_count integer := v_min + floor(random() * (v_max - v_min + 1))::integer;
  v_codes text[] := array(
    select c from unnest(array['focus', 'weak_link', 'hostile_ground', 'underdogs']) as c order by random()
  );
  v_factions text[];
  v_result jsonb[] := array_fill(null::jsonb, array[cardinality(p_levels)]);
  v_round integer;
  v_code text;
begin
  foreach v_round in array array(
    select g from generate_subscripts(p_levels, 1) as g order by random() limit v_count
  ) loop
    -- With a single required ability, the lowest value and the first are the same: no Anello debole.
    select c into v_code from unnest(v_codes) as c
    where c <> 'weak_link' or p_levels[v_round] >= 2
    limit 1;
    v_codes := array_remove(v_codes, v_code);

    v_result[v_round] := case v_code
      when 'hostile_ground' then (
        select jsonb_build_object(
          'code', v_code, 'favored', f[1], 'hindered', f[2],
          'bonus', public.config_int('threat_modifiers.hostile_bonus'),
          'malus', public.config_int('threat_modifiers.hostile_malus')
        )
        from (select array(select x from unnest(array['heroes', 'villains', 'neutrals']) as x order by random()) as f) as s
      )
      when 'underdogs' then jsonb_build_object(
        'code', v_code,
        'commonMaxRank', public.config_int('threat_modifiers.underdog_common_max_rank'),
        'eliteMinRank', public.config_int('threat_modifiers.underdog_elite_min_rank'),
        'bonus', public.config_int('threat_modifiers.underdog_bonus'),
        'malus', public.config_int('threat_modifiers.underdog_malus')
      )
      else jsonb_build_object('code', v_code)
    end;
  end loop;
  return to_jsonb(v_result);
end;
$$;

revoke execute on function public.draw_threat_modifiers(integer[]) from public, anon, authenticated;

create function public.set_threat_modifiers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.threat_modifiers := public.draw_threat_modifiers(new.threat_levels);
  return new;
end;
$$;

revoke execute on function public.set_threat_modifiers() from public, anon, authenticated;

create trigger matches_set_threat_modifiers
  before insert on public.matches
  for each row execute function public.set_threat_modifiers();

-- Same as before, with the modifier of each revealed or foreseen threat.
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
