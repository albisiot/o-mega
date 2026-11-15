import { describe, expect, it } from "vitest";
import {
  availableTitles,
  claimableCount,
  describeAchievementReward,
  tierCounts,
  type AchievementBoard,
  type CompletedAchievement,
} from "@/lib/achievements";

const done = (id: string, patch: Partial<CompletedAchievement> = {}): CompletedAchievement => ({
  id,
  tier: "bronze",
  done: true,
  name: `Impresa ${id}`,
  description: "Fatto.",
  completed_at: "2026-11-15T10:00:00Z",
  retired: false,
  coins: 50,
  packs: 0,
  cards: [],
  title: null,
  claimed: false,
  opening_ids: [],
  new: false,
  ...patch,
});

const board: AchievementBoard = {
  title: null,
  discovered: 3,
  total: 5,
  achievements: [
    done("a"),
    done("b", { tier: "gold", coins: 0, packs: 2, claimed: true, title: "Il Conquistatore" }),
    done("c", { tier: "gold", coins: 0, title: "Il Conquistatore" }),
    { id: "d", tier: "gold", done: false, hint: "Indizio" },
    { id: "e", tier: "legend", done: false, hint: null },
  ],
};

describe("tierCounts", () => {
  it("counts discovered and total imprese by tier", () => {
    const counts = tierCounts(board);
    expect(counts.bronze).toEqual({ done: 1, total: 1 });
    expect(counts.silver).toEqual({ done: 0, total: 0 });
    expect(counts.gold).toEqual({ done: 2, total: 3 });
    expect(counts.legend).toEqual({ done: 0, total: 1 });
  });
});

describe("claimableCount", () => {
  it("counts only completed imprese with a reward not yet claimed", () => {
    // "c" has no coins, packs or cards: only the medal and a title, nothing to claim.
    expect(claimableCount(board)).toBe(1);
    expect(claimableCount(null)).toBe(0);
  });
});

describe("describeAchievementReward", () => {
  it("says the reward in Italian, or that there is only the medal", () => {
    expect(describeAchievementReward(done("a"))).toBe("50 monete");
    expect(
      describeAchievementReward(
        done("a", {
          coins: 1,
          packs: 1,
          title: "Pioniere",
          cards: [{ code: "P051", name: "Ombra", rarity_code: "omega", art_url: null, variant: "Neon" }],
        }),
      ),
    ).toBe("1 moneta · 1 pacchetto · Ombra (Neon) · titolo «Pioniere»");
    expect(describeAchievementReward(done("a", { coins: 0 }))).toBe("Solo la medaglia");
  });
});

describe("availableTitles", () => {
  it("lists each title once, from completed imprese only", () => {
    expect(availableTitles(board)).toEqual([{ id: "b", title: "Il Conquistatore", weekly: false }]);
  });

  it("adds the weekly titles after the imprese, without repeating a title", () => {
    expect(
      availableTitles(board, [
        { id: "w1", title: "Campione di Quadrante" },
        { id: "w2", title: "Il Conquistatore" },
      ]),
    ).toEqual([
      { id: "b", title: "Il Conquistatore", weekly: false },
      { id: "w1", title: "Campione di Quadrante", weekly: true },
    ]);
  });
});
