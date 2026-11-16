import { describe, expect, it } from "vitest";
import { placeHref, returnLabel, safeReturnPath } from "@/lib/pack-return";

describe("safeReturnPath", () => {
  it("keeps the pages of the app, as place keys", () => {
    expect(safeReturnPath("/obiettivi")).toBe("/obiettivi");
    expect(safeReturnPath("/negozio/")).toBe("/negozio");
    expect(safeReturnPath("/partita/?id=42&storia=1")).toBe("/partita?id=42&storia=1");
    expect(safeReturnPath("/")).toBe("/");
  });

  it("drops the fragment", () => {
    expect(safeReturnPath("/imprese#fondo")).toBe("/imprese");
  });

  it("refuses a missing or empty value", () => {
    expect(safeReturnPath(null)).toBeNull();
    expect(safeReturnPath(undefined)).toBeNull();
    expect(safeReturnPath("")).toBeNull();
  });

  it("refuses anything that could lead to another site", () => {
    expect(safeReturnPath("https://evil.example/")).toBeNull();
    expect(safeReturnPath("//evil.example/obiettivi")).toBeNull();
    expect(safeReturnPath("/\\evil.example")).toBeNull();
    expect(safeReturnPath("/\t/evil.example")).toBeNull();
    expect(safeReturnPath("/%0a/evil.example")).toBe("/%0a/evil.example");
    expect(safeReturnPath("javascript:alert(1)")).toBeNull();
    expect(safeReturnPath("obiettivi")).toBeNull();
    expect(safeReturnPath(`/${"a".repeat(600)}`)).toBeNull();
  });

  it("never returns to a reveal or to the sign-in callback", () => {
    expect(safeReturnPath("/pacchetto/?id=a")).toBeNull();
    expect(safeReturnPath("/pacchetto")).toBeNull();
    expect(safeReturnPath("/auth/callback/")).toBeNull();
  });

  it("is not fooled by dot segments", () => {
    expect(safeReturnPath("/obiettivi/../pacchetto/?id=a")).toBeNull();
    expect(safeReturnPath("/./negozio")).toBe("/negozio");
  });
});

describe("placeHref", () => {
  it("adds the trailing slash of the static export", () => {
    expect(placeHref("/")).toBe("/");
    expect(placeHref("/obiettivi")).toBe("/obiettivi/");
    expect(placeHref("/partita?id=42")).toBe("/partita/?id=42");
  });

  it("round-trips through safeReturnPath", () => {
    for (const key of ["/", "/negozio", "/partita?id=42&storia=1"]) {
      expect(safeReturnPath(placeHref(key))).toBe(key);
    }
  });
});

describe("returnLabel", () => {
  it("names the page it returns to", () => {
    expect(returnLabel("/")).toBe("Torna alla home");
    expect(returnLabel("/obiettivi")).toBe("Torna agli obiettivi");
    expect(returnLabel("/partita?id=42")).toBe("Torna alla partita");
  });

  it("falls back to a generic text", () => {
    expect(returnLabel("/bestiario")).toBe("Torna indietro");
  });
});
