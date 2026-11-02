-- Second series of artwork variants, in a bright painted comic style. Same
-- rules as the neon ones (20261101230000_card_variants.sql): found only in
-- packs, never on level cards. When a character has more than one variant,
-- the draw picks one of them at random.

insert into public.card_variants (definition_id, style, style_name, art_url)
select d.id, 'epic', 'Epica', '/cards/variants/' || d.code || '-epic.webp'
from public.card_definitions d
where d.code in ('P058', 'P060', 'P091', 'P055', 'P075', 'P044', 'P033', 'P097', 'P095', 'P013');
