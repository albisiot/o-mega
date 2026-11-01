-- Twelve characters from elsewhere or from later: aliens, machines and heroes
-- of the future (docs/WORLD.md), with the same rarity proportions, ability
-- budgets and power tiers as the rest of the catalog. All found in packs.

insert into public.card_definitions (code, name, faction, rarity_code, stats, power_code, power_params, flavor, art_url) values
  ('P093', 'Glip', 'neutrals', 'delta',
   '{"FOR":0,"VEL":2,"RES":1,"INT":8,"VOL":4,"PER":6,"ENE":3,"MAG":5,"PSI":9,"COM":2,"TEC":7,"FUR":7}',
   null, '{}', 'Ha sbagliato pianeta. Ora fa la fila alle Poste.', '/cards/P093.webp'),
  ('P094', 'Vigile-8', 'heroes', 'delta',
   '{"FOR":5,"VEL":3,"RES":8,"INT":2,"VOL":8,"PER":9,"ENE":4,"MAG":0,"PSI":0,"COM":6,"TEC":8,"FUR":1}',
   null, '{}', 'Multa anche i supereroi. Soprattutto i supereroi.', '/cards/P094.webp'),
  ('P095', 'Lina Laser', 'heroes', 'delta',
   '{"FOR":4,"VEL":6,"RES":4,"INT":4,"VOL":7,"PER":1,"ENE":10,"MAG":2,"PSI":1,"COM":6,"TEC":4,"FUR":5}',
   null, '{}', 'Spara laser dagli occhi. Ha già bruciato tre paia di occhiali.', '/cards/P095.webp'),
  ('P096', 'Don Viscido', 'villains', 'delta',
   '{"FOR":0,"VEL":5,"RES":8,"INT":6,"VOL":5,"PER":5,"ENE":2,"MAG":4,"PSI":6,"COM":1,"TEC":2,"FUR":10}',
   null, '{}', 'Entra da sotto la porta e ti vende un''assicurazione.', '/cards/P096.webp'),

  ('P097', 'Eva Orbita', 'heroes', 'gamma',
   '{"FOR":2,"VEL":6,"RES":4,"INT":7,"VOL":8,"PER":6,"ENE":7,"MAG":1,"PSI":1,"COM":3,"TEC":9,"FUR":0}',
   'opener', '{"bonus":3,"max_round":2}', 'È tornata dallo spazio. Cerca ancora parcheggio.', '/cards/P097.webp'),
  ('P098', 'Ing. Copia', 'villains', 'gamma',
   '{"FOR":1,"VEL":2,"RES":5,"INT":9,"VOL":5,"PER":6,"ENE":4,"MAG":1,"PSI":0,"COM":5,"TEC":8,"FUR":8}',
   'ability_bonus', '{"ability":"INT","bonus":2}', 'Ha sostituito un ingegnere della Lete. In ufficio nessuno se n''è accorto.', '/cards/P098.webp'),
  ('P099', 'Zeta Rax', 'neutrals', 'gamma',
   '{"FOR":5,"VEL":7,"RES":6,"INT":1,"VOL":1,"PER":8,"ENE":3,"MAG":1,"PSI":0,"COM":9,"TEC":6,"FUR":7}',
   'relentless', '{}', 'Ha attraversato tre galassie per trovarti. Accetta solo contanti.', '/cards/P099.webp'),
  ('P100', 'Nonno 3000', 'heroes', 'gamma',
   '{"FOR":1,"VEL":1,"RES":2,"INT":9,"VOL":7,"PER":7,"ENE":6,"MAG":4,"PSI":6,"COM":3,"TEC":8,"FUR":0}',
   'last_stand', '{"bonus":3,"min_round":4}', 'Viene dal futuro. Dice che si stava meglio prima.', '/cards/P100.webp'),

  ('P101', 'Suor Mecha', 'heroes', 'beta',
   '{"FOR":10,"VEL":1,"RES":9,"INT":2,"VOL":8,"PER":1,"ENE":5,"MAG":3,"PSI":3,"COM":4,"TEC":7,"FUR":0}',
   'family_bonus', '{"family":"body","min_count":2,"bonus":2}', 'Prega prima di schiacciare. Dopo, confessa.', '/cards/P101.webp'),
  ('P102', 'Regina Ix', 'villains', 'beta',
   '{"FOR":4,"VEL":1,"RES":3,"INT":6,"VOL":9,"PER":5,"ENE":6,"MAG":1,"PSI":10,"COM":7,"TEC":1,"FUR":0}',
   'family_bonus', '{"family":"mind","min_count":2,"bonus":2}', 'Ha conquistato sei pianeti. Qui non le danno il permesso.', '/cards/P102.webp'),

  ('P103', 'Sibilla', 'neutrals', 'alfa',
   '{"FOR":0,"VEL":0,"RES":1,"INT":10,"VOL":3,"PER":7,"ENE":6,"MAG":4,"PSI":10,"COM":1,"TEC":9,"FUR":1}',
   'foresight', '{}', 'Sa già cosa le chiederai. Risponde comunque in ritardo.', '/cards/P103.webp'),

  ('P104', 'Aion', 'villains', 'omega',
   '{"FOR":0,"VEL":1,"RES":1,"INT":10,"VOL":4,"PER":5,"ENE":10,"MAG":5,"PSI":10,"COM":1,"TEC":3,"FUR":1}',
   'comeback', '{"bonus":3}', 'Arriva dal punto in cui è già tutto finito. Si annoia.', '/cards/P104.webp');
