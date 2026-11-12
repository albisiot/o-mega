import { pickOne, randomInt, shuffle, type Rng } from "./rng.ts";
import type { MatchRules, RareThreat, Threat, ThreatLevelRules, ThreatModifier } from "./types.ts";

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

/**
 * The rare threats that turn up in one match (SPEC §5.15): each one on its own,
 * once in `oneIn` matches. In random order; usually none.
 */
export function drawRareThreats(rng: Rng, rare: readonly RareThreat[]): RareThreat[] {
  return shuffle(rng, rare.filter((threat) => threat.oneIn > 0 && rng() < 1 / threat.oneIn));
}

/**
 * Puts the rare threats drawn for a match in place of some of its threats, one
 * per round, at random. When it can, it keeps among the others a threat of low
 * level and one of high level, as the level rules ask: the match stays varied.
 */
export function withRareThreats(
  rng: Rng,
  threats: readonly Threat[],
  rare: readonly Threat[],
  rules: Pick<ThreatLevelRules, "requireOneAtMost" | "requireOneAtLeast">,
): Threat[] {
  const result = [...threats];
  const replaced = new Set<number>();
  for (const threat of rare.slice(0, threats.length)) {
    const open = result.map((_, i) => i).filter((i) => !replaced.has(i));
    const keepsVariety = (slot: number) => {
      const others = open.filter((i) => i !== slot).map((i) => result[i].level);
      return (
        others.some((level) => level <= rules.requireOneAtMost) && others.some((level) => level >= rules.requireOneAtLeast)
      );
    };
    const good = open.filter(keepsVariety);
    const slot = pickOne(rng, good.length > 0 ? good : open);
    result[slot] = threat;
    replaced.add(slot);
  }
  return result;
}

/** The threats of a match: the usual draw, then the rare threats that turn up, if any. */
export function drawMatchThreats(
  rng: Rng,
  catalog: readonly Threat[],
  rare: readonly RareThreat[],
  rules: MatchRules,
): Threat[] {
  const threats = pickThreats(rng, catalog, drawThreatLevels(rng, rules));
  return withRareThreats(rng, threats, drawRareThreats(rng, rare), rules.threatLevels);
}

/**
 * The threat as it plays in this match: Al buio and Livello ignoto require the
 * abilities drawn for the match, Eco adds those of the round before.
 */
export function withRuleAbilities<T extends Threat>(threat: T): T {
  const modifier = threat.modifier;
  switch (modifier?.code) {
    case "blind":
    case "unknown_level":
      return modifier.abilities.length > 0
        ? { ...threat, abilities: [...modifier.abilities], level: modifier.abilities.length }
        : threat;
    case "echo": {
      const extra = modifier.abilities.filter((ability) => !threat.abilities.includes(ability));
      return extra.length > 0 ? { ...threat, abilities: [...threat.abilities, ...extra], level: threat.abilities.length + extra.length } : threat;
    }
    default:
      return threat;
  }
}

/** The numbers of the rare threats' rules (balance.ts `rareThreats.rules`, game_config `rare_threats.*`). */
export type RareRuleNumbers = {
  hostileBonus: number;
  hostileMalus: number;
  underdogBonus: number;
  underdogMalus: number;
  underdogCommonMaxRank: number;
  underdogEliteMinRank: number;
  allOrNothingMin: number;
  lastFirstBonus: number;
  lastFirstTopRank: number;
  priceMaxValue: number;
  priceMalus: number;
  countMin: number;
  countPoints: number;
  negativeMax: number;
};

/** The numbers of the places' rules (balance.ts `places`, game_config `places.*`), and of the rare threats'. */
export type PlaceRules = { longCountBonus: number; frostCap: number; duelCount: number; rare?: RareRuleNumbers };

function abilityList(params: Record<string, unknown> | null | undefined, code: string): string[] {
  const abilities = params?.abilities;
  if (!Array.isArray(abilities) || abilities.length === 0) throw new Error(`${code} needs a list of abilities`);
  return abilities.map(String);
}

function numberOr(params: Record<string, unknown> | null | undefined, key: string, fallback: number): number {
  const value = params?.[key];
  return value === undefined || value === null ? fallback : Number(value);
}

/**
 * The fixed rule of a threat as a threat modifier, from threat_definitions.modifier_code
 * and modifier_params: the same as the database's place_modifier. Null for a threat
 * without one. The rules drawn for each match (Al buio, Eco, Livello ignoto) come
 * with an empty list here: the match stores the real one.
 */
export function placeModifier(
  code: string | null | undefined,
  params: Record<string, unknown> | null | undefined,
  rules: PlaceRules,
): ThreatModifier | null {
  const rare = () => {
    if (!rules.rare) throw new Error(`The rule ${code} needs the numbers of the rare threats' rules`);
    return rules.rare;
  };
  switch (code) {
    case null:
    case undefined:
      return null;
    case "tomb_silence":
    case "focus":
    case "weak_link":
    case "mirror":
    case "reverse":
      return { code };
    case "long_count":
      return { code, bonus: rules.longCountBonus };
    case "abyss":
      return { code, abilities: abilityList(params, code) };
    case "frost":
      return { code, cap: numberOr(params, "cap", rules.frostCap) };
    case "duel":
      return { code, count: numberOr(params, "count", rules.duelCount) };
    case "hostile_ground": {
      const { favored, hindered } = params ?? {};
      if (typeof favored !== "string" || typeof hindered !== "string") throw new Error("hostile_ground needs two factions");
      return { code, favored, hindered, bonus: rare().hostileBonus, malus: rare().hostileMalus };
    }
    case "underdogs":
      return {
        code,
        commonMaxRank: rare().underdogCommonMaxRank,
        eliteMinRank: rare().underdogEliteMinRank,
        bonus: rare().underdogBonus,
        malus: rare().underdogMalus,
      };
    case "all_or_nothing":
      return { code, min: rare().allOrNothingMin };
    case "last_first":
      return { code, bonus: rare().lastFirstBonus, topRank: rare().lastFirstTopRank };
    case "price":
      return { code, maxValue: rare().priceMaxValue, malus: rare().priceMalus };
    case "one_force":
      return { code, abilities: abilityList(params, code) };
    case "blind":
    case "echo":
    case "unknown_level":
      return { code, abilities: [] };
    case "count":
      return { code, min: rare().countMin, points: rare().countPoints };
    case "negative":
      return { code, max: rare().negativeMax };
    default:
      throw new Error(`Unknown place rule: ${code}`);
  }
}
