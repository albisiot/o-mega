import {
  abilityMalusOn,
  asPlayedAgainst,
  carriedBonusFrom,
  compareScores,
  scorePlay,
  wearDownFrom,
  type PlayOutcome,
  type PlayedBefore,
} from "./scoring.ts";
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

/** How a round ended for `side`. */
export function outcomeFor(winner: Side | null, side: Side): PlayOutcome {
  return winner === null ? "void" : winner === side ? "won" : "lost";
}

/**
 * The character a side played in a resolved round, as it played: without its power
 * against an Annullatore or on a threat that silences powers.
 */
export function playedIn(state: MatchState, round: RoundRecord, side: Side): Character | undefined {
  const find = (s: Side) => state.teams[s].find((c) => c.id === round.plays[s].characterId);
  const character = find(side);
  return (
    character &&
    asPlayedAgainst(character, find(otherSide(side)), state.threats[round.round - 1], playedBefore(state, round.round, side))
  );
}

/** What the two sides played in the round before `round`, as they played (Annullatore ritardato). */
export function playedBefore(state: MatchState, round: number, side: Side): PlayedBefore {
  const previous = state.rounds.find((r) => r.round === round - 1);
  if (!previous) return {};
  return { own: playedIn(state, previous, side), opponent: playedIn(state, previous, otherSide(side)) };
}

/**
 * Bonus a side carries into the next round: Riscossa after a lost round, Slancio after a
 * won one, Riscossa lunga from either of the last two rounds.
 */
export function carriedBonus(state: MatchState, side: Side): number {
  return carriedBonusFrom(
    state.rounds.slice(-2).map((round) => ({
      character: playedIn(state, round, side),
      outcome: outcomeFor(round.winner, side),
      margin: round.plays[side].total - round.plays[otherSide(side)].total,
    })),
  );
}

/** The characters a side has played so far, in order, as they played (Capobranco, Catalizzatore, Riverbero). */
export function playedBy(state: MatchState, side: Side): Character[] {
  return state.rounds.map((round) => playedIn(state, round, side)).filter((c): c is Character => c !== undefined);
}

/** How a side's previous round ended, none before the first round (Vendetta). */
export function previousOutcome(state: MatchState, side: Side): PlayOutcome | undefined {
  const last = state.rounds.at(-1);
  return last ? outcomeFor(last.winner, side) : undefined;
}

/** Levels of every threat of the match (Grande prova): public from the start. */
export function threatLevels(state: MatchState): number[] {
  return state.threats.slice(0, state.rules.threatsPerMatch).map((threat) => threat.level);
}

/** Level of the previous round's threat, none before the first round (Crescendo). */
export function previousLevel(state: MatchState): number | undefined {
  return state.rounds.length > 0 ? state.threats[state.rounds.length - 1]?.level : undefined;
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

  // Annullatore (also one played in the round before), Silenzio della tomba: the character plays without its power.
  const number = currentRoundNumber(state);
  const acting = {
    a: asPlayedAgainst(chosen.a, chosen.b, threat, playedBefore(state, number, "a")),
    b: asPlayedAgainst(chosen.b, chosen.a, threat, playedBefore(state, number, "b")),
  };
  const totals = totalScores(state);

  const plays = {} as Record<Side, PlayRecord>;
  for (const side of SIDES) {
    const score = scorePlay(acting[side], threat, {
      families,
      roundsWon: won[side],
      opponentRoundsWon: won[otherSide(side)],
      carriedBonus: carriedBonus(state, side),
      round: currentRoundNumber(state),
      team: state.teams[side],
      abilityMalus: abilityMalusOn(acting[side], acting[otherSide(side)], threat),
      opponent: acting[otherSide(side)],
      previousLevel: previousLevel(state),
      previousOutcome: previousOutcome(state, side),
      threatLevels: threatLevels(state),
      played: playedBy(state, side),
      scoreLead: totals[side] - totals[otherSide(side)],
      wornDown: wearDownFrom(playedBefore(state, number, side).opponent),
    });
    plays[side] = { ...score, autoPlayed: choices[side].autoPlayed };
  }

  const round: RoundRecord = {
    round: currentRoundNumber(state),
    threatId: threat.id,
    plays,
    winner: compareScores(plays.a, plays.b, threat),
  };
  return { state: { ...state, rounds: [...state.rounds, round] }, round };
}
