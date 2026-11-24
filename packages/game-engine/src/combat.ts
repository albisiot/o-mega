// Scontro a squadre (SPEC §5.19, docs/COMBAT.md): five fighters against five on two lines.
// A fighter acts when its turn meter, filled at its Speed, reaches the top, and uses one of
// its moves (plain data, checked by validateCombatMove) on the targets the lines allow. Moves
// deal damage, heal, shield and put statuses; each fighter may have a passive that answers a
// trigger or changes its numbers. The battle values come from the card's 12 abilities, which
// never change. Pure and deterministic: all randomness comes from the injected Rng, so a seed
// and the same choices always give the same log.

import type { Rng } from "./rng.ts";
import type { AbilityCode, AbilityFamilies, Side } from "./types.ts";

export type CombatSlot = "base" | "special" | "supreme";
export const COMBAT_SLOTS: readonly CombatSlot[] = ["base", "special", "supreme"];

/** Melee cannot pick a protected second line; ranged hits it at the cover; infiltration in full. */
export type CombatRange = "melee" | "ranged" | "infiltration";

export type CombatTarget = "enemy" | "enemy_and_adjacent" | "all_enemies" | "self" | "ally" | "all_allies";

/**
 * The statuses (stage 2). Buffs go on allies: more damage, more defence, more Speed, the enemies'
 * single-target moves forced on it. Debuffs go on enemies: less damage, less defence, the next
 * turn lost, a share of the Life lost at the start of each turn (through the shield).
 */
export const COMBAT_BUFFS = ["empower", "fortify", "haste", "taunt"] as const;
export const COMBAT_DEBUFFS = ["weaken", "vulnerable", "stun", "burn"] as const;
export type CombatBuff = (typeof COMBAT_BUFFS)[number];
export type CombatDebuff = (typeof COMBAT_DEBUFFS)[number];
export type CombatStatusCode = CombatBuff | CombatDebuff;
export const COMBAT_STATUSES: readonly CombatStatusCode[] = [...COMBAT_BUFFS, ...COMBAT_DEBUFFS];

export function isCombatDebuff(code: CombatStatusCode): code is CombatDebuff {
  return (COMBAT_DEBUFFS as readonly string[]).includes(code);
}

/**
 * The chance to put a debuff, in percent: base, plus effectChance.perPoint × (the user's ability −
 * the target's mean in that ability's family), within the limits. Without it the debuff is sure.
 */
export type CombatChance = { base: number; ability: AbilityCode };

/** What a move does, in order. `on`: the chosen target, its adjacent enemies, everyone the move reaches, or its user. */
export type CombatEffect =
  | { kind: "damage"; multiplier: number; on: "primary" | "adjacent" | "all" }
  | { kind: "heal"; multiplier: number; on: "primary" | "all" | "self" }
  | { kind: "shield"; multiplier: number; on: "primary" | "all" | "self" }
  | { kind: "status"; status: CombatStatusCode; turns: number; on: "primary" | "adjacent" | "all" | "self"; chance?: CombatChance };

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

/**
 * When a passive acts: at the start of the battle; at the start of each of its turns; after its
 * move hits an enemy; after an enemy's move hurts it; when it knocks out an enemy; when an ally
 * falls; the first time its Life drops to thresholdPercent or less.
 */
export const COMBAT_TRIGGERS = ["battle_start", "turn_start", "hit", "hurt", "knockout", "ally_down", "low_vita"] as const;
export type CombatTrigger = (typeof COMBAT_TRIGGERS)[number];

/** Who a passive's effect reaches: its owner, its side, the other side, or the fighter of the trigger (the one hit, or the attacker). */
export type CombatPassiveTarget = "self" | "allies" | "enemies" | "other";

export type CombatPassiveEffect =
  | { kind: "status"; status: CombatStatusCode; turns: number; to: CombatPassiveTarget; chance?: CombatChance }
  | { kind: "shield" | "heal"; multiplier: number; to: CombatPassiveTarget }
  | { kind: "damage"; multiplier: number; to: "enemies" | "other" }
  | { kind: "charge"; amount: number; to: "self" | "allies" };

/** Always on while the fighter stands: percent points added to its numbers. */
export type CombatModifiers = {
  damagePercent?: number;
  critPercent?: number;
  hitPercent?: number;
  healPercent?: number;
  speedPercent?: number;
  effectChancePercent?: number;
  /** More damage on targets that have this status. */
  damageVsStatus?: { status: CombatStatusCode; percent: number };
};

/** A fighter's passive: an answer to a trigger, its always-on modifiers, or both. Its effects never trigger passives. */
export type CombatPassive = {
  id: string;
  name: string;
  /** Power of its shields, healing and damage, as a move's; may be empty when it has none of them. */
  scaling: Record<AbilityCode, number>;
  family?: string;
  trigger: CombatTrigger | null;
  /** For low_vita: the share of Life, in percent. */
  thresholdPercent?: number;
  /** Activations per battle at most; 0 = no limit. */
  limit: number;
  effects: CombatPassiveEffect[];
  modifiers: CombatModifiers;
};

export type CombatKit = { base: CombatMove; special: CombatMove; supreme: CombatMove; passive?: CombatPassive | null };

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
  /** What each status does, in percent, and the longest a status may last (personal turns). */
  statuses: {
    empowerPercent: number;
    fortifyPercent: number;
    hastePercent: number;
    weakenPercent: number;
    vulnerablePercent: number;
    burnPercent: number;
    maxTurns: number;
  };
  effectChance: { perPoint: number; minPercent: number; maxPercent: number };
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

/** A status on a fighter: personal turns left; `fresh` when put during its own turn (that turn does not count). */
export type CombatStatus = { code: CombatStatusCode; turns: number; fresh: boolean };

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
  statuses: CombatStatus[];
  /** No stun lands while its personal turns are below this: after a lost turn it plays the next one. */
  stunImmuneUntil: number;
  kit: CombatKit;
  passiveUses: number;
  lowVitaDone: boolean;
};

export type CombatResult = { winner: Side | "draw"; reason: "wiped" | "limit" };

export type CombatState = {
  fighters: CombatFighter[];
  field: CombatField | null;
  /** The side that wins speed ties, drawn at the start. */
  tieSide: Side;
  /** Turns played, lost ones included: the battle ends at maxActions. */
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
  | { kind: "status"; actor: string; target: string; status: CombatStatusCode; turns: number }
  | { kind: "resisted"; actor: string; target: string; status: CombatStatusCode; immune: boolean }
  | { kind: "expired"; target: string; status: CombatStatusCode }
  | { kind: "burn"; target: string; amount: number }
  | { kind: "stunned"; actor: string }
  | { kind: "passive"; actor: string; passive: string; trigger: CombatTrigger }
  | { kind: "charge"; target: string; amount: number }
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

/** Anything with a Power: a move or a passive. */
type Scaled = { id?: string; scaling: Record<AbilityCode, number>; family?: string };

/** The family a move (or passive) strikes with: its own, or that of its heaviest ability (ties: ability order). */
export function combatMoveFamily(move: Scaled, families: AbilityFamilies): string {
  if (move.family) return move.family;
  let best: AbilityCode | null = null;
  for (const code of Object.keys(families)) {
    const weight = move.scaling[code] ?? 0;
    if (weight > 0 && (best === null || weight > move.scaling[best] + EPSILON)) best = code;
  }
  if (best === null) throw new Error(`combat: ${move.id ?? "a passive"} has no known ability`);
  return families[best];
}

/** Power of a move (or passive): base plus the weighted abilities, raised on a field that requires them. */
export function combatPower(move: Scaled, stats: Record<AbilityCode, number>, rules: CombatRules, field: CombatField | null): number {
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

/** Chance to hit, 0 to 1; bonusPercent (a passive's) counts before the limits. */
export function combatHitChance(attacker: Record<AbilityCode, number>, target: Record<AbilityCode, number>, rules: CombatRules, bonusPercent = 0): number {
  const percent = rules.hit.base + points(attacker, rules.hit.attacker) + points(target, rules.hit.defender) + bonusPercent;
  return Math.min(rules.hit.maxPercent, Math.max(rules.hit.minPercent, percent)) / 100;
}

/** Chance of a critical, 0 to 1. */
export function combatCritChance(attacker: Record<AbilityCode, number>, rules: CombatRules, bonusPercent = 0): number {
  return Math.min(rules.crit.maxPercent, Math.max(0, rules.crit.base + points(attacker, rules.crit.perPoint) + bonusPercent)) / 100;
}

/** Chance to put a debuff, 0 to 1 (see CombatChance). */
export function combatEffectChance(user: Record<AbilityCode, number>, target: Record<AbilityCode, number>, chance: CombatChance, ctx: CombatContext, bonusPercent = 0): number {
  const family = ctx.families[chance.ability];
  const codes = Object.keys(ctx.families).filter((code) => ctx.families[code] === family);
  const mean = codes.reduce((sum, code) => sum + (target[code] ?? 0), 0) / Math.max(1, codes.length);
  const percent = chance.base + ctx.rules.effectChance.perPoint * ((user[chance.ability] ?? 0) - mean) + bonusPercent;
  return Math.min(ctx.rules.effectChance.maxPercent, Math.max(ctx.rules.effectChance.minPercent, percent)) / 100;
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

// --- What statuses and passives change ------------------------------------------------------

export function combatHasStatus(fighter: Pick<CombatFighter, "statuses">, code: CombatStatusCode): boolean {
  return fighter.statuses.some((s) => s.code === code);
}

export function combatModifiers(fighter: Pick<CombatFighter, "kit">): CombatModifiers {
  return fighter.kit.passive?.modifiers ?? {};
}

/** Speed with haste and the passive. */
export function combatEffectiveSpeed(fighter: CombatFighter, rules: CombatRules): number {
  const haste = combatHasStatus(fighter, "haste") ? rules.statuses.hastePercent : 0;
  return fighter.speed * (1 + (haste + (combatModifiers(fighter).speedPercent ?? 0)) / 100);
}

/** What the attacker's damage is multiplied by on this target: empower, weaken, its passive. */
export function combatDamageFactor(attacker: CombatFighter, target: CombatFighter, rules: CombatRules): number {
  const mods = combatModifiers(attacker);
  let percent = mods.damagePercent ?? 0;
  if (combatHasStatus(attacker, "empower")) percent += rules.statuses.empowerPercent;
  if (combatHasStatus(attacker, "weaken")) percent -= rules.statuses.weakenPercent;
  if (mods.damageVsStatus && combatHasStatus(target, mods.damageVsStatus.status)) percent += mods.damageVsStatus.percent;
  return Math.max(0, 1 + percent / 100);
}

/** What the target's defence is multiplied by: fortify, vulnerable. */
export function combatDefenseFactor(target: CombatFighter, rules: CombatRules): number {
  let percent = 0;
  if (combatHasStatus(target, "fortify")) percent += rules.statuses.fortifyPercent;
  if (combatHasStatus(target, "vulnerable")) percent -= rules.statuses.vulnerablePercent;
  return Math.max(0, 1 + percent / 100);
}

/** One hit's damage before the critical, with every number of both fighters. */
export function combatHitDamage(attacker: CombatFighter, target: CombatFighter, power: number, multiplier: number, family: string, covered: boolean, ctx: CombatContext): number {
  const defense = combatDefense(target.stats, family, ctx) * combatDefenseFactor(target, ctx.rules);
  return combatRawDamage(power, multiplier, defense, covered, ctx.rules) * combatDamageFactor(attacker, target, ctx.rules);
}

export function combatFighterHitChance(attacker: CombatFighter, target: CombatFighter, rules: CombatRules): number {
  return combatHitChance(attacker.stats, target.stats, rules, combatModifiers(attacker).hitPercent ?? 0);
}

export function combatFighterCritChance(attacker: CombatFighter, rules: CombatRules): number {
  return combatCritChance(attacker.stats, rules, combatModifiers(attacker).critPercent ?? 0);
}

// ---------------------------------------------------------------------------------------------
// Checks

function checkScaling(where: string, scaling: Record<AbilityCode, number>, families: AbilityFamilies, errors: string[]): void {
  const weights = Object.entries(scaling);
  if (weights.length === 0) errors.push(`${where}: no ability`);
  let sum = 0;
  for (const [code, weight] of weights) {
    if (!(code in families)) errors.push(`${where}: unknown ability ${code}`);
    if (!(weight > 0) || !Number.isFinite(weight)) errors.push(`${where}: weight of ${code} must be positive`);
    sum += weight;
  }
  if (weights.length > 0 && Math.abs(sum - 1) > 1e-6) errors.push(`${where}: weights sum to ${Number(sum.toFixed(6))}, not 1`);
}

function checkStatus(where: string, status: CombatStatusCode, turns: number, chance: CombatChance | undefined, families: AbilityFamilies, rules: CombatRules | undefined, errors: string[]): void {
  if (!COMBAT_STATUSES.includes(status)) errors.push(`${where}: unknown status ${status}`);
  if (!Number.isInteger(turns) || turns < 1) errors.push(`${where}: ${status} must last a whole number of turns from 1`);
  if (rules && turns > rules.statuses.maxTurns) errors.push(`${where}: ${status} lasts more than ${rules.statuses.maxTurns} turns`);
  if (chance) {
    if (!isCombatDebuff(status)) errors.push(`${where}: only a debuff has a chance`);
    if (!(chance.ability in families)) errors.push(`${where}: unknown ability ${chance.ability}`);
    if (!Number.isFinite(chance.base)) errors.push(`${where}: chance base must be a number`);
  }
}

/** What is wrong with a move (empty when it is valid). With the rules it also checks how long its statuses last. */
export function validateCombatMove(move: CombatMove, families: AbilityFamilies, rules?: CombatRules): string[] {
  const errors: string[] = [];
  const where = `move ${move.id || "?"}`;
  if (!move.id) errors.push("move without id");
  if (!move.name) errors.push(`${where}: no name`);
  if (!COMBAT_SLOTS.includes(move.slot)) errors.push(`${where}: unknown slot ${move.slot}`);
  if (!Number.isInteger(move.cooldown) || move.cooldown < 0) errors.push(`${where}: cooldown must be a whole number from 0`);
  if (move.slot === "special" && move.cooldown < 1) errors.push(`${where}: a special needs a cooldown`);
  if (move.slot !== "special" && move.cooldown !== 0) errors.push(`${where}: only a special has a cooldown`);
  checkScaling(where, move.scaling, families, errors);
  if (move.family !== undefined && !Object.values(families).includes(move.family)) errors.push(`${where}: unknown family ${move.family}`);
  if (!["melee", "ranged", "infiltration"].includes(move.range)) errors.push(`${where}: unknown range ${move.range}`);
  const offensive = move.target === "enemy" || move.target === "enemy_and_adjacent" || move.target === "all_enemies";
  const spread = move.target === "all_enemies" || move.target === "all_allies";
  if (!["enemy", "enemy_and_adjacent", "all_enemies", "self", "ally", "all_allies"].includes(move.target)) {
    errors.push(`${where}: unknown target ${move.target}`);
  }
  if (move.effects.length === 0) errors.push(`${where}: no effect`);
  for (const effect of move.effects) {
    if (effect.kind !== "status" && (!(effect.multiplier > 0) || !Number.isFinite(effect.multiplier))) {
      errors.push(`${where}: ${effect.kind} multiplier must be positive`);
    }
    // What reaches the enemies, and what must reach allies.
    const onEnemies = effect.on !== "self" && offensive;
    if (effect.kind === "damage" && !offensive) errors.push(`${where}: damage needs an enemy target`);
    if ((effect.kind === "heal" || effect.kind === "shield") && onEnemies) errors.push(`${where}: ${effect.kind} needs an allied target`);
    if (effect.kind === "status") {
      checkStatus(where, effect.status, effect.turns, effect.chance, families, rules, errors);
      if (isCombatDebuff(effect.status) && !onEnemies) errors.push(`${where}: ${effect.status} needs an enemy target`);
      if (!isCombatDebuff(effect.status) && onEnemies) errors.push(`${where}: ${effect.status} needs an allied target`);
    }
    if (effect.on === "adjacent" && move.target !== "enemy_and_adjacent") errors.push(`${where}: adjacent needs enemy_and_adjacent`);
    if (effect.on === "all" && !spread) errors.push(`${where}: all needs all_enemies or all_allies`);
    if (effect.on === "primary" && spread) errors.push(`${where}: ${move.target} has no primary target`);
  }
  return errors;
}

/** What is wrong with a passive (empty when it is valid). */
export function validateCombatPassive(passive: CombatPassive, families: AbilityFamilies, rules?: CombatRules): string[] {
  const errors: string[] = [];
  const where = `passive ${passive.id || "?"}`;
  if (!passive.id) errors.push("passive without id");
  if (!passive.name) errors.push(`${where}: no name`);
  if (passive.trigger !== null && !COMBAT_TRIGGERS.includes(passive.trigger)) errors.push(`${where}: unknown trigger ${passive.trigger}`);
  if (passive.trigger === null && passive.effects.length > 0) errors.push(`${where}: effects need a trigger`);
  if (passive.trigger !== null && passive.effects.length === 0) errors.push(`${where}: a trigger needs effects`);
  const low = passive.trigger === "low_vita";
  const threshold = passive.thresholdPercent;
  if (low && !(threshold !== undefined && threshold > 0 && threshold < 100)) errors.push(`${where}: low_vita needs a threshold between 0 and 100`);
  if (!low && threshold !== undefined) errors.push(`${where}: only low_vita has a threshold`);
  if (!Number.isInteger(passive.limit) || passive.limit < 0) errors.push(`${where}: limit must be a whole number from 0`);
  const powered = passive.effects.some((e) => e.kind === "shield" || e.kind === "heal" || e.kind === "damage");
  if (powered || Object.keys(passive.scaling).length > 0) checkScaling(where, passive.scaling, families, errors);
  if (passive.family !== undefined && !Object.values(families).includes(passive.family)) errors.push(`${where}: unknown family ${passive.family}`);
  const withOther = passive.trigger === "hit" || passive.trigger === "hurt";
  for (const effect of passive.effects) {
    if (effect.to === "other" && !withOther) errors.push(`${where}: other needs the hit or hurt trigger`);
    // The fighter of a hit or hurt trigger is always an enemy.
    const onEnemies = effect.to === "enemies" || effect.to === "other";
    if (effect.kind === "status") {
      checkStatus(where, effect.status, effect.turns, effect.chance, families, rules, errors);
      if (isCombatDebuff(effect.status) && !onEnemies) errors.push(`${where}: ${effect.status} needs enemies`);
      if (!isCombatDebuff(effect.status) && onEnemies) errors.push(`${where}: ${effect.status} needs allies`);
    } else if (effect.kind === "charge") {
      if (!Number.isInteger(effect.amount) || effect.amount < 1) errors.push(`${where}: charge must be a whole number from 1`);
    } else {
      if (!(effect.multiplier > 0) || !Number.isFinite(effect.multiplier)) errors.push(`${where}: ${effect.kind} multiplier must be positive`);
      if (effect.kind === "damage" && !onEnemies) errors.push(`${where}: damage needs enemies`);
      if (effect.kind !== "damage" && onEnemies) errors.push(`${where}: ${effect.kind} needs allies`);
    }
  }
  const mods = passive.modifiers;
  for (const [name, value] of Object.entries(mods)) {
    if (name === "damageVsStatus") continue;
    if (!Number.isFinite(value)) errors.push(`${where}: ${name} must be a number`);
  }
  if (mods.damageVsStatus && (!COMBAT_STATUSES.includes(mods.damageVsStatus.status) || !Number.isFinite(mods.damageVsStatus.percent))) {
    errors.push(`${where}: damageVsStatus needs a known status and a number`);
  }
  if (passive.trigger === null && Object.keys(mods).length === 0) errors.push(`${where}: does nothing`);
  return errors;
}

/** What is wrong with a kit: each move valid and in its own slot, and its passive if any. */
export function validateCombatKit(kit: CombatKit, families: AbilityFamilies, rules?: CombatRules): string[] {
  const errors: string[] = [];
  for (const slot of COMBAT_SLOTS) {
    const move = kit[slot];
    if (!move) {
      errors.push(`kit without ${slot}`);
      continue;
    }
    if (move.slot !== slot) errors.push(`move ${move.id} is a ${move.slot}, not a ${slot}`);
    errors.push(...validateCombatMove(move, families, rules));
  }
  if (kit.passive) errors.push(...validateCombatPassive(kit.passive, families, rules));
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
    ["statuses.maxTurns", rules.statuses.maxTurns],
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
    ["statuses.empowerPercent", rules.statuses.empowerPercent],
    ["statuses.fortifyPercent", rules.statuses.fortifyPercent],
    ["statuses.hastePercent", rules.statuses.hastePercent],
    ["statuses.weakenPercent", rules.statuses.weakenPercent],
    ["statuses.vulnerablePercent", rules.statuses.vulnerablePercent],
    ["statuses.burnPercent", rules.statuses.burnPercent],
    ["effectChance.minPercent", rules.effectChance.minPercent],
    ["effectChance.maxPercent", rules.effectChance.maxPercent],
  ];
  for (const [name, value] of percents) if (!(value >= 0 && value <= 100)) errors.push(`${name} must be a percent`);
  if (rules.hit.minPercent > rules.hit.maxPercent) errors.push("hit.minPercent above hit.maxPercent");
  if (rules.effectChance.minPercent > rules.effectChance.maxPercent) errors.push("effectChance.minPercent above effectChance.maxPercent");
  if (!Number.isInteger(rules.statuses.maxTurns)) errors.push("statuses.maxTurns must be a whole number");
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

function sideOf(state: CombatState, side: Side): CombatFighter[] {
  return state.fighters.filter((f) => f.side === side && f.vita > 0).sort((x, y) => x.position - y.position);
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

/**
 * The fighters a move can pick, in place order; null when it picks no one. An enemy with taunt
 * that the move can reach must be picked.
 */
export function combatTargets(state: CombatState, actor: CombatFighter, move: CombatMove, rules: CombatRules): string[] | null {
  if (move.target === "enemy" || move.target === "enemy_and_adjacent") {
    const enemy = otherSide(actor.side);
    const protectedBack = move.range === "melee" && combatFrontStands(state, enemy, rules);
    const reachable = sideOf(state, enemy).filter((f) => !(protectedBack && f.position >= rules.frontSize));
    const taunting = reachable.filter((f) => combatHasStatus(f, "taunt"));
    return (taunting.length > 0 ? taunting : reachable).map((f) => f.key);
  }
  if (move.target === "ally") return sideOf(state, actor.side).map((f) => f.key);
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
function advance(state: CombatState, rules: CombatRules, events: CombatEvent[]): CombatFighter {
  const live = state.fighters.filter((f) => f.vita > 0);
  const speedOf = new Map(live.map((f) => [f.key, combatEffectiveSpeed(f, rules)]));
  let next: CombatFighter | null = null;
  let wait = Infinity;
  for (const f of live) {
    const speed = speedOf.get(f.key)!;
    const time = Math.max(0, (rules.turnMeter - f.meter) / speed);
    if (next === null || time < wait - EPSILON) {
      next = f;
      wait = time;
      continue;
    }
    if (time > wait + EPSILON) continue;
    const nextSpeed = speedOf.get(next.key)!;
    const faster = speed > nextSpeed + EPSILON;
    const sameSpeed = Math.abs(speed - nextSpeed) <= EPSILON;
    const sideFirst = f.side === state.tieSide && next.side !== state.tieSide;
    const sameSide = f.side === next.side;
    if (faster || (sameSpeed && (sideFirst || (sameSide && f.position < next.position)))) {
      next = f;
      wait = Math.min(wait, time);
    }
  }
  if (!next) throw new Error("combat: nobody can act");
  for (const f of live) f.meter += speedOf.get(f.key)! * wait;
  next.meter -= rules.turnMeter;
  next.turns += 1;
  state.current = next.key;
  events.push({ kind: "turn", actor: next.key, turn: next.turns });
  return next;
}

/**
 * Who acts next, in order, for the next `count` turns from now (after the fighter whose turn it
 * is), at today's speeds: a preview for the screen. Statuses that end or come meanwhile, stuns
 * and knockouts can change it; the state is not touched.
 */
export function combatUpcoming(state: CombatState, rules: CombatRules, count: number): string[] {
  const live = state.fighters.filter((f) => f.vita > 0);
  if (live.length === 0 || state.result) return [];
  const sim = { ...state, fighters: live.map((f) => ({ ...f, statuses: f.statuses.map((s) => ({ ...s })) })) };
  const order: string[] = [];
  for (let i = 0; i < count; i += 1) order.push(advance(sim, rules, []).key);
  return order;
}

function cloneState(state: CombatState): CombatState {
  return { ...state, fighters: state.fighters.map((f) => ({ ...f, statuses: f.statuses.map((s) => ({ ...s })) })) };
}

/** A trigger waiting for its passive: who, which, and the fighter it is about (the one hit, the attacker). */
type Pending = { key: string; trigger: CombatTrigger; other: string | null };

/** What a resolution needs at hand. */
type Run = { state: CombatState; ctx: CombatContext; rng: Rng; events: CombatEvent[] };

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

/** Ends the battle when a side has fallen or the actions are over; true when it did. */
function settle(run: Run): boolean {
  const { state, events } = run;
  if (state.result) return true;
  const wiped = wipedSides(state);
  if (wiped.length > 0) state.result = { winner: wiped.length === 2 ? "draw" : otherSide(wiped[0]), reason: "wiped" };
  else if (state.actions >= run.ctx.rules.maxActions) state.result = limitResult(state);
  if (!state.result) return false;
  state.current = null;
  events.push({ kind: "end", winner: state.result.winner, reason: state.result.reason });
  return true;
}

/** A fighter falls: no shield, no status; its allies' ally_down and, from a move, the knockout of who did it. */
function knockOut(run: Run, target: CombatFighter, by: CombatFighter | null, pending: Pending[] | null): void {
  target.vita = 0;
  target.shield = 0;
  target.statuses = [];
  run.events.push({ kind: "defeated", target: target.key });
  if (!pending) return;
  for (const ally of sideOf(run.state, target.side)) pending.push({ key: ally.key, trigger: "ally_down", other: target.key });
  if (by && by.side !== target.side && by.vita > 0) pending.push({ key: by.key, trigger: "knockout", other: target.key });
}

function checkLowVita(fighter: CombatFighter, pending: Pending[] | null): void {
  const passive = fighter.kit.passive;
  if (!pending || !passive || passive.trigger !== "low_vita" || fighter.lowVitaDone || fighter.vita <= 0) return;
  if (fighter.vita <= (fighter.maxVita * (passive.thresholdPercent ?? 0)) / 100) {
    fighter.lowVitaDone = true;
    pending.push({ key: fighter.key, trigger: "low_vita", other: null });
  }
}

/**
 * One hit: the hit roll, the critical roll, the shield first, then the Life. Returns whether it
 * landed. `pending` collects the triggers (null for a passive's damage, which triggers nothing).
 */
function strike(run: Run, attacker: CombatFighter, target: CombatFighter, power: number, multiplier: number, family: string, covered: boolean, pending: Pending[] | null): boolean {
  const { rules } = run.ctx;
  if (run.rng() >= combatFighterHitChance(attacker, target, rules)) {
    run.events.push({ kind: "miss", actor: attacker.key, target: target.key });
    return false;
  }
  const critical = run.rng() < combatFighterCritChance(attacker, rules);
  const amount = combatFinalDamage(combatHitDamage(attacker, target, power, multiplier, family, covered, run.ctx), critical, rules);
  const absorbed = Math.min(target.shield, amount);
  target.shield -= absorbed;
  target.vita = Math.max(0, target.vita - (amount - absorbed));
  run.events.push({ kind: "damage", actor: attacker.key, target: target.key, amount, absorbed, critical, family });
  if (target.vita === 0) knockOut(run, target, attacker, pending);
  else checkLowVita(target, pending);
  return true;
}

/** Puts a status, after the chance and the stun immunity; the same status is renewed, never stacked. */
function putStatus(run: Run, user: CombatFighter, target: CombatFighter, status: CombatStatusCode, turns: number, chance: CombatChance | undefined): void {
  const { rules } = run.ctx;
  if (target.vita <= 0) return;
  if (status === "stun" && target.turns < target.stunImmuneUntil) {
    run.events.push({ kind: "resisted", actor: user.key, target: target.key, status, immune: true });
    return;
  }
  if (isCombatDebuff(status) && chance) {
    const bonus = combatModifiers(user).effectChancePercent ?? 0;
    if (run.rng() >= combatEffectChance(user.stats, target.stats, chance, run.ctx, bonus)) {
      run.events.push({ kind: "resisted", actor: user.key, target: target.key, status, immune: false });
      return;
    }
  }
  const length = Math.min(turns, rules.statuses.maxTurns);
  const fresh = target.key === run.state.current;
  const existing = target.statuses.find((s) => s.code === status);
  if (existing) {
    existing.turns = Math.max(existing.turns, length);
    existing.fresh = existing.fresh || fresh;
  } else {
    target.statuses.push({ code: status, turns: length, fresh });
  }
  run.events.push({ kind: "status", actor: user.key, target: target.key, status, turns: length });
}

function heal(run: Run, user: CombatFighter, target: CombatFighter, power: number, multiplier: number): void {
  if (target.vita <= 0) return;
  const bonus = 1 + (combatModifiers(user).healPercent ?? 0) / 100;
  const amount = Math.min(target.maxVita - target.vita, Math.round(power * multiplier * bonus));
  target.vita += amount;
  run.events.push({ kind: "heal", actor: user.key, target: target.key, amount });
}

function shield(run: Run, user: CombatFighter, target: CombatFighter, power: number, multiplier: number): void {
  if (target.vita <= 0) return;
  const amount = Math.max(0, Math.min(combatShieldCap(target, run.ctx.rules) - target.shield, Math.round(power * multiplier)));
  target.shield += amount;
  run.events.push({ kind: "shield", actor: user.key, target: target.key, amount });
}

/** The passives the triggers call, in the order they came; their effects call none. */
function firePassives(run: Run, pending: Pending[]): void {
  const { state, ctx } = run;
  for (const { key, trigger, other } of pending) {
    const owner = fighterOf(state, key);
    const passive = owner.kit.passive;
    if (!passive || passive.trigger !== trigger || owner.vita <= 0) continue;
    if (passive.limit > 0 && owner.passiveUses >= passive.limit) continue;
    owner.passiveUses += 1;
    run.events.push({ kind: "passive", actor: owner.key, passive: passive.id, trigger });
    const power = Object.keys(passive.scaling).length > 0 ? combatPower(passive, owner.stats, ctx.rules, state.field) : 0;
    const enemy = otherSide(owner.side);
    for (const effect of passive.effects) {
      const otherFighter = other ? fighterOf(state, other) : null;
      const reached =
        effect.to === "self" ? [owner] : effect.to === "allies" ? sideOf(state, owner.side) : effect.to === "enemies" ? sideOf(state, enemy) : otherFighter && otherFighter.vita > 0 ? [otherFighter] : [];
      for (const target of reached) {
        if (effect.kind === "status") putStatus(run, owner, target, effect.status, effect.turns, effect.chance);
        else if (effect.kind === "heal") heal(run, owner, target, power, effect.multiplier);
        else if (effect.kind === "shield") shield(run, owner, target, power, effect.multiplier);
        else if (effect.kind === "charge") {
          const before = target.charge;
          target.charge = Math.min(ctx.rules.charge.max, target.charge + effect.amount);
          run.events.push({ kind: "charge", target: target.key, amount: target.charge - before });
        } else if (target.vita > 0) {
          const covered = combatFrontStands(state, target.side, ctx.rules) && target.position >= ctx.rules.frontSize;
          strike(run, owner, target, power, effect.multiplier, combatMoveFamily(passive, ctx.families), covered, null);
        }
      }
    }
  }
}

/** The end of a fighter's turn: its statuses lose a turn, except those put during it. */
function endTurn(run: Run, fighter: CombatFighter): void {
  for (const status of fighter.statuses) {
    if (status.fresh) status.fresh = false;
    else status.turns -= 1;
  }
  for (const status of fighter.statuses.filter((s) => s.turns <= 0)) run.events.push({ kind: "expired", target: fighter.key, status: status.code });
  fighter.statuses = fighter.statuses.filter((s) => s.turns > 0);
}

/**
 * Gives the turn to the next fighter that can act: a burn bites at the start of its turn (through
 * the shield, and it may fall), its turn_start passive acts, and a stunned fighter loses the turn
 * (it counts as an action) and plays at least the next one.
 */
function nextTurn(run: Run): void {
  const { state, ctx, events } = run;
  while (!settle(run)) {
    const actor = advance(state, ctx.rules, events);
    const pending: Pending[] = [];
    if (combatHasStatus(actor, "burn")) {
      const amount = Math.max(1, Math.round((actor.maxVita * ctx.rules.statuses.burnPercent) / 100));
      actor.vita = Math.max(0, actor.vita - amount);
      events.push({ kind: "burn", target: actor.key, amount });
      if (actor.vita === 0) knockOut(run, actor, null, pending);
      else checkLowVita(actor, pending);
    }
    if (actor.vita > 0) pending.push({ key: actor.key, trigger: "turn_start", other: null });
    firePassives(run, pending);
    if (settle(run)) return;
    if (actor.vita <= 0) continue;
    if (combatHasStatus(actor, "stun")) {
      events.push({ kind: "stunned", actor: actor.key });
      actor.stunImmuneUntil = actor.turns + 1;
      endTurn(run, actor);
      state.actions += 1;
      continue;
    }
    return;
  }
}

/** Builds the battle: values, turn meters at a random start, the side that wins ties, the battle_start passives, the first turn. */
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
      const kitErrors = validateCombatKit(input.kit, families, rules);
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
        statuses: [],
        stunImmuneUntil: 0,
        kit: input.kit,
        passiveUses: 0,
        lowVitaDone: false,
      });
    });
  }
  const tieSide: Side = rng() < 0.5 ? "a" : "b";
  for (const f of fighters) f.meter = rng() * (rules.startMeterMaxPercent / 100) * rules.turnMeter;
  const state: CombatState = { fighters, field: setup.field, tieSide, actions: 0, current: null, result: null };
  const run: Run = { state, ctx, rng, events: [{ kind: "start", field: setup.field?.name ?? null, tieSide }] };
  firePassives(
    run,
    fighters.map((f) => ({ key: f.key, trigger: "battle_start" as const, other: null })),
  );
  nextTurn(run);
  return { state, events: run.events };
}

/** Who an effect reaches, in place order: the chosen one, its adjacent enemies, the whole side, or the user. */
function effectTargets(state: CombatState, actor: CombatFighter, move: CombatMove, effect: CombatEffect, primary: CombatFighter | null): CombatFighter[] {
  if (effect.on === "self") return actor.vita > 0 ? [actor] : [];
  if (effect.on === "primary") return primary && primary.vita > 0 ? [primary] : [];
  const side = move.target === "all_allies" ? actor.side : otherSide(actor.side);
  const live = sideOf(state, side);
  if (effect.on === "all") return live;
  if (!primary) return [];
  const near = COMBAT_ADJACENT[primary.position];
  return live.filter((f) => near.includes(f.position));
}

/**
 * Plays the choice of the fighter whose turn it is: pays the charge, resolves the effects in
 * order (one hit roll and one critical roll per target; a debuff on a fighter the move tried to
 * hit lands only if a hit did), calls the passives, gives the charge, ends the turn, then ends
 * the battle or moves on. Throws on a choice that is not allowed.
 */
export function applyCombatAction(previous: CombatState, action: CombatAction, ctx: CombatContext, rng: Rng): CombatStep {
  const { rules } = ctx;
  if (previous.result || !previous.current) throw new Error("combat: the battle is over");
  const allowed = legalCombatActions(previous, rules).some((a) => a.slot === action.slot && a.target === action.target);
  if (!allowed) throw new Error(`combat: ${action.slot} on ${action.target ?? "nobody"} is not allowed now`);
  const state = cloneState(previous);
  const run: Run = { state, ctx, rng, events: [] };
  const actor = fighterOf(state, state.current!);
  const move = actor.kit[action.slot];
  run.events.push({ kind: "move", actor: actor.key, slot: action.slot, move: move.id, target: action.target });

  if (action.slot === "supreme") actor.charge -= rules.charge.max;
  if (action.slot === "special") actor.specialReadyAt = actor.turns + move.cooldown;

  const primary = move.target === "self" ? actor : action.target ? fighterOf(state, action.target) : null;
  const family = combatMoveFamily(move, ctx.families);
  const power = combatPower(move, actor.stats, rules, state.field);
  const protectedSide = { a: combatFrontStands(state, "a", rules), b: combatFrontStands(state, "b", rules) };
  const pending: Pending[] = [];
  /** Fighters the move tried to hit: true once a hit landed. */
  const struck = new Map<string, boolean>();
  let firstHit: string | null = null;

  for (const effect of move.effects) {
    for (const target of effectTargets(state, actor, move, effect, primary)) {
      if (effect.kind === "damage") {
        const covered = move.range !== "infiltration" && protectedSide[target.side] && target.position >= rules.frontSize;
        const landed = strike(run, actor, target, power, effect.multiplier, family, covered, pending);
        struck.set(target.key, (struck.get(target.key) ?? false) || landed);
        if (landed) {
          firstHit ??= target.key;
          if (!pending.some((p) => p.trigger === "hurt" && p.key === target.key)) pending.push({ key: target.key, trigger: "hurt", other: actor.key });
        }
      } else if (effect.kind === "heal") {
        heal(run, actor, target, power, effect.multiplier);
      } else if (effect.kind === "shield") {
        shield(run, actor, target, power, effect.multiplier);
      } else if (!(isCombatDebuff(effect.status) && struck.get(target.key) === false)) {
        putStatus(run, actor, target, effect.status, effect.turns, effect.chance);
      }
    }
  }
  if (firstHit) pending.push({ key: actor.key, trigger: "hit", other: firstHit });

  if (action.slot === "base") actor.charge = Math.min(rules.charge.max, actor.charge + rules.charge.base);
  if (action.slot === "special") actor.charge = Math.min(rules.charge.max, actor.charge + rules.charge.special);
  state.actions += 1;
  firePassives(run, pending);
  if (actor.vita > 0) endTurn(run, actor);
  nextTurn(run);
  return { state, events: run.events };
}
