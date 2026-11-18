import { describe, expect, it } from "vitest";
import { describeAchievementReward, hasReward, type CompletedAchievement } from "@/lib/achievements";
import { describeTierReward } from "@/lib/events";
import { describeObjectiveReward } from "@/lib/objectives";
import { describeRandomVariants, ruleInfo, ruleToSend } from "@/lib/random-variants";

const styles = [
  { style: "neon", name: "Neon" },
  { style: "tarot", name: "Tarocco" },
];
const rarities = [
  { code: "delta", name: "Delta" },
  { code: "omega", name: "Omega" },
];

describe("describeRandomVariants", () => {
  it("says how many, then the styles and rarities they may have", () => {
    expect(describeRandomVariants({ count: 1, styles: [], rarities: [] })).toBe("1 variante a caso");
    expect(describeRandomVariants({ count: 2, styles: ["Neon", "Tarocco"], rarities: ["Omega"] })).toBe(
      "2 varianti a caso (stile Neon o Tarocco, Omega)",
    );
    expect(describeRandomVariants({ count: 3, styles: [], rarities: ["Delta", "Gamma", "Beta"] })).toBe(
      "3 varianti a caso (Delta, Gamma o Beta)",
    );
  });

  it("is empty without a rule", () => {
    expect(describeRandomVariants(null)).toBe("");
    expect(describeRandomVariants({ count: 0, styles: [], rarities: [] })).toBe("");
  });
});

describe("ruleInfo and ruleToSend", () => {
  it("names a saved rule's codes, keeping those it does not know", () => {
    expect(ruleInfo({ count: 2, styles: ["neon", "gone"], rarities: ["omega"] }, styles, rarities)).toEqual({
      count: 2,
      styles: ["Neon", "gone"],
      rarities: ["Omega"],
    });
    expect(ruleInfo(null, styles, rarities)).toBeNull();
  });

  it("sends nothing for a count of 0", () => {
    expect(ruleToSend({ count: 0, styles: ["neon"], rarities: [] })).toBeNull();
    expect(ruleToSend({ count: 1, styles: [], rarities: [] })).toEqual({ count: 1, styles: [], rarities: [] });
  });
});

describe("rewards with random variants", () => {
  const random = { count: 1, styles: ["Neon"], rarities: [] };

  it("closes an event target's reward", () => {
    expect(describeTierReward({ coins: 50, packs: 0, cards: [], random_variants: random })).toBe(
      "50 monete e 1 variante a caso (stile Neon)",
    );
  });

  it("closes an objective's reward", () => {
    expect(describeObjectiveReward({ coins: 0, packs: 1, cards: [], random_variants: random })).toBe(
      "1 pacchetto + 1 variante a caso (stile Neon)",
    );
  });

  it("makes an impresa with only random variants worth claiming", () => {
    const done = {
      id: "a",
      tier: "bronze",
      done: true,
      name: "Caccia",
      description: "",
      completed_at: "2026-11-18T10:00:00Z",
      retired: false,
      coins: 0,
      packs: 0,
      cards: [],
      random_variants: random,
      title: null,
      claimed: false,
      opening_ids: [],
      new: false,
    } satisfies CompletedAchievement;
    expect(hasReward(done)).toBe(true);
    expect(hasReward({ ...done, random_variants: null })).toBe(false);
    expect(describeAchievementReward(done)).toBe("1 variante a caso (stile Neon)");
  });
});
