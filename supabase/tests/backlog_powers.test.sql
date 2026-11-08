-- The backlog powers (docs/POWERS-BACKLOG.md): defined, with their texts, and on
-- no card yet. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

do $$
begin
  assert (select count(*) from public.power_definitions where code in (
    'scrappy', 'counterpunch', 'eclectic', 'lone_wolf', 'opportunist', 'reflect', 'vendetta',
    'main_event', 'adaptable', 'sacrifice', 'pack_leader', 'echo', 'catalyst', 'fog')) = 14, 'fourteen backlog powers';
  assert (select count(*) from public.power_definitions
    where code in ('sacrifice', 'pack_leader', 'echo', 'catalyst', 'fog') and tier = 'distinctive') = 5,
    'five distinctive backlog powers';
  assert not exists (
    select 1 from public.card_definitions
    where power_code in ('scrappy', 'counterpunch', 'eclectic', 'lone_wolf', 'opportunist', 'reflect', 'vendetta',
      'main_event', 'adaptable', 'sacrifice', 'pack_leader', 'echo', 'catalyst', 'fog')
  ), 'no card has a backlog power yet';
  assert public.power_text('scrappy', '{"min_value": 3}')
    = 'Le abilità richieste che valgono meno di 3 contano 3', 'Arte di arrangiarsi text';
  assert public.power_text('counterpunch', '{"bonus": 1, "max": 3}')
    = '+1 per ogni abilità richiesta in cui il personaggio avversario lo supera, fino a +3', 'Contrattacco text';
  assert public.power_text('catalyst', '{"multiplier": 2}')
    = 'Il tuo prossimo personaggio moltiplica per 2 il bonus del suo potere', 'Catalizzatore text';
  assert public.power_text('fog', '{}') = 'L''avversario non vede chi hai giocato fino a fine partita', 'Nebbia text';
end $$;

rollback;
