import { describe, expect, it } from "vitest";
import { autoCombatFormation, chooseCombatAction, genericCombatKit, runCombat } from "./combat-ai.ts";
import { createCombat, legalCombatActions, type CombatContext, type CombatFighterInput, type CombatRules } from "./combat.ts";
import { mulberry32, type Rng } from "./rng.ts";

// Fixed numbers for these tests (balance.ts `combat` may differ).
const RULES: CombatRules = {
  teamSize: 5,
  frontSize: 2,
  referenceBudget: 54,
  rarityScalePercent: 100,
  vita: { base: 260, perPoint: { res: 6, vol: 3 } },
  speed: { base: 100, perPoint: { vel: 2 } },
  turnMeter: 1000,
  startMeterMaxPercent: 30,
  power: { base: 20, perPoint: 8 },
  familyDefense: { body: 3.37, mind: 2.65, power: 5.03, craft: 4.1 },
  defenseScale: 100,
  coverPercent: 80,
  hit: { base: 85, attacker: { per: 1 }, defender: { fur: -0.5 }, minPercent: 70, maxPercent: 97 },
  crit: { base: 5, perPoint: { fur: 1, per: 0.5 }, maxPercent: 28, multiplierPercent: 150 },
  charge: { start: 2, max: 6, base: 2, special: 1 },
  shieldMaxPercent: 30,
  maxActions: 100,
  fieldBonusPercent: 20,
};
const FAMILIES = { FOR: "body", VEL: "body", RES: "body", INT: "mind", VOL: "mind", PER: "mind", ENE: "power", MAG: "power", PSI: "power", COM: "craft", TEC: "craft", FUR: "craft" };
const CODES = Object.keys(FAMILIES);
const CTX: CombatContext = { rules: RULES, families: FAMILIES };

/** A random character: 12 abilities from 0 to 10, its budget their sum (as every real card). */
function character(rng: Rng, n: number): CombatFighterInput {
  const stats = Object.fromEntries(CODES.map((code) => [code, Math.floor(rng() * 11)]));
  const budget = Object.values(stats).reduce((sum, v) => sum + v, 0) || 1;
  return { id: `C${n}`, definitionId: `C${n}`, name: `C${n}`, stats, budget, kit: genericCombatKit(`C${n}`, stats, FAMILIES) };
}
function battleSetup(rng: Rng) {
  const pool = Array.from({ length: 10 }, (_, i) => character(rng, i));
  return { a: autoCombatFormation(pool.slice(0, 5), CTX), b: autoCombatFormation(pool.slice(5), CTX), field: { name: "Robot", abilities: ["FOR", "TEC"] } };
}

describe("the computer", () => {
  it("puts the two with the most Life in front, keeping the order otherwise", () => {
    const team = [10, 20, 30, 40, 50].map((res, i) => ({ id: `T${i}`, stats: { RES: res / 10, VOL: 0 }, budget: 54 }));
    expect(autoCombatFormation(team, CTX).map((t) => t.id)).toEqual(["T3", "T4", "T0", "T1", "T2"]);
  });

  it("chooses a likely knockout over more damage elsewhere", () => {
    const { state } = createCombat(battleSetup(mulberry32(3)), CTX, mulberry32(4));
    const actor = state.fighters.find((f) => f.key === state.current)!;
    const enemy = state.fighters.filter((f) => f.side !== actor.side);
    for (const f of enemy) f.vita = f.maxVita;
    enemy[1].vita = 3;
    const choice = chooseCombatAction(state, CTX);
    expect(choice.target).toBe(enemy[1].key);
  });

  it("uses a supreme on every enemy when its charge is full", () => {
    const { state } = createCombat(battleSetup(mulberry32(5)), CTX, mulberry32(6));
    state.fighters.find((f) => f.key === state.current)!.charge = 6;
    expect(chooseCombatAction(state, CTX)).toEqual({ slot: "supreme", target: null });
  });

  it("only makes allowed choices and always finishes the battle", () => {
    const rng = mulberry32(11);
    for (let i = 0; i < 200; i += 1) {
      const choose = (state: Parameters<typeof chooseCombatAction>[0], ctx: CombatContext) => {
        const choice = chooseCombatAction(state, ctx);
        expect(legalCombatActions(state, ctx.rules)).toContainEqual(choice);
        return choice;
      };
      const { state, events } = runCombat(battleSetup(rng), CTX, rng, choose);
      expect(state.result).not.toBeNull();
      expect(state.actions).toBeLessThanOrEqual(RULES.maxActions);
      expect(events.at(-1)?.kind).toBe("end");
    }
  });

  it("plays the same battle again from the same seed", () => {
    const once = runCombat(battleSetup(mulberry32(21)), CTX, mulberry32(22));
    const twice = runCombat(battleSetup(mulberry32(21)), CTX, mulberry32(22));
    const other = runCombat(battleSetup(mulberry32(21)), CTX, mulberry32(23));
    expect(twice.events).toEqual(once.events);
    expect(twice.state).toEqual(once.state);
    expect(other.events).not.toEqual(once.events);
  });
});
