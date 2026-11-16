-- Emergenza: the lineups of the day's podium (SPEC §5.10). The threats are the same
-- for everyone, so today's lineups would let a player copy the best team: they are
-- shown only to whoever has already finished today's attempt. The others see the
-- podium of yesterday, a day that is over. The leaderboard rows still never show
-- characters.

insert into public.game_config (key, value, description) values
  ('emergency.lineups_shown', '3', 'Places of the Emergenza leaderboard whose lineups can be seen');

-- The first places of a day (as the leaderboard ranks them) with their eight cards,
-- each drawn as it was played (base or variant), in the order played; the cards a
-- run never reached come last, with no play.
create function public.emergency_lineups_payload(p_day date, p_viewer uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'rank', t.rank,
    'username', pr.username,
    'avatar_url', pr.avatar_url,
    'title', pr.title,
    'passed', t.passed,
    'total_score', t.total_score,
    'is_me', t.user_id = p_viewer,
    'cards', (
      select coalesce(jsonb_agg(
        public.card_payload(u.definition_id, u.instance_id) || jsonb_build_object(
          'instance_id', u.instance_id,
          'play', case when p.round is null then null else jsonb_build_object(
            'round', p.round, 'threat', th.name, 'score', p.score, 'required', p.required_score, 'passed', p.passed
          ) end
        ) order by p.round nulls last, u.slot
      ), '[]'::jsonb)
      from unnest(t.card_instance_ids, t.definition_ids) with ordinality as u(instance_id, definition_id, slot)
      left join public.emergency_plays p on p.run_id = t.id and p.card_instance_id = u.instance_id
      left join public.threat_definitions th on th.id = p.threat_id
    )
  ) order by t.rank), '[]'::jsonb)
  from (
    select r.*,
      row_number() over (order by r.passed desc, r.total_score desc, r.finished_at, r.user_id)::integer as rank
    from public.emergency_runs r
    where r.day = p_day and r.status = 'finished'
  ) t
  join public.profiles pr on pr.id = t.user_id
  where t.rank <= public.config_int('emergency.lineups_shown')
$$;

revoke execute on function public.emergency_lineups_payload(date, uuid) from public, anon, authenticated;

-- Client RPC: { day, live, lineups }. live: today's podium, for a player whose attempt
-- of today is finished; otherwise yesterday's.
create function public.get_emergency_lineups()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_today date := public.game_day();
  v_live boolean;
  v_day date;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  v_live := exists (
    select 1 from public.emergency_runs r where r.user_id = v_user and r.day = v_today and r.status = 'finished'
  );
  v_day := case when v_live then v_today else v_today - 1 end;
  return jsonb_build_object(
    'day', v_day,
    'live', v_live,
    'lineups', public.emergency_lineups_payload(v_day, v_user)
  );
end;
$$;

revoke execute on function public.get_emergency_lineups() from public, anon;
grant execute on function public.get_emergency_lineups() to authenticated;
