-- Integration test for when the game modes are open (EDITOR → Modalità di gioco): only admins
-- change them, every player reads them, a start in a mode off or outside its dates is refused
-- by the server whatever the way in, a start in an open mode works, and a match already
-- started goes on to the end. Service-only functions are called as the owner, as the Edge
-- Function would with service_role. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000007a1', 'authenticated', 'authenticated', 'modes-admin@example.test',
   '{"full_name": "Modi Admin"}', now(), now()),
  ('00000000-0000-4000-8000-0000000007a2', 'authenticated', 'authenticated', 'modes-a@example.test',
   '{"full_name": "Modi A"}', now(), now());

-- Whatever an admin set in the real database: every mode on, no label.
update public.mode_availability set state = 'on', label = null;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007a1", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007a2", "role": "authenticated"}', true);
select public.bootstrap_player();

create function pg_temp.as_user(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', p_user, 'role', 'authenticated')::text, true)
$$;

-- A player reads every mode, always on by default, and changes none.
do $$
declare
  v_failed boolean;
begin
  assert (select count(*) from public.mode_availability) = 11, 'eleven modes';
  assert not exists (select 1 from public.mode_availability where state <> 'on' or label is not null), 'default: on, no label';
  assert public.mode_open('classic') and public.mode_open('coop'), 'open by default';
  assert public.mode_open('a_mode_added_later'), 'a mode without a row is open';

  v_failed := false;
  begin perform public.admin_save_mode_availability('classic', 'off', null, null, 'Furbo');
  exception when insufficient_privilege then v_failed := sqlerrm = 'not_admin'; end;
  assert v_failed, 'a player switched a mode off';

  v_failed := false;
  begin update public.mode_availability set state = 'off' where key = 'classic';
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'a player wrote the table';

  v_failed := false;
  begin perform public.assert_modes_open(array['classic']);
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'a player called the guard';
  assert (select state from public.mode_availability where key = 'classic') = 'on', 'still on';
end $$;

-- The admin: the checks on what is sent, then the saves.
reset role;
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000007a1');
set local role authenticated;
select pg_temp.as_user('00000000-0000-4000-8000-0000000007a1');

do $$
declare
  v_payload jsonb;
  v_row jsonb;
  v_failed boolean;
begin
  v_failed := false;
  begin perform public.admin_save_mode_availability('classic', 'on', null, null, '12345678901234567');
  exception when others then v_failed := sqlerrm = 'invalid_mode_label'; end;
  assert v_failed, 'a label of 17 characters';

  v_failed := false;
  begin perform public.admin_save_mode_availability('classic', 'window', now()::timestamp, null, null);
  exception when others then v_failed := sqlerrm = 'invalid_mode_window'; end;
  assert v_failed, 'a period without its end';

  v_failed := false;
  begin perform public.admin_save_mode_availability('classic', 'window', '2026-12-03 18:00', '2026-12-03 18:00', null);
  exception when others then v_failed := sqlerrm = 'invalid_mode_window'; end;
  assert v_failed, 'a period that ends when it starts';

  v_failed := false;
  begin perform public.admin_save_mode_availability('flipper', 'on', null, null, null);
  exception when others then v_failed := sqlerrm = 'invalid_mode_key'; end;
  assert v_failed, 'an unknown mode';

  v_failed := false;
  begin perform public.admin_save_mode_availability('classic', 'paused', null, null, null);
  exception when others then v_failed := sqlerrm = 'invalid_mode_state'; end;
  assert v_failed, 'an unknown state';

  -- Dates are Rome wall-clock times; the label is trimmed and kept in any state.
  v_payload := public.admin_save_mode_availability('boss', 'window', '2026-12-03 18:00', '2026-12-10 23:59', '  Nuova  ');
  select value into v_row from jsonb_array_elements(v_payload -> 'modes') where value ->> 'key' = 'boss';
  assert v_row ->> 'state' = 'window', 'window saved';
  assert v_row ->> 'label' = 'Nuova', 'label trimmed';
  assert (v_row ->> 'starts_at')::timestamptz = '2026-12-03 17:00+00', format('Rome time: %s', v_row ->> 'starts_at');
  assert (select updated_by from public.mode_availability where key = 'boss') = '00000000-0000-4000-8000-0000000007a1', 'who';

  -- Back to always on: the dates stay for next time, an empty label goes.
  perform public.admin_save_mode_availability('boss', 'on', null, null, '');
  assert (select state = 'on' and label is null and starts_at is not null from public.mode_availability where key = 'boss'), 'on, dates kept';

  perform public.admin_save_mode_availability('triple', 'off', null, null, 'Prossimamente');
  assert (select label from public.mode_availability where key = 'triple') = 'Prossimamente', 'label on an off mode';
  assert not public.mode_open('triple'), 'off is closed';
end $$;
reset role;

-- What each start needs.
do $$
begin
  assert public.mode_keys_for('classic', 'bot', false) = array['classic'], 'classic';
  assert public.mode_keys_for('quadrant_shifting', 'friendly', false) = array['quadrant', 'quadrant_shifting'], 'moving grid';
  assert public.mode_keys_for('boss', 'ranked', false) = array['boss', 'ranked'], 'ranked';
  assert public.mode_keys_for('classic', 'conquest', false) = array['classic', 'conquest'], 'conquest';
  assert public.mode_keys_for('classic', 'bot', true) = array['story'], 'story';
end $$;

-- A Classica against a bot: starts while open, goes on when switched off, refused when off,
-- before its period, after it; works again inside it.
create function pg_temp.start_bot_match() returns uuid language plpgsql as $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000007a2';
  v_team uuid[];
  v_bot uuid[];
  v_threats uuid[];
begin
  select array_agg(id order by acquired_at, id) into v_team from (
    select id, acquired_at from public.card_instances where owner_id = v_user and is_starter order by acquired_at, id limit 5
  ) s;
  select array_agg(id order by code) into v_bot from (
    select id, code from public.card_definitions where rarity_code in ('beta', 'alfa') order by code limit 5
  ) s;
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level and region = 'megara'
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;
  return public.match_create_bot(v_user, 'easy', v_team, v_bot, v_threats);
end;
$$;

create function pg_temp.refused(p_sql text) returns boolean language plpgsql as $$
begin
  execute p_sql;
  return false;
exception when others then
  if sqlerrm <> 'mode_unavailable' then
    raise exception 'refused with % instead of mode_unavailable', sqlerrm;
  end if;
  return true;
end;
$$;

do $$
declare
  v_match uuid;
begin
  v_match := pg_temp.start_bot_match();
  update public.mode_availability set state = 'off', label = 'Prossimamente' where key = 'classic';

  -- Already started: it plays on to the end.
  perform public.finish_match(v_match, 'a', 'completed');
  assert (select status from public.matches where id = v_match) = 'finished', 'the match in progress finished';

  assert pg_temp.refused('select pg_temp.start_bot_match()'), 'a bot match while off';
  assert pg_temp.refused($q$
    insert into public.matches (mode, player_a, player_b, threat_ids, threat_levels)
    values ('friendly', '00000000-0000-4000-8000-0000000007a2', '00000000-0000-4000-8000-0000000007a1', '{}', '{}')
  $q$), 'a friendly match while off';
  assert pg_temp.refused($q$
    insert into public.matchmaking_queue (user_id, card_instance_ids, mode, format)
    values ('00000000-0000-4000-8000-0000000007a2', '{}', 'friendly', 'classic')
  $q$), 'the random queue while off';
  assert pg_temp.refused($q$
    insert into public.match_lobbies (code, host_id, card_instance_ids, expires_at, format)
    values ('ABCDEF', '00000000-0000-4000-8000-0000000007a2', '{}', now() + interval '1 hour', 'classic')
  $q$), 'a friend code while off';
  assert pg_temp.refused($q$
    insert into public.matchmaking_queue (user_id, card_instance_ids, mode, format)
    values ('00000000-0000-4000-8000-0000000007a2', '{}', 'conquest', 'classic')
  $q$), 'a Conquista needs its rules';

  -- Before its period, after it: closed. Inside: open.
  update public.mode_availability
  set state = 'window', starts_at = now() + interval '1 day', ends_at = now() + interval '2 days' where key = 'classic';
  assert pg_temp.refused('select pg_temp.start_bot_match()'), 'before the period';
  update public.mode_availability
  set starts_at = now() - interval '2 days', ends_at = now() - interval '1 day' where key = 'classic';
  assert pg_temp.refused('select pg_temp.start_bot_match()'), 'after the period';
  update public.mode_availability
  set starts_at = now() - interval '1 hour', ends_at = now() + interval '1 hour' where key = 'classic';
  v_match := pg_temp.start_bot_match();
  assert v_match is not null, 'inside the period';
  perform public.finish_match(v_match, 'b', 'forfeit');

  -- Open again with a label: a label never blocks.
  update public.mode_availability set state = 'on', label = 'Nuova' where key = 'classic';
  v_match := pg_temp.start_bot_match();
  perform public.finish_match(v_match, 'b', 'forfeit');

  -- The Classificata: its own switch, and the rules of the board chosen.
  update public.mode_availability set state = 'off' where key = 'ranked';
  assert pg_temp.refused($q$
    insert into public.matchmaking_queue (user_id, card_instance_ids, mode, format)
    values ('00000000-0000-4000-8000-0000000007a2', '{}', 'ranked', 'classic')
  $q$), 'the Classificata while off';
  update public.mode_availability set state = 'on' where key = 'ranked';
  assert pg_temp.refused($q$
    insert into public.matchmaking_queue (user_id, card_instance_ids, mode, format)
    values ('00000000-0000-4000-8000-0000000007a2', '{}', 'ranked', 'triple')
  $q$), 'a ranked Allarme Triplo while the Allarme Triplo is off';

  -- The moving grid needs the Quadrante too.
  update public.mode_availability set state = 'off' where key = 'quadrant';
  assert pg_temp.refused($q$
    insert into public.matchmaking_queue (user_id, card_instance_ids, mode, format)
    values ('00000000-0000-4000-8000-0000000007a2', '{}', 'friendly', 'quadrant_shifting')
  $q$), 'the moving grid without the Quadrante';
  update public.mode_availability set state = 'on' where key = 'quadrant';
  update public.mode_availability set state = 'off' where key = 'quadrant_shifting';
  assert pg_temp.refused($q$
    insert into public.matchmaking_queue (user_id, card_instance_ids, mode, format)
    values ('00000000-0000-4000-8000-0000000007a2', '{}', 'friendly', 'quadrant_shifting')
  $q$), 'the moving grid off';
  insert into public.matchmaking_queue (user_id, card_instance_ids, mode, format)
  values ('00000000-0000-4000-8000-0000000007a2', '{}', 'friendly', 'quadrant');
  delete from public.matchmaking_queue where user_id = '00000000-0000-4000-8000-0000000007a2';

  -- The Emergenze.
  insert into public.emergency_days (day, threat_ids, threat_levels)
  select public.game_day(), array_agg(id), array[1, 2, 3, 4, 5, 6, 1, 2]
  from (select id from public.threat_definitions order by code limit 8) t
  on conflict do nothing;
  update public.mode_availability set state = 'off' where key = 'emergency';
  assert pg_temp.refused($q$
    insert into public.emergency_runs (user_id, day, card_instance_ids, definition_ids)
    values ('00000000-0000-4000-8000-0000000007a2', public.game_day(), '{}', '{}')
  $q$), 'the day''s Emergenza while off';
  update public.mode_availability set state = 'on' where key = 'emergency';
  insert into public.emergency_runs (user_id, day, card_instance_ids, definition_ids)
  values ('00000000-0000-4000-8000-0000000007a2', public.game_day(), '{}', '{}');
end $$;

-- The Storia follows its own switch only.
do $$
begin
  update public.mode_availability set state = 'off' where key = 'classic';
  perform public.assert_modes_open(public.mode_keys_for('classic', 'bot', true));
  update public.mode_availability set state = 'off' where key = 'story';
  begin
    perform public.assert_modes_open(public.mode_keys_for('classic', 'bot', true));
    raise exception 'ASSERT: a mission while the Storia is off';
  exception when others then
    assert sqlerrm = 'mode_unavailable', sqlerrm;
  end;
  update public.mode_availability set state = 'on' where key in ('classic', 'story');
end $$;

-- The Operazioni: no room opens and no room starts while off; one already playing goes on.
set local role authenticated;
select pg_temp.as_user('00000000-0000-4000-8000-0000000007a2');
do $$
declare
  v_room uuid;
begin
  v_room := (public.coop_create_room('O1M1') ->> 'id')::uuid;
  perform public.coop_leave_room(v_room);
end $$;
reset role;
update public.mode_availability set state = 'off' where key = 'coop';
set local role authenticated;
do $$
declare
  v_failed boolean := false;
begin
  begin perform public.coop_create_room('O1M1');
  exception when others then v_failed := sqlerrm = 'mode_unavailable'; end;
  assert v_failed, 'a room while the Operazioni are off';
end $$;
reset role;
do $$
declare
  v_room uuid;
begin
  update public.mode_availability set state = 'on' where key = 'coop';
  insert into public.coop_rooms (code, operation_id, host)
  select 'QWERTY', id, '00000000-0000-4000-8000-0000000007a2' from public.coop_operations where code = 'O1M1'
  returning id into v_room;
  update public.mode_availability set state = 'off' where key = 'coop';
  assert pg_temp.refused(format(
    'update public.coop_rooms set status = ''active'', players = 2, started_at = now() where id = %L', v_room
  )), 'a room starting while off';
  -- A room already playing finishes.
  update public.mode_availability set state = 'on' where key = 'coop';
  update public.coop_rooms set status = 'active', players = 2, started_at = now() where id = v_room;
  update public.mode_availability set state = 'off' where key = 'coop';
  update public.coop_rooms set status = 'won', finished_at = now() where id = v_room;
  assert (select status from public.coop_rooms where id = v_room) = 'won', 'the room in progress finished';
end $$;

rollback;
