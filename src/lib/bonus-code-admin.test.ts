import { describe, expect, it } from "vitest";
import { bonusCodeState, type AdminBonusCode } from "@/lib/bonus-code-admin";

const code: AdminBonusCode = {
  id: "a",
  code: "PROVA",
  coins: 10,
  packs: 0,
  card_names: [],
  max_uses: null,
  uses: 0,
  expires_at: null,
  is_active: true,
  note: null,
};
const now = Date.parse("2026-11-01T12:00:00Z");

describe("bonusCodeState", () => {
  it("says why a code no longer works", () => {
    expect(bonusCodeState(code, now)).toBe("Attivo");
    expect(bonusCodeState({ ...code, is_active: false }, now)).toBe("Disattivato");
    expect(bonusCodeState({ ...code, expires_at: "2026-11-01T11:00:00Z" }, now)).toBe("Scaduto");
    expect(bonusCodeState({ ...code, max_uses: 2, uses: 2 }, now)).toBe("Esaurito");
  });

  it("keeps a code with room left active", () => {
    expect(bonusCodeState({ ...code, max_uses: 2, uses: 1, expires_at: "2026-11-02T00:00:00Z" }, now)).toBe("Attivo");
  });
});
