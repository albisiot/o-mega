import { describe, expect, it } from "vitest";
import { searchCards, sortCards } from "@/lib/card-sort";

const cards = [
  { code: "P051", name: "Vetrix" },
  { code: "P007", name: "Écho Nero" },
  { code: "P120", name: "auctor" },
  { code: "P012", name: "Belladonna" },
];

describe("sortCards", () => {
  it("orders by name ignoring case and accents", () => {
    expect(sortCards(cards, "name").map((c) => c.name)).toEqual(["auctor", "Belladonna", "Écho Nero", "Vetrix"]);
  });

  it("orders by the number in the code", () => {
    expect(sortCards(cards, "number").map((c) => c.code)).toEqual(["P007", "P012", "P051", "P120"]);
  });

  it("leaves the input untouched", () => {
    sortCards(cards, "number");
    expect(cards[0].code).toBe("P051");
  });
});

describe("searchCards", () => {
  it("finds a name ignoring case and accents", () => {
    expect(searchCards(cards, "eCHO").map((c) => c.code)).toEqual(["P007"]);
  });

  it("finds a code or just its number", () => {
    expect(searchCards(cards, "p051").map((c) => c.name)).toEqual(["Vetrix"]);
    expect(searchCards(cards, "12").map((c) => c.code)).toEqual(["P120", "P012"]);
  });

  it("keeps every card for an empty search", () => {
    expect(searchCards(cards, "  ")).toBe(cards);
  });
});
