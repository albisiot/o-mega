-- M4 · Collection, album catalog and conversion of duplicates into coins.

-- Coins paid for each converted duplicate, per rarity (provisional values).
alter table public.rarity_definitions
  add column duplicate_coin_value integer not null default 0 check (duplicate_coin_value >= 0);

update public.rarity_definitions set duplicate_coin_value = case code
  when 'delta' then 10
  when 'gamma' then 25
  when 'beta' then 60
  when 'alfa' then 150
  when 'omega' then 400
end;

-- Converted cards are not deleted: they lose their owner and keep their
-- history, so the transfer ledger stays complete.
alter table public.card_instances alter column owner_id drop not null;
alter table public.card_instances add column converted_at timestamptz;
alter table public.card_instances
  add constraint card_instances_owner_or_converted check ((owner_id is null) = (converted_at is not null));

-- ---------------------------------------------------------------------------
-- card_catalog: the album's view of every active character, with its rarity
-- and power text. Same visibility as the underlying tables (public).
-- ---------------------------------------------------------------------------

create view public.card_catalog
with (security_invoker = true)
as
select
  d.id,
  d.code,
  d.name,
  d.faction,
  d.flavor,
  d.stats,
  d.art_url,
  r.code as rarity_code,
  r.name as rarity_name,
  r.rank as rarity_rank,
  r.color as rarity_color,
  r.duplicate_coin_value,
  p.name as power_name,
  public.power_text(d.power_code, d.power_params) as power_text
from public.card_definitions d
join public.rarity_definitions r on r.code = d.rarity_code
left join public.power_definitions p on p.code = d.power_code
where d.is_active;

revoke all on table public.card_catalog from anon, authenticated;
grant select on table public.card_catalog to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Collection summary and conversion
--
-- A copy can be converted when it is not a starter card (bound to the
-- account) and not locked after a conquest. The player always keeps at least
-- one copy of each character. M6 will also exclude cards fielded in a match.
-- ---------------------------------------------------------------------------

create function public.collection_summary(p_user uuid)
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
    least(s.free_copies, s.copies - 1) as convertible_copies
  from (
    select
      i.definition_id,
      count(*)::integer as copies,
      (count(*) filter (where i.is_starter))::integer as starter_copies,
      (count(*) filter (where i.locked_until > now()))::integer as locked_copies,
      (count(*) filter (where not i.is_starter and (i.locked_until is null or i.locked_until <= now())))::integer
        as free_copies
    from public.card_instances i
    where i.owner_id = p_user
    group by i.definition_id
  ) s
$$;

-- Converts up to p_count convertible copies of one character (all of them
-- when p_count is null), newest first. Internal: the caller must hold the
-- lock on the player's profile row.
create function public.convert_definition_duplicates(
  p_user uuid,
  p_definition_id uuid,
  p_count integer,
  out converted integer,
  out coins integer
)
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_convertible integer;
  v_value integer;
  v_ids uuid[];
begin
  select s.convertible_copies into v_convertible
  from public.collection_summary(p_user) s
  where s.definition_id = p_definition_id;

  select coalesce(array_agg(c.id), '{}') into v_ids from (
    select i.id
    from public.card_instances i
    where i.owner_id = p_user
      and i.definition_id = p_definition_id
      and not i.is_starter
      and (i.locked_until is null or i.locked_until <= now())
    order by i.acquired_at desc, i.id
    limit greatest(0, least(coalesce(p_count, v_convertible, 0), coalesce(v_convertible, 0)))
  ) c;

  converted := cardinality(v_ids);
  coins := 0;
  if converted = 0 then
    return;
  end if;

  update public.card_instances set owner_id = null, converted_at = now() where id = any (v_ids);

  insert into public.card_transfers (instance_id, from_user, to_user, reason)
  select u.id, p_user, null, 'conversion' from unnest(v_ids) as u(id);

  select r.duplicate_coin_value into v_value
  from public.card_definitions d
  join public.rarity_definitions r on r.code = d.rarity_code
  where d.id = p_definition_id;

  -- One ledger row per converted card, referencing it.
  if v_value > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id)
    select p_user, v_value, 'duplicate_conversion', u.id from unnest(v_ids) as u(id);
  end if;
  coins := v_value * converted;
end;
$$;

revoke execute on function public.collection_summary(uuid) from public, anon, authenticated;
revoke execute on function public.convert_definition_duplicates(uuid, uuid, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Client RPCs
-- ---------------------------------------------------------------------------

-- Copies owned by the caller, per character.
create function public.get_collection()
returns table (
  definition_id uuid,
  copies integer,
  starter_copies integer,
  locked_copies integer,
  convertible_copies integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  return query select * from public.collection_summary(auth.uid());
end;
$$;

-- Converts duplicates of one character: p_count copies, or all convertible
-- ones when p_count is null. Fails with "nothing_to_convert" or "invalid_count".
create function public.convert_duplicates(p_definition_id uuid, p_count integer default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_result record;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_count is not null and p_count < 1 then
    raise exception 'invalid_count' using errcode = '22023';
  end if;

  -- Serializes conversions and purchases of the same player.
  perform 1 from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  select * into v_result from public.convert_definition_duplicates(v_uid, p_definition_id, p_count);
  if v_result.converted = 0 then
    raise exception 'nothing_to_convert';
  end if;

  return jsonb_build_object(
    'converted', v_result.converted,
    'coins', v_result.coins,
    'coin_balance', public.coin_balance(v_uid)
  );
end;
$$;

-- Converts every convertible duplicate of the caller's collection.
create function public.convert_all_duplicates()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_definition uuid;
  v_result record;
  v_converted integer := 0;
  v_coins integer := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  perform 1 from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  for v_definition in
    select s.definition_id from public.collection_summary(v_uid) s where s.convertible_copies > 0
  loop
    select * into v_result from public.convert_definition_duplicates(v_uid, v_definition, null);
    v_converted := v_converted + v_result.converted;
    v_coins := v_coins + v_result.coins;
  end loop;

  if v_converted = 0 then
    raise exception 'nothing_to_convert';
  end if;

  return jsonb_build_object(
    'converted', v_converted,
    'coins', v_coins,
    'coin_balance', public.coin_balance(v_uid)
  );
end;
$$;

revoke execute on function public.get_collection() from public, anon;
revoke execute on function public.convert_duplicates(uuid, integer) from public, anon;
revoke execute on function public.convert_all_duplicates() from public, anon;
grant execute on function public.get_collection() to authenticated;
grant execute on function public.convert_duplicates(uuid, integer) to authenticated;
grant execute on function public.convert_all_duplicates() to authenticated;
