import { describe, expect, it } from "vitest";
import { botView, buildBotTeam, chooseBotPlay, computeAbilityMeans, type BotView } from "./bots.ts";
import { mulberry32 } from "./rng.ts";
import { ABILITIES, character, FAMILIES, newState, threat, threatCatalog } from "./test-fixtures.ts";
import type { MatchState, Threat } from "./types.ts";

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
    opponentPool: Array.from({ length: 12 }, (_, i) => character(`pool${i}`, { [ABILITIES[i]]: 9 }, null, 4)),
    opponentCarriedBonus: 0,
    scoreLead: 0,
    roundsToWin: 3,
    round: 1,
    team: overrides.available ?? [],
    opponentSeen: [],
    foreseenThreats: null,
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

describe("super pro bot", () => {
  it("is deterministic for a given seed", () => {
    const options = [specialist, generalist, character("other", { MAG: 9 })];
    const v = view({ available: options, futureLevels: [3, 5] });
    expect(chooseBotPlay("super_pro", v, mulberry32(42))).toBe(chooseBotPlay("super_pro", v, mulberry32(42)));
  });

  it("plays the character that wins the deciding last round", () => {
    const options = [character("weak", {}, null, 1), character("strong", {}, null, 9)];
    const choice = chooseBotPlay("super_pro", view({ available: options, roundsWon: 2, opponentRoundsWon: 2 }), mulberry32(5));
    expect(choice).toBe("strong");
  });

  it("gives each character the round that suits it", () => {
    // The specialist wins now but is hopeless on the level 6 that follows,
    // where the all-rounder would win: the other order loses both rounds' edge.
    const allRounder = character("all", { FOR: 5 }, null, 8);
    const forOnly = character("for", { FOR: 10 }, null, 1);
    const choice = chooseBotPlay(
      "super_pro",
      view({
        available: [forOnly, allRounder],
        currentThreat: threat("now", ["FOR"]),
        futureLevels: [6],
        threatPool: [threat("six", ["VEL", "RES", "INT", "VOL", "PER", "ENE"])],
      }),
      mulberry32(7),
    );
    expect(choice).toBe("for");
  });

  it("only knows the opponent's characters already played", () => {
    const seen = character("seen", {}, null, 9);
    const hidden = character("hidden", {}, null, 9);
    const other = character("other");
    const state: MatchState = {
      ...newState([character("mine1"), character("mine2")], [seen, hidden], [threat("t1", ["FOR"]), threat("t2", ["VEL"])]),
    };
    const pick = (id: string) => ({ characterId: id, base: 4, bonus: 0, total: 4, highest: 4, autoPlayed: false });
    const played: MatchState = {
      ...state,
      rounds: [{ round: 1, threatId: "t1", plays: { a: pick("mine1"), b: pick("seen") }, winner: null }],
    };
    const knowledge = {
      characters: [seen, hidden, other],
      threatCatalog: threatCatalog(),
      families: FAMILIES,
      abilityMeans: MEANS,
    };
    const pool = botView(played, "a", knowledge).opponentPool.map((c) => c.id);
    expect(pool).toEqual(["hidden", "other"]);
    // The pool is the catalog: the same whether or not "hidden" is on their team.
    const elsewhere = { ...played, teams: { ...played.teams, b: [seen, other] } };
    expect(botView(elsewhere, "a", knowledge).opponentPool.map((c) => c.id)).toEqual(pool);
  });
});

describe("bots and the new powers", () => {
  it("medium counts what Sabotatore takes from the opponent", () => {
    const saboteur = character("sab", { INT: 5, VOL: 5, PER: 5 }, { code: "sabotage", params: { malus: 1 } });
    const plain = character("plain", { INT: 6, VOL: 6, PER: 6 });
    const current = threat("now", ["INT", "VOL", "PER", "ENE"]);
    // 15 + 4 + 4 of malus against 18 + 4.
    expect(chooseBotPlay("medium", view({ available: [saboteur, plain], currentThreat: current }), mulberry32(1))).toBe("sab");
  });

  it("hard keeps Ultimo baluardo for the last rounds", () => {
    const lastStand = character("last", {}, { code: "last_stand", params: { bonus: 3, min_round: 4 } }, 6);
    const plain = character("plain", {}, null, 5);
    const choice = chooseBotPlay(
      "hard",
      view({ available: [lastStand, plain], round: 3, currentThreat: threat("now", ["FOR"]), futureLevels: [1] }),
      mulberry32(2),
    );
    expect(choice).toBe("plain");
  });

  it("uses the foreseen threats instead of guessing them", () => {
    const forOnly = character("for", { FOR: 10 }, null, 1);
    const velOnly = character("vel", { VEL: 10 }, null, 1);
    const foreseen = [threat("next", ["VEL"])];
    for (const difficulty of ["hard", "super_pro"] as const) {
      const choice = chooseBotPlay(
        difficulty,
        view({
          available: [forOnly, velOnly],
          currentThreat: threat("now", ["FOR"]),
          futureLevels: [1],
          foreseenThreats: foreseen,
        }),
        mulberry32(3),
      );
      expect(choice).toBe("for");
    }
  });

  it("only foresees after playing its own Veggente", () => {
    const seer = character("seer", {}, { code: "foresight", params: {} });
    const threats = [threat("t1", ["FOR"]), threat("t2", ["VEL"]), threat("t3", ["RES"])];
    const knowledge = { characters: [], threatCatalog: threatCatalog(), families: FAMILIES, abilityMeans: MEANS };
    const pick = (id: string) => ({ characterId: id, base: 4, bonus: 0, total: 4, highest: 4, autoPlayed: false });
    const state: MatchState = newState([seer, character("a2")], [character("b1"), character("b2")], threats);
    expect(botView(state, "a", knowledge).foreseenThreats).toBeNull();

    const played: MatchState = {
      ...state,
      rounds: [{ round: 1, threatId: "t1", plays: { a: pick("seer"), b: pick("b1") }, winner: null }],
    };
    expect(botView(played, "a", knowledge).foreseenThreats?.map((t) => t.id)).toEqual(["t3"]);
    // Seeing the opponent's Veggente played gives the other side nothing.
    expect(botView(played, "b", knowledge).foreseenThreats).toBeNull();
  });
});

describe("buildBotTeam", () => {
  const catalog = Array.from({ length: 30 }, (_, i) =>
    i % 3 === 0
      ? character(`s${i}`, { [ABILITIES[i % 12]]: 10, [ABILITIES[(i + 1) % 12]]: 9 }, null, 3)
      : character(`g${i}`, {}, null, 4 + (i % 2)),
  );

  it("returns distinct characters for every difficulty", () => {
    for (const difficulty of ["easy", "medium", "hard", "super_pro"] as const) {
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
