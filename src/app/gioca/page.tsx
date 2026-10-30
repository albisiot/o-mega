"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { balance } from "@/config/balance";
import { describeServerError } from "@/lib/errors";
import { DIFFICULTY_LABELS, fetchActiveMatch, forfeitMatch, type ActiveMatch } from "@/lib/match";

const BOTS = [
  { difficulty: "easy", detail: "Sceglie quasi a caso. Ideale per imparare." },
  { difficulty: "medium", detail: "Gioca sempre il personaggio migliore per la Minaccia del momento." },
  { difficulty: "hard", detail: "Pianifica: tiene da parte specialisti e generalisti per i round giusti." },
] as const;

/** Friendly matches against other players: random opponent or friend code. */
function FriendlySection({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");

  return (
    <section className={`flex flex-col gap-3 ${disabled ? "pointer-events-none opacity-40" : ""}`}>
      <div>
        <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500">Amichevole online</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Nessuna carta in gioco. Vittoria +{balance.economy.winCoins} monete, sconfitta o pareggio +
          {balance.economy.participationCoins}, fino a {balance.economy.dailyMatchCoinCap} al giorno.
        </p>
      </div>
      <Link
        href="/squadra/?mode=queue"
        className="flex items-center justify-between rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3"
      >
        <div>
          <p className="font-semibold">Cerca un avversario</p>
          <p className="text-xs text-zinc-400">Sfida il primo giocatore disponibile.</p>
        </div>
        <span className="text-zinc-500" aria-hidden>
          →
        </span>
      </Link>
      <Link
        href="/squadra/?mode=lobby"
        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
      >
        <div>
          <p className="font-semibold">Crea un codice</p>
          <p className="text-xs text-zinc-400">Mandalo a un amico per sfidarlo.</p>
        </div>
        <span className="text-zinc-500" aria-hidden>
          →
        </span>
      </Link>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (normalized.length === 6) router.push(`/squadra/?mode=join&code=${normalized}`);
        }}
      >
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          maxLength={6}
          placeholder="Codice dell'amico"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-base uppercase tracking-[0.3em] outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          disabled={normalized.length !== 6}
          className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-40"
        >
          Entra
        </button>
      </form>
    </section>
  );
}

export default function PlayPage() {
  const { session } = useRequireSignedIn();
  const [active, setActive] = useState<ActiveMatch | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [confirmForfeit, setConfirmForfeit] = useState(false);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchActiveMatch()
      .then((match) => {
        if (!cancelled) setActive(match);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function forfeit(matchId: string) {
    try {
      await forfeitMatch(matchId);
      setActive(null);
      setConfirmForfeit(false);
    } catch (cause) {
      setError(describeServerError(cause));
    }
  }

  if (active === undefined && !error) return <LoadingScreen />;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-5 py-4">
        <Link href="/" className="text-sm text-zinc-300">
          ← Home
        </Link>
        <h1 className="text-base font-semibold">Gioca</h1>
        <span className="w-12" />
      </header>

      <main className="flex flex-1 flex-col gap-6 px-5 pb-10">
        {error && <p className="text-sm text-red-400">{error}</p>}

        {active && (
          <section className="flex flex-col gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4">
            <p className="font-semibold">Hai una partita in corso</p>
            <p className="text-sm text-zinc-300">
              {active.mode === "bot"
                ? `Contro il bot ${DIFFICULTY_LABELS[active.bot_difficulty ?? "easy"]}`
                : "Amichevole contro un giocatore"}{" "}
              · round {active.current_round}
            </p>
            {confirmForfeit ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-zinc-300">Abbandonare conta come sconfitta, senza monete.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => forfeit(active.id)}
                    className="flex-1 rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white"
                  >
                    Abbandona
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmForfeit(false)}
                    className="rounded-full border border-white/15 px-4 py-2 text-sm"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  href={`/partita/?id=${active.id}`}
                  className="flex-1 rounded-full bg-amber-400 px-4 py-2 text-center text-sm font-bold text-zinc-950"
                >
                  Riprendi
                </Link>
                <button
                  type="button"
                  onClick={() => setConfirmForfeit(true)}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm"
                >
                  Abbandona
                </button>
              </div>
            )}
          </section>
        )}

        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500">Contro un bot</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Amichevole: nessuna carta in gioco. Vittoria +{balance.economy.botWinCoins} monete, sconfitta o pareggio +
              {balance.economy.botParticipationCoins}, fino a {balance.economy.botDailyCoinCap} al giorno.
            </p>
          </div>
          {BOTS.map((bot) => (
            <Link
              key={bot.difficulty}
              href={active ? "#" : `/squadra/?difficulty=${bot.difficulty}`}
              aria-disabled={Boolean(active)}
              className={`flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 ${
                active ? "pointer-events-none opacity-40" : ""
              }`}
            >
              <div>
                <p className="font-semibold">{DIFFICULTY_LABELS[bot.difficulty]}</p>
                <p className="text-xs text-zinc-400">{bot.detail}</p>
              </div>
              <span className="text-zinc-500" aria-hidden>
                →
              </span>
            </Link>
          ))}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 opacity-40">
            <div>
              <p className="font-semibold">{DIFFICULTY_LABELS.super_pro}</p>
              <p className="text-xs text-zinc-400">Simula migliaia di partite prima di ogni mossa.</p>
            </div>
            <span className="text-xs text-zinc-500">Presto</span>
          </div>
        </section>

        <FriendlySection disabled={Boolean(active)} />

        <section className="flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500">Conquista</h2>
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 opacity-40">
            <div>
              <p className="font-semibold">Conquista</p>
              <p className="text-xs text-zinc-400">Chi vince prende una carta dell&apos;avversario.</p>
            </div>
            <span className="text-xs text-zinc-500">Presto</span>
          </div>
        </section>
      </main>
    </div>
  );
}
