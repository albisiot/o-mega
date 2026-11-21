// Operazioni (SPEC §5.17): the cooperative mode, live, for 2 to 4 players. Rooms, squads and
// placements are database functions; the Edge Function resolves the rounds (action coop_resolve).
import {
  cutCoopRounds,
  previewCoopPlay,
  type AbilityFamilies,
  type CoopRoundRecord,
  type CoopState,
  type PlayScore,
  type ScoreParts,
  type Threat,
} from "@o-mega/game-engine";
import { balance } from "@/config/balance";
import { invokeFunction, toCharacter, type MatchCard } from "@/lib/match";
import { forget, keepSeen, lastSeen } from "@/lib/last-seen";
import { getSupabase } from "@/lib/supabase/client";

export type CoopOperation = {
  code: string;
  ord: number;
  title: string;
  intro: string;
  /** Only once the player has won it. */
  outro: string | null;
  rival_name: string;
  boss_name: string;
  reward_coins: number;
  reward_card: MatchCard | null;
  unlocked: boolean;
  completed: boolean;
  /** The levels of the five threats written for each round; the first players + 1 are in play. */
  rounds: { round: number; levels: number[] }[];
};

export type CoopChapter = { chapter: number; title: string; intro: string; outro: string | null; operations: CoopOperation[] };

export type CoopCatalog = {
  min_players: number;
  max_players: number;
  /** The room the player is in, waiting or playing. */
  room: { id: string; code: string; status: "lobby" | "active"; operation: string; title: string } | null;
  chapters: CoopChapter[];
};

export type CoopCard = MatchCard & { instance_id: string };

export type CoopSignal = "mine" | "help" | "skip" | "ready";

export const SIGNALS: { code: CoopSignal; label: string }[] = [
  { code: "mine", label: "Ci penso io" },
  { code: "help", label: "Aiutami qui" },
  { code: "skip", label: "Lascio questa" },
  { code: "ready", label: "Pronto!" },
];

export const SIGNAL_LABELS = Object.fromEntries(SIGNALS.map((s) => [s.code, s.label])) as Record<CoopSignal, string>;

export type CoopMember = {
  user_id: string;
  seat: number;
  username: string;
  avatar_url: string | null;
  level: number;
  ready: boolean;
  left: boolean;
  last_seen_at: string;
  /** Shown for a few seconds after it was sent. */
  signal: CoopSignal | null;
  signal_at: string | null;
  squad: CoopCard[] | null;
  /** Instance ids of the cards already played. */
  used: string[];
  /** Where the member is putting the cards of the round being played (0-based slots). */
  placement: { card: string; slot: number }[] | null;
  /** What the end paid. */
  xp: number | null;
  coins: number | null;
  reward_card: MatchCard | null;
};

export type CoopThreat = {
  slot: number;
  name: string;
  level: number;
  abilities: string[];
  flavor: string;
  district: string | null;
  /** Score that stops it (breaks it, on the Boss). */
  target: number;
  /** Panic it adds if nobody stops it. */
  panic: number;
};

export type CoopResult = { slot: number; stopped: boolean; total: number; required: number | null; panic: number };

export type CoopPlay = {
  user_id: string;
  instance_id: string;
  definition_id: string;
  slot: number;
  role: "lead" | "support";
  base: number;
  bonus: number;
  score: number;
  highest: number;
  auto_played: boolean;
  parts: ScoreParts | null;
};

export type CoopRound = {
  round: number;
  boss: boolean;
  levels: number[];
  deadline_at: string | null;
  reinforced_slot: number | null;
  /** Only once the round is reached. */
  threats: CoopThreat[] | null;
  resolved: boolean;
  results: CoopResult[] | null;
  panic: number | null;
  eco: (MatchCard & { score: PlayScore & { outcome: "won" | "lost" | "void" } }) | null;
  plays: CoopPlay[] | null;
};

export type CoopView = {
  id: string;
  code: string;
  status: "lobby" | "active" | "won" | "lost" | "closed";
  players: number;
  current_round: number;
  panic: number;
  panic_limit: number;
  server_now: string;
  me: string;
  host: string;
  all_ready: boolean;
  operation: {
    code: string;
    title: string;
    intro: string;
    outro: string | null;
    rival_name: string;
    boss_name: string;
    reward_coins: number;
    reward_card: MatchCard | null;
    completed: boolean;
  };
  members: CoopMember[];
  rounds: CoopRound[];
};

/** Where a room opens: its id in the query string (no dynamic routes in the static export). */
export function coopRoomHref(id: string): string {
  return `/operazioni/stanza/?id=${id}`;
}

type CoopFunction =
  | "get_coop"
  | "coop_state"
  | "coop_create_room"
  | "coop_join_room"
  | "coop_leave_room"
  | "coop_set_squad"
  | "coop_set_ready"
  | "coop_start"
  | "coop_place"
  | "coop_signal";

async function rpc<T>(name: CoopFunction, params?: Record<string, unknown>): Promise<T> {
  // The generated database types may not list the coop functions yet: the call is the same.
  const { data, error } = await getSupabase().rpc(name as never, params as never);
  if (error) throw new Error((error as { message: string }).message);
  return data as T;
}

export async function fetchCoop(): Promise<CoopCatalog> {
  return keepSeen("coop", await rpc<CoopCatalog>("get_coop"));
}

export const seenCoop = () => lastSeen<CoopCatalog>("coop");

export async function createCoopRoom(operation: string): Promise<{ id: string; code: string }> {
  forget("coop");
  return rpc("coop_create_room", { p_operation: operation });
}

export async function joinCoopRoom(code: string): Promise<{ id: string; code: string }> {
  forget("coop");
  return rpc("coop_join_room", { p_code: code.trim().toUpperCase() });
}

export async function leaveCoopRoom(roomId: string): Promise<void> {
  forget("coop");
  await rpc("coop_leave_room", { p_room: roomId });
}

export function fetchCoopRoom(roomId: string): Promise<CoopView> {
  return rpc("coop_state", { p_room: roomId });
}

export async function setCoopSquad(roomId: string, cardInstanceIds: string[]): Promise<void> {
  await rpc("coop_set_squad", { p_room: roomId, p_card_instance_ids: cardInstanceIds });
}

export async function setCoopReady(roomId: string, ready: boolean): Promise<void> {
  await rpc("coop_set_ready", { p_room: roomId, p_ready: ready });
}

export async function startCoopRoom(roomId: string): Promise<void> {
  await rpc("coop_start", { p_room: roomId });
}

/** The cards put down this round (null: none yet), and whether the player says Pronto. */
export function placeCoopCards(roomId: string, round: number, cards: { card: string; slot: number }[] | null, ready: boolean): Promise<CoopView> {
  return rpc("coop_place", { p_room: roomId, p_round: round, p_cards: cards, p_ready: ready });
}

export async function sendCoopSignal(roomId: string, signal: CoopSignal): Promise<void> {
  await rpc("coop_signal", { p_room: roomId, p_signal: signal });
}

/** Asks the server to resolve the round: done when everyone is ready, or once the time is up. */
export function resolveCoopRound(roomId: string): Promise<{ resolved: boolean; status: string }> {
  return invokeFunction({ action: "coop_resolve", room_id: roomId });
}

// ---------------------------------------------------------------------------
// Reading the room
// ---------------------------------------------------------------------------

export function myMember(view: CoopView): CoopMember | undefined {
  return view.members.find((m) => m.user_id === view.me);
}

/** The round being played, if any. */
export function currentRound(view: CoopView): CoopRound | undefined {
  return view.status === "active" ? view.rounds.find((r) => r.round === view.current_round && !r.resolved) : undefined;
}

export function lastResolvedRound(view: CoopView): number {
  return Math.max(0, ...view.rounds.filter((r) => r.resolved).map((r) => r.round));
}

/** Cards a member puts down in a round. */
export function cardsPerRound(round: CoopRound): number {
  return round.boss ? balance.coop.bossCards : 1;
}

/** A member's cards not played yet. */
export function handOf(member: CoopMember): CoopCard[] {
  const used = new Set(member.used);
  return (member.squad ?? []).filter((card) => !used.has(card.instance_id));
}

/** Fronts broken in the Boss's round, once it is resolved. */
export function brokenFronts(view: CoopView): number {
  const boss = view.rounds.find((r) => r.boss && r.resolved);
  return boss?.results?.filter((r) => r.stopped).length ?? 0;
}

/**
 * The operation as the engine needs it for the previews: what the player knows (every squad,
 * the rounds played, the Echi seen). The threats not reached yet stand in with their level only.
 */
export function knownCoopState(view: CoopView): CoopState {
  const placeholder = (round: number, slot: number, level: number): Threat => ({ id: `r${round}s${slot}`, level, abilities: [] });
  const written = view.rounds.map((r) => {
    const threats: Threat[] = r.threats
      ? r.threats.map((t) => ({ id: `r${r.round}s${t.slot}`, level: t.level, abilities: t.abilities }))
      : r.levels.map((level, slot) => placeholder(r.round, slot, level));
    // Pad to the written five: cutCoopRounds takes the first players + 1.
    while (threats.length < view.players + 1) threats.push(placeholder(r.round, threats.length, 1));
    return { threats, reinforced: Math.min(r.reinforced_slot ?? 0, view.players) };
  });
  const ecos = view.rounds.flatMap((r) => (r.eco ? [r.eco] : []));
  const records: CoopRoundRecord[] = view.rounds
    .filter((r) => r.resolved && r.results)
    .map((r) => ({
      round: r.round,
      plays: (r.plays ?? []).map((p) => ({
        characterId: p.instance_id,
        player: p.user_id,
        slot: p.slot,
        role: p.role,
        base: p.base,
        bonus: p.bonus,
        total: p.score,
        highest: p.highest,
        autoPlayed: p.auto_played,
        ...(p.parts ? { parts: p.parts } : {}),
      })),
      threats: r.results!,
      eco: r.eco ? { ...r.eco.score, characterId: `eco:${r.eco.definition_id}` } : null,
      panic: r.panic ?? 0,
    }));
  return {
    rules: {
      cityRounds: balance.coop.cityRounds,
      squadSize: balance.coop.squadSize,
      bossCards: balance.coop.bossCards,
      targets: Object.fromEntries(Object.entries(balance.coop.targets).map(([key, value]) => [Number(key.slice(5)), value])),
      bossTargets: Object.fromEntries(Object.entries(balance.coop.bossTargets).map(([key, value]) => [Number(key.slice(5)), value])),
      panicLimit: view.panic_limit,
      panicLow: balance.coop.panicLow,
      panicHigh: balance.coop.panicHigh,
      panicHighFromLevel: balance.coop.panicHighFromLevel,
      panicReinforced: balance.coop.panicReinforced,
    },
    players: view.members.map((m) => ({
      id: m.user_id,
      squad: (m.squad ?? []).map((card) => toCharacter(card, card.instance_id)),
    })),
    rival: ecos.map((eco) => toCharacter(eco, `eco:${eco.definition_id}`)),
    rounds: cutCoopRounds(written, view.players),
    records,
  };
}

export type CoopPreview = { score: PlayScore; required: number | null };

/**
 * How every card still in hand, of every member, would score on each threat of the round,
 * with the score it needs (null on the rival's threat: there it must beat the Eco, unknown
 * until the end). Keyed by instance id. The server never uses it.
 */
export function coopPreviews(view: CoopView, families: AbilityFamilies): Map<string, CoopPreview[]> {
  const previews = new Map<string, CoopPreview[]>();
  const round = currentRound(view);
  if (!round?.threats) return previews;
  let state: CoopState;
  try {
    state = knownCoopState(view);
  } catch {
    return previews;
  }
  for (const member of view.members) {
    const player = state.players.find((p) => p.id === member.user_id);
    for (const card of handOf(member)) {
      const character = player?.squad.find((c) => c.id === card.instance_id);
      if (!character) continue;
      try {
        previews.set(
          card.instance_id,
          round.threats.map((t) => previewCoopPlay(state, member.user_id, character, t.slot, families)),
        );
      } catch {
        // A power the preview cannot read: the server still scores it.
      }
    }
  }
  return previews;
}

/**
 * What the team would make on each threat with the cards placed so far (the best preview leads,
 * the others add their highest required value), and the lowest target among the leads' (Sabotatore
 * lowers it): the screen shows it beside the threat. `placements` overrides members' placements
 * (the player's own, not sent yet).
 */
export function placedTotals(
  view: CoopView,
  previews: Map<string, CoopPreview[]>,
  placements: Map<string, { card: string; slot: number }[] | null>,
): Map<number, { total: number; cards: number; required: number | null }> {
  const totals = new Map<number, { total: number; cards: number; required: number | null }>();
  const round = currentRound(view);
  if (!round?.threats) return totals;
  for (const threat of round.threats) {
    const here: CoopPreview[] = [];
    for (const member of view.members) {
      const placed = placements.has(member.user_id) ? placements.get(member.user_id) : member.placement;
      for (const card of placed ?? []) {
        const preview = card.slot === threat.slot ? previews.get(card.card)?.[threat.slot] : undefined;
        if (preview) here.push(preview);
      }
    }
    if (here.length === 0) continue;
    const lead = here.reduce((best, p) =>
      p.score.total > best.score.total || (p.score.total === best.score.total && p.score.highest > best.score.highest) ? p : best,
    );
    const total = lead.score.total + here.filter((p) => p !== lead).reduce((sum, p) => sum + p.score.highest, 0);
    totals.set(threat.slot, { total, cards: here.length, required: lead.required });
  }
  return totals;
}
