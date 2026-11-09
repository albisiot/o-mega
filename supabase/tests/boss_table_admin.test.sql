-- Integration test for the Grande Minaccia points table set by admins: who may read
-- and save it, the limits, and that the table check follows the new numbers.
-- Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000d1', 'authenticated', 'authenticated', 'boss-admin@example.test',
   '{"full_name": "Admin"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000d2', 'authenticated', 'authenticated', 'boss-player@example.test',
   '{"full_name": "Giocatore"}', now(), now());
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000d1", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000000d1');

-- A player cannot read or change the table.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000d2", "role": "authenticated"}', true);
do $$
declare
  v_failed boolean;
begin
  v_failed := false;
  begin perform public.admin_get_boss_table();
  exception when others then v_failed := sqlerrm = 'not_admin'; end;
  assert v_failed, 'a player read the boss table settings';
  v_failed := false;
  begin perform public.admin_save_boss_table(2, 3, 1, 1, 2, 1);
  exception when others then v_failed := sqlerrm = 'not_admin'; end;
  assert v_failed, 'a player changed the boss table';
end $$;

-- The admin reads, saves within the limits, and the check follows.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000d1", "role": "authenticated"}', true);
do $$
declare
  v_table jsonb;
  v_failed boolean;
begin
  v_table := public.admin_get_boss_table();
  assert v_table ->> 'turns' = '5' and v_table ->> 'fronts' = '5', format('fixed numbers %s', v_table);
  -- The current numbers are whatever the admin last saved: only their presence is checked.
  assert (v_table ->> 'hot_value') is not null and (v_table ->> 'extra_growth') is not null, 'current numbers';

  v_failed := false;
  begin perform public.admin_save_boss_table(6, 3, 1, 1, 2, 1);
  exception when others then v_failed := sqlerrm = 'invalid_boss_table'; end;
  assert v_failed, 'six hot fronts on five';
  v_failed := false;
  begin perform public.admin_save_boss_table(2, 21, 1, 1, 2, 1);
  exception when others then v_failed := sqlerrm = 'invalid_boss_table'; end;
  assert v_failed, 'a value above 20';
  v_failed := false;
  begin perform public.admin_save_boss_table(2, 0, 0, 1, 2, 1);
  exception when others then v_failed := sqlerrm = 'invalid_boss_table'; end;
  assert v_failed, 'a first turn that pays nothing';
  v_failed := false;
  begin perform public.admin_save_boss_table(2, 3, null, 1, 2, 1);
  exception when others then v_failed := sqlerrm = 'invalid_boss_table'; end;
  assert v_failed, 'a missing number';

  v_table := public.admin_save_boss_table(1, 4, 2, 2, 3, 1);
  assert (v_table ->> 'hot_fronts')::integer = 1 and (v_table ->> 'hot_value')::integer = 4
     and (v_table ->> 'base_value')::integer = 2 and (v_table ->> 'growth')::integer = 2
     and (v_table ->> 'extra_fronts')::integer = 3 and (v_table ->> 'extra_growth')::integer = 1,
    format('saved numbers %s', v_table);
end $$;
reset role;

do $$
begin
  assert public.config_int('boss.hot_value') = 4, 'game_config follows';
  -- One hot front worth 4, the others 2; then +2 everywhere and +1 more on three fronts.
  assert public.valid_boss_values('[[4,2,2,2,2],[7,5,4,4,5],[10,8,7,6,7],[12,11,10,9,9],[15,14,12,12,11]]'), 'a table of the new numbers';
  assert not public.valid_boss_values('[[2,2,1,1,1],[3,4,2,3,2],[5,5,4,4,3],[6,7,5,5,5],[8,8,6,7,6]]'), 'a table of the old numbers';
end $$;

rollback;
