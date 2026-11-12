# WORLD — La bibbia di O-MEGA

*Documento narrativo v0.1. Tutto è una proposta finché non entra nel catalogo. Le regole del gioco restano in `docs/SPEC.md`: questo file le spiega nella storia, non le cambia.*

---

## 1. In una riga

Nuova Megara è una megalopoli costruita sulle rovine della Magna Grecia. Dall'Ora Zero la città ha i superumani e le emergenze che loro stessi causano, e i Reggenti si contendono gli Echi per risolverle.

## 2. Il mondo

**Nuova Megara.** Città portuale in un'Italia alternativa: gru e container accanto ai templi greci, metropolitane che attraversano necropoli, quartieri alti che guardano il vulcano.

**L'Ora Zero.** Sotto la città si scava un tempio oracolare; accanto si costruisce una centrale sperimentale. Quando i due cantieri si toccano, avviene l'evento che cambia tutto. Da quel momento alcune persone portano un **Segno**.

**Il nome.** O-MEGA nasce come scritta sui muri: "O" è l'Ora Zero, "MEGA" è Megara con le ultime lettere cancellate.

**L'Alfabeto.** Negli scavi affiorano pietre incise con le lettere greche. Ognuna corrisponde a un tipo di Segno. Nessuno sa quante siano davvero sepolte, né cosa succeda quando l'alfabeto è completo.

**Il grande conflitto.** Energia, Magia e Psiche potrebbero essere la stessa forza letta in tre modi. Scienziati, mistici e psichici si combattono su chi abbia ragione. Chi non ha il Segno compensa con il **Mestiere**: addestramento, tecnologia, astuzia.

**Il tono.** Avventura ironica e molto italiana, con il cuore nei quartieri e non nello spazio. Riferimenti: *PK*, *Lo chiamavano Jeeg Robot*. I superpoteri non risolvono le bollette.

## 3. Le regole dentro la storia

| Regola (SPEC) | Spiegazione nel mondo |
|---|---|
| Carta personaggio | Un'**Eco**: l'impronta di un superumano fissata su una lastra, non la persona |
| Giocatore | Un **Reggente**, autorizzato dal Comune a usare gli Echi nelle emergenze |
| Eroi e cattivi nella stessa squadra | Gli Echi obbediscono a chi li possiede, non alla loro morale |
| Tante copie dello stesso personaggio | Una persona lascia molti Echi |
| Niente doppioni in squadra | Due Echi della stessa persona si annullano |
| Ogni personaggio gioca una volta | Un'Eco regge una sola prova, poi si spegne fino alla partita dopo |
| Squadre segrete | Le lastre restano coperte finché l'Eco non entra in campo |
| Solo i livelli delle Minacce sono noti | Il **sismografo** misura la forza di un evento, non la sua natura |
| Due giocatori sulla stessa Minaccia | Il Comune manda due Reggenti: chi risolve l'emergenza viene pagato |
| Conquista | **Diritto di Presa**: chi vince prende una lastra schierata dal rivale |
| Si rischia solo ciò che è in campo | Il Diritto di Presa vale solo per le lastre scoperte |
| Limite di rarità | Una lastra troppo rara brucia chi non ne ha già una in squadra |
| Starter set | Lastre legate al Reggente, che nessuno può prendere |
| Blocco di 48 ore | Una lastra conquistata deve "raffreddarsi" |
| Pacchetto giornaliero | A mezzanotte suona il **Rintocco** e arrivano nuovi Echi |
| Conversione dei doppioni | Il Banco fonde le lastre e paga in monete |
| Nuove rarità | Ogni espansione è una nuova lettera ritrovata negli scavi |

### Rarità

**La rarità indica potenza** (SPEC §4.3): più una carta è rara, più punti ha in totale (Delta 54, Gamma 55, Beta 57, Alfa 58, Omega 61). Omega significa anche "più deformato dal potere": i profili sono più estremi e ogni dono ha un prezzo, visibile nelle statistiche. **Regola da non violare mai:** i valori 0 e 1 sono il prezzo del personaggio e non crescono con la rarità; i punti in più vanno ai suoi doni.

| Rarità | Nella storia |
|---|---|
| Delta | Gente comune con un Segno o un mestiere: se ne incontrano ogni giorno |
| Gamma | Professionisti riconosciuti nel loro quartiere |
| Beta | Figure note in tutta la città |
| Alfa | Leggende vive, vicine all'origine dell'evento |
| Omega | Casi unici: quello che resta di chi l'Ora Zero ha cambiato del tutto |

## 4. Fazioni

Le tre fazioni del catalogo restano `heroes`, `villains`, `neutrals`. Ogni personaggio appartiene anche a uno dei sei gruppi interni, salvato come tratto Gruppo nella scheda del personaggio (SPEC §4.7): chi non aveva un gruppo, come buona parte delle carte da P061 in poi, ne ha ricevuto uno coerente con la sua storia. Un personaggio può essere schierato con una fazione diversa da quella del suo gruppo, come gli Sciolti schierati con i Cattivi.

- **Eroi**
  - **I Custodi:** guardia civica, onesta e senza fondi.
  - **Le Lanterne:** volontari dei quartieri poveri, senza divisa né permessi.
- **Cattivi**
  - **La Compagnia Lete:** ha privatizzato l'energia dell'Ora Zero e vende la soluzione ai problemi che crea.
  - **I Figli dell'Ultima:** vogliono che l'Ora Zero arrivi alla sua ultima ora, convinti che restituirà chi si è presa (vedi `docs/STORY.md` §2).
- **Neutrali**
  - **Il Banco:** gestisce licenze, sfide e Diritto di Presa. Vince sempre.
  - **Gli Sciolti:** contrabbandieri, mercenari e chiunque abbia smesso di scegliere.

## 5. Personaggi

### Metodo

Le 60 carte hanno già valori bilanciati. **Si parte dalle statistiche**: si leggono i valori e si inventa il personaggio che li spiega. Zeri e uno sono la parte più interessante. Cambiano solo nome, testo di colore e immagine, mai i valori.

### Scheda

```text
Codice carta:
Nome di battaglia:
Vero nome:
Fazione e gruppo:
Cosa vuole:
Di cosa ha paura:
Il dono:
Il prezzo (i valori più bassi):
Un alleato / un nemico:
Testo di colore (una frase):
```

### Regole di scrittura

- Nomi in codice, nello stile del compendio *THE FRACTURE* (`THE_FRACTURE_Compendio_v4.1.xlsx`): una sola parola inglese o latina, come un nome di battaglia (Nightward, Gridwitch, Latchkey, Holdout). Il nome evoca il personaggio senza descriverlo: niente "nome di persona + parola che dice cosa fa" (com'erano Marta Scudo o Tom Magnete) e niente "Il Qualcosa". Restano validi i nomi del mito e quelli inventati di una parola (Talos, Mongibello, Vetrix).
- Prima di inventare un nome si cerca nel compendio un personaggio con un ruolo simile: Dogwatch è un tecnico del turno di notte, Latchkey un ladro d'appartamento, Gazetteer una giornalista di pettegolezzi.
- Evitare i nomi già usati da personaggi famosi (per questo sono stati scartati Tallyman, Parallax, Solaris e Vector).
- Nomi brevi: nel formato piccolo della carta ci stanno circa 10 caratteri, oltre vengono tagliati.
- Testo di colore in una sola frase, come una battuta che faccia capire il personaggio.
- I 60 personaggi si dividono in 6-8 gruppi da 7-10, ognuno con un conflitto interno.
- Il Potere della carta deve avere senso per il personaggio: chi ha "Riscossa" torna dopo una sconfitta, chi ha "Sfavorito" dà il meglio quando è in svantaggio.

### Omega: il cast principale

| Carta | Valori chiave | Personaggio |
|---|---|---|
| P057, Neutrali | RES 10, VOL 10, COM 10, VEL 1, ENE 0 | **Holdout:** era al centro dell'Ora Zero e non può morire. Si muove a fatica e il suo potere è solo non cedere. |
| P058, Eroi | VEL 10, COM 10, TEC 10, PER 0, VOL 1 | **Absentia:** un'armatura perfetta che protegge la città. Dentro non c'è nessuno. |
| P059, Cattivi | PSI 10, PER 10, FUR 10, VOL 0 | **Multitude:** legge ogni mente e non ha volontà propria. Obbedisce all'ultima che ha ascoltato. |
| P060, Eroi | FOR 10, ENE 10, MAG 10, TEC 0, COM 1 | **Mongibello:** contiene un vulcano. Non sa combattere e non sa usare un telefono. |

### Alfa: le leggende

| Carta | Valori chiave | Potere | Personaggio |
|---|---|---|---|
| P051, Cattivi | VEL 10, COM 10, FOR 10, RES 1, VOL 1 | Riscossa | **Vetrix** (Compagnia Lete): il combattente più veloce della città, con ossa di vetro. Quando si rompe, i frammenti colpiscono il prossimo bersaglio. |
| P052, Neutrali | ENE 10, TEC 10, INT 10, VOL 1, MAG 1 | Sabotatore | **Auctor** (Sciolti): ha progettato la centrale e vende il proprio genio a chiunque paghi. |
| P053, Eroi | FUR 10, INT 10, VEL 10, COM 1, VOL 1 | Riscossa | **Moth** (Lanterne): nessuno riesce a vederla. Scappa sempre, poi torna sempre. |
| P054, Cattivi | VOL 10, PER 10, COM 10, TEC 1, MAG 1 | Sfavorito | **Vera Kross** (Figli dell'Ultima): trova chiunque e non si ferma mai, soprattutto quando sta perdendo. |
| P055, Eroi | RES 10, VOL 10, MAG 10, VEL 1, INT 1 | Riscossa | **Keelstone** (Custodi): sta davanti alla porta del tempio. Da lì non passa nessuno, e da lì non si sposta. |
| P056, Cattivi | ENE 10, MAG 10, TEC 10, RES 1, VOL 1 | Sabotatore | **Mekana** (Compagnia Lete): costruisce macchine che funzionano a incantesimi, e ormai è più macchina che persona. |

### Beta: figure note in città

| Carta | Valori chiave | Potere | Personaggio |
|---|---|---|---|
| P041, Cattivi | RES 10, COM 10, PER 1 | Ultimo baluardo | **Gavel** (Compagnia Lete): esattore che incassa ogni colpo e ci vede pochissimo. |
| P042, Neutrali | VEL 8, COM 8, INT 1 | Apripista | **Postmark** (Sciolti): corriere su moto elettrica truccata. |
| P043, Eroi | PSI 10, PER 10, INT 1 | Terreno favorevole | **Fathom** (Lanterne): sente i pensieri, ma non sempre li capisce. |
| P044, Cattivi | ENE 8, MAG 8, INT 1 | Nemesi | **Kiln** (Figli dell'Ultima): piromane. |
| P045, Eroi | FOR 10, RES 10, INT 1 | Legame | **Apostate** (Custodi): ex campione di lotta. |
| P046, Cattivi | VEL 10, FUR 10, RES 1 | Legame | **Larceny** (Sciolti, schierata con i Cattivi): la ladra più rapida di Nuova Megara. |
| P047, Neutrali | INT 8, TEC 8, ENE 1 | Spia | **Actuary** (Banco): analista. |
| P048, Eroi | MAG 10, PSI 10, PER 1 | Terreno favorevole | **Hapax** (Lanterne): mago di strada quasi cieco. |
| P049, Cattivi | ENE 8, RES 8, FUR 1 | Schermato | **Blackbody** (Compagnia Lete): dirigente, è un reattore che cammina. |
| P050, Eroi | PSI 10, VOL 10, COM 1 | Terreno favorevole | **Parley** (Custodi): negoziatrice telepatica. |

### Gamma: professionisti di quartiere

Hanno il potere Specialità (+2 contro le Minacce che richiedono la prima abilità indicata), tranne: Milewright e Rubicon (Apripista), Bulwark (Ultimo baluardo), Aerie (Nemesi), Sordina (Spia), Ambit e Swarf (Legame), Malleus e Collateral (Implacabile). Tra le carte aggiunte dopo, Truss ha Implacabile, Novissima ed Effigy hanno Veggente. Dopo il secondo gruppo di poteri: Errata ha Nemesi, Dredge, Heirloom e Cursor hanno Tuttofare, Carillon ha Schermato.

| Carta | Valori chiave | Personaggio |
|---|---|---|
| P025, Eroi | RES 10, COM 8, FUR 1 | **Bulwark** (Custodi): agente con lo scudo antisommossa. |
| P026, Cattivi | VEL 8, TEC 6, RES 2 | **Rubicon** (Sciolti, schierato con i Cattivi): capo di una gang di motociclisti. |
| P027, Neutrali | PSI 10, PER 8, INT 1 | **Vulgate** (Sciolti): medium che vende segreti senza capirli. |
| P028, Eroi | ENE 8, MAG 6, VEL 2 | **Juncture** (Lanterne): elettricista, ripara i cavi a mani nude. |
| P029, Cattivi | FOR 10, RES 8, INT 1 | **Malleus** (Compagnia Lete): picchiatore. |
| P030, Eroi | VEL 8, PER 6, MAG 2 | **Milewright** (Lanterne): staffetta che corre sui tetti. |
| P031, Cattivi | INT 10, TEC 8, FUR 1 | **Byline** (Compagnia Lete): hacker vanitosa. |
| P032, Neutrali | MAG 8, PSI 6, COM 2 | **Escrow** (Sciolti): rigattiera di maledizioni. |
| P033, Eroi | ENE 10, RES 8, COM 1 | **Cathode** (Lanterne): ex operaio della centrale, gigante gentile. |
| P034, Cattivi | PSI 8, INT 6, COM 2 | **Lullaby** (Figli dell'Ultima): ipnotizzatore e reclutatore. |
| P035, Eroi | COM 10, VEL 8, VOL 2 | **Ambit** (Lanterne): lottatore di strada, testa calda. |
| P036, Cattivi | TEC 8, ENE 6, FUR 2 | **Swarf** (Compagnia Lete): costruttore di robot. |
| P037, Neutrali | FUR 10, INT 8, VOL 2 | **Sordina** (Sciolti): spia su commissione. |
| P038, Eroi | PER 8, COM 6, FOR 2 | **Nightward** (Custodi): investigatrice. |
| P039, Cattivi | VOL 10, RES 8, PSI 1 | **Credo** (Figli dell'Ultima): fanatico. |
| P040, Eroi | MAG 8, TEC 6, VEL 2 | **Gridwitch** (Lanterne): tecnomaga. |

### Delta: la gente della città

I Delta non hanno poteri.

| Carta | Valori chiave | Personaggio |
|---|---|---|
| P001, Eroi | FOR 10, RES 9, COM 9, MAG 0, PSI 1 | **Gantry** (Sciolti di porto, schierati con gli Eroi): solleva container a spalla, con un sorriso. |
| P002, Cattivi | VEL 10, FUR 9, MAG 0 | **Foundling** (Sciolti, schierato con i Cattivi): scippatore adulto con la faccia da ragazzino. |
| P003, Eroi | INT 10, PER 9, FOR 0 | **Kelvin** (Lanterne): inventore geniale e gracile. |
| P004, Neutrali | MAG 10, PSI 9, VOL 9, FOR 0, TEC 1 | **Wardmother** (Sciolti): legge il futuro al mercato e non riesce a sollevare la propria borsa. |
| P005, Cattivi | ENE 10, FOR 9, FUR 0 | **Pyrrhic** (Compagnia Lete): bomba umana. |
| P006, Neutrali | PSI 10, VOL 9, FOR 0 | **Ephemeris** (Sciolti): veggente fragile, ispirata a Cassandra. |
| P007, Eroi | COM 8, TEC 7, PSI 1 | **Macadam** (Custodi): autista e meccanico. |
| P008, Cattivi | FUR 8, INT 7, FOR 1 | **Understudy** (Compagnia Lete): infiltrata. |
| P009, Eroi | Generalista: FOR 6, VOL 6, gli altri da 3 a 5 | **Dogwatch** (Custodi): nessun Segno, solo tanta pazienza. |
| P010, Neutrali | TEC 6, VEL 6, MAG 3 | **Ferryman** (Sciolti): contrabbandiere del porto. |
| P011, Cattivi | ENE 6, MAG 6, FUR 3 | **Epigone** (Figli dell'Ultima): nuovo adepto. |
| P012, Eroi | Generalista: COM 6, PER 6, gli altri da 3 a 5 | **Vigil** (Lanterne): la volontaria che arriva quando manca la luce. |
| P013, Eroi | FOR 10, RES 9, VEL 0 | **Hawser** (Custodi): colosso del porto con tatuaggi magici, sempre fermo. |
| P014, Cattivi | VEL 6, FUR 6, PSI 3 | **Lacuna** (Compagnia Lete): uomo qualunque, nessuno se lo ricorda. |
| P015, Eroi | INT 8, TEC 7, RES 1 | **Suture** (Lanterne): dottoressa di salute fragile. |
| P016, Cattivi | MAG 10, VOL 9, FUR 0 | **Belladonna** (Figli dell'Ultima): strega annunciata dalle campane. |
| P017, Neutrali | ENE 6, RES 6, VOL 3 | **Publican** (Sciolti): barista, il suo locale è terreno neutrale. |
| P018, Eroi | PSI 8, VOL 7, COM 1 | **Hornbook** (Lanterne): maestro di scuola telepate. |
| P019, Cattivi | COM 10, FOR 9, RES 0 | **Cullet** (Compagnia Lete): pugile imbattibile con la mascella di vetro. |
| P020, Eroi | ENE 6, TEC 6, COM 3 | **Longwave** (Lanterne): radioamatrice. |
| P021, Cattivi | FUR 8, VEL 7, TEC 1 | **Latchkey** (Sciolti, schierato con i Cattivi): scassinatore all'antica. |
| P022, Neutrali | PER 10, VOL 9, FUR 0 | **Warrant** (Sciolti): cacciatore di taglie. |
| P023, Eroi | RES 6, VOL 6, PSI 3 | **Ignifuge** (Custodi): pompiere. |
| P024, Cattivi | MAG 8, ENE 7, INT 1 | **Typo** (Compagnia Lete): apprendista pasticcione. |

### La nuova ondata: 20 personaggi più in costume

Da P061 a P080. Stesse proporzioni di rarità, stessi totali di valori e stessi tipi di Potere delle prime 60 carte. I disegni sono più da fumetto di supereroi: costumi, mantelli e poteri in azione. I Delta sono esordienti in costume fatto in casa.

| Carta | Rarità e fazione | Personaggio | Sblocco |
|---|---|---|---|
| P061 | Delta, Eroi | **Nadir:** ali di lamiera, vola finché regge la saldatura. | Livello 3 |
| P062 | Delta, Eroi | **Headway:** zaino fatto di estintori, sa partire ma non fermarsi. | |
| P063 | Delta, Eroi | **Azimuth:** attira il metallo, comprese le chiavi di tutti. | |
| P064 | Delta, Eroi | **Tether:** si allunga e ci mette molto a tornare. | |
| P065 | Delta, Cattivi | **Quicklime:** scioglie tutto, anche i propri guanti. | |
| P066 | Delta, Cattivi | **Falx:** lame fatte in casa, si taglia spesso. | |
| P067 | Delta, Cattivi | **Odonate:** comanda vespe meccaniche e ne ha paura. | |
| P068 | Delta, Neutrali | **Nimbus:** diventa nebbia e non sa dove si ricompone. | Livello 5 |
| P069 | Gamma, Eroi | **Noctiluca:** luce accecante, di giorno vale poco. | |
| P070 | Gamma, Eroi | **Aerie:** ali retrattili, vista perfetta da lontano e pessima da vicino. | |
| P071 | Gamma, Cattivi | **Cineris:** brucia ciò che tocca, comprese le proprie mani. | |
| P072 | Gamma, Cattivi | **Tacet:** voce ipnotica, ogni parola le costa. | |
| P073 | Gamma, Neutrali | **Collateral:** cacciatore di taglie col braccio cromato, in debito con il Banco. | |
| P074 | Beta, Eroi | **Tempestas:** comanda il vento e non riesce a stare fermo. | Livello 7 |
| P075 | Beta, Eroi | **Truss:** esoscheletro fortissimo, dipende dalle batterie. | |
| P076 | Beta, Cattivi | **Errata:** una macchina che piega il caso, i suoi piani saltano sempre. | |
| P077 | Beta, Cattivi | **Dredge:** tentacoli d'acciaio, lentissimo fuori dall'acqua. | |
| P078 | Alfa, Eroi | **Novissima:** la forza di una stella, che la consuma. | Livello 10 |
| P079 | Alfa, Cattivi | **Effigy:** pietrifica con lo sguardo, e la pietra sale anche su di lei. | |
| P080 | Omega, Cattivi | **Re Tifeo:** gigante del mito sepolto sotto il vulcano, non può lasciare la sua prigione. | |

Regola nuova: le carte con un livello di sblocco non escono dai pacchetti né dallo starter set. Ogni giocatore ne riceve una copia al livello indicato, legata all'account come una starter: non si conquista e non si converte in monete.

### Robot, mostri e mutanti

Da P081 a P092: chi non è più del tutto una persona, o non lo è mai stato. L'Ora Zero ha svegliato quello che dormiva negli scavi (Talos, Polifemo, Cerbero, Cariddi), ha dato coscienza alle macchine e ha cambiato il corpo di chi era vicino. Stessi totali di valori e stessi tipi di Potere del resto del catalogo. Si trovano tutti nei pacchetti.

| Carta | Rarità e fazione | Personaggio | Il difetto nei valori |
|---|---|---|---|
| P081 | Delta, Neutrali | **Derelict:** robot assemblato con gli scarti del porto, cerca lavoro. | VEL 1, MAG 0 |
| P082 | Delta, Neutrali | **Abeyance:** robot contabile del Banco, non trova mai il tuo pagamento. | PER 0 |
| P083 | Delta, Eroi | **Cicatrix:** mutante mezzo geco, la coda gli ricresce. | TEC 1 |
| P084 | Delta, Cattivi | **Patina:** creatura di muffa viva cresciuta nella metro, dei Figli dell'Ultima. | VEL 0, FOR 1 |
| P085 | Gamma, Eroi | **Heirloom:** vecchio robot domestico, ha cresciuto mezzo quartiere con le Lanterne. | COM 1, FUR 1 |
| P086 | Gamma, Eroi | **Precinct:** vigile dei Custodi, licantropo con la luna piena. | INT 1 |
| P087 | Gamma, Neutrali | **Cerbero:** cane a tre teste delle necropoli sotto la metro. | INT 1, TEC 1 |
| P088 | Gamma, Cattivi | **Gazetteer:** arpia di quartiere, sa tutto di tutti. | FOR 1, TEC 1 |
| P089 | Beta, Cattivi | **Polifemo:** gigante con un occhio solo, scaricatore per la Compagnia Lete. | PER 1 |
| P090 | Beta, Cattivi | **Lamprey:** vampiro e dirigente della Compagnia Lete. | RES 0 |
| P091 | Alfa, Eroi | **Talos:** automa di bronzo trovato negli scavi, un solo punto debole. | RES 1, VEL 1 |
| P092 | Omega, Neutrali | **Cariddi:** vortice con i denti nel porto, quello che l'Ora Zero ha fatto del mare. | INT 0, VEL 1 |

### Alieni, macchine e gente del futuro

Da P093 a P104: l'Ora Zero non ha aperto solo gli scavi. Dallo strappo arriva chi viene da lontano (Glip, Huckster, Zeta Rax, Regina Ix) e chi viene da dopo (Retrograde, Aion). Le macchine di Nuova Megara, intanto, hanno iniziato a farsi un'idea propria. Il tono resta quello dei quartieri: anche gli alieni devono fare la fila. Stessi totali di valori e stessi tipi di Potere del resto del catalogo. Si trovano tutti nei pacchetti.

| Carta | Rarità e fazione | Personaggio | Il difetto nei valori |
|---|---|---|---|
| P093 | Delta, Neutrali | **Glip:** piccolo alieno turista, ha sbagliato pianeta. | FOR 0, RES 1 |
| P094 | Delta, Eroi | **Censor:** robot dei Custodi, multa chiunque. | MAG 0, PSI 0 |
| P095 | Delta, Eroi | **Raster:** esordiente in costume, spara laser dagli occhi e ci vede poco. | PER 1 |
| P096 | Delta, Cattivi | **Huckster:** alieno gelatinoso, venditore porta a porta. | FOR 0, COM 1 |
| P097 | Gamma, Eroi | **Sextant:** astronauta tornata in armatura dopo l'Ora Zero. | FUR 0 |
| P098 | Gamma, Cattivi | **Facsimile:** androide della Compagnia Lete che ha preso il posto di un ingegnere. | PSI 0 |
| P099 | Gamma, Neutrali | **Zeta Rax:** cacciatrice di taglie aliena, non si ferma mai. | PSI 0, VOL 1 |
| P100 | Gamma, Eroi | **Retrograde:** anziano eroe arrivato dal futuro, con il jetpack. | FUR 0, FOR 1, VEL 1 |
| P101 | Beta, Eroi | **Carillon:** suora delle Lanterne, pilota un robot gigante fatto di impalcature e campane. | FUR 0, VEL 1 |
| P102 | Beta, Cattivi | **Regina Ix:** imperatrice aliena a quattro braccia, bloccata dalla burocrazia. | FUR 0 |
| P103 | Alfa, Neutrali | **Sibilla:** intelligenza artificiale cresciuta nel tempio oracolare, vede cosa succederà. | FOR 0, VEL 0 |
| P104 | Omega, Cattivi | **Aion:** quello che resta del tempo dopo la fine, arrivato dallo strappo. | FOR 0 |

### Dal compendio

Da P105 a P114: dieci schede prese dal compendio *THE FRACTURE* (`THE_FRACTURE_Compendio_v4.1.xlsx`) e portate a Nuova Megara. Dal compendio vengono nome in codice, aspetto, colori, potere e frase, che diventa il testo di colore. Le dodici statistiche del compendio sono riportate in scala sui valori della carta: Tenuta Mentale diventa Volontà, Controllo diventa Percezione, Agilità diventa Furtività e la Potenza Anomala va a Energia, Magia o Psiche secondo il tipo di potere. Il livello di potere del compendio decide la rarità (Ω-I Delta, Ω-II Gamma, Ω-III Beta, Ω-IV Alfa, Ω-V Omega). Nel compendio molti vengono da altre Terre: qui sono arrivati dallo strappo dell'Ora Zero. Si trovano tutti nei pacchetti.

| Carta | Scheda | Rarità e fazione | Personaggio | Il difetto nei valori |
|---|---|---|---|---|
| P105 | TF-256 | Delta, Eroi | **Maroon:** tecnico alieno lasciato indietro dalla sua flotta, ripara qualunque macchina toccandola. | MAG 0 |
| P106 | TF-066 | Delta, Neutrali | **Futures:** esattore del porto ed ex pugile, per novanta secondi ha di nuovo ventidue anni. | MAG 0, PSI 0 |
| P107 | TF-657 | Delta, Cattivi | **Procura:** gestore di un motel, imita voce e firma di chi ascolta abbastanza a lungo. | MAG 0 |
| P108 | TF-057 | Gamma, Cattivi | **Semaphore:** dirigente della Compagnia Lete, i suoi specchi ti fanno credere tue le sue idee. | FOR 1, MAG 1 |
| P109 | TF-447 | Gamma, Eroi | **Parallasse:** ufficiale scientifico alieno, prende su di sé la paura degli altri e la sente il giorno dopo. | FOR 1, COM 1 |
| P110 | TF-141 | Gamma, Neutrali | **Cursor:** atleta e corriera, sulle linee antiche della città corre più veloce di un treno. | PSI 0 |
| P111 | TF-054 | Beta, Cattivi | **Antiphon:** eresiarca dei Figli dell'Ultima, ripete al contrario le formule e le ritorce contro chi le ha dette. | ENE 0, FOR 1 |
| P112 | TF-293 | Beta, Eroi | **Plinth:** colonna vivente più antica della città, regge i crolli finché i soccorsi finiscono. | TEC 0, VEL 1 |
| P113 | TF-353 | Alfa, Neutrali | **Harrow:** mietitrebbia senza guidatore venerata come un dio dei campi fuori città. | FUR 0, VEL 1 |
| P114 | TF-387 | Omega, Eroi | **Perpetuum:** regge da solo il campo magnetico sotto la centrale, seduto sul suo trono di rame. | VEL 0, FUR 0 |

### Per i nuovi poteri

Da P115 a P122: otto personaggi creati per i quattro poteri nuovi, due per potere, senza togliere il potere alle carte che già ce l'hanno. Il potere sceglie la rarità (Annullatore e Crescendo semplici su Gamma e Beta, Slancio distintivo su Alfa) e il personaggio nasce dal potere: chi annulla è un burocrate, chi batte i giganti è piccolo, chi cresce paga ogni gradino. I nomi in codice vengono dal compendio *THE FRACTURE* quando c'era un ruolo simile (Codicil, Attainder, Subsong, Lure, Xenolith, Katabatic); Gradus e Impetus sono nuovi. Si trovano tutti nei pacchetti.

| Carta | Rarità e fazione | Potere | Personaggio | Il difetto nei valori |
|---|---|---|---|---|
| P115 | Beta, Eroi | Annullatore | **Codicil** (Custodi): archivista del Comune, aggiunge una clausola a quello che sta succedendo e lo fa finire. | FOR 1 |
| P116 | Beta, Cattivi | Annullatore | **Attainder** (Compagnia Lete): esecutore dei decreti, chi viene nominato perde il nome e quello che sapeva fare. | FUR 1 |
| P117 | Gamma, Eroi | Davide | **Subsong** (Lanterne): traduttrice dei richiami dei colossi, mente ai giganti con gli infrasuoni. | FOR 0, MAG 1, COM 1, TEC 1 |
| P118 | Gamma, Neutrali | Davide | **Lure** (Sciolti): esca vivente pagata per farsi inseguire dai colossi lontano dalla città. | PSI 0, MAG 1, TEC 1 |
| P119 | Gamma, Neutrali | Crescendo | **Gradus** (Banco): facchino che porta i clienti su per gli undici piani del Banco; ogni rampa gli costa un ricordo. | MAG 1 |
| P120 | Beta, Neutrali | Crescendo | **Xenolith** (Sciolti): cavatore con una pietra degli scavi nel petto, che cresce a ogni uso. | FUR 1 |
| P121 | Alfa, Eroi | Slancio | **Impetus** (Custodi): parte piano, ma dopo la prima vittoria non si ferma più. | MAG 0, PSI 0, INT 1, TEC 1 |
| P122 | Alfa, Cattivi | Slancio | **Katabatic** (Compagnia Lete): il vento che scende dal vulcano, venduto alla città come servizio climatico. | TEC 0, FUR 0, PSI 1, COM 1 |

### Dagli spunti

Da P123 a P132: dieci personaggi nati da immagini raccolte dall'utente (cartella `immagini varie`, copie rinominate con il nome della carta in `immagini varie/immagini utilizzate`). Le immagini sono servite solo come spunto per forma, sagoma e colori: i disegni sono nuovi, nello stile base, e niente ricorda personaggi esistenti (Impound, per esempio, ha perso i baffi e la tuta rossa che ricordavano un idraulico famoso). Sono personaggi di quartiere molto italiani: il carrozziere contro la doppia fila, il treno che arriva tardi, la statua che legge gli avvisi del Comune, il gatto nero. Poteri esistenti con i parametri già in uso; il nome in codice di Gauger viene dal compendio, dove è un doganiere. Si trovano tutti nei pacchetti.

| Carta | Rarità e fazione | Potere | Personaggio | Il difetto nei valori |
|---|---|---|---|---|
| P123 | Delta, Neutrali | | **Busker** (Sciolti): alieno arrivato dallo strappo, suona il mandolino ai semafori e calma la folla. Sa una canzone sola. | FOR 0, COM 0, TEC 1 |
| P124 | Delta, Eroi | | **Impound** (Lanterne): carrozziere che sfonda le auto in doppia fila davanti agli ospedali, poi le ripara nella sua officina. | INT 1, MAG 0, PSI 0 |
| P125 | Delta, Cattivi | | **Lagan** (Sciolti): bestia del porto con la pelle incrostata di tutto quello che cade in acqua. | VEL 1, PSI 1, TEC 0 |
| P126 | Gamma, Eroi | Ultimo baluardo | **Overdue** (Lanterne): capotreno dell'ultimo treno a vapore della notte, arriva sempre tardi ma con tutto il treno. | FUR 0, MAG 1, PSI 1 |
| P127 | Gamma, Eroi | Legame | **Stentore** (Custodi): statua di piazza che legge ogni avviso del Comune con un megafono di bronzo, con i piedi ancora nel piedistallo. | VEL 0, FUR 0 |
| P128 | Gamma, Cattivi | Spia | **Bisque** (Compagnia Lete): automa di porcellana che serve il caffè nelle riunioni e riferisce tutto. | RES 0, FOR 1 |
| P129 | Beta, Eroi | Apripista | **Bubalus** (Sciolti): bufalo meccanico costruito per arare la Piana, carica chiunque la tocchi e non sa frenare. | INT 1, FUR 0, MAG 0, PSI 1 |
| P130 | Beta, Neutrali | Annullatore | **Gauger** (Banco): doganiera aliena dello strappo, il suo timbro spegne i poteri alla frontiera; è incatenata alla scrivania. | FOR 1, VEL 1, FUR 0 |
| P131 | Alfa, Neutrali | Sabotatore | **Mischance** (Sciolti): il gatto nero che la notte dell'Ora Zero attraversò la strada agli ingegneri; a chi gli sta davanti va storto un po' tutto. | FOR 1, ENE 1, COM 1, TEC 0 |
| P132 | Omega, Cattivi | Riscossa | **Wirepuller** (Figli dell'Ultima): vecchio puparo che muove le persone come pupi con fili di luce; le sue mani sono diventate di legno. | FOR 0, COM 0, RES 1 |

### Dal compendio, secondo gruppo

Da P133 a P142: altre dieci schede del compendio *THE FRACTURE*, con lo stesso metodo di P105-P114 (valori in scala dalle dodici statistiche, rarità dal livello Ω, vero nome e frase dalla scheda; le frasi troppo lunghe per la carta sono accorciate). Il disegno segue il prompt per l'illustrazione della scheda (foglio CARTE): figura, luce, palette e i dettagli da leggere a misura di carta restano quelli del compendio; lo stile diventa quello base, le ambientazioni di Vesper diventano Nuova Megara e l'inquadratura tiene sempre il volto in alto. Scartate Glebe (la scheda descrive una bambina) e Numen (troppo vicino a Re Tifeo). Poteri esistenti con i parametri già in uso. Si trovano tutti nei pacchetti.

| Carta | Scheda | Rarità e fazione | Potere | Personaggio | Il difetto nei valori |
|---|---|---|---|---|---|
| P133 | TF-207 | Delta, Eroi | | **Bascule** (Custodi): capoponti di 68 anni, l'unica che sa alzare a mano i ponti mobili del porto. | VEL 1, MAG 0, PSI 0 |
| P134 | TF-229 | Delta, Neutrali | | **Heading** (Sciolti): ingegnera di scavo della metropolitana, tocca la roccia e sa dove la galleria regge. | COM 1, MAG 0, PSI 0 |
| P135 | TF-163 | Delta, Cattivi | | **Hecatomb** (Figli dell'Ultima): conosce il tariffario dei tributi alle creature svegliate negli scavi. | ENE 0, PSI 1 |
| P136 | TF-140 | Gamma, Cattivi | Schermato | **Indemnity** (Compagnia Lete): assicura contro le maledizioni, ripartendole fra tutti gli assicurati. | COM 0, ENE 1, PSI 1 |
| P137 | TF-136 | Gamma, Eroi | Legame | **Collegium** (Lanterne): sindacalista dei portatori di rune, regge il carico di nove colleghi. | VEL 1, MAG 1, PSI 1 |
| P138 | TF-221 | Gamma, Neutrali | Specialità (PER) | **Dowser** (Sciolti): anziana con la bacchetta di ferro, trova il punto in cui qualcuno è sparito. | ENE 0, COM 1 |
| P139 | TF-237 | Beta, Cattivi | Implacabile | **Herma** (Banco, schierato con i Cattivi): cippo di confine vivente, esiste solo lungo i confini. | VEL 0, TEC 0, INT 1, FUR 1 |
| P140 | TF-303 | Beta, Eroi | Ultimo baluardo | **Vulnerary** (Lanterne): guaritore che prende su di sé il tempo di guarigione degli altri. | COM 1, ENE 1 |
| P141 | TF-393 | Alfa, Eroi | Riscossa | **Palladium** (Custodi): appeso nella Sala del Palladio regge lo scudo sulla città; quando cede, tocca al prossimo della famiglia. | VEL 0, TEC 0, FUR 1 |
| P142 | TF-382 | Omega, Neutrali | Sfavorito | **Parabellum** (Banco): arma di undici metri su zampe da mantide, chiusa nel caveau del Banco. | PER 0, PSI 0, FUR 0, VEL 1 |

### Dal compendio, terzo gruppo

Da P143 a P187: quarantacinque schede del compendio, con lo stesso metodo dei due gruppi precedenti (valori in scala dalle statistiche, rarità dal livello Ω, vero nome e frase dalla scheda, frasi accorciate per la carta, disegno dal prompt del foglio CARTE nello stile base e a Nuova Megara). Molti Delta sono persone senza Segno, di mestiere: nel compendio hanno statistiche simili, e la carta le riporta così. Ordito, Mordacchia e Ansa tengono il nome in codice italiano del compendio, perché le schede Ω-V con nome inglese erano fenomeni senza figura. Scartate Unwritten (un uomo senza volto con cappello e cappotto ricorda un personaggio esistente) e, per non avere troppi funzionari, Surrogate, Overtime, Floodline, Mulct e Misericord. Poteri esistenti con i parametri già in uso. Si trovano tutti nei pacchetti.

| Carta | Scheda | Rarità e fazione | Potere | Personaggio | Il difetto nei valori |
|---|---|---|---|---|---|
| P143 | TF-112 | Delta, Eroi |  | **Abdicant** (Lanterne): autista d'ambulanza, erede di supereroi che ha rinunciato al debutto. | PER 0, MAG 0, PSI 0, ENE 1 |
| P144 | TF-173 | Delta, Eroi |  | **Dosimeter** (Custodi): tecnica che entra ogni giorno nelle zone dello strappo. | ENE 0, PSI 0, COM 0, MAG 1 |
| P145 | TF-298 | Delta, Eroi |  | **Undercroft** (Lanterne): soccorritrice dei cunicoli sotto i palazzi nobili. | MAG 0, PSI 0, PER 1, ENE 1 |
| P146 | TF-286 | Delta, Eroi |  | **Ropework** (Custodi): squadra di soccorso legata in cordata. | ENE 0, PSI 0, MAG 1, COM 1 |
| P147 | TF-347 | Delta, Eroi |  | **Isonomy** (Lanterne): attivista col megafono per chi non ha il Segno. | MAG 0, ENE 1 |
| P148 | TF-300 | Delta, Eroi |  | **Ultravires** (Custodi): avvocata d'ufficio, distingue i ricordi riscritti. | MAG 0, PSI 0, ENE 1 |
| P149 | TF-070 | Delta, Neutrali |  | **Custos** (Banco): maggiordomo e archivista di una casata. | MAG 0, PSI 0, ENE 1 |
| P150 | TF-199 | Delta, Neutrali |  | **Blotter** (Sciolti): cronista di nera. | MAG 0, PSI 0, COM 0, ENE 1 |
| P151 | TF-245 | Delta, Neutrali |  | **Jurat** (Banco): ispettore di sinistri marittimi. | MAG 0, PSI 0, ENE 1, COM 1 |
| P152 | TF-355 | Delta, Neutrali |  | **Higgler** (Sciolti): ambulante che porta con sé l'aria di un altro mondo. | ENE 0, PSI 0, MAG 1, COM 1 |
| P153 | TF-190 | Delta, Neutrali |  | **Recusant** (Sciolti): agente dei recuperi con un archivio segreto. | ENE 0, PSI 0, MAG 1 |
| P154 | TF-161 | Delta, Neutrali |  | **Periplus** (Banco): cartografo di una costa che non sta ferma. | MAG 0, PSI 0, ENE 1, COM 1 |
| P155 | TF-175 | Delta, Cattivi |  | **Almoner** (Compagnia Lete): sovrintendente dei giardini che bevono il dolore. | MAG 0, PSI 0, ENE 1 |
| P156 | TF-440 | Delta, Cattivi |  | **Signatory** (Compagnia Lete): ammiraglia della flotta del porto, firma solo ciò che ha letto. | ENE 0, PSI 0, MAG 1 |
| P157 | TF-093 | Delta, Cattivi |  | **Hollowbone** (Sciolti, schierato con i Cattivi): cacciatore di colossi, ne vende le ossa. | PER 0, MAG 0, PSI 0, VEL 1, ENE 1 |
| P158 | TF-115 | Gamma, Cattivi | Nemesi | **Contumax** (Sciolti, schierato con i Cattivi): vecchio supercattivo diventato opinionista in TV. | FOR 1, VEL 1, MAG 1, PSI 1 |
| P159 | TF-078 | Gamma, Cattivi | Spia | **Erasure** (Compagnia Lete): conduttrice di Stato, riscrive i ricordi in diretta. | COM 0, ENE 1, MAG 1 |
| P160 | TF-166 | Gamma, Cattivi | Affinità (Potere) | **Theriarch** (Figli dell'Ultima): sacerdotessa del culto di un anfibio cieco. | ENE 1, PSI 1, COM 1, TEC 1 |
| P161 | TF-023 | Gamma, Cattivi | Crescendo | **Miliarium** (Figli dell'Ultima): profeta delle pietre miliari. | ENE 1, PSI 1, TEC 1 |
| P162 | TF-278 | Gamma, Eroi | Apripista | **Praecursor** (Custodi): soccorritrice che arriva prima dell'incidente. | FOR 0, COM 0, MAG 1, PSI 1 |
| P163 | TF-143 | Gamma, Eroi | Specialità (MAG) | **Refector** (Lanterne): restauratrice di incantesimi antichi. | VEL 0, COM 0, ENE 1, PSI 1 |
| P164 | TF-290 | Gamma, Eroi | Spia | **Subpoena** (Lanterne): documentarista che ricostruisce le scene. | COM 0, ENE 1, MAG 1, PSI 1 |
| P165 | TF-092 | Gamma, Eroi | Tuttofare | **Interpres** (Custodi): traduttrice fra persone e macchine. | ENE 1, MAG 1, COM 1 |
| P166 | TF-345 | Gamma, Neutrali | Legame | **Histrio** (Sciolti): attore che al cinema fa un eroe vero. | TEC 0, ENE 1, MAG 1 |
| P167 | TF-018 | Gamma, Neutrali | Specialità (INT) | **Necropsy** (Banco): medico legale delle anomalie. | COM 0, ENE 1, MAG 1 |
| P168 | TF-244 | Gamma, Neutrali | Specialità (VEL) | **Hireling** (Sciolti): portuale del turno di notte, il tempo le scorre più lento. | PER 0, MAG 1, PSI 1, COM 1 |
| P169 | TF-065 | Gamma, Neutrali | Schermato | **Tourniquet** (Sciolti): medico clandestino che prende su di sé il dolore. | MAG 1, PSI 1 |
| P170 | TF-177 | Gamma, Neutrali | Terreno favorevole | **Pentimento** (Banco): ritrattista del Comune che non sa dipingere male. | COM 0, VEL 1, ENE 1, PSI 1 |
| P171 | TF-251 | Beta, Eroi | Ultimo baluardo | **Leeward** (Lanterne): ormeggiatore del Molo Nove dalla pelle di basalto. | VEL 1, PSI 1, FUR 1 |
| P172 | TF-277 | Beta, Eroi | Apripista | **Portitor** (Custodi): soccorritore con una porta legata sulla schiena. | COM 0, PSI 1 |
| P173 | TF-288 | Beta, Eroi | Legame | **Sanctuary** (Lanterne): dà asilo agli anomali feriti. | COM 0, PSI 1 |
| P174 | TF-269 | Beta, Cattivi | Affinità (Mente) | **Noophage** (Figli dell'Ultima): predatore senza occhi che caccia le idee. | TEC 0, RES 1, MAG 1 |
| P175 | TF-097 | Beta, Cattivi | Implacabile | **Eudaemon** (Compagnia Lete): curatore della felicità pubblica. | MAG 1, COM 1 |
| P176 | TF-063 | Beta, Cattivi | Terreno favorevole | **Hospes** (Figli dell'Ultima): l'ospite che, invitato, diventa padrone di casa. | TEC 0, PSI 1 |
| P177 | TF-015 | Beta, Neutrali | Crescendo | **Holloway** (Sciolti): entità fatta di pendolari nella metro chiusa. | TEC 0, INT 1, PSI 1 |
| P178 | TF-034 | Beta, Neutrali | Specialità (TEC) | **Clepsydra** (Banco): automa a clessidra che ripara le rovine. | VEL 0, COM 0, PSI 1, FUR 1 |
| P179 | TF-227 | Beta, Neutrali | Annullatore | **Injunction** (Banco): ispettrice della Soprintendenza, blocca i cantieri. | COM 0, PSI 1 |
| P180 | TF-236 | Alfa, Cattivi | Veggente | **Groma** (Figli dell'Ultima): agrimensora sacra, rimette in vigore il catasto antico. | ENE 1, PSI 1, COM 1 |
| P181 | TF-394 | Alfa, Cattivi | Sabotatore | **Principal** (Banco, schierato con i Cattivi): il registro degli incantesimi che cammina e riscuote. | VEL 0, TEC 0, FUR 0, ENE 1, PSI 1 |
| P182 | TF-283 | Alfa, Eroi | Slancio | **Quarantine** (Custodi): chiuso in una sfera, impone la biologia del suo mondo. | MAG 1, PSI 1 |
| P183 | TF-370 | Alfa, Eroi | Riscossa | **Mainstay** (Custodi): colosso che protegge un paese di montagna. | TEC 0, ENE 1, PSI 1 |
| P184 | TF-030 | Alfa, Neutrali | Sfavorito | **Antecessor** (Sciolti): sovrano antico risvegliato negli scavi del tempio. | VEL 0, TEC 0, ENE 1, PSI 1, FUR 1 |
| P185 | TF-602 | Omega, Neutrali | Sfavorito | **Ordito** (Sciolti): la titolare della merceria, taglia ogni giorno un filo del telaio. | PSI 0, TEC 1 |
| P186 | TF-603 | Omega, Cattivi | Riscossa | **Mordacchia** (Figli dell'Ultima): bestia con un cuneo di ceramica tra le fauci, scioglie i patti. | PER 0, PSI 0, TEC 0, INT 1 |
| P187 | TF-604 | Omega, Neutrali | Sfavorito | **Ansa** (Banco): serpente che chiude il golfo tenendosi la coda. | PSI 0, TEC 0 |

### Dal compendio, quarto gruppo

Da P188 a P217: trenta schede del compendio, con lo stesso metodo dei gruppi precedenti. Escluse le schede che descrivono bambini o ragazzini, un eroe in posa con il petto a V e il mantello (ricordava un personaggio famoso) e un barista troppo simile a Publican. Penates entra come terza carta con Davide, Clementia come quinta con Sabotatore, Contromano come quarta con Veggente. Gli Omega usano effetti già esistenti: il glitch per Prosody, l'aura per Novenarium. Ogni personaggio ha anche una variante, in uno stile esistente con colori propri. Si trovano tutti nei pacchetti.

| Carta | Scheda | Rarità e fazione | Potere | Personaggio | Il difetto nei valori |
|---|---|---|---|---|---|
| P188 | TF-032 | Delta, Eroi |  | **Strata** (Custodi): archeologo degli scavi della metro, riconosce l'età delle pietre con la lingua. | MAG 0, PSI 0, ENE 1 |
| P189 | TF-217 | Delta, Eroi |  | **Febrifuge** (Lanterne): medico della febbre dello strappo. | MAG 0, PSI 0, COM 0, FOR 1, ENE 1 |
| P190 | TF-282 | Delta, Eroi |  | **Signifer** (Custodi): vecchio istruttore delle squadre di soccorso. | MAG 0, PSI 0, VEL 1, ENE 1 |
| P191 | TF-646 | Delta, Eroi |  | **Diaria** (Custodi): caposquadra che conta i passi di tutti. | MAG 0, PSI 0, ENE 1 |
| P192 | TF-223 | Delta, Neutrali |  | **Depositum** (Banco): custode del deposito delle cose indistruttibili. | VEL 0, MAG 0, PSI 0, FUR 0, ENE 1, COM 1 |
| P193 | TF-690 | Delta, Neutrali |  | **Portineria** (Banco): portinaia di un palazzo dove vale la tregua. | MAG 0, ENE 1, PSI 1 |
| P194 | TF-480 | Delta, Neutrali |  | **Tariffario** (Sciolti): libera le case dalle presenze in quattro ore. | MAG 0, PSI 0, ENE 1, COM 1 |
| P195 | TF-500 | Delta, Cattivi |  | **Sottovento** (Sciolti, schierato con i Cattivi): cacciatore di cacciatori. | MAG 0, PSI 0, TEC 0, ENE 1 |
| P196 | TF-689 | Delta, Cattivi |  | **Onorario** (Compagnia Lete): arrotino e sicario su mandato scritto. | MAG 0, PSI 0, ENE 1, TEC 1 |
| P197 | TF-324 | Delta, Cattivi |  | **Ademption** (Compagnia Lete): impiegato anonimo che prende il posto degli altri leggendone le abitudini. | MAG 0, PSI 0, ENE 1 |
| P198 | TF-423 | Gamma, Eroi | Ultimo baluardo | **Wick** (Lanterne): accende la lanterna della scala e paga lei il prezzo dei poteri altrui. | COM 0, FOR 1, MAG 1, PSI 1, TEC 1 |
| P199 | TF-400 | Gamma, Eroi | Legame | **Sampler** (Lanterne): la sarta del primo costume da eroe. | VEL 0, COM 0, FOR 1, ENE 1, PSI 1 |
| P200 | TF-068 | Gamma, Eroi | Specialità (FOR) | **Scion** (Custodi): erede che indossa i cimeli di famiglia. | TEC 0, VOL 1, MAG 1, PSI 1 |
| P201 | TF-522 | Gamma, Cattivi | Specialità (PSI) | **Affissione** (Compagnia Lete): uomo-cartellone, affitta la pelle alla pubblicità. | ENE 1, MAG 1 |
| P202 | TF-525 | Gamma, Cattivi | Spia | **Custodia** (Compagnia Lete): edicola che custodisce i ricordi in deposito. | FOR 0, COM 0, FUR 0, ENE 1, MAG 1 |
| P203 | TF-254 | Gamma, Cattivi | Tuttofare | **Monopsony** (Compagnia Lete): mercante con un caveau nel petto, compra solo pezzi unici. | VEL 0, MAG 1, PSI 1, COM 1 |
| P204 | TF-017 | Gamma, Neutrali | Implacabile | **Deadweight** (Sciolti): contrabbandiera che toglie il peso alle cose. | VEL 1, MAG 1, PSI 1 |
| P205 | TF-198 | Gamma, Neutrali | Affinità (Corpo) | **Ballast** (Sciolti): traghettatore della darsena sommersa. | VEL 0, TEC 0, ENE 1, PSI 1 |
| P206 | TF-131 | Gamma, Neutrali | Davide | **Penates** (Lanterne): coppia di anziani che recita un quartiere abitato. | ENE 1, PSI 1, COM 1 |
| P207 | TF-299 | Beta, Eroi | Specialità (ENE) | **Tribune** (Lanterne): trasforma il proprio corpo in corrente. | VEL 1, PSI 1, FUR 1 |
| P208 | TF-310 | Beta, Eroi | Terreno favorevole | **Viaticum** (Lanterne): vecchio infermiere che custodisce ciò che resta delle persone. | PSI 1 |
| P209 | TF-332 | Beta, Cattivi | Nemesi | **Emendatio** (Figli dell'Ultima): doppione che la realtà cerca di cancellare come un refuso. | COM 0, PSI 1 |
| P210 | TF-102 | Beta, Cattivi | Apripista | **Tenant** (Figli dell'Ultima): tornato due volte dall'altra parte dello strappo. | PSI 1, TEC 1 |
| P211 | TF-360 | Beta, Neutrali | Ultimo baluardo | **Inhumer** (Sciolti): becchina che impedisce ai morti di tornare. | VEL 1, PSI 1, TEC 1 |
| P212 | TF-134 | Beta, Neutrali | Legame | **Warren** (Sciolti): branco di sessanta animali con una mente sola. | TEC 0, MAG 1, PSI 1 |
| P213 | TF-305 | Alfa, Eroi | Riscossa | **Unbidden** (Lanterne): intelligenza di quartiere con quaranta braccia meccaniche. | FOR 0, FUR 0, MAG 1, PSI 1, COM 1 |
| P214 | TF-185 | Alfa, Cattivi | Sabotatore | **Clementia** (Figli dell'Ultima): eroina fondatrice, intorno a lei ogni ostilità si spegne. | ENE 1, PSI 1 |
| P215 | TF-477 | Alfa, Neutrali | Veggente | **Contromano** (Sciolti): ricorda le prossime quarantun ore e dimentica il resto. | ENE 1, MAG 1 |
| P216 | TF-385 | Omega, Neutrali | Sfavorito | **Prosody** (Sciolti): fronte di bassorilievi che riscrive la materia. | PSI 0, VEL 1, TEC 1 |
| P217 | TF-381 | Omega, Cattivi | Riscossa | **Novenarium** (Figli dell'Ultima): i nove secondi dell'Ora Zero, che non sono mai finiti. | PSI 0 |

## 6. Minacce

Il nome deve far capire perché servono quelle abilità: "Robot impazzito" richiede Forza e Tecnologia. Molti nomi attuali funzionano già e vanno solo ambientati a Nuova Megara. Il testo di colore può usare il tono di un bollettino del sismografo.

| Livello | Portata | Esempio |
|---|---|---|
| 1-2 | Un vicolo, una persona | Rissa al porto |
| 3-4 | Un quartiere, un'istituzione | Rapina al treno blindato |
| 5-6 | Tutta la città | Invasione dimensionale |

### Oltre Nuova Megara

Il sismografo comincia a registrare scosse lontane: altre pietre dell'Alfabeto affiorano nel resto del mondo, e quello che dormiva accanto a loro si sveglia. Il Banco affitta i Reggenti all'estero, si tiene la provvigione e li fa viaggiare in economy. Nessuna cultura o religione reale fa da cattivo: le Minacce sono meccanismi e creature risvegliati dall'Ora Zero. Ogni luogo ha una regola che si spiega nella storia:

| Luogo | Regola | Perché |
|---|---|---|
| Giza | Silenzio della tomba | Nelle camere sepolte i Segni si spengono |
| Yucatán | Il conto lungo | Il calendario di pietra rimette in pari i conti |
| Atlantide | Abissi | Sott'acqua contano le forze antiche: Energia, Magia, Psiche |
| Artico | Gelo | Il freddo smussa ogni talento |
| Giappone | Duello | Uno contro uno: vince il colpo migliore |

Le regole e le Minacce sono in `docs/SPEC.md` §5.4.

### Le Minacce rare

Ogni tanto l'ago del sismografo esce dalla carta: il Comune chiama queste scosse **fuori scala** e le classifica per quanto sono rare, dalle Rare alle Uniche. Alcune hanno una regola tutta loro, spiegata nella storia: nella Sala degli specchi rotti ognuno combatte con la forza di chi ha davanti, nel Mondo capovolto vince chi fa meno, sotto Megara Due i deboli sono forti. La più temuta è **La Fine del Mondo**: la Montagna erutta, il cielo si spacca e l'Alfabeto gira sopra la città, e per fermarla serve tutto, tutte e dodici le abilità. I Reggenti tengono il conto di ciò che hanno affrontato nel **Bestiario**. Nomi e testi sono segnaposto; regole e probabilità in `docs/SPEC.md` §5.15.

### La Grande Minaccia

A volte il sismografo non segna una scossa, ma cinque nello stesso punto: qualcosa di grande sta premendo su Nuova Megara da più lati. Il Comune la chiama **Grande Minaccia** e la pubblica intera, perché non c'è tempo per i segreti: i cinque fronti e quanto paga ognuno, ora per ora, perché più si aspetta più il danno cresce. Due Reggenti ricevono l'incarico insieme e ognuno piazza un Eco alla volta su un fronte, dove resta di guardia fino alla fine. Il Comune paga ogni ora chi tiene ogni fronte: chi è da solo, o l'Eco più forte se ce ne sono due. Regole in `docs/SPEC.md` §5.12.

I sei Boss iniziali sono segnaposto, come tutti i testi: il Colosso del porto, la Signora dell'Eclissi, la Mente Madre, la Fortezza nel cielo, il Gigante sotto Megara e l'Ombra nella rete. Ognuno ha cinque fronti tra le Minacce di Nuova Megara che ne raccontano i lati (il Colosso: rissa al porto, robot impazzito, contrabbando, androidi, titano di metallo).

## 7. Sceneggiature

### Stagione 1: *Il Rintocco*

La trama, i capitoli e il cast ricorrente sono in `docs/STORY.md`. Ogni capitolo della modalità Storia ha il suo albo; i cinque albi previsti all'inizio sono confluiti lì:

1. **Il Reggente** e **Rissa al porto:** Capitolo 1, *Il porto*.
2. **Il sismografo:** Capitolo 2.
3. **Multitude:** Capitolo 4.
4. **Mongibello:** Capitolo 6, finale di stagione.

### Formato del copione

```text
PAGINA 1 (3 vignette)

VIGNETTA 1 — Campo largo. Nuova Megara di notte, gru del porto
contro le rovine greche illuminate.
DIDASCALIA: A mezzanotte la città trattiene il fiato.

VIGNETTA 2 — Primo piano. Un sismografo si impenna: LIVELLO 5.
SUONO: DONNN

VIGNETTA 3 — Una mano apre un pacchetto. Dentro, un'Eco che brilla.
RENATA (fuori campo): Non sai chi è. Non sai cosa dovrà affrontare.
RENATA (fuori campo): Però è tuo. Finché non lo perdi.
```

### Regole per gli albi

- Ogni pagina finisce con un motivo per girarla.
- Una vignetta porta una sola azione.
- Ogni albo presenta 2-3 carte, così chi legge vuole trovarle nei pacchetti.
- Al massimo 25 parole per vignetta, perché si legge da telefono.
- Gli albi accompagnano i capitoli della modalità Storia (SPEC §5.11) e non cambiano nessuna regola.

## 8. Guida di stile delle immagini

Da applicare a ogni illustrazione, così le carte sembrano dello stesso universo.

- **Riferimento:** l'immagine di **Multitude** (Higgsfield, job `0eed7ac1-e223-4cd6-bed5-e4c76f1e693b`) va passata come riferimento di stile a ogni generazione.
- **Stile:** locandina a fumetto dai toni cupi, inchiostro fitto, grana a retino, resa dipinta.
- **Palette:** fondo quasi nero, magenta e ciano come colori base, un solo accento caldo (giallo o arancio).
- **Inquadratura:** una sola figura, intera o a tre quarti, leggibile anche a schermo piccolo. La carta mostra soprattutto la parte alta dell'immagine: volto e dettaglio chiave devono stare nella metà superiore.
- **Formato:** verticale 3:4, modello `gpt_image_2_5`, qualità media, 1k.
- **Sfondo:** semplice, con un solo elemento di Nuova Megara (gru, colonne, vulcano, metropolitana).
- **Il prezzo si vede:** il difetto del personaggio deve stare nell'immagine (l'armatura vuota, le ossa di vetro).
- **Mai nell'immagine:** testo, loghi, cornici, personaggi o simboli di fumetti esistenti.

### Effetti delle carte

Gli effetti cambiano solo l'aspetto, mai valori o regole. L'abbinamento è in `src/lib/card-effects.ts`.

| Rarità | Carta grande | Carta piccola (album, elenchi) |
|---|---|---|
| Delta | Nessuno | Nessuno |
| Gamma | Lampo di luce | Nessuno |
| Beta | Lampo di luce, inclinazione 3D | Nessuno |
| Alfa | Olografico, inclinazione 3D | Olografico |
| Omega | Olografico, inclinazione 3D, effetto personale | Olografico |

Effetti personali Omega: Holdout l'aura, Absentia le scariche elettriche, Multitude il glitch, Mongibello le braci, Wirepuller i fili da puparo che pendono dall'alto e ogni tanto vengono tirati, Parabellum il mirino di dodici lenti che si sposta sulla carta e aggancia un bersaglio, Ordito i fili come Wirepuller, Mordacchia le braci, Ansa gli anelli d'acqua che si allargano.

### Nomi delle carte

Ogni personaggio ha una scritta del nome sua: carattere, colori, materiale ed estrusione 3D che ricordano chi è (la lava di Mongibello, il vetro di Vetrix, la visiera vuota di Absentia). Gli stili sono in `src/lib/card-names.ts`, indicizzati per codice carta: un personaggio nuovo ne riceve uno, altrimenti usa lo stile base della sua fazione. Quando una carta vince un round, il suo nome appare in 3D vero con lo stesso stile (`src/lib/winner-name-3d.ts`). Se si aggiunge un carattere, le forme 3D delle lettere si rigenerano con `node scripts/build-name-fonts.mjs`.

## 9. Prima di pubblicare

- Controllare che O-MEGA, Nuova Megara e i nomi delle carte non siano già marchi o personaggi esistenti.
- Non usare religioni, organizzazioni criminali o persone reali come base per i cattivi.
- Sostituire i testi segnaposto con una migrazione che aggiorna solo `name`, `flavor` e `art_url`, mai `stats`.
