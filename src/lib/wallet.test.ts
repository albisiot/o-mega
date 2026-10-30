import { describe, expect, it } from "vitest";
import { groupCoinMovements } from "./wallet";

describe("groupCoinMovements", () => {
  it("merges rows of the same operation and keeps separate operations apart", () => {
    const rows = [
      { id: 5, amount: 25, reason: "duplicate_conversion", created_at: "2026-10-30T10:00:00Z" },
      { id: 4, amount: 10, reason: "duplicate_conversion", created_at: "2026-10-30T10:00:00Z" },
      { id: 3, amount: 10, reason: "duplicate_conversion", created_at: "2026-10-30T10:00:00Z" },
      { id: 2, amount: -150, reason: "pack_purchase", created_at: "2026-10-30T09:00:00Z" },
      { id: 1, amount: 10, reason: "duplicate_conversion", created_at: "2026-10-29T09:00:00Z" },
    ];
    expect(groupCoinMovements(rows)).toEqual([
      { key: "5", reason: "duplicate_conversion", amount: 45, count: 3, created_at: "2026-10-30T10:00:00Z" },
      { key: "2", reason: "pack_purchase", amount: -150, count: 1, created_at: "2026-10-30T09:00:00Z" },
      { key: "1", reason: "duplicate_conversion", amount: 10, count: 1, created_at: "2026-10-29T09:00:00Z" },
    ]);
  });

  it("returns nothing for an empty ledger", () => {
    expect(groupCoinMovements([])).toEqual([]);
  });
});
