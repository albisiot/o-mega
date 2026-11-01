// Emergenza: the daily solo challenge (SPEC §5.10). Knowing only the levels, the
// player picks a squad; each character then answers one threat. A threat is
// passed by reaching its required score, and the run ends at the last threat
// or at the failure limit. Pure: the Edge Function loads and stores.

import type { Rng } from "./rng.ts";
import { abilityMalusFrom, carriedBonusAfter, scorePlay } from "./scoring.ts";
import { drawThreatLevels, pickThreats } from "./threats.ts";
import type { AbilityFamilies, Character, MatchRules, PlayScore, Threat, ThreatLevelRules } from "./types.ts";

export type EmergencyRules = {
  /** Threats of a run, and characters of a squad: each answers exactly one. */
  threatsPerRun: number;
  maxFailures: number;
  /** Threat level → score needed to pass a threat of that level. */
  targets: Record<number, number>;
  threatLevels: ThreatLevelRules;
};

/** A threat already answered: what later plays need to know about it. */
export type EmergencyAttempt = { character: Character; passed: boolean };

export type EmergencyOutcome = {
  score: PlayScore;
  /** Score this character needed: the threat's target, minus its power's discounts. */
  required: number;
  passed: boolean;
};

/** The threats of a day: same draw as a match, with a longer sequence. */
export function drawEmergencyThreats(rng: Rng, catalog: readonly Threat[], rules: EmergencyRules): Threat[] {
  const levelRules = { threatsPerMatch: rules.threatsPerRun, threatLevels: rules.threatLevels } as MatchRules;
  return pickThreats(rng, catalog, drawThreatLevels(rng, levelRules));
}

/**
 * The score a character needs. There is no opposing character, so the two
 * powers that act on one act on the threat: Sabotatore takes its malus off
 * every required ability, and Implacabile is satisfied one point short (the
 * tie it would win against an opponent).
 */
export function requiredScore(character: Character, threat: Threat, rules: EmergencyRules): number {
  const target = rules.targets[threat.level];
  if (target === undefined) throw new Error(`No target for threat level ${threat.level}`);
  const sabotage = abilityMalusFrom(character) * threat.abilities.length;
  const relentless = character.power?.code === "relentless" ? 1 : 0;
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
}): EmergencyOutcome {
  const { character, threat, squad, attempts, rules, families } = params;
  const last = attempts.at(-1);
  const score = scorePlay(character, threat, {
    families,
    roundsWon: attempts.filter((a) => a.passed).length,
    opponentRoundsWon: attempts.filter((a) => !a.passed).length,
    carriedBonus: last ? carriedBonusAfter(last.character, !last.passed) : 0,
    round: attempts.length + 1,
    team: squad,
  });
  const required = requiredScore(character, threat, rules);
  return { score, required, passed: score.total >= required };
}

/** The run ends at the last threat or when the failures reach the limit. */
export function isEmergencyFinished(attempts: readonly EmergencyAttempt[], rules: EmergencyRules): boolean {
  return attempts.length >= rules.threatsPerRun || attempts.filter((a) => !a.passed).length >= rules.maxFailures;
}
