-- Integration test for the Allarme Triplo reveal pause (20261114150000_triple_reveal_pages.sql):
-- the first round waits the usual pause, the later ones the longer one for the comic pages.
-- Runs inside a rolled-back transaction:
--   npm run test:db

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000f6', 'authenticated', 'authenticated', 'triple-pause@example.test',
   '{"full_name": "Pausa Triplo"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000000f6", "role": "authenticated"}', true);
select public.bootstrap_player();
reset role;

do $$
declare
  v_a uuid := '00000000-0000-4000-8000-0000000000f6';
  v_deck uuid[] := (select array_agg(s.id) from (
    select id from public.card_instances where owner_id = v_a order by acquired_at, id limit 9) s);
  v_bot uuid[] := (select array_agg(s.id) from (
    select id from public.card_definitions where is_active order by code limit 9) s);
  v_threats uuid[] := (select array_agg(s.id order by s.code) from (
    select id, code from public.threat_definitions where code in ('T107', 'T201', 'T606')) s);
  v_match uuid;
  v_timer integer := public.config_int('triple.round_timer_seconds');
begin
  assert public.config_int('triple.reveal_pause_seconds') = 40, 'the longer pause';

  v_match := public.match_create_triple_bot(v_a, 'hard', v_deck, v_bot, v_threats);
  assert (select bool_and(deadline_at = now() + make_interval(secs => public.config_int('match.reveal_pause_seconds') + v_timer))
          from public.match_rounds where match_id = v_match and round between 1 and 3), 'round 1: the usual pause';

  perform public.open_triple_round(v_match, 2);
  assert (select count(*) from public.match_rounds where match_id = v_match and round between 4 and 6) = 3, 'round 2 opened';
  assert (select bool_and(deadline_at = now() + make_interval(secs => public.config_int('triple.reveal_pause_seconds') + v_timer))
          from public.match_rounds where match_id = v_match and round between 4 and 6), 'round 2: the pause for the pages';
  perform public.finish_match(v_match, 'b', 'forfeit');
end $$;

rollback;
