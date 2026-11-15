-- In-app banners (SPEC §11.1): good news the server decides, told to the player in
-- whatever screen they are on. A row is written in the same transaction that
-- decides the news (an objective completed, an event milestone paid), by a trigger
-- on the table that records it, so every path that gets there writes one. The
-- player only reads their own rows and marks them seen; nothing else is written
-- by a client.
--
-- Delivery: the insert pings the Realtime broadcast topic "notify:<user id>" with
-- no content, as the match topics do; the app then reads its unseen rows through
-- get_player_notifications. Nothing a stranger listening on the topic could learn
-- beyond "something arrived". On opening, the app reads them the same way.

create table public.player_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('objective_completed', 'event_reward')),
  -- Shown as is (Italian).
  title text not null check (char_length(title) between 1 and 80),
  body text not null default '' check (char_length(body) <= 200),
  data jsonb not null default '{}' check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  seen_at timestamptz
);

create index player_notifications_user_idx on public.player_notifications (user_id, created_at);

alter table public.player_notifications enable row level security;
revoke all on table public.player_notifications from anon, authenticated;
grant select on table public.player_notifications to authenticated;
create policy "Players read their own notifications"
  on public.player_notifications for select to authenticated
  using (user_id = (select auth.uid()));

-- Unseen news older than this is not shown any more (the day's objectives have expired by then).
insert into public.game_config (key, value, description) values
  ('notifications.show_within_hours', '24', 'Unseen in-app banners older than this are not shown'),
  ('notifications.keep_days', '30', 'In-app banners older than this are deleted when a new one arrives');

-- Writes a notification and pings the player's topic. Old rows of the player go.
create function public.add_player_notification(p_user uuid, p_kind text, p_title text, p_body text, p_data jsonb)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_user is null then
    return null;
  end if;
  delete from public.player_notifications n
  where n.user_id = p_user
    and n.created_at < now() - make_interval(days => public.config_int('notifications.keep_days'));
  insert into public.player_notifications (user_id, kind, title, body, data)
  values (p_user, p_kind, left(p_title, 80), left(coalesce(p_body, ''), 200), coalesce(p_data, '{}'::jsonb))
  returning id into v_id;
  -- Sent only if the transaction commits (realtime.messages is a table).
  perform realtime.send(jsonb_build_object('kind', 'notification'), 'update', 'notify:' || p_user, false);
  return v_id;
end;
$$;

revoke execute on function public.add_player_notification(uuid, text, text, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Where news comes from
-- ---------------------------------------------------------------------------

-- A daily objective reaches its target (add_daily_objective_progress, whatever made progress).
create function public.notify_daily_objective_completed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.completed_at is null and new.completed_at is not null and new.replaced_at is null then
    perform public.add_player_notification(
      new.user_id,
      'objective_completed',
      'Obiettivo completato!',
      new.title,
      jsonb_build_object(
        'objective_id', new.id,
        'day', new.day,
        'difficulty', new.difficulty,
        'coins', new.coins,
        'packs', new.packs,
        'cards', coalesce(cardinality(new.card_definition_ids), 0)
      )
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.notify_daily_objective_completed() from public, anon, authenticated;

create trigger daily_objectives_notify_completed
  after update of completed_at on public.daily_objectives
  for each row execute function public.notify_daily_objective_completed();

-- An event milestone is paid (award_event_points, at the end of a match or a passed threat).
create function public.notify_event_reward()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.add_player_notification(
    new.user_id,
    'event_reward',
    'Premio evento ottenuto!',
    coalesce((select e.title from public.events e where e.id = new.event_id), 'Evento')
      || ' · traguardo ' || new.tier,
    jsonb_build_object(
      'event_id', new.event_id,
      'tier', new.tier,
      'coins', new.coins,
      'packs', new.packs,
      'cards', coalesce((
        select cardinality(t.card_definition_ids) from public.event_tiers t
        where t.event_id = new.event_id and t.tier = new.tier
      ), 0)
    )
  );
  return new;
end;
$$;

revoke execute on function public.notify_event_reward() from public, anon, authenticated;

create trigger event_rewards_notify
  after insert on public.event_rewards
  for each row execute function public.notify_event_reward();

-- ---------------------------------------------------------------------------
-- Player RPCs
-- ---------------------------------------------------------------------------

-- The caller's unseen notifications of the last hours, oldest first (at most 20).
create function public.get_player_notifications()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', n.id,
    'kind', n.kind,
    'title', n.title,
    'body', n.body,
    'data', n.data,
    'created_at', n.created_at
  ) order by n.created_at, n.id), '[]'::jsonb)
  from (
    select * from public.player_notifications n
    where n.user_id = auth.uid() and n.seen_at is null
      and n.created_at > now() - make_interval(hours => public.config_int('notifications.show_within_hours'))
    order by n.created_at desc, n.id desc
    limit 20
  ) n
$$;

-- Marks the caller's notifications seen; ids of other players are ignored. Returns how many changed.
create function public.mark_player_notifications_seen(p_ids uuid[])
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_count integer;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if coalesce(cardinality(p_ids), 0) > 100 then
    raise exception 'too_many_notifications';
  end if;
  update public.player_notifications n set seen_at = now()
  where n.user_id = v_user and n.id = any (p_ids) and n.seen_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.get_player_notifications() from public, anon;
revoke execute on function public.mark_player_notifications_seen(uuid[]) from public, anon;
grant execute on function public.get_player_notifications() to authenticated;
grant execute on function public.mark_player_notifications_seen(uuid[]) to authenticated;
