-- Finished matches by player, newest first.
-- Match history, the Conquest unlock count in finish_match and
-- get_conquest_status read only the player's own matches instead of the
-- whole table, which grows with every bot match.

create index matches_finished_player_a_idx
  on public.matches (player_a, finished_at desc)
  where status = 'finished';

-- Bot matches have no player_b: they stay out of this index.
create index matches_finished_player_b_idx
  on public.matches (player_b, finished_at desc)
  where status = 'finished' and player_b is not null;

-- The history reads the newest p_limit matches from each side and merges them,
-- so it touches at most 2 x p_limit index entries however many matches the
-- player has. The returned JSON is unchanged.
create or replace function public.get_match_history(p_limit integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    (select m.* from public.matches m
     where m.status = 'finished' and m.player_a = auth.uid()
     order by m.finished_at desc
     limit greatest(1, least(coalesce(p_limit, 30), 100)))
    union all
    (select m.* from public.matches m
     where m.status = 'finished' and m.player_b = auth.uid()
     order by m.finished_at desc
     limit greatest(1, least(coalesce(p_limit, 30), 100)))
  )
  select coalesce(jsonb_agg(entry order by finished_at desc), '[]'::jsonb)
  from (
    select
      m.finished_at,
      jsonb_build_object(
        'id', m.id,
        'mode', m.mode,
        'bot_difficulty', m.bot_difficulty,
        'finished_at', m.finished_at,
        'end_reason', m.end_reason,
        'result', case when m.result = 'draw' then 'draw' when (m.result = 'a') = (m.player_a = auth.uid()) then 'win' else 'loss' end,
        'rounds_me', case when m.player_a = auth.uid() then m.rounds_won_a else m.rounds_won_b end,
        'rounds_opponent', case when m.player_a = auth.uid() then m.rounds_won_b else m.rounds_won_a end,
        'coins', coalesce(case when m.player_a = auth.uid() then m.reward_coins_a else m.reward_coins_b end, 0),
        'opponent', (
          select p.username from public.profiles p
          where p.id = case when m.player_a = auth.uid() then m.player_b else m.player_a end
        ),
        'conquest', (
          select jsonb_build_object(
            'won', c.winner_id is not distinct from auth.uid(),
            'bonus_coins', c.bonus_coins,
            'pending', c.resolved_at is null,
            'card_name', d.name,
            'card_color', r.color
          )
          from public.conquest_claims c
          left join public.card_instances i on i.id = c.chosen_instance_id
          left join public.card_definitions d on d.id = i.definition_id
          left join public.rarity_definitions r on r.code = d.rarity_code
          where c.match_id = m.id
        )
      ) as entry
    from mine m
    order by m.finished_at desc
    limit greatest(1, least(coalesce(p_limit, 30), 100))
  ) s
$$;
