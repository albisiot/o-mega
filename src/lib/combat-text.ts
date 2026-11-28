// Scontro a squadre (SPEC §5.19, docs/COMBAT.md): the words of the screen. Names of the slots,
// statuses and triggers, a short description of a move from its data, and one line of the log
// for each event. The player's names for statuses and moves are still provisional.
import type { CombatEffect, CombatEvent, CombatMove, CombatPassive, CombatPassiveEffect, CombatSlot, CombatStatusCode, Side } from "@o-mega/game-engine";

export const SLOT_LABELS: Record<CombatSlot, string> = { base: "Base", special: "Speciale", supreme: "Suprema" };

/** Name, three letters for the badge, and whether it helps who has it. */
export const STATUS_LABELS: Record<CombatStatusCode, { name: string; short: string; good: boolean }> = {
  empower: { name: "Potenziamento", short: "POT", good: true },
  // Not "FOR": that is the Forza of the cards.
  fortify: { name: "Fortificazione", short: "FRT", good: true },
  haste: { name: "Accelerazione", short: "ACC", good: true },
  taunt: { name: "Provocazione", short: "PRV", good: true },
  weaken: { name: "Indebolimento", short: "IND", good: false },
  vulnerable: { name: "Vulnerabilità", short: "VUL", good: false },
  stun: { name: "Stordimento", short: "STO", good: false },
  burn: { name: "Bruciatura", short: "BRU", good: false },
};

const decimal = (x: number) => x.toLocaleString("it-IT", { maximumFractionDigits: 2 });
const turns = (n: number) => (n === 1 ? "1 turno" : `${n} turni`);

function effectText(effect: CombatEffect): string {
  const on = effect.on === "adjacent" ? " agli adiacenti" : effect.on === "all" ? " a tutti" : effect.on === "self" ? " a sé" : "";
  if (effect.kind === "damage") return `danni ×${decimal(effect.multiplier)}${on}`;
  if (effect.kind === "heal") return `cura ×${decimal(effect.multiplier)}${on}`;
  if (effect.kind === "shield") return `scudo ×${decimal(effect.multiplier)}${on}`;
  const label = STATUS_LABELS[effect.status].name.toLowerCase();
  return `${label} ${turns(effect.turns)}${on}${effect.chance ? " (probabile)" : ""}`;
}

/** One line for a move: who it reaches and what it does; the cooldown of a special. */
export function describeCombatMove(move: CombatMove): string {
  const reach: Record<CombatMove["target"], string> = {
    enemy: move.range === "melee" ? "Un nemico, corpo a corpo" : move.range === "infiltration" ? "Un nemico, anche dietro le linee" : "Un nemico, a distanza",
    enemy_and_adjacent: "Un nemico e i vicini",
    all_enemies: "Tutti i nemici",
    self: "Sé",
    ally: "Un compagno",
    all_allies: "Tutta la squadra",
  };
  const parts = move.effects.map(effectText).join(", ");
  return `${reach[move.target]}: ${parts}${move.slot === "special" ? ` · ricarica ${turns(move.cooldown)}` : ""}.`;
}

/** When a passive acts, in words (low_vita says its threshold instead). */
const TRIGGER_LABELS: Record<string, string> = {
  battle_start: "a inizio scontro",
  turn_start: "a ogni suo turno",
  hit: "quando colpisce",
  hurt: "quando è colpito",
  knockout: "quando mette KO",
  ally_down: "quando cade un compagno",
  low_vita: "sotto soglia di Vita",
};
const PASSIVE_TO: Record<string, string> = { self: " a sé", allies: " ai compagni", enemies: " ai nemici", other: " all'avversario" };

function passiveEffectText(effect: CombatPassiveEffect): string {
  const to = PASSIVE_TO[effect.to] ?? "";
  if (effect.kind === "status") return `${STATUS_LABELS[effect.status].name.toLowerCase()} ${turns(effect.turns)}${to}${effect.chance ? " (probabile)" : ""}`;
  if (effect.kind === "damage") return `danni ×${decimal(effect.multiplier)}${to}`;
  if (effect.kind === "charge") return `+${effect.amount} Carica${to}`;
  return `${effect.kind === "heal" ? "cura" : "scudo"} ×${decimal(effect.multiplier)}${to}`;
}

/**
 * A passive in one line: when it acts and what it does (with its limit), then what it always
 * adds; the same words as the sheets of docs/COMBAT-KITS.md.
 */
export function describeCombatPassive(passive: CombatPassive): string {
  const parts: string[] = [];
  if (passive.trigger) {
    const when = passive.trigger === "low_vita" ? `sotto il ${passive.thresholdPercent}% di Vita` : TRIGGER_LABELS[passive.trigger];
    const limit =
      passive.limit && passive.trigger !== "battle_start" && passive.trigger !== "low_vita" ? (passive.limit === 1 ? " (una volta)" : ` (max ${passive.limit} volte)`) : "";
    parts.push(`${when}: ${passive.effects.map(passiveEffectText).join(", ")}${limit}`);
  }
  if (passive.modifiers) {
    const m = passive.modifiers;
    const sign = (x: number) => (x > 0 ? `+${x}` : `${x}`);
    const mods: string[] = [];
    if (m.damagePercent) mods.push(`danni ${sign(m.damagePercent)}%`);
    if (m.hitPercent) mods.push(`precisione ${sign(m.hitPercent)}`);
    if (m.critPercent) mods.push(`critico ${sign(m.critPercent)}`);
    if (m.speedPercent) mods.push(`velocità ${sign(m.speedPercent)}%`);
    if (m.effectChancePercent) mods.push(`probabilità effetti ${sign(m.effectChancePercent)}`);
    if (m.healPercent) mods.push(`cure ${sign(m.healPercent)}%`);
    if (m.damageVsStatus) mods.push(`danni ${sign(m.damageVsStatus.percent)}% contro chi ha ${STATUS_LABELS[m.damageVsStatus.status].name.toLowerCase()}`);
    if (mods.length) parts.push(`sempre: ${mods.join(", ")}`);
  }
  return parts.join("; ");
}

/** The engine's checks of a kit (validateCombatKit), in Italian for the EDITOR; an unknown one stays as it is. */
const KIT_ERRORS: [RegExp, string][] = [
  [/^move (\S+): /, "Mossa $1: "],
  [/^passive (\S+): /, "Passiva $1: "],
  [/^move without id$/, "Una mossa non ha l'id"],
  [/^passive without id$/, "La passiva non ha l'id"],
  [/^kit without base$/, "Manca la base"],
  [/^kit without special$/, "Manca la speciale"],
  [/^kit without supreme$/, "Manca la suprema"],
  [/^move (\S+) is a (\w+), not a (\w+)$/, "La mossa $1 è una $2, non una $3"],
  [/weights sum to ([\d.]+), not 1$/, "i pesi fanno $1, non 1"],
  [/unknown ability (\S+)$/, "abilità sconosciuta $1"],
  [/weight of (\S+) must be positive$/, "il peso di $1 deve essere positivo"],
  [/no ability$/, "nessuna abilità"],
  [/no name$/, "senza nome"],
  [/unknown slot (\S+)$/, "posto sconosciuto $1"],
  [/cooldown must be a whole number from 0$/, "la ricarica deve essere un numero intero da 0"],
  [/a special needs a cooldown$/, "una speciale ha bisogno di una ricarica"],
  [/only a special has a cooldown$/, "solo una speciale ha una ricarica"],
  [/unknown family (\S+)$/, "famiglia sconosciuta $1"],
  [/unknown range (\S+)$/, "portata sconosciuta $1"],
  [/unknown target (\S+)$/, "bersaglio sconosciuto $1"],
  [/unknown trigger (\S+)$/, "innesco sconosciuto $1"],
  [/unknown status (\S+)$/, "effetto sconosciuto $1"],
  [/no effect$/, "nessun effetto"],
  [/(\w+) multiplier must be positive$/, "il moltiplicatore di $1 deve essere positivo"],
  [/damage needs an enemy target$/, "il danno va su un nemico"],
  [/(\w+) needs an allied target$/, "$1 va su un alleato"],
  [/(\w+) needs an enemy target$/, "$1 va su un nemico"],
  [/adjacent needs enemy_and_adjacent$/, "«I suoi vicini» vuole il bersaglio «Un nemico e i vicini»"],
  [/all needs all_enemies or all_allies$/, "«Tutti» vuole il bersaglio «Tutti i nemici» o «Tutta la squadra»"],
  [/(\w+) has no primary target$/, "con il bersaglio $1 l'effetto va su tutti, non su uno scelto"],
  [/(\w+) must last a whole number of turns from 1$/, "$1 deve durare un numero intero di turni, almeno 1"],
  [/(\w+) lasts more than (\d+) turns$/, "$1 dura più di $2 turni"],
  [/only a debuff has a chance$/, "solo un effetto negativo ha una probabilità"],
  [/chance base must be a number$/, "la base della probabilità deve essere un numero"],
  [/effects need a trigger$/, "gli effetti vogliono un innesco"],
  [/a trigger needs effects$/, "un innesco vuole degli effetti"],
  [/low_vita needs a threshold between 0 and 100$/, "«Sotto una soglia di Vita» vuole una soglia tra 0 e 100"],
  [/only low_vita has a threshold$/, "solo «Sotto una soglia di Vita» ha una soglia"],
  [/limit must be a whole number from 0$/, "il limite deve essere un numero intero da 0"],
  [/other needs the hit or hurt trigger$/, "il nemico colpito, o chi ha colpito, c'è solo con «Quando colpisce» o «Quando è colpito»"],
  [/(\w+) needs enemies$/, "$1 va sui nemici"],
  [/(\w+) needs allies$/, "$1 va sugli alleati"],
  [/charge must be a whole number from 1$/, "la Carica deve essere un numero intero da 1"],
  [/damageVsStatus needs a known status and a number$/, "«più danni contro chi ha…» vuole un effetto e un numero"],
  [/(\w+) must be a number$/, "$1 deve essere un numero"],
  [/does nothing$/, "non fa niente"],
];

/** The engine's words left in a message, as the form of the EDITOR names them. */
const KIT_WORDS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(STATUS_LABELS).map(([code, label]) => [code, label.name.toLowerCase()])),
  damage: "il danno",
  heal: "la cura",
  shield: "lo scudo",
  base: "base",
  special: "speciale",
  supreme: "suprema",
  all_enemies: "«Tutti i nemici»",
  all_allies: "«Tutta la squadra»",
  damagePercent: "«danni %»",
  critPercent: "«critico»",
  hitPercent: "«precisione»",
  healPercent: "«cure %»",
  speedPercent: "«velocità %»",
  effectChancePercent: "«probabilità effetti»",
};

export function italianKitError(message: string): string {
  let out = message;
  for (const [pattern, replacement] of KIT_ERRORS) out = out.replace(pattern, replacement);
  // After the id at its start ("Mossa P001-base: "), the codes of the engine in words.
  const [, head = "", body = out] = /^((?:Mossa|Passiva|La mossa) \S+:? )?(.*)$/.exec(out) ?? [];
  return head + body.replace(/\b[A-Za-z_]+\b/g, (word) => KIT_WORDS[word] ?? word);
}

/**
 * The log's line for an event, or null for those the log leaves out (a turn starting). `name`
 * gives a fighter's name by key; `moveName` the name of a move or passive by id.
 */
export function combatEventLine(event: CombatEvent, name: (key: string) => string, moveName: (id: string) => string, playerSide: Side): string | null {
  switch (event.kind) {
    case "start":
      return event.field ? `Si combatte su: ${event.field}.` : "Lo scontro comincia.";
    case "turn":
      return null;
    case "move":
      return event.target ? `${name(event.actor)} usa ${moveName(event.move)} su ${name(event.target)}.` : `${name(event.actor)} usa ${moveName(event.move)}.`;
    case "miss":
      return `${name(event.actor)} manca ${name(event.target)}.`;
    case "damage": {
      const extra = [event.critical ? "critico" : "", event.absorbed > 0 ? `${event.absorbed} sullo scudo` : ""].filter(Boolean).join(", ");
      return `${name(event.target)} −${event.amount}${extra ? ` (${extra})` : ""}.`;
    }
    case "heal":
      return event.amount > 0 ? `${name(event.target)} +${event.amount} Vita.` : null;
    case "shield":
      return event.amount > 0 ? `${name(event.target)} +${event.amount} di scudo.` : null;
    case "status":
      return `${name(event.target)}: ${STATUS_LABELS[event.status].name} per ${turns(event.turns)}.`;
    case "resisted":
      return event.immune ? `${name(event.target)} non si lascia stordire di nuovo subito.` : `${name(event.target)} resiste a ${STATUS_LABELS[event.status].name}.`;
    case "expired":
      return `${name(event.target)}: finisce ${STATUS_LABELS[event.status].name}.`;
    case "burn":
      return `${name(event.target)} brucia: −${event.amount}.`;
    case "stunned":
      return `${name(event.actor)} è stordito e perde il turno.`;
    case "passive":
      return `${name(event.actor)}: ${moveName(event.passive)}.`;
    case "charge":
      return event.amount > 0 ? `${name(event.target)} +${event.amount} di Carica.` : null;
    case "defeated":
      return `${name(event.target)} è KO!`;
    case "end":
      if (event.winner === "draw") return event.reason === "limit" ? "Pareggio dopo 100 azioni." : "Pareggio: cadono tutti.";
      return `${event.winner === playerSide ? "Vittoria" : "Sconfitta"}${event.reason === "limit" ? " dopo 100 azioni" : ""}!`;
  }
}
