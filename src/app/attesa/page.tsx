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
  cancelLobby,
  fetchActiveMatch,
  fetchMyLobby,
  joinQueue,
  leaveQueue,
  readPendingTeam,
  subscribeToUpdates,
  type Lobby,
  type QueueMode,
} from "@/lib/match";
import { formatCountdown, useNow } from "@/lib/use-now";

const SEARCH_LINE_SECONDS = 4;

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
  const { session } = useRequireSignedIn();
  if (!session) return <LoadingScreen />;
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader backHref="/gioca" backLabel="Gioca" title={mode === "lobby" ? "Sfida un amico" : "Ricerca avversario"} />
      {mode === "lobby" ? (
        <LobbyWait userId={session.user.id} />
      ) : (
        <QueueWait userId={session.user.id} queueMode={queueMode} />
      )}
    </div>
  );
}

/** Goes to the match as soon as the server says it started. */
function useMatchStart(userId: string, onStart: (matchId: string) => void) {
  const onStartRef = useRef(onStart);
  useEffect(() => {
    onStartRef.current = onStart;
  });
  useEffect(() => {
    const check = () =>
      fetchActiveMatch()
        .then((match) => {
          if (match) onStartRef.current(match.id);
        })
        .catch(() => {});
    const unsubscribe = subscribeToUpdates(`player:${userId}`, (payload) => {
      if (payload.kind === "match_started" && typeof payload.match_id === "string") onStartRef.current(payload.match_id);
    });
    // Fallback in case a broadcast is missed.
    const timer = setInterval(check, 4000);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [userId]);
}

function QueueWait({ userId, queueMode }: { userId: string; queueMode: QueueMode }) {
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
  useMatchStart(userId, goToMatch);

  // Joining again refreshes our place in the queue and retries the pairing.
  useEffect(() => {
    if (!team) return;
    const attempt = () =>
      joinQueue(team, queueMode)
        .then((result) => {
          if (result.matched && result.match_id) goToMatch(result.match_id);
        })
        .catch((cause: unknown) => {
          if (cause instanceof Error && cause.message === "match_already_active") return; // useMatchStart takes over
          setError(describeServerError(cause));
        });
    const first = setTimeout(attempt, 0);
    const timer = setInterval(attempt, 5000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      if (!matched.current) leaveQueue().catch(() => {});
    };
    // goToMatch only reads refs and the router.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, queueMode]);

  if (!team) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold">Scegli prima la tua squadra.</p>
        <Link
          href={queueMode === "conquest" ? "/squadra/?mode=conquest" : "/squadra/?mode=queue"}
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
          {queueMode === "conquest" ? "Ricerca di un avversario per la Conquista…" : "Ricerca di un avversario…"}
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

  useMatchStart(userId, (matchId) => {
    if (started.current) return;
    started.current = true;
    router.replace(`/partita/?id=${matchId}`);
  });

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
      <p className="text-base font-semibold">Dai questo codice al tuo amico:</p>
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
