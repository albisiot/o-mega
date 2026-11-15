import { describe, expect, it } from "vitest";
import {
  bestPlace,
  defaultPeriod,
  describePlace,
  emptyLine,
  entryNumbers,
  formatNumber,
  leaderboardHref,
  parseBoard,
  periodFor,
  playersLine,
  type LeaderboardPlace,
} from "@/lib/leaderboards";

describe("boards and periods", () => {
  it("reads the board from the address, the Generale otherwise", () => {
    expect(parseBoard("triple")).toBe("triple");
    expect(parseBoard("nope")).toBe("general");
    expect(parseBoard(null)).toBe("general");
  });

  it("opens each board on a period it has", () => {
    expect(defaultPeriod("emergency")).toBe("day");
    expect(defaultPeriod("classic")).toBe("week");
    expect(defaultPeriod("story")).toBe("all");
    expect(periodFor("classic", "day")).toBe("week");
    expect(periodFor("general", "day")).toBe("day");
    expect(periodFor("story", "week")).toBe("all");
    expect(periodFor("boss", null)).toBe("week");
  });

  it("links a board and a period", () => {
    expect(leaderboardHref("quadrant")).toBe("/classifiche/?scheda=quadrant");
    expect(leaderboardHref("emergency", "week")).toBe("/classifiche/?scheda=emergency&periodo=week");
  });
});

describe("numbers on a row", () => {
  it("shows points, wins, and the rate only after enough matches", () => {
    expect(entryNumbers("triple", "week", { value: 12.5, value2: 0, detail: { wins: 3, played: 4 } }, 10)).toEqual({
      value: "12,5",
      unit: "pt",
      note: "3 vittorie",
    });
    expect(entryNumbers("classic", "all", { value: 70, value2: 0, detail: { wins: 1, played: 10 } }, 10).note).toBe(
      "1 vittoria · 10%",
    );
  });

  it("words the Emergenza, the Generale and the Storia", () => {
    expect(entryNumbers("emergency", "day", { value: 6, value2: 140, detail: { total_score: 140 } }, 10)).toEqual({
      value: "6",
      unit: "superate",
      note: "140 pt",
    });
    expect(entryNumbers("emergency", "all", { value: 30, value2: 0, detail: { runs: 5, perfect: 1 } }, 10).note).toBe("1 perfetta");
    expect(entryNumbers("emergency", "week", { value: 9, value2: 0, detail: { runs: 2, perfect: 0 } }, 10).note).toBe("2 tentativi");
    expect(entryNumbers("general", "all", { value: 1200, value2: 0, detail: { level: 7 } }, 10)).toEqual({
      value: "Liv. 7",
      unit: "",
      note: "1200 XP",
    });
    expect(entryNumbers("general", "week", { value: 80, value2: 0, detail: { level: 7 } }, 10).unit).toBe("XP");
    expect(entryNumbers("story", "all", { value: 1, value2: 0, detail: {} }, 10).unit).toBe("missione");
  });

  it("formats numbers the Italian way", () => {
    expect(formatNumber(2.5)).toBe("2,5");
    expect(formatNumber(4)).toBe("4");
  });
});

describe("places", () => {
  const place = (board: LeaderboardPlace["board"], period: LeaderboardPlace["period"], rank: number, players: number) => ({
    board,
    period,
    rank,
    players,
    value: 1,
  });

  it("picks the best place of the week, then of all time", () => {
    expect(bestPlace([])).toBeNull();
    expect(bestPlace([place("classic", "all", 1, 9), place("triple", "week", 3, 4)])?.board).toBe("triple");
    expect(bestPlace([place("triple", "week", 2, 4), place("boss", "week", 2, 6)])?.board).toBe("boss");
    expect(bestPlace([place("general", "day", 1, 3), place("story", "all", 4, 7)])?.board).toBe("story");
  });

  it("says a place in Italian", () => {
    expect(describePlace(place("triple", "week", 3, 7))).toBe("Sei 3° su 7 questa settimana in Allarme Triplo");
    expect(describePlace(place("general", "all", 1, 12))).toBe("Sei 1° su 12 di sempre nella Generale");
  });

  it("counts the players and says when nobody is there", () => {
    expect(playersLine(1, "day")).toBe("1 giocatore oggi");
    expect(playersLine(5, "week")).toBe("5 giocatori questa settimana");
    expect(emptyLine("emergency", "day")).toContain("Emergenza");
    expect(emptyLine("classic", "week")).toContain("settimana");
  });
});
