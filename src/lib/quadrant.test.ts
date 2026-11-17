import { describe, expect, it } from "vitest";
import type { MatchCard } from "@/lib/match";
import { clashTier, quadrantMoveStory, sealDeltas, sideAbilities, storySeconds, type QuadrantCellView } from "@/lib/quadrant";

const card = { definition_id: "d", name: "X" } as MatchCard;

function cell(x: number, y: number, values: [number, number, number, number], me: number, opponent: number): QuadrantCellView {
  return { x, y, mine: true, values, seals: { me, opponent }, card };
}

describe("seal deltas", () => {
  it("lists only the cells whose seals changed, a new card counting from zero", () => {
    const before = [cell(0, 0, [1, 1, 1, 1], 1, 0)];
    const after = [cell(0, 0, [1, 1, 1, 1], 1, 1), cell(1, 0, [1, 1, 1, 1], 0, 1)];
    expect(sealDeltas(before, after)).toEqual([
      { x: 0, y: 0, me: 0, opponent: 1 },
      { x: 1, y: 0, me: 0, opponent: 1 },
    ]);
  });
});

describe("move story", () => {
  it("tells each comparison of the played card and the ripples that took a seal", () => {
    // B at (1,0) was beaten from the left and beats C at (2,0), which loses an opposing seal.
    const before = [cell(1, 0, [5, 9, 5, 1], 0, 0), cell(2, 0, [5, 5, 5, 2], 0, 2), cell(0, 1, [7, 5, 5, 5], 0, 0)];
    const after = [
      cell(0, 0, [0, 4, 6, 0], 1, 0),
      cell(1, 0, [5, 9, 5, 1], 1, 0),
      cell(2, 0, [5, 5, 5, 2], 0, 1),
      cell(0, 1, [7, 5, 5, 5], 0, 0),
    ];
    const story = quadrantMoveStory(before, after, { x: 0, y: 0, mine: true })!;
    expect(story.clashes).toEqual([
      { x: 1, y: 0, side: 1, value: 4, against: 1, outcome: "win" },
      { x: 0, y: 1, side: 2, value: 6, against: 7, outcome: "lose" },
    ]);
    expect(story.ripples).toEqual([{ from: { x: 1, y: 0 }, side: 1, to: { x: 2, y: 0 }, value: 9, against: 2 }]);
    expect(storySeconds(story)).toBeGreaterThan(1.5);
  });

  it("is null when the card is not on the grid", () => {
    expect(quadrantMoveStory([], [], { x: 0, y: 0, mine: false })).toBeNull();
  });
});

describe("clash effects", () => {
  it("sizes a comparison by its gap: a little, clearly, crushing", () => {
    expect([clashTier(5, 4), clashTier(4, 6), clashTier(7, 4), clashTier(3, 8), clashTier(10, 4), clashTier(1, 10)]).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it("finds the ability on each side of a turned card", () => {
    const abilities = ["FOR", "VEL", "RES", "INT"];
    const turned = { ...card, stats: { FOR: 7, VEL: 3, RES: 5, INT: 8 } } as MatchCard;
    // A quarter turn: INT on top, FOR on the right, VEL at the bottom, RES on the left.
    expect(sideAbilities(abilities, turned, [8, 7, 3, 5])).toEqual([3, 0, 1, 2]);
    expect(sideAbilities(abilities, turned, [7, 3, 5, 8], 0)).toEqual([0, 1, 2, 3]);
    expect(sideAbilities(abilities, turned, [8, 7, 3, 5], 5)).toEqual([3, 0, 1, 2]);
  });
});
