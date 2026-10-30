-- M5 · Shop: the pack odds shown to players come from the same data the draw
-- uses, so what the shop says is exactly what happens (SPEC §4.2).

-- Rarities that can be drawn: positive weight and at least one active card.
create function public.eligible_rarities()
returns table (code text, name text, rank integer, color text, drop_weight numeric)
language sql
stable
set search_path = ''
as $$
  select r.code, r.name, r.rank, r.color, r.drop_weight
  from public.rarity_definitions r
  where r.drop_weight > 0
    and exists (select 1 from public.card_definitions d where d.rarity_code = r.code and d.is_active)
$$;

revoke execute on function public.eligible_rarities() from public, anon, authenticated;

-- Same behaviour as before, now based on eligible_rarities().
create or replace function public.draw_rarity_rank(p_min_rank integer)
returns integer
language plpgsql
volatile
set search_path = ''
as $$
declare
  -- Drawn once: random() inside the query would be evaluated per row.
  v_roll numeric := random()::numeric;
  v_rank integer;
begin
  with eligible as (
    select e.rank, e.drop_weight from public.eligible_rarities() e where e.rank >= p_min_rank
  ), cumulative as (
    select e.rank,
           sum(e.drop_weight) over (order by e.rank) as upper_bound,
           sum(e.drop_weight) over () as total
    from eligible e
  )
  select c.rank into v_rank
  from cumulative c
  where c.upper_bound > v_roll * c.total
  order by c.rank
  limit 1;

  if v_rank is null then
    raise exception 'no active cards with rarity rank >= %', p_min_rank;
  end if;
  return v_rank;
end;
$$;

-- Public: per-card odds by rarity, pack size, guarantee and price.
create function public.get_pack_odds()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'cards_per_pack', public.config_int('packs.cards_per_pack'),
    'standard_pack_price', public.config_int('packs.standard_pack_price'),
    'guaranteed_min_rarity_rank', public.config_int('packs.guaranteed_min_rarity_rank'),
    'guaranteed_rarity_name', (
      select r.name from public.rarity_definitions r
      where r.rank = public.config_int('packs.guaranteed_min_rarity_rank')
    ),
    'odds', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', w.code, 'name', w.name, 'rank', w.rank, 'color', w.color,
        'probability', round(w.probability, 4)
      ) order by w.rank)
      from (
        select e.*, e.drop_weight / sum(e.drop_weight) over () as probability
        from public.eligible_rarities() e
      ) w
    ), '[]'::jsonb)
  )
$$;

revoke execute on function public.get_pack_odds() from public;
grant execute on function public.get_pack_odds() to anon, authenticated;
