import { describe, expect, it } from "vitest";
import { mulberry32 } from "./rng.ts";
import { RULES, threat, threatCatalog } from "./test-fixtures.ts";
import { drawThreatLevels, isValidLevelSequence, pickThreats } from "./threats.ts";

describe("isValidLevelSequence", () => {
  const rules = RULES.threatLevels;

  it("accepts the SPEC example", () => {
    expect(isValidLevelSequence([2, 5, 1, 3, 6], rules)).toBe(true);
  });

  it("requires a low level, a high level and a sum between 14 and 20", () => {
    expect(isValidLevelSequence([3, 3, 3, 3, 3], rules)).toBe(false); // no low or high level
    expect(isValidLevelSequence([1, 5, 3, 3, 3], rules)).toBe(true); // sum 15
    expect(isValidLevelSequence([1, 5, 1, 1, 1], rules)).toBe(false); // sum 9
    expect(isValidLevelSequence([2, 6, 6, 6, 6], rules)).toBe(false); // sum 26
    expect(isValidLevelSequence([1, 5, 3, 3, 7], rules)).toBe(false); // level out of range
  });
});

describe("drawThreatLevels", () => {
  it("always returns a valid sequence of the right length", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const levels = drawThreatLevels(mulberry32(seed), RULES);
      expect(levels).toHaveLength(5);
      expect(isValidLevelSequence(levels, RULES.threatLevels)).toBe(true);
    }
  });

  it("varies between matches", () => {
    const sequences = new Set(Array.from({ length: 50 }, (_, i) => drawThreatLevels(mulberry32(i), RULES).join()));
    expect(sequences.size).toBeGreaterThan(20);
  });

  it("fails loudly when the rules cannot be satisfied", () => {
    const impossible = { ...RULES, threatLevels: { ...RULES.threatLevels, minSum: 40, maxSum: 50 } };
    expect(() => drawThreatLevels(mulberry32(1), impossible)).toThrow(/No valid/);
  });
});

describe("pickThreats", () => {
  it("picks distinct threats matching each level", () => {
    const catalog = threatCatalog();
    const picked = pickThreats(mulberry32(7), catalog, [2, 2, 5, 1, 6]);
    expect(picked.map((t) => t.level)).toEqual([2, 2, 5, 1, 6]);
    expect(new Set(picked.map((t) => t.id)).size).toBe(5);
  });

  it("fails when a level has too few threats", () => {
    expect(() => pickThreats(mulberry32(1), [threat("only", ["FOR"])], [1, 1])).toThrow(/level 1/);
  });
});
