import { describe, expect, it } from "vitest";
import { describeAdmitted, describeTraits, matchesTraits, toggleTrait, type TraitCategory } from "@/lib/traits";

const catalog: TraitCategory[] = [
  {
    code: "origin",
    name: "Origine",
    traits: [
      { code: "origin.mito", name: "Mito" },
      { code: "origin.strappo", name: "Strappo" },
      { code: "origin.segno", name: "Segno" },
    ],
  },
  { code: "nature", name: "Natura", traits: [{ code: "nature.umano", name: "Umano" }] },
  {
    code: "group",
    name: "Gruppo",
    traits: [
      { code: "group.figli", name: "Figli dell'Ultima" },
      { code: "group.custodi", name: "Custodi" },
    ],
  },
];

const mitoFigli = ["origin.mito", "nature.umano", "group.figli"];
const strappoCustodi = ["origin.strappo", "nature.umano", "group.custodi"];
const segnoFigli = ["origin.segno", "nature.umano", "group.figli"];

describe("matchesTraits", () => {
  it("admits every card when nothing is chosen", () => {
    expect(matchesTraits(mitoFigli, [], catalog)).toBe(true);
    expect(matchesTraits([], [], catalog)).toBe(true);
  });

  it("needs one of the chosen traits within a category", () => {
    const chosen = ["origin.mito", "origin.strappo"];
    expect(matchesTraits(mitoFigli, chosen, catalog)).toBe(true);
    expect(matchesTraits(strappoCustodi, chosen, catalog)).toBe(true);
    expect(matchesTraits(segnoFigli, chosen, catalog)).toBe(false);
  });

  it("needs every category with a chosen trait", () => {
    const chosen = ["origin.mito", "origin.strappo", "group.figli"];
    expect(matchesTraits(mitoFigli, chosen, catalog)).toBe(true);
    expect(matchesTraits(strappoCustodi, chosen, catalog)).toBe(false);
    expect(matchesTraits(segnoFigli, chosen, catalog)).toBe(false);
    expect(matchesTraits([], chosen, catalog)).toBe(false);
  });
});

describe("toggleTrait", () => {
  it("adds and removes a trait", () => {
    expect(toggleTrait(["origin.mito"], "group.figli")).toEqual(["origin.mito", "group.figli"]);
    expect(toggleTrait(["origin.mito", "group.figli"], "origin.mito")).toEqual(["group.figli"]);
  });
});

describe("describeTraits and describeAdmitted", () => {
  it("joins traits of a category with o, and categories with a dot", () => {
    expect(describeTraits(["group.figli", "origin.strappo", "origin.mito"], catalog)).toBe(
      "Mito o Strappo · Figli dell'Ultima",
    );
    expect(describeTraits([], catalog)).toBe("");
    expect(
      describeAdmitted([
        { category: "Origine", traits: ["Mito", "Strappo"] },
        { category: "Gruppo", traits: ["Figli dell'Ultima"] },
      ]),
    ).toBe("Mito o Strappo · Figli dell'Ultima");
  });
});
