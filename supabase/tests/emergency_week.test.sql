-- Integration test for the Emergenza della settimana (SPEC §5.16). Service-only functions
-- are called as the database owner. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

-- Known values, whatever an admin set.
update public.game_config c set value = to_jsonb(d.value)
from (values
  ('emergency_week.rewards.tier1_passed', 4),
  ('emergency_week.rewards.tier1_coins', 20),
  ('emergency_week.rewards.tier2_passed', 7),
  ('emergency_week.rewards.tier2_coins', 30),
  ('emergency_week.rewards.tier3_passed', 10),
  ('emergency_week.rewards.tier3_coins', 50),
  ('emergency_week.leaderboard_size', 10),
  ('emergency_week.prizes.min_passed', 1),
  ('emergency_week.prizes.rank1_coins', 100),
  ('emergency_week.prizes.rank1_packs', 2),
  ('emergency_week.prizes.rank2_coins', 50),
  ('emergency_week.prizes.rank2_packs', 1),
  ('emergency_week.prizes.rank3_coins', 0),
  ('emergency_week.prizes.rank3_packs', 1),
  ('emergency_week.prizes.others_coins', 50),
  ('emergency_week.prizes.others_packs', 0)
) as d(key, value)
where c.key = d.key;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000003a1', 'authenticated', 'authenticated', 'ew-a@example.test', '{"full_name": "Settimana A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000003a2', 'authenticated', 'authenticated', 'ew-b@example.test', '{"full_name": "Settimana B"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000003a1", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000003a2", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- Other runs would change the counts below.
delete from public.emergency_week_prizes;
delete from public.emergency_week_prize_weeks;
delete from public.emergency_week_plays;
delete from public.emergency_week_runs;
delete from public.emergency_weeks;

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000003a1';
  v_b uuid := '00000000-0000-4000-8000-0000000003a2';
  -- The starter set: 10 distinct characters, the weekly squad.
  v_squad_a uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 10) s);
  v_squad_b uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_b order by acquired_at, id limit 10) s);
  v_threats uuid[];
  v_other uuid[];
  v_state jsonb;
  v_failed boolean;
  v_week date := public.game_week(public.game_day());
  v_daily jsonb;
begin
  -- Usual threats of Nuova Megara: two of level 3 and 4, the second one each time.
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 2, 3, 4, 5, 6, 3, 4, 5, 4]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions
    where level = l.level and region = 'megara' and rarity_code is null and is_active
    order by code offset (case when l.ord >= 7 then (l.ord - 6) else 0 end) limit 1
  ) t;
  select array_agg(t.id order by l.ord) into v_other
  from unnest(array[6, 5, 4, 3, 2, 1, 4, 5, 3, 4]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions
    where level = l.level and region = 'megara' and rarity_code is null and is_active
    order by code desc offset (case when l.ord >= 7 then (l.ord - 6) else 0 end) limit 1
  ) t;
  assert cardinality(v_threats) = 10 and cardinality(v_other) = 10, 'test threats';

  -- Nothing can start before the week has its threats.
  v_failed := false;
  begin perform public.emergency_week_start(v_a, v_squad_a);
  exception when others then v_failed := sqlerrm = 'emergency_not_ready'; end;
  assert v_failed, 'started without threats';

  -- The first draw of the week holds for everyone; a short sequence is refused.
  perform public.emergency_week_ensure(v_threats);
  perform public.emergency_week_ensure(v_other);
  assert (select threat_ids = v_threats from public.emergency_weeks where week = v_week), 'second draw won';
  assert extract(isodow from v_week) = 1, 'the week is its Monday';
  v_failed := false;
  begin perform public.emergency_week_ensure(v_threats[1:8]);
  exception when others then v_failed := sqlerrm = 'invalid_threats'; end;
  assert v_failed, 'accepted a short sequence';

  -- Before starting, only the levels, the weekly rules and when the week ends.
  v_state := public.emergency_week_state_payload(v_a);
  assert v_state -> 'threat_levels' = '[1, 2, 3, 4, 5, 6, 3, 4, 5, 4]'::jsonb, format('levels %s', v_state -> 'threat_levels');
  assert jsonb_typeof(v_state -> 'run') = 'null', 'run before starting';
  assert (v_state -> 'rules' ->> 'threats_per_run')::integer = 10, 'threats per run';
  assert (v_state -> 'rules' -> 'targets' ->> '1')::integer = 9 and (v_state -> 'rules' -> 'targets' ->> '6')::integer = 34,
    format('weekly targets %s', v_state -> 'rules' -> 'targets');
  assert (v_state -> 'rules' -> 'rewards' -> 0 ->> 'passed')::integer = 4, 'weekly rewards';
  assert (v_state ->> 'week')::date = v_week, 'week';
  assert (v_state ->> 'ends_at')::timestamptz
    = ((v_week + 7)::timestamp at time zone public.config_text('time.daily_reset_time_zone')), 'ends Monday at midnight';
  assert not v_state::text like '%' || v_threats[1]::text || '%', 'threat id leaked before the start';

  -- The daily Emergenza does not see the week.
  v_daily := public.emergency_state_payload(v_a);
  assert jsonb_typeof(v_daily -> 'run') = 'null', 'daily run';
  assert (v_daily -> 'rules' ->> 'threats_per_run')::integer = public.config_int('emergency.threats_per_run'), 'daily rules';

  -- The squad: all 10, own cards, distinct characters.
  v_failed := false;
  begin perform public.emergency_week_start(v_a, v_squad_a[1:8]);
  exception when others then v_failed := sqlerrm = 'invalid_emergency_week_squad'; end;
  assert v_failed, 'squad of 8';
  v_failed := false;
  begin perform public.emergency_week_start(v_a, v_squad_b);
  exception when others then v_failed := sqlerrm = 'card_not_owned'; end;
  assert v_failed, 'someone else''s cards';
  v_failed := false;
  begin perform public.emergency_week_start(v_a, v_squad_a[1:9] || v_squad_a[1]);
  exception when others then v_failed := sqlerrm = 'duplicate_card'; end;
  assert v_failed, 'same card twice';

  perform public.emergency_week_start(v_a, v_squad_a);

  -- One attempt per week.
  v_failed := false;
  begin perform public.emergency_week_start(v_a, v_squad_a);
  exception when others then v_failed := sqlerrm = 'emergency_week_already_played'; end;
  assert v_failed, 'second attempt';

  -- Only the current threat is revealed; the run's id is the player's own.
  v_state := public.emergency_week_state_payload(v_a);
  assert (v_state -> 'run' -> 'current_threat' ->> 'id')::uuid = v_threats[1], 'current threat';
  assert not v_state::text like '%' || v_threats[2]::text || '%', 'next threat leaked';
  assert (v_state -> 'run' -> 'foreseen_threats') = '[]'::jsonb, 'foreseen without Veggente';
  assert jsonb_array_length(v_state -> 'run' -> 'squad') = 10, 'squad in the state';
  assert (v_state -> 'run' ->> 'id')::uuid = (select id from public.emergency_week_runs where user_id = v_a), 'run id';
  assert public.event_ref_team(v_a, (v_state -> 'run' ->> 'id')::uuid)
    = (select definition_ids from public.emergency_week_runs where user_id = v_a), 'the squad for the events';

  -- Round order, squad membership, arithmetic and score parts are enforced.
  v_failed := false;
  begin perform public.emergency_week_record_play(v_a, 2, v_squad_a[1], 9, 0, 9, 9);
  exception when others then v_failed := sqlerrm = 'round_already_resolved'; end;
  assert v_failed, 'wrong round';
  v_failed := false;
  begin perform public.emergency_week_record_play(v_a, 1, v_squad_b[1], 9, 0, 9, 9);
  exception when others then v_failed := sqlerrm = 'character_not_available'; end;
  assert v_failed, 'card outside the squad';
  v_failed := false;
  begin perform public.emergency_week_record_play(v_a, 1, v_squad_a[1], 9, 0, 99, 9);
  exception when others then v_failed := sqlerrm = 'result_mismatch'; end;
  assert v_failed, 'inconsistent score';
  v_failed := false;
  begin perform public.emergency_week_record_play(v_a, 1, v_squad_a[1], 7, 2, 9, 9,
    '{"power": 1, "carried": 0, "pack": 0, "modifier": 0, "floor": 0}');
  exception when others then v_failed := sqlerrm = 'invalid_play_parts'; end;
  assert v_failed, 'parts that do not add up';

  -- Three passes pay nothing, the fourth pays the first reward; the parts are kept.
  v_state := public.emergency_week_record_play(v_a, 1, v_squad_a[1], 7, 2, 9, 9,
    '{"power": 2, "carried": 0, "pack": 0, "modifier": 0, "floor": 0}');
  assert (v_state -> 'run' -> 'plays' -> 0 -> 'parts' ->> 'power')::integer = 2, format('parts %s', v_state -> 'run' -> 'plays');
  assert (v_state -> 'run' ->> 'current_round')::integer = 2, 'next round';
  perform public.emergency_week_record_play(v_a, 2, v_squad_a[2], 15, 0, 15, 15);
  perform public.emergency_week_record_play(v_a, 3, v_squad_a[3], 20, 0, 20, 20);
  assert not exists (select 1 from public.coin_ledger where user_id = v_a and reason = 'emergency_week_reward'), 'paid too early';

  v_failed := false;
  begin perform public.emergency_week_record_play(v_a, 4, v_squad_a[1], 25, 0, 25, 25);
  exception when others then v_failed := sqlerrm = 'character_already_played'; end;
  assert v_failed, 'character played twice';

  perform public.emergency_week_record_play(v_a, 4, v_squad_a[4], 25, 0, 25, 25);
  assert (select sum(amount) = 20 from public.coin_ledger where user_id = v_a and reason = 'emergency_week_reward'), 'first reward';
  assert not exists (select 1 from public.coin_ledger where user_id = v_a and reason = 'emergency_reward'), 'no daily reward';

  -- Under Rovescio a threat is passed at or under its target.
  update public.emergency_weeks
  set threat_modifiers = jsonb_set(threat_modifiers, '{4}', '{"code": "reverse"}')
  where week = v_week;
  v_state := public.emergency_week_record_play(v_a, 5, v_squad_a[5], 12, 0, 12, 20);
  assert (v_state -> 'run' -> 'plays' -> 4 ->> 'passed')::boolean, 'Rovescio: under the target passes';
  assert (v_state -> 'run' ->> 'passed')::integer = 5, 'five passed';

  -- A Veggente played shows the following threats. The real Veggenti step aside first:
  -- one power per faction (card_definitions_one_power_per_faction).
  update public.card_definitions set power_code = null, power_params = '{}' where power_code = 'foresight';
  update public.card_definitions set power_code = 'foresight', power_params = '{}'
  where id = (select definition_ids[5] from public.emergency_week_runs where user_id = v_a);
  v_state := public.emergency_week_state_payload(v_a);
  assert jsonb_array_length(v_state -> 'run' -> 'foreseen_threats') = 4, format('foreseen %s', v_state -> 'run' -> 'foreseen_threats');
  assert (v_state -> 'run' -> 'foreseen_threats' -> 0 ->> 'round')::integer = 7, 'first foreseen round';

  -- Three failures end the run; a failure pays nothing and nothing more can be played.
  perform public.emergency_week_record_play(v_a, 6, v_squad_a[6], 1, 0, 1, 34);
  perform public.emergency_week_record_play(v_a, 7, v_squad_a[7], 1, 0, 1, 20);
  v_state := public.emergency_week_record_play(v_a, 8, v_squad_a[8], 1, 0, 1, 25);
  assert v_state -> 'run' ->> 'status' = 'finished', 'finished at the third failure';
  assert (v_state -> 'run' ->> 'passed')::integer = 5 and (v_state -> 'run' ->> 'failed')::integer = 3, 'counts';
  assert (v_state -> 'run' ->> 'coins')::integer = 20, 'coins of the run';
  assert jsonb_typeof(v_state -> 'run' -> 'current_threat') = 'null', 'no current threat once finished';
  v_failed := false;
  begin perform public.emergency_week_record_play(v_a, 8, v_squad_a[9], 1, 0, 1, 25);
  exception when others then v_failed := sqlerrm = 'emergency_week_already_played'; end;
  assert v_failed, 'played after the end';

  -- The threats played are seen (Bestiario).
  assert (select count(*) = 8 from public.threat_sightings where user_id = v_a and threat_id = any (v_threats)), 'sightings';

  -- B starts and leaves the run unfinished: not on the leaderboard.
  perform public.emergency_week_start(v_b, v_squad_b);
  perform public.emergency_week_record_play(v_b, 1, v_squad_b[1], 9, 0, 9, 9);
end $$;

-- What players see, through their RPCs only.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000003a1", "role": "authenticated"}', true);

do $$
declare
  v_board jsonb := public.get_emergency_week_leaderboard();
  v_lineups jsonb := public.get_emergency_week_lineups();
  v_general jsonb := public.get_leaderboard('emergency_week', 'week');
  v_failed boolean;
  v_period text;
begin
  assert (v_board ->> 'players')::integer = 1, format('players %s', v_board);
  assert (v_board -> 'me' ->> 'rank')::integer = 1 and (v_board -> 'me' ->> 'passed')::integer = 5, 'my place';
  assert v_board -> 'my_run' ->> 'status' = 'finished', 'my run';
  assert (v_board ->> 'threats_per_run')::integer = 10, 'threats of the week';
  assert jsonb_array_length(v_board -> 'prizes') = 4, format('prize table %s', v_board -> 'prizes');
  assert (v_board -> 'prizes' -> 0 ->> 'packs')::integer = 2 and (v_board -> 'prizes' -> 0 ->> 'coins')::integer = 100, 'first prize';
  assert (v_board -> 'prizes' -> 3 ->> 'from')::integer = 4 and (v_board -> 'prizes' -> 3 ->> 'to')::integer = 10, 'others';
  assert not v_board::text like '%definition%', 'no characters on the board';

  -- A finished: this week's podium, with the 10 cards.
  assert (v_lineups ->> 'live')::boolean, 'live lineups';
  assert jsonb_array_length(v_lineups -> 'lineups') = 1, format('lineups %s', v_lineups);
  assert jsonb_array_length(v_lineups -> 'lineups' -> 0 -> 'cards') = 10, 'ten cards';
  assert (v_lineups -> 'lineups' -> 0 -> 'cards' -> 0 -> 'play' ->> 'round')::integer = 1, 'played first';

  -- The board of the Classifiche: this week only.
  assert (v_general -> 'me' ->> 'value')::numeric = 5 and (v_general -> 'me' ->> 'value2')::numeric > 0, format('board %s', v_general);
  foreach v_period in array array['day', 'all'] loop
    v_failed := false;
    begin
      perform public.get_leaderboard('emergency_week', v_period);
    exception when others then v_failed := sqlerrm = 'leaderboard_period_invalid';
    end;
    assert v_failed, format('emergency_week %s', v_period);
  end loop;
  assert exists (select 1 from jsonb_array_elements(public.get_my_leaderboard_places()) p
                 where p ->> 'board' = 'emergency_week' and p ->> 'period' = 'week' and (p ->> 'rank')::integer = 1), 'my places';

  -- Clients read nothing directly and call no service function.
  begin
    perform 1 from public.emergency_week_runs;
    raise exception 'ASSERT: a client read the runs';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.emergency_weeks;
    raise exception 'ASSERT: a client read the threats of the week';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.emergency_week_state_payload('00000000-0000-4000-8000-0000000003a1');
    raise exception 'ASSERT: a client called a service function';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.emergency_week_record_play('00000000-0000-4000-8000-0000000003a1', 9, null, 1, 0, 1, 1);
    raise exception 'ASSERT: a client recorded a play';
  exception when insufficient_privilege then null;
  end;
end $$;

-- B has not finished: no place, and last week's podium (none) instead of this week's.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000003a2", "role": "authenticated"}', true);

do $$
declare
  v_board jsonb := public.get_emergency_week_leaderboard();
  v_lineups jsonb := public.get_emergency_week_lineups();
begin
  assert jsonb_typeof(v_board -> 'me') = 'null', 'unfinished run ranked';
  assert v_board -> 'my_run' ->> 'status' = 'active' and (v_board -> 'my_run' ->> 'current_round')::integer = 2, 'run in progress';
  assert not (v_lineups ->> 'live')::boolean, 'live lineups before finishing';
  assert (v_lineups ->> 'week')::date = (v_board ->> 'week')::date - 7, 'last week';
end $$;

reset role;

-- Closing the weeks that are over: prizes by place, paid once, never the week in progress.
do $$
declare
  v_week date := public.game_week(public.game_day());
begin
  insert into auth.users (id, aud, role, email, created_at, updated_at)
  select format('00000000-0000-4000-8000-0000000004%s', lpad(n::text, 2, '0'))::uuid,
    'authenticated', 'authenticated', format('ewp-%s@example.test', n), now(), now()
  from generate_series(1, 12) n;
  insert into public.profiles (id, username)
  select format('00000000-0000-4000-8000-0000000004%s', lpad(n::text, 2, '0'))::uuid, format('ewp_user_%s', lpad(n::text, 2, '0'))
  from generate_series(1, 12) n;

  -- Two weeks long over: twelve finished runs on the first, two, a run with nothing passed
  -- and an unfinished one on the second. Last week too, for the weekly title.
  insert into public.emergency_weeks (week, threat_ids, threat_levels) values
    ('2020-01-06', '{}', '{}'), ('2020-01-13', '{}', '{}'), (v_week - 7, '{}', '{}');
  insert into public.emergency_week_runs (user_id, week, card_instance_ids, definition_ids, status, passed, failed, total_score, finished_at)
  select format('00000000-0000-4000-8000-0000000004%s', lpad(n::text, 2, '0'))::uuid, '2020-01-06', '{}', '{}', 'finished',
    case when n <= 2 then 10 when n = 3 then 6 else 3 end, 3, 300 - n * 10,
    '2020-01-08 12:00:00+00'::timestamptz + n * interval '1 minute'
  from generate_series(1, 12) n;
  insert into public.emergency_week_runs (user_id, week, card_instance_ids, definition_ids, status, passed, failed, total_score, finished_at) values
    ('00000000-0000-4000-8000-000000000401', '2020-01-13', '{}', '{}', 'finished', 2, 3, 40, '2020-01-14 10:00:00+00'),
    ('00000000-0000-4000-8000-000000000402', '2020-01-13', '{}', '{}', 'finished', 1, 3, 20, '2020-01-14 11:00:00+00'),
    ('00000000-0000-4000-8000-000000000403', '2020-01-13', '{}', '{}', 'finished', 0, 3, 5, '2020-01-14 12:00:00+00'),
    ('00000000-0000-4000-8000-000000000404', '2020-01-13', '{}', '{}', 'active', 6, 0, 150, null),
    ('00000000-0000-4000-8000-000000000405', v_week - 7, '{}', '{}', 'finished', 7, 3, 200, now() - interval '8 days');
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000401", "role": "authenticated"}', true);

do $$
declare
  v_prizes jsonb := public.get_emergency_week_prizes();
  v_again jsonb := public.get_emergency_week_prizes();
  v_claim jsonb;
  v_failed boolean;
begin
  -- The first player of both weeks: two prizes, oldest first.
  assert jsonb_array_length(v_prizes) = 2, format('my prizes %s', v_prizes);
  assert v_prizes -> 0 ->> 'week' = '2020-01-06' and (v_prizes -> 0 ->> 'rank')::integer = 1, 'first week first';
  assert (v_prizes -> 0 ->> 'coins')::integer = 100 and (v_prizes -> 0 ->> 'packs')::integer = 2, 'first place prize';
  assert (v_prizes -> 0 ->> 'players')::integer = 12 and (v_prizes -> 0 ->> 'passed')::integer = 10, 'the run';
  assert v_again = v_prizes, 'closing twice writes nothing more';

  begin
    perform 1 from public.emergency_week_prizes;
    raise exception 'ASSERT: a client read the prizes';
  exception when insufficient_privilege then null;
  end;

  -- Claimed once: coins in the ledger and two opened packs.
  v_claim := public.claim_emergency_week_prize((v_prizes -> 0 ->> 'id')::uuid);
  assert (v_claim ->> 'coins')::integer = 100, 'claimed coins';
  assert jsonb_array_length(v_claim -> 'opening_ids') = 2, 'two packs opened';
  v_failed := false;
  begin
    perform public.claim_emergency_week_prize((v_prizes -> 0 ->> 'id')::uuid);
  exception when others then v_failed := sqlerrm = 'emergency_prize_already_claimed';
  end;
  assert v_failed, 'claimed twice';
  assert jsonb_array_length(public.get_emergency_week_prizes()) = 1, 'one prize left';
  -- A daily prize is not a weekly one.
  v_failed := false;
  begin
    perform public.claim_emergency_prize((v_prizes -> 1 ->> 'id')::uuid);
  exception when others then v_failed := sqlerrm = 'emergency_prize_not_found';
  end;
  assert v_failed, 'weekly prize claimed as a daily one';
end $$;

-- Someone else's prize cannot be claimed.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000402", "role": "authenticated"}', true);

do $$
declare
  v_failed boolean := false;
begin
  begin
    perform public.claim_emergency_week_prize((
      select p.id from public.emergency_week_prizes p
      where p.user_id = '00000000-0000-4000-8000-000000000401' and p.week = '2020-01-13'
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
  v_user uuid := '00000000-0000-4000-8000-000000000401';
  v_opening uuid := (select (opening_ids)[1] from public.emergency_week_prizes where user_id = v_user and week = '2020-01-06');
  v_week date := public.game_week(public.game_day());
  v_award public.leaderboard_awards;
begin
  -- The first week: the first ten, by threats passed, score and who finished first.
  assert (select count(*) from public.emergency_week_prizes where week = '2020-01-06') = 10, 'ten prizes';
  assert (select array_agg(coins order by rank) from public.emergency_week_prizes where week = '2020-01-06')
    = array[100, 50, 0, 50, 50, 50, 50, 50, 50, 50], 'coins by place';
  assert (select array_agg(packs order by rank) from public.emergency_week_prizes where week = '2020-01-06')
    = array[2, 1, 1, 0, 0, 0, 0, 0, 0, 0], 'packs by place';
  assert (select user_id from public.emergency_week_prizes where week = '2020-01-06' and rank = 2)
    = '00000000-0000-4000-8000-000000000402', 'score breaks the tie';

  -- The second week: no prize without a threat passed, none for a run left unfinished.
  assert (select array_agg(rank order by rank) from public.emergency_week_prizes where week = '2020-01-13') = array[1, 2],
    'second week';

  -- This week stays open until Sunday midnight; last week closes with the others.
  assert not exists (select 1 from public.emergency_week_prize_weeks where week = v_week), 'this week closed';
  assert exists (select 1 from public.emergency_week_prizes where week = v_week - 7
    and user_id = '00000000-0000-4000-8000-000000000405' and rank = 1), 'last week prized';

  -- The claim is in the ledger and the packs are Emergenza prizes.
  assert (select sum(amount) from public.coin_ledger where user_id = v_user and reason = 'emergency_week_prize') = 100, 'ledger';
  assert (select pack_type from public.pack_openings where id = v_opening) = 'emergency', 'pack type';

  -- Last week's first gets the weekly title «Eroe della settimana».
  delete from public.leaderboard_awards where week = v_week - 7;
  delete from public.leaderboard_weeks where week = v_week - 7;
  perform public.leaderboard_close_week();
  select * into v_award from public.leaderboard_awards where week = v_week - 7 and board = 'emergency_week';
  assert v_award.user_id = '00000000-0000-4000-8000-000000000405' and v_award.title = 'Eroe della settimana',
    format('award %s', v_award);
  assert (select title = 'Eroe della settimana' from public.profiles where id = '00000000-0000-4000-8000-000000000405'),
    'title shown';
end $$;

-- An admin keeps the weekly tiers in order and reachable.
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000003a1');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000003a1", "role": "authenticated"}', true);

do $$
declare
  v_payload jsonb;
  v_failed boolean;
begin
  v_payload := public.admin_save_match_rewards('[]', '{"emergency_week.rewards.tier3_coins": 60, "emergency_week.prizes.rank3_coins": 25}');
  assert (v_payload -> 'settings' ->> 'emergency_week.rewards.tier3_coins')::integer = 60, 'saved weekly reward';
  assert (v_payload -> 'settings' ->> 'emergency_week.prizes.rank3_coins')::integer = 25, 'saved weekly prize';
  assert (v_payload ->> 'emergency_week_threats_per_run')::integer = 10, 'weekly threats';
  foreach v_payload in array array[
    '{"emergency_week.rewards.tier2_passed": 3}'::jsonb,
    '{"emergency_week.rewards.tier3_passed": 11}'::jsonb,
    '{"emergency_week.prizes.rank1_packs": 4}'::jsonb
  ] loop
    v_failed := false;
    begin
      perform public.admin_save_match_rewards('[]', v_payload);
    exception when others then
      v_failed := sqlerrm in ('invalid_match_rewards', 'invalid_emergency_week_tiers');
    end;
    assert v_failed, format('accepted %s', v_payload);
  end loop;
end $$;

reset role;

rollback;
