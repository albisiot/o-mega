/**
 * How a Sfida a tema changes the match itself (SPEC §8.8), in Classica: one of the drawn
 * modifiers on every round, only some threats (Nuova Megara, the three of a place, or some
 * levels), rare threats more often; the bot's squad within the composition rules; and the
 * simulator that estimates how hard a challenge is against each bot.
 *
 * The database keeps the rules and writes the modifiers onto the match; the Edge Function
 * draws the threats with drawChallengeThreats. This file is pure, as the rest of the engine.
 */
import { botView, buildBotTeam, buildBotTeamWith, chooseBotPlay, type BotDifficulty, type BotKnowledge } from "./bots.ts";
import { hasCompositionRules, pickWithComposition, type ChallengeRules } from "./challenges.ts";
import { isFinished, matchResult, resolveRound } from "./match.ts";
import { pickOne, randomInt, shuffle, type Rng } from "./rng.ts";
import { drawMatchThreats, drawRareThreats, isValidLevelSequence, pickThreats, withRareThreats } from "./threats.ts";
import type { Character, MatchRules, MatchState, RareThreat, Threat, ThreatModifier } from "./types.ts";

/** The modifiers a match draws (SPEC §5.4): a challenge can put one of them on every round. */
export type ChallengeModifierCode = "focus" | "weak_link" | "hostile_ground" | "underdogs";
export const CHALLENGE_MODIFIERS: readonly ChallengeModifierCode[] = ["focus", "weak_link", "hostile_ground", "underdogs"];

/** The places of the threats (threat_definitions.region); "megara" is Nuova Megara. */
export const CHALLENGE_PLACES = ["megara", "giza", "yucatan", "atlantis", "arctic", "japan"] as const;

/**
 * The match rules of a challenge (Classica only).
 * - modifier: on every round, instead of the usual draw; a threat's own rule (a place's, a
 *   rare one's) still wins on its round.
 * - place: "megara" only threats of Nuova Megara; another place, its three threats in every
 *   match and two of Nuova Megara. null: as usual.
 * - levels: only threats of these levels (1-6); empty: as usual. Not with a place.
 * - rareMultiplier: rare threats turn up this many times as often; 1: as usual.
 */
export type ChallengeMatchRules = {
  modifier: ChallengeModifierCode | null;
  place: string | null;
  levels: readonly number[];
  rareMultiplier: number;
};

export const NO_MATCH_RULES: ChallengeMatchRules = { modifier: null, place: null, levels: [], rareMultiplier: 1 };

export function hasMatchRules(rules: ChallengeMatchRules): boolean {
  return rules.modifier !== null || rules.place !== null || rules.levels.length > 0 || rules.rareMultiplier > 1;
}

/** A threat of the catalog with its place; none means Nuova Megara. */
export type PlacedThreat = Threat & { region?: string | null };

/** The rare threats with the challenge's odds: `multiplier` times as often, at most once every match. */
export function withRareOdds(rare: readonly RareThreat[], multiplier: number): RareThreat[] {
  if (multiplier <= 1) return [...rare];
  return rare.map((threat) => (threat.oneIn > 0 ? { ...threat, oneIn: Math.max(1, threat.oneIn / multiplier) } : threat));
}

const isMegara = (threat: PlacedThreat) => (threat.region ?? "megara") === "megara";

/**
 * The threats of a Classica match in a challenge. With a place other than Nuova Megara: its
 * threats, then threats of Nuova Megara of levels that keep the usual level rules (SPEC §5.4),
 * in random order; the rare threats that turn up take places of Nuova Megara only. With
 * levels: each round a level among them, the level rules aside (they could not hold).
 */
export function drawChallengeThreats(
  rng: Rng,
  catalog: readonly PlacedThreat[],
  rare: readonly RareThreat[],
  rules: MatchRules,
  matchRules: ChallengeMatchRules,
): Threat[] {
  const odds = withRareOdds(rare, matchRules.rareMultiplier);
  const megara = catalog.filter(isMegara);

  if (matchRules.place !== null && matchRules.place !== "megara") {
    const own = catalog.filter((threat) => threat.region === matchRules.place);
    const extra = rules.threatsPerMatch - own.length;
    if (own.length === 0 || extra < 0) throw new Error(`No threats for the place ${matchRules.place}`);
    const { min, max } = rules.threatLevels;
    for (let attempt = 0; attempt < 10_000; attempt++) {
      const levels = Array.from({ length: extra }, () => min + randomInt(rng, max - min + 1));
      if (!isValidLevelSequence([...own.map((threat) => threat.level), ...levels], rules.threatLevels)) continue;
      const others = withRareThreats(rng, pickThreats(rng, megara, levels), drawRareThreats(rng, odds), rules.threatLevels);
      return shuffle(rng, [...own, ...others]);
    }
    throw new Error(`No valid threat levels with the place ${matchRules.place}`);
  }

  const pool = matchRules.place === "megara" ? megara : catalog;
  if (matchRules.levels.length > 0) {
    const levels = Array.from({ length: rules.threatsPerMatch }, () => pickOne(rng, matchRules.levels));
    const rareOfLevels = odds.filter((threat) => matchRules.levels.includes(threat.level));
    return withRareThreats(
      rng,
      pickThreats(rng, pool.filter((threat) => matchRules.levels.includes(threat.level)), levels),
      drawRareThreats(rng, rareOfLevels),
      rules.threatLevels,
    );
  }
  return drawMatchThreats(rng, pool, odds, rules);
}

/** The numbers of the drawn modifiers (game_config `threat_modifiers.*`). */
export type ModifierNumbers = {
  hostileBonus: number;
  hostileMalus: number;
  underdogBonus: number;
  underdogMalus: number;
  underdogCommonMaxRank: number;
  underdogEliteMinRank: number;
};

/**
 * The challenge's modifier on a round, as the database writes it (challenge_modifier_entry):
 * Territorio ostile draws its factions for each round; Anello debole needs two abilities.
 */
export function challengeModifier(code: ChallengeModifierCode, level: number, numbers: ModifierNumbers, rng: Rng): ThreatModifier | null {
  switch (code) {
    case "focus":
      return { code };
    case "weak_link":
      return level >= 2 ? { code } : null;
    case "hostile_ground": {
      const [favored, hindered] = shuffle(rng, ["heroes", "villains", "neutrals"]);
      return { code, favored, hindered, bonus: numbers.hostileBonus, malus: numbers.hostileMalus };
    }
    case "underdogs":
      return {
        code,
        commonMaxRank: numbers.underdogCommonMaxRank,
        eliteMinRank: numbers.underdogEliteMinRank,
        bonus: numbers.underdogBonus,
        malus: numbers.underdogMalus,
      };
  }
}

/** The threats with the challenge's modifier on every round; a threat's own rule stays. */
export function withChallengeModifier(threats: readonly Threat[], code: ChallengeModifierCode, numbers: ModifierNumbers, rng: Rng): Threat[] {
  return threats.map((threat) => (threat.modifier ? threat : { ...threat, modifier: challengeModifier(code, threat.level, numbers, rng) }));
}

/**
 * The bot's squad in a challenge: its usual choice, within the composition rules when there are
 * some. rarityOf: a character's rarity code (Character only knows its rank).
 */
export function buildChallengeBotTeam(
  difficulty: BotDifficulty,
  characters: readonly Character[],
  size: number,
  rng: Rng,
  rules: ChallengeRules,
  rarityOf: (character: Character) => string,
): Character[] {
  if (!hasCompositionRules(rules)) return buildBotTeam(difficulty, characters, size, rng);
  return buildBotTeamWith(difficulty, characters, size, rng, (ordered) => {
    const picked = pickWithComposition(
      ordered.map((character) => ({ character, rarity: rarityOf(character), faction: character.faction, rarityRank: character.rarityRank })),
      rules,
      size,
    );
    return picked ? picked.map((entry) => entry.character) : null;
  });
}

export type ChallengeSimulationInput = {
  rules: MatchRules;
  knowledge: BotKnowledge;
  /** The threats of Classica, with their places, and the rare ones. */
  threatCatalog: readonly PlacedThreat[];
  rareCatalog: readonly RareThreat[];
  /** The characters the squad rules admit: the players' pool. */
  admitted: readonly Character[];
  /** The bot's pool: the admitted ones when it follows the rules, else every character. */
  botPool: readonly Character[];
  /** The squad every player fields, when the challenge gives one. */
  supplied: readonly Character[] | null;
  squadRules: ChallengeRules;
  rarityOf: (character: Character) => string;
  matchRules: ChallengeMatchRules;
  modifierNumbers: ModifierNumbers;
  difficulty: BotDifficulty;
  matches: number;
  rng: Rng;
};

/** Results of the player's side: a squad at random among the admitted ones, and a strong one. */
export type ChallengeSimulation = {
  difficulty: BotDifficulty;
  matches: number;
  random: SimulationTally;
  strong: SimulationTally;
};

export type SimulationTally = { matches: number; wins: number; draws: number };

/**
 * Plays simulated matches of a challenge against one bot. The player's side plays as the Medio
 * bot (a fair player) with, in turn, a squad at random among the admitted characters and a
 * strong one (the strongest, as a Super Pro would pick them), both within the composition; with
 * a squad given by the challenge, both are that squad. Without a modifier of its own, a match
 * draws none (an estimate: the usual draw only adds variety).
 */
export function simulateChallenge(input: ChallengeSimulationInput): ChallengeSimulation {
  const { rules, knowledge, rng, difficulty } = input;
  const size = rules.teamSize;
  const result: ChallengeSimulation = {
    difficulty,
    matches: 0,
    random: { matches: 0, wins: 0, draws: 0 },
    strong: { matches: 0, wins: 0, draws: 0 },
  };
  // The player's characters get ids of their own: the bot may field the same characters.
  const asPlayer = (team: readonly Character[]) => team.map((character) => ({ ...character, id: `player:${character.definitionId}` }));
  const randomSquad = () =>
    input.supplied ??
    pickWithComposition(
      shuffle(rng, input.admitted).map((character) => ({ character, rarity: input.rarityOf(character), faction: character.faction, rarityRank: character.rarityRank })),
      input.squadRules,
      size,
    )?.map((entry) => entry.character) ??
    null;
  const strongSquad = () => input.supplied ?? buildChallengeBotTeam("super_pro", input.admitted, size, rng, input.squadRules, input.rarityOf);

  for (let i = 0; i < input.matches; i++) {
    const strong = i % 2 === 1;
    const squad = strong ? strongSquad() : randomSquad();
    if (!squad || squad.length < size) continue;
    const bot = buildChallengeBotTeam(difficulty, input.botPool, size, rng, input.squadRules, input.rarityOf);
    let threats = drawChallengeThreats(rng, input.threatCatalog, input.rareCatalog, rules, input.matchRules);
    if (input.matchRules.modifier) threats = withChallengeModifier(threats, input.matchRules.modifier, input.modifierNumbers, rng);
    let state: MatchState = { rules, threats, teams: { a: asPlayer(squad), b: bot }, rounds: [] };
    while (!isFinished(state)) {
      const a = chooseBotPlay("medium", botView(state, "a", knowledge), rng);
      const b = chooseBotPlay(difficulty, botView(state, "b", knowledge), rng);
      state = resolveRound(state, { a: { characterId: a, autoPlayed: false }, b: { characterId: b, autoPlayed: false } }, knowledge.families).state;
    }
    const outcome = matchResult(state);
    const tally = strong ? result.strong : result.random;
    if (outcome === "a") tally.wins += 1;
    if (outcome === "draw") tally.draws += 1;
    tally.matches += 1;
    result.matches += 1;
  }
  return result;
}

/** The match rules as the database keeps them (challenge_normalize_match_rules), for the engine. */
export function parseMatchRules(json: Record<string, unknown> | null | undefined): ChallengeMatchRules {
  const modifier = json?.modifier;
  const place = json?.place;
  const levels = json?.levels;
  const multiplier = Number(json?.rare_multiplier ?? 1);
  return {
    modifier: typeof modifier === "string" && (CHALLENGE_MODIFIERS as readonly string[]).includes(modifier) ? (modifier as ChallengeModifierCode) : null,
    place: typeof place === "string" && place !== "" ? place : null,
    levels: Array.isArray(levels) ? levels.map(Number).filter((level) => Number.isInteger(level)) : [],
    rareMultiplier: Number.isFinite(multiplier) && multiplier >= 1 ? multiplier : 1,
  };
}
