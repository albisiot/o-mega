-- Six new artwork variant styles, five characters each: Cometa, Regale, 3D,
-- Fenice, Manga and Vetrata. All thirty characters had a single variant in
-- another style; when a drawn card has several, the server picks one at
-- random (draw_variant), so the chance per drawn card stays the same.

insert into public.card_variants (definition_id, style, style_name, art_url)
select d.id, s.style, s.style_name, '/cards/variants/' || d.code || '-' || s.style || '.webp'
from (values
  ('P069', 'comet', 'Cometa'), ('P071', 'comet', 'Cometa'), ('P062', 'comet', 'Cometa'),
  ('P070', 'comet', 'Cometa'), ('P099', 'comet', 'Cometa'),
  ('P080', 'regal', 'Regale'), ('P104', 'regal', 'Regale'), ('P032', 'regal', 'Regale'),
  ('P103', 'regal', 'Regale'), ('P111', 'regal', 'Regale'),
  ('P040', 'render', '3D'), ('P087', 'render', '3D'), ('P024', 'render', '3D'),
  ('P017', 'render', '3D'), ('P094', 'render', '3D'),
  ('P060', 'phoenix', 'Fenice'), ('P075', 'phoenix', 'Fenice'), ('P025', 'phoenix', 'Fenice'),
  ('P035', 'phoenix', 'Fenice'), ('P013', 'phoenix', 'Fenice'),
  ('P028', 'manga', 'Manga'), ('P053', 'manga', 'Manga'), ('P016', 'manga', 'Manga'),
  ('P006', 'manga', 'Manga'), ('P043', 'manga', 'Manga'),
  ('P101', 'stained', 'Vetrata'), ('P039', 'stained', 'Vetrata'), ('P041', 'stained', 'Vetrata'),
  ('P012', 'stained', 'Vetrata'), ('P055', 'stained', 'Vetrata')
) as s(code, style, style_name)
join public.card_definitions d on d.code = s.code;
