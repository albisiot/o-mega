-- Integration test for the colours of special packs: the 21 palettes and the
-- custom 'custom:#from:#to:#body:#omega' value are accepted, anything else is
-- refused by the save function (with its own error) and by the table itself;
-- only admins save. Runs inside a transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated', 'colour-admin@example.test',
   '{"full_name": "Colour Admin"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000f2', 'authenticated', 'authenticated', 'colour-player@example.test',
   '{"full_name": "Colour Player"}', now(), now());

do $$
begin
  perform set_config('test.card', (
    select d.code from public.card_definitions d
    where d.is_active and d.unlock_level is null order by d.code limit 1), false);
end $$;

-- The rule itself.
do $$
begin
  assert public.is_pack_color('magenta'), 'an old palette';
  assert public.is_pack_color('sunset') and public.is_pack_color('noir') and public.is_pack_color('gold'), 'new palettes';
  assert public.is_pack_color('custom:#ff2e6c:#ffd60a:#16c8ff:#000000'), 'a custom gradient';
  assert not public.is_pack_color(null), 'no colour';
  assert not public.is_pack_color('pink2'), 'an unknown palette';
  assert not public.is_pack_color('#ff2e6c'), 'a bare hex';
  assert not public.is_pack_color('custom:#FF2E6C:#ffd60a:#16c8ff:#000000'), 'uppercase hex';
  assert not public.is_pack_color('custom:#ff2e6c:#ffd60a:#16c8ff'), 'three colours';
  assert not public.is_pack_color('custom:#ff2e6c:#ffd60a:#16c8ff:#000000;'), 'trailing junk';
  assert not public.is_pack_color('custom:red:#ffd60a:#16c8ff:#000000'), 'a colour name';
end $$;

set local role authenticated;

-- A player cannot save a pack, whatever the colour.
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000f2", "role": "authenticated"}', true);

do $$
begin
  perform public.bootstrap_player();
  begin
    perform public.admin_save_special_pack('Pacchetto furbo', '', 'custom:#ff2e6c:#ffd60a:#16c8ff:#000000', 1, 5, 0, 'card',
      jsonb_build_array(jsonb_build_object('code', current_setting('test.card'), 'percent', 100)));
    raise exception 'ASSERT: a player created a special pack';
  exception when insufficient_privilege then
    assert sqlerrm = 'not_admin', sqlerrm;
  end;
end $$;

select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);

do $$
begin
  perform public.bootstrap_player();
end $$;

reset role;
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000000f1');
set local role authenticated;

-- The admin: a new palette and a custom colour are saved; a wrong one is refused with its own error.
do $$
declare
  v_payload jsonb;
  v_id uuid;
  v_before integer := jsonb_array_length(public.admin_list_special_packs() -> 'packs');
begin
  v_payload := public.admin_save_special_pack('Tramonto di prova', '', 'sunset', 10, 1, 0, 'card',
    jsonb_build_array(jsonb_build_object('code', current_setting('test.card'), 'percent', 100)));
  select (p ->> 'id')::uuid into v_id from jsonb_array_elements(v_payload -> 'packs') p where p ->> 'name' = 'Tramonto di prova';
  assert v_id is not null, 'the pack with a new palette';

  v_payload := public.admin_save_special_pack('Tramonto di prova', '', 'custom:#ff2e6c:#ffd60a:#16c8ff:#000000', 10, 1, 0, 'card',
    jsonb_build_array(jsonb_build_object('code', current_setting('test.card'), 'percent', 100)), p_id => v_id);
  assert (select p ->> 'color' from jsonb_array_elements(v_payload -> 'packs') p where (p ->> 'id')::uuid = v_id)
    = 'custom:#ff2e6c:#ffd60a:#16c8ff:#000000', 'the custom colour, as saved';

  foreach v_payload in array array['"pink2"', '"#ff2e6c"', '"custom:#FF2E6C:#ffd60a:#16c8ff:#000000"', 'null']::jsonb[] loop
    begin
      perform public.admin_save_special_pack('Colore sbagliato', '', v_payload #>> '{}', 10, 1, 0, 'card',
        jsonb_build_array(jsonb_build_object('code', current_setting('test.card'), 'percent', 100)));
      raise exception 'ASSERT: a wrong colour was saved: %', v_payload;
    exception when raise_exception then
      assert sqlerrm = 'special_pack_invalid_color', sqlerrm;
    end;
  end loop;
  assert jsonb_array_length(public.admin_list_special_packs() -> 'packs') = v_before + 1, 'only the good pack was saved';
end $$;

-- The table refuses a wrong colour even past the function.
reset role;
do $$
begin
  begin
    update public.special_packs set color = 'custom:#ff2e6c' where name = 'Tramonto di prova';
    raise exception 'ASSERT: the table took a wrong colour';
  exception when check_violation then null;
  end;
end $$;

rollback;
