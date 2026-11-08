-- Chapter 1 rewritten on the story in docs/STORY.md, and the ending a chapter
-- shows once the player has completed it. Only texts change: teams, Threats,
-- modifiers and rewards stay as they were tuned.

alter table public.story_chapters add column outro text;

comment on column public.story_chapters.outro is
  'How the chapter ends: shown only to a player who completed all its missions. Null while not written.';

update public.story_chapters set
  intro = 'Hai la licenza da Reggente da un''ora, e Ottavia, che l''ha presa con te, ti ha già soffiato la lastra migliore. Il primo incarico è al porto, dove la Compagnia Lete vende la soluzione ai guai che provoca.',
  outro = 'Nel caveau, tra le casse della Compagnia, c''è una pietra incisa con la lettera epsilon. Non fai in tempo a toccarla: il dottor Spanò del Banco la prende «in custodia», con tanto di ricevuta. Quella notte il sismografo registra una scossa sotto la metropolitana, nel momento esatto in cui la pietra esce dal caveau.'
where chapter = 1;

update public.story_missions m set
  title = v.title,
  intro = v.intro,
  opponent = v.opponent
from (values
  ('C1M1', 'Primo incarico',
   'Renata ti affida un lavoro facile: al mercato del pesce sparisce un portafoglio ogni cinque minuti. La banda di Foundling lavora in squadra, e tu per ora hai solo la tua.',
   'La banda di Foundling'),
  ('C1M2', 'Il pugile di vetro',
   'Cullet riscuote il pizzo sul molo 7 per una Compagnia che lo considera sacrificabile. Non ha mai perso un incontro, ma la sua mascella non regge un colpo.',
   'Gli esattori di Cullet'),
  ('C1M3', 'Blackout',
   'Il porto resta al buio e, cinque minuti dopo, la Compagnia noleggia generatori a ogni banchina. Il guasto porta la firma degli ingegneri di Blackbody.',
   'Gli ingegneri di Blackbody'),
  ('C1M4', 'Campane a mezzanotte',
   'Suonano le campane a mezzanotte, e non è il Rintocco. Sotto i magazzini i Figli dell''Ultima cercano una lettera dell''Alfabeto, ma qualcuno l''ha già portata via.',
   'I Figli dell''Ultima'),
  ('C1M5', 'Il caveau',
   'Tutte le piste portano al caveau della Compagnia Lete. A difenderlo c''è Ottavia con l''Eco di Vetrix: se vinci la sfida, il caveau si apre e quella lastra passa a te.',
   'Ottavia e la Compagnia Lete')
) as v(code, title, intro, opponent)
where m.code = v.code;

-- As before, plus the ending of every chapter the player has completed.
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
      'title', c.title,
      'intro', c.intro,
      'outro', case when not exists (
                 select 1 from public.story_missions m
                 where m.chapter = c.chapter
                   and not exists (select 1 from public.story_progress p where p.user_id = v_uid and p.mission_id = m.id)
               ) then c.outro end,
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
