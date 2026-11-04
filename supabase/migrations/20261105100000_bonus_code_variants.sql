-- Bonus codes can give a card with a chosen artwork variant (SPEC §8.1): the
-- only way besides packs to get one, decided by an admin for a code.

-- One entry per card of the code: the variant of that copy, or null for the base drawing.
alter table public.bonus_codes add column card_variant_ids uuid[] not null default '{}';
update public.bonus_codes
set card_variant_ids = array_fill(null::uuid, array[cardinality(card_definition_ids)])
where cardinality(card_definition_ids) > 0;
alter table public.bonus_codes add constraint bonus_codes_variants_per_card
  check (cardinality(card_variant_ids) = cardinality(card_definition_ids));

-- p_card_codes: 'P051' for the base drawing, 'P051:neon' for that variant.
create or replace function public.create_bonus_code(
  p_code text,
  p_coins integer default 0,
  p_packs integer default 0,
  p_card_codes text[] default '{}',
  p_max_uses integer default null,
  p_expires_at timestamptz default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card_code text;
  v_style text;
  v_definition uuid;
  v_variant uuid;
  v_definitions uuid[] := '{}';
  v_variants uuid[] := '{}';
  v_id uuid;
begin
  foreach v_card_code in array p_card_codes loop
    v_style := nullif(split_part(v_card_code, ':', 2), '');
    -- Level cards are earned by levelling up.
    select d.id into v_definition
    from public.card_definitions d
    where d.code = split_part(v_card_code, ':', 1) and d.is_active and d.unlock_level is null;
    if not found then
      raise exception 'card % does not exist or cannot be given by a code', v_card_code;
    end if;

    v_variant := null;
    if v_style is not null then
      select v.id into v_variant
      from public.card_variants v
      where v.definition_id = v_definition and v.style = v_style and v.is_active;
      if not found then
        raise exception 'card % has no variant %', split_part(v_card_code, ':', 1), v_style;
      end if;
    end if;

    v_definitions := v_definitions || v_definition;
    v_variants := v_variants || v_variant;
  end loop;

  insert into public.bonus_codes (code, coins, packs, card_definition_ids, card_variant_ids, max_uses, expires_at, note)
  values (upper(trim(p_code)), p_coins, p_packs, v_definitions, v_variants, p_max_uses, p_expires_at, p_note)
  returning id into v_id;
  return v_id;
end;
$$;

-- Same as before, with the variant of each chosen card.
create or replace function public.redeem_bonus_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_input text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  v_code public.bonus_codes;
  v_redemption uuid := gen_random_uuid();
  v_opening uuid;
  v_openings uuid[] := '{}';
  v_definition uuid;
  v_instance uuid;
  v_instance_ids uuid[] := '{}';
  v_new_ids uuid[] := '{}';
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- Lock the player so concurrent attempts cannot get past the limit.
  perform 1 from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  if (
    select count(*) from public.bonus_code_failed_attempts a
    where a.user_id = v_uid and a.attempted_at > now() - interval '1 hour'
  ) >= public.config_int('bonus_codes.max_failed_attempts_per_hour') then
    raise exception 'bonus_code_too_many_attempts';
  end if;

  -- Lock the code so concurrent redemptions cannot exceed max_uses.
  select * into v_code from public.bonus_codes c where c.code = v_input and c.is_active for update;
  if not found then
    insert into public.bonus_code_failed_attempts (user_id) values (v_uid);
    return jsonb_build_object('error', 'bonus_code_invalid');
  end if;

  if v_code.expires_at is not null and v_code.expires_at <= now() then
    raise exception 'bonus_code_expired';
  end if;
  if exists (
    select 1 from public.bonus_code_redemptions r where r.code_id = v_code.id and r.user_id = v_uid
  ) then
    raise exception 'bonus_code_already_redeemed';
  end if;
  if v_code.max_uses is not null and (
    select count(*) from public.bonus_code_redemptions r where r.code_id = v_code.id
  ) >= v_code.max_uses then
    raise exception 'bonus_code_exhausted';
  end if;

  if v_code.coins > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id)
    values (v_uid, v_code.coins, 'bonus_code', v_redemption);
  end if;

  -- The chosen cards are shown like a pack, with the same reveal.
  for i in 1..coalesce(cardinality(v_code.card_definition_ids), 0) loop
    v_definition := v_code.card_definition_ids[i];
    insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
    values (v_definition, v_uid, 'bonus_code', v_code.card_variant_ids[i])
    returning id into v_instance;

    insert into public.card_transfers (instance_id, from_user, to_user, reason)
    values (v_instance, null, v_uid, 'bonus_code');

    if (select count(*) from public.card_instances i where i.owner_id = v_uid and i.definition_id = v_definition) = 1 then
      v_new_ids := v_new_ids || v_instance;
    end if;
    v_instance_ids := v_instance_ids || v_instance;
  end loop;

  if cardinality(v_instance_ids) > 0 then
    insert into public.pack_openings (user_id, pack_type, card_instance_ids, new_card_instance_ids)
    values (v_uid, 'bonus', v_instance_ids, v_new_ids)
    returning id into v_opening;
    v_openings := v_openings || v_opening;
  end if;

  for i in 1..v_code.packs loop
    v_openings := v_openings || public.open_pack(v_uid, 'standard');
  end loop;

  insert into public.bonus_code_redemptions (id, code_id, user_id, opening_ids)
  values (v_redemption, v_code.id, v_uid, v_openings);

  return jsonb_build_object(
    'coins', v_code.coins,
    'cards', cardinality(v_instance_ids),
    'packs', v_code.packs,
    'openings', (
      select coalesce(jsonb_agg(public.pack_opening_payload(u.id) order by u.ord), '[]'::jsonb)
      from unnest(v_openings) with ordinality as u(id, ord)
    )
  );
end;
$$;

-- Same as before: card names say the variant, and the cards list each one's variants.
create or replace function public.admin_bonus_codes_payload()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'codes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'code', c.code,
        'coins', c.coins,
        'packs', c.packs,
        'card_names', (
          select coalesce(jsonb_agg(d.name || coalesce(' (' || v.style_name || ')', '') order by u.ord), '[]'::jsonb)
          from unnest(c.card_definition_ids, c.card_variant_ids) with ordinality as u(id, variant_id, ord)
          join public.card_definitions d on d.id = u.id
          left join public.card_variants v on v.id = u.variant_id
        ),
        'max_uses', c.max_uses,
        'uses', (select count(*) from public.bonus_code_redemptions r where r.code_id = c.id),
        'expires_at', c.expires_at,
        'is_active', c.is_active,
        'note', c.note
      ) order by c.created_at desc)
      from public.bonus_codes c
    ), '[]'::jsonb),
    'cards', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', d.code,
        'name', d.name,
        'rarity', r.name,
        'variants', (
          select coalesce(jsonb_agg(jsonb_build_object('style', v.style, 'name', v.style_name) order by v.style_name), '[]'::jsonb)
          from public.card_variants v where v.definition_id = d.id and v.is_active
        )
      ) order by d.name), '[]'::jsonb)
      from public.card_definitions d
      join public.rarity_definitions r on r.code = d.rarity_code
      where d.is_active and d.unlock_level is null
    )
  )
$$;
