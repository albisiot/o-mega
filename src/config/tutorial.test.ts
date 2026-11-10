import { describe, expect, it } from "vitest";
import { DOGWATCH, GANTRY, POWER_EXAMPLE, PRACTICE, scoreOn, THREAT_EXAMPLES } from "./tutorial";

describe("tutorial examples", () => {
  it("practice round: the feedback matches the scores", () => {
    const [max, tony, nonna] = PRACTICE.team.map(({ card }) => scoreOn(card, PRACTICE.threat));
    const opponent = scoreOn(PRACTICE.opponent, PRACTICE.threat);
    expect(max).toBeGreaterThan(tony);
    expect(tony).toBeGreaterThan(opponent);
    expect(nonna).toBeLessThan(opponent);
  });

  it("power example: Ultimo baluardo is decisive, as its text says", () => {
    const { me, opponent, threat, round, decisive } = POWER_EXAMPLE;
    const without = scoreOn(me, threat);
    const theirs = scoreOn(opponent, threat);
    expect(round).toBeGreaterThanOrEqual(4);
    expect(without + me.bonus).toBeGreaterThan(theirs);
    expect(without).toBeLessThan(theirs);
    expect(decisive).toBe(`Senza Ultimo baluardo finiva ${without} a ${theirs}.`);
  });

  it("the specialist wins the low threat, the generalist the high one", () => {
    const [low, high] = THREAT_EXAMPLES;
    expect(scoreOn(GANTRY, low)).toBeGreaterThan(scoreOn(DOGWATCH, low));
    expect(scoreOn(DOGWATCH, high)).toBeGreaterThan(scoreOn(GANTRY, high));
  });
});
