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
});
