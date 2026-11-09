// Bots of the Grande Minaccia (SPEC §5.12). Like the bots of a match they know only
// what a player knows: the boss, the whole points table, the board (every character
// already placed, with its score), their own hand. Never the opponent's choice for
// this turn nor the rest of their hand.
//
// They decide on a fast model of the mode: each character's score on each front in
// each turn, and a chance that the front stays theirs once the opponent arrives.
// Strength on the real catalog: scripts/simulate-boss.mts.

import {
  availableBossCharacters,
  bossBoard,
  bossContext,
  bossPoints,
  bossTotalScores,
  bossTurnCount,
  frontsTaken,
  playBossPvpTurn,
  previewBossPlay,
  type BossChoice,
  type BossState,
} from "./boss.ts";
import { type BotDifficulty, type BotKnowledge } from "./bots.ts";
import { otherSide } from "./match.ts";
import { mulberry32, pickWeighted, randomInt, shuffle, type Rng } from "./rng.ts";
import { baseScore, highestRequired, scorePlay, type ScoreContext } from "./scoring.ts";
import type { AbilityCode, AbilityFamilies, Character, Side, Threat } from "./types.ts";

/**
 * Monte Carlo of Hard and Super Pro: the moves the model rates best, and the playouts
 * run for all of them together. Fewer candidates keep each one's estimate steady.
 */
export const BOSS_HARD_SEARCH = { candidates: 4, simulations: 160 };
export const BOSS_SUPER_PRO_SEARCH = { candidates: 8, simulations: 800 };

/** A character on a front, as the model compares them. */
type Slot = { score: number; highest: number } | null;

export type BossBotView = {
  available: Character[];
  fronts: Threat[];
  values: number[][];
  /** 0-based index of the current turn. */
  turnIndex: number;
  turnCount: number;
  /** What the bot's powers know this turn (bossContext). */
  context: ScoreContext;
  /** Exact scores of each available character arriving on each front this turn. */
  now: Map<string, number[]>;
  board: Slot[];
  opponentBoard: Slot[];
  points: number;
  opponentPoints: number;
  taken: number;
  opponentTaken: number;
  /** Sum of scores so far, own minus opponent's (last tie-break). */
  scoreLead: number;
  /** Catalog characters the opponent may still place: a team never repeats a character. */
  opponentPool: Character[];
  opponentHandSize: number;
  families: AbilityFamilies;
  abilityMeans: Record<AbilityCode, number>;
};

export function bossBotView(state: BossState, side: Side, knowledge: BotKnowledge): BossBotView {
  const opponent = otherSide(side);
  const seen = new Set(
    state.turns.map((turn) => state.teams[opponent].find((c) => c.id === turn.plays[opponent].characterId)?.definitionId),
  );
  const points = bossPoints(state);
  const taken = frontsTaken(state);
  const totals = bossTotalScores(state);
  const slots = (s: Side): Slot[] =>
    bossBoard(state, s).map((o) => (o ? { score: o.score.total, highest: o.score.highest } : null));
  const available = availableBossCharacters(state, side);
  return {
    available,
    fronts: state.fronts,
    values: state.values,
    turnIndex: state.turns.length,
    turnCount: bossTurnCount(state),
    context: bossContext(state, side, knowledge.families),
    now: new Map(
      available.map((c) => [c.id, state.fronts.map((_, f) => previewBossPlay(state, side, c, f, knowledge.families).score.total)]),
    ),
    board: slots(side),
    opponentBoard: slots(opponent),
    points: points[side],
    opponentPoints: points[opponent],
    taken: taken[side],
    opponentTaken: taken[opponent],
    scoreLead: totals[side] - totals[opponent],
    opponentPool: knowledge.characters.filter((c) => !seen.has(c.definitionId)),
    opponentHandSize: availableBossCharacters(state, opponent).length,
    families: knowledge.families,
    abilityMeans: knowledge.abilityMeans,
  };
}

// ---------------------------------------------------------------------------
// Fast model
// ---------------------------------------------------------------------------

/** A character's score on every front in every turn, and its highest required value. */
type Table = { character: Character; total: number[][]; highest: number[] };
type Fast = { hand: Table[]; board: Slot[]; points: number; taken: number; total: number };
type Move = { hand: number; front: number };

type Model = { view: BossBotView; expected: number[]; scale: number[]; tables: Map<Character, Table> };

function model(view: BossBotView): Model {
  const typical: Character = { id: "typical", definitionId: "typical", faction: "", rarityRank: 0, stats: view.abilityMeans, power: null };
  return {
    view,
    expected: view.fronts.map((front) => baseScore(typical, front)),
    scale: view.fronts.map((front) => 2.5 * Math.sqrt(front.level)),
    tables: new Map(),
  };
}

/**
 * Scores of a character arriving on every front in every turn from now on: exact for
 * the bot's own characters this turn, alone and without the effects of earlier turns
 * otherwise.
 */
function table(m: Model, character: Character, team: readonly Character[]): Table {
  const cached = m.tables.get(character);
  if (cached) return cached;
  const { view } = m;
  const levels = view.fronts.map((front) => front.level);
  const exact = view.now.get(character.id);
  const result: Table = {
    character,
    total: view.fronts.map((front, f) =>
      Array.from({ length: view.turnCount }, (_, t) => {
        if (t < view.turnIndex) return 0;
        if (exact && t === view.turnIndex) return exact[f];
        return scorePlay(character, front, {
          families: view.families,
          roundsWon: 0,
          opponentRoundsWon: 0,
          carriedBonus: 0,
          round: t + 1,
          team,
          threatLevels: levels,
          played: [],
        }).total;
      }),
    ),
    highest: view.fronts.map((front) => highestRequired(character, front)),
  };
  m.tables.set(character, result);
  return result;
}

const beats = (a: Slot, b: Slot) => !!a && (!b || a.score > b.score || (a.score === b.score && a.highest > b.highest));

/** Chance that a score stays above whatever the opponent will bring to the front. */
function holdChance(m: Model, front: number, score: number): number {
  return 1 / (1 + Math.exp(-(score - m.expected[front]) / m.scale[front]));
}

/** Expected points of placing a character on a free front now, from now to the end. */
function placementValue(m: Model, opp: Fast, tab: Table, front: number, t: number): number {
  const score = tab.total[front][t];
  const mine: Slot = { score, highest: tab.highest[front] };
  const theirs = opp.board[front];
  const hold = holdChance(m, front, score);
  let value = 0;
  for (let u = t; u < m.view.turnCount; u++) {
    const worth = m.view.values[u][front];
    if (theirs) value += beats(mine, theirs) ? worth : 0;
    // Not there yet: likely ours this turn, then it depends on who they bring.
    else value += worth * (u === t ? 0.85 + 0.15 * hold : 0.45 + 0.55 * hold);
  }
  return value;
}

function options(me: Fast): Move[] {
  const free = me.board.map((slot, f) => (slot ? -1 : f)).filter((f) => f >= 0);
  return me.hand.flatMap((_, h) => free.map((front) => ({ hand: h, front })));
}

/** The move worth the most now, ties broken at random. */
function greedyMove(m: Model, me: Fast, opp: Fast, t: number, rng: Rng): Move {
  let best = -Infinity;
  let picks: Move[] = [];
  for (const move of options(me)) {
    const value = placementValue(m, opp, me.hand[move.hand], move.front, t);
    if (value > best + 1e-9) [best, picks] = [value, [move]];
    else if (Math.abs(value - best) <= 1e-9) picks.push(move);
  }
  return picks[randomInt(rng, picks.length)];
}

function place(side: Fast, move: Move, t: number) {
  const tab = side.hand[move.hand];
  const score = tab.total[move.front][t];
  side.board = [...side.board];
  side.board[move.front] = { score, highest: tab.highest[move.front] };
  side.total += score;
  side.hand = side.hand.filter((_, i) => i !== move.hand);
}

function payTurn(m: Model, a: Fast, b: Fast, t: number) {
  a.board.forEach((_, f) => {
    if (beats(a.board[f], b.board[f])) {
      a.points += m.view.values[t][f];
      a.taken += 1;
    } else if (beats(b.board[f], a.board[f])) {
      b.points += m.view.values[t][f];
      b.taken += 1;
    }
  });
}

/** 1 = win, 0.5 = draw, 0 = loss, with the tie-breaks of the mode. */
function outcome(a: Fast, b: Fast): number {
  for (const [x, y] of [[a.points, b.points], [a.taken, b.taken], [a.total, b.total]]) {
    if (x !== y) return x > y ? 1 : 0;
  }
  return 0.5;
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
 * Monte Carlo: each simulation draws an opponent hand that fits what is known, then
 * tries every candidate against that same draw, both sides playing greedily afterwards.
 */
function simulateMove(m: Model, me: Fast, opp: Fast, search: { candidates: number; simulations: number }, rng: Rng): Move {
  const view = m.view;
  const t = view.turnIndex;
  const { simulations } = search;
  const moves = shuffle(rng, options(me))
    .map((move) => ({ move, value: placementValue(m, opp, me.hand[move.hand], move.front, t) }))
    .sort((x, y) => y.value - x.value)
    .slice(0, search.candidates)
    .map(({ move }) => move);
  if (moves.length === 1 || view.opponentHandSize === 0 || view.opponentPool.length === 0) return greedyMove(m, me, opp, t, rng);
  const wins = new Array<number>(moves.length).fill(0);
  const rounds = Math.max(1, Math.ceil(simulations / moves.length));
  for (let k = 0; k < rounds; k++) {
    const theirs = sample(rng, view.opponentPool, view.opponentHandSize).map((c) => table(m, c, [c]));
    const seed = randomInt(rng, 2 ** 31);
    moves.forEach((move, i) => {
      const r = mulberry32(seed);
      const a: Fast = { ...me, hand: [...me.hand] };
      const b: Fast = { ...opp, hand: theirs };
      for (let u = t; u < view.turnCount && a.hand.length > 0 && b.hand.length > 0; u++) {
        const moveA = u === t ? move : greedyMove(m, a, b, u, r);
        const moveB = greedyMove(m, b, a, u, r);
        place(a, moveA, u);
        place(b, moveB, u);
        payTurn(m, a, b, u);
      }
      wins[i] += outcome(a, b);
    });
  }
  return moves[wins.indexOf(Math.max(...wins))];
}

/** Chooses the bot's character and front for the current turn. */
export function chooseBossBotPlay(difficulty: BotDifficulty, view: BossBotView, rng: Rng): BossChoice {
  if (view.available.length === 0) throw new Error("The bot has no character left");
  const m = model(view);
  const t = view.turnIndex;
  const me: Fast = {
    hand: view.available.map((c) => table(m, c, view.context.team)),
    board: view.board,
    points: view.points,
    taken: view.taken,
    total: view.scoreLead,
  };
  const opp: Fast = { hand: [], board: view.opponentBoard, points: view.opponentPoints, taken: view.opponentTaken, total: 0 };
  const choose = (move: Move): BossChoice => ({ characterId: me.hand[move.hand].character.id, front: move.front, autoPlayed: false });

  switch (difficulty) {
    case "easy":
      // Random, preferring moves worth something.
      return choose(pickWeighted(rng, options(me), (move) => (placementValue(m, opp, me.hand[move.hand], move.front, t) + 1) ** 2));
    case "medium":
      // Greedy: the most points from now on for this placement, no look at the opponent's hand.
      return choose(greedyMove(m, me, opp, t, rng));
    case "hard":
      return choose(simulateMove(m, me, opp, BOSS_HARD_SEARCH, rng));
    case "super_pro":
      return choose(simulateMove(m, me, opp, BOSS_SUPER_PRO_SEARCH, rng));
  }
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
