"use client";

import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { RankedModesView } from "@/components/ranked-modes";
import { describeServerError } from "@/lib/errors";
import { fetchActiveMatch, seenActiveMatch, type ActiveMatch } from "@/lib/match";
import { useModeAvailability } from "@/lib/mode-availability";
import { fetchMyRanked, seenRanked, type MyRanked } from "@/lib/ranked";
import { useLockedScreen } from "@/lib/use-locked-screen";
import { useNow } from "@/lib/use-now";

// /classificata: the Classificata of every mode, straight from the home (SPEC §8.7).
export default function RankedPage() {
  const { session } = useRequireSignedIn();
  // Last seen first, then the server's answer.
  const [ranked, setRanked] = useState<MyRanked | null>(seenRanked);
  const [active, setActive] = useState<ActiveMatch | null | undefined>(seenActiveMatch);
  const [error, setError] = useState<string | null>(null);
  // When each board is open (EDITOR → Modalità di gioco).
  const modes = useModeAvailability(Boolean(session));
  const now = useNow(60_000);
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
  return (
    <RankedModesView
      ranked={ranked}
      active={active}
      error={error}
      modes={modes}
      now={now}
      onPrizeClaimed={() => setRanked((current) => current && { ...current, prizes: current.prizes.slice(1) })}
    />
  );
}
