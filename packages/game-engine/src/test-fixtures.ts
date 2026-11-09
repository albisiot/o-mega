// Shared test data for the engine tests (not part of the public API).

import type { BossRules, BossState } from "./boss.ts";
import type { AbilityFamilies, Character, MatchRules, MatchState, Power, Threat } from "./types.ts";

export const ABILITIES = ["FOR", "VEL", "RES", "INT", "VOL", "PER", "ENE", "MAG", "PSI", "COM", "TEC", "FUR"];

export const FAMILIES: AbilityFamilies = {
  FOR: "body", VEL: "body", RES: "body",
  INT: "mind", VOL: "mind", PER: "mind",
  ENE: "power", MAG: "power", PSI: "power",
  COM: "craft", TEC: "craft", FUR: "craft",
};

export const RULES: MatchRules = {
  teamSize: 5,
  threatsPerMatch: 5,
  roundsToWin: 3,
  threatLevels: { min: 1, max: 6, requireOneAtMost: 2, requireOneAtLeast: 5, minSum: 14, maxSum: 20 },
};

/** A character with every ability at `base`, overridden by `stats`. */
export function character(id: string, stats: Record<string, number> = {}, power: Power | null = null, base = 4): Character {
  return {
    id,
    definitionId: `def-${id}`,
    faction: "neutrals",
    rarityRank: 2,
    stats: Object.fromEntries(ABILITIES.map((ability) => [ability, stats[ability] ?? base])),
    power,
  };
}

export function threat(id: string, abilities: string[]): Threat {
  return { id, level: abilities.length, abilities };
}

export function newState(teamA: Character[], teamB: Character[], threats: Threat[]): MatchState {
  return { rules: RULES, threats, teams: { a: teamA, b: teamB }, rounds: [] };
}

/** A catalog of 60 threats, 10 per level, cycling through the abilities. */
export function threatCatalog(): Threat[] {
  const threats: Threat[] = [];
  for (let level = 1; level <= 6; level++) {
    for (let i = 0; i < 10; i++) {
      const abilities = Array.from({ length: level }, (_, k) => ABILITIES[(i * 5 + k * 7) % 12]);
      threats.push(threat(`T${level}${i}`, [...new Set(abilities)].length === level ? abilities : ABILITIES.slice(i % 6, (i % 6) + level)));
    }
  }
  return threats;
}

// Grande Minaccia

export const BOSS_RULES: BossRules = {
  turns: 5,
  fronts: 5,
  hotFronts: 2,
  hotValue: 2,
  baseValue: 1,
  growth: 1,
  extraFronts: 2,
  extraGrowth: 1,
  targets: { 1: 4, 2: 7, 3: 9, 4: 12, 5: 14, 6: 16 },
};

/** Levels 1, 2, 3, 4, 6: valid as a match (one low, one high, sum 16). */
export const FRONTS: Threat[] = [
  threat("f1", ["FOR"]),
  threat("f2", ["VEL", "RES"]),
  threat("f3", ["INT", "VOL", "PER"]),
  threat("f4", ["ENE", "MAG", "PSI", "COM"]),
  threat("f6", ["FOR", "VEL", "RES", "INT", "VOL", "PER"]),
];

export const VALUES = [
  [2, 2, 1, 1, 1],
  [3, 4, 2, 3, 2],
  [5, 5, 4, 4, 3],
  [6, 7, 5, 5, 5],
  [8, 8, 6, 7, 6],
];

export function bossState(teamA: Character[], teamB: Character[], values = VALUES): BossState {
  return { rules: BOSS_RULES, fronts: FRONTS, values, teams: { a: teamA, b: teamB }, turns: [] };
}
