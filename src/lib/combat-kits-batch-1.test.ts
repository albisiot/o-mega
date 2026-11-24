import { describe, expect, it } from "vitest";
import { validateCombatKit } from "@o-mega/game-engine";
import { COMBAT_FAMILIES, combatRules } from "./combat";
import { COMBAT_KITS_BATCH_1 } from "./combat-kits-batch-1";
import { COMBAT_PILOTS } from "./combat-pilot";

const ALL = [...COMBAT_PILOTS.map((p) => ({ code: p.code, name: p.name, faction: p.faction, kit: p.kit })), ...COMBAT_KITS_BATCH_1];

describe("the first batch of kits", () => {
  it("has 25 characters, none of them a pilot", () => {
    expect(COMBAT_KITS_BATCH_1).toHaveLength(25);
    expect(new Set(ALL.map((k) => k.code)).size).toBe(ALL.length);
  });

  it("has kits the engine accepts, with ids of their own character", () => {
    for (const { code, name, kit } of COMBAT_KITS_BATCH_1) {
      expect(validateCombatKit(kit, COMBAT_FAMILIES, combatRules()), name).toEqual([]);
      for (const move of [kit.base, kit.special, kit.supreme, kit.passive!]) expect(move.id.startsWith(`${code}-`), name).toBe(true);
    }
  });

  it("never repeats an exact passive within a faction, pilots included (as the Poteri)", () => {
    const seen = new Map<string, string>();
    for (const { faction, name, kit } of ALL) {
      const { trigger, thresholdPercent, limit, scaling, effects, modifiers } = kit.passive!;
      const key = `${faction}:${JSON.stringify({ trigger, thresholdPercent, limit, scaling, effects, modifiers })}`;
      expect(seen.get(key), `${name} repeats ${seen.get(key)}`).toBeUndefined();
      seen.set(key, name);
    }
  });
});
