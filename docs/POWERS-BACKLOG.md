# Poteri futuri — backlog

Poteri pronti per i prossimi aggiornamenti. Quelli già sulle carte sono in `SPEC.md` §4.4 (19 poteri, ottobre-novembre 2026).

**Stato (14 novembre 2026):** i 14 poteri sono **in gioco**, uno per personaggio nuovo (P218-P231, docs/WORLD.md «Per i poteri del backlog»), con i parametri consigliati qui sotto. Nebbia ora è coperta dal server (`with_fog`, migrazione `20261114231000_fog_hides_cards.sql`). Sacrificio è entrato senza essere riprogettato: il problema di bilanciamento qui sotto resta aperto. Inafferrabile resta solo un'idea, perché cambia la Conquista.

**Stato (9 novembre 2026):** 14 poteri sono pronti nel motore di regole, nei bot, nelle note del round e nel database (`power_definitions`), ma nessuna carta li ha.

Ogni potere va su **personaggi nuovi** (due per potere, come P115-P122), senza toglierlo alle carte esistenti.

## Regole di progetto

- **Situazionale, mai bonus generico** (SPEC §4.4). Semplice su Gamma e Beta, Distintivo su Alfa e Omega.
- **Obiettivo di forza:** da simulazione, una squadra con la carta vince tra il **48% e il 54%**. Sabotatore è al 59%: nessun potere nuovo deve superarlo.
- **Emergenza:** ogni potere dice cosa fa senza avversario. Se non ha senso, non ha effetto (come Nemesi o Spia).
- **Annullatore** annulla anche i poteri nuovi, compresi gli effetti sui round dopo.

## I 14 poteri pronti

Parametri consigliati tra parentesi: vanno in `card_definitions.power_params` del personaggio.

### Semplici (Gamma e Beta)

| Potere | Codice e parametri | Effetto | Emergenza |
|---|---|---|---|
| **Arte di arrangiarsi** | `scrappy` (`min_value` 3) | Le abilità richieste che valgono meno di 3 contano 3, dopo Sabotatore | Sì |
| **Contrattacco** | `counterpunch` (`bonus` 1, `max` 3) | +1 per ogni abilità richiesta in cui il personaggio avversario lo supera, a valori pieni, fino a +3 | Nessun effetto |
| **Eclettico** | `eclectic` (`bonus` 3, `min_families` 3) | +3 se le abilità richieste sono di almeno 3 famiglie diverse. La prima versione (+1 per famiglia) era quasi sempre attiva e valeva quanto Sabotatore | Sì |
| **Lupo solitario** | `lone_wolf` (`bonus` 5) | +5 se nessun altro personaggio della squadra è della sua fazione | Sì, contato sugli 8 |
| **Opportunista** | `opportunist` (`bonus` 3) | +3 se il personaggio avversario non ha un potere | Nessun effetto |
| **Riflesso** | `reflect` (nessuno) | Immune a Sabotatore, e il malus torna indietro: il Sabotatore avversario perde lui 1 a ogni abilità | Nessun effetto |
| **Vendetta** | `vendetta` (`bonus` 3) | +3 se hai perso il round precedente, con qualunque personaggio | Se la Minaccia precedente è fallita |
| **Grande prova** | `main_event` (`bonus` 3) | +3 contro la Minaccia di livello più alto della partita (se sono più d'una, tutte) | Sì, sugli 8 livelli |
| **Adattabile** | `adaptable` (`bonus` 4) | +4 contro una Minaccia con modificatore, e i malus di Territorio ostile e Sottovalutati non lo toccano | Nessun effetto: l'Emergenza non ha modificatori |

### Distintivi (Alfa e Omega)

| Potere | Codice e parametri | Effetto | Emergenza |
|---|---|---|---|
| **Sacrificio** | `sacrifice` (`bonus` 3) | Il suo punteggio conta 0 (perde anche i bonus ricevuti). Da quel momento ogni personaggio successivo del suo lato, di qualunque fazione, ha +3 fino a fine partita, qualunque sia l'esito. Riprogettato il 15 novembre 2026: vedi Bilanciamento | Fallisce la Minaccia (conta tra le tre fallite), poi ogni giocata successiva ha +3 |
| **Capobranco** | `pack_leader` (`bonus` 1) | Dopo di lui, ogni personaggio successivo della sua fazione ha +1 fino a fine partita | Sì |
| **Riverbero** | `echo` (nessuno) | Copia il potere del personaggio giocato nel round prima, se è un potere che dà solo punti al suo personaggio (Specialità, Apripista, Nemesi, Vendetta…). Non copia Sabotatore, Annullatore, Implacabile, Spia, Veggente, Riscossa, Slancio, Schermato, Riflesso, Adattabile né i distintivi nuovi | Sì |
| **Catalizzatore** | `catalyst` (`multiplier` 2) | Il personaggio successivo raddoppia il bonus del proprio potere. Non raddoppia il bonus portato dal round prima, Capobranco né Sacrificio | Sì |
| **Nebbia** | `fog` (nessuno) | L'avversario vede il punteggio ma non chi hai giocato, fino a fine partita | Nessun effetto |

Riverbero si chiama così, e non Eco, perché nel mondo "Eco" è il nome delle carte stesse (WORLD.md §3). Copia solo i poteri a punti perché così la copia vive tutta nel calcolo del punteggio: il server, le rivelazioni e lo schermo non devono saperne nulla.

**Nebbia era incompleta (risolto il 14 novembre 2026).** Il motore e i bot la conoscevano già, ma il server mostrava ancora la carta all'avversario. Servivano, e ora ci sono:
1. `match_state_payload` che nasconde la carta avversaria giocata sotto Nebbia finché la partita non è finita (a meno che l'avversario non abbia giocato un Annullatore in quel round);
2. la schermata del round con la carta coperta e il solo punteggio.

## Bilanciamento

Simulazione del 9 novembre 2026 (6.000 partite per potere e per variante, Difficile contro Difficile, squadre casuali, con 1 o 2 modificatori come sul server, catalogo a 114 personaggi). Il personaggio ospite è un Gamma o Beta per i poteri semplici, un Alfa per i distintivi. Ogni partita si gioca due volte con la stessa squadra e le stesse Minacce: una volta il personaggio ospite ha il potere, una volta no. La differenza è quanto vale il potere in punti percentuali di vittoria.

| Potere | Parametri | Vittorie con il potere | Senza | Differenza |
|---|---|---|---|---|
| *Apripista (riferimento, semplice)* | +3 | 51,8% | 48,4% | +3,4 |
| *Slancio (riferimento, distintivo)* | +2 | 54,6% | 52,3% | +2,3 |
| *Sabotatore (riferimento, il più forte)* | −1 | 59,9% | 52,3% | +7,6 |
| Arte di arrangiarsi | 3 | 50,9% | 48,4% | +2,5 |
| Contrattacco | +1, fino a +3 | 51,8% | 48,4% | +3,4 |
| Eclettico | +3 da 3 famiglie | 51,7% | 48,4% | +3,2 |
| Eclettico | +4 da 4 famiglie | 50,2% | 48,4% | +1,8 |
| Lupo solitario | +3 | 49,7% | 48,4% | +1,3 |
| Lupo solitario | +5 | 50,2% | 48,4% | +1,8 |
| Opportunista | +3 | 51,1% | 48,4% | +2,6 |
| Riflesso | — | 48,7% | 48,4% | +0,3 |
| Vendetta | +3 | 51,1% | 48,4% | +2,7 |
| Grande prova | +3 | 50,5% | 48,4% | +2,1 |
| Adattabile | +2 | 49,5% | 48,4% | +1,0 |
| Adattabile | +4 | 50,9% | 48,4% | +2,5 |
| Sacrificio (prima versione: +5 al solo successivo) | +5 | 36,4% | 52,3% | **−15,9** |
| Capobranco | +1 | 53,8% | 52,3% | +1,5 |
| Capobranco | +2 | 55,5% | 52,3% | +3,3 |
| Riverbero | — | 52,8% | 52,3% | +0,5 |
| Catalizzatore | ×2 | 53,4% | 52,3% | +1,1 |
| Catalizzatore | ×3 | 54,2% | 52,3% | +2,0 |
| Nebbia | — | 52,3% | 52,3% | 0,0 |

Cosa dicono i numeri:

- **Nessun potere nuovo si avvicina a Sabotatore.** I semplici stanno tra +2 e +3,5, come Apripista: sono i parametri consigliati nelle tabelle sopra.
- **Eclettico** nella prima versione (+1 per famiglia, fino a +4) valeva +6,4, quasi quanto Sabotatore, perché era attivo in quasi ogni round. Ora paga solo da 3 famiglie in su.
- **Lupo solitario** e **Adattabile** servono più alti (+5 e +4) perché si attivano di rado. Lupo solitario vale di più per chi costruisce la squadra apposta, cosa che le squadre casuali non misurano.
- **Riflesso** pesa poco in media perché incontra di rado Sabotatore: è un contrappeso, non un potere da squadra.
- **Riverbero, Catalizzatore, Capobranco e Nebbia** contano su come si ordinano le carte e su cosa vede l'avversario. Il bot Difficile non ci pensa, quindi qui risultano deboli: con giocatori veri valgono di più. Per questo restano ai parametri più bassi (Catalizzatore ×2, Capobranco +1).
- **Sacrificio così non funziona:** anche con +10 al prossimo la squadra vince 12 punti percentuali in meno (con +8, 14 in meno), perché cedere un round su cinque costa più di qualunque bonus. Va riprogettato prima di darlo a una carta, per esempio come carta debole che passa il bonus solo se perde, o con un bonus che dura fino a fine partita. È entrato comunque così su Residuo (P227) il 14 novembre; il 15 l'utente ha scelto il bonus che dura (sotto).

### Sacrificio con il bonus che dura (15 novembre 2026)

La regola scelta dall'utente: Residuo continua a contare 0 nel suo round; da quel momento ogni personaggio successivo del suo lato ha +N fino a fine partita. «Giocato presto ripaga il round ceduto su più round; giocato tardi conviene poco.» La cifra doveva portare la squadra con la carta tra il 48% e il 54%.

Simulatore: `scripts/simulate-powers.mts` (ricostruito: quello del 9 novembre non era nel repository), con le stesse condizioni della tabella sopra: Difficile contro Difficile, squadre casuali, 1 o 2 modificatori sorteggiati come sul server e le Minacce dei luoghi, catalogo a 231 personaggi (dump del 13 novembre più P218-P231); niente Minacce rare (almeno una esce in circa 1 partita su 19; Rovescio è misurato a parte). L'ospite è un Alfa a caso; ogni partita si gioca con e senza il potere, con le stesse squadre, Minacce e scelte casuali. Il bot Difficile ora conta il bonus per i personaggi che pianifica dopo Sacrificio. Con la regola di prima lo stesso simulatore dà 37,2% contro 51,0% (300 partite), in linea con il −15,9 della tabella.

**Quanto vale N** (6.000 partite per riga, ±1,3 punti; il bot sceglie quando giocarlo):

| N | Vittorie con il potere | Senza | Differenza |
|---|---|---|---|
| +1 | 36,3% | 50,8% | −14,5 |
| +2 | 44,2% | 50,8% | −6,5 |
| **+3** | **51,9%** | **50,8%** | **+1,1** |
| +4 | 60,5% | 50,8% | +9,7 |
| +5 | 68,3% | 50,8% | +17,6 |

Solo +3 sta nella fascia 48-54%: è la cifra scelta (`bonus` 3, migrazione `20261115100000_sacrifice_lasting_bonus.sql`).

**Quando giocarlo** (2.000 partite per casella: la squadra gioca Residuo proprio in quel round, se la partita ci arriva; tra parentesi la differenza con lo stesso personaggio senza potere giocato nello stesso round):

| Round | +2 | **+3** | +4 |
|---|---|---|---|
| 1 | 49,4% (+12,2) | **59,5% (+22,2)** | 67,1% (+29,9) |
| 2 | 41,8% (+4,8) | **49,1% (+12,1)** | 55,4% (+18,4) |
| 3 | 32,5% (−2,4) | **36,2% (+1,3)** | 40,0% (+5,1) |
| 4 | 24,4% (−9,3) | **25,9% (−7,8)** | 26,8% (−6,9) |
| 5 | 17,6% (−16,6) | **17,6% (−16,6)** | 17,6% (−16,6) |

Le percentuali assolute sono basse perché obbligare una carta a un round fisso costa da solo circa 15 punti (la stessa carta senza potere, forzata, vince il 34-37%); conta la differenza. Con +3 giocarlo al round 1 vale +22 punti, al round 2 +12, al round 3 è in pari, al 4 e al 5 è una perdita netta: la scelta tattica che voleva l'utente. Lasciato libero, il bot Difficile lo gioca al round 1 nel 31% delle partite (vince il 57%), al 2 nel 26% (53%), al 3 nel 23% (49%), al 4 nell'11% (39%), al 5 nel 3% (9%); nel 6% non lo gioca, perché la partita finisce prima.

**Le altre modalità** (come Capobranco, che è già un bonus «fino a fine partita»):

- **Annullatore:** se ferma Residuo nel suo round, Residuo segna normalmente e il bonus non parte (il motore legge i personaggi «come hanno giocato», senza il potere tolto). Un Annullatore avversario che colpisce un personaggio successivo gli toglie il suo potere, non il bonus di Sacrificio, come per Capobranco. Silenzio della tomba nei round dopo non lo ferma (come Riscossa, Slancio e Capobranco).
- **Catalizzatore** non lo raddoppia, come non raddoppia Capobranco: il bonus è una parte a sé del punteggio (`sacrifice` nelle parti), non il potere del personaggio.
- **Allarme Triplo:** vale su **tutte e tre le Minacce** dal round dopo, non solo sulla corsia di Residuo: Capobranco in questa modalità conta già le carte dei round precedenti su ogni Minaccia, e Sacrificio cede una sola Minaccia di tre. Misurato a parte (2.000 partite Difficile contro Difficile, mazzi casuali da 9 con un Alfa ospite): con +3 il mazzo vince il 49,8% contro il 49,9%, neutro; il 65,7% se Residuo esce nel round 1, il 50,6% nel 2, il 33,7% nel 3 (contro 48-52% senza potere). Su una sola corsia arriverebbe al massimo a due carte e sarebbe sotto la fascia.
- **Grande Minaccia:** vale per i personaggi che entrano nei turni dopo; chi è già su un fronte tiene il punteggio con cui è entrato.
- **Emergenza:** Residuo continua a fallire la sua Minaccia (conta tra le tre fallite, sotto Rovescio lo 0 resta sotto la soglia massima e la supera); ogni giocata successiva ha +3 fino a fine giornata.
- **Rovescio:** la regola per cui Residuo conta 0 non cambia (vedi sotto le misure e la proposta).

**Rovescio: misura e proposta (non implementata).** Sotto Rovescio vince il totale più basso, quindi lo 0 di Residuo vince quasi sempre il suo round, e con il bonus che dura il premio raddoppia. Misurato con una Minaccia di Rovescio (Il mondo capovolto) al posto di una di livello 5 o più in ogni partita, 3.000 partite per riga:

| Variante | Vittorie con il potere | Senza | Differenza | Se Residuo va sul Rovescio: vince il round / la partita |
|---|---|---|---|---|
| Solo lo 0, senza bonus (`bonus` 0) | 56,3% | 50,2% | +6,0 | 96,7% / 63,8% |
| **Regola attuale, +3** | **66,9%** | **50,2%** | **+16,7** | **96,5% / 84,8%** |
| Proposta: il bonus parte solo se Residuo non vince il suo round | 56,5% | 50,2% | +6,2 | 96,5% / 66,8% |

Nelle partite con Rovescio la carta è nettamente sopra la fascia (66,9%). Ma Rovescio esce solo su due Minacce rare (Il mondo capovolto, Epica, 1 partita su 700; L'ombra di mezzogiorno, Leggendaria, 1 su 2.400): circa 1 partita su 540, quindi sulla media il peso è di pochi centesimi di punto. Proposta, da decidere: **il bonus di Sacrificio parte solo se Residuo non vince il suo round** (lo vince solo sotto Rovescio, o quando un Annullatore lo ferma e allora il bonus già non parte). Toglie il doppio premio (66,9% → 56,5%) e lascia lo 0 di Residuo, che sotto Rovescio resta un vantaggio come per tutte le carte deboli; nelle partite senza Rovescio non cambia nulla. L'alternativa già proposta, «cede il round anche sotto Rovescio», toglierebbe anche quel vantaggio; l'utente per ora non l'ha scelta. Il simulatore misura la proposta con `--no-bonus-after-win`.

## Da decidere: tocca le regole della Conquista

Questo potere cambia SPEC §6, quindi serve una decisione esplicita prima di progettarlo nei dettagli. Non è implementato.

| Potere | Codice | Livello | Effetto | Rischio |
|---|---|---|---|---|
| **Inafferrabile** | `elusive` | Distintivo | In Conquista non può essere conquistato: se perdi, l'avversario sceglie un'altra carta | Rende più sicuro schierare carte rare; va limitato (per esempio solo Alfa, e solo se non è l'unica carta conquistabile) |

## Ordine consigliato

1. **Riflesso**, per bilanciare Sabotatore senza toccarlo.
2. **Arte di arrangiarsi** ed **Eclettico**, perché danno valore agli specialisti e ai generalisti sulle Minacce di livello alto.
3. **Vendetta** e **Grande prova**.
4. **Sacrificio**, solo dopo averlo riprogettato.
5. Riverbero, Catalizzatore e Capobranco; Nebbia dopo il lavoro sul server.

## Per mettere un potere su una carta

Il potere è già nel motore, nei bot, nelle note del round e in `power_definitions`. Resta:

1. Migrazione con i due personaggi nuovi (`power_code` e `power_params`), con disegno, nome in 3D e testo di colore.
2. Test del database sul modello di `supabase/tests/four_powers_new_characters.test.sql`.
3. Simulazione sul catalogo aggiornato, per confermare i parametri.
4. Documenti: spostare la riga dalla tabella qui sopra a SPEC §4.4 (e §5.10 per l'Emergenza), WORLD.md e patch notes.
5. Pubblicazione: Edge Function, sito, migrazione.
