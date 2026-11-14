import {
  asPlayedAgainst,
  carriedBonusAfter,
  modifierPoints,
  type Character,
  type PlayOutcome,
  type ScoreParts,
  type Standing,
  type Threat,
  type ThreatModifier,
} from "@o-mega/game-engine";
import { toCharacter, type MatchCard, type MatchRound } from "@/lib/match";

/**
 * One line about a power on the round result, shown next to the card it belongs to. `points`
 * is what it added to this card's score in this round; `timing` says when it shows: on a tie it
 * settled (Implacabile) or after the result, for the next card (Riscossa, Slancio and the like).
 */
export type PowerNote = {
  name: string;
  effect: string | null;
  active: boolean;
  points?: number;
  timing?: "tie" | "after";
  /**
   * The power's code, for its family on the page (effect-families.ts); `source` says whose
   * power it is: this card's own, the one that passed a bonus from the card before, or
   * Capobranco. `cancelled`: why the card's own power did nothing. Only with `annotate`.
   */
  code?: string;
  source?: "own" | "carried" | "pack";
  cancelled?: "nullified" | "silenced" | "blocked";
};

export type RoundOutcome = {
  /** Bonus this card received from the previous card of its side (Riscossa or Slancio). */
  carried: number;
  /** Name of the power that passed that bonus; Riscossa when not given. */
  carriedFrom?: string;
  /** Code of that power (annotated notes only); Riscossa's when not given. */
  carriedCode?: string;
  lost: boolean;
  won?: boolean;
  /** An opposing Annullatore took this card's power away. */
  nullified?: boolean;
  /** Silenzio della tomba: no power acted in this round. */
  silenced?: boolean;
  /** Rounds won by this card's side and by the other before the round (Il conto lungo). */
  standing?: Standing;
  /** The opposing card has a power (what an Annullatore takes away). */
  opponentHasPower?: boolean;
  /** Implacabile settled a tie in this card's favor. */
  wonTie: boolean;
  /** The opposing card had Schermato or Riflesso, which Sabotatore cannot touch. */
  opponentShielded?: boolean;
  /** What the opposing card's Sabotatore takes from each ability (what Riflesso sends back). */
  opponentSabotage?: number;
  /** Bonus this card received from Capobranco cards its side played before. */
  pack?: number;
  /**
   * Where the server says the bonus comes from: when given, the power's points are taken
   * from it instead of being worked out from the bonus.
   */
  parts?: ScoreParts | null;
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
  /** Adds each note's power code and source, for the page's visual families. */
  annotate = false,
): PowerNote[] {
  const notes: PowerNote[] = [];
  const power = card.power;
  if (power && outcome.silenced) {
    notes.push({ name: power.name, effect: "zittito dalla tomba", active: false });
  } else if (power && outcome.nullified) {
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
        notes.push({ name: power.name, effect: outcome.wonTie ? "vince la parità" : null, active: outcome.wonTie, timing: "tie" });
        break;
      case "comeback":
      case "momentum": {
        const result: PlayOutcome = outcome.lost ? "lost" : outcome.won ? "won" : "void";
        const passed = carriedBonusAfter(character, result);
        notes.push({ name: power.name, effect: passed ? `+${passed} al prossimo` : null, active: passed > 0, timing: "after" });
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
      case "reflect":
        notes.push(
          outcome.opponentSabotage
            ? { name: power.name, effect: `rimanda −${outcome.opponentSabotage} a ogni abilità`, active: true }
            : { name: power.name, effect: null, active: false },
        );
        break;
      case "sacrifice":
        notes.push({ name: power.name, effect: `+${power.params.bonus} al prossimo`, active: true, timing: "after" });
        break;
      case "catalyst":
        notes.push({ name: power.name, effect: `×${power.params.multiplier} al potere del prossimo`, active: true, timing: "after" });
        break;
      case "pack_leader":
        notes.push({ name: power.name, effect: `+${power.params.bonus} ai prossimi della fazione`, active: true, timing: "after" });
        break;
      case "fog":
        notes.push({ name: power.name, effect: "nasconde chi l'ha giocato", active: true });
        break;
      default: {
        const points = outcome.parts
          ? outcome.parts.power
          : play.bonus - outcome.carried - (outcome.pack ?? 0) - modifierPoints(character, { id: "round", ...threat }, outcome.standing);
        notes.push(
          points
            ? { name: power.name, effect: `${points > 0 ? "+" : "−"}${Math.abs(points)}`, active: true, points }
            : { name: power.name, effect: null, active: false },
        );
      }
    }
  }
  if (annotate && power && notes[0]) {
    const cancelled = outcome.silenced ? "silenced" : outcome.nullified ? "nullified" : undefined;
    notes[0] = { ...notes[0], code: power.code, source: "own", ...(cancelled ? { cancelled } : {}) };
    // Sabotatore against Schermato or Riflesso: it struck, the shield stopped it.
    if (!cancelled && power.code === "sabotage" && outcome.opponentShielded) {
      notes[0] = { ...notes[0], effect: "fermato dallo scudo", cancelled: "blocked" };
    }
  }
  if (outcome.carried > 0) {
    notes.push({
      name: outcome.carriedFrom ?? "Riscossa",
      effect: `+${outcome.carried}`,
      active: true,
      points: outcome.carried,
      ...(annotate ? { code: outcome.carriedCode ?? "comeback", source: "carried" as const } : {}),
    });
  }
  if (outcome.pack) {
    notes.push({
      name: "Capobranco",
      effect: `+${outcome.pack}`,
      active: true,
      points: outcome.pack,
      ...(annotate ? { code: "pack_leader", source: "pack" as const } : {}),
    });
  }
  return notes;
}

/**
 * The cards a side played in the rounds before `round`, in order, as they played:
 * without the power an opposing Annullatore took away (Capobranco, Catalizzatore, Riverbero).
 */
export function playedBefore(
  rounds: readonly MatchRound[],
  team: readonly (MatchCard & { instance_id: string })[],
  round: number,
  side: "me" | "opponent",
): Character[] {
  return [...rounds]
    .filter((r) => r.resolved && r.round < round)
    .sort((x, y) => x.round - y.round)
    .flatMap((r) => {
      const mine = team.find((card) => card.instance_id === r.my_play?.instance_id);
      const theirs = r.opponent_play;
      const [own, other] = side === "me" ? [mine, theirs] : [theirs, mine];
      if (!own) return [];
      const character = toCharacter(own, own.definition_id);
      return [asPlayedAgainst(character, other ? toCharacter(other, "opponent") : null, roundThreat(r))];
    });
}

/** A round's threat as the rules engine reads it. */
export function roundThreat(round: Pick<MatchRound, "level" | "threat" | "modifier">): Threat {
  return { id: "round", level: round.level, abilities: round.threat.abilities, modifier: round.modifier };
}

/** Silenzio della tomba: no power acted in a round with this modifier. */
export function wasSilenced(card: MatchCard | null | undefined, modifier: ThreatModifier | null | undefined): boolean {
  return Boolean(card?.power && modifier?.code === "tomb_silence");
}

/**
 * Whether an opposing Annullatore took `card`'s power away in a round. On a threat
 * that silences every power the Annullatore has none to use: see wasSilenced.
 */
export function wasNullified(
  card: MatchCard | null | undefined,
  opponent: MatchCard | null | undefined,
  modifier?: ThreatModifier | null,
): boolean {
  return Boolean(card?.power && opponent?.power?.code === "nullifier" && modifier?.code !== "tomb_silence");
}

/**
 * Whether a tie went to `winner` through Implacabile: the engine checks it before the
 * highest value. Not when both have it, nor when it was taken away (Annullatore, Silenzio).
 */
export function tieWonByRelentless(
  winner: MatchCard | null | undefined,
  loser: MatchCard | null | undefined,
  modifier: ThreatModifier | null | undefined,
): boolean {
  if (winner?.power?.code !== "relentless" || wasNullified(winner, loser, modifier) || wasSilenced(winner, modifier)) return false;
  const loserHasIt = loser?.power?.code === "relentless" && !wasNullified(loser, winner, modifier) && !wasSilenced(loser, modifier);
  return !loserHasIt;
}

/**
 * Why a round with equal totals went one way, or to nobody (SPEC §5.6), in a few words
 * to put after "Pari 7 a 7". `winner` is null for a void round; `relentless` is the
 * winner's name when Implacabile settled it.
 */
export function tieBreakReason(
  winner: { highest: number } | null,
  other: { highest: number },
  modifier: ThreatModifier | null | undefined,
  relentless: string | null = null,
): string {
  if (!winner) return `stesso valore più alto (${other.highest}): round nullo`;
  if (relentless) return `vince ${relentless} con Implacabile`;
  const values = `${winner.highest} contro ${other.highest}`;
  if (modifier?.code === "reverse") return `con Rovescio vince il valore più alto più basso, ${values}`;
  if (modifier?.code === "negative") return `vince il valore più alto, contato al rovescio come vuole Negativo: ${values}`;
  return `vince il valore più alto, ${values}`;
}

/**
 * The bonus a side's card receives from the card that side played in the previous
 * round (Riscossa after a loss, Slancio after a win), and the power that gave it.
 * Nothing when an opposing Annullatore, or Silenzio della tomba, stopped that power.
 */
export function carriedInto(
  previousCard: MatchCard | null | undefined,
  previousOutcome: PlayOutcome,
  previousOpponent?: MatchCard | null,
  previousThreat?: Threat | null,
): { points: number; from: string | undefined; code?: string } {
  if (!previousCard) return { points: 0, from: undefined };
  const opponent = previousOpponent ? toCharacter(previousOpponent, "opponent") : null;
  const character = asPlayedAgainst(toCharacter(previousCard, previousCard.definition_id), opponent, previousThreat);
  const points = carriedBonusAfter(character, previousOutcome);
  return points > 0 ? { points, from: previousCard.power?.name, code: previousCard.power?.code } : { points, from: undefined };
}

/** How a round ended for the viewer's side, from the winner the server reports. */
export function outcomeOf(winner: "me" | "opponent" | "none" | null | undefined, side: "me" | "opponent"): PlayOutcome {
  if (winner === "me" || winner === "opponent") return winner === side ? "won" : "lost";
  return "void";
}
