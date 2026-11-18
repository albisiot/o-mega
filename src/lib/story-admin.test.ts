import { describe, expect, it } from "vitest";
import {
  chapterProblem,
  countByRarities,
  countByTraits,
  countLevel,
  missionChanged,
  missionDraft,
  missionProblem,
  seasonProblem,
  type StoryAdmin,
  type StoryAdminMission,
} from "./story-admin";

const CATALOG = [
  { code: "origin", name: "Origine", traits: [{ code: "origin.mito", name: "Mito" }, { code: "origin.strappo", name: "Strappo" }] },
  { code: "group", name: "Gruppo", traits: [{ code: "group.figli", name: "Figli dell'Ultima" }, { code: "group.custodi", name: "Custodi" }] },
];

const characters: StoryAdmin["characters"] = [
  ["delta", ["origin.mito", "group.figli"]],
  ["delta", ["origin.strappo", "group.custodi"]],
  ["gamma", ["origin.mito", "group.custodi"]],
  ["beta", ["origin.strappo", "group.figli"]],
  ["alfa", ["origin.mito", "group.figli"]],
  ["omega", ["origin.mito", "group.figli"]],
];

const DATA: StoryAdmin = {
  rarities: [],
  trait_catalog: CATALOG,
  characters,
  min_star_characters: 2,
  players: 0,
  seasons: [],
  chapters: [],
  missions: [],
};

const MISSION: StoryAdminMission = {
  code: "C1M1",
  chapter: 1,
  ord: 1,
  title: "Primo incarico",
  opponent: "La banda di Foundling",
  intro: "Al mercato del pesce sparisce un portafoglio ogni cinque minuti.",
  reward_coins: 30,
  star_rarities: ["delta"],
  star_traits: ["origin.mito"],
  star_coins: 10,
  default_star_coins: 10,
  bot_difficulty: "easy",
  opponents: [],
  threats: [],
  reward_card: null,
  completed: 0,
  stars_earned: { flawless: 0, rarities: 0, traits: 0 },
};

describe("story admin", () => {
  it("counts the characters a star rule admits", () => {
    expect(countByRarities(characters, ["delta"])).toBe(2);
    expect(countByRarities(characters, ["delta", "gamma"])).toBe(3);
    expect(countByTraits(characters, ["origin.mito"], CATALOG)).toBe(4);
    expect(countByTraits(characters, ["origin.mito", "group.figli"], CATALOG)).toBe(3);
    expect(countByTraits(characters, ["origin.mito", "origin.strappo", "group.custodi"], CATALOG)).toBe(2);
    expect(countByTraits(characters, [], CATALOG)).toBe(0);
  });

  it("refuses under the minimum and warns under 15", () => {
    expect(countLevel(4, 5)).toBe("refused");
    expect(countLevel(14, 5)).toBe("few");
    expect(countLevel(15, 5)).toBe("ok");
  });

  it("checks a mission as the server does", () => {
    const draft = missionDraft(MISSION);
    expect(missionProblem(draft, DATA)).toBeNull();
    expect(missionProblem({ ...draft, title: "X" }, DATA)).toMatch(/titolo/);
    expect(missionProblem({ ...draft, reward_coins: "abc" }, DATA)).toMatch(/premio/);
    expect(missionProblem({ ...draft, star_coins: "1001" }, DATA)).toMatch(/stella/);
    expect(missionProblem({ ...draft, star_rarities: [] }, DATA)).toMatch(/rarità/);
    expect(missionProblem({ ...draft, star_traits: [] }, DATA)).toMatch(/tratto/);
    expect(missionProblem({ ...draft, star_rarities: ["gamma"] }, DATA)).toMatch(/almeno 2/);
    expect(missionProblem({ ...draft, star_traits: ["origin.strappo", "group.custodi"] }, DATA)).toMatch(/almeno 2/);
  });

  it("tells whether a draft changes the mission", () => {
    const draft = missionDraft(MISSION);
    expect(missionChanged(draft, MISSION)).toBe(false);
    expect(missionChanged({ ...draft, title: " Primo incarico " }, MISSION)).toBe(false);
    expect(missionChanged({ ...draft, star_traits: ["group.figli"] }, MISSION)).toBe(true);
    expect(missionChanged({ ...draft, star_coins: "20" }, MISSION)).toBe(true);
  });

  it("checks chapters and seasons", () => {
    expect(chapterProblem({ chapter: 1, title: "Il porto", intro: "Un'introduzione.", outro: "Un finale lungo." })).toBeNull();
    expect(chapterProblem({ chapter: 1, title: "Il porto", intro: "Corta", outro: "Un finale lungo." })).toMatch(/introduzione/);
    expect(seasonProblem({ season: 1, title: "Il Rintocco", ending: "Hai finito la stagione." })).toBeNull();
    expect(seasonProblem({ season: 1, title: "", ending: "Hai finito la stagione." })).toMatch(/titolo/);
  });
});
