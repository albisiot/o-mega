# Scontro a squadre (5 contro 5) — progetto

*Nome provvisorio. In progettazione: non è ancora giocabile. Il riassunto è in `docs/SPEC.md` §5.19.*

## Da dove viene

Il 24 novembre 2026 l'utente ha portato un documento di progetto, «COMBAT SYSTEM – Game Design & Technical Design Document»: un combattimento a squadre 5 contro 5 con le carte della collezione, 4 mosse per personaggio, barre del turno e combattimento automatico, ispirato a Marvel Strike Force. Una sessione di analisi l'ha confrontato con il catalogo reale e con un simulatore; poi l'utente ha deciso i punti qui sotto.

Questo file prende il posto dei sei `COMBAT_*.md` proposti dal documento: progetto, decisioni, formule, simulazioni e piano dei test stanno qui; la storia delle modifiche resta nei commit e, quando ci sarà qualcosa da giocare, nelle note di versione.

## Decisioni

**Dal documento, approvate dall'utente:** squadre di 5 personaggi, scontro 5 contro 5, prima e seconda linea, le 12 abilità come base dei numeri, sistema ibrido (valori + mosse), 4 mosse per personaggio tutte personalizzate, combattimento manuale, automatico e automatico tattico con lo stesso motore, ordine delle azioni dato dalla velocità, personaggi della collezione.

**Dell'utente, dopo l'analisi (24 novembre 2026):**

| Decisione | Scelta |
|---|---|
| Posto nel gioco | **Modalità a parte**, senza carte in palio: la partita (§5), la Conquista (§6) e le altre modalità non cambiano |
| Rarità | **Alla pari**: nello Scontro la rarità è solo collezione (diverso da §4.3, dove la carta più rara è più forte) |
| Identità | Il **campo di battaglia è una Minaccia** di Nuova Megara e i **danni sono delle 4 famiglie** (Corpo, Mente, Potere, Mestiere), per staccarsi da Marvel Strike Force |
| Mosse | **Un kit per ogni personaggio**, tutti i 351, a gruppi, ognuno simulato sulla sua carta e approvato dall'utente. Il Potere del minigioco non cambia |
| Prima prova | 10 personaggi veri del catalogo, non i 9 inventati del documento (valore consigliato, non chiesto) |

**Correzioni al documento:**

| Documento | Qui | Perché |
|---|---|---|
| 217 personaggi, 868 abilità | 351 personaggi (227 nei pacchetti), 1.404 mosse | Il catalogo è cresciuto (P218-P351) |
| COM = Competenza, INT = Intelligenza | COM = **Combattimento**, INT = **Intelletto** | I nomi ufficiali (§4.3) |
| «Fazione Delta» | Delta è la **rarità**; la fazione è Eroi, Cattivi o Neutrali; il gruppo è un tratto (§4.7) | |
| «Abilità» = le 4 mosse | **Mosse**; le abilità sono le 12 statistiche e il **Potere** è il passivo del minigioco | Evitare due significati della stessa parola |
| Vita 100 + 20×RES + 5×VOL | 260 + 6×RES + 3×VOL | Con il documento un punto di RES valeva 2-3 volte gli altri (simulazione) |
| Velocità 100 + 6×VEL, barra a 0 | 100 + VEL, barra che parte in un punto a caso | Con la barra a 0 chi agiva per primo vinceva il 71% degli specchi e un punto di VEL valeva più di ogni altra abilità: anche a 1 per punto, finché la partenza era uguale per tutti |
| 5 tipi di danno (fisico, energetico, magico, psichico, tecnologico) | Le 4 famiglie, difese con la stessa famiglia | Identità di O-MEGA, e ogni abilità difende qualcosa |
| Precisione con −0,6×VEL del bersaglio | Senza VEL | VEL faceva già troppo |
| Nessuna regola per la rarità | Valori avvicinati ai 54 punti della Delta, per il 60% | Scelta «alla pari»: fino in fondo le carte rare diventavano più deboli |
| Infiltrazione e Penetrazione | Solo Infiltrazione | Le due avevano lo stesso effetto |
| Danno minimo, eliminazione simultanea non definiti | Minimo 1; simultanea = pareggio | |

## Le regole, versione 0

I numeri sono in `src/config/balance.ts` (`combat`); il motore li riceve come `CombatRules`. Fra parentesi la chiave.

### Squadra e schieramento

- 5 personaggi diversi (`definition_id` tutti diversi, come §5.2), presi dalla collezione. Nessun livello, nessun potenziamento, nessun doppione usato (D03-D06 del documento).
- Due posti in **prima linea** (F1, F2) e tre in **seconda linea** (R1, R2, R3). Qualsiasi personaggio va in qualsiasi posto; nessun movimento durante lo scontro.
- **Adiacenze:** F1 con F2, R1, R2; F2 con F1, R2, R3; R1 con F1, R2; R2 con F1, F2, R1, R3; R3 con F2, R2. Il posto di chi cade resta vuoto.

### Valori di combattimento

Le 12 abilità della carta non cambiano mai; lo Scontro ne ricava i suoi valori.

- **Rarità alla pari:** ogni abilità si avvicina ai 54 punti della Delta (`referenceBudget`; il budget della carta è in `rarity_definitions.ability_budget`) per il 60% della differenza (`rarityScalePercent`): Delta ×1, Gamma ×0,989, Beta ×0,968, Alfa ×0,959, Omega ×0,931. Fino in fondo (×54/budget) le carte rare perdevano: i loro punti in più stanno sui picchi, che fanno la Potenza (Omega su Alfa 34%). Arrotondamenti solo alla fine dei calcoli.
- **Vita** = 260 + 6×RES + 3×VOL (`vita`), da 260 a 350.
- **Velocità** = 100 + VEL (`speed`), da 100 a 110.
- **Potenza** di una mossa = 20 + 8 × Σ(abilità × peso) (`power`); i pesi di una mossa sommano a 1, così usare più abilità non rende una mossa più forte.
- **Difesa** contro una famiglia = somma delle 3 abilità del bersaglio in quella famiglia × il coefficiente della famiglia (`familyDefense`: Corpo 3,37, Mente 2,65, Potere 5,03, Mestiere 4,10). I coefficienti portano la difesa media del catalogo a 50 in ogni famiglia, così nessuna famiglia di danno è svantaggiata in partenza.
- **Precisione** = 85 + PER dell'attaccante − 0,5×FUR del bersaglio, tra 70% e 97% (`hit`).
- **Critico** = 5 + FUR + 0,5×PER, in percentuale, al massimo 28%; un critico fa ×1,5 (`crit`).

### Turni

- Ogni personaggio ha una **barra del turno** da 1000 (`turnMeter`) che si riempie alla sua Velocità; all'inizio parte in un punto a caso, tra 0 e 1000 (`startMeterMaxPercent` 100, estratto dal server con il seme della battaglia): il primo giro non premia sempre il più veloce.
- Il motore non scorre il tempo a passi: calcola chi arriva prima a 1000, porta avanti tutte le barre di quel tempo, e quel personaggio agisce; gli toglie 1000 e l'eccedenza resta.
- **Parità:** prima la Velocità più alta, poi il lato estratto all'inizio della battaglia, poi l'ordine dei posti (F1, F2, R1, R2, R3).
- Ogni turno di un personaggio è un suo **turno personale** (contano anche quelli persi, dalla tappa 2).

### Mosse

Ogni personaggio avrà 4 mosse: **base**, **speciale**, **suprema** e una **passiva** (dalla tappa 2). I nomi da mostrare ai giocatori sono da decidere, nella voce di Nuova Megara.

- **Base:** sempre disponibile, +2 Carica.
- **Speciale:** ha un tempo di ricarica in turni personali (usata al turno 1 con ricarica 3, torna al turno 4); disponibile dall'inizio; +1 Carica.
- **Suprema:** costa tutta la Carica (6).
- **Carica:** parte da 2, al massimo 6, mai sotto 0 (`charge`). È una risorsa del personaggio, diversa dall'abilità Energia.

Una mossa è un dato, non codice (`CombatMove`): nome, posto, pesi delle abilità, famiglia del danno (di solito quella dell'abilità che pesa di più), portata (corpo a corpo, distanza, infiltrazione), bersaglio (un nemico, un nemico e i suoi adiacenti, tutti i nemici, sé, un alleato, tutti gli alleati), effetti (danno, cura, scudo, con il loro moltiplicatore e su chi) e ricarica. Il motore controlla ogni mossa (`validateCombatMove`): pesi a somma 1, abilità esistenti, moltiplicatori positivi, effetti coerenti con il bersaglio. Mai codice eseguibile preso dal database.

Intervalli dei moltiplicatori (dal documento, da verificare con le simulazioni): base singola 0,85-1,10; speciale singola 1,20-1,60; speciale con adiacenti 1,10-1,40 sul bersaglio e circa 0,3 di quello sugli adiacenti; speciale ad area 0,45-0,65; suprema singola 1,70-2,20; suprema ad area 0,70-0,95; cura singola 0,80-1,30; cura di squadra 0,40-0,75.

### Bersagli e copertura

- Finché in prima linea c'è almeno un personaggio vivo, la seconda linea è **protetta**: un **corpo a corpo** non la sceglie come bersaglio; a **distanza** e ad **area** la colpiscono a ×0,8 (`coverPercent`); l'**infiltrazione** la colpisce piena.
- Gli adiacenti di una mossa con adiacenti si colpiscono anche in seconda linea, con la stessa copertura.
- La copertura si fotografa all'inizio della mossa: l'ordine in cui cadono i bersagli di un colpo ad area non cambia il danno degli altri.

### Danno, cure, scudi

- **Danno** = Potenza × moltiplicatore × 100 / (100 + difesa) × copertura × critico, arrotondato alla fine, almeno 1 (il campo è già nella Potenza). Ogni bersaglio ha i suoi tiri (prima colpito o mancato, poi critico), nell'ordine: bersaglio principale, poi gli altri per posto.
- Lo **scudo** assorbe il danno prima della Vita. Uno scudo vale Potenza × moltiplicatore, e lo scudo di un personaggio non supera il 30% della sua Vita (`shieldMaxPercent`).
- Una **cura** vale Potenza × moltiplicatore e non supera la Vita mancante. Chi cade non si cura e non torna in gioco.

### Campo di battaglia

Ogni Scontro si gioca su una **Minaccia normale di Nuova Megara** (niente luoghi, rare o modificatori nella prima versione), visibile prima di scegliere la squadra. Le mosse che usano le abilità richieste dalla Minaccia hanno fino a +20% di Potenza (`fieldBonusPercent`), in proporzione al peso di quelle abilità nella mossa: una mossa FOR 70% e COM 30% su un campo «FOR + TEC» ha +14%.

### Fine dello scontro

- Vince chi elimina tutta la squadra avversaria. Se cadono insieme le due squadre, è pareggio.
- Dopo 100 azioni (`maxActions`): vince chi ha più personaggi in piedi; a parità la percentuale di Vita rimasta della squadra (scudi esclusi); a parità ancora, pareggio.

### Registro

Ogni scontro ha un **seme** e un registro di eventi: inizio, turno, mossa, mancato, danno (con critico e scudo assorbito), cura, scudo, caduto, fine. Stesso seme, stesse squadre, stessa versione delle regole e stesse scelte danno lo stesso registro. Il **replay** è il registro salvato, non una nuova simulazione: un cambio di regole non rovina gli scontri vecchi.

## Chi decide

- Il motore è puro e deterministico, in `packages/game-engine/src/combat.ts` e `combat-ai.ts`, con il resto delle regole: lo usano i test, il simulatore e (dalla tappa 4) l'Edge Function.
- **Automatico e tattico:** una chiamata all'Edge Function gioca tutto lo scontro, salva il registro e paga i premi; il telefono riproduce il registro.
- **Manuale contro il computer:** una chiamata per ogni mossa del giocatore; il seme resta sul server, altrimenti il telefono potrebbe prevedere colpi e critici.
- **Allenamento senza premi:** può girare tutto nel browser.
- **Sfide fra giocatori:** asincrone, contro squadre in difesa salvate; niente sfide dal vivo turno per turno.
- L'IA (`chooseCombatAction`) sceglie solo tra le mosse permesse, con i valori attesi, senza conoscere i tiri. Nella tappa 1 è avida: il danno atteso (mai più di quanto resta al bersaglio), 150 punti per un probabile KO, le cure che servono e gli scudi che ci stanno (a 0,7). In parità preferisce la suprema, poi la speciale. Strategie, priorità e ordini tattici arrivano nella tappa 2.
- Per le simulazioni (e per i personaggi del computer) la formazione mette in prima linea i due con più Vita (`autoCombatFormation`).

## Simulatore

`node scripts/simulate-combat.mts <dump.json>`, con il catalogo di `scripts/emergency-catalog.sql`. Gioca scontri automatici con kit generici (finché non ci sono i kit veri: base, speciale e suprema ad area sulle due abilità migliori del personaggio) e misura:

- **durata:** azioni per scontro, scontri arrivati al limite, errori;
- **valore di un punto:** squadre identiche, un punto in più in un'abilità a tutti e cinque i personaggi di un lato (lati scambiati);
- **rarità:** squadre di una rarità contro quella sotto;
- **carte:** vittorie di ogni personaggio in squadre a caso, e il legame con ogni abilità;
- **campo:** quanto conta avere punti nelle abilità della Minaccia;
- **ripetibilità:** lo stesso scontro due volte con lo stesso seme.

I risultati sono nella sezione seguente, aggiornati a ogni taratura.

## Risultati delle simulazioni

Vedi «Risultati della tappa 1» in fondo.

## Decisioni aperte

| Decisione | Valore usato finché non si decide |
|---|---|
| Nome della modalità e delle mosse | «Scontro a squadre»; nel codice base, special, supreme, passive |
| Effetti di stato (tappa 2) | 8 effetti nella prima versione, con resistenza della famiglia dell'effetto |
| Passive | Una per personaggio; una passiva identica al massimo su un Eroe, un Cattivo e un Neutrale, come i Poteri |
| Sinergie | Solo dentro le mosse; nessun bonus automatico di fazione o di gruppo |
| Danni nel tempo contro gli scudi | Uno solo, che passa sopra gli scudi |
| Stordimento continuo | Immunità per un turno dopo uno stordimento |
| Premi | Monete ed esperienza piccole contro il computer; nessuna carta |
| Regole dei luoghi sul campo | Non nella prima versione |

## Tappe

| Tappa | Contenuto | Dipende da | Finita quando |
|---|---|---|---|
| 1 | Motore (valori, turni, bersagli, copertura, Carica, ricarica, danno, cure, scudi, fine, registro), IA avida, simulatore | Decisioni del 24 novembre | Test superati; 10.000 scontri senza errori; stesso seme = stesso registro; valore di un punto e rarità misurati e vicini all'obiettivo |
| 2 | Effetti di stato, passive, IA con strategie e ordini tattici | 1 | Le mosse sbagliate sono rifiutate; l'IA fa solo mosse permesse; strategie diverse danno risultati misurabilmente diversi |
| 3 | 10 personaggi veri con il loro kit; pagina di prova in locale (manuale e automatico, registro, replay) | 2 | Uno scontro si gioca su iPhone in 2-4 minuti; `npm run test:layout` senza testi coperti |
| 4 | Tabelle, Edge Function, scontri contro il computer con premi, editor delle mosse solo per gli admin | 3 | Test del database: proprietà delle carte, seme nascosto, `not_admin`; nessun risultato deciso dal telefono |
| 5 | Kit per tutti i personaggi, a gruppi di 20-30 | 2, 4 | Ogni gruppo simulato sulla sua carta e approvato dall'utente |
| 6 | Sfide asincrone, classifiche, obiettivi | 4, 5 | |

## Piano dei test

- **Valori:** abilità da 0 a 10, riduzione per rarità, Vita, Velocità, difese per famiglia, limiti di precisione e critico, Potenza con pesi e campo, danno con l'esempio di Gantry, danno minimo, arrotondamenti.
- **Scontro:** ordine dei turni e parità, eccedenza della barra, corpo a corpo e seconda linea protetta, copertura a distanza e ad area, infiltrazione, adiacenti, Carica, ricarica della speciale, suprema, scudi prima della Vita e loro limite, cure fino alla Vita mancante, chi cade non agisce e non si sceglie, vittoria, limite di azioni e spareggi, mosse non permesse rifiutate.
- **IA:** solo mosse permesse, scontri completi senza errori.
- **Ripetibilità:** stesso seme e stesse scelte, stesso registro.
- Dalla tappa 2: effetti, passive e cicli di passive; dalla tappa 4: test SQL del database.

## Originalità rispetto a Marvel Strike Force

Il documento parte da Marvel Strike Force: squadre da 5, barra del turno, base, speciale, suprema e passiva con l'energia, e un elenco di effetti molto vicino al suo. Per restare O-MEGA:

- le due linee con la copertura (Marvel Strike Force non ha linee);
- il campo di battaglia è una Minaccia di Nuova Megara, con le sue abilità richieste;
- i danni sono le 4 famiglie delle abilità;
- da decidere: nomi delle mosse e degli effetti nella voce di Nuova Megara (non traduzioni) e il racconto dello scontro nelle tavole a fumetti del gioco;
- gli ordini tattici programmati prima dello scontro come tratto distintivo.

## Risultati della tappa 1

24 novembre 2026, numeri v0.1 di `balance.ts`, 351 personaggi, kit generici, nessun effetto né passiva, campo pescato tra le Minacce normali di Nuova Megara di livello 2-4: `node scripts/simulate-combat.mts <dump> --battles 10000 --pairs 2000`. La colonna «Documento» viene dal simulatore grezzo dell'analisi, con le formule del documento.

| Misura | Documento | v0.1 |
|---|---|---|
| Un punto di VEL in più a tutti e cinque | 76% | 55% |
| Un punto di RES in più | 65% | 56% |
| Un punto nelle altre abilità | 49-55% | 51-56% |
| Ogni rarità contro quella sotto | 50-60% | 45-57% |
| Omega contro Delta | 69% | 57% |
| Carte (dal 5% al 95%) | 35-65% | 38-58% |
| Legame tra rarità e vittorie di una carta | 0,05 | 0,11 |
| Azioni per scontro | 30 | 37 (32-42) |

- **10.000 scontri, nessun errore**, nessuno arrivato al limite di 100 azioni, nessun pareggio.
- **Ripetibilità:** 100 scontri su 100 identici rigiocati dallo stesso seme.
- **Valore di un punto:** FOR 51,6 · VEL 55,2 · RES 55,7 · INT 53,5 · VOL 54,1 · PER 56,1 · ENE 52,1 · MAG 51,7 · PSI 51,5 · COM 52,1 · TEC 52,2 · FUR 54,7. Le abilità che servono a tutti (Velocità, Resistenza, Percezione, Volontà, Furtività) pesano un po' più di quelle che contano solo per chi le usa nelle mosse: è anche un limite della misura, con i kit generici.
- **Rarità:** Gamma su Delta 54,1 · Beta su Gamma 49,1 · Alfa su Beta 56,6 · Omega su Alfa 44,9 · Omega su Delta 56,6.
- **Carte:** le vittorie seguono un po' RES, VOL e PER (+0,30) e calano con ENE (−0,27), TEC (−0,23), MAG e PSI (−0,17): con mosse generiche le carte di Potere e Tecnologia restano sotto la media. I kit veri (controllo, supporto, effetti della tappa 2) devono riportarle su.
- **Campo:** la squadra con almeno 5 punti in più nelle abilità della Minaccia vince il 56,0% (50,5% sugli stessi scontri senza campo): il campo conta, senza decidere.

**Come ci si è arrivati** (le prove intermedie):
- con la barra che partiva al massimo al 30%, un punto di VEL valeva il 61% con qualsiasi peso sulla Velocità (1, 1,5 o 2 per punto), e il 70% con la barra a 0 per tutti: contava arrivare primi, non quanto. Con la partenza in tutto il giro scende al 54-55%;
- con la riduzione delle rarità fino in fondo Omega batteva Alfa solo il 31-34% e Delta il 34-38%; al 50% Omega su Delta 53-60%, al 70% 47-52%; al 60% il miglior equilibrio tra i gradini;
- i gradini a zig-zag (Beta e Omega sotto) seguono la Velocità media delle rarità: Gamma 4,9, Delta 4,4, Alfa 4,5, Beta 3,7, Omega 3,2. Con la Velocità meno decisiva si sono stretti.

**Da tenere d'occhio nella tappa 2:** le carte di Potere e Tecnologia; il valore di un punto misurato su un personaggio alla volta (con i kit veri); la durata, che con cure, scudi ed effetti si allungherà.
