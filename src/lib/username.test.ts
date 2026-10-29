import { describe, expect, it } from "vitest";
import { isValidUsername } from "./username";

describe("isValidUsername", () => {
  it.each(["abc", "Giocatore_1", "a".repeat(20), "  padded_name  "])("accepts %j", (value) => {
    expect(isValidUsername(value)).toBe(true);
  });

  it.each(["ab", "a".repeat(21), "con spazio", "accentò", "trattino-no", ""])("rejects %j", (value) => {
    expect(isValidUsername(value)).toBe(false);
  });
});
