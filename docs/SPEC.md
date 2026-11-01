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
- circa **60 carte Minaccia** (gli scenari e nemici da sconfiggere durante la partita, gestiti dal server e non collezionabili), circa 10 per ciascun livello da 1 a 6, con testi ancora segnaposto.

Le carte personaggio appartengono a una **fazione** (es. Eroi / Cattivi / Neutrali, da definire). Nell'MVP la fazione è solo un'etichetta; gli eventuali effetti verranno decisi più avanti.

## 3. Account e profilo

- Login con **Google** tramite Supabase Auth.
- Profilo: nome utente (unico), avatar, livello, esperienza.
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

**Principio di bilanciamento: rarità ≠ potenza.**
- Tutte le carte hanno un **budget di abilità simile**: indicativamente **54 punti totali** (media 4,5 per abilità), con una tolleranza di ±3 tra rarità.
- I profili variano tra **specialisti** (pochi valori 9-10, molti 0-2) e **generalisti** (valori medi diffusi). Il sistema delle Minacce (§5.4) rende utili entrambi: gli specialisti dominano le Minacce di livello basso, i generalisti quelle di livello alto.
- Le carte rare non sono più forti ma più **caratteristiche**: profili più estremi e un Potere (§4.4).
- Una squadra di carte Delta ben scelta deve poter battere una squadra di Omega.

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

### 4.5 Doppioni

I doppioni restano istanze normali: si possono usare in partita e quindi rischiare in conquista. Il giocatore può anche **convertirli in monete** (valore per rarità in configurazione).

## 5. Il minigioco — Regolamento

### 5.1 Panoramica

Due giocatori si affrontano con una **squadra segreta di 5 personaggi** ciascuno. Il server prepara **5 Minacce**: all'inizio si conosce solo il loro **livello**, poi ne viene svelata una per round. Per ogni Minaccia, ciascun giocatore sceglie in segreto quale personaggio mandare. Vince il round chi ottiene il punteggio più alto. **Vince la partita chi conquista 3 round.**

### 5.2 Preparazione

1. Il giocatore sceglie la modalità: **Amichevole** (nessun trasferimento di carte) oppure **Conquista** (§6).
2. Sceglie una **squadra di 5 personaggi** tra le carte possedute. Le squadre si possono salvare come formazioni.
   - **Vietato schierare due copie dello stesso personaggio**: i 5 personaggi devono avere `definition_id` tutti diversi.
3. Matchmaking: avversario casuale, amico tramite codice, oppure bot (§5.9).

### 5.3 Inizio partita

- Le squadre restano **segrete**: un personaggio avversario diventa visibile solo quando viene giocato.
- Il server estrae **5 Minacce** e ne rivela soltanto la **sequenza dei livelli** (es. `2 · 5 · 1 · 3 · 6`). Le abilità richieste restano nascoste.
- Questa è l'unica informazione disponibile all'inizio: serve a pianificare dove impiegare specialisti e generalisti.

### 5.4 Le Minacce

Ogni Minaccia ha un **livello da 1 a 6**, che corrisponde al **numero di abilità richieste**:

| Livello | Abilità in gioco | Esempio |
|---|---|---|
| 1 | 1 | "Scippatore — VEL" |
| 2 | 2 | "Robot impazzito — FOR + TEC" |
| 3 | 3 | … |
| 4 | 4 | … |
| 5 | 5 | … |
| 6 | 6 | "Invasione dimensionale — sei abilità" |

- Le abilità richieste sono definite per ciascuna Minaccia del catalogo (non casuali), così ogni Minaccia ha un'identità narrativa.
- Alcune Minacce possono avere un modificatore (es. "la prima abilità conta doppio"). I modificatori sono opzionali nell'MVP.
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

- Il bot costruisce la propria squadra in modo coerente con la difficoltà (es. Facile con squadre casuali, Super Pro con squadre equilibrate).
- Le partite scelte contro un bot sono sempre **Amichevoli**: nessuna conquista di carte. L'unica eccezione è la Conquista dopo l'attesa (§6.5).
- Ricompense in monete contro bot: da definire con l'economia (§8).
- In futuro il matchmaking potrà inserire bot quando mancano avversari umani: in quel caso la difficoltà sarà scelta dal sistema in base al livello del giocatore.

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

- Se il giocatore vince, sceglie tra **copie nuove** delle carte del bot, e la carta scelta è bloccata 48 ore come ogni carta conquistata. Non c'è un limite giornaliero di carte vinte.
- Se il giocatore perde, il bot prende subito una carta idonea a caso, che **esce dal gioco**. Conta nel limite giornaliero di carte perse.
- Abbandonare o sparire conta come sconfitta, quindi la carta si perde comunque.
- La partita dà l'esperienza delle partite contro bot e conta nelle statistiche contro i bot.

## 7. Pacchetti

- **Un pacchetto gratuito al giorno**, che scade al reset (mezzanotte `Europe/Rome`) se non aperto.
- Pacchetto standard acquistabile con monete (default **150 monete**).
- RNG esclusivamente lato server; il risultato viene salvato prima di essere mostrato.
- Apertura animata: carte rivelate una alla volta, animazione speciale per Alfa e Omega.
- Le carte vengono inserite automaticamente nella collezione.

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

Ogni movimento passa da `coin_ledger`. **Nessun acquisto con denaro reale** nelle fasi 1-3.

Nota per il futuro: pacchetti a pagamento combinati con carte che si possono perdere in partita richiedono una verifica legale (normativa su loot box e gioco d'azzardo). L'orientamento è monetizzare solo con elementi cosmetici.

## 9. Collezione e album

- Album con tutte le carte del catalogo: possedute e mancanti (sagoma).
- Filtri per rarità, fazione e abilità; ordinamento.
- Dettaglio carta: abilità, potere, numero di copie, carte bloccate o protette.
- Conversione dei doppioni.
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
| `card_definitions` | id, name, faction, rarity_code (→ rarity_definitions), stats (jsonb: codice abilità → valore 0-10, 12 abilità), power_code, power_params, art_url, flavor |
| `ability_definitions` | code, name, family, icon, sort_order (le 12 abilità, rinominabili) |
| `card_instances` | id, definition_id, owner_id, acquired_at, acquired_via (pack/conquest/starter/trade), is_starter, locked_until |
| `card_transfers` | id, instance_id, from_user, to_user, reason, match_id, created_at |
| `pack_openings` | id, user_id, pack_type, is_daily, opened_at, card_instance_ids |
| `daily_claims` | user_id, day (data Europe/Rome), claimed |
| `coin_ledger` | id, user_id, amount (+/−), reason, ref_id, created_at |
| `threat_definitions` | id, name, level (1-6), required_abilities (array di codici, lunghezza = level), modifier_code, modifier_params, art_url, flavor |
| `formations` | id, user_id, name, card_instance_ids[5] |
| `matches` | id, mode (friendly/conquest/bot), bot_difficulty (easy/medium/hard/super_pro, solo bot), status, player_a, player_b, threat_ids[5] (nascosti ai client), threat_levels[5] (visibili), current_round, winner_id, created_at |
| `match_teams` | match_id, user_id, card_instance_ids[5] (istantanea della squadra) |
| `round_plays` | match_id, round, user_id, card_instance_id, score, auto_played |
| `match_rounds` | match_id, round, deadline_at, winner_id, resolved_at |
| `game_config` | chiave/valore dei parametri di bilanciamento |

Tutte le tabelle hanno RLS. Scritture solo tramite RPC: `claim_daily_pack`, `buy_pack`, `convert_duplicate`, `create_match`, `join_match`, `submit_play`, `resolve_round`, `claim_conquest_card`, `forfeit_match`.

## 11. Schermate principali

1. **Login** (Google).
2. **Home:** pacchetto del giorno, saldo monete, pulsante Gioca, missioni (in futuro).
3. **Apertura pacchetto** (animazione).
4. **Collezione / Album.**
5. **Formazioni:** scelta e salvataggio della squadra.
6. **Gioca:** scelta modalità → matchmaking / codice amico / bot.
7. **Partita:** sequenza dei livelli delle Minacce, Minaccia svelata, la propria squadra, i personaggi avversari già giocati, timer, scelta segreta, rivelazione, punteggio.
8. **Fine partita:** esito, monete, schermata di conquista (scelta della carta).
9. **Profilo:** statistiche e storico conquiste e perdite.
10. **Negozio:** pacchetti acquistabili con monete, probabilità visibili.

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
| Monete dalle partite (sostituisce §8) | Solo la Conquista paga: chi perde +10 monete, chi vince prende la carta (e +50 solo se nessuna carta è conquistabile); pareggio +10 a entrambi. Bot e amichevoli non pagano monete. Chi abbandona non guadagna nulla. |
| Premi di livello | Raggiungere il livello L paga una sola volta 30 + 10 × L monete (livello 2: 50, livello 3: 60), in qualsiasi modalità. Chi supera più livelli insieme li riceve tutti. |
| Codice amico | Solo amichevole: nessuno scambio di carte, nessuna moneta. La Conquista si gioca solo con avversario casuale. |
| Squadra in Conquista | Almeno 3 carte conquistabili (non starter). Se un personaggio è posseduto sia come starter sia come doppione, il giocatore sceglie quale copia schierare (di default la starter, protetta). |
| Sblocco Conquista | 5 partite completate o livello 3; le partite abbandonate non contano. |
| Personaggi sbloccabili | Alcune carte hanno un livello di sblocco: non escono da pacchetti e starter set, ogni giocatore ne riceve una copia a quel livello, legata all'account (mai conquistabile né convertibile). Elenco in `docs/WORLD.md`. |

### 13.2 Aperte (usare il default)

| # | Decisione | Default da usare |
|---|---|---|
| 1 | Nome dell'universo (mondo/città) | Deciso: Nuova Megara (`docs/WORLD.md`) |
| 2 | Composizione dei livelli delle Minacce in una partita | Regola di §5.4 |
| 3 | Valori di economia e limiti | Tabelle di §6.4 e §8 (provvisorie) |
| 4 | Effetti delle fazioni | Nessuno nell'MVP |
| 5 | Ricompense delle partite contro bot | Metà delle ricompense PvP, con tetto giornaliero separato |
