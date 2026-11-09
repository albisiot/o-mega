// Grande Minaccia (SPEC §5.12): a boss with five fronts, all visible from the
// start, and a table of the points each front is worth in each turn. Every turn
// both sides secretly choose a character and a front. On the same front the two
// characters compare as in a round; on different fronts each side holds its own
// front by reaching the presidio target (half the Emergenza one). After the last
// turn the side with more points wins. Pure: the Edge Function loads and stores.

import { otherSide, outcomeFor, SIDES } from "./match.ts";
import { pickOne, shuffle, type Rng } from "./rng.ts";
import { abilityMalusOn, asPlayedAgainst, carriedBonusAfter, compareScores, scorePlay, type PlayOutcome, type ScoreContext } from "./scoring.ts";
import { requiredScore } from "./emergency.ts";
import type { AbilityFamilies, Character, MatchResult, PlayScore, Side, Threat } from "./types.ts";

/** The numbers of the mode (balance.ts `boss`, game_config `boss.*`). */
export type BossRules = {
  /** Turns of a match; each side plays one character per turn, each character once. */
  turns: number;
  /** Fronts of a boss. */
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
  /** Threat level → score that holds a front alone (presidio). */
  targets: Record<number, number>;
};

/** A choice for one turn: who plays, and on which front (0-based). */
export type BossChoice = { characterId: string; front: number; autoPlayed: boolean };

export type BossPlay = PlayScore & {
  autoPlayed: boolean;
  /** 0-based front the character played on. */
  front: number;
  /** Score that would have held the front alone; null when both sides chose it. */
  required: number | null;
  /** Points the side took this turn: the front's value, or 0. */
  points: number;
  /** Won: the front was taken. Void: same front, nobody took it. */
  outcome: PlayOutcome;
};

export type BossTurnRecord = {
  /** 1-based. */
  turn: number;
  plays: Record<Side, BossPlay>;
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

/** Turns of the match: one per character, at most `rules.turns`. */
export function bossTurnCount(state: BossState): number {
  return Math.min(state.rules.turns, state.teams.a.length, state.teams.b.length, state.values.length);
}

export function isBossFinished(state: BossState): boolean {
  return state.turns.length >= bossTurnCount(state);
}

/** Characters of a side not yet used: each one plays once per match. */
export function availableBossCharacters(state: BossState, side: Side): Character[] {
  const used = new Set(state.turns.map((turn) => turn.plays[side].characterId));
  return state.teams[side].filter((character) => !used.has(character.id));
}

/** Points so far. */
export function bossPoints(state: BossState): Record<Side, number> {
  const points = { a: 0, b: 0 };
  for (const turn of state.turns) for (const side of SIDES) points[side] += turn.plays[side].points;
  return points;
}

/** Fronts taken so far (a front taken in two turns counts twice): the "rounds won" of the powers. */
export function frontsTaken(state: BossState): Record<Side, number> {
  const taken = { a: 0, b: 0 };
  for (const turn of state.turns) for (const side of SIDES) if (turn.plays[side].outcome === "won") taken[side] += 1;
  return taken;
}

export function bossTotalScores(state: BossState): Record<Side, number> {
  const totals = { a: 0, b: 0 };
  for (const turn of state.turns) for (const side of SIDES) totals[side] += turn.plays[side].total;
  return totals;
}

/** More points; then more fronts taken; then the higher sum of scores; otherwise a draw. null while playing. */
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
 * The character a side played in a resolved turn, as it played: without its power
 * when an opposing Annullatore was on the same front. Alone on a front no opposing
 * power reaches it.
 */
export function bossPlayedIn(state: BossState, turn: BossTurnRecord, side: Side): Character | undefined {
  const own = characterOf(state, side, turn.plays[side].characterId);
  if (!own) return undefined;
  const front = state.fronts[turn.plays[side].front];
  const contested = turn.plays.a.front === turn.plays.b.front;
  const opponent = contested ? characterOf(state, otherSide(side), turn.plays[otherSide(side)].characterId) : undefined;
  return asPlayedAgainst(own, opponent, front);
}

/**
 * What the powers of `side` know before the current turn (SPEC §5.12): the turn is
 * the round, fronts taken are rounds won, Riscossa, Slancio and Vendetta read the
 * side's own previous turn, Crescendo the level of the front it played then.
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

/** Score that holds `front` alone: Sabotatore lowers it, Implacabile is satisfied one point short. */
export function presidioTarget(character: Character, front: Threat, rules: Pick<BossRules, "targets">): number {
  return requiredScore(character, front, rules);
}

/**
 * How a character would do alone on a front this turn: the score and the presidio
 * target. Only a preview (the opponent may choose the same front): the screen
 * shows it, the server never uses it to decide.
 */
export function previewBossPlay(
  state: BossState,
  side: Side,
  character: Character,
  front: number,
  families: AbilityFamilies,
): { score: PlayScore; required: number } {
  const threat = state.fronts[front];
  if (!threat) throw new Error(`No front ${front}`);
  const acting = asPlayedAgainst(character, null, threat);
  return {
    score: scorePlay(acting, threat, bossContext(state, side, families)),
    required: presidioTarget(acting, threat, state.rules),
  };
}

/** Timer expired: a random available character on a front worth the most this turn. */
export function autoBossChoice(state: BossState, side: Side, rng: Rng): BossChoice {
  const row = state.values[state.turns.length];
  if (!row) throw new Error("The match is already over");
  const best = Math.max(...row);
  const fronts = row.map((value, f) => (value === best ? f : -1)).filter((f) => f >= 0);
  return {
    characterId: pickOne(rng, availableBossCharacters(state, side)).id,
    front: pickOne(rng, fronts),
    autoPlayed: true,
  };
}

/** Scores both choices and appends the turn. Pure. */
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
    if (!Number.isInteger(front) || front < 0 || front >= state.fronts.length) throw new Error("invalid_front");
    const character = availableBossCharacters(state, side).find((c) => c.id === characterId);
    if (!character) throw new Error(`Character ${characterId} is not available for side ${side}`);
    chosen[side] = character;
  }

  const contested = choices.a.front === choices.b.front;
  const plays = {} as Record<Side, BossPlay>;

  if (contested) {
    const front = state.fronts[choices.a.front];
    const acting = { a: asPlayedAgainst(chosen.a, chosen.b, front), b: asPlayedAgainst(chosen.b, chosen.a, front) };
    const scores = {} as Record<Side, PlayScore>;
    for (const side of SIDES) {
      const opponent = acting[otherSide(side)];
      scores[side] = scorePlay(acting[side], front, {
        ...bossContext(state, side, families),
        abilityMalus: abilityMalusOn(acting[side], opponent),
        opponent,
      });
    }
    const winner = compareScores(scores.a, scores.b);
    for (const side of SIDES) {
      plays[side] = {
        ...scores[side],
        autoPlayed: choices[side].autoPlayed,
        front: choices[side].front,
        required: null,
        points: winner === side ? row[choices[side].front] : 0,
        outcome: outcomeFor(winner, side),
      };
    }
  } else {
    // Alone on a front: no opposing character, so the powers act as in Emergenza.
    for (const side of SIDES) {
      const front = state.fronts[choices[side].front];
      const acting = asPlayedAgainst(chosen[side], null, front);
      const score = scorePlay(acting, front, bossContext(state, side, families));
      const required = presidioTarget(acting, front, state.rules);
      const held = score.total >= required;
      plays[side] = {
        ...score,
        autoPlayed: choices[side].autoPlayed,
        front: choices[side].front,
        required,
        points: held ? row[choices[side].front] : 0,
        outcome: held ? "won" : "lost",
      };
    }
  }

  const turn: BossTurnRecord = { turn: turnIndex + 1, plays };
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
    if (!Number.isInteger(choice.front) || choice.front < 0 || choice.front >= state.fronts.length) throw new Error("invalid_front");
    return { ...choice, autoPlayed: false };
  };
  const resolved = resolveBossTurn(state, { a: pick("a"), b: pick("b") }, families);
  return { ...resolved, finished: isBossFinished(resolved.state), result: bossResult(resolved.state) };
}
