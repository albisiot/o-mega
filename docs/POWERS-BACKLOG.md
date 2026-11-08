# Poteri futuri — backlog

Poteri pronti per i prossimi aggiornamenti. Quelli già sulle carte sono in `SPEC.md` §4.4 (19 poteri, ottobre-novembre 2026).

**Stato (9 novembre 2026):** 14 poteri sono **pronti nel motore di regole, nei bot, nelle note del round e nel database** (`power_definitions`), ma **nessuna carta li ha**. Per farli entrare in gioco basta creare i personaggi che li portano. Inafferrabile resta solo un'idea, perché cambia la Conquista.

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
| **Sacrificio** | `sacrifice` (`bonus` 5) | Il suo punteggio conta 0 (perde anche il bonus ricevuto dal round prima), e il personaggio successivo ottiene +5 qualunque sia l'esito. **Da riprogettare:** vedi Bilanciamento | Fallisce la Minaccia (conta tra le tre fallite), poi passa il bonus |
| **Capobranco** | `pack_leader` (`bonus` 1) | Dopo di lui, ogni personaggio successivo della sua fazione ha +1 fino a fine partita | Sì |
| **Riverbero** | `echo` (nessuno) | Copia il potere del personaggio giocato nel round prima, se è un potere che dà solo punti al suo personaggio (Specialità, Apripista, Nemesi, Vendetta…). Non copia Sabotatore, Annullatore, Implacabile, Spia, Veggente, Riscossa, Slancio, Schermato, Riflesso, Adattabile né i distintivi nuovi | Sì |
| **Catalizzatore** | `catalyst` (`multiplier` 2) | Il personaggio successivo raddoppia il bonus del proprio potere. Non raddoppia il bonus portato dal round prima né Capobranco | Sì |
| **Nebbia** | `fog` (nessuno) | L'avversario vede il punteggio ma non chi hai giocato, fino a fine partita | Nessun effetto |

Riverbero si chiama così, e non Eco, perché nel mondo "Eco" è il nome delle carte stesse (WORLD.md §3). Copia solo i poteri a punti perché così la copia vive tutta nel calcolo del punteggio: il server, le rivelazioni e lo schermo non devono saperne nulla.

**Nebbia non è ancora finita.** Il motore e i bot la conoscono già, ma il server mostra ancora la carta all'avversario. Prima di darla a un personaggio servono:
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
| Sacrificio | +5 | 36,4% | 52,3% | **−15,9** |
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
- **Sacrificio così non funziona:** anche con +10 al prossimo la squadra vince 12 punti percentuali in meno (con +8, 14 in meno), perché cedere un round su cinque costa più di qualunque bonus. Va riprogettato prima di darlo a una carta, per esempio come carta debole che passa il bonus solo se perde, o con un bonus che dura fino a fine partita.

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
