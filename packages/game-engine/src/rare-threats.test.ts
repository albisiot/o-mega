// The rare threats (SPEC §5.15): their draw and their rules.
import { describe, expect, it } from "vitest";
import { botView, chooseBotPlay, type BotKnowledge } from "./bots.ts";
import { requiredScore, resolveEmergencyPlay } from "./emergency.ts";
import { planBotMatch } from "./flow.ts";
import { resolveRound } from "./match.ts";
import { mulberry32 } from "./rng.ts";
import { compareScores, scorePlay, type ScoreContext } from "./scoring.ts";
import { ABILITIES, character, FAMILIES, newState, RULES, threat, threatCatalog } from "./test-fixtures.ts";
import {
  drawMatchThreats,
  drawRareThreats,
  placeModifier,
  withRareThreats,
  withRuleAbilities,
  type RareRuleNumbers,
} from "./threats.ts";
import type { PlayScore, RareThreat, Threat, ThreatModifier } from "./types.ts";

const context: ScoreContext = { families: FAMILIES, roundsWon: 0, opponentRoundsWon: 0, carriedBonus: 0, round: 2, team: [] };
const at = (abilities: string[], modifier: ThreatModifier | null = null): Threat => ({ ...threat("t", abilities), modifier });
const rare = (id: string, abilities: string[], oneIn: number, modifier: ThreatModifier | null = null): RareThreat => ({
  ...threat(id, abilities),
  modifier,
  rarity: "mythic",
  oneIn,
});

const NUMBERS: RareRuleNumbers = {
  hostileBonus: 3,
  hostileMalus: 2,
  underdogBonus: 3,
  underdogMalus: 3,
  underdogCommonMaxRank: 1,
  underdogEliteMinRank: 4,
  allOrNothingMin: 5,
  lastFirstBonus: 2,
  lastFirstTopRank: 5,
  priceMaxValue: 1,
  priceMalus: 3,
  countMin: 5,
  countPoints: 1,
  negativeMax: 10,
};

describe("drawRareThreats", () => {
  it("draws each rare threat once in `oneIn` matches", () => {
    const rng = mulberry32(7);
    const catalog = [rare("r10", ["FOR"], 10), rare("r100", ["VEL"], 100)];
    const hits = { r10: 0, r100: 0 };
    for (let i = 0; i < 20_000; i++) for (const t of drawRareThreats(rng, catalog)) hits[t.id as "r10" | "r100"] += 1;
    expect(hits.r10 / 20_000).toBeCloseTo(0.1, 1);
    expect(hits.r100 / 20_000).toBeGreaterThan(0.006);
    expect(hits.r100 / 20_000).toBeLessThan(0.014);
  });

  it("never draws a rare threat with no chance", () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 500; i++) expect(drawRareThreats(rng, [rare("r", ["FOR"], 0)])).toEqual([]);
  });
});

describe("withRareThreats", () => {
  const levels = [1, 3, 5, 2, 4].map((level, i) => threat(`t${i}`, ABILITIES.slice(0, level)));

  it("puts a rare threat in place of one round and keeps a low and a high level among the others", () => {
    const end = rare("end", ABILITIES, 1);
    for (let seed = 1; seed <= 200; seed++) {
      const result = withRareThreats(mulberry32(seed), levels, [end], RULES.threatLevels);
      expect(result).toHaveLength(5);
      expect(result.filter((t) => t.id === "end")).toHaveLength(1);
      const others = result.filter((t) => t.id !== "end").map((t) => t.level);
      expect(others.some((level) => level <= 2)).toBe(true);
      expect(others.some((level) => level >= 5)).toBe(true);
    }
  });

  it("gives each rare threat a different round, and changes nothing without one", () => {
    const result = withRareThreats(mulberry32(3), levels, [rare("x", ["FOR"], 1), rare("y", ["VEL"], 1)], RULES.threatLevels);
    expect(result.filter((t) => t.id === "x" || t.id === "y")).toHaveLength(2);
    expect(withRareThreats(mulberry32(3), levels, [], RULES.threatLevels)).toEqual(levels);
  });

  it("draws them into a match and into a bot match plan", () => {
    const always = rare("end", ABILITIES, 1);
    const threats = drawMatchThreats(mulberry32(5), threatCatalog(), [always], RULES);
    expect(threats.map((t) => t.id)).toContain("end");
    const knowledge: BotKnowledge = {
      threatCatalog: threatCatalog(),
      rareCatalog: [always],
      families: FAMILIES,
      abilityMeans: Object.fromEntries(ABILITIES.map((a) => [a, 4])),
      characters: Array.from({ length: 12 }, (_, i) => character(`c${i}`)),
    };
    const plan = planBotMatch({ rules: RULES, catalog: knowledge, difficulty: "easy", rng: mulberry32(2) });
    expect(plan.threats.map((t) => t.id)).toContain("end");
  });
});

describe("placeModifier for the rare threats", () => {
  const rules = { longCountBonus: 3, frostCap: 6, duelCount: 2, rare: NUMBERS };

  it("reads the fixed rules and their numbers", () => {
    expect(placeModifier("focus", {}, rules)).toEqual({ code: "focus" });
    expect(placeModifier("duel", { count: 1 }, rules)).toEqual({ code: "duel", count: 1 });
    expect(placeModifier("hostile_ground", { favored: "villains", hindered: "heroes" }, rules)).toEqual({
      code: "hostile_ground",
      favored: "villains",
      hindered: "heroes",
      bonus: 3,
      malus: 2,
    });
    expect(placeModifier("last_first", {}, rules)).toEqual({ code: "last_first", bonus: 2, topRank: 5 });
    expect(placeModifier("negative", {}, rules)).toEqual({ code: "negative", max: 10 });
    expect(placeModifier("blind", {}, rules)).toEqual({ code: "blind", abilities: [] });
  });

  it("needs the numbers and the parameters of a rule", () => {
    expect(() => placeModifier("count", {}, { longCountBonus: 3, frostCap: 6, duelCount: 2 })).toThrow(/numbers/);
    expect(() => placeModifier("hostile_ground", {}, rules)).toThrow(/factions/);
    expect(() => placeModifier("one_force", {}, rules)).toThrow(/abilities/);
  });
});

describe("withRuleAbilities", () => {
  it("plays Al buio and Livello ignoto on the abilities drawn for the match", () => {
    const blind = withRuleAbilities({ ...threat("b", ABILITIES), modifier: { code: "blind", abilities: ["FOR", "PSI"] } });
    expect(blind).toMatchObject({ level: 2, abilities: ["FOR", "PSI"] });
    const unknown = withRuleAbilities({ ...threat("u", ABILITIES), modifier: { code: "unknown_level", abilities: ["TEC"] } });
    expect(unknown).toMatchObject({ level: 1, abilities: ["TEC"] });
  });

  it("adds to Eco the abilities of the round before it does not already require", () => {
    const echo = withRuleAbilities({ ...threat("e", ["FOR", "ENE"]), modifier: { code: "echo", abilities: ["ENE", "VEL"] } });
    expect(echo).toMatchObject({ level: 3, abilities: ["FOR", "ENE", "VEL"] });
  });

  it("leaves every other threat as it is", () => {
    const plain = at(["FOR"]);
    expect(withRuleAbilities(plain)).toBe(plain);
  });
});

describe("the rules of the rare threats", () => {
  const hero = character("h", { FOR: 9, VEL: 1, RES: 4, MAG: 0, ENE: 7, PSI: 2 }, null, 5);

  it("Tutto o niente: values below the minimum count 0", () => {
    expect(scorePlay(hero, at(["FOR", "VEL", "RES"], { code: "all_or_nothing", min: 5 }), context).total).toBe(9);
  });

  it("Il prezzo: values at 0 or 1 count minus the malus", () => {
    expect(scorePlay(hero, at(["FOR", "VEL", "MAG"], { code: "price", maxValue: 1, malus: 3 }), context).total).toBe(3);
  });

  it("Una sola forza: only the highest of the group counts, once for each of them required", () => {
    const rule: ThreatModifier = { code: "one_force", abilities: ["ENE", "MAG", "PSI"] };
    expect(scorePlay(hero, at(["FOR", "ENE", "MAG", "PSI"], rule), context).total).toBe(9 + 7 * 3);
  });

  it("Il conteggio: points for every ability at the minimum or more", () => {
    expect(scorePlay(hero, at(["FOR", "VEL", "RES", "ENE"], { code: "count", min: 5, points: 1 }), context).total).toBe(2);
  });

  it("Negativo: every value counts reversed, the tie-break too", () => {
    const score = scorePlay(hero, at(["FOR", "VEL", "MAG"], { code: "negative", max: 10 }), context);
    expect(score).toMatchObject({ total: 1 + 9 + 10, highest: 10 });
  });

  it("Ultimi i primi: a bonus for every rarity rank below the top", () => {
    const rule: ThreatModifier = { code: "last_first", bonus: 2, topRank: 5 };
    expect(scorePlay({ ...hero, rarityRank: 1 }, at(["FOR"], rule), context).total).toBe(9 + 8);
    expect(scorePlay({ ...hero, rarityRank: 5 }, at(["FOR"], rule), context).total).toBe(9);
  });

  it("Specchio: each side scores with the opposing character's values and keeps its power", () => {
    const strong = character("s", { FOR: 10 }, { code: "ability_bonus", params: { ability: "FOR", bonus: 2 } });
    const weak = character("w", { FOR: 1 });
    const mirror = at(["FOR"], { code: "mirror" });
    const state = newState([strong], [weak], [mirror]);
    const { round } = resolveRound(state, { a: { characterId: "s", autoPlayed: false }, b: { characterId: "w", autoPlayed: false } }, FAMILIES);
    expect(round.plays.a.total).toBe(1 + 2);
    expect(round.plays.b.total).toBe(10);
    expect(round.winner).toBe("b");
  });

  it("Rovescio: the lower total wins, then the lower highest value", () => {
    const low: PlayScore = { characterId: "a", base: 3, bonus: 0, total: 3, highest: 3 };
    const high: PlayScore = { characterId: "b", base: 9, bonus: 0, total: 9, highest: 9 };
    const reverse = at(["FOR"], { code: "reverse" });
    expect(compareScores(low, high, reverse)).toBe("a");
    expect(compareScores(low, high)).toBe("b");
    expect(compareScores({ ...low, highest: 2 }, { ...low, characterId: "b" }, reverse)).toBe("a");
  });
});

describe("the rare threats in Emergenza", () => {
  const rules = { targets: { 1: 7, 2: 13 } };

  it("uses the threat's own target instead of its level's", () => {
    const hero = character("h");
    expect(requiredScore(hero, { ...at(ABILITIES), target: 50 }, rules)).toBe(50);
    expect(() => requiredScore(hero, at(ABILITIES), rules)).toThrow(/No target/);
  });

  it("passes Rovescio by staying at or under the target", () => {
    const reverse: Threat = { ...at(["FOR"], { code: "reverse" }), target: 4 };
    const params = {
      threat: reverse,
      squad: [],
      attempts: [],
      rules: { threatsPerRun: 8, maxFailures: 3, targets: {}, threatLevels: RULES.threatLevels },
      families: FAMILIES,
    };
    expect(resolveEmergencyPlay({ ...params, character: character("low", { FOR: 3 }) }).passed).toBe(true);
    expect(resolveEmergencyPlay({ ...params, character: character("high", { FOR: 8 }) }).passed).toBe(false);
  });
});

describe("bots on the rare threats", () => {
  const knowledge: BotKnowledge = {
    threatCatalog: threatCatalog(),
    families: FAMILIES,
    abilityMeans: Object.fromEntries(ABILITIES.map((a) => [a, 4])),
    characters: Array.from({ length: 12 }, (_, i) => character(`c${i}`)),
  };
  const team = [character("big", { FOR: 10 }), character("small", { FOR: 1 }), character("mid", { FOR: 5 })];

  it("send their weakest character under Rovescio and Specchio, their strongest otherwise", () => {
    for (const code of ["reverse", "mirror"] as const) {
      const state = newState(team, team.map((c) => ({ ...c, id: `o-${c.id}` })), [at(["FOR"], { code })]);
      expect(chooseBotPlay("medium", botView(state, "a", knowledge), mulberry32(1))).toBe("small");
    }
    const plain = newState(team, team.map((c) => ({ ...c, id: `o-${c.id}` })), [at(["FOR"])]);
    expect(chooseBotPlay("medium", botView(plain, "a", knowledge), mulberry32(1))).toBe("big");
  });

  it("do not see the abilities of a threat Al buio", () => {
    const blind = { ...at(["FOR"], { code: "blind", abilities: ["FOR"] }) };
    const view = botView(newState(team, team, [blind]), "a", knowledge);
    expect(view.currentThreat.modifier ?? null).toBeNull();
    expect(view.currentThreat.id).toBe("t");
    expect(view.currentThreat.level).toBe(1);
  });
});
