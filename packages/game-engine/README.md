# game-engine

Motore di regole del minigioco (SPEC §5). Viene implementato nella milestone M6.

Vincoli:

- TypeScript puro e deterministico: niente I/O, niente `Date.now()` o `Math.random()` interni (l'RNG si passa come parametro).
- Nessuna dipendenza da Node o da Next.js: lo importano sia il frontend (anteprime, modalità bot) sia le Edge Functions di Supabase (Deno).
- Import relativi con estensione esplicita (`./score.ts`) per restare compatibile con Deno.
- I valori di bilanciamento arrivano come parametri, non importati direttamente da `src/config/balance.ts`.
- Ogni regola è coperta da test Vitest (`*.test.ts` accanto ai sorgenti).
