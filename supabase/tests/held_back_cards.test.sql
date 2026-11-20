-- Integration test for characters held back from packs (in_packs false) with the sixty
-- characters that arrived held back: the Thousand Suns, P232-P261
-- (20261119250000_thousand_suns_characters.sql), and the Marches of Arcadia, P262-P291
-- (20261120200000_marches_characters.sql): no automatic path gives them (packs, starter set, random
-- variants, Conquista against a bot, imprese counting a whole faction), and once an admin
-- ticks them in with admin_set_cards_in_packs they come out like every other card
-- (20261119240000_held_back_cards.sql). Bot teams are built in the match Edge Function.
-- Runs inside a transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000009e1', 'authenticated', 'authenticated', 'held-admin@example.test',
   '{"full_name": "Held Admin"}', now(), now()),
  ('00000000-0000-4000-8000-0000000009e2', 'authenticated', 'authenticated', 'held-player@example.test',
   '{"full_name": "Held Player"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000009e1", "role": "authenticated"}', true);
do $$ begin perform public.bootstrap_player(); end $$;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000009e2", "role": "authenticated"}', true);
do $$ begin perform public.bootstrap_player(); end $$;
reset role;
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000009e1');

-- Only the sixty are held back here, whatever the live flags of the others are.
update public.card_definitions set in_packs = (code not between 'P232' and 'P291') where is_active and unlock_level is null;

create function pg_temp.held() returns setof uuid language sql as $$
  select id from public.card_definitions where code between 'P232' and 'P291'
$$;

-- A new player with the starter set: bootstrap_player grants it.
create function pg_temp.new_player(p_n integer) returns uuid language plpgsql as $$
declare
  v_user uuid := format('00000000-0000-4000-8000-0000000009%s', lpad(to_hex(p_n), 2, '0'))::uuid;
begin
  insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (v_user, 'authenticated', 'authenticated', format('held-%s@example.test', p_n), '{"full_name": "Held"}', now(), now());
  perform set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', v_user), true);
  perform public.bootstrap_player();
  return v_user;
end;
$$;

-- The sixty, as they arrive.
do $$
begin
  assert (select count(*) from public.card_definitions where code between 'P232' and 'P291' and is_active and not in_packs) = 60,
    'the sixty arrive active and held back';
  assert not exists (select 1 from public.card_definitions d where d.id in (select pg_temp.held()) and public.is_pack_card(d)),
    'a held-back character is a pack card';
  assert (select count(*) from public.card_variants v where v.definition_id in (select pg_temp.held()) and v.is_active) = 60,
    'one variant each';
  assert (select count(*) from public.card_definition_traits t where t.definition_id in (select pg_temp.held())
          and t.trait_code = 'origin.strappo') = 60, 'all of them came through the rift';
  -- The album reads the flag and hides them from players who lack them.
  assert (select count(*) from public.card_catalog where code between 'P232' and 'P291' and not in_packs) = 60,
    'the album view tells which characters are held back';
end $$;

-- Packs: a hundred packs never give one of the sixty.
do $$
declare
  v_drawn uuid[] := '{}';
begin
  for i in 1..100 loop
    v_drawn := v_drawn || public.draw_pack_definitions(5, public.config_int('packs.guaranteed_min_rarity_rank'));
  end loop;
  assert cardinality(v_drawn) = 500, 'draws';
  assert not (v_drawn && array(select pg_temp.held())), 'a pack gave a held-back character';
  assert (public.get_pack_odds() ->> 'characters_with_variants')::integer = (
    select count(distinct v.definition_id) from public.card_variants v
    join public.card_definitions d on d.id = v.definition_id
    where v.is_active and public.is_pack_card(d)
  ), 'the shop counts the characters with variants that packs can give';
end $$;

-- Starter set: with only ten other Delta in packs, a new player gets exactly those ten,
-- never one of the twenty held-back Delta.
do $$
declare
  v_keep uuid[] := array(
    select id from public.card_definitions
    where rarity_code = 'delta' and is_active and unlock_level is null and code not between 'P232' and 'P291'
    order by code limit 10);
  v_user uuid;
begin
  update public.card_definitions set in_packs = (id = any (v_keep))
  where rarity_code = 'delta' and is_active and unlock_level is null and code not between 'P232' and 'P291';
  v_user := pg_temp.new_player(1);
  assert (select array_agg(definition_id order by definition_id) from public.card_instances where owner_id = v_user and is_starter)
    = (select array_agg(u order by u) from unnest(v_keep) u), 'the starter set picked outside the pack cards';
  update public.card_definitions set in_packs = true
  where rarity_code = 'delta' and is_active and unlock_level is null and code not between 'P232' and 'P291';
end $$;

-- Random variants (rewards and the Schegge shop): a hundred never give one of the sixty,
-- and the shop counts only the missing variants it can give.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000009e2';
  v_given uuid[];
begin
  for i in 1..20 loop
    -- The function's new rows are visible to the next statement, not to its own query.
    v_given := coalesce(v_given, '{}') || array(
      select g.instance_id from public.grant_random_variants(v_user, '{"count": 5}', 'bonus_code') g);
  end loop;
  v_given := array(select i.definition_id from public.card_instances i where i.id = any (v_given));
  assert cardinality(v_given) = 100, 'variants given';
  assert not (v_given && array(select pg_temp.held())), 'a random variant of a held-back character';
  assert (public.cosmetics_payload(v_user) ->> 'missing_variants')::integer = (
    select count(*) from public.card_variants v
    join public.card_definitions d on d.id = v.definition_id
    where v.is_active and public.is_pack_card(d)
      and not exists (select 1 from public.card_instances i where i.owner_id = v_user and i.variant_id = v.id)
  ), 'missing variants';
end $$;

-- Conquista against a bot: copies of held-back characters, and of level cards, in the bot's
-- team are never on offer (bots no longer field them, 20261119240000_held_back_cards.sql).
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000009e2';
  v_team uuid[];
  -- Two held-back characters, a level card (Nadir, P061) and two cards in packs.
  v_bot uuid[] := array(select id from public.card_definitions where code in ('P232', 'P235', 'P061', 'P001', 'P002') order by code);
  -- The levels of conquest_bot.test.sql, which the queue accepts.
  v_threats uuid[] := array(
    select t.id from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
    cross join lateral (
      select id from public.threat_definitions where level = l.level
      order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
    ) t order by l.ord);
  v_match uuid;
  v_offered jsonb;
begin
  update public.profiles set conquest_unlocked = true where id = v_user;
  -- Three conquerable cards and two starters, as in conquest_bot.test.sql.
  with given as (
    insert into public.card_instances (definition_id, owner_id, acquired_via)
    select id, v_user, 'pack' from public.card_definitions where code in ('P025', 'P026', 'P027')
    returning id
  )
  select array_agg(id) into v_team from given;
  v_team := v_team || array(select id from public.card_instances where owner_id = v_user and is_starter order by acquired_at, id limit 2);
  perform public.match_queue_join(v_user, 'conquest', v_team, v_threats);
  update public.matchmaking_queue set enqueued_at = now() - make_interval(secs => 61) where user_id = v_user;
  v_match := public.match_create_conquest_bot(v_user, 'easy', v_bot, v_threats);
  assert v_match is not null, 'no bot match';
  for i in 1..3 loop
    perform public.match_record_round(v_match, i,
      jsonb_build_object('card_instance_id', v_team[i],
        'definition_id', (select definition_id from public.card_instances where id = v_team[i]),
        'base', 20, 'bonus', 0, 'score', 20, 'highest', 10, 'auto_played', false),
      jsonb_build_object('definition_id', v_bot[i], 'base', 4, 'bonus', 0, 'score', 4, 'highest', 10, 'auto_played', false),
      'a', case when i = 3 then 'a' end);
  end loop;
  perform set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', v_user), true);
  v_offered := public.get_match_state(v_match) -> 'conquest' -> 'offered';
  -- The whole bot team is shown; only the two characters in packs can be taken.
  assert jsonb_array_length(v_offered) = 5, 'the bot team is shown';
  assert (select count(*) from jsonb_array_elements(v_offered) o where (o ->> 'eligible')::boolean) = 2,
    'only the two cards in packs can be taken';
  assert not exists (
    select 1 from jsonb_array_elements(v_offered) o
    where (o ->> 'eligible')::boolean and (o ->> 'code' between 'P232' and 'P291' or o ->> 'code' = 'P061')
  ), 'a held-back copy or a level card can be taken';
  assert not exists (
    select 1 from public.conquest_claims c, unnest(c.eligible_instance_ids) e(id)
    join public.card_instances i on i.id = e.id
    where c.match_id = v_match and i.definition_id in (select pg_temp.held())
  ), 'a held-back copy is in the claim';
end $$;

-- Imprese: «every villain» counts the villains players can find.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000009e1';
begin
  insert into public.card_instances (definition_id, owner_id, acquired_via)
  select d.id, v_user, 'pack' from public.card_definitions d
  where d.is_active and d.in_packs and d.faction = 'villains'
    and not exists (select 1 from public.card_instances i where i.owner_id = v_user and i.definition_id = d.id);
  assert public.achievement_progress(v_user, 'characters_owned', '{"faction": "villains", "all": true}', null) = 1,
    'every villain owned, held-back ones aside';
end $$;

-- The admin ticks the sixty in: they come out like every other card.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000009e1", "role": "authenticated"}', true);
do $$
declare
  v_list jsonb := public.admin_set_cards_in_packs(array(select code from public.card_definitions where code between 'P232' and 'P291'), true);
begin
  assert (select count(*) from jsonb_array_elements(v_list -> 'cards') c
          where c ->> 'code' between 'P232' and 'P291' and (c ->> 'in_packs')::boolean) = 60, 'the list shows them in packs';
end $$;
reset role;

do $$
declare
  v_drawn uuid[] := '{}';
  v_new_delta uuid[] := array(select id from public.card_definitions where rarity_code = 'delta' and code between 'P232' and 'P291');
  v_user uuid;
  v_given uuid[];
begin
  assert (select count(*) from public.card_definitions d where d.id in (select pg_temp.held()) and public.is_pack_card(d)) = 60,
    'all sixty are pack cards';
  for i in 1..100 loop
    v_drawn := v_drawn || public.draw_pack_definitions(5, public.config_int('packs.guaranteed_min_rarity_rank'));
  end loop;
  assert v_drawn && array(select pg_temp.held()), 'a hundred packs and none of the sixty';

  -- With the other Delta held back, the starter set is ten of the twenty new Delta.
  update public.card_definitions set in_packs = false
  where rarity_code = 'delta' and is_active and unlock_level is null and code not between 'P232' and 'P291';
  v_user := pg_temp.new_player(2);
  assert (select count(*) from public.card_instances where owner_id = v_user and is_starter) = 10
    and array(select definition_id from public.card_instances where owner_id = v_user and is_starter) <@ v_new_delta,
    'the starter set did not take the new Delta';

  -- With every other character held back, random variants come from the sixty.
  update public.card_definitions set in_packs = (code between 'P232' and 'P291') where is_active and unlock_level is null;
  v_given := array(select g.instance_id from public.grant_random_variants(v_user, '{"count": 5}', 'bonus_code') g);
  v_given := array(select i.definition_id from public.card_instances i where i.id = any (v_given));
  assert cardinality(v_given) = 5 and v_given <@ array(select pg_temp.held()), 'random variants once in packs';
end $$;

rollback;
