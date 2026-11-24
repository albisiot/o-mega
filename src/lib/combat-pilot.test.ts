import { describe, expect, it } from "vitest";
import { validateCombatKit } from "@o-mega/game-engine";
import { combatRules } from "./combat";
import { COMBAT_PILOTS, PILOT_BUDGETS } from "./combat-pilot";

const FAMILIES = { FOR: "body", VEL: "body", RES: "body", INT: "mind", VOL: "mind", PER: "mind", ENE: "power", MAG: "power", PSI: "power", COM: "craft", TEC: "craft", FUR: "craft" };

describe("the pilots of the Scontro a squadre", () => {
  it("are ten different characters in two teams of five", () => {
    expect(new Set(COMBAT_PILOTS.map((p) => p.code)).size).toBe(10);
    expect(COMBAT_PILOTS.filter((p) => p.team === "porto")).toHaveLength(5);
    expect(COMBAT_PILOTS.filter((p) => p.team === "rivali")).toHaveLength(5);
  });

  it("have the abilities of their card: exactly their rarity's budget", () => {
    for (const pilot of COMBAT_PILOTS) {
      const sum = Object.values(pilot.stats).reduce((s, v) => s + v, 0);
      expect(Object.keys(pilot.stats)).toHaveLength(12);
      expect(sum, pilot.name).toBe(PILOT_BUDGETS[pilot.rarity]);
    }
  });

  it("have kits the engine accepts", () => {
    for (const pilot of COMBAT_PILOTS) expect(validateCombatKit(pilot.kit, FAMILIES, combatRules()), pilot.name).toEqual([]);
  });

  it("never share an exact passive within a faction (as the Poteri)", () => {
    const seen = new Set<string>();
    for (const pilot of COMBAT_PILOTS) {
      const { trigger, thresholdPercent, limit, scaling, effects, modifiers } = pilot.kit.passive!;
      const key = `${pilot.faction}:${JSON.stringify({ trigger, thresholdPercent, limit, scaling, effects, modifiers })}`;
      expect(seen.has(key), pilot.name).toBe(false);
      seen.add(key);
    }
  });
});
