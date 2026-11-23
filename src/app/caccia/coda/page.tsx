"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { BackLink } from "@/components/comic-parts";
import { LoadingScreen } from "@/components/loading-screen";
import { describeServerError } from "@/lib/errors";
import { leaveRaidQueue, pollRaidQueue, raidRoomHref, type RaidQueueStatus } from "@/lib/raid";
import { useLockedScreen } from "@/lib/use-locked-screen";
import { useNow } from "@/lib/use-now";

/** How often the wait asks the server (which also makes the room when it is time). */
const POLL_MS = 3_000;

/**
 * The wait in the public queue «Cerca squadra» of a Boss (SPEC §5.18): how long, how many wait
 * for the same Boss; as soon as a full room is there, or after the wait with whoever is there
 * (and a server ally when alone), the hunt starts and this page gives way to it.
 */
export default function RaidQueuePage() {
  const router = useRouter();
  const { session } = useRequireSignedIn();
  const [status, setStatus] = useState<RaidQueueStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const leaving = useRef(false);
  useLockedScreen(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const ask = async () => {
      try {
        const next = await pollRaidQueue();
        if (cancelled || leaving.current) return;
        setOffset(Date.parse(next.server_now) - Date.now());
        if (next.room) {
          router.replace(raidRoomHref(next.room));
          return;
        }
        if (!next.queued) {
          router.replace("/caccia");
          return;
        }
        setStatus(next);
      } catch (cause) {
        if (!cancelled) setError(describeServerError(cause));
      }
    };
    const first = setTimeout(() => void ask(), 0);
    const timer = setInterval(() => void ask(), POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [session, router]);

  const now = useNow(1000) + offset;
  async function cancel() {
    leaving.current = true;
    try {
      await leaveRaidQueue();
    } catch {
      // Out of the queue anyway once the page is left: the server forgets a queue nobody asks about.
    }
    router.replace("/caccia");
  }

  if (!status && !error) return <LoadingScreen label="In coda…" />;
  const waited = status?.joined_at ? Math.max(0, Math.floor((now - Date.parse(status.joined_at)) / 1000)) : 0;
  const left = status ? Math.max(0, status.wait_seconds - waited) : 0;

  return (
    <div className="game-shell">
      <header className="flex items-center gap-2.5 px-3 py-1">
        <BackLink href="/caccia" />
        <div className="min-w-0">
          <h1 className="font-display text-[22px] uppercase leading-6 text-comic-yellow">Cerca squadra</h1>
          <p className="truncate text-[11px] font-bold text-muted">{status?.name ?? "Caccia grossa"}</p>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 pb-[calc(env(safe-area-inset-bottom)+16px)] text-center">
        {error && <p className="text-sm font-semibold text-comic-magenta">{error}</p>}
        {status && (
          <>
            <p className="font-display text-[56px] leading-none text-comic-orange" aria-live="polite">
              {waited}s
            </p>
            <p className="text-sm font-bold">
              {status.waiting > 1 ? `In coda per questo Boss: ${status.waiting} giocatori.` : "Per ora in coda ci sei solo tu."}
            </p>
            <p className="text-xs font-semibold leading-4 text-muted">
              {left > 0
                ? `Se tra ${left} secondi la stanza non è piena (${status.max_players} giocatori), si parte con chi c'è; se sei solo, con un alleato del server.`
                : "Sto preparando la caccia…"}
            </p>
            <button type="button" onClick={() => void cancel()} className="btn btn-ghost">
              Esci dalla coda
            </button>
          </>
        )}
      </main>
    </div>
  );
}
