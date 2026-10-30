-- Four Delta characters from the starter pool get their identity and art
-- (docs/WORLD.md), so art can be checked on cards every player can own.
-- Stats do not change.

update public.card_definitions set
  name = 'Gru',
  flavor = 'Al porto, quando la gru si rompe, si chiama Gru.',
  art_url = '/cards/P001.webp'
where code = 'P001';

update public.card_definitions set
  name = 'Sibilla',
  flavor = 'Ti legge il futuro per due monete. Per il presente, arrangiati.',
  art_url = '/cards/P004.webp'
where code = 'P004';

update public.card_definitions set
  name = 'Il Vigile',
  flavor = 'Nessun Segno, nessun superpotere. Solo il turno di notte.',
  art_url = '/cards/P009.webp'
where code = 'P009';

update public.card_definitions set
  name = 'Lanterna',
  flavor = 'Quando nel quartiere va via la luce, qualcuno bussa alla tua porta.',
  art_url = '/cards/P012.webp'
where code = 'P012';
