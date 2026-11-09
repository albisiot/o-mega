import { describe, expect, it } from "vitest";
import {
  draftFromPack,
  draftProblem,
  emptyDraft,
  formatHundredths,
  oddsTotal,
  parsePercent,
  realOdds,
  specialPackState,
  splitEvenly,
  type AdminSpecialPack,
  type AdminSpecialPacks,
  type SpecialPackDraft,
} from "@/lib/special-pack-admin";

const data: AdminSpecialPacks = {
  now: "2026-11-10T10:00:00Z",
  max_cards_per_pack: 10,
  rarities: [
    { code: "delta", name: "Delta", rank: 1, color: "#aaa" },
    { code: "gamma", name: "Gamma", rank: 2, color: "#0f0" },
    { code: "beta", name: "Beta", rank: 3, color: "#00f" },
    { code: "alfa", name: "Alfa", rank: 4, color: "#f0f" },
  ],
  cards: [
    { code: "P001", name: "Foundling", rarity_code: "delta", art_url: null, has_variants: false },
    { code: "P002", name: "Écho Nero", rarity_code: "delta", art_url: null, has_variants: true },
    { code: "P030", name: "Vetrix", rarity_code: "beta", art_url: null, has_variants: true },
    { code: "P051", name: "Mongibello", rarity_code: "alfa", art_url: null, has_variants: false },
  ],
  packs: [],
};

const NOW = Date.parse("2026-11-10T10:00:00Z");

function draft(overrides: Partial<SpecialPackDraft> = {}): SpecialPackDraft {
  return {
    ...emptyDraft(),
    name: "Notte di Megara",
    cardCodes: ["P001", "P002", "P030"],
    rarityPercents: { delta: "60", beta: "40" },
    guarantee: 3,
    ...overrides,
  };
}

describe("parsePercent", () => {
  it("reads whole numbers and up to two decimals, with a comma or a dot", () => {
    expect(parsePercent("12")).toBe(1200);
    expect(parsePercent("12,5")).toBe(1250);
    expect(parsePercent(" 0.01 ")).toBe(1);
    expect(parsePercent("100")).toBe(10_000);
    expect(parsePercent("7,")).toBe(700);
  });

  it("refuses what is not a percentage of two decimals at most", () => {
    for (const text of ["", "abc", "-5", "1,234", "100,01", "1000", "1e2"]) {
      expect(parsePercent(text)).toBeNull();
    }
  });
});

describe("formatHundredths", () => {
  it("writes the value as the fields show it", () => {
    expect(formatHundredths(1250)).toBe("12,5");
    expect(formatHundredths(3334)).toBe("33,34");
    expect(formatHundredths(10_000)).toBe("100");
    expect(formatHundredths(1)).toBe("0,01");
  });
});

describe("splitEvenly", () => {
  it("splits 100% exactly, the first parts taking the leftover hundredths", () => {
    expect(splitEvenly(3)).toEqual([3334, 3333, 3333]);
    expect(splitEvenly(4)).toEqual([2500, 2500, 2500, 2500]);
    expect(splitEvenly(7).reduce((a, b) => a + b, 0)).toBe(10_000);
    expect(splitEvenly(0)).toEqual([]);
  });
});

describe("oddsTotal and realOdds", () => {
  it("shares a rarity's percentage among its chosen cards", () => {
    const odds = realOdds(draft(), data);
    expect(odds.cards.get("P001")).toBeCloseTo(0.3);
    expect(odds.cards.get("P002")).toBeCloseTo(0.3);
    expect(odds.cards.get("P030")).toBeCloseTo(0.4);
    expect(odds.rarities.get("delta")).toBeCloseTo(0.6);
    expect(oddsTotal(draft(), data)).toEqual({ total: 10_000, allValid: true });
  });

  it("adds up the cards of a rarity in card mode", () => {
    const byCard = draft({ mode: "card", cardPercents: { P001: "10", P002: "15,5", P030: "74,5" } });
    const odds = realOdds(byCard, data);
    expect(odds.rarities.get("delta")).toBeCloseTo(0.255);
    expect(odds.cards.get("P030")).toBeCloseTo(0.745);
    expect(oddsTotal(byCard, data)).toEqual({ total: 10_000, allValid: true });
  });

  it("ignores the percentages of cards and rarities no longer chosen", () => {
    const fewer = draft({ cardCodes: ["P030"], rarityPercents: { delta: "60", beta: "100" } });
    expect(oddsTotal(fewer, data)).toEqual({ total: 10_000, allValid: true });
  });

  it("flags a missing or zero percentage", () => {
    expect(oddsTotal(draft({ rarityPercents: { delta: "100" } }), data).allValid).toBe(false);
    expect(oddsTotal(draft({ rarityPercents: { delta: "100", beta: "0" } }), data).allValid).toBe(false);
    expect(oddsTotal(draft({ cardCodes: [] }), data).allValid).toBe(false);
  });
});

describe("draftProblem", () => {
  it("accepts a complete pack", () => {
    expect(draftProblem(draft(), data, NOW)).toBeNull();
  });

  it("says what is wrong, one thing at a time", () => {
    expect(draftProblem(draft({ name: "ab" }), data, NOW)).toMatch(/nome/);
    expect(draftProblem(draft({ price: "0" }), data, NOW)).toMatch(/prezzo/);
    expect(draftProblem(draft({ cardsPerPack: "11" }), data, NOW)).toMatch(/da 1 a 10 carte/);
    expect(draftProblem(draft({ variantChance: "101" }), data, NOW)).toMatch(/varianti/);
    expect(draftProblem(draft({ cardCodes: [] }), data, NOW)).toBe("Scegli almeno una carta.");
    expect(draftProblem(draft({ rarityPercents: { delta: "60", beta: "30" } }), data, NOW)).toBe(
      "Le percentuali fanno 90%: devono fare 100%.",
    );
    expect(draftProblem(draft({ guarantee: 4 }), data, NOW)).toMatch(/Nessuna carta scelta è Alfa/);
    expect(draftProblem(draft({ cardsPerPack: "1" }), data, NOW)).toMatch(/almeno 2 carte/);
    expect(draftProblem(draft({ cardsPerPack: "1", guarantee: null }), data, NOW)).toBeNull();
  });

  it("checks the dates in Rome time", () => {
    expect(draftProblem(draft({ startsAt: "2026-12-02T10:00", endsAt: "2026-12-01T10:00" }), data, NOW)).toMatch(
      /dopo l'inizio/,
    );
    // 10:00 UTC is 11:00 in Rome.
    expect(draftProblem(draft({ endsAt: "2026-11-10T10:30" }), data, NOW)).toMatch(/già passata/);
    expect(draftProblem(draft({ endsAt: "2026-11-10T11:30" }), data, NOW)).toBeNull();
  });
});

const saved: AdminSpecialPack = {
  id: "pack-1",
  version: 3,
  name: "Notte di Megara",
  description: "",
  color: "violet",
  price: 200,
  cards_per_pack: 3,
  guaranteed_min_rarity_rank: 3,
  variant_chance_percent: 10,
  odds_mode: "card",
  starts_at: "2026-11-14T17:00:00Z",
  ends_at: null,
  is_active: true,
  is_open: false,
  openings: 0,
  cards: [
    { code: "P001", percent: 33.33 },
    { code: "P030", percent: 66.67 },
  ],
  rarities: [],
};

describe("draftFromPack", () => {
  it("fills the form with the saved pack, in Rome time", () => {
    const form = draftFromPack(saved);
    expect(form.id).toBe("pack-1");
    expect(form.cardPercents).toEqual({ P001: "33,33", P030: "66,67" });
    expect(form.startsAt).toBe("2026-11-14T18:00");
    expect(form.endsAt).toBe("");
    expect(draftProblem(form, data, NOW)).toBeNull();
  });

  it("makes a copy a new pack without dates", () => {
    const copy = draftFromPack(saved, true);
    expect(copy.id).toBeUndefined();
    expect(copy.name).toBe("Notte di Megara (copia)");
    expect(copy.startsAt).toBe("");
  });
});

describe("specialPackState", () => {
  it("names the state the shop sees", () => {
    expect(specialPackState(saved, NOW)).toBe("Programmato");
    expect(specialPackState({ ...saved, starts_at: null, is_open: true }, NOW)).toBe("In vendita");
    expect(specialPackState({ ...saved, starts_at: null }, NOW)).toBe("Senza carte");
    expect(specialPackState({ ...saved, ends_at: "2026-11-01T00:00:00Z" }, NOW)).toBe("Concluso");
    expect(specialPackState({ ...saved, is_active: false }, NOW)).toBe("Disattivato");
  });
});
