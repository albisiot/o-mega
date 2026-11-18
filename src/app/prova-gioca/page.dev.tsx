"use client";

// Fixed scenes to look at Gioca without a server. A development-only page: next.config.ts
// serves *.dev.tsx pages in `next dev` only, so it is never part of the published site.
// Names and numbers are placeholders. Tap a mode to open it.
//   /prova-gioca/?s=nuovo       first visit: «Prima partita», Conquista locked, Emergenza to play
//   /prova-gioca/?s=ancora      «Gioca ancora» on Quadrante, Emergenza done, Conquista open
//   /prova-gioca/?s=partita     a match in progress: no «Gioca ancora», the modes blocked
//   /prova-gioca/?s=premio      an event reward to open, the Conquista limit reached
//   /prova-gioca/?s=senza       no event, Story all done
//   /prova-gioca/?s=carico      while loading

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PlayMenuView, type EmergencyToday } from "@/components/play-menu";
import type { LastPlay } from "@/lib/last-play";
import type { ActiveMatch, ConquestStatus } from "@/lib/match";
import type { MyRanked } from "@/lib/ranked";
import type { StoryChapter } from "@/lib/story";

const RANKED: MyRanked = {
  season: "2026-11",
  season_label: "novembre 2026",
  season_ends_at: "2026-11-30T23:00:00Z",
  fama: 1240,
  league: "asso",
  league_start: 1200,
  next_league_at: 1800,
  best_fama: 1310,
  wins: 41,
  losses: 30,
  draws: 1,
  season_matches: 3,
  min_matches: 5,
  place: 14,
  prizes: [],
};

function mission(chapter: number, ord: number, completed: boolean, unlocked: boolean) {
  return { code: `m${chapter}-${ord}`, ord, title: "Missione", intro: "", opponent: "Bot", bot_difficulty: "easy" as const, threat_levels: [], reward_coins: 20, reward_card: null, completed, unlocked, star_coins: 10, stars: [], star_rarities: [], star_rarity_names: [], star_traits: [], star_traits_text: [] };
}

function chapters(allDone: boolean): StoryChapter[] {
  return [1, 2, 3, 4].map((n) => ({
    chapter: n,
    season: 1,
    season_title: "Il risveglio",
    number: n,
    title: ["Le prime luci", "Il porto", "La torre", "Il patto"][n - 1],
    intro: "",
    outro: null,
    season_ending: null,
    missions: [1, 2, 3].map((ord) => mission(n, ord, allDone || n === 1 || (n === 2 && ord === 1), allDone || n <= 2)),
  }));
}

/** The event tiles as EventBanner compact draws them, with fixed numbers. */
function FakeEvent({ reward }: { reward: boolean }) {
  if (reward) {
    return (
      <button type="button" className="flex min-h-12 min-w-0 flex-[1.6_1_0] flex-col justify-center bg-comic-yellow px-3 py-1 text-left text-black short:min-h-11">
        <span className="block truncate font-display text-[15px] uppercase leading-5">Premio evento!</span>
        <span className="block truncate text-[12px] font-bold leading-4">Tocca per aprirlo</span>
      </button>
    );
  }
  return (
    <span className="flex min-h-12 min-w-0 flex-[1.6_1_0] flex-col justify-center gap-0.5 bg-comic-yellow px-3 py-1 text-black short:min-h-11">
      <span className="block truncate font-display text-[15px] uppercase leading-5">Notte dei Cattivi</span>
      <span className="block truncate text-[12px] font-extrabold leading-4">90/200 punti · 2g 5h</span>
      <span className="h-1 bg-black/25" aria-hidden>
        <span className="block h-full w-[45%] bg-black" />
      </span>
    </span>
  );
}

type Scene = {
  active: ActiveMatch | null | undefined;
  conquest: ConquestStatus | null;
  ranked: MyRanked | null;
  emergency: EmergencyToday;
  story: StoryChapter[] | null;
  lastPlay: LastPlay | null;
  event: "on" | "reward" | "off";
};

const LOCKED: ConquestStatus = { unlocked: false, completed_matches: 2, level: 1, cards_lost_today: 0 };
const OPEN: ConquestStatus = { unlocked: true, completed_matches: 40, level: 6, cards_lost_today: 2 };

const SCENES: Record<string, Scene> = {
  nuovo: { active: null, conquest: LOCKED, ranked: null, emergency: null, story: chapters(false), lastPlay: null, event: "on" },
  ancora: {
    active: null,
    conquest: OPEN,
    ranked: RANKED,
    emergency: { passed: 6, rank: 12 },
    story: chapters(false),
    lastPlay: { mode: "bot", format: "quadrant_shifting", difficulty: "hard" },
    event: "on",
  },
  partita: {
    active: { id: "x", mode: "bot", format: "classic", bot_difficulty: "medium", current_round: 3 },
    conquest: OPEN,
    ranked: RANKED,
    emergency: null,
    story: chapters(false),
    lastPlay: { mode: "ranked", format: "triple" },
    event: "on",
  },
  premio: {
    active: null,
    conquest: { ...OPEN, cards_lost_today: 10 },
    ranked: RANKED,
    emergency: { passed: 8, rank: 1 },
    story: chapters(false),
    lastPlay: { mode: "conquest", format: "classic" },
    event: "reward",
  },
  senza: {
    active: null,
    conquest: OPEN,
    ranked: RANKED,
    emergency: null,
    story: chapters(true),
    lastPlay: { mode: "queue", format: "boss" },
    event: "off",
  },
  carico: { active: undefined, conquest: null, ranked: null, emergency: undefined, story: null, lastPlay: null, event: "off" },
};

function Scenes() {
  const scene = SCENES[useSearchParams().get("s") ?? "nuovo"] ?? SCENES.nuovo;
  return (
    <>
      <PlayMenuView
        active={scene.active}
        error={null}
        conquest={scene.conquest}
        ranked={scene.ranked}
        emergency={scene.emergency}
        story={scene.story}
        lastPlay={scene.lastPlay}
        event={scene.event === "off" ? null : <FakeEvent reward={scene.event === "reward"} />}
        now={Date.parse("2026-11-17T12:00:00Z")}
        onForfeit={() => {}}
      />
      <FakeNav />
    </>
  );
}

/** The bottom bar as BottomNav draws it on /gioca (it hides itself on this page). */
function FakeNav() {
  const tabs = ["Home", "Gioca", "Collezione", "Negozio", "Profilo"];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t-[3px] border-foreground bg-black">
      <ul className="mx-auto flex max-w-md">
        {tabs.map((tab) => (
          <li
            key={tab}
            className={`flex h-[60px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${
              tab === "Gioca" ? "bg-comic-yellow font-extrabold text-black" : "font-bold text-muted"
            }`}
          >
            <span className="h-[22px] w-[22px] border-2 border-current" />
            {tab}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function PlayScenesPage() {
  return (
    <Suspense>
      <Scenes />
    </Suspense>
  );
}
