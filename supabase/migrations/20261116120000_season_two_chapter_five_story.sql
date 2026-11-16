-- Chapter 5 of season 2 "La marea", "Le Fosse" (docs/STORY.md §6.5): the wave
-- of Cariddi reaches the Fosse, where the player lives, and the Compagnia
-- pushes it there with the wind of Katabatic, sold by the hour to the upper
-- districts to keep the wave away from their piers. The collectors of the
-- Compagnia selling floodgates in instalments, the Compagnia that wants to
-- switch Unbidden off, the Figli looking for Xenolith and the zeta in his chest,
-- Contumax announcing a favourable wind on TV, and Katabatic as the boss,
-- fielded by the Reggente of the Compagnia at the wind station; its card is the
-- prize. The ending is the reveal of the chapter (the zeta and then the eta,
-- taken by Ottavia from the chest of Absentia, go back into the ring; the armour
-- sits down and does not get up again; seven letters stop the wave on the first
-- step of the Fosse) and the hook: the city shakes in the middle of the gulf,
-- where Nicola is at sea with the theta on the highest tide of the year.
--
-- The chapter is number 5 of season 2 and number 11 in the order of the whole
-- story, so C11M1 opens once C10M5 is completed. The ending of season 2 does not
-- change (the next chapter is coming): it now shows under this chapter, the
-- last one there is, and on the result of C11M5.
--
-- Teams, Threats and modifiers are tuned by simulation (SPEC §5.11) on the same
-- catalog and rules engine as chapter 4 of season 2 (231 characters, Sacrificio
-- lasting to the end of the match, 75 usual Threats; the rare Threats never
-- appear in story missions nor in what the bots know): a player with a random
-- team who always sends the highest score wins about 56%, 32%, 31%, 13% and 5%
-- of the time; chapter 4 of season 2, measured the same way, gives 58%, 34%,
-- 33%, 17% and 7%. Only Threats of Nuova Megara: the chapter does not leave the
-- city, and no Threat is used twice in it. Mission 2 opens on Intelligenza
-- ribelle, where the engineers of the Compagnia win the round almost every
-- time; the hostile ground that favours the heroes there, the side of Unbidden,
-- leaves the player about one round in five. The boss opens on Tempesta
-- elettrica, where the player wins the round about one time in three;
-- Mischance (Alfa) is in the team, not the prize.

insert into public.story_chapters (chapter, season, number, title, intro, outro) values (11, 2, 5, 'Le Fosse',
  'Di notte Absentia regge ancora l''acqua, ma la zeta che deve tornare nell''anello prima della eta è nel petto di Xenolith, nascosto dalle Lanterne in un rifugio delle Fosse che, da quando la epsilon è al suo posto, trema a ogni onda: lo sanno tutti, anche Nicola. Intanto la Compagnia vende ai quartieri alti il vento di Katabatic, che spinge l''onda lontano dai loro moli, cioè verso casa tua. Se l''onda delle tre entra alle Fosse, il quartiere finisce sott''acqua, e con lui il bar di Publican e la radio di Longwave.',
  'Vinta la sfida, alla stazione il vento gira, e Xenolith si fa togliere la zeta dal petto: gli restano un buco che si chiuderà in un mese e la forza di un cavatore qualunque, e Renata rimette la pietra nell''anello, dopo la epsilon. Subito dopo Ottavia toglie la eta dal petto di Absentia e Renata mette al suo posto anche quella, mentre l''armatura si siede in mezzo alla strada e non si rialza più. Con sette lettere nel sigillo l''onda delle tre si ferma sul primo gradino delle Fosse. Ma quando la eta lascia l''armatura la città trema dove c''è la lettera successiva, e non è in città: è in mezzo al golfo, dove Nicola è in mare con la theta, e stanotte c''è la marea più alta dell''anno.');

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
  -- The collectors of the Compagnia selling floodgates in instalments: Gavel, Cullet, Indemnity, Billable, Signatory.
  ('C11M1', 11, 1, 'Sacchi di sabbia',
   'Alle Fosse si riempiono sacchi di sabbia davanti a ogni porta, e gli esattori della Compagnia vendono paratie a rate a chi non può pagarle. Se li lasci fare, i tuoi vicini firmano debiti per vent''anni e i sacchi restano vuoti.',
   'Gavel e gli esattori', 'medium',
   pg_temp.ids('card_definitions', array['P041', 'P019', 'P136', 'P222', 'P156']),
   pg_temp.ids('threat_definitions', array['T102', 'T408', 'T210', 'T503', 'T308']),
   '[null, null, null, null, null]', 130, null),
  -- The Compagnia that wants to switch Unbidden off: Byline, Facsimile, Bisque, Blackbody, Almoner.
  ('C11M2', 11, 2, 'Quaranta braccia',
   'Unbidden, l''intelligenza di quartiere delle Lanterne, alza paratie gratis con quaranta braccia, e la Compagnia, che le vende a rate, la vuole spegnere. Se ci riesce, alle Fosse restano solo i sacchi di sabbia.',
   'Byline e la Compagnia', 'medium',
   pg_temp.ids('card_definitions', array['P031', 'P098', 'P128', 'P049', 'P155']),
   pg_temp.ids('threat_definitions', array['T604', 'T103', 'T407', 'T205', 'T306']),
   '[{"code": "hostile_ground", "favored": "heroes", "hindered": "villains", "bonus": 3, "malus": 2}, null, null, null, null]', 140, null),
  -- The Figli looking for Xenolith house by house: Theriarch, Hospes, Kiln, Dittograph, Falx.
  ('C11M3', 11, 3, 'Il battito',
   'Nicola sente la zeta come un battito, e i Figli cercano Xenolith casa per casa: lui vuole darti la pietra, le Lanterne che lo nascondono no. Se i Figli arrivano prima di te, la cerniera si ferma alla epsilon.',
   'Theriarch e i Figli', 'hard',
   pg_temp.ids('card_definitions', array['P160', 'P176', 'P044', 'P225', 'P066']),
   pg_temp.ids('threat_definitions', array['T305', 'T508', 'T110', 'T403', 'T208']),
   '[null, null, {"code": "hostile_ground", "favored": "heroes", "hindered": "neutrals", "bonus": 3, "malus": 2}, null, null]', 150, null),
  -- The weather on TV: Contumax, Erasure, Understudy, Gazetteer, Insula.
  ('C11M4', 11, 4, 'Il meteo',
   'Contumax, il vecchio supercattivo che ora fa il meteo in TV, annuncia «vento favorevole» mentre l''onda punta dritta sulle Fosse: favorevole a chi lo paga. Se nessuno lo smentisce, alle tre la gente delle Fosse è ancora in casa.',
   'Contumax e la redazione', 'hard',
   pg_temp.ids('card_definitions', array['P158', 'P159', 'P008', 'P088', 'P223']),
   pg_temp.ids('threat_definitions', array['T209', 'T601', 'T101', 'T402', 'T307']),
   '[null, null, {"code": "hostile_ground", "favored": "neutrals", "hindered": "villains", "bonus": 3, "malus": 2}, null, null]', 160, null),
  -- The wind station: Katabatic (Alfa, the prize), Eudaemon, Errata, Mischance (Alfa), Malleus.
  ('C11M5', 11, 5, 'Vento di terra',
   'Alla stazione del vento, sul fianco del vulcano, il Reggente della Compagnia schiera Katabatic, il vento che la Compagnia vende a ore, e l''onda delle tre è già partita. Se perdi, il vento la spinge sulle Fosse; se vinci, il vento gira e la sua lastra è tua.',
   'Katabatic e la Compagnia', 'super_pro',
   pg_temp.ids('card_definitions', array['P122', 'P175', 'P076', 'P131', 'P029']),
   pg_temp.ids('threat_definitions', array['T207', 'T501', 'T104', 'T610', 'T404']),
   '[null, null, null, null, {"code": "hostile_ground", "favored": "villains", "hindered": "heroes", "bonus": 3, "malus": 2}]', 180,
   (select id from public.card_definitions where code = 'P122'));
