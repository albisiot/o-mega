# STORY — La trama di O-MEGA

*Bozza v0.3. La trama madre da cui nascono capitoli, missioni, albi e testi delle carte. Il mondo è in `docs/WORLD.md`, le regole in `docs/SPEC.md`: la storia le spiega e le usa, non le cambia.*

*v0.2: il segreto è diventato concreto. L'Ora Zero è un'esplosione ferma a metà sotto la città, tenuta da un uomo; prima era una frase scritta dal tempio, troppo astratta per chi gioca. Aion e i "due futuri" sono usciti dalla Stagione 1, e i testi già pubblicati dei Capitoli 1-4 sono stati ripassati di conseguenza (migrazione `20261111230000_grounded_story_texts.sql`).*

*v0.3: il file è diviso per stagioni. La Stagione 1 è tutta in §5 (le schede dei capitoli, che le migrazioni citano come §6, ora sono in §5.1); la Stagione 2, scritta ma ancora da costruire nel database, è in §6. Il testo della Stagione 1 non è cambiato.*

*v0.4: la Stagione 3, La montagna, è scritta in §7, ancora da costruire nel database; le regole di scrittura e le decisioni aperte generali sono passate a §8 e §9. Niente di quello che è pubblicato nelle Stagioni 1 e 2 è cambiato.*

---

## 1. Come si usa questo file

- Ogni capitolo della modalità Storia (SPEC §5.11) è anche un albo da leggere (WORLD §7): stessa trama, due formati.
- Si scrive dall'alto verso il basso: il segreto (§2), chi vuole cosa (§3), il cast (§4), poi una stagione dopo l'altra (§5, §6, §7), ognuna con il suo arco, le schede dei capitoli e la mappa delle rivelazioni. Un testo di missione che contraddice un livello più alto va corretto, non affiancato.
- Il giocatore scopre le cose nell'ordine della mappa delle rivelazioni della stagione (§5.2, §6.6, §7.6). Un testo non anticipa niente che la mappa non abbia già concesso.
- Prima di scrivere, rileggere le regole di §8: una sola cosa strana per capitolo, la posta in gioco sempre detta, una minaccia grande per stagione.
- Una stagione nuova si apre dai ganci lasciati dalla precedente (§5.3 per la Stagione 1, §6.8 per la Stagione 2, §7.8 per la Stagione 3) e non cambia niente di quello che è già pubblicato.
- Il compendio *THE FRACTURE* è un altro universo (Terra Zero, ORPHEUS, la Frattura del 1999): da lì si prendono nomi, idee e modelli di scheda, mai fatti. Il canone è Nuova Megara.

## 2. Il segreto

*Solo per chi scrive. Il giocatore ne vede il centro a metà stagione (Capitolo 4) e il resto nel Capitolo 5.*

**L'Ora Zero è un'esplosione che non ha ancora finito di succedere.**

Il tempio oracolare sotto Nuova Megara è costruito sopra una spaccatura nella roccia da cui sale l'energia del vulcano, come a Delfi, dove la Pizia sedeva su una fenditura. È la forza che scienziati, maghi e psichici chiamano in tre modi diversi (WORLD §2). I Greci chiusero la spaccatura con un sigillo: un anello di ventiquattro pietre, ognuna incisa con una lettera. È l'Alfabeto.

La Compagnia Lete costruì la centrale accanto al tempio per prendersi quell'energia. La notte dell'Ora Zero la sua trivella sfondò il pavimento del tempio: l'energia uscì tutta insieme e la centrale esplose. Il sigillo, mezzo rotto, fermò l'esplosione a metà, e le lettere saltate via finirono sparse sotto la città.

L'esplosione è ancora lì, nella camera del tempio: una palla di luce con i detriti sospesi a mezz'aria, che avanza pianissimo. Tutto quello che il giocatore conosce ne è una conseguenza:

- **Il Rintocco:** a ogni mezzanotte l'esplosione avanza di un battito, e il tempio suona.
- **Gli Echi:** a ogni battito esce un po' di energia, che si fissa sulle lastre con l'impronta delle persone che l'Ora Zero ha toccato. Per questo arrivano a mezzanotte, e per questo una persona ne lascia tanti.
- **I Segni:** chi era vicino quella notte, o lo è stato dopo, ne è stato colpito. L'energia dà e prende: da lì vengono il dono e il prezzo, gli 0 e gli 1 delle carte.
- **Le scosse:** le pietre del sigillo sono legate tra loro. Quando una lettera viene smossa, la città trema dove si trova la successiva, in ordine d'alfabeto. Ogni lettera tolta dal suo posto allenta il sigillo, e le scosse si fanno più forti. Il sismografo del Comune misura la forza, non il motivo.
- **Holdout** era l'operaio del turno di notte. Era al centro quando è successo e ci è rimasto: tiene con le mani la pietra dell'Omega, la chiave di volta del sigillo. L'energia che lo attraversa non lo lascia morire, e lui non la lascia andare.

**La posta in gioco.** Se Holdout cede, l'esplosione finisce di succedere e Nuova Megara salta in aria. Per farlo cedere basta una scossa abbastanza forte. Per spegnere l'esplosione per sempre, invece, servono tutte e ventiquattro le lettere rimesse al loro posto: un lavoro lungo, e non lo vogliono tutti, perché con il sigillo chiuso finiscono anche il Rintocco e gli Echi nuovi.

**Il tema:** far saltare tutto è facile, rimettere tutto a posto no. Per questo i Figli dell'Ultima sono sempre in vantaggio.

### Chi resta fuori dalla Stagione 1

- **Aion** resta una carta e non entra nella trama della Stagione 1.
- **Retrograde** dice di venire dal futuro e di aver già visto "il botto". Nessuno può dimostrare che sia vero: per chi scrive è un vecchio eroe che dà avvertimenti giusti con i dettagli sbagliati.

### Il registro delle lettere

Da tenere aggiornato capitolo per capitolo. La Stagione 1 è completa (Capitolo 6 nel database): la colonna di destra è lo stato a fine stagione. La Stagione 2 e lo stato a fine stagione sono in §6.7, la Stagione 3 in §7.7.

| Lettere | A inizio serie | A fine Stagione 1 |
|---|---|---|
| Α Β Γ Δ | Al Comune, trovate nei primi scavi. Danno il nome alle classi delle lastre (WORLD §3) | Al Comune |
| Ε | Nel caveau della Compagnia Lete | Al Banco, usata come stampo per le lettere false |
| Ζ | Nel petto di Xenolith | Nel petto di Xenolith, nascosto dalle Lanterne |
| Η | Mai trovata | Ne esiste solo una falsa, colata dal Banco |
| Θ | Nel vulcano | Al Banco, che la mette all'asta: uscita dal cratere con l'eruzione mancata, il dottor Spanò l'ha presa «in custodia» (Capitolo 6) |
| Ι … Ψ | Sepolte | Sepolte. Nicola sa dove sono; i Figli ne hanno alcune |
| Ω | Nella camera del tempio, tra le mani di Holdout: è la chiave di volta. Il Comune ne conosce solo il nome, che usa per la classe più rara | Tra le mani di Holdout |

Le lettere della storia non sono rarità nuove. Se un'espansione aggiungerà una rarità (WORLD §3), prenderà il nome di una lettera già trovata nella storia: la candidata è Θ.

## 3. Chi vuole cosa

Com'è all'inizio della serie e per tutta la Stagione 1. Cosa vuole ognuno nella Stagione 2 è in §6.3, nella Stagione 3 in §7.3.

| Gruppo | Cosa sa | Cosa vuole | Il suo segreto |
|---|---|---|---|
| **Custodi** | Che l'esplosione è ancora nel tempio | Che nessuno ci entri | Dicono alla città che il tempio è un rudere sigillato, per evitare il panico. Keelstone non sorveglia una porta: sorveglia una bomba |
| **Lanterne** | Che Holdout è vivo | Proteggere chi ha un Segno e non è registrato | Moth entra nel tempio ogni notte e porta da mangiare a Holdout |
| **Compagnia Lete** | Più di tutti | Che l'esplosione non finisca e non si chiuda mai: la centrale vive dell'energia che esce a ogni Rintocco | La trivella dell'Ora Zero era sua, e sapeva cosa c'era sotto. Compra lettere dagli Sciolti per toglierle dalla circolazione |
| **Figli dell'Ultima** | Dove sono le lettere: il loro capo le sente | Far finire l'esplosione, "l'ultima ora". Credono che restituirà chi l'Ora Zero si è preso | Il capo è Nicola Lenti, il fratello di Ottavia. Molti di loro sono sinceri: hanno perso qualcuno quella notte |
| **Il Banco** | Che le lettere valgono più di tutto | Vendere le lettere a chi paga di più: Compagnia, Figli o Comune. Se non le trova, le falsifica | Non distrugge i doppioni: li fonde nella fornace di Auctor per colare lettere false, che vibrano storte e fanno danni |
| **Sciolti** | Dove si scava | Vendere a chi paga | Ferryman porta fuori dal porto le lettere per conto di chiunque |
| **Il Comune** | Quasi niente | Emergenze risolte senza spendere | Usa i nomi delle lettere per classificare le lastre senza sapere cosa siano |

## 4. Il cast

### Il protagonista: tu

Il giocatore è un Reggente appena autorizzato. Nei testi di gioco gli si parla in seconda persona ("tu"), non ha volto né genere e non parla. Negli albi si vede di spalle o fuori campo, oppure se ne vedono solo le mani, come nel copione di WORLD §7.

**Dove abiti:** alle Fosse, il quartiere popolare costruito sopra la necropoli e la linea della metropolitana. Le scosse lì si sentono per prime: è il tuo motivo per andare fino in fondo, oltre all'incarico del Comune.

### Come si combatte nella storia

A Nuova Megara i superumani veri non si scontrano quasi mai di persona: costa troppo e il Comune lo vieta. Le contese si risolvono tra Reggenti, con gli Echi, sulle emergenze del sismografo. Chi ne risolve di più vince, e il risultato vale per legge: il Banco lo registra. I personaggi veri compaiono nelle scene e negli albi, mentre in partita si affrontano i loro Echi. Battere il boss vuol dire vincere la sua lastra, che è il premio del capitolo, e quello che la sfida metteva in palio: un permesso, una pietra, una porta.

In ogni missione c'è quindi un Reggente avversario. La Compagnia paga i suoi, i Figli li reclutano e il Banco li presta a interesse.

### Personaggi fuori dalle carte

Non diventano carte, almeno per ora. Chi è su una carta ha un nome di battaglia (WORLD §5); Reggenti, funzionari e gente comune usano nome e cognome. Nomi segnaposto, da verificare prima di pubblicare (WORLD §9).

- **Renata Abbate.** Funzionaria dell'Ufficio Licenze, ex Reggente. Ti consegna la licenza nel Capitolo 1. Ironica, sbrigativa, protettiva. **Segreto:** era l'archeologa dello scavo del tempio e firmò il permesso che lasciò passare la trivella della Compagnia. **Arco:** dal nascondere al confessare (Capitolo 5), poi prende il posto di Keelstone davanti alla porta.
- **Ottavia Lenti.** Reggente come te, con la licenza dello stesso giorno. Più brava, più veloce, più indebitata. Nel prologo ti prende la lastra migliore con il Diritto di Presa. Lavora per chi la paga: prima la Compagnia, poi il Banco, poi i Figli. **Cosa vuole:** ritrovare il fratello, sparito all'Ora Zero; crede che sia dentro l'armatura vuota di Absentia. **Arco:** rivale, poi avversaria; i Figli le promettono di portarla da lui, e nel Capitolo 6 scopre che lui è il loro capo. Rifiuta di seguirlo.
- **Nicola Lenti.** Il fratello di Ottavia. La notte dell'Ora Zero era alla centrale; ne è uscito con un Segno che gli fa sentire il sigillo come un battito, e sa dove sono le lettere. Guida i Figli dell'Ultima senza farsi vedere. Crede davvero che, finita l'esplosione, torneranno tutti quelli che si è presa. Si scopre nel Capitolo 6.
- **Il dottor Spanò.** Cassiere dell'undicesimo piano del Banco. Educatissimo, arriva dopo ogni emergenza a prendere la percentuale e prende "in custodia" ogni lettera trovata. Non perde mai, e lo dice.

### Carte che tornano spesso

- **Publican** (P017): il suo bar è terreno neutrale. Tra un capitolo e l'altro ci si incontra lì.
- **Longwave** (P020): radioamatrice delle Fosse. Ascolta il sismografo e capisce lo schema delle scosse.
- **Gazetteer** (P088): sa tutto di tutti. È il modo più rapido per far girare una notizia, vera o no.
- **Moth** (P053): la Lanterna che entra ovunque. È il filo che porta al tempio.
- **Retrograde** (P100): il vecchio eroe che dice di venire dal futuro. Arriva quando serve un avvertimento.

## 5. Stagione 1: *Il Rintocco*

*Completa: i sei capitoli sono nel database e giocabili.*

Sei capitoli in tre atti. Ogni capitolo ha un luogo, una fazione avversaria, un boss la cui carta è il premio (mai Omega, mai una carta con sblocco a livello) e una rivelazione che sposta la domanda successiva.

| Atto | Cap. | Titolo | Luogo | Avversari | Boss e premio | Lettera | Rivelazione |
|---|---|---|---|---|---|---|---|
| I · La licenza | 1 | Il porto | Porto, molo 7, caveau | Compagnia Lete | Vetrix (P051, Alfa) | Ε | Esistono altre lettere, e quando una si muove le Fosse tremano |
| I · La licenza | 2 | Il sismografo | Metropolitana e necropoli | Figli dell'Ultima | Vera Kross (P054, Alfa) | Ζ | Ogni lettera smossa fa tremare la città, e i Figli lo vogliono |
| II · Lo schema | 3 | Undici piani | Torre del Banco | Banco e Sciolti | Auctor (P052, Alfa) | Η falsa | Il Banco falsifica le lettere con le lastre fuse |
| II · Lo schema | 4 | Multitude | Quartieri alti | Figli e alleati manipolati | Antiphon (P111, Beta) | — | L'Ora Zero è un'esplosione ferma a metà |
| III · L'ultima ora | 5 | La porta | Tempio e centrale | Compagnia, poi Custodi | Keelstone (P055, Alfa) | Ω | Holdout tiene il sigillo; se cede, la città salta |
| III · L'ultima ora | 6 | Mongibello | Il vulcano | Figli dell'Ultima | Effigy (P079, Alfa) | Θ | Il capo dei Figli è il fratello di Ottavia |

Gli albi di WORLD §7 confluiscono qui: *Il Reggente* e *Rissa al porto* nel Capitolo 1, *Il sismografo* nel 2, *Multitude* nel 4, *Mongibello* nel 6.

### 5.1 I capitoli

Squadre avversarie, Minacce e difficoltà si tarano con la simulazione, come nel Capitolo 1 (SPEC §5.11). Le carte indicate per ogni missione sono il cuore della squadra, non la squadra intera. **La cosa strana** di ogni capitolo è l'unico elemento fuori dal normale che il capitolo introduce (§8).

#### Capitolo 1 — Il porto

*Atto I. Testi nel database (migrazioni `20261108223000_chapter_one_story.sql` e `20261111230000_grounded_story_texts.sql`); squadre e Minacce sono quelle tarate in origine.*

- **In una riga:** il primo incarico da Reggente, al porto dove la Compagnia Lete vende la soluzione ai guai che provoca.
- **La cosa strana:** una pietra incisa con una lettera greca, che fa tremare la città quando esce dal caveau.
- **Prologo** (solo albo): Renata ti consegna la licenza e una lastra. *"Non sai chi è. Però è tuo. Finché non lo perdi."* La sera stessa Ottavia ti sfida al bar di Publican e te la prende.
- **Avversari:** la Compagnia Lete e gli Sciolti che lavorano per lei. Nell'ultima missione il Reggente della Compagnia è Ottavia.
- **Conflitto interno:** Cullet riscuote per dirigenti che lo considerano sacrificabile, e lo sa. Vetrix è stanco di fare la guardia a un caveau.
- **Carte presentate:** Cullet, Blackbody, Vetrix.
- **Boss:** Vetrix.
- **Rivelazione:** nel caveau, tra le merci della Compagnia, c'è una pietra incisa con la epsilon. Arriva il dottor Spanò e la prende in custodia per il Banco.
- **Gancio:** quella notte il sismografo registra una scossa sotto le Fosse, il tuo quartiere, nel momento esatto in cui la pietra esce dal caveau.

| # | Missione | Situazione | Carte principali |
|---|---|---|---|
| 1 | Primo incarico | La banda di Foundling ripulisce il mercato del pesce | Foundling, Lacuna, Ferryman |
| 2 | Il pugile di vetro | Cullet riscuote il pizzo sul molo 7 | Cullet, Pyrrhic, Malleus |
| 3 | Blackout | Il porto resta al buio e la Compagnia noleggia generatori | Blackbody, Swarf, Byline |
| 4 | Campane a mezzanotte | I Figli dell'Ultima scavano sotto i magazzini: prima apparizione | Belladonna, Lullaby, Credo |
| 5 | Il caveau | Ottavia difende il caveau con le lastre della Compagnia | Vetrix, Mekana, Gavel |

#### Capitolo 2 — Il sismografo

*Atto I. Albo* Il sismografo. *Testi nel database (migrazioni `20261109100000_chapter_two_story.sql` e `20261111230000_grounded_story_texts.sql`); squadre e Minacce tarate con la simulazione (SPEC §5.11).*

- **In una riga:** le Fosse tremano, un palazzo si crepa, e sotto la metropolitana i Figli dell'Ultima scavano come se sapessero dove guardare.
- **La cosa strana:** la zeta nel petto di Xenolith.
- **Luogo:** la linea che attraversa la necropoli e le gallerie degli scavi, sotto le Fosse.
- **Avversari:** i Figli dell'Ultima e le creature delle gallerie. Il Comune manda due Reggenti sulla stessa emergenza: tu e Ottavia.
- **Conflitto interno:** Credo vuole scavare subito, Lullaby vuole prima convincere la gente del quartiere. Epigone è stato reclutato da una settimana e non sa ancora a cosa serva lo scavo.
- **Carte presentate:** Longwave, Xenolith, Vera Kross.
- **Boss:** Vera Kross. Trova chiunque: non cerca una pietra, cerca una persona.
- **Rivelazione:** Longwave mette in fila le scosse: ogni volta che una lettera viene smossa, la città trema dove c'è la successiva. Dopo la epsilon toccava alla zeta, che Xenolith aveva trovato negli scavi e tenuto incastrata nel petto.
- **Gancio:** Vera Kross, sconfitta, ride: più lettere tirano fuori, più la città trema, e ai Figli va bene così. La scossa successiva arriva dalla torre del Banco.

| # | Missione | Situazione | Squadra avversaria (definitiva) |
|---|---|---|---|
| 1 | Ultima corsa | Una scossa ferma l'ultimo treno in galleria e le reclute dei Figli ripuliscono i passeggeri | Patina, Epigone, Falx, Quicklime, Odonate |
| 2 | Il cane a tre teste | Qualcuno ha aizzato Cerbero contro chi scende negli scavi | Cerbero, Belladonna, Kiln, Cineris, Procura |
| 3 | Onde corte | I Figli vogliono la radio di Longwave, che ascolta il sismografo | Lullaby, Credo, Tacet, Gazetteer, Epigone |
| 4 | Due Reggenti | Il Comune manda anche Ottavia: chi risolve viene pagato | Postmark, Ferryman, Lure, Cursor, Sordina |
| 5 | Chi trova | Vera Kross è arrivata a Xenolith prima di te | Vera Kross, Antiphon, Kiln, Credo, Belladonna |

#### Capitolo 3 — Undici piani

*Atto II. Testi nel database (migrazioni `20261109220000_chapter_three_story.sql` e `20261111230000_grounded_story_texts.sql`); squadre e Minacce tarate con la simulazione (SPEC §5.11).*

- **In una riga:** la torre del Banco trema, e se crolla si porta dietro mezzo centro.
- **La cosa strana:** la fornace che cola lettere false dalle lastre fuse.
- **Luogo:** la torre del Banco. Gradus porta i clienti su per le rampe; la fornace è nel seminterrato.
- **Avversari:** il Banco e gli Sciolti a contratto, schierati dai Reggenti che il Banco presta. Ottavia è tra loro: è indebitata. Nella terza missione i cacciatori di taglie vengono a riscuotere il suo debito; nell'ultima lo sconta difendendo la fornace con le lastre del Banco.
- **Conflitto interno:** Collateral deve riscuotere il debito di Ottavia e sa che il prossimo debito riscosso sarà il suo. Gradus perde un ricordo a ogni rampa e non ricorda più perché lavori lì.
- **Carte presentate:** Gradus, Collateral, Auctor.
- **Boss:** Auctor. Ha progettato la centrale, adesso la fornace.
- **Rivelazione:** il Banco non distrugge i doppioni: li fonde nella fornace di Auctor e, con la epsilon del caveau come stampo, cola lettere false da vendere come vere. La prima, una eta, vibra storta: è lei a far tremare la torre.
- **Gancio:** Auctor, sconfitto, si lascia sfuggire che la centrale non fu costruita accanto al tempio per caso. Quella notte il Banco prova la eta falsa e la vibrazione sveglia Multitude; il sismografo segna la prima scossa sotto il vulcano.

| # | Missione | Situazione | Squadra avversaria (definitiva) |
|---|---|---|---|
| 1 | Lo sportello | Abeyance non trova il tuo pagamento e la fila arriva in strada | Abeyance, Futures, Glip, Publican, Huckster |
| 2 | Le rampe | Per salire serve Gradus, e ogni rampa gli costa un ricordo | Gradus, Actuary, Escrow, Ferryman, Ephemeris |
| 3 | Il debito | Tre cacciatori di taglie vengono a riscuotere Ottavia | Collateral, Warrant, Zeta Rax, Vulgate, Postmark |
| 4 | Il furto | La Compagnia manda gli Sciolti a riprendersi la Ε | Larceny, Latchkey, Sordina, Facsimile, Procura |
| 5 | La fornace | Nel seminterrato Auctor alimenta il fuoco con le lastre, e Ottavia lo difende per conto del Banco | Auctor, Actuary, Derelict, Gradus, Collateral |

#### Capitolo 4 — Multitude

*Atto II, metà stagione. Albo* Multitude. *Testi nel database (migrazioni `20261111150000_chapter_four_story.sql` e `20261111230000_grounded_story_texts.sql`); squadre e Minacce tarate con la simulazione (SPEC §5.11).*

- **In una riga:** qualcuno parla a Multitude, e Multitude ripete le sue parole nella testa di chi ti sta vicino.
- **La cosa strana:** Multitude e i pensieri che passano da una testa all'altra.
- **Luogo:** i quartieri alti con vista sul vulcano e la scuola di Hornbook.
- **Avversari:** i Figli dell'Ultima, che usano Multitude, e i tuoi alleati quando non sono più loro: nella seconda e nella terza missione ti trovi contro gli Echi di Custodi e Lanterne. Nella quarta Ottavia gioca per i Figli e conosce già le tue lastre; perché sia passata con loro si scopre nel Capitolo 5. Renata ti manda nei quartieri alti liquidando i pensieri altrui come «stress da altitudine».
- **Conflitto interno:** le Lanterne accusano i Custodi di nascondere qualcosa sul tempio; i Custodi accusano le Lanterne di nascondere Segnati non registrati. Hanno ragione tutti e due.
- **Carte presentate:** Multitude, Antiphon, Parley.
- **Boss:** Antiphon. Ripete al contrario le parole degli altri e le ritorce contro chi le ha dette: è lui la voce che Multitude ascolta. La sua squadra comprende Multitude, che non è il premio.
- **Rivelazione:** sconfitto Antiphon, Multitude ripete la mente che aveva ascoltato prima di lui: quella di Renata. Nel suo ricordo c'è la notte dell'Ora Zero: il permesso firmato da lei, la trivella della Compagnia che sfonda il pavimento del tempio, la centrale che esplode. E l'esplosione che si ferma a metà ed è ancora lì sotto. Poi Multitude fa sentire a tutti il pensiero di Ottavia: suo fratello, sparito quella notte.
- **Gancio:** Renata sparisce, Ottavia anche. Al bar di Publican ti aspetta Retrograde, che dice di aver già visto come finisce: col botto. Stavolta la porta del tempio la devi aprire tu.

| # | Missione | Situazione | Squadra avversaria (definitiva) |
|---|---|---|---|
| 1 | Pensieri di nessuno | Hornbook sente in classe pensieri che nessuno sta pensando | Lullaby, Tacet, Gazetteer, Epigone, Patina |
| 2 | La negoziatrice | Parley cambia parte a metà di una trattativa | Parley, Bulwark, Precinct, Dogwatch, Censor |
| 3 | Sentire troppo | Le Lanterne telepati non distinguono più i pensieri propri | Fathom, Hapax, Vigil, Subsong, Hornbook |
| 4 | Facce note | Ottavia gioca come se conoscesse le tue lastre, e le conosce | Semaphore, Understudy, Procura, Sordina, Kiln |
| 5 | Ultima voce | Antiphon parla, Multitude ripete | Antiphon, Multitude, Belladonna, Lullaby, Tacet |

#### Capitolo 5 — La porta

*Atto III. Testi nel database (migrazione `20261111233000_chapter_five_story.sql`); squadre e Minacce tarate con la simulazione (SPEC §5.11).*

- **In una riga:** per fermare i Figli devi entrare nel tempio, e a difenderlo ci sono i buoni.
- **La cosa strana:** la camera del tempio, con l'esplosione ferma a mezz'aria.
- **Luogo:** la centrale, dove Perpetuum regge da solo il campo magnetico che tiene insieme quello che ne resta; poi la porta del tempio, dove sta Keelstone.
- **Avversari:** la Compagnia, che difende la centrale e le sue prove; poi i Custodi, che difendono la porta; nel mezzo Renata, che torna con la sua vecchia licenza da Reggente.
- **Conflitto interno:** tra i Custodi, Nightward ha capito la bugia sul tempio e Codicil l'ha messa a verbale. Keelstone obbedisce e basta.
- **Carte presentate:** Keelstone, Codicil, Sibilla.
- **Boss:** Keelstone. Vinta la sfida della porta, per legge deve farti passare: è la prima volta che si sposta dall'Ora Zero.
- **Rivelazione:** oltre la porta c'è la camera: una palla di luce con i detriti sospesi a mezz'aria, e al centro Holdout che tiene con le mani la pietra dell'Omega, la chiave di volta del sigillo. Moth gli porta da mangiare. Sibilla, l'intelligenza della centrale, calcola da allora quanto regge il sigillo: ogni lettera tolta lo indebolisce, e una scossa abbastanza forte farebbe cedere Holdout. Se cede, Nuova Megara salta in aria. Renata confessa: il permesso alla trivella l'aveva firmato lei. Poi prende il posto di Keelstone davanti alla porta.
- **Gancio:** i Figli non vogliono le lettere per rimetterle a posto, ma per allentare il sigillo; per il colpo finale gli serve la scossa più forte di tutte, e sveglieranno il vulcano, dove c'è anche la Θ. Ottavia è con loro: le hanno promesso di portarla da suo fratello. Nel testo finale lo racconta Moth, che entra ovunque; chi guida i Figli resta nascosto fino al Capitolo 6.

| # | Missione | Situazione | Squadra avversaria (definitiva) |
|---|---|---|---|
| 1 | Il trono di rame | Alla centrale la Compagnia non vuole visite | Mekana, Swarf, Blackbody, Odonate, Typo |
| 2 | Il decreto | La Compagnia vuole far sparire il permesso firmato da Renata: Attainder cancella i nomi dagli archivi | Attainder, Semaphore, Byline, Erasure, Signatory |
| 3 | Le colonne | I Custodi presidiano l'ingresso degli scavi | Bulwark, Hawser, Censor, Plinth, Ignifuge |
| 4 | La vecchia licenza | Renata ha ancora le sue vecchie lastre, e le usa per fermarti | Talos, Dogwatch, Wardmother, Apostate, Heirloom |
| 5 | Nessuno passa | La sfida della porta contro il Reggente dei Custodi | Keelstone, Impetus, Codicil, Nightward, Precinct |

#### Capitolo 6 — Mongibello

*Atto III, finale di stagione. Albo* Mongibello. *Testi nel database (migrazione `20261113110000_chapter_six_story.sql`); squadre e Minacce tarate con la simulazione (SPEC §5.11).*

- **In una riga:** i Figli dell'Ultima svegliano il vulcano per far cedere Holdout, e l'unico che può fermare l'eruzione non sa combattere.
- **La cosa strana:** Mongibello, che trattiene un'eruzione dentro di sé.
- **Luogo:** i quartieri alti evacuati, la strada che sale, il cratere.
- **Avversari:** i Figli dell'Ultima al completo, con Ottavia come loro Reggente. Per una volta la Compagnia sta dalla tua parte: se l'esplosione finisce, la centrale finisce con lei.
- **Conflitto interno:** Vera Kross vuole il botto e basta; Antiphon comincia a dubitare che torni qualcuno; Effigy ha un'idea più semplice: Holdout non può morire, ma può diventare pietra, e la pietra non trattiene niente.
- **Carte presentate:** Mongibello, Effigy, Carillon.
- **Boss:** Effigy, schierata da Ottavia. Nel catalogo Effigy è già tra i Figli dell'Ultima (gruppo assegnato con le schede dei personaggi).
- **Rivelazione:** Mongibello sale sul cratere e trattiene l'eruzione dentro di sé; Holdout regge. Sul cratere Ottavia incontra finalmente il capo dei Figli: è Nicola, suo fratello, vivo, con un Segno che gli fa sentire dove sono le lettere. Le chiede di restare: quando l'esplosione finirà, dice, torneranno tutti. Lei rifiuta, e lui sparisce.
- **Gancio di stagione:** la Θ è uscita dal cratere con l'eruzione mancata, e il dottor Spanò l'ha già presa: *"L'asta si apre a mezzanotte."*

| # | Missione | Situazione | Squadra avversaria (definitiva) |
|---|---|---|---|
| 1 | Evacuazione | I Figli appiccano fuochi per rallentare i soccorsi | Kiln, Cineris, Quicklime, Hecatomb, Dredge |
| 2 | Le campane | Carillon suona per avvertire la città e i Figli vogliono farla tacere | Belladonna, Tacet, Lullaby, Hospes, Theriarch |
| 3 | La strada che sale | La banda di Rubicon, pagata dai Figli, blocca l'unica strada che sale | Rubicon, Falx, Odonate, Hireling, Mischance |
| 4 | Chi trova, di nuovo | Vera Kross cerca Mongibello per impedirgli di salire | Vera Kross, Antiphon, Patina, Noophage, Epigone |
| 5 | Lo sguardo | Sul cratere Ottavia schiera Effigy | Effigy, Kiln, Credo, Miliarium, Groma |

### 5.2 Mappa delle rivelazioni

| Dopo il capitolo | Il giocatore sa | Ancora nascosto |
|---|---|---|
| 1 | Esistono altre lettere; la Compagnia le compra, il Banco se le prende; quando una si muove, le Fosse tremano | Cosa sono le lettere |
| 2 | Ogni lettera smossa fa tremare la città e indica la successiva; i Figli sanno dove scavare e vogliono che la città tremi di più | Perché lo vogliono; chi li guida |
| 3 | Il Banco falsifica le lettere con le lastre fuse, e quelle false fanno danni; la centrale accanto al tempio non è un caso | Cosa c'è nel tempio |
| 4 | L'Ora Zero è un'esplosione ferma a metà sotto la città; Renata ne è responsabile; Ottavia cerca il fratello | Chi la tiene ferma; cosa succede se riparte |
| 5 | Holdout tiene la chiave di volta; se cede, la città salta; le lettere sono il sigillo; i Figli vogliono allentarlo e svegliare il vulcano, e Ottavia è con loro | Chi guida i Figli |
| 6 | Il capo dei Figli è Nicola, il fratello di Ottavia | Come si richiude il sigillo; perché la Compagnia trivellò sapendo |

### 5.3 Dopo la Stagione 1

Ganci già aperti, da non chiudere prima del tempo. Una minaccia alla volta.

- **L'asta:** il Banco mette all'asta la Θ, e offrono in tre: la Compagnia, i Figli e il Comune.
- **Nicola:** il capo dei Figli è libero e sa dove sono le altre lettere.
- **Chiudere il sigillo:** spegnerebbe l'esplosione per sempre, ma anche il Rintocco e gli Echi nuovi. Chi lo vuole davvero?
- **La prova:** la Compagnia trivellò sapendo cosa c'era sotto, e Auctor sa come.
- **Absentia:** Ottavia credeva che il fratello fosse lì dentro. Allora chi muove l'armatura vuota?
- **Più avanti:** Re Tifeo sotto il vulcano, Cariddi nel porto, Aion. Uno per stagione, non tutti insieme.

*La Stagione 2 parte da qui: come usa questi ganci è in §6.1-§6.3; quelli che restano aperti dopo sono in §6.8.*

## 6. Stagione 2: *La marea*

*Completa: i sei capitoli sono nel database e giocabili (capitoli 7-12 nell'ordine di tutta la storia). Le schede sono definitive e le carte principali sono diventate le squadre avversarie tarate con la simulazione (SPEC §5.11).*

### 6.1 Premessa

La notte dopo l'eruzione mancata il Banco mette all'asta la Θ, e nel golfo si sveglia Cariddi, il gorgo che dall'Ora Zero le barche girano al largo. L'energia che il vulcano non sfoga più, da quando Mongibello se la tiene dentro, ha trovato un'altra strada: la spaccatura sotto il tempio arriva fin sotto il mare, e Cariddi è il punto in cui sbuca. Tre volte al giorno il gorgo beve il golfo e lo risputa: ogni onda chiude il porto, risale le gallerie della metropolitana verso le Fosse e arriva al tempio come una scossa, e ogni volta è più alta della precedente.

Sibilla ha fatto il conto. Per richiudere la spaccatura sotto il mare non serve chiudere tutto il sigillo: ne basta un terzo, le prime otto lettere, dall'alfa alla theta. Ma il sigillo si chiude come una cerniera: una lettera rimessa nell'anello tiene solo se quella prima è già al suo posto. E ogni lettera che rimetti a posto la devi togliere a qualcuno.

### 6.2 La domanda e la posta in gioco

- **La domanda:** riuscirai a rimettere nel sigillo le prime otto lettere prima che l'onda di Cariddi arrivi alle Fosse?
- **La domanda sotto:** chi vuole davvero che il sigillo si stringa? Al Comune dicono tutti di sì, e quasi tutti fanno qualcosa perché non succeda.
- **La posta in gioco:** le Fosse sono il punto più basso di Nuova Megara: se l'onda ci arriva, il tuo quartiere finisce sott'acqua. Un'onda abbastanza alta è anche la scossa che fa cedere Holdout. Nel frattempo il porto è chiuso: niente navi, niente lavoro, niente pesce al mercato.
- **Il tema:** rimettere a posto costa, e paga sempre qualcun altro. Il Comune perde le sue quattro pietre, il Banco il suo stampo, Xenolith la sua forza, le Fosse l'armatura che di notte le protegge. È l'altra faccia del tema della Stagione 1: far saltare tutto è facile, rimettere tutto a posto no.

### 6.3 Chi vuole cosa in questa stagione

| Gruppo | Cosa vuole | Cosa fa | Il suo segreto |
|---|---|---|---|
| **Comune** | Le otto lettere al loro posto, e presto | Renata, che sta alla porta del tempio, rimette le lettere nell'anello: è l'unica che sa come, perché lo scavo era il suo. I Custodi scortano le pietre | L'Ufficio Licenze non vuole dare via le quattro pietre: senza, non sa più come chiamare le lastre |
| **Compagnia Lete** | Che il sigillo non si chiuda e non si rompa: la centrale pesca l'energia dalla spaccatura, e con il sigillo più stretto ne pesca meno | Vende paratie a rate e polizze contro l'onda. Affitta ai quartieri alti il vento di Katabatic, che spinge l'onda lontano dai loro moli: cioè verso le Fosse | Absentia era l'armatura del suo capoturno, e la scatola nera ha registrato chi diede l'ordine di trivellare: Eudaemon |
| **Figli dell'Ultima** | Che Cariddi faccia quello che il vulcano non ha fatto | Nicola ha la Θ. Mentre tu rimetti le lettere dall'alfa, lui le tira fuori dall'altra parte, dalla iota in avanti, e il gorgo cresce. Aspetta la marea più alta dell'anno per gettare la Θ nell'occhio di Cariddi | Quella notte Nicola era sulla trivella, e gridò di fermarsi |
| **Il Banco** | Vendere, come sempre | Batte l'asta della Θ; vende la Ε solo insieme a una Η «garantita»; prende la percentuale su ogni sfida | La Η è quella falsa colata nella fornace (Stagione 1, Capitolo 3). Il Banco sa che è falsa; cosa farebbe al sigillo non gli interessa |
| **Sciolti** | Lavorare anche con il porto chiuso | Saccheggiano i carichi arenati. Ferryman porta fuori chiunque, a tariffa tripla | Xenolith è nascosto alle Fosse, con la zeta nel petto |
| **Lanterne** | Salvare le Fosse | Riempiono sacchi di sabbia, nascondono Xenolith, difendono Absentia, l'unica che di notte ferma l'acqua | Sanno dove dorme l'armatura e non lo dicono a nessuno |

**Le persone in questa stagione.** Nessun personaggio nuovo fuori dalle carte: bastano quelli di §4.

- **Renata Abbate** rimette ogni lettera nell'anello. Vuole rimediare in fretta, e impara che ogni lettera costa a qualcun altro.
- **Ottavia Lenti** ha detto no a Nicola, ma vuole riportarlo a casa vivo prima che lo prenda il Comune. Lavora per sé: per il Banco all'asta, per scontare il debito; per la Compagnia nel Capitolo 4, che la paga per trovare Absentia, mentre lei vuole la scatola nera, dove forse c'è la voce del fratello. La sente, e passa dalla tua parte. **Arco:** da avversaria per conto proprio ad alleata.
- **Nicola Lenti** è l'avversario della stagione. Non si fa vedere fino al finale, ma si sente: ogni lettera che tira fuori fa tremare la città. **Arco:** sull'orlo dell'occhio di Cariddi, con la Θ in mano, la sorella lo chiama per nome; le dà la pietra e si lascia portare via.
- **Il dottor Spanò** batte l'asta e vende il pacchetto. Nel Capitolo 3 perde per la prima volta, e se lo segna.
- **Eudaemon** (P175), «curatore della felicità pubblica», diventa il volto della Compagnia: è la voce che quella notte disse di trivellare.
- **Holdout** respira meglio a ogni lettera rimessa. Nel finale parla, per la prima volta dall'Ora Zero.

### 6.4 L'arco

Sei capitoli in tre atti, come la Stagione 1: ogni capitolo ha un luogo, una fazione avversaria, un boss la cui carta è il premio (mai Omega, mai una carta con sblocco a livello) e una rivelazione che sposta la domanda successiva.

| Atto | Cap. | Titolo | Luogo | Avversari | Boss e premio | Lettere | Rivelazione |
|---|---|---|---|---|---|---|---|
| I · L'onda | 1 | L'asta | Porto e Dogana | Sciolti, Compagnia, Banco | Gauger (P130, Beta) | Θ: comprata dal Comune, rubata dai Figli | Cariddi cresce perché l'energia ha trovato la strada del mare; si ferma rimettendo le prime otto lettere, in ordine |
| I · L'onda | 2 | Tra due onde | Comune, metropolitana chiusa, camera del tempio | Compagnia e Sciolti a contratto | Polifemo (P089, Beta) | Α Β Γ Δ nel sigillo | Funziona: a ogni lettera l'esplosione arretra di un battito. Ma Nicola le tira fuori dall'altra parte |
| II · La cerniera | 3 | Il pegno | Monte dei Pegni delle Fosse, caveau del Banco | Banco, Compagnia | Principal (P181, Alfa) | Ε nel sigillo; la Η del Banco smascherata | La Η del Banco è falsa e avrebbe spaccato il sigillo; quella vera cammina |
| II · La cerniera | 4 | Absentia | Le Fosse di notte, il pozzo della trivella | Compagnia, Ottavia | Eudaemon (P175, Beta) | Η vera, trovata | Absentia la muove la eta vera; la sua scatola nera prova che la Compagnia sapeva |
| III · Il gorgo | 5 | Le Fosse | Le Fosse, la stazione del vento | Compagnia, Figli | Katabatic (P122, Alfa) | Ζ e Η nel sigillo | Sette lettere fermano l'onda sul primo gradino delle Fosse; Nicola è in mare con la Θ |
| III · Il gorgo | 6 | Cariddi | Il golfo e l'occhio del gorgo | Figli dell'Ultima | Clementia (P214, Alfa) | Θ nel sigillo | La spaccatura sotto il mare si chiude; Holdout parla: quando le lettere saranno tutte, potrà lasciare |

### 6.5 I capitoli

Come in §5.1: le carte indicate per ogni missione sono il cuore della squadra, da completare e tarare con la simulazione quando il capitolo si costruisce. **Cosa rischi** è la posta in gioco che l'introduzione del capitolo deve dire (§8).

**Il filo della stagione: la regola delle scosse.** Quando una lettera si muove, anche per tornare al suo posto, la città trema dove c'è la successiva (§2). La Stagione 2 la usa per far avanzare la storia senza aggiungere stranezze: è così che Longwave scopre che qualcuno tira fuori le lettere dall'altra parte (Capitolo 2), che la eta vera cammina (Capitolo 3), dov'è nascosto Xenolith (Capitolo 5) e dov'è la Θ (fine del Capitolo 5).

#### Capitolo 1 — L'asta

*Atto I. Testi nel database (migrazione `20261113160000_season_two_chapter_one_story.sql`, capitolo 7 nell'ordine di tutta la storia, missioni C7M1-C7M5); squadre e Minacce tarate con la simulazione (SPEC §5.11).*

- **In una riga:** il Banco vende la Θ al miglior offerente, e la stessa notte nel golfo si sveglia Cariddi.
- **La cosa strana:** Cariddi, il gorgo che beve il golfo e lo risputa.
- **Cosa rischi:** se la Θ va alla Compagnia o ai Figli, nel sigillo non torna più; intanto la prima onda ha chiuso il porto e risale le gallerie verso le Fosse.
- **Luogo:** il porto chiuso dalla prima onda e la Dogana, dove il Banco batte l'asta. Gauger, la doganiera incatenata alla scrivania, timbra il lotto.
- **Come funziona l'asta:** al Banco ogni rilancio va difeso con una sfida tra Reggenti, e il Banco prende la percentuale su ogni sfida. Offrono in tre: la Compagnia, i Figli con un prestanome e il Comune, che non ha soldi e manda te, con la colletta delle Fosse raccolta al bar di Publican in una scatola da scarpe.
- **Avversari:** gli Sciolti che saccheggiano i carichi arenati, gli altri offerenti e, nell'ultima missione, il Banco stesso, che difende il prezzo di riserva con Ottavia come Reggente: così sconta il suo debito.
- **Conflitto interno:** Gauger vorrebbe chiudere la Dogana, perché l'acqua le arriva alle caviglie e lei è incatenata alla scrivania; Spanò le ricorda che il Banco non ha mai rimandato un'asta.
- **Carte presentate:** Cariddi, Gauger, Bascule.
- **Boss:** Gauger (P130, Beta), schierata da Ottavia per il Banco. Premio: la carta Gauger.
- **Rivelazione:** vinci l'asta e la Θ è del Comune, pagata con i soldi delle Fosse. Poi l'onda della mezzanotte entra nella Dogana, salta la luce, e quando torna la Θ non c'è più. Spanò: *"Consegnata. Quello che succede dopo la consegna non ci riguarda."* Renata ti spiega il conto di Sibilla: Cariddi cresce perché l'energia, chiuso il vulcano, ha trovato la strada del mare, e per richiudere la spaccatura servono le prime otto lettere, rimesse in ordine.
- **Gancio:** una barca senza luci esce dal porto verso il gorgo: la Θ ce l'ha Nicola. E la prima lettera da rimettere, l'alfa, è al Comune, che non la vuole dare.

| # | Missione | Situazione | Squadra avversaria (definitiva) |
|---|---|---|---|
| 1 | Porto chiuso | La prima onda butta le barche sulle banchine e gli Sciolti saccheggiano i carichi arenati: se spariscono, domani al mercato delle Fosse non c'è niente | Lagan, Deadweight, Higgler, Gantry, Busker |
| 2 | I ponti mobili | Bascule deve alzare a mano i ponti per far entrare i soccorsi, e i rimorchiatori della Compagnia, che entrano a pagamento, li vogliono giù | Indemnity, Ballast, Onorario, Heading, Huckster |
| 3 | Il prestanome | All'asta i Figli non si fanno vedere: per loro rilancia Histrio, attore di film d'azione, con i soldi di Nicola | Histrio, Emendatio, Lullaby, Lure, Busker |
| 4 | Il rilancio | La Compagnia rilancia per chiudere la Θ nel suo caveau, insieme alle lettere che compra per toglierle di mezzo; il caveau lo sorveglia Vetrix | Errata, Bisque, Affissione, Mekana, Vetrix |
| 5 | Aggiudicata | Il Banco difende il prezzo di riserva: Ottavia sconta il suo debito schierando Gauger | Gauger, Herma, Jurat, Harrow, Cerbero |

#### Capitolo 2 — Tra due onde

*Atto I. Testi nel database (migrazione `20261113170000_season_two_chapter_two_story.sql`, capitolo 8 nell'ordine di tutta la storia, missioni C8M1-C8M5); squadre e Minacce tarate con la simulazione (SPEC §5.11).*

- **In una riga:** quattro pietre da portare dal Comune al tempio, sottoterra, nelle otto ore tra un'onda e l'altra.
- **La cosa strana:** una lettera che torna al suo posto, e l'esplosione che arretra di un battito.
- **Cosa rischi:** se il convoglio è in galleria quando arriva l'onda, le pietre finiscono sott'acqua e la cerniera non parte; e ogni giorno perso l'onda arriva più in alto sulle Fosse.
- **Luogo:** l'archivio del Comune; la linea della metropolitana chiusa dall'Ora Zero, che dal centro scende sotto le Fosse; gli scavi; la camera del tempio.
- **Avversari:** prima il Comune stesso, cioè l'Ufficio Licenze e la Soprintendenza, che non vogliono far uscire le pietre; poi la Compagnia, che con il sigillo più stretto pesca meno energia, e gli Sciolti che paga per fermare il convoglio. Nella quarta missione i Figli: per non far partire la cerniera basta rubare una pietra.
- **Conflitto interno:** Polifemo scarica per la Compagnia da vent'anni e abita alle Fosse: lo pagano per fermare il convoglio che salverebbe casa sua. Al Comune, intanto, nessuno sa cosa siano le quattro pietre, ma tutti sanno che senza non si potranno più chiamare Alfa, Beta, Gamma e Delta le lastre; solo Injunction, della Soprintendenza, sa cosa c'è sotto, e ha paura: *"Non le dico che sotto c'è qualcosa. Le dico che è ancora acceso."*
- **Carte presentate:** Injunction, Holloway, Polifemo.
- **Boss:** Polifemo (P089, Beta), schierato dal Reggente della Compagnia all'ingresso degli scavi. Premio: la carta Polifemo.
- **Rivelazione:** Renata appoggia l'alfa al suo posto nell'anello, e la pietra ci scivola dentro da sola. Nella camera i detriti sospesi arretrano di un palmo: per la prima volta dall'Ora Zero l'esplosione è tornata indietro di un battito. Con quattro lettere al loro posto l'onda delle tre arriva più bassa, e Holdout apre gli occhi.
- **Gancio:** tre notti dopo l'onda torna a crescere, e Longwave registra scosse che non vengono dalle tue pietre: qualcuno tira fuori le lettere dall'altra parte, dalla iota in avanti. Mentre tu le rimetti dall'alfa, Nicola le toglie.

| # | Missione | Situazione | Squadra avversaria (definitiva) |
|---|---|---|---|
| 1 | Il protocollo | All'Ufficio Licenze nessuno firma l'uscita delle quattro pietre: senza, come si chiameranno le lastre? Gli impiegati schierano gli Echi dell'archivio | Custos, Ultravires, Diaria, Signifer, Sextant |
| 2 | Il vincolo | Injunction blocca il trasporto: le pietre sono reperti vincolati, e lei sa che sotto è ancora acceso | Injunction, Clepsydra, Pentimento, Dosimeter, Headway |
| 3 | La linea chiusa | Il convoglio passa per la linea chiusa dall'Ora Zero, dove i pendolari di Holloway aspettano ancora la prossima fermata, e gli Sciolti della Compagnia aspettano te | Holloway, Sottovento, Recusant, Hireling, Dowser |
| 4 | Una basta | Nicola sente le pietre passare sotto le Fosse e manda i Figli a prenderne una: senza l'alfa la cerniera non parte | Hecatomb, Miliarium, Credo, Falx, Cineris |
| 5 | L'occhio solo | All'ingresso degli scavi Polifemo, che abita alle Fosse, sbarra la strada per conto della Compagnia | Polifemo, Almoner, Malleus, Inhumer, Antecessor |

#### Capitolo 3 — Il pegno

*Atto II. Testi nel database (migrazione `20261113180000_season_two_chapter_three_story.sql`, capitolo 9 nell'ordine di tutta la storia, missioni C9M1-C9M5); squadre e Minacce tarate con la simulazione (SPEC §5.11).*

- **In una riga:** il Banco vende la epsilon solo insieme a una eta, e per pagarle il Comune dà in pegno le licenze dei Reggenti, la tua compresa.
- **La cosa strana:** Principal, il registro dei debiti del Banco: un libro mastro di quattrocentotrent'anni che cammina da solo e riscuote.
- **Cosa rischi:** se la eta è falsa e la paghi, il Comune perde le licenze dei Reggenti e Renata mette nel sigillo una pietra che lo spacca.
- **Luogo:** il Monte dei Pegni, l'unico sportello del Banco alle Fosse; poi il caveau sotto la torre, dove fa la guardia Parabellum.
- **Avversari:** il Banco e i Reggenti che presta; la Compagnia, che vuole comprare la epsilon prima del Comune.
- **Conflitto interno:** al Monte dei Pegni lavora gente delle Fosse, che il pegno lo conosce anche dall'altra parte del bancone; Spanò vuole chiudere l'affare prima che qualcuno guardi la eta con la lente.
- **Carte presentate:** Principal, Strata, Monopsony.
- **Boss:** Principal (P181, Alfa), schierato dal Reggente del Banco per riscuotere il pegno. Premio: la carta Principal.
- **Rivelazione:** Strata, l'archeologo degli scavi, assaggia la eta e dice che ha due mesi; Renata la guarda con la lente: le lettere vere sono scolpite a scalpello, questa è colata e ha le bollicine. È la eta falsa della fornace, e nel sigillo l'avrebbe spaccato. Per le regole del Banco una vendita falsa è nulla e chi vende paga la penale: la epsilon va al Comune gratis, le licenze tornano ai Reggenti e Renata mette la epsilon nell'anello, dopo la delta. Spanò, per la prima volta, perde: *"Me lo segno."*
- **Gancio:** la eta vera non l'ha mai trovata nessuno. Longwave riascolta le registrazioni della notte in cui si mosse la zeta (Stagione 1, Capitolo 2): oltre alla scossa alla torre del Banco ce n'era una piccola, che si spostava. Di notte, alle Fosse, la eta vera cammina.

| # | Missione | Situazione | Squadra avversaria (definitiva) |
|---|---|---|---|
| 1 | La stima | Al Monte dei Pegni i periti del Banco stimano le licenze dei Reggenti: se la tua vale poco, il Comune non arriva al prezzo | Necropsy, Periplus, Depositum, Blotter, Futures |
| 2 | Pezzi unici | Monopsony, il mercante della Compagnia con un caveau nel petto, vuole la epsilon prima di te: compra solo pezzi unici | Monopsony, Custodia, Ademption, Attainder, Odonate |
| 3 | La lingua | Strata riconosce l'età di una pietra assaggiandola, e il Banco ha messo i suoi davanti alla teca della eta perché non ci arrivi | Warren, Portineria, Gradus, Cerbero, Derelict |
| 4 | Il caveau | La vendita è nulla, ma nel caveau i Reggenti del Banco hanno già caricato la epsilon su un furgone della Compagnia | Regina Ix, Actuary, Escrow, Jurat, Huckster |
| 5 | Interessi | Principal viene a riscuotere il pegno lo stesso: se perdi, le licenze restano al Banco | Principal, Parabellum, Collateral, Herma, Cursor |

#### Capitolo 4 — Absentia

*Atto II, metà stagione. Testi nel database (migrazione `20261116100000_season_two_chapter_four_story.sql`, capitolo 10 nell'ordine di tutta la storia, missioni C10M1-C10M5); squadre e Minacce tarate con la simulazione (SPEC §5.11). Albo* Absentia.

- **In una riga:** ogni notte un'armatura vuota ferma l'acqua alle Fosse, e ha nel petto la eta vera.
- **La cosa strana:** Absentia, l'armatura che si muove senza nessuno dentro.
- **Cosa rischi:** se la Compagnia la prende per prima la brucia, con tutto quello che c'è dentro; se la prendi tu, le Fosse perdono l'unica cosa che di notte ferma l'acqua.
- **Luogo:** le Fosse di notte, con le strade allagate dopo ogni onda; all'alba, il pozzo della vecchia trivella dentro la centrale, dove l'armatura torna sempre.
- **Avversari:** gli sciacalli delle case allagate; le Lanterne, che non vogliono dirti dove dorme l'armatura; la Compagnia, che ha messo una taglia su di lei e paga Ottavia per trovarla.
- **Conflitto interno:** le Lanterne litigano tra loro: Absentia protegge le Fosse ogni notte, ma senza la sua eta il sigillo non si chiude, e prima o poi l'onda le passa sopra. Ottavia lavora per la Compagnia ma non vuole l'armatura bruciata: vuole la scatola nera.
- **Carte presentate:** Absentia, Leeward, Eudaemon.
- **Boss:** Eudaemon (P175, Beta), schierato da Ottavia per la Compagnia al pozzo della trivella; Eudaemon è venuto di persona a guardare l'armatura bruciare. Premio: la carta Eudaemon.
- **Rivelazione:** Absentia era l'armatura del capoturno della trivella, progettata da Auctor per lavorare vicino all'energia. Il capoturno è sparito quella notte e la eta vera le si è piantata nel petto: da allora la muove la lettera, e l'armatura continua a fare l'ultima cosa che faceva, reggere quello che cade addosso a chi le sta sotto. La sua scatola nera ha registrato gli ultimi nove secondi: un ragazzo che grida di fermarsi, ed è Nicola, e una voce calma che risponde *"Sappiamo cosa c'è sotto. Trivellate."* È quella di Eudaemon. Ottavia sente suo fratello e passa dalla tua parte.
- **Gancio:** la eta non può ancora tornare al suo posto: prima ci vuole la zeta, nel petto di Xenolith, e le Fosse hanno bisogno di Absentia ancora qualche notte. La Compagnia sa che hai la registrazione.

| # | Missione | Situazione | Squadra avversaria (definitiva) |
|---|---|---|---|
| 1 | Coprifuoco | Dopo l'onda della mezzanotte alle Fosse c'è il coprifuoco, e gli sciacalli entrano nelle case allagate. Anche nella tua | Tariffario, Latchkey, Foundling, Procura, Higgler |
| 2 | Chi l'ha vista | Le Lanterne sanno dove dorme l'armatura e non te lo dicono: è l'unica che di notte ferma l'acqua | Leeward, Vulnerary, Sanctuary, Upkeep, Vigil |
| 3 | La taglia | La Compagnia ha messo una taglia sull'armatura, e i cacciatori di colossi sono già per strada | Hollowbone, Zeta Rax, Warrant, Praesidium, Insula |
| 4 | Il pozzo | Auctor, che l'ha progettata, sa dove torna l'armatura all'alba: al pozzo della trivella, dove la Compagnia la aspetta | Swarf, Typo, Pyrrhic, Mekana, Reus |
| 5 | Scatola nera | Ottavia schiera Eudaemon per la Compagnia: lei vuole sentire la scatola nera, lui vuole vederla bruciare | Eudaemon, Lamprey, Semaphore, Matins, Vetrix |

#### Capitolo 5 — Le Fosse

*Atto III. Testi nel database (migrazione `20261116120000_season_two_chapter_five_story.sql`, capitolo 11 nell'ordine di tutta la storia, missioni C11M1-C11M5); squadre e Minacce tarate con la simulazione (SPEC §5.11).*

- **In una riga:** l'onda arriva alle Fosse, e la Compagnia gliela manda con il vento.
- **La cosa strana:** Katabatic, il vento che scende dal vulcano e che la Compagnia vende a ore.
- **Cosa rischi:** casa tua. Se l'onda delle tre entra alle Fosse, il quartiere finisce sott'acqua, e con lui il bar di Publican e la radio di Longwave.
- **Luogo:** le Fosse, strada per strada; il rifugio delle Lanterne dove è nascosto Xenolith; la stazione del vento della Compagnia, sul fianco del vulcano.
- **Avversari:** la Compagnia, che ha venduto ai quartieri alti un «servizio climatico»: Katabatic spinge l'onda lontano dai loro moli, cioè verso le Fosse. I Figli, che cercano Xenolith: da quando la epsilon è tornata al suo posto le Fosse tremano sotto il rifugio delle Lanterne, e lo sanno tutti, Nicola compreso.
- **Conflitto interno:** Xenolith vuole dare la zeta; le Lanterne no, perché senza la pietra torna un cavatore qualunque, e un cavatore qualunque il Comune non l'ha mai protetto.
- **Carte presentate:** Katabatic, Unbidden, Contumax.
- **Boss:** Katabatic (P122, Alfa), schierato dal Reggente della Compagnia alla stazione del vento. Premio: la carta Katabatic.
- **Rivelazione:** vinta la sfida, il vento gira. Xenolith si fa togliere la zeta (gli restano un buco nel petto, che si chiuderà in un mese, e la forza di un cavatore qualunque) e Renata la rimette nell'anello, dopo la epsilon; subito dopo Ottavia toglie la eta dal petto di Absentia e Renata mette al suo posto anche quella, mentre l'armatura si siede in mezzo alla strada e non si rialza. Sette lettere: l'onda delle tre si ferma sul primo gradino delle Fosse.
- **Gancio:** quando la eta lascia l'armatura la città trema dove c'è la lettera successiva, e non è in città: è in mezzo al golfo. Nicola è in mare con la Θ, e stanotte c'è la marea più alta dell'anno.

| # | Missione | Situazione | Squadra avversaria (definitiva) |
|---|---|---|---|
| 1 | Sacchi di sabbia | Alle Fosse si riempiono sacchi di sabbia, e gli esattori della Compagnia vendono paratie a rate a chi non può pagarle | Gavel, Cullet, Indemnity, Billable, Signatory |
| 2 | Quaranta braccia | Unbidden, l'intelligenza di quartiere, alza paratie con quaranta braccia, e la Compagnia vuole spegnerla: regala quello che lei vende | Byline, Facsimile, Bisque, Blackbody, Almoner |
| 3 | Il battito | I Figli cercano Xenolith casa per casa: Nicola sente la zeta come un battito | Theriarch, Hospes, Kiln, Dittograph, Falx |
| 4 | Il meteo | Contumax, il vecchio supercattivo che ora fa il meteo in TV, annuncia «vento favorevole» mentre l'onda punta le Fosse | Contumax, Erasure, Understudy, Gazetteer, Insula |
| 5 | Vento di terra | Alla stazione del vento il Reggente della Compagnia schiera Katabatic, e l'onda delle tre è già partita | Katabatic, Eudaemon, Errata, Mischance, Malleus |

#### Capitolo 6 — Cariddi

*Atto III, finale di stagione. Albo* Cariddi. *Testi nel database (migrazione `20261116140000_season_two_chapter_six_story.sql`, capitolo 12 nell'ordine di tutta la storia, missioni C12M1-C12M5); squadre e Minacce tarate con la simulazione (SPEC §5.11).*

- **In una riga:** con la marea più alta dell'anno Nicola porta la Θ nell'occhio di Cariddi, dove nessuno potrà più riprenderla.
- **La cosa strana:** l'occhio del gorgo: in mezzo al golfo il fondo del mare resta all'asciutto, e al centro brilla la spaccatura.
- **Cosa rischi:** se la Θ finisce nella spaccatura, il sigillo non si chiuderà mai oltre la eta e Cariddi crescerà per sempre; e l'onda di stanotte è alta abbastanza da passare sopra le Fosse e far cedere Holdout.
- **Luogo:** il golfo di notte, sulla barca di Ferryman; le barche dei Figli; l'occhio di Cariddi.
- **Avversari:** i Figli dell'Ultima al completo. Ottavia è sulla tua barca. Ferryman ti porta a tariffa tripla; il dottor Spanò segue da lontano su una lancia del Banco, perché sull'esito si accettano scommesse.
- **Conflitto interno:** Clementia ha fondato i Figli per riportare a casa chi l'Ora Zero si è preso, non per allagare le Fosse; Tenant, che dice di essere tornato due volte dall'altra parte, giura che l'onda li riporterà tutti.
- **Carte presentate:** Clementia, Tenant.
- **Boss:** Clementia (P214, Alfa), schierata dal Reggente dei Figli sull'orlo dell'occhio. Premio: la carta Clementia.
- **Rivelazione:** sull'orlo dell'occhio, con l'onda che sale, Nicola alza la Θ per gettarla. Ottavia lo chiama per nome, e lui gliela mette in mano. Renata la rimette nell'anello: otto lettere, la spaccatura sotto il mare si chiude, Cariddi torna un gorgo che le barche girano al largo e l'onda muore contro il molo, lontano dalle Fosse. Nicola si lascia portare via dai Custodi. Nella camera, per la prima volta dall'Ora Zero, Holdout muove una mano e parla: *"Quando saranno tutte e ventiquattro, potrò lasciare."*
- **Gancio di stagione:** Sibilla spiega cosa vuol dire: con il sigillo chiuso l'energia smette di passare per Holdout, e niente lo tiene più in vita. Lui lo sa, e lo vuole.

| # | Missione | Situazione | Squadra avversaria (definitiva) |
|---|---|---|---|
| 1 | La traversata | Ferryman è l'unico che esce con il porto chiuso, a luci spente come quando porta fuori il contrabbando, e le barche dei Figli pattugliano il golfo | Dredge, Lagan, Hecatomb, Falx, Epigone |
| 2 | Il faro | I Figli hanno spento il faro all'imboccatura del golfo, e le barche dei soccorsi vanno sugli scogli | Belladonna, Tacet, Patina, Lullaby, Cineris |
| 3 | Chi torna | Tenant guida le barche dei Figli verso l'occhio: «il ritorno è compreso nel prezzo» | Tenant, Emendatio, Credo, Dittograph, Quicklime |
| 4 | L'occhio | Nell'occhio del gorgo il fondo del golfo è all'asciutto, Vera Kross aspetta chi scende e il dottor Spanò, dalla lancia del Banco, accetta scommesse | Vera Kross, Antiphon, Noophage, Groma, Praesidium |
| 5 | Il brutto tempo | Sull'orlo dell'occhio il Reggente dei Figli schiera Clementia; dietro di lei Nicola aspetta l'onda | Clementia, Tenant, Wirepuller, Effigy, Miliarium |

### 6.6 Mappa delle rivelazioni

| Dopo il capitolo | Il giocatore sa | Ancora nascosto |
|---|---|---|
| 1 | Cariddi cresce perché l'energia, chiuso il vulcano, ha trovato la strada del mare; ogni onda è una scossa per Holdout e risale verso le Fosse; si ferma rimettendo nel sigillo le prime otto lettere, in ordine; la Θ ce l'ha Nicola | Se rimettere le lettere funzioni davvero; cosa voglia fare Nicola con la Θ |
| 2 | Funziona: a ogni lettera rimessa l'esplosione arretra di un battito; la Compagnia non vuole il sigillo più stretto; Nicola tira fuori le lettere dall'altra parte | Dov'è la eta vera |
| 3 | La eta del Banco è falsa e avrebbe spaccato il sigillo; il Banco può perdere; la eta vera cammina, di notte, alle Fosse | Chi o cosa la porta in giro |
| 4 | Absentia la muove la eta vera; la Compagnia trivellò sapendo, e l'ordine lo diede Eudaemon; quella notte Nicola gridò di fermarsi | Cosa farà Nicola con la Θ |
| 5 | Sette lettere fermano l'onda sul primo gradino delle Fosse; senza la Θ la spaccatura resta aperta; Nicola è in mare con la Θ | Che cosa voglia farne; cosa succede quando il sigillo sarà chiuso del tutto |
| 6 | Otto lettere chiudono la spaccatura sotto il mare; Nicola è preso; chiudere tutto il sigillo vuol dire anche lasciar morire Holdout, e Holdout lo vuole | Dove sono le altre sedici lettere; cosa faranno i Figli senza Nicola |

### 6.7 Il registro delle lettere

Come in §2, si è aggiornato capitolo per capitolo mentre i capitoli entravano nel database. **Stato finale** (Stagione 2 completa nel database): Α Β Γ Δ sono nel sigillo, portate dal Comune al tempio e rimesse nell'anello da Renata; la Ε è nel sigillo anche lei, dopo che la vendita del Banco è stata dichiarata nulla perché la Η venduta insieme era la falsa della fornace (il Banco non ha più lo stampo); la Ζ è nel sigillo: Xenolith se l'è fatta togliere dal petto, e gli è rimasta la forza di un cavatore qualunque; la Η vera è nel sigillo, dopo la zeta: Ottavia l'ha tolta dal petto di Absentia, che si è seduta in mezzo a una strada delle Fosse e non si è più rialzata; la Θ è nel sigillo, dopo la eta: sull'orlo dell'occhio di Cariddi Nicola l'ha messa in mano alla sorella e Renata l'ha rimessa nell'anello. Con otto lettere al loro posto la spaccatura sotto il mare si è chiusa, Cariddi è tornato un gorgo che le barche girano al largo e Holdout ha parlato; Nicola è in cella. La Ι e la Κ, che Nicola ha tirato fuori dall'altra parte, sono ai Figli; tutte le altre lettere sono dove erano a fine Stagione 1.

| Lettere | A fine Stagione 1 | Nella Stagione 2 | A fine Stagione 2 |
|---|---|---|---|
| Α Β Γ Δ | Al Comune | Portate dal Comune al tempio, sottoterra (Capitolo 2) | Nel sigillo. Le classi delle lastre si chiamano ancora così: il nome resta, le pietre no |
| Ε | Al Banco, usata come stampo | Il Banco la vende insieme alla eta falsa; la vendita è nulla e va al Comune (Capitolo 3) | Nel sigillo. Senza stampo il Banco non può più colare lettere false |
| Ζ | Nel petto di Xenolith, nascosto dalle Lanterne | Xenolith la dà (Capitolo 5) | Nel sigillo |
| Η | Solo una falsa, al Banco | La falsa è smascherata (Capitolo 3); la vera è nel petto di Absentia (Capitolo 4) | La vera nel sigillo (Capitolo 5), e Absentia si ferma. La falsa in una cassaforte del Comune |
| Θ | Al Banco, all'asta | Comprata dal Comune e rubata dai Figli (Capitolo 1), ripresa sull'orlo di Cariddi (Capitolo 6) | Nel sigillo |
| Ι Κ | Sepolte | Nicola le tira fuori per far crescere Cariddi (Capitolo 2) | Ai Figli |
| Λ … Ψ | Sepolte; i Figli ne hanno alcune | — | Sepolte o ai Figli. Nicola, in cella, sa ancora dove sono |
| Ω | Tra le mani di Holdout | — | Tra le mani di Holdout, che con otto lettere al loro posto muove una mano e parla |

### 6.8 Ganci per la Stagione 3

Da non chiudere prima del tempo. Una minaccia alla volta.

- **Holdout vuole lasciare.** Con il sigillo chiuso l'energia smette di passare per lui, e niente lo tiene più in vita. Chiudere tutto vuol dire spegnere l'esplosione, il Rintocco, gli Echi nuovi e Holdout. La domanda della Stagione 1, chi lo vuole davvero, adesso ha una faccia.
- **Nicola in cella.** È l'unico che sa dove sono le altre sedici lettere: per trovarle il Comune dovrà chiederle a lui.
- **I Figli senza Nicola.** Li guida Tenant, e guardano di nuovo il vulcano, dove Re Tifeo ogni tanto si gira nel sonno. È il candidato per la minaccia della Stagione 3.
- **Eudaemon.** La registrazione prova che la Compagnia sapeva: il processo, o quello che la Compagnia farà per evitarlo. E le lettere che ha comprato dagli Sciolti per toglierle di mezzo sono ancora nel suo caveau.
- **Il Banco ha perso una volta.** Spanò se l'è segnato.
- **Absentia.** Un'armatura vuota seduta in mezzo a una strada delle Fosse, che le Lanterne tengono pulita. Il capoturno della trivella aveva un nome.
- **Più avanti:** Aion.

*La Stagione 3 parte da qui: come usa questi ganci è in §7.1-§7.3; quelli che restano aperti dopo sono in §7.8.*

### 6.9 Decisioni aperte della Stagione 2

Valgono i default finché non si decide altrimenti.

| Decisione | Default |
|---|---|
| Titolo della stagione | *La marea* |
| Minaccia della stagione | Cariddi. Re Tifeo candidato per la Stagione 3, Aion più avanti |
| Le otto lettere e la cerniera | Regola della storia, non del gioco: una lettera tiene solo se quella prima è al suo posto; le prime otto, un terzo del sigillo, chiudono la spaccatura sotto il mare |
| Effetto sul Rintocco | Nessuno. Il Rintocco, gli Echi e i pacchetti restano come sono: la stagione stringe il sigillo ma non lo chiude |
| Premi dei capitoli | La carta del boss: Gauger, Polifemo ed Eudaemon (Beta), Principal, Katabatic e Clementia (Alfa). Tre e tre, i Beta all'inizio e gli Alfa alla fine. Da verificare con l'economia (SPEC §8) |
| Carte scelte | Quasi tutte mai comparse nella Stagione 1, molte dal compendio. Gli eroi di Custodi e Lanterne non ancora usati restano soprattutto per la Stagione 3 |
| La voce dell'ordine | Eudaemon (P175), che diventa il volto della Compagnia |
| Absentia | L'armatura del capoturno della trivella, progettata da Auctor; la muove la eta vera; dopo il Capitolo 5 resta ferma. Il capoturno per ora non ha nome |
| Nicola alla fine della stagione | Dà la Θ alla sorella e si lascia arrestare |
| Ottavia | Alleata dal Capitolo 4 |
| Spanò | Perde per la prima volta nel Capitolo 3 |
| Holdout | Parla una volta sola, nel finale |
| Personaggi nuovi fuori dalle carte | Nessuno |
| Nel database | Fatto con il Capitolo 1 (migrazione `20261113160000_season_two_chapter_one_story.sql`): i capitoli si leggono da 1 in ogni stagione (`story_chapters.number`), ma nell'ordine di tutta la storia sono 7-12 e le missioni hanno i codici C7M1-C12M5 (SPEC §5.11). La Stagione 2 è in `story_seasons`; il messaggio di fine della Stagione 1 ora dice «Hai finito la Stagione 1, Il Rintocco. Ti aspetta la Stagione 2, La marea.», e quello della Stagione 2, finché la stagione non è stata completa, «Il prossimo capitolo della Stagione 2, La marea, arriva presto.». Il Capitolo 6 (migrazione `20261116140000_season_two_chapter_six_story.sql`) ha chiuso la stagione con il messaggio «Hai finito la Stagione 2, La marea. La prossima stagione arriva presto.», e il Capitolo 1 della Stagione 3 (migrazione `20261121200000_season_three_chapter_one_story.sql`) l'ha cambiato in «Hai finito la Stagione 2, La marea. Ti aspetta la Stagione 3, La montagna.» |
| Albi | Uno per capitolo, come nella Stagione 1; *Absentia* (Capitolo 4) e *Cariddi* (Capitolo 6) sono i due principali. Da aggiungere a WORLD §7 quando si scrivono |

## 7. Stagione 3: *La montagna*

*Scritta, in costruzione nel database: i capitoli si costruiscono uno alla volta, come quelli delle prime due stagioni (capitoli 13-18 nell'ordine di tutta la storia, missioni C13M1-C18M5). I Capitoli 1, 2, 3 e 4 sono nel database e giocabili. Le carte principali delle missioni sono il cuore delle squadre, da completare e tarare con la simulazione (SPEC §5.11).*

### 7.1 Premessa

Chiusa la spaccatura sotto il mare, l'energia che usciva da Cariddi torna da dove era venuta: sotto il vulcano. Lì però non può sfogarsi, perché dalla notte dell'eruzione mancata Mongibello se la tiene dentro (Stagione 1, Capitolo 6), e allora si spande nella roccia, calda. Sotto la montagna, da tremila anni, dorme Re Tifeo, il gigante del mito su cui fu messa la montagna, e quel calore lo sta svegliando. È così grande che sta sotto tutta la città: la testa sotto il cratere, la mano destra sotto le Fosse. I Greci costruirono la necropoli sul suo palmo, perché il peso dei morti la tenesse ferma. Ogni volta che si gira nel sonno la città trema, e le Fosse si alzano e si crepano.

Sibilla ha fatto il conto. Per rimetterlo a dormire bisogna togliergli il calore, cioè chiudere la spaccatura sotto il vulcano, e serve il secondo terzo del sigillo: altre otto lettere, dalla iota alla pi. La cerniera è quella della Stagione 2: una lettera tiene solo se quella prima è al suo posto. E ogni lettera, di nuovo, va tolta a qualcuno.

### 7.2 La domanda e la posta in gioco

- **La domanda:** riuscirai a rimettere nel sigillo le lettere dalla iota alla pi prima che Re Tifeo si svegli del tutto e si alzi?
- **La domanda sotto:** Holdout ha detto che, quando le lettere saranno tutte e ventiquattro, potrà lasciare (Stagione 2, Capitolo 6). Ogni lettera che rimetti avvicina la sua fine: chi decide al suo posto? A metà stagione la domanda si allarga: cosa c'è, oltre a Holdout, dentro l'esplosione?
- **La posta in gioco:** le Fosse stanno sulla mano del gigante. A ogni giro si alzano e si crepano, e il Comune, invece di cercare le lettere, le dichiara zona rossa e vuole sgomberarle, casa tua compresa. Se Tifeo si alza, la montagna si apre, l'eruzione che Mongibello trattiene esce tutta insieme e la scossa fa cedere Holdout: Nuova Megara salta in aria, e le Fosse per prime, perché la mano si alza per prima.
- **Il tema:** chi porta il peso. Holdout porta la chiave di volta, Mongibello un'eruzione, Mainstay una montagna, Moth un segreto, le famiglie del turno di notte un lutto che per la legge non esiste. Nessuno può portare un peso per sempre, e chi lo posa deve sapere chi lo raccoglie. È la terza faccia del tema: far saltare tutto è facile (Stagione 1), rimettere a posto costa a qualcun altro (Stagione 2), e chi tiene in piedi tutto ha diritto di smettere (Stagione 3).

### 7.3 Chi vuole cosa in questa stagione

| Gruppo | Cosa vuole | Cosa fa | Il suo segreto |
|---|---|---|---|
| **Comune** | Che il gigante torni a dormire senza spendere | Dichiara le Fosse zona rossa e ordina lo sgombero; poi è tentato dal pozzo di sfogo che la Compagnia gli offre sul vulcano. Renata rimette le lettere nell'anello, i Custodi tengono Nicola in cella | Nel piano regolatore le Fosse sono da cinquant'anni «zona di espansione futura»: lo sgombero era già scritto, aspettava solo una scusa |
| **Compagnia Lete** | Evitare il processo a Eudaemon e non perdere altra energia: con la spaccatura sotto il vulcano chiusa, la centrale pesca ancora meno | Offre al Comune di trivellare un pozzo di sfogo sul vulcano, cioè di rifare quello che fece l'Ora Zero; offre alle famiglie del turno di notte di togliere loro il dolore, se ritirano la denuncia | Nel caveau del porto ha la lambda e la mu, comprate dagli Sciolti. E dopo l'Ora Zero fece leggere ad Attainder un decreto sui quarantun operai del turno di notte: da allora nessuno riesce più a dire i loro nomi, e per la legge quella notte non è sparito nessuno |
| **Figli dell'Ultima** | Che Tifeo si alzi: è la scossa più forte di tutte, e la Θ non serve più | Li guida Tenant. Tengono la iota e la kappa a Vall'Oscura, cercano la pi nel cratere, aspettano che Mongibello ceda | Molti di loro sono le famiglie del turno di notte. Tenant promette che, quando il gigante si alzerà, i loro torneranno: «Il ritorno è compreso nel prezzo» |
| **Il Banco** | Rifarsi della volta che ha perso (Stagione 2, Capitolo 3) | Compra a un decimo del prezzo le case della zona rossa; prova a pagare la cauzione di Nicola, che sente le lettere, per farlo lavorare per sé; presta al tribunale la Statera, che pesa i risarcimenti | Nessuno: lo fa alla luce del sole. A fine stagione possiede quaranta case delle Fosse, e lo sgombero non c'è più |
| **Lanterne** | Che le Fosse restino abitate | Aiutano chi non vuole andarsene; ma sono divise su Holdout, e la metà che sta con Moth non vuole che il sigillo si chiuda | Moth tiene la nu da anni. E al buio vede quello che c'è dentro la luce dell'esplosione |
| **Custodi** | L'ordine | Eseguono lo sgombero; sorvegliano Nicola; sulla montagna difendono il paese di Mainstay | Quelli del paese giurano che Mainstay li protegge dalle frane, e non sanno perché stia lì davvero (Capitolo 5) |
| **Sciolti** | Lavorare | I contadini della Piana non fanno passare nessuno; i cacciatori di colossi aspettano che Mainstay si sposti | — |

**Le persone in questa stagione.** Nessun personaggio nuovo fuori dalle carte: bastano quelli di §4.

- **Renata Abbate** rimette ogni lettera nell'anello. Ha sempre pensato all'Ora Zero come a una centrale esplosa; nel Capitolo 3 scopre che il permesso che firmò mandò sulla trivella quarantadue persone, e che quarantuno non sono tornate. **Arco:** dalla fretta di rimediare alla paura di cosa farà l'ultima lettera.
- **Ottavia Lenti** fa da scorta al fratello e non si fida: al primo banco di nebbia, dice, scappa. Non scappa. Nel Capitolo 3 capisce perché si era messo a capo dei Figli: erano le famiglie dei suoi compagni di turno. **Arco:** dalla diffidenza alla fiducia.
- **Nicola Lenti** esce di cella con la scorta, perché è l'unico che sente dove sono le lettere. Quella notte era l'operaio più giovane del turno di notte, ed è l'unico che ne è uscito. Aiuta perché l'esplosione deve finire «in un modo o nell'altro», ed è sicuro che, chiuso il sigillo, i suoi compagni torneranno. **Arco:** da prigioniero a guida.
- **Il dottor Spanò** si prende la rivincita: compra le Fosse mentre non valgono niente. *"Il Banco non perde due volte."*
- **Eudaemon** va a processo per l'ordine di trivellare (Capitolo 3), ed è condannato.
- **Tenant** guida i Figli senza Nicola: il ritorno, promette, è compreso nel prezzo.
- **Moth** porta da mangiare a Holdout da anni e vede quello che c'è nella luce. **Arco:** da custode del segreto ad alleata (Capitolo 4).
- **Mongibello** trattiene l'eruzione sul cratere dalla notte in cui è salito lassù, senza dormire. Nel finale la lascia andare.
- **Holdout** parla una volta, nel finale: *"Prima loro."*

### 7.4 L'arco

Sei capitoli in tre atti, come le prime due stagioni: ogni capitolo ha un luogo, una fazione avversaria, un boss la cui carta è il premio (mai Omega, mai una carta con sblocco a livello, mai un boss già premiato) e una rivelazione che sposta la domanda successiva.

| Atto | Cap. | Titolo | Luogo | Avversari | Boss e premio | Lettere | Rivelazione |
|---|---|---|---|---|---|---|---|
| I · Il sonno | 1 | La mano | Le Fosse, la necropoli | Compagnia, Comune e Custodi, Figli, Banco | Recesso (P224, Beta) | Ι Κ ai Figli | Sotto le Fosse c'è la mano di Re Tifeo, che si sta svegliando; lo rimettono a dormire le otto lettere dalla iota alla pi |
| I · Il sonno | 2 | Vall'Oscura | Il carcere dei Custodi, il bosco di Vall'Oscura | Custodi, Banco, Figli | Tenant (P210, Beta) | Ι Κ nel sigillo | Funziona: la mano si ferma. Nicola aiuta, e sa dove sono le altre |
| II · I nomi | 3 | Il processo | Tribunale, consiglio comunale, caveau della Compagnia | Compagnia Lete | Attainder (P116, Beta) | Λ Μ nel sigillo | Sulla trivella c'era il turno di notte: quarantadue operai, quarantuno spariti, i nomi cancellati da un decreto. Nicola è l'unico uscito |
| II · I nomi | 4 | Il turno di notte | Le Fosse di notte, il corridoio del tempio | Lanterne, Figli | Moth (P053, Alfa) | Ν nel sigillo | I quarantuno sono dentro la luce, fermi a metà di un passo. Nessuno sa cosa farà loro la chiusura |
| III · La montagna | 5 | Quello che sta | La Piana, la strada del vulcano, il paese di Mainstay | Sciolti, Figli, Custodi del paese | Mainstay (P183, Alfa) | Ξ Ο nel sigillo | Mainstay tiene giù da quattro generazioni il ginocchio di Tifeo, e sotto i suoi piedi c'erano due lettere |
| III · La montagna | 6 | Tifeo | Quartieri alti, il cratere | Figli dell'Ultima | Groma (P180, Alfa) | Π nel sigillo | La spaccatura sotto il vulcano si chiude e Tifeo torna a dormire. Holdout non lascerà prima dei quarantuno |

### 7.5 I capitoli

Come in §5.1 e §6.5: le carte indicate per ogni missione sono il cuore della squadra, da completare e tarare con la simulazione quando il capitolo si costruisce; **Cosa rischi** è la posta in gioco che l'introduzione del capitolo deve dire (§8). Le carte principali sono scelte soprattutto tra i personaggi mai comparsi nelle prime due stagioni, che sono quasi tutti eroi di Custodi e Lanterne: per questo in questa stagione i buoni ti stanno spesso contro.

**Il filo della stagione: la regola delle scosse e lo sgombero.** Quando una lettera si muove, la città trema dove c'è la successiva (§2). Rimessa la kappa, trema il caveau della Compagnia al porto, dove c'è la lambda (Capitolo 2); rimessa la mu, la scossa arriva sotto le Fosse e di notte si sposta, lungo il giro di Moth (Capitolo 3); rimessa la nu, Mainstay ondeggia per la prima volta in quattro generazioni (Capitolo 4); rimessa la omicron, trema il cratere, dove i Figli hanno la pi (Capitolo 5); rimessa la pi, trema qualcosa di lontano, fuori dalla città (Capitolo 6). Intanto lo sgombero delle Fosse, sospeso nel Capitolo 1, vale solo finché la mano non si muove di nuovo: ogni lettera rimessa è una notte in più a casa.

#### Capitolo 1 — La mano

*Atto I. Testi nel database (migrazione `20261121200000_season_three_chapter_one_story.sql`, capitolo 13 nell'ordine di tutta la storia, missioni C13M1-C13M5); squadre e Minacce tarate con la simulazione (SPEC §5.11).*

- **In una riga:** di notte le Fosse si alzano di un palmo, e il Comune, invece di chiedersi perché, le dichiara zona rossa.
- **La cosa strana:** Re Tifeo, il gigante che dorme sotto il vulcano, con la mano destra sotto le Fosse.
- **Cosa rischi:** casa tua. Se lo sgombero passa le Fosse si svuotano e il Banco se le compra; e ogni volta che la mano si muove, un altro palazzo si crepa.
- **Luogo:** le Fosse dopo la prima scossa, con mezza via puntellata; la necropoli sotto la linea della metropolitana, dove Strata ti porta a vedere il pavimento.
- **Avversari:** la Compagnia, che manda soccorritori a pagamento; il Comune e i Custodi, che eseguono lo sgombero; i Figli, che scavano nella necropoli; il Banco, che compra le case a un decimo del prezzo.
- **Conflitto interno:** Recesso, l'ufficiale dello sgombero, abita alle Fosse anche lui: l'ordinanza non l'ha scritta, gliel'hanno intestata. Stentore legge l'avviso a tutto volume e poi vorrebbe chiedere scusa sottovoce, ma non sa parlare piano.
- **Carte presentate:** Re Tifeo, Stentore, Recesso.
- **Boss:** Recesso (P224, Beta), schierato dal Reggente del Comune per eseguire lo sgombero. Premio: la carta Recesso.
- **Rivelazione:** nella necropoli il pavimento delle tombe è caldo e batte. Strata assaggia la pietra e dice che non è pietra: è osso, ha tremila anni, ed è il palmo di una mano grande come il quartiere. È Re Tifeo, il gigante che dorme sotto il vulcano: i Greci gli costruirono le tombe sulla mano perché il peso dei morti la tenesse ferma. Sibilla spiega perché si sveglia: chiusa la spaccatura sotto il mare, l'energia è tornata sotto il vulcano e il suo calore lo sveglia; se si alza, la montagna si apre e la scossa fa cedere Holdout. Per rimetterlo a dormire serve il secondo terzo del sigillo, dalla iota alla pi, in ordine. Vinta la sfida, lo sgombero è sospeso: le Fosse restano abitate finché la mano non si muove di nuovo, e il primo a disfare gli scatoloni è Recesso.
- **Gancio:** la iota e la kappa le hanno i Figli, e solo una persona può sentire dove: Nicola, in una cella dei Custodi. Intanto il Banco ha già comprato le prime case della zona rossa.

| # | Missione | Situazione | Squadra avversaria (definitiva) |
|---|---|---|---|
| 1 | Sotto le macerie | Nella notte le Fosse si sono alzate e mezzo palazzo della tua via è venuto giù: la Compagnia tira fuori la gente con i suoi soccorritori, e a ciascuno manda il conto | Billable, Indemnity, Huckster, Cullet, Typo |
| 2 | L'avviso | Stentore legge col megafono di bronzo l'avviso del Comune: le Fosse sono zona rossa, tutti fuori in quarantotto ore, e i Custodi cominciano dalla tua via | Stentore, Macadam, Azimuth, Censor, Bulwark |
| 3 | Il pavimento | Strata ti porta nella necropoli: il pavimento delle tombe è caldo e batte come un polso, e i Figli ci scavano già | Belladonna, Credo, Hecatomb, Quicklime, Theriarch |
| 4 | Compro casa | Il dottor Spanò gira le Fosse con i periti del Banco e compra le case della zona rossa a un decimo del prezzo, in contanti | Gymnasiarch, Futures, Actuary, Custos, Escrow |
| 5 | Zona rossa | Il Reggente del Comune schiera Recesso, l'ufficiale a cui l'ordinanza è intestata d'ufficio: se perdi, domattina le Fosse si svuotano | Recesso, Palladium, Truss, Noctiluca, Aerie |

#### Capitolo 2 — Vall'Oscura

*Atto I. Testi nel database (migrazione `20261121270000_season_three_chapter_two_story.sql`, capitolo 14 nell'ordine di tutta la storia, missioni C14M1-C14M5); squadre e Minacce tarate con la simulazione (SPEC §5.11).*

- **In una riga:** per trovare la iota e la kappa serve Nicola, e Nicola ti porta dai Figli, nel bosco di nebbia sopra la città, dove adesso lo chiamano traditore.
- **La cosa strana:** Vall'Oscura, il bosco sul fianco del vulcano che è un animale solo: radici, bestie e nebbia per nove chilometri quadrati, e chi ci entra non sa più chi ha accanto.
- **Cosa rischi:** senza la iota e la kappa la cerniera non parte, e alla prossima scossa lo sgombero delle Fosse riparte. Se Nicola sparisce nella nebbia, il Comune perde l'unico che sa dove sono le altre lettere.
- **Luogo:** il carcere dei Custodi; la strada che sale sul fianco del vulcano; Vall'Oscura, e la radura dove i Figli si sono accampati.
- **Avversari:** i Custodi, che non vogliono far uscire il capo dei Figli; il Banco, che vuole pagargli la cauzione; i Figli di Tenant, per cui Nicola, che ha dato la Θ alla sorella, è un traditore.
- **Conflitto interno:** tra i Figli c'è chi è ancora fedele a Nicola e chi crede solo a Tenant. Ottavia è convinta che il fratello scapperà al primo banco di nebbia; Nicola non scappa.
- **Carte presentate:** Thicket, Praecursor, Tenant.
- **Boss:** Tenant (P210, Beta), schierato dal Reggente dei Figli nella radura. Premio: la carta Tenant.
- **Rivelazione:** nella radura, in una cassetta da munizioni, i Figli tenevano la iota e la kappa. Vinta la sfida, Renata le rimette nell'anello dopo la theta, e quella notte la mano sotto le Fosse non si muove. Sulla strada del ritorno Ottavia chiede al fratello perché aiuta; lui risponde che l'esplosione deve finire, in un modo o nell'altro, e così almeno la città resta in piedi. Poi dice dove sono le altre: la lambda e la mu nel caveau della Compagnia, la nu vicino al tempio, le ultime tre sulla montagna.
- **Gancio:** quando la kappa torna al suo posto la città trema al porto, sotto il caveau della Compagnia, dove c'è la lambda. La mattina dopo la Compagnia offre al Comune di trivellare un pozzo di sfogo sul vulcano, e sul contratto c'è la firma di Eudaemon, che domani va a processo.

| # | Missione | Situazione | Squadra avversaria (definitiva) |
|---|---|---|---|
| 1 | Il colloquio | Nicola è in una cella dei Custodi, e i Custodi non vogliono farlo uscire: è il capo dei Figli, e il processo non è ancora cominciato | Praecursor, Interpres, Scion, Precinct, Dogwatch |
| 2 | La cauzione | Il dottor Spanò vuole pagare la cauzione di Nicola: chi sente le lettere vale più di qualunque lettera | Residuo, Regina Ix, Herma, Escrow, Clepsydra |
| 3 | La nebbia | A Vall'Oscura non sai più chi hai accanto, e le sentinelle dei Figli conoscono il bosco | Thicket, Lullaby, Tacet, Patina, Epigone |
| 4 | Il vecchio capo | I Figli rimasti fedeli a Nicola gli chiedono di tornare con loro: se resta, la scorta torna giù senza di lui | Credo, Belladonna, Miliarium, Hospes, Cineris |
| 5 | Il campo | Nella radura il Reggente dei Figli schiera Tenant, che ha la iota e la kappa: se perdi, restano ai Figli | Tenant, Emendatio, Dittograph, Noophage, Kiln |

#### Capitolo 3 — Il processo

*Atto II. Testi nel database (migrazione `20261122100000_season_three_chapter_three_story.sql`, capitolo 15 nell'ordine di tutta la storia, missioni C15M1-C15M5); squadre e Minacce tarate con la simulazione (SPEC §5.11).*

- **In una riga:** Eudaemon va a processo per l'ordine di trivellare, e la Compagnia offre al Comune la soluzione: trivellare di nuovo.
- **La cosa strana:** il decreto di Attainder: quarantun nomi che dall'Ora Zero nessuno riesce più a pronunciare.
- **Cosa rischi:** se il processo cade, la Compagnia ottiene il pozzo di sfogo e trivella accanto a un gigante che si sveglia, come la notte dell'Ora Zero; e la lambda e la mu restano nel suo caveau, con la cerniera ferma alla kappa e le Fosse in zona rossa.
- **Luogo:** il tribunale, in centro; la sala del consiglio comunale, dove si vota il pozzo; il caveau della Compagnia al porto.
- **Avversari:** la Compagnia Lete al completo: i suoi avvocati, la sua televisione, i suoi giardinieri del dolore, le guardie del caveau. Il Banco presta alla Compagnia la Statera e registra la sentenza.
- **Conflitto interno:** la difesa della Compagnia è semplice: nei registri quella notte non manca nessuno, quindi non c'è reato. Le famiglie del turno di notte sono in aula, ma i nomi dei loro non riescono a dirli. La Compagnia offre un accordo: la lambda e la mu al Comune, in cambio del processo. Renata vorrebbe accettare; Ottavia la convince a dire di no, e la notte prima della sentenza la Compagnia svuota il caveau (missione 4).
- **Carte presentate:** Attainder, Statera, Isonomy.
- **Boss:** Attainder (P116, Beta), schierato dal Reggente della Compagnia in aula. Premio: la carta Attainder.
- **Rivelazione:** vinta la sfida il decreto cade, e le famiglie dicono i nomi uno dopo l'altro. Quella notte sulla trivella c'era il turno di notte: quarantadue operai, quasi tutti delle Fosse. Quarantuno sono spariti nell'Ora Zero; il quarantaduesimo, il più giovane, ne è uscito con un Segno, ed è Nicola. Tra i quarantuno c'è Efisio Puddu, che da quella notte nessuno chiama più per nome: è Holdout. La Statera, che adesso li trova nel registro, pesa il risarcimento; il tribunale condanna Eudaemon e la Compagnia, il contratto del pozzo è nullo e il caveau del porto è sequestrato. Renata rimette nell'anello la lambda e la mu, e Ottavia capisce perché suo fratello si era messo a capo dei Figli: erano le famiglie dei suoi compagni.
- **Gancio:** quando la mu torna al suo posto la città trema dove c'è la nu, e la scossa non sta ferma: di notte si sposta per le Fosse, sempre lungo la stessa strada, fino alla porta del tempio. È il giro di Moth.

| # | Missione | Situazione | Squadra avversaria (definitiva) |
|---|---|---|---|
| 1 | L'udienza | Gli avvocati della Compagnia chiedono di escludere la scatola nera di Absentia, registrazione ottenuta senza licenza: se il giudice li ascolta, il processo finisce prima di cominciare | Understudy, Signatory, Byline, Semaphore, Facsimile |
| 2 | Pozzo di sfogo | In consiglio comunale si vota il pozzo della Compagnia, e da una settimana la televisione dice che salverà le Fosse: se passa, si trivella accanto al gigante | Erasure, Matins, Affissione, Contumax, Swarf |
| 3 | Il dolore | Eudaemon offre alle famiglie del turno di notte di togliere loro il dolore, gratis, se ritirano la denuncia; Isonomy, col megafono, chiede che i loro siano pesati come chiunque altro | Almoner, Custodia, Indemnity, Ademption, Lamprey |
| 4 | Il sequestro | La notte prima della sentenza le guardie della Compagnia svuotano il caveau del porto: se la lambda e la mu escono, il tribunale sequestrerà una stanza vuota | Monopsony, Blackbody, Gavel, Reus, Pyrrhic |
| 5 | Quarantun nomi | In aula il Reggente della Compagnia schiera Attainder: finché il suo decreto regge, i nomi non si dicono e per la legge non è sparito nessuno | Attainder, Eudaemon, Statera, Errata, Mekana |

#### Capitolo 4 — Il turno di notte

*Atto II, metà stagione. Testi nel database (migrazione `20261122210000_season_three_chapter_four_story.sql`, capitolo 16 nell'ordine di tutta la storia, missioni C16M1-C16M5); squadre e Minacce tarate con la simulazione (SPEC §5.11). Albo* Il turno di notte.

- **In una riga:** la nu non è sepolta: ce l'ha Moth, che porta da mangiare a Holdout da anni e non vuole che il sigillo si chiuda.
- **La cosa strana:** dentro la luce dell'esplosione, tra i detriti, ci sono i quarantuno del turno di notte, fermi a metà di un passo. Al buio Moth li vede.
- **Cosa rischi:** senza la nu la cerniera si ferma alla mu, la mano continua a girarsi e alla prossima scossa lo sgombero delle Fosse riparte. E le Lanterne sono divise: se le spacchi, le Fosse perdono chi le protegge.
- **Luogo:** le Fosse di notte: la clinica delle Lanterne, la scala dove Wick accende la sua lanterna, la strada che Moth fa ogni notte; il corridoio del tempio che porta alla camera.
- **Avversari:** le Lanterne che stanno con Moth; i Figli, che sanno anche loro dove porta la scossa e aspettano Moth sul suo giro.
- **Conflitto interno:** le Lanterne si spaccano. Longwave e chi abita sulla mano vogliono il sigillo chiuso; la metà che sta con Moth vuole che Holdout resti in vita. Moth porta da mangiare a Holdout da anni, e per lei Holdout è di famiglia.
- **Carte presentate:** Moth, Novenarium, Wick.
- **Boss:** Moth (P053, Alfa), schierata dal Reggente delle Lanterne nel corridoio del tempio. Premio: la carta Moth.
- **Rivelazione:** Moth ti dice perché ha tenuto la nu. Al buio vede la luce che le cose emettono, e dentro la luce dell'esplosione ha visto i quarantuno, tra i detriti, fermi a metà di un passo come i detriti. Non sono morti: per loro l'Ora Zero non è ancora finita. Holdout è la sola persona che si muove, perché tiene la chiave di volta. Poi dà la nu a Renata, perché il gigante ucciderebbe tutti, loro compresi. Con tredici lettere la luce arretra ancora, e per la prima volta la vedono tutti: un operaio con la tuta arancione e la targhetta da capoturno, quello di Absentia, con un piede alzato. Nicola lo chiama per nome: Corrado Musumeci (segnaposto, §7.9).
- **Gancio:** Sibilla non sa dire cosa succederà ai quarantuno quando il sigillo sarà chiuso: o finiscono il passo e tornano, o finisce l'esplosione e loro con lei. Nicola è sicuro che torneranno; Tenant dice ai Figli che il Comune li sta uccidendo. E quando la nu torna al suo posto, sul fianco del vulcano, per la prima volta in quattro generazioni, Mainstay ondeggia.

| # | Missione | Situazione | Squadra avversaria (definitiva) |
|---|---|---|---|
| 1 | La clinica | Alla clinica delle Lanterne sanno dov'è Moth e non te lo dicono: fuori c'è la zona rossa, e loro curano chi non se n'è andato | Suture, Febrifuge, Abdicant, Impound, Milewright |
| 2 | La lanterna | Le Lanterne di Moth si riuniscono sulla scala di Wick, dove i poteri non lasciano tracce: chi ci entra non lo trova nessuno | Wick, Juncture, Gridwitch, Ambit, Cicatrix |
| 3 | Il giro di Moth | I Figli aspettano Moth sulla strada che fa ogni notte verso il tempio: se le prendono la nu, la cerniera si ferma per sempre alla mu | Novenarium, Hospes, Theriarch, Falx, Cineris |
| 4 | Il corridoio | Nel corridoio del tempio le Lanterne di Moth fanno muro davanti alla camera, e Renata non può passare | Tribune, Viaticum, Cathode, Undercroft, Tether |
| 5 | Ogni notte | Il Reggente delle Lanterne schiera Moth, che porta da mangiare a Holdout ogni notte da anni: se perdi, la nu resta con lei | Moth, Afterimage, Collegium, Sampler, Raster |

#### Capitolo 5 — Quello che sta

*Atto III. Da costruire (capitolo 17 nell'ordine di tutta la storia, missioni C17M1-C17M5).*

- **In una riga:** sul fianco del vulcano un colosso sta fermo da quattro generazioni sopra un paese, e le prossime due lettere sono sotto i suoi piedi.
- **La cosa strana:** Mainstay, il colosso di centoquaranta metri che i paesani chiamano «Quello che sta».
- **Cosa rischi:** se Mainstay si sposta prima del tempo, il paese finisce sotto la frana; se resta dov'è, la xi e la omicron restano sotto i suoi piedi, e la mano sotto le Fosse riprende a girarsi.
- **Luogo:** la Piana ai piedi del vulcano; la strada di montagna, chiusa dalle frane; il paese di Mainstay, a metà del fianco.
- **Avversari:** i contadini della Piana, che da quando passano i camion della Compagnia non fanno passare più nessuno; i Figli, che vogliono far franare la montagna; i Custodi del paese, che non vogliono che il colosso si muova; i cacciatori di colossi pagati dalla Compagnia, che aspettano di venderne le ossa.
- **Conflitto interno:** il paese vive all'ombra di Mainstay da quattro generazioni e non sa perché lui stia lì; lui non l'ha mai detto, perché nessuno gliel'ha mai chiesto. I Custodi del paese giurano che li protegge dalle frane.
- **Carte presentate:** Mainstay, Bubalus, Ropework.
- **Boss:** Mainstay (P183, Alfa), schierato dal Reggente del paese. Premio: la carta Mainstay.
- **Rivelazione:** vinta la sfida, Mainstay fa un passo di lato, e il paese capisce perché stava lì: sotto le case c'è il ginocchio di Tifeo, e da quattro generazioni il colosso lo tiene giù col suo peso. Sotto i suoi piedi, schiacciate nella roccia, ci sono la xi e la omicron, cadute lì la notte dell'Ora Zero. Il ginocchio si alza di un metro e il paese trema, ma con tredici lettere al loro posto il gigante si scalda meno: le case reggono. Renata rimette nell'anello anche queste due, e Mainstay torna al suo posto.
- **Gancio:** quando la omicron torna al suo posto trema il cratere: la pi è lassù, nelle tende dei Figli. E lassù c'è Mongibello, che trattiene l'eruzione da mesi senza dormire, ed è allo stremo.

| # | Missione | Situazione | Carte principali |
|---|---|---|---|
| 1 | La Piana | Da quando passano i camion della Compagnia, Bubalus carica tutto quello che ha le ruote e i contadini della Piana non fanno salire nessuno: se non passi prima di notte, la prossima frana chiude la strada | Bubalus, Harrow, Dowser, Wardmother, Tourniquet |
| 2 | La frana | I Figli minano la strada sopra il paese: se la montagna frana sulle case, Mainstay si sposta per salvarle, e il ginocchio si alza prima del tempo | Kiln, Hecatomb, Quicklime, Cineris, Miliarium |
| 3 | Il paese | I Custodi del paese non fanno avvicinare nessuno al colosso: dicono che li protegge dalle frane, e da quattro generazioni nessuno ha mai chiesto altro | Ropework, Aerie, Noctiluca, Portitor, Quarantine |
| 4 | Le ossa | I cacciatori di colossi di Hollowbone, pagati dalla Compagnia, aspettano che Mainstay si sposti per farlo cadere: se cade, le lettere sotto i suoi piedi sono loro | Hollowbone, Praesidium, Warren, Contromano, Mischance |
| 5 | Un metro | Il Reggente del paese schiera Mainstay, che un metro fuori dal suo raggio non protegge nessuno: se perdi, non si sposta | Mainstay, Plinth, Talos, Impetus, Codicil |

#### Capitolo 6 — Tifeo

*Atto III, finale di stagione. Albo* Tifeo. *Da costruire (capitolo 18 nell'ordine di tutta la storia, missioni C18M1-C18M5).*

- **In una riga:** sul cratere i Figli hanno l'ultima lettera e aspettano che Mongibello ceda: se lascia andare l'eruzione, il gigante si sveglia del tutto.
- **La cosa strana:** Re Tifeo che si sveglia: dal fondo del cratere affiora la sua fronte, e la montagna comincia ad aprirsi come un guscio.
- **Cosa rischi:** se Tifeo si alza, la mano si alza per prima e le Fosse con lei; la montagna si apre, la scossa fa cedere Holdout e Nuova Megara salta in aria.
- **Luogo:** i quartieri alti, evacuati di nuovo; la stazione dell'ultimo treno; la strada che sale e il cratere.
- **Avversari:** i Figli dell'Ultima al completo, guidati da Tenant, con le famiglie del turno di notte che hanno creduto alla promessa del ritorno.
- **Conflitto interno:** Groma ha trovato sull'orlo del cratere il cippo con cui i Greci segnarono la testa del gigante, e sa dove scavare. Tra i Figli, però, c'è chi ha sentito i nomi in tribunale e ha visto il capoturno nella luce, e comincia a chiedersi se il gigante riporterà qualcuno o li brucerà tutti. Mongibello non dorme da mesi.
- **Carte presentate:** Groma, Overdue.
- **Boss:** Groma (P180, Alfa), schierata dal Reggente dei Figli sull'orlo del cratere; nella sua squadra c'è Re Tifeo, che non è il premio. Premio: la carta Groma.
- **Rivelazione:** vinta la sfida, per legge la pi è tua, e Renata la rimette nell'anello dopo la omicron: sedici lettere, la spaccatura sotto il vulcano si chiude e l'energia smette di scaldare il gigante. Mongibello, per la prima volta da quando è salito sul cratere, apre le mani: l'eruzione esce piano dal cratere, una colonna di fuoco che la città guarda dai tetti, e lui si addormenta lì dove sta. La fronte del gigante torna sotto la roccia, la mano sotto le Fosse si posa e lo sgombero è revocato. Nella camera la luce ormai è grande come una stanza: Holdout stacca una mano dalla chiave di volta, per la prima volta dall'Ora Zero, e indica i quarantuno. *"Prima loro."*
- **Gancio di stagione:** quando la pi torna al suo posto la città non trema: il sismografo registra una scossa lontana, fuori da Nuova Megara. Nicola non sente più le lettere: le ultime sette non sono sotto la città. E alle Fosse, revocato lo sgombero, quaranta case hanno un padrone nuovo, il Banco, compreso il palazzo dove abiti.

| # | Missione | Situazione | Carte principali |
|---|---|---|---|
| 1 | L'ultimo treno | Overdue porta giù gli sfollati dei quartieri alti con l'ultimo treno a vapore della notte, e i Figli lo fermano in stazione per portare su le famiglie del turno di notte: lassù, promettono, i loro torneranno | Lullaby, Belladonna, Epigone, Patina, Tacet |
| 2 | Il catasto | Groma ha trovato sull'orlo del cratere il cippo greco che segna la testa del gigante, e i Figli scavano dove dice lei | Groma, Miliarium, Theriarch, Credo, Falx |
| 3 | Chi tiene | Mongibello trattiene l'eruzione da mesi senza dormire, e i Figli salgono a sfinirlo: se cede adesso, il gigante si sveglia | Mordacchia, Noophage, Dittograph, Hecatomb, Cineris |
| 4 | La fronte | Dal fondo del cratere affiora la fronte del gigante, e Tenant aspetta lì con la pi in mano | Tenant, Emendatio, Hospes, Thicket, Kiln |
| 5 | Il risveglio | Sull'orlo del cratere il Reggente dei Figli schiera Groma, con l'Eco di Re Tifeo in squadra: se perdi, il gigante si alza | Groma, Re Tifeo, Tenant, Effigy, Credo |

### 7.6 Mappa delle rivelazioni

| Dopo il capitolo | Il giocatore sa | Ancora nascosto |
|---|---|---|
| 1 | Sotto la città dorme Re Tifeo, con la mano sotto le Fosse; si sveglia perché l'energia è tornata sotto il vulcano, e se si alza Holdout cede; lo rimettono a dormire le otto lettere dalla iota alla pi, in ordine; la iota e la kappa le hanno i Figli | Dove sono le altre; se Nicola aiuterà |
| 2 | Funziona: con la iota e la kappa la mano si ferma; Nicola aiuta e sa dove sono le altre; la lambda e la mu sono nel caveau della Compagnia | Cosa successe davvero sulla trivella; perché Nicola guidava i Figli |
| 3 | Sulla trivella c'era il turno di notte, quarantadue operai delle Fosse: quarantuno spariti, Nicola l'unico uscito, Holdout tra loro; la Compagnia ne ha cancellato i nomi; Eudaemon è condannato | Dove sono i quarantuno |
| 4 | I quarantuno sono dentro la luce, fermi a metà di un passo, e Moth li vedeva; nessuno sa se chiudere il sigillo li riporterà o li finirà | Perché Mainstay sta fermo dov'è |
| 5 | Mainstay tiene giù il ginocchio di Tifeo; sotto i suoi piedi c'erano la xi e la omicron; la pi è nel cratere con i Figli, e Mongibello è allo stremo | Se Mongibello reggerà |
| 6 | Sedici lettere chiudono la spaccatura sotto il vulcano: Tifeo dorme, Mongibello si svuota, lo sgombero è revocato; Holdout non lascerà prima dei quarantuno; le ultime sette lettere non sono sotto la città | Dove sono le ultime sette; cosa farà ai quarantuno la chiusura del sigillo |

### 7.7 Il registro delle lettere

Da aggiornare capitolo per capitolo mentre i capitoli entrano nel database, come in §6.7. **Stato attuale** (Capitoli 1, 2, 3 e 4 nel database): nel Capitolo 1 non si muove nessuna lettera, ma si sa a cosa servono le otto dopo la theta: rimesse nell'anello dalla iota alla pi chiudono la spaccatura sotto il vulcano e rimettono a dormire Re Tifeo. Nel Capitolo 2 Nicola esce di cella e porta la scorta a Vall'Oscura, dove i Figli tenevano la iota e la kappa in una cassetta da munizioni, nella radura; battuto Tenant, Renata le rimette nell'anello dopo la theta e quella notte la mano sotto le Fosse non si muove. Dalla alfa alla kappa, dieci lettere, sono nel sigillo. Rimessa la kappa la città trema al porto, sotto il caveau della Compagnia, dove ci sono la lambda e la mu; Nicola sa dove sono le altre: la nu vicino al tempio, le ultime tre sulla montagna. Nel Capitolo 3 la Compagnia offre le due lettere in cambio del processo e, rifiutato l'accordo, prova a svuotare il caveau la notte prima della sentenza; battuto Attainder, il tribunale condanna Eudaemon e la Compagnia e sequestra il caveau, e Renata rimette nell'anello la lambda e la mu dopo la kappa. Dalla alfa alla mu, dodici lettere, sono nel sigillo. Rimessa la mu la città trema sotto le Fosse, dove c'è la nu, e la scossa di notte si sposta lungo il giro di Moth, fino alla porta del tempio. Nel Capitolo 4 si scopre che la nu non è sepolta: da anni la tiene Moth, che ogni notte porta da mangiare a Holdout e non vuole che il sigillo si chiuda; battuta Moth nel corridoio del tempio, lei la dà a Renata, che la rimette nell'anello dopo la mu. Dalla alfa alla nu, tredici lettere, sono nel sigillo, e la luce dell'esplosione arretra fino a mostrare a tutti il capoturno. Rimessa la nu la scossa arriva sul fianco del vulcano, dove c'è la xi: Mainstay ondeggia per la prima volta in quattro generazioni. **Previsto a fine stagione:** dalla alfa alla pi, sedici lettere, sono nel sigillo; la spaccatura sotto il vulcano è chiusa e Re Tifeo dorme; le ultime sette, dalla rho alla psi, non sono sotto la città; l'omega è tra le mani di Holdout.

| Lettere | A fine Stagione 2 | Nella Stagione 3 | A fine Stagione 3 |
|---|---|---|---|
| Α … Θ | Nel sigillo | — | Nel sigillo |
| Ι Κ | Ai Figli | Tenute dai Figli in una cassetta da munizioni nella radura di Vall'Oscura, riprese con Nicola e rimesse nell'anello dopo la theta (Capitolo 2, nel database) | Nel sigillo |
| Λ Μ | Nel caveau della Compagnia al porto, comprate dagli Sciolti (§3 e gancio di §6.8; il registro di §6.7 non le contava a parte) | La Compagnia le offre in cambio del processo e prova a portarle via dal caveau; sequestrate dal tribunale con la condanna di Eudaemon e rimesse nell'anello dopo la kappa (Capitolo 3, nel database) | Nel sigillo |
| Ν | Si credeva sepolta | Da anni la tiene Moth, che l'ha trovata in un corridoio del tempio; battuta Moth, la dà a Renata, che la rimette nell'anello dopo la mu (Capitolo 4, nel database) | Nel sigillo |
| Ξ Ο | Sepolte | Schiacciate nella roccia sotto i piedi di Mainstay (Capitolo 5) | Nel sigillo |
| Π | Sepolta | I Figli la trovano nel cratere; ripresa sull'orlo (Capitolo 6) | Nel sigillo |
| Ρ … Ψ | Sepolte o ai Figli | Nicola non le sente: non sono sotto la città | Lontano: rimessa la pi, il sismografo registra una scossa fuori da Nuova Megara |
| Ω | Tra le mani di Holdout | — | Tra le mani di Holdout, che ne stacca una per indicare i quarantuno |

### 7.8 Ganci per la Stagione 4

Da non chiudere prima del tempo. Una minaccia alla volta.

- **Le ultime sette.** Dalla rho alla psi le lettere non sono sotto Nuova Megara: la scossa della pi è arrivata da lontano. È il ponte con le scosse «oltre Nuova Megara» (WORLD §6), dove il Banco affitta già i Reggenti: Giza, lo Yucatán, Atlantide, l'Artico, il Giappone, il Novecielo.
- **I quarantuno.** Sono dentro la luce, fermi a metà di un passo. Chiudere il sigillo li riporterà o li finirà? Sibilla non sa fare il conto, Nicola è sicuro che torneranno, Tenant dice che li state uccidendo.
- **Holdout** vuole lasciare, ma dopo di loro: *"Prima loro."*
- **Il Banco padrone di casa.** Quaranta case delle Fosse sono del Banco, compreso il palazzo dove abiti: l'affitto lo decide Spanò.
- **La Compagnia condannata.** Con due terzi del sigillo chiusi la centrale pesca poca energia, e la Compagnia ha già detto chi pagherà la differenza: le bollette.
- **Nicola** ha visto i suoi compagni nella luce, e chiede a Renata di farlo entrare nella camera.
- **Più avanti:** Aion, che arriva dal punto in cui è già tutto finito. È il candidato per la minaccia della Stagione 4, quella dell'ultimo terzo del sigillo.

### 7.9 Decisioni aperte della Stagione 3

Valgono i default finché non si decide altrimenti.

| Decisione | Default |
|---|---|
| Titolo della stagione | *La montagna* |
| Minaccia della stagione | Re Tifeo (P080, Omega: mai premio; è nella squadra del boss del Capitolo 6, come Wirepuller in quella di Clementia). Cariddi è stata usata nella Stagione 2; Aion è il candidato per la Stagione 4 |
| Le seconde otto lettere | Regola della storia, non del gioco, come in §6.9: la cerniera continua dalla theta, e le lettere dalla iota alla pi chiudono la spaccatura sotto il vulcano. Il sigillo si chiude a terzi: il mare (Stagione 2), il vulcano (Stagione 3), l'ultimo terzo con l'omega |
| Effetto sul Rintocco | Nessuno. Il Rintocco, gli Echi e i pacchetti restano come sono |
| Re Tifeo | Un gigante vero, sepolto dai Greci sotto il vulcano: la testa sotto il cratere, la mano destra sotto le Fosse, un ginocchio sotto il paese di Mainstay. Si gira nel sonno da sempre e si sveglia per il calore dell'energia. Alla fine torna a dormire: non muore e non se ne va |
| Il turno di notte | Quarantadue operai sulla trivella: quarantuno nella luce, tra cui Holdout e il capoturno di Absentia; Nicola l'unico uscito. I loro nomi si dicono nel Capitolo 3, ma i testi ne riportano uno solo, quello di Holdout. Novenarium (P217) è la loro carta: la sua frase, «Camera Tre, siamo pronti», è l'ultima chiamata del turno alla radio |
| Cosa succede ai quarantuno | Non si sa: è la domanda della Stagione 4, e la Stagione 3 non la scioglie |
| Il nome del capoturno | Corrado Musumeci, segnaposto da verificare prima di pubblicare, come i nomi di §9. Scelto il 22 novembre 2026 quando il Capitolo 4 è entrato nel database: nel finale Nicola lo chiama per nome. Nome e cognome comuni, come quelli di Efisio Puddu, Renata Abbate e Nicola e Ottavia Lenti; la carta di Absentia (P058) non cambia e continua a non avere un proprietario registrato |
| Holdout nel catalogo | Deciso il 21 novembre 2026: Holdout è un uomo, come nei testi pubblicati delle prime due stagioni. La carta (P057) ha come vero nome Efisio Puddu, al posto di Bonaria Puddu, e il testo dei poteri è al maschile (migrazione `20261121180000_holdout_real_name.sql`). Il suo nome torna nel Capitolo 3, con quelli del turno di notte |
| Lo sgombero delle Fosse | Sospeso nel Capitolo 1 finché la mano non si muove, revocato nel Capitolo 6. Il Banco si tiene le case che ha comprato |
| Premi dei capitoli | La carta del boss: Recesso, Tenant e Attainder (Beta), Moth, Mainstay e Groma (Alfa). Tre e tre, i Beta all'inizio e gli Alfa alla fine, come nella Stagione 2. Nessuno è già stato premiato, nessuno ha lo sblocco a livello, tutti sono nei pacchetti. Da verificare con l'economia (SPEC §8) |
| Carte scelte | Soprattutto personaggi mai comparsi nelle prime due stagioni: quasi tutti eroi di Custodi e Lanterne, che per questo ti stanno spesso contro, e i neutrali Bubalus, Statera, Residuo, Gymnasiarch, Contromano e Tourniquet. I sessanta personaggi dei Mille Soli e delle Marche di Arcadia (P232-P291) restano fuori: non sono nei pacchetti (WORLD §5), e le carte da cercare devono esserci. Le quattro carte con sblocco a livello (Nadir, Nimbus, Tempestas, Novissima) restano fuori anche dalle squadre. Restano libere per la Stagione 4, tra le altre, Kelvin, Maroon, Parallasse, Refector, Subpoena, Penates, Normal e gli Omega Ordito, Ansa e Prosody |
| Nicola | Esce di cella con la scorta e collabora; a fine stagione resta in custodia del Comune |
| Ottavia | Alleata; fa da scorta al fratello |
| Holdout | Parla una volta sola, nel finale |
| Mongibello | Nel finale lascia andare l'eruzione, piano, nel cratere; la sua carta non cambia |
| Personaggi nuovi fuori dalle carte | Nessuno |
| Monete delle stelle | 30 monete a stella nei capitoli 13-16 e 40 nei capitoli 17-18: 3.000 monete per le 90 stelle della stagione, cioè 20 pacchetti a 150 monete. Le stelle hanno pagato 1.200 monete nella Stagione 1 (10 e 20 a stella) e 2.400 nella Stagione 2 (20 e 30). La formula di partenza (`balance.ts` `story`, SPEC §5.11) darebbe 40 e 50, cioè 3.900: troppo per un salto solo, perché il prezzo dei pacchetti non cresce con la storia. Ogni capitolo mette quindi `star_coins` nelle sue missioni invece di lasciare il valore della formula; gli admin possono cambiarle da `/gestione-storia` |
| Difficoltà dei capitoli | Decisa dall'utente il 22 novembre 2026: dal Capitolo 3 (capitolo 15) la discesa si ferma. Fino al Capitolo 2 ogni missione era tarata due o tre punti più dura della corrispondente del capitolo prima, e il Capitolo 2 è arrivato a circa 46%, 20%, 23%, 5,5% e 3,5% con la squadra casuale (SPEC §5.11): continuando così, i capitoli 15-18 sarebbero finiti vicino allo zero. I Capitoli 3-6 si tarano sugli stessi bersagli del Capitolo 2, con la prima missione sempre la più facile del capitolo e il boss sempre la più dura. Il Capitolo 3 è arrivato a circa 46%, 20%, 23%, 5,4% e 3,3%, il Capitolo 4 a circa 46%, 21%, 23%, 5,6% e 3,6% |
| Nel database | Fatto con il Capitolo 1 (migrazione `20261121200000_season_three_chapter_one_story.sql`, capitolo 13, missioni C13M1-C13M5), senza cambiare il codice: stagioni, sblocco a cavallo di stagione («Completa la Stagione 2 per sbloccarlo»), messaggio di fine stagione, stelle della stagione e monete delle stelle funzionavano già per una stagione nuova. La Stagione 3 è in `story_seasons` (*La montagna*, con il messaggio «Il prossimo capitolo della Stagione 3, La montagna, arriva presto.»), quello della Stagione 2 ora dice «Hai finito la Stagione 2, La marea. Ti aspetta la Stagione 3, La montagna.», e ogni missione ha rarità e tratti delle stelle e 30 monete a stella. Il Capitolo 2 (migrazione `20261121270000_season_three_chapter_two_story.sql`, capitolo 14, missioni C14M1-C14M5) aggiunge solo capitolo e missioni: il messaggio della Stagione 3 resta «Il prossimo capitolo della Stagione 3, La montagna, arriva presto.». Così anche il Capitolo 3 (migrazione `20261122100000_season_three_chapter_three_story.sql`, capitolo 15, missioni C15M1-C15M5) e il Capitolo 4 (migrazione `20261122210000_season_three_chapter_four_story.sql`, capitolo 16, missioni C16M1-C16M5). `supabase/tests/story.test.sql` controlla sedici capitoli e `story_stars.test.sql` le monete della Stagione 3. Il Capitolo 6 chiude la stagione: «Hai finito la Stagione 3, La montagna. La prossima stagione arriva presto.» |
| Albi | Uno per capitolo; *Il turno di notte* (Capitolo 4) e *Tifeo* (Capitolo 6) sono i due principali. Da aggiungere a WORLD §7 quando si scrivono |

## 8. Regole di scrittura della storia

- **Una sola cosa strana per capitolo.** Ogni capitolo introduce un solo elemento fuori dal normale (la sua "cosa strana", §5.1, §6.5, §7.5); il resto è cronaca di quartiere: furti, debiti, ricatti, sfratti, guasti. Le carte bizzarre (una muffa che cammina, un cane a tre teste) si presentano come fatti normali per chi vive a Nuova Megara, senza aggiungere altre stranezze attorno.
- **Una minaccia grande per stagione.** Re Tifeo, Cariddi e Aion (§5.3) arrivano uno per stagione, mai insieme: la Stagione 2 usa Cariddi, la Stagione 3 Re Tifeo, e Aion resta per dopo. Ogni stagione si apre da un gancio lasciato dalla precedente.
- **La posta in gioco si dice sempre.** Ogni introduzione dice cosa succede se perdi: un palazzo che si crepa, un debito, una persona portata via.
- **Il motivo è anche tuo.** Le scosse colpiscono le Fosse, dove abiti: ogni capitolo dovrebbe ricordarlo almeno una volta.
- **Spiegare, non accennare.** Il finale di capitolo dice in parole semplici cosa hai scoperto. Il mistero sta in cosa succederà, non in cosa è appena successo.
- **Introduzione di capitolo:** al massimo tre frasi. Dice dove sei, cosa non torna e cosa rischi.
- **Introduzione di missione:** due frasi, circa 30 parole: la situazione e cosa rischi. La pagina Storia le mostra intere sotto il titolo.
- **Titoli:** brevi. Quelli dei capitoli si leggono in grande e in maiuscolo; quelli delle missioni, se lunghi, vengono tagliati nell'elenco chiuso: meglio restare sotto i 20 caratteri.
- **Testo finale di capitolo:** la rivelazione e il gancio, in quattro frasi al massimo. Sta in `story_chapters.outro`: il server lo manda solo a chi ha completato tutte le missioni del capitolo, e la pagina Storia lo mostra sotto l'elenco come "Com'è finita".
- **Una carta da cercare:** ogni capitolo presenta 2-3 carte, nominate nei testi, che si trovano nei pacchetti.
- **Il tono:** avventura ironica. Anche nel momento più cupo qualcuno pensa alle bollette.
- **Nessuna regola nuova:** se una scena ha bisogno di una regola che il gioco non ha, si cambia la scena.
- **Le lastre:** in partita si affrontano Echi, non persone (§4). Le persone vere agiscono nelle scene.

## 9. Decisioni aperte

Generali e della Stagione 1; quelle della Stagione 2 sono in §6.9, quelle della Stagione 3 in §7.9. Valgono i default finché non si decide altrimenti.

| Decisione | Default |
|---|---|
| Il segreto (§2) | L'Ora Zero è un'esplosione ferma a metà, tenuta da Holdout; le lettere sono il sigillo |
| Nomi di Renata, Ottavia, Nicola e Spanò | Segnaposto, da verificare prima di pubblicare |
| Il quartiere del giocatore | Le Fosse, segnaposto |
| Aion | Fuori dalla Stagione 1 |
| Effigy tra i Figli dell'Ultima | Sì, anche nel catalogo (gruppo Figli dell'Ultima) |
| Premi dei capitoli | La carta del boss, come nel Capitolo 1: cinque Alfa e un Beta in sei capitoli. Da verificare con l'economia (SPEC §8) |
| Lettere e rarità | Le lettere della storia non sono rarità; un'eventuale rarità nuova userà Θ |
| Testo finale di capitolo | Fatto: `story_chapters.outro`, mostrato nella pagina Storia. Non compare ancora nella schermata di fine partita |
| Albi | Un albo per capitolo: racconta il prologo e la rivelazione finale; le missioni restano nelle introduzioni |
