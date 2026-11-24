// Stage 2 of the Scontro a squadre: statuses and passives (docs/COMBAT.md).
import { describe, expect, it } from "vitest";
import {
  applyCombatAction,
  combatActor,
  combatEffectChance,
  combatEffectiveSpeed,
  combatFighterCritChance,
  combatHasStatus,
  combatTargets,
  createCombat,
  legalCombatActions,
  validateCombatMove,
  validateCombatPassive,
  type CombatAction,
  type CombatContext,
  type CombatEvent,
  type CombatFighterInput,
  type CombatKit,
  type CombatMove,
  type CombatPassive,
  type CombatRules,
  type CombatState,
  type CombatStatusCode,
} from "./combat.ts";
import type { Rng } from "./rng.ts";

// Fixed numbers for these tests, as in combat.test.ts.
const RULES: CombatRules = {
  teamSize: 5,
  frontSize: 2,
  referenceBudget: 54,
  rarityScalePercent: 100,
  vita: { base: 260, perPoint: { res: 6, vol: 3 } },
  speed: { base: 100, perPoint: { vel: 2 } },
  turnMeter: 1000,
  startMeterMaxPercent: 0,
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

/** 5 everywhere but Speed, Perception and Stealth: Life 305, a base move of Power 60 hits for 45 (36 behind the line). */
const plain = (changes: Record<string, number> = {}) => ({ ...Object.fromEntries(CODES.map((c) => [c, ["VEL", "PER", "FUR"].includes(c) ? 0 : 5])), ...changes });
/** The same roll forever: 0.1 hits without a critical, 0.95 misses. */
const always = (value = 0.1): Rng => () => value;
const sequence = (...values: number[]): Rng => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

function move(slot: CombatMove["slot"], changes: Partial<CombatMove> = {}): CombatMove {
  return { id: `${slot}-move`, name: slot, slot, scaling: { FOR: 1 }, range: "ranged", target: "enemy", effects: [{ kind: "damage", multiplier: 1, on: "primary" }], cooldown: slot === "special" ? 3 : 0, ...changes };
}
const KIT: CombatKit = { base: move("base"), special: move("special"), supreme: move("supreme", { target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }] }) };
function passive(changes: Partial<CombatPassive>): CombatPassive {
  return { id: "passive", name: "Passiva", scaling: {}, trigger: null, limit: 0, effects: [], modifiers: {}, ...changes };
}
const fighter = (id: string, stats: Record<string, number>, kit: CombatKit = KIT): CombatFighterInput => ({ id, definitionId: id, name: id, stats, budget: 54, kit });

/** a0 is fast (Speed 120) and acts first; then a1-a4, then b0-b4 (side a wins the ties with these rolls). */
function setup(kits: Partial<Record<string, CombatKit>> = {}) {
  return {
    a: [0, 1, 2, 3, 4].map((i) => fighter(`a${i}`, plain(i === 0 ? { VEL: 10 } : {}), kits[`a${i}`])),
    b: [0, 1, 2, 3, 4].map((i) => fighter(`b${i}`, plain(), kits[`b${i}`])),
    field: null,
  };
}
const start = (kits: Partial<Record<string, CombatKit>> = {}, rng: Rng = always()) => createCombat(setup(kits), CTX, rng);
const act = (state: CombatState, action: CombatAction, rng: Rng = always()) => applyCombatAction(state, action, CTX, rng);
const get = (state: CombatState, key: string) => state.fighters.find((f) => f.key === key)!;
const give = (state: CombatState, key: string, code: CombatStatusCode, turns = 2) => get(state, key).statuses.push({ code, turns, fresh: false });
const firstBase = (state: CombatState) => legalCombatActions(state, RULES).find((a) => a.slot === "base")!;
/** Plays base moves that miss until `done`; returns the state and every event on the way. */
function playUntil(state: CombatState, done: (state: CombatState) => boolean) {
  const events: CombatEvent[] = [];
  for (let i = 0; i < 60 && !done(state); i += 1) {
    const step = act(state, firstBase(state), always(0.95));
    events.push(...step.events);
    state = step.state;
  }
  return { state, events };
}
const damageOf = (events: CombatEvent[]) => events.find((e) => e.kind === "damage");

describe("statuses", () => {
  it("change damage and defence: empower +25%, weaken −20%, fortify +50% defence, vulnerable −30%", () => {
    const hit = (key: string, code: CombatStatusCode) => {
      const { state } = start();
      give(state, key, code);
      return damageOf(act(state, { slot: "base", target: "b0" }).events);
    };
    expect(hit("a0", "empower")).toMatchObject({ amount: 56 });
    expect(hit("a0", "weaken")).toMatchObject({ amount: 36 });
    expect(hit("b0", "fortify")).toMatchObject({ amount: 40 });
    expect(hit("b0", "vulnerable")).toMatchObject({ amount: 49 });
  });

  it("make a fighter faster with haste", () => {
    const { state } = start({ a2: { ...KIT, passive: passive({ modifiers: { speedPercent: 10 } }) } });
    give(state, "a1", "haste");
    expect(combatEffectiveSpeed(get(state, "a1"), RULES)).toBeCloseTo(120);
    expect(combatEffectiveSpeed(get(state, "a2"), RULES)).toBeCloseTo(110);
  });

  it("force single-target moves on a taunting enemy they can reach", () => {
    const { state } = start();
    const actor = combatActor(state)!;
    const melee = move("base", { range: "melee" });
    give(state, "b3", "taunt", 1);
    expect(combatTargets(state, actor, KIT.base, RULES)).toEqual(["b3"]);
    expect(combatTargets(state, actor, melee, RULES)).toEqual(["b0", "b1"]);
    give(state, "b1", "taunt", 1);
    expect(combatTargets(state, actor, melee, RULES)).toEqual(["b1"]);
    actor.charge = 6;
    expect(legalCombatActions(state, RULES).filter((a) => a.slot === "supreme")).toEqual([{ slot: "supreme", target: null }]);
  });

  it("make a stunned fighter lose its turn, then play at least the next one", () => {
    const stunning: CombatKit = { base: move("base", { effects: [{ kind: "status", status: "stun", turns: 1, on: "primary" }] }), special: move("special", { effects: [{ kind: "status", status: "stun", turns: 1, on: "primary" }] }), supreme: KIT.supreme };
    let { state } = start({ a0: stunning });
    const first = act(state, { slot: "special", target: "b0" });
    expect(first.events).toContainEqual({ kind: "status", actor: "a0", target: "b0", status: "stun", turns: 1 });
    const lost = playUntil(first.state, (s) => get(s, "b0").turns >= 1);
    expect(lost.events).toContainEqual({ kind: "stunned", actor: "b0" });
    expect(lost.events).toContainEqual({ kind: "expired", target: "b0", status: "stun" });
    expect(lost.state.actions).toBe(6);
    expect(combatHasStatus(get(lost.state, "b0"), "stun")).toBe(false);
    state = playUntil(lost.state, (s) => s.current === "a0").state;
    expect(act(state, { slot: "base", target: "b0" }).events).toContainEqual({ kind: "resisted", actor: "a0", target: "b0", status: "stun", immune: true });
    // After its next turn, a stun lands again.
    state = playUntil(state, (s) => get(s, "b0").turns >= 2 && s.current !== "b0").state;
    state = playUntil(state, (s) => s.current === "a0").state;
    expect(act(state, { slot: "base", target: "b0" }).events).toContainEqual({ kind: "status", actor: "a0", target: "b0", status: "stun", turns: 1 });
  });

  it("burn a share of the Life at the start of each turn, through the shield, and may knock out", () => {
    let { state } = start();
    give(state, "b0", "burn", 2);
    get(state, "b0").shield = 50;
    const bitten = playUntil(state, (s) => s.current === "b0");
    expect(bitten.events).toContainEqual({ kind: "burn", target: "b0", amount: 18 });
    expect(get(bitten.state, "b0")).toMatchObject({ vita: 287, shield: 50 });
    state = start().state;
    give(state, "b0", "burn", 2);
    get(state, "b0").vita = 10;
    const fallen = playUntil(state, (s) => get(s, "b0").vita === 0);
    expect(fallen.events.slice(-4).map((e) => e.kind)).toEqual(["turn", "burn", "defeated", "turn"]);
    expect(fallen.state.current).toBe("b1");
  });

  it("last in the holder's own turns; one put during its turn does not lose that turn", () => {
    const rally: CombatKit = { ...KIT, special: move("special", { target: "self", effects: [{ kind: "status", status: "empower", turns: 1, on: "primary" }] }) };
    let { state } = start({ a0: rally });
    state = act(state, { slot: "special", target: null }).state;
    expect(get(state, "a0").statuses).toEqual([{ code: "empower", turns: 1, fresh: false }]);
    state = playUntil(state, (s) => s.current === "a0").state;
    const { events } = act(state, { slot: "base", target: "b0" });
    expect(damageOf(events)).toMatchObject({ amount: 56 });
    expect(events).toContainEqual({ kind: "expired", target: "a0", status: "empower" });
  });

  it("renew the same status instead of stacking it", () => {
    const curse: CombatKit = { ...KIT, base: move("base", { effects: [{ kind: "status", status: "weaken", turns: 2, on: "primary" }] }) };
    const { state } = start({ a0: curse });
    give(state, "b0", "weaken", 1);
    const after = act(state, { slot: "base", target: "b0" }).state;
    expect(get(after, "b0").statuses).toEqual([{ code: "weaken", turns: 2, fresh: false }]);
  });
});

describe("debuff chances", () => {
  it("compare the user's ability with the target's mean in that family, within 10% and 90%", () => {
    // FOR 5 against Forza 5, Velocità 0, Resistenza 5: mean 3.33, so 25 + 3 × 1.67 = 30%.
    expect(combatEffectChance(plain(), plain(), { base: 25, ability: "FOR" }, CTX)).toBeCloseTo(0.3);
    expect(combatEffectChance(plain(), plain(), { base: 25, ability: "FOR" }, CTX, 10)).toBeCloseTo(0.4);
    expect(combatEffectChance(plain(), plain(), { base: 200, ability: "FOR" }, CTX)).toBeCloseTo(0.9);
    expect(combatEffectChance(plain(), plain(), { base: -100, ability: "FOR" }, CTX)).toBeCloseTo(0.1);
  });

  it("land with the roll, and only if the move's hit landed", () => {
    const hex: CombatKit = { ...KIT, base: move("base", { effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 200, ability: "FOR" } }] }) };
    const { state } = start({ a0: hex });
    const missed = act(state, { slot: "base", target: "b0" }, always(0.95)).events;
    expect(missed.filter((e) => e.kind === "status" || e.kind === "resisted")).toEqual([]);
    expect(act(state, { slot: "base", target: "b0" }, sequence(0.1, 0.5, 0.5)).events).toContainEqual({ kind: "status", actor: "a0", target: "b0", status: "weaken", turns: 2 });
    expect(act(state, { slot: "base", target: "b0" }, sequence(0.1, 0.5, 0.95)).events).toContainEqual({ kind: "resisted", actor: "a0", target: "b0", status: "weaken", immune: false });
  });
});

describe("passives", () => {
  const shieldAtStart = passive({ id: "porto", trigger: "battle_start", limit: 1, scaling: { FOR: 1 }, effects: [{ kind: "shield", multiplier: 0.5, to: "self" }] });
  const counter = passive({ id: "rintuzzo", trigger: "hurt", scaling: { FOR: 1 }, effects: [{ kind: "damage", multiplier: 0.5, to: "other" }] });

  it("act at the start of the battle", () => {
    const { state, events } = start({ a0: { ...KIT, passive: shieldAtStart } });
    expect(events.slice(0, 3)).toEqual([
      { kind: "start", field: null, tieSide: "a" },
      { kind: "passive", actor: "a0", passive: "porto", trigger: "battle_start" },
      { kind: "shield", actor: "a0", target: "a0", amount: 30 },
    ]);
    expect(get(state, "a0").shield).toBe(30);
  });

  it("answer a hurt on the attacker, and their effects trigger no passive", () => {
    const { state } = start({ a0: { ...KIT, passive: counter }, b0: { ...KIT, passive: counter } });
    const { events } = act(state, { slot: "base", target: "b0" });
    // b0 answers with Power 60 × 0.5 against a0's body defence (5 + 10 + 5) × 3.37: 17.9.
    expect(events.filter((e) => e.kind === "passive")).toEqual([{ kind: "passive", actor: "b0", passive: "rintuzzo", trigger: "hurt" }]);
    expect(events.filter((e) => e.kind === "damage").map((e) => (e.kind === "damage" ? [e.actor, e.target, e.amount] : null))).toEqual([["a0", "b0", 45], ["b0", "a0", 18]]);
  });

  it("act no more than their limit", () => {
    const once = { ...counter, limit: 1 };
    let { state } = start({ b0: { ...KIT, passive: once } });
    const first = act(state, { slot: "base", target: "b0" });
    expect(first.events.some((e) => e.kind === "passive")).toBe(true);
    state = first.state;
    expect(act(state, { slot: "base", target: "b0" }).events.some((e) => e.kind === "passive")).toBe(false);
  });

  it("answer a knockout and a fallen ally", () => {
    const hunter = passive({ id: "caccia", trigger: "knockout", effects: [{ kind: "charge", amount: 2, to: "self" }] });
    const grief = passive({ id: "lutto", trigger: "ally_down", effects: [{ kind: "status", status: "empower", turns: 2, to: "allies" }] });
    const { state } = start({ a0: { ...KIT, passive: hunter }, b1: { ...KIT, passive: grief } });
    get(state, "b0").vita = 10;
    const { state: after, events } = act(state, { slot: "base", target: "b0" });
    expect(events).toContainEqual({ kind: "charge", target: "a0", amount: 2 });
    expect(get(after, "a0").charge).toBe(6);
    expect(events.filter((e) => e.kind === "status").map((e) => (e.kind === "status" ? e.target : null))).toEqual(["b1", "b2", "b3", "b4"]);
  });

  it("act once when the Life drops to the threshold", () => {
    const lastStand = passive({ id: "ultima", trigger: "low_vita", thresholdPercent: 50, scaling: { FOR: 1 }, effects: [{ kind: "shield", multiplier: 1, to: "self" }] });
    let { state } = start({ b0: { ...KIT, passive: lastStand } });
    get(state, "b0").vita = 160;
    const first = act(state, { slot: "base", target: "b0" });
    expect(first.events).toContainEqual({ kind: "passive", actor: "b0", passive: "ultima", trigger: "low_vita" });
    expect(get(first.state, "b0")).toMatchObject({ vita: 115, shield: 60 });
    state = first.state;
    get(state, "b0").shield = 0;
    expect(act(state, { slot: "base", target: "b0" }).events.some((e) => e.kind === "passive")).toBe(false);
  });

  it("change numbers with their modifiers: criticals within the limit, damage on a status", () => {
    const { state } = start({ a0: { ...KIT, passive: passive({ modifiers: { critPercent: 100, damageVsStatus: { status: "burn", percent: 50 } } }) } });
    expect(combatFighterCritChance(get(state, "a0"), RULES)).toBeCloseTo(0.28);
    give(state, "b0", "burn", 2);
    expect(damageOf(act(state, { slot: "base", target: "b0" }, sequence(0.1, 0.5)).events)).toMatchObject({ amount: 67 });
  });
});

describe("checks of stage 2", () => {
  it("refuse statuses on the wrong side, chances on buffs, too long statuses", () => {
    const errors = (changes: Partial<CombatMove>) => validateCombatMove(move("base", changes), FAMILIES, RULES);
    expect(errors({ effects: [{ kind: "status", status: "stun", turns: 1, on: "self" }] })).toContain("move base-move: stun needs an enemy target");
    expect(errors({ effects: [{ kind: "status", status: "empower", turns: 1, on: "primary" }] })).toContain("move base-move: empower needs an allied target");
    expect(errors({ target: "ally", effects: [{ kind: "status", status: "empower", turns: 1, on: "primary", chance: { base: 50, ability: "FOR" } }] })).toContain("move base-move: only a debuff has a chance");
    expect(errors({ effects: [{ kind: "status", status: "burn", turns: 4, on: "primary" }] })).toContain("move base-move: burn lasts more than 3 turns");
    expect(errors({ effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "empower", turns: 1, on: "self" }] })).toEqual([]);
  });

  it("refuse passives that make no sense", () => {
    const errors = (changes: Partial<CombatPassive>) => validateCombatPassive(passive(changes), FAMILIES, RULES);
    expect(errors({})).toContain("passive passive: does nothing");
    expect(errors({ trigger: "turn_start" })).toContain("passive passive: a trigger needs effects");
    expect(errors({ trigger: "turn_start", effects: [{ kind: "status", status: "weaken", turns: 1, to: "other" }] })).toContain("passive passive: other needs the hit or hurt trigger");
    expect(errors({ trigger: "hit", effects: [{ kind: "status", status: "empower", turns: 1, to: "other" }] })).toContain("passive passive: empower needs allies");
    expect(errors({ trigger: "low_vita", effects: [{ kind: "charge", amount: 1, to: "self" }] })).toContain("passive passive: low_vita needs a threshold between 0 and 100");
    expect(errors({ trigger: "battle_start", effects: [{ kind: "shield", multiplier: 0.5, to: "self" }] })).toContain("passive passive: no ability");
    expect(errors({ trigger: "hurt", scaling: { FOR: 1 }, effects: [{ kind: "damage", multiplier: 0.5, to: "other" }] })).toEqual([]);
  });
});
