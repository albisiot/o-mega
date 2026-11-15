"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  bestPlace,
  boardInfo,
  describePlace,
  fetchMyLeaderboardPlaces,
  leaderboardHref,
  PERIOD_LABELS,
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

/** The profile's list of places: every board where the player is ranked, this week and of all time. */
export function MyLeaderboardPlaces() {
  const { places, failed } = useMyPlaces();
  if (places === null) {
    return (
      <p className="text-sm font-medium text-muted">
        {failed ? "Le posizioni non sono disponibili ora." : "Caricamento delle posizioni…"}
      </p>
    );
  }
  const shown = places.filter((place) => place.period !== "day");
  if (shown.length === 0) {
    return <p className="text-sm font-medium text-muted">Ancora in nessuna classifica: gioca una partita o l&apos;Emergenza.</p>;
  }
  return (
    <ul className="flex flex-col gap-0.5" aria-label="Le tue posizioni">
      {shown.map((place) => (
        <li key={`${place.board}:${place.period}`}>
          <Link href={leaderboardHref(place.board, place.period)} className="flex min-h-11 items-center justify-between gap-3 bg-panel px-3.5 py-1">
            <span className="min-w-0">
              <span className="block truncate font-display text-[17px] uppercase leading-5">{boardInfo(place.board).label}</span>
              <span className="block text-xs font-semibold text-muted">{PERIOD_LABELS[place.period]}</span>
            </span>
            <span className="shrink-0 font-display text-xl">
              {place.rank}° <span className="font-sans text-xs font-semibold text-muted">su {place.players}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
