"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BOARDS,
  bestPlace,
  boardInfo,
  describePlace,
  fetchMyLeaderboardPlaces,
  leaderboardHref,
  PERIOD_LABELS,
  type LeaderboardBoard,
  type LeaderboardPlace,
} from "@/lib/leaderboards";

/** The player's places on every board, loaded once; null while loading, `failed` after a failure. */
function useMyPlaces() {
  const [places, setPlaces] = useState<LeaderboardPlace[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetchMyLeaderboardPlaces()
      .then((next) => {
        if (!cancelled) setPlaces(next);
      })
      .catch((error: unknown) => {
        console.error("Leaderboard places failed", error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { places, failed };
}

/** A trophy, as in the Gioca header. */
export function TrophyIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
      <path d="M7 4h10v5a5 5 0 01-10 0zM7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3M12 14v4M8 21h8M9 18h6" />
    </svg>
  );
}

/**
 * The home's way to the Classifiche, in the header so it takes no height from the screen: a
 * trophy with the best place of the week (or of all time), said in full to screen readers.
 */
export function HomeLeaderboardButton() {
  const { places } = useMyPlaces();
  const best = places ? bestPlace(places) : null;
  return (
    <Link
      href={best ? leaderboardHref(best.board, best.period) : "/classifiche/"}
      aria-label={best ? `Classifiche: ${describePlace(best)}` : "Classifiche"}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center text-comic-yellow"
    >
      <TrophyIcon className="h-7 w-7" />
      {best && best.rank <= 99 && (
        <span
          aria-hidden
          className="absolute -right-0.5 bottom-0 -skew-x-8 bg-comic-magenta px-1 font-display text-[13px] leading-4 text-black"
        >
          {best.rank}°
        </span>
      )}
    </Link>
  );
}

/**
 * The profile's places, as a table that fits its tab: a row per board where the player is ranked,
 * this week and of all time side by side (each opens that board), and the Albo of the
 * Classificata on top when the player is in this Mandato's (`albo`: their place).
 */
export function MyLeaderboardPlaces({ albo = null }: { albo?: { place: number; label: string } | null }) {
  const { places, failed } = useMyPlaces();
  if (places === null) {
    return (
      <p className="text-sm font-medium text-muted">
        {failed ? "Le posizioni non sono disponibili ora." : "Caricamento delle posizioni…"}
      </p>
    );
  }
  const shown = places.filter((place) => place.period !== "day");
  if (shown.length === 0 && !albo) {
    return <p className="text-sm font-medium text-muted">Ancora in nessuna classifica: gioca una partita o l&apos;Emergenza.</p>;
  }
  const boards = BOARDS.filter((board) => shown.some((place) => place.board === board.key));
  const cell = (board: LeaderboardBoard, period: "week" | "all") => {
    const place = shown.find((entry) => entry.board === board && entry.period === period);
    if (!place) return <span className="text-center text-sm text-faint">–</span>;
    return (
      <Link
        href={leaderboardHref(board, period)}
        aria-label={`${boardInfo(board).label}, ${PERIOD_LABELS[period]}: ${place.rank}° su ${place.players}`}
        className="flex items-baseline justify-center gap-1 bg-black/40 py-1 font-display text-lg leading-5"
      >
        {place.rank}°<span className="font-sans text-[11px] font-semibold text-muted">su {place.players}</span>
      </Link>
    );
  };
  return (
    <div className="flex flex-col gap-0.5" aria-label="Le tue posizioni">
      <div className="grid grid-cols-[1fr_6.5rem_6.5rem] gap-1 px-2.5 text-[11px] font-extrabold uppercase text-muted">
        <span>Classifica</span>
        <span className="text-center">{PERIOD_LABELS.week}</span>
        <span className="text-center">{PERIOD_LABELS.all}</span>
      </div>
      {albo && (
        <div className="grid min-h-[34px] grid-cols-[1fr_6.5rem_6.5rem] items-center gap-1 bg-panel px-2.5">
          <span className="truncate font-display text-[16px] uppercase leading-5">Albo</span>
          <Link
            href="/classifiche/?scheda=albo"
            aria-label={`Albo dei Reggenti, Mandato di ${albo.label}: ${albo.place}°`}
            className="col-span-2 flex items-baseline justify-center gap-1 bg-black/40 py-1 font-display text-lg leading-5"
          >
            {albo.place}°<span className="font-sans text-[11px] font-semibold text-muted">nel Mandato</span>
          </Link>
        </div>
      )}
      {boards.map((board) => (
        <div key={board.key} className="grid min-h-[34px] grid-cols-[1fr_6.5rem_6.5rem] items-center gap-1 bg-panel px-2.5">
          <span className="truncate font-display text-[16px] uppercase leading-5">{board.label}</span>
          {board.periods.includes("week") ? cell(board.key, "week") : <span className="text-center text-sm text-faint">–</span>}
          {cell(board.key, "all")}
        </div>
      ))}
    </div>
  );
}
