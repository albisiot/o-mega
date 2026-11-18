-- Integration test for the server's opponent in a Sfida a tema online (SPEC §8.8): nobody of
-- the challenge free, after the wait the player meets one of the Classificata's opponents,
-- shown as a person, in a friendly match of the challenge that moves no Fama; left too long, the
-- player loses it. Internal functions are called as the database owner, as the Edge Function
-- would with service_role. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000008d1', 'authenticated', 'authenticated', 'ghost-a@example.test',
   '{"full_name": "Fantasma A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000008d3', 'authenticated', 'authenticated', 'ghost-admin@example.test',
   '{"full_name": "Fantasma Admin"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008d1", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008d3", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000008d3');
update public.events set is_active = false where is_active;
update public.challenges set is_active = false where is_active;
-- Nobody else waits in this test.
delete from public.challenge_queue;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008d3", "role": "authenticated"}', true);
do $$
declare
  v_now timestamp := (now() at time zone 'Europe/Rome')::timestamp;
  v_payload jsonb;
begin
  v_payload := public.admin_save_challenge('Online a tema', '', '#ff7ad9', 'classic', '{}', true, '{}',
    v_now - interval '1 hour', v_now + interval '1 day', p_online => true);
  perform set_config('ghost.challenge', (select c ->> 'id' from jsonb_array_elements(v_payload -> 'challenges') as c
                                         where c ->> 'title' = 'Online a tema'), true);
end $$;
reset role;

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000008d1';
  v_challenge uuid := current_setting('ghost.challenge')::uuid;
  v_team uuid[];
  v_bots uuid[];
  v_threats uuid[];
  v_match uuid;
  v_row public.matches;
  v_context jsonb;
  v_state jsonb;
  v_fama integer;
begin
  select (array_agg(i.id order by i.acquired_at, i.id))[1:5] into v_team from public.card_instances i where i.owner_id = v_a and i.is_starter;
  select array_agg(id) into v_bots from (
    select d.id from public.card_definitions d where d.is_active and d.unlock_level is null order by d.code limit 5
  ) s;
  v_threats := array(select t.id from public.threat_definitions t
                     where t.region = 'megara' and t.is_active and t.rarity_code is null and t.level in (1, 3, 5)
                     order by t.level, t.id limit 5);

  v_context := public.challenge_online_context(v_a, v_challenge);
  assert v_context ->> 'format' = 'classic' and jsonb_array_length(v_context -> 'admitted_definition_ids') > 0, v_context::text;

  -- The first call waits: nobody free, and the wait is not over.
  v_match := public.challenge_queue_join(v_a, v_challenge, v_team, v_threats, null, 'medium', v_bots);
  assert v_match is null, 'the player waits first';
  assert exists (select 1 from public.challenge_queue q where q.user_id = v_a and q.challenge_id = v_challenge), 'in the queue';

  -- The wait is over: the server's opponent comes.
  update public.challenge_queue set enqueued_at = now() - interval '1 minute' where user_id = v_a;
  v_fama := public.ranked_current_fama(v_a);
  v_match := public.challenge_queue_join(v_a, v_challenge, v_team, v_threats, null, 'medium', v_bots);
  assert v_match is not null, 'the server''s opponent after the wait';
  select * into v_row from public.matches where id = v_match;
  assert v_row.mode = 'friendly' and v_row.bot_difficulty is null and v_row.player_b is null
         and v_row.challenge_id = v_challenge, 'a friendly match of the challenge with no second player';
  assert exists (select 1 from public.ranked_matches rm where rm.match_id = v_match and rm.ghost_id is not null
                 and rm.ghost_difficulty = 'medium'), 'its opponent is one of the server''s';
  assert not exists (select 1 from public.challenge_queue q where q.user_id = v_a), 'out of the queue';
  assert public.match_reward_mode(v_row) = 'challenge', 'the challenge''s rewards';

  v_state := public.match_state_payload(v_match, 'a');
  assert v_state -> 'opponent' ->> 'username' is not null, 'the opponent has a name: ' || v_state::text;
  assert v_state -> 'ranked' is null, 'no Fama in a challenge''s match';
  assert (v_state -> 'challenge' ->> 'id')::uuid = v_challenge, 'the match names its challenge';
  assert (public.match_round_context(v_a, v_match) -> 'match' -> 'ghost' ->> 'difficulty') = 'medium', 'the Edge Function plays it';

  -- Left too long: the player loses it, and no Fama moves.
  update public.match_rounds set deadline_at = now() - interval '1 day' where match_id = v_match;
  perform public.close_abandoned_matches(v_a);
  select * into v_row from public.matches where id = v_match;
  assert v_row.status = 'finished' and v_row.result = 'b' and v_row.end_reason = 'forfeit', 'a lost match';
  assert public.ranked_current_fama(v_a) = v_fama, 'no Fama moved';
  assert not exists (select 1 from public.ranked_ledger l where l.match_id = v_match), 'nothing on the Fama ledger';
end $$;

-- The history names the opponent and shows no Fama.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000008d1", "role": "authenticated"}', true);
do $$
declare
  v_entry jsonb;
begin
  select e into v_entry from jsonb_array_elements(public.get_match_history(5)) as e limit 1;
  assert v_entry -> 'ranked' is null and v_entry ->> 'opponent' is not null and v_entry -> 'challenge' is not null, v_entry::text;
end $$;
reset role;

rollback;
