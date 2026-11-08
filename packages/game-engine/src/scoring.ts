import type { AbilityCode, AbilityFamilies, Character, PlayScore, Side, Threat } from "./types.ts";

export type ScoreContext = {
  families: AbilityFamilies;
  /** Rounds won so far (before this round) by the character's side and by the opponent. */
  roundsWon: number;
  opponentRoundsWon: number;
  /** Bonus earned in the previous round (Riscossa), applied to this character. */
  carriedBonus: number;
  /** 1-based number of the round being played. */
  round: number;
  /** The character's whole team, already played characters included. */
  team: readonly Character[];
  /** Taken from each of the character's abilities this round (Sabotatore). */
  abilityMalus?: number;
  /** The opposing character of this round, when it is known (the server resolving a round). */
  opponent?: Character;
  /** Level of the previous round's threat; none in the first round (Crescendo). */
  previousLevel?: number;
};

/** How a round ended for one side: a void round is neither won nor lost. */
export type PlayOutcome = "won" | "lost" | "void";

function numberParam(character: Character, key: string): number {
  const value = Number(character.power?.params[key]);
  if (!Number.isFinite(value)) {
    throw new Error(`Power ${character.power?.code} of ${character.definitionId}: invalid param ${key}`);
  }
  return value;
}

/** An ability value in this round: Sabotatore lowers it, never below 0. */
function abilityValue(character: Character, ability: AbilityCode, malus: number): number {
  return Math.max(0, (character.stats[ability] ?? 0) - malus);
}

/** Sum of the character's values in the abilities required by the threat, with the value a modifier doubles. */
export function baseScore(character: Character, threat: Threat, malus = 0): number {
  const values = threat.abilities.map((ability) => abilityValue(character, ability, malus));
  const sum = values.reduce((total, value) => total + value, 0);
  switch (threat.modifier?.code) {
    case "focus":
      return sum + (values[0] ?? 0);
    case "weak_link":
      return sum + Math.min(...values);
    default:
      return sum;
  }
}

/** Points a modifier gives or takes whatever the abilities. */
export function modifierBonus(character: Character, threat: Threat): number {
  const modifier = threat.modifier;
  switch (modifier?.code) {
    case "hostile_ground":
      if (character.faction === modifier.favored) return modifier.bonus;
      return character.faction === modifier.hindered ? -modifier.malus : 0;
    case "underdogs":
      if (character.rarityRank <= modifier.commonMaxRank) return modifier.bonus;
      return character.rarityRank >= modifier.eliteMinRank ? -modifier.malus : 0;
    default:
      return 0;
  }
}

/** Highest single value among the required abilities (tie-break, no bonuses). */
export function highestRequired(character: Character, threat: Threat, malus = 0): number {
  return Math.max(0, ...threat.abilities.map((ability) => abilityValue(character, ability, malus)));
}

/** What a character with Sabotatore takes from each ability of the opposing character. */
export function abilityMalusFrom(character: Character): number {
  return character.power?.code === "sabotage" ? numberParam(character, "malus") : 0;
}

/** Spia: once played, its side sees one character the opponent has not played yet. */
export function revealsOpponentCharacter(character: Character): boolean {
  return character.power?.code === "spy";
}

/** Nemesi acts between Heroes and Villains: Neutrals have no nemesis. */
const NEMESIS: Record<string, string> = { heroes: "villains", villains: "heroes" };

/** Whether Nemesi pays against an opposing character of this faction. */
export function isNemesisOf(character: Character, opponentFaction: string): boolean {
  return NEMESIS[character.faction] === opponentFaction;
}

/** Annullatore: the opposing character's power does not act in this round. */
export function nullifiesPower(character: Character): boolean {
  return character.power?.code === "nullifier";
}

/**
 * The character as it plays against `opponent`: without its power when the
 * opponent is an Annullatore. Two Annullatori cancel each other.
 */
export function asPlayedAgainst(character: Character, opponent: Character | null | undefined): Character {
  return opponent && nullifiesPower(opponent) && character.power ? { ...character, power: null } : character;
}

/** Veggente: once played, its side sees every threat of the following rounds. */
export function revealsFutureThreats(character: Character): boolean {
  return character.power?.code === "foresight";
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
    case "opener":
      return context.round <= numberParam(character, "max_round") ? numberParam(character, "bonus") : 0;
    case "last_stand":
      return context.round >= numberParam(character, "min_round") ? numberParam(character, "bonus") : 0;
    case "bond": {
      const allies = context.team.filter((c) => c.id !== character.id && c.faction === character.faction).length;
      return allies * numberParam(character, "bonus");
    }
    case "shielded":
      return context.opponent && abilityMalusFrom(context.opponent) > 0 ? numberParam(character, "bonus") : 0;
    case "nemesis":
      return context.opponent && isNemesisOf(character, context.opponent.faction) ? numberParam(character, "bonus") : 0;
    case "all_rounder": {
      const min = numberParam(character, "min_value");
      const malus = context.abilityMalus ?? 0;
      return threat.abilities.every((ability) => abilityValue(character, ability, malus) >= min)
        ? numberParam(character, "bonus")
        : 0;
    }
    case "giant_slayer":
      return context.opponent && context.opponent.rarityRank - character.rarityRank >= numberParam(character, "min_gap")
        ? numberParam(character, "bonus")
        : 0;
    case "crescendo":
      return context.previousLevel !== undefined && threat.level > context.previousLevel ? numberParam(character, "bonus") : 0;
    case "comeback": // acts after the round: see carriedBonusAfter
    case "momentum": // acts after the round: see carriedBonusAfter
    case "nullifier": // acts on the opposing character: see asPlayedAgainst
    case "sabotage": // acts on the opposing character: see abilityMalusFrom
    case "foresight": // gives information, not points: see revealsFutureThreats
    case "relentless": // acts on ties: see compareScores
    case "spy": // gives information, not points: see revealsOpponentCharacter
      return 0;
    default:
      // A power the engine does not implement must never be silently ignored.
      throw new Error(`Unknown power: ${power.code}`);
  }
}

export function scorePlay(character: Character, threat: Threat, context: ScoreContext): PlayScore {
  // Schermato: immune to Sabotatore.
  if (character.power?.code === "shielded") context = { ...context, abilityMalus: 0 };
  const malus = context.abilityMalus ?? 0;
  const base = baseScore(character, threat, malus);
  // A malus cannot bring the score below 0: the bonus stays the difference from the base.
  const total = Math.max(0, base + powerBonus(character, threat, context) + context.carriedBonus + modifierBonus(character, threat));
  return {
    characterId: character.id,
    base,
    bonus: total - base,
    total,
    highest: highestRequired(character, threat, malus),
    ...(character.power?.code === "relentless" ? { relentless: true } : {}),
  };
}

/**
 * Bonus the next character of the same side gets: Riscossa after a lost round,
 * Slancio after a won one. A void round is neither. Pass the character as it
 * played (asPlayedAgainst): an Annullatore stops the bonus too.
 */
export function carriedBonusAfter(character: Character, outcome: PlayOutcome): number {
  const code = character.power?.code;
  if (code === "comeback" && outcome === "lost") return numberParam(character, "bonus");
  if (code === "momentum" && outcome === "won") return numberParam(character, "bonus");
  return 0;
}

/** Higher total wins; then Implacabile; then the higher single required value; otherwise void (SPEC §5.6). */
export function compareScores(a: PlayScore, b: PlayScore): Side | null {
  if (a.total !== b.total) return a.total > b.total ? "a" : "b";
  if (Boolean(a.relentless) !== Boolean(b.relentless)) return a.relentless ? "a" : "b";
  if (a.highest !== b.highest) return a.highest > b.highest ? "a" : "b";
  return null;
}
