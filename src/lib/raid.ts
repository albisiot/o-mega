// Caccia grossa (SPEC §5.18): the cooperative hunt against a Boss, live, for 2 to 4 players.
// Rooms, squads and cards are database functions; the Edge Function resolves the rounds
// (action raid_resolve). The previews on screen run the same engine, never used by the server.
import {
  raidRoundOutcome,
  type AbilityFamilies,
  type RaidMove,
  type RaidPlacement,
  type RaidRoundRecord,
  type RaidRules,
  type RaidState,
  type ScoreParts,
  type Threat,
  type ThreatModifier,
} from "@o-mega/game-engine";
import { balance } from "@/config/balance";
import { forget, keepSeen, lastSeen } from "@/lib/last-seen";
import { invokeFunction, toCharacter, type MatchCard } from "@/lib/match";
import { getSupabase } from "@/lib/supabase/client";
import { describeThreatModifier } from "@/lib/threat-modifiers";

export type { RaidMove };

/** The Boss's moves as the players read them (SPEC §5.18). `hostile`: an Annullatore cancels it. */
export const RAID_MOVES: Record<RaidMove, { name: string; text: string; hostile: boolean }> = {
  plain: { name: "Attacco semplice", text: "Nessun effetto in più.", hostile: false },
  heavy: { name: "Colpo pesante", text: "Se non arrivate all'Attacco perdete 2 Difese.", hostile: true },
  armor: { name: "Corazza", text: "Il danno di questo round è dimezzato.", hostile: true },
  exposed: { name: "Punto scoperto", text: "Il danno di questo round conta doppio.", hostile: false },
  regen: { name: "Rigenerazione", text: "Se in questo round non lo ferite, il Boss recupera Vita.", hostile: true },
  target: { name: "Bersaglio", text: "La carta più alta della squadra conta la metà.", hostile: true },
  // The modifiers of §5.4 as moves (second stage): they help some cards and hinder others.
  focus: { name: "Colpo mirato", text: "La prima abilità richiesta conta doppio.", hostile: false },
  weak_link: { name: "Anello debole", text: "Il valore più basso tra le abilità richieste conta doppio.", hostile: false },
  hostile_ground: { name: "Territorio ostile", text: "Una fazione ha un bonus, un'altra un malus.", hostile: false },
  underdogs: { name: "Sottovalutati", text: "Le carte Delta hanno un bonus, Alfa e Omega un malus.", hostile: false },
};

/** A modifier move: it changes how the cards score on the threat. */
export const MODIFIER_MOVES: readonly RaidMove[] = ["focus", "weak_link", "hostile_ground", "underdogs"];

/** A move as the player reads it on its round: with the factions of Territorio ostile, the first ability of Colpo mirato. */
export function describeRaidMove(move: RaidMove, modifier: ThreatModifier | null | undefined, firstAbility?: string): { name: string; text: string } {
  if (modifier) return describeThreatModifier(modifier, firstAbility ?? "La prima abilità richiesta");
  return { name: RAID_MOVES[move].name, text: RAID_MOVES[move].text };
}

/** The three stars of a Boss (SPEC §5.18): any win earns them, each paid once. */
export const RAID_STARS = ["flawless", "quick", "squad"] as const;
export type RaidStar = (typeof RAID_STARS)[number];

/** What the stars of a Boss ask and pay. */
export type RaidStarRules = { star_rarities: string[]; quick_round: number; star_coins: number };

const RARITY_NAMES: Record<string, string> = { delta: "Delta", gamma: "Gamma", beta: "Beta", alfa: "Alfa", omega: "Omega" };

/** «Delta o Gamma». */
function rarityList(codes: readonly string[]): string {
  const names = codes.map((code) => RARITY_NAMES[code] ?? code);
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} o ${names.at(-1)}`;
}

/** What a star asks, as a line. */
export function raidStarCondition(star: RaidStar, rules: RaidStarRules): string {
  switch (star) {
    case "flawless":
      return "Senza graffi: vinci senza perdere Difese";
    case "quick":
      return `Colpo rapido: abbattilo entro il round ${rules.quick_round}`;
    case "squad":
      return `Squadra: vinci con una squadra solo ${rarityList(rules.star_rarities)}`;
  }
}

/** The Magnitudes (provisional names, from the seismograph): 1 the weakest. */
export const MAGNITUDE_NAMES: Record<number, string> = { 1: "Scossa", 2: "Allarme", 3: "Pericolo", 4: "Disastro", 5: "Catastrofe" };

/** The districts of the map (threat_definitions.district), as the players read them. */
export const DISTRICT_NAMES: Record<string, string> = {
  necropoli: "Necropoli",
  alti: "Quartieri alti",
  vulcano: "Vulcano",
  centro: "Centro dei templi",
  stazione: "Stazione e metrò",
  popolari: "Quartieri popolari",
  lungomare: "Lungomare",
  porto: "Porto",
  cantiere: "Cantiere dell'Ora Zero",
};

export type RaidBoss = {
  code: string;
  name: string;
  flavor: string;
  scene: string;
  district: string;
  magnitude: number;
  /** The repertoire: the moves it may make besides an Attacco semplice. */
  moves: RaidMove[];
  /** What a first win pays, and the XP of any win (both grow with the Magnitude). */
  first_win_coins: number;
  win_xp: number;
  beaten: boolean;
  /** The stars the player has, and what they ask (second stage). */
  stars: RaidStar[];
} & RaidStarRules;

export type RaidCatalog = {
  min_players: number;
  max_players: number;
  /** The room the player is in, waiting or playing. */
  room: { id: string; code: string; status: "lobby" | "active"; boss: string; name: string } | null;
  bosses: RaidBoss[];
};

export type RaidCard = MatchCard & { instance_id: string };

export type RaidSignal = "hold" | "push" | "help" | "ready";

export const RAID_SIGNALS: { code: RaidSignal; label: string }[] = [
  { code: "hold", label: "Tengo i forti" },
  { code: "push", label: "Spingo io" },
  { code: "help", label: "Aiutami" },
  { code: "ready", label: "Pronto!" },
];

export const RAID_SIGNAL_LABELS = Object.fromEntries(RAID_SIGNALS.map((s) => [s.code, s.label])) as Record<RaidSignal, string>;

export type RaidMember = {
  /** null for a server ally: a member without an account, always declared. */
  user_id: string | null;
  bot?: boolean;
  seat: number;
  username: string;
  avatar_url: string | null;
  level: number | null;
  ready: boolean;
  left: boolean;
  last_seen_at: string;
  signal: RaidSignal | null;
  signal_at: string | null;
  squad: RaidCard[] | null;
  /** Instance ids of the cards already played. */
  used: string[];
  /** The card the member is putting down in the round being played. */
  placement: string | null;
  /** What the end paid. */
  xp: number | null;
  coins: number | null;
  /** The stars this hunt met for the member, and the coins of the new ones. */
  stars?: RaidStar[] | null;
  star_coins?: number | null;
};

export type RaidThreat = { name: string; level: number; abilities: string[]; flavor?: string; district?: string | null };

export type RaidRoundResult = {
  total: number;
  effective_attack: number;
  required: number;
  held: boolean;
  cancelled: boolean;
  damage: number;
  defenses_lost: number;
  healed: number;
  vita: number;
  defenses: number;
};

export type RaidPlayView = {
  user_id: string | null;
  seat: number;
  instance_id: string;
  definition_id: string;
  base: number;
  bonus: number;
  score: number;
  /** What it added to the sum: half of the score under Bersaglio. */
  counted: number;
  highest: number;
  auto_played: boolean;
  parts: ScoreParts | null;
};

export type RaidRound = {
  round: number;
  level: number;
  attack: number;
  deadline_at: string | null;
  /** The move: of a round reached, of the next one, and of those a Spia or a Veggente shows; else null. */
  move: RaidMove | null;
  /** The modifier of a modifier move, whenever its move is shown. */
  modifier?: ThreatModifier | null;
  /** Only once the round is reached. */
  threat: RaidThreat | null;
  /** Before then, the threat the team's Veggente, Presagio or Oracolo shows. */
  foreseen: RaidThreat | null;
  seen_by: string | null;
  resolved: boolean;
  result: RaidRoundResult | null;
  plays: RaidPlayView[] | null;
};

export type RaidView = {
  id: string;
  code: string;
  status: "lobby" | "active" | "won" | "lost" | "closed";
  /** At the start, the members (allies included); before, at least the players needed. */
  players: number;
  max_players: number;
  current_round: number;
  magnitude: number;
  forza_percent: number;
  vita_percent: number;
  /** null before the start. */
  vita: number | null;
  vita_max: number;
  defenses: number;
  defenses_max: number;
  server_now: string;
  me: string;
  host: string;
  all_ready: boolean;
  boss: Pick<RaidBoss, "code" | "name" | "flavor" | "scene" | "district" | "moves" | "first_win_coins" | "win_xp" | "beaten" | "stars"> &
    RaidStarRules;
  members: RaidMember[];
  rounds: RaidRound[];
};

/** Where a hunt's room opens: its id in the query string (no dynamic routes in the static export). */
export function raidRoomHref(id: string): string {
  return `/caccia/stanza/?id=${id}`;
}

type RaidFunction =
  | "get_raid"
  | "raid_state"
  | "raid_create_room"
  | "raid_join_room"
  | "raid_leave_room"
  | "raid_set_squad"
  | "raid_set_ready"
  | "raid_add_ally"
  | "raid_remove_ally"
  | "raid_start"
  | "raid_place"
  | "raid_signal";

async function rpc<T>(name: RaidFunction, params?: Record<string, unknown>): Promise<T> {
  // The generated database types may not list these functions yet: the call is the same.
  const { data, error } = await getSupabase().rpc(name as never, params as never);
  if (error) throw new Error((error as { message: string }).message);
  return data as T;
}

export async function fetchRaid(): Promise<RaidCatalog> {
  return keepSeen("raid", await rpc<RaidCatalog>("get_raid"));
}

export const seenRaid = () => lastSeen<RaidCatalog>("raid");

export async function createRaidRoom(boss: string): Promise<{ id: string; code: string }> {
  forget("raid");
  return rpc("raid_create_room", { p_boss: boss });
}

export async function joinRaidRoom(code: string): Promise<{ id: string; code: string }> {
  forget("raid");
  return rpc("raid_join_room", { p_code: code });
}

export async function leaveRaidRoom(roomId: string): Promise<void> {
  forget("raid");
  await rpc("raid_leave_room", { p_room: roomId });
}

export function fetchRaidRoom(roomId: string): Promise<RaidView> {
  return rpc<RaidView>("raid_state", { p_room: roomId });
}

export async function setRaidSquad(roomId: string, cardInstanceIds: string[]): Promise<void> {
  await rpc("raid_set_squad", { p_room: roomId, p_card_instance_ids: cardInstanceIds });
}

export async function setRaidReady(roomId: string, ready: boolean): Promise<void> {
  await rpc("raid_set_ready", { p_room: roomId, p_ready: ready });
}

export async function addRaidAlly(roomId: string): Promise<void> {
  await rpc("raid_add_ally", { p_room: roomId });
}

export async function removeRaidAlly(roomId: string, seat: number): Promise<void> {
  await rpc("raid_remove_ally", { p_room: roomId, p_seat: seat });
}

export async function startRaidRoom(roomId: string): Promise<void> {
  forget("raid");
  await rpc("raid_start", { p_room: roomId });
}

/** The player's card this round (null takes it back): the allies see it at once. Pronto goes with it only when asked. */
export function placeRaidCard(roomId: string, round: number, card: string | null, ready: boolean): Promise<RaidView> {
  return rpc<RaidView>("raid_place", { p_room: roomId, p_round: round, p_card: card, p_ready: ready });
}

export async function sendRaidSignal(roomId: string, signal: RaidSignal): Promise<void> {
  await rpc("raid_signal", { p_room: roomId, p_signal: signal });
}

/** Asks the server to resolve the round: done when everyone is ready, or once the time is up. */
export function resolveRaidRound(roomId: string): Promise<{ resolved: boolean; status: string }> {
  return invokeFunction({ action: "raid_resolve", room_id: roomId });
}

// ---------------------------------------------------------------------------
// Reading the room
// ---------------------------------------------------------------------------

/** How the engine names a member: the user id, or "bot-<seat>" for a server ally. */
export function raidMemberKey(member: Pick<RaidMember, "user_id" | "seat">): string {
  return member.user_id ?? `bot-${member.seat}`;
}

export function myRaidMember(view: RaidView): RaidMember | undefined {
  return view.members.find((m) => m.user_id === view.me);
}

/** The round being played, if any. */
export function currentRaidRound(view: RaidView): RaidRound | undefined {
  return view.status === "active" ? view.rounds.find((r) => r.round === view.current_round && !r.resolved) : undefined;
}

export function lastResolvedRaidRound(view: RaidView): number {
  return Math.max(0, ...view.rounds.filter((r) => r.resolved).map((r) => r.round));
}

/** A member's cards not played yet. */
export function raidHandOf(member: RaidMember): RaidCard[] {
  const used = new Set(member.used);
  return (member.squad ?? []).filter((card) => !used.has(card.instance_id));
}

/** The numbers of the mode, from balance.ts: the same as game_config (npm run test:db checks it). */
export function raidRules(): RaidRules {
  const { raid } = balance;
  const byLevel = Object.fromEntries(Object.entries(raid.targets).map(([key, value]) => [Number(key.slice(5)), value]));
  const byPlayers = (factors: Record<string, number>) => Object.fromEntries(Object.entries(factors).map(([key, value]) => [Number(key.slice(7)), value]));
  return {
    rounds: raid.rounds,
    squadSize: raid.squadSize,
    defenses: raid.defenses,
    targets: byLevel,
    attackFactor: byPlayers(raid.attackFactor),
    vitaFactor: byPlayers(raid.vitaFactor),
    vitaBase: raid.vitaBase,
    heavyDefenses: raid.heavyDefenses,
    regenPercent: raid.regenPercent,
    exposedMax: raid.exposedMax,
    heavyMax: raid.heavyMax,
  };
}

/**
 * The hunt as the engine needs it for the previews: what the player knows (every squad, the
 * rounds played, the threat of the round). The threats not reached stand in with their level.
 */
export function knownRaidState(view: RaidView): RaidState {
  const records: RaidRoundRecord[] = view.rounds
    .filter((r) => r.resolved && r.result)
    .map((r) => ({
      round: r.round,
      plays: (r.plays ?? []).map((p) => ({
        characterId: p.instance_id,
        player: p.user_id ?? `bot-${p.seat}`,
        base: p.base,
        bonus: p.bonus,
        total: p.score,
        counted: p.counted,
        highest: p.highest,
        autoPlayed: p.auto_played,
        ...(p.parts ? { parts: p.parts } : {}),
      })),
      move: r.move ?? "plain",
      cancelled: r.result!.cancelled,
      attack: r.attack,
      effectiveAttack: r.result!.effective_attack,
      required: r.result!.required,
      total: r.result!.total,
      held: r.result!.held,
      damage: r.result!.damage,
      defensesLost: r.result!.defenses_lost,
      healed: r.result!.healed,
      vita: r.result!.vita,
      defenses: r.result!.defenses,
    }));
  return {
    rules: raidRules(),
    boss: { forzaPercent: view.forza_percent, vitaPercent: view.vita_percent },
    players: view.members.map((m) => ({
      id: raidMemberKey(m),
      squad: (m.squad ?? []).map((card) => toCharacter(card, card.instance_id)),
    })),
    threats: view.rounds.map((r): Threat => ({ id: `r${r.round}`, level: r.level, abilities: r.threat?.abilities ?? [], modifier: r.modifier ?? null })),
    moves: view.rounds.map((r) => r.move ?? "plain"),
    records,
  };
}

/**
 * The round with the cards placed so far (`placements` by member key, instance ids): what each
 * card makes, the sum, the hold and the damage. Null when it cannot be read (the server still
 * scores it). The server never uses it.
 */
export function raidPreview(view: RaidView, families: AbilityFamilies, placements: Record<string, string | null>): RaidRoundRecord | null {
  if (!currentRaidRound(view)?.threat) return null;
  try {
    const state = knownRaidState(view);
    const placed: Record<string, RaidPlacement> = {};
    for (const [key, card] of Object.entries(placements)) if (card) placed[key] = { characterId: card, autoPlayed: false };
    return raidRoundOutcome(state, placed, families);
  } catch {
    return null;
  }
}

/** What every card still in hand, of every member, would make on the round's threat, by instance id. */
export function raidCardScores(view: RaidView, families: AbilityFamilies): Map<string, number> {
  const scores = new Map<string, number>();
  if (!currentRaidRound(view)?.threat) return scores;
  for (const member of view.members) {
    for (const card of raidHandOf(member)) {
      const outcome = raidPreview(view, families, { [raidMemberKey(member)]: card.instance_id });
      const play = outcome?.plays[0];
      if (play) scores.set(card.instance_id, play.total);
    }
  }
  return scores;
}
