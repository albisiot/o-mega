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
  /** 1 = Delta ... 5 = Omega. */
  rarityRank: number;
  stats: Record<AbilityCode, number>;
  power: Power | null;
};

/** The twist of a threat in one match (SPEC §5.4). Its numbers are fixed when the match is created. */
export type ThreatModifier =
  /** The first required ability counts double. */
  | { code: "focus" }
  /** The lowest value among the required abilities counts double. */
  | { code: "weak_link" }
  | { code: "hostile_ground"; favored: string; hindered: string; bonus: number; malus: number }
  /** Rarity up to `commonMaxRank` gains the bonus, from `eliteMinRank` takes the malus. */
  | { code: "underdogs"; commonMaxRank: number; eliteMinRank: number; bonus: number; malus: number }
  // The rules of the places beyond Nuova Megara: fixed for each threat of that place, never drawn.
  /** Silenzio della tomba (Giza): no power acts in this round, on either side. */
  | { code: "tomb_silence" }
  /** Il conto lungo (Yucatán): the side that has won fewer rounds so far gains the bonus. */
  | { code: "long_count"; bonus: number }
  /** Abissi (Atlantide): these abilities count double when required. */
  | { code: "abyss"; abilities: readonly AbilityCode[] }
  /** Gelo (Artico): no required ability counts more than `cap`. */
  | { code: "frost"; cap: number }
  /** Duello (Giappone): only the `count` highest required abilities count. */
  | { code: "duel"; count: number }
  // The rules of the rare threats (SPEC §5.15): fixed for each of them, never drawn.
  /** Specchio: each side scores with the opposing character's values. */
  | { code: "mirror" }
  /** Rovescio: the lower total wins the round; on equal totals, the lower highest value. */
  | { code: "reverse" }
  /** Tutto o niente: a required ability below `min` counts 0. */
  | { code: "all_or_nothing"; min: number }
  /** Ultimi i primi: `bonus` for every rarity rank below `topRank`. */
  | { code: "last_first"; bonus: number; topRank: number }
  /** Il prezzo: a required ability at `maxValue` or less counts minus `malus`. */
  | { code: "price"; maxValue: number; malus: number }
  /** Una sola forza: of these abilities, only the highest counts, once for each of them that is required. */
  | { code: "one_force"; abilities: readonly AbilityCode[] }
  /** Al buio: the abilities, drawn when the match is created, are shown only once both sides have chosen. */
  | { code: "blind"; abilities: readonly AbilityCode[] }
  /** Eco: also requires these abilities, those of the threat of the round before. */
  | { code: "echo"; abilities: readonly AbilityCode[] }
  /** Il conteggio: `points` for every required ability at `min` or more, whatever its value. */
  | { code: "count"; min: number; points: number }
  /** Livello ignoto: the abilities, drawn when the match is created; their number stays hidden until the round. */
  | { code: "unknown_level"; abilities: readonly AbilityCode[] }
  /** Negativo: every required ability counts `max` minus its value. */
  | { code: "negative"; max: number };

/** Rules whose abilities are drawn for each match: the threat's own list is only the pool. */
export const DRAWN_ABILITY_RULES: readonly string[] = ["blind", "unknown_level"];

export type Threat = {
  id: string;
  /** Number of required abilities: 1-6, up to 12 for a rare threat. */
  level: number;
  abilities: AbilityCode[];
  modifier?: ThreatModifier | null;
  /** Rarity tier of a rare threat (threat_rarities.code); none for the others. */
  rarity?: string | null;
  /** Emergenza: score a rare threat needs (the most it allows, under Rovescio), instead of its level's. */
  target?: number | null;
};

/** A rare threat of the catalog and its chance of turning up: once in `oneIn` matches. */
export type RareThreat = Threat & { oneIn: number };

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
  /** Sum of the character's values in the required abilities, counted as the modifier says. */
  base: number;
  /** Powers, a bonus carried over from the previous round and the modifier. Can be negative. */
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
