"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LeaderboardView } from "@/components/leaderboard-view";
import { LoadingScreen } from "@/components/loading-screen";
import { parseBoard, PERIOD_LABELS, type LeaderboardPeriod } from "@/lib/leaderboards";

// /classifiche/?scheda=<board>&periodo=<period>: query string, see CLAUDE.md (static export).
// /classifiche/?scheda=albo opens the Albo dei Reggenti of the Classificata (SPEC §8.7).
// /classifiche/?scheda=scontro opens the board of the Scontro a squadre challenges (SPEC §5.19).
export default function LeaderboardsPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Caricamento delle classifiche…" />}>
      <LeaderboardsPageContent />
    </Suspense>
  );
}

function LeaderboardsPageContent() {
  const { session } = useRequireSignedIn();
  const params = useSearchParams();
  if (!session) return <LoadingScreen label="Caricamento delle classifiche…" />;
  const asked = params.get("periodo");
  const period = asked && asked in PERIOD_LABELS ? (asked as LeaderboardPeriod) : null;
  return (
    <LeaderboardView
      initialBoard={parseBoard(params.get("scheda"))}
      initialPeriod={period}
      initialAlbo={params.get("scheda") === "albo"}
      initialScontro={params.get("scheda") === "scontro"}
    />
  );
}
