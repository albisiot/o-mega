// Bots of Allarme Triplo (SPEC §5.13). Like every bot they know only what a player
// knows: the three threats, their own hand, the results so far and the opposing
// characters already played (not those under Nebbia). Never the opponent's hand nor
// the order of either deck.
//
// A round is a choice among the 6 ways of placing three cards on three threats.
// Strength on the real catalog: scripts/simulate-triple.mts.

import { otherSide } from "./match.ts";
import { pickWeighted, randomInt, type Rng } from "./rng.ts";
import { type BotDifficulty, type BotKnowledge } from "./bots.ts";
import {
  abilityMalusOn,
  asPlayedAgainst,
  baseScore,
  compareScores,
  hidesIdentity,
  scorePlay,
  type ScoreContext,
} from "./scoring.ts";
import {
  isTripleFinished,
  playTriplePvpRound,
  tripleContext,
  tripleHand,
  triplePlayedIn,
  triplePoints,
  tripleRoundCount,
  tripleTotalScores,
  type TriplePlacement,
  type TripleState,
} from "./triple.ts";
import type { AbilityCode, Character, Side, Threat } from "./types.ts";

/** Opposing hands Hard and Super Pro play each placement against. */
export const TRIPLE_HARD_SIMULATIONS = 150;
export const TRIPLE_SUPER_PRO_SIMULATIONS = 600;

export type TripleBotView = {
  hand: Character[];
  threats: Threat[];
  /** 0-based index of the current round, and the number of rounds. */
  roundIndex: number;
  roundCount: number;
  points: number;
  opponentPoints: number;
  /** Sum of scores so far, own minus opponent's (last tie-break). */
  scoreLead: number;
  /** What the bot's powers know on each threat this round. */
  contexts: ScoreContext[];
  /** What the opponent's powers know on each threat, as far as the results show it (no team). */
  opponentContexts: ScoreContext[];
  /** Catalog characters the opponent may still hold: a deck never repeats a character. */
  opponentPool: Character[];
  abilityMeans: Record<AbilityCode, number>;
};

export function tripleBotView(state: TripleState, side: Side, knowledge: BotKnowledge): TripleBotView {
  const opponent = otherSide(side);
  // Nebbia: a character played under it stays hidden, unless an Annullatore stopped it.
  const seen = state.rounds.flatMap((round) =>
    round.plays[opponent]
      .map((_, slot) => triplePlayedIn(state, round, opponent, slot))
      .filter((c): c is Character => c !== undefined && !hidesIdentity(c)),
  );
  const seenIds = new Set(seen.map((c) => c.definitionId));
  const points = triplePoints(state);
  const totals = tripleTotalScores(state);
  return {
    hand: tripleHand(state, side),
    threats: state.threats,
    roundIndex: state.rounds.length,
    roundCount: tripleRoundCount(state),
    points: points[side],
    opponentPoints: points[opponent],
    scoreLead: totals[side] - totals[opponent],
    contexts: state.threats.map((_, slot) => tripleContext(state, side, slot, knowledge.families)),
    opponentContexts: state.threats.map((_, slot) => {
      const context = tripleContext(state, opponent, slot, knowledge.families);
      return { ...context, team: [], played: (context.played ?? []).filter((c) => seenIds.has(c.definitionId)) };
    }),
    opponentPool: knowledge.characters.filter((c) => !seenIds.has(c.definitionId)),
    abilityMeans: knowledge.abilityMeans,
  };
}

/** Every way of placing `n` cards on `n` threats: placement[slot] = hand index. */
function permutations(n: number): number[][] {
  if (n === 0) return [[]];
  return permutations(n - 1).flatMap((p) => Array.from({ length: n }, (_, i) => [...p.slice(0, i), n - 1, ...p.slice(i)]));
}

type Model = {
  view: TripleBotView;
  perms: number[][];
  /** Chance a score beats a typical character on a threat. */
  chance: (score: number, slot: number) => number;
  /** Chance each own card beats a typical character on each threat: [hand][slot]. */
  odds: number[][];
  /** Exact contest of an own card against an opposing one on a threat: +1 won, 0 void, -1 lost. */
  duel: (own: Character, theirs: Character, slot: number) => { value: number; lead: number };
};

function model(view: TripleBotView): Model {
  const typical: Character = { id: "typical", definitionId: "typical", faction: "", rarityRank: 0, stats: view.abilityMeans, power: null };
  const expected = view.threats.map((threat) => baseScore(typical, threat));
  const scale = view.threats.map((threat) => 2.5 * Math.sqrt(threat.level));
  const chance = (score: number, slot: number) => 1 / (1 + Math.exp(-(score - expected[slot]) / scale[slot]));
  const odds = view.hand.map((card) =>
    view.threats.map((threat, slot) =>
      chance(scorePlay(asPlayedAgainst(card, undefined, threat), threat, view.contexts[slot]).total, slot),
    ),
  );
  const cache = new Map<string, { value: number; lead: number }>();
  const duel = (own: Character, theirs: Character, slot: number) => {
    const key = `${own.id}|${theirs.id}|${slot}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const threat = view.threats[slot];
    const a = asPlayedAgainst(own, theirs, threat);
    const b = asPlayedAgainst(theirs, own, threat);
    const mine = scorePlay(a, threat, { ...view.contexts[slot], abilityMalus: abilityMalusOn(a, b), opponent: b });
    const other = scorePlay(b, threat, {
      ...view.opponentContexts[slot],
      team: [b],
      abilityMalus: abilityMalusOn(b, a),
      opponent: a,
    });
    const winner = compareScores(mine, other);
    const result = { value: winner === "a" ? 1 : winner === "b" ? -1 : 0, lead: mine.total - other.total };
    cache.set(key, result);
    return result;
  };
  return { view, perms: permutations(view.hand.length), chance, odds, duel };
}

/** Expected threats won this round against typical characters. */
function greedyValue(m: Model, perm: number[]): number {
  return perm.reduce((sum, card, slot) => sum + m.odds[card][slot], 0);
}

/** The placement that wins the most threats against typical characters, ties broken at random. */
function greedyPerm(m: Model, rng: Rng): number[] {
  let best = -Infinity;
  let picks: number[][] = [];
  for (const perm of m.perms) {
    const value = greedyValue(m, perm);
    if (value > best + 1e-9) [best, picks] = [value, [perm]];
    else if (Math.abs(value - best) <= 1e-9) picks.push(perm);
  }
  return picks[randomInt(rng, picks.length)];
}

/** A random subset of `items`. */
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

/** How the opponent places a hand: the greedy way (Medio), on what it knows of its own cards. */
function opponentPerm(m: Model, hand: Character[]): number[] {
  const { view } = m;
  const odds = hand.map((card) =>
    view.threats.map((threat, slot) =>
      m.chance(scorePlay(card, threat, { ...view.opponentContexts[slot], team: hand }).total, slot),
    ),
  );
  const value = (perm: number[]) => perm.reduce((sum, card, slot) => sum + odds[card][slot], 0);
  return m.perms.reduce((best, perm) => (value(perm) > value(best) ? perm : best));
}

/**
 * Monte Carlo: each simulation draws an opposing hand that fits what is known and
 * places it the greedy way; every own placement is tried against it. In the last
 * round a placement is worth the match it wins; before, the threats it wins.
 */
function simulatePerm(m: Model, simulations: number, rng: Rng): number[] {
  const { view } = m;
  const handSize = view.hand.length;
  if (view.opponentPool.length < handSize) return greedyPerm(m, rng);
  const last = view.roundIndex >= view.roundCount - 1;
  const totals = new Array<number>(m.perms.length).fill(0);
  for (let k = 0; k < simulations; k++) {
    const theirs = sample(rng, view.opponentPool, handSize);
    const placed = opponentPerm(m, theirs);
    m.perms.forEach((perm, i) => {
      let points = 0;
      let lead = 0;
      perm.forEach((card, slot) => {
        const result = m.duel(view.hand[card], theirs[placed[slot]], slot);
        points += result.value;
        lead += result.lead;
      });
      if (!last) {
        totals[i] += points + lead / 1000;
        return;
      }
      const diff = view.points - view.opponentPoints + points;
      const scoreDiff = view.scoreLead + lead;
      totals[i] += diff > 0 ? 1 : diff < 0 ? 0 : scoreDiff > 0 ? 1 : scoreDiff < 0 ? 0 : 0.5;
    });
  }
  const best = Math.max(...totals);
  const picks = m.perms.filter((_, i) => totals[i] >= best - 1e-9);
  return picks[randomInt(rng, picks.length)];
}

/** Chooses where the bot places each card of its hand this round. */
export function chooseTripleBotPlacement(difficulty: BotDifficulty, view: TripleBotView, rng: Rng): TriplePlacement {
  if (view.hand.length === 0) throw new Error("The bot has no card left");
  const m = model(view);
  const toPlacement = (perm: number[]): TriplePlacement => ({
    characterIds: perm.map((card) => view.hand[card].id),
    autoPlayed: false,
  });
  switch (difficulty) {
    case "easy":
      // Random, preferring the placements that look good.
      return toPlacement(pickWeighted(rng, m.perms, (perm) => (greedyValue(m, perm) + 0.25) ** 2));
    case "medium":
      // Greedy: the most threats won against typical characters, no look at the opponent.
      return toPlacement(greedyPerm(m, rng));
    case "hard":
      return toPlacement(simulatePerm(m, TRIPLE_HARD_SIMULATIONS, rng));
    case "super_pro":
      return toPlacement(simulatePerm(m, TRIPLE_SUPER_PRO_SIMULATIONS, rng));
  }
}

/**
 * Plays the current round against a bot. The bot decides first, from its own view
 * only; then the player's placement is applied (null = timer expired: placed at random).
 */
export function playTripleBotRound(params: {
  state: TripleState;
  catalog: BotKnowledge;
  difficulty: BotDifficulty;
  playerSide: Side;
  playerChoice: string[] | null;
  rng: Rng;
}) {
  const { state, catalog, difficulty, playerSide, playerChoice, rng } = params;
  if (isTripleFinished(state)) throw new Error("The match is already over");
  const botSide = otherSide(playerSide);
  const bot = chooseTripleBotPlacement(difficulty, tripleBotView(state, botSide, catalog), rng);
  return playTriplePvpRound({
    state,
    choices: { [playerSide]: playerChoice, [botSide]: bot.characterIds } as Record<Side, string[] | null>,
    families: catalog.families,
    rng,
  });
}
