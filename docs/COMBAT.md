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
| Nessuna regola per la rarità | Valori avvicinati ai 54 punti della Delta, per l'80% | Scelta «alla pari»: fino in fondo le carte rare diventavano più deboli |
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

- **Rarità alla pari:** ogni abilità si avvicina ai 54 punti della Delta (`referenceBudget`; il budget della carta è in `rarity_definitions.ability_budget`) per l'80% della differenza (`rarityScalePercent`): Delta ×1, Gamma ×0,985, Beta ×0,958, Alfa ×0,945, Omega ×0,908. Fino in fondo (×54/budget) le carte rare perdevano: i loro punti in più stanno sui picchi, che fanno la Potenza (Omega su Alfa 34% nella tappa 1, 40% nella tappa 2). Era il 60% nella tappa 1; con effetti e passive Omega batteva Delta il 64%, e all'80% torna al 59%. Arrotondamenti solo alla fine dei calcoli.
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
- Ogni turno di un personaggio è un suo **turno personale**, anche quando lo perde per uno stordimento: un turno perso conta anche come azione per il limite.

### Mosse

Ogni personaggio avrà 4 mosse: **base**, **speciale**, **suprema** e una **passiva**. I nomi da mostrare ai giocatori sono da decidere, nella voce di Nuova Megara.

- **Base:** sempre disponibile, +2 Carica.
- **Speciale:** ha un tempo di ricarica in turni personali (usata al turno 1 con ricarica 3, torna al turno 4); disponibile dall'inizio; +1 Carica.
- **Suprema:** costa tutta la Carica (6).
- **Carica:** parte da 2, al massimo 6, mai sotto 0 (`charge`). È una risorsa del personaggio, diversa dall'abilità Energia.

Una mossa è un dato, non codice (`CombatMove`): nome, posto, pesi delle abilità, famiglia del danno (di solito quella dell'abilità che pesa di più), portata (corpo a corpo, distanza, infiltrazione), bersaglio (un nemico, un nemico e i suoi adiacenti, tutti i nemici, sé, un alleato, tutti gli alleati), effetti (danno, cura, scudo, effetto di stato, ognuno con il suo moltiplicatore o la sua durata e su chi: il bersaglio, i suoi adiacenti, tutti, o chi usa la mossa) e ricarica. Il motore controlla ogni mossa (`validateCombatMove`): pesi a somma 1, abilità esistenti, moltiplicatori positivi, effetti coerenti con il bersaglio (quelli negativi sui nemici, quelli positivi sugli alleati), durate tra 1 e 3 turni, probabilità solo sugli effetti negativi. Mai codice eseguibile preso dal database.

Intervalli dei moltiplicatori (dal documento, da verificare con le simulazioni): base singola 0,85-1,10; speciale singola 1,20-1,60; speciale con adiacenti 1,10-1,40 sul bersaglio e circa 0,3 di quello sugli adiacenti; speciale ad area 0,45-0,65; suprema singola 1,70-2,20; suprema ad area 0,70-0,95; cura singola 0,80-1,30; cura di squadra 0,40-0,75.

### Bersagli e copertura

- Finché in prima linea c'è almeno un personaggio vivo, la seconda linea è **protetta**: un **corpo a corpo** non la sceglie come bersaglio; a **distanza** e ad **area** la colpiscono a ×0,8 (`coverPercent`); l'**infiltrazione** la colpisce piena.
- Gli adiacenti di una mossa con adiacenti si colpiscono anche in seconda linea, con la stessa copertura.
- La copertura si fotografa all'inizio della mossa: l'ordine in cui cadono i bersagli di un colpo ad area non cambia il danno degli altri.

### Danno, cure, scudi

- **Danno** = Potenza × moltiplicatore × 100 / (100 + difesa) × copertura × critico, arrotondato alla fine, almeno 1 (il campo è già nella Potenza). Ogni bersaglio ha i suoi tiri (prima colpito o mancato, poi critico), nell'ordine: bersaglio principale, poi gli altri per posto.
- Lo **scudo** assorbe il danno prima della Vita. Uno scudo vale Potenza × moltiplicatore, e lo scudo di un personaggio non supera il 30% della sua Vita (`shieldMaxPercent`).
- Una **cura** vale Potenza × moltiplicatore e non supera la Vita mancante. Chi cade non si cura e non torna in gioco.

### Effetti di stato (tappa 2)

Otto effetti, quattro positivi e quattro negativi (`statuses`; i nomi da mostrare ai giocatori sono da decidere):

| Effetto | Codice | Cosa fa |
|---|---|---|
| Potenziamento | `empower` | +25% ai danni che fa |
| Fortificazione | `fortify` | +50% alla sua difesa |
| Accelerazione | `haste` | +20% alla Velocità |
| Provocazione | `taunt` | Le mosse su un solo nemico devono sceglierlo, se lo raggiungono (un corpo a corpo non lo raggiunge dietro una prima linea in piedi) |
| Indebolimento | `weaken` | −20% ai danni che fa |
| Vulnerabilità | `vulnerable` | −30% alla sua difesa |
| Stordimento | `stun` | Perde il prossimo turno |
| Bruciatura | `burn` | All'inizio di ogni suo turno perde il 6% della Vita massima, passando sopra lo scudo; può cadere |

- **Durata** in turni personali di chi lo porta, da 1 a 3 (`maxTurns`): cala alla fine di ogni suo turno. Un effetto messo durante il suo stesso turno (per esempio su di sé) non perde quel turno.
- Lo **stesso effetto non si somma**: una nuova applicazione rinnova la durata (la più lunga delle due). Effetti diversi convivono; uno positivo e uno negativo sullo stesso numero si sommano (+25% e −20% fanno +5%).
- **Probabilità** di un effetto negativo = base della mossa + 3 × (abilità di chi lo usa − media del bersaglio nelle tre abilità della stessa famiglia), tra 10% e 90% (`effectChance`). Senza probabilità l'effetto è sicuro; quelli positivi sono sempre sicuri.
- Un effetto negativo su un nemico che la mossa ha provato a colpire arriva solo se almeno un colpo è andato a segno.
- **Stordimento:** dopo un turno perso il personaggio gioca almeno il turno seguente (un nuovo stordimento prima di allora non attecchisce).
- Chi cade perde tutti i suoi effetti.

### Passive (tappa 2)

La passiva di un personaggio (`CombatPassive`, nel kit) è un dato come le mosse. Può fare due cose, anche insieme:

- **rispondere a un innesco:** inizio dello scontro, inizio di ogni suo turno, dopo che una sua mossa ha colpito un nemico, dopo che una mossa nemica lo ha colpito, quando mette KO un nemico con una sua mossa, quando cade un alleato, la prima volta che la sua Vita scende sotto una soglia. Gli effetti: scudo, cura, danno (con i suoi tiri), effetto di stato, Carica; su di sé, sui compagni, sui nemici, o sul personaggio dell'innesco (quello colpito, o chi l'ha colpito). Può avere un limite di volte per scontro;
- **cambiare i suoi numeri** finché è in piedi: danni, critico, precisione, cure, Velocità, probabilità degli effetti, danni in più sui nemici con un certo effetto.

Gli effetti di una passiva **non fanno scattare altre passive**: niente catene. Le passive dell'inizio dello scontro agiscono per posto, prima il lato a; le altre nell'ordine in cui sono scattate. Il motore le controlla (`validateCombatPassive`).

Per Gantry il documento propone «Uomo del porto»: uno scudo a inizio scontro pari a metà della Potenza su Combattimento.

### Campo di battaglia

Ogni Scontro si gioca su una **Minaccia normale di Nuova Megara** (niente luoghi, rare o modificatori nella prima versione), visibile prima di scegliere la squadra. Le mosse che usano le abilità richieste dalla Minaccia hanno fino a +20% di Potenza (`fieldBonusPercent`), in proporzione al peso di quelle abilità nella mossa: una mossa FOR 70% e COM 30% su un campo «FOR + TEC» ha +14%.

### Fine dello scontro

- Vince chi elimina tutta la squadra avversaria. Se cadono insieme le due squadre, è pareggio.
- Dopo 100 azioni (`maxActions`): vince chi ha più personaggi in piedi; a parità la percentuale di Vita rimasta della squadra (scudi esclusi); a parità ancora, pareggio.

### Registro

Ogni scontro ha un **seme** e un registro di eventi: inizio, turno, mossa, mancato, danno (con critico e scudo assorbito), cura, scudo, effetto messo, effetto resistito (o non attecchito dopo uno stordimento), effetto finito, bruciatura, turno perso, passiva, Carica, caduto, fine. Stesso seme, stesse squadre, stessa versione delle regole e stesse scelte danno lo stesso registro. Il **replay** è il registro salvato, non una nuova simulazione: un cambio di regole non rovina gli scontri vecchi.

## Chi decide

- Il motore è puro e deterministico, in `packages/game-engine/src/combat.ts` e `combat-ai.ts`, con il resto delle regole: lo usano i test, il simulatore e (dalla tappa 4) l'Edge Function.
- **Automatico e tattico:** una chiamata all'Edge Function gioca tutto lo scontro, salva il registro e paga i premi; il telefono riproduce il registro.
- **Manuale contro il computer:** una chiamata per ogni mossa del giocatore; il seme resta sul server, altrimenti il telefono potrebbe prevedere colpi e critici.
- **Allenamento senza premi:** può girare tutto nel browser.
- **Sfide fra giocatori:** asincrone, contro squadre in difesa salvate; niente sfide dal vivo turno per turno.
- L'IA (`chooseCombatAction`) sceglie solo tra le mosse permesse, con i valori attesi, senza conoscere i tiri. Ogni azione vale cinque parti, in punti di Vita: **danni** attesi (mai più di quanto resta al bersaglio; le bruciature contano qui), **KO** (150 punti per un KO probabile), **cure** che servono, **controllo** (effetti negativi sui nemici, per la loro probabilità: uno stordimento vale un'azione del bersaglio) e **protezione** (scudi che ci stanno, a 0,7, ed effetti positivi sui compagni). In parità preferisce la suprema, poi la speciale.
- **Strategie** (`COMBAT_STRATEGIES`): pesano le cinque parti (danni · KO · cure · controllo · protezione) con i numeri del documento. Equilibrata 0,7 · 0,85 · 0,75 · 0,7 · 0,65; aggressiva 1 · 1 · 0,35 · 0,45 · 0,25; difensiva 0,35 · 0,65 · 1 · 0,65 · 1; controllo 0,45 · 0,7 · 0,6 · 1 · 0,55; assassinio 0,85 · 1 · 0,35 · 0,7 · 0,25.
- **Priorità dei bersagli** del lato: meno Vita, meno Vita in percentuale, il più pericoloso, la seconda linea, chi cura, chi ha la suprema pronta. Un'azione sul nemico preferito vale una volta e mezza; mai un'azione non permessa.
- **Ordini** a un singolo personaggio, per posto (l'automatico tattico): cura solo chi è sotto una certa percentuale di Vita; usa la suprema su tutti i nemici solo se ne restano almeno tanti in piedi; una sua priorità dei bersagli.
- Per le simulazioni (e per i personaggi del computer) la formazione mette in prima linea i due con più Vita (`autoCombatFormation`).

## Simulatore

`node scripts/simulate-combat.mts <dump.json>`, con il catalogo di `scripts/emergency-catalog.sql`. Gioca scontri automatici con kit generici, finché non ci sono i kit veri (`genericCombatKit`): ogni mossa sulle due abilità migliori del personaggio, e la forma dal **ruolo** dell'abilità migliore. **Difensore** (Resistenza): scudo e provocazione, suprema ad area che indebolisce, scudo quando la Vita scende sotto il 40%. **Picchiatore** (le altre di Corpo): colpo sugli adiacenti, suprema che stordisce, scudo a inizio scontro. **Controllore** (Mente): indebolisce e stordisce, suprema che cura e potenzia la squadra. **Artigliere** (Potere): speciale ad area che brucia, suprema ad area. **Specialista** (Mestiere): vulnerabilità, poi un colpo singolo pesante. Misura:

- **durata:** azioni per scontro, scontri arrivati al limite, errori;
- **valore di un punto:** squadre identiche, un punto in più in un'abilità a tutti e cinque i personaggi di un lato (lati scambiati);
- **rarità:** squadre di una rarità contro quella sotto;
- **carte:** vittorie di ogni personaggio in squadre a caso, e il legame con ogni abilità;
- **campo:** quanto conta avere punti nelle abilità della Minaccia;
- **ripetibilità:** lo stesso scontro due volte con lo stesso seme;
- **ruoli:** vittorie dei personaggi di ogni ruolo dei kit generici;
- **piloti** (tappa 3): ogni personaggio della prova con il suo kit in una squadra a caso, contro la stessa squadra con il suo kit generico, e le due squadre della prova una contro l'altra (`--pilots` usa i kit veri anche negli altri conteggi);
- **strategie:** ogni strategia contro l'equilibrata sulle stesse squadre, e cosa fa il suo lato in uno scontro (danni, cure, scudi, effetti, supreme).

I risultati sono nella sezione seguente, aggiornati a ogni taratura.

## Risultati delle simulazioni

Vedi «Risultati della tappa 1» in fondo.

## Decisioni aperte

| Decisione | Valore usato finché non si decide |
|---|---|
| Nome della modalità e delle mosse | «Scontro a squadre»; nel codice base, special, supreme, passive |
| Effetti di stato | Gli 8 della tappa 2; altri (silenzio, blocco cure, rigenerazione, immunità…) quando un kit vero li chiede |
| Passive | Una per personaggio; una passiva identica al massimo su un Eroe, un Cattivo e un Neutrale, come i Poteri |
| Sinergie | Solo dentro le mosse; nessun bonus automatico di fazione o di gruppo |
| Danni nel tempo contro gli scudi | Uno solo, la bruciatura, che passa sopra gli scudi (fatto nella tappa 2) |
| Stordimento continuo | Dopo un turno perso si gioca almeno il seguente (fatto nella tappa 2) |
| Premi | Contro il computer: 20 XP e 15 monete una vittoria, 8 XP una sconfitta o un pareggio, per le prime 5 battaglie finite del giorno; nessuna carta (fatto nella tappa 4) |
| Regole dei luoghi sul campo | Non nella prima versione |

## Tappe

| Tappa | Contenuto | Dipende da | Finita quando |
|---|---|---|---|
| 1 (fatta) | Motore (valori, turni, bersagli, copertura, Carica, ricarica, danno, cure, scudi, fine, registro), IA avida, simulatore | Decisioni del 24 novembre | Test superati; 10.000 scontri senza errori; stesso seme = stesso registro; valore di un punto e rarità misurati e vicini all'obiettivo |
| 2 (fatta) | Effetti di stato, passive, IA con strategie e ordini tattici | 1 | Le mosse sbagliate sono rifiutate; l'IA fa solo mosse permesse; strategie diverse danno risultati misurabilmente diversi |
| 3 (fatta) | 10 personaggi veri con il loro kit; pagina di prova in locale (manuale e automatico, registro, replay) | 2 | Uno scontro si gioca su iPhone in 2-4 minuti; `npm run test:layout` senza testi coperti |
| 4 (fatta) | Tabelle, Edge Function, scontri contro il computer con premi, editor delle mosse solo per gli admin | 3 | Test del database: proprietà delle carte, seme nascosto, `not_admin`; nessun risultato deciso dal telefono |
| 5 (in corso: gruppi da 1 a 8 fatti) | Kit per tutti i personaggi, a gruppi di 20-30 | 2, 4 | Ogni gruppo simulato sulla sua carta e approvato dall'utente |
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

## Risultati della tappa 2

24 novembre 2026, numeri v0.2 di `balance.ts` (riduzione delle rarità all'80%), 351 personaggi, kit generici per ruolo con effetti e passive: `node scripts/simulate-combat.mts <dump> --battles 10000 --pairs 2000`.

| Misura | Tappa 1 | Tappa 2 |
|---|---|---|
| Azioni per scontro | 37 (32-42) | 48 (36-62), al limite 0,1% |
| Un punto di VEL / RES in più | 55% / 56% | 56% / 55% |
| Un punto nelle altre abilità | 51-56% | 52-54% |
| Ogni rarità contro quella sotto | 45-57% | 47-59% |
| Omega contro Delta | 57% | 59% |
| Carte (dal 5% al 95%) | 38-58% | 40-60% |
| Legame tra rarità e vittorie di una carta | 0,11 | 0,10 |

- **10.000 scontri, nessun errore**; ripetibilità 100 su 100.
- **Ruoli:** picchiatore 53,1% (72 personaggi), difensore 53,2% (50), artigliere 52,0% (49), specialista 49,7% (46), controllore 46,5% (134). Il controllore è il ruolo di chi ha la Volontà, la Percezione o l'Intelletto come abilità migliore, quindi di molte carte; con i kit generici resta sotto anche con danni alzati (base 1,0, speciale 0,9): i kit veri dovranno dargli di più.
- **Carte:** le più deboli sono quasi tutte Delta dei primi numeri (P009-P023), con Resistenza e Velocità basse; le vittorie seguono RES (+0,27), FOR (+0,20) e VEL (+0,19) e calano con INT (−0,30) e TEC (−0,28).
- **Campo:** con almeno 5 punti in più nelle abilità della Minaccia si vince il 55,4% (50,6% senza campo).
- **Strategie contro l'equilibrata** (stesse squadre): aggressiva 47,4%, difensiva 48,1%, controllo 48,4%, assassinio 47,5%. Nessuna strategia batte l'equilibrata, che resta la più solida, e nessuna perde nettamente. Giocano in modo diverso: in uno scontro il lato aggressivo cura 105 e dà 106 di scudi, 2,0 effetti ai compagni, 2,5 supreme; il difensivo cura 198, dà 168 di scudi, 5,6 effetti ai compagni, 3,3 supreme. Gli effetti sui nemici restano uguali (7,6): con i kit generici stanno sulle mosse di danno, quindi la strategia non li sposta.

**Da tenere d'occhio nella tappa 3:** il controllore e le carte di Intelletto e Tecnologia; i kit veri cambieranno questi numeri, quindi ogni gruppo di kit va simulato di nuovo, sulla sua carta.

## I dieci personaggi della prova (tappa 3)

I kit veri dei primi dieci personaggi sono in `src/lib/combat-pilot.ts`, scritti dalla loro scheda (abilità, Poteri, testo di colore). Abilità e rarità sono copiate dal catalogo del 24 novembre 2026; dalla tappa 4 i kit vanno nel database e le abilità si leggono dalle carte. Due squadre: **Porto** (la squadra del porto della Storia, Delta e Gamma) e **Rivali** (da Beta a Omega).

| Personaggio | Rarità | Base | Speciale | Suprema | Passiva |
|---|---|---|---|---|---|
| Gantry | Delta | Spallata | Carico pesante (bersaglio e vicini) | Container in caduta (tutti, indebolisce) | Uomo del porto: scudo a inizio scontro |
| Lagan | Delta | Presa (indebolisce) | Fondale (scudo e provocazione) | Risacca (colpo pesante, stordisce) | Non molla niente: +1 Carica quando lo colpiscono (3 volte) |
| Deadweight | Gamma | Bilancia truccata | Senza peso (colpisce e accelera sé) | Cassa vuota (accelera e protegge la squadra) | La bilancia non mente: precisione e critico |
| Higgler | Delta | Mercanzia | Aria di casa (cura e fortifica un compagno) | Il carro (cura e fortifica la squadra) | Sette giorni: cura la squadra quando cade un compagno (2 volte) |
| Busker | Delta | Strimpellata (indebolisce) | La canzone giusta (tutti, indebolisce) | Ninna nanna (tutti, stordisce) | Una canzone sola: effetti più probabili |
| Fathom | Beta | Rumore di fondo | Pensiero letto (vulnerabilità) | Tutte le voci (tutti) | Prima di te: precisione e critico |
| Kiln | Beta | Mani roventi (brucia) | Serratura fusa (brucia) | Stanza gelata (tutti, stordisce) | Il primo fuoco: più danni a chi brucia |
| Sordina | Gamma | Lama silenziosa (dietro le linee) | Fascicolo (vulnerabilità) | Chi paga di più (colpo pesante dietro le linee) | La lealtà si vende a parte: accelera dopo un KO; critico |
| Unbidden | Alfa | Braccio di scarto | Quaranta braccia (scudo alla squadra) | Nessuno me l'ha chiesto (scudo, provocazione, fortificazione su di sé) | Solo ciò che è di scarto: scudo alla squadra quando cade un compagno (1 volta) |
| Aion | Omega | Eco della fine | Tempo fermo (stordisce) | È già finito (tutti) | Si annoia: +1 Carica a inizio turno (3 volte) |

Nessuna passiva è uguale a un'altra, quindi la regola «una passiva identica al massimo su un Eroe, un Cattivo e un Neutrale» è rispettata (`src/lib/combat-pilot.test.ts`).

**Ogni kit simulato sulla sua carta** (`--report pilots`, 1500 coppie, lati scambiati): il personaggio con il suo kit in una squadra a caso, contro la stessa squadra con il suo kit generico. Prima prova: Deadweight 42%, Kiln 43%, Sordina 41% (troppo deboli), Higgler 58%. Ritoccati (Deadweight colpisce e si accelera, Cassa vuota protegge di più; Kiln brucia di più; Sordina colpisce di più e ha critico; Higgler cura un po' meno; Aion un po' più forte):

| Personaggio | Con il suo kit | Con il kit generico |
|---|---|---|
| Gantry | 55,0% | 55,6% |
| Lagan | 48,7% | 54,0% |
| Deadweight | 47,3% | 46,0% |
| Higgler | 55,9% | 60,2% |
| Busker | 51,1% | 59,5% |
| Fathom | 53,6% | 50,3% |
| Kiln | 48,2% | 45,0% |
| Sordina | 45,7% | 46,6% |
| Unbidden | 50,1% | 50,9% |
| Aion | 45,8% | 40,1% |

Tutti tra il 46% e il 56%. Porto contro Rivali: 55,1% (la squadra di Delta e Gamma un po' avanti: la rarità non decide).

**Durata** con le due squadre della prova (400 scontri): 50 azioni (dal 10% al 90%: 42-60), di cui 24 scelte del giocatore. A ×1 ogni azione resta 1,1 secondi: con 3 secondi per scelta lo scontro dura 2,1 minuti, con 5 secondi 3,0, con 8 secondi 4,2; tutto in automatico 0,9 minuti a ×1. È una stima fatta con il motore, non uno scontro cronometrato su un iPhone vero.

## La pagina di prova (tappa 3)

`/prova-scontro`, solo in `next dev` (`src/app/prova-scontro/page.dev.tsx`); lo schermo è `src/components/combat-screen.tsx`, le parole in `src/lib/combat-text.ts`. Lo scontro gira tutto nel browser con il motore: niente viene salvato né pagato.

- **Squadra:** si scelgono cinque dei dieci e si mettono ai posti (F1, F2 davanti; R1, R2, R3 dietro); gli altri cinque sono gli avversari, messi dal computer. Il campo si cambia con un tocco; manuale o automatico; la strategia del proprio lato.
- **Scontro:** i nemici in alto (seconda linea più lontana), i propri in basso; ogni casella ha disegno, nome, Vita (verde) con lo scudo (azzurro), la Carica (sei puntini) e fino a quattro effetti (sigle di tre lettere sul disegno). In mezzo i prossimi turni. Nel proprio turno, tre pulsanti: la mossa, poi un tocco sul bersaglio evidenziato; sotto, una riga che dice cosa fa la mossa. Automatico, velocità ×1 ×2 ×3, Salta (finisce lo scontro in automatico) e Registro (ogni evento in italiano, una vista a sé).
- **Fine:** Vittoria, Sconfitta o Pareggio, in quante azioni, chi è in piedi e chi ha fatto più danni; Rivedi (il replay passo per passo), Di nuovo, Squadra.
- **Scene** per `npm run test:layout` (che ora controlla anche questa pagina): squadra, manuale, bersaglio, effetti, auto, fine, replay, registro. Tutte senza testi coperti, a 375×812 e a 375×667.

## Contro il computer, sul server (tappa 4)

Migrazione `20261124100000_scontro_stage_four.sql`, Edge Function `match`, pagine `/scontro` e `/gestione-scontro`. La modalità nasce **spenta** («combat» in EDITOR → Modalità di gioco, con «Prossimamente»): finché un admin non la apre, nessuno scontro parte e la pagina lo dice.

- **Numeri:** le chiavi `combat.*` di `game_config`, le stesse di `balance.ts` (`npm run test:db` le confronta). In più: il campo è una Minaccia normale di Nuova Megara di livello da 2 a 4 (`combat.field.*`), e i premi (`combat.rewards.*`).
- **Kit:** `combat_kits`, uno per personaggio (il `CombatKit` del motore come dato), leggibili da ogni giocatore e cambiati solo dagli admin; all'inizio i dieci della tappa 3. Si schierano solo i personaggi con un kit, e il computer ne prende cinque a caso tra quelli.
- **Scontri:** `combat_battles` tiene le due squadre, i numeri di quel momento, il **seme** e ogni scelta dei due lati, in ordine. Nessun client legge la tabella: il seme resta sul server, altrimenti il telefono potrebbe prevedere colpi e critici. Le scelte salvate sono anche il replay.
- **Edge Function** (azioni `combat_start`, `combat_act`, `combat_finish`, `combat_state`): a ogni chiamata ricostruisce lo scontro dal seme e dalle scelte con il motore, gioca la scelta del giocatore (o tutto il resto in automatico, con la sua tattica), poi i turni del computer fino al turno successivo del giocatore, e li aggiunge con `combat_record`: due chiamate sullo stesso turno non scrivono entrambe (`combat_stale`). Al telefono arrivano i passi da mostrare e i kit, mai il seme.
- **Database:** `combat_create` controlla che le cinque carte siano del giocatore, cinque personaggi diversi, nessuna in palio in una Conquista, tutti con un kit, e che la squadra mandata sia quella; uno scontro alla volta (uno nuovo lascia il vecchio, senza premi). `combat_record` chiude lo scontro e paga: XP sempre (vittoria o sconfitta), monete solo per una vittoria, per le prime `combat.rewards.daily_battles` battaglie finite della giornata di gioco (Europe/Rome). `combat_active` e `combat_abandon` per il giocatore.
- **Pagina `/scontro`:** si scelgono cinque dei propri personaggi con un kit, ai loro posti, manuale o automatico e la strategia; lo schermo è quello della tappa 3, che manda le scelte al server e mostra i passi che tornano. Uno scontro lasciato a metà si riprende da dove era; «Abbandona» lo chiude senza premi. Alla fine i premi, o «niente premi» oltre le battaglie premiate del giorno. In Gioca non c'è ancora un pulsante: si decide quando la modalità si apre.
- **EDITOR → Scontro (`/gestione-scontro`):** l'elenco dei kit; un kit si apre come JSON, il motore lo controlla mentre lo si scrive (`validateCombatKit`) e si salva solo se è valido (`admin_save_combat_kit`, una versione in più a ogni salvataggio); si toglie con «Togli» (`admin_delete_combat_kit`). Un kit nuovo parte da quello generico del simulatore, da riscrivere dalla carta. Il server controlla l'admin e la forma del kit; l'Edge Function lo ricontrolla con il motore quando uno scontro parte.
- **Test:** `supabase/tests/combat.test.sql` (kit leggibili, scontri e seme chiusi ai client e alle loro chiamate, carte di altri, personaggi senza kit, squadra in un altro ordine, modalità spenta, uno scontro alla volta, scelte in ordine e chiamata vecchia rifiutata, premi di vittoria e sconfitta, limite del giorno, abbandono, funzioni dell'EDITOR solo per gli admin).

**Prova dal vivo** (24 novembre 2026, con l'account dell'utente, la modalità aperta solo per la prova e poi rispenta): la prima chiamata dell'Edge Function falliva perché il ruolo del server non poteva leggere `combat_battles` e `combat_kits` (in questo progetto ogni tabella gli va concessa una per una): migrazione `20261124110000_scontro_service_reads.sql` e un controllo nel test del database. Poi uno scontro manuale (squadra del porto contro cinque scelti dal computer, campo «Laboratorio in fiamme»), ripreso dopo aver ricaricato la pagina esattamente dov'era, finito in automatico dal server: vittoria in 55 azioni, +20 XP e +15 monete, nel database lo scontro con le sue 52 scelte e una riga `combat_reward`. L'editor delle mosse ha aperto i kit e rifiutato un kit con i pesi sbagliati (senza salvare). Corretti dopo la prova: «indietro» e «Abbandona» nella riga in alto dello schermo (la pagina sta in 375×667 senza scorrere, e la pagina di prova ha la stessa riga), «Abbandona» sparisce a scontro finito, «Replay» compare solo dopo «Rivedi», gli errori dell'editor in italiano.

## I kit di tutti (tappa 5)

Gli altri 341 personaggi ricevono il loro kit a gruppi di 20-30, cominciando da quelli che i giocatori possiedono di più. L'elenco dei kit approvati, in italiano, è in [COMBAT-KITS.md](COMBAT-KITS.md).

- **Come nasce un gruppo:** i kit si scrivono dalla carta (abilità più alte, Potere, testo) in `src/lib/combat-kits-batch-N.ts`, con lo stesso costruttore dei piloti, e si aggiungono all'elenco dei gruppi in `src/lib/combat-kits.ts`. Ogni personaggio è provato con il suo kit in 1200 squadre a caso contro le stesse squadre con il kit generico, a lati scambiati (`node scripts/simulate-combat.mts <dump> --pairs 1200 --report kits --batch N`), e ritoccato finché vince fra il 46% e il 56%. Poi si controlla che le rarità restino alla pari con tutti i kit veri (`--report rarity,duration --pilots`). `node scripts/describe-combat-kits.mts N <uscita della simulazione>` scrive la scheda per COMBAT-KITS.md; l'utente approva il gruppo e una migrazione lo carica in `combat_kits` (senza toccare un kit che un admin abbia già salvato dall'EDITOR).
- **Regole dei gruppi:** da 20 a 30 personaggi, nessuno in due gruppi; ogni mossa ha l'id del suo personaggio; una passiva identica (innesco, numeri ed effetti) non si ripete nella stessa fazione, piloti compresi, come per i Poteri (`src/lib/combat-kits.test.ts`). Il test del database schiera P002, P004 e P006 come personaggi senza kit: toglie i loro kit dentro la sua transazione, così vale anche quando tutti ne avranno uno.
- **Gruppo 1** (24 novembre 2026, migrazione `20261124120000_scontro_kits_batch_one.sql`): i 25 Delta più posseduti. Alla prima simulazione molti erano sotto la fascia (Understudy, Ferryman e Lacuna intorno al 29%, Glip e Dogwatch al 33%: carte deboli anche con il kit generico, che il kit deve compensare) e Cullet sopra (64%); dopo due giri di ritocchi tutti fra il 46,0% e il 55,4%. Con i 35 kit veri al posto di quelli generici Gamma su Delta passa dal 51,6% al 50,1%, le altre rarità e la durata (circa 48 azioni) non cambiano.
- **Gruppo 2** (24 novembre 2026, migrazione `20261124130000_scontro_kits_batch_two.sql`): i 25 Delta più posseduti dopo il primo gruppo. Alla prima simulazione sei erano sopra la fascia (Foundling 64,5%, Wardmother, Longwave, Isonomy, Belladonna, Portineria) e cinque sotto (Publican e Suture intorno al 38%, Epigone, Azimuth, Latchkey intorno al 43%); dopo due giri tutti fra il 46,2% e il 55,8%. Con 60 kit veri Gamma su Delta scende al 46,7%: i Delta hanno già il loro kit, i Gamma ancora quello generico, e si riequilibra con i gruppi dei Gamma; Omega su Delta scende dal 59,5% al 55,9%, le altre rarità non cambiano, durata circa 50 azioni.
- **Gruppo 3** (24 novembre 2026, migrazione `20261124140000_scontro_kits_batch_three.sql`): gli ultimi 18 Delta e i primi 7 Gamma più posseduti. Alla prima simulazione guaritori e protettori erano sopra la fascia (Bascule 65,3%, Heading 64,1%, Abdicant 62,8%, poi Dosimeter, Febrifuge, Ropework e Cerbero) e tre sotto (Gridwitch 36,2%, Custos 45,5%, Cineris 45,7%); dopo due giri tutti fra il 46,9% e il 55,8%. Con 85 kit veri Gamma su Delta torna alla pari (50,8%); Beta su Gamma scende al 47,1%, perché qualche Gamma ha il suo kit e i Beta ancora quello generico, e si riequilibra con i gruppi dei Beta; Omega su Delta 55,5%, Alfa su Beta resta al 58,3%, durata circa 50 azioni.
- **Gruppo 4** (24 novembre 2026, migrazione `20261124150000_scontro_kits_batch_four.sql`): i 25 Gamma più posseduti dopo il gruppo 3. I Gamma hanno abilità più alte e già con il kit generico vincono di più: alla prima simulazione molti erano sotto la fascia (Nightward 34,0%, Lullaby 36,0%, Escrow 36,6%, poi Heirloom, Overdue, Interpres, Parallasse, Facsimile e Necropsy) e tre sopra (Wick 62,3%, Theriarch 57,9%, Cursor 57,5%). Per Wick contava la passiva che potenziava tutta la squadra a inizio scontro, cambiata in un piccolo scudo a tutti. Dopo tre giri tutti fra il 48,3% e il 55,5%. Con 110 kit veri Beta su Gamma risale al 49,3% e Gamma su Delta fa 49,3%; le altre rarità non cambiano, durata circa 50 azioni.
- **Gruppo 5** (25 novembre 2026, migrazione `20261125100000_scontro_kits_batch_five.sql`): altri 16 Gamma, i primi 5 Beta e i primi 4 Alfa più posseduti. Scritti partendo da valori più alti, alla prima simulazione 15 su 25 erano già nella fascia; sopra c'erano Katabatic (64,3%), Erasure (60,0%), Moth e Insula (58%), sotto Codicil (39,8%, debole anche con il kit generico: la sua Suprema ora colpisce e indebolisce tutti i nemici invece di proteggere la squadra), Milewright e Byline (44,0%). Dopo tre giri tutti fra il 48,2% e il 55,0%. Con 135 kit veri Beta su Gamma fa 50,0%, Gamma su Delta 49,3%, Alfa su Beta 57,5%; Omega su Alfa scende al 45,2% perché quattro Alfa hanno il loro kit e gli Omega ancora no, da ricontrollare con i gruppi degli Omega; durata circa 49 azioni.
- **Gruppo 6** (25 novembre 2026, migrazione `20261125110000_scontro_kits_batch_six.sql`): altri 13 Gamma, 11 Beta e 1 Alfa più posseduti. La prima passiva di Sanctuary ripeteva quella di Isonomy (fortificazione a tutti a inizio scontro) ed è diventata un indebolimento dei nemici. Alla prima simulazione sopra la fascia c'erano Larceny (66,8%), Contumax, Indemnity e Lure (circa 58%) e Plinth (56,3%), sotto Attainder (39,8%), Actuary (41,9%), Carillon (43,1%), Rubicon e Dredge (circa 45%); dopo tre giri tutti fra il 46,6% e il 55,3%. Con 160 kit veri Alfa su Beta migliora al 54,6%, Beta su Gamma sale al 52,4%, Gamma su Delta 51,9%, Omega su Alfa resta al 44,7%; durata circa 48,5 azioni.
- **Gruppo 7** (25 novembre 2026, migrazione `20261125120000_scontro_kits_batch_seven.sql`): gli ultimi 5 Gamma, 10 Beta e 10 Alfa più posseduti. Due passive ripetevano quelle di personaggi della stessa fazione (Gavel quella di Lagan, Contromano quella di Ephemeris) e sono state cambiate. Alla prima simulazione sopra la fascia c'erano Warren (63,5%: la sua Speciale colpiva tutti i nemici), Emendatio (59,0%), Antecessor, Keelstone, Hospes ed Effigy (fra il 56% e il 58%), sotto Gauger (38,1%); dopo tre giri tutti fra il 48,5% e il 55,8%. Con 185 kit veri Omega su Alfa risale al 48,8%, Alfa su Beta scende al 52,4%, Beta su Gamma sale al 53,6% (i Beta vincono in media un po' più dei Gamma: da ricontrollare dopo gli ultimi Beta), Gamma su Delta 51,6%; durata circa 48 azioni.
- **Gruppo 8** (25 novembre 2026, migrazione `20261125130000_scontro_kits_batch_eight.sql`): altri 15 Beta e 6 Alfa più posseduti (21, per dividere i 42 rimasti in due gruppi). Alla prima simulazione sopra la fascia c'erano Tribune (64,6%: la Speciale stordiva e colpiva anche i vicini) e Regina Ix (59,8%: partiva con 2 Cariche, ora 1), sotto Errata (35,6%) e Sibilla (42,4%), deboli anche con il kit generico, poi Vulnerary, Xenolith e Portitor; dopo tre giri tutti fra il 47,5% e il 55,1%. Con 206 kit veri Beta su Gamma scende al 51,8%, Alfa su Beta 50,9%, Omega su Alfa 47,6%, Gamma su Delta 51,6%; durata circa 47 azioni. Lo script della scheda non leggeva i nomi con uno spazio (Zeta Rax, Vera Kross, Regina Ix restavano senza percentuale): corretto.
