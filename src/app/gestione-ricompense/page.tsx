"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { MatchRewardAdmin } from "@/components/match-reward-admin";
import { fetchIsAdmin } from "@/lib/bonus-code-admin";
import { describeServerError } from "@/lib/errors";
import { fetchMatchRewards, type MatchRewards } from "@/lib/match-rewards";

// Reached from the EDITOR page (src/app/editor). Every player may
// read the rewards; only admins see this page, and the save is checked on the server.
export default function MatchRewardAdminPage() {
  const { session } = useRequireSignedIn();
  const [data, setData] = useState<MatchRewards | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    Promise.all([fetchIsAdmin(), fetchMatchRewards()])
      .then(([isAdmin, next]) => {
        if (cancelled) return;
        if (isAdmin) setData(next);
        else setError("Questa pagina non è disponibile.");
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
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold text-comic-magenta">{error}</p>
        <Link href="/" className="flex min-h-11 items-center text-sm font-bold underline">
          Torna alla home
        </Link>
      </main>
    );
  }
  if (!data) return <LoadingScreen label="Caricamento delle ricompense…" />;

  return <MatchRewardAdmin initial={data} />;
}
