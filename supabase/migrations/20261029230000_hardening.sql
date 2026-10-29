-- M1 · Fixes from the Supabase advisors.

-- rls_auto_enable() backs the "automatic RLS" event trigger that Supabase adds
-- when the option is chosen at project creation. It cannot run as an RPC, but
-- nobody needs EXECUTE on it: event triggers do not check that privilege.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

-- Covering indexes for catalog foreign keys.
create index card_definitions_rarity_code_idx on public.card_definitions (rarity_code);
create index ability_definitions_family_idx on public.ability_definitions (family);
