-- Integration test for the prizes of the Emergenza leaderboard (SPEC §5.10).
-- Runs inside a rolled-back transaction:
--   npm run test:db

begin;

-- Known prizes, whatever an admin set.
update public.game_config c set value = to_jsonb(d.value)
from (values
  ('emergency.leaderboard_size', 10),
  ('emergency.prizes.min_passed', 1),
  ('emergency.prizes.rank1_coins', 50),
  ('emergency.prizes.rank1_packs', 1),
  ('emergency.prizes.rank2_coins', 100),
  ('emergency.prizes.rank2_packs', 0),
  ('emergency.prizes.rank3_coins', 75),
  ('emergency.prizes.rank3_packs', 0),
  ('emergency.prizes.others_coins', 25),
  ('emergency.prizes.others_packs', 0)
) as d(key, value)
where c.key = d.key;

insert into auth.users (id, aud, role, email, created_at, updated_at)
select format('00000000-0000-4000-8000-0000000002%s', lpad(n::text, 2, '0'))::uuid,
  'authenticated', 'authenticated', format('ep-%s@example.test', n), now(), now()
from generate_series(1, 12) n;
insert into public.profiles (id, username)
select format('00000000-0000-4000-8000-0000000002%s', lpad(n::text, 2, '0'))::uuid, format('ep_user_%s', lpad(n::text, 2, '0'))
from generate_series(1, 12) n;

-- Two days long over, never closed: twelve finished runs on the first, three and an
-- unfinished one on the second.
insert into public.emergency_days (day, threat_ids, threat_levels) values
  ('2020-01-01', '{}', '{}'), ('2020-01-02', '{}', '{}');

insert into public.emergency_runs (user_id, day, card_instance_ids, definition_ids, status, passed, failed, total_score, finished_at)
select format('00000000-0000-4000-8000-0000000002%s', lpad(n::text, 2, '0'))::uuid, '2020-01-01', '{}', '{}', 'finished',
  case when n <= 2 then 8 when n = 3 then 5 else 3 end, 3, 300 - n * 10,
  '2020-01-01 12:00:00+00'::timestamptz + n * interval '1 minute'
from generate_series(1, 12) n;

insert into public.emergency_runs (user_id, day, card_instance_ids, definition_ids, status, passed, failed, total_score, finished_at) values
  ('00000000-0000-4000-8000-000000000201', '2020-01-02', '{}', '{}', 'finished', 2, 3, 40, '2020-01-02 10:00:00+00'),
  ('00000000-0000-4000-8000-000000000202', '2020-01-02', '{}', '{}', 'finished', 1, 3, 20, '2020-01-02 11:00:00+00'),
  ('00000000-0000-4000-8000-000000000203', '2020-01-02', '{}', '{}', 'finished', 0, 3, 5, '2020-01-02 12:00:00+00'),
  ('00000000-0000-4000-8000-000000000204', '2020-01-02', '{}', '{}', 'active', 6, 0, 150, null);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000201", "role": "authenticated"}', true);

do $$
declare
  v_prizes jsonb := public.get_emergency_prizes();
  v_again jsonb := public.get_emergency_prizes();
  v_claim jsonb;
  v_failed boolean;
  v_board jsonb;
begin
  -- The first player of both days: two prizes, oldest first.
  assert jsonb_array_length(v_prizes) = 2, format('my prizes %s', v_prizes);
  assert v_prizes -> 0 ->> 'day' = '2020-01-01' and (v_prizes -> 0 ->> 'rank')::integer = 1, 'first day first';
  assert (v_prizes -> 0 ->> 'coins')::integer = 50 and (v_prizes -> 0 ->> 'packs')::integer = 1, 'first place prize';
  assert (v_prizes -> 0 ->> 'players')::integer = 12 and (v_prizes -> 0 ->> 'passed')::integer = 8, 'the run';
  assert v_again = v_prizes, 'closing twice writes nothing more';

  -- Clients read the prizes only through the RPCs.
  begin
    perform 1 from public.emergency_prizes;
    raise exception 'ASSERT: a client read the prizes';
  exception when insufficient_privilege then null;
  end;

  -- Claimed once: coins in the ledger and an opened pack.
  v_claim := public.claim_emergency_prize((v_prizes -> 0 ->> 'id')::uuid);
  assert (v_claim ->> 'coins')::integer = 50, 'claimed coins';
  assert jsonb_array_length(v_claim -> 'opening_ids') = 1, 'one pack opened';
  v_failed := false;
  begin
    perform public.claim_emergency_prize((v_prizes -> 0 ->> 'id')::uuid);
  exception when others then v_failed := sqlerrm = 'emergency_prize_already_claimed';
  end;
  assert v_failed, 'claimed twice';
  assert jsonb_array_length(public.get_emergency_prizes()) = 1, 'one prize left';

  -- Today's leaderboard says what the places win.
  v_board := public.get_emergency_leaderboard();
  assert jsonb_array_length(v_board -> 'prizes') = 4, format('prize table %s', v_board -> 'prizes');
  assert (v_board -> 'prizes' -> 3 ->> 'from')::integer = 4 and (v_board -> 'prizes' -> 3 ->> 'to')::integer = 10, 'others';
  assert (v_board ->> 'prize_min_passed')::integer = 1, 'min passed';
end $$;

-- Someone else's prize cannot be claimed.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000202", "role": "authenticated"}', true);

do $$
declare
  v_failed boolean := false;
begin
  begin
    perform public.claim_emergency_prize((
      select p.id from public.emergency_prizes p
      where p.user_id = '00000000-0000-4000-8000-000000000201' and p.day = '2020-01-02'
    ));
  exception
    when insufficient_privilege then v_failed := true;
    when others then v_failed := sqlerrm = 'emergency_prize_not_found';
  end;
  assert v_failed, 'claimed someone else''s prize';
end $$;

reset role;

do $$
declare
  v_user uuid := '00000000-0000-4000-8000-000000000201';
  v_opening uuid := (select (opening_ids)[1] from public.emergency_prizes where user_id = v_user and day = '2020-01-01');
begin
  -- The first day: the first ten, by threats passed, score and who finished first.
  assert (select count(*) from public.emergency_prizes where day = '2020-01-01') = 10, 'ten prizes';
  assert (select array_agg(coins order by rank) from public.emergency_prizes where day = '2020-01-01')
    = array[50, 100, 75, 25, 25, 25, 25, 25, 25, 25], 'prizes by place';
  assert (select user_id from public.emergency_prizes where day = '2020-01-01' and rank = 2)
    = '00000000-0000-4000-8000-000000000202', 'score breaks the tie';
  assert not exists (select 1 from public.emergency_prizes
    where user_id in ('00000000-0000-4000-8000-000000000211', '00000000-0000-4000-8000-000000000212')), 'beyond the tenth';

  -- The second day: no prize without a threat passed, none for a run left unfinished.
  assert (select array_agg(rank order by rank) from public.emergency_prizes where day = '2020-01-02') = array[1, 2],
    'second day';
  assert not exists (select 1 from public.emergency_prizes where day = '2020-01-02'
    and user_id in ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000204')), 'not prized';

  -- Today stays open until midnight.
  assert not exists (select 1 from public.emergency_prize_days where day = public.game_day()), 'today closed';

  -- The claim is in the ledger and the pack is an Emergenza prize.
  assert (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'emergency_prize') = 50, 'ledger';
  assert (select pack_type from public.pack_openings where id = v_opening) = 'emergency', 'pack type';
  assert (select claimed_at is not null from public.emergency_prizes where user_id = v_user and day = '2020-01-01'),
    'claimed_at';
end $$;

rollback;
