"use client";

import { useEffect, useState } from "react";
import { PlayerAvatar } from "@/components/player-avatar";
import { describeServerError } from "@/lib/errors";
import {
  entryProgress,
  fetchEventLeaderboard,
  LEADERBOARD_LOCKED,
  placeBelow,
  playersLine,
  type EventLeaderboard,
  type EventLeaderboardEntry,
} from "@/lib/event-leaderboard";

export type EventLeaderboardState =
  | { status: "loading" }
  | { status: "ready"; board: EventLeaderboard | null }
  | { status: "locked" }
  | { status: "error"; message: string };

/**
 * The leaderboard of an event (null: the last event that ended), loaded when `enabled`. The
 * server decides whether the player may see it.
 */
export function useEventLeaderboard(eventId: string | null, enabled: boolean): EventLeaderboardState {
  const key = eventId ?? "last";
  const [result, setResult] = useState<{ key: string; state: EventLeaderboardState } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchEventLeaderboard(eventId)
      .then((board) => {
        if (cancelled) return;
        setResult({ key, state: board === LEADERBOARD_LOCKED ? { status: "locked" } : { status: "ready", board } });
      })
      .catch((cause: unknown) => {
        if (!cancelled) setResult({ key, state: { status: "error", message: describeServerError(cause) } });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, eventId, key]);

  return result?.key === key ? result.state : { status: "loading" };
}

/**
 * The ranking: the first players, the player's row highlighted. While in the list it sticks to
 * the top or the bottom of the room when scrolled away; below the list, it stays fixed under it.
 */
export function EventLeaderboardList({ board }: { board: EventLeaderboard }) {
  const below = placeBelow(board);
  if (board.top.length === 0) {
    return <p className="text-sm font-medium text-muted">Ancora nessun giocatore in classifica.</p>;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      <p className="shrink-0 text-xs font-semibold leading-4 text-muted">{playersLine(board)}</p>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain" data-keep-scroll="classifica-evento">
        <ol className="flex flex-col gap-0.5" aria-label="Classifica generale">
          {board.top.map((entry) => (
            <Row key={entry.rank} entry={entry} tiers={board.tiers} sticky />
          ))}
        </ol>
      </div>
      {below && (
        <div className="shrink-0">
          {below.rank > board.top.length + 1 && (
            <p aria-hidden className="text-center font-display leading-4 tracking-[0.4em] text-faint">
              ···
            </p>
          )}
          <ol start={below.rank} aria-label="La tua posizione">
            <Row entry={below} tiers={board.tiers} />
          </ol>
        </div>
      )}
    </div>
  );
}

const MEDALS = ["bg-comic-yellow", "bg-[#c9d1d9]", "bg-[#d08b4f]"];

/** A place: rank, avatar, name and progress, then the points. Never teams or cards. */
function Row({ entry, tiers, sticky = false }: { entry: EventLeaderboardEntry; tiers: number; sticky?: boolean }) {
  const progress = entryProgress(entry, tiers);
  const medal = entry.rank <= 3 && !entry.is_me ? MEDALS[entry.rank - 1] : null;
  return (
    <li
      aria-current={entry.is_me ? "true" : undefined}
      className={`flex min-h-11 shrink-0 items-center justify-between gap-2 px-2.5 py-1 text-sm font-semibold ${
        entry.is_me
          ? `bg-comic-yellow text-black shadow-[3px_3px_0_#000] ${sticky ? "sticky inset-y-0 z-10" : ""}`
          : "bg-panel"
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
          <span
            className={`truncate text-[11px] font-bold leading-3 ${
              entry.is_me ? "text-black/70" : progress.done ? "text-comic-yellow" : "text-muted"
            }`}
          >
            {progress.done ? `✓ ${progress.label}` : progress.label}
          </span>
        </span>
      </span>
      <span className="shrink-0 font-display text-lg leading-5">
        {entry.points}
        <span className="ml-1 font-sans text-[11px] font-bold">punti</span>
      </span>
    </li>
  );
}
