"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  eventPhase,
  fetchEventPointsFor,
  fetchEventStatus,
  formatEventCountdown,
  markEventRewardsSeen,
  seenEventStatus,
  tierProgress,
  unseenOpenings,
  type EventStatus,
  type GameEvent,
  type MatchEventPoints,
} from "@/lib/events";
import { packRevealHref } from "@/lib/packs";
import { describeAdmitted } from "@/lib/traits";
import { useNow } from "@/lib/use-now";

/** The event status, shown at once from the last answer and refreshed on mount. */
export function useEventStatus(): { status: EventStatus | null; offset: number; refresh: () => void } {
  const [status, setStatus] = useState<EventStatus | null>(() => seenEventStatus());
  // Server time minus device time: countdowns follow the server clock.
  const [offset, setOffset] = useState(0);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchEventStatus()
      .then((next) => {
        if (cancelled) return;
        setStatus(next);
        setOffset(Date.parse(next.now) - Date.now());
      })
      .catch((error: unknown) => console.error("Event status failed", error));
    return () => {
      cancelled = true;
    };
  }, [version]);

  return { status, offset, refresh: () => setVersion((value) => value + 1) };
}

/**
 * On a match result (its id) or the end of today's Emergenza run (null): the event points it
 * earned, or null (also while loading).
 */
export function useEventPointsFor(refId: string | null): MatchEventPoints | null {
  const [points, setPoints] = useState<MatchEventPoints | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchEventPointsFor(refId)
      .then((next) => {
        if (!cancelled) setPoints(next);
      })
      .catch((error: unknown) => console.error("Event points failed", error));
    return () => {
      cancelled = true;
    };
  }, [refId]);
  return points;
}

/** The rewards not opened yet: marks them seen, then plays them like a pack. */
export function useOpenEventRewards(): { open: (event: GameEvent) => void; opening: boolean } {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  return {
    opening,
    open: (event) => {
      const ids = unseenOpenings(event);
      setOpening(true);
      markEventRewardsSeen(event.id)
        .catch((error: unknown) => console.error("Marking event rewards failed", error))
        .finally(() => {
          if (ids.length > 0) router.push(packRevealHref(ids));
          else setOpening(false);
        });
    },
  };
}

/**
 * On the home and in Gioca: the running event with its countdown and progress, the next one
 * with the time to its start, or a reward to open. Nothing when there is no event.
 */
export function EventBanner() {
  const { status, offset } = useEventStatus();
  const now = useNow(30_000) + offset;
  const { open, opening } = useOpenEventRewards();

  const withRewards =
    status?.event && unseenOpenings(status.event).length > 0
      ? status.event
      : status?.ended_with_rewards && unseenOpenings(status.ended_with_rewards).length > 0
        ? status.ended_with_rewards
        : null;

  if (withRewards) {
    return (
      <button
        type="button"
        onClick={() => open(withRewards)}
        disabled={opening}
        className="flex min-h-12 w-full shrink-0 items-center justify-between gap-3 bg-comic-yellow px-3.5 py-1 text-left text-black short:min-h-11"
      >
        <span className="min-w-0">
          <span className="block font-display text-[17px] uppercase leading-5">Premio evento ottenuto!</span>
          <span className="block truncate text-[13px] font-bold leading-4">{withRewards.title}</span>
        </span>
        <span className="shrink-0 -skew-x-8 bg-black px-2.5 py-1 font-display text-base uppercase text-comic-yellow">
          {opening ? "…" : "Aprilo"}
        </span>
      </button>
    );
  }

  const event = status?.event;
  if (!event) return null;
  const phase = eventPhase(event, now);
  if (phase === "ended") return null;

  if (phase === "upcoming") {
    return (
      <Link
        href="/evento"
        className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-2 border-comic-yellow px-3.5 py-1 short:min-h-11"
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-extrabold uppercase leading-4 text-comic-yellow">Evento in arrivo</span>
          <span className="block truncate font-display text-[17px] uppercase leading-5">{event.title}</span>
        </span>
        <span className="shrink-0 text-[13px] font-extrabold">
          tra {formatEventCountdown(Date.parse(event.starts_at) - now)}
        </span>
      </Link>
    );
  }

  const progress = tierProgress(event.my_points, event.tiers);
  return (
    <Link
      href="/evento"
      aria-label={`Evento ${event.title}: ${event.my_points} punti`}
      className="flex shrink-0 flex-col gap-1 bg-comic-yellow px-3.5 py-1.5 text-black"
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-display text-[17px] uppercase leading-5">{event.title}</span>
        <span className="shrink-0 text-[12px] font-extrabold leading-4">
          finisce tra {formatEventCountdown(Date.parse(event.ends_at) - now)}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <span className="h-2.5 min-w-0 flex-1 bg-black/25" aria-hidden>
          <span className="block h-full bg-black" style={{ width: `${Math.round(progress.fraction * 100)}%` }} />
        </span>
        <span className="shrink-0 text-[12px] font-extrabold leading-4">
          {progress.next ? `${event.my_points}/${progress.next.points} punti` : "Traguardi completati"}
        </span>
      </span>
      {(event.admitted ?? []).length > 0 && (
        <span className="truncate text-[12px] font-bold leading-4">Solo {describeAdmitted(event.admitted ?? [])}</span>
      )}
    </Link>
  );
}
