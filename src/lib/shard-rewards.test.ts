import { describe, expect, it } from "vitest";
import { balance } from "@/config/balance";
import { describeAdminReward as describeAdminAchievementReward } from "@/lib/achievement-admin";
import { describeAchievementReward, hasReward, type CompletedAchievement } from "@/lib/achievements";
import { describeChallengeTierReward } from "@/lib/challenges";
import { prizeTableText, prizeText } from "@/lib/emergency-prizes";
import { endNoticeNotes, type EndNotice } from "@/lib/end-notices";
import { describeTierReward } from "@/lib/events";
import { bannerReward } from "@/lib/notification-queue";
import { describeAdminReward as describeAdminObjectiveReward } from "@/lib/objective-admin";
import { describeObjectiveReward } from "@/lib/objectives";
import { describeBonusReward } from "@/lib/packs";
import {
  MAX_SHARD_REWARD,
  describeShards,
  shardsFromInput,
  shardsInput,
  shardsInputValid,
} from "@/lib/shard-rewards";

describe("describeShards", () => {
  it("says one Scheggia, or how many Schegge", () => {
    expect(describeShards(1)).toBe("1 Scheggia");
    expect(describeShards(3)).toBe("3 Schegge");
    expect(describeShards(100)).toBe("100 Schegge");
  });

  it("is empty without any", () => {
    expect(describeShards(0)).toBe("");
    expect(describeShards(undefined)).toBe("");
    expect(describeShards(null)).toBe("");
    expect(describeShards(Number.NaN)).toBe("");
  });
});

describe("the editors' Schegge field", () => {
  it("keeps the limit of balance.ts, which the server checks too", () => {
    expect(MAX_SHARD_REWARD).toBe(balance.shards.maxReward);
  });

  it("takes digits only, at most three", () => {
    expect(shardsInput("12a")).toBe("12");
    expect(shardsInput("-5")).toBe("5");
    expect(shardsInput("1234")).toBe("123");
    expect(shardsInput("")).toBe("");
  });

  it("sends 0 for an empty field and checks the limit", () => {
    expect(shardsFromInput("")).toBe(0);
    expect(shardsFromInput("7")).toBe(7);
    expect(shardsInputValid("0")).toBe(true);
    expect(shardsInputValid(String(MAX_SHARD_REWARD))).toBe(true);
    expect(shardsInputValid(String(MAX_SHARD_REWARD + 1))).toBe(false);
  });
});

describe("prizes with Schegge", () => {
  it("closes an event target's reward", () => {
    expect(describeTierReward({ coins: 50, packs: 1, shards: 3, cards: [] })).toBe("50 monete, 1 pacchetto e 3 Schegge");
    expect(describeTierReward({ coins: 0, packs: 0, shards: 1, cards: [] })).toBe("1 Scheggia");
    // A server before the Schegge sends none.
    expect(describeTierReward({ coins: 50, packs: 0, cards: [] })).toBe("50 monete");
  });

  it("joins an objective's reward", () => {
    expect(describeObjectiveReward({ coins: 20, packs: 1, shards: 2, cards: [] })).toBe("1 pacchetto + 20 monete + 2 Schegge");
    expect(describeObjectiveReward({ coins: 0, packs: 0, shards: 1, cards: [] })).toBe("1 Scheggia");
  });

  it("makes an impresa with only Schegge worth claiming", () => {
    const done = {
      id: "a",
      tier: "bronze",
      done: true,
      name: "Scheggiato",
      description: "",
      completed_at: "2026-11-19T10:00:00Z",
      retired: false,
      coins: 0,
      packs: 0,
      shards: 4,
      cards: [],
      random_variants: null,
      title: null,
      claimed: false,
      opening_ids: [],
      new: false,
    } satisfies CompletedAchievement;
    expect(hasReward(done)).toBe(true);
    expect(hasReward({ ...done, shards: 0 })).toBe(false);
    expect(describeAchievementReward(done)).toBe("4 Schegge");
    expect(describeAchievementReward({ ...done, coins: 150, title: "Il Tagliente" })).toBe(
      "150 monete · 4 Schegge · titolo «Il Tagliente»",
    );
  });

  it("names a challenge target's Schegge", () => {
    expect(describeChallengeTierReward({ coins: 30, packs: 0, shards: 5, cards: [], random_variants_info: null })).toBe(
      "30 monete + 5 Schegge",
    );
  });

  it("puts the Schegge in a banner", () => {
    const banner = { id: "n", kind: "event_reward", title: "Premio evento ottenuto!", body: "", created_at: "" };
    expect(bannerReward({ ...banner, data: { coins: 40, packs: 1, shards: 3 } })).toBe("40 monete · 1 pacchetto · 3 Schegge");
    expect(bannerReward({ ...banner, data: { shards: 1 } })).toBe("1 Scheggia");
    expect(bannerReward({ ...banner, data: { shards: "3" } })).toBeNull();
  });

  it("sums up a bonus code", () => {
    expect(describeBonusReward({ coins: 100, cards: 0, packs: 0, shards: 3 })).toBe("100 monete e 3 Schegge");
    expect(describeBonusReward({ coins: 0, cards: 1, packs: 2, shards: 1 })).toBe("1 carta, 2 pacchetti e 1 Scheggia");
  });

  it("says the places of an Emergenza leaderboard", () => {
    expect(prizeText({ coins: 50, packs: 1 })).toBe("1 pacchetto e 50 monete");
    expect(prizeText({ coins: 50, packs: 1, shards: 3 })).toBe("1 pacchetto, 3 Schegge e 50 monete");
    expect(prizeText({ coins: 0, packs: 0, shards: 2 })).toBe("2 Schegge");
    expect(
      prizeTableText([
        { from: 1, to: 1, coins: 0, packs: 1, shards: 5 },
        { from: 4, to: 10, coins: 25, packs: 0, shards: 0 },
      ]),
    ).toBe("1° 1 pacchetto e 5 Schegge · 4°–10° 25 monete");
  });

  it("mentions a week's prize of Schegge when the Emergenza della settimana ends", () => {
    const week = {
      id: "emergency_week:2026-11-09",
      kind: "emergency_week",
      ref: "2026-11-09",
      title: "Emergenza della settimana",
      color: null,
      starts_at: "2026-11-08T23:00:00Z",
      ends_at: "2026-11-15T23:00:00Z",
      rank: 1,
      players: 30,
      board: null,
      board_locked: false,
      result: {
        passed: 10,
        score: 300,
        finished: true,
        threats: 10,
        prize_coins: 0,
        prize_packs: 0,
        prize_shards: 6,
        prize_claimed: false,
      },
    } satisfies EndNotice;
    expect(endNoticeNotes(week)).toEqual(["Premio: 6 Schegge"]);
    expect(endNoticeNotes({ ...week, result: { ...week.result, prize_coins: 100, prize_packs: 2, prize_claimed: true } })).toEqual([
      "Premio: 2 pacchetti, 6 Schegge e 100 monete (riscosso)",
    ]);
  });

  it("lists them in the editors", () => {
    expect(
      describeAdminObjectiveReward(
        { coins: null, packs: 0, shards: 2, cards: 0, difficulty: "easy", random_variants: null },
        { easy: 20, medium: 40, hard: 60 },
      ),
    ).toBe("20 monete + 2 Schegge");
    expect(describeAdminAchievementReward({ coins: 0, packs: 1, shards: 1, card_codes: [], title: null })).toBe(
      "1 pacchetto · 1 Scheggia",
    );
  });
});
