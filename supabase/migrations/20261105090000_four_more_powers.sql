-- Four more powers and the ten cards that get them: Schermato, Nemesi,
-- Tuttofare and Spia. Spia also needs the server to pick, once and at random,
-- the opposing character it reveals, and to show it only to its side.

insert into public.power_definitions (code, name, tier, description_template, required_params) values
  ('shielded', 'Schermato', 'simple',
   'Immune a Sabotatore, e +{bonus} se il personaggio avversario ce l''ha', array['bonus']),
  ('nemesis', 'Nemesi', 'simple',
   '+{bonus} se il personaggio avversario è della fazione opposta (Eroi contro Cattivi)', array['bonus']),
  ('all_rounder', 'Tuttofare', 'simple',
   '+{bonus} se tutte le abilità richieste valgono almeno {min_value}', array['bonus', 'min_value']),
  ('spy', 'Spia', 'simple',
   'Dopo averlo giocato, vedi un personaggio a caso che l''avversario non ha ancora giocato', '{}');

update public.card_definitions c
set power_code = v.power_code, power_params = v.power_params::jsonb
from (values
  ('P101', 'shielded', '{"bonus": 1}'),                      -- Carillon
  ('P049', 'shielded', '{"bonus": 1}'),                      -- Blackbody
  ('P044', 'nemesis', '{"bonus": 3}'),                       -- Kiln
  ('P076', 'nemesis', '{"bonus": 3}'),                       -- Errata
  ('P070', 'nemesis', '{"bonus": 3}'),                       -- Aerie
  ('P085', 'all_rounder', '{"bonus": 3, "min_value": 5}'),   -- Heirloom
  ('P077', 'all_rounder', '{"bonus": 3, "min_value": 5}'),   -- Dredge
  ('P110', 'all_rounder', '{"bonus": 3, "min_value": 5}'),   -- Cursor
  ('P037', 'spy', '{}'),                                     -- Sordina
  ('P047', 'spy', '{}')                                      -- Actuary
) as v(code, power_code, power_params)
where c.code = v.code;

-- What a Spia revealed: one row per Spia played, written with the round result.
create table public.spy_reveals (
  match_id uuid not null references public.matches (id) on delete cascade,
  side text not null check (side in ('a', 'b')),
  round integer not null,
  definition_id uuid not null references public.card_definitions (id),
  primary key (match_id, side, round)
);

create index spy_reveals_definition_id_idx on public.spy_reveals (definition_id);

alter table public.spy_reveals enable row level security;
revoke all on table public.spy_reveals from anon, authenticated;

-- When a round is resolved, every side that played a Spia sees one opposing
-- character not played yet, drawn here so that no client can choose it.
create function public.reveal_spied_character()
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

revoke execute on function public.reveal_spied_character() from public, anon, authenticated;

create trigger match_rounds_reveal_spied
  after update of resolved_at on public.match_rounds
  for each row
  when (old.resolved_at is null and new.resolved_at is not null)
  execute function public.reveal_spied_character();

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

