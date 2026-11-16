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

  it("carries the page to return to", () => {
    expect(packRevealHref(["a"], "/obiettivi")).toBe("/pacchetto/?id=a&from=%2Fobiettivi");
    expect(packRevealHref(["a", "b"], "/partita?id=7")).toBe("/pacchetto/?id=a&next=b&from=%2Fpartita%3Fid%3D7");
  });

  it("leaves out the home and any unsafe page", () => {
    expect(packRevealHref(["a"], "/")).toBe("/pacchetto/?id=a");
    expect(packRevealHref(["a"], "//evil.example")).toBe("/pacchetto/?id=a");
    expect(packRevealHref(["a"], "/pacchetto?id=z")).toBe("/pacchetto/?id=a");
  });
});
