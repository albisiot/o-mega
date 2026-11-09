// Grande Minaccia on the client (SPEC §5.12): the state the server lets a player
// see, the calls to the "match" Edge Function, and the previews the screen shows.
// Previews come from the pure rules engine; the server alone decides.

import {
  bossContext,
  previewBossPlay,
  type AbilityFamilies,
  type BossState,
  type BossTurnRecord,
  type BotDifficulty,
  type Character,
  type PlayOutcome,
  type PlayScore,
  type Side,
} from "@o-mega/game-engine";
import { balance } from "@/config/balance";
import { invokeFunction, remember, toCharacter, type MatchCard, type MatchPlay } from "@/lib/match";

export type BossFront = { front: number; name: string; level: number; abilities: string[]; flavor: string };

export type BossPlay = MatchPlay & {
  /** 0-based front. */
  front: number;
  points: number;
  /** Score that held the front alone; null when both sides chose it. */
  required: number | null;
};

export type BossRound = {
  round: number;
  deadline_at: string;
  resolved: boolean;
  /** Between players: my secret choice waiting for the opponent. */
  my_pending: { instance_id: string; front: number } | null;
  /** Between players: whether the opponent has chosen (never what nor where). */
  opponent_has_chosen: boolean;
  my_play: (BossPlay & { instance_id: string | null; definition_id: string }) | null;
  /** Only once the turn is resolved. */
  opponent_play: (MatchCard & BossPlay) | null;
};

export type BossView = {
  id: string;
  mode: "bot" | "friendly";
  format: "boss";
  bot_difficulty: BotDifficulty | null;
  status: "active" | "finished";
  my_side: "a" | "b";
  current_round: number;
  turns: number;
  boss: { code: string; name: string; flavor: string; scene: string };
  fronts: BossFront[];
  /** values[turn][front], both 0-based: visible from the start. */
  values: number[][];
  /** Threat level → score that holds a front alone. */
  presidio_targets: Record<string, number>;
  points: { me: number; opponent: number };
  fronts_taken: { me: number; opponent: number };
  total_score: { me: number; opponent: number };
  result: "win" | "loss" | "draw" | null;
  end_reason: "completed" | "forfeit" | null;
  reward_coins: number | null;
  level_rewards: { level: number; coins: number }[];
  level_unlocks?: { name: string; level: number }[];
  server_now: string;
  opponent: { username: string; avatar_url: string | null; level: number; last_seen_at: string | null } | null;
  spied_cards?: (MatchCard & { round: number })[];
  my_team: (MatchCard & { instance_id: string; played_round: number | null })[];
  rounds: BossRound[];
};

export function isBossView(view: { format?: string }): view is BossView {
  return view.format === "boss";
}

async function invokeBoss(body: Record<string, unknown>): Promise<BossView> {
  return remember(await invokeFunction<BossView>(body));
}

export function startBossBotMatch(difficulty: BotDifficulty, cardInstanceIds: string[]): Promise<BossView> {
  return invokeBoss({ action: "boss_start", difficulty, card_instance_ids: cardInstanceIds });
}

/** A turn against a bot; null: the timer expired, the server plays for the player. */
export function playBossTurn(matchId: string, round: number, choice: { instanceId: string; front: number } | null): Promise<BossView> {
  return invokeBoss({
    action: "boss_play",
    match_id: matchId,
    round,
    card_instance_id: choice?.instanceId ?? null,
    front: choice?.front ?? null,
  });
}

/** Between players: a secret choice; the turn resolves as soon as both chose. */
export function submitBossChoice(matchId: string, round: number, instanceId: string, front: number): Promise<BossView> {
  return invokeBoss({ action: "submit", match_id: matchId, round, card_instance_id: instanceId, front });
}

/** Between players: asks the server to resolve the turn once the time is up. Idempotent. */
export function resolveBossTurn(matchId: string): Promise<BossView> {
  return invokeBoss({ action: "resolve", match_id: matchId });
}

/** How a resolved turn ended for each side: a contested front nobody took is void. */
export function turnOutcome(round: BossRound, side: "me" | "opponent"): PlayOutcome {
  const own = side === "me" ? round.my_play : round.opponent_play;
  const other = side === "me" ? round.opponent_play : round.my_play;
  if (!own || !other) return "void";
  if (own.points > 0) return "won";
  return own.front === other.front && other.points === 0 ? "void" : "lost";
}

/**
 * The engine state as the player knows it, with the player as side "a": the
 * opponent's team holds only the characters already played. Enough for the
 * previews of the player's own plays, never for the opponent's.
 */
export function knownBossState(view: BossView): BossState {
  const mine = view.my_team.map((card) => toCharacter(card, card.instance_id));
  const resolved = view.rounds.filter((r) => r.resolved && r.my_play && r.opponent_play);
  const theirs = resolved.map((r) => toCharacter(r.opponent_play!, `opponent-${r.round}`));
  const turns: BossTurnRecord[] = resolved.map((r) => {
    const play = (p: BossPlay, characterId: string, side: "me" | "opponent") => ({
      characterId,
      base: p.base,
      bonus: p.bonus,
      total: p.score,
      highest: p.highest,
      autoPlayed: p.auto_played,
      front: p.front,
      required: p.required,
      points: p.points,
      outcome: turnOutcome(r, side),
    });
    return {
      turn: r.round,
      plays: {
        a: play(r.my_play!, r.my_play!.instance_id ?? r.my_play!.definition_id, "me"),
        b: play(r.opponent_play!, `opponent-${r.round}`, "opponent"),
      },
    };
  });
  const b = balance.boss;
  return {
    rules: {
      turns: view.turns,
      fronts: view.fronts.length,
      hotFronts: b.hotFronts,
      hotValue: b.hotValue,
      baseValue: b.baseValue,
      growth: b.growth,
      extraFronts: b.extraFronts,
      extraGrowth: b.extraGrowth,
      targets: Object.fromEntries(Object.entries(view.presidio_targets).map(([level, target]) => [Number(level), target])),
    },
    fronts: view.fronts.map((front) => ({ id: `front-${front.front}`, level: front.level, abilities: front.abilities, modifier: null })),
    values: view.values,
    teams: { a: mine, b: theirs },
    turns,
  };
}

export type BossPreview = { score: PlayScore; required: number; held: boolean };

/** previews[instanceId][front]: each available card alone on each front this turn. */
export function bossPreviews(view: BossView, families: AbilityFamilies): Map<string, BossPreview[]> {
  const state = knownBossState(view);
  const previews = new Map<string, BossPreview[]>();
  for (const card of view.my_team.filter((c) => c.played_round === null)) {
    const character: Character = state.teams.a.find((c) => c.id === card.instance_id)!;
    previews.set(
      card.instance_id,
      view.fronts.map((front) => {
        const { score, required } = previewBossPlay(state, "a", character, front.front, families);
        return { score, required, held: score.total >= required };
      }),
    );
  }
  return previews;
}

/** The bonus the player's next character carries in (Riscossa, Slancio), as the engine counts it. */
export function carriedIntoTurn(view: BossView, families: AbilityFamilies): number {
  return bossContext(knownBossState(view), "a", families).carriedBonus;
}

/** Who took the turn's points, from the player's side: both can, on different fronts. */
export function turnWinner(round: BossRound): Side | "both" | null {
  const me = (round.my_play?.points ?? 0) > 0;
  const them = (round.opponent_play?.points ?? 0) > 0;
  return me && them ? "both" : me ? "a" : them ? "b" : null;
}
