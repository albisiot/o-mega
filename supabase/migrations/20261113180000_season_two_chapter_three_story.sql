-- Chapter 3 of season 2 "La marea", "Il pegno" (docs/STORY.md §6.5): the
-- Banco sells the epsilon, the next letter of the seal, only together with a
-- "guaranteed" eta, and to pay for them the Comune pawns the licences of its
-- Reggenti at the Monte dei Pegni of the Fosse, the player's included. The
-- appraisers of the Banco, Monopsony who wants the epsilon for the Compagnia,
-- the guards in front of the eta that Strata wants to taste, the van of the
-- Compagnia in the vault under the tower, and Principal as the boss, fielded by
-- the Reggente of the Banco to collect the pledge anyway; its card is the
-- prize. The ending is the reveal of the chapter (the eta of the Banco is the
-- fake one cast in the furnace, the sale is void, and the Banco loses for the
-- first time) and the hook: the real eta walks, at night, in the Fosse.
--
-- The chapter is number 3 of season 2 and number 9 in the order of the whole
-- story, so C9M1 opens once C8M5 is completed. The ending of season 2 does not
-- change (the next chapter is coming): it now shows under this chapter, the
-- last one there is, and on the result of C9M5.
--
-- Teams, Threats and modifiers are tuned by simulation (SPEC §5.11) on the same
-- catalog as chapters 1 and 2 of season 2 (217 characters, 75 usual Threats;
-- the rare Threats never appear in story missions nor in what the bots know): a
-- player with a random team who always sends the highest score wins about 59%,
-- 37%, 34%, 19% and 7% of the time; chapter 2 of season 2, measured again the
-- same way, still gives 60%, 38%, 36%, 21% and 9%. Only Threats of Nuova
-- Megara: the chapter does not leave the city, and no Threat is used twice in
-- it. Mission 3 opens on Allarme silenzioso, the alarm of the case, where
-- Warren alone wins the round almost every time; the hostile ground that hinders
-- the neutrals of the Banco there leaves the player about one round in seven.
-- The boss opens on Tribunale degli spettri, where the player wins the round
-- about one time in three; Parabellum (Omega) is in the team, not the prize.

insert into public.story_chapters (chapter, season, number, title, intro, outro) values (9, 2, 3, 'Il pegno',
  'Dopo la delta tocca alla epsilon, che il Banco usa come stampo: il dottor Spanò la vende solo insieme a una eta «garantita», e per pagarle il Comune dà in pegno al Monte dei Pegni delle Fosse le licenze dei Reggenti, la tua compresa. Ma l''unica eta mai vista in città è quella colata nella fornace del Banco, e Spanò ha fretta di chiudere. Se la eta è falsa e la paghi, il Comune perde le licenze e Renata mette nel sigillo una pietra che lo spacca, mentre l''onda sale ancora sulle Fosse.',
  'Al Monte dei Pegni Strata, l''archeologo degli scavi, assaggia la eta e dice che ha due mesi, e Renata la guarda con la lente: le lettere vere sono scolpite a scalpello, questa è colata e ha le bollicine. È la eta falsa della fornace, che nel sigillo l''avrebbe spaccato, e per le regole del Banco una vendita falsa è nulla e chi vende paga la penale: le licenze tornano ai Reggenti, la epsilon va al Comune gratis e Renata la mette nell''anello, dopo la delta. Il dottor Spanò, per la prima volta, ha perso: «Me lo segno.» La eta vera, però, non l''ha mai trovata nessuno, e Longwave, riascoltando la notte in cui si mosse la zeta, sente oltre alla scossa alla torre del Banco una scossa piccola che si spostava: di notte, alle Fosse, la eta vera cammina.');

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
  -- The appraisers of the Monte dei Pegni: Necropsy, Periplus, Depositum, Blotter, Futures.
  ('C9M1', 9, 1, 'La stima',
   'Al Monte dei Pegni, l''unico sportello del Banco alle Fosse, i periti stimano le licenze dei Reggenti, la tua compresa. Se la tua vale poco, il Comune non arriva al prezzo e la epsilon resta al Banco.',
   'Necropsy e i periti', 'medium',
   pg_temp.ids('card_definitions', array['P167', 'P154', 'P192', 'P150', 'P106']),
   pg_temp.ids('threat_definitions', array['T203', 'T501', 'T105', 'T409', 'T307']),
   '[null, null, null, null, {"code": "focus"}]', 110, null),
  -- The buyer of the Compagnia and his office: Monopsony, Custodia, Ademption, Attainder, Odonate.
  ('C9M2', 9, 2, 'Pezzi unici',
   'Monopsony, il mercante della Compagnia con un caveau nel petto, vuole la epsilon prima di te: compra solo pezzi unici. Se arriva prima lui, la pietra sparisce nel suo petto e la cerniera si ferma alla delta.',
   'Monopsony e la Compagnia', 'medium',
   pg_temp.ids('card_definitions', array['P203', 'P202', 'P197', 'P116', 'P067']),
   pg_temp.ids('threat_definitions', array['T502', 'T205', 'T408', 'T101', 'T308']),
   '[null, null, {"code": "hostile_ground", "favored": "villains", "hindered": "heroes", "bonus": 3, "malus": 2}, null, {"code": "weak_link"}]', 120, null),
  -- The guards of the case of the eta: Warren, Portineria, Gradus, Cerbero, Derelict.
  ('C9M3', 9, 3, 'La lingua',
   'Strata, l''archeologo degli scavi, riconosce l''età di una pietra assaggiandola, e il Banco ha messo i suoi davanti alla teca della eta perché non ci arrivi. Se lo fermano, la paghi senza sapere cosa compri.',
   'Warren e i guardiani', 'hard',
   pg_temp.ids('card_definitions', array['P212', 'P193', 'P119', 'P087', 'P081']),
   pg_temp.ids('threat_definitions', array['T108', 'T401', 'T209', 'T506', 'T302']),
   '[{"code": "hostile_ground", "favored": "villains", "hindered": "neutrals", "bonus": 3, "malus": 2}, null, null, {"code": "hostile_ground", "favored": "heroes", "hindered": "villains", "bonus": 3, "malus": 2}, null]', 130, null),
  -- The vault under the tower and the van of the Compagnia: Regina Ix, Actuary, Escrow, Jurat, Huckster.
  ('C9M4', 9, 4, 'Il caveau',
   'La vendita è nulla, ma nel caveau sotto la torre i Reggenti del Banco hanno già caricato la epsilon su un furgone della Compagnia. Se il furgone esce, la pietra finisce nel caveau della Compagnia e non la rivedi più.',
   'Regina Ix e il caveau', 'hard',
   pg_temp.ids('card_definitions', array['P102', 'P047', 'P032', 'P151', 'P096']),
   pg_temp.ids('threat_definitions', array['T402', 'T201', 'T601', 'T104', 'T310']),
   '[null, {"code": "hostile_ground", "favored": "neutrals", "hindered": "villains", "bonus": 3, "malus": 2}, null, null, null]', 140, null),
  -- The Banco collects the pledge: Principal (Alfa, the prize), Parabellum (Omega), Collateral, Herma (Beta), Cursor.
  ('C9M5', 9, 5, 'Interessi',
   'Il Reggente del Banco schiera Principal, il registro dei debiti: un libro mastro di quattrocentotrent''anni che cammina da solo, venuto a riscuotere il pegno lo stesso. Se perdi, le licenze dei Reggenti restano al Banco; se vinci, la sua lastra è tua.',
   'Principal e il Banco', 'super_pro',
   pg_temp.ids('card_definitions', array['P181', 'P142', 'P073', 'P139', 'P110']),
   pg_temp.ids('threat_definitions', array['T510', 'T107', 'T606', 'T204', 'T407']),
   '[null, {"code": "hostile_ground", "favored": "neutrals", "hindered": "heroes", "bonus": 3, "malus": 2}, null, null, {"code": "hostile_ground", "favored": "heroes", "hindered": "villains", "bonus": 3, "malus": 2}]', 160,
   (select id from public.card_definitions where code = 'P181'));
