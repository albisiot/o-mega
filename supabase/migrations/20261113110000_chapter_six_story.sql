-- Chapter 6 of the story mode, "Mongibello" (docs/STORY.md §6), the finale of
-- season 1 "Il Rintocco": the Figli dell'Ultima wake the volcano to make Holdout
-- give way, and Mongibello holds the eruption inside himself. Fires in the
-- evacuated upper districts, the bells of Carillon, Rubicon's gang on the only
-- road up, Vera Kross hunting Mongibello, and Effigy on the crater as the boss,
-- fielded by Ottavia for the Figli; her card is the prize. The ending names the
-- leader of the Figli (Nicola, Ottavia's brother) and opens season 2: the theta
-- is at the Banco, up for auction.
--
-- Teams, Threats and modifiers are tuned by simulation (SPEC §5.11) on the
-- current catalog (187 characters, 75 usual Threats; the rare Threats never
-- appear in story missions nor in what the bots know): a player with a random
-- team who always sends the highest score wins about 65%, 48%, 43%, 26% and 15%
-- of the time; chapter 5, measured the same way, gives 67%, 50%, 45%, 28% and 17%.
-- The boss is the hardest match of the season.
-- story_mission_unlocked orders the missions by (chapter, ord), so C6M1 opens
-- once C5M5 is completed. Only Threats of Nuova Megara: no place of the catalog
-- is the volcano.

insert into public.story_chapters (chapter, title, intro, outro) values (6, 'Mongibello',
  'I Figli dell''Ultima hanno svegliato il vulcano: i quartieri alti sono evacuati, dal cratere sale fumo nero e il Comune distribuisce volantini con scritto «Mantenere la calma». Vogliono la scossa più forte di tutte per far cedere Holdout, e l''unico che può fermare l''eruzione è Mongibello, un Custode che si porta un vulcano dentro e non ha mai imparato a combattere. Devi portarlo in cima prima di loro: se il vulcano erutta, Holdout cede e Nuova Megara salta in aria, Fosse comprese.',
  'Mongibello si siede sull''orlo del cratere e si tiene l''eruzione dentro, come uno starnuto in chiesa: il vulcano si calma, la scossa non arriva al tempio, Holdout regge e le Fosse, per stanotte, restano in piedi. Dal fumo esce il capo dei Figli, e Ottavia lo riconosce dalla voce prima ancora di vederlo: è Nicola, suo fratello, sparito la notte dell''Ora Zero e uscito dalla centrale vivo, con un Segno che gli fa sentire dove sono le lettere. Le chiede di restare con lui, perché «quando l''esplosione finirà torneranno tutti», ma Ottavia dice di no, e lui sparisce nel fumo con quello che resta dei Figli. A cose fatte arriva il dottor Spanò, educatissimo, con in tasca la theta che l''eruzione mancata ha sputato fuori dal cratere e una ricevuta già firmata: «L''asta si apre a mezzanotte.»');

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
  -- The Figli set fires in the evacuated districts: Kiln, Cineris, Quicklime, Hecatomb, Dredge.
  ('C6M1', 6, 1, 'Evacuazione',
   'I Figli appiccano fuochi a ogni incrocio dei quartieri alti, e le ambulanze dell''evacuazione girano in tondo. Se non fermi Kiln e i suoi, chi abita sotto il cratere resta chiuso in casa ad aspettare la lava.',
   'Kiln e i fuochisti', 'medium',
   pg_temp.ids('card_definitions', array['P044', 'P071', 'P065', 'P135', 'P077']),
   pg_temp.ids('threat_definitions', array['T302', 'T108', 'T502', 'T207', 'T408']),
   '[null, null, null, {"code": "focus"}, {"code": "hostile_ground", "favored": "neutrals", "hindered": "villains", "bonus": 3, "malus": 2}]', 80, null),
  -- The Figli want Carillon silent: Belladonna, Tacet, Lullaby, Hospes, Theriarch.
  ('C6M2', 6, 2, 'Le campane',
   'Carillon, la suora delle Lanterne col robot fatto di campane, suona l''allarme per tutta la città, e i Figli vogliono farla tacere. Se smette, alle Fosse nessuno saprà che è ora di scappare.',
   'Belladonna e Tacet', 'medium',
   pg_temp.ids('card_definitions', array['P016', 'P072', 'P034', 'P176', 'P160']),
   pg_temp.ids('threat_definitions', array['T209', 'T407', 'T107', 'T505', 'T308']),
   '[null, null, null, {"code": "hostile_ground", "favored": "heroes", "hindered": "villains", "bonus": 3, "malus": 2}, {"code": "weak_link"}]', 90, null),
  -- Rubicon's gang, paid by the Figli, on the only road up: Rubicon, Falx, Odonate, Hireling, Mischance.
  ('C6M3', 6, 3, 'La strada che sale',
   'La banda di Rubicon, pagata dai Figli, ha messo le moto di traverso sull''unica strada che sale al cratere. Se non passi, Mongibello arriva in cima quando il vulcano ha già deciso per tutti.',
   'Rubicon e la banda', 'hard',
   pg_temp.ids('card_definitions', array['P026', 'P066', 'P067', 'P168', 'P131']),
   pg_temp.ids('threat_definitions', array['T210', 'T507', 'T101', 'T405', 'T301']),
   '[null, null, null, {"code": "underdogs", "bonus": 3, "malus": 3, "commonMaxRank": 1, "eliteMinRank": 4}, null]', 100, null),
  -- Vera Kross hunts Mongibello: Vera Kross (Alfa), Antiphon, Patina, Noophage, Epigone.
  ('C6M4', 6, 4, 'Chi trova, di nuovo',
   'Mongibello si è perso sulla salita e non sa usare il telefono, e Vera Kross, che trova chiunque, lo cerca per fermarlo. Se lo trova prima lei, il vulcano erutta e Holdout non regge.',
   'Vera Kross e i segugi', 'hard',
   pg_temp.ids('card_definitions', array['P054', 'P111', 'P084', 'P174', 'P011']),
   pg_temp.ids('threat_definitions', array['T508', 'T203', 'T609', 'T109', 'T306']),
   '[null, null, null, {"code": "focus"}, null]', 110, null),
  -- On the crater: Effigy (Alfa, the prize), Kiln, Credo, Miliarium, Groma (Alfa).
  ('C6M5', 6, 5, 'Lo sguardo',
   'Sul cratere Ottavia schiera per i Figli Effigy, che pietrifica con lo sguardo: prima Mongibello, poi Holdout, perché la pietra non trattiene niente. Se vinci, la lastra di Effigy è tua; se perdi, il vulcano erutta.',
   'Ottavia e i Figli', 'super_pro',
   pg_temp.ids('card_definitions', array['P079', 'P044', 'P039', 'P161', 'P180']),
   pg_temp.ids('threat_definitions', array['T503', 'T103', 'T601', 'T205', 'T410']),
   '[null, null, null, {"code": "underdogs", "bonus": 3, "malus": 3, "commonMaxRank": 1, "eliteMinRank": 4}, {"code": "weak_link"}]', 130,
   (select id from public.card_definitions where code = 'P079'));
