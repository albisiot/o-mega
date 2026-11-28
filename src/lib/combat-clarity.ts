// Scontro a squadre (SPEC §5.19, docs/COMBAT.md): what a step of the battle means for the eye.
// Asked by the user on 28 November 2026 («si capissero bene cosa fanno le abilità e chi colpisce chi
// in che modo»), directions A and B: who acts and with which move, on whom (an arrow for each
// target), what really happened (the words over each character), the whole action in one line,
// the moves in words, and before a choice what a move would do to each target. Pure: no I/O; the
// engine's own formulas give the previews, the server still decides every result.
import {
  combatFighterHitChance,
  combatFrontStands,
  combatHitDamage,
  combatModifiers,
  combatMoveFamily,
  combatPower,
  combatShieldCap,
  type CombatContext,
  type CombatEffect,
  type CombatEvent,
  type CombatFighter,
  type CombatMove,
  type CombatRules,
  type CombatSlot,
  type CombatState,
} from "@o-mega/game-engine";
import { STATUS_LABELS } from "@/lib/combat-text";

/** How a word over a character reads: harm and critical, healing, shield, a miss, a status bad or good, a passive. */
export type ClarityTone = "harm" | "crit" | "heal" | "shield" | "miss" | "bad" | "good" | "info";
export type StepFloat = { text: string; tone: ClarityTone };
/** From who acted to one character it reached; `miss` when the move missed it. */
export type StepArrow = { from: string; to: string; tone: "harm" | "heal" | "shield" | "miss" | "status" };

/** What a step shows on the board: the one who acted and with what, the arrows, who was really hit, the words. */
export type StepView = {
  actor: string | null;
  slot: CombatSlot | null;
  move: string | null;
  arrows: StepArrow[];
  /** Hit for real (a damage or a burn): they shake and flash. A miss does neither. */
  struck: string[];
  floats: Map<string, StepFloat[]>;
};

const ARROW_RANK: Record<StepArrow["tone"], number> = { harm: 4, miss: 3, heal: 2, shield: 1, status: 0 };

export function combatStepView(events: CombatEvent[]): StepView {
  const move = events.find((e): e is Extract<CombatEvent, { kind: "move" }> => e.kind === "move") ?? null;
  const stunned = events.find((e): e is Extract<CombatEvent, { kind: "stunned" }> => e.kind === "stunned") ?? null;
  const floats = new Map<string, StepFloat[]>();
  const add = (key: string, text: string, tone: ClarityTone) => floats.set(key, [...(floats.get(key) ?? []), { text, tone }]);
  const arrows = new Map<string, StepArrow>();
  const arrow = (to: string, tone: StepArrow["tone"]) => {
    if (!move || to === move.actor) return;
    const had = arrows.get(to);
    if (!had || ARROW_RANK[tone] > ARROW_RANK[had.tone]) arrows.set(to, { from: move.actor, to, tone });
  };
  const struck = new Set<string>();
  // The move's own results come right after it, until a passive or the next turn speaks.
  let ofMove = false;
  for (const e of events) {
    if (e.kind === "move") ofMove = true;
    else if (e.kind === "passive" || e.kind === "turn") ofMove = false;
    const mine = ofMove && move !== null && "actor" in e && e.actor === move.actor;
    switch (e.kind) {
      case "damage":
        add(e.target, e.critical ? `CRITICO −${e.amount}` : `−${e.amount}`, e.critical ? "crit" : "harm");
        if (e.absorbed > 0) add(e.target, `${e.absorbed} sullo scudo`, "shield");
        struck.add(e.target);
        if (mine) arrow(e.target, "harm");
        break;
      case "miss":
        add(e.target, "MANCATO", "miss");
        if (mine) arrow(e.target, "miss");
        break;
      case "heal":
        if (e.amount > 0) add(e.target, `+${e.amount} Vita`, "heal");
        if (mine) arrow(e.target, "heal");
        break;
      case "shield":
        if (e.amount > 0) add(e.target, `+${e.amount} scudo`, "shield");
        if (mine) arrow(e.target, "shield");
        break;
      case "status":
        add(e.target, `${STATUS_LABELS[e.status].name}!`, STATUS_LABELS[e.status].good ? "good" : "bad");
        if (mine) arrow(e.target, "status");
        break;
      case "resisted":
        add(e.target, e.immune ? "non stordibile" : "resiste", "miss");
        if (mine) arrow(e.target, "status");
        break;
      case "burn":
        add(e.target, `brucia −${e.amount}`, "harm");
        struck.add(e.target);
        break;
      case "stunned":
        add(e.actor, "stordito", "bad");
        break;
      case "passive":
        add(e.actor, "PASSIVE", "info");
        break;
    }
  }
  return {
    actor: move?.actor ?? stunned?.actor ?? null,
    slot: move?.slot ?? null,
    move: move?.move ?? null,
    arrows: [...arrows.values()],
    struck: [...struck],
    floats,
  };
}

/** Puts the passives' names in their words (combatStepView leaves a marker: it knows no names). */
export function namePassiveFloats(view: StepView, events: CombatEvent[], moveName: (id: string) => string): StepView {
  const names = new Map<string, string[]>();
  for (const e of events) if (e.kind === "passive") names.set(e.actor, [...(names.get(e.actor) ?? []), moveName(e.passive)]);
  const floats = new Map<string, StepFloat[]>();
  for (const [key, list] of view.floats) {
    const left = [...(names.get(key) ?? [])];
    floats.set(
      key,
      list.map((f) => (f.text === "PASSIVE" ? { text: left.shift() ?? "", tone: f.tone } : f)).filter((f) => f.text !== ""),
    );
  }
  return { ...view, floats };
}

/** A piece of a line of the battle: a character in its side's colour, a move in bold, or plain words. */
export type Segment = { text: string; side?: "mine" | "theirs"; strong?: boolean };

const turns = (n: number) => (n === 1 ? "1 turno" : `${n} turni`);

/**
 * The lines of a step: the move with whom it reached and all it did in one line («Kiln → Higgler
 * · Serratura fusa: −100, Bruciatura 2 turni»), a passive that fired with what it did, and the
 * rest (a turn's burn, a status ending, the start, the end) one line each.
 */
export function combatStepLines(
  events: CombatEvent[],
  name: (key: string) => string,
  moveName: (id: string) => string,
  isMine: (key: string) => boolean,
  other: (event: CombatEvent) => string | null,
): Segment[][] {
  const who = (key: string): Segment => ({ text: name(key), side: isMine(key) ? "mine" : "theirs" });
  const lines: Segment[][] = [];
  /** The line being filled: its owner (a move's or a passive's) and what each character got. */
  let open: { actor: string; head: Segment[]; results: Map<string, string[]>; target: string | null; mode: "move" | "passive" } | null = null;
  const close = () => {
    if (!open) return;
    const { head, results, target, actor, mode } = open;
    const reached = [...results.keys()];
    const line = [...head];
    if (mode === "move") {
      const onlyOne = (target !== null && reached.every((key) => key === target)) || (target === null && reached.length === 1 && reached[0] === actor);
      const label =
        target !== null
          ? null
          : reached.length === 0 || reached.every((key) => key === actor)
            ? "sé"
            : reached.every((key) => isMine(key) !== isMine(actor))
              ? "tutti i nemici"
              : "la squadra";
      line.splice(1, 0, { text: " → " }, label ? { text: label } : who(target!));
      if (results.size > 0) {
        line.push({ text: ": " });
        if (onlyOne) line.push({ text: results.get(reached[0])!.join(", ") });
        else
          reached.forEach((key, i) => {
            if (i > 0) line.push({ text: "; " });
            line.push(who(key), { text: ` ${results.get(key)!.join(", ")}` });
          });
      }
    } else if (results.size > 0) {
      line.push({ text: ": " });
      reached.forEach((key, i) => {
        if (i > 0) line.push({ text: "; " });
        if (key !== actor) line.push(who(key), { text: " " });
        line.push({ text: results.get(key)!.join(", ") });
      });
    }
    lines.push(line);
    open = null;
  };
  const result = (key: string, text: string) => {
    if (!open) return false;
    open.results.set(key, [...(open.results.get(key) ?? []), text]);
    return true;
  };
  for (const e of events) {
    switch (e.kind) {
      case "move":
        close();
        // close() puts the target between the actor and the move: «Kiln → Higgler · Serratura fusa».
        open = { actor: e.actor, head: [who(e.actor), { text: " · " }, { text: moveName(e.move), strong: true }], results: new Map(), target: e.target, mode: "move" };
        break;
      case "passive":
        close();
        open = { actor: e.actor, head: [who(e.actor), { text: ": " }, { text: moveName(e.passive), strong: true }], results: new Map(), target: null, mode: "passive" };
        break;
      case "damage":
        if (open && e.actor === open.actor) result(e.target, `−${e.amount}${e.critical ? " critico" : ""}${e.absorbed > 0 ? ` (${e.absorbed} sullo scudo)` : ""}`);
        else lines.push([{ text: other(e) ?? "" }]);
        break;
      case "miss":
        if (open && e.actor === open.actor) result(e.target, "mancato");
        else lines.push([{ text: other(e) ?? "" }]);
        break;
      case "heal":
        if (e.amount > 0 && !(open && e.actor === open.actor && result(e.target, `+${e.amount} Vita`))) lines.push([{ text: other(e) ?? "" }]);
        break;
      case "shield":
        if (e.amount > 0 && !(open && e.actor === open.actor && result(e.target, `+${e.amount} scudo`))) lines.push([{ text: other(e) ?? "" }]);
        break;
      case "status":
        if (!(open && e.actor === open.actor && result(e.target, `${STATUS_LABELS[e.status].name} ${turns(e.turns)}`))) lines.push([{ text: other(e) ?? "" }]);
        break;
      case "resisted":
        if (!(open && e.actor === open.actor && result(e.target, e.immune ? "non si lascia stordire" : `resiste a ${STATUS_LABELS[e.status].name}`)))
          lines.push([{ text: other(e) ?? "" }]);
        break;
      case "charge":
        if (e.amount > 0 && open?.mode === "passive" && open.actor === e.target) result(e.target, `+${e.amount} Carica`);
        break;
      case "defeated":
        if (!(open && open.results.has(e.target) && result(e.target, "KO!"))) lines.push([{ text: other(e) ?? "" }]);
        break;
      case "turn":
        close();
        break;
      default: {
        close();
        const text = other(e);
        if (text) lines.push([{ text }]);
      }
    }
  }
  close();
  return lines.filter((line) => line.some((segment) => segment.text !== ""));
}

// ---------------------------------------------------------------------------------------------
// The moves in words

/** How hard a multiplier hits (or heals), in a word. */
export function strengthWord(multiplier: number): "leggero" | "normale" | "forte" | "molto forte" {
  if (multiplier < 0.6) return "leggero";
  if (multiplier < 1.05) return "normale";
  if (multiplier < 1.5) return "forte";
  return "molto forte";
}

const HEAL_WORD = { leggero: "leggera", normale: "media", forte: "forte", "molto forte": "molto forte" } as const;

function effectWords(effect: CombatEffect): string {
  if (effect.kind === "damage") return `danno ${strengthWord(effect.multiplier)}`;
  if (effect.kind === "heal") return `cura ${HEAL_WORD[strengthWord(effect.multiplier)]}`;
  if (effect.kind === "shield") return `scudo ${strengthWord(effect.multiplier) === "normale" ? "medio" : strengthWord(effect.multiplier)}`;
  return `${STATUS_LABELS[effect.status].name} ${turns(effect.turns)}${effect.chance ? " (probabile)" : ""}`;
}

/** Who a move reaches, in a few words, for its button. */
export function moveReachShort(move: CombatMove): string {
  switch (move.target) {
    case "enemy":
      return move.range === "melee" ? "1 nemico in prima linea" : move.range === "infiltration" ? "1 nemico, anche dietro" : "1 nemico a distanza";
    case "enemy_and_adjacent":
      return "1 nemico e i vicini";
    case "all_enemies":
      return "tutti i nemici";
    case "self":
      return "sé";
    case "ally":
      return "1 compagno";
    case "all_allies":
      return "tutta la squadra";
  }
}

/** A move on its button: who it reaches and its first effect («1 nemico a distanza · danno normale»). */
export function describeMoveShort(move: CombatMove): string {
  const main = move.effects.find((e) => e.on !== "adjacent") ?? move.effects[0];
  const more = move.effects.filter((e) => e !== main && e.kind === "status").length > 0 ? " + effetto" : "";
  return `${moveReachShort(move)} · ${main ? effectWords(main) : ""}${more}`;
}

/** A move in a sentence, with the rules of the lines it meets: what the player reads before choosing. */
export function describeMovePlain(move: CombatMove, rules: CombatRules): string {
  const cover = 100 - rules.coverPercent;
  const reach: Record<CombatMove["target"], string> = {
    enemy:
      move.range === "melee"
        ? "Colpisce un nemico in prima linea: la seconda è protetta finché la prima è in piedi."
        : move.range === "infiltration"
          ? "Colpisce un nemico qualsiasi, anche in seconda linea, senza copertura."
          : `Colpisce un nemico a distanza: in seconda linea, finché la prima è in piedi, fa il ${cover}% in meno.`,
    enemy_and_adjacent: "Colpisce un nemico e quelli vicini a lui.",
    all_enemies: "Colpisce tutti i nemici.",
    self: "Su di sé.",
    ally: "Su un compagno a scelta.",
    all_allies: "Su tutta la squadra.",
  };
  const parts = move.effects.map((effect) => {
    const on = effect.on === "adjacent" ? " ai vicini" : effect.on === "all" ? " a tutti" : "";
    return `${effectWords(effect)}${on}`;
  });
  const when = move.slot === "special" ? ` Poi si ricarica per ${turns(move.cooldown)}.` : move.slot === "supreme" ? " Serve la Carica piena." : "";
  return `${reach[move.target]} ${parts.join(", ").replace(/^./, (c) => c.toUpperCase())}.${when}`;
}

// ---------------------------------------------------------------------------------------------
// Before a choice: what a move would do to each target

/** What a move would do to a target: the damage before a critical, the healing or shield, the chance to hit, the cover. */
export type TargetPreview = { key: string; damage: number | null; heal: number | null; shield: number | null; hitPercent: number | null; covered: boolean };

/** The effects of a move that land on the character picked as its target. */
function onPicked(move: CombatMove): CombatEffect[] {
  return move.effects.filter((e) => e.on === undefined || e.on === "primary" || e.on === "all");
}

export function combatPreview(state: CombatState, actor: CombatFighter, move: CombatMove, targets: string[], ctx: CombatContext): TargetPreview[] {
  const power = combatPower(move, actor.stats, ctx.rules, state.field);
  const family = combatMoveFamily(move, ctx.families);
  const effects = onPicked(move);
  const damage = effects.filter((e) => e.kind === "damage").reduce((sum, e) => sum + e.multiplier, 0);
  const heal = effects.filter((e) => e.kind === "heal").reduce((sum, e) => sum + e.multiplier, 0);
  const shield = effects.filter((e) => e.kind === "shield").reduce((sum, e) => sum + e.multiplier, 0);
  return targets.flatMap((key) => {
    const target = state.fighters.find((f) => f.key === key);
    if (!target) return [];
    const enemy = target.side !== actor.side;
    const covered = enemy && move.range !== "infiltration" && combatFrontStands(state, target.side, ctx.rules) && target.position >= ctx.rules.frontSize;
    const bonus = 1 + (combatModifiers(actor).healPercent ?? 0) / 100;
    return [
      {
        key,
        damage: enemy && damage > 0 ? Math.max(1, Math.round(combatHitDamage(actor, target, power, damage, family, covered, ctx))) : null,
        heal: !enemy && heal > 0 ? Math.min(target.maxVita - Math.max(0, target.vita), Math.round(power * heal * bonus)) : null,
        shield: !enemy && shield > 0 ? Math.max(0, Math.min(combatShieldCap(target, ctx.rules) - target.shield, Math.round(power * shield))) : null,
        hitPercent: enemy && damage > 0 ? Math.round(combatFighterHitChance(actor, target, ctx.rules) * 100) : null,
        covered,
      },
    ];
  });
}

/** A preview in two lines: the effect («~65», «+40 Vita») and the rest («85% · coperto»). */
export function previewParts(preview: TargetPreview): { main: string; sub: string } {
  const main = [preview.damage !== null ? `~${preview.damage}` : null, preview.heal !== null ? `+${preview.heal} Vita` : null, preview.shield !== null ? `+${preview.shield} scudo` : null]
    .filter(Boolean)
    .join(" ");
  const sub = [preview.hitPercent !== null ? `${preview.hitPercent}%` : null, preview.covered ? "coperto" : null].filter(Boolean).join(" · ");
  return { main, sub };
}

/** A preview in a few words («~65 · 85%», «+40 Vita»). */
export function previewText(preview: TargetPreview): string {
  const parts: string[] = [];
  if (preview.damage !== null) parts.push(`~${preview.damage}`);
  if (preview.hitPercent !== null) parts.push(`${preview.hitPercent}%`);
  if (preview.heal !== null) parts.push(`+${preview.heal} Vita`);
  if (preview.shield !== null) parts.push(`+${preview.shield} scudo`);
  return parts.join(" · ");
}

/** The enemies a move cannot pick because they are behind a front line that still stands (a move in close combat). */
export function protectedFrom(state: CombatState, actor: CombatFighter, move: CombatMove, rules: CombatRules): string[] {
  if (!(move.target === "enemy" || move.target === "enemy_and_adjacent") || move.range !== "melee") return [];
  const enemy = actor.side === "a" ? "b" : "a";
  if (!combatFrontStands(state, enemy, rules)) return [];
  return state.fighters.filter((f) => f.side === enemy && f.vita > 0 && f.position >= rules.frontSize).map((f) => f.key);
}
