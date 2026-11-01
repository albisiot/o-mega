-- Managing bonus codes from the app (SPEC §8.1). Admins are listed in a table no
-- client can touch, and every function checks it: hiding the page is only cosmetic.

create table public.admin_users (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- No policies: only the functions below read this table.
alter table public.admin_users enable row level security;
revoke all on table public.admin_users from anon, authenticated;

-- The account already exists: a later signup with this address could not become admin.
insert into public.admin_users (user_id)
select u.id from auth.users u where lower(u.email) = 'albividal2@gmail.com';

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users a where a.user_id = auth.uid())
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Every code with its use count, and the cards a code can give.
create function public.admin_bonus_codes_payload()
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
          select coalesce(jsonb_agg(d.name order by u.ord), '[]'::jsonb)
          from unnest(c.card_definition_ids) with ordinality as u(id, ord)
          join public.card_definitions d on d.id = u.id
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
      select coalesce(jsonb_agg(jsonb_build_object('code', d.code, 'name', d.name, 'rarity', r.name) order by d.name), '[]'::jsonb)
      from public.card_definitions d
      join public.rarity_definitions r on r.code = d.rarity_code
      where d.is_active and d.unlock_level is null
    )
  )
$$;

revoke execute on function public.admin_bonus_codes_payload() from public, anon, authenticated;

create function public.admin_list_bonus_codes()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return public.admin_bonus_codes_payload();
end;
$$;

revoke execute on function public.admin_list_bonus_codes() from public, anon;
grant execute on function public.admin_list_bonus_codes() to authenticated;

-- p_expires_on: the last valid day, up to midnight Europe/Rome.
create function public.admin_create_bonus_code(
  p_code text,
  p_coins integer default 0,
  p_packs integer default 0,
  p_card_codes text[] default '{}',
  p_max_uses integer default null,
  p_expires_on date default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if v_code !~ '^[A-Z0-9_-]{3,32}$' then
    raise exception 'bonus_code_invalid_format';
  end if;
  if p_coins < 0 or p_packs < 0 or p_max_uses < 1 then
    raise exception 'bonus_code_invalid_limits';
  end if;
  if p_coins = 0 and p_packs = 0 and cardinality(p_card_codes) = 0 then
    raise exception 'bonus_code_no_reward';
  end if;
  if p_expires_on < public.game_day() then
    raise exception 'bonus_code_invalid_expiry';
  end if;

  begin
    perform public.create_bonus_code(
      v_code, p_coins, p_packs, p_card_codes, p_max_uses,
      (p_expires_on + 1)::timestamp at time zone 'Europe/Rome',
      nullif(trim(p_note), '')
    );
  exception
    when unique_violation then
      raise exception 'bonus_code_duplicate';
    when raise_exception then
      raise exception 'bonus_code_card_unavailable';
  end;

  return public.admin_bonus_codes_payload();
end;
$$;

revoke execute on function public.admin_create_bonus_code(text, integer, integer, text[], integer, date, text) from public, anon;
grant execute on function public.admin_create_bonus_code(text, integer, integer, text[], integer, date, text) to authenticated;

create function public.admin_set_bonus_code_active(p_id uuid, p_is_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  update public.bonus_codes set is_active = p_is_active where id = p_id;
  return public.admin_bonus_codes_payload();
end;
$$;

revoke execute on function public.admin_set_bonus_code_active(uuid, boolean) from public, anon;
grant execute on function public.admin_set_bonus_code_active(uuid, boolean) to authenticated;
