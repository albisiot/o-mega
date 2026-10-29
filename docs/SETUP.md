# Configurazione dei servizi

Passi da fare una volta sola (o quando si ricrea un ambiente). Nessun segreto va nel repository.

## 1. Supabase

Progetto `o-mega` (ref `abjzzmscymwiavungvic`, regione Central EU - Frankfurt), organizzazione dedicata, piano Free.

- **Data API** attiva; **"Automatically expose new tables" disattivato**: ogni migrazione concede i permessi in modo esplicito.
- Chiavi per il frontend: Project URL e Publishable key (Project Settings → API Keys). Vanno in `.env.local` e nei secret di GitHub Actions. La Secret key / `service_role` non esce mai da Supabase.

### URL di autenticazione

Authentication → URL Configuration:

- **Site URL:** `https://albisiot.github.io/o-mega/`
- **Redirect URLs:**
  - `https://albisiot.github.io/o-mega/auth/callback/`
  - `http://localhost:3000/auth/callback/`
  - `http://localhost:4173/auth/callback/`

## 2. Login con Google

1. [Google Cloud Console](https://console.cloud.google.com): progetto **O-MEGA**.
2. **Google Auth Platform** → Inizia: nome app `O-MEGA`, pubblico **Esterno**, email di assistenza e di contatto.
3. **Clients** → Crea client → **Applicazione web**:
   - Origini JavaScript autorizzate: `https://albisiot.github.io`, `http://localhost:3000`
   - URI di reindirizzamento autorizzati: `https://abjzzmscymwiavungvic.supabase.co/auth/v1/callback`
4. **Pubblico**: in stato "Test" possono accedere solo gli utenti di test elencati (massimo 100). Per aprire il gioco a tutti: "Pubblica app" (gli scope usati, email e profilo, non richiedono la verifica di Google).
5. Supabase → Authentication → Sign In / Providers → **Google**: attiva e incolla Client ID e Client secret.

## 3. Supabase CLI

La CLI è una dipendenza di sviluppo (`npx supabase ...`). Non serve Docker: si lavora direttamente sul progetto remoto.

```bash
npx supabase login
npx supabase link --project-ref abjzzmscymwiavungvic
```

Comandi del progetto:

| Comando | Cosa fa |
|---|---|
| `npm run db:push` | Applica al progetto le migrazioni nuove di `supabase/migrations/` |
| `npm run db:types` | Rigenera `src/types/database.ts` dallo schema |
| `npm run test:db` | Esegue i test SQL in una transazione annullata (nessun dato resta nel database) |

## 4. GitHub

- Pages: sorgente **GitHub Actions** (Settings → Pages).
- Secret (Settings → Secrets and variables → Actions): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
