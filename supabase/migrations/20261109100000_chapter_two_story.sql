-- Chapter 2 of the story mode, "Il sismografo" (docs/STORY.md §6): the metro
-- line through the necropolis, the Figli dell'Ultima, Ottavia as a rival
-- Reggente in mission 4 and Vera Kross as the boss, whose card is the prize.
--
-- Teams, Threats and modifiers are tuned by simulation (SPEC §5.11): a player
-- with a random team who always sends the highest score wins about 81%, 69%,
-- 61%, 45% and 26% of the time. story_mission_unlocked orders the missions by
-- (chapter, ord), so C2M1 opens once C1M5 is completed.

insert into public.story_chapters (chapter, title, intro, outro) values (2, 'Il sismografo',
  'Dopo la scossa del porto il sismografo del Comune non sta più zitto: trema tutto sotto la metropolitana, lungo la linea che attraversa la necropoli. Ti mandano a controllare con un biglietto di corsa semplice. Laggiù i Figli dell''Ultima scavano già, come se sapessero dove guardare.',
  'Longwave mette in fila le scosse e trova lo schema: seguono l''ordine dell''alfabeto, e dopo l''epsilon del porto toccava alla zeta. La zeta non è sepolta da nessuna parte: è nel petto di Xenolith, il cavatore che l''ha trovata e se l''è tenuta, ed è da lì che i Figli volevano estrarla. Vera Kross, sconfitta, ride: «L''Ultima sa già come finisce», e intanto Xenolith sparisce con le Lanterne, senza nemmeno ringraziare. La scossa successiva non arriva da uno scavo: arriva dalla torre del Banco.');

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
  -- Patina, Epigone, Falx, Quicklime, Odonate: five Delta.
  ('C2M1', 2, 1, 'Ultima corsa',
   'L''ultima corsa della notte si ferma in galleria, e dalle pareti esce una muffa che cammina. È Patina dei Figli dell''Ultima: i passeggeri sono chiusi nei vagoni, e la muffa non ha fretta.',
   'Patina e le nuove reclute', 'medium',
   pg_temp.ids('card_definitions', array['P084', 'P011', 'P066', 'P065', 'P067']),
   pg_temp.ids('threat_definitions', array['T206', 'T101', 'T301', 'T503', 'T401']),
   '[null, {"code": "focus"}, null, null, null]', 40, null),
  -- Cerbero, Belladonna, Kiln, Cineris, Procura.
  ('C2M2', 2, 2, 'Il cane a tre teste',
   'Cerbero fa la guardia alla necropoli da duemila anni e non ha mai morso un turista. Stanotte qualcuno l''ha aizzato contro chiunque scenda negli scavi, e tu stai per scendere.',
   'Cerbero e i Figli dell''Ultima', 'medium',
   pg_temp.ids('card_definitions', array['P087', 'P016', 'P044', 'P071', 'P107']),
   pg_temp.ids('threat_definitions', array['T401', 'T102', 'T510', 'T201', 'T306']),
   '[null, null, {"code": "weak_link"}, null, null]', 50, null),
  -- Lullaby, Credo, Tacet, Gazetteer, Epigone.
  ('C2M3', 2, 3, 'Onde corte',
   'Longwave, radioamatrice delle Lanterne, ascolta il sismografo da una cantina sopra la linea. I Figli vogliono la sua radio: Lullaby con le buone, Credo con le cattive, e tu sei in mezzo.',
   'Lullaby e Credo', 'hard',
   pg_temp.ids('card_definitions', array['P034', 'P039', 'P072', 'P088', 'P011']),
   pg_temp.ids('threat_definitions', array['T209', 'T606', 'T103', 'T409', 'T307']),
   '[null, null, {"code": "focus"}, null, null]', 60, null),
  -- Ottavia's Sciolti: Postmark, Ferryman, Lure, Cursor, Sordina.
  ('C2M4', 2, 4, 'Due Reggenti',
   'Il Comune, per non sbagliare, ha mandato sulla stessa emergenza anche Ottavia, e pagherà soltanto chi la risolve. Lei schiera gli Sciolti più veloci della città e ha già speso la ricompensa.',
   'Ottavia e gli Sciolti', 'hard',
   pg_temp.ids('card_definitions', array['P042', 'P010', 'P118', 'P110', 'P037']),
   pg_temp.ids('threat_definitions', array['T210', 'T407', 'T106', 'T609', 'T310']),
   '[{"code": "hostile_ground", "favored": "neutrals", "hindered": "heroes", "bonus": 3, "malus": 2}, null, null, null, null]', 70, null),
  -- Vera Kross (Alfa), Antiphon, Kiln, Credo, Belladonna.
  ('C2M5', 2, 5, 'Chi trova',
   'Vera Kross non cerca una pietra, cerca una persona: Xenolith, il cavatore, e l''ha trovato prima di te. Se vinci la sfida, Xenolith resta libero e la lastra di Vera passa a te.',
   'Vera Kross e i Figli', 'super_pro',
   pg_temp.ids('card_definitions', array['P054', 'P111', 'P044', 'P039', 'P016']),
   pg_temp.ids('threat_definitions', array['T109', 'T306', 'T603', 'T204', 'T408']),
   '[null, {"code": "hostile_ground", "favored": "villains", "hindered": "heroes", "bonus": 3, "malus": 2}, {"code": "weak_link"}, null, null]', 90,
   (select id from public.card_definitions where code = 'P054'));
