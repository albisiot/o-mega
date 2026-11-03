-- Converting every duplicate ran one conversion per character, and each one
-- worked out the whole collection again: the cost grew with the square of the
-- collection and could hit the statement timeout. One statement now picks the
-- copies of every character and moves them, with the same coins and the same
-- ledger rows as before.

-- Converts duplicates of one character (p_count copies, or all convertible
-- ones when p_count is null), or of every character when p_definition_id is
-- null. The newest free base copies go first, as before.
create or replace function public.convert_definition_duplicates(
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
begin
  with summary as (
    select s.definition_id, least(coalesce(p_count, s.convertible_copies), s.convertible_copies) as take
    from public.collection_summary(p_user) s
    where s.convertible_copies > 0 and (p_definition_id is null or s.definition_id = p_definition_id)
  ), candidates as (
    select i.id, i.definition_id, r.duplicate_coin_value as value,
           row_number() over (partition by i.definition_id order by i.acquired_at desc, i.id) as n
    from public.card_instances i
    join summary s on s.definition_id = i.definition_id
    join public.card_definitions d on d.id = i.definition_id
    join public.rarity_definitions r on r.code = d.rarity_code
    where i.owner_id = p_user
      and not i.is_starter
      and i.variant_id is null
      and (i.locked_until is null or i.locked_until <= now())
      and not exists (select 1 from public.busy_instance_ids(p_user) b where b.instance_id = i.id)
  ), moved as (
    update public.card_instances i
    set owner_id = null, converted_at = now()
    from candidates c
    join summary s on s.definition_id = c.definition_id
    where i.id = c.id and c.n <= s.take and i.owner_id = p_user
    returning i.id, c.value
  ), transfers as (
    insert into public.card_transfers (instance_id, from_user, to_user, reason)
    select m.id, p_user, null, 'conversion' from moved m
  ), ledger as (
    -- One ledger row per converted card, referencing it.
    insert into public.coin_ledger (user_id, amount, reason, ref_id)
    select p_user, m.value, 'duplicate_conversion', m.id from moved m where m.value > 0
  )
  select count(*)::integer, coalesce(sum(m.value), 0)::integer into converted, coins from moved m;
end;
$$;

-- Same as before: one character only. A null character now means every one
-- to convert_definition_duplicates, so it is refused here, as it was.
create or replace function public.convert_duplicates(p_definition_id uuid, p_count integer default null)
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
  if p_definition_id is null then
    raise exception 'nothing_to_convert';
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

-- Same as before, in one conversion.
create or replace function public.convert_all_duplicates()
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

  perform 1 from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  select * into v_result from public.convert_definition_duplicates(v_uid, null, null);
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
