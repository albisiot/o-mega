"use client";

// Fixed scenes of the end notices (SPEC §11.7), to look at them without a server or an
// account. A development-only page: next.config.ts serves *.dev.tsx pages in `next dev` only,
// so it is never part of the published site. Names and numbers are placeholders.
//   /prova-fine/                       four notices in line, one of each kind (default)
//   /prova-fine/?s=evento              an event completed: 4th of 87
//   /prova-fine/?s=evento-bloccato     an event not completed: no leaderboard for the player
//   /prova-fine/?s=sfida               a Sfida a tema: 23rd, below the list
//   /prova-fine/?s=sfida-emergenza     a Sfida a tema in the Emergenza, the run not finished
//   /prova-fine/?s=sfida-senza         a Sfida a tema without a leaderboard
//   /prova-fine/?s=settimana           the Emergenza della settimana: 2nd, with a prize
//   /prova-fine/?s=settimana-non-finita
//   /prova-fine/?s=mandato             a Mandato: Asso, 7th, with a prize and a title
// Add &v=classifica to open the scene on its leaderboard.

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { EndNoticeDialog } from "@/components/end-notice-popup";
import type { EndBoard, EndBoardEntry, EndNotice } from "@/lib/end-notices";

const NAMES = [
  "LaFenice", "Giacomo_Testa", "gaia_b", "Massimo_Cattane_2632", "OmbraDiMegara", "TitanoRosso",
  "lucia.v", "ZetaRax_fan", "Barbara_Neri", "Il_Custode", "Nova99", "marco_f",
];

/** A leaderboard of `players` with the first `size` rows; the player at `myRank` (null: not ranked). */
function board(players: number, myRank: number | null, value: (rank: number) => number, value2: (rank: number) => number | null, size = 10): EndBoard {
  const entry = (rank: number): EndBoardEntry => ({
    rank,
    username: rank === myRank ? "Tu_Stesso" : NAMES[(rank - 1) % NAMES.length],
    avatar_url: null,
    value: value(rank),
    value2: value2(rank),
    is_me: rank === myRank,
  });
  const top = Array.from({ length: Math.min(size, players) }, (_, i) => entry(i + 1));
  return { players, top, me: myRank === null ? null : entry(myRank) };
}

const EVENT: EndNotice = {
  id: "event:e1",
  kind: "event",
  ref: "e1",
  title: "La notte dei Cattivi",
  color: null,
  starts_at: "2026-11-12T19:00:00Z",
  ends_at: "2026-11-19T19:00:00Z",
  rank: 4,
  players: 87,
  result: { points: 1340, steps: 5, tiers: 5 },
  board: board(87, 4, (rank) => 2100 - rank * 90, (rank) => (rank < 9 ? 5 : 4)),
  board_locked: false,
};

const EVENT_LOCKED: EndNotice = {
  ...EVENT,
  id: "event:e2",
  ref: "e2",
  rank: null,
  players: null,
  result: { points: 340, steps: 2, tiers: 5 },
  board: null,
  board_locked: true,
};

const CHALLENGE: EndNotice = {
  id: "challenge:c1",
  kind: "challenge",
  ref: "c1",
  title: "Solo Delta",
  color: "#7dd3fc",
  starts_at: "2026-11-14T23:00:00Z",
  ends_at: "2026-11-17T23:00:00Z",
  rank: 23,
  players: 41,
  result: { format: "classic", wins: 6, played: 11, score: 0, finished: null, threats: null },
  board: board(41, 23, (rank) => Math.max(1, 30 - rank), (rank) => 34 - rank),
  board_locked: false,
};

const CHALLENGE_EMERGENCY: EndNotice = {
  ...CHALLENGE,
  id: "challenge:c2",
  ref: "c2",
  title: "Emergenza degli Eroi",
  color: "#fda4af",
  rank: null,
  players: 18,
  result: { format: "emergency", wins: 4, played: 0, score: 96, finished: false, threats: 10 },
  board: board(18, null, (rank) => Math.max(1, 10 - Math.floor(rank / 2)), (rank) => 260 - rank * 9),
};

const CHALLENGE_PLAIN: EndNotice = {
  ...CHALLENGE,
  id: "challenge:c3",
  ref: "c3",
  title: "Senza starter",
  color: "#bef264",
  rank: null,
  players: null,
  result: { format: "triple", wins: 1, played: 3, score: 0, finished: null, threats: null },
  board: null,
};

const WEEK: EndNotice = {
  id: "emergency_week:2026-11-09",
  kind: "emergency_week",
  ref: "2026-11-09",
  title: "Emergenza della settimana",
  color: null,
  starts_at: "2026-11-08T23:00:00Z",
  ends_at: "2026-11-15T23:00:00Z",
  rank: 2,
  players: 37,
  result: { passed: 9, score: 251, finished: true, threats: 10, prize_coins: 50, prize_packs: 1, prize_claimed: false },
  board: board(37, 2, (rank) => Math.max(0, 10 - Math.floor(rank / 2)), (rank) => 280 - rank * 11),
  board_locked: false,
};

const WEEK_UNFINISHED: EndNotice = {
  ...WEEK,
  id: "emergency_week:2026-11-02",
  ref: "2026-11-02",
  starts_at: "2026-11-01T23:00:00Z",
  ends_at: "2026-11-08T23:00:00Z",
  rank: null,
  result: { passed: 3, score: 70, finished: false, threats: 10, prize_coins: 0, prize_packs: 0, prize_claimed: false },
  board: board(37, null, (rank) => Math.max(0, 10 - Math.floor(rank / 2)), (rank) => 280 - rank * 11),
};

const SEASON: EndNotice = {
  id: "ranked_season:2026-10",
  kind: "ranked_season",
  ref: "2026-10",
  title: "Mandato di ottobre 2026",
  color: null,
  starts_at: "2026-09-30T22:00:00Z",
  ends_at: "2026-10-31T23:00:00Z",
  rank: 7,
  players: 212,
  result: {
    fama: 1320,
    league: "asso",
    league_name: "Asso",
    matches: 48,
    wins: 27,
    prize_coins: 100,
    prize_packs: 1,
    prize_claimed: false,
    title: null,
  },
  board: board(212, 7, (rank) => 2700 - rank * 190, () => null),
  board_locked: false,
};

const SCENES: Record<string, EndNotice[]> = {
  fila: [SEASON, WEEK, CHALLENGE, EVENT],
  evento: [EVENT],
  "evento-bloccato": [EVENT_LOCKED],
  sfida: [CHALLENGE],
  "sfida-emergenza": [CHALLENGE_EMERGENCY],
  "sfida-senza": [CHALLENGE_PLAIN],
  settimana: [WEEK],
  "settimana-non-finita": [WEEK_UNFINISHED],
  mandato: [SEASON],
};

function Scene() {
  const params = useSearchParams();
  const scene = params.get("s") ?? "fila";
  const [queue, setQueue] = useState<EndNotice[]>(() => SCENES[scene] ?? SCENES.fila);
  const [left, setLeft] = useState<string | null>(null);
  const notice = queue[0] ?? null;

  return (
    <main className="flex flex-1 flex-col gap-3 p-4">
      <h1 className="font-display text-3xl uppercase text-comic-yellow">Prova avvisi di fine</h1>
      <p className="text-sm text-muted">
        {notice ? "L'avviso è aperto sopra." : "Fila finita."} {left && `Aperta: ${left}`}
      </p>
      <button type="button" className="btn bg-comic-yellow text-black" onClick={() => setQueue(SCENES[scene] ?? SCENES.fila)}>
        Ricomincia
      </button>
      {notice && (
        <EndNoticeDialog
          key={notice.id}
          notice={notice}
          waiting={queue.length - 1}
          initialView={params.get("v") === "classifica" ? "board" : "result"}
          onClose={() => setQueue((items) => items.slice(1))}
          onOpen={(href) => {
            setLeft(href);
            setQueue((items) => items.slice(1));
          }}
        />
      )}
    </main>
  );
}

export default function EndNoticeTestPage() {
  return (
    <Suspense fallback={null}>
      <Scene />
    </Suspense>
  );
}
