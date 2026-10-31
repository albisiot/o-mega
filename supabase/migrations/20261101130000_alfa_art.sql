-- The six Alfa characters get their name, flavor text and art (docs/WORLD.md).
-- Stats and powers do not change.

update public.card_definitions set
  name = 'Vetrix',
  flavor = 'Quando si rompe, i pezzi continuano a colpire.',
  art_url = '/cards/P051.webp'
where code = 'P051';

update public.card_definitions set
  name = 'Dr. Volta',
  flavor = 'Ha costruito la centrale. Ora vende il resto al miglior offerente.',
  art_url = '/cards/P052.webp'
where code = 'P052';

update public.card_definitions set
  name = 'Yuki Ombra',
  flavor = 'Hai visto chi è stato? Appunto.',
  art_url = '/cards/P053.webp'
where code = 'P053';

update public.card_definitions set
  name = 'Vera Kross',
  flavor = 'L''hai fermata tre volte. Questa è la quarta.',
  art_url = '/cards/P054.webp'
where code = 'P054';

update public.card_definitions set
  name = 'Don Atlas',
  flavor = 'Da qui non si passa. E nemmeno lui.',
  art_url = '/cards/P055.webp'
where code = 'P055';

update public.card_definitions set
  name = 'Mekana',
  flavor = 'Mezza macchina, mezzo incantesimo. La fattura è intera.',
  art_url = '/cards/P056.webp'
where code = 'P056';
