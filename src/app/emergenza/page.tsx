"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { PageHeader } from "@/components/comic-parts";
import { EmergencyScreen } from "@/components/emergency-screen";
import { LoadingScreen } from "@/components/loading-screen";
import { fetchChallenges, type Challenge } from "@/lib/challenges";
import { openEmergency, type EmergencyKind, type EmergencyView } from "@/lib/emergency";
import { describeServerError } from "@/lib/errors";

// /emergenza: today's challenge (SPEC §5.10). /emergenza/?settimana=1: this week's (SPEC §5.16).
// /emergenza/?sfida=<id>: an Emergenza a tema (SPEC §8.8). A query string rather than a route of
// its own, as the static export asks (CLAUDE.md).
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
  const challengeId = params.get("sfida");
  // A new key starts over when the address switches between the challenges.
  return <EmergencyLoader key={challengeId ?? kind} kind={kind} challengeId={challengeId} />;
}

function EmergencyLoader({ kind, challengeId }: { kind: EmergencyKind; challengeId: string | null }) {
  const { session } = useRequireSignedIn();
  const [view, setView] = useState<EmergencyView | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    // An Emergenza a tema: its challenge (rules, prize, leaderboard) and its state.
    const themed = challengeId
      ? fetchChallenges().then((list) => {
          const found = list.challenges.find((entry) => entry.id === challengeId && entry.format === "emergency");
          if (!found) throw new Error("challenge_not_found");
          return found;
        })
      : Promise.resolve(null);
    Promise.all([themed, openEmergency(kind, challengeId)])
      .then(([found, state]) => {
        if (cancelled) return;
        setChallenge(found);
        setView(state);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session, kind, challengeId]);

  const title = challengeId ? "Emergenza a tema" : kind === "week" ? "Emergenza della settimana" : "Emergenza";
  if (error) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader backHref="/gioca" backLabel="Gioca" title={title} />
        <p className="px-3 text-sm font-semibold text-comic-magenta">{error}</p>
      </div>
    );
  }
  if (!session || !view) return <LoadingScreen label={`Caricamento dell'${title}…`} />;
  return <EmergencyScreen initial={view} kind={kind} challenge={challenge} />;
}
