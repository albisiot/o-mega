"use client";

import { AchievementsView } from "@/components/achievements-view";
import { useRequireSignedIn } from "@/components/auth-provider";
import { EventShell } from "@/components/event-details";
import { LoadingScreen } from "@/components/loading-screen";

// The Imprese (SPEC §8.5): secret until completed, checked by the server when the page opens.
export default function AchievementsPage() {
  const { session } = useRequireSignedIn();
  if (!session) return <LoadingScreen label="Caricamento delle imprese…" />;
  return (
    <EventShell title="Imprese">
      <AchievementsView />
    </EventShell>
  );
}
