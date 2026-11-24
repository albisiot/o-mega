import { describe, expect, it } from "vitest";
import { validateCombatRules } from "@o-mega/game-engine";
import { combatRules } from "./combat";

describe("combat rules", () => {
  it("are numbers the engine can run a battle with", () => {
    expect(validateCombatRules(combatRules())).toEqual([]);
  });

  it("give each family the same mean defence on the catalog (about 50)", () => {
    // Means of the 351 characters on 24 November 2026: body 14.82, mind 18.89, power 9.95, craft 12.18.
    const means: Record<string, number> = { body: 14.82, mind: 18.89, power: 9.95, craft: 12.18 };
    for (const [family, factor] of Object.entries(combatRules().familyDefense)) {
      expect(factor * means[family]).toBeCloseTo(50, 0);
    }
  });
});
