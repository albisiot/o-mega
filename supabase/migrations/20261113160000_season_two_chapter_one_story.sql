-- Chapter 1 of season 2 "La marea", "L'asta" (docs/STORY.md §6.5): the night
-- after the eruption that did not happen, the Banco auctions the theta at the
-- Dogana of the port, and in the gulf Cariddi wakes up. Looters on the closed
-- port, the moving bridges of Bascule, the Figli bidding through Histrio, the
-- Compagnia raising the bid, and Gauger as the boss, fielded by Ottavia for
-- the Banco to defend the reserve price; her card is the prize. The ending
-- explains why Cariddi grows and how to stop it (the first eight letters, put
-- back in order), and that the theta, stolen after the auction, is in Nicola's
-- hands.
--
-- This is the first chapter of season 2: the migration adds the season, gives
-- season 1 an ending that points to it, and gives season 2 an ending that says
-- the next chapter is coming, since it shows under the last chapter there is.
-- The chapter is number 1 of season 2 and number 7 in the order of the whole
-- story (story_chapters.chapter): story_mission_unlocked orders the missions by
-- (chapter, ord), so C7M1 opens once C6M5 is completed.
--
-- Teams, Threats and modifiers are tuned by simulation (SPEC §5.11) on the
-- current catalog (217 characters, 75 usual Threats; the rare Threats never
-- appear in story missions nor in what the bots know): a player with a random
-- team who always sends the highest score wins about 63%, 42%, 38%, 24% and 11%
-- of the time; chapter 6 of season 1, measured the same way, gives 66%, 45%,
-- 39%, 27% and 14%. Only Threats of Nuova Megara: the chapter does not leave
-- the port. The boss opens on Ostaggio in banca, where the plates of the Banco
-- are strong: the player wins that round about one time in four.

insert into public.story_seasons (season, title, ending) values
  (2, 'La marea', 'Il prossimo capitolo della Stagione 2, La marea, arriva presto.');

update public.story_seasons
set ending = 'Hai finito la Stagione 1, Il Rintocco. Ti aspetta la Stagione 2, La marea.'
where season = 1;

insert into public.story_chapters (chapter, season, number, title, intro, outro) values (7, 2, 1, 'L''asta',
  'La notte dopo l''eruzione mancata nel golfo si è svegliato Cariddi, il gorgo che le barche girano al largo: tre volte al giorno beve il mare e lo risputa, e la prima onda ha già chiuso il porto e risalito le gallerie della metropolitana fino alle Fosse. Intanto alla Dogana il Banco mette all''asta la theta, e il Comune, che non ha soldi, manda te con la colletta del tuo quartiere in una scatola da scarpe. Se la pietra va alla Compagnia o ai Figli, nel sigillo non torna più, e ogni onda è più alta della precedente.',
  'Vinci l''asta e la theta è del Comune, pagata con i soldi delle Fosse; poi l''onda della mezzanotte entra nella Dogana, salta la luce e, quando torna, la pietra non c''è più, e il dottor Spanò allarga le braccia: «Consegnata. Quello che succede dopo la consegna non ci riguarda.» Dal molo vedi una barca senza luci uscire verso il gorgo: la theta ce l''ha Nicola. Al tempio Renata ti spiega il conto di Sibilla: chiuso il vulcano, l''energia ha trovato la strada del mare e sbuca da Cariddi, ogni onda arriva al tempio come una scossa, e una abbastanza alta allagherà le Fosse e farà cedere Holdout. Per richiudere la spaccatura sotto il mare bastano le prime otto lettere, dall''alfa alla theta, rimesse nell''anello in ordine, perché ognuna tiene solo se quella prima è al suo posto; e l''alfa, la prima, è al Comune, che non la vuole dare.');

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
  -- Looters on the closed port: Lagan, Deadweight, Higgler, Gantry, Busker.
  ('C7M1', 7, 1, 'Porto chiuso',
   'La prima onda ha buttato le barche sulle banchine, e gli Sciolti di Lagan saccheggiano i carichi arenati. Se spariscono, domani al mercato delle Fosse non c''è niente da mettere in tavola.',
   'Lagan e gli Sciolti', 'medium',
   pg_temp.ids('card_definitions', array['P125', 'P204', 'P152', 'P001', 'P123']),
   pg_temp.ids('threat_definitions', array['T310', 'T109', 'T508', 'T207', 'T407']),
   '[null, null, {"code": "weak_link"}, null, {"code": "underdogs", "bonus": 3, "malus": 3, "commonMaxRank": 1, "eliteMinRank": 4}]', 90, null),
  -- The tugboats of the Compagnia want the bridges down: Indemnity, Ballast, Onorario, Heading, Huckster.
  ('C7M2', 7, 2, 'I ponti mobili',
   'Bascule alza a mano i ponti mobili per far entrare i soccorsi, e i rimorchiatori della Compagnia, che entrano a pagamento, li vogliono giù. Se restano giù, le pompe per le gallerie delle Fosse aspettano al largo.',
   'Indemnity e i rimorchiatori', 'medium',
   pg_temp.ids('card_definitions', array['P136', 'P205', 'P196', 'P134', 'P096']),
   pg_temp.ids('threat_definitions', array['T107', 'T404', 'T202', 'T505', 'T301']),
   '[null, null, {"code": "hostile_ground", "favored": "villains", "hindered": "heroes", "bonus": 3, "malus": 2}, null, {"code": "weak_link"}]', 100, null),
  -- Histrio bids for the Figli with Nicola's money: Histrio, Emendatio, Lullaby, Lure, Busker.
  ('C7M3', 7, 3, 'Il prestanome',
   'All''asta i Figli dell''Ultima non si fanno vedere: per loro rilancia Histrio, attore di film d''azione, con i soldi di Nicola. Se vince lui, la theta va ai Figli e nel sigillo non torna più.',
   'Histrio e la claque', 'hard',
   pg_temp.ids('card_definitions', array['P166', 'P209', 'P034', 'P118', 'P123']),
   pg_temp.ids('threat_definitions', array['T208', 'T501', 'T103', 'T406', 'T308']),
   '[{"code": "focus"}, null, null, null, null]', 110, null),
  -- The Compagnia raises the bid to lock the theta in its vault: Errata, Bisque, Affissione, Mekana (Alfa), Vetrix (Alfa).
  ('C7M4', 7, 4, 'Il rilancio',
   'La Compagnia rilancia per chiudere la theta nel caveau di Vetrix, insieme alle lettere che compra per toglierle di mezzo. Se l''offerta resta sua, la pietra non esce più: la colletta delle Fosse non basta per rilanciare ancora.',
   'Errata e la Compagnia', 'hard',
   pg_temp.ids('card_definitions', array['P076', 'P128', 'P201', 'P056', 'P051']),
   pg_temp.ids('threat_definitions', array['T402', 'T205', 'T606', 'T105', 'T305']),
   '[null, null, null, null, {"code": "hostile_ground", "favored": "heroes", "hindered": "villains", "bonus": 3, "malus": 2}]', 120, null),
  -- The Banco defends the reserve price: Gauger (Beta, the prize), Herma, Jurat, Harrow (Alfa), Cerbero.
  ('C7M5', 7, 5, 'Aggiudicata',
   'Ottavia sconta il suo debito difendendo per il Banco il prezzo di riserva con Gauger, la doganiera incatenata alla scrivania. Se vinci, la theta va al Comune e la lastra di Gauger è tua; se perdi, resta al Banco.',
   'Ottavia e il Banco', 'super_pro',
   pg_temp.ids('card_definitions', array['P130', 'P139', 'P151', 'P113', 'P087']),
   pg_temp.ids('threat_definitions', array['T203', 'T509', 'T102', 'T607', 'T409']),
   '[null, {"code": "hostile_ground", "favored": "heroes", "hindered": "villains", "bonus": 3, "malus": 2}, null, null, null]', 140,
   (select id from public.card_definitions where code = 'P130'));
