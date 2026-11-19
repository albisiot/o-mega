import { describe, expect, it } from "vitest";
import { allowsTextSelection } from "@/lib/text-selection";

describe("allowsTextSelection", () => {
  it("keeps text selection in the Editor and its management pages", () => {
    expect(allowsTextSelection("/editor")).toBe(true);
    expect(allowsTextSelection("/editor/")).toBe(true);
    expect(allowsTextSelection("/gestione-codici/")).toBe(true);
    expect(allowsTextSelection("/gestione-pacchetti-speciali")).toBe(true);
    expect(allowsTextSelection("/prova-editor-varianti/")).toBe(true);
  });

  it("turns it off everywhere else", () => {
    expect(allowsTextSelection("/")).toBe(false);
    expect(allowsTextSelection("/collezione/")).toBe(false);
    expect(allowsTextSelection("/partita")).toBe(false);
    expect(allowsTextSelection("/profilo/")).toBe(false);
    expect(allowsTextSelection("/editoriale")).toBe(false);
  });
});
