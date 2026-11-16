-- Davide's text read "almeno 1 gradi di rarità" on Penates (min_gap 1, since
-- 20261116200000_power_variants.sql): "o più" agrees with any number of steps.
update public.power_definitions
set description_template = '+{bonus} se il personaggio avversario lo supera di {min_gap} o più gradi di rarità'
where code = 'giant_slayer';
