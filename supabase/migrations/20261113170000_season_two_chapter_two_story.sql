-- Chapter 2 of season 2 "La marea", "Tra due onde" (docs/STORY.md §6.5): the
-- first four letters of the seal, alpha, beta, gamma and delta, go from the
-- archive of the Comune to the temple, underground, in the eight hours between
-- two waves of Cariddi. The Ufficio Licenze that will not sign them out,
-- Injunction of the Soprintendenza who binds them as protected finds, the metro
-- line closed since the Ora Zero where the Sciolti paid by the Compagnia wait for
-- the convoy, the Figli sent by Nicola to steal one stone, and Polifemo as the
-- boss, fielded by the Compagnia at the entrance of the excavations; his card is
-- the prize. The ending is the strange thing of the chapter (a letter slides
-- back into its place by itself, and the explosion steps back one beat) and the
-- hook: someone is pulling letters out from the other end of the seal.
--
-- The chapter is number 2 of season 2 and number 8 in the order of the whole
-- story, so C8M1 opens once C7M5 is completed. The ending of season 2 does not
-- change (the next chapter is coming): it now shows under this chapter, the
-- last one there is, and on the result of C8M5.
--
-- Teams, Threats and modifiers are tuned by simulation (SPEC §5.11) on the same
-- catalog as chapter 1 of season 2 (217 characters, 75 usual Threats; the rare
-- Threats never appear in story missions nor in what the bots know): a player
-- with a random team who always sends the highest score wins about 60%, 38%,
-- 36%, 21% and 9% of the time; chapter 1 of season 2, measured again the same
-- way, gives 63%, 42%, 38%, 24% and 11%. Only Threats of Nuova Megara: the
-- chapter does not leave the city, and no Threat is used twice in it. The boss
-- opens on Mostro delle fogne, where the player wins the round about one time
-- in nine; on Gigante risvegliato, the giant of the scheda, almost never.

insert into public.story_chapters (chapter, season, number, title, intro, outro) values (8, 2, 2, 'Tra due onde',
  'Le prime quattro lettere del sigillo, alfa, beta, gamma e delta, sono nell''archivio del Comune, e Renata le vuole al tempio: il convoglio deve scendere per la linea della metropolitana chiusa dall''Ora Zero, nelle otto ore tra un''onda di Cariddi e l''altra. Al Comune, però, tutti dicono di sì e nessuno firma, e la Compagnia paga gli Sciolti per fermarti. Se l''onda ti trova in galleria le pietre finiscono sott''acqua, e ogni giorno perso l''onda arriva più in alto sulle Fosse.',
  'Nella camera del tempio Renata appoggia l''alfa al suo posto nell''anello, e la pietra ci scivola dentro da sola; i detriti sospesi arretrano di un palmo, e per la prima volta dall''Ora Zero l''esplosione torna indietro di un battito. Dopo l''alfa entrano la beta, la gamma e la delta, e a ogni lettera i detriti arretrano ancora: con quattro lettere al loro posto l''onda delle tre arriva più bassa sulle Fosse, e Holdout apre gli occhi. Tre notti dopo, però, l''onda torna a crescere, e Longwave registra scosse che non vengono dalle tue pietre: qualcuno tira fuori le lettere dall''altra parte del sigillo, dalla iota in avanti. Mentre tu le rimetti a posto dall''alfa, Nicola le toglie.');

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
  -- The clerks of the Ufficio Licenze field the plates of the archive: Custos, Ultravires, Diaria, Signifer, Sextant.
  ('C8M1', 8, 1, 'Il protocollo',
   'All''Ufficio Licenze nessuno firma l''uscita delle quattro pietre: senza, come si chiameranno le lastre Alfa, Beta, Gamma e Delta? Se gli impiegati ti fermano con gli Echi dell''archivio, il convoglio non parte e l''onda sale ancora sulle Fosse.',
   'Custos e l''archivio', 'medium',
   pg_temp.ids('card_definitions', array['P149', 'P148', 'P191', 'P190', 'P097']),
   pg_temp.ids('threat_definitions', array['T309', 'T509', 'T101', 'T409', 'T204']),
   '[null, null, null, null, {"code": "hostile_ground", "favored": "heroes", "hindered": "neutrals", "bonus": 3, "malus": 2}]', 100, null),
  -- The Soprintendenza binds the stones as protected finds: Injunction, Clepsydra, Pentimento, Dosimeter, Headway.
  ('C8M2', 8, 2, 'Il vincolo',
   'Injunction, della Soprintendenza, mette il vincolo sulle pietre e ti dice perché: «Non le dico che sotto c''è qualcosa: le dico che è ancora acceso.» Se il vincolo resta, le pietre non escono dall''archivio.',
   'Injunction e la Soprintendenza', 'medium',
   pg_temp.ids('card_definitions', array['P179', 'P178', 'P170', 'P144', 'P062']),
   pg_temp.ids('threat_definitions', array['T205', 'T503', 'T105', 'T410', 'T307']),
   '[null, null, null, null, {"code": "weak_link"}]', 110, null),
  -- The closed metro line: Holloway, Sottovento, Recusant, Hireling, Dowser.
  ('C8M3', 8, 3, 'La linea chiusa',
   'Il convoglio passa per la linea chiusa dall''Ora Zero, dove i pendolari di Holloway aspettano ancora la prossima fermata e gli Sciolti pagati dalla Compagnia aspettano te. Se ti fermano, l''onda delle tre trova le pietre in galleria.',
   'Holloway e gli Sciolti', 'hard',
   pg_temp.ids('card_definitions', array['P177', 'P195', 'P153', 'P168', 'P138']),
   pg_temp.ids('threat_definitions', array['T301', 'T505', 'T110', 'T407', 'T206']),
   '[null, {"code": "underdogs", "bonus": 3, "malus": 3, "commonMaxRank": 1, "eliteMinRank": 4}, null, null, null]', 120, null),
  -- Nicola sends the Figli to steal one stone: Hecatomb, Miliarium, Credo, Falx, Cineris.
  ('C8M4', 8, 4, 'Una basta',
   'Nicola sente le pietre passare sotto le Fosse e manda i Figli a prenderne una: a lui ne basta una. Se ti portano via l''alfa, le altre tre nel sigillo non tengono.',
   'Hecatomb e i Figli', 'hard',
   pg_temp.ids('card_definitions', array['P135', 'P161', 'P039', 'P066', 'P071']),
   pg_temp.ids('threat_definitions', array['T306', 'T606', 'T106', 'T508', 'T209']),
   '[{"code": "hostile_ground", "favored": "villains", "hindered": "neutrals", "bonus": 3, "malus": 2}, {"code": "hostile_ground", "favored": "neutrals", "hindered": "heroes", "bonus": 3, "malus": 2}, null, null, null]', 130, null),
  -- The Compagnia blocks the entrance of the excavations: Polifemo (Beta, the prize), Almoner, Malleus, Inhumer (Beta), Antecessor (Alfa).
  ('C8M5', 8, 5, 'L''occhio solo',
   'All''ingresso degli scavi la Compagnia, che con il sigillo più stretto pesca meno energia, schiera Polifemo: abita alle Fosse, e lo pagano per fermare il convoglio che salverebbe casa sua. Se vinci, le pietre arrivano al tempio e la sua lastra è tua.',
   'Polifemo e la Compagnia', 'super_pro',
   pg_temp.ids('card_definitions', array['P089', 'P155', 'P029', 'P211', 'P184']),
   pg_temp.ids('threat_definitions', array['T401', 'T109', 'T605', 'T207', 'T507']),
   '[null, null, null, null, {"code": "hostile_ground", "favored": "neutrals", "hindered": "heroes", "bonus": 3, "malus": 2}]', 150,
   (select id from public.card_definitions where code = 'P089'));
