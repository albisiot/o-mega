-- Chapter 5 of the story mode, "La porta" (docs/STORY.md §6): the Compagnia's
-- power plant and archive, the Custodi at the dig, Renata with her old plates,
-- and Keelstone at the temple door as the boss, whose card is the prize.
-- The ending tells the secret in full: the chamber, Holdout holding the keystone
-- of the seal, and the Figli who will wake the volcano.
--
-- Teams, Threats and modifiers are tuned by simulation (SPEC §5.11) on the
-- current catalog (187 characters, 75 Threats): a player with a random team who
-- always sends the highest score wins about 67%, 49%, 45%, 29% and 17% of
-- the time; chapter 4, measured the same way, gives 69%, 52%, 69%, 31% and 20%.
-- story_mission_unlocked orders the missions by (chapter, ord), so C5M1 opens
-- once C4M5 is completed. Only Threats of Nuova Megara: the chapter never
-- leaves the city.

insert into public.story_chapters (chapter, title, intro, outro) values (5, 'La porta',
  'Adesso sai cosa c''è sotto la città: un''esplosione ferma a metà nella camera del tempio, e i Figli dell''Ultima che cercano la strada per arrivarci. Per capire perché non è ancora finita devi passare dalla centrale della Compagnia e poi dalla porta del tempio, che i Custodi non aprono a nessuno, licenza o non licenza. Nessuno sa dirti cosa succede se quella cosa riparte, ma le Fosse, il tuo quartiere, ci stanno proprio sopra.',
  'Oltre la porta c''è la camera: una palla di luce con i detriti sospesi a mezz''aria e, al centro, Holdout, l''operaio del turno di notte, che da allora tiene con le mani la pietra dell''omega, la chiave di volta del sigillo delle ventiquattro lettere; Moth gli porta da mangiare ogni sera, perché tenere ferma un''esplosione, dice lui, mette appetito. Sibilla, il cervello della centrale, fa i conti da quella notte e te li spiega in parole semplici: ogni lettera tolta dal suo posto allenta il sigillo, una scossa abbastanza forte farebbe cedere Holdout, e se Holdout cede Nuova Megara salta in aria, Fosse comprese. Renata confessa che il permesso alla trivella della Compagnia l''aveva firmato lei, poi si siede davanti alla porta, al posto di Keelstone, e dice che da lì non si sposta più. Moth, che entra ovunque, sa anche il resto: i Figli non vogliono le lettere per rimetterle a posto ma per allentare il sigillo, e per il colpo finale sveglieranno il vulcano, che dà la scossa più forte di tutte e nasconde anche la theta; Ottavia è con loro, perché le hanno promesso di portarla da suo fratello.');

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
  -- The Compagnia at the power plant: Mekana, Swarf, Blackbody, Odonate, Typo.
  ('C5M1', 5, 1, 'Il trono di rame',
   'Della centrale è rimasta in piedi metà, tenuta insieme dal campo magnetico di Perpetuum, e Mekana, dal suo trono di rame, non vuole visite. Se ti caccia, i registri della Compagnia su quella notte finiscono nel reattore.',
   'Mekana e la Compagnia', 'medium',
   pg_temp.ids('card_definitions', array['P056', 'P036', 'P049', 'P067', 'P024']),
   pg_temp.ids('threat_definitions', array['T207', 'T507', 'T106', 'T409', 'T306']),
   '[null, null, null, {"code": "hostile_ground", "favored": "neutrals", "hindered": "villains", "bonus": 3, "malus": 2}, null]', 70, null),
  -- The Compagnia's lawyers erase the permit: Attainder, Semaphore, Byline, Erasure, Signatory.
  ('C5M2', 5, 2, 'Il decreto',
   'All''archivio del Comune Attainder cancella nomi dai registri, a cominciare dal permesso di scavo firmato da Renata per la Compagnia. Se arrivi tardi, la trivella di quella notte non è mai esistita, e nessuno ne risponde.',
   'Attainder e l''ufficio legale', 'medium',
   pg_temp.ids('card_definitions', array['P116', 'P108', 'P031', 'P159', 'P156']),
   pg_temp.ids('threat_definitions', array['T608', 'T103', 'T308', 'T201', 'T401']),
   '[null, {"code": "hostile_ground", "favored": "heroes", "hindered": "villains", "bonus": 3, "malus": 2}, null, null, {"code": "weak_link"}]', 80, null),
  -- The Custodi at the entrance of the dig: Bulwark, Hawser, Censor, Plinth, Ignifuge.
  ('C5M3', 5, 3, 'Le colonne',
   'All''ingresso degli scavi i Custodi stanno fermi come colonne e giurano che il tempio è solo un rudere. Se non passi, i Figli scenderanno da un''altra parte, e lo saprai dalla prossima scossa sotto le Fosse.',
   'Il picchetto dei Custodi', 'hard',
   pg_temp.ids('card_definitions', array['P025', 'P013', 'P094', 'P112', 'P023']),
   pg_temp.ids('threat_definitions', array['T309', 'T503', 'T104', 'T404', 'T203']),
   '[null, {"code": "hostile_ground", "favored": "neutrals", "hindered": "heroes", "bonus": 3, "malus": 2}, null, null, null]', 90, null),
  -- Renata and the plates from her days at the dig: Talos, Dogwatch, Wardmother, Apostate, Heirloom.
  ('C5M4', 5, 4, 'La vecchia licenza',
   'Renata è ricomparsa con la sua vecchia licenza da Reggente e le lastre di quando scavava il tempio, Talos compreso. Se perdi, tu torni alle Fosse a contare le scosse e lei a fingere di non saperne niente.',
   'Renata e le vecchie lastre', 'hard',
   pg_temp.ids('card_definitions', array['P091', 'P009', 'P004', 'P045', 'P085']),
   pg_temp.ids('threat_definitions', array['T509', 'T205', 'T606', 'T108', 'T310']),
   '[null, {"code": "focus"}, null, null, null]', 100, null),
  -- The door of the temple: Keelstone (Alfa, the prize), Impetus (Alfa), Codicil, Nightward, Precinct.
  ('C5M5', 5, 5, 'Nessuno passa',
   'Davanti alla porta del tempio Keelstone non si è mai spostato dall''Ora Zero, e il Reggente dei Custodi lo schiera contro di te. Se vinci, la legge li obbliga a farti passare, e la lastra di Keelstone è tua.',
   'Keelstone e i Custodi', 'super_pro',
   pg_temp.ids('card_definitions', array['P055', 'P121', 'P115', 'P038', 'P086']),
   pg_temp.ids('threat_definitions', array['T403', 'T102', 'T609', 'T210', 'T505']),
   '[null, null, {"code": "hostile_ground", "favored": "heroes", "hindered": "neutrals", "bonus": 3, "malus": 2}, null, {"code": "weak_link"}]', 120,
   (select id from public.card_definitions where code = 'P055'));
