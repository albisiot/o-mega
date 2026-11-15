-- Test for 20261115110000_sacrifice_lasting_bonus.sql: Sacrificio's lasting bonus on
-- Residuo, its text, and the play parts with and without the `sacrifice` part. Runs inside
-- a rolled-back transaction:
--   npm run test:db

begin;

do $$
begin
  assert (select power_params from public.card_definitions where code = 'P227') = '{"bonus": 3}'::jsonb,
    'Residuo gives +3 to the end of the match';
  assert public.power_text('sacrifice', '{"bonus": 3}')
    = 'Il suo punteggio conta 0; da quel momento ogni tuo personaggio ottiene +3 fino a fine partita', 'Sacrificio text';
  -- The engine now sends six parts; plays stored before have five: both are valid.
  assert public.play_parts_valid('{"power": 0, "carried": 0, "pack": 1, "sacrifice": 3, "modifier": 0, "floor": 0}', 4),
    'six parts with Sacrificio';
  assert public.play_parts_valid('{"power": 3, "carried": 2, "pack": 0, "modifier": -2, "floor": 0}', 3), 'five parts as before';
  assert not public.play_parts_valid('{"power": 0, "carried": 0, "pack": 1, "sacrifice": 3, "modifier": 0, "floor": 0}', 1),
    'a sum that is not the bonus';
  assert not public.play_parts_valid('{"power": 0, "carried": 0, "pack": 0, "sacrifice": 3, "modifier": 0}', 3),
    'a missing part';
end $$;

rollback;
