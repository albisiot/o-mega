import { describe, expect, it } from "vitest";
import {
  describeFamaChange,
  describeLeagueChange,
  describePrize,
  leagueOf,
  leagueProgress,
  seasonPrizes,
  type RankedMatchInfo,
} from "./ranked";

const info = (over: Partial<RankedMatchInfo>): RankedMatchInfo => ({
  fama: 290,
  opponent_fama: 300,
  delta: 25,
  league: "vigilante",
  league_before: "recluta",
  league_start: 300,
  next_league_at: 700,
  ...over,
});

describe("Classificata", () => {
  it("names the league of a Fama by the thresholds", () => {
    expect(leagueOf(0)).toBe("recluta");
    expect(leagueOf(299)).toBe("recluta");
    expect(leagueOf(300)).toBe("vigilante");
    expect(leagueOf(1200)).toBe("asso");
    expect(leagueOf(9999)).toBe("omega");
  });

  it("measures the way to the next league", () => {
    expect(leagueProgress(500, 300, 700)).toBe(0.5);
    expect(leagueProgress(2600, 2500, null)).toBe(1);
    expect(leagueProgress(100, 300, 700)).toBe(0);
  });

  it("words the Fama a match moved and a league reached or left", () => {
    expect(describeFamaChange(25)).toBe("+25 Fama");
    expect(describeFamaChange(-20)).toBe("−20 Fama");
    expect(describeFamaChange(0)).toBe("Fama invariata");
    expect(describeLeagueChange(info({}))).toBe("Sei salito in Vigilante!");
    expect(describeLeagueChange(info({ league: "recluta", league_before: "vigilante" }))).toBe("Sei sceso in Recluta");
    expect(describeLeagueChange(info({ league: "vigilante", league_before: "vigilante" }))).toBeNull();
  });

  it("words the prizes of a Mandato", () => {
    expect(describePrize({ coins: 100, packs: 1 })).toBe("1 pacchetto e 100 monete");
    expect(describePrize({ coins: 0, packs: 3 })).toBe("3 pacchetti");
    expect(seasonPrizes().map((p) => p.text)).toEqual([
      "25 monete",
      "50 monete",
      "100 monete",
      "1 pacchetto e 100 monete",
      "2 pacchetti e un titolo",
      "3 pacchetti e un titolo",
    ]);
  });
});
