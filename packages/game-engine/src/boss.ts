// Grande Minaccia (SPEC §5.12): a boss with five fronts, all visible from the
// start, and a table of the points each front is worth in each turn. Every turn
// both sides secretly place a character on one of their own free fronts, where
// it stays for the rest of the match with the score it made when it arrived.
// Then every occupied front pays its value of that turn: to the only character
// on it, or to the higher of the two. After the last turn the side with more
// points wins. Pure: the Edge Function loads and stores.

import { otherSide, SIDES } from "./match.ts";
import { pickOne, shuffle, type Rng } from "./rng.ts";
import { abilityMalusOn, asPlayedAgainst, carriedBonusAfter, compareScores, scorePlay, type PlayOutcome, type ScoreContext } from "./scoring.ts";
import type { AbilityFamilies, Character, MatchResult, PlayScore, Side, Threat } from "./types.ts";

/** The numbers of the mode (balance.ts `boss`, game_config `boss.*`). */
export type BossRules = {
  /** Turns of a match; each side places one character per turn, each character once. */
  turns: number;
  /** Fronts of a boss: one place per side on each. */
  fronts: number;
  /** Fronts worth `hotValue` in the first turn; the others are worth `baseValue`. */
  hotFronts: number;
  hotValue: number;
  baseValue: number;
  /** Every later turn each front is worth `growth` more than in the turn before... */
  growth: number;
  /** ...and `extraFronts` random fronts `extraGrowth` more on top of that. */
  extraFronts: number;
  extraGrowth: number;
};

/** A choice for one turn: who arrives, and on which of the side's free fronts (0-based). */
export type BossChoice = { characterId: string; front: number; autoPlayed: boolean };

export type BossPlay = PlayScore & {
  autoPlayed: boolean;
  /** 0-based front the character was placed on; it stays there. */
  front: number;
  /** Points the side took this turn, from every front it held. */
  points: number;
  /** How its own front ended this turn (Riscossa, Slancio, Vendetta): held, lost or nobody's. */
  outcome: PlayOutcome;
};

export type BossTurnRecord = {
  /** 1-based. */
  turn: number;
  plays: Record<Side, BossPlay>;
  /** Who held each front this turn, in front order; null: nobody there, or a tie. */
  holders: (Side | null)[];
};

/** Everything the server knows about a Grande Minaccia match. Never send it to a client as is. */
export type BossState = {
  rules: BossRules;
  /** The boss's fronts, in slot order. */
  fronts: Threat[];
  /** values[turn][front]: points each front is worth in each turn (0-based both), public from the start. */
  values: number[][];
  teams: Record<Side, Character[]>;
  turns: BossTurnRecord[];
};

/** A character standing on a front: its score is the one it made when it arrived. */
export type BossOccupant = { characterId: string; score: PlayScore; turn: number };

// ---------------------------------------------------------------------------
// Points table
// ---------------------------------------------------------------------------

/** Draws the points table: two hot fronts in turn 1, then all +growth and two random fronts +extra. */
export function drawBossValues(rng: Rng, rules: BossRules): number[][] {
  const fronts = Array.from({ length: rules.fronts }, (_, i) => i);
  const hot = new Set(shuffle(rng, fronts).slice(0, rules.hotFronts));
  const current = fronts.map((f) => (hot.has(f) ? rules.hotValue : rules.baseValue));
  const values: number[][] = [[...current]];
  for (let turn = 1; turn < rules.turns; turn++) {
    const extra = new Set(shuffle(rng, fronts).slice(0, rules.extraFronts));
    fronts.forEach((f) => {
      current[f] += rules.growth + (extra.has(f) ? rules.extraGrowth : 0);
    });
    values.push([...current]);
  }
  return values;
}

/** Whether a points table follows the rules: the same check the database makes. */
export function isValidBossValues(values: readonly (readonly number[])[], rules: BossRules): boolean {
  if (values.length !== rules.turns || values.some((row) => row.length !== rules.fronts || !row.every(Number.isInteger))) {
    return false;
  }
  const first = values[0];
  const hot = first.filter((v) => v === rules.hotValue).length;
  const base = first.filter((v) => v === rules.baseValue).length;
  if (rules.hotValue === rules.baseValue ? base !== rules.fronts : hot !== rules.hotFronts || base !== rules.fronts - rules.hotFronts) {
    return false;
  }
  for (let turn = 1; turn < values.length; turn++) {
    const steps = values[turn].map((v, f) => v - values[turn - 1][f]);
    const extra = steps.filter((s) => s === rules.growth + rules.extraGrowth).length;
    const plain = steps.filter((s) => s === rules.growth).length;
    if (rules.extraGrowth === 0 ? plain !== rules.fronts : extra !== rules.extraFronts || plain !== rules.fronts - rules.extraFronts) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** 1-based number of the next turn to play. */
export function bossTurnNumber(state: BossState): number {
  return state.turns.length + 1;
}

/** Turns of the match: one per character and per front, at most `rules.turns`. */
export function bossTurnCount(state: BossState): number {
  return Math.min(state.rules.turns, state.fronts.length, state.teams.a.length, state.teams.b.length, state.values.length);
}

export function isBossFinished(state: BossState): boolean {
  return state.turns.length >= bossTurnCount(state);
}

/** Characters of a side not placed yet: each one arrives once and stays. */
export function availableBossCharacters(state: BossState, side: Side): Character[] {
  const used = new Set(state.turns.map((turn) => turn.plays[side].characterId));
  return state.teams[side].filter((character) => !used.has(character.id));
}

/** The side's character on each front, null where it has none yet. */
export function bossBoard(state: BossState, side: Side): (BossOccupant | null)[] {
  const board: (BossOccupant | null)[] = state.fronts.map(() => null);
  for (const turn of state.turns) {
    const { characterId, front, ...score } = turn.plays[side];
    board[front] = { characterId, score: { ...score, characterId }, turn: turn.turn };
  }
  return board;
}

/** The fronts where the side can still place a character. */
export function freeBossFronts(state: BossState, side: Side): number[] {
  return bossBoard(state, side)
    .map((occupant, front) => (occupant ? -1 : front))
    .filter((front) => front >= 0);
}

/** Points so far. */
export function bossPoints(state: BossState): Record<Side, number> {
  const points = { a: 0, b: 0 };
  for (const turn of state.turns) for (const side of SIDES) points[side] += turn.plays[side].points;
  return points;
}

/** Fronts held so far, one per front per turn: the "rounds won" of the powers and the first tie-break. */
export function frontsTaken(state: BossState): Record<Side, number> {
  const taken = { a: 0, b: 0 };
  for (const turn of state.turns) for (const holder of turn.holders) if (holder) taken[holder] += 1;
  return taken;
}

/** Sum of the scores of the characters placed. */
export function bossTotalScores(state: BossState): Record<Side, number> {
  const totals = { a: 0, b: 0 };
  for (const turn of state.turns) for (const side of SIDES) totals[side] += turn.plays[side].total;
  return totals;
}

/** More points; then more fronts held; then the higher sum of scores; otherwise a draw. null while playing. */
export function bossResult(state: BossState): MatchResult | null {
  if (!isBossFinished(state)) return null;
  for (const tally of [bossPoints(state), frontsTaken(state), bossTotalScores(state)]) {
    if (tally.a !== tally.b) return tally.a > tally.b ? "a" : "b";
  }
  return "draw";
}

function characterOf(state: BossState, side: Side, id: string): Character | undefined {
  return state.teams[side].find((c) => c.id === id);
}

/**
 * The opposing character a newcomer meets on its front: the one already there, or
 * the one arriving in the same turn. Its powers that act on an opponent act on it.
 */
function opponentOnFront(state: BossState, side: Side, front: number, arriving?: Character): Character | undefined {
  if (arriving) return arriving;
  const occupant = bossBoard(state, otherSide(side))[front];
  return occupant ? characterOf(state, otherSide(side), occupant.characterId) : undefined;
}

/**
 * The character a side placed in a resolved turn, as it played: without its power
 * when the opposing character it met on its front was an Annullatore.
 */
export function bossPlayedIn(state: BossState, turn: BossTurnRecord, side: Side): Character | undefined {
  const own = characterOf(state, side, turn.plays[side].characterId);
  if (!own) return undefined;
  const before: BossState = { ...state, turns: state.turns.filter((t) => t.turn < turn.turn) };
  const front = turn.plays[side].front;
  const sameFront = turn.plays[otherSide(side)].front === front;
  const arriving = sameFront ? characterOf(state, otherSide(side), turn.plays[otherSide(side)].characterId) : undefined;
  return asPlayedAgainst(own, opponentOnFront(before, side, front, arriving), state.fronts[front]);
}

/**
 * What the powers of `side` know before the current turn (SPEC §5.12): the turn is
 * the round, fronts held are rounds won, Riscossa, Slancio and Vendetta read how the
 * side's last character did on its front, Crescendo the level of that front.
 */
export function bossContext(state: BossState, side: Side, families: AbilityFamilies): ScoreContext {
  const taken = frontsTaken(state);
  const last = state.turns.at(-1);
  const lastActing = last ? bossPlayedIn(state, last, side) : undefined;
  return {
    families,
    roundsWon: taken[side],
    opponentRoundsWon: taken[otherSide(side)],
    carriedBonus: last && lastActing ? carriedBonusAfter(lastActing, last.plays[side].outcome) : 0,
    round: bossTurnNumber(state),
    team: state.teams[side],
    previousLevel: last ? state.fronts[last.plays[side].front]?.level : undefined,
    previousOutcome: last?.plays[side].outcome,
    threatLevels: state.fronts.map((front) => front.level),
    played: state.turns.map((turn) => bossPlayedIn(state, turn, side)).filter((c): c is Character => c !== undefined),
  };
}

/** The score a character makes arriving on a front this turn, against `opponent` if one is there. */
function arrivalScore(
  state: BossState,
  side: Side,
  character: Character,
  front: number,
  opponent: Character | undefined,
  families: AbilityFamilies,
): PlayScore {
  const threat = state.fronts[front];
  const acting = asPlayedAgainst(character, opponent, threat);
  const opposing = opponent && asPlayedAgainst(opponent, character, threat);
  return scorePlay(acting, threat, {
    ...bossContext(state, side, families),
    abilityMalus: abilityMalusOn(acting, opposing),
    opponent: opposing,
  });
}

/**
 * How a character would score arriving on a front this turn, against the opposing
 * character already there (the opponent may also arrive in the same turn: only a
 * preview). The screen shows it; the server never uses it to decide.
 */
export function previewBossPlay(
  state: BossState,
  side: Side,
  character: Character,
  front: number,
  families: AbilityFamilies,
): { score: PlayScore; against: PlayScore | null } {
  if (!state.fronts[front]) throw new Error(`No front ${front}`);
  const score = arrivalScore(state, side, character, front, opponentOnFront(state, side, front), families);
  return { score, against: bossBoard(state, otherSide(side))[front]?.score ?? null };
}

/** Who holds a front: the only character on it, or the higher of the two (ties as in a round). */
export function frontHolder(a: PlayScore | null | undefined, b: PlayScore | null | undefined): Side | null {
  if (a && b) return compareScores(a, b);
  return a ? "a" : b ? "b" : null;
}

/** Timer expired: a random available character on a free front worth the most this turn. */
export function autoBossChoice(state: BossState, side: Side, rng: Rng): BossChoice {
  const row = state.values[state.turns.length];
  if (!row) throw new Error("The match is already over");
  const free = freeBossFronts(state, side);
  const best = Math.max(...free.map((f) => row[f]));
  return {
    characterId: pickOne(rng, availableBossCharacters(state, side)).id,
    front: pickOne(rng, free.filter((f) => row[f] === best)),
    autoPlayed: true,
  };
}

/** Places both choices, then every occupied front pays this turn's value to its holder. Pure. */
export function resolveBossTurn(
  state: BossState,
  choices: Record<Side, BossChoice>,
  families: AbilityFamilies,
): { state: BossState; turn: BossTurnRecord } {
  if (isBossFinished(state)) throw new Error("The match is already over");
  const turnIndex = state.turns.length;
  const row = state.values[turnIndex];

  const chosen = {} as Record<Side, Character>;
  for (const side of SIDES) {
    const { characterId, front } = choices[side];
    if (!Number.isInteger(front) || !freeBossFronts(state, side).includes(front)) throw new Error("invalid_front");
    const character = availableBossCharacters(state, side).find((c) => c.id === characterId);
    if (!character) throw new Error(`Character ${characterId} is not available for side ${side}`);
    chosen[side] = character;
  }

  const sameFront = choices.a.front === choices.b.front;
  const scores = {} as Record<Side, PlayScore>;
  for (const side of SIDES) {
    const arriving = sameFront ? chosen[otherSide(side)] : undefined;
    const opponent = opponentOnFront(state, side, choices[side].front, arriving);
    scores[side] = arrivalScore(state, side, chosen[side], choices[side].front, opponent, families);
  }

  // The board after the arrivals: every character keeps the score it arrived with.
  const boards = { a: bossBoard(state, "a"), b: bossBoard(state, "b") };
  for (const side of SIDES) {
    boards[side][choices[side].front] = { characterId: chosen[side].id, score: scores[side], turn: turnIndex + 1 };
  }
  const holders = state.fronts.map((_, f) => frontHolder(boards.a[f]?.score, boards.b[f]?.score));
  const points = { a: 0, b: 0 };
  holders.forEach((holder, f) => {
    if (holder) points[holder] += row[f];
  });

  const plays = {} as Record<Side, BossPlay>;
  for (const side of SIDES) {
    const holder = holders[choices[side].front];
    plays[side] = {
      ...scores[side],
      autoPlayed: choices[side].autoPlayed,
      front: choices[side].front,
      points: points[side],
      outcome: holder === null ? "void" : holder === side ? "won" : "lost",
    };
  }

  const turn: BossTurnRecord = { turn: turnIndex + 1, plays, holders };
  return { state: { ...state, turns: [...state.turns, turn] }, turn };
}

/**
 * Resolves a turn between two players who chose in secret. A null choice (timer
 * expired) is played for that side as autoBossChoice says.
 */
export function playBossPvpTurn(params: {
  state: BossState;
  choices: Record<Side, { characterId: string; front: number } | null>;
  families: AbilityFamilies;
  rng: Rng;
}): { state: BossState; turn: BossTurnRecord; finished: boolean; result: MatchResult | null } {
  const { state, choices, families, rng } = params;
  const pick = (side: Side): BossChoice => {
    const choice = choices[side];
    if (choice === null) return autoBossChoice(state, side, rng);
    if (!availableBossCharacters(state, side).some((c) => c.id === choice.characterId)) throw new Error("character_not_available");
    if (!Number.isInteger(choice.front) || !freeBossFronts(state, side).includes(choice.front)) throw new Error("invalid_front");
    return { ...choice, autoPlayed: false };
  };
  const resolved = resolveBossTurn(state, { a: pick("a"), b: pick("b") }, families);
  return { ...resolved, finished: isBossFinished(resolved.state), result: bossResult(resolved.state) };
}
