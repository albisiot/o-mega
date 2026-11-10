-- Chapter 4 of the story mode, "Multitude" (docs/STORY.md §6): the upper
-- districts, the Figli dell'Ultima who speak through Multitude, the Echoes of
-- Custodi and Lanterne turned against you, Ottavia playing for the Figli, and
-- Antiphon as the boss, whose card is the prize. Multitude (Omega) is in the
-- boss team but is not the prize.
--
-- Teams, Threats and modifiers are tuned by simulation (SPEC §5.11): a player
-- with a random team who always sends the highest score wins about 73%, 62%,
-- 50%, 41% and 16% of the time. story_mission_unlocked orders the
-- missions by (chapter, ord), so C4M1 opens once C3M5 is completed. Only
-- Threats of Nuova Megara: the chapter never leaves the upper districts.

insert into public.story_chapters (chapter, title, intro, outro) values (4, 'Multitude',
  'Nei quartieri alti, quelli con vista sul vulcano, la gente sente pensieri che nessuno ha pensato. Renata, all''Ufficio Licenze, la chiama «stress da altitudine» e ti manda a controllare, rimborso del tram compreso. Da qualche giorno, però, anche i tuoi alleati pensano cose che non sono loro.',
  'Sconfitto Antiphon, Multitude ripete la mente che ascoltava prima di lui, e tutto il quartiere sente il ricordo di Renata: la notte dell''Ora Zero, lei che apre la camera del tempio, una pietra che si incide da sola e poi si spacca. Nel ricordo quella luce non si spegne mai, perché l''Ora Zero non è finita: laggiù sta ancora succedendo, solo molto piano. Poi Multitude fa sentire a tutti il pensiero che Ottavia non dice mai, suo fratello sparito quella notte, e il giorno dopo né Renata né Ottavia si trovano più; all''Ufficio Licenze c''è un cartello, «Torno subito». Al bar di Publican ti aspetta Retrograde, che ha già ordinato per due e lascia pagare te: «Sono già stato qui. La porta, la prossima volta, la apri tu.»');

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
  -- The Figli at the school gate: Lullaby, Tacet, Gazetteer, Epigone, Patina.
  ('C4M1', 4, 1, 'Pensieri di nessuno',
   'Hornbook sente in classe un pensiero in più, e non è di nessun bambino. All''uscita i Figli dell''Ultima regalano caramelle e opuscoli: se non li fermi, domani tutto il quartiere penserà la stessa cosa.',
   'Lullaby e il coro', 'medium',
   pg_temp.ids('card_definitions', array['P034', 'P072', 'P088', 'P011', 'P084']),
   pg_temp.ids('threat_definitions', array['T104', 'T308', 'T504', 'T202', 'T407']),
   '[null, null, {"code": "weak_link"}, {"code": "underdogs", "bonus": 3, "malus": 3, "commonMaxRank": 1, "eliteMinRank": 4}, null]', 60, null),
  -- The Echoes of the Custodi: Parley, Bulwark, Precinct, Dogwatch, Censor.
  ('C4M2', 4, 2, 'La negoziatrice',
   'A metà della trattativa per un ostaggio, Parley cambia parte e parla con una voce che non è la sua. Ora gli Echi dei Custodi difendono il tavolo sbagliato, e il conto lo paghi tu.',
   'Gli Echi dei Custodi', 'medium',
   pg_temp.ids('card_definitions', array['P050', 'P025', 'P086', 'P009', 'P094']),
   pg_temp.ids('threat_definitions', array['T203', 'T407', 'T110', 'T508', 'T304']),
   '[{"code": "weak_link"}, null, {"code": "hostile_ground", "favored": "neutrals", "hindered": "heroes", "bonus": 3, "malus": 2}, null, null]', 70, null),
  -- The Echoes of the telepath Lanterne: Fathom, Hapax, Vigil, Subsong, Hornbook.
  ('C4M3', 4, 3, 'Sentire troppo',
   'Le Lanterne telepati non distinguono più i propri pensieri da quelli degli altri. Qualcuno ha pensato che sei un nemico, e adesso i loro Echi lo pensano tutti insieme.',
   'Gli Echi delle Lanterne', 'hard',
   pg_temp.ids('card_definitions', array['P043', 'P048', 'P012', 'P117', 'P018']),
   pg_temp.ids('threat_definitions', array['T505', 'T303', 'T103', 'T406', 'T201']),
   '[null, null, null, {"code": "weak_link"}, null]', 80, null),
  -- Ottavia plays for the Figli and knows your team: Semaphore, Understudy, Procura, Sordina, Kiln.
  ('C4M4', 4, 4, 'Facce note',
   'Stavolta Ottavia schiera le sue lastre per i Figli, e conosce già le tue: gliele ha sussurrate qualcuno che ti legge nel pensiero. Prova a non pensare alla squadra mentre la scegli.',
   'Ottavia e le spie', 'hard',
   pg_temp.ids('card_definitions', array['P108', 'P008', 'P107', 'P037', 'P044']),
   pg_temp.ids('threat_definitions', array['T208', 'T604', 'T101', 'T404', 'T307']),
   '[null, null, null, {"code": "weak_link"}, {"code": "hostile_ground", "favored": "villains", "hindered": "heroes", "bonus": 3, "malus": 2}]', 90, null),
  -- The voices of the Figli: Antiphon (Beta), Multitude (Omega, not the prize), Belladonna, Lullaby, Tacet.
  ('C4M5', 4, 5, 'Ultima voce',
   'Sul terrazzo più alto del quartiere Antiphon parla e Multitude ripete, nella testa di mezza città. Se vinci, la voce tace e la lastra di Antiphon passa a te.',
   'Antiphon e Multitude', 'super_pro',
   pg_temp.ids('card_definitions', array['P111', 'P059', 'P016', 'P034', 'P072']),
   pg_temp.ids('threat_definitions', array['T305', 'T602', 'T105', 'T502', 'T209']),
   '[null, null, null, null, {"code": "hostile_ground", "favored": "heroes", "hindered": "villains", "bonus": 3, "malus": 2}]', 110,
   (select id from public.card_definitions where code = 'P111'));
