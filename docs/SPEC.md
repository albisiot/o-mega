# SPEC — O-MEGA

*Gioco di carte collezionabili multiplayer. Specifica di progetto v0.2 — punto di partenza per lo sviluppo. Il mondo del gioco è Nuova Megara: vedi `docs/WORLD.md`.*

---

## 1. Visione

Un gioco online in cui la collezione di ogni giocatore **cambia continuamente**: le carte si ottengono dai pacchetti, si usano in sfide 1 contro 1 e si possono conquistare o perdere.

Il valore di ogni carta nasce dal legame tra collezione e competizione: ogni carta si può usare per giocare, per conquistarne altre, oppure si rischia di perderla.

**Ciclo giornaliero:** pacchetto gratuito → collezione → sfide → monete → nuovi pacchetti → ripeti.

**Obiettivi di esperienza:**
- Partite brevi (circa 3 minuti).
- Regole comprensibili in un minuto, con profondità strategica nelle scelte.
- La rarità non garantisce la vittoria: chi ha giocato meglio vince.
- Perdere una carta deve sembrare un rischio accettato, mai un'ingiustizia.

## 2. Universo

Un **nuovo mondo di supereroi e supercattivi**: la città di **Nuova Megara**, descritta in `docs/WORLD.md` (ambientazione, fazioni, personaggi).

Il catalogo dell'MVP comprende:
- circa **60 carte personaggio** (eroi e cattivi, tutti giocabili dal giocatore), con nome, testo e immagine definitivi;
- circa **60 carte Minaccia** (gli scenari e nemici da sconfiggere durante la partita, gestiti dal server e non collezionabili), circa 10 per ciascun livello da 1 a 6, con testi ancora segnaposto. A queste si aggiungono **15 Minacce oltre Nuova Megara**, in cinque luoghi del mondo con la loro regola (§5.4).

Le carte personaggio appartengono a una **fazione** (es. Eroi / Cattivi / Neutrali, da definire). Nell'MVP la fazione è solo un'etichetta; gli eventuali effetti verranno decisi più avanti.

## 3. Account e profilo

- Login con **Google** tramite Supabase Auth.
- Profilo: nome utente (unico), avatar, livello, esperienza.
- **Avatar:** il volto di un personaggio che il giocatore possiede, preso dal disegno della carta (il disegno base, se ne ha almeno una copia, o una variante che ha trovato). Senza scelta resta la foto dell'account Google (o l'iniziale, se l'account non ne ha). Si sceglie nel profilo e si imposta solo con una funzione server che verifica il possesso al momento della scelta. È solo estetica: se poi il giocatore perde l'ultima copia di quel personaggio (per esempio in Conquista), l'avatar resta finché non ne sceglie un altro. Gli altri giocatori (avversario in partita, classifiche di Emergenza) vedono solo l'immagine dell'avatar.
- Statistiche: vittorie, sconfitte, serie consecutive, carte conquistate, carte perse.
- Saldo monete (derivato dal ledger).
- Storico delle carte conquistate e perse.
- Al primo accesso il giocatore riceve lo **starter set** (§6.4).
- Un account per identità Google.

## 4. Carte

### 4.1 Carte personaggio

| Campo | Descrizione |
|---|---|
| Nome | Nome del personaggio |
| Immagine | Illustrazione (segnaposto nell'MVP) |
| Fazione | Eroi / Cattivi / Neutrali (provvisorio) |
| Rarità | Una delle 5 rarità (§4.2) |
| Abilità | 12 valori numerici (§4.3) |
| Potere | Abilità speciale passiva, opzionale (§4.4) |
| Testo di colore | Breve descrizione narrativa |

### 4.2 Rarità

Le rarità usano le **lettere greche**, dalla più comune alla più rara:

| Rango | Rarità | Probabilità per carta (indicativa) |
|---|---|---|
| 1 | **Delta** | 60% |
| 2 | **Gamma** | 25% |
| 3 | **Beta** | 10% |
| 4 | **Alfa** | 4% |
| 5 | **Omega** | 1% |

**Rarità estendibili:** le rarità sono una tabella di configurazione (`rarity_definitions`: codice, nome, rango, colore, probabilità), non un enum fisso. Con le espansioni si potranno aggiungere altre lettere greche (es. Epsilon, Sigma) inserendole a qualsiasi rango. Tutta la logica (limite di conquista, garanzie dei pacchetti, ordinamenti) confronta il **rango**, mai il nome.

Ogni pacchetto contiene **5 carte**, con almeno una carta di rarità Gamma o superiore. Le probabilità vanno in configurazione e devono essere **visibili ai giocatori** nel negozio.

### 4.3 Abilità

Ogni personaggio ha **12 abilità** con valori da **0 a 10**, raggruppate in 4 famiglie da 3. Le famiglie servono per la grafica (colore e icona), per il design delle Minacce e, in futuro, per poteri e fazioni. Nomi definitivi:

| Famiglia | Codice | Abilità |
|---|---|---|
| **Corpo** | FOR | Forza |
| | VEL | Velocità |
| | RES | Resistenza |
| **Mente** | INT | Intelletto |
| | VOL | Volontà |
| | PER | Percezione |
| **Potere** | ENE | Energia |
| | MAG | Magia |
| | PSI | Psiche |
| **Mestiere** | COM | Combattimento |
| | TEC | Tecnologia |
| | FUR | Furtività |

Nel codice le abilità sono un elenco configurabile (codice, nome, famiglia): rinominarle non deve richiedere modifiche alla logica.

**Principio di bilanciamento: più rara, più forte.**
- Ogni rarità ha il suo **budget di abilità**, che cresce con il rango (`rarity_definitions.ability_budget`, tolleranza ±3 in `game_config`). Ogni carta ha esattamente il budget della sua rarità:

| Rarità | Delta | Gamma | Beta | Alfa | Omega |
|---|---|---|---|---|---|
| Punti totali | 54 | 55 | 57 | 58 | 61 |

- I profili variano tra **specialisti** (pochi valori 9-10, molti 0-2) e **generalisti** (valori medi diffusi). Il sistema delle Minacce (§5.4) rende utili entrambi: gli specialisti dominano le Minacce di livello basso, i generalisti quelle di livello alto.
- Le carte rare sono anche più **caratteristiche**: profili più estremi e un Potere (§4.4). I valori 0 e 1 di ogni personaggio non crescono con la rarità: i punti in più vanno alle altre abilità, in proporzione, fino a 10.
- **Budget tarati per simulazione** sul catalogo reale (Difficile contro Difficile, con i modificatori): una squadra di ogni rarità batte una squadra della rarità sotto circa il 63% delle volte (Gamma su Delta 63%, Beta su Gamma 63%, Alfa su Beta 69%, Omega su Alfa 59%). Il salto da Beta ad Alfa basta a pochi punti perché i poteri distintivi di Alfa (Sabotatore, Veggente) valgono più di quelli di Omega; con i vecchi budget (54/54/53/52/51) Omega perdeva contro Alfa (44%).
- Una squadra di Delta ben scelta può ancora battere una squadra di Omega, ma raramente: circa 1 volta su 9.

### 4.4 Poteri (passivi)

I poteri sono effetti **situazionali**, mai bonus generici. Disponibilità indicativa:
- Delta: nessun potere.
- Gamma e Beta: potere semplice (es. "+2 contro Minacce che richiedono FOR").
- Alfa e Omega: potere più distintivo (es. "Se perdi questo round, il tuo prossimo personaggio ottiene +2").

Nell'MVP bastano 4-6 tipi di potere implementati nel motore di regole, parametrici.

Poteri implementati:

| Potere | Livello | Effetto |
|---|---|---|
| Specialità | Semplice | +2 contro Minacce che richiedono una certa abilità |
| Affinità | Semplice | +2 se la Minaccia richiede almeno 2 abilità di una famiglia |
| Terreno favorevole | Semplice | +2 contro Minacce di livello 1-2 |
| Apripista | Semplice | +3 se giocato nel round 1 o 2 |
| Ultimo baluardo | Semplice | +3 se giocato nel round 4 o 5 |
| Legame | Semplice | +1 per ogni altro personaggio della stessa fazione in squadra, anche già giocato |
| Implacabile | Semplice | Con punteggi totali pari vince il round, prima dello spareggio sul valore più alto. Se ce l'hanno entrambi si passa allo spareggio |
| Riscossa | Distintivo | Se perde il round, il personaggio successivo ottiene +2 o +3 |
| Sfavorito | Distintivo | +2 o +3 se l'avversario ha vinto più round |
| Sabotatore | Distintivo | -1 a ogni abilità del personaggio avversario nel round, senza scendere sotto 0. Vale anche per lo spareggio. Pesa di più sulle Minacce di livello alto |
| Veggente | Distintivo | Dopo averlo giocato, il giocatore vede tutte le Minacce dei round successivi. Non dà punti |
| Schermato | Semplice | Immune a Sabotatore, e +1 se il personaggio avversario ce l'ha |
| Nemesi | Semplice | +3 se il personaggio avversario è della fazione opposta (Eroi contro Cattivi). I Neutrali non hanno nemesi e non sono nemesi di nessuno |
| Tuttofare | Semplice | +3 se tutte le abilità richieste valgono almeno 5, contate dopo Sabotatore |
| Spia | Semplice | Dopo averlo giocato, il giocatore vede un personaggio a caso che l'avversario non ha ancora giocato. Il server lo estrae una volta sola. Non dà punti |
| Annullatore | Semplice | Nel round annulla il potere del personaggio avversario: niente bonus, Sabotatore, Implacabile, Riscossa o Slancio per il round dopo, niente rivelazioni di Veggente e Spia. Il bonus già ricevuto dal round prima resta. Due Annullatori si annullano a vicenda |
| Davide | Semplice | +3 se il personaggio avversario lo supera di 2 o più gradi di rarità (un Gamma contro Alfa e Omega) |
| Crescendo | Semplice | +3 se la Minaccia ha un livello più alto di quella del round prima. Mai nel round 1 |
| Slancio | Distintivo | Se vince il round, il personaggio successivo ottiene +2. È lo specchio di Riscossa; un round nullo non conta |
| Arte di arrangiarsi | Semplice | Le abilità richieste che valgono meno di 3 contano 3, dopo Sabotatore |
| Contrattacco | Semplice | +1 per ogni abilità richiesta in cui il personaggio avversario lo supera, a valori pieni, fino a +3 |
| Eclettico | Semplice | +3 se le abilità richieste sono di almeno 3 famiglie diverse |
| Lupo solitario | Semplice | +5 se nessun altro personaggio della squadra è della sua fazione |
| Opportunista | Semplice | +3 se il personaggio avversario non ha un potere |
| Riflesso | Semplice | Immune a Sabotatore, e il malus torna indietro: il Sabotatore avversario perde lui 1 a ogni abilità |
| Vendetta | Semplice | +3 se il proprio lato ha perso il round precedente, con qualunque personaggio |
| Grande prova | Semplice | +3 contro la Minaccia di livello più alto della partita (se sono più d'una, tutte) |
| Adattabile | Semplice | +4 contro una Minaccia con una regola (modificatore, luogo o Minaccia rara), e i malus di quella regola non lo toccano |
| Sacrificio | Distintivo | Il suo punteggio conta 0 (anche i bonus ricevuti). Da quel momento ogni personaggio successivo del suo lato, di qualunque fazione, ha +3 fino a fine partita, qualunque sia l'esito. Se un Annullatore lo ferma segna normalmente e il bonus non parte; un Annullatore che colpisce un personaggio successivo gli toglie il suo potere, non il bonus (come per Capobranco) |
| Capobranco | Distintivo | Dopo di lui, ogni personaggio successivo della sua fazione ha +1 fino a fine partita |
| Riverbero | Distintivo | Copia il potere del personaggio giocato nel round prima, se è un potere che dà solo punti al suo personaggio |
| Catalizzatore | Distintivo | Il personaggio successivo moltiplica per 2 il bonus del proprio potere (non il bonus portato, Capobranco né Sacrificio) |
| Nebbia | Distintivo | L'avversario vede il punteggio ma non chi è stato giocato, fino a fine partita. Il server copre la carta (`with_fog` in `match_state_payload`): niente nome, disegno, valori né rarità, solo il punteggio e il valore più alto. Un Annullatore avversario sullo stesso fronte o Silenzio della tomba la scoprono |

In Emergenza non c'è un personaggio avversario: Schermato, Nemesi, Spia, Annullatore e Davide non hanno effetto, Tuttofare e Crescendo sì.

Annullatore, Davide, Crescendo e Slancio sono nati per personaggi nuovi (P115-P122, due per potere), senza togliere poteri alle carte esistenti. Da simulazione sul catalogo a 122 personaggi (20.000 partite Difficile contro Difficile, squadre casuali, con i modificatori), una squadra che ha la carta vince: Slancio 53%, Davide 50%, Annullatore 49%, Crescendo 49%; nelle stesse condizioni Sabotatore 59% e una squadra senza poteri 49%. Con due sole carte, l'Annullatore incontra di rado Sabotatore: da solo non ne riduce la forza media. In seguito questi poteri sono andati anche a personaggi nuovi: oggi Annullatore è su 4 carte (anche Gauger, P130, e Injunction, P179), Crescendo su 4 (anche Miliarium, P161, e Holloway, P177), Slancio su 5 (anche Quarantine, P182, Sferza, P258, e Fumarola, P289), Davide su 4 (anche Penates, P206, e Legatura, P254); Sabotatore è su 5 (anche Mischance, P131, Principal, P181, e Clementia, P214).

Gli ultimi 14 poteri della tabella vengono da `docs/POWERS-BACKLOG.md` e sono su un personaggio nuovo ciascuno (P218-P231, migrazione `20261114230000_backlog_power_characters.sql`, docs/WORLD.md), con i parametri consigliati del backlog. Sacrificio è entrato così com'era (+5 al solo personaggio successivo), nonostante il backlog lo desse da riprogettare; il 15 novembre 2026 l'utente l'ha trasformato in un bonus che dura fino a fine partita, con la cifra (+3) fissata per simulazione (migrazione `20261115110000_sacrifice_lasting_bonus.sql`, tabella in `docs/POWERS-BACKLOG.md`). Giocato presto ripaga il round ceduto su più round, giocato tardi conviene poco: è una scelta tattica. Dal 20 novembre 2026 nove di questi poteri sono anche su un personaggio dei Mille Soli (P232-P261, docs/WORLD.md), ognuno su un posto ancora libero per la sua fazione e con gli stessi numeri: Grande prova (Virata), Vendetta (Rivalsa), Lupo solitario (Taglia), Contrattacco (Novizia), Adattabile (Franchigia), Eclettico (Glossa), Sacrificio (Commiato), Nebbia (Caligine) e Catalizzatore (Interregno). Due anche su un personaggio delle Marche di Arcadia (P262-P291), sempre su un posto libero e con gli stessi numeri: Arte di arrangiarsi (Tempra) e Sacrificio (Nomina).

**Un potere preciso per fazione (16 novembre 2026).** Lo stesso potere con gli stessi numeri sta al massimo su un Eroe, un Cattivo e un Neutrale; con numeri diversi (per esempio Ultimo baluardo +4 invece di +3) è un potere diverso, che ha di nuovo un posto per fazione. Il database lo fa rispettare a ogni personaggio nuovo (indice `card_definitions_one_power_per_faction`). Per arrivarci 73 carte hanno cambiato potere (migrazione `20261116200000_power_variants.sql`): 39 tengono il loro con altri numeri, 34 prendono una variante con una condizione nuova, che porta il nome del potere da cui viene. In ogni gruppo ha tenuto il potere la carta con più copie possedute. Le varianti:

| Variante (codice) | Nome | Livello | Effetto |
|---|---|---|---|
| `round_exact` | Ultimo baluardo | Semplice | +N se giocato proprio nel round indicato |
| `bond_threshold` | Legame | Semplice | +N se in squadra ci sono almeno K altri personaggi della sua fazione |
| `bond_relay` | Legame | Semplice | +N se il personaggio giocato dal suo lato nel round prima è della sua fazione |
| `bond_played` | Legame | Semplice | +N per ogni personaggio della sua fazione già giocato |
| `bond_unplayed` | Legame | Semplice | +N per ogni altro personaggio della sua fazione non ancora giocato |
| `relentless_small`, `relentless_big`, `relentless_behind` | Implacabile | Semplice | Vince le parità e, sulle Minacce fino al livello indicato, dal livello indicato in su, o quando il suo lato è in svantaggio, anche un round perso di M punti o meno. Non contro un altro Implacabile |
| `nemesis_other` | Nemesi | Semplice | +N se il personaggio avversario è di un'altra fazione, Neutrali compresi |
| `rival` | Nemesi | Semplice | +N se il personaggio avversario è della sua stessa fazione (vale anche per i Neutrali) |
| `delayed_nullifier` | Annullatore | Semplice | Annulla il potere del personaggio che l'avversario gioca nel round dopo (in Allarme Triplo sulla stessa Minaccia, nella Grande Minaccia nel turno dopo). Non agisce se un Annullatore o Silenzio della tomba l'ha fermato nel suo round; un Annullatore che spegne non annulla niente |
| `spy_many`, `spy_rarest` | Spia | Semplice | Vede K personaggi a caso, o il più raro (a caso tra i più rari), tra quelli che l'avversario non ha ancora giocato |
| `comeback_long` | Riscossa | Distintivo | Se perde il round, i due personaggi successivi ottengono +N |
| `comeback_margin` | Riscossa | Distintivo | Se perde il round, il successivo ottiene i punti di scarto, fino a +M |
| `underdog_per_round`, `underdog_wall`, `underdog_points` | Sfavorito | Distintivo | +N per ogni round di svantaggio; oppure se l'avversario ha già vinto almeno K round; oppure se finora l'avversario ha fatto più punti in totale (nella Grande Minaccia i punti dei fronti) |
| `sabotage_big` | Sabotatore | Distintivo | −M a ogni abilità del personaggio avversario, solo sulle Minacce dal livello indicato in su |
| `sabotage_flat` | Sabotatore | Distintivo | −M al punteggio del personaggio avversario, mai sotto 0 e non allo spareggio. Schermato e Riflesso lo fermano, Riflesso lo rimanda indietro |
| `foresight_short` | Veggente | Distintivo | Dopo averlo giocato, vede le Minacce dei K round successivi |

Schermato dà il suo bonus contro ogni Sabotatore che agisce nel round. Riverbero copia anche le varianti a punti (Ultimo baluardo, Legame, Nemesi, Sfavorito). Simulazioni, criteri e l'elenco carta per carta sono in `docs/POWERS-BACKLOG.md` («Poteri tutti diversi»).

**Tredici poteri nuovi (20 novembre 2026).** Scelti dall'utente tra quelli proposti e simulati (`docs/POWERS-BACKLOG.md`, «Poteri del 20 novembre 2026»), pronti nel motore e nel database (migrazione `20261120100000_thirteen_new_powers.sql`). Sono andati su personaggi nuovi creati apposta, uno ciascuno, i trenta delle Marche di Arcadia (P262-P291, migrazione `20261120200000_marches_characters.sql`, docs/WORLD.md), con i parametri consigliati del backlog: Fuoriclasse +3 (Cocca), Rompighiaccio +3 (Sperone), Euforia +3 (Vessillo), Colpo di grazia +3 con 2 round (Scure), Diminuendo +2 (Imbrunire), Infiltrato (Pertugio), Gemello +3 (Bifora), Fuori casa +4 (Gerla), Testa a testa +2 (Concordato), Guastafeste (Rasura), Presagio (Epigrafe), Oracolo (Millenario) e Logoramento −2 (Apocrifo). Gli altri posti per fazione restano liberi per personaggi futuri.

| Potere (codice) | Nome | Livello | Effetto |
|---|---|---|---|
| `attrition` | Logoramento | Distintivo | Dopo averlo giocato, il prossimo personaggio dell'avversario ha −M al punteggio (−2), mai sotto 0 e non allo spareggio: nella Partita il round dopo, nell'Allarme Triplo sulla stessa Minaccia, nella Grande Minaccia il turno dopo. Non agisce se un Annullatore o Silenzio della tomba l'ha fermato nel suo round; Schermato e Riflesso non lo fermano |
| `peak` | Fuoriclasse | Semplice | +N se almeno un'abilità richiesta vale 10 (dopo il Sabotatore) |
| `euphoria` | Euforia | Semplice | +N se il proprio lato ha vinto il round precedente (lo specchio di Vendetta) |
| `away` | Fuori casa | Semplice | +N contro le Minacce dei luoghi fuori Nuova Megara (§5.4), non contro le Minacce rare con la stessa regola |
| `twin` | Gemello | Semplice | +N se il personaggio avversario ha la sua stessa rarità |
| `match_point` | Colpo di grazia | Semplice | +N se il proprio lato ha già vinto K round (2) |
| `icebreaker` | Rompighiaccio | Semplice | +N finché il proprio lato non ha vinto un round |
| `even_score` | Testa a testa | Semplice | +N se i round vinti dai due lati sono pari (anche 0 a 0) |
| `diminuendo` | Diminuendo | Semplice | +N se la Minaccia ha un livello più basso di quella del round prima (lo specchio di Crescendo) |
| `spoiler` | Guastafeste | Semplice | Nel suo round il personaggio avversario non riceve i bonus delle carte giocate prima: Riscossa, Slancio, Capobranco, Sacrificio. Un Annullatore o Silenzio della tomba lo fermano |
| `omen` | Presagio | Distintivo | Finché è in squadra e non è stato giocato, il giocatore vede la Minaccia del round dopo. Nessun Annullatore lo ferma: non è giocato |
| `infiltrator` | Infiltrato | Semplice | All'inizio della partita il giocatore vede un personaggio avversario a caso, estratto dal server (una riga di `spy_reveals` con round 0); lo schermo lo elenca con quelli visti dalla Spia, finché l'avversario non lo gioca, e dice chi li ha mostrati: «Con Infiltrato hai visto: …», «Con Infiltrato e Spia hai visto: …» |
| `oracle` | Oracolo | Distintivo | Dall'inizio della partita il giocatore vede la Minaccia di livello più alto (se sono più d'una, tutte) |

Le Minacce viste da Presagio e Oracolo arrivano in `foreseen_threats` come quelle del Veggente (`with_short_foresight` nella Partita, `with_emergency_omens` nelle tre Emergenze), ognuna col nome del potere che l'ha mostrata (`seen_by`; senza, è del Veggente): la casella col suo occhio, toccata, dice «prevista con Oracolo», «prevista con Veggente e Presagio»… Nell'Allarme Triplo e nella Grande Minaccia sono già tutte visibili: Presagio e Oracolo lì non servono, come il Veggente. I bot usano Logoramento (sanno quanto toglie e quanto subiscono), Presagio e Oracolo (le Minacce viste), non Infiltrato. Riverbero copia gli otto poteri a punti. Sulle tavole: gli otto a punti sono cariche (dalla Minaccia Fuoriclasse e Fuori casa, dal round Euforia, Colpo di grazia, Rompighiaccio, Testa a testa e Diminuendo, dal rivale Gemello); Logoramento è un colpo che aspetta nella casella del round dopo e lì entra come «Logoramento di …» nel punteggio rivale; Guastafeste è uno stop («toglie +N al rivale») e parla solo se il rivale aveva un bonus da perdere; Presagio, Infiltrato e Oracolo svelano.

**Ventidue poteri nuovi, secondo gruppo (20 novembre 2026).** Scelti dall'utente tra quelli proposti e simulati (`docs/POWERS-BACKLOG.md`, «Poteri del 20 novembre 2026, secondo gruppo»), pronti nel motore e nel database (migrazione `20261120300000_rule_powers.sql`) ma **ancora su nessuna carta**, come i tredici sopra.

| Potere (codice) | Nome | Livello | Effetto |
|---|---|---|---|
| `rival_frost` | Gelo | Distintivo | Nel round nessuna abilità del personaggio avversario conta più di N (8) |
| `rival_all_or_nothing` | Tutto o niente | Distintivo | Nel round le abilità del personaggio avversario che valgono meno di N (4) contano 0 |
| `rival_duel` | Duello | Distintivo | Nel round contano solo le N (3) abilità richieste più alte del personaggio avversario |
| `rival_price` | Il prezzo | Distintivo | Nel round le abilità del personaggio avversario che valgono N (2) o meno contano −M (−2) |
| `single_force` | Una sola forza | Distintivo | Le sue abilità richieste della stessa famiglia contano tutte quanto la più alta |
| `abyss_next` | Abissi | Distintivo | Le abilità richieste di una famiglia (Potere, o un'altra) del tuo prossimo personaggio contano doppio. Come Riscossa: nell'Allarme Triplo la carta dopo sulla stessa Minaccia, nella Grande Minaccia il turno dopo; resta anche sotto Silenzio della tomba |
| `duelist` | Duellante | Distintivo | Contro Minacce dal livello N (4) in su contano solo le sue 2 abilità richieste più alte, ma doppie |
| `negative_self` | Negativo | Distintivo | Le sue abilità richieste contano 10 meno il loro valore, anche allo spareggio |
| `upset` | Ribaltone | Distintivo | Se perde il round di N (10) punti o più, lo vince (non contro un altro Ribaltone) |
| `calm` | Calma piatta | Semplice | Nel suo round la regola della Minaccia (modificatore, luogo, Minaccia rara) non conta, per entrambi; le abilità richieste restano quelle mostrate. Silenzio della tomba la spegne come ogni potere |
| `ambush` | Imboscata | Semplice | Nel round dopo l'avversario sceglie senza vedere le abilità della Minaccia, come con Al buio. Solo nella Partita |
| `patience` | Pazienza | Semplice | +N (1) per ogni round già giocato, fino a +M (4) |
| `hunter` | Cacciatore | Semplice | +N (4) se il personaggio avversario ha un potere distintivo |
| `rainbow` | Arcobaleno | Semplice | +N (2) se in squadra ci sono un Eroe, un Cattivo e un Neutrale |
| `joker` | Jolly | Semplice | La sua abilità richiesta più bassa sale verso la sua migliore abilità non richiesta, fino a +N (10) |
| `gamble` | Azzardo | Semplice | +N (3); se perdi il round, il tuo prossimo personaggio ha −M (−3) |
| `wall` | Muro | Semplice | Se perde il round di N (3) punti o meno, il round finisce nullo (non contro un altro Muro) |
| `tracker` | Segugio | Semplice | Dopo averlo giocato, il giocatore vede la rarità dei personaggi che l'avversario non ha ancora giocato (`tracked_rarities`: «Con Segugio sai: … ha ancora 2 Gamma e 1 Alfa») |
| `vampire` | Vampiro | Distintivo | Per ogni abilità richiesta in cui non supera il personaggio avversario: +1 a lui e −1 al rivale (non allo spareggio) |
| `thief` | Ladro | Distintivo | Prende per sé i punti che il potere del personaggio avversario gli darebbe nel round. Nella Grande Minaccia solo contro chi arriva sullo stesso fronte nello stesso turno |
| `phoenix` | Fenice | Distintivo | Se perde il round, con il potere attivo, torna in squadra e si può rigiocare una volta (`phoenix_back`; la mano la mostra con «Di nuovo»). Solo nella Partita |
| `steady` | Costanza | Semplice | +N (6) se la Minaccia ha lo stesso livello di quella del round prima |

Le regole sulle abilità si applicano prima di quella della Minaccia, in quest'ordine: le proprie (Jolly, Negativo, Una sola forza), Abissi ricevuto, Duellante, quelle del rivale (Gelo, Tutto o niente, Il prezzo, Duello); un Annullatore o Silenzio della tomba le ferma. Schermato e Riflesso non fermano né le regole del rivale né il Vampiro. In Emergenza non agiscono, senza avversario: Gelo, Tutto o niente, Il prezzo, Duello, Ribaltone, Muro, Vampiro, Ladro, Cacciatore, Imboscata, Segugio e Fenice. Sulle tavole: le regole del rivale sono colpi sulle abilità e il rivale riceve «Gelo di …» con i punti persi; le proprie sono cariche con i punti che fanno; Abissi entra come un bonus portato («Abissi di …»); Ribaltone e Muro sono spareggi; Calma piatta è uno stop («toglie Colpo mirato») e la tavola mostra la Minaccia senza la regola; Azzardo lascia «−3» nella casella del round dopo, Fenice «↺», Imboscata «?».

### 4.5 Doppioni

I doppioni restano istanze normali: si possono usare in partita e quindi rischiare in conquista. Il giocatore può anche **convertirli in monete** (valore per rarità in configurazione).

### 4.6 Varianti

Le carte base restano nello stile attuale. Una **variante** è la stessa carta con un disegno diverso e più raro: nome, valori, potere e rarità non cambiano. È un dato della singola istanza (`card_instances.variant_id`), definito nel catalogo `card_variants`.

- **Si trova nei pacchetti, o con un codice bonus** che la assegna (§8.1). Nei pacchetti, dopo aver estratto rarità e personaggio, il server tira a sorte la variante (`packs.variant_chance_percent`, 5% da quando quasi ogni personaggio ha una variante; prima 10%), quindi le probabilità delle rarità non cambiano. La probabilità è visibile nel negozio. Gli amministratori la cambiano da `/gestione-ricompense` (sezione *Pacchetti*, da 0 a 100%), e un evento «Caccia alle varianti» può alzarla mentre dura (§8.2); i pacchetti speciali hanno la loro (§7.1).
- **Niente varianti** per starter, carte sbloccate a livello e carte dei bot.
- **In squadra** viene schierata la copia base, a meno che il giocatore non scelga la variante. La scelta c'è in ogni schermata della squadra (tutte le modalità): un personaggio con più disegni ha una stella nella lista e, toccato nella squadra, mostra le miniature dei disegni che il giocatore possiede; la squadra mostra il disegno scelto. Le formazioni salvate ricordano la copia e il personaggio (`formations.definition_ids`): se la copia non c'è più (persa, convertita, bloccata), torna la copia predefinita del personaggio. Fuori dalla Conquista la squadra ricorda anche le varianti dell'ultima partita; in Conquista la variante si sceglie ogni volta.
- **In Conquista** una variante schierata è in palio come ogni altra carta non starter e passa al vincitore con il suo disegno. Contro un bot, se presa, esce dal gioco.
- **Non si converte** in monete e non rende doppione l'unica copia base; le copie in più della stessa variante si **rompono in Schegge** (§4.8).
- **Nella Collezione** ogni disegno posseduto si vede. Nell'album la tessera mostra il disegno base, oppure la prima variante trovata se il giocatore ha solo varianti; in basso a destra sul disegno ha un'etichetta con il nome della variante («★ Neon») o, con più varianti diverse, quante sono («★ 2»), che non copre mai il numero di copie. Nella pagina della carta, in alto, c'è una miniatura per ogni disegno posseduto (prima la base, poi le varianti nell'ordine in cui sono state trovate): un tocco lo mostra sulla carta, che ne porta il nome. Dopo le miniature, un «?» tratteggiato per ogni variante ancora da trovare, mai il suo disegno. Con un solo disegno posseduto le miniature non ci sono. Il filtro «★ Varianti» dell'album (accanto a Tutte, Possedute e Mancanti) mostra una tessera per ogni variante trovata, con le copie di quel disegno; rarità, fazione, tratti e ordinamento valgono come per i personaggi. In cima dice quante varianti il giocatore ha trovato e quante restano da trovare tra i suoi personaggi: quelle da trovare restano un numero, senza tessera. Toccare una tessera apre la pagina della carta su quel disegno (`/carta/?id=…&v=<stile>`).
- **Varianti animate:** alcune varianti hanno anche un breve video muto in loop (`public/cards/motion/`), che si vede solo dove una carta occupa lo schermo: pagina della carta, disegno a schermo intero e apertura del pacchetto. Altrove, e quando il telefono chiede meno movimento, resta il disegno fermo. Probabilità e regole non cambiano.
- **Stili:** Neon (24 personaggi), Tarocco (13), Epica e Pastello (12 ciascuno), 3D, Acquerello, Fantasy, Fiamma, Gotico, Incisione, Inchiostro, Ritratto, Spettro e Vetrata (11 ciascuno), Animato, Cinema, Circuito, Classico, Cometa, Cremisi, Fenice, Grafite, Inferno, Manga, Marmo, Olio, Ombra, Oro, Poster, Prisma, Regale, Retrò e Tempera (10 ciascuno), Zombie (9), e gli otto stili del 20 novembre 2026 (2 ciascuno, per ora solo sulle Marche di Arcadia, P262-P291): Iride (`iris`, ritratto dipinto a sfaccettature iridescenti), Cyber (`cyber`, fantascienza scura con piastre di metallo e linee luminose), Geometrico (`geometric`, animazione piatta a forme allungate e appuntite), Pulp (`pulp`, illustrazione a tempera da romanzo d'avventura d'epoca), Realismo (`realism`, copertina dipinta realistica su due grandi bande diagonali), Ornato (`ornate`, fumetto coperto di motivi da tessuto e linee da mappa), Novanta (`nineties`, cartone animato anni Novanta) e Anime (`anime`, anime moderno con nastri arcobaleno). I dieci personaggi da P123 a P132 hanno una variante ciascuno, nello stile più vicino all'immagine da cui sono nati; quelli da P133 a P291 una ciascuno in uno stile esistente o in uno degli otto nuovi, disegnata come lo stile ma con colori propri, perché le serie non abbiano tutte la stessa intonazione. Ogni personaggio dei pacchetti ha almeno una variante; le carte sbloccate a livello restano senza. Se un personaggio ha più varianti, il server ne sceglie una a caso.

### 4.7 Scheda del personaggio

Ogni personaggio ha una **scheda** che si vede solo nella pagina di dettaglio della carta (`/carta`): non sul retro, non nell'album e non in partita. Contiene:

- **Vero nome:** l'identità civile (`card_definitions.real_name`). Per chi non è una persona dice cosa risulta al suo posto, per esempio una matricola.
- **Poteri:** una o due frasi che raccontano il personaggio (`card_definitions.powers_text`). È solo descrizione: il Potere della carta (§4.4) è quello del motore e non cambia.
- **Tratti:** etichette di catalogo (`traits`, raggruppate in `trait_categories`, assegnate in `card_definition_traits`). Oggi ogni personaggio ha esattamente un tratto per categoria:
  - **Origine**, da dove viene il potere: Segno, Mestiere (nessun potere), Tecnologia, Magia, Mito, Strappo.
  - **Natura**, cosa è il personaggio: Umano, Macchina, Alieno, Creatura, Entità.
  - **Gruppo**: Custodi, Lanterne, Compagnia Lete, Figli dell'Ultima, Banco, Sciolti (docs/WORLD.md §4). Lo schieramento resta la fazione della carta (Eroi, Cattivi, Neutrali).

Ruolo ed Elemento sono rimandati a un'espansione. I tratti servono anche ai futuri **eventi speciali** che ammettono solo certi personaggi: il server li controlla con `card_matches_traits(definition_id, traits[])`. Dentro una categoria basta uno dei tratti elencati, e devono essere rispettate tutte le categorie elencate: `['origin.mito', 'origin.strappo', 'group.figli']` vuol dire (Mito o Strappo) e Figli dell'Ultima. Un codice sconosciuto è un errore. Conviene usare tratti, o gruppi di tratti, con almeno 15 personaggi, altrimenti pochi giocatori riescono a formare una squadra da 5. Vero nome, poteri e tratti sono testi segnaposto, come il resto dei contenuti, e alcuni prendono spunto dal compendio *THE FRACTURE*. Nelle pagine admin *Carte nei pacchetti*, *Pacchetti speciali* e nelle carte premio di *Gestione eventi* l'elenco delle carte si filtra per tratto con la stessa regola; gli eventi possono ammettere solo certi personaggi (§8.2).

### 4.8 Schegge, cornici ed effetti

- **Schegge:** una moneta a parte, con il suo registro (`shard_ledger`: il saldo è sempre la somma). Si ottengono **rompendo una variante doppia** o **come premio** (sotto). Nella pagina della carta, scheda *Copie*, la sezione «Varianti doppie» mostra ogni variante posseduta più volte; tenendo premuto si rompono le copie in più (una o tutte). Una copia di ogni variante resta sempre, e le copie appena conquistate (48 ore) o in una partita aspettano. Ogni copia rotta dà le Schegge della rarità del personaggio (`rarity_definitions.variant_shard_value`): Delta 1, Gamma 2, Beta 3, Alfa 5, Omega 7. La copia perde il proprietario come una carta convertita (`card_transfers`, motivo `shard_break`). RPC `break_variant_duplicates`.
- **Cosa comprano** (Negozio, scheda *Schegge*, `buy_with_shards`; prezzi in `balance.ts` `shards` e `game_config` `shards.*`):
  - 1 Scheggia: un **pacchetto standard**, senza limiti al giorno, con la probabilità di variante del pacchetto standard e mai quella di un evento (`open_pack_at_chance`, `pack_type = 'shards'`, «Con le Schegge»). Non conta negli obiettivi e nelle imprese sui pacchetti aperti;
  - 1 Scheggia: una **cornice o un effetto a caso**, ognuno con la stessa probabilità;
  - 2 Schegge: una **cornice a caso** oppure un **effetto a caso**, a scelta del giocatore;
  - 3 Schegge: una **variante che il giocatore non ha** (`grant_random_variants`), mostrata con l'apertura dei pacchetti; se le ha tutte il server rifiuta (`no_missing_variants`).
- **Cornici (15):** Argento, Oro e Prisma (un anello di metallo intorno alla cornice della rarità, che resta dentro), Gradata (teca trasparente con l'etichetta «O-MEGA · Carta certificata» e il voto 10 Gemma), Gradata nera (teca fumé, 10 Assoluta), Neon (del colore della fazione), Magma, Ghiaccio, Circuito, Fumetto, Barocca, Marmo, Carbonio, Abisso e Pixel. **Effetti (10):** Olografico, Riflesso, Scintille, Polvere di stelle, Ghiaccio incrinato, Neve, Raggi, Retino, Autografo (la firma del personaggio) e Numerata (il numero progressivo di quell'oggetto tra tutti quelli dello stesso effetto, `cosmetic_items.serial`). Il catalogo è la tabella `cosmetics`; il disegno è nell'app (`src/lib/cosmetics.ts`, `src/components/card-frames.tsx`, `globals.css`), con l'animazione ferma quando il telefono chiede meno movimento. Solo estetica: la rarità resta leggibile (colore e lettera) e regole e valori non cambiano.
- **Oggetti:** ogni cornice o effetto ottenuto è un'istanza (`cosmetic_items`), come le carte. Si applica dalla pagina della carta, casella *Cornice ed effetto* accanto alla *Scheda*: il giocatore sceglie tra quelli che possiede, vede l'**anteprima** sulla carta e conferma tenendo premuto. L'oggetto si **consuma** e resta su quel personaggio, in ogni suo disegno (base e varianti). Un personaggio ha una cornice e un effetto: uno nuovo prende il posto del vecchio, che va perso, e la pagina lo dice prima (`apply_cosmetic`). Cornice ed effetto si possono **nascondere o mostrare** in ogni momento, senza perderli (`set_cosmetic_visible`).
- **Dove si vedono:** nella Collezione (album e pagina della carta, dove anche «Guarda il disegno» apre il disegno intero nella cornice e sotto l'effetto, grandi quanto lo schermo, con l'interruttore «Pulito» per vederlo senza; senza cornice né effetto il disegno si apre come prima); nella scelta della squadra di ogni modalità, Emergenza compresa (lista, posti della squadra e disegni da schierare); nell'apertura dei pacchetti, quando il personaggio ha già cornice o effetto (carta girata e riepilogo); in partita, in tutte le modalità, sulle proprie carte (mano, griglia e mano del Quadrante, carta trascinata, riepilogo di fine partita) e su quelle dell'avversario già scoperte; e nel dettaglio che si apre con una pressione lunga. Sulle carte piccole (squadra, mano, griglia) la cornice è un anello appena dentro il bordo del disegno: la casella non cambia misura e il suo bordo (rarità, scelta, chi controlla la carta), i numeri e i segni restano sopra. Nelle tavole dei risultati il disegno mostra l'effetto; la carta che vince il round e quella che entra in scena con il suo potere hanno anche la cornice. Mai Autografo e Numerata, scritte che farebbero concorrenza ai balloon. Sono del giocatore, non della copia: in Conquista una carta passa senza cornice né effetto (la scelta della carta da conquistare non li mostra), e se il giocatore perde tutte le copie del personaggio restano registrati e tornano quando lo ritrova. Non li mostrano le miniature più piccole (la striscia dei livelli in alto, le righe dei riepiloghi), la squadra data da una Sfida a tema e le squadre degli altri giocatori nella classifica dell'Emergenza.
- **Quelli dell'avversario:** lo stato della partita (`match_state_payload`) aggiunge `opponent_looks`: cornice ed effetto che l'avversario ha lasciato visibili, per definizione, solo per i personaggi che lo stato già mostra (giocati in un round risolto, svelati dalla Spia, sulla griglia del Quadrante). Mai una carta ancora in mano, mai una coperta dalla Nebbia (arriva senza definizione); contro un bot o l'avversario del server, niente. `character_cosmetics` e `cosmetic_items` restano illeggibili ai client. Le proprie le legge l'app (`get_cosmetics`); l'apertura dei pacchetti (`pack_opening_payload`) dice la definizione di ogni carta. Nell'app: `src/components/card-looks.tsx`.
- **Editor → Schegge** (`/gestione-schegge`): Schegge per rarità (0–100) e prezzi (1–100), con `admin_get_shard_settings` e `admin_save_shard_settings`, che verificano l'amministratore e i valori sul server.
- **Come premio** (chiesto dall'utente il 19 novembre 2026: «negli eventi o nelle sfide ecc, posso impostare dall'editor di vincere delle schegge?»): ogni premio che l'amministratore imposta dall'Editor può dare anche Schegge, da 0 (nessuna) a 100 (`game_config` `shards.max_reward`, `balance.ts` `shards.maxReward`): codici bonus (§8.1), traguardi degli eventi (§8.2), obiettivi del giorno (§8.3), imprese (§8.5), traguardi del premio delle Sfide a tema (§8.8) e posti premiati delle classifiche dell'Emergenza, di ogni giorno e della settimana (§5.10, §5.16, in *Ricompense partite*). Anche da sole sono un premio. Nell'editor è un campo *Schegge* accanto a monete e pacchetti; le funzioni di salvataggio verificano l'amministratore e il limite sul server. Il server le paga nella stessa transazione del resto del premio, con una riga in `shard_ledger` il cui motivo dice da dove vengono (`bonus_code`, `event_reward`, `objective_reward`, `achievement_reward`, `challenge_reward`, `emergency_prize`, `emergency_week_prize`) e il riferimento al premio pagato, come in `coin_ledger`; obiettivi e imprese le copiano quando vengono assegnati o compiuti, come il resto del premio. Il giocatore le legge come «3 Schegge» o «1 Scheggia» dove vede il premio: traguardi dell'evento e della sfida, obiettivi, imprese, riepilogo del codice bonus, popup dei premi dell'Emergenza, banner (§11.1) e avviso di fine settimana (§11.7). Restano senza Schegge le ricompense di ogni partita e le monete delle missioni della Storia: si pagano a ogni partita, non sono un premio impostato una volta.
- **Nota di bilanciamento:** se la probabilità di variante del pacchetto standard supera il 10–12% circa, chi ha già quasi tutte le varianti riceve da ogni pacchetto comprato con le Schegge più Schegge di quante ne spende; la pagina dell'Editor lo ricorda.
- **Dati e test:** migrazioni `20261119120000_shards_and_cosmetics.sql` (`shard_ledger`, `cosmetics`, `cosmetic_items`, `character_cosmetics`; RLS attiva e nessuna policy: i client leggono solo `get_cosmetics`) e `20261119150000_match_cosmetics.sql` (`opponent_looks`, `definition_id` nei pacchetti). Le Schegge come premio: migrazione `20261119200000_shard_rewards.sql` (la colonna `shards` dei premi, `shard_reward_valid`, `grant_reward_shards`, le funzioni dei premi con le Schegge), logica e testi in `src/lib/shard-rewards.ts`. Test `supabase/tests/shards.test.sql`, `supabase/tests/shard_rewards.test.sql`, `supabase/tests/match_cosmetics.test.sql`, `src/lib/cosmetics.test.ts` e `src/lib/shard-rewards.test.ts`. Pagine di prova solo in `next dev`: `/prova-schegge` (`?s=cornici`, `effetti`, `album`, `carta&c=P001`, `negozio`, `squadra`, `mano`, `pacchetto`, `disegni` e `disegni-effetti`, ogni cornice e ogni effetto sul disegno intero), `/prova-quadrante/?s=cornici` (le proprie e quelle dell'avversario sulla griglia) e `/prova-tavole`, dove ogni carta ha un effetto; le Schegge nei premi in `/prova-editor-varianti` (`?s=codice`, `obiettivo`, `impresa`, `evento-admin`, `evento`, `ricompense`) e `/prova-sfide` (`?s=gioca`, `editor`).

## 5. Il minigioco — Regolamento

### 5.1 Panoramica

Due giocatori si affrontano con una **squadra segreta di 5 personaggi** ciascuno. Il server prepara **5 Minacce**: all'inizio si conosce solo il loro **livello**, poi ne viene svelata una per round. Per ogni Minaccia, ciascun giocatore sceglie in segreto quale personaggio mandare. Vince il round chi ottiene il punteggio più alto. **Vince la partita chi conquista 3 round.**

### 5.2 Preparazione

1. Il giocatore sceglie la modalità: nella voce **Classica** del menu Gioca, **Allenamento** contro un bot o **Amichevole** online (nessun trasferimento di carte); nella riga **In palio**, la **Classificata** (§8.7) o la **Conquista** (§6).
2. Sceglie una **squadra di 5 personaggi** tra le carte possedute. Le squadre si possono salvare come formazioni.
   - **Vietato schierare due copie dello stesso personaggio**: i 5 personaggi devono avere `definition_id` tutti diversi.
3. Matchmaking: avversario casuale, amico tramite codice, oppure bot (§5.9).

### 5.3 Inizio partita

- Le squadre restano **segrete**: un personaggio avversario diventa visibile solo quando viene giocato.
- Il server estrae **5 Minacce** e ne rivela soltanto la **sequenza dei livelli** (es. `2 · 5 · 1 · 3 · 6`). Le abilità richieste restano nascoste.
- Questa è l'unica informazione disponibile all'inizio: serve a pianificare dove impiegare specialisti e generalisti.

### 5.4 Le Minacce

Ogni Minaccia ha un **livello da 1 a 6** (fino a 12 per le Minacce rare, §5.15), che corrisponde al **numero di abilità richieste**:

| Livello | Abilità in gioco | Esempio |
|---|---|---|
| 1 | 1 | "Scippatore — VEL" |
| 2 | 2 | "Robot impazzito — FOR + TEC" |
| 3 | 3 | … |
| 4 | 4 | … |
| 5 | 5 | … |
| 6 | 6 | "Invasione dimensionale — sei abilità" |

- Le abilità richieste sono definite per ciascuna Minaccia del catalogo (non casuali), così ogni Minaccia ha un'identità narrativa.
- **Modificatori:** in ogni partita **1 o 2 Minacce** hanno un modificatore, diverso per ciascuna. Il server lo sorteggia alla creazione della partita e il giocatore lo scopre insieme alla Minaccia (o prima con Veggente). L'Emergenza (§5.10) non ne ha, perché le sue soglie sono tarate sulle Minacce normali.

| Modificatore | Effetto | Favorisce |
|---|---|---|
| Colpo mirato | La prima abilità richiesta conta doppio | Gli specialisti |
| Anello debole | Il valore più basso tra le abilità richieste conta doppio (solo da livello 2) | I personaggi equilibrati |
| Territorio ostile | +3 a una fazione, -2 a un'altra, sorteggiate | Le squadre con più fazioni |
| Sottovalutati | Delta +3, Alfa e Omega -3 | Le carte comuni |

Il punteggio non scende sotto 0 e lo spareggio sul valore più alto usa i valori normali. Da simulazione sul catalogo a 114 personaggi con i budget per rarità (§4.3), Difficile contro Difficile, una squadra di Alfa e Omega contro una di Delta passa dal 92% all'89% di vittorie: il vantaggio delle carte rare resta. I valori sono in `balance.ts` e `game_config`.
- **Minacce oltre Nuova Megara:** 15 Minacce in cinque luoghi del mondo, tre per luogo, con nome e testo definitivi (`threat_definitions.region`). Ogni luogo ha **la sua regola**, sempre attiva sulle sue Minacce e mai sorteggiata: si scopre insieme alla Minaccia, come un modificatore. I modificatori sorteggiati (1 o 2 per partita) vanno solo sulle Minacce di Nuova Megara, quindi una Minaccia ha al massimo una regola. Le Minacce dei luoghi si pescano come le altre: per livello sono 12 o 13 invece di 10.

| Luogo | Regola | Effetto | Favorisce | Minacce (livello) |
|---|---|---|---|---|
| Giza | Silenzio della tomba | Nessun potere funziona nel round, per entrambi: niente bonus, Sabotatore, Implacabile, Riscossa o Slancio per il round dopo, Veggente e Spia non svelano nulla. Il bonus già ricevuto dal round prima resta (come contro un Annullatore) | Chi non dipende dai poteri | Trappola della tomba (1), Mummia del cantiere (4), Risveglio della Sfinge (6) |
| Yucatán | Il conto lungo | +3 a chi finora ha vinto meno round; a parità nessuno | Chi è in svantaggio | Gioco della palla (2), Calendario impazzito (3), Serpente di luce (5) |
| Atlantide | Abissi | Energia, Magia e Psiche contano doppio | Le carte di Potere | Canto dagli abissi (1), Guardiano di oricalco (3), Atlantide riemerge (5) |
| Artico | Gelo | Nessuna abilità richiesta conta più di 6 | I generalisti | Tormenta (2), Base sotto il ghiaccio (4), Cosa nel ghiaccio (6) |
| Giappone | Duello | Contano solo le 2 abilità richieste più alte | Gli specialisti, anche sulle Minacce grandi | Spadaccino del ponte (3), Volpe a nove code (4), Kaiju nella baia (5) |

Come per i modificatori, lo spareggio usa i valori normali. I numeri (+3, 6, 2) sono in `balance.ts` (`places`) e `game_config` (`places.*`).

Da simulazione sul catalogo a 122 personaggi (3.000 partite per caso, Difficile contro Difficile, stesse squadre con e senza i luoghi), i rapporti di forza non cambiano oltre il margine d'errore (±1,7): Gamma su Delta 63% → 63%, Beta su Gamma 65% → 65%, Alfa su Beta 66% → 66%, Omega su Alfa 62% → 63%, Alfa e Omega su Delta 86% → 88%; una squadra con Sabotatore 59% → 59%, le squadre di valori piatti 30% → 30%, Difficile contro Medio 50% → 50%. Nei round, quando le due carte differiscono: con Duello vince la carta col picco più alto il 94% delle volte (86% senza regola) e il minimo non conta più (50%); con Gelo il picco conta meno (67%) e il minimo di più (76%); con Silenzio della tomba la carta più rara vince il 71% (64% senza regola), perché i poteri semplici di Gamma e Beta non colmano più il distacco. Il database scrive la regola del luogo in `matches.threat_modifiers` alla creazione della partita e la ripristina se qualcuno riscrive i modificatori (una missione della Storia).
- **Composizione dei livelli in una partita:** il server sceglie i 5 livelli in modo che la partita sia varia. Default: almeno una Minaccia di livello 1-2, almeno una di livello 5-6, somma dei livelli tra 14 e 20, ordine casuale. I parametri sono in configurazione.

**Intento di design:** sapendo solo i livelli, il giocatore decide se tenere lo specialista per la Minaccia di livello 1 (dove conta un solo valore altissimo) e il generalista per quella di livello 6 (dove contano tanti valori discreti), senza però sapere quali abilità usciranno né chi schiererà l'avversario.

### 5.5 Svolgimento di un round

1. Il server **svela la Minaccia** del round: nome e abilità richieste.
2. Entrambi i giocatori scelgono **in segreto e in contemporanea** un personaggio non ancora usato. Il timer è di **30 secondi**.
3. Se un giocatore non sceglie entro il timer, il server gioca per lui un personaggio casuale tra quelli disponibili.
4. Il server rivela i due personaggi e calcola i punteggi.

**Punteggio** = somma dei valori del personaggio nelle abilità richieste dalla Minaccia + effetti di poteri e modificatori.

**Regola chiave: ogni personaggio si usa una sola volta per partita.** Cinque personaggi per cinque Minacce: la strategia sta nel distribuire bene la squadra e nel prevedere le mosse dell'avversario, che si scopre un personaggio alla volta.

### 5.6 Esito del round e della partita

- Vince il round il punteggio più alto.
- **Pareggio nel round:** vince chi ha il **singolo valore più alto** tra le abilità richieste; se anche questo è pari, il round è nullo.
- La partita termina appena un giocatore conquista **3 round**. Se dopo 5 round nessuno ne ha 3 (per round nulli), vince chi ha più round; a parità vince la **somma dei punteggi** di tutti i round; a ulteriore parità la partita è un **pareggio** (nessun trasferimento di carte, monete da partecipazione per entrambi).

### 5.7 Disconnessioni

- Il giocatore disconnesso ha **30 secondi** per rientrare; nel frattempo il server gioca le sue scelte allo scadere dei timer.
- L'abbandono volontario conta come sconfitta.

### 5.8 Durata attesa

Circa 5 round da 30-40 secondi (scelta più rivelazione), più l'apertura e la chiusura: **3-4 minuti**.

### 5.9 Bot

Il giocatore può sfidare un bot scegliendo la difficoltà. Le partite contro bot si svolgono **sul server**, con lo stesso motore di regole delle partite PvP. Il bot riceve **solo le informazioni che avrebbe un giocatore umano**: sequenza dei livelli, Minacce già svelate, personaggi avversari già giocati.

| Difficoltà | Comportamento |
|---|---|
| **Facile** | Sceglie un personaggio a caso tra quelli disponibili, preferendo leggermente quelli con un buon punteggio. |
| **Medio** | Gioca il personaggio con il punteggio più alto per la Minaccia corrente (avido, nessuna pianificazione). |
| **Difficile** | Valuta anche le Minacce future: tiene da parte gli specialisti per i livelli bassi e i generalisti per quelli alti, e non spreca un personaggio forte su un round già perso. |
| **Super Pro** | Simulazione Monte Carlo: per ogni scelta possibile simula molte volte il resto della partita, estraendo Minacce plausibili dal catalogo e squadre avversarie plausibili (coerenti con i personaggi già visti), e gioca la mossa con la probabilità di vittoria più alta. |

- Il bot costruisce la propria squadra in modo coerente con la difficoltà. Facile e Medio: squadra casuale. Difficile: 5 personaggi a caso tra il 40% più forte del catalogo. Super Pro: tra il 15% più forte. La forza si stima dai valori, perché i picchi vincono i round e i valori piatti quasi mai (somma dei quadrati, più il Sabotatore).
- Le simulazioni mostrano che, con le sole informazioni concesse, giocare meglio conta poco: Difficile e Super Pro battevano Medio poco più della metà delle volte a parità di squadra, e anche chi conoscesse in anticipo Minacce e squadra avversaria vincerebbe il 75%. La difficoltà quindi cresce soprattutto con la squadra. Contro un giocatore che manda sempre la carta col punteggio più alto e ha una squadra casuale, i bot vincono: Facile 28%, Medio 50%, Difficile 67%, Super Pro 85%. Con i budget per rarità (§4.3) il 15% più forte è quasi tutto Alfa e Omega, quindi Super Pro è salito da circa il 70%.
- **In Conquista** (§6.5) il bot gioca al livello sorteggiato ma con una squadra casuale, come Medio: una squadra più forte costerebbe carte ai giocatori.
- Ogni bot (allenamento, Conquista, Classificata, Sfide a tema, Grande Minaccia, Allarme Triplo, Quadrante) costruisce la squadra solo tra i personaggi che i pacchetti possono dare (`is_pack_card`): un personaggio tenuto fuori dai pacchetti (§7) non compare finché un amministratore non lo rimette, e le carte sbloccate a livello non compaiono mai, perché si ricevono solo salendo di livello (deciso dall'utente il 20 novembre 2026). Fanno eccezione le squadre già scritte, come quelle delle missioni della Storia e le squadre date dalle Sfide a tema.
- Le partite scelte contro un bot sono sempre **Amichevoli**: nessuna conquista di carte. L'unica eccezione è la Conquista dopo l'attesa (§6.5).
- Ricompense in monete contro bot: da definire con l'economia (§8).
- Il matchmaking inserisce bot quando mancano avversari umani nella **Classificata** (§8.7): dopo 20-30 secondi di attesa il server gioca con i bot di quella modalità, con difficoltà e squadra scelte dalla Fama del giocatore, senza dire che è un bot. Fuori dalla Classificata le partite contro bot restano dichiarate.

### 5.10 Emergenza (sfida giornaliera)

Modalità in solitaria: si gioca senza avversario e senza mettere in palio carte.

- **Sfida del giorno:** ogni giorno (mezzanotte `Europe/Rome`) il server estrae con RNG reale **8 Minacce**, uguali per tutti. Un solo tentativo per giocatore, anche se lasciato a metà.
- **Squadra:** conoscendo solo i livelli, il giocatore sceglie **8 personaggi diversi** dalla collezione. La squadra non si cambia. Ognuno affronta una sola Minaccia.
- **Svolgimento:** le Minacce si svelano una alla volta. Non c'è timer: si può uscire e riprendere entro la giornata. Il punteggio si calcola come in partita (§5.5).
- **Punteggio richiesto:** una Minaccia è superata se il punteggio arriva alla soglia del suo livello: 7, 13, 18, 23, 28, 32 (dal livello 1 al 6).
- **Fine:** dopo l'ultima Minaccia o alla **terza fallita**.
- **Livelli:** stesse regole di §5.4, con somma tra 24 e 32.
- **Solo Nuova Megara:** l'Emergenza estrae solo le 60 Minacce normali di Nuova Megara, più le Minacce rare quando escono (§5.15, ognuna con la sua soglia), mai quelle dei luoghi (§5.4): con Gelo o Duello alcune soglie sarebbero irraggiungibili (livello 2 al massimo 12 contro 13, livello 5 al massimo 20 contro 28). Così soglie e difficoltà restano quelle tarate.
- **Premi:** 10 monete a 3 Minacce superate, altre 15 a 5, altre 25 a 8 (massimo 50 al giorno). Si ricevono subito, quindi restano anche se il tentativo non viene finito. Esperienza solo a tentativo finito, se l'amministratore la imposta (default 0, §8.4); nessun effetto sulle statistiche di partita. Soglie, monete ed esperienza si cambiano da *Ricompense partite* (§8.4).
- **Classifica di giornata:** solo i tentativi finiti, per Minacce superate, poi punteggio totale, poi chi ha finito prima. Mostra i **primi 10** (`emergency.leaderboard_size`) con avatar e titolo (§8.5); chi è più in basso vede la sua posizione sotto l'elenco. Non mostra i personaggi giocati, che rivelerebbero le Minacce. La stessa classifica, con quelle della settimana e di sempre, è anche nella pagina Classifiche (§8.6).
- **Formazioni del podio:** dei primi 3 (`emergency.lineups_shown`) si vedono le 8 carte del tentativo, con il disegno schierato (base o variante), nell'ordine in cui le hanno giocate, con la Minaccia affrontata e il punteggio; quelle mai giocate vengono dopo. Le Minacce sono uguali per tutti, quindi quelle **di oggi** le vede solo chi ha già finito il suo tentativo (si toccano le prime righe della classifica nel risultato); chi deve ancora giocare vede solo il **podio di ieri** ("Podio di ieri" sopra la classifica). Le righe della classifica restano senza personaggi. RPC `get_emergency_lineups` (formazione già salvata in `emergency_runs` ed `emergency_plays`).
- **Premi di classifica:** a mezzanotte (`Europe/Rome`) la classifica di giornata è definitiva e i primi 10 con almeno **1 Minaccia superata** vincono un premio: 1° **1 pacchetto e 50 monete**, 2° **100 monete**, 3° **75 monete**, dal 4° al 10° **25 monete** (default in `emergency.prizes.*`, `balance.emergency.prizes`; l'amministratore li cambia da *Ricompense partite*, §8.4, anche a 0 per togliere un premio; ogni posto può dare anche Schegge, §4.8, di serie nessuna). La giornata si chiude sul server la prima volta che qualcuno apre l'app dopo la mezzanotte (`emergency_close_days`, una volta sola per giorno, `emergency_prize_days`); si chiudono anche i giorni rimasti indietro, mai quello in corso. Un tentativo non finito entro la mezzanotte non entra in classifica. Il vincitore trova, in qualsiasi schermata tranne partite, Emergenza, apertura dei pacchetti ed editor, un **popup in sovraimpressione** con giorno, posto, Minacce, punteggio, giocatori e premio: *Riscuoti* paga subito (monete nel `coin_ledger` e Schegge nello `shard_ledger` con `emergency_prize`, pacchetti aperti dal server, tipo `emergency`, e mostrati come gli altri), *Più tardi* lo rimanda alla prossima apertura dell'app. I premi non scadono. Il popup aspetta come i banner (§11.1) lo splash, le tavole e i pacchetti. La classifica dell'Emergenza mostra sotto l'elenco i premi in palio.

**I poteri in Emergenza:** le Minacce superate contano come round vinti e quelle fallite come round persi. La squadra è quella di 8.

| Potere | Effetto in Emergenza |
|---|---|
| Riscossa | Se fallisce la Minaccia, il personaggio successivo ottiene il bonus |
| Sfavorito | Bonus se le Minacce fallite sono più di quelle superate |
| Legame | +1 per ogni altro personaggio della stessa fazione tra gli 8 |
| Sabotatore | Abbassa la soglia della Minaccia del suo malus per ogni abilità richiesta |
| Implacabile | Gli basta un punto in meno della soglia |
| Veggente | Dopo averlo giocato, il giocatore vede tutte le Minacce successive |
| Slancio | Se supera la Minaccia, il personaggio successivo ottiene il bonus |
| Crescendo | Bonus se la Minaccia ha un livello più alto della precedente |
| Vendetta | Bonus se la Minaccia precedente è stata fallita |
| Lupo solitario | Bonus se tra gli 8 non c'è nessun altro della sua fazione |
| Grande prova | Bonus se la Minaccia ha il livello più alto della giornata |
| Apripista, Ultimo baluardo | La Minaccia conta come round (1ª, 2ª, …): Ultimo baluardo vale dalla 4ª o 5ª all'ultima |
| Sacrificio | Segna 0 e fallisce la Minaccia; da lì ogni giocata successiva ottiene il bonus fino a fine giornata. Sotto Rovescio lo 0 resta sotto la soglia massima |
| Catalizzatore | Moltiplica il bonus del potere del personaggio successivo |
| Capobranco | +bonus ai personaggi successivi della stessa fazione |
| Riverbero | Copia il potere del personaggio precedente, se è uno di quelli copiabili (come in partita) |
| Specialità, Affinità, Terreno favorevole, Tuttofare, Eclettico, Arte di arrangiarsi, Adattabile | Come in partita: dipendono solo dal personaggio e dalla Minaccia (Adattabile scatta solo sulle Minacce rare con una regola) |
| Annullatore, Davide, Schermato, Nemesi, Spia, Nebbia, Riflesso, Contrattacco, Opportunista | Nessun effetto: non c'è un avversario. Il risultato dice "senza avversario non agisce" |
| Le varianti del 16 novembre 2026 (§4.4) | Come il loro potere. Ultimo baluardo nel round indicato: la Minaccia di quel numero. Legame: contato sugli 8, «già giocati» quelli delle Minacce prima. Riscossa lunga: dopo una fallita, le due giocate successive. Riscossa sullo scarto: i punti che mancavano alla soglia, fino al massimo. Sfavorito per round: per ogni fallita in più delle superate; Sfavorito contro chi ha già vinto K round: dopo K fallite. Sabotatore sulle Minacce grandi: abbassa la soglia solo dal suo livello; Sabotatore sul punteggio: soglia −M una volta. Implacabile: un punto in meno della soglia, più lo scarto quando la sua condizione vale (in svantaggio = più fallite che superate). Veggente per i round successivi: le Minacce delle K giocate dopo. Nessun effetto, senza avversario: Nemesi delle altre fazioni e della stessa, Spia di 2 e del più raro, Annullatore ritardato, Sfavorito sui punti |
| I poteri del 20 novembre 2026 (§4.4) | Come in partita, con le Minacce superate come round vinti e le fallite come round persi: Euforia dopo una superata, Colpo di grazia dopo K superate, Rompighiaccio finché non ne hai superata una, Testa a testa con superate e fallite pari, Diminuendo sul livello della Minaccia prima, Fuoriclasse e Fuori casa sulla Minaccia. Presagio (finché non l'hai giocato) mostra la Minaccia della giocata dopo, Oracolo quelle di livello più alto, anche se Livello ignoto le copriva. Nessun effetto, senza avversario: Gemello, Guastafeste, Logoramento, Infiltrato |
| Il secondo gruppo del 20 novembre 2026 (§4.4) | Come in partita: Pazienza conta le giocate fatte, Arcobaleno la squadra di 8, Costanza il livello della Minaccia prima, Azzardo passa −3 dopo una fallita, Abissi raddoppia la famiglia alla giocata dopo, Jolly, Negativo, Una sola forza e Duellante cambiano come contano le sue abilità; Calma piatta toglie la regola della Minaccia per quella giocata (la soglia resta). Nessun effetto, senza avversario: Gelo, Tutto o niente, Il prezzo, Duello, Ribaltone, Muro, Vampiro, Ladro, Cacciatore, Imboscata, Segugio, Fenice |

**Soglie:** simulate sul catalogo reale. Con tutta la collezione a disposizione, invece di 8 personaggi, chi ha molte carte supera quasi sempre tutte le Minacce; con la squadra limitata contano di più le scelte. In simulazione lo starter set supera in media 4,3 Minacce e una squadra ben costruita 5,8, con 8 su 8 raro (circa 5%). Misure fatte prima dei budget per rarità (§4.3): lo starter set (tutto Delta) non cambia, le squadre con carte rare ora superano qualche Minaccia in più. Rimisurate il 18 novembre 2026 con `scripts/simulate-emergency.mts` (metodo in §5.16): starter set 4,7, squadra ben costruita 6,1, 8 su 8 il 9%.

C'è anche una versione settimanale, più dura e con la sua classifica: l'**Emergenza della settimana** (§5.16).

### 5.11 Storia

Capitoli di missioni da giocare da soli contro gli avversari di Nuova Megara. Sei capitoli formano la Stagione 1, *Il Rintocco*; la Stagione 2, *La marea*, scritta in `docs/STORY.md` §6, è completa: i suoi sei capitoli sono nel database. La trama dei capitoli è in `docs/STORY.md`; i testi nel database restano **segnaposto** finché non vengono riscritti su quella base.

- **Missione:** una partita contro un bot con squadra, 5 Minacce e modificatori scelti a mano (`story_missions`), non sorteggiati. Il giocatore vede in anticipo solo i livelli, come in ogni partita. Le regole sono quelle di §5. Una missione con una Minaccia di un luogo ne tiene sempre la regola, qualunque modificatore scelga.
- **Ordine:** la prima missione è aperta; ogni altra si apre completando quella prima, anche tra un capitolo e l'altro.
- **Finale del capitolo:** un testo (`story_chapters.outro`) che il server manda solo a chi ha completato tutte le missioni del capitolo; la pagina Storia lo mostra sotto l'elenco.
- **Stagioni:** i capitoli sono raggruppati in stagioni (`story_seasons`: titolo e messaggio di fine stagione), e il menu Gioca li elenca sotto il titolo della loro stagione. Il giocatore legge il numero del capitolo dentro la stagione (`story_chapters.number`, da 1 in ogni stagione); l'ordine in cui si aprono le missioni resta quello di tutta la storia (`story_chapters.chapter`: 1-6 la Stagione 1, 7-12 la Stagione 2), anche da una stagione all'altra. Il messaggio di fine stagione arriva solo a chi ha completato tutte le missioni della stagione: sotto il suo ultimo capitolo e sul risultato della sua ultima missione. Finché una stagione non è finita di costruire, il suo messaggio dice che il prossimo capitolo arriva presto; il primo capitolo di una stagione nuova aggiorna il messaggio di quella prima.
- **Premi solo alla prima vittoria**, pagati dal database nella stessa transazione che chiude la partita: monete a ogni missione, e una carta per il boss di fine capitolo. Le missioni si possono rigiocare senza il premio della missione; le stelle che mancano (sotto) si prendono anche rigiocando. Sconfitte e abbandoni non pagano.
- **Carte premio:** copie normali (`acquired_via = 'story'`), conquistabili come quelle dei pacchetti. Mai Omega.
- Esperienza e statistiche come una partita contro bot. Le squadre avversarie e le Minacce restano segrete: il client legge solo `get_story` e `get_story_reward`.
- **Dove si apre la pagina Storia:** aperta da Gioca, sul capitolo con la prossima missione da giocare, con quella missione aperta (tutto completato: l'ultimo capitolo). **Finita una missione**, vinta o persa (richiesta dell'utente del 19 novembre 2026: «devo tornare alla pagina di quella che ho appena completato»), «Torna alla Storia», il tasto indietro e lo scorrimento dal bordo riaprono il capitolo di quella missione con la missione aperta e le stelle aggiornate, anche quando è una missione vecchia rigiocata per le stelle. Anche quando la vittoria ha aperto la missione successiva si torna su quella appena giocata: la successiva è nell'elenco, chiudendo la missione. La pagina ricorda capitolo e missione aperta (`useRememberedState`, §11.2) e «Torna alla Storia» le porta il codice della missione giocata (`mission` di `get_story_reward`), così la ritrova anche senza la Storia dietro nella cronologia. La scelta è `storyPlace` (`src/lib/story-place.ts`, test `story-place.test.ts`); la vista è `src/components/story-view.tsx`. Pagina di prova solo in `next dev`: `/prova-indietro/?p=storia` (con `squadra-storia` e `partita-storia`).

**Stelle delle missioni** (richiesta dell'utente del 17 novembre 2026, migrazione `20261118100000_story_stars.sql`). Ogni missione ha tre stelle, indipendenti tra loro e dal premio della missione:

- **3-0:** vinci la missione 3-0, cioè il bot non vince nessun round (i round nulli non contano).
- **Rarità:** vinci con una squadra i cui 5 personaggi hanno tutti una delle rarità della missione (`story_missions.star_rarities`), per esempio «solo Delta o Gamma».
- **Tratti:** vinci con una squadra i cui 5 personaggi rispettano tutti i tratti della missione (`story_missions.star_traits`), con la regola di `card_matches_traits` (§4.7): dentro una categoria basta uno dei tratti elencati, devono essere rispettate tutte le categorie elencate. Per esempio «solo Figli dell'Ultima» o «solo Mito o Strappo».
- **Come si prendono:** con qualsiasi vittoria nella missione, la prima o una rigiocata; una vittoria può darne più di una; una volta presa, una stella resta (`story_stars`, una riga per giocatore, missione e stella, con la partita che l'ha data). Le partite abbandonate (`end_reason = 'forfeit'`) non contano mai. Le calcola solo il database, nella transazione che chiude la partita (`grant_story_reward`), con la squadra schierata davvero (`match_teams`) e i round vinti dal bot (`rounds_won_b`).
- **Regole copiate sulla partita:** quando la partita nasce, `story_create_match` copia in `story_match_terms` rarità, tratti, monete delle stelle e premio della missione, come un evento che non cambia le regole dopo l'inizio: una modifica dell'amministratore vale per le partite create dopo. Una partita nata prima della migrazione usa le regole della missione.
- **Monete:** ogni stella paga le monete della missione (`story_missions.star_coins`) una volta sola, la prima volta che si prende, in `coin_ledger` con motivo `story_star` (una riga per partita, con tutte le stelle nuove). Valori di partenza per capitolo di tutta la storia: 10 monete nei capitoli 1-4, 20 nei 5-8, 30 nei 9-12 (`balance.ts` `story`, `game_config` `story.star_coins_base`, `story.star_coins_step`, `story.star_coins_step_chapters`); una missione nuova senza monete prende quelle del suo capitolo. In tutto le 180 stelle pagano 3.600 monete. Il premio della prima vittoria e le ricompense delle partite (§8.4, riga `story`) non cambiano.
- **Controlli del server:** rarità e tratti devono esistere e lasciare almeno 5 personaggi (una squadra, `match.team_size`): lo controllano il trigger `validate_story_mission` e le funzioni admin. Sotto i 15 la pagina admin avvisa che pochi giocatori riusciranno a formare la squadra.
- **Il giocatore vede:** nella pagina Storia tre stelle per missione (piene o vuote) al posto dello stato, le stelle del capitolo accanto al titolo («★ 7/15») e quelle della stagione in alto («★ 40/90»); in Gioca la casella Storia della riga Oggi ha quelle di tutta la Storia («★ 19/180», richiesta dell'utente del 19 novembre 2026): il totale conta anche le missioni non ancora aperte, perché `get_story` le manda tutte, e il conto lo fa `storyStarCount` (`src/lib/story-stars.ts`) dai capitoli che Gioca carica già, senza richieste in più; toccando una missione legge le tre condizioni in italiano e quanto vale ogni stella. Nella scelta della squadra di una missione (`/squadra/?story=…`) tre caselle con le condizioni: le carte che vanno bene per Rarità hanno una stellina azzurra, per Tratti una rosa (solo per le stelle che mancano), toccando Rarità o Tratti la lista mostra solo le carte adatte, e una riga dice quali stelle può prendere la squadra scelta. A fine partita le stelle nuove arrivano una dopo l'altra con un anello, quelle già prese restano piene, sotto le monete e le condizioni che mancano.
- **Gestione dall'app, solo amministratori:** il link *Storia* (`/gestione-storia`) nell'Editor. La scheda *Missioni* sceglie stagione e capitolo e mostra le cinque missioni con avversario, bot, premio, regole delle stelle, monete a stella, quanti giocatori l'hanno completata e quanti hanno ogni stella; *Capitoli* elenca stagioni e capitoli; *Modifica* apre il modulo. Di una missione si cambiano titolo, avversario, introduzione, monete del premio, rarità e tratti delle stelle (con il numero di personaggi ammessi, in rosso sotto 5 e in giallo sotto 15) e monete a stella (con la proposta del capitolo); di un capitolo titolo, introduzione e finale; di una stagione titolo e messaggio di fine stagione. Avversari, Minacce, modificatori, bot e carta premio sono tarati con la simulazione e si vedono soltanto. Ogni funzione (`admin_get_story`, `admin_save_story_mission`, `admin_save_story_chapter`, `admin_save_story_season`) verifica l'amministratore sul server; ogni salvataggio vale per le partite create dopo.

**Regole di partenza delle stelle** (tutte si cambiano da `/gestione-storia`). Le rarità si fanno più strette andando avanti e sui boss: Delta, Gamma o Beta nelle prime missioni della Stagione 1, poi Delta o Gamma, solo Delta in alcune missioni difficili della Stagione 2 e nei finali di stagione; le missioni 1 dei Capitoli 1-3, dove l'avversario schiera 5 Delta, chiedono solo Delta, ad armi pari. I tratti seguono la missione e il suo avversario (`docs/STORY.md`): Mestiere per la gente comune del mercato, della fila allo sportello, dei periti e dei sacchi di sabbia; Lanterne e Custodi dove si protegge qualcuno; Creatura contro Cerbero e Polifemo; Macchina contro le voci di Multitude e per l'armatura di Absentia; Compagnia Lete quando la Compagnia sta dalla tua parte (Capitolo 6); Figli dell'Ultima contro Clementia, che li ha fondati. Ogni regola ammette almeno 16 personaggi (Macchina 16, Creatura 18, le altre da 23 in su): mai sotto i 15 che §4.7 sconsiglia.

**Come sono state provate:** `scripts/simulate-story.mts` sul catalogo del 17 novembre 2026 (`scripts/story-catalog.sql`: i 227 personaggi dei pacchetti e le 75 Minacce comuni con le loro regole; le rare restano fuori, come nel server), con il metodo della taratura dei capitoli: il giocatore manda sempre la carta col punteggio più alto, contro la squadra, le Minacce e i modificatori della missione. Ogni stella è misurata con due squadre: **casuale**, 5 personaggi a caso tra quelli ammessi (il minimo), e **buona**, la migliore di 40 estrazioni sulle Minacce della missione, come chi la rigioca conoscendole e ha i personaggi giusti. Partite per misura: 2.000 o 1.500 con i bot Facile e Medio, il 60% con Difficile, il 15% con Super Pro (300 o 225 per ogni boss): i numeri hanno qualche punto di margine. Percentuali di vittoria, casuale / buona (per il 3-0: vittorie 3-0 con una squadra qualsiasi):

| Missione | Rarità | Tratti | 3-0 | Rarità | Tratti |
|---|---|---|---|---|---|
| C1M1 Primo incarico | Delta | Mestiere | 39 / 61 | 78 / 98 | 78 / 95 |
| C1M2 Il pugile di vetro | Delta, Gamma o Beta | Lanterne | 15 / 44 | 75 / 96 | 72 / 94 |
| C1M3 Blackout | Delta, Gamma o Beta | Tecnologia | 41 / 77 | 56 / 94 | 70 / 95 |
| C1M4 Campane a mezzanotte | Delta, Gamma o Beta | Custodi | 6 / 27 | 35 / 87 | 24 / 75 |
| C1M5 Il caveau | Delta o Gamma | Sciolti | 1 / 11 | 28 / 70 | 22 / 55 |
| C2M1 Ultima corsa | Delta | Custodi | 26 / 69 | 54 / 95 | 87 / 100 |
| C2M2 Il cane a tre teste | Delta, Gamma o Beta | Creatura | 10 / 24 | 73 / 93 | 97 / 100 |
| C2M3 Onde corte | Delta, Gamma o Beta | Segno | 12 / 52 | 64 / 94 | 65 / 98 |
| C2M4 Due Reggenti | Delta, Gamma o Beta | Lanterne | 2 / 9 | 62 / 89 | 63 / 83 |
| C2M5 Chi trova | Delta o Gamma | Mito o Strappo | 10 / 52 | 33 / 82 | 64 / 96 |
| C3M1 Lo sportello | Delta | Mestiere | 16 / 37 | 85 / 100 | 96 / 100 |
| C3M2 Le rampe | Delta, Gamma o Beta | Custodi | 9 / 41 | 62 / 91 | 66 / 90 |
| C3M3 Il debito | Delta, Gamma o Beta | Lanterne | 2 / 25 | 23 / 76 | 36 / 90 |
| C3M4 Il furto | Delta o Gamma | Banco | 5 / 27 | 39 / 90 | 41 / 80 |
| C3M5 La fornace | Delta o Gamma | Tecnologia | 1 / 15 | 25 / 78 | 66 / 99 |
| C4M1 Pensieri di nessuno | Delta, Gamma o Beta | Segno | 2 / 6 | 62 / 93 | 62 / 92 |
| C4M2 La negoziatrice | Delta, Gamma o Beta | Lanterne | 6 / 29 | 49 / 88 | 37 / 68 |
| C4M3 Sentire troppo | Delta o Gamma | Custodi | 41 / 93 | 67 / 99 | 75 / 99 |
| C4M4 Facce note | Delta o Gamma | Strappo | 1 / 10 | 22 / 74 | 16 / 72 |
| C4M5 Ultima voce | Delta o Gamma | Macchina | 2 / 10 | 12 / 52 | 15 / 54 |
| C5M1 Il trono di rame | Delta, Gamma o Beta | Tecnologia | 5 / 29 | 65 / 94 | 88 / 100 |
| C5M2 Il decreto | Delta o Gamma | Banco | 2 / 10 | 15 / 55 | 34 / 71 |
| C5M3 Le colonne | Delta o Gamma | Lanterne | 14 / 50 | 22 / 78 | 31 / 94 |
| C5M4 La vecchia licenza | Delta o Gamma | Magia o Mito | 1 / 10 | 15 / 55 | 25 / 74 |
| C5M5 Nessuno passa | Delta o Gamma | Segno | 0 / 0 | 3 / 26 | 17 / 63 |
| C6M1 Evacuazione | Delta o Gamma | Custodi | 21 / 57 | 58 / 95 | 26 / 75 |
| C6M2 Le campane | Delta o Gamma | Lanterne | 20 / 57 | 17 / 66 | 31 / 83 |
| C6M3 La strada che sale | Delta o Gamma | Compagnia Lete | 9 / 46 | 28 / 89 | 38 / 98 |
| C6M4 Chi trova, di nuovo | Delta o Gamma | Mito | 0 / 0 | 12 / 62 | 62 / 86 |
| C6M5 Lo sguardo | Delta | Macchina o Entità | 2 / 25 | 2 / 51 | 25 / 79 |
| C7M1 Porto chiuso | Delta o Gamma | Lanterne | 16 / 55 | 64 / 97 | 68 / 97 |
| C7M2 I ponti mobili | Delta o Gamma | Custodi | 3 / 26 | 27 / 85 | 48 / 93 |
| C7M3 Il prestanome | Delta o Gamma | Banco | 25 / 58 | 42 / 86 | 58 / 95 |
| C7M4 Il rilancio | Delta o Gamma | Sciolti | 4 / 37 | 17 / 78 | 27 / 93 |
| C7M5 Aggiudicata | Delta | Mestiere | 1 / 10 | 4 / 26 | 8 / 35 |
| C8M1 Il protocollo | Delta o Gamma | Lanterne | 40 / 81 | 58 / 96 | 71 / 99 |
| C8M2 Il vincolo | Delta o Gamma | Mito | 20 / 76 | 20 / 84 | 58 / 99 |
| C8M3 La linea chiusa | Delta o Gamma | Tecnologia | 8 / 44 | 67 / 99 | 83 / 99 |
| C8M4 Una basta | Delta | Custodi | 1 / 16 | 3 / 39 | 14 / 79 |
| C8M5 L'occhio solo | Delta o Gamma | Creatura | 1 / 10 | 4 / 30 | 19 / 85 |
| C9M1 La stima | Delta o Gamma | Mestiere | 36 / 75 | 47 / 93 | 58 / 98 |
| C9M2 Pezzi unici | Delta o Gamma | Strappo | 6 / 49 | 25 / 87 | 28 / 93 |
| C9M3 La lingua | Delta o Gamma | Mito | 3 / 18 | 28 / 76 | 74 / 96 |
| C9M4 Il caveau | Delta | Sciolti | 1 / 19 | 9 / 69 | 24 / 88 |
| C9M5 Interessi | Delta o Gamma | Lanterne | 0 / 2 | 1 / 23 | 4 / 40 |
| C10M1 Coprifuoco | Delta o Gamma | Custodi | 6 / 17 | 43 / 92 | 50 / 93 |
| C10M2 Chi l'ha vista | Delta o Gamma | Segno | 5 / 30 | 13 / 68 | 19 / 77 |
| C10M3 La taglia | Delta o Gamma | Macchina | 5 / 30 | 27 / 88 | 1 / 28 |
| C10M4 Il pozzo | Delta o Gamma | Lanterne | 2 / 19 | 6 / 33 | 6 / 47 |
| C10M5 Scatola nera | Delta o Gamma | Strappo | 1 / 7 | 3 / 20 | 3 / 43 |
| C11M1 Sacchi di sabbia | Delta o Gamma | Mestiere | 13 / 46 | 29 / 86 | 2 / 34 |
| C11M2 Quaranta braccia | Delta o Gamma | Lanterne | 1 / 3 | 27 / 74 | 27 / 82 |
| C11M3 Il battito | Delta | Custodi | 3 / 21 | 4 / 28 | 15 / 70 |
| C11M4 Il meteo | Delta | Tecnologia | 3 / 21 | 1 / 16 | 6 / 42 |
| C11M5 Vento di terra | Delta o Gamma | Segno | 2 / 9 | 0 / 13 | 8 / 36 |
| C12M1 La traversata | Delta o Gamma | Sciolti | 22 / 70 | 57 / 96 | 50 / 97 |
| C12M2 Il faro | Delta o Gamma | Custodi | 3 / 27 | 18 / 66 | 19 / 55 |
| C12M3 Chi torna | Delta | Mito o Strappo | 8 / 38 | 9 / 66 | 33 / 86 |
| C12M4 L'occhio | Delta | Lanterne | 1 / 14 | 0 / 15 | 7 / 35 |
| C12M5 Il brutto tempo | Delta | Figli dell'Ultima | 2 / 18 | 0 / 13 | 34 / 91 |
- **Rarità e Tratti:** con una squadra buona ogni stella Rarità si vince almeno il 13% delle volte (le più dure sono C11M4, C11M5, C12M4 e C12M5, tra il 13% e il 16%) e ogni stella Tratti almeno il 28%; con una squadra casuale le più dure scendono sotto l'1%. Le rarità costano poco: i budget delle abilità sono vicini (in media 54 punti per un Delta, 61 per un Omega) e una squadra di Delta e Gamma vince quasi quanto una casuale; solo Delta, senza poteri, pesa di più dal Capitolo 4 della Stagione 2. Certi tratti aiutano: contro il boss del Capitolo 3 una squadra di Tecnologia vince più di una squadra qualsiasi.
- **Cambiate dopo la prova:** in C4M5 Mestiere (2%) è diventato Macchina, e in C4M4 Macchina è diventato Strappo; in C10M5 Tecnologia (0%) è diventato Strappo, in C11M4 Magia (0%) Tecnologia; solo Delta è diventato Delta o Gamma sui boss C5M5, C8M5, C9M5, C10M5 e C11M5 (dal 3% all'8% con la squadra buona, 19% in C5M5) e in C10M4 (10%).
- **Il 3-0 non si sceglie:** dipende dalla missione. Con una squadra buona va dallo 0% al 93%; sui boss dal 2% al 25% (52% in C2M5). In C5M5 e C6M4 è praticamente impossibile (0% anche con la squadra buona) e in C9M5 e C11M2 quasi (2-3%): in quelle missioni c'è un round che il giocatore non vince quasi mai.

**Capitolo 1, Il porto:**

| Missione | Avversario | Bot | Livelli | Premio |
|---|---|---|---|---|
| 1. Primo incarico | La banda di Foundling (5 Delta) | Facile | 1·2·3·4·5 | 30 monete |
| 2. Il pugile di vetro | Gli esattori di Cullet | Medio | 1·2·3·4·5 | 40 monete |
| 3. Blackout | Gli ingegneri di Blackbody | Medio | 1·2·3·4·5 | 50 monete |
| 4. Campane a mezzanotte | I Figli dell'Ultima | Difficile | 1·2·3·4·5 | 60 monete |
| 5. Il caveau | Ottavia e la Compagnia Lete (2 Alfa, tra cui Vetrix) | Super Pro | 1·2·3·4·6 | 80 monete e la carta Vetrix (Alfa) |

Squadre e Minacce sono tarate con la simulazione. La prima Minaccia di ogni missione è a tema, le altre sono scelte perché un giocatore con una squadra casuale che manda sempre la carta col punteggio più alto vinca circa l'81%, 57%, 55%, 50% e 34% delle volte. Con i budget per rarità (§4.3) la squadra casuale è più forte e le percentuali diventano circa 87%, 73%, 66%, 52% e 33%: le missioni 2 e 3, con avversari quasi tutti Delta e Gamma, sono più facili di prima. Minacce tutte "a tema", cioè quelle in cui gli avversari sono più forti, rendevano anche la prima missione quasi impossibile (circa 20%).

**Capitolo 2, Il sismografo:**

| Missione | Avversario | Bot | Livelli | Premio |
|---|---|---|---|---|
| 1. Ultima corsa | Patina e le nuove reclute (5 Delta) | Medio | 2·1·3·5·4 | 40 monete |
| 2. Il cane a tre teste | Cerbero e i Figli dell'Ultima | Medio | 4·1·5·2·3 | 50 monete |
| 3. Onde corte | Lullaby e Credo | Difficile | 2·6·1·4·3 | 60 monete |
| 4. Due Reggenti | Ottavia e gli Sciolti | Difficile | 2·4·1·6·3 | 70 monete |
| 5. Chi trova | Vera Kross e i Figli (1 Alfa, Vera Kross) | Super Pro | 1·3·6·2·4 | 90 monete e la carta Vera Kross (Alfa) |

Stesso metodo del Capitolo 1, sul catalogo a 122 personaggi (10.000 partite per missione con il bot Medio, 6.000 con Difficile, 2.800 con Super Pro): il giocatore con la squadra casuale vince circa l'81%, 69%, 61%, 45% e 26% delle volte. Il Capitolo 1, rimisurato nelle stesse condizioni, dà 86%, 74%, 73%, 53% e 29%: ogni missione è un po' più dura della corrispondente, e la prima resta la più facile del capitolo. La prima Minaccia di ogni missione è a tema; i Figli sono forti in mente e magia, e con più Minacce di quel tipo il boss scendeva sotto il 10%.

**Capitolo 3, Undici piani:**

| Missione | Avversario | Bot | Livelli | Premio |
|---|---|---|---|---|
| 1. Lo sportello | Abeyance e la fila (5 Delta) | Medio | 1·4·2·5·3 | 50 monete |
| 2. Le rampe | Gradus e l'ufficio rischi | Medio | 3·1·5·2·4 | 60 monete |
| 3. Il debito | Collateral e i cacciatori | Difficile | 5·2·4·1·3 | 70 monete |
| 4. Il furto | Larceny e gli Sciolti | Difficile | 4·2·6·1·3 | 80 monete |
| 5. La fornace | Ottavia e il Banco (1 Alfa, Auctor) | Super Pro | 5·1·3·6·2 | 100 monete e la carta Auctor (Alfa) |

Stesso metodo, con il catalogo delle Minacce che il server dà ai bot dopo le Minacce dei luoghi (§5.4): 75 Minacce, con le loro regole. Il giocatore con la squadra casuale vince circa il 77%, 66%, 56%, 44% e 20% delle volte (10.000 partite con il bot Medio, 6.000 con Difficile, 4.000 con Super Pro). Nelle stesse condizioni il Capitolo 2 dà 81%, 70%, 60%, 73% e 24%: la missione 4 del Capitolo 2 era al 46% con le sole 60 Minacce di Nuova Megara, e il bot Difficile, che stima i round futuri sul catalogo, ora la gioca molto peggio. Il Capitolo 3 è tarato sul 45% previsto, quindi ogni missione resta un po' più dura della corrispondente e la prima è la più facile del capitolo. Solo Minacce di Nuova Megara, perché il capitolo non esce dalla torre; la prima di ogni missione è a tema (Terminale bloccato, Labirinto di specchi, Caccia nel buio, Colpo al caveau, Reattore in fusione).

**Capitolo 4, Multitude:**

| Missione | Avversario | Bot | Livelli | Premio |
|---|---|---|---|---|
| 1. Pensieri di nessuno | Lullaby e il coro | Medio | 1·3·5·2·4 | 60 monete |
| 2. La negoziatrice | Gli Echi dei Custodi | Medio | 2·4·1·5·3 | 70 monete |
| 3. Sentire troppo | Gli Echi delle Lanterne | Difficile | 5·3·1·4·2 | 80 monete |
| 4. Facce note | Ottavia e le spie | Difficile | 2·6·1·4·3 | 90 monete |
| 5. Ultima voce | Antiphon e Multitude (1 Omega, Multitude, che non è il premio) | Super Pro | 3·6·1·5·2 | 110 monete e la carta Antiphon (Beta) |

Stesso metodo del Capitolo 3; motore delle partite e catalogo (122 personaggi, 75 Minacce con le loro regole) non sono cambiati. Il giocatore con la squadra casuale vince circa il 73%, 62%, 50%, 41% e 16% delle volte (10.000 partite con il bot Medio, 6.000 con Difficile, 4.000 con Super Pro). Il Capitolo 3, rimisurato nelle stesse condizioni, dà 77%, 67%, 56%, 45% e 21%: ogni missione è un po' più dura della corrispondente e la prima resta la più facile del capitolo. Solo Minacce di Nuova Megara, perché il capitolo resta nei quartieri alti; la prima di ogni missione è a tema (Incubo ricorrente, Ostaggio in banca, Epidemia di follia, Spia infiltrata, Mente alveare). Il boss schiera solo le voci dei Figli, forti in mente e magia, e la sua percentuale dipende moltissimo dalle Minacce (dal 3% al 95% tra le combinazioni provate): con quelle scelte il giocatore vince quasi sempre Collasso della città (98%), un round su tre la Minaccia d'apertura, e di rado gli altri tre (4-14%).

**Capitolo 5, La porta:**

| Missione | Avversario | Bot | Livelli | Premio |
|---|---|---|---|---|
| 1. Il trono di rame | Mekana e la Compagnia (1 Alfa, Mekana) | Medio | 2·5·1·4·3 | 70 monete |
| 2. Il decreto | Attainder e l'ufficio legale | Medio | 6·1·3·2·4 | 80 monete |
| 3. Le colonne | Il picchetto dei Custodi | Difficile | 3·5·1·4·2 | 90 monete |
| 4. La vecchia licenza | Renata e le vecchie lastre (1 Alfa, Talos) | Difficile | 5·2·6·1·3 | 100 monete |
| 5. Nessuno passa | Keelstone e i Custodi (2 Alfa, Keelstone e Impetus) | Super Pro | 4·1·6·2·5 | 120 monete e la carta Keelstone (Alfa) |

Stesso metodo, sul catalogo attuale: 187 personaggi (65 in più dal Capitolo 4) e 75 Minacce con le loro regole. Il giocatore con la squadra casuale vince circa il 67%, 49%, 45%, 29% e 17% delle volte (10.000 partite con il bot Medio, 6.000 con Difficile, 4.000 con Super Pro). Il Capitolo 4, rimisurato nelle stesse condizioni, dà 69%, 52%, 69%, 31% e 20%: ogni missione è più dura della corrispondente e la prima resta la più facile del capitolo. **Il Capitolo 4 si è spostato:** era tarato su 73%, 62%, 50%, 41% e 16%. Lo sposta solo la squadra casuale del giocatore, che ora pesca anche i personaggi nuovi: con il giocatore limitato ai 122 personaggi di allora tornano 73%, 62%, 49% e 40%, mentre il catalogo che i bot usano per stimare i round non cambia nulla. Le missioni 2 e 4 sono diventate più dure, la 3 molto più facile; i Delta e Gamma nuovi hanno valori più a picchi dei vecchi (somma dei quadrati media circa 385 contro 320). Il Capitolo 5 è tarato sui valori nuovi, quindi la missione 3 è molto più dura della corrispondente; ritarare il Capitolo 4 resta da fare. Solo Minacce di Nuova Megara, perché il capitolo resta in città; la prima di ogni missione è a tema (Tempesta elettrica, Cospirazione globale, Assedio al municipio, Titano di metallo, Portale instabile).

**Capitolo 6, Mongibello** (finale della Stagione 1):

| Missione | Avversario | Bot | Livelli | Premio |
|---|---|---|---|---|
| 1. Evacuazione | Kiln e i fuochisti | Medio | 3·1·5·2·4 | 80 monete |
| 2. Le campane | Belladonna e Tacet | Medio | 2·4·1·5·3 | 90 monete |
| 3. La strada che sale | Rubicon e la banda (1 Alfa, Mischance) | Difficile | 2·5·1·4·3 | 100 monete |
| 4. Chi trova, di nuovo | Vera Kross e i segugi (1 Alfa, Vera Kross) | Difficile | 5·2·6·1·3 | 110 monete |
| 5. Lo sguardo | Ottavia e i Figli (2 Alfa, Effigy e Groma) | Super Pro | 5·1·6·2·4 | 130 monete e la carta Effigy (Alfa) |

Stesso metodo del Capitolo 5, sullo stesso catalogo: 187 personaggi e 75 Minacce comuni con le loro regole. Le 29 Minacce rare (§5.15) non entrano nelle missioni né in quello che i bot sanno dei round futuri, come nel server; le ricompense delle partite (§8.4, riga `story`) si aggiungono ai premi della missione e non cambiano la partita. Il giocatore con la squadra casuale vince circa il 65%, 48%, 43%, 26% e 15% delle volte (10.000 partite con il bot Medio, 6.000 con Difficile, 4.000 con Super Pro). Il Capitolo 5, rimisurato nelle stesse condizioni, dà 67%, 50%, 45%, 28% e 17%: ogni missione è un po' più dura della corrispondente, la prima resta la più facile del capitolo e il boss è la sfida più dura della stagione. Con altri 30 personaggi (P188-P217) nella squadra casuale del giocatore le percentuali diventano circa 65%, 44%, 39%, 27% e 13%. Solo Minacce di Nuova Megara, perché nessun luogo del catalogo è il vulcano; la prima di ogni missione è a tema (Laboratorio in fiamme, Ipnotizzatore, Gang dei motociclisti, Caccia nel buio, Culto dell'eclissi). Con Gigante risvegliato come prima Minaccia del boss il giocatore vinceva quel round quasi 8 volte su 10 e il boss non scendeva sotto il 19%.

**Stagione 2, Capitolo 1, L'asta** (nell'ordine di tutta la storia è il capitolo 7, missioni C7M1-C7M5):

| Missione | Avversario | Bot | Livelli | Premio |
|---|---|---|---|---|
| 1. Porto chiuso | Lagan e gli Sciolti | Medio | 3·1·5·2·4 | 90 monete |
| 2. I ponti mobili | Indemnity e i rimorchiatori | Medio | 1·4·2·5·3 | 100 monete |
| 3. Il prestanome | Histrio e la claque | Difficile | 2·5·1·4·3 | 110 monete |
| 4. Il rilancio | Errata e la Compagnia (2 Alfa, Mekana e Vetrix) | Difficile | 4·2·6·1·3 | 120 monete |
| 5. Aggiudicata | Ottavia e il Banco (1 Alfa, Harrow) | Super Pro | 2·5·1·6·4 | 140 monete e la carta Gauger (Beta) |

Stesso metodo del Capitolo 6, sul catalogo attuale: 217 personaggi (i 30 nuovi, P188-P217, ora sono anche nella squadra casuale del giocatore) e 75 Minacce comuni con le loro regole; le Minacce rare restano fuori dalle missioni e da quello che i bot sanno. Il giocatore con la squadra casuale vince circa il 63%, 42%, 38%, 24% e 11% delle volte (10.000 partite con il bot Medio, 6.000 con Difficile, 4.000 con Super Pro). Il Capitolo 6 della Stagione 1, rimisurato nelle stesse condizioni, dà 66%, 45%, 39%, 27% e 14%: ogni missione è un po' più dura della corrispondente, la prima resta la più facile del capitolo e il boss la più dura. Solo Minacce di Nuova Megara, perché il capitolo non esce dal porto; la prima di ogni missione è a tema (Contrabbando al porto, Rissa al porto, Spia infiltrata, Colpo al caveau, Ostaggio in banca). Con Tribunale degli spettri come prima Minaccia del boss il giocatore vinceva quel round quasi 9 volte su 10; con Ostaggio in banca, dove le lastre del Banco sono più forti, circa una volta su quattro. Le monete proseguono la progressione della Stagione 1 (da 90 a 140; la Storia ne paga 2.870 in tutto).

**Stagione 2, Capitolo 2, Tra due onde** (nell'ordine di tutta la storia è il capitolo 8, missioni C8M1-C8M5):

| Missione | Avversario | Bot | Livelli | Premio |
|---|---|---|---|---|
| 1. Il protocollo | Custos e l'archivio | Medio | 3·5·1·4·2 | 100 monete |
| 2. Il vincolo | Injunction e la Soprintendenza | Medio | 2·5·1·4·3 | 110 monete |
| 3. La linea chiusa | Holloway e gli Sciolti | Difficile | 3·5·1·4·2 | 120 monete |
| 4. Una basta | Hecatomb e i Figli | Difficile | 3·6·1·5·2 | 130 monete |
| 5. L'occhio solo | Polifemo e la Compagnia (1 Alfa, Antecessor) | Super Pro | 4·1·6·2·5 | 150 monete e la carta Polifemo (Beta) |

Stesso metodo e stesso catalogo del Capitolo 1 della Stagione 2 (217 personaggi, 75 Minacce comuni con le loro regole; le Minacce rare restano fuori dalle missioni e da quello che i bot sanno). Il giocatore con la squadra casuale vince circa il 60%, 38%, 36%, 21% e 9% delle volte (10.000 partite con il bot Medio, 6.000 con Difficile, 4.000 con Super Pro). Il Capitolo 1, rimisurato nelle stesse condizioni, dà ancora 63%, 42%, 38%, 24% e 11%: ogni missione è un po' più dura della corrispondente, la prima resta la più facile del capitolo e il boss la più dura. Solo Minacce di Nuova Megara, nessuna ripetuta nel capitolo; la prima di ogni missione è a tema (Assedio al municipio, Spettro del museo, Rapina al treno blindato, Ladro fantasma, Mostro delle fogne). Le squadre partono dalle carte principali della scheda (STORY §6.5) e le completano; nella missione 4 i tre Figli della scheda sono forti quasi solo in mente e magia, e con Groma come quarta carta la missione non scendeva sotto il 25%: Falx e Cineris coprono comando, furia ed energia. Con Gigante risvegliato come prima Minaccia del boss il giocatore vinceva quel round 2-4 volte su 100; con Mostro delle fogne circa una volta su nove, e il boss resta il più duro della stagione finora. Monete da 100 a 150; la Storia ne paga 3.480 in tutto.

**Stagione 2, Capitolo 3, Il pegno** (nell'ordine di tutta la storia è il capitolo 9, missioni C9M1-C9M5):

| Missione | Avversario | Bot | Livelli | Premio |
|---|---|---|---|---|
| 1. La stima | Necropsy e i periti | Medio | 2·5·1·4·3 | 110 monete |
| 2. Pezzi unici | Monopsony e la Compagnia | Medio | 5·2·4·1·3 | 120 monete |
| 3. La lingua | Warren e i guardiani | Difficile | 1·4·2·5·3 | 130 monete |
| 4. Il caveau | Regina Ix e il caveau | Difficile | 4·2·6·1·3 | 140 monete |
| 5. Interessi | Principal e il Banco (1 Alfa, Principal, e 1 Omega, Parabellum, che non è il premio) | Super Pro | 5·1·6·2·4 | 160 monete e la carta Principal (Alfa) |

Stesso metodo e stesso catalogo dei Capitoli 1 e 2 della Stagione 2 (217 personaggi, 75 Minacce comuni con le loro regole; le Minacce rare restano fuori dalle missioni e da quello che i bot sanno). Il giocatore con la squadra casuale vince circa il 59%, 37%, 34%, 19% e 7% delle volte (10.000 partite con il bot Medio, 6.000 con Difficile, 4.000 con Super Pro). Il Capitolo 2, rimisurato nelle stesse condizioni, dà ancora 60%, 38%, 36%, 21% e 9%: ogni missione è un po' più dura della corrispondente, la prima resta la più facile del capitolo e il boss la più dura. Solo Minacce di Nuova Megara, nessuna ripetuta nel capitolo; la prima di ogni missione è a tema (Ostaggio in banca, Rete di spionaggio, Allarme silenzioso, Colpo al caveau, Tribunale degli spettri). Le squadre partono dalle carte principali della scheda (STORY §6.5) e le completano con lastre del Banco e della Compagnia. Con Codice cifrato come prima Minaccia della missione 1 il giocatore vinceva quel round al massimo 8 volte su 100; in Allarme silenzioso Warren vince il round quasi sempre, e il terreno ostile che frena i neutrali del Banco lascia al giocatore circa un round su sette. Con Tribunale degli spettri in apertura il giocatore vince il primo round del boss circa una volta su tre; il boss resta poco sotto il Capitolo 2 senza scendere verso lo zero (le varianti di modificatori provate davano dal 6,6% al 10,7%). Monete da 110 a 160; la Storia ne paga 4.140 in tutto.

**Stagione 2, Capitolo 4, Absentia** (nell'ordine di tutta la storia è il capitolo 10, missioni C10M1-C10M5):

| Missione | Avversario | Bot | Livelli | Premio |
|---|---|---|---|---|
| 1. Coprifuoco | Tariffario e gli sciacalli | Medio | 1·5·2·4·3 | 120 monete |
| 2. Chi l'ha vista | Leeward e le Lanterne | Medio | 3·5·1·4·2 | 130 monete |
| 3. La taglia | Hollowbone e i cacciatori | Difficile | 5·1·4·2·3 | 140 monete |
| 4. Il pozzo | Swarf e gli operai (1 Alfa, Mekana) | Difficile | 4·1·6·2·3 | 150 monete |
| 5. Scatola nera | Ottavia e la Compagnia (1 Alfa, Vetrix, e 1 Omega, Matins, che non è il premio) | Super Pro | 1·5·2·6·4 | 170 monete e la carta Eudaemon (Beta) |

Stesso metodo, sul catalogo e sul motore attuali: 231 personaggi (i 14 nuovi, P218-P231, ora sono anche nella squadra casuale del giocatore), Sacrificio che dura fino a fine partita e 75 Minacce comuni con le loro regole; le Minacce rare restano fuori dalle missioni e da quello che i bot sanno. Il giocatore con la squadra casuale vince circa il 58%, 34%, 33%, 17% e 7% delle volte (10.000 partite con il bot Medio, 6.000 con Difficile, 4.000 con Super Pro). Il Capitolo 3, rimisurato nelle stesse condizioni, dà 60%, 37%, 34%, 18% e 8% (era tarato su 59%, 37%, 34%, 19% e 7% con 217 personaggi): ogni missione è un po' più dura della corrispondente, la prima resta la più facile del capitolo e il boss la più dura. Solo Minacce di Nuova Megara, nessuna ripetuta nel capitolo; la prima di ogni missione è a tema (Scippatore, Labirinto di specchi, Caccia nel buio, Terremoto artificiale, Incubo ricorrente). Le squadre partono dalle carte principali della scheda (STORY §6.5) e le completano; nessuna carta con sblocco a livello, come in tutte le missioni, e nelle missioni con il bot Difficile nessun potere che dipende dal personaggio avversario, perché lo rende molto più lento. Con Indizio nascosto come prima Minaccia della missione 2 il giocatore non vinceva mai quel round, con qualunque squadra di Lanterne; in Labirinto di specchi il terreno ostile che frena gli eroi gli lascia circa due round su cinque. Con Cospirazione globale come prima Minaccia del boss il giocatore vinceva quel round 2 volte su 100; con Incubo ricorrente circa una volta su otto. Il modificatore Sottovalutati sull'ultimo round tiene il boss poco sotto il Capitolo 3 senza scendere verso lo zero (le varianti di modificatori provate davano dal 4,5% all'8,8%). Monete da 120 a 170; la Storia ne paga 4.850 in tutto.

**Stagione 2, Capitolo 5, Le Fosse** (nell'ordine di tutta la storia è il capitolo 11, missioni C11M1-C11M5):

| Missione | Avversario | Bot | Livelli | Premio |
|---|---|---|---|---|
| 1. Sacchi di sabbia | Gavel e gli esattori | Medio | 1·4·2·5·3 | 130 monete |
| 2. Quaranta braccia | Byline e la Compagnia | Medio | 6·1·4·2·3 | 140 monete |
| 3. Il battito | Theriarch e i Figli | Difficile | 3·5·1·4·2 | 150 monete |
| 4. Il meteo | Contumax e la redazione | Difficile | 2·6·1·4·3 | 160 monete |
| 5. Vento di terra | Katabatic e la Compagnia (2 Alfa, Katabatic e Mischance) | Super Pro | 2·5·1·6·4 | 180 monete e la carta Katabatic (Alfa) |

Stesso metodo, stesso catalogo e stesso motore del Capitolo 4 della Stagione 2 (231 personaggi, Sacrificio che dura fino a fine partita, 75 Minacce comuni con le loro regole; le Minacce rare restano fuori dalle missioni e da quello che i bot sanno). Il giocatore con la squadra casuale vince circa il 56%, 32%, 31%, 13% e 5% delle volte (10.000 partite con il bot Medio, 6.000 con Difficile, 4.000 con Super Pro). Il Capitolo 4, nelle stesse condizioni, dà 58%, 34%, 33%, 17% e 7%: ogni missione è circa due punti più dura della corrispondente, la prima resta la più facile del capitolo e il boss la più dura. Solo Minacce di Nuova Megara, nessuna ripetuta nel capitolo; la prima di ogni missione è a tema (Muro pericolante, Intelligenza ribelle, Mente alveare, Ipnotizzatore, Tempesta elettrica). Le squadre partono dalle carte principali della scheda (STORY §6.5) e le completano; nessuna carta con sblocco a livello. Kiln e Contumax, carte della scheda, hanno Nemesi, e con loro il bot Difficile è più lento (nella simulazione circa un decimo di secondo a partita). Reus e Vetrix, che sono nelle squadre del Capitolo 4, sono stati sostituiti da Almoner e Mischance; Insula, anche lei del Capitolo 4, è rimasta nella missione 4, perché con Postmark o Blackbody al suo posto la missione diventava molto più facile oppure lasciava al giocatore due round quasi persi. Con Intelligenza ribelle come prima Minaccia della missione 2 il giocatore vinceva quel round 6 volte su 100; il terreno ostile che favorisce gli eroi, la parte di Unbidden, gliene lascia circa uno su cinque. Nella missione 3 i tre Figli della scheda sono forti quasi solo in mente e magia, e senza Falx il giocatore vinceva più della metà delle volte; apre su Mente alveare e non su Caccia nel buio, che apre già la missione 3 del Capitolo 4. Con Tempesta elettrica in apertura il giocatore vince il primo round del boss circa una volta su tre; le varianti di modificatore sull'ultimo round davano dal 4,7% all'8,9%, e quella scelta tiene il boss circa due punti sotto il Capitolo 4, come le altre missioni. Monete da 130 a 180; la Storia ne paga 5.610 in tutto.

**Stagione 2, Capitolo 6, Cariddi** (finale della Stagione 2; nell'ordine di tutta la storia è il capitolo 12, missioni C12M1-C12M5):

| Missione | Avversario | Bot | Livelli | Premio |
|---|---|---|---|---|
| 1. La traversata | Dredge e le barche dei Figli | Medio | 3·1·5·2·4 | 140 monete |
| 2. Il faro | Belladonna e il faro spento | Medio | 5·2·4·1·3 | 150 monete |
| 3. Chi torna | Tenant e i pellegrini | Difficile | 3·5·1·4·2 | 160 monete |
| 4. L'occhio | Vera Kross nell'occhio (2 Alfa, Vera Kross e Groma) | Difficile | 4·2·6·1·3 | 170 monete |
| 5. Il brutto tempo | Clementia e i Figli (2 Alfa, Clementia ed Effigy, e 1 Omega, Wirepuller, che non è il premio) | Super Pro | 6·1·4·2·5 | 190 monete e la carta Clementia (Alfa) |

Stesso metodo, stesso catalogo e stesso motore dei Capitoli 4 e 5 della Stagione 2 (231 personaggi, Sacrificio che dura fino a fine partita, 75 Minacce comuni con le loro regole; le Minacce rare restano fuori dalle missioni e da quello che i bot sanno). Il giocatore con la squadra casuale vince circa il 52%, 28%, 27%, 11% e 4% delle volte (10.000 partite con il bot Medio, 6.000 con Difficile, 4.000 con Super Pro). Il Capitolo 5, rimisurato nelle stesse condizioni, dà ancora 56%, 32%, 31%, 13% e 5%: ogni missione è più dura della corrispondente (le prime quattro di circa tre punti, il boss di circa uno), la prima resta la più facile del capitolo e il boss è la sfida più dura della stagione. Solo Minacce di Nuova Megara, perché il golfo è della città, nessuna ripetuta nel capitolo; la prima di ogni missione è a tema (Contrabbando al porto, Caccia nel buio, Rituale proibito, Portale instabile, Risveglio dell'antico). Le squadre partono dalle carte principali della scheda (STORY §6.5) e le completano con i Figli dell'Ultima, quasi tutti già visti nella stagione: Falx e Dittograph sono anche nella missione 3 del Capitolo 5, i Figli che cercavano Xenolith. Tenant è sia nella missione 3 sia nel boss, come nella scheda, e Praesidium (Sciolti) completa la squadra dell'occhio, perché i Figli che non sono nel Capitolo 5 non bastavano per venticinque posti. Con Tempesta elettrica come prima Minaccia del boss, la più a tema per «Il brutto tempo» ma anche l'apertura del boss del Capitolo 5, il giocatore non vinceva mai quel round con Tenant in squadra, e lo vinceva sempre senza; con Culto dell'eclissi lo vinceva da 1 a 5 volte su 100. Con Risveglio dell'antico, Cariddi al colmo della marea, lo vince circa una volta su dieci. Le varianti di modificatore provate sul boss davano dal 3,8% al 6,8%: quella scelta, un terreno ostile che favorisce i cattivi nel terzo round, lo tiene sotto il Capitolo 5 senza scendere verso lo zero. Monete da 140 a 190; la Storia ne paga 6.420 in tutto.

### 5.12 Grande Minaccia (Boss)

Modalità alternativa alla partita classica: due giocatori, o un giocatore e un bot, affrontano la stessa **Grande Minaccia**, un Boss con **5 fronti** visibili dall'inizio. Nome provvisorio. Si gioca contro i bot (4 difficoltà) o in amichevole tra giocatori (avversario casuale o codice amico); niente Conquista per ora.

1. **Squadra:** 5 personaggi diversi, segreta come sempre, scelta **prima** di vedere il Boss (altrimenti vincerebbe chi ha la collezione più grande, con lo specialista giusto per ogni fronte).
2. **Il Boss:** il server lo estrae tra quelli attivi. Ogni Boss ha 5 fronti, Minacce di Nuova Megara scelte a mano, con livelli composti come in §5.4 (almeno uno di livello 1-2, almeno uno di 5-6, somma 14-20). Nome, livello e abilità di ogni fronte sono visibili dall'inizio; niente modificatori sorteggiati né Minacce dei luoghi.
3. **Tabella dei punti, tutta visibile dall'inizio (5 turni × 5 fronti):** ogni turno **2 fronti a caso sono caldi**, scelti tra quelli che non erano caldi nel turno prima, e valgono **2 al turno 1, 3 al turno 2, e così via fino a 6**; gli altri valgono **1**. Esempio: 2·2·1·1·1 → 1·1·3·3·1 → 4·1·1·1·4 → 1·5·5·1·1 → 1·1·1·6·6. Un fronte che ha pagato molto torna a 1 nel turno dopo: più casualità e più occasioni di rimonta. (Chiesto dall'utente il 9 novembre 2026; prima tutti i fronti crescevano di 1 a turno e 2 a caso di 1 in più.) Questi sono i valori predefiniti (`balance.ts`): gli admin li cambiano dalla pagina **Grande Minaccia** (`/gestione-minaccia`, link in fondo all'informativa): quanti fronti caldi per turno, il loro valore al turno 1, di quanto cresce ogni turno e il valore degli altri fronti (da 0 a 20). Valgono per le partite create dopo il salvataggio; una partita in corso tiene la sua tabella. Sono le chiavi `boss.*` di `game_config`, quindi `npm run test:db` segnala la differenza dai valori predefiniti senza fallire.
4. **Turno (5, una carta per turno):** in segreto e in contemporanea ognuno mette **un personaggio su uno dei suoi fronti liberi**. Il personaggio **resta su quel fronte fino alla fine** e il fronte non è più libero per quel giocatore; l'avversario può ancora usarlo. Dopo 5 turni ognuno ha un personaggio su ogni fronte. Timer di 30 secondi; allo scadere il server mette una carta a caso sul fronte libero che in quel turno vale di più.
5. **Punteggio fisso:** un personaggio fa il suo punteggio quando entra (abilità del fronte, poteri e bonus di quel turno) e lo tiene per tutta la partita.
6. **A ogni turno, dopo gli ingressi, ogni fronte occupato paga il suo valore di quel turno:** al personaggio da solo, **sempre**; se ci sono tutti e due, a chi ha il punteggio più alto (spareggi come in un round, §5.6: Implacabile, valore singolo più alto, altrimenti nessuno). Chi entra presto su un fronte incassa più turni; chi arriva dopo con un punteggio più alto lo prende da quel turno in poi.
7. **Fine:** dopo 5 turni vince chi ha più punti; a parità chi ha tenuto più fronti (contati turno per turno); poi la somma dei punteggi dei personaggi; poi pareggio.
8. **Poteri** (turno = round, "round vinti" = fronti tenuti finora, turno per turno):
   - un personaggio che entra su un fronte dove c'è già un personaggio avversario, o dove ne entra uno nello stesso turno, lo affronta come in un round: Sabotatore, Annullatore, Nemesi, Davide, Contrattacco, Schermato, Opportunista e Riflesso agiscono su quello. Il punteggio di chi è già sul fronte non cambia;
   - Riscossa, Slancio e Vendetta guardano come è andato il proprio personaggio entrato nel turno prima, sul suo fronte; Crescendo il livello di quel fronte; Grande prova i livelli dei 5 fronti; Capobranco e Sacrificio valgono per i personaggi che entrano nei turni dopo (chi è già su un fronte tiene il suo punteggio);
   - **Veggente qui non serve**, perché è già tutto visibile. Segnalato, nessuna modifica.
9. **Premi:** come bot e amichevoli (§13.1): nessuna moneta, esperienza normale, punti evento del tipo di partita (bot o amichevole), statistiche normali.

**Storia della regola:** la prima versione (9 novembre 2026) non lasciava le carte sui fronti: ogni turno i due giocatori sceglievano carta e fronte, sullo stesso fronte vinceva il punteggio più alto, da soli serviva la soglia di presidio (metà dell'Emergenza). Lo stesso giorno, dopo averla provata, l'utente ha chiesto le carte fisse sui fronti, con il fronte che paga sempre a chi è da solo. Le partite in corso con la prima regola sono state chiuse come pareggi abbandonati, senza premi.

**Bot:** vedono solo ciò che vede un giocatore (Boss, tabella, i propri personaggi, il tabellone con i personaggi già entrati e i loro punteggi).

| Difficoltà | Comportamento |
|---|---|
| **Facile** | Carta e fronte a caso, preferendo le mosse che rendono qualcosa. |
| **Medio** | Avido: la carta e il fronte che rendono più punti da ora alla fine, contro chi c'è già. |
| **Difficile** | Monte Carlo leggero: per le 4 mosse migliori gioca 160 partite plausibili e sceglie la migliore. |
| **Super Pro** | Monte Carlo pieno: le 8 mosse migliori, 800 partite plausibili, con mani avversarie coerenti con quello che ha già visto. |

Le squadre dei bot si costruiscono come in §5.9.

**Simulazioni** (catalogo reale a 122 personaggi, 60 Minacce di Nuova Megara; 2.000 partite per riga, 300 con il Monte Carlo; tra parentesi la prima versione):

| Prova | Risultato |
|---|---|
| Alfa+Omega contro Delta, Gamma contro Delta | 87% (86%), 65% (65%) |
| Giocare bene contro l'avido, stessa squadra | circa 45-50% (84%) |
| Giocare bene contro l'avido, squadre casuali | 62% (67%) |
| Delta giocato bene contro Alfa+Omega giocato in modo semplice | 16% (34%) |
| Pareggi tra squadre diverse, rimonte (vince chi era indietro dopo il turno 3) | circa 0% (1,6%), 7-12% (27%) |

Con i fronti caldi a rotazione (2.000 partite per riga, 300 col Monte Carlo): Alfa+Omega contro Delta 86%, Gamma contro Delta 64%; Delta giocato bene contro Alfa+Omega giocato in modo semplice 41% (34% con la tabella di prima), con il Monte Carlo 22% (16%); le rimonte restano intorno al 10-12% tra bot avidi o pianificatori; i punti a fine partita scendono a circa 21 a testa (44 prima). Con le carte fisse la squadra pesa come prima, ma chi prende il vantaggio nei primi turni di solito lo tiene e la bravura conta meno: alla fine ognuno ha un personaggio su ogni fronte, e la partita è soprattutto decidere quale carta va dove e quando. Con i bot del motore (`scripts/simulate-boss.mts`, 400 partite a squadre casuali): Medio batte Facile il 76%, Difficile batte Medio il 56%, Super Pro batte Medio il 63%; Super Pro e Difficile si equivalgono (la differenza tra i due viene soprattutto dalla squadra, §5.9).

**Tecnica:** motore in `packages/game-engine/src/boss.ts` e `boss-bots.ts`; numeri in `balance.ts` (`boss`) e `game_config` (`boss.*`); Boss in `boss_definitions` e `boss_fronts` (6 Boss segnaposto); una partita è una riga di `matches` con `format = 'boss'`, `boss_id`, `boss_values` (la tabella) e `points_a`/`points_b`; `mode` resta `bot` o `friendly`. Ogni turno è una riga di `match_rounds` senza Minaccia, con `holders` (chi ha tenuto ogni fronte in quel turno); ogni giocata in `round_plays` ha `front_slot` (dove resta) e `points` (quanto ha preso il giocatore in quel turno da tutti i fronti). La funzione `match_record_boss_turn` controlla turno, carte, che ognuno entri su un suo fronte libero, chi tiene ogni fronte rispetto ai punteggi sul tabellone, i punti rispetto alla tabella e il risultato finale. Edge Function `match`: azioni `boss_start` e `boss_play`; tra giocatori `submit` riceve anche il fronte, `queue` il formato, e il codice amico porta il formato con sé.

### 5.13 Allarme Triplo

Modalità alternativa alla partita classica, chiesta dall'utente il 10 novembre 2026: tre Minacce fisse e un mazzo di nove carte. Si gioca contro i bot (4 difficoltà) o in amichevole tra giocatori (avversario casuale o codice amico); niente Conquista per ora.

1. **Mazzo:** 9 personaggi diversi (`definition_id` tutti diversi, come in §5.2), scelto **prima** di vedere le Minacce. Le 10 carte iniziali bastano.
2. **Minacce:** il server estrae **3 Minacce di Nuova Megara completamente a caso**, di qualsiasi livello (nessuna regola di composizione: possono uscire tre Minacce di livello 1 o tre di livello 6). Sono visibili dall'inizio e restano le stesse per tutta la partita. Modificatori come in §5.4 (1 o 2 sulle tre, sorteggiati una volta e validi in tutti i round); niente Minacce dei luoghi.
3. **Pesca:** all'inizio il server mescola i due mazzi. Ogni round ogni giocatore pesca le 3 carte successive del proprio mazzo: dopo 3 round tutte e 9 sono state giocate.
4. **Round (3):** in segreto e in contemporanea ognuno mette **una carta su ogni Minaccia**. Timer di 45 secondi per piazzarle tutte; allo scadere il server le piazza a caso. Tra giocatori la scelta si può cambiare fino alla risoluzione.
5. **Su ogni Minaccia** le due carte si confrontano come in un round (§5.5-§5.6): punteggio, poi Implacabile, poi valore singolo più alto, altrimenti nullo. Chi vince prende **1 punto**; un confronto nullo non dà punti.
6. **Fine:** dopo 3 round vince chi ha più punti (massimo 9); a parità la somma dei punteggi di tutte le carte; poi pareggio.
7. **Poteri** (il round è il round della partita, le Minacce vinte sono i round vinti, la squadra è il mazzo di 9):
   - ogni Minaccia è una corsia: Riscossa, Slancio, Catalizzatore, Riverbero e Vendetta guardano la propria carta **sulla stessa Minaccia nel round prima** e passano il bonus alla carta che ci andrà nel round dopo;
   - Apripista e Ultimo baluardo leggono il round come il suo posto in una partita classica (1 → 1, 2 → 3, 3 → 5): Apripista vale solo nel round 1, Ultimo baluardo solo nel round 3;
   - Crescendo non scatta mai (la Minaccia di una corsia ha sempre lo stesso livello); Veggente non serve (tutto è visibile): segnalati, nessuna modifica;
   - Sabotatore, Annullatore, Nemesi, Davide, Contrattacco, Schermato, Opportunista e Riflesso agiscono sulla carta avversaria della stessa Minaccia; Spia svela una carta del mazzo avversario non ancora giocata; Capobranco e Sacrificio contano le carte dei round precedenti, quindi il bonus di Sacrificio vale su tutte e tre le Minacce dal round dopo (Sacrificio cede solo la propria Minaccia); Legame conta tutto il mazzo di 9.
8. **Premi:** come bot e amichevoli (§13.1): nessuna moneta, esperienza normale, punti evento del tipo di partita, statistiche normali.

**Il round sulla mappa** (14 novembre 2026, solo presentazione): il risultato di un round si racconta sulla mappa di Nuova Megara (`public/world/mappa-megara.svg`, nove zone: Necropoli, Quartieri alti, Vulcano, Centro dei templi, Stazione e metrò, Quartieri popolari, Lungomare, Porto, Cantiere dell'Ora Zero). Ogni Minaccia di Nuova Megara ha la sua zona (`threat_definitions.district`, che gli admin possono cambiare con `admin_set_threat_district`); le Minacce senza zona (le rare) ne prendono una dal nome, sempre la stessa. Le tre Minacce si accendono su un punto della loro zona (quattro punti per zona, mai lo stesso per due Minacce del round); la vista va su ciascuna, lo scontro sale dal segnaposto come tavola a fumetti (§11.7), poi si richiude e il segnaposto prende il colore di chi ha vinto; alla fine la mappa intera con il totale. Dal secondo round il server aspetta fino a `triple.reveal_pause_seconds` (50) prima del timer: le tavole se ne vanno prima quando sono finite, e i secondi avanzati restano per piazzare.

**Bot:** vedono solo ciò che vede un giocatore (le tre Minacce, la propria mano, i risultati e le carte avversarie già giocate). Facile: piazzamento quasi a caso, preferendo quelli buoni. Medio: il piazzamento che vince più Minacce contro un personaggio tipico. Difficile e Super Pro: Monte Carlo su 150 e 600 mani avversarie plausibili, piazzate come le piazzerebbe Medio; nell'ultimo round cercano la vittoria della partita, prima le Minacce vinte. I mazzi dei bot si costruiscono come in §5.9 (9 carte).

**Simulazioni** (`scripts/simulate-triple.mts`, catalogo reale a 122 personaggi e 60 Minacce di Nuova Megara, senza modificatori, 600 partite per riga):

| Prova | Risultato | Partita classica |
|---|---|---|
| Alfa+Omega contro Delta (Medio contro Medio) | 94,5% | 87% |
| Gamma contro Delta | 71% | 63-65% |
| Beta contro Gamma | 69% | 65% |
| 2 Alfa/Omega + 7 Delta contro 9 Delta | 65% | – |
| Delta giocato bene (Difficile) contro Alfa+Omega (Medio) | 6,5% | – |
| Stesso mazzo: Medio contro piazzamento a caso | 95,5% | – |
| Stesso mazzo: Difficile contro Medio | 52% (pari) | circa 50% |
| Stesso mazzo: chi vede le carte avversarie contro Medio | 67% | 75% |
| Medio contro Facile, Super Pro contro Medio (mazzi casuali) | 80%, 48% | – |
| Stessi mazzi e stesse Minacce, cambia solo la pesca | il mazzo più debole vince in media il 22% grazie alla pesca; nel 32% delle coppie il mazzo decide sempre (≥ 90%) | – |
| Pareggi, parità di punti decisa dai punteggi, confronti nulli | 0,2%, 7,5%, 0,3 per partita; scarto medio 2 punti | – |

Conclusioni: mettere ogni carta sulla Minaccia giusta conta molto (contro chi piazza a caso si vince il 95%), ma oltre il piazzamento "avido" leggere l'avversario non aiuta: il Monte Carlo non batte Medio, e anche chi vedesse le carte avversarie vincerebbe solo il 67%. La pesca pesa davvero, circa una partita su cinque per il mazzo più debole, ma meno del mazzo: con nove confronti invece di "chi arriva a 3" la squadra conta **più** che nella partita classica (Alfa+Omega contro Delta 94,5% contro 87%). Come chiesto dall'utente (soluzione C), nessuna correzione alle regole finché non ci sono dati reali; le leve possibili sono "pescane 4, giocane 3" o un cambio di carta per partita.

**Tecnica:** motore in `packages/game-engine/src/triple.ts` e `triple-bots.ts`; numeri in `balance.ts` (`triple`) e `game_config` (`triple.*`). Una partita è una riga di `matches` con `format = 'triple'`; ogni confronto (una Minaccia in un round) è una riga di `match_rounds`, come un round classico: confronto c = (round − 1) × 3 + Minaccia, quindi `threat_ids` e `threat_levels` contengono le tre Minacce tre volte, i modificatori si sorteggiano sulle tre e si ripetono, `current_round` è il primo confronto del round in corso e `rounds_won_*` sono i punti. L'ordine di pesca è l'ordine di `match_teams.card_instance_ids`, mescolato dal database alla creazione e mai letto dai client: il payload (`triple_state_payload`) mostra il mazzo in un ordine neutro e solo le mani dei round già aperti. `match_record_triple_round` controlla che ognuno giochi esattamente le carte pescate, una per Minaccia, le scelte inviate o la scadenza, chi vince ogni Minaccia rispetto ai punteggi e il risultato; `match_submit_triple` riceve le tre carte in una volta (le scelte di una carta sola sono rifiutate). Edge Function `match`: azioni `triple_start`, `triple_play`, `triple_submit`; `queue` e il codice amico portano il formato.

### 5.14 Quadrante

Modalità alternativa alla partita classica, chiesta dall'utente il 12 novembre 2026 sulla base del suo prototipo FLIP: una griglia 4×4 riempita a turno, con quattro abilità come lati delle carte. Si gioca contro i bot (4 difficoltà) o in amichevole tra giocatori (avversario casuale o codice amico); niente Conquista per ora. Due griglie, ognuna con la sua coda: **fissa** (`format = 'quadrant'`) e **mobile** (`'quadrant_shifting'`).

1. **Mazzo:** 10 personaggi diversi (`definition_id` tutti diversi, come in §5.2), scelto **prima** di vedere le abilità. Le 10 carte iniziali bastano.
2. **Le quattro abilità:** il server ne estrae 4 diverse tra le 12 e ne assegna una a ogni lato (in alto, a destra, in basso, a sinistra), uguali per tutte le carte e per entrambi. Il numero su un lato è il valore del personaggio in quell'abilità, da 0 a 10: ogni carta cambia forma da una partita all'altra. I poteri delle carte non valgono; le sole Minacce sono quelle sui bordi della griglia fissa (punto 6 bis).
3. **Mano:** il server mescola i mazzi; ognuno tiene 3 carte e ne pesca una dopo ogni giocata. Si giocano 8 carte a testa: 2 restano in mano.
4. **Turni alterni:** il server sorteggia chi apre. Nel suo turno un giocatore posa una carta della mano, ruotata come vuole (a quarti di giro, una volta posata non si ruota più), in una casella libera accanto (non in diagonale) a una carta già in gioco. Timer di 40 secondi per mossa, più 10 di pausa per vedere la mossa precedente (fino al 17 novembre erano 20 più 4, e la pausa 2 fino al 12 novembre). Contro un bot la sua mossa arriva sullo schermo 2 secondi dopo la fine degli effetti della mossa del giocatore; la pausa copre la mossa del giocatore, l'attesa e la mossa del bot, così i 40 secondi partono quando la mossa del bot è sullo schermo; allo scadere il server gioca una carta a caso, in una casella a caso, ruotata a caso.
   - **Griglia fissa:** i bordi del 4×4 ci sono dall'inizio, ognuno con la sua Minaccia (punto 6 bis); la prima carta va in una casella qualsiasi.
   - **Griglia mobile:** la prima carta fa da origine; la griglia si sposta finché le carte non occupano 4 colonne (si bloccano destra e sinistra) o 4 righe (si bloccano alto e basso). Ogni carta deve stare in un quadrato 4×4. Alla fine la griglia è sempre un 4×4 pieno.
5. **Sigilli** (i cubetti di FLIP): **non hanno un tetto** (dal 17 novembre 2026, chiesto dall'utente; prima erano 15 a testa, poi 20 sulla griglia fissa). Ogni lato della carta posata che supera **strettamente** il lato della carta vicina che lo tocca mette un Sigillo del giocatore sulla carta battuta e uno sulla carta posata; a parità niente. Le carte non hanno padrone: si possono battere anche le proprie.
6. **Onda d'urto** (la ripercussione di FLIP): se una carta battuta a sua volta batte una sua vicina (non la carta appena posata), da quella vicina si toglie un Sigillo avversario, che torna al suo proprietario. Un passo solo; una rimozione per ogni coppia carta battuta-vicina. In FLIP è facoltativa: qui è automatica, perché togliere un Sigillo avversario conviene sempre.
6 bis. **Minacce sui bordi** (solo griglia fissa, dal 16 novembre 2026, chieste dall'utente): alla creazione della partita il database estrae 4 Minacce diverse del catalogo (di Nuova Megara, non rare, di livello da 2 a 5), una per bordo nell'ordine alto, destra, basso, sinistra. Il valore di una Minaccia sul suo bordo è il suo livello più 2, quindi da 4 a 7; le sue abilità e le regole dei luoghi non contano. Quando si posa una carta, ogni suo lato rivolto verso l'esterno della griglia si confronta con la Minaccia di quel bordo (una casella d'angolo ne tocca due, una di bordo una, quelle interne nessuna): se il lato è **strettamente** più alto, la carta posata riceve un Sigillo in più; se è più basso, riceve un Sigillo in meno per quella mossa, mai sotto zero (variante B, «premio e morso»); a parità niente. Le carte vicine battute ricevono comunque il loro Sigillo; i Sigilli gratis di chi apre non si toccano. Se il catalogo non ha 4 Minacce adatte, la partita si gioca senza. Le partite sulla griglia fissa iniziate prima di questa regola restano senza Minacce.
7. **Chi apre** riceve 3 Sigilli gratis sulla prima carta, che non ha vicine da battere (FLIP, compensazione ×3 a due giocatori).
8. **Fine:** dopo 16 carte (o prima, con il traguardo di un evento: punto 8 bis) vince chi ha più Sigilli sulla griglia; a parità chi **controlla** più carte (più Sigilli suoi che dell'altro su quella carta); poi chi ha giocato per secondo. Nessun pareggio.
8 bis. **Traguardo di Sigilli** (eventi, dal 17 novembre 2026, chiesto dall'utente): nell'editor degli eventi (§8.2) un amministratore può fissare un traguardo, da 5 a 60 Sigilli (proposta: 12). In ogni Quadrante iniziato durante l'evento, su tutte e due le griglie, contro i bot o tra giocatori, **alla fine di ogni giro** (dopo la carta di chi gioca per secondo, quando i due hanno giocato lo stesso numero di carte) si guarda la griglia: se qualcuno ha almeno quei Sigilli, la partita finisce subito e vince chi ne ha di più, poi chi controlla più carte, poi chi ha giocato per secondo (come al punto 8). Se nessuno lo raggiunge si arriva alla fine come sempre. Il controllo a fine giro l'ha scelto l'utente il 17 novembre tra due correttivi: con la vittoria immediata chi apre, che parte con 3 Sigilli gratis, vinceva la corsa troppo spesso (sotto). Il traguardo si copia sulla partita quando inizia (`matches.quadrant_seal_target`): cambiare o finire l'evento non cambia le partite già iniziate. La schermata lo scrive accanto al numero della mossa, nelle regole e nel risultato; la pagina dell'evento lo spiega. I bot giocano per raggiungerlo e per non farlo raggiungere: una mossa che chiude il giro al traguardo vale come una partita vinta o persa.
9. **Premi:** come bot e amichevoli (§13.1): nessuna moneta, esperienza normale, punti evento del tipo di partita, statistiche normali. Gli obiettivi del giorno possono nominare le due griglie (`format`); "Minacce vinte" non conta nulla qui.

**Schermata:** una carta si trascina dalla mano a una casella libera (o si tocca e poi si tocca la casella); arriva già ruotata nel modo che rende di più, e toccandola si ruota. Sulla griglia fissa le 4 Minacce stanno in quattro fasce a strisce intorno alla griglia, con nome e numero; la fascia del bordo che la carta toccherebbe si illumina. Prima di giocarla, ogni casella mostra come cambierebbero i Sigilli ("+1" o "−1" nel colore di chi li possiede: azzurro il giocatore, arancione l'avversario) e una riga dice il totale; dopo ogni mossa, propria o avversaria, le stesse etichette mostrano cosa è cambiato. Il bordo di ogni carta sulla griglia è del colore di chi ha più Sigilli su di lei, bianco a parità, non di chi l'ha giocata. Dopo ogni mossa un breve effetto spiega cosa è successo, un confronto alla volta: i due numeri che si toccano si scontrano, con una stellina sul bordo comune; il numero più alto si gonfia nel colore di chi ha mosso, quello più basso trema, a parità la stellina è bianca con "=". Dopo le vicine, i lati rivolti verso i bordi si scontrano con le Minacce: il numero della Minaccia trema se perde e si gonfia in magenta se vince. Poi arrivano le etichette dei Sigilli e, per ogni onda d'urto, una stellina tra la carta battuta e la sua vicina e un anello sulla vicina che perde il Sigillo. La schermata ricostruisce i confronti dalla griglia prima e dopo la mossa (`quadrantMoveStory`); con il movimento ridotto del telefono gli effetti non si animano. Contro un bot la risposta del server porta anche gli stati intermedi (`previous`): la schermata mostra prima la mossa del giocatore, poi "il bot sta pensando", poi la mossa del bot (tra 1,6 e 3,4 secondi dopo, secondo quanto durano gli effetti della mossa del giocatore); se il bot apre, la sua prima carta arriva allo stesso modo.

**Bot:** vedono la griglia, la propria mano e le carte avversarie già giocate, mai la mano o l'ordine dei mazzi. Facile: quasi a caso, preferendo le mosse che rendono. Medio: la mossa con più Sigilli subito (presi più tolti), meno un costo per i lati deboli lasciati scoperti. Difficile e Super Pro: le 6 e 10 mosse migliori per Medio, ognuna contro la miglior risposta avversaria con 12 e 32 mani plausibili pescate dal catalogo. I mazzi dei bot si costruiscono come in §5.9 (10 carte).

**Simulazioni** (`scripts/simulate-quadrant.mts`, catalogo reale a 187 personaggi, 400 partite per riga, 300 o 200 con Difficile e Super Pro; Medio contro Medio salvo dove scritto; tra parentesi la griglia mobile):

| Prova | Risultato |
|---|---|
| Chi apre vince, senza Sigilli gratis | 20% (21%) |
| … con +2, +3, +4 Sigilli gratis | 35%, **42%**, 55% (38%, **47%**, 57%) |
| Alfa+Omega contro Delta | 82% (74%) |
| Gamma contro Delta, Beta contro Gamma | 52%, 59% (52%, 58%) |
| Stesso mazzo: Medio contro mosse a caso; Medio contro Facile | 100%, 97% (100%, 96%) |
| Difficile contro Medio, Super Pro contro Medio | 54%, 59% (66%, 67%) |
| Delta giocato da Difficile contro Alfa+Omega giocato da Medio | 27% (33%) |
| Parità di Sigilli (decise dal controllo nella maggior parte dei casi) | 13% (11%) |
| Partite in cui qualcuno finisce i Sigilli | 2% (4%) |

**Traguardo di Sigilli** (17 novembre, stesso simulatore con un terzo argomento, 300 partite per riga, 200 con Super Pro; Medio contro Medio salvo dove scritto; «prima» = partite finite al traguardo prima dell'ultima carta):

| Prova | Fissa (con Minacce), 12 | Mobile, 12 | Fissa, 15 | Mobile, 15 |
|---|---|---|---|---|
| Chi apre vince, vittoria **immediata** al traguardo | 77% | 60% | 60% | 46% |
| Chi apre vince, controllo **a fine giro** (la regola) | **45%** | **44%** | **48%** | **46%** |
| Partite finite prima (a fine giro) | 84% | 27% | 32% | 3% |
| Alfa+Omega contro Delta | 60% | 76% | 60% | 75% |
| Difficile contro Medio, Super Pro contro Medio | 63%, 67% | 58%, 59% | 58%, 62% | 64%, 65% |

Con la vittoria immediata chi apre arriva prima perché parte con 3 Sigilli gratis; togliere quei Sigilli lo farebbe scendere al 20-38%. Il controllo a fine giro tiene chi apre tra il 44% e il 53% con ogni traguardo provato. Senza traguardo, togliere il tetto dei Sigilli non cambia i numeri: chi apre vince il 42-48%.

**Minacce sui bordi** (simulazione con un bot avido sul catalogo a 218 personaggi, 300 partite per riga, Medio contro Medio, griglia fissa; «Sigilli finiti» conta le partite in cui qualcuno arriva al massimo):

| Prova | Senza Minacce, 15 Sigilli | Variante A (solo premio), 20 Sigilli | **Variante B (premio e morso), 20 Sigilli** | Variante B, 15 Sigilli |
|---|---|---|---|---|
| Chi apre vince (3 Sigilli gratis) | 38-43% | 40% | **45%** | 41% |
| … con 2 o 4 Sigilli gratis | — | 32%, 47% | 39%, 53% | 36%, 44% |
| Sigilli finiti | 9-10% | 4% | **3%** | 71% |
| Alfa+Omega contro Delta | 76% | — | 67% | 69% |
| Gamma contro Delta | 55% | — | 60% | 57% |
| Medio contro Facile | 97% | — | 98% | 97% |
| Difficile contro Medio | 58% | — | 58% | 60% |

Con i valori delle Minacce da 3 a 6 o da 5 a 8 (invece che da 4 a 7) chi apre resta al 45%, ma con valori più bassi i Sigilli finiscono più spesso (13%). Con 15 Sigilli finivano in 7 partite su 10: per questo la griglia fissa ne aveva 20, finché il 17 novembre il tetto non è stato tolto del tutto. Le Minacce danno un po' meno peso alla rarità (Alfa+Omega contro Delta dal 76% al 67%), perché anche i lati bassi verso il bordo costano, mentre giocare bene conta come prima. I numeri sono in `balance.ts` (`quadrant.fixedGridThreats`: livelli 2-5, valore = livello + 2, morso 1) e `game_config` (`quadrant.fixed_grid_threats.*`).

Conclusioni: come in FLIP, senza correttivo chi gioca per secondo vince 4 volte su 5; i 3 Sigilli di FLIP lo riportano vicino alla parità (42-47% per chi apre), 4 lo ribalterebbero. Giocare bene conta molto (contro chi gioca a caso si vince sempre), la rarità meno che nella partita classica (Gamma su Delta 52% contro 63%), perché conta il valore di 4 abilità su 12 e un lato basso si può nascondere ruotando. Il numero è in `balance.ts` (`quadrant.firstPlayerSeals`) e `game_config` (`quadrant.first_player_seals`).

**Tecnica:** motore in `packages/game-engine/src/quadrant.ts` e `quadrant-bots.ts`; numeri in `balance.ts` (`quadrant`) e `game_config` (`quadrant.*`). Una partita è una riga di `matches` senza le Minacce della partita classica, con `quadrant_threats` (griglia fissa: le 4 Minacce dei bordi come `[{ threat_id, value }]` in ordine di lato, estratte da un trigger alla creazione e mai cambiate; null sulla griglia mobile), `quadrant_abilities` (i 4 codici in ordine di lato), `quadrant_first` e `quadrant_board` (la griglia dopo l'ultima mossa: celle con carta, lati già ruotati e Sigilli dei due lati); `points_a`/`points_b` sono i Sigilli. Ogni mossa è una riga di `match_rounds` (round = mossa, un timer ciascuna) e di `round_plays` con `cell_x`, `cell_y`, `rotation` (base_score = carte battute, bonus = Sigilli tolti, score = Sigilli messi). L'ordine di pesca è l'ordine di `match_teams`, mescolato dal database e mai letto dai client. `match_record_quadrant_move` controlla mossa, turno, che la carta sia nella mano, la casella, la scelta inviata o la scadenza, che le carte già in gioco restino uguali e la nuova abbia i lati giusti per la sua rotazione, che i Sigilli di chi muove crescano solo di quelli messi e quelli dell'altro calino solo di quelli tolti, senza tetto, e il risultato: dopo l'ultima mossa, o dopo una mossa pari in cui qualcuno ha il traguardo della partita (`quadrant_seal_target`, copiato dall'evento in corso da un trigger alla creazione); l'effetto delle Minacce sui bordi lo calcola il motore (`quadrantBorderClashes`, `applyQuadrantMove`), il database controlla solo i Sigilli. Tra giocatori `match_submit_quadrant` accetta solo la mossa di chi è di turno e la partita la risolve subito. Edge Function `match`: azioni `quadrant_start`, `quadrant_play` (il bot risponde nella stessa chiamata, e apre subito se tocca a lui), `quadrant_submit`; `queue` e il codice amico portano il formato. Chi entra con un codice amico ne legge prima il formato (`get_lobby_format`), così sceglie un mazzo della misura giusta.

### 5.15 Minacce rare

Chieste dall'utente il 12 novembre 2026: Minacce che escono di rado, anche molto di rado, con un diorama 3D ciascuna. La più attesa è **La Fine del Mondo**, che richiede tutte e 12 le abilità. Le regole della partita non cambiano: le rare prendono soltanto il posto di una Minaccia normale.

- **Fasce di rarità** (`threat_rarities`: codice, nome, rango, colore, `one_in`). Ogni Minaccia di una fascia esce **da sola**, circa una volta ogni `one_in` partite (0: mai). Le fasce le modifica solo un admin (`/gestione-minacce`); i giocatori vedono le probabilità nel Bestiario.

| Fascia | Colore | Ogni Minaccia esce | Minacce |
|---|---|---|---|
| Rara | azzurro | 1 partita su 200 | 8 |
| Epica | viola | 1 su 700 | 7 |
| Leggendaria | arancione | 1 su 2.400 | 6 |
| Mitica | rosso | 1 su 3.000 | 3 |
| Apocalittica | cremisi | 1 su 5.000 | 1 (La Fine del Mondo) |
| Unica | oro | 1 su 20.000 | 4 |

  In tutto, circa 1 partita su 19 ha una Minaccia rara.
- **Estrazione:** il server estrae le Minacce come sempre (§5.4), tra quelle normali; poi tira una volta per ogni Minaccia rara attiva e mette quelle uscite al posto di Minacce normali a caso, una per round, tenendo tra le altre, se può, una Minaccia di livello 1-2 e una di livello 5-6. La partita classica e l'Emergenza estraggono nella Edge Function (`drawMatchThreats`, `drawEmergencyThreats`), l'Allarme Triplo nel database (`with_rare_threats` dentro `insert_triple_match`). In Emergenza la giornata è la stessa per tutti: se esce una rara, la incontrano tutti quel giorno.
- **Modalità:** partita classica (bot, amichevole, Conquista), Emergenza e Allarme Triplo. Grande Minaccia, Storia e Quadrante non estraggono Minacce: lì non cambia nulla.
- **Livello:** è sempre il numero di abilità richieste, ora fino a 12. Una rara non riceve mai un modificatore sorteggiato: ha la sua regola fissa (`modifier_code`, come i luoghi) oppure nessuna (La Fine del Mondo).
- **Emergenza:** ogni rara ha la sua soglia (`emergency_target`, obbligatoria per le rare). Sotto Rovescio la soglia è il **massimo**: si supera stando a quella cifra o sotto. Le soglie sono tarate per simulazione (vedi sotto).

**Regole delle rare.** Quelle già note (♻) funzionano come in §5.4; Duello e Gelo possono avere un numero proprio (`modifier_params.count`, `.cap`). Territorio ostile ha le fazioni fisse nella Minaccia. Le regole nuove:

| Regola | Effetto | Spareggio |
|---|---|---|
| Specchio | Ognuno segna con i valori del personaggio avversario, tenendo il proprio potere. In Emergenza, senza avversario, conta il proprio | Valore più alto dei valori usati |
| Rovescio | Vince il punteggio **più basso** | Il valore più alto più **basso**; poi nullo |
| Tutto o niente | Le abilità sotto 5 contano 0 | Normale |
| Ultimi i primi | +2 per ogni grado di rarità sotto Omega (Delta +8, Omega 0) | Normale |
| Il prezzo | Le abilità a 0 o 1 valgono −3 | Normale |
| Una sola forza | Tra Energia, Magia e Psiche conta solo la più alta, tante volte quante sono richieste | Normale |
| Al buio | Le abilità (6 su 12, estratte alla creazione della partita) si vedono solo dopo che entrambi hanno scelto. Veggente le vede prima | Normale |
| Eco | Richiede anche le abilità della Minaccia del round prima che non ha già (nel round 1 nessuna) | Normale |
| Il conteggio | 1 punto per ogni abilità almeno a 5, qualunque sia il valore | Normale |
| Livello ignoto | Da 3 a 6 abilità estratte a caso alla creazione della partita; nella sequenza dei livelli compare "?" finché il round non si apre | Normale |
| Negativo | Ogni abilità vale 10 meno il suo valore | Il valore più alto, rovesciato |

I poteri restano tutti attivi anche sotto le regole che ribaltano il round (scelta dell'utente: "poi vediamo"): per esempio sotto Rovescio un bonus fa perdere e Sabotatore aiuta l'avversario. Nessun tetto a Sabotatore, che sulla Fine del Mondo vale fino a −12. Al buio e Livello ignoto sono l'unica eccezione a "le abilità di una Minaccia sono definite nel catalogo, non casuali" (§5.4): nel catalogo la lista è il pool da cui si estrae, e la partita salva le abilità estratte in `matches.threat_modifiers` (riscrivendo i modificatori, una missione della Storia non le cambia). I numeri sono in `balance.ts` (`rareThreats`, più `threatModifiers` per Territorio ostile e Sottovalutati) e `game_config` (`rare_threats.*`).

**Le 29 Minacce** (testi segnaposto, tutti a Nuova Megara; tra parentesi la soglia in Emergenza):

| Codice | Minaccia | Liv. | Abilità | Regola |
|---|---|---|---|---|
| RA01 | Il Vulcano si sveglia | 7 | FOR RES ENE VEL VOL PER COM | Gelo (33) |
| RA02 | Notte senza Rintocco | 1 | PER | Silenzio della tomba (8) |
| RA03 | Sala degli specchi rotti | 3 | PER PSI MAG | Specchio (17) |
| RA04 | Nube di droni | 8 | VEL PER TEC ENE INT FUR COM RES | Anello debole (42) |
| RA05 | Mercato nero dei Segni | 4 | FUR INT VOL PSI | Territorio ostile: Cattivi +3, Eroi −2 (25) |
| RA06 | Campione dei container | 2 | FOR COM | Colpo mirato (18) |
| RA07 | Marea nera | 5 | RES ENE MAG PER VOL | Abissi (40) |
| RA08 | Blackout totale | 6 | TEC ENE INT PER FUR VOL | Tutto o niente (31) |
| EP01 | Il Colosso di bronzo | 8 | FOR RES ENE COM TEC VOL VEL PER | Duello (20) |
| EP02 | Il Labirinto sotto Megara | 4 | PER INT RES VOL | Anello debole (32) |
| EP03 | Il mondo capovolto | 5 | FOR VEL INT MAG FUR | Rovescio (al massimo 20) |
| EP04 | La lettera mancante | 1 | MAG | Ultimi i primi (12) |
| EP05 | Assedio dei mille Echi | 9 | tutte tranne MAG PSI FUR | Sottovalutati (49) |
| EP06 | L'ingorgo eterno | 3 | VEL TEC VOL | Il conto lungo (18) |
| EP07 | La nave dei folli | 6 | PSI MAG VOL PER RES COM | Silenzio della tomba (33) |
| LE01 | Il gigante della baia | 10 | tutte tranne PSI FUR | Il prezzo (47) |
| LE02 | L'Oracolo sepolto | 3 | PSI PER INT | Duello su una sola abilità (10) |
| LE03 | La centrale dell'Ora Zero | 7 | ENE MAG PSI TEC INT RES VOL | Una sola forza (48) |
| LE04 | Lo stormo dell'Alfabeto | 6 | INT MAG FUR VEL VOL TEC | Colpo mirato (41) |
| LE05 | Il Banco salta | 4 | INT FUR TEC COM | Tutto o niente (19) |
| LE06 | L'ombra di mezzogiorno | 5 | FUR PER PSI VEL MAG | Rovescio (al massimo 16) |
| MI01 | Il Diluvio | 11 | tutte tranne FUR | Abissi (68) |
| MI02 | La notte lunga un anno | 6 | 6 su 12 a caso | Al buio (32) |
| MI03 | L'Ora Zero, di nuovo | 4+ | FOR ENE MAG TEC + Eco | Eco (34) |
| AP01 | **La Fine del Mondo** | 12 | tutte | nessuna (58) |
| UN01 | L'Alfabeto completo | 12 | tutte | Il conteggio (7) |
| UN02 | Il sismografo impazzito | ? | 3-6 su 12 a caso | Livello ignoto (25) |
| UN03 | Megara Due | 6 | FOR INT ENE COM VOL FUR | Negativo (34) |
| UN04 | Il tredicesimo rintocco | 12 | tutte | Negativo (67) |

**Cosa vede il giocatore.** Fin dall'inizio, nella sequenza dei livelli, il tassello di una rara si illumina del colore della sua fascia (un "?" per Livello ignoto): lo stato della partita porta la fascia di ogni round (`threat_rarities`), mai il nome. Quando la Minaccia si svela compare per circa 2,6 secondi un avviso a tutto schermo, "Il sismografo è fuori scala", con la fascia, il nome e la probabilità ("circa 1 partita su 5.000"); il telefono vibra dove il browser lo permette (non su iPhone) e un tocco lo chiude. Poi il diorama ha la cornice del colore della fascia. Lo **Storico** segna le rare incontrate in ogni partita.

**Bestiario** (`/bestiario`, dalla Collezione e dal profilo): tutte le Minacce attive, divise in Nuova Megara, i cinque luoghi e le fasce rare. Quelle già incontrate si vedono intere (nome, livello, abilità, regola, testo, quante volte); le altre sono sagome con solo livello e fascia. Toccando una Minaccia già incontrata si apre il suo **diorama** a tutto schermo, la scena della partita (`ThreatDiorama`), con sotto quello che il Bestiario sa di lei; «Chiudi» torna all'elenco nello stesso punto. Il diorama dipende solo dal nome e dal livello, non dalle abilità o dalle regole estratte (Al buio, Eco, le regole di Nuova Megara): si vede quello di riferimento, al livello del catalogo; Livello ignoto, che a ogni partita ha un livello diverso, si vede alla grandezza massima (6). Il client lo mostra solo per le Minacce di cui `get_bestiary` manda il nome, cioè quelle incontrate. Una Minaccia si conta incontrata quando si apre il suo round (partita classica, Allarme Triplo, Storia) o quando la si gioca in Emergenza (`threat_sightings`, scritto dai trigger; all'arrivo del Bestiario si è contato anche lo storico). Le rare non danno monete: incontrarle conta solo per il Bestiario, così non conviene cercarle giocando a ripetizione contro i bot.

**Admin** (`/gestione-minacce`, dai collegamenti admin del profilo e della privacy): fasce (nome, colore, 1 partita su N) e per ogni Minaccia nome, testo, regola con i suoi parametri, rarità, soglia per l'Emergenza, attiva sì/no. Il server controlla l'admin, le regole e che ogni livello tenga almeno 8 Minacce normali di Nuova Megara attive (una sequenza di Emergenza). Il diorama è legato al nome: rinominare una Minaccia le toglie il diorama finché l'app non si aggiorna. Le partite in corso tengono la regola con cui sono iniziate.

**Diorami:** ogni rara ha la sua scena 3D (`src/lib/threat-scene.ts`, `threat-diorama.ts`); per i livelli oltre il 6 le quantità che crescono col livello hanno un tetto, così la scena resta leggera sul telefono.

**Bot:** vedono la fascia dei round futuri (pubblica) e li stimano con le rare di quella fascia e livello; sotto Rovescio e Specchio cercano un punteggio proprio basso; Al buio, prima di scegliere, giocano come su una Minaccia normale dello stesso livello.

**Simulazioni** (catalogo reale a 187 personaggi):

- *Soglie dell'Emergenza:* con le soglie dei livelli 1-6 un personaggio a caso del catalogo supera una Minaccia normale il 27,5% delle volte; ogni soglia rara è quella che dà la percentuale più vicina con la sua regola (tra 20% e 34%, salvo Il tredicesimo rintocco: 11%, perché i suoi punteggi sono pochi e lontani).
- *Round tra due personaggi a caso* (tra parentesi le Minacce normali dello stesso livello): sulla Fine del Mondo vince il più raro il **98%** (58%) e il più "a picchi" il 79%: senza regola conta il totale dei punti, che dipende dalla rarità (§4.3), come previsto in proposta; l'utente ha scelto di lasciarla così per ora. Il tredicesimo rintocco ribalta: il più raro vince il 12%. Specchio 36%, Ultimi i primi 39%, Rovescio 43-44%, Sottovalutati 44% aiutano le carte comuni; Colosso di bronzo (Duello) 71%, Una sola forza 71%, Marea nera 70%, Il Diluvio 77% le rare.
- *Partite intere bot contro bot* (300 per Minaccia, ogni rara forzata nel round 3, Difficile contro Facile): nessun errore; il Difficile vince quel round tra il 52% e l'80% (59% su una Minaccia normale), tranne Al buio, 49%, dove nessuno vede le abilità.
- Con 1 partita su 19, le rare non spostano i rapporti di forza di §4.3.

**Tecnica:** migrazione `20261112230000_rare_threats.sql` (fasce, colonne `rarity_code` ed `emergency_target`, livelli 1-12, regole, estrazione, `emergency_days.threat_modifiers`, `threat_sightings`, `get_bestiary`, Storico, funzioni admin, catalogo); motore `threats.ts` (`drawRareThreats`, `withRareThreats`, `drawMatchThreats`, `withRuleAbilities`), `scoring.ts`, `bots.ts`, `emergency.ts`; test `rare-threats.test.ts`, `supabase/tests/rare_threats.test.sql`.

### 5.16 Emergenza della settimana

Chiesta dall'utente il 18 novembre 2026 senza dettagli: valgono i default proposti dalla sessione che l'ha costruita (§13.1). È l'Emergenza di §5.10, più lunga e più dura, una volta a settimana, con la sua classifica e i suoi premi. L'Emergenza di ogni giorno non cambia.

- **Settimana:** da lunedì 00:00 a domenica 23:59, `Europe/Rome` (`game_week`, calcolata solo dal server). La settimana è il suo lunedì.
- **Minacce:** **10**, uguali per tutti, estratte una volta a settimana con RNG reale (la Edge Function alla prima apertura della settimana; il database tiene la prima estrazione). Solo le Minacce normali di Nuova Megara più le rare quando escono, come in §5.10 e per lo stesso motivo: con Gelo o Duello alcune soglie sarebbero irraggiungibili.
- **Livelli:** le regole di §5.4 (almeno una Minaccia di livello 1-2 e una di livello 5-6), con somma tra **36 e 44**: in media 4 per Minaccia contro i 3,5 di ogni giorno, quindi più Minacce di livello 5-6. Con una 1-2 e una 5-6 obbligatorie, su 10 al massimo 8 Minacce hanno lo stesso livello: le 8 Minacce per livello che l'admin deve tenere attive (§5.15) bastano.
- **Soglie:** **9, 15, 20, 25, 30, 34** dal livello 1 al 6, cioè 2 punti più di ogni giorno. Le rare tengono la loro `emergency_target`. Sotto Rovescio una Minaccia è superata a punteggio uguale o minore della soglia, e il database lo verifica con la regola salvata nella settimana.
- **Squadra:** **10 personaggi diversi** (lo starter set ne ha 10), scelti conoscendo solo i livelli; la squadra non si cambia, ognuno affronta una Minaccia.
- **Tentativi:** **uno a settimana**, senza timer: si esce e si riprende fino a domenica 23:59. Finisce dopo la 10ª Minaccia o alla **3ª fallita**. Un tentativo non finito non entra in classifica (le monete delle soglie restano).
- **Poteri:** la tabella di §5.10, dove «la squadra» è quella di 10: Legame conta i 10, Lupo solitario guarda i 10, Grande prova la Minaccia di livello più alto della settimana.
- **Premi a soglia:** **20 monete a 4 Minacce superate, altre 30 a 7, altre 50 a 10** (al massimo 100), pagate subito (`coin_ledger`, `emergency_week_reward`). Nessuna esperienza.
- **Classifica della settimana:** solo i tentativi finiti, per Minacce superate, poi punteggio totale, poi chi ha finito prima. I **primi 10** con avatar e titolo, e sotto la propria posizione. Le **formazioni del podio** (le 10 carte dei primi 3) di questa settimana le vede solo chi ha finito il suo tentativo; gli altri vedono il **podio della settimana scorsa** («Podio scorso» sopra la classifica). Le righe non mostrano personaggi.
- **Premi di classifica:** domenica a mezzanotte la classifica è definitiva e i primi 10 con almeno **1 Minaccia superata** vincono: 1° **2 pacchetti e 100 monete**, 2° **1 pacchetto e 50 monete**, 3° **1 pacchetto**, dal 4° al 10° **50 monete** (`emergency_week.prizes.*`; ogni posto può dare anche Schegge, §4.8, di serie nessuna). La settimana si chiude la prima volta che qualcuno apre l'app dopo la mezzanotte di domenica, come i giorni di §5.10 (`emergency_week_close`, una volta per settimana, `emergency_week_prize_weeks`; si chiudono anche le settimane rimaste indietro, mai quella in corso). Il premio arriva con lo **stesso popup** dei premi di giornata, con «Emergenza della settimana» e «Settimana dal 16 al 22 novembre»: *Riscuoti* paga (monete e Schegge `emergency_week_prize`, pacchetti aperti dal server, tipo `emergency`), *Più tardi* lo rimanda. I premi non scadono. Chi ha iniziato il tentativo riceve anche l'avviso a tutto schermo di fine settimana, con la classifica finale (§11.7).
- **Titolo:** il primo della settimana riceve «**Eroe della settimana**» fino alla fine della settimana dopo, come i titoli di §8.6 (diverso da «Campione dell'Emergenza», che resta della scheda Emergenza).
- **Ricompense partite (§8.4):** soglie, monete e premi di classifica si cambiano da *Ricompense partite*, scheda *Tetti ed Emergenza*, nelle sezioni *Emergenza della settimana* e *Premi della settimana*, accanto a quelle di ogni giorno (`balance.ts` `emergencyWeek`, `game_config` `emergency_week.*`). Le soglie crescono e non superano le 10 Minacce.
- **Eventi, obiettivi, imprese:** ogni Minaccia superata dà i punti della riga Emergenza dell'evento (§8.2), con tutta la squadra di 10 ammessa. Gli obiettivi del giorno (§8.3) e le imprese (§8.5) che contano le Minacce dell'Emergenza contano solo quella di ogni giorno: «Supera tutte le 8 Minacce dell'Emergenza» non avrebbe senso con 10, e «Emergenza» nei testi resta quella del giorno. Il Bestiario conta anche le Minacce giocate nella settimana.
- **Dove:** in Gioca, una riga sottile subito sotto la riga *Oggi*, disegnata come la casella dell'Emergenza: «Emergenza della settimana», i giorni che restano («Ancora 3 giorni», «Ultimo giorno») e lo stato (*Da fare*, *In corso · 3/10*, *✓ 7/10 · 4°*). Si apre su `/emergenza/?settimana=1` (query string: niente route dinamiche nell'export statico), con le stesse schermate di §5.10: in alto «Emergenza» con l'etichetta *Settimana*, la striscia dei 10 livelli, le carte in mano 5 per riga. Tutto sta in uno schermo da 375×627 e 390×730 senza scorrere, Gioca compresa. Pagina di prova solo in `next dev`: `/prova-settimana` (e le scene di `/prova-gioca`).

**Simulazione** (`scripts/simulate-emergency.mts`, dump `scripts/emergency-catalog.sql`, catalogo reale a 227 personaggi, 4.000 tentativi per caso). Il giocatore sceglie la squadra conoscendo solo i livelli (a ogni livello, dal più alto, il personaggio che lo supera più spesso, poi scambi finché migliorano) e a ogni Minaccia manda, tra chi la supera, quello che vale meno per le Minacce che restano; se nessuno la supera, quello che vale meno in tutto. Profili: **starter set** (10 Delta), **squadra ben costruita** (starter set più 30 pacchetti, circa un mese), collezione grande (più 80 pacchetti), tutto il catalogo. Media delle Minacce superate (tra parentesi: tutte superate):

| Caso | Starter | Ben costruita | Grande | Tutto il catalogo |
|---|---|---|---|---|
| Ogni giorno: 8 Minacce, somma 24-32, soglie 7…32 | 4,7 | 6,1 (9%) | 6,1 (8%) | 6,1 (8%) |
| 10 Minacce, somma 36-44, soglie di ogni giorno | 5,7 | 8,1 (9%) | 8,1 (9%) | 8,1 (9%) |
| 10 Minacce, somma 24-32, soglie +2 | 3,7 | 6,0 (0,5%) | 5,8 | 5,8 |
| **Settimana: 10 Minacce, somma 36-44, soglie +2** | **3,9** | **6,5 (1,0%)** | **6,8 (1,0%)** | **7,0 (1,6%)** |

La somma dei livelli **non** rende più difficile la sfida: le soglie di §5.10 danno a ogni livello circa la stessa difficoltà (un Delta supera una Minaccia normale tra il 21% e il 27% delle volte a ogni livello), e i livelli alti favoriscono anzi le carte rare (un Omega supera una Minaccia di livello 6 il 51% delle volte, una di livello 1 il 34%). Con le soglie di ogni giorno 10 Minacce sarebbero più facili delle 8 di ogni giorno (5,7 e 8,1 superate). Per questo, come previsto dal default, le soglie sono cambiate: +2 a ogni livello porta lo starter set a circa 4, una squadra ben costruita a circa 6,5 e il 10 su 10 all'1-2%. Un personaggio a caso supera una Minaccia normale il 30,0% delle volte con le soglie di ogni giorno e il 20,0% con quelle della settimana. La somma 36-44 resta per avere Minacce più grandi.

**Tecnica** (migrazione `20261118200000_emergency_week.sql`): tabelle proprie, perché la giornata (`emergency_days.day`) e la settimana (il suo lunedì) userebbero la stessa data: `emergency_weeks` (Minacce, livelli e regole fisse della settimana, con lo stesso trigger della giornata), `emergency_week_runs`, `emergency_week_plays` (con le parti dei punti), `emergency_week_prize_weeks`, `emergency_week_prizes`; RLS attiva e nessuna policy. Funzioni per la Edge Function (`emergency_week_ensure`, `emergency_week_start`, `emergency_week_play_context`, `emergency_week_record_play`, `emergency_week_state_payload`) e per i client (`get_emergency_week_leaderboard`, con quando finisce la settimana e il proprio tentativo; `get_emergency_week_lineups`, `get_emergency_week_prizes`, `claim_emergency_week_prize`). La Edge Function `match` ha le azioni `emergency_week_open`, `emergency_week_start` e `emergency_week_play`, sullo stesso codice e motore della giornata (`resolveEmergencyPlay` con le regole della settimana). La classifica entra in §8.6 come scheda `emergency_week` (`leaderboard_rows`, `leaderboard_range`, `leaderboard_close_week`, `get_my_leaderboard_places`); `event_ref_team` riconosce la squadra della settimana. Test: `packages/game-engine/src/emergency.test.ts`, `src/lib/emergency.test.ts`, `supabase/tests/emergency_week.test.sql`.

## 6. Conquista delle carte

### 6.1 Regola base

Nella modalità **Conquista**, il vincitore sceglie **una carta tra le 5 schierate dal perdente** in quella partita. La carta passa alla sua collezione.

La collezione non schierata non è mai a rischio: **si rischia solo ciò che si porta in campo.**

### 6.2 Limite di rarità (protezione)

Il vincitore può prendere solo carte di rango **pari o inferiore alla carta più rara della propria squadra**.

- Squadra di sole Delta → può prendere solo una Delta.
- Squadra con una Omega → può prendere fino a una Omega.

Nota di bilanciamento: chi inserisce una sola carta rara per alzare il proprio limite mette in campo, e quindi rischia, quella stessa carta. Il rischio resta simmetrico.

Se il perdente non ha carte idonee (tutte sopra il limite o protette), il vincitore riceve un **bonus in monete** al posto della carta.

### 6.3 Scelta della carta

- Il vincitore ha **30 secondi** per scegliere; allo scadere il server assegna una carta idonea a caso.
- Il perdente vede quale carta ha perso. Il trasferimento viene registrato in `card_transfers`.

### 6.4 Protezioni anti-frustrazione e anti-abuso

| Protezione | Default |
|---|---|
| **Starter set** vincolato all'account, mai conquistabile | 10 carte al primo accesso |
| Sblocco della modalità Conquista | dopo 5 partite o al livello 3 |
| Massimo carte perse in Conquista al giorno | 10 |
| Partite Conquista tra la stessa coppia di giocatori | 1 ogni 24 ore |
| Blocco delle carte appena conquistate (non schierabili in Conquista né scambiabili) | 48 ore |
| Matchmaking Conquista | per livello e per valore della squadra schierata |

Raggiunto il limite giornaliero di carte perse, il giocatore può continuare solo in Amichevole fino al reset.

### 6.5 Conquista contro un bot

Dopo **60 secondi** in coda Conquista senza avversari, il giocatore sfida un bot di difficoltà casuale, sapendolo prima e durante la partita. Valgono le regole di §6.1-6.4, con queste differenze dovute al fatto che un bot non possiede carte:

- Se il giocatore vince, sceglie tra **copie nuove** delle carte del bot, e la carta scelta è bloccata 48 ore come ogni carta conquistata. Non c'è un limite giornaliero di carte vinte. Una carta tenuta fuori dai pacchetti (§7) o sbloccata a livello non si può prendere, anche se il bot l'avesse in squadra.
- Se il giocatore perde, il bot prende subito una carta idonea a caso, che **esce dal gioco**. Conta nel limite giornaliero di carte perse.
- Abbandonare o sparire conta come sconfitta, quindi la carta si perde comunque.
- La partita dà l'esperienza delle partite contro bot e conta nelle statistiche contro i bot.

## 7. Pacchetti

- **Un pacchetto gratuito al giorno**, che scade al reset (mezzanotte `Europe/Rome`) se non aperto.
- Pacchetto standard acquistabile con monete (default **150 monete**) o con 1 Scheggia, senza limiti al giorno (§4.8).
- **Acquisti a pressione prolungata:** ogni acquisto con monete (pacchetto standard nella home e nel Negozio, pacchetti speciali) si conferma tenendo premuto il pulsante per circa un secondo (`balance.ts`, `holdToConfirm.durationMs`), mentre una barra lo riempie; un tocco o un rilascio anticipato non comprano nulla. Funziona anche da tastiera (tenendo premuto Spazio o Invio). Lo stesso vale per le azioni che non si possono annullare: la conversione dei doppioni (nell'album e nella scheda della carta) e la scelta della carta da conquistare. È solo una protezione dell'interfaccia: i controlli restano tutti sul server.
- RNG esclusivamente lato server; il risultato viene salvato prima di essere mostrato.
- Apertura animata: carte rivelate una alla volta, animazione speciale per Alfa, Omega e varianti (§4.6).
- Le carte vengono inserite automaticamente nella collezione.

**Carte nei pacchetti.** Ogni personaggio ha il flag `card_definitions.in_packs` (di default sì): un pacchetto pesca solo le carte attive, non da sblocco di livello e con il flag attivo (`is_pack_card`). Serve per tenere da parte personaggi nuovi o di eventi, che si possono comunque dare con un codice bonus (§8.1). Le varianti seguono la loro carta. Le carte da sblocco di livello restano fuori dai pacchetti qualunque sia il flag; le carte premio della Storia e quelle dei bot invece sono normali carte da pacchetto finché non si toglie la spunta.

- **Fuori da ogni via automatica** (migrazione `20261119240000_held_back_cards.sql`): una carta tenuta fuori non arriva da nessuna via che sceglie le carte da sola. Non entra nello starter set (`grant_starter_set`), nelle varianti a caso dei premi e del Negozio delle Schegge (`grant_random_variants`, con i conteggi delle varianti mancanti), nelle squadre dei bot e dei Reggenti della Classificata (§5.9, dove restano fuori anche le carte a livello), e in Conquista contro un bot non si può prendere (§6.5). Le imprese che chiedono tutti i personaggi di una fazione o tutte le varianti di uno stile contano solo le carte che i pacchetti possono dare, e il Negozio conta solo quelle tra i personaggi con una variante. Restano libere le scelte dell'amministratore: codici bonus che nominano la carta, pacchetti speciali (§7.1), carte premio scelte una per una e le squadre e i premi della Storia. Rimessa la spunta, la carta esce da tutte queste vie come le altre. Test `supabase/tests/held_back_cards.test.sql`.
- **Nell'album** (§9) una carta tenuta fuori non compare e non conta nel totale («X/N personaggi»), a meno che il giocatore non ne abbia già una copia, per esempio da un codice bonus: allora la vede come le altre. Quando esce nei pacchetti compare a tutti, tra le mancanti. La vista `card_catalog` porta il flag (`in_packs`), il filtro è nell'app (`albumCatalog` in `src/lib/collection.ts`); deciso dall'utente il 20 novembre 2026, vale per ogni carta tolta dai pacchetti.
- **I Mille Soli** (P232-P261, docs/WORLD.md) sono entrati nel catalogo il 20 novembre 2026 già fuori dai pacchetti: l'amministratore li mette nei pacchetti quando vuole. Lo stesso giorno, allo stesso modo, **le Marche di Arcadia** (P262-P291, migrazione `20261120200000_marches_characters.sql`).

- **Rarità senza carte:** se tutte le carte di una rarità sono escluse, quella rarità non si pesca e il suo peso si ridistribuisce sulle altre in proporzione. Le probabilità del Negozio vengono dalla stessa funzione (`eligible_rarities`), quindi mostrano sempre quelle vere: cambiano solo in questo caso. La garanzia resta "almeno una carta di rango Gamma o superiore", scelta tra le rarità rimaste.
- **Limite:** il server rifiuta una modifica che lascerebbe i pacchetti senza nessuna carta di rango Gamma o superiore (`pack_pool_empty`), perché nessun pacchetto si potrebbe aprire.
- **Gestione dall'app:** gli amministratori (`admin_users`) trovano in fondo all'informativa sulla privacy, accanto a *Gestione codici*, il link *Carte nei pacchetti* (`/gestione-pacchetti`): elenco di tutte le carte per rarità con miniatura, nome e codice, ricerca, spunta "Nei pacchetti" e i comandi "Seleziona tutte" / "Deseleziona tutte" per rarità, con il conteggio delle carte attive. Il flag cambia solo con la funzione `admin_set_cards_in_packs`, che verifica l'amministratore. Sopra l'elenco una riga di **filtri per tratto** (Origine, Natura, Gruppo; dentro un tipo basta uno dei tratti scelti, tra tipi diversi servono tutti, come `card_matches_traits`): con la ricerca o un filtro attivo, i comandi diventano "Seleziona trovate" / "Deseleziona trovate" e valgono solo per le carte trovate.

### 7.1 Pacchetti speciali

Oltre al pacchetto standard, il Negozio vende i **pacchetti speciali** creati dagli amministratori: ognuno ha nome, prezzo in monete, numero di carte, carte che possono uscire e probabilità propri. Il pacchetto del giorno, il pacchetto standard e i pacchetti dei codici bonus e degli eventi restano quelli di sempre (`open_pack`) e non cambiano.

- **Cosa si sceglie:** nome (3–40 caratteri) e descrizione facoltativa, colore (una delle 21 palette del Negozio, a tinta unita o sfumate, oppure colori personalizzati: sfondo, eventuale sfumatura, busta e Omega in `#rrggbb`; il server accetta solo questi valori, `is_pack_color`), prezzo (1–100000 monete), carte per pacchetto (1–10, `special_packs.max_cards_per_pack`), date facoltative di inizio e fine in ora italiana, e le carte. Le carte sono scelte una per una, o tutte insieme quelle che rispondono ai filtri (rarità, fazione, tratti), tra quelle attive e non da sblocco di livello, anche se sono fuori dal pacchetto standard (flag `in_packs`): così un personaggio nuovo può uscire solo da un pacchetto speciale.
- **Probabilità**, in due modi:
  - **per rarità:** una percentuale per ogni rarità delle carte scelte; le carte di una rarità se la dividono in parti uguali;
  - **per carta:** una percentuale per ogni carta.
  Le percentuali hanno al massimo due decimali e devono fare **esattamente 100%**: la pagina mostra il totale mentre si scrive, il tasto "Parti uguali" divide il 100% senza resti, e per ogni valore mostra la probabilità reale (per rarità: quella di ogni carta; per carta: il totale di ogni rarità). Il server ricontrolla tutto.
- **Carta garantita** facoltativa: "almeno una carta di rarità X o superiore", solo con almeno 2 carte per pacchetto e almeno una carta scelta di quella rarità o più rara. Funziona come nel pacchetto standard: se nessuna carta prima dell'ultima l'ha raggiunta, l'ultima si estrae solo tra le carte di rarità X o superiore, con le stesse proporzioni.
- **Varianti:** probabilità per pacchetto da 0 a 100% (il modulo parte dal 5% del pacchetto standard; 0 = niente varianti). Si tira dopo aver estratto la carta, come in §4.6. In più, facoltativi:
  - **Solo varianti** (`variants_only`): ogni carta esce con un disegno variante (la probabilità vale 100%). Si possono scegliere solo personaggi con una variante adatta (il server rifiuta gli altri con `special_pack_card_without_variant`), e un personaggio che la perde esce dal pacchetto come una carta disattivata;
  - **Stili** (`variant_styles`): le varianti escono solo di quegli stili (per esempio un «Pacchetto Neon»); con *Solo varianti* restano solo i personaggi che hanno uno di quegli stili. Il server rifiuta stili inesistenti;
  - **Prima le varianti che il giocatore non ha** (`prefer_new_variants`): tra le varianti adatte di un personaggio il server sceglie una di quelle che il giocatore non possiede, se ce n'è una; non cambia quale personaggio esce. Il Negozio scrive «Solo varianti», gli stili e «Se puoi, è una variante che non hai ancora». Nell'editor il passo *Dati* ha la sezione *Varianti*, e nel passo *Carte* i filtri hanno anche lo **stile della variante**; con *Solo varianti* l'elenco mostra solo i personaggi adatti.
- **Estrazione:** sul server con `random()`, carta per carta dalle probabilità di `special_pack_card_odds`; il risultato si salva in `pack_openings` (`pack_type = 'special'`, `special_pack_id`) prima di essere mostrato. Una carta disattivata o diventata da sblocco di livello esce dal pacchetto e la sua quota passa alle altre in proporzione; le probabilità del Negozio vengono dalla stessa funzione, quindi sono sempre quelle vere.
- **Acquisto** (`buy_special_pack`): nella stessa transazione controlla che il pacchetto sia attivo e nelle sue date e che le monete bastino, crea le carte (`card_transfers`, motivo `pack`) e scala le monete (`coin_ledger`, motivo `pack_purchase`). Ogni modifica di un pacchetto ne alza la **versione**: l'acquisto indica la versione che il Negozio mostrava e, se nel frattempo il pacchetto è cambiato, viene rifiutato (`special_pack_changed`) senza costare nulla, così nessuno paga un prezzo o riceve probabilità diversi da quelli che ha visto.
- **Nel Negozio:** in alto si scorrono i pacchetti in vendita, prima lo standard e poi gli speciali, ciascuno con il suo colore, nome, prezzo e scadenza ("In vendita fino a…"). La scheda *Probabilità* mostra sempre quelle del pacchetto in vista: per rarità, la regola della garanzia, le varianti e l'elenco di tutti i personaggi che possono uscire con la probabilità di ciascuno. L'apertura mostra il nome e il colore del pacchetto.
- **Gestione dall'app:** in fondo all'informativa sulla privacy, accanto a *Carte nei pacchetti*, gli amministratori trovano *Pacchetti speciali* (`/gestione-pacchetti-speciali`). La pagina sta in uno schermo di telefono senza scorrere: scheda *Pacchetti* (elenco con stato, prezzo, carte, aperture, comandi Modifica, Duplica, Disattiva/Riattiva, Elimina) e scheda *Nuovo* in tre passi, *Dati*, *Carte* e *Probabilità*, con il totale e il tasto di salvataggio sempre in basso. Un pacchetto già aperto da qualcuno non si elimina, si disattiva. Ogni funzione (`admin_list_special_packs`, `admin_save_special_pack`, `admin_set_special_pack_active`, `admin_delete_special_pack`) verifica l'amministratore sul server. Nel passo *Carte* gli stessi filtri per tratto restringono l'elenco, e "Aggiungi trovate" / "Togli trovate" agiscono sulle carte trovate: l'elenco salvato resta quello delle carte scelte, quindi un personaggio nuovo con quel tratto non entra da solo.
- **Dati:** `special_packs` (pacchetto, versione, date), `special_pack_cards` (carte, con la percentuale nel modo per carta), `special_pack_rarities` (percentuali nel modo per rarità). Nessun client legge le tabelle: il Negozio usa `get_special_packs`.

## 8. Economia

*Valori ancora da decidere: i numeri sotto sono provvisori, servono solo per far funzionare l'MVP e vanno tenuti in configurazione.*

| Voce | Default provvisorio |
|---|---|
| Vittoria | +50 monete |
| Sconfitta o pareggio (partecipazione) | +15 monete |
| Tetto giornaliero di monete da partite | 300 |
| Ricompense contro la stessa coppia di giocatori | ridotte dopo 3 partite in 24 ore |
| Pacchetto standard | 150 monete |
| Conversione doppioni | da definire per rarità |
| Varianti doppie rotte | Schegge per rarità: Delta 1, Gamma 2, Beta 3, Alfa 5, Omega 7 (§4.8) |
| Schegge come premio | da 0 a 100 per premio, scelte dall'amministratore nell'Editor (§4.8) |

Ogni movimento passa da `coin_ledger`. **Nessun acquisto con denaro reale** nelle fasi 1-3.

Nota per il futuro: pacchetti a pagamento combinati con carte che si possono perdere in partita richiedono una verifica legale (normativa su loot box e gioco d'azzardo). L'orientamento è monetizzare solo con elementi cosmetici.

### 8.1 Codici bonus

Nel Negozio il giocatore può inserire un codice e ricevere subito i premi decisi in anticipo.

- **Premi:** qualsiasi combinazione di monete, pacchetti standard, carte scelte e Schegge (da 0 a 100, §4.8). Le carte scelte sono copie normali, conquistabili come quelle dei pacchetti, con il disegno base o con una variante scelta (§4.6); mai personaggi da sblocco di livello. Nella funzione SQL una variante si indica come `'P051:neon'`.
- **Varianti a caso** (anche da sole): da 1 a 5 varianti estratte dal server quando il premio si paga, facoltativamente solo di certi stili e rarità (`random_variants` = `{"count", "styles", "rarities"}`, controllato da `random_variants_spec`; il server rifiuta stili o rarità inesistenti e regole con meno varianti adatte del numero chiesto, `random_variants_empty`). Escono varianti diverse, tra quelle attive di personaggi attivi e non da sblocco, **prima quelle che il giocatore non ha** (`grant_random_variants`); sono copie normali con il motivo del premio. Stessa regola, con lo stesso campo *Varianti a caso* nell'editor, per i traguardi degli eventi (§8.2), gli obiettivi del giorno (§8.3) e le imprese (§8.5); il giocatore la legge come «2 varianti a caso (stile Neon, Omega)».
- **Limiti di ogni codice:** una volta per giocatore; facoltativi un numero massimo di giocatori e una scadenza.
- **Tentativi:** massimo 10 codici inesistenti all'ora per giocatore, così non si indovinano provando.
- **Sicurezza:** i codici stanno solo nel database, mai nel repository, e nessun client può leggerli. Tutto passa da `coin_ledger`, `card_transfers` e `shard_ledger`.

**Gestione dall'app:** gli account elencati in `admin_users` vedono in fondo all'informativa sulla privacy il link discreto *Gestione codici* (`/gestione-codici`): crea i codici, mostra quante volte sono stati usati e li disattiva. Il controllo è sul server, in ogni funzione: agli altri account la pagina non mostra nulla.

Creazione dall'editor SQL di Supabase (ogni parametro di premio e limite è facoltativo):

```sql
select public.create_bonus_code('NATALE26',
  p_coins => 100,
  p_packs => 1,
  p_card_codes => array['P002'],
  p_shards => 3,
  p_max_uses => 50,
  p_expires_at => '2026-12-31 23:59 Europe/Rome',
  p_note => 'Regalo di Natale');
```

Disattivazione: `update public.bonus_codes set is_active = false where code = 'NATALE26';`

### 8.2 Eventi a tempo

Tra un inizio e una fine decisi da un amministratore, le partite danno **punti evento**; ogni **traguardo** di punti raggiunto paga il suo premio. Un evento alla volta: il server rifiuta date che si sovrappongono a un altro evento attivo.

- **Orari:** inizio e fine si scelgono in ora italiana (`Europe/Rome`) e si mostrano così a tutti. La durata è libera (scorciatoie 24 ore, 48 ore, 3 e 7 giorni), al massimo 90 giorni.
- **Punti:** decisi evento per evento, per tipo di partita ed esito. Valori di partenza del modulo:

| Partita | Vittoria | Pareggio | Sconfitta |
|---|---|---|---|
| Online: amichevole e Classificata (§8.7) | 30 | 15 | 10 |
| Conquista (anche contro il bot dopo l'attesa, §6.5) | 40 | 20 | 15 |
| Contro bot | 10 | 5 | 3 |
| Storia (anche le missioni rigiocate) | 10 | 5 | 3 |
| Emergenza (anche quella della settimana, §5.16) | 5 per Minaccia superata | | |

  0 vuol dire che quel tipo di partita non dà punti. Le Sfide a tema collegate all'evento (§8.8) hanno la loro riga di punti.
- **Quali partite contano:** quelle iniziate e finite durante l'evento, chiuse normalmente. Le partite **abbandonate** (`end_reason = 'forfeit'`) non danno punti a nessuno dei due, nemmeno a chi vince: altrimenti due amici potrebbero far abbandonare uno dei due per accumulare vittorie. In Emergenza contano le Minacce superate durante l'evento.
- **Varianti in squadra (facoltativo):** un bonus di punti (`events.variant_bonus_percent`, da 1 a 100): ogni variante tra le carte schierate nella partita (la squadra in Emergenza) aggiunge quella parte dei punti, arrotondando per difetto (10 punti, +20%, 2 varianti: 14 punti), prima del tetto giornaliero (`award_event_points`, `event_ref_team_variants`). Si sceglie nel passo *Punti*; la pagina `/evento` lo scrive sotto le date.
- **Caccia alle varianti (facoltativa):** una probabilità di variante (`events.variant_chance_percent`, da 1 a 100) che, mentre l'evento dura, sostituisce quella solita quando è più alta: vale per il pacchetto del giorno, quello del Negozio e quelli dei premi (`open_pack` → `variant_chance_now`), non per i pacchetti speciali, che hanno la loro. Si sceglie nel passo *Punti* dell'editor e, come le altre regole, non cambia dopo l'inizio. Le probabilità del Negozio la mostrano con il titolo dell'evento ("Durante l'evento «…» la probabilità è del 15% invece del 5%"), e la pagina `/evento` la scrive sotto le date.
- **Regola del Quadrante (facoltativa):** un **traguardo di Sigilli** (`events.quadrant_seal_target`, da 5 a 60): nei Quadranti iniziati durante l'evento, a fine giro, se qualcuno ce l'ha la partita finisce e vince chi ha più Sigilli (§5.14, punto 8 bis). Si sceglie nel passo *Punti* dell'editor, con la proposta di 12; come le altre regole non cambia dopo l'inizio. La pagina `/evento` la mostra ai giocatori.
- **Limiti contro gli abusi:** facoltativo, un **tetto di punti al giorno** per evento (reset a mezzanotte `Europe/Rome`): l'ultima partita prende solo i punti che restano. Contro lo **stesso giocatore** danno punti al massimo 3 partite ogni 24 ore (`balance.ts` `events`, `game_config` `events.*`).
- **Traguardi:** da 1 a 5, ognuno con più punti del precedente. Il premio è quello dei codici bonus (§8.1): monete, pacchetti standard e carte scelte, con il disegno base o una variante, mai personaggi da sblocco di livello, varianti a caso e Schegge (§4.8). Le carte sono copie normali (`acquired_via = 'event'`), conquistabili.
- **Pagamento automatico:** il premio si paga appena il totale raggiunge il traguardo, nella stessa transazione che chiude la partita (o registra la Minaccia superata): non c'è niente da riscattare e nulla si perde alla fine dell'evento. Ogni traguardo paga una sola volta (`event_rewards`). Le carte e i pacchetti si mostrano con l'apertura dei pacchetti.
- **Dati:** `events` (date, punti in `points`, tetto), `event_tiers` (traguardi e premi), `event_points` (registro dei punti: una riga per partita o Minaccia, unica, quindi la stessa partita non conta due volte; il totale di un giocatore è sempre la somma), `event_rewards`. Nessun client legge le tabelle: i punti li scrivono i trigger su `matches` ed `emergency_plays`, monete e carte passano da `coin_ledger` (`event_reward`) e `card_transfers` (`event`).
- **Personaggi ammessi (facoltativo):** un evento può ammettere solo certi personaggi per **rarità** (`events.rarities`), **fazione** (`events.factions`) e **tratti** (`events.traits`, stessa regola di `card_matches_traits`). Dentro un gruppo basta una delle scelte (Delta o Gamma; Eroi o Cattivi; Mito o Strappo), tra gruppi diversi servono tutte (`card_admitted_by_event`); nessuna scelta ammette tutti. Una partita dà punti solo se **tutta la squadra** schierata è ammessa: i 5 personaggi di Amichevole, Conquista, bot, Storia e Grande Minaccia (`match_teams`), gli 8 della squadra in Emergenza (`emergency_runs`). Il controllo è in `award_event_points`, nella stessa transazione che chiude la partita. Il server rifiuta rarità, fazioni o tratti sconosciuti e regole che ammettono meno di 8 personaggi (`events.min_admitted_characters`, la squadra dell'Emergenza); sotto i 15 la pagina avvisa che pochi giocatori riusciranno a formare la squadra. Come le altre regole, non cambia più dopo l'inizio. Il giocatore vede la regola nel banner ("Solo Delta o Gamma · Eroi · Mito o Strappo") e nella pagina `/evento`; se la squadra non è ammessa, il risultato della partita dice "Squadra non ammessa all'evento: 0 punti".
- **Il giocatore vede:** in Gioca un banner con titolo, conto alla rovescia e barra verso il prossimo traguardo (o "Evento in arrivo" con il tempo all'inizio); a premio ottenuto il banner diventa "Premio evento ottenuto! Aprilo". In Home lo stesso in una casella accanto agli Obiettivi: titolo, punti verso il traguardo, tempo alla fine e una barra sottile ("Premio evento!" quando c'è da aprire). Al traguardo compare anche, in qualsiasi schermata, il banner temporaneo dell'app (§11.1). La pagina `/evento` mostra descrizione, date, punti totali e di oggi, i traguardi con le carte premio e la tabella dei punti. Il risultato di una partita e il riepilogo dell'Emergenza mostrano "+N punti evento". Finito l'evento, chi ha almeno un punto riceve l'avviso a tutto schermo di fine (§11.7).
- **Gestione dall'app:** in fondo all'informativa sulla privacy, accanto a *Gestione codici* e *Carte nei pacchetti*, gli amministratori trovano *Gestione eventi* (`/gestione-eventi`): crea un evento, elenca quelli in corso, programmati e conclusi con i giocatori e quanti hanno raggiunto ogni traguardo, e permette di modificarli, disattivarli, eliminarli (solo se nessuno ha punti) e **duplicarli** per ripeterli con nuove date (il progresso riparte da zero). Un evento iniziato cambia solo titolo, descrizione e fine, così le regole non cambiano a chi sta giocando; uno concluso non cambia più. Ogni funzione verifica l'amministratore sul server. Nel passo *Dati* si scelgono i personaggi ammessi per rarità, fazione e tratto, con il numero di personaggi che la regola ammette; nel passo *Premi* le carte premio si scelgono una per una o tutte insieme quelle che rispondono ai filtri (rarità, fazione, tratti), fino a 10.

### 8.3 Obiettivi giornalieri

Ogni giorno di gioco (da mezzanotte a mezzanotte `Europe/Rome`) ogni giocatore riceve alcuni obiettivi; completarne uno dà un premio da riscattare.

- **Quanti:** uno Facile, uno Medio e uno Difficile (`balance.ts` `dailyObjectives.perDay`, `game_config` `daily_objectives.per_day.*`). Il server li estrae a caso al primo uso del giorno: quando il giocatore apre gli obiettivi o la home, o quando fa qualcosa che conta, quindi conta anche la prima partita del giorno. Mai due obiettivi uguali né due che contano la stessa cosa nello stesso giorno.
- **Progresso:** lo calcola solo il database, nella stessa transazione che registra l'azione; il client non lo invia mai. Contano:
  - le partite **chiuse normalmente** in qualsiasi modalità: le partite abbandonate (`end_reason = 'forfeit'`) non contano per nessuno dei due, come negli eventi (trigger su `matches`);
  - le Minacce superate in Emergenza (`emergency_plays`; quella di ogni giorno, non quella della settimana, §5.16);
  - i pacchetti aperti: del giorno, comprati, speciali, e quelli di codici bonus ed eventi, ma non quelli che paga un obiettivo (`pack_openings`), e le **varianti trovate** negli stessi pacchetti (`variants_found`);
  - le **partite vinte con almeno una variante** tra le carte schierate (`variant_wins`, con i filtri delle vittorie);
  - i doppioni convertiti e le carte conquistate (`card_transfers`).
  Le "Minacce vinte" sono quelle della partita classica e i confronti di Allarme Triplo: un turno della Grande Minaccia non lo vince una sola carta. La partita che finisce dopo mezzanotte conta per il giorno nuovo.
- **Premio:** monete, pacchetti standard, carte scelte, varianti a caso e Schegge, come nei codici bonus (§8.1); un obiettivo senza monete proprie paga quelle della sua difficoltà: 20, 40, 60 (`dailyObjectives.rewardCoins`). Si riscatta una sola volta (`claim_daily_objective`), nella stessa transazione: monete in `coin_ledger` e Schegge in `shard_ledger` (`objective_reward`), carte in `card_transfers` (`objective`); le carte e i pacchetti si mostrano con l'apertura dei pacchetti. **Un premio non riscattato scade a mezzanotte**, come il pacchetto del giorno.
- **Cambi:** un obiettivo non ancora completato si può cambiare con un altro della stessa difficoltà, **3 volte al giorno in tutto** (`dailyObjectives.refreshesPerDay`). Il nuovo parte da zero e non è mai uno già proposto quel giorno; se non ne resta nessuno il cambio non avviene e non si consuma.
- **Catalogo di partenza** (testi segnaposto, tabella `daily_objective_definitions`, si cambia con SQL senza toccare il codice):

| Difficoltà | Obiettivo | Premio |
|---|---|---|
| Facile | Gioca 2 partite · Apri un pacchetto · Supera 3 Minacce in Emergenza · Gioca 3 carte Beta o più rare · Gioca una missione della Storia · Converti 2 doppioni | 20 monete |
| Media | Vinci 3 partite · Vinci 3 Minacce con un Supercattivo · Vinci 3 Minacce con un Supereroe · Vinci 2 Minacce con una carta Delta · Supera 5 Minacce in Emergenza · Vinci una partita ad Allarme Triplo · Vinci una partita a Grande Minaccia | 40 monete |
| Difficile | Vinci 2 partite contro un bot Difficile o Super Pro · Vinci una partita online contro un giocatore · Vinci una partita classica 3-0 · Vinci 6 Minacce in partita | 60 monete |
| Difficile | Conquista una carta · Supera tutte le 8 Minacce dell'Emergenza | 1 pacchetto standard |

  Ogni obiettivo ha una metrica (`matches_played`, `matches_won`, `threats_won`, `cards_played`, `emergency_passed`, `packs_opened`, `duplicates_converted`, `cards_conquered`) con filtri facoltativi in `params` (`format`, `story`, `challenge` (una Sfida a tema, §8.8), `opponent`, `bot_difficulties`, `flawless`, `faction`, `min_rarity_rank`, `max_rarity_rank`), controllati dal database. Un giocatore riceve una copia della riga, quindi una modifica al catalogo vale dalla prossima estrazione: chi ha già l'obiettivo quel giorno lo tiene com'era.
- **Gestione dall'app, solo amministratori:** aggiungere, modificare, togliere e rimettere obiettivi nel catalogo è riservato agli account in `admin_users`. In fondo all'informativa sulla privacy, accanto agli altri link di gestione, trovano *Obiettivi del giorno* (`/gestione-obiettivi`). La scheda *Elenco* mostra gli obiettivi per difficoltà, con stato, cosa contano, soglia, premio e quante volte sono stati assegnati, e i comandi Modifica, Disattiva/Riattiva ed Elimina. La scheda *Nuovo* chiede cosa conta (una delle 20 combinazioni di metrica e filtri), la difficoltà, la soglia, il titolo (proposto in automatico, modificabile) e il premio: le monete della difficoltà o un numero scelto, più 0–5 pacchetti, le Schegge (0–100), fino a 5 carte scelte (base o variante, con i filtri dell'editor) e le varianti a caso. I filtri fuori elenco si impostano solo con SQL e la pagina li lascia com'erano.
  Regole del server: un obiettivo già assegnato non si elimina, si disattiva (`objective_in_use`); ogni difficoltà deve tenere almeno tanti obiettivi attivi quanti se ne danno al giorno (`objectives_too_few`); serve sempre almeno un premio. Ogni funzione (`admin_list_daily_objectives`, `admin_save_daily_objective`, `admin_set_daily_objective_active`, `admin_delete_daily_objective`) verifica l'amministratore sul server: un giocatore non può né leggere né cambiare il catalogo.
- **Dati:** `daily_objective_definitions` (catalogo), `daily_objective_days` (giorno estratto e cambi usati), `daily_objectives` (obiettivi del giocatore con progresso, completamento, riscatto e cambio). Nessun client legge le tabelle: tutto passa da `get_daily_objectives`, `claim_daily_objective` e `refresh_daily_objective`.
- **Il giocatore vede:** nella home, sopra il pacchetto del giorno, la casella *Obiettivi* con "1 su 3 completati" (accanto a quella dell'evento, se c'è un evento; altrimenti su tutta la riga); quando c'è un premio diventa gialla con un pallino che pulsa. La pagina `/obiettivi` mostra per ogni obiettivo difficoltà, premio, barra di progresso e il tasto Riscatta o Cambia, il tempo ai nuovi obiettivi e i cambi rimasti. Quando un obiettivo si completa, in qualsiasi schermata compare il banner "Obiettivo completato!" (§11.1).

### 8.4 Ricompense delle partite

Cosa guadagna un giocatore a fine partita lo decide una tabella nel database, `match_reward_rules`, letta solo dal server (`finish_match`) nella stessa transazione che chiude la partita. Una riga per **modalità × avversario × esito**, con tre valori:

- **Monete:** in `coin_ledger` con motivo `match_reward`, da 0 a 10.000.
- **XP:** da 0 a 10.000, poi premi di livello come sempre.
- **Pacchetti standard:** da 0 a 3, aperti subito (`pack_openings.pack_type = 'match'`): a fine partita il giocatore li vede con il link *apri*. Non contano per l'obiettivo "Apri un pacchetto".

| Modalità (`mode_key`) | Avversari |
|---|---|
| `classic` Partita classica | bot · persona (amichevole online, codice amico o Classificata, §8.7) |
| `conquest` Conquista | persona · bot di Conquista |
| `boss` Grande Minaccia, `triple` Allarme Triplo, `quadrant` e `quadrant_shifting` Quadrante (griglia fissa e mobile) | bot · persona |
| `story` Missioni della Storia | bot (ogni partita, anche rigiocata; il premio della prima vittoria resta quello della missione, §5.11) |
| `challenge` Sfide a tema (§8.8) | bot · persona (ogni partita di una sfida, in ogni modalità; all'inizio uguale alla Classica) |
| `default` Modalità future | bot · persona |

- **Quale riga:** una missione della Storia usa `story`, una partita di una Sfida a tema `challenge`, una partita di Conquista `conquest`, le altre il loro formato (`matches.format`). L'avversario è "bot" se la partita ha una difficoltà del bot. Una modalità senza righe sue (una nuova, futura) usa le righe `default` finché una migrazione non le dà le sue.
- **Esiti:** vittoria, pareggio, sconfitta. **Chi abbandona non prende nulla**, e nemmeno le partite chiuse per abbandono di entrambi; chi vince perché l'altro abbandona prende la vittoria. Questa regola non è configurabile.
- **Valori iniziali:** quelli in vigore prima della tabella, così il gioco non cambia finché l'amministratore non li modifica: contro un bot 10 XP vittoria, 3 pareggio e sconfitta; contro una persona 30 e 10; monete solo in Conquista, 10 a chi perde e a entrambi sul pareggio, anche contro il bot di Conquista; nessun pacchetto.
- **Tetti giornalieri** (giorno di gioco `Europe/Rome`, per giocatore, su tutte le partite): monete `match_rewards.daily_coin_cap` (default 0 = nessun tetto) e pacchetti `match_rewards.daily_pack_cap` (default 3). Servono se si danno monete o pacchetti contro i bot, che si possono giocare senza limiti. Una partita che supera il tetto paga solo quello che resta.
- **Altro sulla stessa pagina:** le monete al vincitore di Conquista quando nessuna carta è conquistabile (`conquest.no_card_bonus_coins`, default 50) e i premi dell'Emergenza (§5.10): tre soglie di Minacce superate con le loro monete (le soglie crescono e non superano le Minacce della sfida; ogni soglia paga almeno 1 moneta) e l'XP a fine tentativo (`emergency.rewards.finish_xp`, default 0). Sotto, le soglie e i premi di classifica dell'Emergenza della settimana (§5.16), con le stesse regole.
- **Gestione dall'app, solo amministratori:** il link *Ricompense partite* (`/gestione-ricompense`), con gli altri link di gestione nel profilo (scheda *Altro*) e in fondo all'informativa. La scheda *Partite* mostra una sezione per modalità, con XP, monete e pacchetti per vittoria, pareggio e sconfitta di ogni avversario; la scheda *Tetti ed Emergenza* il resto, compresa la sezione *Pacchetti* con la probabilità delle varianti (§4.6). Un solo *Salva* manda tutte le modifiche insieme ad `admin_save_match_rewards`, che verifica l'amministratore e ogni valore sul server e salva tutto o niente. Vale per le partite che finiscono dopo il salvataggio. Le modalità non si aggiungono né si tolgono dalla pagina: arrivano con il codice.
- **Il giocatore vede:** a fine partita i guadagni veri, letti dal server (`get_match_reward`). I testi di Gioca e del Negozio (*Movimenti*: quali partite danno monete e quante) leggono la tabella (`get_match_rewards`, in sola lettura per tutti).

### 8.5 Imprese (obiettivi segreti a lungo termine)

Obiettivi a lungo termine, **segreti finché non si compiono**, gestiti dall'amministratore dall'app. Scelte dell'utente del 15 novembre 2026: premi sì, contano anche il passato, prima del completamento solo l'indizio, titolo visibile agli altri.

- **Il giocatore vede:** la pagina `/imprese` (dal profilo, scheda *Altro*, e in fondo a `/obiettivi`) è una bacheca di medaglie. Quelle coperte mostrano solo la sagoma con «???», il **grado** (Bronzo, Argento, Oro, Leggenda) e, se l'amministratore l'ha scritto, un **indizio**; niente barra di progresso, che svelerebbe la condizione. In alto il contatore «12 / 40 scoperte», le scoperte per grado e la scelta del titolo. Una medaglia scoperta mostra nome, cosa ha fatto il giocatore, data, premio, il tasto *Riscatta* e l'etichetta «Nuova!» la prima volta che si vede.
- **Segretezza:** il catalogo (`achievements`) non è leggibile da nessun client. `get_achievements` manda, per un'impresa non compiuta, solo id, grado e indizio; la condizione esatta mai. Le imprese disattivate o scadute spariscono dalla bacheca di chi non le ha; chi le ha le tiene con «Non più ottenibile».
- **Quando si compiono:** le decide il server con `check_achievements`, nella stessa transazione che registra ciò che conta (trigger su `matches` a fine partita, `profiles` per livello e serie, `card_transfers`, `pack_openings`, `daily_claims`, `emergency_plays`, `emergency_runs`, `story_progress`, `threat_sightings`, `daily_objectives`, `coin_ledger`), con il banner «Impresa scoperta!» (§11.1; più imprese insieme: un solo banner «Hai scoperto N imprese!»). All'apertura della pagina il server controlla tutte le imprese ancora aperte: quelle appena aggiunte o modificate, quelle che contano il passato e la data di registrazione; queste si vedono come «Nuova!» sulla pagina, senza banner. Un'impresa che non si riesce a calcolare viene saltata, senza mai bloccare la partita o l'azione che l'ha chiamata.
- **Cosa possono contare** (`achievement_progress`, filtri controllati da `achievement_params_valid`): partite vinte o giocate (formato, Conquista o amichevole, Storia, avversario giocatore o bot, difficoltà del bot, 3-0), vittorie in rimonta dopo aver perso i primi due round, round vinti con una carta più debole (es. Delta contro Omega), round vinti per un punto, vittorie con una squadra tutta di una fazione o di un tratto, modalità diverse vinte (classica, Conquista, Storia, Grande Minaccia, Allarme Triplo, Quadrante), partite finite in una fascia oraria italiana, vittorie di fila contro giocatori, personaggi posseduti (fazione, tratto, rarità, oppure tutti: album completo), varianti e stili di variante, stili completi (tutte le varianti di uno stile, `variant_styles_complete`) e personaggi con tutte le varianti (`variant_characters_complete`), pacchetti aperti, pacchetti del giorno ritirati, doppioni convertiti, carte conquistate (con un tetto facoltativo per avversario, così due amici non se le scambiano), carte perse, Minacce superate in Emergenza, Emergenze superate tutte, missioni della Storia (una stagione o un capitolo, anche completi), Minacce rare avvistate (anche tutte), obiettivi del giorno completati, monete guadagnate, livello, data di registrazione, e imprese date a mano dall'amministratore. Come negli eventi, le partite abbandonate non contano mai.
- **Passato:** ogni impresa dice se conta anche ciò che il giocatore ha fatto prima (`counts_from` nullo) o solo da quando è stata creata. Collezione, livello, serie e Storia guardano cosa il giocatore ha adesso.
- **Premio:** monete, pacchetti standard, fino a 5 carte scelte (base o variante, mai personaggi da sblocco di livello) varianti a caso e Schegge (§8.1, §4.8), più un **titolo** facoltativo; tutto a zero è solo la medaglia. Si riscatta una volta (`claim_achievement`) e **non scade**: monete in `coin_ledger` e Schegge in `shard_ledger` (`achievement_reward`), carte in `card_transfers` (`achievement`), pacchetti e carte con l'apertura dei pacchetti (`pack_openings.pack_type = 'achievement'`, che non conta come pacchetto aperto). Valori suggeriti dall'editor per grado (`balance.ts` `achievements.suggestedReward`): Bronzo 50 monete, Argento 150, Oro 2 pacchetti, Leggenda 3 pacchetti e un titolo.
- **Titolo:** il giocatore sceglie un titolo tra quelli delle sue imprese (`set_player_title`, copiato in `profiles.title`); lo vede nel profilo sotto il nome e lo vede l'avversario in partita, al posto del nome nella riga piccola in alto (`get_match_opponent_title`, solo per chi gioca quella partita).
- **Modifiche e rimozioni:** chi ha compiuto un'impresa ne tiene una copia (`player_achievements`: nome, testo, grado, premio, titolo), quindi una modifica successiva non lo tocca; se la condizione diventa più facile, gli altri la ottengono al prossimo controllo. Disattivare non toglie nulla a chi l'ha. Si elimina solo un'impresa che nessuno ha compiuto (`achievement_in_use`).
- **Gestione dall'app, solo amministratori:** il link *Imprese* (`/gestione-imprese`) nell'Editor. La scheda *Elenco* mostra le imprese nell'ordine della bacheca con grado, condizione in italiano, indizio, premio, quanti giocatori l'hanno compiuta (e la percentuale) e da quando conta, con i comandi ↑ ↓, Modifica, *Dai a mano* (per nome del giocatore), Disattiva/Riattiva ed Elimina. La scheda *Nuova* chiede cosa conta e i filtri, quanti, se conta il passato, grado, nome, testo (proposto in automatico), indizio, premio con carte e varianti, titolo e un ultimo giorno facoltativo; l'anteprima mostra la medaglia coperta e scoperta e «oggi la otterrebbero N giocatori su M» (`admin_preview_achievement`). Ogni funzione (`admin_list_achievements`, `admin_save_achievement`, `admin_preview_achievement`, `admin_set_achievement_active`, `admin_delete_achievement`, `admin_reorder_achievements`, `admin_grant_achievement`) verifica l'amministratore sul server.
- **Prima serie** (testi segnaposto, migrazione `20261115170000_achievements.sql`, tutte contano il passato): Bronzo, 50 monete: Primo sangue, Senza pietà, Cambio d'abito, Lezione imparata, Turno di notte, Avvistamento, Pioniere (anche il titolo); Argento, 150 monete o 1 pacchetto: Davide e Golia, Mai dire mai, Senza ombre, Senza scrupoli, Per un soffio, Inarrestabile, Giornata perfetta, Collezionista, Habitué; Oro, 2 pacchetti: Conquistatore e Domatore di macchine (con titolo), Tutte le strade, Galleria d'arte, Fino all'ultima pagina; Leggenda, 3 pacchetti e un titolo: Ogni volto del male, Bestiario completo, La lettera più rara, Cento.

### 8.6 Classifiche

Classifiche globali per ogni modalità, oltre a quella di giornata dell'Emergenza (§5.10). Scelte dell'utente del 15 novembre 2026, sulla proposta consigliata: tutte le schede, Settimana e Sempre (Oggi solo per Emergenza e Generale), punti pesati per difficoltà, un titolo a tempo per il primo della settimana e nessuna moneta in premio.

| Scheda | Cosa conta | Periodi |
|---|---|---|
| **Generale** | Oggi e Settimana: l'esperienza guadagnata con le partite (`matches.reward_xp_*`) e l'Emergenza (`emergency_runs.xp`). Sempre: l'esperienza totale, cioè il livello | Oggi, Settimana, Sempre |
| **Emergenza** | Oggi: la classifica di giornata di §5.10. Settimana e Sempre: Minacce superate sommate; il tentativo di oggi conta quando è finito, quelli dei giorni passati sempre. Mostra anche i tentativi e le Emergenze perfette | Oggi, Settimana, Sempre |
| **Emergenza settimanale** | La classifica dell'Emergenza della settimana (§5.16): tentativi finiti, Minacce superate, poi punteggio, poi chi ha finito prima. Nel profilo «Emergenza sett.» | Settimana |
| **Classica**, **Grande Minaccia**, **Allarme Triplo**, **Quadrante** (griglia fissa e mobile insieme), **Conquista** | Punti classifica (sotto); la Conquista ha la sua scheda qualunque sia l'avversario | Settimana, Sempre |
| **Storia** | Missioni completate (`story_progress`, prime vittorie) | Sempre |

- **Punti classifica**, uguali per tutte le modalità a partita: vittoria contro una persona **10**, contro un bot Super Pro **6**, Difficile **4**, Medio **2**, Facile **1**; il pareggio vale metà, la sconfitta 0. Il bot di Conquista (§6.5) vale come un bot della sua difficoltà. Valori in `balance.ts` (`leaderboards.points`) e `game_config` (`leaderboards.points.*`); valgono per le partite che finiscono dopo una modifica.
- **Anti-abuso:** le partite **abbandonate** (`end_reason = 'forfeit'`) non contano per nessuno, nemmeno per chi vince, e le **missioni della Storia** non danno punti (hanno la loro scheda). Dai **bot** al massimo `leaderboards.bot_daily_cap` (40) punti al giorno di gioco, tutte le modalità insieme: l'ultima partita prende solo quelli che restano. Contro la **stessa persona** contano al massimo `leaderboards.same_opponent_daily` (3) partite al giorno, in tutte le modalità, sconfitte comprese; le altre danno 0. Il server non sa se un'amichevole viene dalla coda o da un codice amico: il limite guarda l'avversario. 0 toglie il tetto o il limite.
- **Ordine e parità:** valore più alto, poi (solo nell'Emergenza di oggi) il punteggio, poi **chi ci è arrivato prima** (l'ultima partita o il tentativo che gli ha dato punti): niente posti condivisi. Nella Generale di sempre, a parità di esperienza, chi si è registrato prima. Le **settimane** vanno dal lunedì alla domenica, ora italiana (`game_week`); il giorno è quello di gioco (`game_day`). In classifica solo chi ha qualcosa: almeno un punto, una Minaccia, una missione.
- **Percentuale di vittorie:** sulle schede a partita compare accanto alle vittorie solo dopo `leaderboards.min_matches_for_rate` (10) partite contate, e non decide mai la posizione.
- **Cosa si vede:** i primi `leaderboards.size` (10) con posizione, avatar, nome, titolo (§8.5) e numeri; chi è più in basso vede la sua posizione in giallo sotto l'elenco, e sotto il numero di giocatori. Mai squadre, mazzi o carte giocate.
- **Titolo della settimana:** a fine settimana il primo di ogni scheda tranne la Storia riceve un titolo fino alla fine della settimana dopo (lunedì a mezzanotte): «Campione della settimana» (Generale), «Campione dell'Emergenza», «Eroe della settimana» (Emergenza settimanale, dal 18 novembre 2026), «Campione della Classica», «Campione di Grande Minaccia», «Campione di Allarme Triplo», «Campione di Quadrante», «Campione di Conquista». Arriva con il banner «Primo della settimana!» (§11.1, `kind = 'leaderboard'`, apre la scheda) e, se il giocatore non mostra già un titolo, compare subito; altrimenti lo sceglie nelle Imprese, dove i titoli della settimana stanno dopo quelli delle imprese con «(questa settimana)». Scaduto, sparisce dal profilo se nessuna impresa e nessun'altra settimana dà lo stesso titolo. Nessuna moneta: si può aggiungere più avanti. La settimana si chiude la prima volta che qualcuno apre una classifica, la Home, il Profilo o le Imprese dopo il lunedì a mezzanotte (`leaderboard_close_week`, una volta sola per settimana, `leaderboard_weeks`); conta solo la settimana appena finita.
- **Dove si apre:** la pagina **Classifiche** (`/classifiche/?scheda=…&periodo=…`) ha in alto le schede (una riga che scorre di lato), sotto i periodi della scheda e una riga che spiega cosa conta. Ci si arriva dalla **coppa** nell'intestazione della Home, con un'etichetta con la posizione migliore della settimana (o di sempre); dalla coppa nell'intestazione di Gioca e da una riga «Classifica di …» in fondo a ogni modalità aperta (la Conquista ha il link accanto al suo titolo; la Storia ha un pulsante con la coppa in cima, sopra i capitoli, perché in fondo la riga sembrava un capitolo in più); dal **Profilo**: la scheda Posizioni è una tabella con una riga per classifica e le colonne Settimana e Sempre (ogni posizione apre la sua scheda), più l'Albo della Classificata (§8.7) con il posto nel Mandato; la scheda Altro ha il link *Classifiche*. Un riquadro con la frase intera in Home non ci stava a 667 px di altezza.
- **Tecnica** (migrazione `20261115210000_leaderboards.sql`): `leaderboard_points` è il registro dei punti, una riga per giocatore per ogni partita finita normalmente (anche a 0 punti, perché il limite conta le partite), scritta dal trigger `matches_leaderboard_points` nella stessa transazione che chiude la partita (`leaderboard_record_match`); la migrazione l'ha riempita con tutte le partite già giocate, in ordine, con i tetti, quindi Settimana e Sempre contano anche il passato. `leaderboard_rows` calcola una scheda tra due giorni (le schede a partita dal registro, Emergenza da `emergency_runs`, Generale da `profiles` e dalle partite, Storia da `story_progress`). RPC per i client (`security definer`): `get_leaderboard(scheda, periodo)` (rifiuta i periodi che la scheda non ha: `leaderboard_period_invalid`), `get_my_leaderboard_places()` (le posizioni del giocatore), `get_leaderboard_titles()` (i titoli della settimana ancora validi); `set_player_title` accetta anche l'id di un titolo della settimana. Tabelle con RLS e nessuna policy: nessun client le legge. Test: `supabase/tests/leaderboards.test.sql`.

### 8.7 Classificata e Albo dei Reggenti

Chiesta dall'utente il 17 novembre 2026 e approvata sulla proposta consigliata: una **Partita classificata** in ogni modalità a partita, una **Fama** unica per tutte, sei leghe, il **Mandato** mensile con i premi e l'**Albo dei Reggenti** come classifica totale. Dopo 20-30 secondi senza avversari umani il matchmaking trova un avversario giocato dal server, che il giocatore non distingue da una persona.

- **Dove:** in Home il pulsante Gioca è diviso in due (chiesto dall'utente il 17 novembre 2026): a sinistra **Gioca** (tutte le modalità, come prima), a destra **Classificata**, su fondo oro, con la Fama e la lega del giocatore. Porta alla pagina **Classificata** (`/classificata`), che sta in uno schermo da 375×667 senza scorrere, anche con un premio da ritirare e una partita in corso: in alto la Fama con la barra verso la lega successiva, il Mandato con la posizione e le classificate fatte per il premio, il premio da ritirare (su una riga, con *Ritira*) e la coppa per l'Albo; poi una casella per modalità, ognuna con la sua coda: la Classica larga, sotto Grande Minaccia, Allarme Triplo e le due griglie di Quadrante a due a due (su un telefono alto le caselle si allungano a riempire lo spazio); poi la regola in breve e i premi di fine Mandato per lega. Con una partita in corso le caselle sono spente, come in Gioca. La barra in basso resta con un solo Gioca, acceso anche su questa pagina. In Gioca la stessa pagina si apre dalla casella Classificata della riga **In palio**, accanto alla Conquista (§11.6; fino al 17 novembre 2026 era il pulsante oro con la medaglia nell'intestazione). Si sceglie la squadra come in un'amichevole (`/squadra/?mode=ranked&format=…`), poi si attende in coda (`/attesa/?mode=queue&type=ranked`); da lì «indietro» e *Annulla* riportano alla pagina Classificata. **Restano fuori** la Conquista (carte in palio: lì il bot è sempre dichiarato, §6.5, e un avversario nascosto non deve mai prendere né dare carte), l'Emergenza e la Storia (in solitaria). Nessuna carta in gioco e, come nelle amichevoli, nessuna moneta per partita.
- **Regole del gioco:** quelle della modalità, senza cambiamenti. Sotto la voce si legge: «Vinci e guadagni Fama, perdi e ne perdi un po': conta di più battere chi ne ha di più. Una sola Fama per tutte le modalità. Se nessuno è libero, dopo qualche secondo affronti un Reggente gestito dal sistema, del tuo livello. Nessuna carta in gioco.» Non dice mai quali avversari lo sono.
- **Fama** (`balance.ts` `ranked`, `game_config` `ranked.*`; la stessa regola in `packages/game-engine/src/ranked.ts`, `rankedFamaChange`, e nel database, `ranked_fama_change`): contro chi ha la stessa Fama una vittoria dà **+25** e una sconfitta toglie **20**; ogni 20 punti di Fama che l'avversario ha in più valgono un punto in più se vinci e uno in meno se perdi (tu 1000, lui 1200: +35 o −10), con la vittoria tra +10 e +40 e la sconfitta tra −5 e −35. Dalla terza vittoria di fila +5. Il pareggio vale 0. Chi abbandona, o sparisce (§5.7), perde come in una sconfitta; chi vince per abbandono vince. Si parte da 0. Chi vince il 44% delle partite contro avversari della sua Fama resta fermo: chi gioca di più sale piano, ma conta vincere.
- **Leghe:** Recluta da 0, Vigilante da 300, Veterano da 700, Asso da 1200, Leggenda da 1800, O-MEGA da 2500. In Recluta una sconfitta non toglie nulla; in Vigilante e Veterano non si scende sotto l'inizio della lega; da Asso in su sì (mai sotto 0).
- **Matchmaking tra persone:** la coda `ranked` di ogni formato abbina chi ha la Fama più vicina: entro 150, dopo 10 secondi entro 400, dopo 20 chiunque. Tra le stesse due persone contano per la Fama al massimo 3 classificate per giorno di gioco (`ranked.same_opponent_daily`); le altre si giocano a 0.
- **L'avversario del server** (nel codice *ghost*): se nessuno arriva, in un momento tra 20 e 30 secondi (sorteggiato dal giocatore e dal suo ingresso in coda, `ranked_ghost_wait`) il server crea la partita. La difficoltà del bot e la sua squadra dipendono dalla Fama del giocatore, lega per lega e via via verso la lega successiva (`ranked.ghosts.*`):

| Lega | Bot | Squadra |
|---|---|---|
| Recluta | da Facile a Medio | casuale, mai più forte della tua |
| Vigilante | Medio | casuale, al massimo il 10% più forte della tua |
| Veterano | da Medio a Difficile | dal catalogo intero al 50% più forte, al massimo il 25% più forte della tua |
| Asso | Difficile | dal 50% al 35% più forte del catalogo |
| Leggenda | da Difficile a Super Pro | dal 35% al 20% |
| O-MEGA | Super Pro | dal 20% al 15% (come Super Pro, §5.9) |

  La forza di una squadra è quella di §5.9 (somma dei quadrati dei valori, più il Sabotatore). La rarità pesa molto (§5.9): in alto i bot hanno squadre forti, come le avrebbero i giocatori migliori, quindi per arrivare in O-MEGA servono una buona collezione e saper giocare. I numeri vanno tarati con i simulatori (`scripts/simulate-*.mts`) perché chi è alla sua Fama giusta vinca circa metà delle partite.
- **Come sembra una persona:** 300 profili fissi (`ranked_ghosts`) con un nome nello stile di quelli che il gioco crea dagli account Google (es. `Giacomo_Testa`, `Massimo_Cattane_2632`, `gaia_b`, `LaFenice`), riservato (nessun giocatore può prenderlo: `username_taken`), il volto di un personaggio (più raro nelle leghe alte) o l'iniziale, un livello vicino al suo, a volte il titolo di un'impresa comune, e una Fama sua che si muove al contrario di quella del giocatore. Il server sceglie un avversario libero, preferibilmente non incontrato nelle ultime 24 ore, vicino per Fama e livello; la sua Fama diventa quella del giocatore ±60 (in cima all'Albo resta sotto quella del decimo, dove altrimenti si noterebbe la sua assenza) e un livello troppo lontano viene avvicinato. Sceglie con **tempi umani**: tra 9 e 26 secondi dall'apertura del round in Classica e Grande Minaccia, tra 14 e 40 al primo round di Allarme Triplo e tra 28 e 62 ai successivi (le tre carte insieme), tra 5 e 20 per ogni sua mossa di Quadrante; il 4% delle volte negli ultimi secondi del timer, tra 8 e 4 secondi dalla fine. In ogni modalità **mai a meno di 4 secondi dalla fine** (`ranked.ghosts.late_seconds.*`, `ranked.ghosts.deadline_margin_seconds`; fino al 19 novembre 2026 gli ultimi secondi erano tra 6 e 2 e il margine 1, scritti nella funzione; migrazione `20261119230000_ghost_timing.sql`): l'app, che non lo distingue da una persona, chiede la sua scelta al server ogni 2 secondi, così si vede sempre prima che il tempo finisca. Fino ad allora risulta presente e «sta scegliendo»; poi «ha scelto».
- **Niente che lo tradisca:** per tutto ciò che il giocatore vede, una classificata è una partita contro una persona: statistiche del profilo (vittorie, serie), obiettivi del giorno e imprese «contro un giocatore», punti evento del tipo *Online* (§8.2), ricompense della riga *persona* (§8.4), storico e titolo dell'avversario. Contro l'avversario del server non si può reclamare la vittoria per assenza (`opponent_still_connected`): non sparisce mai. Una partita lasciata a metà per 10 minuti è persa (§5.7), come contro un bot.
- **Il giocatore vede:** nel profilo, scheda Statistiche, *Fama* (con la lega) e *Classificate: V / S / P*; nello storico «Classificata · nome» con la Fama mossa; a fine partita due etichette, «+27 Fama · 327 Fama» e, se cambia, «Sei salito in Vigilante!».
- **Classifiche di §8.6:** le classificate **non** danno punti alle schede a partita (hanno l'Albo). Contano per la Generale (esperienza), come ogni partita.
- **Albo dei Reggenti:** prima scheda delle Classifiche (`/classifiche/?scheda=albo`). Come le altre schede ha due viste, **Mandato** e **Albo d'oro**. Nel Mandato una riga di filtri che non scorre (Tutte · Classica · Minaccia · Triplo · Quadrante: per tutte le modalità la Fama, per una la Fama guadagnata lì nel Mandato, vittorie meno sconfitte), una riga che dice cosa conta e quanti Reggenti hanno giocato (al suo posto il premio da ritirare, se c'è) e i primi 10 (`ranked.board_size`) in righe compatte con avatar, lega, titolo, valore e vittorie, più la posizione del giocatore sotto: tutto in uno schermo da 375×667 senza scorrere. L'Albo d'oro mostra i primi tre di un Mandato chiuso alla volta, con le frecce per passare agli altri. Solo chi ha giocato almeno una classificata nel Mandato; **mai gli avversari del server**. A parità, chi ci è arrivato prima.
- **Mandato:** un mese di calendario, ora italiana. Si chiude la prima volta che qualcuno apre l'Albo, Gioca, il profilo o i titoli dopo la mezzanotte del primo del mese (`ranked_close_seasons`, una volta per Mandato, `ranked_seasons`): per ognuno posto, Fama e lega (`ranked_season_results`) e, a chi ha giocato almeno **5** classificate nel Mandato, il premio della lega: Recluta 25 monete, Vigilante 50, Veterano 100, Asso 1 pacchetto e 100 monete, Leggenda 2 pacchetti, O-MEGA 3 pacchetti (`ranked.season.rewards.*`). Un titolo per sempre: «1° Reggente · novembre 2026» (2°, 3°) ai primi tre, altrimenti «O-MEGA · novembre 2026» o «Leggenda · novembre 2026»; se il giocatore non ne mostra già uno compare subito, altrimenti lo sceglie nelle Imprese con gli altri. Ognuno lo scopre la prima volta che apre l'app, con l'avviso a tutto schermo di fine Mandato: posto, Fama, premio e Albo finale (§11.7; fino al 19 novembre 2026 era il banner «Mandato concluso!», §11.1); il premio si ritira nell'Albo o nella pagina Classificata (*Ritira*: monete nel `coin_ledger` con `ranked_prize`, pacchetti aperti subito, tipo `ranked`) e non scade. Alla prima classificata del Mandato nuovo la Fama riparte da tutta quella fino a 700 più metà del resto (2500 → 1600), scritto nel registro.
- **Tecnica** (migrazione `20261117230000_ranked.sql`): `matches.mode = 'ranked'`. Tra persone è una partita tra giocatori (creata come amichevole del suo formato, poi segnata), con `ranked_matches` (Fama di partenza dei due e Fama mossa). Contro il server la partita è costruita come quella contro il bot della modalità (`match_create_bot`, `match_create_boss_bot`, …) e poi resa classificata **senza secondo giocatore e senza difficoltà** (`player_b` e `bot_difficulty` nulli: il vincolo `matches_one_opponent` lo permette solo qui), così ogni conteggio che separa bot e persone la vede come una persona; `ranked_matches` tiene l'avversario e la difficoltà, `ranked_ghost_turns` il momento in cui «sceglie» in ogni round (scritto da un trigger su `match_rounds`). Nessun client legge queste tabelle. `match_state_payload` aggiunge `ranked` (Fama, Fama mossa, leghe) e, contro il server, nome, volto, livello e presenza dell'avversario e il suo «ha scelto»; lo stesso fanno `match_ping`, `get_match_history` e `get_match_opponent_title`. La Edge Function riceve l'avversario da `match_round_context` (`match.ghost`: difficoltà e se è il suo momento) e lo fa giocare con i bot del motore quando risolve il round, mai prima del suo momento. Dopo ogni scelta del giocatore, in ogni partita tra giocatori, la Edge Function prova subito a risolvere (`resolveAfterChoice`): `match_round_context` le dice se l'avversario è del server e se ha già scelto, altrimenti risponde con lo stato (fino al 19 novembre 2026 lo faceva solo se l'app diceva che era una classificata; la notte tra il 19 e il 20 leggeva `ranked_matches`, che la Edge Function non può leggere, e dopo ogni scelta l'app mostrava «Qualcosa è andato storto» anche se la scelta era salvata); in coda lo pianifica a ogni chiamata (`planRankedGhost`, con la Fama e la squadra da `ranked_queue_info`) e il database lo usa solo ad attesa finita. Dove l'avversario può essere del server, cioè in Classificata e nelle Sfide a tema online (`opponentMayBeServer`, anche contro una persona, per non distinguerli), il client chiede la risoluzione ogni 2 secondi mentre aspetta l'avversario (`useOpponentNudge`, `balance.ts` `ranked.ghosts.nudgeSeconds`: dopo la sua scelta, o nel turno dell'avversario in Quadrante). In coda il client della Classificata la rinnova ogni 3 secondi. Fino al 19 novembre 2026 lo faceva solo in Classificata (ogni 3 secondi): nelle Sfide a tema online l'avversario del server giocava solo allo scadere del tempo, in ogni turno, anche dopo aver «scelto» (segnalato in una Grande Minaccia). La Fama è un registro (`ranked_ledger`: una riga per partita, anche a 0, e una per il reset di un Mandato) con il totale in `ranked_players`, scritto dal trigger `matches_ranked_fama` nella stessa transazione che chiude la partita. RPC per i client: `get_my_ranked`, `get_ranked_board(p_season, p_format)`, `get_ranked_hall`, `claim_ranked_prize(p_season)`; `get_leaderboard_titles` e `set_player_title` accettano i titoli dei Mandati. Test: `packages/game-engine/src/ranked.test.ts`, `src/lib/ranked.test.ts`, `supabase/tests/ranked.test.sql`.

### 8.8 Sfide a tema

Chieste dall'utente il 18 novembre 2026 («eventi ad hoc» dall'Editor) e approvate sul piano proposto: una **modalità che esiste già, giocata per un periodo solo con certi personaggi**. Gli amministratori le creano dall'Editor; il server controlla la squadra a ogni inizio partita. Lo stesso giorno l'utente ha chiesto di fare anche la seconda tappa del piano prima di pubblicare: qui ci sono tutte e due.

- **Modalità e avversari:** tutte le modalità a partita, **Classica**, **Grande Minaccia**, **Allarme Triplo** e **Quadrante** (griglia fissa o mobile), contro i **bot** (da zero a quattro livelli) e/o in **amichevole online** (una coda della sfida, avversario casuale, e i codici amico). Se **il bot gioca con le stesse regole** (di serie sì), la sua squadra si pesca solo tra i personaggi ammessi, con la forza della sua difficoltà (§5.9). Un Quadrante può avere un **traguardo di Sigilli** suo, come negli eventi (§5.14, punto 8 bis). Dalla terza tappa anche l'**Emergenza a tema** (vedi sotto). Restano fuori Conquista, Classificata e Storia.
- **Vincoli sulla squadra:** rarità, fazioni e tratti come i personaggi ammessi di un evento (§8.2: dentro un gruppo basta una scelta, tra gruppi servono tutte; i tratti con la regola di `card_matches_traits`, §4.7); le **varianti** (nessun obbligo, almeno N copie schierate con una variante, oppure tutte), facoltativamente **solo di certi stili** (contano solo quelle); **personaggi esclusi**, oppure **solo un elenco** di personaggi; **niente starter** (nessuna copia dello starter set e nessuna carta di livello); un **livello minimo** del giocatore.
- **Altro che si sceglie:** titolo (3-40 caratteri), descrizione (fino a 140) e uno di otto colori chiari; inizio e fine in ora italiana (al massimo 90 giorni); le **partite al giorno** (da 1 a 20, vuoto = illimitate; contano anche quelle abbandonate e quelle online, da qualunque lato); l'**evento collegato**, se c'è, con i punti della sfida per vittoria, pareggio e sconfitta (da 0 a 1000; il modulo propone 20, 10 e 5); il **premio della sfida**, fino a 3 traguardi di vittorie nella sfida (ognuno con più vittorie del precedente, al massimo 100), ognuno con i premi di un codice bonus (§8.1: monete, pacchetti, carte scelte con il disegno base o una variante, varianti a caso, Schegge).
- **Limiti del server:** una sola sfida attiva per modalità alla volta (`challenge_overlap`), così l'etichetta in Gioca non è mai ambigua; almeno un bot o l'online; i vincoli devono lasciare almeno una squadra (5 personaggi, 9 nell'Allarme Triplo, 10 nel Quadrante) e abbastanza personaggi con una variante che conta (`challenge_too_few_characters`); una sfida collegata sta dentro le date del suo evento. Sotto i 15 personaggi ammessi l'Editor avvisa che pochi giocatori riusciranno a formare la squadra.
- **Il giocatore vede:** in Gioca la casella della modalità ha l'etichetta «★ A tema» nel colore della sfida, in riga con quello che serve, senza righe in più (Gioca sta ancora in 375×667); nella Home il pulsante Gioca porta la stessa etichetta con il titolo della sfida al posto di «Tutte le modalità». La prima volta che il giocatore vede una sfida in corso (che può giocare per livello) arriva il banner «Nuova Sfida a tema!» (§11.1). Aperta la modalità, accanto ad Allenamento e Amichevole c'è la scheda **★ A tema**, aperta di serie, che prende il posto della riga di regole della modalità: titolo, tempo che resta, descrizione, regole, i personaggi adatti del giocatore, le partite di oggi, il livello minimo, il traguardo di Sigilli, i punti evento, il premio (traguardi raggiunti spuntati, «Apri il premio» quando c'è qualcosa da vedere), poi i bot su una riga e i pulsanti online (*Avversario casuale*, *Codice amico*). Senza abbastanza personaggi adatti (o varianti, o il livello) al posto dei pulsanti c'è il messaggio («Ti servono 5 personaggi adatti: ne hai 3», «Si gioca dal livello 5: tu sei al 3») con i link ad Album e Negozio. Niente carte in prestito.
- **La squadra** (`/squadra/?sfida=<id>&difficulty=…` contro un bot, `&mode=queue` o `&mode=lobby` online, con `&format=…` fuori dalla Classica; entrando con un codice la sfida si legge dal codice, `get_lobby_challenge`): in alto le regole, quante carte della squadra le rispettano e quante varianti servono; l'elenco mostra solo le carte ammesse, e «Tutte» mostra anche le altre in grigio con il motivo («✗ Alfa», «✗ Eroi», «✗ Tratti», «✗ Esclusa», «✗ Fuori elenco», «✗ Di livello», «✗ Senza variante»), che non si possono scegliere. Senza starter, di ogni personaggio si schiera una copia che non è dello starter set, e quelli posseduti solo come starter non compaiono. Aggiungendo un personaggio quando mancano varianti, se ne ha una di uno stile che conta la squadra la schiera da sola. Il pulsante dice cosa manca finché la squadra non va bene. Ogni sfida ricorda la sua ultima squadra.
- **Online:** la coda della sfida (`challenge_queue`) abbina due giocatori qualsiasi della stessa sfida, senza filtri di livello o di valore; chi aspettava da più tempo è il giocatore A. Le due squadre devono rispettare le regole (la propria è controllata prima di entrare in coda) e le partite del giorno valgono per tutti e due. Se nessuno della sfida è libero, dopo 20-30 secondi l'avversario lo trova il server, come in Classificata (§8.7): uno dei suoi avversari (nome, faccia, livello), che sceglie con i tempi di una persona e in ogni schermata appare come tale, giocato dalla Edge Function con un bot dei livelli della sfida (Facile, Medio o Difficile se non ne ha) e una squadra dentro le regole della sfida; la sua scelta arriva come in Classificata, sempre prima della fine del tempo (§8.7). È un'amichevole della sfida senza secondo giocatore (`challenge_insert_ghost_match`, l'avversario in `ranked_matches`): non muove Fama, conta come le altre partite della sfida e, se abbandonata, è persa. Prima (fino al 18 novembre 2026) la pagina d'attesa proponeva invece i bot della sfida (migrazione `20261118280000_challenge_online_ghost.sql`). Un codice amico fatto nella sfida (`create_challenge_lobby`) crea una partita della sfida; chi entra vede le regole e la sua squadra le deve rispettare.
- **Dopo la partita:** un'etichetta con il titolo della sfida e le partite di oggi; lo Storico scrive la sfida; «Rivincita» e «Gioca ancora» ripropongono la stessa sfida (contro lo stesso bot, nella coda online della sfida o con un nuovo codice amico della sfida), mai la modalità senza la sfida: a sfida finita, o con le partite di oggi finite, lo dicono (§11.2). Fino al 20 novembre 2026 la «Rivincita» contro il bot perdeva la sfida e «Gioca ancora» in Gioca, a sfida finita, passava alla modalità normale. Finita la sfida, chi l'ha giocata riceve l'avviso a tutto schermo di fine con la classifica finale, se la sfida ne ha una (§11.7). La pagina `/evento` elenca le sfide collegate (con «Gioca →») e mette i loro punti nella tabella.
- **Punti, premi, conteggi:** collegata a un evento, una partita della sfida dà i punti della sfida al posto della riga dell'evento per quel tipo di partita, senza il filtro dei personaggi ammessi dell'evento (le regole della sfida bastano, controllate all'inizio); bonus varianti, tetto giornaliero, limite contro lo stesso avversario, traguardi e classifica restano quelli dell'evento (`award_event_points`). Una sfida non collegata conta per l'evento in corso come una partita qualsiasi. Le ricompense della partita (§8.4) vengono dalla riga **Sfide a tema** (`mode_key = 'challenge'`, all'inizio uguale alla Classica), per tutte le modalità. Il **premio della sfida** si paga da solo, nella transazione che chiude la partita, quando le vittorie nella sfida (partite finite normalmente) raggiungono un traguardo: una volta sola per traguardo (`challenge_rewards`), monete in `coin_ledger` (`challenge_reward`), carte in `card_transfers` (`challenge`), pacchetti e carte con l'apertura dei pacchetti (`pack_openings.pack_type = 'challenge'`, «Premio della sfida»), con il banner «Premio della sfida!». Gli obiettivi del giorno possono contare le partite giocate o vinte in una Sfida a tema (filtro `challenge`, §8.3); imprese e classifiche (§8.6) la vedono come una partita della sua modalità. Le partite abbandonate non danno punti né premi.
- **Regole copiate sulla partita:** quando la partita nasce, il server controlla la sfida (attiva, nelle date, il bot permesso o l'online, il livello, le partite di oggi), crea la partita della modalità come sempre (contro un bot `challenge_create_bot_match`, online `challenge_queue_join` e `match_join_lobby`), la segna (`matches.challenge_id`) e copia regole, versione, evento e punti in `challenge_match_terms` (`challenge_tag_match`), come le stelle della Storia (§5.11). Un trigger su quella copia controlla la squadra, o le due squadre online, con le regole copiate (`challenge_team_problem`): nessuna partita diventa di una sfida con una squadra che non le rispetta, qualunque funzione l'abbia creata. Una modifica dell'amministratore vale per le partite create dopo.
- **Gestione dall'app, solo amministratori:** il link *Sfide a tema* (`/gestione-sfide`) nell'Editor, gruppo Eventi. La scheda *Sfide* mostra in corso, programmate e concluse con modalità, avversari, date, evento, livello, Sigilli, regole, traguardi del premio (e quanti li hanno raggiunti), partite, giocatori e personaggi ammessi, e i comandi Modifica, Duplica (date nuove, senza evento), Disattiva/Riattiva ed Elimina (solo se nessuno l'ha giocata, `challenge_in_use`). La scheda *Nuova sfida* ha cinque passi: *Dati*; *Modalità* (le cinque modalità, i bot, il bot con le stesse regole, l'online, il livello minimo, i Sigilli del Quadrante); *Vincoli* (rarità, fazione, tratti, varianti e i loro stili, solo questi personaggi, esclusi, niente starter, con il conteggio dal vivo dei personaggi ammessi e di quanti giocatori oggi possono formare la squadra, `admin_preview_challenge`); *Premi* (evento e punti, partite al giorno, i traguardi del premio con carte e varianti a caso); *Anteprima* (la casella e la scheda come le vedono i giocatori, e i controlli). Una sfida iniziata cambia solo titolo, descrizione e fine. Ogni funzione (`admin_list_challenges`, `admin_save_challenge`, `admin_preview_challenge`, `admin_set_challenge_active`, `admin_delete_challenge`) verifica l'amministratore sul server.
- **Tecnica** (migrazioni `20261118250000_challenges.sql`, `20261118260000_challenges_stage2.sql` e `20261118270000_challenges_stage3.sql`; la terza aggiunge `challenges.leaderboard`, `match_rules`, `supplied_team`, `emergency_threats`, le tabelle `challenge_emergencies`, `challenge_emergency_runs`, `challenge_emergency_plays`, le azioni `challenge_emergency_open|start|play` e `challenge_simulate` della Edge Function, e il motore `packages/game-engine/src/challenge-play.ts`): `challenges` (con `rules` in jsonb, normalizzato da `challenge_normalize_rules`: `rarities`, `factions`, `traits`, `min_variants`, `all_variants`, `variant_styles`, `banned`, `only`, `no_starters`), `challenge_match_terms`, `challenge_tiers`, `challenge_rewards`, `challenge_queue`, `challenge_notices` (i banner già mandati), `matches.challenge_id`, `match_lobbies.challenge_id`; RLS attiva e nessuna policy. Per i client `get_challenges` (sfide in corso e in arrivo, regole e premio in italiano, partite di oggi, vittorie, personaggi adatti e livello del giocatore; manda il banner delle sfide nuove), `create_challenge_lobby`, `get_lobby_challenge`, `mark_challenge_rewards_seen`; `leave_queue` lascia anche la coda della sfida. Per la Edge Function `challenge_bot_context`, `challenge_create_bot_match` e `challenge_queue_join`; le azioni `start`, `boss_start`, `triple_start`, `quadrant_start` e `queue` accettano `challenge_id`, e `join_lobby` crea la partita della sfida del codice. La stessa regola, pura, nel motore (`packages/game-engine/src/challenges.ts`, `checkChallengeTeam`) per la pagina della squadra; decide sempre il database. Valori in `balance.ts` (`challenges`) e `game_config` (`challenges.*`). Test: `packages/game-engine/src/challenges.test.ts`, `src/lib/last-play.test.ts`, `supabase/tests/challenges.test.sql`, `supabase/tests/challenges_stage2.test.sql`, `supabase/tests/challenges_stage3.test.sql`, `packages/game-engine/src/challenge-play.test.ts`. Pagina di prova solo in `next dev`: `/prova-sfide` (`?s=gioca`, `poche`, `squadra`, `editor`, `attesa`, `fornita`, e `menu` per il menu dell'Editor).
- **Terza tappa** (chiesta dall'utente il 18 novembre 2026, tutte le idee rimandate del piano, ognuna dall'Editor):
  - **Composizione della squadra** (passo *Vincoli*): un **budget di rarità** (i ranghi Delta 1 … Omega 5 sommati, al massimo N, da 1 a 50), **al massimo N copie** di ogni rarità scelta (0 = nessuna), e **almeno 2 o tutte e 3 le fazioni**. Il server la controlla con le altre regole (`challenge_composition_problem`: `challenge_over_budget`, `challenge_rarity_limit`, `challenge_too_few_factions`) e non salva una sfida che nessuna squadra può rispettare (`challenge_composition_impossible`; l'Editor mostra il budget della squadra più economica). Nella scelta della squadra una carta che renderebbe impossibile finire la squadra resta fuori con il motivo («al massimo 1 Beta in squadra»), e in alto c'è il budget usato («Budget 7/10»). Il bot con le stesse regole rispetta anche la composizione.
  - **Regole della partita**, solo **Classica** (passo *Modalità*): un **modificatore su ogni round** (Colpo mirato, Anello debole, Territorio ostile o Sottovalutati, al posto dell'estrazione; la regola di un luogo o di una Minaccia rara vince sul suo round), le **Minacce** (come sempre, solo Nuova Megara, le 3 di un luogo in ogni partita più 2 di Nuova Megara con le solite regole dei livelli, oppure solo alcuni livelli: un luogo e i livelli non vanno insieme, perché ogni luogo ha solo 3 Minacce), le **Minacce rare** ×5, ×20 o ×100. Le Minacce le estrae la Edge Function (`drawChallengeThreats`), anche online; il modificatore lo scrive il database sulla partita (`challenge_tag_match`, come la Storia). Le regole sono copiate sulla partita con le altre.
  - **Squadra della sfida** (passo *Modalità*, solo Classica contro i bot): 5 personaggi uguali per tutti, posseduti o no: conta solo la bravura. I vincoli sulla squadra non contano, il bot non usa quei personaggi, nessuna carta del giocatore è in gioco. Il giocatore ne vede le carte e parte (`SuppliedTeam`); la partita ha la squadra come definizioni, come il lato del bot (`challenge_create_supplied_match`), e la schermata la sceglie per definizione (`with_supplied_team`). È l'unica eccezione alla regola «niente carte in prestito», voluta dal piano.
  - **Classifica della sfida** (passo *Premi*, accesa di serie): chi vince più partite della sfida (finite normalmente), a parità chi ci è arrivato prima; in un'Emergenza la corsa migliore. Il trofeo sulla scheda della sfida apre `/classifica-sfida/?id=…` (`get_challenge_leaderboard`, i primi 50 e il proprio posto).
  - **Emergenza a tema** (modalità *Emergenza*): 8 Minacce (soglie e fallite dell'Emergenza del giorno) o 10 (della settimana), estratte una volta per tutta la sfida dal primo che la apre, uguali per tutti; si gioca da soli, **un tentativo per giocatore** finché dura la sfida, con la squadra dentro le regole (anche la composizione). Niente monete lungo la corsa né punti evento; il **premio della sfida** conta le Minacce superate nella corsa, pagato alla fine. In Gioca sta accanto all'Emergenza della settimana, sulla stessa riga; la pagina è `/emergenza/?sfida=<id>`, con le regole, il premio e la classifica della sfida.
  - **Simulatore** (passo *Anteprima*, Classica): partite simulate sul server contro ogni bot della sfida (`challenge_simulate`, solo amministratori, a pezzi per il limite di tempo della Edge Function), con una squadra a caso tra gli ammessi e con una forte, giocate come un giocatore medio; dice le vittorie in percentuale e una parola (Facile, Equilibrata, Dura, Molto dura). È una stima: i modificatori estratti di solito restano fuori.
- **Più avanti:** regole di partita nelle altre modalità, la squadra della sfida online, un'Emergenza a tema con più tentativi o con punti evento.

## 9. Collezione e album

- Album con tutte le carte del catalogo: possedute e mancanti (sagoma). I personaggi tenuti fuori dai pacchetti non ci sono finché non escono, se il giocatore non ne ha una copia (§7).
- Filtri per possesso (tutte, possedute, mancanti o solo le varianti trovate, §4.6), rarità, fazione e tratti (§4.7: nella stessa categoria basta uno dei tratti scelti, tra categorie servono tutti); ordinamento per numero, rarità, nome, copie, abilità (dalla più alta) o categoria di tratto (Origine, Natura, Gruppo), che raggruppa le carte sotto un titolo per ogni tratto.
- Gli stessi controlli di ordinamento e filtro (senza possesso e copie) sono in ogni scelta della squadra o del mazzo: Partita, Storia, Conquista, Grande Minaccia, Allarme Triplo, Emergenza. L'ordine scelto vale per tutte le modalità per la durata della visita.
- Dettaglio carta: abilità, potere, numero di copie, carte bloccate o protette, varianti trovate (miniature in cima alla pagina, §4.6) e quante restano da trovare, scheda del personaggio (vero nome, poteri e tratti, §4.7).
- Conversione dei doppioni; rottura delle varianti doppie in Schegge; cornice ed effetto di ogni personaggio (§4.8).
- Gestione delle formazioni salvate.

## 10. Architettura tecnica

### 10.1 Panoramica

- **Next.js** (App Router) in **export statico**, pubblicato su **GitHub Pages** tramite GitHub Actions, configurato come PWA (manifest, icone, schermo intero su iOS). Il sito è solo interfaccia: nessuna logica lato server in Next.js (vedi vincoli in `CLAUDE.md`).
- **Supabase:** Auth Google (flusso PKCE nel browser), Postgres + RLS, Realtime per lo stato delle partite, RPC `security definer` per la logica autoritativa, Edge Functions (Deno) per la logica più pesante (bot, simulazioni).
- **Motore di regole puro** in TypeScript (`game-engine`), senza dipendenze Node: riceve stato e azioni, restituisce il nuovo stato. Lo usano le Edge Functions per la risoluzione e i bot, e il client solo per le anteprime. È coperto da test unitari.

**Divisione della logica autoritativa:**
- Operazioni transazionali semplici (pacchetti, monete, trasferimenti, invio mosse, validazioni) → **funzioni Postgres** (`security definer`).
- Calcolo dei punteggi, risoluzione dei round e mosse dei bot → **Edge Functions** che usano `game-engine` e scrivono il risultato con una transazione Postgres. In alternativa, se più semplice, il calcolo del punteggio (somma di valori più poteri) può essere replicato in SQL, mantenendo `game-engine` come riferimento e verificando con test che i due diano lo stesso risultato.

### 10.2 Partite in tempo reale (schema consigliato)

- Lo stato della partita vive in DB (`matches`, `match_rounds`, `round_plays`).
- I client si iscrivono a un canale Realtime della partita per ricevere gli aggiornamenti.
- La scelta di un personaggio avviene con una RPC `submit_play(match_id, round, card_instance_id)`, che valida e salva la mossa senza rivelarla all'avversario.
- Ogni round ha una scadenza (`deadline_at`). La risoluzione (`resolve_round`) avviene quando entrambi hanno giocato, oppure quando un client la richiede dopo la scadenza: il server verifica il timestamp e completa le mosse mancanti.
- Le mosse dell'avversario non sono leggibili via RLS finché il round non è risolto.
- **Informazioni nascoste:** la squadra avversaria (`match_teams`) e le Minacce non ancora svelate non devono mai arrivare al client, nemmeno nei payload Realtime. Il client riceve solo i livelli delle Minacce, le Minacce già svelate e i personaggi avversari già giocati. Esporre questi dati tramite viste o RPC filtrate, mai leggendo direttamente le tabelle complete.

### 10.3 Modello dati (bozza)

| Tabella | Contenuto principale |
|---|---|
| `profiles` | id (= auth user), username, avatar, level, xp, stats, conquest_unlocked |
| `rarity_definitions` | code, name, rank, color, drop_weight (Delta, Gamma, Beta, Alfa, Omega; estendibile) |
| `card_definitions` | id, name, faction, rarity_code (→ rarity_definitions), stats (jsonb: codice abilità → valore 0-10, 12 abilità), power_code, power_params, art_url, flavor, real_name, powers_text |
| `trait_categories` / `traits` / `card_definition_traits` | categorie e valori dei tratti e tratti di ogni personaggio (§4.7) |
| `ability_definitions` | code, name, family, icon, sort_order (le 12 abilità, rinominabili) |
| `card_instances` | id, definition_id, owner_id, acquired_at, acquired_via (pack/conquest/starter/trade), is_starter, locked_until |
| `card_transfers` | id, instance_id, from_user, to_user, reason, match_id, created_at |
| `pack_openings` | id, user_id, pack_type (daily/standard/bonus/event/special), special_pack_id, is_daily, opened_at, card_instance_ids |
| `special_packs` | id, name, description, color, price, cards_per_pack, guaranteed_min_rarity_rank, variant_chance_percent, variants_only, variant_styles, prefer_new_variants, odds_mode (rarity/card), starts_at, ends_at, is_active, version (§7.1) |
| `special_pack_cards` / `special_pack_rarities` | carte e percentuali di un pacchetto speciale |
| `daily_claims` | user_id, day (data Europe/Rome), claimed |
| `coin_ledger` | id, user_id, amount (+/−), reason, ref_id, created_at |
| `threat_definitions` | id, name, level (1-6), required_abilities (array di codici, lunghezza = level), modifier_code, modifier_params, art_url, flavor |
| `formations` | id, user_id, name, card_instance_ids[5] |
| `matches` | id, mode (friendly/conquest/bot), bot_difficulty (easy/medium/hard/super_pro, solo bot), status, player_a, player_b, threat_ids[5] (nascosti ai client), threat_levels[5] (visibili), current_round, winner_id, created_at |
| `match_teams` | match_id, user_id, card_instance_ids[5] (istantanea della squadra) |
| `round_plays` | match_id, round, user_id, card_instance_id, score, auto_played |
| `match_rounds` | match_id, round, deadline_at, winner_id, resolved_at |
| `player_notifications` | id, user_id, kind, title, body, data, created_at, seen_at (§11.1) |
| `game_config` | chiave/valore dei parametri di bilanciamento |

Tutte le tabelle hanno RLS. Scritture solo tramite RPC: `claim_daily_pack`, `buy_pack`, `buy_special_pack`, `convert_duplicate`, `create_match`, `join_match`, `submit_play`, `resolve_round`, `claim_conquest_card`, `forfeit_match`.

## 11. Schermate principali

1. **Login** (Google).
2. **Home:** in alto O-MEGA, saldo monete, coppa delle Classifiche con la posizione migliore (§8.6) e avatar (al profilo); sotto, quando c'è, la partita in corso; una riga con gli Obiettivi (§8.3) e l'evento (§8.2); il pacchetto del giorno; i pulsanti Gioca e Classificata affiancati (§8.7); durante una Sfida a tema (§8.8) il pulsante Gioca porta l'etichetta «★ A tema» con il suo titolo. Collezione e Negozio sono solo nella barra in basso: dal 17 novembre 2026, su richiesta dell'utente, la Home non ripete le voci della barra (resta l'avatar), così pacchetto e pulsanti hanno più spazio.
3. **Apertura pacchetto** (animazione).
4. **Collezione / Album.**
5. **Formazioni:** scelta e salvataggio della squadra.
6. **Gioca:** scelta modalità → matchmaking / codice amico / bot. Dal 17 novembre 2026 (direzione «Gioca ancora», scelta dall'utente tra tre bozze) la schermata ha, dall'alto:
   - **Gioca ancora:** un pulsante grande che riapre la scelta della squadra dell'ultima partita avviata da questo dispositivo (stessa modalità, griglia e avversario: bot e livello, amichevole casuale o con codice, Classificata, Conquista). Prima della prima partita propone **Prima partita: Classica contro il bot Facile**. È solo una scorciatoia salvata sul dispositivo (`src/lib/last-play.ts`): la squadra e il server controllano tutto il resto. Ricorda anche la Sfida a tema (contro il bot, nella coda o con il codice amico) e un codice amico in cui si è entrati (rigiocato, è un nuovo codice dello stesso tipo, fatto da chi gioca). **Non cambia mai partita** (dal 20 novembre 2026, chiesto dall'utente; prima una Conquista non disponibile diventava un'amichevole Classica online e una sfida finita la modalità senza sfida): se la stessa partita ora non si può giocare, il pulsante resta quello, spento, e al posto della riga sotto il titolo dice perché («Sfida a tema finita», «Partite di oggi finite (3/3)», «Conquista: riapre a mezzanotte», «Conquista bloccata: 2/5 partite»; `playBlock`). Con una partita in corso il suo posto lo prende la riga «Hai una partita in corso».
   - **Oggi:** l'evento (§8.2), l'**Emergenza** (§5.10, «Da fare», oppure «Fatta» con le Minacce superate e il posto di oggi) e la **Storia** (il capitolo in corso con le sue missioni completate, «Capitolo 3 · 2/5», e nel riquadro nero le stelle prese su quelle di tutta la Storia, «★ 19/180»: si apre sulla prossima missione). Accanto all'evento la casella è stretta: le missioni completate si leggono solo quando ci stanno intere, altrimenti resta «Capitolo 3». Subito sotto, una riga sottile per l'**Emergenza della settimana** (§5.16) con i giorni che restano e lo stato (da fare, in corso, fatta con le Minacce superate e il posto).
   - **Modalità:** **Classica** (§5), **Grande Minaccia**, **Allarme Triplo** e **Quadrante**, in una griglia 2×2 con cosa serve (squadra da 5, mazzo da 9 o da 10) e quanto dura; «Nuovo» su una modalità appena arrivata, «★ A tema» su una modalità con una Sfida a tema in corso (§8.8), che aperta ha una terza scheda **★ A tema**. Aperta, una modalità mostra le regole, per il Quadrante la griglia, poi due schede: **Allenamento** (i 4 bot, sempre amichevoli) e **Amichevole** (avversario casuale, crea un codice, Entra con il codice di un amico), e la sua classifica in una riga in fondo.
   - **In palio:** la **Classificata** (§8.7, con Fama e lega, apre la sua pagina) e la **Conquista** (§6, dritta alla scelta della squadra; con il lucchetto e le partite che mancano finché non è sbloccata, «Torna dopo mezzanotte» al limite di carte perse).

   Il campo "Entra" con il codice di un amico c'è in ogni modalità: il codice sa già per quale modalità è. Le classifiche di Storia ed Emergenza sono nelle Classifiche (coppa in alto).

   **Sta in uno schermo senza scorrere** (17 novembre 2026, chiesto dall'utente), a 375×812 e a 375×667, anche con l'evento e con una partita in corso; una finestra più bassa scorre al suo interno. Pagina di prova solo in `next dev`: `/prova-gioca`.
7. **Partita:** sequenza dei livelli delle Minacce, Minaccia svelata, la propria squadra, i personaggi avversari già giocati, timer, scelta segreta, rivelazione, punteggio.

   **Il risultato come tavola a fumetti, con gli effetti delle abilità speciali** (Partita, Emergenza, Grande Minaccia, Tutorial; in Allarme Triplo un'etichetta per potere su ogni Minaccia). Scelta dell'utente del 14 novembre 2026: la direzione "spettacolare" delle bozze. Solo grafica, nessuna regola cambia.
   - **Grammatica:** le carte parlano con nuvolette, le Minacce con didascalie a strisce di pericolo (nel colore della fascia per le rare). Il giallo aiuta, il magenta su nero colpisce, il bianco tratteggiato informa. Il colore segue l'effetto sul risultato, non il segno: con il Rovescio un bonus è del colore di un danno.
   - **Famiglie dei poteri** (`src/lib/effect-families.ts`): Carica (punti alla propria carta; il gettone parte dalla Minaccia, dal round, dal rivale o dalla squadra), Colpo (Sabotatore: fulmine e −1 su ogni abilità rivale), Scudo (Schermato, Riflesso), Stop (Annullatore: la nuvoletta rivale viene timbrata), Spareggio (Implacabile: «=» che diventa «>»), Al prossimo (Riscossa, Slancio…: il gettone va in una casella del round dopo sul pannello della Minaccia e al round dopo entra per primo), Copia (Riverbero), Svela (Veggente, Spia, Nebbia).
   - **Famiglie delle regole:** conta diverso (segni sulle abilità: ×2, tetto del Gelo, abilità spente, −3), bandiere (nastri di fazione o rarità, Il conto lungo), silenzio (nuvolette sigillate), ribaltone (Rovescio, Specchio), al buio (abilità coperte fino alla scelta). Effetti di pagina: Rovescio e Negativo capovolgono la tavola, il Gelo la ghiaccia, il Silenzio la spegne, lo Specchio la attraversa con un riflesso.
   - **Ordine:** regola, conto delle abilità, bonus portati dal round prima, bandiere, Stop, colpi e scudi, cariche (prima le proprie), poteri spenti, Implacabile, verdetto, ciò che passa al round dopo, rivelazioni. Un cut-in a tutta pagina per il potere decisivo e per i distintivi, al massimo due per tavola.
   - **Rivelazioni e regole che ribaltano:** dopo il verdetto Veggente e Spia di chi guarda fissano tra la Minaccia e le carte una striscia con le prossime Minacce (`foreseen_threats`) o la carta spiata (`spied_cards`); col Rovescio i punteggi mostrano «▼ meno» nel colore della fascia; con lo Specchio un «⇄» passa da una carta all'altra. Nella Grande Minaccia, come nella Partita, il bonus di Riscossa e Slancio aspetta in una casella sul pannello del Boss ed entra per primo nel personaggio del turno dopo.
   - **Suoni** brevi sintetizzati, spenti all'inizio, interruttore in fondo alla tavola, scelta salvata sul dispositivo. Con il movimento ridotto niente gettoni, fulmini, cut-in né capovolgimenti: la tavola dice lo stesso con le sole nuvolette e i segni.
   - I segni sulle abilità si calcolano nel browser con le stesse regole del motore (`src/lib/ability-marks.ts`, un test controlla che diano sempre il punteggio base del motore).
   - **Scomposizione dei punti dal server** (migrazione `20261114100000_play_parts.sql`): nella partita classica il motore divide il bonus di ogni giocata in potere (con Catalizzatore e lo 0 di Sacrificio), bonus portato, Capobranco, Sacrificio ricevuto (`sacrifice`, dal 15 novembre 2026: `play_parts_valid` accetta le cinque parti di prima e le sei di adesso), regola della Minaccia e quanto ha reso il minimo a 0 (`ScoreParts`, la somma è sempre il bonus). L'Edge Function le invia con il round, `match_record_round_state` le controlla (`play_parts_valid`: cinque o sei interi che sommano al bonus, altrimenti rifiuta il round) e le salva in `round_plays.parts`; `match_state_payload` le rimanda nelle giocate già visibili (le proprie, e quelle avversarie solo a round risolto). La tavola usa queste parti; per le giocate salvate prima, senza parti, le ricava dal bonus come prima. Dalla migrazione `20261114110000_play_parts_modes.sql` lo stesso vale per la Grande Minaccia (`match_record_boss_turn_state`), l'Allarme Triplo (`match_record_triple_round_state`, una parte per confronto; `with_triple_play_parts` nel payload) e l'Emergenza (`emergency_record_play_state` con `p_parts`, colonna `emergency_plays.parts`, le parti in `run.plays` dello stato).
8. **Fine partita:** esito, monete, schermata di conquista (scelta della carta).
9. **Profilo:** quattro schede che stanno nello schermo senza scorrere (375×812 e 375×667): **Statistiche** (le caselle dei numeri, con Fama e Classificate), **Posizioni** (la tabella delle classifiche di §8.6 e l'Albo), **Conquiste** (le ultime 5 carte conquistate o perse, le altre nello Storico partite) e **Altro** (i link, a due colonne: Imprese §8.5, Classifiche, Storico, Collezione, Bestiario, Come si gioca, Il mondo, Patch notes, Privacy, Editor per gli admin, Esci). In alto titolo scelto, livello e avatar.
10. **Negozio:** pacchetti acquistabili con monete (standard e speciali, §7.1), probabilità visibili per ogni pacchetto. Sotto il titolo il **contatore dei pacchetti aperti** (chiesto dall'utente il 19 novembre 2026): conta ogni apertura del giocatore, di qualsiasi tipo (del giorno, comprati, speciali, premi di partite, obiettivi, imprese, eventi, codici, Emergenza, Classificata e Sfide a tema: tutto ciò che si apre come un pacchetto), cioè le sue righe di `pack_openings`, lette con il conteggio di PostgREST attraverso la RLS che gli mostra solo le proprie (`fetchOpenedPackCount` in `src/lib/packs.ts`, nessuna migrazione). Ha almeno quattro cifre a rullo (`PackCounter`): si apre sul numero mostrato l'ultima volta e, se è salito, le cifre girano in avanti fino al nuovo con un «+N» accanto; con il movimento ridotto il numero cambia senza girare. Il Negozio non lo aspetta e funziona anche senza.
11. **Tutorial:** spiega regole ed economia con un round di prova non valido ai fini del gioco. Parte una volta per dispositivo dopo l'introduzione al mondo, si può saltare e si rivede da Gioca e Profilo.

### 11.1 Avvisi nell'app (banner)

Quando il server decide una bella notizia, il giocatore la vede in un banner a fumetti in cima allo schermo, in qualsiasi schermata si trovi. Scelta dell'utente del 15 novembre 2026.

- **Quali notizie:** un **obiettivo giornaliero completato** ("Obiettivo completato!", il titolo dell'obiettivo, il premio, "Tocca per riscattarlo" → `/obiettivi`) un **traguardo di un evento raggiunto** ("Premio evento ottenuto!", evento e traguardo, il premio → `/evento`) un'**impresa scoperta** ("Impresa scoperta!" o "Hai scoperto N imprese!", il nome, il premio → `/imprese`, §8.5) il **primo posto della settimana** in una classifica ("Primo della settimana!", la scheda e il titolo → la scheda in `/classifiche`, §8.6), una **Sfida a tema nuova** ("Nuova Sfida a tema!", la prima volta che il giocatore la vede, → Gioca) e un **traguardo del premio di una sfida** ("Premio della sfida!" → Gioca, §8.8). Non hanno un banner le notizie che la schermata già mostra nello stesso momento: livello e carta sbloccata, missione della Storia, premi dell'Emergenza, carta conquistata, codice bonus (si vedono a fine partita, nel riepilogo o nel Negozio). Una carta persa in Conquista non è una bella notizia e resta nel profilo.
- **Come nasce:** una riga in `player_notifications` (giocatore, `kind`, titolo e testo in italiano, `data` con il premio: monete, pacchetti, Schegge e carte, `created_at`, `seen_at`), scritta da un trigger sulla tabella che registra la notizia (`daily_objectives` quando `completed_at` si riempie, `event_rewards` all'inserimento; per le imprese `check_achievements`), quindi nella stessa transazione e per ogni strada che ci arriva. La funzione interna `add_player_notification` cancella le notizie del giocatore più vecchie di `notifications.keep_days` (30 giorni). RLS: il giocatore legge solo le sue righe e non scrive nulla.
- **Come arriva:** l'inserimento manda sul topic Realtime broadcast `notify:<id giocatore>` un segnale senza contenuto (come i topic delle partite, §10.2); l'app allora legge le notizie non viste con `get_player_notifications` (al massimo 20, delle ultime `notifications.show_within_hours`, 24 ore). Le legge anche all'apertura, al ritorno in primo piano e quando il canale si riconnette, così non si perde nulla. Un banner mostrato si segna come visto con `mark_player_notifications_seen` (solo le proprie righe) e non torna né su questo né su un altro dispositivo.
- **Il banner** (`src/components/notification-banner.tsx`, nel layout): giallo con bordo nero e ombra piena, entra dall'alto sotto la safe area dell'iPhone e resta circa 4 secondi (`balance.ts` `notifications.showMs`), di più se il dito ci resta sopra. Un tocco apre la pagina della notizia, uno scorrimento verso l'alto lo chiude. Più notizie insieme fanno la fila, una alla volta in ordine di arrivo; oltre 5 in attesa (`notifications.maxQueued`) le più vecchie si scartano. Con il movimento ridotto compare e scompare in dissolvenza. È una regione `role="status"`, `aria-live="polite"`, e si apre anche da tastiera.
- **Quando aspetta:** mentre gioca la tavola del risultato di un round (Partita, Grande Minaccia, Emergenza, Allarme Triplo), l'allarme di una Minaccia rara, l'apertura di un pacchetto prima del riepilogo e lo splash d'apertura, e mentre l'app è in background (`src/lib/banner-hold.ts`). Se uno di questi parte mentre un banner è sullo schermo, il banner sparisce e torna intero dopo: niente copre il risultato e niente lo anticipa.

### 11.2 Tornare indietro

Regola chiesta dall'utente il 18 novembre 2026: «quando si torna indietro, si torna nella pagina precedente, non in pagine sbagliate».

- **Ogni modo di tornare indietro porta alla pagina da cui si è arrivati:** la freccia in alto (`BackLink`, e «← Profilo» di `PageHeader`), i pulsanti «Annulla» e «Torna indietro», il tasto indietro del browser e lo scorrimento dal bordo dell'iPhone. La freccia dice dove porta: il Bestiario aperto dal Profilo mostra «← Profilo», aperto dall'album «← Collezione».
- **Senza una pagina dell'app dietro** (un link condiviso, l'app appena aperta), la freccia porta alla pagina madre (Bestiario → Collezione, Storico → Profilo, scelta della squadra → Gioca, Storia o Classificata, pagine di gestione → Editor, Classifiche, Evento, Obiettivi e Imprese → Home), che **prende il posto** della pagina nella cronologia: da lì indietro non si rientra dove si era (niente giri A → B → A → B).
- **I pulsanti «Torna a…»** con una destinazione precisa («Torna alla home», «Torna alla Storia», «Torna a Gioca», «Torna agli obiettivi» dopo un pacchetto) tornano indietro nella cronologia se quella è la pagina precedente, altrimenti la aprono al posto della pagina attuale. «Gioca ancora» e «Rivincita» aprono la pagina sopra il risultato, ma se è proprio quella dietro ci tornano.
- **«Rivincita» e «Gioca ancora» a fine partita** (regola chiesta dall'utente il 20 novembre 2026: «quando clicchi rivincita dopo una partita, non ti deve cambiare modalità e cambiare evento ed impostazioni») riaprono **la scelta della squadra della stessa partita**: stessa modalità (Classica, Grande Minaccia, Allarme Triplo, Quadrante con la sua griglia), stesso avversario (il bot e il suo livello, l'avversario casuale, un nuovo codice amico, la Classificata, la Conquista), stessa Sfida a tema, con la squadra o il mazzo dell'ultima volta già scelti (come sempre, una sfida ricorda la sua). La partita dice modalità, griglia, bot, Classificata, Conquista e sfida; il dispositivo dice se un'amichevole veniva dalla coda o da un codice amico (`rematchOf` in `src/lib/last-play.ts`, coperta da test; senza memoria del dispositivo, la coda). Contro il bot si chiama «Rivincita», negli altri casi «Gioca ancora». Fino al 20 novembre 2026 contro il bot di una Sfida a tema la rivincita apriva la stessa modalità **senza** la sfida (regole, squadra della sfida, punti evento e la squadra ricordata cambiavano) e online «Gioca ancora» portava a Gioca. **Se la stessa partita non si può più giocare** non si passa mai a un'altra: la scelta della squadra, al posto delle carte, dice perché con «Torna a Gioca» («Questa Sfida a tema non è più aperta.», «Hai giocato tutte le partite di oggi di questa sfida (3/3): torna dopo mezzanotte.», «Oggi hai perso 10 carte in Conquista: torna dopo mezzanotte.», «La Conquista si sblocca dopo 5 partite (2/5) o al livello 3.»). In Conquista la squadra torna, ma le varianti e le copie in palio al posto di quelle protette si scelgono ogni volta, come prima: sono carte che si possono perdere. Dopo l'Emergenza, che ha un solo tentativo, «Gioca ancora» porta a Gioca.
- **Passaggi che non si rivedono:** la pagina d'attesa della coda (aprirla rientra in coda) non si raggiunge mai con indietro o avanti; una partita che parte prende il posto della scelta della squadra (contro il bot, nella Storia, con il codice di un amico) o della pagina d'attesa, e la scelta della squadra rimasta dietro l'attesa da quel momento si salta; un pacchetto già aperto fino al riepilogo non ricomincia. Indietro e avanti saltano questi passaggi nella stessa direzione; avanti senza nulla dopo resta dov'era; indietro senza nulla prima apre la pagina madre al loro posto. L'attesa di un codice amico si può riaprire: mostra solo il codice.
- **Come funziona** (`src/lib/nav-history.ts`, `src/lib/nav-stack.ts`, `src/components/return-link.tsx`): ogni voce della cronologia scritta dall'app porta nel suo stato la sua posizione (`__omegaNav`: la visita e l'indice) accanto a quello del router; `pushState` e `replaceState` sono avvolti, così ogni link, `router.push` o `router.replace` viene registrato. Le pagine di ogni visita stanno in `sessionStorage` (`o-mega.nav`) e restano dopo un ricaricamento; una scheda aperta da zero o un ritorno dal login Google iniziano una visita nuova. Il `popstate` di indietro e avanti è esaminato prima del router: una voce da saltare non viene mai mostrata (anche quando indietro o avanti ricaricano da zero la pagina d'attesa, questa non entra in coda; ricaricare l'attesa stessa continua ad aspettare). Posizione nella pagina e scheda aperta tornano come prima (`src/lib/place-memory.ts`). Un «Torna a…» può anche dire alla pagina dove riaprirsi (`state` di `ReturnLink`, scritto con `rememberPlaceState` sulla pagina a cui si torna, dietro nella cronologia o aperta al posto di quella attuale): «Torna alla Storia» dopo una missione la riapre sulla missione appena giocata (§5.11). Pagina di prova solo in `next dev`: `/prova-indietro`.

### 11.3 Schermata d'apertura

Chiesta dall'utente il 18 novembre 2026 («qualcosa di movimentato… con una frase di sottotitolo»); il 19 novembre ha scelto la bozza A, «Timbro», tra tre bozze animate, con le righe del mondo come sottotitolo, una diversa a ogni apertura.

- **Cosa si vede** (`src/components/app-splash.tsx`, animazioni `splash-*` in `globals.css`): su fondo a raggi scuri e con la città di notte in basso, l'Ω del pacchetto (lo stesso dell'icona) compare ed esplode in un lampo; le lettere di O-MEGA arrivano una dopo l'altra come timbri e all'ultima lo schermo trema e spunta «SBAM!»; dietro il titolo resta una stella scura bordata di magenta, che gira piano finché i dati non sono pronti. Sotto il titolo la riga del mondo, in fondo il sismografo e la barra di caricamento. Il titolo è completo a circa 0,35 s dalla prima immagine, la riga a 0,4 s.
- **Tempi invariati:** lo splash è nell'HTML statico, quindi l'animazione parte con la prima immagine, prima di React. Se ne va appena la Home è pronta, dopo almeno 500 ms dall'apertura della pagina e al più dopo 5 s, con una dissolvenza di 400 ms: con tutto in cache la dissolvenza comincia quando il titolo è già completo, e l'animazione non allunga mai l'attesa. Come prima trattiene i banner (§11.1), precarica l'introduzione al mondo e non compare al ritorno dal login Google (`/auth/`).
- **Il sottotitolo:** a ogni apertura una riga diversa tra quelle del mondo (`WORLD_SPLASH_LINES` in `src/config/world.ts`, otto righe), mai la stessa due volte di fila. La sceglie, prima della prima immagine, uno script nel `<head>` del layout (`SPLASH_LINE_SCRIPT` in `src/lib/splash-line.ts`, stessa regola di `nextSplashLine`, coperta da test): tutte le righe sono nell'HTML e lo script aggiunge la regola CSS che mostra quella scelta, così React non vede differenze e l'animazione non riparte. L'indice dell'ultima riga resta sul dispositivo (`localStorage`, `o-mega.splash-line`); senza memoria del dispositivo esce una riga a caso. Fino al 18 novembre le righe giravano in fondo ogni 1,3 secondi.
- **Movimento ridotto:** titolo, stella, «SBAM!» e riga sono fermi, senza Ω né lampo.

### 11.4 Rilievo e sfondo

Chiesto dall'utente il 19 novembre 2026 («più rilievo/3D nei pulsanti, nelle carte… e forse uno sfondo leggermente diverso»). Tra tre stili (A «Fumetto in rilievo», B «Arcade», C «Carta stampata») e tre sfondi, provati sulle schermate vere, ha scelto **B «Arcade» con lo sfondo «Notte di Megara»**. Solo grafica: nessuna schermata cambia misura.

- **Sfondo:** blu notte in alto (`--night`) che sfuma nel nero di sempre verso i tre quarti dello schermo, sotto un retino di punti appena visibile. Un solo sfondo fermo sul `body`, che il browser stende su tutta la pagina.
- **Pulsanti (`.btn`) come tasti:** smussatura, una fascia di luce sulla parte alta e una base scura sotto. Il pulsante giallo principale è lucido su una base oro, quello con il contorno giallo su una base oliva, quello grigio su una base grafite, quello magenta su una base scura. Un interruttore acceso (un filtro, un chip) è illuminato; un pulsante disabilitato non ha base.
- **Riquadri da toccare** (modalità, Gioca e Classificata in Home, la riga Oggi, l'evento, gli obiettivi da riscuotere, la partita in corso): una fascia di luce sul terzo alto e una smussatura, dentro la forma, così anche gli angoli tagliati la tengono. Le forme tagliate (`cut-*`) che sono link o pulsanti lo sono da sole; gli altri riquadri hanno la classe `.tile`. I pannelli grandi colorati da leggere (pacchetto del giorno, capitolo della Storia, esito) hanno una luce morbida dall'alto.
- **Superfici** (`bg-panel`, `bg-panel-raised`, `.row-link`): illuminate dall'alto; quelle che sono link o pulsanti stanno su una base scura. Nelle schede quella scelta è lucida, le altre sono tasti su una base.
- **Carte** (`.card-frame` in `CardView` e nelle tessere dell'album): cornice smussata su una base scura; la carta grande, sola sullo schermo, è sollevata da un'ombra morbida. La faccia della carta resta piatta.
- **Barra in basso:** una console scura; la voce attiva è un tasto giallo lucido.
- **Pressione:** il tasto scende sulla sua base, 3 px (il giallo principale 5 px), in 90 ms. Si muove solo `transform`; la base cambia di colpo, senza animazione. Con il movimento ridotto non si sposta niente: cambiano solo base e luce.
- **Limiti per iPhone e batteria:** solo ombre e sfumature ferme, niente sfocature animate, `backdrop-filter` o livelli con filtri. Luce e smussatura sono disegnate dentro l'elemento e la base è un'ombra che non occupa spazio, quindi ogni schermata sta nello schermo come prima. Le ombre morbide sono solo sugli elementi grandi o pochi (pulsanti, carta grande); nelle liste (album, mano di carte) solo basi nette. I colori del testo non cambiano: sul blu più chiaro dello sfondo il testo crema ha un contrasto di circa 14:1.
- **Come è fatto** (`globals.css`): i valori (`--bevel`, `--gloss`, `--lit`, `--key-base`…) stanno in `:root`. La smussatura va nello spazio delle ombre interne di Tailwind (`--tw-inset-shadow`), così un elemento che ha già la sua ombra colorata (`shadow-[...]`) la conserva; la base di un pulsante sta in `--base` e, premuto, diventa `--base-down`. Superfici e riquadri usano selettori a specificità zero (`:where`), così qualsiasi altra classe che disegna uno sfondo o un'ombra vince. Le tavole dei risultati a fumetto non cambiano.

### 11.5 Cambio pagina e barra in basso

Chiesto dall'utente il 19 novembre 2026: meno attesa passando da una pagina all'altra, e la barra in basso che a volte accendeva la pagina sbagliata.

- **La voce accesa:** toccata, una voce della barra si accende subito, senza aspettare la pagina nuova, ma solo finché la pagina non cambia. Prima restava legata alla pagina da cui era partito il tocco: tornando su quella pagina più tardi (indietro, scorrimento dal bordo) si riaccendeva la voce toccata allora. La Classificata accende Gioca, lo Storico partite accende Profilo.
- **Dati già visti, subito:** le pagine mostrano per prima cosa l'ultima risposta del server di questa visita (`src/lib/last-seen.ts`) e la sostituiscono con quella nuova appena arriva: oltre a Collezione, Negozio, Storia e Sfide a tema, ora anche la partita in corso, la Conquista, la Fama, le Emergenze del giorno e della settimana, le Conquiste del Profilo e lo Storico partite. Solo per mostrarli: ogni azione la controlla il server. Quando una partita parte, va avanti o finisce (ogni stato di partita ricevuto, l'abbandono, la scelta della carta conquistata) le schermate dimenticano partita in corso, Conquista, Fama, Conquiste e Storico, e aspettano il server come prima; lo stesso per le classifiche dell'Emergenza a ogni sua giocata e per la Fama al ritiro di un premio. Così Gioca non tiene le modalità bloccate in attesa della risposta quando sa già che non c'è una partita in corso.
- **La Home prepara le altre pagine:** quando è pronta, dopo 800 ms carica quello che le altre schede non hanno ancora visto (catalogo, collezione, Negozio con i pacchetti speciali, monete, e le caselle di Gioca), così anche la prima visita di ogni scheda si apre piena.
- **La Collezione a rate:** l'album ha oltre 200 tessere e disegnarle tutte insieme tratteneva la pagina (circa 0,3 s su un computer). Ora la pagina si apre con le prime 24 e le altre arrivano subito dopo, in una Transition di React che un tocco può interrompere. Tornando da una carta l'album le disegna tutte subito, perché il punto in cui era può essere in basso.

### 11.6 Testo non selezionabile

Chiesto dall'utente il 19 novembre 2026: nell'app le parole non si devono poter selezionare, tranne nell'Editor degli admin.

- **Fuori dall'Editor** (`globals.css`, nel livello base): `user-select: none` e `-webkit-touch-callout: none` sul `body`. Una pressione lunga o un doppio tocco non evidenziano il testo e non aprono il menu di Safari per copiarlo, né quello di un link o di un'immagine.
- **Restano selezionabili:** i campi in cui si scrive (`input`, `textarea`, elementi `contenteditable`) e il testo fatto per essere copiato, con una sua classe: il codice da dare a un amico (`select-all`, che lo seleziona tutto con un tocco).
- **Nell'Editor** (`/editor` e le pagine `/gestione-*`; in `next dev` anche `/prova-editor-*`) la selezione torna come prima: `TextSelection`, montato nel layout, mette la classe `text-selectable` su `<html>` secondo la pagina (`allowsTextSelection` in `src/lib/text-selection.ts`, coperta da test).

### 11.7 Avvisi di fine (tutto schermo)

Chiesti dall'utente il 19 novembre 2026: «quando finisce un evento o qualsiasi modalità di gioco a tempo, voglio che arrivi una notifica a tutto schermo (tipo quella delle ricompense dell'emergenza) ai giocatori la prima volta che riaprono il gioco, con la possibilità di vedere i punteggi e le classifiche se c'erano». Valgono i default proposti dalla sessione che li ha costruiti (§13.1).

- **Cosa è coperto:** gli **eventi a tempo** (§8.2), le **Sfide a tema** (§8.8, anche l'Emergenza a tema), l'**Emergenza della settimana** (§5.16) e i **Mandati** della Classificata (§8.7). Restano fuori l'Emergenza di ogni giorno (finisce ogni giorno e ha già il popup dei premi) e le Classifiche settimanali di §8.6 (la settimana nuova parte da sola e il primo ha già il banner «Primo della settimana!»): un avviso a tutto schermo ogni giorno o ogni lunedì sarebbe rumore.
- **Chi lo riceve:** solo chi ha partecipato: almeno un punto evento; almeno una partita della sfida finita normalmente, o la sua Emergenza a tema iniziata; il tentativo della settimana iniziato; almeno una classificata nel Mandato. Un evento o una sfida disattivati dall'amministratore non danno avvisi.
- **Quando:** la prima volta che il giocatore apre l'app dopo la fine (o la riporta in primo piano; un'app aperta ricontrolla ogni 10 minuti), entro **7 giorni** dalla fine (`end_notices.within_days`); più tardi niente avviso. **Una volta sola** per giocatore e per cosa finita, su qualsiasi dispositivo: appena l'avviso è sullo schermo il server lo segna come visto.
- **Cosa mostra** (`src/components/end-notice-popup.tsx`, nel layout): lo stesso riquadro a raggi gialli del popup dei premi dell'Emergenza. In alto cosa è finito («Evento concluso», «Sfida a tema conclusa» con una striscia del colore della sfida, «Emergenza della settimana conclusa», «Classificata · Mandato concluso»), il nome e i giorni («dal 12 al 19 novembre»); in grande il posto («4° posto!»); sotto il risultato in una riga (punti evento e traguardi; vittorie su partite, o Minacce superate e punti; lega, Fama e classificate) con il numero di giocatori. Poi le note: il premio della settimana o del Mandato, che si riscuote come prima (il popup dei premi dell'Emergenza; *Ritira* nella Classificata, dove porta il pulsante *Ritira il premio →*) e il titolo del Mandato. *Classifica* mostra nello stesso riquadro la **classifica finale**: i primi 10 (`end_notices.board_size`) con avatar e numeri, la riga del giocatore in magenta e, se è più in basso, la sua posizione sotto; mai squadre o carte. *OK* chiude; con altri avvisi in fila il pulsante dice *Avanti* e sotto c'è «Ancora 2 avvisi». Sta in uno schermo da 375×667, anche la classifica con la riga del giocatore sotto.
- **Chi non ha un posto:** un evento mostra punti e traguardi («340 punti»), ma la classifica finale solo a chi la può vedere secondo la regola dell'evento (`events.leaderboard_visibility`, di serie chi l'ha completato); agli altri «La classifica finale era per chi completava l'evento.». Un tentativo dell'Emergenza (della settimana o a tema) non finito mostra le Minacce superate («3/10») e «Il tentativo non è finito in tempo: non è entrato in classifica.», con la classifica degli altri. Una sfida senza classifica mostra solo vittorie e partite.
- **Fila e attese:** più avvisi insieme fanno la fila, dal più vecchio (per data di fine). Come il popup dei premi aspetta lo splash, le tavole dei risultati, l'allarme di una Minaccia rara e l'apertura di un pacchetto (`src/lib/banner-hold.ts`), non si apre in partita, in attesa, in Emergenza, in un pacchetto o nell'Editor, e finché è aperto tiene fermi i banner (§11.1). Con il popup dei premi dell'Emergenza non si sovrappone mai: quello che si apre per primo tiene lo schermo e l'altro aspetta che si chiuda (a parità di tempo vince il popup dei premi).
- **Il Mandato:** il banner «Mandato concluso!» (§8.7) non c'è più. Lo sostituisce questo avviso, che dice lo stesso con l'Albo finale e resta per 7 giorni invece che per 24 ore.
- **Tecnica** (migrazione `20261119100000_end_notices.sql`): alla fine non si scrive niente. `get_end_notices()` (RPC per i client, `security definer`) calcola per il solo chiamante cosa è finito nella finestra e a cosa ha partecipato, lasciando fuori quello che ha già visto (`end_notices_seen`: una riga per giocatore, tipo e riferimento, cioè l'id dell'evento o della sfida, il lunedì della settimana, il mese del Mandato), e per ognuno costruisce risultato e classifica con le funzioni delle classifiche (`event_leaderboard_payload` con `event_leaderboard_allowed`, `challenge_ranking`, `emergency_week_ranking`, `ranked_season_results`); prima chiude le settimane e i Mandati finiti (`emergency_week_close`, `ranked_close_seasons`), come fanno l'Emergenza e l'Albo. `mark_end_notice_seen(tipo, riferimento)` scrive la riga del chiamante. La tabella ha RLS attiva e nessuna policy. `ranked_close_seasons` è la stessa di prima senza il banner. Valori in `balance.ts` (`endNotices`) e `game_config` (`end_notices.*`). Logica pura e testi in `src/lib/end-notices.ts` (test `src/lib/end-notices.test.ts`); test del database `supabase/tests/end_notices.test.sql`. Pagina di prova solo in `next dev`: `/prova-fine` (`?s=evento`, `evento-bloccato`, `sfida`, `sfida-emergenza`, `sfida-senza`, `settimana`, `settimana-non-finita`, `mandato`; senza `s` quattro avvisi in fila; `&v=classifica` apre la classifica).

## 12. Milestone di sviluppo

**Fase 1 — Base giocabile**
- **M0** Setup: repository Git, Next.js in export statico, Tailwind, client Supabase, PWA, workflow GitHub Actions per il deploy su GitHub Pages, struttura delle cartelle, `.env.example`. Fine milestone: una pagina "Benvenuto in O-MEGA" visibile online su GitHub Pages e in locale.
- **M1** Auth Google e profilo; creazione del profilo e assegnazione dello starter set al primo accesso.
- **M2** Catalogo: tabelle carte e Minacce, seed segnaposto (60 personaggi, 60 Minacce).
- **M3** Pacchetto giornaliero e acquisto pacchetti: RPC con RNG server-side, animazione di apertura.
- **M4** Collezione, album, dettaglio carta, conversione doppioni.
- **M5** Monete e ledger; negozio base.

**Fase 2 — Minigioco e multiplayer**
- **M6** Motore di regole (`game-engine`) con test completi; partite **contro bot** lato server, difficoltà Facile, Medio e Difficile. Super Pro come estensione appena il resto è stabile.
- **M7** Partite PvP in tempo reale, modalità Amichevole: codice amico e matchmaking casuale.
- **M8** Modalità Conquista con tutte le protezioni di §6.4.
- **M9** Statistiche, storico, rifinitura di UX e animazioni.

**Fase 3 — Espansione:** amici, classifiche, missioni giornaliere, stagioni, tornei, scambi, eventi.

**Fase 4 — Evoluzione commerciale:** solo dopo verifica legale; priorità agli elementi cosmetici.

## 13. Decisioni

### 13.1 Decise

| Decisione | Scelta |
|---|---|
| Minacce | Solo i livelli noti all'inizio; una Minaccia svelata per round; livello = numero di abilità in gioco (1-6) |
| Squadre avversarie | Segrete; un personaggio si vede solo quando viene giocato |
| Copie dello stesso personaggio in squadra | Vietate |
| Conquista | Limitata alle carte schierate |
| Timer di scelta | 30 secondi |
| Nome del gioco | **O-MEGA** |
| Rarità | Delta → Gamma → Beta → Alfa → Omega (lettere greche, estendibili con le espansioni) |
| Abilità | 12 in 4 famiglie: Corpo (Forza, Velocità, Resistenza), Mente (Intelletto, Volontà, Percezione), Potere (Energia, Magia, Psiche), Mestiere (Combattimento, Tecnologia, Furtività) |
| Bot | Difficoltà selezionabile: Facile, Medio, Difficile, Super Pro |
| Monete dalle partite (sostituisce §8) | Solo la Conquista paga: chi perde +10 monete, chi vince prende la carta (e +50 solo se nessuna carta è conquistabile); pareggio +10 a entrambi. Bot e amichevoli non pagano monete. Chi abbandona non guadagna nulla. Emergenza ha i suoi premi (§5.10). Dal 12 novembre 2026 questi sono i valori iniziali della tabella *Ricompense partite* (§8.4), che gli amministratori possono cambiare. |
| Premi di livello | Raggiungere il livello L paga una sola volta 30 + 10 × L monete (livello 2: 50, livello 3: 60), in qualsiasi modalità. Chi supera più livelli insieme li riceve tutti. |
| Codice amico | Solo amichevole: nessuno scambio di carte, nessuna moneta. La Conquista si gioca solo con avversario casuale. |
| Squadra in Conquista | Almeno 3 carte conquistabili (non starter). Se un personaggio è posseduto sia come starter sia come doppione, il giocatore sceglie quale copia schierare (di default la starter, protetta). |
| Sblocco Conquista | 5 partite completate o livello 3; le partite abbandonate non contano. |
| Personaggi sbloccabili | Alcune carte hanno un livello di sblocco: non escono da pacchetti e starter set, ogni giocatore ne riceve una copia a quel livello, legata all'account (mai conquistabile né convertibile). Elenco in `docs/WORLD.md`. |
| Minacce oltre Nuova Megara | Regola fissa per luogo, non nuovi modificatori sorteggiati; i modificatori sorteggiati restano alle Minacce di Nuova Megara; l'Emergenza non estrae le Minacce dei luoghi (§5.4, §5.10). |
| Grande Minaccia | Modalità con un Boss a 5 fronti e la tabella dei punti visibile (§5.12): prima contro i bot, poi amichevole tra giocatori; niente monete, niente Conquista finché non ci sono dati reali. Approvata il 9 novembre 2026 con tutti i valori di default; lo stesso giorno l'utente ha chiesto le carte fisse sui fronti, che pagano sempre a chi è da solo. |
| Allarme Triplo | Modalità con 3 Minacce fisse estratte a caso (di qualsiasi livello) e un mazzo di 9 carte, 3 pescate a caso per round (§5.13): bot e amichevole tra giocatori, niente monete né Conquista. Approvata il 10 novembre 2026 con i valori di default, tranne le Minacce completamente a caso; nessuna correzione contro il caso della pesca finché non ci sono dati reali. |
| Classificata | Partita classificata in Classica, Grande Minaccia, Allarme Triplo e Quadrante; una Fama per tutte le modalità (+25/−20, ±1 ogni 20 di differenza), sei leghe (Recluta, Vigilante, Veterano, Asso, Leggenda, O-MEGA), Mandato mensile con premi per lega e titoli, Albo dei Reggenti come classifica totale; dopo 20-30 secondi un avversario giocato dal server che non si distingue da una persona, con una riga nelle regole che lo dice senza dire quale (§8.7). Approvata il 17 novembre 2026 sulla proposta consigliata. |
| Emergenza della settimana | Chiesta il 18 novembre 2026 senza dettagli, con i default proposti (§5.16): 10 Minacce di Nuova Megara uguali per tutti da lunedì a domenica (`Europe/Rome`), somma dei livelli 36-44, soglie 2 punti sopra quelle di ogni giorno (9, 15, 20, 25, 30, 34: la simulazione ha mostrato che la somma dei livelli da sola non rende la sfida più dura), fine alla 3ª fallita, squadra di 10, un tentativo a settimana riprendibile fino a domenica; 20/30/50 monete a 4/7/10 Minacce; classifica con premi ai primi 10 a fine settimana (2 pacchetti e 100 monete, 1 pacchetto e 50, 1 pacchetto, 50 monete) e titolo «Eroe della settimana»; punti evento come l'Emergenza; obiettivi e imprese solo per quella di ogni giorno. |
| Sfide a tema | Modalità esistenti con vincoli sulla squadra, create dagli admin dall'Editor (§8.8): un oggetto proprio, collegabile a un evento di cui dà i punti con una riga sua; tutte le modalità a partita, contro i bot (il bot con le stesse regole di serie) e in amichevole online con una coda per sfida e i codici amico; vincoli di rarità, fazione, tratti, varianti e loro stili, esclusi o solo un elenco, niente starter, livello minimo; una sfida per modalità alla volta, partite al giorno facoltative, premio a traguardi di vittorie, una riga sua in Ricompense partite; niente Conquista, Classificata né carte in prestito. Approvate il 18 novembre 2026 sul piano proposto, con tutti i default consigliati; lo stesso giorno l'utente ha chiesto anche la seconda tappa prima di pubblicare. |
| Schegge, cornici ed effetti | Chieste il 19 novembre 2026 (§4.8): le varianti doppie si rompono in Schegge (Delta 1, Gamma 2, Beta 3, Alfa 5, Omega 7, modificabili dall'Editor); 1 Scheggia un pacchetto standard senza limiti al giorno o una cornice o un effetto a caso, 2 una cornice a caso o un effetto a caso a scelta, 3 una variante non posseduta; 15 cornici (tra cui le Gradate) e 10 effetti, tutti quelli dei mock; si applicano dalla Collezione con anteprima, si consumano e si possono nascondere. Valgono per personaggio e non passano in Conquista; si vedono nella Collezione, nella scelta della squadra, nell'apertura dei pacchetti e in partita, anche quelli dell'avversario già scoperti (§4.8). |
| Schegge come premio | Chieste il 19 novembre 2026 («negli eventi o nelle sfide ecc, posso impostare dall'editor di vincere delle schegge?»), con i default della sessione che le ha aggiunte (§4.8): un campo Schegge (0–100) in ogni premio dell'Editor, cioè codici bonus, traguardi di eventi e Sfide a tema, obiettivi del giorno, imprese e posti premiati delle classifiche dell'Emergenza di ogni giorno e della settimana (di serie nessuna); non nelle ricompense di ogni partita né nelle monete delle missioni della Storia. |
| Avvisi di fine | Chiesti il 19 novembre 2026, con i default proposti (§11.7): avviso a tutto schermo per eventi, Sfide a tema, Emergenza della settimana e Mandati della Classificata (non per l'Emergenza di ogni giorno né per le Classifiche settimanali); solo a chi ha partecipato, una volta, entro 7 giorni dalla fine; posto, risultato e classifica finale (primi 10 e la propria posizione) quando c'è e il giocatore la può vedere; il banner «Mandato concluso!» lascia il posto all'avviso. |
| Minacce rare | 29 Minacce in sei fasce di rarità (§5.15), ognuna con la sua probabilità per partita, in partita classica, Emergenza e Allarme Triplo; fasce, testi, regole e rarità modificabili solo dagli admin; nessuna moneta, solo il Bestiario. La Fine del Mondo senza regola; poteri attivi anche sotto le regole che ribaltano il round; nessun tetto a Sabotatore. Approvate il 12 novembre 2026. |

### 13.2 Aperte (usare il default)

| # | Decisione | Default da usare |
|---|---|---|
| 1 | Nome dell'universo (mondo/città) | Deciso: Nuova Megara (`docs/WORLD.md`) |
| 2 | Composizione dei livelli delle Minacce in una partita | Regola di §5.4 |
| 3 | Valori di economia e limiti | Tabelle di §6.4 e §8 (provvisorie) |
| 4 | Effetti delle fazioni | Nessuno nell'MVP |
| 5 | Ricompense delle partite contro bot | Metà delle ricompense PvP, con tetto giornaliero separato |
