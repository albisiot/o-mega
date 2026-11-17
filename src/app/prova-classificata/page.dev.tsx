"use client";

// Fixed scenes to look at the Classificata without a server. A development-only page:
// next.config.ts serves *.dev.tsx pages in `next dev` only, so it is never part of the
// published site. Names and numbers are placeholders.
//   /prova-classificata/?s=home       the home with the split Gioca / Classificata buttons
//   /prova-classificata/?s=home-vuota the same before the Fama arrives
//   /prova-classificata/?s=pagina     the Classificata page, 3rd in the Mandato
//   /prova-classificata/?s=bloccata   the page at its fullest: a prize to claim and a match in progress
//   /prova-classificata/?s=albo       the Albo full: 10 Reggenti, the player 14th, a prize to claim
//   /prova-classificata/?s=oro        the Albo d'oro, one past Mandato at a time

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { HomePlayButtons } from "@/components/home-play-buttons";
import { LeaderboardView } from "@/components/leaderboard-view";
import { RankedModesView } from "@/components/ranked-modes";
import type { MyRanked, RankedBoard, RankedBoardEntry, RankedLeague } from "@/lib/ranked";
import { leagueOf } from "@/lib/ranked";

const PRIZE = { season: "2026-10", label: "ottobre 2026", place: 12, league: "veterano" as const, fama: 980, coins: 100, packs: 0, title: null };

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

const NAMES = ["Giacomo_Testa", "LaFenice", "gaia_b", "Massimo_Cattane_2632", "Riccardo_Sala", "TigreBlu", "IlariaFarina", "Dani_17", "Noemi_Galli", "PanteraOro", "Fabio_CA", "Vero85", "Alice_P", "Alb1s10t"];

function entry(place: number, me = false): RankedBoardEntry {
  const fama = 2900 - place * 130;
  return {
    place,
    username: NAMES[(place - 1) % NAMES.length],
    // Some with a card drawing, some with the initial.
    avatar_url: place % 3 === 0 ? null : `/cards/P${String(((place * 7) % 120) + 1).padStart(3, "0")}.webp`,
    title: place % 4 === 1 ? "Campione dell'Emergenza" : null,
    value: fama,
    fama,
    league: leagueOf(fama) as RankedLeague,
    matches: 40 - place,
    wins: 25 - place,
    losses: 15,
    is_me: me,
  };
}

const BOARD: RankedBoard = {
  season: "2026-11",
  label: "novembre 2026",
  ends_at: "2026-11-30T23:00:00Z",
  current: true,
  format: null,
  players: 87,
  top: Array.from({ length: 10 }, (_, i) => entry(i + 1)),
  me: entry(14, true),
};

const HALL = [
  { season: "2026-10", label: "ottobre 2026", podium: [entry(1), entry(2), entry(3)] },
  { season: "2026-09", label: "settembre 2026", podium: [entry(4), entry(5), entry(6)] },
];

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
    </div>
  );
}

/** The Classificata page; .home-shell already leaves the bottom bar's room. */
function PageScene({ prize, active }: { prize: boolean; active: boolean }) {
  return (
    <RankedModesView
      ranked={{ ...RANKED, place: 3, prizes: prize ? [PRIZE] : [] }}
      active={active ? { id: "prova", mode: "ranked", format: "classic", bot_difficulty: null, current_round: 2 } : null}
      error={null}
      onPrizeClaimed={() => {}}
    />
  );
}

function Scene() {
  const scene = useSearchParams().get("s") ?? "home";
  if (scene === "home") return <HomeScene ranked={RANKED} />;
  if (scene === "home-vuota") return <HomeScene ranked={null} />;
  if (scene === "bloccata") return <PageScene prize active />;
  if (scene === "albo" || scene === "oro") {
    return (
      <LeaderboardView
        initialBoard="general"
        initialPeriod={null}
        initialAlbo
        rankedPreview={{ mine: { ...RANKED, prizes: [PRIZE] }, board: BOARD, hall: HALL }}
      />
    );
  }
  return <PageScene prize={false} active={false} />;
}

export default function RankedTestPage() {
  return (
    <Suspense fallback={null}>
      <Scene />
    </Suspense>
  );
}
