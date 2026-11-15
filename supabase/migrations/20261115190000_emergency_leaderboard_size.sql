-- Emergenza: the day's leaderboard shows the first 10 players (it was 3 on the
-- result screen), with the title each one shows (Imprese). The size is a
-- balance value, so it lives in game_config rather than in the function.

insert into public.game_config (key, value, description) values
  ('emergency.leaderboard_size', '10', 'Players shown in the Emergenza leaderboard of the day');

-- The size comes from game_config now, not from the client.
drop function public.get_emergency_leaderboard(integer);

-- ---------------------------------------------------------------------------
-- Client RPC: today's leaderboard. Only finished runs, and no characters: what
-- others played would give away the day's threats. `me` is the caller's own
-- place, also when it is below the first ones.
-- ---------------------------------------------------------------------------

create function public.get_emergency_leaderboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_size integer := public.config_int('emergency.leaderboard_size');
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  return (
    with ranked as (
      select
        row_number() over (order by r.passed desc, r.total_score desc, r.finished_at) as rank,
        r.user_id, r.passed, r.total_score, pr.username, pr.avatar_url, pr.title
      from public.emergency_runs r
      join public.profiles pr on pr.id = r.user_id
      where r.day = public.game_day() and r.status = 'finished'
    )
    select jsonb_build_object(
      'players', count(*),
      'top', coalesce(jsonb_agg(jsonb_build_object(
        'rank', rank, 'username', username, 'avatar_url', avatar_url, 'title', title,
        'passed', passed, 'total_score', total_score, 'is_me', user_id = auth.uid()
      ) order by rank) filter (where rank <= v_size), '[]'::jsonb),
      'me', (
        select jsonb_build_object(
          'rank', m.rank, 'username', m.username, 'avatar_url', m.avatar_url, 'title', m.title,
          'passed', m.passed, 'total_score', m.total_score, 'is_me', true
        )
        from ranked m where m.user_id = auth.uid()
      )
    )
    from ranked
  );
end;
$$;

revoke execute on function public.get_emergency_leaderboard() from public, anon;
grant execute on function public.get_emergency_leaderboard() to authenticated;
