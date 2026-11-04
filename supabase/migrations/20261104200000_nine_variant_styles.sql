-- Nine more series of artwork variants, five characters each, so that every
-- character found in packs now has at least one. With that many, the chance
-- of a variant per drawn card goes from 10% to 5%, which keeps about one pack
-- in four with a variant, as before. Same rules as the earlier series.

update public.game_config set value = '5' where key = 'packs.variant_chance_percent';

insert into public.card_variants (definition_id, style, style_name, art_url)
select d.id, s.style, s.style_name, '/cards/variants/' || d.code || '-' || s.style || '.webp'
from (values
  ('P025', 'poster', 'Poster'), ('P020', 'poster', 'Poster'), ('P015', 'poster', 'Poster'),
  ('P110', 'poster', 'Poster'), ('P050', 'poster', 'Poster'),
  ('P023', 'inferno', 'Inferno'), ('P049', 'inferno', 'Inferno'), ('P065', 'inferno', 'Inferno'),
  ('P024', 'inferno', 'Inferno'), ('P039', 'inferno', 'Inferno'),
  ('P067', 'graphite', 'Grafite'), ('P084', 'graphite', 'Grafite'), ('P081', 'graphite', 'Grafite'),
  ('P096', 'graphite', 'Grafite'), ('P011', 'graphite', 'Grafite'),
  ('P035', 'marble', 'Marmo'), ('P051', 'marble', 'Marmo'), ('P030', 'marble', 'Marmo'),
  ('P063', 'marble', 'Marmo'), ('P083', 'marble', 'Marmo'),
  ('P086', 'gothic', 'Gotico'), ('P041', 'gothic', 'Gotico'), ('P021', 'gothic', 'Gotico'),
  ('P002', 'gothic', 'Gotico'), ('P037', 'gothic', 'Gotico'),
  ('P111', 'tarot', 'Tarocco'), ('P010', 'tarot', 'Tarocco'), ('P052', 'tarot', 'Tarocco'),
  ('P047', 'tarot', 'Tarocco'), ('P017', 'tarot', 'Tarocco'),
  ('P014', 'ink', 'Inchiostro'), ('P008', 'ink', 'Inchiostro'), ('P009', 'ink', 'Inchiostro'),
  ('P082', 'ink', 'Inchiostro'), ('P003', 'ink', 'Inchiostro'),
  ('P022', 'fantasy', 'Fantasy'), ('P112', 'fantasy', 'Fantasy'), ('P038', 'fantasy', 'Fantasy'),
  ('P073', 'fantasy', 'Fantasy'), ('P042', 'fantasy', 'Fantasy'),
  ('P018', 'prism', 'Prisma'), ('P040', 'prism', 'Prisma'), ('P099', 'prism', 'Prisma'),
  ('P100', 'prism', 'Prisma'), ('P105', 'prism', 'Prisma')
) as s(code, style, style_name)
join public.card_definitions d on d.code = s.code;
