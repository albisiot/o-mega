-- Chapter 1 of season 3 "La montagna", "La mano" (docs/STORY.md §7.5): with the
-- rift under the sea closed, the energy has gone back under the volcano, and its
-- heat is waking Re Tifeo, the giant of the myth who sleeps under the mountain
-- with his right hand under the Fosse. One night the Fosse rise by a palm, and
-- the Comune, instead of asking why, declares them a red zone and orders the
-- eviction. The paid rescuers of the Compagnia under the rubble, Stentore
-- reading the notice for the Custodi, the Figli digging in the necropolis where
-- the floor is warm and beats, the appraisers of the Banco buying houses at a
-- tenth of the price, and Recesso as the boss, the officer the eviction order is
-- made out to, fielded by the Reggente of the Comune; his card is the prize. The
-- ending is the reveal of the chapter (the floor is the palm of Re Tifeo, why he
-- wakes, and that the eight letters from the iota to the pi put him back to
-- sleep; the eviction is suspended) and its hook: the iota and the kappa are
-- with the Figli, and only Nicola, in a cell of the Custodi, can sense where.
--
-- This is the first chapter of season 3: the migration adds the season, gives
-- season 2 an ending that points to it, and gives season 3 an ending that says
-- the next chapter is coming, since it shows under the last chapter there is.
-- The chapter is number 1 of season 3 and number 13 in the order of the whole
-- story, so C13M1 opens once C12M5 is completed.
--
-- Stars: every mission has its rarity and trait rules, and its stars pay 30
-- coins each, written here instead of the 40 of the starting formula
-- (story_default_star_coins), as docs/STORY.md §7.9 decided for chapters 13-16.
--
-- Teams, Threats and modifiers are tuned by simulation (SPEC §5.11) on the
-- current catalog and rules engine (the 227 characters of the packs, 75 usual
-- Threats; the rare Threats never appear in story missions nor in what the bots
-- know): a player with a random team who always sends the highest score wins
-- about 49%, 23%, 26%, 8% and 5% of the time; chapter 6 of season 2,
-- measured again the same way, gives 51%, 25%, 29%, 10% and 12% (its boss, tuned
-- at 4%, has become easier with the catalog and rules changes since then). The
-- teams are the ones of the chapter's sheet. Only Threats of Nuova Megara, none
-- repeated in the chapter. The boss opens on Terremoto artificiale, where the
-- player wins the round about one time in fifteen: Collasso della città, the
-- most fitting for the red zone, gave it about one time in fifty as the first
-- Threat, so it is the third, and still the hardest round of the match. The
-- first mission stays the easiest of the chapter and the boss the hardest.

insert into public.story_seasons (season, title, ending) values
  (3, 'La montagna', 'Il prossimo capitolo della Stagione 3, La montagna, arriva presto.');

update public.story_seasons
set ending = 'Hai finito la Stagione 2, La marea. Ti aspetta la Stagione 3, La montagna.'
where season = 2;

insert into public.story_chapters (chapter, season, number, title, intro, outro) values (13, 3, 1, 'La mano',
  'Chiusa la spaccatura sotto il mare, alle Fosse si dorme tranquilli una notte sola: la seconda il quartiere si alza di un palmo, come se sotto qualcosa si fosse girato nel sonno, e la mattina mezza via è puntellata. Il Comune, invece di chiedersi perché, dichiara le Fosse zona rossa e ordina lo sgombero in quarantotto ore, casa tua compresa. Se lo sgombero passa le Fosse si svuotano e se le compra il Banco a un decimo del prezzo, e ogni volta che il quartiere si muove un altro palazzo si crepa.',
  'Nella necropoli Strata assaggia il pavimento caldo delle tombe e dice che non è pietra: è osso di tremila anni, il palmo di una mano grande come il quartiere, quella di Re Tifeo, il gigante che dorme sotto il vulcano, e i Greci gli costruirono le tombe sulla mano perché il peso dei morti la tenesse ferma. Sibilla spiega perché si sveglia: chiusa la spaccatura sotto il mare l''energia è tornata sotto il vulcano e il suo calore lo scalda, e se si alza la montagna si apre e la scossa fa cedere Holdout; per rimetterlo a dormire bisogna chiudere anche quella spaccatura, con le otto lettere dalla iota alla pi rimesse nell''anello in ordine, dopo la theta. Battuto Recesso lo sgombero è sospeso finché la mano non si muove di nuovo, e il primo a disfare gli scatoloni è proprio lui, anche se il Banco ha già comprato le prime case della zona rossa. La iota e la kappa le hanno i Figli, e una sola persona può sentire dove: Nicola, in una cella dei Custodi.');

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
  -- The paid rescuers of the Compagnia under the rubble: Billable, Indemnity, Huckster, Cullet, Typo.
  ('C13M1', 13, 1, 'Sotto le macerie',
   'Mezzo palazzo della tua via è venuto giù, e i soccorritori della Compagnia tirano fuori la gente dalle macerie col tassametro acceso. Se scavano solo loro, i tuoi vicini escono vivi ma con un conto che non finiranno di pagare.',
   'Billable e i soccorritori', 'medium',
   pg_temp.ids('card_definitions', array['P222', 'P136', 'P096', 'P019', 'P024']),
   pg_temp.ids('threat_definitions', array['T102', 'T301', 'T504', 'T208', 'T403']),
   '[null, null, {"code": "hostile_ground", "favored": "villains", "hindered": "neutrals", "bonus": 3, "malus": 2}, null, null]', 150, null,
   array['delta', 'gamma'], array['origin.mestiere'], 30),
  -- Stentore reads the notice and the Custodi start from your street: Stentore, Macadam, Azimuth, Censor, Bulwark.
  ('C13M2', 13, 2, 'L''avviso',
   'Stentore, la statua che non sa parlare piano, legge col megafono di bronzo l''avviso del Comune: le Fosse sono zona rossa, tutti fuori in quarantotto ore. Se non fermi i Custodi, cominciano dalla tua via.',
   'Stentore e i Custodi', 'medium',
   pg_temp.ids('card_definitions', array['P127', 'P007', 'P063', 'P094', 'P025']),
   pg_temp.ids('threat_definitions', array['T309', 'T505', 'T207', 'T404', 'T103']),
   '[null, {"code": "hostile_ground", "favored": "neutrals", "hindered": "villains", "bonus": 3, "malus": 2}, null, null, null]', 160, null,
   array['delta', 'gamma'], array['group.custodi'], 30),
  -- The Figli digging in the necropolis: Belladonna, Credo, Hecatomb, Quicklime, Theriarch.
  ('C13M3', 13, 3, 'Il pavimento',
   'Strata ti porta nella necropoli sotto la metropolitana: il pavimento delle tombe è caldo e batte come un polso, e i Figli ci scavano già. Se li lasci scavare, stanotte le Fosse si alzano di nuovo e un altro palazzo viene giù.',
   'Theriarch nella necropoli', 'hard',
   pg_temp.ids('card_definitions', array['P016', 'P039', 'P135', 'P065', 'P160']),
   pg_temp.ids('threat_definitions', array['T501', 'T305', 'T104', 'T410', 'T204']),
   '[{"code": "hostile_ground", "favored": "villains", "hindered": "neutrals", "bonus": 3, "malus": 2}, null, {"code": "focus"}, null, null]', 170, null,
   array['delta', 'gamma'], array['origin.mito'], 30),
  -- The appraisers of the Banco buying houses: Gymnasiarch (Alfa), Futures, Actuary (Beta), Custos, Escrow.
  ('C13M4', 13, 4, 'Compro casa',
   'Il dottor Spanò gira le Fosse con i periti del Banco e compra le case della zona rossa a un decimo del prezzo, in contanti. Se i tuoi vicini firmano, finito lo sgombero il quartiere è suo.',
   'Actuary e i periti', 'hard',
   pg_temp.ids('card_definitions', array['P229', 'P106', 'P047', 'P149', 'P032']),
   pg_temp.ids('threat_definitions', array['T203', 'T601', 'T107', 'T405', 'T302']),
   '[null, {"code": "hostile_ground", "favored": "neutrals", "hindered": "heroes", "bonus": 3, "malus": 2}, null, {"code": "hostile_ground", "favored": "neutrals", "hindered": "villains", "bonus": 3, "malus": 2}, null]', 180, null,
   array['delta', 'gamma'], array['group.banco'], 30),
  -- The Reggente of the Comune fields Recesso to carry out the eviction: Recesso (Beta, the prize), Palladium (Alfa), Truss (Beta), Noctiluca, Aerie.
  ('C13M5', 13, 5, 'Zona rossa',
   'Il Reggente del Comune schiera Recesso, l''ufficiale dello sgombero, che abita alle Fosse anche lui: l''ordinanza non l''ha scritta, gliel''hanno intestata. Se perdi, domattina le Fosse si svuotano; se vinci, la sua lastra è tua.',
   'Recesso e i Custodi', 'super_pro',
   pg_temp.ids('card_definitions', array['P224', 'P141', 'P075', 'P069', 'P070']),
   pg_temp.ids('threat_definitions', array['T409', 'T105', 'T602', 'T209', 'T507']),
   '[null, null, null, null, null]', 200, (select id from public.card_definitions where code = 'P224'),
   array['delta', 'gamma', 'beta'], array['group.lanterne'], 30);
