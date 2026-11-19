import { balance } from "@/config/balance";

/**
 * Schegge as a prize (SPEC §4.8): bonus codes, event and challenge targets, daily objectives,
 * imprese and the places of the Emergenza leaderboards can give them. The server pays them with
 * the rest of the prize, in shard_ledger.
 */

/** The most Schegge one prize can give (the server checks the same: game_config shards.max_reward). */
export const MAX_SHARD_REWARD = balance.shards.maxReward;

/** "1 Scheggia", "3 Schegge"; "" for none. */
export function describeShards(shards: number | null | undefined): string {
  if (typeof shards !== "number" || !Number.isFinite(shards) || shards <= 0) return "";
  return shards === 1 ? "1 Scheggia" : `${shards} Schegge`;
}

/** An editor's Schegge field as typed: digits only, at most three of them ("" stays empty). */
export function shardsInput(value: string): string {
  return value.replace(/[^0-9]/g, "").slice(0, 3);
}

/** The field's value to send: 0 when empty. The server refuses more than its limit. */
export function shardsFromInput(value: string): number {
  return Number(value) || 0;
}

/** Whether a typed value is a prize the server takes: 0 to MAX_SHARD_REWARD. */
export function shardsInputValid(value: string, max: number = MAX_SHARD_REWARD): boolean {
  const shards = shardsFromInput(value);
  return Number.isInteger(shards) && shards >= 0 && shards <= max;
}
