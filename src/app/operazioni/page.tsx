"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { BackLink } from "@/components/comic-parts";
import { CoopStarList } from "@/components/coop-room";
import { StarCount } from "@/components/story-stars";
import { LoadingScreen } from "@/components/loading-screen";
import { ReturnLink } from "@/components/return-link";
import { balance } from "@/config/balance";
import { describeServerError } from "@/lib/errors";
import {
  COOP_QUEUE_HREF,
  coopRoomHref,
  coopStarCount,
  createCoopRoom,
  fetchCoop,
  joinCoopRoom,
  seenCoop,
  type CoopCatalog,
  type CoopOperation,
} from "@/lib/coop";
import { useLockedScreen } from "@/lib/use-locked-screen";

/** The Operazioni (SPEC §5.17): the chapter, its operations, a friend's code, the room the player is in. */
export default function OperationsPage() {
  const router = useRouter();
  const { session } = useRequireSignedIn();
  const [catalog, setCatalog] = useState<CoopCatalog | null>(() => seenCoop());
  const [open, setOpen] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only the list of operations scrolls.
  useLockedScreen(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchCoop()
      .then((next) => {
        if (cancelled) return;
        setCatalog(next);
        // The operation to play next, open from the start.
        setOpen((shown) => shown ?? next.chapters.flatMap((c) => c.operations).find((o) => o.unlocked && !o.completed)?.code ?? null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function create(operation: string) {
    setBusy(true);
    setError(null);
    try {
      const room = await createCoopRoom(operation);
      router.push(coopRoomHref(room.id));
    } catch (cause) {
      setError(describeServerError(cause));
      setBusy(false);
    }
  }

  async function join(event: FormEvent) {
    event.preventDefault();
    if (code.trim().length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const room = await joinCoopRoom(code);
      router.push(coopRoomHref(room.id));
    } catch (cause) {
      setError(describeServerError(cause));
      setBusy(false);
    }
  }

  if (!catalog && !error) return <LoadingScreen label="Apertura delle Operazioni…" />;
  const room = catalog?.room ?? null;
  const queue = catalog?.queue?.queued ? catalog.queue : null;
  const players =
    catalog && catalog.min_players === catalog.max_players ? `${catalog.max_players} giocatori` : `da ${catalog?.min_players} a ${catalog?.max_players} giocatori`;

  return (
    <div className="game-shell">
      <header className="flex items-center gap-2.5 px-3 py-1">
        <BackLink href="/gioca" />
        <div className="min-w-0">
          <h1 className="font-display text-[22px] uppercase leading-6 text-comic-yellow">Operazioni</h1>
          <p className="truncate text-[11px] font-bold text-muted">In squadra, dal vivo · {players}</p>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        {error && <p className="shrink-0 text-sm font-semibold text-comic-magenta">{error}</p>}

        {queue && !room ? (
          <ReturnLink
            href={COOP_QUEUE_HREF}
            onward
            className="tile flex min-h-14 shrink-0 items-center justify-between gap-2 bg-comic-yellow px-3 py-1.5 text-black"
          >
            <span className="min-w-0">
              <span className="block font-display text-[17px] uppercase leading-5">Sei in coda</span>
              <span className="block truncate text-xs font-bold leading-4">{queue.title} · Cerca squadra</span>
            </span>
            <span className="shrink-0 -skew-x-8 bg-black px-2.5 py-1 font-display text-base uppercase text-comic-yellow">Vai</span>
          </ReturnLink>
        ) : room ? (
          <ReturnLink
            href={coopRoomHref(room.id)}
            onward
            className="tile flex min-h-14 shrink-0 items-center justify-between gap-2 bg-comic-cyan px-3 py-1.5 text-black"
          >
            <span className="min-w-0">
              <span className="block font-display text-[17px] uppercase leading-5">
                {room.status === "active" ? "Operazione in corso" : "Sei in una stanza"}
              </span>
              <span className="block truncate text-xs font-bold leading-4">
                {room.title} · codice {room.code}
              </span>
            </span>
            <span className="shrink-0 -skew-x-8 bg-black px-2.5 py-1 font-display text-base uppercase text-comic-yellow">Entra</span>
          </ReturnLink>
        ) : (
          <form onSubmit={join} className="flex shrink-0 items-center gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Codice di un amico</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                placeholder="Codice di un amico"
                autoCapitalize="characters"
                autoComplete="off"
                inputMode="text"
                className="h-11 w-full border-2 border-line bg-panel px-3 font-display text-lg uppercase tracking-[0.2em] placeholder:font-sans placeholder:text-sm placeholder:normal-case placeholder:tracking-normal placeholder:text-faint"
              />
            </label>
            <button type="submit" disabled={busy || code.length !== 6} className="btn btn-primary h-11 shrink-0 px-4">
              Entra
            </button>
          </form>
        )}

        <div data-keep-scroll="main" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {catalog?.chapters.map((chapter) => (
            <section key={chapter.chapter} className="flex flex-col gap-1.5">
              <div>
                <h2 className="flex items-center justify-between gap-2 font-display text-lg uppercase leading-6">
                  <span className="min-w-0 truncate">
                    Capitolo {chapter.chapter} · {chapter.title}
                  </span>
                  <StarCount {...coopStarCount(chapter.operations)} className="shrink-0 font-sans text-xs font-extrabold" />
                </h2>
                <p className="text-xs font-semibold leading-4 text-muted">{chapter.intro}</p>
              </div>
              {chapter.operations.map((operation) => (
                <OperationRow
                  key={operation.code}
                  operation={operation}
                  open={open === operation.code}
                  busy={busy}
                  inRoom={room !== null}
                  queued={queue !== null}
                  players={catalog.max_players}
                  onToggle={() => setOpen((shown) => (shown === operation.code ? null : operation.code))}
                  onCreate={() => void create(operation.code)}
                />
              ))}
              {chapter.outro && <p className="border-l-4 border-comic-yellow pl-2 text-xs font-semibold italic leading-4">{chapter.outro}</p>}
            </section>
          ))}
          <p className="pb-1 text-[11px] font-semibold leading-4 text-faint">
            Apri una stanza e passa il codice a un amico, oppure cerca una squadra tra chi è in coda per la stessa operazione:
            dopo {balance.coop.queueWaitSeconds} secondi si parte con chi c&apos;è e, se sei solo, con un alleato del server. Ognuno porta 6 personaggi; ogni round ci sono più Minacce che giocatori: ognuno ne
            sceglie una, insieme, prima che scada il tempo. Le Minacce lasciate andare alzano il Panico; alla fine c&apos;è il Boss.
          </p>
        </div>
      </main>
    </div>
  );
}

function OperationRow({
  operation,
  open,
  busy,
  inRoom,
  queued,
  players,
  onToggle,
  onCreate,
}: {
  operation: CoopOperation;
  open: boolean;
  busy: boolean;
  inRoom: boolean;
  queued: boolean;
  players: number;
  onToggle: () => void;
  onCreate: () => void;
}) {
  const state = operation.completed ? "✓ Completata" : operation.unlocked ? "Da fare" : "🔒";
  const reward = `${operation.reward_coins} monete${operation.reward_card ? ` e ${operation.reward_card.name}` : ""}`;
  return (
    <article className={`border-[3px] ${open ? "border-comic-yellow bg-panel-raised" : "border-panel-raised bg-panel"}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
      >
        <span className="shrink-0 -skew-x-8 bg-black px-1.5 font-display text-lg leading-6 text-comic-yellow">{operation.ord}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[17px] uppercase leading-5">{operation.title}</span>
          <span className="block truncate text-[11px] font-bold leading-4 text-muted">
            {operation.rival_name} · {operation.boss_name}
          </span>
        </span>
        {operation.completed && <StarCount earned={operation.stars.length} total={3} className="shrink-0 text-[11px] font-extrabold" />}
        <span
          className={`shrink-0 whitespace-nowrap px-1 text-[10px] font-extrabold uppercase leading-[14px] ${
            operation.completed ? "bg-comic-cyan text-black" : operation.unlocked ? "bg-comic-yellow text-black" : "text-faint"
          }`}
        >
          {state}
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 px-2.5 pb-2.5">
          <p className="text-xs font-semibold leading-4">{operation.intro}</p>
          {operation.outro && <p className="text-xs font-semibold italic leading-4 text-muted">{operation.outro}</p>}
          <OperationLevels operation={operation} players={players} />
          <CoopStarList rules={operation} earned={operation.stars} />
          <p className="text-[11px] font-bold leading-4 text-muted">
            Premio alla prima vittoria: {reward}, per ogni giocatore della squadra.
          </p>
          {operation.unlocked ? (
            inRoom || queued ? (
              <p className="text-xs font-bold text-faint">{inRoom ? "Sei già in una stanza." : "Sei già in coda per un'operazione."}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={onCreate} disabled={busy} className="btn btn-primary w-full px-2">
                  Apri una stanza
                </button>
                <ReturnLink href={`/squadra/?coda=${operation.code}`} onward className="btn btn-ghost w-full px-2">
                  Cerca squadra
                </ReturnLink>
              </div>
            )
          ) : (
            <p className="text-xs font-bold text-faint">
              Si apre vincendo l&apos;operazione prima. Puoi giocarla anche entrando nella stanza di un amico che l&apos;ha aperta.
            </p>
          )}
        </div>
      )}
    </article>
  );
}

/** The levels of every round for a full room (the Boss last): all a squad is chosen on. */
function OperationLevels({ operation, players }: { operation: Pick<CoopOperation, "rounds">; players: number }) {
  return (
    <ol className="flex gap-1" aria-label="I livelli delle Minacce, round per round">
      {operation.rounds.map((round, i) => {
        const boss = i === operation.rounds.length - 1;
        const levels = round.levels.slice(0, players + 1);
        return (
          <li
            key={round.round}
            aria-label={`${boss ? "Boss" : `Round ${round.round}`}: livelli ${levels.join(", ")}`}
            className={`flex min-w-0 flex-1 flex-col items-center px-0.5 py-0.5 ${boss ? "bg-comic-magenta text-black" : "bg-black"}`}
          >
            <span className="text-[9px] font-extrabold uppercase leading-3">{boss ? "Boss" : `R${round.round}`}</span>
            <span className="font-display text-[15px] leading-5">{levels.join("·")}</span>
          </li>
        );
      })}
    </ol>
  );
}
