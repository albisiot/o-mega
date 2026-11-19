-- Frames and effects outside the Collezione (SPEC §4.8): in the team pickers, in the pack openings
-- and in the matches, on the player's own cards and on the opponent's.
--
-- The player's own looks the app already has (get_cosmetics). For the opponent's, match_state_payload
-- now adds `opponent_looks`: the frame and the effect the opponent applied and left visible, by
-- definition id, only for the opposing characters the payload already shows (played in a resolved
-- round, revealed by Spia, on the Quadrante board). A card still in the opponent's hand never shows
-- up, and one covered by Nebbia comes without a definition (fog_card), so it shows no look either.
-- Against a bot or the server's opponent there is no second player: no looks. character_cosmetics
-- and cosmetic_items stay unreadable (RLS and no policies): only this payload reads them.
--
-- The pack openings name the definition of every card, so the app finds the looks of its character.

-- The opponent's looks for the opposing characters shown in p_payload, the state p_side reads.
create function public.match_opponent_looks(p_payload jsonb, p_match_id uuid, p_side text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with opponent as (
    select case when p_side = 'a' then m.player_b else m.player_a end as user_id
    from public.matches m
    where m.id = p_match_id
  ),
  shown as (
    select distinct x.value #>> '{}' as definition_id
    from (
      -- Classic match and Grande Minaccia: a play per round, filled once the round is resolved.
      select value from jsonb_path_query(p_payload, 'lax $.rounds[*].opponent_play.definition_id') as q(value)
      -- Allarme Triplo: a play per threat of the round.
      union all
      select value from jsonb_path_query(p_payload, 'lax $.rounds[*].contests[*].opponent_play.definition_id') as q(value)
      -- Spia: the opposing characters it revealed.
      union all
      select value from jsonb_path_query(p_payload, 'lax $.spied_cards[*].definition_id') as q(value)
      -- Quadrante: the opponent's cards on the board.
      union all
      select value from jsonb_path_query(p_payload, 'lax $.board[*] ? (@.mine == false).card.definition_id') as q(value)
    ) x
    where jsonb_typeof(x.value) = 'string'
  )
  select coalesce(jsonb_object_agg(cc.definition_id, jsonb_build_object(
    'frame', case when cc.frame_visible then f.cosmetic_code end,
    'effect', case when cc.effect_visible then e.cosmetic_code end,
    -- Numerata stamps the number of the item; the other effects have none to show.
    'serial', case when cc.effect_visible and e.cosmetic_code = 'numbered' then e.serial end
  )), '{}'::jsonb)
  from opponent o
  join public.character_cosmetics cc on cc.user_id = o.user_id
  join shown s on s.definition_id = cc.definition_id::text
  left join public.cosmetic_items f on f.id = cc.frame_item_id
  left join public.cosmetic_items e on e.id = cc.effect_item_id
  where (cc.frame_visible and f.id is not null) or (cc.effect_visible and e.id is not null)
$$;

revoke execute on function public.match_opponent_looks(jsonb, uuid, text) from public, anon, authenticated;

-- Same as in 20261118250000_challenges.sql, with the opponent's looks.
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
      public.with_ranked(public.match_state_unranked_payload(p_match_id, p_side), p_match_id, p_side),
      p_match_id,
      p_side
    ) as payload
  ) v
$$;

-- Same as in 20261110160000_special_packs.sql, with the definition of every card.
create or replace function public.pack_opening_payload(p_opening_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'pack_type', o.pack_type,
    'pack_name', sp.name,
    'pack_color', sp.color,
    'opened_at', o.opened_at,
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'instance_id', i.id,
        'definition_id', d.id,
        'is_new', i.id = any (o.new_card_instance_ids),
        'code', d.code,
        'name', d.name,
        'faction', d.faction,
        'flavor', d.flavor,
        'art_url', coalesce(v.art_url, d.art_url),
        'variant', case when v.id is null then null
                        else jsonb_build_object('style', v.style, 'name', v.style_name) end,
        'stats', d.stats,
        'rarity', jsonb_build_object('code', r.code, 'name', r.name, 'rank', r.rank, 'color', r.color),
        'power', case when d.power_code is null then null else jsonb_build_object(
          'name', p.name,
          'text', public.power_text(d.power_code, d.power_params)
        ) end
      ) order by r.rank, u.slot)
      from unnest(o.card_instance_ids) with ordinality as u(instance_id, slot)
      join public.card_instances i on i.id = u.instance_id
      join public.card_definitions d on d.id = i.definition_id
      join public.rarity_definitions r on r.code = d.rarity_code
      left join public.card_variants v on v.id = i.variant_id
      left join public.power_definitions p on p.code = d.power_code
    ), '[]'::jsonb)
  )
  from public.pack_openings o
  left join public.special_packs sp on sp.id = o.special_pack_id
  where o.id = p_opening_id
$$;
