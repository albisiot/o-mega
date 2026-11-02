-- Three more series of artwork variants, five characters each: a painted
-- cinematic style (Cinema), a flat pastel style (Pastello) and a shiny gold
-- comic style (Oro). Same rules as the earlier series: found only in packs,
-- never on level cards, one picked at random when a character has several.

insert into public.card_variants (definition_id, style, style_name, art_url)
select d.id, s.style, s.style_name, '/cards/variants/' || d.code || '-' || s.style || '.webp'
from (values
  ('P108', 'cinema', 'Cinema'), ('P107', 'cinema', 'Cinema'), ('P098', 'cinema', 'Cinema'),
  ('P106', 'cinema', 'Cinema'), ('P031', 'cinema', 'Cinema'),
  ('P006', 'pastel', 'Pastello'), ('P093', 'pastel', 'Pastello'), ('P109', 'pastel', 'Pastello'),
  ('P103', 'pastel', 'Pastello'), ('P027', 'pastel', 'Pastello'),
  ('P114', 'gold', 'Oro'), ('P057', 'gold', 'Oro'), ('P089', 'gold', 'Oro'),
  ('P101', 'gold', 'Oro'), ('P087', 'gold', 'Oro')
) as s(code, style, style_name)
join public.card_definitions d on d.code = s.code;
