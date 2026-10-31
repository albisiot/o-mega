import { describe, expect, it } from "vitest";
import { levelProgress, matchXp, xpForLevel } from "./progression";

describe("progression", () => {
  it("matches the XP thresholds of level_for_xp in the database", () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 300, 600, 1000]);
  });

  it("mirrors the XP that finish_match awards", () => {
    expect(matchXp({ bot_difficulty: "easy", result: "win", end_reason: "completed" })).toBe(10);
    expect(matchXp({ bot_difficulty: "super_pro", result: "loss", end_reason: "completed" })).toBe(3);
    expect(matchXp({ bot_difficulty: null, result: "win", end_reason: "forfeit" })).toBe(30);
    expect(matchXp({ bot_difficulty: null, result: "draw", end_reason: "completed" })).toBe(10);
    expect(matchXp({ bot_difficulty: null, result: "loss", end_reason: "forfeit" })).toBe(0);
    expect(matchXp({ bot_difficulty: null, result: "draw", end_reason: "forfeit" })).toBe(0);
    expect(matchXp({ bot_difficulty: "easy", result: null, end_reason: null })).toBe(0);
  });

  it("measures the progress within a level", () => {
    expect(levelProgress(0, 1)).toBe(0);
    expect(levelProgress(50, 1)).toBe(0.5);
    expect(levelProgress(300, 3)).toBe(0);
    expect(levelProgress(450, 3)).toBe(0.5);
  });
});
