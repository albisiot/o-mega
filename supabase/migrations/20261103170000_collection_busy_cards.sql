-- Reading a collection no longer grows with the game's history. It called
-- instance_in_active_match once per owned card, and each call scanned every
-- running match and every Conquest pick ever written. Now the cards in use are
-- gathered once, from the player's own running matches and open picks, and
-- the rest of the collection is compared against that short list.

-- Open picks are few at any time; resolved ones pile up forever.
create index conquest_claims_open_loser_idx on public.conquest_claims (loser_id) where resolved_at is null;
create index conquest_claims_open_winner_idx on public.conquest_claims (winner_id) where resolved_at is null;

-- The player's cards fielded in a running match or at stake in an open pick:
-- the cards instance_in_active_match reports, for one player at once. A card
-- never changes hands while it is in a match or a pick, so only the player's
-- own matches, and the picks the player lost, can hold the player's cards.
-- One branch per side, so that each one is a lookup in a unique index.
create function public.busy_instance_ids(p_user uuid)
returns table (instance_id uuid)
language sql
stable
set search_path = ''
as $$
  select u.id
  from public.matches m
  join public.match_teams t on t.match_id = m.id and t.side = 'a'
  cross join lateral unnest(t.card_instance_ids) as u(id)
  where m.status = 'active' and m.player_a = p_user
  union
  select u.id
  from public.matches m
  join public.match_teams t on t.match_id = m.id and t.side = 'b'
  cross join lateral unnest(t.card_instance_ids) as u(id)
  where m.status = 'active' and m.player_b = p_user
  union
  select u.id
  from public.conquest_claims c
  cross join lateral unnest(c.eligible_instance_ids) as u(id)
  where c.resolved_at is null and c.loser_id = p_user
$$;

revoke execute on function public.busy_instance_ids(uuid) from public, anon, authenticated;

-- Same result as before.
create or replace function public.collection_summary(p_user uuid)
returns table (
  definition_id uuid,
  copies integer,
  starter_copies integer,
  locked_copies integer,
  convertible_copies integer
)
language sql
stable
set search_path = ''
as $$
  select
    s.definition_id,
    s.copies,
    s.starter_copies,
    s.locked_copies,
    greatest(0, least(s.free_copies, s.base_copies - 1)) as convertible_copies
  from (
    select
      i.definition_id,
      count(*)::integer as copies,
      (count(*) filter (where i.variant_id is null))::integer as base_copies,
      (count(*) filter (where i.is_starter))::integer as starter_copies,
      (count(*) filter (where i.locked_until > now()))::integer as locked_copies,
      (count(*) filter (
        where not i.is_starter
          and i.variant_id is null
          and (i.locked_until is null or i.locked_until <= now())
          and b.instance_id is null
      ))::integer as free_copies
    from public.card_instances i
    left join public.busy_instance_ids(p_user) b on b.instance_id = i.id
    where i.owner_id = p_user
    group by i.definition_id
  ) s
$$;

-- Same checks as before. The open picks that can hold the player's cards are
-- the ones the player lost, which the index finds without the whole history.
create or replace function public.validate_team(p_user uuid, p_instance_ids uuid[])
returns uuid[]
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_size integer := public.config_int('match.team_size');
  v_definitions uuid[];
begin
  perform public.close_abandoned_matches(p_user);
  perform public.settle_expired_claims(p_user);

  if coalesce(cardinality(p_instance_ids), 0) <> v_size then
    raise exception 'invalid_team_size' using errcode = '22023';
  end if;
  if (select count(distinct u.id) from unnest(p_instance_ids) as u(id)) <> v_size then
    raise exception 'duplicate_card' using errcode = '22023';
  end if;

  select array_agg(i.definition_id order by u.ord) into v_definitions
  from unnest(p_instance_ids) with ordinality as u(id, ord)
  join public.card_instances i on i.id = u.id and i.owner_id = p_user;
  if coalesce(cardinality(v_definitions), 0) <> v_size then
    raise exception 'card_not_owned' using errcode = '22023';
  end if;

  -- Two copies of the same character are not allowed (SPEC §5.2).
  if (select count(distinct d.id) from unnest(v_definitions) as d(id)) <> v_size then
    raise exception 'duplicate_character' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.conquest_claims c
    where c.resolved_at is null and c.loser_id = p_user and c.eligible_instance_ids && p_instance_ids
  ) then
    raise exception 'card_at_stake' using errcode = '22023';
  end if;
  return v_definitions;
end;
$$;
