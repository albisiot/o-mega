import { keepSeen, lastSeen } from "@/lib/last-seen";
import { getSupabase } from "@/lib/supabase/client";

export const COIN_REASON_LABELS: Record<string, string> = {
  pack_purchase: "Acquisto pacchetto",
  match_reward: "Ricompensa partita",
  bot_match_reward: "Ricompensa partita contro bot",
  duplicate_conversion: "Conversione doppioni",
  conquest_bonus: "Bonus conquista",
  level_reward: "Premio di livello",
  admin_adjustment: "Rettifica",
};

/** Ledger rows of the same operation (same reason, same transaction) merged. */
export type CoinMovement = {
  key: string;
  reason: string;
  amount: number;
  /** Number of ledger rows merged, e.g. cards converted at once. */
  count: number;
  created_at: string;
};

type LedgerRow = { id: number; amount: number; reason: string; created_at: string };

export const seenCoinHistory = () => lastSeen<CoinMovement[]>("coinHistory");

export async function fetchCoinHistory(limit = 200): Promise<CoinMovement[]> {
  const { data, error } = await getSupabase()
    .from("coin_ledger")
    .select("id, amount, reason, created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return keepSeen("coinHistory", groupCoinMovements(data));
}

/** Merges consecutive rows of one operation: they share reason and created_at (the transaction's now()). */
export function groupCoinMovements(rows: LedgerRow[]): CoinMovement[] {
  const movements: CoinMovement[] = [];
  for (const row of rows) {
    const last = movements.at(-1);
    if (last && last.reason === row.reason && last.created_at === row.created_at) {
      last.amount += row.amount;
      last.count += 1;
    } else {
      movements.push({ key: String(row.id), reason: row.reason, amount: row.amount, count: 1, created_at: row.created_at });
    }
  }
  return movements;
}
