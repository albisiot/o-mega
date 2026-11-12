-- Quadrante: against a bot the screen now shows the player's move, then the bot
-- "thinking", then the bot's move (about 1.6 s apart). The pause before a move's timer
-- grows from 2 to 4 seconds, so the player's 20 seconds start once the bot's move is on screen.
update public.game_config set value = '4' where key = 'quadrant.move_pause_seconds';
