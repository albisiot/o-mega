-- Integration test for Schegge as a prize (20261119200000_shard_rewards.sql): the editors save them
-- (0 to shards.max_reward, alone too) and refuse more, and bonus codes, event targets, daily
-- objectives, imprese, the targets of a Sfida a tema and the places of the Emergenza leaderboards
-- pay them once, with a row in shard_ledger whose reason says where they come from. Runs inside a
-- transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000007b1', 'authenticated', 'authenticated', 'shard-prize-admin@example.test',
   '{"full_name": "Shard Prize Admin"}', now(), now()),
  ('00000000-0000-4000-8000-0000000007b2', 'authenticated', 'authenticated', 'shard-prize-player@example.test',
   '{"full_name": "Shard Prize Player"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007b2", "role": "authenticated"}', true);
do $$ begin perform public.bootstrap_player(); end $$;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007b1", "role": "authenticated"}', true);
do $$ begin perform public.bootstrap_player(); end $$;
reset role;
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000007b1');

-- The limit.
do $$
begin
  assert public.config_int('shards.max_reward') = 100, 'shards.max_reward';
  assert public.shard_reward_valid(0) and public.shard_reward_valid(100), 'valid';
  assert not public.shard_reward_valid(101) and not public.shard_reward_valid(-1) and not public.shard_reward_valid(null),
    'invalid';
  assert public.shard_reward_from(null, 'x') = 0 and public.shard_reward_from('7', 'x') = 7, 'read';
  begin
    perform public.shard_reward_from('1.5', 'bad_shards');
    raise exception 'ASSERT: half a Scheggia accepted';
  exception when raise_exception then
    assert sqlerrm = 'bad_shards', sqlerrm;
  end;
end $$;

-- A player cannot pay themselves.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007b2", "role": "authenticated"}', true);
do $$
begin
  begin
    perform public.grant_reward_shards('00000000-0000-4000-8000-0000000007b2', 50, 'bonus_code', null);
    raise exception 'ASSERT: a player granted Schegge';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.admin_create_bonus_code('SCHEGGEFURBE', p_shards => 5);
    raise exception 'ASSERT: a player created a code';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- The editors: Schegge alone are a prize; more than the limit is refused.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007b1", "role": "authenticated"}', true);
do $$
declare
  v_start timestamp := (now() at time zone 'Europe/Rome') + interval '730 days';
  v_now timestamp := now() at time zone 'Europe/Rome';
  v_list jsonb;
begin
  begin
    perform public.admin_create_bonus_code('SCHEGGETROPPE', p_shards => 101);
    raise exception 'ASSERT: 101 Schegge on a code';
  exception when raise_exception then
    assert sqlerrm = 'bonus_code_invalid_limits', sqlerrm;
  end;
  v_list := public.admin_create_bonus_code('SCHEGGETRE', p_shards => 3);
  assert exists (
    select 1 from jsonb_array_elements(v_list -> 'codes') c where c ->> 'code' = 'SCHEGGETRE' and (c ->> 'shards')::integer = 3
  ), 'code saved with its Schegge';

  begin
    perform public.admin_save_event('Schegge troppe', '', v_start, v_start + interval '2 days',
      '{"bot": {"win": 10}}', '[{"points": 10, "shards": 101}]');
    raise exception 'ASSERT: 101 Schegge on a target';
  exception when raise_exception then
    assert sqlerrm = 'event_invalid_tiers', sqlerrm;
  end;
  begin
    perform public.admin_save_event('Schegge a metà', '', v_start, v_start + interval '2 days',
      '{"bot": {"win": 10}}', '[{"points": 10, "shards": "due"}]');
    raise exception 'ASSERT: Schegge as text on a target';
  exception when raise_exception then
    assert sqlerrm = 'event_invalid_tiers', sqlerrm;
  end;
  v_list := public.admin_save_event('Premio in Schegge', '', v_start, v_start + interval '2 days',
    '{"bot": {"win": 10}}', '[{"points": 10, "shards": 4}, {"points": 20, "coins": 10, "shards": 0}]');
  assert exists (
    select 1 from jsonb_array_elements(v_list -> 'events') e, jsonb_array_elements(e -> 'tiers') t
    where e ->> 'title' = 'Premio in Schegge' and (t ->> 'tier')::integer = 1 and (t ->> 'shards')::integer = 4
  ), 'event target saved with its Schegge';

  begin
    perform public.admin_save_daily_objective(null, 'Vinci 2 partite troppe', 'easy', 'matches_won', '{}', 2, 0, 0,
      p_shards => 101);
    raise exception 'ASSERT: 101 Schegge on an objective';
  exception when raise_exception then
    assert sqlerrm = 'invalid_objective', sqlerrm;
  end;
  v_list := public.admin_save_daily_objective(null, 'Vinci 2 partite per Schegge', 'easy', 'matches_won', '{}', 2, 0, 0,
    p_shards => 2);
  assert exists (
    select 1 from jsonb_array_elements(v_list -> 'objectives') o
    where o ->> 'title' = 'Vinci 2 partite per Schegge' and (o ->> 'shards')::integer = 2
  ), 'objective saved with its Schegge';
  assert (v_list ->> 'max_shards')::integer = 100, 'objective editor knows the limit';
  -- Saved again without p_shards (an older page): the Schegge stay.
  v_list := public.admin_save_daily_objective(
    (select o ->> 'code' from jsonb_array_elements(v_list -> 'objectives') o where o ->> 'title' = 'Vinci 2 partite per Schegge'),
    'Vinci 2 partite per Schegge', 'easy', 'matches_won', '{}', 2, 0, 1);
  assert exists (
    select 1 from jsonb_array_elements(v_list -> 'objectives') o
    where o ->> 'title' = 'Vinci 2 partite per Schegge' and (o ->> 'shards')::integer = 2 and (o ->> 'packs')::integer = 1
  ), 'objective keeps its Schegge';

  begin
    perform public.admin_save_achievement(null, jsonb_build_object(
      'name', 'Schegge troppe', 'description', 'Hai giocato 1 partita.', 'tier', 'bronze',
      'metric', 'matches_played', 'params', '{}'::jsonb, 'target', 1, 'shards', 101));
    raise exception 'ASSERT: 101 Schegge on an impresa';
  exception when raise_exception then
    assert sqlerrm = 'invalid_achievement', sqlerrm;
  end;
  v_list := public.admin_save_achievement(null, jsonb_build_object(
    'name', 'Schegge premiate', 'description', 'Hai giocato 1 partita.', 'tier', 'bronze',
    'metric', 'matches_played', 'params', '{}'::jsonb, 'target', 1, 'coins', 0, 'packs', 0, 'counts_past', true,
    'shards', 5));
  assert exists (
    select 1 from jsonb_array_elements(v_list -> 'achievements') a
    where a ->> 'name' = 'Schegge premiate' and (a ->> 'shards')::integer = 5
  ), 'impresa saved with its Schegge';
  assert (v_list ->> 'max_shards')::integer = 100, 'impresa editor knows the limit';

  begin
    perform public.admin_save_challenge('Schegge troppe', '', '#ff7ad9', 'classic', '{easy}', true, '{}',
      v_now - interval '1 hour', v_now + interval '1 day', p_tiers => '[{"wins": 1, "shards": 101}]');
    raise exception 'ASSERT: 101 Schegge on a challenge target';
  exception when raise_exception then
    assert sqlerrm = 'challenge_invalid_tiers', sqlerrm;
  end;
  v_list := public.admin_save_challenge('Sfida a Schegge', '', '#ff7ad9', 'classic', '{easy}', true, '{}',
    v_now - interval '1 hour', v_now + interval '1 day', p_tiers => '[{"wins": 1, "shards": 6}]');
  assert exists (
    select 1 from jsonb_array_elements(v_list -> 'challenges') c, jsonb_array_elements(c -> 'tiers') t
    where c ->> 'title' = 'Sfida a Schegge' and (t ->> 'shards')::integer = 6
  ), 'challenge target saved with its Schegge';

  begin
    perform public.admin_save_match_rewards('[]', '{"emergency.prizes.rank1_shards": 101}');
    raise exception 'ASSERT: 101 Schegge on an Emergenza place';
  exception when raise_exception then
    assert sqlerrm = 'invalid_match_rewards', sqlerrm;
  end;
  v_list := public.admin_save_match_rewards('[]', '{"emergency.prizes.rank1_shards": 8, "emergency_week.prizes.others_shards": 2}');
  assert (v_list -> 'settings' ->> 'emergency.prizes.rank1_shards')::integer = 8
     and (v_list -> 'settings' ->> 'emergency_week.prizes.others_shards')::integer = 2, format('Emergenza places %s', v_list);
end $$;

-- Paid: the code, once.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007b2", "role": "authenticated"}', true);
do $$
declare
  v_result jsonb := public.redeem_bonus_code('scheggetre');
begin
  assert (v_result ->> 'shards')::integer = 3, format('code %s', v_result);
  assert (public.get_cosmetics() ->> 'shard_balance')::integer = 3, 'balance after the code';
end $$;

reset role;

-- Paid: the event target (and its banner), the challenge target, the Emergenza places.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000007b2';
  v_tier public.event_tiers;
  v_challenge_tier public.challenge_tiers;
  v_prize uuid;
begin
  select t.* into v_tier from public.event_tiers t join public.events e on e.id = t.event_id
  where e.title = 'Premio in Schegge' and t.tier = 1;
  perform public.grant_event_tier(v_user, v_tier);
  perform public.grant_event_tier(v_user, v_tier);
  assert (select count(*) from public.shard_ledger l where l.user_id = v_user and l.reason = 'event_reward' and l.amount = 4) = 1,
    'event target paid its Schegge once';
  assert (select r.shards from public.event_rewards r where r.event_id = v_tier.event_id and r.user_id = v_user) = 4,
    'event reward keeps its Schegge';
  assert exists (
    select 1 from public.player_notifications n
    where n.user_id = v_user and n.kind = 'event_reward' and (n.data ->> 'shards')::integer = 4
  ), 'event banner says its Schegge';
  assert exists (
    select 1 from jsonb_array_elements(public.event_payload(v_tier.event_id, v_user) -> 'tiers') t
    where (t ->> 'tier')::integer = 1 and (t ->> 'shards')::integer = 4 and (t ->> 'reached')::boolean
  ), 'event page says its Schegge';

  select t.* into v_challenge_tier from public.challenge_tiers t join public.challenges c on c.id = t.challenge_id
  where c.title = 'Sfida a Schegge';
  perform public.grant_challenge_tier(v_user, v_challenge_tier);
  assert (select count(*) from public.shard_ledger l where l.user_id = v_user and l.reason = 'challenge_reward' and l.amount = 6) = 1,
    'challenge target paid its Schegge';
  assert exists (
    select 1 from public.player_notifications n
    where n.user_id = v_user and n.kind = 'challenge_reward' and (n.data ->> 'shards')::integer = 6
  ), 'challenge banner says its Schegge';
  assert exists (
    select 1 from jsonb_array_elements(public.challenge_tiers_payload(v_challenge_tier.challenge_id, v_user)) t
    where (t ->> 'shards')::integer = 6
  ), 'challenge page says its Schegge';

  -- The places: as set above, and none beyond the leaderboard.
  assert (select p.shards from public.emergency_prize_for(1) p) = 8, 'daily first place';
  assert (select p.shards from public.emergency_prize_for(2) p) = 0, 'daily second place';
  assert (select p.shards from public.emergency_week_prize_for(4) p) = 2, 'weekly fourth place';
  assert (select p.shards from public.emergency_week_prize_for(10000) p) = 0, 'beyond the weekly leaderboard';
  assert exists (
    select 1 from jsonb_array_elements(public.emergency_prize_table()) t where (t ->> 'from')::integer = 1 and (t ->> 'shards')::integer = 8
  ), 'daily prize table';

  -- A prize of Schegge alone on a day already closed, as emergency_close_days writes it.
  insert into public.emergency_prizes (id, day, user_id, rank, passed, total_score, players, coins, packs, shards)
  select '00000000-0000-4000-8000-0000000007c1', d.day, v_user, 999, 3, 100, 999, 0, 0, 8
  from public.emergency_prize_days d order by d.day limit 1;
  assert found, 'no closed Emergenza day to test on';
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007b2", "role": "authenticated"}', true);
do $$
declare
  v_prizes jsonb := public.get_emergency_prizes();
  v_claim jsonb;
begin
  assert exists (
    select 1 from jsonb_array_elements(v_prizes) p
    where p ->> 'id' = '00000000-0000-4000-8000-0000000007c1' and (p ->> 'shards')::integer = 8
  ), format('daily prize says its Schegge %s', v_prizes);
  v_claim := public.claim_emergency_prize('00000000-0000-4000-8000-0000000007c1');
  assert (v_claim ->> 'shards')::integer = 8, format('daily prize paid %s', v_claim);
  begin
    perform public.claim_emergency_prize('00000000-0000-4000-8000-0000000007c1');
    raise exception 'ASSERT: a prize claimed twice';
  exception when raise_exception then
    assert sqlerrm = 'emergency_prize_already_claimed', sqlerrm;
  end;
end $$;
reset role;

-- Paid: an objective of today, completed, and the impresa.
insert into public.daily_objective_days (user_id, day)
values ('00000000-0000-4000-8000-0000000007b2', public.game_day()) on conflict do nothing;
do $$
declare
  v_code text := (select d.code from public.daily_objective_definitions d where d.title = 'Vinci 2 partite per Schegge');
  v_id uuid;
begin
  -- Handed out as the server hands it: the Schegge are copied.
  update public.daily_objective_definitions set is_active = false
  where difficulty = 'easy' and code <> v_code and is_active;
  v_id := public.draw_daily_objective('00000000-0000-4000-8000-0000000007b2', public.game_day(), 'easy', 20);
  assert (select o.shards from public.daily_objectives o where o.id = v_id) = 2, 'objective copied its Schegge';
  perform set_config('test.objective', v_id::text, false);
  update public.daily_objectives set progress = target, completed_at = now() where id = v_id;
  assert exists (
    select 1 from public.player_notifications n
    where n.user_id = '00000000-0000-4000-8000-0000000007b2' and n.kind = 'objective_completed'
      and (n.data ->> 'shards')::integer = 2
  ), 'objective banner says its Schegge';
end $$;

do $$
declare
  v_achievement public.achievements;
begin
  select * into v_achievement from public.achievements where name = 'Schegge premiate';
  perform set_config('test.achievement', v_achievement.id::text, false);
  assert public.complete_achievement('00000000-0000-4000-8000-0000000007b2', v_achievement, true), 'impresa completed';
  assert (select pa.shards from public.player_achievements pa
          where pa.user_id = '00000000-0000-4000-8000-0000000007b2' and pa.achievement_id = v_achievement.id) = 5,
    'impresa copied its Schegge';
  perform public.notify_achievements('00000000-0000-4000-8000-0000000007b2', array[v_achievement.id]);
  assert exists (
    select 1 from public.player_notifications n
    where n.user_id = '00000000-0000-4000-8000-0000000007b2' and n.kind = 'achievement' and (n.data ->> 'shards')::integer = 5
  ), 'impresa banner says its Schegge';
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000007b2", "role": "authenticated"}', true);
do $$
declare
  v_objective uuid := current_setting('test.objective')::uuid;
  v_achievement uuid := current_setting('test.achievement')::uuid;
  v_claim jsonb;
begin
  assert exists (
    select 1 from jsonb_array_elements(public.get_daily_objectives() -> 'objectives') o
    where (o ->> 'id')::uuid = v_objective and (o ->> 'shards')::integer = 2
  ), 'objective shows its Schegge';
  v_claim := public.claim_daily_objective(v_objective);
  assert (v_claim ->> 'shards')::integer = 2, format('objective paid %s', v_claim);

  assert exists (
    select 1 from jsonb_array_elements(public.get_achievements() -> 'achievements') a
    where (a ->> 'id')::uuid = v_achievement and (a ->> 'shards')::integer = 5
  ), 'impresa shows its Schegge';
  v_claim := public.claim_achievement(v_achievement);
  assert (v_claim ->> 'shards')::integer = 5, format('impresa paid %s', v_claim);

  -- 3 (code) + 4 (event) + 6 (challenge) + 8 (Emergenza) + 2 (objective) + 5 (impresa).
  assert (public.get_cosmetics() ->> 'shard_balance')::integer = 28, format('balance %s', public.get_cosmetics() ->> 'shard_balance');
end $$;
reset role;

-- Every Scheggia has its row, with where it came from.
do $$
begin
  assert (
    select string_agg(l.reason || ':' || l.amount, ',' order by l.reason)
    from public.shard_ledger l where l.user_id = '00000000-0000-4000-8000-0000000007b2'
  ) = 'achievement_reward:5,bonus_code:3,challenge_reward:6,emergency_prize:8,event_reward:4,objective_reward:2',
    format('ledger %s', (select string_agg(l.reason || ':' || l.amount, ',' order by l.reason)
                         from public.shard_ledger l where l.user_id = '00000000-0000-4000-8000-0000000007b2'));
  assert (select count(*) from public.shard_ledger l where l.user_id = '00000000-0000-4000-8000-0000000007b2' and l.ref_id is null) = 0,
    'every row says which prize';
end $$;

rollback;
