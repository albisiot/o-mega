-- M1 · Player bootstrap (profile + starter set) and username changes.
-- Error messages raised to clients are stable codes ("username_taken", ...)
-- that the frontend translates into Italian.

-- Turns a display name into a valid username candidate (3-20 chars, A-Z a-z 0-9 _).
create function public.username_base(p_source text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  -- Two-argument form: the one-argument unaccent() resolves its dictionary
  -- through search_path, which is empty here.
  v_name text := extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_source, ''));
begin
  v_name := regexp_replace(btrim(v_name), '\s+', '_', 'g');
  v_name := regexp_replace(v_name, '[^A-Za-z0-9_]', '', 'g');
  v_name := btrim(regexp_replace(v_name, '_{2,}', '_', 'g'), '_');
  v_name := rtrim(left(v_name, 20), '_');
  if length(v_name) < 3 then
    v_name := 'giocatore';
  end if;
  return v_name;
end;
$$;

revoke execute on function public.username_base(text) from public, anon, authenticated;

-- Grants the starter set: distinct characters drawn at random among the
-- allowed rarities. Internal: only called by bootstrap_player().
create function public.grant_starter_set(p_user uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_size integer := public.config_int('conquest.starter_set_size');
  v_max_rank integer := public.config_int('conquest.starter_set_max_rarity_rank');
  v_granted integer;
begin
  with picked as (
    select d.id
    from public.card_definitions d
    join public.rarity_definitions r on r.code = d.rarity_code
    where d.is_active and r.rank <= v_max_rank
    order by random()
    limit v_size
  ), created as (
    insert into public.card_instances (definition_id, owner_id, acquired_via, is_starter)
    select picked.id, p_user, 'starter', true from picked
    returning id
  ), logged as (
    insert into public.card_transfers (instance_id, from_user, to_user, reason)
    select created.id, null, p_user, 'starter' from created
    returning 1
  )
  select count(*) into v_granted from logged;

  if v_granted < v_size then
    raise exception 'starter pool too small: % of % cards available', v_granted, v_size;
  end if;
  return v_granted;
end;
$$;

revoke execute on function public.grant_starter_set(uuid) from public, anon, authenticated;

-- Called by the client after every sign-in. Idempotent: creates the profile on
-- first access and grants the starter set exactly once, atomically.
create function public.bootstrap_player()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_meta jsonb;
  v_email text;
  v_base text;
  v_candidate text;
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = v_uid) then
    select u.raw_user_meta_data, u.email into v_meta, v_email from auth.users u where u.id = v_uid;
    v_base := public.username_base(
      coalesce(v_meta ->> 'full_name', v_meta ->> 'name', split_part(v_email, '@', 1))
    );

    -- Retry with a numeric suffix while the username is taken.
    for attempt in 0..20 loop
      v_candidate := case
        when attempt = 0 then v_base
        else left(v_base, 15) || '_' || (1000 + floor(random() * 9000))::integer
      end;
      begin
        insert into public.profiles (id, username, avatar_url)
        values (v_uid, v_candidate, coalesce(v_meta ->> 'avatar_url', v_meta ->> 'picture'));
        exit;
      exception when unique_violation then
        -- A concurrent call for the same user already created the profile.
        exit when exists (select 1 from public.profiles where id = v_uid);
      end;
    end loop;

    if not exists (select 1 from public.profiles where id = v_uid) then
      raise exception 'username_generation_failed';
    end if;
  end if;

  -- The conditional update locks the row, so concurrent calls grant only once.
  -- If the grant fails, the whole call rolls back and the next sign-in retries.
  update public.profiles
  set starter_granted_at = now(), updated_at = now()
  where id = v_uid and starter_granted_at is null;

  if found then
    perform public.grant_starter_set(v_uid);
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  return v_profile;
end;
$$;

revoke execute on function public.bootstrap_player() from public, anon;
grant execute on function public.bootstrap_player() to authenticated;

-- Changes the caller's username (rules: see profiles_username_format).
create function public.set_username(p_username text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_username text := btrim(coalesce(p_username, ''));
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if v_username !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'username_invalid' using errcode = '22023';
  end if;

  begin
    update public.profiles
    set username = v_username, updated_at = now()
    where id = v_uid
    returning * into v_profile;
  exception when unique_violation then
    raise exception 'username_taken' using errcode = '23505';
  end;

  if v_profile.id is null then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  return v_profile;
end;
$$;

revoke execute on function public.set_username(text) from public, anon;
grant execute on function public.set_username(text) to authenticated;
