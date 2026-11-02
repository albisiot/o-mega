import {
  availableCharacters,
  carriedBonus,
  currentRoundNumber,
  currentThreat,
  otherSide,
  roundsWon,
  totalScores,
} from "./match.ts";
import { pickOne, pickWeighted, randomInt, shuffle, type Rng } from "./rng.ts";
import {
  abilityMalusFrom,
  carriedBonusAfter,
  compareScores,
  revealsFutureThreats,
  scorePlay,
  type ScoreContext,
} from "./scoring.ts";
import type { AbilityCode, AbilityFamilies, Character, MatchState, Side, Threat } from "./types.ts";

export type BotDifficulty = "easy" | "medium" | "hard" | "super_pro";

/** Plausible matches Super Pro plays out before each move, for all its options together. */
export const SUPER_PRO_SIMULATIONS = 1000;

/**
 * What a bot may know (SPEC §5.9): its own remaining characters, the current
 * threat, the levels of future rounds, the threat catalog and what the
 * opponent has already played. Never the opponent's choice for this round,
 * the rest of their team, nor the identity of future threats.
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
  /** Catalog characters the opponent may still field: a team never repeats a character. */
  opponentPool: Character[];
  /** Bonus the opponent carries into this round (Riscossa). It follows from public results. */
  opponentCarriedBonus: number;
  /** Total score so far, own minus opponent's (tie-break of the match, SPEC §5.6). */
  scoreLead: number;
  roundsToWin: number;
  /** 1-based number of the round being played. */
  round: number;
  /** Own whole team, already played characters included. */
  team: Character[];
  /** The opponent's characters already played. */
  opponentSeen: Character[];
  /** The threats of the following rounds, once Veggente has been played. */
  foreseenThreats: Threat[] | null;
};

export type BotKnowledge = {
  threatCatalog: Threat[];
  families: AbilityFamilies;
  abilityMeans: Record<AbilityCode, number>;
  /** Every active character, as the bot may field them (id = definition id). */
  characters: Character[];
};

export function botView(state: MatchState, side: Side, knowledge: BotKnowledge): BotView {
  const revealed = new Set(state.threats.slice(0, state.rounds.length + 1).map((threat) => threat.id));
  const won = roundsWon(state);
  const opponent = otherSide(side);
  const played = new Set(state.rounds.map((round) => round.plays[opponent].characterId));
  const opponentSeen = state.teams[opponent].filter((c) => played.has(c.id));
  const seen = new Set(opponentSeen.map((c) => c.definitionId));
  const totals = totalScores(state);
  const ownPlayed = new Set(state.rounds.map((round) => round.plays[side].characterId));
  const foresees = state.teams[side].some((c) => ownPlayed.has(c.id) && revealsFutureThreats(c));
  return {
    round: currentRoundNumber(state),
    team: state.teams[side],
    opponentSeen,
    foreseenThreats: foresees ? state.threats.slice(state.rounds.length + 1) : null,
    opponentPool: knowledge.characters.filter((character) => !seen.has(character.definitionId)),
    opponentCarriedBonus: carriedBonus(state, opponent),
    scoreLead: totals[side] - totals[opponent],
    roundsToWin: state.rules.roundsToWin,
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
    round: view.round,
    team: view.team,
  };
}

/** A character's score plus what Sabotatore would take from the opposing character. */
function effectiveScore(character: Character, threat: Threat, context: ScoreContext): number {
  return scorePlay(character, threat, context).total + abilityMalusFrom(character) * threat.level;
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
      const value = (character: Character) => effectiveScore(character, view.currentThreat, context);
      const best = Math.max(...view.available.map(value));
      return pickOne(rng, view.available.filter((character) => value(character) === best)).id;
    }
    case "hard":
      return planHardPlay(view, rng);
    case "super_pro":
      return simulateBestPlay(view, rng);
  }
}

/** A random subset of `items`, cheaper than shuffling the whole list. */
function sample<T>(rng: Rng, items: readonly T[], count: number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = randomInt(rng, pool.length);
    picked.push(pool[index]);
    pool[index] = pool[pool.length - 1];
    pool.pop();
  }
  return picked;
}

/** The future rounds of one plausible match: a distinct unrevealed threat per known level. */
function sampleFutureThreats(view: BotView, rng: Rng): Threat[] {
  if (view.foreseenThreats) return view.foreseenThreats;
  const threats: Threat[] = [];
  for (const level of view.futureLevels) {
    const options = view.threatPool.filter((threat) => threat.level === level && !threats.includes(threat));
    if (options.length > 0) threats.push(pickOne(rng, options));
  }
  return threats;
}

/** Plays out one plausible match with the rules of §5.6. 1 = win, 0.5 = draw, 0 = loss. */
function playOut(view: BotView, first: Character, opponents: Character[], threats: Threat[], rng: Rng): number {
  const own = view.available.filter((character) => character !== first);
  const theirs = [...opponents];
  let won = view.roundsWon;
  let lost = view.opponentRoundsWon;
  let lead = view.scoreLead;
  let ownCarried = view.carriedBonus;
  let theirCarried = view.opponentCarriedBonus;
  let ownPick: Character | null = first;
  let round = view.round;
  const theirTeam = [...view.opponentSeen, ...opponents];

  for (const threat of threats) {
    const shared = { families: view.families, round };
    const ownContext = { ...shared, roundsWon: won, opponentRoundsWon: lost, carriedBonus: ownCarried, team: view.team };
    const theirContext = { ...shared, roundsWon: lost, opponentRoundsWon: won, carriedBonus: theirCarried, team: theirTeam };
    const ownCharacter: Character = ownPick ?? takeBest(own, threat, ownContext, rng);
    const theirCharacter = takeBest(theirs, threat, theirContext, rng);
    ownPick = null;
    round += 1;

    const ownScore = scorePlay(ownCharacter, threat, { ...ownContext, abilityMalus: abilityMalusFrom(theirCharacter) });
    const theirScore = scorePlay(theirCharacter, threat, { ...theirContext, abilityMalus: abilityMalusFrom(ownCharacter) });
    const winner = compareScores(ownScore, theirScore);
    lead += ownScore.total - theirScore.total;
    if (winner === "a") won += 1;
    if (winner === "b") lost += 1;
    ownCarried = carriedBonusAfter(ownCharacter, winner === "b");
    theirCarried = carriedBonusAfter(theirCharacter, winner === "a");
    if (won >= view.roundsToWin || lost >= view.roundsToWin) break;
  }

  if (won !== lost) return won > lost ? 1 : 0;
  if (lead !== 0) return lead > 0 ? 1 : 0;
  return 0.5;
}

/** Removes and returns the best-scoring character: how both sides play the simulated rounds. */
function takeBest(characters: Character[], threat: Threat, context: ScoreContext, rng: Rng): Character {
  let best = -Infinity;
  let index = 0;
  let ties = 0;
  characters.forEach((character, i) => {
    const total = effectiveScore(character, threat, context);
    if (total > best) {
      best = total;
      index = i;
      ties = 1;
    } else if (total === best && randomInt(rng, ++ties) === 0) {
      index = i;
    }
  });
  return characters.splice(index, 1)[0];
}

/**
 * Super Pro (SPEC §5.9): Monte Carlo. Each simulation draws future threats and
 * an opponent team that fit what is known, then tries every option against
 * that same draw, so options differ by their merit and not by luck. Plays the
 * option that wins most often.
 */
function simulateBestPlay(view: BotView, rng: Rng): string {
  const options = shuffle(rng, view.available); // random tie-breaking
  if (options.length === 1) return options[0].id;
  const wins = new Array<number>(options.length).fill(0);
  const simulations = Math.ceil(SUPER_PRO_SIMULATIONS / options.length);
  for (let i = 0; i < simulations; i++) {
    const threats = [view.currentThreat, ...sampleFutureThreats(view, rng)];
    const opponents = sample(rng, view.opponentPool, options.length);
    options.forEach((option, o) => {
      wins[o] += playOut(view, option, opponents, threats, rng);
    });
  }
  return options[wins.indexOf(Math.max(...wins))].id;
}

/** Estimated chance that `score` beats a typical opponent on `threat`. */
function winChance(score: number, threat: Threat, abilityMeans: Record<AbilityCode, number>): number {
  const means = threat.abilities.map((ability) => abilityMeans[ability] ?? 0);
  const doubled = threat.modifier?.code === "focus" ? means[0] : threat.modifier?.code === "weak_link" ? Math.min(...means) : 0;
  const expected = means.reduce((sum, mean) => sum + mean, doubled);
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
      const score = effectiveScore(character, view.currentThreat, context);
      return winChance(score, view.currentThreat, view.abilityMeans);
    }
    const level = view.futureLevels[roundIndex - 1];
    const known = view.foreseenThreats?.[roundIndex - 1];
    const threats = known ? [known] : view.threatPool.filter((threat) => threat.level === level);
    if (threats.length === 0) return 0.5;
    const atRound = { ...futureContext, round: view.round + roundIndex };
    const total = threats.reduce(
      (sum, threat) => sum + winChance(effectiveScore(character, threat, atRound), threat, view.abilityMeans),
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
  if (difficulty !== "hard" && difficulty !== "super_pro") return shuffle(rng, distinct).slice(0, size);

  // Hard and Super Pro: specialists that cover different peaks, plus a couple of generalists.
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
