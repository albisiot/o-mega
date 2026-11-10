// Allarme Triplo on the client (SPEC §5.13): the state the server lets a player see,
// the calls to the "match" Edge Function, and the previews the screen shows.
// Previews come from the pure rules engine; the server alone decides.

import {
  previewTriplePlay,
  type AbilityFamilies,
  type BotDifficulty,
  type Character,
  type PlayScore,
  type ThreatModifier,
  type TriplePlay,
  type TripleRoundRecord,
  type TripleState,
} from "@o-mega/game-engine";
import { balance } from "@/config/balance";
import { invokeFunction, remember, toCharacter, type MatchCard, type MatchPlay } from "@/lib/match";

export type TripleThreat = {
  slot: number;
  name: string;
  level: number;
  abilities: string[];
  flavor: string;
  modifier: ThreatModifier | null;
};

export type TripleContest = {
  /** 0-based threat. */
  slot: number;
  /** Once resolved: who won the threat this round. */
  winner: "me" | "opponent" | "none" | null;
  my_play: (MatchPlay & { instance_id: string | null; definition_id: string }) | null;
  /** Only once the round is resolved. */
  opponent_play: (MatchCard & MatchPlay) | null;
};

export type TripleRound = {
  round: number;
  deadline_at: string;
  resolved: boolean;
  /** The cards drawn this round, in draw order. */
  hand: (MatchCard & { instance_id: string })[] | null;
  /** Between players: my secret placement, one card per threat, waiting for the opponent. */
  my_pending: string[] | null;
  /** Between players: whether the opponent has placed (never what). */
  opponent_has_chosen: boolean;
  contests: TripleContest[];
};

export type TripleView = {
  id: string;
  mode: "bot" | "friendly";
  format: "triple";
  bot_difficulty: BotDifficulty | null;
  status: "active" | "finished";
  my_side: "a" | "b";
  /** The round being played, 1-based. */
  current_round: number;
  rounds_count: number;
  threats: TripleThreat[];
  /** Threats won so far. */
  points: { me: number; opponent: number };
  total_score: { me: number; opponent: number };
  result: "win" | "loss" | "draw" | null;
  end_reason: "completed" | "forfeit" | null;
  reward_coins: number | null;
  level_rewards: { level: number; coins: number }[];
  level_unlocks?: { name: string; level: number }[];
  server_now: string;
  opponent: { username: string; avatar_url: string | null; level: number; last_seen_at: string | null } | null;
  spied_cards?: (MatchCard & { round: number })[];
  /** The whole deck, in an order that says nothing about the draw. */
  my_deck: (MatchCard & { instance_id: string; drawn_round: number | null; played: boolean })[];
  rounds: TripleRound[];
};

export function isTripleView(view: { format?: string }): view is TripleView {
  return view.format === "triple";
}

async function invokeTriple(body: Record<string, unknown>): Promise<TripleView> {
  return remember(await invokeFunction<TripleView>(body));
}

export function startTripleBotMatch(difficulty: BotDifficulty, cardInstanceIds: string[]): Promise<TripleView> {
  return invokeTriple({ action: "triple_start", difficulty, card_instance_ids: cardInstanceIds });
}

/** A round against a bot: the cards on each threat, in threat order; null when the timer expired. */
export function playTripleRound(matchId: string, round: number, placement: string[] | null): Promise<TripleView> {
  return invokeTriple({ action: "triple_play", match_id: matchId, round, card_instance_ids: placement });
}

/** Between players: a secret placement; the round resolves as soon as both placed. */
export function submitTriplePlacement(matchId: string, round: number, placement: string[]): Promise<TripleView> {
  return invokeTriple({ action: "triple_submit", match_id: matchId, round, card_instance_ids: placement });
}

/** Between players: asks the server to resolve the round once the time is up. Idempotent. */
export function resolveTripleRound(matchId: string): Promise<TripleView> {
  return invokeTriple({ action: "resolve", match_id: matchId });
}

/** How a contest ended for a side, as the engine counts it. */
function outcomeOf(winner: TripleContest["winner"], side: "me" | "opponent") {
  return winner === "none" || winner === null ? ("void" as const) : winner === side ? ("won" as const) : ("lost" as const);
}

/**
 * The engine state as the player knows it, with the player as side "a": the
 * player's deck is the hands of the open rounds then the cards still to draw; the
 * opponent's holds only the characters already played. Enough for the previews of
 * the player's own cards, never for the opponent's.
 */
export function knownTripleState(view: TripleView): TripleState {
  const threats = view.threats.map((t) => ({ id: `threat-${t.slot}`, level: t.level, abilities: t.abilities, modifier: t.modifier }));
  const size = threats.length;
  const drawn = view.rounds.flatMap((r) => r.hand ?? []);
  const drawnIds = new Set(drawn.map((c) => c.instance_id));
  const mine = [...drawn, ...view.my_deck.filter((c) => !drawnIds.has(c.instance_id))].map((card) =>
    toCharacter(card, card.instance_id),
  );
  const resolved = view.rounds.filter((r) => r.resolved && r.contests.every((c) => c.my_play && c.opponent_play));
  const placeholder = (id: string): Character => ({ id, definitionId: id, faction: "", rarityRank: 0, stats: {}, power: null });
  const theirs: Character[] = resolved.flatMap((r) =>
    r.contests.map((c) => toCharacter(c.opponent_play!, `opponent-${r.round}-${c.slot}`)),
  );
  while (theirs.length < mine.length) theirs.push(placeholder(`unknown-${theirs.length}`));

  const rounds: TripleRoundRecord[] = resolved.map((r) => {
    const playOf = (c: TripleContest, side: "me" | "opponent"): TriplePlay => {
      const p = side === "me" ? c.my_play! : c.opponent_play!;
      return {
        characterId: side === "me" ? (c.my_play!.instance_id ?? c.my_play!.definition_id) : `opponent-${r.round}-${c.slot}`,
        base: p.base,
        bonus: p.bonus,
        total: p.score,
        highest: p.highest,
        autoPlayed: p.auto_played,
        outcome: outcomeOf(c.winner, side),
      };
    };
    const contests = [...r.contests].sort((x, y) => x.slot - y.slot);
    return {
      round: r.round,
      plays: { a: contests.map((c) => playOf(c, "me")), b: contests.map((c) => playOf(c, "opponent")) },
      winners: contests.map((c) => (c.winner === "me" ? "a" : c.winner === "opponent" ? "b" : null)),
    };
  });
  return {
    rules: { rounds: view.rounds_count, threats: size, classicRounds: balance.match.threatsPerMatch },
    threats,
    decks: { a: mine, b: theirs },
    rounds,
  };
}

/** previews[instanceId][slot]: each card of the current hand on each threat, before knowing the opposing card. */
export function triplePreviews(view: TripleView, families: AbilityFamilies): Map<string, PlayScore[]> {
  const state = knownTripleState(view);
  const current = view.rounds.find((r) => r.round === view.current_round && !r.resolved);
  const previews = new Map<string, PlayScore[]>();
  for (const card of current?.hand ?? []) {
    const character = state.decks.a.find((c) => c.id === card.instance_id);
    if (!character) continue;
    previews.set(
      card.instance_id,
      view.threats.map((t) => previewTriplePlay(state, "a", character, t.slot, families)),
    );
  }
  return previews;
}

/** Points each side took in a resolved round. */
export function roundPoints(round: TripleRound): { me: number; opponent: number } {
  return {
    me: round.contests.filter((c) => c.winner === "me").length,
    opponent: round.contests.filter((c) => c.winner === "opponent").length,
  };
}
