-- Four more series of artwork variants, five characters each: a bright
-- classic comic style (Classico), a vintage 1980s cover style (Retrò), an
-- impressionist palette-knife painting (Olio) and a glossy mobile game
-- cartoon (Animato). Same rules as the earlier series.

insert into public.card_variants (definition_id, style, style_name, art_url)
select d.id, s.style, s.style_name, '/cards/variants/' || d.code || '-' || s.style || '.webp'
from (values
  ('P045', 'classic', 'Classico'), ('P019', 'classic', 'Classico'), ('P029', 'classic', 'Classico'),
  ('P007', 'classic', 'Classico'), ('P094', 'classic', 'Classico'),
  ('P059', 'retro', 'Retrò'), ('P054', 'retro', 'Retrò'), ('P056', 'retro', 'Retrò'),
  ('P102', 'retro', 'Retrò'), ('P076', 'retro', 'Retrò'),
  ('P104', 'oil', 'Olio'), ('P092', 'oil', 'Olio'), ('P048', 'oil', 'Olio'),
  ('P113', 'oil', 'Olio'), ('P032', 'oil', 'Olio'),
  ('P034', 'cartoon', 'Animato'), ('P085', 'cartoon', 'Animato'), ('P088', 'cartoon', 'Animato'),
  ('P036', 'cartoon', 'Animato'), ('P090', 'cartoon', 'Animato')
) as s(code, style, style_name)
join public.card_definitions d on d.code = s.code;
