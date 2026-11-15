-- Integration test for the Imprese (SPEC §8.5): a player never reads the catalog nor the
-- condition of an impresa not completed; the server completes imprese when the page opens
-- (without a banner) and in the transaction that records what the player did (with a
-- banner); a completed impresa pays once and keeps its copy when switched off; only admins
-- manage the catalog. Internal functions are called as the database owner. Runs inside a
-- rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000007a1', 'authenticated', 'authenticated', 'imprese-a@example.test',
   '{"full_name": "Imprese A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000007a2', 'authenticated', 'authenticated', 'imprese-b@example.test',
   '{"full_name": "Imprese B"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007a2", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007a1", "role": "authenticated"}', true);
select public.bootstrap_player();

-- The catalog is closed to players, as are the internal functions.
do $$
begin
  begin
    perform count(*) from public.achievements;
    raise exception 'ASSERT: a player read the catalog';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.player_achievements;
    raise exception 'ASSERT: a player read player_achievements';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.check_achievements(auth.uid());
    raise exception 'ASSERT: a player called check_achievements';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_list_achievements();
    raise exception 'ASSERT: a player listed the catalog';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Test imprese only: the starting ones are switched off for the test.
reset role;
update public.achievements set is_active = false;
insert into public.achievements (id, position, tier, name, description, hint, metric, params, target, coins, packs, title, counts_from) values
  ('00000000-0000-4000-8000-0000000007b1', 1001, 'bronze', 'Collaudo', 'Sei arrivato prima del 2999.', 'Una questione di date',
   'registered_before', '{"before": "2999-01-01"}', 1, 30, 0, 'Collaudatore', null),
  ('00000000-0000-4000-8000-0000000007b2', 1002, 'silver', 'Apripista', 'Hai aperto un pacchetto.', null,
   'packs_opened', '{}', 1, 0, 1, null, null),
  ('00000000-0000-4000-8000-0000000007b3', 1003, 'gold', 'Domani', 'Hai aperto un pacchetto da domani.', 'Pazienza',
   'packs_opened', '{}', 1, 10, 0, null, now() + interval '1 day'),
  ('00000000-0000-4000-8000-0000000007b4', 1004, 'legend', 'A mano', 'Te l''ha data l''editor.', null,
   'manual', '{}', 1, 5, 0, null, null);

-- A's board: the dated impresa is completed on opening, shown as new, without a banner;
-- the others show tier and hint only.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007a1", "role": "authenticated"}', true);
do $$
declare
  v jsonb := public.get_achievements();
  v_item jsonb;
begin
  if (v ->> 'total')::integer <> 4 or (v ->> 'discovered')::integer <> 1 then
    raise exception 'ASSERT: 1 of 4 expected, got %', v;
  end if;
  for v_item in select * from jsonb_array_elements(v -> 'achievements') loop
    if (v_item ->> 'done')::boolean then
      if v_item ->> 'name' <> 'Collaudo' or not (v_item ->> 'new')::boolean or (v_item ->> 'coins')::integer <> 30
         or (v_item ->> 'claimed')::boolean or v_item ->> 'title' <> 'Collaudatore' then
        raise exception 'ASSERT: wrong completed impresa %', v_item;
      end if;
    elsif exists (select 1 from jsonb_object_keys(v_item) k where k not in ('id', 'tier', 'done', 'hint')) then
      raise exception 'ASSERT: a secret impresa says too much: %', v_item;
    end if;
  end loop;
  if (select count(*) from public.player_notifications n where n.user_id = auth.uid()) <> 0 then
    raise exception 'ASSERT: a banner for an impresa found on the page';
  end if;
  -- Seen: not new any more.
  if exists (select 1 from jsonb_array_elements(public.get_achievements() -> 'achievements') i
             where (i ->> 'done')::boolean and (i ->> 'new')::boolean) then
    raise exception 'ASSERT: still new after being shown';
  end if;
end;
$$;

-- A pack opened (as the shop would): the impresa that counts the past is completed, with a
-- banner; the one that counts from tomorrow is not.
reset role;
select public.open_pack('00000000-0000-4000-8000-0000000007a1', 'standard');
do $$
declare
  v_note public.player_notifications;
begin
  if not exists (select 1 from public.player_achievements pa
                 where pa.user_id = '00000000-0000-4000-8000-0000000007a1'
                   and pa.achievement_id = '00000000-0000-4000-8000-0000000007b2') then
    raise exception 'ASSERT: Apripista not completed by the pack';
  end if;
  if exists (select 1 from public.player_achievements pa
             where pa.user_id = '00000000-0000-4000-8000-0000000007a1'
               and pa.achievement_id = '00000000-0000-4000-8000-0000000007b3') then
    raise exception 'ASSERT: an impresa counting from tomorrow was completed';
  end if;
  select * into v_note from public.player_notifications n
  where n.user_id = '00000000-0000-4000-8000-0000000007a1' and n.kind = 'achievement';
  if v_note.id is null or v_note.title <> 'Impresa scoperta!' or v_note.body <> 'Apripista'
     or (v_note.data ->> 'packs')::integer <> 1 then
    raise exception 'ASSERT: wrong impresa banner %', row_to_json(v_note);
  end if;
end;
$$;

-- Rewards: paid once, only for completed imprese. Titles: only one's own.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007a1", "role": "authenticated"}', true);
do $$
declare
  v jsonb;
begin
  v := public.claim_achievement('00000000-0000-4000-8000-0000000007b1');
  if (v ->> 'coins')::integer <> 30 then
    raise exception 'ASSERT: wrong coins for Collaudo %', v;
  end if;
  begin
    perform public.claim_achievement('00000000-0000-4000-8000-0000000007b1');
    raise exception 'ASSERT: claimed twice';
  exception when others then
    if sqlerrm <> 'achievement_already_claimed' then raise; end if;
  end;
  begin
    perform public.claim_achievement('00000000-0000-4000-8000-0000000007b3');
    raise exception 'ASSERT: claimed an impresa not completed';
  exception when others then
    if sqlerrm <> 'achievement_not_completed' then raise; end if;
  end;
  v := public.claim_achievement('00000000-0000-4000-8000-0000000007b2');
  if jsonb_array_length(v -> 'opening_ids') <> 1
     or not exists (select 1 from public.pack_openings o
                    where o.id = (v -> 'opening_ids' ->> 0)::uuid and o.pack_type = 'achievement') then
    raise exception 'ASSERT: the pack of Apripista was not opened %', v;
  end if;

  if public.set_player_title('00000000-0000-4000-8000-0000000007b1') <> 'Collaudatore'
     or (select p.title from public.profiles p where p.id = auth.uid()) <> 'Collaudatore' then
    raise exception 'ASSERT: title not set';
  end if;
  begin
    perform public.set_player_title('00000000-0000-4000-8000-0000000007b2');
    raise exception 'ASSERT: a title from an impresa without one';
  exception when others then
    if sqlerrm <> 'title_not_available' then raise; end if;
  end;
end;
$$;

reset role;
do $$
begin
  if (select count(*) from public.coin_ledger l
      where l.user_id = '00000000-0000-4000-8000-0000000007a1' and l.reason = 'achievement_reward' and l.amount = 30) <> 1 then
    raise exception 'ASSERT: the coins of Collaudo are not in the ledger once';
  end if;
end;
$$;

-- B has not completed the dated impresa when it goes off: B no longer sees it, A keeps it.
reset role;
update public.achievements set is_active = false where id = '00000000-0000-4000-8000-0000000007b1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007a2", "role": "authenticated"}', true);
do $$
declare
  v jsonb := public.get_achievements();
begin
  if exists (select 1 from jsonb_array_elements(v -> 'achievements') i
             where i ->> 'id' = '00000000-0000-4000-8000-0000000007b1') then
    raise exception 'ASSERT: B sees an impresa switched off';
  end if;
  begin
    perform public.set_player_title('00000000-0000-4000-8000-0000000007b1');
    raise exception 'ASSERT: B took the title of A';
  exception when others then
    if sqlerrm <> 'title_not_available' then raise; end if;
  end;
  begin
    perform public.admin_save_achievement(null, '{}');
    raise exception 'ASSERT: B saved an impresa';
  exception when insufficient_privilege then null;
  end;
end;
$$;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007a1", "role": "authenticated"}', true);
do $$
begin
  if not exists (select 1 from jsonb_array_elements(public.get_achievements() -> 'achievements') i
                 where i ->> 'id' = '00000000-0000-4000-8000-0000000007b1'
                   and (i ->> 'done')::boolean and (i ->> 'retired')::boolean) then
    raise exception 'ASSERT: A lost a completed impresa that was switched off';
  end if;
end;
$$;

-- The admin: create, check, preview, reorder, grant, delete.
reset role;
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000007a1');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007a1", "role": "authenticated"}', true);
do $$
declare
  v jsonb;
  v_id uuid;
  v_ids uuid[];
begin
  v := public.admin_save_achievement(null, jsonb_build_object(
    'name', 'Nuova', 'description', 'Hai giocato 3 partite.', 'hint', 'Gioca', 'tier', 'bronze',
    'metric', 'matches_played', 'params', '{}'::jsonb, 'target', 3, 'coins', 20, 'packs', 0, 'counts_past', true));
  select (i ->> 'id')::uuid into v_id from jsonb_array_elements(v -> 'achievements') i where i ->> 'name' = 'Nuova';
  if v_id is null then
    raise exception 'ASSERT: impresa not created %', v;
  end if;

  begin
    perform public.admin_save_achievement(null, jsonb_build_object(
      'name', 'Squadra', 'description', 'Vinci con una squadra.', 'tier', 'bronze',
      'metric', 'team_wins', 'params', '{}'::jsonb, 'target', 1));
    raise exception 'ASSERT: a team impresa without a team rule';
  exception when others then
    if sqlerrm <> 'invalid_achievement' then raise; end if;
  end;
  begin
    perform public.admin_save_achievement(null, jsonb_build_object(
      'name', 'Carte', 'description', 'Premio sbagliato.', 'tier', 'bronze',
      'metric', 'level', 'params', '{}'::jsonb, 'target', 2, 'card_codes', '["NOPE"]'::jsonb));
    raise exception 'ASSERT: an unknown reward card';
  exception when others then
    if sqlerrm <> 'invalid_achievement' then raise; end if;
  end;

  v := public.admin_preview_achievement(jsonb_build_object(
    'name', 'Prova', 'description', 'Livello 1.', 'tier', 'bronze', 'metric', 'level', 'params', '{}'::jsonb, 'target', 1));
  if (v ->> 'would_complete')::integer < 2 then
    raise exception 'ASSERT: preview of level 1 %', v;
  end if;

  select array_agg(a.id order by a.position desc) into v_ids
  from jsonb_to_recordset(public.admin_list_achievements() -> 'achievements') as a(id uuid, position integer);
  perform public.admin_reorder_achievements(v_ids);
  begin
    perform public.admin_reorder_achievements(v_ids[2:]);
    raise exception 'ASSERT: an order missing an impresa';
  exception when others then
    if sqlerrm <> 'invalid_order' then raise; end if;
  end;

  begin
    perform public.admin_delete_achievement('00000000-0000-4000-8000-0000000007b1');
    raise exception 'ASSERT: deleted an impresa somebody completed';
  exception when others then
    if sqlerrm <> 'achievement_in_use' then raise; end if;
  end;
  perform public.admin_delete_achievement(v_id);
end;
$$;

-- Grant by hand to B (the name read as owner), with a banner.
reset role;
select set_config('test.b_name', (select username from public.profiles where id = '00000000-0000-4000-8000-0000000007a2'), true);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007a1", "role": "authenticated"}', true);
select public.admin_grant_achievement('00000000-0000-4000-8000-0000000007b4', current_setting('test.b_name'));
reset role;
do $$
begin
  if not exists (select 1 from public.player_achievements pa
                 where pa.user_id = '00000000-0000-4000-8000-0000000007a2'
                   and pa.achievement_id = '00000000-0000-4000-8000-0000000007b4' and pa.granted) then
    raise exception 'ASSERT: manual impresa not granted';
  end if;
  if not exists (select 1 from public.player_notifications n
                 where n.user_id = '00000000-0000-4000-8000-0000000007a2' and n.kind = 'achievement' and n.body = 'A mano') then
    raise exception 'ASSERT: no banner for the granted impresa';
  end if;
  -- A manual impresa is never completed by a check.
  if public.achievement_progress('00000000-0000-4000-8000-0000000007a1', 'manual', '{}', null) <> 0 then
    raise exception 'ASSERT: manual progress';
  end if;
end;
$$;

rollback;
