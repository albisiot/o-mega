import { describe, expect, it } from "vitest";
import { viewportGap } from "./viewport-gap";

const iphone = { width: 390, height: 844 };

describe("viewportGap", () => {
  it("measures a window shorter than the screen", () => {
    expect(viewportGap(iphone, { innerWidth: 390, innerHeight: 797 })).toBe(47);
  });

  it("is zero when the window fills the screen", () => {
    expect(viewportGap(iphone, { innerWidth: 390, innerHeight: 844 })).toBe(0);
  });

  it("ignores large differences such as an open keyboard", () => {
    expect(viewportGap(iphone, { innerWidth: 390, innerHeight: 500 })).toBe(0);
  });

  it("uses the short side of the screen in landscape", () => {
    expect(viewportGap(iphone, { innerWidth: 844, innerHeight: 390 })).toBe(0);
    expect(viewportGap(iphone, { innerWidth: 844, innerHeight: 360 })).toBe(30);
  });
});
