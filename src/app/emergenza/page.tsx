"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { PageHeader } from "@/components/comic-parts";
import { EmergencyScreen } from "@/components/emergency-screen";
import { LoadingScreen } from "@/components/loading-screen";
import { openEmergency, type EmergencyKind, type EmergencyView } from "@/lib/emergency";
import { describeServerError } from "@/lib/errors";

// /emergenza: today's challenge (SPEC §5.10). /emergenza/?settimana=1: this week's (SPEC §5.16),
// a query string rather than a route of its own, as the static export asks (CLAUDE.md).
export default function EmergencyPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Caricamento dell'Emergenza…" />}>
      <EmergencyPageContent />
    </Suspense>
  );
}

function EmergencyPageContent() {
  const params = useSearchParams();
  const kind: EmergencyKind = params.get("settimana") ? "week" : "day";
  // A new key starts over when the address switches between the two challenges.
  return <EmergencyLoader key={kind} kind={kind} />;
}

function EmergencyLoader({ kind }: { kind: EmergencyKind }) {
  const { session } = useRequireSignedIn();
  const [view, setView] = useState<EmergencyView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    openEmergency(kind)
      .then((state) => {
        if (!cancelled) setView(state);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session, kind]);

  const title = kind === "week" ? "Emergenza della settimana" : "Emergenza";
  if (error) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader backHref="/gioca" backLabel="Gioca" title={title} />
        <p className="px-3 text-sm font-semibold text-comic-magenta">{error}</p>
      </div>
    );
  }
  if (!session || !view) return <LoadingScreen label={`Caricamento dell'${title}…`} />;
  return <EmergencyScreen initial={view} kind={kind} />;
}
