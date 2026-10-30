import type { AbilityFamilies, Character, PlayScore, Side, Threat } from "./types.ts";

export type ScoreContext = {
  families: AbilityFamilies;
  /** Rounds won so far (before this round) by the character's side and by the opponent. */
  roundsWon: number;
  opponentRoundsWon: number;
  /** Bonus earned in the previous round (Riscossa), applied to this character. */
  carriedBonus: number;
};

function numberParam(character: Character, key: string): number {
  const value = Number(character.power?.params[key]);
  if (!Number.isFinite(value)) {
    throw new Error(`Power ${character.power?.code} of ${character.definitionId}: invalid param ${key}`);
  }
  return value;
}

/** Sum of the character's values in the abilities required by the threat. */
export function baseScore(character: Character, threat: Threat): number {
  return threat.abilities.reduce((sum, ability) => sum + (character.stats[ability] ?? 0), 0);
}

/** Highest single value among the required abilities (tie-break, no bonuses). */
export function highestRequired(character: Character, threat: Threat): number {
  return Math.max(0, ...threat.abilities.map((ability) => character.stats[ability] ?? 0));
}

/** Bonus of the character's own power for this round (SPEC §4.4, M6 rules). */
export function powerBonus(character: Character, threat: Threat, context: ScoreContext): number {
  const power = character.power;
  if (!power) return 0;
  switch (power.code) {
    case "ability_bonus":
      return threat.abilities.includes(String(power.params.ability)) ? numberParam(character, "bonus") : 0;
    case "family_bonus": {
      const matching = threat.abilities.filter((ability) => context.families[ability] === power.params.family);
      return matching.length >= numberParam(character, "min_count") ? numberParam(character, "bonus") : 0;
    }
    case "level_bonus":
      return threat.level >= numberParam(character, "min_level") && threat.level <= numberParam(character, "max_level")
        ? numberParam(character, "bonus")
        : 0;
    case "underdog":
      return context.opponentRoundsWon > context.roundsWon ? numberParam(character, "bonus") : 0;
    case "comeback":
      // Acts after the round: see carriedBonusAfter.
      return 0;
    default:
      // A power the engine does not implement must never be silently ignored.
      throw new Error(`Unknown power: ${power.code}`);
  }
}

export function scorePlay(character: Character, threat: Threat, context: ScoreContext): PlayScore {
  const base = baseScore(character, threat);
  const bonus = powerBonus(character, threat, context) + context.carriedBonus;
  return { characterId: character.id, base, bonus, total: base + bonus, highest: highestRequired(character, threat) };
}

/**
 * Riscossa: when a character with "comeback" loses its round, the next
 * character of the same side gets the bonus. A void round is not a loss.
 */
export function carriedBonusAfter(character: Character, lost: boolean): number {
  return lost && character.power?.code === "comeback" ? numberParam(character, "bonus") : 0;
}

/** Higher total wins; then the higher single required value; otherwise void (SPEC §5.6). */
export function compareScores(a: PlayScore, b: PlayScore): Side | null {
  if (a.total !== b.total) return a.total > b.total ? "a" : "b";
  if (a.highest !== b.highest) return a.highest > b.highest ? "a" : "b";
  return null;
}
