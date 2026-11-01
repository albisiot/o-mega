"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { markHomeReady } from "@/components/app-splash";
import { CoinBadge } from "@/components/coin-badge";
import { PackPanel } from "@/components/pack-panel";
import { PlayerAvatar } from "@/components/player-avatar";
import { FirstRunTutorial } from "@/components/tutorial";
import { WorldIntro } from "@/components/world-intro";
import { fetchAbilities, seenAbilities } from "@/lib/catalog";
import { fetchCatalog, fetchCollection, seenCatalog, seenCollection } from "@/lib/collection";
import { fetchActiveMatch, type ActiveMatch } from "@/lib/match";
import { fetchPackOdds, seenPackOdds } from "@/lib/packs";
import { countOwnedCards, type Profile } from "@/lib/player";
import { usePackStatus } from "@/lib/use-pack-status";
import { fetchCoinHistory, seenCoinHistory } from "@/lib/wallet";

const PRELOAD_DELAY_MS = 800;

function preloadScreens() {
  const loads: [unknown, () => Promise<unknown>][] = [
    [seenCatalog(), fetchCatalog],
    [seenAbilities(), fetchAbilities],
    [seenCollection(), fetchCollection],
    [seenPackOdds(), fetchPackOdds],
    [seenCoinHistory(), fetchCoinHistory],
  ];
  for (const [seen, load] of loads) {
    // A nicety: the screen fetches for itself anyway.
    if (!seen) load().catch(() => {});
  }
}

export function HomeScreen({ profile }: { profile: Profile }) {
  const [cardCount, setCardCount] = useState<number | null>(null);
  const packs = usePackStatus();
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);

  const packsSettled = Boolean(packs.status || packs.error);
  useEffect(() => {
    if (!packsSettled) return;
    markHomeReady();
    // Once the home is up, gets the other screens' data ready for the first tap.
    const timer = setTimeout(preloadScreens, PRELOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [packsSettled]);

  useEffect(() => {
    let cancelled = false;
    fetchActiveMatch()
      .then((match) => {
        if (!cancelled) setActiveMatch(match);
      })
      .catch((error: unknown) => console.error("Active match failed", error));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    countOwnedCards()
      .then((count) => {
        if (!cancelled) setCardCount(count);
      })
      .catch((error: unknown) => console.error("Card count failed", error));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <WorldIntro next={<FirstRunTutorial />} />
      <header className="flex items-center justify-between px-4 py-2">
        <span className="-skew-x-8 font-display text-[34px] leading-10 tracking-wide text-comic-yellow [text-shadow:3px_3px_0_var(--comic-magenta)]">
          O-MEGA
        </span>
        <div className="flex items-center gap-3">
          <CoinBadge balance={packs.status?.coin_balance ?? null} />
          <Link href="/profilo" aria-label={`Profilo di ${profile.username}`} className="flex min-h-11 min-w-11 items-center justify-center">
            <PlayerAvatar username={profile.username} avatarUrl={profile.avatar_url} />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-3 px-3 pb-3">
        {activeMatch && (
          <Link
            href={`/partita/?id=${activeMatch.id}`}
            className="flex min-h-14 items-center justify-between gap-3 bg-comic-cyan px-4 py-2.5 text-black"
          >
            <div>
              <p className="font-display text-lg uppercase">Hai una partita in corso</p>
              <p className="text-sm font-semibold">Round {activeMatch.current_round}: tocca per riprenderla.</p>
            </div>
            <span className="font-display text-2xl" aria-hidden>
              →
            </span>
          </Link>
        )}

        <PackPanel status={packs.status} now={packs.now} resetsAt={packs.resetsAt} onFailed={packs.refresh} />
        {packs.error && <p className="text-sm font-semibold text-comic-magenta">{packs.error}</p>}

        <Link
          href="/gioca"
          className="cut-both speed-lines-moving flex min-h-[116px] items-center justify-between bg-comic-magenta px-5 py-2 text-black"
        >
          <div>
            <p className="-skew-x-8 font-display text-6xl uppercase">Gioca</p>
            <p className="mt-1 text-sm font-extrabold">Sfide 1 contro 1 da 3 minuti</p>
          </div>
          <span aria-hidden className="flex h-14 w-14 -skew-x-8 items-center justify-center bg-black">
            <svg viewBox="0 0 24 24" className="h-8 w-8 fill-comic-magenta">
              <path d="M6 4l14 8-14 8z" />
            </svg>
          </span>
        </Link>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/collezione" className="flex min-h-24 flex-col gap-1 bg-comic-cyan px-3.5 py-3 text-black">
            <span className="font-display text-2xl uppercase">Collezione</span>
            <span className="text-sm font-bold">
              {cardCount === null ? "…" : cardCount} {cardCount === 1 ? "carta" : "carte"} · album e doppioni
            </span>
          </Link>
          <Link href="/negozio" className="flex min-h-24 flex-col gap-1 bg-foreground px-3.5 py-3 text-black">
            <span className="font-display text-2xl uppercase">Negozio</span>
            <span className="text-sm font-bold">Pacchetti e probabilità</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
