// The computer's side of the Scontro a squadre (SPEC §5.19, docs/COMBAT.md). It values every
// allowed action on expected numbers (it never knows the rolls), in five parts: damage,
// knockouts, healing, control (debuffs on enemies) and protection (shields and buffs on allies).
// A strategy weighs the parts, a target priority favours some enemies, and orders given to a
// single fighter before the battle (the tactical auto battler) bend its own choices. Also: the
// formation, the generic kits of the simulator, and a whole battle played by the computer.

import {
  COMBAT_ADJACENT,
  applyCombatAction,
  combatActor,
  combatEffectChance,
  combatFighterCritChance,
  combatFighterHitChance,
  combatFrontStands,
  combatHasStatus,
  combatHitDamage,
  combatModifiers,
  combatMoveFamily,
  combatPower,
  combatShieldCap,
  combatStats,
  combatVita,
  createCombat,
  isCombatDebuff,
  legalCombatActions,
  type CombatAction,
  type CombatContext,
  type CombatEffect,
  type CombatEvent,
  type CombatFighter,
  type CombatFighterInput,
  type CombatKit,
  type CombatMove,
  type CombatPassive,
  type CombatRange,
  type CombatSetup,
  type CombatSlot,
  type CombatState,
  type CombatStatusCode,
} from "./combat.ts";
import type { Rng } from "./rng.ts";
import type { AbilityCode, AbilityFamilies, Side } from "./types.ts";

/** The parts of an action's worth, in points of Life. */
export type CombatValueParts = { damage: number; knockout: number; heal: number; control: number; protection: number };

/** How much each part counts (from the design document's table, out of 1). */
export const COMBAT_STRATEGIES = {
  balanced: { damage: 0.7, knockout: 0.85, heal: 0.75, control: 0.7, protection: 0.65 },
  aggressive: { damage: 1, knockout: 1, heal: 0.35, control: 0.45, protection: 0.25 },
  defensive: { damage: 0.35, knockout: 0.65, heal: 1, control: 0.65, protection: 1 },
  control: { damage: 0.45, knockout: 0.7, heal: 0.6, control: 1, protection: 0.55 },
  assassin: { damage: 0.85, knockout: 1, heal: 0.35, control: 0.7, protection: 0.25 },
} as const satisfies Record<string, CombatValueParts>;
export type CombatStrategy = keyof typeof COMBAT_STRATEGIES;

/** Which enemies the side prefers to aim at. */
export const COMBAT_PRIORITIES = ["lowest_vita", "lowest_share", "most_dangerous", "back_line", "healers", "supreme_ready"] as const;
export type CombatTargetPriority = (typeof COMBAT_PRIORITIES)[number];

/** Orders to one fighter: heal only allies under a share of Life; a supreme on every enemy only with this many standing; its own priority. */
export type CombatOrder = { healBelowPercent?: number; supremeMinTargets?: number; priority?: CombatTargetPriority };

/** A side's plan before the battle: its strategy, its target priority, the orders by place (0-4). */
export type CombatTactics = { strategy: CombatStrategy; priority: CombatTargetPriority | null; orders: Partial<Record<number, CombatOrder>> };
export const DEFAULT_COMBAT_TACTICS: CombatTactics = { strategy: "balanced", priority: null, orders: {} };

/** Points a sure knockout is worth, besides its damage. */
const KNOCKOUT_VALUE = 150;
/** A point of shield is worth a little less than a point of damage or healing. */
const SHIELD_VALUE = 0.7;
/** An action on a target the priority prefers is worth this much more. */
const PRIORITY_BONUS = 1.5;
/** The share of damage the defences leave, on average (catalog defence 50 against 100). */
const MEAN_MITIGATION = 2 / 3;
/** What a debuff or buff removes or adds, as a share of the numbers it changes (stage 2 estimates). */
const FORTIFY_SHARE = 0.14;
const VULNERABLE_SHARE = 0.12;
const TAUNT_SHARE = 0.3;
const SLOT_ORDER: Record<CombatSlot, number> = { supreme: 0, special: 1, base: 2 };

function sideOf(state: CombatState, side: Side): CombatFighter[] {
  return state.fighters.filter((f) => f.side === side && f.vita > 0).sort((x, y) => x.position - y.position);
}

/** What a fighter deals in one action, about: its base move's Power after the average defence. */
export function combatOutput(fighter: CombatFighter, state: CombatState, ctx: CombatContext): number {
  return combatPower(fighter.kit.base, fighter.stats, ctx.rules, state.field) * MEAN_MITIGATION;
}

function heals(fighter: CombatFighter): boolean {
  return [fighter.kit.base, fighter.kit.special, fighter.kit.supreme].some((m) => m.effects.some((e) => e.kind === "heal"));
}

/** Whether an enemy is the one the priority aims at. */
function preferred(state: CombatState, ctx: CombatContext, target: CombatFighter, priority: CombatTargetPriority): boolean {
  const enemies = sideOf(state, target.side);
  const best = (score: (f: CombatFighter) => number) => enemies.reduce((m, f) => (score(f) < score(m) ? f : m)).key === target.key;
  switch (priority) {
    case "lowest_vita":
      return best((f) => f.vita);
    case "lowest_share":
      return best((f) => f.vita / f.maxVita);
    case "most_dangerous":
      return best((f) => -combatOutput(f, state, ctx));
    case "back_line":
      return target.position >= ctx.rules.frontSize;
    case "healers":
      return heals(target);
    case "supreme_ready":
      return target.charge >= ctx.rules.charge.max;
  }
}

/** Who a move's effect reaches, as the engine will resolve it (from the current state). */
function reachedBy(state: CombatState, actor: CombatFighter, move: CombatMove, effect: CombatEffect, primary: CombatFighter | null): CombatFighter[] {
  if (effect.on === "self") return [actor];
  if (effect.on === "primary") return primary ? [primary] : [];
  const side = move.target === "all_allies" ? actor.side : actor.side === "a" ? "b" : "a";
  const live = sideOf(state, side);
  if (effect.on === "all") return live;
  return primary ? live.filter((f) => COMBAT_ADJACENT[primary.position].includes(f.position)) : [];
}

/** What a status put on a fighter is worth, before its chance, and in which part. */
function statusWorth(state: CombatState, ctx: CombatContext, target: CombatFighter, status: CombatStatusCode, turns: number): { part: keyof CombatValueParts; value: number } {
  const { rules } = ctx;
  const existing = target.statuses.find((s) => s.code === status);
  const extra = Math.max(0, turns - (existing?.turns ?? 0));
  const output = combatOutput(target, state, ctx);
  const foes = sideOf(state, target.side === "a" ? "b" : "a");
  const friends = sideOf(state, target.side);
  const incoming = foes.reduce((sum, f) => sum + combatOutput(f, state, ctx), 0) / Math.max(1, friends.length);
  switch (status) {
    case "empower":
      return { part: "protection", value: (rules.statuses.empowerPercent / 100) * output * extra };
    case "haste":
      return { part: "protection", value: (rules.statuses.hastePercent / 100) * output * extra };
    case "fortify":
      return { part: "protection", value: FORTIFY_SHARE * incoming * extra };
    case "taunt": {
      const sturdiest = friends.every((f) => f.vita + f.shield <= target.vita + target.shield);
      return { part: "protection", value: sturdiest && friends.length > 1 ? TAUNT_SHARE * incoming * extra : 0 };
    }
    case "weaken":
      return { part: "control", value: (rules.statuses.weakenPercent / 100) * output * extra };
    case "vulnerable": {
      const ours = foes.reduce((sum, f) => sum + combatOutput(f, state, ctx), 0);
      return { part: "control", value: (VULNERABLE_SHARE * ours * extra) / Math.max(1, friends.length) };
    }
    case "stun": {
      const immune = target.turns < target.stunImmuneUntil || combatHasStatus(target, "stun");
      return { part: "control", value: immune ? 0 : output };
    }
    case "burn":
      return { part: "damage", value: Math.min(target.vita, ((target.maxVita * rules.statuses.burnPercent) / 100) * extra) };
  }
}

/**
 * The parts of an action's worth: the damage it should deal (hit and critical chances included,
 * never more than the target has left), the chance of a knockout, the healing needed, the shields
 * that fit, the statuses (times their chance), with the orders of the fighter applied. Null when
 * an order forbids the action.
 */
export function combatActionParts(state: CombatState, action: CombatAction, ctx: CombatContext, order: CombatOrder = {}): CombatValueParts | null {
  const { rules } = ctx;
  const actor = combatActor(state);
  if (!actor) return null;
  const move = actor.kit[action.slot];
  const enemySide: Side = actor.side === "a" ? "b" : "a";
  if (action.slot === "supreme" && move.target === "all_enemies" && order.supremeMinTargets && sideOf(state, enemySide).length < order.supremeMinTargets) return null;
  const power = combatPower(move, actor.stats, rules, state.field);
  const family = combatMoveFamily(move, ctx.families);
  const coverOn = combatFrontStands(state, enemySide, rules) && move.range !== "infiltration";
  const byKey = new Map(state.fighters.map((f) => [f.key, f]));
  const primary = move.target === "self" ? actor : action.target ? byKey.get(action.target) ?? null : null;
  const left = new Map(state.fighters.map((f) => [f.key, f.vita + f.shield]));
  const hitChance = new Map<string, number>();
  const parts: CombatValueParts = { damage: 0, knockout: 0, heal: 0, control: 0, protection: 0 };
  for (const effect of move.effects) {
    for (const target of reachedBy(state, actor, move, effect, primary)) {
      if (effect.kind === "damage") {
        const hit = combatFighterHitChance(actor, target, rules);
        const crit = combatFighterCritChance(actor, rules);
        const covered = coverOn && target.position >= rules.frontSize;
        const raw = combatHitDamage(actor, target, power, effect.multiplier, family, covered, ctx);
        const expected = raw * hit * (1 + crit * (rules.crit.multiplierPercent / 100 - 1));
        const remaining = left.get(target.key) ?? 0;
        parts.damage += Math.min(expected, remaining);
        if (remaining > 0 && raw >= remaining) parts.knockout += KNOCKOUT_VALUE * hit;
        left.set(target.key, Math.max(0, remaining - expected));
        hitChance.set(target.key, hit);
      } else if (effect.kind === "heal") {
        const allowed = order.healBelowPercent === undefined || target.vita * 100 <= target.maxVita * order.healBelowPercent;
        const bonus = 1 + (combatModifiers(actor).healPercent ?? 0) / 100;
        if (allowed) parts.heal += Math.min(target.maxVita - target.vita, power * effect.multiplier * bonus);
      } else if (effect.kind === "shield") {
        parts.protection += SHIELD_VALUE * Math.max(0, Math.min(combatShieldCap(target, rules) - target.shield, power * effect.multiplier));
      } else {
        const { part, value } = statusWorth(state, ctx, target, effect.status, Math.min(effect.turns, rules.statuses.maxTurns));
        let chance = 1;
        if (isCombatDebuff(effect.status)) {
          if (effect.chance) chance *= combatEffectChance(actor.stats, target.stats, effect.chance, ctx, combatModifiers(actor).effectChancePercent ?? 0);
          chance *= hitChance.get(target.key) ?? 1;
        }
        parts[part] += value * chance;
      }
    }
  }
  return parts;
}

/** An action's worth for a side's tactics: the parts by the strategy, more on the target the priority prefers; −1 when an order forbids it. */
export function combatActionValue(state: CombatState, action: CombatAction, ctx: CombatContext, tactics: CombatTactics = DEFAULT_COMBAT_TACTICS): number {
  const actor = combatActor(state);
  if (!actor) return 0;
  const order = tactics.orders[actor.position] ?? {};
  const parts = combatActionParts(state, action, ctx, order);
  if (!parts) return -1;
  const weights = COMBAT_STRATEGIES[tactics.strategy];
  let value = 0;
  for (const part of Object.keys(parts) as (keyof CombatValueParts)[]) value += parts[part] * weights[part];
  const priority = order.priority ?? tactics.priority;
  const target = action.target ? state.fighters.find((f) => f.key === action.target) : null;
  if (priority && target && target.side !== actor.side && preferred(state, ctx, target, priority)) value *= PRIORITY_BONUS;
  return value;
}

/** The computer's choice: the action worth most; on equal values the supreme, then the special, then the first target. */
export function chooseCombatAction(state: CombatState, ctx: CombatContext, tactics: CombatTactics = DEFAULT_COMBAT_TACTICS): CombatAction {
  const actions = legalCombatActions(state, ctx.rules);
  if (actions.length === 0) throw new Error("combat: no action to choose");
  let best = actions[0];
  let bestValue = combatActionValue(state, best, ctx, tactics);
  for (const action of actions.slice(1)) {
    const value = combatActionValue(state, action, ctx, tactics);
    if (value > bestValue + 1e-9 || (Math.abs(value - bestValue) <= 1e-9 && SLOT_ORDER[action.slot] < SLOT_ORDER[best.slot])) {
      best = action;
      bestValue = value;
    }
  }
  return best;
}

/** A side in place order for the computer: the two with the most Life in front, the others behind. */
export function autoCombatFormation<T extends Pick<CombatFighterInput, "stats" | "budget">>(team: readonly T[], ctx: CombatContext): T[] {
  const vita = (input: T) => combatVita(combatStats(input.stats, input.budget, ctx.rules), ctx.rules);
  const order = team.map((input, i) => ({ input, i, vita: vita(input) })).sort((x, y) => y.vita - x.vita || x.i - y.i);
  const front = order.slice(0, ctx.rules.frontSize).sort((x, y) => x.i - y.i);
  const back = order.slice(ctx.rules.frontSize).sort((x, y) => x.i - y.i);
  return [...front, ...back].map((entry) => entry.input);
}

/** The role of a generic kit, from the character's best ability. */
export type CombatRole = "tank" | "bruiser" | "controller" | "blaster" | "specialist";

export function combatRoleOf(stats: Record<AbilityCode, number>, families: AbilityFamilies): CombatRole {
  const main = Object.keys(families).sort((x, y) => (stats[y] ?? 0) - (stats[x] ?? 0))[0];
  if (main === "RES") return "tank";
  return ({ body: "bruiser", mind: "controller", power: "blaster", craft: "specialist" } as Record<string, CombatRole>)[families[main]] ?? "bruiser";
}

/**
 * A stand-in kit for the simulator, until each character has its own: every move on the two
 * best abilities (70% and 30%), its shape from the role of the best one. Tank: shield and taunt,
 * a weakening area supreme. Bruiser: a hit on the adjacent places, a stunning supreme, a shield
 * at the start. Controller: weaken and stun, a supreme that heals and empowers the side. Blaster:
 * a burning area special and an area supreme. Specialist: vulnerable, then a heavy single hit.
 */
export function genericCombatKit(code: string, stats: Record<AbilityCode, number>, families: AbilityFamilies): CombatKit {
  const ranked = Object.keys(families).sort((x, y) => (stats[y] ?? 0) - (stats[x] ?? 0));
  const [main, second] = ranked;
  const scaling = { [main]: 0.7, [second]: 0.3 };
  const role = combatRoleOf(stats, families);
  const range: CombatRange = families[main] === "body" || main === "COM" ? "melee" : main === "FUR" ? "infiltration" : "ranged";
  const move = (slot: CombatSlot, name: string, extra: Partial<CombatMove> & Pick<CombatMove, "effects">): CombatMove => ({
    id: `${code}-${slot}`,
    name,
    slot,
    scaling,
    range,
    target: "enemy",
    cooldown: slot === "special" ? 3 : 0,
    ...extra,
  });
  const chance = (base: number) => ({ base, ability: main });
  const passive = (extra: Partial<CombatPassive>): CombatPassive => ({ id: `${code}-passive`, name: "Istinto", scaling: {}, trigger: null, limit: 0, effects: [], modifiers: {}, ...extra });
  switch (role) {
    case "tank":
      return {
        base: move("base", "Spinta", { effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }] }),
        special: move("special", "Muro", { target: "self", effects: [{ kind: "shield", multiplier: 0.7, on: "primary" }, { kind: "status", status: "taunt", turns: 1, on: "primary" }] }),
        supreme: move("supreme", "Scossa", { target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.65, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: chance(40) }] }),
        passive: passive({ trigger: "low_vita", thresholdPercent: 40, limit: 1, scaling: { [main]: 1 }, effects: [{ kind: "shield", multiplier: 0.8, to: "self" }] }),
      };
    case "bruiser":
      return {
        base: move("base", "Colpo", { effects: [{ kind: "damage", multiplier: 1, on: "primary" }] }),
        special: move("special", "Spazzata", { target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }, { kind: "damage", multiplier: 0.35, on: "adjacent" }] }),
        supreme: move("supreme", "Schianto", { effects: [{ kind: "damage", multiplier: 1.9, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: chance(45) }] }),
        passive: passive({ trigger: "battle_start", limit: 1, scaling: { [main]: 1 }, effects: [{ kind: "shield", multiplier: 0.5, to: "self" }] }),
      };
    case "controller":
      return {
        base: move("base", "Disturbo", { effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: chance(35) }] }),
        special: move("special", "Blocco", { effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: chance(50) }] }),
        supreme: move("supreme", "Rinforzo", { target: "all_allies", effects: [{ kind: "heal", multiplier: 0.55, on: "all" }, { kind: "status", status: "empower", turns: 2, on: "all" }] }),
        passive: passive({ modifiers: { healPercent: 15, effectChancePercent: 10 } }),
      };
    case "blaster":
      return {
        base: move("base", "Raggio", { effects: [{ kind: "damage", multiplier: 1, on: "primary" }] }),
        special: move("special", "Vampata", { target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.45, on: "all" }, { kind: "status", status: "burn", turns: 2, on: "all", chance: chance(45) }] }),
        supreme: move("supreme", "Ondata", { target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }] }),
        passive: passive({ modifiers: { damagePercent: 8 } }),
      };
    case "specialist":
      return {
        base: move("base", "Taglio", { effects: [{ kind: "damage", multiplier: 1, on: "primary" }] }),
        special: move("special", "Punto debole", { effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: chance(55) }] }),
        supreme: move("supreme", "Colpo di grazia", { effects: [{ kind: "damage", multiplier: 2, on: "primary" }] }),
        passive: passive({ modifiers: { critPercent: 6, damageVsStatus: { status: "vulnerable", percent: 15 } } }),
      };
  }
}

export type CombatChooser = (state: CombatState, ctx: CombatContext, tactics: CombatTactics) => CombatAction;

/** A whole battle with every choice made by `choose` (the computer by default) on each side's tactics: the final state and the log. */
export function runCombat(
  setup: CombatSetup,
  ctx: CombatContext,
  rng: Rng,
  options: { tactics?: Partial<Record<Side, CombatTactics>>; choose?: CombatChooser } = {},
): { state: CombatState; events: CombatEvent[] } {
  const choose = options.choose ?? chooseCombatAction;
  let { state, events } = createCombat(setup, ctx, rng);
  const log = [...events];
  for (let guard = 0; !state.result; guard += 1) {
    if (guard > ctx.rules.maxActions) throw new Error("combat: the battle does not end");
    const side = combatActor(state)!.side;
    ({ state, events } = applyCombatAction(state, choose(state, ctx, options.tactics?.[side] ?? DEFAULT_COMBAT_TACTICS), ctx, rng));
    log.push(...events);
  }
  return { state, events: log };
}
