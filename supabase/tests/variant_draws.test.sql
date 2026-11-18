-- Integration test for the variant draws admins shape (20261118230000_variant_draws.sql):
-- special packs of only variants, with chosen styles and the player's missing
-- variants first; events that raise the variant chance of the standard packs;
-- the global variant chance among the reward settings. Runs inside a
-- transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000003a1', 'authenticated', 'authenticated', 'variant-admin@example.test',
   '{"full_name": "Variant Admin"}', now(), now()),
  ('00000000-0000-4000-8000-0000000003a2', 'authenticated', 'authenticated', 'variant-player@example.test',
   '{"full_name": "Variant Player"}', now(), now());

-- The cards: a style two characters share, those two, a character without that
-- style, and a character with two variants or more.
do $$
declare
  v_style text := (
    select v.style from public.card_variants v
    join public.card_definitions d on d.id = v.definition_id
    where v.is_active and d.is_active and d.unlock_level is null
    group by v.style having count(distinct v.definition_id) >= 2
    order by v.style limit 1
  );
begin
  perform set_config('test.style', v_style, false);
  perform set_config('test.styled_a', (
    select d.code from public.card_definitions d join public.card_variants v on v.definition_id = d.id
    where v.style = v_style and v.is_active and d.is_active and d.unlock_level is null order by d.code limit 1), false);
  perform set_config('test.styled_b', (
    select d.code from public.card_definitions d join public.card_variants v on v.definition_id = d.id
    where v.style = v_style and v.is_active and d.is_active and d.unlock_level is null order by d.code offset 1 limit 1), false);
  perform set_config('test.unstyled', (
    select d.code from public.card_definitions d
    where d.is_active and d.unlock_level is null
      and not exists (select 1 from public.card_variants v where v.definition_id = d.id and v.style = v_style and v.is_active)
    order by d.code limit 1), false);
  perform set_config('test.two', (
    select d.code from public.card_definitions d
    where d.is_active and d.unlock_level is null
      and (select count(*) from public.card_variants v where v.definition_id = d.id and v.is_active) >= 2
    order by d.code limit 1), false);
  assert current_setting('test.styled_b') is not null and current_setting('test.unstyled') is not null
     and current_setting('test.two') is not null, 'test cards';
end $$;

insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000003a1');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000003a2", "role": "authenticated"}', true);
do $$ begin perform public.bootstrap_player(); end $$;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000003a1", "role": "authenticated"}', true);
do $$ begin perform public.bootstrap_player(); end $$;

-- The admin's checks: known styles, and every card of a pack of only variants has one of them.
do $$
declare
  v_cards jsonb := jsonb_build_array(
    jsonb_build_object('code', current_setting('test.styled_a'), 'percent', 50),
    jsonb_build_object('code', current_setting('test.unstyled'), 'percent', 50));
begin
  begin
    perform public.admin_save_special_pack(
      p_name => 'Stile ignoto', p_description => '', p_color => 'cyan', p_price => 100, p_cards_per_pack => 3,
      p_variant_chance_percent => 5, p_odds_mode => 'card', p_cards => v_cards, p_variant_styles => array['nope']);
    raise exception 'ASSERT: an unknown style was accepted';
  exception when raise_exception then
    assert sqlerrm = 'special_pack_invalid_styles', sqlerrm;
  end;
  begin
    perform public.admin_save_special_pack(
      p_name => 'Senza variante', p_description => '', p_color => 'cyan', p_price => 100, p_cards_per_pack => 3,
      p_variant_chance_percent => 5, p_odds_mode => 'card', p_cards => v_cards,
      p_variants_only => true, p_variant_styles => array[current_setting('test.style')]);
    raise exception 'ASSERT: a pack of only variants took a card without one of its variants';
  exception when raise_exception then
    assert sqlerrm = 'special_pack_card_without_variant', sqlerrm;
  end;
end $$;

-- A pack of only variants of one style: stored at 100%, stated in the shop.
do $$
declare
  v_list jsonb := public.admin_save_special_pack(
    p_name => 'Solo uno stile', p_description => '', p_color => 'violet', p_price => 100, p_cards_per_pack => 5,
    p_variant_chance_percent => 0, p_odds_mode => 'card',
    p_cards => jsonb_build_array(
      jsonb_build_object('code', current_setting('test.styled_a'), 'percent', 50),
      jsonb_build_object('code', current_setting('test.styled_b'), 'percent', 50)),
    p_variants_only => true, p_variant_styles => array[current_setting('test.style'), current_setting('test.style')]);
  v_pack jsonb;
  v_shop jsonb;
begin
  select p into v_pack from jsonb_array_elements(v_list -> 'packs') p where p ->> 'name' = 'Solo uno stile';
  assert (v_pack ->> 'variant_chance_percent')::integer = 100 and (v_pack ->> 'variants_only')::boolean
     and v_pack -> 'variant_styles' = jsonb_build_array(current_setting('test.style'))
     and not (v_pack ->> 'prefer_new_variants')::boolean, format('saved pack %s', v_pack);
  assert exists (
    select 1 from jsonb_array_elements(v_list -> 'variant_styles') s
    where s ->> 'style' = current_setting('test.style') and (s ->> 'characters')::integer >= 2
  ), 'style catalog';
  assert exists (
    select 1 from jsonb_array_elements(v_list -> 'cards') c
    where c ->> 'code' = current_setting('test.styled_a') and c -> 'variant_styles' ? current_setting('test.style')
  ), 'card styles';
  perform set_config('test.pack', v_pack ->> 'id', false);

  select s into v_shop from jsonb_array_elements(public.get_special_packs()) s where s ->> 'name' = 'Solo uno stile';
  assert (v_shop ->> 'variants_only')::boolean and (v_shop ->> 'variant_chance_percent')::integer = 100
     and jsonb_array_length(v_shop -> 'variant_style_names') = 1 and (v_shop ->> 'characters_with_variants')::integer = 2
     and jsonb_array_length(v_shop -> 'cards') = 2, format('shop %s', v_shop);
end $$;

-- A pack with the preference: one character with two variants or more, one card.
do $$
declare
  v_list jsonb := public.admin_save_special_pack(
    p_name => 'Prima le nuove', p_description => '', p_color => 'green', p_price => 100, p_cards_per_pack => 1,
    p_variant_chance_percent => 0, p_odds_mode => 'card',
    p_cards => jsonb_build_array(jsonb_build_object('code', current_setting('test.two'), 'percent', 100)),
    p_variants_only => true, p_prefer_new_variants => true);
begin
  perform set_config('test.prefer_pack', (
    select p ->> 'id' from jsonb_array_elements(v_list -> 'packs') p where p ->> 'name' = 'Prima le nuove'), false);
end $$;

-- Events: an admin's variant chance is checked and saved (far in the future, clear of real events).
do $$
declare
  v_start timestamp := (now() at time zone 'Europe/Rome') + interval '700 days';
  v_list jsonb;
begin
  begin
    perform public.admin_save_event('Caccia sbagliata', '', v_start, v_start + interval '2 days',
      '{"bot": {"win": 10}}', '[{"points": 10, "coins": 10}]', p_variant_chance_percent => 0);
    raise exception 'ASSERT: a variant chance of 0 was accepted';
  exception when raise_exception then
    assert sqlerrm = 'event_invalid_variant_chance', sqlerrm;
  end;
  v_list := public.admin_save_event('Caccia futura', '', v_start, v_start + interval '2 days',
    '{"bot": {"win": 10}}', '[{"points": 10, "coins": 10}]', p_variant_chance_percent => 15);
  assert exists (
    select 1 from jsonb_array_elements(v_list -> 'events') e
    where e ->> 'title' = 'Caccia futura' and (e ->> 'variant_chance_percent')::integer = 15
  ), 'saved variant chance';
  assert (v_list ->> 'base_variant_chance_percent')::integer = public.config_int('packs.variant_chance_percent'), 'base chance';
end $$;

-- The global chance is one of the reward settings, from 0 to 100.
do $$
declare
  v_payload jsonb;
begin
  begin
    perform public.admin_save_match_rewards('[]', '{"packs.variant_chance_percent": 101}');
    raise exception 'ASSERT: a chance over 100 was accepted';
  exception when raise_exception then
    assert sqlerrm = 'invalid_match_rewards', sqlerrm;
  end;
  v_payload := public.admin_save_match_rewards('[]', '{"packs.variant_chance_percent": 7}');
  assert (v_payload -> 'settings' ->> 'packs.variant_chance_percent')::integer = 7, 'saved global chance';
end $$;

reset role;

-- Opening: every card of the one-style pack has that style.
do $$
declare
  v_opening uuid := public.open_special_pack('00000000-0000-4000-8000-0000000003a2', current_setting('test.pack')::uuid);
  v_cards integer;
begin
  select count(*) into v_cards
  from public.pack_openings o
  cross join lateral unnest(o.card_instance_ids) as u(id)
  join public.card_instances i on i.id = u.id
  join public.card_variants v on v.id = i.variant_id
  where o.id = v_opening and v.style = current_setting('test.style');
  assert v_cards = 5, format('%s of 5 cards with the style', v_cards);
end $$;

-- A card that lost its style drops out of the pack's odds.
insert into public.special_pack_cards (pack_id, definition_id, percent)
select current_setting('test.pack')::uuid, d.id, 50 from public.card_definitions d where d.code = current_setting('test.unstyled');
do $$
begin
  assert not exists (
    select 1 from public.special_pack_card_odds(current_setting('test.pack')::uuid) o
    join public.card_definitions d on d.id = o.definition_id
    where d.code = current_setting('test.unstyled')
  ), 'a card without the style in the odds';
  assert (select count(*) from public.special_pack_card_odds(current_setting('test.pack')::uuid)) = 2, 'odds of the styled cards';
end $$;

-- The preference: owning one variant, the pack gives another.
insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
select d.id, '00000000-0000-4000-8000-0000000003a2', 'pack',
       (select v.id from public.card_variants v where v.definition_id = d.id and v.is_active order by v.style limit 1)
from public.card_definitions d where d.code = current_setting('test.two');
do $$
declare
  v_opening uuid := public.open_special_pack('00000000-0000-4000-8000-0000000003a2', current_setting('test.prefer_pack')::uuid);
  v_owned uuid := (
    select v.id from public.card_variants v join public.card_definitions d on d.id = v.definition_id
    where d.code = current_setting('test.two') and v.is_active order by v.style limit 1
  );
  v_given uuid;
begin
  select i.variant_id into v_given
  from public.pack_openings o join public.card_instances i on i.id = o.card_instance_ids[1]
  where o.id = v_opening;
  assert v_given is not null and v_given <> v_owned, format('gave %s, the player owned %s', v_given, v_owned);
end $$;

-- "Caccia alle varianti": while an event at 100% runs, every standard pack card
-- with a variant comes with one, and the shop and the event say so.
insert into public.events (id, title, starts_at, ends_at, points, variant_chance_percent)
values ('00000000-0000-4000-8000-0000000003e1', 'Caccia di prova', now() - interval '1 hour', now() + interval '1 hour',
        public.event_points_rules('{"bot": {"win": 10}}'), 100);
do $$
declare
  v_opening uuid := public.open_pack('00000000-0000-4000-8000-0000000003a2', 'standard');
  v_missing integer;
begin
  assert public.variant_chance_now() = 100, 'chance during the event';
  assert public.get_pack_odds() ->> 'variant_event' = 'Caccia di prova'
     and (public.get_pack_odds() ->> 'variant_chance_percent')::integer = 100
     and (public.get_pack_odds() ->> 'base_variant_chance_percent')::integer = 7, format('odds %s', public.get_pack_odds());
  assert (public.event_payload('00000000-0000-4000-8000-0000000003e1', '00000000-0000-4000-8000-0000000003a2')
          ->> 'variant_chance_percent')::integer = 100, 'event payload';
  select count(*) into v_missing
  from public.pack_openings o
  cross join lateral unnest(o.card_instance_ids) as u(id)
  join public.card_instances i on i.id = u.id
  where o.id = v_opening and i.variant_id is null
    and exists (select 1 from public.card_variants v where v.definition_id = i.definition_id and v.is_active);
  assert v_missing = 0, format('%s cards without a variant during the event', v_missing);
end $$;

-- Once over, the global chance is back (an event never lowers it).
update public.events set ends_at = now() - interval '1 minute', starts_at = now() - interval '2 hours'
where id = '00000000-0000-4000-8000-0000000003e1';
do $$
begin
  assert public.variant_chance_now() >= 7, 'chance after the event';
  assert public.get_pack_odds() ->> 'variant_event' is distinct from 'Caccia di prova', 'event still named';
end $$;

rollback;
