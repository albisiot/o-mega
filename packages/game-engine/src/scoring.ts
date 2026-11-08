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
  /** How the side's previous round ended; none in the first round (Vendetta). */
  previousOutcome?: PlayOutcome;
  /** Levels of every threat of the match, in order (Grande prova). */
  threatLevels?: readonly number[];
  /**
   * The side's characters already played, in order, as they played: without the
   * power an Annullatore took away (Capobranco, Catalizzatore, Riverbero).
   */
  played?: readonly Character[];
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
  const modifier = threat.modifier;
  switch (modifier?.code) {
    case "focus":
      return sum + (values[0] ?? 0);
    case "weak_link":
      return sum + Math.min(...values);
    case "abyss": {
      const doubled = modifier.abilities;
      return sum + threat.abilities.reduce((extra, ability, i) => (doubled.includes(ability) ? extra + values[i] : extra), 0);
    }
    case "frost": {
      const cap = modifier.cap;
      return values.reduce((total, value) => total + Math.min(value, cap), 0);
    }
    case "duel":
      return [...values]
        .sort((x, y) => y - x)
        .slice(0, modifier.count)
        .reduce((total, value) => total + value, 0);
    default:
      return sum;
  }
}

/** Silenzio della tomba: in this round no power acts, on either side. */
export function powersSilenced(threat: Threat | null | undefined): boolean {
  return threat?.modifier?.code === "tomb_silence";
}

/** Rounds won so far by a side and by its opponent (Il conto lungo). */
export type Standing = { roundsWon: number; opponentRoundsWon: number };

/**
 * Points a modifier gives or takes whatever the abilities. Il conto lungo needs the
 * standing before the round: without it, it gives nothing.
 */
export function modifierBonus(character: Character, threat: Threat, standing?: Standing): number {
  const modifier = threat.modifier;
  switch (modifier?.code) {
    case "long_count":
      return standing && standing.roundsWon < standing.opponentRoundsWon ? modifier.bonus : 0;
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

/** The modifier's points as they count for the character: Adattabile ignores a malus. */
export function modifierPoints(character: Character, threat: Threat, standing?: Standing): number {
  const points = modifierBonus(character, threat, standing);
  return character.power?.code === "adaptable" ? Math.max(0, points) : points;
}

/** Highest single value among the required abilities (tie-break, no bonuses). */
export function highestRequired(character: Character, threat: Threat, malus = 0): number {
  return Math.max(0, ...threat.abilities.map((ability) => abilityValue(character, ability, malus)));
}

/** What a character with Sabotatore takes from each ability of the opposing character. */
export function abilityMalusFrom(character: Character): number {
  return character.power?.code === "sabotage" ? numberParam(character, "malus") : 0;
}

/** Schermato and Riflesso: Sabotatore cannot touch them. */
export function immuneToSabotage(character: Character): boolean {
  const code = character.power?.code;
  return code === "shielded" || code === "reflect";
}

/**
 * What is taken from each ability of `character` in a round against `opponent`:
 * the opponent's Sabotatore, unless `character` is immune, plus its own
 * Sabotatore sent back when the opponent has Riflesso. Pass both as they play.
 */
export function abilityMalusOn(character: Character, opponent: Character | null | undefined): number {
  if (!opponent) return 0;
  const received = immuneToSabotage(character) ? 0 : abilityMalusFrom(opponent);
  const reflected = opponent.power?.code === "reflect" ? abilityMalusFrom(character) : 0;
  return received + reflected;
}

/** Nebbia: the opponent does not see who played it until the match is over. */
export function hidesIdentity(character: Character): boolean {
  return character.power?.code === "fog";
}

/**
 * Powers Riverbero can copy: those that only add points to their own character.
 * Powers that act on the opponent, on later rounds or on information are left out,
 * so a copy never needs the server or the screen to know about it.
 */
const ECHOABLE = new Set([
  "ability_bonus",
  "family_bonus",
  "level_bonus",
  "underdog",
  "opener",
  "last_stand",
  "bond",
  "nemesis",
  "all_rounder",
  "giant_slayer",
  "crescendo",
  "scrappy",
  "counterpunch",
  "eclectic",
  "lone_wolf",
  "opportunist",
  "vendetta",
  "main_event",
]);

/** Riverbero: the power it copies from the side's previous character, as that one played. */
export function echoedPower(context: ScoreContext): Character["power"] {
  const source = context.played?.at(-1)?.power;
  return source && ECHOABLE.has(source.code) ? source : null;
}

/** Catalizzatore: the factor the side's previous character applies to this one's power bonus. */
export function powerMultiplier(context: ScoreContext): number {
  const previous = context.played?.at(-1);
  return previous?.power?.code === "catalyst" ? numberParam(previous, "multiplier") : 1;
}

/** Capobranco: +bonus from every pack leader of the same faction the side already played. */
export function packBonus(character: Character, played: readonly Character[] = []): number {
  return played.reduce(
    (sum, leader) =>
      leader.power?.code === "pack_leader" && leader.faction === character.faction ? sum + numberParam(leader, "bonus") : sum,
    0,
  );
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
 * The character as it plays against `opponent` on `threat`: without its power when
 * the opponent is an Annullatore, or when the threat silences every power
 * (Silenzio della tomba). Two Annullatori cancel each other.
 */
export function asPlayedAgainst(
  character: Character,
  opponent: Character | null | undefined,
  threat?: Threat | null,
): Character {
  if (!character.power) return character;
  const silenced = powersSilenced(threat) || Boolean(opponent && !powersSilenced(threat) && nullifiesPower(opponent));
  return silenced ? { ...character, power: null } : character;
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
    case "scrappy": {
      // The required abilities below the floor count as the floor.
      const floor = numberParam(character, "min_value");
      const malus = context.abilityMalus ?? 0;
      return threat.abilities.reduce((sum, ability) => sum + Math.max(0, floor - abilityValue(character, ability, malus)), 0);
    }
    case "counterpunch": {
      // Counted on full values: the comparison is between the two characters, not their round.
      const opponent = context.opponent;
      if (!opponent) return 0;
      const behind = threat.abilities.filter((ability) => (opponent.stats[ability] ?? 0) > (character.stats[ability] ?? 0)).length;
      return Math.min(behind * numberParam(character, "bonus"), numberParam(character, "max"));
    }
    case "eclectic": {
      const families = new Set(threat.abilities.map((ability) => context.families[ability]));
      return families.size >= numberParam(character, "min_families") ? numberParam(character, "bonus") : 0;
    }
    case "lone_wolf":
      return context.team.some((c) => c.id !== character.id && c.faction === character.faction) ? 0 : numberParam(character, "bonus");
    case "opportunist":
      return context.opponent && !context.opponent.power ? numberParam(character, "bonus") : 0;
    case "vendetta":
      return context.previousOutcome === "lost" ? numberParam(character, "bonus") : 0;
    case "main_event":
      return context.threatLevels?.length && threat.level >= Math.max(...context.threatLevels) ? numberParam(character, "bonus") : 0;
    case "adaptable":
      return threat.modifier ? numberParam(character, "bonus") : 0;
    case "echo": {
      const copied = echoedPower(context);
      return copied ? powerBonus({ ...character, power: copied }, threat, context) : 0;
    }
    case "reflect": // acts on Sabotatore: see abilityMalusOn
    case "sacrifice": // zeroes its score and passes a bonus: see scorePlay and carriedBonusAfter
    case "pack_leader": // acts on the later characters: see packBonus
    case "catalyst": // acts on the next character: see powerMultiplier
    case "fog": // hides the character: see hidesIdentity
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
  // Silenzio della tomba: no power of either side, so no Sabotatore either. A bonus
  // received from an earlier round (Riscossa, Slancio, Capobranco) still counts.
  if (powersSilenced(threat)) {
    if (character.power) character = { ...character, power: null };
    context = { ...context, abilityMalus: 0 };
  }
  const code = character.power?.code;
  // Schermato and Riflesso: immune to Sabotatore.
  if (immuneToSabotage(character)) context = { ...context, abilityMalus: 0 };
  const malus = context.abilityMalus ?? 0;
  const base = baseScore(character, threat, malus);
  // Sacrificio: the character gives up the round, whatever it would have scored.
  if (code === "sacrifice") return { characterId: character.id, base, bonus: -base, total: 0, highest: 0 };
  const power = powerBonus(character, threat, context) * powerMultiplier(context);
  const modifier = modifierPoints(character, threat, context);
  // A malus cannot bring the score below 0: the bonus stays the difference from the base.
  const total = Math.max(0, base + power + packBonus(character, context.played) + context.carriedBonus + modifier);
  return {
    characterId: character.id,
    base,
    bonus: total - base,
    total,
    highest: highestRequired(character, threat, malus),
    ...(code === "relentless" ? { relentless: true } : {}),
  };
}

/**
 * Bonus the next character of the same side gets: Riscossa after a lost round,
 * Slancio after a won one, Sacrificio whatever happened. A void round is neither
 * won nor lost. Pass the character as it played (asPlayedAgainst): an Annullatore
 * stops the bonus too.
 */
export function carriedBonusAfter(character: Character, outcome: PlayOutcome): number {
  const code = character.power?.code;
  if (code === "comeback" && outcome === "lost") return numberParam(character, "bonus");
  if (code === "momentum" && outcome === "won") return numberParam(character, "bonus");
  if (code === "sacrifice") return numberParam(character, "bonus");
  return 0;
}

/** Higher total wins; then Implacabile; then the higher single required value; otherwise void (SPEC §5.6). */
export function compareScores(a: PlayScore, b: PlayScore): Side | null {
  if (a.total !== b.total) return a.total > b.total ? "a" : "b";
  if (Boolean(a.relentless) !== Boolean(b.relentless)) return a.relentless ? "a" : "b";
  if (a.highest !== b.highest) return a.highest > b.highest ? "a" : "b";
  return null;
}
