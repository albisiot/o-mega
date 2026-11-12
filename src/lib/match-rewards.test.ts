import { describe, expect, it } from "vitest";
import {
  coinSources,
  describeGain,
  rewardChanges,
  rewardModes,
  rewardRule,
  rewardsProblem,
  type MatchRewardRule,
  type MatchRewards,
  type RewardOpponent,
  type RewardOutcome,
} from "@/lib/match-rewards";

const rule = (mode_key: string, opponent: RewardOpponent, outcome: RewardOutcome, coins = 0, xp = 0, packs = 0): MatchRewardRule => ({
  mode_key,
  opponent,
  outcome,
  coins,
  xp,
  packs,
});

const RULES: MatchRewardRule[] = [
  rule("default", "bot", "win", 0, 10),
  rule("default", "bot", "draw", 0, 3),
  rule("default", "bot", "loss", 0, 3),
  rule("default", "person", "win", 0, 30),
  rule("default", "person", "draw", 0, 10),
  rule("default", "person", "loss", 0, 10),
  rule("conquest", "person", "win", 0, 30),
  rule("conquest", "person", "draw", 10, 10),
  rule("conquest", "person", "loss", 10, 10),
  rule("conquest", "bot", "win", 0, 10),
  rule("conquest", "bot", "draw", 10, 3),
  rule("conquest", "bot", "loss", 10, 3),
  rule("story", "bot", "win", 0, 10),
  rule("future_mode", "bot", "win", 5, 1),
];

const SETTINGS = {
  "match_rewards.daily_coin_cap": 0,
  "match_rewards.daily_pack_cap": 3,
  "conquest.no_card_bonus_coins": 50,
  "emergency.rewards.finish_xp": 0,
  "emergency.rewards.tier1_passed": 3,
  "emergency.rewards.tier2_passed": 5,
  "emergency.rewards.tier3_passed": 8,
  "emergency.rewards.tier1_coins": 10,
  "emergency.rewards.tier2_coins": 15,
  "emergency.rewards.tier3_coins": 25,
};

describe("match rewards", () => {
  it("falls back to the default rows, as the server does", () => {
    expect(rewardRule(RULES, "conquest", "person", "loss")?.coins).toBe(10);
    expect(rewardRule(RULES, "triple", "person", "win")?.xp).toBe(30);
    expect(rewardRule(RULES, "story", "bot", "loss")?.xp).toBe(3);
  });

  it("lists known modes in order and unknown ones after", () => {
    expect(rewardModes(RULES).map((mode) => mode.key)).toEqual(["conquest", "story", "default", "future_mode"]);
    expect(rewardModes(RULES).at(-1)?.opponents.map((opponent) => opponent.key)).toEqual(["bot"]);
  });

  it("describes a gain", () => {
    expect(describeGain({ xp: 30, coins: 10, packs: 1 })).toBe("30 XP + 10 monete + 1 pacchetto");
    expect(describeGain({ xp: 0, coins: 1, packs: 2 })).toBe("1 moneta + 2 pacchetti");
    expect(describeGain({ xp: 0, coins: 0, packs: 0 })).toBe("Niente");
  });

  it("lists the matches that pay coins, merging equal opponents", () => {
    expect(coinSources(RULES)).toEqual(["Conquista: pareggio +10, sconfitta +10", "future_mode: vittoria +5"]);
    const split = RULES.map((entry) =>
      entry.mode_key === "conquest" && entry.opponent === "bot" ? { ...entry, coins: entry.outcome === "loss" ? 4 : 0 } : entry,
    );
    expect(coinSources(split)).toEqual([
      "Conquista (contro una persona): pareggio +10, sconfitta +10",
      "Conquista (contro il bot di conquista): sconfitta +4",
      "future_mode: vittoria +5",
    ]);
  });

  it("checks a draft like the server", () => {
    expect(rewardsProblem(RULES, SETTINGS, 8)).toBeNull();
    expect(rewardsProblem([rule("default", "bot", "win", 0, 0, 4)], SETTINGS, 8)).toMatch(/pacchetti/);
    expect(rewardsProblem([rule("default", "bot", "win", Number.NaN)], SETTINGS, 8)).toMatch(/monete/);
    expect(rewardsProblem(RULES, { ...SETTINGS, "emergency.rewards.tier1_coins": 0 }, 8)).toMatch(/tra 1 e/);
    expect(rewardsProblem(RULES, { ...SETTINGS, "emergency.rewards.tier2_passed": 3 }, 8)).toMatch(/soglie/);
    expect(rewardsProblem(RULES, SETTINGS, 7)).toMatch(/soglie/);
  });

  it("sends only what changed", () => {
    const saved: MatchRewards = { rules: RULES, settings: SETTINGS, emergency_threats_per_run: 8 };
    const edited = RULES.map((entry) => (entry.mode_key === "story" ? { ...entry, xp: 12 } : entry));
    expect(rewardChanges(saved, edited, { ...SETTINGS, "match_rewards.daily_pack_cap": 1 })).toEqual({
      rules: [rule("story", "bot", "win", 0, 12)],
      settings: { "match_rewards.daily_pack_cap": 1 },
    });
    expect(rewardChanges(saved, RULES, SETTINGS)).toEqual({ rules: [], settings: {} });
  });
});
