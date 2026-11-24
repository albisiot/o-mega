// The computer's side of the Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 1: a greedy
// choice on expected values (it never knows the rolls), a formation, generic kits for the
// simulator until every character has its own, and a whole battle played by the computer.

import {
  COMBAT_ADJACENT,
  applyCombatAction,
  combatCritChance,
  combatDefense,
  combatHitChance,
  combatMoveFamily,
  combatPower,
  combatRawDamage,
  combatShieldCap,
  combatStats,
  combatVita,
  createCombat,
  combatActor,
  combatFrontStands,
  legalCombatActions,
  type CombatAction,
  type CombatContext,
  type CombatEvent,
  type CombatFighter,
  type CombatFighterInput,
  type CombatKit,
  type CombatMove,
  type CombatRange,
  type CombatSetup,
  type CombatSlot,
  type CombatState,
} from "./combat.ts";
import type { Rng } from "./rng.ts";
import type { AbilityCode, AbilityFamilies } from "./types.ts";

/** Points a likely knockout adds to an action's value, besides the damage itself. */
const KNOCKOUT_VALUE = 150;
/** A point of shield is worth a little less than a point of damage or healing. */
const SHIELD_VALUE = 0.7;
const SLOT_ORDER: Record<CombatSlot, number> = { supreme: 0, special: 1, base: 2 };

/**
 * What an action is expected to be worth: the damage it should deal (hit and critical chances
 * included, never more than the target has left), a bonus for a likely knockout, the healing
 * that is needed and the shield that fits. Expected values only: the rolls are not known.
 */
export function combatActionValue(state: CombatState, action: CombatAction, ctx: CombatContext): number {
  const { rules } = ctx;
  const actor = combatActor(state);
  if (!actor) return 0;
  const move = actor.kit[action.slot];
  const power = combatPower(move, actor.stats, rules, state.field);
  const family = combatMoveFamily(move, ctx.families);
  const enemy = actor.side === "a" ? "b" : "a";
  const coverOn = combatFrontStands(state, enemy, rules) && move.range !== "infiltration";
  const byKey = new Map(state.fighters.map((f) => [f.key, f]));
  const primary = move.target === "self" ? actor : action.target ? byKey.get(action.target) ?? null : null;
  const left = new Map(state.fighters.map((f) => [f.key, f.vita + f.shield]));
  let value = 0;
  for (const effect of move.effects) {
    let reached: CombatFighter[];
    if (effect.on === "primary") reached = primary ? [primary] : [];
    else if (effect.on === "all") reached = state.fighters.filter((f) => f.vita > 0 && f.side === (move.target === "all_allies" ? actor.side : enemy));
    else reached = primary ? state.fighters.filter((f) => f.side === enemy && f.vita > 0 && COMBAT_ADJACENT[primary.position].includes(f.position)) : [];
    for (const target of reached) {
      if (effect.kind === "damage") {
        const hit = combatHitChance(actor.stats, target.stats, rules);
        const crit = combatCritChance(actor.stats, rules);
        const covered = coverOn && target.position >= rules.frontSize;
        const raw = combatRawDamage(power, effect.multiplier, combatDefense(target.stats, family, ctx), covered, rules);
        const expected = raw * hit * (1 + crit * (rules.crit.multiplierPercent / 100 - 1));
        const remaining = left.get(target.key) ?? 0;
        value += Math.min(expected, remaining);
        if (raw >= remaining) value += KNOCKOUT_VALUE * hit;
        left.set(target.key, Math.max(0, remaining - expected));
      } else if (effect.kind === "heal") {
        value += Math.min(target.maxVita - target.vita, power * effect.multiplier);
      } else {
        value += SHIELD_VALUE * Math.min(combatShieldCap(target, rules) - target.shield, power * effect.multiplier);
      }
    }
  }
  return value;
}

/** The computer's choice: the action worth most; on equal values the supreme, then the special, then the first target. */
export function chooseCombatAction(state: CombatState, ctx: CombatContext): CombatAction {
  const actions = legalCombatActions(state, ctx.rules);
  if (actions.length === 0) throw new Error("combat: no action to choose");
  let best = actions[0];
  let bestValue = combatActionValue(state, best, ctx);
  for (const action of actions.slice(1)) {
    const value = combatActionValue(state, action, ctx);
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

/**
 * A stand-in kit for the simulator, until each character has its own: every move on the two
 * best abilities (70% and 30%), melee for Corpo and Combattimento, infiltration for Furtività,
 * ranged otherwise. Base 1.0, special 1.35 every 3 turns, supreme 0.85 on every enemy.
 */
export function genericCombatKit(code: string, stats: Record<AbilityCode, number>, families: AbilityFamilies): CombatKit {
  const ranked = Object.keys(families).sort((x, y) => (stats[y] ?? 0) - (stats[x] ?? 0));
  const [main, second] = ranked;
  const scaling = { [main]: 0.7, [second]: 0.3 };
  const range: CombatRange = families[main] === "body" || main === "COM" ? "melee" : main === "FUR" ? "infiltration" : "ranged";
  const move = (slot: CombatSlot, name: string, extra: Pick<CombatMove, "target" | "effects" | "cooldown">): CombatMove => ({
    id: `${code}-${slot}`,
    name,
    slot,
    scaling,
    range,
    ...extra,
  });
  return {
    base: move("base", "Colpo", { target: "enemy", effects: [{ kind: "damage", multiplier: 1, on: "primary" }], cooldown: 0 }),
    special: move("special", "Affondo", { target: "enemy", effects: [{ kind: "damage", multiplier: 1.35, on: "primary" }], cooldown: 3 }),
    supreme: move("supreme", "Ondata", { target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }], cooldown: 0 }),
  };
}

export type CombatChooser = (state: CombatState, ctx: CombatContext) => CombatAction;

/** A whole battle with every choice made by `choose` (the computer by default): the final state and the log. */
export function runCombat(setup: CombatSetup, ctx: CombatContext, rng: Rng, choose: CombatChooser = chooseCombatAction): { state: CombatState; events: CombatEvent[] } {
  let { state, events } = createCombat(setup, ctx, rng);
  const log = [...events];
  for (let guard = 0; !state.result; guard += 1) {
    if (guard > ctx.rules.maxActions) throw new Error("combat: the battle does not end");
    ({ state, events } = applyCombatAction(state, choose(state, ctx), ctx, rng));
    log.push(...events);
  }
  return { state, events: log };
}
