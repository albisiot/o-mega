// Core types of the rules engine (SPEC §5). Plain data: no I/O, no classes.

export type Side = "a" | "b";
export type AbilityCode = string;

/** A parametric passive power (power_definitions + card power_params). */
export type Power = {
  code: string;
  params: Record<string, string | number>;
};

export type Character = {
  /** Card instance id for players; definition id for bots (they own no cards). */
  id: string;
  definitionId: string;
  faction: string;
  stats: Record<AbilityCode, number>;
  power: Power | null;
};

export type Threat = {
  id: string;
  /** Number of required abilities, 1-6. */
  level: number;
  abilities: AbilityCode[];
};

export type ThreatLevelRules = {
  min: number;
  max: number;
  /** At least one threat at or below this level. */
  requireOneAtMost: number;
  /** At least one threat at or above this level. */
  requireOneAtLeast: number;
  minSum: number;
  maxSum: number;
};

export type MatchRules = {
  teamSize: number;
  threatsPerMatch: number;
  roundsToWin: number;
  threatLevels: ThreatLevelRules;
};

/** Ability code → family code; family-based powers need it. */
export type AbilityFamilies = Record<AbilityCode, string>;

export type PlayScore = {
  characterId: string;
  /** Sum of the character's values in the required abilities. */
  base: number;
  /** Powers, including a bonus carried over from the previous round. */
  bonus: number;
  total: number;
  /** Highest single required-ability value, without bonuses (tie-break). */
  highest: number;
  /** Implacabile: wins when the totals are equal. */
  relentless?: boolean;
};

export type PlayRecord = PlayScore & { autoPlayed: boolean };

export type RoundRecord = {
  /** 1-based. */
  round: number;
  threatId: string;
  plays: Record<Side, PlayRecord>;
  /** null: the round is void (nullo). */
  winner: Side | null;
};

/** Everything the server knows about a match. Never send it to a client as is. */
export type MatchState = {
  rules: MatchRules;
  /** The threats of the match, in round order. */
  threats: Threat[];
  teams: Record<Side, Character[]>;
  rounds: RoundRecord[];
};

export type MatchResult = Side | "draw";
