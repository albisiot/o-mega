-- Chapter 4 of season 3 "La montagna", "Il turno di notte" (docs/STORY.md §7.5):
-- since the mu went back in the seal, every night the ground of the Fosse shakes
-- along the same road, from the clinic of the Lanterne to the temple door. It is
-- the round of Moth, who keeps the nu and does not want the seal closed, because
-- for years she has brought food to Holdout every night. The Lanterne split:
-- those who live on the hand want the seal closed, the other half stands with
-- Moth. Their clinic that will not say where she is, the stair of Wick where
-- powers leave no trace, the Figli who wait for Moth on her round with
-- Novenarium, the Lanterne who make a wall in the corridor of the temple, and
-- Moth as the boss, fielded by the Reggente of the Lanterne in that corridor; her
-- card is the prize. The ending is the reveal of the chapter (in the dark Moth
-- sees the light that things give off, and inside the light of the explosion the
-- forty-one of the night shift stand still in the middle of a step, not dead; she
-- gives the nu to Renata, and with thirteen letters the light draws back and
-- everyone sees the shift leader whose armour was Absentia, whom Nicola calls by
-- name: Corrado Musumeci, a placeholder name, docs/STORY.md §7.9) and its hook:
-- nobody knows what closing the seal will do to the forty-one, and when the nu
-- goes back Mainstay sways for the first time in four generations.
--
-- The chapter is number 4 of season 3 and number 16 in the order of the whole
-- story, so C16M1 opens once C15M5 is completed. The ending of season 3 does not
-- change: it shows under the last chapter there is and still says that the next
-- chapter is coming, until chapter 6 closes the season.
--
-- Stars: every mission has its rarity and trait rules, and its stars pay 30 coins
-- each, written here instead of the 40 of the starting formula
-- (story_default_star_coins), as docs/STORY.md §7.9 decided for chapters 13-16.
-- In the corridor (mission 4) and on the boss only Delta or Gamma stayed under
-- 13% even with a good team, so the rule also allows Beta, as on the bosses of
-- chapters 13 and 15. On the boss Mestiere, the workers of the night shift, won
-- 1% even with a good team, and the trait is Figli dell'Ultima, their families
-- (42%).
--
-- Teams, Threats and modifiers are tuned by simulation (SPEC §5.11) on the
-- catalog and rules engine of chapters 14 and 15 (the 227 characters of the
-- packs, 75 usual Threats; the rare Threats never appear in story missions nor in
-- what the bots know): a player with a random team who always sends the highest
-- score wins about 46%, 21%, 23%, 5.6% and 3.6% of the time. As the user decided
-- on 22 November 2026 (docs/STORY.md §7.9) the chapter is tuned on the same
-- targets as chapters 14 and 15 (46%, 20%, 23%, 5.5% and 3.5%), with the first
-- mission the easiest of the chapter and the boss the hardest, under mission 4,
-- which stays above 5%. The teams are the ones of the chapter's sheet;
-- Novenarium, the column of air where the Ora Zero is still happening, is the
-- third Omega in a mission that is not a boss, after Thicket and Matins, and it
-- is not a prize. Only Threats of Nuova Megara, none repeated in the chapter. The
-- first Threat of every mission is on theme: Indizio nascosto (the clinic that
-- will not say where Moth is; the player wins that round about four times in
-- five), Ladro fantasma (the stair of Wick, where powers leave no trace, about
-- one time in three), Caccia nel buio (the Figli waiting for Moth on her round,
-- about one time in four), Labirinto di specchi (the corridor of the temple,
-- about one time in four) and Signore delle ombre (Moth, who sees in the dark,
-- about one time in eleven). The Lanterne of mission 4 are strong in energy,
-- resistance, will, perception, intelligence and magic: with Rituale proibito,
-- the temple, as first Threat the player never won that round, and it was
-- dropped. Modifiers: Territorio ostile in one round of every mission but mission
-- 2, for the neutrals in round 1 of mission 1 (without it, 43%), for the
-- villains, the Figli, in round 3 of mission 3 (without it, 26%), for the heroes,
-- the Lanterne, in round 4 of mission 4 (without it, 8%) and for the villains
-- against the neutrals in round 3 of the boss (without it, under 3%).

insert into public.story_chapters (chapter, season, number, title, intro, outro) values (16, 3, 4, 'Il turno di notte',
  'Da quando la mu è tornata nell''anello, alle Fosse la terra trema ogni notte lungo la stessa strada, dalla clinica delle Lanterne alla porta del tempio: è il giro di Moth, che tiene la nu e non vuole che il sigillo si chiuda, perché da anni porta da mangiare a Holdout e per lei è uno di famiglia. Le Lanterne, che proteggono il quartiere, si sono spaccate: Longwave e chi abita sulla mano vogliono il sigillo chiuso, l''altra metà sta con Moth. Se la nu resta a lei, la cerniera si ferma alla mu, la mano sotto le Fosse continua a girarsi e alla prossima scossa lo sgombero riparte, da casa tua; e se le Lanterne si spaccano del tutto, nessuno protegge più il quartiere.',
  'Battuta Moth, nel corridoio del tempio lei ti dice perché ha tenuto la nu: al buio vede la luce che le cose emettono, e dentro la luce dell''esplosione, tra i detriti, ci sono i quarantuno del turno di notte, fermi a metà di un passo come i detriti; non sono morti, per loro l''Ora Zero non è ancora finita, e Holdout è il solo che si muove perché tiene la chiave di volta. Poi dà la nu a Renata, perché se il gigante si alza muoiono tutti, loro compresi: con tredici lettere nell''anello la luce arretra ancora, e per la prima volta la vedono tutti, con dentro un operaio in tuta arancione e targhetta da capoturno, quello dell''armatura di Absentia, fermo con un piede alzato, che Nicola chiama per nome: Corrado Musumeci. Nessuno sa cosa farà ai quarantuno la chiusura del sigillo, nemmeno Sibilla: se finiranno il passo e torneranno o se finirà l''esplosione e loro con lei; Nicola è sicuro che torneranno, Tenant dice ai Figli che il Comune li sta uccidendo. E quando la nu torna al suo posto, sul fianco del vulcano, per la prima volta in quattro generazioni, Mainstay ondeggia.');

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
  -- The Lanterne at the clinic know where Moth is and do not say: Suture, Febrifuge, Abdicant, Impound, Milewright.
  ('C16M1', 16, 1, 'La clinica',
   'Alla clinica delle Lanterne Suture cura gratis chi è rimasto nella zona rossa, e tutti sanno dov''è Moth, ma nessuno te lo dice: metà delle Lanterne sta con lei. Se non lo scopri stanotte, Moth fa il suo giro e la nu resta a lei.',
   'Suture e la clinica', 'medium',
   pg_temp.ids('card_definitions', array['P015', 'P189', 'P143', 'P124', 'P030']),
   pg_temp.ids('threat_definitions', array['T109', 'T401', 'T204', 'T502', 'T304']),
   '[{"code": "hostile_ground", "favored": "neutrals", "hindered": "villains", "bonus": 3, "malus": 2}, null, null, null, null]', 180, null,
   array['delta'], array['group.lanterne'], 30),
  -- The Lanterne of Moth meet on the stair of Wick, where powers leave no trace: Wick, Juncture, Gridwitch, Ambit, Cicatrix.
  ('C16M2', 16, 2, 'La lanterna',
   'Le Lanterne di Moth si riuniscono sulla scala di Wick, che accende la lanterna e paga lei il prezzo dei poteri di chi entra: lì non resta traccia di niente. Se non sali prima che finisca l''olio, Moth parte per il giro senza di te.',
   'Wick e la scala', 'medium',
   pg_temp.ids('card_definitions', array['P198', 'P028', 'P040', 'P035', 'P083']),
   pg_temp.ids('threat_definitions', array['T306', 'T110', 'T506', 'T208', 'T405']),
   '[null, null, null, null, null]', 190, null,
   array['delta', 'gamma'], array['origin.segno'], 30),
  -- The Figli wait for Moth on her round to the temple: Novenarium (Omega), Hospes (Beta), Theriarch, Falx, Cineris.
  ('C16M3', 16, 3, 'Il giro di Moth',
   'Sulla strada che Moth fa ogni notte verso il tempio la aspettano i Figli, e con loro Novenarium, la colonna d''aria dell''Ora Zero che ripete «Camera Tre, siamo pronti». Se le prendono la nu, la cerniera si ferma per sempre alla mu.',
   'Novenarium e i Figli', 'hard',
   pg_temp.ids('card_definitions', array['P217', 'P176', 'P160', 'P066', 'P071']),
   pg_temp.ids('threat_definitions', array['T508', 'T203', 'T404', 'T108', 'T302']),
   '[null, null, {"code": "hostile_ground", "favored": "villains", "hindered": "heroes", "bonus": 3, "malus": 2}, null, null]', 200, null,
   array['delta', 'gamma'], array['group.custodi'], 30),
  -- The Lanterne of Moth make a wall in the corridor of the temple: Tribune (Beta), Viaticum (Beta), Cathode, Undercroft, Tether.
  ('C16M4', 16, 4, 'Il corridoio',
   'Nel corridoio del tempio le Lanterne di Moth fanno muro davanti alla camera di Holdout, e Tribune tiene accese tutte le lampade perché nessuno passi di nascosto. Se non passi, Renata resta fuori con l''anello e la nu non torna al suo posto.',
   'Tribune e il muro', 'hard',
   pg_temp.ids('card_definitions', array['P207', 'P208', 'P033', 'P145', 'P064']),
   pg_temp.ids('threat_definitions', array['T308', 'T106', 'T606', 'T205', 'T507']),
   '[null, null, null, {"code": "hostile_ground", "favored": "heroes", "hindered": "villains", "bonus": 3, "malus": 2}, null]', 210, null,
   array['delta', 'gamma', 'beta'], array['origin.mito'], 30),
  -- The Reggente of the Lanterne fields Moth in the corridor of the temple: Moth (Alfa, the prize), Afterimage (Alfa), Collegium, Sampler, Raster.
  ('C16M5', 16, 5, 'Ogni notte',
   'Nel corridoio del tempio il Reggente delle Lanterne schiera Moth, che da anni ogni notte porta da mangiare a Holdout. Se perdi, la nu resta con lei e la mano sotto le Fosse continua a girarsi; se vinci, la lastra di Moth è tua.',
   'Moth e le Lanterne', 'super_pro',
   pg_temp.ids('card_definitions', array['P053', 'P228', 'P137', 'P199', 'P095']),
   pg_temp.ids('threat_definitions', array['T603', 'T202', 'T402', 'T101', 'T510']),
   '[null, null, {"code": "hostile_ground", "favored": "villains", "hindered": "neutrals", "bonus": 3, "malus": 2}, null, null]', 230, (select id from public.card_definitions where code = 'P053'),
   array['delta', 'gamma', 'beta'], array['group.figli'], 30);
