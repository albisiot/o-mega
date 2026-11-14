import { describe, expect, it } from "vitest";
import { emergencyPowerNotes } from "./emergency-powers";
import type { MatchCard } from "./match";

const card = (power: MatchCard["power"], code = "P001"): MatchCard => ({
  definition_id: code,
  code,
  name: "Prova",
  faction: "heroes",
  flavor: "",
  art_url: null,
  stats: { FOR: 5, RES: 5 },
  rarity: { code: "gamma", name: "Gamma", rank: 2, color: "#000" },
  power,
});
const power = (code: string, name: string, params: Record<string, number> = {}) => card({ code, name, params, text: "" } as MatchCard["power"]);
const play = (bonus: number, passed: boolean) => ({
  round: 4,
  level: 5,
  threat: { name: "Reattore in fusione", abilities: ["FOR", "RES"], flavor: "" },
  bonus,
  passed,
});

describe("emergencyPowerNotes", () => {
  it("reads failed threats as rounds lost: Sfavorito adds its points", () => {
    const before = [
      { card: card(null, "A"), passed: true },
      { card: card(null, "B"), passed: false },
      { card: card(null, "C"), passed: false },
    ];
    expect(emergencyPowerNotes(power("underdog", "Sfavorito", { bonus: 3 }), play(3, true), before)).toEqual([
      { name: "Sfavorito", effect: "+3", active: true, points: 3 },
    ]);
  });

  it("turns Sabotatore and Implacabile into a lower threshold", () => {
    expect(emergencyPowerNotes(power("sabotage", "Sabotatore", { malus: 1 }), play(0, true), [])[0]).toEqual({
      name: "Sabotatore",
      effect: "soglia −2",
      active: true,
      threshold: 2,
    });
    expect(emergencyPowerNotes(power("relentless", "Implacabile"), play(0, true), [])[0]).toMatchObject({ active: true, threshold: 1 });
  });

  it("dims the powers that need an opponent", () => {
    expect(emergencyPowerNotes(power("spy", "Spia"), play(0, false), [])[0]).toEqual({
      name: "Spia",
      effect: "senza avversario non agisce",
      active: false,
    });
  });

  it("tells apart the Riscossa received from the previous card", () => {
    const before = [{ card: power("comeback", "Riscossa", { bonus: 2 }), passed: false }];
    expect(emergencyPowerNotes(card(null), play(2, true), before)).toEqual([{ name: "Riscossa", effect: "+2", active: true, points: 2 }]);
  });
});

describe("emergencyPowerNotes with the server's parts", () => {
  it("takes the power's points from the parts, including a rare threat's rule points", () => {
    // Ultimi i primi gave +6: the bonus alone would credit it to the power.
    const parts = { power: 3, carried: 0, pack: 0, modifier: 6, floor: 0 };
    const notes = emergencyPowerNotes(power("level_bonus", "Terreno favorevole", { bonus: 3, max_level: 5 }), { ...play(9, true), parts }, [], true);
    expect(notes).toEqual([{ name: "Terreno favorevole", effect: "+3", active: true, points: 3, code: "level_bonus", source: "own" }]);
  });
});
