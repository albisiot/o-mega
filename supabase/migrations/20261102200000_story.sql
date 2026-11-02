-- Modalità Storia (SPEC §5.11): chapters of hand-made missions against story
-- opponents, each a bot match with a fixed team, fixed threats and fixed
-- modifiers. The first win of a mission pays its reward: coins, and for the
-- chapter boss a card. Texts are placeholders until the universe is final.
--
-- The database creates the match and pays the reward: the Edge Function only
-- asks for a mission, then plays it as any bot match.

alter table public.coin_ledger drop constraint coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in (
  'pack_purchase', 'match_reward', 'bot_match_reward', 'duplicate_conversion', 'conquest_bonus', 'level_reward',
  'emergency_reward', 'bonus_code', 'story_reward', 'admin_adjustment'
));

alter table public.card_instances drop constraint card_instances_acquired_via_check;
alter table public.card_instances add constraint card_instances_acquired_via_check
  check (acquired_via in ('starter', 'pack', 'conquest', 'trade', 'level_unlock', 'bonus_code', 'story'));

alter table public.card_transfers drop constraint card_transfers_reason_check;
alter table public.card_transfers add constraint card_transfers_reason_check
  check (reason in ('starter', 'pack', 'conquest', 'trade', 'conversion', 'level_unlock', 'bonus_code', 'story'));

create table public.story_chapters (
  chapter integer primary key,
  title text not null,
  intro text not null
);

create table public.story_missions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  chapter integer not null references public.story_chapters (chapter),
  ord integer not null,
  title text not null,
  intro text not null,
  opponent text not null,
  bot_difficulty text not null check (bot_difficulty in ('easy', 'medium', 'hard', 'super_pro')),
  bot_definition_ids uuid[] not null,
  threat_ids uuid[] not null,
  -- One entry per round, as matches.threat_modifiers.
  threat_modifiers jsonb not null,
  reward_coins integer not null check (reward_coins >= 0),
  reward_definition_id uuid references public.card_definitions (id),
  unique (chapter, ord)
);

create table public.story_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  mission_id uuid not null references public.story_missions (id),
  match_id uuid not null references public.matches (id) on delete cascade,
  card_instance_id uuid references public.card_instances (id) on delete set null,
  completed_at timestamptz not null default now(),
  primary key (user_id, mission_id)
);

alter table public.matches add column story_mission_id uuid references public.story_missions (id);

-- No policies: get_story and get_story_reward show what a player may see. The
-- opponents' teams and the threats stay hidden until the match reveals them.
alter table public.story_chapters enable row level security;
alter table public.story_missions enable row level security;
alter table public.story_progress enable row level security;
revoke all on table public.story_chapters, public.story_missions, public.story_progress from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Chapter 1 (placeholder texts)
-- ---------------------------------------------------------------------------

insert into public.story_chapters (chapter, title, intro) values (1, 'Il porto',
  'Il Comune ti ha appena dato la licenza da Reggente. Il primo incarico arriva dal porto di Nuova Megara, dove la Compagnia Lete vende la soluzione ai guai che lei stessa provoca.');

create function pg_temp.ids(p_table text, p_codes text[]) returns uuid[] language plpgsql as $$
declare
  v_ids uuid[];
begin
  execute format('select array_agg(t.id order by u.ord) from unnest($1) with ordinality as u(code, ord) join public.%I t on t.code = u.code', p_table)
    into v_ids using p_codes;
  if coalesce(cardinality(v_ids), 0) <> cardinality(p_codes) then
    raise exception 'unknown codes in %: %', p_table, p_codes;
  end if;
  return v_ids;
end;
$$;

insert into public.story_missions
  (code, chapter, ord, title, intro, opponent, bot_difficulty, bot_definition_ids, threat_ids, threat_modifiers, reward_coins, reward_definition_id)
values
  ('C1M1', 1, 1, 'Primo incarico',
   'Al mercato del pesce sparisce un portafoglio ogni cinque minuti. Gli Sciolti di Foundling lavorano in squadra: fermali prima che arrivino ai container.',
   'La banda di Foundling', 'easy',
   pg_temp.ids('card_definitions', array['P002', 'P017', 'P014', 'P011', 'P010']),
   pg_temp.ids('threat_definitions', array['T101', 'T207', 'T310', 'T404', 'T507']),
   '[{"code": "focus"}, null, null, null, null]', 30, null),
  ('C1M2', 1, 2, 'Il pugile di vetro',
   'Cullet riscuote il pizzo per la Compagnia sul molo 7. Non ha mai perso un incontro, ma la sua mascella non regge un colpo.',
   'Gli esattori di Cullet', 'medium',
   pg_temp.ids('card_definitions', array['P019', 'P005', 'P008', 'P024', 'P029']),
   pg_temp.ids('threat_definitions', array['T107', 'T204', 'T305', 'T404', 'T506']),
   '[null, null, {"code": "hostile_ground", "favored": "villains", "hindered": "heroes", "bonus": 3, "malus": 2}, null, null]', 40, null),
  ('C1M3', 1, 3, 'Blackout',
   'Il quartiere del porto resta al buio e la Compagnia offre generatori a noleggio. Dietro il guasto ci sono le macchine di Blackbody.',
   'Gli ingegneri di Blackbody', 'medium',
   pg_temp.ids('card_definitions', array['P049', 'P036', 'P031', 'P065', 'P067']),
   pg_temp.ids('threat_definitions', array['T106', 'T203', 'T308', 'T407', 'T509']),
   '[{"code": "focus"}, null, null, {"code": "weak_link"}, null]', 50, null),
  ('C1M4', 1, 4, 'La notte delle campane',
   'Suonano le campane a mezzanotte e non è il Rintocco. I Figli dell''Ultima scavano sotto i magazzini in cerca di una lettera dell''Alfabeto.',
   'I Figli dell''Ultima', 'hard',
   pg_temp.ids('card_definitions', array['P016', 'P034', 'P039', 'P044', 'P011']),
   pg_temp.ids('threat_definitions', array['T104', 'T203', 'T305', 'T407', 'T504']),
   '[null, null, null, null, {"code": "underdogs", "commonMaxRank": 1, "eliteMinRank": 4, "bonus": 3, "malus": 3}]', 60, null),
  ('C1M5', 1, 5, 'Il caveau della Compagnia',
   'Tutte le piste portano al caveau della Compagnia Lete. A guardia c''è Vetrix, il più veloce della città. Se lo batti, la sua Eco passa a te.',
   'Vetrix e la Compagnia Lete', 'super_pro',
   pg_temp.ids('card_definitions', array['P051', 'P056', 'P041', 'P090', 'P029']),
   pg_temp.ids('threat_definitions', array['T110', 'T205', 'T307', 'T405', 'T608']),
   '[null, {"code": "hostile_ground", "favored": "villains", "hindered": "heroes", "bonus": 3, "malus": 2}, null, null, {"code": "focus"}]', 80,
   (select id from public.card_definitions where code = 'P051'));

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- The first mission is open; every other one opens when the one before is completed.
create function public.story_mission_unlocked(p_user uuid, p_mission public.story_missions)
returns boolean
language sql
stable
set search_path = ''
as $$
  select not exists (
    select 1 from public.story_missions prev
    where (prev.chapter, prev.ord) < (p_mission.chapter, p_mission.ord)
      and not exists (select 1 from public.story_progress p where p.user_id = p_user and p.mission_id = prev.id)
  )
$$;

revoke execute on function public.story_mission_unlocked(uuid, public.story_missions) from public, anon, authenticated;

-- Service only (Edge Function): creates the match of a mission.
create function public.story_create_match(p_user uuid, p_mission_code text, p_card_instance_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mission public.story_missions;
  v_match uuid;
begin
  select * into v_mission from public.story_missions where code = p_mission_code;
  if not found then
    raise exception 'story_mission_not_found';
  end if;
  if not public.story_mission_unlocked(p_user, v_mission) then
    raise exception 'story_mission_locked';
  end if;

  v_match := public.match_create_bot(
    p_user, v_mission.bot_difficulty, p_card_instance_ids, v_mission.bot_definition_ids, v_mission.threat_ids
  );
  -- The mission's own modifiers replace the ones drawn for a normal match.
  update public.matches
  set story_mission_id = v_mission.id, threat_modifiers = v_mission.threat_modifiers
  where id = v_match;
  return v_match;
end;
$$;

revoke execute on function public.story_create_match(uuid, text, uuid[]) from public, anon, authenticated;
grant execute on function public.story_create_match(uuid, text, uuid[]) to service_role;

-- The first win of a mission pays its reward, in the transaction that ends the match.
create function public.grant_story_reward()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mission public.story_missions;
  v_instance uuid;
begin
  if new.story_mission_id is null or new.status <> 'finished' or old.status = 'finished' or new.result <> 'a' then
    return new;
  end if;

  insert into public.story_progress (user_id, mission_id, match_id)
  values (new.player_a, new.story_mission_id, new.id)
  on conflict do nothing;
  if not found then
    return new; -- Already completed: replays pay nothing.
  end if;

  select * into v_mission from public.story_missions where id = new.story_mission_id;
  if v_mission.reward_coins > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id)
    values (new.player_a, v_mission.reward_coins, 'story_reward', new.id);
  end if;
  if v_mission.reward_definition_id is not null then
    insert into public.card_instances (definition_id, owner_id, acquired_via)
    values (v_mission.reward_definition_id, new.player_a, 'story')
    returning id into v_instance;
    insert into public.card_transfers (instance_id, from_user, to_user, reason)
    values (v_instance, null, new.player_a, 'story');
    update public.story_progress set card_instance_id = v_instance
    where user_id = new.player_a and mission_id = new.story_mission_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.grant_story_reward() from public, anon, authenticated;

create trigger matches_grant_story_reward
  after update of status on public.matches
  for each row execute function public.grant_story_reward();

-- The chapters as the player sees them: no opposing team, no threat beyond its level.
create function public.get_story()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'chapter', c.chapter,
      'title', c.title,
      'intro', c.intro,
      'missions', (
        select jsonb_agg(jsonb_build_object(
          'code', m.code,
          'ord', m.ord,
          'title', m.title,
          'intro', m.intro,
          'opponent', m.opponent,
          'bot_difficulty', m.bot_difficulty,
          'threat_levels', (
            select jsonb_agg(t.level order by u.ord)
            from unnest(m.threat_ids) with ordinality as u(id, ord)
            join public.threat_definitions t on t.id = u.id
          ),
          'reward_coins', m.reward_coins,
          'reward_card', case when m.reward_definition_id is null then null
                              else public.card_payload(m.reward_definition_id, null) end,
          'completed', exists (select 1 from public.story_progress p where p.user_id = v_uid and p.mission_id = m.id),
          'unlocked', public.story_mission_unlocked(v_uid, m)
        ) order by m.ord)
        from public.story_missions m where m.chapter = c.chapter
      )
    ) order by c.chapter)
    from public.story_chapters c
  ), '[]'::jsonb);
end;
$$;

revoke execute on function public.get_story() from public, anon;
grant execute on function public.get_story() to authenticated;

-- What a finished story match gave the player: shown on the result screen.
create function public.get_story_reward(p_match_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches;
  v_mission public.story_missions;
  v_progress public.story_progress;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_match from public.matches where id = p_match_id and player_a = v_uid;
  if not found or v_match.story_mission_id is null then
    return null;
  end if;
  select * into v_mission from public.story_missions where id = v_match.story_mission_id;
  select * into v_progress from public.story_progress where user_id = v_uid and mission_id = v_mission.id;

  return jsonb_build_object(
    'mission', v_mission.code,
    'title', v_mission.title,
    'is_last', not exists (
      select 1 from public.story_missions n where (n.chapter, n.ord) > (v_mission.chapter, v_mission.ord)
    ),
    'completed_now', v_progress.match_id is not distinct from p_match_id,
    'completed_before', v_progress.match_id is not null and v_progress.match_id <> p_match_id,
    'coins', case when v_progress.match_id = p_match_id then v_mission.reward_coins else 0 end,
    'card', case when v_progress.match_id = p_match_id and v_progress.card_instance_id is not null
                 then public.card_payload(v_mission.reward_definition_id, v_progress.card_instance_id)
                      || jsonb_build_object('instance_id', v_progress.card_instance_id) end
  );
end;
$$;

revoke execute on function public.get_story_reward(uuid) from public, anon;
grant execute on function public.get_story_reward(uuid) to authenticated;
