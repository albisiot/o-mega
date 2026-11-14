-- Integration test for the fourteen characters of the backlog powers (P218-P231) and for
-- Nebbia on the server: the opponent sees only the score of a card played with Nebbia,
-- unless an Annullatore or Silenzio della tomba switched it off, and sees it again once
-- the match is over. Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000f8', 'authenticated', 'authenticated', 'fog-a@example.test', '{"full_name": "Nebbia"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f8", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

-- The catalog: one new character for each power, with a full identity, in the packs.
do $$
begin
  assert (
    select jsonb_object_agg(d.power_code, d.code)
    from public.card_definitions d
    where d.power_code in ('scrappy', 'counterpunch', 'eclectic', 'lone_wolf', 'opportunist', 'reflect', 'vendetta',
      'main_event', 'adaptable', 'sacrifice', 'pack_leader', 'echo', 'catalyst', 'fog')
  ) = '{"scrappy": "P218", "vendetta": "P219", "counterpunch": "P220", "adaptable": "P221", "opportunist": "P222",
        "lone_wolf": "P223", "reflect": "P224", "eclectic": "P225", "main_event": "P226", "sacrifice": "P227",
        "echo": "P228", "catalyst": "P229", "pack_leader": "P230", "fog": "P231"}'::jsonb,
    'each backlog power on exactly its new character';
  assert (
    select count(*) from public.card_definitions d
    where d.code between 'P218' and 'P231' and d.is_active and d.in_packs
      and d.real_name is not null and d.powers_text is not null and d.flavor is not null and d.art_url = '/cards/' || d.code || '.webp'
      and (select count(*) from public.card_definition_traits t where t.definition_id = d.id) = 3
  ) = 14, 'fourteen new characters with real name, powers, traits and art, in the packs';
  assert public.power_text('lone_wolf', '{"bonus": 5}')
    = '+5 se nessun altro personaggio della squadra è della sua fazione', 'Lupo solitario text';
end $$;

do $$
declare
  v_user uuid := '00000000-0000-4000-8000-0000000000f8';
  v_fog_def uuid := (select id from public.card_definitions where code = 'P231');       -- Thicket, Nebbia
  v_nullifier_def uuid := (select id from public.card_definitions where code = 'P115'); -- Codicil, Annullatore
  v_team uuid[];
  v_defs uuid[];
  v_bot uuid[];
  v_threats uuid[];
  v_match uuid;
  v_play jsonb;
  v_mine jsonb;
begin
  v_team := (select array_agg(s.id) from (
    select i.id from public.card_instances i
    where i.owner_id = v_user and i.is_starter
    order by i.acquired_at, i.id limit 5
  ) s);
  v_defs := (select array_agg(i.definition_id order by u.ord)
             from unnest(v_team) with ordinality as u(id, ord)
             join public.card_instances i on i.id = u.id);
  -- The bot fields Thicket and four Delta.
  v_bot := array[v_fog_def] || (select array_agg(s.id) from (
    select id from public.card_definitions where is_active and rarity_code = 'delta' order by code limit 4
  ) s);
  select array_agg(t.id order by l.ord) into v_threats
  from unnest(array[1, 5, 3, 3, 2]) with ordinality as l(level, ord)
  cross join lateral (
    select id from public.threat_definitions where level = l.level and region = 'megara' and rarity_code is null
    order by code offset (case when l.ord = 4 then 1 else 0 end) limit 1
  ) t;

  v_match := public.match_create_bot(v_user, 'easy', v_team, v_bot, v_threats);
  update public.matches set threat_modifiers = '[null, null, null, null, null]'::jsonb where id = v_match;

  -- Round 1: a starter against Thicket. The player sees only the score.
  perform public.match_record_round(v_match, 1,
    jsonb_build_object('card_instance_id', v_team[1], 'definition_id', v_defs[1],
      'base', 6, 'bonus', 0, 'score', 6, 'highest', 4, 'auto_played', false),
    jsonb_build_object('definition_id', v_fog_def, 'base', 9, 'bonus', 0, 'score', 9, 'highest', 7, 'auto_played', false),
    null, null);
  v_play := public.match_state_payload(v_match, 'a') -> 'rounds' -> 0 -> 'opponent_play';
  assert (v_play ->> 'hidden')::boolean, format('Thicket is not covered: %s', v_play);
  assert v_play ->> 'definition_id' is null and v_play ->> 'instance_id' is null, 'the covered card still says which it is';
  assert v_play ->> 'name' = 'Ignoto' and v_play -> 'stats' = '{}'::jsonb, 'the covered card shows a name or values';
  assert (v_play ->> 'score')::integer = 9 and (v_play ->> 'highest')::integer = 7, 'the covered card lost its score';
  assert v_play -> 'power' ->> 'code' = 'fog', 'the covered card does not say it is Nebbia';
  assert v_play -> 'parts' is null, 'the covered card still tells where its points come from';
  assert position('P231' in (public.match_state_payload(v_match, 'a'))::text) = 0
     and position(v_fog_def::text in (public.match_state_payload(v_match, 'a'))::text) = 0,
    'Thicket shows somewhere else in the payload';
  -- The side that played it sees its own card.
  v_mine := public.match_state_payload(v_match, 'b') -> 'rounds' -> 0 -> 'my_play';
  assert (v_mine ->> 'definition_id')::uuid = v_fog_def, 'the side with Nebbia does not see its own card';

  -- Silenzio della tomba switches Nebbia off.
  update public.matches set threat_modifiers = '[{"code": "tomb_silence"}, null, null, null, null]'::jsonb where id = v_match;
  v_play := public.match_state_payload(v_match, 'a') -> 'rounds' -> 0 -> 'opponent_play';
  assert (v_play ->> 'definition_id')::uuid = v_fog_def, 'Silenzio della tomba did not show the card';
  update public.matches set threat_modifiers = '[null, null, null, null, null]'::jsonb where id = v_match;

  -- An Annullatore against it switches Nebbia off.
  update public.round_plays set definition_id = v_nullifier_def where match_id = v_match and side = 'a' and round = 1;
  v_play := public.match_state_payload(v_match, 'a') -> 'rounds' -> 0 -> 'opponent_play';
  assert (v_play ->> 'definition_id')::uuid = v_fog_def, 'an Annullatore did not show the card';
  update public.round_plays set definition_id = v_defs[1] where match_id = v_match and side = 'a' and round = 1;

  -- Once the match is over, every card shows.
  update public.matches set status = 'finished', result = 'b', end_reason = 'completed', finished_at = now()
  where id = v_match;
  v_play := public.match_state_payload(v_match, 'a') -> 'rounds' -> 0 -> 'opponent_play';
  assert (v_play ->> 'definition_id')::uuid = v_fog_def and v_play ->> 'hidden' is null,
    'the card stays covered after the match';
end $$;

rollback;
