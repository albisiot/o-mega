// Shared test data for the engine tests (not part of the public API).

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
