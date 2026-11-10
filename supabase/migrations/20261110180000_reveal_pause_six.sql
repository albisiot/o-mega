-- The round result is now a comic page that takes up to about 4 seconds to tell
-- (round-comic.tsx): one more second of pause leaves time to read it. The next
-- round's timer starts after the pause, so the time to choose does not shrink.
update public.game_config
set value = to_jsonb(6), updated_at = now()
where key = 'match.reveal_pause_seconds';
