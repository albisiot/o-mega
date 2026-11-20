import {
  abilityMalusFrom,
  isRelentless,
  isSaboteur,
  packBonus,
  relentlessMargin,
  scoreMalusFrom,
} from "@o-mega/game-engine";
import type { EmergencyPlay } from "@/lib/emergency";
import { toCharacter, type MatchCard } from "@/lib/match";
import { carriedInto, lastingSacrifice, roundPowerNotes, rulePowerOutcome, type PowerNote } from "@/lib/round-powers";
import { describeThreatModifier } from "@/lib/threat-modifiers";

/**
 * A power on an Emergenza result. `threshold` is how much it lowered the score the
 * character needed (Sabotatore, Implacabile): there is no opponent, so the powers that
 * act on one act on the threat (SPEC §5.10, requiredScore in the engine).
 */
export type EmergencyNote = PowerNote & { threshold?: number };

// Powers that need an opposing character: in Emergenza they do nothing.
const NEED_OPPONENT = new Set([
  "spy",
  "spy_many",
  "spy_rarest",
  "fog",
  "nullifier",
  "delayed_nullifier",
  "reflect",
  "shielded",
  "giant_slayer",
  "nemesis",
  "nemesis_other",
  "rival",
  "counterpunch",
  "opportunist",
  "underdog_points",
  "twin",
  "spoiler",
  "attrition",
  "infiltrator",
  "hunter",
  "vampire",
  "thief",
  "upset",
  "wall",
  "rival_frost",
  "rival_all_or_nothing",
  "rival_price",
  "rival_duel",
  "ambush",
  "tracker",
  "phoenix",
]);

/**
 * What the powers did in an Emergenza play: as in a match, with passed threats as rounds
 * won and failed ones as rounds lost. The bonus a card received from the previous ones
 * (Riscossa, Slancio), from Capobranco and from Sacrificio are told apart, as in a match.
 */
export function emergencyPowerNotes(
  card: MatchCard,
  play: Pick<EmergencyPlay, "round" | "level" | "threat" | "bonus" | "passed" | "parts" | "modifier">,
  /** The plays before this one, in order, each with its card and its score minus the score it needed. */
  before: { card: MatchCard; passed: boolean; margin?: number }[],
  /** Adds each note's power code and source, for the page's visual families (round-powers.ts). */
  annotate = false,
): EmergencyNote[] {
  const previous = before.at(-1);
  const twoBack = before.at(-2);
  const outcome = (b: { passed: boolean }) => (b.passed ? ("won" as const) : ("lost" as const));
  const carried = carriedInto(
    previous?.card,
    previous ? outcome(previous) : "void",
    null,
    null,
    previous?.margin,
    twoBack ? { card: twoBack.card, outcome: outcome(twoBack) } : undefined,
  );
  // No opponent, so no Annullatore: every card before played with its power.
  const played = before.map((b) => toCharacter(b.card, b.card.definition_id));
  const sacrifice = lastingSacrifice(played, before.map((b) => b.card));
  const standing = { roundsWon: before.filter((b) => b.passed).length, opponentRoundsWon: before.filter((b) => !b.passed).length };
  // Calma piatta: the threat's rule did not count for this play.
  const rule = play.modifier ?? play.threat.modifier ?? null;
  const notes: EmergencyNote[] = roundPowerNotes(
    card,
    { bonus: play.bonus },
    { level: play.level, abilities: play.threat.abilities, modifier: null },
    {
      ...rulePowerOutcome(
        toCharacter(card, card.definition_id),
        null,
        { id: "emergency", level: play.level, abilities: play.threat.abilities, modifier: null },
        { families: {}, played },
        { previous: previous?.card },
      ),
      calmedRule: card.power?.code === "calm" && rule ? describeThreatModifier(rule, play.threat.abilities[0] ?? "").name : undefined,
      // The server's parts, when it sent them, say exactly what came from where.
      carried: play.parts?.carried ?? carried.points,
      carriedFrom: carried.from,
      carriedCode: carried.code,
      lost: !play.passed,
      won: play.passed,
      wonTie: false,
      parts: play.parts,
      pack: play.parts?.pack ?? packBonus(toCharacter(card, card.definition_id), played),
      sacrifice: play.parts ? (play.parts.sacrifice ?? 0) : sacrifice.points,
      sacrificeFrom: sacrifice.from,
      standing,
    },
    annotate,
  );
  const power = card.power;
  if (!power) return notes;
  const character = toCharacter(card, card.definition_id);
  const threat = { id: "emergency", level: play.level, abilities: play.threat.abilities };
  return notes.map((note, index) => {
    // The card's own power is always the first note.
    if (index > 0) return note;
    const tag = annotate ? { code: power.code, source: "own" as const } : {};
    // Under Rovescio the target is the most a play may score: the engine moves it for
    // no power (requiredScore), so Sabotatore and Implacabile do nothing there.
    if ((play.modifier ?? play.threat.modifier)?.code === "reverse" && (isSaboteur(character) || isRelentless(character))) {
      return { name: power.name, effect: "sotto Rovescio non agisce", active: false, ...tag };
    }
    if (isSaboteur(character)) {
      const threshold = abilityMalusFrom(character, threat) * play.threat.abilities.length + scoreMalusFrom(character);
      return threshold > 0
        ? { name: power.name, effect: `soglia −${threshold}`, active: true, threshold, ...tag }
        : { name: power.name, effect: null, active: false, ...tag };
    }
    if (isRelentless(character)) {
      const threshold = 1 + relentlessMargin(character, threat, standing);
      const effect = threshold === 1 ? "gli basta un punto in meno" : `gli bastano ${threshold} punti in meno`;
      return { name: power.name, effect, active: true, threshold, ...tag };
    }
    if (NEED_OPPONENT.has(power.code) && !note.points) return { name: power.name, effect: "senza avversario non agisce", active: false, ...tag };
    return note;
  });
}
