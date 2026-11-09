import { describe, expect, it } from "vitest";
import { placeKey, placePath } from "@/lib/place-memory";

describe("placeKey", () => {
  it("drops the trailing slash and keeps the query", () => {
    expect(placeKey("/squadra/?difficulty=easy")).toBe("/squadra?difficulty=easy");
    expect(placeKey("/privacy")).toBe("/privacy");
    expect(placeKey("/privacy/")).toBe("/privacy");
    expect(placeKey("/")).toBe("/");
  });

  it("reads full URLs", () => {
    expect(placeKey("https://example.test/storia/?capitolo=2")).toBe("/storia?capitolo=2");
  });
});

describe("placePath", () => {
  it("is the path without the query", () => {
    expect(placePath("/storia?capitolo=2")).toBe("/storia");
    expect(placePath("/gioca")).toBe("/gioca");
  });
});
