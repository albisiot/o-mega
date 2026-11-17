"use client";

// Fixed Quadrante scenes to look at the screen without a server: the fixed grid with its
// four border threats (SPEC §5.14). A development-only page: next.config.ts serves
// *.dev.tsx pages in `next dev` only, so it is never part of the published site. Moves
// are not sent anywhere; data are placeholders.
//   /prova-quadrante/?s=vuota   the empty grid, the player's turn
//   /prova-quadrante/?s=mossa   the bot's move into a corner: two border threats, one won and one lost
//   /prova-quadrante/?s=mobile  the shifting grid, which has no border threats
//   /prova-quadrante/?s=traguardo  an event with a seal target of 12
//   /prova-quadrante/?s=scontri  the player's card meets four, one family each: crushing, clearly, a little, a tie
//   /prova-quadrante/?s=minacce  the bot's card in a corner: two border threats (one won, one lost) and two cards

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

// Scenes with one ability per family, to see each family's effects at every gap.
const FAMILY_ABILITIES: QuadrantView["abilities"] = [
  { code: "FOR", name: "Forza", family: "body" },
  { code: "INT", name: "Intelletto", family: "mind" },
  { code: "ENE", name: "Energia", family: "power" },
  { code: "COM", name: "Combattimento", family: "craft" },
];
const famCard = (name: string, art: string, [FOR, INT, ENE, COM]: number[], faction = "heroes") => card(name, art, { FOR, INT, ENE, COM }, faction);

/** A card turned `rotation` quarter turns: side d shows ability d − rotation. */
function turned(x: number, y: number, mine: boolean, c: MatchCard, me: number, opponent: number, rotation = 0): QuadrantCellView {
  const base = FAMILY_ABILITIES.map((a) => c.stats[a.code]);
  const values = [0, 1, 2, 3].map((d) => base[(d - rotation + 4) % 4]) as QuadrantCellView["values"];
  return { x, y, mine, values, seals: { me, opponent }, card: c };
}

/** A family scene: the grid before the last move and after it, the bot "thinking" in between. */
function familyScene(
  view: QuadrantView,
  before: QuadrantCellView[],
  after: QuadrantCellView[],
  last: QuadrantView["moves"][number],
): QuadrantView {
  const count = (cells: QuadrantCellView[], key: "me" | "opponent") => cells.reduce((sum, c) => sum + c.seals[key], 0);
  const earlier: QuadrantView["moves"] = before.map((c, i) => ({
    move: i + 1,
    mine: c.mine,
    x: c.x,
    y: c.y,
    rotation: 0,
    name: c.card.name,
    beaten: 0,
    removed: 0,
    placed: 1,
    auto_played: false,
  }));
  const at = (cells: QuadrantCellView[], moves: QuadrantView["moves"]): QuadrantView => ({
    ...view,
    abilities: FAMILY_ABILITIES,
    move: moves.length + 1,
    to_move: moves.length % 2 === 0 ? "me" : "opponent",
    board: cells,
    seals: { me: count(cells, "me"), opponent: count(cells, "opponent") },
    controlled: { me: 0, opponent: 0 },
    moves,
  });
  return { ...at(after, [...earlier, last]), to_move: "me", previous: [at(before, earlier)] };
}

function scene(name: string): QuadrantView {
  const view = baseView();
  if (name === "scontri") {
    // The player's card in the middle meets four of the bot's: Corpo 10–1 (crushing), Mente 7–3
    // (clearly), Potere 5–4 (a little), Mestiere 4–4 (a tie).
    const played = famCard("Mongibello", "P060", [10, 7, 5, 4]);
    const top = famCard("Malleus", "P029", [6, 3, 1, 5], "villains");
    const right = famCard("Dredge", "P077", [2, 5, 6, 3], "villains");
    const bottom = famCard("Plinth", "P112", [4, 2, 7, 6], "villains");
    const left = famCard("Talos", "P091", [5, 4, 3, 2], "villains");
    const before = [turned(1, 0, false, top, 0, 2), turned(2, 1, false, right, 0, 2), turned(1, 2, false, bottom, 0, 2), turned(0, 1, false, left, 0, 2)];
    const after = [
      turned(1, 0, false, top, 1, 2),
      turned(2, 1, false, right, 1, 2),
      turned(1, 2, false, bottom, 1, 2),
      turned(0, 1, false, left, 0, 2),
      turned(1, 1, true, played, 3, 0),
    ];
    return familyScene(view, before, after, {
      move: 5, mine: true, x: 1, y: 1, rotation: 0, name: played.name, beaten: 3, removed: 0, placed: 3, auto_played: false,
    });
  }
  if (name === "minacce") {
    // The bot's card in the corner, turned once: Mestiere 10 beats the top threat 3 (crushing),
    // the left threat 7 beats its Potere 2; the player's Mente 8 beats its Forza 4, its Mente 9
    // crushes the player's Forza 1.
    const threats = view.border_threats!.map((t, i) => (i === 0 ? { ...t, value: 3 } : t));
    const corner = famCard("Malleus", "P029", [4, 9, 2, 10], "villains");
    const right = famCard("Dredge", "P077", [3, 8, 5, 6]);
    const below = famCard("Plinth", "P112", [1, 6, 7, 5]);
    const before = [turned(1, 0, true, right, 2, 0, 2), turned(0, 1, true, below, 2, 0)];
    const after = [turned(1, 0, true, right, 2, 0, 2), turned(0, 1, true, below, 2, 1), turned(0, 0, false, corner, 0, 3, 1)];
    return familyScene({ ...view, border_threats: threats }, before, after, {
      move: 3, mine: false, x: 0, y: 0, rotation: 1, name: corner.name, beaten: 1, removed: 0, placed: 3, auto_played: false,
    });
  }
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
