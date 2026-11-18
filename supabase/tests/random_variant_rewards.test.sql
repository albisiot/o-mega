-- Integration test for the reward of random variants (20261118233000_random_variant_rewards.sql):
-- the rule is checked, the draw gives different variants and the player's missing
-- ones first, and bonus codes, event targets, daily objectives and imprese pay it
-- with the rest of their reward. Runs inside a transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000004a1', 'authenticated', 'authenticated', 'random-admin@example.test',
   '{"full_name": "Random Admin"}', now(), now()),
  ('00000000-0000-4000-8000-0000000004a2', 'authenticated', 'authenticated', 'random-player@example.test',
   '{"full_name": "Random Player"}', now(), now());

-- A style with three variants or more, and the rarity of one of them.
do $$
begin
  perform set_config('test.style', (
    select v.style from public.card_variants v join public.card_definitions d on d.id = v.definition_id
    where v.is_active and d.is_active and d.unlock_level is null
    group by v.style having count(*) >= 3 order by v.style limit 1), false);
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000004a2", "role": "authenticated"}', true);
do $$ begin perform public.bootstrap_player(); end $$;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000004a1", "role": "authenticated"}', true);
do $$ begin perform public.bootstrap_player(); end $$;
reset role;
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000004a1');

-- The rule: none, tidy, or refused.
do $$
declare
  v_spec jsonb;
begin
  assert public.random_variants_spec(null) is null and public.random_variants_spec('{"count": 0}') is null, 'no rule';
  v_spec := public.random_variants_spec(jsonb_build_object(
    'count', 2, 'styles', jsonb_build_array(current_setting('test.style'), current_setting('test.style'))));
  assert v_spec = jsonb_build_object('count', 2, 'styles', jsonb_build_array(current_setting('test.style')), 'rarities', '[]'::jsonb),
    format('tidy rule %s', v_spec);
  begin
    perform public.random_variants_spec('{"count": 6}');
    raise exception 'ASSERT: 6 variants accepted';
  exception when raise_exception then
    assert sqlerrm = 'invalid_random_variants', sqlerrm;
  end;
  begin
    perform public.random_variants_spec('{"count": 1, "styles": ["nope"]}');
    raise exception 'ASSERT: an unknown style accepted';
  exception when raise_exception then
    assert sqlerrm = 'invalid_random_variants', sqlerrm;
  end;
  begin
    perform public.random_variants_spec('{"count": 1, "rarities": ["nope"]}');
    raise exception 'ASSERT: an unknown rarity accepted';
  exception when raise_exception then
    assert sqlerrm = 'invalid_random_variants', sqlerrm;
  end;
  -- A style and a rarity with fewer than 5 variants: a rule of 5 cannot be met.
  begin
    perform public.random_variants_spec((
      select jsonb_build_object('count', 5, 'styles', jsonb_build_array(v.style), 'rarities', jsonb_build_array(d.rarity_code))
      from public.card_variants v join public.card_definitions d on d.id = v.definition_id
      where v.is_active and d.is_active and d.unlock_level is null
      group by v.style, d.rarity_code having count(*) < 5
      order by v.style, d.rarity_code limit 1));
    raise exception 'ASSERT: more variants than the rule can find';
  exception when raise_exception then
    assert sqlerrm = 'random_variants_empty', sqlerrm;
  end;
  assert (public.random_variants_payload(v_spec) ->> 'count')::integer = 2
     and jsonb_array_length(public.random_variants_payload(v_spec) -> 'styles') = 1, 'payload';
end $$;

-- The draw: owning all the style's variants but one, a rule of one gives that one.
insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
select v.definition_id, '00000000-0000-4000-8000-0000000004a2', 'pack', v.id
from public.card_variants v join public.card_definitions d on d.id = v.definition_id
where v.style = current_setting('test.style') and v.is_active and d.is_active and d.unlock_level is null
order by v.id offset 1;
do $$
declare
  v_missing uuid := (
    select v.id from public.card_variants v join public.card_definitions d on d.id = v.definition_id
    where v.style = current_setting('test.style') and v.is_active and d.is_active and d.unlock_level is null
    order by v.id limit 1);
  v_given uuid;
begin
  select i.variant_id into v_given
  from public.grant_random_variants('00000000-0000-4000-8000-0000000004a2',
         jsonb_build_object('count', 1, 'styles', jsonb_build_array(current_setting('test.style'))), 'event') g
  join public.card_instances i on i.id = g.instance_id;
  assert v_given = v_missing, format('gave %s instead of the missing %s', v_given, v_missing);
  assert (select count(*) from public.card_transfers t
          join public.card_instances i on i.id = t.instance_id
          where i.variant_id = v_missing and t.to_user = '00000000-0000-4000-8000-0000000004a2' and t.reason = 'event') = 1,
    'logged in card_transfers';
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000004a1", "role": "authenticated"}', true);

-- The editors: a code, an event target, an objective and an impresa of random variants alone.
do $$
declare
  v_start timestamp := (now() at time zone 'Europe/Rome') + interval '720 days';
  v_list jsonb;
  v_card text := (
    select d.code || ':' || v.style from public.card_variants v join public.card_definitions d on d.id = v.definition_id
    where v.is_active and d.is_active and d.unlock_level is null order by d.code, v.style limit 1);
begin
  begin
    perform public.admin_create_bonus_code('RANDOMBAD', 0, 0, '{}', null, null, null, '{"count": 9}');
    raise exception 'ASSERT: a bad rule accepted on a code';
  exception when raise_exception then
    assert sqlerrm = 'invalid_random_variants', sqlerrm;
  end;
  v_list := public.admin_create_bonus_code(
    'RANDOMTWO', 0, 0, '{}', null, null, null, jsonb_build_object('count', 2, 'styles', jsonb_build_array(current_setting('test.style'))));
  assert exists (
    select 1 from jsonb_array_elements(v_list -> 'codes') c
    where c ->> 'code' = 'RANDOMTWO' and (c -> 'random_variants' ->> 'count')::integer = 2
  ), 'code saved with its rule';

  v_list := public.admin_save_event('Premio a caso', '', v_start, v_start + interval '2 days',
    '{"bot": {"win": 10}}', '[{"points": 10, "random_variants": {"count": 1}}]');
  assert exists (
    select 1 from jsonb_array_elements(v_list -> 'events') e, jsonb_array_elements(e -> 'tiers') t
    where e ->> 'title' = 'Premio a caso' and (t -> 'random_variants' ->> 'count')::integer = 1
  ), 'event target saved with its rule';

  v_list := public.admin_save_daily_objective(null, 'Vinci 2 partite a caso', 'easy', 'matches_won', '{}', 2, 0, 0, '{"count": 1}');
  assert exists (
    select 1 from jsonb_array_elements(v_list -> 'objectives') o
    where o ->> 'title' = 'Vinci 2 partite a caso' and (o -> 'random_variants' ->> 'count')::integer = 1
  ), 'objective saved with its rule';
  assert jsonb_array_length(v_list -> 'variant_styles') > 0 and jsonb_array_length(v_list -> 'rarities') > 0, 'objective lists';

  -- Reward cards are chosen in the editor too, and checked.
  v_list := public.admin_save_daily_objective(null, 'Vinci 3 partite con carta', 'easy', 'matches_won', '{}', 3, 0, 0, null,
    array[v_card]);
  assert exists (
    select 1 from jsonb_array_elements(v_list -> 'objectives') o
    where o ->> 'title' = 'Vinci 3 partite con carta' and o -> 'card_codes' = jsonb_build_array(v_card)
  ), 'objective saved with its card';
  begin
    perform public.admin_save_daily_objective(null, 'Carta che non esiste', 'easy', 'matches_won', '{}', 3, 0, 0, null,
      array['NOPE']);
    raise exception 'ASSERT: an unknown card accepted';
  exception when raise_exception then
    assert sqlerrm = 'invalid_objective', sqlerrm;
  end;

  v_list := public.admin_save_achievement(null, jsonb_build_object(
    'name', 'Caccia premiata', 'description', 'Hai giocato 1 partita.', 'tier', 'bronze',
    'metric', 'matches_played', 'params', '{}'::jsonb, 'target', 1, 'coins', 0, 'packs', 0, 'counts_past', true,
    'random_variants', jsonb_build_object('count', 1, 'styles', jsonb_build_array(current_setting('test.style')))));
  assert exists (
    select 1 from jsonb_array_elements(v_list -> 'achievements') a
    where a ->> 'name' = 'Caccia premiata' and (a -> 'random_variants' ->> 'count')::integer = 1
  ), 'impresa saved with its rule';
end $$;

-- Paid: the code.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000004a2", "role": "authenticated"}', true);
do $$
declare
  v_result jsonb := public.redeem_bonus_code('randomtwo');
  v_cards jsonb := v_result -> 'openings' -> 0 -> 'cards';
begin
  assert (v_result ->> 'cards')::integer = 2 and jsonb_array_length(v_cards) = 2, format('code %s', v_result);
  assert (select count(distinct c ->> 'instance_id') from jsonb_array_elements(v_cards) c
          where c -> 'variant' ->> 'style' = current_setting('test.style')) = 2, format('code cards %s', v_cards);
  assert (v_cards -> 0 -> 'variant' ->> 'name') is distinct from null, 'variant named';
end $$;

reset role;

-- Paid: the event target.
do $$
declare
  v_tier public.event_tiers;
  v_opening uuid;
begin
  select t.* into v_tier from public.event_tiers t join public.events e on e.id = t.event_id where e.title = 'Premio a caso';
  perform public.grant_event_tier('00000000-0000-4000-8000-0000000004a2', v_tier);
  select r.opening_ids[1] into v_opening from public.event_rewards r
  where r.event_id = v_tier.event_id and r.user_id = '00000000-0000-4000-8000-0000000004a2';
  assert (
    select count(*) from public.pack_openings o
    cross join lateral unnest(o.card_instance_ids) as u(id)
    join public.card_instances i on i.id = u.id
    where o.id = v_opening and i.variant_id is not null
  ) = 1, 'event target paid one variant';
end $$;

-- Paid: an objective of today, completed.
insert into public.daily_objective_days (user_id, day)
values ('00000000-0000-4000-8000-0000000004a2', public.game_day()) on conflict do nothing;
insert into public.daily_objectives (id, user_id, day, slot, definition_code, difficulty, title, metric, params, target,
                                     progress, coins, packs, completed_at, random_variants)
select '00000000-0000-4000-8000-0000000004c1', '00000000-0000-4000-8000-0000000004a2', public.game_day(), 20, d.code,
       d.difficulty, d.title, d.metric, d.params, 1, 1, 0, 0, now(), d.random_variants
from public.daily_objective_definitions d where d.title = 'Vinci 2 partite a caso';

-- Completed: the impresa.
do $$
declare
  v_achievement public.achievements;
begin
  select * into v_achievement from public.achievements where name = 'Caccia premiata';
  assert public.complete_achievement('00000000-0000-4000-8000-0000000004a2', v_achievement, true), 'impresa completed';
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000004a2", "role": "authenticated"}', true);
do $$
declare
  v_today jsonb := public.get_daily_objectives();
  v_claim jsonb;
  v_board jsonb;
  v_id uuid := (select a.id from public.achievements a where a.name = 'Caccia premiata');
begin
  assert exists (
    select 1 from jsonb_array_elements(v_today -> 'objectives') o
    where o ->> 'id' = '00000000-0000-4000-8000-0000000004c1' and (o -> 'random_variants' ->> 'count')::integer = 1
  ), format('objective shows its rule %s', v_today);
  v_claim := public.claim_daily_objective('00000000-0000-4000-8000-0000000004c1');
  assert jsonb_array_length(v_claim -> 'opening_ids') = 1, format('objective paid %s', v_claim);

  v_board := public.get_achievements();
  assert exists (
    select 1 from jsonb_array_elements(v_board -> 'achievements') a
    where (a ->> 'id')::uuid = v_id and (a -> 'random_variants' ->> 'count')::integer = 1
      and a -> 'random_variants' -> 'styles' is not null
  ), 'impresa shows its rule';
  v_claim := public.claim_achievement(v_id);
  assert jsonb_array_length(v_claim -> 'opening_ids') = 1, format('impresa paid %s', v_claim);
end $$;

reset role;
do $$
begin
  assert (
    select count(*) from public.pack_openings o
    cross join lateral unnest(o.card_instance_ids) as u(id)
    join public.card_instances i on i.id = u.id
    where o.user_id = '00000000-0000-4000-8000-0000000004a2' and o.pack_type in ('objective', 'achievement')
      and i.variant_id is not null
  ) = 2, 'objective and impresa paid one variant each';
end $$;

rollback;
