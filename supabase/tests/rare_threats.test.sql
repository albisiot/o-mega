-- Integration test for the rare threats (SPEC §5.15): the tiers, their fixed rules and
-- the ones drawn for each match, what the payloads hide, the Bestiario, the Storico
-- and the admin functions.
-- Runs inside a rolled-back transaction:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

-- The catalog: 29 rare threats in six tiers, each with a target for Emergenza.
do $$
begin
  assert (select count(*) from public.threat_rarities) = 6, 'six tiers';
  assert (select count(*) from public.threat_definitions where rarity_code is not null and is_active) = 29, '29 rare threats';
  assert not exists (
    select 1 from public.threat_definitions where rarity_code is not null and emergency_target is null
  ), 'a rare threat without a target';
  assert (select level from public.threat_definitions where code = 'AP01') = 12, 'La Fine del Mondo requires all 12';
  assert (select cardinality(required_abilities) from public.threat_definitions where code = 'AP01') = 12, '12 abilities';
  assert (select modifier_code from public.threat_definitions where code = 'AP01') is null, 'La Fine del Mondo has no rule';
  assert (select one_in from public.threat_rarities where code = 'apocalyptic') = 5000, '1 match in 5000';
  -- The usual pools are untouched.
  assert (select count(*) from public.threat_definitions where is_active and region = 'megara' and rarity_code is null) = 60,
    'the usual threats of Nuova Megara';

  begin
    insert into public.threat_definitions (code, name, level, required_abilities, rarity_code)
    values ('TX90', 'Prova', 1, array['FOR'], 'rare');
    raise exception 'ASSERT: a rare threat without a target';
  exception when check_violation then null;
  end;
  begin
    insert into public.threat_definitions (code, name, level, required_abilities, modifier_code, modifier_params)
    values ('TX91', 'Prova', 1, array['FOR'], 'hostile_ground', '{"favored": "heroes", "hindered": "heroes"}');
    raise exception 'ASSERT: Territorio ostile with one faction';
  exception when raise_exception then
    if sqlerrm like 'ASSERT%' then raise; end if;
  end;
end $$;

-- The fixed rules and the drawn ones.
do $$
declare
  v_ids uuid[] := array(
    select t.id from unnest(array['T101', 'MI02', 'MI03', 'UN02', 'LE02']) with ordinality as c(code, ord)
    join public.threat_definitions t on t.code = c.code order by c.ord
  );
  v_mods jsonb;
  v_levels integer[];
  v_blind jsonb;
  v_echo jsonb;
  v_unknown jsonb;
begin
  for i in 1 .. 20 loop
    v_mods := public.draw_match_modifiers(v_ids);
    v_blind := v_mods -> 1;
    v_echo := v_mods -> 2;
    v_unknown := v_mods -> 3;
    assert v_blind ->> 'code' = 'blind' and jsonb_array_length(v_blind -> 'abilities') = 6, format('Al buio: %s', v_blind);
    -- Eco takes the abilities of Al buio's threat list before it that it lacks: all 12 minus its 4.
    assert v_echo ->> 'code' = 'echo' and jsonb_array_length(v_echo -> 'abilities') = 8, format('Eco: %s', v_echo);
    assert v_unknown ->> 'code' = 'unknown_level'
      and jsonb_array_length(v_unknown -> 'abilities') between 3 and 6, format('Livello ignoto: %s', v_unknown);
    assert v_mods -> 4 = '{"code": "duel", "count": 1}'::jsonb, 'Duello on one ability';
    -- A rare threat never gets a drawn modifier: only T101 can have one.
    assert (select count(*) from jsonb_array_elements(v_mods) e where e ->> 'code' in ('focus', 'weak_link', 'hostile_ground', 'underdogs'))
      <= 1, 'drawn modifiers on a rare threat';
    v_levels := public.rule_levels(v_ids, v_mods);
    assert v_levels[2] = 6 and v_levels[3] = 12 and v_levels[4] = jsonb_array_length(v_unknown -> 'abilities'),
      format('levels %s', v_levels);
  end loop;

  assert public.place_modifier('hostile_ground', '{"favored": "villains", "hindered": "heroes"}')
    = '{"code": "hostile_ground", "favored": "villains", "hindered": "heroes", "bonus": 3, "malus": 2}'::jsonb, 'Territorio ostile';
  assert public.place_modifier('negative', '{}') = '{"code": "negative", "max": 10}'::jsonb, 'Negativo';
  assert public.place_modifier('count', '{}') = '{"code": "count", "min": 5, "points": 1}'::jsonb, 'Il conteggio';
  assert public.rule_abilities(array['FOR', 'ENE'], '{"code": "echo", "abilities": ["ENE", "VEL"]}')
    = '["FOR", "ENE", "VEL"]'::jsonb, 'Eco adds only what is missing';
end $$;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated', 'rare-a@example.test',
   '{"full_name": "Rara A"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000f2', 'authenticated', 'authenticated', 'rare-admin@example.test',
   '{"full_name": "Rara Admin"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);
select public.bootstrap_player();
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f2", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-0000000000f2');

-- A real match with Al buio in round 1 and Livello ignoto in round 3.
do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000f1';
  v_team uuid[];
  v_bot uuid[];
  v_threats uuid[] := array(
    select t.id from unnest(array['MI02', 'T101', 'UN02', 'AP01', 'T501']) with ordinality as c(code, ord)
    join public.threat_definitions t on t.code = c.code order by c.ord
  );
  v_match uuid;
  v_stored jsonb;
  v_payload jsonb;
begin
  select array_agg(id) into v_team from (
    select id from public.card_instances where owner_id = v_user order by acquired_at, id limit 5
  ) s;
  select array_agg(id) into v_bot from (
    select id from public.card_definitions where rarity_code = 'beta' order by code limit 5
  ) s;
  v_match := public.match_create_bot(v_user, 'easy', v_team, v_bot, v_threats);
  select threat_modifiers into v_stored from public.matches where id = v_match;
  assert jsonb_array_length(v_stored -> 0 -> 'abilities') = 6, 'Al buio drew six abilities';
  assert (select threat_levels[1] from public.matches where id = v_match) = 6, 'level of Al buio';
  assert (select threat_levels[3] from public.matches where id = v_match) = jsonb_array_length(v_stored -> 2 -> 'abilities'),
    'level of Livello ignoto';

  v_payload := public.match_state_payload(v_match, 'a');
  -- Every round's tier from the start; Livello ignoto hides its number until its round.
  assert v_payload -> 'threat_rarities' -> 0 ->> 'code' = 'mythic', 'tier of round 1';
  assert jsonb_typeof(v_payload -> 'threat_rarities' -> 1) = 'null', 'a usual threat has no tier';
  assert v_payload -> 'threat_rarities' -> 3 ->> 'name' = 'Apocalittica', 'tier of La Fine del Mondo';
  assert jsonb_typeof(v_payload -> 'threat_levels' -> 2) = 'null', 'Livello ignoto shown before its round';
  assert (v_payload -> 'threat_levels' ->> 3)::integer = 12, 'level 12 shown';
  -- Al buio: neither the threat nor the modifier gives the abilities away before the round is resolved.
  assert v_payload -> 'rounds' -> 0 -> 'threat' -> 'abilities' = '[]'::jsonb, 'Al buio abilities shown';
  assert (v_payload -> 'rounds' -> 0 -> 'threat' ->> 'hidden')::boolean, 'Al buio not marked hidden';
  assert v_payload -> 'rounds' -> 0 -> 'modifier' -> 'abilities' = '[]'::jsonb, 'Al buio modifier gives them away';
  assert v_payload -> 'rounds' -> 0 -> 'rarity' ->> 'code' = 'mythic', 'tier of the round';

  update public.match_rounds set resolved_at = now(), winner_side = 'a' where match_id = v_match and round = 1;
  v_payload := public.match_state_payload(v_match, 'a');
  assert jsonb_array_length(v_payload -> 'rounds' -> 0 -> 'threat' -> 'abilities') = 6, 'Al buio revealed after the round';

  -- Rewriting the modifiers keeps what the rules drew.
  update public.matches set threat_modifiers = '[null, null, null, null, null]' where id = v_match;
  assert (select threat_modifiers -> 0 from public.matches where id = v_match) = v_stored -> 0, 'Al buio redrawn';
  assert (select threat_modifiers -> 2 from public.matches where id = v_match) = v_stored -> 2, 'Livello ignoto redrawn';

  -- The Bestiario counts the threat of the opened round.
  assert exists (
    select 1 from public.threat_sightings s join public.threat_definitions t on t.id = s.threat_id
    where s.user_id = v_user and t.code = 'MI02'
  ), 'sighting of round 1';

  update public.matches set status = 'finished', finished_at = now(), result = 'a', end_reason = 'completed' where id = v_match;
end $$;

-- Allarme Triplo: rare threats may turn up there too.
do $$
declare
  v_hits integer := 0;
  v_ids uuid[];
  v_base uuid[] := array(select id from public.threat_definitions where rarity_code is null and region = 'megara' order by code limit 3);
begin
  update public.threat_rarities set one_in = case when code = 'unique' then 1 else 0 end;
  for i in 1 .. 5 loop
    v_ids := public.with_rare_threats(v_base);
    assert cardinality(v_ids) = 3, 'three threats';
    v_hits := v_hits + (select count(*) from unnest(v_ids) u(id) join public.threat_definitions t on t.id = u.id where t.rarity_code = 'unique');
  end loop;
  assert v_hits = 15, format('always-on tier turned up %s times', v_hits);
  update public.threat_rarities set one_in = 0;
  assert public.with_rare_threats(v_base) = v_base, 'a tier at 0 turned up';
end $$;

-- The player's Bestiario and Storico.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f1", "role": "authenticated"}', true);
do $$
declare
  v_bestiary jsonb := public.get_bestiary();
  v_history jsonb := public.get_match_history(5);
  v_seen jsonb;
  v_unseen jsonb;
begin
  assert jsonb_array_length(v_bestiary -> 'rarities') = 6, 'tiers in the Bestiario';
  select e into v_seen from jsonb_array_elements(v_bestiary -> 'threats') e where e ->> 'code' = 'MI02';
  select e into v_unseen from jsonb_array_elements(v_bestiary -> 'threats') e where e ->> 'code' = 'UN04';
  assert (v_seen ->> 'seen')::boolean and v_seen ->> 'name' = 'La notte lunga un anno', 'a met threat';
  assert not (v_unseen ->> 'seen')::boolean and v_unseen ->> 'name' is null and v_unseen -> 'abilities' = 'null'::jsonb,
    'a silhouette gives its name away';
  assert v_history -> 0 -> 'rare_threats' -> 0 ->> 'name' = 'La notte lunga un anno', 'rare threat in the Storico';

  -- Tables stay closed.
  begin
    perform 1 from public.threat_sightings;
    raise exception 'ASSERT: a client read the sightings';
  exception when insufficient_privilege then null;
  end;
  -- Players are not admins.
  begin
    perform public.admin_list_threats();
    raise exception 'ASSERT: a player listed the threats';
  exception when raise_exception then
    if sqlerrm like 'ASSERT%' then raise; end if;
    assert sqlerrm = 'not_admin', sqlerrm;
  end;
end $$;

-- The admin edits a threat and a tier, within the limits.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f2", "role": "authenticated"}', true);
do $$
declare
  v_list jsonb := public.admin_list_threats();
begin
  assert jsonb_array_length(v_list -> 'threats') >= 104, 'every threat listed';
  perform public.admin_update_threat('AP01', 'La Fine del Mondo', 'Nuovo testo.', 'frost', '{"cap": 7}', 'apocalyptic', 50, true);
  perform public.admin_update_threat_rarity('apocalyptic', 'Apocalittica', '#c1121f', 4000);
  begin
    perform public.admin_update_threat('T101', 'Scippatore', '', '', '{}', 'rare', null, true);
    raise exception 'ASSERT: a rare threat without a target';
  exception when raise_exception then
    if sqlerrm like 'ASSERT%' then raise; end if;
    assert sqlerrm = 'missing_target', sqlerrm;
  end;
  begin
    -- Three level-1 threats out: fewer than a run of Emergenza needs.
    perform public.admin_update_threat('T101', 'Scippatore', '', '', '{}', null, null, false);
    perform public.admin_update_threat('T102', 'Muro pericolante', '', '', '{}', null, null, false);
    perform public.admin_update_threat('T103', 'Codice cifrato', '', '', '{}', null, null, false);
    raise exception 'ASSERT: too few threats left';
  exception when raise_exception then
    if sqlerrm like 'ASSERT%' then raise; end if;
    assert sqlerrm = 'too_few_threats', sqlerrm;
  end;
end $$;
reset role;

do $$
begin
  assert (select modifier_params ->> 'cap' from public.threat_definitions where code = 'AP01') = '7', 'rule saved';
  assert (select one_in from public.threat_rarities where code = 'apocalyptic') = 4000, 'tier saved';
  assert public.place_modifier('frost', '{"cap": 7}') = '{"code": "frost", "cap": 7}'::jsonb, 'Gelo with its own cap';
end $$;

-- The clients never call the draws.
set local role authenticated;
do $$
begin
  begin
    perform public.with_rare_threats(array[]::uuid[]);
    raise exception 'ASSERT: a client called the rare draw';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;

select 'rare threats: all assertions passed' as result;
