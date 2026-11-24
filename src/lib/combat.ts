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

/** What a finished battle paid: nothing past the day's paid battles. */
export type CombatRewards = { xp: number; coins: number };

/** A battle as the client knows it: the steps it was sent (from `from`), whether it is over, the prizes. */
export type CombatUpdate = { battleId: string; status: string; auto: boolean; field: CombatField | null; from: number; steps: CombatStep[]; rewards: CombatRewards | null };

type ServerStep = { events: CombatEvent[]; state: Omit<CombatState, "fighters"> & { fighters: Omit<CombatFighter, "kit">[] } };
type ServerView = {
  battle_id: string | null;
  status?: string;
  auto?: boolean;
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
  const { data, error } = await getSupabase()
    .from("card_instances")
    .select("id, definition_id, card_definitions(code, name, rarity_code, faction, stats)")
    .in("definition_id", [...kits.keys()])
    .order("acquired_at");
  if (error) throw error;
  const cards = new Map<string, CombatCard>();
  for (const row of (data ?? []) as unknown as { id: string; definition_id: string; card_definitions: { code: string; name: string; rarity_code: string; faction: string; stats: Record<string, number> } }[]) {
    if (cards.has(row.definition_id)) continue;
    const d = row.card_definitions;
    cards.set(row.definition_id, { instanceId: row.id, definitionId: row.definition_id, code: d.code, name: d.name, rarity: d.rarity_code, faction: d.faction, stats: d.stats, kit: kits.get(row.definition_id)! });
  }
  return [...cards.values()].sort((x, y) => x.code.localeCompare(y.code));
}

/** The drawing of a character by code (the thumbnails are enough for the tiles). */
export function combatArtUrl(code: string): string {
  return withBasePath(`/cards/thumb/${code}.webp`);
}
