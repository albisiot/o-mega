-- Operazioni (SPEC §5.17, §8.2): at the end of an operation the result said «Squadra non ammessa
-- all'evento: 0 punti» whenever the running event had a rule the squad did not meet, even when the
-- event gives the operations no points at all (every event saved before they counted). Then
-- there is nothing to say.

-- Same as in 20261116240000_event_rarity_faction.sql, with the operations that the event does not pay.
create or replace function public.get_event_points_for(p_ref_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_event uuid;
  v_points integer;
  v_ref uuid;
  v_running public.events;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select p.event_id, sum(p.points)::integer into v_event, v_points
  from public.event_points p
  where p.user_id = v_uid and p.ref_id = coalesce(p_ref_id, (
    select r.id from public.emergency_runs r where r.user_id = v_uid and r.day = public.game_day()
  ))
  group by p.event_id
  limit 1;
  if v_event is null then
    -- No points: say so when the running event did not admit the team.
    v_ref := coalesce(p_ref_id, (
      select r.id from public.emergency_runs r where r.user_id = v_uid and r.day = public.game_day()
    ));
    select * into v_running from public.events where id = public.current_event_id();
    -- An operation in an event that gives the operations no points: nothing to say (not a team problem).
    if exists (select 1 from public.coop_members m where m.room_id = v_ref and m.user_id = v_uid)
       and not exists (select 1 from jsonb_each_text(coalesce(v_running.points -> 'coop', '{}'::jsonb)) e where e.value::integer > 0) then
      return null;
    end if;
    if v_running.id is not null
       and not public.event_admits_everyone(v_running.traits, v_running.rarities, v_running.factions)
       and cardinality(public.event_ref_team(v_uid, v_ref)) > 0
       and not public.event_team_admitted(v_running.traits, v_running.rarities, v_running.factions,
                                          public.event_ref_team(v_uid, v_ref)) then
      return jsonb_build_object(
        'points', 0,
        'title', v_running.title,
        'total', (select coalesce(sum(p.points), 0) from public.event_points p
                  where p.event_id = v_running.id and p.user_id = v_uid),
        'new_rewards', 0,
        'not_admitted', true
      );
    end if;
    return null;
  end if;
  return jsonb_build_object(
    'points', v_points,
    'title', (select e.title from public.events e where e.id = v_event),
    'total', (select sum(p.points) from public.event_points p where p.event_id = v_event and p.user_id = v_uid),
    'new_rewards', (
      select count(*) from public.event_rewards r
      where r.event_id = v_event and r.user_id = v_uid and r.seen_at is null
    )
  );
end;
$$;
