"use client";

import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { PageHeader } from "@/components/comic-parts";
import { useEventStatus } from "@/components/event-banner";
import { EventDetails } from "@/components/event-details";
import { LoadingScreen } from "@/components/loading-screen";
import { fetchAbilities, seenAbilities, type AbilityInfo } from "@/lib/catalog";
import { useNow } from "@/lib/use-now";

// The running event (or the next one): no id in the address, there is one at a time.
export default function EventPage() {
  const { session } = useRequireSignedIn();
  const { status, offset } = useEventStatus();
  const now = useNow(30_000) + offset;
  const [abilities, setAbilities] = useState<AbilityInfo[] | null>(() => seenAbilities() ?? null);

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

  const event = status.event ?? status.ended_with_rewards;
  if (!event) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader backHref="/" backLabel="Home" title="Eventi" />
        <main className="flex flex-col gap-2 px-4 pb-6">
          <p className="text-sm font-medium text-muted">
            Nessun evento in programma. Quando ne arriva uno lo trovi nella home e in Gioca.
          </p>
        </main>
      </div>
    );
  }
  return <EventDetails event={event} now={now} abilities={abilities} />;
}
