import { describe, expect, it } from "vitest";
import { describeAdminReward, kindOf, suggestTitle } from "@/lib/objective-admin";

const rewardCoins = { easy: 20, medium: 40, hard: 60 };

describe("kindOf", () => {
  it("recognizes the starting catalog", () => {
    expect(kindOf({ metric: "matches_won", params: {} })?.key).toBe("win");
    expect(kindOf({ metric: "threats_won", params: { faction: "villains" } })?.key).toBe("threats_villains");
    expect(kindOf({ metric: "matches_won", params: { bot_difficulties: ["hard", "super_pro"], opponent: "bot" } })?.key).toBe(
      "win_hard_bot",
    );
    expect(kindOf({ metric: "matches_won", params: { flawless: true, format: "classic" } })?.key).toBe("win_flawless");
    expect(kindOf({ metric: "emergency_passed", params: {} })?.key).toBe("emergency");
  });

  it("leaves hand-written filters alone", () => {
    expect(kindOf({ metric: "threats_won", params: { faction: "neutrals" } })).toBeNull();
    expect(kindOf({ metric: "matches_won", params: { opponent: "bot", bot_difficulties: ["easy"] } })).toBeNull();
  });
});

describe("suggestTitle", () => {
  it("writes the target in the title", () => {
    expect(suggestTitle("win", 3)).toBe("Vinci 3 partite");
    expect(suggestTitle("win", 1)).toBe("Vinci una partita");
    expect(suggestTitle("packs", 2)).toBe("Apri 2 pacchetti");
    expect(suggestTitle("missing", 2)).toBe("");
  });
});

describe("describeAdminReward", () => {
  it("shows the difficulty's coins when the objective has none of its own", () => {
    expect(describeAdminReward({ coins: null, packs: 0, cards: 0, difficulty: "medium" }, rewardCoins)).toBe("40 monete");
    expect(describeAdminReward({ coins: 0, packs: 1, cards: 0, difficulty: "hard" }, rewardCoins)).toBe("1 pacchetto");
    expect(describeAdminReward({ coins: 10, packs: 2, cards: 1, difficulty: "easy" }, rewardCoins)).toBe(
      "2 pacchetti + 10 monete + 1 carta",
    );
  });
});
