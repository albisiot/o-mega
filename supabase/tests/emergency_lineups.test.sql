-- Integration test for the lineups of the Emergenza podium (SPEC §5.10): today's
-- only for a player whose attempt is finished, yesterday's otherwise.
-- Runs inside a rolled-back transaction:
--   npm run test:db

begin;

update public.game_config set value = '3' where key = 'emergency.lineups_shown';

-- Other runs of these days would change the podium below.
delete from public.emergency_plays;
delete from public.emergency_runs;
insert into public.emergency_days (day, threat_ids, threat_levels) values
  (public.game_day(), '{}', '{}'), (public.game_day() - 1, '{}', '{}')
on conflict do nothing;

insert into auth.users (id, aud, role, email, created_at, updated_at)
select format('00000000-0000-4000-8000-0000000003%s', lpad(n::text, 2, '0'))::uuid,
  'authenticated', 'authenticated', format('el-%s@example.test', n), now(), now()
from generate_series(1, 5) n;
insert into public.profiles (id, username)
select format('00000000-0000-4000-8000-0000000003%s', lpad(n::text, 2, '0'))::uuid, format('el_user_%s', n)
from generate_series(1, 5) n;

-- Eight characters, the first with an artwork variant; player 1 fields that variant.
create temp table lineup_defs on commit drop as
select d.id, row_number() over (order by exists (
    select 1 from public.card_variants v where v.definition_id = d.id and v.is_active
  ) desc, d.code)::integer as k
from public.card_definitions d
order by k
limit 8;
-- The checks below run as a player.
grant select on lineup_defs to authenticated;

insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
select d.id, format('00000000-0000-4000-8000-0000000003%s', lpad(n::text, 2, '0'))::uuid, 'pack',
  case when n = 1 and d.k = 1 then (
    select v.id from public.card_variants v where v.definition_id = d.id and v.is_active order by v.style limit 1
  ) end
from lineup_defs d cross join generate_series(1, 5) n;

-- Today: players 1 to 4 finished, in this order; player 5 is still playing.
-- Yesterday: player 3 first, then player 2.
insert into public.emergency_runs (user_id, day, card_instance_ids, definition_ids, status, passed, failed, total_score, finished_at)
select u.id, x.day,
  (select array_agg(i.id order by d.k) from lineup_defs d join public.card_instances i on i.definition_id = d.id and i.owner_id = u.id),
  (select array_agg(d.id order by d.k) from lineup_defs d),
  x.status, x.passed, 3, x.passed * 20, case when x.status = 'finished' then now() end
from (values
  (1, public.game_day(), 'finished', 8),
  (2, public.game_day(), 'finished', 6),
  (3, public.game_day(), 'finished', 4),
  (4, public.game_day(), 'finished', 2),
  (5, public.game_day(), 'active', 1),
  (3, public.game_day() - 1, 'finished', 7),
  (2, public.game_day() - 1, 'finished', 5)
) as x(n, day, status, passed)
join lateral (select format('00000000-0000-4000-8000-0000000003%s', lpad(x.n::text, 2, '0'))::uuid as id) u on true;

-- Player 1 played the third card first, then the first one (the variant).
insert into public.emergency_plays (run_id, round, threat_id, card_instance_id, definition_id, base_score, bonus, score, required_score, passed)
select r.id, p.round, (select t.id from public.threat_definitions t order by t.code limit 1),
  r.card_instance_ids[p.slot], r.definition_ids[p.slot], 20, 0, 20, 7, true
from public.emergency_runs r
cross join (values (1, 3), (2, 1)) as p(round, slot)
where r.user_id = '00000000-0000-4000-8000-000000000301' and r.day = public.game_day();

-- Players cannot call game_day(): the checks read it from here.
select set_config('test.today', public.game_day()::text, true);

set local role authenticated;

-- Player 4 has finished today: today's podium.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000304", "role": "authenticated"}', true);

do $$
declare
  v jsonb := public.get_emergency_lineups();
  v_first jsonb := v -> 'lineups' -> 0;
begin
  assert (v ->> 'live')::boolean and (v ->> 'day')::date = current_setting('test.today')::date, format('live %s', v ->> 'live');
  assert jsonb_array_length(v -> 'lineups') = 3, format('lineups %s', jsonb_array_length(v -> 'lineups'));
  assert v_first ->> 'username' = 'el_user_1' and (v_first ->> 'rank')::integer = 1, 'first place';
  assert v -> 'lineups' -> 2 ->> 'username' = 'el_user_3', 'third place';
  assert not exists (select 1 from jsonb_array_elements(v -> 'lineups') l where (l ->> 'is_me')::boolean), 'fourth not shown';
  assert jsonb_array_length(v_first -> 'cards') = 8, 'eight cards';
  -- In the order played, then the cards never reached.
  assert (v_first -> 'cards' -> 0 -> 'play' ->> 'round')::integer = 1, 'first play first';
  assert v_first -> 'cards' -> 0 ->> 'definition_id' = (select id::text from lineup_defs where k = 3), 'third card played first';
  assert v_first -> 'cards' -> 1 ->> 'definition_id' = (select id::text from lineup_defs where k = 1), 'then the first';
  assert v_first -> 'cards' -> 2 -> 'play' = 'null'::jsonb, 'not played';
  assert v_first -> 'cards' -> 0 -> 'play' ->> 'threat' is not null, 'the threat faced';
  -- Drawn as fielded: the variant of player 1, the base for player 2.
  assert v_first -> 'cards' -> 1 -> 'variant' is not null and jsonb_typeof(v_first -> 'cards' -> 1 -> 'variant') = 'object',
    format('variant %s', v_first -> 'cards' -> 1);
  assert jsonb_typeof(v -> 'lineups' -> 1 -> 'cards' -> 0 -> 'variant') is distinct from 'object', 'base art';

  begin
    perform public.emergency_lineups_payload(current_setting('test.today')::date, null);
    raise exception 'ASSERT: a client called the payload';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Player 5 is still playing today: only yesterday's podium.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000305", "role": "authenticated"}', true);

do $$
declare
  v jsonb := public.get_emergency_lineups();
begin
  assert not (v ->> 'live')::boolean and (v ->> 'day')::date = current_setting('test.today')::date - 1, format('yesterday %s', v ->> 'day');
  assert jsonb_array_length(v -> 'lineups') = 2, 'two players yesterday';
  assert v -> 'lineups' -> 0 ->> 'username' = 'el_user_3', 'yesterday''s first';
end $$;

reset role;
update public.game_config set value = '1' where key = 'emergency.lineups_shown';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000304", "role": "authenticated"}', true);

do $$
begin
  assert jsonb_array_length(public.get_emergency_lineups() -> 'lineups') = 1, 'lineups_shown';
end $$;

reset role;

rollback;
