import { describe, expect, it } from "vitest";
import { browsePosition, classifyDrag, dragOffset, neighbourId, swipeStep, SWIPE_SLOP_PX } from "@/lib/card-swipe";

const ids = ["a", "b", "c"];

describe("neighbourId", () => {
  it("steps to the next and previous card in the album's order", () => {
    expect(neighbourId(ids, "b", 1)).toBe("c");
    expect(neighbourId(ids, "b", -1)).toBe("a");
  });

  it("stops at either end instead of wrapping around", () => {
    expect(neighbourId(ids, "c", 1)).toBeNull();
    expect(neighbourId(ids, "a", -1)).toBeNull();
  });

  it("has nothing to offer for a card the album did not show", () => {
    expect(neighbourId(ids, "z", 1)).toBeNull();
    expect(neighbourId([], "a", -1)).toBeNull();
  });
});

describe("browsePosition", () => {
  it("gives the card's place and the list's length", () => {
    expect(browsePosition(ids, "c")).toEqual({ index: 2, total: 3 });
    expect(browsePosition(ids, "z")).toBeNull();
  });
});

describe("classifyDrag", () => {
  it("waits until the finger has really moved", () => {
    expect(classifyDrag(SWIPE_SLOP_PX - 1, 0)).toBe("pending");
    expect(classifyDrag(3, -4)).toBe("pending");
  });

  it("calls a clearly sideways drag horizontal", () => {
    expect(classifyDrag(-30, 5)).toBe("horizontal");
    expect(classifyDrag(20, -12)).toBe("horizontal");
  });

  it("leaves diagonal and vertical drags to the page's scroll", () => {
    expect(classifyDrag(15, 12)).toBe("vertical");
    expect(classifyDrag(2, 40)).toBe("vertical");
    expect(classifyDrag(-12, -12)).toBe("vertical");
  });
});

describe("swipeStep", () => {
  const width = 390;

  it("turns to the next card when the finger goes left far enough, the previous when right", () => {
    expect(swipeStep(-120, 600, width)).toBe(1);
    expect(swipeStep(120, 600, width)).toBe(-1);
  });

  it("turns on a quick flick even when short", () => {
    expect(swipeStep(-40, 60, width)).toBe(1);
    expect(swipeStep(40, 60, width)).toBe(-1);
  });

  it("does not turn on a short slow drag", () => {
    expect(swipeStep(-50, 600, width)).toBeNull();
    expect(swipeStep(25, 20, width)).toBeNull();
  });

  it("asks for a minimum distance on narrow widths too", () => {
    expect(swipeStep(-55, 1000, 100)).toBeNull();
    expect(swipeStep(-60, 1000, 100)).toBe(1);
  });
});

describe("dragOffset", () => {
  it("follows the finger when there is a card that way", () => {
    expect(dragOffset(-150, true)).toBe(-150);
  });

  it("resists past the ends and stops a little way out", () => {
    expect(dragOffset(100, false)).toBe(30);
    expect(dragOffset(-1000, false)).toBe(-60);
  });
});
