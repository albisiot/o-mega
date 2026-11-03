import { carriedBonusAfter, modifierBonus, type ThreatModifier } from "@o-mega/game-engine";
import { toCharacter, type MatchCard } from "@/lib/match";

/** One line about a power on the round result, shown next to the card it belongs to. */
export type PowerNote = { name: string; effect: string | null; active: boolean };

export type RoundOutcome = {
  /** Riscossa bonus this card received from the previous card of its side. */
  carried: number;
  lost: boolean;
  /** Implacabile settled a tie in this card's favor. */
  wonTie: boolean;
};

/**
 * What a card's power did in a resolved round: the points it added, what it took from the
 * opposing card, or nothing this time (the note is then dimmed). The server's bonus also holds
 * the Riscossa received and the threat modifier's points: they are taken out to isolate the power.
 */
export function roundPowerNotes(
  card: MatchCard,
  play: { bonus: number },
  threat: { level: number; abilities: string[]; modifier: ThreatModifier | null },
  outcome: RoundOutcome,
): PowerNote[] {
  const notes: PowerNote[] = [];
  const power = card.power;
  if (power) {
    const character = toCharacter(card, card.definition_id);
    switch (power.code) {
      case "sabotage":
        notes.push({ name: power.name, effect: `−${power.params.malus} a ogni abilità rivale`, active: true });
        break;
      case "relentless":
        notes.push({ name: power.name, effect: outcome.wonTie ? "vince la parità" : null, active: outcome.wonTie });
        break;
      case "comeback": {
        const passed = carriedBonusAfter(character, outcome.lost);
        notes.push({ name: power.name, effect: passed ? `+${passed} al prossimo` : null, active: passed > 0 });
        break;
      }
      case "foresight":
        notes.push({ name: power.name, effect: "svela le prossime Minacce", active: true });
        break;
      default: {
        const points = play.bonus - outcome.carried - modifierBonus(character, { id: "round", ...threat });
        notes.push({
          name: power.name,
          effect: points ? `${points > 0 ? "+" : "−"}${Math.abs(points)}` : null,
          active: points !== 0,
        });
      }
    }
  }
  if (outcome.carried > 0) notes.push({ name: "Riscossa", effect: `+${outcome.carried}`, active: true });
  return notes;
}

/** The Riscossa bonus a side's card receives from the card that side played in the previous round. */
export function carriedInto(previousCard: MatchCard | null | undefined, previousLost: boolean): number {
  return previousCard ? carriedBonusAfter(toCharacter(previousCard, previousCard.definition_id), previousLost) : 0;
}
