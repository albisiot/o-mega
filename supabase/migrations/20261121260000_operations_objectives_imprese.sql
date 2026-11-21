-- Operazioni (SPEC §5.17, tappa 3): the first daily objectives and Imprese that count them
-- (§8.3, §8.5). Placeholder texts, like the rest of the catalog; admins change them from the
-- editors. The Imprese count the past too: the operations only just arrived.

insert into public.daily_objective_definitions (code, title, difficulty, metric, params, target, coins, packs, card_definition_ids, card_variant_ids)
values
  ('coop_complete', 'Completa un''Operazione', 'easy', 'coop_played', '{}', 1, null, 0, '{}', '{}'),
  ('coop_win', 'Vinci un''Operazione', 'medium', 'coop_won', '{}', 1, null, 0, '{}', '{}'),
  ('coop_threats_4', 'Ferma 4 Minacce nelle Operazioni', 'medium', 'coop_threats', '{}', 4, null, 0, '{}', '{}'),
  ('coop_stars_3', 'Ottieni 3 stelle nelle Operazioni', 'hard', 'coop_stars', '{}', 3, null, 0, '{}', '{}');

-- After the 26 of the board, in order of tier; rewards as the editor suggests them
-- (Bronzo 50 monete, Argento 150, Oro 2 pacchetti, Leggenda 3 pacchetti e un titolo).
insert into public.achievements (position, tier, name, description, hint, metric, params, target, coins, packs, title)
select coalesce((select max(a.position) from public.achievements a), 0) + v.ord, v.tier, v.name, v.description, v.hint,
       v.metric, '{}'::jsonb, v.target, v.coins, v.packs, v.title
from (values
  (1, 'bronze', 'Lavoro di squadra', 'Hai completato la tua prima Operazione.', 'Certe scosse non si reggono da soli.',
   'coop_played', 1, 50, 0, null),
  (2, 'bronze', 'Prima linea', 'Hai fermato 10 Minacce nelle Operazioni.', 'Prendi tu quella più grossa.',
   'coop_threats', 10, 50, 0, null),
  (3, 'silver', 'Missione compiuta', 'Hai vinto 5 Operazioni.', 'Fino al Boss, e oltre.',
   'coop_won', 5, 150, 0, null),
  (4, 'silver', 'Prime stelle', 'Hai ottenuto 3 stelle nelle Operazioni.', 'Non basta vincere: conta come.',
   'coop_stars', 3, 150, 0, null),
  (5, 'gold', 'Allarme rientrato', 'Hai ottenuto 9 stelle nelle Operazioni.', 'Ogni operazione ne nasconde tre.',
   'coop_stars', 9, 0, 2, null),
  (6, 'gold', 'Caposquadra', 'Hai vinto 25 Operazioni.', 'Una squadra che non si scioglie mai.',
   'coop_won', 25, 0, 2, 'Caposquadra'),
  (7, 'legend', 'Baluardo di Nuova Megara', 'Hai fermato 250 Minacce nelle Operazioni.', 'La città regge finché reggi tu.',
   'coop_threats', 250, 0, 3, 'Baluardo')
) as v(ord, tier, name, description, hint, metric, target, coins, packs, title);
