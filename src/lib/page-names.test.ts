import { describe, expect, it } from "vitest";
import { backLabel, pageName } from "@/lib/page-names";

describe("pageName", () => {
  it("names the page a back arrow leads to, whatever its query", () => {
    expect(pageName("/profilo")).toBe("Profilo");
    expect(pageName("/")).toBe("Home");
    expect(pageName("/classifiche?scheda=albo")).toBe("Classifiche");
    expect(pageName("/squadra?difficulty=easy")).toBe("Squadra");
    expect(pageName("/gestione-eventi")).toBe("Gestione");
  });

  it("says only «Indietro» for a page without a name", () => {
    expect(pageName("/prova-indietro?p=home")).toBe("Indietro");
  });
});

describe("backLabel", () => {
  it("is the words of a way back there", () => {
    expect(backLabel("/collezione")).toBe("Torna alla collezione");
    expect(backLabel("/obiettivi")).toBe("Torna agli obiettivi");
    expect(backLabel("/editor")).toBe("Torna all'Editor");
    expect(backLabel("/prova-indietro")).toBe("Torna indietro");
  });
});
