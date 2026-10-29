-- M3 · Packs: one free pack per day, standard packs bought with coins.
-- RNG runs only here; the result is stored before the client sees it.

insert into public.game_config (key, value, description) values
  ('time.daily_reset_time_zone', '"Europe/Rome"', 'Time zone of the daily reset at midnight'),
  ('packs.cards_per_pack', '5', 'Cards in every pack'),
  ('packs.guaranteed_min_rarity_rank', '2', 'Every pack holds at least one card of this rarity rank or higher'),
  ('packs.standard_pack_price', '150', 'Price in coins of a standard pack');

-- Reads a text config value; fails loudly when the key is missing.
create function public.config_text(p_key text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_value text;
begin
  select value #>> '{}' into v_value from public.game_config where key = p_key;
  if v_value is null then
    raise exception 'missing game_config key: %', p_key;
  end if;
  return v_value;
end;
$$;

-- The game day changes at midnight in the configured time zone, never the device's.
create function public.game_day(p_at timestamptz default now())
returns date
language sql
stable
set search_path = ''
as $$
  select timezone(public.config_text('time.daily_reset_time_zone'), p_at)::date
$$;

create function public.next_reset_at(p_at timestamptz default now())
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select timezone(public.config_text('time.daily_reset_time_zone'), (public.game_day(p_at) + 1)::timestamp)
$$;

revoke execute on function public.config_text(text) from public, anon, authenticated;
revoke execute on function public.game_day(timestamptz) from public, anon, authenticated;
revoke execute on function public.next_reset_at(timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- coin_ledger: every coin movement. Balances are always the sum of the ledger.
-- Functions that debit coins must lock the player's profile row first
-- (select ... for update) so concurrent debits cannot overdraw.
-- ---------------------------------------------------------------------------

create table public.coin_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null check (reason in (
    'pack_purchase', 'match_reward', 'duplicate_conversion', 'conquest_bonus', 'admin_adjustment'
  )),
  ref_id uuid,
  created_at timestamptz not null default now()
);

create index coin_ledger_user_id_idx on public.coin_ledger (user_id);

alter table public.coin_ledger enable row level security;
revoke all on table public.coin_ledger from anon, authenticated;
grant select on table public.coin_ledger to authenticated;
create policy "players read their own coin movements"
  on public.coin_ledger for select to authenticated
  using ((select auth.uid()) = user_id);

create function public.coin_balance(p_user uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(amount), 0)::integer from public.coin_ledger where user_id = p_user
$$;

revoke execute on function public.coin_balance(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- pack_openings and daily_claims
-- ---------------------------------------------------------------------------

create table public.pack_openings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  pack_type text not null check (pack_type in ('daily', 'standard')),
  is_daily boolean generated always as (pack_type = 'daily') stored,
  -- In draw order.
  card_instance_ids uuid[] not null,
  -- Cards whose character the player did not own before this pack.
  new_card_instance_ids uuid[] not null default '{}',
  opened_at timestamptz not null default now()
);

create index pack_openings_user_id_idx on public.pack_openings (user_id, opened_at desc);

alter table public.pack_openings enable row level security;
revoke all on table public.pack_openings from anon, authenticated;
grant select on table public.pack_openings to authenticated;
create policy "players read their own pack openings"
  on public.pack_openings for select to authenticated
  using ((select auth.uid()) = user_id);

-- One row per player and game day: the free pack cannot be stockpiled and
-- simply expires at the reset when it was not opened.
create table public.daily_claims (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  pack_opening_id uuid references public.pack_openings (id) on delete set null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index daily_claims_pack_opening_id_idx on public.daily_claims (pack_opening_id);

alter table public.daily_claims enable row level security;
revoke all on table public.daily_claims from anon, authenticated;
grant select on table public.daily_claims to authenticated;
create policy "players read their own daily claims"
  on public.daily_claims for select to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Powers rendered as text, e.g. "+2 contro Minacce che richiedono Forza".
-- Public: the album also needs it.
-- ---------------------------------------------------------------------------

create function public.power_text(p_power_code text, p_params jsonb)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_text text;
  v_param record;
  v_value text;
begin
  if p_power_code is null then
    return null;
  end if;
  select p.description_template into v_text from public.power_definitions p where p.code = p_power_code;
  for v_param in select e.key, e.value from jsonb_each_text(coalesce(p_params, '{}')) as e loop
    v_value := case v_param.key
      when 'ability' then (select a.name from public.ability_definitions a where a.code = v_param.value)
      when 'family' then (select f.name from public.ability_families f where f.code = v_param.value)
      else v_param.value
    end;
    v_text := replace(v_text, '{' || v_param.key || '}', coalesce(v_value, v_param.value));
  end loop;
  return v_text;
end;
$$;

revoke execute on function public.power_text(text, jsonb) from public;
grant execute on function public.power_text(text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Drawing cards (internal)
-- ---------------------------------------------------------------------------

-- Picks a rarity rank >= p_min_rank, weighted by drop_weight, among the
-- rarities that currently have active cards.
create function public.draw_rarity_rank(p_min_rank integer)
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
    select r.rank, r.drop_weight
    from public.rarity_definitions r
    where r.rank >= p_min_rank
      and r.drop_weight > 0
      and exists (select 1 from public.card_definitions d where d.rarity_code = r.code and d.is_active)
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

-- Draws the characters of one pack: a weighted rarity per slot, then a
-- uniform character of that rarity. If no earlier slot reached the
-- guaranteed rank, the last slot is drawn among those rarities only.
create function public.draw_pack_definitions(p_count integer, p_guaranteed_min_rank integer)
returns uuid[]
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_definitions uuid[] := '{}';
  v_ranks integer[] := '{}';
  v_rank integer;
  v_definition uuid;
begin
  for slot in 1..p_count loop
    if slot = p_count and not (p_guaranteed_min_rank <= any (v_ranks)) then
      v_rank := public.draw_rarity_rank(p_guaranteed_min_rank);
    else
      v_rank := public.draw_rarity_rank(1);
    end if;

    select d.id into v_definition
    from public.card_definitions d
    join public.rarity_definitions r on r.code = d.rarity_code
    where d.is_active and r.rank = v_rank
    order by random()
    limit 1;

    v_definitions := v_definitions || v_definition;
    v_ranks := v_ranks || v_rank;
  end loop;
  return v_definitions;
end;
$$;

-- Creates the cards of a pack for a player, logs them in the transfer ledger
-- and records the opening. Returns the opening id.
create function public.open_pack(p_user uuid, p_pack_type text)
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

    insert into public.card_instances (definition_id, owner_id, acquired_via)
    values (v_definition, p_user, 'pack')
    returning id into v_instance;

    insert into public.card_transfers (instance_id, from_user, to_user, reason)
    values (v_instance, null, p_user, 'pack');

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

-- What the client shows: the cards of an opening, least rare first so the
-- best card is revealed last.
create function public.pack_opening_payload(p_opening_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'pack_type', o.pack_type,
    'opened_at', o.opened_at,
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'instance_id', i.id,
        'is_new', i.id = any (o.new_card_instance_ids),
        'code', d.code,
        'name', d.name,
        'faction', d.faction,
        'flavor', d.flavor,
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
      left join public.power_definitions p on p.code = d.power_code
    ), '[]'::jsonb)
  )
  from public.pack_openings o
  where o.id = p_opening_id
$$;

revoke execute on function public.draw_rarity_rank(integer) from public, anon, authenticated;
revoke execute on function public.draw_pack_definitions(integer, integer) from public, anon, authenticated;
revoke execute on function public.open_pack(uuid, text) from public, anon, authenticated;
revoke execute on function public.pack_opening_payload(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Client RPCs
-- ---------------------------------------------------------------------------

-- Opens today's free pack. Fails with "daily_pack_already_claimed" if the
-- player already opened it in the current game day.
create function public.claim_daily_pack()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_day date := public.game_day();
  v_opening uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  -- The primary key serializes concurrent claims for the same day.
  insert into public.daily_claims (user_id, day) values (v_uid, v_day)
  on conflict do nothing;
  if not found then
    raise exception 'daily_pack_already_claimed';
  end if;

  v_opening := public.open_pack(v_uid, 'daily');
  update public.daily_claims set pack_opening_id = v_opening where user_id = v_uid and day = v_day;

  return public.pack_opening_payload(v_opening);
end;
$$;

-- Buys and opens a standard pack. Fails with "insufficient_coins".
create function public.buy_pack()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_price integer := public.config_int('packs.standard_pack_price');
  v_opening uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- Lock the player so concurrent purchases cannot overdraw the balance.
  perform 1 from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  if public.coin_balance(v_uid) < v_price then
    raise exception 'insufficient_coins';
  end if;

  v_opening := public.open_pack(v_uid, 'standard');
  insert into public.coin_ledger (user_id, amount, reason, ref_id)
  values (v_uid, -v_price, 'pack_purchase', v_opening);

  return public.pack_opening_payload(v_opening);
end;
$$;

-- Shows a past opening again (e.g. after a reload during the animation).
create function public.get_pack_opening(p_opening_id uuid)
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
  if not exists (select 1 from public.pack_openings where id = p_opening_id and user_id = v_uid) then
    raise exception 'pack_not_found' using errcode = 'P0002';
  end if;
  return public.pack_opening_payload(p_opening_id);
end;
$$;

-- Everything the home screen needs about packs, computed on the server.
create function public.get_pack_status()
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
  return jsonb_build_object(
    'daily_available', not exists (
      select 1 from public.daily_claims where user_id = v_uid and day = public.game_day()
    ),
    'resets_at', public.next_reset_at(),
    'coin_balance', public.coin_balance(v_uid),
    'standard_pack_price', public.config_int('packs.standard_pack_price')
  );
end;
$$;

revoke execute on function public.claim_daily_pack() from public, anon;
revoke execute on function public.buy_pack() from public, anon;
revoke execute on function public.get_pack_opening(uuid) from public, anon;
revoke execute on function public.get_pack_status() from public, anon;
grant execute on function public.claim_daily_pack() to authenticated;
grant execute on function public.buy_pack() to authenticated;
grant execute on function public.get_pack_opening(uuid) to authenticated;
grant execute on function public.get_pack_status() to authenticated;
