import { describe, expect, it } from "vitest";
import { computeAbilityMeans, type BotKnowledge } from "./bots.ts";
import {
  buildChallengeBotTeam,
  challengeModifier,
  drawChallengeThreats,
  NO_MATCH_RULES,
  simulateChallenge,
  withRareOdds,
  type PlacedThreat,
} from "./challenge-play.ts";
import { checkChallengeTeam, NO_CHALLENGE_RULES } from "./challenges.ts";
import { mulberry32 } from "./rng.ts";
import { isValidLevelSequence } from "./threats.ts";
import { ABILITIES, character, FAMILIES, RULES, threat, threatCatalog } from "./test-fixtures.ts";
import type { Character, RareThreat } from "./types.ts";

// Nuova Megara: the fixtures' catalog. Giza: three threats of levels 1, 4 and 6.
const GIZA: PlacedThreat[] = [
  { ...threat("G1", ABILITIES.slice(0, 1)), region: "giza" },
  { ...threat("G4", ABILITIES.slice(0, 4)), region: "giza" },
  { ...threat("G6", ABILITIES.slice(0, 6)), region: "giza" },
];
const CATALOG: PlacedThreat[] = [...threatCatalog().map((entry) => ({ ...entry, region: "megara" })), ...GIZA];
const RARE: RareThreat = { ...threat("R3", ABILITIES.slice(0, 3)), rarity: "rare", oneIn: 200 };

const NUMBERS = {
  hostileBonus: 2,
  hostileMalus: 1,
  underdogBonus: 2,
  underdogMalus: 1,
  underdogCommonMaxRank: 2,
  underdogEliteMinRank: 4,
};

describe("Sfida a tema: the threats of a match", () => {
  it("a place brings its three threats and two of Nuova Megara, within the level rules", () => {
    for (let seed = 0; seed < 50; seed++) {
      const threats = drawChallengeThreats(mulberry32(seed), CATALOG, [], RULES, { ...NO_MATCH_RULES, place: "giza" });
      expect(threats).toHaveLength(5);
      expect(threats.filter((entry) => entry.id.startsWith("G"))).toHaveLength(3);
      expect(isValidLevelSequence(threats.map((entry) => entry.level), RULES.threatLevels)).toBe(true);
    }
  });

  it("Nuova Megara only: no threat of a place", () => {
    for (let seed = 0; seed < 50; seed++) {
      const threats = drawChallengeThreats(mulberry32(seed), CATALOG, [], RULES, { ...NO_MATCH_RULES, place: "megara" });
      expect(threats.some((entry) => entry.id.startsWith("G"))).toBe(false);
    }
  });

  it("levels: every threat of one of them", () => {
    for (let seed = 0; seed < 50; seed++) {
      const threats = drawChallengeThreats(mulberry32(seed), CATALOG, [RARE], RULES, { ...NO_MATCH_RULES, levels: [1, 2], rareMultiplier: 200 });
      expect(threats.every((entry) => entry.level <= 2)).toBe(true);
    }
  });

  it("rare threats more often: the odds multiplied, never beyond every match", () => {
    expect(withRareOdds([RARE], 10)[0].oneIn).toBe(20);
    expect(withRareOdds([RARE], 1000)[0].oneIn).toBe(1);
    const always = drawChallengeThreats(mulberry32(1), CATALOG, [RARE], RULES, { ...NO_MATCH_RULES, rareMultiplier: 200 });
    expect(always.some((entry) => entry.id === "R3")).toBe(true);
  });

  it("the challenge's modifier: Anello debole needs two abilities, Territorio ostile draws its factions", () => {
    expect(challengeModifier("weak_link", 1, NUMBERS, mulberry32(1))).toBeNull();
    expect(challengeModifier("weak_link", 2, NUMBERS, mulberry32(1))).toEqual({ code: "weak_link" });
    const hostile = challengeModifier("hostile_ground", 3, NUMBERS, mulberry32(1));
    expect(hostile).toMatchObject({ code: "hostile_ground", bonus: 2, malus: 1 });
  });
});

const RANKS = ["delta", "gamma", "beta", "alfa", "omega"];
const rarityOf = (entry: Character) => RANKS[entry.rarityRank - 1];
// Twenty characters, four of each rarity, of the three factions in turn.
const CHARACTERS: Character[] = Array.from({ length: 20 }, (_, i) => ({
  ...character(`c${i}`, { [ABILITIES[i % 12]]: 4 + (i % 5) }, null, 4),
  faction: ["heroes", "villains", "neutrals"][i % 3],
  rarityRank: (i % 5) + 1,
}));

describe("Sfida a tema: the bot's squad and the simulator", () => {
  it("the bot keeps the composition rules", () => {
    const rules = { ...NO_CHALLENGE_RULES, rarityBudget: 8, minFactions: 3 };
    for (let seed = 0; seed < 30; seed++) {
      const team = buildChallengeBotTeam("hard", CHARACTERS, 5, mulberry32(seed), rules, rarityOf);
      const copies = team.map((entry) => ({ rarity: rarityOf(entry), faction: entry.faction, traits: [], variant: false, rarityRank: entry.rarityRank }));
      expect(checkChallengeTeam(copies, rules, () => undefined, 5).ok).toBe(true);
    }
  });

  it("plays whole matches against a bot and counts the player's wins", () => {
    const knowledge: BotKnowledge = {
      threatCatalog: CATALOG,
      families: FAMILIES,
      abilityMeans: computeAbilityMeans(CHARACTERS),
      characters: CHARACTERS,
    };
    const result = simulateChallenge({
      rules: RULES,
      knowledge,
      threatCatalog: CATALOG,
      rareCatalog: [],
      admitted: CHARACTERS,
      botPool: CHARACTERS,
      supplied: null,
      squadRules: NO_CHALLENGE_RULES,
      rarityOf,
      matchRules: { ...NO_MATCH_RULES, modifier: "focus" },
      modifierNumbers: NUMBERS,
      difficulty: "easy",
      matches: 20,
      rng: mulberry32(7),
    });
    expect(result.matches).toBe(20);
    expect(result.random.matches + result.strong.matches).toBe(20);
    expect(result.random.wins + result.random.draws).toBeLessThanOrEqual(result.random.matches);
  });
});
