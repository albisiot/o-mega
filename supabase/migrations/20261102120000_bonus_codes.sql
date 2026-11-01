-- Bonus codes (SPEC §8.1): the player types a code in the shop and receives the
-- coins, packs and cards decided beforehand. The codes live only in the database,
-- never in this repository, which may be public: they are created from the
-- Supabase SQL editor with create_bonus_code, and no client can read them.

insert into public.game_config (key, value, description) values
  ('bonus_codes.max_failed_attempts_per_hour', '10', 'Unknown codes a player can try per hour');

alter table public.coin_ledger drop constraint coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in (
  'pack_purchase', 'match_reward', 'bot_match_reward', 'duplicate_conversion', 'conquest_bonus', 'level_reward',
  'emergency_reward', 'bonus_code', 'admin_adjustment'
));

alter table public.card_instances drop constraint card_instances_acquired_via_check;
alter table public.card_instances add constraint card_instances_acquired_via_check
  check (acquired_via in ('starter', 'pack', 'conquest', 'trade', 'level_unlock', 'bonus_code'));

alter table public.card_transfers drop constraint card_transfers_reason_check;
alter table public.card_transfers add constraint card_transfers_reason_check
  check (reason in ('starter', 'pack', 'conquest', 'trade', 'conversion', 'level_unlock', 'bonus_code'));

alter table public.pack_openings drop constraint pack_openings_pack_type_check;
alter table public.pack_openings add constraint pack_openings_pack_type_check
  check (pack_type in ('daily', 'standard', 'bonus'));

create table public.bonus_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{3,32}$'),
  coins integer not null default 0 check (coins >= 0),
  packs integer not null default 0 check (packs >= 0),
  -- One entry per copy: the same character twice gives two cards.
  card_definition_ids uuid[] not null default '{}',
  -- Null: no limit on the number of players.
  max_uses integer check (max_uses > 0),
  -- Null: never expires.
  expires_at timestamptz,
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  constraint bonus_codes_has_reward check (coins > 0 or packs > 0 or cardinality(card_definition_ids) > 0)
);

create table public.bonus_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.bonus_codes (id),
  user_id uuid not null references public.profiles (id) on delete cascade,
  opening_ids uuid[] not null default '{}',
  redeemed_at timestamptz not null default now(),
  -- One redemption per player per code.
  unique (code_id, user_id)
);
create index bonus_code_redemptions_user_id_idx on public.bonus_code_redemptions (user_id);

create table public.bonus_code_failed_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index bonus_code_failed_attempts_user_idx on public.bonus_code_failed_attempts (user_id, attempted_at);

-- No policies: only the functions below touch these tables.
alter table public.bonus_codes enable row level security;
alter table public.bonus_code_redemptions enable row level security;
alter table public.bonus_code_failed_attempts enable row level security;
revoke all on table public.bonus_codes from anon, authenticated;
revoke all on table public.bonus_code_redemptions from anon, authenticated;
revoke all on table public.bonus_code_failed_attempts from anon, authenticated;

-- Creates a code. Run it from the Supabase SQL editor, e.g.:
--   select public.create_bonus_code('NATALE26', p_coins => 100, p_packs => 1,
--     p_card_codes => array['P002'], p_max_uses => 50,
--     p_expires_at => '2026-12-31 23:59 Europe/Rome');
create function public.create_bonus_code(
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
  v_definition uuid;
  v_definitions uuid[] := '{}';
  v_id uuid;
begin
  foreach v_card_code in array p_card_codes loop
    -- Level cards are earned by levelling up, and variants are found only in packs.
    select d.id into v_definition
    from public.card_definitions d
    where d.code = v_card_code and d.is_active and d.unlock_level is null;
    if not found then
      raise exception 'card % does not exist or cannot be given by a code', v_card_code;
    end if;
    v_definitions := v_definitions || v_definition;
  end loop;

  insert into public.bonus_codes (code, coins, packs, card_definition_ids, max_uses, expires_at, note)
  values (upper(trim(p_code)), p_coins, p_packs, v_definitions, p_max_uses, p_expires_at, p_note)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.create_bonus_code(text, integer, integer, text[], integer, timestamptz, text)
  from public, anon, authenticated;

-- Gives the player the rewards of a code. Unknown codes count as failed attempts:
-- they answer with a payload instead of raising, or the rollback would erase the count.
create function public.redeem_bonus_code(p_code text)
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
  foreach v_definition in array v_code.card_definition_ids loop
    insert into public.card_instances (definition_id, owner_id, acquired_via)
    values (v_definition, v_uid, 'bonus_code')
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

revoke execute on function public.redeem_bonus_code(text) from public, anon;
grant execute on function public.redeem_bonus_code(text) to authenticated;
