# O-MEGA

Gioco di carte collezionabili multiplayer: apri un pacchetto al giorno, colleziona supereroi e supercattivi, sfida altri giocatori e conquista le loro carte.

- Specifica: [`docs/SPEC.md`](docs/SPEC.md)
- Contesto e regole per lo sviluppo: [`CLAUDE.md`](CLAUDE.md)

## Stack

Next.js (App Router, export statico) + TypeScript + Tailwind CSS, installabile come PWA. Backend su Supabase (Auth, Postgres con RLS, Realtime, RPC, Edge Functions). Deploy su GitHub Pages tramite GitHub Actions.

## Sviluppo locale

Requisiti: Node.js 24 o superiore.

```bash
npm install
cp .env.example .env.local   # poi inserisci URL e chiave pubblica di Supabase
npm run dev                  # http://localhost:3000
```

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Server di sviluppo con hot reload |
| `npm run build` | Export statico nella cartella `out/` |
| `npm run preview` | Serve `out/` come GitHub Pages (rispetta `NEXT_PUBLIC_BASE_PATH`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Controllo dei tipi TypeScript |
| `npm test` | Test Vitest |
| `npm run test:db` | Test SQL sul progetto Supabase collegato (in transazione annullata) |
| `npm run db:push` | Applica le migrazioni al progetto Supabase |
| `npm run db:types` | Rigenera i tipi TypeScript dallo schema |
| `npm run functions:deploy` | Pubblica la Edge Function `match` (partite contro i bot) |

Configurazione di Supabase, login Google e CLI: [`docs/SETUP.md`](docs/SETUP.md).

## Deploy

Ogni push su `main` esegue `.github/workflows/deploy.yml`: lint, controllo dei tipi, test, build e pubblicazione su GitHub Pages. Il `basePath` viene impostato automaticamente dal workflow.

Secret richiesti nel repository (Settings → Secrets and variables → Actions):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Struttura

```
.github/workflows/   deploy su GitHub Pages
docs/                specifica del gioco
packages/game-engine motore di regole puro (M6)
public/              icone PWA e service worker
scripts/             script di supporto (anteprima dell'export)
src/app/             pagine (App Router, solo statiche/client)
src/components/      componenti UI
src/config/          valori di bilanciamento
src/lib/             client Supabase e utilità
supabase/            configurazione, migrazioni ed Edge Functions
```
