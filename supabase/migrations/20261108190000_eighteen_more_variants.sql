-- One more artwork variant for each of the 18 styles, on characters that
-- already have a variant in another style: the only characters without one
-- are unlocked at a level and never come from packs. When a drawn card has
-- several variants the server picks one at random (draw_variant), so the
-- chance per drawn card stays the same. Same rules as the earlier series.

insert into public.card_variants (definition_id, style, style_name, art_url)
select d.id, s.style, s.style_name, '/cards/variants/' || d.code || '-' || s.style || '.webp'
from (values
  ('P033', 'neon', 'Neon'),
  ('P102', 'epic', 'Epica'),
  ('P009', 'cinema', 'Cinema'),
  ('P034', 'pastel', 'Pastello'),
  ('P091', 'gold', 'Oro'),
  ('P001', 'classic', 'Classico'),
  ('P046', 'retro', 'Retrò'),
  ('P079', 'oil', 'Olio'),
  ('P093', 'cartoon', 'Animato'),
  ('P097', 'poster', 'Poster'),
  ('P044', 'inferno', 'Inferno'),
  ('P058', 'graphite', 'Grafite'),
  ('P112', 'marble', 'Marmo'),
  ('P090', 'gothic', 'Gotico'),
  ('P004', 'tarot', 'Tarocco'),
  ('P048', 'ink', 'Inchiostro'),
  ('P089', 'fantasy', 'Fantasy'),
  ('P059', 'prism', 'Prisma')
) as s(code, style, style_name)
join public.card_definitions d on d.code = s.code;
