-- Integration test for the border threats of Quadrante's fixed grid (SPEC §5.14):
-- configuration, the draw, the payload and that the threats never change. Service-only functions are called as the database owner.
-- Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000e5', 'authenticated', 'authenticated', 'quadrant-borders@example.test',
   '{"full_name": "Quadrante Bordi"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000e5", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- Configuration.
do $$
begin
  assert public.config_int('quadrant.fixed_grid_threats.min_level') = 2
     and public.config_int('quadrant.fixed_grid_threats.max_level') = 5, 'levels';
  assert public.config_int('quadrant.fixed_grid_threats.value_offset') = 2, 'value offset';
  assert public.config_int('quadrant.fixed_grid_threats.bite') = 1, 'bite';
end $$;

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000e5';
  v_deck uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 10) s);
  v_bot uuid[] := (select array_agg(s.id) from (
    select id from public.card_definitions where is_active order by code limit 10) s);
  v_match uuid;
  v_row public.matches;
  v_state jsonb;
  v_failed boolean;
begin
  -- The fixed grid: four distinct threats of Nuova Megara, not rare, levels 2-5, worth level + 2.
  v_match := public.match_create_quadrant_bot(v_a, 'medium', 'quadrant', v_deck, v_bot, array['FOR', 'VEL', 'RES', 'INT'], 'b');
  select * into v_row from public.matches where id = v_match;
  assert jsonb_array_length(v_row.quadrant_threats) = 4, 'four border threats';
  assert (select count(distinct t ->> 'threat_id') from jsonb_array_elements(v_row.quadrant_threats) t) = 4, 'all different';
  assert not exists (
    select 1 from jsonb_array_elements(v_row.quadrant_threats) t
    join public.threat_definitions d on d.id = (t ->> 'threat_id')::uuid
    where d.region <> 'megara' or d.rarity_code is not null or d.level not between 2 and 5
       or (t ->> 'value')::integer <> d.level + 2
  ), 'threats of Nuova Megara, levels 2-5, value = level + 2';
  assert v_row.threat_ids = '{}' and v_row.threat_modifiers = '[]'::jsonb, 'still no threats of the classic match';

  v_state := public.match_state_payload(v_match, 'a');
  assert jsonb_array_length(v_state -> 'border_threats') = 4, 'threats in the payload';
  assert (v_state -> 'border_threats' -> 0 ->> 'value')::integer = (v_row.quadrant_threats -> 0 ->> 'value')::integer, 'side order';
  assert v_state -> 'border_threats' -> 0 ->> 'name' is not null and v_state -> 'border_threats' -> 0 ->> 'level' is not null, 'name and level';
  assert (v_state ->> 'border_bite')::integer = 1, 'bite';
  assert v_state ->> 'format' = 'quadrant' and jsonb_array_length(v_state -> 'my_hand') = 3, 'the rest of the payload';

  -- Drawn once, never changed.
  v_failed := false;
  begin update public.matches set quadrant_threats = null where id = v_match;
  exception when others then v_failed := sqlerrm = 'invalid_request'; end;
  assert v_failed, 'the border threats were changed';

  perform public.finish_match(v_match, 'b', 'forfeit');

  -- The shifting grid: no border threats.
  v_match := public.match_create_quadrant_bot(v_a, 'medium', 'quadrant_shifting', v_deck, v_bot, array['FOR', 'VEL', 'RES', 'INT'], 'b');
  select * into v_row from public.matches where id = v_match;
  assert v_row.quadrant_threats is null, 'no border threats on a shifting grid';
  v_state := public.match_state_payload(v_match, 'a');
  assert v_state -> 'border_threats' = 'null'::jsonb, 'shifting payload';
  v_failed := false;
  begin update public.matches set quadrant_threats = '[{}, {}, {}, {}]'::jsonb where id = v_match;
  exception when others then v_failed := true; end;
  assert v_failed, 'border threats were added to a shifting grid';
  perform public.finish_match(v_match, 'b', 'forfeit');

  -- Not enough threats in the catalog: the fixed grid is played without them.
  update public.threat_definitions set is_active = false where level between 2 and 5;
  v_match := public.match_create_quadrant_bot(v_a, 'medium', 'quadrant', v_deck, v_bot);
  assert (select quadrant_threats from public.matches where id = v_match) is null, 'no threats to draw';
  perform public.finish_match(v_match, 'b', 'forfeit');
end $$;

rollback;
