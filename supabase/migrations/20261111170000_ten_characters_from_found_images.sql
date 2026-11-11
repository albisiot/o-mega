-- Ten new characters, P123-P132 (docs/WORLD.md, "Dagli spunti"): their look
-- started from images the user collected, used only as ideas for shape and
-- colour; the drawings are new, in the usual base style. Each card has exactly
-- the ability budget of its rarity and an existing power with the parameters
-- already in use. in_packs defaults to true, so packs can give all of them.

insert into public.card_definitions
  (code, name, faction, rarity_code, stats, power_code, power_params, flavor, art_url, real_name, powers_text)
values
  ('P123', 'Busker', 'neutrals', 'delta',
   '{"FOR":0,"VEL":5,"RES":4,"INT":5,"VOL":7,"PER":8,"ENE":3,"MAG":3,"PSI":10,"COM":0,"TEC":1,"FUR":8}',
   null, '{}', 'Conosce una canzone sola. Per fortuna è quella giusta.', '/cards/P123.webp',
   'Nessuno sa pronunciarlo: sul permesso da musicista di strada c''è scritto «Gennaro»',
   'Arrivato dallo strappo, ha trovato un mandolino in un vicolo e da allora suona ai semafori: la sua musica calma la folla e fa dimenticare la fretta. Conosce una canzone sola, e non ha mai imparato a fare a pugni.'),
  ('P124', 'Impound', 'heroes', 'delta',
   '{"FOR":10,"VEL":5,"RES":8,"INT":1,"VOL":7,"PER":4,"ENE":3,"MAG":0,"PSI":0,"COM":9,"TEC":5,"FUR":2}',
   null, '{}', 'Doppia fila davanti all''ospedale? Il preventivo te lo lascio sul cofano.', '/cards/P124.webp',
   'Rocco Scognamiglio',
   'Carrozziere di quartiere: dall''Ora Zero ogni sua martellata pesa come un carro attrezzi. Sfonda le auto in doppia fila davanti a ospedali e scuole, poi lascia il biglietto da visita dell''officina. Ogni tanto sbaglia macchina.'),
  ('P125', 'Lagan', 'villains', 'delta',
   '{"FOR":7,"VEL":1,"RES":9,"INT":2,"VOL":6,"PER":9,"ENE":2,"MAG":5,"PSI":1,"COM":6,"TEC":0,"FUR":6}',
   null, '{}', 'Hai perso le chiavi in porto? Non le hai perse: adesso sono sue.', '/cards/P125.webp',
   'Nessuno: i portuali lo chiamano «il Ricettatore»',
   'Bestia del porto svegliata dall''Ora Zero: tutto quello che cade in acqua, anelli, chiavi, telefoni, gli si attacca alla pelle e diventa suo. Fuori dall''acqua è lento e goffo, ma non molla niente.'),

  ('P126', 'Overdue', 'heroes', 'gamma',
   '{"FOR":8,"VEL":6,"RES":10,"INT":4,"VOL":8,"PER":3,"ENE":7,"MAG":1,"PSI":1,"COM":3,"TEC":4,"FUR":0}',
   'last_stand', '{"bonus":3,"min_round":4}', 'Arrivo tardi, è vero. Ma arrivo con tutto il treno.', '/cards/P126.webp',
   'Assunta Iovine',
   'Capotreno dell''ultimo treno a vapore della notte: il suo corpo fa da caldaia e, una volta in pressione, nessuno la ferma. Le serve tempo per scaldarsi, così arriva sempre tardi, ma con tutto il treno.'),
  ('P127', 'Stentore', 'heroes', 'gamma',
   '{"FOR":9,"VEL":0,"RES":10,"INT":4,"VOL":9,"PER":5,"ENE":2,"MAG":6,"PSI":5,"COM":3,"TEC":2,"FUR":0}',
   'bond', '{"bonus":1}', 'Non sa parlare piano. Il Comune ci ha messo duemila anni a capire che è un pregio.', '/cards/P127.webp',
   'Nessuno: nel catalogo del Comune è «Statua di oratore, II secolo a.C.»',
   'Statua di piazza svegliata dall''Ora Zero: con il suo megafono di bronzo si fa sentire da un capo all''altro della città. Legge ogni avviso del Comune, anche quelli dei gatti smarriti. Ha i piedi ancora attaccati al piedistallo.'),
  ('P128', 'Bisque', 'villains', 'gamma',
   '{"FOR":1,"VEL":5,"RES":0,"INT":8,"VOL":6,"PER":10,"ENE":3,"MAG":2,"PSI":4,"COM":2,"TEC":6,"FUR":8}',
   'spy', '{}', 'Zucchero? Lo chiede sempre. Così sente come rispondi.', '/cards/P128.webp',
   'Nessuno: sotto il piede ha solo un numero di serie dipinto in blu',
   'Automa di porcellana dipinta che serve il caffè nelle riunioni della Compagnia Lete. Sente una parola sussurrata dall''altra parte della sala e riferisce tutto. Basta un urto per incrinarla.'),

  ('P129', 'Bubalus', 'heroes', 'beta',
   '{"FOR":10,"VEL":8,"RES":10,"INT":1,"VOL":7,"PER":2,"ENE":8,"MAG":0,"PSI":1,"COM":7,"TEC":3,"FUR":0}',
   'opener', '{"bonus":3,"max_round":2}', 'Doveva arare la Piana. Adesso ara chiunque la tocchi.', '/cards/P129.webp',
   'Nessuno: matricola AR-7 del consorzio agrario',
   'Bufalo meccanico costruito per arare la Piana e svegliato dall''Ora Zero. Difende i campi dei contadini da chiunque provi a prenderseli, soprattutto dai camion della Compagnia Lete. Parte alla carica e non sa frenare.'),
  ('P130', 'Gauger', 'neutrals', 'beta',
   '{"FOR":1,"VEL":1,"RES":6,"INT":9,"VOL":9,"PER":9,"ENE":6,"MAG":4,"PSI":6,"COM":3,"TEC":3,"FUR":0}',
   'nullifier', '{}', 'Motivo della visita? Invasione? Mi serve il modulo B, in triplice copia.', '/cards/P130.webp',
   'Ysh-Varrel, ma in ufficio la chiamano «la dottoressa»',
   'Doganiera arrivata dallo strappo e assunta dal Banco: tutto quello che passa dai portali passa dal suo sportello. Il suo timbro spegne i poteri di chi non ha i documenti in regola. È incatenata alla scrivania, come una penna.'),

  ('P131', 'Mischance', 'neutrals', 'alfa',
   '{"FOR":1,"VEL":10,"RES":3,"INT":4,"VOL":5,"PER":8,"ENE":1,"MAG":10,"PSI":5,"COM":1,"TEC":0,"FUR":10}',
   'sabotage', '{"malus":1}', 'Non ti ha fatto niente. Ti è solo passato davanti.', '/cards/P131.webp',
   'Nessuno: al mercato lo chiamano «Malombra»',
   'Il gatto nero che, si dice, la notte dell''Ora Zero attraversò la strada agli ingegneri della centrale. Da allora porta la sfortuna con sé: a chi gli sta davanti va storto un po'' tutto. Non ha mai graffiato nessuno: non ne ha bisogno.'),

  ('P132', 'Wirepuller', 'villains', 'omega',
   '{"FOR":0,"VEL":3,"RES":1,"INT":9,"VOL":9,"PER":10,"ENE":2,"MAG":10,"PSI":10,"COM":0,"TEC":3,"FUR":4}',
   'comeback', '{"bonus":3}', 'Il copione l''ho scritto io. Voi recitate benissimo.', '/cards/P132.webp',
   'Calogero Sferrazza',
   'Vecchio puparo dei Figli dell''Ultima: dall''Ora Zero i suoi fili di luce si attaccano alle persone e le muovono come pupi. Se un pupo cade, il prossimo entra in scena con più fili. Le sue mani sono diventate di legno e non tocca più niente da solo.');

insert into public.card_definition_traits (definition_id, trait_code)
select d.id, unnest(array['origin.' || v.origin, 'nature.' || v.nature, 'group.' || v.grp])
from (values
  ('P123', 'strappo', 'alieno', 'sciolti'),
  ('P124', 'segno', 'umano', 'lanterne'),
  ('P125', 'mito', 'creatura', 'sciolti'),
  ('P126', 'segno', 'umano', 'lanterne'),
  ('P127', 'mito', 'creatura', 'custodi'),
  ('P128', 'tecnologia', 'macchina', 'lete'),
  ('P129', 'tecnologia', 'macchina', 'sciolti'),
  ('P130', 'strappo', 'alieno', 'banco'),
  ('P131', 'segno', 'creatura', 'sciolti'),
  ('P132', 'segno', 'umano', 'figli')
) as v (code, origin, nature, grp)
join public.card_definitions d on d.code = v.code;
