import { describe, expect, it } from "vitest";
import type { BossRound, BossView } from "./boss";
import { bossTurnEntries, holdersBefore } from "./boss-powers";
import type { MatchCard } from "./match";

const card = (id: string, name: string, stats: Record<string, number>, power: MatchCard["power"] = null) => ({
  instance_id: id,
  definition_id: `def-${id}`,
  code: id,
  name,
  faction: "heroes",
  flavor: "",
  art_url: null,
  stats,
  rarity: { code: "beta", name: "Beta", rank: 2, color: "#000" },
  power,
});
const power = (code: string, name: string, params: Record<string, number>) => ({ code, name, params, text: "" }) as MatchCard["power"];

// Il Colosso del porto, as in the drafts: Robot impazzito (FOR, TEC) is front 1,
// Esercito di androidi (TEC, COM, ENE, RES) front 3, Titano di metallo front 4.
const fronts = [
  { front: 0, name: "Rissa al porto", level: 1, abilities: ["COM"], flavor: "" },
  { front: 1, name: "Robot impazzito", level: 2, abilities: ["FOR", "TEC"], flavor: "" },
  { front: 2, name: "Contrabbando al porto", level: 3, abilities: ["FUR", "INT", "TEC"], flavor: "" },
  { front: 3, name: "Esercito di androidi", level: 4, abilities: ["TEC", "COM", "ENE", "RES"], flavor: "" },
  { front: 4, name: "Titano di metallo", level: 5, abilities: ["FOR", "TEC", "RES", "ENE", "MAG"], flavor: "" },
];
const malleus = card("m1", "Malleus", { FOR: 10, TEC: 4, RES: 8, ENE: 3, MAG: 2 });
const talos = card("m2", "Talos", { FOR: 10, TEC: 10 }, power("comeback", "Riscossa", { bonus: 2 }));
const dredge = card("m3", "Dredge", { TEC: 5, COM: 7, ENE: 7, RES: 8 }, power("all_rounder", "Tuttofare", { bonus: 3, min_value: 5 }));
const plinth = card("o1", "Plinth", { FOR: 10, TEC: 0 });
const tifeo = card("o2", "Re Tifeo", { TEC: 1, COM: 3, ENE: 6, RES: 10 });
const mongibello = card("o3", "Mongibello", { FOR: 10, TEC: 0, RES: 6, ENE: 10, MAG: 10 }, power("underdog", "Sfavorito", { bonus: 3 }));

const play = (c: ReturnType<typeof card>, front: number, base: number, bonus: number, highest: number, points: number) => ({
  base,
  bonus,
  score: base + bonus,
  highest,
  auto_played: false,
  front,
  points,
});
const round = (
  n: number,
  mine: [ReturnType<typeof card>, ReturnType<typeof play>],
  theirs: [ReturnType<typeof card>, ReturnType<typeof play>],
  holders: BossRound["holders"],
): BossRound => ({
  round: n,
  deadline_at: "",
  resolved: true,
  holders,
  my_pending: null,
  opponent_has_chosen: true,
  my_play: { ...mine[1], instance_id: mine[0].instance_id, definition_id: mine[0].definition_id },
  opponent_play: { ...theirs[0], ...theirs[1] },
});

const rounds = [
  round(1, [malleus, play(malleus, 4, 27, 0, 10, 1)], [plinth, play(plinth, 1, 10, 0, 10, 2)], [null, "opponent", null, null, "me"]),
  round(2, [talos, play(talos, 1, 20, 0, 10, 2)], [tifeo, play(tifeo, 3, 20, 0, 10, 3)], [null, "me", null, "opponent", "me"]),
  round(3, [dredge, play(dredge, 3, 27, 3, 8, 5)], [mongibello, play(mongibello, 4, 36, 3, 10, 4)], [null, "me", null, "me", "opponent"]),
];
const view = {
  turns: 5,
  fronts,
  values: [
    [1, 2, 2, 1, 1],
    [3, 1, 1, 3, 1],
    [1, 4, 1, 1, 4],
    [1, 1, 5, 5, 1],
    [6, 1, 1, 1, 6],
  ],
  my_team: [malleus, talos, dredge].map((c, i) => ({ ...c, played_round: i + 1 })),
  rounds,
} as unknown as BossView;

describe("bossTurnEntries", () => {
  const entries = bossTurnEntries(view, rounds[2])!;

  it("tells each entry who it met on its front", () => {
    expect(entries.me.facing).toMatchObject({ score: 20, since: 2, together: false });
    expect(entries.me.facing?.card?.name).toBe("Re Tifeo");
    expect(entries.opponent.facing?.card?.name).toBe("Malleus");
    expect(entries.me.holder).toBe("me");
    expect(entries.opponent.holder).toBe("opponent");
  });

  it("counts the powers as the engine does: fronts held are rounds won", () => {
    expect(entries.me.notes).toEqual([{ name: "Tuttofare", effect: "+3", active: true, points: 3 }]);
    expect(entries.opponent.notes).toEqual([{ name: "Sfavorito", effect: "+3", active: true, points: 3 }]);
  });

  it("knows who held each front before the turn", () => {
    expect(holdersBefore(view, rounds[2])).toEqual([null, "me", null, "opponent", "me"]);
  });

  it("shows nobody facing a card alone on its front", () => {
    expect(bossTurnEntries(view, rounds[0])!.me.facing).toBeNull();
  });
});
