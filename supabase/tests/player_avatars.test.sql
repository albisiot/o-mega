-- Integration test for player avatars: a player picks a character they own
-- (the base drawing, or a variant they have), never one they do not own, and
-- never another player's avatar. Runs inside a transaction that is rolled back:
--   npm run test:db
-- Any failed assertion aborts the script with an error.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'avatar-a@example.test',
   '{"full_name": "Avatar A", "avatar_url": "https://example.test/a.png"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'avatar-b@example.test',
   '{"full_name": "Avatar B"}', now(), now());

insert into public.profiles (id, username, avatar_url) values
  ('00000000-0000-4000-8000-0000000000a1', 'Avatar_Test_A', 'https://example.test/a.png'),
  ('00000000-0000-4000-8000-0000000000b2', 'Avatar_Test_B', null);

-- A owns the base P072 and a P001 with its neon drawing; B owns a P002.
insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
select d.id, '00000000-0000-4000-8000-0000000000a1', 'pack', null
from public.card_definitions d where d.code = 'P072';
insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
select d.id, '00000000-0000-4000-8000-0000000000a1', 'pack', v.id
from public.card_definitions d join public.card_variants v on v.definition_id = d.id and v.style = 'neon'
where d.code = 'P001';
insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
select d.id, '00000000-0000-4000-8000-0000000000b2', 'pack', null
from public.card_definitions d where d.code = 'P002';

create temp table avatar_ids on commit drop as
select
  (select id from public.card_definitions where code = 'P072') as p072,
  (select v.id from public.card_variants v join public.card_definitions d on d.id = v.definition_id
   where d.code = 'P072' and v.style = 'neon') as p072_neon,
  (select id from public.card_definitions where code = 'P001') as p001,
  (select v.id from public.card_variants v join public.card_definitions d on d.id = v.definition_id
   where d.code = 'P001' and v.style = 'neon') as p001_neon,
  (select id from public.card_definitions where code = 'P002') as p002;
grant select on avatar_ids to authenticated;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}', true);

do $$
declare
  ids record;
  v_profile public.profiles;
begin
  select * into ids from avatar_ids;
  assert ids.p072_neon is not null and ids.p001_neon is not null, 'test variants missing';

  -- The base drawing of an owned character.
  v_profile := public.set_avatar(ids.p072);
  assert v_profile.avatar_definition_id = ids.p072 and v_profile.avatar_variant_id is null, 'base avatar not stored';
  assert v_profile.avatar_url = (select art_url from public.card_definitions where id = ids.p072), 'base art not shown';

  -- A variant the player owns, and the base drawing of a character owned only as a variant.
  v_profile := public.set_avatar(ids.p001, ids.p001_neon);
  assert v_profile.avatar_variant_id = ids.p001_neon, 'variant avatar not stored';
  assert v_profile.avatar_url = (select art_url from public.card_variants where id = ids.p001_neon), 'variant art not shown';
  v_profile := public.set_avatar(ids.p001);
  assert v_profile.avatar_variant_id is null and v_profile.avatar_url = (select art_url from public.card_definitions where id = ids.p001),
    'base drawing of a character owned as a variant';

  -- Not owned: a character, or a variant of an owned character.
  begin
    perform public.set_avatar(ids.p002);
    raise exception 'ASSERT: an avatar the player does not own was accepted';
  exception when insufficient_privilege then
    assert sqlerrm = 'avatar_not_owned', sqlerrm;
  end;
  begin
    perform public.set_avatar(ids.p072, ids.p072_neon);
    raise exception 'ASSERT: a variant the player does not own was accepted';
  exception when insufficient_privilege then
    assert sqlerrm = 'avatar_not_owned', sqlerrm;
  end;

  -- A variant of another character, or a variant without a character.
  begin
    perform public.set_avatar(ids.p072, ids.p001_neon);
    raise exception 'ASSERT: a variant of another character was accepted';
  exception when no_data_found then
    assert sqlerrm = 'avatar_not_found', sqlerrm;
  end;
  begin
    perform public.set_avatar(null, ids.p001_neon);
    raise exception 'ASSERT: a variant without a character was accepted';
  exception when no_data_found then
    assert sqlerrm = 'avatar_not_found', sqlerrm;
  end;

  assert (select avatar_definition_id from public.profiles where id = auth.uid()) = ids.p001,
    'a refused choice changed the avatar';

  -- No direct writes: not to one's own profile, not to another's.
  begin
    update public.profiles set avatar_definition_id = ids.p002, avatar_url = 'x';
    raise exception 'ASSERT: a player wrote the profile directly';
  exception when insufficient_privilege then
    null;
  end;
  assert not exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-0000000000b2'),
    'a player reads another profile';
end $$;

-- Back to the account picture.
do $$
declare
  v_profile public.profiles;
begin
  v_profile := public.set_avatar(null);
  assert v_profile.avatar_definition_id is null and v_profile.avatar_variant_id is null, 'avatar not cleared';
  assert v_profile.avatar_url = 'https://example.test/a.png', format('account picture not back: %s', v_profile.avatar_url);
  perform public.set_avatar((select p072 from avatar_ids));
end $$;

-- B cannot take A's character, and setting B's avatar never touches A's.
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}', true);

do $$
declare
  v_profile public.profiles;
begin
  begin
    perform public.set_avatar((select p072 from avatar_ids));
    raise exception 'ASSERT: B took a character only A owns';
  exception when insufficient_privilege then
    assert sqlerrm = 'avatar_not_owned', sqlerrm;
  end;
  v_profile := public.set_avatar((select p002 from avatar_ids));
  assert v_profile.id = '00000000-0000-4000-8000-0000000000b2', 'set_avatar changed another profile';
  -- Without an account picture, the default is the initial.
  v_profile := public.set_avatar(null);
  assert v_profile.avatar_url is null, 'B has no account picture';
end $$;

reset role;

do $$
declare
  ids record;
begin
  select * into ids from avatar_ids;
  assert (select avatar_definition_id from public.profiles where id = '00000000-0000-4000-8000-0000000000a1') = ids.p072,
    'B changed A''s avatar';

  -- Losing the last copy keeps the avatar: it is only a picture.
  delete from public.card_instances
  where owner_id = '00000000-0000-4000-8000-0000000000a1' and definition_id = ids.p072;
  assert (select avatar_definition_id from public.profiles where id = '00000000-0000-4000-8000-0000000000a1') = ids.p072,
    'the avatar went away with the card';

  -- A redrawn character updates the avatars that show it.
  update public.card_definitions set art_url = '/cards/test-redrawn.webp' where id = ids.p072;
  assert (select avatar_url from public.profiles where id = '00000000-0000-4000-8000-0000000000a1') = '/cards/test-redrawn.webp',
    'avatar art not refreshed';
end $$;

rollback;
