-- The ten Beta characters get their name, flavor text and art (docs/WORLD.md).
-- Stats and powers do not change.

update public.card_definitions set
  name = 'Otto Kaiser',
  flavor = 'Non ci vede quasi. Ti trova lo stesso, e ti presenta il conto.',
  art_url = '/cards/P041.webp'
where code = 'P041';

update public.card_definitions set
  name = 'Rico Turbo',
  flavor = 'Consegna tutto in dieci minuti. Non chiedergli cosa.',
  art_url = '/cards/P042.webp'
where code = 'P042';

update public.card_definitions set
  name = 'Zoe Sonar',
  flavor = 'Sente cosa pensi prima di te. Capirlo è un altro discorso.',
  art_url = '/cards/P043.webp'
where code = 'P043';

update public.card_definitions set
  name = 'Igor Fiamma',
  flavor = 'Ha acceso il primo fuoco per sbaglio. Gli altri no.',
  art_url = '/cards/P044.webp'
where code = 'P044';

update public.card_definitions set
  name = 'Bull Rossi',
  flavor = 'Apre le porte senza sapere che esistono le maniglie.',
  art_url = '/cards/P045.webp'
where code = 'P045';

update public.card_definitions set
  name = 'Lola Jet',
  flavor = 'Ti ruba l''orologio e ti dice che ora è.',
  art_url = '/cards/P046.webp'
where code = 'P046';

update public.card_definitions set
  name = 'Ada Kode',
  flavor = 'Per il Banco non esistono segreti. Solo voci di bilancio.',
  art_url = '/cards/P047.webp'
where code = 'P047';

update public.card_definitions set
  name = 'Dante Nox',
  flavor = 'Cieco come una talpa. Gli incantesimi, però, vedono per lui.',
  art_url = '/cards/P048.webp'
where code = 'P048';

update public.card_definitions set
  name = 'Ivan Nucleo',
  flavor = 'Lo senti arrivare dal contatore Geiger.',
  art_url = '/cards/P049.webp'
where code = 'P049';

update public.card_definitions set
  name = 'Sofia Zen',
  flavor = 'Non alza mai la voce. Ti arrendi e la ringrazi pure.',
  art_url = '/cards/P050.webp'
where code = 'P050';
