"use client";

// Fixed event scenes to look at the Classifica generale without a server. A development-only
// page: next.config.ts serves *.dev.tsx pages in `next dev` only, so it is never part of the
// published site. Names and numbers are placeholders.
//   /prova-evento/?s=completato  every target reached: "Evento completato! Sei 12° su 87", the list in its tab
//   /prova-evento/?s=lontano     completed, 140° of 300: the place fixed under the first 100
//   /prova-evento/?s=bloccata    one target to go: the leaderboard is still closed
//   /prova-evento/?s=finito      no event running: the final leaderboard of the last one

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { EventDetails, EventShell } from "@/components/event-details";
import { EventLeaderboardList } from "@/components/event-leaderboard";
import type { EventLeaderboard, EventLeaderboardEntry } from "@/lib/event-leaderboard";
import type { EventTier, GameEvent } from "@/lib/events";
import { useNow } from "@/lib/use-now";

const NAMES = ["Fulmine_Rosso", "OmbraNera", "CapitanoVolt", "Lia_Stella", "Ferrovecchio", "Neon_Kid", "Zara88", "Dottor_Ghiaccio"];

const HOUR = 3_600_000;

function board(now: number, players: number, myRank: number, completed: number, ended = false): EventLeaderboard {
  const entry = (rank: number): EventLeaderboardEntry => {
    const done = rank <= completed;
    return {
      rank,
      username: rank === myRank ? "Albi" : `${NAMES[rank % NAMES.length]}${rank > NAMES.length ? rank : ""}`,
      // Some players with a card drawing, some with the account picture (here: the initial).
      avatar_url: rank % 3 === 0 ? null : `/cards/P${String(((rank * 7) % 120) + 1).padStart(3, "0")}.webp`,
      points: done ? 2000 - rank * 5 : Math.max(10, 690 - (rank - completed) * 5),
      steps: done ? 4 : Math.max(0, 3 - Math.floor((rank - completed) / 40)),
      completed_at: done ? new Date(now - rank * HOUR).toISOString() : null,
      is_me: rank === myRank,
    };
  };
  const all = Array.from({ length: players }, (_, index) => entry(index + 1));
  return {
    event_id: "prova",
    title: ended ? "Notte dei Cattivi" : "Settimana degli Eroi",
    starts_at: new Date(now - 48 * HOUR).toISOString(),
    ends_at: new Date(now + (ended ? -2 : 72) * HOUR).toISOString(),
    ended,
    tiers: 4,
    players,
    completed,
    top: all.slice(0, 100),
    me: all[myRank - 1] ?? null,
  };
}

function tier(index: number, points: number, reached: boolean): EventTier {
  return { tier: index, points, coins: 50 * index, packs: index === 4 ? 1 : 0, cards: [], reached, opening_ids: [], seen: true };
}

function gameEvent(now: number, myPoints: number): GameEvent {
  const targets = [100, 250, 450, 700];
  return {
    id: "prova",
    title: "Settimana degli Eroi",
    description: "Gioca partite e Emergenze per salire di traguardo.",
    starts_at: new Date(now - 48 * HOUR).toISOString(),
    ends_at: new Date(now + 72 * HOUR).toISOString(),
    points: {
      friendly: { win: 30, draw: 15, loss: 10 },
      conquest: { win: 40, draw: 20, loss: 15 },
      bot: { win: 10, draw: 5, loss: 3 },
      story: { win: 10, draw: 5, loss: 3 },
      emergency: { passed: 5 },
    },
    daily_cap: null,
    tiers: targets.map((points, index) => tier(index + 1, points, myPoints >= points)),
    my_points: myPoints,
    my_points_today: 0,
  };
}

export default function EventTestPage() {
  return (
    <Suspense>
      <Scene />
    </Suspense>
  );
}

function Scene() {
  const scene = useSearchParams().get("s") ?? "completato";
  const now = useNow(30_000);
  if (scene === "finito") {
    const last = board(now, 42, 5, 18, true);
    return (
      <EventShell title="Eventi">
        <p className="shrink-0 text-sm font-medium text-muted">
          Nessun evento in programma. Quando ne arriva uno lo trovi nella home e in Gioca.
        </p>
        <h2 className="shrink-0 font-display text-xl uppercase leading-6 text-comic-yellow">Classifica finale · {last.title}</h2>
        <EventLeaderboardList board={last} />
      </EventShell>
    );
  }
  if (scene === "bloccata") {
    return <EventDetails event={gameEvent(now, 520)} now={now} abilities={[]} fixedLeaderboard={{ status: "locked" }} />;
  }
  const shown = scene === "lontano" ? board(now, 300, 140, 160) : board(now, 87, 12, 23);
  return (
    <EventDetails
      event={gameEvent(now, shown.me?.points ?? 0)}
      now={now}
      abilities={[]}
      fixedLeaderboard={{ status: "ready", board: shown }}
    />
  );
}
