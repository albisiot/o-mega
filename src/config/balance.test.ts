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

  it("gives every Grande Minaccia turn a character and a free front", () => {
    expect(balance.boss.turns).toBe(balance.match.teamSize);
    expect(balance.boss.turns).toBeLessThanOrEqual(balance.boss.fronts);
    expect(balance.boss.hotFronts).toBeLessThanOrEqual(balance.boss.fronts);
    // The hot fronts of two turns in a row can all be different.
    expect(balance.boss.hotFronts * 2).toBeLessThanOrEqual(balance.boss.fronts);
  });

  it("allows the Emergenza level sums with the levels of a match", () => {
    const { min, max } = balance.match.threatLevels;
    const { threatsPerRun, threatLevels } = balance.emergency;
    expect(threatLevels.minSum).toBeGreaterThanOrEqual(min * threatsPerRun);
    expect(threatLevels.maxSum).toBeLessThanOrEqual(max * threatsPerRun);
  });

  it("makes the weekly Emergenza longer and harder than the daily one, with reachable rewards", () => {
    const week = balance.emergencyWeek;
    const day = balance.emergency;
    const { min, max } = balance.match.threatLevels;
    expect(week.threatsPerRun).toBeGreaterThan(day.threatsPerRun);
    expect(week.threatLevels.minSum).toBeGreaterThanOrEqual(min * week.threatsPerRun);
    expect(week.threatLevels.maxSum).toBeLessThanOrEqual(max * week.threatsPerRun);
    // Bigger threats on average than the daily ones.
    expect(week.threatLevels.minSum / week.threatsPerRun).toBeGreaterThan(day.threatLevels.minSum / day.threatsPerRun);
    for (const level of [1, 2, 3, 4, 5, 6] as const) {
      expect(week.targets[`level${level}`]).toBeGreaterThan(day.targets[`level${level}`]);
    }
    expect(week.rewards.tier1Passed).toBeLessThan(week.rewards.tier2Passed);
    expect(week.rewards.tier2Passed).toBeLessThan(week.rewards.tier3Passed);
    expect(week.rewards.tier3Passed).toBeLessThanOrEqual(week.threatsPerRun);
    expect(week.maxFailures).toBeLessThan(week.threatsPerRun);
    expect(week.prizes.minPassed).toBeLessThanOrEqual(week.threatsPerRun);
  });
  it("lets the server's opponent choose before the deadline, in time for the app to see it", () => {
    const { delays, lateSeconds, deadlineMarginSeconds, nudgeSeconds } = balance.ranked.ghosts;
    // Seconds from the opening of a round (or of a Quadrante move) to its deadline, as the database sets them.
    const deadlines = {
      classic: balance.match.revealPauseSeconds + balance.match.roundTimerSeconds,
      boss: balance.match.revealPauseSeconds + balance.match.roundTimerSeconds,
      tripleFirst: balance.match.revealPauseSeconds + balance.triple.roundTimerSeconds,
      triple: balance.triple.revealPauseSeconds + balance.triple.roundTimerSeconds,
      quadrant: balance.quadrant.movePauseSeconds + balance.quadrant.moveTimerSeconds,
    } satisfies Record<keyof typeof delays, number>;
    for (const kind of Object.keys(deadlines) as (keyof typeof delays)[]) {
      expect(delays[kind].min).toBeLessThanOrEqual(delays[kind].max);
      // The window of every mode ends before the margin: the margin never cuts it short.
      expect(delays[kind].max).toBeLessThanOrEqual(deadlines[kind] - deadlineMarginSeconds);
    }
    // The late choices come in the last seconds of every timer, never inside the margin.
    expect(lateSeconds.min).toBeGreaterThanOrEqual(deadlineMarginSeconds);
    expect(lateSeconds.max).toBeGreaterThanOrEqual(lateSeconds.min);
    expect(lateSeconds.max).toBeLessThan(
      Math.min(balance.match.roundTimerSeconds, balance.triple.roundTimerSeconds, balance.quadrant.moveTimerSeconds),
    );
    // A choice at the margin is asked about at least once, with as long again left for the network.
    expect(deadlineMarginSeconds).toBeGreaterThanOrEqual(2 * nudgeSeconds);
  });
});
