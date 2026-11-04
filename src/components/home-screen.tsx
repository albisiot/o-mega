"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import { markHomeReady } from "@/components/app-splash";
import { CoinBadge } from "@/components/coin-badge";
import { PackPanel } from "@/components/pack-panel";
import { PlayerAvatar } from "@/components/player-avatar";
import { WorldIntro } from "@/components/world-intro";
import { fetchAbilities, seenAbilities } from "@/lib/catalog";
import { fetchCatalog, fetchCollection, seenCatalog, seenCollection } from "@/lib/collection";
import { fetchActiveMatch, type ActiveMatch } from "@/lib/match";
import { fetchPackOdds, seenPackOdds } from "@/lib/packs";
import { countOwnedCards, type Profile } from "@/lib/player";
import { hasSeenTutorial } from "@/lib/tutorial-seen";
import { useLockedScreen } from "@/lib/use-locked-screen";
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
  const [Tutorial, setTutorial] = useState<ComponentType | null>(null);

  // Only a player who has not seen the tutorial downloads it, while the world intro is still up.
  useEffect(() => {
    if (hasSeenTutorial()) return;
    let cancelled = false;
    import("@/components/tutorial")
      .then(({ FirstRunTutorial }) => {
        if (!cancelled) setTutorial(() => FirstRunTutorial);
      })
      .catch((error: unknown) => console.error("Tutorial failed", error));
    return () => {
      cancelled = true;
    };
  }, []);

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

  // The home fits the screen above the bottom bar and never scrolls: the pack panel and Gioca
  // share the room left, and a short window (Safari on a small phone) gets the compact sizes.
  useLockedScreen(true);

  return (
    <div className="home-shell">
      <WorldIntro next={Tutorial && <Tutorial />} />
      <header className="flex shrink-0 items-center justify-between px-4 py-1 short:py-0">
        <span className="-skew-x-8 font-display text-[30px] leading-9 tracking-wide text-comic-yellow [text-shadow:3px_3px_0_var(--comic-magenta)]">
          O-MEGA
        </span>
        <div className="flex items-center gap-3">
          <CoinBadge balance={packs.status?.coin_balance ?? null} />
          <Link href="/profilo" aria-label={`Profilo di ${profile.username}`} className="flex min-h-11 min-w-11 items-center justify-center">
            <PlayerAvatar username={profile.username} avatarUrl={profile.avatar_url} />
          </Link>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-2">
        {activeMatch && (
          <Link
            href={`/partita/?id=${activeMatch.id}`}
            className="flex min-h-12 shrink-0 items-center justify-between gap-3 bg-comic-cyan px-3.5 py-1 text-black short:min-h-11"
          >
            <span className="font-display text-[17px] uppercase leading-5">Hai una partita in corso</span>
            <span className="flex items-center gap-2 whitespace-nowrap text-[13px] font-extrabold">
              Round {activeMatch.current_round} · riprendi
              <span className="font-display text-[22px] font-normal" aria-hidden>
                →
              </span>
            </span>
          </Link>
        )}

        <PackPanel
          status={packs.status}
          now={packs.now}
          resetsAt={packs.resetsAt}
          loadError={packs.error}
          onFailed={packs.refresh}
        />

        {/* Sized by its share of the room: the lettering follows its height. */}
        <Link
          href="/gioca"
          className="cut-both speed-lines-moving flex min-h-21 flex-[1_1_0] items-center justify-between gap-3 bg-comic-magenta px-[18px] py-2 text-black [container-type:size] short:min-h-18"
        >
          <div>
            <p className="-skew-x-8 font-display text-[length:clamp(46px,min(46cqh,27cqw),104px)] uppercase leading-[0.95] short:text-[length:clamp(36px,min(46cqh,27cqw),104px)]">
              Gioca
            </p>
            <p className="mt-1 text-sm font-extrabold leading-[18px]">Sfide 1 contro 1 da 3 minuti</p>
          </div>
          <span
            aria-hidden
            className="flex size-[clamp(50px,34cqh,76px)] shrink-0 -skew-x-8 items-center justify-center bg-black"
          >
            <svg viewBox="0 0 24 24" className="size-[56%] fill-comic-magenta">
              <path d="M6 4l14 8-14 8z" />
            </svg>
          </span>
        </Link>

        <div className="grid shrink-0 grid-cols-2 gap-2">
          <Link href="/collezione" className="flex min-h-[70px] flex-col justify-center gap-0.5 bg-comic-cyan px-3 py-2 text-black short:py-1">
            <span className="font-display text-[22px] uppercase leading-[26px]">Collezione</span>
            <span className="text-[13px] font-bold leading-[17px]">
              {cardCount === null ? "…" : cardCount} {cardCount === 1 ? "carta" : "carte"} · album e doppioni
            </span>
          </Link>
          <Link href="/negozio" className="flex min-h-[70px] flex-col justify-center gap-0.5 bg-foreground px-3 py-2 text-black short:py-1">
            <span className="font-display text-[22px] uppercase leading-[26px]">Negozio</span>
            <span className="text-[13px] font-bold leading-[17px]">Pacchetti e probabilità</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
