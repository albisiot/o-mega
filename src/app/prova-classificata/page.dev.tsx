"use client";

// Fixed scenes to look at the Classificata's way in without a server. A development-only page:
// next.config.ts serves *.dev.tsx pages in `next dev` only, so it is never part of the
// published site. Numbers are placeholders.
//   /prova-classificata/?s=home       the home with the split Gioca / Classificata buttons
//   /prova-classificata/?s=home-vuota the same before the Fama arrives
//   /prova-classificata/?s=pagina     the Classificata page, 3rd in the Mandato, a prize to claim
//   /prova-classificata/?s=bloccata   the page with a match in progress: the modes are off

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { HomePlayButtons } from "@/components/home-play-buttons";
import { RankedModesView } from "@/components/ranked-modes";
import type { MyRanked } from "@/lib/ranked";

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
  place: 3,
  prizes: [{ season: "2026-10", label: "ottobre 2026", place: 12, league: "veterano", fama: 980, coins: 100, packs: 0, title: null }],
};

/** The home as laid out by HomeScreen, with blocks in place of the parts that need a server. */
function HomeScene({ ranked }: { ranked: MyRanked | null }) {
  return (
    <div className="home-shell">
      <header className="flex shrink-0 items-center justify-between px-4 py-1 short:py-0">
        <span className="-skew-x-8 font-display text-[30px] leading-9 tracking-wide text-comic-yellow [text-shadow:3px_3px_0_var(--comic-magenta)]">
          O-MEGA
        </span>
        <span className="h-11 w-24 bg-panel" />
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-2">
        <div className="flex min-h-11 shrink-0 items-center bg-panel px-3.5 font-display uppercase short:min-h-10">Obiettivi del giorno</div>
        <section className="flex flex-[4_1_0] flex-col gap-2">
          <div className="cut-bottom flex min-h-52 flex-1 items-end bg-comic-yellow p-3.5 font-display text-2xl uppercase text-black short:min-h-39">
            Pacchetto del giorno
          </div>
        </section>
        <HomePlayButtons ranked={ranked} />
        <div className="grid shrink-0 grid-cols-2 gap-2">
          <div className="min-h-[70px] bg-comic-cyan" />
          <div className="min-h-[70px] bg-foreground" />
        </div>
      </main>
      <div className="h-16 shrink-0 border-t-[3px] border-foreground bg-black" />
    </div>
  );
}

function Scene() {
  const scene = useSearchParams().get("s") ?? "home";
  if (scene === "home") return <HomeScene ranked={RANKED} />;
  if (scene === "home-vuota") return <HomeScene ranked={null} />;
  if (scene === "bloccata") {
    return (
      <RankedModesView
        ranked={RANKED}
        active={{ id: "prova", mode: "ranked", format: "classic", bot_difficulty: null, current_round: 2 }}
        error={null}
      />
    );
  }
  return <RankedModesView ranked={RANKED} active={null} error={null} />;
}

export default function RankedTestPage() {
  return (
    <Suspense fallback={null}>
      <Scene />
    </Suspense>
  );
}
