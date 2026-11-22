-- Chapter 5 of season 3 "La montagna", "Quello che sta" (docs/STORY.md §7.5):
-- when the nu went back in the seal, on the flank of the volcano Mainstay swayed
-- for the first time in four generations: the colossus of a hundred and forty
-- metres that stands still above a mountain village, and that the villagers call
-- "Quello che sta". Nicola feels the next two letters right under his feet. The
-- farmers of the Piana who let nobody up since the trucks of the Compagnia began
-- to pass, with Bubalus; the Figli who mine the road above the village to bring
-- the mountain down on it; the Custodi of the village who let nobody near the
-- colossus; the colossus hunters of Hollowbone, paid by the Compagnia, who wait
-- for him to move so they can fell him and sell his bones; and Mainstay as the
-- boss, fielded by the Reggente of the village; his card is the prize. The ending
-- is the reveal of the chapter (Mainstay steps aside and the village learns why
-- he stood there: under the houses is the knee of Re Tifeo, and for four
-- generations he held it down with his weight; under his feet, crushed in the
-- rock, are the xi and the omicron, fallen there on the night of the Ora Zero;
-- the knee rises a metre, but with thirteen letters in place the giant is cooler
-- and the houses hold, and Renata puts the two letters back in the seal after the
-- nu) and its hook: when the omicron goes back the crater shakes, because the pi
-- is up there in the tents of the Figli, and up there is Mongibello, who has held
-- back the eruption for months without sleeping and is at the end of his
-- strength.
--
-- The chapter is number 5 of season 3 and number 17 in the order of the whole
-- story, so C17M1 opens once C16M5 is completed. The ending of season 3 does not
-- change: it shows under the last chapter there is and still says that the next
-- chapter is coming, until chapter 6 closes the season.
--
-- Stars: every mission has its rarity and trait rules, and its stars pay 40 coins
-- each, written here instead of the 50 of the starting formula
-- (story_default_star_coins), as docs/STORY.md §7.9 decided for chapters 17-18.
-- On the boss Delta or Gamma won exactly 13% with a good team, on the edge of the
-- rule, so the rule also allows Beta (31%), as on the bosses of chapters 13, 15
-- and 16.
--
-- Teams, Threats and modifiers are tuned by simulation (SPEC §5.11) on the
-- catalog and rules engine of chapters 14-16 (the 227 characters of the packs, 75
-- usual Threats; the rare Threats never appear in story missions nor in what the
-- bots know): a player with a random team who always sends the highest score wins
-- about 46%, 20%, 23%, 5.7% and 3.6% of the time. As the user decided on 22
-- November 2026 (docs/STORY.md §7.9) the chapter is tuned on the same targets as
-- chapters 14-16 (46%, 20%, 23%, 5.5% and 3.5%), with the first mission the
-- easiest of the chapter and the boss the hardest, under mission 4, which stays
-- above 5%. The teams are the ones of the chapter's sheet. Only Threats of Nuova
-- Megara, none repeated in the chapter. The first Threat of every mission is on
-- theme: Inseguimento in autostrada (Bubalus, who charges anything with wheels on
-- the road of the Piana; the player wins that round about two times in five),
-- Terremoto artificiale (the mines of the Figli, about three times in five), Muro
-- pericolante (the landslides the Custodi say Mainstay keeps away, about three
-- times in four), Golem di cemento (the colossi Hollowbone knows how to fell, a
-- bit more than one time in two) and Gigante risvegliato (the knee under the
-- village, a bit less than one time in four). In mission 3 the player almost
-- never wins rounds 4 and 5, so winning it means winning the first three.
-- Modifiers: Colpo mirato in round 5 of mission 1 (without it, 42%); Anello
-- debole in round 1 and Territorio ostile for the villains, the Figli, in round 5
-- of mission 2 (without them, 52%); none in mission 3; Territorio ostile for the
-- villains, the hunters, in round 1 and for the neutrals against the heroes in
-- round 4 of mission 4 (without them, 10%); Territorio ostile for the heroes, the
-- Custodi of the village, in rounds 1 and 2 of the boss (without them, about 10%;
-- with round 1 only, 6%, above mission 4).

insert into public.story_chapters (chapter, season, number, title, intro, outro) values (17, 3, 5, 'Quello che sta',
  'Rimessa la nu, sul fianco del vulcano ha ondeggiato per la prima volta in quattro generazioni Mainstay, il colosso di centoquaranta metri fermo sopra un paese di montagna, e Nicola sente le prossime due lettere proprio sotto i suoi piedi. Per arrivarci devi attraversare la Piana, dove i contadini non fanno passare nessuno, e salire una strada chiusa dalle frane, mentre i Figli vogliono far franare la montagna e i cacciatori della Compagnia aspettano che il colosso cada. Se Mainstay si sposta prima del tempo il paese finisce sotto la frana; se resta dov''è, la xi e la omicron restano sotto di lui, la mano sotto le Fosse riprende a girarsi e alla prossima scossa lo sgombero riparte, da casa tua.',
  'Battuto Mainstay, il colosso fa un passo di lato, l''acqua dei pozzi si abbassa e il paese capisce finalmente perché stava lì: sotto le case c''è il ginocchio di Re Tifeo, e da quattro generazioni Mainstay lo teneva giù con il suo peso. Sotto i suoi piedi, schiacciate nella roccia, ci sono la xi e la omicron, cadute lì la notte dell''Ora Zero; il ginocchio si alza di un metro e il paese trema, ma con tredici lettere al loro posto il gigante si scalda meno e le case reggono. Renata rimette nell''anello anche queste due, quindici lettere in tutto, e Mainstay rimette i piedi dove li ha sempre tenuti. Ma quando la omicron torna al suo posto trema il cratere: la pi è lassù, nelle tende dei Figli, e lassù c''è Mongibello, che trattiene l''eruzione da mesi senza dormire ed è allo stremo.');

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
  (code, chapter, ord, title, intro, opponent, bot_difficulty, bot_definition_ids, threat_ids, threat_modifiers, reward_coins, reward_definition_id,
   star_rarities, star_traits, star_coins)
values
  -- The farmers of the Piana let nobody up to the volcano: Bubalus (Beta), Harrow (Alfa), Dowser, Wardmother, Tourniquet.
  ('C17M1', 17, 1, 'La Piana',
   'Da quando passano i camion della Compagnia, nella Piana Bubalus carica tutto quello che ha le ruote, e i contadini non fanno salire nessuno verso il vulcano. Se non passi prima di notte, la prossima frana chiude la strada e il paese resta irraggiungibile.',
   'Bubalus e i contadini', 'medium',
   pg_temp.ids('card_definitions', array['P129', 'P113', 'P138', 'P004', 'P169']),
   pg_temp.ids('threat_definitions', array['T407', 'T106', 'T508', 'T201', 'T307']),
   '[null, null, null, null, {"code": "focus"}]', 190, null,
   array['delta', 'gamma'], array['origin.mestiere'], 40),
  -- The Figli mine the road above the village: Kiln (Beta), Hecatomb, Quicklime, Cineris, Miliarium.
  ('C17M2', 17, 2, 'La frana',
   'I Figli minano la strada sopra il paese e Kiln scalda la roccia finché si spacca: vogliono la frana. Se la montagna viene giù sulle case, Mainstay si sposta per salvarle, e in quattro generazioni non si è mai spostato.',
   'Kiln e i Figli', 'medium',
   pg_temp.ids('card_definitions', array['P044', 'P135', 'P065', 'P071', 'P161']),
   pg_temp.ids('threat_definitions', array['T409', 'T207', 'T505', 'T104', 'T310']),
   '[{"code": "weak_link"}, null, null, null, {"code": "hostile_ground", "favored": "villains", "hindered": "heroes", "bonus": 3, "malus": 2}]', 200, null,
   array['delta', 'gamma'], array['group.custodi'], 40),
  -- The Custodi of the village let nobody near the colossus: Ropework, Aerie, Noctiluca, Portitor (Beta), Quarantine (Alfa).
  ('C17M3', 17, 3, 'Il paese',
   'I Custodi del paese non fanno avvicinare nessuno al colosso e ti mandano contro Ropework, la squadra in cordata che tira fuori la gente dalle frane: giurano che Mainstay li protegge, e nessuno ha mai chiesto da cosa. Se non passi, le due lettere restano sotto i suoi piedi.',
   'Ropework e i Custodi', 'hard',
   pg_temp.ids('card_definitions', array['P146', 'P070', 'P069', 'P172', 'P182']),
   pg_temp.ids('threat_definitions', array['T102', 'T404', 'T205', 'T507', 'T302']),
   '[null, null, null, null, null]', 210, null,
   array['delta', 'gamma'], array['group.lanterne'], 40),
  -- The colossus hunters of Hollowbone wait for Mainstay to move: Hollowbone, Praesidium (Beta), Warren (Beta), Contromano (Alfa), Mischance (Alfa).
  ('C17M4', 17, 4, 'Le ossa',
   'I cacciatori di colossi di Hollowbone, pagati dalla Compagnia, aspettano che Mainstay si sposti per farlo cadere sul suo stesso peso e venderne le ossa. Se cade, le lettere sotto i suoi piedi sono loro e il paese perde Quello che sta.',
   'Hollowbone e i cacciatori', 'hard',
   pg_temp.ids('card_definitions', array['P157', 'P226', 'P212', 'P215', 'P131']),
   pg_temp.ids('threat_definitions', array['T304', 'T603', 'T101', 'T503', 'T202']),
   '[{"code": "hostile_ground", "favored": "villains", "hindered": "heroes", "bonus": 3, "malus": 2}, null, null, {"code": "hostile_ground", "favored": "neutrals", "hindered": "heroes", "bonus": 3, "malus": 2}, null]', 220, null,
   array['delta', 'gamma'], array['nature.creatura'], 40),
  -- The Reggente of the village fields Mainstay: Mainstay (Alfa, the prize), Plinth (Beta), Talos (Alfa), Impetus (Alfa), Codicil (Beta).
  ('C17M5', 17, 5, 'Un metro',
   'Il Reggente del paese schiera Mainstay, che un metro fuori dal suo raggio non protegge nessuno e in quattro generazioni quel metro non l''ha mai fatto. Se perdi, non si sposta e le lettere restano sotto di lui; se vinci, la lastra di Mainstay è tua.',
   'Mainstay e il paese', 'super_pro',
   pg_temp.ids('card_definitions', array['P183', 'P112', 'P091', 'P121', 'P115']),
   pg_temp.ids('threat_definitions', array['T501', 'T105', 'T405', 'T203', 'T309']),
   '[{"code": "hostile_ground", "favored": "heroes", "hindered": "neutrals", "bonus": 3, "malus": 2}, {"code": "hostile_ground", "favored": "heroes", "hindered": "villains", "bonus": 3, "malus": 2}, null, null, null]', 240, (select id from public.card_definitions where code = 'P183'),
   array['delta', 'gamma', 'beta'], array['origin.mito'], 40);
