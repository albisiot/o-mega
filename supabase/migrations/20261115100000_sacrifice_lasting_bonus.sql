-- Sacrificio lasts (docs/POWERS-BACKLOG.md, Bilanciamento): the character still scores 0
-- in its round, and from then on every later character of its side gets +bonus until the
-- end of the match, instead of +5 to the next one only. The bonus is set by simulation
-- (a team with the card wins within 48-54%). The rules engine (packages/game-engine,
-- sacrificeBonus) applies it; the "match" Edge Function must be deployed with this.
--
-- Where a play's bonus comes from now has a sixth part, `sacrifice`. Plays stored before
-- keep their five parts: both shapes stay valid, so the old function keeps working until
-- the new one is deployed.

update public.power_definitions
set description_template = 'Il suo punteggio conta 0; da quel momento ogni tuo personaggio ottiene +{bonus} fino a fine partita'
where code = 'sacrifice';

-- Residuo (P227), the only card with it.
update public.card_definitions
set power_params = '{"bonus": 3}'::jsonb
where code = 'P227' and power_code = 'sacrifice';

comment on column public.round_plays.parts is
  'Where the bonus comes from: {power, carried, pack, sacrifice, modifier, floor}, integers adding up to bonus '
  '(no sacrifice before 20261115100000). Null for older plays.';

-- Whether some parts are well formed and add up to the play's bonus.
create or replace function public.play_parts_valid(p_parts jsonb, p_bonus integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_parts) = 'object'
    and (select array_agg(key order by key) from jsonb_each(p_parts)) in (
      array['carried', 'floor', 'modifier', 'pack', 'power'],
      array['carried', 'floor', 'modifier', 'pack', 'power', 'sacrifice']
    )
    and (select bool_and(jsonb_typeof(value) = 'number' and (value #>> '{}') ~ '^-?[0-9]+$') from jsonb_each(p_parts))
    and (select sum((value #>> '{}')::integer) from jsonb_each(p_parts)) = p_bonus
$$;

revoke execute on function public.play_parts_valid(jsonb, integer) from public, anon, authenticated;
grant execute on function public.play_parts_valid(jsonb, integer) to service_role;
