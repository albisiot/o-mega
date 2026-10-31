-- The last twenty Delta characters get their name, flavor text and art
-- (docs/WORLD.md): every character of the catalog now has its identity.
-- Stats do not change.

update public.card_definitions set
  name = 'Kid Scippo',
  flavor = 'Hai ancora il portafoglio? Controlla.',
  art_url = '/cards/P002.webp'
where code = 'P002';

update public.card_definitions set
  name = 'Prof. Lince',
  flavor = 'Risolve l''equazione al primo sguardo. Il barattolo, invece, no.',
  art_url = '/cards/P003.webp'
where code = 'P003';

update public.card_definitions set
  name = 'Boom Bruno',
  flavor = 'Lo senti arrivare. Poi non senti più niente.',
  art_url = '/cards/P005.webp'
where code = 'P005';

update public.card_definitions set
  name = 'Cassia Moon',
  flavor = 'Ti dice come finirà. Non le crede nessuno.',
  art_url = '/cards/P006.webp'
where code = 'P006';

update public.card_definitions set
  name = 'Sam Diesel',
  flavor = 'Guida il blindato dei Custodi. Lo ripara a calci.',
  art_url = '/cards/P007.webp'
where code = 'P007';

update public.card_definitions set
  name = 'Greta Talpa',
  flavor = 'Lavora da anni nel tuo ufficio. Chiedi pure in giro.',
  art_url = '/cards/P008.webp'
where code = 'P008';

update public.card_definitions set
  name = 'Tito Ferry',
  flavor = 'Porta chiunque oltre il porto. Non riporta nessuno.',
  art_url = '/cards/P010.webp'
where code = 'P010';

update public.card_definitions set
  name = 'Cosmo Nero',
  flavor = 'Ai Figli dell''Ultima ha portato i biscotti. Poi è rimasto.',
  art_url = '/cards/P011.webp'
where code = 'P011';

update public.card_definitions set
  name = 'Hugo Molo',
  flavor = 'Non corre. Aspetta che arrivi tu.',
  art_url = '/cards/P013.webp'
where code = 'P013';

update public.card_definitions set
  name = 'Mr. Grigio',
  flavor = 'Eri con lui un minuto fa. Com''era fatto?',
  art_url = '/cards/P014.webp'
where code = 'P014';

update public.card_definitions set
  name = 'Iris Medix',
  flavor = 'Cura tutto il quartiere. Si ammala solo lei.',
  art_url = '/cards/P015.webp'
where code = 'P015';

update public.card_definitions set
  name = 'Belladonna',
  flavor = 'La senti arrivare da tre quartieri. Scappare non serve.',
  art_url = '/cards/P016.webp'
where code = 'P016';

update public.card_definitions set
  name = 'Nino Bar',
  flavor = 'Al suo bancone eroi e cattivi pagano uguale.',
  art_url = '/cards/P017.webp'
where code = 'P017';

update public.card_definitions set
  name = 'Elia Mentis',
  flavor = 'Legge nel pensiero della classe. Per questo nessuno copia.',
  art_url = '/cards/P018.webp'
where code = 'P018';

update public.card_definitions set
  name = 'Mirko KO',
  flavor = 'Manda tutti al tappeto. Anche sé stesso, al primo colpo.',
  art_url = '/cards/P019.webp'
where code = 'P019';

update public.card_definitions set
  name = 'Bea Radio',
  flavor = 'Se salta la rete, il quartiere parla con lei.',
  art_url = '/cards/P020.webp'
where code = 'P020';

update public.card_definitions set
  name = 'Ugo Spillo',
  flavor = 'Entra ovunque, purché la serratura non sia elettronica.',
  art_url = '/cards/P021.webp'
where code = 'P021';

update public.card_definitions set
  name = 'Rex Mastino',
  flavor = 'Trova tutto. Capisce poco. Non molla mai.',
  art_url = '/cards/P022.webp'
where code = 'P022';

update public.card_definitions set
  name = 'Enzo Brace',
  flavor = 'Entra per primo. Esce per ultimo. Odia entrambe le cose.',
  art_url = '/cards/P023.webp'
where code = 'P023';

update public.card_definitions set
  name = 'Dino Fuse',
  flavor = 'Preme tutti i bottoni. Qualcosa, prima o poi, esplode.',
  art_url = '/cards/P024.webp'
where code = 'P024';
