# STORY — La trama di O-MEGA

*Bozza v0.2. La trama madre da cui nascono capitoli, missioni, albi e testi delle carte. Il mondo è in `docs/WORLD.md`, le regole in `docs/SPEC.md`: la storia le spiega e le usa, non le cambia.*

*v0.2: il segreto è diventato concreto. L'Ora Zero è un'esplosione ferma a metà sotto la città, tenuta da un uomo; prima era una frase scritta dal tempio, troppo astratta per chi gioca. Aion e i "due futuri" sono usciti dalla Stagione 1, e i testi già pubblicati dei Capitoli 1-4 sono stati ripassati di conseguenza (migrazione `20261111230000_grounded_story_texts.sql`).*

---

## 1. Come si usa questo file

- Ogni capitolo della modalità Storia (SPEC §5.11) è anche un albo da leggere (WORLD §7): stessa trama, due formati.
- Si scrive dall'alto verso il basso: il segreto (§2), chi vuole cosa (§3), il cast (§4), l'arco (§5), le schede dei capitoli (§6). Un testo di missione che contraddice un livello più alto va corretto, non affiancato.
- Il giocatore scopre le cose nell'ordine della mappa delle rivelazioni (§7). Un testo non anticipa niente che la mappa non abbia già concesso.
- Prima di scrivere, rileggere le regole di §8: una sola cosa strana per capitolo, la posta in gioco sempre detta.
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

Da tenere aggiornato capitolo per capitolo.

| Lettere | A inizio serie | A fine Stagione 1 |
|---|---|---|
| Α Β Γ Δ | Al Comune, trovate nei primi scavi. Danno il nome alle classi delle lastre (WORLD §3) | Al Comune |
| Ε | Nel caveau della Compagnia Lete | Al Banco, usata come stampo per le lettere false |
| Ζ | Nel petto di Xenolith | Nel petto di Xenolith, nascosto dalle Lanterne |
| Η | Mai trovata | Ne esiste solo una falsa, colata dal Banco |
| Θ | Nel vulcano | Al Banco, che la mette all'asta |
| Ι … Ψ | Sepolte | Sepolte. Nicola sa dove sono; i Figli ne hanno alcune |
| Ω | Nella camera del tempio, tra le mani di Holdout: è la chiave di volta. Il Comune ne conosce solo il nome, che usa per la classe più rara | Tra le mani di Holdout |

Le lettere della storia non sono rarità nuove. Se un'espansione aggiungerà una rarità (WORLD §3), prenderà il nome di una lettera già trovata nella storia: la candidata è Θ.

## 3. Chi vuole cosa

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

## 6. I capitoli

Squadre avversarie, Minacce e difficoltà si tarano con la simulazione, come nel Capitolo 1 (SPEC §5.11). Le carte indicate per ogni missione sono il cuore della squadra, non la squadra intera. **La cosa strana** di ogni capitolo è l'unico elemento fuori dal normale che il capitolo introduce (§8).

### Capitolo 1 — Il porto

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

### Capitolo 2 — Il sismografo

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

### Capitolo 3 — Undici piani

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

### Capitolo 4 — Multitude

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

### Capitolo 5 — La porta

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

### Capitolo 6 — Mongibello

*Atto III, finale di stagione. Albo* Mongibello. *Da costruire.*

- **In una riga:** i Figli dell'Ultima svegliano il vulcano per far cedere Holdout, e l'unico che può fermare l'eruzione non sa combattere.
- **La cosa strana:** Mongibello, che trattiene un'eruzione dentro di sé.
- **Luogo:** i quartieri alti evacuati, la strada che sale, il cratere.
- **Avversari:** i Figli dell'Ultima al completo, con Ottavia come loro Reggente. Per una volta la Compagnia sta dalla tua parte: se l'esplosione finisce, la centrale finisce con lei.
- **Conflitto interno:** Vera Kross vuole il botto e basta; Antiphon comincia a dubitare che torni qualcuno; Effigy ha un'idea più semplice: Holdout non può morire, ma può diventare pietra, e la pietra non trattiene niente.
- **Carte presentate:** Mongibello, Effigy, Carillon.
- **Boss:** Effigy, schierata da Ottavia. Nel catalogo Effigy non ha un gruppo: qui la mettiamo tra i Figli dell'Ultima (solo nella storia, niente cambia nel database).
- **Rivelazione:** Mongibello sale sul cratere e trattiene l'eruzione dentro di sé; Holdout regge. Sul cratere Ottavia incontra finalmente il capo dei Figli: è Nicola, suo fratello, vivo, con un Segno che gli fa sentire dove sono le lettere. Le chiede di restare: quando l'esplosione finirà, dice, torneranno tutti. Lei rifiuta, e lui sparisce.
- **Gancio di stagione:** la Θ è uscita dal cratere con l'eruzione mancata, e il dottor Spanò l'ha già presa: *"L'asta si apre a mezzanotte."*

| # | Missione | Situazione | Carte principali |
|---|---|---|---|
| 1 | Evacuazione | I Figli appiccano fuochi per rallentare i soccorsi | Kiln, Cineris, Quicklime |
| 2 | Le campane | Carillon suona per avvertire la città e i Figli vogliono farla tacere | Belladonna, Tacet, Lullaby |
| 3 | La strada che sale | La banda di Rubicon, pagata dai Figli, blocca l'unica strada che sale | Rubicon, Falx, Odonate |
| 4 | Chi trova, di nuovo | Vera Kross cerca Mongibello per impedirgli di salire | Vera Kross, Antiphon, Patina |
| 5 | Lo sguardo | Sul cratere Ottavia schiera Effigy | Effigy, Kiln, Credo |

## 7. Mappa delle rivelazioni

| Dopo il capitolo | Il giocatore sa | Ancora nascosto |
|---|---|---|
| 1 | Esistono altre lettere; la Compagnia le compra, il Banco se le prende; quando una si muove, le Fosse tremano | Cosa sono le lettere |
| 2 | Ogni lettera smossa fa tremare la città e indica la successiva; i Figli sanno dove scavare e vogliono che la città tremi di più | Perché lo vogliono; chi li guida |
| 3 | Il Banco falsifica le lettere con le lastre fuse, e quelle false fanno danni; la centrale accanto al tempio non è un caso | Cosa c'è nel tempio |
| 4 | L'Ora Zero è un'esplosione ferma a metà sotto la città; Renata ne è responsabile; Ottavia cerca il fratello | Chi la tiene ferma; cosa succede se riparte |
| 5 | Holdout tiene la chiave di volta; se cede, la città salta; le lettere sono il sigillo; i Figli vogliono allentarlo e svegliare il vulcano, e Ottavia è con loro | Chi guida i Figli |
| 6 | Il capo dei Figli è Nicola, il fratello di Ottavia | Come si richiude il sigillo; perché la Compagnia trivellò sapendo |

## 8. Regole di scrittura della storia

- **Una sola cosa strana per capitolo.** Ogni capitolo introduce un solo elemento fuori dal normale (la sua "cosa strana", §6); il resto è cronaca di quartiere: furti, debiti, ricatti, sfratti, guasti. Le carte bizzarre (una muffa che cammina, un cane a tre teste) si presentano come fatti normali per chi vive a Nuova Megara, senza aggiungere altre stranezze attorno.
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

## 9. Dopo la Stagione 1

Ganci già aperti, da non chiudere prima del tempo. Una minaccia alla volta.

- **L'asta:** il Banco mette all'asta la Θ, e offrono in tre: la Compagnia, i Figli e il Comune.
- **Nicola:** il capo dei Figli è libero e sa dove sono le altre lettere.
- **Chiudere il sigillo:** spegnerebbe l'esplosione per sempre, ma anche il Rintocco e gli Echi nuovi. Chi lo vuole davvero?
- **La prova:** la Compagnia trivellò sapendo cosa c'era sotto, e Auctor sa come.
- **Absentia:** Ottavia credeva che il fratello fosse lì dentro. Allora chi muove l'armatura vuota?
- **Più avanti:** Re Tifeo sotto il vulcano, Cariddi nel porto, Aion. Uno per stagione, non tutti insieme.

## 10. Decisioni aperte

Valgono i default finché non si decide altrimenti.

| Decisione | Default |
|---|---|
| Il segreto (§2) | L'Ora Zero è un'esplosione ferma a metà, tenuta da Holdout; le lettere sono il sigillo |
| Nomi di Renata, Ottavia, Nicola e Spanò | Segnaposto, da verificare prima di pubblicare |
| Il quartiere del giocatore | Le Fosse, segnaposto |
| Aion | Fuori dalla Stagione 1 |
| Effigy tra i Figli dell'Ultima | Sì, solo nella storia |
| Premi dei capitoli | La carta del boss, come nel Capitolo 1: cinque Alfa e un Beta in sei capitoli. Da verificare con l'economia (SPEC §8) |
| Lettere e rarità | Le lettere della storia non sono rarità; un'eventuale rarità nuova userà Θ |
| Testo finale di capitolo | Fatto: `story_chapters.outro`, mostrato nella pagina Storia. Non compare ancora nella schermata di fine partita |
| Albi | Un albo per capitolo: racconta il prologo e la rivelazione finale; le missioni restano nelle introduzioni |
