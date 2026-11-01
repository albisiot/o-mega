import { describe, expect, it } from "vitest";
import { describeBonusReward, packRevealHref } from "@/lib/packs";

describe("describeBonusReward", () => {
  it("names a single reward", () => {
    expect(describeBonusReward({ coins: 100, cards: 0, packs: 0 })).toBe("100 monete");
    expect(describeBonusReward({ coins: 0, cards: 1, packs: 0 })).toBe("1 carta");
    expect(describeBonusReward({ coins: 0, cards: 0, packs: 1 })).toBe("1 pacchetto");
  });

  it("joins several rewards", () => {
    expect(describeBonusReward({ coins: 1, cards: 2, packs: 0 })).toBe("1 moneta e 2 carte");
    expect(describeBonusReward({ coins: 100, cards: 1, packs: 2 })).toBe("100 monete, 1 carta e 2 pacchetti");
  });
});

describe("packRevealHref", () => {
  it("chains the following openings", () => {
    expect(packRevealHref(["a"])).toBe("/pacchetto/?id=a");
    expect(packRevealHref(["a", "b", "c"])).toBe("/pacchetto/?id=a&next=b,c");
  });
});
