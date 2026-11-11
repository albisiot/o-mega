-- One artwork variant for each of the forty-five compendium characters added
-- in 20261111210000 (P143-P187). Each uses an existing style, drawn the way the
-- style is made but with its own colours, so the series do not all share one
-- tone. With these, every character that packs can give has a variant again;
-- level cards still have none (SPEC §4.6).

insert into public.card_variants (definition_id, style, style_name, art_url)
select d.id, s.style, s.style_name, '/cards/variants/' || d.code || '-' || s.style || '.webp'
from (values
  ('P143', 'comet', 'Cometa'),
  ('P144', 'circuit', 'Circuito'),
  ('P145', 'watercolor', 'Acquerello'),
  ('P146', 'retro', 'Retrò'),
  ('P147', 'poster', 'Poster'),
  ('P148', 'portrait', 'Ritratto'),
  ('P149', 'etching', 'Incisione'),
  ('P150', 'classic', 'Classico'),
  ('P151', 'ink', 'Inchiostro'),
  ('P152', 'oil', 'Olio'),
  ('P153', 'cartoon', 'Animato'),
  ('P154', 'tarot', 'Tarocco'),
  ('P155', 'pastel', 'Pastello'),
  ('P156', 'marble', 'Marmo'),
  ('P157', 'fantasy', 'Fantasy'),
  ('P158', 'tempera', 'Tempera'),
  ('P159', 'neon', 'Neon'),
  ('P160', 'gothic', 'Gotico'),
  ('P161', 'crimson', 'Cremisi'),
  ('P162', 'phoenix', 'Fenice'),
  ('P163', 'stained', 'Vetrata'),
  ('P164', 'wraith', 'Spettro'),
  ('P165', 'prism', 'Prisma'),
  ('P166', 'epic', 'Epica'),
  ('P167', 'graphite', 'Grafite'),
  ('P168', 'manga', 'Manga'),
  ('P169', 'shadow', 'Ombra'),
  ('P170', 'cinema', 'Cinema'),
  ('P171', 'gold', 'Oro'),
  ('P172', 'render', '3D'),
  ('P173', 'flame', 'Fiamma'),
  ('P174', 'inferno', 'Inferno'),
  ('P175', 'regal', 'Regale'),
  ('P176', 'gothic', 'Gotico'),
  ('P177', 'zombie', 'Zombie'),
  ('P178', 'circuit', 'Circuito'),
  ('P179', 'retro', 'Retrò'),
  ('P180', 'tarot', 'Tarocco'),
  ('P181', 'marble', 'Marmo'),
  ('P182', 'watercolor', 'Acquerello'),
  ('P183', 'ink', 'Inchiostro'),
  ('P184', 'etching', 'Incisione'),
  ('P185', 'stained', 'Vetrata'),
  ('P186', 'crimson', 'Cremisi'),
  ('P187', 'fantasy', 'Fantasy')
) as s(code, style, style_name)
join public.card_definitions d on d.code = s.code;
