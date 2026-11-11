-- Ten more characters from the THE FRACTURE compendium (docs/WORLD.md, "Dal
-- compendio, secondo gruppo"), P133-P142. As for P105-P114: codename, look,
-- power and quote come from the compendium entry; the twelve statistics are
-- scaled to the ability budget of the rarity, and the compendium tier decides
-- the rarity. The drawings follow the entry's illustration prompt, in the base
-- style and moved to Nuova Megara. Every power is an existing one with the
-- parameters already in use; in_packs defaults to true.

insert into public.card_definitions
  (code, name, faction, rarity_code, stats, power_code, power_params, flavor, art_url, real_name, powers_text)
values
  ('P133', 'Bascule', 'heroes', 'delta',
   '{"FOR":6,"VEL":1,"RES":7,"INT":8,"VOL":9,"PER":9,"ENE":1,"MAG":0,"PSI":0,"COM":2,"TEC":9,"FUR":2}',
   null, '{}', 'Il ponte si alza in nove minuti. La vostra riunione ne ha già consumati sette.', '/cards/P133.webp',
   'Hedda Nyström',
   'Nessun potere: da quarantun anni in cabina, è l''unica che sappia alzare a mano i ponti mobili del porto quando la rete cade. Le servono nove minuti e un''altra persona al contrappeso.'),
  ('P134', 'Heading', 'neutrals', 'delta',
   '{"FOR":3,"VEL":3,"RES":7,"INT":10,"VOL":9,"PER":4,"ENE":1,"MAG":0,"PSI":0,"COM":1,"TEC":10,"FUR":6}',
   null, '{}', 'Il progetto dice che qui c''è roccia. Il progetto non ha mai messo la mano sopra.', '/cards/P134.webp',
   'Nguyễn Bảo Trân',
   'Ingegnera di scavo della nuova metropolitana: appoggia la mano nuda sulla roccia e sa dove una galleria reggerà e dove no. La lettura vale solo per il fronte che ha toccato, e solo per sedici ore.'),
  ('P135', 'Hecatomb', 'villains', 'delta',
   '{"FOR":4,"VEL":3,"RES":5,"INT":10,"VOL":10,"PER":8,"ENE":0,"MAG":2,"PSI":1,"COM":2,"TEC":5,"FUR":4}',
   null, '{}', 'Non decido io chi paga. Decido soltanto in quale ordine.', '/cards/P135.webp',
   'Baltasar Quiroga-Rhen',
   'Conosce il tariffario dei tributi: quale creatura svegliata negli scavi accetta bestiame, quale metallo lavorato, quale una persona che sappia cantare. Le tariffe cambiano senza preavviso, e un tributo rifiutato gli costa l''immunità.'),

  ('P136', 'Indemnity', 'villains', 'gamma',
   '{"FOR":3,"VEL":2,"RES":5,"INT":10,"VOL":8,"PER":9,"ENE":1,"MAG":8,"PSI":1,"COM":0,"TEC":4,"FUR":4}',
   'shielded', '{"bonus":1}', 'La sventura non si distrugge, signora. Si distribuisce. Con un costo di gestione.', '/cards/P136.webp',
   'Ambrogio Vezzali',
   'Assicura contro le maledizioni per la Compagnia Lete, e la polizza funziona: firmata la clausola, la sventura lascia il cliente e viene ripartita fra tutti gli assicurati. Niente si distrugge: si diluisce.'),
  ('P137', 'Collegium', 'heroes', 'gamma',
   '{"FOR":9,"VEL":1,"RES":10,"INT":6,"VOL":9,"PER":5,"ENE":2,"MAG":1,"PSI":1,"COM":5,"TEC":4,"FUR":2}',
   'bond', '{"bonus":1}', 'Non è la magia a tenere su le gallerie. È qualcuno, e vuole essere pagato.', '/cards/P137.webp',
   'Rukiye Demirbaş',
   'Sindacalista dei portatori di rune: vent''anni di carichi le hanno rifatto lo scheletro, e può reggere su di sé il carico magico di nove colleghi alla volta. Durante uno sciopero, nove persone incrociano le braccia e non crolla niente.'),
  ('P138', 'Dowser', 'neutrals', 'gamma',
   '{"FOR":2,"VEL":2,"RES":5,"INT":8,"VOL":9,"PER":10,"ENE":0,"MAG":9,"PSI":3,"COM":1,"TEC":3,"FUR":3}',
   'ability_bonus', '{"ability":"PER","bonus":2}', 'Portami qualcuno che lo aspetta ancora. Altrimenti non c''è niente da trovare.', '/cards/P138.webp',
   'Perpetua Bakayoko',
   'Non cerca le persone, cerca le loro assenze: con una bacchetta di ferro trova il punto esatto in cui qualcuno è sparito. Le serve un familiare che tenga la bacchetta con lei, e il cuore le regge una ricerca al mese.'),

  ('P139', 'Herma', 'villains', 'beta',
   '{"FOR":10,"VEL":0,"RES":10,"INT":1,"VOL":9,"PER":7,"ENE":2,"MAG":9,"PSI":1,"COM":7,"TEC":0,"FUR":1}',
   'relentless', '{}', 'Non parla. Incide sul muro il numero di particella di chi ha appena fermato.', '/cards/P139.webp',
   'Nessuno: nei registri del Comune è il cippo di confine n. 4 del rione Sette',
   'Cippo di confine svegliato dall''Ora Zero: esiste solo lungo i confini, muri divisori, soglie, marciapiedi, e lì è solido come la pietra di cui è fatto. Non può allontanarsene nemmeno di un passo.'),
  ('P140', 'Vulnerary', 'heroes', 'beta',
   '{"FOR":2,"VEL":2,"RES":3,"INT":8,"VOL":9,"PER":10,"ENE":1,"MAG":10,"PSI":3,"COM":1,"TEC":4,"FUR":4}',
   'last_stand', '{"bonus":3,"min_round":4}', 'Non le ho tolto niente. Ho solo accettato la scadenza al posto suo.', '/cards/P140.webp',
   'Sadiq Bamigbola',
   'Guaritore delle Lanterne: non chiude le ferite, ne prende su di sé il tempo di guarigione, e nel paziente la ferita risulta già guarita. Ha trentatré anni e il corpo di un settantenne.'),

  ('P141', 'Palladium', 'heroes', 'alfa',
   '{"FOR":8,"VEL":0,"RES":10,"INT":5,"VOL":9,"PER":9,"ENE":10,"MAG":1,"PSI":1,"COM":4,"TEC":0,"FUR":1}',
   'comeback', '{"bonus":2}', 'Neanche il giorno che è morta mia figlia ho lasciato cadere qualcosa.', '/cards/P141.webp',
   'Alaric Wendover',
   'Da generazioni un membro della sua famiglia sta appeso nella Sala del Palladio e regge uno scudo che copre la città: devia tutto quello che cade dal cielo. Quando uno di loro cede, tocca al prossimo.'),

  ('P142', 'Parabellum', 'neutrals', 'omega',
   '{"FOR":7,"VEL":1,"RES":10,"INT":9,"VOL":7,"PER":0,"ENE":10,"MAG":2,"PSI":0,"COM":5,"TEC":10,"FUR":0}',
   'underdog', '{"bonus":3}', 'Bersaglio nominato al settanta per cento. Attendo il resto del nome.', '/cards/P142.webp',
   'Nessuno: Unità di Interdizione Ontologica HG-9/91',
   'Arma strategica custodita nel caveau del Banco: non distrugge il bersaglio, gli toglie la possibilità di essere il soggetto di una frase. Per sparare deve conoscerne il nome intero, e servono due chiavi di ceramica.');

insert into public.card_definition_traits (definition_id, trait_code)
select d.id, unnest(array['origin.' || v.origin, 'nature.' || v.nature, 'group.' || v.grp])
from (values
  ('P133', 'mestiere', 'umano', 'custodi'),
  ('P134', 'mestiere', 'umano', 'sciolti'),
  ('P135', 'mestiere', 'umano', 'figli'),
  ('P136', 'magia', 'umano', 'lete'),
  ('P137', 'magia', 'umano', 'lanterne'),
  ('P138', 'magia', 'umano', 'sciolti'),
  ('P139', 'mito', 'creatura', 'banco'),
  ('P140', 'segno', 'umano', 'lanterne'),
  ('P141', 'segno', 'umano', 'custodi'),
  ('P142', 'tecnologia', 'macchina', 'banco')
) as v (code, origin, nature, grp)
join public.card_definitions d on d.code = v.code;
