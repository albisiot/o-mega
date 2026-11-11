import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  applyCardListView,
  DEFAULT_CARD_LIST_VIEW,
  groupCardList,
  readCardListView,
  type TraitIndex,
} from "./card-list";

const card = (id: string, code: string, name: string, rank: number, faction: string, stats: Record<string, number> = {}) => ({
  id,
  code,
  name,
  faction,
  stats,
  rarity: { rank },
});

const cards = [
  card("a", "P010", "Zed", 1, "heroes", { FOR: 3 }),
  card("b", "P002", "Ansa", 5, "villains", { FOR: 9 }),
  card("c", "P003", "Bisque", 3, "heroes", { FOR: 9 }),
  card("d", "P100", "Mito", 3, "neutrals"),
];

const traits: TraitIndex = {
  catalog: [
    {
      code: "origin",
      name: "Origine",
      traits: [
        { code: "origin.segno", name: "Segno" },
        { code: "origin.mito", name: "Mito" },
      ],
    },
    { code: "group", name: "Gruppo", traits: [{ code: "group.banco", name: "Banco" }] },
  ],
  byCard: new Map([
    ["a", ["origin.mito", "group.banco"]],
    ["b", ["origin.segno"]],
    ["c", ["origin.mito"]],
  ]),
};

const view = (change: Partial<typeof DEFAULT_CARD_LIST_VIEW>) => ({ ...DEFAULT_CARD_LIST_VIEW, ...change });
const ids = (list: { id: string }[]) => list.map((entry) => entry.id);

describe("applyCardListView", () => {
  it("orders by number by default, the digits read as numbers", () => {
    expect(ids(applyCardListView(cards, DEFAULT_CARD_LIST_VIEW, null))).toEqual(["b", "c", "a", "d"]);
  });

  it("orders by rarity, then number", () => {
    expect(ids(applyCardListView(cards, view({ sort: "rarity" }), null))).toEqual(["b", "c", "d", "a"]);
  });

  it("orders by an ability, highest first, ties by rarity", () => {
    expect(ids(applyCardListView(cards, view({ sort: "ability:FOR" }), null))).toEqual(["b", "c", "a", "d"]);
  });

  it("orders by trait in catalog order, cards without the category last", () => {
    expect(ids(applyCardListView(cards, view({ sort: "trait:origin" }), traits))).toEqual(["b", "c", "a", "d"]);
  });

  it("filters by rarity, faction and traits", () => {
    expect(ids(applyCardListView(cards, view({ rarity: 3 }), traits))).toEqual(["c", "d"]);
    expect(ids(applyCardListView(cards, view({ faction: "heroes" }), traits))).toEqual(["c", "a"]);
    expect(ids(applyCardListView(cards, view({ traits: ["origin.mito"] }), traits))).toEqual(["c", "a"]);
    expect(ids(applyCardListView(cards, view({ traits: ["origin.mito", "group.banco"] }), traits))).toEqual(["a"]);
  });

  it("uses a list's own sorts", () => {
    const byName = (a: { name: string }, b: { name: string }) => b.name.localeCompare(a.name);
    expect(ids(applyCardListView(cards, view({ sort: "reverse" }), null, { reverse: byName }))).toEqual(["a", "d", "c", "b"]);
  });

  it("does not change the input", () => {
    const copy = [...cards];
    applyCardListView(cards, view({ sort: "name" }), null);
    expect(cards).toEqual(copy);
  });
});

describe("groupCardList", () => {
  it("makes one group per trait when sorted by a trait category", () => {
    const sorted = applyCardListView(cards, view({ sort: "trait:origin" }), traits);
    expect(groupCardList(sorted, "trait:origin", traits).map((group) => [group.label, ids(group.cards)])).toEqual([
      ["Segno", ["b"]],
      ["Mito", ["c", "a"]],
      ["Senza origine", ["d"]],
    ]);
  });

  it("is a single unnamed group otherwise", () => {
    expect(groupCardList(cards, "rarity", traits)).toEqual([{ key: "all", label: null, cards }]);
  });
});

describe("saved views", () => {
  it("reads what was saved and drops anything malformed", () => {
    expect(readCardListView({ sort: "name", rarity: 2, traits: ["x", 3] })).toEqual(view({ sort: "name", rarity: 2, traits: ["x"] }));
    expect(readCardListView("nope")).toEqual(DEFAULT_CARD_LIST_VIEW);
  });

  it("counts the active filters", () => {
    expect(activeFilterCount(view({ rarity: 2, traits: ["a", "b"] }))).toBe(3);
  });
});
