-- Chapter 2 of season 3 "La montagna", "Vall'Oscura" (docs/STORY.md §7.5): to put
-- Re Tifeo back to sleep the seal needs the iota and the kappa, and the Figli
-- have them; only Nicola can sense where, and he is in a cell of the Custodi and,
-- for the Figli, a traitor since he gave the theta to his sister. The Custodi who
-- will not let him out, the Banco that wants to pay his bail, Thicket, the fog
-- forest of Vall'Oscura where you no longer know who is next to you, the Figli
-- still faithful to Nicola who ask him to come back, and Tenant as the boss,
-- fielded by the Reggente of the Figli in their clearing; his card is the prize.
-- The ending is the reveal of the chapter (the iota and the kappa go back in the
-- seal after the theta and the hand under the Fosse stops; Nicola helps, and says
-- where the other letters are) and its hook: when the kappa goes back the city
-- shakes at the port, under the vault of the Compagnia, and the next morning the
-- Compagnia offers the Comune a vent well on the volcano, signed by Eudaemon.
--
-- The chapter is number 2 of season 3 and number 14 in the order of the whole
-- story, so C14M1 opens once C13M5 is completed. The ending of season 3 does not
-- change: it shows under the last chapter there is and still says that the next
-- chapter is coming, until chapter 6 closes the season.
--
-- Stars: every mission has its rarity and trait rules, and its stars pay 30
-- coins each, written here instead of the 40 of the starting formula
-- (story_default_star_coins), as docs/STORY.md §7.9 decided for chapters 13-16.
--
-- Teams, Threats and modifiers are tuned by simulation (SPEC §5.11) on the
-- catalog and rules engine of chapter 13 (the 227 characters of the packs, 75
-- usual Threats; the rare Threats never appear in story missions nor in what the
-- bots know): a player with a random team who always sends the highest score wins
-- about 46%, 20%, 23%, 5.5% and 3.5% of the time, two or three points under the
-- matching missions of chapter 13 (49%, 23%, 26%, 8% and 5%). The teams are the
-- ones of the chapter's sheet. Thicket, the fog forest itself, is the first Omega
-- in a mission that is not a boss; it is not a prize. Only Threats of Nuova
-- Megara, none repeated in the chapter. The first mission opens on Rivolta in
-- carcere with a hostile ground that favors the villains, the prisoners, against
-- the heroes of the Custodi: without it the player won that round about one time
-- in ten, with it about four in ten. The boss opens on Armata del caos, the camp
-- of the Figli, where the player wins the round about one time in five, and it
-- has no modifiers. The first mission stays the easiest of the chapter and the
-- boss the hardest.

insert into public.story_chapters (chapter, season, number, title, intro, outro) values (14, 3, 2, 'Vall''Oscura',
  'Per rimettere a dormire Re Tifeo servono la iota e la kappa, e le hanno i Figli: dove, lo sente solo Nicola, chiuso in una cella dei Custodi e per i Figli un traditore, da quando ha dato la theta alla sorella. Se esce, con Ottavia di scorta ti porta a Vall''Oscura, il bosco sul fianco del vulcano dove radici, bestie e nebbia sono un animale solo. Senza quelle due lettere la cerniera non parte e alla prossima scossa lo sgombero delle Fosse riparte, casa tua compresa; e se Nicola sparisce nella nebbia, nessuno sa più dove sono le altre.',
  'Nella radura, in una cassetta da munizioni, i Figli tenevano la iota e la kappa: Renata le rimette nell''anello dopo la theta, e quella notte la mano sotto le Fosse non si muove, così lo sgombero resta sospeso e a casa tua si dorme. Nicola non è scappato a nessun banco di nebbia, e sulla strada del ritorno Ottavia gli chiede perché aiuta: lui risponde che l''esplosione deve finire, in un modo o nell''altro, e che così almeno la città resta in piedi. Poi dice dove sono le altre: la lambda e la mu nel caveau della Compagnia al porto, la nu vicino al tempio, le ultime tre sulla montagna; e infatti, quando la kappa torna al suo posto, la città trema al porto, proprio sotto il caveau. La mattina dopo la Compagnia offre al Comune di trivellare un pozzo di sfogo sul vulcano, e sul contratto c''è la firma di Eudaemon, che domani va a processo.');

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
  -- Praecursor and the Custodi will not let Nicola out of his cell: Praecursor, Interpres, Scion, Precinct, Dogwatch.
  ('C14M1', 14, 1, 'Il colloquio',
   'Nicola è in una cella dei Custodi, e Praecursor, che arriva sempre prima dei guai, è già davanti alla porta: è il capo dei Figli, e il processo non è cominciato. Se non esce, nessuno sa dove cercare le lettere.',
   'Praecursor e i Custodi', 'medium',
   pg_temp.ids('card_definitions', array['P162', 'P165', 'P200', 'P086', 'P009']),
   pg_temp.ids('threat_definitions', array['T405', 'T208', 'T509', 'T110', 'T310']),
   '[{"code": "hostile_ground", "favored": "villains", "hindered": "heroes", "bonus": 3, "malus": 2}, null, null, null, null]', 160, null,
   array['delta', 'gamma'], array['origin.segno'], 30),
  -- The Banco wants to pay Nicola's bail: Residuo (Alfa), Regina Ix (Beta), Herma (Beta), Escrow, Clepsydra (Beta).
  ('C14M2', 14, 2, 'La cauzione',
   'Il dottor Spanò vuole pagare la cauzione di Nicola, in contanti e con ricevuta: chi sente le lettere vale più di qualunque lettera. Se Residuo, il suo esattore di garanzia, se lo porta via, Nicola le cerca per il Banco.',
   'Residuo e il Banco', 'medium',
   pg_temp.ids('card_definitions', array['P227', 'P102', 'P139', 'P032', 'P178']),
   pg_temp.ids('threat_definitions', array['T203', 'T501', 'T105', 'T409', 'T301']),
   '[null, {"code": "weak_link"}, null, null, null]', 170, null,
   array['delta', 'gamma'], array['group.sciolti'], 30),
  -- The sentinels of the Figli in the fog of Vall'Oscura: Thicket (Omega), Lullaby, Tacet, Patina, Epigone.
  ('C14M3', 14, 3, 'La nebbia',
   'Vall''Oscura è Thicket, un bosco di nebbia che è un animale solo, e dentro non sai più chi hai accanto. Ottavia giura che il fratello scapperà al primo banco di nebbia: se lo perdi, perdi le lettere.',
   'Thicket e le sentinelle', 'hard',
   pg_temp.ids('card_definitions', array['P231', 'P034', 'P072', 'P084', 'P011']),
   pg_temp.ids('threat_definitions', array['T308', 'T101', 'T510', 'T204', 'T408']),
   '[null, null, null, null, null]', 180, null,
   array['delta'], array['nature.creatura'], 30),
  -- The Figli still faithful to Nicola ask him to come back: Credo, Belladonna, Miliarium, Hospes (Beta), Cineris.
  ('C14M4', 14, 4, 'Il vecchio capo',
   'I Figli rimasti fedeli a Nicola gli hanno tenuto il posto a tavola e gli chiedono di tornare: a Tenant non hanno mai creduto. Se resta con loro, la scorta torna giù senza di lui.',
   'Credo e i fedeli', 'hard',
   pg_temp.ids('card_definitions', array['P039', 'P016', 'P161', 'P176', 'P071']),
   pg_temp.ids('threat_definitions', array['T209', 'T606', 'T104', 'T403', 'T303']),
   '[null, null, null, null, null]', 190, null,
   array['delta', 'gamma'], array['group.figli'], 30),
  -- The Reggente of the Figli fields Tenant in their clearing: Tenant (Beta, the prize), Emendatio (Beta), Dittograph (Beta), Noophage (Beta), Kiln (Beta).
  ('C14M5', 14, 5, 'Il campo',
   'Nella radura dei Figli il Reggente schiera Tenant, che ha la iota e la kappa e promette che il ritorno è compreso nel prezzo. Se perdi, le lettere restano ai Figli; se vinci, la sua lastra è tua.',
   'Tenant e i Figli', 'super_pro',
   pg_temp.ids('card_definitions', array['P210', 'P209', 'P225', 'P174', 'P044']),
   pg_temp.ids('threat_definitions', array['T605', 'T206', 'T410', 'T109', 'T506']),
   '[null, null, null, null, null]', 210, (select id from public.card_definitions where code = 'P210'),
   array['delta', 'gamma'], array['group.custodi'], 30);
