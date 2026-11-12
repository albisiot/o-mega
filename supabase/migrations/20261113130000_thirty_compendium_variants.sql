-- One artwork variant for each of the thirty compendium characters added in
-- 20261113120000 (P188-P217). Each uses an existing style, drawn the way the
-- style is made but with its own colours, so the series do not all share one
-- tone. Every character that packs can give keeps at least one variant; level
-- cards still have none (SPEC §4.6).

insert into public.card_variants (definition_id, style, style_name, art_url)
select d.id, s.style, s.style_name, '/cards/variants/' || d.code || '-' || s.style || '.webp'
from (values
  ('P188', 'etching', 'Incisione'),
  ('P189', 'stained', 'Vetrata'),
  ('P190', 'tempera', 'Tempera'),
  ('P191', 'cartoon', 'Animato'),
  ('P192', 'ink', 'Inchiostro'),
  ('P193', 'portrait', 'Ritratto'),
  ('P194', 'classic', 'Classico'),
  ('P195', 'crimson', 'Cremisi'),
  ('P196', 'oil', 'Olio'),
  ('P197', 'graphite', 'Grafite'),
  ('P198', 'phoenix', 'Fenice'),
  ('P199', 'pastel', 'Pastello'),
  ('P200', 'marble', 'Marmo'),
  ('P201', 'retro', 'Retrò'),
  ('P202', 'render', '3D'),
  ('P203', 'gold', 'Oro'),
  ('P204', 'watercolor', 'Acquerello'),
  ('P205', 'wraith', 'Spettro'),
  ('P206', 'cinema', 'Cinema'),
  ('P207', 'inferno', 'Inferno'),
  ('P208', 'manga', 'Manga'),
  ('P209', 'tarot', 'Tarocco'),
  ('P210', 'shadow', 'Ombra'),
  ('P211', 'fantasy', 'Fantasy'),
  ('P212', 'prism', 'Prisma'),
  ('P213', 'circuit', 'Circuito'),
  ('P214', 'regal', 'Regale'),
  ('P215', 'neon', 'Neon'),
  ('P216', 'etching', 'Incisione'),
  ('P217', 'comet', 'Cometa')
) as s(code, style, style_name)
join public.card_definitions d on d.code = s.code;
