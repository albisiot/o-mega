-- Chapter 3 of season 3 "La montagna", "Il processo" (docs/STORY.md §7.5):
-- Eudaemon goes on trial for the order to drill on the night of the Ora Zero, and
-- the defence of the Compagnia is simple: in the records nobody went missing that
-- night, and since then a decree read by Attainder keeps anyone from saying the
-- names of the missing. Meanwhile the Compagnia offers the Comune a vent well on
-- the volcano, that is drilling again next to a waking giant, and keeps the lambda
-- and the mu in its vault at the port. Its lawyers who want the black box of
-- Absentia thrown out, its television that sells the well to the city council,
-- its gardens that drink grief offered to the families of the night shift, its
-- guards who empty the vault the night before the sentence, and Attainder as the
-- boss, fielded by the Reggente of the Compagnia in court with the Statera lent by
-- the Banco; his card is the prize. The ending is the reveal of the chapter (the
-- decree falls and the families say the names: the night shift was forty-two
-- workers, forty-one went missing in the Ora Zero and Nicola is the only one who
-- came out; among the forty-one is Efisio Puddu, who is Holdout; Eudaemon and the
-- Compagnia are convicted, the vault is seized and the lambda and the mu go back
-- in the seal after the kappa) and its hook: when the mu goes back the city shakes
-- under the Fosse, where the nu is, and at night the shake moves along the round
-- of Moth, up to the temple door.
--
-- The chapter is number 3 of season 3 and number 15 in the order of the whole
-- story, so C15M1 opens once C14M5 is completed. The ending of season 3 does not
-- change: it shows under the last chapter there is and still says that the next
-- chapter is coming, until chapter 6 closes the season.
--
-- Stars: every mission has its rarity and trait rules, and its stars pay 30
-- coins each, written here instead of the 40 of the starting formula
-- (story_default_star_coins), as docs/STORY.md §7.9 decided for chapters 13-16.
-- On the boss only Delta or Gamma stayed under 13% even with a good team, so the
-- rule also allows Beta, as on the boss of chapter 13.
--
-- Teams, Threats and modifiers are tuned by simulation (SPEC §5.11) on the
-- catalog and rules engine of chapter 14 (the 227 characters of the packs, 75
-- usual Threats; the rare Threats never appear in story missions nor in what the
-- bots know): a player with a random team who always sends the highest score wins
-- about 46%, 20%, 23%, 5.4% and 3.3% of the time. The descent of the difficulty
-- stops here, as the user decided on 22 November 2026 (docs/STORY.md §7.9): the
-- chapter is tuned on the same targets as chapter 14 (46%, 20%, 23%, 5.5% and
-- 3.5%), with the first mission the easiest of the chapter and the boss the
-- hardest, under mission 4. The teams are the ones of the chapter's sheet;
-- Matins, the voice of the morning news, is the second Omega in a mission that is
-- not a boss, after Thicket, and it is not a prize. Only Threats of Nuova Megara,
-- none repeated in the chapter. The first Threat of every mission is on theme:
-- Spia infiltrata (Understudy, the spy of the Compagnia in court; the player wins
-- that round about one time in two), Terremoto artificiale (the drilling of the
-- vent well, about one time in six), Ipnotizzatore (the gardens that take grief
-- away, about one time in five), Rissa al porto (the guards at the port, where
-- Gavel holds: about one time in nine) and Tribunale degli spettri (the court of
-- the forty-one, about one time in three). The Compagnia is strong in
-- intelligence and technology: with Codice cifrato, the black box, as first
-- Threat the player won that round two or three times in a hundred, and it was
-- dropped; the guards of mission 4 are weak in stealth, technology and speed, and
-- with Colpo al caveau as first Threat the player won that round more than ninety
-- times in a hundred. Modifiers: Sottovalutati in round 4 of mission 1,
-- Territorio ostile for the villains in round 5 of mission 3 and in rounds 3 and 4
-- of the boss, Anello debole in round 2 of mission 4; mission 2 has none.

insert into public.story_chapters (chapter, season, number, title, intro, outro) values (15, 3, 3, 'Il processo',
  'In tribunale, in centro, Eudaemon va a processo per l''ordine di trivellare dell''Ora Zero, e la difesa della Compagnia è semplice: nei registri quella notte non è sparito nessuno, e i nomi di chi manca non riesce a dirli nessuno, nemmeno le famiglie sedute in aula. Intanto la Compagnia offre al Comune la sua cura per il gigante, un pozzo di sfogo sul vulcano, cioè trivellare di nuovo, e nel caveau del porto tiene la lambda e la mu. Se il processo cade, si trivella accanto a un gigante che si sveglia, come la notte dell''Ora Zero, le due lettere restano alla Compagnia e le Fosse, casa tua compresa, restano zona rossa.',
  'Battuto Attainder, il suo decreto cade e le famiglie in aula dicono i nomi uno dopo l''altro: quella notte sulla trivella c''era il turno di notte, quarantadue operai, quasi tutti delle Fosse, e quarantuno sono spariti nell''Ora Zero; il quarantaduesimo, il più giovane, ne è uscito con un Segno, ed è Nicola. Tra i quarantuno c''è Efisio Puddu, che da quella notte nessuno chiamava più per nome: è Holdout, l''operaio che tiene la chiave di volta. La Statera, che adesso li trova nel registro, pesa il risarcimento, il tribunale condanna Eudaemon e la Compagnia, il contratto del pozzo è nullo e il caveau del porto è sequestrato: Renata rimette nell''anello la lambda e la mu, e Ottavia capisce perché suo fratello si era messo a capo dei Figli, che erano le famiglie dei suoi compagni. Ma quando la mu torna al suo posto la città trema sotto le Fosse, dove c''è la nu, e la scossa non sta ferma: di notte si sposta per il quartiere, sempre lungo la stessa strada, fino alla porta del tempio, ed è il giro di Moth.');

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
  -- The lawyers of the Compagnia want the black box of Absentia thrown out: Understudy, Signatory, Byline, Semaphore, Facsimile.
  ('C15M1', 15, 1, 'L''udienza',
   'Gli avvocati della Compagnia chiedono di escludere la scatola nera di Absentia, registrazione ottenuta senza licenza, e Signatory, che firma solo quello che ha letto, l''ha letta due volte. Se il giudice li ascolta, il processo finisce prima di cominciare.',
   'Signatory e gli avvocati', 'medium',
   pg_temp.ids('card_definitions', array['P008', 'P156', 'P031', 'P108', 'P098']),
   pg_temp.ids('threat_definitions', array['T208', 'T410', 'T106', 'T508', 'T305']),
   '[null, null, null, {"code": "underdogs", "bonus": 3, "malus": 3, "commonMaxRank": 1, "eliteMinRank": 4}, null]', 170, null,
   array['delta'], array['origin.tecnologia'], 30),
  -- The city council votes the vent well, and the television sells it: Erasure, Matins (Omega), Affissione, Contumax, Swarf.
  ('C15M2', 15, 2, 'Pozzo di sfogo',
   'In consiglio comunale si vota il pozzo di sfogo della Compagnia, e da una settimana Matins, la voce del notiziario del mattino, ripete che salverà le Fosse. Se passa, si trivella sul vulcano accanto al gigante che si sveglia.',
   'Matins e la televisione', 'medium',
   pg_temp.ids('card_definitions', array['P159', 'P230', 'P201', 'P158', 'P036']),
   pg_temp.ids('threat_definitions', array['T409', 'T206', 'T503', 'T102', 'T306']),
   '[null, null, null, null, null]', 180, null,
   array['delta', 'gamma'], array['origin.mestiere'], 30),
  -- Eudaemon offers the night shift families to take their grief away: Almoner, Custodia, Indemnity, Ademption, Lamprey (Beta).
  ('C15M3', 15, 3, 'Il dolore',
   'Eudaemon offre alle famiglie del turno di notte di togliere loro il dolore nei giardini di Almoner, gratis, se ritirano la denuncia. Isonomy, col megafono, chiede che i loro siano pesati come chiunque altro: se le famiglie firmano, non lo chiederà più nessuno.',
   'Almoner e i giardinieri', 'hard',
   pg_temp.ids('card_definitions', array['P155', 'P202', 'P136', 'P197', 'P090']),
   pg_temp.ids('threat_definitions', array['T209', 'T507', 'T110', 'T403', 'T307']),
   '[null, null, null, null, {"code": "hostile_ground", "favored": "villains", "hindered": "neutrals", "bonus": 3, "malus": 2}]', 190, null,
   array['delta', 'gamma'], array['group.lanterne'], 30),
  -- The night before the sentence the guards empty the vault at the port: Monopsony, Blackbody (Beta), Gavel (Beta), Reus, Pyrrhic.
  ('C15M4', 15, 4, 'Il sequestro',
   'La Compagnia ha offerto la lambda e la mu in cambio del processo, e Ottavia ha convinto Renata a dire di no: la notte prima della sentenza le guardie svuotano il caveau del porto. Se le lettere escono, il tribunale sequestrerà una stanza vuota.',
   'Monopsony e le guardie', 'hard',
   pg_temp.ids('card_definitions', array['P203', 'P049', 'P041', 'P219', 'P005']),
   pg_temp.ids('threat_definitions', array['T107', 'T605', 'T309', 'T501', 'T207']),
   '[null, {"code": "weak_link"}, null, null, null]', 200, null,
   array['delta', 'gamma'], array['group.custodi'], 30),
  -- The Reggente of the Compagnia fields Attainder in court: Attainder (Beta, the prize), Eudaemon (Beta), Statera, Errata (Beta), Mekana (Alfa).
  ('C15M5', 15, 5, 'Quarantun nomi',
   'In aula il Reggente della Compagnia schiera Attainder, con la Statera prestata dal Banco: finché regge il suo decreto, i quarantun nomi non si dicono e per la legge non è sparito nessuno. Se perdi, Eudaemon esce assolto; se vinci, la lastra di Attainder è tua.',
   'Attainder e la Compagnia', 'super_pro',
   pg_temp.ids('card_definitions', array['P116', 'P175', 'P220', 'P076', 'P056']),
   pg_temp.ids('threat_definitions', array['T510', 'T104', 'T406', 'T203', 'T610']),
   '[null, null, {"code": "hostile_ground", "favored": "villains", "hindered": "heroes", "bonus": 3, "malus": 2}, {"code": "hostile_ground", "favored": "villains", "hindered": "neutrals", "bonus": 3, "malus": 2}, null]', 220, (select id from public.card_definitions where code = 'P116'),
   array['delta', 'gamma', 'beta'], array['group.figli'], 30);
