import { pickOne, randomInt, type Rng } from "./rng.ts";
import type { MatchRules, Threat, ThreatLevelRules } from "./types.ts";

/** Level composition of a match (SPEC §5.4): variety between low and high levels. */
export function isValidLevelSequence(levels: readonly number[], rules: ThreatLevelRules): boolean {
  const sum = levels.reduce((total, level) => total + level, 0);
  return (
    levels.every((level) => Number.isInteger(level) && level >= rules.min && level <= rules.max) &&
    levels.some((level) => level <= rules.requireOneAtMost) &&
    levels.some((level) => level >= rules.requireOneAtLeast) &&
    sum >= rules.minSum &&
    sum <= rules.maxSum
  );
}

/** Draws the level sequence of a match, in random order. */
export function drawThreatLevels(rng: Rng, rules: MatchRules): number[] {
  const { threatLevels, threatsPerMatch } = rules;
  for (let attempt = 0; attempt < 10_000; attempt++) {
    const levels = Array.from(
      { length: threatsPerMatch },
      () => threatLevels.min + randomInt(rng, threatLevels.max - threatLevels.min + 1),
    );
    if (isValidLevelSequence(levels, threatLevels)) return levels;
  }
  throw new Error("No valid threat level sequence for these rules");
}

/** One distinct threat of the right level per round. */
export function pickThreats(rng: Rng, catalog: readonly Threat[], levels: readonly number[]): Threat[] {
  const picked: Threat[] = [];
  for (const level of levels) {
    const candidates = catalog.filter((threat) => threat.level === level && !picked.includes(threat));
    if (candidates.length === 0) throw new Error(`Not enough threats of level ${level}`);
    picked.push(pickOne(rng, candidates));
  }
  return picked;
}
