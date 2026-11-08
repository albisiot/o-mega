# Poteri futuri — backlog

Poteri progettati ma **non ancora implementati**, da inserire nei prossimi aggiornamenti. Quelli già in gioco sono in `SPEC.md` §4.4 (19 poteri, ottobre-novembre 2026).

Ogni potere va su **personaggi nuovi** (due per potere, come P115-P122), senza toglierlo alle carte esistenti. Numeri e nomi sono proposte: si confermano con la simulazione prima di pubblicare.

## Regole di progetto

- **Situazionale, mai bonus generico** (SPEC §4.4). Semplice su Gamma e Beta, Distintivo su Alfa e Omega.
- **Obiettivo di forza:** da simulazione (20.000 partite Difficile contro Difficile, squadre casuali, con i modificatori), una squadra con la carta vince tra il **48% e il 54%**. Oggi Sabotatore è al 59%: nessun potere nuovo deve superarlo.
- **Emergenza:** ogni potere dice cosa fa senza avversario. Se non ha senso, non ha effetto (come Nemesi o Spia).
- **Annullatore** annulla anche i poteri nuovi, compresi gli effetti sul round dopo.

## Ondata A — solo un nuovo caso nel punteggio

Usano dati che il motore ha già (`ScoreContext`: Minaccia, squadra, personaggio avversario). Basta un `case` in `powerBonus`, una riga in `power_definitions`, la nota del round e i due personaggi.

| Potere | Codice | Livello | Effetto | Emergenza |
|---|---|---|---|---|
| **Arte di arrangiarsi** | `scrappy` | Semplice | Le abilità richieste che valgono meno di 3 contano 3. Aiuta gli specialisti sulle Minacce di livello alto | Sì |
| **Contrattacco** | `counterpunch` | Semplice | +1 per ogni abilità richiesta in cui il personaggio avversario lo supera, fino a +3 | Nessun effetto |
| **Eclettico** | `eclectic` | Semplice | +1 per ogni famiglia diversa tra le abilità richieste, fino a +4. Cresce con il livello della Minaccia | Sì |
| **Lupo solitario** | `lone_wolf` | Semplice | +3 se nessun altro personaggio della squadra è della sua fazione. È lo specchio di Legame | Sì, contato sugli 8 |
| **Opportunista** | `opportunist` | Semplice | +3 se il personaggio avversario non ha un potere, o se gli è stato annullato. Colpisce soprattutto i Delta | Nessun effetto |
| **Riflesso** | `reflect` | Semplice | Immune a Sabotatore, e il malus torna indietro: −1 a ogni abilità del Sabotatore avversario nel round | Nessun effetto |

**Riflesso** è il contrappeso diretto a Sabotatore: Schermato si limita a difendersi, Riflesso punisce. Con due sole carte nel catalogo pesa poco sulla media, ma rende rischioso schierare Sabotatore contro chi ne ha uno.

## Ondata B — piccoli dati in più al motore

Servono informazioni che oggi non arrivano al punteggio: l'esito del round prima, la sequenza dei livelli, i modificatori, i personaggi già giocati dalla squadra.

| Potere | Codice | Livello | Effetto | Dato nuovo | Emergenza |
|---|---|---|---|---|---|
| **Vendetta** | `vendetta` | Semplice | +3 se hai perso il round precedente, con qualunque personaggio. A differenza di Riscossa il bonus è suo, non di chi ha perso | Esito del round prima | Se la Minaccia precedente è fallita |
| **Grande prova** | `main_event` | Semplice | +3 contro la Minaccia di livello più alto della partita (se sono più d'una, tutte) | Livelli di tutte le Minacce | Sì, sugli 8 livelli |
| **Adattabile** | `adaptable` | Semplice | +2 contro una Minaccia con modificatore, e i malus di Territorio ostile e Sottovalutati non lo toccano | Modificatore nel contesto | Nessun effetto: l'Emergenza non ha modificatori |
| **Sacrificio** | `sacrifice` | Distintivo | Il suo punteggio conta 0, e il personaggio successivo ottiene +5. Serve a cedere un round già perso per vincere il prossimo | Bonus portato a ogni esito | Fallisce la Minaccia (conta tra le tre fallite) |
| **Capobranco** | `pack_leader` | Distintivo | Dopo averlo giocato, ogni personaggio successivo della sua fazione ha +1 fino a fine partita | Personaggi già giocati dalla squadra | Sì |

## Ondata C — meccaniche nuove

Toccano server, interfaccia o bot oltre al punteggio. Da fare una alla volta.

| Potere | Codice | Livello | Effetto | Lavoro in più |
|---|---|---|---|---|
| **Riverbero** | `echo` | Distintivo | Copia il potere del personaggio che hai giocato nel round prima. Non copia Riverbero né poteri annullati | Risolvere il potere copiato prima del punteggio; nota nel round |
| **Catalizzatore** | `catalyst` | Distintivo | Il personaggio successivo raddoppia il bonus in punti del proprio potere. Non raddoppia Riscossa e Slancio portati dal round prima | Bonus moltiplicatore portato al round dopo |
| **Nebbia** | `fog` | Distintivo | Quando lo giochi, l'avversario vede il punteggio ma non chi hai giocato, fino a fine partita. Spia non può svelarlo | `match_state_payload` nasconde la carta; i bot non la vedono; schermata del round con carta coperta |

Riverbero si chiama così, e non Eco, perché nel mondo "Eco" è il nome delle carte stesse (WORLD.md §3).

## Da decidere: tocca le regole della Conquista

Questo potere cambia SPEC §6, quindi serve una decisione esplicita prima di progettarlo nei dettagli.

| Potere | Codice | Livello | Effetto | Rischio |
|---|---|---|---|---|
| **Inafferrabile** | `elusive` | Distintivo | In Conquista non può essere conquistato: se perdi, l'avversario sceglie un'altra carta | Rende più sicuro schierare carte rare; va limitato (per esempio solo Alfa, e solo se non è l'unica carta conquistabile) |

## Ordine consigliato

1. **Riflesso**, per bilanciare Sabotatore senza toccarlo.
2. **Arte di arrangiarsi** ed **Eclettico**, perché danno valore agli specialisti e ai generalisti sulle Minacce di livello alto.
3. **Vendetta** e **Grande prova**, i più semplici dell'ondata B.
4. **Sacrificio**, il più strategico: da provare bene con i bot, perché il bot Difficile deve imparare quando cederlo.
5. L'ondata C, quando servono novità più grandi.

## Checklist per ogni potere

1. Motore (`packages/game-engine/src/scoring.ts` o `match.ts`) con test in `scoring.test.ts` / `match.test.ts`.
2. Bot: stima in `effectiveScore` per Medio e Difficile; Super Pro lo gioca già attraverso il motore.
3. Migrazione: riga in `power_definitions` e due personaggi nuovi con disegno, nome in 3D e testo di colore.
4. Interfaccia: nota del round in `src/lib/round-powers.ts` e testo del potere nel dettaglio carta.
5. Emergenza: comportamento verificato nel motore e nella tabella di SPEC §5.10.
6. Simulazione di bilanciamento (48-54%) prima di pubblicare.
7. Documenti: SPEC §4.4, WORLD.md, patch notes.
