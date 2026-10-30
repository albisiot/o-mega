import { availableCharacters, carriedBonus, currentThreat, otherSide, roundsWon } from "./match.ts";
import { pickOne, pickWeighted, shuffle, type Rng } from "./rng.ts";
import { scorePlay, type ScoreContext } from "./scoring.ts";
import type { AbilityCode, AbilityFamilies, Character, MatchState, Side, Threat } from "./types.ts";

export type BotDifficulty = "easy" | "medium" | "hard";

/**
 * What a bot may know (SPEC §5.9): its own remaining characters, the current
 * threat, the levels of future rounds and the threat catalog. Never the
 * opponent's choice for this round, nor the identity of future threats.
 */
export type BotView = {
  available: Character[];
  currentThreat: Threat;
  futureLevels: number[];
  roundsWon: number;
  opponentRoundsWon: number;
  carriedBonus: number;
  /** Catalog threats that may still come up (revealed ones excluded). */
  threatPool: Threat[];
  families: AbilityFamilies;
  /** Average value of each ability over the character catalog: the "typical" opponent. */
  abilityMeans: Record<AbilityCode, number>;
};

export type BotKnowledge = {
  threatCatalog: Threat[];
  families: AbilityFamilies;
  abilityMeans: Record<AbilityCode, number>;
};

export function botView(state: MatchState, side: Side, knowledge: BotKnowledge): BotView {
  const revealed = new Set(state.threats.slice(0, state.rounds.length + 1).map((threat) => threat.id));
  const won = roundsWon(state);
  return {
    available: availableCharacters(state, side),
    currentThreat: currentThreat(state),
    futureLevels: state.threats.slice(state.rounds.length + 1).map((threat) => threat.level),
    roundsWon: won[side],
    opponentRoundsWon: won[otherSide(side)],
    carriedBonus: carriedBonus(state, side),
    threatPool: knowledge.threatCatalog.filter((threat) => !revealed.has(threat.id)),
    families: knowledge.families,
    abilityMeans: knowledge.abilityMeans,
  };
}

export function computeAbilityMeans(characters: readonly Character[]): Record<AbilityCode, number> {
  const sums: Record<AbilityCode, number> = {};
  for (const character of characters) {
    for (const [ability, value] of Object.entries(character.stats)) sums[ability] = (sums[ability] ?? 0) + value;
  }
  return Object.fromEntries(
    Object.entries(sums).map(([ability, sum]) => [ability, characters.length ? sum / characters.length : 0]),
  );
}

function currentContext(view: BotView): ScoreContext {
  return {
    families: view.families,
    roundsWon: view.roundsWon,
    opponentRoundsWon: view.opponentRoundsWon,
    carriedBonus: view.carriedBonus,
  };
}

/** Chooses the character the bot plays this round (its id). */
export function chooseBotPlay(difficulty: BotDifficulty, view: BotView, rng: Rng): string {
  if (view.available.length === 0) throw new Error("The bot has no character left");
  const context = currentContext(view);
  const scoreOf = (character: Character) => scorePlay(character, view.currentThreat, context).total;

  switch (difficulty) {
    case "easy":
      // Random, slightly preferring good scores.
      return pickWeighted(rng, view.available, (character) => (scoreOf(character) + 1) ** 2).id;
    case "medium": {
      // Greedy: best score for the current threat, no planning.
      const best = Math.max(...view.available.map(scoreOf));
      return pickOne(rng, view.available.filter((character) => scoreOf(character) === best)).id;
    }
    case "hard":
      return planHardPlay(view, rng);
  }
}

/** Estimated chance that `score` beats a typical opponent on `threat`. */
function winChance(score: number, threat: Threat, abilityMeans: Record<AbilityCode, number>): number {
  const expected = threat.abilities.reduce((sum, ability) => sum + (abilityMeans[ability] ?? 0), 0);
  const scale = 2.5 * Math.sqrt(threat.level);
  return 1 / (1 + Math.exp(-(score - expected) / scale));
}

/**
 * Hard: assigns every remaining character to a remaining round so that the
 * expected number of won rounds is maximal, then plays the one assigned to
 * the current round. Future rounds are estimated with the catalog threats of
 * their level. Keeps specialists for low levels and generalists for high
 * ones, and sends the weakest character when the round looks lost.
 */
function planHardPlay(view: BotView, rng: Rng): string {
  const characters = shuffle(rng, view.available); // random tie-breaking
  const context = currentContext(view);
  const futureContext: ScoreContext = { ...context, carriedBonus: 0 };

  const expectedWins = (character: Character, roundIndex: number): number => {
    if (roundIndex === 0) {
      const score = scorePlay(character, view.currentThreat, context).total;
      return winChance(score, view.currentThreat, view.abilityMeans);
    }
    const level = view.futureLevels[roundIndex - 1];
    const threats = view.threatPool.filter((threat) => threat.level === level);
    if (threats.length === 0) return 0.5;
    const total = threats.reduce(
      (sum, threat) => sum + winChance(scorePlay(character, threat, futureContext).total, threat, view.abilityMeans),
      0,
    );
    return total / threats.length;
  };

  const rounds = Math.min(characters.length, 1 + view.futureLevels.length);
  const value = characters.map((character) => Array.from({ length: rounds }, (_, r) => expectedWins(character, r)));

  // At most 5 characters: trying every assignment (5! = 120) is cheap.
  let bestScore = -Infinity;
  let bestForCurrent = 0;
  const used = new Array<boolean>(characters.length).fill(false);
  const assign = (round: number, sum: number, first: number) => {
    if (round === rounds) {
      if (sum > bestScore) {
        bestScore = sum;
        bestForCurrent = first;
      }
      return;
    }
    for (let c = 0; c < characters.length; c++) {
      if (used[c]) continue;
      used[c] = true;
      assign(round + 1, sum + value[c][round], round === 0 ? c : first);
      used[c] = false;
    }
  };
  assign(0, 0, 0);
  return characters[bestForCurrent].id;
}

function spread(character: Character): number {
  const values = Object.values(character.stats);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);
}

/** The bot's team: distinct characters from the catalog (SPEC §5.9). */
export function buildBotTeam(
  difficulty: BotDifficulty,
  catalog: readonly Character[],
  size: number,
  rng: Rng,
): Character[] {
  const distinct = [...new Map(catalog.map((character) => [character.definitionId, character])).values()];
  if (distinct.length < size) throw new Error("Not enough characters for a bot team");
  if (difficulty !== "hard") return shuffle(rng, distinct).slice(0, size);

  // Hard: specialists that cover different peaks, plus a couple of generalists.
  const bySpread = [...distinct].sort((x, y) => spread(y) - spread(x));
  const third = Math.max(size, Math.floor(bySpread.length / 3));
  const specialists = bySpread.slice(0, third);
  const generalists = bySpread.slice(-third).reverse();
  const specialistCount = Math.ceil(size * 0.6);

  const team: Character[] = [];
  const coverage = (candidate: Character) =>
    Object.keys(candidate.stats).reduce(
      (sum, ability) => sum + Math.max(candidate.stats[ability], ...team.map((c) => c.stats[ability] ?? 0)),
      0,
    );
  while (team.length < specialistCount) {
    const options = specialists.filter((c) => !team.includes(c)).sort((x, y) => coverage(y) - coverage(x));
    team.push(pickOne(rng, options.slice(0, 3)));
  }
  while (team.length < size) {
    const options = generalists.filter((c) => !team.includes(c) && !team.some((t) => t.definitionId === c.definitionId));
    team.push(pickOne(rng, options.slice(0, 4)));
  }
  return shuffle(rng, team);
}
