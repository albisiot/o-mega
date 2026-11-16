// Emergenza: the daily solo challenge (SPEC §5.10). Knowing only the levels, the
// player picks a squad; each character then answers one threat. A threat is
// passed by reaching its required score, and the run ends at the last threat
// or at the failure limit. Pure: the Edge Function loads and stores.

import type { Rng } from "./rng.ts";
import {
  abilityMalusFrom,
  carriedBonusFrom,
  isRelentless,
  lowerWins,
  powersSilenced,
  relentlessMargin,
  scoreMalusFrom,
  scorePlay,
  type Standing,
} from "./scoring.ts";
import { drawMatchThreats } from "./threats.ts";
import type { AbilityFamilies, Character, MatchRules, PlayScore, RareThreat, Threat, ThreatLevelRules } from "./types.ts";

export type EmergencyRules = {
  /** Threats of a run, and characters of a squad: each answers exactly one. */
  threatsPerRun: number;
  maxFailures: number;
  /** Threat level → score needed to pass a threat of that level. */
  targets: Record<number, number>;
  threatLevels: ThreatLevelRules;
};

/** A threat already answered: what later plays need to know about it. */
export type EmergencyAttempt = {
  character: Character;
  passed: boolean;
  /** Level of its threat (Crescendo). */
  level: number;
  /** Score minus the score it needed (Riscossa sullo scarto); none for plays stored without it. */
  margin?: number;
};

export type EmergencyOutcome = {
  score: PlayScore;
  /** Score this character needed: the threat's target, minus its power's discounts. Under Rovescio, the most it could score. */
  required: number;
  passed: boolean;
};

/** The threats of a day: same draw as a match, with a longer sequence, rare threats included. */
export function drawEmergencyThreats(
  rng: Rng,
  catalog: readonly Threat[],
  rules: EmergencyRules,
  rare: readonly RareThreat[] = [],
): Threat[] {
  const levelRules = { threatsPerMatch: rules.threatsPerRun, threatLevels: rules.threatLevels } as MatchRules;
  return drawMatchThreats(rng, catalog, rare, levelRules);
}

/**
 * The score a character needs. There is no opposing character, so the powers
 * that act on one act on the threat: Sabotatore takes its malus off every required
 * ability (the variant for the big threats only from its level; the one on the score
 * once off the target), and Implacabile is satisfied one point short (the tie it would
 * win against an opponent), its variants also by their margin when it applies (failed
 * threats count as rounds lost). Annullatore, Davide, Contrattacco, Opportunista,
 * Riflesso and Nebbia need an opposing character: they do nothing.
 */
export function requiredScore(
  character: Character,
  threat: Threat,
  rules: Pick<EmergencyRules, "targets">,
  standing: Standing = { roundsWon: 0, opponentRoundsWon: 0 },
): number {
  // A rare threat has its own target; under Rovescio it is the most a play may score.
  const target = threat.target ?? rules.targets[threat.level];
  if (target === undefined) throw new Error(`No target for threat level ${threat.level}`);
  if (lowerWins(threat)) return target;
  // Silenzio della tomba: no power, so no discount. Emergenza draws only threats of
  // Nuova Megara, which have no such effect; this keeps the rule right anyway.
  if (powersSilenced(threat)) return target;
  const sabotage = abilityMalusFrom(character, threat) * threat.abilities.length + scoreMalusFrom(character);
  const relentless = isRelentless(character) ? 1 + relentlessMargin(character, threat, standing) : 0;
  return Math.max(0, target - sabotage - relentless);
}

/** Scores a play. Powers read the run as a match: passed threats are rounds won, failed ones rounds lost. */
export function resolveEmergencyPlay(params: {
  character: Character;
  threat: Threat;
  squad: readonly Character[];
  attempts: readonly EmergencyAttempt[];
  rules: EmergencyRules;
  families: AbilityFamilies;
  /** Levels of the day's threats, in order (Grande prova). */
  threatLevels?: readonly number[];
}): EmergencyOutcome {
  const { character, threat, squad, attempts, rules, families, threatLevels } = params;
  const last = attempts.at(-1);
  const standing = { roundsWon: attempts.filter((a) => a.passed).length, opponentRoundsWon: attempts.filter((a) => !a.passed).length };
  const score = scorePlay(character, threat, {
    families,
    ...standing,
    carriedBonus: carriedBonusFrom(
      attempts.map((a) => ({ character: a.character, outcome: a.passed ? "won" : "lost", margin: a.margin })),
    ),
    round: attempts.length + 1,
    team: squad,
    previousLevel: last?.level,
    previousOutcome: last ? (last.passed ? "won" : "lost") : undefined,
    threatLevels,
    // No opponent, so no Annullatore: every character played with its power.
    played: attempts.map((a) => a.character),
  });
  const required = requiredScore(character, threat, rules, standing);
  return { score, required, passed: lowerWins(threat) ? score.total <= required : score.total >= required };
}

/** The run ends at the last threat or when the failures reach the limit. */
export function isEmergencyFinished(attempts: readonly EmergencyAttempt[], rules: EmergencyRules): boolean {
  return attempts.length >= rules.threatsPerRun || attempts.filter((a) => !a.passed).length >= rules.maxFailures;
}
