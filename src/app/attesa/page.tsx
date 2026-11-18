"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { goBack } from "@/components/return-link";
import { LobbyMissingView, LobbyWaitView, QueueWaitView, WaitingMain, WaitingShell } from "@/components/waiting-views";
import { balance } from "@/config/balance";
import { BASE_PATH } from "@/lib/base-path";
import { fetchChallenges, seenChallenges, type Challenge } from "@/lib/challenges";
import { describeServerError } from "@/lib/errors";
import { navHistory } from "@/lib/nav-history";
import {
  asMatchFormat,
  cancelLobby,
  clearPendingTeam,
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
import { useLockedScreen } from "@/lib/use-locked-screen";
import { useNow } from "@/lib/use-now";

// The server ignores a queue entry not refreshed for queueStaleSeconds:
// refreshing at 2/5 of that leaves room for one lost request.
const QUEUE_REFRESH_MS = (balance.matchmaking.queueStaleSeconds * 1000 * 2) / 5;
// The Classificata asks more often: its opponent may come at any second of the wait.
const RANKED_REFRESH_MS = balance.ranked.matchmaking.refreshSeconds * 1000;
// A friend code's host learns of the match from the broadcast; this is the fallback.
const LOBBY_CHECK_MS = 10_000;

// /attesa/?mode=queue[&type=conquest|ranked][&format=...] | /attesa/?mode=lobby
// /attesa/?mode=queue&sfida=<id>[&format=...]  (a Sfida a tema online: its own queue)
//
// Opening a queue's page joins the queue: the history never stops on it (src/lib/nav-stack.ts).
// The match takes the place of the page, and the team picker behind it is stepped over from then on.
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
  const type = params.get("type");
  const queueMode: QueueMode = type === "conquest" ? "conquest" : type === "ranked" ? "ranked" : "friendly";
  // Conquista is a classic match only.
  const asked = asMatchFormat(params.get("format"));
  const format: MatchFormat = queueMode === "conquest" ? "classic" : asked;
  const challengeId = queueMode === "friendly" ? params.get("sfida") : null;
  const { session } = useRequireSignedIn();
  // The page fits the phone and never scrolls (see WaitingShell).
  useLockedScreen(true);
  if (!session) return <LoadingScreen />;
  return (
    <WaitingShell lobby={mode === "lobby"} ranked={queueMode === "ranked"}>
      {mode === "lobby" ? (
        <LobbyWait userId={session.user.id} />
      ) : (
        <QueueWait userId={session.user.id} queueMode={queueMode} format={format} challengeId={challengeId} />
      )}
    </WaitingShell>
  );
}

/** The match started: it takes the place of the waiting page, and the team picker is over. */
function openMatch(router: ReturnType<typeof useRouter>, matchId: string) {
  navHistory()?.consumePrevious("/squadra");
  clearPendingTeam();
  router.replace(`/partita/?id=${matchId}`);
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

function QueueWait({
  userId,
  queueMode,
  format,
  challengeId,
}: {
  userId: string;
  queueMode: QueueMode;
  format: MatchFormat;
  challengeId: string | null;
}) {
  const router = useRouter();
  const [team] = useState(readPendingTeam);
  // Reopened by the browser's back or forward: the history is moving on, nothing to join.
  const [leaving] = useState(() => navHistory()?.leaving() ?? false);
  // A Sfida a tema: its name. Nobody free: the server finds the opponent, as in the Classificata.
  const [challenge, setChallenge] = useState<Challenge | null>(
    () => seenChallenges()?.challenges.find((item) => item.id === challengeId) ?? null,
  );
  useEffect(() => {
    if (!challengeId) return;
    let cancelled = false;
    fetchChallenges()
      .then((list) => {
        if (!cancelled) setChallenge(list.challenges.find((item) => item.id === challengeId) ?? null);
      })
      .catch((cause: unknown) => console.error("Challenges failed", cause));
    return () => {
      cancelled = true;
    };
  }, [challengeId]);
  const [startedAt] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const matched = useRef(false);
  const now = useNow(1000);

  const goToMatch = (matchId: string) => {
    if (matched.current) return;
    matched.current = true;
    openMatch(router, matchId);
  };
  // Joining tells us about the match itself: no other check is needed.
  useMatchStart(userId, goToMatch, null);

  // Joining again refreshes our place in the queue and retries the pairing,
  // QUEUE_REFRESH_MS after the previous attempt started (one that does not
  // answer by then is given up). In Conquest one attempt also comes right
  // after the wait for a bot is over, counted from the first entry stored.
  useEffect(() => {
    if (!team || leaving) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let botAt = Infinity;
    const every = queueMode === "ranked" ? RANKED_REFRESH_MS : QUEUE_REFRESH_MS;
    const next = (attemptedAt: number) => {
      if (stopped || matched.current) return;
      const now = Date.now();
      const refresh = Math.max(0, attemptedAt + every - now);
      const untilBot = botAt - now;
      timer = setTimeout(attempt, untilBot > 0 ? Math.min(refresh, untilBot) : refresh);
    };
    const attempt = () => {
      const attemptedAt = Date.now();
      joinQueue(team, queueMode, every, format, challengeId ?? undefined)
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
  }, [team, leaving, queueMode, format, challengeId]);

  if (leaving) return <LoadingScreen />;
  if (!team) {
    return (
      <WaitingMain>
        <p className="text-sm font-semibold">Scegli prima la tua squadra.</p>
        <Link
          href={
            queueMode === "conquest"
              ? "/squadra/?mode=conquest"
              : `/squadra/?${challengeId ? `sfida=${challengeId}&` : ""}mode=${queueMode === "ranked" ? "ranked" : "queue"}${
                  format === "classic" ? "" : `&format=${format}`
                }`
          }
          className="btn btn-outline"
        >
          Scegli la squadra
        </Link>
      </WaitingMain>
    );
  }

  const waited = Math.max(0, Math.floor((now - startedAt) / 1000));
  return (
    <QueueWaitView
      queueMode={queueMode}
      format={format}
      waited={waited}
      error={error}
      challenge={challengeId && challenge ? { title: challenge.title, color: challenge.color } : null}
    />
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
      openMatch(router, matchId);
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
    goBack(router, "/gioca");
  }

  if (lobby === undefined) return <LoadingScreen />;
  const remaining = lobby ? Date.parse(lobby.expires_at) - now : 0;
  if (!lobby || remaining <= 0) return <LobbyMissingView expired={Boolean(lobby)} />;

  return (
    <LobbyWaitView lobby={lobby} remaining={remaining} notice={notice} onShare={() => share(lobby.code)} onCancel={cancel} />
  );
}
