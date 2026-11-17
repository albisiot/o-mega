import { describe, expect, it } from "vitest";
import {
  buildRankedGhostTeam,
  leagueStart,
  planRankedGhost,
  rankedFamaChange,
  rankedGhostSettings,
  teamStrength,
  type RankedFamaRules,
  type RankedLadderStep,
} from "./ranked.ts";
import { mulberry32 } from "./rng.ts";
import { character } from "./test-fixtures.ts";

const RULES: RankedFamaRules = {
  winPoints: 25,
  lossPoints: 20,
  famaPerPoint: 20,
  winMin: 10,
  winMax: 40,
  lossMin: 5,
  lossMax: 35,
  streakFrom: 3,
  streakBonus: 5,
  noLossBelow: 300,
  floorsBelow: 1200,
};
const STARTS = [0, 300, 700, 1200, 1800, 2500];

const LADDER: RankedLadderStep[] = [
  { from: 0, difficultyFrom: 1, difficultyTo: 2, shareFrom: 100, shareTo: 100, teamCap: 100 },
  { from: 300, difficultyFrom: 2, difficultyTo: 2, shareFrom: 100, shareTo: 100, teamCap: 110 },
  { from: 700, difficultyFrom: 2, difficultyTo: 3, shareFrom: 100, shareTo: 50, teamCap: 125 },
  { from: 1200, difficultyFrom: 3, difficultyTo: 3, shareFrom: 50, shareTo: 35, teamCap: 0 },
  { from: 1800, difficultyFrom: 3, difficultyTo: 4, shareFrom: 35, shareTo: 20, teamCap: 0 },
  { from: 2500, difficultyFrom: 4, difficultyTo: 4, shareFrom: 20, shareTo: 15, teamCap: 0 },
];

const change = (fama: number, opponentFama: number, outcome: "win" | "draw" | "loss", streak = 0) =>
  rankedFamaChange(RULES, { fama, opponentFama, outcome, streak, leagueStarts: STARTS });

describe("rankedFamaChange", () => {
  it("gives 25 for a win and takes 20 for a loss against the same Fama", () => {
    expect(change(1500, 1500, "win")).toBe(25);
    expect(change(1500, 1500, "loss")).toBe(-20);
    expect(change(1500, 1500, "draw")).toBe(0);
  });

  it("moves a point every 20 Fama of difference, within the limits", () => {
    expect(change(1500, 1700, "win")).toBe(35);
    expect(change(1500, 1700, "loss")).toBe(-10);
    expect(change(1500, 1300, "win")).toBe(15);
    expect(change(1500, 1300, "loss")).toBe(-30);
    expect(change(1500, 3000, "win")).toBe(40);
    expect(change(1500, 3000, "loss")).toBe(-5);
    expect(change(1500, 0, "win")).toBe(10);
    expect(change(1500, 0, "loss")).toBe(-35);
  });

  it("adds the streak bonus from the third win in a row", () => {
    expect(change(1500, 1500, "win", 1)).toBe(25);
    expect(change(1500, 1500, "win", 2)).toBe(30);
    expect(change(1500, 1500, "win", 7)).toBe(30);
  });

  it("takes nothing in the first league and never goes under the start of the league below Asso", () => {
    expect(change(250, 250, "loss")).toBe(0);
    expect(change(310, 310, "loss")).toBe(-10);
    expect(change(700, 700, "loss")).toBe(0);
    expect(change(1190, 1190, "loss")).toBe(-20);
    expect(change(1210, 1210, "loss")).toBe(-20);
  });
});

describe("leagueStart", () => {
  it("is the last start at or below the Fama", () => {
    expect(leagueStart(0, STARTS)).toBe(0);
    expect(leagueStart(299, STARTS)).toBe(0);
    expect(leagueStart(300, STARTS)).toBe(300);
    expect(leagueStart(9999, STARTS)).toBe(2500);
  });
});

describe("rankedGhostSettings", () => {
  it("moves from the start of a league to the next", () => {
    const rng = mulberry32(1);
    const counts = { easy: 0, medium: 0, hard: 0, super_pro: 0 };
    for (let i = 0; i < 400; i++) counts[rankedGhostSettings(150, LADDER, rng).difficulty]++;
    // Halfway through Recluta: about half Facile, half Medio.
    expect(counts.easy).toBeGreaterThan(150);
    expect(counts.medium).toBeGreaterThan(150);
    expect(counts.hard + counts.super_pro).toBe(0);

    expect(rankedGhostSettings(0, LADDER, rng).difficulty).toBe("easy");
    expect(rankedGhostSettings(950, LADDER, rng).share).toBe(75);
    expect(rankedGhostSettings(5000, LADDER, rng)).toEqual({ difficulty: "super_pro", share: 15, teamCap: 0 });
  });
});

describe("buildRankedGhostTeam", () => {
  const catalog = Array.from({ length: 40 }, (_, i) => character(`c${i}`, {}, null, 1 + (i % 10)));

  it("draws distinct characters from the strongest share", () => {
    const team = buildRankedGhostTeam(catalog, 5, 25, null, mulberry32(3));
    expect(new Set(team.map((c) => c.definitionId)).size).toBe(5);
    // The strongest quarter: base 8, 9 and 10.
    for (const c of team) expect(c.stats.FOR).toBeGreaterThanOrEqual(8);
  });

  it("stays under the cap when it can", () => {
    const weak = catalog.filter((c) => c.stats.FOR <= 3).slice(0, 5);
    const cap = teamStrength(weak) * 1.1;
    const team = buildRankedGhostTeam(catalog, 5, 100, cap, mulberry32(4));
    expect(teamStrength(team)).toBeLessThanOrEqual(cap);
  });

  it("falls back to the weakest characters when nothing fits", () => {
    const team = buildRankedGhostTeam(catalog, 5, 100, 1, mulberry32(5));
    // The ten weakest: base 1, 2 and two of base 3.
    for (const c of team) expect(c.stats.FOR).toBeLessThanOrEqual(3);
  });
});

describe("planRankedGhost", () => {
  it("caps the team by the player's in the first leagues only", () => {
    const catalog = Array.from({ length: 40 }, (_, i) => character(`c${i}`, {}, null, 1 + (i % 10)));
    const playerTeam = catalog.filter((c) => c.stats.FOR <= 3).slice(0, 5);
    const low = planRankedGhost({ fama: 0, ladder: LADDER, catalog, size: 5, playerTeam, rng: mulberry32(6) });
    expect(teamStrength(low.team)).toBeLessThanOrEqual(teamStrength(playerTeam));
    const high = planRankedGhost({ fama: 2600, ladder: LADDER, catalog, size: 5, playerTeam, rng: mulberry32(6) });
    expect(high.difficulty).toBe("super_pro");
    expect(teamStrength(high.team)).toBeGreaterThan(teamStrength(playerTeam));
  });
});
