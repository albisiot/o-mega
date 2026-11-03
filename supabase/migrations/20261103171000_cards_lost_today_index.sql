-- The daily loss count (SPEC §6.4) read every Conquest transfer the player
-- ever lost and worked out the game day of each one, a config lookup per row.
-- Now the day's bounds are worked out once and an index answers.

create index card_transfers_conquest_from_user_idx on public.card_transfers (from_user, created_at)
  where reason = 'conquest';

-- Same count as before: a transfer is on today's game day exactly when it
-- falls between today's midnight and the next one, in the reset time zone.
create or replace function public.cards_lost_today(p_user uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer from public.card_transfers t
  where t.from_user = p_user and t.reason = 'conquest'
    and t.created_at >= (select timezone(public.config_text('time.daily_reset_time_zone'), public.game_day()::timestamp))
    and t.created_at < (select public.next_reset_at())
$$;
