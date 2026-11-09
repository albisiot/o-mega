import { describe, expect, it } from "vitest";
import { isValidBossValues } from "@o-mega/game-engine";
import { balance } from "@/config/balance";
import { bossTableProblem, exampleBossTable, type BossTableNumbers } from "./boss-table-admin";

const DEFAULTS: BossTableNumbers = { hot_fronts: 2, hot_value: 2, hot_growth: 1, base_value: 1 };

describe("Grande Minaccia table settings", () => {
  it("accepts the defaults, which are those of balance.ts", () => {
    expect(bossTableProblem(DEFAULTS, 5)).toBeNull();
    expect(DEFAULTS).toEqual({
      hot_fronts: balance.boss.hotFronts,
      hot_value: balance.boss.hotValue,
      hot_growth: balance.boss.hotGrowth,
      base_value: balance.boss.baseValue,
    });
  });

  it("refuses what the server refuses", () => {
    expect(bossTableProblem({ ...DEFAULTS, hot_fronts: 6 }, 5)).not.toBeNull();
    expect(bossTableProblem({ ...DEFAULTS, hot_growth: 21 }, 5)).not.toBeNull();
    expect(bossTableProblem({ ...DEFAULTS, base_value: -1 }, 5)).not.toBeNull();
    expect(bossTableProblem({ ...DEFAULTS, hot_value: NaN }, 5)).not.toBeNull();
    expect(bossTableProblem({ ...DEFAULTS, hot_value: 0, base_value: 0 }, 5)).not.toBeNull();
    expect(bossTableProblem({ ...DEFAULTS, hot_fronts: 5, base_value: 0 }, 5)).toBeNull();
  });

  it("draws an example that follows the numbers: 2, 3, 4, 5, 6 on two fronts that change every turn", () => {
    const table = exampleBossTable({ turns: 5, fronts: 5, ...DEFAULTS });
    table.forEach((row, t) => expect([...row].sort((x, y) => x - y)).toEqual([1, 1, 1, t + 2, t + 2]));
    expect(isValidBossValues(table, { turns: 5, fronts: 5, hotFronts: 2, hotValue: 2, hotGrowth: 1, baseValue: 1 })).toBe(true);
    expect(exampleBossTable({ turns: 5, fronts: 5, ...DEFAULTS })).toEqual(table);
  });
});
