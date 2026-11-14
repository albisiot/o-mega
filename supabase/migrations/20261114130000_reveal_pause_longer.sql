-- A round result full of powers takes up to about 8 seconds to tell (two cut-ins, several
-- balloons, the powers passed on to the next round): with 6 seconds of pause it left before
-- it ended. The next round's timer now waits up to 11 seconds; the page leaves once its
-- animation is over plus 3.5 seconds to read it again, never before 6 (balance.ts). Leaving
-- earlier than the pause only adds to the time to choose: the timer shown never goes past
-- the round's own seconds. Rules do not change.
update public.game_config
set value = to_jsonb(11), updated_at = now()
where key = 'match.reveal_pause_seconds';
