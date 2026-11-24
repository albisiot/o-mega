// Scontro a squadre (SPEC §5.19, docs/COMBAT.md): the words of the screen. Names of the slots,
// statuses and triggers, a short description of a move from its data, and one line of the log
// for each event. The player's names for statuses and moves are still provisional.
import type { CombatEffect, CombatEvent, CombatMove, CombatSlot, CombatStatusCode, Side } from "@o-mega/game-engine";

export const SLOT_LABELS: Record<CombatSlot, string> = { base: "Base", special: "Speciale", supreme: "Suprema" };

/** Name, three letters for the badge, and whether it helps who has it. */
export const STATUS_LABELS: Record<CombatStatusCode, { name: string; short: string; good: boolean }> = {
  empower: { name: "Potenziamento", short: "POT", good: true },
  fortify: { name: "Fortificazione", short: "FOR", good: true },
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
