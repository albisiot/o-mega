-- Scontro a squadre (SPEC §5.19, docs/COMBAT.md): a character's kit is unlocked by playing the
-- other modes. With combat_unlock.mode "progress" a player fields a character only after
-- combat_unlock.count matches with it in their team, won ("wins") or finished ("played") as
-- combat_unlock.basis says, counted from combat_unlock.since (null: every match ever played); with
-- "always" every kit is open. Without combat.team_size unlocked characters there is no battle.
-- Admins set the four values from /gestione-scontro (admin_save_combat_unlock).
--
-- Decided by the user on 26 November 2026: a win counts for every character in the winner's team,
-- in every mode played as a match (Classica, Grande Minaccia, Allarme Triplo, Quadrante, Storia and
-- the Sfide a tema; against the bot, friendly, Classificata, Conquista); per character, so every
-- copy adds up and the unlock stays when the card is lost; counted from now on (an admin can move
-- the date back, to count the matches already played).

insert into public.game_config (key, value, description) values
  ('combat_unlock.mode', '"progress"', 'Scontro a squadre: "progress" = a character''s kit unlocks after combat_unlock.count matches with it in the team; "always" = every kit is open. Set from /gestione-scontro.'),
  ('combat_unlock.basis', '"wins"', 'Scontro a squadre: what counts for the unlock: "wins" = matches won with the character in the team, "played" = matches finished with it. Set from /gestione-scontro.'),
  ('combat_unlock.count', '50', 'Scontro a squadre: the matches that unlock a character''s kit. Set from /gestione-scontro.'),
  ('combat_unlock.since', '"2026-11-25T23:00:00+00:00"', 'Scontro a squadre: only matches finished from this moment count for the unlock; null = every match ever played. Set from /gestione-scontro.')
on conflict (key) do nothing;

-- From when the matches count (null: all of them).
create function public.combat_unlock_since()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (c.value #>> '{}')::timestamptz from public.game_config c where c.key = 'combat_unlock.since'
$$;

-- For each character a player has had in a finished match since combat_unlock.since: the matches
-- won with it in the team and the matches finished with it.
create function public.combat_unlock_counts(p_user uuid)
returns table (definition_id uuid, wins integer, played integer)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id,
         (count(distinct m.id) filter (where m.result = t.side))::integer,
         (count(distinct m.id))::integer
  from public.match_teams t
  join public.matches m on m.id = t.match_id
  cross join lateral unnest(t.definition_ids) as d(id)
  where t.user_id = p_user
    and m.status = 'finished'
    and (public.combat_unlock_since() is null or m.finished_at >= public.combat_unlock_since())
  group by d.id
$$;

-- Whether a player's character has its kit unlocked: every one with combat_unlock.mode "always".
create function public.combat_kit_unlocked(p_user uuid, p_definition uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.config_text('combat_unlock.mode') = 'always'
      or coalesce((
           select case when public.config_text('combat_unlock.basis') = 'played' then c.played else c.wins end
           from public.combat_unlock_counts(p_user) c
           where c.definition_id = p_definition
         ), 0) >= public.config_int('combat_unlock.count')
$$;

revoke execute on function public.combat_unlock_since() from public, anon;
grant execute on function public.combat_unlock_since() to authenticated, service_role;
revoke execute on function public.combat_unlock_counts(uuid) from public, anon, authenticated;
revoke execute on function public.combat_kit_unlocked(uuid, uuid) from public, anon, authenticated;
grant execute on function public.combat_unlock_counts(uuid) to service_role;
grant execute on function public.combat_kit_unlocked(uuid, uuid) to service_role;

-- As in 20261124100000_scontro_stage_four.sql, and every character of the team must have its kit
-- unlocked (combat_locked).
create or replace function public.combat_create(
  p_user uuid,
  p_card_instance_ids uuid[],
  p_setup jsonb,
  p_rules jsonb,
  p_seed bigint,
  p_tactics jsonb,
  p_auto boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_definitions uuid[];
  v_battle uuid;
begin
  perform 1 from public.profiles where id = p_user for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  v_definitions := public.check_team_of(p_user, p_card_instance_ids, public.config_int('combat.team_size'));
  if exists (select 1 from unnest(v_definitions) as d(id) where not exists (select 1 from public.combat_kits k where k.definition_id = d.id)) then
    raise exception 'combat_no_kit' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(v_definitions) as d(id) where not public.combat_kit_unlocked(p_user, d.id)) then
    raise exception 'combat_locked' using errcode = '22023';
  end if;
  if jsonb_typeof(p_setup -> 'a') is distinct from 'array'
     or array(select (x ->> 'definitionId')::uuid from jsonb_array_elements(p_setup -> 'a') with ordinality as e(x, ord) order by ord)
        is distinct from v_definitions then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  update public.combat_battles set status = 'abandoned', finished_at = now(), updated_at = now()
  where user_id = p_user and status = 'active';
  insert into public.combat_battles (user_id, setup, rules, seed, tactics, auto)
  values (p_user, p_setup, p_rules, p_seed, p_tactics, p_auto)
  returning id into v_battle;
  return v_battle;
end;
$$;
revoke execute on function public.combat_create(uuid, uuid[], jsonb, jsonb, bigint, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.combat_create(uuid, uuid[], jsonb, jsonb, bigint, jsonb, boolean) to service_role;

-- The player's unlock, for /scontro and Gioca: the rules, the matches that count for each of their
-- characters (won or finished, as combat_unlock.basis says) and how many of the characters they
-- own with a kit are unlocked ("ready"; "needed" to fight).
create function public.get_combat_unlocks()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_mode text := public.config_text('combat_unlock.mode');
  v_basis text := public.config_text('combat_unlock.basis');
  v_count integer := public.config_int('combat_unlock.count');
  v_progress jsonb;
  v_ready integer;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select coalesce(jsonb_object_agg(c.definition_id, case when v_basis = 'played' then c.played else c.wins end), '{}'::jsonb)
  into v_progress
  from public.combat_unlock_counts(v_user) c;
  select count(distinct i.definition_id)::integer into v_ready
  from public.card_instances i
  join public.combat_kits k on k.definition_id = i.definition_id
  join public.card_definitions d on d.id = i.definition_id and d.is_active
  where i.owner_id = v_user
    and (v_mode = 'always' or coalesce((v_progress ->> i.definition_id::text)::integer, 0) >= v_count);
  return jsonb_build_object(
    'mode', v_mode,
    'basis', v_basis,
    'count', v_count,
    'since', public.combat_unlock_since(),
    'needed', public.config_int('combat.team_size'),
    'progress', v_progress,
    'ready', v_ready
  );
end;
$$;
revoke execute on function public.get_combat_unlocks() from public, anon;
grant execute on function public.get_combat_unlocks() to authenticated;

-- EDITOR → Scontro: the four values of the unlock, for admins only.
create function public.admin_save_combat_unlock(p_mode text, p_basis text, p_count integer, p_since timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if coalesce(p_mode, '') not in ('always', 'progress')
     or coalesce(p_basis, '') not in ('wins', 'played')
     or p_count is null or p_count not between 1 and 10000 then
    raise exception 'invalid_combat_unlock' using errcode = '22023';
  end if;
  update public.game_config set value = to_jsonb(p_mode), updated_at = now() where key = 'combat_unlock.mode';
  update public.game_config set value = to_jsonb(p_basis), updated_at = now() where key = 'combat_unlock.basis';
  update public.game_config set value = to_jsonb(p_count), updated_at = now() where key = 'combat_unlock.count';
  update public.game_config set value = coalesce(to_jsonb(p_since), 'null'::jsonb), updated_at = now() where key = 'combat_unlock.since';
  return jsonb_build_object('mode', p_mode, 'basis', p_basis, 'count', p_count, 'since', p_since);
end;
$$;
revoke execute on function public.admin_save_combat_unlock(text, text, integer, timestamptz) from public, anon;
grant execute on function public.admin_save_combat_unlock(text, text, integer, timestamptz) to authenticated;

do $$
begin
  if (select count(*) from public.game_config where key like 'combat_unlock.%') <> 4 then
    raise exception 'the Scontro unlock settings are missing';
  end if;
end $$;
