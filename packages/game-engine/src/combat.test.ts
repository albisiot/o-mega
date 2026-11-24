import { describe, expect, it } from "vitest";
import {
  applyCombatAction,
  combatActor,
  combatCritChance,
  combatDefense,
  combatFinalDamage,
  combatHitChance,
  combatMoveFamily,
  combatPower,
  combatRawDamage,
  combatSpeed,
  combatStats,
  combatTargets,
  combatVita,
  createCombat,
  legalCombatActions,
  validateCombatKit,
  validateCombatMove,
  validateCombatRules,
  type CombatAction,
  type CombatContext,
  type CombatFighterInput,
  type CombatKit,
  type CombatMove,
  type CombatRules,
  type CombatState,
} from "./combat.ts";
import { genericCombatKit } from "./combat-ai.ts";
import type { Rng } from "./rng.ts";

// Fixed numbers for these tests (balance.ts `combat` may differ: src/lib/combat.test.ts checks it against the engine).
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
/** No random start: the turn order follows the Speed alone. */
const STILL: CombatContext = { rules: { ...RULES, startMeterMaxPercent: 0 }, families: FAMILIES };

const statsOf = (values: number[]) => Object.fromEntries(CODES.map((code, i) => [code, values[i]]));
const GANTRY = statsOf([10, 5, 9, 2, 6, 3, 4, 0, 1, 9, 3, 2]);
/** 5 everywhere, but no Speed, Perception or Stealth: no criticals with the rolls below, every hit lands. */
const plain = (changes: Record<string, number> = {}) => ({ ...statsOf([5, 0, 5, 5, 5, 0, 5, 5, 5, 5, 5, 0]), ...changes });

/** The same numbers forever: tieSide "a" and every hit, no critical (with Perception and Stealth at 0). */
const always = (value = 0.1): Rng => () => value;
const sequence = (...values: number[]): Rng => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

function move(slot: CombatMove["slot"], changes: Partial<CombatMove> = {}): CombatMove {
  return {
    id: `${slot}-${changes.target ?? "enemy"}`,
    name: slot,
    slot,
    scaling: { FOR: 1 },
    range: "ranged",
    target: "enemy",
    effects: [{ kind: "damage", multiplier: 1, on: "primary" }],
    cooldown: slot === "special" ? 3 : 0,
    ...changes,
  };
}
const KIT: CombatKit = { base: move("base"), special: move("special", { effects: [{ kind: "damage", multiplier: 1.35, on: "primary" }] }), supreme: move("supreme", { target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }] }) };

function fighter(id: string, stats: Record<string, number>, kit: CombatKit = KIT, budget = 54): CombatFighterInput {
  return { id, definitionId: id, name: id, stats, budget, kit };
}
/** Side a: a0 fast (Speed 120), the others 100; side b all at 100. */
function teams(kitA: CombatKit = KIT, kitB: CombatKit = KIT) {
  return {
    a: [fighter("a0", plain({ VEL: 10 }), kitA), ...[1, 2, 3, 4].map((i) => fighter(`a${i}`, plain(), kitA))],
    b: [0, 1, 2, 3, 4].map((i) => fighter(`b${i}`, plain(), kitB)),
    field: null,
  };
}
const start = (setup = teams(), ctx = STILL, rng: Rng = always()) => createCombat(setup, ctx, rng);
const act = (state: CombatState, action: CombatAction, ctx = STILL, rng: Rng = always()) => applyCombatAction(state, action, ctx, rng);
const get = (state: CombatState, key: string) => state.fighters.find((f) => f.key === key)!;
/** Plays base moves that miss (nobody is hurt) until it is `key`'s turn. */
function untilTurnOf(state: CombatState, key: string): CombatState {
  for (let i = 0; i < 50 && state.current !== key; i += 1) {
    const base = legalCombatActions(state, RULES).find((a) => a.slot === "base")!;
    state = act(state, base, STILL, always(0.95)).state;
  }
  return state;
}

describe("battle values", () => {
  it("scales every rarity to the reference budget", () => {
    expect(combatStats(GANTRY, 54, RULES)).toEqual(GANTRY);
    expect(combatStats({ FOR: 10, VEL: 0 }, 61, RULES).FOR).toBeCloseTo(8.852, 3);
  });

  it("gives Gantry his Life, Speed and defences", () => {
    expect(combatVita(GANTRY, RULES)).toBe(332);
    expect(combatSpeed(GANTRY, RULES)).toBe(110);
    expect(combatDefense(GANTRY, "body", CTX)).toBeCloseTo(24 * 3.37);
    expect(combatDefense(GANTRY, "mind", CTX)).toBeCloseTo(11 * 2.65);
    expect(combatDefense(GANTRY, "power", CTX)).toBeCloseTo(5 * 5.03);
    expect(combatDefense(GANTRY, "craft", CTX)).toBeCloseTo(14 * 4.1);
  });

  it("weighs the abilities into the Power, and the field raises it", () => {
    const load = move("special", { scaling: { FOR: 0.7, COM: 0.3 } });
    expect(combatPower(load, GANTRY, RULES, null)).toBeCloseTo(97.6);
    expect(combatPower(load, GANTRY, RULES, { name: "Robot", abilities: ["FOR", "TEC"] })).toBeCloseTo(97.6 * 1.14);
    expect(combatPower(load, GANTRY, RULES, { name: "Fuga", abilities: ["VEL"] })).toBeCloseTo(97.6);
  });

  it("strikes with the family of the heaviest ability, or its own", () => {
    expect(combatMoveFamily(move("base", { scaling: { FOR: 0.7, COM: 0.3 } }), FAMILIES)).toBe("body");
    expect(combatMoveFamily(move("base", { scaling: { TEC: 0.6, INT: 0.4 } }), FAMILIES)).toBe("craft");
    expect(combatMoveFamily(move("base", { scaling: { INT: 0.5, FOR: 0.5 } }), FAMILIES)).toBe("body");
    expect(combatMoveFamily(move("base", { scaling: { FOR: 1 }, family: "power" }), FAMILIES)).toBe("power");
  });

  it("computes the damage, rounded at the end and never below 1", () => {
    const raw = combatRawDamage(97.6, 1.35, 20 * 3.37, false, RULES);
    expect(raw).toBeCloseTo((97.6 * 1.35 * 100) / 167.4);
    expect(combatFinalDamage(raw, false, RULES)).toBe(79);
    expect(combatFinalDamage(raw, true, RULES)).toBe(118);
    expect(combatFinalDamage(combatRawDamage(97.6, 1.35, 20 * 3.37, true, RULES), false, RULES)).toBe(63);
    expect(combatFinalDamage(0.2, false, RULES)).toBe(1);
  });

  it("keeps hit and critical chances within their limits", () => {
    expect(combatHitChance(GANTRY, GANTRY, RULES)).toBeCloseTo(0.87);
    expect(combatHitChance({ PER: 0 }, { FUR: 10 }, { ...RULES, hit: { ...RULES.hit, base: 60 } })).toBeCloseTo(0.7);
    expect(combatHitChance({ PER: 10 }, { FUR: 0 }, { ...RULES, hit: { ...RULES.hit, base: 95 } })).toBeCloseTo(0.97);
    expect(combatCritChance(GANTRY, RULES)).toBeCloseTo(0.085);
    expect(combatCritChance({ FUR: 10, PER: 10 }, { ...RULES, crit: { ...RULES.crit, perPoint: { fur: 5 } } })).toBeCloseTo(0.28);
  });
});

describe("checks", () => {
  it("accepts the numbers and the generic kits", () => {
    expect(validateCombatRules(RULES)).toEqual([]);
    expect(validateCombatKit(genericCombatKit("P001", GANTRY, FAMILIES), FAMILIES)).toEqual([]);
    expect(validateCombatKit(KIT, FAMILIES)).toEqual([]);
  });

  it("refuses wrong moves, kits and numbers", () => {
    expect(validateCombatMove(move("base", { scaling: { FOR: 0.6, COM: 0.3 } }), FAMILIES)).toEqual(["move base-enemy: weights sum to 0.9, not 1"]);
    expect(validateCombatMove(move("base", { scaling: { XYZ: 1 } }), FAMILIES)).toContain("move base-enemy: unknown ability XYZ");
    expect(validateCombatMove(move("special", { cooldown: 0 }), FAMILIES)).toContain("move special-enemy: a special needs a cooldown");
    expect(validateCombatMove(move("base", { cooldown: 2 }), FAMILIES)).toContain("move base-enemy: only a special has a cooldown");
    expect(validateCombatMove(move("base", { effects: [{ kind: "heal", multiplier: 1, on: "primary" }] }), FAMILIES)).toContain("move base-enemy: heal needs an allied target");
    expect(validateCombatMove(move("base", { effects: [{ kind: "damage", multiplier: 1, on: "adjacent" }] }), FAMILIES)).toContain("move base-enemy: adjacent needs enemy_and_adjacent");
    expect(validateCombatMove(move("base", { effects: [{ kind: "damage", multiplier: 0, on: "primary" }] }), FAMILIES)).toContain("move base-enemy: damage multiplier must be positive");
    expect(validateCombatKit({ ...KIT, base: KIT.special }, FAMILIES)).toContain("move special-enemy is a special, not a base");
    expect(validateCombatRules({ ...RULES, teamSize: 4 })).toContain("the places are fixed: 5 fighters, 2 in front");
  });

  it("refuses a side with the wrong size or the same character twice", () => {
    const setup = teams();
    expect(() => createCombat({ ...setup, a: setup.a.slice(0, 4) }, CTX, always())).toThrow("side a has 4 fighters");
    expect(() => createCombat({ ...setup, b: [...setup.b.slice(0, 4), setup.b[0]] }, CTX, always())).toThrow("same character twice");
  });
});

describe("turns", () => {
  it("starts with the meters below 30% and the fastest acts first", () => {
    const { state, events } = createCombat(teams(), CTX, sequence(0.7, 0.99, 0, 0.5));
    expect(events[0]).toEqual({ kind: "start", field: null, tieSide: "b" });
    expect(events[1]).toEqual({ kind: "turn", actor: "a0", turn: 1 });
    // a0 started at 297 (0.99 of 300) with Speed 120; a1 at 0, the others at 150, all at 100.
    const wait = (1000 - 297) / 120;
    expect(get(state, "a0").meter).toBeCloseTo(0);
    expect(get(state, "a1").meter).toBeCloseTo(100 * wait);
    expect(get(state, "b4").meter).toBeCloseTo(150 + 100 * wait);
  });

  it("breaks ties by Speed, then the drawn side, then the place", () => {
    const even = { ...teams(), a: [0, 1, 2, 3, 4].map((i) => fighter(`a${i}`, plain())) };
    expect(createCombat(even, STILL, always(0.1)).state.current).toBe("a0");
    expect(createCombat(even, STILL, always(0.9)).state.current).toBe("b0");
    let state = createCombat(even, STILL, always(0.9)).state;
    const order = [state.current];
    for (let i = 0; i < 9; i += 1) {
      state = act(state, legalCombatActions(state, RULES).find((a) => a.slot === "base" && a.target !== "b1" && a.target !== "a1")!).state;
      order.push(state.current);
    }
    expect(order).toEqual(["b0", "b1", "b2", "b3", "b4", "a0", "a1", "a2", "a3", "a4"]);
  });

  it("lets a faster fighter act more often, keeping what is left of its meter", () => {
    let state = start().state;
    let fast = 0;
    for (let i = 0; i < 30 && !state.result; i += 1) {
      if (state.current === "a0") fast += 1;
      state = act(state, legalCombatActions(state, RULES).find((a) => a.slot === "base")!, STILL, always(0.95)).state;
    }
    // Speed 120 against 100: 6 turns of a0 every 5 of the others, about 3.5 in 30.
    expect(fast).toBeGreaterThanOrEqual(3);
    expect(get(state, "a0").turns).toBeGreaterThan(get(state, "a1").turns);
  });
});

describe("targets and cover", () => {
  const melee: CombatKit = { ...KIT, base: move("base", { range: "melee" }) };

  it("keeps a melee move off a protected second line", () => {
    const { state } = start(teams(melee));
    expect(combatTargets(state, combatActor(state)!, melee.base, RULES)).toEqual(["b0", "b1"]);
    expect(combatTargets(state, combatActor(state)!, KIT.base, RULES)).toEqual(["b0", "b1", "b2", "b3", "b4"]);
    expect(() => act(state, { slot: "base", target: "b3" })).toThrow("not allowed");
    get(state, "b0").vita = 0;
    get(state, "b1").vita = 0;
    expect(combatTargets(state, combatActor(state)!, melee.base, RULES)).toEqual(["b2", "b3", "b4"]);
  });

  it("covers the second line from ranged and area moves, not from infiltration", () => {
    const sneak: CombatKit = { ...KIT, special: move("special", { range: "infiltration" }) };
    const { state } = start(teams(sneak));
    // Power 60 against a body defence of 10 × 3.37: 44.9, and 35.9 behind the front line.
    const front = act(state, { slot: "base", target: "b0" }).events.find((e) => e.kind === "damage");
    const back = act(state, { slot: "base", target: "b3" }).events.find((e) => e.kind === "damage");
    const inside = act(state, { slot: "special", target: "b3" }).events.find((e) => e.kind === "damage");
    expect(front).toMatchObject({ amount: 45, critical: false, family: "body" });
    expect(back).toMatchObject({ amount: 36 });
    expect(inside).toMatchObject({ amount: 45 });
  });

  it("hits the adjacent places too, behind the line with the cover", () => {
    const load: CombatKit = { ...KIT, special: move("special", { range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "damage", multiplier: 0.5, on: "adjacent" }] }) };
    const { events } = act(start(teams(load)).state, { slot: "special", target: "b0" });
    const hits = events.filter((e) => e.kind === "damage").map((e) => (e.kind === "damage" ? [e.target, e.amount] : null));
    // F1's neighbours: F2, R1, R2. Half of 44.9 is 22.4 in front, 18.0 behind.
    expect(hits).toEqual([["b0", 45], ["b1", 22], ["b2", 18], ["b3", 18]]);
  });

  it("strikes every enemy with an area move, the second line covered", () => {
    let state = start().state;
    get(state, "a0").charge = 6;
    const hits = act(state, { slot: "supreme", target: null }).events.filter((e) => e.kind === "damage").map((e) => (e.kind === "damage" ? e.amount : 0));
    expect(hits).toEqual([38, 38, 31, 31, 31]);
    state = act(state, { slot: "supreme", target: null }).state;
    expect(get(state, "a0").charge).toBe(0);
  });
});

describe("charge and cooldown", () => {
  it("gives 2 charge for a base move and 1 for a special, up to 6, and the supreme needs it all", () => {
    let state = start().state;
    expect(get(state, "a0").charge).toBe(2);
    expect(legalCombatActions(state, RULES).some((a) => a.slot === "supreme")).toBe(false);
    state = act(state, { slot: "special", target: "b0" }).state;
    expect(get(state, "a0").charge).toBe(3);
    state = untilTurnOf(state, "a0");
    state = act(state, { slot: "base", target: "b0" }).state;
    expect(get(state, "a0").charge).toBe(5);
    state = untilTurnOf(state, "a0");
    state = act(state, { slot: "base", target: "b0" }).state;
    expect(get(state, "a0").charge).toBe(6);
    state = untilTurnOf(state, "a0");
    expect(legalCombatActions(state, RULES).some((a) => a.slot === "supreme")).toBe(true);
    state = act(state, { slot: "base", target: "b0" }).state;
    expect(get(state, "a0").charge).toBe(6);
  });

  it("brings a special back after its cooldown in personal turns", () => {
    let state = start().state;
    state = act(state, { slot: "special", target: "b0" }).state;
    expect(get(state, "a0").specialReadyAt).toBe(4);
    for (const turn of [2, 3]) {
      state = untilTurnOf(state, "a0");
      expect(get(state, "a0").turns).toBe(turn);
      expect(legalCombatActions(state, RULES).some((a) => a.slot === "special")).toBe(false);
      expect(() => act(state, { slot: "special", target: "b0" })).toThrow("not allowed");
      state = act(state, { slot: "base", target: "b0" }).state;
    }
    state = untilTurnOf(state, "a0");
    expect(get(state, "a0").turns).toBe(4);
    expect(legalCombatActions(state, RULES).some((a) => a.slot === "special")).toBe(true);
  });
});

describe("shields, healing and knockouts", () => {
  const guard: CombatKit = {
    base: move("base"),
    special: move("special", { target: "self", effects: [{ kind: "shield", multiplier: 1, on: "primary" }] }),
    supreme: move("supreme", { target: "all_allies", effects: [{ kind: "heal", multiplier: 1, on: "all" }] }),
  };

  it("takes the damage on the shield first", () => {
    const { state } = start();
    get(state, "b0").shield = 20;
    const { state: after, events } = act(state, { slot: "base", target: "b0" });
    expect(events.find((e) => e.kind === "damage")).toMatchObject({ amount: 45, absorbed: 20 });
    expect(get(after, "b0")).toMatchObject({ shield: 0, vita: 305 - 25 });
  });

  it("never lets a shield pass 30% of the Life", () => {
    let state = start(teams(guard)).state;
    state = act(state, { slot: "special", target: null }).state;
    expect(get(state, "a0").shield).toBe(60);
    get(state, "a0").specialReadyAt = 0;
    state = untilTurnOf(state, "a0");
    get(state, "a0").specialReadyAt = 0;
    const { state: after, events } = act(state, { slot: "special", target: null });
    expect(get(after, "a0").shield).toBe(91);
    expect(events.find((e) => e.kind === "shield")).toMatchObject({ amount: 31 });
  });

  it("heals no more than the Life missing, and never the fallen", () => {
    const { state } = start(teams(guard));
    get(state, "a0").charge = 6;
    get(state, "a1").vita = 290;
    get(state, "a2").vita = 0;
    const { state: after, events } = act(state, { slot: "supreme", target: null });
    expect(events.filter((e) => e.kind === "heal").map((e) => (e.kind === "heal" ? [e.target, e.amount] : null))).toEqual([["a0", 0], ["a1", 15], ["a3", 0], ["a4", 0]]);
    expect(get(after, "a1").vita).toBe(305);
    expect(get(after, "a2").vita).toBe(0);
  });

  it("knocks out a fighter at 0 Life: it no longer acts nor can be picked", () => {
    const { state } = start();
    get(state, "b0").vita = 10;
    get(state, "b0").shield = 0;
    const { state: after, events } = act(state, { slot: "base", target: "b0" });
    expect(events.map((e) => e.kind)).toEqual(["move", "damage", "defeated", "turn"]);
    expect(get(after, "b0").vita).toBe(0);
    expect(combatTargets(after, combatActor(after)!, KIT.base, RULES)).not.toContain("b0");
    let state2 = after;
    for (let i = 0; i < 20; i += 1) {
      expect(state2.current).not.toBe("b0");
      state2 = act(state2, legalCombatActions(state2, RULES).find((a) => a.slot === "base")!).state;
    }
  });

  it("misses and lands criticals on the rolls", () => {
    const { state } = start();
    // Hit chance 85%: 0.9 misses. A critical needs a roll below 5%.
    expect(act(state, { slot: "base", target: "b0" }, STILL, always(0.9)).events.find((e) => e.kind === "miss")).toEqual({ kind: "miss", actor: "a0", target: "b0" });
    expect(act(state, { slot: "base", target: "b0" }, STILL, sequence(0.5, 0.01)).events.find((e) => e.kind === "damage")).toMatchObject({ amount: 67, critical: true });
  });
});

describe("the end", () => {
  it("is a win once a side has no one standing", () => {
    const { state } = start();
    for (const f of state.fighters) if (f.side === "b") f.vita = f.key === "b0" ? 5 : 0;
    const { state: after, events } = act(state, { slot: "base", target: "b0" });
    expect(after.result).toEqual({ winner: "a", reason: "wiped" });
    expect(after.current).toBeNull();
    expect(events.at(-1)).toEqual({ kind: "end", winner: "a", reason: "wiped" });
    expect(legalCombatActions(after, RULES)).toEqual([]);
    expect(() => act(after, { slot: "base", target: "b1" })).toThrow("over");
  });

  it("after the last action counts who stands, then the Life left, else a draw", () => {
    const one: CombatContext = { rules: { ...STILL.rules, maxActions: 1 }, families: FAMILIES };
    const { state } = start(teams(), one);
    expect(act(state, { slot: "base", target: "b0" }, one).state.result).toEqual({ winner: "a", reason: "limit" });
    expect(act(state, { slot: "base", target: "b0" }, one, always(0.95)).state.result).toEqual({ winner: "draw", reason: "limit" });
    get(state, "a3").vita = 0;
    expect(act(state, { slot: "base", target: "b0" }, one).state.result).toEqual({ winner: "b", reason: "limit" });
  });

  it("does not change the state it was given", () => {
    const { state } = start();
    const before = JSON.stringify(state);
    act(state, { slot: "base", target: "b0" });
    expect(JSON.stringify(state)).toBe(before);
  });
});
