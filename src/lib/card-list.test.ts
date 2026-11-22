import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  applyCardListView,
  DEFAULT_CARD_LIST_VIEW,
  groupCardList,
  readCardListView,
  sortAbilitiesOf,
  toggleSortAbility,
  toggleValue,
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

  it("orders by several abilities in the order they were tapped, each next one breaking the ties", () => {
    const fighters = [
      card("x", "P001", "X", 1, "heroes", { FOR: 5, VEL: 1, INT: 9 }),
      card("y", "P002", "Y", 1, "heroes", { FOR: 5, VEL: 4, INT: 0 }),
      card("z", "P003", "Z", 1, "heroes", { FOR: 5, VEL: 4, INT: 2 }),
      card("w", "P004", "W", 1, "heroes", { FOR: 7, VEL: 0 }),
    ];
    expect(ids(applyCardListView(fighters, view({ sort: "ability:FOR,VEL,INT" }), null))).toEqual(["w", "z", "y", "x"]);
    // All tied on both abilities: rarity, then number.
    expect(ids(applyCardListView(fighters, view({ sort: "ability:VEL,FOR" }), null))).toEqual(["y", "z", "x", "w"]);
    // A missing ability counts as 0.
    expect(ids(applyCardListView(fighters, view({ sort: "ability:INT,FOR" }), null))).toEqual(["x", "z", "w", "y"]);
  });

  it("orders by trait in catalog order, cards without the category last", () => {
    expect(ids(applyCardListView(cards, view({ sort: "trait:origin" }), traits))).toEqual(["b", "c", "a", "d"]);
  });

  it("filters by rarity, faction and traits", () => {
    expect(ids(applyCardListView(cards, view({ rarities: [3] }), traits))).toEqual(["c", "d"]);
    expect(ids(applyCardListView(cards, view({ factions: ["heroes"] }), traits))).toEqual(["c", "a"]);
    expect(ids(applyCardListView(cards, view({ traits: ["origin.mito"] }), traits))).toEqual(["c", "a"]);
    expect(ids(applyCardListView(cards, view({ traits: ["origin.mito", "group.banco"] }), traits))).toEqual(["a"]);
  });

  it("keeps a card of any chosen rarity or faction", () => {
    expect(ids(applyCardListView(cards, view({ rarities: [1, 5] }), traits))).toEqual(["b", "a"]);
    expect(ids(applyCardListView(cards, view({ factions: ["heroes", "neutrals"] }), traits))).toEqual(["c", "a", "d"]);
  });

  it("needs every kind of filter at once: rarity, faction and traits", () => {
    expect(ids(applyCardListView(cards, view({ rarities: [3], factions: ["heroes", "villains"] }), traits))).toEqual(["c"]);
    expect(ids(applyCardListView(cards, view({ rarities: [1, 3], traits: ["origin.mito"] }), traits))).toEqual(["c", "a"]);
    expect(ids(applyCardListView(cards, view({ rarities: [5], factions: ["heroes"] }), traits))).toEqual([]);
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

describe("the order of the abilities", () => {
  it("reads the abilities a list is sorted by, in order", () => {
    expect(sortAbilitiesOf("ability:FOR,VEL")).toEqual(["FOR", "VEL"]);
    expect(sortAbilitiesOf("ability:FOR")).toEqual(["FOR"]);
    expect(sortAbilitiesOf("rarity")).toEqual([]);
  });

  it("adds a tapped ability last and takes a chosen one off, the others moving up", () => {
    expect(toggleSortAbility("number", "FOR", "number")).toBe("ability:FOR");
    expect(toggleSortAbility("ability:FOR", "VEL", "number")).toBe("ability:FOR,VEL");
    expect(toggleSortAbility("ability:FOR,VEL,INT", "FOR", "number")).toBe("ability:VEL,INT");
    expect(toggleSortAbility("ability:FOR,VEL,INT", "VEL", "number")).toBe("ability:FOR,INT");
  });

  it("goes back to the list's own order when the last ability is taken off", () => {
    expect(toggleSortAbility("ability:FOR", "FOR", "rarity")).toBe("rarity");
  });
});

describe("toggleValue", () => {
  it("adds a value not chosen yet and removes a chosen one", () => {
    expect(toggleValue([1, 3], 5)).toEqual([1, 3, 5]);
    expect(toggleValue([1, 3], 1)).toEqual([3]);
    expect(toggleValue<string>([], "heroes")).toEqual(["heroes"]);
  });
});

describe("saved views", () => {
  it("reads what was saved and drops anything malformed", () => {
    expect(readCardListView({ sort: "name", rarities: [2, "x"], traits: ["x", 3] })).toEqual(view({ sort: "name", rarities: [2], traits: ["x"] }));
    expect(readCardListView("nope")).toEqual(DEFAULT_CARD_LIST_VIEW);
  });

  it("keeps the one rarity and faction of a view saved before the filters took several", () => {
    expect(readCardListView({ sort: "ability:FOR", rarity: 2, faction: "heroes", traits: [] })).toEqual(
      view({ sort: "ability:FOR", rarities: [2], factions: ["heroes"] }),
    );
    expect(readCardListView({ sort: "rarity", rarity: null, faction: null, traits: [] })).toEqual(view({ sort: "rarity" }));
  });

  it("falls back to the list's order for an ability sort without abilities", () => {
    expect(readCardListView({ sort: "ability:" }, view({ sort: "rarity" }))).toEqual(view({ sort: "rarity" }));
  });

  it("counts the active filters", () => {
    expect(activeFilterCount(view({ rarities: [2, 5], factions: ["heroes"], traits: ["a", "b"] }))).toBe(5);
  });
});
