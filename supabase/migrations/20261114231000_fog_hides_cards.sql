-- Nebbia (fog, SPEC §4.4): the opponent sees the score of a card played with Nebbia but
-- not who played it, until the match is over. The rules engine and the bots already knew
-- it (hidesIdentity); this is the server side. Every client reads a match through
-- match_state_payload (round_plays is not readable by players), so the payload covers the
-- card there: in the classic match, the Grande Minaccia and the Allarme Triplo. In the
-- Quadrante no power acts, in the Emergenza there is no opponent.
--
-- The card stays covered unless its power did not act in that round: an opposing
-- Annullatore on the same front, or Silenzio della tomba. Once the match is finished
-- every card shows again.

-- Whether the card `p_side`'s opponent played in contest `p_round` hides behind Nebbia.
-- `p_rule_index` is the threat modifier that rules that contest (the round's own in a
-- classic match, the slot's in an Allarme Triplo).
create function public.fog_hides(p_match_id uuid, p_round integer, p_side text, p_rule_index integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.round_plays o
    join public.card_definitions d on d.id = o.definition_id
    join public.matches m on m.id = o.match_id
    where o.match_id = p_match_id and o.round = p_round and o.side <> p_side
      and d.power_code = 'fog'
      and m.status = 'active'
      and coalesce(m.threat_modifiers -> p_rule_index ->> 'code', '') <> 'tomb_silence'
      -- An Annullatore of the viewer on the same front switches Nebbia off.
      and not exists (
        select 1 from public.round_plays s
        join public.card_definitions sd on sd.id = s.definition_id
        where s.match_id = p_match_id and s.round = p_round and s.side = p_side
          and sd.power_code = 'nullifier'
          and s.front_slot is not distinct from o.front_slot
      )
  )
$$;

-- The covered card: shaped like any card of the payload, so every screen can draw it,
-- with `hidden` set and only the score of the play. The power is Nebbia itself: the
-- opponent knows the card hid, not which one it was.
create function public.fog_card(p_play jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'hidden', true,
    'definition_id', null,
    'instance_id', null,
    'code', '',
    'name', 'Ignoto',
    'faction', '',
    'flavor', '',
    'art_url', '/cards/nebbia.webp',
    'stats', '{}'::jsonb,
    'rarity', jsonb_build_object('code', '', 'name', '', 'rank', 0, 'color', '#7c8794'),
    'power', jsonb_build_object(
      'code', 'fog', 'params', '{}'::jsonb, 'name', p.name, 'text', public.power_text('fog', '{}'::jsonb)
    ),
    'base', p_play -> 'score',
    'bonus', 0,
    'score', p_play -> 'score',
    'highest', p_play -> 'highest',
    'auto_played', coalesce(p_play -> 'auto_played', 'false'::jsonb)
  )
  -- Grande Minaccia: where it went and what it took stay visible.
  || jsonb_strip_nulls(jsonb_build_object(
    'front', p_play -> 'front', 'points', p_play -> 'points', 'required', p_play -> 'required'
  ))
  from public.power_definitions p
  where p.code = 'fog'
$$;

-- The payload with the opposing cards played under Nebbia covered.
create function public.with_fog(p_payload jsonb, p_match_id uuid, p_side text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_format text;
  v_threats integer;
begin
  if jsonb_typeof(p_payload -> 'rounds') is distinct from 'array' then
    return p_payload;
  end if;
  -- Nothing to cover: no card with Nebbia on the other side, or the match is over.
  if not exists (
    select 1 from public.round_plays o
    join public.card_definitions d on d.id = o.definition_id
    join public.matches m on m.id = o.match_id
    where o.match_id = p_match_id and o.side <> p_side and d.power_code = 'fog' and m.status = 'active'
  ) then
    return p_payload;
  end if;

  select format into v_format from public.matches where id = p_match_id;

  if v_format = 'triple' then
    v_threats := public.config_int('triple.threats');
    return jsonb_set(p_payload, '{rounds}', coalesce((
      select jsonb_agg(
        case when jsonb_typeof(g.value -> 'contests') = 'array' then
          g.value || jsonb_build_object('contests', (
            select jsonb_agg(
              case
                when jsonb_typeof(c.value -> 'opponent_play') = 'object'
                  and public.fog_hides(
                    p_match_id,
                    ((g.value ->> 'round')::integer - 1) * v_threats + (c.value ->> 'slot')::integer + 1,
                    p_side,
                    (c.value ->> 'slot')::integer
                  )
                then c.value || jsonb_build_object('opponent_play', public.fog_card(c.value -> 'opponent_play'))
                else c.value
              end
              order by c.ordinality)
            from jsonb_array_elements(g.value -> 'contests') with ordinality as c(value, ordinality)
          ))
        else g.value end
        order by g.ordinality)
      from jsonb_array_elements(p_payload -> 'rounds') with ordinality as g(value, ordinality)
    ), '[]'::jsonb));
  end if;

  -- Classic match and Grande Minaccia: one play per side and round. The Grande Minaccia
  -- has no threat modifiers, so the round's index finds none.
  return jsonb_set(p_payload, '{rounds}', coalesce((
    select jsonb_agg(
      case
        when jsonb_typeof(r.value -> 'opponent_play') = 'object'
          and public.fog_hides(p_match_id, (r.value ->> 'round')::integer, p_side, (r.value ->> 'round')::integer - 1)
        then r.value || jsonb_build_object('opponent_play', public.fog_card(r.value -> 'opponent_play'))
        else r.value
      end
      order by r.ordinality)
    from jsonb_array_elements(p_payload -> 'rounds') with ordinality as r(value, ordinality)
  ), '[]'::jsonb));
end;
$$;

-- As in 20261114170000_threat_districts.sql, with Nebbia over every format where powers act.
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
    return public.with_fog(
      public.with_play_parts(public.boss_state_payload(p_match_id, p_side), p_match_id, p_side),
      p_match_id,
      p_side
    );
  elsif v_format = 'triple' then
    return public.with_fog(
      public.with_triple_districts(
        public.with_triple_play_parts(
          public.with_rare_triple_rules(public.triple_state_payload(p_match_id, p_side), p_match_id),
          p_match_id,
          p_side
        ),
        p_match_id
      ),
      p_match_id,
      p_side
    );
  elsif public.is_quadrant(v_format) then
    return public.quadrant_state_payload(p_match_id, p_side);
  end if;
  return public.with_fog(
    public.with_play_parts(
      public.with_rare_rules(public.classic_match_state_payload(p_match_id, p_side), p_match_id, p_side),
      p_match_id,
      p_side
    ),
    p_match_id,
    p_side
  );
end;
$$;

revoke execute on function public.fog_hides(uuid, integer, text, integer) from public, anon, authenticated;
revoke execute on function public.fog_card(jsonb) from public, anon, authenticated;
revoke execute on function public.with_fog(jsonb, uuid, text) from public, anon, authenticated;
grant execute on function public.fog_hides(uuid, integer, text, integer) to service_role;
grant execute on function public.fog_card(jsonb) to service_role;
grant execute on function public.with_fog(jsonb, uuid, text) to service_role;
