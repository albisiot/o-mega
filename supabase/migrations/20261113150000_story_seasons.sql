-- Seasons of the story mode (docs/STORY.md §5, §6; SPEC §5.11). Chapters are
-- grouped in seasons, each with a title and an ending that the player reads
-- once every mission of the season is completed: under its last chapter in
-- the Story page and on the result of its last mission. The ending used to be
-- written in the client.
--
-- story_chapters.chapter stays the order of the whole story (season 1 is 1-6,
-- season 2 will be 7-12): story_mission_unlocked, the mission codes and the
-- links (/storia/?capitolo=) keep working as they are, also across seasons.
-- The player sees story_chapters.number, the chapter's number inside its
-- season. supabase/tests/story.test.sql checks that both orders agree.
--
-- Season 2 "La marea" is written in docs/STORY.md but not built: its row comes
-- with its first chapter, which also rewrites the ending of season 1. While a
-- season is still being built, its ending says that the next chapter is coming,
-- because it shows under the last chapter there is.
--
-- get_story and get_story_reward only gain fields: the client already online
-- keeps working until the new one is published.

create table public.story_seasons (
  season integer primary key check (season >= 1),
  title text not null,
  ending text not null
);

comment on table public.story_seasons is 'Seasons of the story mode: their chapters are played one after the other.';
comment on column public.story_seasons.ending is
  'Shown once the player has completed every mission of the season: under its last chapter and on the result of its last mission.';

-- No policies: get_story and get_story_reward show what a player may see.
alter table public.story_seasons enable row level security;
revoke all on table public.story_seasons from anon, authenticated;

insert into public.story_seasons (season, title, ending) values
  (1, 'Il Rintocco', 'Hai finito la Stagione 1, Il Rintocco. La prossima stagione arriva presto.');

alter table public.story_chapters
  add column season integer references public.story_seasons (season),
  add column number integer check (number >= 1);

update public.story_chapters set season = 1, number = chapter;

alter table public.story_chapters
  alter column season set not null,
  alter column number set not null,
  add constraint story_chapters_season_number_key unique (season, number);

comment on column public.story_chapters.chapter is
  'Order of the whole story: missions open in (chapter, ord) order, also from one season to the next.';
comment on column public.story_chapters.number is 'The chapter''s number inside its season, as the player sees it.';

-- As before, plus the season of every chapter and, on the last chapter of a
-- season, its ending once the whole season is completed.
create or replace function public.get_story()
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
      'season', c.season,
      'season_title', s.title,
      'number', c.number,
      'title', c.title,
      'intro', c.intro,
      'outro', case when not exists (
                 select 1 from public.story_missions m
                 where m.chapter = c.chapter
                   and not exists (select 1 from public.story_progress p where p.user_id = v_uid and p.mission_id = m.id)
               ) then c.outro end,
      'season_ending', case when not exists (
                         select 1 from public.story_chapters n where n.season = c.season and n.number > c.number
                       ) and not exists (
                         select 1 from public.story_missions m
                         join public.story_chapters sc on sc.chapter = m.chapter
                         where sc.season = c.season
                           and not exists (select 1 from public.story_progress p where p.user_id = v_uid and p.mission_id = m.id)
                       ) then s.ending end,
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
    join public.story_seasons s on s.season = c.season
  ), '[]'::jsonb);
end;
$$;

revoke execute on function public.get_story() from public, anon;
grant execute on function public.get_story() to authenticated;

-- As before, plus the ending of the season when this match completed its last
-- mission. is_last still says whether any mission follows in the whole story.
create or replace function public.get_story_reward(p_match_id uuid)
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
  v_chapter public.story_chapters;
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
  select * into v_chapter from public.story_chapters where chapter = v_mission.chapter;
  select * into v_progress from public.story_progress where user_id = v_uid and mission_id = v_mission.id;

  return jsonb_build_object(
    'mission', v_mission.code,
    'title', v_mission.title,
    'is_last', not exists (
      select 1 from public.story_missions n where (n.chapter, n.ord) > (v_mission.chapter, v_mission.ord)
    ),
    'season_ending', case when v_progress.match_id = p_match_id and not exists (
                       select 1 from public.story_missions n
                       join public.story_chapters nc on nc.chapter = n.chapter
                       where nc.season = v_chapter.season and (n.chapter, n.ord) > (v_mission.chapter, v_mission.ord)
                     ) then (select s.ending from public.story_seasons s where s.season = v_chapter.season) end,
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
