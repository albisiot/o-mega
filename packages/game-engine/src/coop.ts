// Operazioni (SPEC §5.17): a cooperative mode for 2 to 4 players, written by hand like
// the Story. Every round more threats than players turn up on the map: each player puts
// one card on one of them, and the rival Reggente reinforces one with an Eco of its own.
// A threat nobody stops raises the city's Panic; at the limit the operation fails.
// The last round is the Boss: one front more than the players, two cards each, and
// the team must break at least one front per player. Pure: the Edge Function loads
// and stores, the database re-checks what it can.

import { shuffle, type Rng } from "./rng.ts";
import {
  abilityMalusOn,
  asPlayedAgainst,
  calmedThreat,
  carriedBonusFrom,
  compareScores,
  scorePlay,
  withTheft,
  type PlayOutcome,
  type ScoreContext,
} from "./scoring.ts";
import { requiredScore } from "./emergency.ts";
import type { AbilityFamilies, Character, PlayScore, Threat } from "./types.ts";

/** The numbers of the mode (balance.ts `coop`, game_config `coop.*`). */
export type CoopRules = {
  /** Rounds in the city before the Boss. */
  cityRounds: number;
  /** Characters each player brings: one per city round, `bossCards` for the Boss. */
  squadSize: number;
  /** Cards each player puts on the Boss's fronts in the last round. */
  bossCards: number;
  /** Threat level → score that stops a threat of the city (the Emergenza's). */
  targets: Record<number, number>;
  /** Threat level → score that breaks a front of the Boss. */
  bossTargets: Record<number, number>;
  /** Panic that fails the operation. */
  panicLimit: number;
  /** Panic of a threat nobody stopped: `panicLow` below `panicHighFromLevel`, `panicHigh` from it. */
  panicLow: number;
  panicHigh: number;
  panicHighFromLevel: number;
  /** Panic more when the threat nobody stopped was the rival's. */
  panicReinforced: number;
};

/** A seat of the operation: the player (user id) and the squad, in the order it was chosen. */
export type CoopPlayer = { id: string; squad: Character[] };

/** A round as the operation wrote it, already cut to the number of players. */
export type CoopRound = {
  /** 1-based; the last one is the Boss's. */
  round: number;
  boss: boolean;
  /** One more threat (or front) than players. */
  threats: Threat[];
  /** Slot of the threat the rival reinforces with an Eco. */
  reinforced: number;
};

/** A card of a player on a threat (0-based slot). */
export type CoopCardPlacement = { characterId: string; slot: number };

/** What a player puts down in a round: one card in the city, `bossCards` on the Boss. */
export type CoopPlacement = { cards: CoopCardPlacement[]; autoPlayed: boolean };

export type CoopPlay = PlayScore & {
  player: string;
  slot: number;
  /** The highest score on a threat leads it; the others add their highest required value. */
  role: "lead" | "support";
  autoPlayed: boolean;
};

export type CoopThreatResult = {
  slot: number;
  stopped: boolean;
  /** The lead's score plus what the supports added; 0 when nobody went there. */
  total: number;
  /** Score the lead needed (its power's discounts included); null on the rival's threat. */
  required: number | null;
  /** Panic it added: none if stopped, and never in the Boss's round. */
  panic: number;
};

export type CoopRoundRecord = {
  round: number;
  plays: CoopPlay[];
  threats: CoopThreatResult[];
  /** The rival's Eco on the reinforced threat, as it scored against the lead. */
  eco: (PlayScore & { outcome: PlayOutcome }) | null;
  panic: number;
};

/** Everything the server knows about an operation in progress. Never send it to a client as is. */
export type CoopState = {
  rules: CoopRules;
  players: CoopPlayer[];
  /** The rival's Echi: one per round, the last one for the Boss. */
  rival: Character[];
  rounds: CoopRound[];
  records: CoopRoundRecord[];
};

export type CoopResult = "won" | "lost";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

/**
 * The rounds of an operation for `players` players: of the threats written for each round
 * (the most a full table needs), the first `players + 1`. The reinforced slot must be
 * among the threats used.
 */
export function cutCoopRounds(
  written: readonly { threats: readonly Threat[]; reinforced: number }[],
  players: number,
): CoopRound[] {
  const used = players + 1;
  return written.map((round, i) => {
    if (round.threats.length < used) throw new Error(`Round ${i + 1} has ${round.threats.length} threats, ${used} needed`);
    if (round.reinforced < 0 || round.reinforced >= used) throw new Error(`Round ${i + 1}: reinforced slot out of range`);
    return { round: i + 1, boss: i === written.length - 1, threats: round.threats.slice(0, used), reinforced: round.reinforced };
  });
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export function coopRoundNumber(state: CoopState): number {
  return state.records.length + 1;
}

export function coopCurrentRound(state: CoopState): CoopRound | undefined {
  return isCoopFinished(state) ? undefined : state.rounds[state.records.length];
}

/** Cards each player puts down in a round. */
export function coopCardsPerPlayer(rules: CoopRules, round: CoopRound): number {
  return round.boss ? rules.bossCards : 1;
}

export function coopPanic(state: CoopState): number {
  return state.records.reduce((sum, record) => sum + record.panic, 0);
}

/** Fronts of the Boss the team broke; 0 before the Boss's round. */
export function coopBrokenFronts(state: CoopState): number {
  const last = state.records.at(-1);
  return last && state.rounds[last.round - 1]?.boss ? last.threats.filter((t) => t.stopped).length : 0;
}

/** The operation ends once Panic reaches the limit, or after the Boss. */
export function isCoopFinished(state: CoopState): boolean {
  return coopPanic(state) >= state.rules.panicLimit || state.records.length >= state.rounds.length;
}

/** Won: the Boss beaten (one front broken per player) without Panic at the limit. null while playing. */
export function coopResult(state: CoopState): CoopResult | null {
  if (!isCoopFinished(state)) return null;
  if (coopPanic(state) >= state.rules.panicLimit) return "lost";
  return coopBrokenFronts(state) >= state.players.length ? "won" : "lost";
}

function playerOf(state: CoopState, id: string): CoopPlayer {
  const player = state.players.find((p) => p.id === id);
  if (!player) throw new Error(`Unknown player ${id}`);
  return player;
}

function playsOf(state: CoopState, playerId: string): CoopPlay[] {
  return state.records.flatMap((record) => record.plays.filter((play) => play.player === playerId));
}

/** The cards a player has not put down yet. */
export function coopHand(state: CoopState, playerId: string): Character[] {
  const used = new Set(playsOf(state, playerId).map((play) => play.characterId));
  return playerOf(state, playerId).squad.filter((c) => !used.has(c.id));
}

/** The Echi the rival has not played yet. */
export function coopRivalHand(state: CoopState): Character[] {
  const used = new Set(state.records.map((record) => record.eco?.characterId).filter(Boolean));
  return state.rival.filter((c) => !used.has(c.id));
}

/** Whether a placement puts the right number of the player's unused cards on threats of the round. */
export function isValidCoopPlacement(state: CoopState, playerId: string, cards: readonly CoopCardPlacement[]): boolean {
  const round = coopCurrentRound(state);
  if (!round) return false;
  const hand = new Set(coopHand(state, playerId).map((c) => c.id));
  return (
    cards.length === coopCardsPerPlayer(state.rules, round) &&
    new Set(cards.map((c) => c.characterId)).size === cards.length &&
    cards.every((c) => hand.has(c.characterId) && Number.isInteger(c.slot) && c.slot >= 0 && c.slot < round.threats.length)
  );
}

// ---------------------------------------------------------------------------
// The powers
// ---------------------------------------------------------------------------

function outcomeOf(stopped: boolean): PlayOutcome {
  return stopped ? "won" : "lost";
}

/**
 * The team's standing, as the powers read it: the threats the team stopped are rounds
 * won, those it played on without stopping them rounds lost. A threat nobody went to
 * counts neither way (there are always more threats than cards).
 */
function teamStanding(state: CoopState): { roundsWon: number; opponentRoundsWon: number } {
  let won = 0;
  let lost = 0;
  for (const record of state.records) {
    for (const threat of record.threats) {
      if (!record.plays.some((play) => play.slot === threat.slot)) continue;
      if (threat.stopped) won += 1;
      else lost += 1;
    }
  }
  return { roundsWon: won, opponentRoundsWon: lost };
}

/** A player's earlier cards, as they played (Annullatore and Silenzio della tomba take the power away). */
function playedBy(state: CoopState, playerId: string): { character: Character; play: CoopPlay; round: CoopRoundRecord }[] {
  const squad = playerOf(state, playerId).squad;
  return state.records.flatMap((round) =>
    round.plays
      .filter((play) => play.player === playerId)
      .map((play) => {
        const own = squad.find((c) => c.id === play.characterId)!;
        const threat = state.rounds[round.round - 1].threats[play.slot];
        const rivalHere = play.slot === state.rounds[round.round - 1].reinforced ? rivalCharacter(state, round) : undefined;
        return { character: asPlayedAgainst(own, rivalHere, threat), play, round };
      }),
  );
}

function rivalCharacter(state: CoopState, record: CoopRoundRecord): Character | undefined {
  return record.eco ? state.rival.find((c) => c.id === record.eco!.characterId) : undefined;
}

/** Every threat level of the operation, round after round (Grande prova). */
function operationLevels(state: CoopState): number[] {
  return state.rounds.flatMap((round) => round.threats.map((threat) => threat.level));
}

/**
 * What the powers of a player's card know before the round (SPEC §5.17). The powers that
 * look at the squad (Legame, Lupo solitario, Arcobaleno) see the whole team's squads; those
 * that look at the cards played before (Riscossa, Slancio, Capobranco, Sacrificio,
 * Catalizzatore, Riverbero, Crescendo, Vendetta) see the player's own.
 */
export function coopContext(state: CoopState, playerId: string, families: AbilityFamilies): ScoreContext {
  const earlier = playedBy(state, playerId);
  const last = earlier.at(-1);
  const threatOf = (entry: (typeof earlier)[number]) => state.rounds[entry.round.round - 1].threats[entry.play.slot];
  const resultOf = (entry: (typeof earlier)[number]) => entry.round.threats.find((t) => t.slot === entry.play.slot)!;
  return {
    families,
    ...teamStanding(state),
    carriedBonus: carriedBonusFrom(
      earlier.slice(-2).map((entry) => {
        const result = resultOf(entry);
        return {
          character: entry.character,
          outcome: outcomeOf(result.stopped),
          margin: result.required === null ? entry.play.total - (entry.round.eco?.total ?? 0) : result.total - result.required,
        };
      }),
    ),
    round: coopRoundNumber(state),
    team: state.players.flatMap((p) => p.squad),
    previousLevel: last ? threatOf(last).level : undefined,
    previousOutcome: last ? outcomeOf(resultOf(last).stopped) : undefined,
    threatLevels: operationLevels(state),
    played: earlier.map((entry) => entry.character),
  };
}

/** The rival's own story: the reinforced threats it held are its rounds won. */
function rivalContext(state: CoopState, families: AbilityFamilies): ScoreContext {
  const earlier = state.records.filter((record) => record.eco);
  const asPlayed = earlier.map((record) => {
    const eco = rivalCharacter(state, record)!;
    const round = state.rounds[record.round - 1];
    const lead = record.plays.find((play) => play.slot === round.reinforced && play.role === "lead");
    const leadCharacter = lead ? playerOf(state, lead.player).squad.find((c) => c.id === lead.characterId) : undefined;
    return asPlayedAgainst(eco, leadCharacter, round.threats[round.reinforced]);
  });
  const last = earlier.at(-1);
  return {
    families,
    roundsWon: earlier.filter((record) => record.eco!.outcome === "won").length,
    opponentRoundsWon: earlier.filter((record) => record.eco!.outcome === "lost").length,
    carriedBonus: carriedBonusFrom(earlier.map((record, i) => ({ character: asPlayed[i], outcome: record.eco!.outcome })).slice(-2)),
    round: coopRoundNumber(state),
    team: state.rival,
    previousLevel: last ? state.rounds[last.round - 1].threats[state.rounds[last.round - 1].reinforced].level : undefined,
    previousOutcome: last?.eco?.outcome,
    threatLevels: operationLevels(state),
    played: asPlayed,
  };
}

function targetsOf(rules: CoopRules, round: CoopRound): Record<number, number> {
  return round.boss ? rules.bossTargets : rules.targets;
}

/** Panic a threat adds when nobody stops it: never in the Boss's round. */
export function coopThreatPanic(rules: CoopRules, round: CoopRound, slot: number): number {
  if (round.boss) return 0;
  const level = round.threats[slot].level;
  return (level >= rules.panicHighFromLevel ? rules.panicHigh : rules.panicLow) + (slot === round.reinforced ? rules.panicReinforced : 0);
}

/**
 * How a card would score on a threat of the current round, before anyone knows the rival's
 * Eco: the screen shows it beside the threat's target, the server never uses it.
 */
export function previewCoopPlay(
  state: CoopState,
  playerId: string,
  character: Character,
  slot: number,
  families: AbilityFamilies,
): { score: PlayScore; required: number | null } {
  const round = coopCurrentRound(state);
  if (!round) throw new Error("The operation is over");
  const threat = round.threats[slot];
  const context = coopContext(state, playerId, families);
  const acting = asPlayedAgainst(character, undefined, threat);
  const score = scorePlay(acting, calmedThreat(threat, acting), context);
  const required =
    slot === round.reinforced ? null : requiredScore(acting, threat, { targets: targetsOf(state.rules, round) }, context);
  return { score, required };
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

type Placed = { player: string; character: Character; autoPlayed: boolean };

/** The lead of a threat: the highest score, then the higher single value, then the earlier seat. */
function leadIndex(scores: readonly PlayScore[]): number {
  let best = 0;
  for (let i = 1; i < scores.length; i++) {
    const [a, b] = [scores[i], scores[best]];
    if (a.total > b.total || (a.total === b.total && a.highest > b.highest)) best = i;
  }
  return best;
}

/** What the supports add: the highest value each has among the required abilities. */
function supportSum(scores: readonly PlayScore[], lead: number): number {
  return scores.reduce((sum, score, i) => (i === lead ? sum : sum + score.highest), 0);
}

/**
 * Resolves the current round (pure): every threat with the cards the players put on it,
 * the rival's Eco on the reinforced one, the Panic of the threats nobody stopped.
 */
export function resolveCoopRound(
  state: CoopState,
  placements: Record<string, CoopPlacement>,
  ecoId: string | null,
  families: AbilityFamilies,
): { state: CoopState; record: CoopRoundRecord } {
  const round = coopCurrentRound(state);
  if (!round) throw new Error("The operation is already over");
  for (const player of state.players) {
    const placement = placements[player.id];
    if (!placement || !isValidCoopPlacement(state, player.id, placement.cards)) throw new Error("invalid_placement");
  }
  const rivalHand = coopRivalHand(state);
  const eco = ecoId === null ? null : (rivalHand.find((c) => c.id === ecoId) ?? null);
  if (ecoId !== null && !eco) throw new Error("invalid_eco");
  if (eco === null && rivalHand.length > 0) throw new Error("invalid_eco");

  // Seat order, then the order each player put the cards down.
  const placed: Placed[][] = round.threats.map(() => []);
  for (const player of state.players) {
    const placement = placements[player.id];
    for (const card of placement.cards) {
      placed[card.slot].push({ player: player.id, character: player.squad.find((c) => c.id === card.characterId)!, autoPlayed: placement.autoPlayed });
    }
  }

  const plays: CoopPlay[] = [];
  const results: CoopThreatResult[] = [];
  let ecoScore: CoopRoundRecord["eco"] = null;
  const contexts = new Map(state.players.map((p) => [p.id, coopContext(state, p.id, families)]));
  const targets = targetsOf(state.rules, round);

  round.threats.forEach((threat, slot) => {
    const here = placed[slot];
    const reinforced = slot === round.reinforced && eco !== null;
    if (reinforced) {
      // Against the Eco: every card scores as in a round of a match, the best one leads.
      const acting = here.map((p) => asPlayedAgainst(p.character, eco, threat));
      const scores = here.map((p, i) => {
        const against = asPlayedAgainst(eco, acting[i], threat);
        const ruled = calmedThreat(threat, acting[i], against);
        return scorePlay(acting[i], ruled, {
          ...contexts.get(p.player)!,
          abilityMalus: abilityMalusOn(acting[i], against, ruled),
          opponent: against,
        });
      });
      const lead = here.length > 0 ? leadIndex(scores) : -1;
      const leadActing = lead >= 0 ? acting[lead] : undefined;
      const ecoActing = asPlayedAgainst(eco, leadActing, threat);
      const ruled = calmedThreat(threat, leadActing, ecoActing);
      let rivalScore = scorePlay(ecoActing, ruled, {
        ...rivalContext(state, families),
        abilityMalus: leadActing ? abilityMalusOn(ecoActing, leadActing, ruled) : 0,
        opponent: leadActing,
      });
      if (lead >= 0) {
        // Ladro and its kin take from the lead, or give to it.
        const stolen = withTheft({ a: scores[lead], b: rivalScore }, { a: leadActing, b: ecoActing });
        scores[lead] = stolen.a;
        rivalScore = stolen.b;
      }
      const total = lead >= 0 ? scores[lead].total + supportSum(scores, lead) : 0;
      const stopped = lead >= 0 && compareScores({ ...scores[lead], total }, rivalScore, ruled) === "a";
      ecoScore = { ...rivalScore, outcome: lead < 0 ? "won" : stopped ? "lost" : "won" };
      here.forEach((p, i) => plays.push({ ...scores[i], player: p.player, slot, role: i === lead ? "lead" : "support", autoPlayed: p.autoPlayed }));
      results.push({ slot, stopped, total, required: null, panic: stopped ? 0 : coopThreatPanic(state.rules, round, slot) });
      return;
    }

    // A threat on its own: the lead's score plus the supports' must reach its target.
    const acting = here.map((p) => asPlayedAgainst(p.character, undefined, threat));
    const scores = here.map((p, i) => scorePlay(acting[i], calmedThreat(threat, acting[i]), contexts.get(p.player)!));
    const lead = here.length > 0 ? leadIndex(scores) : -1;
    const required = lead >= 0 ? requiredScore(acting[lead], threat, { targets }, contexts.get(here[lead].player)!) : (targets[threat.level] ?? 0);
    const total = lead >= 0 ? scores[lead].total + supportSum(scores, lead) : 0;
    const stopped = lead >= 0 && total >= required;
    here.forEach((p, i) => plays.push({ ...scores[i], player: p.player, slot, role: i === lead ? "lead" : "support", autoPlayed: p.autoPlayed }));
    results.push({ slot, stopped, total, required, panic: stopped ? 0 : coopThreatPanic(state.rules, round, slot) });
  });

  // The rival's threat when it has no Eco left (never, with a full squad): an ordinary threat.
  const record: CoopRoundRecord = {
    round: round.round,
    plays,
    threats: results,
    eco: ecoScore,
    panic: results.reduce((sum, r) => sum + r.panic, 0),
  };
  return { state: { ...state, records: [...state.records, record] }, record };
}

// ---------------------------------------------------------------------------
// The rival, and the cards the server puts down for a player
// ---------------------------------------------------------------------------

/**
 * The Eco the rival plays this round: the one that scores most on the reinforced threat,
 * keeping for the Boss the one that scores most on the Boss's reinforced front. Ties at
 * random. null when the rival has nothing left.
 */
export function chooseRivalEco(state: CoopState, families: AbilityFamilies, rng: Rng): string | null {
  const round = coopCurrentRound(state);
  const hand = coopRivalHand(state);
  if (!round || hand.length === 0) return null;
  const context = rivalContext(state, families);
  const scoreOn = (c: Character, threat: Threat) => scorePlay(c, threat, context).total;
  let pool = hand;
  const boss = state.rounds.find((r) => r.boss);
  if (!round.boss && boss && hand.length > 1) {
    const front = boss.threats[boss.reinforced];
    const kept = shuffle(rng, hand).reduce((best, c) => (scoreOn(c, front) > scoreOn(best, front) ? c : best));
    pool = hand.filter((c) => c.id !== kept.id);
  }
  const threat = round.threats[round.reinforced];
  const best = Math.max(...pool.map((c) => scoreOn(c, threat)));
  const top = pool.filter((c) => scoreOn(c, threat) === best);
  return top[Math.floor(rng() * top.length)].id;
}

/**
 * The cards the server puts down for a player whose time ran out (or who left): where
 * they help most, given what the others have already placed. On each pick: a threat
 * nobody covers that the card stops, by the panic it saves; otherwise the card that
 * comes closest. Never wastes two cards on one threat while another is uncovered.
 */
export function autoCoopPlacement(
  state: CoopState,
  playerId: string,
  others: readonly CoopCardPlacement[],
  families: AbilityFamilies,
  rng: Rng,
): CoopPlacement {
  const round = coopCurrentRound(state);
  if (!round) throw new Error("The operation is over");
  const hand = shuffle(rng, coopHand(state, playerId));
  const taken = new Set(others.map((c) => c.slot));
  const cards: CoopCardPlacement[] = [];
  const count = Math.min(coopCardsPerPlayer(state.rules, round), hand.length);
  for (let n = 0; n < count; n++) {
    let best: { characterId: string; slot: number; value: number } | null = null;
    for (const character of hand) {
      if (cards.some((c) => c.characterId === character.id)) continue;
      for (let slot = 0; slot < round.threats.length; slot++) {
        const covered = taken.has(slot);
        if (covered && taken.size < round.threats.length) continue;
        const { score, required } = previewCoopPlay(state, playerId, character, slot, families);
        const need = required ?? targetsOf(state.rules, round)[round.threats[slot].level] ?? 0;
        const margin = score.total - need;
        const saved = round.boss ? 1 : coopThreatPanic(state.rules, round, slot);
        // Stopping counts first, by what it saves; then the smallest overshoot (keep the strong
        // cards); a card that cannot stop anything goes where it falls shortest.
        const value = margin >= 0 ? 1000 * saved - margin : -1000 - Math.abs(margin);
        if (!best || value > best.value) best = { characterId: character.id, slot, value };
      }
    }
    if (!best) break;
    cards.push({ characterId: best.characterId, slot: best.slot });
    taken.add(best.slot);
  }
  return { cards, autoPlayed: true };
}

/**
 * Resolves a round between players: each choice as sent, a missing one put down by the
 * server (in seat order, knowing the ones before), the rival's Eco chosen now.
 */
export function playCoopRound(params: {
  state: CoopState;
  choices: Record<string, CoopCardPlacement[] | null>;
  families: AbilityFamilies;
  rng: Rng;
}): { state: CoopState; record: CoopRoundRecord; finished: boolean; result: CoopResult | null } {
  const { state, choices, families, rng } = params;
  const placements: Record<string, CoopPlacement> = {};
  const known: CoopCardPlacement[] = [];
  for (const player of state.players) {
    const choice = choices[player.id] ?? null;
    if (choice !== null) {
      if (!isValidCoopPlacement(state, player.id, choice)) throw new Error("invalid_placement");
      placements[player.id] = { cards: [...choice], autoPlayed: false };
      known.push(...choice);
    }
  }
  for (const player of state.players) {
    if (placements[player.id]) continue;
    placements[player.id] = autoCoopPlacement(state, player.id, known, families, rng);
    known.push(...placements[player.id].cards);
  }
  const eco = chooseRivalEco(state, families, rng);
  const resolved = resolveCoopRound(state, placements, eco, families);
  return { ...resolved, finished: isCoopFinished(resolved.state), result: coopResult(resolved.state) };
}
