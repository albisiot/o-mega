# CLAUDE.md — O-MEGA (gioco di carte collezionabili multiplayer)

Questo file dà a Claude Code il contesto del progetto. La specifica completa è in `docs/SPEC.md`: leggila prima di iniziare qualsiasi milestone.

## Il progetto in una riga

Web app (PWA, usabile da iPhone) in cui ogni giocatore apre un pacchetto gratuito al giorno, colleziona carte di supereroi e supercattivi, le usa in sfide 1 contro 1 da circa 3 minuti e può **conquistare** carte dell'avversario vincendo.

Principio: **aprire, collezionare, giocare, conquistare.**

## Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS, in **export statico** (`output: 'export'`), configurato come PWA installabile.
- **Backend:** Supabase: Auth (login Google), Postgres con Row Level Security, Realtime per le partite, funzioni RPC Postgres ed Edge Functions per tutta la logica autoritativa.
- **Codice e deploy:** repository su **GitHub**; il sito è pubblicato su **GitHub Pages** tramite GitHub Actions a ogni push sul branch `main`. Niente Vercel.
- **Test:** Vitest per il motore di regole e la logica di economia.

## Vincoli dell'export statico (GitHub Pages)

Il sito è solo un insieme di file statici: **tutta la logica lato server sta in Supabase**. Di conseguenza:

- **Vietati:** API route di Next.js (`app/api`), Server Actions, middleware, `cookies()`/`headers()`, rendering lato server dinamico, ottimizzazione immagini di Next (`images.unoptimized: true`).
- **Componenti client** per tutto ciò che legge dati: i dati si caricano nel browser tramite il client Supabase (`@supabase/supabase-js`).
- **Niente route dinamiche con ID a runtime** (es. `/partita/[id]`): usare query string (`/partita?id=...`), perché l'export statico non può generare pagine per ID che non conosce.
- **`basePath` configurabile** tramite variabile d'ambiente (`NEXT_PUBLIC_BASE_PATH`, es. `/o-mega` su GitHub Pages, vuoto in locale). Tutti i link e gli asset (manifest, icone, service worker) devono rispettarlo. Usare `trailingSlash: true`.
- **Login Google lato browser** con flusso PKCE di Supabase: una pagina `/auth/callback` client-side completa la sessione. Gli URL di redirect (locale e GitHub Pages) vanno registrati in Supabase.
- **Chiavi:** nel frontend solo l'URL di Supabase e la chiave pubblica (anon/publishable), passate come `NEXT_PUBLIC_*` e salvate come secret di GitHub Actions. La chiave `service_role` **non deve mai** finire nel repository né nel frontend: il repository potrebbe essere pubblico.
- **Logica server complessa** (es. bot, simulazioni Super Pro) in **Supabase Edge Functions** (Deno). Il motore di regole deve quindi essere TypeScript puro senza dipendenze Node, importabile sia da Next.js sia dalle Edge Functions.

## Regole d'oro (non negoziabili)

1. **Il server è autoritativo.** Apertura pacchetti (RNG), esito dei round, esito della partita, trasferimenti di carte e movimenti di monete avvengono solo lato server. Il client invia intenzioni e mostra animazioni; non calcola mai risultati che contano.
2. **Mai fidarsi del client.** Ogni RPC verifica proprietà delle carte, stato della partita, scadenze e limiti.
3. **Transazioni atomiche.** Ogni trasferimento di carta e ogni movimento di monete avviene in una singola transazione Postgres e viene registrato in un ledger (`card_transfers`, `coin_ledger`). I saldi si possono sempre ricostruire dal ledger.
4. **Le carte sono istanze.** `card_definitions` è il catalogo; `card_instances` sono le copie possedute, ciascuna con ID unico e proprietario. Non usare mai contatori di quantità al posto delle istanze.
5. **RLS attiva su ogni tabella.** I client leggono solo ciò che li riguarda; le scritture passano esclusivamente da funzioni `security definer`.
6. **Il motore di regole è puro.** La logica del minigioco vive in `packages/game-engine` (o `src/lib/game-engine`): TypeScript puro, deterministico, senza I/O, coperto da test. Lo usano sia il server sia la modalità contro bot.
7. **Orario di riferimento:** il reset giornaliero avviene a mezzanotte `Europe/Rome`, calcolato lato server. Mai usare il fuso del dispositivo.

## Convenzioni

- **Interfaccia utente in italiano.** Codice, nomi di tabelle, colonne, variabili e commenti in inglese.
- Valori numerici di bilanciamento (probabilità, ricompense, limiti, timer) in un unico file di configurazione (`src/config/balance.ts` e tabella `game_config` lato DB), mai sparsi nel codice.
- Migrazioni Supabase versionate in `supabase/migrations/` (Supabase CLI); Edge Functions in `supabase/functions/`.
- File `.env.example` con le variabili necessarie; `.env.local` mai committato.
- Commit piccoli e frequenti, uno o più per milestone, con messaggi chiari.
- Componenti mobile-first: il target principale è lo schermo di un iPhone.

## Come lavorare

- Procedi per milestone, nell'ordine indicato in `docs/SPEC.md` §12. Alla fine di ogni milestone l'app deve essere funzionante e testabile.
- Le **decisioni aperte** sono elencate in `docs/SPEC.md` §13 con un valore di default: usa il default e non bloccarti; segnala nel riepilogo cosa hai assunto.
- **Non modificare le regole del gioco** (SPEC §5 e §6) di tua iniziativa: se trovi un problema di bilanciamento o un exploit, segnalalo e proponi una soluzione.
- I contenuti (nomi, testi, immagini delle carte) sono **segnaposto** finché l'universo non è definito: usa dati di seed chiaramente provvisori.
