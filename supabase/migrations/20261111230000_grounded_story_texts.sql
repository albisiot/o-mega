-- The story made concrete (docs/STORY.md v0.2): the Ora Zero is an explosion
-- stopped halfway under the city, and every text says what is at stake. Only
-- texts change: teams, Threats, modifiers and rewards stay as they were tuned.

update public.story_chapters c set
  intro = coalesce(v.intro, c.intro),
  outro = coalesce(v.outro, c.outro)
from (values
  (1, null,
   'Nel caveau, tra le casse della Compagnia, c''è una pietra incisa con la lettera epsilon. Non fai in tempo a toccarla: il dottor Spanò del Banco la prende «in custodia», con tanto di ricevuta. Quella notte il sismografo registra una scossa sotto le Fosse, il quartiere dove abiti, nel momento esatto in cui la pietra esce dal caveau.'),
  (2,
   'Da quando la pietra è uscita dal caveau, le Fosse, il tuo quartiere, tremano a ogni corsa della metropolitana, e stanotte un palazzo si è crepato. Sotto la linea, nella necropoli, i Figli dell''Ultima scavano come se sapessero dove guardare. Se continuano, la prossima crepa è casa tua.',
   'Longwave mette in fila le scosse e trova lo schema: ogni volta che una lettera viene smossa, la città trema dove c''è la successiva, in ordine d''alfabeto. Dopo la epsilon toccava alla zeta, e non era sepolta: Xenolith, il cavatore, l''aveva trovata negli scavi e se l''era tenuta, incastrata nel petto. Vera Kross, sconfitta, ride: «Più lettere tirate fuori, più la città trema. A noi va bene così.» La scossa successiva non arriva da uno scavo, ma dalla torre del Banco.'),
  (3,
   'Il sismografo dice che la torre del Banco trema; il Banco dice che è il riscaldamento. Sono undici piani di sportelli in pieno centro, e se crollano si portano dietro mezzo quartiere. Il Comune ti manda a controllare, ma ogni piano ha la sua tariffa e il Comune non l''ha pagata.',
   'Le lastre che il Banco ti compra come doppioni non vengono distrutte: Auctor le fonde e, con la epsilon del caveau come stampo, cola lettere false da vendere come vere. La prima, una eta, vibra storta ed è lei a far tremare la torre; Auctor, sconfitto, si lascia sfuggire che la centrale della Compagnia non fu costruita accanto al tempio per caso. Quella notte il Banco la prova comunque, e la vibrazione sveglia Multitude, il telepate che ripete i pensieri di chiunque: nei quartieri alti la gente comincia a sentire pensieri che non sono suoi. Il sismografo, intanto, segna la prima scossa sotto il vulcano.'),
  (4, null,
   'Sconfitto Antiphon, Multitude ripete la mente che ascoltava prima di lui, e tutto il quartiere vede il ricordo di Renata: la notte dell''Ora Zero, il permesso di scavo firmato da lei, la trivella della Compagnia che sfonda il pavimento del tempio e la centrale che esplode. Ma nel ricordo l''esplosione non finisce: si ferma a metà, una palla di luce con i detriti sospesi in aria, ed è ancora lì sotto, che avanza pianissimo. Poi Multitude fa sentire a tutti il pensiero che Ottavia non dice mai, il fratello sparito quella notte, e il giorno dopo né Renata né Ottavia si trovano più: all''Ufficio Licenze c''è un cartello, «Torno subito». Al bar di Publican ti aspetta Retrograde, che dice di venire dal futuro e lascia pagare te: «Io l''ho già visto finire, e finisce col botto. Stavolta la porta del tempio aprila tu.»')
) as v(chapter, intro, outro)
where c.chapter = v.chapter;

update public.story_missions m set intro = v.intro
from (values
  ('C2M1', 'Una scossa ferma l''ultima corsa della notte in galleria, con i passeggeri chiusi nei vagoni. Le nuove reclute dei Figli li stanno ripulendo, e Patina, la muffa viva dei tunnel, sbarra l''uscita.'),
  ('C2M3', 'Longwave, radioamatrice delle Fosse, ascolta il sismografo da una cantina sopra la linea. I Figli vogliono la sua radio, Lullaby con le buone e Credo con le cattive: senza, nessuno saprà dove arriva la prossima scossa.')
) as v(code, intro)
where m.code = v.code;
