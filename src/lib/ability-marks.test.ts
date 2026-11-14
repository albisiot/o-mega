import { baseScore, type Character, type ThreatModifier } from "@o-mega/game-engine";
import { describe, expect, it } from "vitest";
import { abilityChips, chipsTotal } from "./ability-marks";

const ALL = ["FOR", "VEL", "RES", "INT", "VOL", "PER", "ENE", "MAG", "PSI", "COM", "TEC", "FUR"];

const MODIFIERS: (ThreatModifier | null)[] = [
  null,
  { code: "focus" },
  { code: "weak_link" },
  { code: "abyss", abilities: ["ENE", "MAG", "PSI"] },
  { code: "frost", cap: 6 },
  { code: "duel", count: 2 },
  { code: "duel", count: 1 },
  { code: "all_or_nothing", min: 5 },
  { code: "price", maxValue: 1, malus: 3 },
  { code: "one_force", abilities: ["ENE", "MAG", "PSI"] },
  { code: "count", min: 5, points: 1 },
  { code: "negative", max: 10 },
];

// A fixed pseudo-random sequence: the same cases on every run.
function sequence(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

describe("abilityChips", () => {
  it("adds up to the engine's base score under every rule, with and without Sabotatore", () => {
    const random = sequence(7);
    for (let n = 0; n < 400; n++) {
      const stats = Object.fromEntries(ALL.map((code) => [code, Math.floor(random() * 11)]));
      const level = 1 + Math.floor(random() * 8);
      const abilities = [...ALL].sort(() => random() - 0.5).slice(0, level);
      const malus = random() < 0.3 ? 1 : 0;
      for (const modifier of MODIFIERS) {
        const threat = { id: "t", level, abilities, modifier };
        const character: Character = { id: "c", definitionId: "d", faction: "heroes", rarityRank: 2, stats, power: null };
        expect(chipsTotal(abilityChips(stats, threat, malus))).toBe(baseScore(character, threat, malus));
      }
    }
  });

  it("marks what the rule touches", () => {
    const stats = { FOR: 8, RES: 1, ENE: 9 };
    const abilities = ["FOR", "RES", "ENE"];
    expect(abilityChips(stats, { abilities, modifier: { code: "focus" } }).map((c) => c.mark?.text ?? null)).toEqual(["×2", null, null]);
    expect(abilityChips(stats, { abilities, modifier: { code: "frost", cap: 6 } }).map((c) => c.mark?.tone ?? null)).toEqual(["ice", null, "ice"]);
    expect(abilityChips(stats, { abilities, modifier: { code: "duel", count: 2 } }).map((c) => c.mark?.text ?? null)).toEqual([null, "fuori", null]);
    expect(abilityChips(stats, { abilities, modifier: { code: "price", maxValue: 1, malus: 3 } })[1].mark).toEqual({ text: "−3", tone: "down" });
  });

  it("takes Sabotatore's malus from each value, never below 0", () => {
    const chips = abilityChips({ FOR: 10, RES: 1, ENE: 0 }, { abilities: ["FOR", "RES", "ENE"], modifier: null }, 1);
    expect(chips.map((c) => [c.raw, c.value, c.malus])).toEqual([
      [10, 9, 1],
      [1, 0, 1],
      [0, 0, 0],
    ]);
  });
});
