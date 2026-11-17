-- Event leaderboard (SPEC §8.2): the "Classifica generale" of a timed event, every player
-- who earned event points, by points. It unlocks for a player who reached the last target
-- (the last "step") of the event, and stays readable after the event ends.
--
-- Score: the event points of the ledger (event_points), the same total as the targets.
-- Ties: who completed the event first, then who got to that total first.
-- Who sees it: events.leaderboard_visibility, 'completed' (default), 'participants' (any
-- point) or 'everyone'. Checked here on every call, never by the client.
-- What it shows of other players: name, avatar, points, targets reached and when the last
-- one was reached. Never ids, emails, teams or cards.

insert into public.game_config (key, value, description) values
  ('events.leaderboard_size', '100', 'Players shown in an event leaderboard; the caller''s own place is shown below when lower'),
  ('events.leaderboard_visibility', '"completed"', 'Who sees an event leaderboard: completed (last target reached), participants (any event point) or everyone');

-- The totals of one event, player by player, without reading the whole ledger.
create index event_points_event_user_idx on public.event_points (event_id, user_id) include (points, created_at);

-- True when the player may see the leaderboard of the event. An unknown setting counts as
-- 'completed', the strictest.
create function public.event_leaderboard_allowed(p_event_id uuid, p_user uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case public.config_text('events.leaderboard_visibility')
    when 'everyone' then true
    when 'participants' then exists (
      select 1 from public.event_points p where p.event_id = p_event_id and p.user_id = p_user
    )
    else exists (
      select 1 from public.event_rewards r
      where r.event_id = p_event_id and r.user_id = p_user
        and r.tier = (select max(t.tier) from public.event_tiers t where t.event_id = p_event_id)
    )
  end
$$;

revoke execute on function public.event_leaderboard_allowed(uuid, uuid) from public, anon, authenticated;

-- The leaderboard of an event: the first players (events.leaderboard_size) and the
-- caller's own place, also when lower.
create function public.event_leaderboard_payload(p_event_id uuid, p_user uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_size integer := public.config_int('events.leaderboard_size');
  v_last integer;
  v_tiers integer;
begin
  select max(t.tier), count(*) into v_last, v_tiers from public.event_tiers t where t.event_id = p_event_id;

  return (
    with totals as (
      select p.user_id, sum(p.points)::integer as points, max(p.created_at) as reached_at
      from public.event_points p
      where p.event_id = p_event_id
      group by p.user_id
    ),
    steps as (
      select r.user_id, count(*)::integer as steps, max(r.granted_at) filter (where r.tier = v_last) as completed_at
      from public.event_rewards r
      where r.event_id = p_event_id
      group by r.user_id
    ),
    ranked as (
      select
        row_number() over (order by t.points desc, s.completed_at nulls last, t.reached_at, t.user_id) as rank,
        t.user_id, t.points, coalesce(s.steps, 0) as steps, s.completed_at, pr.username, pr.avatar_url
      from totals t
      join public.profiles pr on pr.id = t.user_id
      left join steps s on s.user_id = t.user_id
    ),
    entries as (
      select rank, user_id, completed_at, jsonb_build_object(
        'rank', rank,
        'username', username,
        'avatar_url', avatar_url,
        'points', points,
        'steps', steps,
        'completed_at', completed_at,
        'is_me', user_id = p_user
      ) as entry
      from ranked
    )
    select jsonb_build_object(
      'event_id', e.id,
      'title', e.title,
      'starts_at', e.starts_at,
      'ends_at', e.ends_at,
      'ended', e.ends_at <= now(),
      'tiers', v_tiers,
      'players', (select count(*) from entries),
      'completed', (select count(*) from entries where completed_at is not null),
      'top', coalesce((select jsonb_agg(x.entry order by x.rank) from entries x where x.rank <= v_size), '[]'::jsonb),
      'me', (select x.entry from entries x where x.user_id = p_user)
    )
    from public.events e
    where e.id = p_event_id
  );
end;
$$;

revoke execute on function public.event_leaderboard_payload(uuid, uuid) from public, anon, authenticated;

-- The leaderboard of an event. p_event_id null: the last event that ended (and that someone
-- played), or null when there is none or the caller may not see it. With an id, a caller who
-- may not see it gets event_leaderboard_locked.
create function public.get_event_leaderboard(p_event_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_event uuid := p_event_id;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if v_event is null then
    select e.id into v_event
    from public.events e
    where e.ends_at <= now() and exists (select 1 from public.event_points p where p.event_id = e.id)
    order by e.ends_at desc
    limit 1;
    if v_event is null or not public.event_leaderboard_allowed(v_event, v_user) then
      return null;
    end if;
    return public.event_leaderboard_payload(v_event, v_user);
  end if;

  if not exists (select 1 from public.events e where e.id = v_event) then
    raise exception 'event_not_found';
  end if;
  if not public.event_leaderboard_allowed(v_event, v_user) then
    raise exception 'event_leaderboard_locked' using errcode = '42501';
  end if;
  return public.event_leaderboard_payload(v_event, v_user);
end;
$$;

revoke execute on function public.get_event_leaderboard(uuid) from public, anon;
grant execute on function public.get_event_leaderboard(uuid) to authenticated;
