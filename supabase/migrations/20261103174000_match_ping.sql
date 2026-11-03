-- A match between players cost about 36 requests a minute even when nobody
-- moved: each client read the whole state every 5 seconds (and settled
-- abandoned matches and expired picks each time) and sent a heartbeat every
-- 10 seconds. Broadcasts already announce every change, so the client now
-- sends one light request instead: it marks the player present and answers
-- the opponent's last sign of life plus the few values that every visible
-- change touches. The client reads the whole state only when a broadcast
-- arrives, when this answer shows that one was missed, or while broadcasts
-- cannot arrive. match_heartbeat stays for clients still running the old code.

create function public.match_ping(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches;
  v_side text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_match from public.matches where id = p_match_id;
  v_side := case when v_match.player_a = v_uid then 'a' when v_match.player_b = v_uid then 'b' end;
  if v_side is null then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;

  if v_match.status = 'active' then
    update public.match_teams set last_seen_at = now() where match_id = p_match_id and side = v_side;
  end if;

  return jsonb_build_object(
    'status', v_match.status,
    'current_round', v_match.current_round,
    -- Only whether the opponent has chosen, never what.
    'opponent_has_chosen', exists (
      select 1 from public.pending_plays pp
      where pp.match_id = p_match_id and pp.round = v_match.current_round and pp.side <> v_side
    ),
    -- Null without a pick. True once settled, or once its time is up: reading
    -- the state then settles it.
    'conquest_settled', (
      select c.resolved_at is not null or c.deadline_at < now()
      from public.conquest_claims c where c.match_id = p_match_id
    ),
    'opponent_last_seen_at', (
      select t.last_seen_at from public.match_teams t where t.match_id = p_match_id and t.side <> v_side
    ),
    'server_now', now()
  );
end;
$$;

revoke execute on function public.match_ping(uuid) from public, anon;
grant execute on function public.match_ping(uuid) to authenticated;
