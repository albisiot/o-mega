"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { ComicBurst, PageHeader } from "@/components/comic-parts";
import { LoadingScreen } from "@/components/loading-screen";
import { balance } from "@/config/balance";
import { WORLD_SEARCH_LINES } from "@/config/world";
import { BASE_PATH } from "@/lib/base-path";
import { describeServerError } from "@/lib/errors";
import {
  asMatchFormat,
  cancelLobby,
  fetchActiveMatch,
  fetchMyLobby,
  joinQueue,
  leaveQueue,
  readPendingTeam,
  subscribeToUpdates,
  type Lobby,
  type MatchFormat,
  type QueueMode,
} from "@/lib/match";
import { QUADRANT_GRID_LABELS } from "@/lib/quadrant";
import { formatCountdown, useNow } from "@/lib/use-now";

const SEARCH_LINE_SECONDS = 4;
// The server ignores a queue entry not refreshed for queueStaleSeconds:
// refreshing at 2/5 of that leaves room for one lost request.
const QUEUE_REFRESH_MS = (balance.matchmaking.queueStaleSeconds * 1000 * 2) / 5;
// A friend code's host learns of the match from the broadcast; this is the fallback.
const LOBBY_CHECK_MS = 10_000;

// /attesa/?mode=queue | /attesa/?mode=lobby
export default function WaitingPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <WaitingContent />
    </Suspense>
  );
}

function WaitingContent() {
  const params = useSearchParams();
  const mode = params.get("mode") === "lobby" ? "lobby" : "queue";
  const queueMode: QueueMode = params.get("type") === "conquest" ? "conquest" : "friendly";
  // A Grande Minaccia, an Allarme Triplo and a Quadrante are friendly only.
  const asked = asMatchFormat(params.get("format"));
  const format: MatchFormat = queueMode === "friendly" ? asked : "classic";
  const { session } = useRequireSignedIn();
  if (!session) return <LoadingScreen />;
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader backHref="/gioca" backLabel="Gioca" title={mode === "lobby" ? "Sfida un amico" : "Ricerca avversario"} />
      {mode === "lobby" ? (
        <LobbyWait userId={session.user.id} />
      ) : (
        <QueueWait userId={session.user.id} queueMode={queueMode} format={format} />
      )}
    </div>
  );
}

/** Goes to the player's running match, if there is one. */
function goToActiveMatch(onStart: (matchId: string) => void) {
  fetchActiveMatch()
    .then((match) => {
      if (match) onStart(match.id);
    })
    .catch(() => {});
}

/**
 * Goes to the match as soon as the server says it started. `checkEveryMs`
 * also asks the server now and then, in case a broadcast is missed.
 */
function useMatchStart(userId: string, onStart: (matchId: string) => void, checkEveryMs: number | null) {
  const onStartRef = useRef(onStart);
  useEffect(() => {
    onStartRef.current = onStart;
  });
  useEffect(() => {
    const unsubscribe = subscribeToUpdates(`player:${userId}`, (payload) => {
      if (payload.kind === "match_started" && typeof payload.match_id === "string") onStartRef.current(payload.match_id);
    });
    const timer = checkEveryMs === null ? undefined : setInterval(() => goToActiveMatch(onStartRef.current), checkEveryMs);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [userId, checkEveryMs]);
}

function QueueWait({ userId, queueMode, format }: { userId: string; queueMode: QueueMode; format: MatchFormat }) {
  const router = useRouter();
  const [team] = useState(readPendingTeam);
  const [startedAt] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const matched = useRef(false);
  const now = useNow(1000);

  const goToMatch = (matchId: string) => {
    if (matched.current) return;
    matched.current = true;
    router.replace(`/partita/?id=${matchId}`);
  };
  // Joining tells us about the match itself: no other check is needed.
  useMatchStart(userId, goToMatch, null);

  // Joining again refreshes our place in the queue and retries the pairing,
  // QUEUE_REFRESH_MS after the previous attempt started (one that does not
  // answer by then is given up). In Conquest one attempt also comes right
  // after the wait for a bot is over, counted from the first entry stored.
  useEffect(() => {
    if (!team) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let botAt = Infinity;
    const next = (attemptedAt: number) => {
      if (stopped || matched.current) return;
      const now = Date.now();
      const refresh = Math.max(0, attemptedAt + QUEUE_REFRESH_MS - now);
      const untilBot = botAt - now;
      timer = setTimeout(attempt, untilBot > 0 ? Math.min(refresh, untilBot) : refresh);
    };
    const attempt = () => {
      const attemptedAt = Date.now();
      joinQueue(team, queueMode, QUEUE_REFRESH_MS, format)
        .then((result) => {
          setError(null);
          if (result.matched && result.match_id) goToMatch(result.match_id);
          else if (queueMode === "conquest" && botAt === Infinity) {
            botAt = Date.now() + (balance.matchmaking.conquestBotAfterSeconds + 1) * 1000;
          }
        })
        .catch((cause: unknown) => {
          // Paired by someone else meanwhile.
          if (cause instanceof Error && cause.message === "match_already_active") goToActiveMatch(goToMatch);
          else setError(describeServerError(cause));
        })
        .finally(() => next(attemptedAt));
    };
    timer = setTimeout(attempt, 0);
    return () => {
      stopped = true;
      clearTimeout(timer);
      if (!matched.current) leaveQueue().catch(() => {});
    };
    // goToMatch only reads refs and the router.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, queueMode, format]);

  if (!team) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold">Scegli prima la tua squadra.</p>
        <Link
          href={
            queueMode === "conquest" ? "/squadra/?mode=conquest" : format === "classic" ? "/squadra/?mode=queue" : `/squadra/?mode=queue&format=${format}`
          }
          className="btn btn-outline"
        >
          Scegli la squadra
        </Link>
      </main>
    );
  }

  const waited = Math.max(0, Math.floor((now - startedAt) / 1000));
  const line = Math.floor(waited / SEARCH_LINE_SECONDS);
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
        <div className="rays-dark animate-rays-spin absolute left-1/2 top-1/2 h-[200vmax] w-[200vmax] -translate-x-1/2 -translate-y-1/2" />
      </div>
      <ComicBurst
        fill="#ffd60a"
        className="animate-search-burst relative h-36 w-36"
        textClassName="text-[34px] tracking-wide"
      >
        CERCO!
      </ComicBurst>
      <div>
        <p className="font-display text-3xl uppercase">
          {queueMode === "conquest"
            ? "Ricerca di un avversario per la Conquista…"
            : format === "boss"
              ? "Ricerca di un avversario per la Grande Minaccia…"
              : format === "triple"
                ? "Ricerca di un avversario per Allarme Triplo…"
                : format === "quadrant" || format === "quadrant_shifting"
                  ? `Ricerca di un avversario per Quadrante (${QUADRANT_GRID_LABELS[format].toLowerCase()})…`
                  : "Ricerca di un avversario…"}
        </p>
        <p className="mt-1 font-display text-2xl text-comic-yellow">{waited} s</p>
        <p key={line} className="animate-panel-fade mt-1 text-sm font-semibold text-comic-cyan">
          {WORLD_SEARCH_LINES[line % WORLD_SEARCH_LINES.length]}
        </p>
      </div>
      {error && <p className="text-sm font-semibold text-comic-magenta">{error}</p>}
      {queueMode === "conquest" && (
        <p className="max-w-xs text-sm font-semibold">
          Se non arriva nessuno, dopo {balance.matchmaking.conquestBotAfterSeconds} secondi sfiderai un bot a caso. Le
          carte restano in palio: puoi vincerne una o perderla.
        </p>
      )}
      {queueMode !== "conquest" && waited >= balance.matchmaking.suggestBotAfterSeconds && (
        <div className="flex flex-col items-center gap-3 bg-panel p-4">
          <p className="text-sm font-semibold">Nessun avversario disponibile al momento.</p>
          <Link href="/gioca" className="btn btn-outline">
            Gioca contro un bot
          </Link>
        </div>
      )}
      <Link href="/gioca" className="btn btn-ghost">
        Annulla
      </Link>
    </main>
  );
}

function LobbyWait({ userId }: { userId: string }) {
  const router = useRouter();
  const [lobby, setLobby] = useState<Lobby | null | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);
  const started = useRef(false);
  const now = useNow(1000);

  useMatchStart(
    userId,
    (matchId) => {
      if (started.current) return;
      started.current = true;
      router.replace(`/partita/?id=${matchId}`);
    },
    LOBBY_CHECK_MS,
  );

  useEffect(() => {
    let cancelled = false;
    fetchMyLobby()
      .then((value) => {
        if (!cancelled) setLobby(value);
      })
      .catch(() => {
        if (!cancelled) setLobby(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function share(code: string) {
    const url = `${window.location.origin}${BASE_PATH}/squadra/?mode=join&code=${code}`;
    const text = `Sfidami a O-MEGA! Codice ${code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "O-MEGA", text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setNotice("Link copiato.");
      }
    } catch {
      // The player closed the share sheet.
    }
  }

  async function cancel() {
    await cancelLobby().catch(() => {});
    router.push("/gioca");
  }

  if (lobby === undefined) return <LoadingScreen />;
  const remaining = lobby ? Date.parse(lobby.expires_at) - now : 0;
  if (!lobby || remaining <= 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold">{lobby ? "Il codice è scaduto." : "Nessun codice attivo."}</p>
        <Link href="/squadra/?mode=lobby" className="btn btn-outline">
          Crea un nuovo codice
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-base font-semibold">
        {lobby.format === "boss"
          ? "Grande Minaccia: dai questo codice al tuo amico:"
          : lobby.format === "triple"
            ? "Allarme Triplo: dai questo codice al tuo amico (gli servono 9 carte):"
            : lobby.format === "quadrant" || lobby.format === "quadrant_shifting"
              ? `Quadrante, ${QUADRANT_GRID_LABELS[lobby.format].toLowerCase()}: dai questo codice al tuo amico (gli servono ${balance.quadrant.deckSize} carte):`
              : "Dai questo codice al tuo amico:"}
      </p>
      <p className="-skew-x-8 select-all bg-comic-yellow px-5 py-2 font-display text-5xl tracking-[0.15em] text-black shadow-[5px_5px_0_var(--comic-magenta)]">
        {lobby.code}
      </p>
      <p className="text-sm font-medium text-muted">Valido ancora {formatCountdown(remaining)}</p>
      <button type="button" onClick={() => share(lobby.code)} className="btn btn-primary px-6">
        Condividi il codice
      </button>
      {notice && <p className="text-sm font-semibold text-comic-cyan">{notice}</p>}
      <div className="flex items-center gap-2 text-sm font-semibold text-muted">
        <span className="h-2 w-2 animate-pulse rounded-full bg-comic-yellow" aria-hidden />
        In attesa che il tuo amico entri…
      </div>
      <button type="button" onClick={cancel} className="btn btn-ghost">
        Annulla
      </button>
    </main>
  );
}
