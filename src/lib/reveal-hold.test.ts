import { describe, expect, it } from "vitest";
import type { BossView } from "./boss";
import type { EmergencyView } from "./emergency";
import type { MatchView } from "./match";
import { bossBeforeTurn, emergencyBeforePlay, matchBeforeRound, revealEnd, tripleBeforeRound } from "./reveal-hold";
import type { TripleView } from "./triple";

const card = { name: "Rivale", art_url: null };

describe("matchBeforeRound", () => {
  // Round 3 just won by me: 3–0, match over.
  const view = {
    status: "finished",
    current_round: 3,
    rounds_won: { me: 3, opponent: 0 },
    rounds: [1, 2, 3].map((round) => ({ round, resolved: true, winner: "me", opponent_play: card })),
  } as unknown as MatchView;

  it("hides the outcome of the round being revealed", () => {
    const before = matchBeforeRound(view, 3);
    expect(before.rounds_won).toEqual({ me: 2, opponent: 0 });
    expect(before.status).toBe("active");
    expect(before.current_round).toBe(3);
    expect(before.rounds[2]).toMatchObject({ resolved: false, winner: null, opponent_play: null });
  });

  it("keeps the rounds before it as they were", () => {
    const before = matchBeforeRound(view, 3);
    expect(before.rounds.slice(0, 2)).toEqual(view.rounds.slice(0, 2));
  });

  it("does not count a void round for anyone", () => {
    const tied = {
      ...view,
      status: "active",
      rounds_won: { me: 1, opponent: 1 },
      rounds: [
        { round: 1, resolved: true, winner: "me" },
        { round: 2, resolved: true, winner: "opponent" },
        { round: 3, resolved: true, winner: "none" },
      ],
    } as unknown as MatchView;
    expect(matchBeforeRound(tied, 3).rounds_won).toEqual({ me: 1, opponent: 1 });
  });

  it("leaves the shown view untouched", () => {
    matchBeforeRound(view, 3);
    expect(view.rounds_won).toEqual({ me: 3, opponent: 0 });
    expect(view.rounds[2].winner).toBe("me");
  });
});

describe("tripleBeforeRound", () => {
  const contests = (...winners: string[]) => winners.map((winner, slot) => ({ slot, winner, opponent_play: card }));
  const view = {
    status: "active",
    current_round: 3,
    points: { me: 3, opponent: 3 },
    rounds: [
      { round: 1, resolved: true, contests: contests("me", "opponent", "none") },
      { round: 2, resolved: true, contests: contests("me", "me", "opponent") },
      { round: 3, resolved: false, contests: [] },
    ],
  } as unknown as TripleView;

  it("takes the round's points back off the totals", () => {
    const before = tripleBeforeRound(view, 2);
    expect(before.points).toEqual({ me: 1, opponent: 2 });
    expect(before.current_round).toBe(2);
    expect(before.rounds[1].resolved).toBe(false);
    expect(before.rounds[1].contests.every((c) => c.winner === null && c.opponent_play === null)).toBe(true);
    expect(before.rounds[0]).toEqual(view.rounds[0]);
  });
});

describe("bossBeforeTurn", () => {
  const view = {
    status: "finished",
    current_round: 2,
    points: { me: 9, opponent: 4 },
    fronts_taken: { me: 3, opponent: 1 },
    rounds: [
      { round: 1, resolved: true, holders: ["me", "opponent", null], my_play: { points: 4 }, opponent_play: { points: 4 } },
      { round: 2, resolved: true, holders: ["me", "me", null], my_play: { points: 5 }, opponent_play: { points: 0 } },
    ],
  } as unknown as BossView;

  it("takes the turn's points and fronts back off", () => {
    const before = bossBeforeTurn(view, 2);
    expect(before.points).toEqual({ me: 4, opponent: 4 });
    expect(before.fronts_taken).toEqual({ me: 1, opponent: 1 });
    expect(before.status).toBe("active");
    expect(before.rounds[1]).toMatchObject({ resolved: false, holders: null, opponent_play: null });
    expect(before.rounds[0]).toEqual(view.rounds[0]);
  });
});

describe("emergencyBeforePlay", () => {
  const view = {
    run: {
      status: "finished",
      current_round: 4,
      passed: 1,
      failed: 3,
      plays: [
        { round: 1, passed: true },
        { round: 2, passed: false },
        { round: 3, passed: false },
        { round: 4, passed: false },
      ],
    },
  } as unknown as EmergencyView;

  it("drops the play being revealed", () => {
    const run = emergencyBeforePlay(view, 4).run!;
    expect(run.status).toBe("active");
    expect(run.current_round).toBe(4);
    expect(run).toMatchObject({ passed: 1, failed: 2 });
    expect(run.plays.map((p) => p.round)).toEqual([1, 2, 3]);
  });

  it("has nothing to hide before the run starts", () => {
    const none = { run: null } as unknown as EmergencyView;
    expect(emergencyBeforePlay(none, 1)).toBe(none);
  });
});

describe("revealEnd", () => {
  it("waits the longest pause while the page still plays", () => {
    expect(revealEnd(1000, null, 11)).toBe(12000);
  });

  it("never leaves before the shortest pause, even with a quick page", () => {
    expect(revealEnd(1000, 3000, 11)).toBe(7000);
  });

  it("leaves time to read a long page once it is over", () => {
    expect(revealEnd(1000, 8000, 11)).toBe(11500);
  });

  it("never goes past the longest pause", () => {
    expect(revealEnd(1000, 10500, 11)).toBe(12000);
    // Conquest: the pick's timer is running, the page leaves at the shortest pause.
    expect(revealEnd(1000, 8000, 6)).toBe(7000);
  });
});
