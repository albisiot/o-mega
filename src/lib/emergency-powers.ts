import { abilityMalusFrom, packBonus } from "@o-mega/game-engine";
import type { EmergencyPlay } from "@/lib/emergency";
import { toCharacter, type MatchCard } from "@/lib/match";
import { carriedInto, roundPowerNotes, type PowerNote } from "@/lib/round-powers";

/**
 * A power on an Emergenza result. `threshold` is how much it lowered the score the
 * character needed (Sabotatore, Implacabile): there is no opponent, so the powers that
 * act on one act on the threat (SPEC §5.10, requiredScore in the engine).
 */
export type EmergencyNote = PowerNote & { threshold?: number };

// Powers that need an opposing character: in Emergenza they do nothing.
const NEED_OPPONENT = new Set([
  "spy",
  "fog",
  "nullifier",
  "reflect",
  "shielded",
  "giant_slayer",
  "nemesis",
  "counterpunch",
  "opportunist",
]);

/**
 * What the powers did in an Emergenza play: as in a match, with passed threats as rounds
 * won and failed ones as rounds lost. The bonus a card received from the previous one
 * (Riscossa, Slancio) and from Capobranco are told apart, as in a match.
 */
export function emergencyPowerNotes(
  card: MatchCard,
  play: Pick<EmergencyPlay, "round" | "level" | "threat" | "bonus" | "passed">,
  /** The plays before this one, in order, each with its card. */
  before: { card: MatchCard; passed: boolean }[],
): EmergencyNote[] {
  const previous = before.at(-1);
  const carried = carriedInto(previous?.card, previous ? (previous.passed ? "won" : "lost") : "void");
  const notes: EmergencyNote[] = roundPowerNotes(
    card,
    { bonus: play.bonus },
    { level: play.level, abilities: play.threat.abilities, modifier: null },
    {
      carried: carried.points,
      carriedFrom: carried.from,
      lost: !play.passed,
      won: play.passed,
      wonTie: false,
      pack: packBonus(
        toCharacter(card, card.definition_id),
        before.map((b) => toCharacter(b.card, b.card.definition_id)),
      ),
      standing: { roundsWon: before.filter((b) => b.passed).length, opponentRoundsWon: before.filter((b) => !b.passed).length },
    },
  );
  const power = card.power;
  if (!power) return notes;
  return notes.map((note, index) => {
    // The card's own power is always the first note.
    if (index > 0) return note;
    if (power.code === "sabotage") {
      const threshold = abilityMalusFrom(toCharacter(card, card.definition_id)) * play.threat.abilities.length;
      return { name: power.name, effect: `soglia −${threshold}`, active: true, threshold };
    }
    if (power.code === "relentless") return { name: power.name, effect: "gli basta un punto in meno", active: true, threshold: 1 };
    if (NEED_OPPONENT.has(power.code) && !note.points) return { name: power.name, effect: "senza avversario non agisce", active: false };
    return note;
  });
}
