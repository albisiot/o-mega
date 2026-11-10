-- Integration test for character profiles: every character has a real name, a
-- powers text and exactly one trait per category; players read them but cannot
-- write them; card_matches_traits filters as events will need it. Runs inside a
-- transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

-- Catalog content (runs as the migration owner).
do $$
begin
  assert not exists (
    select 1 from public.card_definitions
    where is_active and (coalesce(btrim(real_name), '') = '' or coalesce(btrim(powers_text), '') = '')
  ), 'an active character has no real name or no powers text';

  assert (select count(*) from public.trait_categories) = 3, 'expected 3 trait categories';

  -- Exactly one trait per category for every card.
  assert not exists (
    select 1
    from public.card_definitions d
    cross join public.trait_categories c
    where (
      select count(*) from public.card_definition_traits held
      join public.traits t on t.code = held.trait_code
      where held.definition_id = d.id and t.category_code = c.code
    ) <> 1
  ), 'a card does not have exactly one trait per category';

  -- Every trait is held by someone: no empty values in the catalog.
  assert not exists (
    select 1 from public.traits t
    where not exists (select 1 from public.card_definition_traits held where held.trait_code = t.code)
  ), 'a trait is held by no character';

  -- Talos (P091): Mito, Macchina, Custodi.
  assert (
    select array_agg(held.trait_code order by held.trait_code)
    from public.card_definition_traits held
    join public.card_definitions d on d.id = held.definition_id
    where d.code = 'P091'
  ) = array['group.custodi', 'nature.macchina', 'origin.mito'], 'unexpected traits for P091';
end $$;

-- Players read profiles and traits, and the filter.
set local role authenticated;

do $$
declare
  v_talos uuid := (select id from public.card_definitions where code = 'P091');
begin
  assert (select real_name from public.card_definitions where code = 'P091') = 'Talos, l''automa di bronzo',
    'a player cannot read the real name';
  assert (select count(*) from public.card_definition_traits where definition_id = v_talos) = 3,
    'a player cannot read the traits of a card';
  assert (select count(*) from public.traits) = 17, 'a player cannot read the trait catalog';

  -- Within a category any listed trait is enough; every category listed must match.
  assert public.card_matches_traits(v_talos, array['origin.mito', 'origin.strappo']), 'Mito or Strappo should match';
  assert public.card_matches_traits(v_talos, array['origin.mito', 'group.custodi']), 'Mito and Custodi should match';
  assert not public.card_matches_traits(v_talos, array['origin.mito', 'group.figli']), 'Figli should not match';
  assert not public.card_matches_traits(v_talos, array['nature.umano']), 'Umano should not match';
  assert public.card_matches_traits(v_talos, array[]::text[]), 'no traits should admit every card';

  begin
    perform public.card_matches_traits(v_talos, array['origin.sbagliato']);
    raise exception 'unknown trait accepted';
  exception when invalid_parameter_value then
    null;
  end;

  -- Writes are closed to players.
  begin
    insert into public.card_definition_traits (definition_id, trait_code) values (v_talos, 'group.figli');
    raise exception 'a player added a trait';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.card_definitions set real_name = 'X' where code = 'P091';
    raise exception 'a player changed a real name';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;

rollback;
