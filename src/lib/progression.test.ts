import { describe, expect, it } from "vitest";
import { levelProgress, xpForLevel } from "./progression";

describe("progression", () => {
  it("matches the XP thresholds of level_for_xp in the database", () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 300, 600, 1000]);
  });

  it("measures the progress within a level", () => {
    expect(levelProgress(0, 1)).toBe(0);
    expect(levelProgress(50, 1)).toBe(0.5);
    expect(levelProgress(300, 3)).toBe(0);
    expect(levelProgress(450, 3)).toBe(0.5);
  });
});
