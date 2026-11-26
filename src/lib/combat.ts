// Scontro a squadre (SPEC §5.19, docs/COMBAT.md). The numbers come from balance.ts `combat` (the
// server reads the same from game_config). From stage 4 the battles against the computer are
// decided by the "match" Edge Function: the client sends the cards, the tactics and each choice,
// and shows the steps it gets back; the battle's seed never leaves the server.
import type {
  AbilityFamilies,
  CombatAction,
  CombatContext,
  CombatEvent,
  CombatField,
  CombatFighter,
  CombatKit,
  CombatRules,
  CombatState,
  CombatStep,
  CombatTactics,
} from "@o-mega/game-engine";
import { balance } from "@/config/balance";
import { withBasePath } from "@/lib/base-path";
import { invokeFunction } from "@/lib/match";
import type { RankedLeague } from "@/lib/ranked";
import { getSupabase } from "@/lib/supabase/client";

/** The numbers of the mode as the engine reads them. */
export function combatRules(): CombatRules {
  return balance.combat;
}

/** The families of the 12 abilities (ability_definitions): their codes never change. */
export const COMBAT_FAMILIES: AbilityFamilies = {
  FOR: "body",
  VEL: "body",
  RES: "body",
  INT: "mind",
  VOL: "mind",
  PER: "mind",
  ENE: "power",
  MAG: "power",
  PSI: "power",
  COM: "craft",
  TEC: "craft",
  FUR: "craft",
};

export function combatContext(): CombatContext {
  return { rules: combatRules(), families: COMBAT_FAMILIES };
}

/** What a finished battle paid: nothing past the day's paid battles; a challenge's Gloria too. */
export type CombatRewards = { xp: number; coins: number; points?: number };

/** A challenge's opponent (stage 6a): another player's defence, or a team of the computer. */
export type CombatOpponent = { kind: "player" | "computer"; name: string; points: number };

/** A battle as the client knows it: the steps it was sent (from `from`), whether it is over, the prizes. */
export type CombatUpdate = {
  battleId: string;
  status: string;
  auto: boolean;
  /** "computer", or "arena" for a challenge. */
  kind: string;
  opponent: CombatOpponent | null;
  field: CombatField | null;
  from: number;
  steps: CombatStep[];
  rewards: CombatRewards | null;
};

type ServerStep = { events: CombatEvent[]; state: Omit<CombatState, "fighters"> & { fighters: Omit<CombatFighter, "kit">[] } };
type ServerView = {
  battle_id: string | null;
  status?: string;
  auto?: boolean;
  kind?: string;
  opponent?: CombatOpponent | null;
  field?: CombatField | null;
  kits?: Record<string, CombatKit>;
  from?: number;
  steps?: ServerStep[];
  rewards?: CombatRewards | null;
};

/** The server's answer with each fighter's kit put back (it sends the kits once). */
function updateOf(view: ServerView): CombatUpdate {
  const kits = view.kits ?? {};
  return {
    battleId: view.battle_id!,
    status: view.status ?? "active",
    auto: view.auto ?? false,
    kind: view.kind ?? "computer",
    opponent: view.opponent ?? null,
    field: view.field ?? null,
    from: view.from ?? 0,
    steps: (view.steps ?? []).map((step) => ({
      events: step.events,
      state: { ...step.state, fighters: step.state.fighters.map((f) => ({ ...f, kit: kits[f.key] })) },
    })),
    rewards: view.rewards ?? null,
  };
}

/** A new battle against the computer: five cards in their places (F1, F2, R1, R2, R3). */
export async function startCombatBattle(cardInstanceIds: string[], auto: boolean, tactics: CombatTactics): Promise<CombatUpdate> {
  return updateOf(await invokeFunction<ServerView>({ action: "combat_start", card_instance_ids: cardInstanceIds, auto, tactics }));
}

/** The player's choice; the answer carries it and the computer's turns up to the player's next one. */
export async function actCombatBattle(battleId: string, action: CombatAction): Promise<CombatUpdate> {
  return updateOf(await invokeFunction<ServerView>({ action: "combat_act", battle_id: battleId, slot: action.slot, target: action.target }));
}

/** The rest of the battle played automatically with the player's tactics. */
export async function finishCombatBattle(battleId: string): Promise<CombatUpdate> {
  return updateOf(await invokeFunction<ServerView>({ action: "combat_finish", battle_id: battleId }));
}

/** Stage 6a: a challenge against one of today's opponents (by its place in the list), five cards in their places. */
export async function startArenaBattle(offer: number, cardInstanceIds: string[], auto: boolean, tactics: CombatTactics): Promise<CombatUpdate> {
  return updateOf(await invokeFunction<ServerView>({ action: "arena_start", offer, card_instance_ids: cardInstanceIds, auto, tactics }));
}

/** Stage 6a: the player's defence, five unlocked cards in their places with the computer's orders for them. */
export async function saveCombatDefense(cardInstanceIds: string[], tactics: CombatTactics): Promise<void> {
  await invokeFunction<unknown>({ action: "combat_defense_save", card_instance_ids: cardInstanceIds, tactics });
}

/** A defence of the player that someone challenged: who, how it ended for the defence, the Gloria. */
export type CombatArenaDefense = { attacker: string; held: boolean; draw: boolean; points: number; finished_at: string; new: boolean };

/** An opponent offered: a player's defence or a team of the computer, its Gloria and its characters. */
export type CombatArenaOffer = CombatOpponent & { definition_ids: string[] };

/** Stage 6b: the season in course (a calendar month, as the Mandato), the player's league and place in it. */
export type CombatArenaSeason = {
  season: string;
  label: string;
  ends_at: string;
  league: RankedLeague;
  next_league_at: number | null;
  /** Challenges in this season, against the minimum for its prize. */
  challenges: number;
  min_challenges: number;
  place: number | null;
};

/** The prize of a past season still to claim. */
export type CombatArenaPrize = { season: string; label: string; place: number; league: RankedLeague; points: number; coins: number; packs: number };

/** Stage 6a (get_combat_arena): the player's Gloria, defence, today's opponents, renewals, paid challenges, defences; 6b: the season and the prizes. */
export type CombatArena = {
  points: number;
  season: CombatArenaSeason;
  prizes: CombatArenaPrize[];
  defense: { card_instance_ids: string[]; definition_ids: string[]; tactics: CombatTactics; ok: boolean } | null;
  offers: CombatArenaOffer[];
  refreshes_left: number;
  paid_today: number;
  paid_daily: number;
  defenses: CombatArenaDefense[];
};

async function arenaRpc<T>(name: string): Promise<T> {
  const { data, error } = await getSupabase().rpc(name as never);
  if (error) throw error;
  return data as unknown as T;
}

export const fetchCombatArena = () => arenaRpc<CombatArena>("get_combat_arena");
/** A new list of opponents, while the day's renewals last. */
export const refreshCombatArena = () => arenaRpc<CombatArena>("combat_arena_refresh");
/** The defences shown: no longer new. */
export const markCombatDefensesSeen = () => arenaRpc<void>("combat_arena_seen");
/** For Gioca's tile: the defences since the player last read them. */
export const fetchCombatArenaNews = () => arenaRpc<number>("combat_arena_news");

/** A row of a season's board (stage 6b). */
export type CombatArenaBoardEntry = {
  place: number;
  username: string;
  avatar_url: string | null;
  title: string | null;
  points: number;
  league: RankedLeague;
  challenges: number;
  wins: number;
  is_me: boolean;
};

/** The board of a season: the first ten, the player's own row, how many played, the seasons closed. */
export type CombatArenaBoard = {
  season: string;
  label: string;
  ends_at: string;
  current: boolean;
  players: number;
  top: CombatArenaBoardEntry[];
  me: CombatArenaBoardEntry | null;
  seasons: { season: string; label: string }[];
};

export async function fetchCombatArenaBoard(season: string | null = null): Promise<CombatArenaBoard> {
  const { data, error } = await getSupabase().rpc("get_combat_arena_board" as never, { p_season: season } as never);
  if (error) throw error;
  return data as unknown as CombatArenaBoard;
}

/** A past season's prize: coins on the ledger, packs opened at once (their openings to show). */
export async function claimCombatArenaPrize(season: string): Promise<{ coins: number; opening_ids: string[]; coin_balance: number }> {
  const { data, error } = await getSupabase().rpc("claim_combat_arena_prize" as never, { p_season: season } as never);
  if (error) throw error;
  return data as unknown as { coins: number; opening_ids: string[]; coin_balance: number };
}

/** The battle under way, from its start; null when there is none. */
export async function fetchCombatBattle(): Promise<CombatUpdate | null> {
  const view = await invokeFunction<ServerView>({ action: "combat_state" });
  return view.battle_id ? updateOf(view) : null;
}

// The generated database types may not list the new tables and functions yet: the calls are the same.
type LooseClient = { from: (table: string) => { select: (columns: string) => PromiseLike<{ data: unknown; error: { message: string } | null }> } };

export async function abandonCombatBattle(battleId: string): Promise<boolean> {
  const { data, error } = await getSupabase().rpc("combat_abandon" as never, { p_battle: battleId } as never);
  if (error) throw error;
  return Boolean(data);
}

/** The characters that have a kit (readable by every player): their kits, and their codes for the drawings. */
export type CombatCatalog = { kits: Map<string, CombatKit>; codes: Map<string, string> };

export async function fetchCombatCatalog(): Promise<CombatCatalog> {
  const { data, error } = await (getSupabase() as unknown as LooseClient).from("combat_kits").select("definition_id, kit, card_definitions(code)");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { definition_id: string; kit: CombatKit; card_definitions: { code: string } | null }[];
  return {
    kits: new Map(rows.map((row) => [row.definition_id, row.kit])),
    codes: new Map(rows.filter((row) => row.card_definitions).map((row) => [row.definition_id, row.card_definitions!.code])),
  };
}

/** One owned copy of each character that has a kit: what the player can field. */
export type CombatCard = { instanceId: string; definitionId: string; code: string; name: string; rarity: string; faction: string; stats: Record<string, number>; kit: CombatKit };

export async function fetchCombatCards(kits: Map<string, CombatKit>): Promise<CombatCard[]> {
  if (kits.size === 0) return [];
  // The player's own copies (row security), all of them: since every character has a kit, a list
  // of 351 ids in the query string is longer than the copies themselves.
  const { data, error } = await getSupabase()
    .from("card_instances")
    .select("id, definition_id, card_definitions(code, name, rarity_code, faction, stats)")
    .order("acquired_at");
  if (error) throw error;
  const cards = new Map<string, CombatCard>();
  for (const row of (data ?? []) as unknown as { id: string; definition_id: string; card_definitions: { code: string; name: string; rarity_code: string; faction: string; stats: Record<string, number> } }[]) {
    if (cards.has(row.definition_id) || !kits.has(row.definition_id)) continue;
    const d = row.card_definitions;
    cards.set(row.definition_id, { instanceId: row.id, definitionId: row.definition_id, code: d.code, name: d.name, rarity: d.rarity_code, faction: d.faction, stats: d.stats, kit: kits.get(row.definition_id)! });
  }
  return [...cards.values()].sort((x, y) => x.code.localeCompare(y.code));
}

/**
 * The unlock of the kits (SPEC §5.19, get_combat_unlocks): with mode "progress" a character fights
 * after `count` matches with it in the player's team, won or finished as `basis` says, counted from
 * `since`; with "always" every kit is open. `ready` of the player's characters with a kit are
 * unlocked, and fighting takes `needed`.
 */
export type CombatUnlocks = {
  mode: "progress" | "always";
  basis: "wins" | "played";
  count: number;
  since: string | null;
  needed: number;
  /** The matches that count, by character (definition id); a missing one has none. */
  progress: Record<string, number>;
  ready: number;
};

export async function fetchCombatUnlocks(): Promise<CombatUnlocks> {
  const { data, error } = await getSupabase().rpc("get_combat_unlocks" as never);
  if (error) throw error;
  return data as unknown as CombatUnlocks;
}

let unlocksSeen: { at: number; pending: Promise<CombatUnlocks> } | null = null;

/** The same, asked at most once a minute: the card pages ask it for each character browsed. */
export function fetchCombatUnlocksOften(): Promise<CombatUnlocks> {
  if (!unlocksSeen || Date.now() - unlocksSeen.at > 60_000) {
    const pending = fetchCombatUnlocks();
    unlocksSeen = { at: Date.now(), pending };
    pending.catch(() => {
      if (unlocksSeen?.pending === pending) unlocksSeen = null;
    });
  }
  return unlocksSeen.pending;
}

/** One character's kit (every player reads the kits); null when it has none. */
export async function fetchCombatKit(definitionId: string): Promise<CombatKit | null> {
  const { data, error } = await getSupabase()
    .from("combat_kits" as never)
    .select("kit")
    .eq("definition_id", definitionId)
    .maybeSingle();
  if (error) throw error;
  return ((data as { kit: CombatKit } | null)?.kit ?? null) as CombatKit | null;
}

export function combatUnlocked(unlocks: CombatUnlocks, definitionId: string): boolean {
  return unlocks.mode === "always" || (unlocks.progress[definitionId] ?? 0) >= unlocks.count;
}

/** The player can fight: enough characters unlocked. */
export function combatReady(unlocks: CombatUnlocks): boolean {
  return unlocks.ready >= unlocks.needed;
}

/** How a kit is unlocked, in one sentence for the players. */
export function combatUnlockRule(unlocks: Pick<CombatUnlocks, "basis" | "count">): string {
  const what = unlocks.basis === "played" ? `${unlocks.count} partite giocate` : `${unlocks.count} vittorie`;
  return `Un personaggio sblocca il suo kit dopo ${what} con lui in squadra, in qualunque modalità a partita: Classica, Grande Minaccia, Allarme Triplo, Quadrante, Storia e sfide.`;
}

/** EDITOR → Scontro: the four values of the unlock (admins only, checked by the server). */
export async function saveCombatUnlock(settings: Pick<CombatUnlocks, "mode" | "basis" | "count" | "since">): Promise<void> {
  const { error } = await getSupabase().rpc(
    "admin_save_combat_unlock" as never,
    { p_mode: settings.mode, p_basis: settings.basis, p_count: settings.count, p_since: settings.since } as never,
  );
  if (error) throw error;
}

/** The drawing of a character by code (the thumbnails are enough for the tiles). */
export function combatArtUrl(code: string): string {
  return withBasePath(`/cards/thumb/${code}.webp`);
}
