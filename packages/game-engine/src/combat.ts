// Scontro a squadre (SPEC §5.19, docs/COMBAT.md): five fighters against five on two lines.
// A fighter acts when its turn meter, filled at its Speed, reaches the top, and uses one of
// its moves (plain data, checked by validateCombatMove) on the targets the lines allow. The
// battle values come from the card's 12 abilities, which never change: each is scaled to the
// reference budget, so rarities are equal here. Pure and deterministic: all randomness comes
// from the injected Rng, so a seed and the same choices always give the same log.

import type { Rng } from "./rng.ts";
import type { AbilityCode, AbilityFamilies, Side } from "./types.ts";

export type CombatSlot = "base" | "special" | "supreme";
export const COMBAT_SLOTS: readonly CombatSlot[] = ["base", "special", "supreme"];

/** Melee cannot pick a protected second line; ranged hits it at the cover; infiltration in full. */
export type CombatRange = "melee" | "ranged" | "infiltration";

export type CombatTarget = "enemy" | "enemy_and_adjacent" | "all_enemies" | "self" | "ally" | "all_allies";

/** What a move does, in order. `on`: the chosen target, its adjacent enemies, or everyone the move reaches. */
export type CombatEffect =
  | { kind: "damage"; multiplier: number; on: "primary" | "adjacent" | "all" }
  | { kind: "heal"; multiplier: number; on: "primary" | "all" }
  | { kind: "shield"; multiplier: number; on: "primary" | "all" };

export type CombatMove = {
  id: string;
  name: string;
  slot: CombatSlot;
  /** Ability code → weight in the move's Power; the weights sum to 1. */
  scaling: Record<AbilityCode, number>;
  /** Family of its damage; by default the family of its heaviest ability. */
  family?: string;
  range: CombatRange;
  target: CombatTarget;
  effects: CombatEffect[];
  /** Personal turns before a special can be used again; 0 for base and supreme moves. */
  cooldown: number;
};

export type CombatKit = { base: CombatMove; special: CombatMove; supreme: CombatMove };

/** Points for each ability point; codes in lower case, as in balance.ts and game_config. */
export type CombatPoints = Record<string, number>;

/** The numbers of the mode (balance.ts `combat`). */
export type CombatRules = {
  teamSize: number;
  frontSize: number;
  referenceBudget: number;
  /** How far the abilities move towards the reference budget: 100 = all the way (rarities equal), 0 = not at all. */
  rarityScalePercent: number;
  vita: { base: number; perPoint: CombatPoints };
  speed: { base: number; perPoint: CombatPoints };
  turnMeter: number;
  startMeterMaxPercent: number;
  power: { base: number; perPoint: number };
  /** Family code → defence for each point of the target's abilities of that family. */
  familyDefense: Record<string, number>;
  defenseScale: number;
  coverPercent: number;
  hit: { base: number; attacker: CombatPoints; defender: CombatPoints; minPercent: number; maxPercent: number };
  crit: { base: number; perPoint: CombatPoints; maxPercent: number; multiplierPercent: number };
  charge: { start: number; max: number; base: number; special: number };
  shieldMaxPercent: number;
  maxActions: number;
  fieldBonusPercent: number;
};

/** The rules with the ability families (ability_definitions): every function of the battle needs both. */
export type CombatContext = { rules: CombatRules; families: AbilityFamilies };

/** The threat the battle is fought on: the moves using its abilities gain Power. */
export type CombatField = { name: string; abilities: readonly AbilityCode[] };

export type CombatFighterInput = {
  /** Card instance id for players, definition id for the computer's fighters. */
  id: string;
  definitionId: string;
  name: string;
  stats: Record<AbilityCode, number>;
  /** The ability budget of the card's rarity (rarity_definitions.ability_budget). */
  budget: number;
  kit: CombatKit;
};

/** Each side in place order: F1, F2 (front line), then R1, R2, R3. */
export type CombatSetup = { a: readonly CombatFighterInput[]; b: readonly CombatFighterInput[]; field: CombatField | null };

export type CombatFighter = {
  /** Side and place: "a0" … "b4". */
  key: string;
  side: Side;
  position: number;
  id: string;
  definitionId: string;
  name: string;
  /** The abilities scaled to the reference budget. */
  stats: Record<AbilityCode, number>;
  maxVita: number;
  vita: number;
  shield: number;
  speed: number;
  meter: number;
  charge: number;
  /** Personal turns played, the current one included. */
  turns: number;
  /** The personal turn from which the special can be used again. */
  specialReadyAt: number;
  kit: CombatKit;
};

export type CombatResult = { winner: Side | "draw"; reason: "wiped" | "limit" };

export type CombatState = {
  fighters: CombatFighter[];
  field: CombatField | null;
  /** The side that wins speed ties, drawn at the start. */
  tieSide: Side;
  actions: number;
  /** The fighter whose turn it is; null once the battle is over. */
  current: string | null;
  result: CombatResult | null;
};

/** A choice: a move and its target (null when the move picks no one). */
export type CombatAction = { slot: CombatSlot; target: string | null };

export type CombatEvent =
  | { kind: "start"; field: string | null; tieSide: Side }
  | { kind: "turn"; actor: string; turn: number }
  | { kind: "move"; actor: string; slot: CombatSlot; move: string; target: string | null }
  | { kind: "miss"; actor: string; target: string }
  | { kind: "damage"; actor: string; target: string; amount: number; absorbed: number; critical: boolean; family: string }
  | { kind: "heal"; actor: string; target: string; amount: number }
  | { kind: "shield"; actor: string; target: string; amount: number }
  | { kind: "defeated"; target: string }
  | { kind: "end"; winner: Side | "draw"; reason: "wiped" | "limit" };

export type CombatStep = { state: CombatState; events: CombatEvent[] };

const EPSILON = 1e-9;

/** Places next to each place (F1, F2, R1, R2, R3), for moves that also hit the adjacent fighters. */
export const COMBAT_ADJACENT: readonly (readonly number[])[] = [
  [1, 2, 3],
  [0, 3, 4],
  [0, 3],
  [0, 1, 2, 4],
  [1, 3],
];

// ---------------------------------------------------------------------------------------------
// Battle values

function points(stats: Record<AbilityCode, number>, perPoint: CombatPoints): number {
  let sum = 0;
  for (const [code, value] of Object.entries(perPoint)) sum += (stats[code.toUpperCase()] ?? 0) * value;
  return sum;
}

/**
 * The abilities scaled towards the reference budget, so that rarities are equal here: all the
 * way at rarityScalePercent 100, part of it below (the rarer cards' extra points sit on their peaks,
 * which make the Power, so scaling them all the way makes the rarer cards weaker).
 */
export function combatStats(stats: Record<AbilityCode, number>, budget: number, rules: CombatRules): Record<AbilityCode, number> {
  if (!(budget > 0)) throw new Error("combat: budget must be positive");
  const k = 1 - (rules.rarityScalePercent / 100) * (1 - rules.referenceBudget / budget);
  return Object.fromEntries(Object.entries(stats).map(([code, value]) => [code, value * k]));
}

export function combatVita(stats: Record<AbilityCode, number>, rules: CombatRules): number {
  return Math.round(rules.vita.base + points(stats, rules.vita.perPoint));
}

export function combatSpeed(stats: Record<AbilityCode, number>, rules: CombatRules): number {
  return rules.speed.base + points(stats, rules.speed.perPoint);
}

/** The family a move strikes with: its own, or that of its heaviest ability (ties: ability order). */
export function combatMoveFamily(move: CombatMove, families: AbilityFamilies): string {
  if (move.family) return move.family;
  let best: AbilityCode | null = null;
  for (const code of Object.keys(families)) {
    const weight = move.scaling[code] ?? 0;
    if (weight > 0 && (best === null || weight > move.scaling[best] + EPSILON)) best = code;
  }
  if (best === null) throw new Error(`combat: move ${move.id} has no known ability`);
  return families[best];
}

/** Power of a move: base plus the weighted abilities, raised on a field that requires them. */
export function combatPower(move: CombatMove, stats: Record<AbilityCode, number>, rules: CombatRules, field: CombatField | null): number {
  let weighted = 0;
  let onField = 0;
  for (const [code, weight] of Object.entries(move.scaling)) {
    weighted += (stats[code] ?? 0) * weight;
    if (field?.abilities.includes(code)) onField += weight;
  }
  return (rules.power.base + rules.power.perPoint * weighted) * (1 + (rules.fieldBonusPercent / 100) * onField);
}

/** Defence against a family: the target's abilities of that family, times the family's factor. */
export function combatDefense(stats: Record<AbilityCode, number>, family: string, ctx: CombatContext): number {
  let sum = 0;
  for (const [code, of] of Object.entries(ctx.families)) if (of === family) sum += stats[code] ?? 0;
  return sum * (ctx.rules.familyDefense[family] ?? 0);
}

/** Chance to hit, 0 to 1. */
export function combatHitChance(attacker: Record<AbilityCode, number>, target: Record<AbilityCode, number>, rules: CombatRules): number {
  const percent = rules.hit.base + points(attacker, rules.hit.attacker) + points(target, rules.hit.defender);
  return Math.min(rules.hit.maxPercent, Math.max(rules.hit.minPercent, percent)) / 100;
}

/** Chance of a critical, 0 to 1. */
export function combatCritChance(attacker: Record<AbilityCode, number>, rules: CombatRules): number {
  return Math.min(rules.crit.maxPercent, Math.max(0, rules.crit.base + points(attacker, rules.crit.perPoint))) / 100;
}

/** Damage of one hit before rounding: Power × multiplier, reduced by the defence and the cover. */
export function combatRawDamage(power: number, multiplier: number, defense: number, covered: boolean, rules: CombatRules): number {
  const cover = covered ? rules.coverPercent / 100 : 1;
  return power * multiplier * (rules.defenseScale / (rules.defenseScale + Math.max(0, defense))) * cover;
}

/** Rounded only at the end, and never below 1. */
export function combatFinalDamage(raw: number, critical: boolean, rules: CombatRules): number {
  return Math.max(1, Math.round(raw * (critical ? rules.crit.multiplierPercent / 100 : 1)));
}

export function combatShieldCap(fighter: Pick<CombatFighter, "maxVita">, rules: CombatRules): number {
  return Math.floor((fighter.maxVita * rules.shieldMaxPercent) / 100);
}

// ---------------------------------------------------------------------------------------------
// Checks

/** What is wrong with a move (empty when it is valid). */
export function validateCombatMove(move: CombatMove, families: AbilityFamilies): string[] {
  const errors: string[] = [];
  const where = `move ${move.id || "?"}`;
  if (!move.id) errors.push("move without id");
  if (!move.name) errors.push(`${where}: no name`);
  if (!COMBAT_SLOTS.includes(move.slot)) errors.push(`${where}: unknown slot ${move.slot}`);
  if (!Number.isInteger(move.cooldown) || move.cooldown < 0) errors.push(`${where}: cooldown must be a whole number from 0`);
  if (move.slot === "special" && move.cooldown < 1) errors.push(`${where}: a special needs a cooldown`);
  if (move.slot !== "special" && move.cooldown !== 0) errors.push(`${where}: only a special has a cooldown`);
  const weights = Object.entries(move.scaling);
  if (weights.length === 0) errors.push(`${where}: no ability`);
  let sum = 0;
  for (const [code, weight] of weights) {
    if (!(code in families)) errors.push(`${where}: unknown ability ${code}`);
    if (!(weight > 0) || !Number.isFinite(weight)) errors.push(`${where}: weight of ${code} must be positive`);
    sum += weight;
  }
  if (weights.length > 0 && Math.abs(sum - 1) > 1e-6) errors.push(`${where}: weights sum to ${Number(sum.toFixed(6))}, not 1`);
  if (move.family !== undefined && !Object.values(families).includes(move.family)) errors.push(`${where}: unknown family ${move.family}`);
  if (!["melee", "ranged", "infiltration"].includes(move.range)) errors.push(`${where}: unknown range ${move.range}`);
  const offensive = move.target === "enemy" || move.target === "enemy_and_adjacent" || move.target === "all_enemies";
  if (!["enemy", "enemy_and_adjacent", "all_enemies", "self", "ally", "all_allies"].includes(move.target)) {
    errors.push(`${where}: unknown target ${move.target}`);
  }
  if (move.effects.length === 0) errors.push(`${where}: no effect`);
  for (const effect of move.effects) {
    if (!(effect.multiplier > 0) || !Number.isFinite(effect.multiplier)) errors.push(`${where}: ${effect.kind} multiplier must be positive`);
    if (effect.kind === "damage" && !offensive) errors.push(`${where}: damage needs an enemy target`);
    if (effect.kind !== "damage" && offensive) errors.push(`${where}: ${effect.kind} needs an allied target`);
    if (effect.on === "adjacent" && move.target !== "enemy_and_adjacent") errors.push(`${where}: adjacent needs enemy_and_adjacent`);
    const spread = move.target === "all_enemies" || move.target === "all_allies";
    if (effect.on === "all" && !spread) errors.push(`${where}: all needs all_enemies or all_allies`);
    if (effect.on === "primary" && spread) errors.push(`${where}: ${move.target} has no primary target`);
  }
  return errors;
}

/** What is wrong with a kit: each move valid and in its own slot. */
export function validateCombatKit(kit: CombatKit, families: AbilityFamilies): string[] {
  const errors: string[] = [];
  for (const slot of COMBAT_SLOTS) {
    const move = kit[slot];
    if (!move) {
      errors.push(`kit without ${slot}`);
      continue;
    }
    if (move.slot !== slot) errors.push(`move ${move.id} is a ${move.slot}, not a ${slot}`);
    errors.push(...validateCombatMove(move, families));
  }
  return errors;
}

/** What is wrong with the numbers (empty when they can run a battle). */
export function validateCombatRules(rules: CombatRules): string[] {
  const errors: string[] = [];
  if (rules.teamSize !== COMBAT_ADJACENT.length || rules.frontSize !== 2) errors.push("the places are fixed: 5 fighters, 2 in front");
  const positive: [string, number][] = [
    ["referenceBudget", rules.referenceBudget],
    ["vita.base", rules.vita.base],
    ["speed.base", rules.speed.base],
    ["turnMeter", rules.turnMeter],
    ["power.base", rules.power.base],
    ["power.perPoint", rules.power.perPoint],
    ["defenseScale", rules.defenseScale],
    ["charge.max", rules.charge.max],
    ["maxActions", rules.maxActions],
    ["crit.multiplierPercent", rules.crit.multiplierPercent],
  ];
  for (const [name, value] of positive) if (!(value > 0) || !Number.isFinite(value)) errors.push(`${name} must be positive`);
  const percents: [string, number][] = [
    ["rarityScalePercent", rules.rarityScalePercent],
    ["startMeterMaxPercent", rules.startMeterMaxPercent],
    ["coverPercent", rules.coverPercent],
    ["hit.minPercent", rules.hit.minPercent],
    ["hit.maxPercent", rules.hit.maxPercent],
    ["crit.maxPercent", rules.crit.maxPercent],
    ["shieldMaxPercent", rules.shieldMaxPercent],
  ];
  for (const [name, value] of percents) if (!(value >= 0 && value <= 100)) errors.push(`${name} must be a percent`);
  if (rules.hit.minPercent > rules.hit.maxPercent) errors.push("hit.minPercent above hit.maxPercent");
  if (rules.charge.start < 0 || rules.charge.start > rules.charge.max) errors.push("charge.start must be between 0 and charge.max");
  for (const [family, value] of Object.entries(rules.familyDefense)) if (!(value >= 0)) errors.push(`familyDefense.${family} must not be negative`);
  return errors;
}

// ---------------------------------------------------------------------------------------------
// The battle

function fighterOf(state: CombatState, key: string): CombatFighter {
  const fighter = state.fighters.find((f) => f.key === key);
  if (!fighter) throw new Error(`combat: no fighter ${key}`);
  return fighter;
}

function otherSide(side: Side): Side {
  return side === "a" ? "b" : "a";
}

/** The fighter whose turn it is, or null once the battle is over. */
export function combatActor(state: CombatState): CombatFighter | null {
  return state.current ? fighterOf(state, state.current) : null;
}

/** Whether the front line of a side still stands: then its second line is protected. */
export function combatFrontStands(state: CombatState, side: Side, rules: CombatRules): boolean {
  return state.fighters.some((f) => f.side === side && f.position < rules.frontSize && f.vita > 0);
}

/** Whether a move is ready for its fighter: base always, special after its cooldown, supreme with full charge. */
export function combatMoveReady(fighter: CombatFighter, slot: CombatSlot, rules: CombatRules): boolean {
  if (slot === "special") return fighter.turns >= fighter.specialReadyAt;
  if (slot === "supreme") return fighter.charge >= rules.charge.max;
  return true;
}

/** The fighters a move can pick, in place order; null when it picks no one. */
export function combatTargets(state: CombatState, actor: CombatFighter, move: CombatMove, rules: CombatRules): string[] | null {
  if (move.target === "enemy" || move.target === "enemy_and_adjacent") {
    const enemy = otherSide(actor.side);
    const protectedBack = move.range === "melee" && combatFrontStands(state, enemy, rules);
    return state.fighters
      .filter((f) => f.side === enemy && f.vita > 0 && !(protectedBack && f.position >= rules.frontSize))
      .sort((x, y) => x.position - y.position)
      .map((f) => f.key);
  }
  if (move.target === "ally") {
    return state.fighters
      .filter((f) => f.side === actor.side && f.vita > 0)
      .sort((x, y) => x.position - y.position)
      .map((f) => f.key);
  }
  return null;
}

/** Every choice the fighter whose turn it is can make. */
export function legalCombatActions(state: CombatState, rules: CombatRules): CombatAction[] {
  const actor = combatActor(state);
  if (!actor || state.result) return [];
  const actions: CombatAction[] = [];
  for (const slot of COMBAT_SLOTS) {
    if (!combatMoveReady(actor, slot, rules)) continue;
    const targets = combatTargets(state, actor, actor.kit[slot], rules);
    if (targets === null) actions.push({ slot, target: null });
    else for (const target of targets) actions.push({ slot, target });
  }
  return actions;
}

/** Moves the turn meters on to the next fighter to act (speed, then the drawn side, then the place). */
function advance(state: CombatState, rules: CombatRules, events: CombatEvent[]): void {
  const live = state.fighters.filter((f) => f.vita > 0);
  let next: CombatFighter | null = null;
  let wait = Infinity;
  for (const f of live) {
    const time = Math.max(0, (rules.turnMeter - f.meter) / f.speed);
    if (next === null || time < wait - EPSILON) {
      next = f;
      wait = time;
      continue;
    }
    if (time > wait + EPSILON) continue;
    const faster = f.speed > next.speed + EPSILON;
    const sameSpeed = Math.abs(f.speed - next.speed) <= EPSILON;
    const sideFirst = f.side === state.tieSide && next.side !== state.tieSide;
    const sameSide = f.side === next.side;
    if (faster || (sameSpeed && (sideFirst || (sameSide && f.position < next.position)))) {
      next = f;
      wait = Math.min(wait, time);
    }
  }
  if (!next) throw new Error("combat: nobody can act");
  for (const f of live) f.meter += f.speed * wait;
  next.meter -= rules.turnMeter;
  next.turns += 1;
  state.current = next.key;
  events.push({ kind: "turn", actor: next.key, turn: next.turns });
}

function cloneState(state: CombatState): CombatState {
  return { ...state, fighters: state.fighters.map((f) => ({ ...f })) };
}

/** Builds the battle: values, turn meters at a random start, the side that wins ties, the first turn. */
export function createCombat(setup: CombatSetup, ctx: CombatContext, rng: Rng): CombatStep {
  const { rules, families } = ctx;
  const ruleErrors = validateCombatRules(rules);
  if (ruleErrors.length > 0) throw new Error(`combat rules: ${ruleErrors.join("; ")}`);
  const fighters: CombatFighter[] = [];
  for (const side of ["a", "b"] as const) {
    const team = setup[side];
    if (team.length !== rules.teamSize) throw new Error(`combat: side ${side} has ${team.length} fighters, not ${rules.teamSize}`);
    if (new Set(team.map((f) => f.definitionId)).size !== team.length) throw new Error(`combat: side ${side} fields the same character twice`);
    team.forEach((input, position) => {
      const kitErrors = validateCombatKit(input.kit, families);
      if (kitErrors.length > 0) throw new Error(`combat: ${input.name}: ${kitErrors.join("; ")}`);
      const stats = combatStats(input.stats, input.budget, rules);
      const maxVita = combatVita(stats, rules);
      fighters.push({
        key: `${side}${position}`,
        side,
        position,
        id: input.id,
        definitionId: input.definitionId,
        name: input.name,
        stats,
        maxVita,
        vita: maxVita,
        shield: 0,
        speed: combatSpeed(stats, rules),
        meter: 0,
        charge: rules.charge.start,
        turns: 0,
        specialReadyAt: 0,
        kit: input.kit,
      });
    });
  }
  const tieSide: Side = rng() < 0.5 ? "a" : "b";
  for (const f of fighters) f.meter = rng() * (rules.startMeterMaxPercent / 100) * rules.turnMeter;
  const state: CombatState = { fighters, field: setup.field, tieSide, actions: 0, current: null, result: null };
  const events: CombatEvent[] = [{ kind: "start", field: setup.field?.name ?? null, tieSide }];
  advance(state, rules, events);
  return { state, events };
}

function wipedSides(state: CombatState): Side[] {
  return (["a", "b"] as const).filter((side) => state.fighters.every((f) => f.side !== side || f.vita <= 0));
}

/** After the last action: more fighters standing, then more Life left (shields aside), else a draw. */
function limitResult(state: CombatState): CombatResult {
  const standing = (side: Side) => state.fighters.filter((f) => f.side === side && f.vita > 0).length;
  const share = (side: Side) => {
    const team = state.fighters.filter((f) => f.side === side);
    return team.reduce((sum, f) => sum + Math.max(0, f.vita), 0) / team.reduce((sum, f) => sum + f.maxVita, 0);
  };
  const [a, b] = [standing("a"), standing("b")];
  if (a !== b) return { winner: a > b ? "a" : "b", reason: "limit" };
  const [shareA, shareB] = [share("a"), share("b")];
  if (shareA !== shareB) return { winner: shareA > shareB ? "a" : "b", reason: "limit" };
  return { winner: "draw", reason: "limit" };
}

/** Who an effect reaches, in place order: the chosen one, its adjacent enemies, or the whole side. */
function effectTargets(state: CombatState, actor: CombatFighter, move: CombatMove, effect: CombatEffect, primary: CombatFighter | null): CombatFighter[] {
  if (effect.on === "primary") return primary && primary.vita > 0 ? [primary] : [];
  const side = move.target === "all_allies" ? actor.side : otherSide(actor.side);
  const live = state.fighters.filter((f) => f.side === side && f.vita > 0).sort((x, y) => x.position - y.position);
  if (effect.on === "all") return live;
  if (!primary) return [];
  const near = COMBAT_ADJACENT[primary.position];
  return live.filter((f) => near.includes(f.position));
}

/**
 * Plays the choice of the fighter whose turn it is: pays the charge, resolves the effects
 * (one hit roll and one critical roll per target, in order), gives the charge, then ends the
 * battle or moves on to the next turn. Throws on a choice that is not allowed.
 */
export function applyCombatAction(previous: CombatState, action: CombatAction, ctx: CombatContext, rng: Rng): CombatStep {
  const { rules } = ctx;
  if (previous.result || !previous.current) throw new Error("combat: the battle is over");
  const allowed = legalCombatActions(previous, rules).some((a) => a.slot === action.slot && a.target === action.target);
  if (!allowed) throw new Error(`combat: ${action.slot} on ${action.target ?? "nobody"} is not allowed now`);
  const state = cloneState(previous);
  const actor = fighterOf(state, state.current!);
  const move = actor.kit[action.slot];
  const events: CombatEvent[] = [{ kind: "move", actor: actor.key, slot: action.slot, move: move.id, target: action.target }];

  if (action.slot === "supreme") actor.charge -= rules.charge.max;
  if (action.slot === "special") actor.specialReadyAt = actor.turns + move.cooldown;

  const primary = move.target === "self" ? actor : action.target ? fighterOf(state, action.target) : null;
  const family = combatMoveFamily(move, ctx.families);
  const power = combatPower(move, actor.stats, rules, state.field);
  const protectedSide = { a: combatFrontStands(state, "a", rules), b: combatFrontStands(state, "b", rules) };

  for (const effect of move.effects) {
    for (const target of effectTargets(state, actor, move, effect, primary)) {
      if (effect.kind === "damage") {
        if (rng() >= combatHitChance(actor.stats, target.stats, rules)) {
          events.push({ kind: "miss", actor: actor.key, target: target.key });
          continue;
        }
        const critical = rng() < combatCritChance(actor.stats, rules);
        const covered = move.range !== "infiltration" && protectedSide[target.side] && target.position >= rules.frontSize;
        const raw = combatRawDamage(power, effect.multiplier, combatDefense(target.stats, family, ctx), covered, rules);
        const amount = combatFinalDamage(raw, critical, rules);
        const absorbed = Math.min(target.shield, amount);
        target.shield -= absorbed;
        target.vita = Math.max(0, target.vita - (amount - absorbed));
        events.push({ kind: "damage", actor: actor.key, target: target.key, amount, absorbed, critical, family });
        if (target.vita === 0) {
          target.shield = 0;
          events.push({ kind: "defeated", target: target.key });
        }
      } else if (effect.kind === "heal") {
        const amount = Math.min(target.maxVita - target.vita, Math.round(power * effect.multiplier));
        target.vita += amount;
        events.push({ kind: "heal", actor: actor.key, target: target.key, amount });
      } else {
        const amount = Math.min(combatShieldCap(target, rules) - target.shield, Math.round(power * effect.multiplier));
        target.shield += Math.max(0, amount);
        events.push({ kind: "shield", actor: actor.key, target: target.key, amount: Math.max(0, amount) });
      }
    }
  }

  if (action.slot === "base") actor.charge = Math.min(rules.charge.max, actor.charge + rules.charge.base);
  if (action.slot === "special") actor.charge = Math.min(rules.charge.max, actor.charge + rules.charge.special);
  state.actions += 1;

  const wiped = wipedSides(state);
  if (wiped.length > 0) state.result = { winner: wiped.length === 2 ? "draw" : otherSide(wiped[0]), reason: "wiped" };
  else if (state.actions >= rules.maxActions) state.result = limitResult(state);
  if (state.result) {
    state.current = null;
    events.push({ kind: "end", winner: state.result.winner, reason: state.result.reason });
  } else {
    advance(state, rules, events);
  }
  return { state, events };
}
