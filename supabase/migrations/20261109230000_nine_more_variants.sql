-- Three more artwork variants in each of three existing styles: Pastello,
-- Tarocco and 3D. All nine characters had a single variant in another style;
-- when a drawn card has several, the server picks one at random
-- (draw_variant), so the chance per drawn card stays the same.

insert into public.card_variants (definition_id, style, style_name, art_url)
select d.id, s.style, s.style_name, '/cards/variants/' || d.code || '-' || s.style || '.webp'
from (values
  ('P110', 'pastel', 'Pastello'), ('P085', 'pastel', 'Pastello'), ('P042', 'pastel', 'Pastello'),
  ('P113', 'tarot', 'Tarocco'), ('P086', 'tarot', 'Tarocco'), ('P037', 'tarot', 'Tarocco'),
  ('P083', 'render', '3D'), ('P095', 'render', '3D'), ('P045', 'render', '3D')
) as s(code, style, style_name)
join public.card_definitions d on d.code = s.code;
