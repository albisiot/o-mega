import { abilityMalusFrom, carriedBonusAfter, compareScores, scorePlay } from "./scoring.ts";
import type {
  AbilityFamilies,
  Character,
  MatchResult,
  MatchState,
  PlayRecord,
  RoundRecord,
  Side,
  Threat,
} from "./types.ts";

export const SIDES: readonly Side[] = ["a", "b"];

export function otherSide(side: Side): Side {
  return side === "a" ? "b" : "a";
}

export function roundsWon(state: MatchState): Record<Side, number> {
  const won = { a: 0, b: 0 };
  for (const round of state.rounds) if (round.winner) won[round.winner] += 1;
  return won;
}

export function totalScores(state: MatchState): Record<Side, number> {
  const totals = { a: 0, b: 0 };
  for (const round of state.rounds) for (const side of SIDES) totals[side] += round.plays[side].total;
  return totals;
}

/** 1-based number of the next round to play. */
export function currentRoundNumber(state: MatchState): number {
  return state.rounds.length + 1;
}

export function currentThreat(state: MatchState): Threat {
  const threat = state.threats[state.rounds.length];
  if (!threat) throw new Error("No threat left: the match is over");
  return threat;
}

/** Characters of a side not yet used: each one plays once per match (SPEC §5.5). */
export function availableCharacters(state: MatchState, side: Side): Character[] {
  const used = new Set(state.rounds.map((round) => round.plays[side].characterId));
  return state.teams[side].filter((character) => !used.has(character.id));
}

/** Bonus a side carries into the next round (Riscossa after a lost round). */
export function carriedBonus(state: MatchState, side: Side): number {
  const last = state.rounds.at(-1);
  if (!last) return 0;
  const character = state.teams[side].find((c) => c.id === last.plays[side].characterId);
  if (!character) return 0;
  return carriedBonusAfter(character, last.winner === otherSide(side));
}

/** Ends as soon as a side reaches the rounds to win, or after the last threat. */
export function isFinished(state: MatchState): boolean {
  const won = roundsWon(state);
  return (
    Math.max(won.a, won.b) >= state.rules.roundsToWin ||
    state.rounds.length >= Math.min(state.threats.length, state.rules.threatsPerMatch)
  );
}

/** More rounds won; then higher total score; otherwise a draw (SPEC §5.6). null while playing. */
export function matchResult(state: MatchState): MatchResult | null {
  if (!isFinished(state)) return null;
  const won = roundsWon(state);
  if (won.a !== won.b) return won.a > won.b ? "a" : "b";
  const totals = totalScores(state);
  if (totals.a !== totals.b) return totals.a > totals.b ? "a" : "b";
  return "draw";
}

export type RoundChoice = { characterId: string; autoPlayed: boolean };

/** Scores both choices against the current threat and appends the round. Pure. */
export function resolveRound(
  state: MatchState,
  choices: Record<Side, RoundChoice>,
  families: AbilityFamilies,
): { state: MatchState; round: RoundRecord } {
  if (isFinished(state)) throw new Error("The match is already over");
  const threat = currentThreat(state);
  const won = roundsWon(state);

  const chosen = {} as Record<Side, Character>;
  for (const side of SIDES) {
    const character = availableCharacters(state, side).find((c) => c.id === choices[side].characterId);
    if (!character) throw new Error(`Character ${choices[side].characterId} is not available for side ${side}`);
    chosen[side] = character;
  }

  const plays = {} as Record<Side, PlayRecord>;
  for (const side of SIDES) {
    const score = scorePlay(chosen[side], threat, {
      families,
      roundsWon: won[side],
      opponentRoundsWon: won[otherSide(side)],
      carriedBonus: carriedBonus(state, side),
      round: currentRoundNumber(state),
      team: state.teams[side],
      abilityMalus: abilityMalusFrom(chosen[otherSide(side)]),
    });
    plays[side] = { ...score, autoPlayed: choices[side].autoPlayed };
  }

  const round: RoundRecord = {
    round: currentRoundNumber(state),
    threatId: threat.id,
    plays,
    winner: compareScores(plays.a, plays.b),
  };
  return { state: { ...state, rounds: [...state.rounds, round] }, round };
}
