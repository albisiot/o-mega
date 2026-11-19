-- Schegge, frames and effects (SPEC §4.8).
--
-- A duplicate copy of an artwork variant can be broken into Schegge (a value per rarity,
-- rarity_definitions.variant_shard_value, set by admins). Schegge buy a standard pack, a random
-- frame or effect (or one of the chosen kind), or a variant the player does not own. A frame or an
-- effect is an item the player owns (cosmetic_items); applying it to a character uses it up, and
-- the character shows it (character_cosmetics) unless the player hides it. Everything is server
-- side: the client reads one payload (get_cosmetics) and sends intentions.

-- ---------------------------------------------------------------------------
-- Values and prices
-- ---------------------------------------------------------------------------

alter table public.rarity_definitions
  add column variant_shard_value integer not null default 0 check (variant_shard_value between 0 and 100);

update public.rarity_definitions set variant_shard_value = case code
  when 'delta' then 1
  when 'gamma' then 2
  when 'beta' then 3
  when 'alfa' then 5
  when 'omega' then 7
  else 0
end;

insert into public.game_config (key, value, description) values
  ('shards.pack_cost', '1', 'Schegge for a standard pack'),
  ('shards.random_cosmetic_cost', '1', 'Schegge for a random frame or effect'),
  ('shards.chosen_kind_cosmetic_cost', '2', 'Schegge for a random frame, or a random effect, of the kind chosen'),
  ('shards.new_variant_cost', '3', 'Schegge for a random variant the player does not own');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Every movement of Schegge: the balance is always the sum.
create table public.shard_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null check (reason in ('variant_break', 'pack', 'cosmetic', 'variant', 'admin_adjustment')),
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index shard_ledger_user_id_idx on public.shard_ledger (user_id);
alter table public.shard_ledger enable row level security;

-- The frames and effects there are. Their look is drawn by the app (src/lib/cosmetics.ts).
create table public.cosmetics (
  code text primary key check (code ~ '^[a-z][a-z_]{1,30}$'),
  kind text not null check (kind in ('frame', 'effect')),
  name text not null check (char_length(name) between 2 and 30),
  sort_order integer not null,
  is_active boolean not null default true
);
alter table public.cosmetics enable row level security;

insert into public.cosmetics (code, kind, name, sort_order) values
  ('silver', 'frame', 'Argento', 1),
  ('gold', 'frame', 'Oro', 2),
  ('prism', 'frame', 'Prisma', 3),
  ('slab', 'frame', 'Gradata', 4),
  ('slab_black', 'frame', 'Gradata nera', 5),
  ('neon', 'frame', 'Neon', 6),
  ('magma', 'frame', 'Magma', 7),
  ('ice', 'frame', 'Ghiaccio', 8),
  ('circuit', 'frame', 'Circuito', 9),
  ('comic', 'frame', 'Fumetto', 10),
  ('baroque', 'frame', 'Barocca', 11),
  ('marble', 'frame', 'Marmo', 12),
  ('carbon', 'frame', 'Carbonio', 13),
  ('void', 'frame', 'Abisso', 14),
  ('pixel', 'frame', 'Pixel', 15),
  ('holo', 'effect', 'Olografico', 1),
  ('flash', 'effect', 'Riflesso', 2),
  ('sparkles', 'effect', 'Scintille', 3),
  ('glitter', 'effect', 'Polvere di stelle', 4),
  ('cracked', 'effect', 'Ghiaccio incrinato', 5),
  ('snow', 'effect', 'Neve', 6),
  ('rays', 'effect', 'Raggi', 7),
  ('halftone', 'effect', 'Retino', 8),
  ('signature', 'effect', 'Autografo', 9),
  ('numbered', 'effect', 'Numerata', 10);

-- One row per frame or effect a player got: an instance, like the cards. The serial counts the
-- items of the same frame or effect ever made (the Numerata effect shows it).
create table public.cosmetic_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  cosmetic_code text not null references public.cosmetics (code),
  serial integer not null check (serial > 0),
  acquired_via text not null check (acquired_via in ('shards')),
  acquired_at timestamptz not null default now(),
  -- Set when the item is applied to a character: it is used up.
  used_at timestamptz,
  used_on uuid references public.card_definitions (id),
  unique (cosmetic_code, serial),
  constraint cosmetic_items_used check ((used_at is null) = (used_on is null))
);
create index cosmetic_items_owner_idx on public.cosmetic_items (owner_id, cosmetic_code) where used_at is null;
alter table public.cosmetic_items enable row level security;

-- The frame and the effect a player applied to a character, and whether they show.
create table public.character_cosmetics (
  user_id uuid not null references public.profiles (id) on delete cascade,
  definition_id uuid not null references public.card_definitions (id),
  frame_item_id uuid references public.cosmetic_items (id),
  effect_item_id uuid references public.cosmetic_items (id),
  frame_visible boolean not null default true,
  effect_visible boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, definition_id)
);
alter table public.character_cosmetics enable row level security;

-- New reasons and pack type.
alter table public.card_instances drop constraint card_instances_acquired_via_check;
alter table public.card_instances add constraint card_instances_acquired_via_check check (acquired_via in (
  'starter', 'pack', 'conquest', 'trade', 'level_unlock', 'bonus_code', 'story', 'event', 'objective', 'achievement',
  'challenge', 'shards'
));
alter table public.card_transfers drop constraint card_transfers_reason_check;
alter table public.card_transfers add constraint card_transfers_reason_check check (reason in (
  'starter', 'pack', 'conquest', 'trade', 'conversion', 'level_unlock', 'bonus_code', 'story', 'event', 'objective',
  'achievement', 'challenge', 'shards', 'shard_break'
));
alter table public.pack_openings drop constraint pack_openings_pack_type_check;
alter table public.pack_openings add constraint pack_openings_pack_type_check check (pack_type in (
  'daily', 'standard', 'bonus', 'event', 'special', 'objective', 'match', 'achievement', 'emergency', 'ranked', 'challenge',
  'shards'
));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.shard_balance(p_user uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(amount), 0)::integer from public.shard_ledger where user_id = p_user
$$;
revoke execute on function public.shard_balance(uuid) from public, anon, authenticated;

-- The copies of each variant a player owns, and how many can be broken: free ones (not just
-- conquered, not in a match), always keeping one copy of that variant.
create function public.variant_break_summary(p_user uuid)
returns table (variant_id uuid, definition_id uuid, copies integer, breakable integer)
language sql
stable
set search_path = ''
as $$
  select
    i.variant_id,
    i.definition_id,
    count(*)::integer,
    greatest(0, least(
      count(*) filter (
        where not i.is_starter
          and (i.locked_until is null or i.locked_until <= now())
          and b.instance_id is null
      ),
      count(*) - 1
    ))::integer
  from public.card_instances i
  left join public.busy_instance_ids(p_user) b on b.instance_id = i.id
  where i.owner_id = p_user and i.variant_id is not null
  group by i.variant_id, i.definition_id
$$;
revoke execute on function public.variant_break_summary(uuid) from public, anon, authenticated;

-- Same as open_pack, with the variant chance given: the packs bought with Schegge use the
-- standard chance, never an event's (each duplicate variant would pay for more packs).
create function public.open_pack_at_chance(p_user uuid, p_pack_type text, p_chance integer)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_definitions uuid[] := public.draw_pack_definitions(
    public.config_int('packs.cards_per_pack'),
    public.config_int('packs.guaranteed_min_rarity_rank')
  );
  v_definition uuid;
  v_instance uuid;
  v_is_new boolean;
  v_instance_ids uuid[] := '{}';
  v_new_ids uuid[] := '{}';
  v_opening uuid := gen_random_uuid();
begin
  foreach v_definition in array v_definitions loop
    v_is_new := not exists (
      select 1 from public.card_instances i where i.owner_id = p_user and i.definition_id = v_definition
    );

    insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
    values (
      v_definition, p_user, case when p_pack_type = 'shards' then 'shards' else 'pack' end,
      public.draw_variant_at(v_definition, coalesce(p_chance, public.variant_chance_now()))
    )
    returning id into v_instance;

    insert into public.card_transfers (instance_id, from_user, to_user, reason)
    values (v_instance, null, p_user, case when p_pack_type = 'shards' then 'shards' else 'pack' end);

    v_instance_ids := v_instance_ids || v_instance;
    if v_is_new then
      v_new_ids := v_new_ids || v_instance;
    end if;
  end loop;

  insert into public.pack_openings (id, user_id, pack_type, card_instance_ids, new_card_instance_ids)
  values (v_opening, p_user, p_pack_type, v_instance_ids, v_new_ids);

  return v_opening;
end;
$$;
revoke execute on function public.open_pack_at_chance(uuid, text, integer) from public, anon, authenticated;

-- Everything the app shows about Schegge, frames and effects, for one player.
create function public.cosmetics_payload(p_user uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'shard_balance', public.shard_balance(p_user),
    'costs', jsonb_build_object(
      'pack', public.config_int('shards.pack_cost'),
      'cosmetic', public.config_int('shards.random_cosmetic_cost'),
      'kind', public.config_int('shards.chosen_kind_cosmetic_cost'),
      'variant', public.config_int('shards.new_variant_cost')
    ),
    'values', (select coalesce(jsonb_object_agg(r.code, r.variant_shard_value), '{}'::jsonb) from public.rarity_definitions r),
    'catalog', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', c.code, 'kind', c.kind, 'name', c.name, 'active', c.is_active
      ) order by c.kind desc, c.sort_order), '[]'::jsonb)
      from public.cosmetics c
    ),
    'inventory', (
      select coalesce(jsonb_agg(jsonb_build_object('code', x.code, 'count', x.items, 'serial', x.first_serial) order by x.code), '[]'::jsonb)
      from (
        select ci.cosmetic_code as code, count(*)::integer as items, min(ci.serial) as first_serial
        from public.cosmetic_items ci
        where ci.owner_id = p_user and ci.used_at is null
        group by ci.cosmetic_code
      ) x
    ),
    'applied', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'definition_id', cc.definition_id,
        'frame', f.cosmetic_code,
        'frame_visible', cc.frame_visible,
        'effect', e.cosmetic_code,
        'effect_visible', cc.effect_visible,
        'effect_serial', e.serial
      )), '[]'::jsonb)
      from public.character_cosmetics cc
      left join public.cosmetic_items f on f.id = cc.frame_item_id
      left join public.cosmetic_items e on e.id = cc.effect_item_id
      where cc.user_id = p_user and (cc.frame_item_id is not null or cc.effect_item_id is not null)
    ),
    'breakable', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'variant_id', s.variant_id, 'definition_id', s.definition_id, 'copies', s.copies, 'breakable', s.breakable
      )), '[]'::jsonb)
      from public.variant_break_summary(p_user) s
    ),
    'missing_variants', (
      select count(*)::integer
      from public.card_variants v
      join public.card_definitions d on d.id = v.definition_id
      where v.is_active and d.is_active and d.unlock_level is null
        and not exists (select 1 from public.card_instances i where i.owner_id = p_user and i.variant_id = v.id)
    )
  )
$$;
revoke execute on function public.cosmetics_payload(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Player functions
-- ---------------------------------------------------------------------------

create function public.get_cosmetics()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  return public.cosmetics_payload(v_uid);
end;
$$;

-- Breaks p_count duplicate copies of a variant (the newest free ones) into Schegge.
create function public.break_variant_duplicates(p_variant_id uuid, p_count integer default 1)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_take integer;
  v_value integer;
  v_broken integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_count is null or p_count < 1 then
    raise exception 'invalid_count' using errcode = '22023';
  end if;

  -- Serializes the player's breaks and purchases.
  perform 1 from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  select least(s.breakable, p_count) into v_take
  from public.variant_break_summary(v_uid) s
  where s.variant_id = p_variant_id;
  if coalesce(v_take, 0) = 0 then
    raise exception 'nothing_to_break';
  end if;

  select r.variant_shard_value into v_value
  from public.card_variants v
  join public.card_definitions d on d.id = v.definition_id
  join public.rarity_definitions r on r.code = d.rarity_code
  where v.id = p_variant_id;

  with candidates as (
    select i.id
    from public.card_instances i
    where i.owner_id = v_uid
      and i.variant_id = p_variant_id
      and not i.is_starter
      and (i.locked_until is null or i.locked_until <= now())
      and not exists (select 1 from public.busy_instance_ids(v_uid) b where b.instance_id = i.id)
    order by i.acquired_at desc, i.id
    limit v_take
  ), moved as (
    -- Broken copies are not deleted: like converted ones, they lose their owner and keep their history.
    update public.card_instances i
    set owner_id = null, converted_at = now()
    from candidates c
    where i.id = c.id and i.owner_id = v_uid
    returning i.id
  ), transfers as (
    insert into public.card_transfers (instance_id, from_user, to_user, reason)
    select m.id, v_uid, null, 'shard_break' from moved m
  ), ledger as (
    insert into public.shard_ledger (user_id, amount, reason, ref_id)
    select v_uid, v_value, 'variant_break', m.id from moved m where v_value > 0
  )
  select count(*)::integer into v_broken from moved;

  return jsonb_build_object(
    'broken', v_broken,
    'shards', v_broken * coalesce(v_value, 0),
    'cosmetics', public.cosmetics_payload(v_uid)
  );
end;
$$;

-- Spends Schegge: 'pack' (a standard pack), 'cosmetic' (a random frame or effect), 'frame' or
-- 'effect' (a random one of that kind), 'variant' (a random variant the player does not own).
create function public.buy_with_shards(p_item text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_cost integer;
  v_cosmetic record;
  v_serial integer;
  v_item uuid;
  v_opening uuid;
  v_instance uuid;
  v_is_new boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  v_cost := case p_item
    when 'pack' then public.config_int('shards.pack_cost')
    when 'cosmetic' then public.config_int('shards.random_cosmetic_cost')
    when 'frame' then public.config_int('shards.chosen_kind_cosmetic_cost')
    when 'effect' then public.config_int('shards.chosen_kind_cosmetic_cost')
    when 'variant' then public.config_int('shards.new_variant_cost')
  end;
  if v_cost is null then
    raise exception 'invalid_shard_item' using errcode = '22023';
  end if;

  perform 1 from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  if public.shard_balance(v_uid) < v_cost then
    raise exception 'insufficient_shards';
  end if;

  if p_item = 'pack' then
    v_opening := public.open_pack_at_chance(v_uid, 'shards', public.config_int('packs.variant_chance_percent'));
    insert into public.shard_ledger (user_id, amount, reason, ref_id) values (v_uid, -v_cost, 'pack', v_opening);
    return jsonb_build_object(
      'opening', public.pack_opening_payload(v_opening),
      'cosmetics', public.cosmetics_payload(v_uid)
    );
  end if;

  if p_item = 'variant' then
    if not exists (
      select 1
      from public.card_variants v
      join public.card_definitions d on d.id = v.definition_id
      where v.is_active and d.is_active and d.unlock_level is null
        and not exists (select 1 from public.card_instances i where i.owner_id = v_uid and i.variant_id = v.id)
    ) then
      raise exception 'no_missing_variants';
    end if;
    -- grant_random_variants picks the variants the player does not own first: one exists.
    select g.instance_id, g.is_new into v_instance, v_is_new
    from public.grant_random_variants(v_uid, '{"count": 1}'::jsonb, 'shards') g;
    insert into public.pack_openings (user_id, pack_type, card_instance_ids, new_card_instance_ids)
    values (v_uid, 'shards', array[v_instance], case when v_is_new then array[v_instance] else '{}'::uuid[] end)
    returning id into v_opening;
    insert into public.shard_ledger (user_id, amount, reason, ref_id) values (v_uid, -v_cost, 'variant', v_opening);
    return jsonb_build_object(
      'opening', public.pack_opening_payload(v_opening),
      'cosmetics', public.cosmetics_payload(v_uid)
    );
  end if;

  -- A frame or an effect: every active one of the kind asked is as likely.
  select c.code, c.kind, c.name into v_cosmetic
  from public.cosmetics c
  where c.is_active and (p_item = 'cosmetic' or c.kind = p_item)
  order by random()
  limit 1;
  if not found then
    raise exception 'no_cosmetics';
  end if;
  -- Serializes the serial numbers of that frame or effect.
  perform 1 from public.cosmetics c where c.code = v_cosmetic.code for update;
  select coalesce(max(ci.serial), 0) + 1 into v_serial from public.cosmetic_items ci where ci.cosmetic_code = v_cosmetic.code;
  insert into public.cosmetic_items (owner_id, cosmetic_code, serial, acquired_via)
  values (v_uid, v_cosmetic.code, v_serial, 'shards')
  returning id into v_item;
  insert into public.shard_ledger (user_id, amount, reason, ref_id) values (v_uid, -v_cost, 'cosmetic', v_item);

  return jsonb_build_object(
    'item', jsonb_build_object('code', v_cosmetic.code, 'kind', v_cosmetic.kind, 'name', v_cosmetic.name, 'serial', v_serial),
    'cosmetics', public.cosmetics_payload(v_uid)
  );
end;
$$;

-- Applies a frame or an effect the player owns to a character they own: the item is used up and
-- takes the place of the one of the same kind, if any, which is lost.
create function public.apply_cosmetic(p_definition_id uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_kind text;
  v_item uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform 1 from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.card_instances i where i.owner_id = v_uid and i.definition_id = p_definition_id
  ) then
    raise exception 'character_not_owned';
  end if;
  select c.kind into v_kind from public.cosmetics c where c.code = p_code;
  if not found then
    raise exception 'cosmetic_not_found';
  end if;

  select ci.id into v_item
  from public.cosmetic_items ci
  where ci.owner_id = v_uid and ci.cosmetic_code = p_code and ci.used_at is null
  order by ci.serial
  limit 1
  for update;
  if not found then
    raise exception 'cosmetic_not_owned';
  end if;

  update public.cosmetic_items set used_at = now(), used_on = p_definition_id where id = v_item;

  insert into public.character_cosmetics as cc (user_id, definition_id, frame_item_id, effect_item_id)
  values (
    v_uid, p_definition_id,
    case when v_kind = 'frame' then v_item end,
    case when v_kind = 'effect' then v_item end
  )
  on conflict (user_id, definition_id) do update set
    frame_item_id = case when v_kind = 'frame' then v_item else cc.frame_item_id end,
    frame_visible = case when v_kind = 'frame' then true else cc.frame_visible end,
    effect_item_id = case when v_kind = 'effect' then v_item else cc.effect_item_id end,
    effect_visible = case when v_kind = 'effect' then true else cc.effect_visible end,
    updated_at = now();

  return public.cosmetics_payload(v_uid);
end;
$$;

-- Shows or hides the frame or the effect applied to a character; nothing is lost.
create function public.set_cosmetic_visible(p_definition_id uuid, p_kind text, p_visible boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_kind not in ('frame', 'effect') or p_visible is null then
    raise exception 'invalid_cosmetic_kind' using errcode = '22023';
  end if;

  update public.character_cosmetics cc
  set frame_visible = case when p_kind = 'frame' then p_visible else cc.frame_visible end,
      effect_visible = case when p_kind = 'effect' then p_visible else cc.effect_visible end,
      updated_at = now()
  where cc.user_id = v_uid
    and cc.definition_id = p_definition_id
    and (case when p_kind = 'frame' then cc.frame_item_id else cc.effect_item_id end) is not null;
  if not found then
    raise exception 'cosmetic_not_applied';
  end if;

  return public.cosmetics_payload(v_uid);
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin functions (Editor → Schegge)
-- ---------------------------------------------------------------------------

create function public.admin_get_shard_settings()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'rarities', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', r.code, 'name', r.name, 'rank', r.rank, 'color', r.color, 'value', r.variant_shard_value
      ) order by r.rank), '[]'::jsonb)
      from public.rarity_definitions r
    ),
    'costs', jsonb_build_object(
      'pack_cost', public.config_int('shards.pack_cost'),
      'random_cosmetic_cost', public.config_int('shards.random_cosmetic_cost'),
      'chosen_kind_cosmetic_cost', public.config_int('shards.chosen_kind_cosmetic_cost'),
      'new_variant_cost', public.config_int('shards.new_variant_cost')
    )
  );
end;
$$;

-- p_values: {rarity code: Schegge for a broken duplicate, 0-100}; p_costs: {key: Schegge, 1-100}.
create function public.admin_save_shard_settings(p_values jsonb, p_costs jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_value jsonb;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_values, '{}'::jsonb)) <> 'object' or jsonb_typeof(coalesce(p_costs, '{}'::jsonb)) <> 'object' then
    raise exception 'invalid_shard_settings' using errcode = '22023';
  end if;

  for v_key, v_value in select * from jsonb_each(coalesce(p_values, '{}'::jsonb)) loop
    if jsonb_typeof(v_value) <> 'number'
       or (v_value #>> '{}')::numeric <> trunc((v_value #>> '{}')::numeric)
       or (v_value #>> '{}')::numeric not between 0 and 100 then
      raise exception 'invalid_shard_settings' using errcode = '22023';
    end if;
    update public.rarity_definitions r set variant_shard_value = (v_value #>> '{}')::integer where r.code = v_key;
    if not found then
      raise exception 'invalid_shard_settings' using errcode = '22023';
    end if;
  end loop;

  for v_key, v_value in select * from jsonb_each(coalesce(p_costs, '{}'::jsonb)) loop
    if v_key not in ('pack_cost', 'random_cosmetic_cost', 'chosen_kind_cosmetic_cost', 'new_variant_cost')
       or jsonb_typeof(v_value) <> 'number'
       or (v_value #>> '{}')::numeric <> trunc((v_value #>> '{}')::numeric)
       or (v_value #>> '{}')::numeric not between 1 and 100 then
      raise exception 'invalid_shard_settings' using errcode = '22023';
    end if;
    update public.game_config c
    set value = to_jsonb((v_value #>> '{}')::integer), updated_at = now()
    where c.key = 'shards.' || v_key and c.value is distinct from to_jsonb((v_value #>> '{}')::integer);
  end loop;

  return public.admin_get_shard_settings();
end;
$$;

revoke execute on function public.get_cosmetics() from public, anon;
revoke execute on function public.break_variant_duplicates(uuid, integer) from public, anon;
revoke execute on function public.buy_with_shards(text) from public, anon;
revoke execute on function public.apply_cosmetic(uuid, text) from public, anon;
revoke execute on function public.set_cosmetic_visible(uuid, text, boolean) from public, anon;
revoke execute on function public.admin_get_shard_settings() from public, anon;
revoke execute on function public.admin_save_shard_settings(jsonb, jsonb) from public, anon;
grant execute on function public.get_cosmetics() to authenticated;
grant execute on function public.break_variant_duplicates(uuid, integer) to authenticated;
grant execute on function public.buy_with_shards(text) to authenticated;
grant execute on function public.apply_cosmetic(uuid, text) to authenticated;
grant execute on function public.set_cosmetic_visible(uuid, text, boolean) to authenticated;
grant execute on function public.admin_get_shard_settings() to authenticated;
grant execute on function public.admin_save_shard_settings(jsonb, jsonb) to authenticated;
