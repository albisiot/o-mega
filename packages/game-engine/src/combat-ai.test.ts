import { describe, expect, it } from "vitest";
import {
  COMBAT_PRIORITIES,
  COMBAT_STRATEGIES,
  autoCombatFormation,
  chooseCombatAction,
  combatActionParts,
  combatActionValue,
  combatRoleOf,
  genericCombatKit,
  runCombat,
  type CombatStrategy,
  type CombatTactics,
} from "./combat-ai.ts";
import { createCombat, legalCombatActions, validateCombatKit, type CombatContext, type CombatFighterInput, type CombatMove, type CombatRules } from "./combat.ts";
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
  statuses: { empowerPercent: 25, fortifyPercent: 50, hastePercent: 20, weakenPercent: 20, vulnerablePercent: 30, burnPercent: 6, maxTurns: 3 },
  effectChance: { perPoint: 3, minPercent: 10, maxPercent: 90 },
};
const FAMILIES = { FOR: "body", VEL: "body", RES: "body", INT: "mind", VOL: "mind", PER: "mind", ENE: "power", MAG: "power", PSI: "power", COM: "craft", TEC: "craft", FUR: "craft" };
const CODES = Object.keys(FAMILIES);
const CTX: CombatContext = { rules: RULES, families: FAMILIES };
const STRATEGIES = Object.keys(COMBAT_STRATEGIES) as CombatStrategy[];

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
const tactics = (changes: Partial<CombatTactics> = {}): CombatTactics => ({ strategy: "balanced", priority: null, orders: {}, ...changes });
const areaSupreme: CombatMove = { id: "area", name: "Ondata", slot: "supreme", scaling: { FOR: 1 }, range: "ranged", target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }], cooldown: 0 };
const healSupreme: CombatMove = { id: "cura", name: "Cura", slot: "supreme", scaling: { FOR: 1 }, range: "ranged", target: "all_allies", effects: [{ kind: "heal", multiplier: 1, on: "all" }], cooldown: 0 };

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
    expect(chooseCombatAction(state, CTX).target).toBe(enemy[1].key);
  });

  it("uses a supreme on every enemy when its charge is full, unless an order wants more enemies standing", () => {
    const { state } = createCombat(battleSetup(mulberry32(5)), CTX, mulberry32(6));
    const actor = state.fighters.find((f) => f.key === state.current)!;
    actor.kit = { ...actor.kit, supreme: areaSupreme };
    actor.charge = 6;
    expect(chooseCombatAction(state, CTX)).toEqual({ slot: "supreme", target: null });
    const waiting = tactics({ orders: { [actor.position]: { supremeMinTargets: 6 } } });
    expect(chooseCombatAction(state, CTX, waiting).slot).not.toBe("supreme");
    expect(combatActionValue(state, { slot: "supreme", target: null }, CTX, waiting)).toBe(-1);
  });

  it("heals only allies below the share an order gives", () => {
    const { state } = createCombat(battleSetup(mulberry32(7)), CTX, mulberry32(8));
    const actor = state.fighters.find((f) => f.key === state.current)!;
    actor.kit = { ...actor.kit, supreme: healSupreme };
    actor.charge = 6;
    for (const f of state.fighters.filter((x) => x.side === actor.side)) f.vita = Math.round(f.maxVita * 0.8);
    const heal = { slot: "supreme" as const, target: null };
    expect(combatActionParts(state, heal, CTX)!.heal).toBeGreaterThan(0);
    expect(combatActionParts(state, heal, CTX, { healBelowPercent: 50 })!.heal).toBe(0);
  });

  it("values an action on the preferred target half again", () => {
    const { state } = createCombat(battleSetup(mulberry32(9)), CTX, mulberry32(10));
    const back = legalCombatActions(state, RULES).find((a) => a.slot === "base" && a.target?.endsWith("3"));
    if (!back) return; // a melee base move cannot reach the second line
    const plain = combatActionValue(state, back, CTX);
    expect(combatActionValue(state, back, CTX, tactics({ priority: "back_line" }))).toBeCloseTo(plain * 1.5);
  });

  it("weighs the parts by the strategy: a defensive side values healing more than an aggressive one", () => {
    const { state } = createCombat(battleSetup(mulberry32(11)), CTX, mulberry32(12));
    const actor = state.fighters.find((f) => f.key === state.current)!;
    actor.kit = { ...actor.kit, supreme: healSupreme };
    actor.charge = 6;
    for (const f of state.fighters.filter((x) => x.side === actor.side)) f.vita = Math.round(f.maxVita / 2);
    const heal = { slot: "supreme" as const, target: null };
    expect(combatActionValue(state, heal, CTX, tactics({ strategy: "defensive" }))).toBeGreaterThan(combatActionValue(state, heal, CTX, tactics({ strategy: "aggressive" })));
  });

  it("gives every role a valid kit", () => {
    const roles = new Set<string>();
    const rng = mulberry32(13);
    for (let i = 0; i < 200; i += 1) {
      const { stats, kit } = character(rng, i);
      roles.add(combatRoleOf(stats, FAMILIES));
      expect(validateCombatKit(kit, FAMILIES, RULES)).toEqual([]);
    }
    expect([...roles].sort()).toEqual(["blaster", "bruiser", "controller", "specialist", "tank"]);
  });

  it("only makes allowed choices and always finishes the battle, whatever the tactics", () => {
    const rng = mulberry32(14);
    for (let i = 0; i < 200; i += 1) {
      const side = (k: number): CombatTactics => tactics({ strategy: STRATEGIES[(i + k) % STRATEGIES.length], priority: k === 0 ? null : COMBAT_PRIORITIES[i % COMBAT_PRIORITIES.length], orders: { 2: { healBelowPercent: 60, supremeMinTargets: 3 } } });
      const { state, events } = runCombat(battleSetup(rng), CTX, rng, {
        tactics: { a: side(0), b: side(1) },
        choose: (s, ctx, t) => {
          const choice = chooseCombatAction(s, ctx, t);
          expect(legalCombatActions(s, ctx.rules)).toContainEqual(choice);
          return choice;
        },
      });
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
