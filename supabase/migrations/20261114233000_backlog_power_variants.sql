-- One artwork variant for each of the fourteen backlog power characters added in
-- 20261114230000 (P218-P231). Each uses an existing style, drawn the way the style
-- is made but with its own colours, so the series do not all share one tone; the
-- styles are the ones with the fewest variants, none repeated. With these, every
-- character that packs can give has at least one variant; level cards still have
-- none (SPEC §4.6).

insert into public.card_variants (definition_id, style, style_name, art_url)
select d.id, s.style, s.style_name, '/cards/variants/' || d.code || '-' || s.style || '.webp'
from (values
  ('P218', 'flame', 'Fiamma'),
  ('P219', 'portrait', 'Ritratto'),
  ('P220', 'gold', 'Oro'),
  ('P221', 'shadow', 'Ombra'),
  ('P222', 'cartoon', 'Animato'),
  ('P223', 'wraith', 'Spettro'),
  ('P224', 'phoenix', 'Fenice'),
  ('P225', 'prism', 'Prisma'),
  ('P226', 'gothic', 'Gotico'),
  ('P227', 'zombie', 'Zombie'),
  ('P228', 'comet', 'Cometa'),
  ('P229', 'poster', 'Poster'),
  ('P230', 'oil', 'Olio'),
  ('P231', 'tempera', 'Tempera')
) as s(code, style, style_name)
join public.card_definitions d on d.code = s.code;
