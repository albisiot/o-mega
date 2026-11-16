import { describe, expect, it } from "vitest";
import {
  activeAdminFilterCount,
  addAllCards,
  countBy,
  describeAdminCardFilter,
  EMPTY_ADMIN_CARD_FILTER,
  filterAdminCards,
  toggleValue,
  withCardFacts,
  type AdminCardFilter,
  type CardFacts,
} from "@/lib/admin-card-filter";
import type { TraitCategory } from "@/lib/traits";

const catalog: TraitCategory[] = [
  { code: "origin", name: "Origine", traits: [{ code: "myth", name: "Mito" }, { code: "tech", name: "Tecnologia" }] },
  { code: "group", name: "Gruppo", traits: [{ code: "last", name: "Figli dell'Ultima" }] },
];

const rarities = [
  { code: "omega", name: "Omega", rank: 5, color: "#f59e0b" },
  { code: "delta", name: "Delta", rank: 1, color: "#9ca3af" },
  { code: "gamma", name: "Gamma", rank: 2, color: "#22c55e" },
];

const cards = [
  { code: "P001", name: "Aurora", rarity_code: "delta", faction: "heroes", traits: ["myth", "last"] },
  { code: "P002", name: "Brama", rarity_code: "gamma", faction: "villains", traits: ["tech"] },
  { code: "P003", name: "Cenere", rarity_code: "omega", faction: "neutrals", traits: ["myth"] },
  { code: "P051", name: "Écho", rarity_code: "delta", faction: "villains", traits: ["tech", "last"] },
];

const codes = (list: { code: string }[]) => list.map((card) => card.code);
const filter = (change: Partial<AdminCardFilter>): AdminCardFilter => ({ ...EMPTY_ADMIN_CARD_FILTER, ...change });

describe("filterAdminCards", () => {
  it("keeps every card with an empty filter", () => {
    expect(codes(filterAdminCards(cards, EMPTY_ADMIN_CARD_FILTER, catalog))).toEqual(["P001", "P002", "P003", "P051"]);
  });

  it("takes any of the chosen rarities", () => {
    expect(codes(filterAdminCards(cards, filter({ rarities: ["delta", "omega"] }), catalog))).toEqual(["P001", "P003", "P051"]);
  });

  it("takes any of the chosen factions", () => {
    expect(codes(filterAdminCards(cards, filter({ factions: ["villains"] }), catalog))).toEqual(["P002", "P051"]);
  });

  it("combines rarity, faction and traits: all must pass", () => {
    expect(codes(filterAdminCards(cards, filter({ rarities: ["delta"], factions: ["villains"] }), catalog))).toEqual(["P051"]);
    expect(codes(filterAdminCards(cards, filter({ rarities: ["delta"], traits: ["myth"] }), catalog))).toEqual(["P001"]);
    expect(codes(filterAdminCards(cards, filter({ traits: ["tech", "last"] }), catalog))).toEqual(["P051"]);
  });

  it("follows the server's trait rule: any within a category", () => {
    expect(codes(filterAdminCards(cards, filter({ traits: ["myth", "tech"] }), catalog))).toEqual(["P001", "P002", "P003", "P051"]);
  });

  it("combines the search with the rest", () => {
    expect(codes(filterAdminCards(cards, filter({ query: "echo" }), catalog))).toEqual(["P051"]);
    expect(codes(filterAdminCards(cards, filter({ query: "51", factions: ["heroes"] }), catalog))).toEqual([]);
  });

  it("drops a card with an unknown fact only when that part is filtered", () => {
    const unknown = [{ code: "X1", name: "Ignota" }];
    expect(filterAdminCards(unknown, EMPTY_ADMIN_CARD_FILTER, catalog)).toHaveLength(1);
    expect(filterAdminCards(unknown, filter({ rarities: ["delta"] }), catalog)).toHaveLength(0);
    expect(filterAdminCards(unknown, filter({ factions: ["heroes"] }), catalog)).toHaveLength(0);
  });
});

describe("describeAdminCardFilter", () => {
  it("lists rarities by rank, then factions, then traits", () => {
    expect(
      describeAdminCardFilter(filter({ rarities: ["omega", "delta"], factions: ["villains", "heroes"], traits: ["myth"] }), rarities, catalog),
    ).toBe("Delta o Omega · Eroi o Cattivi · Mito");
  });

  it("is empty with nothing chosen", () => {
    expect(describeAdminCardFilter(filter({ query: "x" }), rarities, catalog)).toBe("");
  });
});

describe("activeAdminFilterCount and toggleValue", () => {
  it("counts the chosen values, not the search", () => {
    expect(activeAdminFilterCount(filter({ query: "a", rarities: ["delta", "gamma"], traits: ["myth"] }))).toBe(3);
  });

  it("adds and removes a value", () => {
    expect(toggleValue(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleValue(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("addAllCards", () => {
  it("adds only the cards not chosen yet, in order", () => {
    expect(addAllCards(["P002"], ["P001", "P002", "P003"])).toEqual({ next: ["P002", "P001", "P003"], added: 2, left: 0 });
  });

  it("stops at the limit and says how many were left out", () => {
    expect(addAllCards(["P001"], ["P002", "P003", "P051"], 3)).toEqual({ next: ["P001", "P002", "P003"], added: 2, left: 1 });
    expect(addAllCards(["P001", "P002"], ["P003"], 2)).toEqual({ next: ["P001", "P002"], added: 0, left: 1 });
  });

  it("keeps a variant apart from its base drawing", () => {
    expect(addAllCards(["P001:neon"], ["P001"]).next).toEqual(["P001:neon", "P001"]);
  });
});

describe("withCardFacts", () => {
  const facts = new Map<string, CardFacts>([["P001", { rarity_code: "delta", faction: "heroes", traits: ["myth"] }]]);

  it("fills what the payload left out and keeps what it has", () => {
    const [filled, kept, unknown] = withCardFacts(
      [
        { code: "P001", name: "Aurora" },
        { code: "P001", name: "Aurora", traits: ["last"] },
        { code: "P999", name: "Nuova" },
      ],
      facts,
    );
    expect(filled).toMatchObject({ rarity_code: "delta", faction: "heroes", traits: ["myth"] });
    expect(kept.traits).toEqual(["last"]);
    expect(unknown).toEqual({ code: "P999", name: "Nuova" });
  });

  it("changes nothing before the catalog arrives", () => {
    expect(withCardFacts([{ code: "P001", name: "Aurora" }], null)).toEqual([{ code: "P001", name: "Aurora" }]);
  });
});

describe("countBy", () => {
  it("counts cards per rarity and per faction", () => {
    expect(countBy(cards, "rarity_code")).toEqual(new Map([["delta", 2], ["gamma", 1], ["omega", 1]]));
    expect(countBy(cards, "faction").get("villains")).toBe(2);
  });
});
