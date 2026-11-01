import { describe, expect, it } from "vitest";
import { MAX_CARGO, PRACTICE, scoreOn, THREAT_EXAMPLES, TONY_RONDA } from "./tutorial";

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
    expect(scoreOn(MAX_CARGO, low)).toBeGreaterThan(scoreOn(TONY_RONDA, low));
    expect(scoreOn(TONY_RONDA, high)).toBeGreaterThan(scoreOn(MAX_CARGO, high));
  });
});
