"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import { markHomeReady } from "@/components/app-splash";
import { CoinBadge } from "@/components/coin-badge";
import { HomeObjectivesBar } from "@/components/daily-objectives";
import { EventBanner } from "@/components/event-banner";
import { HomePlayButtons } from "@/components/home-play-buttons";
import { HomeLeaderboardButton } from "@/components/leaderboard-places";
import { PackPanel } from "@/components/pack-panel";
import { PlayerAvatar } from "@/components/player-avatar";
import { WorldIntro } from "@/components/world-intro";
import { fetchAbilities, seenAbilities } from "@/lib/catalog";
import { fetchChallenges, seenChallenges, type Challenge } from "@/lib/challenges";
import { fetchCatalog, fetchCollection, seenCatalog, seenCollection } from "@/lib/collection";
import {
  fetchEmergencyLeaderboard,
  fetchEmergencyWeekLeaderboard,
  seenEmergencyLeaderboard,
  seenEmergencyWeekLeaderboard,
} from "@/lib/emergency";
import { fetchActiveMatch, fetchConquestStatus, seenActiveMatch, seenConquestStatus, type ActiveMatch } from "@/lib/match";
import {
  fetchOpenedPackCount,
  fetchPackOdds,
  fetchSpecialPacks,
  seenOpenedPackCount,
  seenPackOdds,
  seenSpecialPacks,
} from "@/lib/packs";
import type { Profile } from "@/lib/player";
import { fetchMyRanked, seenRanked, type MyRanked } from "@/lib/ranked";
import { fetchStory, seenStory } from "@/lib/story";
import { hasSeenTutorial } from "@/lib/tutorial-seen";
import { useLockedScreen } from "@/lib/use-locked-screen";
import { useNow } from "@/lib/use-now";
import { usePackStatus } from "@/lib/use-pack-status";
import { fetchCoinHistory, seenCoinHistory } from "@/lib/wallet";

const PRELOAD_DELAY_MS = 800;

function preloadScreens() {
  const loads: [unknown, () => Promise<unknown>][] = [
    [seenCatalog(), fetchCatalog],
    [seenAbilities(), fetchAbilities],
    [seenCollection(), fetchCollection],
    [seenPackOdds(), fetchPackOdds],
    [seenSpecialPacks(), fetchSpecialPacks],
    [seenOpenedPackCount(), fetchOpenedPackCount],
    [seenCoinHistory(), fetchCoinHistory],
    // The Gioca page's tiles (the match in progress and the Fama come with the home itself).
    [seenConquestStatus(), fetchConquestStatus],
    [seenEmergencyLeaderboard(), fetchEmergencyLeaderboard],
    [seenEmergencyWeekLeaderboard(), fetchEmergencyWeekLeaderboard],
    [seenStory(), fetchStory],
  ];
  for (const [seen, load] of loads) {
    // A nicety: the screen fetches for itself anyway.
    if (!seen) load().catch(() => {});
  }
}

export function HomeScreen({ profile }: { profile: Profile }) {
  const packs = usePackStatus();
  // Last seen first, then the server's answer.
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(() => seenActiveMatch() ?? null);
  const [ranked, setRanked] = useState<MyRanked | null>(seenRanked);
  // A Sfida a tema running (SPEC §8.8): its name on the Gioca button.
  const [challenges, setChallenges] = useState<Challenge[] | null>(() => seenChallenges()?.challenges ?? null);
  // A minute is precise enough for a challenge starting or ending.
  const now = useNow(60_000);
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
    // The Fama on the Classificata button: without it the button still works.
    fetchMyRanked()
      .then((next) => {
        if (!cancelled) setRanked(next);
      })
      .catch((error: unknown) => console.error("Ranked failed", error));
    // Asking for the challenges also brings the banner of a new one, the first time.
    fetchChallenges()
      .then((next) => {
        if (!cancelled) setChallenges(next.challenges);
      })
      .catch((error: unknown) => console.error("Challenges failed", error));
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
        <div className="flex items-center gap-2">
          <CoinBadge balance={packs.status?.coin_balance ?? null} />
          <HomeLeaderboardButton />
          <Link href="/profilo" aria-label={`Profilo di ${profile.username}`} className="flex min-h-11 min-w-11 items-center justify-center">
            <PlayerAvatar username={profile.username} avatarUrl={profile.avatar_url} />
          </Link>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-2">
        {activeMatch && (
          <Link
            href={`/partita/?id=${activeMatch.id}`}
            className="tile flex min-h-12 shrink-0 items-center justify-between gap-3 bg-comic-cyan px-3.5 py-1 text-black short:min-h-11"
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

        {/* Today in one row: the objectives and, while there is one, the event. */}
        <div className="flex shrink-0 gap-2">
          <HomeObjectivesBar />
          <EventBanner compact />
        </div>

        <PackPanel
          status={packs.status}
          now={packs.now}
          resetsAt={packs.resetsAt}
          loadError={packs.error}
          onFailed={packs.refresh}
        />

        <HomePlayButtons
          ranked={ranked}
          challenge={
            challenges?.find(
              (challenge) => Date.parse(challenge.starts_at) <= now && now < Date.parse(challenge.ends_at),
            ) ?? null
          }
        />
      </main>
    </div>
  );
}
