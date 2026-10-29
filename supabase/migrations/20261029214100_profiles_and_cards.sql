-- M1 · Player profiles, owned card instances and the card transfer ledger.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created by bootstrap_player().
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  avatar_url text,
  level integer not null default 1 check (level >= 1),
  xp integer not null default 0 check (xp >= 0),
  matches_played integer not null default 0 check (matches_played >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  draws integer not null default 0 check (draws >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  cards_conquered integer not null default 0 check (cards_conquered >= 0),
  cards_lost integer not null default 0 check (cards_lost >= 0),
  conquest_unlocked boolean not null default false,
  starter_granted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Keep in sync with USERNAME_PATTERN in src/lib/username.ts.
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,20}$')
);

-- Usernames are unique regardless of case.
create unique index profiles_username_lower_key on public.profiles (lower(username));

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
create policy "players read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- card_instances: every owned copy is a row with its own id (never counters).
-- ---------------------------------------------------------------------------

create table public.card_instances (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.card_definitions (id),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  acquired_at timestamptz not null default now(),
  acquired_via text not null check (acquired_via in ('starter', 'pack', 'conquest', 'trade')),
  -- Starter cards are bound to the account and can never be conquered.
  is_starter boolean not null default false,
  -- Recently conquered cards cannot be fielded in Conquest or traded until then.
  locked_until timestamptz
);

create index card_instances_owner_id_idx on public.card_instances (owner_id);
create index card_instances_definition_id_idx on public.card_instances (definition_id);

alter table public.card_instances enable row level security;
revoke all on table public.card_instances from anon, authenticated;
grant select on table public.card_instances to authenticated;
create policy "players read their own cards"
  on public.card_instances for select to authenticated
  using ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------------------------
-- card_transfers: ledger of every change of ownership, including grants
-- (from_user is null) so ownership can always be rebuilt from the ledger.
-- ---------------------------------------------------------------------------

create table public.card_transfers (
  id bigint generated always as identity primary key,
  instance_id uuid not null references public.card_instances (id) on delete cascade,
  from_user uuid references public.profiles (id) on delete set null,
  to_user uuid references public.profiles (id) on delete set null,
  reason text not null check (reason in ('starter', 'pack', 'conquest', 'trade', 'conversion')),
  -- Foreign key to matches is added when the matches table exists (M6).
  match_id uuid,
  created_at timestamptz not null default now()
);

create index card_transfers_instance_id_idx on public.card_transfers (instance_id);
create index card_transfers_from_user_idx on public.card_transfers (from_user);
create index card_transfers_to_user_idx on public.card_transfers (to_user);

alter table public.card_transfers enable row level security;
revoke all on table public.card_transfers from anon, authenticated;
grant select on table public.card_transfers to authenticated;
create policy "players read transfers they are part of"
  on public.card_transfers for select to authenticated
  using ((select auth.uid()) in (from_user, to_user));
