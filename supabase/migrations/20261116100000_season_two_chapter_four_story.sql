-- Chapter 4 of season 2 "La marea", "Absentia" (docs/STORY.md §6.5): every
-- night an empty armour, Absentia, stops the water in the Fosse after the wave,
-- and it has the real eta in its chest. The Compagnia has put a bounty on it and
-- pays Ottavia to find it, because it wants it burnt. The jackals of the flooded
-- houses, the Lanterne who hide where the armour sleeps, the colossus hunters
-- after the bounty, the workers of the Compagnia at the well of the old drill,
-- and Eudaemon as the boss, fielded by Ottavia for the Compagnia at the well;
-- its card is the prize. The ending is the reveal of the chapter (the letter
-- moves the armour of the foreman of the drill, designed by Auctor, and its
-- black box recorded Nicola shouting to stop and Eudaemon ordering to drill;
-- Ottavia changes side) and the hook: the eta has to wait for the zeta, and the
-- Compagnia knows the player has the recording.
--
-- The chapter is number 4 of season 2 and number 10 in the order of the whole
-- story, so C10M1 opens once C9M5 is completed. The ending of season 2 does not
-- change (the next chapter is coming): it now shows under this chapter, the
-- last one there is, and on the result of C10M5.
--
-- Teams, Threats and modifiers are tuned by simulation (SPEC §5.11) on the
-- current catalog and rules engine: 231 characters (P218-P231 came after
-- chapter 3) with Sacrificio lasting to the end of the match, and 75 usual
-- Threats (the rare Threats never appear in story missions nor in what the bots
-- know). A player with a random team who always sends the highest score wins
-- about 58%, 34%, 33%, 17% and 7% of the time; chapter 3 of season 2,
-- measured again the same way, gives 60%, 37%, 34%, 18% and 8% (it was tuned on
-- 59%, 37%, 34%, 19% and 7% with 217 characters). Only Threats of Nuova Megara,
-- none used twice in the chapter, and no card with an unlock level in the
-- teams. Mission 2 opens on Labirinto di specchi, where the Lanterne win the
-- round almost every time; the hostile ground that hinders the heroes there
-- leaves the player about two rounds in five. The boss opens on Incubo
-- ricorrente, the night replayed by the black box, where the player wins the
-- round about one time in eight; Matins (Omega) is in the team, not the prize.

insert into public.story_chapters (chapter, season, number, title, intro, outro) values (10, 2, 4, 'Absentia',
  'Seguendo la scossa piccola di Longwave arrivi in una strada allagata delle Fosse, dove ogni notte, dopo l''onda della mezzanotte, un''armatura vuota si pianta davanti all''acqua e la ferma: è Absentia, e nel petto ha la eta vera. La Compagnia ha messo una taglia sull''armatura e paga Ottavia per trovarla, ma non la vuole per la eta: la vuole bruciare. Se arriva prima la Compagnia, l''armatura brucia con tutto quello che ha dentro; se la prendi tu, le Fosse perdono l''unica cosa che di notte ferma l''acqua.',
  'Absentia era l''armatura del capoturno della trivella, progettata da Auctor per lavorare vicino all''energia: quella notte il capoturno è sparito, la eta vera le si è piantata nel petto, e da allora è la lettera a muoverla, e l''armatura continua a fare l''ultima cosa che faceva, reggere quello che cade addosso a chi le sta sotto. La sua scatola nera ha registrato gli ultimi nove secondi prima dell''Ora Zero: un ragazzo che grida di fermarsi, ed è Nicola, e la voce calma di Eudaemon che risponde «Sappiamo cosa c''è sotto. Trivellate.» Ottavia sente suo fratello e passa dalla tua parte. La eta però non può ancora tornare nel sigillo: prima ci vuole la zeta, che è nel petto di Xenolith, e le Fosse hanno bisogno di Absentia ancora per qualche notte; intanto la Compagnia sa che la registrazione ce l''hai tu.');

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
  -- The jackals of the flooded houses: Tariffario, Latchkey, Foundling, Procura, Higgler.
  ('C10M1', 10, 1, 'Coprifuoco',
   'Dopo l''onda della mezzanotte alle Fosse c''è il coprifuoco, e gli sciacalli di Tariffario, che svuota una casa in quattro ore, entrano in quelle allagate, anche nella tua. Se non li fermi, quello che l''acqua ha lasciato se lo portano via loro.',
   'Tariffario e gli sciacalli', 'medium',
   pg_temp.ids('card_definitions', array['P194', 'P021', 'P002', 'P107', 'P152']),
   pg_temp.ids('threat_definitions', array['T101', 'T510', 'T201', 'T410', 'T303']),
   '[null, null, null, null, null]', 120, null),
  -- The Lanterne who hide where the armour sleeps: Leeward, Vulnerary, Sanctuary, Upkeep, Vigil.
  ('C10M2', 10, 2, 'Chi l''ha vista',
   'Le Lanterne sanno dove dorme l''armatura e non te lo dicono: di notte è l''unica che ferma l''acqua. Leeward, l''ormeggiatore dalla pelle di basalto, ti sbarra la strada, e se perdi la Compagnia la trova prima di te.',
   'Leeward e le Lanterne', 'medium',
   pg_temp.ids('card_definitions', array['P171', 'P140', 'P173', 'P218', 'P012']),
   pg_temp.ids('threat_definitions', array['T308', 'T504', 'T105', 'T407', 'T203']),
   '[{"code": "hostile_ground", "favored": "villains", "hindered": "heroes", "bonus": 3, "malus": 2}, null, null, null, null]', 130, null),
  -- The colossus hunters after the bounty of the Compagnia: Hollowbone, Zeta Rax, Warrant, Praesidium, Insula.
  ('C10M3', 10, 3, 'La taglia',
   'La Compagnia ha messo una taglia sull''armatura, e i cacciatori di colossi di Hollowbone, che poi ne vende le ossa, sono già per strada. Se la prendono loro, la consegnano alla Compagnia, che la brucia con la eta nel petto.',
   'Hollowbone e i cacciatori', 'hard',
   pg_temp.ids('card_definitions', array['P157', 'P099', 'P022', 'P226', 'P223']),
   pg_temp.ids('threat_definitions', array['T508', 'T108', 'T408', 'T210', 'T310']),
   '[null, null, null, null, {"code": "hostile_ground", "favored": "villains", "hindered": "heroes", "bonus": 3, "malus": 2}]', 140, null),
  -- The workers of the Compagnia at the well of the drill: Swarf, Typo, Pyrrhic, Mekana (Alfa), Reus.
  ('C10M4', 10, 4, 'Il pozzo',
   'Auctor, che l''ha progettata, ti dice dove torna l''armatura all''alba: al pozzo della vecchia trivella, dentro la centrale, dove gli operai della Compagnia la aspettano. Se arrivi dopo di loro, l''armatura non esce più dalla centrale.',
   'Swarf e gli operai', 'hard',
   pg_temp.ids('card_definitions', array['P036', 'P024', 'P005', 'P056', 'P219']),
   pg_temp.ids('threat_definitions', array['T409', 'T102', 'T610', 'T207', 'T304']),
   '[null, {"code": "hostile_ground", "favored": "villains", "hindered": "heroes", "bonus": 3, "malus": 2}, null, {"code": "hostile_ground", "favored": "villains", "hindered": "neutrals", "bonus": 3, "malus": 2}, null]', 150, null),
  -- Ottavia fields Eudaemon (Beta, the prize) for the Compagnia: Eudaemon, Lamprey, Semaphore, Matins (Omega), Vetrix (Alfa).
  ('C10M5', 10, 5, 'Scatola nera',
   'Al pozzo Eudaemon, il «curatore della felicità pubblica» della Compagnia, viene di persona a guardare l''armatura bruciare, e Ottavia schiera la sua lastra: lei vuole solo sentire la scatola nera. Se perdi, Absentia brucia con la eta nel petto; se vinci, la lastra di Eudaemon è tua.',
   'Ottavia e la Compagnia', 'super_pro',
   pg_temp.ids('card_definitions', array['P175', 'P090', 'P108', 'P230', 'P051']),
   pg_temp.ids('threat_definitions', array['T104', 'T503', 'T205', 'T603', 'T402']),
   '[null, null, null, null, {"code": "underdogs", "bonus": 3, "malus": 3, "commonMaxRank": 1, "eliteMinRank": 4}]', 170,
   (select id from public.card_definitions where code = 'P175'));
