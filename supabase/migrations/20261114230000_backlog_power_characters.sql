-- Fourteen characters for the fourteen powers of docs/POWERS-BACKLOG.md that no card had
-- yet, P218-P231, one character per power. As with P115-P122, the power picks the rarity
-- (simple powers on Gamma and Beta, distinctive ones on Alfa and Omega) and the character
-- grows out of the power; each one comes from an entry of the THE FRACTURE compendium with
-- a matching role (docs/WORLD.md, "Per i poteri del backlog"), with its statistics scaled
-- to the ability budget of the rarity, real name and quote from the entry (shortened to fit
-- the card), moved to Nuova Megara. The parameters are the recommended ones of the backlog.
-- in_packs defaults to true: they join the packs like every other card of their rarity.

insert into public.card_definitions
  (code, name, faction, rarity_code, stats, power_code, power_params, flavor, art_url, real_name, powers_text)
values
  ('P218', 'Upkeep', 'heroes', 'gamma',
   '{"FOR":3,"VEL":2,"RES":5,"INT":7,"VOL":9,"PER":8,"ENE":6,"MAG":0,"PSI":0,"COM":2,"TEC":9,"FUR":4}',
   'scrappy', '{"min_value":3}', 'Non ricostruisco il mondo. Ricostruisco la pompa. Il mondo si arrangi.', '/cards/P218.webp',
   'Rukmini Sathe',
   'Da diciannove anni tiene in funzione da sola l''ultimo impianto dell''acqua dei quartieri bassi: con una vecchia chiave di taratura riporta una macchina com''era un turno prima. Funziona solo sulle macchine che ha curato a mano per almeno quattrocento ore.'),
  ('P219', 'Reus', 'villains', 'gamma',
   '{"FOR":5,"VEL":4,"RES":6,"INT":8,"VOL":10,"PER":4,"ENE":0,"MAG":0,"PSI":9,"COM":4,"TEC":1,"FUR":4}',
   'vendetta', '{"bonus":3}', 'Mi portano i loro figli. Dicono che è educativo.', '/cards/P219.webp',
   'Milán Szendrei',
   'L''ultimo detenuto della prigione della Compagnia Lete, dove a tutti gli altri hanno tolto la rabbia: a chi gli sta vicino restituisce il rancore e la voglia di rendere il colpo. Ogni volta lascia una cicatrice che va tolta entro un giorno e mezzo.'),
  ('P220', 'Statera', 'neutrals', 'gamma',
   '{"FOR":5,"VEL":1,"RES":8,"INT":7,"VOL":10,"PER":10,"ENE":0,"MAG":9,"PSI":0,"COM":3,"TEC":1,"FUR":1}',
   'counterpunch', '{"bonus":1,"max":3}', 'Lei vale trentuno. Non è un''offesa: è quanto rimane.', '/cards/P220.webp',
   'Nessuno: è lo strumento con cui il Banco applica la Misura',
   'Una stadera alta il doppio di un uomo, avvolta in nastri da sarto: in nove secondi pesa quanto vale una persona e compensa lo scarto, togliendo a chi pesa troppo. Non sa pesare chi non ha un nome nel registro.'),
  ('P221', 'Normal', 'heroes', 'gamma',
   '{"FOR":3,"VEL":2,"RES":5,"INT":8,"VOL":10,"PER":10,"ENE":9,"MAG":0,"PSI":0,"COM":1,"TEC":3,"FUR":4}',
   'adaptable', '{"bonus":4}', 'Mi hanno chiesto per anni cosa nascondo. L''ho nascosto anche a me.', '/cards/P221.webp',
   'Si presenta come Anna Fioravanti, impiegata del catasto',
   'Arrivata dallo strappo, la sua specie diventa ciò che la circonda: dal giorno dell''Ora Zero ha scelto di essere umana, e nessuno strumento la distingue da una passante. Ogni volta che allenta la forma ne nasce una nuova, e dimentica un po'' di ciò che era.'),
  ('P222', 'Billable', 'villains', 'gamma',
   '{"FOR":4,"VEL":4,"RES":4,"INT":7,"VOL":5,"PER":8,"ENE":9,"MAG":0,"PSI":0,"COM":2,"TEC":7,"FUR":5}',
   'opportunist', '{"bonus":3}', 'Quaranta minuti. Le do fattura. Gli eroi lavorano gratis: chiami loro.', '/cards/P222.webp',
   'Yusuf Bahrami',
   'Nel suo avambraccio vive un organismo arrivato dallo strappo che salda qualunque cosa a qualunque cosa: Yusuf lo affitta a ore, con ricevuta e tariffa notturna. Quaranta minuti ogni dodici ore, e certi lavori l''organismo li rifiuta.'),
  ('P223', 'Insula', 'neutrals', 'beta',
   '{"FOR":3,"VEL":2,"RES":8,"INT":10,"VOL":10,"PER":7,"ENE":0,"MAG":0,"PSI":9,"COM":1,"TEC":4,"FUR":3}',
   'lone_wolf', '{"bonus":5}', 'Non sono rimasto indietro. Ho deciso di restare.', '/cards/P223.webp',
   'Kazimierz Wołoszyn',
   'Ha rifiutato tre sgomberi e vive da solo in un condominio di duecentoquaranta appartamenti nella zona chiusa: finché lui c''è, l''isolato si comporta come se fosse ancora abitato, con l''acqua, l''aria buona e le luci accese. Se salta la passeggiata quotidiana, il confine si stringe e non torna.'),
  ('P224', 'Recesso', 'heroes', 'beta',
   '{"FOR":5,"VEL":7,"RES":6,"INT":6,"VOL":4,"PER":1,"ENE":0,"MAG":10,"PSI":0,"COM":10,"TEC":1,"FUR":7}',
   'reflect', '{}', 'Non è mia. È intestata a me, che è un''altra cosa.', '/cards/P224.webp',
   'Bruno Nestore Sagliani',
   'Un pettine di rame lungo un braccio gli è stato intestato d''ufficio, e da allora quando qualcuno lo aggredisce l''oggetto risponde da solo, rimandando il colpo a chi l''ha dato. Non attacca mai: se è Bruno a cominciare, diventa un peso morto.'),
  ('P225', 'Dittograph', 'villains', 'beta',
   '{"FOR":3,"VEL":4,"RES":5,"INT":10,"VOL":2,"PER":3,"ENE":0,"MAG":10,"PSI":0,"COM":4,"TEC":10,"FUR":6}',
   'eclectic', '{"bonus":3,"min_families":3}', 'Chiedimelo adesso. Fra dieci minuti risponde lei, e lei ti odia.', '/cards/P225.webp',
   'Wen Xiulan',
   'Due Xiulan nello stesso corpo dopo lo strappo: una maga e una chimica, che i Figli dell''Ultima usano come consulente. Sa fare un rito con i reagenti di una fabbrica, ma quale delle due risponde non lo decide lei.'),
  ('P226', 'Praesidium', 'neutrals', 'beta',
   '{"FOR":8,"VEL":5,"RES":8,"INT":2,"VOL":8,"PER":6,"ENE":7,"MAG":0,"PSI":0,"COM":8,"TEC":0,"FUR":5}',
   'main_event', '{"bonus":3}', '(Non ha voce: quando arriva, per undici secondi non si sente nulla.)', '/cards/P226.webp',
   'Nessuno: i portuali lo chiamano «quello che sta davanti»',
   'Un cane di nove metri senza testa, con un imbuto di membrane al posto del cranio: custodisce il sonno del colosso che dorme sotto il porto e spegne tutto ciò che potrebbe svegliarlo. Si muove solo per le minacce più grandi.'),
  ('P227', 'Residuo', 'heroes', 'alfa',
   '{"FOR":7,"VEL":5,"RES":10,"INT":5,"VOL":3,"PER":4,"ENE":0,"MAG":7,"PSI":0,"COM":10,"TEC":1,"FUR":6}',
   'sacrifice', '{"bonus":5}', 'Se sapessi per chi, non starei qui a chiederlo a te.', '/cards/P227.webp',
   'Ordano Serchi',
   'Esattore di garanzia del Banco: muore al posto dei clienti in regola, e quaranta minuti dopo si ricompone allo sportello 9. Il prezzo è la memoria, sempre più alta, e non può rifiutare una morte offerta in cambio di quella di un altro.'),
  ('P228', 'Afterimage', 'heroes', 'alfa',
   '{"FOR":4,"VEL":8,"RES":5,"INT":6,"VOL":3,"PER":7,"ENE":0,"MAG":0,"PSI":5,"COM":8,"TEC":3,"FUR":9}',
   'echo', '{}', 'Lo so già come va a finire. Non so a quale delle due.', '/cards/P228.webp',
   'Lucía Ferrán',
   'Arrivata dallo strappo, è il doppione di una donna di questo mondo: vede con due secondi d''anticipo i gesti di chi le somiglia, e li rifà prima che finiscano. Contro uno stile che non conosce è cieca come chiunque.'),
  ('P229', 'Gymnasiarch', 'neutrals', 'alfa',
   '{"FOR":5,"VEL":3,"RES":6,"INT":8,"VOL":10,"PER":8,"ENE":0,"MAG":0,"PSI":1,"COM":7,"TEC":4,"FUR":6}',
   'catalyst', '{"multiplier":2}', 'Tuo nonno teneva quarantun secondi. Tu sei a trentotto.', '/cards/P229.webp',
   'Thandeka Mhlongo',
   'Allenatrice degli eredi delle casate del Banco: guardando un corpo sotto sforzo sa quanti secondi gli restano e dove spingere per guadagnarne altri quattro. Ventinove allievi, ventinove record. Su chi sta fermo, o in un filmato, non vede niente.'),
  ('P230', 'Matins', 'villains', 'omega',
   '{"FOR":3,"VEL":0,"RES":10,"INT":6,"VOL":9,"PER":10,"ENE":2,"MAG":3,"PSI":10,"COM":2,"TEC":1,"FUR":5}',
   'pack_leader', '{"bonus":1}', 'Buongiorno. Va tutto bene. Va tutto bene. Va tutto bene.', '/cards/P230.webp',
   'Nessuno: la Compagnia Lete la registra come Segnale Mattutino 1',
   'La voce del notiziario del mattino, chiusa dietro un vetro smerigliato negli studi della Compagnia Lete: è un richiamo di branco, e chi lo ascolta all''alba smette di avere paura per tutto il giorno. Non capisce le parole che pronuncia.'),
  ('P231', 'Thicket', 'villains', 'omega',
   '{"FOR":10,"VEL":1,"RES":10,"INT":6,"VOL":9,"PER":7,"ENE":0,"MAG":10,"PSI":0,"COM":5,"TEC":0,"FUR":3}',
   'fog', '{}', '(Non parla: fa parlare chi ha preso, tutti insieme, con mezzo secondo di ritardo.)', '/cards/P231.webp',
   'Nessuno: al catasto è la «particella 41, bosco di Vall''Oscura»',
   'È il bosco sopra la città: ogni radice, animale e banco di nebbia per nove chilometri quadrati è un suo organo, e chi ci entra non sa più chi ha accanto. Non può spostare il suo confine di un metro: fuori deve prendere in prestito un corpo.');

insert into public.card_definition_traits (definition_id, trait_code)
select d.id, unnest(array['origin.' || v.origin, 'nature.' || v.nature, 'group.' || v.grp])
from (values
  ('P218', 'tecnologia', 'umano', 'lanterne'),
  ('P219', 'segno', 'umano', 'lete'),
  ('P220', 'magia', 'entita', 'banco'),
  ('P221', 'strappo', 'alieno', 'sciolti'),
  ('P222', 'strappo', 'umano', 'sciolti'),
  ('P223', 'segno', 'umano', 'sciolti'),
  ('P224', 'magia', 'umano', 'custodi'),
  ('P225', 'strappo', 'umano', 'figli'),
  ('P226', 'mito', 'creatura', 'sciolti'),
  ('P227', 'segno', 'umano', 'banco'),
  ('P228', 'strappo', 'umano', 'lanterne'),
  ('P229', 'segno', 'umano', 'banco'),
  ('P230', 'mito', 'entita', 'lete'),
  ('P231', 'mito', 'entita', 'figli')
) as v (code, origin, nature, grp)
join public.card_definitions d on d.code = v.code;
