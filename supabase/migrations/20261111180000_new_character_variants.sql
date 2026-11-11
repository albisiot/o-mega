-- One artwork variant for each of the ten characters added in
-- 20261111170000 (P123-P132), each in the existing style closest to the image
-- the character started from. With a first variant these cards can come out
-- of packs with a special drawing, at the usual chance per drawn card.

insert into public.card_variants (definition_id, style, style_name, art_url)
select d.id, s.style, s.style_name, '/cards/variants/' || d.code || '-' || s.style || '.webp'
from (values
  ('P123', 'cinema', 'Cinema'),
  ('P124', 'classic', 'Classico'),
  ('P125', 'watercolor', 'Acquerello'),
  ('P126', 'poster', 'Poster'),
  ('P127', 'graphite', 'Grafite'),
  ('P128', 'pastel', 'Pastello'),
  ('P129', 'circuit', 'Circuito'),
  ('P130', 'neon', 'Neon'),
  ('P131', 'crimson', 'Cremisi'),
  ('P132', 'tarot', 'Tarocco')
) as s(code, style, style_name)
join public.card_definitions d on d.code = s.code;
