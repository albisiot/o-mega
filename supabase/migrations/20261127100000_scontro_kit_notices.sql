-- Scontro a squadre (SPEC §5.19, docs/COMBAT.md): a notification when a character's kit is
-- unlocked. Asked by the user on 27 November 2026: «quando sblocchi l'effetto per questa modalità
-- di una carta ti deve arrivare una notifica».
--
-- At the end of every match the players' characters that have reached the unlock
-- (combat_unlock.count matches won or finished, as in 20261126120000_scontro_kit_unlock.sql) and
-- were never announced are announced together, in one notification: the name when it is one (a
-- tap opens its card, where the kit is), how many when they are more (a tap opens the Scontro). When
-- the player reaches combat.team_size characters ready, the notification says they can now enter.
-- Each character is announced once per player (combat_kit_notices). Only with combat_unlock.mode
-- "progress" (with "always" there is nothing to unlock) and while the mode is open: the kits
-- reached while it is closed are announced at the first match after it opens.

alter table public.player_notifications drop constraint player_notifications_kind_check;
alter table public.player_notifications add constraint player_notifications_kind_check check (kind in (
  'objective_completed', 'event_reward', 'achievement', 'leaderboard', 'ranked', 'challenge', 'challenge_reward', 'combat_season',
  'combat_kit'
));

-- The characters whose unlock a player has been told of.
create table public.combat_kit_notices (
  user_id uuid not null references public.profiles (id) on delete cascade,
  definition_id uuid not null references public.card_definitions (id) on delete cascade,
  noticed_at timestamptz not null default now(),
  primary key (user_id, definition_id)
);
alter table public.combat_kit_notices enable row level security;
revoke all on table public.combat_kit_notices from public, anon, authenticated;

-- Tells a player of the characters unlocked and not yet announced, in one notification.
create function public.notify_combat_kits_unlocked(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_basis text := public.config_text('combat_unlock.basis');
  v_count integer := public.config_int('combat_unlock.count');
  v_needed integer := public.config_int('combat.team_size');
  v_new uuid[];
  v_names text[];
  v_codes text[];
  v_ready integer;
  v_before integer;
  v_list text;
  v_title text;
  v_body text;
begin
  if p_user is null or public.config_text('combat_unlock.mode') is distinct from 'progress' or not public.mode_open('combat') then
    return;
  end if;
  with reached as (
    select c.definition_id
    from public.combat_unlock_counts(p_user) c
    join public.combat_kits k on k.definition_id = c.definition_id
    where case when v_basis = 'played' then c.played else c.wins end >= v_count
  ), fresh as (
    insert into public.combat_kit_notices (user_id, definition_id)
    select p_user, r.definition_id from reached r
    on conflict do nothing
    returning definition_id
  )
  select array_agg(definition_id) into v_new from fresh;
  if v_new is null then
    return;
  end if;

  select array_agg(d.name order by d.name), array_agg(d.code order by d.name)
  into v_names, v_codes
  from public.card_definitions d
  where d.id = any(v_new);
  -- The characters the player owns that are ready, with and without the new ones: as many as
  -- combat.team_size open the mode.
  with counts as (select * from public.combat_unlock_counts(p_user))
  select count(distinct i.definition_id)::integer,
         (count(distinct i.definition_id) filter (where not (i.definition_id = any(v_new))))::integer
  into v_ready, v_before
  from public.card_instances i
  join public.combat_kits k on k.definition_id = i.definition_id
  join public.card_definitions d on d.id = i.definition_id and d.is_active
  join counts c on c.definition_id = i.definition_id
  where i.owner_id = p_user
    and case when v_basis = 'played' then c.played else c.wins end >= v_count;

  v_list := case
    when cardinality(v_names) = 1 then v_names[1]
    else array_to_string(v_names[1:cardinality(v_names) - 1], ', ') || ' e ' || v_names[cardinality(v_names)]
  end;
  if v_ready >= v_needed and v_before < v_needed then
    v_title := 'Lo Scontro a squadre ti aspetta!';
    v_body := 'Hai ' || v_ready || ' personaggi pronti per scendere in campo. '
      || case when cardinality(v_names) = 1 then 'Kit sbloccato: ' else 'Kit sbloccati: ' end || v_list || '.';
  elsif cardinality(v_names) = 1 then
    v_title := 'Kit sbloccato: ' || v_names[1];
    v_body := v_names[1] || ' ora può scendere in campo nello Scontro a squadre: le sue mosse sono nella sua scheda.';
  else
    v_title := 'Kit sbloccati: ' || cardinality(v_names) || ' personaggi';
    v_body := v_list || ' ora possono scendere in campo nello Scontro a squadre.';
  end if;
  perform public.add_player_notification(
    p_user, 'combat_kit', v_title, v_body,
    jsonb_build_object('definition_ids', to_jsonb(v_new), 'codes', to_jsonb(v_codes), 'ready', v_ready, 'needed', v_needed)
  );
end;
$$;
revoke execute on function public.notify_combat_kits_unlocked(uuid) from public, anon, authenticated;

-- A match that ends: both players (a bot is nobody).
create function public.notify_match_combat_kits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'finished' or old.status = 'finished' then
    return new;
  end if;
  perform public.notify_combat_kits_unlocked(new.player_a);
  if new.player_b is distinct from new.player_a then
    perform public.notify_combat_kits_unlocked(new.player_b);
  end if;
  return new;
end;
$$;
revoke execute on function public.notify_match_combat_kits() from public, anon, authenticated;

create trigger matches_notify_combat_kits
  after update of status on public.matches
  for each row execute function public.notify_match_combat_kits();
