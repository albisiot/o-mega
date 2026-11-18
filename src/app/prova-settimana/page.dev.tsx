"use client";

// Fixed scenes of the Emergenza della settimana (SPEC §5.16), to look at its screens without a
// server or an account. A development-only page: next.config.ts serves *.dev.tsx pages in
// `next dev` only, so it is never part of the published site. Names and numbers are placeholders;
// the leaderboard, the podium and the event points answer from here instead of the server.
//   /prova-settimana/?s=briefing    before the squad: rules, levels, this week's leaderboard
//   /prova-settimana/?s=scelta      the 4th threat of 10, three already played
//   /prova-settimana/?s=risultato   the run over: 7 of 10, the week and the leaderboard
//   /prova-settimana/?s=classifica  the board of the Classifiche

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { EmergencyScreen } from "@/components/emergency-screen";
import { LeaderboardView } from "@/components/leaderboard-view";
import type { EmergencyLineups, EmergencyPlay, EmergencyRun, EmergencySquadCard, EmergencyView, EmergencyWeekLeaderboard } from "@/lib/emergency";
import type { Leaderboard } from "@/lib/leaderboards";
import { getSupabase } from "@/lib/supabase/client";

const RARITY = ["", "delta", "gamma", "beta", "alfa", "omega"];
const COLORS = ["", "#9aa5b1", "#4fc3a1", "#4f8fe0", "#b06ad9", "#e8a23a"];
const card = (name: string, art: string, stats: Record<string, number>, faction: string, rank: number) => ({
  definition_id: art,
  instance_id: `i-${art}`,
  code: art,
  name,
  faction,
  flavor: "",
  art_url: `/cards/${art}.webp`,
  stats,
  rarity: { code: RARITY[rank], name: RARITY[rank][0].toUpperCase() + RARITY[rank].slice(1), rank, color: COLORS[rank] },
  power: null,
  played_round: null as number | null,
});

const SQUAD = [
  card("Dredge", "P077", { FOR: 8, RES: 8, ENE: 7, VEL: 5, INT: 3, MAG: 1, FUR: 4, PER: 4, VOL: 5, PSI: 2, COM: 6, TEC: 3 }, "heroes", 3),
  card("Talos", "P091", { FOR: 10, RES: 1, ENE: 10, VEL: 7, INT: 6, MAG: 2, FUR: 3, PER: 5, VOL: 4, PSI: 1, COM: 5, TEC: 7 }, "neutrals", 4),
  card("Plinth", "P112", { FOR: 10, RES: 10, ENE: 3, VEL: 2, INT: 2, MAG: 1, FUR: 1, PER: 3, VOL: 6, PSI: 1, COM: 4, TEC: 2 }, "heroes", 2),
  card("Malleus", "P029", { FOR: 10, RES: 8, ENE: 3, VEL: 4, INT: 3, MAG: 2, FUR: 5, PER: 4, VOL: 5, PSI: 3, COM: 7, TEC: 2 }, "villains", 4),
  card("Upkeep", "P218", { FOR: 3, RES: 5, ENE: 6, VEL: 2, INT: 6, MAG: 3, FUR: 2, PER: 5, VOL: 4, PSI: 3, COM: 2, TEC: 9 }, "heroes", 2),
  card("Statera", "P220", { FOR: 5, RES: 8, ENE: 0, VEL: 3, INT: 5, MAG: 9, FUR: 2, PER: 10, VOL: 6, PSI: 4, COM: 3, TEC: 2 }, "neutrals", 2),
  card("Collateral", "P073", { FOR: 6, RES: 4, ENE: 3, VEL: 5, INT: 4, MAG: 2, FUR: 5, PER: 4, VOL: 3, PSI: 2, COM: 8, TEC: 6 }, "neutrals", 2),
  card("Zeta Rax", "P099", { FOR: 3, RES: 3, ENE: 4, VEL: 6, INT: 5, MAG: 2, FUR: 7, PER: 8, VOL: 4, PSI: 3, COM: 9, TEC: 4 }, "neutrals", 1),
  card("Actuary", "P047", { FOR: 5, RES: 6, ENE: 6, VEL: 3, INT: 8, MAG: 2, FUR: 3, PER: 5, VOL: 5, PSI: 2, COM: 2, TEC: 8 }, "neutrals", 3),
  card("Recesso", "P224", { FOR: 5, RES: 6, ENE: 0, VEL: 4, INT: 4, MAG: 10, FUR: 3, PER: 4, VOL: 6, PSI: 5, COM: 10, TEC: 1 }, "heroes", 3),
];

const LEVELS = [2, 5, 4, 1, 6, 4, 3, 5, 6, 4];
const TARGETS: Record<string, number> = { "1": 9, "2": 15, "3": 20, "4": 25, "5": 30, "6": 34 };
const THREATS = [
  ["Robot impazzito", ["FOR", "TEC"]],
  ["Assalto al porto", ["FOR", "RES", "COM", "VEL", "PER"]],
  ["Rapina al Rintocco", ["FUR", "VEL", "INT", "TEC"]],
  ["Scippatore", ["VEL"]],
  ["Invasione dimensionale", ["FOR", "RES", "ENE", "MAG", "PSI", "VOL"]],
  ["Blackout in centro", ["TEC", "INT", "ENE", "PER"]],
  ["Incendio al mercato", ["RES", "VOL", "VEL"]],
  ["Sciame di droni", ["TEC", "PER", "VEL", "ENE", "FUR"]],
  ["Il gigante d'acciaio", ["FOR", "RES", "ENE", "COM", "TEC", "VOL"]],
  ["Ostaggi in banca", ["PER", "INT", "FUR", "COM"]],
] as const;

const RULES: EmergencyView["rules"] = {
  threats_per_run: 10,
  max_failures: 3,
  targets: TARGETS,
  rewards: [
    { passed: 4, coins: 20 },
    { passed: 7, coins: 30 },
    { passed: 10, coins: 50 },
  ],
  finish_xp: 0,
};

/** The play of round r by squad card i: its score against the threat's target. */
function play(r: number, i: number, score: number): EmergencyPlay {
  const [name, abilities] = THREATS[r - 1];
  const required = TARGETS[String(LEVELS[r - 1])];
  return {
    round: r,
    level: LEVELS[r - 1],
    threat: { name, abilities: [...abilities], flavor: "" },
    instance_id: SQUAD[i].instance_id,
    definition_id: SQUAD[i].definition_id,
    base: score,
    bonus: 0,
    score,
    required,
    passed: score >= required,
  };
}

function run(plays: EmergencyPlay[], status: EmergencyRun["status"]): EmergencyRun {
  const squad: EmergencySquadCard[] = SQUAD.map((c) => ({ ...c, played_round: plays.find((p) => p.instance_id === c.instance_id)?.round ?? null }));
  const next = plays.length + 1;
  return {
    id: "run-week",
    status,
    current_round: status === "active" ? next : plays.length,
    passed: plays.filter((p) => p.passed).length,
    failed: plays.filter((p) => !p.passed).length,
    total_score: plays.reduce((sum, p) => sum + p.score, 0),
    coins: plays.filter((p) => p.passed).length >= 7 ? 50 : plays.filter((p) => p.passed).length >= 4 ? 20 : 0,
    xp: 0,
    squad,
    plays,
    current_threat:
      status === "active"
        ? { id: "t4", round: next, level: LEVELS[next - 1], name: THREATS[next - 1][0], abilities: [...THREATS[next - 1][1]], flavor: "" }
        : null,
    foreseen_threats: [],
  };
}

const view = (r: EmergencyRun | null): EmergencyView => ({
  day: "2026-11-19",
  week: "2026-11-16",
  ends_at: "2026-11-22T23:00:00Z",
  server_now: "2026-11-19T10:00:00Z",
  threat_levels: LEVELS,
  threat_rarities: LEVELS.map(() => null),
  rules: RULES,
  run: r,
});

const PLAYED_THREE = [play(1, 6, 15), play(2, 3, 31), play(3, 8, 21)];
const DONE = [
  play(1, 6, 15),
  play(2, 3, 31),
  play(3, 8, 21),
  play(4, 7, 9),
  play(5, 1, 29),
  play(6, 4, 26),
  play(7, 2, 22),
  play(8, 0, 30),
  play(9, 9, 35),
  play(10, 5, 22),
];

const SCENES: Record<string, EmergencyView> = {
  briefing: view(null),
  scelta: view(run(PLAYED_THREE, "active")),
  risultato: view(run(DONE, "finished")),
};

const PLAYERS = [
  ["LaFenice", 10, 268, "Eroe della settimana"],
  ["Giacomo_Testa", 9, 241, null],
  ["gaia_b", 8, 230, "Pioniere"],
  ["Massimo_Cattane_2632", 7, 219, null],
  ["NottePiena", 7, 204, null],
  ["Orsetto77", 6, 199, null],
  ["Ilaria.R", 6, 187, null],
  ["Tuono_Blu", 5, 150, null],
  ["Marta_Verdi", 5, 141, null],
  ["kappa", 4, 120, null],
] as const;

function board(meRank: number | null): EmergencyWeekLeaderboard {
  const top = PLAYERS.map(([username, passed, total, title], i) => ({
    rank: i + 1,
    username: meRank === i + 1 ? "Tu" : username,
    avatar_url: null,
    title,
    passed,
    total_score: total,
    is_me: meRank === i + 1,
  }));
  return {
    week: "2026-11-16",
    ends_at: "2026-11-22T23:00:00Z",
    server_now: "2026-11-19T10:00:00Z",
    threats_per_run: 10,
    players: 23,
    top,
    me: meRank ? top[meRank - 1] : null,
    my_run: null,
    prizes: [
      { from: 1, to: 1, coins: 100, packs: 2 },
      { from: 2, to: 2, coins: 50, packs: 1 },
      { from: 3, to: 3, coins: 0, packs: 1 },
      { from: 4, to: 10, coins: 50, packs: 0 },
    ],
    prize_min_passed: 1,
  };
}

function lineups(live: boolean): EmergencyLineups {
  return {
    day: live ? "2026-11-16" : "2026-11-09",
    live,
    lineups: [1, 2, 3].map((rank) => ({
      ...board(null).top[rank - 1],
      cards: SQUAD.map((c, i) => ({ ...c, play: i < 8 ? { round: i + 1, threat: THREATS[i][0], score: 20 + i, required: 20, passed: true } : null })),
    })),
  };
}

const CLASSIFICHE: Leaderboard = {
  board: "emergency_week",
  period: "week",
  from: "2026-11-16",
  players: 23,
  min_matches_for_rate: 10,
  top: PLAYERS.map(([username, passed, total, title], i) => ({
    rank: i + 1,
    username,
    avatar_url: null,
    title,
    value: passed,
    value2: total,
    detail: { total_score: total },
    is_me: false,
  })),
  me: { rank: 14, username: "Tu", avatar_url: null, title: null, value: 3, value2: 88, detail: { total_score: 88 }, is_me: true },
};

/** The page's own answers to the RPCs the screens call, instead of the server's. */
function answerRpcs(scene: string) {
  const fakes: Record<string, unknown> = {
    get_emergency_week_leaderboard: board(scene === "risultato" ? 4 : null),
    get_emergency_week_lineups: lineups(scene === "risultato"),
    get_event_points_for: scene === "risultato" ? { points: 35, title: "Notte dei Cattivi", total: 125, new_rewards: 0 } : null,
    get_leaderboard: CLASSIFICHE,
  };
  const client = getSupabase() as unknown as { rpc: (name: string, args?: unknown) => unknown; realRpc?: (name: string, args?: unknown) => unknown };
  client.realRpc ??= client.rpc.bind(client);
  const real = client.realRpc;
  client.rpc = (name: string, args?: unknown) => (name in fakes ? Promise.resolve({ data: fakes[name], error: null }) : real(name, args));
}

function Scenes() {
  const scene = useSearchParams().get("s") ?? "briefing";
  // Before the screens ask: their effects run after this render.
  useState(() => answerRpcs(scene));
  if (scene === "classifica") return <LeaderboardView initialBoard="emergency_week" initialPeriod="week" />;
  return <EmergencyScreen key={scene} initial={SCENES[scene] ?? SCENES.briefing} kind="week" />;
}

export default function WeeklyEmergencyScenesPage() {
  return (
    <Suspense>
      <Scenes />
    </Suspense>
  );
}
