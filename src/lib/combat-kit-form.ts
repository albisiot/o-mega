// EDITOR → Scontro (SPEC §5.19, docs/COMBAT.md): the kit as a form. The choices each field
// offers, the values a new effect or passive starts from, what changes when a move gets another
// target, and the check of a kit written as text. Only words and shapes: the engine
// (validateCombatKit) still decides whether a kit can fight.
import {
  COMBAT_BUFFS,
  COMBAT_DEBUFFS,
  COMBAT_TRIGGERS,
  isCombatDebuff,
  type CombatEffect,
  type CombatKit,
  type CombatMove,
  type CombatPassive,
  type CombatPassiveEffect,
  type CombatPassiveTarget,
  type CombatSlot,
  type CombatStatusCode,
  type CombatTarget,
  type CombatTrigger,
} from "@o-mega/game-engine";

export type KitTab = CombatSlot | "passive";

export type Choice<T extends string> = { value: T; label: string };

export const TARGET_CHOICES: Choice<CombatTarget>[] = [
  { value: "enemy", label: "Un nemico" },
  { value: "enemy_and_adjacent", label: "Un nemico e i vicini" },
  { value: "all_enemies", label: "Tutti i nemici" },
  { value: "self", label: "Sé" },
  { value: "ally", label: "Un compagno" },
  { value: "all_allies", label: "Tutta la squadra" },
];

export const RANGE_CHOICES: Choice<CombatMove["range"]>[] = [
  { value: "melee", label: "Corpo a corpo" },
  { value: "ranged", label: "A distanza" },
  { value: "infiltration", label: "Infiltrazione" },
];

/** Whether a move is aimed at the other side: then its range counts, and debuffs and damage go there. */
export function isOffensive(target: CombatTarget): boolean {
  return target === "enemy" || target === "enemy_and_adjacent" || target === "all_enemies";
}

type On = CombatEffect["on"];

/** Who an effect of a move can reach, given the move's target. */
export function onChoices(target: CombatTarget): Choice<On>[] {
  const self: Choice<On> = { value: "self", label: "Chi la usa" };
  if (target === "self") return [{ value: "primary", label: "Chi la usa" }];
  if (target === "all_enemies") return [{ value: "all", label: "Tutti i nemici" }, self];
  if (target === "all_allies") return [{ value: "all", label: "Tutta la squadra" }, self];
  if (target === "enemy_and_adjacent") {
    return [{ value: "primary", label: "Il nemico scelto" }, { value: "adjacent", label: "I suoi vicini" }, self];
  }
  return [{ value: "primary", label: target === "ally" ? "Il compagno scelto" : "Il nemico scelto" }, self];
}

function defaultOn(target: CombatTarget): "primary" | "all" {
  return target === "all_enemies" || target === "all_allies" ? "all" : "primary";
}

/**
 * The move with another target: each effect keeps reaching what it can (its user stays its
 * user, the neighbours become the chosen enemy, everyone becomes the chosen one and back).
 */
export function retarget(move: CombatMove, target: CombatTarget): CombatMove {
  const allowed = onChoices(target).map((choice) => choice.value);
  const effects = move.effects.map((effect) => {
    if (allowed.includes(effect.on)) return effect;
    return { ...effect, on: defaultOn(target) } as CombatEffect;
  });
  return { ...move, target, effects };
}

export const MOVE_EFFECT_CHOICES: Choice<CombatEffect["kind"]>[] = [
  { value: "damage", label: "Danno" },
  { value: "heal", label: "Cura" },
  { value: "shield", label: "Scudo" },
  { value: "status", label: "Effetto" },
];

/** A new effect of a move, of that kind, aimed where the move points. */
export function newMoveEffect(kind: CombatEffect["kind"], move: CombatMove): CombatEffect {
  const offensive = isOffensive(move.target);
  const on = defaultOn(move.target);
  if (kind === "damage") return { kind, multiplier: 1, on };
  // Healing and shields cannot go on enemies: on an attack they go to its user.
  if (kind === "heal" || kind === "shield") return { kind, multiplier: 0.5, on: offensive ? "self" : on };
  return { kind: "status", status: offensive ? "weaken" : "empower", turns: 1, on };
}

/** The statuses an effect can put: debuffs on enemies, buffs on allies. */
export function statusChoices(onEnemies: boolean): CombatStatusCode[] {
  return onEnemies ? [...COMBAT_DEBUFFS] : [...COMBAT_BUFFS];
}

/** Whether a move's effect lands on the other side. */
export function moveEffectOnEnemies(move: CombatMove, effect: CombatEffect): boolean {
  return effect.on !== "self" && isOffensive(move.target);
}

export const TRIGGER_CHOICES: Choice<CombatTrigger | "none">[] = [
  { value: "none", label: "Mai: solo bonus sempre attivi" },
  ...COMBAT_TRIGGERS.map((trigger) => ({
    value: trigger,
    label: {
      battle_start: "A inizio scontro",
      turn_start: "A ogni suo turno",
      hit: "Quando colpisce",
      hurt: "Quando è colpito",
      knockout: "Quando mette KO",
      ally_down: "Quando cade un compagno",
      low_vita: "Sotto una soglia di Vita",
    }[trigger],
  })),
];

/** Who a passive's effect can reach: the fighter of the trigger only on a hit or a hurt. */
export function passiveToChoices(trigger: CombatTrigger | null, kind: CombatPassiveEffect["kind"]): Choice<CombatPassiveTarget>[] {
  const other = trigger === "hit" ? "Il nemico colpito" : "Chi l'ha colpito";
  const all: Choice<CombatPassiveTarget>[] = [
    { value: "self", label: "Sé" },
    { value: "allies", label: "Tutta la squadra" },
    { value: "enemies", label: "Tutti i nemici" },
    ...(trigger === "hit" || trigger === "hurt" ? [{ value: "other" as const, label: other }] : []),
  ];
  if (kind === "charge") return all.filter((choice) => choice.value === "self" || choice.value === "allies");
  if (kind === "damage") return all.filter((choice) => choice.value === "enemies" || choice.value === "other");
  if (kind === "heal" || kind === "shield") return all.filter((choice) => choice.value === "self" || choice.value === "allies");
  return all;
}

export const PASSIVE_EFFECT_CHOICES: Choice<CombatPassiveEffect["kind"]>[] = [
  { value: "status", label: "Effetto" },
  { value: "shield", label: "Scudo" },
  { value: "heal", label: "Cura" },
  { value: "damage", label: "Danno" },
  { value: "charge", label: "Carica" },
];

export function newPassiveEffect(kind: CombatPassiveEffect["kind"], trigger: CombatTrigger | null): CombatPassiveEffect {
  if (kind === "charge") return { kind, amount: 1, to: "self" };
  if (kind === "damage") return { kind, multiplier: 0.5, to: trigger === "hurt" || trigger === "hit" ? "other" : "enemies" };
  if (kind === "heal" || kind === "shield") return { kind, multiplier: 0.5, to: "self" };
  return { kind: "status", status: "empower", turns: 1, to: "self" };
}

/** A passive for a kit that has none: a shield at the start of the battle, on its heaviest ability. */
export function newPassive(code: string, scaling: Record<string, number>): CombatPassive {
  return {
    id: `${code}-passive`,
    name: "Nuova passiva",
    scaling: { ...scaling },
    trigger: "battle_start",
    limit: 0,
    effects: [{ kind: "shield", multiplier: 0.5, to: "self" }],
    modifiers: {},
  };
}

/** Whether a passive's effect lands on the other side. */
export function passiveEffectOnEnemies(effect: CombatPassiveEffect): boolean {
  return effect.to === "enemies" || effect.to === "other";
}

/** The passive with another trigger: the threshold only under low_vita, «the other» only on a hit or hurt. */
export function retrigger(passive: CombatPassive, trigger: CombatTrigger | null): CombatPassive {
  const next: CombatPassive = { ...passive, trigger };
  if (trigger === "low_vita") next.thresholdPercent = passive.thresholdPercent ?? 40;
  else delete next.thresholdPercent;
  if (trigger === null) next.effects = [];
  else if (passive.effects.length === 0) next.effects = [newPassiveEffect("shield", trigger)];
  if (trigger !== "hit" && trigger !== "hurt") {
    next.effects = next.effects.map((effect) => (effect.to === "other" ? ({ ...effect, to: "enemies" } as CombatPassiveEffect) : effect));
  }
  return next;
}

/** The status of an effect when it moves to the other side: a buff becomes a debuff and back. */
export function statusFor(status: CombatStatusCode, onEnemies: boolean): CombatStatusCode {
  if (isCombatDebuff(status) === onEnemies) return status;
  return onEnemies ? "weaken" : "empower";
}

// ---------------------------------------------------------------------------------------------
// Numbers as the admin types them: a comma or a point, nothing for none.

export function parseDecimal(text: string): number {
  const clean = text.trim().replace(",", ".");
  if (clean === "" || !/^-?\d*\.?\d*$/.test(clean)) return Number.NaN;
  return Number(clean);
}

export function formatDecimal(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "";
  return String(Number(value.toFixed(4))).replace(".", ",");
}

// ---------------------------------------------------------------------------------------------
// The kit written as text (the «Testo» tab)

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function moveShapeProblem(value: unknown, slot: CombatSlot): string | null {
  const label = { base: "La base", special: "La speciale", supreme: "La suprema" }[slot];
  if (!isObject(value)) return `${label} manca o non è un oggetto.`;
  if (typeof value.id !== "string" || typeof value.name !== "string") return `${label} vuole un id e un nome.`;
  if (value.slot !== slot) return `${label} deve avere slot «${slot}».`;
  if (!isObject(value.scaling)) return `${label} vuole le statistiche (scaling).`;
  if (typeof value.range !== "string" || typeof value.target !== "string") return `${label} vuole portata e bersaglio.`;
  if (typeof value.cooldown !== "number") return `${label} vuole la ricarica (cooldown).`;
  if (!Array.isArray(value.effects) || !value.effects.every(isObject)) return `${label} vuole un elenco di effetti.`;
  return null;
}

/**
 * Whether text parsed from the «Testo» tab has the shape of a kit, so that the form can show
 * it: null when it has, the problem otherwise. Its values are the engine's to check.
 */
export function kitShapeProblem(value: unknown): string | null {
  if (!isObject(value)) return "Il kit deve essere un oggetto { … }.";
  for (const slot of ["base", "special", "supreme"] as const) {
    const problem = moveShapeProblem(value[slot], slot);
    if (problem) return problem;
  }
  const passive = value.passive;
  if (passive === undefined || passive === null) return null;
  if (!isObject(passive)) return "La passiva deve essere un oggetto, o null.";
  if (typeof passive.id !== "string" || typeof passive.name !== "string") return "La passiva vuole un id e un nome.";
  if (!isObject(passive.scaling) || !isObject(passive.modifiers)) return "La passiva vuole scaling e modifiers.";
  if (typeof passive.limit !== "number") return "La passiva vuole un limite (limit).";
  if (!Array.isArray(passive.effects) || !passive.effects.every(isObject)) return "La passiva vuole un elenco di effetti.";
  return null;
}

/** Which tab an engine message (in Italian, from italianKitError) is about, by the id it names. */
export function tabOfError(kit: CombatKit, message: string): KitTab | null {
  for (const slot of ["base", "special", "supreme"] as const) {
    if (message.startsWith(`Mossa ${kit[slot].id}:`) || message.startsWith(`La mossa ${kit[slot].id} `)) return slot;
  }
  if (message.startsWith("Passiva") || message.startsWith("La passiva")) return "passive";
  const missing = /^Manca la (base|speciale|suprema)$/.exec(message);
  if (missing) return ({ base: "base", speciale: "special", suprema: "supreme" } as const)[missing[1] as "base" | "speciale" | "suprema"];
  return null;
}
