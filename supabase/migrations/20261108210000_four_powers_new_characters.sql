-- Four more powers and the eight new characters made for them (docs/WORLD.md):
-- Annullatore, Davide, Crescendo and Slancio. The points are computed by the
-- rules engine; here an Annullatore also stops the information powers, Veggente
-- and Spia, of the character it faces.

insert into public.power_definitions (code, name, tier, description_template, required_params) values
  ('nullifier', 'Annullatore', 'simple',
   'Annulla il potere del personaggio avversario in questo round', '{}'),
  ('giant_slayer', 'Davide', 'simple',
   '+{bonus} se il personaggio avversario lo supera di almeno {min_gap} gradi di rarità', array['bonus', 'min_gap']),
  ('crescendo', 'Crescendo', 'simple',
   '+{bonus} se la Minaccia ha un livello più alto di quella del round prima', array['bonus']),
  ('momentum', 'Slancio', 'distinctive',
   'Se vinci questo round, il tuo prossimo personaggio ottiene +{bonus}', array['bonus']);

insert into public.card_definitions (code, name, faction, rarity_code, stats, power_code, power_params, flavor, art_url) values
  ('P115', 'Codicil', 'heroes', 'beta',
   '{"FOR":1,"VEL":3,"RES":5,"INT":8,"VOL":7,"PER":6,"ENE":3,"MAG":6,"PSI":5,"COM":4,"TEC":5,"FUR":4}',
   'nullifier', '{}', 'Non annullo niente: aggiungo una clausola, e la cosa finisce lì.', '/cards/P115.webp'),
  ('P116', 'Attainder', 'villains', 'beta',
   '{"FOR":4,"VEL":2,"RES":6,"INT":6,"VOL":9,"PER":6,"ENE":2,"MAG":5,"PSI":7,"COM":6,"TEC":3,"FUR":1}',
   'nullifier', '{}', 'Letto il decreto, il tuo nome non lo pronuncia più nessuno. Nemmeno tu.', '/cards/P116.webp'),

  ('P117', 'Subsong', 'heroes', 'gamma',
   '{"FOR":0,"VEL":6,"RES":3,"INT":5,"VOL":8,"PER":9,"ENE":4,"MAG":1,"PSI":10,"COM":1,"TEC":1,"FUR":7}',
   'giant_slayer', '{"bonus":3,"min_gap":2}', 'Parla ai giganti a voce bassissima. Loro le credono sempre.', '/cards/P117.webp'),
  ('P118', 'Lure', 'neutrals', 'gamma',
   '{"FOR":6,"VEL":10,"RES":9,"INT":2,"VOL":5,"PER":7,"ENE":2,"MAG":1,"PSI":0,"COM":4,"TEC":1,"FUR":8}',
   'giant_slayer', '{"bonus":3,"min_gap":2}', 'La pagano per farsi inseguire. Il difficile è smettere.', '/cards/P118.webp'),

  ('P119', 'Gradus', 'neutrals', 'gamma',
   '{"FOR":6,"VEL":5,"RES":8,"INT":4,"VOL":8,"PER":5,"ENE":3,"MAG":1,"PSI":4,"COM":5,"TEC":4,"FUR":2}',
   'crescendo', '{"bonus":3}', 'Undici piani fino al Banco: ogni rampa costa un ricordo, ma la vista migliora.', '/cards/P119.webp'),
  ('P120', 'Xenolith', 'neutrals', 'beta',
   '{"FOR":7,"VEL":2,"RES":9,"INT":5,"VOL":6,"PER":4,"ENE":6,"MAG":6,"PSI":3,"COM":5,"TEC":3,"FUR":1}',
   'crescendo', '{"bonus":3}', 'Ogni volta che lo usa, il sasso nel petto cresce. Lui dice che è carattere.', '/cards/P120.webp'),

  ('P121', 'Impetus', 'heroes', 'alfa',
   '{"FOR":10,"VEL":10,"RES":7,"INT":1,"VOL":3,"PER":4,"ENE":8,"MAG":0,"PSI":0,"COM":9,"TEC":1,"FUR":5}',
   'momentum', '{"bonus":2}', 'Parte piano. Dopo la prima vittoria non lo ferma più nessuno, nemmeno lui.', '/cards/P121.webp'),
  ('P122', 'Katabatic', 'villains', 'alfa',
   '{"FOR":4,"VEL":9,"RES":6,"INT":3,"VOL":7,"PER":8,"ENE":10,"MAG":9,"PSI":1,"COM":1,"TEC":0,"FUR":0}',
   'momentum', '{"bonus":2}', 'Il vento che scende dal vulcano: più scende, più corre, più ti costa.', '/cards/P122.webp');

-- Whether the character `p_side` played in a round faced an Annullatore.
create function public.nullified_in_round(p_match_id uuid, p_round integer, p_side text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.round_plays o
    join public.card_definitions d on d.id = o.definition_id
    where o.match_id = p_match_id and o.round = p_round and o.side <> p_side and d.power_code = 'nullifier'
  )
$$;

revoke execute on function public.nullified_in_round(uuid, integer, text) from public, anon, authenticated;

-- Spia reveals nothing when an Annullatore faced it.
create or replace function public.reveal_spied_character()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.spy_reveals (match_id, side, round, definition_id)
  select new.match_id, rp.side, new.round, (
    select u.id
    from public.match_teams t, unnest(t.definition_ids) as u(id)
    where t.match_id = new.match_id and t.side <> rp.side
      and not exists (
        select 1 from public.round_plays o
        where o.match_id = new.match_id and o.side = t.side and o.definition_id = u.id
      )
    order by random()
    limit 1
  )
  from public.round_plays rp
  join public.card_definitions d on d.id = rp.definition_id
  where rp.match_id = new.match_id and rp.round = new.round and d.power_code = 'spy'
    and not public.nullified_in_round(new.match_id, new.round, rp.side)
    -- The opponent may have nobody left to reveal.
    and exists (
      select 1
      from public.match_teams t, unnest(t.definition_ids) as u(id)
      where t.match_id = new.match_id and t.side <> rp.side
        and not exists (
          select 1 from public.round_plays o
          where o.match_id = new.match_id and o.side = t.side and o.definition_id = u.id
        )
    )
  on conflict do nothing;
  return new;
end;
$$;

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

