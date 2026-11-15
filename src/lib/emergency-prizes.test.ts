import { describe, expect, it } from "vitest";
import { placeText, prizeDayText, prizeTableText, prizeText } from "@/lib/emergency-prizes";

describe("emergency prizes", () => {
  it("says what a place wins", () => {
    expect(prizeText({ coins: 50, packs: 1 })).toBe("1 pacchetto e 50 monete");
    expect(prizeText({ coins: 100, packs: 0 })).toBe("100 monete");
    expect(prizeText({ coins: 0, packs: 2 })).toBe("2 pacchetti");
  });

  it("names a place or a range of places", () => {
    expect(placeText({ from: 1, to: 1 })).toBe("1°");
    expect(placeText({ from: 4, to: 10 })).toBe("4°–10°");
  });

  it("puts the whole table on one line", () => {
    expect(
      prizeTableText([
        { from: 1, to: 1, coins: 50, packs: 1 },
        { from: 2, to: 2, coins: 100, packs: 0 },
        { from: 4, to: 10, coins: 25, packs: 0 },
      ]),
    ).toBe("1° 1 pacchetto e 50 monete · 2° 100 monete · 4°–10° 25 monete");
  });

  it("names the game day whatever the device's time zone", () => {
    expect(prizeDayText("2026-11-14")).toBe("sabato 14 novembre");
    expect(prizeDayText("2026-11-01")).toBe("domenica 1 novembre");
  });
});
