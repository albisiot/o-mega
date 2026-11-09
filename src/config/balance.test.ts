import { describe, expect, it } from "vitest";
import { balance } from "./balance";

describe("balance config", () => {
  it("gives every threat a character", () => {
    expect(balance.match.teamSize).toBe(balance.match.threatsPerMatch);
  });

  it("needs a majority of rounds to win", () => {
    expect(balance.match.roundsToWin).toBe(Math.floor(balance.match.threatsPerMatch / 2) + 1);
  });

  it("allows at least one valid threat level sequence", () => {
    const { min, max, requireOneAtMost, requireOneAtLeast, minSum, maxSum } =
      balance.match.threatLevels;
    const levels = Array.from({ length: max - min + 1 }, (_, i) => min + i);

    // Enumerate all sequences of `threatsPerMatch` levels and keep the valid ones.
    let sequences: number[][] = [[]];
    for (let i = 0; i < balance.match.threatsPerMatch; i++) {
      sequences = sequences.flatMap((seq) => levels.map((level) => [...seq, level]));
    }
    const valid = sequences.filter((seq) => {
      const sum = seq.reduce((a, b) => a + b, 0);
      return (
        seq.some((level) => level <= requireOneAtMost) &&
        seq.some((level) => level >= requireOneAtLeast) &&
        sum >= minSum &&
        sum <= maxSum
      );
    });

    expect(valid.length).toBeGreaterThan(0);
  });

  it("gives every Emergenza run a reachable last reward", () => {
    const { threatsPerRun, maxFailures, rewards } = balance.emergency;
    expect(rewards.tier1Passed).toBeLessThan(rewards.tier2Passed);
    expect(rewards.tier2Passed).toBeLessThan(rewards.tier3Passed);
    expect(rewards.tier3Passed).toBeLessThanOrEqual(threatsPerRun);
    expect(maxFailures).toBeLessThan(threatsPerRun);
  });

  it("sets the Grande Minaccia presidio at half the Emergenza target", () => {
    for (const level of [1, 2, 3, 4, 5, 6] as const) {
      const emergency = balance.emergency.targets[`level${level}`];
      expect(balance.boss.targets[`level${level}`]).toBe(Math.ceil(emergency / 2));
    }
    expect(balance.boss.turns).toBe(balance.match.teamSize);
    expect(balance.boss.hotFronts).toBeLessThanOrEqual(balance.boss.fronts);
    expect(balance.boss.extraFronts).toBeLessThanOrEqual(balance.boss.fronts);
  });

  it("allows the Emergenza level sums with the levels of a match", () => {
    const { min, max } = balance.match.threatLevels;
    const { threatsPerRun, threatLevels } = balance.emergency;
    expect(threatLevels.minSum).toBeGreaterThanOrEqual(min * threatsPerRun);
    expect(threatLevels.maxSum).toBeLessThanOrEqual(max * threatsPerRun);
  });
});
