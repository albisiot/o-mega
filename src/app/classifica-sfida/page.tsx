"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { BackLink } from "@/components/comic-parts";
import { LoadingScreen } from "@/components/loading-screen";
import { PlayerAvatar } from "@/components/player-avatar";
import { fetchChallengeLeaderboard, type ChallengeLeaderboard, type ChallengeLeaderboardEntry } from "@/lib/challenges";
import { describeServerError } from "@/lib/errors";
import { formatEventCountdown } from "@/lib/events";
import { useLockedScreen } from "@/lib/use-locked-screen";
import { useNow } from "@/lib/use-now";

// /classifica-sfida/?id=<challenge>: the leaderboard of a Sfida a tema (SPEC §8.8). A query
// string rather than a route of its own, as the static export asks (CLAUDE.md).
export default function ChallengeLeaderboardPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Caricamento della classifica…" />}>
      <ChallengeLeaderboardContent />
    </Suspense>
  );
}

function ChallengeLeaderboardContent() {
  const { session } = useRequireSignedIn();
  const challengeId = useSearchParams().get("id");
  const [board, setBoard] = useState<ChallengeLeaderboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  useLockedScreen(true);

  useEffect(() => {
    if (!session || !challengeId) return;
    let cancelled = false;
    fetchChallengeLeaderboard(challengeId)
      .then((next) => {
        if (!cancelled) setBoard(next);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session, challengeId]);

  if (!challengeId) return <Missing text="Questa classifica non esiste." />;
  if (error) return <Missing text={error} />;
  if (!session || !board) return <LoadingScreen label="Caricamento della classifica…" />;
  return <BoardView board={board} />;
}

function Missing({ text }: { text: string }) {
  return (
    <div className="game-shell">
      <header className="flex items-center gap-2.5 px-3 py-1">
        <BackLink href="/gioca" label="Torna a Gioca" />
        <h1 className="font-display text-[25px] uppercase leading-7 text-comic-yellow">Classifica</h1>
      </header>
      <p className="px-3 text-sm font-semibold text-comic-magenta">
        {text}{" "}
        <Link href="/gioca" className="underline">
          Torna a Gioca
        </Link>
      </p>
    </div>
  );
}

/** The first players, the caller's row highlighted, and the caller's place below when further down. */
function BoardView({ board }: { board: ChallengeLeaderboard }) {
  const emergency = board.challenge.format === "emergency";
  const below = board.me && !board.top.some((entry) => entry.is_me) ? board.me : null;
  const now = useNow(60_000);
  const left = Date.parse(board.challenge.ends_at) - now;
  return (
    <div className="game-shell">
      <header className="flex items-center gap-2.5 px-3 py-1">
        <BackLink href="/gioca" label="Torna a Gioca" />
        <div className="min-w-0">
          <h1 className="font-display text-[25px] uppercase leading-7 text-comic-yellow">Classifica</h1>
          <p className="truncate text-[11px] font-bold leading-4">
            <span style={{ color: board.challenge.color }}>★ {board.challenge.title}</span>
            <span className="text-muted"> · {board.ended ? "Sfida conclusa" : `Finisce tra ${formatEventCountdown(left)}`}</span>
          </p>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-1 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        <p className="shrink-0 text-xs font-semibold leading-4 text-muted">
          {board.players === 1 ? "1 giocatore" : `${board.players} giocatori`} ·{" "}
          {emergency ? "la corsa migliore: Minacce superate, poi i punti" : "chi vince più partite della sfida, e prima"}
        </p>
        {board.top.length === 0 ? (
          <p className="text-sm font-medium text-muted">Ancora nessuno in classifica: puoi essere il primo.</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain" data-keep-scroll="classifica-sfida">
            <ol className="flex flex-col gap-0.5" aria-label="Classifica della sfida">
              {board.top.map((entry) => (
                <Row key={entry.rank} entry={entry} emergency={emergency} />
              ))}
            </ol>
          </div>
        )}
        {below && (
          <div className="shrink-0">
            {below.rank > board.top.length + 1 && (
              <p aria-hidden className="text-center font-display leading-4 tracking-[0.4em] text-faint">
                ···
              </p>
            )}
            <ol start={below.rank} aria-label="La tua posizione">
              <Row entry={below} emergency={emergency} />
            </ol>
          </div>
        )}
      </main>
    </div>
  );
}

const MEDALS = ["bg-comic-yellow", "bg-[#c9d1d9]", "bg-[#d08b4f]"];

/** A place: rank, avatar, name and how many matches, then the wins (an Emergenza: threats passed and points). */
function Row({ entry, emergency }: { entry: ChallengeLeaderboardEntry; emergency: boolean }) {
  const medal = entry.rank <= 3 && !entry.is_me ? MEDALS[entry.rank - 1] : null;
  return (
    <li
      aria-current={entry.is_me ? "true" : undefined}
      className={`flex min-h-11 shrink-0 items-center justify-between gap-2 px-2.5 py-1 text-sm font-semibold ${
        entry.is_me ? "sticky inset-y-0 z-10 bg-comic-yellow text-black shadow-[3px_3px_0_#000]" : "bg-panel"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={`flex h-6 min-w-7 shrink-0 items-center justify-center px-0.5 font-display text-lg leading-none ${
            medal ? `${medal} -skew-x-8 text-black` : ""
          }`}
        >
          {entry.rank}
        </span>
        <PlayerAvatar username={entry.username} avatarUrl={entry.avatar_url} size="xs" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate leading-4">
            {entry.username}
            {entry.is_me && <span className="ml-1.5 text-[10px] font-extrabold uppercase">Tu</span>}
          </span>
          <span className={`truncate text-[11px] font-bold leading-3 ${entry.is_me ? "text-black/70" : "text-muted"}`}>
            {emergency ? `${entry.score} punti` : `${entry.played} ${entry.played === 1 ? "partita" : "partite"}`}
          </span>
        </span>
      </span>
      <span className="shrink-0 font-display text-lg leading-5">
        {entry.wins}
        <span className="ml-1 font-sans text-[11px] font-bold">
          {emergency ? (entry.wins === 1 ? "superata" : "superate") : entry.wins === 1 ? "vittoria" : "vittorie"}
        </span>
      </span>
    </li>
  );
}
