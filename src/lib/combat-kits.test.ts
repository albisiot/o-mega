import { describe, expect, it } from "vitest";
import { validateCombatKit } from "@o-mega/game-engine";
import { COMBAT_FAMILIES, combatRules } from "./combat";
import { COMBAT_KIT_BATCHES } from "./combat-kits";
import { COMBAT_PILOTS } from "./combat-pilot";

const BATCHES = Object.entries(COMBAT_KIT_BATCHES);
const ALL = [...COMBAT_PILOTS.map((p) => ({ code: p.code, name: p.name, faction: p.faction, kit: p.kit })), ...BATCHES.flatMap(([, kits]) => kits)];

describe("the batches of kits", () => {
  it("have 20-30 characters each, every character in one place only, pilots included", () => {
    for (const [batch, kits] of BATCHES) expect(kits.length, `batch ${batch}`).toBeGreaterThanOrEqual(20);
    for (const [batch, kits] of BATCHES) expect(kits.length, `batch ${batch}`).toBeLessThanOrEqual(30);
    expect(new Set(ALL.map((k) => k.code)).size).toBe(ALL.length);
  });

  it("have kits the engine accepts, with ids of their own character", () => {
    for (const { code, name, kit } of BATCHES.flatMap(([, kits]) => kits)) {
      expect(validateCombatKit(kit, COMBAT_FAMILIES, combatRules()), name).toEqual([]);
      for (const move of [kit.base, kit.special, kit.supreme, kit.passive!]) expect(move.id.startsWith(`${code}-`), name).toBe(true);
    }
  });

  it("never repeat an exact passive within a faction, pilots included (as the Poteri)", () => {
    const seen = new Map<string, string>();
    for (const { faction, name, kit } of ALL) {
      const { trigger, thresholdPercent, limit, scaling, effects, modifiers } = kit.passive!;
      const key = `${faction}:${JSON.stringify({ trigger, thresholdPercent, limit, scaling, effects, modifiers })}`;
      expect(seen.get(key), `${name} repeats ${seen.get(key)}`).toBeUndefined();
      seen.set(key, name);
    }
  });
});
