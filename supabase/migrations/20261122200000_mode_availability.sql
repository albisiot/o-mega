-- When the game modes are open (EDITOR → Modalità di gioco). For each mode the admin picks:
-- always on, on from a date to a date (Europe/Rome), or off; and a short label shown on its
-- button («Nuova», «Prossimamente», or free text), in any state. An off mode, or one outside
-- its dates, keeps its button, greyed, and nothing can start in it.
--
-- The server decides: a trigger on every table where a match, a queue, a friend code, an
-- Emergenza or an operation is born refuses the row when its mode is not open at that moment,
-- so every way to start (the "match" Edge Function, the RPCs, a rematch, a direct link) is
-- covered at once. Matches, runs and rooms already started go on to the end: only the start is
-- checked. Every mode starts always on, without a label: nothing changes for the players until
-- an admin acts.
--
-- The keys:
--   classic, boss, triple, quadrant   the rules of a match (bots, Amichevole, friend codes,
--                                     Sfide a tema on that mode, and the Classificata and
--                                     Conquista played with those rules);
--   quadrant_shifting                 the Quadrante's moving grid, which also needs the Quadrante;
--   ranked, conquest                  the Classificata and the Conquista, on top of the rules;
--   story                             the Storia's missions;
--   emergency, emergency_week         the day's Emergenza (and the Emergenze a tema), the week's;
--   coop                              the Operazioni (rooms and public queue).

create table public.mode_availability (
  key text primary key check (key in (
    'classic', 'boss', 'triple', 'quadrant', 'quadrant_shifting',
    'ranked', 'conquest', 'story', 'emergency', 'emergency_week', 'coop'
  )),
  state text not null default 'on' check (state in ('on', 'window', 'off')),
  -- The period of a 'window' mode; kept when the admin picks another state, for next time.
  starts_at timestamptz,
  ends_at timestamptz,
  -- Shown on the mode's button; null: none (the page may show one of its own, e.g. «Dal 3 dic»).
  label text check (label is null or (char_length(label) between 1 and 16 and label = btrim(label))),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint mode_availability_window check (
    (state <> 'window' or (starts_at is not null and ends_at is not null))
    and (starts_at is null or ends_at is null or ends_at > starts_at)
  )
);

insert into public.mode_availability (key)
select unnest(array[
  'classic', 'boss', 'triple', 'quadrant', 'quadrant_shifting',
  'ranked', 'conquest', 'story', 'emergency', 'emergency_week', 'coop'
]);

alter table public.mode_availability enable row level security;
revoke all on table public.mode_availability from anon, authenticated;
grant select on table public.mode_availability to anon, authenticated;
create policy "mode availability is readable by everyone"
  on public.mode_availability for select to anon, authenticated using (true);

-- Whether a mode is open at an instant. A key without a row (a mode added later) is open.
create function public.mode_open(p_key text, p_at timestamptz default now())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case a.state
      when 'on' then true
      when 'off' then false
      else a.starts_at <= p_at and p_at < a.ends_at
    end
    from public.mode_availability a
    where a.key = p_key
  ), true)
$$;

-- The modes a start needs: a story mission its Storia; otherwise the rules (the moving grid
-- also needs the Quadrante), plus the Classificata or the Conquista when that is the stake.
create function public.mode_keys_for(p_format text, p_mode text, p_story boolean)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case
    when p_story then array['story']
    else
      case p_format
        when 'quadrant_shifting' then array['quadrant', 'quadrant_shifting']
        else array[coalesce(p_format, 'classic')]
      end
      || case p_mode
        when 'ranked' then array['ranked']
        when 'conquest' then array['conquest']
        else array[]::text[]
      end
  end
$$;

-- Refuses a start when one of the modes it needs is not open now (server time).
create function public.assert_modes_open(p_keys text[])
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from unnest(p_keys) k where not public.mode_open(k)) then
    raise exception 'mode_unavailable' using errcode = 'P0001';
  end if;
end;
$$;

-- One guard for every table where a start is born (see the triggers below).
create function public.guard_mode_start()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  case tg_table_name
    when 'matches' then
      perform public.assert_modes_open(public.mode_keys_for(new.format, new.mode, new.story_mission_id is not null));
    when 'matchmaking_queue', 'match_lobbies' then
      perform public.assert_modes_open(public.mode_keys_for(new.format, new.mode, false));
    when 'challenge_queue' then
      perform public.assert_modes_open(public.mode_keys_for(new.format, null, false));
    when 'emergency_runs', 'challenge_emergency_runs' then
      perform public.assert_modes_open(array['emergency']);
    when 'emergency_week_runs' then
      perform public.assert_modes_open(array['emergency_week']);
    when 'coop_queue' then
      perform public.assert_modes_open(array['coop']);
    when 'coop_rooms' then
      -- A room opened, or a room that starts playing (coop_start, the public queue).
      if tg_op = 'INSERT' or (new.status = 'active' and old.status is distinct from 'active') then
        perform public.assert_modes_open(array['coop']);
      end if;
  end case;
  return new;
end;
$$;

create trigger matches_mode_open before insert on public.matches
  for each row execute function public.guard_mode_start();
create trigger matchmaking_queue_mode_open before insert on public.matchmaking_queue
  for each row execute function public.guard_mode_start();
create trigger match_lobbies_mode_open before insert on public.match_lobbies
  for each row execute function public.guard_mode_start();
create trigger challenge_queue_mode_open before insert on public.challenge_queue
  for each row execute function public.guard_mode_start();
create trigger emergency_runs_mode_open before insert on public.emergency_runs
  for each row execute function public.guard_mode_start();
create trigger challenge_emergency_runs_mode_open before insert on public.challenge_emergency_runs
  for each row execute function public.guard_mode_start();
create trigger emergency_week_runs_mode_open before insert on public.emergency_week_runs
  for each row execute function public.guard_mode_start();
create trigger coop_queue_mode_open before insert on public.coop_queue
  for each row execute function public.guard_mode_start();
create trigger coop_rooms_mode_open before insert or update of status on public.coop_rooms
  for each row execute function public.guard_mode_start();

-- Every mode's row, as the EDITOR shows it.
create function public.mode_availability_payload()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'modes', coalesce(jsonb_agg(jsonb_build_object(
      'key', a.key,
      'state', a.state,
      'starts_at', a.starts_at,
      'ends_at', a.ends_at,
      'label', a.label,
      'updated_at', a.updated_at
    ) order by a.key), '[]'::jsonb),
    'server_now', now()
  )
  from public.mode_availability a
$$;

-- EDITOR → Modalità di gioco: one mode's state, period and label. The dates arrive as
-- wall-clock times and are read as Europe/Rome; an empty label removes it.
create function public.admin_save_mode_availability(
  p_key text,
  p_state text,
  p_starts_at timestamp default null,
  p_ends_at timestamp default null,
  p_label text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_zone constant text := 'Europe/Rome';
  v_starts timestamptz := p_starts_at at time zone v_zone;
  v_ends timestamptz := p_ends_at at time zone v_zone;
  v_label text := nullif(btrim(coalesce(p_label, '')), '');
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if p_state is null or p_state not in ('on', 'window', 'off') then
    raise exception 'invalid_mode_state' using errcode = '22023';
  end if;
  if (p_state = 'window' and (v_starts is null or v_ends is null))
     or (v_starts is not null and v_ends is not null and v_ends <= v_starts) then
    raise exception 'invalid_mode_window' using errcode = '22023';
  end if;
  if v_label is not null and (char_length(v_label) > 16 or v_label ~ '[[:cntrl:]]') then
    raise exception 'invalid_mode_label' using errcode = '22023';
  end if;

  update public.mode_availability a
  set state = p_state,
      -- Dates sent replace the kept ones; a state without dates keeps them for next time.
      starts_at = case when v_starts is not null and v_ends is not null then v_starts else a.starts_at end,
      ends_at = case when v_starts is not null and v_ends is not null then v_ends else a.ends_at end,
      label = v_label,
      updated_at = now(),
      updated_by = auth.uid()
  where a.key = p_key;
  if not found then
    raise exception 'invalid_mode_key' using errcode = '22023';
  end if;

  return public.mode_availability_payload();
end;
$$;

revoke execute on function public.mode_open(text, timestamptz) from public, anon;
revoke execute on function public.mode_keys_for(text, text, boolean) from public, anon;
revoke execute on function public.assert_modes_open(text[]) from public, anon, authenticated;
revoke execute on function public.guard_mode_start() from public, anon, authenticated;
revoke execute on function public.mode_availability_payload() from public, anon;
revoke execute on function public.admin_save_mode_availability(text, text, timestamp, timestamp, text) from public, anon;
grant execute on function public.mode_open(text, timestamptz) to authenticated;
grant execute on function public.mode_keys_for(text, text, boolean) to authenticated;
grant execute on function public.mode_availability_payload() to authenticated;
grant execute on function public.admin_save_mode_availability(text, text, timestamp, timestamp, text) to authenticated;
