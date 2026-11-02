import { describe, expect, it } from "vitest";
import { DOGWATCH, GANTRY, PRACTICE, scoreOn, THREAT_EXAMPLES } from "./tutorial";

describe("tutorial examples", () => {
  it("practice round: the feedback matches the scores", () => {
    const [max, tony, nonna] = PRACTICE.team.map(({ card }) => scoreOn(card, PRACTICE.threat));
    const opponent = scoreOn(PRACTICE.opponent, PRACTICE.threat);
    expect(max).toBeGreaterThan(tony);
    expect(tony).toBeGreaterThan(opponent);
    expect(nonna).toBeLessThan(opponent);
  });

  it("the specialist wins the low threat, the generalist the high one", () => {
    const [low, high] = THREAT_EXAMPLES;
    expect(scoreOn(GANTRY, low)).toBeGreaterThan(scoreOn(DOGWATCH, low));
    expect(scoreOn(DOGWATCH, high)).toBeGreaterThan(scoreOn(GANTRY, high));
  });
});
