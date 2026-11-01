-- Twelve characters who are not quite people: robots, monsters and mutants
-- (docs/WORLD.md), with the same rarity proportions, ability budgets and power
-- tiers as the rest of the catalog. All of them are found in packs.

insert into public.card_definitions (code, name, faction, rarity_code, stats, power_code, power_params, flavor, art_url) values
  ('P081', 'Rottame', 'neutrals', 'delta',
   '{"FOR":8,"VEL":1,"RES":7,"INT":2,"VOL":7,"PER":4,"ENE":7,"MAG":0,"PSI":1,"COM":6,"TEC":9,"FUR":2}',
   null, '{}', 'Cerca lavoro da anni. Ai colloqui perde sempre qualche pezzo.', '/cards/P081.webp'),
  ('P082', 'Rag. 404', 'neutrals', 'delta',
   '{"FOR":3,"VEL":3,"RES":6,"INT":10,"VOL":7,"PER":0,"ENE":5,"MAG":2,"PSI":2,"COM":2,"TEC":9,"FUR":5}',
   null, '{}', 'Ha controllato tre volte. Il tuo pagamento non risulta.', '/cards/P082.webp'),
  ('P083', 'Geco Nardi', 'heroes', 'delta',
   '{"FOR":4,"VEL":8,"RES":9,"INT":3,"VOL":5,"PER":6,"ENE":2,"MAG":1,"PSI":2,"COM":5,"TEC":1,"FUR":8}',
   null, '{}', 'La coda gli ricresce ogni volta. Il posto di lavoro, no.', '/cards/P083.webp'),
  ('P084', 'Nina Muffa', 'villains', 'delta',
   '{"FOR":1,"VEL":0,"RES":10,"INT":3,"VOL":8,"PER":5,"ENE":3,"MAG":6,"PSI":6,"COM":2,"TEC":1,"FUR":9}',
   null, '{}', 'Cresce sui muri della metro. Non paga l''affitto da anni.', '/cards/P084.webp'),

  ('P085', 'Ciro-9', 'heroes', 'gamma',
   '{"FOR":5,"VEL":4,"RES":7,"INT":6,"VOL":7,"PER":6,"ENE":6,"MAG":1,"PSI":1,"COM":1,"TEC":9,"FUR":1}',
   'ability_bonus', '{"ability":"TEC","bonus":2}', 'Ha cresciuto mezzo quartiere. Cucina ancora col manuale.', '/cards/P085.webp'),
  ('P086', 'Gino Lupo', 'heroes', 'gamma',
   '{"FOR":8,"VEL":7,"RES":6,"INT":1,"VOL":4,"PER":7,"ENE":3,"MAG":2,"PSI":1,"COM":9,"TEC":1,"FUR":5}',
   'ability_bonus', '{"ability":"COM","bonus":2}', 'Di notte sbrana i ladri. Di giorno paga i danni.', '/cards/P086.webp'),
  ('P087', 'Cerbero', 'neutrals', 'gamma',
   '{"FOR":7,"VEL":5,"RES":8,"INT":1,"VOL":7,"PER":9,"ENE":2,"MAG":2,"PSI":1,"COM":6,"TEC":1,"FUR":5}',
   'last_stand', '{"bonus":3,"min_round":4}', 'Tre teste e un solo collare. Litigano per la ciotola.', '/cards/P087.webp'),
  ('P088', 'Zia Arpia', 'villains', 'gamma',
   '{"FOR":1,"VEL":9,"RES":4,"INT":3,"VOL":5,"PER":7,"ENE":4,"MAG":1,"PSI":6,"COM":6,"TEC":1,"FUR":7}',
   'ability_bonus', '{"ability":"VEL","bonus":2}', 'Ali, artigli e un''opinione su tutto.', '/cards/P088.webp'),

  ('P089', 'Polifemo', 'villains', 'beta',
   '{"FOR":10,"VEL":3,"RES":9,"INT":2,"VOL":6,"PER":1,"ENE":5,"MAG":3,"PSI":2,"COM":8,"TEC":2,"FUR":2}',
   'family_bonus', '{"family":"body","min_count":2,"bonus":2}', 'Ha un occhio solo. Ti vede solo se gli stai davanti.', '/cards/P089.webp'),
  ('P090', 'Conte Rata', 'villains', 'beta',
   '{"FOR":1,"VEL":4,"RES":0,"INT":6,"VOL":7,"PER":5,"ENE":2,"MAG":7,"PSI":9,"COM":1,"TEC":1,"FUR":10}',
   'relentless', '{}', 'Ti succhia il sangue a rate. Gli interessi sono a parte.', '/cards/P090.webp'),

  ('P091', 'Talos', 'heroes', 'alfa',
   '{"FOR":10,"VEL":1,"RES":1,"INT":2,"VOL":6,"PER":5,"ENE":9,"MAG":1,"PSI":1,"COM":5,"TEC":10,"FUR":1}',
   'comeback', '{"bonus":2}', 'Bronzo da capo a piedi. Il tallone, però, è meglio non toccarlo.', '/cards/P091.webp'),

  ('P092', 'Cariddi', 'neutrals', 'omega',
   '{"FOR":3,"VEL":1,"RES":3,"INT":0,"VOL":5,"PER":2,"ENE":10,"MAG":5,"PSI":1,"COM":10,"TEC":1,"FUR":10}',
   'underdog', '{"bonus":3}', 'Ingoia navi, container e denunce. Non ha mai restituito niente.', '/cards/P092.webp');
