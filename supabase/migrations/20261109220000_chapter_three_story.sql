-- Chapter 3 of the story mode, "Undici piani" (docs/STORY.md §6): the Banco's
-- tower, the Sciolti it hires out, Ottavia in debt, and Auctor as the boss,
-- whose card is the prize.
--
-- Teams, Threats and modifiers are tuned by simulation (SPEC §5.11): a player
-- with a random team who always sends the highest score wins about 77%, 66%,
-- 56%, 44% and 20% of the time. story_mission_unlocked orders the missions by
-- (chapter, ord), so C3M1 opens once C2M5 is completed. Only Threats of Nuova
-- Megara: the chapter never leaves the tower.

insert into public.story_chapters (chapter, title, intro, outro) values (3, 'Undici piani',
  'Il sismografo dice che la torre del Banco trema; il Banco dice che è il riscaldamento. Sono undici piani di sportelli in pieno centro, e ogni piano ha la sua tariffa. Il Comune ti manda a controllare, ma la tariffa non l''ha pagata.',
  'Le lastre che il Banco ti compra come doppioni non vengono distrutte: Auctor le fonde nella sua fornace e, con la epsilon del caveau come stampo, ne cola lettere nuove. La prima è una eta falsa, ed è lei a far tremare la torre; il dottor Spanò, dall''undicesimo piano, la chiama «una copia autorizzata». Auctor, sconfitto, si lascia sfuggire che la centrale della Compagnia non fu costruita accanto al tempio per caso, poi ti chiede se ha parlato troppo. Quella notte il Banco prova la eta falsa e la lettera storta sveglia Multitude: nei quartieri alti i telepati sentono pensieri che non sono di nessuno, e il sismografo segna per la prima volta una scossa sotto il vulcano.');

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
  -- The queue at the counter: Abeyance, Futures, Glip, Publican, Huckster. Five Delta.
  ('C3M1', 3, 1, 'Lo sportello',
   'Per salire ai piani serve una ricevuta, e Abeyance, il robot contabile dello sportello, non trova il tuo pagamento. La fila arriva in strada e ha già deciso di chi è la colpa.',
   'Abeyance e la fila', 'medium',
   pg_temp.ids('card_definitions', array['P082', 'P106', 'P093', 'P017', 'P096']),
   pg_temp.ids('threat_definitions', array['T110', 'T405', 'T203', 'T506', 'T303']),
   '[{"code": "focus"}, {"code": "underdogs", "bonus": 3, "malus": 3, "commonMaxRank": 1, "eliteMinRank": 4}, null, null, null]', 50, null),
  -- Gradus, Actuary, Escrow, Ferryman, Ephemeris.
  ('C3M2', 3, 2, 'Le rampe',
   'L''ascensore è riservato ai conti in attivo, così sali a piedi con Gradus, che a ogni rampa perde un ricordo. Al quinto piano non sa più chi sei, e la sicurezza del Banco nemmeno.',
   'Gradus e l''ufficio rischi', 'medium',
   pg_temp.ids('card_definitions', array['P119', 'P047', 'P032', 'P010', 'P006']),
   pg_temp.ids('threat_definitions', array['T308', 'T108', 'T510', 'T210', 'T404']),
   '[null, {"code": "focus"}, null, null, {"code": "weak_link"}]', 60, null),
  -- The bounty hunters: Collateral, Warrant, Zeta Rax, Vulgate, Postmark.
  ('C3M3', 3, 3, 'Il debito',
   'Al settimo piano Ottavia si nasconde dietro una pianta: il Banco ha mandato tre cacciatori di taglie a riscuotere il suo debito. Per loro chi le sta vicino è un garante, e tu le stai vicino.',
   'Collateral e i cacciatori', 'hard',
   pg_temp.ids('card_definitions', array['P073', 'P022', 'P099', 'P027', 'P042']),
   pg_temp.ids('threat_definitions', array['T508', 'T202', 'T403', 'T106', 'T304']),
   '[null, null, {"code": "hostile_ground", "favored": "neutrals", "hindered": "villains", "bonus": 3, "malus": 2}, null, null]', 70, null),
  -- The Company's thieves: Larceny, Latchkey, Sordina, Facsimile, Procura.
  ('C3M4', 3, 4, 'Il furto',
   'La Compagnia Lete rivuole la epsilon che il dottor Spanò le ha preso nel caveau, e manda gli Sciolti a riprendersela all''undicesimo piano. Se la portano via, nessuno saprà più perché la torre trema.',
   'Larceny e gli Sciolti', 'hard',
   pg_temp.ids('card_definitions', array['P046', 'P021', 'P037', 'P098', 'P107']),
   pg_temp.ids('threat_definitions', array['T402', 'T207', 'T605', 'T108', 'T302']),
   '[null, {"code": "hostile_ground", "favored": "villains", "hindered": "heroes", "bonus": 3, "malus": 2}, {"code": "weak_link"}, null, null]', 80, null),
  -- Ottavia deploys the Banco's lastre: Auctor (Alfa), Actuary, Derelict, Gradus, Collateral.
  ('C3M5', 3, 5, 'La fornace',
   'Nel seminterrato Auctor alimenta una fornace con le lastre, e Ottavia la difende per scalare il suo debito. Se vinci, il fuoco si spegne e la lastra di Auctor passa a te.',
   'Ottavia e il Banco', 'super_pro',
   pg_temp.ids('card_definitions', array['P052', 'P047', 'P081', 'P119', 'P073']),
   pg_temp.ids('threat_definitions', array['T507', 'T109', 'T307', 'T604', 'T202']),
   '[null, null, {"code": "hostile_ground", "favored": "neutrals", "hindered": "villains", "bonus": 3, "malus": 2}, null, null]', 100,
   (select id from public.card_definitions where code = 'P052'));
