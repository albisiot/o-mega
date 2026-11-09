-- Ten new artwork variant styles, five characters each: Cremisi, Spettro,
-- Fiamma, Ombra, Incisione, Circuito, Acquerello, Tempera, Zombie and Ritratto.
-- Fifty different characters. The eight newest ones (P115-P122) had no variant
-- yet: from now on a drawn copy of them can come out as a variant like every
-- other character's. The other forty-two had a single variant in another style;
-- when a drawn card has several, the server picks one at random (draw_variant),
-- so the chance per drawn card stays the same.

insert into public.card_variants (definition_id, style, style_name, art_url)
select d.id, s.style, s.style_name, '/cards/variants/' || d.code || '-' || s.style || '.webp'
from (values
  ('P116', 'crimson', 'Cremisi'), ('P029', 'crimson', 'Cremisi'), ('P066', 'crimson', 'Cremisi'),
  ('P107', 'crimson', 'Cremisi'), ('P106', 'crimson', 'Cremisi'),
  ('P122', 'wraith', 'Spettro'), ('P011', 'wraith', 'Spettro'), ('P027', 'wraith', 'Spettro'),
  ('P064', 'wraith', 'Spettro'), ('P014', 'wraith', 'Spettro'),
  ('P121', 'flame', 'Fiamma'), ('P005', 'flame', 'Fiamma'), ('P056', 'flame', 'Fiamma'),
  ('P052', 'flame', 'Fiamma'), ('P100', 'flame', 'Fiamma'),
  ('P117', 'shadow', 'Ombra'), ('P008', 'shadow', 'Ombra'), ('P031', 'shadow', 'Ombra'),
  ('P088', 'shadow', 'Ombra'), ('P050', 'shadow', 'Ombra'),
  ('P120', 'etching', 'Incisione'), ('P084', 'etching', 'Incisione'), ('P096', 'etching', 'Incisione'),
  ('P077', 'etching', 'Incisione'), ('P067', 'etching', 'Incisione'),
  ('P098', 'circuit', 'Circuito'), ('P081', 'circuit', 'Circuito'), ('P082', 'circuit', 'Circuito'),
  ('P076', 'circuit', 'Circuito'), ('P073', 'circuit', 'Circuito'),
  ('P115', 'watercolor', 'Acquerello'), ('P015', 'watercolor', 'Acquerello'), ('P020', 'watercolor', 'Acquerello'),
  ('P018', 'watercolor', 'Acquerello'), ('P047', 'watercolor', 'Acquerello'),
  ('P114', 'tempera', 'Tempera'), ('P105', 'tempera', 'Tempera'), ('P109', 'tempera', 'Tempera'),
  ('P049', 'tempera', 'Tempera'), ('P051', 'tempera', 'Tempera'),
  ('P119', 'zombie', 'Zombie'), ('P019', 'zombie', 'Zombie'), ('P026', 'zombie', 'Zombie'),
  ('P010', 'zombie', 'Zombie'), ('P003', 'zombie', 'Zombie'),
  ('P118', 'portrait', 'Ritratto'), ('P108', 'portrait', 'Ritratto'), ('P007', 'portrait', 'Ritratto'),
  ('P038', 'portrait', 'Ritratto'), ('P054', 'portrait', 'Ritratto')
) as s(code, style, style_name)
join public.card_definitions d on d.code = s.code;
