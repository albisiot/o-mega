import { asPlayedAgainst, carriedBonusAfter, modifierBonus, type PlayOutcome, type ThreatModifier } from "@o-mega/game-engine";
import { toCharacter, type MatchCard } from "@/lib/match";

/** One line about a power on the round result, shown next to the card it belongs to. */
export type PowerNote = { name: string; effect: string | null; active: boolean };

export type RoundOutcome = {
  /** Bonus this card received from the previous card of its side (Riscossa or Slancio). */
  carried: number;
  /** Name of the power that passed that bonus; Riscossa when not given. */
  carriedFrom?: string;
  lost: boolean;
  won?: boolean;
  /** An opposing Annullatore took this card's power away. */
  nullified?: boolean;
  /** The opposing card has a power (what an Annullatore takes away). */
  opponentHasPower?: boolean;
  /** Implacabile settled a tie in this card's favor. */
  wonTie: boolean;
  /** The opposing card had Schermato, which Sabotatore cannot touch. */
  opponentShielded?: boolean;
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
  if (power && outcome.nullified) {
    notes.push({ name: power.name, effect: "annullato", active: false });
  } else if (power) {
    const character = toCharacter(card, card.definition_id);
    switch (power.code) {
      case "sabotage":
        notes.push(
          outcome.opponentShielded
            ? { name: power.name, effect: null, active: false }
            : { name: power.name, effect: `−${power.params.malus} a ogni abilità rivale`, active: true },
        );
        break;
      case "spy":
        notes.push({ name: power.name, effect: "svela un personaggio rivale", active: true });
        break;
      case "relentless":
        notes.push({ name: power.name, effect: outcome.wonTie ? "vince la parità" : null, active: outcome.wonTie });
        break;
      case "comeback":
      case "momentum": {
        const result: PlayOutcome = outcome.lost ? "lost" : outcome.won ? "won" : "void";
        const passed = carriedBonusAfter(character, result);
        notes.push({ name: power.name, effect: passed ? `+${passed} al prossimo` : null, active: passed > 0 });
        break;
      }
      case "nullifier":
        notes.push({
          name: power.name,
          effect: outcome.opponentHasPower ? "annulla il potere rivale" : null,
          active: Boolean(outcome.opponentHasPower),
        });
        break;
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
  if (outcome.carried > 0) {
    notes.push({ name: outcome.carriedFrom ?? "Riscossa", effect: `+${outcome.carried}`, active: true });
  }
  return notes;
}

/** Whether an opposing Annullatore took `card`'s power away in a round. */
export function wasNullified(card: MatchCard | null | undefined, opponent: MatchCard | null | undefined): boolean {
  return Boolean(card?.power && opponent?.power?.code === "nullifier");
}

/**
 * The bonus a side's card receives from the card that side played in the previous
 * round (Riscossa after a loss, Slancio after a win), and the power that gave it.
 * Nothing when an opposing Annullatore stopped that power.
 */
export function carriedInto(
  previousCard: MatchCard | null | undefined,
  previousOutcome: PlayOutcome,
  previousOpponent?: MatchCard | null,
): { points: number; from: string | undefined } {
  if (!previousCard) return { points: 0, from: undefined };
  const opponent = previousOpponent ? toCharacter(previousOpponent, "opponent") : null;
  const character = asPlayedAgainst(toCharacter(previousCard, previousCard.definition_id), opponent);
  const points = carriedBonusAfter(character, previousOutcome);
  return { points, from: points > 0 ? previousCard.power?.name : undefined };
}

/** How a round ended for the viewer's side, from the winner the server reports. */
export function outcomeOf(winner: "me" | "opponent" | "none" | null | undefined, side: "me" | "opponent"): PlayOutcome {
  if (winner === "me" || winner === "opponent") return winner === side ? "won" : "lost";
  return "void";
}
