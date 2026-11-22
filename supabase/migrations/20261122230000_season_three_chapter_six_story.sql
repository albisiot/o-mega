-- Chapter 6 of season 3 "La montagna", "Tifeo" (docs/STORY.md §7.5), the end of
-- the season: when the omicron went back in the seal the crater shook, because up
-- there, in the tents of the Figli, is the pi, the last letter, and up there is
-- Mongibello, who has held back the eruption for months without sleeping. Tenant
-- has taken the families of the night shift up to the crater with the promise
-- that their own will come back when the giant rises. The Figli who stop the last
-- train of Overdue at the station; Groma, who found on the rim of the crater the
-- Greek cippus that marks the head of the giant; the Figli who climb to wear
-- Mongibello out, with Mordacchia; Tenant waiting with the pi where the forehead
-- of the giant comes up; and Groma as the boss, fielded by the Reggente of the
-- Figli on the rim of the crater with the Echo of Re Tifeo (an Omega, not the
-- prize) in her team; her card is the prize. The ending is the reveal of the
-- chapter (the pi goes back after the omicron: sixteen letters, the rift under
-- the volcano closes and the giant cools; Mongibello opens his hands, lets the
-- eruption out slowly as a column of fire and falls asleep; the forehead goes
-- back under the rock, the hand under the Fosse settles and the eviction is
-- revoked; Holdout takes a hand off the keystone for the first time since the Ora
-- Zero and points at the forty-one: "Prima loro.") and the hook of the season:
-- the shake of the pi comes from far away, outside Nuova Megara, Nicola no longer
-- feels the letters, and the Banco owns forty houses of the Fosse, the player's
-- building among them.
--
-- The chapter is number 6 of season 3 and number 18 in the order of the whole
-- story, so C18M1 opens once C17M5 is completed. It is the last chapter of season
-- 3: the ending of the season stops saying that the next chapter is coming and
-- says that the season is over. It shows under this chapter and on the result of
-- C18M5, only to whoever has completed every mission of the season.
--
-- Stars: every mission has its rarity and trait rules, and its stars pay 40 coins
-- each, written here instead of the 50 of the starting formula
-- (story_default_star_coins), as docs/STORY.md §7.9 decided for chapters 17-18.
-- In mission 4 Delta or Gamma is enough (15% with a good team); on the boss it
-- won 8% with a good team, so the rule also allows Beta (15%), as on the other
-- bosses of the season but chapter 14. The trait of the boss is Creatura, like Re
-- Tifeo: Segno stayed at 27% with a good team, and Custodi and Mito, above the
-- 28% of the other trait stars, are already the traits of missions 3 and 2.
--
-- Teams, Threats and modifiers are tuned by simulation (SPEC §5.11) on the
-- catalog and rules engine of chapters 14-17 (the 227 characters of the packs, 75
-- usual Threats; the rare Threats never appear in story missions nor in what the
-- bots know): a player with a random team who always sends the highest score wins
-- about 46%, 20%, 23%, 5.4% and 3.7% of the time. As the user decided on 22
-- November 2026 (docs/STORY.md §7.9) the chapter is tuned on the same targets as
-- chapters 14-17 (46%, 20%, 23%, 5.5% and 3.5%), with the first mission the
-- easiest of the chapter and the boss the hardest, under mission 4, which stays
-- above 5%. The teams are the ones of the chapter's sheet, all of the Figli
-- dell'Ultima; Mordacchia, Thicket and Re Tifeo are Omega and none of them is a
-- prize. Only Threats of Nuova Megara, none repeated in the chapter. The first
-- Threat of every mission is on theme: Rapina al treno blindato (the last train,
-- which the player stops almost every time), Spettro del museo (the Greek cippus,
-- about two times in five), Incubo ricorrente (Mongibello, who has not slept for
-- months, about two times in five), Risveglio dell'antico (the forehead of the
-- giant, about one time in three) and Ultima battaglia (the last fight of the
-- season, about two times in five). Modifiers: none in mission 1; Territorio
-- ostile for the villains, the Figli, against the neutrals in round 1 and Anello
-- debole in round 4 of mission 2 (without them, 28%); Sottovalutati in round 5 of
-- mission 3 (without it, 21%); Anello debole in round 3 and Territorio ostile for
-- the heroes against the neutrals in round 5 of mission 4 (without them, 4.0%,
-- under the 5% of the decision; with Territorio ostile for the heroes in round 4
-- instead, 6.7%); Territorio ostile for the heroes against the villains in round
-- 5 of the boss (without it, about 1%). The hard bot is slow against the team of
-- mission 4 (about a tenth of a second a match), and measures of 900 matches
-- there missed by up to two and a half points: every choice was taken on 6,000.

insert into public.story_chapters (chapter, season, number, title, intro, outro) values (18, 3, 6, 'Tifeo',
  'Rimessa la omicron trema il cratere: lassù, nelle tende dei Figli, c''è la pi, l''ultima lettera, e lassù c''è Mongibello, che da mesi trattiene l''eruzione senza dormire ed è allo stremo. I quartieri alti sono di nuovo evacuati, e Tenant ha portato sul cratere le famiglie del turno di notte, con la promessa che quando il gigante si alzerà i loro torneranno. Se Mongibello cede, Re Tifeo si sveglia del tutto: la mano si alza per prima e le Fosse con lei, casa tua compresa, la montagna si apre, la scossa fa cedere Holdout e Nuova Megara salta in aria.',
  'Battuta Groma, per legge la pi è tua, e Renata la rimette nell''anello dopo la omicron: sedici lettere, la spaccatura sotto il vulcano si chiude e l''energia smette di scaldare il gigante. Mongibello, per la prima volta da quando è salito sul cratere, apre le mani: l''eruzione esce piano, una colonna di fuoco che la città guarda dai tetti, e lui si addormenta lì dove sta; la fronte del gigante torna sotto la roccia, la mano sotto le Fosse si posa e lo sgombero è revocato. Nella camera la luce ormai è grande come una stanza, e Holdout, per la prima volta dall''Ora Zero, stacca una mano dalla chiave di volta e indica i quarantuno: «Prima loro.» Ma quando la pi torna al suo posto la città non trema: il sismografo registra una scossa lontana, fuori da Nuova Megara, Nicola non sente più le lettere perché le ultime sette non sono sotto la città, e alle Fosse, revocato lo sgombero, quaranta case hanno un padrone nuovo, il Banco, compreso il palazzo dove abiti.');

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
  -- The Figli stop the last train at the station to take the night shift families up: Lullaby, Belladonna, Epigone, Patina, Tacet.
  ('C18M1', 18, 1, 'L''ultimo treno',
   'Overdue porta giù gli sfollati dei quartieri alti con l''ultimo treno a vapore della notte, e in stazione i Figli lo fermano per caricare le famiglie del turno di notte: lassù, promettono, i loro torneranno. Se il treno resta fermo, gli sfollati restano sotto il vulcano.',
   'Lullaby e i reclutatori', 'medium',
   pg_temp.ids('card_definitions', array['P034', 'P016', 'P011', 'P084', 'P072']),
   pg_temp.ids('threat_definitions', array['T301', 'T108', 'T502', 'T206', 'T408']),
   '[null, null, null, null, null]', 200, null,
   array['delta'], array['group.lanterne'], 40),
  -- Groma found the Greek cippus that marks the head of the giant: Groma (Alfa), Miliarium, Theriarch, Credo, Falx.
  ('C18M2', 18, 2, 'Il catasto',
   'Sull''orlo del cratere Groma ha trovato il cippo con cui i Greci segnarono la testa del gigante, e con la sua groma di legno e piombo dice ai Figli dove scavare. Se arrivano alla testa, Re Tifeo si sveglia prima che la pi torni nell''anello.',
   'Groma e il cippo', 'medium',
   pg_temp.ids('card_definitions', array['P180', 'P161', 'P160', 'P039', 'P066']),
   pg_temp.ids('threat_definitions', array['T205', 'T409', 'T105', 'T506', 'T302']),
   '[{"code": "hostile_ground", "favored": "villains", "hindered": "neutrals", "bonus": 3, "malus": 2}, null, null, {"code": "weak_link"}, null]', 210, null,
   array['delta', 'gamma'], array['origin.mito'], 40),
  -- The Figli climb to wear Mongibello out: Mordacchia (Omega), Noophage (Beta), Dittograph (Beta), Hecatomb, Cineris.
  ('C18M3', 18, 3, 'Chi tiene',
   'Mongibello trattiene l''eruzione da mesi senza dormire, e i Figli salgono a sfinirlo con Mordacchia, accanto alla quale ogni patto si allenta. Se cede adesso, l''eruzione esce tutta insieme e il gigante si sveglia.',
   'Mordacchia e i Figli', 'hard',
   pg_temp.ids('card_definitions', array['P186', 'P174', 'P225', 'P135', 'P071']),
   pg_temp.ids('threat_definitions', array['T104', 'T510', 'T202', 'T406', 'T305']),
   '[null, null, null, null, {"code": "underdogs", "bonus": 3, "malus": 3, "commonMaxRank": 1, "eliteMinRank": 4}]', 220, null,
   array['delta', 'gamma'], array['group.custodi'], 40),
  -- The forehead of the giant comes up from the crater, and Tenant waits there with the pi: Tenant (Beta), Emendatio (Beta), Hospes (Beta), Thicket (Omega), Kiln (Beta).
  ('C18M4', 18, 4, 'La fronte',
   'Dal fondo del cratere affiora la fronte del gigante, e Tenant aspetta lì con la pi in mano e le famiglie del turno di notte dietro di lui. Se non gliela togli, la fronte esce del tutto e la montagna comincia ad aprirsi.',
   'Tenant e i Figli', 'hard',
   pg_temp.ids('card_definitions', array['P210', 'P209', 'P176', 'P231', 'P044']),
   pg_temp.ids('threat_definitions', array['T609', 'T103', 'T505', 'T204', 'T303']),
   '[null, null, {"code": "weak_link"}, null, {"code": "hostile_ground", "favored": "heroes", "hindered": "neutrals", "bonus": 3, "malus": 2}]', 230, null,
   array['delta', 'gamma'], array['group.figli'], 40),
  -- The Reggente of the Figli fields Groma, with the Echo of Re Tifeo: Groma (Alfa, the prize), Re Tifeo (Omega), Tenant (Beta), Effigy (Alfa), Credo.
  ('C18M5', 18, 5, 'Il risveglio',
   'Sull''orlo del cratere il Reggente dei Figli schiera Groma, e nella sua squadra c''è l''Eco di Re Tifeo. Se perdi, il gigante si alza e le Fosse con la sua mano; se vinci, la pi è tua per legge e la lastra di Groma pure.',
   'Groma e il gigante', 'super_pro',
   pg_temp.ids('card_definitions', array['P180', 'P080', 'P210', 'P079', 'P039']),
   pg_temp.ids('threat_definitions', array['T610', 'T207', 'T403', 'T102', 'T501']),
   '[null, null, null, null, {"code": "hostile_ground", "favored": "heroes", "hindered": "villains", "bonus": 3, "malus": 2}]', 250, (select id from public.card_definitions where code = 'P180'),
   array['delta', 'gamma', 'beta'], array['nature.creatura'], 40);

-- Season 3 is complete: its ending now says so, under chapter 18 and on the
-- result of C18M5, for whoever has completed every mission of the season.
update public.story_seasons
set ending = 'Hai finito la Stagione 3, La montagna. La prossima stagione arriva presto.'
where season = 3;
