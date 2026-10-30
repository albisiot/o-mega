"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { MatchScreen } from "@/components/match-screen";
import { describeServerError } from "@/lib/errors";
import { cachedMatchView, fetchMatchState, type MatchView } from "@/lib/match";

// /partita/?id=<match id>: query string, see CLAUDE.md (static export).
export default function MatchPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MatchPageContent />
    </Suspense>
  );
}

function MatchPageContent() {
  const id = useSearchParams().get("id");
  const { session } = useRequireSignedIn();
  const [view, setView] = useState<MatchView | null>(() => (id ? cachedMatchView(id) : null));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || view || !session) return;
    let cancelled = false;
    fetchMatchState(id)
      .then((state) => {
        if (!cancelled) setView(state);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [id, view, session]);

  if (!id || error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold text-comic-magenta">{error ?? "Partita non trovata."}</p>
        <Link href="/gioca" className="flex min-h-11 items-center text-sm font-bold underline">
          Torna a Gioca
        </Link>
      </main>
    );
  }
  if (!view) return <LoadingScreen label="Caricamento della partita…" />;
  return <MatchScreen key={view.id} initial={view} />;
}
