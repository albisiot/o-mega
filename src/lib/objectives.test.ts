import { describe, expect, it } from "vitest";
import {
  claimableCount,
  describeObjectiveReward,
  summarizeObjectives,
  type DailyObjective,
  type DailyObjectives,
} from "@/lib/objectives";

function objective(overrides: Partial<DailyObjective> = {}): DailyObjective {
  return {
    id: "o1",
    slot: 1,
    code: "win_matches",
    difficulty: "medium",
    title: "Vinci 3 partite",
    target: 3,
    progress: 0,
    completed: false,
    claimed: false,
    coins: 40,
    packs: 0,
    cards: [],
    opening_ids: [],
    ...overrides,
  };
}

function day(objectives: DailyObjective[]): DailyObjectives {
  return { day: "2026-11-10", resets_at: "2026-11-10T23:00:00Z", refreshes_per_day: 3, refreshes_left: 3, objectives };
}

describe("describeObjectiveReward", () => {
  it("names coins, packs and cards", () => {
    expect(describeObjectiveReward(objective())).toBe("40 monete");
    expect(describeObjectiveReward(objective({ coins: 0, packs: 1 }))).toBe("1 pacchetto");
    expect(describeObjectiveReward(objective({ coins: 20, packs: 2 }))).toBe("2 pacchetti + 20 monete");
    const card = { definition_id: "d", code: "P001", name: "Lampo", rarity_code: "gamma", art_url: null, variant_id: null };
    expect(describeObjectiveReward(objective({ coins: 0, cards: [card] }))).toBe("Carta: Lampo");
    expect(describeObjectiveReward(objective({ coins: 0, cards: [card, card] }))).toBe("2 carte");
  });
});

describe("summarizeObjectives", () => {
  it("puts rewards to claim first", () => {
    const list = day([
      objective({ id: "a", completed: true, progress: 3 }),
      objective({ id: "b" }),
      objective({ id: "c", completed: true, claimed: true, progress: 3 }),
    ]);
    expect(claimableCount(list)).toBe(1);
    expect(summarizeObjectives(list)).toBe("1 premio da riscattare");
  });

  it("counts the completed ones, then says when all are done", () => {
    expect(summarizeObjectives(day([objective({ completed: true, claimed: true, progress: 3 }), objective()]))).toBe(
      "1 su 2 completati",
    );
    expect(summarizeObjectives(day([objective({ completed: true, claimed: true, progress: 3 })]))).toBe(
      "Tutti completati: a domani!",
    );
    expect(claimableCount(null)).toBe(0);
  });
});
