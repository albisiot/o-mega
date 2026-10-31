"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { PageHeader } from "@/components/comic-parts";
import { LoadingScreen } from "@/components/loading-screen";
import { balance } from "@/config/balance";
import { describeServerError } from "@/lib/errors";
import {
  DIFFICULTY_LABELS,
  fetchActiveMatch,
  fetchConquestStatus,
  forfeitMatch,
  type ActiveMatch,
  type ConquestStatus,
} from "@/lib/match";

const BOTS = [
  { difficulty: "easy", detail: "Sceglie quasi a caso. Ideale per imparare." },
  { difficulty: "medium", detail: "Gioca sempre il personaggio migliore per la Minaccia del momento." },
  { difficulty: "hard", detail: "Pianifica: tiene da parte specialisti e generalisti per i round giusti." },
  { difficulty: "super_pro", detail: "Simula mille partite possibili prima di ogni mossa." },
] as const;

const MODES = [
  { key: "bot", label: "Contro bot", detail: "Allenati senza rischiare nulla", color: "bg-comic-cyan" },
  { key: "friendly", label: "Amichevole online", detail: "Sfida un giocatore o un amico", color: "bg-comic-yellow" },
  { key: "conquest", label: "Conquista", detail: "Chi vince prende una carta", color: "bg-comic-magenta" },
] as const;

type ModeKey = (typeof MODES)[number]["key"];

function BotSection({ disabled }: { disabled: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-muted">Per allenarti: nessuna carta in gioco e nessuna moneta.</p>
      {BOTS.map((bot) => (
        <Link
          key={bot.difficulty}
          href={disabled ? "#" : `/squadra/?difficulty=${bot.difficulty}`}
          aria-disabled={disabled}
          className={`row-link ${disabled ? "pointer-events-none opacity-40" : ""}`}
        >
          <div>
            <p className="font-display text-xl uppercase">{DIFFICULTY_LABELS[bot.difficulty]}</p>
            <p className="text-sm font-medium text-muted">{bot.detail}</p>
          </div>
          <span className="font-display text-2xl text-comic-yellow" aria-hidden>
            →
          </span>
        </Link>
      ))}
    </div>
  );
}

function ConquestSection({ status, disabled }: { status: ConquestStatus | null; disabled: boolean }) {
  const { maxCardsLostPerDay, unlockAfterMatches, unlockAtLevel, loserCoins, minConquerableCards } = balance.conquest;
  const limitReached = status !== null && status.cards_lost_today >= maxCardsLostPerDay;
  const available = status?.unlocked && !limitReached && !disabled;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-muted">
        Chi vince prende una carta dell&apos;avversario, chi perde guadagna {loserCoins} monete. Si rischia solo ciò
        che si porta in campo: servono almeno {minConquerableCards} carte non starter.
      </p>
      {available ? (
        <Link href="/squadra/?mode=conquest" className="flex min-h-14 items-center justify-between gap-3 bg-comic-magenta px-4 py-2.5 text-black">
          <div>
            <p className="font-display text-xl uppercase">Cerca un avversario</p>
            <p className="text-sm font-semibold">
              Un avversario del tuo livello. Carte perse oggi: {status?.cards_lost_today}/{maxCardsLostPerDay}.
            </p>
          </div>
          <span className="font-display text-2xl" aria-hidden>
            →
          </span>
        </Link>
      ) : (
        <div className="bg-panel px-4 py-3">
          <p className="font-display text-lg uppercase text-faint">Non disponibile</p>
          <p className="text-sm font-medium text-muted">
            {status && !status.unlocked
              ? `Completa ${unlockAfterMatches} partite (${status.completed_matches}/${unlockAfterMatches}) o raggiungi il livello ${unlockAtLevel} (sei al ${status.level}).`
              : limitReached
                ? `Hai perso ${maxCardsLostPerDay} carte oggi: la Conquista torna dopo la mezzanotte.`
                : "Finisci prima la partita in corso."}
          </p>
        </div>
      )}
    </div>
  );
}

/** Friendly matches against other players: random opponent or friend code. */
function FriendlySection({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");

  return (
    <div className={`flex flex-col gap-3 ${disabled ? "pointer-events-none opacity-40" : ""}`}>
      <p className="text-sm font-medium text-muted">
        Solo per divertimento: nessuna carta in gioco e nessuna moneta. Con un codice sfidi un amico.
      </p>
      <Link href="/squadra/?mode=queue" className="flex min-h-14 items-center justify-between gap-3 bg-comic-yellow px-4 py-2.5 text-black">
        <div>
          <p className="font-display text-xl uppercase">Cerca un avversario</p>
          <p className="text-sm font-semibold">Sfida il primo giocatore disponibile.</p>
        </div>
        <span className="font-display text-2xl" aria-hidden>
          →
        </span>
      </Link>
      <Link href="/squadra/?mode=lobby" className="row-link">
        <div>
          <p className="font-display text-xl uppercase">Crea un codice</p>
          <p className="text-sm font-medium text-muted">Mandalo a un amico per sfidarlo.</p>
        </div>
        <span className="font-display text-2xl text-comic-yellow" aria-hidden>
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
          aria-label="Codice dell'amico"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="input-comic min-w-0 flex-1 uppercase tracking-[0.2em] placeholder:normal-case placeholder:tracking-normal"
        />
        <button type="submit" disabled={normalized.length !== 6} className="btn btn-outline">
          Entra
        </button>
      </form>
    </div>
  );
}

export default function PlayPage() {
  const { session } = useRequireSignedIn();
  const [active, setActive] = useState<ActiveMatch | null | undefined>(undefined);
  const [conquest, setConquest] = useState<ConquestStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const [openMode, setOpenMode] = useState<ModeKey | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    Promise.all([fetchActiveMatch(), fetchConquestStatus()])
      .then(([match, status]) => {
        if (cancelled) return;
        setActive(match);
        setConquest(status);
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

  if (!session) return <LoadingScreen />;

  // The modes wait for the answer: a match in progress would block them anyway.
  const blocked = Boolean(active) || (active === undefined && !error);

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader backHref="/" backLabel="Home" title="Gioca" />

      <main className="flex flex-1 flex-col gap-6 px-3 pb-6">
        {error && <p className="text-sm font-semibold text-comic-magenta">{error}</p>}

        {active && (
          <section className="flex flex-col gap-3 bg-comic-cyan p-4 text-black">
            <p className="font-display text-2xl uppercase">Hai una partita in corso</p>
            <p className="text-sm font-semibold">
              {active.mode === "bot"
                ? `Contro il bot ${DIFFICULTY_LABELS[active.bot_difficulty ?? "easy"]}`
                : active.mode === "conquest"
                  ? "Conquista contro un giocatore"
                  : "Amichevole contro un giocatore"}{" "}
              · round {active.current_round}
            </p>
            {confirmForfeit ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold">Abbandonare conta come sconfitta, senza monete.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => forfeit(active.id)} className="btn btn-danger flex-1">
                    Abbandona
                  </button>
                  <button type="button" onClick={() => setConfirmForfeit(false)} className="btn btn-ghost">
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  href={`/partita/?id=${active.id}`}
                  className="btn flex-1 bg-black font-display text-lg uppercase tracking-wide text-comic-yellow"
                >
                  Riprendi
                </Link>
                <button type="button" onClick={() => setConfirmForfeit(true)} className="btn btn-ghost">
                  Abbandona
                </button>
              </div>
            )}
          </section>
        )}

        {MODES.map((mode) => {
          const open = openMode === mode.key;
          return (
            <section key={mode.key} className="flex flex-col gap-3">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenMode(open ? null : mode.key)}
                className={`cut-both speed-lines flex min-h-24 w-full items-center justify-between gap-3 px-4 py-3 text-left text-black ${mode.color}`}
              >
                <div>
                  <h2 className="-skew-x-8 font-display text-3xl uppercase">{mode.label}</h2>
                  <p className="mt-1 text-sm font-bold">{mode.detail}</p>
                </div>
                <span className="font-display text-2xl" aria-hidden>
                  {open ? "↓" : "→"}
                </span>
              </button>
              {open && mode.key === "bot" && <BotSection disabled={blocked} />}
              {open && mode.key === "friendly" && <FriendlySection disabled={blocked} />}
              {open && mode.key === "conquest" && <ConquestSection status={conquest} disabled={blocked} />}
            </section>
          );
        })}
      </main>
    </div>
  );
}
