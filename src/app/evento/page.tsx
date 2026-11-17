"use client";

import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { useEventStatus } from "@/components/event-banner";
import { EventDetails, EventShell } from "@/components/event-details";
import { EventLeaderboardList, useEventLeaderboard } from "@/components/event-leaderboard";
import { LoadingScreen } from "@/components/loading-screen";
import { fetchAbilities, seenAbilities, type AbilityInfo } from "@/lib/catalog";
import { useNow } from "@/lib/use-now";

// The running event (or the next one): no id in the address, there is one at a time.
export default function EventPage() {
  const { session } = useRequireSignedIn();
  const { status, offset } = useEventStatus();
  const now = useNow(30_000) + offset;
  const [abilities, setAbilities] = useState<AbilityInfo[] | null>(() => seenAbilities() ?? null);
  const event = status ? (status.event ?? status.ended_with_rewards) : undefined;
  // No event to show: the final leaderboard of the last one, if the player unlocked it.
  const last = useEventLeaderboard(null, event === null);

  useEffect(() => {
    if (abilities) return;
    let cancelled = false;
    fetchAbilities()
      .then((next) => {
        if (!cancelled) setAbilities(next);
      })
      .catch((error: unknown) => console.error("Abilities failed", error));
    return () => {
      cancelled = true;
    };
  }, [abilities]);

  if (!session || !status) return <LoadingScreen label="Caricamento dell'evento…" />;

  if (!event) {
    return (
      <EventShell title="Eventi">
        <p className="shrink-0 text-sm font-medium text-muted">
          Nessun evento in programma. Quando ne arriva uno lo trovi nella home e in Gioca.
        </p>
        {last.status === "ready" && last.board && (
          <>
            <h2 className="shrink-0 font-display text-xl uppercase leading-6 text-comic-yellow">
              Classifica finale · {last.board.title}
            </h2>
            <EventLeaderboardList board={last.board} />
          </>
        )}
      </EventShell>
    );
  }
  return <EventDetails event={event} now={now} abilities={abilities} />;
}
