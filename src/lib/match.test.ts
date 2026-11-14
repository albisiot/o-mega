import { describe, expect, it } from "vitest";
import {
  pingShowsChange,
  switchableVariants,
  teamFromFormation,
  type FieldableCopies,
  type Formation,
  type MatchPing,
  type MatchRound,
  type MatchView,
} from "./match";

describe("switchableVariants", () => {
  const neon = { id: "n1", name: "Neon", art_url: "/cards/variants/P001-neon.webp" };
  const neonCopy = { id: "n2", name: "Neon", art_url: "/cards/variants/P001-neon.webp" };
  const gold = { id: "g1", name: "Oro", art_url: "/cards/variants/P001-gold.webp" };

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

describe("teamFromFormation", () => {
  // A owns: base and neon copy of "a", only a neon copy of "b", base "c"; "d" was lost.
  const neonA = { id: "a-neon", name: "Neon", art_url: "/a-neon.webp" };
  const neonB = { id: "b-neon", name: "Neon", art_url: "/b-neon.webp" };
  const copies: FieldableCopies = {
    owned: new Map([["a", "a-base"], ["b", "b-neon"], ["c", "c-base"]]),
    variantCopies: new Map([["a", [neonA]], ["b", [neonB]]]),
    instanceDefinitions: new Map([["a-base", "a"], ["a-neon", "a"], ["b-neon", "b"], ["c-base", "c"]]),
  };
  const formation = (ids: string[], definitions: (string | null)[] | null = null): Formation => ({
    id: "f",
    name: "F",
    card_instance_ids: ids,
    definition_ids: definitions,
  });

  it("fields the saved variant", () => {
    const team = teamFromFormation(formation(["a-neon", "b-neon", "c-base"]), copies, 5);
    expect(team.selected).toEqual(["a", "b", "c"]);
    expect([...team.variantChoice]).toEqual([["a", "a-neon"]]);
    expect(team.missing + team.replaced).toBe(0);
  });

  it("falls back to the default copy of a character whose saved copy is gone", () => {
    const team = teamFromFormation(formation(["a-neon-lost", "c-base"], ["a", "c"]), copies, 5);
    expect(team.selected).toEqual(["a", "c"]);
    expect(team.variantChoice.size).toBe(0);
    expect(team.replaced).toBe(1);
    expect(team.missing).toBe(0);
  });

  it("falls back when the saved variant cannot be fielded (locked)", () => {
    const locked = { ...copies, variantCopies: new Map([["b", [neonB]]]) };
    const team = teamFromFormation(formation(["a-neon", "c-base"]), locked, 5);
    expect(team.selected).toEqual(["a", "c"]);
    expect(team.variantChoice.size).toBe(0);
    expect(team.replaced).toBe(1);
  });

  it("leaves out characters no longer owned, and unknown copies of old formations", () => {
    const team = teamFromFormation(formation(["d-base", "x", "c-base"], ["d", null, "c"]), copies, 5);
    expect(team.selected).toEqual(["c"]);
    expect(team.missing).toBe(2);
  });

  it("puts the pack copy at stake in Conquest", () => {
    const conquest = {
      ...copies,
      owned: new Map([...copies.owned, ["c", "c-starter"]]),
      atRiskCopies: new Map([["c", "c-base"]]),
      instanceDefinitions: new Map([...copies.instanceDefinitions, ["c-starter", "c"]]),
    };
    const team = teamFromFormation(formation(["c-base"]), conquest, 5);
    expect([...team.staked]).toEqual(["c"]);
  });

  it("never fields two copies of one character, nor more than the squad holds", () => {
    expect(teamFromFormation(formation(["a-base", "a-neon", "c-base"]), copies, 5).selected).toEqual(["a", "c"]);
    expect(teamFromFormation(formation(["a-base", "b-neon", "c-base"]), copies, 2).selected).toEqual(["a", "b"]);
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
