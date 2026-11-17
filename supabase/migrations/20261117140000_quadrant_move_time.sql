-- Quadrante: more time to decide. A move gets 40 seconds instead of 20. Against a bot the
-- screen now waits 2 seconds after the effects of the player's move before showing the bot's,
-- so the pause before a move's timer grows from 4 to 10 seconds: it covers the player's move,
-- that wait and the bot's move, and the 40 seconds start once the bot's move is on screen.
update public.game_config set value = '40' where key = 'quadrant.move_timer_seconds';
update public.game_config set value = '10' where key = 'quadrant.move_pause_seconds';
