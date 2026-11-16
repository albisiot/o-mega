-- Test for 20261116220000_power_text_wording.sql: the three texts that read awkwardly,
-- and the others as before. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

do $$
begin
  -- power_text writes the last round as 5: a match must still have 5 rounds.
  assert public.config_int('match.threats_per_match') = 5, 'a match has another number of rounds: update power_text';

  assert public.power_text('opener', '{"bonus": 4, "max_round": 1}') = '+4 se giocato nel round 1', 'Apripista round 1';
  assert public.power_text('opener', '{"bonus": 3, "max_round": 2}') = '+3 se giocato entro il round 2', 'Apripista as before';
  assert public.power_text('last_stand', '{"bonus": 3, "min_round": 5}') = '+3 se giocato nel round 5', 'Ultimo baluardo round 5';
  assert public.power_text('last_stand', '{"bonus": 3, "min_round": 4}') = '+3 se giocato dal round 4 in poi', 'Ultimo baluardo as before';
  assert public.power_text('level_bonus', '{"bonus": 3, "min_level": 1, "max_level": 1}') = '+3 contro Minacce di livello 1',
    'Terreno favorevole one level';
  assert public.power_text('level_bonus', '{"bonus": 2, "min_level": 1, "max_level": 2}') = '+2 contro Minacce di livello da 1 a 2',
    'Terreno favorevole as before';
  assert public.power_text('ability_bonus', '{"ability": "ENE", "bonus": 3}') = '+3 contro Minacce che richiedono Energia',
    'abilities still get their names';

  -- The cards that had them.
  assert (select public.power_text(power_code, power_params) from public.card_definitions where code = 'P129')
    = '+5 se giocato nel round 1', 'Bubalus';
  assert (select public.power_text(power_code, power_params) from public.card_definitions where code = 'P025')
    = '+3 se giocato nel round 5', 'Bulwark';
  assert (select public.power_text(power_code, power_params) from public.card_definitions where code = 'P043')
    = '+3 contro Minacce di livello 1', 'Fathom';
end $$;

-- Players still read the texts.
set local role anon;
do $$
begin
  assert public.power_text('opener', '{"bonus": 4, "max_round": 1}') = '+4 se giocato nel round 1', 'anon reads the text';
end $$;

rollback;
