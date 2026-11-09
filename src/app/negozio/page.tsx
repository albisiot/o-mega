"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { ShopView } from "@/components/shop-view";
import { describeServerError } from "@/lib/errors";
import {
  fetchPackOdds,
  fetchSpecialPacks,
  seenPackOdds,
  seenSpecialPacks,
  type PackOdds,
  type SpecialPack,
} from "@/lib/packs";
import { usePackStatus } from "@/lib/use-pack-status";
import { fetchCoinHistory, seenCoinHistory, type CoinMovement } from "@/lib/wallet";

export default function ShopPage() {
  const { session } = useRequireSignedIn();
  const { status, error: statusError, refresh } = usePackStatus();
  const [odds, setOdds] = useState<PackOdds | null>(seenPackOdds);
  const [specials, setSpecials] = useState<SpecialPack[] | null>(seenSpecialPacks);
  const [history, setHistory] = useState<CoinMovement[] | null>(seenCoinHistory);
  const [error, setError] = useState<string | null>(null);

  const [historyVersion, setHistoryVersion] = useState(0);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    Promise.all([
      fetchPackOdds(),
      fetchCoinHistory(),
      // The standard pack is sold even if the special packs cannot be read.
      fetchSpecialPacks().catch((cause: unknown) => {
        console.error("Special packs failed", cause);
        return [];
      }),
    ])
      .then(([nextOdds, nextHistory, nextSpecials]) => {
        if (cancelled) return;
        setOdds(nextOdds);
        setHistory(nextHistory);
        setSpecials(nextSpecials);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session, historyVersion]);

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
  if (!status || !odds || !history || !specials) return <LoadingScreen label="Apertura del negozio…" />;

  return (
    <ShopView
      status={status}
      odds={odds}
      specials={specials}
      history={history}
      onFailed={() => {
        // A special pack may have changed price or left the shop: show it as it is now.
        refresh();
        setHistoryVersion((version) => version + 1);
      }}
      onRedeemed={() => {
        refresh();
        setHistoryVersion((version) => version + 1);
      }}
    />
  );
}
