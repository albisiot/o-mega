-- Integration test for counting variants (20261118234000_variant_counts.sql): event
-- points for the variants in the team, the objectives "variants found" and "wins
-- with a variant", the imprese of complete styles and characters. Runs inside a
-- transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000005a1', 'authenticated', 'authenticated', 'count-admin@example.test',
   '{"full_name": "Count Admin"}', now(), now()),
  ('00000000-0000-4000-8000-0000000005a2', 'authenticated', 'authenticated', 'count-player@example.test',
   '{"full_name": "Count Player"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000005a2", "role": "authenticated"}', true);
do $$ begin perform public.bootstrap_player(); end $$;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000005a1", "role": "authenticated"}', true);
do $$ begin perform public.bootstrap_player(); end $$;
reset role;
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000005a1');

-- No real event runs during the test.
update public.events set is_active = false where is_active and starts_at <= now() and ends_at > now();

-- The editors: the new metrics and the bonus are accepted and checked.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000005a1", "role": "authenticated"}', true);
do $$
declare
  v_start timestamp := (now() at time zone 'Europe/Rome') + interval '740 days';
  v_list jsonb;
begin
  begin
    perform public.admin_save_event('Bonus sbagliato', '', v_start, v_start + interval '2 days',
      '{"bot": {"win": 10}}', '[{"points": 10, "coins": 10}]', p_variant_bonus_percent => 0);
    raise exception 'ASSERT: a bonus of 0 accepted';
  exception when raise_exception then
    assert sqlerrm = 'event_invalid_variant_bonus', sqlerrm;
  end;
  v_list := public.admin_save_event('Bonus futuro', '', v_start, v_start + interval '2 days',
    '{"bot": {"win": 10}}', '[{"points": 10, "coins": 10}]', p_variant_bonus_percent => 20);
  assert exists (
    select 1 from jsonb_array_elements(v_list -> 'events') e
    where e ->> 'title' = 'Bonus futuro' and (e ->> 'variant_bonus_percent')::integer = 20
  ), 'event saved with its bonus';

  v_list := public.admin_save_daily_objective(null, 'Trova 3 varianti', 'easy', 'variants_found', '{}', 3, 20, 0);
  v_list := public.admin_save_daily_objective(null, 'Vinci con una variante', 'easy', 'variant_wins', '{"opponent": "bot"}', 1, 20, 0);
  assert (select count(*) from jsonb_array_elements(v_list -> 'objectives') o
          where o ->> 'metric' in ('variants_found', 'variant_wins')) = 2, 'objectives saved';
  begin
    perform public.admin_save_daily_objective(null, 'Filtro sbagliato', 'easy', 'variants_found', '{"opponent": "bot"}', 3, 20, 0);
    raise exception 'ASSERT: a filter on variants_found accepted';
  exception when raise_exception then
    assert sqlerrm = 'invalid_objective', sqlerrm;
  end;

  v_list := public.admin_save_achievement(null, jsonb_build_object(
    'name', 'Stile completo', 'description', 'Hai tutte le varianti di uno stile.', 'tier', 'gold',
    'metric', 'variant_styles_complete', 'params', '{}'::jsonb, 'target', 1, 'coins', 10, 'packs', 0, 'counts_past', true));
  v_list := public.admin_save_achievement(null, jsonb_build_object(
    'name', 'Personaggio completo', 'description', 'Hai tutte le varianti di un personaggio.', 'tier', 'silver',
    'metric', 'variant_characters_complete', 'params', '{}'::jsonb, 'target', 1, 'coins', 10, 'packs', 0, 'counts_past', true));
  assert (select count(*) from jsonb_array_elements(v_list -> 'achievements') a
          where a ->> 'metric' in ('variant_styles_complete', 'variant_characters_complete')) = 2, 'imprese saved';
end $$;
reset role;

-- Imprese: owning every variant of a style completes one style; of a character, one character.
-- Only characters that packs can give count (20261119240000_held_back_cards.sql).
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000005a2';
  v_style text := (
    select v.style from public.card_variants v join public.card_definitions d on d.id = v.definition_id
    where v.is_active and public.is_pack_card(d) group by v.style order by count(*), v.style limit 1);
  v_styles_before integer := public.achievement_progress(v_user, 'variant_styles_complete', '{}', null);
  v_characters_before integer := public.achievement_progress(v_user, 'variant_characters_complete', '{}', null);
begin
  insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
  select v.definition_id, v_user, 'pack', v.id
  from public.card_variants v join public.card_definitions d on d.id = v.definition_id
  where v.style = v_style and v.is_active and public.is_pack_card(d);
  assert public.achievement_progress(v_user, 'variant_styles_complete', '{}', null) = v_styles_before + 1,
    'one style completed';
  -- The style's characters with a single variant are complete too.
  assert public.achievement_progress(v_user, 'variant_characters_complete', '{}', null) = v_characters_before + (
    select count(*) from public.card_variants v join public.card_definitions d on d.id = v.definition_id
    where v.style = v_style and v.is_active and public.is_pack_card(d)
      and (select count(*) from public.card_variants w where w.definition_id = v.definition_id and w.is_active) = 1
  ), 'characters completed';
end $$;

-- Objectives of today for the player: the two new ones, nothing else drawn.
insert into public.daily_objective_days (user_id, day) values ('00000000-0000-4000-8000-0000000005a2', public.game_day())
on conflict do nothing;
insert into public.daily_objectives (id, user_id, day, slot, definition_code, difficulty, title, metric, params, target,
                                     coins, packs)
select case d.metric when 'variants_found' then '00000000-0000-4000-8000-0000000005c1'::uuid
                     else '00000000-0000-4000-8000-0000000005c2'::uuid end,
       '00000000-0000-4000-8000-0000000005a2', public.game_day(),
       case d.metric when 'variants_found' then 19 else 20 end,
       d.code, d.difficulty, d.title, d.metric, d.params, d.target, 20, 0
from public.daily_objective_definitions d where d.title in ('Trova 3 varianti', 'Vinci con una variante');

-- A pack at 100%: its variants count for "Trova 3 varianti".
update public.game_config set value = '100' where key = 'packs.variant_chance_percent';
do $$
declare
  v_opening uuid := public.open_pack('00000000-0000-4000-8000-0000000005a2', 'standard');
  v_found integer;
begin
  select count(*) into v_found
  from public.pack_openings o cross join lateral unnest(o.card_instance_ids) as u(id)
  join public.card_instances i on i.id = u.id
  where o.id = v_opening and i.variant_id is not null;
  assert (select progress from public.daily_objectives where id = '00000000-0000-4000-8000-0000000005c1') = least(3, v_found),
    format('variants found: %s in the pack', v_found);
end $$;

-- An event at 10 points a bot win, +50% per variant; a bot match won with 2 variants among 5 copies.
insert into public.events (id, title, starts_at, ends_at, points, variant_bonus_percent)
values ('00000000-0000-4000-8000-0000000005e1', 'Bonus di prova', now() - interval '1 hour', now() + interval '1 hour',
        public.event_points_rules('{"bot": {"win": 10}}'), 50);
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000005a2';
  v_threats uuid[];
  v_levels integer[];
  v_cards uuid[];
  v_instances uuid[] := '{}';
  v_instance uuid;
  v_match uuid;
  v_index integer := 0;
  v_card uuid;
begin
  select array_agg(id order by level, code), array_agg(level order by level, code) into v_threats, v_levels
  from (select distinct on (level) id, level, code from public.threat_definitions
        where region = 'megara' and level <= 5 order by level, code) t;
  -- Five characters with a variant: two copies with it, three without.
  select array_agg(x.id order by x.code) into v_cards
  from (select d.id, d.code from public.card_definitions d
        where d.is_active and d.unlock_level is null
          and exists (select 1 from public.card_variants v where v.definition_id = d.id and v.is_active)
        order by d.code limit 5) x;
  foreach v_card in array v_cards loop
    v_index := v_index + 1;
    insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
    values (v_card, v_user, 'pack', case when v_index <= 2 then (
      select v.id from public.card_variants v where v.definition_id = v_card and v.is_active order by v.style limit 1) end)
    returning id into v_instance;
    v_instances := v_instances || v_instance;
  end loop;
  assert public.event_ref_team_variants(v_user, gen_random_uuid()) = 0, 'no team, no variants';

  insert into public.matches (mode, bot_difficulty, player_a, threat_ids, threat_levels)
  values ('bot', 'easy', v_user, v_threats, v_levels) returning id into v_match;
  insert into public.match_teams (match_id, side, user_id, definition_ids, card_instance_ids)
  values (v_match, 'a', v_user, v_cards, v_instances);
  assert public.event_ref_team_variants(v_user, v_match) = 2, 'two variants in the team';
  perform public.finish_match(v_match, 'a', 'completed');

  assert (select sum(points) from public.event_points where ref_id = v_match) = 20,
    format('points with the bonus: %s', (select sum(points) from public.event_points where ref_id = v_match));
  assert (select completed_at is not null from public.daily_objectives where id = '00000000-0000-4000-8000-0000000005c2'),
    'a win with a variant completes the objective';
  assert (public.event_payload('00000000-0000-4000-8000-0000000005e1', v_user) ->> 'variant_bonus_percent')::integer = 50,
    'event payload';
end $$;

rollback;
