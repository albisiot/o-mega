"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { balance } from "@/config/balance";
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
} from "@/lib/match";
import { formatCountdown, useNow } from "@/lib/use-now";

// /attesa/?mode=queue | /attesa/?mode=lobby
export default function WaitingPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <WaitingContent />
    </Suspense>
  );
}

function WaitingContent() {
  const mode = useSearchParams().get("mode") === "lobby" ? "lobby" : "queue";
  const { session } = useRequireSignedIn();
  if (!session) return <LoadingScreen />;
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-5 py-4">
        <Link href="/gioca" className="text-sm text-zinc-300">
          ← Gioca
        </Link>
        <h1 className="text-base font-semibold">{mode === "lobby" ? "Sfida un amico" : "Ricerca avversario"}</h1>
        <span className="w-12" />
      </header>
      {mode === "lobby" ? <LobbyWait userId={session.user.id} /> : <QueueWait userId={session.user.id} />}
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

function QueueWait({ userId }: { userId: string }) {
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
      joinQueue(team)
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
  }, [team]);

  if (!team) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-zinc-300">Scegli prima la tua squadra.</p>
        <Link href="/squadra/?mode=queue" className="text-sm text-amber-300 underline">
          Scegli la squadra
        </Link>
      </main>
    );
  }

  const waited = Math.floor((now - startedAt) / 1000);
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="h-14 w-14 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
      <div>
        <p className="text-lg font-semibold">Ricerca di un avversario…</p>
        <p className="text-sm text-zinc-400 tabular-nums">{waited} s</p>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {waited >= balance.matchmaking.suggestBotAfterSeconds && (
        <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-zinc-300">Nessun avversario disponibile al momento.</p>
          <Link href="/gioca" className="text-sm font-semibold text-amber-300 underline">
            Gioca contro un bot
          </Link>
        </div>
      )}
      <Link href="/gioca" className="rounded-full border border-white/15 px-5 py-2 text-sm">
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
        <p className="text-sm text-zinc-300">{lobby ? "Il codice è scaduto." : "Nessun codice attivo."}</p>
        <Link href="/squadra/?mode=lobby" className="text-sm font-semibold text-amber-300 underline">
          Crea un nuovo codice
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm text-zinc-400">Dai questo codice al tuo amico:</p>
      <p className="select-all font-mono text-5xl font-black tracking-[0.25em] text-amber-200">{lobby.code}</p>
      <p className="text-xs text-zinc-500">Valido ancora {formatCountdown(remaining)}</p>
      <button
        type="button"
        onClick={() => share(lobby.code)}
        className="rounded-full bg-amber-400 px-6 py-3 font-bold text-zinc-950"
      >
        Condividi il codice
      </button>
      {notice && <p className="text-sm text-emerald-400">{notice}</p>}
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" aria-hidden />
        In attesa che il tuo amico entri…
      </div>
      <button type="button" onClick={cancel} className="rounded-full border border-white/15 px-5 py-2 text-sm">
        Annulla
      </button>
    </main>
  );
}
