-- Less classic names for the first characters (docs/WORLD.md). Mongibello keeps
-- its name; only Zavorra needs a new flavor, the old one played on "Gru".

update public.card_definitions set
  name = 'Zavorra',
  flavor = 'Al porto lo chiamano quando la gru si rompe. Cioè spesso.'
where code = 'P001';

update public.card_definitions set name = 'Malocchia' where code = 'P004';
update public.card_definitions set name = 'Verbale' where code = 'P009';
update public.card_definitions set name = 'Stoppino' where code = 'P012';
update public.card_definitions set name = 'Residuo' where code = 'P057';
update public.card_definitions set name = 'Nessuno' where code = 'P058';
update public.card_definitions set name = 'Brusio' where code = 'P059';
