-- Integration test for in-app banners (SPEC §11.1): completing a daily objective and
-- reaching an event milestone write a notification in the same transaction, once;
-- a player reads only their own, cannot write the table, and marks theirs seen.
-- Internal functions are called as the database owner. Runs inside a rolled-back
-- transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'notify-a@example.test',
   '{"full_name": "Avvisi A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated', 'notify-b@example.test',
   '{"full_name": "Avvisi B"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e2", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);
select public.bootstrap_player();
select public.get_daily_objectives();

-- Nothing yet; a player writes nothing and calls no internal function.
do $$
begin
  if jsonb_array_length(public.get_player_notifications()) <> 0 then
    raise exception 'ASSERT: notifications before anything happened';
  end if;
  begin
    insert into public.player_notifications (user_id, kind, title)
    values (auth.uid(), 'objective_completed', 'Falso');
    raise exception 'ASSERT: a player wrote a notification';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.add_player_notification(auth.uid(), 'objective_completed', 'Falso', '', '{}');
    raise exception 'ASSERT: a player called add_player_notification';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- The server completes one of A's objectives (as a match ending would).
reset role;
select public.add_daily_objective_progress(o.id, o.target)
from public.daily_objectives o
where o.user_id = '00000000-0000-4000-8000-0000000000e1' and o.replaced_at is null
order by o.slot
limit 1;
-- Progress on a completed objective changes nothing: no second notification.
select public.add_daily_objective_progress(o.id, 1)
from public.daily_objectives o
where o.user_id = '00000000-0000-4000-8000-0000000000e1' and o.completed_at is not null;

do $$
declare
  v_objective public.daily_objectives;
  v_note public.player_notifications;
begin
  select * into v_objective from public.daily_objectives o
  where o.user_id = '00000000-0000-4000-8000-0000000000e1' and o.completed_at is not null;
  if (select count(*) from public.player_notifications n
      where n.user_id = '00000000-0000-4000-8000-0000000000e1') <> 1 then
    raise exception 'ASSERT: one notification expected for the completed objective';
  end if;
  select * into v_note from public.player_notifications n where n.user_id = '00000000-0000-4000-8000-0000000000e1';
  if v_note.kind <> 'objective_completed' or v_note.body <> v_objective.title
     or (v_note.data ->> 'objective_id')::uuid <> v_objective.id or v_note.seen_at is not null then
    raise exception 'ASSERT: wrong objective notification %', row_to_json(v_note);
  end if;
end;
$$;

-- An event milestone paid to A.
insert into public.events (id, title, starts_at, ends_at, points, is_active) values
  ('00000000-0000-4000-8000-0000000000ee', 'Evento di prova', now() - interval '400 days', now() - interval '399 days', '{}', false);
insert into public.event_tiers (event_id, tier, points, coins) values
  ('00000000-0000-4000-8000-0000000000ee', 1, 10, 25);
insert into public.event_rewards (event_id, tier, user_id, coins, packs) values
  ('00000000-0000-4000-8000-0000000000ee', 1, '00000000-0000-4000-8000-0000000000e1', 25, 0);

do $$
begin
  if not exists (
    select 1 from public.player_notifications n
    where n.user_id = '00000000-0000-4000-8000-0000000000e1' and n.kind = 'event_reward'
      and n.body = 'Evento di prova · traguardo 1' and (n.data ->> 'coins')::integer = 25
  ) then
    raise exception 'ASSERT: event milestone notification missing';
  end if;
end;
$$;

-- Both rows were written in this one transaction, so they share now(): in real play they
-- come from different transactions. Spread them in time, so the order checked below is set.
update public.player_notifications set created_at = created_at - interval '1 minute'
where user_id = '00000000-0000-4000-8000-0000000000e1' and kind = 'objective_completed';

-- B sees none of A's notifications and cannot mark them.
select set_config('test.a_notification_ids', array_agg(id)::text, true) from public.player_notifications
where user_id = '00000000-0000-4000-8000-0000000000e1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e2", "role": "authenticated"}', true);
do $$
begin
  if jsonb_array_length(public.get_player_notifications()) <> 0 then
    raise exception 'ASSERT: B got A''s notifications from the RPC';
  end if;
  if (select count(*) from public.player_notifications) <> 0 then
    raise exception 'ASSERT: B read A''s notifications from the table';
  end if;
  if public.mark_player_notifications_seen(current_setting('test.a_notification_ids')::uuid[]) <> 0 then
    raise exception 'ASSERT: B marked A''s notifications seen';
  end if;
end;
$$;

-- A reads both (oldest first), marks one seen, then the other is the only one left.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e1", "role": "authenticated"}', true);
do $$
declare
  v_list jsonb := public.get_player_notifications();
  v_first uuid;
begin
  if jsonb_array_length(v_list) <> 2 then
    raise exception 'ASSERT: A should have 2 unseen notifications, got %', v_list;
  end if;
  if v_list -> 0 ->> 'kind' <> 'objective_completed' or v_list -> 1 ->> 'kind' <> 'event_reward' then
    raise exception 'ASSERT: wrong order %', v_list;
  end if;
  if (select count(*) from public.player_notifications) <> 2 then
    raise exception 'ASSERT: A cannot read their own notifications';
  end if;
  begin
    update public.player_notifications set seen_at = now();
    raise exception 'ASSERT: a player updated the table directly';
  exception when insufficient_privilege then null;
  end;
  v_first := (v_list -> 0 ->> 'id')::uuid;
  if public.mark_player_notifications_seen(array[v_first]) <> 1 then
    raise exception 'ASSERT: marking seen changed nothing';
  end if;
  if public.mark_player_notifications_seen(array[v_first]) <> 0 then
    raise exception 'ASSERT: marking seen twice changed a row';
  end if;
  v_list := public.get_player_notifications();
  if jsonb_array_length(v_list) <> 1 or v_list -> 0 ->> 'kind' <> 'event_reward' then
    raise exception 'ASSERT: a seen notification came back %', v_list;
  end if;
end;
$$;

-- Old unseen news is not shown.
reset role;
update public.player_notifications set created_at = now() - interval '2 days'
where user_id = '00000000-0000-4000-8000-0000000000e1';
set local role authenticated;
do $$
begin
  if jsonb_array_length(public.get_player_notifications()) <> 0 then
    raise exception 'ASSERT: stale notifications are still shown';
  end if;
end;
$$;

rollback;
