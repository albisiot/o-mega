import { describe, expect, it } from "vitest";
import { pingShowsChange, switchableVariants, type MatchPing, type MatchRound, type MatchView } from "./match";

describe("switchableVariants", () => {
  const neon = { id: "n1", name: "Neon" };
  const neonCopy = { id: "n2", name: "Neon" };
  const gold = { id: "g1", name: "Oro" };

  it("offers every style the player owns, with a base copy fielded by default", () => {
    expect(switchableVariants([neon, gold], "base")).toEqual([neon, gold]);
  });

  it("offers one copy per style, the oldest", () => {
    expect(switchableVariants([neon, neonCopy, gold], "base")).toEqual([neon, gold]);
  });

  it("leaves out the style of a default copy that is itself a variant", () => {
    expect(switchableVariants([neon, neonCopy, gold], "n1")).toEqual([gold]);
    expect(switchableVariants([neon, neonCopy], "n1")).toEqual([]);
  });

  it("offers nothing without variant copies", () => {
    expect(switchableVariants(undefined, "base")).toEqual([]);
  });
});

const round = (n: number, patch: Partial<MatchRound> = {}): MatchRound => ({
  round: n,
  level: n,
  modifier: null,
  threat: { name: "Minaccia", abilities: ["FOR"], flavor: "" },
  deadline_at: "2026-11-03T12:00:00Z",
  resolved: false,
  winner: null,
  my_play: null,
  opponent_play: null,
  my_pending_instance_id: null,
  opponent_has_chosen: false,
  ...patch,
});

const view = (patch: Partial<MatchView> = {}): MatchView => ({
  id: "m1",
  mode: "friendly",
  bot_difficulty: null,
  status: "active",
  my_side: "a",
  opponent: { username: "Rivale", avatar_url: null, level: 1, last_seen_at: "2026-11-03T12:00:00Z" },
  current_round: 2,
  threat_levels: [1, 2, 3, 4, 5],
  rounds_won: { me: 1, opponent: 0 },
  total_score: { me: 9, opponent: 4 },
  result: null,
  end_reason: null,
  reward_coins: null,
  level_rewards: [],
  server_now: "2026-11-03T12:00:00Z",
  my_team: [],
  rounds: [round(1, { resolved: true, winner: "me" }), round(2)],
  conquest: null,
  ...patch,
});

const ping = (patch: Partial<MatchPing> = {}): MatchPing => ({
  status: "active",
  current_round: 2,
  opponent_has_chosen: false,
  conquest_settled: null,
  opponent_last_seen_at: "2026-11-03T12:00:05Z",
  server_now: "2026-11-03T12:00:05Z",
  ...patch,
});

describe("pingShowsChange", () => {
  it("sees nothing new when the view matches, whatever the opponent's presence", () => {
    expect(pingShowsChange(view(), ping())).toBe(false);
  });

  it("sees the opponent's choice, a new round and the end of the match", () => {
    expect(pingShowsChange(view(), ping({ opponent_has_chosen: true }))).toBe(true);
    expect(pingShowsChange(view(), ping({ current_round: 3 }))).toBe(true);
    expect(pingShowsChange(view(), ping({ status: "finished" }))).toBe(true);
  });

  it("ignores choices once the match is over", () => {
    const finished = view({ status: "finished" });
    expect(pingShowsChange(finished, ping({ status: "finished", opponent_has_chosen: true }))).toBe(false);
  });

  it("follows the conquest pick until it is settled or its time is up", () => {
    const picking = view({
      status: "finished",
      conquest: { role: "loser", deadline_at: "2026-11-03T12:00:30Z", resolved: false, auto_assigned: false, bonus_coins: 0, chosen: null, offered: null },
    });
    expect(pingShowsChange(picking, ping({ status: "finished", conquest_settled: false }))).toBe(false);
    expect(pingShowsChange(picking, ping({ status: "finished", conquest_settled: true }))).toBe(true);
    expect(pingShowsChange(view({ status: "finished" }), ping({ status: "finished", conquest_settled: false }))).toBe(true);
  });
});
