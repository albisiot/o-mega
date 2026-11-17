"use client";

import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { RankedModesView } from "@/components/ranked-modes";
import { describeServerError } from "@/lib/errors";
import { fetchActiveMatch, type ActiveMatch } from "@/lib/match";
import { fetchMyRanked, type MyRanked } from "@/lib/ranked";
import { useLockedScreen } from "@/lib/use-locked-screen";

// /classificata: the Classificata of every mode, straight from the home (SPEC §8.7).
export default function RankedPage() {
  const { session } = useRequireSignedIn();
  const [ranked, setRanked] = useState<MyRanked | null>(null);
  const [active, setActive] = useState<ActiveMatch | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  // The page fits the screen above the bottom bar: what does not fit scrolls inside.
  useLockedScreen(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    Promise.all([fetchActiveMatch(), fetchMyRanked()])
      .then(([match, mine]) => {
        if (cancelled) return;
        setActive(match);
        setRanked(mine);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!session) return <LoadingScreen />;
  return <RankedModesView ranked={ranked} active={active} error={error} />;
}
