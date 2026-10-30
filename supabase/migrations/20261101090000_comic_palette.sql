-- Rarity and ability family colors of the comic book interface.

update public.rarity_definitions set color = '#c9c4b6' where code = 'delta';
update public.rarity_definitions set color = '#2fd06e' where code = 'gamma';
update public.rarity_definitions set color = '#1f8bff' where code = 'beta';
update public.rarity_definitions set color = '#b45cff' where code = 'alfa';
update public.rarity_definitions set color = '#ffd60a' where code = 'omega';

update public.ability_families set color = '#ff6a5e' where code = 'body';
update public.ability_families set color = '#4db8ff' where code = 'mind';
update public.ability_families set color = '#c58bff' where code = 'power';
update public.ability_families set color = '#ffb800' where code = 'craft';
