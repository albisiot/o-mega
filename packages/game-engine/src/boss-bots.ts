// Bots of the Grande Minaccia (SPEC §5.12). Like the bots of a match they know only
// what a player knows: the boss, the whole points table, their own characters and
// the opponent's characters already played. Never the opponent's choice for this
// turn nor the rest of their team.
//
// They decide on a fast model of the mode: each character's score on each front in
// each turn, counted alone, and a fixed chance that the opponent comes to the same
// front. On the real catalog, with the same team: Hard beats Medium about 77% of
// the time (85% if it never varied its moves), Super Pro beats Hard about 74%
// (scripts/simulate-boss.mts).

import {
  availableBossCharacters,
  bossContext,
  bossPlayedIn,
  bossPoints,
  bossTotalScores,
  bossTurnCount,
  frontsTaken,
  playBossPvpTurn,
  presidioTarget,
  type BossChoice,
  type BossRules,
  type BossState,
} from "./boss.ts";
import { type BotDifficulty, type BotKnowledge } from "./bots.ts";
import { otherSide } from "./match.ts";
import { mulberry32, pickWeighted, randomInt, shuffle, type Rng } from "./rng.ts";
import { asPlayedAgainst, baseScore, highestRequired, scorePlay, type ScoreContext } from "./scoring.ts";
import type { AbilityCode, AbilityFamilies, Character, Side, Threat } from "./types.ts";

/** Playouts Super Pro runs before each move, for all its options together. */
export const BOSS_SUPER_PRO_SIMULATIONS = 600;

/** Chance the bots assume that the opponent chooses the same front. */
const CONTEST_CHANCE = 0.35;

/**
 * Hard picks at random among moves this close to its best plan (points), so it is not
 * predictable: two identical planners end up on the same front most of the time.
 */
const HARD_TOLERANCE_POINTS = 0.1;
const HARD_TOLERANCE_SHARE = 0.02;

export type BossBotView = {
  available: Character[];
  fronts: Threat[];
  values: number[][];
  /** 0-based index of the current turn. */
  turnIndex: number;
  turnCount: number;
  /** What the bot's powers know this turn (bossContext). */
  context: ScoreContext;
  points: number;
  opponentPoints: number;
  taken: number;
  opponentTaken: number;
  /** Sum of scores so far, own minus opponent's (last tie-break). */
  scoreLead: number;
  /** Catalog characters the opponent may still field: a team never repeats a character. */
  opponentPool: Character[];
  opponentHandSize: number;
  rules: BossRules;
  families: AbilityFamilies;
  abilityMeans: Record<AbilityCode, number>;
};

export function bossBotView(state: BossState, side: Side, knowledge: BotKnowledge): BossBotView {
  const opponent = otherSide(side);
  const seen = new Set(
    state.turns
      .map((turn) => bossPlayedIn(state, turn, opponent))
      .filter((c): c is Character => c !== undefined)
      .map((c) => c.definitionId),
  );
  const points = bossPoints(state);
  const taken = frontsTaken(state);
  const totals = bossTotalScores(state);
  return {
    available: availableBossCharacters(state, side),
    fronts: state.fronts,
    values: state.values,
    turnIndex: state.turns.length,
    turnCount: bossTurnCount(state),
    context: bossContext(state, side, knowledge.families),
    points: points[side],
    opponentPoints: points[opponent],
    taken: taken[side],
    opponentTaken: taken[opponent],
    scoreLead: totals[side] - totals[opponent],
    opponentPool: knowledge.characters.filter((c) => !seen.has(c.definitionId)),
    opponentHandSize: availableBossCharacters(state, opponent).length,
    rules: state.rules,
    families: knowledge.families,
    abilityMeans: knowledge.abilityMeans,
  };
}

// ---------------------------------------------------------------------------
// Fast model
// ---------------------------------------------------------------------------

/** A character on every front: score per turn (alone), highest required value, presidio target. */
type Table = { character: Character; total: number[][]; highest: number[]; required: number[] };
type Move = { hand: number; front: number };
type Fast = { hand: Table[]; points: number; taken: number; total: number };

type Model = {
  view: BossBotView;
  /** Score a typical character makes on each front, and how widely scores spread there. */
  expected: number[];
  scale: number[];
};

function model(view: BossBotView): Model {
  const typical: Character = { id: "typical", definitionId: "typical", faction: "", rarityRank: 0, stats: view.abilityMeans, power: null };
  return {
    view,
    expected: view.fronts.map((front) => baseScore(typical, front)),
    scale: view.fronts.map((front) => 2.5 * Math.sqrt(front.level)),
  };
}

/**
 * Scores of a character on every front from the current turn on. `exact` is the
 * context of the current turn (the bot's own characters); later turns, and the
 * opponent's characters, are counted without what earlier turns would change.
 */
function table(view: BossBotView, character: Character, team: readonly Character[], exact?: ScoreContext): Table {
  const levels = view.fronts.map((front) => front.level);
  return {
    character,
    total: view.fronts.map((front) => {
      const acting = asPlayedAgainst(character, null, front);
      return Array.from({ length: view.turnCount }, (_, t) => {
        if (t < view.turnIndex) return 0;
        const context: ScoreContext =
          exact && t === view.turnIndex
            ? exact
            : {
                families: view.families,
                roundsWon: exact?.roundsWon ?? 0,
                opponentRoundsWon: exact?.opponentRoundsWon ?? 0,
                carriedBonus: 0,
                round: t + 1,
                team,
                threatLevels: levels,
                played: exact?.played ?? [],
              };
        return scorePlay(acting, front, context).total;
      });
    }),
    highest: view.fronts.map((front) => highestRequired(character, front)),
    required: view.fronts.map((front) => presidioTarget(asPlayedAgainst(character, null, front), front, view.rules)),
  };
}

/** Chance that a score beats a typical opponent's on a front. */
function contestChance(m: Model, front: number, total: number): number {
  return 1 / (1 + Math.exp(-(total - m.expected[front]) / m.scale[front]));
}

/** Expected points of a character on a front in a turn. */
function expectedPoints(m: Model, tab: Table, front: number, t: number): number {
  const total = tab.total[front][t];
  const alone = total >= tab.required[front] ? 1 : 0;
  return m.view.values[t][front] * ((1 - CONTEST_CHANCE) * alone + CONTEST_CHANCE * contestChance(m, front, total));
}

function bestFront(m: Model, tab: Table, t: number): { value: number; front: number } {
  let value = -Infinity;
  let front = 0;
  for (let f = 0; f < m.view.fronts.length; f++) {
    const x = expectedPoints(m, tab, f, t);
    if (x > value) [value, front] = [x, f];
  }
  return { value, front };
}

/** Best sum of expected points assigning `hand` to the turns from `t` on, each to its best front. */
function bestAssignment(m: Model, hand: readonly Table[], t: number): number {
  const turns = Math.min(hand.length, m.view.turnCount - t);
  if (turns <= 0) return 0;
  const w = hand.map((tab) => Array.from({ length: turns }, (_, k) => bestFront(m, tab, t + k).value));
  let best = -Infinity;
  const used = new Array<boolean>(hand.length).fill(false);
  const assign = (k: number, sum: number) => {
    if (k === turns) {
      best = Math.max(best, sum);
      return;
    }
    for (let i = 0; i < hand.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      assign(k + 1, sum + w[i][k]);
      used[i] = false;
    }
  };
  assign(0, 0);
  return best;
}

/** Plan value of every move: its expected points now plus the best plan for the rest of the hand. */
function planValues(m: Model, hand: readonly Table[], t: number): { move: Move; value: number }[] {
  const options: { move: Move; value: number }[] = [];
  hand.forEach((tab, p) => {
    const rest = bestAssignment(m, hand.filter((_, i) => i !== p), t + 1);
    for (let f = 0; f < m.view.fronts.length; f++) {
      options.push({ move: { hand: p, front: f }, value: expectedPoints(m, tab, f, t) + rest });
    }
  });
  return options;
}

/** The planner: the move of the best plan, ties broken at random. Plays both sides of Super Pro's playouts. */
function plannerMove(m: Model, hand: readonly Table[], t: number, rng: Rng): Move {
  const order = shuffle(rng, hand.map((_, p) => p));
  const turns = Math.min(hand.length, m.view.turnCount - t);
  const w = order.map((p) => Array.from({ length: turns }, (_, k) => bestFront(m, hand[p], t + k)));
  let best = -Infinity;
  let first = 0;
  const used = new Array<boolean>(hand.length).fill(false);
  const assign = (k: number, sum: number, f: number) => {
    if (k === turns) {
      if (sum > best) [best, first] = [sum, f];
      return;
    }
    for (let i = 0; i < order.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      assign(k + 1, sum + w[i][k].value, k === 0 ? i : f);
      used[i] = false;
    }
  };
  assign(0, 0, 0);
  return { hand: order[first], front: w[first][0].front };
}

function resolveFast(m: Model, a: Fast, b: Fast, moveA: Move, moveB: Move, t: number) {
  const ta = a.hand[moveA.hand];
  const tb = b.hand[moveB.hand];
  const sa = ta.total[moveA.front][t];
  const sb = tb.total[moveB.front][t];
  a.total += sa;
  b.total += sb;
  const take = (side: Fast, front: number) => {
    side.points += m.view.values[t][front];
    side.taken += 1;
  };
  if (moveA.front === moveB.front) {
    const f = moveA.front;
    const winner = sa !== sb ? (sa > sb ? "a" : "b") : ta.highest[f] !== tb.highest[f] ? (ta.highest[f] > tb.highest[f] ? "a" : "b") : null;
    if (winner === "a") take(a, f);
    if (winner === "b") take(b, f);
  } else {
    if (sa >= ta.required[moveA.front]) take(a, moveA.front);
    if (sb >= tb.required[moveB.front]) take(b, moveB.front);
  }
  a.hand = a.hand.filter((_, i) => i !== moveA.hand);
  b.hand = b.hand.filter((_, i) => i !== moveB.hand);
}

/** 1 = win, 0.5 = draw, 0 = loss, with the tie-breaks of the mode. */
function outcome(a: Fast, b: Fast): number {
  for (const [x, y] of [[a.points, b.points], [a.taken, b.taken], [a.total, b.total]]) {
    if (x !== y) return x > y ? 1 : 0;
  }
  return 0.5;
}

// ---------------------------------------------------------------------------
// Moves
// ---------------------------------------------------------------------------

function toChoice(hand: readonly Table[], move: Move): BossChoice {
  return { characterId: hand[move.hand].character.id, front: move.front, autoPlayed: false };
}

/** Chooses the bot's character and front for the current turn. */
export function chooseBossBotPlay(difficulty: BotDifficulty, view: BossBotView, rng: Rng): BossChoice {
  if (view.available.length === 0) throw new Error("The bot has no character left");
  const m = model(view);
  const t = view.turnIndex;
  const hand = view.available.map((character) => table(view, character, view.context.team, view.context));
  const moves = hand.flatMap((tab, p) =>
    view.fronts.map((_, f) => ({ move: { hand: p, front: f }, value: expectedPoints(m, tab, f, t) })),
  );

  switch (difficulty) {
    case "easy":
      // Random, preferring moves worth something.
      return toChoice(hand, pickWeighted(rng, moves, (o) => (o.value + 0.5) ** 2).move);
    case "medium": {
      // Greedy: the most points this turn, no planning.
      const best = Math.max(...moves.map((o) => o.value));
      const top = moves.filter((o) => o.value >= best - 1e-9);
      return toChoice(hand, top[randomInt(rng, top.length)].move);
    }
    case "hard": {
      // The planner, varying among near-equal moves: an opponent cannot read it.
      const options = planValues(m, hand, t);
      const best = Math.max(...options.map((o) => o.value));
      const tolerance = Math.max(HARD_TOLERANCE_POINTS, HARD_TOLERANCE_SHARE * best);
      const near = options.filter((o) => o.value >= best - tolerance);
      return toChoice(hand, near[randomInt(rng, near.length)].move);
    }
    case "super_pro":
      return toChoice(hand, simulateBossMove(m, hand, rng));
  }
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

/**
 * Super Pro: Monte Carlo. Each simulation draws an opponent hand that fits what is
 * known and lets the planner choose the opponent's move, then tries every option
 * against that same draw, both sides played by the planner after it. So it reads
 * where the opponent is likely to go, not only the points table.
 */
function simulateBossMove(m: Model, hand: Table[], rng: Rng): Move {
  const view = m.view;
  const t = view.turnIndex;
  const options: Move[] = shuffle(
    rng,
    hand.flatMap((_, p) => view.fronts.map((__, f) => ({ hand: p, front: f }))),
  );
  if (view.opponentHandSize === 0 || view.opponentPool.length === 0) return plannerMove(m, hand, t, rng);
  const pool = view.opponentPool.map((character) => table(view, character, [character]));
  const wins = new Array<number>(options.length).fill(0);
  const simulations = Math.max(1, Math.ceil(BOSS_SUPER_PRO_SIMULATIONS / options.length));
  for (let k = 0; k < simulations; k++) {
    const theirs = sample(rng, pool, view.opponentHandSize);
    const seed = randomInt(rng, 2 ** 31);
    const theirFirst = plannerMove(m, theirs, t, mulberry32(seed ^ 0x5bd1));
    options.forEach((option, o) => {
      const r = mulberry32(seed);
      const a: Fast = { hand: [...hand], points: view.points, taken: view.taken, total: view.scoreLead };
      const b: Fast = { hand: [...theirs], points: view.opponentPoints, taken: view.opponentTaken, total: 0 };
      resolveFast(m, a, b, option, theirFirst, t);
      for (let u = t + 1; u < view.turnCount && a.hand.length > 0 && b.hand.length > 0; u++) {
        resolveFast(m, a, b, plannerMove(m, a.hand, u, r), plannerMove(m, b.hand, u, r), u);
      }
      wins[o] += outcome(a, b);
    });
  }
  return options[wins.indexOf(Math.max(...wins))];
}

/**
 * Plays the current turn against a bot. The bot decides first, from its own view
 * only; then the player's choice is applied (null = timer expired: autoBossChoice).
 */
export function playBossBotTurn(params: {
  state: BossState;
  catalog: BotKnowledge;
  difficulty: BotDifficulty;
  playerSide: Side;
  playerChoice: { characterId: string; front: number } | null;
  rng: Rng;
}) {
  const { state, catalog, difficulty, playerSide, playerChoice, rng } = params;
  const botSide = otherSide(playerSide);
  const botChoice = chooseBossBotPlay(difficulty, bossBotView(state, botSide, catalog), rng);
  return playBossPvpTurn({
    state,
    choices: { [playerSide]: playerChoice, [botSide]: botChoice } as Record<Side, { characterId: string; front: number } | null>,
    families: catalog.families,
    rng,
  });
}
