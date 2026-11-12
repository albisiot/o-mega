// Allarme Triplo (SPEC §5.13): three threats, drawn at random and visible from the
// start, stay the same for the whole match. Each side brings a deck of nine
// characters, shuffled by the server. Every round both sides draw the next three
// cards of their deck and secretly place one on each threat; on each threat the
// two characters compare as in a round of a match, and the winner takes a point.
// After three rounds every card has played once: the side with more points wins.
// Pure: the Edge Function loads and stores.

import { otherSide, SIDES } from "./match.ts";
import { shuffle, type Rng } from "./rng.ts";
import {
  abilityMalusOn,
  asPlayedAgainst,
  carriedBonusAfter,
  compareScores,
  scorePlay,
  type PlayOutcome,
  type ScoreContext,
} from "./scoring.ts";
import type { AbilityFamilies, Character, MatchResult, PlayScore, Side, Threat } from "./types.ts";

/** The numbers of the mode (balance.ts `triple`, game_config `triple.*`). */
export type TripleRules = {
  /** Rounds of a match. */
  rounds: number;
  /** Threats of a match, the same in every round: one card per threat per round. */
  threats: number;
  /**
   * Rounds of a classic match. The powers that look at the round number (Apripista,
   * Ultimo baluardo) read round r of this mode as its place in a classic match: the
   * first round is the first, the last the last, the others in between.
   */
  classicRounds: number;
};

/** Cards of a deck: one per threat in every round. */
export function tripleDeckSize(rules: TripleRules): number {
  return rules.rounds * rules.threats;
}

/** One side's choice for a round: the character placed on each threat, in threat order. */
export type TriplePlacement = { characterIds: string[]; autoPlayed: boolean };

export type TriplePlay = PlayScore & {
  autoPlayed: boolean;
  /** How the threat ended for this side: won, lost or void. */
  outcome: PlayOutcome;
};

export type TripleRoundRecord = {
  /** 1-based. */
  round: number;
  /** plays[side][threat]: the character each side placed on each threat (0-based). */
  plays: Record<Side, TriplePlay[]>;
  /** Who won each threat this round; null: a void contest. */
  winners: (Side | null)[];
};

/** Everything the server knows about an Allarme Triplo. Never send it to a client as is. */
export type TripleState = {
  rules: TripleRules;
  /** The threats of the match, in slot order, with their modifiers. */
  threats: Threat[];
  /** Each side's deck in draw order: round r draws cards r*threats .. r*threats + threats - 1. */
  decks: Record<Side, Character[]>;
  rounds: TripleRoundRecord[];
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

/** Distinct threats drawn at random from the catalog, of any level. */
export function drawTripleThreats(rng: Rng, catalog: readonly Threat[], rules: TripleRules): Threat[] {
  const distinct = [...new Map(catalog.map((threat) => [threat.id, threat])).values()];
  if (distinct.length < rules.threats) throw new Error("Not enough threats for an Allarme Triplo");
  return shuffle(rng, distinct).slice(0, rules.threats);
}

/** The order a deck is drawn in: the server shuffles it once, when the match starts. */
export function shuffleDeck(rng: Rng, deck: readonly Character[]): Character[] {
  return shuffle(rng, deck);
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** 1-based number of the next round to play. */
export function tripleRoundNumber(state: TripleState): number {
  return state.rounds.length + 1;
}

/** Rounds of the match: as many as the decks allow, at most `rules.rounds`. */
export function tripleRoundCount(state: TripleState): number {
  const perRound = state.threats.length;
  return Math.min(
    state.rules.rounds,
    Math.floor(state.decks.a.length / perRound),
    Math.floor(state.decks.b.length / perRound),
  );
}

export function isTripleFinished(state: TripleState): boolean {
  return state.rounds.length >= tripleRoundCount(state);
}

/** The cards a side draws in a round (1-based): the next ones of its deck. */
export function tripleHandOf(state: TripleState, side: Side, round: number): Character[] {
  const size = state.threats.length;
  return state.decks[side].slice((round - 1) * size, round * size);
}

/** The cards a side holds in the current round. */
export function tripleHand(state: TripleState, side: Side): Character[] {
  return isTripleFinished(state) ? [] : tripleHandOf(state, side, tripleRoundNumber(state));
}

/** Threats won by each side so far: one point each. */
export function triplePoints(state: TripleState): Record<Side, number> {
  const points = { a: 0, b: 0 };
  for (const round of state.rounds) for (const winner of round.winners) if (winner) points[winner] += 1;
  return points;
}

/** Sum of every score each side made so far (tie-break). */
export function tripleTotalScores(state: TripleState): Record<Side, number> {
  const totals = { a: 0, b: 0 };
  for (const round of state.rounds) {
    for (const side of SIDES) for (const play of round.plays[side]) totals[side] += play.total;
  }
  return totals;
}

/** More points; then the higher sum of scores; otherwise a draw. null while playing. */
export function tripleResult(state: TripleState): MatchResult | null {
  if (!isTripleFinished(state)) return null;
  const points = triplePoints(state);
  if (points.a !== points.b) return points.a > points.b ? "a" : "b";
  const totals = tripleTotalScores(state);
  if (totals.a !== totals.b) return totals.a > totals.b ? "a" : "b";
  return "draw";
}

/** The round a power that counts rounds (Apripista, Ultimo baluardo) sees: its place in a classic match. */
export function triplePowerRound(rules: TripleRules, round: number): number {
  if (rules.rounds <= 1) return 1;
  return 1 + Math.round(((round - 1) * (rules.classicRounds - 1)) / (rules.rounds - 1));
}

function characterOf(state: TripleState, side: Side, id: string): Character | undefined {
  return state.decks[side].find((c) => c.id === id);
}

/**
 * The character a side placed on a threat in a resolved round, as it played:
 * without its power against an Annullatore or under Silenzio della tomba.
 */
export function triplePlayedIn(state: TripleState, round: TripleRoundRecord, side: Side, slot: number): Character | undefined {
  const own = characterOf(state, side, round.plays[side][slot].characterId);
  const theirs = characterOf(state, otherSide(side), round.plays[otherSide(side)][slot].characterId);
  return own && asPlayedAgainst(own, theirs, state.threats[slot]);
}

/**
 * What the powers of the character `side` places on threat `slot` know before the
 * current round (SPEC §5.13). Each threat is a lane: Riscossa, Slancio, Sacrificio,
 * Catalizzatore, Riverbero and Vendetta read the side's character on the same threat
 * in the round before; Crescendo the level of that threat, so it never pays. Threats
 * won are rounds won; Capobranco counts the characters of the earlier rounds.
 */
export function tripleContext(state: TripleState, side: Side, slot: number, families: AbilityFamilies): ScoreContext {
  const points = triplePoints(state);
  const last = state.rounds.at(-1);
  const lastHere = last ? triplePlayedIn(state, last, side, slot) : undefined;
  // Every earlier character as it played, the one on this threat in the round before last.
  const played: Character[] = [];
  state.rounds.forEach((round, r) => {
    const isLast = r === state.rounds.length - 1;
    round.plays[side].forEach((_, s) => {
      if (isLast && s === slot) return;
      const character = triplePlayedIn(state, round, side, s);
      if (character) played.push(character);
    });
  });
  if (lastHere) played.push(lastHere);
  return {
    families,
    roundsWon: points[side],
    opponentRoundsWon: points[otherSide(side)],
    carriedBonus: last && lastHere ? carriedBonusAfter(lastHere, last.plays[side][slot].outcome) : 0,
    round: triplePowerRound(state.rules, tripleRoundNumber(state)),
    team: state.decks[side],
    previousLevel: last ? state.threats[slot]?.level : undefined,
    previousOutcome: last?.plays[side][slot].outcome,
    threatLevels: state.threats.map((threat) => threat.level),
    played,
  };
}

/**
 * How a character would score on a threat this round, without knowing the opposing
 * character (no Sabotatore, Nemesi, …). The screen shows it; the server never uses it.
 */
export function previewTriplePlay(
  state: TripleState,
  side: Side,
  character: Character,
  slot: number,
  families: AbilityFamilies,
): PlayScore {
  const threat = state.threats[slot];
  if (!threat) throw new Error(`No threat ${slot}`);
  return scorePlay(asPlayedAgainst(character, undefined, threat), threat, tripleContext(state, side, slot, families));
}

/** Timer expired: the hand placed at random, one card per threat. */
export function autoTriplePlacement(state: TripleState, side: Side, rng: Rng): TriplePlacement {
  return { characterIds: shuffle(rng, tripleHand(state, side)).map((c) => c.id), autoPlayed: true };
}

/** Whether a placement puts each card of the side's hand on exactly one threat. */
export function isValidTriplePlacement(state: TripleState, side: Side, characterIds: readonly string[]): boolean {
  const hand = tripleHand(state, side).map((c) => c.id);
  return (
    characterIds.length === state.threats.length &&
    new Set(characterIds).size === characterIds.length &&
    characterIds.every((id) => hand.includes(id)) &&
    hand.length === characterIds.length
  );
}

/** Scores every threat of the current round and appends it. Pure. */
export function resolveTripleRound(
  state: TripleState,
  placements: Record<Side, TriplePlacement>,
  families: AbilityFamilies,
): { state: TripleState; round: TripleRoundRecord } {
  if (isTripleFinished(state)) throw new Error("The match is already over");
  for (const side of SIDES) {
    if (!isValidTriplePlacement(state, side, placements[side].characterIds)) throw new Error("invalid_placement");
  }

  const plays: Record<Side, TriplePlay[]> = { a: [], b: [] };
  const winners: (Side | null)[] = [];
  state.threats.forEach((threat, slot) => {
    const chosen = {
      a: characterOf(state, "a", placements.a.characterIds[slot])!,
      b: characterOf(state, "b", placements.b.characterIds[slot])!,
    };
    // Annullatore, Silenzio della tomba: the character plays without its power.
    const acting = { a: asPlayedAgainst(chosen.a, chosen.b, threat), b: asPlayedAgainst(chosen.b, chosen.a, threat) };
    const scores = {} as Record<Side, PlayScore>;
    for (const side of SIDES) {
      const opponent = acting[otherSide(side)];
      scores[side] = scorePlay(acting[side], threat, {
        ...tripleContext(state, side, slot, families),
        abilityMalus: abilityMalusOn(acting[side], opponent),
        opponent,
      });
    }
    const winner = compareScores(scores.a, scores.b, threat);
    winners.push(winner);
    for (const side of SIDES) {
      plays[side].push({
        ...scores[side],
        autoPlayed: placements[side].autoPlayed,
        outcome: winner === null ? "void" : winner === side ? "won" : "lost",
      });
    }
  });

  const round: TripleRoundRecord = { round: tripleRoundNumber(state), plays, winners };
  return { state: { ...state, rounds: [...state.rounds, round] }, round };
}

/**
 * Resolves a round between two players who placed in secret. A null choice (timer
 * expired) is placed for that side at random.
 */
export function playTriplePvpRound(params: {
  state: TripleState;
  choices: Record<Side, string[] | null>;
  families: AbilityFamilies;
  rng: Rng;
}): { state: TripleState; round: TripleRoundRecord; finished: boolean; result: MatchResult | null } {
  const { state, choices, families, rng } = params;
  const pick = (side: Side): TriplePlacement => {
    const choice = choices[side];
    if (choice === null) return autoTriplePlacement(state, side, rng);
    if (!isValidTriplePlacement(state, side, choice)) throw new Error("invalid_placement");
    return { characterIds: [...choice], autoPlayed: false };
  };
  const resolved = resolveTripleRound(state, { a: pick("a"), b: pick("b") }, families);
  return { ...resolved, finished: isTripleFinished(resolved.state), result: tripleResult(resolved.state) };
}
