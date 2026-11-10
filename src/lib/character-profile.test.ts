import { describe, expect, it } from "vitest";
import { groupTraits } from "./character-profile";

const row = (code: string, sort: number, category: string, categorySort: number) => ({
  code,
  name: code,
  description: "",
  sort_order: sort,
  trait_categories: { name: category, sort_order: categorySort },
});

describe("groupTraits", () => {
  it("groups traits by category in catalog order", () => {
    const groups = groupTraits([
      row("group.custodi", 1, "Gruppo", 3),
      row("origin.mito", 5, "Origine", 1),
      row("nature.macchina", 2, "Natura", 2),
      row("origin.segno", 1, "Origine", 1),
    ]);
    expect(groups.map((g) => [g.category, g.traits.map((t) => t.code)])).toEqual([
      ["Origine", ["origin.segno", "origin.mito"]],
      ["Natura", ["nature.macchina"]],
      ["Gruppo", ["group.custodi"]],
    ]);
  });

  it("returns no groups for a card without traits", () => {
    expect(groupTraits([])).toEqual([]);
  });
});
