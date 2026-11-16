-- Chapter 6 of season 2 "La marea", "Cariddi" (docs/STORY.md §6.5), the end
-- of the season: with the highest tide of the year Nicola takes the theta to
-- the eye of Cariddi, to throw it into the rift where nobody could take it back.
-- The player crosses the gulf on Ferryman's boat with Ottavia, against the
-- Figli dell'Ultima in full: their boats on the closed port, the dark
-- lighthouse, Tenant leading the faithful to the eye, Vera Kross on the dry
-- floor of the gulf, and Clementia as the boss, fielded by the Reggente of the
-- Figli on the rim of the eye; her card is the prize. The ending is the reveal
-- of the chapter (Nicola gives the theta to his sister and lets himself be
-- taken, eight letters close the rift under the sea, Cariddi shrinks back and
-- Holdout speaks) and the hook of the season: with the seal closed nothing
-- keeps Holdout alive, and he wants it.
--
-- The chapter is number 6 of season 2 and number 12 in the order of the whole
-- story, so C12M1 opens once C11M5 is completed. It is the last chapter of
-- season 2: the ending of the season stops saying that the next chapter is
-- coming and says that the season is over. It shows under this chapter and on
-- the result of C12M5, only to whoever has completed every mission of the
-- season.
--
-- Teams, Threats and modifiers are tuned by simulation (SPEC §5.11) on the
-- same catalog and rules engine as chapters 4 and 5 of season 2 (231
-- characters, 75 usual Threats; the rare Threats never appear in story missions
-- nor in what the bots know): a player with a random team who always sends the
-- highest score wins about 52%, 28%, 27%, 11% and 4% of the time; chapter 5 of
-- season 2, measured the same way, gives 56%, 32%, 31%, 13% and 5%. Only
-- Threats of Nuova Megara: the gulf is the city's, and no Threat is used twice
-- in the chapter. The boss opens on Risveglio dell'antico, Cariddi at the top
-- of its tide, where the player wins the round about one time in ten, and the
-- hostile ground of the third round favours the villains; Wirepuller (Omega) is
-- in the team, not the prize, and Tenant fields both mission 3 and the boss, as
-- in the chapter's sheet.

insert into public.story_chapters (chapter, season, number, title, intro, outro) values (12, 2, 6, 'Cariddi',
  'Nicola è in mezzo al golfo con la theta, e con la marea più alta dell''anno vuole gettarla nell''occhio di Cariddi, dove nessuno potrà più riprenderla. Con il porto chiuso esce solo Ferryman, a tariffa tripla, e sulla sua barca ci sei tu con Ottavia, contro i Figli dell''Ultima al completo. Se la theta finisce nella spaccatura il sigillo non si chiuderà mai oltre la eta, e l''onda di stanotte è alta abbastanza da passare sopra le Fosse e far cedere Holdout.',
  'Sull''orlo dell''occhio, con l''onda che sale, Nicola alza la theta per gettarla nella spaccatura, ma Ottavia lo chiama per nome e lui gliela mette in mano. Renata la rimette nell''anello: otto lettere, la spaccatura sotto il mare si chiude, Cariddi torna un gorgo che le barche girano al largo e l''onda muore contro il molo, lontano dalle Fosse, mentre Nicola si lascia portare via dai Custodi. Nella camera del tempio, per la prima volta dall''Ora Zero, Holdout muove una mano e parla: «Quando saranno tutte e ventiquattro, potrò lasciare.» Sibilla spiega cosa vuol dire: con il sigillo chiuso l''energia smette di passare per Holdout e niente lo tiene più in vita, e lui lo sa, e lo vuole.');

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
  -- The boats of the Figli on the gulf: Dredge (Beta), Lagan, Hecatomb, Falx, Epigone.
  ('C12M1', 12, 1, 'La traversata',
   'Ferryman esce dal porto chiuso a luci spente, come quando porta fuori il contrabbando, ma le barche dei Figli pattugliano il golfo. Se fermano la sua barca, Nicola arriva all''occhio prima di te.',
   'Dredge e le barche dei Figli', 'medium',
   pg_temp.ids('card_definitions', array['P077', 'P125', 'P135', 'P066', 'P011']),
   pg_temp.ids('threat_definitions', array['T310', 'T101', 'T504', 'T208', 'T404']),
   '[null, null, null, null, null]', 140, null),
  -- The Figli at the dark lighthouse: Belladonna, Tacet, Patina, Lullaby, Cineris.
  ('C12M2', 12, 2, 'Il faro',
   'I Figli hanno spento il faro all''imboccatura del golfo, e le barche dei soccorsi vanno sugli scogli. Se resta spento, quando l''onda arriva alle Fosse non ci sarà una barca per portare via la gente.',
   'Belladonna e il faro spento', 'medium',
   pg_temp.ids('card_definitions', array['P016', 'P072', 'P084', 'P034', 'P071']),
   pg_temp.ids('threat_definitions', array['T508', 'T209', 'T402', 'T108', 'T301']),
   '[null, null, null, null, {"code": "hostile_ground", "favored": "heroes", "hindered": "neutrals", "bonus": 3, "malus": 2}]', 150, null),
  -- Tenant leads the boats of the faithful to the eye: Tenant (Beta), Emendatio (Beta), Credo, Dittograph (Beta), Quicklime.
  ('C12M3', 12, 3, 'Chi torna',
   'Tenant, che giura di essere tornato due volte dall''altra parte, porta le barche dei Figli verso l''occhio: «Il ritorno è compreso nel prezzo». Se arrivano prima di te, Nicola avrà intorno un muro di barche.',
   'Tenant e i pellegrini', 'hard',
   pg_temp.ids('card_definitions', array['P210', 'P209', 'P039', 'P225', 'P065']),
   pg_temp.ids('threat_definitions', array['T303', 'T502', 'T107', 'T401', 'T206']),
   '[null, null, null, null, {"code": "hostile_ground", "favored": "villains", "hindered": "neutrals", "bonus": 3, "malus": 2}]', 160, null),
  -- On the dry floor of the gulf, inside the eye: Vera Kross (Alfa), Antiphon (Beta), Noophage (Beta), Groma (Alfa), Praesidium (Beta).
  ('C12M4', 12, 4, 'L''occhio',
   'Nell''occhio del gorgo il fondo del golfo è all''asciutto e al centro brilla la spaccatura: Vera Kross aspetta chi scende, e dalla lancia del Banco il dottor Spanò accetta scommesse. Se ti ferma lei, nessuno arriva da Nicola prima dell''onda.',
   'Vera Kross nell''occhio', 'hard',
   pg_temp.ids('card_definitions', array['P054', 'P111', 'P174', 'P180', 'P226']),
   pg_temp.ids('threat_definitions', array['T403', 'T202', 'T607', 'T109', 'T306']),
   '[{"code": "hostile_ground", "favored": "villains", "hindered": "heroes", "bonus": 3, "malus": 2}, null, null, null, null]', 170, null),
  -- On the rim of the eye the Reggente of the Figli fields Clementia: Clementia (Alfa, the prize), Tenant (Beta), Wirepuller (Omega), Effigy (Alfa), Miliarium.
  ('C12M5', 12, 5, 'Il brutto tempo',
   'Sull''orlo dell''occhio il Reggente dei Figli schiera Clementia, che li ha fondati per riportare a casa chi l''Ora Zero si è preso, non per allagare le Fosse. Se perdi, Nicola getta la theta; se vinci, la sua lastra è tua.',
   'Clementia e i Figli', 'super_pro',
   pg_temp.ids('card_definitions', array['P214', 'P210', 'P132', 'P079', 'P161']),
   pg_temp.ids('threat_definitions', array['T609', 'T106', 'T405', 'T205', 'T506']),
   '[null, null, {"code": "hostile_ground", "favored": "villains", "hindered": "heroes", "bonus": 3, "malus": 2}, {"code": "underdogs", "bonus": 3, "malus": 3, "commonMaxRank": 1, "eliteMinRank": 4}, null]', 190,
   (select id from public.card_definitions where code = 'P214'));

-- Season 2 is complete: its ending now says so, under chapter 12 and on the
-- result of C12M5, for whoever has completed every mission of the season.
update public.story_seasons
set ending = 'Hai finito la Stagione 2, La marea. La prossima stagione arriva presto.'
where season = 2;
