"use client";

import { useRequireSignedIn } from "@/components/auth-provider";
import { DailyObjectivesView } from "@/components/daily-objectives";
import { EventShell } from "@/components/event-details";
import { LoadingScreen } from "@/components/loading-screen";

// Today's objectives (SPEC §8.3): one page, the day is the server's.
export default function ObjectivesPage() {
  const { session } = useRequireSignedIn();
  if (!session) return <LoadingScreen label="Caricamento degli obiettivi…" />;
  return (
    <EventShell title="Obiettivi">
      <DailyObjectivesView />
    </EventShell>
  );
}
