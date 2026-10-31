-- A player can now lose up to 10 cards per game day in Conquest.
update public.game_config
set value = '10'
where key = 'conquest.max_cards_lost_per_day';
