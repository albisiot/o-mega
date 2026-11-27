-- Integration test for the notification of an unlocked Scontro a squadre kit (SPEC §5.19,
-- docs/COMBAT.md, 20261127100000_scontro_kit_notices.sql): told once per character, at the match
-- that reaches the unlock; several characters in one notification; the one that opens the mode;
-- one character by its name; matches lost not counted with "wins", counted with "played"; nothing
-- while the mode is closed (told at the first match once it opens) or with every kit open; and
-- what clients cannot touch. Rolled back:
--   npm run test:db

begin;

update public.mode_availability set state = 'on' where key = 'combat';
update public.game_config set value = '"progress"' where key = 'combat_unlock.mode';
update public.game_config set value = '"wins"' where key = 'combat_unlock.basis';
update public.game_config set value = '2' where key = 'combat_unlock.count';
update public.game_config set value = 'null' where key = 'combat_unlock.since';

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-8000-0000000007c' || n)::uuid, 'authenticated', 'authenticated',
       'combat-kit-notices-' || n || '@example.test', jsonb_build_object('full_name', 'Avviso kit ' || n), now(), now()
from generate_series(1, 2) as n;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', '00000000-0000-4000-8000-0000000007c' || n, 'role', 'authenticated')::text, true),
       public.bootstrap_player()
from generate_series(1, 2) as n;
reset role;

create function pg_temp.u(p_n integer) returns uuid language sql as $$
  select ('00000000-0000-4000-8000-0000000007c' || p_n)::uuid
$$;

create function pg_temp.give(p_user uuid, p_codes text[]) returns uuid[] language plpgsql as $$
declare
  v_ids uuid[] := '{}';
  v_id uuid;
  v_code text;
begin
  foreach v_code in array p_codes loop
    insert into public.card_instances (definition_id, owner_id, acquired_via)
    select d.id, p_user, 'pack' from public.card_definitions d where d.code = v_code
    returning id into v_id;
    v_ids := v_ids || v_id;
  end loop;
  return v_ids;
end $$;

-- A finished match against the bot with these cards in the player's team (side a): won ('a'),
-- lost ('b') or drawn.
create function pg_temp.played(p_user uuid, p_cards uuid[], p_result text) returns void language plpgsql as $$
declare
  v_match uuid;
  v_threats uuid[];
  v_levels integer[];
begin
  select array_agg(t.id order by t.code), array_agg(t.level order by t.code) into v_threats, v_levels
  from (select id, code, level from public.threat_definitions where is_active and region = 'megara' and rarity_code is null order by code limit 5) t;
  insert into public.matches (mode, bot_difficulty, player_a, threat_ids, threat_levels)
  values ('bot', 'medium', p_user, v_threats, v_levels) returning id into v_match;
  insert into public.match_teams (match_id, side, user_id, card_instance_ids, definition_ids)
  select v_match, 'a', p_user, p_cards, array_agg(i.definition_id order by u.ord)
  from unnest(p_cards) with ordinality as u(id, ord) join public.card_instances i on i.id = u.id;
  update public.matches set status = 'finished', result = p_result, end_reason = 'completed', finished_at = now() where id = v_match;
end $$;

create function pg_temp.notices(p_user uuid) returns setof public.player_notifications language sql as $$
  select * from public.player_notifications where user_id = p_user and kind = 'combat_kit' order by created_at, id
$$;

-- A player's notification about these characters (inside one transaction now() does not move,
-- so they are told apart by what they announce).
create function pg_temp.notice_of(p_user uuid, p_codes text[]) returns public.player_notifications language sql as $$
  select * from public.player_notifications where user_id = p_user and kind = 'combat_kit' and data -> 'codes' = to_jsonb(p_codes)
$$;

create function pg_temp.name_of(p_code text) returns text language sql as $$
  select name from public.card_definitions where code = p_code
$$;

-- ---------------------------------------------------------------------------
-- Clients: the table and the server's functions are closed
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.u(1), 'role', 'authenticated')::text, true);
do $$
declare
  v_failed boolean;
begin
  v_failed := false;
  begin perform 1 from public.combat_kit_notices;
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'a client read the notices';
  v_failed := false;
  begin perform public.notify_combat_kits_unlocked(auth.uid());
  exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'a client sent itself a notification';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- The match that reaches the unlock
-- ---------------------------------------------------------------------------

do $$
declare
  v_a uuid := pg_temp.u(1);
  v_team uuid[];
  v_other uuid[];
  v_notice public.player_notifications;
begin
  v_team := pg_temp.give(v_a, array['P001', 'P152', 'P125', 'P204', 'P123']);

  -- One win: nothing yet. The second: the five at once, and the mode open to them.
  perform pg_temp.played(v_a, v_team, 'a');
  assert not exists (select 1 from pg_temp.notices(v_a)), 'nothing before the unlock';
  perform pg_temp.played(v_a, v_team, 'a');
  assert (select count(*) from pg_temp.notices(v_a)) = 1, 'one notification for the five';
  select * into v_notice from pg_temp.notices(v_a);
  assert v_notice.title = 'Lo Scontro a squadre ti aspetta!', v_notice.title;
  assert v_notice.body like 'Hai 5 personaggi pronti per scendere in campo. Kit sbloccati: %', v_notice.body;
  assert jsonb_array_length(v_notice.data -> 'codes') = 5 and (v_notice.data ->> 'ready')::integer = 5 and (v_notice.data ->> 'needed')::integer = 5, v_notice.data::text;
  assert (select count(*) from public.combat_kit_notices where user_id = v_a) = 5, 'the five remembered';

  -- Once only.
  perform pg_temp.played(v_a, v_team, 'a');
  assert (select count(*) from pg_temp.notices(v_a)) = 1, 'not told twice';

  -- One more character: by its name, a tap to its card.
  v_other := pg_temp.give(v_a, array['P043']) || v_team[1:4];
  perform pg_temp.played(v_a, v_other, 'a');
  assert (select count(*) from pg_temp.notices(v_a)) = 1, 'one win of two';
  perform pg_temp.played(v_a, v_other, 'a');
  v_notice := pg_temp.notice_of(v_a, array['P043']);
  assert (select count(*) from pg_temp.notices(v_a)) = 2 and v_notice.id is not null, 'the new character told';
  assert v_notice.title = 'Kit sbloccato: ' || pg_temp.name_of('P043'), v_notice.title;
  assert v_notice.body = pg_temp.name_of('P043') || ' ora può scendere in campo nello Scontro a squadre: le sue mosse sono nella sua scheda.', v_notice.body;
  assert v_notice.data -> 'codes' = '["P043"]'::jsonb, v_notice.data::text;

  -- Lost matches do not count with "wins"; with "played" they do.
  v_other := pg_temp.give(v_a, array['P044']) || v_team[1:4];
  perform pg_temp.played(v_a, v_other, 'b');
  perform pg_temp.played(v_a, v_other, 'b');
  assert (select count(*) from pg_temp.notices(v_a)) = 2, 'lost matches are not wins';
  update public.game_config set value = '"played"' where key = 'combat_unlock.basis';
  perform pg_temp.played(v_a, v_other, 'b');
  assert (select count(*) from pg_temp.notices(v_a)) = 3 and (pg_temp.notice_of(v_a, array['P044'])).id is not null, 'finished matches with "played"';
  update public.game_config set value = '"wins"' where key = 'combat_unlock.basis';
end $$;

-- ---------------------------------------------------------------------------
-- The mode closed, every kit open
-- ---------------------------------------------------------------------------

do $$
declare
  v_b uuid := pg_temp.u(2);
  v_team uuid[];
  v_notice public.player_notifications;
begin
  v_team := pg_temp.give(v_b, array['P043', 'P044', 'P037', 'P213', 'P104']);

  -- Closed: nothing, and nothing remembered.
  update public.mode_availability set state = 'off' where key = 'combat';
  perform pg_temp.played(v_b, v_team, 'a');
  perform pg_temp.played(v_b, v_team, 'a');
  assert not exists (select 1 from pg_temp.notices(v_b)), 'nothing while the mode is closed';
  assert not exists (select 1 from public.combat_kit_notices where user_id = v_b), 'nothing remembered while closed';

  -- Every kit open: nothing to tell.
  update public.mode_availability set state = 'on' where key = 'combat';
  update public.game_config set value = '"always"' where key = 'combat_unlock.mode';
  perform pg_temp.played(v_b, v_team, 'b');
  assert not exists (select 1 from pg_temp.notices(v_b)), 'nothing with every kit open';

  -- Back to the unlock with the mode open: the first match tells of all those reached.
  update public.game_config set value = '"progress"' where key = 'combat_unlock.mode';
  perform pg_temp.played(v_b, v_team, 'b');
  assert (select count(*) from pg_temp.notices(v_b)) = 1, 'told at the first match once open';
  select * into v_notice from pg_temp.notices(v_b);
  assert v_notice.title = 'Lo Scontro a squadre ti aspetta!' and jsonb_array_length(v_notice.data -> 'codes') = 5, v_notice.title;
end $$;

rollback;
