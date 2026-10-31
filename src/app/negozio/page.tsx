"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { ShopView } from "@/components/shop-view";
import { describeServerError } from "@/lib/errors";
import { fetchPackOdds, seenPackOdds, type PackOdds } from "@/lib/packs";
import { usePackStatus } from "@/lib/use-pack-status";
import { fetchCoinHistory, seenCoinHistory, type CoinMovement } from "@/lib/wallet";

export default function ShopPage() {
  const { session } = useRequireSignedIn();
  const { status, error: statusError, refresh } = usePackStatus();
  const [odds, setOdds] = useState<PackOdds | null>(seenPackOdds);
  const [history, setHistory] = useState<CoinMovement[] | null>(seenCoinHistory);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    Promise.all([fetchPackOdds(), fetchCoinHistory()])
      .then(([nextOdds, nextHistory]) => {
        if (cancelled) return;
        setOdds(nextOdds);
        setHistory(nextHistory);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (error || statusError) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold text-comic-magenta">{error ?? statusError}</p>
        <Link href="/" className="flex min-h-11 items-center text-sm font-bold underline">
          Torna alla home
        </Link>
      </main>
    );
  }
  if (!status || !odds || !history) return <LoadingScreen label="Apertura del negozio…" />;

  return <ShopView status={status} odds={odds} history={history} onFailed={refresh} />;
}
