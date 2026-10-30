import { describe, expect, it } from "vitest";
import { buildBotTeam, chooseBotPlay, computeAbilityMeans, type BotView } from "./bots.ts";
import { mulberry32 } from "./rng.ts";
import { ABILITIES, character, FAMILIES, threat, threatCatalog } from "./test-fixtures.ts";
import type { Threat } from "./types.ts";

const MEANS = Object.fromEntries(ABILITIES.map((ability) => [ability, 4.5]));

function view(overrides: Partial<BotView>): BotView {
  return {
    available: [],
    currentThreat: threat("now", ["FOR"]),
    futureLevels: [],
    roundsWon: 0,
    opponentRoundsWon: 0,
    carriedBonus: 0,
    threatPool: threatCatalog(),
    families: FAMILIES,
    abilityMeans: MEANS,
    ...overrides,
  };
}

// A specialist: 10 in FOR/VEL/RES, low elsewhere. A generalist: 5 everywhere.
const specialist = character("spec", { FOR: 10, VEL: 10, RES: 10 }, null, 2);
const generalist = character("gen", {}, null, 5);

describe("easy and medium bots", () => {
  it("medium always plays the best score for the current threat", () => {
    const options = [character("x", { FOR: 3 }), character("y", { FOR: 8 }), character("z", { FOR: 6 })];
    for (let seed = 0; seed < 20; seed++) {
      expect(chooseBotPlay("medium", view({ available: options }), mulberry32(seed))).toBe("y");
    }
  });

  it("easy plays any available character, preferring good scores", () => {
    const options = [character("weak", { FOR: 0 }, null, 0), character("strong", { FOR: 10 })];
    const picks = Array.from({ length: 200 }, (_, seed) =>
      chooseBotPlay("easy", view({ available: options }), mulberry32(seed)),
    );
    const strong = picks.filter((id) => id === "strong").length;
    expect(strong).toBeGreaterThan(150);
    expect(strong).toBeLessThan(200);
  });
});

describe("hard bot", () => {
  it("keeps the specialist for a low level and plays the generalist on a high level", () => {
    // Current threat: level 6 where the generalist scores 30 and the specialist 12-34.
    // Future: a level-1 threat, where a specialist's 10 shines.
    const current = threat("now", ["INT", "VOL", "PER", "ENE", "MAG", "PSI"]);
    const pool: Threat[] = [threat("f1", ["FOR"]), threat("f2", ["VEL"]), threat("f3", ["RES"])];
    const choice = chooseBotPlay(
      "hard",
      view({ available: [specialist, generalist], currentThreat: current, futureLevels: [1], threatPool: pool }),
      mulberry32(1),
    );
    expect(choice).toBe("gen");
  });

  it("sends the weaker character to a round that looks lost", () => {
    // Nobody scores well on PSI; the strong all-rounder is kept for the future rounds.
    const weak = character("weak", { PSI: 1 }, null, 2);
    const strong = character("strong", { PSI: 2 }, null, 8);
    const choice = chooseBotPlay(
      "hard",
      view({
        available: [weak, strong],
        currentThreat: threat("now", ["PSI"]),
        futureLevels: [4],
        threatPool: threatCatalog(),
      }),
      mulberry32(3),
    );
    expect(choice).toBe("weak");
  });

  it("is deterministic for a given seed", () => {
    const options = [specialist, generalist, character("other", { MAG: 9 })];
    const v = view({ available: options, futureLevels: [3, 5] });
    expect(chooseBotPlay("hard", v, mulberry32(42))).toBe(chooseBotPlay("hard", v, mulberry32(42)));
  });
});

describe("buildBotTeam", () => {
  const catalog = Array.from({ length: 30 }, (_, i) =>
    i % 3 === 0
      ? character(`s${i}`, { [ABILITIES[i % 12]]: 10, [ABILITIES[(i + 1) % 12]]: 9 }, null, 3)
      : character(`g${i}`, {}, null, 4 + (i % 2)),
  );

  it("returns distinct characters for every difficulty", () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const team = buildBotTeam(difficulty, catalog, 5, mulberry32(9));
      expect(team).toHaveLength(5);
      expect(new Set(team.map((c) => c.definitionId)).size).toBe(5);
    }
  });

  it("gives the hard bot both specialists and generalists", () => {
    const team = buildBotTeam("hard", catalog, 5, mulberry32(11));
    expect(team.filter((c) => c.id.startsWith("s")).length).toBe(3);
    expect(team.filter((c) => c.id.startsWith("g")).length).toBe(2);
  });
});

describe("computeAbilityMeans", () => {
  it("averages every ability over the catalog", () => {
    const means = computeAbilityMeans([character("a", { FOR: 10 }, null, 2), character("b", { FOR: 0 }, null, 6)]);
    expect(means.FOR).toBe(5);
    expect(means.VEL).toBe(4);
  });
});
