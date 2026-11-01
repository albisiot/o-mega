"use client";

import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { PageHeader } from "@/components/comic-parts";
import { EmergencyScreen } from "@/components/emergency-screen";
import { LoadingScreen } from "@/components/loading-screen";
import { openEmergency, type EmergencyView } from "@/lib/emergency";
import { describeServerError } from "@/lib/errors";

export default function EmergencyPage() {
  const { session } = useRequireSignedIn();
  const [view, setView] = useState<EmergencyView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    openEmergency()
      .then((state) => {
        if (!cancelled) setView(state);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (error) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader backHref="/gioca" backLabel="Gioca" title="Emergenza" />
        <p className="px-3 text-sm font-semibold text-comic-magenta">{error}</p>
      </div>
    );
  }
  if (!session || !view) return <LoadingScreen label="Caricamento dell'Emergenza…" />;
  return <EmergencyScreen initial={view} />;
}
