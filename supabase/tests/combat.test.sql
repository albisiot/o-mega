-- Integration test for the Scontro a squadre, stage 4 (SPEC §5.19, docs/COMBAT.md): the kits, the
-- battles against the computer (the cards must be the player's, one battle at a time, the choices
-- appended in order, the prizes of the day), the seed closed to clients, the mode switch, and the
-- EDITOR's functions for admins only. Client functions read auth.uid() from the request claims;
-- service-only functions are called as the owner. Rolled back:
--   npm run test:db

begin;

-- Whatever an admin set in the real database: the mode is open, the prizes as balance.ts.
update public.mode_availability set state = 'on' where key = 'combat';
update public.game_config c set value = to_jsonb(d.value)
from (values ('combat.rewards.win_xp', 20), ('combat.rewards.loss_xp', 8), ('combat.rewards.win_coins', 15), ('combat.rewards.daily_battles', 5)) as d(key, value)
where c.key = d.key;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-8000-0000000007c' || n)::uuid, 'authenticated', 'authenticated',
       'combat-' || n || '@example.test', jsonb_build_object('full_name', 'Scontro ' || n), now(), now()
from generate_series(1, 3) as n;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', '00000000-0000-4000-8000-0000000007c' || n, 'role', 'authenticated')::text, true),
       public.bootstrap_player()
from generate_series(1, 3) as n;
reset role;

create function pg_temp.as_user(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object('sub', p_user, 'role', 'authenticated')::text, true)
$$;

create function pg_temp.u(p_n integer) returns uuid language sql as $$
  select ('00000000-0000-4000-8000-0000000007c' || p_n)::uuid
$$;

-- New copies of characters for a player, in the order of the codes; their instance ids.
create function pg_temp.give(p_user uuid, p_codes text[]) returns uuid[] language plpgsql as $$
declare
  v_ids uuid[] := '{}';
  v_id uuid;
  v_code text;
begin
  foreach v_code in array p_codes loop
    insert into public.card_instances (definition_id, owner_id, acquired_via)
    select d.id, p_user, 'pack' from public.card_definitions d where d.code = v_code
    returning id into v_id;
    v_ids := v_ids || v_id;
  end loop;
  return v_ids;
end $$;

-- The setup the Edge Function would build: side a with these characters in order (only what the
-- database checks: their definition ids), side b anything.
create function pg_temp.setup(p_codes text[]) returns jsonb language sql as $$
  select jsonb_build_object(
    'a', (select jsonb_agg(jsonb_build_object('definitionId', d.id, 'name', d.name) order by u.ord)
          from unnest(p_codes) with ordinality as u(code, ord) join public.card_definitions d on d.code = u.code),
    'b', '[]'::jsonb, 'field', null)
$$;

create function pg_temp.create(p_user uuid, p_cards uuid[], p_codes text[]) returns uuid language sql as $$
  select public.combat_create(p_user, p_cards, pg_temp.setup(p_codes), '{}'::jsonb, 12345, '{"strategy": "balanced", "priority": null, "orders": {}}'::jsonb, false)
$$;

-- The Edge Function reads both tables with the service role (writes go through the functions).
do $$
begin
  assert has_table_privilege('service_role', 'public.combat_battles', 'select'), 'the service role reads the battles';
  assert has_table_privilege('service_role', 'public.combat_kits', 'select'), 'the service role reads the kits';
  assert not has_table_privilege('service_role', 'public.combat_battles', 'insert'), 'the service role writes only through the functions';
end $$;

-- ---------------------------------------------------------------------------
-- Clients: the kits are readable, the battles (and their seed) are not, the service functions neither
-- ---------------------------------------------------------------------------

set local role authenticated;
select pg_temp.as_user(pg_temp.u(1));
do $$
declare
  v_failed boolean;
begin
  assert (select count(*) from public.combat_kits) >= 35, 'the kits are readable';
  -- The ten pilots and the first batch (20261124120000_scontro_kits_batch_one.sql).
  assert (select count(*) from public.combat_kits k join public.card_definitions d on d.id = k.definition_id
          where d.code in ('P001', 'P125', 'P204', 'P152', 'P123', 'P043', 'P044', 'P037', 'P213', 'P104',
                           'P003', 'P005', 'P007', 'P008', 'P009', 'P010', 'P012', 'P013', 'P014', 'P018',
                           'P019', 'P022', 'P024', 'P062', 'P065', 'P081', 'P083', 'P084', 'P093', 'P095',
                           'P096', 'P150', 'P153', 'P155', 'P197')) = 35, 'every pilot and every kit of the first batch';
  v_failed := false;
  begin perform 1 from public.combat_battles;
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'a client read the battles';
  v_failed := false;
  begin perform public.combat_create(pg_temp.u(1), '{}', '{}', '{}', 1, '{}', false);
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'a client created a battle';
  v_failed := false;
  begin perform public.combat_record(gen_random_uuid(), pg_temp.u(1), 0, '[]', null);
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'a client recorded choices';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- A battle: whose cards, which characters, one at a time, the mode switch
-- ---------------------------------------------------------------------------

do $$
declare
  v_a uuid := pg_temp.u(1);
  v_b uuid := pg_temp.u(2);
  v_port text[] := array['P001', 'P152', 'P125', 'P204', 'P123'];
  v_cards uuid[];
  v_others uuid[];
  v_plain uuid[];
  v_battle uuid;
  v_second uuid;
  v_failed boolean;
  v_result jsonb;
  v_xp integer;
  v_coins bigint;
begin
  v_cards := pg_temp.give(v_a, v_port);
  v_others := pg_temp.give(v_b, v_port);
  v_plain := pg_temp.give(v_a, array['P002', 'P003', 'P004', 'P005', 'P006']);

  -- Someone else's cards.
  v_failed := false;
  begin perform pg_temp.create(v_a, v_others, v_port);
  exception when others then v_failed := sqlerrm = 'card_not_owned'; end;
  assert v_failed, 'a battle with another player''s cards';

  -- Characters without a kit.
  v_failed := false;
  begin perform pg_temp.create(v_a, v_plain, array['P002', 'P003', 'P004', 'P005', 'P006']);
  exception when others then v_failed := sqlerrm = 'combat_no_kit'; end;
  assert v_failed, 'characters without a kit';

  -- Side a of the setup must be the cards' characters, in their places.
  v_failed := false;
  begin perform pg_temp.create(v_a, v_cards, array['P152', 'P001', 'P125', 'P204', 'P123']);
  exception when others then v_failed := sqlerrm = 'invalid_request'; end;
  assert v_failed, 'a setup in another order';

  -- The mode off: nothing starts.
  update public.mode_availability set state = 'off' where key = 'combat';
  v_failed := false;
  begin perform pg_temp.create(v_a, v_cards, v_port);
  exception when others then v_failed := sqlerrm = 'mode_unavailable'; end;
  assert v_failed, 'a battle with the mode off';
  update public.mode_availability set state = 'on' where key = 'combat';

  v_battle := pg_temp.create(v_a, v_cards, v_port);
  assert (select status from public.combat_battles where id = v_battle) = 'active', 'the battle starts';
  perform pg_temp.as_user(v_a);
  assert public.combat_active() = v_battle, 'the battle under way';
  perform pg_temp.as_user(v_b);
  assert public.combat_active() is null, 'nobody else''s';

  -- One at a time: a new battle leaves the old one.
  v_second := pg_temp.create(v_a, v_cards, v_port);
  assert (select status from public.combat_battles where id = v_battle) = 'abandoned', 'the old battle is left';

  -- -------------------------------------------------------------------------
  -- Choices in order; the end and its prizes
  -- -------------------------------------------------------------------------
  v_result := public.combat_record(v_second, v_a, 0, '[{"slot": "base", "target": "b0"}]', null);
  assert v_result ->> 'status' = 'active', 'a choice recorded';
  v_failed := false;
  begin perform public.combat_record(v_second, v_a, 0, '[{"slot": "base", "target": "b1"}]', null);
  exception when others then v_failed := sqlerrm = 'combat_stale'; end;
  assert v_failed, 'two calls on the same turn';
  v_failed := false;
  begin perform public.combat_record(v_second, v_b, 1, '[]', null);
  exception when others then v_failed := sqlerrm = 'combat_not_found'; end;
  assert v_failed, 'someone else''s battle';

  select xp into v_xp from public.profiles where id = v_a;
  select coalesce(sum(amount), 0) into v_coins from public.coin_ledger where user_id = v_a;
  v_result := public.combat_record(v_second, v_a, 1, '[{"slot": "special", "target": "b0"}]', '{"winner": "a", "reason": "wiped"}');
  assert v_result = '{"status": "won", "xp": 20, "coins": 15}'::jsonb, 'a win pays: ' || v_result;
  assert (select jsonb_array_length(actions) from public.combat_battles where id = v_second) = 2, 'both choices kept';
  assert (select xp from public.profiles where id = v_a) = v_xp + 20, 'the XP';
  assert (select coalesce(sum(amount), 0) from public.coin_ledger where user_id = v_a) = v_coins + 15, 'the coins';
  assert exists (select 1 from public.coin_ledger where user_id = v_a and reason = 'combat_reward' and ref_id = v_second), 'the ledger row';
  v_failed := false;
  begin perform public.combat_record(v_second, v_a, 2, '[]', '{"winner": "b", "reason": "wiped"}');
  exception when others then v_failed := sqlerrm = 'combat_finished'; end;
  assert v_failed, 'a battle that is over';

  -- A loss pays its XP and no coins; past the day's battles, nothing.
  v_battle := pg_temp.create(v_a, v_cards, v_port);
  v_result := public.combat_record(v_battle, v_a, 0, '[]', '{"winner": "b", "reason": "limit"}');
  assert v_result = '{"status": "lost", "xp": 8, "coins": 0}'::jsonb, 'a loss: ' || v_result;
  update public.game_config set value = '2' where key = 'combat.rewards.daily_battles';
  v_battle := pg_temp.create(v_a, v_cards, v_port);
  v_result := public.combat_record(v_battle, v_a, 0, '[]', '{"winner": "a", "reason": "wiped"}');
  assert v_result = '{"status": "won", "xp": 0, "coins": 0}'::jsonb, 'past the day''s battles: ' || v_result;
  assert (select xp is null and coins is null from public.combat_battles where id = v_battle), 'nothing recorded as paid';
  update public.game_config set value = '5' where key = 'combat.rewards.daily_battles';

  -- The player gives up; not someone else's battle.
  v_battle := pg_temp.create(v_a, v_cards, v_port);
  perform pg_temp.as_user(v_b);
  assert not public.combat_abandon(v_battle), 'someone else gave it up';
  perform pg_temp.as_user(v_a);
  assert public.combat_abandon(v_battle), 'given up';
  assert (select status from public.combat_battles where id = v_battle) = 'abandoned', 'abandoned';
  assert public.combat_active() is null, 'no battle under way';
end $$;

-- ---------------------------------------------------------------------------
-- EDITOR: admins only
-- ---------------------------------------------------------------------------

insert into public.admin_users (user_id) values (pg_temp.u(3));

do $$
declare
  v_kit jsonb;
  v_gantry uuid;
  v_plain uuid;
  v_failed boolean;
  v_version integer;
begin
  select id into v_gantry from public.card_definitions where code = 'P001';
  select id into v_plain from public.card_definitions where code = 'P002';
  select kit into v_kit from public.combat_kits where definition_id = v_gantry;

  perform pg_temp.as_user(pg_temp.u(1));
  v_failed := false;
  begin perform public.admin_combat_kits();
  exception when others then v_failed := sqlerrm = 'not_admin'; end;
  assert v_failed, 'a player listed the kits';
  v_failed := false;
  begin perform public.admin_save_combat_kit(v_plain, v_kit);
  exception when others then v_failed := sqlerrm = 'not_admin'; end;
  assert v_failed, 'a player saved a kit';
  v_failed := false;
  begin perform public.admin_delete_combat_kit(v_gantry);
  exception when others then v_failed := sqlerrm = 'not_admin'; end;
  assert v_failed, 'a player took a kit away';

  perform pg_temp.as_user(pg_temp.u(3));
  assert jsonb_array_length(public.admin_combat_kits()) = (select count(*) from public.combat_kits), 'the admin sees every kit';
  v_version := public.admin_save_combat_kit(v_plain, v_kit);
  assert v_version = 1, 'a new kit';
  assert public.admin_save_combat_kit(v_plain, v_kit) = 2, 'a new version';
  assert (select updated_by from public.combat_kits where definition_id = v_plain) = pg_temp.u(3), 'who changed it';
  v_failed := false;
  begin perform public.admin_save_combat_kit(v_plain, v_kit - 'supreme');
  exception when others then v_failed := sqlerrm = 'invalid_kit'; end;
  assert v_failed, 'a kit without a supreme';
  v_failed := false;
  begin perform public.admin_save_combat_kit(v_plain, jsonb_set(v_kit, '{base,slot}', '"special"'));
  exception when others then v_failed := sqlerrm = 'invalid_kit'; end;
  assert v_failed, 'a move in the wrong slot';
  assert public.admin_delete_combat_kit(v_plain), 'taken away';
  assert not exists (select 1 from public.combat_kits where definition_id = v_plain), 'gone';
end $$;

rollback;
