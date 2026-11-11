-- One artwork variant for each of the ten compendium characters added in
-- 20261111190000 (P133-P142). Each uses an existing style, drawn the way the
-- style is made but with its own colours, so the series do not all share one
-- tone. With these, every character that packs can give has a variant; level
-- cards still have none (SPEC §4.6).

insert into public.card_variants (definition_id, style, style_name, art_url)
select d.id, s.style, s.style_name, '/cards/variants/' || d.code || '-' || s.style || '.webp'
from (values
  ('P133', 'stained', 'Vetrata'),
  ('P134', 'etching', 'Incisione'),
  ('P135', 'tempera', 'Tempera'),
  ('P136', 'portrait', 'Ritratto'),
  ('P137', 'phoenix', 'Fenice'),
  ('P138', 'manga', 'Manga'),
  ('P139', 'shadow', 'Ombra'),
  ('P140', 'flame', 'Fiamma'),
  ('P141', 'regal', 'Regale'),
  ('P142', 'wraith', 'Spettro')
) as s(code, style, style_name)
join public.card_definitions d on d.code = s.code;
