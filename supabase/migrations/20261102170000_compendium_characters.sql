-- Ten characters taken from the THE FRACTURE compendium and brought to Nuova
-- Megara (docs/WORLD.md): codename, look, power and quote come from their
-- compendium entry, the values from its twelve statistics scaled to the
-- ability budget of each rarity. All of them are found in packs.

insert into public.card_definitions (code, name, faction, rarity_code, stats, power_code, power_params, flavor, art_url) values
  ('P105', 'Maroon', 'heroes', 'delta',
   '{"FOR":5,"VEL":3,"RES":6,"INT":9,"VOL":7,"PER":4,"ENE":1,"MAG":0,"PSI":1,"COM":2,"TEC":10,"FUR":6}',
   null, '{}', 'Non mi hanno dimenticato. Hanno calcolato. Fa più male.', '/cards/P105.webp'),
  ('P106', 'Futures', 'neutrals', 'delta',
   '{"FOR":9,"VEL":7,"RES":8,"INT":3,"VOL":5,"PER":3,"ENE":2,"MAG":0,"PSI":0,"COM":10,"TEC":1,"FUR":6}',
   null, '{}', 'Novanta secondi. Poi ho settant''anni e vado a casa.', '/cards/P106.webp'),
  ('P107', 'Procura', 'villains', 'delta',
   '{"FOR":5,"VEL":4,"RES":4,"INT":7,"VOL":3,"PER":9,"ENE":1,"MAG":0,"PSI":6,"COM":3,"TEC":2,"FUR":10}',
   null, '{}', 'La nove no. La nove la teniamo pronta.', '/cards/P107.webp'),

  ('P108', 'Semaphore', 'villains', 'gamma',
   '{"FOR":1,"VEL":3,"RES":2,"INT":7,"VOL":6,"PER":6,"ENE":5,"MAG":1,"PSI":8,"COM":2,"TEC":9,"FUR":4}',
   'ability_bonus', '{"ability":"PSI","bonus":2}', 'Non l''ho detto io. Lo ha pensato lei, guardandosi.', '/cards/P108.webp'),
  ('P109', 'Parallasse', 'heroes', 'gamma',
   '{"FOR":1,"VEL":2,"RES":6,"INT":9,"VOL":8,"PER":6,"ENE":4,"MAG":1,"PSI":6,"COM":1,"TEC":7,"FUR":3}',
   'opener', '{"bonus":3,"max_round":2}', 'Domani alle sei e dodici avrò paura. Adesso lavoriamo.', '/cards/P109.webp'),
  ('P110', 'Cursor', 'neutrals', 'gamma',
   '{"FOR":5,"VEL":9,"RES":7,"INT":5,"VOL":5,"PER":6,"ENE":2,"MAG":2,"PSI":0,"COM":4,"TEC":1,"FUR":8}',
   'ability_bonus', '{"ability":"VEL","bonus":2}', 'Chiedimi quanto ci metto, non quando arrivo.', '/cards/P110.webp'),

  ('P111', 'Antiphon', 'villains', 'beta',
   '{"FOR":1,"VEL":3,"RES":4,"INT":7,"VOL":6,"PER":8,"ENE":0,"MAG":9,"PSI":8,"COM":3,"TEC":1,"FUR":3}',
   'family_bonus', '{"family":"power","min_count":2,"bonus":2}', 'Ripeti pure. Ho tutto il tempo di dirlo al contrario.', '/cards/P111.webp'),
  ('P112', 'Plinth', 'heroes', 'beta',
   '{"FOR":10,"VEL":1,"RES":10,"INT":4,"VOL":9,"PER":5,"ENE":3,"MAG":7,"PSI":1,"COM":2,"TEC":0,"FUR":1}',
   'last_stand', '{"bonus":3,"min_round":4}', 'Non parla. Sul cartello che porta appeso: tengo, voi andate.', '/cards/P112.webp'),

  ('P113', 'Harrow', 'neutrals', 'alfa',
   '{"FOR":10,"VEL":1,"RES":9,"INT":2,"VOL":10,"PER":4,"ENE":5,"MAG":3,"PSI":1,"COM":1,"TEC":6,"FUR":0}',
   'comeback', '{"bonus":2}', 'Resa prevista: sufficiente. Proseguire. Lo stampa ogni alba.', '/cards/P113.webp'),

  ('P114', 'Perpetuum', 'heroes', 'omega',
   '{"FOR":3,"VEL":0,"RES":10,"INT":5,"VOL":10,"PER":7,"ENE":10,"MAG":2,"PSI":2,"COM":1,"TEC":1,"FUR":0}',
   'underdog', '{"bonus":3}', 'Non ringraziatemi. Portatemi da leggere e tacete.', '/cards/P114.webp');
