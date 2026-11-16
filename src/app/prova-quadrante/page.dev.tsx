"use client";

// Fixed Quadrante scenes to look at the screen without a server: the fixed grid with its
// four border threats (SPEC §5.14). A development-only page: next.config.ts serves
// *.dev.tsx pages in `next dev` only, so it is never part of the published site. Moves
// are not sent anywhere; data are placeholders.
//   /prova-quadrante/?s=vuota   the empty grid, the player's turn
//   /prova-quadrante/?s=mossa   the bot's move into a corner: two border threats, one won and one lost
//   /prova-quadrante/?s=mobile  the shifting grid, which has no border threats
//   /prova-quadrante/?s=traguardo  an event with a seal target of 12

import { useEffect, useState } from "react";
import { QuadrantMatchScreen } from "@/components/quadrant-match-screen";
import type { MatchCard } from "@/lib/match";
import type { QuadrantCellView, QuadrantView } from "@/lib/quadrant";

const RARITY = ["", "delta", "gamma", "beta", "alfa", "omega"];
const card = (name: string, art: string, stats: Record<string, number>, faction = "heroes", rank = 3): MatchCard => ({
  definition_id: name,
  code: art,
  name,
  faction,
  flavor: "",
  art_url: `/cards/${art}.webp`,
  stats,
  rarity: { code: RARITY[rank], name: RARITY[rank][0].toUpperCase() + RARITY[rank].slice(1), rank, color: "#999" },
  power: null,
});

// Sides: FOR on top, VEL on the right, RES at the bottom, INT on the left.
const dredge = card("Dredge", "P077", { FOR: 8, VEL: 5, RES: 8, INT: 3 });
const talos = card("Talos", "P091", { FOR: 6, VEL: 7, RES: 1, INT: 2 }, "neutrals");
const plinth = card("Plinth", "P112", { FOR: 4, VEL: 2, RES: 9, INT: 6 });
const malleus = card("Malleus", "P029", { FOR: 7, VEL: 3, RES: 5, INT: 8 }, "villains", 4);
const mongi = card("Mongibello", "P060", { FOR: 9, VEL: 6, RES: 4, INT: 5 }, "heroes", 5);

const cell = (x: number, y: number, mine: boolean, c: MatchCard, me: number, opponent: number): QuadrantCellView => ({
  x,
  y,
  mine,
  values: [c.stats.FOR, c.stats.VEL, c.stats.RES, c.stats.INT],
  seals: { me, opponent },
  card: c,
});

function baseView(): QuadrantView {
  const now = Date.now();
  return {
    id: "prova",
    mode: "bot",
    format: "quadrant",
    variant: "fixed",
    bot_difficulty: "medium",
    status: "active",
    my_side: "a",
    i_open: true,
    size: 4,
    cards_per_side: 8,
    first_player_seals: 3,
    abilities: [
      { code: "FOR", name: "Forza", family: "body" },
      { code: "VEL", name: "Velocità", family: "body" },
      { code: "RES", name: "Resistenza", family: "body" },
      { code: "INT", name: "Intelletto", family: "mind" },
    ],
    border_threats: [
      { code: "T1", name: "Scippatore del porto", level: 3, value: 5, art_url: null, flavor: "" },
      { code: "T2", name: "Robot impazzito", level: 4, value: 6, art_url: null, flavor: "" },
      { code: "T3", name: "Incendio in centrale", level: 2, value: 4, art_url: null, flavor: "" },
      { code: "T4", name: "Blackout", level: 5, value: 7, art_url: null, flavor: "" },
    ],
    border_bite: 1,
    move: 1,
    moves_count: 16,
    to_move: "me",
    // Far away: the timer never expires here.
    deadline_at: new Date(now + 3_600_000).toISOString(),
    board: [],
    seals: { me: 0, opponent: 0 },
    controlled: { me: 0, opponent: 0 },
    my_hand: [dredge, plinth, mongi].map((c, i) => ({ ...c, instance_id: `h${i}` })),
    my_deck_left: 7,
    opponent_hand_count: 3,
    opponent_deck_left: 7,
    moves: [],
    result: null,
    end_reason: null,
    reward_coins: null,
    level_rewards: [],
    server_now: new Date(now).toISOString(),
    opponent: null,
  };
}

function scene(name: string): QuadrantView {
  const view = baseView();
  if (name === "mobile") {
    return { ...view, format: "quadrant_shifting", variant: "shifting", border_threats: null, border_bite: null };
  }
  if (name === "traguardo") return { ...view, seal_target: 12 };
  if (name !== "mossa") return view;
  // The player opened at (1, 0) with Talos; the bot answers in the corner (0, 0) with Malleus.
  const before: QuadrantView = {
    ...view,
    move: 2,
    to_move: "opponent",
    board: [cell(1, 0, true, talos, 3, 0)],
    seals: { me: 3, opponent: 0 },
    controlled: { me: 1, opponent: 0 },
    moves: [{ move: 1, mine: true, x: 1, y: 0, rotation: 0, name: "Talos", beaten: 0, removed: 0, placed: 3, auto_played: false }],
  };
  // Malleus turned once: top INT 8, right FOR 7, bottom VEL 3, left RES 5. At (0, 0): top 8 > 5,
  // left 5 < 7 (Blackout bites), right 7 > Talos' left 2.
  const malleusTurned: QuadrantCellView = { ...cell(0, 0, false, malleus, 0, 0), values: [8, 7, 3, 5] };
  return {
    ...view,
    move: 3,
    to_move: "me",
    board: [{ ...malleusTurned, seals: { me: 0, opponent: 1 } }, cell(1, 0, true, talos, 3, 1)],
    seals: { me: 3, opponent: 2 },
    controlled: { me: 1, opponent: 1 },
    moves: [
      ...before.moves,
      { move: 2, mine: false, x: 0, y: 0, rotation: 1, name: "Malleus", beaten: 1, removed: 0, placed: 2, auto_played: false },
    ],
    previous: [before],
  };
}

export default function QuadrantScenes() {
  // The scene comes from ?s=…, read once the page is in the browser (static pages have no query).
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    const scene = new URLSearchParams(window.location.search).get("s") ?? "vuota";
    const timer = window.setTimeout(() => setName(scene), 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (!name) return null;
  return <QuadrantMatchScreen key={name} initial={scene(name)} />;
}
